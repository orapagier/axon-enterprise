import {
  createWorkflow,
  createStep,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PICKUP_MODULE } from "../modules/pickup"
import PickupModuleService from "../modules/pickup/service"
import { validateSlotReserve } from "../modules/pickup/validators"

export type ReservePickupSlotInput = {
  listing_id: string
  pickup_window_id: string
  harvest_date: string
  estimated_kg: number
}

/**
 * Atomic reservation: validate, create slot, bump window reserved_kg,
 * and conditionally mark window full — all in a single workflow that
 * rolls back on failure.
 */
const reservePickupSlotWorkflow = createWorkflow(
  "reserve-pickup-slot",
  (input: ReservePickupSlotInput) => {
    const slot = createStep(
      "create-pickup-slot",
      async (_, context) => {
        const service: PickupModuleService =
          context.scope.resolve(PICKUP_MODULE)

        // Fetch the window
        const windows = await service.listPickupWindows(
          { id: input.pickup_window_id },
          { take: 1 }
        )
        const window = windows[0]
        if (!window) {
          throw new Error(
            `Pickup window ${input.pickup_window_id} not found.`
          )
        }

        // Validate
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
          const msg = result.errors.map((e) => e.message).join("; ")
          throw new Error(msg)
        }

        // Create the slot
        const newSlot = await service.createPickupSlots({
          pickup_window_id: input.pickup_window_id,
          listing_id: input.listing_id,
          estimated_kg: input.estimated_kg,
          status: "reserved",
        })

        // Bump reserved_kg
        const newReservedKg =
          (window.reserved_kg ?? 0) + input.estimated_kg
        const update: Record<string, unknown> = {
          reserved_kg: newReservedKg,
        }

        // If capacity exceeded, flip to full
        if (
          window.capacity_kg !== null &&
          newReservedKg >= window.capacity_kg
        ) {
          update.status = "full"
        }

        await service.updatePickupWindows({
          id: input.pickup_window_id,
          ...update,
        })

        return newSlot
      },
      // Compensation: rollback slot + capacity on failure
      async (_, context) => {
        const service: PickupModuleService =
          context.scope.resolve(PICKUP_MODULE)

        const slots = await service.listPickupSlots(
          {
            pickup_window_id: input.pickup_window_id,
            listing_id: input.listing_id,
            status: "reserved",
          },
          { take: 1 }
        )

        if (slots.length) {
          await service.deletePickupSlots(slots[0].id)

          // Release capacity
          const windows = await service.listPickupWindows(
            { id: input.pickup_window_id },
            { take: 1 }
          )
          const window = windows[0]
          if (window) {
            const newReserved = Math.max(
              0,
              (window.reserved_kg ?? 0) - input.estimated_kg
            )
            const windowUpdate: Record<string, unknown> = {
              reserved_kg: newReserved,
            }
            if (
              window.status === "full" &&
              window.capacity_kg !== null &&
              newReserved < window.capacity_kg
            ) {
              windowUpdate.status = "open"
            }
            await service.updatePickupWindows({
              id: window.id,
              ...windowUpdate,
            })
          }
        }
      }
    )

    return new WorkflowResponse(slot)
  }
)

export default reservePickupSlotWorkflow