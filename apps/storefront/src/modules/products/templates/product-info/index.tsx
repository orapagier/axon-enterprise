import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

const ProductInfo = ({ product }: ProductInfoProps) => {
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

        {/* Origin badge */}
        {product.origin_country && (
          <div className="flex items-center gap-x-2">
            <div className="px-3 py-1.5 bg-brand-green-50 rounded-lg">
              <span className="text-caption font-medium text-brand-green-700">
                Origin: {product.origin_country}
              </span>
            </div>
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
