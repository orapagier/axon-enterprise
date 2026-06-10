import type { ExecArgs } from "@medusajs/framework/types"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import type { CreateOrderLineItemDTO } from "@medusajs/framework/types"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import assignOrderToDispatchWorkflow, {
  resolveBatchDate,
} from "../workflows/assign-order-to-dispatch"

/**
 * TEMPORARY — verifies the cutoff-race roll-forward: with the resolved target
 * batch already locked, assignment must land on the NEXT day's batch instead
 * of throwing. Delete after verification.
 */
export default async function verifyRollforward({ container }: ExecArgs) {
  const HUB_ID = "01KS4TYKE280NSH40MSEN5QV9J"
  const REGION_ID = "reg_01KRXKWN61270WSFQRN64SY5BG"
  const CUSTOMER_ID = "cus_01KS79Y9XTGSAD93E63XY9B68E" // hub-linked
  const VARIANT_ID = "variant_01KSGKYD39EE3CY5BC0N6NJPQ7"

  const dispatch: DispatchModuleService = container.resolve(DISPATCH_MODULE)

  // Lock (or create locked) the batch the workflow would normally target.
  const { dispatch_date, cutoff_at } = resolveBatchDate(new Date(), "12:00")
  const [target] = await dispatch.listDispatchBatches(
    { hub_id: HUB_ID, dispatch_date },
    { take: 1 }
  )
  if (target) {
    await dispatch.updateDispatchBatches({ id: target.id, status: "locked" })
  } else {
    await dispatch.createDispatchBatches({
      hub_id: HUB_ID,
      dispatch_date,
      cutoff_at,
      status: "locked",
    })
  }

  const { result: order } = await createOrderWorkflow(container).run({
    input: {
      region_id: REGION_ID,
      currency_code: "php",
      customer_id: CUSTOMER_ID,
      email: "cod-test-1779435513@freshhub.local",
      items: [
        { variant_id: VARIANT_ID, quantity: 1, title: "Potato" },
      ] as unknown as CreateOrderLineItemDTO[],
      metadata: { verify_label: "VERIFY-ROLLFORWARD" },
    },
  })

  await assignOrderToDispatchWorkflow(container).run({
    input: { order_id: order.id },
  })

  const [dispatchOrder] = await dispatch.listDispatchOrders(
    { order_id: order.id },
    { take: 1, relations: ["dispatch_batch"] }
  )
  const batch = (
    dispatchOrder as unknown as {
      dispatch_batch?: { dispatch_date?: Date; status?: string }
    }
  ).dispatch_batch

  console.log(
    "ROLLFORWARD " +
      JSON.stringify({
        order_id: order.id,
        target_date_locked: dispatch_date.toISOString(),
        landed_date: batch?.dispatch_date,
        landed_status: batch?.status,
      })
  )
}
