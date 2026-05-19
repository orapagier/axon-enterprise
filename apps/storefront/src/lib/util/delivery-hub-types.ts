// Shared types for delivery-hub resolution. No server-only imports so client
// components can import these without bundler warnings.

export type DeliveryHub = {
  /** The user's city — from their default shipping address, or the default hub. */
  city: string
  /** True if the city is one of our active delivery hubs (eligible for free delivery). */
  isHubCity: boolean
  /** True when the city came from the customer's saved address; false when we fell back. */
  resolvedFromAddress: boolean
}
