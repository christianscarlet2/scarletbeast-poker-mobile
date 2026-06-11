# Scarletbeast Poker — Mobile (React Native / Expo)

Cross-platform mobile client for **[poker.scarletbeast.com](https://poker.scarletbeast.com)**
(man vs machine No-Limit Hold'em). Like the desktop Electron app, it's a thin,
hardened **WebView shell**: the native app loads the live site, so it always
matches what's deployed — there is no bundled backend (the site needs
MariaDB / RabbitMQ / queue workers and can't run on-device).

`App.js` adds the native niceties on top of the WebView: loading spinner,
Android hardware-back navigation, off-origin links handed to the system browser,
safe-area insets, pull-to-refresh, branded dark/red theme, and an offline retry
screen.

## Stack / versions

- **Expo SDK 54** (React Native 0.81). Pinned to 54 deliberately — SDK 56 / RN 0.85
  is bleeding-edge and was hitting Gradle-plugin issues; 54 is the stable target.
- Android build pair: **AGP 8.11 + Gradle 8.14.3**, compileSdk/targetSdk 36, NDK r27b.

## Develop

```bash
npm install
npm start                 # Metro; open in Expo Go on a real device (scan QR)
```

## Build the Android APK (Linux/macOS/Windows with the Android SDK + JDK 17)

```bash
# Toolchain env (this machine keeps a self-contained SDK under /mnt because / is full):
source /mnt/www/android-tools/env.sh      # sets JAVA_HOME, ANDROID_HOME, GRADLE_USER_HOME, TMPDIR

npx expo prebuild --platform android --no-install   # (re)generate android/ if missing
cd android
./gradlew :app:assembleRelease --no-daemon -x lint
#  → app/build/outputs/apk/release/app-release.apk   (signed, see below)
```

A ready build is checked out at `Scarletbeast-Poker-1.0.0.apk` in the project root.
Sideload it on any Android device (enable "Install unknown apps").

### Signing

Release builds are signed with `android/app/sbpoker-release.keystore`
(alias `sbpoker`). Credentials live in `android/gradle.properties`
(`SBPOKER_*`). **Keep the keystore safe** — Play Store updates must reuse it.
If the `SBPOKER_*` props are absent, release falls back to debug signing.

## iOS

The native project is scaffolded at `ios/ScarletbeastPoker.xcodeproj`, but an
`.ipa` **cannot be built on Linux/Windows** — it needs macOS + Xcode, or Expo's
**EAS cloud build** (`eas build -p ios`, which builds without a local Mac).
Installing on a real iPhone also requires a paid Apple Developer account for
signing. On a Mac: `npx pod-install && npx expo run:ios --configuration Release`.

## Security posture

- WebView pinned to the `poker.scarletbeast.com` origin; off-origin URLs and
  non-http schemes (mailto:, bitcoin:, tel:) open in the system browser.
- `originWhitelist` restricted to `https://*`.
