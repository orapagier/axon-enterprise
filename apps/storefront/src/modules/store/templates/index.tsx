import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getDeliveryHub } from "@lib/util/delivery-hub"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  q,
  category,
  origin,
  min,
  max,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  q?: string
  category?: string
  origin?: string
  min?: string
  max?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const hub = await getDeliveryHub()

  return (
    <div data-testid="category-container" className="bg-grey-5 min-h-screen">
      {/* Editorial header */}
      <header className="relative bg-white border-b border-grey-10">
        {/* Hairline gold accent on top */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-gold-400/40 to-transparent" />

        <div className="content-container pt-10 pb-8 small:pt-14 small:pb-12 text-center">
          <h1 className="font-heading font-bold text-[34px] leading-[1.04] xsmall:text-[44px] small:text-[60px] small:leading-[1] text-grey-90 tracking-[-0.028em]">
            The <span className="italic text-brand-green-700">market</span>,
            in every basket
            <span className="text-brand-gold-500">.</span>
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-body-sm text-grey-50 leading-relaxed">
            In-season picks sourced direct from Mindanao&apos;s farms, curated
            for your weekly table.
          </p>
        </div>

        {/* Bottom hairline */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-grey-20 to-transparent" />
      </header>

      {/* Main grid */}
      <div className="content-container pt-8 small:pt-10 pb-20 relative">
        <div className="flex flex-col small:flex-row small:items-start gap-6 small:gap-8">
          <RefinementList sortBy={sort} hub={hub} />
          <div className="w-full min-w-0">
            <Suspense
              key={`${sort}-${pageNumber}-${q ?? ""}-${category ?? ""}-${origin ?? ""}-${min ?? ""}-${max ?? ""}`}
              fallback={<SkeletonProductGrid />}
            >
              <PaginatedProducts
                sortBy={sort}
                page={pageNumber}
                q={q}
                category={category}
                origin={origin}
                min={min}
                max={max}
                countryCode={countryCode}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
