"use client"

import { Table, Text, clx } from "@modules/common/components/ui"
import { updateLineItem } from "@lib/data/cart"
import { getUnitLabel } from "@lib/util/unit"
import { isLineItemInStock } from "@lib/util/line-item-stock"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import { CartItemCheckbox } from "@modules/cart/components/selection-controls"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  const unit =
    (item.variant?.product as { metadata?: Record<string, unknown> } | undefined)
      ?.metadata?.unit as string | undefined ?? "kg"

  const CART_QUANTITY_CAP = 10
  const inventoryQty =
    (item.variant as { inventory_quantity?: number } | undefined)
      ?.inventory_quantity
  const maxQuantity = item.variant?.manage_inventory
    ? Math.min(inventoryQty ?? CART_QUANTITY_CAP, CART_QUANTITY_CAP)
    : CART_QUANTITY_CAP

  const inStock = isLineItemInStock(item)

  return (
    <Table.Row className="w-full group" data-testid="product-row">
      {type === "full" && (
        <Table.Cell className="!pl-6 w-12 py-4">
          <CartItemCheckbox itemId={item.id} disabled={!inStock} />
        </Table.Cell>
      )}

      <Table.Cell
        className={clx("py-4 w-24", { "!pl-6": type === "preview" })}
      >
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className={clx("flex", {
            "w-16": type === "preview",
            "small:w-20 w-12": type === "full",
          })}
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
            className="rounded-lg"
          />
        </LocalizedClientLink>
      </Table.Cell>

      <Table.Cell className="text-left py-4">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-title"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        {type === "full" && !inStock && (
          <Text
            className="txt-small text-rose-600 mt-1"
            data-testid="product-out-of-stock"
          >
            Out of stock — can&apos;t be checked out
          </Text>
        )}
      </Table.Cell>

      {type === "full" && (
        <Table.Cell className="py-4">
          <div className="flex gap-2 items-center">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              data-testid="product-select-button"
            >
              {Array.from(
                { length: Math.max(1, maxQuantity) },
                (_, i) => (
                  <option value={i + 1} key={i + 1}>
                    {i + 1} {getUnitLabel(unit, i + 1)}
                  </option>
                )
              )}
            </CartItemSelect>
            {updating && <Spinner />}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </Table.Cell>
      )}

      {type === "full" && (
        <Table.Cell className="hidden small:table-cell py-4">
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </Table.Cell>
      )}

      <Table.Cell className="!pr-6 py-4">
        <span
          className={clx({
            "flex flex-col items-end h-full justify-center": type === "preview",
          })}
        >
          {type === "preview" && (
            <span className="flex gap-x-1">
              <Text className="text-ui-fg-muted">{item.quantity} {getUnitLabel(unit, item.quantity)}</Text>
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
          )}
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
