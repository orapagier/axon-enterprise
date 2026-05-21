import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import HubModule from "../modules/hub"

export default defineLink(
  ProductModule.linkable.product,
  HubModule.linkable.hub
)