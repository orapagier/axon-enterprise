import sharp from "sharp"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUB = join(__dirname, "..", "public")

// The brand hexagon (pointy-top, center 48,48, vertex radius 38) whose own
// geometry spells CPT: the angular left half reads as C, the right half is
// carved into P + T in white negative space.
// (Founder initials Cham P. Tonog / Consumer·Producer·Trader.)
const HEX = "M48 10 L81 29 L81 67 L48 86 L15 67 L15 29 Z"
const CUT = `
    <g fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M44 28 L25 37 L25 59 L44 68"/>
      <path d="M50 70 L50 28 C66 28 66 49 50 49"/>
      <path d="M55 28 L74 28 M65 28 L65 70"/>
    </g>`

const grad = (id, c0, c1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`

// Rounded-square badge: darker bg + lighter hexagon so the hex edge reads.
function iconSVG({ maskable = false } = {}) {
  const s = maskable ? 0.78 : 1
  const t = (96 * (1 - s)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${grad("bg", "#15803d", "#14532d")}${grad("hx", "#4ade80", "#16a34a")}</defs>
  <rect width="96" height="96" rx="21" fill="url(#bg)"/>
  <g transform="translate(${t} ${t}) scale(${s})">
    <path d="${HEX}" fill="url(#hx)"/>${CUT}
  </g>
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
  await png(iconSVG(), join(__dirname, "_preview-icon.png"), 360)
  console.log("rendered scripts/_preview-icon.png")
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
