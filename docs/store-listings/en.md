```text
Make the moving web look like text.

[Textmode Overlay] is a real-time ASCII art generator and video-to-text effect for your browser. Select a compatible video or canvas, then watch it become a live, perfectly aligned grid of characters. Mix brightness shading with contour lines, choose your colors and font, stack visual effects, and export the frame when the composition feels right.

The source media stays in place underneath, so you can blend, pause, reset, replace, or remove the effect whenever you want.

Built with textmode.js.


─── TRY IT ON

Use [Textmode Overlay] wherever the page exposes a compatible canvas or HTML5 video:

  ▸ turn YouTube playback into live ASCII video art
  ▸ reinterpret Twitch streams and VODs in textmode
  ▸ stylize Vimeo videos and other web video players
  ▸ transform browser games, demos, and WebGL canvases
  ▸ add a text-art look to music and audio visualizers
  ▸ explore p5.js, Three.js, generative art, and creative coding sketches
  ▸ test canvas or video elements in your own websites

Some protected, cross-origin, or sandboxed media may be unavailable. [Textmode Overlay] marks inaccessible frames and reports sampling errors without interrupting the page.


─── CREATE AN OVERLAY

Open a page containing a visible canvas or video.

Toolbar:
  1  Click the [Textmode Overlay] toolbar icon
  2  Choose "select media"
  3  Preview available targets
  4  Click a target

Context menu:
  1  Right-click anywhere on the page, or directly on a video
  2  Choose "Open Textmode Overlay"
  3  In the overlay panel, choose "select media"
  4  Click a highlighted canvas or video

Press Esc whenever you want to cancel media selection.


─── DRAW WITH LIGHT, EDGES, OR BOTH

The brightness and contour passes can be enabled independently, giving you three ways to shape the result:

  ▸ brightness only
    ▹ translate light values through a custom glyph ramp

  ▸ contour only
    ▹ draw detected edges as graphic lines of characters

  ▸ combined
    ▹ layer contours over brightness-based ASCII shading

Fine-tune contour threshold and color sensitivity, invert either pass, and choose sampled or fixed colors for its characters and cells.


─── MAKE THE STYLE YOURS

  ▸ blend the result with an opacity control
  ▸ set the character size from dense detail to chunky pixels
  ▸ choose and edit the glyph ramp used for shading
  ▸ cycle through bundled textmode fonts
  ▸ upload supported TTF or OTF fonts from your computer
  ▸ sample source colors or select fixed character, cell, and background colors with alpha transparency
  ▸ drag the panel away from the part of the page you want to see
  ▸ reset an experiment and start again without reselecting the media


─── BUILD A LIVE EFFECT STACK

Choose from 16 post-processing filters, including CRT, scanlines, bloom, film grain, pixelate, chromatic aberration, posterize, threshold, vignette, grayscale, sepia, hue, contrast, and saturation controls.

Every effect can be toggled, reordered, expanded, and adjusted while the source continues playing. Changing the stack order can produce a completely different result.


─── SAVE A FRAME

  ▸ TXT
    ▹ copy the artwork as a plain character grid

  ▸ SVG
    ▹ keep the textmode result sharp at any scale

  ▸ PNG
    ▹ export a lossless image

  ▸ JPG
    ▹ export a compact raster image


─── REMEMBERS YOUR WORKFLOW

Your most recent overlay preset is remembered separately for each domain. The panel position is remembered too, and custom fonts persist locally in browser-managed extension storage until you remove them.


─── PRIVATE BY DEFAULT

There is no account, cloud renderer, tracking, advertising, or remote media processing. The extension creates overlays only when requested, and keeps conversion, settings, fonts, and exports inside your browser.

Permissions used:
  ▸ activeTab
    ▹ access the page only after you invoke the extension

  ▸ scripting
    ▹ start the in-page overlay tools

  ▸ storage
    ▹ retain local settings and custom font metadata

  ▸ unlimitedStorage
    ▹ retain supported custom font files locally

  ▸ contextMenus
    ▹ add the “Open Textmode Overlay” right-click action


─── COMPATIBILITY

Same-origin, nested, srcdoc, and dynamically added iframes are supported. Media inside cross-origin or opaque sandboxed iframes cannot be targeted. Tainted canvases, DRM video, and other protected sources may also block pixel sampling under normal browser security rules.
```
