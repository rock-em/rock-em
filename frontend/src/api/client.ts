import createClient from "openapi-fetch";
import type { paths } from "./schema";

export function createApiClient(baseUrl = globalThis.location?.origin ?? "http://localhost") {
  return createClient<paths>({ baseUrl, credentials: "same-origin", fetch: (request) => globalThis.fetch(request) });
}

export const api = createApiClient();

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly languages: string[];

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.code = field(body, "code");
    const languages = isObject(body) ? body.languages : undefined;
    this.languages = Array.isArray(languages) ? languages.filter((item) => typeof item === "string") : [];
  }
}

export function errorMessage(body: unknown): string | undefined {
  return field(body, "error");
}

export function isJson(response: Response) {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function field(body: unknown, key: string): string | undefined {
  const value = isObject(body) ? body[key] : undefined;
  return typeof value === "string" ? value : undefined;
}
