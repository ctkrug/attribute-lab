# Design

## 1. Aesthetic direction

**Blueprint/technical.** Attribute Lab is a schematic of a mechanism, not a marketing page:
the frame reads like an engineering blueprint — navy ground, cyan tracing lines, dashed
leader lines connecting the live demo element to its instrumentation panels, monospace
annotation labels stamped in the corners. The whole point of the product is "watch the
wire, watch the diff" — the blueprint idiom makes that literal instead of decorative.

This is deliberately not another dark-gray-cards dev-tool page: no rounded glass panels,
no soft neumorphic shadows. Lines are crisp, corners are mostly square, and the surface
reads like tracing paper over a schematic — technical, precise, slightly retro-engineering
rather than "SaaS dashboard."

## 2. Tokens

**Color**

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a1826` | page ground (deep blueprint navy) |
| `--surface-1` | `#0f2136` | panel background |
| `--surface-2` | `#15304a` | raised panel / active preset chip |
| `--line` | `#254a68` | grid lines, panel borders (low-emphasis) |
| `--text` | `#e8f2fb` | primary text |
| `--text-muted` | `#7fa1bd` | secondary text, labels, annotations |
| `--accent` | `#5ec8f2` | cyan tracing line — links, focus rings, active state |
| `--accent-support` | `#f2a65e` | amber — the DOM-patch flash highlight, "fires now" moments |
| `--success` | `#5ef2a6` | 2xx status, passing state |
| `--danger` | `#f25e5e` | 4xx/5xx status, error state |

Blueprint grid: a faint repeating linear-gradient grid (`--line` at ~8% opacity, 24px cells)
behind every full-bleed surface — the "graph paper" texture, never a flat solid fill.

**Type**

- Display / annotation font: **IBM Plex Mono** (600) — wordmark, section labels, HTTP
  method/status readouts, DOM tag names. Monospace reinforces "this is instrumentation
  output," not prose.
- UI font: **IBM Plex Sans** (400/500) — body copy, descriptions, button labels.
- Fallback stack: `"IBM Plex Mono", ui-monospace, "SF Mono", monospace` and
  `"IBM Plex Sans", -apple-system, "Segoe UI", sans-serif`.
- Scale: 1.25 ratio — 13 / 16 / 20 / 25 / 31 / 39px.

**Spacing / shape / motion**

- Spacing unit: 4px base (4/8/12/16/24/32/48/64).
- Corner radius: 2px on panels and controls (almost-square, blueprint stamp) — never
  pill-shaped except status chips.
- Elevation: no drop shadows; depth comes from a 1px `--line` border plus a 1px inset
  highlight in `--accent` at 15% opacity on active panels — panels look "traced," not lifted.
- Motion: UI transitions 150–220ms ease-out. The signature connector lines animate via
  `stroke-dashoffset` over 300–450ms when a request fires — slower than a button hover
  because it's the thing the user is watching happen.

## 3. Layout intent

**The hero is the instrument panel**: the live demo element in the center, with dashed
cyan leader lines running to a **network panel** (request/response) and a **DOM patch
panel** (the live element's markup, with swapped nodes flash-highlighted). This trio
occupies ~70% of the viewport on desktop; the preset picker is a compact strip above it.

- **1440×900 desktop**: three-zone grid — preset picker bar (full width, ~72px) on top;
  below it, a 40/60 split: left zone is the live demo element on blueprint graph paper
  with annotation labels; right zone stacks the network panel (top half) over the DOM
  patch panel (bottom half). Dashed connector lines cross the gap between zones and
  animate on fire.
- **390×844 phone**: single column, stacked in fire-order — preset picker (horizontally
  scrollable chip row) → live demo element → network panel → DOM patch panel. Connector
  lines collapse to a simple vertical pulse between stacked panels rather than diagonal
  leader lines (no room to route them legibly at this width).
- No dead space: every zone has a graph-paper background treatment so empty areas still
  read as "part of the schematic," never blank white/navy voids.

## 4. Signature detail

**Animated connector lines.** When a preset fires, dashed cyan lines trace themselves
(`stroke-dashoffset` sweep) from the demo element to the network panel and DOM patch
panel in real time, terminating in a small annotation label (`REQUEST →`, `PATCH →`) that
fades in as the line completes. This is both the memorable flourish and the literal
mechanism of the product's wow moment — the sync isn't just simultaneous panel updates,
it's a drawn line showing cause and effect.

## 5. Juice plan

Not applicable — Attribute Lab is a developer teaching tool, not a game or playful toy.
Feedback is scoped to D2's standard interaction states (hover/focus/active/disabled on
every control) plus the connector-line animation and DOM flash-highlight described above,
which together carry the "watch it happen" feel without game-style juice (no SFX, no win
states). `prefers-reduced-motion` disables the connector-line sweep and flash-highlight
pulse in favor of an instant, static reveal.
