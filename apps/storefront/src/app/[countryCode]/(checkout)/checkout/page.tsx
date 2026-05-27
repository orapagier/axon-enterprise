import { applyCustomerAddressToCart, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  let cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  if (customer && !cart.shipping_address?.address_1) {
    await applyCustomerAddressToCart(customer, cart)
    cart = await retrieveCart()
    if (!cart) return notFound()
  }

  const searchParams = await searchParamsPromise
  if (
    customer &&
    cart.shipping_address?.address_1 &&
    (!searchParams.step || searchParams.step === "address")
  ) {
    const countryCode = cart.shipping_address.country_code || "ph"
    redirect(`/${countryCode}/checkout?step=delivery`)
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
