import { useEffect, useState } from 'react';
import { CatalogError, chooseProblemLanguage, getProblemCatalog, getProblemDetail, getProblemLanguages, type ProblemDetail, type ProblemSummary } from './problemCatalog';

const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to reach the problem service.';

export function useProblemCatalog() {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ version: number; data: ProblemSummary[]; error: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getProblemCatalog(controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ version, data, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ version, data: [], error: message(error) });
    });
    return () => controller.abort();
  }, [version]);
  const current = result?.version === version ? result : null;
  return { data: current?.data ?? [], loading: !current, error: current?.error ?? '', retry: () => setVersion(value => value + 1) };
}

export function useProblemDetail(slug: string | null, preferred?: string) {
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([slug, preferred, version]);
  const [result, setResult] = useState<{ key: string; data: ProblemDetail | null; languages: string[]; error: string } | null>(null);
  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    let languages: string[] = [];
    async function load() {
      try {
        languages = await getProblemLanguages(slug!, controller.signal);
        const language = chooseProblemLanguage(languages, preferred) ?? languages[0];
        const data = language ? await getProblemDetail(slug!, language, controller.signal) : null;
        if (!controller.signal.aborted) setResult({ key, data, languages, error: '' });
      } catch (error) {
        if (error instanceof CatalogError && error.code === 'language_not_available') languages = error.languages;
        if (!controller.signal.aborted) setResult({ key, data: null, languages, error: message(error) });
      }
    }
    void load();
    return () => controller.abort();
  }, [slug, preferred, key]);
  const current = result?.key === key ? result : null;
  return { data: current?.data ?? null, languages: current?.languages ?? [], error: current?.error ?? '', loading: !!slug && !current, retry: () => setVersion(value => value + 1) };
}
