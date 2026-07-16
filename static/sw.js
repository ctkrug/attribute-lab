// Attribute Lab's static-deploy backend.
//
// The factory publishes this project as static files to a CDN with no Go
// runtime, so GET api/demo would 404 there and every preset fire — the entire
// product — would be dead. This service worker, scoped to the app root, answers
// api/demo in the browser with byte-identical fragments (see demo-fragment.mjs
// and its golden test). htmx still issues a real network request and the
// network panel still reads real response headers off it, so nothing is mocked;
// only the origin of the bytes moves from the Go process to the worker.
//
// It is deliberately a narrow shim: it intercepts ONLY api/demo and lets every
// other request (the page, CSS, JS, fonts) reach the network untouched, so
// there is no offline asset cache to go stale. Under `make run` the Go server
// answers api/demo directly and this worker is a harmless, identical stand-in.
//
// Lives at the site root (not js/) so its default scope covers api/demo — a
// worker can only control URLs under its own directory.
import { createDemoResponder } from "./js/demo-fragment.mjs";

const respondToDemo = createDemoResponder();

// Take over as soon as possible so the first preset fire after a fresh load is
// already served by the worker rather than racing an uncontrolled network 404.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Match the demo endpoint at any base path (root locally, /attribute-lab/ on
  // the CDN). Everything else falls through to the network untouched.
  if (url.origin !== self.location.origin || !url.pathname.endsWith("/api/demo")) {
    return;
  }
  event.respondWith(respondToDemo(event.request));
});
