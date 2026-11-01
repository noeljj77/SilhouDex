import type { ProgressStore } from '../app/progressStore.ts';
import { migrateToCurrent } from '../persistence/migrations.ts';
import { newId } from '../lib/id.ts';
import type { CloudBackend, CloudUser } from './types.ts';

export type CloudStatus = 'signed-out' | 'signing-in' | 'syncing' | 'synced' | 'error';

export interface CloudState {
  status: CloudStatus;
  user: CloudUser | null;
  /** A plain-language note for the player when something needs their attention. */
  message: string;
  lastSyncedAt: string | null;
}

export interface CloudController {
  getState(): CloudState;
  subscribe(listener: () => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Pulls the latest cloud progress and pushes this device's, if signed in. */
  refresh(): void;
  dispose(): void;
}

export interface SyncOptions {
  /** How long to wait after the last change before saving, so a burst becomes one write. */
  debounceMs?: number;
  now?: () => string;
}

const OFFLINE = 'Could not reach the cloud. Your progress is still saved on this device.';

/**
 * Keeps the player's progress in sync with the cloud while they are signed in:
 * when they sign in it merges the cloud copy into this device and saves the result back, and after
 * that every change is saved (after a short pause). Signed out, nothing leaves the device.
 */
export function createSyncController(
  store: ProgressStore,
  backend: CloudBackend,
  options: SyncOptions = {},
): CloudController {
  const debounceMs = options.debounceMs ?? 2000;
  const now = options.now ?? (() => new Date().toISOString());

  let state: CloudState = { status: 'signed-out', user: null, message: '', lastSyncedAt: null };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<CloudState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  let uid: string | null = null;
  /** True when the cloud copy must not be overwritten (it is unreadable or from a newer version). */
  let blocked = false;
  /** True while a cloud copy is being merged in, so that merge is not itself saved as a change. */
  let applyingRemote = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue: Promise<void> = Promise.resolve();
  const run = (task: () => Promise<void>) => {
    queue = queue.then(task, task);
    return queue;
  };

  const block = (message: string) => {
    blocked = true;
    set({ status: 'error', message });
  };

  /** Merges the cloud copy into this device. Returns false if it must not be overwritten. */
  async function pull(id: string): Promise<boolean> {
    const json = await backend.load(id);
    if (json === null) return true;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      block('Your saved cloud progress could not be read, so it was left as it is.');
      return false;
    }
    const result = migrateToCurrent(parsed, { now: now(), playerId: newId() });
    if (result.status === 'future') {
      block(
        'Your cloud progress comes from a newer version of SilhouDex. Reload the page to update.',
      );
      return false;
    }
    if (result.status === 'invalid') {
      block('Your saved cloud progress could not be read, so it was left as it is.');
      return false;
    }
    applyingRemote = true;
    try {
      store.mergeRemote(result.data);
    } finally {
      applyingRemote = false;
    }
    return true;
  }

  const push = (id: string) => backend.save(id, JSON.stringify(store.getSnapshot()));

  async function sync(id: string) {
    set({ status: 'syncing', message: '' });
    try {
      if (!(await pull(id))) return;
      await push(id);
      if (uid === id) set({ status: 'synced', lastSyncedAt: now(), message: '' });
    } catch {
      if (uid === id) set({ status: 'error', message: OFFLINE });
    }
  }

  async function flush() {
    clearTimeout(timer);
    timer = undefined;
    const id = uid;
    if (!id || blocked) return;
    try {
      await push(id);
      if (uid === id) set({ status: 'synced', lastSyncedAt: now(), message: '' });
    } catch {
      if (uid === id) set({ status: 'error', message: OFFLINE });
    }
  }

  const stopWatchingStore = store.subscribe(() => {
    if (!uid || blocked || applyingRemote) return;
    clearTimeout(timer);
    timer = setTimeout(() => void run(flush), debounceMs);
  });

  const stopWatchingAuth = backend.onAuthChange((user) => {
    clearTimeout(timer);
    timer = undefined;
    blocked = false;
    if (!user) {
      uid = null;
      set({ status: 'signed-out', user: null, message: '', lastSyncedAt: null });
      return;
    }
    uid = user.uid;
    set({ user, status: 'syncing', message: '' });
    void run(() => sync(user.uid));
  });

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async signIn() {
      set({ status: 'signing-in', message: '' });
      try {
        const outcome = await backend.signIn();
        if (outcome === 'cancelled') set({ status: 'signed-out' });
      } catch {
        set({
          status: 'signed-out',
          message: 'Sign-in did not work. Allow pop-ups for this site and try again.',
        });
      }
    },
    async signOut() {
      // Save anything still waiting, so signing out never loses the last few moves.
      if (timer) await run(flush);
      await backend.signOut();
    },
    refresh() {
      if (uid) {
        const id = uid;
        blocked = false;
        void run(() => sync(id));
      }
    },
    dispose() {
      clearTimeout(timer);
      stopWatchingStore();
      stopWatchingAuth();
    },
  };
}
