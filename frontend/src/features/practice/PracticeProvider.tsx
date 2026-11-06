import { useMemo, useState, type ReactNode } from "react";
import { useProblemCatalog } from "../problems/hooks";
import { fromSummary, type Problem } from "../problems/model";
import { PracticeContext, type Practice } from "./context";

export function PracticeProvider({ children }: { children: ReactNode }) {
  const catalog = useProblemCatalog();
  const [generated, setGenerated] = useState<Problem[]>([]);
  const [selectedTopic, setTopic] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [solved, setSolved] = useState<string[]>([]);
  const [languages, setLanguages] = useState<Record<string, string>>({});

  const value = useMemo<Practice>(() => {
    const problems = [...catalog.data.map(fromSummary), ...generated];
    const topics = [...new Set(problems.map((problem) => problem.topic))];
    return {
      catalog: { loading: catalog.loading, error: catalog.error, retry: catalog.retry },
      problems,
      topics,
      topic: selectedTopic !== null && topics.includes(selectedTopic) ? selectedTopic : (topics[0] ?? ""),
      setTopic,
      generated,
      addGenerated: (problem) => setGenerated((previous) => [...previous, problem]),
      drafts,
      setDraft: (key, code) => setDrafts((previous) => ({ ...previous, [key]: code })),
      solved,
      markSolved: (id) => setSolved((previous) => (previous.includes(id) ? previous : [...previous, id])),
      languages,
      setLanguage: (problemId, language) => setLanguages((previous) => ({ ...previous, [problemId]: language })),
    };
  }, [
    catalog.data,
    catalog.loading,
    catalog.error,
    catalog.retry,
    generated,
    selectedTopic,
    drafts,
    solved,
    languages,
  ]);

  return <PracticeContext value={value}>{children}</PracticeContext>;
}
