import { afterEach, describe, expect, it, vi } from 'vitest'
import { sentRequest } from '../../test/http'
import { generateProblem } from './api'

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
    expect(await sentRequest(fetchMock)).toMatchObject({
      method: 'POST',
      path: '/api/problems/generate',
      body: { topic: 'sliding window', theme: 'logistics', level: 'beginner' },
    })
  })

  it('surfaces the API error message', async () => {
    mockFetch(400, { error: 'topic is required' })

    await expect(generateProblem({ topic: '', theme: '', level: 'beginner' })).rejects.toThrow('topic is required')
  })
})
