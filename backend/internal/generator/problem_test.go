package generator

import (
	"encoding/json"
	"strings"
	"testing"
)

const validOutput = `{
	"title": "Late Shipment Window",
	"description": "Return the length of the longest run of late shipments.",
	"examples": [{"input": "late = [1, 1, 0]", "output": "2", "explanation": ""}],
	"constraints": ["1 <= late.length <= 10^5"],
	"functionName": "longestLateRun",
	"starter": "function longestLateRun(late) {\n  // Write your solution here\n  \n}",
	"referenceSolution": "function longestLateRun(late) { let best = 0, run = 0; for (const x of late) { run = x ? run + 1 : 0; best = Math.max(best, run); } return best; }",
	"tests": [
		{"inputJson": "[[1, 1, 0]]", "expectedJson": "2"},
		{"inputJson": "[[0]]", "expectedJson": "0"},
		{"inputJson": "[[1]]", "expectedJson": "1"},
		{"inputJson": "[[1, 0, 1, 1, 1]]", "expectedJson": "3"}
	]
}`

func TestNormalizeDefaultsAndTrims(t *testing.T) {
	req := Request{Topic: "  sliding window  ", Theme: " logistics "}

	if err := req.Normalize(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if req.Topic != "sliding window" || req.Theme != "logistics" {
		t.Errorf("expected trimmed fields, got %+v", req)
	}

	if req.Level != "intermediate" {
		t.Errorf("expected default level %q, got %q", "intermediate", req.Level)
	}
}

func TestNormalizeRejectsInvalidRequests(t *testing.T) {
	tests := map[string]Request{
		"missing topic": {Topic: "   "},
		"long topic":    {Topic: strings.Repeat("a", maxTopicLength+1)},
		"long theme":    {Topic: "heaps", Theme: strings.Repeat("a", maxThemeLength+1)},
		"unknown level": {Topic: "heaps", Level: "expert"},
	}

	for name, req := range tests {
		t.Run(name, func(t *testing.T) {
			if err := req.Normalize(); err == nil {
				t.Error("expected an error")
			}
		})
	}
}

func TestParseProblem(t *testing.T) {
	problem, err := parseProblem(validOutput, Request{Topic: "sliding window", Level: "advanced"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if problem.Topic != "sliding window" {
		t.Errorf("expected topic from request, got %q", problem.Topic)
	}

	if problem.Difficulty != "Hard" {
		t.Errorf("expected difficulty %q, got %q", "Hard", problem.Difficulty)
	}

	if len(problem.Tests) != 4 {
		t.Fatalf("expected 4 tests, got %d", len(problem.Tests))
	}

	encoded, err := json.Marshal(problem.Tests[0])
	if err != nil {
		t.Fatalf("failed to encode test: %v", err)
	}

	expected := `{"input":[[1,1,0]],"expected":2}`
	if string(encoded) != expected {
		t.Errorf("expected test %s, got %s", expected, encoded)
	}
}

func TestParseProblemRejectsBadOutput(t *testing.T) {
	tests := map[string]func(map[string]any){
		"bad function name": func(out map[string]any) { out["functionName"] = "not valid" },
		"starter mismatch":  func(out map[string]any) { out["starter"] = "function other() {}" },
		"too few tests": func(out map[string]any) {
			out["tests"] = out["tests"].([]any)[:minTests-1]
		},
		"input not an array": func(out map[string]any) {
			out["tests"].([]any)[0].(map[string]any)["inputJson"] = "5"
		},
		"invalid expected": func(out map[string]any) {
			out["tests"].([]any)[0].(map[string]any)["expectedJson"] = "{oops"
		},
	}

	for name, mutate := range tests {
		t.Run(name, func(t *testing.T) {
			var out map[string]any
			if err := json.Unmarshal([]byte(validOutput), &out); err != nil {
				t.Fatalf("failed to decode fixture: %v", err)
			}
			mutate(out)

			raw, err := json.Marshal(out)
			if err != nil {
				t.Fatalf("failed to encode fixture: %v", err)
			}

			if _, err := parseProblem(string(raw), Request{Topic: "x", Level: "beginner"}); err == nil {
				t.Error("expected an error")
			}
		})
	}
}
