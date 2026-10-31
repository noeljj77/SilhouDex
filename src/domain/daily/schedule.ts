import { createRng } from '../../lib/prng.ts';
import { daysBetween, msUntilNextUtcDay, toDateKey, type DateKey } from '../../lib/utcDate.ts';
import type { SpeciesId } from '../pokemon/types.ts';

/**
 * Date of Daily Challenge #1.
 * TODO: set to the real launch date. Do not change it after launch: it would renumber every
 * challenge and move every player's streak calendar.
 */
export const LAUNCH_DATE: DateKey = '2026-10-31';

/**
 * Daily pool v1: species 1..1025, shuffled once with a fixed seed.
 *
 * FROZEN. The answer for every future day comes from this order, so neither the seed, the size
 * nor the shuffle may change (a test pins it). Species added to the Pokédex later join through a
 * new pool version that starts on a chosen challenge number, never by editing this one.
 */
export const DAILY_POOL_V1_SEED = 'silhoudex-daily-v1';
export const DAILY_POOL_V1_SIZE = 1025;

let poolV1: readonly SpeciesId[] | undefined;

export function getDailyPool(): readonly SpeciesId[] {
  poolV1 ??= createRng(DAILY_POOL_V1_SEED).shuffle(
    Array.from({ length: DAILY_POOL_V1_SIZE }, (_, i) => i + 1),
  );
  return poolV1;
}

/** 1 on launch day, 2 the next day, … Throws before launch. */
export function getChallengeNumber(dateKey: DateKey, launchDate: DateKey = LAUNCH_DATE): number {
  const number = daysBetween(launchDate, dateKey) + 1;
  if (number < 1) throw new RangeError(`${dateKey} is before the launch date ${launchDate}`);
  return number;
}

/** The mystery Pokémon for a challenge number. Repeats only after the whole pool is used. */
export function getPokemonIdForChallenge(challengeNumber: number): SpeciesId {
  if (!Number.isInteger(challengeNumber) || challengeNumber < 1) {
    throw new RangeError(`Invalid challenge number ${challengeNumber}`);
  }
  const pool = getDailyPool();
  return pool[(challengeNumber - 1) % pool.length] as SpeciesId;
}

export interface DailyChallenge {
  challengeNumber: number;
  dateKey: DateKey;
  pokemonId: SpeciesId;
  /** Milliseconds until the next challenge (UTC midnight). */
  msUntilNext: number;
  /** Seed for clue selection and tile order, so every device sees the same challenge. */
  seed: string;
}

export function getDailyChallenge(now: Date, launchDate: DateKey = LAUNCH_DATE): DailyChallenge {
  const dateKey = toDateKey(now);
  const challengeNumber = getChallengeNumber(dateKey, launchDate);
  return {
    challengeNumber,
    dateKey,
    pokemonId: getPokemonIdForChallenge(challengeNumber),
    msUntilNext: msUntilNextUtcDay(now),
    seed: dailySeed(challengeNumber),
  };
}

export function dailySeed(challengeNumber: number): string {
  return `daily:#${challengeNumber}`;
}
