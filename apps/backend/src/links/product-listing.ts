import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ListingModule from "../modules/listing"

export default defineLink(
  ProductModule.linkable.product,
  ListingModule.linkable.productListing
)