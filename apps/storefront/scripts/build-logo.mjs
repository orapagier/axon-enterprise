import sharp from "sharp"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, "..", "public")

// Hexagon (pointy-top) in a 0 0 36 36 box — same path the app already uses.
const HEX = "M18 2L32.124 10V26L18 34L3.876 26V10L18 2Z"

// Bold geometric "CPT" lockup, centered in the hexagon's wide middle band.
// Drawn as round-capped strokes so it stays crisp at tiny sizes.
const CPT = (stroke, sw = 2.4) => `
  <g fill="none" stroke="${stroke}" stroke-width="${sw}"
     stroke-linecap="round" stroke-linejoin="round">
    <!-- C: open arc -->
    <path d="M13.4 15.2 A4.7 4.7 0 1 0 13.4 20.8" />
    <!-- P: stem + bowl -->
    <path d="M15.7 23 L15.7 13 C19.8 13 19.8 18.5 15.7 18.5" />
    <!-- T: bar + stem -->
    <path d="M21.9 13 L29.3 13 M25.6 13 L25.6 23" />
  </g>`

// Inline-style mark (transparent bg) — what goes in nav/footer/menu.
function markSVG({ size, c0, c1, letter, sw }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36" fill="none">
  <path d="${HEX}" fill="url(#g)"/>
  ${CPT(letter, sw)}
  <defs>
    <linearGradient id="g" x1="3.876" y1="2" x2="32.124" y2="34" gradientUnits="userSpaceOnUse">
      <stop stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/>
    </linearGradient>
  </defs>
</svg>`
}

// Icon-style mark (filled rounded-square bg for PWA/favicon, hex inset).
function iconSVG({ size, maskable = false, letter = "#ffffff" }) {
  const pad = maskable ? 4.8 : 2.2 // safe zone for maskable icons
  const inner = 36 - pad * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
      <stop stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/>
    </linearGradient>
    <linearGradient id="hx" x1="3.876" y1="2" x2="32.124" y2="34" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4ade80"/><stop offset="1" stop-color="#15803d"/>
    </linearGradient>
  </defs>
  <rect width="36" height="36" rx="8" fill="url(#bg)"/>
  <g transform="translate(${pad} ${pad}) scale(${inner / 36})">
    <path d="${HEX}" fill="url(#hx)" stroke="#bbf7d0" stroke-opacity="0.25" stroke-width="0.6"/>
    ${CPT(letter, 2.6)}
  </g>
</svg>`
}

const RENDER = process.argv[2] === "render"

async function png(svg, out, size) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  writeFileSync(out, buf)
  return buf
}

async function pngBuf(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
}

// Pack PNG buffers into a real multi-image .ico container (PNG payloads,
// supported by all modern browsers + Windows Vista+).
function ico(images) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(0, 0) // reserved
  head.writeUInt16LE(1, 2) // type: icon
  head.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = 6 + dir.length
  images.forEach(({ size, data }, i) => {
    const e = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e + 0) // width
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1) // height
    dir.writeUInt8(0, e + 2) // palette
    dir.writeUInt8(0, e + 3) // reserved
    dir.writeUInt16LE(1, e + 4) // planes
    dir.writeUInt16LE(32, e + 6) // bpp
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([head, dir, ...images.map((x) => x.data)])
}

if (RENDER) {
  // Preview tiles for visual QA.
  const navGold = markSVG({ size: 240, c0: "#22c55e", c1: "#14532d", letter: "#fef9c3", sw: 2.4 })
  const navWhite = markSVG({ size: 240, c0: "#22c55e", c1: "#14532d", letter: "#ffffff", sw: 2.4 })
  await png(navGold, join(__dirname, "_preview-gold.png"), 240)
  await png(navWhite, join(__dirname, "_preview-white.png"), 240)
  await png(navGold, join(__dirname, "_preview-gold-30.png"), 30)
  await png(iconSVG({ size: 384 }), join(__dirname, "_preview-icon.png"), 384)
  await png(iconSVG({ size: 384, letter: "#fef9c3" }), join(__dirname, "_preview-icon-gold.png"), 384)
  console.log("rendered previews to scripts/_preview-*.png")
} else {
  // Real assets. Cream-gold letters to match the nav/footer marks.
  const L = "#fef9c3"
  await png(iconSVG({ size: 192, letter: L }), join(PUB, "icon-192.png"), 192)
  await png(iconSVG({ size: 512, letter: L }), join(PUB, "icon-512.png"), 512)
  await png(iconSVG({ size: 512, maskable: true, letter: L }), join(PUB, "icon-512-maskable.png"), 512)
  await png(iconSVG({ size: 180, letter: L }), join(PUB, "apple-touch-icon.png"), 180)
  // favicon.ico — real multi-size ICO (16/32/48) with PNG payloads.
  const sizes = [16, 32, 48]
  const imgs = await Promise.all(
    sizes.map(async (size) => ({ size, data: await pngBuf(iconSVG({ size, letter: L }), size) }))
  )
  writeFileSync(join(PUB, "favicon.ico"), ico(imgs))
  console.log("wrote icon-192/512/512-maskable, apple-touch-icon, favicon.ico")
}
