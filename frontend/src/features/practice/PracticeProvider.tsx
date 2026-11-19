import { useEffect, useMemo, useState, type ReactNode } from "react";
import { readJson, writeJson } from "../../lib/storage";
import { useProblemCatalog } from "../problems/hooks";
import { fromCatalog, type Problem } from "../problems/model";
import { PracticeContext, type Practice } from "./context";

const SOLVED_KEY = "rock-em:solved:v1";
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export function PracticeProvider({ children }: { children: ReactNode }) {
  const catalog = useProblemCatalog();
  const [generated, setGenerated] = useState<Problem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [solvedIds, setSolvedIds] = useState(() => readJson(SOLVED_KEY, isStringList, []));
  const [languages, setLanguages] = useState<Record<string, string>>({});
  useEffect(() => writeJson(SOLVED_KEY, solvedIds), [solvedIds]);

  // Converting and counting 3,000+ problems is cheap, but only worth doing when
  // the catalog itself changes, not on every keystroke in the editor.
  const published = useMemo(() => (catalog.data ? fromCatalog(catalog.data) : []), [catalog.data]);
  const { problems, topics } = useMemo(() => {
    const problems = [...published, ...generated];
    const counts = new Map<string, number>();
    for (const problem of problems) {
      for (const name of problem.topics) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const topics = [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    return { problems, topics };
  }, [published, generated]);
  const solved = useMemo(() => new Set(solvedIds), [solvedIds]);

  const value = useMemo<Practice>(
    () => ({
      catalog: { loading: catalog.loading, error: catalog.error, retry: catalog.retry },
      problems,
      topics,
      generated,
      addGenerated: (problem) => setGenerated((previous) => [...previous, problem]),
      drafts,
      setDraft: (key, code) => setDrafts((previous) => ({ ...previous, [key]: code })),
      solved,
      markSolved: (id) => setSolvedIds((previous) => (previous.includes(id) ? previous : [...previous, id])),
      languages,
      setLanguage: (problemId, language) => setLanguages((previous) => ({ ...previous, [problemId]: language })),
    }),
    [catalog.loading, catalog.error, catalog.retry, problems, topics, generated, drafts, solved, languages],
  );

  return <PracticeContext value={value}>{children}</PracticeContext>;
}
