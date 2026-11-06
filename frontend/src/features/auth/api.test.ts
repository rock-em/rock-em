import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../test/http";
import { getSession, requestPasswordReset, signIn } from "./api";

const html = () =>
  new Response("<!doctype html><title>rock em</title>", { status: 200, headers: { "Content-Type": "text/html" } });

afterEach(() => vi.unstubAllGlobals());

describe("auth api", () => {
  it("treats an HTML fallback page as the account service being unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html()));
    await expect(signIn({ email: "sam@example.com", password: "test-password" })).rejects.toThrow(
      "Account access is not available yet",
    );
  });

  it("does not report a reset email as sent when the response is not the API's", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 202, headers: { "Content-Type": "text/html" } })),
    );
    await expect(requestPasswordReset("sam@example.com")).rejects.toThrow("Password reset is currently unavailable");
  });

  it("returns null for a guest session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "unauthorized" }, 401)));
    await expect(getSession()).resolves.toBeNull();
  });
});
