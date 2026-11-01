import { Component, type ErrorInfo, type ReactNode } from 'react';
import { hrefFor } from './router.ts';

interface State {
  error: Error | null;
}

/**
 * Catches a crash in any page and shows a friendly screen instead of a blank one. Progress lives
 * in LocalStorage, so nothing is lost. Give it a `key` that changes with the page, so moving to
 * another page tries again.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SilhouDex hit an unexpected error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main
        role="alert"
        className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
      >
        <h1 className="text-3xl font-black text-white">Something went wrong</h1>
        <p className="text-violet-200/80">
          Your progress is saved on this device. Reloading the page usually fixes this.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-gradient-to-r from-violet-glow to-cyan-glow px-5 py-2.5 font-bold text-night-950 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Reload the page
          </button>
          <a
            href={hrefFor('daily')}
            className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20"
          >
            Back to the Daily game
          </a>
        </div>
      </main>
    );
  }
}
