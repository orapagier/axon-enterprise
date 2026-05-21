"use server"

import { getAuthHeaders } from "./cookies"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export type PickupWindow = {
  id: string
  date: string
  start_time: string
  end_time: string
  capacity_kg: number | null
  reserved_kg: number
  status: string
}

const baseHeaders = async () => {
  const auth = await getAuthHeaders()
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_KEY,
    ...auth,
  } as Record<string, string>
}

/**
 * Fetch open pickup windows for the authenticated producer.
 *
 * Returns windows in the producer's hub area, filtered by date range.
 * Limit defaults to 5.
 */
export async function listOpenPickupWindows(
  from?: string,
  to?: string,
  limit = 5
): Promise<{
  ok: boolean
  windows: PickupWindow[]
  count: number
  error?: string
}> {
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  params.set("limit", String(limit))

  const url = `${BACKEND_URL}/store/seller/pickup-windows?${params.toString()}`
  const res = await fetch(url, {
    method: "GET",
    headers: await baseHeaders(),
    cache: "no-store",
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
    return { ok: false, windows: [], count: 0, error: body.error }
  }

  const data = (await res.json()) as { windows: PickupWindow[]; count: number }
  return { ok: true, windows: data.windows ?? [], count: data.count ?? 0 }
}