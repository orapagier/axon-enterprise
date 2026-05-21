import PickupModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PICKUP_MODULE = "pickup"

export default Module(PICKUP_MODULE, {
  service: PickupModuleService,
})