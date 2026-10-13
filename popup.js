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

const api = globalThis.browser ?? globalThis.chrome; // Promise-based in both browsers.
const { CATEGORIES, trackerInfo } = globalThis.CTPA;

const MAX_SITES_SHOWN = 50;
const GPC_JSON_TIMEOUT_MS = 5000;

const $ = (id) => document.getElementById(id);
let state = null;
let activeTab = null;
let activeHost = null;

const GPC_JSON_TEXT = {
  supported: "Site publishes gpc.json saying it honors GPC.",
  "not-supported": "Site publishes gpc.json saying it does NOT honor GPC.",
  "not-found": "Site does not publish a gpc.json file.",
  error: "Could not check this site's gpc.json file."
};

// ---------- data helpers ----------

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.hostname : null;
  } catch {
    return null;
  }
}

function siteTotals(trackers) {
  let requests = 0;
  let cookies = 0;
  const categories = {}; // category -> number of distinct trackers
  for (const [domain, t] of Object.entries(trackers)) {
    requests += t.requests || 0;
    cookies += t.cookies || 0;
    const cat = trackerInfo(domain).category;
    categories[cat] = (categories[cat] || 0) + 1;
  }
  return { requests, cookies, categories, brokers: categories["data-broker"] || 0 };
}

// Sites that contacted data brokers first, then cookie attempts, then volume.
function sortedSites() {
  return Object.entries(state.log)
    .map(([site, trackers]) => ({ site, trackers, ...siteTotals(trackers) }))
    .sort((a, b) => b.brokers - a.brokers || b.cookies - a.cookies || b.requests - a.requests || a.site.localeCompare(b.site));
}

function sortedTrackers(trackers) {
  return Object.entries(trackers)
    .map(([domain, t]) => ({ ...t, info: trackerInfo(domain) }))
    .sort((a, b) => a.info.rank - b.info.rank || b.requests - a.requests || a.info.domain.localeCompare(b.info.domain));
}

function categoryCount(n, category) {
  const word = CATEGORIES[category].plural;
  return `${n} ${n === 1 ? word.replace(/s$/, "") : word}`;
}

// "2 data brokers, 3 ad networks, 1 analytics tool"
function categorySummary(categories) {
  return Object.entries(categories)
    .sort((a, b) => CATEGORIES[a[0]].rank - CATEGORIES[b[0]].rank)
    .map(([cat, n]) => categoryCount(n, cat))
    .join(", ");
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function iso(ts) {
  return ts ? new Date(ts).toISOString() : "";
}

// ---------- rendering ----------

function renderGpcStatus() {
  const toggle = $("gpc-toggle");
  const status = $("gpc-status");
  toggle.checked = state.gpcEnabled;
  status.replaceChildren();
  const label = document.createElement("span");
  if (state.gpcEnabled) {
    label.className = "status-on";
    label.textContent = "On. ";
    status.append(label, "Sending the Sec-GPC header and navigator.globalPrivacyControl to every site.");
  } else {
    label.className = "status-off";
    label.textContent = "Off. ";
    status.append(label, "This extension sends no opt-out signal and auditing is paused. Reload open tabs after changing this.");
  }
  // Firefox (and Chrome once it ships GPC) can also send the signal natively.
  if (navigator.globalPrivacyControl === true) {
    status.append(" Your browser's own GPC setting is on, so sites still receive the signal from the browser.");
  }
}

function renderThisSite() {
  $("site-host").textContent = activeHost || "Not a website";
  const n = state.tabCount || 0;
  $("site-count").textContent = activeHost ? plural(n, "tracker request") : "";
  if (!activeHost) {
    $("site-count").style.display = "none";
    $("site-categories").textContent = "";
    $("site-gpcjson").textContent = "Open a website to see its details.";
    return;
  }
  const logged = state.log[activeHost];
  const cats = $("site-categories");
  cats.replaceChildren();
  if (logged) {
    const totals = siteTotals(logged);
    if (totals.brokers > 0) {
      const strong = document.createElement("strong");
      strong.className = "broker-text";
      strong.textContent = `Contacted ${categoryCount(totals.brokers, "data-broker")}. `;
      cats.append(strong);
    }
    cats.append(`Seen on this site: ${categorySummary(totals.categories)}.`);
  } else {
    cats.textContent = "No trackers recorded on this site yet.";
  }
}

function renderSiteList() {
  const list = $("site-list");
  list.replaceChildren();
  const sites = sortedSites();

  if (sites.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card empty muted";
    empty.textContent = "No tracker activity recorded yet.";
    list.append(empty);
    $("more-note").textContent = "";
    return;
  }

  for (const s of sites.slice(0, MAX_SITES_SHOWN)) {
    const details = document.createElement("details");
    details.className = s.brokers > 0 || s.cookies > 0 ? "flagged" : "requests-only";
    if (s.site === activeHost) details.open = true;

    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.className = "site mono";
    name.textContent = s.site;
    name.title = s.site;
    const pill = document.createElement("span");
    pill.className = s.brokers > 0 || s.cookies > 0 ? "pill cookie" : "pill";
    const parts = [];
    if (s.brokers > 0) parts.push(categoryCount(s.brokers, "data-broker"));
    if (s.cookies > 0) parts.push(plural(s.cookies, "cookie"));
    parts.push(`${s.requests} req`);
    pill.textContent = parts.join(", ");
    pill.title = categorySummary(s.categories);
    summary.append(name, pill);
    details.append(summary);

    for (const t of sortedTrackers(s.trackers)) {
      const row = document.createElement("div");
      row.className = "tracker-row";
      const left = document.createElement("span");
      left.className = "tracker-name";
      const tName = document.createElement("span");
      tName.className = "mono";
      tName.textContent = t.info.domain;
      tName.title = t.info.owner;
      const tag = document.createElement("span");
      tag.className = `tag tag-${t.info.category}`;
      tag.textContent = t.info.label;
      left.append(tName, tag);
      const tCount = document.createElement("span");
      tCount.className = "muted";
      tCount.textContent = t.cookies > 0
        ? `${t.requests} req, ${plural(t.cookies, "cookie")}`
        : `${t.requests} req`;
      row.append(left, tCount);
      details.append(row);
    }
    list.append(details);
  }

  const hidden = sites.length - MAX_SITES_SHOWN;
  $("more-note").textContent = hidden > 0 ? `${plural(hidden, "more site")} included in exports.` : "";
}

function render() {
  $("version").textContent = `v${state.version}`;
  renderGpcStatus();
  renderThisSite();
  renderSiteList();
  const hasData = Object.keys(state.log).length > 0;
  $("export-csv").disabled = !hasData;
  $("export-json").disabled = !hasData;
}

// ---------- gpc.json check for the current site ----------

async function checkGpcJson() {
  if (!activeHost) return;
  const out = $("site-gpcjson");
  out.textContent = "Checking the site's gpc.json file...";

  let result = "error";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GPC_JSON_TIMEOUT_MS);
  try {
    const origin = new URL(activeTab.url).origin;
    const res = await fetch(`${origin}/.well-known/gpc.json`, {
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal
    });
    if (!res.ok) {
      result = "not-found";
    } else {
      try {
        const body = await res.json();
        result = body && body.gpc === true ? "supported" : body && body.gpc === false ? "not-supported" : "not-found";
      } catch {
        result = "not-found"; // Not valid JSON, so not a real gpc.json.
      }
    }
  } catch {
    result = "error";
  } finally {
    clearTimeout(timer);
  }

  out.textContent = GPC_JSON_TEXT[result];
  // Save the result only for sites already in the log, so exports include it.
  if (state.log[activeHost]) {
    state.siteMeta[activeHost] = { gpcJson: result, checked: Date.now() };
    api.runtime.sendMessage({ type: "setSiteMeta", site: activeHost, gpcJson: result });
  }
}

// ---------- exports ----------

function download(text, mime, filename) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv() {
  const header = ["site", "tracker", "tracker_owner", "category", "requests", "cookie_attempts", "first_seen_utc", "last_seen_utc", "site_gpc_json", "gpc_json_checked_utc"];
  const lines = [header.join(",")];
  for (const s of sortedSites()) {
    const meta = state.siteMeta[s.site] || {};
    for (const t of sortedTrackers(s.trackers)) {
      lines.push([s.site, t.info.domain, t.info.owner, t.info.label, t.requests, t.cookies, iso(t.first), iso(t.last), meta.gpcJson || "not checked", iso(meta.checked)]
        .map(csvCell).join(","));
    }
  }
  download(lines.join("\r\n") + "\r\n", "text/csv", `ct_privacy_audit_${new Date().toISOString().slice(0, 10)}.csv`);
}

function exportJson() {
  const report = {
    report: "CT Privacy Compliance Auditor",
    extensionVersion: state.version,
    generatedUtc: new Date().toISOString(),
    browser: navigator.userAgent,
    gpcEnabledAtExport: state.gpcEnabled,
    note: "Counts are tracker requests and cookie-setting responses observed while the GPC signal was being sent. A request alone does not prove non-compliance. Not legal advice.",
    sites: sortedSites().map((s) => ({
      site: s.site,
      totalRequests: s.requests,
      totalCookieAttempts: s.cookies,
      dataBrokers: s.brokers,
      trackersByCategory: Object.fromEntries(
        Object.entries(s.categories).map(([cat, n]) => [CATEGORIES[cat].label, n])
      ),
      gpcJson: (state.siteMeta[s.site] || {}).gpcJson || "not checked",
      trackers: sortedTrackers(s.trackers).map((t) => ({
        tracker: t.info.domain,
        owner: t.info.owner,
        category: t.info.label,
        requests: t.requests,
        cookieAttempts: t.cookies,
        firstSeenUtc: iso(t.first),
        lastSeenUtc: iso(t.last)
      }))
    }))
  };
  download(JSON.stringify(report, null, 2), "application/json", `ct_privacy_audit_${new Date().toISOString().slice(0, 10)}.json`);
}

// ---------- site access ----------

// Both browsers let users withhold site access after install. Without it the
// extension cannot add the header, set the JavaScript signal, or see trackers.
async function checkAccess() {
  let granted = true;
  try {
    granted = await api.permissions.contains({ origins: ["<all_urls>"] });
  } catch {
    // Older API shape; assume access.
  }
  $("access-warning").hidden = granted;
}

$("grant-access").addEventListener("click", () => {
  // Must be called directly from the click for Firefox to show the prompt.
  api.permissions.request({ origins: ["<all_urls>"] })
    .then((granted) => { if (granted) $("access-warning").hidden = true; })
    .catch(() => {});
});

// ---------- actions ----------

async function refresh() {
  state = await api.runtime.sendMessage({ type: "getState", tabId: activeTab ? activeTab.id : -1 });
  render();
}

$("gpc-toggle").addEventListener("change", async (e) => {
  const toggle = e.target;
  toggle.disabled = true;
  try {
    await api.runtime.sendMessage({ type: "setGpc", enabled: toggle.checked });
    await refresh();
  } finally {
    toggle.disabled = false;
  }
});

$("export-csv").addEventListener("click", exportCsv);
$("export-json").addEventListener("click", exportJson);

// Two-step clear instead of a blocking confirm() dialog.
let clearTimer = null;
$("clear-btn").addEventListener("click", async () => {
  const btn = $("clear-btn");
  if (!btn.classList.contains("armed")) {
    btn.classList.add("armed");
    btn.textContent = "Click again to clear";
    clearTimer = setTimeout(() => {
      btn.classList.remove("armed");
      btn.textContent = "Clear data";
    }, 4000);
    return;
  }
  clearTimeout(clearTimer);
  btn.classList.remove("armed");
  btn.textContent = "Clear data";
  await api.runtime.sendMessage({ type: "clear" });
  await refresh();
});

// ---------- start ----------

(async () => {
  [activeTab] = await api.tabs.query({ active: true, currentWindow: true });
  activeHost = activeTab ? hostOf(activeTab.url) : null;
  await refresh();
  checkAccess();
  checkGpcJson();
})();
