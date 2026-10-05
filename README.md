# Toybox

A collection of small kids' apps that work offline. Each app is a self-contained Progressive Web App (PWA) in its own folder. There is no build step.

| App | Folder |
| --- | --- |
| Spin Shop: build a wheel, fan, flower or pinwheel and spin it | [`spin-shop/`](spin-shop/) |
| Kaleidoscope: finger painting mirrored into a big spinning pattern | [`kaleidoscope/`](kaleidoscope/) |
| Fish Tank: feed fish, make them flip, and fill the tank | [`fish-tank/`](fish-tank/) |
| Peg Drop: drop balls through glowing pegs and count them in the bins | [`peg-drop/`](peg-drop/) |
| Rocket Builder: build a rocket, count down, and launch it into space | [`rocket-builder/`](rocket-builder/) |
| Color Mixing: pour paints, stir with a finger, and name the new color | [`color-mixing/`](color-mixing/) |
| Workshop: safety gear, a Tool Wall of 81 tools, and Drill Press, Saw Bench and Hammer & Screws stations | [`workshop/`](workshop/) |
| Gear Box: build gear trains and crank them, with speeds, ratios and turns | [`gear-box/`](gear-box/) |
| Marble Run: five marble runs with a plunger, a Drop button and a lift that loops them | [`marble-run/`](marble-run/) |
| Car Builder: build construction vehicles, fast cars and monster trucks, then drive them | [`car-builder/`](car-builder/) |
| Math Grid: a big times and plus table to tap, drag and build blocks on | [`math-grid/`](math-grid/) |

The top-level `index.html` is a launcher with a big button for each app.

## Use it offline

1. Open the site on the tablet or phone while online: `https://patemotter.github.io/toybox/`.
2. Add it to the home screen (iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app).
3. Open it once from the home screen and wait a few seconds. The launcher's service worker caches the launcher and every app, so after that everything runs with no network.

You can also install a single app on its own by opening its folder (for example `.../toybox/spin-shop/`) and adding that to the home screen.

## Adding an app

1. Put the app in its own folder with its own `index.html`, `manifest.webmanifest`, `sw.js` and `icons/`.
2. In the app's `sw.js`, give `CACHE` a name with an app-specific prefix (for example `my-app-v1`) and only delete caches with that prefix in `activate`. All apps share one origin, so they share cache storage.
3. Give the app a Home button that links to `../` so there is a way back to the launcher (see the `homebtn` in `spin-shop/index.html`).
4. Use the shared grown-up layer in `common/`: one play timer, one sound setting and the "Big" button for the whole Toybox. Add these two lines to the app's `<head>`, before its own style and script, then call `Toybox.init({...})` once the app is set up (the top of `common/toybox.js` explains the options and hooks; `fish-tank/` is the example):
   ```html
   <link rel="stylesheet" href="../common/toybox.css">
   <script src="../common/toybox.js"></script>
   ```
   Also list `../common/toybox.css` and `../common/toybox.js` in the app's own `sw.js` `CORE`.
5. Add the app to `APPS` in the top-level `index.html`.
6. Add the app's files to `CORE` in the top-level `sw.js` and bump its `CACHE`.

## Updating an app

After changing any file, bump `CACHE` in that app's `sw.js` and in the top-level `sw.js`, so devices drop their old cached copies. After changing a file in `common/`, also bump `CACHE` in every app that uses it.

## Publishing

GitHub Pages: Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`.
