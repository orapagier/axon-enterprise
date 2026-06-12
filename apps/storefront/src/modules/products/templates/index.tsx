import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
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

const BreadcrumbSeparator = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 text-grey-30"
    aria-hidden
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

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
        className="content-container py-6 small:py-12"
        data-testid="product-container"
      >
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-x-1.5 mb-5 small:mb-8 text-body-sm"
        >
          <LocalizedClientLink
            href="/store"
            className="text-grey-50 hover:text-brand-green-700 transition-colors font-medium"
          >
            Shop
          </LocalizedClientLink>
          {product.collection && (
            <>
              <BreadcrumbSeparator />
              <LocalizedClientLink
                href={`/collections/${product.collection.handle}`}
                className="text-grey-50 hover:text-brand-green-700 transition-colors font-medium"
              >
                {product.collection.title}
              </LocalizedClientLink>
            </>
          )}
          <BreadcrumbSeparator />
          <span className="text-grey-90 font-semibold truncate max-w-[200px] small:max-w-xs">
            {product.title}
          </span>
        </nav>

        <div className="flex flex-col small:flex-row gap-6 small:gap-12">
          {/* Left: Image gallery */}
          <div className="w-full small:w-[55%]">
            <ImageGallery images={images} />
          </div>

          {/* Right: Product info + actions */}
          <div className="w-full small:w-[45%] small:max-w-[480px]">
            <div className="small:sticky small:top-26">
              <div className="bg-white rounded-3xl border border-grey-10/60 shadow-soft px-5 py-6 small:px-8 small:py-8 flex flex-col gap-y-6">
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

                <ProductTabs product={product} hub={hub} />
              </div>
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
