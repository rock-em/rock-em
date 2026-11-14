// Package scraped converts the JSON written by scripts/scraper into problems.
package scraped

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/rock-em/rock-em/backend/internal/problems"
)

type File struct {
	Problems []Problem `json:"problems"`
}

// Problem holds the scraper fields the import uses. The rest are ignored.
type Problem struct {
	Slug             string            `json:"slug"`
	Title            string            `json:"title"`
	Difficulty       string            `json:"difficulty"`
	PaidOnly         bool              `json:"paid_only"`
	Topics           []string          `json:"topics"`
	Description      string            `json:"description"`
	ExampleTestcases []string          `json:"example_testcases"`
	CodeSnippets     map[string]string `json:"code_snippets"`
}

var (
	defPattern     = regexp.MustCompile(`def (\w+)\(self(?:, ([^)]*))?\) -> (.+):`)
	examplePattern = regexp.MustCompile(`(?m)^Example \d+:\s*$`)
	sectionPattern = regexp.MustCompile(`(?m)^(Constraints|Follow[- ]up):`)
	inPlacePattern = regexp.MustCompile(`modify (\w+) in-place`)
	judgePattern   = regexp.MustCompile(`assert (\w+)\[i\] == expected\w*\[i\]`)
	sortedPattern  = regexp.MustCompile(`sort\(\w+, 0, k\)`)
	prefixPattern  = regexp.MustCompile(`^(\d+), (\w+) = \[(.*)\]$`)
)

// Convert builds an API problem from a scraped one. In-place problems and the
// usual "return k, then check the first k items" custom judge are supported.
// Anything else that can't be checked with input/output tests (other custom
// judges, design classes) returns an error explaining why.
func Convert(p Problem) (problems.Input, error) {
	var in problems.Input
	if strings.TrimSpace(p.Description) == "" {
		if p.PaidOnly {
			return in, errors.New("premium problem with no description")
		}
		return in, errors.New("no description")
	}
	if len(p.Topics) == 0 {
		return in, errors.New("no topics")
	}
	sig, err := signature(p.CodeSnippets["python3"])
	if err != nil {
		return in, err
	}
	prefix, sorted := "", false
	if strings.Contains(p.Description, "Custom Judge:") {
		m := judgePattern.FindStringSubmatch(p.Description)
		if m == nil || sig.Returns != "int" {
			return in, errors.New("uses a custom judge")
		}
		prefix, sorted = m[1], sortedPattern.MatchString(p.Description)
		sig.Output = prefix
	}
	statement, examples, constraints, followUp := split(p.Description)
	if len(examples) != len(p.ExampleTestcases) {
		return in, fmt.Errorf("%d examples in the description but %d test cases", len(examples), len(p.ExampleTestcases))
	}
	for i, example := range examples {
		test, err := exampleTest(p.ExampleTestcases[i], example, prefix)
		if err != nil {
			return in, fmt.Errorf("example %d: %w", i+1, err)
		}
		in.Tests = append(in.Tests, problems.TestInput{Kind: "example", Test: test})
	}

	in.Slug = p.Slug
	in.Title = p.Title
	in.Difficulty = strings.ToLower(p.Difficulty)
	in.ShortDescription = shorten(strings.SplitN(statement, "\n\n", 2)[0], 200)
	in.Description = statement
	if followUp != "" {
		in.Description += "\n\n" + followUp
	}
	in.Category = p.Topics[0]
	in.Topics = p.Topics[1:min(len(p.Topics), 10)]
	in.Constraints = constraints
	in.Signature = &sig
	in.Compare = "exact"
	if sorted || (strings.HasSuffix(sig.Returns, "[]") && strings.Contains(strings.ToLower(statement), "in any order")) {
		in.Compare = "unordered"
	}
	if err := in.Check(); err != nil {
		return in, err
	}
	return in, nil
}

// signature reads the function name and types from the python3 starter code,
// since it's the only snippet with type hints we can map directly.
func signature(code string) (problems.Signature, error) {
	var sig problems.Signature
	if strings.Contains(code, "class Solution") && strings.Count(code, "def ") > 1 {
		return sig, errors.New("more than one method")
	}
	m := defPattern.FindStringSubmatch(code)
	if m == nil {
		return sig, errors.New("no python3 solution method")
	}
	returns, ok := "void", true
	if m[3] != "None" {
		returns, ok = pyType(m[3])
	}
	if !ok {
		return sig, fmt.Errorf("unsupported return type %s", m[3])
	}
	sig.Function, sig.Returns, sig.Params = m[1], returns, []problems.Param{}
	for _, param := range splitTop(m[2]) {
		name, typ, _ := strings.Cut(param, ":")
		t, ok := pyType(strings.TrimSpace(typ))
		if !ok {
			return sig, fmt.Errorf("unsupported parameter type %s", strings.TrimSpace(typ))
		}
		sig.Params = append(sig.Params, problems.Param{Name: strings.TrimSpace(name), Type: t})
	}
	if returns == "void" {
		if sig.Output = inPlaceParam(code, sig.Params); sig.Output == "" {
			return sig, errors.New("returns nothing and it's unclear which argument changes")
		}
	}
	return sig, nil
}

// inPlaceParam finds the argument a void method changes, from the starter's
// docstring or, failing that, the only list argument.
func inPlaceParam(code string, params []problems.Param) string {
	if m := inPlacePattern.FindStringSubmatch(code); m != nil {
		return m[1]
	}
	found := ""
	for _, p := range params {
		if strings.HasSuffix(p.Type, "[]") {
			if found != "" {
				return ""
			}
			found = p.Name
		}
	}
	return found
}

func pyType(t string) (string, bool) {
	if inner, ok := unwrap(t, "Optional"); ok {
		// only nodes can be null in the test format
		if inner == "ListNode" || inner == "TreeNode" {
			return inner, true
		}
		return "", false
	}
	if inner, ok := unwrap(t, "List"); ok {
		t, ok := pyType(inner)
		return t + "[]", ok
	}
	if inner, ok := unwrap(t, "list"); ok {
		t, ok := pyType(inner)
		return t + "[]", ok
	}
	switch t {
	case "int", "bool", "ListNode", "TreeNode":
		return t, true
	case "float":
		return "double", true
	case "str":
		return "string", true
	}
	return "", false
}

func unwrap(t, name string) (string, bool) {
	if strings.HasPrefix(t, name+"[") && strings.HasSuffix(t, "]") {
		return t[len(name)+1 : len(t)-1], true
	}
	return "", false
}

// splitTop splits on commas that aren't inside brackets.
func splitTop(s string) []string {
	var parts []string
	depth, start := 0, 0
	for i, r := range s {
		switch r {
		case '[':
			depth++
		case ']':
			depth--
		case ',':
			if depth == 0 {
				parts = append(parts, s[start:i])
				start = i + 1
			}
		}
	}
	if strings.TrimSpace(s[start:]) != "" {
		parts = append(parts, s[start:])
	}
	return parts
}

// split breaks the scraper's plain text description into the statement, the
// example blocks, the constraint list and an optional follow-up note.
func split(text string) (statement string, examples []string, constraints []string, followUp string) {
	text = strings.TrimSpace(text)
	rest := ""
	if loc := examplePattern.FindStringIndex(text); loc != nil {
		statement, rest = text[:loc[0]], text[loc[0]:]
	} else if loc := sectionPattern.FindStringIndex(text); loc != nil {
		statement, rest = text[:loc[0]], text[loc[0]:]
	} else {
		statement = text
	}
	statement = strings.TrimSpace(statement)

	tail := ""
	if loc := sectionPattern.FindStringIndex(rest); loc != nil {
		rest, tail = rest[:loc[0]], rest[loc[0]:]
	}
	for _, block := range examplePattern.Split(rest, -1) {
		if block = strings.TrimSpace(block); block != "" {
			examples = append(examples, block)
		}
	}

	for _, section := range splitSections(tail) {
		if body, ok := strings.CutPrefix(section, "Constraints:"); ok {
			for _, line := range strings.Split(body, "\n") {
				if line, ok := strings.CutPrefix(strings.TrimSpace(line), "- "); ok && strings.TrimSpace(line) != "" {
					constraints = append(constraints, strings.TrimSpace(line))
				}
			}
		} else {
			followUp = strings.TrimSpace(section)
		}
	}
	if constraints == nil {
		constraints = []string{}
	}
	return
}

func splitSections(text string) []string {
	locs := sectionPattern.FindAllStringIndex(text, -1)
	var sections []string
	for i, loc := range locs {
		end := len(text)
		if i+1 < len(locs) {
			end = locs[i+1][0]
		}
		sections = append(sections, strings.TrimSpace(text[loc[0]:end]))
	}
	return sections
}

// exampleTest pairs one test case (a JSON value per line, in parameter order)
// with the Output line from the matching example in the description. For
// custom judge problems the output looks like "2, nums = [2,2,_,_]" and only
// the first k items are kept.
func exampleTest(testcase, example, prefix string) (problems.Test, error) {
	var test problems.Test
	for _, line := range strings.Split(strings.TrimSpace(testcase), "\n") {
		if !json.Valid([]byte(line)) {
			return test, fmt.Errorf("input %q is not JSON", line)
		}
		test.Args = append(test.Args, json.RawMessage(line))
	}
	_, after, ok := strings.Cut(example, "Output: ")
	if !ok {
		return test, errors.New("no output")
	}
	output := strings.TrimSpace(strings.SplitN(after, "\n", 2)[0])
	if prefix != "" {
		var err error
		if output, err = firstK(output, prefix); err != nil {
			return test, err
		}
	}
	if !json.Valid([]byte(output)) {
		return test, fmt.Errorf("output %q is not JSON", output)
	}
	test.Expected = json.RawMessage(output)
	if _, after, ok := strings.Cut(example, "Explanation: "); ok {
		test.Explanation = shorten(strings.TrimSpace(strings.SplitN(after, "\n\n", 2)[0]), 2000)
	}
	return test, nil
}

func firstK(output, name string) (string, error) {
	m := prefixPattern.FindStringSubmatch(output)
	if m == nil || m[2] != name {
		return "", fmt.Errorf("output %q is not in the form k, %s = [...]", output, name)
	}
	var k int
	fmt.Sscan(m[1], &k)
	items := strings.Split(m[3], ",")
	for i, item := range items {
		if strings.TrimSpace(item) == "_" {
			items[i] = "null"
		}
	}
	var values []json.RawMessage
	if err := json.Unmarshal([]byte("["+strings.Join(items, ",")+"]"), &values); err != nil || k > len(values) {
		return "", fmt.Errorf("output %q is not in the form k, %s = [...]", output, name)
	}
	b, err := json.Marshal(values[:k])
	return string(b), err
}

func shorten(s string, limit int) string {
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) <= limit {
		return s
	}
	cut := string([]rune(s)[:limit-3])
	if i := strings.LastIndex(cut, " "); i > 0 {
		cut = cut[:i]
	}
	return cut + "..."
}
