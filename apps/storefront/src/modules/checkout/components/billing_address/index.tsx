"use client"

import { HUB_CITIES } from "@lib/constants/hub-cities"
import {
  validateHubCity,
  validatePhilippinePostalCode,
  validateRequired,
  type AddressErrors,
} from "@lib/data/address-validation"
import { HttpTypes } from "@medusajs/types"
import Input from "@modules/common/components/input"
import React, { useCallback, useState } from "react"
import CountrySelect from "../country-select"

type FieldKey =
  | "billing_address.first_name"
  | "billing_address.last_name"
  | "billing_address.address_1"
  | "billing_address.company"
  | "billing_address.postal_code"
  | "billing_address.city"
  | "billing_address.country_code"
  | "billing_address.province"
  | "billing_address.phone"

const REQUIRED_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "billing_address.first_name", label: "First name" },
  { key: "billing_address.last_name", label: "Last name" },
  { key: "billing_address.address_1", label: "Address" },
  { key: "billing_address.postal_code", label: "Postal code" },
  { key: "billing_address.city", label: "City" },
  { key: "billing_address.country_code", label: "Country" },
]

const BillingAddress = ({ cart }: { cart: HttpTypes.StoreCart | null }) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const [errors, setErrors] = useState<AddressErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  // ── per-field validation ──────────────────────────────────────────

  const validateField = useCallback(
    (name: FieldKey, value: string): string | null => {
      switch (name) {
        case "billing_address.city":
          return validateHubCity(value)
        case "billing_address.postal_code":
          return validatePhilippinePostalCode(value)
        default: {
          const def = REQUIRED_FIELDS.find((f) => f.key === name)
          if (def) return validateRequired(value, def.label)
          return null
        }
      }
    },
    []
  )

  // ── handlers ─────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (touched.has(name)) {
      const err = validateField(name as FieldKey, value)
      setErrors((prev) => {
        const next = { ...prev }
        if (err) {
          next[name] = err
        } else {
          delete next[name]
        }
        return next
      })
    }
  }

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setTouched((prev) => new Set(prev).add(name))

    const err = validateField(name as FieldKey, value)
    setErrors((prev) => {
      const next = { ...prev }
      if (err) {
        next[name] = err
      } else {
        delete next[name]
      }
      return next
    })
  }

  const fieldError = (name: string): string | undefined =>
    touched.has(name) ? errors[name] : undefined

  // ── render ───────────────────────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          name="billing_address.first_name"
          autoComplete="given-name"
          value={formData["billing_address.first_name"]}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          data-testid="billing-first-name-input"
          {...(fieldError("billing_address.first_name")
            ? {
                className:
                  "!border-rose-400 focus:!shadow-borders-interactive-with-active",
              }
            : {})}
        />
        <Input
          label="Last name"
          name="billing_address.last_name"
          autoComplete="family-name"
          value={formData["billing_address.last_name"]}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          data-testid="billing-last-name-input"
          {...(fieldError("billing_address.last_name")
            ? {
                className:
                  "!border-rose-400 focus:!shadow-borders-interactive-with-active",
              }
            : {})}
        />
        <Input
          label="Address"
          name="billing_address.address_1"
          autoComplete="address-line1"
          value={formData["billing_address.address_1"]}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          data-testid="billing-address-input"
          {...(fieldError("billing_address.address_1")
            ? {
                className:
                  "!border-rose-400 focus:!shadow-borders-interactive-with-active",
              }
            : {})}
        />
        <Input
          label="Company"
          name="billing_address.company"
          value={formData["billing_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="billing-company-input"
        />
        <div>
          <Input
            label="Postal code"
            name="billing_address.postal_code"
            autoComplete="postal-code"
            value={formData["billing_address.postal_code"]}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            data-testid="billing-postal-input"
            {...(fieldError("billing_address.postal_code")
              ? {
                  className:
                    "!border-rose-400 focus:!shadow-borders-interactive-with-active",
                }
              : {})}
          />
          {fieldError("billing_address.postal_code") && (
            <p className="text-rose-500 text-xs mt-1">
              {fieldError("billing_address.postal_code")}
            </p>
          )}
        </div>
        <div>
          <Input
            label="City"
            name="billing_address.city"
            autoComplete="address-level2"
            value={formData["billing_address.city"]}
            onChange={handleChange}
            onBlur={handleBlur}
            list="billing-city-list"
            data-testid="billing-city-input"
            {...(fieldError("billing_address.city")
              ? {
                  className:
                    "!border-rose-400 focus:!shadow-borders-interactive-with-active",
                }
              : {})}
          />
          <datalist id="billing-city-list">
            {HUB_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {fieldError("billing_address.city") && (
            <p className="text-rose-500 text-xs mt-1">
              {fieldError("billing_address.city")}
            </p>
          )}
        </div>
        <CountrySelect
          name="billing_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["billing_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="billing-country-select"
        />
        <Input
          label="State / Province"
          name="billing_address.province"
          autoComplete="address-level1"
          value={formData["billing_address.province"]}
          onChange={handleChange}
          data-testid="billing-province-input"
        />
        <Input
          label="Phone"
          name="billing_address.phone"
          autoComplete="tel"
          value={formData["billing_address.phone"]}
          onChange={handleChange}
          data-testid="billing-phone-input"
        />
      </div>
    </>
  )
}

export default BillingAddress