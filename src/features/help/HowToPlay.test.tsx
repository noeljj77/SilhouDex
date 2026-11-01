import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SCORING } from '../../domain/game/config.ts';
import { HowToPlay } from './HowToPlay.tsx';
import { HOW_TO_PLAY_KEY } from './howToPlayMemory.ts';

describe('HowToPlay', () => {
  beforeEach(() => localStorage.removeItem(HOW_TO_PLAY_KEY));

  it('opens by itself on a first visit, with the rules taken from the game settings', () => {
    render(<HowToPlay />);
    const card = screen.getByRole('dialog', { name: 'How to play' });
    expect(card).toHaveTextContent(`${SCORING.startScore} points`);
    expect(card).toHaveTextContent(`costs ${SCORING.wrongGuessPenalty}`);
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveFocus();
  });

  it('stays closed on later visits, and the help button brings it back', async () => {
    const user = userEvent.setup();
    const first = render(<HowToPlay />);
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    first.unmount();

    render(<HowToPlay />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    expect(screen.getByRole('dialog', { name: 'How to play' })).toBeInTheDocument();
  });

  it('closes with Escape and returns focus to the help button', async () => {
    const user = userEvent.setup();
    render(<HowToPlay />);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'How to play' })).toHaveFocus();
    expect(localStorage.getItem(HOW_TO_PLAY_KEY)).toBe('1');
  });

  it('keeps Tab inside the card', async () => {
    const user = userEvent.setup();
    render(<HowToPlay />);
    const confirm = screen.getByRole('button', { name: 'Got it' });
    await user.tab();
    expect(confirm).toHaveFocus(); // the only control, so Tab wraps back to it
  });
});
