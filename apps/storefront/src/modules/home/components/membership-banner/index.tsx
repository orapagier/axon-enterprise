import LocalizedClientLink from "@modules/common/components/localized-client-link"

const MembershipBanner = () => {
  return (
    <section className="section-viewport bg-white w-full">
      <div className="content-container w-full">
        <div className="relative overflow-hidden rounded-3xl bg-grey-90">
          {/* Background image with overlay */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1600&q=85&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-grey-90 via-grey-90/95 to-grey-90/60" />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-green-900/60 via-transparent to-transparent" />
          </div>

          {/* Decorative gold orb */}
          <div
            aria-hidden
            className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-brand-gold-400/20 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden
            className="absolute right-10 bottom-10 w-64 h-64 rounded-full bg-brand-green-500/10 blur-3xl pointer-events-none"
          />

          <div className="relative z-10 grid grid-cols-1 small:grid-cols-12 gap-8 items-center p-7 xsmall:p-10 small:p-12 small:py-14">
            {/* Left: Content */}
            <div className="small:col-span-7 flex flex-col gap-y-5">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-x-2 w-fit pl-1 pr-4 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-gold-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <span className="text-caption font-semibold text-white/90 uppercase tracking-[0.16em]">
                  Hub Members · ₱500 / year
                </span>
              </div>

              <h2 className="font-heading text-[32px] leading-[1.05] small:text-[44px] small:leading-[1.02] text-white tracking-[-0.02em]">
                Become part of the
                <br />
                <span className="italic text-brand-gold-300">Fresh Hub</span> family.
              </h2>

              <p className="text-body text-white/70 leading-relaxed max-w-lg">
                A members&apos; pass to Mindanao&apos;s best harvest — earlier
                access, fairer prices, priority slots when supply is tight.
              </p>

              {/* Benefits */}
              <ul className="grid grid-cols-1 xsmall:grid-cols-2 gap-x-5 gap-y-2.5 pt-1">
                {[
                  "Member-only pricing",
                  "Priority delivery slots",
                  "Early seasonal access",
                  "Reward points each order",
                ].map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-x-3 text-body-sm text-white/80"
                  >
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-gold-400/15 border border-brand-gold-400/30 flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fde047" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <LocalizedClientLink
                  href="/account/membership"
                  className="group inline-flex items-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-gold-400 text-grey-90 font-semibold text-body-sm hover:bg-brand-gold-300 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Become a Hub Member
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-grey-90 text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/how-it-works"
                  className="inline-flex items-center px-5 py-3.5 rounded-full border border-white/25 text-white text-body-sm font-medium hover:bg-white/10 transition-colors"
                >
                  How it works
                </LocalizedClientLink>
              </div>

              {/* Value row */}
              <div className="flex items-center gap-x-4 pt-3 border-t border-white/10 mt-2">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-gold-400/15 border border-brand-gold-400/30 flex-shrink-0">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fde047"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-heading italic text-body-lg text-white">
                    ₱500{" "}
                    <span className="not-italic text-body-sm text-white/60">
                      / year
                    </span>
                  </span>
                  <span className="text-caption text-white/60">
                    Self-serve upgrade · Cancel anytime · Activate in minutes
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Member card mockup */}
            <div className="hidden small:flex small:col-span-5 justify-center items-center">
              <div className="relative">
                {/* Card */}
                <div className="relative w-[320px] h-[200px] rounded-2xl bg-gradient-to-br from-brand-gold-300 via-brand-gold-400 to-brand-gold-600 p-6 shadow-2xl rotate-[-6deg] hover:rotate-[-3deg] transition-transform duration-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-grey-90/60 font-bold">
                        Fresh Hub
                      </div>
                      <div className="font-heading italic text-h2 text-grey-90 leading-none mt-1">
                        Members&apos; Pass
                      </div>
                    </div>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#111827" stroke="none">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-grey-90/60 font-semibold">
                        Member
                      </div>
                      <div className="font-heading italic text-body-lg text-grey-90">
                        Valued Customer
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-grey-90/60 font-semibold">
                        Tier
                      </div>
                      <div className="text-body-sm font-bold text-grey-90">
                        Harvest · 01
                      </div>
                    </div>
                  </div>

                  {/* Embossed chip */}
                  <div className="absolute top-20 left-6 w-10 h-7 rounded-md bg-grey-90/20 border border-grey-90/30" />
                </div>

                {/* Floating receipt behind card */}
                <div className="absolute -top-4 -right-4 w-32 h-40 rounded-xl bg-white shadow-large rotate-[8deg] p-3 -z-0">
                  <div className="text-[8px] uppercase tracking-widest text-grey-50 font-bold">
                    Receipt
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {[
                      ["Mangoes 2kg", "₱360"],
                      ["Kangkong", "₱45"],
                      ["Tilapia 1kg", "₱220"],
                    ].map(([item, price]) => (
                      <div
                        key={item}
                        className="flex justify-between text-[9px] text-grey-70"
                      >
                        <span>{item}</span>
                        <span className="tabular-nums font-semibold">{price}</span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-grey-20 pt-1.5 mt-1.5 flex justify-between text-[10px] text-grey-90 font-bold">
                      <span>Saved</span>
                      <span className="text-brand-green-700">₱85</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MembershipBanner
