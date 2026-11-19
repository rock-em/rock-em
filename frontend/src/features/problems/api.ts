import { ApiError, api, errorMessage } from "../../api/client";
import type { components } from "../../api/schema";

export type ProblemDetail = components["schemas"]["ProblemDetail"];
export type Catalog = components["schemas"]["Catalog"];

function failure(error: unknown, response: Response): never {
  throw new ApiError(errorMessage(error) ?? "Unable to load problem", response.status, error);
}

export async function getProblemLanguages(slug: string, signal?: AbortSignal): Promise<string[]> {
  const { data, error, response } = await api.GET("/api/problems/{slug}/languages", {
    params: { path: { slug } },
    signal,
  });
  return data ?? failure(error, response);
}

export async function getProblemDetail(slug: string, language: string, signal?: AbortSignal): Promise<ProblemDetail> {
  const { data, error, response } = await api.GET("/api/problems/{slug}", {
    params: { path: { slug }, query: { language } },
    signal,
  });
  return data ?? failure(error, response);
}

// One request for the whole catalog. index.html preloads the same URL, so the
// response is usually already on its way before this code runs.
export async function getProblemCatalog(signal?: AbortSignal): Promise<Catalog> {
  const { data, error, response } = await api.GET("/api/catalog", { signal });
  return data ?? failure(error, response);
}
