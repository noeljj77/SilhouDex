import type { CloudStatus } from '../../cloud/syncController.ts';

/** Colour of the small dot showing whether progress is saved to the account. */
export const STATUS_DOT: Record<CloudStatus, string> = {
  'signed-out': 'bg-line',
  'signing-in': 'bg-volt',
  syncing: 'bg-volt',
  synced: 'bg-[#5be08a]',
  error: 'bg-dex-light',
};
