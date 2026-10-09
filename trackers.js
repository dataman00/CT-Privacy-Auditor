/*
  CT Privacy Compliance Auditor
  Copyright (C) 2026 Secure Dodo LLC
  Licensed under the GNU General Public License v3.0 or later.
  See LICENSE or <https://www.gnu.org/licenses/>.
*/

// Tracker domains to audit. Each entry matches the domain itself and any
// subdomain (for example "doubleclick.net" matches "stats.g.doubleclick.net").
// To expand coverage, replace or extend this list with a maintained source
// (check that source's license first).
export const TRACKERS = [
  "google-analytics.com",
  "googletagmanager.com",
  "scorecardresearch.com",
  "bounceexchange.com",
  "bounceit.net",
  "hotjar.com",
  "criteo.com",
  "criteo.net",
  "amazon-adsystem.com",
  "doubleclick.net",
  "adnxs.com",
  "pubmatic.com",
  "impactradius-event.com",
  "redirectingat.com",
  "dpbolvw.net",
  "jdoqocy.com",
  "tkqlhce.com",
  "awin1.com",
  "anrdoezrs.net"
];

// Returns the matching tracker domain, or null. Exact or subdomain match only,
// so "mycriteo.com" or "doubleclick.net.example.com" do not match.
export function matchTracker(hostname) {
  if (!hostname) return null;
  const host = hostname.toLowerCase().replace(/\.$/, "");
  for (const t of TRACKERS) {
    if (host === t || host.endsWith("." + t)) return t;
  }
  return null;
}

// Match patterns for webRequest filters, so the listener only wakes for
// tracker traffic instead of every request the browser makes.
export const TRACKER_URL_PATTERNS = TRACKERS.map((t) => `*://*.${t}/*`);
