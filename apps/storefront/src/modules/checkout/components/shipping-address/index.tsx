"use client"

import { HUB_CITIES, hubSlugForCity } from "@lib/constants/hub-cities"
import {
  validateEmail,
  validateHubCity,
  validatePhilippinePostalCode,
  validateRequired,
  type AddressErrors,
} from "@lib/data/address-validation"
import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import BarangayCombobox from "@modules/common/components/barangay-combobox"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useCallback, useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"

type FieldKey =
  | "shipping_address.first_name"
  | "shipping_address.last_name"
  | "shipping_address.address_1"
  | "shipping_address.company"
  | "shipping_address.postal_code"
  | "shipping_address.city"
  | "shipping_address.country_code"
  | "shipping_address.province"
  | "shipping_address.phone"
  | "shipping_address.barangay"
  | "email"

const REQUIRED_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "shipping_address.first_name", label: "First name" },
  { key: "shipping_address.last_name", label: "Last name" },
  { key: "shipping_address.address_1", label: "Address" },
  { key: "shipping_address.postal_code", label: "Postal code" },
  { key: "shipping_address.city", label: "City" },
  { key: "shipping_address.country_code", label: "Country" },
  { key: "shipping_address.barangay", label: "Barangay" },
]

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
  onValidityChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
  onValidityChange?: (valid: boolean) => void
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    "shipping_address.barangay":
      ((cart?.shipping_address as { metadata?: { barangay?: string } } | null)
        ?.metadata?.barangay as string | undefined) || "",
    email: cart?.email || "",
  })

  const hubSlug = useMemo(
    () => hubSlugForCity(formData["shipping_address.city"] ?? ""),
    [formData]
  )

  const [errors, setErrors] = useState<AddressErrors>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  // ── per-field validation ──────────────────────────────────────────

  const validateField = useCallback(
    (name: FieldKey, value: string): string | null => {
      switch (name) {
        case "email":
          return validateEmail(value)
        case "shipping_address.city":
          return validateHubCity(value)
        case "shipping_address.postal_code":
          return validatePhilippinePostalCode(value)
        default: {
          // required-field check for the known required keys
          const def = REQUIRED_FIELDS.find((f) => f.key === name)
          if (def) return validateRequired(value, def.label)
          return null
        }
      }
    },
    []
  )

  const runAllValidations = useCallback((): AddressErrors => {
    const errs: AddressErrors = {}
    for (const field of REQUIRED_FIELDS) {
      const err = validateField(field.key, formData[field.key] ?? "")
      if (err) errs[field.key] = err
    }
    const emailErr = validateField("email", formData.email ?? "")
    if (emailErr) errs.email = emailErr
    return errs
  }, [formData, validateField])

  const isValid =
    Object.keys(runAllValidations()).length === 0 &&
    formData["shipping_address.country_code"].trim().length > 0

  // Let the parent (Addresses) disable "Continue to delivery" until every
  // required field is filled in.
  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  // ── handlers ─────────────────────────────────────────────────────

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    setErrors({})
    setTouched(new Set())

    if (address) {
      setFormData((prev) => ({
        ...prev,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
        "shipping_address.barangay":
          ((address as { metadata?: { barangay?: string } } | undefined)
            ?.metadata?.barangay as string | undefined) || "",
      }))
    }

    if (email) {
      setFormData((prev) => ({
        ...prev,
        email,
      }))
    }
  }

  useEffect(() => {
    if (cart && cart.shipping_address) {
      setFormAddress(cart?.shipping_address, cart?.email)
    } else if (cart && customer) {
      const defaultAddr = addressesInRegion?.[0]
      if (defaultAddr) {
        setFormAddress(
          defaultAddr as unknown as HttpTypes.StoreCartAddress,
          customer.email
        )
      } else if (customer.email) {
        setFormAddress(undefined, customer.email)
      }
    } else if (cart && !cart.email && customer?.email) {
      setFormAddress(undefined, customer.email)
    }
  }, [cart, customer, addressesInRegion])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Re-validate on every keystroke after first blur
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
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
            {`Hi ${customer.first_name}, do you want to use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as unknown as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          data-testid="shipping-first-name-input"
          {...(fieldError("shipping_address.first_name")
            ? {
                className:
                  "!border-rose-400 focus:!shadow-borders-interactive-with-active",
              }
            : {})}
        />
        <Input
          label="Last name"
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          data-testid="shipping-last-name-input"
          {...(fieldError("shipping_address.last_name")
            ? {
                className:
                  "!border-rose-400 focus:!shadow-borders-interactive-with-active",
              }
            : {})}
        />
        <Input
          label="Address"
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          data-testid="shipping-address-input"
          {...(fieldError("shipping_address.address_1")
            ? {
                className:
                  "!border-rose-400 focus:!shadow-borders-interactive-with-active",
              }
            : {})}
        />
        <Input
          label="Company"
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        />
        <div>
          <Input
            label="Postal code"
            name="shipping_address.postal_code"
            autoComplete="postal-code"
            value={formData["shipping_address.postal_code"]}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            data-testid="shipping-postal-code-input"
            {...(fieldError("shipping_address.postal_code")
              ? {
                  className:
                    "!border-rose-400 focus:!shadow-borders-interactive-with-active",
                }
              : {})}
          />
          {fieldError("shipping_address.postal_code") && (
            <p className="text-rose-500 text-xs mt-1">
              {fieldError("shipping_address.postal_code")}
            </p>
          )}
        </div>
        <div>
          <Input
            label="City"
            name="shipping_address.city"
            autoComplete="address-level2"
            value={formData["shipping_address.city"]}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            list="shipping-city-list"
            data-testid="shipping-city-input"
            {...(fieldError("shipping_address.city")
              ? {
                  className:
                    "!border-rose-400 focus:!shadow-borders-interactive-with-active",
                }
              : {})}
          />
          <datalist id="shipping-city-list">
            {HUB_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
          {fieldError("shipping_address.city") && (
            <p className="text-rose-500 text-xs mt-1">
              {fieldError("shipping_address.city")}
            </p>
          )}
        </div>
        <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        />
        <Input
          label="State / Province"
          name="shipping_address.province"
          autoComplete="address-level1"
          value={formData["shipping_address.province"]}
          onChange={handleChange}
          data-testid="shipping-province-input"
        />
        <div className="col-span-2">
          <BarangayCombobox
            hubSlug={hubSlug}
            value={formData["shipping_address.barangay"] || null}
            onChange={(b) => {
              setFormData((prev) => ({
                ...prev,
                "shipping_address.barangay": b,
              }))
              setTouched((prev) =>
                new Set(prev).add("shipping_address.barangay")
              )
              setErrors((prev) => {
                const next = { ...prev }
                delete next["shipping_address.barangay"]
                return next
              })
            }}
            required
            invalid={!!fieldError("shipping_address.barangay")}
            data-testid="shipping-barangay-combobox"
          />
          {fieldError("shipping_address.barangay") && (
            <p className="text-rose-500 text-xs mt-1">
              {fieldError("shipping_address.barangay")}
            </p>
          )}
          {/* Mirror the combobox value into a normal form field so the
              server action picks it up via FormData. */}
          <input
            type="hidden"
            name="shipping_address.barangay"
            value={formData["shipping_address.barangay"]}
          />
        </div>
      </div>
      <div className="my-8">
        <Checkbox
          label="Billing address same as shipping address"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Input
            label="Email"
            name="email"
            type="email"
            title="Enter a valid email address."
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            data-testid="shipping-email-input"
            {...(fieldError("email")
              ? {
                  className:
                    "!border-rose-400 focus:!shadow-borders-interactive-with-active",
                }
              : {})}
          />
          {fieldError("email") && (
            <p className="text-rose-500 text-xs mt-1">
              {fieldError("email")}
            </p>
          )}
        </div>
        <Input
          label="Phone"
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          data-testid="shipping-phone-input"
        />
      </div>

      {/* hidden valid-state flag read by the parent's SubmitButton */}
      <input type="hidden" name="__shipping_valid" value={isValid ? "1" : "0"} />
    </>
  )
}

export default ShippingAddress