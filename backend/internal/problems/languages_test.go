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

func TestLanguageMapAndSummary(t *testing.T) {
	db := testutil.NewTestDB(t)
	h := NewHandler(db)
	slug := fmt.Sprintf("language-map-%d", time.Now().UnixNano())
	data := `{"python":{"requirements":["Zero-based indices"],"examples":[],"constraints":["len(nums) >= 2"],"tests":[{"input":[[2,7],9],"expected":[0,1]}],"starter":"def pair(nums, target): pass","functionName":"pair","indexBase":0},"julia":{"requirements":["One-based indices"],"examples":[],"constraints":["length(nums) >= 2"],"tests":[{"input":[[2,7],9],"expected":[1,2]}],"starter":"function pair!(nums, target) end","functionName":"pair!","indexBase":1}}`
	_, err := db.Exec(t.Context(), `INSERT INTO problems(slug,title,short_description,description,difficulty,topic,languages) VALUES($1,'Index Pair','Find a pair','Full statement','easy','Arrays',$2)`, slug, data)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(context.Background(), `DELETE FROM problems WHERE slug=$1`, slug) })
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
	if !reflect.DeepEqual(names, []string{"julia", "python"}) {
		t.Fatalf("not exactly map keys: %s", w.Body.String())
	}
	for _, tc := range []struct {
		q, lang, expected string
		base              int
	}{{"", "python", "[0,1]", 0}, {"?language=julia", "julia", "[1,2]", 1}} {
		w := call(tc.q, false)
		if w.Code != 200 {
			t.Fatalf("%d %s", w.Code, w.Body.String())
		}
		var p ProblemDetail
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
			t.Fatal(err)
		}
		if p.Language != tc.lang || *p.IndexBase != tc.base || string(p.Tests[0].Expected) != tc.expected {
			t.Fatalf("wrong selected map value: %s", w.Body.String())
		}
	}
	list := httptest.NewRecorder()
	h.List(list, httptest.NewRequest("GET", "/api/problems?q=Index+Pair", nil))
	var summaries []map[string]any
	if err := json.Unmarshal(list.Body.Bytes(), &summaries); err != nil {
		t.Fatal(err)
	}
	if len(summaries) != 1 || len(summaries[0]) != 5 {
		t.Fatalf("not a lean summary: %s", list.Body.String())
	}
	for _, key := range []string{"slug", "title", "shortDescription", "difficulty", "category"} {
		if _, ok := summaries[0][key]; !ok {
			t.Fatal(key)
		}
	}
	for _, q := range []string{"?language=", "?language=Python", "?language=python&language=julia"} {
		if call(q, false).Code != 400 {
			t.Fatal("invalid selector accepted")
		}
	}
	if w := call("?language=ruby", false); w.Code != 404 || !strings.Contains(w.Body.String(), `"languages":["julia","python"]`) {
		t.Fatalf("missing alternatives: %s", w.Body.String())
	}
	r := httptest.NewRequest("DELETE", "/", nil)
	r.SetPathValue("slug", slug)
	r.SetPathValue("language", "python")
	w = httptest.NewRecorder()
	h.DeleteLanguage(w, r)
	if w.Code != 204 || call("", false).Code != 404 {
		t.Fatal("removed language still supported")
	}
	if got := strings.TrimSpace(call("/languages", true).Body.String()); got != `["julia"]` {
		t.Fatal(got)
	}
	_, err = db.Exec(t.Context(), `UPDATE problems SET languages='{}' WHERE slug=$1`, slug)
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
func TestSeedLanguages(t *testing.T) {
	db := testutil.NewTestDB(t)
	h := NewHandler(db)
	for _, slug := range []string{"two-sum", "valid-parentheses", "binary-search", "merge-two-sorted-lists", "maximum-subarray", "number-of-islands"} {
		for _, language := range []string{"python", "javascript"} {
			p, _, err := h.getDetail(t.Context(), slug, language)
			if err != nil {
				t.Fatal(err)
			}
			if len(p.Tests) < 3 || p.IndexBase == nil || *p.IndexBase != 0 {
				t.Fatal("missing test contract")
			}
			prefix := "function "
			if language == "python" {
				prefix = "def "
			}
			if !strings.Contains(p.Starter, prefix) {
				t.Fatal("wrong starter language")
			}
			for _, s := range p.Constraints {
				for _, r := range s {
					if r > 127 {
						t.Fatal("non-ASCII new constraint")
					}
				}
			}
		}
	}
}
func TestIncompleteLanguageRejected(t *testing.T) {
	zero := 0
	for _, v := range []Variant{{IndexBase: &zero}, {IndexBase: &zero, Starter: "def f(): pass", FunctionName: "f"}, {IndexBase: &zero, Starter: "x", FunctionName: "f", Tests: []TestCase{{Input: []json.RawMessage{}}}}} {
		if v.valid() {
			t.Fatal("incomplete language accepted")
		}
	}
}
