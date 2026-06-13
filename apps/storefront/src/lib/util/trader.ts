import { HttpTypes } from "@medusajs/types"

// Trader (B2B) pricing — storefront display helpers.
//
// An approved trader's negotiated discount is stored on their own
// `customer.metadata` (set by the admin Traders approval flow), so the
// storefront can read it straight off the already-fetched customer object —
// no extra request needed, exactly like membership.
//
// The discount is *actually* applied server-side by the automatic
// `TRADER-<pct>` promotion during cart operations (an order-level percentage),
// so the per-unit "your price" shown here is a faithful display of the same
// percentage — never the source of truth for money.
export const TRADER_META = {
  approved: "trader_approved",
  discountPercent: "trader_discount_percent",
  minOrderNote: "trader_min_order_note",
} as const

export type TraderPricing = {
  approved: boolean
  discountPercent: number | null
  minOrderNote: string | null
}

const INACTIVE: TraderPricing = {
  approved: false,
  discountPercent: null,
  minOrderNote: null,
}

export const getTraderPricing = (
  customer: HttpTypes.StoreCustomer | null | undefined
): TraderPricing => {
  if (!customer) return INACTIVE

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const approved = meta[TRADER_META.approved] === true
  const pct = meta[TRADER_META.discountPercent]
  const discountPercent =
    typeof pct === "number" && Number.isFinite(pct) && pct > 0 ? pct : null

  // A downgrade clears `trader_approved`, so approved + a real percentage is
  // enough to trust the tier for display.
  if (!approved || discountPercent === null) return INACTIVE

  const note = meta[TRADER_META.minOrderNote]
  return {
    approved: true,
    discountPercent,
    minOrderNote: typeof note === "string" && note.length > 0 ? note : null,
  }
}

export const isApprovedTrader = (
  customer: HttpTypes.StoreCustomer | null | undefined
): boolean => getTraderPricing(customer).approved

/** Apply a whole-number percentage discount to an amount. */
export const getTraderPrice = (amount: number, discountPercent: number): number =>
  amount * (1 - discountPercent / 100)
