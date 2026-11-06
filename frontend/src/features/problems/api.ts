import { ApiError, api, errorMessage } from "../../api/client";
import type { components } from "../../api/schema";

export type ProblemSummary = components["schemas"]["ProblemSummary"];
export type ProblemDetail = components["schemas"]["ProblemDetail"];

const PAGE_SIZE = 100;
const MAX_PAGES = 10_000;

function failure(error: unknown, response: Response): never {
  throw new ApiError(errorMessage(error) ?? "Unable to load problem", response.status, error);
}

export async function getProblemLanguages(slug: string, signal?: AbortSignal): Promise<string[]> {
  const { data, error, response } = await api.GET("/api/problems/{slug}/languages", { params: { path: { slug } }, signal });
  return data ?? failure(error, response);
}

export async function getProblemDetail(slug: string, language: string, signal?: AbortSignal): Promise<ProblemDetail> {
  const { data, error, response } = await api.GET("/api/problems/{slug}", { params: { path: { slug }, query: { language } }, signal });
  return data ?? failure(error, response);
}

export async function getProblemCatalog(signal?: AbortSignal): Promise<ProblemSummary[]> {
  const bySlug = new Map<string, ProblemSummary>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    const { data, error, response } = await api.GET("/api/problems", { params: { query }, signal });
    if (!data) failure(error, response);
    for (const problem of data) bySlug.set(problem.slug, problem);
    if (data.length < PAGE_SIZE) return [...bySlug.values()];
  }
  throw new Error("The catalog is too large to load. Please try again later.");
}
