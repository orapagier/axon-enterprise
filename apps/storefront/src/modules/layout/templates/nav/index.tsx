import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import NavSearch from "@modules/layout/components/nav-search"
import SideMenu from "@modules/layout/components/side-menu"
import { getDeliveryHub } from "@lib/util/delivery-hub"
import HubSwitcher from "@modules/hub/components/hub-switcher"
import { listHubs } from "@modules/hub/data/hubs"
import { getHubCookie } from "@modules/hub/actions/set-hub"
import { retrieveCustomer } from "@lib/data/customer"

export default async function Nav() {
  const [regions, locales, currentLocale, hub, hubs, currentHubSlug, customer] =
    await Promise.all([
      listRegions().then((regions: StoreRegion[]) => regions),
      listLocales(),
      getLocale(),
      getDeliveryHub(),
      listHubs(),
      getHubCookie(),
      retrieveCustomer(),
    ])

  // Producer/trader accounts (incl. legacy "seller") get a shortcut to post a
  // new listing without drilling into the account dashboard.
  const accountType = customer?.metadata?.account_type as string | undefined
  const isProducer =
    accountType === "producer" ||
    accountType === "trader" ||
    accountType === "seller"

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Announcement strip — deep black with gold accents */}
      <div className="hidden xsmall:block relative bg-[#0b0d10] text-white/85 overflow-hidden">
        {/* Subtle horizontal gold shimmer line */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-y-0 left-0 right-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 30' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
            }}
          />
        </div>
        <div className="relative content-container flex items-center justify-between h-9 text-[11px]">
          <div className="flex items-center gap-x-2.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold-400 opacity-70" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-gold-400" />
            </span>
            <span className="font-medium tracking-[0.06em]">
              {hub.isHubCity ? (
                <>
                  <span className="text-white/90">Free delivery in</span>
                  <span className="text-brand-gold-300 font-semibold ml-1">
                    {hub.city}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-white/90">No hub in</span>
                  <span className="text-brand-gold-300 font-semibold ml-1">
                    {hub.city}
                  </span>
                  <span className="text-white/40 ml-1">yet · coming soon</span>
                </>
              )}
            </span>
            <span className="hidden small:inline-flex items-center gap-x-2 ml-3 pl-3 border-l border-white/15 text-white/50">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Order by 12 PM · dispatched daily at 4 PM</span>
            </span>
          </div>
          <div className="hidden small:flex items-center gap-x-5 text-white/55 text-[10.5px] tracking-[0.08em] uppercase">
            <HubSwitcher hubs={hubs} currentSlug={currentHubSlug} />
            <span className="text-white/15">·</span>
            <LocalizedClientLink
              href="/account"
              className="hover:text-brand-gold-300 transition-colors flex items-center gap-x-1.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="13" rx="2" />
                <path d="M16 3v4M8 3v4M3 13h18" />
              </svg>
              Track order
            </LocalizedClientLink>
            <span className="text-white/15">·</span>
            <LocalizedClientLink
              href="/how-it-works"
              className="hover:text-brand-gold-300 transition-colors"
            >
              How it works
            </LocalizedClientLink>
            <span className="text-white/15">·</span>
            <span className="flex items-center gap-x-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              0910 089 5288
            </span>
          </div>
        </div>
        {/* Top metallic gold line */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-gold-400/40 to-transparent" />
      </div>

      {/* Main header — refined cream-tinted with depth */}
      <header
        className="relative h-[68px] mx-auto bg-[#fdfcf8]/95 backdrop-blur-xl"
        style={{
          boxShadow:
            "inset 0 1px 0 0 rgba(202, 138, 4, 0.18), 0 1px 0 0 rgba(15, 23, 42, 0.06), 0 8px 32px -16px rgba(15, 23, 42, 0.08)",
        }}
      >
        {/* Soft gold gradient on top edge */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold-400/60 to-transparent" />

        <nav className="content-container flex items-center justify-between w-full h-full">
          {/* Left: Brand */}
          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-3 group"
              data-testid="nav-store-link"
            >
              {/* Hexagon mark with gold halo on hover */}
              <span className="relative w-8 h-8 flex items-center justify-center transition-transform duration-500 group-hover:rotate-[10deg]">
                <span className="absolute inset-0 rounded-full bg-brand-gold-300/0 group-hover:bg-brand-gold-300/30 blur-md transition-all duration-500" />
                <svg width="30" height="30" viewBox="0 0 36 36" fill="none" className="relative drop-shadow-sm">
                  <path
                    d="M18 2L32.124 10V26L18 34L3.876 26V10L18 2Z"
                    fill="url(#logo-gradient)"
                  />
                  <path
                    d="M18 11L24.928 14.5V21.5L18 25L11.072 21.5V14.5L18 11Z"
                    fill="white"
                    fillOpacity="0.45"
                  />
                  {/* Gold inner glint */}
                  <circle cx="18" cy="18" r="2" fill="#fde047" fillOpacity="0.8" />
                  <defs>
                    <linearGradient
                      id="logo-gradient"
                      x1="3.876"
                      y1="2"
                      x2="32.124"
                      y2="34"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#22c55e" />
                      <stop offset="1" stopColor="#14532d" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>

              {/* Brand lockup with tagline */}
              <div className="hidden xsmall:flex flex-col leading-none">
                <span className="flex items-baseline gap-x-1.5">
                  <span className="font-heading italic font-bold text-[20px] text-grey-90 tracking-[-0.015em]">
                    Mindanao
                  </span>
                  <span className="font-heading font-bold text-[20px] text-brand-green-700 tracking-[-0.015em]">
                    Fresh Hub
                  </span>
                </span>
                <span className="mt-1 text-[9px] uppercase tracking-[0.32em] text-brand-gold-700/70 font-semibold">
                  Farm to Table · Est. 2026
                </span>
              </div>
              <span className="xsmall:hidden font-heading italic font-bold text-[19px] text-grey-90 tracking-[-0.012em]">
                MFH
              </span>
            </LocalizedClientLink>

            {/* Tall vertical divider with gold tip */}
            <span className="hidden small:flex flex-col items-center ml-6">
              <span className="w-px h-3 bg-grey-20" />
              <span className="w-1 h-1 rounded-full bg-brand-gold-400/70 my-0.5" />
              <span className="w-px h-3 bg-grey-20" />
            </span>
          </div>

          {/* Center: Nav links with refined hover */}
          <div className="hidden small:flex items-center h-full absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-x-0.5">
              <LocalizedClientLink href="/store" className="nav-link-premium">
                Shop
              </LocalizedClientLink>
              <LocalizedClientLink href="/how-it-works" className="nav-link-premium">
                How it works
              </LocalizedClientLink>
              <LocalizedClientLink href="/farmers" className="nav-link-premium">
                Farmers
              </LocalizedClientLink>
              <LocalizedClientLink href="/about" className="nav-link-premium">
                About
              </LocalizedClientLink>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center h-full">
            {/* Currency / region chip */}
            <span className="hidden large:inline-flex items-center gap-x-1.5 px-3 py-1.5 mr-3 rounded-full bg-white border border-grey-10 text-[10px] font-semibold text-grey-70 uppercase tracking-[0.12em] shadow-soft">
              <span className="w-1 h-1 rounded-full bg-brand-green-500" />
              <span>PH</span>
              <span className="text-grey-30">·</span>
              <span className="text-brand-gold-700">₱</span>
            </span>

            {/* Inline search with results dropdown */}
            <NavSearch />

            <div className="flex items-center gap-x-0.5 ml-2">
              {/* Producer shortcut: start a new listing */}
              {isProducer && (
                <LocalizedClientLink
                  className="hidden small:inline-flex items-center gap-x-1.5 h-9 pl-2.5 pr-3 rounded-full bg-brand-green-50 hover:bg-brand-green-100 text-brand-green-800 border border-brand-green-100 text-[12px] font-semibold transition-all"
                  href="/account/producer/listings/new"
                  data-testid="nav-sell-link"
                  aria-label="Sell a product"
                  title="Sell a product"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Sell</span>
                </LocalizedClientLink>
              )}

              {/* Account */}
              <LocalizedClientLink
                className="hidden small:flex items-center justify-center w-9 h-9 rounded-full text-grey-60 hover:text-grey-90 hover:bg-grey-5 transition-all"
                href="/account"
                data-testid="nav-account-link"
                aria-label="Account"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </LocalizedClientLink>
            </div>

            <span className="hidden small:block w-px h-5 bg-grey-20 mx-2.5" />

            {/* Cart — brand-green premium pill */}
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="group relative inline-flex items-center gap-x-2 pl-3 pr-4 py-2 rounded-full bg-brand-green-700 text-white hover:bg-brand-green-800 transition-all shadow-soft ring-1 ring-brand-green-800/40"
                  href="/cart"
                  data-testid="nav-cart-link"
                  aria-label="Cart"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-gold-300">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <span className="text-body-sm font-semibold tracking-wide">
                    Bag
                  </span>
                  <span className="w-px h-3.5 bg-white/20" />
                  <span className="text-body-sm font-bold tabular-nums text-brand-gold-300">
                    0
                  </span>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>

            {/* Mobile menu */}
            <div className="small:hidden h-full flex items-center ml-1">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
                isProducer={isProducer}
              />
            </div>
          </div>
        </nav>

        {/* Refined bottom hairline */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-grey-10/0 via-grey-20/80 to-grey-10/0" />
      </header>
    </div>
  )
}
