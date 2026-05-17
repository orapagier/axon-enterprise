import LocalizedClientLink from "@modules/common/components/localized-client-link"

const FarmStory = () => {
  return (
    <section className="section-padding">
      <div className="content-container">
        <div className="grid grid-cols-1 small:grid-cols-2 gap-10 small:gap-16 items-center">
          {/* Image placeholder */}
          <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-brand-green-50 shadow-soft">
            <img
              src="https://images.unsplash.com/photo-1595855759920-86582396756a?w=800&h=600&fit=crop"
              alt="Fresh vegetables from Mindanao farms"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Text content */}
          <div className="flex flex-col gap-y-6">
            <span className="text-caption font-semibold text-brand-green-600 uppercase tracking-wider">
              Our Story
            </span>
            <h2 className="text-h1 small:text-display font-heading text-grey-90">
              Direct from Mindanao&apos;s farms to your home
            </h2>
            <p className="text-body-lg text-grey-50 leading-relaxed">
              We partner with over 50 local farming families across Mindanao,
              buying their harvest at premium prices. Every order means better
              livelihoods for farmers and fresher produce for you.
            </p>
            <LocalizedClientLink
              href="/farmers"
              className="inline-flex items-center gap-x-2 text-body font-semibold text-brand-green-600 hover:text-brand-green-700 transition-colors group"
            >
              Meet our farmers
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FarmStory
