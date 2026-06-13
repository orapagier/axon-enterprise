import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ACCOUNTABILITY_MODULE } from "../modules/accountability"
import type AccountabilityModuleService from "../modules/accountability/service"
import { reverseBuyerFaultStrike } from "./resolve-dispute"

export type AppealDecision = "uphold" | "overturn"

export type AppealDisputeInput = {
  dispute_id: string
  decision: AppealDecision
  notes?: string
  resolved_by?: string | null
}

type AccountState =
  | "normal"
  | "warned"
  | "prepay_locked_30d"
  | "prepay_locked_permanent"

type AppealState = {
  dispute_id: string
  prior_dispute: {
    appeal_state: string
    appeal_resolved_at: Date | null
    appeal_resolved_by: string | null
    resolution_notes: string | null
  }
  prior_status_snapshot: {
    id: string
    strike_count: number
    state: AccountState
    state_until: Date | null
    recovery_eligible_at: Date | null
  } | null
}

const toDate = (v: unknown): Date | null =>
  v == null ? null : typeof v === "string" ? new Date(v) : (v as Date)

/**
 * Resolve a buyer's appeal of a buyer_fault strike.
 *
 *  - uphold   → the strike stands; appeal_state = upheld.
 *  - overturn → the strike is reversed (strike_count −1, account state
 *               recomputed from the lowered count); appeal_state = overturned.
 *
 * The original `resolution` is left as buyer_fault for the audit trail —
 * `appeal_state` is the override that governs the effective outcome.
 */
const appealStep = createStep(
  "appeal-dispute-resolve", // no dots — the orchestrator splits step ids on "."
  async (input: AppealDisputeInput, { container }) => {
    const accountability: AccountabilityModuleService =
      container.resolve(ACCOUNTABILITY_MODULE)

    const [dispute] = await accountability.listRefusalDisputes(
      { id: input.dispute_id },
      { take: 1 }
    )
    if (!dispute) {
      throw new Error(`Dispute ${input.dispute_id} not found.`)
    }
    if (dispute.resolution !== "buyer_fault") {
      throw new Error(
        `Dispute ${input.dispute_id} is not a buyer_fault resolution; nothing to appeal.`
      )
    }
    if (dispute.appeal_state !== "requested") {
      throw new Error(
        `Dispute ${input.dispute_id} has no pending appeal (state ${dispute.appeal_state}).`
      )
    }

    const now = new Date()

    const [statusBefore] = await accountability.listBuyerAccountStatuses(
      { customer_id: dispute.customer_id },
      { take: 1 }
    )

    const state: AppealState = {
      dispute_id: dispute.id,
      prior_dispute: {
        appeal_state: dispute.appeal_state,
        appeal_resolved_at: toDate(dispute.appeal_resolved_at),
        appeal_resolved_by: dispute.appeal_resolved_by ?? null,
        resolution_notes: dispute.resolution_notes ?? null,
      },
      prior_status_snapshot: statusBefore
        ? {
            id: statusBefore.id,
            strike_count: statusBefore.strike_count,
            state: statusBefore.state as AccountState,
            state_until: toDate(statusBefore.state_until),
            recovery_eligible_at: toDate(statusBefore.recovery_eligible_at),
          }
        : null,
    }

    // Overturn: lift the strike the resolution applied.
    if (input.decision === "overturn" && statusBefore) {
      const reversed = reverseBuyerFaultStrike(statusBefore.strike_count, now)
      await accountability.updateBuyerAccountStatuses({
        id: statusBefore.id,
        strike_count: reversed.strike_count,
        state: reversed.state,
        state_until: reversed.state_until,
        recovery_eligible_at: reversed.recovery_eligible_at,
      })
    }

    const decisionNote = `Appeal ${
      input.decision === "overturn" ? "overturned (strike reversed)" : "upheld (strike stands)"
    }${input.notes ? `: ${input.notes}` : ""}`
    const mergedNotes = dispute.resolution_notes
      ? `${dispute.resolution_notes} | ${decisionNote}`
      : decisionNote

    const updated = await accountability.updateRefusalDisputes({
      id: dispute.id,
      appeal_state: input.decision === "overturn" ? "overturned" : "upheld",
      appeal_resolved_at: now,
      appeal_resolved_by: input.resolved_by ?? null,
      resolution_notes: mergedNotes,
    })

    return new StepResponse(updated, state)
  },
  async (state, { container }) => {
    if (!state) return
    const accountability: AccountabilityModuleService =
      container.resolve(ACCOUNTABILITY_MODULE)

    try {
      await accountability.updateRefusalDisputes({
        id: state.dispute_id,
        appeal_state: state.prior_dispute.appeal_state,
        appeal_resolved_at: state.prior_dispute.appeal_resolved_at,
        appeal_resolved_by: state.prior_dispute.appeal_resolved_by,
        resolution_notes: state.prior_dispute.resolution_notes,
      })
    } catch {
      // shrug
    }

    if (state.prior_status_snapshot) {
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

const appealDisputeWorkflow = createWorkflow(
  "appeal-dispute",
  (input: AppealDisputeInput) => {
    const dispute = appealStep(input)
    return new WorkflowResponse(dispute)
  }
)

export default appealDisputeWorkflow
