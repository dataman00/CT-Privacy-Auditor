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

// A categorization map helper function
function getTrackerCategory(domain) {
  const identity = ["wunderkind.co", "bkn.ai", "blackcrow.ai", "blackcrow.me", "retention.com", "geoiq.io"];
  const replay = ["contentsquare.net", "contentsquare.com", "clarity.ms", "inspectlet.com", "hotjar.com", "bounceexchange.com", "bounceit.net"];
  const affiliate = ["impactradius-event.com", "redirectingat.com", "dpbolvw.net", "jdoqocy.com", "tkqlhce.com", "awin1.com", "anrdoezrs.net", "viglink.com", "sovrn.com", "pntrac.com", "pepperjam.com", "rakutenmarketing.com", "rmkt.co"];
  
  if (identity.some(t => domain.includes(t))) return "Identity Resolution & Profile Fingerprinting";
  if (replay.some(t => domain.includes(t))) return "Session Replay & Experience Tracking";
  if (affiliate.some(t => domain.includes(t))) return "Affiliate Redirect Commerce Tracker";
  return "General Target Advertising & Analytics Framework";
}

// Display items inside panel layout interface natively
chrome.storage.local.get({ trackerCounts: {} }, (data) => {
  const list = document.getElementById('violation-list');
  const domains = Object.keys(data.trackerCounts);

  if (domains.length === 0) {
    list.innerHTML = "<li style='border-left-color: #449d44; font-family: sans-serif;'>Perfect compliance. No infractions captured.</li>";
  } else {
    domains.forEach(domain => {
      const li = document.createElement('li');
      const domainText = document.createElement('span');
      domainText.innerHTML = `<strong>${domain}</strong><br><small style='color:#777; font-size:10px;'>${getTrackerCategory(domain)}</small>`;
      
      const counterBadge = document.createElement('span');
      counterBadge.className = 'counter';
      counterBadge.textContent = `${data.trackerCounts[domain]} hits`;
      
      li.appendChild(domainText);
      li.appendChild(counterBadge);
      list.appendChild(li);
    });
  }
});

// Feature: Export Audit Log Data grouped nicely by compliance type categorization
document.getElementById('export-btn').addEventListener('click', () => {
  chrome.storage.local.get({ trackerCounts: {} }, (data) => {
    const domains = Object.keys(data.trackerCounts);
    if (domains.length === 0) {
      alert("No compliance logs available to export.");
      return;
    }

    let report = "========================================================\n";
    report += "         CTDPA COMPLIANCE AUDIT COMPREHENSIVE REPORT     \n";
    report += ` Generated: ${new Date().toLocaleString()}\n`;
    report += ` Location: Derby, Connecticut\n`;
    report += "========================================================\n\n";

    // Grouping tracking strings dynamically for formatting 
    const categories = {};
    domains.forEach(domain => {
      const cat = getTrackerCategory(domain);
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ domain: domain, hits: data.trackerCounts[domain] });
    });

    for (const [category, entries] of Object.entries(categories)) {
      report += `[CATEGORY]: ${category.toUpperCase()}\n`;
      report += `--------------------------------------------------------\n`;
      entries.forEach(entry => {
        report += ` - Network Domain   : ${entry.domain}\n`;
        report += ` - Interceptions    : ${entry.hits} hit(s)\n`;
        report += ` - Enforcement Flag : NON-COMPLIANT (Sec-GPC Opt-Out Ignored)\n\n`;
      });
    }

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctdpa_compliance_audit_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.storage.local.set({ trackerCounts: {} }, () => {
    chrome.action.setBadgeText({ text: "" });
    location.reload();
  });
});
