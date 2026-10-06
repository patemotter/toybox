# Toybox plan

Living plan for the apps still to build. Each section doubles as the spec an agent gets.
**Read [`AGENTS.md`](AGENTS.md) first**: it has every rule and decision (who it is for, numbers, pace, layout,
intuitive UI, fresh start, safety rituals, architecture, testing, deploy). "Every app" at the bottom is a summary.

## Order

| # | Item | Status |
| --- | --- | --- |
| – | 3D Printer, Water Works, Engine Room, Car Builder builder rows, shared timer (phase 1) | In progress |
| 1 | Water Works | Done |
| 2 | Math Grid | Done |
| 3 | Engine Room | Done |
| 4 | Toybox-wide timer and sound, Big button everywhere, cleanup | Done |
| 5 | Construction Site | Done (v1 stations) |
| 6 | Train Builder | Done |
| 7 | New Workshop stations | Done |
| 8 | UI polish pass (declutter, slow-down, fresh start, intuitive pass) | Done, more polish as feedback comes |
| 9 | Jigsaw Puzzles | Planned |
| 10 | Kitchen Helper | Planned |
| 11 | Music Room | Planned |
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

Done so far (see `AGENTS.md` for the resulting rules): number cleanup, iPhone declutter, slower pacing, fresh start
from the home screen, real machine controls, no insets, idle ghost hands and coach lines in every app, bigger
scenes on upright phones.

**Still open** (reported by agents, not yet fixed; check before fixing, some may be stale):
- **Rocket Builder:** three control rows under the trip row on phones; "Planets" label tight at 390 px; planet
  names can overlap the planet top; faint Mars haze; engine particles look brownish against black.
- **Train Builder:** the hill covers most of the Switches layout's top loop; Paint tab has two rows plus a hint.
- **Engine Room:** the Gears row adds a third control row on phones; the car's start line overlaps the engine top
  on an upright phone.
- **Saw Bench:** the jigsaw starts mostly off the left edge on iPhone portrait; the table saw switch and wheel are
  drawn small in phone landscape (hit areas are big); one iPad drag may not finish a rip pass; the crosscut
  off-cut can cover the "Angle" tag; the fence stays locked if a board is pushed into a stopped blade; the
  circular saw guard grey is close to the blade grey.
- **Drill Press:** small machine in phone landscape; the board's near edge can hang below the flat-drawn table;
  empty pegboard at the sides on iPad portrait; the speed/belt overlay covers the whole canvas in portrait.
- **Construction Site:** Excavator controls take about a quarter of the screen; Concrete only slightly bigger on
  upright phones; wrecking-ball bricks can land on the crane; a ball resting on rubble delays the rest screen to
  ~14 s; goodbye banners sit at the bottom over the panel.
- **Workshop stations:** Measuring objects small in phone landscape, caliper "ZERO"/"ON" labels overflow, the tape
  case resets on rotate; Router's cut edge is only visible in the end view; Wrenches handle can swing off the
  board; Shadow Board hooks sit oddly on the speed square and saw; Hammer & Screws keeps a fixed panel height
  with some empty space on phones.
- **Water Works:** Wheels layout has only 4 small wheels on iPad landscape; Zigzag rows cramped in landscape;
  Gears runoff falls over a neighbor gear and the propeller overlaps a gear; Steps trays thin in landscape;
  water streams draw over pipes they pass behind.
- **Marble Run:** in the Machine run the small wheel mostly flings marbles left onto a guide; the hopper DROP
  button is small (the big Drop button is the main one).
- **Gear Box:** some grey space above and below the board on iPhone portrait.
- **3D Printer:** the Colors tab has three compact rows; My prints shows 20 empty dashed boxes until filled.
- **Car Builder / Spin Shop / Fish Tank:** Build tab rows, the Spin Shop Colors tab (chips plus 14 swatches) and
  the Fish Tank Add fish panel are still busy on phones.

### Number rules

Superseded by the "Numbers" rules in `AGENTS.md` (the dad tightened them after using the apps: sizes, fence and
angle values, bit sizes and nail lengths are no longer shown).

---

## 9. Jigsaw Puzzles

**Folder:** `jigsaw/`.

**Goal:** real jigsaw puzzles with proper knobbed pieces, sized from very easy to a real challenge, with pictures of the things he loves.

**Pictures:**
- Drawn in the Toybox style (SVG, offline): an excavator digging, a rocket on the pad, a marble run, a gear train, a steam train on a bridge, a fish tank, a workbench of tools, a fire truck, a construction crane at sunset, a 3D printer printing a Benchy.
- **Grown-up option:** use a photo from the device (file picker in the grown-up sheet). It stays on the device only.

**Pick a puzzle:** big picture buttons for the pictures, then a size choice shown as small grids: 4, 6, 9, 12, 16, 24 pieces (the piece count is a size you choose, so the number shows).

**Play:**
- Pieces are cut with real tab-and-blank edges (each edge a bezier knob, generated per puzzle).
- The board shows a faint outline of the grid; a **Peek** button fades the whole picture in for a few seconds.
- Pieces start scattered around the board (on iPhone: in a sideways-scrolling tray under the board).
- Drag a piece (two fingers can carry two pieces): near its spot it snaps in with a click and a little bounce; anywhere else it stays where it was dropped. No wrong-piece buzzer.
- Forgiving snap radius, larger for small pieces; after a few near misses the right spot glows.
- Pieces don't rotate (simpler for v1); a grown-up option can turn rotation on later.
- Counter: "Pieces: 5 of 12".

**Finish:** a sparkle sweeps the picture and it comes alive for a few seconds (the excavator digs, the rocket lifts off, the marbles roll). The finished puzzle joins a **My puzzles** shelf (his collection; kept across visits).

**Idle help:** the shared ghost hand carries the piece that fits best to its spot.

**Tech:** render the chosen SVG to an offscreen canvas once; each piece is a `Path2D` clip of that image, cached to its own small canvas for fast dragging. Seeded edge shapes so a puzzle can be rebuilt from saved state.

**Fresh visit:** back to the picture chooser; the My puzzles shelf is kept. **Timer ending:** pieces settle, the board dims. Rest line: "The puzzle is resting."

**Agents:** 1.

---

## 10. Kitchen Helper

**Folder:** `kitchen/`, built like the Workshop: a kitchen home page plus one page per station.

**Getting ready (like the Workshop gear-up):** wash hands (pump soap, scrub with bubbles, rinse, dry on a towel) and put on an apron and a chef hat. Once per visit; a quick "Clean hands? ✓ CHECK!" when coming back to a station.

**Stations (v1):**
- **Blender:** drag in banana, strawberries, blueberries, spinach, yogurt, milk, ice. The lid must go on before it runs (a real rule; the lid glows until it's on). Low / High / Pulse buttons; the contents swirl and blend into a smoothie whose color mixes from the fruit (like Color Mixing). Pour into a cup, add a straw.
- **Cutting board:** a kid-safe nylon knife; drag across food to slice: banana, cucumber, carrot, strawberry, cheese, bread; an apple slicer you press down. Prompts like "Cut it in half!" and "Now in quarters!" show the pieces (fractions as pictures). Slices slide into a bowl.
- **Stand mixer:** tilt the head up, pick the whisk, paddle or dough hook and click it on, add flour (a puff cloud), crack eggs, sugar, butter, then lower and lock the head. The speed lever goes Stir / Low / Medium / High. Batter smooths out, cream whips into peaks, dough climbs the hook. Spinning beater, a big draw.
- **Stove:** stir a pot of soup or pasta with a big spoon (circle drag, bubbles, steam); make pancakes: pour batter, wait for the bubbles, flip with a spatula (a good flick flips higher), stack them up.

**Later stations:** oven with cookie cutters and a glowing window, a toaster that pops, a juicer, a sink full of dishes and bubbles.

**Rules:** no fail states, nothing burns or breaks; real names for tools and foods. Counters where natural ("Pancakes: 4", "Smoothies: 2"). Food finished at a station goes onto a **table** shown on the kitchen home page (his collection for the visit; kept across visits).

**Timer ending:** appliances switch off and spin down; rest line "The kitchen is resting."

**Agents:** 1 for the kitchen home page and hand washing, then 1 per station (4 in v1), each owning its own page, like the Workshop.

---

## 11. Music Room

**Folder:** `music/`.

**Goal:** real instruments he can play with his hands, that look just as exciting with the sound off (on the plane, sound stays off unless a grown-up turns it on; headphones recommended in the sheet note).

**Instruments (picture buttons):**
- **Xylophone:** rainbow bars that bounce when hit, note letters on the bars (C D E F G A B C).
- **Piano:** a big keyboard of about two octaves, slides sideways on phones; keys light up.
- **Drum kit:** kick, snare, toms, hi-hat and crash; drum heads ripple, cymbals wobble.
- **Bells / boomwhackers:** a row of colored tubes or handbells to tap.
- **Guitar / ukulele:** strum across the strings with a finger, strings vibrate visibly; chord buttons (C, G, F, Am).
- **Shakers:** maracas and tambourine that play by shaking the device (tilt permission in the grown-up sheet) or by tapping.

**Visual music (works with sound off):** every note sends up a colored shape that floats and fades; the same note has the same color on every instrument (boomwhacker colors: C red, D orange, E yellow, F green, G teal, A blue, B purple). A wide ribbon across the top draws the tune as colored notes.

**Play along:** simple songs as colored note paths: Twinkle Twinkle, Mary Had a Little Lamb, Hot Cross Buns, Row Row Row Your Boat, Old MacDonald. The next bar or key glows; it waits for him (no timing pressure, no fail).

**Beat Grid:** an 8-step grid (rows are drums or notes, columns are steps), a playhead sweeps across and plays the lit cells, tempo Slow / Medium / Fast. Patterns and counting without numbers in the way (step dots grouped in fours).

**Sound:** Web Audio synthesis only: mallet tones (sine plus a short partial), piano (additive with fast decay), plucked strings (Karplus-Strong), drums (noise bursts and pitch sweeps), bells. Several fingers at once play chords.

**Fresh visit:** back to the xylophone; saved Beat Grid patterns are kept (his collection). **Timer ending:** the instruments play a soft last chord and the lights dim. Rest line: "The instruments are resting."

**Agents:** 1 (2 if the Beat Grid and play-along songs are split from the instruments).

---

## On hold: Workshop Projects

Build something step by step across the stations (cut, drill, nail, sand, paint), such as a birdhouse or a toy car. Revisit after the new Workshop stations exist.

---

## Every app

Summary only; the full rules are in [`AGENTS.md`](AGENTS.md).
- One self-contained folder (`index.html`, `manifest.webmanifest`, `sw.js`, icons) using `common/` for the timer,
  sound, Big button and fresh start. Offline-first; the only external file is the Baloo 2 font.
- Sound off by default (2-second grown-up hold). Just as fun with sound off.
- One screen, no page scroll, iPhone and iPad, touch and mouse. Phone header and two-rows-of-controls rules.
- Numbers only where they're the point; one simple counter per page.
- Calm pace; results stay on screen. One obvious first action, a coach line, an idle ghost hand.
- Fresh start from the home screen; collections and grown-up settings kept.
- No fail states, real names, no brands. Never the child's name anywhere.
- Add a finished app with `python3 tools/add-app.py ...`, bump caches, smoke-test with `node tools/smoke.js ...`.
