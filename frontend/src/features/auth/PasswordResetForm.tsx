import { useState, type FormEvent } from "react";
import { Link } from "../../lib/Link";
import { requestPasswordReset, resetPassword } from "./api";

type Props = { resetting: boolean; onReset: () => void };

const TOKEN = /^[a-f0-9]{64}$/;

export function PasswordResetForm({ resetting, onReset }: Props) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    setError("");
    if (resetting) {
      if (password !== values.get("confirm")) return setError("The passwords do not match.");
      const bytes = new TextEncoder().encode(password).length;
      if (bytes < 12 || bytes > 72) return setError("Use a password between 12 and 72 bytes.");
    }
    setBusy(true);
    try {
      if (resetting) await resetPassword(token, password);
      else await requestPasswordReset(String(values.get("email")).trim());
      setDone(true);
      if (resetting) {
        window.history.replaceState(null, "", "/reset-password");
        onReset();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const requestNewLink = <Link href="/forgot-password">Request a new link</Link>;

  if (done) {
    return (
      <>
        <h1>{resetting ? "Password updated." : "Check your inbox."}</h1>
        <p className="account-muted" role="status">
          {resetting
            ? "Your password has been changed and all sessions have been signed out. Sign in with your new password."
            : "If an account exists for that email, you’ll receive a reset link shortly. The link expires in 30 minutes. Check your spam folder, too."}
        </p>
        <BackToSignIn />
      </>
    );
  }

  return (
    <>
      <h1>{resetting ? "Choose a new password." : "Forgot your password?"}</h1>
      {resetting && !TOKEN.test(token) ? (
        <p role="alert" className="auth-error">
          This reset link is missing or invalid. {requestNewLink}.
        </p>
      ) : (
        <>
          <p className="account-muted">
            {resetting ? "Choose a password you haven’t used before." : "Enter your account email and we’ll send you a reset link."}
          </p>
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            {resetting ? (
              <>
                <label>
                  New password
                  <input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} aria-describedby="reset-password-hint" />
                </label>
                <span className="password-hint" id="reset-password-hint">Minimum 12 characters.</span>
                <label>
                  Confirm new password
                  <input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
                </label>
              </>
            ) : (
              <label>
                Email
                <input name="email" type="email" autoComplete="email" required maxLength={254} />
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
                {resetting && <> {requestNewLink}.</>}
              </p>
            )}
            <button className="auth-submit" disabled={busy}>
              {busy ? "Please wait…" : resetting ? "Update password →" : "Send reset link →"}
            </button>
          </form>
        </>
      )}
      <BackToSignIn />
    </>
  );
}

function BackToSignIn() {
  return (
    <p className="auth-switch">
      <Link href="/sign-in">Back to sign in</Link>
    </p>
  );
}
