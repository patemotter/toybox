# Workshop: guide for agents

Read the root [`AGENTS.md`](../AGENTS.md) first for universal Toybox rules, and [`common/API.md`](../common/API.md) for `Toybox` and `ToyboxProjects` (`workshop/projects.js`) APIs.

---

## 1. Pages & stations

- **Tool Wall:** `workshop/index.html` (script in `workshop/index.js`). `workshop/tool-wall.html` only redirects to `index.html`.
- **Stations:**
  - `drill-press.html` (`drill-press.js`) — Drill Press (counter: `"Holes"`, part of the job).
  - `saw-bench.html` (`saw-bench.js`) — Saw Bench (crosscut/miter & saws).
  - `hammer-screws.html` (`hammer-screws.js`) — Hammer & Screws (counters: `"Nails"` and `"Screws"`).
  - `lathe.html` — Lathe (collection shelf kept across `Toybox.fresh()`; no RPM readout).
  - `router-table.html` — Router Table (collection shelf kept across `Toybox.fresh()`; keeps its small corner end-view inset, which shows the bit profile).
  - `wrenches.html` — Wrenches (matching game: sizes shown once per bolt head and once per size button; counter: `"Bolts out"`).
  - `measuring.html` (`measuring.js`) — Measuring (tape measure & square; real decimal-inch readings pass the Numbers rule).
  - `shadow-board.html` — Shadow Board (progress counter: `"Put away: N of 12"`).
  - `sanding.html` — Sanding station (used for the Birdhouse's sanding visit only).
  - `project.html` — Birdhouse project plan (progress counter: `"Parts: N of 6"`).

---

## 2. Birdhouse project (`workshop/projects.js`)

- Exposes `window.ToyboxProjects` (see [`common/API.md`](../common/API.md) and header comments in `workshop/projects.js`).
- **Six visits in order**, each with a short story line:
  1. **Plane** (`wall` / `planer`) — plane the 60 in pine board flat.
  2. **Measure** (`measuring` / `tape`) — pull the tape to `12` to mark the Back.
  3. **Cut** (`saw-bench` / `miter`) — crosscut all 6 parts (Back 12, Front 9, Roof 7.5, Side 10, Side 10, Floor 4).
  4. **Drill** (`drill-press` / `holesaw`) — drill the 1.5 in bird door in the Front.
  5. **Sand** (`sanding` / `sandingblock`) — rub rough edges smooth.
  6. **Nail** (`hammer-screws` / `hammer`) — glue and nail the five joins together.
- **Deep link:** `<station>.html?project=<id>&step=<stepId>` (built by `ToyboxProjects.stepUrl(step)`). Stations check `ToyboxProjects.fromQuery()` on load and lock material/tool to the visit, hiding unrelated choices. When done, `ToyboxProjects.doneLink(a, step)` saves completion and links back to `project.html`.
- **Persistence:** Saved in `localStorage["workshop-projects-v1"]`. Treated as a **collection** — `Toybox.fresh()` must **not** clear it. Only the **New** button on `project.html` resets `done` (while `built` stays). Old step IDs map via `step.covers` for backward compatibility.
- **Numbers format:** Always decimal inches (`7.5`, never `7 ½`) via `ToyboxProjects.fmt(n)`.

---

## 3. Safety gear & powered machines

- **Gear-up names (exact):** The worker puts on **"Eye protection"** and **"Ear protection"** — always use those exact phrases (they are the words used at home).
- **Flag & cadence:** `sessionStorage["workshop-gear"]`, managed by `common/toybox.js`'s 10-minute rule (`toybox-gear-v1`). No quick "Safety check!" cards on stations or tool switches.
- **Two-step powered machines** (decided; stays everywhere, lathe and planer included):
  - Switch on first, then push/feed/press.
  - If the child pushes while the machine is off, show `"Switch it on!"` and flash the switch; on the second try, switch it on for him automatically.
- **Between goes & leaving:** Machines keep running between goes on the same screen; only tapping the red paddle, the timer, or leaving the page stops them. Register powered machines with `Toybox.offFirst({ running, off })` so leaving switches them off quietly without blocking navigation.

---

## 4. Workshop-specific visual & technical notes

- **Operator's view:** Draw machines from where you stand to use them (e.g., drill press from the front and slightly above so the table and board top are visible), never flat side elevations.
- **Debris:** Wood shavings, sawdust, and lathe curls fly for a visible moment and fade within ~1–1.5 s (capped count) so they never obscure the cut, hole, or bit. Tidy floor/bin piles out of the way are fine.
- **Tool Wall scrolling performance:** Keep pegboard holes painted on the scrolling content element — never use `background-attachment: local` on a scrolling box (lags on iOS).
- **Test hooks:** Keep new test hooks behind `?debug` (note a few older Workshop pages also have read-only `navigator.webdriver` hooks).
- **Open question (for the dad):** Saw Bench's idle hand can show again for each newly picked saw (max 2 per saw) — confirm whether that's too much before changing.
