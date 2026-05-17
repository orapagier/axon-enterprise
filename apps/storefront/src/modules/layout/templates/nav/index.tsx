import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Premium gold accent line */}
      <div className="h-[2px] bg-gradient-to-r from-brand-gold-400 via-brand-gold-500 to-brand-gold-400" />

      <header className="relative h-[76px] mx-auto bg-white/95 backdrop-blur-2xl border-b border-grey-20/60 shadow-soft">
        <nav className="content-container flex items-center justify-between w-full h-full">
          {/* Left: Brand */}
          <div className="flex-1 basis-0 h-full flex items-center">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-3 group"
              data-testid="nav-store-link"
            >
              {/* Hexagon logo mark */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 36 36" fill="none" className="absolute inset-0 drop-shadow-sm">
                  <path
                    d="M18 2L32.124 10V26L18 34L3.876 26V10L18 2Z"
                    fill="url(#logo-gradient)"
                  />
                  <path
                    d="M18 9L25.794 13.5V22.5L18 27L10.206 22.5V13.5L18 9Z"
                    fill="white"
                    fillOpacity="0.25"
                  />
                  <defs>
                    <linearGradient id="logo-gradient" x1="3.876" y1="2" x2="32.124" y2="34" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#22c55e" />
                      <stop offset="1" stopColor="#15803d" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* Brand text */}
              <span className="hidden xsmall:inline text-[24px] font-brand tracking-[-0.01em]">
                <span className="text-[#0038A8]">Mindanao</span>{" "}
                <span className="text-brand-green-600">Fresh Hub</span>
              </span>
              <span className="text-[20px] font-brand tracking-[-0.01em] flex xsmall:hidden">
                <span className="text-[#0038A8]">M</span>
                <span className="text-brand-green-600">FH</span>
              </span>
            </LocalizedClientLink>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden small:flex items-center h-full">
            <div className="flex items-center bg-grey-5/80 rounded-full px-1.5 py-1.5 border border-grey-10">
              <LocalizedClientLink href="/store" className="nav-pill">
                Shop
              </LocalizedClientLink>
              <LocalizedClientLink href="/how-it-works" className="nav-pill">
                How It Works
              </LocalizedClientLink>
              <LocalizedClientLink href="/farmers" className="nav-pill">
                For Farmers
              </LocalizedClientLink>
              <LocalizedClientLink href="/about" className="nav-pill">
                About
              </LocalizedClientLink>
            </div>
          </div>

          {/* Right: Search, Account, Cart, Mobile Menu */}
          <div className="flex items-center gap-x-2 h-full flex-1 basis-0 justify-end">
            {/* Search icon */}
            <LocalizedClientLink
              className="hidden small:flex items-center justify-center w-10 h-10 rounded-full text-grey-40 hover:text-brand-green-600 hover:bg-brand-green-50 border border-transparent hover:border-brand-green-100 transition-all duration-200"
              href="/store"
              aria-label="Search products"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </LocalizedClientLink>

            {/* Account icon - desktop */}
            <LocalizedClientLink
              className="hidden small:flex items-center justify-center w-10 h-10 rounded-full text-grey-40 hover:text-brand-green-600 hover:bg-brand-green-50 border border-transparent hover:border-brand-green-100 transition-all duration-200"
              href="/account"
              data-testid="nav-account-link"
              aria-label="Account"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </LocalizedClientLink>

            {/* Divider */}
            <div className="hidden small:block w-px h-6 bg-gradient-to-b from-transparent via-grey-20 to-transparent mx-1" />

            {/* Cart */}
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="flex items-center justify-center w-10 h-10 rounded-full text-grey-40 hover:text-brand-green-600 hover:bg-brand-green-50 border border-transparent hover:border-brand-green-100 transition-all duration-200 relative"
                  href="/cart"
                  data-testid="nav-cart-link"
                  aria-label="Cart"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>

            {/* Mobile hamburger menu */}
            <div className="small:hidden h-full flex items-center">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
