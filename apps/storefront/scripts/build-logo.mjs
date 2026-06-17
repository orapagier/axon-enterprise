import sharp from "sharp"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, "..", "public")

// Interlocked CPT monogram (viewBox 0 0 96 96): the mark *is* the letters —
// C and P share the vertical spine, T locks onto the P bowl.
// (Founder initials Cham P. Tonog / Consumer·Producer·Trader.)
const PATHS = `
    <path d="M35 24 A24 24 0 1 0 35 72"/>
    <path d="M35 72 L35 24 C59 24 59 48 35 48"/>
    <path d="M53 24 L85 24 M69 24 L69 72"/>`

const mark = (stroke, sw = 10) =>
  `<g fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PATHS}</g>`

const grad = (id, c0, c1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`

// White monogram on a green rounded badge — used for every PWA / favicon asset.
function iconSVG({ maskable = false } = {}) {
  // Maskable icons must keep content inside the central ~80% safe zone, so
  // shrink the mark toward the middle when masked.
  const s = maskable ? 0.74 : 1
  const t = (96 * (1 - s)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${grad("bg", "#16a34a", "#14532d")}</defs>
  <rect width="96" height="96" rx="21" fill="url(#bg)"/>
  <g transform="translate(${t} ${t}) scale(${s})">${mark("#ffffff", 10)}</g>
</svg>`
}

async function png(svg, out, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out)
}
async function pngBuf(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
}

// Pack PNG buffers into a real multi-image .ico (PNG payloads).
function ico(images) {
  const head = Buffer.alloc(6)
  head.writeUInt16LE(1, 2)
  head.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = 6 + dir.length
  images.forEach(({ size, data }, i) => {
    const e = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([head, dir, ...images.map((x) => x.data)])
}

if (process.argv[2] === "render") {
  await png(iconSVG(), join(__dirname, "_preview-badge.png"), 360)
  console.log("rendered scripts/_preview-badge.png")
} else {
  await png(iconSVG(), join(PUB, "icon-192.png"), 192)
  await png(iconSVG(), join(PUB, "icon-512.png"), 512)
  await png(iconSVG({ maskable: true }), join(PUB, "icon-512-maskable.png"), 512)
  await png(iconSVG(), join(PUB, "apple-touch-icon.png"), 180)
  const imgs = await Promise.all(
    [16, 32, 48].map(async (size) => ({ size, data: await pngBuf(iconSVG(), size) }))
  )
  writeFileSync(join(PUB, "favicon.ico"), ico(imgs))
  console.log("wrote icon-192/512/512-maskable, apple-touch-icon, favicon.ico")
}
