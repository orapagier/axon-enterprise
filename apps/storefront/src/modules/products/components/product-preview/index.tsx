import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductQuickAdd from "../product-quick-add"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import ListingBadge from "./listing-badge"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  const isOnSale = cheapestPrice?.price_type === "sale"
  // Stable "fresh today" badge derived from product id so SSR matches client.
  const isFreshToday = product.id
    ? product.id.charCodeAt(product.id.length - 1) % 3 === 0
    : false

  // Listing type from product metadata (set at submission time)
  const meta = (product.metadata ?? {}) as Record<string, unknown>
  const listingType = typeof meta.selling_mode === "string" ? meta.selling_mode : null

  return (
    <div
      className="relative bg-white rounded-2xl shadow-medium hover:shadow-xl ring-1 ring-grey-90/5 hover:ring-brand-green-300/40 transition-all duration-300 ease-out overflow-hidden hover:-translate-y-1 group flex flex-col h-full"
      data-testid="product-wrapper"
    >
      {/* Image area */}
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="block"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-cream-50 via-white to-brand-cream-50 aspect-square">
          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
            />
          </div>

          {/* Top-left badge */}
          {(isOnSale || isFreshToday) && (
            <div className="absolute top-3 left-3 z-10">
              {isOnSale ? (
                <span className="inline-flex items-center px-2.5 py-1 bg-grey-90 text-white text-[10px] font-bold uppercase tracking-[0.14em] rounded-md shadow-medium">
                  Sale
                </span>
              ) : (
                <span className="inline-flex items-center gap-x-1.5 px-2.5 py-1 bg-white text-brand-green-700 text-[10px] font-bold uppercase tracking-[0.14em] rounded-md shadow-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green-500 animate-pulse" />
                  Fresh
                </span>
              )}
            </div>
          )}

          {/* Hover gradient */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-grey-90/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Quick view chip on hover */}
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-x-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-white text-grey-90 text-caption font-semibold shadow-large opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Quick view
          </span>
        </div>
      </LocalizedClientLink>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 small:p-5">
        {/* Origin pill + listing badge + rating */}
        <div className="flex items-center justify-between gap-x-2 mb-2.5">
          <div className="flex items-center gap-x-1.5 min-w-0">
            <span className="inline-flex items-center gap-x-1 px-2 py-0.5 rounded-md bg-brand-green-50 text-brand-green-700 border border-brand-green-100 min-w-0">
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="text-[9px] uppercase tracking-[0.12em] font-bold truncate">
                {product.origin_country || "Mindanao"}
              </span>
            </span>
            <ListingBadge listingType={listingType} />
          </div>
          <span className="inline-flex items-center gap-x-1 flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#eab308" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[11px] font-bold text-grey-80 tabular-nums">
              4.8
            </span>
          </span>
        </div>

        {/* Title */}
        <LocalizedClientLink href={`/products/${product.handle}`}>
          <h3
            className="font-heading font-bold text-body small:text-body-lg text-grey-90 leading-[1.2] line-clamp-2 hover:text-brand-green-700 transition-colors duration-200 min-h-[2.4em] tracking-[-0.008em]"
            data-testid="product-title"
          >
            {product.title}
          </h3>
        </LocalizedClientLink>

        {/* Price + add */}
        <div className="mt-auto pt-3 flex items-end justify-between gap-3 border-t border-grey-10 mt-3">
          <div className="flex flex-col min-w-0">
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
          <ProductQuickAdd product={product} mode="cart" variant="icon" />
        </div>
      </div>
    </div>
  )
}