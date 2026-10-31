# Chrome Web Store Listing — Textmode Overlay

> Last Updated: 2026-09-14

## Store Listing

**Extension Name**
Textmode Overlay

**Short Description**
Turn canvas and video elements into live ASCII art.

**Detailed Description**
Listing descriptions are maintained per locale in [`docs/store-listings/`](docs/store-listings/). Copy the fenced description block from the matching file into the **Store listing → Detailed description** field for each locale.

| Locale                | File                                                           |
| --------------------- | -------------------------------------------------------------- |
| English (default)     | [`docs/store-listings/en.md`](docs/store-listings/en.md)       |
| German                | [`docs/store-listings/de.md`](docs/store-listings/de.md)       |
| Spanish               | [`docs/store-listings/es.md`](docs/store-listings/es.md)       |
| Portuguese (Brazil)   | [`docs/store-listings/pt_BR.md`](docs/store-listings/pt_BR.md) |
| Japanese              | [`docs/store-listings/ja.md`](docs/store-listings/ja.md)       |
| French                | [`docs/store-listings/fr.md`](docs/store-listings/fr.md)       |
| Russian               | [`docs/store-listings/ru.md`](docs/store-listings/ru.md)       |
| Korean                | [`docs/store-listings/ko.md`](docs/store-listings/ko.md)       |
| Chinese (Simplified)  | [`docs/store-listings/zh_CN.md`](docs/store-listings/zh_CN.md) |
| Italian               | [`docs/store-listings/it.md`](docs/store-listings/it.md)       |
| Polish                | [`docs/store-listings/pl.md`](docs/store-listings/pl.md)       |
| Dutch                 | [`docs/store-listings/nl.md`](docs/store-listings/nl.md)       |
| Turkish               | [`docs/store-listings/tr.md`](docs/store-listings/tr.md)       |
| Chinese (Traditional) | [`docs/store-listings/zh_TW.md`](docs/store-listings/zh_TW.md) |
| Spanish (Latin America) | [`docs/store-listings/es_419.md`](docs/store-listings/es_419.md) |

**Category**
Developer Tools

**Single Purpose**
Turn visible HTML5 canvas and video elements into real-time ASCII art overlays on web pages.

**Primary Language**
English (default). Localized listings: German, Spanish, Portuguese (Brazil), Japanese, French, Russian, Korean, Chinese (Simplified), Italian, Polish, Dutch, Turkish, Chinese (Traditional), Spanish (Latin America).

**Localized Listings**
Localization ships in two parts:

1. The package contains `public/_locales/<code>/` for `en`, `de`, `es`, `pt_BR`, `ja`, `fr`, `ru`, `ko`, `zh_CN`, `it`, `pl`, `nl`, `tr`, `zh_TW`, and `es_419`, each with the localized extension name and short description. The manifest uses `__MSG_extName__` / `__MSG_extDescription__` with `default_locale: "en"`.
2. The detailed description, and optionally localized screenshots and promo video, are entered per locale in the Developer Dashboard. A locale only appears in the dashboard language dropdown when the package contains the matching `_locales/<code>/` directory.

The extension UI remains English-only; only the store listing is localized. See [`docs/store-listings/README.md`](docs/store-listings/README.md) for the full workflow and how to add the next language.

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `public/icons/icon-128.png` |
| Context Menu Icon | 16×16 PNG | ✅ Ready | `public/icons/icon-16.png` (same icon as toolbar action) |
| Action Toolbar Icon | 16×16, 32×32 PNG | ✅ Ready | `public/icons/icon-16.png`, `public/icons/icon-32.png` |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Grants temporary programmatic access to the active browser tab when the user clicks the toolbar icon or the context menu item. |
| `contextMenus` | permissions | Allows users to right-click on a page or video to open the overlay controls. |
| `scripting` | permissions | Injects the frame runtime and overlay renderer into the page only when the user requests an overlay. |
| `storage` | permissions | Persists per-site visual settings and panel placement coordinates locally across visits. |
| `unlimitedStorage` | permissions | Enables storing uploaded custom font binary files (TTF/OTF) in local storage for in-page ASCII rendering. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

All ASCII rendering, contour detection, filter passes, and preset storage run entirely on-device. No telemetry, analytics, or user data are gathered or transmitted.

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name**: humanbydefinition
**Contact Email**: hello@textmode.art
**Support URL**: https://code.textmode.art/docs/support
**Homepage URL**: https://code.textmode.art

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.2.0 | 2026-09-03 | Added right-click context menu item for direct overlay application onto canvas and video elements; reused the toolbar icon; added declarative frame runtime target tracking. | Implemented |
| 1.1.0 | 2026-08-15 | Multi-frame iframe support, element picker overlay, custom font persistence. | Published |
| 1.0.0 | 2026-06-20 | Initial release with textmode.js live overlay engine, contour pass, post-fx filters, and export. | Published |
