import type { GameResult } from '../game/types.ts';
import type { SpeciesId } from '../pokemon/types.ts';
import type { Discovery } from './types.ts';
import { SCORING } from '../game/config.ts';
import type { DailyResults } from './streaks.ts';

export interface DailyStats {
  played: number;
  won: number;
  lost: number;
  gaveUp: number;
  /** 0–1. Zero when nothing has been played. */
  winRate: number;
  /** Mean score over every finished game, rounded. Zero when nothing has been played. */
  averageScore: number;
  bestScore: number;
  /** Games scored the maximum (solved with no wrong guess). */
  perfectGames: number;
  /** Wins by number of wrong guesses before the answer: index 0 = first try … index 5. */
  solvedWithWrongGuesses: number[];
  /** Games that ended without the answer (lost or gave up). */
  unsolved: number;
}

export interface PracticeStats {
  played: number;
  won: number;
  winRate: number;
  averageScore: number;
}

export interface CollectionStats {
  discovered: number;
  total: number;
  /** 0–100, one decimal. */
  percent: number;
}

const average = (xs: number[]) =>
  xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

export function computeDailyStats(results: DailyResults): DailyStats {
  const all = Object.values(results) as GameResult[];
  const won = all.filter((r) => r.status === 'won');
  const solvedWithWrongGuesses = Array.from({ length: SCORING.maxReveals + 1 }, () => 0);
  for (const r of won) {
    const slot = Math.min(r.wrongGuesses, SCORING.maxReveals);
    solvedWithWrongGuesses[slot] = (solvedWithWrongGuesses[slot] ?? 0) + 1;
  }
  return {
    played: all.length,
    won: won.length,
    lost: all.filter((r) => r.status === 'lost').length,
    gaveUp: all.filter((r) => r.status === 'gave_up').length,
    winRate: all.length === 0 ? 0 : won.length / all.length,
    averageScore: average(all.map((r) => r.score)),
    bestScore: all.reduce((best, r) => Math.max(best, r.score), 0),
    perfectGames: all.filter((r) => r.status === 'won' && r.score === SCORING.startScore).length,
    solvedWithWrongGuesses,
    unsolved: all.length - won.length,
  };
}

export function computePracticeStats(results: readonly GameResult[]): PracticeStats {
  const won = results.filter((r) => r.status === 'won').length;
  return {
    played: results.length,
    won,
    winRate: results.length === 0 ? 0 : won / results.length,
    averageScore: average(results.map((r) => r.score)),
  };
}

export function computeCollectionStats(
  discoveries: Readonly<Record<SpeciesId, Discovery>>,
  total: number,
): CollectionStats {
  const discovered = Object.keys(discoveries).length;
  return {
    discovered,
    total,
    percent: total === 0 ? 0 : Math.round((discovered / total) * 1000) / 10,
  };
}

export interface DistributionBucket {
  /** Short axis label: "0"–"5" wrong guesses, or "✕" for games not solved. */
  label: string;
  count: number;
  /** Plain-language description for tooltips and screen readers. */
  detail: string;
  unsolved?: boolean;
}

/** The bars of the guess-distribution chart, one per outcome. */
export function distributionBuckets(stats: DailyStats): DistributionBucket[] {
  const solved = stats.solvedWithWrongGuesses.map<DistributionBucket>((count, wrong) => ({
    label: String(wrong),
    count,
    detail:
      wrong === 0
        ? 'Solved on the first guess'
        : `Solved after ${wrong} wrong ${wrong === 1 ? 'guess' : 'guesses'}`,
  }));
  return [
    ...solved,
    { label: '✕', count: stats.unsolved, detail: 'Not solved (lost or gave up)', unsolved: true },
  ];
}
