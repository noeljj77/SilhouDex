import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProcessedArtwork } from './processArtwork.ts';
import { processArtwork } from './processArtwork.ts';
import { useSilhouette } from './useSilhouette.ts';

vi.mock('./processArtwork.ts', () => ({ processArtwork: vi.fn() }));
const mockProcess = vi.mocked(processArtwork);

const fake = (name: string): ProcessedArtwork => ({
  silhouette: {} as HTMLCanvasElement,
  colorUrl: `blob:${name}-color`,
  alpha: new Uint8ClampedArray(1).fill(255),
  alphaWidth: 1,
  alphaHeight: 1,
  width: 10,
  height: 10,
});

beforeEach(() => mockProcess.mockReset());

describe('useSilhouette', () => {
  it('starts loading, then becomes ready', async () => {
    mockProcess.mockResolvedValue(fake('a'));
    const { result } = renderHook(() => useSilhouette('https://img/a.png'));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({
      status: 'ready',
      artwork: { colorUrl: 'blob:a-color' },
    });
    expect(mockProcess).toHaveBeenCalledWith('https://img/a.png');
  });

  it('reports an error, and retry tries again', async () => {
    mockProcess.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(fake('a'));
    const { result } = renderHook(() => useSilhouette('https://img/a.png'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockProcess).toHaveBeenCalledTimes(2);
  });

  it('goes back to loading when the artwork changes, never showing the old picture', async () => {
    mockProcess.mockResolvedValueOnce(fake('a')).mockResolvedValueOnce(fake('b'));
    const { result, rerender } = renderHook(({ url }) => useSilhouette(url), {
      initialProps: { url: 'https://img/a.png' },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    rerender({ url: 'https://img/b.png' });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({ artwork: { colorUrl: 'blob:b-color' } });
  });

  it('ignores a slow result for artwork that is no longer shown', async () => {
    let resolveA!: (value: ProcessedArtwork) => void;
    // First call (artwork a) stays pending; the second call (artwork b) resolves at once.
    mockProcess
      .mockReturnValueOnce(new Promise<ProcessedArtwork>((resolve) => (resolveA = resolve)))
      .mockResolvedValueOnce(fake('b'));
    const { result, rerender } = renderHook(({ url }) => useSilhouette(url), {
      initialProps: { url: 'https://img/a.png' },
    });
    rerender({ url: 'https://img/b.png' });
    await waitFor(() =>
      expect(result.current).toMatchObject({ artwork: { colorUrl: 'blob:b-color' } }),
    );
    await act(async () => resolveA(fake('a')));
    expect(result.current).toMatchObject({ artwork: { colorUrl: 'blob:b-color' } });
  });

  it('stays loading when there is no artwork yet', () => {
    const { result } = renderHook(() => useSilhouette(null));
    expect(result.current.status).toBe('loading');
    expect(mockProcess).not.toHaveBeenCalled();
  });
});
