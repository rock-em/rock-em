package problems

import (
	"bytes"
	"encoding/json"
	"math"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Summary is the complete list response: no code, examples, tests or full statement.
type Summary struct {
	Slug             string `json:"slug"`
	Title            string `json:"title"`
	ShortDescription string `json:"shortDescription"`
	Difficulty       string `json:"difficulty"`
	Category         string `json:"category"`
}

// Signature is the one language-agnostic contract; runners map its types to native ones.
// Output names a parameter the solution changes in place. With a void return
// the parameter's final value is checked; with an int return k, its first k items.
type Signature struct {
	Function string  `json:"function"`
	Params   []Param `json:"params"`
	Returns  string  `json:"returns"`
	Output   string  `json:"output,omitempty"`
}
type Param struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// Test values are JSON matching the signature: args are positional parameters.
type Test struct {
	Args        []json.RawMessage `json:"args"`
	Expected    json.RawMessage   `json:"expected"`
	Explanation string            `json:"explanation,omitempty"`
}
type TestInput struct {
	Kind string `json:"kind"`
	Test
}
type Input struct {
	Summary
	Topics      []string          `json:"topics"`
	Description string            `json:"description"`
	Constraints []string          `json:"constraints"`
	Signature   *Signature        `json:"signature"`
	Compare     string            `json:"compare"`
	Tests       []TestInput       `json:"tests"`
	Starters    map[string]string `json:"starters"`
}

type ProblemDetail struct {
	Summary
	Topics       []string  `json:"topics"`
	Description  string    `json:"description"`
	Constraints  []string  `json:"constraints"`
	Signature    Signature `json:"signature"`
	Compare      string    `json:"compare"`
	Examples     []Test    `json:"examples"`
	Tests        []Test    `json:"tests"`
	Language     string    `json:"language"`
	FunctionName string    `json:"functionName"`
	Starter      string    `json:"starter"`
	IndentUnit   string    `json:"indentUnit"`
}

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var languagePattern = regexp.MustCompile(`^[a-z][a-z0-9_+-]{0,31}$`)
var identPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,63}$`)
var typePattern = regexp.MustCompile(`^(int|long|double|bool|string|char|ListNode|TreeNode)((?:\[\]){0,3})$`)
var topicSlugPattern = regexp.MustCompile(`[^a-z0-9]+`)

func topicSlug(name string) string {
	return strings.Trim(topicSlugPattern.ReplaceAllString(strings.ToLower(name), "-"), "-")
}

func (in *Input) valid() bool {
	in.Title = strings.TrimSpace(in.Title)
	in.ShortDescription = strings.TrimSpace(in.ShortDescription)
	in.Description = strings.TrimSpace(in.Description)
	in.Category = strings.TrimSpace(in.Category)
	if len(in.Slug) == 0 || len(in.Slug) > 120 || !slugPattern.MatchString(in.Slug) || in.Slug == "generate" || len(in.Title) == 0 || len(in.Title) > 200 || utf8.RuneCountInString(in.ShortDescription) == 0 || utf8.RuneCountInString(in.ShortDescription) > 200 || len(in.Description) == 0 || len(in.Description) > 50000 || (in.Difficulty != "easy" && in.Difficulty != "medium" && in.Difficulty != "hard") {
		return false
	}
	// Category is the primary topic; the rest are extra tags, deduplicated by slug.
	topics, seen := []string{}, map[string]bool{}
	for _, name := range append([]string{in.Category}, in.Topics...) {
		name = strings.TrimSpace(name)
		slug := topicSlug(name)
		if len(name) > 120 || slug == "" {
			return false
		}
		if !seen[slug] {
			seen[slug] = true
			topics = append(topics, name)
		}
	}
	if len(topics) > 10 {
		return false
	}
	in.Topics = topics
	if in.Constraints == nil {
		in.Constraints = []string{}
	}
	if len(in.Constraints) > 50 {
		return false
	}
	for _, s := range in.Constraints {
		if strings.TrimSpace(s) == "" || len(s) > 2000 {
			return false
		}
	}
	if in.Compare == "" {
		in.Compare = "exact"
	}
	if in.Signature == nil || !in.Signature.valid() || (in.Compare != "exact" && in.Compare != "unordered") || (in.Compare == "unordered" && !strings.HasSuffix(in.Signature.checked(), "[]")) {
		return false
	}
	if len(in.Tests) == 0 || len(in.Tests) > 100 {
		return false
	}
	examples := 0
	for _, test := range in.Tests {
		if test.Kind == "example" {
			examples++
		} else if (test.Kind != "public" && test.Kind != "hidden") || test.Explanation != "" {
			return false
		}
		if len(test.Explanation) > 2000 || !in.Signature.accepts(test.Test) {
			return false
		}
	}
	if examples > 20 || len(in.Starters) > 32 {
		return false
	}
	for language, code := range in.Starters {
		if !languagePattern.MatchString(language) || strings.TrimSpace(code) == "" || len(code) > 50000 {
			return false
		}
	}
	return true
}

func (s *Signature) valid() bool {
	if !identPattern.MatchString(s.Function) || (!typePattern.MatchString(s.Returns) && s.Returns != "void") || len(s.Params) > 10 {
		return false
	}
	if s.Params == nil {
		s.Params = []Param{}
	}
	names := map[string]bool{}
	for _, p := range s.Params {
		if !identPattern.MatchString(p.Name) || !typePattern.MatchString(p.Type) || names[p.Name] {
			return false
		}
		names[p.Name] = true
	}
	if s.Output == "" {
		return s.Returns != "void"
	}
	output := s.checked()
	return names[s.Output] && (s.Returns == "void" || (s.Returns == "int" && strings.HasSuffix(output, "[]")))
}

// checked is the type of the value tests compare against.
func (s *Signature) checked() string {
	for _, p := range s.Params {
		if s.Output != "" && p.Name == s.Output {
			return p.Type
		}
	}
	return s.Returns
}

// accepts reports whether the test's JSON values have the signature's shapes.
func (s *Signature) accepts(t Test) bool {
	if len(t.Args) != len(s.Params) {
		return false
	}
	for i, p := range s.Params {
		if !valueMatches(p.Type, t.Args[i]) {
			return false
		}
	}
	return valueMatches(s.checked(), t.Expected)
}

func valueMatches(typ string, raw json.RawMessage) bool {
	if base, ok := strings.CutSuffix(typ, "[]"); ok {
		var items []json.RawMessage
		if !isArray(raw) || json.Unmarshal(raw, &items) != nil {
			return false
		}
		for _, item := range items {
			if !valueMatches(base, item) {
				return false
			}
		}
		return true
	}
	switch typ {
	case "ListNode":
		return valueMatches("int[]", raw)
	case "TreeNode":
		var items []*json.RawMessage
		if !isArray(raw) || json.Unmarshal(raw, &items) != nil {
			return false
		}
		for _, item := range items {
			if item != nil && !valueMatches("int", *item) {
				return false
			}
		}
		return true
	}
	var v any
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	if decoder.Decode(&v) != nil {
		return false
	}
	switch typ {
	case "bool":
		_, ok := v.(bool)
		return ok
	case "string":
		_, ok := v.(string)
		return ok
	case "char":
		s, ok := v.(string)
		return ok && utf8.RuneCountInString(s) == 1
	case "double":
		_, ok := v.(json.Number)
		return ok
	case "int", "long":
		n, ok := v.(json.Number)
		if !ok {
			return false
		}
		i, err := n.Int64()
		return err == nil && (typ == "long" || (i >= math.MinInt32 && i <= math.MaxInt32))
	}
	return false
}

func isArray(raw json.RawMessage) bool {
	trimmed := bytes.TrimSpace(raw)
	return len(trimmed) > 0 && trimmed[0] == '['
}
