import { Heading, Text } from "@modules/common/components/ui"

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
      className="flex flex-col gap-2 border-b border-gray-200 pb-6"
      data-testid="dispatch-estimate"
    >
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        Estimated delivery
      </Heading>
      <Text className="text-ui-fg-base">{label}</Text>
      <Text className="text-ui-fg-subtle text-sm">{note}</Text>
    </div>
  )
}
