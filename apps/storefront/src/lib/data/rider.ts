"use server"

import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheTag } from "./cookies"

/**
 * Rider data rail — how a rider works deliveries from the storefront account
 * area (/account/rider), replacing the retired standalone rider PWA.
 *
 * Flow: the rider signs in as a normal customer (OTP / Google). The server
 * exchanges that customer session for a 30-day rider token at
 * GET /store/riders/session (matched on customer.email ↔ rider.email), then
 * talks to the existing token-guarded /rider/* API with it. The rider token
 * never reaches the browser — every call here runs server-side.
 */

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ??
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "http://localhost:9000"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type RiderProfile = {
  id: string
  full_name: string
  phone: string
  hub_id: string
  status: "pending" | "active" | "inactive" | "suspended"
}

export type RiderSession = {
  rider: RiderProfile | null
  token: string | null
}

export type RiderStopOrder = {
  id: string
  display_id: number | null
  total: number
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    address_1?: string | null
    city?: string | null
    metadata?: Record<string, unknown> | null
  } | null
  metadata?: Record<string, unknown> | null
}

export type RiderStop = {
  dispatch_order_id: string
  order_id: string
  manifest_position: number | null
  batch_status: string | undefined
  delivery_status: string
  order: RiderStopOrder | null
}

export type RiderSummary = {
  outstanding_centavos: number
  limit_centavos: number
  today: {
    delivered_count: number
    collected_centavos: number
  }
}

/** Raw fetch against the Medusa backend with JSON error unwrapping. The
 * custom /rider/* and /store/riders/* routes report failures as `{ error }`,
 * which the js-sdk's FetchError would flatten to a bare status text. */
async function backendFetch<T>(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {}
): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PUBLISHABLE_KEY,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const message =
      (typeof json.error === "string" && json.error) ||
      (typeof json.message === "string" && json.message) ||
      `Request failed (${res.status})`
    throw new Error(message)
  }
  return json as T
}

/** Exchange the customer session for a rider session. Never throws — an
 * anonymous visitor or a non-rider customer simply gets `{ rider: null }`. */
export async function getRiderSession(): Promise<RiderSession> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { rider: null, token: null }
  }
  try {
    const out = await backendFetch<{
      rider: RiderProfile | null
      token?: string | null
    }>("/store/riders/session", { headers: authHeaders })
    return { rider: out.rider ?? null, token: out.token ?? null }
  } catch {
    return { rider: null, token: null }
  }
}

const riderHeaders = (token: string) => ({
  authorization: `Bearer ${token}`,
})

export async function getRiderManifest(token: string): Promise<RiderStop[]> {
  const out = await backendFetch<{ manifest: RiderStop[] }>("/rider/manifest", {
    headers: riderHeaders(token),
  })
  return out.manifest ?? []
}

export async function getRiderSummary(token: string): Promise<RiderSummary> {
  return backendFetch<RiderSummary>("/rider/summary", {
    headers: riderHeaders(token),
  })
}

export type RiderActionState = { ok: boolean; error: string | null }

/** Mark a manifest stop delivered — also records the COD cash as collected
 * by this rider (delivered ≠ remitted; remittance happens at the counter). */
export async function markStopDelivered(
  dispatchOrderId: string
): Promise<RiderActionState> {
  try {
    const { token } = await getRiderSession()
    if (!token) return { ok: false, error: "Your rider session expired — sign in again." }
    await backendFetch(`/rider/orders/${dispatchOrderId}/delivered`, {
      method: "POST",
      body: "{}",
      headers: riderHeaders(token),
    })
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function markStopRefused(
  dispatchOrderId: string,
  notes: string | null
): Promise<RiderActionState> {
  try {
    const { token } = await getRiderSession()
    if (!token) return { ok: false, error: "Your rider session expired — sign in again." }
    await backendFetch(`/rider/orders/${dispatchOrderId}/refused`, {
      method: "POST",
      body: JSON.stringify({ rider_notes: notes || null }),
      headers: riderHeaders(token),
    })
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Register the signed-in customer as a (pending) rider for a hub. */
export async function registerRider(
  _prev: RiderActionState | null,
  formData: FormData
): Promise<RiderActionState> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { ok: false, error: "Please sign in first." }
  }
  const full_name = String(formData.get("full_name") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const hub_id = String(formData.get("hub_id") ?? "")
  if (!full_name) return { ok: false, error: "Enter your full name." }
  if (!phone) return { ok: false, error: "Enter your mobile number." }
  if (!hub_id) return { ok: false, error: "Pick the hub you ride for." }

  try {
    await backendFetch("/store/riders/register", {
      method: "POST",
      body: JSON.stringify({ full_name, phone, hub_id }),
      headers: authHeaders,
    })
    // Registration stacked the rider role onto the customer's metadata —
    // refresh the cached customer so the nav shows Deliveries right away.
    revalidateTag(await getCacheTag("customers"))
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
