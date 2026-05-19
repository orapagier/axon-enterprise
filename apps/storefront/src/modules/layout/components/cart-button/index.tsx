import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { isMember } from "@lib/util/membership"
import CartDropdown from "../cart-dropdown"

export default async function CartButton() {
  const [cart, customer] = await Promise.all([
    retrieveCart().catch(() => null),
    retrieveCustomer().catch(() => null),
  ])

  return <CartDropdown cart={cart} isMember={isMember(customer)} />
}
