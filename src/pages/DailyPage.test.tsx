import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../app/ProgressProvider.tsx';
import { createProgressStore } from '../app/progressStore.ts';
import { mapDetails } from '../data/pokeapi/mappers.ts';
import { generateClues } from '../domain/clues/engine.ts';
import { getDailyPool, LAUNCH_DATE } from '../domain/daily/schedule.ts';
import { createEmptyProgress } from '../domain/progression/record.ts';
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
    silhouette: {},
    colorUrl: 'blob:color',
    alpha: new Uint8ClampedArray(100).fill(255),
    alphaWidth: 10,
    alphaHeight: 10,
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

  it('winning with no wrong guess unlocks First Discovery and Perfect Instinct, unseen', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    const { achievements } = stored();
    expect(Object.keys(achievements).sort()).toEqual(['first-discovery', 'perfect-instinct']);
    expect(achievements['perfect-instinct']?.seen).toBe(false);
  });

  it('giving up unlocks nothing', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
    await screen.findByRole('region', { name: 'Result' });
    expect(stored().achievements).toEqual({});
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

describe('DailyPage: streak badge', () => {
  const seedStreak = (days: number) => {
    const data = createEmptyProgress(`${addDays(BULBASAUR_DAY, -days)}T00:00:00.000Z`, 'p');
    for (let i = 1; i <= days; i++) {
      const key = addDays(BULBASAUR_DAY, -i) as DateKey;
      data.daily.results[key] = {
        sessionId: `daily-${key}`,
        mode: 'daily',
        pokemonId: 25,
        status: 'won',
        score: 100,
        wrongGuesses: 0,
        revealsUsed: 0,
        completedAt: `${key}T09:00:00.000Z`,
        dateKey: key,
        challengeNumber: 1,
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  it('invites a new player to start a streak', async () => {
    renderDaily();
    await ready();
    expect(screen.getByText('Start your streak')).toBeInTheDocument();
  });

  it('shows the running streak and nudges to play today, then grows it after finishing', async () => {
    seedStreak(2);
    const user = userEvent.setup();
    renderDaily();
    await ready();
    expect(screen.getByText('2-day streak')).toBeInTheDocument();
    expect(screen.getByText(/play today to keep it/)).toBeInTheDocument();

    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    expect(screen.getByText('3-day streak')).toBeInTheDocument();
    expect(screen.queryByText(/play today to keep it/)).not.toBeInTheDocument();
  });

  it('a loss or give-up also keeps the streak going', async () => {
    seedStreak(1);
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
    await screen.findByRole('region', { name: 'Result' });
    expect(screen.getByText('2-day streak')).toBeInTheDocument();
  });

  it('a missed day resets it to a fresh start', async () => {
    seedStreak(3);
    // Skip the most recent day: remove yesterday's result.
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    delete data.daily.results[addDays(BULBASAUR_DAY, -1)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    renderDaily();
    await ready();
    expect(screen.getByText('Start your streak')).toBeInTheDocument();
  });
});

describe('DailyPage: countdown to the next challenge', () => {
  it('is always visible while playing', async () => {
    renderDaily();
    await ready();
    expect(screen.getByText(/New challenge in/)).toBeInTheDocument();
    expect(screen.getByLabelText('Time until the next challenge').textContent).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    );
  });

  it('stays visible on the result screen, and is not shown twice', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Result' });
    expect(screen.getAllByLabelText('Time until the next challenge')).toHaveLength(1);
  });

  it('counts down to UTC midnight', async () => {
    vi.setSystemTime(new Date(`${BULBASAUR_DAY}T22:30:00Z`));
    renderDaily();
    await ready();
    expect(screen.getByLabelText('Time until the next challenge')).toHaveTextContent('01:30:00');
  });
});

describe('DailyPage: sharing', () => {
  const text = () => screen.getByLabelText('Result text').textContent ?? '';

  it('offers sharing after finishing, with a spoiler-free result by default', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Charmander');
    await guess(user, 'Bulbasaur');
    const share = await screen.findByRole('region', { name: 'Share your result' });
    expect(share).toBeInTheDocument();
    expect(text()).toContain('Score 85/100 · 1 wrong guess');
    expect(text()).toMatch(/SilhouDex #\d+ ✅/);
    expect(text()).toContain('🔥 1-day streak');
    expect(text()).not.toMatch(/bulbasaur/i);
  });

  it('does not offer sharing while the game is still on', async () => {
    renderDaily();
    await ready();
    expect(screen.queryByRole('region', { name: 'Share your result' })).not.toBeInTheDocument();
  });

  it('keeps the answer out of the shared text even though the page now shows it', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Share your result' });
    expect(screen.getByRole('region', { name: 'Result' })).toHaveTextContent('Bulbasaur'); // the panel above
    expect(text()).not.toMatch(/bulbasaur/i); // the share text
    await user.click(screen.getByRole('checkbox', { name: /Include the Pokémon/ }));
    expect(text()).toMatch(/Spoiler: it was Bulbasaur/);
  });

  it('can share a result after the page is refreshed (the day is locked)', async () => {
    const user = userEvent.setup();
    const first = renderDaily();
    await ready();
    await guess(user, 'Bulbasaur');
    await screen.findByRole('region', { name: 'Share your result' });
    first.unmount();

    renderDaily();
    expect(await screen.findByRole('region', { name: 'Share your result' })).toBeInTheDocument();
    expect(text()).toContain('Score 100/100');
  });

  it('can share a give-up too', async () => {
    const user = userEvent.setup();
    renderDaily();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Give up' }));
    await user.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
    await screen.findByRole('region', { name: 'Share your result' });
    expect(text()).toMatch(/SilhouDex #\d+ 🏳️/);
  });
});

describe('DailyPage: fairness', () => {
  it('uses the same clues for everyone, whatever difficulty the player picked in Practice', async () => {
    const { species, pokemon, chain } = fixtures.bulbasaur;
    const details = mapDetails(species, pokemon, chain);
    const seed = `daily:#${getDailyPool().indexOf(1) + 1}`;
    const displayName = (r: { id: number; slug: string }) => r.slug;
    const normal = generateClues(details, { seed, difficulty: 'normal', displayName })[0]!;
    const easy = generateClues(details, { seed, difficulty: 'easy', displayName })[0]!;
    expect(normal.body).not.toBe(easy.body); // so this test can tell the two apart

    // The player chose Easy in Practice earlier.
    const store = createProgressStore(createLocalRepository());
    store.setDifficulty('easy');
    const user = userEvent.setup();
    render(
      <ProgressProvider store={store}>
        <DailyPage />
      </ProgressProvider>,
    );
    await ready();
    await guess(user, 'Charmander');
    expect(screen.getByText(normal.body)).toBeInTheDocument();
    expect(screen.queryByText(easy.body)).not.toBeInTheDocument();
  });
});

describe('DailyPage: data check', () => {
  it('uses real clue data for the answer', () => {
    const { species, pokemon, chain } = fixtures.bulbasaur;
    expect(mapDetails(species, pokemon, chain).id).toBe(1);
  });
});
