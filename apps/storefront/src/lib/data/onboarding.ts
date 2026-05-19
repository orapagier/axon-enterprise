"use server"
import { cookies as nextCookies } from "next/headers"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders, getCacheTag } from "./cookies"
import { retrieveCustomer } from "./customer"

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

const isValidPhone = (raw: string): boolean => {
  const digits = raw.replace(/[^\d+]/g, "")
  return /^\+?\d{7,15}$/.test(digits)
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
  const fieldErrors: Record<string, string> = {}

  const required = (key: string, label: string): string => {
    const v = String(formData.get(key) ?? "").trim()
    if (!v) fieldErrors[key] = `${label} is required.`
    return v
  }

  let updateBody: HttpTypes.StoreUpdateCustomer
  let metadataPatch: Record<string, unknown>

  if (isSeller) {
    const business_name = required("business_name", "Business or farm name")
    const primary_hub = required("primary_hub", "Primary hub")
    const contact_phone = required("contact_phone", "Contact phone")
    const products_offered = required(
      "products_offered",
      "What you grow / catch"
    )

    if (contact_phone && !isValidPhone(contact_phone)) {
      fieldErrors.contact_phone = "Enter a valid phone number."
    }
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
    }
  } else {
    const display_name = required("display_name", "Display name")
    const phone = required("phone", "Phone number")
    const default_city = required("default_city", "Default delivery city")
    const buyer_bio = String(formData.get("buyer_bio") ?? "").trim()

    if (phone && !isValidPhone(phone)) {
      fieldErrors.phone = "Enter a valid phone number."
    }
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
    }
  }

  // Merge metadata so existing keys (account_type, _derived_secret, etc.) survive.
  const mergedMetadata = {
    ...(customer.metadata ?? {}),
    ...metadataPatch,
    profile_completed: true,
    profile_completed_at: new Date().toISOString(),
  }

  try {
    const headers = { ...(await getAuthHeaders()) }
    await sdk.store.customer.update(
      { ...updateBody, metadata: mergedMetadata },
      {},
      headers
    )
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
  } catch {
    return {
      ok: false,
      error:
        "We couldn't save your profile right now. Please try again in a moment.",
    }
  }

  const countryCode = String(formData.get("countryCode") ?? "ph")
  redirect(`/${countryCode}/account`)
}

export async function deferOnboarding(countryCode: string) {
  const customer = await retrieveCustomer()
  if (!customer) {
    redirect(`/${countryCode}/account`)
  }
  try {
    const headers = { ...(await getAuthHeaders()) }
    await sdk.store.customer.update(
      {
        metadata: {
          ...(customer!.metadata ?? {}),
          onboarding_deferred_at: new Date().toISOString(),
        },
      },
      {},
      headers
    )
    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
  } catch {
    /* best-effort — still redirect */
  }
  redirect(`/${countryCode}/account`)
}
