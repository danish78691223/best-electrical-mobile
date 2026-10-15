# BEST ELECTRICAL Mobile App

Run `npm install` then `npx expo start`. See the root README for LAN API configuration and EAS push notification setup.

For Android release builds, use the Expo SDK 52-compatible dependency versions in `package.json`, run `npx expo install --fix` and `npx expo-doctor`, then build with `npx eas-cli@latest build --platform android --profile preview --clear-cache`.

Remote push notifications require an Expo/EAS project ID, Android push credentials, and an installed development/production build. Opening the app once registers its Expo push token. SMS is not required for push notifications.


## Owner-only contact sync utility

The existing app at the repository root remains the customer-facing store app. The separate `owner-contact-sync/` directory contains an Android-only, shop-owner utility to read contact names and phone numbers after Android permission and sync them into the protected marketing registry. Customers do not install it.

Setup and internal APK build steps are in [owner-contact-sync/README.md](./owner-contact-sync/README.md). Use the backend marketing feature branch for the matching protected API. Contact import does not provide SMS/WhatsApp consent and does not send messages.
