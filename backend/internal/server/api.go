package server

import (
	"net/http"
	"time"

	"github.com/rock-em/rock-em/backend/internal/apigen"
	"github.com/rock-em/rock-em/backend/internal/auth"
	"github.com/rock-em/rock-em/backend/internal/health"
	"github.com/rock-em/rock-em/backend/internal/httpapi"
	"github.com/rock-em/rock-em/backend/internal/problems"
)

// Handwritten authorization and business logic behind the generated route interface.
type apiServer struct {
	a                                   *auth.Handler
	p                                   *problems.Handler
	health                              *health.Handler
	login, register, password, generate http.HandlerFunc
}

var _ apigen.ServerInterface = (*apiServer)(nil)

func newAPI(a *auth.Handler, p *problems.Handler, h *health.Handler, generate http.HandlerFunc) *apiServer {
	if generate == nil {
		generate = notImplemented
	}
	return &apiServer{a: a, p: p, health: h, login: auth.Limit(10, time.Minute, a.Login), register: auth.Limit(5, time.Minute, a.Register), password: a.Require(false, auth.Limit(5, time.Minute, a.Password)), generate: a.Require(false, auth.Limit(5, time.Minute, generate))}
}
func notImplemented(w http.ResponseWriter, r *http.Request) {
	httpapi.JSON(w, http.StatusNotImplemented, map[string]string{"code": "not_implemented", "error": "this endpoint is not implemented yet"})
}

func (s *apiServer) Login(w http.ResponseWriter, r *http.Request) {
	s.login(w, r)
}

func (s *apiServer) Logout(w http.ResponseWriter, r *http.Request) {
	s.a.Logout(w, r)
}

func (s *apiServer) CurrentUser(w http.ResponseWriter, r *http.Request) {
	s.a.Require(false, s.a.Me)(w, r)
}

func (s *apiServer) ChangePassword(w http.ResponseWriter, r *http.Request) {
	s.password(w, r)
}

func (s *apiServer) Register(w http.ResponseWriter, r *http.Request) {
	s.register(w, r)
}

func (s *apiServer) Health(w http.ResponseWriter, r *http.Request) {
	s.health.Check(w, r)
}

func (s *apiServer) GetDraft(w http.ResponseWriter, r *http.Request, slug string, params apigen.GetDraftParams) {
	r.SetPathValue("slug", slug)
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) SaveDraft(w http.ResponseWriter, r *http.Request, slug string, params apigen.SaveDraftParams) {
	r.SetPathValue("slug", slug)
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) ListSavedProblems(w http.ResponseWriter, r *http.Request, params apigen.ListSavedProblemsParams) {
	s.a.Require(false, s.p.States)(w, r)
}

func (s *apiServer) SaveProblemState(w http.ResponseWriter, r *http.Request, slug string) {
	r.SetPathValue("slug", slug)
	s.a.Require(false, s.p.SaveState)(w, r)
}

func (s *apiServer) ListProblems(w http.ResponseWriter, r *http.Request, params apigen.ListProblemsParams) {
	s.p.List(w, r)
}

func (s *apiServer) CreateProblem(w http.ResponseWriter, r *http.Request) {
	s.a.Require(true, s.p.Create)(w, r)
}

func (s *apiServer) GenerateProblem(w http.ResponseWriter, r *http.Request) {
	s.generate(w, r)
}

func (s *apiServer) DeleteProblem(w http.ResponseWriter, r *http.Request, slug string) {
	r.SetPathValue("slug", slug)
	s.a.Require(true, s.p.Delete)(w, r)
}

func (s *apiServer) GetProblem(w http.ResponseWriter, r *http.Request, slug string, params apigen.GetProblemParams) {
	r.SetPathValue("slug", slug)
	s.p.Get(w, r)
}

func (s *apiServer) UpdateProblem(w http.ResponseWriter, r *http.Request, slug string) {
	r.SetPathValue("slug", slug)
	s.a.Require(true, s.p.Update)(w, r)
}

func (s *apiServer) ListProblemLanguages(w http.ResponseWriter, r *http.Request, slug string) {
	r.SetPathValue("slug", slug)
	s.p.Languages(w, r)
}

func (s *apiServer) DeleteProblemLanguage(w http.ResponseWriter, r *http.Request, slug string, language string) {
	r.SetPathValue("slug", slug)
	r.SetPathValue("language", language)
	s.a.Require(true, s.p.DeleteLanguage)(w, r)
}

func (s *apiServer) GetWorkspace(w http.ResponseWriter, r *http.Request, slug string, params apigen.GetWorkspaceParams) {
	r.SetPathValue("slug", slug)
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) CreateRun(w http.ResponseWriter, r *http.Request) {
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) GetRun(w http.ResponseWriter, r *http.Request, id string) {
	r.SetPathValue("id", id)
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) ListSubmissions(w http.ResponseWriter, r *http.Request, params apigen.ListSubmissionsParams) {
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) CreateSubmission(w http.ResponseWriter, r *http.Request) {
	s.a.Require(false, notImplemented)(w, r)
}

func (s *apiServer) GetSubmission(w http.ResponseWriter, r *http.Request, id string) {
	r.SetPathValue("id", id)
	s.a.Require(false, notImplemented)(w, r)
}
