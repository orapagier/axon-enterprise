import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Become a Partner Hub",
  description:
    "Bring the Mindanao Fresh Hub model to your city. Run a local cold-chain hub backed by our brand, operations playbook and farmer network.",
}

const ROLE = [
  {
    title: "Receive harvest, daily",
    desc: "Cold-chain pickups arrive from partner farms. You inspect, weigh and stage them for orders.",
    icon: (
      <>
        <rect x="2" y="6" width="20" height="14" rx="2" />
        <path d="M2 12h20M8 6V4h8v2" />
      </>
    ),
  },
  {
    title: "Run the daily 4 PM dispatch",
    desc: "Pack orders that came in by 12 PM and dispatch one delivery batch each afternoon — same model as our Tagum hub.",
    icon: (
      <>
        <path d="M16 3h5v13h-2" />
        <path d="M3 8h13v8H3z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    ),
  },
  {
    title: "Be the face in your city",
    desc: "Answer buyers, run the customer-service line, and sign up local farms onto our pricing sheet.",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: "Settle weekly with HQ",
    desc: "Every Friday we square the books on orders, payouts to farmers, and your share of the margin.",
    icon: (
      <>
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <circle cx="12" cy="12.5" r="2.5" />
      </>
    ),
  },
]

const WE_PROVIDE = [
  "The brand, storefront, customer accounts and order pipeline",
  "Standard operating procedures for pickup, packing and dispatch",
  "Intro to vetted farms in your region (we'll co-onboard the first 5)",
  "Pricing sheet template, weekly published rates",
  "Backend admin tooling and weekly settlement reports",
]

const YOU_BRING = [
  "A small space that can hold cold storage (chest freezers are fine to start)",
  "One or two staff to handle daily packing and dispatch",
  "A motorbike or tricycle for last-mile delivery — or a partnership with a local rider",
  "Local knowledge: which farms to talk to, which barangays buy what",
  "A willingness to operate transparently — published prices, no haggling",
]

const FIT = [
  "You're already in food, agriculture, or logistics and want a fresh-produce angle.",
  "You live in a Mindanao city outside Tagum where buyers regularly ask us to deliver.",
  "You like systems and consistency — daily cut-offs, fixed payout days, traceable orders.",
]

export default function PartnerHubPage() {
  return (
    <>
      {/* ──────────────────────────── HERO ──────────────────────────── */}
      <section className="relative bg-brand-cream-50 overflow-hidden">
        <div
          aria-hidden
          className="absolute -right-40 -top-32 w-[520px] h-[520px] rounded-full bg-brand-green-100/50 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute -left-32 bottom-0 w-[360px] h-[360px] rounded-full bg-brand-gold-400/15 blur-3xl pointer-events-none"
        />

        <div className="relative content-container w-full py-14 small:py-20">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-8 small:gap-12 items-center">
            <div className="small:col-span-7 flex flex-col gap-y-5">
              <div className="flex items-center gap-x-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  Partner hubs
                </span>
              </div>

              <h1 className="font-heading text-[34px] leading-[1.04] small:text-[56px] small:leading-[1.01] text-grey-90 tracking-[-0.02em]">
                Bring the Hub to{" "}
                <span className="italic text-brand-green-700">
                  your city
                </span>
                <span className="text-brand-gold-500">.</span>
              </h1>

              <p className="text-body small:text-body-lg text-grey-60 leading-relaxed max-w-xl">
                We&apos;re Tagum-only today. We&apos;re looking for early
                partners to bring the Fresh Hub model — premium farmgate prices,
                weekly payouts, 4&nbsp;PM same-day dispatch — to new cities
                across Mindanao.
              </p>

              <div className="inline-flex items-start gap-x-3 p-4 rounded-2xl bg-white border border-brand-gold-200 max-w-xl">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-brand-gold-700 mt-0.5 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div className="text-caption text-grey-70 leading-relaxed">
                  <span className="font-semibold text-grey-90">
                    Heads-up:
                  </span>{" "}
                  this is an exploration, not a polished franchise program yet.
                  Terms, fees and capital requirements are still being shaped —
                  partly with the first partners themselves.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#apply"
                  className="group inline-flex items-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-green-700 text-white font-semibold text-body-sm hover:bg-brand-green-800 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Register your interest
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-brand-green-700">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:translate-x-0.5 transition-transform"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </a>
                <LocalizedClientLink
                  href="/about"
                  className="inline-flex items-center px-5 py-3.5 rounded-full border border-grey-20 text-grey-90 text-body-sm font-medium hover:bg-white transition-colors"
                >
                  About the company
                </LocalizedClientLink>
              </div>
            </div>

            <div className="small:col-span-5">
              <div className="relative aspect-[4/5] small:aspect-[4/4.6] rounded-3xl overflow-hidden shadow-xl ring-1 ring-grey-90/5">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&h=1100&fit=crop&auto=format&q=85"
                  alt="A neighborhood market in Mindanao"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-grey-90/45 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 backdrop-blur p-4 shadow-large">
                  <div className="text-[10px] uppercase tracking-widest text-grey-50 font-bold">
                    Now operating
                  </div>
                  <div className="font-heading italic text-[22px] text-grey-90 leading-tight mt-0.5">
                    1 hub — Tagum City
                  </div>
                  <div className="mt-2 text-[11px] text-grey-50">
                    Exploring partners in Davao, CDO, Gensan and Zamboanga.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── ROLE ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-8 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                What a partner hub does
              </span>
            </div>
            <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
              Same model, run{" "}
              <span className="italic text-brand-green-700">
                locally
              </span>
              <span className="text-brand-gold-500">.</span>
            </h2>
            <p className="text-body-sm small:text-body text-grey-60 leading-relaxed mt-3 max-w-xl">
              A partner hub mirrors what our Tagum hub does day-to-day —
              receiving fresh produce, running the dispatch, and being the
              local face of the brand.
            </p>
          </div>

          <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-3">
            {ROLE.map((r) => (
              <div
                key={r.title}
                className="group flex items-start gap-x-4 p-5 rounded-2xl bg-brand-cream-50 hover:bg-white border border-grey-10/80 hover:border-brand-green-200 transition-all hover:shadow-soft"
              >
                <span className="w-10 h-10 rounded-xl bg-brand-green-50 group-hover:bg-brand-green-600 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-brand-green-700 group-hover:stroke-white transition-colors"
                  >
                    {r.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-body-sm font-semibold text-grey-90 leading-snug">
                    {r.title}
                  </div>
                  <div className="text-[12px] text-grey-50 leading-relaxed mt-1">
                    {r.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── WHAT WE / YOU ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full relative overflow-hidden">
        <div
          aria-hidden
          className="absolute right-0 top-1/3 w-[420px] h-[420px] rounded-full bg-brand-green-100/40 blur-3xl pointer-events-none"
        />
        <div className="relative content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-2 gap-6 small:gap-8">
            <div className="p-6 small:p-8 rounded-3xl bg-white border border-grey-10/80 shadow-soft">
              <div className="flex items-center gap-x-3 mb-4">
                <span className="w-9 h-9 rounded-xl bg-brand-green-700 text-white flex items-center justify-center font-heading italic font-bold">
                  HQ
                </span>
                <h3 className="font-heading text-h3 text-grey-90 tracking-[-0.015em]">
                  What we provide
                </h3>
              </div>
              <ul className="space-y-3">
                {WE_PROVIDE.map((line) => (
                  <li key={line} className="flex items-start gap-x-3">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-brand-green-50 border border-brand-green-200 text-brand-green-700 flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="text-body-sm text-grey-70 leading-relaxed">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 small:p-8 rounded-3xl bg-white border border-brand-gold-200 shadow-soft">
              <div className="flex items-center gap-x-3 mb-4">
                <span className="w-9 h-9 rounded-xl bg-brand-gold-400 text-grey-90 flex items-center justify-center font-heading italic font-bold">
                  You
                </span>
                <h3 className="font-heading text-h3 text-grey-90 tracking-[-0.015em]">
                  What you bring
                </h3>
              </div>
              <ul className="space-y-3">
                {YOU_BRING.map((line) => (
                  <li key={line} className="flex items-start gap-x-3">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-brand-gold-100 border border-brand-gold-200 text-brand-gold-700 flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="text-body-sm text-grey-70 leading-relaxed">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── FIT ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-8 small:gap-10 items-start">
            <div className="small:col-span-5">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  Is this you?
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                The right fit, in three{" "}
                <span className="italic text-brand-green-700">checks</span>
                <span className="text-brand-gold-500">.</span>
              </h2>
              <p className="text-body-sm text-grey-60 mt-3 leading-relaxed max-w-md">
                The first partner hubs will work closely with us. We&apos;re
                looking for operators, not just investors.
              </p>
            </div>
            <ul className="small:col-span-7 space-y-3">
              {FIT.map((line, i) => (
                <li
                  key={line}
                  className="flex items-start gap-x-4 p-5 rounded-2xl bg-brand-cream-50 border border-grey-10/80"
                >
                  <span className="font-heading italic text-[28px] text-brand-green-700 leading-none w-8 flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-body-sm text-grey-80 leading-relaxed">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── APPLY ──────────────────────────── */}
      <section
        id="apply"
        className="bg-brand-cream-50 section-viewport w-full scroll-mt-24"
      >
        <div className="content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-10">
            <div className="small:col-span-5 flex flex-col gap-y-5">
              <div className="flex items-center gap-x-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  Register interest
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                Tell us about your city.
                <br />
                <span className="italic text-brand-green-700">
                  We&apos;ll reply
                </span>{" "}
                personally
                <span className="text-brand-gold-500">.</span>
              </h2>
              <p className="text-body-sm text-grey-60 leading-relaxed max-w-md">
                There&apos;s no application fee or formal commitment at this
                stage. We just want to know who&apos;s interested, where, and
                why.
              </p>

              <ul className="mt-2 space-y-3">
                {[
                  ["We reply within", "1 week"],
                  ["First call within", "2 weeks"],
                  ["Pilot decision within", "1 month"],
                ].map(([label, value]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-x-4 p-3 rounded-xl bg-white border border-grey-10"
                  >
                    <span className="text-body-sm text-grey-60">{label}</span>
                    <span className="text-body-sm font-semibold text-grey-90">
                      {value}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-grey-20/70 mt-2 text-caption text-grey-50">
                Prefer to talk first? Call{" "}
                <a
                  href="tel:+639100895288"
                  className="text-brand-green-700 font-semibold hover:underline"
                >
                  0910 089 5288
                </a>{" "}
                — Mon to Sat, 7am–6pm.
              </div>
            </div>

            <form
              action="mailto:mindanaofreshhub@gmail.com"
              method="post"
              encType="text/plain"
              className="small:col-span-7 p-6 xsmall:p-8 rounded-3xl bg-white border border-grey-10 shadow-soft"
            >
              <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-4">
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Full name
                  </span>
                  <input
                    name="name"
                    required
                    type="text"
                    placeholder="Juan Dela Cruz"
                    className="px-4 py-3 rounded-xl bg-brand-cream-50 border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Mobile (Globe/Smart)
                  </span>
                  <input
                    name="phone"
                    required
                    type="tel"
                    placeholder="0917 000 0000"
                    className="px-4 py-3 rounded-xl bg-brand-cream-50 border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Target city / province
                  </span>
                  <input
                    name="city"
                    required
                    type="text"
                    placeholder="Davao City, Davao del Sur"
                    className="px-4 py-3 rounded-xl bg-brand-cream-50 border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Background
                  </span>
                  <input
                    name="background"
                    type="text"
                    placeholder="Food, agri, logistics, etc."
                    className="px-4 py-3 rounded-xl bg-brand-cream-50 border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5 xsmall:col-span-2">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Why this city? <span className="text-grey-40 normal-case font-normal">(what makes it a fit)</span>
                  </span>
                  <textarea
                    name="why"
                    required
                    rows={4}
                    placeholder="Existing buyers, farm relationships, space you already have, anything we should know…"
                    className="px-4 py-3 rounded-xl bg-brand-cream-50 border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition resize-none"
                  />
                </label>
              </div>

              <div className="flex flex-col xsmall:flex-row xsmall:items-center justify-between gap-4 mt-6 pt-5 border-t border-grey-20/70">
                <p className="text-caption text-grey-50 max-w-xs">
                  Submitting opens your email client. We never share your
                  details.
                </p>
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-green-700 text-white font-semibold text-body-sm hover:bg-brand-green-800 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Send registration
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-brand-green-700">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="group-hover:translate-x-0.5 transition-transform"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
