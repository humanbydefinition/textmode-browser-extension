# Store listings

The per-locale store listing **description** for Textmode Overlay, ready to paste into each store's developer dashboard. The localized title and summary ship inside the extension package, not here.

## Locales

| Locale                     | Code     | Title / summary source                    | Description                |
| -------------------------- | -------- | ----------------------------------------- | -------------------------- |
| English (default)          | `en`     | `public/_locales/en/messages.json`        | [`en.md`](en.md)           |
| German                     | `de`     | `public/_locales/de/messages.json`        | [`de.md`](de.md)           |
| Spanish                    | `es`     | `public/_locales/es/messages.json`        | [`es.md`](es.md)           |
| Portuguese (Brazil)        | `pt_BR`  | `public/_locales/pt_BR/messages.json`     | [`pt_BR.md`](pt_BR.md)     |
| Japanese                   | `ja`     | `public/_locales/ja/messages.json`        | [`ja.md`](ja.md)           |
| French                     | `fr`     | `public/_locales/fr/messages.json`        | [`fr.md`](fr.md)           |
| Russian                    | `ru`     | `public/_locales/ru/messages.json`        | [`ru.md`](ru.md)           |
| Korean                     | `ko`     | `public/_locales/ko/messages.json`        | [`ko.md`](ko.md)           |
| Chinese (Simplified)       | `zh_CN`  | `public/_locales/zh_CN/messages.json`     | [`zh_CN.md`](zh_CN.md)     |
| Italian                    | `it`     | `public/_locales/it/messages.json`        | [`it.md`](it.md)           |
| Polish                     | `pl`     | `public/_locales/pl/messages.json`        | [`pl.md`](pl.md)           |
| Dutch                      | `nl`     | `public/_locales/nl/messages.json`        | [`nl.md`](nl.md)           |
| Turkish                    | `tr`     | `public/_locales/tr/messages.json`        | [`tr.md`](tr.md)           |
| Chinese (Traditional)      | `zh_TW`  | `public/_locales/zh_TW/messages.json`     | [`zh_TW.md`](zh_TW.md)     |
| Spanish (Latin America)    | `es_419` | `public/_locales/es_419/messages.json`    | [`es_419.md`](es_419.md)   |

## How localization is wired

- The package ships `public/_locales/<code>/messages.json` with `extName` and `extDescription`. The manifest references these as `__MSG_extName__` and `__MSG_extDescription__` and declares `default_locale: "en"` (see `src/shared/config/extension-manifest.ts`).
- Chrome Web Store and Microsoft Edge Add-ons derive the listing title and summary from the manifest, and only offer a locale for listing localization when the package contains a matching `_locales/<code>/` directory.
- The detailed description, localized screenshots, and localized promo video are entered manually per locale in each store's dashboard. Firefox Add-ons (AMO) keeps its own per-locale Name / Summary / Description fields that are not synced with `_locales`.
- The extension UI stays English-only. Adding a locale here does not translate the in-page panel.

## Adding a locale

1. Add `public/_locales/<code>/messages.json` with `extName` and `extDescription`.
2. Add `docs/store-listings/<code>.md` containing the localized detailed description.
3. Enter the detailed description (and optional localized screenshots) for that locale in Chrome Web Store, Edge Add-ons, Firefox Add-ons, and Opera Add-ons.
4. Rebuild and republish so each store detects the new package locale.

## Copy guidelines

- Keep the product name and quoted UI labels (`"select media"`, `"Open Textmode Overlay"`, permission names) in English so they match the English-only UI.
- Keep localized metadata consistent with the English feature set. The Chrome Web Store warns when a locale appears to describe a different set of features.
- Use reviewed translations, not raw machine output.
- Character limits: manifest description max 132; Chrome Web Store detailed description max 16,000. Current description lengths: English 4,462, German 5,203, Spanish 5,272, Portuguese (Brazil) 5,090, Japanese 2,603, French 5,497, Russian 5,049, Korean 2,684, Chinese (Simplified) 1,943, Italian 5,254, Polish 4,832, Dutch 4,919, Turkish 5,036, Chinese (Traditional) 1,948, Spanish (Latin America) 5,284.
