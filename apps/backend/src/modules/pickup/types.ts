export const PICKUP_WINDOW_STATUSES = [
  "open",
  "full",
  "closed",
  "completed",
] as const
export type PickupWindowStatus = (typeof PICKUP_WINDOW_STATUSES)[number]

export const PICKUP_SLOT_STATUSES = [
  "reserved",
  "picked_up",
  "no_show",
  "rejected",
] as const
export type PickupSlotStatus = (typeof PICKUP_SLOT_STATUSES)[number]