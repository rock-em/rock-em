import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('renders one brand link and an accessible practice heading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Programming practice' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'rock em' })).toHaveLength(1)
  })
})
