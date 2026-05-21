import "server-only"
import { sdk } from "@lib/config"

export type Hub = {
  id: string
  slug: string
  name: string
  city: string
  province: string
  country: string
  active: boolean
  timezone: string
  dispatch_cutoff: string
  dispatch_time: string
  areas: {
    id: string
    name: string
    postal_codes: string[] | null
    barangays: string[] | null
    pickup_day_of_week: number[] | null
  }[]
}

export async function listHubs(): Promise<Hub[]> {
  try {
    const { hubs } = await sdk.client.fetch<{ hubs: Hub[] }>("/store/hubs", {
      method: "GET",
      next: { revalidate: 3600, tags: ["hubs"] },
    })
    return hubs ?? []
  } catch {
    return []
  }
}

export async function getHub(slug: string): Promise<Hub | null> {
  try {
    const { hub } = await sdk.client.fetch<{ hub: Hub }>(
      `/store/hubs/${slug}`,
      {
        method: "GET",
        next: { revalidate: 3600, tags: [`hub-${slug}`] },
      }
    )
    return hub ?? null
  } catch {
    return null
  }
}

/**
 * Returns the product IDs linked to a hub. The storefront uses these to
 * restrict the product grid to a single hub's catalog.
 */
export async function getHubProductIds(slug: string): Promise<string[]> {
  try {
    const { product_ids } = await sdk.client.fetch<{ product_ids: string[] }>(
      `/store/hubs/${slug}/products`,
      {
        method: "GET",
        next: { revalidate: 300, tags: [`hub-${slug}-products`] },
      }
    )
    return product_ids ?? []
  } catch {
    return []
  }
}
