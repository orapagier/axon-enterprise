import { Suspense } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AccountButton from "@modules/layout/components/account-button"
import CartButton from "@modules/layout/components/cart-button"
import NotificationButton from "@modules/layout/components/notification-button"
import MobileSearch from "@modules/layout/components/mobile-search"
import NavSearch from "@modules/layout/components/nav-search"
import { getDeliveryHub } from "@lib/util/delivery-hub"
import HubSwitcher from "@modules/hub/components/hub-switcher"
import { listHubs } from "@modules/hub/data/hubs"
import { getHubCookie } from "@modules/hub/actions/set-hub"
import { retrieveCustomer } from "@lib/data/customer"
import { rolesOf } from "@lib/util/roles"

export default async function Nav() {
  const [hub, hubs, currentHubSlug, customer] = await Promise.all([
    getDeliveryHub(),
    listHubs(),
    getHubCookie(),
    retrieveCustomer(),
  ])

  // Producers get a shortcut to post a new listing without drilling into the
  // account dashboard. (Traders buy B2B — they never list, so no shortcut.)
  const roles = rolesOf(customer?.metadata as Record<string, unknown> | null)
  const isProducer = roles.includes("producer")

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
                "url(\"data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjAwIDMwJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J24nPjxmZVR1cmJ1bGVuY2UgdHlwZT0nZnJhY3RhbE5vaXNlJyBiYXNlRnJlcXVlbmN5PScxLjQnIG51bU9jdGF2ZXM9JzInLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbiknLz48L3N2Zz4=\")",
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
            <span className="flex items-center gap-x-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              0910 089 5288
            </span>
            <span className="text-white/15">·</span>
            <span className="flex items-center gap-x-1.5 text-white/55">
              <span className="text-brand-gold-300">₱</span>
              <span className="w-1 h-1 rounded-full bg-brand-green-500" />
              <span>PH</span>
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
              {/* Hexagon whose geometry forms CPT — the angular left half is the
                  C, the right half is carved into P + T (founder initials /
                  Consumer·Producer·Trader). */}
              <span className="relative w-9 h-9 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <span className="absolute inset-0 rounded-full bg-brand-gold-300/0 group-hover:bg-brand-gold-300/25 blur-md transition-all duration-500" />
                <svg width="34" height="34" viewBox="0 0 96 96" fill="none" className="relative drop-shadow-sm">
                  <path
                    d="M48 10 L81 29 L81 67 L48 86 L15 67 L15 29 Z"
                    fill="url(#logo-gradient)"
                  />
                  <g
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M44 28 L25 37 L25 59 L44 68" />
                    <path d="M50 70 L50 28 C66 28 66 49 50 49" />
                    <path d="M55 28 L74 28 M65 28 L65 70" />
                  </g>
                  <defs>
                    <linearGradient
                      id="logo-gradient"
                      x1="0"
                      y1="0"
                      x2="96"
                      y2="96"
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

            {/* Shop — always-visible entry into the full catalog */}
            <LocalizedClientLink
              href="/store"
              className="hidden small:inline-flex items-center gap-x-1.5 ml-5 text-[13px] font-bold text-brand-green-700 hover:text-brand-green-800 transition-colors"
              data-testid="nav-shop-link"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l1.2-4.5A2 2 0 0 1 6.13 3h11.74a2 2 0 0 1 1.93 1.5L21 9" />
                <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
                <path d="M5 11.8V21h14v-9.2" />
                <path d="M9 21v-5h6v5" />
              </svg>
              Shop
            </LocalizedClientLink>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center h-full">
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

              {/* Shop icon (mobile only) — the text link lives next to the brand on larger screens */}
              <LocalizedClientLink
                href="/store"
                aria-label="Browse the store"
                title="Browse the store"
                className="small:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-green-700 hover:text-brand-green-800 hover:bg-grey-5 transition-colors"
                data-testid="nav-shop-link-mobile"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l1.2-4.5A2 2 0 0 1 6.13 3h11.74a2 2 0 0 1 1.93 1.5L21 9" />
                  <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
                  <path d="M5 11.8V21h14v-9.2" />
                  <path d="M9 21v-5h6v5" />
                </svg>
              </LocalizedClientLink>

              {/* Search icon (mobile only) — expands a search row under the header */}
              <MobileSearch />
            </div>

            <span className="hidden small:block w-px h-5 bg-grey-20 mx-2.5" />

            {/* Notifications — bell with dropdown, beside the cart. Opens on
                hover on desktop and on tap on mobile (the panel anchors full
                width under the header on small screens). */}
            <div className="flex items-center mr-0.5">
              <Suspense fallback={null}>
                <NotificationButton />
              </Suspense>
            </div>

            {/* Cart — green icon button (matches the notification bell) */}
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full text-brand-green-700 hover:text-brand-green-800 hover:bg-grey-5 transition-colors"
                  href="/cart"
                  data-testid="nav-cart-link"
                  aria-label="Cart"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>

            {/* Account — rightmost */}
            <div className="flex items-center ml-1">
              <AccountButton isLoggedIn={!!customer} roles={roles} />
            </div>
          </div>
        </nav>

        {/* Refined bottom hairline */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-grey-10/0 via-grey-20/80 to-grey-10/0" />
      </header>

    </div>
  )
}
