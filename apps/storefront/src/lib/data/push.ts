"use server"

import { getAuthHeaders } from "./cookies"

/**
 * Web Push subscription rail. The browser mints the PushSubscription
 * (endpoint + encryption keys) client-side; these server actions persist it
 * against the signed-in customer via the backend's customer-authenticated
 * /store/push API. The actual push send happens on the backend (see
 * apps/backend/src/lib/push.ts) for order in-transit + delivered events.
 */

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "http://localhost:9000"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type PushSubscriptionPayload = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export type PushActionState = { ok: boolean; error: string | null }

async function pushFetch(
  path: string,
  init: RequestInit & { headers?: Record<string, string> }
): Promise<PushActionState> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { ok: false, error: "Please sign in first." }
  }
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...authHeaders,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    })
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, error: json.error ?? `Request failed (${res.status})` }
    }
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function savePushSubscription(
  subscription: PushSubscriptionPayload,
  userAgent?: string | null
): Promise<PushActionState> {
  return pushFetch("/store/push/subscribe", {
    method: "POST",
    body: JSON.stringify({ subscription, user_agent: userAgent ?? null }),
  })
}

export async function removePushSubscription(
  endpoint: string
): Promise<PushActionState> {
  return pushFetch("/store/push/subscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  })
}
