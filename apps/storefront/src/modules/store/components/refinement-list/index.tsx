"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  DEFAULT_OFF_PEAK_DELIVERY_FEE_PHP,
  type DeliveryHub,
} from "@lib/util/delivery-hub-types"

type RefinementListProps = {
  search?: boolean
  /** Resolved from the customer's saved address — used to tailor the promo card. */
  hub?: DeliveryHub
}

const categories = [
  { label: "All Products", value: "all", icon: "🛒" },
  { label: "Fruits", value: "fruits", icon: "🥭" },
  { label: "Vegetables", value: "vegetables", icon: "🥬" },
  { label: "Leafy Greens", value: "leafy-greens", icon: "🥗" },
  { label: "Root Crops", value: "root-crops", icon: "🥔" },
  { label: "Herbs & Spices", value: "herbs-spices", icon: "🌿" },
  { label: "Rice & Grains", value: "rice-grains", icon: "🌾" },
  { label: "Fish & Seafood", value: "fish-seafood", icon: "🐟" },
  { label: "Meat & Poultry", value: "meat-poultry", icon: "🍗" },
  { label: "Eggs & Dairy", value: "eggs-dairy", icon: "🥚" },
  { label: "Coconut & Oil", value: "coconut-oil", icon: "🥥" },
  { label: "Dried & Preserved", value: "dried-preserved", icon: "🫙" },
  { label: "Ready-to-Cook", value: "ready-to-cook", icon: "🍳" },
  { label: "Beverages", value: "beverages", icon: "🍵" },
  { label: "Pasalubong", value: "pasalubong", icon: "🎁" },
]

const PRICE_FLOOR = 0
const PRICE_CEILING = 2000

const RefinementList = ({ hub }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get("q") ?? ""
  const urlCategory = searchParams.get("category") ?? "all"
  const urlOriginRaw = searchParams.get("origin") ?? ""
  const urlOrigins = useMemo(
    () => urlOriginRaw.split(",").map((s) => s.trim()).filter(Boolean),
    [urlOriginRaw]
  )
  const urlMin = searchParams.get("min")
  const urlMax = searchParams.get("max")

  const [searchInput, setSearchInput] = useState(urlQuery)
  const [minInput, setMinInput] = useState<string>(urlMin ?? "")
  const [maxInput, setMaxInput] = useState<string>(urlMax ?? "")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    price: true,
    origin: true,
  })

  // Sync local input if URL changes from elsewhere (e.g. browser back/forward)
  useEffect(() => {
    setSearchInput(urlQuery)
  }, [urlQuery])
  useEffect(() => {
    setMinInput(urlMin ?? "")
  }, [urlMin])
  useEffect(() => {
    setMaxInput(urlMax ?? "")
  }, [urlMax])

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams)
      mutate(params)
      // Any filter change resets pagination
      params.delete("page")
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const applySearch = useCallback(
    (value: string) => {
      pushParams((p) => {
        const next = value.trim()
        if (next) p.set("q", next)
        else p.delete("q")
      })
    },
    [pushParams]
  )

  // Debounce URL updates as the user types
  useEffect(() => {
    if (searchInput === urlQuery) return
    const t = setTimeout(() => applySearch(searchInput), 350)
    return () => clearTimeout(t)
  }, [searchInput, urlQuery, applySearch])

  const setCategory = (value: string) => {
    pushParams((p) => {
      if (!value || value === "all") p.delete("category")
      else p.set("category", value)
    })
  }

  const toggleOrigin = (value: string) => {
    const next = urlOrigins.includes(value)
      ? urlOrigins.filter((v) => v !== value)
      : [...urlOrigins, value]
    pushParams((p) => {
      if (next.length === 0) p.delete("origin")
      else p.set("origin", next.join(","))
    })
  }

  const applyPriceRange = useCallback(
    (rawMin: string, rawMax: string) => {
      const minNum = rawMin === "" ? null : Number(rawMin)
      const maxNum = rawMax === "" ? null : Number(rawMax)
      pushParams((p) => {
        if (minNum !== null && !Number.isNaN(minNum) && minNum > PRICE_FLOOR) {
          p.set("min", String(minNum))
        } else {
          p.delete("min")
        }
        if (
          maxNum !== null &&
          !Number.isNaN(maxNum) &&
          maxNum < PRICE_CEILING
        ) {
          p.set("max", String(maxNum))
        } else {
          p.delete("max")
        }
      })
    },
    [pushParams]
  )

  // Debounce price commit
  useEffect(() => {
    if ((minInput || "") === (urlMin ?? "") && (maxInput || "") === (urlMax ?? "")) {
      return
    }
    const t = setTimeout(() => applyPriceRange(minInput, maxInput), 450)
    return () => clearTimeout(t)
  }, [minInput, maxInput, urlMin, urlMax, applyPriceRange])

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (urlCategory !== "all") {
      const cat = categories.find((c) => c.value === urlCategory)
      if (cat)
        chips.push({
          key: `cat-${cat.value}`,
          label: cat.label,
          onRemove: () => setCategory("all"),
        })
    }
    urlOrigins.forEach((o) => {
      const origin = origins.find((or) => or.value === o)
      if (origin)
        chips.push({
          key: `origin-${origin.value}`,
          label: origin.label,
          onRemove: () => toggleOrigin(origin.value),
        })
    })
    if (urlMin || urlMax) {
      const minLabel = urlMin ? `₱${urlMin}` : `₱${PRICE_FLOOR}`
      const maxLabel = urlMax ? `₱${urlMax}` : `₱${PRICE_CEILING}+`
      chips.push({
        key: "price",
        label: `${minLabel} – ${maxLabel}`,
        onRemove: () => {
          setMinInput("")
          setMaxInput("")
          applyPriceRange("", "")
        },
      })
    }
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory, urlOrigins, urlMin, urlMax])

  const clearAll = () => {
    setMinInput("")
    setMaxInput("")
    pushParams((p) => {
      p.delete("category")
      p.delete("origin")
      p.delete("min")
      p.delete("max")
    })
  }

  const SectionHeader = ({
    title,
    sectionKey,
  }: {
    title: string
    sectionKey: string
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex items-center justify-between mb-3 group"
    >
      <span className="text-caption font-semibold text-grey-50 uppercase tracking-[0.08em]">
        {title}
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`text-grey-40 group-hover:text-grey-60 transition-transform duration-200 ${
          openSections[sectionKey] ? "rotate-180" : ""
        }`}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )

  const sidebarContent = (
    <div className="flex flex-col gap-y-7">
      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-caption font-semibold text-grey-50 uppercase tracking-[0.08em]">
              Active filters
            </span>
            <button
              onClick={clearAll}
              className="text-caption font-medium text-brand-green-700 hover:text-brand-green-800 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="inline-flex items-center gap-x-1.5 pl-3 pr-2 py-1 rounded-full bg-brand-green-50 text-brand-green-700 text-caption font-medium border border-brand-green-100 hover:bg-brand-green-100 transition-colors"
              >
                {chip.label}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div>
        <SectionHeader title="Categories" sectionKey="categories" />
        {openSections.categories && (
          <ul className="flex flex-col gap-y-0.5">
            {categories.map((cat) => {
              const active = urlCategory === cat.value
              return (
                <li key={cat.value}>
                  <button
                    onClick={() => setCategory(cat.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-body-sm transition-all duration-150 ${
                      active
                        ? "bg-brand-green-50 text-brand-green-700 font-semibold"
                        : "text-grey-60 hover:text-grey-90 hover:bg-grey-5"
                    }`}
                  >
                    <span className="flex items-center gap-x-2.5">
                      <span className="text-base leading-none">{cat.icon}</span>
                      {cat.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="h-px bg-grey-10" />

      {/* Price Range */}
      <div>
        <SectionHeader title="Price range" sectionKey="price" />
        {openSections.price && (
          <div className="space-y-3">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Any", min: "", max: "" },
                { label: "Under ₱100", min: "", max: "100" },
                { label: "₱100–500", min: "100", max: "500" },
                { label: "₱500+", min: "500", max: "" },
              ].map((preset) => {
                const isActive =
                  (minInput || "") === preset.min && (maxInput || "") === preset.max
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setMinInput(preset.min)
                      setMaxInput(preset.max)
                      applyPriceRange(preset.min, preset.max)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-caption font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-brand-green-600 text-white shadow-soft"
                        : "bg-grey-5 text-grey-60 border border-grey-10 hover:border-grey-30 hover:text-grey-80"
                    }`}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            {/* Custom range inputs */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-x-1 px-2.5 py-2 rounded-lg bg-grey-5 border border-grey-10 focus-within:border-brand-green-300 focus-within:ring-1 focus-within:ring-brand-green-100 transition-all">
                <span className="text-caption text-grey-40 font-medium">₱</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={PRICE_FLOOR}
                  max={PRICE_CEILING}
                  placeholder="Min"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  className="w-full text-caption font-semibold text-grey-80 tabular-nums bg-transparent focus:outline-none placeholder:text-grey-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span className="text-grey-30 text-caption">—</span>
              <div className="flex-1 flex items-center gap-x-1 px-2.5 py-2 rounded-lg bg-grey-5 border border-grey-10 focus-within:border-brand-green-300 focus-within:ring-1 focus-within:ring-brand-green-100 transition-all">
                <span className="text-caption text-grey-40 font-medium">₱</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={PRICE_FLOOR}
                  max={PRICE_CEILING}
                  placeholder="Max"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  className="w-full text-caption font-semibold text-grey-80 tabular-nums bg-transparent focus:outline-none placeholder:text-grey-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-grey-10" />

      {/* Origin */}
      <div>
        <SectionHeader title="Origin" sectionKey="origin" />
        {openSections.origin && (
          <ul className="flex flex-col gap-y-1 px-1">
            {origins.map((origin) => {
              const checked = urlOrigins.includes(origin.value)
              return (
                <li key={origin.value}>
                  <label className="flex items-center gap-x-3 cursor-pointer group py-1.5 px-1 rounded-md hover:bg-grey-5 transition-colors">
                    <span
                      className={`relative w-[18px] h-[18px] rounded-md border-2 flex items-center justify-center transition-all duration-150 ${
                        checked
                          ? "border-brand-green-600 bg-brand-green-600"
                          : "border-grey-30 group-hover:border-brand-green-400 bg-white"
                      }`}
                    >
                      {checked && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOrigin(origin.value)}
                      className="sr-only"
                    />
                    <span
                      className={`text-body-sm transition-colors ${
                        checked
                          ? "text-grey-90 font-medium"
                          : "text-grey-60 group-hover:text-grey-80"
                      }`}
                    >
                      {origin.label}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Delivery promo card — copy adapts to the customer's resolved hub */}
      {hub && !hub.isHubCity ? (
        <div className="rounded-xl bg-gradient-to-br from-grey-90 to-grey-90 p-5 text-white relative overflow-hidden border border-brand-gold-400/30">
          <div
            aria-hidden
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-brand-gold-400/15 blur-2xl"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full bg-white/10 text-brand-gold-300 text-[10px] font-bold uppercase tracking-wider mb-3 border border-brand-gold-400/40">
              No hub yet
            </div>
            <p className="text-body-sm font-semibold leading-snug mb-2">
              We don&apos;t have a hub in {hub.city} yet.
            </p>
            <p className="text-caption text-white/70 leading-relaxed mb-3">
              We&apos;re expanding city by city. If you&apos;d like to bring the
              Hub to {hub.city}, we&apos;d love to talk about partnership.
            </p>
            <LocalizedClientLink
              href="/partner-hub"
              className="inline-flex items-center gap-x-1.5 text-caption font-semibold text-brand-gold-300 hover:text-brand-gold-200 underline-offset-4 hover:underline"
            >
              Become a partner hub
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </LocalizedClientLink>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-gradient-to-br from-brand-green-700 to-brand-green-900 p-5 text-white relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-brand-gold-400/20 blur-2xl"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-x-1.5 px-2 py-0.5 rounded-full bg-brand-gold-400 text-grey-90 text-[10px] font-bold uppercase tracking-wider mb-3">
              Free Delivery
            </div>
            <p className="text-body-sm font-semibold leading-snug mb-2">
              Free delivery in {hub?.city ?? "your hub city"} — one batch a
              day at 4 PM.
            </p>
            <p className="text-caption text-white/70 leading-relaxed">
              Order by 12 PM to make today&apos;s dispatch. After cut-off, a
              flat ₱{DEFAULT_OFF_PEAK_DELIVERY_FEE_PHP} delivery fee applies —
              roughly the one-way fare from your address to our hub.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile filter bar */}
      <div className="small:hidden flex items-center justify-between mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-x-2 px-4 py-2.5 bg-white rounded-xl shadow-soft border border-grey-10 text-body-sm font-medium text-grey-80 hover:shadow-medium transition-shadow"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Filters
          {activeFilters.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-green-600 text-white text-[10px] font-bold">
              {activeFilters.length}
            </span>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] small:hidden">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full xsmall:w-96 bg-white shadow-xl animate-slide-in-right">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-grey-10">
                <h2 className="font-heading text-h2 text-grey-90">Sort & Filter</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-grey-5"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">{sidebarContent}</div>
              <div className="p-6 border-t border-grey-10 flex gap-3 bg-grey-5">
                <button
                  onClick={clearAll}
                  className="flex-1 py-3 rounded-xl border border-grey-20 bg-white text-body-sm font-medium text-grey-70 hover:bg-grey-10 transition-colors"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex-[2] py-3 rounded-xl bg-brand-green-600 text-white text-body-sm font-semibold hover:bg-brand-green-700 transition-colors shadow-soft"
                >
                  Show results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden small:block small:min-w-[260px] small:max-w-[260px] small:sticky small:top-24 small:self-start">
        <div className="bg-white rounded-2xl shadow-soft p-5 border border-grey-10/60">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-grey-10">
            <div className="flex items-center gap-x-2.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-green-50 border border-brand-green-100">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#15803d"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </span>
              <div className="flex flex-col leading-none">
                <span className="font-heading font-bold text-body text-grey-90 tracking-[-0.005em]">
                  Sort &amp; Filter
                </span>
                <span className="text-[9px] uppercase tracking-[0.18em] text-brand-gold-700/70 font-semibold mt-1">
                  Curate your basket
                </span>
              </div>
            </div>
            {activeFilters.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-brand-green-700 text-white text-[10px] font-bold">
                {activeFilters.length}
              </span>
            )}
          </div>
          {sidebarContent}
        </div>
      </aside>
    </>
  )
}

export default RefinementList
