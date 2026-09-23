# Overlay height and control density review

Reviewed: 23 September 2026. Scope: the in-page control panel and the shared popup UI in `src/widgets/overlay-panel/`. This is a design and implementation proposal; no UI code changed.

## Executive finding

The panel uses a 300px width and a maximum height of `min(605px, 100vh - 60px)`. The selected-media view uses 508px with **Export** open and reaches the 605px cap with **Advanced** or **Post FX** open. At an 800 × 500 CSS-pixel viewport, the cap becomes 440px. The Advanced tab body then has **0px visible height**: its controls exist but cannot be reached through the intended scroll area. Fixing that lost access is the first priority. Reducing the always-visible stack will both shorten the overlay and restore space for tab content.

The most promising design is a compact selected-media toolbar, three short quick-control rows, one tab bar, and a single scrollable content region. Aim for a **500–520px cap on a 720px-high viewport**, with **at least 120–150px of usable tab content on a 500px-high viewport**. These are design targets, not measured results. A prototype must confirm them at normal and enlarged text sizes.

## What was inspected

- The panel shell, selected-media card, settings form, tab systems, color and font pickers, slider, effect list, scroll area, and placement code.
- The built Chrome extension loaded against the repository's media fixture in Chromium. Measurements used an 800 × 720 viewport and an 800 × 500 viewport, with a canvas selected. The in-page panel uses the same `popup.css` and `OverlayPanelView` as the browser popup, but the popup window was not measured separately.
- Current [W3C WCAG 2.2 guidance](#research-and-accessibility-constraints), WAI-ARIA Authoring Practices, and the [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). External guidance informs the recommendations; it does not replace a manual accessibility test.

### Measured layout

| State | Viewport | Panel | Selected-media header | Always-visible quick controls | Main tabs | Tab body |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| No media | 800 × 720 | 180px | — | — | — | — |
| Canvas, Export | 800 × 720 | 508px | 55px | 159px | 30px | 65px |
| Canvas, Advanced | 800 × 720 | 605px | 55px | 159px | 30px | 162px |
| Canvas, Post FX | 800 × 720 | 605px | 55px | 159px | 30px | 162px |
| Canvas, Advanced | 800 × 500 | 440px | 55px | 159px | 30px | **0px** |

Dimensions come from `getBoundingClientRect()` in the loaded extension. The 800 × 500 Advanced content has 207px of scroll content in a viewport whose client height is 0px. Its nested converter control also has a 0px viewport. This is a reproducible functional defect, not a visual estimate. These measurements describe one fixture and one browser; font metrics and labels can vary.

## Why the panel is tall

1. **Fixed content consumes the short-viewport budget.** The shell has 12px padding, 12px grid gaps, a 32px header, a separate 34px media action row, a selected-media card with 10px padding, a 55px media header plus 10px bottom margin, a 159px quick-control section, a tab bar, and a persistent footer. The tab body's `minmax(0, 1fr)` gives up its height when the cap is tight. See [`popup.css`](../src/widgets/overlay-panel/popup.css#L65), [`overlay-panel-view.ts`](../src/widgets/overlay-panel/overlay-panel-view.ts#L116), and [`overlay-card-view.ts`](../src/widgets/overlay-panel/panel/overlay-card-view.ts#L37).
2. **The media status and media actions occupy separate rows.** “Replace media” and remove sit above the card, while the card repeats the selected-media context. The status card itself has two text lines and a separate dimensions badge. This is a good information hierarchy at full height but costly at 300px width. See [`overlay-panel-view.ts`](../src/widgets/overlay-panel/overlay-panel-view.ts#L116) and [`popup.css`](../src/widgets/overlay-panel/popup.css#L480).
3. **Quick controls remain expanded on every tab.** Overlay enabled, opacity, font size, background, and font occupy 159px before Advanced or Post FX content starts. Their current order is useful, but the background/font pair spends 57px on a label row above 30px triggers. See [`overlay-settings-form-view.ts`](../src/widgets/overlay-panel/overlay-settings-form-view.ts#L68) and [`popup.css`](../src/widgets/overlay-panel/popup.css#L552).
4. **Advanced has two tab levels.** Main tabs are followed by Brightness/Contour tabs, each with a separate enable switch. This costs another header row inside the already small scroll region and makes tab selection and effect enablement easy to confuse. See [`converter-tabs-view.ts`](../src/widgets/overlay-panel/components/converter-tabs-view.ts#L23).
5. **Post FX rows spend height and width on duplicate affordances.** Each collapsed row is at least 36px high, with 5px between rows, plus a grip, a full-name disclosure button, an “on” switch, and a second disclosure button. The two disclosure buttons do the same thing. See [`post-fx-panel-view.ts`](../src/widgets/overlay-panel/post-fx-panel-view.ts#L89) and [`popup.css`](../src/widgets/overlay-panel/popup.css#L815).
6. **The footer stays visible even while controls are clipped.** “Rate extension” and “built with textmode.js” occupy 13px plus an outer grid gap. These links are useful, but they have less priority than active controls. See [`overlay-panel-view.ts`](../src/widgets/overlay-panel/overlay-panel-view.ts#L137).

## Recommended design changes

The savings below are **rough layout opportunities**, not independently additive estimates. Measure the combined prototype before changing the panel cap.

| Priority | Change | Height opportunity | Interaction requirement |
| --- | --- | ---: | --- |
| P0 | Give the active tab a real scroll viewport at short heights. Make one bounded scroll region contain the controls that need to move; use a minimum usable height before allocating space to optional chrome. | Restores access; height saving depends on the next changes. | All controls must remain visible on focus and reachable with wheel, keyboard, and touch. Do not rely on `overflow: hidden` with a 0px child. |
| P1 | Combine selected-media status, **Replace**, remove, and overlay on/off into one responsive toolbar. Use “Canvas · 320×180” plus a truncated element name, and show the full name on focus or in an accessible description. Keep explicit labels for the state-changing controls. | About 35–55px from the separate action row, card header, and inter-row spacing. | At 300px width, test long names and localized text. If one row cannot fit, wrap cleanly rather than shrink targets. Keep a clear empty-state **Select media** action. |
| P1 | Keep opacity and font size as labeled sliders. Put their label, current value, and track on one row each, or use a two-line layout only when text grows. Label the background and font triggers within the controls, rather than above them. | About 20–35px from the 159px quick block. | Maintain visible labels and readable values. Give each slider thumb an accessible name and formatted value. Keep the track easy to acquire with a pointer. |
| P1 | Move **Reset** into a compact secondary menu or a labeled action in the selected-media toolbar. Move “Rate extension” and “built with” to an About/help affordance rather than the permanent footer. | About 15–30px for the footer; Reset can also free quick-row width. | Reset must remain discoverable and retain its existing confirmation. About links must stay keyboard accessible. |
| P2 | For Advanced and Post FX, offer a compact quick-control summary or a user-controlled **Quick controls** disclosure. Preserve the current values in the summary; remember expansion while the panel stays open. | About 60–110px while collapsed. | Do not collapse controls during a drag or while one has focus. Do not hide the overlay on/off state. Default behavior needs a usability check. |
| P2 | Simplify each Post FX row to one disclosure target, one labeled enable target, and a reorder action. Keep a 30–36px row. | Little per row, but more list content fits in the same viewport. | Do not shrink the disclosure or reorder target just to save space. Provide a keyboard reorder path before removing the drag grip. |
| P3 | Reassess the nested Brightness/Contour tabs. A single converter selector with a separate, clear enable control may fit better; a disclosure layout may work if only one section opens at once. | About 25–40px when the nested tab bar is removed. | Preserve independent enablement of Brightness and Contour. Validate the chosen pattern with keyboard and screen reader users. |

### Suggested 300px selected-media layout

```text
Textmode Overlay                       [⋯] [Move] [Close]
Canvas · 320×180     [Replace] [Remove] [Overlay on]
Opacity                  100%  ━━━━━━━━━━━━━●
Font size                  8px  ━●━━━━━━━━━━━━
[Background · ■ #000000] [Font · Bescii ▾]
[Export] [Advanced] [Post FX]
┌─ one scrollable active-tab region ────────────────┐
│ controls, with its own visible scroll affordance   │
└─────────────────────────────────────────────────────┘
```

This is a content map, not a final pixel specification. The media toolbar can use two rows when the panel is narrower or text is enlarged. A single-line brand treatment could save a few more pixels, but brand legibility matters more than that small gain.

## Input and accessibility findings that affect density

| Current element | Finding and recommendation |
| --- | --- |
| Custom sliders | `SliderView` exposes a `role="slider"` thumb with min, max, and current numeric value, but it does not set `aria-label` or `aria-labelledby`. The visible text is in a wrapping `<label>` around a `div`/`span` widget, which does not reliably label a non-labelable element. Pass a stable label ID and formatted `aria-valuetext` from `RangeFieldView`. Keep Arrow and Home/End support; these are already implemented. See [`slider-view.ts`](../src/widgets/overlay-panel/components/slider-view.ts#L31) and [`range-field-view.ts`](../src/widgets/overlay-panel/settings/range-field-view.ts#L19). |
| Font search | The font popup search field has only the placeholder “search fonts...”; give it a visible or programmatic “Search fonts” label. The trigger should have an explicit “Font” accessible name and a popup relationship, while still announcing the selected font. See [`font-combobox-view.ts`](../src/widgets/overlay-panel/font-combobox/font-combobox-view.ts#L44). |
| Main tabs | `TabsView` sets `role="tab"` and `aria-selected`, but has no arrow-key tab navigation, roving `tabindex`, or explicit tab-to-panel association. Implement the APG tabs pattern if tabs remain. Do the same for the nested converter tabs. This matters more when the interface becomes denser because keyboard users need a predictable path. See [`tabs-view.ts`](../src/widgets/overlay-panel/components/tabs-view.ts#L15) and [`converter-tabs-view.ts`](../src/widgets/overlay-panel/components/converter-tabs-view.ts#L92). |
| Small targets | The 22px glyph-ramp buttons and 20px-wide Post FX disclosure column warrant a target-size check. The latter directly adjoins other interactive targets. Grow the hit area to at least 24 × 24 CSS px, or verify WCAG's spacing exception; aim for 28–32px for frequently used controls. See [`popup.css`](../src/widgets/overlay-panel/popup.css#L1040) and [`popup.css`](../src/widgets/overlay-panel/popup.css#L840). |
| Color modes | Character and cell color each use a full-width label above a two-option mode group plus color picker. A compact row can place the visible label at the left, then the mode and swatch, but only if mode text stays understandable and color has a visible cue. At 300px, test the long “characters” label and translated strings. See [`color-mode-field-view.ts`](../src/widgets/overlay-panel/settings/color-mode-field-view.ts#L22) and [`popup.css`](../src/widgets/overlay-panel/popup.css#L1216). |
| Popovers | Color and font popovers are portaled, so they do not add to panel height. Keep them as disclosures. Their position function clamps to the viewport, but the color picker has a fixed 122px color space and the font list has a 192px maximum; test the whole popover at short viewport heights so focus and inputs remain visible. See [`popover-position.ts`](../src/widgets/overlay-panel/components/popover-position.ts#L26), [`popup.css`](../src/widgets/overlay-panel/popup.css#L1380), and [`popup.css`](../src/widgets/overlay-panel/popup.css#L1684). |

### Design rules for the compact version

- Spend height on the active task before metadata or decorative framing. Keep the selected target and overlay state visible.
- Use one primary vertical scroll region. Keep nested scroll areas only where they solve a tested interaction problem; each nested viewport needs a nonzero height and a visible cue that it scrolls.
- Compress **structure** first: repeated rows, duplicated actions, and always-visible secondary content. Do not compress controls below usable target sizes or remove labels to meet a height number.
- Keep value and label adjacent. A slider with only a number or an icon-only color button saves space but increases interpretation work.
- Allow rows to wrap at narrow widths, longer translations, 200% text enlargement, and browser zoom. An adaptive two-row state is better than clipped actions.
- If a menu or disclosure replaces a persistent action, use a specific visible label and preserve Escape, focus return, and keyboard access.

## Implementation sequence and acceptance checks

1. **Repair the short-height layout.** Rework the panel/card/settings grid so active content never receives a 0px viewport. Consider moving the quick controls into the active scroll region at short heights or providing an explicit compact summary; do not apply `min-height` alone if it merely overflows the panel. Verify Export, Advanced, both converter choices, Post FX, and opened effect parameters at 800 × 500 and shorter supported viewports.
2. **Consolidate media controls and the quick block.** Prototype the proposed toolbar and row controls at the current 300px width. Measure the panel and tab viewport with a selected canvas and video, short/long element names, and an error message. Keep the no-media state clear.
3. **Set a smaller cap only after measurement.** Target 500–520px at 800 × 720 and at least 120–150px of tab content at 800 × 500. If both cannot be met with all quick controls expanded, use a visible disclosure or move controls into the scroll region. Do not claim the target is achieved by changing `max-height` alone.
4. **Complete keyboard and accessibility checks.** Tab through every control, use slider arrows and Home/End, open and close both popovers, change color mode, and reach Post FX parameters. Verify accessible names and value units, focus visibility, target size, and 320 CSS-pixel reflow. Repeat with longer text and increased text spacing.
5. **Validate the popup separately.** The popup shares the visual code but has a different host and browser-imposed window behavior. Measure its selected-media and short-window states before declaring the redesign complete.

## Research and accessibility constraints

- [WCAG 2.2: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) sets a 24 × 24 CSS-pixel minimum or a defined spacing exception. The visible icon can be smaller than its target.
- [WCAG 2.2: Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow) requires content to work at a width equivalent to 320 CSS pixels without losing function or requiring two-dimensional scrolling, except for content that needs it.
- [WCAG 2.2: Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) applies to the active control when persistent or opened UI covers content. A 0px scroll viewport also makes focus practically unusable.
- [WCAG: Labels or Instructions](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions) and [WAI: Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/) support visible labels associated with controls; accessible names alone do not make an unlabeled visual control easy to understand.
- [WAI-ARIA slider pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) calls for an accessible name and, where useful, `aria-valuetext` that conveys units. [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) defines tab keyboard movement and tab-panel relationships.
- [WCAG 2.2: Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing) requires that increased line, paragraph, letter, and word spacing not remove content or function. Height savings must survive user text overrides.

## Evidence limits

The 508px, 605px, 440px, and 0px figures are measured in Chromium using the current built extension and repository fixture. All proposed savings and target heights are hypotheses until implemented and remeasured. The report did not measure screen reader output, browser popup height, contrast ratios, or every locale. No source files or tests were changed.
