"use client"

import { Button, Heading, Text } from "@modules/common/components/ui"
import { useParams, useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { beginCheckout } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { useCartSelection } from "@modules/cart/components/selection-context"
import DiscountCode from "@modules/checkout/components/discount-code"
import ErrorMessage from "@modules/checkout/components/error-message"
import Divider from "@modules/common/components/divider"
import MembershipUpsellStrip from "@modules/common/components/membership-upsell-strip"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  isMember?: boolean
}

const Summary = ({ cart, isMember = false }: SummaryProps) => {
  const selection = useCartSelection()
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selectedIds = selection?.selectedIds ?? []
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedItems = (cart.items ?? []).filter((li) =>
    selectedSet.has(li.id)
  )
  const selectedCount = selectedItems.length
  const selectedSubtotal = selectedItems.reduce(
    (sum, li) => sum + (li.total ?? (li.unit_price ?? 0) * (li.quantity ?? 0)),
    0
  )

  const handleCheckout = () => {
    setError(null)
    startTransition(async () => {
      try {
        const res = await beginCheckout(selectedIds)
        if (res?.requiresLogin) {
          router.push(`/${countryCode}/account`)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't start checkout")
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <Heading level="h2" className="text-xl font-semibold text-ui-fg-base">
          Summary
        </Heading>
      </div>
      <div className="px-6 py-5 flex flex-col gap-y-4">
        <DiscountCode cart={cart} />
        <Divider />
        <div className="flex items-center justify-between">
          <Text className="text-ui-fg-subtle">
            Subtotal ({selectedCount} {selectedCount === 1 ? "item" : "items"}{" "}
            selected)
          </Text>
          <Text
            className="text-ui-fg-base font-semibold tabular-nums"
            data-testid="cart-selected-subtotal"
          >
            {convertToLocale({
              amount: selectedSubtotal,
              currency_code: cart.currency_code,
            })}
          </Text>
        </div>
        <Text className="text-caption text-ui-fg-muted -mt-2">
          Shipping &amp; taxes are calculated at checkout.
        </Text>
        {!isMember && (
          <MembershipUpsellStrip
            subtotal={cart.subtotal ?? 0}
            currencyCode={cart.currency_code}
          />
        )}
        <Button
          className="w-full h-10"
          onClick={handleCheckout}
          isLoading={isPending}
          disabled={selectedCount === 0}
          data-testid="checkout-button"
        >
          {selectedCount === 0
            ? "Select items to checkout"
            : `Checkout (${selectedCount})`}
        </Button>
        <ErrorMessage error={error} data-testid="checkout-error-message" />
      </div>
    </div>
  )
}

export default Summary
