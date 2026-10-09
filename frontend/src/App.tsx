import { useState } from "react";
import ChromeSculpture from "./ChromeSculpture";
import "./index.css";

type Difficulty = "Easy" | "Medium";
type TestCase = { input: unknown[]; expected: unknown };
type Problem = {
  id: number;
  title: string;
  topic: string;
  difficulty: Difficulty;
  solved: boolean;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints: string[];
  functionName: string;
  starter: string;
  tests: TestCase[];
};

const problems: Problem[] = [
  {
    id: 1, title: "Two Sum", topic: "Arrays", difficulty: "Easy", solved: true,
    description: "Given an array of integers nums and an integer target, return the indices of two different elements whose values add up to target. You may assume exactly one solution exists. Return the indices in any order.",
    examples: [
      { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1]" },
      { input: "nums = [3, 2, 4], target = 6", output: "[1, 2]" },
    ],
    constraints: ["2 ≤ nums.length ≤ 10⁴", "Exactly one valid pair exists.", "You cannot use the same element twice."],
    functionName: "twoSum",
    starter: "function twoSum(nums, target) {\n  // Write your solution here\n  \n}",
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] },
    ],
  },
  {
    id: 2, title: "Valid Parentheses", topic: "Stack", difficulty: "Easy", solved: false,
    description: "Given a string containing only (), {}, and [], determine whether it is valid. Every opening bracket must be closed by the same type of bracket in the correct order.",
    examples: [
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: ["1 ≤ s.length ≤ 10⁴", "s contains only parentheses and brackets."],
    functionName: "isValid",
    starter: "function isValid(s) {\n  // Write your solution here\n  \n}",
    tests: [
      { input: ["()[]{}"], expected: true },
      { input: ["(]"], expected: false },
      { input: ["{[]}"], expected: true },
      { input: ["([)]"], expected: false },
    ],
  },
  {
    id: 3, title: "Binary Search", topic: "Search", difficulty: "Easy", solved: false,
    description: "Given an array of integers nums sorted in ascending order and a target value, return the index of target. If target is not present, return -1. Aim for O(log n) time complexity.",
    examples: [
      { input: "nums = [-1, 0, 3, 5, 9, 12], target = 9", output: "4" },
      { input: "nums = [-1, 0, 3, 5, 9, 12], target = 2", output: "-1" },
    ],
    constraints: ["1 ≤ nums.length ≤ 10⁴", "nums is sorted and contains distinct integers."],
    functionName: "search",
    starter: "function search(nums, target) {\n  // Write your solution here\n  \n}",
    tests: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
      { input: [[5], 5], expected: 0 },
      { input: [[5], -5], expected: -1 },
    ],
  },
  {
    id: 4, title: "Merge Two Sorted Lists", topic: "Linked Lists", difficulty: "Easy", solved: false,
    description: "Merge two sorted singly linked lists and return the head of the merged sorted list. Each node has a val and next property. Reuse the existing nodes or create new ones.",
    examples: [
      { input: "list1 = [1, 2, 4], list2 = [1, 3, 4]", output: "[1, 1, 2, 3, 4, 4]" },
      { input: "list1 = [], list2 = []", output: "[]" },
    ],
    constraints: ["Both lists are sorted in non-decreasing order.", "The total number of nodes is at most 50."],
    functionName: "mergeTwoLists",
    starter: "function mergeTwoLists(list1, list2) {\n  // Nodes have { val, next }\n  // Write your solution here\n  \n}",
    tests: [
      { input: [[1, 2, 4], [1, 3, 4]], expected: [1, 1, 2, 3, 4, 4] },
      { input: [[], []], expected: [] },
      { input: [[], [0]], expected: [0] },
    ],
  },
  {
    id: 5, title: "Maximum Subarray", topic: "Arrays", difficulty: "Medium", solved: false,
    description: "Given an integer array nums, find the contiguous subarray with the largest sum and return that sum. The subarray must contain at least one element.",
    examples: [
      { input: "nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]", output: "6", explanation: "The subarray [4, -1, 2, 1] has sum 6." },
      { input: "nums = [1]", output: "1" },
    ],
    constraints: ["1 ≤ nums.length ≤ 10⁵", "-10⁴ ≤ nums[i] ≤ 10⁴"],
    functionName: "maxSubArray",
    starter: "function maxSubArray(nums) {\n  // Write your solution here\n  \n}",
    tests: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23 },
      { input: [[-3, -2, -5]], expected: -2 },
    ],
  },
  {
    id: 6, title: "Number of Islands", topic: "Graphs", difficulty: "Medium", solved: false,
    description: 'Given a 2D grid of "1" (land) and "0" (water), count the islands. An island is formed by horizontally or vertically connected land cells and surrounded by water or the grid boundary.',
    examples: [
      { input: 'grid = [["1","1","0"],["1","0","0"],["0","0","1"]]', output: "2" },
      { input: 'grid = [["0","0"],["0","0"]]', output: "0" },
    ],
    constraints: ["1 ≤ grid.length, grid[i].length ≤ 300", 'Each cell is "0" or "1".'],
    functionName: "numIslands",
    starter: "function numIslands(grid) {\n  // Write your solution here\n  \n}",
    tests: [
      { input: [[["1", "1", "0"], ["1", "0", "0"], ["0", "0", "1"]]], expected: 2 },
      { input: [[["0", "0"], ["0", "0"]]], expected: 0 },
      { input: [[["1", "1"], ["1", "1"]]], expected: 1 },
    ],
  },
];

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
      function toList(values) {
        let head = null;
        for (let i = values.length - 1; i >= 0; i--) head = { val: values[i], next: head };
        return head;
      }
      function fromList(head) {
        const values = [];
        let count = 0;
        while (head && count < 1000) { values.push(head.val); head = head.next; count++; }
        return values;
      }
      const results = [];
      try {
        const solution = new Function(payload.code + '\\nreturn ' + payload.functionName + ';')();
        if (typeof solution !== 'function') throw new Error('Define a function named ' + payload.functionName);
        for (const test of payload.tests) {
          const input = JSON.parse(JSON.stringify(test.input));
          try {
            const args = payload.functionName === 'mergeTwoLists' ? input.map(toList) : input;
            let actual = solution(...args);
            if (payload.functionName === 'mergeTwoLists') actual = fromList(actual);
            let passed;
            if (payload.functionName === 'twoSum') {
              const indices = actual;
              passed = Array.isArray(indices) && indices.length === 2 &&
                Number.isInteger(indices[0]) && Number.isInteger(indices[1]) &&
                indices[0] !== indices[1] && indices.every(i => i >= 0 && i < input[0].length) &&
                input[0][indices[0]] + input[0][indices[1]] === input[1];
            } else {
              passed = JSON.stringify(actual) === JSON.stringify(test.expected);
            }
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

function App() {
  const topics = [...new Set(problems.map((problem) => problem.topic))];
  const [topicIndex, setTopicIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [solutions, setSolutions] = useState<Record<number, string>>({});
  const [completed, setCompleted] = useState<number[]>(problems.filter((p) => p.solved).map((p) => p.id));
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const currentTopic = topics[topicIndex];
  const selected = problems.find((p) => p.id === selectedId);
  const topicProblems = problems.filter((problem) =>
    problem.topic === currentTopic &&
    (problem.title.toLowerCase().includes(search.toLowerCase()) ||
      problem.difficulty.toLowerCase().includes(search.toLowerCase()))
  );
  const solvedCount = problems.filter((p) => p.topic === currentTopic && completed.includes(p.id)).length;
  const totalTopicProblems = problems.filter((p) => p.topic === currentTopic).length;

  function nextTopic() { setTopicIndex((prev) => (prev + 1) % topics.length); setSearch(""); }
  function previousTopic() { setTopicIndex((prev) => (prev + topics.length - 1) % topics.length); setSearch(""); }
  function openProblem(id: number) { setSelectedId(id); setResults(null); setMessage(""); window.scrollTo(0, 0); }
  function goBack() { setSelectedId(null); setResults(null); setMessage(""); window.scrollTo(0, 0); }

  async function checkSolution(submit: boolean) {
    if (!selected || running) return;
    setRunning(true);
    setResults(null);
    setMessage("");
    try {
      const testResults = await runTests(selected, solutions[selected.id] ?? selected.starter);
      setResults(testResults);
      const passed = testResults.length === selected.tests.length && testResults.every((test) => test.passed);
      if (submit && passed) {
        setCompleted((previous) => previous.includes(selected.id) ? previous : [...previous, selected.id]);
        setMessage("Accepted! All tests passed. Problem marked as solved.");
      } else if (submit) {
        setMessage("Not quite yet. Review the failed tests and try again.");
      } else {
        setMessage(passed ? "All sample tests passed! Ready to submit." : "Some tests failed. Check the results below.");
      }
    } finally {
      setRunning(false);
    }
  }

  if (selected) {
    return (
      <main className="workspace-page">
        <header className="workspace-header">
          <button className="back-link" onClick={goBack}>← Back to problems</button>
          <span className="workspace-brand">rock em</span>
          <span className="workspace-counter">{completed.length} / {problems.length} solved</span>
        </header>

        <div className="workspace-grid">
          <section className="workspace-panel description-panel">
            <div className="workspace-eyebrow">Problem {selected.id} · {selected.topic}</div>
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
            <h2>Constraints</h2>
            <ul className="constraints">{selected.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
          </section>

          <section className="workspace-panel editor-panel">
            <div className="editor-heading">
              <div><strong>Your solution</strong><span className="language-label">JavaScript</span></div>
              <button className="reset-button" onClick={() => { setSolutions((old) => ({ ...old, [selected.id]: selected.starter })); setResults(null); setMessage(""); }}>Reset code</button>
            </div>
            <label className="sr-only" htmlFor="solution-code">JavaScript solution</label>
            <textarea
              id="solution-code"
              className="code-editor"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={solutions[selected.id] ?? selected.starter}
              onChange={(event) => { setSolutions((old) => ({ ...old, [selected.id]: event.target.value })); setResults(null); setMessage(""); }}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  const target = event.currentTarget;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const next = target.value.slice(0, start) + "  " + target.value.slice(end);
                  setSolutions((old) => ({ ...old, [selected.id]: next }));
                  requestAnimationFrame(() => { target.selectionStart = start + 2; target.selectionEnd = start + 2; });
                }
              }}
            />
            <div className="editor-actions">
              <button className="run-button" disabled={running} onClick={() => void checkSolution(false)}>{running ? "Running…" : "Run tests"}</button>
              <button className="submit-button" disabled={running} onClick={() => void checkSolution(true)}>Submit →</button>
            </div>
            {message && <p className="test-message" role="status">{message}</p>}
            {results && (
              <div className="test-results">
                <h2>Test results <span>{results.filter((result) => result.passed).length} / {results.length} passed</span></h2>
                {results.map((result, index) => (
                  <div className={`test-case ${result.passed ? "test-pass" : "test-fail"}`} key={index}>
                    <strong>{result.passed ? "✓" : "✕"} Test {index + 1}</strong>
                    <div>Input: <code>{format(result.input)}</code></div>
                    <div>Expected: <code>{format(result.expected)}</code></div>
                    {result.error ? <div>Error: <code>{result.error}</code></div> : <div>Received: <code>{format(result.actual)}</code></div>}
                  </div>
                ))}
              </div>
            )}
            <p className="runner-note">Local demo runner: JavaScript only. Sample tests are not a complete judge.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="intro">
        <h1>rock em</h1>
        <p>A place to practice programming that is nice on the eyes :D</p>
        <div className="summary">
          <span><strong>Problems</strong> · {problems.length}</span>
          <span><strong>Solved</strong> · {completed.length}</span>
          <span><strong>Topics</strong> · {topics.length}</span>
        </div>
      </section>
      <section className="problem-browser">
        <div className="topic-carousel">
          <button className="arrow" onClick={previousTopic} aria-label="Previous topic">←</button>
          <ChromeSculpture key={currentTopic} topic={currentTopic} />
          <button className="arrow" onClick={nextTopic} aria-label="Next topic">→</button>
        </div>
        <div className="topic-meta">
          {solvedCount} / {totalTopicProblems} solved <span> · </span> {topicIndex + 1} of {topics.length}
        </div>
        <input className="search" type="text" placeholder={`Search ${currentTopic.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="problem-list" key={`${currentTopic}-${search}`}>
          {topicProblems.length ? topicProblems.map((problem) => (
            <button type="button" className="problem-row" key={problem.id} onClick={() => openProblem(problem.id)}>
              <span className="problem-left">
                <span className="problem-number">{completed.includes(problem.id) ? "✓" : problem.id}</span>
                <span className="problem-name">{problem.title}</span>
              </span>
              <span className="difficulty">{problem.difficulty}</span>
            </button>
          )) : <p className="no-results">No problems found.</p>}
        </div>
      </section>
      <section>
        <h2>About</h2>
        <p>rock em is an open source program for practicing programming problems!</p>
      </section>
    </main>
  );
}

export default App;
