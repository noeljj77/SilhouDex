/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * What the published site is allowed to load. It lists every place the app talks to, so anything
 * else (an injected script, a stray tracker) is blocked by the browser. Only added to the
 * production build: the dev server needs inline scripts for hot reloading.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Google's sign-in script (Firebase Auth opens its sign-in window with it).
  "script-src 'self' https://apis.google.com",
  // React and Motion set styles through the DOM, and some pieces carry inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  // Pokémon artwork and sprites come from PokéAPI's image repository; blob: and data: are the
  // silhouettes and result cards the app draws itself.
  // Google profile pictures come from googleusercontent.com.
  "img-src 'self' data: blob: https://raw.githubusercontent.com https://*.googleusercontent.com",
  // Firebase talks to Google's APIs for sign-in and for saving progress.
  "connect-src 'self' https://pokeapi.co https://*.googleapis.com",
  'frame-src https://accounts.google.com https://*.firebaseapp.com',
  "font-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'silhoudex-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  // Relative asset paths so the build works both locally and on GitHub Pages
  // (served from /SilhouDex/). Routing is hash-based, so no server rewrites are needed.
  base: './',
  plugins: [react(), tailwindcss(), contentSecurityPolicy()],
  build: {
    rolldownOptions: {
      output: {
        // Big libraries and the Pokémon list change rarely, so they get their own files and
        // stay cached in a returning visitor's browser when only the game code changes.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'motion',
              test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/,
              priority: 20,
            },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 10 },
            { name: 'pokedex-index', test: /pokedex-index\.json/, priority: 40 },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    restoreMocks: true,
  },
});
