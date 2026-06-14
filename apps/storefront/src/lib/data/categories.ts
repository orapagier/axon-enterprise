import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listCategories = async (query?: Record<string, unknown>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children, *products, *parent_category, *parent_category.parent_category",
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

/**
 * Always-fresh category list for the storefront filter sidebar. Unlike
 * `listCategories` (tag-cached per session), this is fetched uncached so the
 * sidebar reflects admin add/remove immediately — keeping the storefront and
 * the backend DB in lockstep. The store API already returns only active,
 * non-internal (public) categories.
 */
export const listFilterCategories = async (): Promise<
  { label: string; value: string }[]
> => {
  const product_categories = await sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields: "id,name,handle,rank,parent_category_id",
          limit: 100,
        },
        cache: "no-store",
      }
    )
    .then(({ product_categories }) => product_categories ?? [])

  return product_categories
    .slice()
    .sort(
      (a, b) =>
        (a.rank ?? 0) - (b.rank ?? 0) ||
        (a.name ?? "").localeCompare(b.name ?? "")
    )
    .map((c) => ({ label: c.name, value: c.handle }))
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children, *products",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories[0])
}
