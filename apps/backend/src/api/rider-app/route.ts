import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RIDER_APP_HTML } from "../../rider-app/app-html"

/**
 * GET /rider-app — the rider PWA shell (public; the app itself authenticates
 * against /rider/auth/login and calls the token-guarded /rider/* API).
 * Served same-origin so no CORS configuration is involved.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache")
  res.send(RIDER_APP_HTML)
}
