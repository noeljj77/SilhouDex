import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { dailySeed, getPokemonIdForChallenge } from '../src/domain/daily/schedule.ts';
import { createEmptyProgress, recordGameEnd } from '../src/domain/progression/record.ts';
import type { DateKey } from '../src/lib/utcDate.ts';

export const PROGRESS_KEY = 'silhoudex:v1:progress';
export const HELP_KEY = 'silhoudex:v1:seen-how-to-play';

/** Challenge #1 is 1 November 2026. The tests run on this fixed day, whatever today's date is. */
export const DAY_ONE = '2026-11-01T10:00:00Z';

const index = JSON.parse(
  readFileSync(new URL('../src/data/pokedex-index.json', import.meta.url), 'utf-8'),
) as { entries: { id: number; name: string }[] };

export const nameOf = (id: number) => index.entries.find((e) => e.id === id)?.name ?? `#${id}`;

/** The mystery Pokémon for a challenge number, worked out the same way the game does. */
export const answerFor = (challengeNumber: number) =>
  nameOf(getPokemonIdForChallenge(challengeNumber));

export { dailySeed };

/** A believable save: daily results for days 1 to `days` (with one missed and one lost day) and some practice wins. */
export function seededProgress(days = 11): string {
  let data = createEmptyProgress('2026-11-01T08:00:00.000Z', 'e2e-player');
  for (let day = 1; day <= days; day++) {
    if (day === 5) continue;
    const date = `2026-11-${String(day).padStart(2, '0')}` as DateKey;
    const lost = day === 8;
    data = recordGameEnd(data, {
      sessionId: `daily-${date}`,
      mode: 'daily',
      pokemonId: getPokemonIdForChallenge(day),
      status: lost ? 'lost' : 'won',
      score: lost ? 0 : 85,
      wrongGuesses: lost ? 6 : 1,
      revealsUsed: lost ? 5 : 1,
      completedAt: `${date}T09:00:00.000Z`,
      dateKey: date,
      challengeNumber: day,
    }).data;
  }
  [1, 4, 7, 25, 39, 150, 151, 249, 385, 448].forEach((id, i) => {
    data = recordGameEnd(data, {
      sessionId: `practice-${i}`,
      mode: 'practice',
      pokemonId: id,
      status: 'won',
      score: 100,
      wrongGuesses: 0,
      revealsUsed: 0,
      completedAt: `2026-11-0${2 + (i % 8)}T18:00:00.000Z`,
    }).data;
  });
  return JSON.stringify(data);
}

export interface OpenOptions {
  /** The clock for the page (ISO text). Defaults to the morning of day one. */
  now?: string;
  /** A saved game to start from, as returned by seededProgress. Nothing is saved when omitted. */
  progress?: string;
  /** Show the first-visit help card. It is dismissed by default so it never gets in the way. */
  showHelp?: boolean;
}

/** Opens the app on a fixed day with a known save, ready to play. */
export async function openApp(page: Page, route = 'daily', options: OpenOptions = {}) {
  await page.clock.install({ time: new Date(options.now ?? DAY_ONE) });
  await page.addInitScript(
    ({ progress, showHelp, progressKey, helpKey }) => {
      // Runs on every load, so it only seeds once per tab and lets refreshes keep their own state.
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.clear();
      if (progress) localStorage.setItem(progressKey, progress);
      if (!showHelp) localStorage.setItem(helpKey, '1');
    },
    {
      progress: options.progress ?? null,
      showHelp: options.showHelp ?? false,
      progressKey: PROGRESS_KEY,
      helpKey: HELP_KEY,
    },
  );
  await page.goto(`/#/${route}`);
}

export const guessBox = (page: Page) => page.getByRole('combobox', { name: 'Your guess' });

/** Types a name and submits it with Enter. */
export async function guess(page: Page, name: string) {
  const box = guessBox(page);
  await box.click();
  await box.fill(name);
  await box.press('Enter');
}

/** Waits for the silhouette to be drawn. */
export const gameReady = (page: Page) => expect(page.locator('canvas')).toBeVisible();

/** Closes achievement pop-ups, which sit over the header for a few seconds. */
export async function dismissToasts(page: Page) {
  const buttons = page.locator('div.fixed[aria-live=polite] button');
  for (let quiet = 0; quiet < 3;) {
    if (await buttons.count()) {
      await buttons.first().click({ force: true });
      quiet = 0;
    } else {
      quiet++;
    }
    await page.waitForTimeout(350);
  }
}

/** The page's visible text on one line, for readable assertions. */
export const pageText = async (page: Page) =>
  (await page.locator('body').innerText()).replace(/\s+/g, ' ');
