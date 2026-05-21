/**
 * Pure validation functions for listing creation and updates.
 * All checks return structured errors — callers in route handlers
 * convert them to HTTP responses.
 */

import type { ListingStatus, ListingType } from "./types"

export type ValidationError = {
  field: string
  message: string
  code?: string
}

export type ValidationResult = {
  ok: boolean
  errors: ValidationError[]
}

// ---------------------------------------------------------------------------
// Producer eligibility
// ---------------------------------------------------------------------------

export function validateProducerEligibility(meta: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (meta.membership_status !== "active") {
    errors.push({
      field: "membership",
      message: "An active Premium membership is required to create listings.",
      code: "MEMBERSHIP_INACTIVE",
    })
  }

  if (meta.seller_verified !== true) {
    errors.push({
      field: "verification",
      message: "Your producer account must be verified before listing products.",
      code: "SELLER_NOT_VERIFIED",
    })
  }

  return { ok: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Harvest date (sell_to_freshhub)
// ---------------------------------------------------------------------------

export function validateHarvestDate(
  harvestDateRaw: string | undefined | null,
  hubTimezone: string = "Asia/Manila",
  minDays: number = 3,
  maxDays: number = 5
): ValidationResult {
  const errors: ValidationError[] = []

  if (!harvestDateRaw || harvestDateRaw.trim().length === 0) {
    errors.push({
      field: "harvest_date",
      message: "Harvest date is required when selling to FreshHub.",
      code: "HARVEST_DATE_REQUIRED",
    })
    return { ok: false, errors }
  }

  const parsed = new Date(harvestDateRaw.trim())
  if (isNaN(parsed.getTime())) {
    errors.push({
      field: "harvest_date",
      message: "Invalid harvest date format. Use YYYY-MM-DD.",
      code: "HARVEST_DATE_INVALID",
    })
    return { ok: false, errors }
  }

  // Evaluate "today" in the hub timezone.
  const now = new Date()
  // Approximate — a real impl would use luxon / Intl.DateTimeFormat.
  // For Asia/Manila (UTC+8), the offset is fixed year-round.
  const tzOffset = hubTimezone === "Asia/Manila" ? 8 * 60 : 0
  const localNow = new Date(now.getTime() + tzOffset * 60_000)

  // Start of today in hub TZ
  const todayStart = new Date(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate()
  )

  const minDate = new Date(todayStart)
  minDate.setDate(minDate.getDate() + minDays)

  const maxDate = new Date(todayStart)
  maxDate.setDate(maxDate.getDate() + maxDays)

  // Convert harvest date to hub-local start-of-day for comparison.
  const harvestLocal = new Date(parsed.getTime() + tzOffset * 60_000)
  const harvestStart = new Date(
    harvestLocal.getUTCFullYear(),
    harvestLocal.getUTCMonth(),
    harvestLocal.getUTCDate()
  )

  if (harvestStart < minDate || harvestStart > maxDate) {
    errors.push({
      field: "harvest_date",
      message: `Harvest date must be ${minDays}–${maxDays} days from today to allow scheduling.`,
      code: "HARVEST_DATE_OUT_OF_RANGE",
    })
  }

  return { ok: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Pickup window match (deferred to Phase 3)
// ---------------------------------------------------------------------------

/**
 * In Phase 2 the PickupWindow table doesn't exist yet.
 * Always returns OK, but sets the listing to `pending_pickup` when no window
 * is assigned. Phase 3 will upgrade this to a real check.
 */
export function validatePickupWindow(
  _pickupWindowId: string | null,
  _hubAreaId: string | null
): { ok: true; status: "pending_pickup" } {
  return { ok: true, status: "pending_pickup" }
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ["active", "cancelled", "pending_pickup"],
  pending_pickup: ["active", "cancelled", "expired"],
  active: ["sold_out", "cancelled"],
  sold_out: ["active", "cancelled"],
  expired: ["cancelled"],
  cancelled: [],
}

export function validateStatusTransition(
  current: ListingStatus,
  next: ListingStatus
): ValidationResult {
  const allowed = ALLOWED_TRANSITIONS[current]
  if (!allowed || !allowed.includes(next)) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          message: `Cannot transition listing from "${current}" to "${next}".`,
          code: "INVALID_STATUS_TRANSITION",
        },
      ],
    }
  }
  return { ok: true, errors: [] }
}

// ---------------------------------------------------------------------------
// Listing-type lock
// ---------------------------------------------------------------------------

export function validateListingTypeLock(
  currentStatus: ListingStatus,
  requestedField: "listing_type" | "harvest_date"
): ValidationResult {
  // listing_type can only change while draft
  if (requestedField === "listing_type" && currentStatus !== "draft") {
    return {
      ok: false,
      errors: [
        {
          field: "listing_type",
          message: "Listing type cannot be changed once the listing is no longer a draft.",
          code: "LISTING_TYPE_LOCKED",
        },
      ],
    }
  }

  // harvest_date locked once past draft/pending_pickup
  if (requestedField === "harvest_date") {
    const locked: ListingStatus[] = ["active", "sold_out", "expired", "cancelled"]
    if (locked.includes(currentStatus)) {
      return {
        ok: false,
        errors: [
          {
            field: "harvest_date",
            message: "Harvest date cannot be changed for an active or completed listing.",
            code: "HARVEST_DATE_LOCKED",
          },
        ],
      }
    }
  }

  return { ok: true, errors: [] }
}