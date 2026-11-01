import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests run against the production build (served by `vite preview`), so they see the real
 * Content-Security-Policy and the real bundles. CI installs Chromium; locally, point them at a
 * browser you already have, for example `E2E_CHANNEL=msedge npm run test:e2e`.
 */
const channel = process.env.E2E_CHANNEL || undefined;
const port = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The game reads Pokémon data from PokéAPI, so a slow or hiccuping network gets a second chance.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Scanning the 1,025-tile Pokédex for accessibility problems takes about half a minute locally.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${port}/`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
