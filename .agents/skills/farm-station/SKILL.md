---
name: farm-station
description: Build or update a Tractor Ted Farm station following episode fidelity, hands-on controls, window.__farm hooks, and playtesting.
---

# Building or updating a Farm station

Before editing, read:
- [`farm/AGENTS.md`](../../../farm/AGENTS.md) (all Tractor Ted rules, character specs, dual-view vs one-view list)
- [`plans/tractor-ted-episodes.md`](../../../plans/tractor-ted-episodes.md) (scene-by-scene episode reference)
- [`common/API.md`](../../../common/API.md) (`Toybox` and `Farm` APIs)

## Checklist

1. **Stay faithful to the episode**
   - Build around the episode's main machine highlights; skip tangents (children's scenes, mishaps, side trips) and never invent machines or steps outside the episode.
   - **Never draw Tractor Ted himself** — working tractors are ordinary red tractors (`Farm.draw.tractor`, no face/badge); coach lines say `"the tractor"`.
   - Use `Farm.tom` for Farmer Tom's episode-accurate clothes (pink summer shirt vs olive fleece; add the page key to `TOM_SHIRT` in `farm/farm.js` if it's a new summer episode) and `Farm.draw.dog` for Midge.
   - **Views:** Default to one view framed on the work. Add a split close-up or corner inset only when it shows something the main view cannot.

2. **Use the hands-on station pattern**
   - No step row and no green Go button. Panel uses `tb-panel-bar` (New + Surprise only, stacked in landscape); keep `Toybox.jobs` only if the episode has 2+ distinct jobs.
   - Drive every machine action directly on the canvas with `Toybox.press` (one tap does that control's motion; drag is richer).
   - Guide the next action with a pulsing yellow ring (`Farm.drawRing`) and a literal, verb-first `Toybox.coach` line kept clear of the ring via `Farm.avoid(coach, x, y, r)`.
   - Tapping non-active parts briefly pops up their real name (`Toybox.nametag`).
   - Keep the whole machine + implement on screen with margin at every viewport size.
   - At the end of the episode, show `Toybox.done` and allow tapping the scene to start again.

3. **Wire the `?debug` test hook (`window.__farm`)**
   Expose behind `/[?&]debug\b/.test(location.search)`:
   ```js
   window.__farm = {
     state: () => ({ step, sub, part, finished, coach: coach.text(), /* ... */ }),
     tap: (part) => tapPart(part),
     next: () => tapPart(wantedPart()),
     target: () => targetPt(),
     surprise,
     ghost: () => ghost.show()
   };
   ```

4. **Register a new station (if adding one)**
   - Add its display name to `Farm.NAMES` in `farm/farm.js`.
   - Add one `STATIONS` lot entry in `farm/index.html`.
   - Split large station scripts into `farm/<id>.js` with a top "Sections" list.
   - Sync offline cache: `node tools/sync-core.js --write`.

5. **Playtest & verify**
   ```bash
   node tools/playtest.js farm/<station>.html
   node tools/verify.js --all-sizes farm/<station>.html farm/index.html
   ```
   Open and inspect screenshots at upright phone, sideways phone, and iPad sizes to confirm the whole machine fits and no labels clip.
