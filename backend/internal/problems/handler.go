package problems

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rock-em/rock-em/backend/internal/auth"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
)

type Example struct {
	Input       string `json:"input"`
	Output      string `json:"output"`
	Explanation string `json:"explanation,omitempty"`
}
type Input struct {
	Slug         string    `json:"slug"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	Difficulty   string    `json:"difficulty"`
	Topic        string    `json:"topic"`
	Examples     []Example `json:"examples"`
	Constraints  []string  `json:"constraints"`
	Starter      string    `json:"starter"`
	FunctionName string    `json:"functionName"`
}
type ProblemDetail struct {
	ID int64 `json:"id"`
	Input
	UpdatedAt time.Time `json:"updatedAt"`
}
type Problem = ProblemDetail
type Handler struct{ db *pgxpool.Pool }

func NewHandler(db *pgxpool.Pool) *Handler { return &Handler{db: db} }

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var functionPattern = regexp.MustCompile(`^[A-Za-z_$][A-Za-z0-9_$]*$`)

func (in *Input) valid() bool {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	in.Topic = strings.TrimSpace(in.Topic)
	if in.Examples == nil {
		in.Examples = []Example{}
	}
	if in.Constraints == nil {
		in.Constraints = []string{}
	}
	return len(in.Slug) > 0 && len(in.Slug) <= 120 && slugPattern.MatchString(in.Slug) && in.Slug != "generate" && len(in.Title) > 0 && len(in.Title) <= 200 && len(in.Description) > 0 && len(in.Description) <= 50000 && (in.Difficulty == "easy" || in.Difficulty == "medium" || in.Difficulty == "hard") && len(in.Topic) <= 120 && len(in.Examples) <= 20 && len(in.Constraints) <= 50 && len(in.Starter) <= 50000 && len(in.FunctionName) <= 120 && (in.FunctionName == "" || functionPattern.MatchString(in.FunctionName))
}

const columns = `id,slug,title,description,difficulty,topic,examples,constraints,starter,function_name,updated_at`

func scan(row interface{ Scan(...any) error }) (ProblemDetail, error) {
	var p ProblemDetail
	err := row.Scan(&p.ID, &p.Slug, &p.Title, &p.Description, &p.Difficulty, &p.Topic, &p.Examples, &p.Constraints, &p.Starter, &p.FunctionName, &p.UpdatedAt)
	return p, err
}
func fail(w http.ResponseWriter, err error) {
	var pe *pgconn.PgError
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpapi.Error(w, 404, "problem not found")
	case errors.As(err, &pe) && pe.Code == "23505":
		httpapi.Error(w, 409, "slug already exists (including archived problems)")
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
	if !ok || len(q.Get("q")) > 200 || len(q.Get("topic")) > 120 || (difficulty != "" && difficulty != "easy" && difficulty != "medium" && difficulty != "hard") {
		httpapi.Error(w, 400, "invalid pagination or filters")
		return
	}
	rows, err := h.db.Query(r.Context(), `SELECT `+columns+` FROM problems WHERE deleted_at IS NULL AND ($1='' OR difficulty=$1) AND ($2='' OR topic=$2) AND ($3='' OR title ILIKE '%'||$3||'%' OR description ILIKE '%'||$3||'%') ORDER BY id LIMIT $4 OFFSET $5`, difficulty, q.Get("topic"), q.Get("q"), limit, offset)
	if err != nil {
		fail(w, err)
		return
	}
	defer rows.Close()
	result := []ProblemDetail{}
	for rows.Next() {
		p, err := scan(rows)
		if err != nil {
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
	p, err := scan(h.db.QueryRow(r.Context(), `SELECT `+columns+` FROM problems WHERE slug=$1 AND deleted_at IS NULL`, r.PathValue("slug")))
	if err != nil {
		fail(w, err)
		return
	}
	httpapi.JSON(w, 200, p)
}
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpapi.Decode(w, r, &in) {
		return
	}
	if !in.valid() {
		httpapi.Error(w, 400, "invalid problem fields")
		return
	}
	examples, _ := json.Marshal(in.Examples)
	constraints, _ := json.Marshal(in.Constraints)
	p, err := scan(h.db.QueryRow(r.Context(), `INSERT INTO problems(slug,title,description,difficulty,topic,examples,constraints,starter,function_name,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING `+columns, in.Slug, in.Title, in.Description, in.Difficulty, in.Topic, examples, constraints, in.Starter, in.FunctionName, auth.Current(r).ID))
	if err != nil {
		fail(w, err)
		return
	}
	w.Header().Set("Location", "/api/problems/"+p.Slug)
	httpapi.JSON(w, 201, p)
}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	var in Input
	if !httpapi.Decode(w, r, &in) {
		return
	}
	if !in.valid() {
		httpapi.Error(w, 400, "invalid problem fields")
		return
	}
	examples, _ := json.Marshal(in.Examples)
	constraints, _ := json.Marshal(in.Constraints)
	p, err := scan(h.db.QueryRow(r.Context(), `UPDATE problems SET slug=$1,title=$2,description=$3,difficulty=$4,topic=$5,examples=$6,constraints=$7,starter=$8,function_name=$9,updated_at=now() WHERE slug=$10 AND deleted_at IS NULL RETURNING `+columns, in.Slug, in.Title, in.Description, in.Difficulty, in.Topic, examples, constraints, in.Starter, in.FunctionName, r.PathValue("slug")))
	if err != nil {
		fail(w, err)
		return
	}
	httpapi.JSON(w, 200, p)
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
