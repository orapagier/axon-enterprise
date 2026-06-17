import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import { CartSelectionProvider } from "../components/selection-context"
import { isLineItemInStock } from "@lib/util/line-item-stock"
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
  // In-stock line ids are the universe of tickable items; out-of-stock items
  // can't be selected for checkout.
  const selectableIds = (cart?.items ?? [])
    .filter((li) => isLineItemInStock(li))
    .map((li) => li.id)

  return (
    <div className="py-5 small:py-12 bg-ui-bg-subtle min-h-[60vh]">
      <div className="content-container" data-testid="cart-container">
        {cart?.items?.length ? (
          <CartSelectionProvider selectableIds={selectableIds}>
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
          </CartSelectionProvider>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
