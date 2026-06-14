"use server"

import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type SellerListing = {
  id: string
  title: string
  handle: string | null
  status: "draft" | "published" | "proposed" | "rejected"
  thumbnail: string | null
  description: string | null
  origin_country: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  variants: Array<{
    id: string
    title: string
    sku: string | null
    prices: Array<{ amount: number; currency_code: string }>
  }>
  /** On-hand stock for direct listings; null when inventory isn't tracked. */
  stock_quantity?: number | null
  listing?: {
    id: string
    listing_type: string
    harvest_date: string | null
    status: string
    pickup_window_id: string | null
    created_at: string
    updated_at: string
  } | null
}

const baseHeaders = async () => {
  const auth = await getAuthHeaders()
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
    ...auth,
  } as Record<string, string>
}

export async function listMyListings(): Promise<{
  ok: boolean
  listings: SellerListing[]
  error?: string
  code?: string
}> {
  const next = { ...(await getCacheOptions("seller-listings")) }
  const res = await fetch(`${BACKEND_URL}/store/seller/products`, {
    method: "GET",
    headers: await baseHeaders(),
    next,
    cache: "no-store",
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string
      code?: string
    }
    return { ok: false, listings: [], error: body.error, code: body.code }
  }
  const data = (await res.json()) as { products: SellerListing[] }
  return { ok: true, listings: data.products ?? [] }
}

export async function getMyListing(
  id: string
): Promise<SellerListing | null> {
  const res = await fetch(`${BACKEND_URL}/store/seller/products/${id}`, {
    method: "GET",
    headers: await baseHeaders(),
    cache: "no-store",
  })
  if (!res.ok) return null
  const data = (await res.json()) as { product: SellerListing }
  return data.product ?? null
}

export type ListingFormState = {
  ok: boolean
  error?: string | null
  fieldErrors?: Partial<Record<string, string>> | null
  createdId?: string | null
}

function parseListing(
  formData: FormData,
  // Hub-intake fields (harvest/pickup/kg) are only collected at creation;
  // they're locked after the slot is reserved, so updates skip them.
  // minQuantity: new direct listings need stock to sell (1); edits may zero
  // out to mark a listing sold out (0).
  opts: { requireHubFields: boolean; minQuantity?: number } = {
    requireHubFields: true,
  }
): {
  body: Record<string, unknown>
  fieldErrors: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}
  const get = (k: string) => String(formData.get(k) ?? "").trim()

  const title = get("title")
  const description = get("description")
  const thumbnail = get("thumbnail")
  const origin_country = get("origin_country")
  const category = get("category")
  const unit = get("unit") || "kg"
  const priceRaw = get("price")
  const price = Number(priceRaw)
  const listingType = get("listing_type") || "direct_to_consumer"
  const isSellToHub = listingType === "sell_to_freshhub"
  const harvestDate = get("harvest_date")
  const pickupWindowId = get("pickup_window_id")
  const estimatedKgRaw = get("estimated_kg")
  const estimatedKg = Number(estimatedKgRaw)
  const quantityRaw = get("quantity")
  const quantity = Number(quantityRaw)
  const minQuantity = opts.minQuantity ?? 1

  if (!title || title.length < 2) {
    fieldErrors.title = "Title must be at least 2 characters."
  }
  if (!priceRaw) {
    fieldErrors.price = "Asking price is required."
  } else if (Number.isNaN(price) || price <= 0) {
    fieldErrors.price = "Enter a price greater than zero."
  }
  if (thumbnail && !/^https?:\/\//.test(thumbnail)) {
    fieldErrors.thumbnail = "Thumbnail must be a full https:// URL."
  }
  // Direct listings carry real stock — buyers see what's left and orders
  // deduct it. Hub listings get their stock set by the hub at approval.
  if (!isSellToHub) {
    if (!quantityRaw) {
      fieldErrors.quantity = "Available stock is required."
    } else if (
      Number.isNaN(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < minQuantity
    ) {
      fieldErrors.quantity =
        minQuantity > 0
          ? "Enter a whole number of at least 1."
          : "Enter a whole number (0 or more)."
    }
  }
  // Hub-intake fields only apply when the harvest goes through the hub.
  if (isSellToHub && opts.requireHubFields) {
    if (!harvestDate) {
      fieldErrors.harvest_date = "Harvest date is required."
    }
    if (!pickupWindowId) {
      fieldErrors.pickup_window_id = "Pickup window is required."
    }
    if (!estimatedKgRaw || Number.isNaN(estimatedKg) || estimatedKg <= 0) {
      fieldErrors.estimated_kg = "Estimated weight is required."
    }
  }

  return {
    body: {
      title,
      description: description || undefined,
      thumbnail: thumbnail || undefined,
      origin_country: origin_country || undefined,
      category: category || undefined,
      unit,
      price,
      quantity: !isSellToHub && quantityRaw ? quantity : undefined,
      currency_code: "php",
      listing_type: listingType,
      harvest_date: (isSellToHub && harvestDate) || undefined,
      pickup_window_id: (isSellToHub && pickupWindowId) || undefined,
      estimated_kg: isSellToHub && estimatedKgRaw ? estimatedKg : undefined,
    },
    fieldErrors,
  }
}

export async function createListing(
  _prev: ListingFormState | null,
  formData: FormData
): Promise<ListingFormState> {
  const { body, fieldErrors } = parseListing(formData)
  if (Object.keys(fieldErrors).length) {
    return {
      ok: false,
      fieldErrors,
      error: "Please complete the highlighted fields.",
    }
  }

  const res = await fetch(`${BACKEND_URL}/store/seller/products`, {
    method: "POST",
    headers: await baseHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string
      code?: string
      fieldErrors?: Array<{ field: string; message: string }>
    }
    if (errBody.code === "PROFILE_INCOMPLETE") {
      const countryCode = String(formData.get("countryCode") ?? "ph")
      redirect(`/${countryCode}/onboarding`)
    }
    // Map field errors if present
    const mappedFieldErrors: Record<string, string> = {}
    if (errBody.fieldErrors) {
      for (const fe of errBody.fieldErrors) {
        mappedFieldErrors[fe.field] = fe.message
      }
    }
    return {
      ok: false,
      error:
        errBody.error ?? "We couldn't save your listing. Please try again.",
      fieldErrors: Object.keys(mappedFieldErrors).length ? mappedFieldErrors : fieldErrors,
    }
  }

  const tag = await getCacheTag("seller-listings")
  if (tag) revalidateTag(tag)
  // Bust the shop grid for EVERY shopper, not just this producer's browser.
  // listProducts() force-caches the grid under a global "products" tag (plus a
  // per-browser products-<cache_id> tag). Revalidating only the per-browser tag
  // — as we used to — refreshed the producer's own device but left every other
  // browser (buyers, and the producer's phone) on a stale catalog until its 24h
  // cache id expired. Flush the global tag so the new listing appears for all.
  revalidateTag("products")

  const countryCode = String(formData.get("countryCode") ?? "ph")
  redirect(`/${countryCode}/account/producer`)
}

export async function updateListing(
  _prev: ListingFormState | null,
  formData: FormData
): Promise<ListingFormState> {
  const id = String(formData.get("id") ?? "")
  if (!id) return { ok: false, error: "Missing listing id." }

  const { body, fieldErrors } = parseListing(formData, {
    requireHubFields: false,
    // Editing down to 0 marks the listing sold out without deleting it.
    minQuantity: 0,
  })
  if (Object.keys(fieldErrors).length) {
    return {
      ok: false,
      fieldErrors,
      error: "Please complete the highlighted fields.",
    }
  }

  const res = await fetch(`${BACKEND_URL}/store/seller/products/${id}`, {
    method: "PATCH",
    headers: await baseHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string
      fieldErrors?: Array<{ field: string; message: string }>
    }
    const mappedFieldErrors: Record<string, string> = {}
    if (errBody.fieldErrors) {
      for (const fe of errBody.fieldErrors) {
        mappedFieldErrors[fe.field] = fe.message
      }
    }
    return {
      ok: false,
      error: errBody.error ?? "Couldn't update your listing.",
      fieldErrors: Object.keys(mappedFieldErrors).length ? mappedFieldErrors : fieldErrors,
    }
  }

  const tag = await getCacheTag("seller-listings")
  if (tag) revalidateTag(tag)
  // Stock/price edits change what every buyer sees on the shop grid (cached
  // under the global "products" tag), so flush it for all browsers — not just
  // this producer's device.
  revalidateTag("products")

  const countryCode = String(formData.get("countryCode") ?? "ph")
  redirect(`/${countryCode}/account/producer`)
}

// Photo uploads go through the /api/seller/upload route handler instead of a
// server action — server actions reject large multipart bodies and surface a
// bare "Failed to fetch" in the browser.

export async function deleteListing(id: string, countryCode: string) {
  const res = await fetch(`${BACKEND_URL}/store/seller/products/${id}`, {
    method: "DELETE",
    headers: await baseHeaders(),
    cache: "no-store",
  })
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string }
    return { ok: false, error: errBody.error ?? "Couldn't delete listing." }
  }
  const tag = await getCacheTag("seller-listings")
  if (tag) revalidateTag(tag)
  // Drop the listing from every shopper's grid, not just this browser's.
  revalidateTag("products")
  redirect(`/${countryCode}/account/producer`)
}