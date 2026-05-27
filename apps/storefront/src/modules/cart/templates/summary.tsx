"use client"

import { Button, Heading } from "@modules/common/components/ui"

import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import DiscountCode from "@modules/checkout/components/discount-code"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import MembershipUpsellStrip from "@modules/common/components/membership-upsell-strip"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  isMember?: boolean
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

const Summary = ({ cart, isMember = false }: SummaryProps) => {
  const step = getCheckoutStep(cart)

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
        <CartTotals totals={cart} />
        {!isMember && (
          <MembershipUpsellStrip
            subtotal={cart.subtotal ?? 0}
            currencyCode={cart.currency_code}
          />
        )}
        <LocalizedClientLink
          href={"/checkout?step=" + step}
          data-testid="checkout-button"
        >
          <Button className="w-full h-10">Go to checkout</Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Summary
