import { createContext, useContext, useSyncExternalStore } from 'react';
import type { CloudController, CloudState } from './syncController.ts';

export const CloudContext = createContext<CloudController | null>(null);

const SIGNED_OUT: CloudState = {
  status: 'signed-out',
  user: null,
  message: '',
  lastSyncedAt: null,
};
const none = () => () => {};

/** The cloud controller and its state, or null when sign-in is not available on this site. */
export function useCloud(): { controller: CloudController; state: CloudState } | null {
  const controller = useContext(CloudContext);
  const state = useSyncExternalStore(
    controller ? controller.subscribe : none,
    controller ? controller.getState : () => SIGNED_OUT,
  );
  return controller ? { controller, state } : null;
}
