import { REVEAL_FRACTIONS, SCORING } from '../../domain/game/config.ts';
import {
  outcomeLabel,
  stagesSeen,
  type ShareAnswer,
  type ShareData,
} from '../../domain/share/text.ts';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export const CARD_FONT_FAMILY =
  "'Sora Variable', 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif";
const FONT = CARD_FONT_FAMILY;
/** Headings use the same rounded display font as the site. */
export const CARD_DISPLAY_FONT_FAMILY =
  "'Fredoka Variable', 'Sora Variable', system-ui, sans-serif";

const INK = '#1b2236';
const INK_SOFT = '#4a5570';
const DEX_RED = '#d3202b';

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

const STATUS_COLOUR = { won: '#1f7a3a', lost: '#d3202b', gave_up: '#c2410c' } as const;

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
  family: string = FONT,
) {
  ctx.font = `${font} ${family}`;
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

  // Shell: the red top of the Pokédex, then a paper panel for the result.
  ctx.fillStyle = DEX_RED;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#9d1119';
  ctx.fillRect(0, 226, W, 14);
  roundRect(ctx, 0, 240, W, H - 240 + 60, 60);
  ctx.fillStyle = '#e9eef6';
  ctx.fill();

  // Lens and status lights
  const lens = ctx.createRadialGradient(124, 104, 6, 134, 118, 62);
  lens.addColorStop(0, '#bfe6ff');
  lens.addColorStop(0.45, '#2f9bff');
  lens.addColorStop(1, '#0f4fa8');
  ctx.beginPath();
  ctx.arc(134, 120, 62, 0, Math.PI * 2);
  ctx.fillStyle = lens;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(134, 120, 70, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(112, 96, 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  ['#ff6b6b', '#ffcb05', '#5be08a'].forEach((colour, i) => {
    ctx.beginPath();
    ctx.arc(240 + i * 34, 70, 11, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  });

  // Branding
  ctx.save();
  ctx.shadowColor = '#9d1119';
  ctx.shadowOffsetY = 6;
  text(ctx, 'SilhouDex', 226, 168, '700 92px', '#ffffff', 'left', CARD_DISPLAY_FONT_FAMILY);
  ctx.restore();
  text(ctx, 'Every shadow has a story.', 230, 208, '500 28px', 'rgba(255,255,255,0.92)', 'left');
  text(
    ctx,
    `Daily Silhouette · #${data.challengeNumber}`,
    W - 70,
    80,
    '700 34px',
    '#ffffff',
    'right',
  );

  // Picture panel: a dark bezel around the sunburst screen
  const size = 560;
  const px = (W - size) / 2;
  const py = 306;
  roundRect(ctx, px - 26, py - 26, size + 52, size + 52, 64);
  ctx.fillStyle = '#0d1a2b';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();

  const screen = ctx.createRadialGradient(
    mid,
    py + size * 0.45,
    10,
    mid,
    py + size * 0.5,
    size * 0.75,
  );
  screen.addColorStop(0, '#9be0ff');
  screen.addColorStop(0.55, '#3fa9ff');
  screen.addColorStop(1, '#1767d1');
  ctx.save();
  roundRect(ctx, px, py, size, size, 44);
  ctx.clip();
  ctx.fillStyle = screen;
  ctx.fillRect(px, py, size, size);
  // Sunburst rays
  const cx = mid;
  const cy = py + size * 0.5;
  const rays = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < rays; i++) {
    const a0 = (i / rays) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / rays / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0) * size, cy + Math.sin(a0) * size);
    ctx.lineTo(cx + Math.cos(a1) * size, cy + Math.sin(a1) * size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  roundRect(ctx, px, py, size, size, 44);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  if (showAnswer && options.artwork) {
    const { image, width, height } = options.artwork;
    const inner = size - 80;
    const scale = Math.min(inner / width, inner / height);
    const w = width * scale;
    const h = height * scale;
    ctx.drawImage(image, mid - w / 2, py + (size - h) / 2, w, h);
  } else if (!showAnswer) {
    text(
      ctx,
      '?',
      mid,
      py + size / 2 + 130,
      '700 380px',
      'rgba(255,255,255,0.7)',
      'center',
      CARD_DISPLAY_FONT_FAMILY,
    );
  }
  const caption =
    showAnswer && options.answer ? `It was ${options.answer.name}` : 'Can you name it?';
  text(ctx, caption, mid, py + size + 78, '600 46px', INK, 'center', CARD_DISPLAY_FONT_FAMILY);

  // Score
  const scoreY = 1050;
  text(
    ctx,
    String(data.score),
    mid - 52,
    scoreY,
    '700 108px',
    DEX_RED,
    'right',
    CARD_DISPLAY_FONT_FAMILY,
  );
  text(ctx, `/${SCORING.startScore}`, mid - 40, scoreY, '600 52px', INK_SOFT, 'left');
  text(ctx, outcomeLabel(data.status), mid, scoreY + 56, '700 36px', STATUS_COLOUR[data.status]);

  // Stats
  const stats = [
    { value: String(data.wrongGuesses), label: 'Wrong guesses' },
    { value: String(data.revealsUsed), label: 'Reveals' },
    { value: data.streak > 0 ? String(data.streak) : '—', label: 'Day streak' },
  ];
  stats.forEach((stat, i) => {
    const x = 270 + i * 270;
    text(ctx, stat.value, x, 1184, '700 56px', INK, 'center', CARD_DISPLAY_FONT_FAMILY);
    text(ctx, stat.label, x, 1220, '600 26px', INK_SOFT);
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
      ctx.fillStyle = DEX_RED;
      ctx.fill();
    } else {
      ctx.fillStyle = '#c5cfe0';
      ctx.fill();
    }
    text(
      ctx,
      `${Math.round(fraction * 100)}%`,
      x + pillW / 2,
      1282,
      '700 24px',
      i < seen ? '#ffffff' : INK_SOFT,
    );
  });

  if (options.url) {
    text(ctx, options.url.replace(/^https?:\/\//, ''), mid, 1330, '600 24px', INK_SOFT);
  }
}
