import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NotificationTypeIcon from "@modules/common/components/notification-type-icon"
import { formatNotificationTime } from "@lib/util/notification-time"
import { type CustomerNotification } from "@lib/data/notifications"

/**
 * The full /account/notifications inbox — every notification (read + unread).
 * Unread rows are emphasised (tinted background + gold dot); each links to its
 * own detail page, which marks it read on open.
 */
const NotificationsList = ({
  notifications,
}: {
  notifications: CustomerNotification[]
}) => {
  if (!notifications.length) {
    return (
      <div
        className="rounded-3xl border border-dashed border-grey-20 px-6 py-16 text-center"
        data-testid="no-notifications-message"
      >
        <span className="mx-auto w-12 h-12 rounded-full bg-grey-10 text-grey-50 flex items-center justify-center">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        <p className="mt-3 text-body-sm font-semibold text-grey-90">
          No notifications yet
        </p>
        <p className="mt-1 text-caption text-grey-50">
          Updates about your orders, deliveries, and account will appear here.
        </p>
      </div>
    )
  }

  return (
    <ul
      className="flex flex-col gap-y-2.5"
      data-testid="notifications-wrapper"
    >
      {notifications.map((n) => {
        const isUnread = !n.read_at
        return (
          <li key={n.id} data-testid="notification-row" data-value={n.id}>
            <LocalizedClientLink
              href={`/account/notifications/${n.id}`}
              className={`flex items-start gap-x-3.5 rounded-2xl border px-4 py-4 transition-colors group ${
                isUnread
                  ? "border-brand-green-100 bg-brand-green-50/40 hover:bg-brand-green-50/70"
                  : "border-grey-10 bg-white hover:bg-grey-5/70"
              }`}
            >
              <NotificationTypeIcon type={n.type} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-x-2">
                  <h3
                    className={`flex-1 text-body-sm leading-snug ${
                      isUnread
                        ? "font-bold text-grey-90"
                        : "font-semibold text-grey-70"
                    }`}
                  >
                    {n.title}
                  </h3>
                  {isUnread && (
                    <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-brand-gold-400" />
                  )}
                </div>
                <p className="text-caption text-grey-60 leading-relaxed mt-1 line-clamp-2">
                  {n.body}
                </p>
                <p className="text-[11px] text-grey-40 mt-1.5 tabular-nums">
                  {formatNotificationTime(n.created_at)}
                </p>
              </div>
              <span className="shrink-0 self-center w-7 h-7 rounded-full bg-white border border-grey-10 flex items-center justify-center text-grey-40 group-hover:text-brand-green-700 group-hover:border-brand-green-200 transition-colors">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </LocalizedClientLink>
          </li>
        )
      })}
    </ul>
  )
}

export default NotificationsList
