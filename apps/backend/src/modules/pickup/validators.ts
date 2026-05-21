import type { PickupWindowStatus, PickupSlotStatus } from "./types"

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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
// Window creation
// ---------------------------------------------------------------------------

export function validateWindowCreate(params: {
  start_time: string
  end_time: string
  date: string
}): ValidationResult {
  const errors: ValidationError[] = []

  // start_time < end_time
  if (params.start_time >= params.end_time) {
    errors.push({
      field: "end_time",
      message: "end_time must be after start_time.",
      code: "TIME_RANGE_INVALID",
    })
  }

  // date >= today (in Manila TZ). All math in UTC so ISO derivation is consistent.
  const parsed = new Date(params.date)
  if (isNaN(parsed.getTime())) {
    errors.push({
      field: "date",
      message: "Invalid date format. Use YYYY-MM-DD.",
      code: "DATE_INVALID",
    })
  } else {
    const tzOffset = 8 * 60 * 60_000
    const manilaNow = new Date(Date.now() + tzOffset)
    const todayStart = new Date(
      Date.UTC(
        manilaNow.getUTCFullYear(),
        manilaNow.getUTCMonth(),
        manilaNow.getUTCDate()
      )
    )
    const manilaDate = new Date(parsed.getTime() + tzOffset)
    const dateStart = new Date(
      Date.UTC(
        manilaDate.getUTCFullYear(),
        manilaDate.getUTCMonth(),
        manilaDate.getUTCDate()
      )
    )
    if (dateStart < todayStart) {
      errors.push({
        field: "date",
        message: "Pickup window date cannot be in the past.",
        code: "DATE_IN_PAST",
      })
    }
  }

  return { ok: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Capacity check
// ---------------------------------------------------------------------------

export function validateSlotCapacity(
  reserved_kg: number,
  estimated_kg: number,
  capacity_kg: number | null
): ValidationResult {
  if (estimated_kg <= 0) {
    return {
      ok: false,
      errors: [
        {
          field: "estimated_kg",
          message: "Estimated weight must be greater than zero.",
          code: "ESTIMATED_KG_INVALID",
        },
      ],
    }
  }

  if (capacity_kg !== null && reserved_kg + estimated_kg > capacity_kg) {
    return {
      ok: false,
      errors: [
        {
          field: "estimated_kg",
          message: `Adding ${estimated_kg} kg would exceed the window capacity of ${capacity_kg} kg (${reserved_kg} kg already reserved).`,
          code: "CAPACITY_EXCEEDED",
        },
      ],
    }
  }

  return { ok: true, errors: [] }
}

// ---------------------------------------------------------------------------
// Time-range parsing helper
// ---------------------------------------------------------------------------

export function parseTimeRange(
  start_time: string,
  end_time: string
): { ok: true; start: number; end: number } | { ok: false; error: string } {
  const startMatch = /^(\d{1,2}):(\d{2})$/.exec(start_time)
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(end_time)

  if (!startMatch || !endMatch) {
    return { ok: false, error: "Times must be in HH:mm format." }
  }

  const start = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10)
  const end = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10)

  if (start >= end) {
    return { ok: false, error: "start_time must be before end_time." }
  }

  return { ok: true, start, end }
}

// ---------------------------------------------------------------------------
// Window status transitions
// ---------------------------------------------------------------------------

const WINDOW_TRANSITIONS: Record<
  PickupWindowStatus,
  PickupWindowStatus[]
> = {
  open: ["full", "closed", "completed"],
  full: ["open", "closed", "completed"],
  closed: ["open"],
  completed: [],
}

export function validateWindowStatusTransition(
  current: PickupWindowStatus,
  next: PickupWindowStatus,
  isAdmin: boolean
): ValidationResult {
  const allowed = WINDOW_TRANSITIONS[current]
  if (!allowed || !allowed.includes(next)) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          message: `Cannot transition window from "${current}" to "${next}".`,
          code: "INVALID_WINDOW_STATUS_TRANSITION",
        },
      ],
    }
  }

  // "full" can only be set by the system (automatic on capacity), not by admin
  if (next === "full" && isAdmin) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          message: 'Status "full" is set automatically — not by admin action.',
          code: "FULL_STATUS_AUTO_ONLY",
        },
      ],
    }
  }

  // Only cron should complete
  if (next === "completed" && isAdmin) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          message: 'Status "completed" is set by the nightly job only.',
          code: "COMPLETED_CRON_ONLY",
        },
      ],
    }
  }

  return { ok: true, errors: [] }
}

// ---------------------------------------------------------------------------
// Slot status transitions
// ---------------------------------------------------------------------------

const SLOT_TRANSITIONS: Record<
  PickupSlotStatus,
  { allowed: PickupSlotStatus[]; requiresAdmin: boolean }
> = {
  reserved: {
    allowed: ["picked_up", "no_show", "rejected"],
    requiresAdmin: true,
  },
  picked_up: { allowed: [], requiresAdmin: false },
  no_show: { allowed: [], requiresAdmin: false },
  rejected: { allowed: [], requiresAdmin: false },
}

export function validateSlotStatusTransition(
  current: PickupSlotStatus,
  next: PickupSlotStatus,
  isAdmin: boolean,
  windowDatePassed: boolean
): ValidationResult {
  const rule = SLOT_TRANSITIONS[current]

  if (!rule || !rule.allowed.includes(next)) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          message: `Cannot transition slot from "${current}" to "${next}".`,
          code: "INVALID_SLOT_STATUS_TRANSITION",
        },
      ],
    }
  }

  // reserved → no_show can happen via cron after date passes OR admin override
  if (next === "no_show" && current === "reserved") {
    if (!isAdmin && !windowDatePassed) {
      return {
        ok: false,
        errors: [
          {
            field: "status",
            message: 'Slots can only be marked "no_show" after the pickup date.',
            code: "NO_SHOW_DATE_RESTRICTION",
          },
        ],
      }
    }
    return { ok: true, errors: [] }
  }

  // picked_up requires admin
  if (rule.requiresAdmin && !isAdmin) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          message: "Only admins can change a slot from reserved to picked_up or rejected.",
          code: "ADMIN_REQUIRED",
        },
      ],
    }
  }

  return { ok: true, errors: [] }
}

// ---------------------------------------------------------------------------
// Slot reserve validation (combined checks)
// ---------------------------------------------------------------------------

export function validateSlotReserve(params: {
  windowStatus: PickupWindowStatus
  windowDate: string
  harvestDate: string
  reserved_kg: number
  estimated_kg: number
  capacity_kg: number | null
}): ValidationResult {
  const errors: ValidationError[] = []

  if (params.windowStatus !== "open") {
    errors.push({
      field: "pickup_window_id",
      message: `This pickup window is ${params.windowStatus} — no new slots can be reserved.`,
      code: "WINDOW_NOT_OPEN",
    })
  }

  // Compare window date and harvest date (both as YYYY-MM-DD)
  const wDate = params.windowDate.slice(0, 10)
  const hDate = params.harvestDate.slice(0, 10)
  if (wDate !== hDate) {
    errors.push({
      field: "harvest_date",
      message: `Harvest date (${hDate}) must match the pickup window date (${wDate}).`,
      code: "HARVEST_DATE_MISMATCH",
    })
  }

  const capacity = validateSlotCapacity(
    params.reserved_kg,
    params.estimated_kg,
    params.capacity_kg
  )
  if (!capacity.ok) errors.push(...capacity.errors)

  return { ok: errors.length === 0, errors }
}