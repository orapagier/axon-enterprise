import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"

import Item from "@modules/order/components/item"

type ItemsProps = {
  order: HttpTypes.StoreOrder
}

const Items = ({ order }: ItemsProps) => {
  const items = order.items

  return (
    <div
      className="flex flex-col divide-y divide-grey-10"
      data-testid="products-table"
    >
      {items?.length
        ? [...items]
            .sort((a, b) =>
              (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
            )
            .map((item) => (
              <Item
                key={item.id}
                item={item}
                currencyCode={order.currency_code}
              />
            ))
        : repeat(3).map((i) => (
            <div key={i} className="flex items-center gap-4 py-4">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-large bg-grey-10" />
              <div className="flex flex-1 flex-col gap-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-grey-10" />
                <div className="h-3 w-20 animate-pulse rounded bg-grey-10" />
              </div>
              <div className="h-4 w-16 animate-pulse rounded bg-grey-10" />
            </div>
          ))}
    </div>
  )
}

export default Items
