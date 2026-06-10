"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("payment_providers")),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers.sort((a, b) => {
        return a.id > b.id ? 1 : -1
      })
    )
    .catch(() => {
      return null
    })
}

export type PaymentEligibility = {
  customer_id: string | null
  account_state:
    | "normal"
    | "warned"
    | "prepay_locked_30d"
    | "prepay_locked_permanent"
  cod_available: boolean
  // True for prepay-locked buyers: OTC is walk-in only (never online), so with
  // COD removed they have no online method and must buy in person at the hub.
  checkout_blocked: boolean
  block_reason: string | null
  methods: {
    id: string
    type: string
    label: string
    available: boolean
    reason_if_unavailable: string | null
  }[]
}

/**
 * Per-buyer payment eligibility (FreshHub custom route). COD is hidden for
 * buyers in a prepay-locked accountability state; OTC is always available.
 * Not cached — the result depends on the logged-in customer's state. Fails
 * open (returns null) so a hiccup never blocks checkout; the COD provider
 * still enforces the lock at authorize as a safety net.
 */
export const getPaymentEligibility =
  async (): Promise<PaymentEligibility | null> => {
    const headers = {
      ...(await getAuthHeaders()),
    }

    return sdk.client
      .fetch<PaymentEligibility>(`/store/payment-methods`, {
        method: "GET",
        headers,
        cache: "no-store",
      })
      .catch(() => null)
  }
