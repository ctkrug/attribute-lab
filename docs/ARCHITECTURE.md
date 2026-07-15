# Architecture

A concise map of the codebase for anyone picking this project up cold. See
`docs/VISION.md` for why it exists and `docs/DESIGN.md` for the visual system.

## Layout

```
main.go                        entrypoint: embeds static/, builds the mux, listens on $PORT
internal/server/
  server.go                    routes: GET /healthz, GET /api/demo, GET / (static file server)
  health.go                    liveness check
  fragments.go                 the demo endpoint — the whole product's credibility hinges on this
  *_test.go                    handler tests (net/http/httptest, no server process needed)
static/
  index.html                   the single page: preset bar, live element, network + patch panels
  css/style.css                docs/DESIGN.md tokens and the blueprint visual system
  js/
    lab-core.mjs                pure logic: URL building, status bucketing, header parsing,
                                escaping, and the gen-scoped highlight splitter — zero DOM access
    lab-core.test.mjs           node --test coverage for the above
    app.js                      DOM glue: htmx event listeners, preset toggle, connector lines
```

## Request/response flow (the wow moment)

1. The preset picker's swap toggle (`app.js: applyPreset`) sets `hx-get` and `hx-swap` on
   `#demo-el`, then calls `htmx.process(target)` — **required**, because htmx resolves and
   caches an element's verb/path the first time it binds the element, so mutating `hx-get`
   afterward is invisible until the element is reprocessed.
2. Clicking `#demo-el` fires the real htmx request. `htmx:configRequest` is used to read the
   verb/path/headers actually being sent (network panel's "request" side).
3. `internal/server/fragments.go: handleDemo` renders a fragment shaped by `?swap=`:
   - `innerHTML` → only the replacement content (a `<span data-gen="N">`).
   - `outerHTML` → the *whole* replacement element, re-declaring `hx-get`/`hx-target`/`hx-swap`
     — outerHTML swaps replace the triggering element itself, so if the response didn't restate
     those attributes, the demo would go dead after one click. This is a real htmx gotcha, shown
     live rather than described.
   Every fragment is stamped with a process-wide, monotonically increasing `data-gen` counter.
4. `htmx:afterRequest` populates the network panel's response side (status, body) straight from
   the XHR — nothing here is synthesized.
5. `htmx:afterSwap` triggers `app.js: renderPatchPanel`, which reads `#demo-el`'s *current*
   `outerHTML` from the live DOM and runs it through `lab-core.mjs: splitHighlightSegments` with
   the latest `data-gen`. That function finds the element(s) whose opening tag carries the
   matching `data-gen` and returns highlighted/non-highlighted text segments; nested matches
   (e.g. the outerHTML wrapper and its inner span sharing a gen) collapse to the outer boundary.
   The result is escaped and re-assembled with real `<mark>` tags for the patch panel.
6. Connector lines (`app.js: positionConnectors`/`fireConnectors`) are measured against the
   actual zone bounding boxes and given a `stroke-dasharray` equal to their own length, so the
   `stroke-dashoffset` CSS animation reads as the line drawing itself rather than marching dashes.
   Below ~1024px the diagonal lines are hidden in favor of `.rig-pulse`, a simple vertical bar.

## Why the highlight logic lives in a separate pure module

`lab-core.mjs` has no DOM access, which is what makes it runnable directly under
`node --test` (see `static/js/lab-core.test.mjs`) without a browser or jsdom. `app.js` is the
thin, harder-to-unit-test DOM glue layer; keeping the parsing/formatting logic out of it is
what makes the interesting bug classes (gen-matching, header parsing, highlight splitting)
testable in isolation.

## Subpath deployment

The project is deployed at `apps.charliekrug.com/attribute-lab/`, a subpath, not a domain
root. Every asset reference (`css/style.css`, `js/app.js`) and the demo fragment endpoint
(`api/demo`) is relative (no leading slash), and `<base href="./">` in `index.html` makes that
resolution correct even if the deployed URL is visited without a trailing slash.

## Running it

```
make build    # go build -o bin/attribute-lab .
make run      # build + run, PORT env var overrides the default :8080
make test     # go test ./... && node --test static/js/*.test.mjs
make vet
make fmt      # gofmt -l . (lists files needing formatting)
```

`main.go` embeds `static/` at compile time (`//go:embed static`), so changes to any file under
`static/` require a rebuild to take effect when running the compiled binary.
