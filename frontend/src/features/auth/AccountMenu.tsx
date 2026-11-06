import { useRef, useState } from "react";
import { Link } from "../../lib/Link";
import { navigate } from "../../lib/router";
import { useDismiss } from "../../lib/useDismiss";
import { signOut } from "./api";
import { useSession } from "./session";

export function AccountMenu() {
  const { user, checking, setUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const profile = useRef<HTMLDetailsElement>(null);
  useDismiss(profile);

  async function endSession() {
    setBusy(true);
    setError("");
    try {
      await signOut();
      setUser(null);
      navigate("/");
    } catch {
      setError("Unable to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <nav aria-label="Account" className="account-nav">
      {checking ? (
        <span className="account-muted" role="status">Loading account…</span>
      ) : user ? (
        <details className="profile" ref={profile}>
          <summary>
            <span className="avatar" aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase() || "?"}</span>
            <span className="profile-name">{user.displayName}</span>
          </summary>
          <div className="profile-panel">
            <strong>{user.displayName}</strong>
            {user.role === "admin" && <span className="account-muted">Admin</span>}
            <span className="account-muted">{user.email}</span>
            <button disabled={busy} onClick={() => void endSession()}>
              {busy ? "Signing out…" : "Sign out"}
            </button>
            {error && <p role="alert" className="auth-error">{error}</p>}
          </div>
        </details>
      ) : (
        <>
          <Link href="/sign-in">Sign in</Link>
          <Link className="account-button" href="/sign-up">Sign up</Link>
        </>
      )}
    </nav>
  );
}
