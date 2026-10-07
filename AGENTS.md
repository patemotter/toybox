# Toybox: guide for agents

Read this before changing anything. It holds every rule and decision made so far, so you can work on the Toybox
without the history of the conversations that built it. `PLAN.md` holds the backlog and the plans for new apps;
`common/toybox.js` documents the shared grown-up layer in its header comment.

---

## 1. Who it is for

- A 3-year-old boy. He reads short words. He is autistic and **sensory seeking**: big visuals, lots of color and
  motion, touching and dragging, strong responses to every touch, predictable behavior.
- He loves real workshop tools, machines and construction vehicles, math (times and plus tables), marble runs,
  gears and anything that spins, trains, rockets, his 3D printer (a P1S with an AMS 2 Pro, drawn without logos)
  and a water play table the family owns.
- Don't invent other traits. Don't "dumb it down": real tool names and real mechanics are wanted. But nothing
  should be complex or unintuitive for a bright 3-year-old.
- **New app ideas** come from what the dad says he enjoys and from ordinary preschool play (pretend play,
  animals, art, stories, music, games, nature). Don't design from stereotypes about autism (e.g. assuming
  spinning, sorting or lining things up); ask the dad when unsure.
- Devices: an **iPad** (used offline on flights) and an **iPhone**. Both run the site as a home-screen web app.
- The grown-up (the dad) is a software engineer; grown-up controls live behind a 2-second press-and-hold.

### Privacy (hard rule)
**Never write the child's name anywhere**: not in code, comments, files, filenames, commit messages, PR text or
history. Say "the child" or "he". The history was rewritten twice to remove it; don't reintroduce it.

---

## 2. Repository and architecture

- Repo `patemotter/toybox`. No build step, no frameworks, no modules: each app is one folder with a
  self-contained `index.html` (inline CSS + JS in a `"use strict"` IIFE, ES5 style: `var`, `function`).
- Every app folder: `index.html` (plus extra pages for multi-page apps), `manifest.webmanifest`, `sw.js`,
  `icons/icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- `index.html` at the top is the **launcher**: an `APPS` array (order matters: Workshop and Spin Shop first). It
  fits every tile on one screen with no scrolling (four per row on tablets, three on upright phones, six on
  phones held sideways), picture and name only; `fitGrid()` sizes the pictures to the rows. The `what` text
  stays in `APPS` for grown-ups and tooling but isn't shown.
- `common/toybox.js` + `common/toybox.css`: the shared **grown-up layer** used by every app: play timer, sound
  hold-toggle, Big button, rest screen, toasts, press-and-hold buttons, fresh-visit detection. Read its header.
- Multi-page apps: `workshop/` (Tool Wall `index.html` + stations: `drill-press`, `saw-bench`, `hammer-screws`,
  `lathe`, `router-table`, `wrenches`, `measuring`, `shadow-board`) and `construction-site/` (site map +
  `bulldozer`, `excavator`, `concrete`, `wrecking-ball`).
- Apps: workshop, spin-shop, kaleidoscope, peg-drop, rocket-builder, color-mixing, gear-box,
  marble-run, car-builder, math-grid, 3d-printer, water-works, construction-site, train-builder.
  `fish-tank/` is kept in the repo but has no tile on the home screen (the dad shelved it); don't delete it.
- `tools/`: `smoke.js` (load + drag + error/scroll check), `add-app.py` (add an app to launcher, top-level
  `sw.js` and README), `snippets/` (master copies of the idle ghost hand and the coach pill).

### Offline (service workers)
- Each app's `sw.js`: stale-while-revalidate, `CACHE = "<folder>-vN"`, deletes only caches starting with
  `"<folder>-"`, matches with `ignoreSearch` (so `?tool=` links work offline), caches the Baloo 2 Google Font.
  Its `CORE` lists every page in the folder, the manifest, the icons and `../common/toybox.css` +
  `../common/toybox.js`.
- The top-level `sw.js` (`CACHE = "toybox-vN"`) caches the launcher and **every page of every app** so one visit
  to the launcher makes everything work offline. A new page must be added to both lists.
- **Bump the cache on every change**: the app's `sw.js` once per change set, and the top-level `toybox-vN` for
  every commit that changes anything it caches. On the device: open online, close, open again to update.

### Deploy
- GitHub Pages is published by `.github/workflows/pages.yml` (GitHub Actions, on every push to `main`, plus
  "Run workflow" by hand). Live at `https://patemotter.com/toybox/`. (The old branch-based Pages build stopped
  triggering after a history rewrite; that's why the workflow exists.)
- The owner asked for direct pushes: commit to the working branch and push the same commit to `main`
  (`git push origin HEAD:<branch> HEAD:main`). No PR needed. Never force-push unless the owner explicitly asks.
- Check a deploy: the "Deploy to GitHub Pages" run on the Actions tab, or `curl -sSL <live>/<app>/sw.js`.

---

## 3. Product rules (the dad's decisions; follow all of them)

### Sound and plane-safety
- **Sound is OFF by default**, toggled only by a 2-second hold in the Grown-ups sheet on the home screen.
  All sound is synthesized with Web Audio, soft, never harsh. Create/resume audio only in a user gesture.
- With sound off, every app must be just as fun: every action has a strong visual response.
- Everything works with zero network after the first load: no CDN scripts, no runtime images or audio files.
  Draw with SVG/canvas. The only external file is the Baloo 2 font.

### Numbers
Remove every measurement, spec or live readout a child sees, in DOM text and drawn on canvas/SVG: mm, cm, in, ft,
lb, kg, RPM, TPI, °, %, layer counts, tooth counts, ruler/scale numbers, depth/speed readouts, sizes in tool
subtitles, numbered step badges, "+1" pop-ups. Show the effect visually instead; words like Slow/Medium/Fast,
Straight/Angle, Shallow/Deep are fine.
Keep only:
- **Simple counters, one per page, never duplicated** ("Nails: 3", "Loads: 2", "Cars: 4", "Put away: 5 of 12").
- The **Measuring** station's readings and **Math Grid** (numbers are the point).
- **Wrenches**: the size is the matching game, so once per bolt head and once per size button.
- Counts the child chooses or watches: Kaleidoscope "How many", Spin Shop spokes, Peg Drop per-bin counts and
  Total, the Jigsaw piece count. If unsure, remove it.

### Pace
- Everything that plays by itself runs calm: about a third slower than "natural" (auto sequences, transitions,
  celebrations, demos, default machine speeds). A child-picked "Fast" is still not frantic.
- Taps respond immediately; only the motion afterwards is slower. Dragging/flinging stays responsive.
- **Results stay on screen** until the child moves on (a finished print, cut piece, road, build); never whisked
  away after a second or two. Toasts and banners show at least ~3 s.

### Layout (iPhone first, iPad must stay good)
- One screen, **no page scroll**. Test at 390x844, 844x390 and 820x1180 (also 1180x820 and 1024x1366 for iPad).
- **Phone header**: Back (stations only, e.g. "‹ Tool Wall", "‹ All machines"), Home as an icon, a short title
  that fits without "…" (drop it rather than truncate), Big as an icon. Decorative badges ("Gear on", "Hard hat
  on") are hidden on phones. iPad may show words.
- **Grown-ups lives only on the home screen** (the launcher): timer, sound and an "App settings" section for every
  app's grown-up options. Apps have no Grown-ups button or sheet. A new app setting goes in the `SETTINGS` list in
  `common/toybox.js` and is read with `Toybox.settings.get(id)`.
- **Standard layout (every app looks the same):** see `tools/shell-demo.html` and the "App shell" classes at the
  end of `common/toybox.css`. Header: [‹ Back (stations)] [Home] [Title] … [Big at the right edge]. Stage: the play
  area, with only the counter (top-left), one coach line (top-center on tablets, bottom-center on phones), the
  time-left badge and the ghost hand on top; no floating buttons. Panel (under the stage in portrait, right column
  in landscape), top to bottom: the one green **Go** button (main action, if any), the **choices** as picture
  tiles, then the **tab bar** last: sections, an orange **New** (start over), and **Surprise** with the sparkly
  rainbow outline (`tb-surprise`, never a dashed line).
- Controls under the play area: **at most about two rows** of big buttons on a phone. More goes behind tabs or a
  switcher row. No duplicate controls. No label cut off: shorten it. Button text ≥ ~14px, targets ≥ 44px.
- The **Big** button hides the controls for full-screen play (per app, remembered).
- Prefer making the play area bigger over fitting more buttons. On upright phones, frame scenes tightly (pan with
  the action, turn wide layouts upright) rather than leaving empty sky.
- **No picture-in-picture insets** unless they show something unique (kept: the Router Table end view, now a
  small corner panel). Alternate full views behind a button are fine.
- **An app may prefer one orientation**: `Toybox.init({ orientation: "landscape" })` (or `"portrait"`). Held the
  other way, the shared layer covers the app with a "Turn it sideways!" / "Turn it upright!" card (a turning
  tablet picture and a small "Play like this" button, so rotation lock never traps him; remembered for the session).
  The app must still work in the other orientation behind that button; it just needn't be framed as carefully.
  Current users: Train Builder (landscape), Concrete (portrait). Everything else is both ways.

### Making things intuitive
- **One obvious first action** per screen: the main object is big and reacts to touch, plus at most **one short
  coach line** in a pill ("Drag the bulldozer!", "Switch on the lathe!", "Tap a paint pot!").
- **Direct manipulation**: drag the saw, turn the wheel, pull the tape, spin the toy with a finger. If a control
  is drawn on a machine, it must work (switches, height wheels, handles); don't draw fake controls. Remove HTML
  buttons that duplicate a working on-machine control.
- **Operator's view**: draw every machine and tool from where you'd stand to use it (the drill press from the
  front, a little above, with the table and board top visible), not a side elevation.
- **No procedural extras**: keep the fun core of each tool and drop steps that only add waiting or fiddling:
  material pickers, size pickers, chuck keys, waiting for a spindle to stop, setup sequences. If something like
  that stays, it happens automatically or with one tap.
- Draggable things look grabbable; decorations don't look like buttons; no hidden modes.
- Forgiving input: big hit areas, snapping, auto-assist after a few misses. Two-step machines (switch on, then
  work): if he pushes while it's off, say "Switch it on!" and flash the switch; on the second try switch it on
  for him.
- **Idle ghost hand**: after ~4.5 s without a touch, a see-through hand shows the next move, at most 2–3 times
  per visit, never again once he has done it, never while the sheet is open or the timer is ending/resting.
  Use `tools/snippets/ghost-hand.js` / `.css` (same look everywhere). Coach pill: `tools/snippets/coach-pill.css`.
- Nothing traps him: always a visible way to start over ("New", "Clear"), no dead-end overlays.
- No fail states, no scores that go down, no "wrong" buzzers. Wrong tries get a gentle hint in words.
- Real names, no brand names or logos.

### Fresh start
- Opening an app **from the home screen** starts it fresh: the current build/drawing/board, selected
  tool/layout/mode, scroll position and counters go back to first-visit defaults.
- **Kept**: his **collections** (3D Printer shelf and spool colors, Lathe and Router shelves, Fish Tank fish,
  Color Mixing "My colors", My puzzles in Jigsaw) and **grown-up settings** (timer, sound, Big, tilt, sheet
  options such as Bulldozer Drag/Levers, Math Grid spoken numbers).
- Reloading, or moving between pages of the same app (Tool Wall ↔ station), keeps the state.
- Implemented with `Toybox.fresh()` (see §4). Call it where the page loads its saved state.

### Safety rituals
- **Workshop**: once per visit (sessionStorage `workshop-gear`), the child puts **"Eye protection"** and
  **"Ear protection"** on a worker (use exactly those names; they're the words used at home). Opening a station
  with the gear already on shows a quick "Safety check!" ("Eye protection? ✓ CHECK!", "Ear protection? ✓ CHECK!")
  that slides away; a tap only skips it (it must not tap what's underneath). **No check when going back to the
  Tool Wall.** Not right after the gear-up either (`workshop-check-skip`).
- **Construction Site**: hard hat, safety vest, eye protection, ear protection (`site-gear`), the same quick
  check on each station.
- The launcher clears both gear flags on load and on `pageshow`, so leaving the app means gearing up again.
- **Power tools**: the safety check also runs whenever he changes to a different power tool on the same page
  (sessionStorage `workshop-check-tool` remembers which tools were checked this visit).
- **Machines keep running** between goes on the same screen: a finished job ("Done!", "Again") does not switch the
  machine off; only his tap on the red paddle, the timer, or leaving the page does.
- **"Switch it off first"**: leaving a page (Home, Back, "Try it!", "Back to the plan") while a switched machine
  runs shows the shared card from `Toybox.offFirst(...)` (see `common/toybox.js` header, section 5): "Switch off
  the table saw first!" with one big switch; a tap on it winds the machine down, then the link goes. A tap outside
  stays. Pages with a switched machine register it; closing a card on the same page (the wall's "Hang it back")
  just switches off quietly.

### Timer (shared)
- The grown-up sets a play timer (shared across all apps, `toybox-timer-v1`). When time is up the app winds its
  motion down in an app-appropriate way (`onEnding`), optionally waits for a Goodbye button, then shows a rest
  screen with an app picture and a line ("The rocket is resting."), unlocked by a 4-second hold.

---

## 4. Technical patterns

### `common/toybox.js` essentials
- `Toybox.init({ app, grownButton, big, sections, restArt, restLine, onEnding(done, info), endingMaxMs, ... })`.
  `info.goodbye` says whether the Goodbye button will show. `endingMaxMs` (default 15000) for long goodbye
  animations (Rocket Builder uses ~36000).
- `Toybox.timer.locked()` (ignore play input while ending/resting), `Toybox.sound.ready()` (AudioContext or null;
  play sound only through it), `Toybox.makeHold(btn, ms, onDone)`, `Toybox.toast(msg)`, `Toybox.setBig(on)`.
- `Toybox.settings.get(id)` / `.onChange(fn)` / `.action(id, fn)`: app settings chosen on the home screen (stored in
  `toybox-settings-v1`); `Toybox.tiltReady(cb)` for tilt. `home: true` in `Toybox.init` is for the launcher only.
- `Toybox.fresh()`: true on the first load of a page under a new launch id. The launcher stores
  `sessionStorage["toybox-launch"]` when a tile is tapped; each page records `toybox-seen:<path>`.
- `orientation: "landscape"|"portrait"` in `Toybox.init` shows the turn-the-device card (`Toybox.turning()`,
  `onTurn(shown)`; bypass in tests with `sessionStorage["toybox-turn-ok:<app>"]="1"`). `Toybox.offFirst({ running,
  name, off(done), flash })` registers the "switch it off first" card; `Toybox.beforeLeave(fn)` for script-driven
  navigation; `data-tb-noguard` on a link exempts it.
- The module swallows the click that follows a finished hold, syncs timer/sound/Big across open tabs, and
  re-reads state on back/forward restore. Don't copy timer/sound code into apps; extend `common/` instead.
- Keys: `toybox-timer-v1`, `toybox-sound-v1` ("1"/"0"), `toybox-big-<app>`. App state uses an app-prefixed
  localStorage key. Wrap every storage access in try/catch. Keep saved formats backward compatible.

### Browser/iOS findings
- Play surfaces: pointer events, `touch-action: none`, prevent `gesturestart`, no text selection or long-press
  callout; support several fingers at once.
- Canvas: scale by devicePixelRatio capped at 2; aim for 60fps on iPad.
- Don't paint a pattern with `background-attachment: local` on a scrolling box: it lags on iOS (the Tool Wall's
  pegboard holes now live on the scrolling content element).
- Tilt/shake: one "Tilt and shake" switch in the home screen's App settings. Apps call `Toybox.tiltReady(cb)`; on
  iOS it asks `requestPermission()` on his first tap in the app (it needs a user gesture). Never prompt on load.
  The app must work fully without tilt. No vibration API on iOS.
- Respect `prefers-reduced-motion` and safe-area insets. Light/dark theming via `:root` tokens.
- Test hooks only behind `?debug` (read-only `navigator.webdriver` hooks exist in a few Workshop pages).

### Look
- Toybox chrome: Baloo 2, chunky 3–4px dark (#1D2340) outlines, offset shadows, rounded corners, bright flat
  colors, `.btn` style from `common/toybox.css`. Machines drawn big and accurately.
- Icons: flat, full-bleed #CDE9FF background, chunky outlines, one clear subject; render an SVG with Playwright
  and screenshot at each size; the maskable icon keeps the subject in the central 80%.

---

## 5. Working on it

### With several agents
- At most **three agents at a time** (the owner cares about not overloading the machine).
- Each agent owns specific files. Don't edit files outside your assignment. Shared files (`common/`, the
  launcher, top-level `sw.js`, `README.md`, `PLAN.md`) are edited by the coordinator only, unless assigned.
- A folder's `sw.js` may be shared by agents on different pages of the same app: re-read it right before bumping.
- **Never run `git stash`, `git checkout -- .`, `git reset` or anything else that rewrites the shared working
  tree**: other agents' uncommitted work lives there. To compare with an older version, export it with
  `git show HEAD:<path> > <scratch file>` instead.
- Subagents don't commit or push; the coordinator reviews screenshots, smoke-tests and commits per app/group.
- Pace: get it working first, save early, one quick test pass, report within about 20 minutes, listing UI issues
  you noticed but didn't polish. Report: what works, what changed, open questions for the dad, screenshot paths.

### Testing
- Serve: `npx http-server . -p <your port> -c-1 -s` (use a unique port per agent).
- Playwright: on the owner's Mac it's a global npm install (`npm root -g`), so scripts need
  `NODE_PATH=$(npm root -g)`. Its own Chromium download may not be available; `CHANNEL=chrome` (smoke.js) or
  `chromium.launch({ channel: "chrome" })` drives the installed Google Chrome instead. Don't run
  `playwright install` unless the download actually works. Block Google Fonts in tests:
  `context.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort())`.
- Workshop pages need `sessionStorage["workshop-gear"]="on"` (and `"workshop-check-skip"="1"` to skip the check);
  site pages need `"site-gear"="on"`, or they redirect to the gear-up.
- `node tools/smoke.js <pages...>` (PORT, SIZE, MOBILE=1 env vars) for a quick pass. Then drive the real play
  action, check no page errors and no page scroll, take screenshots at the three sizes and **look at them**.

### Adding a new app
1. Build the folder (see §2), using `common/` for the grown-up layer, following every rule in §3.
2. `python3 tools/add-app.py <folder> "<Name>" "<tile line>" "<README line>" [extra pages]`.
3. Bump caches, smoke-test the launcher and the app, commit, push to the branch and `main`.

---

## 6. Open questions for the dad (decide before changing)

- Saw Bench's idle hand can show again for each newly picked saw (max 2 per saw). Too much?
- Math Grid squares are ~28px on iPhone; bigger means a larger rewrite.
- Math Grid "0 to 10 / 0 to 12" resets on a fresh visit (treated as the child's choice, not a grown-up setting).
- Spin Shop's "Zoom" speed label might read as camera zoom.

Decided (kept here so nobody reopens them): the two-step machines (switch on, then push/feed/press; the second
push while off switches on for him) stay as they are everywhere, lathe and planer included. Concrete uses `orientation: "portrait"`
instead of a bigger landscape scene. Engine Room was deleted (the dad didn't like it); don't rebuild it unasked.
