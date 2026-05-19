import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "ph"
const REGION_COOKIE = "_mfh_country"
const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable."
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const { regions } = await response.json()

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    // Reset before rebuilding so removed regions don't linger
    regionMapCache.regionMap.clear()
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })
    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Best country guess in priority order:
 *   1. User-chosen cookie (set when the user manually picks a country)
 *   2. Cloudflare / Vercel geo header (production infra)
 *   3. Accept-Language header (e.g. "en-PH")
 *   4. Configured DEFAULT_REGION
 *   5. URL slug (only as a last resort)
 *   6. First available region
 *
 * Note: URL is intentionally NOT preferred over detection — otherwise visiting
 * /dk in PH would stick to Denmark forever.
 */
function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>
): string | undefined {
  const urlCountryCode = request.nextUrl.pathname
    .split("/")[1]
    ?.toLowerCase()

  // 1. cookie
  const cookieCountry = request.cookies
    .get(REGION_COOKIE)
    ?.value?.toLowerCase()
  if (cookieCountry && regionMap.has(cookieCountry)) return cookieCountry

  // 2. infra detection
  const cf = (request as { cf?: { country?: string } }).cf?.country?.toLowerCase()
  if (cf && regionMap.has(cf)) return cf
  const vercel = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()
  if (vercel && regionMap.has(vercel)) return vercel

  // 3. accept-language sniff (e.g. "en-PH,en;q=0.9")
  const accept = request.headers.get("accept-language") ?? ""
  const langMatch = accept.match(/[a-z]{2}-([A-Z]{2})/i)
  const langCountry = langMatch?.[1]?.toLowerCase()
  if (langCountry && regionMap.has(langCountry)) return langCountry

  // 4. configured default
  if (regionMap.has(DEFAULT_REGION)) return DEFAULT_REGION

  // 5. URL fallback
  if (urlCountryCode && regionMap.has(urlCountryCode)) return urlCountryCode

  // 6. first region available
  const firstKey = regionMap.keys().next().value
  return typeof firstKey === "string" ? firstKey : undefined
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode = getCountryCode(request, regionMap) || DEFAULT_REGION

  const firstPathSegment = request.nextUrl.pathname
    .split("/")[1]
    ?.toLowerCase()
  const urlHasCountry = firstPathSegment === countryCode.toLowerCase()

  if (urlHasCountry) {
    const response = NextResponse.next()
    if (!cacheIdCookie) {
      response.cookies.set("_medusa_cache_id", cacheId, {
        maxAge: 60 * 60 * 24,
      })
    }
    // Persist the resolved country so subsequent requests are deterministic.
    response.cookies.set(REGION_COOKIE, countryCode, {
      maxAge: REGION_COOKIE_MAX_AGE,
      sameSite: "lax",
      path: "/",
    })
    return response
  }

  // Redirect to the correct country (handles /dk → /ph in PH, /                 → /ph, etc.)
  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${countryCode}${redirectPath}${queryString}`

  const response = NextResponse.redirect(redirectUrl, 307)
  response.cookies.set(REGION_COOKIE, countryCode, {
    maxAge: REGION_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  })
  if (!cacheIdCookie) {
    response.cookies.set("_medusa_cache_id", cacheId, {
      maxAge: 60 * 60 * 24,
    })
  }
  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
