import { PageLink } from './PageLink';
import { useState, type FormEvent } from "react";
import Account from "./Account";
import { navigateTo, usePathname } from "./navigation";
import { useProblemCatalog, useProblemDetail } from "./useProblemCatalog";
import ProblemLanguageSelect from "./ProblemLanguageSelect";
import ChromeSculpture from "./ChromeSculpture";
import { generateProblem, type GeneratedProblem, type Level } from "./generateProblem";
import TopicLearningPath from "./TopicLearningPath";
import AdaptivePractice from "./AdaptivePractice";
import { recordPracticeAttempt } from "./practiceProgress";
import "./index.css";


type Difficulty = "Easy" | "Medium" | "Hard";
type TestCase = { input: unknown[]; expected: unknown };
type Problem = {
  id: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  language: string;
  requirements: string[];
  indexBase: number;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  functionName: string;
  starter: string;
  tests: TestCase[];
  referenceSolution?: string;
  generated?: boolean;
};

type TestResult = { passed: boolean; input: unknown[]; expected: unknown; actual?: unknown; error?: string };

function format(value: unknown): string {
  if (value === undefined) return "undefined";
  try { return JSON.stringify(value); } catch { return String(value); }
}

// A sandboxed iframe isolates evaluated code from the application's page.
// This is a lightweight demo runner, not a production-grade secure judge.
function runTests(problem: Problem, code: string): Promise<TestResult[]> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("sandbox", "allow-scripts");
    document.body.appendChild(iframe);
    const token = Math.random().toString(36).slice(2) + Date.now();
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", receive);
      window.clearTimeout(timer);
      iframe.remove();
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || !event.data || event.data.token !== token) return;
      const results = event.data.results as TestResult[];
      cleanup();
      resolve(results);
    };
    window.addEventListener("message", receive);
    const timer = window.setTimeout(() => {
      cleanup();
      resolve([{ passed: false, input: [], expected: "Completed within 3 seconds", error: "Execution timed out. Check for an infinite loop." }]);
    }, 3000);

    const payload = JSON.stringify({ code, functionName: problem.functionName, tests: problem.tests, token });
    const safePayload = payload.replace(/</g, "\\u003c");
    iframe.srcdoc = `<!doctype html><html><body><script>
      const payload = ${safePayload};
      const results = [];
      try {
        const solution = new Function(payload.code + '\\nreturn ' + payload.functionName + ';')();
        if (typeof solution !== 'function') throw new Error('Define a function named ' + payload.functionName);
        for (const test of payload.tests) {
          const input = JSON.parse(JSON.stringify(test.input));
          try {
            const actual = solution(...input);
            const passed = JSON.stringify(actual) === JSON.stringify(test.expected);
            results.push({ passed, input: test.input, expected: test.expected, actual });
          } catch (error) {
            results.push({ passed: false, input: test.input, expected: test.expected, error: String(error) });
          }
        }
      } catch (error) {
        results.push({ passed: false, input: [], expected: 'Valid JavaScript solution', error: String(error) });
      }
      parent.postMessage({ token: payload.token, results }, '*');
    </script></body></html>`;
  });
}

const MIN_VERIFIED_TESTS = 3;

// Generated test cases can contain mistakes, so keep only the ones the
// generated reference solution actually passes.
async function verifyGeneratedProblem(generated: GeneratedProblem, id: string): Promise<Problem> {
  const candidate: Problem = { ...generated, id, language: "javascript", requirements: [], indexBase: 0, generated: true };
  const results = await runTests(candidate, generated.referenceSolution);
  const tests = candidate.tests.filter((_, index) => results[index]?.passed);
  if (tests.length < MIN_VERIFIED_TESTS) {
    throw new Error("The generated test cases did not check out. Please try again.");
  }
  return { ...candidate, tests };
}

function Practice() {
  const path = usePathname();
  const [generated, setGenerated] = useState<Problem[]>([]);
  const catalog = useProblemCatalog();
  const difficultyLabels = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;
  const problems = [...catalog.data.map(problem => ({
    id: problem.slug, title: problem.title, topic: problem.category,
    difficulty: difficultyLabels[problem.difficulty],
  })), ...generated];
  const topics = [...new Set(problems.map((problem) => problem.topic))];
  const [topicIndex, setTopicIndex] = useState(0);
  const [search, setSearch] = useState("");
  const problemMatch = path.match(/^\/problems\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  const selectedId = problemMatch ? problemMatch[1] : null;
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState<string[]>([]);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genTheme, setGenTheme] = useState("");
  const [genLevel, setGenLevel] = useState<Level>("intermediate");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const currentTopic = topics[topicIndex] ?? topics[0] ?? "";
  const generatedProblem = generated.find(problem => problem.id === selectedId);
  const [languagePreferences, setLanguagePreferences] = useState<Record<string, string>>({});
  const detail = useProblemDetail(generatedProblem ? null : selectedId, selectedId ? languagePreferences[selectedId] : undefined);
  const selected: Problem | undefined = generatedProblem ?? (detail.data ? {
    ...detail.data, id: detail.data.slug, topic: detail.data.category,
    difficulty: difficultyLabels[detail.data.difficulty],
  } : undefined);
  const draftKey = selected ? `${selected.id}:${selected.language}` : '';
  const [resultKey, setResultKey] = useState('');
  const visibleResults = resultKey === draftKey ? results : null;
  const visibleMessage = resultKey === draftKey ? message : '';
  const topicProblems = problems.filter((problem) =>
    problem.topic === currentTopic &&
    (problem.title.toLowerCase().includes(search.toLowerCase()) ||
      problem.difficulty.toLowerCase().includes(search.toLowerCase()))
  );
  const solvedCount = problems.filter((p) => p.topic === currentTopic && completed.includes(p.id)).length;
  const totalTopicProblems = problems.filter((p) => p.topic === currentTopic).length;

  function nextTopic() { setTopicIndex((prev) => (prev + 1) % topics.length); setSearch(""); }
  function previousTopic() { setTopicIndex((prev) => (prev + topics.length - 1) % topics.length); setSearch(""); }
  function openProblem(id: string) { setResults(null); setMessage(""); navigateTo(`/problems/${id}`); }
  function goBack() { setResults(null); setMessage(""); navigateTo("/"); }

  async function createProblem(event: FormEvent) {
    event.preventDefault();
    if (generating || !genTopic.trim()) return;
    setGenerating(true);
    setGenError("");
    try {
      const raw = await generateProblem({ topic: genTopic.trim(), theme: genTheme.trim(), level: genLevel });
      const id = `generated-${crypto.randomUUID()}`;
      const problem = await verifyGeneratedProblem(raw, id);
      const existingTopic = topics.indexOf(problem.topic);
      setGenerated((previous) => [...previous, problem]);
      setTopicIndex(existingTopic === -1 ? topics.length : existingTopic);
      setSearch("");
      openProblem(id);
    } catch (error) {
      setGenError(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  async function checkSolution(submit: boolean) {
    if (!selected || selected.language !== "javascript" || running || !selected.tests.length) return;
    setResultKey(draftKey);
    setRunning(true);
    setResults(null);
    setMessage("");
    try {
      const testResults = await runTests(selected, solutions[draftKey] ?? selected.starter);
      setResults(testResults);
      const passed = testResults.length === selected.tests.length &&
  testResults.every((test) => test.passed);

//Track performance when the user clicks Submit
if (submit && testResults.length > 0) {
  recordPracticeAttempt(selected.id, passed);
}

if (submit && passed) {
        setCompleted((previous) => previous.includes(selected.id) ? previous : [...previous, selected.id]);
        setMessage("All sample tests passed. Marked as solved for this session.");
      } else if (submit) {
        setMessage("Not quite yet. Review the failed tests and try again.");
      } else {
        setMessage(passed ? "All sample tests passed! Ready to submit." : "Some tests failed. Check the results below.");
      }
    } finally {
      setRunning(false);
    }
  }

  if (problemMatch && !selected) {
    return <main className="page utility-page">
      <PageLink href="/">← Back to problems</PageLink>
      <h1>{detail.loading ? 'Loading problem…' : 'Problem unavailable'}</h1>
      {detail.loading ? <p role="status">Loading languages and problem details.</p> : <>
        <p role="alert">{detail.error || 'No language variants are available for this problem.'}</p>
        {detail.languages.length > 0 && <ProblemLanguageSelect languages={detail.languages} value={null} onChange={(language) => setLanguagePreferences(old => ({ ...old, [selectedId!]: language }))} />}
        <button className="run-button" onClick={detail.retry}>Try again</button>
      </>}
    </main>;
  }

  if (selected) {
    return (
      <main className="workspace-page">
        <header className="workspace-header">
          <button className="back-link" onClick={goBack}>← Back to problems</button>
          <span className="workspace-counter">{completed.length} / {problems.length} solved</span>
        </header>

        <div className="workspace-grid">
          <section className="workspace-panel description-panel">
            <div className="workspace-eyebrow">{selected.topic}{selected.generated && " · Generated"}</div>
            <h1>{selected.title}</h1>
            <span className="problem-difficulty">{selected.difficulty}</span>
            {completed.includes(selected.id) && <span className="solved-label">✓ Solved</span>}
            <p className="problem-description">{selected.description}</p>
            <h2>Examples</h2>
            {selected.examples.map((example, index) => (
              <div className="example" key={index}>
                <strong>Example {index + 1}</strong>
                <div><b>Input:</b> <code>{example.input}</code></div>
                <div><b>Output:</b> <code>{example.output}</code></div>
                {example.explanation && <div><b>Explanation:</b> {example.explanation}</div>}
              </div>
            ))}
            {selected.requirements.length > 0 && <><h2>Requirements</h2><ul className="constraints">{selected.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}</ul></>}
            <h2>Constraints</h2>
            <ul className="constraints">{selected.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
            {selected.referenceSolution && (
              <details className="reference-solution">
                <summary>Reference solution</summary>
                <pre><code>{selected.referenceSolution}</code></pre>
              </details>
            )}
          </section>

          <section className="workspace-panel editor-panel">
            <div className="editor-heading">
              <div><strong>Your solution</strong><ProblemLanguageSelect languages={selected.generated ? ['javascript'] : detail.languages} value={selected.language} onChange={(language) => setLanguagePreferences(old => ({ ...old, [selected.id]: language }))} /></div>
              <button className="reset-button" onClick={() => { setSolutions((old) => ({ ...old, [draftKey]: selected.starter })); setResults(null); setMessage(""); }}>Reset code</button>
            </div>
            <label className="sr-only" htmlFor="solution-code">{selected.language} solution</label>
            <textarea
              id="solution-code"
              className="code-editor"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={solutions[draftKey] ?? selected.starter}
              onChange={(event) => { setSolutions((old) => ({ ...old, [draftKey]: event.target.value })); setResults(null); setMessage(""); }}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  const target = event.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const next = target.value.slice(0, start) + "  " + target.value.slice(end);
                  setSolutions((old) => ({ ...old, [draftKey]: next }));
                  requestAnimationFrame(() => { target.selectionStart = start + 2; target.selectionEnd = start + 2; });
                }
              }}
            />
            <div className="editor-actions">
              <button className="run-button" disabled={running || selected.language !== "javascript" || !selected.tests.length} onClick={() => void checkSolution(false)}>{running ? "Running…" : "Run tests"}</button>
              <button className="submit-button" disabled={running || selected.language !== "javascript" || !selected.tests.length} onClick={() => void checkSolution(true)}>Submit →</button>
            </div>
            {visibleMessage && <p className="test-message" role="status">{visibleMessage}</p>}
            {visibleResults && (
              <div className="test-results">
                <h2>Test results <span>{visibleResults.filter((result) => result.passed).length} / {visibleResults.length} passed</span></h2>
                {visibleResults.map((result, index) => (
                  <div className={`test-case ${result.passed ? "test-pass" : "test-fail"}`} key={index}>
                    <strong>{result.passed ? "✓" : "✕"} Test {index + 1}</strong>
                    <div>Input: <code>{format(result.input)}</code></div>
                    <div>Expected: <code>{format(result.expected)}</code></div>
                    {result.error ? <div>Error: <code>{result.error}</code></div> : <div>Received: <code>{format(result.actual)}</code></div>}
                  </div>
                ))}
              </div>
            )}
            <p className="runner-note">{selected.language === "javascript" ? "Local sample runner: compares JSON return values exactly. Custom data structures and alternate valid outputs need a full judge." : "You can read and edit this language. Running tests is currently available for JavaScript only."}</p>
          </section>
        </div>
      </main>
    );
  }

  if (['/', '/learn', '/progress'].includes(path) && (catalog.loading || catalog.error || problems.length === 0)) {
    return <main className="page utility-page"><h1>{catalog.loading ? 'Loading problems…' : catalog.error ? 'Couldn’t load problems' : 'No problems yet'}</h1>
      {catalog.loading ? <p role="status">Fetching the problem catalog.</p> : <>
        <p role={catalog.error ? 'alert' : 'status'}>{catalog.error || 'There are no published problems to browse yet.'}</p>
        <button className="run-button" onClick={catalog.retry}>Reload problems</button>
        <p><PageLink href="/generate">Generate a problem →</PageLink></p>
      </>}
    </main>;
  }

  if (path === '/learn') {
    return <main className="page utility-page">
      <h1>Learning paths</h1>
      <p className="account-muted">Build the concepts behind each topic, one step at a time.</p>
      <label className="topic-picker">Topic
        <select value={currentTopic} onChange={(event) => { setTopicIndex(topics.indexOf(event.target.value)); setSearch(""); }}>
          {topics.map((topic) => <option key={topic}>{topic}</option>)}
        </select>
      </label>
      <TopicLearningPath key={currentTopic} topic={currentTopic} problems={problems.filter((problem) => problem.topic === currentTopic)} completedIds={completed} onOpenProblem={openProblem} />
    </main>;
  }

  if (path === '/progress') {
    return <main className="page utility-page">
      <h1>Practice review</h1>
      <p className="account-muted">See your progress and choose what to revisit next.</p>
      <div className="summary">
        <span><strong>Problems</strong> · {problems.length}</span>
        <span><strong>Solved</strong> · {completed.length}</span>
        <span><strong>Topics</strong> · {topics.length}</span>
      </div>
      <AdaptivePractice problems={problems} onSelectProblem={(problem) => openProblem(String(problem.id))} />
    </main>;
  }

  if (path === '/generate') {
    return <main className="page utility-page">
      <section className="generator">
        <h1>Generate a problem</h1>
        <p>Pick something you want to learn and get a fresh problem with test cases, not a repeat of a classic.</p>
        <form className="generator-form" onSubmit={(event) => void createProblem(event)}>
          <label>
            Topic
            <input type="text" required maxLength={120} placeholder="e.g. sliding window, tries, dynamic programming" value={genTopic} onChange={(event) => setGenTopic(event.target.value)} />
          </label>
          <label>
            Industry or theme <span className="optional">(optional)</span>
            <input type="text" maxLength={200} placeholder="e.g. fintech payments, game dev, healthcare" value={genTheme} onChange={(event) => setGenTheme(event.target.value)} />
          </label>
          <label>
            Level
            <select value={genLevel} onChange={(event) => setGenLevel(event.target.value as Level)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <button type="submit" className="submit-button" disabled={generating || !genTopic.trim()}>{generating ? "Generating…" : "Generate problem"}</button>
        </form>
        {generating && <p className="generator-status" role="status">Writing the problem and checking its test cases. This can take a minute.</p>}
        {genError && <p className="generator-status generator-error" role="alert">{genError}</p>}
      </section>
    </main>;
  }

  if (path === '/about') {
    return <main className="page utility-page about-page">
      <h1>About rock em</h1>
      <p>A place to practice programming that is nice on the eyes :D</p>
      <p>rock em is an open source program for practicing programming problems. Browse by topic, follow a learning path, or generate something new to work on.</p>
      <PageLink href="/">Browse problems →</PageLink>
    </main>;
  }

  // Account pages keep this component mounted so drafts and generated problems
  // survive navigation, but do not run an invisible sculpture in the background.
  if (['/sign-in', '/sign-up', '/forgot-password', '/reset-password'].includes(path)) return null;
  if (path !== '/') {
    return <main className="page utility-page"><h1>{problemMatch ? 'Problem unavailable' : 'Page not found'}</h1>
      <p>{problemMatch ? 'This problem may have been generated in a previous session.' : 'That page does not exist.'}</p>
      <PageLink href="/">Back to problems</PageLink>
    </main>;
  }

  return <main className="page browse-page">
    <h1 className="sr-only">Programming practice</h1>
      <section className="problem-browser">
        <div className="topic-carousel">
          <button className="arrow" onClick={previousTopic} aria-label="Previous topic">←</button>
          <ChromeSculpture key={currentTopic} topic={currentTopic} />
          <button className="arrow" onClick={nextTopic} aria-label="Next topic">→</button>
        </div>
        <div className="topic-meta">
          {solvedCount} / {totalTopicProblems} solved <span> · </span> {topicIndex + 1} of {topics.length}
        </div>


        <input aria-label={`Search ${currentTopic} problems`} className="search" type="text" placeholder={`Search ${currentTopic.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="problem-list" key={`${currentTopic}-${search}`}>
          {topicProblems.length ? topicProblems.map((problem, index) => (
            <button type="button" className="problem-row" key={problem.id} onClick={() => openProblem(problem.id)}>
              <span className="problem-left">
                <span className="problem-number">{completed.includes(problem.id) ? "✓" : index + 1}</span>
                <span className="problem-name">{problem.title}</span>
              </span>
              <span className="difficulty">{problem.difficulty}</span>
            </button>
          )) : <p className="no-results">No problems found.</p>}
        </div>
      </section>

  </main>;

}

export default function App() {
  return <Account><Practice /></Account>;
}
