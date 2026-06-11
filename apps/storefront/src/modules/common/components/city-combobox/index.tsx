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
import { HUB_CITIES, hubSlugForCity } from "@lib/constants/hub-cities"
import { clx } from "@modules/common/components/ui"
import { Fragment, useMemo, useState } from "react"

type Props = {
  /** Currently selected city name (or null). */
  value: string | null
  /** Called with the chosen city name. Only cities with an active hub fire. */
  onChange: (city: string) => void
  label?: string
  required?: boolean
  /** Visual error state (e.g. invalid on blur). */
  invalid?: boolean
  "data-testid"?: string
}

/**
 * Searchable city / municipality picker. Options come from HUB_CITIES (the
 * single source of truth shared with checkout address validation). Cities
 * without an active hub yet are listed but disabled with a "Coming soon"
 * badge, so buyers see the expansion plan without being able to pick an
 * unserviceable city. Pair with BarangayCombobox for the city → barangay
 * cascade.
 */
const CityCombobox: React.FC<Props> = ({
  value,
  onChange,
  label = "City / municipality",
  required = false,
  invalid = false,
  "data-testid": testId,
}) => {
  const [query, setQuery] = useState("")

  const options = useMemo(
    () =>
      HUB_CITIES.map((city) => ({
        city,
        available: hubSlugForCity(city) !== null,
      })),
    []
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.city.toLowerCase().includes(q))
  }, [options, query])

  const hasValue = !!value

  return (
    <div className="flex flex-col w-full" data-testid={testId}>
      <Combobox
        value={value ?? ""}
        onChange={(v: string | null) => {
          if (v) onChange(v)
        }}
      >
        <div className="relative z-40 w-full txt-compact-medium">
          <ComboboxInput
            className={clx(
              "block w-full h-11 pt-4 pb-1 px-4 pr-10 bg-ui-bg-field border rounded-md txt-compact-medium",
              "focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active",
              "hover:bg-ui-bg-field-hover",
              invalid ? "border-rose-400" : "border-ui-border-base"
            )}
            displayValue={(v: string) => v}
            onChange={(e) => setQuery(e.target.value)}
            placeholder=" "
          />
          {label && (
            <label
              className={clx(
                "flex items-center mx-3 px-1 transition-all absolute duration-300 top-3 -z-1 origin-0 text-ui-fg-subtle",
                (hasValue || query) && "-translate-y-2 text-xsmall-regular"
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
              {filtered.length === 0 && query.trim() !== "" && (
                <div className="px-4 py-2 text-ui-fg-subtle">
                  No hub city matches “{query}”. We currently serve hub cities
                  only.
                </div>
              )}
              {filtered.map(({ city, available }) => (
                <ComboboxOption
                  key={city}
                  value={city}
                  disabled={!available}
                  className={({ active }) =>
                    clx(
                      "relative select-none py-2 pl-10 pr-4",
                      available ? "cursor-pointer" : "cursor-not-allowed",
                      active && available
                        ? "bg-ui-bg-base-hover text-ui-fg-base"
                        : "text-ui-fg-base"
                    )
                  }
                >
                  {({ selected }) => (
                    <span className="flex items-center justify-between gap-x-2">
                      <span
                        className={clx(
                          "block truncate",
                          selected ? "font-medium" : "font-normal",
                          !available && "text-ui-fg-muted"
                        )}
                      >
                        {city}
                      </span>
                      {!available && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-grey-5 border border-grey-10 text-[10px] text-ui-fg-muted uppercase tracking-wide">
                          Coming soon
                        </span>
                      )}
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ui-fg-interactive">
                          <Check />
                        </span>
                      )}
                    </span>
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

export default CityCombobox
