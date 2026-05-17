import { Metadata } from "next"

export const metadata: Metadata = {
  title: "For Farmers | Mindanao Fresh Hub",
  description:
    "Partner with Mindanao Fresh Hub. We buy your produce at premium prices and handle delivery to buyers.",
}

export default function FarmersPage() {
  return (
    <div className="content-container py-12">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-heading font-bold text-grey-80 mb-6">
          For Farmers
        </h1>
        <p className="text-base-regular text-ui-fg-subtle mb-8">
          We believe farmers deserve better. Partner with Mindanao Fresh Hub and
          get premium prices for your harvest — no middlemen, no haggling.
        </p>
        <div className="bg-white rounded-large p-8 border border-ui-border-base text-left">
          <h2 className="text-large-semi mb-4">Why partner with us?</h2>
          <ul className="space-y-3 text-small-regular text-ui-fg-subtle">
            <li>• Premium buying prices — above market average</li>
            <li>• Reliable, consistent orders</li>
            <li>• We handle logistics and delivery</li>
            <li>• Weekly payment schedule</li>
            <li>• No membership fees</li>
          </ul>
          <p className="mt-6 text-small-regular text-ui-fg-muted">
            Interested? Contact us to learn more about becoming a partner
            farmer.
          </p>
        </div>
      </div>
    </div>
  )
}
