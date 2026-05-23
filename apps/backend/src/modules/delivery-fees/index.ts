import DeliveryFeesModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const DELIVERY_FEES_MODULE = "delivery_fees"

export default Module(DELIVERY_FEES_MODULE, {
  service: DeliveryFeesModuleService,
})
