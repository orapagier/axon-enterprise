import { MedusaService } from "@medusajs/framework/utils"
import ProducerPayout from "./models/producer-payout"

class ProducerPayoutModuleService extends MedusaService({
  ProducerPayout,
}) {}

export default ProducerPayoutModuleService
