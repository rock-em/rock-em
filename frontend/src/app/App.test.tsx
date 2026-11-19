import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

vi.mock("../features/problems/ChromeSculpture", () => ({
  ChromeSculpture: ({ topic, label = topic }: { topic: string; label?: string }) => (
    <div aria-label={`Sculpture for ${topic}`}>{label}</div>
  ),
}));
vi.mock("../features/workspace/CodeEditor", () => ({
  CodeEditor: ({
    label,
    value,
    onChange,
    readOnly,
  }: {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
  }) => (
    <textarea
      aria-label={label}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));
const details = [
  {
    slug: "array-api-task",
    title: "Array API Task",
    category: "Arrays",
    topics: ["Arrays", "Hashing"],
    difficulty: "easy",
  },
  { slug: "stack-api-task", title: "Stack API Task", category: "Stack", topics: ["Stack"], difficulty: "medium" },
  {
    slug: "graph-api-task",
    title: "Graph API Task",
    category: "Graphs",
    topics: ["Graphs", "Hashing"],
    difficulty: "hard",
  },
].map((problem) => ({ ...problem, shortDescription: "From the server" }));
const topicNames = ["Arrays", "Hashing", "Stack", "Graphs"];
const catalog = {
  topics: topicNames.map((name) => ({ slug: name.toLowerCase(), name })),
  problems: details.map(({ slug, title, difficulty, topics }) => ({
    slug,
    title,
    difficulty,
    topics: topics.map((name) => topicNames.indexOf(name)),
  })),
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const detailFor = (slug: string, language: string) => ({
  ...(details.find((problem) => problem.slug === slug) ?? details[0]),
  language,
  description: "The statement supplied by the API.",
  constraints: ["value is an integer"],
  signature: { function: "solve", params: [{ name: "value", type: "int" }], returns: "int" },
  compare: "exact",
  examples: [{ args: [1], expected: 1 }],
  tests: [{ args: [1], expected: 1 }],
  functionName: "solve",
  indentUnit: language === "javascript" ? "  " : "    ",
  starter: language === "javascript" ? "function solve(value) {}" : "def solve(value):\n    pass",
});
function handler(request: RequestInfo | URL) {
  const url = new URL(
    typeof request === "string" ? request : request instanceof URL ? request.href : request.url,
    "http://localhost",
  );
  if (url.pathname === "/api/auth/me") return Promise.resolve(json({}, 401));
  if (url.pathname === "/api/catalog") return Promise.resolve(json(catalog));
  if (url.pathname.endsWith("/languages")) return Promise.resolve(json(["python", "javascript"]));
  if (url.pathname.startsWith("/api/problems/")) {
    const slug = url.pathname.split("/").at(-1)!;
    return Promise.resolve(json(detailFor(slug, url.searchParams.get("language")!)));
  }
  return Promise.resolve(json({}, 404));
}
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", vi.fn(handler));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function explore(name: string) {
  fireEvent.click(screen.getByText("Explore", { selector: "summary" }));
  fireEvent.click(screen.getByRole("link", { name }));
}

describe("API-backed pages", () => {
  it("lists API problems with every topic and no demo fallback or fake completions", async () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Loading problems…" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Array API Task" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "rock em" })).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(/^3 problems$/);
    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your Practice Dashboard" })).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Sculpture for All problems")).toHaveTextContent("0 / 3 solved");
  });

  it("filters by a secondary topic and difficulty, sorts, and keeps the filters in the URL", async () => {
    render(<App />);
    await screen.findByRole("link", { name: "Array API Task" });
    const titles = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("a")?.textContent);

    fireEvent.click(screen.getByRole("button", { name: /^Hashing/ }));
    expect(titles()).toEqual(["Array API Task", "Graph API Task"]);
    expect(window.location.search).toBe("?topic=Hashing");

    fireEvent.click(screen.getByRole("button", { name: "Hard" }));
    expect(titles()).toEqual(["Graph API Task"]);
    expect(new URLSearchParams(window.location.search).get("difficulty")).toBe("hard");

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by difficulty" }));
    fireEvent.click(screen.getByRole("button", { name: "Sort by difficulty" }));
    expect(titles()).toEqual(["Graph API Task", "Stack API Task", "Array API Task"]);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search problems" }), { target: { value: "nothing" } });
    expect(screen.getByText("No problems match these filters.")).toBeVisible();
  });

  it("opens with the filters from a shared URL", async () => {
    window.history.replaceState(null, "", "/?topic=Stack");
    render(<App />);
    expect(await screen.findByRole("link", { name: "Stack API Task" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Array API Task" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Stack/ })).toHaveAttribute("aria-pressed", "true");
  });

  it.each([
    ["/learn", "Learning paths"],
    ["/progress", "Practice review"],
    ["/generate", "Generate a problem"],
    ["/about", "About rock em"],
  ])("opens %s directly", async (path, heading) => {
    window.history.replaceState(null, "", path);
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeVisible();
    expect(screen.queryByLabelText(/^Sculpture for/)).not.toBeInTheDocument();
  });

  it("loads details by slug and preserves independent language drafts across navigation", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("link", { name: "Array API Task" }));
    expect(window.location.pathname).toBe("/problems/array-api-task");
    const python = await screen.findByRole("textbox", { name: "python solution" });
    expect(python).toHaveValue("def solve(value):\n    pass");
    expect(screen.getByRole("button", { name: "Run tests" })).toBeDisabled();
    fireEvent.change(python, { target: { value: "python draft" } });
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "javascript" } });
    fireEvent.change(await screen.findByRole("textbox", { name: "javascript solution" }), {
      target: { value: "javascript draft" },
    });
    expect(screen.getByRole("button", { name: "Run tests" })).toBeEnabled();
    explore("Generate a problem");
    expect(window.location.pathname).toBe("/generate");
    act(() => {
      window.history.replaceState(null, "", "/problems/array-api-task");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByRole("textbox", { name: "javascript solution" })).toHaveValue("javascript draft");
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "python" } });
    expect(await screen.findByRole("textbox", { name: "python solution" })).toHaveValue("python draft");
    fireEvent.click(screen.getByRole("link", { name: "rock em" }));
    expect(await screen.findByRole("link", { name: "Array API Task" })).toBeVisible();
  });

  it("loads a direct problem URL even if the catalog is unavailable", async () => {
    window.history.replaceState(null, "", "/problems/graph-api-task");
    vi.mocked(fetch).mockImplementation((request) =>
      new URL(typeof request === "string" ? request : (request as Request).url, "http://localhost").pathname ===
      "/api/catalog"
        ? Promise.resolve(json({}, 500))
        : handler(request as Request),
    );
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Graph API Task" })).toBeVisible();
    expect(screen.getByText("The statement supplied by the API.")).toBeVisible();
  });

  it("shows failures and retries without substituting hardcoded problems", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ error: "Catalog offline" }, 503)));
    render(<App />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Catalog offline");
    expect(screen.queryByText("Two Sum")).not.toBeInTheDocument();
    vi.mocked(fetch).mockImplementation(handler);
    fireEvent.click(screen.getByRole("button", { name: "Reload problems" }));
    expect(await screen.findByRole("link", { name: "Array API Task" })).toBeVisible();
  });

  it("handles an empty catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ topics: [], problems: [] })));
    render(<App />);
    expect(await screen.findByRole("heading", { name: "No problems yet" })).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("links learning paths, the filtered list and the review page together", async () => {
    render(<App />);
    await screen.findByRole("link", { name: "Array API Task" });
    explore("Learning paths");
    // Hashing is never a primary topic, yet it has a path with both of its problems.
    fireEvent.click(screen.getByRole("link", { name: "Hashing" }));
    expect(window.location.search).toBe("?topic=Hashing");
    expect(screen.getByRole("heading", { level: 1, name: "Hashing" })).toBeVisible();
    expect(screen.getByText("0/2 problems solved")).toBeVisible();
    expect(screen.getByRole("link", { name: "Graph API Task" })).toBeVisible();

    act(() => {
      window.history.replaceState(null, "", "/sign-in");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.getByRole("heading", { name: "Welcome back." })).toBeVisible();

    explore("Practice review");
    expect(screen.getByRole("status")).toHaveTextContent("Nothing to review yet.");
    fireEvent.click(screen.getByRole("link", { name: "Hard" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Graph API Task" })).toBeVisible());
    expect(screen.queryByRole("link", { name: "Array API Task" })).not.toBeInTheDocument();
  });

  it("starts dark and remembers a switch to light", async () => {
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Light mode" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("rock-em:theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeVisible();
  });
});
