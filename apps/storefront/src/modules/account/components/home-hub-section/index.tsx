"use client"

import { useState, useTransition } from "react"
import { setHubCookie } from "@modules/hub/actions/set-hub"
import type { Hub } from "@modules/hub/data/hubs"

/**
 * Account-page widget for managing the customer's home hub. Persists to the
 * backend customer↔hub link through the same set-hub server action used by
 * the navbar switcher.
 */
export default function HomeHubSection({
  hubs,
  currentSlug,
}: {
  hubs: Hub[]
  currentSlug: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  const current = hubs.find((h) => h.slug === currentSlug) ?? null

  const onPick = (slug: string) => {
    startTransition(async () => {
      await setHubCookie(slug)
      setEditing(false)
    })
  }

  if (hubs.length === 0) {
    return (
      <p className="text-body-sm text-grey-50">
        No hubs are available right now. Check back soon.
      </p>
    )
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-x-4">
        <div className="flex flex-col">
          <span className="text-caption text-grey-50 uppercase tracking-[0.12em] font-semibold">
            Home hub
          </span>
          <span className="text-body font-medium text-grey-90 mt-1">
            {current ? current.name : "Not set"}
          </span>
          {current && (
            <span className="text-caption text-grey-50 mt-0.5">
              {current.city}, {current.province}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-body-sm font-medium text-brand-green-700 hover:underline"
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-caption text-grey-50 uppercase tracking-[0.12em] font-semibold">
        Choose your hub
      </span>
      <ul className="flex flex-col gap-y-2">
        {hubs.map((hub) => {
          const active = hub.slug === currentSlug
          return (
            <li key={hub.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => onPick(hub.slug)}
                className={`w-full flex items-center justify-between gap-x-4 p-3 rounded-xl border transition-colors disabled:opacity-50 ${
                  active
                    ? "border-brand-green-500 bg-brand-green-50/40"
                    : "border-grey-10 hover:border-brand-green-500"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="font-medium text-grey-90">{hub.name}</span>
                  <span className="text-caption text-grey-50">
                    {hub.city}, {hub.province}
                  </span>
                </div>
                <span className="text-[10.5px] uppercase tracking-[0.12em] font-semibold text-brand-green-700">
                  {active ? "Current" : pending ? "…" : "Select"}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-body-sm text-grey-60 hover:text-grey-90"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
