// Covers createDemoResponder — the stateful api/demo backend the service worker
// installs (sw.js). The worker global can't run under node --test, so the
// responder takes its Response class and sleep injected, letting these tests
// exercise the generation counter, the indicator-only delay, and the
// validation-without-side-effects path directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemoResponder } from "./demo-fragment.mjs";

// A minimal stand-in for the platform Response: records the body and init so
// tests can assert status/headers without a real ServiceWorker environment.
class FakeResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = init.headers ?? {};
  }
}

function req(query, method = "GET") {
  return { url: `https://host/attribute-lab/api/demo${query}`, method };
}

function newResponder(sleepCalls = []) {
  return createDemoResponder({
    ResponseImpl: FakeResponse,
    delayMs: 600,
    sleep: (ms) => {
      sleepCalls.push(ms);
      return Promise.resolve();
    },
  });
}

test("each successful request advances the generation counter", async () => {
  const respond = newResponder();
  const first = await respond(req("?swap=innerHTML"));
  const second = await respond(req("?swap=innerHTML"));

  assert.match(first.body, /Request #1 /);
  assert.match(second.body, /Request #2 /);
  assert.equal(first.status, 200);
  assert.equal(first.headers["Content-Type"], "text/html; charset=utf-8");
});

test("indicator=1 awaits the delay; its absence does not", async () => {
  const calls = [];
  const respond = newResponder(calls);

  await respond(req("?indicator=1"));
  assert.deepEqual(calls, [600]);

  await respond(req(""));
  assert.deepEqual(calls, [600], "a request without indicator must not sleep");
});

test("a validation failure consumes no generation", async () => {
  const respond = newResponder();

  const bad = await respond(req("?swap=bogus"));
  assert.equal(bad.status, 400);

  // The next valid request is still generation 1 — the rejected one didn't
  // advance the counter, matching the Go handler's increment-after-validate.
  const ok = await respond(req("?swap=innerHTML"));
  assert.match(ok.body, /Request #1 /);
});

test("a non-GET method is rejected with 405 and an Allow header", async () => {
  const respond = newResponder();
  const res = await respond(req("", "POST"));

  assert.equal(res.status, 405);
  assert.equal(res.headers["Allow"], "GET");
});

test("an invalid request never triggers the indicator delay", async () => {
  const calls = [];
  const respond = newResponder(calls);
  await respond(req("?swap=bogus&indicator=1"));
  assert.deepEqual(calls, [], "validation runs before the sleep, so a 400 skips it");
});

test("createDemoResponder without a Response implementation fails fast", () => {
  assert.throws(() => createDemoResponder({ ResponseImpl: null }), /Response implementation/);
});
