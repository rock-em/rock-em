import type { Mock } from "vitest";

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function sentRequest(fetch: Mock, call = 0) {
  const request = fetch.mock.calls[call][0] as Request;
  const text = await request.clone().text();
  return {
    method: request.method,
    path: new URL(request.url).pathname,
    credentials: request.credentials,
    body: text ? JSON.parse(text) : undefined,
  };
}
