import { HttpTypes } from "@medusajs/types"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { sortProducts } from "@lib/util/sort-products"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12
const FETCH_LIMIT = 100

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  q?: string
}

const productMatchesCategory = (
  product: HttpTypes.StoreProduct,
  category: string
) => {
  const target = category.toLowerCase().replace(/-/g, " ")
  const hay: string[] = []
  product.categories?.forEach((c) => {
    if (c.handle) hay.push(c.handle.toLowerCase())
    if (c.name) hay.push(c.name.toLowerCase())
  })
  product.tags?.forEach((t) => {
    if (t.value) hay.push(t.value.toLowerCase())
  })
  if (product.type?.value) hay.push(product.type.value.toLowerCase())
  if (product.collection?.handle)
    hay.push(product.collection.handle.toLowerCase())
  if (product.collection?.title)
    hay.push(product.collection.title.toLowerCase())
  const meta = product.metadata as Record<string, unknown> | null | undefined
  if (typeof meta?.category === "string")
    hay.push(meta.category.toLowerCase().replace(/&/g, " ").replace(/\s+/g, " "))
  return hay.some(
    (entry) => entry === target || entry.includes(target) || target.includes(entry)
  )
}

const productMatchesOrigin = (
  product: HttpTypes.StoreProduct,
  origins: string[]
) => {
  const country = product.origin_country?.toLowerCase()
  if (!country) return false
  return origins.some((o) => {
    const value = o.toLowerCase()
    return country === value || country.includes(value) || value.includes(country)
  })
}

const productMinPrice = (product: HttpTypes.StoreProduct): number | null => {
  const prices = (product.variants ?? [])
    .map((v) => v?.calculated_price?.calculated_amount ?? null)
    .filter((p): p is number => typeof p === "number")
  if (!prices.length) return null
  return Math.min(...prices)
}

export default async function PaginatedProducts({
  sortBy,
  page,
  q,
  category,
  origin,
  min,
  max,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
}: {
  sortBy?: SortOptions
  page: number
  q?: string
  category?: string
  origin?: string
  min?: string
  max?: string
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: FETCH_LIMIT,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  const trimmedQuery = q?.trim()
  if (trimmedQuery) {
    queryParams["q"] = trimmedQuery
  }

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products },
  } = await listProducts({
    pageParam: 1,
    queryParams,
    countryCode,
  })

  // Client-side filters (category / origin / price range)
  const activeCategory = category && category !== "all" ? category : null
  const activeOrigins = origin
    ? origin.split(",").map((o) => o.trim()).filter(Boolean)
    : []
  const minPrice = min ? Number(min) : null
  const maxPrice = max ? Number(max) : null

  let filtered = products
  if (activeCategory) {
    filtered = filtered.filter((p) =>
      productMatchesCategory(p, activeCategory)
    )
  }
  if (activeOrigins.length > 0) {
    filtered = filtered.filter((p) => productMatchesOrigin(p, activeOrigins))
  }
  if (
    (minPrice !== null && !Number.isNaN(minPrice)) ||
    (maxPrice !== null && !Number.isNaN(maxPrice))
  ) {
    filtered = filtered.filter((p) => {
      const price = productMinPrice(p)
      if (price === null) return false
      if (minPrice !== null && !Number.isNaN(minPrice) && price < minPrice)
        return false
      if (maxPrice !== null && !Number.isNaN(maxPrice) && price > maxPrice)
        return false
      return true
    })
  }

  const sorted = sortProducts(filtered, sortBy ?? "created_at")

  const count = sorted.length
  const totalPages = Math.max(1, Math.ceil(count / PRODUCT_LIMIT))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const offset = (safePage - 1) * PRODUCT_LIMIT
  const paginated = sorted.slice(offset, offset + PRODUCT_LIMIT)
  const startIndex = count === 0 ? 0 : offset + 1
  const endIndex = Math.min(offset + PRODUCT_LIMIT, count)

  const sortLabel: Record<SortOptions, string> = {
    created_at: "Latest Arrivals",
    price_asc: "Price: Low → High",
    price_desc: "Price: High → Low",
  }

  return (
    <>
      {/* Minimal toolbar — search query (if any) on left, sort pill on right */}
      <div className="flex items-center justify-between gap-3 mb-3 min-h-[36px]">
        <div className="text-body-sm text-grey-50">
          {trimmedQuery ? (
            <>
              Results for{" "}
              <span className="font-heading italic text-grey-90">
                &ldquo;{trimmedQuery}&rdquo;
              </span>
            </>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-grey-40">
              The selection
            </span>
          )}
        </div>

        <span className="inline-flex items-center gap-x-1.5 px-3.5 py-2 rounded-full bg-white border border-grey-20 text-grey-90 font-semibold text-body-sm shadow-soft">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green-600">
            <path d="M3 6h18M7 12h10m-7 6h4" />
          </svg>
          {sortLabel[(sortBy as SortOptions) || "created_at"]}
        </span>
      </div>

      {/* Hairline rule */}
      <div className="h-px bg-grey-10 mb-4" />

      {paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-3xl border border-grey-10/60 shadow-soft text-center">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-brand-green-50 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center shadow-soft">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-green-600">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
          <h3 className="font-heading text-h1 text-grey-90 mb-3">
            {trimmedQuery
              ? `No matches for "${trimmedQuery}"`
              : "Nothing in season yet"}
          </h3>
          <p className="text-body text-grey-50 max-w-sm leading-relaxed">
            {trimmedQuery
              ? "Try a different keyword or clear the search to browse everything we have in stock."
              : "Try adjusting your filters or check back soon — fresh stock arrives daily from our partner farms."}
          </p>
        </div>
      ) : (
        <ul
          className="grid grid-cols-2 xsmall:grid-cols-3 w-full small:grid-cols-4 large:grid-cols-5 gap-3 small:gap-4"
          data-testid="products-list"
        >
          {paginated.map((p) => {
            return (
              <li key={p.id}>
                <ProductPreview product={p} region={region} />
              </li>
            )
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-8 pt-6 border-t border-grey-10">
          <Pagination
            data-testid="product-pagination"
            page={safePage}
            totalPages={totalPages}
          />
        </div>
      )}
    </>
  )
}
