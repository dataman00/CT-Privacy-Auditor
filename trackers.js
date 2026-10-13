/*
  CT Privacy Compliance Auditor
  Copyright (C) 2026 Secure Dodo LLC
  Licensed under the GNU General Public License v3.0 or later.
  See LICENSE or <https://www.gnu.org/licenses/>.
*/

// Plain script (not a module) so it loads the same way in Chrome and Firefox:
// importScripts() in Chrome's service worker, a <script> tag in Firefox's
// background page and in the popup.
(() => {

  // Categories, listed in order of how strongly they suggest data is being
  // sold or shared for targeted advertising.
  const CATEGORIES = {
    "data-broker":       { label: "Data broker",       plural: "data brokers",       rank: 1 },
    "ad-pixel":          { label: "Ad pixel",          plural: "ad pixels",          rank: 2 },
    "ad-network":        { label: "Ad network",        plural: "ad networks",        rank: 3 },
    "session-recording": { label: "Session recording", plural: "session recorders",  rank: 4 },
    "affiliate":         { label: "Affiliate",         plural: "affiliate networks", rank: 5 },
    "analytics":         { label: "Analytics",         plural: "analytics tools",    rank: 6 },
    "other":             { label: "Other",             plural: "other trackers",     rank: 7 }
  };

  // Tracker domains to audit. Each entry matches the domain itself and any
  // subdomain. Entries can be a specific subdomain (for example
  // "connect.facebook.net") so that ordinary embeds on the parent domain are
  // not counted. When two entries match, the longest (most specific) wins.
  // To expand coverage further, consider a maintained list such as DuckDuckGo
  // Tracker Radar or Disconnect (check the license first).
  const TRACKERS = [
    // Data brokers and identity matching
    { domain: "rlcdn.com",             owner: "LiveRamp",            category: "data-broker" },
    { domain: "demdex.net",            owner: "Adobe",               category: "data-broker" },
    { domain: "everesttech.net",       owner: "Adobe",               category: "data-broker" },
    { domain: "crwdcntrl.net",         owner: "Lotame",              category: "data-broker" },
    { domain: "tapad.com",             owner: "Experian",            category: "data-broker" },
    { domain: "agkn.com",              owner: "TransUnion (Neustar)", category: "data-broker" },
    { domain: "exelator.com",          owner: "Nielsen",             category: "data-broker" },
    { domain: "eyeota.net",            owner: "Dun & Bradstreet",    category: "data-broker" },
    { domain: "id5-sync.com",          owner: "ID5",                 category: "data-broker" },
    { domain: "prod.uidapi.com",       owner: "Unified ID 2.0",      category: "data-broker" },
    { domain: "ml314.com",             owner: "Bombora",             category: "data-broker" },
    { domain: "company-target.com",    owner: "Demandbase",          category: "data-broker" },
    { domain: "6sc.co",                owner: "6sense",              category: "data-broker" },
    { domain: "zeotap.com",            owner: "Zeotap",              category: "data-broker" },

    // Ad and marketing pixels
    { domain: "connect.facebook.net",  owner: "Meta",                category: "ad-pixel" },
    { domain: "analytics.tiktok.com",  owner: "TikTok",              category: "ad-pixel" },
    { domain: "bat.bing.com",          owner: "Microsoft",           category: "ad-pixel" },
    { domain: "px.ads.linkedin.com",   owner: "LinkedIn",            category: "ad-pixel" },
    { domain: "snap.licdn.com",        owner: "LinkedIn",            category: "ad-pixel" },
    { domain: "ct.pinterest.com",      owner: "Pinterest",           category: "ad-pixel" },
    { domain: "tr.snapchat.com",       owner: "Snap",                category: "ad-pixel" },
    { domain: "sc-static.net",         owner: "Snap",                category: "ad-pixel" },
    { domain: "static.ads-twitter.com", owner: "X",                  category: "ad-pixel" },
    { domain: "googleadservices.com",  owner: "Google",              category: "ad-pixel" },
    { domain: "bounceexchange.com",    owner: "Wunderkind",          category: "ad-pixel" },
    { domain: "bounceit.net",          owner: "Wunderkind",          category: "ad-pixel" },

    // Ad networks, exchanges and buying platforms
    { domain: "doubleclick.net",       owner: "Google",              category: "ad-network" },
    { domain: "googlesyndication.com", owner: "Google",              category: "ad-network" },
    { domain: "adservice.google.com",  owner: "Google",              category: "ad-network" },
    { domain: "amazon-adsystem.com",   owner: "Amazon",              category: "ad-network" },
    { domain: "adnxs.com",             owner: "Microsoft (Xandr)",   category: "ad-network" },
    { domain: "criteo.com",            owner: "Criteo",              category: "ad-network" },
    { domain: "criteo.net",            owner: "Criteo",              category: "ad-network" },
    { domain: "pubmatic.com",          owner: "PubMatic",            category: "ad-network" },
    { domain: "adsrvr.org",            owner: "The Trade Desk",      category: "ad-network" },
    { domain: "rubiconproject.com",    owner: "Magnite",             category: "ad-network" },
    { domain: "openx.net",             owner: "OpenX",               category: "ad-network" },
    { domain: "casalemedia.com",       owner: "Index Exchange",      category: "ad-network" },
    { domain: "3lift.com",             owner: "TripleLift",          category: "ad-network" },
    { domain: "bidswitch.net",         owner: "BidSwitch",           category: "ad-network" },
    { domain: "adform.net",            owner: "Adform",              category: "ad-network" },
    { domain: "smartadserver.com",     owner: "Equativ",             category: "ad-network" },
    { domain: "sharethrough.com",      owner: "Sharethrough",        category: "ad-network" },
    { domain: "yieldmo.com",           owner: "Yieldmo",             category: "ad-network" },
    { domain: "media.net",             owner: "Media.net",           category: "ad-network" },
    { domain: "lijit.com",             owner: "Sovrn",               category: "ad-network" },
    { domain: "contextweb.com",        owner: "PulsePoint",          category: "ad-network" },
    { domain: "teads.tv",              owner: "Teads",               category: "ad-network" },
    { domain: "taboola.com",           owner: "Taboola",             category: "ad-network" },
    { domain: "outbrain.com",          owner: "Outbrain",            category: "ad-network" },
    { domain: "33across.com",          owner: "33Across",            category: "ad-network" },

    // Session recording
    { domain: "hotjar.com",            owner: "Hotjar",              category: "session-recording" },
    { domain: "fullstory.com",         owner: "FullStory",           category: "session-recording" },
    { domain: "clarity.ms",            owner: "Microsoft",           category: "session-recording" },
    { domain: "mouseflow.com",         owner: "Mouseflow",           category: "session-recording" },
    { domain: "quantummetric.com",     owner: "Quantum Metric",      category: "session-recording" },

    // Affiliate networks
    { domain: "impactradius-event.com", owner: "Impact",             category: "affiliate" },
    { domain: "redirectingat.com",     owner: "Skimlinks",           category: "affiliate" },
    { domain: "dpbolvw.net",           owner: "CJ Affiliate",        category: "affiliate" },
    { domain: "jdoqocy.com",           owner: "CJ Affiliate",        category: "affiliate" },
    { domain: "tkqlhce.com",           owner: "CJ Affiliate",        category: "affiliate" },
    { domain: "anrdoezrs.net",         owner: "CJ Affiliate",        category: "affiliate" },
    { domain: "awin1.com",             owner: "Awin",                category: "affiliate" },

    // Analytics and measurement
    { domain: "google-analytics.com",  owner: "Google",              category: "analytics" },
    { domain: "googletagmanager.com",  owner: "Google",              category: "analytics" },
    { domain: "scorecardresearch.com", owner: "Comscore",            category: "analytics" },
    { domain: "imrworldwide.com",      owner: "Nielsen",             category: "analytics" },
    { domain: "quantserve.com",        owner: "Quantcast",           category: "analytics" }
  ];

  const BY_DOMAIN = new Map(TRACKERS.map((t) => [t.domain, t]));

  // Returns the matching tracker domain, or null. Exact or subdomain match only,
  // so "mycriteo.com" or "doubleclick.net.example.com" do not match. When
  // several entries match, the longest one wins.
  function matchTracker(hostname) {
    if (!hostname) return null;
    const host = hostname.toLowerCase().replace(/\.$/, "");
    let best = null;
    for (const t of TRACKERS) {
      if ((host === t.domain || host.endsWith("." + t.domain)) && (!best || t.domain.length > best.length)) {
        best = t.domain;
      }
    }
    return best;
  }

  // Details for a tracker domain stored in the log. Domains that were recorded
  // earlier but are no longer listed fall back to "other".
  function trackerInfo(domain) {
    const t = BY_DOMAIN.get(domain);
    const category = t ? t.category : "other";
    return { domain, owner: t ? t.owner : "", category, ...CATEGORIES[category] };
  }

  // Match patterns for webRequest filters, so the listener only wakes for
  // tracker traffic instead of every request the browser makes.
  const TRACKER_URL_PATTERNS = TRACKERS.map((t) => `*://*.${t.domain}/*`);

  globalThis.CTPA = { CATEGORIES, TRACKERS, matchTracker, trackerInfo, TRACKER_URL_PATTERNS };
})();
