import { retrieveCustomer } from "@lib/data/customer"
import { listProducts } from "@lib/data/products"
import { isMember } from "@lib/util/membership"
import { getTraderPricing } from "@lib/util/trader"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const [product, customer] = await Promise.all([
    listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]),
    retrieveCustomer().catch(() => null),
  ])

  if (!product) {
    return null
  }

  const trader = getTraderPricing(customer)

  return (
    <ProductActions
      product={product}
      region={region}
      isMember={isMember(customer)}
      traderDiscountPercent={trader.discountPercent}
    />
  )
}
