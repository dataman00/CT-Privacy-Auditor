/*
  CT Privacy Compliance Auditor
  Copyright (C) 2026 Secure Dodo LLC

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import { matchTracker, TRACKER_URL_PATTERNS } from "./trackers.js";

const RULESET_ID = "gpc_rules";
const GPC_SCRIPT_ID = "gpc-js-signal";
const MAX_SITES = 1000;
const FLUSH_DELAY_MS = 2000;
const LEGACY_SITE = "(recorded before v2.0, site unknown)";

// In-memory state. All counting happens here and is saved in batches, so
// simultaneous requests can no longer overwrite each other's counts.
//   log:      { site: { tracker: { requests, cookies, first, last } } }
//   siteMeta: { site: { gpcJson, checked } }
//   tabSites: { tabId: hostname of the page open in that tab }
//   tabCounts:{ tabId: tracker requests seen on the current page }
let log = {};
let siteMeta = {};
let gpcEnabled = true;
let tabSites = {};
let tabCounts = {};
let localTimer = null;
let sessionTimer = null;

const ready = Promise.all([
  chrome.storage.local.get({ log: {}, siteMeta: {}, gpcEnabled: true, trackerCounts: null }),
  chrome.storage.session.get({ tabSites: {}, tabCounts: {} })
]).then(async ([local, session]) => {
  log = local.log;
  siteMeta = local.siteMeta;
  gpcEnabled = local.gpcEnabled;
  tabSites = session.tabSites;
  tabCounts = session.tabCounts;

  // Carry over hit counts from v1.5, which did not record the site.
  if (local.trackerCounts && Object.keys(local.trackerCounts).length) {
    const legacy = (log[LEGACY_SITE] = log[LEGACY_SITE] || {});
    for (const [tracker, n] of Object.entries(local.trackerCounts)) {
      const key = tracker.replace(/^:\/\//, "");
      legacy[key] = legacy[key] || { requests: 0, cookies: 0, first: null, last: null };
      legacy[key].requests += n;
    }
    await chrome.storage.local.set({ log });
  }
  if (local.trackerCounts !== null) await chrome.storage.local.remove("trackerCounts");

  chrome.action.setBadgeBackgroundColor({ color: "#c9302c" });
  await applyGpc(gpcEnabled).catch((e) => console.error("Could not apply GPC setting:", e));
});

// ---------- helpers ----------

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname : null;
  } catch {
    return null;
  }
}

async function siteFor(tabId, initiator) {
  if (tabId >= 0) {
    if (tabSites[tabId]) return tabSites[tabId];
    try {
      const tab = await chrome.tabs.get(tabId);
      const host = hostOf(tab.url || tab.pendingUrl);
      if (host) {
        tabSites[tabId] = host;
        scheduleSessionSave();
        return host;
      }
    } catch {
      // Tab closed or not a normal tab; fall through.
    }
  }
  return hostOf(initiator) || "(unknown site)";
}

function badgeText(n) {
  if (!n) return "";
  return n > 999 ? "999+" : String(n);
}

function setTabBadge(tabId) {
  if (tabId < 0) return;
  chrome.action.setBadgeText({ tabId, text: badgeText(tabCounts[tabId]) }).catch(() => {});
}

function lastSeen(site) {
  let last = 0;
  for (const entry of Object.values(log[site] || {})) last = Math.max(last, entry.last || 0);
  return last;
}

function prune() {
  const sites = Object.keys(log);
  if (sites.length <= MAX_SITES) return;
  sites.sort((a, b) => lastSeen(a) - lastSeen(b));
  for (const site of sites.slice(0, sites.length - MAX_SITES)) {
    delete log[site];
    delete siteMeta[site];
  }
}

function scheduleLocalSave() {
  if (localTimer) return;
  localTimer = setTimeout(() => {
    localTimer = null;
    prune();
    chrome.storage.local.set({ log, siteMeta });
  }, FLUSH_DELAY_MS);
}

function scheduleSessionSave() {
  if (sessionTimer) return;
  sessionTimer = setTimeout(() => {
    sessionTimer = null;
    chrome.storage.session.set({ tabSites, tabCounts });
  }, FLUSH_DELAY_MS);
}

async function record(details, kind) {
  await ready;
  if (!gpcEnabled) return; // The audit only covers traffic sent while GPC is on.

  const tracker = matchTracker(hostOf(details.url));
  if (!tracker) return;

  const site = await siteFor(details.tabId, details.initiator);
  if (matchTracker(site) === tracker) return; // Visiting the tracker's own site.

  const now = Date.now();
  const bySite = (log[site] = log[site] || {});
  const entry = (bySite[tracker] = bySite[tracker] || { requests: 0, cookies: 0, first: now, last: now });
  if (!entry.first) entry.first = now;
  entry.last = now;

  if (kind === "request") {
    entry.requests += 1;
    if (details.tabId >= 0) {
      tabCounts[details.tabId] = (tabCounts[details.tabId] || 0) + 1;
      setTabBadge(details.tabId);
      scheduleSessionSave();
    }
  } else if (kind === "cookie") {
    entry.cookies += 1;
  }
  scheduleLocalSave();
}

async function applyGpc(enabled) {
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    enabled ? { enableRulesetIds: [RULESET_ID] } : { disableRulesetIds: [RULESET_ID] }
  );
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [GPC_SCRIPT_ID] });
  if (enabled && existing.length === 0) {
    await chrome.scripting.registerContentScripts([{
      id: GPC_SCRIPT_ID,
      matches: ["<all_urls>"],
      js: ["gpc.js"],
      runAt: "document_start",
      allFrames: true,
      world: "MAIN"
    }]);
  } else if (!enabled && existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: [GPC_SCRIPT_ID] });
  }
}

// ---------- listeners (registered at top level so they survive restarts) ----------

// New page in a tab: remember its site and reset that tab's counter.
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    ready.then(() => {
      if (details.tabId < 0 || details.frameId !== 0) return;
      const host = hostOf(details.url);
      if (!host) return;
      tabSites[details.tabId] = host;
      tabCounts[details.tabId] = 0;
      setTabBadge(details.tabId);
      scheduleSessionSave();
    });
  },
  { urls: ["<all_urls>"], types: ["main_frame"] }
);

// Tracker requests.
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type === "main_frame") return;
    record(details, "request").catch((e) => console.error("Error recording tracker request:", e));
  },
  { urls: TRACKER_URL_PATTERNS }
);

// Tracker responses that try to set a cookie. Only the presence of the
// header is noted; cookie values are never read or stored.
chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === "main_frame") return;
    const setsCookie = (details.responseHeaders || []).some((h) => h.name.toLowerCase() === "set-cookie");
    if (setsCookie) record(details, "cookie").catch((e) => console.error("Error recording cookie:", e));
  },
  { urls: TRACKER_URL_PATTERNS },
  ["responseHeaders", "extraHeaders"]
);

chrome.tabs.onRemoved.addListener((tabId) => {
  ready.then(() => {
    delete tabSites[tabId];
    delete tabCounts[tabId];
    scheduleSessionSave();
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  (async () => {
    await ready;
    switch (msg && msg.type) {
      case "getState":
        return {
          log,
          siteMeta,
          gpcEnabled,
          tabCount: tabCounts[msg.tabId] || 0,
          version: chrome.runtime.getManifest().version
        };
      case "setGpc":
        gpcEnabled = !!msg.enabled;
        await chrome.storage.local.set({ gpcEnabled });
        await applyGpc(gpcEnabled);
        return { ok: true, gpcEnabled };
      case "setSiteMeta":
        if (typeof msg.site === "string") {
          siteMeta[msg.site] = { gpcJson: msg.gpcJson, checked: Date.now() };
          scheduleLocalSave();
        }
        return { ok: true };
      case "clear":
        for (const tabId of Object.keys(tabCounts)) {
          tabCounts[tabId] = 0;
          setTabBadge(Number(tabId));
        }
        log = {};
        siteMeta = {};
        await chrome.storage.local.set({ log, siteMeta });
        await chrome.storage.session.set({ tabSites, tabCounts });
        return { ok: true };
      default:
        return { ok: false, error: "Unknown message" };
    }
  })()
    .then(sendResponse)
    .catch((e) => sendResponse({ ok: false, error: String(e) }));

  return true; // Keep the channel open for the async reply.
});
