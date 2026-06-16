# textmode.js ASCII Overlay Extension

Browser extension for selecting `<canvas>` and `<video>` elements on a page and converting them to live textmode.js ASCII overlays.

## Status

The extension is built with WXT. Chrome and Edge are built as Manifest V3 extensions. Firefox and Safari builds are generated through WXT's browser targets and should be validated in their native extension review and packaging flows before store submission.

## Development

```sh
npm install
npm run check
```

The unpacked Chrome extension is built to:

```text
.output/chrome-mv3
```

Load it in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `textmode-browser-extensions/.output/chrome-mv3`.

## Usage

1. Open a page with a visible `<canvas>` or `<video>`.
2. Click the extension action.
3. Click **Select Element**.
4. Click the target element on the page.
5. Adjust overlay settings in the in-page panel.

## Security And Platform Notes

The extension uses `activeTab`, `scripting`, and `storage`. It does not request persistent host permissions. The content runtime is injected only after a user action.

All executable code is bundled locally with the extension. Chrome MV3 does not allow remotely hosted runtime JavaScript, so production builds must not import textmode.js from a CDN.

Some media cannot be sampled. Cross-origin, tainted, or protected media may fail when the browser blocks WebGL/canvas pixel access. In that case the extension should show a clear error without breaking the page.

## Scripts

- `npm run build` builds the default WXT target.
- `npm run build:chrome` builds `.output/chrome-mv3`.
- `npm run build:edge` builds `.output/edge-mv3`.
- `npm run build:firefox` builds `.output/firefox-mv2`.
- `npm run build:safari` builds `.output/safari-mv2`.
- `npm run dev` starts WXT development mode.
- `npm run test` runs unit tests.
- `npm run typecheck` runs TypeScript.
- `npm run lint` runs ESLint.
- `npm run check:manifest:chrome` validates the generated Chrome manifest.
- `npm run check` runs format check, lint, typecheck, tests, Chrome build, and generated-manifest validation.
- `npm run e2e` builds the Chrome `e2e` target and runs Playwright tests once browsers are installed. The `e2e` build grants temporary host access so tests can automate injection; production Chrome output remains action-triggered and least-privilege.
- `npm run zip` packages the default target.
- `npm run zip:firefox` packages the Firefox target.
