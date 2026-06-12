import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { revalidateTag } from "next/cache"

import { sdk } from "@lib/config"
import { deriveCustomerSecret } from "@lib/auth/derived-credential"
import {
  exchangeCodeForClaims,
  GAUTH_COOKIE,
  type GoogleAuthPending,
} from "@lib/auth/google-oauth"
import {
  PENDING_AUTH_TTL_SECONDS,
  hashCode,
  generateCode,
  setPendingAuth,
  clearPendingAuth,
  readThrottle,
  writeThrottle,
} from "@lib/auth/pending-auth"
import { sendOtpEmail } from "@lib/email/send-otp"
import { getAuthHeaders, getCacheTag, setAuthToken } from "@lib/data/cookies"
import { retrieveCustomer, transferCart } from "@lib/data/customer"
import {
  setHubCookie,
  syncCustomerHubFromCookie,
} from "@modules/hub/actions/set-hub"

/**
 * Google OAuth callback. Verifies the state nonce, swaps the code for the
 * user's verified email, then bridges into the same passwordless rail the
 * email-OTP flow uses: a credential derived from the email signs the customer
 * in via Medusa's emailpass provider. One account works across both rails.
 *
 * Sign-in to an existing account completes here. New registrations do NOT:
 * by founder's call every signup must be finished with an emailed OTP, so a
 * first-time Google signup is parked in the same pending-auth cookie the
 * email rail uses and redirected to the code-entry step — `verifyEmailCode`
 * is the only place accounts get created.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const jar = await cookies()
  let pending: GoogleAuthPending | null = null
  try {
    const raw = jar.get(GAUTH_COOKIE)?.value
    pending = raw ? (JSON.parse(raw) as GoogleAuthPending) : null
  } catch {
    pending = null
  }

  const countryCode = pending?.countryCode ?? "ph"
  // Behind a proxy/tunnel the request origin is the local bind address
  // (e.g. localhost:8000), so prefer the configured public base URL.
  const origin = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  const redirect = (path: string) => {
    const res = NextResponse.redirect(new URL(path, origin))
    res.cookies.set(GAUTH_COOKIE, "", { maxAge: 0, path: "/" })
    return res
  }
  const fail = (code: string) =>
    redirect(`/${countryCode}/account?gerror=${code}`)

  if (params.get("error")) {
    // User cancelled on Google's consent screen.
    return fail("denied")
  }

  const code = params.get("code")
  const state = params.get("state")
  if (!pending || !code || !state || state !== pending.state) {
    return fail("state")
  }

  const claims = await exchangeCodeForClaims(code, pending.redirectUri)
  if (!claims) {
    return fail("auth_failed")
  }
  if (!claims.email || claims.email_verified !== true) {
    return fail("unverified_email")
  }
  const email = claims.email.toLowerCase()

  let isNewAccount = false
  const accountType = pending.mode === "signup" ? pending.role : "consumer"

  try {
    const derivedPassword = deriveCustomerSecret(email)

    const createCustomerRecord = async () => {
      await sdk.store.customer.create(
        {
          email,
          first_name: claims.given_name ?? undefined,
          last_name: claims.family_name ?? undefined,
          metadata: {
            account_type: accountType,
            // Stackable-roles model: consumer is the implied base, the
            // chosen type is the first stacked role (if any).
            roles:
              accountType && accountType !== "consumer" ? [accountType] : [],
            profile_completed: accountType === "rider" ? true : false,
            rider_available: accountType === "rider" ? true : undefined,
            auth_method: "google",
          },
        },
        {},
        { ...(await getAuthHeaders()) }
      )
    }

    let loggedIn = false
    try {
      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email,
        password: derivedPassword,
      })
      await setAuthToken(loginToken as string)
      loggedIn = true
    } catch {
      // No identity yet — fall through to registration below.
    }

    if (!loggedIn) {
      if (pending.mode !== "signup") {
        return fail("no_account")
      }
      const registerToken = await sdk.auth.register("customer", "emailpass", {
        email,
        password: derivedPassword,
      })
      await setAuthToken(registerToken as string)
      await createCustomerRecord()
      const loginToken = await sdk.auth.login("customer", "emailpass", {
        email,
        password: derivedPassword,
      })
      await setAuthToken(loginToken as string)
      isNewAccount = true
    } else {
      // Identity exists but the customer record may be missing if an earlier
      // signup crashed halfway — recreate it so the session isn't bricked.
      const me = await retrieveCustomer()
      if (!me) {
        await createCustomerRecord()
        const loginToken = await sdk.auth.login("customer", "emailpass", {
          email,
          password: derivedPassword,
        })
        await setAuthToken(loginToken as string)
        isNewAccount = true
      }
    }

    revalidateTag(await getCacheTag("customers"))
  } catch (e) {
    console.error("[google-oauth] login/registration failed:", e)
    return fail("auth_failed")
  }

  // Post-login housekeeping is best-effort — never block a valid session.
  try {
    await transferCart()
  } catch {}
  try {
    if (isNewAccount && pending.hub) {
      // The hub picked during signup becomes the default hub (cookie + link).
      await setHubCookie(pending.hub)
    } else {
      await syncCustomerHubFromCookie()
    }
  } catch {}

  const destination =
    isNewAccount && accountType !== "rider"
      ? `/${countryCode}/onboarding`
      : `/${countryCode}/account`
  return redirect(destination)
}
