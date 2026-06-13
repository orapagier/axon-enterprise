/*
 * Mindanao Fresh Hub — Web Push service worker.
 *
 * Deliberately minimal: it handles ONLY `push` and `notificationclick`. There
 * is no `fetch` handler and no caching, so it cannot interfere with Next.js
 * navigation or serve stale pages — it just renders delivery notifications.
 */

self.addEventListener("push", (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (_e) {
    payload = { title: "Fresh Hub", body: event.data ? event.data.text() : "" }
  }

  const title = payload.title || "Mindanao Fresh Hub"
  const options = {
    body: payload.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/account/orders" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || "/"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open; otherwise open a new one.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(target).catch(() => {})
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(target)
        }
      })
  )
})
