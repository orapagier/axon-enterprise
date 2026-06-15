import type { HHMM } from "./delivery-tiers"

/**
 * Current wall-clock time in an IANA timezone as { hour, minute }.
 *
 * Lives apart from delivery-tiers.ts so that file stays pure (it takes HHMM and
 * never reads the clock). Shared by the delivery-options routes and the
 * cart-completion hook, which all need "what time is it at the hub right now?".
 */
export function nowInTimezone(timezone: string): HHMM {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10
  )
  return {
    hour: Number.isNaN(hour) ? 0 : hour,
    minute: Number.isNaN(minute) ? 0 : minute,
  }
}
