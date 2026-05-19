"use server"

import { listProducts } from "./products"

export type SearchHit = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  origin: string | null
  price: string | null
}

export async function searchProducts(
  query: string,
  countryCode: string
): Promise<SearchHit[]> {
  const trimmed = query?.trim()
  if (!trimmed || trimmed.length < 2) return []
  if (!countryCode) return []

  try {
    const {
      response: { products },
    } = await listProducts({
      countryCode,
      queryParams: {
        q: trimmed,
        limit: 6,
        fields: "*variants.calculated_price,handle,thumbnail,title,origin_country",
      },
    })

    return products.map((p) => {
      const amounts = (p.variants ?? [])
        .map((v) => v?.calculated_price?.calculated_amount ?? null)
        .filter((n): n is number => typeof n === "number")
      const min = amounts.length ? Math.min(...amounts) : null
      return {
        id: p.id,
        title: p.title ?? "",
        handle: p.handle ?? "",
        thumbnail: p.thumbnail ?? null,
        origin: p.origin_country ?? null,
        price:
          min !== null
            ? new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
                maximumFractionDigits: 0,
              }).format(min)
            : null,
      }
    })
  } catch {
    return []
  }
}
