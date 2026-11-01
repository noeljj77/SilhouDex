import { processArtwork } from '../game/silhouette/processArtwork.ts';
import type { ShareData } from '../../domain/share/text.ts';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  drawShareCard,
  type CardArtwork,
  type CardOptions,
} from './drawCard.ts';

/**
 * Makes sure the card font is ready before the card is drawn. A canvas silently uses a fallback
 * font if the real one has not loaded yet, which would make the card look different each time.
 */
export async function ensureCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all(
      ['500', '600', '700', '800'].map((weight) =>
        document.fonts.load(`${weight} 24px "Sora Variable"`),
      ),
    );
  } catch {
    // The card still draws with the fallback font.
  }
}

/** Draws the result card on a new canvas, or returns null if this browser cannot draw. */
export function renderCard(data: ShareData, options: CardOptions): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawShareCard(ctx, data, options);
  return canvas;
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

/** Loads the full-colour artwork for a spoiler card. Resolves to null if it cannot be loaded. */
export async function loadCardArtwork(artworkUrl: string): Promise<CardArtwork | null> {
  try {
    const processed = await processArtwork(artworkUrl);
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load the artwork'));
      img.src = processed.colorUrl;
    });
    return { image, width: processed.width, height: processed.height };
  } catch {
    return null;
  }
}

/** Copies text to the clipboard. Returns whether it worked. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the older method
  }
  try {
    const box = document.createElement('textarea');
    box.value = value;
    box.setAttribute('readonly', '');
    box.style.position = 'fixed';
    box.style.opacity = '0';
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Saves a file to the player's device. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** True where the browser offers its own share sheet (mostly phones). */
export const canShareNatively = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export type ShareOutcome = 'shared' | 'cancelled' | 'failed';

/**
 * Opens the device's share sheet. Sends the card as an image where the device allows files,
 * otherwise just the text.
 */
export async function shareNatively(content: {
  title: string;
  text: string;
  file?: File | null;
}): Promise<ShareOutcome> {
  try {
    const files =
      content.file && navigator.canShare?.({ files: [content.file] }) ? [content.file] : undefined;
    await navigator.share({
      title: content.title,
      text: content.text,
      ...(files ? { files } : {}),
    });
    return 'shared';
  } catch (error) {
    // Closing the share sheet is not an error.
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
