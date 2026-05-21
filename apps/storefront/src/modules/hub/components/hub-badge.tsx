import type { Hub } from "../data/hubs"

/**
 * Compact inline display of the active hub. Server component — pass the
 * resolved hub in from the parent.
 */
export default function HubBadge({ hub }: { hub: Hub | null }) {
  if (!hub) {
    return (
      <span className="inline-flex items-center gap-x-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-grey-50">
        <span className="w-1 h-1 rounded-full bg-grey-30" />
        No hub selected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-x-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-grey-70">
      <span className="w-1 h-1 rounded-full bg-brand-green-500" />
      {hub.name}
    </span>
  )
}
