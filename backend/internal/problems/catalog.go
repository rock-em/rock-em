package problems

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/rock-em/rock-em/backend/internal/httpapi"
)

// Catalog is every published problem in one response, small enough to filter
// and sort in the browser. Problems refer to topics by index into Topics, with
// the primary topic first.
type Catalog struct {
	Topics   []CatalogTopic   `json:"topics"`
	Problems []CatalogProblem `json:"problems"`
}
type CatalogTopic struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
}
type CatalogProblem struct {
	Slug       string `json:"slug"`
	Title      string `json:"title"`
	Difficulty string `json:"difficulty"`
	Topics     []int  `json:"topics"`
}

// catalogTTL bounds how long changes made outside this process, like the
// importer, stay invisible. Writes through the API reset the cache right away.
const catalogTTL = 30 * time.Second

type catalogCache struct {
	mu       sync.Mutex
	body, gz []byte
	etag     string
	built    time.Time
}

func (c *catalogCache) reset() {
	c.mu.Lock()
	c.built = time.Time{}
	c.mu.Unlock()
}

func (h *Handler) loadCatalog(ctx context.Context) (Catalog, error) {
	catalog := Catalog{Topics: []CatalogTopic{}, Problems: []CatalogProblem{}}
	rows, err := h.db.Query(ctx, `SELECT p.slug,p.title,p.difficulty,t.slug,t.name FROM problems p
		LEFT JOIN problem_topics pt ON pt.problem_id=p.id LEFT JOIN topics t ON t.id=pt.topic_id
		WHERE p.deleted_at IS NULL ORDER BY p.id, pt.is_primary DESC, t.sort_order, t.id`)
	if err != nil {
		return catalog, err
	}
	defer rows.Close()
	index := map[string]int{}
	for rows.Next() {
		var slug, title, difficulty string
		var topicSlug, topicName *string
		if err := rows.Scan(&slug, &title, &difficulty, &topicSlug, &topicName); err != nil {
			return catalog, err
		}
		last := len(catalog.Problems) - 1
		if last < 0 || catalog.Problems[last].Slug != slug {
			catalog.Problems = append(catalog.Problems, CatalogProblem{Slug: slug, Title: title, Difficulty: difficulty, Topics: []int{}})
			last++
		}
		if topicSlug == nil {
			continue
		}
		i, seen := index[*topicSlug]
		if !seen {
			i = len(catalog.Topics)
			index[*topicSlug] = i
			catalog.Topics = append(catalog.Topics, CatalogTopic{Slug: *topicSlug, Name: *topicName})
		}
		catalog.Problems[last].Topics = append(catalog.Problems[last].Topics, i)
	}
	return catalog, rows.Err()
}

// encodedCatalog returns the JSON, its gzip and an ETag, rebuilding them when
// the cache is older than catalogTTL. A failed rebuild serves the last copy.
func (h *Handler) encodedCatalog(ctx context.Context) (body, gz []byte, etag string, err error) {
	c := &h.catalog
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.body != nil && time.Since(c.built) < catalogTTL {
		return c.body, c.gz, c.etag, nil
	}
	catalog, err := h.loadCatalog(ctx)
	if err == nil {
		body, err = json.Marshal(catalog)
	}
	if err != nil {
		if c.body != nil {
			return c.body, c.gz, c.etag, nil
		}
		return nil, nil, "", err
	}
	var compressed bytes.Buffer
	zw, _ := gzip.NewWriterLevel(&compressed, gzip.BestCompression)
	_, _ = zw.Write(body)
	_ = zw.Close()
	sum := sha256.Sum256(body)
	c.body, c.gz, c.etag, c.built = body, compressed.Bytes(), `"`+hex.EncodeToString(sum[:12])+`"`, time.Now()
	return c.body, c.gz, c.etag, nil
}

func (h *Handler) Catalog(w http.ResponseWriter, r *http.Request) {
	body, gz, etag, err := h.encodedCatalog(r.Context())
	if err != nil {
		httpapi.Error(w, 500, "could not load the catalog")
		return
	}
	header := w.Header()
	// The catalog is the same for everyone, so browsers may reuse it briefly and
	// then revalidate with the ETag, which costs a 304 instead of the full list.
	header.Set("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
	header.Set("ETag", etag)
	header.Set("Vary", "Accept-Encoding")
	if match := r.Header.Get("If-None-Match"); match != "" && strings.Contains(match, etag) {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	header.Set("Content-Type", "application/json")
	if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		header.Set("Content-Encoding", "gzip")
		body = gz
	}
	_, _ = w.Write(body)
}
