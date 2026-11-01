import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig.ts';
import type { CloudBackend, CloudUser } from './types.ts';

const COLLECTION = 'users';

/** Firebase's code is loaded on demand, so it never slows down a visit that does not sign in. */
const loadAuth = () => Promise.all([import('firebase/app'), import('firebase/auth')]);
const loadStore = () => Promise.all([import('firebase/app'), import('firebase/firestore')]);

let authReady: { auth: Auth; api: typeof import('firebase/auth') } | undefined;
let storeReady: { db: Firestore; api: typeof import('firebase/firestore') } | undefined;

async function getAuthModules() {
  if (authReady) return authReady;
  const [app, api] = await loadAuth();
  const instance = app.getApps()[0] ?? app.initializeApp(firebaseConfig);
  authReady = { auth: api.getAuth(instance), api };
  return authReady;
}

let storePromise: Promise<NonNullable<typeof storeReady>> | undefined;

/**
 * Loads and sets up Firestore once. It is started early (while the player is still signing in),
 * so the database is ready by the time progress needs to be loaded.
 */
function getStoreModules() {
  storePromise ??= loadStore().then(([app, api]) => {
    const instance = app.getApps()[0] ?? app.initializeApp(firebaseConfig);
    // Firestore's usual streaming connection can stall behind some networks and browsers before
    // it gives up. Letting it spot that and switch to plain requests keeps the first save fast.
    const db = api.initializeFirestore(instance, { experimentalAutoDetectLongPolling: true });
    storeReady = { db, api };
    return storeReady;
  });
  storePromise.catch(() => (storePromise = undefined));
  return storePromise;
}

const toUser = (u: {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}): CloudUser => ({
  uid: u.uid,
  name: u.displayName ?? 'Trainer',
  photoUrl: u.photoURL,
});

/** Google sign-in with Firebase Auth, and one Firestore document per player. */
export function createFirebaseBackend(): CloudBackend {
  return {
    onAuthChange(callback) {
      let stopped = false;
      let unsubscribe = () => {};
      getAuthModules()
        .then(({ auth, api }) => {
          if (stopped) return;
          unsubscribe = api.onAuthStateChanged(auth, (u) => {
            // Signed-in players need the database next, so start loading it now.
            if (u) void getStoreModules().catch(() => {});
            callback(u ? toUser(u) : null);
          });
        })
        .catch(() => callback(null));
      return () => {
        stopped = true;
        unsubscribe();
      };
    },

    async signIn() {
      // The sign-in code is normally ready by the time the player taps the button. Opening the
      // window straight from the tap keeps phone browsers from blocking it as an unwanted pop-up.
      void getStoreModules().catch(() => {});
      const { auth, api } = authReady ?? (await getAuthModules());
      try {
        await api.signInWithPopup(auth, new api.GoogleAuthProvider());
        return 'signed-in';
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return 'cancelled';
        }
        throw error;
      }
    },

    async signOut() {
      const { auth, api } = await getAuthModules();
      await api.signOut(auth);
    },

    async load(uid) {
      const { db, api } = await getStoreModules();
      const snapshot = await api.getDoc(api.doc(db, COLLECTION, uid));
      const data = snapshot.exists() ? (snapshot.data() as { data?: unknown }).data : undefined;
      return typeof data === 'string' ? data : null;
    },

    async save(uid, json) {
      const { db, api } = await getStoreModules();
      await api.setDoc(api.doc(db, COLLECTION, uid), { data: json, updatedAt: Date.now() });
    },
  };
}
