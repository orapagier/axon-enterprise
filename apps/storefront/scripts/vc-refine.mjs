import sharp from "sharp"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Solid pointy-top hexagon (center 48,48, vertex radius 38), viewBox 0 0 96 96.
const HEX = "M48 10 L81 29 L81 67 L48 86 L15 67 L15 29 Z"

// CPT carved in white negative space. C echoes the hexagon's angular left half;
// P + T fill the right, kept inside the narrow top by sitting in the y28-70 band.
const CUT = (sw = 7) => `
  <g fill="none" stroke="#ffffff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M44 28 L25 37 L25 59 L44 68"/>
    <path d="M50 70 L50 28 C66 28 66 49 50 49"/>
    <path d="M55 28 L74 28 M65 28 L65 70"/>
  </g>`

const grad = (id, c0, c1, x2 = 96, y2 = 96) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`

// Inline mark: solid green hexagon + white CPT, transparent background.
const inline = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${grad("hx", "#22c55e", "#14532d")}</defs>
  <path d="${HEX}" fill="url(#hx)"/>${CUT()}</svg>`

// App icon: darker rounded-square + lighter hexagon (so the hex reads) + white CPT.
function icon({ maskable = false } = {}) {
  const s = maskable ? 0.78 : 1
  const t = (96 * (1 - s)) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${grad("bg", "#15803d", "#14532d")}${grad("hx2", "#4ade80", "#16a34a")}</defs>
  <rect width="96" height="96" rx="21" fill="url(#bg)"/>
  <g transform="translate(${t} ${t}) scale(${s})">
    <path d="${HEX}" fill="url(#hx2)"/>${CUT()}
  </g></svg>`
}

async function out(svg, name, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(__dirname, name))
}
// previews on white + grey so the transparent inline mark is visible
const onBg = (svg, bg) => svg.replace("<defs>", `<rect width="96" height="96" fill="${bg}"/><defs>`)

await out(onBg(inline, "#ffffff"), "_vc-inline.png", 320)
await out(onBg(inline, "#0f1f17"), "_vc-inline-dark.png", 320)
await out(icon(), "_vc-icon.png", 360)
await out(icon({ maskable: true }), "_vc-icon-mask.png", 360)
await out(onBg(inline, "#ffffff"), "_vc-inline-40.png", 40)
await out(icon(), "_vc-icon-40.png", 40)
console.log("wrote _vc-inline(+dark,+40) and _vc-icon(+mask,+40)")
