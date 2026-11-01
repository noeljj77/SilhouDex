import { Check, Copy, Download, Share2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useProgress } from '../../app/progressStore.ts';
import type { GameResult } from '../../domain/game/types.ts';
import type { PokemonIndexEntry } from '../../domain/pokemon/types.ts';
import { computeStreaks } from '../../domain/progression/streaks.ts';
import { SHARE_URL, buildShareText, cardFileName, shareDataFor } from '../../domain/share/text.ts';
import {
  canShareNatively,
  canvasToBlob,
  copyText,
  downloadBlob,
  ensureCardFonts,
  loadCardArtwork,
  renderCard,
  shareNatively,
} from './actions.ts';
import type { CardArtwork } from './drawCard.ts';

/**
 * Lets the player share a finished daily game: copy the text, save a picture card, or open the
 * phone's share sheet. By default nothing shared hints at the Pokémon; a switch adds it.
 */
export function ShareResult({ result, entry }: { result: GameResult; entry: PokemonIndexEntry }) {
  const { daily } = useProgress();
  const switchId = useId();
  const [spoilers, setSpoilers] = useState(false);
  const [artwork, setArtwork] = useState<CardArtwork | null>(null);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const streak = result.dateKey ? computeStreaks(daily.results, result.dateKey).current : 0;
  const data = useMemo(() => shareDataFor(result, streak), [result, streak]);
  const answer = useMemo(() => ({ id: entry.id, name: entry.name }), [entry.id, entry.name]);
  const text = data ? buildShareText(data, answer, { spoilers }) : '';

  // The spoiler card needs the full-colour picture; only fetch it once the player asks for spoilers.
  useEffect(() => {
    if (!spoilers) return;
    let cancelled = false;
    loadCardArtwork(entry.artworkUrl).then((loaded) => !cancelled && setArtwork(loaded));
    return () => {
      cancelled = true;
    };
  }, [spoilers, entry.artworkUrl]);

  const cardOptions = useMemo(
    () => ({
      spoilers,
      answer: spoilers ? answer : null,
      artwork: spoilers ? artwork : null,
      url: SHARE_URL,
    }),
    [spoilers, answer, artwork],
  );

  // The card is drawn with the site font, so wait until it has loaded (a canvas would otherwise
  // quietly use a different font).
  useEffect(() => {
    let cancelled = false;
    ensureCardFonts().then(() => !cancelled && setFontsReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // A small picture of the card, so the player sees what they are about to share.
  useEffect(() => {
    if (!data || !fontsReady) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      const canvas = renderCard(data, cardOptions);
      if (!cancelled) setPreview(canvas ? canvas.toDataURL('image/png') : null);
    });
    return () => {
      cancelled = true;
    };
  }, [data, cardOptions, fontsReady]);

  useEffect(() => () => clearTimeout(messageTimer.current), []);

  if (!data) return null;

  const say = (value: string) => {
    setMessage(value);
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(''), 4000);
  };

  const cardBlob = async () => {
    await ensureCardFonts();
    const canvas = renderCard(data, cardOptions);
    return canvas ? canvasToBlob(canvas) : null;
  };

  const onCopy = async () =>
    say(
      (await copyText(text))
        ? 'Result copied to the clipboard'
        : 'Could not copy. Select the text and copy it yourself.',
    );

  const onDownload = async () => {
    const blob = await cardBlob();
    if (!blob) return say('Could not make the card in this browser.');
    downloadBlob(blob, cardFileName(data, spoilers));
    say('Card saved');
  };

  const onShare = async () => {
    const blob = await cardBlob();
    const file = blob
      ? new File([blob], cardFileName(data, spoilers), { type: 'image/png' })
      : null;
    const outcome = await shareNatively({
      title: `SilhouDex #${data.challengeNumber}`,
      text,
      file,
    });
    if (outcome === 'failed') say('Sharing did not work. Try copying the result instead.');
  };

  return (
    <section
      aria-label="Share your result"
      className="flex flex-col gap-3 border-t-2 border-line pt-4"
    >
      <h3 className="font-display text-lg text-ink">Share your result</h3>

      <div className="flex flex-col gap-3 sm:flex-row">
        {preview && (
          <img
            src={preview}
            alt={
              spoilers
                ? `Preview of your result card, showing ${entry.name}`
                : 'Preview of your result card'
            }
            className="w-36 shrink-0 self-start rounded-xl border-2 border-ink"
          />
        )}
        <pre
          role="group"
          aria-label="Result text"
          className="min-w-0 flex-1 whitespace-pre-wrap break-words rounded-xl border-2 border-line bg-paper p-3 font-sans text-sm leading-relaxed text-ink"
        >
          {text}
        </pre>
      </div>

      <label
        htmlFor={switchId}
        className="flex w-fit cursor-pointer items-center gap-3 text-sm font-semibold text-ink"
      >
        <input
          id={switchId}
          type="checkbox"
          checked={spoilers}
          onChange={(e) => setSpoilers(e.target.checked)}
          className="size-5 accent-dex"
        />
        <span>
          Include the Pokémon <span className="font-normal text-ink-soft">(spoilers)</span>
        </span>
      </label>
      <p className="-mt-1 text-xs text-ink-soft">
        {spoilers
          ? 'The text and card will name the Pokémon.'
          : 'The text and card never mention the Pokémon.'}
      </p>

      <div className="flex flex-wrap gap-2">
        <ActionButton icon={<Copy size={16} aria-hidden />} onClick={onCopy}>
          Copy result
        </ActionButton>
        <ActionButton icon={<Download size={16} aria-hidden />} onClick={onDownload}>
          Download card
        </ActionButton>
        {canShareNatively() && (
          <ActionButton icon={<Share2 size={16} aria-hidden />} onClick={onShare}>
            Share
          </ActionButton>
        )}
      </div>

      <p
        role="status"
        aria-live="polite"
        className="flex min-h-5 items-center gap-1.5 text-sm font-semibold text-leaf"
      >
        {message && <Check size={14} aria-hidden />}
        {message}
      </p>
    </section>
  );
}

function ActionButton({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="dex-btn !text-sm">
      {icon}
      {children}
    </button>
  );
}
