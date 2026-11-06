import { Link } from "../lib/Link";

export function NotFoundPage() {
  return (
    <main className="page utility-page">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <Link href="/">Back to problems</Link>
    </main>
  );
}
