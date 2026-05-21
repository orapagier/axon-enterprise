import ListingModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const LISTING_MODULE = "listing"

export default Module(LISTING_MODULE, {
  service: ListingModuleService,
})