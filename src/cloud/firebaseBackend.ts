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

async function getStoreModules() {
  if (storeReady) return storeReady;
  const [app, api] = await loadStore();
  const instance = app.getApps()[0] ?? app.initializeApp(firebaseConfig);
  storeReady = { db: api.getFirestore(instance), api };
  return storeReady;
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
          unsubscribe = api.onAuthStateChanged(auth, (u) => callback(u ? toUser(u) : null));
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
