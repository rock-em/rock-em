import { Fragment } from "react";

// `code` spans, as the scraper and the generator write them. Nothing else is
// interpreted, so the text is always rendered as text.
const CODE_SPAN = /`([^`\n]+)`/;

/** Text with its `backtick` spans shown as inline code. */
export function InlineText({ text }: { text: string }) {
  return text.split(CODE_SPAN).map((part, index) =>
    index % 2 === 1 ? (
      <code className="inline-code" key={index}>
        {part}
      </code>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** A statement: blank lines separate paragraphs, single line breaks are kept. */
export function Prose({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.trim() !== "")
        .map((paragraph, index) => (
          <p key={index}>
            <InlineText text={paragraph} />
          </p>
        ))}
    </div>
  );
}
