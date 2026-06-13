import { HttpTypes } from "@medusajs/types"

// Contract with the admin/server side:
// - Hub Members are assigned to the `hub-members` Medusa customer group
//   (the price list for member pricing is scoped to this group).
// - The same upgrade flow mirrors membership state onto `customer.metadata`
//   using the keys below, so the storefront can render member UI without
//   needing admin-only access to customer-group data.
export const HUB_MEMBER_GROUP = "hub-members"

export const MEMBERSHIP_META = {
  status: "membership_status", // "active" once admin-approved; "pending" while awaiting manual payment verification; absent or "cancelled" = free
  tier: "membership_tier", // e.g. "harvest-01"
  joinedAt: "membership_joined_at", // unix ms
  expiresAt: "membership_expires_at", // unix ms; renewal cutoff
  points: "membership_points", // integer, redeemable as credit
  requestedAt: "membership_requested_at", // unix ms; when the user submitted payment proof
  paymentMethod: "membership_payment_method", // "otc" | "gcash" | "bank"
  paymentReference: "membership_payment_reference", // free-text ref the user pasted from their GCash/bank receipt; empty for OTC cash
  renewalPending: "membership_renewal_pending", // true when an active member submitted a renewal payment (status stays active; admin approval extends the term)
} as const

// "otc" = walk-in cash at the hub counter (no reference number — the cashier
// matches the payer by account email). "bank" is kept for back-compat with
// requests submitted before OTC replaced it as the offline option.
export type MembershipPaymentMethod = "otc" | "gcash" | "bank"

export type MembershipStatus = {
  isMember: boolean
  tier: string | null
  joinedAt: number | null
  expiresAt: number | null
  points: number
}

export type MembershipRequest = {
  pending: boolean
  requestedAt: number | null
  paymentMethod: MembershipPaymentMethod | null
  paymentReference: string | null
}

const INACTIVE: MembershipStatus = {
  isMember: false,
  tier: null,
  joinedAt: null,
  expiresAt: null,
  points: 0,
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null

export const getMembership = (
  customer: HttpTypes.StoreCustomer | null | undefined
): MembershipStatus => {
  if (!customer) return INACTIVE

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const expiresAt = num(meta[MEMBERSHIP_META.expiresAt])
  // "grace" = registration lapsed but inside the 30-day renewal window;
  // perks stay on until the nightly backend job downgrades the account.
  const active =
    (meta[MEMBERSHIP_META.status] === "active" &&
      (expiresAt === null || expiresAt > Date.now())) ||
    meta[MEMBERSHIP_META.status] === "grace"

  if (!active) return INACTIVE

  return {
    isMember: true,
    tier: str(meta[MEMBERSHIP_META.tier]),
    joinedAt: num(meta[MEMBERSHIP_META.joinedAt]),
    expiresAt,
    points: num(meta[MEMBERSHIP_META.points]) ?? 0,
  }
}

export const isMember = (
  customer: HttpTypes.StoreCustomer | null | undefined
): boolean => getMembership(customer).isMember

const INACTIVE_REQUEST: MembershipRequest = {
  pending: false,
  requestedAt: null,
  paymentMethod: null,
  paymentReference: null,
}

const asPaymentMethod = (v: unknown): MembershipPaymentMethod | null =>
  v === "otc" || v === "gcash" || v === "bank" ? v : null

export const getMembershipRequest = (
  customer: HttpTypes.StoreCustomer | null | undefined
): MembershipRequest => {
  if (!customer) return INACTIVE_REQUEST

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (meta[MEMBERSHIP_META.status] !== "pending") return INACTIVE_REQUEST

  return {
    pending: true,
    requestedAt: num(meta[MEMBERSHIP_META.requestedAt]),
    paymentMethod: asPaymentMethod(meta[MEMBERSHIP_META.paymentMethod]),
    paymentReference: str(meta[MEMBERSHIP_META.paymentReference]),
  }
}

// A renewal request from a member whose term is still valid. Distinct from
// getMembershipRequest (first-time signup): here the customer stays an active
// member while the admin verifies the renewal payment and extends the term.
export const getMembershipRenewal = (
  customer: HttpTypes.StoreCustomer | null | undefined
): MembershipRequest => {
  if (!customer) return INACTIVE_REQUEST

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  if (meta[MEMBERSHIP_META.renewalPending] !== true) return INACTIVE_REQUEST

  return {
    pending: true,
    requestedAt: num(meta[MEMBERSHIP_META.requestedAt]),
    paymentMethod: asPaymentMethod(meta[MEMBERSHIP_META.paymentMethod]),
    paymentReference: str(meta[MEMBERSHIP_META.paymentReference]),
  }
}

// Flat member discount applied at the storefront level for non-sale prices.
// Dev placeholder until a Medusa price list scoped to `hub-members` is wired —
// once that lands, the cart will reflect the real member price directly and
// this becomes purely a display helper for the "Member ₱X" annotation shown
// to free users on product cards.
export const MEMBER_DISCOUNT_RATE = 0.08

export const getMemberPrice = (amount: number): number =>
  amount * (1 - MEMBER_DISCOUNT_RATE)

// Annual membership fee in PHP. Kept here so the page, the upsell strip,
// and any future copy stay in sync if/when this changes.
export const MEMBERSHIP_FEE_PHP = 500

// Manual-verification payment instructions surfaced on the upgrade form.
// Leave fields empty until the real receiving accounts are registered —
// the form treats an empty `number`/`accountNumber` as "method not yet
// available" and disables that option rather than showing fake details.
export type MembershipPayoutChannel = {
  // Display label shown on the radio option.
  label: string
  // Account-holder name printed alongside the number.
  accountName: string
  // The actual GCash mobile number / bank account number. Empty = disabled.
  accountNumber: string
  // Extra context line (e.g. bank branch). Optional.
  note?: string
}

export const MEMBERSHIP_PAYOUT: Record<MembershipPaymentMethod, MembershipPayoutChannel> = {
  otc: {
    label: "Cash at the hub counter",
    accountName: "Any FreshHub counter",
    accountNumber: "—",
    note: "Tell the cashier the email on your FreshHub account so they can match your payment.",
  },
  gcash: {
    label: "GCash",
    accountName: "Jelmar Orapa",
    accountNumber: "09631225067",
    note: "Account is held by the Fresh Hub CTO. Send the exact amount, then paste the 13-digit reference below.",
  },
  bank: {
    label: "Bank transfer",
    accountName: "",
    accountNumber: "",
    note: "",
  },
}

export const isPayoutChannelConfigured = (
  channel: MembershipPayoutChannel
): boolean => channel.accountNumber.trim().length > 0

// OTC cash is verified at the counter by account email — no receipt
// reference exists to paste, so the form must not require one.
export const methodNeedsReference = (
  method: MembershipPaymentMethod
): boolean => method !== "otc"
