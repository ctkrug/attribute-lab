package server

import (
	"encoding/json"
	"fmt"
	"os"
	"testing"
)

// The golden manifest is the shared byte contract between the Go fragment
// renderer (fragments.go) and its JavaScript port (static/js/demo-fragment.mjs,
// which a service worker uses on the static CDN deploy). Both sides assert
// against this same file, so matching it transitively guarantees the two
// backends emit identical response bodies — the network panel shows the same
// real fragment whether Go or the worker answered.
//
// Regenerate after an intentional fragment change with:
//
//	UPDATE_GOLDEN=1 go test ./internal/server -run TestFragmentGolden
const goldenPath = "../../testdata/fragments.golden.json"

type goldenCase struct {
	Name       string `json:"name"`
	Swap       string `json:"swap"`
	Target     string `json:"target"`
	Gen        int64  `json:"gen"`
	Selectable bool   `json:"selectable"`
	Body       string `json:"body"`
}

// goldenCases enumerates every swap × target × select combination against a
// distinct, fixed generation counter (so a gen-interpolation bug in either
// renderer surfaces) and renders each with the Go implementation.
func goldenCases() []goldenCase {
	var cases []goldenCase
	var gen int64
	for _, swap := range []swapStyle{swapInnerHTML, swapOuterHTML} {
		for _, target := range []targetKind{targetSelf, targetExternal} {
			for _, selectable := range []bool{false, true} {
				gen++
				body := renderDemoFragment(swap, target, gen, selectable)
				if selectable {
					body = wrapWithSelectNoise(body)
				}
				cases = append(cases, goldenCase{
					Name:       fmt.Sprintf("%s/%s/select=%t", swap, target, selectable),
					Swap:       string(swap),
					Target:     string(target),
					Gen:        gen,
					Selectable: selectable,
					Body:       body,
				})
			}
		}
	}
	return cases
}

func TestFragmentGolden(t *testing.T) {
	cases := goldenCases()

	if os.Getenv("UPDATE_GOLDEN") != "" {
		data, err := json.MarshalIndent(cases, "", "  ")
		if err != nil {
			t.Fatalf("marshal golden: %v", err)
		}
		if err := os.WriteFile(goldenPath, append(data, '\n'), 0o644); err != nil {
			t.Fatalf("write golden: %v", err)
		}
		t.Logf("wrote %d golden cases to %s", len(cases), goldenPath)
		return
	}

	data, err := os.ReadFile(goldenPath)
	if err != nil {
		t.Fatalf("read golden (regenerate with UPDATE_GOLDEN=1): %v", err)
	}
	var want []goldenCase
	if err := json.Unmarshal(data, &want); err != nil {
		t.Fatalf("unmarshal golden: %v", err)
	}

	if len(want) != len(cases) {
		t.Fatalf("golden has %d cases, renderer produced %d — regenerate with UPDATE_GOLDEN=1", len(want), len(cases))
	}
	for i, c := range cases {
		if want[i] != c {
			t.Errorf("case %q drifted from golden:\n  golden: %#v\n  got:    %#v", c.Name, want[i], c)
		}
	}
}
