package problems

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/auth"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
)

type Handler struct{ db *pgxpool.Pool }

func NewHandler(db *pgxpool.Pool) *Handler { return &Handler{db: db} }

func fail(w http.ResponseWriter, err error) {
	var pe *pgconn.PgError
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpapi.Error(w, 404, "problem not found")
	case errors.As(err, &pe) && pe.Code == "23505":
		httpapi.Error(w, 409, "slug already exists (including archived problems)")
	case errors.As(err, &pe) && pe.Code == "23503":
		httpapi.Error(w, 400, "starter override uses an unknown language")
	default:
		httpapi.Error(w, 500, "could not process problem")
	}
}
func page(r *http.Request) (int, int, bool) {
	limit, offset := 50, 0
	var err error
	if s := r.URL.Query().Get("limit"); s != "" {
		limit, err = strconv.Atoi(s)
		if err != nil {
			return 0, 0, false
		}
	}
	if s := r.URL.Query().Get("offset"); s != "" {
		offset, err = strconv.Atoi(s)
		if err != nil {
			return 0, 0, false
		}
	}
	return limit, offset, limit >= 1 && limit <= 100 && offset >= 0 && offset <= 1000000
}
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := page(r)
	q := r.URL.Query()
	difficulty := q.Get("difficulty")
	category := q.Get("category")
	// Preserve the old filter alias, but use category in responses and new clients.
	if category == "" {
		category = q.Get("topic")
	}
	if !ok || len(q.Get("q")) > 200 || len(category) > 120 || (difficulty != "" && difficulty != "easy" && difficulty != "medium" && difficulty != "hard") {
		httpapi.Error(w, 400, "invalid pagination or filters")
		return
	}
	rows, err := h.db.Query(r.Context(), `SELECT slug,title,short_description,difficulty,coalesce((SELECT t.name FROM problem_topics pt JOIN topics t ON t.id=pt.topic_id WHERE pt.problem_id=p.id AND pt.is_primary),'') FROM problems p WHERE deleted_at IS NULL AND ($1='' OR difficulty=$1) AND ($2='' OR EXISTS(SELECT 1 FROM problem_topics pt JOIN topics t ON t.id=pt.topic_id WHERE pt.problem_id=p.id AND (t.name=$2 OR t.slug=$2))) AND ($3='' OR title ILIKE '%'||$3||'%' OR short_description ILIKE '%'||$3||'%') ORDER BY id LIMIT $4 OFFSET $5`, difficulty, category, q.Get("q"), limit, offset)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	result := []Summary{}
	for rows.Next() {
		var p Summary
		if err := rows.Scan(&p.Slug, &p.Title, &p.ShortDescription, &p.Difficulty, &p.Category); err != nil {
			fail(w, err)
			return
		}
		result = append(result, p)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	httpapi.JSON(w, 200, result)
}
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	language := "python"
	if values, present := r.URL.Query()["language"]; present {
		if len(values) != 1 || !languagePattern.MatchString(values[0]) {
			httpapi.Error(w, 400, "provide one lowercase language identifier")
			return
		}
		language = values[0]
	}
	p, languages, err := h.getDetail(r.Context(), r.PathValue("slug"), language)
	if errors.Is(err, errLanguageUnavailable) {
		httpapi.JSON(w, 404, map[string]any{"code": "language_not_available", "error": "requested language is not available for this problem", "languages": languages})
		return
	}
	if err != nil {
		problemReadError(w, err)
		return
	}
	httpapi.JSON(w, 200, p)
}

// Topics and tests are replaced; starter overrides merge by key. Topics are
// shared by slug, so category becomes the existing topic's canonical name.
func saveContract(ctx context.Context, tx pgx.Tx, id int64, in *Input) error {
	if _, err := tx.Exec(ctx, `DELETE FROM problem_topics WHERE problem_id=$1`, id); err != nil {
		return err
	}
	for i, name := range in.Topics {
		var topic int64
		err := tx.QueryRow(ctx, `WITH created AS (INSERT INTO topics(slug,name,sort_order) SELECT $1,$2,coalesce(max(sort_order),0)+1 FROM topics ON CONFLICT (slug) DO NOTHING RETURNING id,name)
			SELECT id,name FROM created UNION ALL SELECT id,name FROM topics WHERE slug=$1 LIMIT 1`, topicSlug(name), name).Scan(&topic, &in.Topics[i])
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO problem_topics(problem_id,topic_id,is_primary) VALUES($1,$2,$3)`, id, topic, i == 0); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM problem_tests WHERE problem_id=$1`, id); err != nil {
		return err
	}
	for i, test := range in.Tests {
		args, err := json.Marshal(test.Args)
		if err != nil {
			return err
		}
		var explanation *string
		if test.Explanation != "" {
			explanation = &test.Explanation
		}
		if _, err = tx.Exec(ctx, `INSERT INTO problem_tests(problem_id,ordinal,kind,args,expected,explanation) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6)`, id, i, test.Kind, string(args), string(test.Expected), explanation); err != nil {
			return err
		}
	}
	for language, code := range in.Starters {
		if _, err := tx.Exec(ctx, `INSERT INTO problem_starters(problem_id,language,code) VALUES($1,$2,$3) ON CONFLICT (problem_id,language) DO UPDATE SET code=EXCLUDED.code`, id, language, code); err != nil {
			return err
		}
	}
	in.Category = in.Topics[0]
	return nil
}
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) { h.write(w, r, true) }
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) { h.write(w, r, false) }
func (h *Handler) write(w http.ResponseWriter, r *http.Request, create bool) {
	var in Input
	if !httpapi.Decode(w, r, &in) {
		return
	}
	if !in.valid() {
		httpapi.Error(w, 400, "invalid problem fields, signature or tests; tests must match the signature")
		return
	}
	constraints, err := json.Marshal(in.Constraints)
	if err != nil {
		fail(w, err)
		return
	}
	signature, err := json.Marshal(in.Signature)
	if err != nil {
		fail(w, err)
		return
	}
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		fail(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	var id int64
	if create {
		err = tx.QueryRow(r.Context(), `INSERT INTO problems(slug,title,short_description,description,difficulty,constraints,signature,compare,created_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9) RETURNING id`, in.Slug, in.Title, in.ShortDescription, in.Description, in.Difficulty, string(constraints), string(signature), in.Compare, auth.Current(r).ID).Scan(&id)
	} else {
		err = tx.QueryRow(r.Context(), `UPDATE problems SET slug=$1,title=$2,short_description=$3,description=$4,difficulty=$5,constraints=$6::jsonb,signature=$7::jsonb,compare=$8,updated_at=now() WHERE slug=$9 AND deleted_at IS NULL RETURNING id`, in.Slug, in.Title, in.ShortDescription, in.Description, in.Difficulty, string(constraints), string(signature), in.Compare, r.PathValue("slug")).Scan(&id)
	}
	if err != nil {
		fail(w, err)
		return
	}
	if err = saveContract(r.Context(), tx, id, &in); err != nil {
		fail(w, err)
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		fail(w, err)
		return
	}
	status := 200
	if create {
		status = 201
		w.Header().Set("Location", "/api/problems/"+in.Slug)
	}
	httpapi.JSON(w, status, in.Summary)
}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	result, err := h.db.Exec(r.Context(), `UPDATE problems SET deleted_at=now(),updated_at=now() WHERE slug=$1 AND deleted_at IS NULL`, r.PathValue("slug"))
	if err != nil {
		fail(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		fail(w, pgx.ErrNoRows)
		return
	}
	w.WriteHeader(204)
}

type State struct {
	Slug       string    `json:"slug"`
	Bookmarked bool      `json:"bookmarked"`
	Status     string    `json:"status"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func (h *Handler) SaveState(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Bookmarked *bool   `json:"bookmarked"`
		Status     *string `json:"status"`
	}
	if !httpapi.Decode(w, r, &in) {
		return
	}
	if (in.Bookmarked == nil && in.Status == nil) || (in.Status != nil && *in.Status != "not_started" && *in.Status != "in_progress" && *in.Status != "completed") {
		httpapi.Error(w, 400, "provide bookmarked or a valid progress status")
		return
	}
	var s State
	s.Slug = r.PathValue("slug")
	err := h.db.QueryRow(r.Context(), `INSERT INTO user_problems(user_id,problem_id,bookmarked,status) SELECT $1,id,COALESCE($3,false),COALESCE($4,'not_started') FROM problems WHERE slug=$2 AND deleted_at IS NULL ON CONFLICT(user_id,problem_id) DO UPDATE SET bookmarked=COALESCE($3,user_problems.bookmarked),status=COALESCE($4,user_problems.status),updated_at=now() RETURNING bookmarked,status,updated_at`, auth.Current(r).ID, s.Slug, in.Bookmarked, in.Status).Scan(&s.Bookmarked, &s.Status, &s.UpdatedAt)
	if err != nil {
		fail(w, err)
		return
	}
	httpapi.JSON(w, 200, s)
}
func (h *Handler) States(w http.ResponseWriter, r *http.Request) {
	limit, offset, ok := page(r)
	if !ok {
		httpapi.Error(w, 400, "invalid pagination")
		return
	}
	rows, err := h.db.Query(r.Context(), `SELECT p.slug,s.bookmarked,s.status,s.updated_at FROM user_problems s JOIN problems p ON p.id=s.problem_id WHERE s.user_id=$1 AND p.deleted_at IS NULL ORDER BY s.updated_at DESC,p.id LIMIT $2 OFFSET $3`, auth.Current(r).ID, limit, offset)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	result := []State{}
	for rows.Next() {
		var s State
		if err := rows.Scan(&s.Slug, &s.Bookmarked, &s.Status, &s.UpdatedAt); err != nil {
			fail(w, err)
			return
		}
		result = append(result, s)
	}
	if err := rows.Err(); err != nil {
		fail(w, err)
		return
	}
	httpapi.JSON(w, 200, result)
}
