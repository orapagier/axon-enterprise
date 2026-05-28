"use client"
import { sdk } from "@lib/config"
import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import { Button, clx, Heading, Text } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

type Tier = "free" | "standard" | "special"

type TierOption = {
  tier: Tier
  label: string
  fee_php: number
  eta_label: string
  available: boolean
  reason_if_unavailable: string | null
}

type DeliveryOptionsResponse = {
  hub: { id: string; slug: string; name: string }
  barangay: string
  is_member: boolean
  cutoff: string
  options: TierOption[]
}

type ShippingProps = {
  cart: HttpTypes.StoreCart
  /** Kept for parent compatibility — not consumed in the 3-tier flow. */
  availableShippingMethods?: HttpTypes.StoreCartShippingOption[] | null
}

const TIER_VISUAL: Record<Tier, { icon: string }> = {
  free: { icon: "📦" },
  standard: { icon: "🛵" },
  special: { icon: "⚡" },
}

const Shipping: React.FC<ShippingProps> = ({ cart }) => {
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

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

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
    if (isOpen) loadOptions()
  }, [isOpen, loadOptions])

  const handleSelect = async (tier: Tier) => {
    setSelectError(null)
    setIsSelecting(true)
    const prev = selectedTier
    setSelectedTier(tier)
    try {
      await sdk.client.fetch(`/store/delivery-options/select`, {
        method: "POST",
        body: { cart_id: cart.id, tier },
      })
    } catch (e) {
      setSelectedTier(prev)
      setSelectError((e as Error).message)
    } finally {
      setIsSelecting(false)
    }
  }

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const selectedOption =
    data?.options.find((o) => o.tier === selectedTier) ?? null

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !selectedTier,
            }
          )}
        >
          Delivery
          {!isOpen && selectedTier && <CheckCircleSolid />}
        </Heading>
        {!isOpen && selectedTier && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-delivery-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>

      {isOpen ? (
        <>
          {isLoading && (
            <div className="flex items-center gap-x-2 text-ui-fg-subtle py-4">
              <Loader />
              <span>Loading delivery options…</span>
            </div>
          )}

          {loadError && (
            <div className="py-4">
              <Text className="text-rose-500">{loadError}</Text>
              <Text className="text-ui-fg-subtle text-small-regular mt-1">
                Make sure your shipping address includes a barangay.
              </Text>
            </div>
          )}

          {data && !isLoading && (
            <>
              <div className="mb-4">
                <Text className="txt-medium text-ui-fg-subtle">
                  Delivering to <span className="text-ui-fg-base font-medium">{data.barangay}</span>
                  {" "}via <span className="text-ui-fg-base font-medium">{data.hub.name}</span>
                </Text>
              </div>

              <div className="space-y-2">
                {data.options.map((option) => {
                  const isSelected = option.tier === selectedTier
                  const isDisabled = !option.available
                  return (
                    <button
                      type="button"
                      key={option.tier}
                      disabled={isDisabled || isSelecting}
                      onClick={() => handleSelect(option.tier)}
                      data-testid={`delivery-tier-${option.tier}`}
                      className={clx(
                        "w-full flex items-start gap-x-4 p-4 rounded-xl border-2 text-left transition-all",
                        isSelected
                          ? "border-ui-border-interactive bg-ui-bg-interactive shadow-soft"
                          : isDisabled
                            ? "border-grey-20 bg-grey-5 opacity-60 cursor-not-allowed"
                            : "border-grey-20 bg-white hover:border-grey-30 cursor-pointer"
                      )}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-grey-20 shrink-0 text-xl">
                        {TIER_VISUAL[option.tier].icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-x-3">
                          <span className="text-base-regular font-semibold text-ui-fg-base">
                            {option.label}
                          </span>
                          <span
                            className={clx(
                              "text-base-regular font-bold tabular-nums shrink-0",
                              isSelected
                                ? "text-ui-fg-interactive"
                                : "text-ui-fg-base"
                            )}
                          >
                            {option.fee_php === 0
                              ? "Free"
                              : convertToLocale({
                                  amount: option.fee_php,
                                  currency_code: cart.currency_code,
                                })}
                          </span>
                        </div>
                        <p className="text-caption text-ui-fg-subtle mt-0.5">
                          {option.eta_label}
                        </p>
                        {isDisabled && option.reason_if_unavailable && (
                          <p className="text-caption text-rose-500 mt-1">
                            {option.reason_if_unavailable}
                          </p>
                        )}
                      </div>
                      <div className="self-center pl-2">
                        <span
                          role="radio"
                          aria-checked={isSelected}
                          data-state={isSelected ? "checked" : "unchecked"}
                          data-testid="radio-button"
                          className="group relative flex h-5 w-5 items-center justify-center outline-none"
                        >
                          <span className="shadow-borders-base group-data-[state=checked]:bg-ui-bg-interactive group-data-[state=checked]:shadow-borders-interactive bg-ui-bg-base flex h-[14px] w-[14px] items-center justify-center rounded-full transition-all">
                            {isSelected && (
                              <span className="bg-ui-bg-base shadow-details-contrast-on-bg-interactive h-1.5 w-1.5 rounded-full" />
                            )}
                          </span>
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6">
                <ErrorMessage
                  error={selectError}
                  data-testid="delivery-tier-error-message"
                />
                <Button
                  size="large"
                  onClick={handleSubmit}
                  isLoading={isSelecting}
                  disabled={!selectedTier}
                  data-testid="submit-delivery-option-button"
                >
                  Continue to payment
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {selectedOption && (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Method
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {selectedOption.label} —{" "}
                  {selectedOption.fee_php === 0
                    ? "Free"
                    : convertToLocale({
                        amount: selectedOption.fee_php,
                        currency_code: cart.currency_code,
                      })}
                </Text>
                <Text className="txt-small text-ui-fg-muted">
                  {selectedOption.eta_label}
                </Text>
              </div>
            )}
            {!selectedOption && selectedTier && (
              <Text className="txt-medium text-ui-fg-subtle">
                Selected: {selectedTier}
              </Text>
            )}
          </div>
        </div>
      )}

      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
