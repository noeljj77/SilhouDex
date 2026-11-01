import { describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types.ts';
import {
  buildShareText,
  cardFileName,
  outcomeLabel,
  revealProgressionRow,
  SHARE_URL,
  shareDataFor,
  stagesSeen,
  type ShareData,
} from './text.ts';

const data = (over: Partial<ShareData> = {}): ShareData => ({
  challengeNumber: 12,
  status: 'won',
  score: 70,
  wrongGuesses: 2,
  revealsUsed: 2,
  streak: 4,
  ...over,
});
const PIKACHU = { id: 25, name: 'Pikachu' };

const result = (over: Partial<GameResult> = {}): GameResult => ({
  sessionId: 'daily-2026-11-02',
  mode: 'daily',
  pokemonId: 25,
  status: 'won',
  score: 70,
  wrongGuesses: 2,
  revealsUsed: 2,
  completedAt: '2026-11-02T10:00:00.000Z',
  dateKey: '2026-11-02',
  challengeNumber: 12,
  ...over,
});

describe('shareDataFor', () => {
  it('turns a finished daily game into share data, with the streak', () => {
    expect(shareDataFor(result(), 4)).toEqual(data());
  });

  it('does not include the Pokémon or the date', () => {
    const shared = shareDataFor(result(), 4)!;
    expect(Object.keys(shared).sort()).toEqual(
      ['challengeNumber', 'revealsUsed', 'score', 'status', 'streak', 'wrongGuesses'].sort(),
    );
  });

  it('has nothing to share for a practice game', () => {
    expect(shareDataFor(result({ mode: 'practice', challengeNumber: undefined }), 4)).toBeNull();
  });
});

describe('revealProgressionRow', () => {
  it.each([
    [0, '🟪⬛⬛⬛⬛⬛'],
    [1, '🟪🟪⬛⬛⬛⬛'],
    [2, '🟪🟪🟪⬛⬛⬛'],
    [5, '🟪🟪🟪🟪🟪🟪'],
  ])('after %i reveals', (reveals, row) => {
    expect(revealProgressionRow(reveals)).toBe(row);
  });

  it('is always six squares, even for odd input', () => {
    for (const reveals of [-3, 0, 7, 99]) {
      expect(Array.from(revealProgressionRow(reveals))).toHaveLength(6);
    }
    expect(stagesSeen(99)).toBe(6);
    expect(stagesSeen(-3)).toBe(1);
  });
});

describe('buildShareText (spoiler-free)', () => {
  it('shows the challenge, progression, score, wrong guesses, streak and link', () => {
    expect(buildShareText(data())).toBe(
      [
        'SilhouDex #12 ✅',
        '🟪🟪🟪⬛⬛⬛',
        'Score 70/100 · 2 wrong guesses',
        '🔥 4-day streak',
        SHARE_URL,
      ].join('\n'),
    );
  });

  it('never gives the answer away, even if the answer is passed in', () => {
    const text = buildShareText(data(), PIKACHU);
    expect(text).not.toMatch(/pikachu/i);
    expect(text).not.toMatch(/spoiler/i);
    expect(text).not.toContain('#25');
    expect(text).toBe(buildShareText(data()));
  });

  it('uses the right wording for each way a game can end', () => {
    expect(
      buildShareText(data({ status: 'lost', score: 0, wrongGuesses: 6, revealsUsed: 5 })),
    ).toContain('SilhouDex #12 ❌');
    expect(buildShareText(data({ status: 'gave_up', score: 0 }))).toContain('SilhouDex #12 🏳️');
    expect(outcomeLabel('won')).toBe('Solved');
    expect(outcomeLabel('lost')).toBe('Not solved');
    expect(outcomeLabel('gave_up')).toBe('Gave up');
  });

  it('says "1 wrong guess" in the singular, and 0 correctly', () => {
    expect(buildShareText(data({ wrongGuesses: 1 }))).toContain('1 wrong guess\n');
    expect(buildShareText(data({ wrongGuesses: 0, revealsUsed: 0, score: 100 }))).toContain(
      'Score 100/100 · 0 wrong guesses',
    );
  });

  it('leaves out the streak line when there is no streak, and the link when asked', () => {
    expect(buildShareText(data({ streak: 0 }))).not.toContain('streak');
    expect(buildShareText(data(), null, { url: null })).not.toContain('http');
  });
});

describe('buildShareText (spoilers on)', () => {
  it('adds the answer on its own clearly marked line', () => {
    const text = buildShareText(data(), PIKACHU, { spoilers: true });
    expect(text).toContain('Spoiler: it was Pikachu (#25)');
    expect(text.split('\n').filter((line) => /pikachu/i.test(line))).toHaveLength(1);
  });

  it('is otherwise identical to the spoiler-free text', () => {
    const plain = buildShareText(data()).split('\n');
    const spoiled = buildShareText(data(), PIKACHU, { spoilers: true }).split('\n');
    expect(spoiled.filter((l) => !l.startsWith('Spoiler:'))).toEqual(plain);
  });

  it('adds nothing if there is no answer to show', () => {
    expect(buildShareText(data(), null, { spoilers: true })).toBe(buildShareText(data()));
  });
});

describe('cardFileName', () => {
  it('names the file by challenge, and marks spoiler cards', () => {
    expect(cardFileName(data(), false)).toBe('silhoudex-12.png');
    expect(cardFileName(data(), true)).toBe('silhoudex-12-spoiler.png');
  });
});
