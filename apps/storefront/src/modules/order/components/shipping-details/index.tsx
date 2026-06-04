import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const TIER_LABELS: Record<string, string> = {
  free: "Free delivery",
  standard: "Standard delivery",
  special: "Special delivery",
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  // Delivery in this checkout is captured as a tier in order.metadata (the
  // fee is paid COD), not as a Medusa shipping_method — so shipping_methods is
  // usually empty. Read the tier/fee from metadata, falling back to a real
  // shipping method for any legacy orders that used one.
  const meta = (order.metadata ?? {}) as {
    delivery_tier?: string
    delivery_fee_php?: number
  }
  const shippingMethod = order.shipping_methods?.[0] as
    | { name?: string; total?: number }
    | undefined

  const methodName =
    (meta.delivery_tier ? TIER_LABELS[meta.delivery_tier] : undefined) ??
    shippingMethod?.name ??
    "Delivery"
  const methodAmount = meta.delivery_fee_php ?? shippingMethod?.total ?? 0

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        Delivery
      </Heading>
      <div className="flex items-start gap-x-8">
        <div
          className="flex flex-col w-1/3"
          data-testid="shipping-address-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">
            Shipping Address
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.postal_code},{" "}
            {order.shipping_address?.city}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div
          className="flex flex-col w-1/3 "
          data-testid="shipping-contact-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">Contact</Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {order.shipping_address?.phone}
          </Text>
          <Text className="txt-medium text-ui-fg-subtle">{order.email}</Text>
        </div>

        <div
          className="flex flex-col w-1/3"
          data-testid="shipping-method-summary"
        >
          <Text className="txt-medium-plus text-ui-fg-base mb-1">Method</Text>
          <Text className="txt-medium text-ui-fg-subtle">
            {methodName}
            {methodAmount > 0 &&
              ` (${convertToLocale({
                amount: methodAmount,
                currency_code: order.currency_code,
              })})`}
          </Text>
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingDetails
