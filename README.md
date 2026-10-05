# Toybox

A collection of small kids' apps that work offline. Each app is a self-contained Progressive Web App (PWA) in its own folder. There is no build step.

| App | Folder |
| --- | --- |
| Spin Shop: build a wheel, fan, flower or pinwheel and spin it | [`spin-shop/`](spin-shop/) |

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
4. Add the app to `APPS` in the top-level `index.html`.
5. Add the app's files to `CORE` in the top-level `sw.js` and bump its `CACHE`.

## Updating an app

After changing any file, bump `CACHE` in that app's `sw.js` and in the top-level `sw.js`, so devices drop their old cached copies.

## Publishing

GitHub Pages: Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`.
