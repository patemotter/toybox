# Toybox

A collection of small kids' apps that work offline. Each app is a self-contained Progressive Web App (PWA) in its own folder. There is no build step.

| App | Folder |
| --- | --- |
| Spin Shop: build a wheel, fan, flower or pinwheel and spin it | [`spin-shop/`](spin-shop/) |
| Kaleidoscope: finger painting mirrored into a big spinning pattern | [`kaleidoscope/`](kaleidoscope/) |
| Peg Drop: drop balls through glowing pegs and count them in the bins | [`peg-drop/`](peg-drop/) |
| Rocket Builder: build a rocket and fly it to the Moon, to Mars or past every planet | [`rocket-builder/`](rocket-builder/) |
| Workshop: safety gear, a Tool Wall of 81 tools, and eight stations: Drill Press, Saw Bench, Hammer & Screws, Lathe, Router Table, Wrenches & Sockets, Measuring and Shadow Board | [`workshop/`](workshop/) |
| Gear Box: build gear trains on a pegboard and turn them with a crank or a motor | [`gear-box/`](gear-box/) |
| Marble Run: marble runs with wheels, funnels and a conveyor or spiral lift that loops them | [`marble-run/`](marble-run/) |
| Car Builder: build construction vehicles, fast cars and monster trucks, then drive them | [`car-builder/`](car-builder/) |
| Math Grid: a big times and plus table to tap, drag and build blocks on | [`math-grid/`](math-grid/) |
| 3D Printer: pick spool colors, print a Benchy layer by layer, and fill your shelf | [`3d-printer/`](3d-printer/) |
| Water Table: pour into funnels, turn valves and spin water wheels | [`water-works/`](water-works/) |
| Construction Site: gear up, then excavator, concrete road and wrecking ball stations | [`construction-site/`](construction-site/) |
| Train Builder: couple engines and cars, paint them, then run the train through a tunnel, a crossing and a station | [`train-builder/`](train-builder/) |
| Bubbles: a bubble machine with a switch and speed dial, a wand to blow your own bubbles, and a Bubbles counter that keeps counting | [`bubble-machine/`](bubble-machine/) |
| Hamster: a happy pet hamster: tap the wheel, food, water or bed and it goes there; fill the bowl and the bottle; give treats | [`hamster/`](hamster/) |
| Garden: plant seeds, water them, tap the sun to grow them, pick the vegetables; bees, butterflies and a worm visit | [`garden/`](garden/) |
| Spinning Tops: pull the ripcord to launch tops into a bowl; they spin, wobble, bump and fall; flick them around | [`spinning-tops/`](spinning-tops/) |
| Kitchen: get ready (wash hands, apron, chef hat), then the blender, cutting board, stand mixer and stove; finished food goes on the table | [`kitchen/`](kitchen/) |
| Spirograph: roll the gear around the ring with any finger movement and draw perfect patterns; Draw! draws by itself; My drawings shelf | [`spirograph/`](spirograph/) |
| Jigsaw: real jigsaw puzzles with knobbed pieces, 9 pictures from 4 to 24 pieces; finished pictures come alive and go on My puzzles shelf | [`jigsaw/`](jigsaw/) |
| Sand Table: a kinetic sand table: drag the ball to carve lines, or tap Draw! and watch it draw spirals, flowers, stars and hearts; Smooth sweeps it flat | [`sand-table/`](sand-table/) |
| Espresso Machine: the family's real espresso routine: warm up, weigh 18 grams, grind, whisk, tamp, pull the shot on the scale, steam the milk and pour; lattes, cappuccinos and steamers | [`espresso-machine/`](espresso-machine/) |
| Farm: a farm through the year: drive the green tractor in Plowing (plow, harrow, seed drill, fertilizer spreader, sprayer) until the wheat turns golden; the farm map shows the field as it is | [`farm/`](farm/) |

Archived (kept in [`archive/`](archive/), no tile on the home screen, not saved for offline): [`fish-tank/`](archive/fish-tank/), [`color-mixing/`](archive/color-mixing/).

The top-level `index.html` is a launcher with a big button for each app.

**Working on it (people or agents):** read [`AGENTS.md`](AGENTS.md) first: who it's for, the design rules, the architecture, testing and deploy. [`PLAN.md`](PLAN.md) has the backlog and plans for new apps.

## Use it offline

1. Open the site on the tablet or phone while online: `https://patemotter.com/toybox/`.
2. Add it to the home screen (iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app).
3. Open it once from the home screen and wait a few seconds. The Toybox's one service worker caches the launcher and every app, so after that everything runs with no network. Opened online, every app always loads its newest version.

You can also install a single app on its own by opening its folder (for example `.../toybox/spin-shop/`) and adding that to the home screen.

## Adding an app

1. Put the app in its own folder with its own `index.html`, `manifest.webmanifest` and `icons/`. No `sw.js`: the whole Toybox shares the top-level service worker, which `common/toybox.js` registers. (The `sw.js` files in older app folders are stubs that retire the per-app workers earlier versions installed; keep them.)
2. Give the app a Home button that links to `../` so there is a way back to the launcher (see the `homebtn` in `spin-shop/index.html`).
3. Use the shared grown-up layer in `common/`: one play timer, one sound setting and the "Big" button for the whole Toybox. Add these two lines to the app's `<head>`, before its own style and script, then call `Toybox.init({...})` once the app is set up (the top of `common/toybox.js` explains the options and hooks; `peg-drop/` is a good example):
   ```html
   <link rel="stylesheet" href="../common/toybox.css">
   <script src="../common/toybox.js"></script>
   ```
4. Add the app to `APPS` in the top-level `index.html`.
5. Add the app's files to `CORE` in the top-level `sw.js` (`tools/add-app.py` does 4 and 5).

## Updating an app

There is no cache version to bump: the deploy stamps `CACHE` in `sw.js` with a number that goes up with every commit
that changes a published file, so devices download a fresh offline copy. (Opened online, pages are fetched from the
network first anyway.) The deploy also checks the site first, and publishes nothing if a check fails: see Deploy in
`AGENTS.md`.

## Publishing

GitHub Pages: Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`.
