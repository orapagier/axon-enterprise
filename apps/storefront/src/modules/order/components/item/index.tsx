import { HttpTypes } from "@medusajs/types"

import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <div className="flex items-center gap-4 py-4" data-testid="product-row">
      <div className="w-16 shrink-0 overflow-hidden rounded-large ring-1 ring-grey-10">
        <Thumbnail thumbnail={item.thumbnail} size="square" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-y-0.5">
        <p
          className="truncate text-body-sm font-semibold text-grey-90"
          data-testid="product-name"
        >
          {item.product_title}
        </p>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
        <div className="mt-1 flex items-center gap-x-1.5 text-caption text-grey-50">
          <span data-testid="product-quantity">{item.quantity}</span>
          <span>×</span>
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </div>
      </div>

      <div className="shrink-0 text-right text-body-sm font-semibold text-grey-90">
        <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
      </div>
    </div>
  )
}

export default Item
