# Changelog

## Unreleased

### Added

- Browser tests (Playwright) run in CI against the production build: a full Daily game, layouts from 320 to 1920 pixels wide, and an accessibility scan of every screen and dialog.
- A security policy (`SECURITY.md`).

### Fixed

- The page scrolled sideways on tablets (768px) and on the narrowest phones (320px); the Profile page also stretched past the screen once the chart appeared.
- Pokédex tiles are now named by the number they show, so voice-control users can say what they see.
- The small day numbers in the calendar's coloured cells were too faint to read.

## 1.0.0 (1 November 2026)

First public release.

### Game

- Daily Silhouette with five reveal stages, five clues and a score that drops per wrong guess. The same Pokémon for everyone each UTC day, locked once finished.
- Practice mode with unlimited games and Easy, Normal and Hard clue strengths, kept apart from daily statistics.
- Discovery Pokédex of all 1,025 Pokémon, with search, filters and sorting.
- Daily streaks, a monthly calendar and win-rate and guess-distribution statistics.
- 15 achievements.
- Shareable results: spoiler-free text, a PNG result card and the phone share sheet.
- A first-visit How to play card.

### Accounts

- Optional sign in with Google. Progress is merged with the device's progress and saved to the account, and a failed load can never overwrite a good save.

### Design and quality

- Pokédex-device look with a "Who's that Pokémon?" screen, an HP-style score bar and LCD clue cards.
- Over 660 automated tests, axe-clean on every screen, a strict Content-Security-Policy and per-player Firestore rules.
- Published to GitHub Pages by a CI pipeline that must pass first.
