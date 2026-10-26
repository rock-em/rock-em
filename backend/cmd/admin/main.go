// admin grants or revokes admin access to an existing account using DB operator credentials.
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

func main() {
	email := flag.String("email", "", "existing account email")
	role := flag.String("role", "admin", "admin or user")
	flag.Parse()
	if *email == "" || (*role != "admin" && *role != "user") || flag.NArg() != 0 {
		log.Fatal("usage: admin -email account@example.com -role admin|user")
	}
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL is required")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	db, err := pgx.Connect(ctx, url)
	if err != nil {
		log.Fatal("could not connect to database")
	}
	defer db.Close(ctx)
	result, err := db.Exec(ctx, `UPDATE users SET role=$1 WHERE email=$2`, *role, strings.ToLower(strings.TrimSpace(*email)))
	if err != nil {
		log.Fatal("could not change role")
	}
	if result.RowsAffected() != 1 {
		log.Fatal("account not found; register first")
	}
	log.Printf("Account role updated to %s", *role)
}
