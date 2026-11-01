/** The signed-in player, as far as the app needs to show them. */
export interface CloudUser {
  uid: string;
  name: string;
  photoUrl: string | null;
}

/**
 * Everything the app needs from an online service: Google sign-in and one saved document per
 * player. Firebase is one implementation; tests use a fake. Nothing else depends on Firebase.
 */
export interface CloudBackend {
  /** Calls back right away with the current player (or null), then on every change. */
  onAuthChange(callback: (user: CloudUser | null) => void): () => void;
  /** Opens the Google sign-in window. Resolves 'cancelled' if the player closes it. */
  signIn(): Promise<'signed-in' | 'cancelled'>;
  signOut(): Promise<void>;
  /** The player's saved progress as JSON text, or null if nothing is saved yet. */
  load(uid: string): Promise<string | null>;
  save(uid: string, json: string): Promise<void>;
}
