import { useState, type FormEvent } from "react";
import { Link } from "../../lib/Link";
import { navigate } from "../../lib/router";
import { signIn, signUp } from "./api";
import { AuthLayout } from "./AuthLayout";
import { useSession } from "./session";

type Mode = "sign-in" | "sign-up";

export function AuthPage({ mode }: { mode: Mode }) {
  const { user, checking, setUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const signingUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking) return;
    const data = new FormData(event.currentTarget);
    const credentials = { email: String(data.get("email")).trim(), password: String(data.get("password")) };
    setBusy(true);
    setError("");
    try {
      setUser(signingUp ? await signUp({ ...credentials, displayName: String(data.get("name")).trim() }) : await signIn(credentials));
      navigate("/");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <AuthLayout>
        <h1>You’re signed in</h1>
        <p className="account-muted">Continue practicing as {user.displayName}.</p>
        <Link href="/">Browse problems →</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1>{signingUp ? "A little practice, every day." : "Welcome back."}</h1>
      <p className="account-muted">{signingUp ? "Create your rock em account." : "Sign in to your rock em account."}</p>
      <form onSubmit={(event) => void submit(event)} className="auth-form">
        {signingUp && (
          <label>
            Name
            <input name="name" autoComplete="name" required maxLength={80} pattern=".*\S.*" />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Password
          <span className="password-field">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={signingUp ? "new-password" : "current-password"}
              minLength={signingUp ? 12 : undefined}
              maxLength={72}
              required
              aria-describedby={signingUp ? "password-hint" : undefined}
            />
            <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        {signingUp && <span id="password-hint" className="password-hint">Minimum 12 characters.</span>}
        {!signingUp && (
          <div className="forgot-password-link">
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy || checking}>
          {busy ? "Please wait…" : signingUp ? "Create account →" : "Sign in →"}
        </button>
      </form>
      <p className="auth-switch">
        {signingUp ? "Already have an account? " : "New here? "}
        <Link href={signingUp ? "/sign-in" : "/sign-up"}>{signingUp ? "Sign in" : "Create an account"}</Link>
      </p>
    </AuthLayout>
  );
}
