import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import PasswordReset from './PasswordReset';

type User = { displayName: string; email: string; role: "user" | "admin" };
type Page = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | null;
const currentPage = (): Page => {
  const path = window.location.pathname.slice(1);
  return path === 'sign-in' || path === 'sign-up' || path === 'forgot-password' || path === 'reset-password' ? path : null;
};

async function accountRequest(path: string, body?: unknown): Promise<User | null> {
  const response = await fetch(`/api/auth/${({ session: "me", "sign-in": "login", "sign-up": "register", "sign-out": "logout" })[path as "session" | "sign-in" | "sign-up" | "sign-out"]}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (path === 'session' && response.status === 401) return null;
  if (path === 'sign-out' && response.ok) return null;
  if (response.status === 404 || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Account access is not available yet. Please try again later.');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('The email or password is incorrect. Please try again.');
    if (response.status === 409) throw new Error('An account with this email already exists. Try signing in.');
    if (response.status === 400) {
      const data = await response.json();
      throw new Error(typeof data.error === 'string' ? data.error : 'Please check your account details.');
    }
    throw new Error('Unable to complete your request. Please try again.');
  }
  const data = await response.json();
  if (typeof data?.displayName !== 'string' || typeof data?.email !== 'string') throw new Error('Unable to load your account. Please try again.');
  return data;
}

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
    accountRequest('session').then((next) => { if (active) setUser(next); }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    const onPop = () => { setPage(currentPage()); setError(''); setShowPassword(false); };
    const dismiss = (event: PointerEvent) => {
      if (profile.current && !profile.current.contains(event.target as Node)) profile.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && profile.current?.open) {
        profile.current.open = false;
        profile.current.querySelector('summary')?.focus();
      }
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { active = false; window.removeEventListener('popstate', onPop); document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, []);

  function navigate(next: Page) {
    window.history.pushState(null, '', next ? `/${next}` : '/');
    setPage(next);
    setError('');
    setShowPassword(false);
    window.scrollTo(0, 0);
  }

  function link(next: Page, label: string, className?: string) {
    return <a className={className} href={next ? `/${next}` : '/'} onClick={(event) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); navigate(next);
    }}>{label}</a>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || checking) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const next = await accountRequest(page!, {
        email: String(data.get('email')).trim(), password: data.get('password'),
        ...(page === 'sign-up' ? { displayName: String(data.get('name')).trim() } : {}),
      });
      setUser(next); navigate(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError('');
    try { await accountRequest('sign-out', {}); setUser(null); navigate(null); }
    catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  }

  return <>
    <header className="site-header">
      {link(null, 'rock em', 'site-brand')}
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
      {page === 'forgot-password' || page === 'reset-password' ? <PasswordReset resetting={page === 'reset-password'} onReset={() => setUser(null)} signIn={() => navigate('sign-in')} /> : user ? <><h1>You’re signed in</h1><p className="account-muted">Continue practicing as {user.displayName}.</p>{link(null, 'Browse problems →')}</> : <>
        <h1>{page === 'sign-up' ? 'A little practice, every day.' : 'Welcome back.'}</h1>
        <p className="account-muted">{page === 'sign-up' ? 'Create your rock em account.' : 'Sign in to your rock em account.'}</p>
        <form onSubmit={(event) => void submit(event)} className="auth-form">
          {page === 'sign-up' && <label>Name<input name="name" autoComplete="name" required maxLength={80} pattern=".*\S.*" /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          <label>Password<span className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={page === 'sign-up' ? 'new-password' : 'current-password'} minLength={page === 'sign-up' ? 12 : undefined} maxLength={72} required aria-describedby={page === 'sign-up' ? 'password-hint' : undefined} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
          {page === 'sign-up' && <span id="password-hint" className="password-hint">Use 12–72 bytes (12–72 characters for plain English text).</span>}
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
