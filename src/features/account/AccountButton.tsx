import { useCloud } from '../../cloud/useCloud.ts';
import { hrefFor } from '../../app/router.ts';
import { Avatar } from './Avatar.tsx';
import { STATUS_DOT } from './statusDot.ts';
import { GoogleIcon } from './GoogleIcon.tsx';

/** Header control: "Sign in" when signed out, the player's picture (linking to Profile) when in. */
export function AccountButton() {
  const cloud = useCloud();
  if (!cloud) return null;
  const { controller, state } = cloud;

  if (!state.user) {
    return (
      <button
        type="button"
        onClick={() => void controller.signIn()}
        disabled={state.status === 'signing-in'}
        aria-label="Sign in with Google"
        className="dex-btn !min-h-10 !gap-2 !px-3 !text-sm"
      >
        <GoogleIcon />
        {/* Icon only on the narrowest phones, where the header has no room for the word. */}
        <span className="hidden min-[360px]:inline">
          {state.status === 'signing-in' ? 'Signing in…' : 'Sign in'}
        </span>
      </button>
    );
  }

  return (
    <a
      href={hrefFor('profile')}
      aria-label={`${state.user.name}, signed in. Open your profile`}
      className="relative grid size-10 shrink-0 place-items-center rounded-full"
    >
      <Avatar user={state.user} size={40} />
      <span
        aria-hidden
        className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-ink ${STATUS_DOT[state.status]}`}
      />
    </a>
  );
}
