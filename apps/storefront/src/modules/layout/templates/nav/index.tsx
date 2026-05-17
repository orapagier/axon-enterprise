import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import Hexagon from "@modules/common/icons/hexagon"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-white border-ui-border-base">
        <nav className="content-container txt-xsmall-plus text-ui-fg-subtle flex items-center justify-between w-full h-full text-small-regular">
          {/* Left: Brand */}
          <div className="flex-1 basis-0 h-full flex items-center">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-2 hover:text-ui-fg-base"
              data-testid="nav-store-link"
            >
              <Hexagon size="20" color="#16a34a" />
              <span className="txt-compact-xlarge-plus font-semibold text-grey-80 hidden xsmall:inline">
                Mindanao Fresh Hub
              </span>
              <span className="txt-compact-large-plus font-semibold text-grey-80 inline xsmall:hidden">
                Fresh Hub
              </span>
            </LocalizedClientLink>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden small:flex items-center gap-x-8 h-full">
            <LocalizedClientLink
              href="/store"
              className="txt-compact-small-plus hover:text-ui-fg-base transition-colors"
            >
              Shop
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/how-it-works"
              className="txt-compact-small-plus hover:text-ui-fg-base transition-colors"
            >
              How It Works
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/farmers"
              className="txt-compact-small-plus hover:text-ui-fg-base transition-colors"
            >
              For Farmers
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/about"
              className="txt-compact-small-plus hover:text-ui-fg-base transition-colors"
            >
              About Us
            </LocalizedClientLink>
          </div>

          {/* Right: Account, Cart, Mobile Menu */}
          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-ui-fg-base"
                href="/account"
                data-testid="nav-account-link"
              >
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ui-fg-base flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
            {/* Mobile hamburger menu */}
            <div className="small:hidden h-full">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>
          </div>
        </nav>
      </header>
    </div>
  )
}
