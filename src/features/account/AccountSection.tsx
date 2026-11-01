import { LogOut } from 'lucide-react';
import { useCloud } from '../../cloud/useCloud.ts';
import { Avatar } from './Avatar.tsx';
import { GoogleIcon } from './GoogleIcon.tsx';

const formatTime = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null;
};

/** Profile card: save progress to a Google account, see its status, or sign out. */
export function AccountSection() {
  const cloud = useCloud();
  if (!cloud) return null;
  const { controller, state } = cloud;

  if (!state.user) {
    return (
      <section aria-labelledby="account" className="dex-card flex flex-col gap-3 p-4">
        <h2 id="account" className="font-display text-2xl text-ink">
          Save your progress
        </h2>
        <p className="text-sm text-ink-soft">
          Sign in with Google to keep your streak, Pokédex and achievements on every device. Until
          you sign in, your progress stays on this device only.
        </p>
        <button
          type="button"
          onClick={() => void controller.signIn()}
          disabled={state.status === 'signing-in'}
          className="dex-btn dex-btn-yellow w-fit"
        >
          <GoogleIcon />
          {state.status === 'signing-in' ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {state.message && (
          <p role="alert" className="text-sm font-bold text-dex-dark">
            {state.message}
          </p>
        )}
      </section>
    );
  }

  const time = formatTime(state.lastSyncedAt);
  const status =
    state.status === 'syncing'
      ? 'Saving your progress…'
      : state.status === 'synced'
        ? `Progress saved to your account${time ? ` at ${time}` : ''}`
        : state.message;

  return (
    <section aria-labelledby="account" className="dex-card flex flex-col gap-3 p-4">
      <h2 id="account" className="sr-only">
        Account
      </h2>
      <div className="flex items-center gap-3">
        <Avatar user={state.user} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl text-ink">{state.user.name}</p>
          <p
            role="status"
            aria-live="polite"
            className={`text-sm ${state.status === 'error' ? 'font-bold text-dex-dark' : 'text-ink-soft'}`}
          >
            {status}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void controller.signOut()}
          className="dex-btn !min-h-10 !text-sm"
        >
          <LogOut size={16} aria-hidden /> Sign out
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        Signing out keeps your progress on this device. Sign back in on any device to carry on.
      </p>
    </section>
  );
}
