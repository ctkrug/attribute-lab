import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoUrlForSwap,
  statusClass,
  parseResponseHeaders,
  escapeHtml,
  splitHighlightSegments,
} from "./lab-core.mjs";

test("demoUrlForSwap builds a relative, subpath-safe URL", () => {
  assert.equal(demoUrlForSwap("innerHTML"), "api/demo?swap=innerHTML");
  assert.equal(demoUrlForSwap("outerHTML"), "api/demo?swap=outerHTML");
});

test("demoUrlForSwap rejects unknown swap styles", () => {
  assert.throws(() => demoUrlForSwap("bogus"), RangeError);
  assert.throws(() => demoUrlForSwap(""), RangeError);
});

test("statusClass buckets 2xx as success and 4xx/5xx as error", () => {
  assert.equal(statusClass(200), "is-success");
  assert.equal(statusClass(299), "is-success");
  assert.equal(statusClass(404), "is-error");
  assert.equal(statusClass(500), "is-error");
  assert.equal(statusClass(599), "is-error");
});

test("statusClass returns empty string for anything else", () => {
  assert.equal(statusClass(0), "");
  assert.equal(statusClass(101), "");
  assert.equal(statusClass(302), "");
});

test("parseResponseHeaders parses the raw XHR header block", () => {
  const raw = "Content-Type: text/html; charset=utf-8\r\nX-Gen: 3\r\n";
  assert.deepEqual(parseResponseHeaders(raw), [
    ["Content-Type", "text/html; charset=utf-8"],
    ["X-Gen", "3"],
  ]);
});

test("parseResponseHeaders handles empty input", () => {
  assert.deepEqual(parseResponseHeaders(""), []);
  assert.deepEqual(parseResponseHeaders(null), []);
});

test("parseResponseHeaders tolerates a header with no colon", () => {
  assert.deepEqual(parseResponseHeaders("malformed-line\r\n"), [["malformed-line", ""]]);
});

test("escapeHtml escapes all five reserved characters", () => {
  assert.equal(escapeHtml(`<a href="x" b='y'>&</a>`), "&lt;a href=&quot;x&quot; b=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("escapeHtml leaves plain text untouched", () => {
  assert.equal(escapeHtml("Request #3 handled by outerHTML"), "Request #3 handled by outerHTML");
});

test("splitHighlightSegments highlights the whole outer element when outer and inner share a gen", () => {
  const markup = '<button id="demo-el" data-gen="5"><span data-gen="5">hi</span></button>';
  const segments = splitHighlightSegments(markup, 5);
  assert.deepEqual(segments, [{ text: markup, highlighted: true }]);
});

test("splitHighlightSegments highlights only the inner span for an innerHTML fragment", () => {
  const markup = '<button id="demo-el"><span data-gen="7">hi</span></button>';
  const segments = splitHighlightSegments(markup, 7);
  assert.deepEqual(segments, [
    { text: '<button id="demo-el">', highlighted: false },
    { text: '<span data-gen="7">hi</span>', highlighted: true },
    { text: "</button>", highlighted: false },
  ]);
});

test("splitHighlightSegments returns the whole string unhighlighted when gen is absent", () => {
  const markup = '<span data-gen="1">hi</span>';
  assert.deepEqual(splitHighlightSegments(markup, 2), [{ text: markup, highlighted: false }]);
});

test("splitHighlightSegments handles an empty markup string", () => {
  assert.deepEqual(splitHighlightSegments("", 1), [{ text: "", highlighted: false }]);
});

test("splitHighlightSegments highlights multiple separate matches", () => {
  const markup = '<span data-gen="2">a</span><i>gap</i><span data-gen="2">b</span>';
  const segments = splitHighlightSegments(markup, 2);
  assert.deepEqual(segments, [
    { text: '<span data-gen="2">a</span>', highlighted: true },
    { text: "<i>gap</i>", highlighted: false },
    { text: '<span data-gen="2">b</span>', highlighted: true },
  ]);
});
