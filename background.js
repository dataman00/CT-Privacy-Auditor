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
  "://redirectingat.com",
  "dpbolvw.net",
  "jdoqocy.com",
  "tkqlhce.com",
  "awin1.com",
  "anrdoezrs.net"
];

// Helper function to calculate total hits and update the icon badge
function updateBadge() {
  chrome.storage.local.get({ trackerCounts: {} }, (data) => {
    const counts = data.trackerCounts;
    let totalHits = 0;
    
    // Sum up all the hits
    for (let domain in counts) {
      totalHits += counts[domain];
    }
    
    if (totalHits > 0) {
      chrome.action.setBadgeText({ text: totalHits.toString() });
      chrome.action.setBadgeBackgroundColor({ color: "#c9302c" }); // Red badge
    } else {
      chrome.action.setBadgeText({ text: "" }); // Clear badge if 0
    }
  });
}

// Initialize badge text when background worker wakes up
updateBadge();

// Monitor network traffic and update counter metrics
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const url = new URL(details.url);
      const hostname = url.hostname;

      const matchedTracker = TARGET_TRACKERS.find(tracker => hostname.includes(tracker));

      if (matchedTracker) {
        chrome.storage.local.get({ trackerCounts: {} }, (data) => {
          let counts = data.trackerCounts;
          
          if (counts[matchedTracker]) {
            counts[matchedTracker] += 1;
          } else {
            counts[matchedTracker] = 1;
          }
          
          chrome.storage.local.set({ trackerCounts: counts }, () => {
            updateBadge(); // Update the icon visual right after saving
          });
        });
      }
    } catch (e) {
      console.error("Error evaluating target tracker payload: ", e);
    }
  },
  { urls: ["<all_urls>"] }
);
