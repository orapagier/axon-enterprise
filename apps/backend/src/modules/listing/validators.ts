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

  // "grace" = registration lapsed but inside the 30-day renewal window —
  // perks stay on until the nightly job downgrades the account.
  if (
    meta.membership_status !== "active" &&
    meta.membership_status !== "grace"
  ) {
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

  // All date math runs at UTC midnight on the Manila-equivalent calendar day
  // so ISO derivation lines up — Asia/Manila is UTC+8 year-round so the
  // fixed offset is correct for now; if more TZs land here, swap for Intl.
  const tzOffsetMs =
    (hubTimezone === "Asia/Manila" ? 8 * 60 : 0) * 60_000

  const manilaNow = new Date(Date.now() + tzOffsetMs)
  const todayStart = new Date(
    Date.UTC(
      manilaNow.getUTCFullYear(),
      manilaNow.getUTCMonth(),
      manilaNow.getUTCDate()
    )
  )

  const minDate = new Date(todayStart)
  minDate.setUTCDate(minDate.getUTCDate() + minDays)

  const maxDate = new Date(todayStart)
  maxDate.setUTCDate(maxDate.getUTCDate() + maxDays)

  const manilaHarvest = new Date(parsed.getTime() + tzOffsetMs)
  const harvestStart = new Date(
    Date.UTC(
      manilaHarvest.getUTCFullYear(),
      manilaHarvest.getUTCMonth(),
      manilaHarvest.getUTCDate()
    )
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
// Status transitions
// ---------------------------------------------------------------------------
//
// `pending_pickup` is retained in the enum for historical Phase 2 data but is
// no longer produced by any route — Phase 3 now creates `active` directly
// after a successful pickup slot reservation, and folds `pending_pickup` rows
// forward through the same transitions as `draft`.

const ALLOWED_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  draft: ["active", "cancelled"],
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