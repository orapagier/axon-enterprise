export const LISTING_TYPES = ["direct_to_consumer", "sell_to_freshhub"] as const
export type ListingType = (typeof LISTING_TYPES)[number]

export const LISTING_STATUSES = [
  "draft",
  "pending_pickup",
  "active",
  "sold_out",
  "expired",
  "cancelled",
] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]