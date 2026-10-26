package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/generator"
	"github.com/rock-em/rock-em/backend/internal/server"
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

	// Secure by default. Disable only for local HTTP development.
	secureCookies := os.Getenv("AUTH_COOKIE_SECURE") != "false"
	generatorHandler := generator.NewHandler(generator.NewClaudeGenerator())
	mux := server.New(db, secureCookies, generatorHandler.Generate)

	server := &http.Server{
		Addr:              "127.0.0.1:8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      180 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("Rock Em API listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
