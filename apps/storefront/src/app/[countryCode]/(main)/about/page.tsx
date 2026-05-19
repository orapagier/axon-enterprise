import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "About Us | Mindanao Fresh Hub",
  description:
    "Mindanao Fresh Hub launched in May 2026 in Tagum City. We're building a short, honest supply chain that pays farmers more and charges homes less.",
}

const VALUES = [
  {
    title: "Honest pricing, both ways",
    desc: "Premium at the farmgate, fair at the doorstep. We publish margins; nothing is hidden.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8M12 8v8" />
      </>
    ),
  },
  {
    title: "Soil-first, always",
    desc: "We back regenerative methods because tomorrow's harvest depends on today's earth.",
    icon: (
      <>
        <path d="M2 22c1.25-1.25 2.5-2 5-2s3.75.75 5 2 2.5 2 5 2 3.75-.75 5-2" />
        <path d="M5 16c1.5 0 3-.5 5-2.5C12 11 13.5 10.5 15 10.5s3 .5 4 1.5" />
      </>
    ),
  },
  {
    title: "Short chains",
    desc: "From plot to plate in under 24 hours. Fewer hands, fresher food, lower waste.",
    icon: (
      <>
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 9v6a3 3 0 0 0 3 3h6" />
      </>
    ),
  },
  {
    title: "Community over scale",
    desc: "We grow city by city, building trust before we open the next hub.",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
]

const ROADMAP = [
  {
    when: "May 2026",
    tag: "We are here",
    title: "Doors open in Tagum City",
    desc: "Our first hub goes live. We start onboarding partner farms within a 60 km radius and begin direct delivery across Tagum.",
    active: true,
  },
  {
    when: "Q3 2026",
    tag: "Next",
    title: "First 10 partner farms",
    desc: "Lock in standing weekly orders and publish our first transparent farmgate price sheet.",
  },
  {
    when: "Q4 2026",
    tag: "Planned",
    title: "Davao City coverage",
    desc: "Extend cold-chain routes south into Davao proper as supply stabilises.",
  },
  {
    when: "2027",
    tag: "Vision",
    title: "Mindanao-wide network",
    desc: "Open additional hubs in CDO and General Santos as farm partnerships expand.",
  },
]

const LAUNCH_FACTS = [
  { value: "May 2026", label: "Founded" },
  { value: "Tagum City", label: "First hub" },
  { value: "Day 1", label: "Of the journey" },
  { value: "0", label: "Middlemen" },
  { value: "24h", label: "Field-to-door goal" },
  { value: "100%", label: "Direct from farm" },
]

const TEAM = [
  {
    name: "Cham P. Tonog",
    role: "Founder & CEO",
    initials: "CT",
    bio: "Leads the company end-to-end — sourcing, operations, partner-farmer relationships, and the day-to-day of the Tagum hub.",
  },
  {
    name: "Jelmar A. Orapa",
    role: "Co-founder & CTO",
    initials: "JO",
    bio: "Owns the technology — the storefront, the order pipeline, and the hub tooling our team runs on every day.",
  },
]

export default function AboutPage() {
  return (
    <>
      {/* ──────────────────────────── HERO ──────────────────────────── */}
      <section className="relative bg-brand-cream-50 overflow-hidden">
        <div
          aria-hidden
          className="absolute -left-40 -top-32 w-[520px] h-[520px] rounded-full bg-brand-green-100/50 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden
          className="absolute right-0 bottom-0 w-[360px] h-[360px] rounded-full bg-brand-gold-400/15 blur-3xl pointer-events-none"
        />

        <div className="relative content-container w-full py-14 small:py-20">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-8 small:gap-12 items-center">
            <div className="small:col-span-7 flex flex-col gap-y-5">
              <div className="flex items-center gap-x-3">
                <span className="inline-flex items-center gap-x-1.5 px-2.5 py-1 rounded-full bg-brand-green-700 text-white text-[10px] font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold-300" />
                  Just launched
                </span>
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  About Mindanao Fresh Hub
                </span>
              </div>

              <h1 className="font-heading text-[34px] leading-[1.04] small:text-[56px] small:leading-[1.01] text-grey-90 tracking-[-0.02em]">
                A fairer food chain,{" "}
                <span className="italic text-brand-green-700">
                  starting in Tagum
                </span>
                <span className="text-brand-gold-500">.</span>
              </h1>

              <p className="text-body small:text-body-lg text-grey-60 leading-relaxed max-w-xl">
                Mindanao Fresh Hub opened its doors in{" "}
                <span className="text-grey-90 font-semibold">May 2026</span>{" "}
                from a small office in Tagum City. We started with one question:
                why do farmers earn so little and families pay so much for the
                same kilo of vegetables? This site, our hub, and our chain are
                the answer we&apos;re building — out in the open, from day one.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <LocalizedClientLink
                  href="/store"
                  className="group inline-flex items-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-green-700 text-white font-semibold text-body-sm hover:bg-brand-green-800 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Shop this week&apos;s harvest
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
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/farmers"
                  className="inline-flex items-center px-5 py-3.5 rounded-full border border-grey-20 text-grey-90 text-body-sm font-medium hover:bg-white transition-colors"
                >
                  For farmers
                </LocalizedClientLink>
              </div>
            </div>

            {/* Image collage */}
            <div className="small:col-span-5">
              <div className="grid grid-cols-5 grid-rows-6 gap-3 small:gap-4 h-[420px] small:h-[520px]">
                <div className="relative col-span-3 row-span-4 rounded-3xl overflow-hidden shadow-xl ring-1 ring-grey-90/5">
                  <img
                    src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&h=900&fit=crop&auto=format&q=85"
                    alt="Farmer at harvest"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-grey-90/30 via-transparent to-transparent" />
                </div>
                <div className="relative col-span-2 row-span-3 rounded-3xl overflow-hidden shadow-lg ring-1 ring-grey-90/5">
                  <img
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop&auto=format&q=85"
                    alt="Crates of fresh produce"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="relative col-span-2 row-span-3 rounded-3xl overflow-hidden shadow-lg ring-1 ring-grey-90/5">
                  <img
                    src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=600&fit=crop&auto=format&q=85"
                    alt="Mindanao landscape"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="relative col-span-3 row-span-2 rounded-3xl overflow-hidden shadow-lg ring-1 ring-grey-90/5 bg-brand-green-700 p-5 flex flex-col justify-between">
                  <div className="text-caption uppercase tracking-widest text-brand-green-200 font-bold">
                    Founded
                  </div>
                  <div className="font-heading italic text-[40px] small:text-[48px] text-white leading-none">
                    May 2026
                  </div>
                  <div className="text-caption text-white/70">Tagum City</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── STORY ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-10 small:gap-14 items-start">
            <div className="small:col-span-5">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  How it started
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[42px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                A founder, a developer, and{" "}
                <span className="italic text-brand-green-700">
                  one Tagum office
                </span>
                <span className="text-brand-gold-500">.</span>
              </h2>

              <div className="mt-6 flex flex-col gap-y-2">
                <div className="inline-flex items-center gap-x-3 pl-2 pr-4 py-2 rounded-full bg-brand-cream-50 border border-grey-10 w-fit">
                  <span className="w-9 h-9 rounded-full bg-brand-green-700 text-white flex items-center justify-center font-heading italic text-body-sm">
                    CT
                  </span>
                  <div>
                    <div className="text-caption font-semibold text-grey-90 leading-tight">
                      Cham P. Tonog
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-grey-50">
                      Founder &amp; CEO
                    </div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-x-3 pl-2 pr-4 py-2 rounded-full bg-brand-cream-50 border border-grey-10 w-fit">
                  <span className="w-9 h-9 rounded-full bg-grey-90 text-white flex items-center justify-center font-heading italic text-body-sm">
                    JO
                  </span>
                  <div>
                    <div className="text-caption font-semibold text-grey-90 leading-tight">
                      Jelmar A. Orapa
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-grey-50">
                      Co-founder &amp; CTO
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="small:col-span-7 text-body small:text-body-lg text-grey-60 leading-relaxed space-y-5">
              <p>
                Mindanao Fresh Hub is the work of a small two-person team based
                in Tagum City. The idea took shape over coffee in early 2026 and
                turned into a working business by{" "}
                <span className="text-grey-90 font-semibold">
                  May of the same year
                </span>{" "}
                — about as long as it takes a kilo of mangoes to move through
                the current supply chain, ironically enough.
              </p>
              <p>
                <span className="text-grey-90 font-semibold">
                  Cham P. Tonog
                </span>{" "}
                leads the company — sourcing, operations and the day-to-day
                conversations with farming families across Davao del Norte.{" "}
                <span className="text-grey-90 font-semibold">
                  Jelmar A. Orapa
                </span>{" "}
                builds the technology side: the storefront you&apos;re reading
                now, the order pipeline behind it, and the hub tooling that
                keeps each delivery accountable.
              </p>
              <p>
                We&apos;re deliberately starting small. One hub, a handful of
                committed partner farms, and a customer base we can serve well
                — before we even think about opening the next city.
              </p>

              <blockquote className="relative mt-6 pl-5 border-l-2 border-brand-green-600">
                <p className="font-heading italic text-body-lg small:text-h3 text-grey-90 leading-snug">
                  &ldquo;We&apos;d rather grow slowly and pay farmers properly
                  than scale fast and squeeze the chain again.&rdquo;
                </p>
                <footer className="mt-3 text-caption text-grey-50 uppercase tracking-widest">
                  — The team · May 2026
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── VALUES ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full relative overflow-hidden">
        <div
          aria-hidden
          className="absolute right-0 top-1/4 w-[420px] h-[420px] rounded-full bg-brand-green-100/40 blur-3xl pointer-events-none"
        />
        <div className="relative content-container w-full">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-8 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                What we stand for
              </span>
            </div>
            <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
              Four principles we{" "}
              <span className="italic text-brand-green-700">won&apos;t</span>{" "}
              compromise on
              <span className="text-brand-gold-500">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="group flex items-start gap-x-4 p-6 rounded-2xl bg-white border border-grey-10 hover:border-brand-green-200 hover:shadow-soft transition-all"
              >
                <span className="w-11 h-11 rounded-xl bg-brand-green-50 group-hover:bg-brand-green-600 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-brand-green-700 group-hover:stroke-white transition-colors"
                  >
                    {v.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-body font-semibold text-grey-90 leading-snug">
                    {v.title}
                  </div>
                  <div className="text-body-sm text-grey-50 leading-relaxed mt-1.5">
                    {v.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── LAUNCH FACTS ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-8 mb-10 items-end">
            <div className="small:col-span-6">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  Where we are right now
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                Day one,{" "}
                <span className="italic">honest about it</span>
                <span className="text-brand-gold-500">.</span>
              </h2>
            </div>
            <p className="small:col-span-6 text-body-sm small:text-body text-grey-60 leading-relaxed max-w-lg">
              We&apos;re a new business. Instead of pretending we&apos;ve been
              around for years, here&apos;s exactly where we stand the day we
              opened — and the chain we&apos;re building from here.
            </p>
          </div>

          <div className="grid grid-cols-2 small:grid-cols-3 gap-3">
            {LAUNCH_FACTS.map((n, i) => (
              <div
                key={n.label}
                className={`p-6 small:p-7 rounded-2xl border ${
                  i === 0
                    ? "bg-brand-green-700 border-brand-green-700"
                    : "bg-brand-cream-50 border-grey-10"
                }`}
              >
                <div
                  className={`font-heading italic text-[28px] small:text-[40px] leading-tight ${
                    i === 0 ? "text-white" : "text-grey-90"
                  }`}
                >
                  {n.value}
                </div>
                <div
                  className={`text-caption uppercase tracking-widest font-semibold mt-3 ${
                    i === 0 ? "text-brand-green-200" : "text-grey-50"
                  }`}
                >
                  {n.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── ROADMAP ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full">
        <div className="content-container w-full">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-8 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                The road ahead
              </span>
            </div>
            <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
              How we&apos;re{" "}
              <span className="italic text-brand-green-700">building this</span>
              <span className="text-brand-gold-500">.</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-4 small:left-1/2 small:-translate-x-px top-2 bottom-2 w-px bg-grey-20" />
            <div className="flex flex-col gap-y-6">
              {ROADMAP.map((t, i) => (
                <div
                  key={t.when}
                  className={`relative grid grid-cols-1 small:grid-cols-2 gap-6 ${
                    i % 2 === 1 ? "small:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div
                    className={`pl-12 small:pl-0 ${
                      i % 2 === 0 ? "small:pr-12 small:text-right" : "small:pl-12"
                    }`}
                  >
                    <div
                      className={`font-heading italic text-[32px] small:text-[44px] leading-none ${
                        t.active ? "text-brand-green-700" : "text-grey-40"
                      }`}
                    >
                      {t.when}
                    </div>
                    <span
                      className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        t.active
                          ? "bg-brand-green-700 text-white"
                          : "bg-white border border-grey-20 text-grey-50"
                      }`}
                    >
                      {t.tag}
                    </span>
                  </div>
                  <div
                    className={`pl-12 small:pl-0 ${
                      i % 2 === 0 ? "small:pl-12" : "small:pr-12 small:text-right"
                    }`}
                  >
                    <div
                      className={`p-5 rounded-2xl transition-all ${
                        t.active
                          ? "bg-white border border-brand-green-200 shadow-soft"
                          : "bg-white/60 border border-grey-10 hover:border-brand-green-200 hover:shadow-soft"
                      }`}
                    >
                      <div className="text-body font-semibold text-grey-90">
                        {t.title}
                      </div>
                      <div className="text-body-sm text-grey-50 leading-relaxed mt-1.5">
                        {t.desc}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`absolute left-4 small:left-1/2 top-4 -translate-x-1/2 w-3 h-3 rounded-full ring-4 ring-brand-cream-50 ${
                      t.active ? "bg-brand-green-700" : "bg-grey-30"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── TEAM ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-10 items-start">
            <div className="small:col-span-4">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  The team
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                Two people.{" "}
                <span className="italic text-brand-green-700">One mission</span>
                <span className="text-brand-gold-500">.</span>
              </h2>
              <p className="mt-4 text-body-sm text-grey-50 leading-relaxed max-w-sm">
                We&apos;re hiring as the chain grows. If you care about Mindanao
                agriculture, we&apos;d love to hear from you.
              </p>
            </div>

            <div className="small:col-span-8 grid grid-cols-1 xsmall:grid-cols-2 gap-4">
              {TEAM.map((m) => (
                <div
                  key={m.name}
                  className="p-6 rounded-2xl bg-brand-cream-50 border border-grey-10 hover:border-brand-green-200 hover:shadow-soft transition-all"
                >
                  <div className="flex items-center gap-x-4">
                    <span className="w-14 h-14 rounded-2xl bg-brand-green-700 text-white flex items-center justify-center font-heading italic text-h3 flex-shrink-0">
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="text-body font-semibold text-grey-90 leading-snug">
                        {m.name}
                      </div>
                      <div className="text-caption text-grey-50 mt-0.5">
                        {m.role}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-body-sm text-grey-60 leading-relaxed">
                    {m.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── CTA ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full">
        <div className="content-container w-full">
          <div className="relative overflow-hidden rounded-3xl bg-grey-90 p-8 xsmall:p-12 small:p-16">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&q=85&auto=format&fit=crop"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-grey-90 via-grey-90/90 to-grey-90/40" />
            </div>
            <div
              aria-hidden
              className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-brand-gold-400/15 blur-3xl pointer-events-none"
            />

            <div className="relative grid grid-cols-1 small:grid-cols-12 gap-8 items-center">
              <div className="small:col-span-8">
                <div className="flex items-center gap-x-3 mb-4">
                  <div className="w-8 h-px bg-brand-gold-400" />
                  <span className="text-caption font-semibold text-brand-gold-300 uppercase tracking-[0.16em]">
                    Join the chain
                  </span>
                </div>
                <h2 className="font-heading text-[28px] leading-[1.06] small:text-[44px] small:leading-[1.04] text-white tracking-[-0.02em]">
                  Eat better.{" "}
                  <span className="italic text-brand-gold-300">Pay farmers</span>{" "}
                  better.
                </h2>
                <p className="mt-4 text-body text-white/70 leading-relaxed max-w-lg">
                  Whether you&apos;re cooking dinner in Tagum or growing pechay
                  in Asuncion, there&apos;s a side of the chain we built for
                  you. We&apos;re just getting started — come in early.
                </p>
              </div>
              <div className="small:col-span-4 flex flex-col gap-3">
                <LocalizedClientLink
                  href="/store"
                  className="group inline-flex items-center justify-between gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-gold-400 text-grey-90 font-semibold text-body-sm hover:bg-brand-gold-300 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Shop fresh produce
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-grey-90 text-white">
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
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/farmers"
                  className="group inline-flex items-center justify-between gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white font-semibold text-body-sm hover:bg-white/15 transition-all"
                >
                  Become a partner farmer
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/15 text-white">
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
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
