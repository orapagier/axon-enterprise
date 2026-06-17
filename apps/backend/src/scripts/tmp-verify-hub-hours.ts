import { ExecArgs } from "@medusajs/framework/types"
import { HUB_MODULE } from "../modules/hub"
import HubModuleService from "../modules/hub/service"

// Throwaway: prove delivery_open/close are read/writable through the ORM, then restore.
export default async function ({ container }: ExecArgs) {
  const hubService: HubModuleService = container.resolve(HUB_MODULE)
  const [hub] = await hubService.listHubs({}, { take: 1 })
  if (!hub) {
    console.log("NO_HUB")
    return
  }
  const orig = { open: hub.delivery_open, close: hub.delivery_close }
  console.log("BEFORE", hub.id, JSON.stringify(orig))

  await hubService.updateHubs({ id: hub.id, delivery_open: "05:30", delivery_close: "20:15" })
  const after = await hubService.retrieveHub(hub.id)
  console.log("AFTER ", JSON.stringify({ open: after.delivery_open, close: after.delivery_close }))

  await hubService.updateHubs({ id: hub.id, delivery_open: orig.open, delivery_close: orig.close })
  const restored = await hubService.retrieveHub(hub.id)
  console.log("RESTORED", JSON.stringify({ open: restored.delivery_open, close: restored.delivery_close }))
  console.log(
    after.delivery_open === "05:30" && after.delivery_close === "20:15" ? "PASS" : "FAIL"
  )
}
