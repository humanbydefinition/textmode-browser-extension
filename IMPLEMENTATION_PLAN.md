# Chrome MV3 ASCII Overlay Extension MVP Plan

## Summary

Create a self-contained Chrome MV3 extension that lets a user activate the extension, select visible `<canvas>` or `<video>` elements on the current page, and overlay real-time textmode.js ASCII conversion with per-element controls.

The project is intentionally independent from `textmode.js-dev`. It depends on the published `textmode.js` npm package and bundles all runtime code locally.

## Implementation

- Standalone project in `browser-extensions/` with its own package, TypeScript, Vite, ESLint, Prettier, tests, and Chrome unpacked build output.
- Chrome MV3 manifest with `activeTab`, `scripting`, and `storage`.
- Popup injects a small classic bootstrap script; the bootstrap dynamically imports the bundled content runtime from the extension package.
- Content runtime scans visible `canvas, video` elements, supports click-to-pick selection, and manages multiple overlay controllers.
- Each selected element is converted with `textmode.create({ canvas: element, overlay: true, frameRate: 60 })`.
- In-page Shadow DOM settings panel and popup controls can adjust active overlays.
- Cross-origin, protected, zero-size, detached, and WebGL2 failure states are surfaced as user-readable errors.

## Test Plan

- Unit tests cover settings merge/clamping, message shape validation, storage key behavior, and element visibility filtering.
- E2E tests are scaffolded for Playwright and should load `dist/chrome` as an unpacked extension against local fixtures.
- Manual acceptance should verify local canvas/video demos and at least one real-world video page.

## Follow-Ups

- Add Firefox build target with `browser.*` adapter support.
- Add Safari packaging via Apple’s Safari Web Extension converter/packager.
- Add optional per-site persistent permissions and opt-in auto-start.
- Add richer textmode controls for custom char color and conversion stack presets.
