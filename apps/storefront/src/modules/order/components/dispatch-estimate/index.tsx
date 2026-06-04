/**
 * Phase 4 — show the expected delivery day based on the 12:00 PM Manila cutoff.
 * Orders placed before noon ship that same day's 4 PM dispatch; orders placed
 * later roll to the next day's batch. Delivery is targeted for 6 PM same day.
 */
const MANILA_OFFSET_MS = 8 * 60 * 60_000

function isBeforeCutoff(now: Date): boolean {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS)
  const hour = local.getUTCHours()
  return hour < 12
}

export default function DispatchEstimate({
  placedAt,
}: {
  placedAt?: string | Date
}) {
  const placed = placedAt ? new Date(placedAt) : new Date()
  const sameDay = isBeforeCutoff(placed)
  const label = sameDay ? "Today by 6 PM" : "Tomorrow by 6 PM"
  const note = sameDay
    ? "Your order made today's 12 PM cutoff and ships in the 4 PM dispatch."
    : "Orders placed after 12 PM ship in the next day's 4 PM dispatch."

  return (
    <div
      className="relative flex items-center gap-x-4 overflow-hidden rounded-2xl border border-brand-green-100 bg-gradient-to-br from-brand-green-50 to-white p-6 shadow-soft small:gap-x-5 small:p-7"
      data-testid="dispatch-estimate"
    >
      {/* Soft gold glow accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-gold-300/15 blur-2xl"
      />

      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-green-700 shadow-soft ring-1 ring-brand-green-100">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="3" width="15" height="13" rx="1.5" />
          <path d="M16 8h4l3 3v5h-7z" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      </span>

      <div className="relative flex flex-col gap-y-0.5">
        <span className="text-caption font-semibold uppercase tracking-[0.16em] text-brand-green-700">
          Estimated delivery
        </span>
        <span className="font-heading text-h3 text-grey-90 small:text-h2">
          {label}
        </span>
        <p className="text-body-sm text-grey-60">{note}</p>
      </div>
    </div>
  )
}
