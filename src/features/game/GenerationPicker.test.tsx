import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { Generation } from '../../domain/pokemon/types.ts';
import { GenerationPicker } from './GenerationPicker.tsx';

function Harness({ start, disabled = false }: { start: Generation[]; disabled?: boolean }) {
  const [value, setValue] = useState<Generation[]>(start);
  return (
    <GenerationPicker
      value={value}
      onChange={setValue}
      poolSize={value.length * 100}
      disabled={disabled}
    />
  );
}

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('GenerationPicker', () => {
  it('shows which generations are on', () => {
    render(<Harness start={[1, 3]} />);
    expect(pressed('Gen I')).toBe('true');
    expect(pressed('Gen II')).toBe('false');
    expect(pressed('Gen III')).toBe('true');
    expect(screen.getByRole('group', { name: 'Generations' })).toBeInTheDocument();
  });

  it('turns a generation on and off', async () => {
    const user = userEvent.setup();
    render(<Harness start={[1]} />);
    await user.click(screen.getByRole('button', { name: 'Gen II' }));
    expect(pressed('Gen II')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Gen II' }));
    expect(pressed('Gen II')).toBe('false');
  });

  it('will not turn off the last generation', async () => {
    const user = userEvent.setup();
    render(<Harness start={[4]} />);
    const only = screen.getByRole('button', { name: 'Gen IV' });
    expect(only).toHaveAttribute('aria-disabled', 'true');
    await user.click(only);
    expect(pressed('Gen IV')).toBe('true');
  });

  it('turns everything on with All, which is unavailable when everything is already on', async () => {
    const user = userEvent.setup();
    render(<Harness start={[2]} />);
    await user.click(screen.getByRole('button', { name: 'All' }));
    for (const name of ['Gen I', 'Gen V', 'Gen IX']) expect(pressed(name)).toBe('true');
    expect(screen.getByRole('button', { name: 'All' })).toBeDisabled();
  });

  it('reports how many Pokémon are in play', () => {
    render(<Harness start={[1, 2]} />);
    expect(screen.getByText(/200 Pokémon in play/)).toBeInTheDocument();
  });

  it('is locked, with an explanation, while a game is running', () => {
    render(<Harness start={[1, 2]} disabled />);
    expect(screen.getByRole('button', { name: 'Gen I' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'All' })).toBeDisabled();
    expect(screen.getByText('Generations can be changed between games.')).toBeInTheDocument();
  });
});
