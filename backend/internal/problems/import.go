package problems

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrInvalid = errors.New("invalid problem fields, signature or tests")

// Check normalizes the input the same way the API does before saving it.
func (in *Input) Check() error {
	if !in.valid() {
		return ErrInvalid
	}
	return nil
}

// Import adds a problem that isn't owned by any account, like ones loaded from
// the scraper. Existing slugs are left alone and reported as not added.
func Import(ctx context.Context, db *pgxpool.Pool, in Input) (bool, error) {
	if err := in.Check(); err != nil {
		return false, err
	}
	constraints, err := json.Marshal(in.Constraints)
	if err != nil {
		return false, err
	}
	signature, err := json.Marshal(in.Signature)
	if err != nil {
		return false, err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var id int64
	err = tx.QueryRow(ctx, `INSERT INTO problems(slug,title,short_description,description,difficulty,constraints,signature,compare) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8) ON CONFLICT (slug) DO NOTHING RETURNING id`, in.Slug, in.Title, in.ShortDescription, in.Description, in.Difficulty, string(constraints), string(signature), in.Compare).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err = saveContract(ctx, tx, id, &in); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

// RefreshText rewrites the wording of an imported problem: its description,
// summary, constraints and example explanations. The signature, tests, topics
// and starters stay as they are, and so do problems an account created.
// It reports whether a problem with that slug was there to update.
func RefreshText(ctx context.Context, db *pgxpool.Pool, in Input) (bool, error) {
	if err := in.Check(); err != nil {
		return false, err
	}
	constraints, err := json.Marshal(in.Constraints)
	if err != nil {
		return false, err
	}
	tx, err := db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var id int64
	err = tx.QueryRow(ctx, `UPDATE problems SET short_description=$1,description=$2,constraints=$3::jsonb,updated_at=now() WHERE slug=$4 AND deleted_at IS NULL AND created_by IS NULL RETURNING id`, in.ShortDescription, in.Description, string(constraints), in.Slug).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	for i, test := range in.Tests {
		if test.Explanation == "" {
			continue
		}
		// Matched on the stored values too, so an edited test keeps its own note.
		args, err := json.Marshal(test.Args)
		if err != nil {
			return false, err
		}
		if _, err = tx.Exec(ctx, `UPDATE problem_tests SET explanation=$1 WHERE problem_id=$2 AND ordinal=$3 AND args=$4::jsonb AND expected=$5::jsonb`, test.Explanation, id, i, string(args), string(test.Expected)); err != nil {
			return false, err
		}
	}
	return true, tx.Commit(ctx)
}
