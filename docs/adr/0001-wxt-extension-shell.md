# ADR 0001: WXT Extension Shell

Status: Accepted

Date: 2026-06-16

## Context

The extension was originally built with a custom Vite configuration that wrote
a Chrome Manifest V3 manifest and emitted a Chrome-shaped `dist/chrome`
package. Runtime startup used a public bootstrap script that imported the
content runtime by URL.

That shape worked for the Chrome MVP, but it made browser targeting,
permission review, generated manifests, and packaging the responsibility of
local build glue.

## Decision

WXT owns extension packaging, browser targeting, entrypoint discovery,
generated manifests, and ZIP packaging.

Application code owns behavior:

- background action handling
- content runtime startup
- element picking
- overlay lifecycle
- settings and message contracts
- React panel rendering

The content runtime is a WXT unlisted script injected after a user action
through `activeTab` and `scripting`. It is not declared as a static content
script, and the generated Chrome manifest must not request persistent host
permissions.

Browser APIs must be accessed through the local `src/shared/browser-api.ts`
adapter, which is backed by WXT's `browser` API.

## Consequences

- Chrome and Edge build as MV3 outputs under `.output/*-mv3`.
- Firefox and Safari build through WXT browser targets, currently as MV2
  outputs.
- The generated manifest is verified after the Chrome build.
- Browser-specific manifest requirements, such as Firefox data collection
  declarations, belong in the WXT manifest factory.
- The old `src/manifest.ts`, custom Vite manifest plugin, and public bootstrap
  script are no longer production surfaces.
