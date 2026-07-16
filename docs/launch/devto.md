---
title: "Swapscope: an htmx cheat sheet you watch run"
published: false
tags: htmx, webdev, javascript, go
---

Every htmx reference I found was a table. Attribute name on the left, one sentence on the
right. I could read that `hx-swap="outerHTML"` replaces the whole element and `innerHTML`
replaces its children, but I kept writing the wrong one anyway, because I had never
actually watched the difference happen. So I built [Swapscope](https://apps.charliekrug.com/attribute-lab/):
click a preset, and the real HTTP request and the exact DOM nodes htmx swapped light up
next to each other.

Here are the two decisions that turned out to be interesting.

## Instrument the real events, never mock

The temptation with a tool like this is to fake the network panel: you know the preset, so
you know what the request "should" look like, and you just render that. I did not want
that, because the whole point is trust. If the panel is a mock, it can drift from what htmx
actually does and quietly teach the wrong thing.

So there is no simulation layer. The panels are driven entirely off htmx's own lifecycle
events:

```js
document.body.addEventListener("htmx:configRequest", (evt) => {
  fields.method.textContent = evt.detail.verb.toUpperCase();
  fields.url.textContent = evt.detail.path;
});

document.body.addEventListener("htmx:afterRequest", (evt) => {
  const xhr = evt.detail.xhr;               // the real XHR htmx just made
  fields.status.textContent = String(xhr.status);
  fields.responseBody.textContent = xhr.responseText;
});
```

Every value on screen is read off the actual `XMLHttpRequest`. The DOM patch panel then
reads `outerHTML` off the live element after the swap settles and flash-highlights the node
carrying the current generation stamp. Nothing is invented.

## The static-host problem, and a service worker that answers itself

This is where it got fun. The tool needs a backend to answer `GET api/demo` and return an
htmx fragment. Locally that is a tiny Go server. But I publish these projects as static
files to a CDN with no Go runtime, and on a static host that endpoint 404s, which kills the
entire product.

The fix: a service worker, scoped to the app root, that answers `api/demo` in the browser.
The catch is that it has to return *byte-identical* output to the Go server, or the same
preset would teach two different things depending on where it was deployed. A subtle
difference in an attribute order or an escaped ampersand would be a lie on exactly one
target.

So I ported the Go renderer to JavaScript and pinned both to one contract. A Go test
generates a golden manifest across every swap by target by select combination:

```go
body := renderDemoFragment(swap, target, gen, selectable)
// ... written to testdata/fragments.golden.json
```

and the JavaScript test asserts its own renderer against that same file:

```js
for (const c of golden) {
  const body = renderDemoFragment(c.swap, c.target, c.gen, c.selectable);
  assert.equal(body, c.body);
}
```

Because both sides match the same bytes, they match each other. If either renderer drifts,
a test goes red. The service worker itself stays deliberately narrow: it intercepts only
`api/demo` and lets the page, CSS, and fonts hit the network untouched, so there is no
asset cache to go stale.

One nice side effect: the outerHTML self-swap gotcha is baked into the fragment. When you
swap a button with `outerHTML`, the response has to restate the button's own `hx-*`
attributes or the element stops firing after the first click. Swapscope reproduces that
live, so you can see why real htmx backends echo those attributes back.

## What I would do differently

The connector lines that draw between the panels are positioned by measuring
`getBoundingClientRect()` in JavaScript and animating `stroke-dashoffset`. It works and
looks good, but it is the one part that fights the browser on resize. If I did it again I
would try a pure-CSS anchor approach first.

The code is MIT and [on GitHub](https://github.com/ctkrug/attribute-lab). If you are
teaching htmx to someone, try toggling `hx-swap` in compare mode and watching both patches
land at once. That is the moment the docs never quite delivered for me.
