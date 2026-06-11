"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { registerRider, RiderActionState } from "@lib/data/rider"

type HubOption = { id: string; name: string; city: string }

export default function RiderRegisterForm({ hubs }: { hubs: HubOption[] }) {
  const router = useRouter()
  const [state, action, pending] = useActionState<
    RiderActionState | null,
    FormData
  >(registerRider, null)

  useEffect(() => {
    if (state?.ok) {
      router.refresh()
    }
  }, [state?.ok, router])

  return (
    <form action={action} className="flex flex-col gap-y-4 mt-6">
      <label className="flex flex-col gap-y-1.5">
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-grey-50">
          Full name
        </span>
        <input
          name="full_name"
          type="text"
          required
          autoComplete="name"
          className="w-full rounded-xl border border-grey-20 bg-white px-4 py-3 text-body-sm focus:outline-none focus:border-brand-green-400 transition-colors"
          placeholder="Juan Dela Cruz"
        />
      </label>

      <label className="flex flex-col gap-y-1.5">
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-grey-50">
          Mobile number
        </span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          className="w-full rounded-xl border border-grey-20 bg-white px-4 py-3 text-body-sm tabular-nums focus:outline-none focus:border-brand-green-400 transition-colors"
          placeholder="09xx xxx xxxx"
        />
      </label>

      <label className="flex flex-col gap-y-1.5">
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-grey-50">
          Hub you ride for
        </span>
        <select
          name="hub_id"
          required
          defaultValue={hubs.length === 1 ? hubs[0].id : ""}
          className="w-full rounded-xl border border-grey-20 bg-white px-4 py-3 text-body-sm focus:outline-none focus:border-brand-green-400 transition-colors appearance-none"
        >
          <option value="" disabled>
            Select your hub…
          </option>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
              {h.city ? ` — ${h.city}` : ""}
            </option>
          ))}
        </select>
      </label>

      {state?.error && (
        <p className="text-body-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full small:w-auto small:self-start px-8 py-3 rounded-xl bg-grey-90 hover:bg-brand-green-700 text-white text-body-sm font-bold shadow-soft transition-colors disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Register as a rider"}
      </button>

      <p className="text-caption text-grey-50 leading-relaxed">
        After you register, pay your <b>cash bond at the hub counter</b> — the
        dispatcher activates your account there. You&apos;ll see your delivery
        run sheet on this page once approved.
      </p>
    </form>
  )
}
