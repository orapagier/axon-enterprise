"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { cookies } from "next/headers"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

const COOKIE_NAME = "fh_hub"
const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Persist the visitor's chosen hub in a cookie. Also calls the backend to
 * link the customer ↔ hub if the visitor is logged in — that way the choice
 * survives sign-out / sign-in across devices.
 */
export async function setHubCookie(slug: string): Promise<void> {
  if (!slug) return
  const jar = await cookies()
  jar.set(COOKIE_NAME, slug, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  const headers = await getAuthHeaders()
  if (Object.keys(headers).length > 0) {
    try {
      await sdk.client.fetch("/store/customers/me/hub", {
        method: "POST",
        body: { slug },
        headers,
      })
    } catch {
      // Best-effort — cookie alone is enough for the storefront to function.
    }
  }

  revalidateTag("hubs")
  revalidatePath("/", "layout")
}

export async function getHubCookie(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE_NAME)?.value ?? null
}

export async function clearHubCookie(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
  revalidatePath("/", "layout")
}

/**
 * Ensure the authenticated customer has a DB link to the hub stored in their
 * `fh_hub` cookie. Safe to call repeatedly — POSTs only when the customer
 * has no link yet. Returns the slug it linked (or already linked), or null
 * when there's nothing to do (anonymous visitor, no cookie, or sync failed).
 *
 * Use this after sign-in / sign-up flows, and as a recovery path when a
 * "must be assigned to a hub" error hits in the UI: visitors often pick
 * their hub anonymously before signing up, so the cookie outlives the
 * missing DB link.
 */
export async function syncCustomerHubFromCookie(): Promise<{
  ok: boolean
  slug: string | null
}> {
  const headers = await getAuthHeaders()
  if (!("authorization" in headers)) {
    return { ok: false, slug: null }
  }

  const jar = await cookies()
  const slug = jar.get(COOKIE_NAME)?.value ?? null
  if (!slug) return { ok: false, slug: null }

  try {
    const current = await sdk.client.fetch<{
      hub: { id: string; slug: string } | null
    }>("/store/customers/me/hub", {
      method: "GET",
      headers,
    })
    if (current?.hub?.id) {
      return { ok: true, slug: current.hub.slug }
    }

    await sdk.client.fetch("/store/customers/me/hub", {
      method: "POST",
      body: { slug },
      headers,
    })
    return { ok: true, slug }
  } catch {
    return { ok: false, slug: null }
  }
}
