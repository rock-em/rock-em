import { useEffect, useRef, useState } from 'react';
import { Link } from './lib/Link';
import { navigate as goTo } from './lib/router';
import { useDismiss } from './lib/useDismiss';
import { getSession, signIn, signOut as endSession, signUp, type User } from './features/auth/api';
import type { FormEvent, ReactNode } from 'react';
import PasswordReset from './PasswordReset';
import SiteNavigation from './SiteNavigation';

type Page = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | null;
const currentPage = (): Page => {
  const path = window.location.pathname.replace(/\/$/, '').slice(1);
  return path === 'sign-in' || path === 'sign-up' || path === 'forgot-password' || path === 'reset-password' ? path : null;
};

export default function Account({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(currentPage);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const profile = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    let active = true;
    getSession().then((next) => { if (active) setUser(next); }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    const onPop = () => { setPage(currentPage()); setError(''); setShowPassword(false); };
    window.addEventListener('popstate', onPop);
    return () => { active = false; window.removeEventListener('popstate', onPop); };
  }, []);
  useDismiss(profile);

  function navigate(next: Page) {
    goTo(next ? `/${next}` : '/');
    setPage(next);
    setError('');
    setShowPassword(false);
  }

  function link(next: Page, label: string, className?: string) {
    return <Link className={className} href={next ? `/${next}` : '/'}>{label}</Link>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const credentials = { email: String(data.get('email')).trim(), password: String(data.get('password')) };
      const next = page === 'sign-up' ? await signUp({ ...credentials, displayName: String(data.get('name')).trim() }) : await signIn(credentials);
      setUser(next); navigate(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError('');
    try { await endSession(); setUser(null); navigate(null); }
    catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  return <>
    <header className="site-header">
      <div className="site-header-start">{link(null, 'rock em', 'site-brand')}<SiteNavigation /></div>
      <nav aria-label="Account" className="account-nav">
        {checking ? <span className="account-muted" role="status">Loading account…</span> : user ?
          <details className="profile" ref={profile}>
            <summary><span className="avatar" aria-hidden="true">{user.displayName.trim().charAt(0).toUpperCase() || '?'}</span><span className="profile-name">{user.displayName}</span></summary>
            <div className="profile-panel">
              <strong>{user.displayName}</strong>{user.role === "admin" && <span className="account-muted">Admin</span>}<span className="account-muted">{user.email}</span>
              <button disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button>
              {error && <p role="alert" className="auth-error">{error}</p>}
            </div>
          </details> : <>{link('sign-in', 'Sign in')}{link('sign-up', 'Sign up', 'account-button')}</>}
      </nav>
    </header>
    {page ? <main className="auth-page" key={page}>
      {link(null, '← Back to problems', 'auth-back')}
      {page === 'forgot-password' || page === 'reset-password' ? <PasswordReset resetting={page === 'reset-password'} onReset={() => setUser(null)} /> : user ? <><h1>You’re signed in</h1><p className="account-muted">Continue practicing as {user.displayName}.</p>{link(null, 'Browse problems →')}</> : <>
        <h1>{page === 'sign-up' ? 'A little practice, every day.' : 'Welcome back.'}</h1>
        <p className="account-muted">{page === 'sign-up' ? 'Create your rock em account.' : 'Sign in to your rock em account.'}</p>
        <form onSubmit={(event) => void submit(event)} className="auth-form">
          {page === 'sign-up' && <label>Name<input name="name" autoComplete="name" required maxLength={80} pattern=".*\S.*" /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<span className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={page === 'sign-up' ? 'new-password' : 'current-password'} minLength={page === 'sign-up' ? 12 : undefined} maxLength={72} required aria-describedby={page === 'sign-up' ? 'password-hint' : undefined} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          {page === 'sign-up' && <span id="password-hint" className="password-hint">Minimum 12 characters.</span>}
          {page === 'sign-in' && <div className="forgot-password-link">{link('forgot-password', 'Forgot password?')}</div>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy || checking}>{busy ? 'Please wait…' : page === 'sign-up' ? 'Create account →' : 'Sign in →'}</button>
        </form>
        <p className="auth-switch">{page === 'sign-up' ? 'Already have an account? ' : 'New here? '}{link(page === 'sign-up' ? 'sign-in' : 'sign-up', page === 'sign-up' ? 'Sign in' : 'Create an account')}</p>
      </>}
    </main> : null}
    <div hidden={page !== null}>{children}</div>
  </>;
}
