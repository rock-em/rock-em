package problems

import (
	"compress/gzip"
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/rock-em/rock-em/backend/internal/testutil"
)

func TestCatalogListsEveryTopicAndRevalidates(t *testing.T) {
	db := testutil.NewTestDB(t)
	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM problems WHERE slug='catalog-test-problem'`)
		_, _ = db.Exec(context.Background(), `DELETE FROM topics WHERE slug LIKE 'catalog-test-%'`)
	})
	_, err := db.Exec(t.Context(), `WITH p AS (INSERT INTO problems(slug,title,description,difficulty) VALUES('catalog-test-problem','Catalog Test','Statement','hard') RETURNING id),
		t AS (INSERT INTO topics(slug,name,sort_order) VALUES('catalog-test-extra','Catalog Extra',1),('catalog-test-main','Catalog Main',2) RETURNING id,slug)
		INSERT INTO problem_topics(problem_id,topic_id,is_primary) SELECT p.id,t.id,t.slug='catalog-test-main' FROM p,t`)
	if err != nil {
		t.Fatal(err)
	}
	h := NewHandler(db)

	r := httptest.NewRequest("GET", "/api/catalog", nil)
	r.Header.Set("Accept-Encoding", "gzip")
	w := httptest.NewRecorder()
	h.Catalog(w, r)
	if w.Code != 200 || w.Header().Get("Content-Encoding") != "gzip" {
		t.Fatalf("status %d, encoding %q", w.Code, w.Header().Get("Content-Encoding"))
	}
	zr, err := gzip.NewReader(w.Body)
	if err != nil {
		t.Fatal(err)
	}
	var catalog Catalog
	if err := json.NewDecoder(zr).Decode(&catalog); err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, p := range catalog.Problems {
		if p.Slug == "catalog-test-problem" {
			for _, i := range p.Topics {
				names = append(names, catalog.Topics[i].Name)
			}
		}
	}
	if len(names) != 2 || names[0] != "Catalog Main" || names[1] != "Catalog Extra" {
		t.Fatalf("want the primary topic first, then the rest; got %v", names)
	}

	etag := w.Header().Get("ETag")
	r = httptest.NewRequest("GET", "/api/catalog", nil)
	r.Header.Set("If-None-Match", etag)
	w = httptest.NewRecorder()
	h.Catalog(w, r)
	if etag == "" || w.Code != 304 || w.Body.Len() != 0 {
		t.Fatalf("expected an empty 304 for a matching ETag, got %d", w.Code)
	}

	// A cached catalog is reused until a write through the API resets it.
	if _, err := db.Exec(t.Context(), `UPDATE problems SET deleted_at=now() WHERE slug='catalog-test-problem'`); err != nil {
		t.Fatal(err)
	}
	w = httptest.NewRecorder()
	h.Catalog(w, httptest.NewRequest("GET", "/api/catalog", nil))
	if w.Header().Get("ETag") != etag {
		t.Fatal("expected the cached catalog")
	}
	h.catalog.reset()
	w = httptest.NewRecorder()
	h.Catalog(w, httptest.NewRequest("GET", "/api/catalog", nil))
	if w.Header().Get("ETag") == etag {
		t.Fatal("expected a rebuilt catalog without the deleted problem")
	}
}
