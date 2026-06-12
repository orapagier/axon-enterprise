"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { cookies as nextCookies } from "next/headers"
import { redirect } from "next/navigation"
import crypto from "crypto"
import {
  getAuthHeaders,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"
import { MEMBERSHIP_META } from "@lib/util/membership"
import { setHubCookie, syncCustomerHubFromCookie } from "@modules/hub/actions/set-hub"
import { sendOtpEmail } from "@lib/email/send-otp"
import { deriveCustomerSecret } from "@lib/auth/derived-credential"

// Naming follows the founder's initials, "CPT":
//   Consumer — household buyers ordering for their own kitchen.
//   Producer — farmers and fishers listing their harvest.
//   Trader   — B2B buyers (restaurants, cafés, retailers, distributors).
//   Rider    — delivery riders who earn from delivering hub orders.
export type AccountType = "consumer" | "producer" | "trader" | "rider"
export type AuthMode = "signin" | "signup"

const VALID_ACCOUNT_TYPES: AccountType[] = [
  "consumer",
  "producer",
  "trader",
  "rider",
]

const PENDING_AUTH_COOKIE = "_mfh_pending_auth"
const PENDING_AUTH_TTL_SECONDS = 10 * 60

// OTP abuse limits (per browser). A short cooldown stops rapid resends and a
// rolling window caps total sends to blunt email-bombing. IP/edge-level limits
// remain a recommended additional layer.
const OTP_THROTTLE_COOKIE = "_mfh_otp_throttle"
const OTP_RESEND_COOLDOWN_MS = 30 * 1000
const OTP_MAX_SENDS_PER_WINDOW = 5
const OTP_WINDOW_MS = 15 * 60 * 1000

type PendingAuth = {
  email: string
  codeHash: string
  mode: AuthMode
  role?: AccountType
  hub?: string
  expiresAt: number
  attempts: number
}

const hashCode = (code: string, email: string) =>
  crypto
    .createHash("sha256")
    .update(`${email.toLowerCase()}:${code}`)
    .digest("hex")

const generateCode = () =>
  // 6-digit, leading zeros preserved
  String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")

const setPendingAuth = async (data: PendingAuth) => {
  const cookies = await nextCookies()
  cookies.set(PENDING_AUTH_COOKIE, JSON.stringify(data), {
    maxAge: PENDING_AUTH_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

const readPendingAuth = async (): Promise<PendingAuth | null> => {
  const cookies = await nextCookies()
  const raw = cookies.get(PENDING_AUTH_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PendingAuth
    if (Date.now() > parsed.expiresAt) return null
    return parsed
  } catch {
    return null
  }
}

const clearPendingAuth = async () => {
  const cookies = await nextCookies()
  cookies.set(PENDING_AUTH_COOKIE, "", { maxAge: -1 })
}

type OtpThrottle = { windowStart: number; count: number; lastSentAt: number }

const readThrottle = async (): Promise<OtpThrottle> => {
  const cookies = await nextCookies()
  const raw = cookies.get(OTP_THROTTLE_COOKIE)?.value
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as OtpThrottle
      // Keep the same window only while it's still open; otherwise reset.
      if (Date.now() - parsed.windowStart < OTP_WINDOW_MS) return parsed
    } catch {
      // fall through to a fresh window
    }
  }
  return { windowStart: Date.now(), count: 0, lastSentAt: 0 }
}

const writeThrottle = async (t: OtpThrottle) => {
  const cookies = await nextCookies()
  cookies.set(OTP_THROTTLE_COOKIE, JSON.stringify(t), {
    maxAge: Math.ceil(OTP_WINDOW_MS / 1000),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    // `getAuthHeaders()` returns `{}` (truthy) when no JWT is in the
    // cookie. Check for the actual bearer field so we don't waste a
    // round-trip and cache a 401 → null as if the customer exists.
    if (!("authorization" in authHeaders)) return null

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers: { ...authHeaders },
        // Skip Next.js's data cache — when the JWT expires or the
        // backend session changes, a cached customer would lie about
        // auth state and pages would render as logged-in while every
        // live call 401s.
        cache: "no-store",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export type OtpRequestState = {
  ok: boolean
  error?: string | null
  // dev-only: present in non-production builds so the UI can display the OTP
  // when no email provider is configured. Never set in production.
  devCode?: string
}

export async function requestEmailCode(
  _prev: OtpRequestState | null,
  formData: FormData
): Promise<OtpRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const mode = (String(formData.get("mode") ?? "signin") as AuthMode)
  const rawRole = String(formData.get("role") ?? "")
  const role =
    mode === "signup" ? (rawRole as AccountType) : undefined
  const hub =
    mode === "signup"
      ? String(formData.get("hub") ?? "").trim().slice(0, 64) || undefined
      : undefined

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." }
  }

  // No silent default: an account type must be an explicit choice, otherwise
  // a submit that races the role click signs people up as consumers.
  if (mode === "signup" && !VALID_ACCOUNT_TYPES.includes(role as AccountType)) {
    return { ok: false, error: "Please choose an account type." }
  }

  // ----- Rate limiting (per browser): cooldown + rolling window cap. -----
  const throttle = await readThrottle()
  const now = Date.now()
  if (now - throttle.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (OTP_RESEND_COOLDOWN_MS - (now - throttle.lastSentAt)) / 1000
    )
    return {
      ok: false,
      error: `Please wait ${wait}s before requesting another code.`,
    }
  }
  if (throttle.count >= OTP_MAX_SENDS_PER_WINDOW) {
    return {
      ok: false,
      error: "Too many code requests. Please try again in a little while.",
    }
  }

  const code = generateCode()

  await setPendingAuth({
    email,
    codeHash: hashCode(code, email),
    mode,
    role,
    hub,
    expiresAt: now + PENDING_AUTH_TTL_SECONDS * 1000,
    attempts: 0,
  })

  const delivery = await sendOtpEmail(email, code)

  // Provider failed or isn't configured in production: don't leave the user
  // holding a pending code they can never receive.
  if (!delivery.delivered && !delivery.devCode) {
    await clearPendingAuth()
    return {
      ok: false,
      error:
        "We can't send login codes right now. Please try again later or contact support.",
    }
  }

  await writeThrottle({
    windowStart: throttle.windowStart,
    count: throttle.count + 1,
    lastSentAt: now,
  })

  // devCode is only ever populated in non-production when no email provider is
  // configured, so the dev UI can still display the code.
  return { ok: true, devCode: delivery.devCode }
}

export type OtpVerifyState = {
  ok: boolean
  error?: string | null
  redirectTo?: string | null
  isNewAccount?: boolean
}

export async function verifyEmailCode(
  _prev: OtpVerifyState | null,
  formData: FormData
): Promise<OtpVerifyState> {
  const code = String(formData.get("code") ?? "").replace(/\s+/g, "")
  const countryCode = String(formData.get("countryCode") ?? "ph")

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code we emailed you." }
  }

  const pending = await readPendingAuth()
  if (!pending) {
    return {
      ok: false,
      error: "Your code expired. Request a new one to continue.",
    }
  }

  if (pending.attempts >= 5) {
    await clearPendingAuth()
    return {
      ok: false,
      error: "Too many incorrect attempts. Request a new code.",
    }
  }

  if (hashCode(code, pending.email) !== pending.codeHash) {
    await setPendingAuth({ ...pending, attempts: pending.attempts + 1 })
    return { ok: false, error: "That code doesn't match. Try again." }
  }

  try {
    const derivedPassword = deriveCustomerSecret(pending.email)

    if (pending.mode === "signup") {
      // Register the auth identity, attach the customer record with role
      // metadata, then sign in. The derived password is reproducible, so it is
      // never persisted — Medusa keeps only its own salted hash.
      let registered = true
      try {
        const registerToken = await sdk.auth.register("customer", "emailpass", {
          email: pending.email,
          password: derivedPassword,
        })
        await setAuthToken(registerToken as string)
      } catch {
        // Identity already exists — the OTP just proved this person owns the
        // email, so treat the "signup" as a sign-in to the existing account
        // instead of dead-ending on "Identity with email already exists".
        registered = false
      }

      if (registered) {
        const headers = { ...(await getAuthHeaders()) }
        await sdk.store.customer.create(
          {
            email: pending.email,
            metadata: {
              account_type: pending.role ?? "consumer",
              // Stackable-roles model: consumer is the implied base, the
              // chosen type is the first stacked role (if any).
              roles:
                pending.role && pending.role !== "consumer"
                  ? [pending.role]
                  : [],
              profile_completed: pending.role === "rider" ? true : false,
              rider_available: pending.role === "rider" ? true : undefined,
              auth_method: "email_otp",
            },
          },
          {},
          headers
        )
      }

      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email: pending.email,
        password: derivedPassword,
      })
      await setAuthToken(loginToken as string)
    } else {
      // Sign-in: re-derive the same internal credential and mint a session.
      // No backend round-trip and nothing stored server-side — verifying the
      // OTP above is what authorizes this login.
      try {
        const loginToken = await sdk.auth.login("customer", "emailpass", {
          email: pending.email,
          password: derivedPassword,
        })
        await setAuthToken(loginToken as string)
      } catch {
        // The only expected failure here is an unknown identity — the
        // backend's raw "Invalid email or password" would just confuse
        // someone who never typed a password.
        return {
          ok: false,
          error:
            "We couldn't find an account for that email. Switch to Sign up to create one.",
        }
      }
    }

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
    await transferCart()
    if (pending.mode === "signup" && pending.hub) {
      // The hub picked during signup becomes the default hub: persists the
      // cookie and links customer ↔ hub in the backend now that we're authed.
      await setHubCookie(pending.hub)
    } else {
      await syncCustomerHubFromCookie()
    }
  } catch (error) {
    return { ok: false, error: String(error) }
  } finally {
    await clearPendingAuth()
  }

  const redirectTo =
    pending.mode === "signup"
      ? `/${countryCode}/onboarding`
      : `/${countryCode}/account`

  return {
    ok: true,
    redirectTo,
    isNewAccount: pending.mode === "signup",
  }
}

export async function cancelPendingAuth() {
  await clearPendingAuth()
}

// NOTE: the old password-based `signup` / `login` server actions were removed
// deliberately. Exported server actions are publicly invokable endpoints, and
// those two bypassed the OTP flow and created accounts without any
// account_type metadata. All sign-in rails now go through the OTP or Google
// flows above.

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(`/${countryCode}/account`)
}

// Manual-verification membership flow:
//   1. The user pays via GCash or bank transfer offline.
//   2. They submit the payment reference here, which sets status="pending".
//      Pending users stay on the free tier — `getMembership` only treats
//      "active" as a real member, so no pricing perks unlock yet.
//   3. An admin verifies the payment in the Medusa admin and POSTs to
//      `/admin/customers/:id/membership/approve`, which flips the status
//      to "active" and stamps joinedAt/expiresAt.
// Replace this with a webhook-driven flow if/when a payment processor is wired up.
export async function requestMembership(
  _prevState: { ok: boolean; error: string | null } | undefined,
  formData: FormData
): Promise<{ ok: boolean; error: string | null }> {
  const customer = await retrieveCustomer()
  if (!customer) return { ok: false, error: "Please sign in first." }

  const existing = (customer.metadata ?? {}) as Record<string, unknown>
  if (existing[MEMBERSHIP_META.status] === "active") {
    return { ok: false, error: "Your membership is already active." }
  }

  const rawMethod = String(formData.get("payment_method") ?? "")
  const paymentMethod: "otc" | "gcash" | "bank" | null =
    rawMethod === "otc" || rawMethod === "gcash" || rawMethod === "bank"
      ? rawMethod
      : null
  if (!paymentMethod) {
    return { ok: false, error: "Please choose a payment method." }
  }

  // OTC cash has no receipt reference — the cashier matches the payer by
  // account email, so the admin verifies the walk-in payment manually.
  const paymentReference = String(formData.get("payment_reference") ?? "")
    .trim()
    .slice(0, 80)
  if (paymentMethod !== "otc" && paymentReference.length < 4) {
    return {
      ok: false,
      error: "Enter the reference number from your GCash or bank receipt.",
    }
  }

  await updateCustomer({
    metadata: {
      ...existing,
      [MEMBERSHIP_META.status]: "pending",
      [MEMBERSHIP_META.requestedAt]: Date.now(),
      [MEMBERSHIP_META.paymentMethod]: paymentMethod,
      [MEMBERSHIP_META.paymentReference]:
        paymentMethod === "otc" ? null : paymentReference,
    },
  })

  return { ok: true, error: null }
}

export async function cancelMembership(_formData: FormData) {
  const customer = await retrieveCustomer()
  if (!customer) return

  const existing = (customer.metadata ?? {}) as Record<string, unknown>

  await updateCustomer({
    metadata: {
      ...existing,
      [MEMBERSHIP_META.status]: "cancelled",
      [MEMBERSHIP_META.requestedAt]: null,
      [MEMBERSHIP_META.paymentMethod]: null,
      [MEMBERSHIP_META.paymentReference]: null,
    },
  })
}

export type DeleteAccountState = {
  ok: boolean
  error: string | null
}

/**
 * Permanently delete the signed-in customer's account. Irreversible: the
 * backend removes the customer, their auth identities, any rider record, and
 * retires their listings. The UI requires the user to re-type their email,
 * and the backend independently verifies that confirmation.
 */
export async function deleteAccount(
  _prev: DeleteAccountState | null,
  formData: FormData
): Promise<DeleteAccountState> {
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase()

  const customer = await retrieveCustomer()
  if (!customer) {
    return { ok: false, error: "Please sign in first." }
  }
  if (!confirm || confirm !== (customer.email ?? "").toLowerCase()) {
    return {
      ok: false,
      error: "Type your account email exactly as shown to confirm.",
    }
  }

  const headers = await getAuthHeaders()
  try {
    await sdk.client.fetch(`/store/customers/me/account`, {
      method: "DELETE",
      headers: { ...headers },
      body: { confirm },
    })
  } catch (error) {
    return {
      ok: false,
      error:
        "We couldn't delete your account right now. Please try again or contact support.",
    }
  }

  await removeAuthToken()
  await removeCartId()
  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)
  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  return { ok: true, error: null }
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const barangay = (formData.get("barangay") as string) || ""
  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
    metadata: barangay ? { barangay } : undefined,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const barangay = (formData.get("barangay") as string) || ""
  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    metadata: barangay ? { barangay } : undefined,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
