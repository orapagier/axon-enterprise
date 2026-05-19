import "server-only"
import { retrieveCustomer } from "@lib/data/customer"
import type { DeliveryHub } from "./delivery-hub-types"

export type { DeliveryHub } from "./delivery-hub-types"
export { DEFAULT_OFF_PEAK_DELIVERY_FEE_PHP } from "./delivery-hub-types"

const DEFAULT_HUB_CITY = "Tagum City"

// Day-1 launch covers Tagum only. Add new hubs by listing any common
// variant a customer might type — the normalizer below makes the actual
// match tolerant (case, "City" suffix, comma-separated province, etc.).
const HUB_CITY_VARIANTS = ["Tagum City", "Tagum"]

const normalizeCityName = (raw: string): string =>
  raw
    .split(",")[0] // "Tagum, Davao del Norte" → "Tagum"
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // collapse internal whitespace
    .replace(/\s*city$/i, "") // "tagum city" → "tagum"
    .trim()

const HUB_CITIES = new Set(HUB_CITY_VARIANTS.map(normalizeCityName))

/**
 * Resolve which city to show the visitor for delivery messaging.
 *
 * Order of precedence:
 *   1. The default-shipping address on the logged-in customer.
 *   2. The first saved address on the customer.
 *   3. The default hub city (Tagum City).
 */
export async function getDeliveryHub(): Promise<DeliveryHub> {
  const customer = await retrieveCustomer()
  const addresses = customer?.addresses ?? []
  if (addresses.length) {
    const preferred =
      addresses.find((a) => a.is_default_shipping) ?? addresses[0]
    const city = preferred?.city?.trim()
    if (city) {
      return {
        city,
        isHubCity: HUB_CITIES.has(normalizeCityName(city)),
        resolvedFromAddress: true,
      }
    }
  }
  return {
    city: DEFAULT_HUB_CITY,
    isHubCity: true,
    resolvedFromAddress: false,
  }
}
