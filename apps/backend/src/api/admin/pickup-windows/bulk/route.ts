import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import { HUB_MODULE } from "../../../../modules/hub"
import HubModuleService from "../../../../modules/hub/service"
import {
  validateWindowCreate,
} from "../../../../modules/pickup/validators"

/**
 * POST /admin/pickup-windows/bulk
 * Generates recurring pickup windows for a date range.
 *
 * Body: {
 *   hub_area_id: string,
 *   from: "YYYY-MM-DD",
 *   to: "YYYY-MM-DD",
 *   days_of_week: number[],      // 0=Sun..6=Sat
 *   start_time: "HH:mm",
 *   end_time: "HH:mm",
 *   capacity_kg?: number | null
 * }
 *
 * Idempotent on (area, date, start_time) — re-running adds no duplicates.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)
  const hubService: HubModuleService = req.scope.resolve(HUB_MODULE)

  const body = req.body as {
    hub_area_id?: string
    from?: string
    to?: string
    days_of_week?: number[]
    start_time?: string
    end_time?: string
    capacity_kg?: number | null
  }

  // Validation
  if (
    !body.hub_area_id ||
    !body.from ||
    !body.to ||
    !body.days_of_week?.length ||
    !body.start_time ||
    !body.end_time
  ) {
    res.status(400).json({
      error:
        "hub_area_id, from, to, days_of_week, start_time, and end_time are required.",
    })
    return
  }

  // Validate hub_area
  const areas = await hubService.listHubAreas(
    { id: body.hub_area_id },
    { take: 1 }
  )
  if (!areas.length) {
    res.status(400).json({ error: "Hub area not found.", code: "HUB_AREA_NOT_FOUND" })
    return
  }
  const area = areas[0]

  // Validate time range
  const timeValidation = validateWindowCreate({
    start_time: body.start_time,
    end_time: body.end_time,
    date: body.from,
  })
  if (!timeValidation.ok) {
    res.status(400).json({
      error: timeValidation.errors[0].message,
      code: timeValidation.errors[0].code,
    })
    return
  }

  // Generate date list
  const fromDate = new Date(body.from)
  const toDate = new Date(body.to)
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." })
    return
  }
  if (fromDate > toDate) {
    res.status(400).json({ error: "'from' must be before 'to'." })
    return
  }

  const daysSet = new Set(body.days_of_week)

  // All date math runs in UTC so ISO derivation and getUTCDay() agree —
  // mixing local-time constructors with toISOString().slice(0,10) shifts dates
  // by ±1 day on hosts whose system TZ isn't UTC.
  const utcDay = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

  const dates: Date[] = []
  const cursor = utcDay(fromDate)
  const endCursor = utcDay(toDate)
  while (cursor <= endCursor) {
    if (daysSet.has(cursor.getUTCDay())) {
      dates.push(new Date(cursor))
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  // Today in Manila TZ — bulk skips past dates rather than failing.
  const nowUtc = new Date()
  const tzOffset = 8 * 60 * 60_000
  const localNow = new Date(nowUtc.getTime() + tzOffset)
  const todayStart = new Date(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate()
  )

  // Pre-fetch all existing windows in this area + start_time so we can dedup
  // in memory (a date-equality filter against the `dateTime` column is
  // unreliable; cheaper than N round-trips and avoids that gotcha entirely).
  const existingForArea = await service.listPickupWindows(
    { hub_area_id: body.hub_area_id, start_time: body.start_time },
    { take: 1000 }
  )
  const existingDays = new Set(
    existingForArea.map((w) =>
      (typeof w.date === "string"
        ? w.date
        : new Date(w.date).toISOString()
      ).slice(0, 10)
    )
  )

  const created: unknown[] = []
  const skipped: { date: string; reason: string }[] = []

  for (const date of dates) {
    const dateStr = date.toISOString().slice(0, 10)

    if (date < todayStart) {
      skipped.push({ date: dateStr, reason: "Past date — skipped." })
      continue
    }

    if (existingDays.has(dateStr)) {
      skipped.push({ date: dateStr, reason: "Duplicate window already exists." })
      continue
    }

    const window = await service.createPickupWindows({
      hub_id: area.hub_id as string,
      hub_area_id: body.hub_area_id,
      date: date,
      start_time: body.start_time,
      end_time: body.end_time,
      capacity_kg: body.capacity_kg ?? null,
      status: "open",
    })
    created.push(window)
    existingDays.add(dateStr)
  }

  res.status(201).json({ created, skipped })
}