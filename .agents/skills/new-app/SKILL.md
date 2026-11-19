---
name: new-app
description: Scaffold, build, register, and verify a new Toybox app end-to-end.
---

# Creating a new Toybox app

Before starting, read [`AGENTS.md`](../../../AGENTS.md), [`common/API.md`](../../../common/API.md), and any plan file in `plans/`. Never write the child's name anywhere.

## Steps

1. **Scaffold the app folder**
   ```bash
   python3 tools/scaffold-app.py <folder> "<Name>"
   ```
   This creates `<folder>/index.html`, `<folder>/index.js`, `<folder>/manifest.webmanifest`, and an icon template (never add a per-app `sw.js`).

2. **Build the app**
   - Include `../common/toybox.css` and `../common/toybox.js` before app styles/scripts, and call `Toybox.init({ app: "<folder>", restArt, restLine, onEnding, ... })`.
   - Follow all hard invariants and product rules in `AGENTS.md`:
     - Offline-first (no CDN/runtime assets; draw on canvas/SVG; soft Web Audio via `Toybox.sound.ready()`).
     - Hands-on play: direct manipulation (`Toybox.press`), one press always enough, whole machine/scene on screen, calm pace, results stay on screen, Surprise = live moment on current scene, no fail states/scores, no decorative numbers/counters.
     - Reset play state on `Toybox.fresh()`; keep any collections across launches in a prefixed `localStorage` key wrapped in `try/catch`.
     - Add a top **"Sections"** index comment in `<folder>/index.js`.
   - Add a `?debug` test hook (`if (/[?&]debug\b/.test(location.search)) window.__toybox = { state, ... };`) so `tools/playtest.js` and `tools/shot.js` can inspect and drive the app.
   - If the app has special sound or orientation behavior, update `"Good to know"` (`uses-info`) in `common/toybox.js`.

3. **Render the app icons**
   - Draw a flat, full-bleed `#CDE9FF` icon SVG with chunky `#1D2340` outlines and one clear subject (keeping the subject in the central 80% for the maskable icon).
   ```bash
   node tools/render-icons.js <folder>/icons/icon.svg <folder> && rm <folder>/icons/icon.svg
   ```
   Generates `icon-180.png`, `icon-192.png`, `icon-512.png`, and `icon-maskable-512.png` (removing the source SVG keeps it out of the published offline cache).

4. **Register in launcher, `sw.js`, and `README.md`**
   ```bash
   python3 tools/add-app.py <folder> "<Name>" "<tile line>" "<README line>" [extra files...]
   node tools/sync-core.js --write
   ```
   Add a soft hyphen (`\u00AD`) in `index.html` if `<Name>` is one long word. Never bump `CACHE` in `sw.js`.

5. **Verify & visually inspect**
   ```bash
   node tools/verify.js --all-sizes <folder>/index.html index.html
   ```
   Open and visually inspect the generated screenshots across phone portrait, phone landscape, and iPad sizes. Drive core interactions with `node tools/shot.js <folder>/index.html --do ...` and `node tools/playtest.js <folder>/index.html` if applicable.

6. **Document**
   Add a short entry for `<folder>` in [`docs/app-catalog.md`](../../../docs/app-catalog.md).
