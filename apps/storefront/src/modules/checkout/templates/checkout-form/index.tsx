import {
  getPaymentEligibility,
  listCartPaymentMethods,
} from "@lib/data/payment"
import { isCod, isOtc } from "@lib/constants"
import { HttpTypes } from "@medusajs/types"
import Addresses from "@modules/checkout/components/addresses"
import Delivery from "@modules/checkout/components/delivery"
import Payment from "@modules/checkout/components/payment"
import Review from "@modules/checkout/components/review"

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

  const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")

  if (!paymentMethods) {
    return null
  }

  // FreshHub: OTC is walk-in only (never an online method), so drop it from the
  // offered methods for everyone. Prepay-locked buyers also lose COD — leaving
  // them no online method, so checkout is blocked and they're told to buy in
  // person at the hub. Fails open — if eligibility can't be read we leave COD in
  // (the COD provider still blocks locked buyers at authorize).
  const eligibility = await getPaymentEligibility()
  let availablePaymentMethods = paymentMethods.filter((m) => !isOtc(m.id))
  let codNotice: string | null = null
  let checkoutBlocked = false
  if (eligibility && eligibility.cod_available === false) {
    availablePaymentMethods = availablePaymentMethods.filter((m) => !isCod(m.id))
    checkoutBlocked = true
    codNotice =
      eligibility.block_reason ??
      eligibility.methods.find((m) => m.type === "cod")?.reason_if_unavailable ??
      "Online ordering isn't available on your account. Please buy in person at the hub counter."
  }

  return (
    <div className="w-full grid grid-cols-1 gap-y-8">
      <Addresses cart={cart} customer={customer} />

      <Delivery cart={cart} />

      <Payment
        cart={cart}
        availablePaymentMethods={availablePaymentMethods}
        codNotice={codNotice}
        checkoutBlocked={checkoutBlocked}
      />

      <Review cart={cart} />
    </div>
  )
}
