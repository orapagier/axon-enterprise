import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | Record<string, never>> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  // "lax", not "strict": the Google OAuth callback redirects here from
  // accounts.google.com, and browsers drop Strict cookies on navigations
  // that originate cross-site — the user would land on /account logged out.
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  // "lax" so the cart survives the OAuth redirect (transferCart runs
  // during the cross-site callback request and needs to read this).
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}

// ── Checkout cart ──────────────────────────────────────────────────────────
// The shopping cart (`_medusa_cart_id`) always holds every item the customer
// added. When they pick a subset to check out, we clone the selected items into
// a separate "checkout cart" and track its id here. This keeps the shopping
// cart untouched until the order succeeds, so unselected / out-of-stock items
// are never mutated.

export const getCheckoutCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_mfh_checkout_cart_id")?.value
}

export const setCheckoutCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_mfh_checkout_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCheckoutCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_mfh_checkout_cart_id", "", {
    maxAge: -1,
  })
}
