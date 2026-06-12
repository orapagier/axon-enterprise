import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"
import { listHubs } from "@modules/hub/data/hubs"
import { getHubCookie } from "@modules/hub/actions/set-hub"
import { readPendingAuth } from "@lib/auth/pending-auth"

export const metadata: Metadata = {
  title: "Sign in | Mindanao Fresh Hub",
  description: "Sign in to your Mindanao Fresh Hub account.",
}

type Props = {
  searchParams: Promise<{ gerror?: string; gverify?: string; gdevcode?: string }>
}

export default async function Login({ searchParams }: Props) {
  const { gerror, gverify, gdevcode } = await searchParams
  const hubs = await listHubs()
  const currentHubSlug = await getHubCookie()
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )

  // A Google-started signup lands back here with ?gverify=1 and its email
  // verification parked in the pending-auth cookie; resume at the code step.
  let pendingOtp: { email: string; role?: string; hub?: string } | null = null
  if (gverify) {
    const pending = await readPendingAuth()
    if (pending?.mode === "signup") {
      pendingOtp = {
        email: pending.email,
        role: pending.role,
        hub: pending.hub,
      }
    }
  }

  return (
    <LoginTemplate
      hubs={hubs}
      currentHubSlug={currentHubSlug}
      googleEnabled={googleEnabled}
      googleError={gerror ?? null}
      pendingOtp={pendingOtp}
      pendingDevCode={
        process.env.NODE_ENV !== "production" ? gdevcode ?? null : null
      }
    />
  )
}
