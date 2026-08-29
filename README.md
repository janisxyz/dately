# Dately

Dating questionnaires with automatic candidate filters.

Write the questions you actually want answered — text, sliders, multiple choice, yes/no, scales, or answers you define yourself. People apply with a profile (photos, a short video, name, age, and any fields they invent). Hard filters decide who is a candidate before you ever open the inbox.

## Android / Play Store

The Android app is a Capacitor wrapper around the live Dately site (`applicationId`: `app.dately`).

GitHub Actions (`.github/workflows/android-release.yml`):

1. Tag `v1.0.0` (or run the workflow from the Actions tab).
2. CI builds a **debug APK** and attaches it to a **GitHub Release**.
3. If you add an upload keystore, CI also builds a **signed release APK + AAB**.
4. If you add a Play service account, CI uploads the AAB to the Play Console **internal** track as a draft.

### Secrets to add

Repo → Settings → Secrets and variables → Actions:

| Secret | Purpose |
| --- | --- |
| `WEB_APP_URL` | Live Dately URL loaded in the Android WebView |
| `ANDROID_KEYSTORE_BASE64` | `base64` of your `.jks` upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | JSON for a Google Cloud service account with Play Android Developer API access |

Play Console: create the app `Dately`, package `app.dately`, complete the store listing, then invite the service account as a user with **Release to production / testing tracks** permission. First AAB lands on the **internal testing** track as a draft so you can review it before rolling out.
