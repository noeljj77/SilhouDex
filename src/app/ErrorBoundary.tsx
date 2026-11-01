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
        <h1 className="font-display text-3xl text-ink">Something went wrong</h1>
        <p className="text-ink-soft">
          Your progress is saved on this device. Reloading the page usually fixes this.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="dex-btn dex-btn-yellow"
          >
            Reload the page
          </button>
          <a href={hrefFor('daily')} className="dex-btn">
            Back to the Daily game
          </a>
        </div>
      </main>
    );
  }
}
