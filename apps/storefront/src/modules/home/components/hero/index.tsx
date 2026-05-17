import { Button, Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="h-[75vh] w-full border-b border-ui-border-base relative bg-brand-green-600">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center px-6 small:p-32 gap-6">
        <span>
          <Heading
            level="h1"
            className="text-3xl leading-10 text-white font-heading small:text-5xl"
          >
            Fresh from Mindanao&apos;s farms
          </Heading>
          <Heading
            level="h2"
            className="text-xl leading-8 text-white/90 font-normal mt-4"
          >
            Premium produce, fair prices, delivered to your door.
          </Heading>
        </span>
        <LocalizedClientLink href="/store">
          <Button variant="secondary" className="bg-brand-gold-500 text-grey-90 border-brand-gold-500 hover:bg-brand-gold-400 hover:border-brand-gold-400 font-semibold">
            Shop Fresh
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
