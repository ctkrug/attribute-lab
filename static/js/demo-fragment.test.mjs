// The JS fragment renderer must emit byte-identical output to the Go handler,
// so a static (service-worker) deploy shows the same real response body as a
// self-hosted Go run. Both sides assert against one Go-authored golden manifest
// (see internal/server/golden_test.go); this is the JS half of that contract.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  renderDemoFragment,
  wrapWithSelectNoise,
  parseDemoParams,
  demoResponseSpec,
  createDemoResponder,
  DEMO_INDICATOR_DELAY_MS,
} from "./demo-fragment.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(
  readFileSync(join(here, "..", "..", "testdata", "fragments.golden.json"), "utf8")
);

test("golden manifest is non-empty (guards a mis-pathed or truncated read)", () => {
  assert.ok(golden.length >= 8, `expected the full swap×target×select matrix, got ${golden.length}`);
});

for (const c of golden) {
  test(`JS renderer matches the Go golden: ${c.name}`, () => {
    let body = renderDemoFragment(c.swap, c.target, c.gen, c.selectable);
    if (c.selectable) {
      body = wrapWithSelectNoise(body);
    }
    assert.equal(body, c.body);
  });
}

// A URLSearchParams shim wired the way the service worker calls parseDemoParams.
function params(query, method = "GET") {
  return parseDemoParams(new URLSearchParams(query), method);
}

test("parseDemoParams defaults an absent or empty swap/target", () => {
  assert.deepEqual(params(""), {
    method: "GET",
    swap: "innerHTML",
    target: "self",
    select: false,
    indicator: false,
  });
  // `?swap=` (present but empty) defaults like Go's url.Values.Get, not an error.
  assert.equal(params("swap=&target=").swap, "innerHTML");
  assert.equal(params("swap=&target=").target, "self");
});

test("parseDemoParams takes the first value of a repeated param", () => {
  assert.equal(params("swap=innerHTML&swap=outerHTML").swap, "innerHTML");
});

test("parseDemoParams reads select/indicator only for the literal 1", () => {
  assert.deepEqual(
    { select: params("select=1").select, indicator: params("indicator=1").indicator },
    { select: true, indicator: true }
  );
  assert.equal(params("select=true").select, false);
  assert.equal(params("indicator=0").indicator, false);
});

test("demoResponseSpec rejects an unsupported swap or target with a 400", () => {
  assert.equal(demoResponseSpec(params("swap=bogus"), 1).status, 400);
  assert.equal(demoResponseSpec(params("target=bogus"), 1).status, 400);
  assert.equal(demoResponseSpec(params("swap=InnerHTML"), 1).status, 400); // case-sensitive
});

test("demoResponseSpec rejects a non-GET method with a 405 and Allow header", () => {
  const spec = demoResponseSpec(params("", "HEAD"), 1);
  assert.equal(spec.status, 405);
  assert.equal(spec.allow, "GET");
});

test("demoResponseSpec serves 200 HTML for a valid request", () => {
  const spec = demoResponseSpec(params("swap=outerHTML"), 5);
  assert.equal(spec.status, 200);
  assert.equal(spec.contentType, "text/html; charset=utf-8");
  assert.match(spec.body, /id="demo-el"/);
});
