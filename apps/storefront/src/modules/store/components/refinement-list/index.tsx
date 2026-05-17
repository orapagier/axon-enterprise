"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"

import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  'data-testid'?: string
}

const categories = [
  { label: "All Products", value: "all" },
  { label: "Vegetables", value: "vegetables" },
  { label: "Fruits", value: "fruits" },
  { label: "Herbs", value: "herbs" },
  { label: "Root Crops", value: "root-crops" },
  { label: "Leafy Greens", value: "leafy-greens" },
  { label: "Fish", value: "fish" },
]

const origins = [
  { label: "Bukidnon", value: "bukidnon" },
  { label: "Davao", value: "davao" },
  { label: "Cagayan de Oro", value: "cdo" },
  { label: "General Santos", value: "gensan" },
  { label: "Zamboanga", value: "zamboanga" },
]

const RefinementList = ({ sortBy, 'data-testid': dataTestId }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeCategory, setActiveCategory] = useState("all")
  const [mobileOpen, setMobileOpen] = useState(false)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`)
  }

  const sidebarContent = (
    <div className="flex flex-col gap-y-8">
      {/* Categories */}
      <div>
        <h3 className="text-caption font-semibold text-grey-40 uppercase tracking-wider mb-3 px-1">
          Categories
        </h3>
        <ul className="flex flex-col gap-y-1">
          {categories.map((cat) => (
            <li key={cat.value}>
              <button
                onClick={() => setActiveCategory(cat.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-body-sm transition-colors duration-150 ${
                  activeCategory === cat.value
                    ? "bg-brand-green-50 text-brand-green-700 font-medium"
                    : "text-grey-60 hover:text-grey-80 hover:bg-grey-5"
                }`}
              >
                {cat.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Sort */}
      <div>
        <h3 className="text-caption font-semibold text-grey-40 uppercase tracking-wider mb-3 px-1">
          Sort by
        </h3>
        <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />
      </div>

      {/* Price Range (visual only) */}
      <div>
        <h3 className="text-caption font-semibold text-grey-40 uppercase tracking-wider mb-3 px-1">
          Price Range
        </h3>
        <div className="px-1">
          <div className="flex items-center justify-between text-caption text-grey-50 mb-2">
            <span>₱0</span>
            <span>₱2,000</span>
          </div>
          <div className="relative h-1.5 bg-grey-10 rounded-full">
            <div className="absolute left-[10%] right-[30%] h-full bg-brand-green-500 rounded-full" />
            <div className="absolute left-[10%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-brand-green-500 rounded-full shadow-soft" />
            <div className="absolute right-[30%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-brand-green-500 rounded-full shadow-soft" />
          </div>
          <div className="flex items-center justify-between text-body-sm text-grey-70 mt-3 font-medium">
            <span>₱100</span>
            <span>₱1,400</span>
          </div>
        </div>
      </div>

      {/* Origin (visual only) */}
      <div>
        <h3 className="text-caption font-semibold text-grey-40 uppercase tracking-wider mb-3 px-1">
          Origin
        </h3>
        <ul className="flex flex-col gap-y-2 px-1">
          {origins.map((origin) => (
            <li key={origin.value}>
              <label className="flex items-center gap-x-3 cursor-pointer group">
                <div className="w-4.5 h-4.5 w-[18px] h-[18px] rounded border border-grey-30 group-hover:border-brand-green-500 transition-colors flex items-center justify-center">
                </div>
                <span className="text-body-sm text-grey-60 group-hover:text-grey-80 transition-colors">
                  {origin.label}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile filter button */}
      <div className="small:hidden mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-x-2 px-4 py-2.5 bg-white rounded-xl shadow-soft border border-grey-10 text-body-sm font-medium text-grey-70 hover:shadow-medium transition-shadow"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          Filters
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] small:hidden">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full xsmall:w-80 bg-white shadow-xl animate-slide-in-right">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-grey-10">
                <h2 className="text-h3 text-grey-90">Filters</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-grey-5"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {sidebarContent}
              </div>
              <div className="p-6 border-t border-grey-10 flex gap-3">
                <button className="flex-1 py-3 rounded-xl border border-grey-20 text-body-sm font-medium text-grey-60 hover:bg-grey-5 transition-colors">
                  Clear all
                </button>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-brand-green-600 text-white text-body-sm font-medium hover:bg-brand-green-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden small:block small:min-w-[280px] small:max-w-[280px] small:sticky small:top-26 small:self-start">
        <div className="bg-white rounded-2xl shadow-soft p-6 border border-grey-10/50">
          {sidebarContent}
        </div>
      </div>
    </>
  )
}

export default RefinementList
