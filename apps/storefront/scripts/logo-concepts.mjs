import sharp from "sharp"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
  <stop stop-color="#22c55e"/><stop offset="1" stop-color="#14532d"/></linearGradient>`

// Concept A — a big "C" crescent embracing a shared-stem "P/T" ligature.
const A = `
<g fill="none" stroke="url(#g)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
  <!-- C: open crescent, mouth faces right -->
  <path d="M70 30 A30 30 0 1 0 70 66"/>
  <!-- shared P/T stem -->
  <path d="M60 26 L60 74"/>
  <!-- T crossbar across the stem top -->
  <path d="M48 26 L84 26"/>
  <!-- P bowl on the stem -->
  <path d="M60 34 C82 34 82 56 60 56"/>
</g>`

// Concept B — three letters interlocked left→right, sharing terminals.
const B = `
<g fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
  <!-- C -->
  <path d="M40 24 A22 22 0 1 0 40 68"/>
  <!-- P sharing the C's right edge as its stem -->
  <path d="M40 70 L40 24 C62 24 62 47 40 47"/>
  <!-- T capping the right, crossbar continues the line -->
  <path d="M58 24 L86 24 M72 24 L72 70"/>
</g>`

// Concept C — full-width "T" roof over a "C" cradle, "P" bowl on the stem.
const C = `
<g fill="none" stroke="url(#g)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
  <!-- T: wide roof + central stem -->
  <path d="M18 24 L78 24 M48 24 L48 78"/>
  <!-- P bowl off the stem -->
  <path d="M48 30 C70 30 70 52 48 52"/>
  <!-- C: cradle arc opening up-right, hugging lower-left -->
  <path d="M70 70 A28 28 0 1 1 48 24"/>
</g>`

const concepts = { A, B, C }

function svg(body, { stroke = "transparent" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>${GRAD}</defs>
  <rect width="96" height="96" fill="${stroke}"/>
  ${body}
</svg>`
}

// Contact sheet: each concept on white + on a soft grey, big and small.
async function tile(body, label) {
  const big = await sharp(Buffer.from(svg(body))).resize(300, 300).png().toBuffer()
  const small = await sharp(Buffer.from(svg(body))).resize(44, 44).png()
    .toBuffer()
  return { big, small, label }
}

const sheet = []
for (const [name, body] of Object.entries(concepts)) {
  sheet.push(await tile(body, name))
}

// Compose a simple contact sheet PNG (3 rows: big + small per concept).
const rowH = 320
const W = 700
const composites = []
sheet.forEach((t, i) => {
  composites.push({ input: t.big, top: i * rowH + 10, left: 10 })
  composites.push({ input: t.small, top: i * rowH + 130, left: 340 })
})
const canvas = sharp({
  create: { width: W, height: rowH * sheet.length, channels: 4, background: "#ffffff" },
})
await canvas.composite(composites).png().toFile(join(__dirname, "_concepts.png"))

// Also write each concept standalone for closer inspection.
for (const [name, body] of Object.entries(concepts)) {
  await sharp(Buffer.from(svg(body))).resize(360, 360).png()
    .toFile(join(__dirname, `_concept-${name}.png`))
}
console.log("wrote scripts/_concepts.png and _concept-A/B/C.png")
