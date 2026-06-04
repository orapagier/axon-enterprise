/**
 * Parallel-route fallback for the `@dashboard` slot.
 *
 * Every `@dashboard` URL currently has its own page, so this default is only a
 * safety net to keep the slot resolvable (and avoid 404s) should a route ever
 * exist in `@login` but not here. The account layout only renders this slot
 * for authenticated customers.
 */
export default function DashboardDefault() {
  return null
}
