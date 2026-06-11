const BACKEND_ORIGINS = Array.from(
  new Set([
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000",
    "http://localhost:9000",
  ])
)

/**
 * Uploaded photos are stored with the backend's own origin (e.g.
 * http://localhost:9000/static/...). Other devices can't resolve that host,
 * and https pages block the http:// src as mixed content — which is why
 * product images broke on phones. Serve them same-origin instead via the
 * /static rewrite in next.config.js. External hosts (Unsplash, S3) pass
 * through untouched.
 */
export function resolveImageSrc(src: string): string {
  for (const origin of BACKEND_ORIGINS) {
    if (src.startsWith(`${origin}/static/`)) {
      return src.slice(origin.length)
    }
  }
  return src
}
