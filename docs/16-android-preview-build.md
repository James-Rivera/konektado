# Android preview APK and web date/time support

Konektado's first Android release is an internal testing APK. It is a standalone
Expo/React Native app: testers do not need Expo Go, Metro, or a development computer.
The browser app remains supported with browser date/time inputs (DEC-139).

## Project and signing

- Expo project: `@avera_tech/Konektado`.
- EAS project ID: `0e7d3aa0-4c9a-4fd9-9a19-78e2dde2f0e5`.
- Android package: `app.konektado`; initial app version `1.0.0`, version code `1`.
- `eas.json` uses `preview`, internal distribution, the EAS `preview` environment,
  `developmentClient: false`, and `android.buildType: apk`.
- Android signing is EAS-managed. Reuse this project and keystore for updates;
  do not generate a replacement signing key. Keep any credential backups private.
- A Google Play release/AAB is a later task.

## Build on Windows

1. Install Node/npm and EAS CLI (`npm install --global eas-cli`), run `npm ci`,
   and sign in with `eas login` to an account with access to this Expo project.
2. Set the existing client-safe Supabase values in your ignored local `.env`:
   `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`.
3. Run `npm run build:android:preview`.
4. Follow the build URL printed by EAS and download the `.apk` after success.

The build script syncs only these explicit public variables to the project's EAS
preview environment: the two Supabase values, `EXPO_PUBLIC_PHONE_AUTH_ENABLED`
(defaults to `false`), and the optional internal demo editor email/user-ID allowlists.
Client configuration is bundled and readable by users; it must never contain secrets.
The allowlists are identifiers, not an authorization boundary: server-side admin
permissions remain required. Missing required configuration stops the script.

For configuration alone:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-preview.ps1 -ConfigureOnly
```

After configuration, another platform can also run:

```sh
eas build --platform android --profile preview
```

`.easignore` excludes all real `.env*` files, signing keys, credentials, backend
sources, generated native folders, and test output. Only the placeholder `.env.example`
is allowed. Never upload service-role keys, OTP backup codes, SMTP credentials, or
server/provider secrets. An archive audit can be run with:

```sh
eas build:inspect --platform android --profile preview --stage archive --output .test-build/eas-archive
```

## Installation and testing

Open the EAS build link on an Android phone, download the APK, allow installation
from that browser when Android asks, then install and launch Konektado. With a
USB-debugging-enabled device, `adb install -r <downloaded.apk>` is an alternative.
Subsequent APK updates require the same package and signing key. Increase Android
version code for later releases.

Before sharing broadly, test email signup/code/password, login, force-close/reopen
session restoration, viewer interaction gates, verification (including date of birth
and camera/gallery/file uploads), job date and exact time, posting, and messaging.
Test denied camera/gallery permission and retry paths. Existing contact verification
requirements are preserved; this slice does not alter Supabase settings or OTP behavior.
Also check keyboard-open forms and small-device safe areas on real Android hardware.

## Picker behavior and validation

Onboarding, verification, and job scheduling share `components/DateTimePicker`.
Metro uses its `.web.tsx` implementation for web and its base implementation for
native. The native package is never rendered by the browser. Android uses its
native dialog; iOS has a spinner with explicit Done/Cancel. Web has a labeled browser
date/time input with Done/Cancel, Escape dismissal, and keyboard submission.
Selection commits once; cancellation/Android Back does not change the saved value.
Each opening starts from the saved value, clamped to current date bounds if needed.

Date bounds use calendar days, not time-of-day timestamps. Birthdays cannot be in
the future; job dates cannot be in the past. Dates stay `YYYY-MM-DD` and exact times
stay `HH:mm`. Local parsing avoids UTC birthday shifts. Invalid or cleared browser
inputs cannot be committed. Existing surrounding Figma-aligned fields are retained.

Required checks:

```sh
npm run lint
npx tsc --noEmit
npm run test:date-time
npx expo install --check
npm run export:web
```

Check selection/reopening/cancellation, min/max dates, clearing invalid values,
midnight/noon, and keyboard handling at `360 x 800`, `390 x 844`, and `430 x 932`.
Automated utility tests exercise calendar preservation in Manila, Los Angeles,
and UTC. Web fixes take effect on the hosted site only after a separate deployment.

## First build

- Build: [Android preview](https://expo.dev/accounts/avera_tech/projects/Konektado/builds/7a0a0933-52ad-4ab9-9355-30f0e8920cee).
- Result: signed standalone APK built successfully.
- [Download the APK](https://expo.dev/artifacts/eas/vAIEAyvLUawBXmLLWVc_ENdCdKrPVQMNPgV8NrfeTrk.apk).
- Local ignored copy: `.test-build/Konektado-preview.apk`.
- Verified package `app.konektado`, version `1.0.0` / code `1`, minimum Android API
  `24`, target API `36`, application label `Konektado`, and an embedded Android JS bundle.
- APK SHA-256: `401FCE2BF41AE8B1DAE02655CA6F88B0457C52E49609038D74FBD42F1D6F3714`.
- The screenshot's animation-driver fallback and browser image-loading notice are
  separate from the unsupported picker. No broad animation rewrite is part of this slice.

## Validation record (2026-10-26, Asia/Manila)

- Expo SDK compatibility check: dependencies up to date after compatible SDK 57 patch updates.
- TypeScript, lint, six focused date/time tests, web export, and Android Hermes bundle export pass.
- An isolated browser harness using the actual web picker passed at all three required
  viewport sizes. It exercised birthday selection, reopening, Done/Cancel, past-job-date
  clamping and minimum date, maximum birthdate, cleared values, Escape, midnight/noon,
  keyboard submission, and a reduced-height viewport. No unsupported native-picker
  warning or horizontal overflow occurred. This is component coverage; complete
  authenticated-screen and hardware-keyboard/device workflow checks remain manual.
- The EAS archive audit found no real dotenv files or signing keys; backend, docs,
  and test directories contained no uploaded files. A scan found no local Supabase
  service-role key in the web export.
- Started the existing Pixel 5 AVD headlessly on Android 14 in read-only/no-snapshot
  mode. APK installation and cold launch passed without Expo Go or a dev server;
  the welcome and login screens rendered. Empty login submission displayed
  `Enter a valid email address.` No Android runtime or React Native JavaScript errors
  appeared in the startup/validation log. The temporary emulator was shut down afterwards.
- No authenticated test account or physical phone was used. Successful authentication,
  authenticated-session restoration, native picker interaction inside protected flows,
  camera/gallery permissions and uploads, posting, messaging, and full screen/keyboard
  checks on a real phone remain unverified. The browser harness's reduced-height
  check does not substitute for a real mobile software keyboard.
