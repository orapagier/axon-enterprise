"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { Fragment, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NotificationTypeIcon from "@modules/common/components/notification-type-icon"
import { formatNotificationTime } from "@lib/util/notification-time"
import {
  markAllNotificationsRead,
  type CustomerNotification,
} from "@lib/data/notifications"

/**
 * Header notification bell. On desktop (hover-capable) it opens on hover like
 * the cart dropdown; on touch devices it opens on tap and closes on tap-outside
 * or Escape. Shows the customer's UNREAD notifications; clicking one opens its
 * full detail page (which marks it read). "Mark all read" clears the badge.
 */
const NotificationDropdown = ({
  notifications,
  unreadCount,
}: {
  notifications: CustomerNotification[]
  unreadCount: number
}) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timeout | undefined>()
  const rootRef = useRef<HTMLDivElement>(null)

  // Hover only drives the panel on devices that actually hover. On touch,
  // browsers emulate a mouseenter on tap — if we let that open the panel, the
  // tap's click would immediately toggle it back closed. So gate hover here and
  // use tap (onClick) to toggle instead.
  const [canHover, setCanHover] = useState(false)
  useEffect(() => {
    setCanHover(
      typeof window !== "undefined" &&
        window.matchMedia("(hover: hover)").matches
    )
  }, [])

  const openAndCancel = () => {
    if (activeTimer) clearTimeout(activeTimer)
    setOpen(true)
  }
  const close = () => setOpen(false)
  const toggle = () => {
    if (activeTimer) clearTimeout(activeTimer)
    setOpen((v) => !v)
  }

  const handleEnter = () => {
    if (canHover) openAndCancel()
  }
  const handleLeave = () => {
    if (canHover) close()
  }
  const handleButtonClick = () => {
    // Desktop is driven by hover; tap drives touch.
    if (!canHover) toggle()
  }

  useEffect(() => {
    return () => {
      if (activeTimer) clearTimeout(activeTimer)
    }
  }, [activeTimer])

  // On touch, close when tapping outside the bell/panel or pressing Escape.
  useEffect(() => {
    if (!open || canHover) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, canHover])

  // The dropdown shows unread items only; the inbox page shows everything.
  const unread = notifications.filter((n) => !n.read_at)

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  return (
    <div className="h-full z-50" onMouseEnter={openAndCancel} onMouseLeave={close}>
      <Popover className="relative h-full">
        <PopoverButton
          className="h-full flex items-center outline-none"
          aria-label={`Notifications${
            unreadCount > 0 ? ` (${unreadCount} unread)` : ""
          }`}
          data-testid="nav-notifications-button"
        >
          <span className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full text-grey-70 hover:text-brand-green-700 hover:bg-grey-5 transition-colors">
            <svg
              width="18"
              height="18"
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
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-gold-400 ring-2 ring-[#fdfcf8] flex items-center justify-center text-[9px] font-bold leading-none text-brand-green-900 tabular-nums"
                data-testid="notifications-unread-count"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
        </PopoverButton>
        <Transition
          show={open}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+8px)] right-0 bg-white rounded-2xl shadow-large border border-grey-10 w-[380px] text-ui-fg-base overflow-hidden"
            data-testid="nav-notifications-dropdown"
          >
            <div className="px-4 py-3 flex items-center justify-between border-b border-grey-10">
              <h3 className="text-base-semi font-semibold text-grey-90">
                Notifications
              </h3>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={isPending}
                  className="text-caption font-semibold text-brand-green-700 hover:text-brand-green-800 disabled:opacity-50 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {unread.length > 0 ? (
              <ul className="max-h-[420px] overflow-y-auto no-scrollbar divide-y divide-grey-10">
                {unread.map((n) => (
                  <li key={n.id}>
                    <LocalizedClientLink
                      href={`/account/notifications/${n.id}`}
                      onClick={close}
                      className="flex gap-x-3 px-4 py-3.5 hover:bg-brand-green-50/40 transition-colors group"
                      data-testid="notification-item"
                    >
                      <NotificationTypeIcon type={n.type} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-x-2">
                          <p className="text-body-sm font-semibold text-grey-90 leading-snug line-clamp-1 flex-1">
                            {n.title}
                          </p>
                          <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-brand-gold-400" />
                        </div>
                        <p className="text-caption text-grey-60 leading-snug mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-[11px] text-grey-40 mt-1 tabular-nums">
                          {formatNotificationTime(n.created_at)}
                        </p>
                      </div>
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center gap-y-2 py-12 px-6 text-center">
                <span className="w-10 h-10 rounded-full bg-grey-10 text-grey-50 flex items-center justify-center">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <p className="text-body-sm font-semibold text-grey-90">
                  You're all caught up
                </p>
                <p className="text-caption text-grey-50">
                  New updates about your orders show up here.
                </p>
              </div>
            )}

            <div className="border-t border-grey-10">
              <LocalizedClientLink
                href="/account/notifications"
                onClick={close}
                className="block px-4 py-3 text-center text-body-sm font-semibold text-brand-green-700 hover:bg-grey-5 transition-colors"
              >
                See all notifications
              </LocalizedClientLink>
            </div>
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default NotificationDropdown
