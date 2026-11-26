# Farm (Tractor Ted): guide for agents

Read the root [`AGENTS.md`](../AGENTS.md) first for universal Toybox rules, and [`common/API.md`](../common/API.md) for `Toybox` and `Farm` (`farm/farm.js`) APIs.

---

## 1. Episode-first rule & Tractor Ted theming

- **Theming exception:** The Farm is the one Toybox app themed to a real show — it is shown as **"Tractor Ted"** and its stations follow the newer-series episodes the child knows by heart. (Real machines everywhere else have no brands or logos.)
- **Reference guide:** [`plans/tractor-ted-episodes.md`](../plans/tractor-ted-episodes.md) is the dad's scene-by-scene reference.
  - Take an episode's main machine moments and skip tangents (children's scenes, mishaps, side trips).
  - **Nothing invented outside the episode:** no made-up steps, machines, or places; settings match the episode (e.g., the sawmill in Timberrrrr! is indoors).
  - **Never build *Let's Go Racing*.**
  - **When in doubt, default to the episode guide.** Change an existing station only when it is obviously different from its episode and misses key highlights.
  - Testing showed the child strongly preferred *Spuds in Mud* over a manual-driving *Combine Time* pilot: what matters most is hitting the authentic highlights of the episode clearly and big (like *Spuds in Mud*'s bed former → destoner → planter → harvester sequence), not replacing highlights with manual driving or steering chores.

---

## 2. Characters & machines

- **Never draw Tractor Ted himself.** He is the show's cartoon narrator and doesn't do the farm work; a drawn version scared the child ("unless it's 1:1 we are better off not including him"). Every working tractor is an ordinary red tractor (`Farm.draw.tractor`: no face, no badge); coach lines say "the tractor".
- **Farmer Tom** (from the dad's photos): bald, light stubble. His clothes match the episode via `Farm.tom` (auto-selected by page filename in `farm/farm.js`):
  - **Pale pink short-sleeved shirt** in summer episodes: `combine`, `bales`, `silage`, `berries`, `sheep`, `hens`.
  - **Dark olive-brown zip fleece over a pale shirt collar** in the others (`spuds`, `carrots`, `muck`, `woods`, `cows`, `tracks`, `ewe`, `mushrooms`).
  - He drives the tractors and, in the episodes, also the combine, the baler's tractor, the muck telehandler, and the mower (check `plans/tractor-ted-episodes.md`); the forestry harvester, lorry, and loader have their own drivers.
- **Midge** (`Farm.draw.dog`): a wire-haired miniature dachshund — wiry ginger-tan coat, long low body, short legs, floppy ears, scruffy beard and eyebrows.
- **Merlin**: the pony.

---

## 3. Stations & views

Every map lot is one entry in `STATIONS` in `farm/index.html`, with its display name in `Farm.NAMES` (`farm/farm.js`). `farm/field.html` only redirects to `spuds.html`.

| File | Station name | Jobs / highlights | View |
|---|---|---|---|
| `spuds.html` | Spuds in Mud | Bed former → destoner → planter → harvester | Dual view (close-up of rows/work) |
| `combine.html` (`combine.js`) | Combine Time | Wheat \| Sunflowers (*Sunny Seeds*) | Main + corner inset |
| `bales.html` (`bales.js`) | Brilliant Baler | Hay \| Haylage | Dual view |
| `silage.html` | Glorious Grass | Grass \| Maize | Dual view |
| `carrots.html` | Munchy Crunchy | Carrot harvesting | Dual view |
| `muck.html` | Mucky Muck | Spreader \| Slurry tanker | One view |
| `woods.html` (`woods.js`) | Timberrrrr! | Logs \| Chipper. Logs: Fell, Logs, Lorry (weighbridge, count 6 wheels, crane off), Sawmill (loader, squaring & splitting saws), Fence (Tom stands post, post knocker, netting, sheep safe). Chipper: tap machine. | One view |
| `berries.html` | Juicy Squeezy | Berry harvesting | Dual view |
| `cows.html` | Moooovie Time | Cows walk into the parlor (no milking) | One view |
| `sheep.html` | Come Bye | Gather \| Foot bath | One view |
| `hens.html` | Feathered Friends | Hen house & eggs | Dual view (inside hen house) |
| `tracks.html` | Caterpillar Hunt | Tracks / mud | Dual view (under the wheel) |
| `ewe.html` (`ewe.js`) | Hello Ewe! | Scrape shed passage, count 4 sheep onto parlor platform, blue foot spray, straw chopper beds shed | One view |
| `mushrooms.html` (`mushrooms.js`) | Mighty Mushrooms | Crane lorry's straw, steaming compost bunker, filling growing shelves, picking | One view |

**Dual-view vs one-view rule:** Frame one main view on the work. Add a split close-up or corner inset **only** when it shows something the main view cannot (e.g., inside the hen house, under the wheel, rear view along potato rows). Never repeat the main view bigger — that is why *Timberrrrr!*, *Mucky Muck*, *Moooovie Time*, *Come Bye*, *Hello Ewe!*, and *Mighty Mushrooms* are one view.

---

## 4. Hands-on interaction pattern

Every station follows the hands-on pattern pioneered by *Timberrrrr!* (rebuilt 2026-10-15/16):

- **No step row and no green Go button.** The dad found green step chips looked like buttons and clicking Go over and over wasn't hands-on.
- **Panel:** holds only the bottom bar (`tb-panel-bar`: New and Surprise, stacked in a slim column in landscape). Job tabs (`Toybox.jobs`) stay for multi-job stations.
- **On-scene play:** He works each machine directly on the scene (drag or tap via `Toybox.press`).
  - A pulsing yellow ring (`Farm.drawRing`) and the coach line (`Toybox.coach` + `Farm.avoid` so the pill stays clear of the ring) point at the next part to tap or drag.
  - Tapping other machine parts briefly pops up their real name (`Toybox.nametag`).
  - After the last step finishes, a tap on the scene starts again (alongside `Toybox.done`).
- **Whole machine stays on screen** with a margin at every size; zoom out or reframe rather than cropping.

---

## 5. Shared code, state & test contract

- **Shared script:** `farm/farm.js` exposes `window.Farm` (`NAMES`, `tom`, `world`, `Scene`, `draw.*`, `rear.*`, `Particles`, `drawRing`, `avoid`, `locked`, `pic`, `restArt`, etc. — see [`common/API.md`](../common/API.md)).
- **Shared world state:** `localStorage["farm-world-v1"]` via `Farm.world.get()` / `.update(fn)` (keeps unknown fields, wrapped in `try/catch`).
- **`?debug` test hook (`window.__farm`):** Every station exposes `window.__farm` behind `/[?&]debug\b/.test(location.search)` with:
  - `state()` — returns current step/sub-step, wanted part (`part` or `cur`), `finished`, `coach`, etc.
  - `tap(part)` — plays a tap on `part` (same code path as the child tapping the scene).
  - `next()` — taps whatever part is currently wanted (advances one step).
  - Optional helpers: `target()`, `surprise()`, `ghost()`.
- **Playtesting:** Run `node tools/playtest.js farm/<station>.html` to play through every step automatically, plus `node tools/verify.js farm/<station>.html`.
