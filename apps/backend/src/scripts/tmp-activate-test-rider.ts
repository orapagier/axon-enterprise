import { ExecArgs } from "@medusajs/framework/types"
import { RIDER_MODULE } from "../modules/rider"
import type RiderModuleService from "../modules/rider/service"

export default async function activateTestRider({ container }: ExecArgs) {
  const riders: RiderModuleService = container.resolve(RIDER_MODULE)
  const [rider] = await riders.listRiders(
    { email: "rider-e2e@test.mfh" },
    { take: 1 }
  )
  if (!rider) {
    console.log("no test rider found")
    return
  }
  await riders.updateRiders({ id: rider.id, status: "active" })
  console.log("activated", rider.id)
}
