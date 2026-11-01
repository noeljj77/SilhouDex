# Changelog

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
