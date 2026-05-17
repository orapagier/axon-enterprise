import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className="content-container section-padding" data-testid="category-container">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="text-display font-heading text-grey-90" data-testid="store-page-title">
          Fresh Produce
        </h1>
        <p className="text-body text-grey-50 mt-2">
          Handpicked from Mindanao&apos;s finest farms
        </p>
      </div>

      <div className="flex flex-col small:flex-row small:items-start gap-8">
        <RefinementList sortBy={sort} />
        <div className="w-full">
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
