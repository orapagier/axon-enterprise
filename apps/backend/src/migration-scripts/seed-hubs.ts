/**
 * Seeds the Tagum City Hub and its initial area.
 *
 * Idempotent: re-running skips existing hub/area by slug/name.
 *
 * Run with:
 *   npx medusa exec ./src/migration-scripts/seed-hubs.ts
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"

export default async function seedHubs({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const hubService: HubModuleService = container.resolve(HUB_MODULE)

  const existing = await hubService.listHubs({ slug: "tagum" }, { take: 1 })
  let hub = existing[0]

  if (!hub) {
    hub = await hubService.createHubs({
      name: "Tagum City Hub",
      slug: "tagum",
      city: "Tagum",
      province: "Davao del Norte",
      country: "ph",
      timezone: "Asia/Manila",
      dispatch_cutoff: "12:00",
      dispatch_time: "16:00",
      active: true,
    })
    logger.info("Created Tagum City Hub")
  } else {
    logger.info("Tagum City Hub already exists — skipping")
  }

  const areas = await hubService.listHubAreas({ hub_id: hub.id }, { take: 100 })
  if (!areas.find((a) => a.name === "Tagum Central")) {
    await hubService.createHubAreas({
      hub_id: hub.id,
      name: "Tagum Central",
      postal_codes: ["8100"] as unknown as Record<string, unknown>,
      barangays: [
        "Apokon",
        "Magugpo East",
        "Magugpo North",
        "Magugpo Poblacion",
        "Magugpo South",
        "Magugpo West",
        "Visayan Village",
      ] as unknown as Record<string, unknown>,
      pickup_day_of_week: [2, 5] as unknown as Record<string, unknown>, // Tuesday, Friday — placeholder
    })
    logger.info("Created area: Tagum Central")
  } else {
    logger.info("Area Tagum Central already exists — skipping")
  }
}
