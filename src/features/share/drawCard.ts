import { REVEAL_FRACTIONS, SCORING } from '../../domain/game/config.ts';
import {
  outcomeLabel,
  stagesSeen,
  type ShareAnswer,
  type ShareData,
} from '../../domain/share/text.ts';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const FONT = "'Segoe UI', system-ui, -apple-system, Roboto, sans-serif";

export interface CardArtwork {
  image: CanvasImageSource;
  width: number;
  height: number;
}

export interface CardOptions {
  /** Show the Pokémon. When false the card never touches the answer or its artwork. */
  spoilers: boolean;
  answer?: ShareAnswer | null;
  artwork?: CardArtwork | null;
  /** Link printed at the bottom, or null for none. */
  url?: string | null;
}

const STATUS_COLOUR = { won: '#facc15', lost: '#f87171', gave_up: '#fb923c' } as const;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  font: string,
  fill: string | CanvasGradient,
  align: CanvasTextAlign = 'center',
) {
  ctx.font = `${font} ${FONT}`;
  ctx.textAlign = align;
  ctx.fillStyle = fill;
  ctx.fillText(value, x, y);
}

/**
 * Draws the result card. The spoiler-free card shows a "?" where the Pokémon would be, and nothing
 * else about it: it never reads `answer` or `artwork`, so they cannot leak by accident.
 */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  data: ShareData,
  options: CardOptions,
): void {
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  const showAnswer = options.spoilers;
  const mid = W / 2;

  // Backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0a1f');
  bg.addColorStop(0.55, '#14123a');
  bg.addColorStop(1, '#07061a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(mid, 420, 20, mid, 420, 640);
  glow.addColorStop(0, 'rgba(139,92,246,0.45)');
  glow.addColorStop(1, 'rgba(139,92,246,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Branding
  const brand = ctx.createLinearGradient(mid - 230, 0, mid + 230, 0);
  brand.addColorStop(0, '#8b5cf6');
  brand.addColorStop(1, '#22d3ee');
  text(ctx, 'SilhouDex', mid, 138, '800 86px', brand);
  text(ctx, 'Every shadow has a story.', mid, 188, '500 30px', 'rgba(196,181,253,0.85)');
  text(ctx, `Daily Silhouette · #${data.challengeNumber}`, mid, 256, '700 36px', '#22d3ee');

  // Picture panel
  const size = 560;
  const px = (W - size) / 2;
  const py = 290;
  const panel = ctx.createRadialGradient(
    mid,
    py + size * 0.38,
    10,
    mid,
    py + size * 0.5,
    size * 0.8,
  );
  panel.addColorStop(0, '#b9a4ff');
  panel.addColorStop(0.45, '#7c4ddb');
  panel.addColorStop(1, '#2a1b6e');
  roundRect(ctx, px, py, size, size, 48);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.stroke();

  if (showAnswer && options.artwork) {
    const { image, width, height } = options.artwork;
    const inner = size - 80;
    const scale = Math.min(inner / width, inner / height);
    const w = width * scale;
    const h = height * scale;
    ctx.drawImage(image, mid - w / 2, py + (size - h) / 2, w, h);
  } else if (!showAnswer) {
    text(ctx, '?', mid, py + size / 2 + 130, '800 380px', 'rgba(255,255,255,0.3)');
  }
  const caption =
    showAnswer && options.answer ? `It was ${options.answer.name}` : 'Can you name it?';
  text(ctx, caption, mid, py + size + 66, '700 44px', '#ffffff');

  // Score
  const scoreY = 1050;
  text(ctx, String(data.score), mid - 52, scoreY, '800 124px', '#ffffff', 'right');
  text(
    ctx,
    `/${SCORING.startScore}`,
    mid - 40,
    scoreY,
    '600 52px',
    'rgba(196,181,253,0.8)',
    'left',
  );
  text(ctx, outcomeLabel(data.status), mid, scoreY + 56, '700 36px', STATUS_COLOUR[data.status]);

  // Stats
  const stats = [
    { value: String(data.wrongGuesses), label: 'Wrong guesses' },
    { value: String(data.revealsUsed), label: 'Reveals' },
    { value: data.streak > 0 ? String(data.streak) : '—', label: 'Day streak' },
  ];
  stats.forEach((stat, i) => {
    const x = 270 + i * 270;
    text(ctx, stat.value, x, 1184, '800 56px', '#ffffff');
    text(ctx, stat.label, x, 1220, '500 26px', 'rgba(196,181,253,0.8)');
  });

  // Reveal progression: a pill per picture stage, lit for the stages the player saw
  const seen = stagesSeen(data.revealsUsed);
  const pillW = 120;
  const gap = 20;
  const startX = (W - (REVEAL_FRACTIONS.length * pillW + (REVEAL_FRACTIONS.length - 1) * gap)) / 2;
  REVEAL_FRACTIONS.forEach((fraction, i) => {
    const x = startX + i * (pillW + gap);
    roundRect(ctx, x, 1248, pillW, 50, 25);
    if (i < seen) {
      const lit = ctx.createLinearGradient(x, 0, x + pillW, 0);
      lit.addColorStop(0, '#8b5cf6');
      lit.addColorStop(1, '#22d3ee');
      ctx.fillStyle = lit;
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fill();
    }
    text(
      ctx,
      `${Math.round(fraction * 100)}%`,
      x + pillW / 2,
      1282,
      '700 24px',
      i < seen ? '#07061a' : 'rgba(255,255,255,0.35)',
    );
  });

  if (options.url) {
    text(
      ctx,
      options.url.replace(/^https?:\/\//, ''),
      mid,
      1330,
      '500 24px',
      'rgba(196,181,253,0.7)',
    );
  }
}
