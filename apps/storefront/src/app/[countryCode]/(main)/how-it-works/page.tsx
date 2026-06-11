import { Metadata } from "next"

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Mindanao Fresh Hub connects you with fresh produce straight from Mindanao's farms.",
}

export default function HowItWorksPage() {
  return (
    <div className="content-container py-12">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-heading font-bold text-grey-80 mb-6">
          How It Works
        </h1>
        <p className="text-base-regular text-ui-fg-subtle mb-8">
          We connect Mindanao&apos;s farmers directly to your table. Fresh
          produce, fair prices, free delivery.
        </p>
        <div className="grid grid-cols-1 gap-8 text-left xsmall:grid-cols-3">
          <div className="flex flex-col items-center text-center gap-3">
            <span className="text-4xl">🌱</span>
            <h3 className="text-large-semi">Farmers Harvest</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              We partner with Mindanao farmers and buy their produce at premium
              prices.
            </p>
          </div>
          <div className="flex flex-col items-center text-center gap-3">
            <span className="text-4xl">📦</span>
            <h3 className="text-large-semi">We Pack Fresh</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              Orders are packed the same day for maximum freshness.
            </p>
          </div>
          <div className="flex flex-col items-center text-center gap-3">
            <span className="text-4xl">🚚</span>
            <h3 className="text-large-semi">Free Delivery</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              Free within our hub city — order by 12 PM for that day&apos;s
              4 PM dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
