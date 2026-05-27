import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getDeliveryHub } from "@lib/util/delivery-hub"

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const hub = await getDeliveryHub()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <div className="content-container section-padding" data-testid="category-container">
      {/* Page header */}
      <div className="mb-10">
        {parents.length > 0 && (
          <div className="flex items-center gap-2 text-body-sm text-grey-40 mb-3">
            {parents.map((parent) => (
              <span key={parent.id}>
                <LocalizedClientLink
                  className="hover:text-grey-80 transition-colors"
                  href={`/categories/${parent.handle}`}
                  data-testid="sort-by-link"
                >
                  {parent.name}
                </LocalizedClientLink>
                <span className="ml-2">/</span>
              </span>
            ))}
          </div>
        )}
        <h1
          className="text-display font-heading text-grey-90"
          data-testid="category-page-title"
        >
          {category.name}
        </h1>
        {category.description && (
          <p className="text-body text-grey-50 mt-2">{category.description}</p>
        )}
        {category.category_children && category.category_children.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {category.category_children.map((c) => (
              <InteractiveLink key={c.id} href={`/categories/${c.handle}`}>
                {c.name}
              </InteractiveLink>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col small:flex-row small:items-start gap-8">
        <RefinementList hub={hub} />
        <div className="w-full">
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={category.products?.length ?? 8}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              categoryId={category.id}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
