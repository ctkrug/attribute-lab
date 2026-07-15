// Command attribute-lab runs the Attribute Lab demo server: it serves the
// static frontend and the htmx fragment endpoints the frontend calls.
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/ctkrug/attribute-lab/internal/server"
)

func main() {
	addr := ":" + envOr("PORT", "8080")

	mux := server.New()

	log.Printf("attribute-lab listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
