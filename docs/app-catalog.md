# Toybox app catalog & historical context

Per-app details, shelved apps, retired service worker stubs, and the reverted October redesign.
For multi-page deep dives, see [`farm/AGENTS.md`](../farm/AGENTS.md) and [`workshop/AGENTS.md`](../workshop/AGENTS.md).

---

## 1. Active apps

Order in `index.html` (`APPS` array) matters: **Workshop** and **Spin Shop** stay first.

### Multi-page apps
- **`workshop/`** (Workshop) — Tool Wall (`index.html`, `index.js`) + 9 stations + Birdhouse `project.html`. See [`workshop/AGENTS.md`](../workshop/AGENTS.md).
- **`farm/`** (shown as "Tractor Ted") — Farm map + 14 episode stations (`farm/farm.js`). See [`farm/AGENTS.md`](../farm/AGENTS.md).
- **`construction-site/`** (Construction Site) — Site map + `excavator`, `concrete` (uses `orientation: "portrait"`), `forklift`, `wrecking-ball`, `tower-crane`. Safety gear flag: `site-gear` (hard hat, safety vest, eye protection, ear protection). Note: the old Bulldozer station was deleted (didn't fit the other stations' look); planned stations live in `PLAN.md`.
- **`kitchen/`** (Kitchen) — Kitchen page with one getting-ready screen (`kitchen-ready`: Wash hands, Apron, Chef hat in any order; one tap plays a short wash — no full interactive hand-washing scene) + table + `blender`, `cutting-board`, `stand-mixer`, `stove`. Actions needing a stopped machine (pouring from Blender, lifting Stand Mixer head, changing beater, taking bowl) auto-switch it off and continue.

### Single-page apps (with notable specifics)
- **`spin-shop/`** (Spin Shop) — Spokes count allowed. Open question: whether the `"Zoom"` speed label reads like camera zoom.
- **`kaleidoscope/`** (Kaleido­scope; uses soft hyphen `\u00AD` in `APPS`) — `"How many"` count allowed.
- **`peg-drop/`** (`peg-drop/index.js`) — Per-bin counts and Total allowed.
- **`rocket-builder/`** (`rocket-builder/index.js`) — Uses long `endingMaxMs` (~36000 ms) for its goodbye launch animation.
- **`gear-box/`** (Gear Box) — Tooth counts on gears and picker tiles (explicitly requested by the dad).
- **`marble-run/`** (`marble-run/index.js`) — Counter `"Marbles"` (on-screen quantity). Keep lift-style choices.
- **`car-builder/`** (`car-builder/index.js`) — Split into `index.js`.
- **`math-grid/`** (Math Grid) — Times and plus tables; numbers allowed. Open questions: ~28 px squares on iPhone; `"1 to 10 / 1 to 12"` (no 0 row or column) resets on `Toybox.fresh()`.
- **`3d-printer/`** (`3d-printer/index.js`) — Modeled on the family's P1S + AMS 2 Pro (no logos). Shelf and spool colors kept across `Toybox.fresh()`. Grown-up settings: `printer-name`, `printer-clear`.
- **`water-works/`** (shown as "Water Table"; `water-works/index.js`) — Modeled on the family's water play table.
- **`train-builder/`** (`train-builder/index.js`) — Works both portrait and landscape; counter `"Cars"` (on-screen quantity). Tab changes must never re-layout the track.
- **`bubble-machine/`** (shown as "Bubbles"; `bubble-machine/index.js`) — Counter `"Bubbles"` kept for the fun of it.
- **`hamster/`** (Hamster; `hamster/index.js`) — Surprise somersault etc.
- **`garden/`** (Garden) — Permanent sun/worm faces are part of the characters (not sudden faces on objects).
- **`spinning-tops/`** (Spinning Tops)
- **`spirograph/`** (Spirograph)
- **`jigsaw/`** (Jigsaw; `jigsaw/index.js`) — Piece count & progress counter (`"Pieces: N of M"`); `"My puzzles"` collection kept across `Toybox.fresh()`.
- **`sand-table/`** (Sand Table)
- **`espresso-machine/`** (`espresso-machine/index.js`) — Coffee scale shows real family targets (18.0 g of beans; ~36 g in ~28 s). Bear latte art face is permanent/allowed.
- **`sewing-machine/`** (`sewing-machine/index.js`) — Modeled on the family's white computerized sewing machine (no logos).
- **`garbage-truck/`** (`garbage-truck/index.js`) — Automated side loader on a street of bins, hands-on like the Farm stations.
- **`glow-board/`** (`glow-board/index.js`) — Board of round light-up buttons modeled on his light-up touch-button toy (no logos): `Draw | Fill | Light show`. Colors and light shows sit in a tray of drawn buttons on the stage next to the board so the panel holds only New and Surprise. Grid size is `8 x 8` on phones, `16 x 16` on tablets (chosen once from screen short side).
- **`forge/`** (`forge/index.js`, plan `plans/forge.md`) — Blacksmith's corner: blower, steel bar that moves only where hammered and only while hot, vise twisting wrench, quench tub. Makes the dad's real copper coffee spoon (saved project), an S-hook, a fire poker, or a free bar; finished pieces hang on a rack. Safety gear flag: `forge-gear` (Eye protection, Ear protection, Leather apron, Gloves).
- **`circuits/`** (`circuits/index.js`, plan `plans/circuits.md`) — Snap parts on a pegboard with a small circuit solver, or wire a house at night (`Board | House`).
- **`sweet-shop/`** (`sweet-shop/index.js`, plan `plans/sweet-shop.md`) — Sweet shop counter (gummies for now; donuts/cookies may come later as jobs): pour flavor, tip in gelatin & sugar, turn hot plate knob, stir until clear, fill a `Bears | Worms | Fruits` silicone mold with candy dropper, chill in fridge, pop out, coat `Sour sugar | Sugar | Shiny`, put in candy jar. Hands-on like Farm stations: dragging does the real motion while held (pour, tip, turn, stir, fill) and a tap plays that part once. Every gummy jiggles; jar collection persists in `sweet-shop-v1`.
- **`drawing/`** (`drawing/index.js`, data in `pages.js`, `glyphs.js`, `words.js` generated from `plans/drawing-word*.txt`; plan `plans/drawing.md`; previews `tools/drawing-pages-preview.html`, `tools/drawing-glyphs-preview.html`) — `Color | Draw | Write`: coloring book, free drawing, and guided letter, number, and word tracing. The page fills the stage; everything else lives in a pull-out drawer on its edge (right in landscape, bottom when upright); no shelf.
- **`ice-cream/`** (shown as "Ice Cream Shop"; `ice-cream/index.js`, plan `plans/ice-cream.md`) — Customers (mostly people, sometimes an animal) arrive one at a time with an order in a speech bubble (picture + words): cone/cup, sundae, or milkshake; every few customers one says `"Anything you like, please!"`. One shop, no job tabs (dad, 2026-11-17): all four starts (cones, cups, sundae dishes, steel milkshake cups) stay in fixed counter spots; six tubs; milkshakes get milk, spindle mixer, poured into glass; toppings are whipped cream, chocolate sauce, sprinkles, cherry. Matching parts get green ticks; anything different is never wrong. Optional freezer-bowl ice cream maker on the counter zooms in on tap (title `"Ice Cream Shop · Ice Cream Maker"`, header Back button): frozen bowl out of freezer, switch on, milk/cream/sugar/flavor, churn, spoon into tub, carry tub back to shop where it sits heaped up and customers ask for it. Each step's instruction pops up only until done twice (`known` in `ice-cream-v1`, kept across visits), then the ring alone guides it. Layout computed from stage aspect so the scene fills every screen. No paying, no counters; New restarts current item.

### Pages already split into external `.js` (with top "Sections" index)
Saw Bench (`workshop/saw-bench.js`), Tool Wall (`workshop/index.js`), Hammer & Screws (`workshop/hammer-screws.js`), Measuring (`workshop/measuring.js`), Drill Press (`workshop/drill-press.js`), Car Builder, Marble Run, Rocket Builder, Train Builder, 3D Printer, Espresso Machine, Peg Drop, Bubbles (`bubble-machine/index.js`), Water Table (`water-works/index.js`), Hamster (`hamster/index.js`), Jigsaw (`jigsaw/index.js`), Stove (`kitchen/stove.js`), Forklift (`construction-site/forklift.js`), Timberrrrr! (`farm/woods.js`), Combine Time (`farm/combine.js`), Brilliant Baler (`farm/bales.js`), Hello Ewe! (`farm/ewe.js`), Mighty Mushrooms (`farm/mushrooms.js`), Sewing Machine, Garbage Truck, Glow Board, Forge, Circuits, Sweet Shop, Drawing, Ice Cream Shop. Keep each file's top "Sections" list current when adding or renaming sections.

---

## 2. Archived & deleted apps

- **`archive/`** holds apps the dad shelved (`archive/fish-tank/`, `archive/color-mixing/`):
  - Not in the launcher (`index.html`), not in `sw.js` `CORE`, not published by `.github/workflows/pages.yml`.
  - Paths are adjusted (`../../common/`, Home links to `../../`). **Do not delete them.**
  - **To restore an archived app:** move the folder back to repo root, restore `../common/` and `../` Home paths, add it with `python3 tools/add-app.py`, and run `node tools/sync-core.js --write` and `node tools/check-site.js`.
- **Deleted (do not rebuild unasked):** Engine Room (the dad didn't like it) and Construction Site's Bulldozer (didn't fit the other stations' look).

---

## 3. Retired per-app `sw.js` stubs (why they exist)

Older app folders still contain a tiny `<folder>/sw.js` file. **Keep these stubs; never add a `sw.js` to a new app.**

- **History:** Each app used to register its own service worker. Inside its folder, that narrower worker beat the launcher's worker and kept serving stale cached versions until an app was opened twice.
- **Current setup:** One top-level `sw.js` covers the entire Toybox root (`common/toybox.js` registers it and unregisters any narrower worker). Each legacy `<folder>/sw.js` is now a **retire stub** (identical except `PREFIX`): it deletes old `"<folder>-"` caches, reloads the open page once, serves network-first until the Toybox-wide worker (`toybox-v<digits>`, v119+) takes over, then unregisters itself.

---

## 4. The reverted October 2026 redesign (`tb-v2`)

- **What happened (2026-10-10):** An earlier redesign (`plans/redesign.md` §§1–2) standardized panels around a single green Go button, step rows, and trimmed choice tiles. The dad reverted it (`"Revert"`) because it removed choices the child liked (e.g., Marble Run's lift style) and turned hands-on play into tapping a green button repeatedly.
- **Current status:**
  - Every pre-existing app except the Farm was reverted to its hands-on version (keeping only the cleaner shared chrome from `common/toybox.css`). `plans/restore.md` documents what had been removed.
  - **Do not migrate an app to `tb-v2` Go/step-row chrome without the dad asking.**
  - The shared components (`Toybox.go`, `steps`, `jobs`, `tiles`, `bar`, `gate`, `map`, `done`, previewed in `tools/shell-demo.html?view=steps|tiles|gate|map`; pilot `construction-site/concrete.html`) remain in `common/toybox.js` and `common/toybox.css` (activated on `<div class="tb-app-shell tb-v2">`). Newer hands-on apps (like the rebuilt Farm stations, Glow Board, Sweet Shop, Garbage Truck) use `tb-v2` with `tb-panel-bar` (New + Surprise only) and direct on-scene play (`Toybox.press`, `Toybox.coach`, `Toybox.ghost`, `Toybox.nametag`, `Toybox.done`) rather than Go/step rows.
