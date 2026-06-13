/**
 * Minimal scheduled-job observability (Phase H).
 *
 * Wraps a job handler so every run logs a consistent start / finish / duration
 * line and — critically — surfaces a failure as an `error`-level log instead of
 * a silent unhandled rejection in the scheduler. Also absorbs the two ways a
 * job is invoked (the scheduler passes the bare container; `npx medusa exec`
 * passes an `{ container }` ExecArgs object), so individual jobs no longer each
 * re-implement that unwrap.
 *
 * Usage:
 *   export default (input) => runJob("my-job", input, async (container) => {
 *     ...
 *   })
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type JobInput = MedusaContainer | { container: MedusaContainer }

function unwrap(input: JobInput): MedusaContainer {
  return "container" in input
    ? (input as { container: MedusaContainer }).container
    : (input as MedusaContainer)
}

export async function runJob(
  name: string,
  input: JobInput,
  handler: (container: MedusaContainer) => Promise<void>
): Promise<void> {
  const container = unwrap(input)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const startedAt = Date.now()
  logger.info(`[job:${name}] started`)
  try {
    await handler(container)
    logger.info(`[job:${name}] finished in ${Date.now() - startedAt}ms`)
  } catch (err) {
    logger.error(
      `[job:${name}] FAILED after ${Date.now() - startedAt}ms: ${
        (err as Error)?.message ?? err
      }`
    )
    // Re-throw so the scheduler still records the failure / retries per its
    // own policy — observability adds a log line, it does not swallow errors.
    throw err
  }
}
