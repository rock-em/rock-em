package auth

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/rock-em/rock-em/backend/internal/httpapi"
)

type bucket struct {
	count int
	reset time.Time
}

// Limit bounds expensive credential operations. RemoteAddr is intentional: never
// trust arbitrary forwarded headers. Configure an additional edge limit at Nginx.
func Limit(max int, window time.Duration, next http.HandlerFunc) http.HandlerFunc {
	var mu sync.Mutex
	entries := map[string]bucket{}
	return func(w http.ResponseWriter, r *http.Request) {
		key, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			key = r.RemoteAddr
		}
		// Authenticated expensive operations are limited per account, including
		// when many users share a reverse proxy or network address.
		if u := Current(r); u.ID != 0 {
			key = "user:" + strconv.FormatInt(u.ID, 10)
		}
		now := time.Now()
		mu.Lock()
		for k, b := range entries {
			if !now.Before(b.reset) {
				delete(entries, k)
			}
		}
		b := entries[key]
		if b.reset.IsZero() {
			b.reset = now.Add(window)
		}
		blocked := b.count >= max || (b.count == 0 && len(entries) >= 10000)
		if !blocked {
			b.count++
			entries[key] = b
		}
		mu.Unlock()
		if blocked {
			w.Header().Set("Retry-After", "60")
			httpapi.Error(w, 429, "too many requests; try again later")
			return
		}
		next(w, r)
	}
}
