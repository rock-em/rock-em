package auth

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/rock-em/rock-em/backend/internal/testutil"
)

func TestResetLifecycle(t *testing.T) {
	db := testutil.NewTestDB(t)
	h := NewHandler(db, false)
	email := fmt.Sprintf("reset-%d@example.com", time.Now().UnixNano())
	t.Cleanup(func() { _, _ = db.Exec(context.Background(), `DELETE FROM users WHERE email=$1`, email) })
	call := func(handler http.HandlerFunc, payload any, cookie *http.Cookie) *httptest.ResponseRecorder {
		data, _ := json.Marshal(payload)
		r := httptest.NewRequest("POST", "/", strings.NewReader(string(data)))
		r.Header.Set("Content-Type", "application/json")
		if cookie != nil {
			r.AddCookie(cookie)
		}
		w := httptest.NewRecorder()
		handler(w, r)
		return w
	}
	check := func(w *httptest.ResponseRecorder, status int) {
		t.Helper()
		if w.Code != status {
			t.Fatalf("want %d, got %d: %s", status, w.Code, w.Body.String())
		}
	}
	w := call(h.Register, map[string]string{"email": email, "displayName": "Reset Tester", "password": "original-password"}, nil)
	check(w, 201)
	cookie := w.Result().Cookies()[0]
	check(call(h.ForgotPassword, map[string]string{"email": email}, nil), 503)
	var token string
	sends := 0
	h.SetResetSender(func(_ context.Context, to, value string) error {
		if to != email {
			t.Errorf("wrong recipient")
		}
		token = value
		sends++
		return nil
	})
	h.issueReset(t.Context(), "unknown-"+email)
	if sends != 0 {
		t.Fatal("sent email to unknown account")
	}
	h.issueReset(t.Context(), email)
	if len(token) != 64 || sends != 1 {
		t.Fatal("missing reset token")
	}
	hash := sha256.Sum256([]byte(token))
	var stored []byte
	if err := db.QueryRow(t.Context(), `SELECT token_hash FROM password_resets WHERE user_id=(SELECT id FROM users WHERE email=$1)`, email).Scan(&stored); err != nil || string(stored) != string(hash[:]) {
		t.Fatal("token must be stored hashed", err)
	}
	h.issueReset(t.Context(), email)
	if sends != 1 {
		t.Fatal("cooldown did not limit email")
	}
	reset := map[string]string{"token": token, "newPassword": "replacement-password"}
	check(call(h.ResetPassword, map[string]string{"token": token, "newPassword": "short"}, nil), 400)
	// Concurrent attempts must not consume the same token twice.
	results := make(chan int, 2)
	for i := 0; i < 2; i++ {
		go func() { results <- call(h.ResetPassword, reset, nil).Code }()
	}
	first, second := <-results, <-results
	if !((first == 204 && second == 400) || (first == 400 && second == 204)) {
		t.Fatalf("token reuse race: %d, %d", first, second)
	}
	check(call(h.ResetPassword, reset, nil), 400)
	check(call(h.Require(false, h.Me), nil, cookie), 401)
	check(call(h.Login, map[string]string{"email": email, "password": "original-password"}, nil), 401)
	w = call(h.Login, map[string]string{"email": email, "password": "replacement-password"}, nil)
	check(w, 200)
	cookie = w.Result().Cookies()[0]
	h.issueReset(t.Context(), email)
	expired := token
	if _, err := db.Exec(t.Context(), `UPDATE password_resets SET expires_at=now()-interval '1 second',created_at=now()-interval '2 minutes' WHERE user_id=(SELECT id FROM users WHERE email=$1)`, email); err != nil {
		t.Fatal(err)
	}
	check(call(h.ResetPassword, map[string]string{"token": expired, "newPassword": "another-password"}, nil), 400)
	h.issueReset(t.Context(), email)
	check(call(h.ResetPassword, map[string]string{"token": expired, "newPassword": "another-password"}, nil), 400)
	// Changing a password while signed in also invalidates outstanding reset links.
	check(call(h.Require(false, h.Password), map[string]string{"currentPassword": "replacement-password", "newPassword": "third-secure-password"}, cookie), 204)
	check(call(h.ResetPassword, map[string]string{"token": token, "newPassword": "another-password"}, nil), 400)
	h.SetResetSender(func(context.Context, string, string) error { return errors.New("delivery failed") })
	h.issueReset(t.Context(), email)
	var count int
	if err := db.QueryRow(t.Context(), `SELECT count(*) FROM password_resets WHERE user_id=(SELECT id FROM users WHERE email=$1)`, email).Scan(&count); err != nil || count != 0 {
		t.Fatal("failed delivery should allow retry", err)
	}
}

func TestForgotPasswordResponseDoesNotWaitForDelivery(t *testing.T) {
	db := testutil.NewTestDB(t)
	h := NewHandler(db, false)
	// A full queue must have the same response as accepted work, without sending.
	h.SetResetSender(func(context.Context, string, string) error { t.Error("unexpected delivery"); return nil })
	for i := 0; i < cap(h.resetSlots); i++ {
		h.resetSlots <- struct{}{}
	}
	var body string
	for _, email := range []string{"known@example.com", "unknown@example.com"} {
		r := httptest.NewRequest("POST", "/", strings.NewReader(fmt.Sprintf(`{"email":%q}`, email)))
		r.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		h.ForgotPassword(w, r)
		if w.Code != 202 {
			t.Fatal(w.Code)
		}
		if body != "" && body != w.Body.String() {
			t.Fatal("response discloses account existence")
		}
		body = w.Body.String()
	}
}

func TestSMTPConfiguration(t *testing.T) {
	for _, tc := range []struct{ addr, from, origin string }{
		{"bad", "test@example.com", "https://rockem.xyz"},
		{"smtp.example.com:587", "bad\r\nFrom: other@example.com", "https://rockem.xyz"},
		{"smtp.example.com:587", "test@example.com", "http://rockem.xyz"},
		{"smtp.example.com:587", "test@example.com", "https://rockem.xyz/unsafe"},
	} {
		if _, err := SMTPResetSender(tc.addr, "user", "password", tc.from, tc.origin); err == nil {
			t.Fatal("accepted invalid configuration")
		}
	}
	if _, err := SMTPResetSender("smtp.example.com:587", "user", "password", "rock em <test@example.com>", "https://rockem.xyz"); err != nil {
		t.Fatal(err)
	}
}
