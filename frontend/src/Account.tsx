import { useEffect, useState, type FormEvent } from "react";

type User = { id: number; email: string; displayName: string; role: "user" | "admin" };

export default function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/auth/me", { signal: abort.signal })
      .then(async response => {
        if (response.ok) setUser(await response.json());
        else if (response.status !== 401) setError("Account service unavailable. Please try again.");
      })
      .catch(() => { if (!abort.signal.aborted) setError("Could not reach the account service."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError("");
    try {
      const payload = {
        email: values.get("email"), password: values.get("password"),
        ...(register ? { displayName: values.get("displayName") } : {}),
      };
      const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to sign in.");
      setUser(body); form.reset();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      setUser(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign out."); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status">Checking account…</p>;
  return <section aria-label="Account" className="account">
    {user ? <p>Signed in as {user.displayName}{user.role === "admin" ? " · Admin" : ""} <button disabled={busy} onClick={logout}>Sign out</button></p> :
      <details>
        <summary>Sign in or create an account</summary>
        <p>Sign in to generate practice problems. You can browse without an account.</p>
        <form onSubmit={submit}>
          {register && <label>Display name <input name="displayName" autoComplete="nickname" required maxLength={80} /></label>}
          <label>Email <input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password <input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : undefined} maxLength={72} /></label>
          {register && <p>Use a password between 12 and 72 bytes.</p>}
          <button disabled={busy} type="submit">{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
          <button disabled={busy} type="button" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Already have an account?" : "Create an account"}</button>
        </form>
      </details>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
