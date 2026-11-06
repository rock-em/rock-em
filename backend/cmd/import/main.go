// import loads problems from scraper output files into the database.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/problems"
	"github.com/rock-em/rock-em/backend/internal/scraped"
)

func main() {
	dryRun := flag.Bool("dry-run", false, "only report what would be imported")
	flag.Parse()
	if flag.NArg() == 0 {
		log.Fatal("usage: import [-dry-run] scraped.json...")
	}
	var db *pgxpool.Pool
	if !*dryRun {
		url := os.Getenv("DATABASE_URL")
		if url == "" {
			log.Fatal("DATABASE_URL is required")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		var err error
		if db, err = pgxpool.New(ctx, url); err != nil || db.Ping(ctx) != nil {
			log.Fatal("could not connect to database")
		}
		defer db.Close()
	}

	added, existing, skipped := 0, 0, 0
	for _, path := range flag.Args() {
		data, err := os.ReadFile(path)
		if err != nil {
			log.Fatal(err)
		}
		var file scraped.File
		if err := json.Unmarshal(data, &file); err != nil {
			log.Fatalf("%s: %v", path, err)
		}
		for _, p := range file.Problems {
			in, err := scraped.Convert(p)
			if err != nil {
				log.Printf("skip %s: %v", p.Slug, err)
				skipped++
				continue
			}
			if *dryRun {
				log.Printf("ok %s (%d examples)", in.Slug, len(in.Tests))
				added++
				continue
			}
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			ok, err := problems.Import(ctx, db, in)
			cancel()
			switch {
			case err != nil:
				log.Printf("skip %s: %v", p.Slug, err)
				skipped++
			case ok:
				log.Printf("added %s", in.Slug)
				added++
			default:
				log.Printf("exists %s", in.Slug)
				existing++
			}
		}
	}
	if *dryRun {
		log.Printf("%d would be imported, %d skipped", added, skipped)
		return
	}
	log.Printf("%d added, %d already there, %d skipped", added, existing, skipped)
}
