import { useState, type ReactNode } from 'react';
import { createLocalRepository } from '../persistence/localRepository.ts';
import { ProgressContext, createProgressStore, type ProgressStore } from './progressStore.ts';

/** Provides the player's progress to the app. Pass `store` in tests; otherwise LocalStorage is used. */
export function ProgressProvider({
  store,
  children,
}: {
  store?: ProgressStore;
  children: ReactNode;
}) {
  const [value] = useState(() => store ?? createProgressStore(createLocalRepository()));
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
