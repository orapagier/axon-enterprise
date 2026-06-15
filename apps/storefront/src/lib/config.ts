import { getLocaleHeader } from "@lib/util/get-locale-header"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
}

// In the browser, route SDK calls through the storefront's own origin. The
// configured backend URL (http://localhost:9000) is reachable from the Next
// server during SSR / server actions, but NOT from a client component running
// in a tunnelled or remote browser — there "localhost" is the visitor's own
// device, and an http call from an https page is blocked as mixed content.
// A Next rewrite (next.config.js) proxies same-origin /api/medusa/* to the
// backend, so client-side fetches (e.g. the checkout delivery step) work from
// any origin without exposing the backend publicly or widening STORE_CORS.
// The /api prefix matters: the locale middleware skips /api/* but would
// 307-redirect a bare /store/* path to /:country/store before the rewrite ran.
if (typeof window !== "undefined") {
  MEDUSA_BACKEND_URL = `${window.location.origin}/api/medusa`
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  }
  init = {
    ...init,
    headers: newHeaders,
  }
  return originalFetch(input, init)
}
