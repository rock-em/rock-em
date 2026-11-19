import { useEffect, useRef } from "react";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

export type CodeEditorProps = {
  value: string;
  language: string;
  label: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
  indentUnit?: string;
};

const languageLoaders: Record<string, () => Promise<Extension>> = {
  javascript: () => import("@codemirror/lang-javascript").then((m) => m.javascript()),
  typescript: () => import("@codemirror/lang-javascript").then((m) => m.javascript({ typescript: true })),
  python: () => import("@codemirror/lang-python").then((m) => [m.python(), indentUnit.of("    ")]),
  java: () => import("@codemirror/lang-java").then((m) => m.java()),
  c: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  cpp: () => import("@codemirror/lang-cpp").then((m) => m.cpp()),
  go: () => import("@codemirror/lang-go").then((m) => [m.go(), indentUnit.of("\t")]),
  rust: () => import("@codemirror/lang-rust").then((m) => [m.rust(), indentUnit.of("    ")]),
  csharp: () =>
    import("@codemirror/legacy-modes/mode/clike").then((m) => [StreamLanguage.define(m.csharp), indentUnit.of("    ")]),
  kotlin: () =>
    import("@codemirror/legacy-modes/mode/clike").then((m) => [StreamLanguage.define(m.kotlin), indentUnit.of("    ")]),
  swift: () =>
    import("@codemirror/legacy-modes/mode/swift").then((m) => [StreamLanguage.define(m.swift), indentUnit.of("    ")]),
  ruby: () => import("@codemirror/legacy-modes/mode/ruby").then((m) => StreamLanguage.define(m.ruby)),
};

const highlightStyle = HighlightStyle.define([
  {
    tag: [
      tags.keyword,
      tags.controlKeyword,
      tags.moduleKeyword,
      tags.operatorKeyword,
      tags.definitionKeyword,
      tags.modifier,
    ],
    color: "var(--code-keyword)",
  },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: "var(--code-string)" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--code-number)" },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment],
    color: "var(--code-comment)",
    fontStyle: "italic",
  },
  {
    tag: [
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.function(tags.definition(tags.variableName)),
    ],
    color: "var(--color-link)",
  },
  { tag: [tags.typeName, tags.className, tags.namespace, tags.standard(tags.variableName)], color: "var(--code-type)" },
  { tag: [tags.definition(tags.variableName), tags.propertyName], color: "var(--code-property)" },
  { tag: [tags.meta, tags.annotation, tags.processingInstruction], color: "var(--color-muted)" },
  { tag: tags.invalid, color: "var(--color-bad)" },
]);

const theme = EditorView.theme({
  "&": { backgroundColor: "var(--color-surface)", color: "var(--color-text)" },
  ".cm-scroller": { fontFamily: 'Consolas, "Courier New", monospace', lineHeight: "1.7" },
  ".cm-gutters": {
    backgroundColor: "var(--color-surface-strong)",
    color: "var(--color-subtle)",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-activeLine": { backgroundColor: "var(--code-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--code-active-line)", color: "var(--color-muted)" },
  "&.cm-focused .cm-matchingBracket": {
    backgroundColor: "var(--code-bracket)",
    outline: "1px solid var(--color-link)",
  },
  ".cm-content": { caretColor: "var(--color-text)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-text)" },
  "&.cm-focused": { outline: "2px solid var(--color-link)", outlineOffset: "-2px" },
});

export function CodeEditor({
  value,
  language,
  label,
  onChange,
  readOnly = false,
  className,
  indentUnit: serverIndent,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const languageSlot = new Compartment();
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          readOnly
            ? []
            : [
                lineNumbers(),
                highlightActiveLineGutter(),
                highlightActiveLine(),
                history(),
                closeBrackets(),
                indentOnInput(),
              ],
          drawSelection(),
          bracketMatching(),
          syntaxHighlighting(highlightStyle),
          serverIndent ? indentUnit.of(serverIndent) : [],
          languageSlot.of([]),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({
            "aria-label": label,
            autocapitalize: "off",
            autocorrect: "off",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current?.(update.state.doc.toString());
          }),
          theme,
        ],
      }),
    });
    view.current = editor;
    let cancelled = false;
    languageLoaders[language]?.().then((extension) => {
      if (!cancelled) editor.dispatch({ effects: languageSlot.reconfigure(extension) });
    });
    return () => {
      cancelled = true;
      editor.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className={className} />;
}
