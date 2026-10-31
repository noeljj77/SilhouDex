import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GuessOutcome } from '../../domain/game/engine.ts';
import { GuessInput } from './GuessInput.tsx';

function setup(guessed: number[] = [], outcome: GuessOutcome = 'wrong', disabled = false) {
  const onGuess = vi.fn<(id: number) => GuessOutcome>(() => outcome);
  const user = userEvent.setup();
  render(<GuessInput guessedIds={new Set(guessed)} onGuess={onGuess} disabled={disabled} />);
  return { onGuess, user, box: screen.getByRole('combobox', { name: 'Your guess' }) };
}

describe('GuessInput', () => {
  it('offers matching Pokémon as you type', async () => {
    const { user, box } = setup();
    await user.type(box, 'char');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Charmander');
    expect(options.length).toBeLessThanOrEqual(6);
    expect(box).toHaveAttribute('aria-expanded', 'true');
  });

  it('matches accents and punctuation loosely', async () => {
    const { user, box } = setup();
    await user.type(box, 'flabebe');
    expect(screen.getByRole('option', { name: /Flabébé/ })).toBeInTheDocument();
  });

  it('tapping a suggestion fills the box but does not submit', async () => {
    const { user, box, onGuess } = setup();
    await user.type(box, 'char');
    await user.click(screen.getByRole('option', { name: /Charmander/ }));
    expect(box).toHaveValue('Charmander');
    expect(onGuess).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Guess' }));
    expect(onGuess).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('arrow keys and Enter pick a suggestion and submit it', async () => {
    const { user, box, onGuess } = setup();
    await user.type(box, 'char');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(box).toHaveAttribute('aria-activedescendant');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    expect(onGuess).toHaveBeenCalledExactlyOnceWith(5); // Charmeleon
  });

  it('wraps around the list with the arrow keys', async () => {
    const { user, box } = setup();
    await user.type(box, 'char');
    await user.keyboard('{ArrowUp}');
    const options = screen.getAllByRole('option');
    expect(options.at(-1)).toHaveAttribute('aria-selected', 'true');
  });

  it('Enter on exactly typed text submits without choosing from the list', async () => {
    const { user, box, onGuess } = setup();
    await user.type(box, 'Pikachu{Enter}');
    expect(onGuess).toHaveBeenCalledExactlyOnceWith(25);
  });

  it('Escape closes the list', async () => {
    const { user, box } = setup();
    await user.type(box, 'char');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not submit text that is only a partial name', async () => {
    const { user, box, onGuess } = setup();
    await user.type(box, 'pika{Enter}');
    expect(onGuess).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Pick a Pokémon from the list.');
    expect(screen.getByRole('button', { name: 'Guess' })).toBeDisabled();
  });

  it('marks already guessed Pokémon and will not select them', async () => {
    const { user, box, onGuess } = setup([25]);
    await user.type(box, 'pikachu');
    const option = screen.getByRole('option', { name: /Pikachu/ });
    expect(option).toHaveAttribute('aria-disabled', 'true');
    expect(option).toHaveTextContent('Already guessed');
    await user.click(option);
    expect(box).toHaveValue('pikachu'); // not replaced
    expect(screen.getByRole('button', { name: 'Guess' })).toBeDisabled();
    expect(onGuess).not.toHaveBeenCalled();
  });

  it('clears the box after a guess and says what happened', async () => {
    const { user, box } = setup([], 'wrong');
    await user.type(box, 'Mew{Enter}');
    expect(box).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Not Mew. −15 points.');
  });

  it('reports a duplicate without claiming a penalty', async () => {
    const { user, box } = setup([], 'duplicate');
    await user.type(box, 'Mew{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('You already guessed Mew.');
  });

  it('is fully disabled when the game is over or loading', () => {
    const { box } = setup([], 'wrong', true);
    expect(box).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guess' })).toBeDisabled();
  });

  it('shows no list for an empty box', async () => {
    const { user, box } = setup();
    await user.click(box);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
