import { describe, expect, it } from 'vitest';
import type { DateKey } from '../../lib/utcDate.ts';
import {
  createSession,
  getGameView,
  giveUp,
  scoreForWrongGuesses,
  submitGuess,
  toGameResult,
  viewFromResult,
} from './engine.ts';
import type { GameSession } from './types.ts';

const ANSWER = 25;
const T = '2026-11-02T10:00:00.000Z';
const fresh = (): GameSession =>
  createSession({ id: 's1', mode: 'practice', pokemonId: ANSWER, startedAt: T });

/** Makes N distinct wrong guesses (ids that are never the answer). */
function wrongGuesses(session: GameSession, n: number): GameSession {
  let s = session;
  for (let i = 0; i < n; i++) s = submitGuess(s, 100 + i, T).session;
  return s;
}

describe('scoring table', () => {
  it.each([
    [0, 100, 0, 0],
    [1, 85, 1, 1],
    [2, 70, 2, 2],
    [3, 55, 3, 3],
    [4, 40, 4, 4],
    [5, 25, 5, 5],
  ])('after %i wrong guesses: score %i, reveal %i, clues %i', (wrong, score, reveal, clues) => {
    const view = getGameView(wrongGuesses(fresh(), wrong));
    expect(view).toMatchObject({
      wrongGuesses: wrong,
      score,
      revealStage: reveal,
      cluesUnlocked: clues,
      isOver: false,
    });
  });

  it('never goes below zero', () => {
    expect(scoreForWrongGuesses(7)).toBe(0);
    expect(scoreForWrongGuesses(100)).toBe(0);
  });
});

describe('final guess', () => {
  it('shows the full silhouette and all clues, with one guess left', () => {
    const view = getGameView(wrongGuesses(fresh(), 5));
    expect(view).toMatchObject({
      revealStage: 5,
      cluesUnlocked: 5,
      isFinalGuess: true,
      guessesLeft: 1,
      isOver: false,
    });
  });

  it('is not the final guess earlier', () => {
    expect(getGameView(wrongGuesses(fresh(), 4)).isFinalGuess).toBe(false);
    expect(getGameView(wrongGuesses(fresh(), 4)).guessesLeft).toBe(2);
  });

  it('a correct final guess wins and keeps the 25 points', () => {
    const s = submitGuess(wrongGuesses(fresh(), 5), ANSWER, T).session;
    expect(s.status).toBe('won');
    expect(getGameView(s)).toMatchObject({ score: 25, isOver: true, guessesLeft: 0 });
  });

  it('a sixth wrong guess loses the game with zero points', () => {
    const { session, outcome } = submitGuess(wrongGuesses(fresh(), 5), 999, T);
    expect(outcome).toBe('wrong');
    expect(session.status).toBe('lost');
    expect(session.endedAt).toBe(T);
    expect(getGameView(session)).toMatchObject({
      score: 0,
      wrongGuesses: 6,
      revealStage: 5,
      isOver: true,
    });
  });
});

describe('submitGuess', () => {
  it('a correct first guess wins with 100 points', () => {
    const { session, outcome } = submitGuess(fresh(), ANSWER, T);
    expect(outcome).toBe('correct');
    expect(session.status).toBe('won');
    expect(getGameView(session).score).toBe(100);
  });

  it('a correct guess after some misses keeps the reduced score', () => {
    const s = submitGuess(wrongGuesses(fresh(), 2), ANSWER, T).session;
    expect(getGameView(s)).toMatchObject({ score: 70, wrongGuesses: 2, revealStage: 2 });
  });

  it('ignores a duplicate guess without any penalty', () => {
    const first = submitGuess(fresh(), 7, T).session;
    const { session, outcome } = submitGuess(first, 7, T);
    expect(outcome).toBe('duplicate');
    expect(session).toBe(first);
    expect(getGameView(session).wrongGuesses).toBe(1);
  });

  it('ignores guesses after the game is over', () => {
    const won = submitGuess(fresh(), ANSWER, T).session;
    const result = submitGuess(won, 7, T);
    expect(result.outcome).toBe('ignored');
    expect(result.session).toBe(won);
  });

  it('does not mutate the previous session', () => {
    const before = fresh();
    submitGuess(before, 7, T);
    expect(before.guesses).toHaveLength(0);
  });

  it('records each guess with its timestamp', () => {
    const s = submitGuess(fresh(), 7, T).session;
    expect(s.guesses).toEqual([{ pokemonId: 7, correct: false, at: T }]);
  });
});

describe('giveUp', () => {
  it('ends the game with zero points, whatever the score was', () => {
    const s = giveUp(wrongGuesses(fresh(), 1), T);
    expect(s.status).toBe('gave_up');
    expect(getGameView(s)).toMatchObject({ score: 0, isOver: true });
  });

  it('does nothing once the game is over', () => {
    const won = submitGuess(fresh(), ANSWER, T).session;
    expect(giveUp(won, T)).toBe(won);
  });
});

describe('viewFromResult', () => {
  it('shows a finished game fully revealed, with the saved score', () => {
    const result = toGameResult(giveUp(wrongGuesses(fresh(), 2), T));
    expect(viewFromResult(result)).toEqual({
      wrongGuesses: 2,
      score: 0,
      revealStage: 5,
      cluesUnlocked: 5,
      guessesLeft: 0,
      isFinalGuess: false,
      isOver: true,
    });
  });
});

describe('toGameResult', () => {
  it('builds a practice result', () => {
    const s = submitGuess(wrongGuesses(fresh(), 2), ANSWER, '2026-11-02T10:05:00.000Z').session;
    expect(toGameResult(s)).toEqual({
      sessionId: 's1',
      mode: 'practice',
      pokemonId: ANSWER,
      status: 'won',
      score: 70,
      wrongGuesses: 2,
      revealsUsed: 2,
      completedAt: '2026-11-02T10:05:00.000Z',
    });
  });

  it('carries the daily challenge details', () => {
    const daily = createSession({
      id: 'd1',
      mode: 'daily',
      pokemonId: ANSWER,
      startedAt: T,
      challengeNumber: 2,
      dateKey: '2026-11-02' as DateKey,
    });
    const result = toGameResult(giveUp(daily, T));
    expect(result).toMatchObject({
      mode: 'daily',
      status: 'gave_up',
      score: 0,
      challengeNumber: 2,
      dateKey: '2026-11-02',
    });
  });

  it('counts a lost game as six wrong guesses but five reveals', () => {
    const lost = submitGuess(wrongGuesses(fresh(), 5), 999, T).session;
    expect(toGameResult(lost)).toMatchObject({ status: 'lost', wrongGuesses: 6, revealsUsed: 5 });
  });

  it('refuses to build a result mid-game', () => {
    expect(() => toGameResult(fresh())).toThrow(/in progress/);
  });
});
