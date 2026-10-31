import { CLUES_PER_GAME } from '../game/config.ts';
import type { ClueDifficulty } from './types.ts';

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

/**
 * Which clue strength each of the five slots asks for. Clue 1 is shown after the first wrong
 * guess, clue 5 after the fifth, so clues get stronger as the game goes on.
 */
export const DIFFICULTY_PROFILES: Record<DifficultyLevel, readonly ClueDifficulty[]> = {
  easy: [2, 2, 1, 1, 1],
  normal: [3, 3, 2, 2, 1],
  hard: [3, 3, 3, 2, 2],
};

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'normal';

for (const [level, slots] of Object.entries(DIFFICULTY_PROFILES)) {
  if (slots.length !== CLUES_PER_GAME)
    throw new Error(`Profile "${level}" must have ${CLUES_PER_GAME} slots`);
}

/**
 * When a slot has no usable clue, try other strengths: closest first, and the vaguer one first
 * on a tie, so a fallback never leaks more than the slot intended.
 */
export function fallbackOrder(wanted: ClueDifficulty): ClueDifficulty[] {
  const all: ClueDifficulty[] = [1, 2, 3];
  return all.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || b - a);
}
