import { Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Hexagon from "@modules/common/icons/hexagon"

export default async function Footer() {
  return (
    <footer className="w-full bg-grey-90 text-grey-30">
      <div className="content-container flex flex-col w-full">
        {/* Main footer content */}
        <div className="flex flex-col gap-y-12 xsmall:flex-row items-start justify-between py-16 small:py-20">
          {/* Brand + tagline + social */}
          <div className="flex flex-col gap-y-5 max-w-xs">
            <LocalizedClientLink
              href="/"
              className="flex items-center gap-x-2.5"
            >
              <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-green-600/20">
                <Hexagon size="18" color="#4ade80" />
              </div>
              <span className="text-body-lg font-bold text-white tracking-tight">
                Mindanao Fresh Hub
              </span>
            </LocalizedClientLink>
            <Text className="text-body-sm text-grey-40 leading-relaxed">
              Fresh from Mindanao&apos;s farms. Premium produce, fair prices,
              delivered to your door.
            </Text>
            {/* Social icons */}
            <div className="flex gap-x-3 mt-1">
              <a
                href="#"
                aria-label="Facebook"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-grey-80 hover:bg-grey-70 text-grey-40 hover:text-white transition-all duration-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-grey-80 hover:bg-grey-70 text-grey-40 hover:text-white transition-all duration-200"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="gap-10 md:gap-x-16 grid grid-cols-2 xsmall:grid-cols-3">
            {/* Shop */}
            <div className="flex flex-col gap-y-4">
              <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">
                Shop
              </span>
              <ul className="flex flex-col gap-y-3">
                <li>
                  <LocalizedClientLink href="/store" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    All Products
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/store" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    Fruits
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/store" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    Vegetables
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/store" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    Bundles
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="flex flex-col gap-y-4">
              <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">
                Company
              </span>
              <ul className="flex flex-col gap-y-3">
                <li>
                  <LocalizedClientLink href="/about" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    About Us
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/how-it-works" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    How It Works
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/farmers" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    For Farmers
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="flex flex-col gap-y-4">
              <span className="text-caption font-semibold text-grey-40 uppercase tracking-wider">
                Support
              </span>
              <ul className="flex flex-col gap-y-3">
                <li>
                  <LocalizedClientLink href="/account" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    My Account
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/account/orders" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    Track Order
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/content/privacy-policy" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    Privacy Policy
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink href="/content/terms-of-use" className="text-body-sm text-grey-30 hover:text-white transition-colors duration-200">
                    Terms of Use
                  </LocalizedClientLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-grey-80 py-10">
          <div className="flex flex-col xsmall:flex-row items-start xsmall:items-center justify-between gap-6">
            <div>
              <Text className="text-body font-semibold text-white">
                Stay fresh — get updates
              </Text>
              <Text className="text-body-sm text-grey-40 mt-1">
                New products, farm stories, and exclusive deals in your inbox.
              </Text>
            </div>
            <form className="flex w-full xsmall:w-auto" action="#">
              <input
                type="email"
                placeholder="Your email"
                className="border border-grey-70 bg-grey-80 rounded-l-xl px-4 py-3 text-body-sm text-white placeholder:text-grey-50 focus:outline-none focus:border-brand-green-500 w-full xsmall:w-64 transition-colors"
              />
              <button
                type="submit"
                className="bg-brand-green-600 text-white px-6 py-3 rounded-r-xl text-body-sm font-semibold hover:bg-brand-green-500 transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex flex-col xsmall:flex-row items-center justify-between gap-4 py-8 border-t border-grey-80">
          <Text className="text-caption text-grey-50">
            &copy; 2026 Mindanao Fresh Hub Corporation. All rights reserved.
          </Text>
          <Text className="text-caption text-grey-50">
            Made with care in Mindanao 🇵🇭
          </Text>
        </div>
      </div>
    </footer>
  )
}
