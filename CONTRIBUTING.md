# Contributing to Textmode Overlay

Thank you for helping improve the `Textmode Overlay` browser extension!

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Branching Model

This repository uses a structured promotion pipeline to control releases:

- **`dev`**: The active integration branch. **All pull requests must target this branch.**
- **`beta`**: The prerelease branch. Pushes/merges to `beta` automatically trigger a pre-release on GitHub.
- **`main`**: The stable release branch. Pushes/merges to `main` automatically trigger a production release.

_Note: Direct local pushes to `dev`, `beta`, and `main` are blocked by git hooks. Changes must be proposed via pull requests._

---

## Commit Guidelines

We enforce **Conventional Commits** to automate versioning and release notes. Your commit messages must use one of these prefixes:

- `feat:` (New features)
- `fix:` (Bug fixes)
- `docs:` (Documentation updates)
- `refactor:` (Code structural changes)
- `style:` (Code formatting, no logic change)
- `test:` (Adding or correcting tests)
- `chore:` (Maintenance tasks)

Example: `feat: add font selection dropdown`

---

## Local Development Setup

### Prerequisites

- Node.js `>=20.8.1`
- npm
- Git

### Getting Started

1. Fork and clone the repository.
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start WXT development mode:
    ```bash
    npm run dev
    ```
4. Run project checks before proposing changes (runs Prettier, ESLint, TypeScript, unit tests, and builds):
    ```bash
    npm run check
    ```

### Running End-to-End Tests

For browser-flow integration testing:

```bash
npx playwright install chromium
npm run e2e
```

---

## Extension Architecture

The project follows a feature-sliced directory structure under `src/`:

- `entrypoints/`: Extension entry points (background scripts, popup HTML).
- `application/`: Popup and runtime orchestration.
- `domain/`: Pure helper functions, settings, and business logic.
- `features/`: Media interaction and textmode rendering logic.
- `widgets/`: In-page control panel and UI elements.
- `shared/`: Browser adapter, messaging, and storage utilities.

---

## Key Guidelines

### Security & Privacy

- **Least Privilege**: Maintain the narrowest possible permission scopes in `manifest.json`.
- **Content Security Policy**: Do not use dynamic execution syntax (like `eval()` or `new Function()`) in the extension code, as this violates Manifest V3 Content Security Policy (CSP).
- **No Remote Code**: All scripts must be bundled locally. Loading external scripts at runtime is prohibited.

### Asset Provenance

Every added asset (fonts, icons, etc.) must have documented license provenance in the project files. If licensing or redistribution permissions are uncertain, do not add the asset.

---

## Pull Request Checklist

Before submitting a pull request, ensure that:

1. Your branch targets the `dev` branch.
2. Local checks pass successfully (`npm run check`).
3. You have included or updated unit/E2E tests for any behavior changes.
4. Your commits follow the conventional commit format.
