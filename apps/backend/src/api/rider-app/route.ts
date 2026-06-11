import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /rider-app — DEPRECATED (2026-06-11, founder/dev call).
 *
 * The standalone rider PWA is retired: riders now sign in on the storefront
 * like any user (OTP / Google) and work their deliveries from the account
 * area (/account/rider). The storefront exchanges the customer session for a
 * rider token at GET /store/riders/session, so the token-guarded /rider/* API
 * below stays exactly as it was — only this HTML shell is gone.
 *
 * This redirect keeps old bookmarks / installed PWAs working. The legacy
 * shell lives in src/rider-app/app-html.ts if it ever needs to come back.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const storefront =
    process.env.STOREFRONT_URL ??
    process.env.STORE_CORS?.split(",")[0]?.trim() ??
    "http://localhost:8000"
  res.redirect(302, `${storefront}/account`)
}
