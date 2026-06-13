import ProducerPayoutModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PRODUCER_PAYOUT_MODULE = "producer_payout"

export default Module(PRODUCER_PAYOUT_MODULE, {
  service: ProducerPayoutModuleService,
})
