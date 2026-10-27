import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PasswordReset from './PasswordReset';
import Account from './Account';

const token = 'a'.repeat(64);
const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
beforeEach(() => { window.history.replaceState(null, '', '/forgot-password'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Password reset', () => {
  it('opens from the sign-in page', async () => {
    window.history.replaceState(null, '', '/sign-in');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({}, 401)));
    render(<Account>Practice</Account>);
    fireEvent.click(await screen.findByRole('link', { name: 'Forgot password?' }));
    expect(window.location.pathname).toBe('/forgot-password');
    expect(screen.getByRole('button', { name: 'Send reset link →' })).toBeVisible();
  });

  it.each([202, 503, 429])('handles reset requests with status %s', async (status) => {
    const fetch = vi.fn().mockResolvedValue(json({}, status));
    vi.stubGlobal('fetch', fetch);
    render(<PasswordReset resetting={false} onReset={vi.fn()} signIn={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link →' }));
    expect(fetch).toHaveBeenCalledWith('/api/auth/forgot-password', expect.objectContaining({ body: JSON.stringify({ email: 'sam@example.com' }) }));
    if (status === 202) expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
    else expect(await screen.findByRole('alert')).toHaveTextContent(status === 503 ? 'unavailable' : 'Too many attempts');
  });

  it('validates confirmation then resets without automatically signing in', async () => {
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const onReset = vi.fn();
    render(<PasswordReset resetting onReset={onReset} signIn={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'a-new-secure-password' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match');
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'a-new-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password →' }));
    expect(await screen.findByRole('status')).toHaveTextContent('all sessions have been signed out');
    expect(onReset).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe('');
    expect(fetch).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({ body: JSON.stringify({ token, newPassword: 'a-new-secure-password' }) }));
  });

  it('rejects missing and expired links', async () => {
    const fetch = vi.fn().mockResolvedValue(json({}, 400));
    vi.stubGlobal('fetch', fetch);
    const view = render(<PasswordReset resetting onReset={vi.fn()} signIn={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('missing or invalid');
    expect(screen.queryByRole('button', { name: 'Update password →' })).not.toBeInTheDocument();
    view.unmount();
    window.history.replaceState(null, '', `/reset-password#token=${token}`);
    render(<PasswordReset resetting onReset={vi.fn()} signIn={vi.fn()} />);
    for (const name of ['New password', 'Confirm new password']) fireEvent.change(screen.getByLabelText(name), { target: { value: 'a-new-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password →' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('invalid or expired'));
  });
});
