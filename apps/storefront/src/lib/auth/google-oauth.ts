import "server-only"

/**
 * Shared bits of the Google OAuth code flow (see /api/auth/google/*).
 * The start route stashes this payload in a short-lived httpOnly cookie;
 * the callback route validates `state` against it and finishes signup with
 * the carried role/hub.
 */
export const GAUTH_COOKIE = "_mfh_gauth"
export const GAUTH_TTL_SECONDS = 10 * 60

export type GoogleAuthPending = {
  state: string
  mode: "signin" | "signup"
  role: string
  hub: string
  countryCode: string
  redirectUri: string
}

export type GoogleIdTokenClaims = {
  email?: string
  email_verified?: boolean
  given_name?: string
  family_name?: string
  sub?: string
}

/**
 * Exchanges an authorization code for tokens and returns the id_token claims.
 * The id_token comes straight from Google's token endpoint over TLS, so its
 * payload is trusted without re-verifying the signature.
 */
export async function exchangeCodeForClaims(
  code: string,
  redirectUri: string
): Promise<GoogleIdTokenClaims | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    console.error(
      "[google-oauth] token exchange failed:",
      res.status,
      await res.text().catch(() => "")
    )
    return null
  }

  const { id_token: idToken } = (await res.json()) as { id_token?: string }
  if (!idToken) {
    console.error("[google-oauth] token response had no id_token")
    return null
  }

  try {
    const payload = idToken.split(".")[1]
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as GoogleIdTokenClaims
  } catch {
    return null
  }
}
