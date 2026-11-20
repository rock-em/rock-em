import type { Problem } from "../problems/model";
import { LanguageSelect } from "./LanguageSelect";
import { LazyCodeEditor } from "./LazyCodeEditor";
import { Pane } from "./Pane";

type Props = {
  problem: Problem;
  editorKey: string;
  code: string;
  languages: string[];
  onEdit: (code: string) => void;
  onLanguageChange: (language: string) => void;
};

export function CodePane({ problem, editorKey, code, languages, onEdit, onLanguageChange }: Props) {
  return (
    <Pane
      id="code"
      label="Code"
      header={
        <>
          <LanguageSelect languages={languages} value={problem.language} onChange={onLanguageChange} />
          <button className="reset-button" onClick={() => onEdit(problem.starter)}>
            Reset code
          </button>
        </>
      }
    >
      <LazyCodeEditor
        key={editorKey}
        className="code-editor"
        label={`${problem.language} solution`}
        language={problem.language}
        indentUnit={problem.indentUnit}
        value={code}
        onChange={onEdit}
      />
    </Pane>
  );
}
