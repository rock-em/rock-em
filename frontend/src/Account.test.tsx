import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Account from "./Account";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("Account", () => {
  it("signs in with JSON and signs out without persisting tokens", async () => {
    const fetch = vi.fn()
      .mockImplementationOnce(() => response(401, { error: "sign in required" }))
      .mockImplementationOnce(() => response(200, { id: 1, displayName: "Oliver", role: "admin" }))
      .mockImplementationOnce(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal("fetch", fetch);
    render(<Account />);
    await screen.findByText("Sign in or create an account");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-secure-password" } });
    fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
    await screen.findByText(/Signed in as Oliver/);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ email: "admin@example.com", password: "a-secure-password" });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByText("Sign in or create an account");
    expect(fetch.mock.calls[2][0]).toBe("/api/auth/logout");
  });

  it("shows registration errors without claiming a session", async () => {
    const fetch = vi.fn()
      .mockImplementationOnce(() => response(401, {}))
      .mockImplementationOnce(() => response(409, { error: "Account already exists" }));
    vi.stubGlobal("fetch", fetch);
    render(<Account />);
    await screen.findByText("Sign in or create an account");
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Oliver" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-secure-password" } });
    fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Account already exists");
    await waitFor(() => expect(screen.queryByText(/Signed in as/)).not.toBeInTheDocument());
    expect(fetch.mock.calls[1][0]).toBe("/api/auth/register");
  });
});
