import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useProblemDetail } from './hooks';
import { getProblemDetail, getProblemLanguages, type ProblemDetail } from './api';

vi.mock('./api', async original => ({
  ...await original<typeof import('./api')>(),
  getProblemLanguages: vi.fn(), getProblemDetail: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

it('ignores an obsolete detail response after navigating to another problem', async () => {
  vi.mocked(getProblemLanguages).mockResolvedValue(['python']);
  let finishFirst!: (detail: ProblemDetail) => void;
  const first = new Promise<ProblemDetail>(resolve => { finishFirst = resolve; });
  const second = { slug: 'second', language: 'python' } as ProblemDetail;
  vi.mocked(getProblemDetail).mockImplementation(slug => slug === 'first' ? first : Promise.resolve(second));
  const { result, rerender, unmount } = renderHook(({ slug }) => useProblemDetail(slug), { initialProps: { slug: 'first' } });
  await waitFor(() => expect(getProblemDetail).toHaveBeenCalledWith('first', 'python', expect.any(AbortSignal)));
  const firstSignal = vi.mocked(getProblemDetail).mock.calls[0][2]!;
  rerender({ slug: 'second' });
  await waitFor(() => expect(result.current.data?.slug).toBe('second'));
  expect(firstSignal.aborted).toBe(true);
  await act(async () => { finishFirst({ slug: 'first', language: 'python' } as ProblemDetail); await first; });
  expect(result.current.data?.slug).toBe('second');
  unmount();
});
