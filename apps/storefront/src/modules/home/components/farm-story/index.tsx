const PILLARS = [
  {
    title: "Fair-trade pricing",
    desc: "Premium paid directly to growers — no middlemen.",
    icon: (
      <>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    title: "Regenerative methods",
    desc: "Soil-first farming, no synthetic shortcuts.",
    icon: (
      <>
        <path d="M2 22c1.25-1.25 2.5-2 5-2s3.75.75 5 2 2.5 2 5 2 3.75-.75 5-2" />
        <path d="M5 16c1.5 0 3-.5 5-2.5C12 11 13.5 10.5 15 10.5s3 .5 4 1.5" />
        <path d="M19 6c-1 1-2 2-4 2s-3-1-4-2" />
      </>
    ),
  },
  {
    title: "Cold-chain logistics",
    desc: "Picked, packed and chilled within hours.",
    icon: (
      <>
        <path d="M12 2v20" />
        <path d="M2 12h20" />
        <path d="M19.07 4.93 4.93 19.07" />
        <path d="M4.93 4.93l14.14 14.14" />
      </>
    ),
  },
  {
    title: "Traceable harvest",
    desc: "Every order traced back to its grower.",
    icon: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
]

const FarmStory = () => {
  return (
    <section className="relative bg-brand-cream-50 section-viewport overflow-hidden w-full">
      {/* Top hairline divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-grey-20 to-transparent" />

      {/* Soft background flourish */}
      <div
        aria-hidden
        className="absolute -left-32 top-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-brand-green-100/40 blur-3xl pointer-events-none"
      />

      <div className="relative content-container w-full">
        <div className="grid grid-cols-1 small:grid-cols-12 gap-6 small:gap-10 items-center">
          {/* Image side — clean, no overlays */}
          <div className="small:col-span-5">
            <div className="relative aspect-[4/5] small:aspect-[4/4.4] small:max-h-[calc(100vh-180px)] rounded-3xl overflow-hidden shadow-xl ring-1 ring-grey-90/5">
              <img
                src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=900&h=1100&fit=crop&auto=format&q=85"
                alt="Fresh harvest from Mindanao fields"
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Subtle gradient for richness only */}
              <div className="absolute inset-0 bg-gradient-to-t from-grey-90/30 via-transparent to-transparent" />
            </div>
          </div>

          {/* Text side */}
          <div className="small:col-span-7 flex flex-col gap-y-5">
            <div className="flex items-center gap-x-3">
              <div className="w-8 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                Our Story
              </span>
            </div>

            <h2 className="font-heading text-[30px] leading-[1.06] small:text-[44px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
              From <span className="italic text-brand-green-700">Mindanao&apos;s</span>{" "}
              red soil
              <br />
              to your <span className="italic">table</span>
              <span className="text-brand-gold-500">.</span>
            </h2>

            <p className="text-body-sm small:text-body text-grey-60 leading-relaxed max-w-xl">
              We work shoulder-to-shoulder with farming families across Bukidnon,
              Davao and beyond — paying fair, premium prices so the harvest stays
              honest and the soil stays alive.
            </p>

            {/* Pillars — denser 2×2 grid */}
            <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-2.5">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="group flex items-start gap-x-3 p-3 rounded-2xl bg-white/70 hover:bg-white border border-grey-10/80 hover:border-brand-green-200 transition-all hover:shadow-soft"
                >
                  <span className="w-8 h-8 rounded-xl bg-brand-green-50 group-hover:bg-brand-green-600 flex items-center justify-center flex-shrink-0 transition-colors">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="stroke-brand-green-700 group-hover:stroke-white transition-colors"
                    >
                      {p.icon}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="text-body-sm font-semibold text-grey-90 leading-snug">
                      {p.title}
                    </div>
                    <div className="text-[11px] text-grey-50 leading-relaxed mt-0.5">
                      {p.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row — replaces the farmer CTA */}
            <div className="flex flex-wrap items-stretch gap-x-5 gap-y-3 pt-3 border-t border-grey-20/60">
              <div className="flex items-center gap-x-3">
                <span className="font-heading italic text-[32px] text-brand-green-700 leading-none">
                  50<span className="text-h2 align-top">+</span>
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] text-grey-50 uppercase tracking-widest">
                    Farming families
                  </span>
                  <span className="text-body-sm font-semibold text-grey-90">
                    partnered with us
                  </span>
                </span>
              </div>
              <span className="hidden xsmall:block w-px self-stretch bg-grey-20" />
              <div className="flex items-center gap-x-3">
                <span className="font-heading italic text-[32px] text-grey-90 leading-none">
                  12
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] text-grey-50 uppercase tracking-widest">
                    Provinces
                  </span>
                  <span className="text-body-sm font-semibold text-grey-90">
                    sourced from
                  </span>
                </span>
              </div>
              <span className="hidden xsmall:block w-px self-stretch bg-grey-20" />
              <div className="flex items-center gap-x-3">
                <span className="font-heading italic text-[32px] text-grey-90 leading-none">
                  24h
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] text-grey-50 uppercase tracking-widest">
                    Field-to-door
                  </span>
                  <span className="text-body-sm font-semibold text-grey-90">
                    average time
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FarmStory
