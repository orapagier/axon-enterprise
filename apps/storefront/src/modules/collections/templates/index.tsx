import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { HttpTypes } from "@medusajs/types"
import { getDeliveryHub } from "@lib/util/delivery-hub"
import { listFilterCategories } from "@lib/data/categories"

export default async function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const hub = await getDeliveryHub()
  const categoryFilters = await listFilterCategories()

  return (
    <div className="content-container section-padding">
      {/* Page header */}
      <div className="mb-10">
        <span className="text-caption font-semibold text-brand-green-600 uppercase tracking-wider">
          Collection
        </span>
        <h1 className="text-display font-heading text-grey-90 mt-2">
          {collection.title}
        </h1>
      </div>

      <div className="flex flex-col small:flex-row small:items-start gap-5 small:gap-8">
        <RefinementList />
        <div className="w-full">
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={collection.products?.length}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              collectionId={collection.id}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
