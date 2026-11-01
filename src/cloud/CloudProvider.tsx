import { useEffect, useState, type ReactNode } from 'react';
import { useProgressStore } from '../app/progressStore.ts';
import { CloudContext } from './useCloud.ts';
import { createFirebaseBackend } from './firebaseBackend.ts';
import { isCloudConfigured } from './firebaseConfig.ts';
import { createSyncController, type CloudController } from './syncController.ts';

/** Re-check the cloud when the player comes back to the tab after at least this long. */
const REFRESH_AFTER_MS = 60_000;

/**
 * Provides Google sign-in and cloud saving. Pass `controller` in tests. Without a Firebase
 * project configured (and no controller) nothing is provided and the app stays on-device only.
 */
export function CloudProvider({
  controller,
  children,
}: {
  controller?: CloudController;
  children: ReactNode;
}) {
  const store = useProgressStore();
  const [value] = useState<CloudController | null>(() => {
    if (controller) return controller;
    return isCloudConfigured ? createSyncController(store, createFirebaseBackend()) : null;
  });

  useEffect(() => {
    if (!value) return;
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > REFRESH_AFTER_MS) value.refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [value]);

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}
