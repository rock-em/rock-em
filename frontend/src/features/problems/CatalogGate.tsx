import type { ReactNode } from "react";
import { Link } from "../../lib/Link";
import { usePractice } from "../practice/context";

export function CatalogGate({ children }: { children: ReactNode }) {
  const { catalog, problems } = usePractice();
  if (!catalog.loading && !catalog.error && problems.length > 0) return children;

  if (catalog.loading) {
    return (
      <main className="page utility-page">
        <h1>Loading problems…</h1>
        <p role="status">Fetching the problem catalog.</p>
      </main>
    );
  }

  return (
    <main className="page utility-page">
      <h1>{catalog.error ? "Couldn’t load problems" : "No problems yet"}</h1>
      <p role={catalog.error ? "alert" : "status"}>{catalog.error || "There are no published problems to browse yet."}</p>
      <button className="run-button" onClick={catalog.retry}>
        Reload problems
      </button>
      <p>
        <Link href="/generate">Generate a problem →</Link>
      </p>
    </main>
  );
}
