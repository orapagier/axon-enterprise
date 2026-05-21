import { MedusaService } from "@medusajs/framework/utils"
import Hub from "./models/hub"
import HubArea from "./models/hub-area"

class HubModuleService extends MedusaService({
  Hub,
  HubArea,
}) {}

export default HubModuleService