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

func TestConvertInPlaceProblems(t *testing.T) {
	problems := sample(t)
	cases := []struct {
		slug, returns, output, compare, expected string
	}{
		{"merge-sorted-array", "void", "nums1", "exact", "[1,2,2,3,5,6]"},
		{"remove-element", "int", "nums", "unordered", "[2,2]"},
		{"remove-duplicates-from-sorted-array", "int", "nums", "exact", "[1,2]"},
		{"remove-duplicates-from-sorted-array-ii", "int", "nums", "exact", "[1,1,2,2,3]"},
	}
	for _, c := range cases {
		in, err := Convert(problems[c.slug])
		if err != nil {
			t.Errorf("%s: %v", c.slug, err)
			continue
		}
		if in.Signature.Returns != c.returns || in.Signature.Output != c.output || in.Compare != c.compare || string(in.Tests[0].Expected) != c.expected {
			t.Errorf("%s: returns=%s output=%s compare=%s expected=%s", c.slug, in.Signature.Returns, in.Signature.Output, in.Compare, in.Tests[0].Expected)
		}
	}
}

func TestConvertSkipsOtherCustomJudges(t *testing.T) {
	p := sample(t)["remove-element"]
	p.Description = strings.Replace(p.Description, "assert nums[i] == expectedNums[i];", "assert check(nums);", 1)
	if _, err := Convert(p); err == nil || !strings.Contains(err.Error(), "custom judge") {
		t.Fatalf("err = %v, want custom judge", err)
	}
}

func TestFirstK(t *testing.T) {
	cases := map[string]string{
		"2, nums = [2,2,_,_]":         "[2,2]",
		"5, nums = [0,1,4,0,3,_,_,_]": "[0,1,4,0,3]",
		"0, nums = [_]":               "[]",
	}
	for output, want := range cases {
		if got, err := firstK(output, "nums"); err != nil || got != want {
			t.Errorf("firstK(%q) = %q, %v; want %q", output, got, err, want)
		}
	}
	for _, output := range []string{"2, arr = [1,2]", "3, nums = [1,2]", "[1,2]"} {
		if _, err := firstK(output, "nums"); err == nil {
			t.Errorf("firstK(%q) should fail", output)
		}
	}
}

func TestSignatureFindsChangedArgument(t *testing.T) {
	sig, err := signature("class Solution:\n    def rotate(self, nums: List[int], k: int) -> None:\n")
	if err != nil || sig.Returns != "void" || sig.Output != "nums" {
		t.Fatalf("signature = %+v, %v", sig, err)
	}
	if _, err := signature("class Solution:\n    def f(self, a: List[int], b: List[int]) -> None:\n"); err == nil {
		t.Fatal("two list arguments without a docstring should be ambiguous")
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
