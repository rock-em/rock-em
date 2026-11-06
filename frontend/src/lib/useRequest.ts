import { useEffect, useRef, useState } from "react";

type Settled<T> = { id: string; data?: T; error?: Error };

export function useRequest<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const id = key === null ? null : `${key}#${attempt}`;
  useEffect(() => {
    if (id === null) return;
    const controller = new AbortController();
    loadRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ id, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ id, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
    return () => controller.abort();
  }, [id]);

  const current = settled?.id === id ? settled : null;
  return {
    data: current?.data,
    error: current?.error ?? null,
    loading: id !== null && current === null,
    retry: () => setAttempt((count) => count + 1),
  };
}
