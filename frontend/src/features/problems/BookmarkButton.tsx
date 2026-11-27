import { Bookmark } from "lucide-react";
import "./BookmarkButton.css";

export function BookmarkButton({ title, saved, onToggle }: { title: string; saved: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="bookmark-button"
      aria-label={`Bookmark ${title}`}
      aria-pressed={saved}
      title={saved ? "Remove bookmark" : "Save for later"}
      onClick={onToggle}
    >
      <Bookmark size={17} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );
}
