import { Link } from "../../lib/Link";
import { usePractice } from "../practice/context";
import { useProblemDetail } from "../problems/hooks";
import { fromDetail } from "../problems/model";
import { LanguageSelect } from "./LanguageSelect";
import { ProblemStatement } from "./ProblemStatement";
import { SolutionPanel } from "./SolutionPanel";
import "./workspace.css";

export function WorkspacePage({ slug }: { slug: string }) {
  const { generated, languages, setLanguage, problems, solved } = usePractice();
  const generatedProblem = generated.find((problem) => problem.id === slug);
  const detail = useProblemDetail(generatedProblem ? null : slug, languages[slug]);
  const problem = generatedProblem ?? (detail.data ? fromDetail(detail.data) : undefined);
  const chooseLanguage = (language: string) => setLanguage(slug, language);

  if (!problem) {
    return (
      <main className="page utility-page">
        <Link href="/">← Back to problems</Link>
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
    );
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <Link className="back-link" href="/">
          ← Back to problems
        </Link>
        <span className="workspace-counter">
          {solved.length} / {problems.length} solved
        </span>
      </header>
      <div className="workspace-grid">
        <ProblemStatement problem={problem} solved={solved.includes(problem.id)} />
        <SolutionPanel
          problem={problem}
          languages={generatedProblem ? ["javascript"] : detail.languages}
          onLanguageChange={chooseLanguage}
        />
      </div>
    </main>
  );
}
