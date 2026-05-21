"use client"

import { useEffect, useState, useTransition } from "react"
import { setHubCookie } from "../actions/set-hub"
import type { Hub } from "../data/hubs"

const COOKIE_NAME = "fh_hub"

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
  return match?.split("=")[1] ?? null
}

/**
 * First-visit hub picker. Renders nothing once a hub cookie is set.
 * Hubs are passed in as a prop so the server fetches them once in the layout.
 */
export default function HubPickerModal({
  hubs,
  defaultSlug,
}: {
  hubs: Hub[]
  defaultSlug?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [chosen, setChosen] = useState<string | null>(null)

  useEffect(() => {
    if (defaultSlug) {
      setOpen(false)
      return
    }
    const existing = readCookie(COOKIE_NAME)
    if (!existing && hubs.length > 0) setOpen(true)
  }, [defaultSlug, hubs.length])

  if (!open || hubs.length === 0) return null

  const handlePick = (slug: string) => {
    setChosen(slug)
    startTransition(async () => {
      await setHubCookie(slug)
      setOpen(false)
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-picker-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-grey-90/40 backdrop-blur-sm px-4"
    >
      <div className="bg-white rounded-2xl shadow-elevated border border-grey-10 max-w-md w-full p-6 small:p-8">
        <div className="mb-5">
          <h2
            id="hub-picker-title"
            className="font-heading text-h3 text-grey-90 leading-tight"
          >
            Pick your hub
          </h2>
          <p className="text-body-sm text-grey-50 mt-1.5 leading-relaxed">
            Mindanao Fresh Hub serves one city per hub. Choose where you&apos;d
            like delivery — you can switch later from the navbar.
          </p>
        </div>

        <ul className="flex flex-col gap-y-2">
          {hubs.map((hub) => (
            <li key={hub.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => handlePick(hub.slug)}
                className="w-full text-left flex items-center justify-between gap-x-4 p-4 rounded-xl border border-grey-10 hover:border-brand-green-500 hover:bg-brand-green-50/40 transition-colors disabled:opacity-50"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-grey-90">{hub.name}</span>
                  <span className="text-caption text-grey-50">
                    {hub.city}, {hub.province}
                  </span>
                </div>
                <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-brand-green-700">
                  {chosen === hub.slug && pending ? "Setting…" : "Choose"}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="text-caption text-grey-40 mt-5 leading-relaxed">
          New hubs roll out city-by-city. Don&apos;t see yours yet? Check back
          soon.
        </p>
      </div>
    </div>
  )
}
