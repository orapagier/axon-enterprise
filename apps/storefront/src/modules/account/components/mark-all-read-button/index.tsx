"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { markAllNotificationsRead } from "@lib/data/notifications"

const MarkAllReadButton = ({ disabled }: { disabled?: boolean }) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const onClick = () => {
    startTransition(async () => {
      await markAllNotificationsRead()
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPending}
      className="inline-flex items-center gap-x-1.5 text-caption font-semibold text-brand-green-700 hover:text-brand-green-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      data-testid="mark-all-read-button"
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
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {isPending ? "Marking…" : "Mark all read"}
    </button>
  )
}

export default MarkAllReadButton
