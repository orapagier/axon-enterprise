import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import HubModule from "../modules/hub"

export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  HubModule.linkable.hub
)