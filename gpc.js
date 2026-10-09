/*
  CT Privacy Compliance Auditor
  Copyright (C) 2026 Secure Dodo LLC
  Licensed under the GNU General Public License v3.0 or later.
  See LICENSE or <https://www.gnu.org/licenses/>.

  Runs in the page's own context at document_start so that scripts on the
  page (including consent managers) can read navigator.globalPrivacyControl,
  the JavaScript half of the GPC standard. The Sec-GPC header is set
  separately by rules.json.
*/
(() => {
  try {
    if (navigator.globalPrivacyControl === true) return; // Browser already sends GPC.
    Object.defineProperty(Navigator.prototype, "globalPrivacyControl", {
      get: () => true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    // Never break the page.
  }
})();
