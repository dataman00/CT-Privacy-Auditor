# Changelog

## 2.0.0 (October 9, 2026)

### Fixed
* "Clear data" button did nothing: the popup crashed looking for a missing `dev-contact` element before the button was wired up.
* Hit counts were lost when several tracker requests arrived at once. Counting now happens in memory and is saved in batches.
* `redirectingat.com` never matched because the entry started with `://`.
* Domain matching caught look-alike hosts such as `mycriteo.com`. It now matches the exact domain or its subdomains only.
* Clearing data could be undone by a pending save from the background worker. Clearing now goes through the worker.

### Added
* `navigator.globalPrivacyControl` is set on every page, the JavaScript half of the GPC standard that many consent tools check instead of the header.
* Activity is recorded per website, with first and last seen times.
* Cookie-setting attempts by trackers are counted (presence of `Set-Cookie` only; values are never read).
* The popup checks the current site's `/.well-known/gpc.json` file.
* GPC on/off switch that controls both the header and the JavaScript signal. The status label now reflects the real setting.
* Export to CSV and JSON with timestamps. The JSON export also records the extension and browser versions.
* Two-step "Clear data" confirmation, dark mode, and a working feedback link.
* Hit counts from v1.5 are kept under "(recorded before v2.0, site unknown)".

### Changed
* The icon badge shows tracker requests on the current page instead of a lifetime total.
* Wording no longer labels every tracker request as a violation. The popup and exports describe what was observed and note that a request alone is not proof of non-compliance.
* Tracker list moved to `trackers.js` so it is easy to update.
* Background worker only wakes for tracker traffic and new page loads instead of every request.

### Removed
* Unused `privacy` permission.
