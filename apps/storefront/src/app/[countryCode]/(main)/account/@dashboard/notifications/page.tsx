import { Metadata } from "next"

import { listNotifications } from "@lib/data/notifications"
import NotificationsList from "@modules/account/components/notifications-list"
import MarkAllReadButton from "@modules/account/components/mark-all-read-button"

export const metadata: Metadata = {
  title: "Notifications | Mindanao Fresh Hub",
  description: "Updates about your orders, deliveries, and account.",
}

export default async function NotificationsPage() {
  const { notifications, unread_count } = await listNotifications()

  return (
    <div
      className="flex w-full flex-col gap-y-6"
      data-testid="notifications-page-wrapper"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-y-1">
          <h1 className="font-heading text-h2 text-grey-90">Notifications</h1>
          <p className="text-body-sm text-grey-50">
            {unread_count > 0
              ? `You have ${unread_count} unread ${
                  unread_count === 1 ? "notification" : "notifications"
                }.`
              : "You're all caught up."}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="pt-1">
            <MarkAllReadButton disabled={unread_count === 0} />
          </div>
        )}
      </div>

      <NotificationsList notifications={notifications} />
    </div>
  )
}
