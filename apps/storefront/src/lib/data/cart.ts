"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getCheckoutCartId,
  removeCartId,
  removeCheckoutCartId,
  setCartId,
  setCheckoutCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "./locale-actions"
import { retrieveCustomer } from "./customer"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    // shipping_address.metadata carries the barangay — without it the checkout
    // page's getBarangay() and the Delivery step's addressComplete gate are
    // always false, so the delivery step is stuck on "add an address" and
    // checkout can't proceed even with a valid saved address.
    "*items, *region, *items.product, *items.variant, +items.variant.inventory_quantity, +items.variant.allow_backorder, +items.variant.manage_inventory, *items.thumbnail, *items.metadata, +items.total, *promotions, +shipping_methods.name, +shipping_address.metadata, +billing_address.metadata, *payment_collection.payment_sessions"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ cart }: { cart: HttpTypes.StoreCart }) => cart)
    .catch(() => null)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart(undefined, "id,region_id")

  const headers = {
    ...(await getAuthHeaders()),
  }

  if (!cart) {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    cart = cartResp.cart

    await setCartId(cart.id)

    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  if (cart && cart?.region_id !== region.id) {
    await sdk.store.cart.update(cart.id, { region_id: region.id }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  return cart
}

export async function updateCart(
  data: HttpTypes.StoreUpdateCart,
  explicitCartId?: string
) {
  const cartId = explicitCartId || (await getCartId())

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, data, {}, headers)
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)

      return cart
    })
    .catch(medusaError)
}

/**
 * Starts a partial checkout. Clones the selected line items from the shopping
 * cart into a fresh "checkout cart" and points `_mfh_checkout_cart_id` at it,
 * leaving the shopping cart untouched. The checkout flow operates on this cart;
 * after a successful order, `placeOrder` removes the ordered items from the
 * shopping cart. Out-of-stock variants fail at `createLineItem` here, so they
 * can never reach checkout.
 */
export async function beginCheckout(selectedLineItemIds: string[]) {
  const customer = await retrieveCustomer()
  if (!customer) {
    return { requiresLogin: true as const }
  }

  const fullCart = await retrieveCart()
  if (!fullCart || !fullCart.items?.length) {
    throw new Error("Your cart is empty")
  }

  const selected = new Set(selectedLineItemIds)
  const lines = fullCart.items.filter(
    (li) => selected.has(li.id) && li.variant_id
  )
  if (lines.length === 0) {
    throw new Error("Select at least one item to check out")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }
  const locale = await getLocale()

  const { cart: checkoutCart } = await sdk.store.cart.create(
    { region_id: fullCart.region_id, locale: locale || undefined },
    {},
    headers
  )

  for (const li of lines) {
    await sdk.store.cart
      .createLineItem(
        checkoutCart.id,
        { variant_id: li.variant_id!, quantity: li.quantity },
        {},
        headers
      )
      .catch(medusaError)
  }

  await setCheckoutCartId(checkoutCart.id)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  const countryCode = fullCart.shipping_address?.country_code || "ph"
  redirect(`/${countryCode}/checkout`)
}

/**
 * Abandons an in-progress partial checkout by dropping the checkout-cart
 * pointer. The shopping cart (with every item) stays intact.
 */
export async function cancelCheckout() {
  await removeCheckoutCartId()
  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

/**
 * Busts the cached cart read after a mutation made directly against the backend
 * (e.g. the delivery-tier picker POSTs to /store/delivery-options/select via the
 * browser SDK, which can't revalidate the storefront's force-cached cart). Call
 * this before router.refresh() so the re-render sees the new tier/fee/shipping
 * method — otherwise the Delivery step's "Continue" gate never unlocks.
 */
export async function revalidateCartCache() {
  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  // Guests cannot carry a cart — buying requires a registered account.
  // Callers route to `/${countryCode}/account` when this flag comes back.
  const customer = await retrieveCustomer()
  if (!customer) {
    return { requiresLogin: true as const }
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .createLineItem(
      cart.id,
      {
        variant_id: variantId,
        quantity,
      },
      {},
      headers
    )
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .updateLineItem(cartId, lineId, { quantity }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.cart
    .deleteLineItem(cartId, lineId, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .addShippingMethod(cartId, { option_id: shippingMethodId }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
    })
    .catch(medusaError)
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[], explicitCartId?: string) {
  const cartId = explicitCartId || (await getCartId())

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.cart
    .update(cartId, { promo_codes: codes }, {}, headers)
    .then(async () => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)

      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    })
    .catch(medusaError)
}

export async function applyGiftCard(code: string) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, { gift_cards: [{ code }] }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function removeDiscount(code: string) {
  // const cartId = getCartId()
  // if (!cartId) return "No cartId cookie found"
  // try {
  //   await deleteDiscount(cartId, code)
  //   revalidateTag("cart")
  // } catch (error: any) {
  //   throw error
  // }
}

export async function removeGiftCard(
  codeToRemove: string,
  giftCards: any[]
  // giftCards: GiftCard[]
) {
  //   const cartId = getCartId()
  //   if (!cartId) return "No cartId cookie found"
  //   try {
  //     await updateCart(cartId, {
  //       gift_cards: [...giftCards]
  //         .filter((gc) => gc.code !== codeToRemove)
  //         .map((gc) => ({ code: gc.code })),
  //     }).then(() => {
  //       revalidateTag("cart")
  //     })
  //   } catch (error: any) {
  //     throw error
  //   }
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      return "No form data found when setting addresses"
    }
    const cartId = (await getCheckoutCartId()) || (await getCartId())
    if (!cartId) {
      return "No existing cart found when setting addresses"
    }

    // ── server-side validation ────────────────────────────────────
    const { validateAddressForm, sanitizeText, sanitizeCity } =
      await import("@lib/data/address-validation")

    const validationErrors = validateAddressForm(formData)
    if (validationErrors) {
      // Return the first error so the client can display it inline
      const first = Object.values(validationErrors)[0]
      return first
    }

    // ── sanitised address payload ─────────────────────────────────
    const shippingCity = sanitizeCity(
      formData.get("shipping_address.city")
    )

    const barangay = sanitizeText(formData.get("shipping_address.barangay"))

    const data: Record<string, unknown> = {
      shipping_address: {
        first_name: sanitizeText(formData.get("shipping_address.first_name")),
        last_name: sanitizeText(formData.get("shipping_address.last_name")),
        address_1: sanitizeText(formData.get("shipping_address.address_1")),
        address_2: "",
        company: sanitizeText(formData.get("shipping_address.company")),
        postal_code: sanitizeText(formData.get("shipping_address.postal_code")),
        city: shippingCity,
        country_code: sanitizeText(
          formData.get("shipping_address.country_code")
        ),
        province: sanitizeText(formData.get("shipping_address.province")),
        phone: sanitizeText(formData.get("shipping_address.phone")),
        metadata: barangay ? { barangay } : undefined,
      },
      email: sanitizeText(formData.get("email")),
    }

    const sameAsBilling = formData.get("same_as_billing")
    if (sameAsBilling === "on") {
      ;(data as any).billing_address = (data as any).shipping_address
    } else {
      const billingCity = sanitizeCity(
        formData.get("billing_address.city")
      )
      ;(data as any).billing_address = {
        first_name: sanitizeText(formData.get("billing_address.first_name")),
        last_name: sanitizeText(formData.get("billing_address.last_name")),
        address_1: sanitizeText(formData.get("billing_address.address_1")),
        address_2: "",
        company: sanitizeText(formData.get("billing_address.company")),
        postal_code: sanitizeText(
          formData.get("billing_address.postal_code")
        ),
        city: billingCity,
        country_code: sanitizeText(
          formData.get("billing_address.country_code")
        ),
        province: sanitizeText(formData.get("billing_address.province")),
        phone: sanitizeText(formData.get("billing_address.phone")),
      }
    }

    await updateCart(data as any, cartId)
  } catch (e: any) {
    return e.message
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

export async function applyCustomerAddressToCart(
  customer: HttpTypes.StoreCustomer,
  cart: HttpTypes.StoreCart
) {
  const cartBarangay = (
    cart.shipping_address?.metadata as { barangay?: string } | undefined
  )?.barangay
  // Re-apply when the cart has no address yet OR has an address that's
  // missing the barangay (e.g. a stale cart from an older checkout flow).
  // Without the barangay, the delivery step can't resolve a hub/fee.
  if (cart.shipping_address?.address_1 && cartBarangay) return

  const addr =
    customer.addresses?.find((a) => a.is_default_shipping) ??
    customer.addresses?.[0]
  if (!addr) return

  try {
    const shipping_address: Record<string, unknown> = {
      first_name: addr.first_name || customer.first_name || "",
      last_name: addr.last_name || customer.last_name || "",
      address_1: addr.address_1 || "",
      address_2: addr.address_2 || "",
      company: addr.company || "",
      postal_code: addr.postal_code || "",
      city: addr.city || "",
      country_code: addr.country_code || "",
      province: addr.province || "",
      phone: addr.phone || customer.phone || "",
      metadata: addr.metadata ?? undefined,
    }

    await updateCart(
      {
        shipping_address,
        billing_address: shipping_address,
        email: customer.email,
      } as any,
      cart.id
    )
  } catch {
    // Non-fatal — checkout will fall back to the address form
  }
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const customer = await retrieveCustomer()
  if (!customer) {
    throw new Error("Please sign in or register to place an order")
  }

  const checkoutCartId = await getCheckoutCartId()
  const id = cartId || checkoutCartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    const isPartialCheckout = !!checkoutCartId && id === checkoutCartId
    if (isPartialCheckout) {
      // The shopping cart still holds every item the customer added. Drop the
      // ones we just ordered so only the un-checked-out items remain, then
      // forget the checkout cart. The shopping-cart cookie stays put.
      try {
        const orderedVariantIds = new Set(
          (cartRes.order.items ?? [])
            .map((it) => (it as { variant_id?: string | null }).variant_id)
            .filter((v): v is string => !!v)
        )
        const shoppingCart = await retrieveCart()
        if (shoppingCart?.id) {
          for (const li of shoppingCart.items ?? []) {
            if (li.variant_id && orderedVariantIds.has(li.variant_id)) {
              await sdk.store.cart
                .deleteLineItem(shoppingCart.id, li.id, {}, headers)
                .catch(() => {})
            }
          }
          const cartCacheTag = await getCacheTag("carts")
          revalidateTag(cartCacheTag)
        }
      } catch {
        // Non-fatal — the order already succeeded.
      }
      await removeCheckoutCartId()
    } else {
      // Whole-cart completion (legacy path): the shopping cart is consumed.
      removeCartId()
    }

    redirect(`/${countryCode}/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  // Persist explicit user choice so middleware respects it on subsequent requests.
  const cookieStore = await cookies()
  cookieStore.set("_mfh_country", countryCode.toLowerCase(), {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  })

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId },
    next,
    headers,
    cache: "force-cache",
  })
}
