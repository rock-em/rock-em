package generator

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/anthropics/anthropic-sdk-go/option"
)

func fakeClaude(t *testing.T, stopReason, text string, captured *map[string]any) *ClaudeGenerator {
	t.Helper()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(captured); err != nil {
			t.Errorf("failed to decode request: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"id":            "msg_test",
			"type":          "message",
			"role":          "assistant",
			"model":         model,
			"stop_reason":   stopReason,
			"stop_sequence": nil,
			"content":       []map[string]any{{"type": "text", "text": text}},
			"usage":         map[string]any{"input_tokens": 1, "output_tokens": 1},
		})
	}))
	t.Cleanup(server.Close)

	return NewClaudeGenerator(
		option.WithBaseURL(server.URL),
		option.WithAPIKey("test-key"),
		option.WithMaxRetries(0),
	)
}

func TestClaudeGeneratorParsesStructuredOutput(t *testing.T) {
	var body map[string]any
	generator := fakeClaude(t, "end_turn", validOutput, &body)

	problem, err := generator.Generate(t.Context(), Request{Topic: "sliding window", Theme: "logistics", Level: "beginner"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if problem.FunctionName != "longestLateRun" || problem.Difficulty != "Easy" {
		t.Errorf("unexpected problem: %+v", problem)
	}

	if body["model"] != model {
		t.Errorf("expected model %q, got %v", model, body["model"])
	}

	format, _ := body["output_config"].(map[string]any)["format"].(map[string]any)
	if format["type"] != "json_schema" || format["schema"] == nil {
		t.Errorf("expected a json_schema output format, got %v", body["output_config"])
	}

	prompt, _ := json.Marshal(body["messages"])
	if !strings.Contains(string(prompt), "logistics") {
		t.Errorf("expected theme in prompt, got %s", prompt)
	}
}

func TestClaudeGeneratorHandlesRefusal(t *testing.T) {
	var body map[string]any
	generator := fakeClaude(t, "refusal", "", &body)

	if _, err := generator.Generate(t.Context(), Request{Topic: "heaps", Level: "beginner"}); err == nil {
		t.Error("expected an error")
	}
}
