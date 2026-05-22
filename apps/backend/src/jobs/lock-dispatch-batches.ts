/**
 * Lock dispatch batches whose cutoff has passed.
 *
 * Runs every 15 minutes so per-hub cutoffs (currently all Asia/Manila 12:00,
 * but the model permits per-hub override) are honored within the quarter hour.
 * Run on-demand with:
 *   npx medusa exec ./src/jobs/lock-dispatch-batches.ts
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"

export const config = {
  name: "lock-dispatch-batches",
  schedule: "*/15 * * * *",
}

export default async function lockDispatchBatches(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: DispatchModuleService = container.resolve(DISPATCH_MODULE)

  const now = new Date()
  const collecting = await service.listDispatchBatches(
    { status: "collecting" },
    { take: 500 }
  )

  let locked = 0
  for (const batch of collecting) {
    const cutoff =
      typeof batch.cutoff_at === "string"
        ? new Date(batch.cutoff_at)
        : batch.cutoff_at
    if (cutoff <= now) {
      await service.updateDispatchBatches({ id: batch.id, status: "locked" })
      locked++
      logger.info(`Dispatch batch ${batch.id} (hub ${batch.hub_id}) → locked`)
    }
  }

  logger.info(`lock-dispatch-batches finished: ${locked} batches locked.`)
}
