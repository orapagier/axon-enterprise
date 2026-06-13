/**
 * Phase G — pure appeal-eligibility logic.
 *
 * A buyer may appeal a strike only when the dispute was resolved against them
 * (`buyer_fault`), they have not already appealed, and the appeal window has
 * not closed. Shared by the store respond route (gate the request) and the
 * GET route (surface `appeal_eligible` so the storefront shows the button).
 */
import { DISPUTE_APPEAL_WINDOW_MS } from "../modules/accountability"

export type AppealEligibilityInput = {
  resolution: string
  appeal_state: string
  resolved_at: Date | string | null
}

export type AppealEligibility =
  | { ok: true }
  | {
      ok: false
      reason: "not_buyer_fault" | "already_appealed" | "window_passed"
    }

const toMs = (v: Date | string | null | undefined): number | null => {
  if (v == null) return null
  const d = typeof v === "string" ? new Date(v) : v
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

export function evaluateAppealEligibility(
  d: AppealEligibilityInput,
  now: Date
): AppealEligibility {
  if (d.resolution !== "buyer_fault") {
    return { ok: false, reason: "not_buyer_fault" }
  }
  // Anything other than "none" means an appeal has already been filed/decided.
  if (d.appeal_state && d.appeal_state !== "none") {
    return { ok: false, reason: "already_appealed" }
  }
  const resolvedMs = toMs(d.resolved_at)
  if (resolvedMs == null || now.getTime() - resolvedMs > DISPUTE_APPEAL_WINDOW_MS) {
    return { ok: false, reason: "window_passed" }
  }
  return { ok: true }
}

export function canAppeal(d: AppealEligibilityInput, now: Date): boolean {
  return evaluateAppealEligibility(d, now).ok
}
