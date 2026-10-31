import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../app/ProgressProvider.tsx';
import { createProgressStore } from '../app/progressStore.ts';
import { mapDetails } from '../data/pokeapi/mappers.ts';
import { getDailyPool, LAUNCH_DATE } from '../domain/daily/schedule.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import { createLocalRepository, STORAGE_KEY } from '../persistence/localRepository.ts';
import { addDays, type DateKey } from '../lib/utcDate.ts';
import { fixtures } from '../test/fixtures/pokeapi/index.ts';
import { DailyPage } from './DailyPage.tsx';

// The daily answer is Bulbasaur (#1): pick the date whose challenge maps to it.
vi.mock('../data/defaultRepository.ts', () => ({
  pokemonRepository: {
    getDetails: async () => {
      const { species, pokemon, chain } = (await import('../test/fixtures/pokeapi/index.ts'))
        .fixtures.bulbasaur;
      return (await import('../data/pokeapi/mappers.ts')).mapDetails(species, pokemon, chain);
    },
  },
}));
vi.mock('../features/game/silhouette/processArtwork.ts', () => ({
  processArtwork: async () => ({
    silhouetteUrl: 'blob:silhouette',
    colorUrl: 'blob:color',
    grid: { cols: 10, rows: 10, coverage: Array.from({ length: 100 }, () => 1) },
    width: 400,
    height: 400,
  }),
}));

const BULBASAUR_DAY = addDays(LAUNCH_DATE, getDailyPool().indexOf(1)) as DateKey;
const NAME = /bulbasaur/i;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${BULBASAUR_DAY}T12:00:00Z`));
});
afterEach(() => vi.useRealTimers());

function renderDaily() {
  const store = createProgressStore(createLocalRepository());
  return render(
    <ProgressProvider store={store}>
      <DailyPage />
    </ProgressProvider>,
  );
}

const stored = (): ProgressData => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const input = () => screen.getByRole('combobox', { name: 'Your guess' });
const points = () =>
  Number(screen.getByRole('progressbar', { name: 'Points left' }).getAttribute('aria-valuenow'));

async function ready() {
  await waitFor(() => expect(input()).toBeEnabled());
}

async function guess(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(input(), name);
  await user.click(screen.getByRole('button', { name: 'Guess' }));
}

describe('DailyPage: before the first challenge', () => {
  it('explains that the game has not started yet', () => {
    vi.setSystemTime(new Date(`${addDays(LAUNCH_DATE, -1)}T12:00:00Z`));
    renderDaily();
    expect(screen.getByRole('heading', { name: /first challenge is coming/i })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('DailyPage: playing', () => {
  it('shows today’s challenge without giving away the answer', async () => {
    renderDaily();
    await ready();
    expect(screen.getByRole('heading', { level: 1, name: /Challenge #\d+/ })).toBeInTheDocument();
    expect(points()).toBe(100);
    expect(document.body.textContent).not.toMatch(NAME);
    expect(document.body.innerHTML).not.toMatch(NAME);
    expect(screen.getAllByText(/unlocks after wrong guess/i)).toHaveLength(5);
  });

  it('a wrong guess costs 15 points, reveals more and unlocks a clue', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Charmander');

    expect(points()).toBe(85);
    expect(screen.getByRole('list', { name: 'Wrong guesses' })).toHaveTextContent('Charmander');
    expect(screen.getByText(/^Clue 1 ·/)).toBeInTheDocument();
    expect(screen.getAllByText(/unlocks after wrong guess/i)).toHaveLength(4);
    expect(screen.getByRole('status')).toHaveTextContent('Not Charmander. −15 points.');
    expect(
      screen.getByRole('img', { name: /Mystery Pokémon silhouette, 30% revealed/ }),
    ).toBeInTheDocument();
  });

  it('ignores a repeated guess without a penalty', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Charmander');
    await user.type(input(), 'Charmander{Enter}');

    expect(points()).toBe(85);
    expect(screen.getByRole('status')).toHaveTextContent('You already guessed Charmander.');
    expect(
      within(screen.getByRole('list', { name: 'Wrong guesses' })).getAllByRole('listitem'),
    ).toHaveLength(1);
  });

  it('refuses text that is not a Pokémon', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await user.type(input(), 'xyzzy{Enter}');
    expect(points()).toBe(100);
    expect(screen.getByRole('button', { name: 'Guess' })).toBeDisabled();
  });

  it('shows the final-guess warning after five misses, and a sixth miss loses', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    for (const name of ['Charmander', 'Squirtle', 'Pikachu', 'Eevee', 'Mew'])
      await guess(user, name);

    expect(points()).toBe(25);
    expect(screen.getByText(/Final guess!/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /100% revealed/ })).toBeInTheDocument();

    await guess(user, 'Ditto');
    const result = screen.getByRole('region', { name: 'Result' });
    expect(within(result).getByText('Out of guesses')).toBeInTheDocument();
    expect(within(result).getByText(/It was|The answer was/)).toBeInTheDocument();
    expect(result).toHaveTextContent(/Bulbasaur/);
    expect(stored().daily.results[BULBASAUR_DAY]).toMatchObject({
      status: 'lost',
      score: 0,
      wrongGuesses: 6,
    });
    expect(stored().discoveries).toEqual({});
  });
});

describe('DailyPage: finishing', () => {
  it('a correct guess wins, saves the result and adds a discovery', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Charmander');
    await guess(user, 'Bulbasaur');

    const result = await screen.findByRole('region', { name: 'Result' });
    expect(within(result).getByText('You got it!')).toBeInTheDocument();
    expect(result).toHaveTextContent('Bulbasaur');
    expect(result).toHaveTextContent('New discovery');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Revealed Pokémon artwork' })).toBeInTheDocument();

    const saved = stored();
    expect(saved.daily.results[BULBASAUR_DAY]).toMatchObject({
      status: 'won',
      score: 85,
      wrongGuesses: 1,
    });
    expect(saved.discoveries[1]).toMatchObject({ timesDiscovered: 1, modes: ['daily'] });
    expect(saved.daily.active).toBeUndefined();
  });

  it('a perfect first guess scores 100', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    expect(stored().daily.results[BULBASAUR_DAY]?.score).toBe(100);
  });

  it('giving up scores zero, reveals the answer, and is not a discovery', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reveal it' }));

    const result = await screen.findByRole('region', { name: 'Result' });
    expect(within(result).getByText('You gave up')).toBeInTheDocument();
    expect(result).toHaveTextContent('Bulbasaur');
    expect(stored().daily.results[BULBASAUR_DAY]).toMatchObject({ status: 'gave_up', score: 0 });
    expect(stored().discoveries).toEqual({});
  });

  it('lets you change your mind about giving up', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(screen.getByRole('button', { name: 'Give up' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Result' })).not.toBeInTheDocument();
  });
});

describe('DailyPage: refreshing the page', () => {
  it('resumes an unfinished game with the same guesses, score and clues', async () => {
    const user = userEvent.setup();
    const first = renderDaily();
    await ready();
    await guess(user, 'Charmander');
    await guess(user, 'Squirtle');
    first.unmount(); // like closing the tab

    renderDaily();
    await ready();
    expect(points()).toBe(70);
    expect(screen.getByRole('list', { name: 'Wrong guesses' })).toHaveTextContent(
      'CharmanderSquirtle',
    );
    expect(screen.getByText(/^Clue 2 ·/)).toBeInTheDocument();
  });

  it('cannot replay a finished day for a better score', async () => {
    const user = userEvent.setup();
    const first = renderDaily();
    await ready();
    await guess(user, 'Charmander');
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    first.unmount();

    renderDaily();
    const result = await screen.findByRole('region', { name: 'Result' });
    expect(within(result).getByText('You got it!')).toBeInTheDocument();
    expect(result).toHaveTextContent('85');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Give up' })).not.toBeInTheDocument();
    expect(stored().daily.results[BULBASAUR_DAY]?.score).toBe(85);
  });

  it('a locked day also stays locked after a loss or give-up', async () => {
    const user = userEvent.setup();
    const first = renderDaily();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
    await screen.findByRole('region', { name: 'Result' });
    first.unmount();

    renderDaily();
    expect(await screen.findByText('You gave up')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('ignores an unfinished game from a previous day', async () => {
    const user = userEvent.setup();
    const first = renderDaily();
    await ready();
    await guess(user, 'Charmander');
    first.unmount();

    // The next day: the old game should not carry over.
    vi.setSystemTime(new Date(`${addDays(BULBASAUR_DAY, 1)}T12:00:00Z`));
    renderDaily();
    await ready();
    expect(points()).toBe(100);
    expect(screen.queryByRole('list', { name: 'Wrong guesses' })).not.toBeInTheDocument();
  });
});

describe('DailyPage: data check', () => {
  it('uses real clue data for the answer', () => {
    const { species, pokemon, chain } = fixtures.bulbasaur;
    expect(mapDetails(species, pokemon, chain).id).toBe(1);
  });
});
