import { MedusaService } from "@medusajs/framework/utils"
import Rider from "./models/rider"

class RiderModuleService extends MedusaService({ Rider }) {}

export default RiderModuleService
