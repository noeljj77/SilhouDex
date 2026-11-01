import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  answerFor,
  dismissToasts,
  gameReady,
  guess,
  guessBox,
  openApp,
  seededProgress,
} from './support.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Fails with a readable list of what is wrong and where. */
async function expectNoViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(
    (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`,
  );
  expect(summary, label).toEqual([]);
}

for (const [name, width] of [
  ['phone', 390],
  ['desktop', 1280],
] as const) {
  test.describe(`accessibility on a ${name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
    });

    for (const route of ['daily', 'practice', 'pokedex', 'achievements', 'profile']) {
      test(`${route} has no violations`, async ({ page }) => {
        await openApp(page, route, { progress: seededProgress() });
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForTimeout(800);
        await expectNoViolations(page, route);
      });
    }

    test('a game in progress, with the suggestion list open, has no violations', async ({
      page,
    }) => {
      await openApp(page);
      await gameReady(page);
      await guess(page, 'Pikachu');
      await expect(page.getByText(/Not Pikachu/)).toBeVisible();
      await guessBox(page).fill('Eev');
      await expect(page.getByRole('listbox')).toBeVisible();
      await expectNoViolations(page, 'game with suggestions');
    });

    test('a finished game with the share panel has no violations', async ({ page }) => {
      await openApp(page);
      await gameReady(page);
      await guess(page, answerFor(1));
      await expect(page.getByRole('region', { name: 'Result', exact: true })).toBeVisible();
      await dismissToasts(page);
      await expectNoViolations(page, 'result');
    });

    test('the dialogs have no violations', async ({ page }) => {
      await openApp(page, 'daily', { progress: seededProgress(), showHelp: true });
      await expect(page.getByRole('dialog', { name: 'How to play' })).toBeVisible();
      await expectNoViolations(page, 'how to play');
      await page.keyboard.press('Escape');

      await page.goto('/#/pokedex');
      await page.getByRole('button', { name: /^#0001 Bulbasaur$/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoViolations(page, 'Pokédex details (discovered)');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: /^#0002 undiscovered$/ }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectNoViolations(page, 'Pokédex details (undiscovered)');
    });
  });
}

test.describe('keyboard and motion', () => {
  test('Tab reaches the guess box, which has a clear focus ring', async ({ page }) => {
    await openApp(page, 'practice');
    await gameReady(page);
    let reached = false;
    for (let i = 0; i < 30 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(
        () => document.activeElement?.getAttribute('role') === 'combobox',
      );
    }
    expect(reached).toBe(true);
    const outline = await page.evaluate(
      () => getComputedStyle(document.activeElement as Element).outlineWidth,
    );
    expect(parseFloat(outline)).toBeGreaterThanOrEqual(2);
  });

  test('reduced motion stops the decorative animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page);
    await gameReady(page);
    const names = await page.evaluate(() => ({
      sunburst: getComputedStyle(document.querySelector('.sunburst') as Element).animationName,
      sparkle: getComputedStyle(document.querySelector('.sparkle') as Element).animationName,
    }));
    expect(names).toEqual({ sunburst: 'none', sparkle: 'none' });
  });
});
