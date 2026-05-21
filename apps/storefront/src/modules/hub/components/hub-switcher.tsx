"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { setHubCookie } from "../actions/set-hub"
import type { Hub } from "../data/hubs"

/**
 * Inline navbar dropdown for switching the active hub.
 */
export default function HubSwitcher({
  hubs,
  currentSlug,
}: {
  hubs: Hub[]
  currentSlug: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  if (hubs.length === 0) return null

  const current = hubs.find((h) => h.slug === currentSlug) ?? null

  const onPick = (slug: string) => {
    if (slug === currentSlug) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      await setHubCookie(slug)
      setOpen(false)
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-x-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-white/70 hover:text-brand-gold-300 transition-colors disabled:opacity-50"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {current ? current.name : "Pick a hub"}
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 mt-2 min-w-[220px] bg-white border border-grey-10 rounded-lg shadow-elevated overflow-hidden z-50"
        >
          {hubs.map((hub) => {
            const active = hub.slug === currentSlug
            return (
              <li key={hub.id}>
                <button
                  type="button"
                  onClick={() => onPick(hub.slug)}
                  disabled={pending}
                  className={`w-full flex flex-col gap-y-0.5 px-4 py-2.5 text-left hover:bg-grey-5 transition-colors text-grey-90 disabled:opacity-50 ${
                    active ? "bg-brand-green-50/60" : ""
                  }`}
                >
                  <span className="font-medium text-sm">{hub.name}</span>
                  <span className="text-caption text-grey-50">
                    {hub.city}, {hub.province}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
