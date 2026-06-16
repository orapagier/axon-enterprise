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
  /** Consumer-facing disclaimer shown even when the tier IS available. */
  note?: string | null
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

/**
 * Special (the ~1h fast lane) is always priced at exactly this multiple of the
 * barangay's Standard fee — never more, never less. Pricing it off Standard
 * keeps a single knob per barangay and guarantees the two tiers never drift.
 */
export const SPECIAL_FEE_MULTIPLIER = 2

/** The Special fee for a barangay, derived from its Standard fee. */
export function specialFeeFor(standardFeePhp: number): number {
  return standardFeePhp * SPECIAL_FEE_MULTIPLIER
}

export type BuildTiersArgs = {
  standardFeePhp: number
  isMember: boolean
  isBeforeCutoff: boolean
  /** Is the hub currently inside its operating window? */
  isOpen: boolean
  /** Human label for the hub's operating window, e.g. "6:00 AM–6:00 PM". */
  hoursLabel: string
  dispatchLabel: string
  cutoffLabel: string
  /**
   * Does EVERY item in the cart permit free delivery? Hub-sold items always do
   * (the hub absorbs it); producer-direct items only when the producer opted in
   * (`metadata.free_delivery`). When false, the Free tier is closed regardless
   * of the cutoff. Defaults to true for backwards compatibility.
   */
  freeAllowed?: boolean
  /**
   * Does EVERY item in the cart permit special (within-1h) delivery? Hub-sold
   * items always do; producer-direct items only when the producer opted in
   * (`metadata.special_delivery`). When false, the Special tier is closed.
   * Defaults to true for backwards compatibility.
   */
  specialAllowed?: boolean
  /**
   * Does the cart contain at least one producer-direct item? Drives the
   * consumer disclaimer on Special (fulfilment depends on the producer
   * confirming quickly, else the hub steps in).
   */
  hasProducerItems?: boolean
}

/**
 * The 3 tiers, always all present, with availability + reason resolved:
 *   - Free:     before the dispatch cutoff AND every item allows free delivery.
 *   - Standard: always available; delivered next available window when closed.
 *   - Special:  Hub Members only, ~1h, hub open, AND every item allows it.
 *
 * Outside operating hours (`isOpen === false`) we no longer blanket-close the
 * checkout. Buyers can still order; the order simply rides the next available
 * dispatch window. Only Special (the ~1h fast lane) stays unavailable, because
 * within-the-hour delivery is impossible while riders aren't dispatching.
 *
 * Who-sells-what also gates Free + Special: the hub always offers both on its
 * own listings, but a producer selling direct must opt each one in per listing.
 */
export function buildDeliveryTiers(args: BuildTiersArgs): TierOption[] {
  const freeAllowed = args.freeAllowed ?? true
  const specialAllowed = args.specialAllowed ?? true

  // Free needs the cart to allow it AND to be before the dispatch cutoff. The
  // "not offered" reason dominates the cutoff one — no point telling a buyer to
  // beat the cutoff for a perk that isn't on these items at all.
  const freeAvailable = freeAllowed && args.isBeforeCutoff
  const free: TierOption = {
    tier: "free",
    label: "Free delivery",
    fee_php: 0,
    eta_label: args.isBeforeCutoff
      ? `Today ${args.dispatchLabel}`
      : `Tomorrow ${args.dispatchLabel}`,
    available: freeAvailable,
    reason_if_unavailable: !freeAllowed
      ? "Not offered on one or more items in your cart"
      : !args.isBeforeCutoff
        ? `Order before ${args.cutoffLabel} for free same-day delivery`
        : null,
  }

  const standard: TierOption = {
    tier: "standard",
    label: "Standard delivery",
    fee_php: args.standardFeePhp,
    eta_label: args.isOpen
      ? "Today, anytime"
      : `Next available window (${args.hoursLabel})`,
    available: true,
    reason_if_unavailable: null,
  }

  // Special is the ~1h fast lane: a Hub-Member perk, only meaningful while the
  // hub is open (no rider can deliver within the hour after close), and only on
  // items whose seller offers it.
  const specialAvailable = specialAllowed && args.isMember && args.isOpen
  const special: TierOption = {
    tier: "special",
    label: "Special delivery",
    fee_php: specialFeeFor(args.standardFeePhp),
    eta_label: "Within 1 hour",
    available: specialAvailable,
    reason_if_unavailable: !specialAllowed
      ? "Not offered on one or more items in your cart"
      : !args.isMember
        ? "Hub Members only — upgrade for ₱500/yr"
        : !args.isOpen
          ? `Within-the-hour delivery runs ${args.hoursLabel}`
          : null,
    // Disclaimer when a producer-direct item is in the urgent lane: the speed
    // hinges on the producer confirming fast; otherwise the hub steps in.
    note:
      specialAvailable && args.hasProducerItems
        ? "On producer items, within-the-hour delivery depends on the producer confirming quickly. If they don't, the hub steps in or you're refunded."
        : null,
  }

  return [free, standard, special]
}

/** Delivery-relevant product metadata for one cart line item. */
export type CartItemDeliveryMeta = {
  selling_mode?: unknown
  free_delivery?: unknown
  special_delivery?: unknown
}

export type CartDeliveryEligibility = {
  freeAllowed: boolean
  specialAllowed: boolean
  hasProducerItems: boolean
}

/**
 * Resolve which premium tiers the WHOLE cart qualifies for. A tier is offered
 * only when every item permits it: hub-sold items always do, producer-direct
 * items only when the producer opted that listing in. One ineligible item
 * closes the tier for the cart (single delivery, single tier choice).
 */
export function resolveCartDeliveryEligibility(
  metas: CartItemDeliveryMeta[]
): CartDeliveryEligibility {
  let freeAllowed = true
  let specialAllowed = true
  let hasProducerItems = false
  for (const m of metas) {
    if (m?.selling_mode === "direct_to_consumer") {
      hasProducerItems = true
      if (m?.free_delivery !== true) freeAllowed = false
      if (m?.special_delivery !== true) specialAllowed = false
    }
    // Hub-sold / unattributed items always allow both — no change.
  }
  return { freeAllowed, specialAllowed, hasProducerItems }
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
