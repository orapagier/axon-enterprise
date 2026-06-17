"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import useToggleState from "@lib/hooks/use-toggle-state"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text, clx } from "@modules/common/components/ui"
import { Fragment } from "react"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { Locale } from "@lib/data/locales"

const BaseMenuItems = [
  { name: "Shop", href: "/store", icon: "store" },
  { name: "How It Works", href: "/how-it-works", icon: "info" },
  { name: "For Farmers", href: "/farmers", icon: "leaf" },
  { name: "About Us", href: "/about", icon: "heart" },
  { name: "Account", href: "/account", icon: "user" },
  { name: "Cart", href: "/cart", icon: "bag" },
]

const MenuIcon = ({ type }: { type: string }) => {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (type) {
    case "store":
      return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    case "info":
      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
    case "leaf":
      return <svg {...props}><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75"/></svg>
    case "heart":
      return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case "user":
      return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    case "bag":
      return <svg {...props}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
    case "plus":
      return <svg {...props} strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    default:
      return null
  }
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  isProducer?: boolean
}

const SideMenu = ({ regions, locales, currentLocale, isProducer }: SideMenuProps) => {
  const SideMenuItems = isProducer
    ? [
        {
          name: "Sell",
          href: "/account/producer/listings/new",
          icon: "plus",
        },
        ...BaseMenuItems,
      ]
    : BaseMenuItems
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative h-full flex items-center justify-center w-10 h-10 rounded-full text-grey-50 hover:text-grey-80 hover:bg-grey-5 transition-all duration-200 focus:outline-none"
                  aria-label="Open menu"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="16" y2="17" />
                  </svg>
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/25 backdrop-blur-sm pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <PopoverPanel className="fixed right-0 top-0 bottom-0 w-full xsmall:w-[340px] z-[51] bg-white shadow-xl">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-grey-10/80">
                      <div className="flex items-center gap-x-2.5">
                        {/* CPT monogram */}
                        <svg width="32" height="32" viewBox="6 6 84 84" fill="none">
                          <g fill="none" stroke="url(#mobile-logo-gradient)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M35 24 A24 24 0 1 0 35 72" />
                            <path d="M35 72 L35 24 C59 24 59 48 35 48" />
                            <path d="M53 24 L85 24 M69 24 L69 72" />
                          </g>
                          <defs>
                            <linearGradient id="mobile-logo-gradient" x1="6" y1="6" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#22c55e" />
                              <stop offset="1" stopColor="#15803d" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="flex flex-col leading-none">
                          <span className="text-[14px] font-bold text-grey-90 tracking-[-0.01em] leading-tight">Mindanao</span>
                          <span className="text-[11px] font-semibold text-brand-green-600 tracking-[0.02em] leading-tight">FRESH HUB</span>
                        </div>
                      </div>
                      <button
                        data-testid="close-menu-button"
                        onClick={close}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-grey-5 transition-colors text-grey-40 hover:text-grey-70"
                      >
                        <XMark />
                      </button>
                    </div>

                    {/* Nav items */}
                    <div className="flex-1 overflow-y-auto py-3 px-3">
                      <ul className="flex flex-col">
                        {SideMenuItems.map((item) => (
                          <li key={item.name}>
                            <LocalizedClientLink
                              href={item.href}
                              className="flex items-center gap-x-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-medium text-grey-60 hover:text-grey-90 hover:bg-grey-5/80 transition-all duration-150"
                              onClick={close}
                              data-testid={`${item.name.toLowerCase().replace(/\s+/g, "-")}-link`}
                            >
                              <span className="text-grey-40">
                                <MenuIcon type={item.icon} />
                              </span>
                              {item.name}
                            </LocalizedClientLink>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 border-t border-grey-10/80 space-y-3">
                      {!!locales?.length && (
                        <div
                          className="flex justify-between items-center py-1.5 text-[13px] text-grey-50"
                          onMouseEnter={languageToggleState.open}
                          onMouseLeave={languageToggleState.close}
                        >
                          <LanguageSelect
                            toggleState={languageToggleState}
                            locales={locales}
                            currentLocale={currentLocale}
                          />
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150 text-grey-30",
                              languageToggleState.state ? "-rotate-90" : ""
                            )}
                          />
                        </div>
                      )}
                      <div
                        className="flex justify-between items-center py-1.5 text-[13px] text-grey-50"
                        onMouseEnter={countryToggleState.open}
                        onMouseLeave={countryToggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={countryToggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150 text-grey-30",
                            countryToggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="text-[11px] text-grey-30 pt-1">
                        &copy; {new Date().getFullYear()} Mindanao Fresh Hub Corporation
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
