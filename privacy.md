# Privacy Policy for CT Privacy Compliance Auditor

**Last Updated: October 8, 2026**

This Privacy Policy describes how the "CT Privacy Compliance Auditor" browser extension handles user data. Our core commitment is absolute privacy; we believe your browsing data belongs to you.

## 1. Data Collection and Usage
The CT Privacy Compliance Auditor extension operates completely locally on your device. 
* **No Personal Data Collected:** The extension does not collect, record, or transmit any personally identifiable information (PII).
* **Local Network Inspection:** The extension uses the `webRequest` and `declarativeNetRequest` browser APIs solely to inspect outbound tracking domains against a local blocklist and automatically inject the Global Privacy Control (GPC) header (`Sec-GPC: 1`).
* **Local Statistics:** Hit counts for identified tracking networks are stored entirely inside your browser's local sandbox environment (`chrome.storage.local`). This data never leaves your machine.

## 2. Data Transmission and Third-Party Sharing
* **Zero Remote Servers:** We do not operate remote servers, tracking dashboards, or external databases. 
* **No Third-Party Sharing:** Absolutely no data, browsing history, or analytics are ever shared, sold, or transmitted to any third-party entities, advertising networks, or monetization platforms.

## 3. Data Retention and Control
All data tracked by the extension (infraction hit counters) is temporary and remains inside your browser storage. Users retain total control over this data and can completely wipe all logged information instantly by clicking the "Clear Data" button inside the extension popup window. Uninstalling the extension will automatically remove all associated local data.

## 4. Contact Information
If you have any questions or compliance inquiries regarding this extension, please contact the developer at: 01-turnout-hacks@icloud.com
