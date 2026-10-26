package server

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/rock-em/rock-em/backend/internal/testutil"
)

func TestAccountAndProblemLifecycle(t *testing.T) {
	db := testutil.NewTestDB(t)
	handler := New(db, true, func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) })
	prefix := fmt.Sprintf("api-%d", time.Now().UnixNano())
	emails := []string{prefix + "-admin@example.com", prefix + "-user@example.com"}
	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM problems WHERE slug LIKE $1`, prefix+"%")
		_, _ = db.Exec(context.Background(), `DELETE FROM users WHERE email=ANY($1)`, emails)
	})
	call := func(method, path, body string, cookie *http.Cookie) *httptest.ResponseRecorder {
		t.Helper()
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		if cookie != nil {
			r.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	check := func(w *httptest.ResponseRecorder, status int) {
		t.Helper()
		if w.Code != status {
			t.Fatalf("want %d, got %d: %s", status, w.Code, w.Body.String())
		}
	}
	register := func(email string) *http.Cookie {
		w := call("POST", "/api/auth/register", fmt.Sprintf(`{"email":%q,"password":"correct-horse-battery","displayName":"Tester"}`, email), nil)
		check(w, 201)
		cookies := w.Result().Cookies()
		if len(cookies) != 1 {
			t.Fatal("missing session cookie")
		}
		c := cookies[0]
		if !c.Secure || !c.HttpOnly || c.SameSite != http.SameSiteLaxMode {
			t.Fatal("unsafe cookie")
		}
		if strings.Contains(w.Body.String(), "password") {
			t.Fatal("password leaked")
		}
		return c
	}
	check(call("POST", "/api/auth/register", `{"email":"bad","password":"short","displayName":"X"}`, nil), 400)
	check(call("POST", "/api/auth/register", `{"email":"x@example.com","password":"correct-horse-battery","displayName":"X","role":"admin"}`, nil), 400)
	admin := register(emails[0])
	user := register(emails[1])
	hash := sha256.Sum256([]byte(user.Value))
	var stored []byte
	if err := db.QueryRow(t.Context(), `SELECT token_hash FROM sessions WHERE token_hash=$1`, hash[:]).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	check(call("GET", "/api/auth/me", "", nil), 401)
	check(call("GET", "/api/auth/me", "", user), 200)
	check(call("POST", "/api/problems/generate", `{}`, nil), 401)
	check(call("POST", "/api/problems/generate", `{}`, user), 204)
	check(call("GET", "/api/auth/me", "", &http.Cookie{Name: "rockem_session", Value: strings.Repeat("z", 64)}), 401)

	check(call("POST", "/api/auth/login", fmt.Sprintf(`{"email":%q,"password":"incorrect-password"}`, emails[1]), nil), 401)
	slug := strings.ToLower(prefix) + "-problem"
	body := fmt.Sprintf(`{"slug":%q,"title":"Two Sum","description":"Find a pair","difficulty":"easy","topic":"arrays","examples":[{"input":"[1,2]","output":"3"}],"constraints":["n > 0"],"starter":"function solve() {}","functionName":"solve"}`, slug)
	check(call("POST", "/api/problems", body, nil), 401)
	check(call("POST", "/api/problems", body, user), 403)
	if _, err := db.Exec(t.Context(), `UPDATE users SET role='admin' WHERE email=$1`, emails[0]); err != nil {
		t.Fatal(err)
	}
	check(call("POST", "/api/problems", body, admin), 201)
	check(call("POST", "/api/problems", body, admin), 409)
	if _, err := db.Exec(t.Context(), `UPDATE users SET role='user' WHERE email=$1`, emails[0]); err != nil {
		t.Fatal(err)
	}
	check(call("POST", "/api/problems", body, admin), 403)
	if _, err := db.Exec(t.Context(), `UPDATE users SET role='admin' WHERE email=$1`, emails[0]); err != nil {
		t.Fatal(err)
	}

	check(call("GET", "/api/problems/"+slug, "", nil), 200)
	check(call("GET", "/api/problems?difficulty=easy&topic=arrays&limit=1", "", nil), 200)
	check(call("GET", "/api/problems?limit=1000", "", nil), 400)
	check(call("PUT", "/api/problems/"+slug, body, user), 403)
	check(call("PUT", "/api/problems/"+slug, strings.Replace(body, "Two Sum", "Pair Sum", 1), admin), 200)
	check(call("PATCH", "/api/me/problems/"+slug, `{"bookmarked":true}`, user), 200)
	w := call("PATCH", "/api/me/problems/"+slug, `{"status":"in_progress"}`, user)
	check(w, 200)
	var state struct{ Bookmarked bool }
	if err := json.Unmarshal(w.Body.Bytes(), &state); err != nil || !state.Bookmarked {
		t.Fatal("partial state update lost bookmark")
	}
	w = call("GET", "/api/me/problems", "", admin)
	check(w, 200)
	if strings.TrimSpace(w.Body.String()) != "[]" {
		t.Fatal("another user's state leaked")
	}
	check(call("PATCH", "/api/me/problems/"+slug, `{"status":"accepted"}`, user), 400)
	// Cross-origin cookies must never authorize mutation.
	r := httptest.NewRequest("DELETE", "/api/problems/"+slug, nil)
	r.AddCookie(admin)
	r.Header.Set("Origin", "https://evil.example")
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	check(w, 403)
	check(call("DELETE", "/api/problems/"+slug, "", user), 403)
	check(call("DELETE", "/api/problems/"+slug, "", admin), 204)
	check(call("GET", "/api/problems/"+slug, "", nil), 404)
	check(call("PATCH", "/api/me/problems/"+slug, `{"bookmarked":false}`, user), 404)
	w = call("GET", "/api/me/problems", "", user)
	check(w, 200)
	if strings.TrimSpace(w.Body.String()) != "[]" {
		t.Fatal("archived problem still visible")
	}
	// Password change revokes every session, including the current one.
	login := fmt.Sprintf(`{"email":%q,"password":"correct-horse-battery"}`, emails[1])
	w = call("POST", "/api/auth/login", login, nil)
	check(w, 200)
	second := w.Result().Cookies()[0]
	check(call("PUT", "/api/auth/password", `{"currentPassword":"correct-horse-battery","newPassword":"a-new-secure-password"}`, user), 204)
	check(call("GET", "/api/auth/me", "", user), 401)
	check(call("GET", "/api/auth/me", "", second), 401)
	check(call("POST", "/api/auth/login", login, nil), 401)
	w = call("POST", "/api/auth/login", strings.Replace(login, "correct-horse-battery", "a-new-secure-password", 1), nil)
	check(w, 200)
	current := w.Result().Cookies()[0]
	check(call("POST", "/api/auth/logout", "", current), 204)
	check(call("GET", "/api/auth/me", "", current), 401)
	if _, err := db.Exec(t.Context(), `UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=(SELECT id FROM users WHERE email=$1)`, emails[0]); err != nil {
		t.Fatal(err)
	}
	check(call("GET", "/api/auth/me", "", admin), 401)
}

func TestStrictJSONAndRateLimit(t *testing.T) {
	h := New(nil, false, nil)
	for _, body := range []string{`{`, `{} {}`, `{"role":"admin"}`, strings.Repeat("x", 300000)} {
		r := httptest.NewRequest("POST", "/api/auth/register", strings.NewReader(body))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != 400 {
			t.Fatalf("want 400, got %d", w.Code)
		}
	}
	r := httptest.NewRequest("POST", "/api/auth/register", strings.NewReader(`{}`))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 415 {
		t.Fatalf("want 415, got %d", w.Code)
	}
	w = httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 429 {
		t.Fatalf("want 429, got %d", w.Code)
	}
}
