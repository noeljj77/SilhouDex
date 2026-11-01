import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pages load on demand, which can take longer than the 1 s default on a slow CI machine.
configure({ asyncUtilTimeout: 8000 });

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
