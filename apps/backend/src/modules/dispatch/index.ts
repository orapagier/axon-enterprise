import DispatchModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const DISPATCH_MODULE = "dispatch"

export default Module(DISPATCH_MODULE, {
  service: DispatchModuleService,
})
