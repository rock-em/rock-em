import { Link } from "../lib/Link";

export function AboutPage() {
  return (
    <main className="page utility-page about-page">
      <h1>About rock em</h1>
      <p>A place to practice programming that is nice on the eyes :D</p>
      <p>
        rock em is an open source program for practicing programming problems. Browse by topic, follow a learning path, or generate something new to
        work on.
      </p>
      <Link href="/">Browse problems →</Link>
    </main>
  );
}
