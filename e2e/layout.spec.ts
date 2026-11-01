import { expect, test } from '@playwright/test';
import { openApp, seededProgress } from './support.ts';

const ROUTES = ['daily', 'practice', 'pokedex', 'achievements', 'profile'] as const;

// Phones, the awkward in-between sizes, tablets and desktops. 768 and 320 each caught a real bug.
const WIDTHS = [320, 360, 375, 414, 600, 768, 1023, 1024, 1280, 1920];

test.describe('layout', () => {
  for (const width of WIDTHS) {
    test(`nothing scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openApp(page, 'daily', { progress: seededProgress() });
      for (const route of ROUTES) {
        await page.goto(`/#/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${route} at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  test('the tab bar sits at the bottom until the desktop breakpoint', async ({ page }) => {
    await openApp(page);
    for (const [width, position] of [
      [390, 'fixed'],
      [768, 'fixed'],
      [1280, 'static'],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      const nav = page.getByRole('navigation', { name: 'Main' });
      await expect(nav).toBeVisible();
      expect(await nav.evaluate((el) => getComputedStyle(el).position), `${width}px`).toBe(
        position,
      );
    }
  });
});
