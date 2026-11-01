import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../../app/ProgressProvider.tsx';
import { createProgressStore } from '../../app/progressStore.ts';
import { pokedexIndex } from '../../data/pokedexIndex.ts';
import type { GameResult } from '../../domain/game/types.ts';
import { createEmptyProgress } from '../../domain/progression/record.ts';
import type { ProgressRepository } from '../../persistence/localRepository.ts';
import type { DateKey } from '../../lib/utcDate.ts';
import * as actions from './actions.ts';
import { ShareResult } from './ShareResult.tsx';

vi.mock('./actions.ts', () => ({
  renderCard: vi.fn(),
  canvasToBlob: vi.fn(),
  loadCardArtwork: vi.fn(),
  copyText: vi.fn(),
  downloadBlob: vi.fn(),
  canShareNatively: vi.fn(),
  shareNatively: vi.fn(),
}));
const mocked = vi.mocked(actions);

const fakeCanvas = (tag: string) =>
  ({ toDataURL: () => `data:image/png;base64,${tag}` }) as unknown as HTMLCanvasElement;

beforeEach(() => {
  vi.resetAllMocks();
  mocked.renderCard.mockImplementation((_data, options) =>
    fakeCanvas(options.spoilers ? 'SPOILER' : 'PLAIN'),
  );
  mocked.canvasToBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  mocked.loadCardArtwork.mockResolvedValue({
    image: {} as CanvasImageSource,
    width: 10,
    height: 10,
  });
  mocked.copyText.mockResolvedValue(true);
  mocked.canShareNatively.mockReturnValue(false);
  mocked.shareNatively.mockResolvedValue('shared');
});

const SEISMITOAD = pokedexIndex.getById(537)!;
const NAME = SEISMITOAD.name;

const result = (over: Partial<GameResult> = {}): GameResult => ({
  sessionId: 'daily-2026-11-02',
  mode: 'daily',
  pokemonId: 537,
  status: 'won',
  score: 70,
  wrongGuesses: 2,
  revealsUsed: 2,
  completedAt: '2026-11-02T10:00:00.000Z',
  dateKey: '2026-11-02' as DateKey,
  challengeNumber: 12,
  ...over,
});

/** A player who finished 2 Nov and the two days before it. */
function renderShare(game: GameResult = result()) {
  const data = createEmptyProgress('2026-10-01T00:00:00.000Z', 'p');
  for (const day of ['2026-10-31', '2026-11-01', '2026-11-02']) {
    data.daily.results[day as DateKey] = result({
      dateKey: day as DateKey,
      completedAt: `${day}T09:00:00.000Z`,
    });
  }
  const repo: ProgressRepository = { mode: 'persistent', load: () => data, save() {} };
  return render(
    <ProgressProvider store={createProgressStore(repo)}>
      <ShareResult result={game} entry={SEISMITOAD} />
    </ProgressProvider>,
  );
}

const text = () => screen.getByLabelText('Result text').textContent ?? '';

describe('ShareResult: spoiler-free (the default)', () => {
  it('shows the result text with the challenge, score and streak', () => {
    renderShare();
    expect(text()).toContain('SilhouDex #12 ✅');
    expect(text()).toContain('Score 70/100 · 2 wrong guesses');
    expect(text()).toContain('🔥 3-day streak');
  });

  it('never mentions the Pokémon in the text or anywhere in the panel', () => {
    const { container } = renderShare();
    expect(text()).not.toContain(NAME);
    expect(container.textContent).not.toContain(NAME);
    expect(container.innerHTML).not.toContain(NAME);
    expect(screen.getByText('The text and card never mention the Pokémon.')).toBeInTheDocument();
  });

  it('draws the card without the answer or the artwork', async () => {
    renderShare();
    await waitFor(() => expect(mocked.renderCard).toHaveBeenCalled());
    const options = mocked.renderCard.mock.calls.at(-1)![1];
    expect(options).toMatchObject({ spoilers: false, answer: null, artwork: null });
    expect(mocked.loadCardArtwork).not.toHaveBeenCalled(); // does not even fetch it
  });

  it('shows a preview of the card', async () => {
    renderShare();
    const preview = await screen.findByAltText('Preview of your result card');
    expect(preview).toHaveAttribute('src', 'data:image/png;base64,PLAIN');
  });
});

describe('ShareResult: spoilers on', () => {
  it('adds the Pokémon to the text, and the picture to the card', async () => {
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('checkbox', { name: /Include the Pokémon/ }));

    expect(text()).toContain(`Spoiler: it was ${NAME} (#537)`);
    expect(screen.getByText('The text and card will name the Pokémon.')).toBeInTheDocument();
    await waitFor(() => expect(mocked.loadCardArtwork).toHaveBeenCalledWith(SEISMITOAD.artworkUrl));
    await waitFor(() => {
      const options = mocked.renderCard.mock.calls.at(-1)![1];
      expect(options).toMatchObject({ spoilers: true, answer: { id: 537, name: NAME } });
      expect(options.artwork).not.toBeNull();
    });
    expect(
      await screen.findByAltText(`Preview of your result card, showing ${NAME}`),
    ).toBeInTheDocument();
  });

  it('goes straight back to spoiler-free when switched off again', async () => {
    const user = userEvent.setup();
    renderShare();
    const box = screen.getByRole('checkbox', { name: /Include the Pokémon/ });
    await user.click(box);
    await user.click(box);
    expect(text()).not.toContain(NAME);
    await waitFor(() =>
      expect(mocked.renderCard.mock.calls.at(-1)![1]).toMatchObject({
        spoilers: false,
        answer: null,
        artwork: null,
      }),
    );
    expect(screen.queryByAltText(new RegExp(NAME))).not.toBeInTheDocument();
  });
});

describe('ShareResult: actions', () => {
  it('copies exactly the text shown', async () => {
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Copy result' }));
    expect(mocked.copyText).toHaveBeenCalledWith(text());
    expect(await screen.findByText('Result copied to the clipboard')).toBeInTheDocument();
  });

  it('copies the spoiler text when spoilers are on', async () => {
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('checkbox', { name: /Include the Pokémon/ }));
    await user.click(screen.getByRole('button', { name: 'Copy result' }));
    expect(mocked.copyText.mock.calls[0]![0]).toContain(`it was ${NAME}`);
  });

  it('tells the player when copying did not work', async () => {
    mocked.copyText.mockResolvedValue(false);
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Copy result' }));
    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument();
  });

  it('downloads the card under a clear file name', async () => {
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Download card' }));
    await waitFor(() => expect(mocked.downloadBlob).toHaveBeenCalled());
    expect(mocked.downloadBlob.mock.calls[0]![1]).toBe('silhoudex-12.png');
    expect(await screen.findByText('Card saved')).toBeInTheDocument();
  });

  it('marks a spoiler card in its file name', async () => {
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('checkbox', { name: /Include the Pokémon/ }));
    await user.click(screen.getByRole('button', { name: 'Download card' }));
    await waitFor(() => expect(mocked.downloadBlob).toHaveBeenCalled());
    expect(mocked.downloadBlob.mock.calls[0]![1]).toBe('silhoudex-12-spoiler.png');
  });

  it('says so if the browser cannot make the card', async () => {
    mocked.renderCard.mockReturnValue(null);
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Download card' }));
    expect(await screen.findByText('Could not make the card in this browser.')).toBeInTheDocument();
    expect(mocked.downloadBlob).not.toHaveBeenCalled();
  });

  it('has no Share button on devices without a share sheet', () => {
    renderShare();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });

  it('shares the text and card through the device share sheet', async () => {
    mocked.canShareNatively.mockReturnValue(true);
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(mocked.shareNatively).toHaveBeenCalled());
    const content = mocked.shareNatively.mock.calls[0]![0];
    expect(content.title).toBe('SilhouDex #12');
    expect(content.text).toBe(text());
    expect(content.text).not.toContain(NAME);
    expect(content.file?.name).toBe('silhoudex-12.png');
  });

  it('closing the share sheet is not an error', async () => {
    mocked.canShareNatively.mockReturnValue(true);
    mocked.shareNatively.mockResolvedValue('cancelled');
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(mocked.shareNatively).toHaveBeenCalled());
    expect(screen.queryByText(/did not work/)).not.toBeInTheDocument();
  });

  it('suggests copying if sharing fails', async () => {
    mocked.canShareNatively.mockReturnValue(true);
    mocked.shareNatively.mockResolvedValue('failed');
    const user = userEvent.setup();
    renderShare();
    await user.click(screen.getByRole('button', { name: 'Share' }));
    expect(await screen.findByText(/Try copying the result instead/)).toBeInTheDocument();
  });
});

describe('ShareResult: other results', () => {
  it('offers nothing for a practice game (it has no challenge number)', () => {
    const { container } = renderShare(
      result({ mode: 'practice', challengeNumber: undefined, dateKey: undefined }),
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ['lost', 'SilhouDex #12 ❌'],
    ['gave_up', 'SilhouDex #12 🏳️'],
  ] as const)('can share a %s game too', (status, headline) => {
    renderShare(result({ status, score: 0, wrongGuesses: 6, revealsUsed: 5 }));
    expect(text()).toContain(headline);
    expect(text()).toContain('🟪🟪🟪🟪🟪🟪');
  });
});
