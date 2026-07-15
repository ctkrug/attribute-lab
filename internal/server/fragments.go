package server

import "net/http"

// handleDemo returns a placeholder htmx fragment. It exists so the scaffold
// demo button has a real request/response round trip to hit; the build
// phase replaces it with the actual preset-driven fragment endpoints.
func handleDemo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Write([]byte(`<p>Fragment received at ` + r.URL.Path + `</p>`))
}
