import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden bg-grey-90">
      {/* Background image with cinematic treatment */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=2000&q=85&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Layered gradient overlays for editorial feel */}
        <div className="absolute inset-0 bg-gradient-to-r from-grey-90/95 via-grey-90/70 to-grey-90/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-grey-90/80 via-transparent to-grey-90/40" />
        {/* Subtle film grain */}
        <div
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/></svg>\")",
          }}
        />
      </div>

      {/* Decorative thin gold rule (top) */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-gold-400/60 to-transparent" />

      <div className="relative z-10 content-container">
        <div className="grid grid-cols-1 small:grid-cols-12 small:h-[calc(100vh-104px)] small:max-h-[740px] small:min-h-[540px] py-10 small:py-0 gap-6 items-center">
          {/* Left: Editorial copy */}
          <div className="small:col-span-7 flex flex-col gap-y-5 max-w-[620px]">
            {/* Eyebrow tag */}
            <div className="inline-flex items-center gap-x-2.5 w-fit pl-1.5 pr-4 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-gold-400 text-grey-90 text-[10px] font-bold">
                ✦
              </span>
              <span className="text-[11px] font-medium text-white/90 uppercase tracking-[0.18em]">
                Est. 2026 · Mindanao
              </span>
            </div>

            {/* Display headline */}
            <h1 className="font-heading text-white text-[40px] leading-[1.04] xsmall:text-[52px] small:text-[68px] small:leading-[0.98] tracking-[-0.025em]">
              Fresh from
              <span className="block italic text-brand-gold-300">
                Mindanao&apos;s farms
              </span>
              <span className="block not-italic font-light text-white/85">
                to your table.
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-body text-white/75 max-w-lg leading-relaxed">
              Premium produce and fair prices, delivered to your door — straight
              from 50+ partner farms across Mindanao.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <LocalizedClientLink
                href="/store"
                className="group inline-flex items-center gap-x-2.5 pl-6 pr-4 py-3 bg-white text-grey-90 font-semibold text-body-sm rounded-full shadow-large hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Shop the Harvest
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-grey-90 text-white group-hover:bg-brand-green-700 transition-colors duration-300">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform duration-300">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </LocalizedClientLink>

              {/* Fresh today chip — beside the CTA */}
              <div className="inline-flex items-center gap-x-2.5 pl-2 pr-4 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-green-500/25">
                  <span className="absolute inset-0 rounded-full bg-brand-green-400/40 animate-ping" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-brand-green-300" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/60 font-semibold">
                    Fresh today
                  </span>
                  <span className="text-[13px] font-semibold text-white">
                    24 new arrivals
                  </span>
                </span>
              </div>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 pt-4 mt-1 border-t border-white/10">
              {[
                { num: "50+", label: "Partner farms" },
                { num: "24h", label: "Field to door" },
                { num: "₱1,500", label: "Free delivery" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-x-2">
                  <span className="font-heading text-h3 text-brand-gold-300 leading-none">
                    {stat.num}
                  </span>
                  <span className="text-[11px] text-white/60 uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Editorial product cards (desktop only) */}
          <div className="hidden small:flex small:col-span-5 relative h-[480px] justify-end items-center">
            {/* Vertical label */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 -rotate-90 origin-right pointer-events-none">
              <span className="text-caption text-white/40 uppercase tracking-[0.4em] whitespace-nowrap">
                Seasonal Harvest · 2026
              </span>
            </div>

            {/* Stacked editorial cards */}
            <div className="relative w-[380px] h-[440px] mr-10">
              {/* Card 1 - back: Leafy Greens */}
              <div className="absolute top-0 right-0 w-56 h-72 rounded-2xl overflow-hidden shadow-xl rotate-3 ring-1 ring-white/10">
                <img
                  src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600&h=800&fit=crop&auto=format&q=85"
                  alt="Leafy greens"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-grey-90/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-semibold">
                    No. 01
                  </span>
                  <div className="font-heading italic text-h3 text-white leading-tight">
                    Leafy Greens
                  </div>
                </div>
              </div>

              {/* Card 2 - front: Ripe Mangoes */}
              <div className="absolute bottom-0 left-0 w-56 h-72 rounded-2xl overflow-hidden shadow-xl -rotate-3 ring-1 ring-white/10">
                <img
                  src="https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=600&h=800&fit=crop&auto=format&q=85"
                  alt="Ripe mangoes"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-grey-90/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gold-300 font-semibold">
                    No. 02
                  </span>
                  <div className="font-heading italic text-h3 text-white leading-tight">
                    Ripe Mangoes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </section>
  )
}

export default Hero
