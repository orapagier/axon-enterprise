import sharp from "sharp"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Refined interlocked CPT monogram (viewBox 0 0 96 96).
// C and P share the vertical spine; T locks onto the P bowl.
const PATHS = `
  <path d="M35 24 A24 24 0 1 0 35 72"/>
  <path d="M35 72 L35 24 C59 24 59 48 35 48"/>
  <path d="M53 24 L85 24 M69 24 L69 72"/>`

function mark(stroke, { sw = 10 } = {}) {
  return `<g fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${PATHS}</g>`
}

const GRAD = (id, c0, c1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>`

// 1) Monogram on transparent/light bg, green gradient strokes (nav / menu).
const onLight = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${GRAD("g", "#22c55e", "#14532d")}</defs>${mark("url(#g)")}</svg>`

// 2) Monogram in white on a green rounded badge (app icon / favicon).
const onBadge = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${GRAD("bg", "#16a34a", "#14532d")}</defs>
  <rect width="96" height="96" rx="21" fill="url(#bg)"/>
  ${mark("#ffffff")}</svg>`

// 3) Monogram light-green on dark (footer).
const onDark = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" fill="#0f1f17"/>${mark("#86efac")}</svg>`

async function out(svg, name, size = 360) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(__dirname, name))
}

await out(onLight, "_b-light.png")
await out(onBadge, "_b-badge.png")
await out(onDark, "_b-dark.png")
await out(onLight, "_b-light-44.png", 44)
await out(onBadge, "_b-badge-44.png", 44)
console.log("wrote _b-light/_b-badge/_b-dark (+44px)")
