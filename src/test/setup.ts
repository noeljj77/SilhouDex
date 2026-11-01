import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { HOW_TO_PLAY_KEY } from '../features/help/howToPlayMemory.ts';

// Pages load on demand, which can take longer than the 1 s default on a slow CI machine.
configure({ asyncUtilTimeout: 8000 });

// The first-visit help card would sit over every screen under test, so it starts out dismissed.
beforeEach(() => {
  localStorage.setItem(HOW_TO_PLAY_KEY, '1');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom has no ResizeObserver; charts need one to exist.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// jsdom cannot draw. Canvas calls return nothing (and stay quiet) so components can render.
HTMLCanvasElement.prototype.getContext = () => null;
