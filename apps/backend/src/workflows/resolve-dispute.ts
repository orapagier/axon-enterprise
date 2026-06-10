import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ACCOUNTABILITY_MODULE,
  WARNED_RECOVERY_WINDOW_MS,
} from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"

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
 *  strikes = 1 → warned, recovery_eligible_at = now + 6 months (the clean
 *                window the clean-order-tick job checks before recovery)
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
  recovery_eligible_at: Date | null
} {
  const nextStrikes = currentStrikes + 1
  if (nextStrikes >= 3) {
    return {
      strike_count: nextStrikes,
      state: "prepay_locked_permanent",
      state_until: null,
      recovery_eligible_at: null,
    }
  }
  if (nextStrikes === 2) {
    return {
      strike_count: nextStrikes,
      state: "prepay_locked_30d",
      state_until: new Date(now.getTime() + THIRTY_DAYS_MS),
      recovery_eligible_at: null,
    }
  }
  // first strike
  return {
    strike_count: nextStrikes,
    state: "warned",
    state_until: null,
    recovery_eligible_at: new Date(now.getTime() + WARNED_RECOVERY_WINDOW_MS),
  }
}

type ResolveState = {
  dispute_id: string
  prior_status_snapshot: {
    id?: string
    strike_count: number
    state: AccountState
    state_until: Date | null
    recovery_eligible_at: Date | null
  } | null
}

const resolveStep = createStep(
  "resolve-dispute.resolve",
  async (input: ResolveDisputeInput, { container }) => {
    const accountability: AccountabilityModuleService =
      container.resolve(ACCOUNTABILITY_MODULE)

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

    if (input.resolution === "buyer_fault") {
      const escalation = applyBuyerFaultEscalation(
        statusBefore?.strike_count ?? 0,
        now
      )

      if (statusBefore) {
        await accountability.updateBuyerAccountStatuses({
          id: statusBefore.id,
          strike_count: escalation.strike_count,
          state: escalation.state,
          state_until: escalation.state_until,
          recovery_eligible_at: escalation.recovery_eligible_at,
        })
      } else {
        await accountability.createBuyerAccountStatuses({
          customer_id: dispute.customer_id,
          strike_count: escalation.strike_count,
          state: escalation.state,
          state_until: escalation.state_until,
          recovery_eligible_at: escalation.recovery_eligible_at,
        })
      }
    }

    const updated = await accountability.updateRefusalDisputes({
      id: dispute.id,
      resolution: input.resolution,
      resolution_notes: input.resolution_notes ?? null,
      resolved_by: input.resolved_by ?? null,
      resolved_at: now,
    })

    const state: ResolveState = {
      dispute_id: dispute.id,
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
            recovery_eligible_at:
              statusBefore.recovery_eligible_at == null
                ? null
                : typeof statusBefore.recovery_eligible_at === "string"
                  ? new Date(statusBefore.recovery_eligible_at)
                  : statusBefore.recovery_eligible_at,
          }
        : null,
    }

    return new StepResponse(updated, state)
  },
  async (state, { container }) => {
    if (!state) return
    const accountability: AccountabilityModuleService =
      container.resolve(ACCOUNTABILITY_MODULE)

    // Restore dispute to pending.
    try {
      await accountability.updateRefusalDisputes({
        id: state.dispute_id,
        resolution: "pending",
        resolution_notes: null,
        resolved_by: null,
        resolved_at: null,
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
          recovery_eligible_at: state.prior_status_snapshot.recovery_eligible_at,
        })
      } catch {
        // shrug
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
