"use server"
import { cookies as nextCookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheTag } from "./cookies"
import { retrieveCustomer } from "./customer"
import { validatePhone } from "@lib/util/phone"

/**
 * Admin onboarding state reset (Medusa demo helper).
 */
export async function resetOnboardingState(orderId: string) {
  const cookies = await nextCookies()
  cookies.set("_medusa_onboarding", "false", { maxAge: -1 })
  redirect(`http://localhost:7001/a/orders/${orderId}`)
}

/* ----------------------------------------------------------------------
 * Customer-facing profile onboarding (buyer / seller).
 * Stores the profile fields against the customer's first/last/phone where
 * appropriate, plus extra context in metadata.
 * --------------------------------------------------------------------*/

export type OnboardingState = {
  ok: boolean
  error?: string | null
  fieldErrors?: Partial<Record<string, string>> | null
}

const splitDisplayName = (
  full: string
): { first_name: string; last_name: string } => {
  const cleaned = full.trim().replace(/\s+/g, " ")
  if (!cleaned) return { first_name: "", last_name: "" }
  const parts = cleaned.split(" ")
  if (parts.length === 1) return { first_name: parts[0], last_name: "" }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  }
}

export async function completeOnboarding(
  _prev: OnboardingState | null,
  formData: FormData
): Promise<OnboardingState> {
  const customer = await retrieveCustomer()
  if (!customer) {
    return { ok: false, error: "You need to be signed in to continue." }
  }

  const role =
    (customer.metadata?.account_type as "buyer" | "seller" | undefined) ??
    "buyer"
  const isSeller = role === "seller"
  const onboardingCountry = String(formData.get("countryCode") ?? "ph")
  const fieldErrors: Record<string, string> = {}

  const required = (key: string, label: string): string => {
    const v = String(formData.get(key) ?? "").trim()
    if (!v) fieldErrors[key] = `${label} is required.`
    return v
  }

  // Country-aware phone validation. The country comes from the URL slug
  // (`/ph`, `/dk`, etc.) and drives libphonenumber-js — we only require the
  // national-format input. Numbers in international (+...) format are also
  // accepted regardless of the slug.
  const checkPhone = (
    fieldName: string,
    label: string
  ): string => {
    const raw = required(fieldName, label)
    if (!raw) return ""
    const result = validatePhone(raw, onboardingCountry)
    if (!result.ok) {
      fieldErrors[fieldName] = result.reason
      return raw
    }
    return result.e164
  }

  let updateBody: HttpTypes.StoreUpdateCustomer
  let metadataPatch: Record<string, unknown>

  // Address fields are required for both roles — getDeliveryHub() and the
  // checkout flow both depend on a real saved address.
  const address_1 = required("address_1", "Street address")
  const province = required("province", "Province")
  const postal_code = String(formData.get("postal_code") ?? "").trim()

  if (isSeller) {
    const business_name = required("business_name", "Business or farm name")
    const primary_hub = required("primary_hub", "City / municipality")
    const contact_phone = checkPhone("contact_phone", "Contact phone")
    const products_offered = required(
      "products_offered",
      "What you grow / catch"
    )

    if (business_name && business_name.length < 2) {
      fieldErrors.business_name = "Business name is too short."
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        fieldErrors,
        error: "Please complete the highlighted fields.",
      }
    }

    updateBody = {
      company_name: business_name,
      phone: contact_phone,
    }
    metadataPatch = {
      business_name,
      primary_hub,
      products_offered,
      farm_address_1: address_1,
      farm_province: province,
      farm_postal_code: postal_code || null,
    }
  } else {
    const display_name = required("display_name", "Display name")
    const phone = checkPhone("phone", "Phone number")
    const default_city = required("default_city", "City / municipality")
    const buyer_bio = String(formData.get("buyer_bio") ?? "").trim()

    if (display_name && display_name.length < 2) {
      fieldErrors.display_name = "Display name is too short."
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        fieldErrors,
        error: "Please complete the highlighted fields.",
      }
    }

    const { first_name, last_name } = splitDisplayName(display_name)
    updateBody = {
      first_name,
      last_name,
      phone,
    }
    metadataPatch = {
      display_name,
      default_city,
      buyer_bio,
      default_address_1: address_1,
      default_province: province,
      default_postal_code: postal_code || null,
    }
  }

  // Merge metadata so existing keys (account_type, _derived_secret, etc.) survive.
  const mergedMetadata = {
    ...(customer.metadata ?? {}),
    ...metadataPatch,
    profile_completed: true,
    profile_completed_at: new Date().toISOString(),
  }

  // Pick the city we'll use for the default-shipping address. For buyers
  // that's their stated delivery city; for sellers it's their primary hub
  // (the city their farm/business operates out of). This is what
  // getDeliveryHub() reads on subsequent visits.
  const seedCity = isSeller
    ? String(formData.get("primary_hub") ?? "").trim()
    : String(formData.get("default_city") ?? "").trim()

  try {
    const headers = { ...(await getAuthHeaders()) }
    await sdk.store.customer.update(
      { ...updateBody, metadata: mergedMetadata },
      {},
      headers
    )

    // Persist the address fields against the customer's default-shipping
    // address so getDeliveryHub() resolves the right city and so checkout
    // pre-fills correctly. We UPSERT — update an existing default-shipping
    // address if one exists (re-onboarding edge case) and create one
    // otherwise. Best-effort: failures don't block onboarding completion.
    const existingDefault =
      (customer.addresses ?? []).find((a) => a.is_default_shipping) ??
      (customer.addresses ?? [])[0] ??
      null

    const nameParts = {
      first_name: updateBody.first_name ?? customer.first_name ?? "",
      last_name: updateBody.last_name ?? customer.last_name ?? "",
    }
    const addressPayload = {
      ...nameParts,
      phone: updateBody.phone ?? customer.phone ?? undefined,
      company: isSeller
        ? (updateBody.company_name ?? customer.company_name ?? "")
        : "",
      address_1,
      city: seedCity,
      province,
      postal_code: postal_code || undefined,
      country_code: countryCode,
      is_default_shipping: true,
      is_default_billing: !existingDefault, // default-billing too if no other address exists
    }

    try {
      if (existingDefault) {
        await sdk.store.customer.updateAddress(
          existingDefault.id,
          addressPayload,
          {},
          headers
        )
      } else {
        await sdk.store.customer.createAddress(addressPayload, {}, headers)
      }
    } catch {
      /* address upsert is best-effort; don't fail onboarding overall */
    }

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
  } catch {
    return {
      ok: false,
      error:
        "We couldn't save your profile right now. Please try again in a moment.",
    }
  }

  // Sellers land on their dashboard so they can immediately see verification
  // status and start drafting listings. Buyers go to the account overview.
  redirect(`/${countryCode}/account${isSeller ? "/seller" : ""}`)
}
