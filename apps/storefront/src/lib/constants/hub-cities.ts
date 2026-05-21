/**
 * Hub city delivery zone configuration for Mindanao Fresh Hub.
 *
 * Only cities listed here are serviced by the hub. When a customer enters a
 * shipping city not in this list, the address is rejected with a clear
 * message. This list is the single source of truth shared between onboarding
 * forms and checkout address validation.
 *
 * In the future each city can carry its own `latitude` / `longitude` and a
 * `radiusKm` so the backend can compute distance from the Davao hub warehouse.
 * Until that geo infra is in place, the allowlist alone provides a strong
 * enough guardrail for day-one operations.
 */

export const HUB_CITIES = [
  "Tagum City",
  "Davao City",
  "Panabo City",
  "Cagayan de Oro",
  "General Santos",
  "Butuan City",
] as const

export type HubCity = (typeof HUB_CITIES)[number]

/** Normalised lowercase set for fast lookup. */
const HUB_CITY_SET: ReadonlySet<string> = new Set(
  HUB_CITIES.map((c) => c.toLowerCase())
)

/** Check whether `city` (case-insensitive) is in the delivery zone. */
export function isHubCity(city: string): city is HubCity {
  return HUB_CITY_SET.has(city.trim().toLowerCase())
}

/**
 * Return the canonical casing for a hub city, or `null` if the city is not
 * in the delivery zone.
 */
export function canonicalHubCity(raw: string): HubCity | null {
  const needle = raw.trim().toLowerCase()
  const match = HUB_CITIES.find((c) => c.toLowerCase() === needle)
  return match ?? null
}

/**
 * Geo coordinates for the Davao hub warehouse — the single fulfilment origin
 * for day-one operations. Used as the centre point for distance calculations
 * once radius-based delivery zoning is implemented.
 */
export const HUB_WAREHOUSE = {
  lat: 7.0731, // approximate Davao City centre
  lng: 125.6128,
} as const

/**
 * Approximate straight-line distance in kilometres between two lat/lng
 * points (Haversine formula). Returns `null` when either point is missing.
 */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}