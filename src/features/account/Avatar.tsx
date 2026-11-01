import type { CloudUser } from '../../cloud/types.ts';

/** The player's Google picture, or their initial if there is none (or it fails to load). */
export function Avatar({ user, size }: { user: CloudUser; size: number }) {
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';
  return user.photoUrl ? (
    <img
      src={user.photoUrl}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      className="rounded-full border-2 border-ink bg-panel object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="grid place-items-center rounded-full border-2 border-ink bg-volt font-display text-lg text-ink"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}
