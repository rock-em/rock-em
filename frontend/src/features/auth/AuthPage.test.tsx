import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../app/App";
import { jsonResponse, routedFetch, sentRequest } from "../../test/http";

vi.mock("../problems/ChromeSculpture", () => ({ ChromeSculpture: () => null }));

const user = { id: 1, displayName: "Sam Rivers", role: "admin", email: "sam@example.com" };
const guest = {
  "/api/auth/me": () => jsonResponse({ error: "unauthorized" }, 401),
  "/api/problems": () => jsonResponse([]),
};

function open(path: string, routes: Parameters<typeof routedFetch>[0] = {}) {
  window.history.replaceState(null, "", path);
  const fetch = routedFetch({ ...guest, ...routes });
  vi.stubGlobal("fetch", fetch);
  render(<App />);
  return fetch;
}

async function fillAndSubmit(fields: Record<string, string>, button: string) {
  await waitFor(() => expect(screen.getByRole("button", { name: button })).toBeEnabled());
  for (const [label, value] of Object.entries(fields))
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: button }));
}

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("AuthPage", () => {
  it("opens from the header and returns to problems", async () => {
    open("/");
    fireEvent.click(await screen.findByRole("link", { name: "Sign up" }));
    expect(window.location.pathname).toBe("/sign-up");
    expect(screen.getByLabelText("Name")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: /Back to problems/ }));
    expect(window.location.pathname).toBe("/");
    expect(await screen.findByRole("heading", { name: "No problems yet" })).toBeVisible();
  });

  it("signs in, shows the returned profile, and signs out", async () => {
    const fetch = open("/sign-in", {
      "/api/auth/login": () => jsonResponse(user),
      "/api/auth/logout": () => new Response(null, { status: 204 }),
    });
    await fillAndSubmit({ Email: user.email, Password: "test-password" }, "Sign in →");
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    fireEvent.click(screen.getByText(user.displayName, { selector: ".profile-name" }));
    expect(screen.getByText(user.email)).toBeVisible();
    const login = fetch.mock.calls.findIndex(
      ([request]) => new URL((request as Request).url).pathname === "/api/auth/login",
    );
    expect(await sentRequest(fetch, login)).toMatchObject({
      method: "POST",
      credentials: "include",
      body: { email: user.email, password: "test-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeVisible();
  });

  it("shows an honest error when account services are unavailable", async () => {
    open("/sign-up");
    await fillAndSubmit({ Name: user.displayName, Email: user.email, Password: "test-password" }, "Create account →");
    expect(await screen.findByRole("alert")).toHaveTextContent("Account access is not available yet");
    expect(window.location.pathname).toBe("/sign-up");
  });

  it.each([201, 409])("uses the registration contract for status %s", async (status) => {
    const fetch = open("/sign-up", {
      "/api/auth/register": () => jsonResponse(status === 201 ? user : { error: "exists" }, status),
    });
    await fillAndSubmit(
      { Name: user.displayName, Email: user.email, Password: "a-secure-password" },
      "Create account →",
    );
    await waitFor(() =>
      expect(fetch.mock.calls.some(([request]) => (request as Request).url.endsWith("/api/auth/register"))).toBe(true),
    );
    const register = fetch.mock.calls.findIndex(([request]) => (request as Request).url.endsWith("/api/auth/register"));
    expect(await sentRequest(fetch, register)).toMatchObject({
      body: { email: user.email, password: "a-secure-password", displayName: user.displayName },
    });
    if (status === 201) {
      await waitFor(() => expect(window.location.pathname).toBe("/"));
      fireEvent.click(screen.getByText(user.displayName, { selector: ".profile-name" }));
      expect(screen.getByText("Admin")).toBeVisible();
    } else {
      expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
      expect(window.location.pathname).toBe("/sign-up");
    }
  });
});
