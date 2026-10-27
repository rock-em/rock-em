package problems

import (
	"encoding/json"
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
type Example struct {
	Input       string `json:"input"`
	Output      string `json:"output"`
	Explanation string `json:"explanation,omitempty"`
}

// Tests are public practice cases. Input is an ordered JSON array of arguments;
// expected is interpreted using the explicitly authored language contract.
type TestCase struct {
	Input    []json.RawMessage `json:"input"`
	Expected json.RawMessage   `json:"expected"`
}
type Variant struct {
	Requirements []string   `json:"requirements"`
	Examples     []Example  `json:"examples"`
	Constraints  []string   `json:"constraints"`
	Tests        []TestCase `json:"tests"`
	Starter      string     `json:"starter"`
	FunctionName string     `json:"functionName"`
	IndexBase    *int       `json:"indexBase"`
}
type Input struct {
	Summary
	Description string             `json:"description"`
	Languages   map[string]Variant `json:"languages"`
}

type ProblemDetail struct {
	Summary
	Description string `json:"description"`
	Language    string `json:"language"`
	Variant
}

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var languagePattern = regexp.MustCompile(`^[a-z][a-z0-9_+-]{0,31}$`)

func (in *Input) valid(create bool) bool {
	in.Title = strings.TrimSpace(in.Title)
	in.ShortDescription = strings.TrimSpace(in.ShortDescription)
	in.Description = strings.TrimSpace(in.Description)
	in.Category = strings.TrimSpace(in.Category)
	if len(in.Slug) == 0 || len(in.Slug) > 120 || !slugPattern.MatchString(in.Slug) || in.Slug == "generate" || len(in.Title) == 0 || len(in.Title) > 200 || utf8.RuneCountInString(in.ShortDescription) == 0 || utf8.RuneCountInString(in.ShortDescription) > 200 || len(in.Description) == 0 || len(in.Description) > 50000 || len(in.Category) == 0 || len(in.Category) > 120 || (in.Difficulty != "easy" && in.Difficulty != "medium" && in.Difficulty != "hard") || len(in.Languages) > 32 {
		return false
	}
	if create && len(in.Languages) == 0 {
		return false
	}
	for language, variant := range in.Languages {
		if !languagePattern.MatchString(language) || !variant.valid() {
			return false
		}
		in.Languages[language] = variant
	}
	return true
}
func (v *Variant) valid() bool {

	// Do not impose JS identifier rules on every language (e.g. Julia's solve!).
	if len(v.Starter) > 50000 || len(v.FunctionName) > 120 || strings.ContainsAny(v.FunctionName, "\r\n\x00") || v.IndexBase == nil || *v.IndexBase < 0 || *v.IndexBase > 2147483647 || len(v.Requirements) > 50 || len(v.Constraints) > 50 || len(v.Examples) > 20 || len(v.Tests) > 100 {
		return false
	}
	if strings.TrimSpace(v.Starter) == "" || strings.TrimSpace(v.FunctionName) == "" || len(v.Tests) == 0 {
		return false
	}
	if v.Tests == nil {
		v.Tests = []TestCase{}
	}
	for _, items := range [][]string{v.Requirements, v.Constraints} {
		for _, s := range items {
			if strings.TrimSpace(s) == "" || len(s) > 2000 {
				return false
			}
		}
	}
	for _, test := range v.Tests {
		if test.Input == nil || !json.Valid(test.Expected) {
			return false
		}
	}
	if v.Requirements == nil {
		v.Requirements = []string{}
	}
	if v.Examples == nil {
		v.Examples = []Example{}
	}
	if v.Constraints == nil {
		v.Constraints = []string{}
	}
	return true
}
