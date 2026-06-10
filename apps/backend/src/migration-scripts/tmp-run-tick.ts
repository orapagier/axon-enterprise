import type { ExecArgs } from "@medusajs/framework/types"
import cleanOrderTick from "../jobs/clean-order-tick"

/** TEMPORARY — exec wrapper for clean-order-tick (exec passes ExecArgs, the
 * job signature takes the bare container). Delete after verification. */
export default async function run({ container }: ExecArgs) {
  await cleanOrderTick(container)
}
