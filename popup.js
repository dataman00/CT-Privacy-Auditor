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

// Pull data metrics to dynamically display elements in the extension panel
chrome.storage.local.get({ trackerCounts: {} }, (data) => {
  const list = document.getElementById('violation-list');
  const domains = Object.keys(data.trackerCounts);

  if (domains.length === 0) {
    list.innerHTML = "<li style='border-left-color: #449d44; font-family: sans-serif;'>Perfect compliance. No infractions captured.</li>";
  } else {
    domains.forEach(domain => {
      const li = document.createElement('li');
      const domainText = document.createElement('span');
      domainText.textContent = domain;
      
      const counterBadge = document.createElement('span');
      counterBadge.className = 'counter';
      counterBadge.textContent = `${data.trackerCounts[domain]} hits`;
      
      li.appendChild(domainText);
      li.appendChild(counterBadge);
      list.appendChild(li);
    });
  }
});

// Feature: Export Audit Log Data to plain text document format natively
document.getElementById('export-btn').addEventListener('click', () => {
  chrome.storage.local.get({ trackerCounts: {} }, (data) => {
    const domains = Object.keys(data.trackerCounts);
    if (domains.length === 0) {
      alert("No data available to export.");
      return;
    }

    let outputText = "CT PRIVACY AUDIT REPORT - COMPLIANCE LOG\n";
    outputText += `Generated: ${new Date().toLocaleString()}\n`;
    outputText += "========================================\n\n";
    
    domains.forEach(domain => {
      outputText += `Domain: ${domain}\n`;
      outputText += `Flagged Infractions: ${data.trackerCounts[domain]} hits\n`;
      outputText += `Potential Status: Non-Compliant (GPC Signal Ignored)\n`;
      outputText += "----------------------------------------\n";
    });

    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ct_privacy_compliance_report_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

// Clear tracking storage keys completely and reset the badge visual
document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.storage.local.set({ trackerCounts: {} }, () => {
    chrome.action.setBadgeText({ text: "" }); // Clear icon text natively
    location.reload();
  });
});

