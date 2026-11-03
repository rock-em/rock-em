package problems

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
)

var errLanguageUnavailable = errors.New("language unavailable")

type offer struct {
	indent   string
	override *string
}

// offers lists enabled languages that can serve this problem: a signature is
// required, plus either a starter generator or a stored override.
func (h *Handler) offers(ctx context.Context, id int64, signed bool) (map[string]offer, []string, error) {
	result, names := map[string]offer{}, []string{}
	if !signed {
		return result, names, nil
	}
	rows, err := h.db.Query(ctx, `SELECT l.key,l.indent_unit,s.code FROM languages l LEFT JOIN problem_starters s ON s.problem_id=$1 AND s.language=l.key WHERE l.enabled ORDER BY l.key`, id)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var o offer
		if err := rows.Scan(&key, &o.indent, &o.override); err != nil {
			return nil, nil, err
		}
		if _, ok := languages[key]; ok || o.override != nil {
			result[key] = o
			names = append(names, key)
		}
	}
	return result, names, rows.Err()
}

func (h *Handler) Languages(w http.ResponseWriter, r *http.Request) {
	var id int64
	var signed bool
	err := h.db.QueryRow(r.Context(), `SELECT id,signature IS NOT NULL FROM problems WHERE slug=$1 AND deleted_at IS NULL`, r.PathValue("slug")).Scan(&id, &signed)
	if err != nil {
		problemReadError(w, err)
		return
	}
	_, names, err := h.offers(r.Context(), id, signed)
	if err != nil {
		fail(w, err)
		return
	}
	httpapi.JSON(w, 200, names)
}
func problemReadError(w http.ResponseWriter, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		httpapi.JSON(w, 404, map[string]string{"code": "problem_not_found", "error": "problem not found"})
		return
	}
	fail(w, err)
}
func (h *Handler) getDetail(ctx context.Context, slug, language string) (ProblemDetail, []string, error) {
	p := ProblemDetail{Examples: []Test{}, Tests: []Test{}}
	var id int64
	var signature []byte
	err := h.db.QueryRow(ctx, `SELECT p.id,p.slug,p.title,p.short_description,p.difficulty,p.topic,p.description,p.constraints,p.signature,p.compare,
		ARRAY(SELECT t.name FROM problem_topics pt JOIN topics t ON t.id=pt.topic_id WHERE pt.problem_id=p.id ORDER BY pt.is_primary DESC,t.sort_order,t.name)
		FROM problems p WHERE p.slug=$1 AND p.deleted_at IS NULL`, slug).Scan(&id, &p.Slug, &p.Title, &p.ShortDescription, &p.Difficulty, &p.Category, &p.Description, &p.Constraints, &signature, &p.Compare, &p.Topics)
	if err != nil {
		return p, nil, err
	}
	offers, names, err := h.offers(ctx, id, signature != nil)
	if err != nil {
		return p, nil, err
	}
	o, ok := offers[language]
	if !ok {
		return p, names, errLanguageUnavailable
	}
	if err = json.Unmarshal(signature, &p.Signature); err != nil {
		return p, names, err
	}
	rows, err := h.db.Query(ctx, `SELECT kind,args,expected,coalesce(explanation,'') FROM problem_tests WHERE problem_id=$1 AND kind<>'hidden' ORDER BY kind='example' DESC,ordinal`, id)
	if err != nil {
		return p, names, err
	}
	defer rows.Close()
	for rows.Next() {
		var kind string
		var args json.RawMessage
		var t Test
		if err := rows.Scan(&kind, &args, &t.Expected, &t.Explanation); err != nil {
			return p, names, err
		}
		if err := json.Unmarshal(args, &t.Args); err != nil {
			return p, names, err
		}
		if kind == "example" {
			p.Examples = append(p.Examples, t)
		}
		p.Tests = append(p.Tests, t)
	}
	if err = rows.Err(); err != nil {
		return p, names, err
	}
	p.Language, p.IndentUnit, p.FunctionName = language, o.indent, p.Signature.Function
	if l, ok := languages[language]; ok {
		p.FunctionName = l.name(p.Signature.Function)
		p.Starter = l.starter(p.Signature, o.indent)
	}
	if o.override != nil {
		p.Starter = *o.override
	}
	return p, names, nil
}

// Remove this language's starter override; the generated starter is served again.
func (h *Handler) DeleteLanguage(w http.ResponseWriter, r *http.Request) {
	result, err := h.db.Exec(r.Context(), `DELETE FROM problem_starters s USING problems p WHERE s.problem_id=p.id AND p.slug=$1 AND p.deleted_at IS NULL AND s.language=$2`, r.PathValue("slug"), r.PathValue("language"))
	if err != nil {
		fail(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		httpapi.JSON(w, 404, map[string]string{"code": "language_not_available", "error": "problem or starter override not found"})
		return
	}
	w.WriteHeader(204)
}
