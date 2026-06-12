import { getProductPrice } from "@lib/util/get-product-price"
import { getProductUnit, getUnitLabel } from "@lib/util/unit"
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

  // Listing type from product metadata (set at submission time)
  const meta = (product.metadata ?? {}) as Record<string, unknown>
  const listingType = typeof meta.selling_mode === "string" ? meta.selling_mode : null
  const unit = getProductUnit(product)

  // Stock indicator — single-variant catalog, real numbers only. Variants
  // without managed inventory (hub listings pre-restock) show nothing.
  const variant = product.variants?.[0]
  const tracksStock = !!variant?.manage_inventory && !variant?.allow_backorder
  const stockQty = tracksStock
    ? Math.max(0, variant?.inventory_quantity ?? 0)
    : null
  const soldOut = tracksStock && stockQty === 0
  const lowStock = tracksStock && stockQty !== null && stockQty > 0 && stockQty <= 5

  return (
    <div
      className="relative bg-white rounded-xl shadow-medium hover:shadow-xl ring-1 ring-grey-90/5 hover:ring-brand-green-300/40 transition-all duration-300 ease-out overflow-hidden hover:-translate-y-0.5 group flex flex-col h-full"
      data-testid="product-wrapper"
    >
      {/* Image area */}
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="block"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-brand-cream-50 via-white to-brand-cream-50 aspect-[4/3]">
          <div
            className={`absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04] ${
              soldOut ? "grayscale opacity-70" : ""
            }`}
          >
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
            />
          </div>

          {/* Top-left badges — stacked so they never fight the info row for space */}
          <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-y-1">
            {isOnSale && (
              <span className="inline-flex items-center px-2 py-0.5 bg-grey-90 text-white text-[9px] font-bold uppercase tracking-[0.14em] rounded-md shadow-medium">
                Sale
              </span>
            )}
            <ListingBadge listingType={listingType} />
          </div>

          {/* Sold-out veil */}
          {soldOut && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/45">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-grey-90/90 text-white text-[10px] font-bold uppercase tracking-[0.14em] shadow-large">
                Out of stock
              </span>
            </div>
          )}

          {/* Hover gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-grey-90/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Quick view chip on hover */}
          {!soldOut && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-x-1 pl-2 pr-2.5 py-1 rounded-full bg-white text-grey-90 text-[10px] font-semibold shadow-large opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none whitespace-nowrap">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Quick view
            </span>
          )}
        </div>
      </LocalizedClientLink>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3 small:p-3.5">
        {/* Origin + stock */}
        <div className="flex items-center justify-between gap-x-2 mb-2">
          <span className="inline-flex items-center gap-x-1 px-1.5 py-0.5 rounded bg-brand-green-50 text-brand-green-700 border border-brand-green-100 min-w-0">
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
            <span className="text-[9px] uppercase tracking-[0.1em] font-bold truncate">
              {product.origin_country || "Mindanao"}
            </span>
          </span>

          {tracksStock && stockQty !== null && (
            <span
              className={`shrink-0 inline-flex items-center gap-x-1 text-[10px] font-semibold tabular-nums ${
                soldOut
                  ? "text-red-600"
                  : lowStock
                    ? "text-amber-600"
                    : "text-grey-50"
              }`}
              data-testid="stock-indicator"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  soldOut
                    ? "bg-red-500"
                    : lowStock
                      ? "bg-amber-500"
                      : "bg-brand-green-500"
                }`}
              />
              {soldOut
                ? "Sold out"
                : `${stockQty} ${getUnitLabel(unit, stockQty)} left`}
            </span>
          )}
        </div>

        {/* Title */}
        <LocalizedClientLink href={`/products/${product.handle}`}>
          <h3
            className="font-heading font-bold text-body-sm text-grey-90 leading-snug line-clamp-2 hover:text-brand-green-700 transition-colors duration-200 min-h-[2.6em] tracking-[-0.008em]"
            data-testid="product-title"
          >
            {product.title}
          </h3>
        </LocalizedClientLink>

        {/* Price + add */}
        <div className="mt-auto pt-2.5 flex items-end justify-between gap-2 border-t border-grey-10">
          <div className="flex flex-col min-w-0 flex-1">
            {cheapestPrice && (
              <PreviewPrice price={cheapestPrice} unit={unit} />
            )}
          </div>
          {!soldOut && (
            <ProductQuickAdd product={product} mode="cart" variant="icon" />
          )}
        </div>
      </div>
    </div>
  )
}
