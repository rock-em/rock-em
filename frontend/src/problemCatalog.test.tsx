import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProblemLanguageSelect from "./ProblemLanguageSelect";
import { CatalogError, getProblemCatalog, chooseProblemLanguage, getProblemDetail, getProblemLanguages } from "./problemCatalog";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const languages = ["python", "julia"];

describe("problem language discovery", () => {
  it("uses an available preference or advertised default without guessing", () => {
    expect(chooseProblemLanguage(languages, "julia")).toBe("julia");
    expect(chooseProblemLanguage(languages, "ruby")).toBe("python");
    expect(chooseProblemLanguage(["julia"], "ruby")).toBeNull();
    expect(chooseProblemLanguage([], "python")).toBeNull();
  });

  it("renders only the problem's available languages and preserves controlled selection", () => {
    const onChange = vi.fn();
    render(<ProblemLanguageSelect languages={languages} value="python" onChange={onChange} />);
    expect(screen.queryByRole("option", { name: "JavaScript" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Language")).toHaveValue("python");
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "julia" } });
    expect(onChange).toHaveBeenCalledWith("julia");
  });

  it("clears an unavailable selection and disables an empty picker", () => {
    render(<ProblemLanguageSelect languages={[]} value="python" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Language")).toBeDisabled();
    expect(screen.getByLabelText("Language")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("No languages");
  });

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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Unavailable", code: "language_not_available", languages }), { status: 404 })));
    try { await getProblemDetail("two-sum", "ruby"); expect.fail("expected rejection"); }
    catch (error) {
      expect(error).toBeInstanceOf(CatalogError);
      expect((error as CatalogError).code).toBe("language_not_available");
      expect((error as CatalogError).languages).toEqual(languages);
    }
  });
});


describe("catalog pagination", () => {
  it("loads every page of summaries without fetching problem details", async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({ slug: `task-${index}`, title: `Task ${index}`, category: 'API topic', difficulty: 'easy', shortDescription: 'Summary' }));
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(first))).mockResolvedValueOnce(new Response(JSON.stringify([{ ...first[0], slug: 'last-task' }])));
    vi.stubGlobal('fetch', fetch);
    const problems = await getProblemCatalog();
    expect(problems).toHaveLength(101);
    expect(problems.at(-1)?.slug).toBe('last-task');
    expect(new URL(fetch.mock.calls[1][0].url).searchParams.get('offset')).toBe('100');
    expect(new URL(fetch.mock.calls[0][0].url).pathname).toBe('/api/problems');
  });
});
