"use client"

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react"
import { ChevronUpDown, Check } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { Fragment, useEffect, useMemo, useState } from "react"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

type Props = {
  /** Hub slug to fetch barangays for. */
  hubSlug: string | null
  /** Currently selected barangay name (or null). */
  value: string | null
  /** Called with the chosen barangay name. */
  onChange: (barangay: string) => void
  label?: string
  required?: boolean
  /** Visual error state (e.g. invalid on blur). */
  invalid?: boolean
  "data-testid"?: string
}

/**
 * Searchable barangay picker. Sources options from
 * GET /store/hubs/:slug/barangays. Buyer types to filter; only barangays the
 * selected hub serves can be picked. Pair with a free-text street input.
 */
const BarangayCombobox: React.FC<Props> = ({
  hubSlug,
  value,
  onChange,
  label = "Barangay",
  required = false,
  invalid = false,
  "data-testid": testId,
}) => {
  const [query, setQuery] = useState("")
  const [barangays, setBarangays] = useState<string[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!hubSlug) {
      setBarangays(null)
      return
    }
    setLoadError(null)
    setBarangays(null)
    fetch(`${BACKEND_URL}/store/hubs/${encodeURIComponent(hubSlug)}/barangays`, {
      headers: {
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load barangays (${res.status})`)
        }
        const body = (await res.json()) as { barangays: string[] }
        if (!cancelled) setBarangays(body.barangays ?? [])
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setLoadError(err.message)
          setBarangays([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [hubSlug])

  const filtered = useMemo(() => {
    if (!barangays) return []
    const q = query.trim().toLowerCase()
    if (!q) return barangays
    return barangays.filter((b) => b.toLowerCase().includes(q))
  }, [barangays, query])

  const isDisabled = !hubSlug || barangays === null

  const hasValue = !!value

  return (
    <div className="flex flex-col w-full" data-testid={testId}>
      <Combobox
        value={value ?? ""}
        onChange={(v: string | null) => {
          if (v) onChange(v)
        }}
        disabled={isDisabled}
      >
        <div className="relative z-30 w-full txt-compact-medium">
          <ComboboxInput
            className={clx(
              "block w-full h-11 pt-4 pb-1 px-4 pr-10 bg-ui-bg-field border rounded-md txt-compact-medium",
              "focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active",
              "hover:bg-ui-bg-field-hover",
              invalid
                ? "border-rose-400"
                : "border-ui-border-base",
              isDisabled && "opacity-60 cursor-not-allowed"
            )}
            displayValue={(v: string) => v}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              !hubSlug
                ? "Pick city first"
                : barangays === null
                  ? "Loading…"
                  : " "
            }
          />
          {label && (
            <label
              className={clx(
                "flex items-center mx-3 px-1 transition-all absolute duration-300 top-3 -z-1 origin-0 text-ui-fg-subtle",
                // Float up when there's a value, a search query, or a visible
                // placeholder ("Pick city first" / "Loading…") — otherwise the
                // label and placeholder render on top of each other.
                (hasValue || query || isDisabled) &&
                  "-translate-y-2 text-xsmall-regular"
              )}
            >
              {label}
              {required && <span className="text-rose-500">*</span>}
            </label>
          )}
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDown className="text-ui-fg-muted" />
          </ComboboxButton>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <ComboboxOptions className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-elevation-flyout ring-1 ring-ui-border-base focus:outline-none txt-compact-medium">
              {loadError && (
                <div className="px-4 py-2 text-rose-500">{loadError}</div>
              )}
              {!loadError && filtered.length === 0 && query.trim() !== "" && (
                <div className="px-4 py-2 text-ui-fg-subtle">
                  No barangay matches “{query}”. Delivery to areas outside the
                  hub is not yet supported.
                </div>
              )}
              {!loadError &&
                filtered.length === 0 &&
                query.trim() === "" &&
                barangays?.length === 0 && (
                  <div className="px-4 py-2 text-ui-fg-subtle">
                    This hub hasn’t configured any barangays yet.
                  </div>
                )}
              {filtered.map((barangay) => (
                <ComboboxOption
                  key={barangay}
                  value={barangay}
                  className={({ active }) =>
                    clx(
                      "relative cursor-pointer select-none py-2 pl-10 pr-4",
                      active ? "bg-ui-bg-base-hover text-ui-fg-base" : "text-ui-fg-base"
                    )
                  }
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={clx(
                          "block truncate",
                          selected ? "font-medium" : "font-normal"
                        )}
                      >
                        {barangay}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ui-fg-interactive">
                          <Check />
                        </span>
                      )}
                    </>
                  )}
                </ComboboxOption>
              ))}
            </ComboboxOptions>
          </Transition>
        </div>
      </Combobox>
    </div>
  )
}

export default BarangayCombobox
