# PacGuard

A Chrome extension (Manifest V3) for personal productivity & navigation control, using a hybrid **PAC (`chrome.proxy`) + `declarativeNetRequest`** control plane and a fast, auto-saving `<textarea>` popup UI inspired by [Charon](https://github.com/carlbernal/charon).

## Features

1. **`go/` Shortlinks (No Omnibox keyword required)**
   - Navigate directly to `go/<slug>` (or `http://go/<slug>`) to reconstruct and redirect to your target URL.
   - Subpaths are forwarded automatically (e.g., `go/wiki/Proxy_auto-config` -> `https://wikipedia.org/Proxy_auto-config`).
   - Configured in the popup `<textarea>` using a plain-text pair format (no JSON required):
     ```text
     # Line 1: go/ link slug
     # Line 2: Target website URL

     wiki
     wikipedia.org

     gh
     github.com/carlbernal
     ```

2. **Domain Blocklist + Warning Page**
   - Configured in the popup `<textarea>` as a newline-separated list of domains:
     ```text
     # One domain per line
     reddit.com
     twitter.com
     x.com
     ```
   - **PAC Layer (`chrome.proxy`)**: Dynamically generates `FindProxyForURL(url, host)` to sinkhole blocked domains and all subdomains (`PROXY 127.0.0.1:65535`) for non-main-frame / WebSocket / background connections.
   - **Navigation Layer (`declarativeNetRequest` + `webNavigation`)**: Redirects main-frame navigations to an access restriction warning page (`blocked.html`).

3. **Real-Time Linter & Line Gutter**
   - Auto-saves as you type (`600ms` debounce) and when the popup closes.
   - Highlights the exact line number in the gutter (`!`) with a descriptive guide at the bottom of the popup if a line has a formatting mistake (missing target URL, multiple URLs on one line, invalid domain, etc.).

## Installation (Chrome Developer Mode)

1. Open `chrome://extensions/` in Google Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `/Users/carlbernal/repo/pacguard/src` directory.
