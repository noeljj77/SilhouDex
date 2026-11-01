# Security policy

## Supported versions

The latest release on the `main` branch is the only supported version.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it and what it could allow.

You can expect an acknowledgement within a few days. Fixes for confirmed issues are released as soon as they are tested, and the report is credited unless you prefer otherwise.

## What is and is not in scope

- **In scope:** the published site and this repository's code, including the Content-Security-Policy, the sign-in and cloud-saving code, and the Firestore rules in [`firestore.rules`](firestore.rules).
- **Known and accepted:** the daily answers are part of the app's data, so they can be found by inspecting it (see "Known limits" in the README). Firebase web settings in `src/cloud/firebaseConfig.ts` are public identifiers by design; access to saved progress is controlled by Google sign-in and the Firestore rules.
