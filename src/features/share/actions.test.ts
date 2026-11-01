import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canShareNatively,
  copyText,
  downloadBlob,
  ensureCardFonts,
  shareNatively,
} from './actions.ts';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

const setNavigator = (props: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
};

describe('copyText', () => {
  it('uses the clipboard when it is there', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    expect(await copyText('hello')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to the older copy command when the clipboard is blocked', async () => {
    setNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const exec = vi.fn().mockReturnValue(true);
    document.execCommand = exec;
    expect(await copyText('hello')).toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull(); // cleaned up
  });

  it('reports failure when nothing works', async () => {
    setNavigator({ clipboard: undefined });
    document.execCommand = vi.fn().mockReturnValue(false);
    expect(await copyText('hello')).toBe(false);
  });
});

describe('downloadBlob', () => {
  it('saves the file under the given name', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:card');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    downloadBlob(new Blob(['x']), 'silhoudex-12.png');
    expect(click).toHaveBeenCalledTimes(1);
    const clicked = click.mock.contexts[0] as HTMLAnchorElement;
    expect(clicked.download).toBe('silhoudex-12.png');
    expect(clicked.href).toBe('blob:card');
    expect(document.querySelector('a[download]')).toBeNull(); // link removed again
    vi.advanceTimersByTime(1500);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:card');
    vi.useRealTimers();
  });
});

describe('native sharing', () => {
  it('is only offered where the browser has a share sheet', () => {
    setNavigator({ share: undefined });
    expect(canShareNatively()).toBe(false);
    setNavigator({ share: vi.fn() });
    expect(canShareNatively()).toBe(true);
  });

  it('shares the text, and the card as a file when the device accepts files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: () => true });
    const file = new File(['x'], 'silhoudex-12.png', { type: 'image/png' });
    expect(await shareNatively({ title: 'SilhouDex #12', text: 'my result', file })).toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'SilhouDex #12',
      text: 'my result',
      files: [file],
    });
  });

  it('shares only the text when the device cannot take files', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: () => false });
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await shareNatively({ title: 't', text: 'my result', file });
    expect(share).toHaveBeenCalledWith({ title: 't', text: 'my result' });
  });

  it('works when the browser has no canShare at all', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: undefined });
    await shareNatively({ title: 't', text: 'x', file: new File(['x'], 'a.png') });
    expect(share).toHaveBeenCalledWith({ title: 't', text: 'x' });
  });

  it('treats closing the share sheet as a normal outcome, not an error', async () => {
    setNavigator({ share: vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')) });
    expect(await shareNatively({ title: 't', text: 'x' })).toBe('cancelled');
  });

  it('reports a real failure', async () => {
    setNavigator({ share: vi.fn().mockRejectedValue(new Error('boom')) });
    expect(await shareNatively({ title: 't', text: 'x' })).toBe('failed');
  });
});

describe('ensureCardFonts', () => {
  const setFonts = (fonts: unknown) =>
    Object.defineProperty(document, 'fonts', { value: fonts, configurable: true });

  it('waits for every weight the card uses before drawing', async () => {
    const load = vi.fn().mockResolvedValue([]);
    setFonts({ load });
    await ensureCardFonts();
    expect(load.mock.calls.map((call) => call[0])).toEqual([
      '500 24px "Sora Variable"',
      '600 24px "Sora Variable"',
      '700 24px "Sora Variable"',
      '800 24px "Sora Variable"',
      '600 24px "Fredoka Variable"',
      '700 24px "Fredoka Variable"',
    ]);
  });

  it('does nothing in a browser without the font loading API', async () => {
    setFonts(undefined);
    await expect(ensureCardFonts()).resolves.toBeUndefined();
  });

  it('still lets the card draw (with a fallback font) if the font fails to load', async () => {
    setFonts({ load: vi.fn().mockRejectedValue(new Error('network')) });
    await expect(ensureCardFonts()).resolves.toBeUndefined();
  });
});
