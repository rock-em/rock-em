package server

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/auth"
	"github.com/rock-em/rock-em/backend/internal/health"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
	"github.com/rock-em/rock-em/backend/internal/problems"
)

func New(db *pgxpool.Pool, secureCookies bool, generate http.HandlerFunc) http.Handler {
	mux := http.NewServeMux()
	a := auth.NewHandler(db, secureCookies)
	p := problems.NewHandler(db)
	mux.HandleFunc("GET /api/health", health.NewHandler(db).Check)
	mux.HandleFunc("POST /api/auth/register", auth.Limit(5, time.Minute, a.Register))
	mux.HandleFunc("POST /api/auth/login", auth.Limit(10, time.Minute, a.Login))
	mux.HandleFunc("POST /api/auth/logout", a.Logout)
	mux.HandleFunc("GET /api/auth/me", a.Require(false, a.Me))
	mux.HandleFunc("PUT /api/auth/password", a.Require(false, auth.Limit(5, time.Minute, a.Password)))
	mux.HandleFunc("GET /api/problems", p.List)
	mux.HandleFunc("GET /api/problems/{slug}", p.Get)
	mux.HandleFunc("POST /api/problems", a.Require(true, p.Create))
	mux.HandleFunc("PUT /api/problems/{slug}", a.Require(true, p.Update))
	mux.HandleFunc("DELETE /api/problems/{slug}", a.Require(true, p.Delete))
	mux.HandleFunc("GET /api/me/problems", a.Require(false, p.States))
	mux.HandleFunc("PATCH /api/me/problems/{slug}", a.Require(false, p.SaveState))
	if generate != nil {
		mux.HandleFunc("POST /api/problems/generate", a.Require(false, auth.Limit(5, time.Minute, generate)))
	}
	protection := http.NewCrossOriginProtection()
	protection.SetDenyHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { httpapi.Error(w, 403, "cross-origin request rejected") }))
	protected := protection.Handler(mux)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		protected.ServeHTTP(w, r)
	})
}
