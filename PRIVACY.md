# Privacy Policy

This document describes the intended data behavior of the textmode overlay browser extension.

## Summary

The extension processes selected canvas and video content locally in your browser. It does not intentionally
collect analytics, transmit media, sell data, or send browsing activity to a server.

## Data The Extension May Access

When you activate the extension on a tab, it may access:

- The active tab needed to inject the content runtime after user action.
- Visible canvas and video elements on that page.
- Pixel data from selected media when the browser allows WebGL/canvas sampling.
- Overlay settings used to render the selected media.
- Local extension storage for settings or future per-origin defaults.

The extension cannot sample some media. Cross-origin, tainted, protected, or DRM-restricted media may be blocked
by the browser.

## Data The Extension Does Not Intentionally Collect

The extension does not intentionally collect or transmit:

- Browsing history.
- Page text.
- Credentials.
- Cookies.
- Analytics events.
- Telemetry.
- Selected media contents.
- Exported artifacts.

## Permissions

Production builds use:

- `activeTab`: lets the extension act on the current tab after user activation.
- `scripting`: injects the content runtime after user activation.
- `storage`: stores extension settings locally.

Production builds do not request persistent host permissions. The E2E test build may request temporary host
permissions so Playwright can automate extension flows; that build is not intended for release.

## Storage

Settings are stored with browser extension storage APIs when persistence is enabled. Storage is local to the
browser profile unless the browser or user configuration syncs extension storage.

## Network Requests

The extension does not intentionally make network requests for analytics, telemetry, remote code, or media
upload. All runtime JavaScript is bundled with the extension.

Pages themselves may continue making their own network requests. Those requests are controlled by the page, not
by this extension.

## Exports

When you export TXT, SVG, PNG, or JPG, the export is generated locally by the browser and saved through browser
download behavior. The extension does not upload exported files.

## Changes

Privacy-impacting changes should be documented in pull requests, release notes, and this file before release.
