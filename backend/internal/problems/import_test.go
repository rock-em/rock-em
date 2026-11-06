package problems

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/rock-em/rock-em/backend/internal/testutil"
)

func TestImportAddsProblemOnce(t *testing.T) {
	db := testutil.NewTestDB(t)
	t.Cleanup(func() {
		db.Exec(context.Background(), `DELETE FROM problems WHERE slug='test-import-sum'`)
	})
	in := Input{
		Summary:     Summary{Slug: "test-import-sum", Title: "Import Sum", ShortDescription: "Add two numbers.", Difficulty: "easy", Category: "Math"},
		Topics:      []string{"Test Import Topic"},
		Description: "Return a + b.",
		Signature:   &Signature{Function: "add", Params: []Param{{Name: "a", Type: "int"}, {Name: "b", Type: "int"}}, Returns: "int"},
		Tests: []TestInput{{Kind: "example", Test: Test{
			Args:     []json.RawMessage{json.RawMessage("1"), json.RawMessage("2")},
			Expected: json.RawMessage("3"),
		}}},
	}

	added, err := Import(t.Context(), db, in)
	if err != nil || !added {
		t.Fatalf("first import: added=%v err=%v", added, err)
	}
	added, err = Import(t.Context(), db, in)
	if err != nil || added {
		t.Fatalf("second import: added=%v err=%v", added, err)
	}

	var title, topic string
	var tests int
	err = db.QueryRow(t.Context(), `SELECT p.title, (SELECT t.name FROM problem_topics pt JOIN topics t ON t.id=pt.topic_id WHERE pt.problem_id=p.id AND pt.is_primary), (SELECT count(*) FROM problem_tests WHERE problem_id=p.id) FROM problems p WHERE slug='test-import-sum'`).Scan(&title, &topic, &tests)
	if err != nil {
		t.Fatal(err)
	}
	if title != "Import Sum" || topic != "Math" || tests != 1 {
		t.Fatalf("stored title=%q topic=%q tests=%d", title, topic, tests)
	}
}

func TestImportRejectsInvalidProblem(t *testing.T) {
	db := testutil.NewTestDB(t)
	if _, err := Import(t.Context(), db, Input{Summary: Summary{Slug: "Bad Slug"}}); err != ErrInvalid {
		t.Fatalf("err = %v, want ErrInvalid", err)
	}
}
