package server

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/apigen"
	"github.com/rock-em/rock-em/backend/internal/auth"
	"github.com/rock-em/rock-em/backend/internal/health"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
	"github.com/rock-em/rock-em/backend/internal/problems"
)

func New(db *pgxpool.Pool, secureCookies bool, generate http.HandlerFunc, resetSender ...auth.ResetSender) http.Handler {
	a := auth.NewHandler(db, secureCookies)
	if len(resetSender) > 0 {
		a.SetResetSender(resetSender[0])
	}
	p := problems.NewHandler(db)
	api := newAPI(a, p, health.NewHandler(db), generate)
	mux := apigen.HandlerWithOptions(api, apigen.StdHTTPServerOptions{
		ErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			httpapi.Error(w, 400, "invalid request parameters")
		},
	})

	protection := http.NewCrossOriginProtection()
	protection.SetDenyHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { httpapi.Error(w, 403, "cross-origin request rejected") }))
	protected := protection.Handler(mux)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")
		protected.ServeHTTP(w, r)
	})
}
