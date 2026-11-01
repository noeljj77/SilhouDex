import { expect, test } from '@playwright/test';
import { openApp } from './support.ts';

const ROUTES = ['daily', 'practice', 'pokedex', 'achievements', 'profile'] as const;

test.describe('the production build', () => {
  test('every page loads with a clean console and no failed requests', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`console: ${m.text()}`);
    });
    page.on('pageerror', (e) => problems.push(`error: ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`);
    });

    await openApp(page);
    for (const route of ROUTES) {
      await page.goto(`/#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(500);
    }
    // Some artwork requests can be answered by an outside host's cache; only our own files must be perfect.
    expect(
      problems.filter((p) => !p.includes('raw.githubusercontent.com') && !p.includes('pokeapi.co')),
    ).toEqual([]);
  });

  test('ships a strict Content-Security-Policy that names exact hosts', async ({ page }) => {
    await openApp(page);
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/\*\.googleapis\.com|\*\.firebaseapp\.com|unsafe-eval/);
  });

  test('keeps the developer-only lab out of the published site', async ({ page }) => {
    await openApp(page, 'lab');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Challenge #1');
    await expect(page.getByText(/Silhouette Lab/)).toHaveCount(0);
  });

  test('an unknown address falls back to the Daily game', async ({ page }) => {
    await openApp(page, 'no-such-page');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Challenge #1');
  });

  test('has the metadata and icons a shared link and an installed app need', async ({
    page,
    request,
  }) => {
    await openApp(page);
    await expect(page).toHaveTitle(/SilhouDex/);
    expect(await page.locator('meta[name=description]').getAttribute('content')).toBeTruthy();
    expect(await page.locator('meta[property="og:image"]').getAttribute('content')).toContain(
      'og-image.png',
    );

    const manifest = await (await request.get('manifest.webmanifest')).json();
    expect(manifest.name).toBe('SilhouDex');
    for (const icon of manifest.icons as { src: string }[]) {
      expect((await request.get(icon.src)).status(), icon.src).toBe(200);
    }
    expect((await request.get('favicon.svg')).status()).toBe(200);
  });

  test('shows a Sign in button that opens Google when Firebase is set up', async ({ page }) => {
    await openApp(page, 'profile');
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
    // The button is offered because this site has Firebase settings. Its pop-up goes to Google,
    // which the tests never sign in to, so only the button itself is checked.
    await expect(page.getByRole('button', { name: 'Sign in with Google' }).first()).toBeEnabled();
  });
});
