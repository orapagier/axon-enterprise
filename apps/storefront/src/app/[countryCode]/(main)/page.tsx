import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import FarmStory from "@modules/home/components/farm-story"
import CategoryShowcase from "@modules/home/components/category-showcase"
import MembershipBanner from "@modules/home/components/membership-banner"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: { absolute: "Mindanao Fresh Hub | Fresh from Mindanao's farms" },
  description:
    "Shop fresh produce from Mindanao farmers. Premium quality fruits and vegetables at fair prices, delivered free to your door.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  const { collections } = await listCollections({
    fields: "id, handle, title",
  })

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero />

      <FarmStory />

      {/* Featured Products / Today's Fresh Picks */}
      <FeaturedProducts collections={collections} region={region} />

      <CategoryShowcase />

      <MembershipBanner />
    </>
  )
}
