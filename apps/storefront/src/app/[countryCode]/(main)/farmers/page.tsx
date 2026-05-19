import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "For Farmers | Mindanao Fresh Hub",
  description:
    "Partner with Mindanao Fresh Hub. Premium farmgate prices, weekly payouts, and reliable orders — no middlemen, no haggling.",
}

const PILLARS = [
  {
    title: "Premium farmgate prices",
    desc: "Paid above market average — published weekly so you always know the rate.",
    icon: (
      <>
        <path d="M12 1v22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    title: "Weekly payouts, on time",
    desc: "GCash, bank or cash — funds clear every Friday, no delays.",
    icon: (
      <>
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <circle cx="12" cy="12.5" r="2.5" />
        <path d="M6 10v.01M18 15v.01" />
      </>
    ),
  },
  {
    title: "We handle the logistics",
    desc: "Cold-chain pickup at your farm — no need to truck produce to market.",
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
    title: "Reliable, repeat orders",
    desc: "Standing weekly orders so you can plan plantings with confidence.",
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <polyline points="21 4 21 10 15 10" />
      </>
    ),
  },
  {
    title: "Agronomy support",
    desc: "Free soil tests and crop guidance from our field team each quarter.",
    icon: (
      <>
        <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
        <path d="M9 10c1.5-2 3-2 3-2s1.5 0 3 2" />
      </>
    ),
  },
  {
    title: "No fees, ever",
    desc: "No membership, no commissions, no hidden cuts on your harvest.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M5 5l14 14" />
      </>
    ),
  },
]

const STEPS = [
  {
    n: "01",
    title: "Tell us about your farm",
    desc: "Share your location, size and main crops in the form below — takes two minutes.",
  },
  {
    n: "02",
    title: "Field visit",
    desc: "Our agronomist visits within a week, checks soil and walks the plots with you.",
  },
  {
    n: "03",
    title: "Sign a fair price sheet",
    desc: "We agree on volumes and a transparent rate per kilo — reviewed every quarter.",
  },
  {
    n: "04",
    title: "Harvest, pickup, payout",
    desc: "We pick up cold-chain at your gate. You get paid every Friday like clockwork.",
  },
]

const CROPS = [
  { name: "Leafy greens", note: "Kangkong, pechay, lettuce", season: "Year-round" },
  { name: "Tropical fruit", note: "Mango, banana, pineapple", season: "Mar – Aug" },
  { name: "Root crops", note: "Sweet potato, cassava, ube", season: "Year-round" },
  { name: "Highland veg", note: "Carrots, cabbage, broccoli", season: "Oct – Mar" },
  { name: "Herbs & alliums", note: "Garlic, onion, ginger", season: "Nov – Apr" },
  { name: "Fresh fish", note: "Tilapia, bangus (pond-raised)", season: "Year-round" },
]

const FAQS = [
  {
    q: "Do I need a minimum farm size to partner?",
    a: "No. We work with smallholders from half a hectare upward. What matters more is consistency of supply and willingness to follow basic post-harvest standards.",
  },
  {
    q: "How is the price decided?",
    a: "We publish a weekly farmgate price sheet, benchmarked above the prevailing Bankerohan and NFA reference prices. You see the rate before you harvest — no haggling at pickup.",
  },
  {
    q: "What if my harvest fails?",
    a: "No penalties. Our contracts are volume targets, not legal minimums. We'd rather you replant healthy than overstretch a bad season.",
  },
  {
    q: "Do you provide inputs or seedlings?",
    a: "For committed partners on a second cycle, yes — we offer seed and organic input bundles deductible against your next payout, interest-free.",
  },
  {
    q: "Which provinces are you sourcing from now?",
    a: "Bukidnon, Davao del Sur, Davao del Norte, South Cotabato, Misamis Oriental and parts of Zamboanga del Sur. New areas are added each quarter.",
  },
]

const PROVINCES = [
  "Bukidnon",
  "Davao del Sur",
  "Davao del Norte",
  "South Cotabato",
  "Misamis Oriental",
  "Zamboanga del Sur",
]

export default function FarmersPage() {
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
                  For partner farmers
                </span>
              </div>

              <h1 className="font-heading text-[34px] leading-[1.04] small:text-[56px] small:leading-[1.01] text-grey-90 tracking-[-0.02em]">
                Grow it well.{" "}
                <span className="italic text-brand-green-700">We&apos;ll</span>
                <br />
                pay you fairly
                <span className="text-brand-gold-500">.</span>
              </h1>

              <p className="text-body small:text-body-lg text-grey-60 leading-relaxed max-w-xl">
                Mindanao Fresh Hub buys direct from farming families at premium
                farmgate prices, picks up at your gate, and pays every Friday.
                No middlemen. No haggling. No membership fees.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#apply"
                  className="group inline-flex items-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-green-700 text-white font-semibold text-body-sm hover:bg-brand-green-800 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Become a partner farmer
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
                  href="/how-it-works"
                  className="inline-flex items-center px-5 py-3.5 rounded-full border border-grey-20 text-grey-90 text-body-sm font-medium hover:bg-white transition-colors"
                >
                  How it works
                </LocalizedClientLink>
              </div>

              <div className="flex flex-wrap items-stretch gap-x-6 gap-y-3 pt-6 border-t border-grey-20/70 mt-3">
                <div className="flex items-center gap-x-3">
                  <span className="font-heading italic text-[32px] text-brand-green-700 leading-none">
                    0
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[10px] text-grey-50 uppercase tracking-widest">
                      Middlemen
                    </span>
                    <span className="text-body-sm font-semibold text-grey-90">
                      between you and the buyer
                    </span>
                  </span>
                </div>
                <span className="hidden xsmall:block w-px self-stretch bg-grey-20" />
                <div className="flex items-center gap-x-3">
                  <span className="font-heading italic text-[32px] text-grey-90 leading-none">
                    Premium
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[10px] text-grey-50 uppercase tracking-widest">
                      Farmgate rate
                    </span>
                    <span className="text-body-sm font-semibold text-grey-90">
                      benchmarked above wet-market reference
                    </span>
                  </span>
                </div>
                <span className="hidden xsmall:block w-px self-stretch bg-grey-20" />
                <div className="flex items-center gap-x-3">
                  <span className="font-heading italic text-[32px] text-grey-90 leading-none">
                    Fri
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[10px] text-grey-50 uppercase tracking-widest">
                      Payout day
                    </span>
                    <span className="text-body-sm font-semibold text-grey-90">
                      every single week
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="small:col-span-5">
              <div className="relative aspect-[4/5] small:aspect-[4/4.6] rounded-3xl overflow-hidden shadow-xl ring-1 ring-grey-90/5">
                <img
                  src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=900&h=1100&fit=crop&auto=format&q=85"
                  alt="Partner farmer in a Mindanao field"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-grey-90/45 via-transparent to-transparent" />

                {/* Floating policy card — what we promise, not a fabricated price */}
                <div className="absolute bottom-5 left-5 right-5 rounded-2xl bg-white/95 backdrop-blur p-4 shadow-large">
                  <div className="flex items-center justify-between gap-x-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-widest text-grey-50 font-bold">
                        Weekly price sheet
                      </div>
                      <div className="font-heading italic text-[20px] text-grey-90 leading-tight mt-0.5">
                        Published every Monday
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-x-1 px-2.5 py-1 rounded-full bg-brand-green-50 text-brand-green-700 text-[10px] font-bold uppercase tracking-wider shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Transparent
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-grey-50">
                    Benchmarked against Bankerohan &amp; NFA references — you see
                    the rate before you harvest.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── WHY PARTNER ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-8 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                What you get
              </span>
            </div>
            <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
              Six reasons farmers stay with us{" "}
              <span className="italic text-brand-green-700">for seasons</span>
              <span className="text-brand-gold-500">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 xsmall:grid-cols-2 small:grid-cols-3 gap-3">
            {PILLARS.map((p) => (
              <div
                key={p.title}
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
                    {p.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-body-sm font-semibold text-grey-90 leading-snug">
                    {p.title}
                  </div>
                  <div className="text-[12px] text-grey-50 leading-relaxed mt-1">
                    {p.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── HOW IT WORKS ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full relative overflow-hidden">
        <div
          aria-hidden
          className="absolute right-0 top-1/3 w-[420px] h-[420px] rounded-full bg-brand-green-100/40 blur-3xl pointer-events-none"
        />
        <div className="relative content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-8 small:gap-10 mb-10">
            <div className="small:col-span-5">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  How partnership works
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                From <span className="italic">first call</span> to first payout
                <span className="text-brand-gold-500">.</span>
              </h2>
            </div>
            <p className="small:col-span-7 text-body-sm small:text-body text-grey-60 leading-relaxed max-w-xl small:self-end">
              We&apos;ve kept the joining process deliberately short. Our aim is
              to onboard new partners within two weeks of first contact and run
              their first pickup the following Saturday.
            </p>
          </div>

          <div className="grid grid-cols-1 xsmall:grid-cols-2 small:grid-cols-4 gap-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="relative p-6 rounded-2xl bg-white border border-grey-10 hover:border-brand-green-200 hover:shadow-soft transition-all"
              >
                <div className="font-heading italic text-[44px] leading-none text-brand-green-700/15 absolute top-4 right-5">
                  {s.n}
                </div>
                <div className="relative flex items-center gap-x-2 mb-3">
                  <span className="text-[10px] uppercase tracking-widest text-brand-green-700 font-bold">
                    Step {i + 1}
                  </span>
                </div>
                <div className="text-body font-semibold text-grey-90 leading-snug">
                  {s.title}
                </div>
                <div className="text-[12px] text-grey-50 leading-relaxed mt-2">
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── WHAT WE BUY ──────────────────────────── */}
      <section className="bg-white section-viewport w-full">
        <div className="content-container w-full">
          <div className="flex flex-col small:flex-row small:items-end justify-between gap-6 mb-10">
            <div className="max-w-xl">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  What we buy
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                Crops we&apos;re{" "}
                <span className="italic text-brand-green-700">actively</span>{" "}
                sourcing
                <span className="text-brand-gold-500">.</span>
              </h2>
            </div>
            <div className="text-body-sm text-grey-50">
              Don&apos;t see your crop? Tell us anyway — we add categories every
              season.
            </div>
          </div>

          <div className="grid grid-cols-1 xsmall:grid-cols-2 small:grid-cols-3 gap-3">
            {CROPS.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-x-4 p-5 rounded-2xl bg-brand-cream-50 border border-grey-10 hover:border-brand-green-200 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-body font-semibold text-grey-90">
                    {c.name}
                  </div>
                  <div className="text-[12px] text-grey-50 mt-0.5 truncate">
                    {c.note}
                  </div>
                </div>
                <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full bg-white border border-grey-10 text-[10px] font-bold uppercase tracking-wider text-brand-green-700">
                  {c.season}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] text-grey-50">
            <span className="uppercase tracking-widest font-bold text-grey-90">
              Sourcing in
            </span>
            {PROVINCES.map((p) => (
              <span
                key={p}
                className="inline-flex items-center px-3 py-1 rounded-full bg-brand-green-50 text-brand-green-700 text-[11px] font-semibold"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────── FOUNDER'S NOTE ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full">
        <div className="content-container w-full">
          <div className="relative overflow-hidden rounded-3xl bg-grey-90 p-8 xsmall:p-12 small:p-16">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1592978662169-4ea3f24bcce1?w=1600&q=85&auto=format&fit=crop"
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-grey-90 via-grey-90/95 to-grey-90/40" />
            </div>
            <div
              aria-hidden
              className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-brand-gold-400/15 blur-3xl pointer-events-none"
            />

            <div className="relative grid grid-cols-1 small:grid-cols-12 gap-8 items-center">
              <div className="small:col-span-8">
                <span className="inline-flex items-center gap-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 mb-5">
                  A note from the founder
                </span>
                <blockquote className="font-heading text-[22px] leading-[1.25] xsmall:text-[28px] xsmall:leading-[1.2] small:text-[34px] small:leading-[1.15] text-white tracking-[-0.01em]">
                  Mindanao&apos;s farmers grow some of the best produce in the
                  country and rarely capture the value.{" "}
                  <span className="italic text-brand-gold-300">
                    Fresh Hub exists to close that gap — fair price, weekly payout,
                    no middlemen.
                  </span>
                </blockquote>
                <div className="mt-6 flex items-center gap-x-4">
                  <span className="w-12 h-12 rounded-full bg-brand-gold-400 text-grey-90 ring-2 ring-brand-gold-400 flex items-center justify-center font-heading italic text-body-lg font-bold">
                    CT
                  </span>
                  <div>
                    <div className="text-body-sm font-semibold text-white">
                      Cham P. Tonog
                    </div>
                    <div className="text-caption text-white/60">
                      Founder &amp; CEO · Tagum City
                    </div>
                  </div>
                </div>
              </div>

              <div className="small:col-span-4 grid grid-cols-2 small:grid-cols-1 gap-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="font-heading italic text-[32px] text-brand-gold-300 leading-none">
                    Day 1
                  </div>
                  <div className="text-caption text-white/60 mt-1">
                    Of the journey — Tagum City, May 2026
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="font-heading italic text-[32px] text-brand-gold-300 leading-none">
                    0
                  </div>
                  <div className="text-caption text-white/60 mt-1">
                    Days waiting for payment — paid every Friday
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────── APPLY ──────────────────────────── */}
      <section
        id="apply"
        className="bg-white section-viewport w-full scroll-mt-24"
      >
        <div className="content-container w-full">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-10">
            <div className="small:col-span-5 flex flex-col gap-y-5">
              <div className="flex items-center gap-x-3">
                <div className="w-8 h-px bg-brand-green-600" />
                <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                  Apply
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
                Send us a few details.
                <br />
                <span className="italic text-brand-green-700">
                  We&apos;ll be in touch
                </span>{" "}
                within 48 hours
                <span className="text-brand-gold-500">.</span>
              </h2>
              <p className="text-body-sm text-grey-60 leading-relaxed max-w-md">
                No paperwork, no commitment. We just need enough to know who
                to send our agronomist to — and what to bring.
              </p>

              <ul className="mt-2 space-y-3">
                {[
                  ["Reply within", "48 hours"],
                  ["Field visit within", "1 week"],
                  ["First pickup within", "2–3 weeks"],
                ].map(([label, value]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-x-4 p-3 rounded-xl bg-brand-cream-50 border border-grey-10"
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
                  href="tel:+639171234567"
                  className="text-brand-green-700 font-semibold hover:underline"
                >
                  +63 917 123 4567
                </a>{" "}
                — Mon to Sat, 7am–6pm.
              </div>
            </div>

            <form
              action="mailto:farmers@mindanaofreshhub.com"
              method="post"
              encType="text/plain"
              className="small:col-span-7 p-6 xsmall:p-8 rounded-3xl bg-brand-cream-50 border border-grey-10 shadow-soft"
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
                    className="px-4 py-3 rounded-xl bg-white border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
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
                    className="px-4 py-3 rounded-xl bg-white border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Farm location
                  </span>
                  <input
                    name="location"
                    required
                    type="text"
                    placeholder="Barangay, Municipality, Province"
                    className="px-4 py-3 rounded-xl bg-white border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Farm size (hectares)
                  </span>
                  <input
                    name="size"
                    type="text"
                    placeholder="e.g. 1.5"
                    className="px-4 py-3 rounded-xl bg-white border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5 xsmall:col-span-2">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Main crops you grow
                  </span>
                  <input
                    name="crops"
                    required
                    type="text"
                    placeholder="e.g. Mango (Carabao), kangkong, ginger"
                    className="px-4 py-3 rounded-xl bg-white border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition"
                  />
                </label>
                <label className="flex flex-col gap-y-1.5 xsmall:col-span-2">
                  <span className="text-caption font-semibold text-grey-90 uppercase tracking-wider">
                    Anything else we should know? <span className="text-grey-40 normal-case font-normal">(optional)</span>
                  </span>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Typical harvest volume, current buyers, organic certification…"
                    className="px-4 py-3 rounded-xl bg-white border border-grey-20 text-body-sm text-grey-90 placeholder:text-grey-40 focus:outline-none focus:border-brand-green-600 focus:ring-2 focus:ring-brand-green-100 transition resize-none"
                  />
                </label>
              </div>

              <div className="flex flex-col xsmall:flex-row xsmall:items-center justify-between gap-4 mt-6 pt-5 border-t border-grey-20/70">
                <p className="text-caption text-grey-50 max-w-xs">
                  By submitting, you agree to be contacted by our field team.
                  We never share your details.
                </p>
                <button
                  type="submit"
                  className="group inline-flex items-center justify-center gap-x-3 pl-6 pr-4 py-3.5 rounded-full bg-brand-green-700 text-white font-semibold text-body-sm hover:bg-brand-green-800 transition-all shadow-large hover:-translate-y-0.5"
                >
                  Send application
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

      {/* ──────────────────────────── FAQ ──────────────────────────── */}
      <section className="bg-brand-cream-50 section-viewport w-full">
        <div className="content-container w-full">
          <div className="max-w-2xl mb-10">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="w-8 h-px bg-brand-green-600" />
              <span className="text-caption font-semibold text-brand-green-700 uppercase tracking-[0.16em]">
                Common questions
              </span>
            </div>
            <h2 className="font-heading text-[28px] leading-[1.06] small:text-[40px] small:leading-[1.04] text-grey-90 tracking-[-0.02em]">
              Things farmers usually{" "}
              <span className="italic text-brand-green-700">ask first</span>
              <span className="text-brand-gold-500">.</span>
            </h2>
          </div>

          <div className="max-w-3xl divide-y divide-grey-20/70 border-y border-grey-20/70">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-start justify-between gap-x-6 cursor-pointer list-none">
                  <span className="text-body font-semibold text-grey-90 leading-snug">
                    {f.q}
                  </span>
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-grey-20 flex items-center justify-center group-open:bg-brand-green-700 group-open:border-brand-green-700 transition-colors">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-grey-60 group-open:text-white group-open:rotate-45 transition-transform"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 text-body-sm text-grey-60 leading-relaxed pr-12">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
