import { useId } from "react";

type Props = {
  languages: string[] | null;
  value: string | null;
  onChange: (language: string) => void;
  loading?: boolean;
};

// Controlled so the editor can preserve drafts by (slug, language) and confirm
// a switch before replacing code. Options come exclusively from this problem.
export default function ProblemLanguageSelect({ languages, value, onChange, loading = false }: Props) {
  const id = useId();
  const options = languages ?? [];
  const selected = options.some(option => option === value) ? value! : "";
  return <div>
    <label htmlFor={id}>Language</label>
    <select id={id} value={selected} disabled={loading || options.length === 0} onChange={event => { if (options.some(option => option === event.target.value)) onChange(event.target.value); }}>
      <option value="" disabled>{loading ? "Loading languages…" : options.length === 0 ? "No languages available" : "Choose a language"}</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    {!loading && languages && options.length === 0 && <p role="status">No languages are available for this problem.</p>}
  </div>;
}
