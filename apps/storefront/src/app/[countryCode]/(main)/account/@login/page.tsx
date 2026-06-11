import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"
import { listHubs } from "@modules/hub/data/hubs"
import { getHubCookie } from "@modules/hub/actions/set-hub"

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Mindanao Fresh Hub account.",
}

type Props = {
  searchParams: Promise<{ gerror?: string }>
}

export default async function Login({ searchParams }: Props) {
  const { gerror } = await searchParams
  const hubs = await listHubs()
  const currentHubSlug = await getHubCookie()
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )

  return (
    <LoginTemplate
      hubs={hubs}
      currentHubSlug={currentHubSlug}
      googleEnabled={googleEnabled}
      googleError={gerror ?? null}
    />
  )
}
