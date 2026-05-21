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
