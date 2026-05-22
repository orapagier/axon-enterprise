import { MedusaService } from "@medusajs/framework/utils"
import DispatchBatch from "./models/dispatch-batch"
import DispatchOrder from "./models/dispatch-order"

class DispatchModuleService extends MedusaService({
  DispatchBatch,
  DispatchOrder,
}) {}

export default DispatchModuleService
