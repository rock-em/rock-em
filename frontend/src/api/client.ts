import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Operation paths, parameters, request bodies and responses come from OpenAPI.
// Credentials remain in same-origin HttpOnly cookies, never localStorage.
export function createApiClient(baseUrl = globalThis.location?.origin ?? "http://localhost") {
  return createClient<paths>({ baseUrl, credentials: "same-origin", fetch: request => globalThis.fetch(request) });
}
export const api = createApiClient();
