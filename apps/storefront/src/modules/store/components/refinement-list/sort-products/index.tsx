"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

const sortOptions: { value: SortOptions; label: string }[] = [
  {
    value: "created_at",
    label: "Latest Arrivals",
  },
  {
    value: "price_asc",
    label: "Price: Low → High",
  },
  {
    value: "price_desc",
    label: "Price: High → Low",
  },
]

/**
 * Self-contained sort control for the store grid. Reads the active sort from
 * the `sortBy` search param and writes it back on selection — the store page is
 * a server component keyed on `sortBy`, so pushing the param re-renders the grid
 * with the new order. (Previously this component was orphaned and the grid just
 * showed a static, non-interactive "Latest Arrivals" pill.)
 */
const SortProducts = ({
  sortBy = "created_at",
  "data-testid": dataTestId,
}: {
  sortBy?: SortOptions
  "data-testid"?: string
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current =
    sortOptions.find((o) => o.value === sortBy) ?? sortOptions[0]

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const select = (value: SortOptions) => {
    const params = new URLSearchParams(searchParams)
    // "created_at" is the default — keep the URL clean rather than pinning it.
    if (value === "created_at") params.delete("sortBy")
    else params.set("sortBy", value)
    // Any sort change resets pagination.
    params.delete("page")
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setOpen(false)
  }

  return (
    <div className="relative shrink-0" ref={ref} data-testid={dataTestId}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid="sort-by-container"
        className="inline-flex items-center gap-x-1.5 px-3.5 py-2 rounded-full bg-white border border-grey-20 text-grey-90 font-semibold text-body-sm shadow-soft hover:border-grey-30 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand-green-600"
        >
          <path d="M3 6h18M7 12h10m-7 6h4" />
        </svg>
        {current.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-grey-40 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-52 rounded-2xl bg-white border border-grey-10 shadow-large p-1.5 animate-fade-in-top"
        >
          {sortOptions.map((opt) => {
            const active = opt.value === current.value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(opt.value)}
                className={`w-full flex items-center justify-between gap-x-2 px-3 py-2 rounded-xl text-body-sm transition-colors ${
                  active
                    ? "bg-brand-green-50 text-brand-green-700 font-semibold"
                    : "text-grey-70 hover:bg-grey-5"
                }`}
              >
                {opt.label}
                {active && (
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SortProducts
