import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Account from './Account';

const user = { displayName: 'Sam Rivers', role: 'admin', email: 'sam@example.com' };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => { window.history.replaceState(null, '', '/'); vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Account', () => {
  it('opens dedicated pages and preserves the practice content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, 401)));
    render(<Account><textarea aria-label="Draft" defaultValue="my solution" /></Account>);
    fireEvent.click(await screen.findByRole('link', { name: 'Sign up' }));
    expect(window.location.pathname).toBe('/sign-up');
    expect(screen.getByLabelText('Name')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Draft' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Back to problems/ }));
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('my solution');
  });

  it('signs in, displays returned profile data, and signs out', async () => {
    window.history.replaceState(null, '', '/sign-in');
    const fetch = vi.fn().mockResolvedValueOnce(response({}, 401)).mockResolvedValueOnce(response(user)).mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    render(<Account><p>Practice</p></Account>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in →' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in →' }));
    await waitFor(() => expect(window.location.pathname).toBe('/'));
    fireEvent.click(screen.getByText(user.displayName, { selector: '.profile-name' }));
    expect(screen.getByText(user.email)).toBeVisible();
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/auth/login', expect.objectContaining({ credentials: 'include', body: JSON.stringify({ email: user.email, password: 'test-password' }) }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  it('shows an honest error when account services are unavailable', async () => {
    window.history.replaceState(null, '', '/sign-up');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response({}, 401)).mockResolvedValueOnce(response({}, 404)));
    render(<Account>Practice</Account>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create account →' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: user.displayName } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Account access is not available yet');
    expect(window.location.pathname).toBe('/sign-up');
  });
  it.each([201, 409])('uses the registration contract for status %s', async (status) => {
    window.history.replaceState(null, '', '/sign-up');
    const fetch = vi.fn().mockResolvedValueOnce(response({}, 401)).mockResolvedValueOnce(response(status === 201 ? user : {}, status));
    vi.stubGlobal('fetch', fetch);
    render(<Account>Practice</Account>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create account →' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: user.displayName } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-secure-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account →' }));
    expect(fetch).toHaveBeenNthCalledWith(2, '/api/auth/register', expect.objectContaining({ body: JSON.stringify({ email: user.email, password: 'a-secure-password', displayName: user.displayName }) }));
    if (status === 201) {
      await waitFor(() => expect(window.location.pathname).toBe('/'));
      fireEvent.click(screen.getByText(user.displayName, { selector: '.profile-name' }));
      expect(screen.getByText('Admin')).toBeVisible();
    } else {
      expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
      expect(window.location.pathname).toBe('/sign-up');
    }
  });

});
