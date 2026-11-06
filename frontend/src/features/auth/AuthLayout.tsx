import type { ReactNode } from "react";
import { Link } from "../../lib/Link";
import "./auth.css";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <Link className="auth-back" href="/">
        ← Back to problems
      </Link>
      {children}
    </main>
  );
}
