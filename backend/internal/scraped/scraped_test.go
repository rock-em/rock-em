package scraped

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func sample(t *testing.T) map[string]Problem {
	t.Helper()
	data, err := os.ReadFile("../../../scripts/scraper/sample.json")
	if err != nil {
		t.Fatal(err)
	}
	var file File
	if err := json.Unmarshal(data, &file); err != nil {
		t.Fatal(err)
	}
	bySlug := map[string]Problem{}
	for _, p := range file.Problems {
		bySlug[p.Slug] = p
	}
	return bySlug
}

func TestConvertTwoSum(t *testing.T) {
	in, err := Convert(sample(t)["two-sum"])
	if err != nil {
		t.Fatal(err)
	}
	if in.Title != "Two Sum" || in.Difficulty != "easy" || in.Category != "Array" || in.Compare != "unordered" {
		t.Fatalf("unexpected fields: %+v", in.Summary)
	}
	sig, _ := json.Marshal(in.Signature)
	if string(sig) != `{"function":"twoSum","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int[]"}` {
		t.Fatalf("signature = %s", sig)
	}
	if len(in.Tests) != 3 || string(in.Tests[0].Args[0]) != "[2,7,11,15]" || string(in.Tests[0].Expected) != "[0,1]" {
		t.Fatalf("tests = %+v", in.Tests)
	}
	if !strings.HasPrefix(in.Tests[0].Explanation, "Because nums[0] + nums[1] == 9") {
		t.Fatalf("explanation = %q", in.Tests[0].Explanation)
	}
	if strings.Contains(in.Description, "Example 1") || strings.Contains(in.Description, "Constraints:") || !strings.Contains(in.Description, "Follow-up:") {
		t.Fatalf("description = %q", in.Description)
	}
	if len(in.Constraints) != 4 || in.Constraints[0] != "2 <= nums.length <= 10^4" {
		t.Fatalf("constraints = %q", in.Constraints)
	}
}

func TestConvertSkipsUncheckableProblems(t *testing.T) {
	problems := sample(t)
	cases := map[string]string{
		"merge-sorted-array":                  "in place",
		"remove-element":                      "custom judge",
		"remove-duplicates-from-sorted-array": "custom judge",
	}
	for slug, reason := range cases {
		_, err := Convert(problems[slug])
		if err == nil || !strings.Contains(err.Error(), reason) {
			t.Errorf("%s: err = %v, want %q", slug, err, reason)
		}
	}
}

func TestPyType(t *testing.T) {
	cases := map[string]string{
		"int":                      "int",
		"float":                    "double",
		"str":                      "string",
		"List[List[str]]":          "string[][]",
		"list[int]":                "int[]",
		"Optional[TreeNode]":       "TreeNode",
		"Optional[ListNode]":       "ListNode",
		"Optional[int]":            "",
		"dict[str, int]":           "",
		"List[Optional[TreeNode]]": "TreeNode[]",
	}
	for in, want := range cases {
		got, ok := pyType(in)
		if want == "" && ok {
			t.Errorf("pyType(%q) = %q, want unsupported", in, got)
		} else if want != "" && got != want {
			t.Errorf("pyType(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestSignatureSplitsNestedTypes(t *testing.T) {
	sig, err := signature("class Solution:\n    def f(self, a: List[List[int]], b: str) -> bool:\n")
	if err != nil {
		t.Fatal(err)
	}
	if len(sig.Params) != 2 || sig.Params[0].Type != "int[][]" || sig.Params[1].Name != "b" || sig.Returns != "bool" {
		t.Fatalf("signature = %+v", sig)
	}
}
