"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

/**
 * Referral panel data, fetched SERVER-SIDE.
 *
 * The /store/referrals endpoints are guarded by the customer JWT (an httpOnly
 * cookie the browser never sends to the backend directly), so every consumer
 * must go through these server functions — client-side sdk calls would 401.
 */

export type ReferralEntry = {
  referee: string
  status: "pending" | "rewarded" | "void"
  created_at: string
}

export type ReferralCredit = {
  code: string
  amount: number
  used: boolean
}

export type ReferralPanel = {
  code: string
  bonus_php: number
  referrals: ReferralEntry[]
  credits: ReferralCredit[]
  balance: number
}

const EMPTY: ReferralPanel = {
  code: "",
  bonus_php: 0,
  referrals: [],
  credits: [],
  balance: 0,
}

export async function getReferralPanel(): Promise<ReferralPanel> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) return EMPTY
  try {
    const body = await sdk.client.fetch<ReferralPanel>("/store/referrals/me", {
      method: "GET",
      headers: authHeaders,
      cache: "no-store",
    })
    return {
      code: body.code ?? "",
      bonus_php: body.bonus_php ?? 0,
      referrals: body.referrals ?? [],
      credits: body.credits ?? [],
      balance: body.balance ?? 0,
    }
  } catch {
    return EMPTY
  }
}

export async function claimReferralCode(
  code: string
): Promise<{ ok: boolean; error: string | null }> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { ok: false, error: "Please sign in first." }
  }
  try {
    await sdk.client.fetch("/store/referrals/claim", {
      method: "POST",
      body: { code },
      headers: authHeaders,
    })
    return { ok: true, error: null }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
