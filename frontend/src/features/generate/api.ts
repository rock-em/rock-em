import { ApiError, api, errorMessage } from "../../api/client";
import type { components } from "../../api/schema";

export type GenerateRequest = components["schemas"]["GenerateInput"];
export type Level = NonNullable<GenerateRequest["level"]>;
export type GeneratedProblem = components["schemas"]["GeneratedProblem"];

export async function generateProblem(request: GenerateRequest): Promise<GeneratedProblem> {
  const { data, error, response } = await api.POST("/api/problems/generate", { body: request });
  if (response.status === 401) throw new ApiError("Sign in above to generate a practice problem.", 401);
  if (data) return data;
  throw new ApiError(errorMessage(error) ?? `Request failed with status ${response.status}`, response.status, error);
}
