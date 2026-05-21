import HubModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const HUB_MODULE = "hub"

export default Module(HUB_MODULE, {
  service: HubModuleService,
})