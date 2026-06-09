import RiderModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const RIDER_MODULE = "rider"

export default Module(RIDER_MODULE, {
  service: RiderModuleService,
})
