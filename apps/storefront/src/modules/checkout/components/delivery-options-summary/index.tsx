"use client"

import { sdk } from "@lib/config"
import { convertToLocale } from "@lib/util/money"
import { Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Text, clx } from "@modules/common/components/ui"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

type Tier = "free" | "standard" | "special"

type TierOption = {
  tier: Tier
  label: string
  fee_php: number
  eta_label: string
  available: boolean
  reason_if_unavailable: string | null
  /** Consumer disclaimer shown even when the tier is available. */
  note?: string | null
}

type DeliveryOptionsResponse = {
  hub: { id: string; slug: string; name: string }
  barangay: string
  is_member: boolean
  cutoff: string
  is_open: boolean
  hours_label: string
  options: TierOption[]
}

/**
 * Compact 3-tier delivery picker rendered inline in the checkout summary's
 * "Shipping" line. Pricing comes from the cart's shipping address (the
 * customer's default delivery address, auto-applied on checkout load), so the
 * fee feeds straight into the order total — picking a tier here refreshes the
 * server components and updates "Total" immediately.
 */
const DeliveryOptionsSummary = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const router = useRouter()

  const [data, setData] = useState<DeliveryOptionsResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<Tier | null>(
    ((cart.metadata as { delivery_tier?: string } | null)?.delivery_tier as
      | Tier
      | undefined) ?? null
  )
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectError, setSelectError] = useState<string | null>(null)

  const loadOptions = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const body = await sdk.client.fetch<DeliveryOptionsResponse>(
        `/store/delivery-options?cart_id=${encodeURIComponent(cart.id)}`,
        { method: "GET" }
      )
      setData(body)
    } catch (e) {
      setLoadError((e as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [cart.id])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  const handleSelect = async (tier: Tier) => {
    if (tier === selectedTier) return
    setSelectError(null)
    setIsSelecting(true)
    const prev = selectedTier
    setSelectedTier(tier)
    try {
      await sdk.client.fetch(`/store/delivery-options/select`, {
        method: "POST",
        body: { cart_id: cart.id, tier },
      })
      // The chosen fee now lives in cart.metadata; re-render the server
      // components (CheckoutSummary / CartTotals) so the order total updates.
      router.refresh()
    } catch (e) {
      setSelectedTier(prev)
      setSelectError((e as Error).message)
    } finally {
      setIsSelecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-x-2 text-ui-fg-subtle text-small-regular py-1">
        <Loader />
        <span>Loading delivery options…</span>
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <Text className="text-small-regular text-ui-fg-subtle">
        Add a delivery address with a barangay to see delivery options.
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-y-1.5">
      {data.options.map((option) => {
        const isSelected = option.tier === selectedTier
        const isDisabled = !option.available
        return (
          <button
            type="button"
            key={option.tier}
            disabled={isDisabled || isSelecting}
            onClick={() => handleSelect(option.tier)}
            data-testid={`summary-delivery-tier-${option.tier}`}
            className={clx(
              "w-full flex items-center gap-x-2.5 px-3 py-2 rounded-lg border text-left transition-all",
              isSelected
                ? "border-ui-border-interactive bg-ui-bg-interactive"
                : isDisabled
                  ? "border-grey-20 bg-grey-5 opacity-60 cursor-not-allowed"
                  : "border-grey-20 bg-white hover:border-grey-30 cursor-pointer"
            )}
          >
            <span
              role="radio"
              aria-checked={isSelected}
              data-state={isSelected ? "checked" : "unchecked"}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-grey-30 bg-white"
            >
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-ui-fg-interactive" />
              )}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-small-regular font-medium text-ui-fg-base">
                {option.label}
              </span>
              <span
                className={clx("block text-caption", {
                  "text-rose-500": isDisabled && option.reason_if_unavailable,
                  "text-ui-fg-subtle": !(
                    isDisabled && option.reason_if_unavailable
                  ),
                })}
              >
                {isDisabled && option.reason_if_unavailable
                  ? option.reason_if_unavailable
                  : option.eta_label}
              </span>
              {!isDisabled && option.note && (
                <span className="block text-caption text-amber-700">
                  {option.note}
                </span>
              )}
            </span>

            <span className="text-small-regular font-semibold tabular-nums shrink-0">
              {option.fee_php === 0
                ? "Free"
                : convertToLocale({
                    amount: option.fee_php,
                    currency_code: cart.currency_code,
                  })}
            </span>
          </button>
        )
      })}

      {selectError && (
        <Text className="text-caption text-rose-500">{selectError}</Text>
      )}
    </div>
  )
}

export default DeliveryOptionsSummary
