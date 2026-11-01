import { CircleHelp } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useDialogKeys } from '../../components/useDialogKeys.ts';
import { SCORING } from '../../domain/game/config.ts';
import { hasSeenHowToPlay, markHowToPlaySeen } from './howToPlayMemory.ts';

const STEPS = [
  'Study the shadow. Everyone gets the same mystery Pokémon each day.',
  `Type a name and press Guess. You start with ${SCORING.startScore} points, and every wrong guess costs ${SCORING.wrongGuessPenalty}.`,
  `Each wrong guess lifts more of the fog and unlocks a clue. After ${SCORING.maxReveals} wrong guesses everything is revealed, and you get one final guess.`,
  'Name it to add it to your Pokédex and keep your daily streak. Practice has unlimited games.',
];

/** A help button in the header, and the card it opens. The card also opens by itself on a first visit. */
export function HowToPlay() {
  const [open, setOpen] = useState(() => !hasSeenHowToPlay());
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    markHowToPlaySeen();
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="How to play"
        onClick={() => setOpen(true)}
        className="dex-btn !size-10 !min-h-0 !rounded-full !p-0"
      >
        <CircleHelp size={20} aria-hidden />
      </button>
      {open && <HowToPlayCard onClose={close} />}
    </>
  );
}

function HowToPlayCard({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const onKeyDown = useDialogKeys(panelRef, onClose);

  useEffect(() => confirmRef.current?.focus(), []);

  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="dex-card flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto !rounded-3xl p-5"
      >
        <h2 id={titleId} className="font-display text-3xl text-ink">
          How to play
        </h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-volt font-display text-sm text-ink"
              >
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-ink">{step}</p>
            </li>
          ))}
        </ol>
        <button ref={confirmRef} type="button" onClick={onClose} className="dex-btn dex-btn-yellow">
          Got it
        </button>
      </div>
    </div>
  );
}
