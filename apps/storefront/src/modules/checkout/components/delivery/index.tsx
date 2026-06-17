"use client"

import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import DeliveryOptionsSummary from "@modules/checkout/components/delivery-options-summary"
import Divider from "@modules/common/components/divider"
import { Button, Heading, Text, clx } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Delivery step. Sits between the address and payment steps: the customer picks
 * a delivery tier (free / standard / special) before payment unlocks. The tier
 * picker itself is the shared DeliveryOptionsSummary, which writes the choice to
 * cart.metadata; this wrapper adds the step framing, gating and a "Continue"
 * gate that stays disabled until a tier is chosen.
 */
const Delivery = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const meta = (cart.metadata ?? {}) as {
    delivery_tier?: string
    delivery_fee_php?: number
  }
  const selectedTier = meta.delivery_tier ?? null

  const addressComplete = !!(
    cart.shipping_address?.address_1 &&
    (cart.shipping_address?.metadata as { barangay?: string } | undefined)
      ?.barangay
  )

  const handleEdit = () => router.push(pathname + "?step=delivery")
  const handleContinue = () => router.push(pathname + "?step=payment")

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
        {!isOpen && selectedTier && addressComplete && (
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
        addressComplete ? (
          <div className="pb-8">
            <DeliveryOptionsSummary cart={cart} />
            <Button
              size="large"
              className="mt-6"
              onClick={handleContinue}
              disabled={!selectedTier}
              data-testid="submit-delivery-button"
            >
              Continue to payment
            </Button>
          </div>
        ) : (
          <Text
            className="txt-medium text-ui-fg-subtle"
            data-testid="delivery-needs-address-notice"
          >
            Add a delivery address above to see delivery options.
          </Text>
        )
      ) : selectedTier ? (
        <div className="text-small-regular">
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            Delivery option
          </Text>
          <Text
            className="txt-medium text-ui-fg-subtle capitalize"
            data-testid="delivery-option-summary"
          >
            {selectedTier} delivery
            {" — "}
            {!meta.delivery_fee_php
              ? "Free"
              : convertToLocale({
                  amount: meta.delivery_fee_php,
                  currency_code: cart.currency_code,
                })}
          </Text>
        </div>
      ) : null}

      <Divider className="mt-8" />
    </div>
  )
}

export default Delivery
