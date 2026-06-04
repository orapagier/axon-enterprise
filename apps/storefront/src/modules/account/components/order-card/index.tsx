import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

type StatusStyle = { label: string; badge: string; dot: string }

const GREEN: Omit<StatusStyle, "label"> = {
  badge: "border-brand-green-100 bg-brand-green-50 text-brand-green-800",
  dot: "bg-brand-green-500",
}
const GOLD: Omit<StatusStyle, "label"> = {
  badge: "border-brand-gold-200 bg-brand-gold-50 text-brand-gold-800",
  dot: "bg-brand-gold-500",
}
const GREY: Omit<StatusStyle, "label"> = {
  badge: "border-grey-20 bg-grey-10 text-grey-60",
  dot: "bg-grey-40",
}

const STATUS_STYLE: Record<string, StatusStyle> = {
  not_fulfilled: { label: "Processing", ...GOLD },
  partially_fulfilled: { label: "Processing", ...GOLD },
  fulfilled: { label: "Fulfilled", ...GREEN },
  partially_shipped: { label: "Shipped", ...GREEN },
  shipped: { label: "Shipped", ...GREEN },
  partially_delivered: { label: "On the way", ...GREEN },
  delivered: { label: "Delivered", ...GREEN },
  canceled: { label: "Canceled", ...GREY },
}

const formatFallback = (s: string) => {
  const f = s.split("_").join(" ")
  return f.charAt(0).toUpperCase() + f.slice(1)
}

const OrderCard = ({ order }: OrderCardProps) => {
  const allItems = order.items ?? []
  const totalItems = allItems.reduce((acc, item) => acc + item.quantity, 0)
  const hasOverflow = allItems.length > 4
  const previewItems = hasOverflow ? allItems.slice(0, 3) : allItems.slice(0, 4)
  const remaining = allItems.length - previewItems.length

  const status =
    STATUS_STYLE[order.fulfillment_status] ?? {
      label: formatFallback(order.fulfillment_status),
      ...GREY,
    }

  return (
    <LocalizedClientLink
      href={`/account/orders/details/${order.id}`}
      data-testid="order-card"
      className="group block rounded-2xl border border-grey-10 bg-white p-5 shadow-soft transition-all hover:border-brand-green-200 hover:shadow-medium small:p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-y-0.5">
          <div className="flex items-baseline gap-x-2">
            <span className="text-caption font-semibold uppercase tracking-[0.14em] text-brand-gold-700/80">
              Order
            </span>
            <span className="font-heading text-h3 text-grey-90">
              #
              <span data-testid="order-display-id">{order.display_id}</span>
            </span>
          </div>
          <span className="text-caption text-grey-50" data-testid="order-created-at">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-x-1.5 rounded-full border px-3 py-1 text-caption font-semibold ${status.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>

      {/* Meta */}
      <div className="mt-3 flex items-center gap-x-3 text-body-sm text-grey-60">
        <span className="font-semibold text-grey-90" data-testid="order-amount">
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
          })}
        </span>
        <span className="h-1 w-1 rounded-full bg-grey-20" />
        <span>
          {totalItems} {totalItems === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Thumbnails */}
      <div className="mt-4 grid grid-cols-4 gap-2.5 small:gap-3">
        {previewItems.map((i) => (
          <div
            key={i.id}
            className="flex flex-col gap-y-1.5"
            data-testid="order-item"
          >
            <div className="relative overflow-hidden rounded-large ring-1 ring-grey-10">
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="square" />
              <span
                className="absolute bottom-1 right-1 rounded-full bg-grey-90/85 px-1.5 py-0.5 text-[10px] font-bold text-white"
                data-testid="item-quantity"
              >
                ×{i.quantity}
              </span>
            </div>
            <span
              className="truncate text-caption text-grey-60"
              data-testid="item-title"
            >
              {i.title}
            </span>
          </div>
        ))}

        {remaining > 0 && (
          <div className="flex aspect-square items-center justify-center rounded-large bg-grey-5 ring-1 ring-grey-10">
            <div className="text-center leading-tight">
              <span className="block font-heading text-h3 text-grey-70">
                +{remaining}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-grey-50">
                more
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer cue */}
      <div className="mt-5 flex items-center justify-end border-t border-grey-10 pt-4">
        <span
          className="inline-flex items-center gap-x-1.5 text-body-sm font-semibold text-brand-green-700 transition-all group-hover:gap-x-2.5"
          data-testid="order-details-link"
        >
          See order details
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </LocalizedClientLink>
  )
}

export default OrderCard
