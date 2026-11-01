/**
 * Your Firebase project's web settings (Firebase console → Project settings → Your apps → Web app).
 * These are public identifiers, not secrets: access is controlled by the sign-in and by
 * firestore.rules, so it is safe to commit them. Fill them in to switch Google sign-in on; while
 * they are empty the site works as before and shows no sign-in button. See docs/firebase-setup.md.
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
};

export const isCloudConfigured = Object.values(firebaseConfig).every((value) => value !== '');
