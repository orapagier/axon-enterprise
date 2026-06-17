import { applyCustomerAddressToCart, retrieveCart } from "@lib/data/cart"
import { getCheckoutCartId } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const { countryCode } = await paramsPromise
  const customer = await retrieveCustomer()

  if (!customer) {
    redirect(`/${countryCode}/account`)
  }

  // Checkout always runs against the "checkout cart" — the clone of the items
  // the customer ticked on the cart page. No checkout cart ⇒ they haven't
  // started a checkout, so send them back to the cart to pick items.
  const checkoutCartId = await getCheckoutCartId()
  if (!checkoutCartId) {
    redirect(`/${countryCode}/cart`)
  }

  let cart = await retrieveCart(checkoutCartId)

  if (!cart) {
    redirect(`/${countryCode}/cart`)
  }

  const getBarangay = (c: typeof cart) =>
    (c?.shipping_address?.metadata as { barangay?: string } | undefined)
      ?.barangay

  if (customer && (!cart.shipping_address?.address_1 || !getBarangay(cart))) {
    await applyCustomerAddressToCart(customer, cart)
    cart = await retrieveCart(checkoutCartId)
    if (!cart) redirect(`/${countryCode}/cart`)
  }

  const searchParams = await searchParamsPromise
  // No explicit step ⇒ drop the customer at the first incomplete step. The
  // address auto-fills from their default, so a complete address skips straight
  // to the delivery step; an already-chosen delivery tier skips to payment.
  if (!searchParams.step) {
    const hasAddress = !!(cart.shipping_address?.address_1 && getBarangay(cart))
    const hasDelivery = !!(cart.metadata as { delivery_tier?: string } | null)
      ?.delivery_tier
    const target = !hasAddress
      ? "address"
      : !hasDelivery
        ? "delivery"
        : "payment"
    const cc = cart.shipping_address?.country_code || countryCode || "ph"
    redirect(`/${cc}/checkout?step=${target}`)
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-6 small:py-12">
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
