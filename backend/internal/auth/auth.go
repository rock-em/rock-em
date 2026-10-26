package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
	"golang.org/x/crypto/bcrypt"
)

const cookieName = "rockem_session"
const sessionTTL = 7 * 24 * time.Hour
const passwordCost = 12

type User struct {
	ID          int64  `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	Role        string `json:"role"`
}
type contextKey struct{}

func Current(r *http.Request) User { u, _ := r.Context().Value(contextKey{}).(User); return u }

type Handler struct {
	db        *pgxpool.Pool
	secure    bool
	dummyHash []byte
}

func NewHandler(db *pgxpool.Pool, secure bool) *Handler {
	dummy, err := bcrypt.GenerateFromPassword([]byte("unused-dummy-password"), passwordCost)
	if err != nil {
		panic(err)
	}
	return &Handler{db: db, secure: secure, dummyHash: dummy}
}
func validPassword(s string) bool { return len(s) >= 12 && len(s) <= 72 }
func normalizeEmail(s string) (string, bool) {
	s = strings.ToLower(strings.TrimSpace(s))
	a, err := mail.ParseAddress(s)
	return s, err == nil && a.Address == s && len(s) <= 254
}
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"displayName"`
	}
	if !httpapi.Decode(w, r, &in) {
		return
	}
	email, ok := normalizeEmail(in.Email)
	name := strings.TrimSpace(in.DisplayName)
	if !ok || !validPassword(in.Password) || len(name) < 1 || len(name) > 80 {
		httpapi.Error(w, 400, "provide a valid email, displayName (1–80 bytes), and password (12–72 bytes)")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), passwordCost)
	if err != nil {
		httpapi.Error(w, 500, "could not create account")
		return
	}
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		httpapi.Error(w, 500, "could not create account")
		return
	}
	defer tx.Rollback(r.Context())
	var u User
	err = tx.QueryRow(r.Context(), `INSERT INTO users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id,email,display_name,role`, email, name, string(hash)).Scan(&u.ID, &u.Email, &u.DisplayName, &u.Role)
	var pe *pgconn.PgError
	if errors.As(err, &pe) && pe.Code == "23505" {
		httpapi.Error(w, 409, "account could not be created with that email")
		return
	}
	if err != nil {
		httpapi.Error(w, 500, "could not create account")
		return
	}
	token, err := newSession(r.Context(), tx, u.ID)
	if err != nil || tx.Commit(r.Context()) != nil {
		httpapi.Error(w, 500, "could not create account")
		return
	}
	h.cookie(w, token, int(sessionTTL.Seconds()))
	httpapi.JSON(w, 201, u)
}
func newSession(ctx context.Context, tx pgx.Tx, id int64) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := hex.EncodeToString(b)
	hash := sha256.Sum256([]byte(token))
	// Bound retained sessions and remove expired tokens for this account.
	_, err := tx.Exec(ctx, `DELETE FROM sessions WHERE user_id=$1 AND (expires_at<=now() OR token_hash IN (SELECT token_hash FROM sessions WHERE user_id=$1 ORDER BY created_at DESC OFFSET 9))`, id)
	if err != nil {
		return "", err
	}
	_, err = tx.Exec(ctx, `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)`, hash[:], id, time.Now().Add(sessionTTL))
	return token, err
}
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !httpapi.Decode(w, r, &in) {
		return
	}
	email, _ := normalizeEmail(in.Email)
	// Lock the user row through session issuance, serializing against password changes.
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		httpapi.Error(w, 500, "could not sign in")
		return
	}
	defer tx.Rollback(r.Context())
	var u User
	var hash string
	err = tx.QueryRow(r.Context(), `SELECT id,email,display_name,role,password_hash FROM users WHERE email=$1 FOR UPDATE`, email).Scan(&u.ID, &u.Email, &u.DisplayName, &u.Role, &hash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		httpapi.Error(w, 500, "could not sign in")
		return
	}
	compare := []byte(hash)
	if errors.Is(err, pgx.ErrNoRows) {
		compare = h.dummyHash
	}
	match := bcrypt.CompareHashAndPassword(compare, []byte(in.Password)) == nil
	if err != nil || !match || !validPassword(in.Password) {
		httpapi.Error(w, 401, "invalid email or password")
		return
	}
	token, err := newSession(r.Context(), tx, u.ID)
	if err != nil || tx.Commit(r.Context()) != nil {
		httpapi.Error(w, 500, "could not sign in")
		return
	}
	h.cookie(w, token, int(sessionTTL.Seconds()))
	httpapi.JSON(w, 200, u)
}
func (h *Handler) cookie(w http.ResponseWriter, token string, age int) {
	http.SetCookie(w, &http.Cookie{Name: cookieName, Value: token, Path: "/", HttpOnly: true, Secure: h.secure, SameSite: http.SameSiteLaxMode, MaxAge: age})
}
func sessionHash(r *http.Request) []byte {
	c, err := r.Cookie(cookieName)
	if err != nil || len(c.Value) != 64 {
		return nil
	}
	b, err := hex.DecodeString(c.Value)
	if err != nil || len(b) != 32 {
		return nil
	}
	h := sha256.Sum256([]byte(c.Value))
	return h[:]
}
func (h *Handler) Require(admin bool, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		hash := sessionHash(r)
		if hash == nil {
			httpapi.Error(w, 401, "sign in required")
			return
		}
		var u User
		err := h.db.QueryRow(r.Context(), `SELECT u.id,u.email,u.display_name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()`, hash).Scan(&u.ID, &u.Email, &u.DisplayName, &u.Role)
		if errors.Is(err, pgx.ErrNoRows) {
			httpapi.Error(w, 401, "session expired or invalid")
			return
		}
		if err != nil {
			httpapi.Error(w, 500, "could not verify session")
			return
		}
		if admin && u.Role != "admin" {
			httpapi.Error(w, 403, "admin access required")
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), contextKey{}, u)))
	}
}
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) { httpapi.JSON(w, 200, Current(r)) }
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if _, err := h.db.Exec(r.Context(), `DELETE FROM sessions WHERE token_hash=$1`, sessionHash(r)); err != nil {
		httpapi.Error(w, 500, "could not sign out")
		return
	}
	h.cookie(w, "", -1)
	w.WriteHeader(204)
}
func (h *Handler) Password(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Current string `json:"currentPassword"`
		New     string `json:"newPassword"`
	}
	if !httpapi.Decode(w, r, &in) {
		return
	}
	if !validPassword(in.New) {
		httpapi.Error(w, 400, "newPassword must be 12–72 bytes")
		return
	}
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		httpapi.Error(w, 500, "could not change password")
		return
	}
	defer tx.Rollback(r.Context())
	var hash string
	err = tx.QueryRow(r.Context(), `SELECT password_hash FROM users WHERE id=$1 FOR UPDATE`, Current(r).ID).Scan(&hash)
	if err != nil {
		httpapi.Error(w, 500, "could not change password")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Current)) != nil {
		httpapi.Error(w, 401, "incorrect current password")
		return
	}
	b, err := bcrypt.GenerateFromPassword([]byte(in.New), passwordCost)
	if err != nil {
		httpapi.Error(w, 500, "could not change password")
		return
	}
	_, err = tx.Exec(r.Context(), `UPDATE users SET password_hash=$1 WHERE id=$2`, string(b), Current(r).ID)
	if err == nil {
		_, err = tx.Exec(r.Context(), `DELETE FROM sessions WHERE user_id=$1`, Current(r).ID)
	}
	if err != nil || tx.Commit(r.Context()) != nil {
		httpapi.Error(w, 500, "could not change password")
		return
	}
	h.cookie(w, "", -1)
	w.WriteHeader(204)
}
