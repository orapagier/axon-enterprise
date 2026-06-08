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
import { syncCustomerHubFromCookie } from "@modules/hub/actions/set-hub"
import { sendOtpEmail } from "@lib/email/send-otp"

// Naming follows the founder's initials, "CPT":
//   Consumer — household buyers ordering for their own kitchen.
//   Producer — farmers and fishers listing their harvest.
//   Trader   — B2B buyers (restaurants, cafés, retailers, distributors).
//   Rider    — delivery riders who earn from delivering hub orders.
export type AccountType = "consumer" | "producer" | "trader" | "rider"
export type AuthMode = "signin" | "signup"

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

/**
 * Deterministic per-customer credential used internally with Medusa's
 * emailpass provider. Derived from the email + a server-only shared secret so
 * it is reproducible at both sign-up and sign-in — which means we never store
 * it anywhere (Medusa persists only its own salted hash). The customer never
 * sees or types it.
 *
 * NOTE: rotating MFH_OTP_SECRET invalidates every derived credential and would
 * force all customers to re-register. Treat it as long-lived.
 */
const deriveCustomerSecret = (email: string): string => {
  const secret = process.env.MFH_OTP_SECRET
  if (!secret) {
    throw new Error("MFH_OTP_SECRET is not configured")
  }
  return crypto
    .createHmac("sha256", secret)
    .update(`mfh-pwd:v1:${email.toLowerCase()}`)
    .digest("hex")
}

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
  const role =
    mode === "signup"
      ? ((String(formData.get("role") ?? "consumer") as AccountType))
      : undefined

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." }
  }

  if (
    mode === "signup" &&
    role &&
    !["consumer", "producer", "trader"].includes(role)
  ) {
    return { ok: false, error: "Please choose an account type." }
  }

  const code = generateCode()
  const derivedPassword = generateDerivedPassword()

  await setPendingAuth({
    email,
    codeHash: hashCode(code, email),
    mode,
    role,
    derivedPassword,
    expiresAt: Date.now() + PENDING_AUTH_TTL_SECONDS * 1000,
    attempts: 0,
  })

  // TODO(email-provider): replace with real transactional email send.
  // For dev we log + return the code so the UI can show it.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[MFH auth] OTP for ${email}: ${code}`)
    return { ok: true, devCode: code }
  }

  // Until an email provider is wired up, fail loudly in production rather
  // than returning ok and leaving the user with no way to receive the code.
  // eslint-disable-next-line no-console
  console.error(
    "[MFH auth] No transactional email provider configured; OTP not delivered."
  )
  return {
    ok: false,
    error:
      "We can't send login codes right now. Please try again later or contact support.",
  }
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
    if (pending.mode === "signup") {
      // Register, then create the customer record with role metadata, then sign in.
      const registerToken = await sdk.auth.register("customer", "emailpass", {
        email: pending.email,
        password: pending.derivedPassword,
      })
      await setAuthToken(registerToken as string)

      const headers = { ...(await getAuthHeaders()) }
      await sdk.store.customer.create(
        {
          email: pending.email,
          metadata: {
            account_type: pending.role ?? "consumer",
            profile_completed: pending.role === "rider" ? true : false,
            rider_available: pending.role === "rider" ? true : undefined,
            auth_method: "email_otp",
            // The derived password lets us re-issue sessions for this user
            // without ever exposing a real password to the customer.
            _derived_secret: pending.derivedPassword,
          },
        },
        {},
        headers
      )

      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email: pending.email,
        password: pending.derivedPassword,
      })
      await setAuthToken(loginToken as string)
    } else {
      // Sign-in via OTP. Ask the backend (via the HMAC-signed passwordless
      // route) for the customer's derived secret, then mint a session.
      const sharedSecret = process.env.MFH_OTP_SECRET
      const backendUrl =
        process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"

      if (!sharedSecret) {
        return {
          ok: false,
          error:
            "Passwordless sign-in is not configured (MFH_OTP_SECRET missing).",
        }
      }

      const timestamp = Date.now()
      const signature = crypto
        .createHmac("sha256", sharedSecret)
        .update(`${pending.email}:${timestamp}`)
        .digest("hex")

      const lookupRes = await fetch(
        `${backendUrl}/store/auth/passwordless-login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "",
          },
          body: JSON.stringify({
            email: pending.email,
            signature,
            timestamp,
          }),
        }
      )

      if (!lookupRes.ok) {
        const body = (await lookupRes.json().catch(() => ({}))) as {
          error?: string
        }
        return {
          ok: false,
          error: body.error ?? "We couldn't sign you in. Please try again.",
        }
      }

      const { derivedSecret } = (await lookupRes.json()) as {
        derivedSecret: string
      }

      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email: pending.email,
        password: derivedSecret,
      })
      await setAuthToken(loginToken as string)
    }

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)
    await transferCart()
    await syncCustomerHubFromCookie()
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

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    await transferCart()
    await syncCustomerHubFromCookie()

    return createdCustomer
  } catch (error) {
    return String(error)
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error) {
    return String(error)
  }

  try {
    await transferCart()
    await syncCustomerHubFromCookie()
  } catch (error) {
    return String(error)
  }
}

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
  const paymentMethod: "gcash" | "bank" | null =
    rawMethod === "gcash" || rawMethod === "bank" ? rawMethod : null
  if (!paymentMethod) {
    return { ok: false, error: "Please choose a payment method." }
  }

  const paymentReference = String(formData.get("payment_reference") ?? "")
    .trim()
    .slice(0, 80)
  if (paymentReference.length < 4) {
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
      [MEMBERSHIP_META.paymentReference]: paymentReference,
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
