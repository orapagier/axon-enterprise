import { MedusaService } from "@medusajs/framework/utils"
import ProductListing from "./models/product-listing"

class ListingModuleService extends MedusaService({
  ProductListing,
}) {}

export default ListingModuleService