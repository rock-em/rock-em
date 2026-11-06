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
