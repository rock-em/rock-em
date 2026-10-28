import { api } from "./api/client";
import type { components } from "./api/schema";

export type ProblemSummary = components["schemas"]["ProblemSummary"];
export type ProblemDetail = components["schemas"]["ProblemDetail"];

export class CatalogError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly languages: string[];
  constructor(message: string, status: number, code: string | undefined, languages: string[] = []) {
    super(message); this.status = status; this.code = code; this.languages = languages;
  }
}
function failure(error: components["schemas"]["Error"] | undefined, status: number): never {
  throw new CatalogError(error?.error ?? "Unable to load problem", status, error?.code, error?.languages ?? []);
}
export async function getProblemLanguages(slug: string, signal?: AbortSignal): Promise<string[]> {
  const { data, error, response } = await api.GET("/api/problems/{slug}/languages", { params: { path: { slug } }, signal });
  if (!data) return failure(error, response.status);
  return data;
}
export async function getProblemDetail(slug: string, language: string, signal?: AbortSignal): Promise<ProblemDetail> {
  const { data, error, response } = await api.GET("/api/problems/{slug}", { params: { path: { slug }, query: { language } }, signal });
  if (!data) return failure(error, response.status);
  return data;
}
export function chooseProblemLanguage(languages: string[], preferred?: string | null): string | null {
  if (preferred && languages.includes(preferred)) return preferred;
  return languages.includes("python") ? "python" : null;
}

export async function getProblemCatalog(signal?: AbortSignal): Promise<ProblemSummary[]> {
  const problems: ProblemSummary[] = [];
  const limit = 100;
  for (let offset = 0; offset <= 1000000; offset += limit) {
    const { data, error, response } = await api.GET('/api/problems', { params: { query: { limit, offset } }, signal });
    if (!data) return failure(error, response.status);
    problems.push(...data);
    if (data.length < limit) return [...new Map(problems.map(problem => [problem.slug, problem])).values()];
  }
  throw new Error('The catalog is too large to load. Please try again later.');
}
