import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
  const meta = (product.metadata ?? {}) as Record<string, unknown>
  const sellingMode =
    typeof meta.selling_mode === "string" ? meta.selling_mode : null
  const isDirect = sellingMode === "direct_to_consumer"
  const sellerName =
    typeof meta.seller_name === "string" && meta.seller_name.trim()
      ? meta.seller_name
      : null
  const hubName =
    typeof meta.hub_name === "string" && meta.hub_name.trim()
      ? meta.hub_name
      : null
  const category = typeof meta.category === "string" ? meta.category : null

  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4">
        {/* Collection / category eyebrow */}
        {(product.collection || category) && (
          <div className="flex items-center gap-x-2">
            {product.collection ? (
              <LocalizedClientLink
                href={`/collections/${product.collection.handle}`}
                className="text-caption font-bold text-brand-green-600 uppercase tracking-[0.14em] hover:text-brand-green-700 transition-colors"
              >
                {product.collection.title}
              </LocalizedClientLink>
            ) : (
              <span className="text-caption font-bold text-brand-green-600 uppercase tracking-[0.14em]">
                {category}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h1
          className="text-h1 small:text-display font-heading text-grey-90 leading-tight tracking-[-0.015em]"
          data-testid="product-title"
        >
          {product.title}
        </h1>

        {/* Origin + seller badges */}
        {(product.origin_country || sellingMode) && (
          <div className="flex flex-wrap items-center gap-2">
            {product.origin_country && (
              <span className="inline-flex items-center gap-x-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-brand-green-50 border border-brand-green-100 text-caption font-semibold text-brand-green-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {product.origin_country}
              </span>
            )}
            {sellingMode &&
              (isDirect ? (
                <span className="inline-flex items-center gap-x-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-caption font-semibold text-blue-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Sold by {sellerName ?? "the producer"}
                  <span className="text-blue-400">·</span>
                  Producer Direct
                </span>
              ) : (
                <span className="inline-flex items-center gap-x-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-brand-green-700 text-caption font-semibold text-white shadow-soft">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  {hubName ? `${hubName} Hub` : "FreshHub"}
                  <span className="text-white/60">·</span>
                  Verified
                </span>
              ))}
          </div>
        )}

        {/* Producer-direct disclaimer — the hub doesn't handle these goods */}
        {isDirect && (
          <div className="flex items-start gap-x-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-amber-700"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-caption text-amber-800 leading-relaxed">
              This item is sold directly by the producer. Product freshness and
              quality are the producer&apos;s responsibility — the hub is only
              responsible for products sold to and posted by FreshHub.
            </p>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <p
            className="text-body text-grey-60 whitespace-pre-line leading-relaxed"
            data-testid="product-description"
          >
            {product.description}
          </p>
        )}
      </div>
    </div>
  )
}

export default ProductInfo
