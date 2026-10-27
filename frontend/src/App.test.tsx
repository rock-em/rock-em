import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./ChromeSculpture', () => ({ default: ({ topic }: { topic: string }) => <div aria-label={`Sculpture for ${topic}`}>{topic}</div> }))

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

function explore(name: string) {
  fireEvent.click(screen.getByText('Explore', { selector: 'summary' }))
  fireEvent.click(screen.getByRole('link', { name }))
}

describe('Page navigation', () => {
  it('keeps the homepage focused on topics and problems', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Programming practice' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'rock em' })).toHaveLength(1)
    expect(screen.getByLabelText('Sculpture for Arrays')).toBeVisible()
    expect(screen.getByRole('button', { name: /Two Sum/ })).toBeVisible()
    expect(screen.queryByText('A place to practice programming', { exact: false })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Generate a problem' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Your Practice Dashboard' })).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it.each([
    ['/learn', 'Learning paths'], ['/progress', 'Practice review'],
    ['/generate', 'Generate a problem'], ['/about', 'About rock em'],
  ])('opens %s directly', (path, heading) => {
    window.history.replaceState(null, '', path)
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    expect(screen.queryByLabelText('Sculpture for Arrays')).not.toBeInTheDocument()
  })

  it('preserves code when switching pages and handles history navigation', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Two Sum/ }))
    expect(window.location.pathname).toBe('/problems/1')
    fireEvent.change(screen.getByRole('textbox', { name: 'JavaScript solution' }), { target: { value: 'my draft' } })
    explore('Generate a problem')
    expect(window.location.pathname).toBe('/generate')
    expect(screen.getByRole('heading', { name: 'Generate a problem' })).toBeVisible()
    act(() => { window.history.replaceState(null, '', '/problems/1'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('textbox', { name: 'JavaScript solution' })).toHaveValue('my draft')
    fireEvent.click(screen.getByRole('link', { name: 'rock em' }))
    expect(window.location.pathname).toBe('/')
    expect(screen.getByLabelText('Sculpture for Arrays')).toBeVisible()
  })

  it('shares topic selection with the learning page and returns to browsing from account pages', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Next topic' }))
    explore('Learning paths')
    expect(screen.getByLabelText('Topic')).toHaveValue('Stack')
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'Graphs' } })
    act(() => { window.history.replaceState(null, '', '/sign-in'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
    explore('Problems')
    expect(screen.getByLabelText('Sculpture for Graphs')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Welcome back.' })).not.toBeInTheDocument()
  })
})
