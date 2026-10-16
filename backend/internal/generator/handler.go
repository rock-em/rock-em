package generator

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"
)

const generateTimeout = 3 * time.Minute

type Handler struct {
	generator Generator
}

func NewHandler(generator Generator) *Handler {
	return &Handler{generator: generator}
}

func (h *Handler) Generate(w http.ResponseWriter, r *http.Request) {
	var req Request

	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := req.Normalize(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), generateTimeout)
	defer cancel()

	problem, err := h.generator.Generate(ctx, req)
	if err != nil {
		log.Printf("failed to generate problem for topic %q: %v", req.Topic, err)
		writeError(w, http.StatusBadGateway, "failed to generate problem, please try again")
		return
	}

	w.Header().Set("Content-Type", "application/json")

	if err := json.NewEncoder(w).Encode(problem); err != nil {
		log.Printf("failed to encode generated problem: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(map[string]string{"error": message}); err != nil {
		log.Printf("failed to encode error response: %v", err)
	}
}
