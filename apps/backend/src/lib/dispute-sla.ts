/**
 * Phase G — pure dispute-SLA decision logic.
 *
 * No I/O: the nightly `dispute-sla-tick` job loads pending disputes and asks
 * this function what to do with each, so the policy is unit-testable in
 * isolation. The job performs the side effects (email, status stamps, optional
 * auto-resolve).
 */
import {
  DISPUTE_RESPONSE_SLA_MS,
  DISPUTE_REMINDER_AFTER_MS,
} from "../modules/accountability"

export type DisputeSlaAction =
  | "none"
  | "remind_buyer"
  | "escalate"
  | "auto_resolve_buyer_fault"

export type DisputeSlaSnapshot = {
  resolution: string
  created_at: Date | string
  buyer_responded_at: Date | string | null
  buyer_reminder_sent_at: Date | string | null
  escalated_at: Date | string | null
}

const toMs = (v: Date | string | null | undefined): number | null => {
  if (v == null) return null
  const d = typeof v === "string" ? new Date(v) : v
  const ms = d.getTime()
  return Number.isFinite(ms) ? ms : null
}

/**
 * Decide the single next SLA action for a dispute. The job runs nightly, so a
 * dispute progresses one step per tick: remind (24h) → escalate / auto-resolve
 * (48h). Only `pending` disputes are ever actioned.
 *
 * @param opts.autoResolve when true, a buyer who never responded past the SLA
 *   is auto-resolved as buyer_fault ("silence = forfeit"). Off by default per
 *   the founder call — silence is flagged for admin review instead.
 */
export function classifyDisputeForSla(
  d: DisputeSlaSnapshot,
  now: Date,
  opts: { autoResolve?: boolean } = {}
): DisputeSlaAction {
  if (d.resolution !== "pending") return "none"

  const createdMs = toMs(d.created_at)
  if (createdMs == null) return "none"

  const ageMs = now.getTime() - createdMs
  const buyerResponded = toMs(d.buyer_responded_at) != null

  // SLA breached: the dispute needs a verdict.
  if (ageMs >= DISPUTE_RESPONSE_SLA_MS) {
    if (!buyerResponded && opts.autoResolve) {
      return "auto_resolve_buyer_fault"
    }
    // Flag for admin once; a dispute already escalated needs nothing more.
    return toMs(d.escalated_at) == null ? "escalate" : "none"
  }

  // Inside the window: nudge a silent buyer once, after the reminder mark.
  if (
    ageMs >= DISPUTE_REMINDER_AFTER_MS &&
    !buyerResponded &&
    toMs(d.buyer_reminder_sent_at) == null
  ) {
    return "remind_buyer"
  }

  return "none"
}
