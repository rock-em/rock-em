package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/rock-em/rock-em/backend/internal/apigen"
	"github.com/rock-em/rock-em/backend/internal/testutil"
)

func TestOpenAPIContractAndStubs(t *testing.T) {
	spec, err := apigen.GetSwagger()
	if err != nil {
		t.Fatal(err)
	}
	if err := spec.Validate(t.Context()); err != nil {
		t.Fatal(err)
	}
	db := testutil.NewTestDB(t)
	h := New(db, false, nil)
	for _, path := range []string{"/api/problems", "/api/problems/two-sum", "/api/problems/two-sum/languages"} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest("GET", path, nil))
		if w.Code != 200 {
			t.Fatalf("%s: %d %s", path, w.Code, w.Body.String())
		}
		var value any
		if err := json.Unmarshal(w.Body.Bytes(), &value); err != nil {
			t.Fatal(err)
		}
		name := "ProblemDetail"
		if path == "/api/problems" {
			name = "ProblemSummary"
			for _, row := range value.([]any) {
				if err := spec.Components.Schemas[name].Value.VisitJSON(row); err != nil {
					t.Fatal(err)
				}
			}
		} else if strings.HasSuffix(path, "/languages") {
			if err := spec.Paths.Value("/api/problems/{slug}/languages").Get.Responses.Status(200).Value.Content.Get("application/json").Schema.Value.VisitJSON(value); err != nil {
				t.Fatal(err)
			}
		} else if err := spec.Components.Schemas[name].Value.VisitJSON(value); err != nil {
			t.Fatal(err)
		}
	}
	email := fmt.Sprintf("stub-%d@example.com", time.Now().UnixNano())
	t.Cleanup(func() { _, _ = db.Exec(context.Background(), `DELETE FROM users WHERE email=$1`, email) })
	r := httptest.NewRequest("POST", "/api/auth/register", strings.NewReader(fmt.Sprintf(`{"email":%q,"password":"correct-horse-battery","displayName":"Stub Tester"}`, email)))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 201 {
		t.Fatal(w.Body.String())
	}
	cookie := w.Result().Cookies()[0]
	for _, tc := range []struct{ method, path string }{{"GET", "/api/problems/two-sum/workspace"}, {"GET", "/api/me/drafts/two-sum"}, {"PUT", "/api/me/drafts/two-sum"}, {"POST", "/api/runs"}, {"GET", "/api/runs/job"}, {"POST", "/api/submissions"}, {"GET", "/api/submissions"}, {"GET", "/api/submissions/id"}} {
		r := httptest.NewRequest(tc.method, tc.path, nil)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 401 {
			t.Fatalf("unprotected stub %s", tc.path)
		}
		r = httptest.NewRequest(tc.method, tc.path, nil)
		r.AddCookie(cookie)
		w = httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 501 || !strings.Contains(w.Body.String(), `"code":"not_implemented"`) {
			t.Fatalf("misleading stub %s: %d %s", tc.path, w.Code, w.Body.String())
		}
	}
}
