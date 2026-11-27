# Toybox: guide for agents

Read this before changing anything. It holds every universal rule and decision for the Toybox.

| Working on… | Also read |
|---|---|
| Shared `Toybox`, `Farm`, or `ToyboxProjects` APIs & CSS tokens | [`common/API.md`](common/API.md) |
| Tractor Ted / Farm map or any Farm station | [`farm/AGENTS.md`](farm/AGENTS.md) |
| Workshop Tool Wall, stations, or Birdhouse project | [`workshop/AGENTS.md`](workshop/AGENTS.md) |
| Specific apps, `archive/`, retired `sw.js` stubs, or `tb-v2` notes | [`docs/app-catalog.md`](docs/app-catalog.md) |
| Backlog, new app plans, or history | [`PLAN.md`](PLAN.md) |
| Repeatable workflows (new app, verifying changes, farm stations) | `.agents/skills/` (`new-app`, `verify-change`, `farm-station`) |

---

## 1. Who it is for

- A 3-year-old boy who **reads well** ("he can read almost anything"): real words on buttons and coach lines are useful. He is autistic and **sensory seeking**: big visuals, color and motion, touching and dragging, strong responses to every touch, predictable behavior.
- Interests: real workshop tools, machines and construction vehicles, math (times and plus tables), marble runs, gears and spinning things, trains, rockets, his 3D printer (P1S + AMS 2 Pro, no logos), and the family's water play table.
- Don't invent traits or "dumb it down": real tool names and real mechanics are wanted, kept intuitive for a bright 3-year-old.
- **Learning comes from doing the real thing.** Never frame apps as lessons, quizzes, or "educational" activities; make the real activity accurate.
- **New app ideas** can come from anywhere — don't design from stereotypes about autism (assuming spinning, sorting, or lining things up); ask the dad when unsure.
- Devices: **iPad** (offline on flights) and **iPhone**, both as home-screen web apps.
- The dad is a software engineer; grown-up controls live behind a 2-second press-and-hold on the home screen.

### Privacy (hard invariant)
**Never write the child's name anywhere** — not in code, comments, files, filenames, commit messages, PR text, or git history. Always say "the child" or "he".

---

## 2. Repository, offline & deploy

- **Architecture:** `patemotter/toybox`. No build step, no frameworks (reviewed 2026-10-12: home-screen web app, plain JS on canvas/SVG, one service worker, GitHub Pages). Each app folder holds `index.html` (+ stations and local `.js`/`.css`), `manifest.webmanifest`, and `icons/icon-{180,192,512,maskable-512}.png`. New apps get **no** per-app `sw.js` (keep retired stubs on older apps; see [`docs/app-catalog.md`](docs/app-catalog.md)).
- **Launcher (`index.html`):** `APPS` array (**Workshop** and **Spin Shop** first). Fits every tile on one screen with no scroll (picture + name; `what` stays for grown-ups/tooling). Usual columns: 4 tablet, 3 upright phone, 6 sideways phone; `fitGrid()` tries up to +3 for biggest pictures without splitting words. Long single words use a soft hyphen (`"Kaleido\u00ADscope"`). Grown-ups **Favorites** (`localStorage["toybox-favorites-v1"]`) pins starred apps to the front with a star badge. Grown-ups **Hide apps** (`localStorage["toybox-hidden-v1"]`) takes apps' tiles off the home screen (still cached offline; at least one app always stays).
- **Shared layer & apps:** `common/toybox.js` + `common/toybox.css` ([`common/API.md`](common/API.md)). App details and `archive/` live in [`farm/AGENTS.md`](farm/AGENTS.md), [`workshop/AGENTS.md`](workshop/AGENTS.md), and [`docs/app-catalog.md`](docs/app-catalog.md).

### Offline (service worker)
- **One top-level `sw.js`:** Registered at Toybox root by `common/toybox.js` (unregisters narrower workers; pages have no SW code). One visit caches every page of every app.
- **Strategy:** Network-first (`cache: "no-cache"`, 3 s timeout for plane wifi) for pages/scripts/styles/manifests; stale-while-revalidate for icons and Baloo 2; `cache: "reload"` on install; `update()` on foreground return; `ignoreSearch` so `?tool=` works offline. Grown-ups' "Offline (for the plane)" checks/fills cache (`toybox-offline-check`/`fill`).
- **Never bump `CACHE` manually:** `sw.js` stays `"toybox-v0"` in git; deploy stamps `toybox-v<1000 + published-file commits>` (keep `"toybox-v<digits>"` for retired stubs). Every published file must be in `CORE` (`node tools/sync-core.js --write` + `node tools/check-site.js`).

### Deploy
- `.github/workflows/pages.yml` publishes pushes to `main` (`https://patemotter.com/toybox/`).
- **Direct pushes:** commit to working branch and push to `main` (`git push origin HEAD:<branch> HEAD:main`). No PR needed.
- **CI `check` (blocking):** stages `_site` (minus `tools/`, `archive/`, `plans/`, `docs/`, `.github/`, `.agents/`, Markdown), stamps `CACHE`, runs `check-site.js`, `check-rules.js`, `lint.js`, and `smoke.js` across sizes.
- **CI `report` (non-blocking):** runs `fit.js` and `buttons.js` on changed pages (`changed-pages.js`) and uploads `toybox-report`. Check via `gh run view --log` or `curl -sSL https://patemotter.com/toybox/sw.js | grep CACHE`.

---

## 3. Product rules

### Hard invariants
Never violate these without explicit approval from the dad:
- **Privacy:** Never write the child's name anywhere.
- **Offline-first & plane-safe:** Zero network after first load. No CDN scripts, runtime images, or audio files — draw everything with SVG/canvas. Only external asset is Baloo 2.
- **No sound at all:** No Web Audio, no spoken lines, no audio files, no Sound setting (the dad, 2026-11-26; the old optional sound effects and voices were removed). `tools/check-rules.js` fails on any audio API. Show every response visually. Adding sound later needs the dad's explicit OK.
- **No fail states, no decreasing scores, no "wrong" buzzers:** Wrong tries get a gentle hint in words.
- **Never remove an existing feature, option, mode, or interaction without the dad's OK:** Decluttering = rearranging, merging duplicates, or automating chores — never cutting choices he can use. List proposed cuts as open questions first.
- **No tilt or shake anywhere:** All motion controls were removed; never add them.
- **No sudden faces appearing on objects:** Never make eyes/smiles pop up on machines, tools, food, crops, or objects (scared him). Permanent character faces (Garden sun, worms, bear latte art, alien, real people/animals) are fine.
- **Real names, no brand names or logos:** Only exception is Tractor Ted theming in `farm/` ([`farm/AGENTS.md`](farm/AGENTS.md)).
- **Never force-push** unless asked.

### Numbers
Show a number only when it has a **real, obvious benefit** — he reads, counts, compares, matches, or aims with it (DOM and canvas/SVG). Otherwise show the effect visually or use words (`Slow`/`Medium`/`Fast`, `Shallow`/`Deep`).
- **Passes:** Measuring readings, Math Grid, letter/number tracing, Wrenches sizes (bolt head + button), Gear Box tooth counts, Espresso scale (`18.0 g` beans, `~36 g` in `~28 s`), child-chosen/watched counts (Kaleidoscope `"How many"`, Spin Shop spokes, Peg Drop bins + Total, Jigsaw piece count).
- **Doesn't pass:** Decorative specs/readouts (RPM, TPI, depth/speed readouts, sizes in tool subtitles), numbered step badges, `"+1"` pop-ups, scores.
- **Counters:** Almost none. Kept only for finite job progress (Shadow Board, Jigsaw, Workshop project), board counts part of the job (Hammer & Screws, Drill Press, Wrenches), quantities on screen now (Marble Run, Train Builder), and Bubbles. No tallies of how many times something was done; no counter on a new app unless asked.
- **No number persists across launches:** Reset counts on `Toybox.fresh()` (reload keeps them). Saved step progress (Workshop project) is not a number and stays.

### Pace
- Auto-playing motion (sequences, transitions, celebrations, demos, default machine speeds) runs **calm** (~1/3 slower than "natural"; child-picked `"Fast"` stays unfrantic).
- Taps respond immediately; dragging and flinging stay responsive.
- **Results stay on screen** until he moves on. Toasts and banners show >= ~3 s.

### Layout (iPhone first, iPad must stay good)
- **One screen, no page scroll.** Test at `390x844`, `844x390`, `820x1180`, `1180x820`, `1024x1366`.
- **Header:** Back (stations only; arrow only on phones), Home icon, one-line Title (`<h1 class="tb-title"><span class="tb-app">App · </span><span class="tb-station">Station</span></h1>`; `.tb-app` hides on upright phones). Never drop or clip the title (`common/toybox.js` shrinks down to 60%; shorten if it still overflows). Never put `"Toybox"` in the header; scripts change only `.tb-station`. Hide decorative badges on phones.
- **Grown-ups lives only on the home screen.** Apps have no Grown-ups button/sheet; add app settings to `SETTINGS` (`common/toybox.js`) and read via `Toybox.settings.get(id)`.
- **No Big button:** `common/toybox.js` hides legacy `big:` buttons. Don't add one; remove when touching old pages.
- **Coach line (`Toybox.coach` / `.tb-coach`):** Instructions (`is-do`, verb-first per `DO_WORDS`, dark pill + yellow glow) sit big in the **middle of the stage** and fade (`is-seen`) after first touch (>= 2 s) or 8 s, returning with the idle ghost hand — so the scene (yellow ring/glow) must keep showing what's next. Info lines (`is-info`, quiet white pill) stay small at the bottom. Force kind via `data-coach="do"|"info"`.
- **Stage & panel:** Prefer a bigger play area; frame upright phones tightly. Upright phone panel <= ~300 px of 844 and <= 12 tappable controls; no duplicates, no clipped labels, text >= 14 px, token targets/gaps (`--tb-*`). Tab/panel changes never re-layout the stage.
- **Views & orientation:** One main view he controls fills the stage, controls low near his hands. No split stage of two equal views; corner insets only when unique (Router Table end view, select Farm close-ups). Use `orientation: "landscape"|"portrait"` only when truly needed (only Concrete uses `"portrait"`; dismissible `"Play like this"` card).
- **Reverted `tb-v2` redesign:** Don't migrate older apps to `tb-v2` Go/step rows without asking ([`docs/app-catalog.md`](docs/app-catalog.md)).

### Making things intuitive & hands-on
- **One obvious first action** + at most one short coach line.
- **He does the work:** Direct manipulation on the machine from the **operator's view**. Every drawn control works; remove duplicate HTML buttons. No green button playing a whole job for him.
- **One press is always enough:** Every drag, turn, hold, pull, or flick on a drawn control also works with a single tap (that control's motion, never the whole job); dragging stays richer (`Toybox.press`).
- **Short and direct:** Fun payoff within seconds. Drop procedural extras/chores (material/size pickers, chuck keys, waiting for spindle stop, repeated passes) or automate them.
- **Plain, literal, complete English:** Action buttons use verb phrases (`"Make the rows"`, never `"Beds!"`). Instructions name who does what to what with no vague pronouns (`"Drive the tractor to the grain barn."`). Read labels aloud.
- **Few labels, distinct from instructions:** No persistent name tags; tapping a part briefly shows a plain label (`Toybox.nametag`).
- **Choices only where they matter**, clearly "pick one of these".
- **Whole machine stays on screen** with margin at every size (zoom out rather than crop).
- **Debris never hides the work:** Shavings/sawdust/chips/dust fade within ~1–1.5 s (capped), never obscuring the active cut, hole, or bit.
- **No dead buttons:** Every tap gives visible feedback (hint, sparkle, wiggle on re-tapped selected tiles with `aria-pressed`/`aria-selected`; disable empty slots).
- **Forgiving input:** Big hit areas, snapping, auto-assist. Two-step machines: first push while off says `"Switch it on!"` + flashes switch; second push auto-switches on.
- **Idle ghost hand (`Toybox.ghost`):** After ~4.5 s idle, max 2–3 times/visit, stops once learned, never during sheet/timer/turn card.
- **Nothing traps him:** Always visible `"New"`/`"Clear"`; no dead-end overlays.
- **Surprise:** A live fun moment on the current scene, rotating between a few moments. Never randomizes choices or gates/unlocks content.
- **Kind words (`Toybox.kind()`):** Call on real completions; shows occasionally. Never first-person (`"I'm proud..."`), hearts only for love lines, never invent family members. Full grown-up control on home screen.

### Fresh start, safety rituals & timer
- **Fresh start (`Toybox.fresh()`):** Launching from the home screen resets current build/board/tool/mode/scroll/counters; keeps **collections** (shelves, spools, puzzles, candy jar, Workshop project progress, etc.) and **grown-up settings**. Reloads and intra-app navigation keep state. After a grown-up opens the home screen's Grown-ups sheet, the next tile tap keeps the launch id and reopens the exact page he left (`toybox-last-page`: a Workshop station, a Farm field), so he comes back as he left it (set a timer without losing his build); other apps still start fresh. Sub screens inside a page (Car Builder Drive, Rocket Builder flight, the Tool Wall's open tool, Jigsaw shelf picture, 3D Printer viewer) record themselves with `Toybox.place` and reopen on a non-fresh load; any new sub screen must do the same.
- **Safety rituals:** Gear up on first start, then only every **10 minutes** (`toybox-gear-v1`, cleared on next page load after 10 min, never mid-job). No mid-station "Safety check!" cards. Flags: `workshop-gear` (`"Eye protection"`, `"Ear protection"`), `site-gear`, `kitchen-ready`, `forge-gear`.
- **Running machines:** Keep running between goes on the same screen. Leaving (`Toybox.offFirst` + `Toybox.beforeLeave`) quietly stops registered machines and navigates immediately. In-station actions needing a stop auto-stop and continue.
- **Shared timer (`toybox-timer-v1`):** Winds down via `onEnding`, optional Goodbye button, rest screen unlocked by 4 s hold.

---

## 4. Technical patterns & defaults

- **Shared layer:** Don't copy timer, ghost, coach, or hold logic — use or extend `common/` ([`common/API.md`](common/API.md)). Wrap every storage call in `try/catch`, prefix app keys, keep save formats backward compatible, and keep `navigator.storage.persist()` in `common/toybox.js`.
- **Code style & structure (defaults; use judgment):** Modern JS (`let`/`const`, arrows, classes, template strings, `<script type="module">` or `"use strict"` IIFE) is encouraged in new/changed code; don't reformat untouched legacy code just for style. Split large scripts (> ~2500 lines, or sooner when modularizing improves clarity) into plain `.js` files with a top **"Sections"** list and add them to `sw.js` `CORE`. Extract logic shared by 2+ apps into `common/`.
- **Browser / iOS:** Pointer events, `touch-action: none`, prevent `gesturestart`, multi-touch, no text selection/callouts. Keep `common/toybox.css`'s pinned `html, body` (`position: fixed; inset: 0; overscroll-behavior: none`) to stop iOS bounce. Cap canvas DPR at 2 (target 60 fps on iPad). Never use `background-attachment: local` on scrolling boxes (lags on iOS). Respect `prefers-reduced-motion`, safe-area insets, and light/dark `:root` tokens. Keep `"Good to know"` (`uses-info` in `SETTINGS`) accurate. Put test hooks behind `?debug` (a few legacy Workshop pages also keep read-only `navigator.webdriver` hooks).
- **Look:** Baloo 2, ink `#1D2340`, bright flat fills, 2 px outlines (3 px stage frame), short bottom lip on pressables, no hard offset shadows, white panel card, `--tb-*` tokens. One meaning per chrome color: green `--tb-go` (Go/ticks), yellow `--tb-pick` (picked + tick badge), orange `--tb-new` (New), blue `--tb-shelf` (Shelf), rainbow (Surprise), light blue `--tb-job` (unpicked job tabs), grey `--tb-off` (coming steps), white (Back/Home); red only on real machine switches/paddles; never color alone. UI icons via `Toybox.icon(name)`; content pictures flat with 2 px outlines; app icons flat `#CDE9FF` background, chunky outlines, maskable keeps subject in central 80%.

---

## 5. Working on it

Only agents edit this repo; keep small changes fast and focused.

- **Workflow & subagents:** Do 1–2 page changes in one agent (use a script's top "Sections" list). Use subagents for large independent work with disjoint owned files; coordinator owns shared files (`common/`, `index.html`, `sw.js`, `README.md`, `PLAN.md`). Subagents never commit or push. Never run `git stash`, `git checkout -- .`, or `git reset` in a shared working tree (use `git show HEAD:<path>` or an external worktree). Read `PLAN.md` only for backlog/new apps/named plans.
- **Checking a change (`.agents/skills/verify-change/SKILL.md`):** Tools auto-serve locally (no separate `http-server`; `PORT=` overrides) and pre-set gear flags. Run `node tools/verify.js <changed pages>` (runs `check-site.js`, `check-rules.js`, `lint.js`, `smoke.js`, `shot.js`; add `--all-sizes` for layout/UI) and **inspect screenshots**. Also available: `shot.js --do ...` and `playtest.js` (`?debug` hooks). Global Playwright uses `NODE_PATH=$(npm root -g)` and optional `CHANNEL=chrome`. After push, check CI `check` and `report` (`fit.js` + `buttons.js`) via `gh run view --log`.
- **Adding a new app (`.agents/skills/new-app/SKILL.md`):** `scaffold-app.py` → build with `common/toybox.js` + `?debug` `window.__toybox` → `render-icons.js` → `add-app.py` → `sync-core.js --write` → `verify.js --all-sizes <folder>/index.html index.html`.

---

## 6. Open questions for the dad (decide before changing)

- Saw Bench's idle hand can show again for each newly picked saw (max 2 per saw). Too much?
- Math Grid squares are ~28 px on iPhone; bigger means a larger rewrite.
- Math Grid `"1 to 10 / 1 to 12"` (no 0 row or column since 2026-11-20) resets on a fresh visit (treated as the child's choice, not a grown-up setting).
- Spin Shop's `"Zoom"` speed label might read as camera zoom.

**Decided (do not reopen):** Two-step machines (switch on, then push/feed/press; second push while off auto-switches on) stay everywhere, lathe and planer included. Concrete uses `orientation: "portrait"`. Engine Room and Construction Site's Bulldozer were deleted — don't rebuild unasked.
