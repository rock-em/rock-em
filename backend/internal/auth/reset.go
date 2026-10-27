package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
	"golang.org/x/crypto/bcrypt"
)

// ResetSender delivers links without exposing reset tokens in API responses.
type ResetSender func(context.Context, string, string) error

func (h *Handler) SetResetSender(send ResetSender) { h.sendReset = send }

func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email string `json:"email"`
	}
	if !httpapi.Decode(w, r, &in) {
		return
	}
	email, ok := normalizeEmail(in.Email)
	if !ok {
		httpapi.Error(w, 400, "provide a valid email")
		return
	}
	if h.sendReset == nil {
		httpapi.Error(w, 503, "password reset is currently unavailable; please try again later")
		return
	}
	// Bound background delivery work and keep email/account lookup timing out of
	// the public response. Saturation returns the same acknowledgment.
	select {
	case h.resetSlots <- struct{}{}:
		go func() {
			defer func() { <-h.resetSlots }()
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			h.issueReset(ctx, email)
		}()
	default:
		log.Print("password reset: delivery queue full")
	}
	httpapi.JSON(w, 202, map[string]string{"message": "If an account exists for that email, you will receive a password reset link shortly."})
}

func (h *Handler) issueReset(ctx context.Context, email string) {
	tx, err := h.db.Begin(ctx)
	if err != nil {
		log.Print("password reset: database unavailable")
		return
	}
	defer tx.Rollback(ctx)
	var id int64
	err = tx.QueryRow(ctx, `SELECT id FROM users WHERE email=$1 FOR UPDATE`, email).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return
	}
	if err != nil {
		log.Print("password reset: account lookup failed")
		return
	}
	var recent bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM password_resets WHERE user_id=$1 AND created_at>now()-interval '1 minute')`, id).Scan(&recent); err != nil {
		log.Print("password reset: lookup failed")
		return
	}
	if recent {
		return
	}
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		log.Print("password reset: token creation failed")
		return
	}
	token := hex.EncodeToString(b)
	hash := sha256.Sum256([]byte(token))
	_, err = tx.Exec(ctx, `INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes') ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,created_at=now()`, id, hash[:])
	if err != nil || tx.Commit(ctx) != nil {
		log.Print("password reset: token storage failed")
		return
	}
	deliveryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := h.sendReset(deliveryCtx, email, token); err != nil {
		log.Print("password reset: email delivery failed")
		// A failed delivery should not block an immediate retry.
		_, _ = h.db.Exec(ctx, `DELETE FROM password_resets WHERE user_id=$1 AND token_hash=$2`, id, hash[:])
	}
}

func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Token    string `json:"token"`
		Password string `json:"newPassword"`
	}
	if !httpapi.Decode(w, r, &in) {
		return
	}
	if !validPassword(in.Password) {
		httpapi.Error(w, 400, "newPassword must be 12–72 bytes")
		return
	}
	invalid := func() { httpapi.Error(w, 400, "this reset link is invalid or expired; request a new link") }
	if b, err := hex.DecodeString(in.Token); err != nil || len(b) != 32 {
		invalid()
		return
	}
	hash := sha256.Sum256([]byte(in.Token))
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		httpapi.Error(w, 500, "could not reset password")
		return
	}
	defer tx.Rollback(r.Context())
	// Lock the user first, as login and password change do, then consume the token.
	var id int64
	err = tx.QueryRow(r.Context(), `SELECT u.id FROM users u JOIN password_resets p ON p.user_id=u.id WHERE p.token_hash=$1 FOR UPDATE OF u`, hash[:]).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		invalid()
		return
	}
	if err != nil {
		httpapi.Error(w, 500, "could not reset password")
		return
	}
	tag, err := tx.Exec(r.Context(), `DELETE FROM password_resets WHERE user_id=$1 AND token_hash=$2 AND expires_at>now()`, id, hash[:])
	if err != nil {
		httpapi.Error(w, 500, "could not reset password")
		return
	}
	if tag.RowsAffected() != 1 {
		invalid()
		return
	}
	password, err := bcrypt.GenerateFromPassword([]byte(in.Password), passwordCost)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE users SET password_hash=$1 WHERE id=$2`, string(password), id)
	}
	if err == nil {
		_, err = tx.Exec(r.Context(), `DELETE FROM sessions WHERE user_id=$1`, id)
	}
	if err != nil || tx.Commit(r.Context()) != nil {
		httpapi.Error(w, 500, "could not reset password")
		return
	}
	h.cookie(w, "", -1)
	w.WriteHeader(http.StatusNoContent)
}
