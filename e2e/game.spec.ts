import { expect, test } from '@playwright/test';
import {
  PROGRESS_KEY,
  answerFor,
  generationOf,
  dismissToasts,
  gameReady,
  guess,
  guessBox,
  openApp,
  pageText,
} from './support.ts';

test.describe('the Daily game', () => {
  test('a full game: miss, refresh, win, then the day stays locked', async ({ page }) => {
    const answer = answerFor(1);
    await openApp(page);
    await gameReady(page);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Challenge #1');
    await expect(page.getByRole('group', { name: 'Score' })).toContainText('100');

    // A wrong guess costs 15 points, shows the miss and unlocks the first clue.
    await guess(page, 'Pikachu');
    await expect(page.getByRole('group', { name: 'Score' })).toContainText('85');
    await expect(page.getByText('Not Pikachu. −15 points.')).toBeVisible();
    await expect(page.getByText(/Clue 1 ·/)).toBeVisible();

    // The same guess cannot be made twice.
    await guessBox(page).fill('Pikachu');
    await expect(page.getByRole('button', { name: 'Guess', exact: true })).toBeDisabled();
    await guessBox(page).fill('');

    // Refreshing in the middle of a game picks it up where it was.
    await page.reload();
    await gameReady(page);
    await expect(page.getByRole('group', { name: 'Score' })).toContainText('85');
    await expect(page.getByRole('list', { name: 'Wrong guesses' })).toContainText('Pikachu');

    // The right answer ends the game and adds the Pokémon to the Pokédex.
    await guess(page, answer);
    const result = page.getByRole('region', { name: 'Result', exact: true });
    await expect(result).toContainText('You got it!');
    await expect(result).toContainText(answer);
    await expect(result).toContainText('New discovery added to your Pokédex');
    await expect(page.getByRole('timer')).toBeVisible();
    await dismissToasts(page);

    // Once finished, the day cannot be played again.
    await page.reload();
    await expect(page.getByRole('region', { name: 'Result', exact: true })).toContainText(
      'You got it!',
    );
    await expect(guessBox(page)).toHaveCount(0);
    await expect(page.getByText('1-day streak', { exact: true })).toBeVisible();
  });

  test('the shared result hides the Pokémon unless asked', async ({ page }) => {
    const answer = answerFor(1);
    await openApp(page);
    await gameReady(page);
    await guess(page, answer);
    await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible();
    await dismissToasts(page);

    const text = page.getByRole('group', { name: 'Result text' });
    await expect(text).toContainText('SilhouDex #1');
    await expect(text).not.toContainText(answer);
    await expect(page.getByAltText(/Preview of your result card/)).toBeVisible();

    await page.getByLabel(/Include the Pokémon/).check();
    await expect(text).toContainText(answer);
  });

  test('the win shows up in the Pokédex, Profile and Achievements', async ({ page }) => {
    const answer = answerFor(1);
    await openApp(page);
    await gameReady(page);
    await guess(page, answer);
    await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible();
    await dismissToasts(page);

    await page.goto('/#/pokedex');
    await expect(page.getByRole('heading', { level: 1, name: 'Pokédex' })).toBeVisible();
    await expect(page.getByText(/1\s*of 1025 discovered/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(`^#\\d{4} ${answer}$`) }),
    ).toBeVisible();
    expect(await pageText(page)).not.toContain('Bulbasaur');

    await page.goto('/#/profile');
    await expect(page.getByText(/Current streak\s*1/)).toBeVisible();
    await expect(page.getByLabel(/^1 November: Won/)).toBeVisible();

    await page.goto('/#/achievements');
    await expect(page.getByRole('heading', { level: 1, name: 'Achievements' })).toBeVisible();
    await expect(page.getByText('First Discovery')).toBeVisible();
    await expect(page.getByText(/Unlocked 1 November 2026/).first()).toBeVisible();
  });

  test('moves on to the next challenge after UTC midnight', async ({ page }) => {
    await openApp(page, 'daily', { now: '2026-11-01T23:59:50Z' });
    await gameReady(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Challenge #1');
    await page.clock.fastForward(20_000);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Challenge #2');
    await expect(guessBox(page)).toBeVisible();
  });
});

test.describe('Practice', () => {
  test('keeps its results apart from the daily record', async ({ page }) => {
    await openApp(page, 'practice');
    await gameReady(page);

    await guess(page, 'Eevee');
    await expect(page.getByRole('radio', { name: 'Hard' })).toBeDisabled();
    await page.getByRole('button', { name: 'Give up' }).click();
    await page.getByRole('button', { name: /reveal it/ }).click();
    await expect(page.getByRole('button', { name: 'Next Pokémon' })).toBeVisible();

    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
      PROGRESS_KEY,
    );
    expect(saved.schemaVersion).toBe(1);
    expect(saved.practice.results).toHaveLength(1);
    expect(Object.keys(saved.daily.results)).toHaveLength(0);

    await page.getByRole('button', { name: 'Next Pokémon' }).click();
    await expect(guessBox(page)).toBeVisible();
  });
});

test.describe('Practice generations', () => {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

  test('only picks Pokémon from the chosen generations, and remembers the choice', async ({
    page,
  }) => {
    await openApp(page, 'practice');
    await gameReady(page);

    // Leave only Generation I switched on.
    for (let g = 2; g <= 9; g++) {
      await page.getByRole('button', { name: `Gen ${ROMAN[g - 1]}`, exact: true }).click();
    }
    await expect(page.getByRole('button', { name: 'Gen I', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText(/151 Pokémon in play/)).toBeVisible();

    // The last one cannot be switched off.
    await page.getByRole('button', { name: 'Gen I', exact: true }).click({ force: true });
    await expect(page.getByRole('button', { name: 'Gen I', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Pichu is from Generation II, so it can never be the answer here. The guess saves the game.
    await gameReady(page);
    await guess(page, 'Pichu');
    await expect(page.getByText('Not Pichu. −15 points.')).toBeVisible();

    const mystery = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}').practice?.active?.pokemonId as number,
      PROGRESS_KEY,
    );
    expect(generationOf(mystery)).toBe(1);

    // The choice is locked during a game.
    await expect(page.getByRole('button', { name: 'Gen II', exact: true })).toBeDisabled();
    await expect(page.getByText(/Generations can be changed between games/)).toBeVisible();

    // It survives a refresh.
    await page.reload();
    await gameReady(page);
    await expect(page.getByRole('button', { name: 'Gen II', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Gen I', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('resilience', () => {
  test('a corrupt save does not break the app', async ({ page }) => {
    await openApp(page, 'daily', {
      progress: '{"schemaVersion":1,"daily":"nonsense","discoveries":[1,2]}',
    });
    await gameReady(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Challenge #1');
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('says so when the connection drops, and stops when it returns', async ({
    page,
    context,
  }) => {
    await openApp(page);
    await gameReady(page);
    await context.setOffline(true);
    await expect(page.getByRole('status').filter({ hasText: /offline/i })).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByRole('status').filter({ hasText: /offline/i })).toHaveCount(0);
  });

  test('shows the how-to-play card once, on a first visit', async ({ page }) => {
    await openApp(page, 'daily', { showHelp: true });
    const card = page.getByRole('dialog', { name: 'How to play' });
    await expect(card).toBeVisible();
    await page.getByRole('button', { name: 'Got it' }).click();
    await expect(card).toBeHidden();
    await page.reload();
    await gameReady(page);
    await expect(card).toHaveCount(0);
    await page.getByRole('button', { name: 'How to play' }).click();
    await expect(card).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
  });
});
