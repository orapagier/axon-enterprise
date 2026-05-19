// Shared constants + types for delivery-hub resolution. No server-only
// imports so client components can pull these without bundler warnings.

export type DeliveryHub = {
  /** The user's city — from their default shipping address, or the default hub. */
  city: string
  /** True if the city is one of our active delivery hubs (eligible for free delivery). */
  isHubCity: boolean
  /** True when the city came from the customer's saved address; false when we fell back. */
  resolvedFromAddress: boolean
}

/**
 * Default fee charged for orders that miss the daily 12 PM cut-off. Roughly
 * the one-way tricycle fare from a typical address to the hub — Day-1
 * placeholder until zone-based shipping is configured in Medusa.
 */
export const DEFAULT_OFF_PEAK_DELIVERY_FEE_PHP = 15
