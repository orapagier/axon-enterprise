"use server"

import { retrieveCustomer, updateCustomer } from "./customer"
import { rolesOf } from "@lib/util/roles"
import { validatePhone } from "@lib/util/phone"
import {
  canonicalHubCity,
  hubSlugForCity,
  HUB_CITIES,
} from "@lib/constants/hub-cities"

/**
 * Stackable-roles conversions. Any signed-in customer can add a role on top
 * of their Consumer base; each action asks only for the info that role needs.
 *
 *   Producer — business/farm profile here, then the existing rails: yearly
 *              registration (membership) paid at the hub + admin approval,
 *              and seller verification, before listings go live.
 *   Trader   — business profile here, lands unapproved; the hub admin
 *              negotiates the discount and approves via the admin Traders
 *              page. Yearly registration works the same as producers'.
 *   Rider    — handled by the existing /account/rider registration (cash
 *              bond + dispatcher activation), not by an action here.
 *
 * Producer and Trader are mutually exclusive (traders buy B2B, never sell).
 * Downgrades are automatic: 30 days after the yearly registration lapses,
 * the nightly membership job strips the role (see backend
 * jobs/membership-expiry-tick.ts).
 */

export type AddRoleState = {
  ok: boolean
  error?: string | null
  fieldErrors?: Partial<Record<string, string>> | null
}

type FieldCollector = {
  fieldErrors: Record<string, string>
  required: (key: string, label: string) => string
  phone: (key: string, label: string) => string
  hubCity: (key: string, label: string) => string
}

const makeCollector = (
  formData: FormData,
  countryCode: string
): FieldCollector => {
  const fieldErrors: Record<string, string> = {}

  const required = (key: string, label: string): string => {
    const v = String(formData.get(key) ?? "").trim()
    if (!v) fieldErrors[key] = `${label} is required.`
    return v
  }

  const phone = (key: string, label: string): string => {
    const raw = required(key, label)
    if (!raw) return ""
    const result = validatePhone(raw, countryCode)
    if (!result.ok) {
      fieldErrors[key] = result.reason
      return raw
    }
    return result.e164
  }

  const hubCity = (key: string, label: string): string => {
    const raw = required(key, label)
    if (!raw) return ""
    const canon = canonicalHubCity(raw)
    if (!canon) {
      fieldErrors[key] = `We currently serve only: ${HUB_CITIES.join(", ")}.`
      return raw
    }
    if (!hubSlugForCity(canon)) {
      fieldErrors[key] =
        `${canon} doesn't have an active hub yet — pick a city with an active hub.`
      return canon
    }
    return canon
  }

  return { fieldErrors, required, phone, hubCity }
}

export async function addProducerRole(
  _prev: AddRoleState | null,
  formData: FormData
): Promise<AddRoleState> {
  const customer = await retrieveCustomer()
  if (!customer) return { ok: false, error: "Please sign in first." }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const roles = rolesOf(meta)
  if (roles.includes("producer")) {
    return { ok: false, error: "Your account is already a Producer." }
  }
  if (roles.includes("trader")) {
    return {
      ok: false,
      error:
        "Trader accounts can't also be Producers. Your Trader registration has to lapse or be revoked first.",
    }
  }

  const countryCode = String(formData.get("countryCode") ?? "ph")
  const c = makeCollector(formData, countryCode)
  const business_name = c.required("business_name", "Business or farm name")
  const primary_hub = c.hubCity("primary_hub", "City / municipality")
  const contact_phone = c.phone("contact_phone", "Contact phone")
  const products_offered = c.required(
    "products_offered",
    "What you grow / catch"
  )
  if (business_name && business_name.length < 2) {
    c.fieldErrors.business_name = "Business name is too short."
  }
  if (Object.keys(c.fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors: c.fieldErrors,
      error: "Please complete the highlighted fields.",
    }
  }

  try {
    await updateCustomer({
      company_name: business_name,
      phone: contact_phone,
      metadata: {
        ...meta,
        roles: [...roles, "producer"],
        business_name,
        primary_hub,
        products_offered,
      },
    })
  } catch {
    return {
      ok: false,
      error: "We couldn't save your Producer profile. Please try again.",
    }
  }

  return { ok: true, error: null }
}

export async function addTraderRole(
  _prev: AddRoleState | null,
  formData: FormData
): Promise<AddRoleState> {
  const customer = await retrieveCustomer()
  if (!customer) return { ok: false, error: "Please sign in first." }

  const meta = (customer.metadata ?? {}) as Record<string, unknown>
  const roles = rolesOf(meta)
  if (roles.includes("trader")) {
    return { ok: false, error: "Your account is already a Trader." }
  }
  if (roles.includes("producer")) {
    return {
      ok: false,
      error:
        "Producer accounts can't also be Traders. Your Producer registration has to lapse first.",
    }
  }

  const countryCode = String(formData.get("countryCode") ?? "ph")
  const c = makeCollector(formData, countryCode)
  const business_name = c.required("business_name", "Business name")
  const business_type = c.required("business_type", "Business type")
  const default_city = c.hubCity("default_city", "City / municipality")
  const contact_phone = c.phone("contact_phone", "Contact phone")
  const estimated_monthly_volume = String(
    formData.get("estimated_monthly_volume") ?? ""
  ).trim()
  if (business_name && business_name.length < 2) {
    c.fieldErrors.business_name = "Business name is too short."
  }
  if (Object.keys(c.fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors: c.fieldErrors,
      error: "Please complete the highlighted fields.",
    }
  }

  try {
    await updateCustomer({
      company_name: business_name,
      phone: contact_phone,
      metadata: {
        ...meta,
        roles: [...roles, "trader"],
        business_name,
        business_type,
        default_city,
        estimated_monthly_volume,
        // Discount is negotiated with the hub; the admin approval flow flips
        // this and assigns the traders-<pct> group.
        trader_approved: false,
      },
    })
  } catch {
    return {
      ok: false,
      error: "We couldn't save your Trader profile. Please try again.",
    }
  }

  return { ok: true, error: null }
}
