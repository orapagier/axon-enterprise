import { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us | Mindanao Fresh Hub",
  description:
    "Mindanao Fresh Hub brings fresh produce from local farmers to your door at fair prices.",
}

export default function AboutPage() {
  return (
    <div className="content-container py-12">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-heading font-bold text-grey-80 mb-6">
          About Mindanao Fresh Hub
        </h1>
        <p className="text-base-regular text-ui-fg-subtle mb-8">
          We&apos;re a community-focused fresh produce platform based in
          Mindanao, Philippines. We buy directly from local farmers at premium
          prices and deliver to households and small businesses at prices below
          what you&apos;d find at the mall.
        </p>
        <div className="grid grid-cols-1 gap-6 text-left xsmall:grid-cols-2">
          <div className="bg-white rounded-large p-6 border border-ui-border-base">
            <h3 className="text-large-semi mb-2">Our Mission</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              To create a fairer food system in Mindanao — where farmers earn
              more and families pay less for fresh, quality produce.
            </p>
          </div>
          <div className="bg-white rounded-large p-6 border border-ui-border-base">
            <h3 className="text-large-semi mb-2">Our Promise</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              Every order supports Mindanao farmers directly. Fresh harvest,
              fair prices, free delivery within hub cities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
