# ADR 0002: Feature-Sliced Extension Architecture

## Status

Accepted

## Context

The extension needs to keep its current WXT build behavior, browser permissions, UI, and wire contracts while becoming easier to extend across Chrome, Edge, Firefox, and Safari. WXT entrypoints should stay thin, and browser/WebExtension APIs should be isolated behind internal adapters so feature code can be tested without relying on WXT runtime state.

## Decision

Use a feature-sliced source layout:

- `src/entrypoints`: WXT entrypoint declarations only.
- `src/application`: runtime orchestration for background, page runtime, and popup shell code.
- `src/domain`: stable overlay settings, descriptors, and pure domain helpers.
- `src/features`: user-facing feature behavior such as media picking and textmode overlay management.
- `src/widgets`: composed UI widgets and panel styling.
- `src/shared`: browser, config, errors, messaging, storage, and generic utility adapters.

WXT imports are limited to entrypoints plus shared browser/config adapters. Feature code must not import WXT entrypoints directly; `npm run check:boundaries` enforces that rule.

## Consequences

- Current message names, settings shapes, UI styling, Shadow DOM isolation, and one-overlay-at-a-time behavior remain unchanged.
- The browser API, textmode renderer, panel host, and runtime action handler are now explicit internal ports.
- Production manifests remain least-privilege. The `e2e` mode remains the only mode with temporary host permissions.
- New behavior should enter through the closest feature/application boundary and only promote code into `shared` when multiple slices genuinely need it.
