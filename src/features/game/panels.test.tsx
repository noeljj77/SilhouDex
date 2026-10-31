import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Clue } from '../../domain/clues/types.ts';
import { getGameView, createSession, submitGuess, giveUp } from '../../domain/game/engine.ts';
import type { GameResult } from '../../domain/game/types.ts';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import { ClueList } from './ClueList.tsx';
import { Countdown } from './Countdown.tsx';
import { GuessHistory } from './GuessHistory.tsx';
import { ResultPanel } from './ResultPanel.tsx';
import { ScoreMeter } from './ScoreMeter.tsx';

const clue = (n: number): Clue => ({
  id: `c${n}`,
  category: 'generation',
  difficulty: 3,
  title: `Title ${n}`,
  body: `Body ${n}`,
});
const clues = [1, 2, 3, 4, 5].map(clue);

describe('ClueList', () => {
  it.each([0, 1, 3, 5])('shows %i unlocked clues and locks the rest', (unlocked) => {
    render(<ClueList clues={clues} unlocked={unlocked} />);
    expect(screen.queryAllByText(/^Body \d$/)).toHaveLength(unlocked);
    expect(screen.queryAllByText(/unlocks after wrong guess/)).toHaveLength(5 - unlocked);
  });

  it('never prints a locked clue’s text', () => {
    const { container } = render(<ClueList clues={clues} unlocked={2} />);
    expect(container.textContent).not.toContain('Body 3');
  });

  it('shows locked slots when there are no clues at all', () => {
    render(<ClueList clues={[]} unlocked={5} />);
    expect(screen.getAllByText(/unlocks after wrong guess/)).toHaveLength(5);
  });
});

describe('ScoreMeter', () => {
  const view = (wrong: number) => {
    let s = createSession({ id: 's', mode: 'practice', pokemonId: 1, startedAt: 't' });
    for (let i = 0; i < wrong; i++) s = submitGuess(s, 100 + i, 't').session;
    return getGameView(s);
  };

  it('reports the points left as a progress bar', () => {
    render(<ScoreMeter view={view(2)} />);
    expect(screen.getByRole('progressbar', { name: 'Points left' })).toHaveAttribute(
      'aria-valuenow',
      '70',
    );
  });

  it('describes how many guesses are used', () => {
    render(<ScoreMeter view={view(3)} />);
    expect(screen.getByLabelText('3 of 6 guesses used')).toBeInTheDocument();
  });

  it('warns on the final guess', () => {
    render(<ScoreMeter view={view(5)} />);
    expect(screen.getByText(/Final guess!/)).toBeInTheDocument();
  });

  it('hides the hint once the game is over', () => {
    const over = giveUp(
      createSession({ id: 's', mode: 'practice', pokemonId: 1, startedAt: 't' }),
      't',
    );
    render(<ScoreMeter view={getGameView(over)} />);
    expect(screen.queryByText(/Each wrong guess costs/)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Points left' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });
});

describe('GuessHistory', () => {
  it('lists only wrong guesses, by name', () => {
    render(
      <GuessHistory
        guesses={[
          { pokemonId: 25, correct: false, at: 't' },
          { pokemonId: 4, correct: false, at: 't' },
          { pokemonId: 1, correct: true, at: 't' },
        ]}
      />,
    );
    const items = within(screen.getByRole('list', { name: 'Wrong guesses' })).getAllByRole(
      'listitem',
    );
    expect(items.map((i) => i.textContent)).toEqual(['Pikachu', 'Charmander']);
  });

  it('renders nothing before any wrong guess', () => {
    const { container } = render(<GuessHistory guesses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ResultPanel', () => {
  const result = (over: Partial<GameResult>): GameResult => ({
    sessionId: 's',
    mode: 'practice',
    pokemonId: 25,
    status: 'won',
    score: 70,
    wrongGuesses: 2,
    revealsUsed: 2,
    completedAt: 't',
    ...over,
  });
  const pikachu = pokedexIndex.getById(25)!;

  it('celebrates a win and shows the Pokémon, types and stats', () => {
    render(<ResultPanel result={result({})} entry={pikachu} isNewDiscovery />);
    expect(screen.getByText('You got it!')).toBeInTheDocument();
    expect(screen.getByText('It was')).toBeInTheDocument();
    expect(screen.getByText('Pikachu')).toBeInTheDocument();
    expect(screen.getByText('#0025')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Types' })).toHaveTextContent('electric');
    expect(screen.getByText(/New discovery/)).toBeInTheDocument();
    expect(screen.getByText('Wrong guesses').previousElementSibling).toHaveTextContent('2');
  });

  it.each([
    ['lost', 'Out of guesses'],
    ['gave_up', 'You gave up'],
  ] as const)('%s shows the answer without a discovery', (status, headline) => {
    render(
      <ResultPanel result={result({ status, score: 0 })} entry={pikachu} isNewDiscovery={false} />,
    );
    expect(screen.getByText(headline)).toBeInTheDocument();
    expect(screen.getByText('The answer was')).toBeInTheDocument();
    expect(screen.queryByText(/New discovery/)).not.toBeInTheDocument();
  });

  it('renders extra content (countdown, links) below the stats', () => {
    render(
      <ResultPanel result={result({})} entry={pikachu} isNewDiscovery={false}>
        <p>Extra footer</p>
      </ResultPanel>,
    );
    expect(screen.getByText('Extra footer')).toBeInTheDocument();
  });
});

describe('Countdown', () => {
  it('shows hours, minutes and seconds', () => {
    render(<Countdown />);
    expect(screen.getByLabelText('Time until the next challenge').textContent).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    );
  });
});
