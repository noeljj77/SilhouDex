# SilhouDex progress

_Last updated: 1 November 2026._ Daily Pokémon silhouette guessing game. Tagline: "Every shadow has a story."

## Where we are in one line

All ten milestones are built and the game is feature-complete. The Sora font, MIT licence and layout check are done and committed. What remains is switching on GitHub Pages (a setting only the repository owner can change) and choosing the real launch date.

## What we have accomplished

| Milestone            | What it added                                                                                                                                                                    | Commit    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| M0 Scaffold          | Vite, React 19, TypeScript, Tailwind, Vitest, lint and formatting                                                                                                                | `1fb29f5` |
| M1 Data layer        | Bundled index of all 1,025 Pokémon, PokéAPI client with retries and cache, name matching                                                                                         | `d57903e` |
| M2 Game engines      | Scoring rules, UTC daily schedule with a pinned Pokémon order, clue engine (22 clue types, name-leak safe)                                                                       | `792dd15` |
| M3 Silhouette reveal | Artwork turned into a black silhouette on a canvas (first version used tiles)                                                                                                    | `f2fe61f` |
| M4 Daily game        | Playable Daily screen, saved progress that survives refresh, locked finished days, navigation                                                                                    | `ac6a887` |
| M5 Practice          | Unlimited random games, difficulty picker, never touches daily stats, never picks today's answer                                                                                 | `aa18f99` |
| M6 Profile           | Streaks, monthly calendar, win-rate and guess-distribution statistics                                                                                                            | `bbf5c3f` |
| M7 Pokédex           | All 1,025 Pokémon, silhouettes for the undiscovered, filters, search, sorting, details                                                                                           | `b572188` |
| M8 Achievements      | 15 data-driven achievements, progress bars, unlock pop-ups                                                                                                                       | `e341e4d` |
| Reveal redo          | Replaced tiles and the grid with a smooth clockwise fog dissolve and sparkles (you chose A + D)                                                                                  | `53e3227` |
| M9 Sharing           | Copy result, PNG result card, phone share sheet, spoiler-free by default; next-day countdown in the Daily header                                                                 | `1654c95` |
| M10 launch work      | Accessibility fixes, error screen, offline notice, footer disclaimer, lazy-loaded pages, security policy, icons and social image, GitHub Pages workflow, README with screenshots | `e50afdb` |

Decisions you made along the way: any finished daily (win, loss or give-up) keeps the streak; "No Looking Back" means 5 games in a row without giving up; hosting on GitHub Pages; reveal style A + D with sparkles; Sora font; MIT licence.

## Current state

- **Repository:** https://github.com/noeljj77/SilhouDex, branch `main`. Everything is pushed, including the Sora font and licence commit. Every commit is authored by Noel John Jacob with no Claude credit.
- **Quality at the last commit:** formatting, type-check and lint clean; 637 tests pass; the production build works with zero console errors under the strict security policy. Axe found no violations and text contrast passes on every screen.
- **Automated checks on GitHub:** the first run passed formatting, lint, all 634 tests and the build on GitHub's servers. Only the final "publish" step failed, because GitHub Pages is not switched on yet.
- **Sora font: done.** The self-hosted Sora font (`@fontsource-variable/sora`, no outside font requests, so it works with the strict security policy) is used across the app. The share card waits for the font to load before it draws, so it never quietly falls back to another font.
- **Licence: done.** MIT `LICENSE` file, `license` field in `package.json`, and a README note.
- **Layout check: done.** Every page was checked at phone width (375px) and desktop width with Sora. No page scrolls sideways and no text overflows; the Pokédex generation chips and filter chips scroll sideways on purpose.
- **Final checks: done.** Formatting, lint, type-check, 637 tests and the production build all pass.
- **Dev server:** http://localhost:5173/ (restart with `npx vite --port 5173 --strictPort` if it is down).

## Next steps

**For you (I can't do these):**

1. **Switch on GitHub Pages:** repository **Settings → Pages → Source: GitHub Actions**. Then re-run the failed workflow from the Actions tab (or push anything). The site then appears at https://noeljj77.github.io/SilhouDex/.
2. **Give me the real launch date.** `LAUNCH_DATE` in `src/domain/daily/schedule.ts` is a placeholder (`2026-10-31`). It numbers every challenge, so it must be set before launch and never changed afterwards.
3. **Try it on a real phone** once it is live: the share sheet and card download can only be fully tested on a device.

**For me:**

1. Once the site is live, check the real address: loading, a full game, sharing, and the social preview.
2. Set the launch date you give me and confirm `SHARE_URL` and the social-preview address match the live site.
3. Optional before launch: a final code-review, simplify and security-review pass.

## After launch (V2, not started)

Backend and accounts, global leaderboard, progress that follows you between devices, and possibly extra game modes. The code is already split into layers (screens, pure game logic, storage) so a server can replace LocalStorage without touching the rules.

## Known limits

- **Frontend only:** a determined player can find the answer by inspecting the app's data. A backend (V2) is the only real fix.
- **Progress is per browser** (LocalStorage), so it does not follow you between devices.
- **Not tested on a real phone yet:** the share sheet and downloading the card.
- **Regional and alternate forms** count as their base Pokémon.

## Handy reference

- Run: `npm install`, `npm run dev`. Check everything: `npm run format:check`, `npm run lint`, `npm test`, `npm run build`.
- Rebuild the Pokémon list from PokéAPI: `npm run build:index`.
- Developer-only preview of the reveal: `#/lab`.
- A longer technical handoff for a new session is saved outside the repo at `C:\Users\Noel\AppData\Local\Temp\silhoudex-handoff.md`.
