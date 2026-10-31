# SilhouDex

> _Every shadow has a story._

SilhouDex is a daily Pokémon mystery guessing game. Study a partly hidden silhouette, unlock clues, and name the Pokémon before your score runs out. Everyone gets the same mystery Pokémon each UTC day.

**Status:** in development (V1).

## Features (V1 plan)

- **Daily Silhouette**: one shared Pokémon per UTC day, five reveal stages, five clues, scoring.
- **Practice**: unlimited random Pokémon, no effect on daily stats.
- **Progressive tile reveal**: the silhouette uncovers itself tile by tile with each wrong guess.
- **Daily streaks**: current and longest streak, plus a monthly calendar.
- **Discovery Pokédex**: collect every Pokémon you identify.
- **Achievements**: 15 unlockable goals.
- **Shareable results**: spoiler-free text and PNG result cards.

## Tech stack

React · TypeScript · Vite · Tailwind CSS · Motion · Lucide · Recharts · Vitest · React Testing Library · [PokéAPI](https://pokeapi.co/)

## Getting started

Requires **Node.js 22.13+**.

```bash
npm install
npm run dev
```

| Script               | What it does                        |
| -------------------- | ----------------------------------- |
| `npm run dev`        | Start the local dev server          |
| `npm run build`      | Type-check and build for production |
| `npm run preview`    | Preview the production build        |
| `npm test`           | Run the test suite once             |
| `npm run test:watch` | Run tests in watch mode             |
| `npm run lint`       | Lint the codebase                   |
| `npm run format`     | Format files with Prettier          |

## Project structure

```
scripts/          build-time tools (Pokédex index generation)
src/
  app/            app shell, routing, layout
  pages/          Daily, Practice, Pokédex, Achievements, Profile
  features/       UI grouped by feature (game, pokedex, achievements, stats, share)
  domain/         pure game logic, with no React and no browser APIs
  data/           Pokédex index and PokéAPI client and cache
  persistence/    storage schema, migrations, repository
  lib/            small shared utilities (seeded random, UTC dates)
  components/ui/  shared UI primitives
  test/           test setup and fixtures
```

## Disclaimer

SilhouDex is an unofficial, non-commercial fan project. It is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, Creatures Inc. or The Pokémon Company. Pokémon and Pokémon character names are trademarks of their respective owners. Pokémon data and artwork come from [PokéAPI](https://pokeapi.co/).
