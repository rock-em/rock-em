import { ApiError } from "../../api/client";
import { useRequest } from "../../lib/useRequest";
import { getProblemCatalog, getProblemDetail, getProblemLanguages } from "./api";
import { chooseLanguage } from "./model";

const UNREACHABLE = "Unable to reach the problem service.";
const NO_PROBLEMS: never[] = [];

export function useProblemCatalog() {
  const request = useRequest("catalog", getProblemCatalog);
  return {
    data: request.data ?? NO_PROBLEMS,
    loading: request.loading,
    error: request.error ? request.error.message || UNREACHABLE : "",
    retry: request.retry,
  };
}

export function useProblemDetail(slug: string | null, preferred?: string) {
  const request = useRequest(slug === null ? null : JSON.stringify([slug, preferred]), async (signal) => {
    const languages = await getProblemLanguages(slug!, signal);
    const language = chooseLanguage(languages, preferred) ?? languages[0];
    return { languages, detail: language ? await getProblemDetail(slug!, language, signal) : null };
  });
  const { error } = request;
  return {
    data: request.data?.detail ?? null,
    languages: request.data?.languages ?? (error instanceof ApiError ? error.languages : []),
    error: error ? error.message || UNREACHABLE : "",
    loading: request.loading,
    retry: request.retry,
  };
}
