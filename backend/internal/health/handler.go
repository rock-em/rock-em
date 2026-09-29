package health

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
)

// test
type Database interface {
	Ping(context.Context) error
}

type Handler struct {
	db Database
}

type response struct {
	Status string `json:"status"`
}

func NewHandler(db Database) *Handler {
	return &Handler{db: db}
}

func (h *Handler) Check(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if err := h.db.Ping(r.Context()); err != nil {
		http.Error(
			w,
			`{"status":"unhealthy"}`,
			http.StatusServiceUnavailable,
		)
		return
	}

	if err := json.NewEncoder(w).Encode(response{
		Status: "ok",
	}); err != nil {
		log.Printf("failed to encode health response: %v", err)
	}
}
