import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { DISPATCH_MODULE } from "../modules/dispatch"
import type DispatchModuleService from "../modules/dispatch/service"
import { HUB_MODULE } from "../modules/hub"
import type HubModuleService from "../modules/hub/service"

export type AssignOrderToDispatchInput = {
  order_id: string
}

type AssignedState = {
  dispatch_order_id: string
  dispatch_batch_id: string
  created_batch: boolean
}

// Asia/Manila is fixed UTC+8 with no DST. Matches the convention used by the
// expire-pickup-windows job; keeping the math local avoids a TZ library dep.
const MANILA_OFFSET_MS = 8 * 60 * 60_000

function parseHHmm(s: string): { h: number; m: number } {
  const [h, m] = s.split(":").map((x) => parseInt(x, 10))
  return { h: h ?? 0, m: m ?? 0 }
}

/**
 * Compute the dispatch batch a freshly placed order should land in for a hub
 * with the given cutoff (HH:mm in the hub's local TZ).
 *
 * Returns the batch date (midnight UTC of the local calendar day) and the
 * cutoff timestamp (the moment the batch locks).
 */
export function resolveBatchDate(now: Date, cutoff: string): {
  dispatch_date: Date
  cutoff_at: Date
} {
  const localNow = new Date(now.getTime() + MANILA_OFFSET_MS)
  const { h, m } = parseHHmm(cutoff)

  // Today (local) at cutoff, expressed in UTC.
  const todayCutoffUtcMs = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
    h,
    m
  ) - MANILA_OFFSET_MS

  const beforeCutoff = now.getTime() < todayCutoffUtcMs
  const targetLocal = new Date(localNow)
  if (!beforeCutoff) {
    targetLocal.setUTCDate(targetLocal.getUTCDate() + 1)
  }

  const dispatch_date = new Date(
    Date.UTC(
      targetLocal.getUTCFullYear(),
      targetLocal.getUTCMonth(),
      targetLocal.getUTCDate()
    )
  )
  const cutoff_at = new Date(
    Date.UTC(
      targetLocal.getUTCFullYear(),
      targetLocal.getUTCMonth(),
      targetLocal.getUTCDate(),
      h,
      m
    ) - MANILA_OFFSET_MS
  )

  return { dispatch_date, cutoff_at }
}

const assignStep = createStep(
  "assign-order-to-dispatch.assign",
  async (input: AssignOrderToDispatchInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const dispatchService: DispatchModuleService =
      container.resolve(DISPATCH_MODULE)
    const hubService: HubModuleService = container.resolve(HUB_MODULE)

    // 1. Resolve order → customer → home hub (hub-scoped catalog guarantees
    //    every item belongs to that hub; Phase 1).
    const { data: orderRows } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id"],
      filters: { id: input.order_id },
    })
    const order = orderRows[0] as
      | { id: string; customer_id: string | null }
      | undefined
    if (!order) {
      throw new Error(`Order ${input.order_id} not found.`)
    }
    if (!order.customer_id) {
      throw new Error(
        `Order ${input.order_id} has no customer; cannot resolve hub.`
      )
    }

    const { data: customerRows } = await query.graph({
      entity: "customer",
      fields: ["id", "hub.id", "hub.dispatch_cutoff"],
      filters: { id: order.customer_id },
    })
    const customer = customerRows[0] as
      | { hub?: { id: string; dispatch_cutoff: string } | null }
      | undefined
    const hub = customer?.hub
    if (!hub?.id) {
      throw new Error(
        `Customer ${order.customer_id} has no linked hub; cannot dispatch.`
      )
    }

    // 2. Compute target batch date based on the hub's cutoff.
    const { dispatch_date, cutoff_at } = resolveBatchDate(
      new Date(),
      hub.dispatch_cutoff ?? "12:00"
    )

    // 3. Find or create the batch. Same (hub_id, dispatch_date) → same batch.
    //    If the resolved batch is already locked (the order landed in the
    //    cutoff race window: resolveBatchDate said "today" but the lock job
    //    got there first), roll forward day by day until an open batch is
    //    found — throwing here would strand a paid order with no dispatch
    //    entry, because the order-placed subscriber only logs failures.
    const DAY_MS = 24 * 60 * 60 * 1000
    let batch: Awaited<
      ReturnType<DispatchModuleService["listDispatchBatches"]>
    >[number] | null = null
    let createdBatch = false
    for (let dayOffset = 0; dayOffset < 3 && !batch; dayOffset++) {
      const candidateDate = new Date(dispatch_date.getTime() + dayOffset * DAY_MS)
      const candidateCutoff = new Date(cutoff_at.getTime() + dayOffset * DAY_MS)
      const existing = await dispatchService.listDispatchBatches(
        { hub_id: hub.id, dispatch_date: candidateDate },
        { take: 1 }
      )
      if (!existing[0]) {
        batch = await dispatchService.createDispatchBatches({
          hub_id: hub.id,
          dispatch_date: candidateDate,
          cutoff_at: candidateCutoff,
          status: "collecting",
        })
        createdBatch = true
      } else if (existing[0].status === "collecting") {
        batch = existing[0]
      }
      // locked / in_transit / completed → try the next day
    }
    if (!batch) {
      const err = new Error(
        `No open dispatch batch found for hub ${hub.id} within 3 days; order ${input.order_id} cannot be added.`
      )
      ;(err as { status?: number }).status = 409
      throw err
    }

    // 4. Compute next manifest position (last + 1).
    const siblings = await dispatchService.listDispatchOrders(
      { dispatch_batch_id: batch.id },
      { take: 1, order: { manifest_position: "DESC" } }
    )
    const nextPos = (siblings[0]?.manifest_position ?? -1) + 1

    const dispatchOrder = await dispatchService.createDispatchOrders({
      dispatch_batch: batch.id,
      order_id: input.order_id,
      manifest_position: nextPos,
      delivery_status: "pending",
    })

    const state: AssignedState = {
      dispatch_order_id: dispatchOrder.id,
      dispatch_batch_id: batch.id,
      created_batch: createdBatch,
    }
    return new StepResponse(dispatchOrder, state)
  },
  async (state, { container }) => {
    if (!state) return
    const dispatchService: DispatchModuleService =
      container.resolve(DISPATCH_MODULE)
    try {
      await dispatchService.deleteDispatchOrders(state.dispatch_order_id)
    } catch {
      // already gone
    }
    if (state.created_batch) {
      try {
        await dispatchService.deleteDispatchBatches(state.dispatch_batch_id)
      } catch {
        // already gone
      }
    }
  }
)

const assignOrderToDispatchWorkflow = createWorkflow(
  "assign-order-to-dispatch",
  (input: AssignOrderToDispatchInput) => {
    const dispatchOrder = assignStep(input)
    return new WorkflowResponse(dispatchOrder)
  }
)

export default assignOrderToDispatchWorkflow
