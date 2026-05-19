"use client"

import { clx } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function Pagination({
  page,
  totalPages,
  'data-testid': dataTestid
}: {
  page: number
  totalPages: number
  'data-testid'?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const arrayRange = (start: number, stop: number) =>
    Array.from({ length: stop - start + 1 }, (_, index) => start + index)

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const renderPageButton = (
    p: number,
    label: string | number,
    isCurrent: boolean
  ) => (
    <button
      key={p}
      aria-label={`Go to page ${p}`}
      aria-current={isCurrent ? "page" : undefined}
      className={clx(
        "min-w-[40px] h-10 px-3 rounded-xl text-body-sm font-semibold tabular-nums transition-all duration-150 border",
        {
          "bg-brand-green-600 text-white border-brand-green-600 shadow-medium hover:bg-brand-green-700":
            isCurrent,
          "bg-white text-grey-70 border-grey-10 hover:border-brand-green-300 hover:text-brand-green-700 hover:bg-brand-green-50":
            !isCurrent,
        }
      )}
      disabled={isCurrent}
      onClick={() => handlePageChange(p)}
    >
      {label}
    </button>
  )

  const renderEllipsis = (key: string) => (
    <span
      key={key}
      className="min-w-[40px] h-10 flex items-center justify-center text-body-sm text-grey-40 select-none"
    >
      …
    </span>
  )

  const renderPageButtons = () => {
    const buttons = []

    if (totalPages <= 7) {
      buttons.push(
        ...arrayRange(1, totalPages).map((p) =>
          renderPageButton(p, p, p === page)
        )
      )
    } else {
      if (page <= 4) {
        buttons.push(
          ...arrayRange(1, 5).map((p) => renderPageButton(p, p, p === page))
        )
        buttons.push(renderEllipsis("ellipsis1"))
        buttons.push(
          renderPageButton(totalPages, totalPages, totalPages === page)
        )
      } else if (page >= totalPages - 3) {
        buttons.push(renderPageButton(1, 1, 1 === page))
        buttons.push(renderEllipsis("ellipsis2"))
        buttons.push(
          ...arrayRange(totalPages - 4, totalPages).map((p) =>
            renderPageButton(p, p, p === page)
          )
        )
      } else {
        buttons.push(renderPageButton(1, 1, 1 === page))
        buttons.push(renderEllipsis("ellipsis3"))
        buttons.push(
          ...arrayRange(page - 1, page + 1).map((p) =>
            renderPageButton(p, p, p === page)
          )
        )
        buttons.push(renderEllipsis("ellipsis4"))
        buttons.push(
          renderPageButton(totalPages, totalPages, totalPages === page)
        )
      }
    }

    return buttons
  }

  const navButton = (direction: "prev" | "next") => {
    const disabled = direction === "prev" ? page === 1 : page === totalPages
    const target = direction === "prev" ? page - 1 : page + 1
    return (
      <button
        aria-label={direction === "prev" ? "Previous page" : "Next page"}
        disabled={disabled}
        onClick={() => handlePageChange(target)}
        className={clx(
          "h-10 px-3 rounded-xl border flex items-center gap-x-1.5 text-body-sm font-semibold transition-all duration-150",
          {
            "border-grey-10 bg-white text-grey-40 cursor-not-allowed": disabled,
            "border-grey-10 bg-white text-grey-80 hover:border-brand-green-300 hover:text-brand-green-700 hover:bg-brand-green-50":
              !disabled,
          }
        )}
      >
        {direction === "prev" ? (
          <>
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="hidden xsmall:inline">Prev</span>
          </>
        ) : (
          <>
            <span className="hidden xsmall:inline">Next</span>
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col xsmall:flex-row items-center justify-between gap-4 w-full mt-12 pt-8 border-t border-grey-10">
      <p className="text-caption text-grey-50 order-2 xsmall:order-1">
        Page <span className="text-grey-80 font-semibold">{page}</span> of{" "}
        <span className="text-grey-80 font-semibold">{totalPages}</span>
      </p>
      <div
        className="flex items-center gap-1.5 order-1 xsmall:order-2"
        data-testid={dataTestid}
      >
        {navButton("prev")}
        <div className="flex items-center gap-1 mx-1">{renderPageButtons()}</div>
        {navButton("next")}
      </div>
    </div>
  )
}
