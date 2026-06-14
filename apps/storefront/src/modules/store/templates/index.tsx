import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getDeliveryHub } from "@lib/util/delivery-hub"
import { getHubCookie } from "@modules/hub/actions/set-hub"
import { getHubProductIds } from "@modules/hub/data/hubs"
import { listFilterCategories } from "@lib/data/categories"

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
  const hubSlug = await getHubCookie()
  // Restrict the public storefront to products linked to the visitor's hub.
  // When no hub cookie is set, fall through with `undefined` so the store
  // still renders during the picker's first paint.
  const hubProductIds = hubSlug ? await getHubProductIds(hubSlug) : null

  // Real categories straight from the backend DB so the sidebar can never
  // drift from what admin manages under /app/categories.
  const categoryFilters = await listFilterCategories()

  return (
    <div data-testid="category-container" className="bg-grey-5 min-h-screen">
      <div className="content-container pt-3 small:pt-5 pb-12 small:pb-20 relative">
        <div className="flex flex-col small:flex-row small:items-start gap-4 small:gap-6">
          <RefinementList categories={categoryFilters} />
          <div className="w-full min-w-0">
            {hubProductIds && hubProductIds.length === 0 ? (
              <div className="bg-white rounded-3xl border border-grey-10/60 shadow-soft p-10 text-center">
                <h3 className="font-heading text-h3 text-grey-90 mb-2">
                  No products in this hub yet
                </h3>
                <p className="text-body-sm text-grey-50 max-w-sm mx-auto">
                  Producers in your hub haven&apos;t listed anything yet.
                  Switch hubs from the top bar to browse another catalog.
                </p>
              </div>
            ) : (
              <Suspense
                key={`${sort}-${pageNumber}-${q ?? ""}-${category ?? ""}-${origin ?? ""}-${min ?? ""}-${max ?? ""}-${hubSlug ?? ""}`}
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
                  productsIds={hubProductIds ?? undefined}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
