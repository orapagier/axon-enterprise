import { retrieveCustomer } from "@lib/data/customer"
import { listNotifications } from "@lib/data/notifications"
import NotificationDropdown from "../notification-dropdown"

/**
 * Notifications are per-customer, so the bell only renders for a signed-in
 * customer. Mirrors CartButton: fetch on the server, hand the data to the
 * client dropdown.
 */
export default async function NotificationButton() {
  const customer = await retrieveCustomer().catch(() => null)
  if (!customer) {
    return null
  }

  const { notifications, unread_count } = await listNotifications()

  return (
    <NotificationDropdown
      notifications={notifications}
      unreadCount={unread_count}
    />
  )
}
