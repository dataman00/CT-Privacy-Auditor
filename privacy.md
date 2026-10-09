# Privacy Policy for CT Privacy Compliance Auditor

**Last Updated: October 9, 2026**

This Privacy Policy describes how the "CT Privacy Compliance Auditor" browser extension handles user data. Our core commitment is privacy: your browsing data belongs to you.

## 1. What the Extension Does
* **Sends an opt-out signal:** While GPC is switched on, the extension adds the Global Privacy Control header (`Sec-GPC: 1`) to your web requests and sets `navigator.globalPrivacyControl` to `true` on the pages you visit, so sites can detect your opt-out preference.
* **Observes tracker traffic:** Using the `webRequest` browser API, the extension watches for requests to a built-in list of tracker domains. It does not block, change, or redirect those requests.
* **Notes cookie attempts:** For responses from those tracker domains only, the extension checks whether a `Set-Cookie` header is present. Cookie names and values are never read or stored.
* **Checks the current site's GPC file:** When you open the extension popup, it requests the current website's public `/.well-known/gpc.json` file (without sending your cookies) to see whether the site says it honors GPC.

## 2. Data Stored on Your Device
The extension stores the following inside your browser's local storage (`chrome.storage.local`) only:
* The hostname of each website where tracker activity was seen (for example `news.example.com`). Full page addresses are not stored.
* For each of those websites: which tracker domains were seen, how many requests and cookie attempts occurred, and when each was first and last seen.
* The result of any `gpc.json` check you ran from the popup.
* Your GPC on/off setting.

The log is capped at the 1,000 most recently active websites; older entries are removed automatically. While a tab is open, the extension also keeps that tab's current hostname and counter in temporary session storage, which the browser clears when it closes.

## 3. Data Transmission and Third-Party Sharing
* **No remote servers:** We do not operate remote servers, analytics, or external databases. The only network request the extension makes on its own is the `gpc.json` check described above, sent to the website you are already viewing.
* **No third-party sharing:** No data, browsing history, or analytics are shared, sold, or transmitted to any third party, advertising network, or monetization platform.
* **Exports stay with you:** The "Export CSV" and "Export JSON" buttons save a file to your computer. Nothing is uploaded.

## 4. Data Retention and Control
You can erase all logged data at any time with the "Clear data" button in the popup. You can stop the opt-out signal and the audit at any time with the GPC switch. Uninstalling the extension removes all of its stored data.

## 5. Permissions
* `webRequest` and host access to all sites: to observe tracker requests on any website.
* `declarativeNetRequest`: to add the `Sec-GPC` header.
* `scripting`: to set `navigator.globalPrivacyControl` on pages.
* `storage`: to keep the local log and your settings.

## 6. Contact Information
If you have questions or compliance inquiries about this extension, please contact the developer at: https://github.com/dataman00/CT-Privacy-Auditor/issues
