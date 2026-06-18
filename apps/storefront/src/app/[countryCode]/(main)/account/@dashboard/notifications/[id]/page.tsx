import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getNotification } from "@lib/data/notifications"
import NotificationDetail from "@modules/account/components/notification-detail"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params
  const notification = await getNotification(id).catch(() => null)

  return {
    title: notification
      ? `${notification.title} | Mindanao Fresh Hub`
      : "Notification | Mindanao Fresh Hub",
    description: "Notification details.",
  }
}

export default async function NotificationDetailPage(props: Props) {
  const { id } = await props.params
  const notification = await getNotification(id).catch(() => null)

  if (!notification) {
    notFound()
  }

  return <NotificationDetail notification={notification} />
}
