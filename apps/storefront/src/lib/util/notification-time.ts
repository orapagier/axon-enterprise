/**
 * Compact, deterministic timestamp for notifications.
 *
 * timeZone is pinned to Asia/Manila so the server and client render the exact
 * same string — relative "x ago" labels depend on Date.now() and would differ
 * between SSR and hydration, tripping React's hydration check (see the iOS /
 * format-detection notes in CLAUDE.md memory).
 */
export function formatNotificationTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(d)
}
