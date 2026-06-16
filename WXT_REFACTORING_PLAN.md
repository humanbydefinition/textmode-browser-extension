# WXT Refactoring Plan

Status: implemented behavior-preserving architecture plan.

Last reviewed: 2026-06-16.

Implementation note: the refactor has been applied using WXT 0.20.26. The
production Chrome and Edge outputs are MV3, Firefox and Safari currently build
through WXT's MV2 targets, and the automated Chrome E2E suite uses a dedicated
`e2e` build mode so production output remains least-privilege.

This plan describes how to refactor the current `textmode.js` browser
extension into a WXT-based, browser-targetable architecture while preserving
the current styling, formatting, user flow, and runtime behavior.

The extension currently works well. The goal is not a redesign. The goal is to
move fragile extension-platform concerns behind explicit boundaries so the same
product can be built, tested, and packaged for Chrome, Edge, Firefox, Safari,
and other Chromium browsers with minimal browser-specific code.

## Inputs Reviewed

Local extension sources:

- `package.json`: standalone React 19, TypeScript, Vite, Vitest, Playwright,
  and `textmode.js@0.16.0` package.
- `vite.config.ts`: custom extension build with manual manifest emission,
  fixed output to `dist/chrome`, and three Rollup entrypoints.
- `src/manifest.ts`: Chrome MV3 manifest with `activeTab`, `scripting`,
  `storage`, a module service worker, and web-accessible runtime assets.
- `public/content-bootstrap.js`: classic injected bootstrap that imports
  `content-runtime.js` through `chrome.runtime.getURL`.
- `src/background/service-worker.ts`: action click handler and runtime
  injection/ping loop.
- `src/content/content-runtime.ts`: page runtime, message router, picker,
  overlay manager, and injected panel orchestration.
- `src/content/overlay-manager.ts`: `textmode.js` overlay lifecycle and
  source-to-overlay rendering behavior.
- `src/content/control-panel.tsx`: Shadow DOM host for the in-page React panel.
- `src/popup/popup.tsx` and `src/popup/popup.css`: React UI and exact visual
  contract shared by popup and injected panel.
- `src/shared/*`: browser adapter, message protocol, storage keys, settings
  normalization, and error mapping.
- `tests/unit/*` and `tests/e2e/*`: current safety net.

Adjacent local context:

- `textmode.js-dev`: `textmode.js` is a WebGL2-based, framework-agnostic
  rendering library. Overlay mode samples a target canvas or video element
  through `textmode.create({ canvas: element, overlay: true })`.
- `create.textmode.arte`: the broader codebase favors clear boundaries between
  domain, application/runtime orchestration, concrete features, widgets, and
  shared utilities, with ADRs for important architecture decisions.

External WXT sources reviewed:

- WXT docs and npm both identify the latest `wxt` release as `0.20.26`.
- WXT supports building for Chrome, Firefox, Edge, Safari, and Chromium-based
  browsers from one codebase.
- WXT generates the manifest from `wxt.config.ts`, entrypoint metadata, modules,
  and hooks, then writes it to `.output/{target}/manifest.json`.
- WXT uses file-based `entrypoints/` for background, content scripts, popup,
  unlisted scripts, pages, and CSS.
- WXT provides `browser` from `wxt/browser` as a unified extension API over
  `chrome` and `browser` globals.
- WXT supports browser and manifest targeting through CLI flags such as
  `wxt -b firefox`, `wxt build -b firefox`, `--mv2`, and `--mv3`.
- WXT recommends comparing the old and generated manifests during migration,
  preserving permissions and host permissions.
- WXT recommends Playwright for Chrome extension E2E tests, using the generated
  `.output/chrome-mv3` directory.

## Non-Negotiable Compatibility Contract

Do not change these behaviors during the refactor:

- The extension action toggles the existing in-page control panel on the active
  tab.
- The user can select visible `canvas` and `video` elements through the
  click-to-pick flow.
- Only one selected overlay is active at a time because
  `OverlayManager.createOverlay` currently clears previous overlays.
- Overlay rendering continues to use `textmode.create` with `overlay: true`,
  `pixelDensity: 1`, `fontSize`, and `loadingScreen.transition = 'none'`.
- The overlay canvas remains non-interactive, normal blend mode, and opacity
  controlled by current settings.
- Existing defaults, setting limits, color validation, glyph-ramp fallback, and
  `origin-defaults:` storage key format remain stable.
- The in-page panel keeps using Shadow DOM isolation and the current
  `popup.css` visual language.
- Existing strings, labels, layout, button behavior, advanced settings, support
  link, and remove/select flow remain visually unchanged.
- Cross-origin, protected, zero-size, detached, unloaded-video, and missing
  WebGL2 states continue to become user-readable errors.
- The extension remains least-privilege: keep `activeTab`, `scripting`, and
  `storage`; do not add persistent host permissions unless a later feature
  explicitly requires them.

## Current Architecture Assessment

### Strengths

- The extension is intentionally small and self-contained.
- The React UI is already reusable between the popup and injected panel.
- The message protocol and overlay settings are centralized under `src/shared`.
- Overlay runtime behavior is encapsulated in `OverlayManager`.
- The picker avoids extension UI elements with
  `data-textmode-ascii-extension-ui`.
- Tests already cover message validation, settings, picker filtering, panel
  rendering, CSS expectations, storage key behavior, and overlay replacement.

### Risks And Friction Points

- The build is Chrome-shaped. `vite.config.ts` manually writes a Chrome MV3
  manifest and emits to `dist/chrome`.
- Browser APIs are coupled directly to `chrome.*`, which blocks clean Firefox
  and Safari targeting.
- Runtime injection is custom: a public classic bootstrap dynamically imports
  `content-runtime.js`. This works for Chrome MV3 but is a packaging hotspot
  across targets.
- `ensureContentRuntime` is duplicated in the background worker and popup.
- `content-runtime.ts` is doing several jobs: message validation, command
  dispatch, picker lifecycle, panel lifecycle, overlay creation, page-state
  broadcast, and error mapping.
- The content panel manually implements Shadow DOM style injection even though
  WXT has first-class content script UI helpers.
- The popup is built but the current manifest action has no `default_popup`.
  Preserve the current action-click behavior first; decide later whether popup
  should become a supported visible surface.
- E2E tests only verify the fixture page, not extension loading, action click,
  picker flow, overlay creation, or generated manifests.

## Target Architecture

Keep the extension package standalone, but adopt WXT as the extension shell and
organize the source around explicit ownership boundaries.

```text
textmode-browser-extensions/
  wxt.config.ts
  web-ext.config.ts
  public/
    icons/
    icon-512.png
  src/
    entrypoints/
      background.ts
      content.content.ts
      popup/
        index.html
        main.tsx
        popup.css
    application/
      runtime/
        page-runtime.ts
        runtime-actions.ts
        runtime-injection.ts
      messaging/
        message-router.ts
        message-client.ts
        message-contract.ts
    domain/
      overlay/
        overlay-settings.ts
        overlay-descriptor.ts
        overlay-errors.ts
    features/
      media-picker/
        element-picker.ts
        selectable-elements.ts
      textmode-overlay/
        overlay-manager.ts
        textmode-overlay-adapter.ts
    widgets/
      overlay-panel/
        OverlayPanelApp.tsx
        OverlayCard.tsx
        OverlaySettingsForm.tsx
        overlay-ui-model.ts
        components/
    shared/
      browser/
        browser-api.ts
      storage/
        origin-defaults.ts
      lib/
        utils.ts
```

### Boundary Rules

- `entrypoints/` owns WXT integration only. It wires browser lifecycle events,
  page runtime startup, and React mounting. It should not contain overlay
  business logic.
- `application/runtime` owns orchestration: message dispatch, picker/panel
  coordination, overlay manager calls, and page-state synchronization.
- `application/messaging` owns typed cross-context commands and responses.
- `domain/overlay` owns pure settings, descriptors, validation, and error
  vocabulary.
- `features/media-picker` owns DOM candidate discovery and selection.
- `features/textmode-overlay` owns the adapter between `textmode.js` and the
  browser DOM.
- `widgets/overlay-panel` owns React UI and styling. It must keep the current
  CSS and markup contract unless a separate visual change is approved.
- `shared/browser` is the only place that imports `wxt/browser` directly,
  except for WXT entrypoints.
- `shared/storage` is the only place that knows the persisted storage key
  format.

## WXT Migration Strategy

### Recommended WXT Configuration

Use `srcDir: 'src'` to keep the current source-root preference and WXT's
expected entrypoint layout.

```ts
// wxt.config.ts
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
	srcDir: 'src',
	manifest: ({ browser }) => ({
		name: 'textmode overlay',
		description: 'turn live video and canvas elements into adjustable ascii overlays.',
		permissions: ['activeTab', 'scripting', 'storage'],
		action: {
			default_title: 'textmode overlay',
			default_icon: {
				16: '/icons/icon-16.png',
				32: '/icons/icon-32.png',
			},
		},
		icons: {
			16: '/icons/icon-16.png',
			32: '/icons/icon-32.png',
			48: '/icons/icon-48.png',
			128: '/icons/icon-128.png',
		},
		web_accessible_resources:
			browser === 'firefox'
				? undefined
				: [
						{
							resources: ['/assets/*'],
							matches: ['<all_urls>'],
						},
					],
	}),
	vite: () => ({
		plugins: [react()],
	}),
});
```

Notes:

- Preserve the action-without-popup behavior first. WXT supports an action
  without popup by omitting the popup entrypoint from the action and providing
  `manifest.action`.
- If the popup remains a build artifact, treat it as an optional internal UI
  surface until a product decision makes it user-facing.
- Keep `web_accessible_resources` as small as possible. A runtime-registered
  WXT content script may remove the need for the current bootstrap asset.
- Move aliases into `wxt.config.ts`, not only `tsconfig.json`, so WXT and
  TypeScript agree.

### Recommended Package Scripts

```json
{
	"scripts": {
		"postinstall": "wxt prepare",
		"dev": "wxt",
		"dev:firefox": "wxt -b firefox",
		"build": "wxt build",
		"build:chrome": "wxt build -b chrome --mv3",
		"build:edge": "wxt build -b edge --mv3",
		"build:firefox": "wxt build -b firefox",
		"build:safari": "wxt build -b safari",
		"zip": "wxt zip",
		"zip:firefox": "wxt zip -b firefox",
		"test": "vitest run",
		"test:watch": "vitest",
		"typecheck": "tsc --noEmit",
		"lint": "eslint .",
		"format": "prettier --write .",
		"check:format": "prettier --check .",
		"check": "npm run check:format && npm run lint && npm run typecheck && npm run test && npm run build:chrome",
		"e2e": "playwright test"
	}
}
```

## Phased Refactoring Plan

### Phase 0: Freeze Behavior

Deliverables:

- Add a generated-manifest snapshot test for the current `src/manifest.ts`.
- Add a CSS contract test that records key selectors from `popup.css`, including
  panel width, color variables, action rows, field classes, and button variants.
- Add an overlay manager test that verifies the exact `textmode.create` options
  currently used.
- Add a runtime injection test for the action-click path.
- Add a Playwright test that loads the current `dist/chrome`, opens the fixture
  page, clicks the action, picks the canvas, and verifies that an overlay canvas
  appears without pointer events.

Exit criteria:

- `npm run check` passes before any structural movement.
- A manual Chrome unpacked-extension smoke test is recorded.
- Current manifest permissions are captured as the baseline.

### Phase 1: Extract Browser And Messaging Adapters

Move duplicated and browser-specific logic before introducing WXT.

Deliverables:

- Move `ensureContentRuntime` into `src/application/runtime/runtime-injection.ts`.
- Replace direct `chrome.*` calls outside entrypoints with a local browser port:
  `queryActiveTab`, `injectRuntime`, `sendTabMessage`, `sendRuntimeMessage`,
  `onRuntimeMessage`, and `onActionClicked`.
- Keep the first implementation backed by `chrome.*` so behavior stays
  unchanged.
- Promote `RuntimeAck`, `PopupToContentMessage`, `ContentToPopupMessage`, and
  validators into `application/messaging/message-contract.ts`.
- Make popup and background both call the same message client.

Exit criteria:

- No behavior change.
- Unit tests prove background and popup share the same injection path.
- A grep for `chrome.` outside `shared/browser`, entrypoints, tests, and type
  shims returns no production hits.

### Phase 2: Split Page Runtime Orchestration

Keep the singleton page runtime, but divide its responsibilities.

Deliverables:

- Move `PageRuntime` to `application/runtime/page-runtime.ts`.
- Extract command handling to `runtime-actions.ts`.
- Keep picker lifecycle in `features/media-picker`.
- Keep overlay lifecycle in `features/textmode-overlay`.
- Keep panel lifecycle behind a `PanelHost` interface:
  `mount`, `unmount`, `updateState`.
- Preserve the current `window.__textmodeAsciiOverlayRuntime` guard.

Exit criteria:

- `content-runtime.test.ts` can test command handling without rendering React.
- `control-panel.test.tsx` still verifies the exact panel mount/unmount behavior.
- Overlay descriptor output remains identical.

### Phase 3: Adopt WXT With Chrome Parity

Introduce WXT while targeting Chrome MV3 only.

Deliverables:

- Install `wxt@0.20.26`.
- Add `postinstall: wxt prepare`.
- Add `wxt.config.ts` with `srcDir: 'src'`, React Vite plugin, manifest fields,
  and browser-safe permissions.
- Extend `.wxt/tsconfig.json` from `tsconfig.json`.
- Move background to `src/entrypoints/background.ts` and wrap it in
  `defineBackground`.
- Move content runtime to `src/entrypoints/content.content.ts` and wrap it in
  `defineContentScript({ registration: 'runtime', matches: ['<all_urls>'] })`
  if preserving action-triggered injection.
- Move popup HTML and React bootstrap to `src/entrypoints/popup/`, but keep it
  excluded from `action.default_popup` unless intentionally enabled.
- Replace `chrome.*` implementation of the browser port with `browser` from
  `wxt/browser`.
- Remove the manual manifest plugin from `vite.config.ts`; eventually remove
  `vite.config.ts` entirely or keep only Vitest config if needed.

Manifest parity checklist:

- `manifest_version` remains MV3 for Chrome.
- `name`, `description`, `version`, icons, action title, action icons,
  background service worker, and permissions match the baseline.
- No persistent host permissions are introduced.
- No extra web-accessible resources are introduced beyond what WXT requires.
- Generated output is `.output/chrome-mv3`, not `dist/chrome`; update docs and
  tests accordingly.

Exit criteria:

- `npm run build:chrome` succeeds.
- Generated `.output/chrome-mv3/manifest.json` matches the old manifest
  semantically.
- The Chrome Playwright extension test passes against `.output/chrome-mv3`.
- Manual smoke test confirms action click, picker, overlay, settings updates,
  pause/resume via enabled toggle, remove overlay, and panel close.

### Phase 4: Replace Custom Bootstrap

Remove the public classic bootstrap once WXT runtime registration is stable.

Deliverables:

- Stop copying `public/content-bootstrap.js`.
- Inject the WXT content script by its generated content script path through
  `browser.scripting.executeScript`, or register it dynamically through WXT's
  runtime content script support.
- Preserve idempotency with the existing page-runtime singleton guard.
- Keep the same ping loop until E2E proves startup reliability across browsers.

Exit criteria:

- No `content-bootstrap.js` in public output.
- Action click still starts the runtime on demand.
- Generated web-accessible resources are smaller than or equal to the Chrome
  baseline unless WXT needs a target-specific asset.

### Phase 5: Move Injected Panel To WXT Content Script UI

This phase is optional and should only proceed after Chrome WXT parity is
stable.

Deliverables:

- Evaluate WXT `createShadowRootUi` with `cssInjectionMode: 'ui'` for the
  in-page control panel.
- Preserve the current host id, z-index, width, max width, top/right placement,
  dark color scheme, box shadow, and imported `popup.css` classes.
- Keep React unmount behavior equivalent to current `ControlPanel.unmount`.
- Do not change UI markup, text, spacing, or color tokens.

Exit criteria:

- Screenshot diff of the current panel and WXT-hosted panel is within tolerance.
- Unit tests still pass for panel state updates and close behavior.
- Manual smoke test confirms page CSS cannot leak into the panel.

### Phase 6: Browser Target Matrix

Add targets one at a time. Each target must have a build, manifest inspection,
and manual smoke test before it is considered supported.

Target order:

1. Chrome MV3.
2. Edge MV3, using the Chrome build unless Edge-specific manifest differences
   appear.
3. Firefox using WXT's default target first, then decide whether MV2 or MV3 is
   the support baseline for store submission.
4. Safari using WXT's Safari target, followed by Safari Web Extension packaging
   validation.
5. Other Chromium browsers as documentation-only targets unless store packaging
   is needed.

Browser compatibility concerns:

- `browser.scripting` and runtime content script injection availability.
- Action API differences between `action`, `browser_action`, and `page_action`.
- Promise behavior and errors from `tabs.sendMessage`.
- Shadow DOM and constructable stylesheet behavior in content scripts.
- WebGL2 availability and media sampling behavior.
- Store review expectations around source ZIPs, remote code, and permissions.

Exit criteria for each target:

- Target build command succeeds.
- Manifest permissions are intentionally reviewed.
- Fixture-page E2E or manual equivalent passes.
- Real-world canvas and video smoke tests are recorded.

### Phase 7: Package And Release Automation

Deliverables:

- Add `wxt zip` commands for Chrome/Edge and Firefox.
- Add a CI matrix for `check`, `build:chrome`, `build:firefox`, and optional
  `build:safari`.
- Add artifact upload for generated unpacked extensions and ZIPs.
- For Firefox, inspect the generated source ZIP and verify that it can rebuild
  the extension from a clean extraction.
- Keep store submission manual until extension IDs and review metadata are
  stable.

Exit criteria:

- CI produces reproducible extension artifacts.
- Release documentation lists which ZIP belongs to each store.
- No build artifacts are committed.

## Testing Strategy

### Unit Tests

Keep and expand Vitest coverage around pure and semi-pure boundaries:

- `domain/overlay`: defaults, setting merge, clamping, color validation,
  descriptors, and bounds.
- `application/messaging`: message validation, command/response shape, unknown
  message behavior, and error conversion.
- `application/runtime`: command dispatch, picker cancellation, overlay
  creation errors, panel lifecycle, and broadcast behavior.
- `features/media-picker`: visibility filtering, element labeling, extension UI
  exclusion, and keyboard cancellation.
- `features/textmode-overlay`: `textmode.create` options, settings application,
  pause/resume, remove, detached element cleanup, and WebGL2 guard.
- `shared/storage`: key compatibility and settings normalization.
- `widgets/overlay-panel`: UI state, disabled remove button, advanced fields,
  labels, and callback patches.

### E2E Tests

Add Playwright tests against WXT output:

- Load `.output/chrome-mv3` as an unpacked extension.
- Open `tests/fixtures/media-page.html`.
- Click the extension action.
- Verify the in-page panel appears with current visual classes.
- Click `select media`.
- Pick `canvas#demo-canvas`.
- Verify one overlay descriptor, one injected overlay canvas, and no page
  interaction blocking.
- Change opacity and font size.
- Toggle overlay off and on.
- Remove overlay.
- Repeat selection for `video#demo-video` where browser media policies allow.

### Visual Regression

The UI is intentionally unchanged, so add low-friction visual checks:

- Popup or panel screenshot at 340 px width with no selected media.
- Panel screenshot after selecting a canvas.
- Advanced settings expanded.
- Error state.

Use the screenshots as review artifacts even if the project does not initially
adopt strict pixel-diff gating.

### Manifest And Permission Tests

Add a manifest inspection script that checks:

- Required permissions only: `activeTab`, `scripting`, `storage`.
- No host permissions in the default build.
- Action title and icons are present.
- Background is emitted correctly for the target manifest version.
- Content script is runtime-registered or otherwise intentionally absent from
  static matches.
- Web-accessible resources are minimal and target-specific.

## Documentation Updates

Update `README.md` after WXT migration:

- Replace `dist/chrome` with `.output/chrome-mv3`.
- List target build commands.
- Document current support status per browser.
- Document that functionality is action-triggered and least-privilege.
- Document known media limitations: tainted canvas, protected video, unloaded
  metadata, detached elements, and no WebGL2.

Add an ADR:

- `docs/adr/0001-wxt-extension-shell.md`
- Decision: WXT owns extension packaging, browser targeting, generated manifest,
  and entrypoint discovery; application runtime owns behavior.
- Consequence: browser-specific code must stay in entrypoints or browser ports.

## Proposed Implementation Order

1. Freeze behavior with additional tests and manifest snapshots.
2. Extract browser and messaging adapters while still using the current Vite
   build.
3. Split `PageRuntime` into application, feature, and widget boundaries.
4. Add WXT and make Chrome MV3 output match current behavior.
5. Remove custom bootstrap if WXT runtime injection proves equivalent.
6. Add Edge, Firefox, and Safari build targets.
7. Add packaging and CI artifacts.
8. Consider WXT content script UI after parity is already proven.

## Definition Of Done

The refactor is complete when:

- Chrome MV3 behavior is visually and functionally unchanged.
- The default Chrome generated manifest is semantically equivalent to the
  current manifest and does not request new permissions.
- Browser APIs are accessed through WXT's unified `browser` API or a local port.
- The source tree has clear entrypoint, application, domain, feature, widget,
  and shared ownership.
- `npm run check`, `npm run build:chrome`, and Chrome E2E tests pass.
- At least one additional browser target builds successfully.
- Browser-specific differences are documented rather than hidden in ad hoc
  conditionals.

## Explicit Non-Goals

- No UI redesign.
- No copy, color, spacing, or control-flow changes.
- No new persistent host permissions.
- No replacement of `textmode.js`.
- No conversion to a different UI framework.
- No expansion to multi-overlay behavior unless requested separately.
- No store submission automation until manual target builds are validated.

## Source Links

- WXT home and latest docs version: https://wxt.dev/
- WXT project structure: https://wxt.dev/guide/essentials/project-structure
- WXT entrypoints: https://wxt.dev/guide/essentials/entrypoints
- WXT manifest config: https://wxt.dev/guide/essentials/config/manifest
- WXT target browsers: https://wxt.dev/guide/essentials/target-different-browsers
- WXT extension APIs: https://wxt.dev/guide/essentials/extension-apis
- WXT migration guide: https://wxt.dev/guide/resources/migrate
- WXT scripting: https://wxt.dev/guide/essentials/scripting
- WXT E2E testing: https://wxt.dev/guide/essentials/e2e-testing
- WXT publishing: https://wxt.dev/guide/essentials/publishing
