import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

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

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group">
      <div
        className="bg-white rounded-2xl shadow-soft hover:shadow-medium transition-all duration-300 ease-out overflow-hidden"
        data-testid="product-wrapper"
      >
        {/* Image */}
        <div className="relative">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
          />
          {/* Origin badge */}
          {product.origin_country && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-soft">
              <span className="text-caption font-medium text-brand-green-700">
                {product.origin_country}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3
            className="text-body-sm font-medium text-grey-80 line-clamp-2 leading-snug"
            data-testid="product-title"
          >
            {product.title}
          </h3>
          <div className="mt-2 flex items-baseline justify-between gap-x-2">
            <div className="flex items-baseline gap-x-2">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
