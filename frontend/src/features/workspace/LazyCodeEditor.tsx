import { lazy, Suspense } from "react";
import type { CodeEditorProps } from "./CodeEditor";

const CodeEditor = lazy(() => import("./CodeEditor").then((module) => ({ default: module.CodeEditor })));

export function LazyCodeEditor(props: CodeEditorProps & { className: string }) {
  return (
    <Suspense fallback={<pre className={`${props.className} code-loading`}>{props.value}</pre>}>
      <CodeEditor {...props} />
    </Suspense>
  );
}
