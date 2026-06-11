"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

/**
 * Customer disputes + accountability status, fetched SERVER-SIDE.
 *
 * The /store/customer/disputes endpoints are guarded by the customer JWT,
 * which lives in an httpOnly cookie the browser never sends to the backend
 * directly — client-side sdk calls to them always 401'd. Every consumer of
 * this data must go through these server functions.
 */

export type DisputeResolution =
  | "pending"
  | "buyer_fault"
  | "producer_fault"
  | "rider_fault"
  | "platform_fault"

export type DisputeReason = "damaged_goods" | "wrong_item" | "not_home" | "other"

export type Dispute = {
  id: string
  order_id: string
  rider_notes: string | null
  rider_photo_url: string | null
  buyer_reason: DisputeReason | null
  buyer_notes: string | null
  resolution: DisputeResolution
  resolution_notes: string | null
  created_at: string
}

export type AccountStatus = {
  state: "normal" | "warned" | "prepay_locked_30d" | "prepay_locked_permanent"
  state_until: string | null
  strike_count: number
} | null

export async function listCustomerDisputes(): Promise<{
  disputes: Dispute[]
  account_status: AccountStatus
}> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { disputes: [], account_status: null }
  }
  try {
    const body = await sdk.client.fetch<{
      disputes: Dispute[]
      account_status: AccountStatus
    }>("/store/customer/disputes", {
      method: "GET",
      headers: authHeaders,
      cache: "no-store",
    })
    return {
      disputes: body.disputes ?? [],
      account_status: body.account_status ?? null,
    }
  } catch {
    return { disputes: [], account_status: null }
  }
}

export async function respondToDispute(
  disputeId: string,
  reason: DisputeReason,
  notes: string
): Promise<{ ok: boolean; error: string | null }> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { ok: false, error: "Please sign in first." }
  }
  try {
    await sdk.client.fetch(`/store/customer/disputes/${disputeId}/respond`, {
      method: "POST",
      body: { buyer_reason: reason, buyer_notes: notes },
      headers: authHeaders,
    })
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
