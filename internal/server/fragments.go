// Package server: demo fragment endpoint. The response shape is the whole
// point of the product — it must look exactly like what a real htmx backend
// sends, because the network + DOM patch panels show this verbatim.
package server

import (
	"fmt"
	"net/http"
	"sync/atomic"
)

// demoGen is a process-wide counter stamped into every fragment response so
// the frontend can identify exactly which DOM node(s) came from the most
// recent request (data-gen match), independent of htmx's internal swap
// bookkeeping.
var demoGen int64

// swapStyle is the set of hx-swap values the demo fragment endpoint knows
// how to render distinct markup for.
type swapStyle string

const (
	swapInnerHTML swapStyle = "innerHTML"
	swapOuterHTML swapStyle = "outerHTML"
)

// targetKind is the set of hx-target presets the demo fragment endpoint
// renders distinct markup for: swapping the trigger element itself, or an
// external element elsewhere on the page.
type targetKind string

const (
	targetSelf     targetKind = "self"
	targetExternal targetKind = "external"
)

// handleDemo returns an htmx fragment shaped by the requested swap/target
// preset.
//
// For innerHTML, the response is only the content that replaces the target's
// children — it must NOT include the target's own wrapping tag, or it would
// nest an extra element on every fire.
//
// For outerHTML against the self target, the response includes the full
// replacement element, re-declaring the same hx-get/hx-target/hx-swap
// attributes the original carried — outerHTML swaps replace the triggering
// element itself, so if the new markup didn't restate those attributes, the
// demo would stop firing after the first click. Reproducing that live is one
// of the concrete things this tool exists to show. An external target never
// needs this: the trigger button lives outside the swapped subtree, so it
// keeps its own attributes untouched regardless of swap style.
func handleDemo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query()

	swap := swapStyle(query.Get("swap"))
	if swap == "" {
		swap = swapInnerHTML
	}
	if swap != swapInnerHTML && swap != swapOuterHTML {
		http.Error(w, "unsupported swap value", http.StatusBadRequest)
		return
	}

	target := targetKind(query.Get("target"))
	if target == "" {
		target = targetSelf
	}
	if target != targetSelf && target != targetExternal {
		http.Error(w, "unsupported target value", http.StatusBadRequest)
		return
	}

	gen := atomic.AddInt64(&demoGen, 1)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, renderDemoFragment(swap, target, gen))
}

// renderDemoFragment builds the fragment body for the given swap/target
// combination and generation counter.
func renderDemoFragment(swap swapStyle, target targetKind, gen int64) string {
	content := fmt.Sprintf(
		`<span class="demo-el__label" data-gen="%d">Request #%d handled by <code>%s</code> &rarr; <code>%s</code></span>`,
		gen, gen, swap, target,
	)

	if swap == swapInnerHTML {
		return content
	}

	if target == targetExternal {
		return fmt.Sprintf(
			`<div id="demo-target-external" class="demo-target-external" data-gen="%d">%s</div>`,
			gen, content,
		)
	}

	return fmt.Sprintf(
		`<button id="demo-el" class="demo-el" data-gen="%d" `+
			`hx-get="api/demo?swap=outerHTML&amp;target=self" hx-target="#demo-el" hx-swap="outerHTML">%s</button>`,
		gen, content,
	)
}
