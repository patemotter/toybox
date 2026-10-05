# Toybox plan

Living plan for the apps still to build. Each section doubles as the spec an agent gets.
Shared rules for every app are in "Every app" at the bottom.

## Order

| # | Item | Status |
| --- | --- | --- |
| – | 3D Printer, Water Works, Math Grid, Engine Room | In progress |
| 1 | Water Works | In progress |
| 2 | Math Grid | In progress |
| 3 | Engine Room | In progress |
| 4 | Toybox-wide timer and sound, Big button everywhere, cleanup | Queued |
| 5 | Construction Site | Queued |
| 6 | Train Builder | Queued |
| 7 | New Workshop stations | Queued |
| 8 | UI polish pass | After everything is in |
| – | Workshop Projects | On hold |

---

## 1. Water Works

**Folder:** `water-works/` (a cancelled attempt left a partial `index.html`; start fresh or salvage).

**Goal:** pipes, valves, pumps and tanks that he operates directly, with water that looks alive.

**v1 scenes** (big picture buttons, pre-built, no free building):
- **Tanks:** a supply tank feeds three tanks through pipes, each with its own valve.
- **Water tower:** a pump lifts water into a tower; taps below let it out.
- **Waterwheel:** water pours onto a wheel that turns and lifts buckets.
- **Fountain:** a pump drives a fountain whose height follows the pump speed.
- **Plumbing:** a sink, a bathtub, a toilet tank and a drain trap.

**Controls:**
- Round wheel valves turned by dragging in a circle (0–100% open); a tap toggles them as a simpler path.
- Lever ball valves that flip; a pump with a big ON button; taps; drain plugs.

**Water:** a simple level-and-flow model, not a full fluid simulation.
- Flow dashes and bubbles move along clear pipe sections at a speed matching the flow.
- Pours have splashes and droplets; tank surfaces ripple and slosh.
- Overflow pipes catch excess into a drain, so nothing can go wrong.

**Numbers:** tank gauges in liters and percent, flow meters in L/min, pump pressure in bar, a "Water used" total.

**Optional tilt:** water surfaces tilt with the device; shaking sloshes them.

**Timer ending:** the pump stops, valves close themselves, the water settles. Rest line: "The water is resting."

**Risk:** making flow look good without a real fluid simulation. Particles for pours plus animated pipe dashes should be enough.

**Agents:** 1.

---

## 2. Math Grid

**Folder:** `math-grid/`.

**Goal:** a big, tactile addition and times-table grid for a kid who likes math.

**Modes:** Add (+) and Times (×), grid 0–10 (option for 12).

**Interactions:**
- Tap a square: its row and column light up, and the sum appears big ("4 × 6 = 24").
- Drag across the grid: a rectangle of colored blocks fills in, showing that 4 rows of 6 make 24.
- Pattern buttons light up:
  - multiples of a chosen number;
  - doubles (2+2, 3+3…);
  - square numbers on the diagonal;
  - "same answer" squares (every way to make 12).
- "Build it": blocks drop in one at a time with a count.
- Shake (if tilt is on): the blocks tumble, then snap back.

**Numbers:** everything is numbers. Spoken numbers through the device's built-in voice are an option in the grown-up sheet; off by default, like sound.

**Timer ending:** blocks settle. Rest line: "The numbers are resting."

**Risk:** low.

**Agents:** 1.

---

## 3. Engine Room

**Folder:** `engine-room/`.

**Goal:** see inside machines and how the parts move together.

**v1 machines** (big buttons):
- **Car engine cutaway:** 4 cylinders with pistons, connecting rods, a crankshaft, cam, valves, spark flashes, and a fan belt to the alternator.
- **Steam engine:** boiler, piston, crosshead, flywheel and governor balls.
- **Gearbox:** shift through gears with a lever; the output speed changes.

**Controls:**
- A big crank to turn it by hand, or a starter button plus a throttle lever.
- Speed in RPM; a slow-motion button so every part can be followed.
- Tapping a part highlights it and shows its name.

**Numbers:** RPM, gear ratio, a cycle counter ("Spark: 1-3-4-2").

**Timer ending:** the engine winds down. Rest line: "The engine is resting."

**Risk:** getting the linkages right (crank → rod → piston). The math is standard and deterministic.

**Agents:** 1.

---

## 4. Toybox-wide timer and sound, Big button everywhere, cleanup

**Goal:** one grown-up timer and one sound setting for the whole Toybox, so switching apps doesn't reset the limit.

**Plan:**
- New `common/` folder:
  - `common/toybox.js`: the play timer with its phases, warnings and hold-to-confirm, plus the sound setting, the rest screen and the "Big" toggle helper.
  - `common/toybox.css`: the shared styles for those.
- One shared timer key and one shared sound key in localStorage. Every app reads the same timer, so a running timer keeps counting across apps and the rest screen appears in whichever app is open.
- Move every app onto it, one app at a time, deleting its copy of the timer code.
- The app's own `sw.js` and the top-level `sw.js` must cache `common/` files.
- Add the "Big" button to every app that doesn't have it yet.
- Remove leftover test hooks (or keep them behind `?debug`).
- README: document `common/`, and update the "Adding an app" steps.

**Risk:** it touches every page, so it runs only when no other agent is editing those pages.

**Agents:** 1 to build `common/` and migrate one app as the example, then 2–3 to migrate the rest in parallel, each owning different apps.

---

## 5. Construction Site

**Folder:** `construction-site/`, organized like Workshop: `index.html` is a site map; each station is its own page, so stations can be built in parallel.

**v1 stations:**
- **Bulldozer (top-down):** push loose dirt with the blade.
  - The dirt is a grid "sand" simulation that piles up and spills.
  - Jobs: fill a hole, or make a pile.
  - Numbers: a "Dirt moved" counter in cubic meters.
- **Excavator (side view):** boom, arm and bucket as three joints.
  - Controlled by dragging the bucket, with joint limits, or with two big joystick sliders.
  - Dig into a pile and swing to dump into a dump truck.
  - The truck drives off when full and a new one backs in, beeping; a load counter tracks trips.
- **Concrete:** the mixer truck backs up and its chute swings over an empty road form.
  - Hold to pour; the concrete spreads and rises.
  - Drag a screed board to level it, then a trowel to smooth it.
  - It "cures" to a finished road with cars driving by. Numbers: volume poured.
- **Wrecking ball:** pull the ball back and let go; a pendulum swing.
  - A block building takes damage and tumbles, using simple rigid blocks.
  - A "New building" button; a counter of blocks knocked down.

**Later stations:**
- **Tower crane:** hook beams and place them to build a frame, with a height counter.
- **Road crew:** the paver lays asphalt, the roller flattens it, then paint the lines.
- **Jackhammer and pile driver:** break up concrete; drive piles with a depth readout.
- **Dump truck:** tip the bed to dump a load, with weight in kg.

**Shared:** a site gate with a hard hat and safety vest put on once per visit, like Workshop's gear-up. Shared timer, sound and Big button.

**Risks:**
- The wrecking ball needs simple block physics. Keep it to stacked rigid boxes with friction; avoid tall unstable stacks that jitter.
- The bulldozer's sand simulation needs to stay fast on an iPad.

**Agents:** 1 for the site map and gate, then 1 per station (4 in v1), each owning its own page.

---

## 6. Train Builder

**Folder:** `train-builder/`.

**Build:**
- Add pieces one at a time; each one rolls in and couples with a clunk.
- **Engines:** steam (with a tender), diesel, electric, high-speed.
- **Cars:** boxcar, tanker, hopper, flatcar (logs, pipes or containers), passenger car, coal car, caboose.
- **Per piece:** color, a big number decal and a few style options.
- Remove a piece by dragging it off.
- Counter: "Cars: 7".

**Run:**
- A mostly top-down, slightly angled view of a layout:
  - oval;
  - figure-8 with a bridge;
  - a layout with switches he taps to change the route.
- Along the way: a tunnel, a crossing with gates that drop, a station where the train stops and loads or unloads.
- A speed lever, a whistle button, a headlight at night.

**Tech:** path-following on spline tracks so every car stays on the rails around curves. Cars are spaced by arc length.

**Timer ending:** the train pulls into the station and stops. Rest line: "The train is resting."

**Risk:** smooth curve following for long trains; arc-length spacing solves it.

**Agents:** 1 (2 if the build screen and the track run are split).

---

## 7. New Workshop stations

Each is its own page in `workshop/`, linked from the Tool Wall, sharing the gear-up and timer.

- **Shadow board:** the tools are scattered on the bench; drag each one onto its painted outline on the pegboard. A count shows how many are put away; a sparkle when it's done.
- **Lathe:** spin a square blank; drag a gouge or skew chisel along the tool rest to turn a spindle shape, with shavings flying. Numbers: RPM and diameter.
- **Router table:** pick a profile bit (roundover, chamfer, ogee, cove), push the board along the fence, and see the edge profile in an end view.
- **Wrenches and sockets:** a bolt board with sizes 8–19 mm; pick the right socket or wrench by size to turn each nut; a wrong size slips with a gentle hint.
- **Measuring:**
  - a tape measure that pulls out to measure real things;
  - a spirit level that uses the iPad's actual tilt;
  - a speed square for marking;
  - a caliper with a live reading.

**Agents:** 1 per station (5), each owning its own page; then 1 small step to link them from the Tool Wall and both service workers.

---

## 8. UI polish pass

After everything is in. Collect the "UI issues noticed but not polished" lists that each agent reports, then fix them across the apps.

Known so far:
- **Hammer & Screws:**
  - The raised hammer is cut off on iPhone.
  - The coach line wraps on the power drivers.
  - The drill overlaps the Turns readout on iPad.
  - The ghost hint is a dot rather than a finger.
- **Peg Drop:** the rest screen in Big mode hasn't been checked.
- **Spin Shop:** Min/Max hide next to the ceiling-fan lights counter on narrow phones.
- **Color Mixing:** the My colors area is empty on iPad portrait until colors are saved.
- **Car Builder:**
  - On iPhone portrait the tab and picture labels are clipped, the action buttons stack in two rows, and the vehicle is small in the drive view.
  - The speedometer's center number overlaps its labels, and Turbo pegs the needle.
  - The number buttons all say "Number".
  - Big vehicles overflow the garage roof.
  - The arena stands are plain and the floodlight sits behind the HUD.
  - The cranes float, and dump dirt sometimes lands in the wrong place.
  - To add: loader, crane truck, fire truck, ambulance, police car and tractor (the drawing code exists already).
- **Gear Box:**
  - On iPhone portrait the plate uses only half the height, small gears are tiny, and the example buttons cut off their text.
  - The RPM labels can overlap or be covered by attachments.
  - Cranking small gears is fiddly.
  - The jam triangle's teeth overlap.
  - The speed dial has no min/max labels.
- **Marble Run:**
  - Run labels overflow their buttons on iPad landscape.
  - "DROP" overflows its circle.
  - The loop entry curves look beaded.
  - The "Pull down!" hint overlaps the ramps, and the plunger ruler numbers are tiny.
  - The Machine run needs tuning (wheel to seesaw vs trampoline).
  - Marbles overlap in the funnels and the lift cups.
  - The lift rail is too close to the Zigzag ramps.
  - Empty panel space on iPad landscape.
- **Saw Bench:**
  - Band saw: the top of its upper housing is cut off, and the hint overlaps it.
  - Scroll saw: a grey block shows behind the table.
  - Miter saw: the head drawing is weak, the angle numbers overlap, and the size label can cover the head.
  - Table saw: the fence ruler numbers are hidden.
  - Reciprocating saw: the wall view is too zoomed in.
  - Edge-cut pieces show about 3 mm too large.
  - "Top view" takes room on phones.

---

### Number cleanup (part of the polish pass)

Remove numbers that are clutter; keep the ones that matter. Proposed:
- **Remove:**
  - Gear Box: done (RPM and turn labels removed; the motor dial reads Slow/Medium/Fast).
  - Drill Press: RPM readouts and the depth readout (the dial still sets depth); keep the hole count only if wanted.
  - Hammer & Screws: Hits, Turns, "41 of 50 mm in", and the in-wood ruler.
  - Saw Bench: piece-length labels on every cut, and pieces counters.
  - Tool Wall: live readouts in tool jobs (depth, turns, rpm), except measuring tools.
  - Car Builder: speedometer digits (keep the needle).
  - Marble Run: plunger power numbers.
  - Rocket Builder: altitude counter.
- **Keep:**
  - Measuring tools (tape, level, calipers, square).
  - Sizes you pick: bit sizes, nail lengths, screw sizes, socket sizes, sandpaper grit.
  - Settings you set: table-saw fence, miter angle, blade height.
  - Math Grid.
  - Peg Drop bin counts (counting is the play there).
- **Counters stay** (the dad's call): Fish: N, Marbles/Laps, Pieces, Crushed: N, Holes, Nails/Screws.

## On hold: Workshop Projects

Build something step by step across the stations (cut, drill, nail, sand, paint), such as a birdhouse or a toy car. Revisit after the new Workshop stations exist.

---

## Every app

- One self-contained folder with `index.html`, `manifest.webmanifest`, `sw.js` (app-prefixed cache name) and icons. After item 4, apps also use `common/`.
- Offline-first: no network after first load; drawing in SVG or canvas, sound from Web Audio. The only external file is the Baloo 2 font.
- Sound off by default, changed only with a 2-second grown-up hold.
- Grown-up timer with the "winding down" ending and a rest screen; Home button; a "Big" button to hide the controls.
- Works with touch and with a mouse; one screen, no page scroll; iPad first, iPhone too.
- No fail states; big visuals; real names. Numbers only where relevant: a measurement the tool takes, a size or setting you choose, or when numbers are the point (Math Grid). No live readouts (turns, depth, RPM, hits, temperatures) as decoration.
- Pace: features first, save early, one quick test pass, report within about 20 minutes with a list of UI issues to polish later.
- Add each finished app to the launcher (`APPS` in `index.html`) and the top-level `sw.js` `CORE` list, and bump both caches.
