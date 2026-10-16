package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/generator"
	"github.com/rock-em/rock-em/backend/internal/health"
	"github.com/rock-em/rock-em/backend/internal/problems"
)

type healthResponse struct {
	Status string `json:"status"`
}

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Fatalf("failed to create database pool: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.Ping(ctx); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	log.Println("connected to PostgreSQL")

	mux := http.NewServeMux()

	healthHandler := health.NewHandler(db)
	problemHandler := problems.NewHandler(db)
	generatorHandler := generator.NewHandler(generator.NewClaudeGenerator())

	mux.HandleFunc("GET /api/health", healthHandler.Check)
	mux.HandleFunc("GET /api/problems", problemHandler.List)
	mux.HandleFunc("GET /api/problems/{slug}", problemHandler.Get)
	mux.HandleFunc("POST /api/problems/generate", generatorHandler.Generate)

	server := &http.Server{
		Addr:    "127.0.0.1:8080",
		Handler: mux,
	}

	log.Printf("Rock Em API listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
