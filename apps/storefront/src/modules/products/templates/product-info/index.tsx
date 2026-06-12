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

  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4">
        {/* Collection breadcrumb */}
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-caption font-semibold text-brand-green-600 uppercase tracking-wider hover:text-brand-green-700 transition-colors"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}

        {/* Title */}
        <h1
          className="text-h1 small:text-display font-heading text-grey-90"
          data-testid="product-title"
        >
          {product.title}
        </h1>

        {/* Origin + seller badges */}
        {(product.origin_country || sellingMode) && (
          <div className="flex flex-wrap items-center gap-2">
            {product.origin_country && (
              <div className="px-3 py-1.5 bg-brand-green-50 rounded-lg">
                <span className="text-caption font-medium text-brand-green-700">
                  Origin: {product.origin_country}
                </span>
              </div>
            )}
            {sellingMode &&
              (isDirect ? (
                <div className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-caption font-medium text-blue-700">
                    Sold by {sellerName ?? "the producer"} · Producer Direct
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-purple-50 rounded-lg border border-purple-100">
                  <span className="text-caption font-medium text-purple-700">
                    Sold by {hubName ? `${hubName} Hub` : "FreshHub"} · Verified
                  </span>
                </div>
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
            className="text-body text-grey-50 whitespace-pre-line leading-relaxed"
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
