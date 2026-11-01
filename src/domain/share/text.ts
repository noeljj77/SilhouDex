import { SCORING } from '../game/config.ts';
import type { FinishedStatus, GameResult } from '../game/types.ts';

/** Where the game lives. Added to shared results so friends can play. */
export const SHARE_URL = 'https://noeljj77.github.io/SilhouDex/';

/** The six picture stages the reveal passes through (the opening view plus five reveals). */
export const REVEAL_STAGES = SCORING.maxReveals + 1;

/** Everything a shared result shows. It never holds the Pokémon: that is passed in separately. */
export interface ShareData {
  challengeNumber: number;
  status: FinishedStatus;
  score: number;
  wrongGuesses: number;
  revealsUsed: number;
  /** Current daily streak, including this game. */
  streak: number;
}

/** The answer, only ever used when the player turns spoilers on. */
export interface ShareAnswer {
  id: number;
  name: string;
}

/** Builds share data from a finished daily game. Practice games have no challenge to share. */
export function shareDataFor(result: GameResult, streak: number): ShareData | null {
  if (result.mode !== 'daily' || result.challengeNumber === undefined) return null;
  return {
    challengeNumber: result.challengeNumber,
    status: result.status,
    score: result.score,
    wrongGuesses: result.wrongGuesses,
    revealsUsed: result.revealsUsed,
    streak,
  };
}

const OUTCOME: Record<FinishedStatus, { icon: string; label: string }> = {
  won: { icon: '✅', label: 'Solved' },
  lost: { icon: '❌', label: 'Not solved' },
  gave_up: { icon: '🏳️', label: 'Gave up' },
};

export const outcomeLabel = (status: FinishedStatus) => OUTCOME[status].label;

/** How many of the six picture stages the player got to see. */
export const stagesSeen = (revealsUsed: number) =>
  Math.min(REVEAL_STAGES, Math.max(1, revealsUsed + 1));

/** A row of squares: purple for each picture stage seen, dark for the ones never needed. */
export function revealProgressionRow(revealsUsed: number): string {
  const seen = stagesSeen(revealsUsed);
  return '🟪'.repeat(seen) + '⬛'.repeat(REVEAL_STAGES - seen);
}

const wrongGuessCount = (n: number) => (n === 1 ? '1 wrong guess' : n + ' wrong guesses');

export interface ShareTextOptions {
  /** Include the answer. Off by default: the shared text must not give the Pokémon away. */
  spoilers?: boolean;
  /** Link to the game, or null to leave it out. */
  url?: string | null;
}

/**
 * The text a player pastes into a chat. The spoiler-free version contains no hint of the answer:
 * it never reads `answer`, so passing one in cannot leak it.
 */
export function buildShareText(
  data: ShareData,
  answer: ShareAnswer | null = null,
  options: ShareTextOptions = {},
): string {
  const { spoilers = false, url = SHARE_URL } = options;
  const lines = [
    `SilhouDex #${data.challengeNumber} ${OUTCOME[data.status].icon}`,
    revealProgressionRow(data.revealsUsed),
    `Score ${data.score}/${SCORING.startScore} · ${wrongGuessCount(data.wrongGuesses)}`,
  ];
  if (data.streak > 0) lines.push(`🔥 ${data.streak}-day streak`);
  if (spoilers && answer) lines.push(`Spoiler: it was ${answer.name} (#${answer.id})`);
  if (url) lines.push(url);
  return lines.join('\n');
}

/** A file name for the downloadable card. */
export const cardFileName = (data: ShareData, spoilers: boolean) =>
  `silhoudex-${data.challengeNumber}${spoilers ? '-spoiler' : ''}.png`;
