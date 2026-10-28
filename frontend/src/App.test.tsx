import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./ChromeSculpture', () => ({ default: ({ topic }: { topic: string }) => <div aria-label={`Sculpture for ${topic}`}>{topic}</div> }))
const catalog = [
  { slug: 'array-api-task', title: 'Array API Task', category: 'Arrays', difficulty: 'easy', shortDescription: 'From the server' },
  { slug: 'stack-api-task', title: 'Stack API Task', category: 'Stack', difficulty: 'medium', shortDescription: 'From the server' },
  { slug: 'graph-api-task', title: 'Graph API Task', category: 'Graphs', difficulty: 'hard', shortDescription: 'From the server' },
]
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const detailFor = (slug: string, language: string) => ({
  ...(catalog.find(problem => problem.slug === slug) ?? catalog[0]), language,
  description: 'The statement supplied by the API.', requirements: ['Follow the language contract.'],
  examples: [{ input: 'value = 1', output: '1' }], constraints: ['value is an integer'],
  tests: [{ input: [1], expected: 1 }], functionName: 'solve', indexBase: 0,
  starter: language === 'javascript' ? 'function solve(value) {}' : 'def solve(value):\n    pass',
})
function handler(request: RequestInfo | URL) {
  const url = new URL(typeof request === 'string' ? request : request instanceof URL ? request.href : request.url, 'http://localhost')
  if (url.pathname === '/api/auth/me') return Promise.resolve(json({}, 401))
  if (url.pathname === '/api/problems') return Promise.resolve(json(catalog))
  if (url.pathname.endsWith('/languages')) return Promise.resolve(json(['python', 'javascript']))
  if (url.pathname.startsWith('/api/problems/')) return Promise.resolve(json(detailFor(url.pathname.split('/').at(-1)!, url.searchParams.get('language')!)))
  return Promise.resolve(json({}, 404))
}
beforeEach(() => {
  window.history.replaceState(null, '', '/')
  vi.stubGlobal('fetch', vi.fn(handler))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
function explore(name: string) {
  fireEvent.click(screen.getByText('Explore', { selector: 'summary' }))
  fireEvent.click(screen.getByRole('link', { name }))
}

describe('API-backed pages', () => {
  it('shows API problems and categories without a demo fallback or fake completions', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Loading problems…' })).toBeVisible()
    expect(await screen.findByRole('button', { name: /Array API Task/ })).toBeVisible()
    expect(screen.getAllByRole('link', { name: 'rock em' })).toHaveLength(1)
    expect(screen.getByLabelText('Sculpture for Arrays')).toBeVisible()
    expect(screen.getByText(/0 \/ 1 solved/)).toBeVisible()
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your Practice Dashboard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next topic' }))
    expect(screen.getByRole('button', { name: /Stack API Task/ })).toBeVisible()
  })

  it.each([
    ['/learn', 'Learning paths'], ['/progress', 'Practice review'],
    ['/generate', 'Generate a problem'], ['/about', 'About rock em'],
  ])('opens %s directly', async (path, heading) => {
    window.history.replaceState(null, '', path)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeVisible()
    expect(screen.queryByLabelText('Sculpture for Arrays')).not.toBeInTheDocument()
  })

  it('loads details by slug and preserves independent language drafts across navigation', async () => {
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /Array API Task/ }))
    expect(window.location.pathname).toBe('/problems/array-api-task')
    const python = await screen.findByRole('textbox', { name: 'python solution' })
    expect(python).toHaveValue('def solve(value):\n    pass')
    expect(screen.getByRole('button', { name: 'Run tests' })).toBeDisabled()
    fireEvent.change(python, { target: { value: 'python draft' } })
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'javascript' } })
    fireEvent.change(await screen.findByRole('textbox', { name: 'javascript solution' }), { target: { value: 'javascript draft' } })
    expect(screen.getByRole('button', { name: 'Run tests' })).toBeEnabled()
    explore('Generate a problem')
    expect(window.location.pathname).toBe('/generate')
    act(() => { window.history.replaceState(null, '', '/problems/array-api-task'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(await screen.findByRole('textbox', { name: 'javascript solution' })).toHaveValue('javascript draft')
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'python' } })
    expect(await screen.findByRole('textbox', { name: 'python solution' })).toHaveValue('python draft')
    fireEvent.click(screen.getByRole('link', { name: 'rock em' }))
    expect(await screen.findByLabelText('Sculpture for Arrays')).toBeVisible()
  })

  it('loads a direct problem URL even if the catalog is unavailable', async () => {
    window.history.replaceState(null, '', '/problems/graph-api-task')
    vi.mocked(fetch).mockImplementation(request => new URL(typeof request === 'string' ? request : (request as Request).url, 'http://localhost').pathname === '/api/problems' ? Promise.resolve(json({}, 500)) : handler(request as Request))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Graph API Task' })).toBeVisible()
    expect(screen.getByText('The statement supplied by the API.')).toBeVisible()
  })

  it('shows failures and retries without substituting hardcoded problems', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'Catalog offline' }, 503)))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog offline')
    expect(screen.queryByText('Two Sum')).not.toBeInTheDocument()
    vi.mocked(fetch).mockImplementation(handler)
    fireEvent.click(screen.getByRole('button', { name: 'Reload problems' }))
    expect(await screen.findByRole('button', { name: /Array API Task/ })).toBeVisible()
  })

  it('handles an empty catalog', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([])))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'No problems yet' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Next topic' })).not.toBeInTheDocument()
  })

  it('shares API topic selection with learning paths and account navigation', async () => {
    render(<App />)
    await screen.findByRole('button', { name: /Array API Task/ })
    fireEvent.click(screen.getByRole('button', { name: 'Next topic' }))
    explore('Learning paths')
    expect(screen.getByLabelText('Topic')).toHaveValue('Stack')
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Graphs' } })
    act(() => { window.history.replaceState(null, '', '/sign-in'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
    explore('Problems')
    await waitFor(() => expect(screen.getByLabelText('Sculpture for Graphs')).toBeVisible())
  })
})
