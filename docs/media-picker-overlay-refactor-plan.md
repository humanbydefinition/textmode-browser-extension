# Media picker overlay refactor

## Implemented direction

The picker uses one square-edged selection layer for both selectable media and inaccessible iframes.

- A compact strip at the top of the page reads: `Select a canvas or video · Esc to cancel`.
- Every visible eligible `canvas` and `video` receives a blue outlined marker as soon as selection starts.
- Cross-origin or opaque sandboxed iframes receive a red outlined marker.
- Blue diagonal stripes move forward across selectable media; red stripes move in reverse across unavailable iframes.
- There are no labels, icons, dimensions, or text inside individual markers.
- There are no Tab, Enter, or Space shortcuts. The picker remains pointer-driven and `Escape` cancels it.
- `prefers-reduced-motion` freezes the stripes, and forced-colors mode keeps an outline-only fallback.

## Technical shape

- [`src/features/media-picker/element-picker.ts`](../src/features/media-picker/element-picker.ts) owns the pick session, pointer hit testing, Escape cancellation, observer cleanup, and geometry scheduling.
- [`src/features/media-picker/picker-target-registry.ts`](../src/features/media-picker/picker-target-registry.ts) discovers visible media and classifies inaccessible frames as cross-origin, sandboxed, or unavailable.
- [`src/features/media-picker/picker-overlay-layer.ts`](../src/features/media-picker/picker-overlay-layer.ts) mounts a shadow-isolated fixed layer. Page styles cannot alter its markers.
- [`src/features/media-picker/picker-overlay.css`](../src/features/media-picker/picker-overlay.css) holds the square geometry, blue/red states, diagonal stripe animation, and motion/forced-colors fallbacks.
- Mutation, resize, iframe-load, scroll, resize, and visual-viewport changes keep markers aligned with dynamic pages. Geometry updates are batched to one animation frame.
- The in-page panel and popup show `selecting…` while a session is active, returning to Select/Replace media when it ends.

## Interaction guarantees

- Pointer selection still uses capture-phase handling, so an eligible media click selects it without leaking to the host page.
- Clicking an unavailable iframe keeps selection active and reports its reason through the existing error channel.
- The original cursor is restored when the session ends.
- The top-document selection button regains focus after `Escape` cancellation when it remains mounted.
- Dynamic iframe and media changes are represented during an active session.

## Verification

Unit coverage verifies persistent ready markers, blocked cross-origin and sandboxed states, dynamic iframe discovery, square corners, stripe/reduced-motion styles, unchanged Tab behavior, and Escape cleanup.

The Chromium extension test verifies the top strip, a visible square stripe marker, normal media selection, iframe selection, unavailable-frame behavior, and Escape cleanup.
