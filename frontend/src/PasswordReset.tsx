import { useState, type FormEvent } from 'react';
import { Link } from './lib/Link';
import { requestPasswordReset, resetPassword } from './features/auth/api';

type Props = { resetting: boolean; onReset: () => void };

export default function PasswordReset({ resetting, onReset }: Props) {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const validToken = /^[a-f0-9]{64}$/.test(token);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    const password = String(values.get('password') ?? '');
    setError('');
    if (resetting) {
      if (password !== values.get('confirm')) { setError('The passwords do not match.'); return; }
      const bytes = new TextEncoder().encode(password).length;
      if (bytes < 12 || bytes > 72) { setError('Use a password between 12 and 72 bytes.'); return; }
    }
    setBusy(true);
    try {
      if (resetting) await resetPassword(token, password);
      else await requestPasswordReset(String(values.get('email')).trim());
      setDone(true);
      if (resetting) {
        window.history.replaceState(null, '', '/reset-password');
        onReset();
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  return <>
    <h1>{done ? resetting ? 'Password updated.' : 'Check your inbox.' : resetting ? 'Choose a new password.' : 'Forgot your password?'}</h1>
    {done ? <p className="account-muted" role="status">{resetting ? 'Your password has been changed and all sessions have been signed out. Sign in with your new password.' : 'If an account exists for that email, you’ll receive a reset link shortly. The link expires in 30 minutes. Check your spam folder, too.'}</p> : resetting && !validToken ?
      <p role="alert" className="auth-error">This reset link is missing or invalid. <Link href="/forgot-password">Request a new link</Link>.</p> : <>
        <p className="account-muted">{resetting ? 'Choose a password you haven’t used before.' : 'Enter your account email and we’ll send you a reset link.'}</p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {resetting ? <>
            <label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} aria-describedby="reset-password-hint" /></label>
            <span className="password-hint" id="reset-password-hint">Minimum 12 characters.</span>
            <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></label>
          </> : <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
          {error && <p className="auth-error" role="alert">{error}{resetting && <> <Link href="/forgot-password">Request a new link</Link>.</>}</p>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : resetting ? 'Update password →' : 'Send reset link →'}</button>
        </form>
      </>}
    <p className="auth-switch"><Link href="/sign-in">Back to sign in</Link></p>
  </>;
}
