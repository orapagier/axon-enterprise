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
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ countryCode: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const customer = await retrieveCustomer()

  if (!customer) {
    const { countryCode } = await paramsPromise
    redirect(`/${countryCode}/account`)
  }

  let cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const getBarangay = (c: typeof cart) =>
    (c?.shipping_address?.metadata as { barangay?: string } | undefined)
      ?.barangay

  if (customer && (!cart.shipping_address?.address_1 || !getBarangay(cart))) {
    await applyCustomerAddressToCart(customer, cart)
    cart = await retrieveCart()
    if (!cart) return notFound()
  }

  const searchParams = await searchParamsPromise
  // Only skip ahead to delivery when the address is complete enough for the
  // delivery step to resolve a hub/fee — i.e. it has both a street and a
  // barangay. Otherwise keep the customer on the address form so they can add
  // the missing barangay (delivery-options 400s without it).
  if (
    customer &&
    cart.shipping_address?.address_1 &&
    getBarangay(cart) &&
    (!searchParams.step || searchParams.step === "address")
  ) {
    const countryCode = cart.shipping_address.country_code || "ph"
    redirect(`/${countryCode}/checkout?step=delivery`)
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
