import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"
import {
  COD_LEDGER_MODULE,
  DEPOSIT_AMOUNT_CENTAVOS,
} from "../modules/cod-ledger"
import type CodLedgerModuleService from "../modules/cod-ledger/service"

type Resolution =
  | "buyer_fault"
  | "producer_fault"
  | "rider_fault"
  | "platform_fault"

export type ResolveDisputeInput = {
  dispute_id: string
  resolution: Resolution
  resolution_notes?: string
  resolved_by?: string | null
}

type AccountState =
  | "normal"
  | "warned"
  | "prepay_locked_30d"
  | "prepay_locked_permanent"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Pure escalation rule used by the workflow and by tests.
 *
 *  strikes = 1 → warned + deposit_action="forfeit"
 *  strikes = 2 → prepay_locked_30d, state_until = now + 30d
 *  strikes ≥ 3 → prepay_locked_permanent
 */
export function applyBuyerFaultEscalation(
  currentStrikes: number,
  now: Date
): {
  strike_count: number
  state: AccountState
  state_until: Date | null
  deposit_action: "none" | "forfeit"
} {
  const nextStrikes = currentStrikes + 1
  if (nextStrikes >= 3) {
    return {
      strike_count: nextStrikes,
      state: "prepay_locked_permanent",
      state_until: null,
      deposit_action: "forfeit",
    }
  }
  if (nextStrikes === 2) {
    return {
      strike_count: nextStrikes,
      state: "prepay_locked_30d",
      state_until: new Date(now.getTime() + THIRTY_DAYS_MS),
      deposit_action: "forfeit",
    }
  }
  // first strike
  return {
    strike_count: nextStrikes,
    state: "warned",
    state_until: null,
    deposit_action: "forfeit",
  }
}

type ResolveState = {
  dispute_id: string
  customer_id: string
  forfeited_centavos: number
  prior_status_snapshot: {
    id?: string
    strike_count: number
    state: AccountState
    state_until: Date | null
  } | null
}

const resolveStep = createStep(
  "resolve-dispute.resolve",
  async (input: ResolveDisputeInput, { container }) => {
    const accountability: AccountabilityModuleService =
      container.resolve(ACCOUNTABILITY_MODULE)
    const ledger: CodLedgerModuleService =
      container.resolve(COD_LEDGER_MODULE)

    const [dispute] = await accountability.listRefusalDisputes(
      { id: input.dispute_id },
      { take: 1 }
    )
    if (!dispute) {
      throw new Error(`Dispute ${input.dispute_id} not found.`)
    }
    if (dispute.resolution !== "pending") {
      throw new Error(
        `Dispute ${input.dispute_id} already resolved (${dispute.resolution}).`
      )
    }

    const now = new Date()

    // Snapshot the buyer's status so compensation can restore it on failure.
    const [statusBefore] = await accountability.listBuyerAccountStatuses(
      { customer_id: dispute.customer_id },
      { take: 1 }
    )

    let depositAction: "none" | "forfeit" | "refund" = "none"
    let forfeited = 0

    if (input.resolution === "buyer_fault") {
      const escalation = applyBuyerFaultEscalation(
        statusBefore?.strike_count ?? 0,
        now
      )
      depositAction = escalation.deposit_action

      if (statusBefore) {
        await accountability.updateBuyerAccountStatuses({
          id: statusBefore.id,
          strike_count: escalation.strike_count,
          state: escalation.state,
          state_until: escalation.state_until,
        })
      } else {
        await accountability.createBuyerAccountStatuses({
          customer_id: dispute.customer_id,
          strike_count: escalation.strike_count,
          state: escalation.state,
          state_until: escalation.state_until,
        })
      }

      // Forfeit the buyer's ₱100 deposit if they still have one.
      const [wallet] = await ledger.listBuyerWallets(
        { customer_id: dispute.customer_id },
        { take: 1 }
      )
      if (wallet && wallet.deposit_balance > 0) {
        const amount = Math.min(wallet.deposit_balance, DEPOSIT_AMOUNT_CENTAVOS)
        await ledger.updateBuyerWallets({
          id: wallet.id,
          deposit_balance: wallet.deposit_balance - amount,
        })
        await ledger.createCodTransactions({
          customer_id: dispute.customer_id,
          order_id: dispute.order_id,
          type: "deposit_forfeit",
          amount: -amount,
          notes: `dispute ${dispute.id}: ${input.resolution_notes ?? "buyer_fault"}`,
          recorded_by: input.resolved_by ?? null,
        })
        forfeited = amount
      }
    } else {
      // Non-buyer-fault resolutions: refund the buyer's wallet to full if it
      // was drained by an earlier order, but day-1 we don't drain on non-fault.
      depositAction = "none"
    }

    const updated = await accountability.updateRefusalDisputes({
      id: dispute.id,
      resolution: input.resolution,
      resolution_notes: input.resolution_notes ?? null,
      resolved_by: input.resolved_by ?? null,
      resolved_at: now,
      deposit_action: depositAction,
    })

    const state: ResolveState = {
      dispute_id: dispute.id,
      customer_id: dispute.customer_id,
      forfeited_centavos: forfeited,
      prior_status_snapshot: statusBefore
        ? {
            id: statusBefore.id,
            strike_count: statusBefore.strike_count,
            state: statusBefore.state as AccountState,
            state_until:
              statusBefore.state_until == null
                ? null
                : typeof statusBefore.state_until === "string"
                  ? new Date(statusBefore.state_until)
                  : statusBefore.state_until,
          }
        : null,
    }

    return new StepResponse(updated, state)
  },
  async (state, { container }) => {
    if (!state) return
    const accountability: AccountabilityModuleService =
      container.resolve(ACCOUNTABILITY_MODULE)
    const ledger: CodLedgerModuleService =
      container.resolve(COD_LEDGER_MODULE)

    // Restore dispute to pending.
    try {
      await accountability.updateRefusalDisputes({
        id: state.dispute_id,
        resolution: "pending",
        resolution_notes: null,
        resolved_by: null,
        resolved_at: null,
        deposit_action: "none",
      })
    } catch {
      // shrug
    }

    // Restore account status snapshot.
    if (state.prior_status_snapshot?.id) {
      try {
        await accountability.updateBuyerAccountStatuses({
          id: state.prior_status_snapshot.id,
          strike_count: state.prior_status_snapshot.strike_count,
          state: state.prior_status_snapshot.state,
          state_until: state.prior_status_snapshot.state_until,
        })
      } catch {
        // shrug
      }
    }

    // Refund forfeited deposit if any.
    if (state.forfeited_centavos > 0) {
      const [wallet] = await ledger.listBuyerWallets(
        { customer_id: state.customer_id },
        { take: 1 }
      )
      if (wallet) {
        await ledger.updateBuyerWallets({
          id: wallet.id,
          deposit_balance: wallet.deposit_balance + state.forfeited_centavos,
        })
        await ledger.createCodTransactions({
          customer_id: state.customer_id,
          order_id: null,
          type: "deposit_refund",
          amount: state.forfeited_centavos,
          notes: `compensation: undo dispute ${state.dispute_id}`,
        })
      }
    }
  }
)

const resolveDisputeWorkflow = createWorkflow(
  "resolve-dispute",
  (input: ResolveDisputeInput) => {
    const dispute = resolveStep(input)
    return new WorkflowResponse(dispute)
  }
)

export default resolveDisputeWorkflow
