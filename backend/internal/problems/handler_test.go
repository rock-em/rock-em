package problems

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rock-em/rock-em/backend/internal/testutil"
)

func TestGetReturnsProblem(t *testing.T) {
	db := testutil.NewTestDB(t)

	_, err := db.Exec(
		t.Context(),
		`
			INSERT INTO problems (slug, title, description, difficulty)
			VALUES ($1, $2, $3, $4)
		`,
		"test-two-sum",
		"Two Sum",
		"Find two numbers that add up to the target.",
		"easy",
	)
	if err != nil {
		t.Fatalf("failed to insert test problem: %v", err)
	}

	t.Cleanup(func() {
		_, err := db.Exec(
			context.Background(),
			`DELETE FROM problems WHERE slug = $1`,
			"test-two-sum",
		)
		if err != nil {
			t.Errorf("failed to clean up test problem: %v", err)
		}
	})

	handler := NewHandler(db)

	request := httptest.NewRequest(
		http.MethodGet,
		"/api/problems/test-two-sum",
		nil,
	)
	request.SetPathValue("slug", "test-two-sum")

	response := httptest.NewRecorder()

	handler.Get(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusOK,
			response.Code,
		)
	}

	var problem ProblemDetail

	if err := json.NewDecoder(response.Body).Decode(&problem); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if problem.Slug != "test-two-sum" {
		t.Errorf(
			"expected slug %q, got %q",
			"test-two-sum",
			problem.Slug,
		)
	}

	if problem.Title != "Two Sum" {
		t.Errorf(
			"expected title %q, got %q",
			"Two Sum",
			problem.Title,
		)
	}

	if problem.Difficulty != "easy" {
		t.Errorf(
			"expected difficulty %q, got %q",
			"easy",
			problem.Difficulty,
		)
	}
}

func TestGetReturnsNotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	handler := NewHandler(db)

	request := httptest.NewRequest(
		http.MethodGet,
		"/api/problems/does-not-exist",
		nil,
	)
	request.SetPathValue("slug", "does-not-exist")

	response := httptest.NewRecorder()

	handler.Get(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf(
			"expected status %d, got %d",
			http.StatusNotFound,
			response.Code,
		)
	}

	expected := "{\"error\":\"problem not found\"}\n"

	if response.Body.String() != expected {
		t.Errorf(
			"expected body %q, got %q",
			expected,
			response.Body.String(),
		)
	}
}
