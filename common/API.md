# Toybox shared API reference

Compact reference for `common/toybox.js` (`window.Toybox`), `common/toybox.css`, `farm/farm.js` (`window.Farm`), and `workshop/projects.js` (`window.ToyboxProjects`). Read header comments in those files for full prose details.

---

## 1. `window.Toybox` (`common/toybox.js`)

Load before app styles and scripts:
```html
<link rel="stylesheet" href="../common/toybox.css">
<script src="../common/toybox.js"></script>
```
Do not add Grown-ups sheet, toast, farewell, or rest markup in HTML — `Toybox.init` builds them.

### Init, timer & settings
- **`Toybox.init(opts)`** — call once the scene is ready:
  - Identity: `app` (folder name), `home: true` (launcher only), `grownButton` (launcher only; hidden in apps), `grownLabel: [idle, active]`, `badge` (`<svg class="tbadge" viewBox="0 0 60 60" hidden>`), `sections: [el]`, `legacy: { timer }`.
  - Rest & farewell copy: `timerIntro`, `goodbyeOption`, `farewellText`, `goodbyeLabel`, `farewellDone`, `restLine`, `restLine2`, `restArt: () => svgHtml`.
  - Orientation: `orientation: "landscape" | "portrait"` (only when truly needed; dismissible card; tests skip via `sessionStorage["toybox-turn-ok:<app>"]="1"`).
  - Hooks (all optional): `onEnding(done, info)` (`info.goodbye`, `endingMaxMs` default `15000`), `onGoodbye()`, `onRest()`, `onWake()`, `onOpen()`, `onTimer({ phase, remainingMs, fraction, minutes, showMinutes })`, `onTurn(shown)`.
  - Legacy no-ops (don't add): `big`, `onBig`, `Toybox.setBig()`, `Toybox.isBig()`.
- **`Toybox.fresh()`** — `true` on first load of a page under a new launcher tap (`toybox-launch` vs `toybox-seen:<path>`). Safe to call before `init()`. Reset play state/counters; keep collections & grown-up settings. The launcher skips the new launch id on the first tile tap after the Grown-ups sheet was opened, so returning to the app just left is not fresh.
- **`Toybox.place`** — `.set(v)`, `.clear()`, `.get()`: the sub screen he is on inside this page (e.g. `"drive"`, `"tool:ryoba"`), kept in `sessionStorage` (`toybox-place:<path>`); `get()` is `null` on a fresh visit. Set it when a sub screen opens, clear it when it closes, and reopen it after `init()` when `get()` returns it (and the timer is not locked). Every app page also records `toybox-last-page` so the launcher can reopen the exact page after the Grown-ups sheet.
- **`Toybox.timer`**:
  - `.phase()` → `"idle" | "running" | "ending" | "resting"`
  - `.locked()` → `true` while ending or resting (ignore play input)
  - `.remainingMs()` → remaining ms while running, else `0`
- **No `Toybox.sound`:** the Toybox makes no sound (removed 2026-11-26).
- **`Toybox.settings`**:
  - `.get(id)`, `.set(id, v)`, `.onChange(fn(id, v))`, `.action(id, fn)` (runs once per home-screen press), `.list()`.
  - Current `SETTINGS` IDs: `uses-info`, `kind-words`, `printer-name`, `printer-clear`.
- **`Toybox.offFirst({ running: () => bool, off: (done) => void })`** — registers a powered machine so leaving via links or **`Toybox.beforeLeave(fn)`** switches it off quietly and navigates immediately. Add `data-tb-noguard` to exempt a link.
- **`Toybox.makeHold(btn, ms, onDone, onPress)`** — press-and-hold confirmation (swallows trailing click).
- **`Toybox.toast(msg)`** — shared toast banner (~3 s+).
- **`Toybox.kind(type?)`** — occasionally shows a Kind Words card on completion (`type: "love"` requests `"Dad loves you!"`).
- **`Toybox.turning()`** — `true` while the turn-the-device overlay is shown.
- **`Toybox.openSheet()` / `closeSheet()` / `sheetOpen()`** — Grown-ups sheet controls (launcher).

### Shared UI & interaction components
All components respect `Toybox.timer.locked()` and include palm guarding.
- **`Toybox.coach(el)`** — manages `.tb-coach`:
  - `.step(text)` (sticky step line), `.say(text, sec)` (passing line >= 3 s), `.clear()`, `.busy()`, `.avoid(x, y)` (keeps centered pill clear of viewport `(x, y)`), `.text()`.
  - Auto-marks `is-do` (verb-first per `DO_WORDS`, centered, fades to `is-seen` after touch >= 2 s or 8 s, returns on ghost) vs `is-info` (quiet bottom pill). Override with `data-coach="do"|"info"`.
- **`Toybox.ghost({ plan, max: 3, idleMs: 4500, ok, onShow })`** — idle ghost hand.
  - `plan()` returns `null` or `{ pts: [[x, y], ...], tap|hold, carry: { html, size }, dur, key }`.
  - API: `.learned(key?)`, `.again(key)`, `.shown(key)`, `.poke()`, `.stop()`, `.show()`.
- **`Toybox.press(target, opts)`** — unified tap-or-drag on drawn parts (multi-touch, palm-filtered, `--tb-key` min hit radius).
  - Options: `hit(x, y)`, `parts() -> [{ id, x, y, r }]` (viewport px), `any`, `down`, `dragStart`, `move`, `up`, `tap(part, x, y, e)`, `slop: 12`, `tapMs: 350`, `minHit`.
  - State `s = { part, x0, y0, x, y, dx, dy, ms, drag, tap }`. Returns `{ active(), cancel() }`.
- **`Toybox.palmGuard(el)` / `Toybox.isPalm(e)`** — ignores bottom-edge, resting-second-finger, or oversized palm touches.
- **`Toybox.nametag(text, x, y, ms)`** — pops a brief plain part label above viewport `(x, y)` (~2 s).
- **`Toybox.gate({ flag, title, viewBox, worker, items, extra, hint, ms, done })`** — gear-up / getting-ready overlay (one tap dresses all; drag puts on one; records 10-min `flag`). Returns `{ el, dressAll(), isOn(id), hide() }`.
- **`Toybox.done({ line, again, delay: 1500, backLabel, stage })` / `Toybox.doneHide()`** — station-finished card with Again + Back-to-map buttons.
- **`Toybox.jobs(el, { jobs: [{ id, name, pic }], value, onPick })`** — 2–4 folder tabs under stage (`tb-stagecol`). Returns `{ set(id), value() }`.
- **`Toybox.bar(el, { shelf, onNew, onSurprise })`** — bottom bar (Shelf, New, Surprise). Returns `{ shelfOpen(on), newBtn, surprise, shelf }`.
- **`Toybox.tiles(el, { items, value, kind: "pick"|"action"|"swatch", rows: 1|2, onPick })`** — picture + word tiles (max 8). Returns `{ set, items, flash, value, button }`.
- **`Toybox.go(el, { label, icon, onPress, onIdle, onBusy })`** — green Go pill (`tb-v2`). Returns `{ set, label, pulse, busy, isBusy, wiggle, el }`.
- **`Toybox.steps(el, { steps, coach, ghost, onGo, onAgain, onBusy, onIdle, onChip })`** — step row (legacy `tb-v2`).
- **`Toybox.map({ stage, places: [{ href, name, pic, rect }], onPress })`** — station map hit areas. Returns `{ layout(), places }`.
- **`Toybox.wiggle(el)`**, **`Toybox.icon(name)`** (`back|home|big|new|surprise|shelf|close`), **`Toybox.pics`** (`{ play, again }`).

### Storage keys & CSS conventions (`common/toybox.css`)
- **`localStorage`:** `toybox-code-v1` (grown-ups code: the Grown-ups button's 2 s hold and the rest screen's 4 s unlock then ask for it on a shuffled keypad; 3 wrong tries pause it 30 s), `toybox-timer-v1`, `toybox-settings-v1`, `toybox-settings-done-v1`, `toybox-kind-v1`, `toybox-gear-v1`, `toybox-favorites-v1` (launcher).
- **`sessionStorage`:** `toybox-launch`, `toybox-seen:<path>`, `toybox-turn-ok:<app>`, gear flags (`workshop-gear`, `site-gear`, `kitchen-ready`, `forge-gear`).
- **Tokens:** `--tb-ink` (`#1D2340`), `--tb-bg` (`#CDE9FF`), `--tb-surface`, `--tb-go`, `--tb-pick`, `--tb-new`, `--tb-shelf`, `--tb-job`, `--tb-off`, `--tb-outline` (`2px`), `--tb-frame` (`3px`), `--tb-key`, `--tb-s1..s6`, `--tb-fs-*`.
- **Classes:** `.tb-app-shell` (+ `.tb-v2`), `.tb-head`, `.tb-title` (`<span class="tb-app">App · </span><span class="tb-station">Station</span>`), `.tb-stage`, `.tb-panel` (+ `.tb-panel-bar` for New/Surprise-only landscape rail), `.tb-coach` (`is-do`, `is-info`, `is-seen`), `.tb-counter`, `.btn` (`[aria-pressed="true"]`), `.tbadge`, `body.ending` / `.resting` / `.turn`.

---

## 2. `window.Farm` (`farm/farm.js`)

Load after `../common/toybox.js`. Plain ES5; draws in metres (`y` up is negative, facing `+x`).

- **`Farm.NAMES`** — `{ spuds, combine, bales, silage, carrots, muck, woods, berries, cows, sheep, hens, tracks, ewe, mushrooms }` → display names.
- **`Farm.tom`** — `{ top, dark, collar, short }` for Farmer Tom's episode clothes (auto-selected by page filename).
- **`Farm.world`** — `localStorage["farm-world-v1"]`: `.KEY`, `.get()` → `{ v, wheat, spuds, grain, potatoes, season }`, `.update(fn)`. `Farm.SPUDS` lists potato field stages.
- **`new Farm.Scene(o)`** — side-on parallax camera (`o = { L, span, mh, xmin, xmax, fit }`):
  - Coordinates: `.layout(W, H)`, `.X(x, r)`, `.Y(r)`, `.S(r)`, `.wx(px, r)`, `.rate(r)`, `.cam`, `.follow(x, dt, snap)`, `.TRACK`.
  - Layers: `.sky(ctx, o)`, `.hedge(ctx, o)`, `.field(ctx, "far"|"near", paint)`, `.verge(ctx, o)`, `.store(ctx, level, o)`, `.put(ctx, x, r, dir, fn)`.
- **`Farm.draw`** — `tractor`, `bedformer`, `destoner`, `planter`, `harvester`, `trailer`, `combine`, `boom`, `cow`, `telehandler`, `dog` (Midge), `hare`, `deer`, `gull`, `hawk`, `tree`, `farmstead`, `potato`.
- **`Farm.rear`** — rear close-up drawers: `bedformer`, `destoner`, `planter`, `harvester`, `trailer`, `crossBelt`, `hood`.
- **`new Farm.Particles()`** — world-space particle pool: `.add(p)`, `.update(dt)`, `.draw(ctx, scene)`, `.clear()`, `.count()`.
- **Drawing & interaction helpers:** `Farm.inUnits(ctx, x, y, s, lwPx, fn)`, `Farm.shape` (`P`, `R`, `C`, `Ln`, `tube`, `fs`, `rr`), `Farm.LW` (getter), `Farm.shine`, `Farm.band`, `Farm.eachX`, `Farm.drawRing(ctx, x, y, t, o)`, `Farm.avoid(coach, x, y, r)`, `Farm.locked(ending)`, `Farm.pic(id)`, `Farm.restArt()`.
- **Constants & math:** `Farm.MACHINES`, `Farm.HITCH`, `Farm.DRAWBAR`, `Farm.COMBINE`, `Farm.CROP`, `Farm.u` (`clamp`, `lerp`, `ease`, `hash`, `mix`, `INK`, `reduceMotion`).

---

## 3. `window.ToyboxProjects` (`workshop/projects.js`)

Load after `../common/toybox.js`. Stored in `localStorage["workshop-projects-v1"]` (collection — not cleared by `Toybox.fresh()`) and `sessionStorage["workshop-project-just"]`.

- **`list`** — array of project definitions (currently `[BIRDHOUSE]`).
- **`get(id)`** — returns project definition or `null`.
- **`progress(pid)`** — `{ project, done, count, total, next, finished, built }`.
- **`complete(pid, stepId)`** — marks visit done (resolves legacy IDs via `covers`), increments `built` on completion.
- **`reset(pid)`** — clears `done` and `finishedAt` (keeps `built`).
- **`fromQuery()`** — active visit for `?project=<id>&step=<stepId>`, or `null` in free play.
- **`stepUrl(step)` / `planUrl(pid)`** — builds station deep link or plan page URL.
- **`doneLink(anchorEl, step)`** — completes step, sets `workshop-project-just`, configures link back to `project.html`, returns URL.
- **`justFinished()`** — reads and clears the just-completed step ID on `project.html`.
- **`fmt(n)`** — formats decimal inches cleanly (`7.5`, never fractions).
