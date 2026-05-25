import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PICKUP_MODULE } from "../modules/pickup"
import type PickupModuleService from "../modules/pickup/service"
import { validateSlotReserve } from "../modules/pickup/validators"

export type ReservePickupSlotInput = {
  listing_id: string
  pickup_window_id: string
  harvest_date: string
  estimated_kg: number
}

type ReservedSlotState = {
  slot_id: string
  pickup_window_id: string
  estimated_kg: number
  previous_window_status: "open" | "full" | "closed" | "completed"
  flipped_to_full: boolean
}

const reserveSlotStep = createStep(
  "reserve-pickup-slot.reserve",
  async (input: ReservePickupSlotInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)

    if (!input.pickup_window_id) {
      throw new Error("reserve-pickup-slot: pickup_window_id is required")
    }
    if (!input.listing_id) {
      throw new Error("reserve-pickup-slot: listing_id is required")
    }

    const windows = await service.listPickupWindows(
      { id: input.pickup_window_id },
      { take: 1 }
    )
    const window = windows[0]
    if (!window) {
      throw new Error(`Pickup window ${input.pickup_window_id} not found.`)
    }

    const result = validateSlotReserve({
      windowStatus: window.status as "open" | "full" | "closed" | "completed",
      windowDate:
        typeof window.date === "string"
          ? window.date
          : new Date(window.date).toISOString(),
      harvestDate: input.harvest_date,
      reserved_kg: window.reserved_kg ?? 0,
      estimated_kg: input.estimated_kg,
      capacity_kg: window.capacity_kg ?? null,
    })
    if (!result.ok) {
      throw new Error(result.errors.map((e) => e.message).join("; "))
    }

    let newSlot
    try {
      newSlot = await service.createPickupSlots({
        pickup_window: input.pickup_window_id,
        listing_id: input.listing_id,
        estimated_kg: input.estimated_kg,
        status: "reserved",
      } as unknown as Parameters<typeof service.createPickupSlots>[0])
    } catch (err) {
      throw new Error(
        `createPickupSlots failed (window=${input.pickup_window_id}, listing=${input.listing_id}, kg=${input.estimated_kg}): ${err instanceof Error ? err.message : String(err)}`
      )
    }

    if (!newSlot?.id) {
      throw new Error(
        `createPickupSlots returned no id (got ${JSON.stringify(newSlot)})`
      )
    }

    const newReservedKg = (window.reserved_kg ?? 0) + input.estimated_kg
    const update: Record<string, unknown> = { reserved_kg: newReservedKg }
    let flippedToFull = false
    if (
      window.capacity_kg !== null &&
      window.capacity_kg !== undefined &&
      newReservedKg >= window.capacity_kg
    ) {
      update.status = "full"
      flippedToFull = true
    }

    try {
      await service.updatePickupWindows({ id: window.id, ...update })
    } catch (err) {
      throw new Error(
        `updatePickupWindows failed (window=${window.id}): ${err instanceof Error ? err.message : String(err)}`
      )
    }

    const state: ReservedSlotState = {
      slot_id: newSlot.id,
      pickup_window_id: input.pickup_window_id,
      estimated_kg: input.estimated_kg,
      previous_window_status: window.status as
        | "open"
        | "full"
        | "closed"
        | "completed",
      flipped_to_full: flippedToFull,
    }

    return new StepResponse(newSlot, state)
  },
  // Compensation: undo the slot + capacity bump if a later step fails.
  async (state, { container }) => {
    if (!state) return
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)

    try {
      await service.deletePickupSlots(state.slot_id)
    } catch {
      // already gone — keep going
    }

    const windows = await service.listPickupWindows(
      { id: state.pickup_window_id },
      { take: 1 }
    )
    const window = windows[0]
    if (!window) return

    const restored = Math.max(0, (window.reserved_kg ?? 0) - state.estimated_kg)
    const restoreUpdate: Record<string, unknown> = { reserved_kg: restored }
    if (state.flipped_to_full) {
      restoreUpdate.status = state.previous_window_status
    }
    await service.updatePickupWindows({ id: window.id, ...restoreUpdate })
  }
)

const reservePickupSlotWorkflow = createWorkflow(
  "reserve-pickup-slot",
  (input: ReservePickupSlotInput) => {
    const slot = reserveSlotStep(input)
    return new WorkflowResponse(slot)
  }
)

export default reservePickupSlotWorkflow
