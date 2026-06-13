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

export type StrikeState = {
  state: AccountState
  state_until: Date | null
  recovery_eligible_at: Date | null
}

/**
 * Pure mapping from a strike count to the account state it implies. Single
 * source of truth for both escalation (strike added) and appeal reversal
 * (strike removed) so the two can never disagree.
 *
 *  0 strikes  → normal
 *  1 strike   → warned, recovery_eligible_at = now + 6 months (the clean window
 *               the clean-order-tick job checks before recovery)
 *  2 strikes  → prepay_locked_30d, state_until = now + 30d
 *  3+ strikes → prepay_locked_permanent
 */
export function stateForStrikeCount(strikes: number, now: Date): StrikeState {
  if (strikes <= 0) {
    return { state: "normal", state_until: null, recovery_eligible_at: null }
  }
  if (strikes >= 3) {
    return {
      state: "prepay_locked_permanent",
      state_until: null,
      recovery_eligible_at: null,
    }
  }
  if (strikes === 2) {
    return {
      state: "prepay_locked_30d",
      state_until: new Date(now.getTime() + THIRTY_DAYS_MS),
      recovery_eligible_at: null,
    }
  }
  // first strike
  return {
    state: "warned",
    state_until: null,
    recovery_eligible_at: new Date(now.getTime() + WARNED_RECOVERY_WINDOW_MS),
  }
}

/**
 * Pure escalation rule (strike +1) used by the workflow and by tests.
 */
export function applyBuyerFaultEscalation(
  currentStrikes: number,
  now: Date
): { strike_count: number } & StrikeState {
  const nextStrikes = currentStrikes + 1
  return { strike_count: nextStrikes, ...stateForStrikeCount(nextStrikes, now) }
}

/**
 * Pure reversal rule (strike −1), used when an appeal is overturned. The strike
 * floors at 0; the resulting state is recomputed from the lowered count.
 */
export function reverseBuyerFaultStrike(
  currentStrikes: number,
  now: Date
): { strike_count: number } & StrikeState {
  const nextStrikes = Math.max(0, currentStrikes - 1)
  return { strike_count: nextStrikes, ...stateForStrikeCount(nextStrikes, now) }
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
  "resolve-dispute-resolve",  // NOTE: no dots — the orchestrator derives a step's parent by splitting its id on ".", so a dotted name crashes every run of the workflow
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
