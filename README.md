# Textmode Overlay ⊂(◉‿◉)つ

<div align="center">

<table>
  <tr>
    <td><img src=".github/media/preview1.png" alt="Preview 1" /></td>
    <td><img src=".github/media/preview2.png" alt="Preview 2" /></td>
    <td><img src=".github/media/preview3.png" alt="Preview 3" /></td>
  </tr>
</table>

<p align="center">
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" /></a><!--
  --><a href="https://wxt.dev/"><img alt="WXT" src="https://img.shields.io/badge/WXT-000000?logo=webcomponents.org&logoColor=white" /></a><!--
  --><a href="https://vite.dev/"><img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white" /></a><!--
  --><a href="https://react.dev/"><img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" /></a>
  &nbsp;&nbsp;
  <img alt="Chrome MV3" src="https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white" /><!--
  --><img alt="Edge MV3" src="https://img.shields.io/badge/Edge-MV3-0078D7?logo=microsoftedge&logoColor=white" /><!--
  --><img alt="Firefox MV2" src="https://img.shields.io/badge/Firefox-MV2-FF7139?logo=firefoxbrowser&logoColor=white" /><!--
  --><img alt="Safari MV2" src="https://img.shields.io/badge/Safari-MV2-006CFF?logo=safari&logoColor=white" />
  &nbsp;&nbsp;
  <a href="https://ko-fi.com/V7V8JG2FY"><img alt="Ko-fi" src="https://shields.io/badge/ko--fi-donate-ff5f5f?logo=ko-fi" /></a><!--
  --><a href="https://github.com/sponsors/humanbydefinition"><img alt="GitHub Sponsors" src="https://img.shields.io/badge/sponsor-30363D?logo=GitHub-Sponsors&logoColor=%23EA4AAA" /></a>
</p>

</div>

`Textmode Overlay` is a free and open-source browser extension utilizing [textmode.js](https://github.com/humanbydefinition/textmode.js) to render live ASCII/textmode overlays on visible `<canvas>` and `<video>` elements. It provides an in-page control panel for adjusting overlay settings and exporting the result as TXT, SVG, PNG, or JPG.

## Features

- Live textmode overlays on visible `<canvas>` and `<video>` elements.
- In-page control panel for adjusting overlay settings.
- Export overlays as TXT, SVG, PNG, or JPG.

## Browser Support

| Browser                                               | Build Command           | Output                | Availability                                                                       |
| ----------------------------------------------------- | ----------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| [Chrome](https://www.google.com/chrome/)              | `npm run build:chrome`  | `.output/chrome-mv3`  | Pending review                                                                     |
| [Edge](https://www.microsoft.com/en-us/edge)          | `npm run build:edge`    | `.output/edge-mv3`    | Pending review                                                                     |
| [Opera](https://www.opera.com/download)               | `npm run build:chrome`  | `.output/chrome-mv3`  | Pending review                                                                     |
| [Firefox](https://www.mozilla.org/en-US/firefox/new/) | `npm run build:firefox` | `.output/firefox-mv2` | [Pending review](https://addons.mozilla.org/en-US/firefox/addon/textmode-overlay/) |
| [Safari](https://www.apple.com/safari/)               | `npm run build:safari`  | `.output/safari-mv2`  | Not planned                                                                        |

## Quick Start

Requirements:

- [Node.js](https://nodejs.org/en/download) 20.8.1 or newer
- npm
- [Chrome](https://www.google.com/chrome/) or another [Chromium](https://www.chromium.org/getting-involved/download-chromium/) browser for local MV3 testing

Install dependencies:

```sh
npm install
```

Run the full verification pipeline:

```sh
npm run check
```

Build the unpacked Chrome extension:

```sh
npm run build:chrome
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select `.output/chrome-mv3`.

## Usage

1. Open a [page](https://www.youtube.com/watch?v=dQw4w9WgXcQ) with a visible canvas or video element.
2. Click the textmode overlay extension action.
3. Click **select media**.
4. Click the target media element on the page.
5. Adjust the overlay from the in-page panel.
6. Export the result when you want a static artifact.

Some media cannot be sampled. Cross-origin, tainted, DRM-protected, or otherwise restricted media may fail
when the browser blocks WebGL or canvas pixel access. The extension should report those failures without
breaking the page.

## Development

Development workflow, testing, architecture, and contribution guidelines live in
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

`Textmode Overlay` is licensed under the [MIT License](LICENSE).
