# Changelog

## 2.2.0 (October 13, 2026)

### Added
* Firefox support (Firefox 140 or later). The same files now load in both Chrome and Firefox.
* The popup warns when site access has been turned off for the extension and offers a button to allow it again.
* The popup notes when the browser's own GPC setting is also on (Firefox has one under Settings, Privacy and security).

### Changed
* Scripts load as plain scripts instead of ES modules, so they work in Chrome's service worker and Firefox's background page.
* Manifest declares both `background.service_worker` (used by Chrome) and `background.scripts` (used by Firefox).
* Added `browser_specific_settings.gecko` with an add-on ID and `data_collection_permissions: none`, which addons.mozilla.org requires for new extensions.
* Minimum Chrome version raised to 121, the first version that accepts the Firefox background key.
* Cookie checks request Chrome's `extraHeaders` option only where it exists, and site attribution also reads Firefox's `documentUrl` and `originUrl`.

## 2.1.0 (October 9, 2026)

### Added
* Tracker list expanded from 19 to 68 domains, including data brokers and identity-matching services (LiveRamp, Adobe, Lotame, Experian, TransUnion, Nielsen, ID5, Unified ID 2.0 and others), social media ad pixels, more ad exchanges, and session-recording tools.
* Every tracker has an owner and a category: Data broker, Ad pixel, Ad network, Session recording, Affiliate, or Analytics.
* The popup tags each tracker with its category, lists data brokers first, and summarizes each site (for example "Contacted 1 data broker").
* Sites that contacted a data broker are sorted to the top.
* CSV export adds tracker_owner and category columns. JSON export adds owner, category, a data broker count, and a per-category count for each site.

### Changed
* Tracker entries can now be a specific subdomain (for example `connect.facebook.net`) so ordinary embeds on the parent domain are not counted. When two entries match, the most specific wins.

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
