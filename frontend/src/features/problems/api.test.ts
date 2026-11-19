import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { getProblemCatalog, getProblemDetail, getProblemLanguages } from "./api";

afterEach(() => vi.unstubAllGlobals());
const languages = ["python", "julia"];

describe("problem language discovery", () => {
  it("propagates cancellation and encodes language query values", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(languages)));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await getProblemLanguages("two-sum", controller.signal);
    expect(new URL(fetch.mock.calls[0][0].url).pathname).toBe("/api/problems/two-sum/languages");
    fetch.mockResolvedValueOnce(new Response("{}"));
    await getProblemDetail("two-sum", "c++", controller.signal);
    expect(new URL(fetch.mock.calls[1][0].url).searchParams.get("language")).toBe("c++");
    controller.abort();
    expect(fetch.mock.calls[1][0].signal.aborted).toBe(true);
  });

  it("preserves structured recovery choices when a language becomes unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unavailable", code: "language_not_available", languages }), {
          status: 404,
        }),
      ),
    );
    try {
      await getProblemDetail("two-sum", "ruby");
      expect.fail("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("language_not_available");
      expect((error as ApiError).languages).toEqual(languages);
    }
  });
});

describe("catalog", () => {
  it("loads every problem in one request", async () => {
    const catalog = {
      topics: [{ slug: "array", name: "Array" }],
      problems: [{ slug: "two-sum", title: "Two Sum", difficulty: "easy", topics: [0] }],
    };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(catalog)));
    vi.stubGlobal("fetch", fetch);
    expect(await getProblemCatalog()).toEqual(catalog);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(new URL(fetch.mock.calls[0][0].url).pathname).toBe("/api/catalog");
  });
});
