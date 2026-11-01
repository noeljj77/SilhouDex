import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProgressStore, type ProgressStore } from '../app/progressStore.ts';
import { SCHEMA_VERSION, createEmptyProgress } from '../domain/progression/record.ts';
import type { GameSession } from '../domain/game/types.ts';
import type { ProgressData } from '../domain/progression/types.ts';
import type { ProgressRepository } from '../persistence/localRepository.ts';
import { createSyncController, type CloudController, type OwnerMemory } from './syncController.ts';
import type { CloudBackend, CloudUser } from './types.ts';

const NOW = '2026-11-02T10:00:00.000Z';
const user: CloudUser = { uid: 'u1', name: 'Ash', photoUrl: null };

function memoryRepo(initial: ProgressData): ProgressRepository {
  let data = initial;
  return { mode: 'persistent', load: () => data, save: (d) => void (data = d) };
}

function fakeBackend(saved: Record<string, string> = {}) {
  let callback: ((u: CloudUser | null) => void) | undefined;
  const backend = {
    docs: saved,
    saves: 0,
    failLoad: false,
    failSave: false,
    signInResult: 'signed-in' as 'signed-in' | 'cancelled',
    onAuthChange: vi.fn((cb: (u: CloudUser | null) => void) => {
      callback = cb;
      cb(null);
      return () => {};
    }),
    signIn: vi.fn(async () => {
      if (backend.signInResult === 'signed-in') callback?.(user);
      return backend.signInResult;
    }),
    signOut: vi.fn(async () => callback?.(null)),
    load: vi.fn(async (uid: string) => {
      if (backend.failLoad) throw new Error('offline');
      return backend.docs[uid] ?? null;
    }),
    save: vi.fn(async (uid: string, json: string) => {
      if (backend.failSave) throw new Error('offline');
      backend.saves += 1;
      backend.docs[uid] = json;
    }),
  };
  return backend satisfies CloudBackend & Record<string, unknown>;
}

const finishedDaily = (store: ProgressStore, date: string, pokemonId = 25) => {
  const session: GameSession = {
    id: `daily-${date}`,
    mode: 'daily',
    pokemonId,
    challengeNumber: 1,
    dateKey: date as never,
    guesses: [{ pokemonId, correct: true, at: NOW }],
    status: 'won',
    startedAt: NOW,
    endedAt: NOW,
  };
  store.finishGame(session);
};

describe('createSyncController', () => {
  let store: ProgressStore;
  let controller: CloudController;

  beforeEach(() => {
    vi.useFakeTimers();
    store = createProgressStore(memoryRepo(createEmptyProgress(NOW, 'p1')), {
      catalogue: [],
      now: () => NOW,
    });
  });
  afterEach(() => {
    controller?.dispose();
    vi.useRealTimers();
  });

  it('starts signed out and sends nothing to the cloud', async () => {
    const backend = fakeBackend();
    controller = createSyncController(store, backend, { now: () => NOW });
    finishedDaily(store, '2026-11-02');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(controller.getState().status).toBe('signed-out');
    expect(backend.save).not.toHaveBeenCalled();
  });

  it('on sign-in merges the cloud copy into this device and saves the result back', async () => {
    const cloud = createProgressStore(memoryRepo(createEmptyProgress(NOW, 'p2')), {
      catalogue: [],
      now: () => NOW,
    });
    finishedDaily(cloud, '2026-11-03', 4);
    const backend = fakeBackend({ u1: JSON.stringify(cloud.getSnapshot()) });
    controller = createSyncController(store, backend, { now: () => NOW });
    finishedDaily(store, '2026-11-02', 25);

    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);

    expect(controller.getState()).toMatchObject({ status: 'synced', user });
    expect(Object.keys(store.getSnapshot().daily.results).sort()).toEqual([
      '2026-11-02',
      '2026-11-03',
    ]);
    const saved = JSON.parse(backend.docs['u1']!) as ProgressData;
    expect(Object.keys(saved.daily.results).sort()).toEqual(['2026-11-02', '2026-11-03']);
  });

  it('saves one pause after the last change, not on every change', async () => {
    const backend = fakeBackend();
    controller = createSyncController(store, backend, { debounceMs: 2000, now: () => NOW });
    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);
    const afterSignIn = backend.save.mock.calls.length;

    store.setDifficulty('hard');
    await vi.advanceTimersByTimeAsync(1000);
    store.setDifficulty('easy');
    await vi.advanceTimersByTimeAsync(1999);
    expect(backend.save).toHaveBeenCalledTimes(afterSignIn);
    await vi.advanceTimersByTimeAsync(1);
    expect(backend.save).toHaveBeenCalledTimes(afterSignIn + 1);
    expect((JSON.parse(backend.docs['u1']!) as ProgressData).settings.difficulty).toBe('easy');
  });

  it('keeps progress on the device and reports it when the cloud cannot be reached', async () => {
    const backend = fakeBackend();
    backend.failLoad = true;
    controller = createSyncController(store, backend, { now: () => NOW });
    finishedDaily(store, '2026-11-02');
    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('error');
    expect(controller.getState().message).toMatch(/still saved on this device/);
    expect(Object.keys(store.getSnapshot().daily.results)).toEqual(['2026-11-02']);
  });

  it('never overwrites cloud progress written by a newer version of the app', async () => {
    const future = JSON.stringify({
      ...createEmptyProgress(NOW, 'p2'),
      schemaVersion: SCHEMA_VERSION + 1,
    });
    const backend = fakeBackend({ u1: future });
    controller = createSyncController(store, backend, { now: () => NOW });
    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);
    store.setDifficulty('hard');
    await vi.advanceTimersByTimeAsync(5000);
    expect(controller.getState().status).toBe('error');
    expect(backend.save).not.toHaveBeenCalled();
    expect(backend.docs['u1']).toBe(future);
  });

  it('never overwrites cloud progress it cannot read', async () => {
    const backend = fakeBackend({ u1: '{not json' });
    controller = createSyncController(store, backend, { now: () => NOW });
    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('error');
    expect(backend.save).not.toHaveBeenCalled();
  });

  it('goes back to signed out, with no message, when the sign-in window is closed', async () => {
    const backend = fakeBackend();
    backend.signInResult = 'cancelled';
    controller = createSyncController(store, backend, { now: () => NOW });
    await controller.signIn();
    expect(controller.getState()).toMatchObject({ status: 'signed-out', message: '' });
  });

  it('tells the player when sign-in fails', async () => {
    const backend = fakeBackend();
    backend.signIn.mockRejectedValueOnce(new Error('popup blocked'));
    controller = createSyncController(store, backend, { now: () => NOW });
    await controller.signIn();
    expect(controller.getState().status).toBe('signed-out');
    expect(controller.getState().message).toMatch(/pop-ups/);
  });

  it('saves pending changes before signing out, and keeps progress on the device', async () => {
    const backend = fakeBackend();
    controller = createSyncController(store, backend, { debounceMs: 2000, now: () => NOW });
    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);

    store.setDifficulty('hard');
    await controller.signOut();
    await vi.advanceTimersByTimeAsync(0);

    expect((JSON.parse(backend.docs['u1']!) as ProgressData).settings.difficulty).toBe('hard');
    expect(controller.getState()).toMatchObject({ status: 'signed-out', user: null });
    expect(store.getSnapshot().settings.difficulty).toBe('hard');
  });

  it('never saves over the cloud copy after a failed first load, and retries instead', async () => {
    const cloud = createProgressStore(memoryRepo(createEmptyProgress(NOW, 'p2')), {
      catalogue: [],
      now: () => NOW,
    });
    finishedDaily(cloud, '2026-11-03', 4);
    const backend = fakeBackend({ u1: JSON.stringify(cloud.getSnapshot()) });
    backend.failLoad = true;
    controller = createSyncController(store, backend, { debounceMs: 2000, now: () => NOW });

    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('error');

    // Playing on while the cloud is unreachable must not overwrite what is saved there.
    store.setDifficulty('hard');
    await vi.advanceTimersByTimeAsync(2000);
    expect(backend.save).not.toHaveBeenCalled();

    // Once it is reachable again, the next change merges first and saves second.
    backend.failLoad = false;
    store.setDifficulty('easy');
    await vi.advanceTimersByTimeAsync(2000);
    const saved = JSON.parse(backend.docs['u1']!) as ProgressData;
    expect(Object.keys(saved.daily.results)).toEqual(['2026-11-03']);
    expect(controller.getState().status).toBe('synced');
  });

  it("does not carry another account's progress into the account that signs in", async () => {
    const owner: OwnerMemory = { get: () => 'someone-else', set: vi.fn() };
    const backend = fakeBackend();
    controller = createSyncController(store, backend, { owner, now: () => NOW });
    finishedDaily(store, '2026-11-02');

    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getSnapshot().daily.results).toEqual({});
    expect((JSON.parse(backend.docs['u1']!) as ProgressData).daily.results).toEqual({});
    expect(owner.set).toHaveBeenCalledWith('u1');
  });

  it('merges this device into the account it already belongs to', async () => {
    const owner: OwnerMemory = { get: () => 'u1', set: vi.fn() };
    const backend = fakeBackend();
    controller = createSyncController(store, backend, { owner, now: () => NOW });
    finishedDaily(store, '2026-11-02');

    await controller.signIn();
    await vi.advanceTimersByTimeAsync(0);

    expect(Object.keys((JSON.parse(backend.docs['u1']!) as ProgressData).daily.results)).toEqual([
      '2026-11-02',
    ]);
  });

  it('ignores a cloud copy that arrives after the player has signed out', async () => {
    const cloud = createProgressStore(memoryRepo(createEmptyProgress(NOW, 'p2')), {
      catalogue: [],
      now: () => NOW,
    });
    finishedDaily(cloud, '2026-11-03', 4);
    const backend = fakeBackend();
    let arrive: (json: string) => void = () => {};
    backend.load.mockImplementationOnce(() => new Promise<string>((resolve) => (arrive = resolve)));
    controller = createSyncController(store, backend, { now: () => NOW });

    await controller.signIn();
    await controller.signOut();
    arrive(JSON.stringify(cloud.getSnapshot()));
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getSnapshot().daily.results).toEqual({});
    expect(controller.getState().status).toBe('signed-out');
  });
});
