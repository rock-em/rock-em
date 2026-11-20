import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeToggle } from "../../app/ThemeToggle";
import { Link } from "../../lib/Link";
import { AccountMenu } from "../auth/AccountMenu";
import { usePractice } from "../practice/context";
import { useProblemDetail } from "../problems/hooks";
import { fromDetail } from "../problems/model";
import { CodePane } from "./CodePane";
import { LanguageSelect } from "./LanguageSelect";
import { DEFAULT_LAYOUT, LAYOUT_KEY, PaneArrangementContext, savedLayout, swapPanes, type PaneId } from "./layout";
import { ProblemStatement } from "./ProblemStatement";
import { Splitter } from "./Splitter";
import { TestPane } from "./TestPane";
import { useSolution } from "./useSolution";
import "./workspace.css";

function WorkspaceBar({ children }: { children?: ReactNode }) {
  const { problems, solved } = usePractice();
  return (
    <header className="workspace-bar">
      <Link className="back-link" href="/">
        ← Problems
      </Link>
      <div className="workspace-actions">{children}</div>
      <div className="workspace-bar-end">
        {problems.length > 0 && (
          <span className="workspace-counter">
            {solved.size.toLocaleString()} / {problems.length.toLocaleString()} solved
          </span>
        )}
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}

export function WorkspacePage({ slug }: { slug: string }) {
  const { generated, languages, setLanguage, solved } = usePractice();
  const generatedProblem = generated.find((problem) => problem.id === slug);
  const detail = useProblemDetail(generatedProblem ? null : slug, languages[slug]);
  const problem = generatedProblem ?? (detail.data ? fromDetail(detail.data) : undefined);
  const solution = useSolution(problem);
  const [layout, setLayout] = useState(savedLayout);
  const [dragging, setDragging] = useState<PaneId | null>(null);
  const arrangement = useMemo(
    () => ({
      order: layout.order,
      dragging,
      setDragging,
      swap: (a: PaneId, b: PaneId) => setLayout((current) => ({ ...current, order: swapPanes(current.order, a, b) })),
    }),
    [layout.order, dragging],
  );
  const chooseLanguage = (language: string) => setLanguage(slug, language);

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch {
      // Without storage the sizes still apply until the page is closed.
    }
  }, [layout]);

  if (!problem) {
    return (
      <div className="workspace-page">
        <WorkspaceBar />
        <main className="page utility-page">
          <h1>{detail.loading ? "Loading problem…" : "Problem unavailable"}</h1>
          {detail.loading ? (
            <p role="status">Loading languages and problem details.</p>
          ) : (
            <>
              <p role="alert">{detail.error || "No language variants are available for this problem."}</p>
              {detail.languages.length > 0 && (
                <LanguageSelect languages={detail.languages} value={null} onChange={chooseLanguage} />
              )}
              <button className="run-button" onClick={detail.retry}>
                Try again
              </button>
            </>
          )}
        </main>
      </div>
    );
  }

  const blocked = solution.running || !solution.runnable;
  // Tracks in fr rather than percentages, so the splitters' own width is left out.
  const sizes = {
    gridTemplateColumns: `minmax(0, ${layout.x}fr) 5px minmax(0, ${100 - layout.x}fr)`,
    gridTemplateRows: `minmax(0, ${layout.y}fr) 5px minmax(0, ${100 - layout.y}fr)`,
  };
  return (
    <div className="workspace-page">
      <WorkspaceBar>
        <button className="run-button" disabled={blocked} onClick={() => void solution.check(false)}>
          {solution.running ? "Running…" : "Run tests"}
        </button>
        <button className="submit-button" disabled={blocked} onClick={() => void solution.check(true)}>
          Submit →
        </button>
      </WorkspaceBar>
      <main className="workspace-panes" style={sizes}>
        <PaneArrangementContext.Provider value={arrangement}>
          <ProblemStatement problem={problem} solved={solved.has(problem.id)} />
          <CodePane
            problem={problem}
            editorKey={solution.key}
            code={solution.code}
            languages={generatedProblem ? ["javascript"] : detail.languages}
            onEdit={solution.edit}
            onLanguageChange={chooseLanguage}
          />
          <TestPane problem={problem} run={solution.run} running={solution.running} />
        </PaneArrangementContext.Provider>
        <Splitter
          axis="x"
          label="Resize left and right panes"
          value={layout.x}
          onChange={(x) => setLayout((current) => ({ ...current, x }))}
          onReset={() => setLayout((current) => ({ ...current, x: DEFAULT_LAYOUT.x }))}
        />
        <Splitter
          axis="y"
          label="Resize top and bottom panes"
          value={layout.y}
          onChange={(y) => setLayout((current) => ({ ...current, y }))}
          onReset={() => setLayout((current) => ({ ...current, y: DEFAULT_LAYOUT.y }))}
        />
      </main>
    </div>
  );
}
