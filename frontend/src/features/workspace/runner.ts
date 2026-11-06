import type { Problem } from "../problems/model";

export type TestResult = { passed: boolean; input: unknown[]; expected: unknown; actual?: unknown; error?: string };

const TIMEOUT_MS = 3000;

function sandboxSource(payload: string) {
  return `<!doctype html><html><body><script>
    const payload = ${payload};
    const key = (value) => payload.unordered && Array.isArray(value)
      ? JSON.stringify(value.map((item) => JSON.stringify(item)).sort())
      : JSON.stringify(value);
    const results = [];
    try {
      const solution = new Function(payload.code + "\\nreturn " + payload.functionName + ";")();
      if (typeof solution !== "function") throw new Error("Define a function named " + payload.functionName);
      for (const test of payload.tests) {
        const input = JSON.parse(JSON.stringify(test.input));
        try {
          const actual = solution(...input);
          results.push({ passed: key(actual) === key(test.expected), input: test.input, expected: test.expected, actual });
        } catch (error) {
          results.push({ passed: false, input: test.input, expected: test.expected, error: String(error) });
        }
      }
    } catch (error) {
      results.push({ passed: false, input: [], expected: "Valid JavaScript solution", error: String(error) });
    }
    parent.postMessage({ token: payload.token, results }, "*");
  </script></body></html>`;
}

// A lightweight demo runner, not a production-grade secure judge.
export function runTests(problem: Pick<Problem, "functionName" | "tests" | "compare">, code: string): Promise<TestResult[]> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.setAttribute("sandbox", "allow-scripts");
    document.body.appendChild(iframe);
    const token = crypto.randomUUID();

    const finish = (results: TestResult[]) => {
      window.removeEventListener("message", receive);
      window.clearTimeout(timer);
      iframe.remove();
      resolve(results);
    };
    const receive = (event: MessageEvent) => {
      if (event.source === iframe.contentWindow && event.data?.token === token) finish(event.data.results);
    };
    const timer = window.setTimeout(() => {
      finish([{ passed: false, input: [], expected: "Completed within 3 seconds", error: "Execution timed out. Check for an infinite loop." }]);
    }, TIMEOUT_MS);
    window.addEventListener("message", receive);

    const payload = JSON.stringify({ code, functionName: problem.functionName, tests: problem.tests, unordered: problem.compare === "unordered", token });
    iframe.srcdoc = sandboxSource(payload.replace(/</g, "\\u003c"));
  });
}

export function allPassed(results: TestResult[], expectedCount: number) {
  return results.length === expectedCount && results.every((result) => result.passed);
}

export function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
