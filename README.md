# textmode overlay browser extension

Turn visible canvas and video elements on the current tab into live textmode.js ASCII overlays.

This extension is part of the textmode ecosystem. It is built with [WXT](https://wxt.dev), React,
TypeScript, [textmode.js](https://github.com/humanbydefinition/textmode.js), and
[textmode.export.js](https://github.com/humanbydefinition/textmode.export.js). It is designed for artists,
creative coders, streamers, demo makers, educators, and anyone who wants to inspect or transform browser media
without writing a sketch from scratch.

## What It Does

- Select a visible `<canvas>` or `<video>` element directly on a page.
- Render a live ASCII/textmode overlay using textmode.js.
- Adjust opacity, font size, inversion, glyph ramp, character color, and cell color.
- Export the current overlay as TXT, SVG, PNG, or JPG.
- Keep the in-page control panel isolated in Shadow DOM.
- Use production permissions narrowly: `activeTab`, `scripting`, and `storage`.

## Status

This project is early open-source software.

| Target     | Status           | Notes                                                                                       |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Chrome MV3 | Primary target   | Covered by unit tests, manifest checks, and local Chrome builds.                            |
| Edge MV3   | Expected to work | Uses the same MV3 shape as Chrome, but still needs regular manual QA.                       |
| Firefox    | Experimental     | WXT can build the target, but extension review and runtime behavior need native validation. |
| Safari     | Experimental     | WXT can build the target, but Safari packaging and runtime behavior need native validation. |

See [docs/BROWSER_SUPPORT.md](docs/BROWSER_SUPPORT.md) for the current support policy.

## Quick Start

Requirements:

- Node.js 20.8.1 or newer
- npm
- Chrome or another Chromium browser for local MV3 testing

Install dependencies:

```sh
npm install
```

Run the full verification pipeline:

```sh
npm run check
```

Build the unpacked Chrome extension:

```sh
npm run build:chrome
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `.output/chrome-mv3`.

## Usage

1. Open a page with a visible canvas or video element.
2. Click the textmode overlay extension action.
3. Click **select media**.
4. Click the target media element on the page.
5. Adjust the overlay from the in-page panel.
6. Export the result when you want a static artifact.

Some media cannot be sampled. Cross-origin, tainted, DRM-protected, or otherwise restricted media may fail
when the browser blocks WebGL or canvas pixel access. The extension should report those failures without
breaking the page.

## Development

Start WXT development mode:

```sh
npm run dev
```

Install Playwright browsers for E2E testing:

```sh
npx playwright install chromium
```

Run E2E tests:

```sh
npm run e2e
```

Common commands:

| Command                         | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `npm run dev`                   | Start WXT development mode.                           |
| `npm run build:chrome`          | Build `.output/chrome-mv3`.                           |
| `npm run build:edge`            | Build `.output/edge-mv3`.                             |
| `npm run build:firefox`         | Build `.output/firefox-mv2`.                          |
| `npm run build:safari`          | Build `.output/safari-mv2`.                           |
| `npm run zip`                   | Package the default target.                           |
| `npm run zip:firefox`           | Package the Firefox target.                           |
| `npm run test`                  | Run unit tests.                                       |
| `npm run typecheck`             | Run TypeScript without emitting files.                |
| `npm run lint`                  | Run ESLint.                                           |
| `npm run check:format`          | Check formatting with Prettier.                       |
| `npm run check:boundaries`      | Verify source import boundaries.                      |
| `npm run check:manifest:chrome` | Validate the generated Chrome manifest.               |
| `npm run check`                 | Run the CI-equivalent local verification pipeline.    |
| `npm run e2e`                   | Build the Chrome E2E target and run Playwright tests. |

The E2E build grants temporary host access so tests can automate injection. Production Chrome output remains
action-triggered and least privilege.

## Architecture

The project uses a feature-sliced browser-extension architecture:

```text
src/
  entrypoints/       WXT entrypoint declarations only
  application/       background, page runtime, and popup orchestration
  domain/            pure overlay settings, descriptors, and helpers
  features/          media picking and textmode overlay behavior
  widgets/           React overlay panel UI and local UI primitives
  shared/            browser API adapter, config, errors, messaging, storage
```

Important boundaries:

- WXT imports are limited to entrypoints plus shared browser/config adapters.
- Browser and WebExtension APIs go through `src/shared/browser/browser-api.ts`.
- Message contracts live in `src/shared/messaging/messages.ts`.
- Overlay settings and descriptors live in `src/domain/overlay/`.
- `npm run check:boundaries` enforces the highest-value architecture rules.

Architecture records live in [docs/adr](docs/adr). A deeper senior review and improvement plan lives in
[docs/CODE_REVIEW.md](docs/CODE_REVIEW.md).

## Security And Privacy

The extension processes selected media locally in the browser. It does not intentionally collect analytics,
transmit media, or send browsing data to a server.

Production builds do not request persistent host permissions. The content runtime is injected after a user
action using `activeTab` and `scripting`. All executable code is bundled locally with the extension; production
builds must not import runtime JavaScript from a CDN.

Read:

- [SECURITY.md](SECURITY.md) for vulnerability reporting.
- [PRIVACY.md](PRIVACY.md) for data handling and permission notes.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for bundled dependency and asset notices.

## Contributing

Contributions of many kinds are welcome: code, docs, tests, browser QA, accessibility feedback, issue triage,
and design discussion.

Please read:

- [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.
- [GOVERNANCE.md](GOVERNANCE.md) for the maintainer-led decision process.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.
- [SUPPORT.md](SUPPORT.md) for where to ask questions or report issues.

Small fixes can go straight to a pull request. Larger features, browser-support changes, permission changes,
or architecture changes should start with an issue or discussion first.

## Ecosystem

- textmode.js docs: [code.textmode.art](https://code.textmode.art)
- textmode.js editor: [editor.textmode.art](https://editor.textmode.art)
- textmode.js library: [github.com/humanbydefinition/textmode.js](https://github.com/humanbydefinition/textmode.js)
- textmode.export.js:
  [github.com/humanbydefinition/textmode.export.js](https://github.com/humanbydefinition/textmode.export.js)

## License

MIT. See [LICENSE](LICENSE).
