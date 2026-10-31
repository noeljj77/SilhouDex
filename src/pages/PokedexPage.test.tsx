import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProgressProvider } from '../app/ProgressProvider.tsx';
import { createProgressStore } from '../app/progressStore.ts';
import { createEmptyProgress } from '../domain/progression/record.ts';
import type { Discovery, ProgressData } from '../domain/progression/types.ts';
import type { ProgressRepository } from '../persistence/localRepository.ts';
import { PokedexPage } from './PokedexPage.tsx';

const found = (id: number, at: string, times: number, modes: Discovery['modes']): Discovery => ({
  pokemonId: id,
  firstDiscoveredAt: '2026-11-01T08:00:00.000Z',
  lastDiscoveredAt: at,
  timesDiscovered: times,
  modes,
});

/** Bulbasaur, Charmander, Pikachu and Mewtwo are discovered. Everything else is not. */
function seeded(): ProgressData {
  const data = createEmptyProgress('2026-11-01T00:00:00.000Z', 'p');
  data.discoveries = {
    1: found(1, '2026-11-01T08:00:00.000Z', 1, ['daily']),
    4: found(4, '2026-11-05T10:00:00.000Z', 5, ['practice']),
    25: found(25, '2026-11-03T10:00:00.000Z', 2, ['daily', 'practice']),
    150: found(150, '2026-11-02T10:00:00.000Z', 1, ['practice']),
  };
  return data;
}

function renderPokedex(data: ProgressData = createEmptyProgress('2026-11-01T00:00:00.000Z', 'p')) {
  const repo: ProgressRepository = { mode: 'persistent', load: () => data, save() {} };
  return render(
    <ProgressProvider store={createProgressStore(repo)}>
      <PokedexPage />
    </ProgressProvider>,
  );
}

const tiles = () => within(screen.getByRole('list', { name: 'Pokémon' })).getAllByRole('listitem');
const tileNames = () =>
  tiles().map((t) => within(t).getByRole('button').getAttribute('aria-label'));
const status = () => screen.getByText(/^Showing \d+ of \d+$/).textContent;

describe('PokedexPage: an empty collection', () => {
  it('lists all 1025 Pokémon as undiscovered, with no names', () => {
    renderPokedex();
    expect(tiles()).toHaveLength(1025);
    expect(screen.getAllByText('???')).toHaveLength(1025);
    expect(screen.getByText(/of 1025 discovered \(0%\)/)).toBeInTheDocument();
    expect(status()).toBe('Showing 1025 of 1025');
  });

  it('never prints the name of an undiscovered Pokémon anywhere in the page', () => {
    const { container } = renderPokedex();
    for (const name of ['Bulbasaur', 'Pikachu', 'Eevee', 'Mewtwo', 'Charizard', 'Pecharunt']) {
      expect(container.textContent).not.toContain(name);
      expect(container.innerHTML).not.toContain(name);
    }
  });

  it('labels undiscovered tiles by number only', () => {
    renderPokedex();
    expect(screen.getByRole('button', { name: 'Number 25, undiscovered' })).toBeInTheDocument();
  });
});

describe('PokedexPage: discoveries', () => {
  it('shows names for discovered Pokémon and hides the rest', () => {
    const { container } = renderPokedex(seeded());
    for (const name of ['Bulbasaur', 'Charmander', 'Pikachu', 'Mewtwo']) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^${name}, number`) }),
      ).toBeInTheDocument();
    }
    expect(screen.getAllByText('???')).toHaveLength(1021);
    expect(container.textContent).not.toContain('Eevee');
    expect(container.textContent).not.toContain('Squirtle');
  });

  it('shows the completion percentage and generation progress', () => {
    renderPokedex(seeded());
    expect(screen.getByText(/of 1025 discovered \(0\.4%\)/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Collection completion' })).toHaveAttribute(
      'aria-valuenow',
      '0.4',
    );
    expect(screen.getByRole('button', { name: 'Gen I · 4/151' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gen IX · 0/120' })).toBeInTheDocument();
  });
});

describe('PokedexPage: filters', () => {
  it('shows only discovered, or only undiscovered, Pokémon', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('radio', { name: 'Discovered' }));
    expect(tiles()).toHaveLength(4);
    expect(status()).toBe('Showing 4 of 1025');
    await user.click(screen.getByRole('radio', { name: 'Undiscovered' }));
    expect(tiles()).toHaveLength(1021);
    await user.click(screen.getByRole('radio', { name: 'All' }));
    expect(tiles()).toHaveLength(1025);
  });

  it('filters by generation, from the menu or the progress chips', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.selectOptions(screen.getByLabelText('Generation'), 'Generation IX');
    expect(tiles()).toHaveLength(120);

    await user.selectOptions(screen.getByLabelText('Generation'), 'All');
    const chip = screen.getByRole('button', { name: 'Gen I · 4/151' });
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(tiles()).toHaveLength(151);
    await user.click(chip);
    expect(tiles()).toHaveLength(1025);
  });

  it('filters by type', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('radio', { name: 'Discovered' }));
    await user.selectOptions(screen.getByLabelText('Type'), 'Fire');
    expect(tileNames()).toEqual(['Charmander, number 4']);
    await user.selectOptions(screen.getByLabelText('Type'), 'Poison');
    expect(tileNames()).toEqual(['Bulbasaur, number 1']);
  });

  it('combines filters and can reset them all', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    expect(screen.queryByRole('button', { name: /Reset filters/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Undiscovered' }));
    await user.selectOptions(screen.getByLabelText('Generation'), 'Generation I');
    await user.selectOptions(screen.getByLabelText('Type'), 'Electric');
    expect(tiles().length).toBeGreaterThan(0);
    expect(tileNames().join()).not.toContain('Pikachu');
    await user.click(screen.getByRole('button', { name: /Reset filters/ }));
    expect(tiles()).toHaveLength(1025);
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('radio', { name: 'Discovered' }));
    await user.selectOptions(screen.getByLabelText('Generation'), 'Generation IX');
    expect(screen.getByText('No Pokémon match these filters.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Pokémon' })).not.toBeInTheDocument();
    expect(status()).toBe('Showing 0 of 1025');
  });
});

describe('PokedexPage: search', () => {
  it('finds discovered Pokémon by name', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'pika');
    expect(tileNames()).toEqual(['Pikachu, number 25']);
  });

  it('does not find undiscovered Pokémon by name', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'eevee');
    expect(screen.getByText('No Pokémon match these filters.')).toBeInTheDocument();
  });

  it('finds any Pokémon by number', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), '#133');
    expect(tileNames()).toEqual(['Number 133, undiscovered']);
  });
});

describe('PokedexPage: sorting', () => {
  it('sorts discovered Pokémon by name, the rest after them by number', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.selectOptions(screen.getByLabelText('Sort'), 'Name, Z to A');
    expect(tileNames().slice(0, 6)).toEqual([
      'Pikachu, number 25',
      'Mewtwo, number 150',
      'Charmander, number 4',
      'Bulbasaur, number 1',
      'Number 2, undiscovered',
      'Number 3, undiscovered',
    ]);
  });

  it('puts the newest discovery first', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.selectOptions(screen.getByLabelText('Sort'), 'Recently discovered');
    expect(tileNames()[0]).toBe('Charmander, number 4');
  });

  it('can list from the highest number', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.selectOptions(screen.getByLabelText('Sort'), 'Number, high to low');
    expect(tileNames()[0]).toBe('Number 1025, undiscovered');
  });
});

describe('PokedexPage: details', () => {
  it('shows when and how a discovered Pokémon was identified', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('button', { name: 'Pikachu, number 25' }));
    const dialog = screen.getByRole('dialog', { name: 'Pikachu, number 25' });
    expect(within(dialog).getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('electric');
    expect(dialog).toHaveTextContent('Generation 1');
    expect(dialog).toHaveTextContent('First discovered1 November 2026');
    expect(dialog).toHaveTextContent('Last discovered3 November 2026');
    expect(dialog).toHaveTextContent('Times identified2');
    expect(dialog).toHaveTextContent('Discovered inDaily Silhouette and Practice');
  });

  it('shows legendary and mythical badges', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('button', { name: 'Mewtwo, number 150' }));
    expect(within(screen.getByRole('dialog')).getByText('Legendary')).toBeInTheDocument();
  });

  it('keeps an undiscovered Pokémon a mystery, without its name or types', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('button', { name: 'Number 133, undiscovered' }));
    const dialog = screen.getByRole('dialog', { name: 'Number 133, undiscovered' });
    expect(within(dialog).getByRole('heading', { name: 'Undiscovered' })).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/Eevee|normal|Generation/i);
    expect(within(dialog).getByRole('link', { name: /Daily challenge/ })).toHaveAttribute(
      'href',
      '#/daily',
    );
    expect(within(dialog).getByRole('link', { name: 'Practice' })).toHaveAttribute(
      'href',
      '#/practice',
    );
  });

  it('closes with Escape and returns focus to the tile', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    const tile = screen.getByRole('button', { name: 'Pikachu, number 25' });
    await user.click(tile);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(tile).toHaveFocus();
  });

  it('closes with the close button and by clicking outside', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('button', { name: 'Pikachu, number 25' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pikachu, number 25' }));
    const backdrop = screen.getByRole('dialog').parentElement!;
    await user.pointer({ target: backdrop, keys: '[MouseLeft]' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps Tab inside the open panel', async () => {
    const user = userEvent.setup();
    renderPokedex(seeded());
    await user.click(screen.getByRole('button', { name: 'Number 133, undiscovered' }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});
