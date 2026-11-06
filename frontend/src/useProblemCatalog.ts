import { useRequest } from "./lib/useRequest";
import { CatalogError, chooseProblemLanguage, getProblemCatalog, getProblemDetail, getProblemLanguages } from "./problemCatalog";

const unreachable = "Unable to reach the problem service.";

export function useProblemCatalog() {
  const request = useRequest("catalog", getProblemCatalog);
  return {
    data: request.data ?? [],
    loading: request.loading,
    error: request.error ? request.error.message || unreachable : "",
    retry: request.retry,
  };
}

export function useProblemDetail(slug: string | null, preferred?: string) {
  const request = useRequest(slug === null ? null : JSON.stringify([slug, preferred]), async (signal) => {
    const languages = await getProblemLanguages(slug!, signal);
    const language = chooseProblemLanguage(languages, preferred) ?? languages[0];
    return { languages, detail: language ? await getProblemDetail(slug!, language, signal) : null };
  });
  const error = request.error;
  return {
    data: request.data?.detail ?? null,
    languages: request.data?.languages ?? (error instanceof CatalogError ? error.languages : []),
    error: error ? error.message || unreachable : "",
    loading: request.loading,
    retry: request.retry,
  };
}
