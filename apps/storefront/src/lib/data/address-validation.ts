/**
 * Address validation utilities shared between server actions and client
 * components. Validates required fields, email format, Philippine postal
 * codes, and hub-city delivery zone membership.
 */
import { canonicalHubCity, isHubCity, HUB_CITIES } from "@lib/constants/hub-cities"

// ── types ──────────────────────────────────────────────────────────────

export type AddressErrors = Record<string, string>

export interface ShippingFormData {
  first_name: FormDataEntryValue | null
  last_name: FormDataEntryValue | null
  address_1: FormDataEntryValue | null
  postal_code: FormDataEntryValue | null
  city: FormDataEntryValue | null
  country_code: FormDataEntryValue | null
  province: FormDataEntryValue | null
  phone: FormDataEntryValue | null
  email: FormDataEntryValue | null
}

// ── individual validators ──────────────────────────────────────────────

/** Reject empty / whitespace-only strings. */
export function validateRequired(value: unknown, label: string): string | null {
  const s = String(value ?? "").trim()
  if (s.length === 0) return `${label} is required.`
  return null
}

/** Loose email check — catches obvious typos without a full RFC parser. */
export function validateEmail(value: unknown, _label?: string): string | null {
  const s = String(value ?? "").trim()
  if (s.length === 0) return "Email is required."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
    return "Enter a valid email address."
  return null
}

/** Philippine postal codes are 4-digit numbers. */
export function validatePhilippinePostalCode(
  value: unknown,
  _label?: string
): string | null {
  const s = String(value ?? "").trim()
  if (s.length === 0) return "Postal code is required."
  if (!/^\d{4}$/.test(s)) return "Postal code must be a 4-digit number (e.g. 8100)."
  return null
}

/** City must be one of the configured hub cities. */
export function validateHubCity(value: unknown, _label?: string): string | null {
  const s = String(value ?? "").trim()
  if (s.length === 0) return "City is required."

  if (!isHubCity(s)) {
    const list = HUB_CITIES.map((c) => `"${c}"`).join(", ")
    return `We currently deliver only within these cities: ${list}.`
  }

  return null
}

/** Generic text field sanitisation: trim + strip dangerous characters. */
export function sanitizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[<>]/g, "") // strip angle brackets (basic XSS guard)
}

// ── field → validator mapping ─────────────────────────────────────────

type FieldValidator = (value: unknown, label: string) => string | null

interface FieldDef {
  key: string // form field key used in error map return
  sourceKey: string // key inside FormData
  label: string
  validators: FieldValidator[]
}

const SHIPPING_FIELDS: FieldDef[] = [
  {
    key: "shipping_address.first_name",
    sourceKey: "shipping_address.first_name",
    label: "First name",
    validators: [validateRequired],
  },
  {
    key: "shipping_address.last_name",
    sourceKey: "shipping_address.last_name",
    label: "Last name",
    validators: [validateRequired],
  },
  {
    key: "shipping_address.address_1",
    sourceKey: "shipping_address.address_1",
    label: "Address",
    validators: [validateRequired],
  },
  {
    key: "shipping_address.postal_code",
    sourceKey: "shipping_address.postal_code",
    label: "Postal code",
    validators: [validateRequired, validatePhilippinePostalCode],
  },
  {
    key: "shipping_address.city",
    sourceKey: "shipping_address.city",
    label: "City",
    validators: [validateRequired, validateHubCity],
  },
  {
    key: "shipping_address.country_code",
    sourceKey: "shipping_address.country_code",
    label: "Country",
    validators: [validateRequired],
  },
  {
    key: "email",
    sourceKey: "email",
    label: "Email",
    validators: [validateEmail],
  },
]

const BILLING_FIELDS: FieldDef[] = [
  {
    key: "billing_address.first_name",
    sourceKey: "billing_address.first_name",
    label: "First name",
    validators: [validateRequired],
  },
  {
    key: "billing_address.last_name",
    sourceKey: "billing_address.last_name",
    label: "Last name",
    validators: [validateRequired],
  },
  {
    key: "billing_address.address_1",
    sourceKey: "billing_address.address_1",
    label: "Address",
    validators: [validateRequired],
  },
  {
    key: "billing_address.postal_code",
    sourceKey: "billing_address.postal_code",
    label: "Postal code",
    validators: [validateRequired, validatePhilippinePostalCode],
  },
  {
    key: "billing_address.city",
    sourceKey: "billing_address.city",
    label: "City",
    validators: [validateRequired, validateHubCity],
  },
  {
    key: "billing_address.country_code",
    sourceKey: "billing_address.country_code",
    label: "Country",
    validators: [validateRequired],
  },
]

// ── composite validators ───────────────────────────────────────────────

/**
 * Validate all shipping-address fields from FormData. Returns:
 *   - `null` when every field passes
 *   - an error map keyed by form field name otherwise
 */
export function validateShippingAddress(
  formData: FormData
): AddressErrors | null {
  return runValidators(SHIPPING_FIELDS, formData)
}

/**
 * Validate all billing-address fields from FormData. Returns `null` when
 * every field passes, or an error map otherwise.
 */
export function validateBillingAddress(
  formData: FormData
): AddressErrors | null {
  return runValidators(BILLING_FIELDS, formData)
}

/**
 * Validate the full checkout address form (shipping + optionally billing).
 * Returns `null` when valid, or a merged error map otherwise.
 */
export function validateAddressForm(
  formData: FormData
): AddressErrors | null {
  const errors: AddressErrors = {}

  const shippingErrors = validateShippingAddress(formData)
  if (shippingErrors) Object.assign(errors, shippingErrors)

  const sameAsBilling = formData.get("same_as_billing")
  if (sameAsBilling !== "on") {
    const billingErrors = validateBillingAddress(formData)
    if (billingErrors) Object.assign(errors, billingErrors)
  }

  return Object.keys(errors).length > 0 ? errors : null
}

// ── helpers ────────────────────────────────────────────────────────────

function runValidators(
  fields: FieldDef[],
  formData: FormData
): AddressErrors | null {
  const errors: AddressErrors = {}

  for (const field of fields) {
    const raw = formData.get(field.sourceKey)
    for (const validator of field.validators) {
      const err = validator(raw, field.label)
      if (err) {
        // only keep the first error per field
        if (!errors[field.key]) errors[field.key] = err
        break
      }
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

/**
 * Sanitise and return the canonical city name. Falls back to the trimmed
 * raw input when the city is not a known hub city (caller should validate
 * first via `isHubCity` / `validateHubCity`).
 */
export function sanitizeCity(raw: unknown): string {
  const trimmed = String(raw ?? "").trim()
  return canonicalHubCity(trimmed) ?? trimmed
}