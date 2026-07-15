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

// handleDemo returns an htmx fragment shaped by the requested swap style.
//
// For innerHTML, the response is only the content that replaces the target's
// children — it must NOT include the target's own wrapping tag, or it would
// nest an extra element on every fire.
//
// For outerHTML, the response includes the full replacement element,
// re-declaring the same hx-get/hx-target/hx-swap attributes the original
// carried — outerHTML swaps replace the triggering element itself, so if the
// new markup didn't restate those attributes, the demo would stop firing
// after the first click. Reproducing that live is one of the concrete things
// this tool exists to show.
func handleDemo(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	swap := swapStyle(r.URL.Query().Get("swap"))
	if swap == "" {
		swap = swapInnerHTML
	}
	if swap != swapInnerHTML && swap != swapOuterHTML {
		http.Error(w, "unsupported swap value", http.StatusBadRequest)
		return
	}

	gen := atomic.AddInt64(&demoGen, 1)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, renderDemoFragment(swap, gen))
}

// renderDemoFragment builds the fragment body for the given swap style and
// generation counter.
func renderDemoFragment(swap swapStyle, gen int64) string {
	content := fmt.Sprintf(
		`<span class="demo-el__label" data-gen="%d">Request #%d handled by <code>%s</code></span>`,
		gen, gen, swap,
	)

	if swap == swapInnerHTML {
		return content
	}

	return fmt.Sprintf(
		`<button id="demo-el" class="demo-el" data-gen="%d" `+
			`hx-get="/api/demo?swap=outerHTML" hx-target="#demo-el" hx-swap="outerHTML">%s</button>`,
		gen, content,
	)
}
