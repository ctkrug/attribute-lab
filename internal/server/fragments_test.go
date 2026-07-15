package server

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"strconv"
	"strings"
	"testing"
)

var genAttr = regexp.MustCompile(`data-gen="(\d+)"`)

func fireDemo(t *testing.T, query string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/demo"+query, nil)
	rec := httptest.NewRecorder()
	testMux().ServeHTTP(rec, req)
	return rec
}

func TestDemoFragmentDefaultsToInnerHTML(t *testing.T) {
	rec := fireDemo(t, "")

	body := rec.Body.String()
	if want := "innerHTML"; !strings.Contains(body, want) {
		t.Fatalf("body = %q, want it to mention %q", body, want)
	}
	if strings.Contains(body, "<button") {
		t.Fatalf("body = %q, innerHTML fragment must not include a wrapping element", body)
	}
}

func TestDemoFragmentOuterHTMLIncludesWrappingElement(t *testing.T) {
	rec := fireDemo(t, "?swap=outerHTML")

	body := rec.Body.String()
	for _, want := range []string{`id="demo-el"`, `hx-swap="outerHTML"`, `hx-target="#demo-el"`, `hx-get="api/demo?swap=outerHTML"`} {
		if !strings.Contains(body, want) {
			t.Fatalf("body = %q, want it to contain %q", body, want)
		}
	}
}

func TestDemoFragmentRejectsUnsupportedSwapValue(t *testing.T) {
	rec := fireDemo(t, "?swap=bogus")

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestDemoFragmentGenerationIncrementsAcrossRequests(t *testing.T) {
	first := genOf(t, fireDemo(t, "").Body.String())
	second := genOf(t, fireDemo(t, "").Body.String())

	if second <= first {
		t.Fatalf("gen did not increase: first=%d second=%d", first, second)
	}
}

func TestDemoFragmentInnerAndOuterShareSameGenScheme(t *testing.T) {
	inner := genOf(t, fireDemo(t, "?swap=innerHTML").Body.String())
	outer := genOf(t, fireDemo(t, "?swap=outerHTML").Body.String())

	if outer <= inner {
		t.Fatalf("expected outerHTML gen to be greater than preceding innerHTML gen: inner=%d outer=%d", inner, outer)
	}
}

func genOf(t *testing.T, body string) int {
	t.Helper()
	m := genAttr.FindStringSubmatch(body)
	if m == nil {
		t.Fatalf("body = %q, want a data-gen attribute", body)
	}
	n, err := strconv.Atoi(m[1])
	if err != nil {
		t.Fatalf("data-gen value %q is not an integer: %v", m[1], err)
	}
	return n
}
