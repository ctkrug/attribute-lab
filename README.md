# Attribute Lab

[![CI](https://github.com/ctkrug/attribute-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/attribute-lab/actions/workflows/ci.yml)

Click an `hx-*` attribute preset on a live demo element and watch the actual network
request and the resulting DOM patch animate **in sync, side by side**. Not a cheat sheet
you read — a machine you watch run.

## Why

htmx's whole pitch is "attributes drive behavior," but every reference for it is static
prose: a table of attribute names next to a one-line description. You end up reading about
`hx-swap="outerHTML"` without ever *seeing* what "outer" actually replaces versus
`innerHTML`. Attribute Lab closes that gap — pick a preset, watch the wire, watch the DOM.

## The wow moment

Toggle `hx-swap` from `innerHTML` to `outerHTML` on a live button. The request panel fires
the real HTTP call htmx made (method, headers, response body). At the same instant, the
exact DOM node(s) that got replaced flash-highlight in the live element pane — so the
difference between "replace what's inside" and "replace the whole element" is something
you *see happen*, not something you infer from a paragraph.

## How it works

- A small **Go** server exposes a handful of demo endpoints that return htmx-flavored HTML
  fragments (the same kind of responses a real htmx backend would send).
- The frontend is plain **HTMX** wired to a live demo element. A lightweight instrumentation
  layer taps `htmx:configRequest` / `htmx:afterRequest` / `htmx:afterSwap` to drive two
  synced panels:
  - **Network panel** — method, URL, request headers, response status, response headers,
    response body.
  - **DOM patch panel** — the live element, with swapped nodes flash-highlighted the
    instant the swap lands.
- Presets are just attribute combinations (`hx-get` + `hx-trigger` + `hx-swap` + `hx-target`,
  etc.) applied to the demo element via a dropdown/toggle UI — no code editing required.
- A **compare-swaps mode** flips the single rig into two labs — `innerHTML` beside
  `outerHTML` — fired together by one "Fire both" button so the two DOM patches land side by
  side. Each lab is instrumented independently from the same real htmx event stream.

## Planned features

- [x] Preset picker: `hx-swap` toggle (innerHTML ⇄ outerHTML) — the wow moment.
- [x] Live network panel: real request/response, not a mock — driven by htmx's own events.
- [x] Live DOM patch panel: flash-highlight of exactly the nodes htmx swapped.
- [x] Side-by-side sync: request fires and patch highlight land within the same visible beat.
- [x] Broader preset coverage: `hx-trigger`, `hx-target`, `hx-select`, `hx-indicator`.
- [x] Swap-strategy comparison mode: fire the same trigger against two swap strategies at once.
- [x] Shareable preset links (state encoded in the URL).

## Run it

```
make run          # builds bin/attribute-lab and starts it on :8080
PORT=8090 make run # or pick a port explicitly
make test          # go test -race ./... + node --test static/js/*.test.mjs
```

No database, no build step for the frontend — `static/` is embedded straight into the
binary via `go:embed`, so `make run` needs nothing beyond a Go toolchain. `make test`
additionally needs Node — `test-js` runs `npm install` on first use (dev-only: fast-check
for property tests and jsdom for the comparison-mode smoke tests; nothing ships in the binary).

## Stack

- **Backend:** Go (`net/http`, stdlib only where practical) serving htmx fragment endpoints
  and the static frontend.
- **Frontend:** HTMX + vanilla JS/CSS — no framework, no build step required to run.
- **Tests:** Go's built-in `testing` package (with `-race`) for handler/fragment behavior,
  plus `node --test` — `fast-check` property-based tests for the pure instrumentation-logic
  helpers, and jsdom smoke tests for the comparison-mode DOM glue.

## Status

Epics 1–3 are built: the wow moment, full `hx-trigger`/`hx-target`/`hx-select`/`hx-indicator`
preset coverage, side-by-side swap-strategy comparison mode, and shareable-link state — plus
a keyboard radiogroup pattern with an aria-live status announcer and confirmed
responsive/subpath behavior from Epic 4. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how it fits together,
[`docs/VISION.md`](docs/VISION.md) for the full design,
[`docs/DESIGN.md`](docs/DESIGN.md) for the visual direction, and
[`docs/BACKLOG.md`](docs/BACKLOG.md) for what's left.

## License

MIT — see [`LICENSE`](LICENSE).
