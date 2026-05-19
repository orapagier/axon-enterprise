import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { getDeliveryHub } from "@lib/util/delivery-hub"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate = async ({
  product,
  region,
  countryCode,
  images,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const hub = await getDeliveryHub()

  return (
    <>
      <div
        className="content-container py-10 small:py-16"
        data-testid="product-container"
      >
        <div className="flex flex-col small:flex-row gap-8 small:gap-16">
          {/* Left: Image gallery */}
          <div className="w-full small:w-[55%]">
            <ImageGallery images={images} />
          </div>

          {/* Right: Product info + actions */}
          <div className="w-full small:w-[45%] small:max-w-[480px]">
            <div className="small:sticky small:top-26 flex flex-col gap-y-8">
              <ProductInfo product={product} />

              <ProductOnboardingCta />
              <Suspense
                fallback={
                  <ProductActions
                    disabled={true}
                    product={product}
                    region={region}
                  />
                }
              >
                <ProductActionsWrapper id={product.id} region={region} />
              </Suspense>

              <ProductTabs product={product} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white">
        <div
          className="content-container section-padding"
          data-testid="related-products-container"
        >
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProducts product={product} countryCode={countryCode} />
          </Suspense>
        </div>
      </div>
    </>
  )
}

export default ProductTemplate
