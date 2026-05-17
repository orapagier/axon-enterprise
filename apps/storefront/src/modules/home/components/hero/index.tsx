import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-hero">
      {/* Background image overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Hexagon pattern overlay */}
      <div className="absolute inset-0 hexagon-pattern opacity-30" />

      {/* Floating produce visuals - left side */}
      <div className="absolute left-[5%] top-[15%] w-24 h-24 small:w-32 small:h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl opacity-80 hidden xsmall:block">
        <img
          src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute left-[8%] bottom-[18%] w-20 h-20 small:w-28 small:h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-xl opacity-70 hidden xsmall:block">
        <img
          src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Floating produce visuals - right side */}
      <div className="absolute right-[5%] top-[20%] w-20 h-20 small:w-28 small:h-28 rounded-full overflow-hidden border-4 border-white/20 shadow-xl opacity-80 hidden xsmall:block">
        <img
          src="https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200&h=200&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
      <div className="absolute right-[8%] bottom-[15%] w-24 h-24 small:w-32 small:h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl opacity-70 hidden xsmall:block">
        <img
          src="https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=200&h=200&fit=crop"
          alt=""
          className="w-full h-full object-cover"
        />
      </div>

      {/* Decorative dots */}
      <div className="absolute top-[10%] left-[20%] w-3 h-3 bg-brand-gold-400 rounded-full opacity-60" />
      <div className="absolute top-[30%] right-[15%] w-2 h-2 bg-white rounded-full opacity-40" />
      <div className="absolute bottom-[25%] left-[15%] w-2 h-2 bg-brand-gold-300 rounded-full opacity-50" />
      <div className="absolute bottom-[10%] right-[25%] w-3 h-3 bg-white rounded-full opacity-30" />

      {/* Content */}
      <div className="relative z-10 content-container flex flex-col items-center justify-center text-center py-24 small:py-38 gap-8">
        <div className="max-w-4xl">
          <h1 className="text-display-lg small:text-display-xl font-heading italic text-white whitespace-nowrap drop-shadow-lg">
            Fresh from Mindanao&apos;s Farms
          </h1>
          <p className="text-body-lg text-white/80 mt-5 max-w-lg mx-auto">
            Premium produce, fair prices, delivered to your door. Supporting local
            farmers with every order.
          </p>
        </div>
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center gap-x-2 px-8 py-4 bg-brand-gold-500 text-grey-90 font-semibold text-body rounded-xl shadow-medium hover:bg-brand-gold-400 hover:shadow-large transition-all duration-200 hover:-translate-y-0.5"
        >
          Shop Fresh
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
