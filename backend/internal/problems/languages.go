package problems

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
)

const languageKeysSQL = `ARRAY(SELECT jsonb_object_keys(p.languages) ORDER BY 1)`

var errLanguageUnavailable = errors.New("language unavailable")

func (h *Handler) Languages(w http.ResponseWriter, r *http.Request) {
	var names []string
	err := h.db.QueryRow(r.Context(), `SELECT `+languageKeysSQL+` FROM problems p WHERE p.slug=$1 AND p.deleted_at IS NULL`, r.PathValue("slug")).Scan(&names)
	if err != nil {
		problemReadError(w, err)
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
	var p ProblemDetail
	var data json.RawMessage
	var names []string
	err := h.db.QueryRow(ctx, `SELECT p.slug,p.title,p.short_description,p.difficulty,p.topic,p.description,`+languageKeysSQL+`,p.languages->$2 FROM problems p WHERE p.slug=$1 AND p.deleted_at IS NULL`, slug, language).Scan(&p.Slug, &p.Title, &p.ShortDescription, &p.Difficulty, &p.Category, &p.Description, &names, &data)
	if err != nil {
		return p, nil, err
	}
	if len(data) == 0 {
		return p, names, errLanguageUnavailable
	}
	if err = json.Unmarshal(data, &p.Variant); err != nil {
		return p, names, err
	}
	p.Language = language
	return p, names, nil
}

// Remove exactly this key. Other languages and users' progress are unchanged.
func (h *Handler) DeleteLanguage(w http.ResponseWriter, r *http.Request) {
	result, err := h.db.Exec(r.Context(), `UPDATE problems SET languages=languages-$2,updated_at=now() WHERE slug=$1 AND deleted_at IS NULL AND languages ? $2`, r.PathValue("slug"), r.PathValue("language"))
	if err != nil {
		fail(w, err)
		return
	}
	if result.RowsAffected() == 0 {
		httpapi.JSON(w, 404, map[string]string{"code": "language_not_available", "error": "problem or language not found"})
		return
	}
	w.WriteHeader(204)
}
