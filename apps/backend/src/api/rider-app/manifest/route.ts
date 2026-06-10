import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const ICON_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#157a3a"/><rect y="430" width="512" height="82" fill="#191d17"/><text x="256" y="305" font-family="Arial, sans-serif" font-size="170" font-weight="900" fill="#f7f4ec" text-anchor="middle">MFH</text><text x="256" y="486" font-family="Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="14" fill="#f7f4ec" text-anchor="middle">RIDER</text></svg>`
  )

/** GET /rider-app/manifest — web app manifest so the PWA is installable. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Content-Type", "application/manifest+json")
  res.json({
    name: "MFH Rider",
    short_name: "MFH Rider",
    description:
      "Mindanao Fresh Hub rider run sheet — deliveries, COD collection, remittance.",
    start_url: "/rider-app",
    scope: "/rider-app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ec",
    theme_color: "#191d17",
    icons: [
      { src: ICON_SVG, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  })
}
