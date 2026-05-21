/**
 * Seeds 4 weeks of recurring Tue/Fri pickup windows for Tagum Central.
 *
 * Idempotent: re-running skips already-present (area, date, start_time) triples.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/seed-pickup-windows.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../modules/pickup"
import type PickupModuleService from "../modules/pickup/service"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"

export default async function seedPickupWindows({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pickupService: PickupModuleService = container.resolve(PICKUP_MODULE)
  const hubService: HubModuleService = container.resolve(HUB_MODULE)

  // Find Tagum Central area
  const areas = await hubService.listHubAreas(
    { name: "Tagum Central" },
    { take: 1 }
  )
  if (!areas.length) {
    logger.warn("Tagum Central hub area not found — run seed-hubs.ts first.")
    return
  }
  const area = areas[0]

  // Today at UTC midnight matching the Manila calendar day.
  // We do all date math in UTC so getUTCDay() and toISOString().slice(0,10)
  // agree — mixing local-time and ISO derivation shifts dates by ±1 day.
  const now = new Date()
  const tzOffsetMs = 8 * 60 * 60_000 // Asia/Manila
  const manilaNow = new Date(now.getTime() + tzOffsetMs)
  const today = new Date(
    Date.UTC(
      manilaNow.getUTCFullYear(),
      manilaNow.getUTCMonth(),
      manilaNow.getUTCDate()
    )
  )

  const DAYS_OF_WEEK = [2, 5] // Tuesday, Friday — matches Phase 1 seed
  const START_TIME = "06:00"
  const END_TIME = "10:00"
  const CAPACITY_KG = 500
  const WEEKS = 4
  const endDate = new Date(today)
  endDate.setUTCDate(endDate.getUTCDate() + WEEKS * 7)

  // Pre-load existing windows for this area + slot so dedup happens in memory
  // (date equality against a dateTime column is unreliable in MikroORM).
  const existingForSlot = await pickupService.listPickupWindows(
    { hub_area_id: area.id, start_time: START_TIME },
    { take: 1000 }
  )
  const existingDays = new Set(
    existingForSlot.map((w) =>
      (typeof w.date === "string"
        ? w.date
        : new Date(w.date).toISOString()
      ).slice(0, 10)
    )
  )

  let created = 0
  let skipped = 0

  const cursor = new Date(today)
  while (cursor <= endDate) {
    if (DAYS_OF_WEEK.includes(cursor.getUTCDay())) {
      const dateStr = cursor.toISOString().slice(0, 10)

      if (existingDays.has(dateStr)) {
        skipped++
        logger.info(`Window ${dateStr} already exists — skipping.`)
      } else {
        await pickupService.createPickupWindows({
          hub_id: area.hub_id as string,
          hub_area_id: area.id,
          date: new Date(cursor),
          start_time: START_TIME,
          end_time: END_TIME,
          capacity_kg: CAPACITY_KG,
          status: "open",
        })
        existingDays.add(dateStr)
        created++
        logger.info(`Created window: ${dateStr} ${START_TIME}-${END_TIME}`)
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  logger.info(
    `seed-pickup-windows finished: ${created} created, ${skipped} skipped (already existed).`
  )
}