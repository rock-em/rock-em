package server

import (
	"github.com/rock-em/rock-em/backend/internal/testutil"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestPasswordResetRoutes(t *testing.T) {
	h := New(testutil.NewTestDB(t), false, nil)
	for _, tc := range []struct {
		path, body string
		status     int
	}{
		{"forgot-password", `{"email":"valid@example.com"}`, 503},
		{"forgot-password", `{"email":"invalid"}`, 400},
		{"reset-password", `{"token":"invalid","newPassword":"a-secure-password"}`, 400},
	} {
		r := httptest.NewRequest("POST", "/api/auth/"+tc.path, strings.NewReader(tc.body))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != tc.status {
			t.Fatalf("%s: got %d: %s", tc.path, w.Code, w.Body.String())
		}
	}
	r := httptest.NewRequest("POST", "/api/auth/reset-password", strings.NewReader(`{}`))
	r.Header.Set("Origin", "https://untrusted.example")
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal("cross-origin reset not rejected", w.Code)
	}
}
