import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NotificationTypeIcon from "@modules/common/components/notification-type-icon"
import { formatNotificationTime } from "@lib/util/notification-time"
import { type CustomerNotification } from "@lib/data/notifications"

/**
 * Full details of a single notification. Reached by clicking an item in the
 * header dropdown or the inbox; opening the page has already marked it read
 * (server-side, in getNotification). When the notification carries a `url`, a
 * primary CTA links through to the related page (order, dispute, etc.).
 */
const NotificationDetail = ({
  notification: n,
}: {
  notification: CustomerNotification
}) => {
  return (
    <div className="flex w-full flex-col gap-y-6" data-testid="notification-detail">
      <LocalizedClientLink
        href="/account/notifications"
        className="inline-flex items-center gap-x-1.5 text-caption font-semibold text-grey-50 hover:text-brand-green-700 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All notifications
      </LocalizedClientLink>

      <div className="bg-white rounded-3xl shadow-soft border border-grey-10/60 p-6 small:p-8">
        <div className="flex items-start gap-x-4">
          <NotificationTypeIcon type={n.type} size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="font-heading font-bold text-h3 text-grey-90 leading-snug">
              {n.title}
            </h1>
            <p className="text-caption text-grey-40 mt-1 tabular-nums">
              {formatNotificationTime(n.created_at)}
            </p>
          </div>
        </div>

        <p className="mt-5 text-body text-grey-70 leading-relaxed whitespace-pre-line">
          {n.body}
        </p>

        {n.url && (
          <LocalizedClientLink
            href={n.url}
            className="mt-6 inline-flex items-center gap-x-2 px-5 py-2.5 rounded-full bg-brand-green-700 text-white text-body-sm font-bold hover:bg-brand-green-800 transition-colors"
          >
            View details
            <svg
              width="14"
              height="14"
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
          </LocalizedClientLink>
        )}
      </div>
    </div>
  )
}

export default NotificationDetail
