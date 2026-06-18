# Contributing to `Textmode Overlay`

Thank you for helping improve the `Textmode Overlay` browser extension.

Useful contributions include code, documentation, browser QA, accessibility feedback, design discussion, issue
triage, tests, bug reports, and release-check notes. You do not need to be a browser-extension expert to help.

Before participating, please read and follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Start Here

- Public pull requests target `main` unless maintainers announce a different release branch.
- GitHub Issues and Pull Requests are the durable source of truth for project decisions.
- Small fixes can go straight to a pull request.
- Larger work should start with an issue before implementation.
- Extension permission changes require explicit maintainer agreement before code is written.

Start with an issue for:

- New features.
- User-interface redesigns.
- Browser-support changes.
- Permission, privacy, or storage changes.
- Public message-contract changes.
- Architecture changes.
- New runtime dependencies.
- Changes that add, remove, or replace bundled assets.
- Store packaging, release, or signing workflow changes.

## Ground Rules

- Keep production permissions least privilege.
- Do not add remotely hosted runtime code.
- Keep WXT entrypoints thin.
- Keep browser APIs behind the shared browser adapter.
- Prefer existing architecture boundaries over new abstractions.
- Add or update tests for behavior changes.
- Keep user-facing errors clear, especially around restricted media and browser permission failures.
- Document browser-support impact when behavior differs across Chrome, Edge, Firefox, or Safari.

## Setup

Requirements:

- Node.js `>=20.8.1`
- npm
- Git
- Chrome or another Chromium browser for local MV3 testing

```sh
git clone https://github.com/<your-username>/<repo-name>.git
cd textmode-browser-extensions
npm install
npm run check
```

For E2E tests:

```sh
npx playwright install chromium
npm run e2e
```

Useful commands:

| Command                    | Purpose                                               |
| -------------------------- | ----------------------------------------------------- |
| `npm run dev`              | Start WXT development mode.                           |
| `npm run build:chrome`     | Build `.output/chrome-mv3`.                           |
| `npm run build:edge`       | Build `.output/edge-mv3`.                             |
| `npm run build:firefox`    | Build `.output/firefox-mv3`.                          |
| `npm run build:safari`     | Build `.output/safari-mv2`.                           |
| `npm run zip`              | Package the default target.                           |
| `npm run zip:firefox`      | Package the unsigned Firefox target for AMO upload.   |
| `npm run lint:firefox`     | Run Mozilla's add-on linter against Firefox output.   |
| `npm run sign:firefox`     | Create a signed Firefox XPI through AMO credentials.  |
| `npm run test`             | Run unit tests.                                       |
| `npm run test:watch`       | Run unit tests in watch mode.                         |
| `npm run typecheck`        | Run TypeScript without emitting files.                |
| `npm run lint`             | Run ESLint.                                           |
| `npm run check:format`     | Check formatting with Prettier.                       |
| `npm run check:boundaries` | Verify source import boundaries.                      |
| `npm run check`            | Run the CI-equivalent local verification pipeline.    |
| `npm run e2e`              | Build the Chrome E2E target and run Playwright tests. |

The E2E build grants temporary host access so tests can automate injection. Production Chrome output remains
action-triggered and least privilege.

## Architecture

The project uses a feature-sliced layout:

- `src/entrypoints`: WXT entrypoints only.
- `src/application`: background, page runtime, and popup orchestration.
- `src/domain`: pure overlay settings, descriptors, and helpers.
- `src/features`: media picker and textmode overlay behavior.
- `src/widgets`: Overlay UI and local UI primitives.
- `src/shared`: browser adapter, messaging, errors, config, storage, and utilities.

## Making a Change

1. Search existing issues and pull requests.
2. For substantial work, open an issue and wait for maintainer agreement.
3. Create a focused branch.
4. Make the smallest coherent change that solves the problem.
5. Add or update tests, docs, and screenshots when behavior changes.
6. Run focused checks while developing.
7. Run `npm run check` before opening the pull request when practical.
8. Fill out the pull request template honestly, including anything you could not verify.

Pull requests are easier to review when they are focused. Separate unrelated cleanup, feature work, and
behavior changes into separate pull requests.

## Review Expectations

This project is maintained on a best-effort basis.

- Maintainers aim to triage new issues and pull requests within 7 days.
- If there is no response after 14 days, a polite ping on the same thread is welcome.
- Review may ask for tests, docs, smaller scope, or design discussion before merge.
- Maintainers may close work that does not fit the project direction, duplicates existing discussion, or cannot
  be reviewed safely.

When maintainers decline or redirect work, they should explain the project reason when possible. Contributors
are expected to keep discussion constructive and public.

## Code Style

- Use TypeScript for extension code.
- Use Prettier and ESLint through the existing project scripts.
- Prefer clear domain names over abbreviations.
- Avoid `any`; isolate unavoidable casts near the boundary that requires them.
- Prefix intentionally unused parameters with `_`.
- Keep comments rare and useful.
- Do not add runtime dependencies without prior maintainer agreement.

## Browser Extension Rules

Browser extensions have extra review and trust requirements:

- Do not add persistent host permissions without an approved issue.
- Do not broaden `web_accessible_resources` without explaining why.
- Do not add remote scripts, remote module loading, or CDN runtime imports.
- Keep generated manifests reviewed and covered by tests.
- Document any change that affects extension-store privacy disclosures.
- Test user-facing changes in a real browser when possible.

## Tests

Tests live under `tests/`:

- `tests/unit/**` contains focused module and UI tests.
- `tests/e2e/**` contains Playwright extension-flow tests.
- `tests/fixtures/**` contains browser test fixtures.

Guidelines:

- Prefer tests through public module boundaries.
- Use small doubles around browser APIs, WebGL, canvas, and observers.
- Add a regression test when fixing a bug.
- Run E2E tests for popup, injection, picking, or overlay lifecycle changes.

## Assets and Third-Party Code

Every new asset must have documented provenance:

- Source URL or original author.
- License.
- Redistribution permission.
- Required attribution text.
- Whether it can be included in browser-extension store packages.

If provenance is uncertain, do not add the asset.

## Commit Messages

Use clear, scoped commit messages. Conventional Commits are welcome.

Examples:

```text
fix: surface popup injection failures
test: cover detached overlay cleanup
docs: document Firefox packaging status
```

## Pull Requests

Before opening a pull request:

- Link the related issue when there is one.
- Keep the change focused.
- Run `npm run check` when practical.
- Run `npm run e2e` for browser-flow changes.
- Include screenshots or recordings for visible UI changes.
- Call out permission, privacy, packaging, browser-support, or breaking-change impact.
- Update README or docs when behavior, setup, permissions, or browser support changes.

Pull requests do not need to be perfect on the first try. Clear intent, a small scope, and honest validation
notes are more valuable than guessing what maintainers want.
