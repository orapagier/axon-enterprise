import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

const MAX_PRODUCTS = 4

export default async function ProductRail({
  collection,
  region,
}: {
  collection: HttpTypes.StoreCollection
  region: HttpTypes.StoreRegion
}) {
  const {
    response: { products: pricedProducts },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
    },
  })

  if (!pricedProducts) {
    return null
  }

  const displayed = pricedProducts.slice(0, MAX_PRODUCTS)

  return (
    <section className="section-viewport bg-white w-full">
      <div className="content-container w-full">
        <div className="flex flex-col xsmall:flex-row xsmall:items-end justify-between gap-4 mb-7 small:mb-9">
          <div className="max-w-2xl">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-7 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                {collection.title === "Latest Drops" ? "Today's Edit" : "Collection"}
              </span>
            </div>
            <h2 className="font-heading text-[30px] leading-[1.06] small:text-[44px] small:leading-[1.02] text-grey-90 tracking-[-0.02em]">
              {collection.title}
              <span className="text-brand-green-700 italic">.</span>
            </h2>
          </div>
          <LocalizedClientLink
            href={`/collections/${collection.handle}`}
            className="group inline-flex items-center gap-x-2 px-5 py-3 rounded-full border border-grey-20 text-grey-80 text-body-sm font-medium hover:bg-grey-90 hover:text-white hover:border-grey-90 transition-all w-fit"
          >
            View all {collection.title.toLowerCase()}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:translate-x-0.5 transition-transform"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </LocalizedClientLink>
        </div>
        <ul className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-5 gap-3 small:gap-4">
          {displayed.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} isFeatured />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
