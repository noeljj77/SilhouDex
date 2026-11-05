import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../app/ProgressProvider.tsx';
import { createProgressStore } from '../app/progressStore.ts';
import { getDailyPool, LAUNCH_DATE } from '../domain/daily/schedule.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import { pokedexIndex } from '../data/pokedexIndex.ts';
import { pickPracticePokemonId } from '../domain/practice/select.ts';
import { createLocalRepository, STORAGE_KEY } from '../persistence/localRepository.ts';
import { PracticePage } from './PracticePage.tsx';

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
    silhouette: {},
    colorUrl: 'blob:color',
    alpha: new Uint8ClampedArray(100).fill(255),
    alphaWidth: 10,
    alphaHeight: 10,
    width: 400,
    height: 400,
  }),
}));
// Wrap the real picker so tests can choose which Pokémon appears.
vi.mock('../domain/practice/select.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../domain/practice/select.ts')>();
  return { ...actual, pickPracticePokemonId: vi.fn(actual.pickPracticePokemonId) };
});

const picker = vi.mocked(pickPracticePokemonId);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${LAUNCH_DATE}T12:00:00Z`)); // challenge #1
  picker.mockReturnValue(1); // Bulbasaur
});
afterEach(() => {
  vi.useRealTimers();
  picker.mockClear();
});

function renderPractice() {
  const store = createProgressStore(createLocalRepository());
  return render(
    <ProgressProvider store={store}>
      <PracticePage />
    </ProgressProvider>,
  );
}

const stored = (): ProgressData => JSON.parse(localStorage.getItem(STORAGE_KEY)!);
const input = () => screen.getByRole('combobox', { name: 'Your guess' });
const points = () =>
  Number(screen.getByRole('progressbar', { name: 'Points left' }).getAttribute('aria-valuenow'));
const ready = () => waitFor(() => expect(input()).toBeEnabled());
const guess = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.type(input(), name);
  await user.click(screen.getByRole('button', { name: 'Guess' }));
};

describe('PracticePage', () => {
  it('starts a game and says it never affects the daily streak', async () => {
    renderPractice();
    await ready();
    expect(screen.getByRole('heading', { level: 1, name: 'Practice' })).toBeInTheDocument();
    expect(screen.getByText(/Never affects your daily streak/)).toBeInTheDocument();
    expect(points()).toBe(100);
    expect(document.body.innerHTML).not.toMatch(/bulbasaur/i);
  });

  it('never picks today’s daily answer, and avoids recent Pokémon', async () => {
    renderPractice();
    await ready();
    expect(picker).toHaveBeenCalledTimes(1);
    const [, all, recent, excluded] = picker.mock.calls[0]!;
    expect(all).toHaveLength(1025);
    expect(excluded).toEqual([getDailyPool()[0]]);
    expect(recent).toEqual([]);
  });

  it('plays a full game: miss, then win, with results and a discovery saved', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await guess(user, 'Charmander');
    expect(points()).toBe(85);
    await guess(user, 'Bulbasaur');

    const result = await screen.findByRole('region', { name: 'Result' });
    expect(within(result).getByText('You got it!')).toBeInTheDocument();
    expect(result).toHaveTextContent('New discovery');

    const saved = stored();
    expect(saved.practice.results).toHaveLength(1);
    expect(saved.practice.results[0]).toMatchObject({
      mode: 'practice',
      pokemonId: 1,
      status: 'won',
      score: 85,
    });
    expect(saved.discoveries[1]).toMatchObject({ modes: ['practice'], timesDiscovered: 1 });
    expect(saved.practice.active).toBeUndefined();
  });

  it('has no share option (practice games are not part of the daily challenge)', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    expect(screen.queryByRole('region', { name: 'Share your result' })).not.toBeInTheDocument();
  });

  it('never touches daily results, daily progress or the streak data', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    const saved = stored();
    expect(saved.daily).toEqual({ results: {} });
  });

  it('giving up scores zero and is not a discovery', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
    await screen.findByText('You gave up');
    expect(stored().practice.results[0]).toMatchObject({ status: 'gave_up', score: 0 });
    expect(stored().discoveries).toEqual({});
  });

  it('keeps the same Pokémon and guesses after a refresh, without picking again', async () => {
    const user = userEvent.setup();
    const first = renderPractice();
    await ready();
    await guess(user, 'Charmander');
    first.unmount();
    picker.mockClear();
    picker.mockReturnValue(2); // would be a different Pokémon if it re-rolled

    renderPractice();
    await ready();
    expect(picker).not.toHaveBeenCalled();
    expect(points()).toBe(85);
    expect(screen.getByRole('list', { name: 'Wrong guesses' })).toHaveTextContent('Charmander');
    expect(stored().practice.active?.pokemonId).toBe(1);
  });

  it('“Next Pokémon” starts a fresh game and remembers recent Pokémon', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });

    picker.mockClear();
    picker.mockReturnValue(4);
    await user.click(screen.getByRole('button', { name: 'Next Pokémon' }));
    await ready();

    expect(screen.queryByRole('region', { name: 'Result' })).not.toBeInTheDocument();
    expect(points()).toBe(100);
    expect(picker).toHaveBeenCalledTimes(1);
    expect(picker.mock.calls[0]![2]).toEqual([1]); // Bulbasaur is "recent" now
    expect(screen.getByText(/Games played: 1\./)).toBeInTheDocument();
  });

  it('can play as many rounds as you like', async () => {
    const user = userEvent.setup();
    renderPractice();
    for (let i = 0; i < 3; i++) {
      await ready();
      await guess(user, 'Bulbasaur');
      await screen.findByRole('region', { name: 'Result' });
      await user.click(screen.getByRole('button', { name: 'Next Pokémon' }));
    }
    expect(stored().practice.results).toHaveLength(3);
    expect(stored().discoveries[1]?.timesDiscovered).toBe(3);
  });
});

describe('PracticePage: difficulty', () => {
  it('saves the chosen difficulty', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Hard' }));
    expect(screen.getByRole('radio', { name: 'Hard' })).toBeChecked();
    expect(stored().settings.difficulty).toBe('hard');
  });

  it('locks once the game has started, and unlocks for the next game', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await guess(user, 'Charmander');
    expect(screen.getByRole('radio', { name: 'Easy' })).toBeDisabled();
    expect(screen.getByText(/Difficulty can be changed between games/)).toBeInTheDocument();

    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    expect(screen.getByRole('radio', { name: 'Easy' })).toBeDisabled(); // finished game keeps its clues

    await user.click(screen.getByRole('button', { name: 'Next Pokémon' }));
    await ready();
    expect(screen.getByRole('radio', { name: 'Easy' })).toBeEnabled();
  });

  it('remembers the difficulty after a refresh', async () => {
    const user = userEvent.setup();
    const first = renderPractice();
    await ready();
    await user.click(screen.getByRole('radio', { name: 'Easy' }));
    first.unmount();
    renderPractice();
    await ready();
    expect(screen.getByRole('radio', { name: 'Easy' })).toBeChecked();
  });
});

describe('PracticePage: generations', () => {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  const gen = (n: number) => `Gen ${ROMAN[n - 1]}`;
  const chip = (name: string) => screen.getByRole('button', { name });
  /** The Pokémon the page most recently chose from. */
  const lastPool = () => (picker.mock.calls.at(-1)?.[1] ?? []) as number[];
  const generationOf = (id: number) => pokedexIndex.getById(id)!.generation;

  /** Leaves only Gen I on. */
  const onlyGenerationOne = async (user: ReturnType<typeof userEvent.setup>) => {
    for (let g = 2; g <= 9; g++) await user.click(chip(gen(g)));
  };

  it('starts with every generation, and says how many Pokémon are in play', async () => {
    renderPractice();
    await ready();
    for (let g = 1; g <= 9; g++) expect(chip(gen(g))).toHaveAttribute('aria-pressed', 'true');
    expect(lastPool()).toHaveLength(pokedexIndex.entries.length);
    expect(
      screen.getByText(new RegExp(`${pokedexIndex.entries.length} Pokémon in play`)),
    ).toBeInTheDocument();
  });

  it('only picks Pokémon from the chosen generations', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await onlyGenerationOne(user);
    const pool = lastPool();
    expect(pool.length).toBeGreaterThan(0);
    expect(new Set(pool.map(generationOf))).toEqual(new Set([1]));
    expect(screen.getByText(/151 Pokémon in play/)).toBeInTheDocument();
    expect(stored().settings.generations).toEqual([1]);
  });

  it('always keeps at least one generation on', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await onlyGenerationOne(user);
    await user.click(chip('Gen I'));
    expect(chip('Gen I')).toHaveAttribute('aria-pressed', 'true');
    expect(stored().settings.generations).toEqual([1]);
  });

  it('turns every generation back on with All', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await user.click(chip('Gen IV'));
    expect(chip('All')).toBeEnabled();
    await user.click(chip('All'));
    expect(stored().settings.generations).toHaveLength(9);
    expect(chip('All')).toBeDisabled();
  });

  it('picks a new Pokémon when the choice changes before the first guess', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    const before = picker.mock.calls.length;
    await user.click(chip('Gen IX'));
    expect(picker.mock.calls.length).toBe(before + 1);
  });

  it('locks once the game has started, and unlocks for the next game', async () => {
    const user = userEvent.setup();
    renderPractice();
    await ready();
    await guess(user, 'Charmander');
    expect(chip('Gen I')).toBeDisabled();
    expect(chip('All')).toBeDisabled();
    expect(screen.getByText(/Generations can be changed between games/)).toBeInTheDocument();

    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    expect(chip('Gen I')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next Pokémon' }));
    await ready();
    expect(chip('Gen I')).toBeEnabled();
  });

  it('remembers the choice after a refresh', async () => {
    const user = userEvent.setup();
    const first = renderPractice();
    await ready();
    await user.click(chip('Gen V'));
    first.unmount();
    renderPractice();
    await ready();
    expect(chip('Gen V')).toHaveAttribute('aria-pressed', 'false');
    expect(chip('Gen IV')).toHaveAttribute('aria-pressed', 'true');
  });
});
