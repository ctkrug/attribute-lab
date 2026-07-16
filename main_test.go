package main

import "testing"

func TestEnvOrReturnsTheEnvValueWhenSet(t *testing.T) {
	t.Setenv("ATTRIBUTE_LAB_TEST_VAR", "9090")
	if got := envOr("ATTRIBUTE_LAB_TEST_VAR", "8080"); got != "9090" {
		t.Fatalf("envOr() = %q, want %q", got, "9090")
	}
}

func TestEnvOrFallsBackWhenUnset(t *testing.T) {
	if got := envOr("ATTRIBUTE_LAB_TEST_VAR_UNSET", "8080"); got != "8080" {
		t.Fatalf("envOr() = %q, want fallback %q", got, "8080")
	}
}

func TestEnvOrFallsBackWhenSetToEmptyString(t *testing.T) {
	t.Setenv("ATTRIBUTE_LAB_TEST_VAR", "")
	if got := envOr("ATTRIBUTE_LAB_TEST_VAR", "8080"); got != "8080" {
		t.Fatalf("envOr() = %q, want fallback %q for an empty-string env var", got, "8080")
	}
}
