import { listCartShippingMethods } from "@lib/data/fulfillment"
import {
  getPaymentEligibility,
  listCartPaymentMethods,
} from "@lib/data/payment"
import { isCod } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"
import Shipping from "@modules/checkout/components/shipping"

export default async function CheckoutForm({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) {
  if (!cart) {
    return null
  }

  const shippingMethods = await listCartShippingMethods(cart.id)
  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!shippingMethods || !paymentMethods) {
    return null
  }

  // FreshHub: prepay-locked buyers (after repeated refusals) lose COD and must
  // pay Over the Counter. Drop COD from the offered methods and surface why.
  // Fails open — if eligibility can't be read we leave COD in (the COD provider
  // still blocks locked buyers at authorize).
  const eligibility = await getPaymentEligibility()
  let availablePaymentMethods = paymentMethods
  let codNotice: string | null = null
  if (eligibility && eligibility.cod_available === false) {
    availablePaymentMethods = paymentMethods.filter((m) => !isCod(m.id))
    codNotice =
      eligibility.methods.find((m) => m.type === "cod")?.reason_if_unavailable ??
      "Cash on Delivery isn't available on your account. Please pay Over the Counter at the hub."
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <Payment
        cart={cart}
        availablePaymentMethods={availablePaymentMethods}
        codNotice={codNotice}
      />

      <Review cart={cart} />
    </div>
  )
}
