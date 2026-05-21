/**
 * Nightly cron — expire overdue pickup windows and flip orphan slots to no_show.
 *
 * Scheduled at 01:00 (server TZ; ~09:00 Manila with the UTC host) so it runs
 * after the day's pickups conclude. Run on-demand with:
 *   npx medusa exec ./src/jobs/expire-pickup-windows.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../modules/pickup"
import type PickupModuleService from "../modules/pickup/service"

export const config = {
  name: "expire-pickup-windows",
  schedule: "0 1 * * *",
}

export default async function expirePickupWindows(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: PickupModuleService = container.resolve(PICKUP_MODULE)

  // Today (Manila TZ) at UTC midnight — matches the seed/bulk convention.
  const now = new Date()
  const tzOffset = 8 * 60 * 60_000
  const manilaNow = new Date(now.getTime() + tzOffset)
  const todayStart = new Date(
    Date.UTC(
      manilaNow.getUTCFullYear(),
      manilaNow.getUTCMonth(),
      manilaNow.getUTCDate()
    )
  )

  // --- Step 1: Close overdue open/full windows ---
  // MikroORM filter with an array on a plain enum field is brittle —
  // pull both statuses separately and merge.
  const [openWindows, fullWindows] = await Promise.all([
    service.listPickupWindows({ status: "open" }, { take: 500 }),
    service.listPickupWindows({ status: "full" }, { take: 500 }),
  ])
  const staleWindows = [...openWindows, ...fullWindows]

  let windowsClosed = 0
  for (const w of staleWindows) {
    const wDate = typeof w.date === "string" ? new Date(w.date) : w.date
    if (wDate < todayStart) {
      await service.updatePickupWindows({
        id: w.id,
        status: "completed",
      })
      windowsClosed++
      logger.info(`Window ${w.id} (${w.date}) → completed`)
    }
  }

  // --- Step 2: Flip orphan reserved slots to no_show ---
  const completedWindows = await service.listPickupWindows(
    { status: "completed" },
    { take: 500 }
  )

  let slotsFlagged = 0
  for (const w of completedWindows) {
    const reservedSlots = await service.listPickupSlots(
      {
        pickup_window_id: w.id,
        status: "reserved",
      },
      { take: 500 }
    )

    for (const slot of reservedSlots) {
      await service.updatePickupSlots({
        id: slot.id,
        status: "no_show",
      })
      slotsFlagged++
      logger.info(`Slot ${slot.id} (window ${w.id}) → no_show`)
    }
  }

  logger.info(
    `expire-pickup-windows finished: ${windowsClosed} windows closed, ${slotsFlagged} slots flagged as no_show.`
  )
}