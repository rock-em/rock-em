package generator

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

const (
	maxTopicLength = 120
	maxThemeLength = 200
	minTests       = 4
)

var levels = map[string]string{
	"beginner":     "Easy",
	"intermediate": "Medium",
	"advanced":     "Hard",
}

var identifier = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$]*$`)

// Request describes the problem a user wants generated.
type Request struct {
	Topic string `json:"topic"`
	Theme string `json:"theme"`
	Level string `json:"level"`
}

// Normalize trims the request fields and checks they are usable.
func (r *Request) Normalize() error {
	r.Topic = strings.TrimSpace(r.Topic)
	r.Theme = strings.TrimSpace(r.Theme)
	r.Level = strings.ToLower(strings.TrimSpace(r.Level))

	if r.Level == "" {
		r.Level = "intermediate"
	}

	switch {
	case r.Topic == "":
		return errors.New("topic is required")
	case len(r.Topic) > maxTopicLength:
		return fmt.Errorf("topic must be at most %d characters", maxTopicLength)
	case len(r.Theme) > maxThemeLength:
		return fmt.Errorf("theme must be at most %d characters", maxThemeLength)
	}

	if _, ok := levels[r.Level]; !ok {
		return errors.New("level must be beginner, intermediate, or advanced")
	}

	return nil
}

type Example struct {
	Input       string `json:"input"`
	Output      string `json:"output"`
	Explanation string `json:"explanation,omitempty"`
}

type TestCase struct {
	Input    json.RawMessage `json:"input"`
	Expected json.RawMessage `json:"expected"`
}

// Problem is a generated problem in the shape the frontend workspace expects.
type Problem struct {
	Title             string     `json:"title"`
	Topic             string     `json:"topic"`
	Difficulty        string     `json:"difficulty"`
	Description       string     `json:"description"`
	Examples          []Example  `json:"examples"`
	Constraints       []string   `json:"constraints"`
	FunctionName      string     `json:"functionName"`
	Starter           string     `json:"starter"`
	ReferenceSolution string     `json:"referenceSolution"`
	Tests             []TestCase `json:"tests"`
}

// modelOutput mirrors outputSchema. Test values arrive as JSON-encoded
// strings because structured outputs cannot describe arbitrary JSON values.
type modelOutput struct {
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Examples          []Example `json:"examples"`
	Constraints       []string  `json:"constraints"`
	FunctionName      string    `json:"functionName"`
	Starter           string    `json:"starter"`
	ReferenceSolution string    `json:"referenceSolution"`
	Tests             []struct {
		InputJSON    string `json:"inputJson"`
		ExpectedJSON string `json:"expectedJson"`
	} `json:"tests"`
}

var outputSchema = mustDecodeSchema(`{
	"type": "object",
	"additionalProperties": false,
	"required": ["title", "description", "examples", "constraints", "functionName", "starter", "referenceSolution", "tests"],
	"properties": {
		"title": {"type": "string"},
		"description": {"type": "string"},
		"examples": {
			"type": "array",
			"items": {
				"type": "object",
				"additionalProperties": false,
				"required": ["input", "output", "explanation"],
				"properties": {
					"input": {"type": "string"},
					"output": {"type": "string"},
					"explanation": {"type": "string"}
				}
			}
		},
		"constraints": {"type": "array", "items": {"type": "string"}},
		"functionName": {"type": "string"},
		"starter": {"type": "string"},
		"referenceSolution": {"type": "string"},
		"tests": {
			"type": "array",
			"items": {
				"type": "object",
				"additionalProperties": false,
				"required": ["inputJson", "expectedJson"],
				"properties": {
					"inputJson": {"type": "string"},
					"expectedJson": {"type": "string"}
				}
			}
		}
	}
}`)

func mustDecodeSchema(raw string) map[string]any {
	var schema map[string]any
	if err := json.Unmarshal([]byte(raw), &schema); err != nil {
		panic(fmt.Sprintf("invalid output schema: %v", err))
	}
	return schema
}

// parseProblem decodes and validates the model's structured output.
func parseProblem(raw string, req Request) (Problem, error) {
	var out modelOutput
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return Problem{}, fmt.Errorf("decode model output: %w", err)
	}

	switch {
	case strings.TrimSpace(out.Title) == "":
		return Problem{}, errors.New("generated problem has no title")
	case strings.TrimSpace(out.Description) == "":
		return Problem{}, errors.New("generated problem has no description")
	case !identifier.MatchString(out.FunctionName):
		return Problem{}, fmt.Errorf("generated function name %q is not a valid identifier", out.FunctionName)
	case !strings.Contains(out.Starter, out.FunctionName):
		return Problem{}, errors.New("starter code does not define the function")
	case !strings.Contains(out.ReferenceSolution, out.FunctionName):
		return Problem{}, errors.New("reference solution does not define the function")
	case len(out.Tests) < minTests:
		return Problem{}, fmt.Errorf("generated %d tests, need at least %d", len(out.Tests), minTests)
	}

	tests := make([]TestCase, 0, len(out.Tests))
	for i, test := range out.Tests {
		var args []json.RawMessage
		if err := json.Unmarshal([]byte(test.InputJSON), &args); err != nil {
			return Problem{}, fmt.Errorf("test %d input is not a JSON array: %w", i+1, err)
		}
		if !json.Valid([]byte(test.ExpectedJSON)) {
			return Problem{}, fmt.Errorf("test %d expected value is not valid JSON", i+1)
		}
		tests = append(tests, TestCase{
			Input:    json.RawMessage(test.InputJSON),
			Expected: json.RawMessage(test.ExpectedJSON),
		})
	}

	return Problem{
		Title:             out.Title,
		Topic:             req.Topic,
		Difficulty:        levels[req.Level],
		Description:       out.Description,
		Examples:          out.Examples,
		Constraints:       out.Constraints,
		FunctionName:      out.FunctionName,
		Starter:           out.Starter,
		ReferenceSolution: out.ReferenceSolution,
		Tests:             tests,
	}, nil
}
