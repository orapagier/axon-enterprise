import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  Modules,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../modules/pickup"
import type PickupModuleService from "../modules/pickup/service"
import { LISTING_MODULE } from "../modules/listing"
import { validateSlotReserve } from "../modules/pickup/validators"

export type ReservePickupSlotInput = {
  listing_id: string
  pickup_window_id: string
  harvest_date: string
  estimated_kg: number
}

type ReservedSlotState = {
  slot_id: string
  listing_id: string
  pickup_window_id: string
  estimated_kg: number
  previous_window_status: "open" | "full" | "closed" | "completed"
  flipped_to_full: boolean
}

// How long (seconds) to wait for the per-window lock before giving up, and how
// long the lock is held. Reserving a slot is a few quick writes, so this is
// generous without risking a stuck lock.
const RESERVE_LOCK_TIMEOUT_S = 10

const reserveSlotStep = createStep(
  "reserve-pickup-slot-reserve",  // NOTE: no dots — the orchestrator derives a step's parent by splitting its id on ".", so a dotted name crashes every run of the workflow
  async (input: ReservePickupSlotInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    const locking = container.resolve(Modules.LOCKING)
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    if (!input.pickup_window_id) {
      throw new Error("reserve-pickup-slot: pickup_window_id is required")
    }
    if (!input.listing_id) {
      throw new Error("reserve-pickup-slot: listing_id is required")
    }

    // Serialize reservations per window. Without this lock two concurrent
    // submissions can both read the same reserved_kg, both pass the capacity
    // check, and overcommit the window (a classic lost update). The window is
    // re-read *inside* the lock so the validation runs against fresh state.
    const { slot, state } = await locking.execute(
      `pickup-window:reserve:${input.pickup_window_id}`,
      async () => {
        const windows = await service.listPickupWindows(
          { id: input.pickup_window_id },
          { take: 1 }
        )
        const window = windows[0]
        if (!window) {
          throw new Error(`Pickup window ${input.pickup_window_id} not found.`)
        }

        const result = validateSlotReserve({
          windowStatus: window.status as
            | "open"
            | "full"
            | "closed"
            | "completed",
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
          // Roll back the slot we just created before bubbling up.
          await service.deletePickupSlots(newSlot.id).catch(() => {})
          throw new Error(
            `updatePickupWindows failed (window=${window.id}): ${err instanceof Error ? err.message : String(err)}`
          )
        }

        // Link listing ↔ slot inside the critical section so the slot is never
        // observable without its listing link.
        try {
          await link.create({
            [LISTING_MODULE]: { product_listing_id: input.listing_id },
            [PICKUP_MODULE]: { pickup_slot_id: newSlot.id },
          })
        } catch (err) {
          // Undo slot + capacity bump before failing.
          await service
            .updatePickupWindows({
              id: window.id,
              reserved_kg: window.reserved_kg ?? 0,
              ...(flippedToFull ? { status: window.status } : {}),
            })
            .catch(() => {})
          await service.deletePickupSlots(newSlot.id).catch(() => {})
          throw new Error(
            `link listing↔slot failed: ${err instanceof Error ? err.message : String(err)}`
          )
        }

        const reservedState: ReservedSlotState = {
          slot_id: newSlot.id,
          listing_id: input.listing_id,
          pickup_window_id: input.pickup_window_id,
          estimated_kg: input.estimated_kg,
          previous_window_status: window.status as
            | "open"
            | "full"
            | "closed"
            | "completed",
          flipped_to_full: flippedToFull,
        }

        return { slot: newSlot, state: reservedState }
      },
      { timeout: RESERVE_LOCK_TIMEOUT_S }
    )

    return new StepResponse(slot, state)
  },
  // Compensation: undo the link, slot, and capacity bump if a later step fails.
  async (state, { container }) => {
    if (!state) return
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    try {
      await link.dismiss({
        [LISTING_MODULE]: { product_listing_id: state.listing_id },
        [PICKUP_MODULE]: { pickup_slot_id: state.slot_id },
      })
    } catch {
      // link may already be gone
    }

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
