# BEST ELECTRICAL Mobile App

Run `npm install` then `npx expo start`. See the root README for LAN API configuration and EAS push notification setup.

For Android release builds, use the Expo SDK 52-compatible dependency versions in `package.json`, run `npx expo install --fix` and `npx expo-doctor`, then build with `npx eas-cli@latest build --platform android --profile preview --clear-cache`.

Remote push notifications require an Expo/EAS project ID, Android push credentials, and an installed development/production build. Opening the app once registers its Expo push token. SMS is not required for push notifications.
