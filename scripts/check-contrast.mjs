// Checks the colour pairs that carry text on the timesheet screen against WCAG AA.
//
// Run with: node scripts/check-contrast.mjs
//
// These pairs are easy to get wrong by eye — the values this replaced all looked
// fine and measured badly (the dark-theme primary button label was 2.84:1, the
// light-theme lunch badge 1.47:1). Re-run this after touching --primary, --ring,
// or any of the badge colours in components/timesheet/helpers.ts.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// --- colour maths -----------------------------------------------------------
// oklch -> linear sRGB -> gamma sRGB, then WCAG relative luminance.
function oklchToSrgb(L, C, hueDeg) {
  const h = (hueDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((u) => {
    const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(Math.max(u, 0), 1 / 2.4) - 0.055
    return Math.min(1, Math.max(0, v))
  })
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const luminance = ([r, g, b]) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

function contrast(fg, bg) {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

// Browsers composite translucent colours in sRGB space, so `bg-primary/20` is a
// plain per-channel blend of the colour over whatever sits behind it.
const over = (fg, bg, alpha) => fg.map((v, i) => v * alpha + bg[i] * (1 - alpha))
const ok = (spec) => {
  const [L, C, H] = spec.trim().split(/\s+/).map(Number)
  return oklchToSrgb(L, C, H || 0)
}

// --- tokens, read from the stylesheet so this can't drift from what ships ----
const css = readFileSync(join(root, "app/globals.css"), "utf8")

function token(theme, name) {
  const scope =
    theme === "dark" ? css.split(".dark {")[1] : css.split(":root {")[1].split(".dark {")[0]
  const match = scope.match(new RegExp(`--${name}:\\s*oklch\\(([^)]+)\\)`))
  if (!match) throw new Error(`Could not find --${name} in the ${theme} theme`)
  return match[1]
}

const light = {
  bg: ok("1 0 0"),
  card: ok("1 0 0"),
  primary: ok(token("light", "primary")),
  primaryFg: ok(token("light", "primary-foreground")),
  ring: ok(token("light", "ring")),
}
const darkBg = ok(token("dark", "background"))
const dark = {
  bg: darkBg,
  // --card is declared with a 0.94 alpha, so it composites over the background.
  card: over(ok("0.22 0.04 260"), darkBg, 0.94),
  primary: ok(token("dark", "primary")),
  primaryFg: ok(token("dark", "primary-foreground")),
  ring: ok(token("dark", "ring")),
}

// Tailwind v4 palette values used by components/timesheet/helpers.ts and friends.
const tw = {
  "blue-400": ok("0.707 0.165 254.624"),
  "blue-500": ok("0.623 0.214 259.815"),
  "blue-700": ok("0.488 0.243 264.376"),
  "amber-400": ok("0.828 0.189 84.429"),
  "amber-500": ok("0.769 0.188 70.08"),
  "amber-700": ok("0.555 0.163 48.998"),
  "amber-800": ok("0.473 0.137 46.201"),
  "purple-400": ok("0.714 0.203 305.504"),
  "purple-500": ok("0.627 0.265 303.9"),
  "purple-800": ok("0.496 0.265 301.924"),
  "green-400": ok("0.792 0.209 151.711"),
  "green-700": ok("0.527 0.154 150.069"),
}

// AA is 4.5:1 for body text; 3:1 covers non-text UI such as the focus indicator
// (WCAG 2.2 SC 1.4.11).
const TEXT = 4.5
const UI = 3

const checks = [
  ["light", "Primary button label", light.primaryFg, light.primary, TEXT],
  ["dark", "Primary button label", dark.primaryFg, dark.primary, TEXT],
  ["light", "text-primary on card", light.primary, light.card, TEXT],
  ["dark", "text-primary on card", dark.primary, dark.card, TEXT],
  ["light", "In Progress badge", light.primary, over(light.primary, light.card, 0.1), TEXT],
  ["dark", "In Progress badge", dark.primary, over(dark.primary, dark.card, 0.1), TEXT],
  ["light", "Break badge · short", tw["blue-700"], over(tw["blue-500"], light.card, 0.2), TEXT],
  ["light", "Break badge · lunch", tw["amber-800"], over(tw["amber-500"], light.card, 0.2), TEXT],
  ["light", "Break badge · custom", tw["purple-800"], over(tw["purple-500"], light.card, 0.2), TEXT],
  ["dark", "Break badge · short", tw["blue-400"], over(tw["blue-500"], dark.card, 0.2), TEXT],
  ["dark", "Break badge · lunch", tw["amber-400"], over(tw["amber-500"], dark.card, 0.2), TEXT],
  ["dark", "Break badge · custom", tw["purple-400"], over(tw["purple-500"], dark.card, 0.2), TEXT],
  ["light", "Catch-up available", tw["amber-700"], light.card, TEXT],
  ["dark", "Catch-up available", tw["amber-500"], dark.card, TEXT],
  ["light", "Current task badge", tw["green-700"], light.card, TEXT],
  ["dark", "Current task badge", tw["green-400"], dark.card, TEXT],
  ["light", "Focus ring", light.ring, light.bg, UI],
  ["dark", "Focus ring", dark.ring, dark.card, UI],
]

// The heatmap label sits on every rung of the intensity ladder in month-heatmap.tsx.
const lightSurface = over(light.card, light.bg, 0.5)
const darkSurface = over(ok("0.22 0.04 260"), darkBg, 0.47)
for (const alpha of [0.15, 0.25, 0.35, 0.5]) {
  const pct = alpha * 100
  checks.push([
    "light",
    `Heatmap label on bg-primary/${pct}`,
    ok("0.12 0 0"),
    over(light.primary, lightSurface, alpha),
    TEXT,
  ])
  checks.push([
    "dark",
    `Heatmap label on bg-primary/${pct}`,
    ok("0.97 0.012 255"),
    over(dark.primary, darkSurface, alpha),
    TEXT,
  ])
}

let failures = 0
for (const [theme, label, fg, bg, minimum] of checks) {
  const ratio = contrast(fg, bg)
  const passed = ratio >= minimum
  if (!passed) failures++
  const status = passed ? "pass" : "FAIL"
  console.log(
    `${ratio.toFixed(2).padStart(6)}  ${status}  (min ${minimum})  ${theme.padEnd(5)}  ${label}`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed.`)
  process.exit(1)
}
console.log(`\nAll ${checks.length} contrast checks pass.`)
