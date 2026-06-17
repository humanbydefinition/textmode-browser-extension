# Third-Party Notices

This project depends on open-source packages and includes bundled assets used by the extension.

## Runtime Libraries

- [textmode.js](https://github.com/humanbydefinition/textmode.js) powers the textmode rendering behavior.
- [textmode.export.js](https://github.com/humanbydefinition/textmode.export.js) powers overlay export behavior.
- [React](https://react.dev/) and [React DOM](https://react.dev/) power the extension UI.
- [WXT](https://wxt.dev/) powers browser-extension builds and entrypoints.
- [Radix UI](https://www.radix-ui.com/) primitives support interactive UI controls.
- [Lucide](https://lucide.dev/) provides icons.

Package-level license metadata is recorded in `package-lock.json`. Release reviewers should validate bundled
third-party notices before publishing store packages.

## Bundled Assets

- `public/fonts/Bescii-Mono.ttf` is bundled for the extension panel header style.
- `public/icons/**` and `public/icon-512.png` are bundled extension icons.

If asset provenance changes or new assets are added, update this file with source, author, license, and required
attribution.

## Contributor Covenant

[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) is adapted from Contributor Covenant 3.0 and includes attribution plus
license information in that file.
