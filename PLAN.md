# Toybox plan

Living plan for the apps still to build. Each section doubles as the spec an agent gets.
Shared rules for every app are in "Every app" at the bottom.

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
- **Water Works** (redesigned as the water table):
  - On phones the controls are small and the panel has empty space.
  - "Meet up" layout: one sunflower gets no stream.
  - The brush cup overlaps the toys, and the squeegee hangs over a leg.
  - Tap-pouring has no visible pitcher.
  - Streams are straight lines, and the squeegee needs several passes.
- **Engine Room:**
  - Phone landscape: the stroke names run together, and Big covers cylinder 4.
  - The start hint covers the engine.
  - Empty space around the landscape panel.
  - The steam engine is small on phone portrait.
  - The gearbox collar sits on the hub, and the 4th gear crowds the wheel.
  - Name tags can cover parts.
  - The tachometer is small on iPhone.
  - The icon linkage is off.
  - The crank has no label.
- **All apps:** check that Grown-ups stays reachable in phone landscape. Gear Box and its copies hide the whole header there.
- **3D Printer:**
  - On iPad the printer is small and the shelf takes a lot of width.
  - The shelf thumbnails are small, and phone portrait has no shelf in the scene.
  - The camera covers the shelf label.
  - The viewer shadow is too big.
  - The name sign is cramped.
  - The status label covers the screen.
  - The open door is a flat slab.
  - The plate stays bright on the rest screen.
  - The icon is plain.
- **Math Grid:**
  - iPhone landscape: the panel has a gap and small buttons.
  - iPhone 0–12: the squares are small.
  - Long pattern text is cut off and "Multiples of" wraps on iPad.
  - The empty timer bar looks like a blank pill during the ending (Gear Box too).
  - The icon could be livelier.
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
  - The second run row and the lift row shrink the board on phones.
  - Kit: the supports and housing overlap pieces, and the base plates sit over the tray.
  - Mix 1: the spiral post covers the squiggle end.
  - Marbles hop about 30 px entering some tracks.
  - Marbles can sit in the plunger lane.
  - Run labels overflow their buttons on iPad landscape.
  - "DROP" overflows its circle.
  - The loop entry curves look beaded.
  - The "Pull down!" hint overlaps the ramps, and the plunger ruler numbers are tiny.
  - The Machine run needs tuning (wheel to seesaw vs trampoline).
  - Marbles overlap in the funnels and the lift cups.
  - The lift rail is too close to the Zigzag ramps.
  - Empty panel space on iPad landscape.
- **Construction Site:**
  - iPhone portrait: the scenes are small, with empty sky.
  - Map: the station buttons cover the lots.
  - Excavator: the swing squashes the arm, and the parked bucket sits in the pile.
  - Bulldozer: the levers crowd the phone, and long drags make it loop.
  - Concrete: the cab is cut off in portrait, the trowel shine is blocky, and the two cars overlap on the finished road.
  - Wrecking ball: the ball draws over the cab, and flying blocks vanish at the edge.
  - Gate: the goggle lenses look tan on the card, and the labels wrap on the phone.
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

- One self-contained folder with `index.html`, `manifest.webmanifest`, `sw.js` (app-prefixed cache name) and icons. After item 4, apps also use `common/`.
- Offline-first: no network after first load; drawing in SVG or canvas, sound from Web Audio. The only external file is the Baloo 2 font.
- Sound off by default, changed only with a 2-second grown-up hold.
- Grown-up timer with the "winding down" ending and a rest screen; Home button; a "Big" button to hide the controls.
- Works with touch and with a mouse; one screen, no page scroll; iPad first, iPhone too.
- No fail states; big visuals; real names. Numbers only where relevant: a measurement the tool takes, a size or setting you choose, or when numbers are the point (Math Grid). No live readouts (turns, depth, RPM, hits, temperatures) as decoration.
- Pace: features first, save early, one quick test pass, report within about 20 minutes with a list of UI issues to polish later.
- Add each finished app to the launcher (`APPS` in `index.html`) and the top-level `sw.js` `CORE` list, and bump both caches.
