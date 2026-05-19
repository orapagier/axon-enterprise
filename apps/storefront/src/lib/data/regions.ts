"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  }

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => regions)
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region)
}

export const getRegion = async (countryCode: string) => {
  const regions = await listRegions()

  if (!regions?.length) {
    return null
  }

  // Build a fresh map every call so newly added regions surface immediately.
  // (The underlying listRegions call is cached by Next.js with tag invalidation,
  // so this is effectively a cache lookup — no extra network cost.)
  const regionMap = new Map<string, HttpTypes.StoreRegion>()
  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      regionMap.set((c?.iso_2 ?? "").toLowerCase(), region)
    })
  })

  const lookup = (countryCode ?? "").toLowerCase()
  return regionMap.get(lookup) ?? regionMap.values().next().value ?? null
}
