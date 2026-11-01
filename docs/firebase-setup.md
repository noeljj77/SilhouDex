# Google sign-in setup (Firebase)

SilhouDex stays on GitHub Pages. Google sign-in and cloud saving use Firebase's free Spark plan: no server of your own and no change of host.

Until the settings below are filled in, the site works exactly as before (progress on the device only) and shows no sign-in button.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and choose **Add project**. Name it `silhoudex`. Google Analytics is not needed.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email and save.
3. **Build → Firestore Database → Create database.** Choose **production mode** and a location near your players.

## 2. Allow your website to sign in

**Authentication → Settings → Authorized domains → Add domain:** `noeljj77.github.io`

(`localhost` is already allowed for local testing.)

## 3. Add the security rules

**Firestore Database → Rules.** Replace everything with the contents of [`firestore.rules`](../firestore.rules) and press **Publish**. These rules let each signed-in player read and write only their own document.

## 4. Register the web app and copy its settings

1. **Project settings (gear icon) → Your apps → Web (`</>`).** Name it `SilhouDex` and register it. Skip "Firebase Hosting".
2. Copy the `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`, `appId`) into [`src/cloud/firebaseConfig.ts`](../src/cloud/firebaseConfig.ts).

These are public identifiers, not secrets. What protects the data is the sign-in plus the rules in step 3, so committing them is safe. Restrict the API key to your website, so it can't be used from anywhere else. In the Google Cloud console, open **APIs & Services → Credentials**, click **Browser key (auto created by Firebase)**, and:

- Under **Application restrictions**, choose **Websites** and add `https://noeljj77.github.io/*`, `https://silhoudex.firebaseapp.com/*`, `https://silhoudex.web.app/*` and, for testing on your computer, `http://localhost:5173/*`. The `firebaseapp.com` address is required: Google's sign-in window runs there.
- Under **API restrictions**, choose **Restrict key** and tick only **Identity Toolkit API**, **Token Service API** and **Cloud Firestore API**.

## 5. Publish

Commit and push. GitHub Pages redeploys, and a **Sign in** button appears in the header and on the Profile page.

## How it behaves

- Signed out, nothing leaves the device.
- On sign-in, the saved copy is merged with this device's progress, so nothing is lost on either side. A finished daily game stays locked; the earliest result for a day wins.
- After that, every change is saved a couple of seconds later. Coming back to the tab after a while pulls any progress made on another device.
- Signing out keeps the progress on that device. If a different account signs in on the same device, the earlier account's progress is not carried into it: the device starts fresh and loads the new account's saved progress.
- If the saved copy cannot be reached when someone signs in, nothing is saved over it. The app keeps trying on later changes, and merges before it saves.
- Settings such as clue difficulty come from the account, so a new device picks up the player's choices.
- If the saved copy is unreadable or comes from a newer version of the app, it is never overwritten, and the player is told.

## What the Firebase pieces cost

The free plan covers 50,000 reads and 20,000 writes a day, and 1 GiB of stored data. One player's progress is one small document, saved after a pause, so a few thousand daily players fit comfortably.
