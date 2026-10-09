/*
  CT Privacy Compliance Auditor
  Copyright (C) 2026 [Secure Dodo LLC]

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program. If not, see <https://gnu.org>.
*/

// Your existing extension code starts here...
const TARGET_TRACKERS = [
  "google-analytics.com", "googletagmanager.com", "scorecardresearch.com",
  "bounceexchange.com", "bounceit.net", "hotjar.com", "criteo.com", "criteo.net",
  "amazon-adsystem.com", "doubleclick.net", "adnxs.com", "pubmatic.com",
  "impactradius-event.com", "redirectingat.com", "dpbolvw.net", "jdoqocy.com",
  "tkqlhce.com", "awin1.com", "anrdoezrs.net", "wunderkind.co", "bkn.ai",
  "blackcrow.ai", "blackcrow.me", "retention.com", "geoiq.io", "contentsquare.net",
  "contentsquare.com", "clarity.ms", "inspectlet.com", "viglink.com", "sovrn.com",
  "pntrac.com", "pepperjam.com", "rakutenmarketing.com", "rmkt.co",
  "google.com", "connect.facebook.net", "ads-twitter.com", "bing.com"
];

function updateBadge() {
  chrome.storage.local.get({ trackerCounts: {} }, (data) => {
    let totalHits = 0;
    for (let domain in data.trackerCounts) {
      totalHits += data.trackerCounts[domain];
    }
    if (totalHits > 0) {
      chrome.action.setBadgeText({ text: totalHits.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#c9302c" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  });
}

updateBadge();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const url = new URL(details.url);
      const hostname = url.hostname;
      const matchedTracker = TARGET_TRACKERS.find(tracker => hostname.includes(tracker));

      if (matchedTracker) {
        chrome.storage.local.get({ trackerCounts: {} }, (data) => {
          let counts = data.trackerCounts;
          counts[matchedTracker] = (counts[matchedTracker] || 0) + 1;
          chrome.storage.local.set({ trackerCounts: counts }, () => {
            updateBadge();
          });
        });
      }
    } catch (e) {
      console.error("Error evaluating tracker payload:", e);
    }
  },
  { urls: ["<all_urls>"] }
);
