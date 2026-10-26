# Privacy Policy for PacGuard

**Last Updated:** October 26, 2026

**PacGuard** is an open-source Chrome extension for personal productivity and navigation control (`go/` shortlinks and domain blocking). PacGuard operates **100% locally** on your device.

## 1. Open Source & Code Inspection

PacGuard is completely open source under the MIT License, and the extension package is distributed without obfuscation or minification. Anyone—including users and reviewers—can inspect the entire codebase to verify how the extension works:
- **GitHub Repository:** https://github.com/carlbernal/pacguard

## 2. Data Collection & Transmission

**PacGuard does NOT collect, log, store externally, transmit, or share any personal data or browsing history.**
- **Zero External Requests:** PacGuard has no backend servers, analytics, telemetry, or third-party SDKs.
- **No Tracking:** We never track the websites you visit, the `go/` shortlinks you configure, or the domains on your blocklist.

## 3. Local Data Storage (`chrome.storage.local`)

All configuration data—specifically your `go/` shortlink mappings and your list of blocked domains—is stored exclusively on your computer using Chrome's local storage API (`chrome.storage.local`). This data never leaves your browser and is removed automatically if you uninstall the extension.

## 4. Permission Usage Summary

PacGuard requests only the browser permissions necessary to run its local control plane:
- **`proxy`**: Applies a locally generated PAC script (`FindProxyForURL`) that sinkholes domains on your blocklist (`PROXY 127.0.0.1:65535`) and routes all other traffic directly (`DIRECT`).
- **`declarativeNetRequest` & `declarativeNetRequestWithHostAccess` (`<all_urls>`)**: Registers local dynamic redirect rules for your custom `go/` shortlinks and redirects user-blocked domains to the local `blocked.html` warning page.
- **`webNavigation` & `tabs`**: Detects when you type a `go/<slug>` shortcut into the address bar (even when treated as a search query by the omnibox) and updates the tab URL to your destination, or redirects blocked domains to `blocked.html`. URLs are evaluated strictly in memory and never stored or transmitted.
- **`storage`**: Saves your `go/` links and blocklist locally in `chrome.storage.local`.

## 5. Third-Party Sharing

Because PacGuard collects no data, no user information is ever sold, transferred, or shared with third parties for advertising, analytics, creditworthiness, or any other purpose.

## 6. Contact

If you have questions or want to inspect or report an issue, please visit:
https://github.com/carlbernal/pacguard/issues
