import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  return (
    <footer className="relative w-full bg-grey-90 text-grey-30 overflow-hidden">
      {/* Top hairline gold accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-gold-400/40 to-transparent" />

      {/* Decorative ambient glow */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-brand-green-700/15 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-32 w-[420px] h-[420px] rounded-full bg-brand-gold-500/8 blur-3xl pointer-events-none"
      />

      <div className="relative content-container flex flex-col w-full">
        {/* Editorial CTA strip at top */}
        <div className="py-12 small:py-16 border-b border-white/8">
          <div className="grid grid-cols-1 small:grid-cols-12 gap-8 items-end">
            <div className="small:col-span-7">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="w-7 h-px bg-brand-gold-400" />
                <span className="text-caption font-semibold text-brand-gold-300 uppercase tracking-[0.18em]">
                  Stay fresh
                </span>
              </div>
              <h2 className="font-heading text-[28px] leading-[1.08] small:text-[42px] small:leading-[1.04] text-white tracking-[-0.02em]">
                Harvest news,{" "}
                <span className="italic text-brand-gold-300">delivered weekly</span>.
              </h2>
              <p className="text-body-sm text-white/60 mt-3 max-w-md leading-relaxed">
                New picks, farm stories, and member-only deals — straight from
                the field to your inbox.
              </p>
            </div>

            <form
              className="small:col-span-5 flex w-full"
              action="#"
            >
              <div className="relative flex w-full bg-white/5 border border-white/15 rounded-full p-1.5 focus-within:border-brand-gold-400/60 focus-within:bg-white/8 transition-all">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 w-full min-w-0 bg-transparent px-4 text-body-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="group shrink-0 inline-flex items-center gap-x-2 pl-4 pr-3 small:pl-5 small:pr-4 py-2.5 rounded-full bg-brand-gold-400 text-grey-90 text-body-sm font-semibold hover:bg-brand-gold-300 transition-colors whitespace-nowrap"
                >
                  Subscribe
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
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 small:grid-cols-12 gap-10 small:gap-12 py-12 small:py-16">
          {/* Brand column */}
          <div className="small:col-span-4 flex flex-col gap-y-5">
            <LocalizedClientLink href="/" className="flex items-center gap-x-2.5">
              <span className="relative w-7 h-7 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                  <path
                    d="M18 2L32.124 10V26L18 34L3.876 26V10L18 2Z"
                    fill="url(#footer-logo-gradient)"
                  />
                  <path
                    d="M18 11L24.928 14.5V21.5L18 25L11.072 21.5V14.5L18 11Z"
                    fill="white"
                    fillOpacity="0.35"
                  />
                  <defs>
                    <linearGradient
                      id="footer-logo-gradient"
                      x1="3.876"
                      y1="2"
                      x2="32.124"
                      y2="34"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#4ade80" />
                      <stop offset="1" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span className="flex items-baseline gap-x-1.5 leading-none">
                <span className="font-heading italic text-[18px] text-white tracking-[-0.01em]">
                  Mindanao
                </span>
                <span className="font-heading text-[18px] text-brand-green-300 tracking-[-0.01em]">
                  Fresh Hub
                </span>
              </span>
            </LocalizedClientLink>
            <p className="text-body-sm text-white/55 leading-relaxed max-w-xs">
              Fresh from Mindanao&apos;s farms. Premium produce, fair prices,
              delivered to your door.
            </p>
            {/* Social */}
            <div className="flex gap-x-2 mt-1">
              {[
                {
                  label: "Facebook",
                  path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                },
                {
                  label: "Instagram",
                  path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-grey-90 hover:bg-brand-gold-300 hover:border-brand-gold-300 transition-all"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="small:col-span-8 grid grid-cols-2 xsmall:grid-cols-3 gap-8 small:gap-12">
            {[
              {
                title: "Shop",
                links: [
                  ["All Products", "/store"],
                  ["Fruits", "/store?category=fruits"],
                  ["Vegetables", "/store?category=vegetables"],
                  ["Bundles", "/store"],
                ],
              },
              {
                title: "Company",
                links: [
                  ["About Us", "/about"],
                  ["How It Works", "/how-it-works"],
                  ["For Farmers", "/farmers"],
                ],
              },
              {
                title: "Support",
                links: [
                  ["My Account", "/account"],
                  ["Track Order", "/account/orders"],
                  ["Privacy Policy", "/content/privacy-policy"],
                  ["Terms of Use", "/content/terms-of-use"],
                ],
              },
            ].map((col) => (
              <div key={col.title} className="flex flex-col gap-y-4">
                <span className="text-caption font-semibold text-brand-gold-300/90 uppercase tracking-[0.16em]">
                  {col.title}
                </span>
                <ul className="flex flex-col gap-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <LocalizedClientLink
                        href={href}
                        className="text-body-sm text-white/65 hover:text-white transition-colors"
                      >
                        {label}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col xsmall:flex-row items-center justify-between gap-3 py-6 border-t border-white/8">
          <span className="text-caption text-white/40">
            &copy; 2026 Mindanao Fresh Hub Corporation. All rights reserved.
          </span>
          <span className="flex items-center gap-x-2 text-caption text-white/40">
            <span className="font-heading italic">Made with care</span>
            <span className="w-1 h-1 rounded-full bg-brand-gold-400" />
            <span>in Mindanao 🇵🇭</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
