/**
 * Pure delivery-tier resolution + membership gating (Phase H).
 *
 * The Free / Standard / Special tier rules and the "is this customer a paid-up
 * member?" check were duplicated inline across both delivery-options routes
 * (the GET that lists tiers and the POST that re-validates the chosen one).
 * Extracted here so the rules live in one place and can be unit-tested without
 * a cart, a hub, or the DB.
 */

export type DeliveryTier = "free" | "standard" | "special"

export type TierOption = {
  tier: DeliveryTier
  label: string
  fee_php: number
  eta_label: string
  available: boolean
  reason_if_unavailable: string | null
}

export type HHMM = { hour: number; minute: number }

/** Parse a "HH:MM" string. Bad/missing parts read as 0 rather than NaN. */
export function parseHHMM(s: string): HHMM {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10))
  return {
    hour: Number.isFinite(h) ? h : 0,
    minute: Number.isFinite(m) ? m : 0,
  }
}

/** Is `now` strictly before the dispatch `cutoff` (same timezone assumed)? */
export function beforeCutoff(now: HHMM, cutoff: HHMM): boolean {
  if (now.hour < cutoff.hour) return true
  if (now.hour > cutoff.hour) return false
  return now.minute < cutoff.minute
}

/**
 * Operating hours. Each hub sets its own daily window (`delivery_open` /
 * `delivery_close`); outside it every tier is closed regardless of
 * cutoff/membership. Open is inclusive, close is exclusive — an order placed
 * exactly at the close time is already closed. These constants are only the
 * fallback for a hub with no window configured.
 */
export const DELIVERY_OPEN: HHMM = { hour: 6, minute: 0 }
export const DELIVERY_CLOSE: HHMM = { hour: 18, minute: 0 }

/** Is `now` inside the [open, close) delivery window (hub-local)? */
export function isWithinDeliveryHours(
  now: HHMM,
  open: HHMM = DELIVERY_OPEN,
  close: HHMM = DELIVERY_CLOSE
): boolean {
  return !beforeCutoff(now, open) && beforeCutoff(now, close)
}

/** Format an HHMM as a 12-hour clock label, e.g. {18,0} → "6:00 PM". */
function to12h(t: HHMM): string {
  const period = t.hour < 12 || t.hour === 24 ? "AM" : "PM"
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12
  return `${h12}:${t.minute.toString().padStart(2, "0")} ${period}`
}

/** Human label for a delivery window, e.g. "6:00 AM–6:00 PM". */
export function formatDeliveryHours(open: HHMM, close: HHMM): string {
  return `${to12h(open)}–${to12h(close)}`
}

/**
 * Resolve a hub's window from its stored "HH:mm" strings, falling back to the
 * platform default when a field is missing/blank. Returns the parsed bounds
 * plus a ready-to-display label.
 */
export function resolveDeliveryWindow(
  openStr: string | null | undefined,
  closeStr: string | null | undefined
): { open: HHMM; close: HHMM; label: string } {
  const open = openStr ? parseHHMM(openStr) : DELIVERY_OPEN
  const close = closeStr ? parseHHMM(closeStr) : DELIVERY_CLOSE
  return { open, close, label: formatDeliveryHours(open, close) }
}

/**
 * A membership confers perks only while its status is `active` AND it has not
 * passed `membership_expires_at`. The nightly expiry job moves stale members to
 * grace/cancelled, but a request-time gate must not honor an expiry the job
 * hasn't reached yet — so it is recomputed from metadata here.
 *
 * A missing/non-positive expiry is treated as "no expiry on record" → active
 * (matches the legacy behaviour the routes had before this extraction).
 */
export function isMembershipActive(
  meta: Record<string, unknown> | null | undefined,
  nowMs: number
): boolean {
  if (!meta || meta.membership_status !== "active") return false
  const expiresAt = Number(meta.membership_expires_at)
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return true
  return expiresAt > nowMs
}

export type BuildTiersArgs = {
  standardFeePhp: number
  specialFeePhp: number
  isMember: boolean
  isBeforeCutoff: boolean
  /** Is the hub currently inside its operating window? */
  isOpen: boolean
  /** Human label for the hub's operating window, e.g. "6:00 AM–6:00 PM". */
  hoursLabel: string
  dispatchLabel: string
  cutoffLabel: string
}

/**
 * The 3 tiers, always all present, with availability + reason resolved:
 *   - Free:     before the dispatch cutoff only (₱0).
 *   - Standard: always available, today anytime.
 *   - Special:  Hub Members only, ~1h.
 *
 * Outside operating hours (`isOpen === false`) nothing can be dispatched, so
 * every tier is closed with the operating-hours reason — that gate dominates
 * the per-tier cutoff/membership rules.
 */
export function buildDeliveryTiers(args: BuildTiersArgs): TierOption[] {
  const tiers: TierOption[] = [
    {
      tier: "free",
      label: "Free delivery",
      fee_php: 0,
      eta_label: args.isBeforeCutoff
        ? `Today ${args.dispatchLabel}`
        : `Tomorrow ${args.dispatchLabel}`,
      available: args.isBeforeCutoff,
      reason_if_unavailable: args.isBeforeCutoff
        ? null
        : `Order before ${args.cutoffLabel} for free same-day delivery`,
    },
    {
      tier: "standard",
      label: "Standard delivery",
      fee_php: args.standardFeePhp,
      eta_label: "Today, anytime",
      available: true,
      reason_if_unavailable: null,
    },
    {
      tier: "special",
      label: "Special delivery",
      fee_php: args.specialFeePhp,
      eta_label: "Within 1 hour",
      available: args.isMember,
      reason_if_unavailable: args.isMember
        ? null
        : "Hub Members only — upgrade for ₱500/yr",
    },
  ]

  if (!args.isOpen) {
    const closedReason = `Delivery is available ${args.hoursLabel}`
    return tiers.map((t) => ({
      ...t,
      available: false,
      reason_if_unavailable: closedReason,
    }))
  }

  return tiers
}

/** The fee (in pesos) for a chosen tier, given the (hub, barangay) fee row. */
export function feeForTier(
  tier: DeliveryTier,
  standardFeePhp: number,
  specialFeePhp: number
): number {
  if (tier === "free") return 0
  if (tier === "standard") return standardFeePhp
  return specialFeePhp
}
