import "server-only"
import { retrieveCustomer } from "@lib/data/customer"

const DEFAULT_HUB_CITY = "Tagum City"

// Day-1 launch covers Tagum only. Extend this set as new hubs come online.
const HUB_CITIES = new Set(
  ["Tagum City", "Tagum"].map((s) => s.toLowerCase())
)

export type DeliveryHub = {
  /** The user's city — from their default shipping address, or the default hub. */
  city: string
  /** True if the city is one of our active delivery hubs (eligible for free delivery). */
  isHubCity: boolean
  /** True when the city came from the customer's saved address; false when we fell back. */
  resolvedFromAddress: boolean
}

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
        isHubCity: HUB_CITIES.has(city.toLowerCase()),
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
