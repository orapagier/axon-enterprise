/**
 * Producer order-confirmation lifecycle (pure, DB-free, unit-testable).
 *
 * When a direct-to-consumer order is placed, the producer who sells those items
 * must acknowledge it within a tier-based window so orders don't sit idle:
 *
 *   awaiting ──confirm (on time)──────────────► confirmed   (no strike)
 *      │  └─nudge every 10m until the deadline
 *      │
 *      ├─decline (any time) ────────────────► declined    (→ order cancelled)
 *      │
 *      └─deadline passes ───────────────────► escalated   (admin notified, 1h window)
 *                                                │
 *      producer grabs it (admin not yet acted) ──┤──► confirmed (LATE → strike)
 *      admin sources from hub ───────────────────┤──► hub_taken (strike)
 *      admin cancels OR admin window lapses ──────┴──► cancelled (strike)
 *
 * Only a clean on-time confirm avoids a producer strike. Strikes are recorded
 * on the producer's customer metadata and are disputable.
 *
 * The state itself lives on `order.metadata.producer_confirm[sellerId]` (no new
 * table — matches how delivery_tier etc. ride cart/order metadata). The 10-min
 * tick job (`producer-confirm-tick`) drives the timers.
 */

import type { DeliveryTier } from "./delivery-tiers"

export type ProducerConfirmStatus =
  | "awaiting"
  | "confirmed"
  | "declined"
  | "escalated"
  | "hub_taken"
  | "cancelled"

export type ProducerConfirmEntry = {
  status: ProducerConfirmStatus
  tier: DeliveryTier
  placed_at: number
  /** Producer must confirm by this instant (ms epoch). */
  deadline_at: number
  /** Set when escalated: admin must act by this instant (ms epoch). */
  admin_deadline_at?: number
  last_nudge_at?: number
  nudge_count?: number
  confirmed_at?: number
  escalated_at?: number
  resolved_at?: number
  /** True once a producer strike has been recorded for this entry. */
  strike_recorded?: boolean
  /** True when the confirm/resolution happened after the producer deadline. */
  late?: boolean
}

export type ProducerConfirmMap = Record<string, ProducerConfirmEntry>

// --- Timing knobs (founder calls) ------------------------------------------
// Standard = 1h (explicit founder spec). Free DTC also gets 1h. Special is the
// ~1h urgent lane, so the producer gets a tight 10 min before the hub steps in.
export const CONFIRM_DEADLINE_MS: Record<DeliveryTier, number> = {
  free: 60 * 60_000,
  standard: 60 * 60_000,
  special: 10 * 60_000,
}
/** Admin window to Take/Cancel after escalation before the safety-net cancel. */
export const ADMIN_WINDOW_MS = 60 * 60_000
/** Re-nudge the producer this often while awaiting. */
export const NUDGE_INTERVAL_MS = 10 * 60_000

export const TERMINAL_STATUSES: ProducerConfirmStatus[] = [
  "confirmed",
  "declined",
  "hub_taken",
  "cancelled",
]

export function isTerminal(status: ProducerConfirmStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

/** Still in the timed lifecycle (the tick must keep watching it). */
export function isLive(status: ProducerConfirmStatus): boolean {
  return status === "awaiting" || status === "escalated"
}

export function confirmDeadlineMs(tier: DeliveryTier): number {
  return CONFIRM_DEADLINE_MS[tier] ?? CONFIRM_DEADLINE_MS.standard
}

/** Build the initial `awaiting` entry stamped at order-placement time. */
export function initConfirmEntry(
  tier: DeliveryTier,
  placedAtMs: number
): ProducerConfirmEntry {
  return {
    status: "awaiting",
    tier,
    placed_at: placedAtMs,
    deadline_at: placedAtMs + confirmDeadlineMs(tier),
    last_nudge_at: placedAtMs,
    nudge_count: 1, // the order-placed handler sends the first nudge
  }
}

export type TickAction = "none" | "nudge" | "escalate" | "auto_cancel"

/**
 * What the 10-min tick should do with this entry right now. One action per tick
 * — the job applies it and stamps the entry so the next tick sees fresh state.
 */
export function classifyConfirmEntry(
  entry: ProducerConfirmEntry,
  nowMs: number
): TickAction {
  if (entry.status === "awaiting") {
    if (nowMs >= entry.deadline_at) return "escalate"
    const since = entry.last_nudge_at ?? entry.placed_at
    if (nowMs - since >= NUDGE_INTERVAL_MS) return "nudge"
    return "none"
  }
  if (entry.status === "escalated") {
    const adminDeadline = entry.admin_deadline_at ?? Infinity
    if (nowMs >= adminDeadline) return "auto_cancel"
    return "none"
  }
  return "none"
}

export function markNudged(
  entry: ProducerConfirmEntry,
  nowMs: number
): ProducerConfirmEntry {
  return {
    ...entry,
    last_nudge_at: nowMs,
    nudge_count: (entry.nudge_count ?? 0) + 1,
  }
}

export function markEscalated(
  entry: ProducerConfirmEntry,
  nowMs: number
): ProducerConfirmEntry {
  return {
    ...entry,
    status: "escalated",
    escalated_at: nowMs,
    admin_deadline_at: nowMs + ADMIN_WINDOW_MS,
  }
}

/**
 * Producer confirms. On-time (awaiting + before deadline) → clean confirm, no
 * strike. Late (past the deadline, or grabbed during the admin window) →
 * confirmed but flagged late + a strike is owed. Returns whether a strike
 * should be recorded by the caller (so the side effect stays out of the pure fn).
 */
export function applyProducerConfirm(
  entry: ProducerConfirmEntry,
  nowMs: number
): { entry: ProducerConfirmEntry; strike: boolean } {
  const late = entry.status === "escalated" || nowMs > entry.deadline_at
  return {
    entry: {
      ...entry,
      status: "confirmed",
      confirmed_at: nowMs,
      resolved_at: nowMs,
      late,
      strike_recorded: late ? true : entry.strike_recorded,
    },
    strike: late && !entry.strike_recorded,
  }
}

export function applyProducerDecline(
  entry: ProducerConfirmEntry,
  nowMs: number
): { entry: ProducerConfirmEntry; strike: boolean } {
  // Declining is a non-fulfilment — it always owes a strike (the producer took
  // the order's stock off the market then bailed).
  return {
    entry: {
      ...entry,
      status: "declined",
      resolved_at: nowMs,
      strike_recorded: true,
    },
    strike: !entry.strike_recorded,
  }
}

export function applyAdminTake(
  entry: ProducerConfirmEntry,
  nowMs: number
): { entry: ProducerConfirmEntry; strike: boolean } {
  return {
    entry: {
      ...entry,
      status: "hub_taken",
      resolved_at: nowMs,
      late: true,
      strike_recorded: true,
    },
    strike: !entry.strike_recorded,
  }
}

export function applyCancel(
  entry: ProducerConfirmEntry,
  nowMs: number
): { entry: ProducerConfirmEntry; strike: boolean } {
  return {
    entry: {
      ...entry,
      status: "cancelled",
      resolved_at: nowMs,
      late: true,
      strike_recorded: true,
    },
    strike: !entry.strike_recorded,
  }
}
