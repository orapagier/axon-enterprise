import sharp from "sharp"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Pointy-top hexagon, center (48,48), vertex radius 38 (viewBox 0 0 96 96):
//   top (48,10)  UR (81,29)  LR (81,67)  bottom (48,86)  LL (15,67)  UL (15,29)
// LEFT HALF of the hexagon (top->UL->LL->bottom) is an angular bracket = "C".
const HEX_LEFT = "M48 12 L16 30 L16 66 L48 84" // the C
const HEX_FULL = "M48 10 L81 29 L81 67 L48 86 L15 67 L15 29 Z"

const grad = (id, c0, c1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`

// VA — open hexagon: left edges = C, right side rebuilt as a shared-stem P+T.
const VA = `
<g fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
  <path d="${HEX_LEFT}"/>
  <path d="M52 84 L52 24 C76 24 76 50 52 50"/>      <!-- P -->
  <path d="M58 24 L84 24 M71 24 L71 84"/>           <!-- T -->
</g>`

// VB — full hexagon frame (faint) + bold strokes that pick out C·P·T.
const VB = `
<path d="${HEX_FULL}" fill="none" stroke="url(#g2)" stroke-width="4" stroke-linejoin="round" opacity="0.35"/>
<g fill="none" stroke="url(#g)" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="${HEX_LEFT}"/>
  <path d="M53 82 L53 26 C74 26 74 49 53 49"/>
  <path d="M59 26 L82 26 M70.5 26 L70.5 82"/>
</g>`

// VC — solid hexagon, the CPT carved out in white negative space.
const VC = `
<path d="${HEX_FULL}" fill="url(#g)"/>
<g fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M44 24 L26 34 L26 62 L44 72"/>           <!-- C (echoes left edges) -->
  <path d="M52 72 L52 26 C66 26 66 44 52 44"/>      <!-- P -->
  <path d="M58 26 L74 26 M66 26 L66 72"/>           <!-- T -->
</g>`

// VD — hexagon ring whose RIGHT side opens into the P bowl, T sits inside.
const VD = `
<g fill="none" stroke="url(#g)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
  <!-- C = left half of hex, continuing into the P bowl on the right -->
  <path d="M50 84 L16 66 L16 30 L50 12 C78 14 80 48 52 50 L52 84"/>
  <!-- T tucked top-right -->
  <path d="M58 26 L82 26 M70 26 L70 70"/>
</g>`

const defs = `<defs>${grad("g", "#22c55e", "#14532d")}${grad("g2", "#16a34a", "#15803d")}</defs>`
const variants = { VA, VB, VC, VD }

function svg(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${defs}<rect width="96" height="96" fill="#ffffff"/>${body}</svg>`
}

for (const [name, body] of Object.entries(variants)) {
  await sharp(Buffer.from(svg(body))).resize(320, 320).png().toFile(join(__dirname, `_hx-${name}.png`))
  await sharp(Buffer.from(svg(body))).resize(48, 48).png().toFile(join(__dirname, `_hx-${name}-48.png`))
}
console.log("wrote _hx-VA/VB/VC/VD (+48px)")
