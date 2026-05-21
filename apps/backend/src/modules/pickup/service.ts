import { MedusaService } from "@medusajs/framework/utils"
import PickupWindow from "./models/pickup-window"
import PickupSlot from "./models/pickup-slot"

class PickupModuleService extends MedusaService({
  PickupWindow,
  PickupSlot,
}) {}

export default PickupModuleService