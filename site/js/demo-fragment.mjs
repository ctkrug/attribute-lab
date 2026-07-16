// A faithful JavaScript port of internal/server/fragments.go.
//
// The Go server answers GET api/demo for local/self-hosted runs (`make run`),
// but the factory publishes this project as static files to a CDN with no Go
// runtime. So on a static host a service worker (see sw.js) answers the same
// requests in the browser using the renderers below — and the golden manifest
// test (demo-fragment.test.mjs + internal/server/golden_test.go) pins both
// implementations to byte-identical output, so the network panel keeps showing
// a genuine response body either way, never a mock.
//
// Keep the render functions here in lockstep with fragments.go: the swap-shape
// gotchas they encode (outerHTML re-declaring its own hx-* attributes, the
// single hx-select marker) are the whole product, and any drift between the two
// backends would teach a lie on exactly one deploy target.

export const SWAP_INNER = "innerHTML";
export const SWAP_OUTER = "outerHTML";
export const TARGET_SELF = "self";
export const TARGET_EXTERNAL = "external";

// How long the indicator=1 preset artificially holds the response — long
// enough for a human to see the hx-indicator loading state land and clear.
// Mirrors fragments.go's demoIndicatorDelay (600ms).
export const DEMO_INDICATOR_DELAY_MS = 600;

/**
 * Builds the fragment body for a swap/target combination and generation
 * counter. A direct port of fragments.go: renderDemoFragment — see that file's
 * comment for why outerHTML restates its own hx-* attributes and why only the
 * swap root ever carries the hx-select marker.
 */
export function renderDemoFragment(swap, target, gen, selectable) {
  const selectAttr = selectable ? " data-fragment-content" : "";

  // For innerHTML the label span is itself the swap root, so it — and only it —
  // carries the hx-select marker. For outerHTML the wrapper below is the root,
  // so the inner label must stay unmarked, or htmx's hx-select querySelectorAll
  // would hoist the nested match out of its wrapper and duplicate it.
  const innerSelectAttr = swap === SWAP_INNER ? selectAttr : "";

  const content =
    `<span class="demo-el__label"${innerSelectAttr} data-gen="${gen}">` +
    `Request #${gen} handled by <code>${swap}</code> &rarr; <code>${target}</code></span>`;

  if (swap === SWAP_INNER) {
    return content;
  }

  if (target === TARGET_EXTERNAL) {
    return (
      `<div id="demo-target-external" class="demo-target-external"${selectAttr} data-gen="${gen}">` +
      `${content}</div>`
    );
  }

  return (
    `<button id="demo-el" class="demo-el"${selectAttr} data-gen="${gen}" ` +
    `hx-get="api/demo?swap=outerHTML&amp;target=self" hx-target="#demo-el" hx-swap="outerHTML">` +
    `${content}</button>`
  );
}

/**
 * Surrounds payload with sibling nodes hx-select is meant to filter out before
 * the swap. Port of fragments.go: wrapWithSelectNoise — the network panel still
 * shows this full, unfiltered body, which is what makes the response-vs-DOM
 * distinction visible.
 */
export function wrapWithSelectNoise(payload) {
  return (
    `<p class="fragment-noise" aria-hidden="true">// not selected: preceding sibling</p>` +
    `${payload}` +
    `<p class="fragment-noise" aria-hidden="true">// not selected: trailing sibling</p>`
  );
}

/**
 * Normalizes the api/demo query into the same defaults fragments.go applies:
 * an absent OR empty swap/target falls back to its default (so `?swap=` is
 * innerHTML, not an error), select/indicator are the literal string "1", and a
 * repeated param resolves to its first value (URLSearchParams.get, matching
 * Go's url.Values.Get).
 */
export function parseDemoParams(searchParams, method = "GET") {
  const swapRaw = searchParams.get("swap");
  const targetRaw = searchParams.get("target");
  return {
    method: (method || "GET").toUpperCase(),
    swap: swapRaw ? swapRaw : SWAP_INNER,
    target: targetRaw ? targetRaw : TARGET_SELF,
    select: searchParams.get("select") === "1",
    indicator: searchParams.get("indicator") === "1",
  };
}

/**
 * The response spec (status, content type, body, optional Allow header) for a
 * parsed request and generation counter — the pure core of handleDemo. Returns
 * an error spec (405/400) that consumes no generation, or the 200 fragment.
 * Validation mirrors fragments.go exactly, including its case-sensitivity and
 * the plain-text error bodies (http.Error appends the trailing newline).
 */
export function demoResponseSpec(params, gen) {
  if (params.method !== "GET") {
    return {
      status: 405,
      contentType: "text/plain; charset=utf-8",
      body: "method not allowed\n",
      allow: "GET",
    };
  }
  if (params.swap !== SWAP_INNER && params.swap !== SWAP_OUTER) {
    return { status: 400, contentType: "text/plain; charset=utf-8", body: "unsupported swap value\n" };
  }
  if (params.target !== TARGET_SELF && params.target !== TARGET_EXTERNAL) {
    return { status: 400, contentType: "text/plain; charset=utf-8", body: "unsupported target value\n" };
  }

  let body = renderDemoFragment(params.swap, params.target, gen, params.select);
  if (params.select) {
    body = wrapWithSelectNoise(body);
  }
  return { status: 200, contentType: "text/html; charset=utf-8", body };
}

/**
 * Creates the stateful api/demo responder the service worker installs: a
 * process-wide monotonically increasing generation counter (like fragments.go's
 * atomic demoGen), the indicator sleep, and the request→Response mapping.
 *
 * Dependencies are injected so the whole responder — counter increment, the
 * indicator-only delay, validation routing — is testable under node without a
 * real ServiceWorker global: pass a fake Response class and a synchronous
 * sleep. A generation is spent only on a 200, matching the Go handler, which
 * increments after validation and the indicator sleep.
 */
export function createDemoResponder({
  ResponseImpl = typeof Response !== "undefined" ? Response : undefined,
  delayMs = DEMO_INDICATOR_DELAY_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!ResponseImpl) {
    throw new Error("createDemoResponder requires a Response implementation");
  }
  let gen = 0;

  return async function respond(request) {
    const url = new URL(request.url);
    const params = parseDemoParams(url.searchParams, request.method);

    // Validate before consuming a generation or sleeping, exactly as the Go
    // handler does — an invalid swap/target is a 400 with no side effects.
    const errorSpec = demoResponseSpec(params, 0);
    if (errorSpec.status !== 200) {
      return toResponse(ResponseImpl, errorSpec);
    }

    if (params.indicator) {
      await sleep(delayMs);
    }

    gen += 1;
    return toResponse(ResponseImpl, demoResponseSpec(params, gen));
  };
}

function toResponse(ResponseImpl, spec) {
  const headers = { "Content-Type": spec.contentType };
  if (spec.allow) {
    headers["Allow"] = spec.allow;
  }
  return new ResponseImpl(spec.body, { status: spec.status, headers });
}
