# textmode.js ASCII Overlay Extension

Chrome Manifest V3 extension for selecting `<canvas>` and `<video>` elements on a page and converting them to live textmode.js ASCII overlays.

## Status

This is a Chrome MV3 MVP. Edge should be close to compatible because it is Chromium-based, but the tested target is Chrome. Firefox and Safari packaging are intentionally deferred until the Chrome runtime is stable.

## Development

```sh
npm install
npm run check
```

The unpacked Chrome extension is built to:

```text
dist/chrome
```

Load it in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `browser-extensions/dist/chrome`.

## Usage

1. Open a page with a visible `<canvas>` or `<video>`.
2. Click the extension action.
3. Click **Select Element**.
4. Click the target element on the page.
5. Adjust overlay settings in the popup or in-page panel.

## Security And Platform Notes

The extension uses `activeTab`, `scripting`, and `storage`. It does not request persistent host permissions in the MVP. The content runtime is injected only after a user action.

All executable code is bundled locally with the extension. Chrome MV3 does not allow remotely hosted runtime JavaScript, so production builds must not import textmode.js from a CDN.

Some media cannot be sampled. Cross-origin, tainted, or protected media may fail when the browser blocks WebGL/canvas pixel access. In that case the extension should show a clear error without breaking the page.

## Scripts

- `npm run build` builds the unpacked Chrome extension.
- `npm run dev` watches and rebuilds.
- `npm run test` runs unit tests.
- `npm run typecheck` runs TypeScript.
- `npm run lint` runs ESLint.
- `npm run check` runs format check, lint, typecheck, tests, and build.
- `npm run e2e` runs Playwright tests once browsers are installed.
