"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useParams, useRouter } from "next/navigation"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { searchProducts, type SearchHit } from "@lib/data/search"
import { resolveImageSrc } from "@lib/util/image-url"

export default function NavSearch({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile"
}) {
  const router = useRouter()
  const params = useParams()
  const countryCode = (params?.countryCode as string) ?? "ph"

  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchHit[]>([])
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const hits = await searchProducts(q, countryCode)
        setResults(hits)
      })
    }, 220)
    return () => clearTimeout(t)
  }, [query, countryCode])

  // Close on click outside / Escape
  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setOpen(false)
    router.push(`/${countryCode}/store?q=${encodeURIComponent(q)}`)
  }

  const showDropdown = open && (query.trim().length >= 2 || results.length > 0)

  return (
    <div
      ref={containerRef}
      className={
        variant === "mobile"
          ? "relative w-full"
          : "relative hidden small:block w-[220px] focus-within:w-[320px] transition-[width] duration-300 ease-out"
      }
    >
      <form onSubmit={submit} role="search" className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-50">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search..."
          autoComplete="off"
          aria-label="Search products"
          className="w-full h-9 pl-9 pr-9 rounded-full bg-grey-5 border border-grey-10 text-[13px] text-grey-90 placeholder:text-grey-40 focus:outline-none focus:bg-white focus:border-grey-90 focus:ring-2 focus:ring-grey-90/5 transition-all [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("")
              setResults([])
              inputRef.current?.focus()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-grey-40 hover:text-grey-80 hover:bg-grey-10 transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {!query && (
          <span className="hidden medium:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-x-1 px-1.5 py-0.5 rounded border border-grey-20 bg-white text-[9px] uppercase tracking-wider text-grey-50 font-semibold pointer-events-none">
            ⌘ K
          </span>
        )}
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] bg-white rounded-2xl shadow-large border border-grey-10 overflow-hidden z-50 animate-fade-in-top">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-grey-10 bg-brand-cream-50/50">
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-grey-50">
              {pending
                ? "Searching…"
                : results.length > 0
                  ? `${results.length} ${results.length === 1 ? "match" : "matches"}`
                  : query.trim().length >= 2
                    ? "No matches"
                    : "Type at least 2 characters"}
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-brand-gold-700 font-semibold">
              Fresh Hub
            </span>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <ul className="max-h-[360px] overflow-y-auto">
              {results.map((hit) => (
                <li key={hit.id}>
                  <LocalizedClientLink
                    href={`/products/${hit.handle}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-x-3 px-3 py-2.5 hover:bg-grey-5 transition-colors group"
                  >
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-grey-5 flex-shrink-0 ring-1 ring-grey-10">
                      {hit.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageSrc(hit.thumbnail)}
                          alt={hit.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-grey-30">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-body-sm font-semibold text-grey-90 truncate group-hover:text-brand-green-700 transition-colors">
                        {hit.title}
                      </span>
                      {hit.origin && (
                        <span className="text-[10px] uppercase tracking-wider text-grey-50 font-medium mt-0.5 truncate">
                          {hit.origin}
                        </span>
                      )}
                    </div>
                    {hit.price && (
                      <span className="text-body-sm font-bold text-grey-90 tabular-nums flex-shrink-0">
                        {hit.price}
                      </span>
                    )}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !pending ? (
            <div className="px-4 py-8 text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-grey-5 flex items-center justify-center text-grey-40 mb-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="text-body-sm text-grey-70">
                No matches for{" "}
                <span className="font-semibold text-grey-90">
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </p>
              <p className="text-caption text-grey-50 mt-1">
                Try a different keyword or browse our shop.
              </p>
            </div>
          ) : (
            <div className="px-4 py-5">
              <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-grey-50 block mb-2">
                Try one of these
              </span>
              <div className="flex flex-wrap gap-1.5">
                {["Mango", "Kangkong", "Tilapia", "Calamansi", "Saba"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s)
                      inputRef.current?.focus()
                    }}
                    className="px-3 py-1 rounded-full bg-grey-5 hover:bg-grey-90 hover:text-white text-caption text-grey-70 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          {query.trim().length >= 2 && (
            <button
              type="button"
              onClick={submit}
              className="w-full flex items-center justify-between px-4 py-3 bg-grey-5 border-t border-grey-10 text-body-sm font-semibold text-grey-90 hover:bg-grey-90 hover:text-white transition-colors group"
            >
              <span>
                See all results for{" "}
                <span className="italic font-heading">
                  &ldquo;{query.trim()}&rdquo;
                </span>
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
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
