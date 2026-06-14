// One-off: render PWA icons from the Fresh Hub hexagon mark. Run once, then deleted.
import sharp from "sharp"

// Hexagon paths from the nav logo (36-unit viewBox, bbox centered on 18,18).
const OUTER = "M18 2L32.124 10V26L18 34L3.876 26V10L18 2Z"
const INNER = "M18 11L24.928 14.5V21.5L18 25L11.072 21.5V14.5L18 11Z"

// scalePct = mark width as a fraction of the canvas; rx = corner radius (0 = square).
function svg({ size, scalePct, rx }) {
  const s = (scalePct * size) / 28.248 // hexagon natural width ≈ 28.248 units
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/>
    </linearGradient>
    <linearGradient id="hex" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff"/><stop offset="1" stop-color="#dcfce7"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#bg)"/>
  <g transform="translate(${size / 2},${size / 2}) scale(${s}) translate(-18,-18)">
    <path d="${OUTER}" fill="url(#hex)"/>
    <path d="${INNER}" fill="#bbf7d0"/>
    <circle cx="18" cy="18" r="2.6" fill="#facc15"/>
  </g>
</svg>`
}

const jobs = [
  { file: "public/icon-192.png", size: 192, scalePct: 0.66, rx: 42 },
  { file: "public/icon-512.png", size: 512, scalePct: 0.66, rx: 112 },
  { file: "public/icon-512-maskable.png", size: 512, scalePct: 0.56, rx: 0 },
  { file: "public/apple-touch-icon.png", size: 180, scalePct: 0.6, rx: 0 },
]

for (const j of jobs) {
  await sharp(Buffer.from(svg(j))).png().toFile(j.file)
  console.log("wrote", j.file, `${j.size}x${j.size}`)
}
