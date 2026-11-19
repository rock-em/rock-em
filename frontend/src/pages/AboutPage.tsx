import { Link } from "../lib/Link";

export function AboutPage() {
  return (
    <main className="page utility-page about-page">
      <h1>About rock em</h1>
      <p>A place to practice programming that is nice on the eyes :D</p>
      <p>
        rock em is an open source program for practicing programming problems. Everything you need is under Explore:
      </p>
      <ul>
        <li>
          <Link href="/">Problems</Link>: search the full catalog and filter by difficulty, topic, and what you have
          solved.
        </li>
        <li>
          <Link href="/learn">Learning paths</Link>: the key concepts for a topic and a ladder of problems from easy to
          hard.
        </li>
        <li>
          <Link href="/progress">Practice review</Link>: what you have solved, what is due for another try, and where to
          go next.
        </li>
        <li>
          <Link href="/generate">Generate a problem</Link>: a fresh problem on any topic, with test cases.
        </li>
      </ul>
    </main>
  );
}
