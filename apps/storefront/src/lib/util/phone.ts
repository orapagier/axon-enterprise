import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js"

/**
 * Country-aware phone-number validation.
 *
 * The storefront knows the customer's country via the URL slug (`/ph`, `/dk`,
 * etc.). We map that slug to libphonenumber-js's ISO-3166 country code and
 * accept any number that parses + validates against that country's rules.
 *
 * Numbers in international format (e.g. "+639171234567") are also accepted
 * regardless of the country hint — libphonenumber parses the country from
 * the leading "+".
 */

export type PhoneValidation =
  | { ok: true; e164: string; country: CountryCode }
  | { ok: false; reason: string }

const isCountryCode = (s: string): s is CountryCode =>
  /^[A-Z]{2}$/.test(s)

export const toCountryCode = (
  slug: string | null | undefined
): CountryCode | undefined => {
  if (!slug) return undefined
  const upper = slug.trim().toUpperCase()
  return isCountryCode(upper) ? upper : undefined
}

export function validatePhone(
  raw: string,
  countrySlug?: string | null
): PhoneValidation {
  if (!raw || !raw.trim()) {
    return { ok: false, reason: "Enter a phone number." }
  }
  const country = toCountryCode(countrySlug)
  const parsed = parsePhoneNumberFromString(raw.trim(), country)
  if (!parsed) {
    return {
      ok: false,
      reason: "We couldn't read that as a phone number. Try again.",
    }
  }
  if (!parsed.isValid()) {
    return {
      ok: false,
      reason: country
        ? `That doesn't look like a valid ${country} phone number.`
        : "That phone number doesn't look valid.",
    }
  }
  return { ok: true, e164: parsed.number, country: (parsed.country ?? country) as CountryCode }
}

/**
 * Format a raw input into the country's national display format
 * (e.g. "+63 917 555 0144" for PH). Returns the original raw value
 * if it can't be parsed — never throws.
 */
export function formatPhoneForDisplay(
  raw: string,
  countrySlug?: string | null
): string {
  const country = toCountryCode(countrySlug)
  const parsed = parsePhoneNumberFromString(raw.trim(), country)
  if (!parsed) return raw
  return parsed.formatInternational()
}
