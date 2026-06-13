"use client"

import { useEffect, useState } from "react"
import {
  removePushSubscription,
  savePushSubscription,
} from "@lib/data/push"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
const SW_URL = "/push-sw.js"

type Status =
  | "checking"
  | "unsupported"
  | "unconfigured" // no VAPID key in env
  | "off" // supported, not subscribed
  | "on" // subscribed
  | "denied" // browser permission blocked
  | "working"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/**
 * Delivery push-notification opt-in. Registers a minimal service worker and
 * subscribes the browser to Web Push, persisting the subscription against the
 * signed-in customer. Notifications fire on "out for delivery" and "delivered".
 */
export default function PushOptIn() {
  const [status, setStatus] = useState<Status>("checking")
  const [error, setError] = useState<string | null>(null)

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!supported) {
        setStatus("unsupported")
        return
      }
      if (!VAPID_PUBLIC_KEY) {
        setStatus("unconfigured")
        return
      }
      if (Notification.permission === "denied") {
        setStatus("denied")
        return
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_URL)
        const sub = reg ? await reg.pushManager.getSubscription() : null
        if (!cancelled) setStatus(sub ? "on" : "off")
      } catch {
        if (!cancelled) setStatus("off")
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [supported])

  const enable = async () => {
    setError(null)
    setStatus("working")
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off")
        return
      }
      const reg = await navigator.serviceWorker.register(SW_URL)
      await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
      const json = sub.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Could not read the push subscription from your browser.")
      }
      const res = await savePushSubscription(
        {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        },
        navigator.userAgent
      )
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {})
        throw new Error(res.error ?? "Could not save your subscription.")
      }
      setStatus("on")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setStatus("off")
    }
  }

  const disable = async () => {
    setError(null)
    setStatus("working")
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL)
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe().catch(() => {})
        await removePushSubscription(endpoint)
      }
      setStatus("off")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
      setStatus("on")
    }
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-soft border border-grey-10/60 overflow-hidden"
      data-testid="push-opt-in"
    >
      <div className="px-5 small:px-6 py-5 flex items-start gap-x-4">
        <span className="w-10 h-10 rounded-xl bg-brand-green-50 border border-brand-green-100 text-brand-green-700 flex items-center justify-center text-lg shrink-0">
          🔔
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-h3 text-grey-90 leading-tight">
            Delivery notifications
          </h3>
          <p className="text-caption text-grey-50 mt-0.5 leading-relaxed max-w-md">
            Get a push on this device when your order goes out for delivery and
            when it arrives — no need to keep checking.
          </p>

          {error && (
            <p className="text-caption text-red-600 mt-2">{error}</p>
          )}

          <div className="mt-3">
            {status === "checking" || status === "working" ? (
              <button
                disabled
                className="inline-flex items-center gap-x-2 px-4 py-2 rounded-xl bg-grey-90/60 text-white/80 text-body-sm font-semibold cursor-not-allowed"
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
                  className="animate-ring"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Working…
              </button>
            ) : status === "on" ? (
              <div className="flex items-center gap-x-3 flex-wrap">
                <span className="inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full bg-brand-green-50 border border-brand-green-200 text-caption font-semibold text-brand-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green-600" />
                  On for this device
                </span>
                <button
                  onClick={disable}
                  className="text-caption font-semibold text-grey-50 hover:text-red-600 underline-offset-4 hover:underline transition-colors"
                >
                  Turn off
                </button>
              </div>
            ) : status === "off" ? (
              <button
                onClick={enable}
                className="inline-flex items-center gap-x-2 px-4 py-2 rounded-xl bg-brand-green-700 hover:bg-brand-green-800 text-white text-body-sm font-semibold transition-colors shadow-soft"
              >
                Enable notifications
              </button>
            ) : status === "denied" ? (
              <p className="text-caption text-grey-50">
                Notifications are blocked in your browser settings. Allow them
                for this site, then reload to enable.
              </p>
            ) : status === "unconfigured" ? (
              <p className="text-caption text-grey-50">
                Push isn&apos;t set up on this environment yet.
              </p>
            ) : (
              <p className="text-caption text-grey-50">
                This browser doesn&apos;t support push notifications.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
