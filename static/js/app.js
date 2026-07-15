// Instrumentation layer: taps htmx's own lifecycle events to drive the
// network panel and the DOM patch panel. Nothing here simulates a request —
// every value shown comes from the real XHR htmx just made.
import {
  demoUrlForSwap,
  statusClass,
  parseResponseHeaders,
  escapeHtml,
  splitHighlightSegments,
} from "./lab-core.mjs";

const swapToggle = document.querySelector(".swap-toggle");
const fields = {
  method: document.querySelector('[data-field="method"]'),
  url: document.querySelector('[data-field="url"]'),
  status: document.querySelector('[data-field="status"]'),
  requestHeaders: document.querySelector('[data-field="request-headers"]'),
  responseBody: document.querySelector('[data-field="response-body"]'),
  patchMarkup: document.querySelector('[data-field="patch-markup"]'),
};
const connectorNetwork = document.querySelector(".connector--network");
const connectorPatch = document.querySelector(".connector--patch");
const rigPulse = document.querySelector(".rig-pulse");

let activeSwap = "innerHTML";
let lastRequestSwap = "innerHTML";

function applyPreset(swap) {
  activeSwap = swap;
  const target = document.getElementById("demo-el");
  target.setAttribute("hx-get", demoUrlForSwap(swap));
  target.setAttribute("hx-swap", swap);
  // htmx resolves and caches an element's verb/path the first time it
  // processes it; changing the hx-get attribute afterward is invisible
  // until the element is reprocessed, or the old URL keeps firing.
  htmx.process(target);

  swapToggle.querySelectorAll(".swap-toggle__option").forEach((btn) => {
    const isActive = btn.dataset.swap === swap;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-checked", String(isActive));
  });
}

swapToggle.addEventListener("click", (evt) => {
  const btn = evt.target.closest(".swap-toggle__option");
  if (!btn || btn.disabled) return;
  applyPreset(btn.dataset.swap);
});

document.body.addEventListener("htmx:configRequest", (evt) => {
  lastRequestSwap = activeSwap;
  fields.method.textContent = evt.detail.verb.toUpperCase();
  fields.url.textContent = evt.detail.path;
  fields.requestHeaders.textContent = Object.entries(evt.detail.headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
});

document.body.addEventListener("htmx:afterRequest", (evt) => {
  const xhr = evt.detail.xhr;
  const status = xhr.status;

  fields.status.textContent = String(status);
  fields.status.className = `status-chip ${statusClass(status)}`.trim();
  fields.responseBody.textContent = xhr.responseText;

  void parseResponseHeaders(xhr.getAllResponseHeaders());
  fireConnectors();
});

document.body.addEventListener("htmx:afterSwap", () => {
  requestAnimationFrame(renderPatchPanel);
});

function renderPatchPanel() {
  const target = document.getElementById("demo-el");
  if (!target) return;

  const markup = target.outerHTML;
  const gen = currentGen(target, lastRequestSwap);

  const html = splitHighlightSegments(markup, gen)
    .map((seg) =>
      seg.highlighted
        ? `<mark class="is-flashing">${escapeHtml(seg.text)}</mark>`
        : escapeHtml(seg.text)
    )
    .join("");

  fields.patchMarkup.innerHTML = html;
  flashLiveElement(target);
}

function currentGen(target, swap) {
  const carrier = swap === "outerHTML" ? target : target.querySelector("[data-gen]");
  return carrier ? carrier.getAttribute("data-gen") : null;
}

function flashLiveElement(target) {
  target.classList.remove("is-flashing");
  // Force reflow so re-adding the class restarts the CSS animation even if
  // the previous flash hasn't finished (rapid repeated clicks).
  void target.offsetWidth;
  target.classList.add("is-flashing");
}

function fireConnectors() {
  positionConnectors();
  [connectorNetwork, connectorPatch, rigPulse].forEach((el) => {
    if (!el) return;
    el.classList.remove("is-firing");
    void el.offsetWidth;
    el.classList.add("is-firing");
  });
}

// Draws each connector as a line from the live element's edge to its panel,
// sized so a single dash spans the whole path — see the CSS comment on
// .connector for why that's what makes the dashoffset animation read as a
// self-drawing line rather than marching dashes.
function positionConnectors() {
  const svg = document.querySelector(".connectors");
  const stage = document.querySelector(".zone--stage");
  const networkZone = document.querySelector(".zone--network");
  const patchZone = document.querySelector(".zone--patch");
  if (!svg || !stage || !networkZone || !patchZone) return;

  const rigRect = svg.getBoundingClientRect();
  setLine(connectorNetwork, stage.getBoundingClientRect(), networkZone.getBoundingClientRect(), rigRect);
  setLine(connectorPatch, stage.getBoundingClientRect(), patchZone.getBoundingClientRect(), rigRect);
}

function setLine(line, fromRect, toRect, rigRect) {
  if (!line) return;

  const x1 = fromRect.right - rigRect.left;
  const y1 = fromRect.top + fromRect.height / 2 - rigRect.top;
  const x2 = toRect.left - rigRect.left;
  const y2 = toRect.top + toRect.height / 2 - rigRect.top;

  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);

  const length = Math.hypot(x2 - x1, y2 - y1) || 1;
  line.style.setProperty("--connector-length", length);
  line.setAttribute("stroke-dasharray", `${length} ${length}`);
}

window.addEventListener("resize", positionConnectors);
applyPreset("innerHTML");
positionConnectors();
