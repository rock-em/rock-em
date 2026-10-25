package generator

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeGenerator struct {
	problem Problem
	err     error
	got     Request
}

func (f *fakeGenerator) Generate(_ context.Context, req Request) (Problem, error) {
	f.got = req
	return f.problem, f.err
}

func postGenerate(handler *Handler, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/api/problems/generate", strings.NewReader(body))
	response := httptest.NewRecorder()
	handler.Generate(response, request)
	return response
}

func TestGenerateReturnsProblem(t *testing.T) {
	fake := &fakeGenerator{problem: Problem{Title: "Late Shipment Window", Topic: "sliding window"}}
	handler := NewHandler(fake)

	response := postGenerate(handler, `{"topic":" sliding window ","theme":"logistics","level":"Beginner"}`)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.Code)
	}

	if fake.got.Topic != "sliding window" || fake.got.Level != "beginner" {
		t.Errorf("expected normalized request, got %+v", fake.got)
	}

	var problem Problem
	if err := json.NewDecoder(response.Body).Decode(&problem); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if problem.Title != "Late Shipment Window" {
		t.Errorf("expected title %q, got %q", "Late Shipment Window", problem.Title)
	}
}

func TestGenerateRejectsInvalidRequest(t *testing.T) {
	handler := NewHandler(&fakeGenerator{})

	for _, body := range []string{`not json`, `{"topic":""}`, `{"topic":"heaps","level":"expert"}`} {
		response := postGenerate(handler, body)

		if response.Code != http.StatusBadRequest {
			t.Errorf("body %s: expected status %d, got %d", body, http.StatusBadRequest, response.Code)
		}
	}
}

func TestGenerateReportsGeneratorFailure(t *testing.T) {
	handler := NewHandler(&fakeGenerator{err: errors.New("boom")})

	response := postGenerate(handler, `{"topic":"heaps"}`)

	if response.Code != http.StatusBadGateway {
		t.Fatalf("expected status %d, got %d", http.StatusBadGateway, response.Code)
	}

	expected := "{\"error\":\"failed to generate problem, please try again\"}\n"
	if response.Body.String() != expected {
		t.Errorf("expected body %q, got %q", expected, response.Body.String())
	}
}
