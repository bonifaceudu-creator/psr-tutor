# PSR Tutor

Offline Public Service Rules application built with Apache Cordova.

## Version 1.1.1

- Seven-day full-feature trial after entry of a date/device-derived Trial Code.
- Lifetime access through a separate date/device-derived Lifetime Code.
- Local-only trial/licensing storage.
- No Cordova external-file/storage permission; trial and licensing remain local.
- Native device UUID support through `cordova-plugin-device`.
- Live seven-day countdown timer.
- Referenced PSR rule numbers are clickable and open in a floating reader window.
- Closing a referenced-rule window returns the user to the previous document scroll position.
- Service-worker cache updated to `psr-tutor-v11.0`.

### Access-code calculation

Codes are generated offline from the device identifier and the current date. The application accepts:

- Trial Code — numeric only; generated as `8 × ISO weekday × ISO week number × numeric device ID`.
- Lifetime Code — numeric only; generated as `15 × ISO weekday × ISO week number × numeric device ID`.

The code-generation logic is contained in `app.js`. The numeric device ID displayed by the app is the identifier used in the formula.

### Build

The project is configured for Apache Cordova Android. The GitHub Actions workflow builds the debug APK and uploads it as an artifact.
