import { vi, type Mock } from "vitest";

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

type Handler = (request: Request) => Response | Promise<Response>;

export function routedFetch(routes: Record<string, Handler>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), "http://localhost"));
    const path = new URL(request.url).pathname;
    const handler = routes[`${request.method} ${path}`] ?? routes[path];
    return handler ? handler(request) : jsonResponse({ error: "not found" }, 404);
  });
}
