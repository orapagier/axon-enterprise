"use client"

/**
 * "Track your order" CTA on the order-confirmed page. Instead of linking to a
 * static order list, it opens the site-wide FreshHub assistant (mounted in the
 * (main) layout) with a starter question about this order, so the buyer can
 * ask about delivery, status, disputes, etc. in natural language.
 */
export default function TrackOrderButton({
  orderDisplayId,
  className,
}: {
  orderDisplayId?: string | number
  className?: string
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("freshhub:open-assistant", {
            detail: {
              prompt: orderDisplayId
                ? `Where is my order #${orderDisplayId}?`
                : "Where are my recent orders?",
            },
          })
        )
      }}
    >
      Track your order
    </button>
  )
}
