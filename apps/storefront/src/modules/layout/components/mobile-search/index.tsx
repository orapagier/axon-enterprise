"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import NavSearch from "../nav-search"

export default function MobileSearch() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Close after navigating, e.g. submitting a search or tapping a result
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="small:hidden">
      <button
        type="button"
        aria-label="Search"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-center h-9 w-9 rounded-full text-grey-60 hover:text-grey-90 hover:bg-grey-5 transition-all ${
          open ? "text-grey-90 bg-grey-5" : ""
        }`}
        data-testid="nav-search-button"
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
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Expands as a full-width row anchored to the header (nearest positioned ancestor) */}
      {open && (
        <div className="absolute left-0 right-0 top-full bg-[#fdfcf8]/95 backdrop-blur-xl px-4 py-2 border-b border-grey-10 shadow-soft">
          <NavSearch variant="mobile" autoFocus />
        </div>
      )}
    </div>
  )
}
