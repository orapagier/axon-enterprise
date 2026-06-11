import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { isMember as checkIsMember } from "@lib/util/membership"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const isMember = checkIsMember(customer)
  return (
    <div className="py-5 small:py-12 bg-ui-bg-subtle min-h-[60vh]">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <div className="flex flex-col gap-y-4 small:gap-y-0 small:grid small:grid-cols-[1fr_380px] small:gap-x-8">
            <div className="flex flex-col gap-y-4">
              {!customer && <SignInPrompt />}
              <ItemsTemplate cart={cart} />
            </div>
            <div className="relative">
              <div className="flex flex-col gap-y-4 small:sticky small:top-20">
                {cart && cart.region && (
                  <Summary cart={cart} isMember={isMember} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
