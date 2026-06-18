"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

/**
 * In-app notifications (header bell + /account/notifications), fetched
 * SERVER-SIDE.
 *
 * The /store/notifications endpoints are guarded by the customer JWT, which
 * lives in an httpOnly cookie the browser never forwards to the backend — a
 * client-side sdk call always 401's. Go through these server functions.
 */

export type CustomerNotification = {
  id: string
  type: string | null
  title: string
  body: string
  url: string | null
  tag: string | null
  read_at: string | null
  data: Record<string, unknown> | null
  created_at: string
}

export async function listNotifications(
  unreadOnly = false
): Promise<{ notifications: CustomerNotification[]; unread_count: number }> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { notifications: [], unread_count: 0 }
  }
  try {
    const body = await sdk.client.fetch<{
      notifications: CustomerNotification[]
      unread_count: number
    }>(`/store/notifications${unreadOnly ? "?unread=true" : ""}`, {
      method: "GET",
      headers: authHeaders,
      cache: "no-store",
    })
    return {
      notifications: body.notifications ?? [],
      unread_count: body.unread_count ?? 0,
    }
  } catch {
    return { notifications: [], unread_count: 0 }
  }
}

/** Fetch one notification's full details. Opening it marks it read server-side. */
export async function getNotification(
  id: string
): Promise<CustomerNotification | null> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return null
  }
  try {
    const body = await sdk.client.fetch<{ notification: CustomerNotification }>(
      `/store/notifications/${id}`,
      { method: "GET", headers: authHeaders, cache: "no-store" }
    )
    return body.notification ?? null
  } catch {
    return null
  }
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { ok: false }
  }
  try {
    await sdk.client.fetch(`/store/notifications/read-all`, {
      method: "POST",
      headers: authHeaders,
    })
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
