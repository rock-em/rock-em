import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateProblem } from './generateProblem'

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('generateProblem', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the request and returns the problem', async () => {
    const fetchMock = mockFetch(200, { title: 'Late Shipment Window' })

    const problem = await generateProblem({ topic: 'sliding window', theme: 'logistics', level: 'beginner' })

    expect(problem.title).toBe('Late Shipment Window')
    expect(fetchMock).toHaveBeenCalledWith('/api/problems/generate', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      topic: 'sliding window',
      theme: 'logistics',
      level: 'beginner',
    })
  })

  it('surfaces the API error message', async () => {
    mockFetch(400, { error: 'topic is required' })

    await expect(generateProblem({ topic: '', theme: '', level: 'beginner' })).rejects.toThrow('topic is required')
  })
})
