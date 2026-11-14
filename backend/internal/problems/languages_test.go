package problems

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/rock-em/rock-em/backend/internal/testutil"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestContractAndSummary(t *testing.T) {
	db := testutil.NewTestDB(t)
	h := NewHandler(db)
	slug := fmt.Sprintf("contract-%d", time.Now().UnixNano())
	var id int64
	err := db.QueryRow(t.Context(), `INSERT INTO problems(slug,title,short_description,description,difficulty,signature) VALUES($1,'Index Pair','Find a pair','Full statement','easy','{"function":"indexPair","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int[]"}') RETURNING id`, slug).Scan(&id)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(context.Background(), `DELETE FROM problems WHERE slug=$1`, slug) })
	_, err = db.Exec(t.Context(), `INSERT INTO problem_tests(problem_id,ordinal,kind,args,expected,explanation) VALUES($1,0,'public','[[1,2],3]','[0,1]',NULL),($1,1,'example','[[2,7],9]','[0,1]','2 + 7 = 9'),($1,2,'hidden','[[4,4],8]','[0,1]',NULL)`, id)
	if err != nil {
		t.Fatal(err)
	}
	call := func(query string, languages bool) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/api/problems/"+slug+query, nil)
		r.SetPathValue("slug", slug)
		w := httptest.NewRecorder()
		if languages {
			h.Languages(w, r)
		} else {
			h.Get(w, r)
		}
		return w
	}
	w := call("/languages", true)
	var names []string
	if err := json.Unmarshal(w.Body.Bytes(), &names); err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(names, []string{"javascript", "python"}) {
		t.Fatalf("not every enabled language: %s", w.Body.String())
	}
	for _, tc := range []struct{ q, lang, name, indent string }{{"", "python", "index_pair", "    "}, {"?language=javascript", "javascript", "indexPair", "  "}} {
		w := call(tc.q, false)
		if w.Code != 200 {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		var p ProblemDetail
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
			t.Fatal(err)
		}
		if p.Language != tc.lang || p.FunctionName != tc.name || p.IndentUnit != tc.indent || !strings.Contains(p.Starter, tc.name+"(") {
			t.Fatalf("wrong language rendering: %s", w.Body.String())
		}
		if len(p.Examples) != 1 || p.Examples[0].Explanation != "2 + 7 = 9" || len(p.Tests) != 2 || string(p.Tests[0].Args[1]) != "9" {
			t.Fatalf("examples must lead and hidden tests stay private: %s", w.Body.String())
		}
	}
	list := httptest.NewRecorder()
	h.List(list, httptest.NewRequest("GET", "/api/problems?q=Index+Pair&category=arrays", nil))
	var summaries []map[string]any
	if err := json.Unmarshal(list.Body.Bytes(), &summaries); err != nil {
		t.Fatal(err)
	}
	// The raw insert above has no topic links, so topic filters must not match it.
	if len(summaries) != 0 {
		t.Fatalf("unlinked topic matched: %s", list.Body.String())
	}
	list = httptest.NewRecorder()
	h.List(list, httptest.NewRequest("GET", "/api/problems?q=Index+Pair", nil))
	if err := json.Unmarshal(list.Body.Bytes(), &summaries); err != nil {
		t.Fatal(err)
	}
	if len(summaries) != 1 || len(summaries[0]) != 5 {
		t.Fatalf("not a lean summary: %s", list.Body.String())
	}
	for _, q := range []string{"?language=", "?language=Python", "?language=python&language=javascript"} {
		if call(q, false).Code != 400 {
			t.Fatal("invalid selector accepted")
		}
	}
	if w := call("?language=ruby", false); w.Code != 404 || !strings.Contains(w.Body.String(), `"languages":["javascript","python"]`) {
		t.Fatalf("missing alternatives: %s", w.Body.String())
	}
	_, err = db.Exec(t.Context(), `UPDATE problems SET signature=NULL WHERE slug=$1`, slug)
	if err != nil {
		t.Fatal(err)
	}
	if got := strings.TrimSpace(call("/languages", true).Body.String()); got != "[]" {
		t.Fatal(got)
	}
	_, err = db.Exec(t.Context(), `UPDATE problems SET deleted_at=now() WHERE slug=$1`, slug)
	if err != nil {
		t.Fatal(err)
	}
	if call("/languages", true).Code != 404 {
		t.Fatal("archived problem exposed")
	}
}
func TestSeedContracts(t *testing.T) {
	db := testutil.NewTestDB(t)
	h := NewHandler(db)
	for _, slug := range []string{"two-sum", "valid-parentheses", "binary-search", "merge-two-sorted-lists", "maximum-subarray", "number-of-islands"} {
		for _, language := range []string{"python", "javascript"} {
			p, _, err := h.getDetail(t.Context(), slug, language)
			if err != nil {
				t.Fatal(slug, err)
			}
			if len(p.Tests) < 3 || len(p.Examples) != 2 || len(p.Topics) != 1 || len(p.Constraints) == 0 {
				t.Fatal(slug, "incomplete backfill")
			}
			for _, test := range p.Tests {
				if !p.Signature.accepts(test) {
					t.Fatal(slug, "seeded test does not match its signature")
				}
			}
			prefix := "function "
			if language == "python" {
				prefix = "def "
			}
			if !strings.Contains(p.Starter, prefix+p.FunctionName+"(") {
				t.Fatal(slug, "wrong starter language")
			}
		}
	}
}
func TestStarters(t *testing.T) {
	s := Signature{Function: "mergeTwoLists", Params: []Param{{"list1", "ListNode"}, {"grid", "char[][]"}}, Returns: "ListNode[]"}
	py := languages["python"].starter(s, "    ")
	if !strings.Contains(py, "def merge_two_lists(list1: ListNode | None, grid: list[list[str]]) -> list[ListNode | None]:\n    # Write") || !strings.HasPrefix(py, "# ListNode") {
		t.Fatal(py)
	}
	js := languages["javascript"].starter(s, "  ")
	if !strings.Contains(js, " * @param {string[][]} grid\n * @return {(ListNode | null)[]}\n */\nfunction mergeTwoLists(list1, grid) {\n  // Write") {
		t.Fatal(js)
	}
}
func TestSignatureRejectsMismatchedTests(t *testing.T) {
	s := Signature{Function: "f", Params: []Param{{"n", "int"}, {"c", "char"}, {"tree", "TreeNode"}}, Returns: "double"}
	if !s.valid() || !s.accepts(Test{Args: raw(`3`, `"x"`, `[1,null,2]`), Expected: json.RawMessage(`1.5`)}) {
		t.Fatal("valid test rejected")
	}
	for _, args := range [][]json.RawMessage{raw(`3`, `"x"`), raw(`3.5`, `"x"`, `[]`), raw(`3`, `"xy"`, `[]`), raw(`3`, `"x"`, `[1,"2"]`), raw(`2147483648`, `"x"`, `[]`)} {
		if s.accepts(Test{Args: args, Expected: json.RawMessage(`1`)}) {
			t.Fatalf("accepted %s", args)
		}
	}
	for _, bad := range []Signature{{Function: "f", Returns: "Map"}, {Function: "1f", Returns: "int"}, {Function: "f", Params: []Param{{"a", "int"}, {"a", "int"}}, Returns: "int"}} {
		if bad.valid() {
			t.Fatalf("accepted %+v", bad)
		}
	}
}
func TestSignatureOutput(t *testing.T) {
	nums := Param{"nums", "int[]"}
	merge := Signature{Function: "merge", Params: []Param{nums, {"m", "int"}}, Returns: "void", Output: "nums"}
	if !merge.valid() || !merge.accepts(Test{Args: raw(`[1,0]`, `1`), Expected: json.RawMessage(`[1,2]`)}) {
		t.Fatal("void signature rejected")
	}
	if merge.accepts(Test{Args: raw(`[1,0]`, `1`), Expected: json.RawMessage(`3`)}) {
		t.Fatal("void signature should check the changed argument's type")
	}
	remove := Signature{Function: "removeElement", Params: []Param{nums, {"val", "int"}}, Returns: "int", Output: "nums"}
	if !remove.valid() || !remove.accepts(Test{Args: raw(`[3,2,2,3]`, `3`), Expected: json.RawMessage(`[2,2]`)}) {
		t.Fatal("first k signature rejected")
	}
	for _, bad := range []Signature{
		{Function: "f", Params: []Param{nums}, Returns: "void"},
		{Function: "f", Params: []Param{nums}, Returns: "void", Output: "missing"},
		{Function: "f", Params: []Param{nums}, Returns: "bool", Output: "nums"},
		{Function: "f", Params: []Param{{"n", "int"}}, Returns: "int", Output: "n"},
		{Function: "f", Params: []Param{{"v", "void"}}, Returns: "int"},
	} {
		if bad.valid() {
			t.Fatalf("accepted %+v", bad)
		}
	}
	py := languages["python"].starter(merge, "    ")
	if !strings.Contains(py, "# Modify nums in place; nothing is returned.\n\ndef merge(nums: list[int], m: int) -> None:") {
		t.Fatal(py)
	}
	js := languages["javascript"].starter(remove, "  ")
	if !strings.HasPrefix(js, "// Return k and put the answer in the first k items of nums.\n") || !strings.Contains(js, "@return {number}") {
		t.Fatal(js)
	}
}
func raw(values ...string) []json.RawMessage {
	result := make([]json.RawMessage, len(values))
	for i, v := range values {
		result[i] = json.RawMessage(v)
	}
	return result
}
