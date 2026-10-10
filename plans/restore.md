# What the redesign removed (audit, 2026-10-10)

The dad: the redesign removed features he wanted (e.g. Marble Run's lift style). Rule since then (AGENTS.md): never
remove a feature or choice without his OK. This file is the full audit: each redesigned page's version before its
"Redesign batch" commit compared with the current file, by reading the code. Restore work follows the decisions
at the top; agents restoring a page read its section here first.

## Decisions (filled in as the dad answers)
- (pending)

# Part A: Kitchen, Espresso, Construction Site, Concrete, 3D Printer
# Redesign audit A: Kitchen, Espresso, Construction Site, 3D Printer

Method: for each page, `git show <commit>^:<path>` compared with the working-tree file (code read, not commit
messages). After the redesign commits, the only later change on these pages is 02247d2 (Go labels only: Espresso
"Scoop beans / Pull a shot / Steam milk / Pour milk", Stove "Plate it!"). `tools/smoke.js` passes on all 13 pages
(1180x820, no page errors). Styling and size changes are left out.

---

## kitchen/index.html (2a9b242): kitchen map + getting ready

1. **Removed choices**: none.
2. **Removed features/controls**
   - The getting-ready card's own screen (title "Get ready to cook!" / "Wash hands, apron, chef hat!", the three item
     slots with a check each, dashed outlines on the chef showing where each piece goes, and the hop + "Ready to
     cook!" title at the end) is replaced by the shared `Toybox.gate`.
   - The station buttons (`.sbtn`) on the cupboards are gone. They are replaced by Toybox.map labels, and the whole
     station is now the hit area.
3. **Changed behavior**
   - Getting ready: before, he put each item on himself (tap or drag the item onto the chef, any order, one at a
     time). Now **one tap on the chef or on any item puts on all three, one after another**. Dragging one item onto
     the chef still puts on just that one.
   - The hand wash is shorter (about 2.1 s → 1.5 s).
   - After getting ready, the line "Ready to cook!" shows in the coach pill. Before, the gate card itself celebrated
     for about 2.2 s.
4. **Moved**: the Home button on the gate is now an icon button in the corner.

## kitchen/blender.html (2a9b242)

1. **Removed choices**
   - **Straw color: Red | Orange | Yellow | Green | Blue | Purple | Pink**. All gone. Before, a panel of 7 straw
     tiles appeared after the pour and he picked one (tap or drag it to the cup). Now the straw goes in by itself
     0.7 s after the pour, and its color just takes turns (a tap on the cup can also add it, with the next color in
     turn).
2. **Removed features/controls**
   - The ingredient tiles in the panel are gone. See Moved.
   - The panel is gone: the ingredient choice grid, plus the separate New and Surprise tab bar (they are now in the
     shared bottom bar).
   - The pulsing dashed outline on the jar top and the glowing lid that showed "lid needed" are gone.
3. **Changed behavior**
   - **The lid goes on by itself** when he blends. Before, "Put the lid on!" was a step: he dragged the lid on, and
     only a second try put it on for him. Dragging the lid on by hand still works.
   - **The pour happens by itself** 2.6 s after blending ends. Before, he poured, by dragging the jar to the cup or
     tapping the cup. Both still work if he is quicker.
   - A new **"Fill" Go puts in a ready-made recipe by itself** (banana+strawberry+milk, blueberry+banana+yogurt,
     strawberry+ice+milk, spinach+banana+milk, blueberry+strawberry+yogurt, taking turns). Picking ingredients by
     hand still works, from the counter.
   - The Go "Blend!" always runs High. The Low, High and Pulse buttons on the blender still work.
   - The steps are now Fill → Blend → Pour (before: add, lid, run, blend, pour, straw).
4. **Moved**
   - The 7 ingredients (banana, strawberry, blueberry, spinach, yogurt, milk, ice) moved from panel tiles to the
     worktop in front of the blender: tap one to drop it in, or drag it to the jar. The list is unchanged.

## kitchen/cutting-board.html (2a9b242)

1. **Removed choices**: none (all 7 foods are still tiles).
2. **Removed features/steps**
   - **The "Now in quarters!" step is gone for Banana, Cucumber, Carrot and Cheese.**
     - Banana, cucumber and carrot were half → quarters → coins: 8 pieces from 7 cuts. Now they are half → coins:
       6 pieces from 5 cuts.
     - Cheese was half → quarters → cubes. Now it is half → cubes.
     - Strawberry and Bread keep half → quarters.
     - This removes the "fractions as pictures" quarters stage that PLAN.md §10 asked for.
3. **Changed behavior**
   - **After his first stroke of a step, the rest of that step's cuts chop by themselves** (all the coins, or all the
     cube lines). Before, he cut every line himself.
   - **The finished food slides into the bowl by itself** (after 1.8 s, or 2.8 s for the apple). Before, he tapped
     the board to sweep it in ("Slide them into the bowl!"). A tap still works.
   - The coach line "Slide them into the bowl!" is now "Into the bowl!".
4. **Moved**: New and Surprise are in the shared bottom bar.

## kitchen/stand-mixer.html (b8ac723)

1. **Removed choices**: none. Cookies, Whipped cream and Bread are still choosable (see Moved).
2. **Removed features/controls**
   - **The beater tile is gone.** He used to drag or tap the right beater (paddle, whisk or dough hook) onto the
     mixer. **Now the beater clicks in by itself** with a name tag.
   - The recipe picker screen ("Pick what to make!") is gone. A fresh visit starts Cookies at once.
3. **Changed behavior**
   - **The head tilts up by itself** (for the beater). Before, "Tilt the head up!" was a step.
   - **The head lowers and locks by itself** after the last ingredient ("Head locked" tag). Before, "Lower the head!"
     was a step.
   - Dragging or tapping the head still works.
   - **A tap on the speed lever knob now toggles Off ↔ Medium.** Before, each tap stepped through the speeds
     (Stir → Low → Medium → High → Off). Dragging, or tapping a speed dot, still picks any speed.
   - **The egg cracks by itself** 1.4 s after it lands on the rim if he doesn't tap it. A second egg follows
     automatically.
   - The Go "Add!" puts in all the remaining ingredients one after another. "Mix!" lowers the head and sets Medium.
   - Mixing time is shorter: Cookies 7 → 5, Cream 8 → 5.5, Bread 8 → 5.5 time units.
   - **New** now restarts the same recipe ("A clean bowl!"). Before, it went back to the recipe choice.
4. **Moved**
   - The recipes moved from picker tiles to the job bar (tabs "Cookies", "Cream", "Bread").
   - The recipe's ingredients moved from panel tiles to the counter beside the mixer (tap or drag them to the bowl).
     The ingredient lists are unchanged.
   - Surprise is unchanged.

## kitchen/stove.html (b8ac723 + 02247d2)

1. **Removed choices**: none. Pancakes, Soup and Pasta, the toppings (syrup, butter, berries), the soup foods
   (carrot, peas, corn, tomato, potato) and the pasta (spaghetti, shells, bowties) are all still there.
2. **Removed features/controls**
   - **The range hood drawn over the stove is gone** (drawing removed).
   - **The "Turn the knob!" step is gone.** See Changed behavior.
   - **The "Add a topping!" step is gone.** After 3 pancakes he used to be asked for a topping, and the topping
     finished the plate and sent it to the table.
3. **Changed behavior**
   - **The burner turns on by itself** on the first pour, food in, or stir ("Burner on" tag). Before: "Turn the
     knob!", then a reminder that flashed the knob, and only the second try turned it on for him. The knob still
     works by tap or twist.
   - **A flipped pancake slides onto the plate by itself** 0.7 s after its second side is done. Before, "Slide it onto
     the plate!" was his move.
   - A full plate (5 pancakes) now goes to the table by itself with no topping. Toppings are optional.
   - Cooking is faster: side 1 takes 6.5 → 2.8, side 2 takes 4.5 → 2.2, and the pot heats about 2.5× faster.
   - **Soup needs 2 turns of the spoon instead of 3**. A tap or Go "Stir!" plays 3 automatic turns.
   - The Go "Add!" puts in 3 soup foods (or 1 pasta) by itself.
   - A tap on the ladle or Go "Fill!" now ladles until the bowl is full (1–2 scoops). Before, a tap did one scoop.
   - A tap on the pancake now does a good flip. Before, a tap was a small flip.
4. **Moved**
   - Pancakes, Soup and Pasta moved from tiles to job tabs.
   - The toppings and foods moved from panel tiles to a wall shelf on the scene (tap, or drag onto the pancakes or
     into the pot).

## espresso-machine/index.html (0ea417f + 02247d2)

1. **Removed choices**
   - **The drink picker screen is gone.** Its tiles read "Latte / for Mom", "Cappuccino / for Dad" and
     "Steamer / for you". The three drinks are still choosable (see Moved), but **the "for Mom / for Dad / for you"
     subtitles are gone from the choice**. They only appear as a coach line after picking.
   - A fresh visit now starts a latte at once. There is no "Pick a drink!" moment any more.
2. **Removed features/controls**
   - **"Switch it on!" is no longer a step.** The machine switches itself on when a drink starts, and the warm-up,
     purge, flush and portafilter to its stand run by themselves alongside his first steps. Before, he switched it
     on (with the two-step reminder). The power button still works.
   - **Four drag moves are gone; they now play by themselves:**
     - **Hopper**: drag the bean cup to pour the beans into the grinder.
     - **Dump**: drag the cup to tip the grounds into the portafilter.
     - **Lock**: drag the portafilter into the group head to lock it in.
     - **Jug**: drag the milk jug under the steam wand.
   - The old Go "Do it!" (and "Let go!" during the shot soak) is gone. It is replaced by the 6-step row Beans,
     Grind, Tamp, Shot, Milk, Pour.
   - The 8-icon progress strip at the top-right of the stage is gone (replaced by the step row).
   - The Vanilla, Caramel and Cocoa tiles in the panel are gone. See Moved.
3. **Changed behavior**
   - **One Go press now plays the whole step**: it chains the rest of that step's little motions (for example, Shot
     also locks in, and Pour also serves, knocks out and rinses).
   - A tap on the bean bag now scoops until "just right" (18.0 g). Before, a tap did one scoop.
   - **New** restarts the same drink, and finishing a drink shows "Again!" (the same drink). Before, both went back to
     the drink choice.
   - Surprise feedback moved from a toast to the coach line.
   - Unchanged: the shot hold (soak, then let go), hand steaming (jug up and down), the milk carton pour, whisking and
     tamping are still his.
4. **Moved**
   - The drink choice moved to job tabs: Latte | Cappuccino | Steamer.
   - The syrups moved to the scene. Tapping a syrup bottle on the machine adds a pump (max 3); bottle taps also worked
     before.
   - Cocoa moved to a new drawn cocoa shaker on the cart (tap to toggle).

---

## construction-site/index.html (9c68c0d): site map + gear-up

1. **Removed choices**: none. All 5 stations are still there: Excavator, Concrete, Forklift, Wrecking ball, Tower
   crane.
2. **Removed features/controls**
   - The gear-up card is replaced by `Toybox.gate`. Removed with it: "Hard hat, safety vest, eye protection and ear
     protection" subtitle text, the item slots with checks, and the hop at the end.
   - The station buttons are gone (now Toybox.map labels, with the whole lot as the hit area).
3. **Changed behavior**
   - **Gear-up: one tap on the worker or any item puts on all four**. Before, he put on hard hat, safety vest, eye
     protection and ear protection one by one (tap or drag each). Dragging one item onto the worker still puts on
     just that one.
   - After gearing up, the coach says "Hard hat on! Pick a machine!".
4. **Moved**: the Home button on the gate is now a corner icon.

## construction-site/excavator.html (9c68c0d)

1. **Removed choices**: none.
2. **Removed features/controls**
   - **The separate "Dig" and "Dump" buttons are gone.** There is now one Go that alternates Dig! / Dump! by itself:
     he can no longer choose Dig while the bucket is full, or Dump while it is empty.
3. **Changed behavior**
   - **A tap behind the machine (truck side or pile side) now digs or dumps.** Before, that tap swung the excavator
     round. Dragging there still swings it.
   - New taps on the scene:
     - tap the dirt: a whole dig;
     - tap the truck: a whole dump (dig first if the bucket is empty);
     - tap the bucket or the machine: the next move.
   - Unchanged: dragging the bucket, the quick tap-away glide, and the treasures and their crate.
   - Trucks fill at a lower capacity (6400 → 5600, still 3 buckets), and they leave and arrive much faster (wait 1.2 s
     → 0.3 s, speeds about 2×).
4. **Added, not moved**: New (a fresh dirt pile and empty truck; loads and crate kept) and Surprise (faces on the
   pile and truck; the excavator waves). The old page had neither.

## construction-site/wrecking-ball.html (9c68c0d)

1. **Removed choices / controls**: **the four hold buttons are gone**.
   - **Back the crane up** (drive left).
   - **Drive the crane right** (toward the building).
   - **Pull the ball up** (winch up).
   - **Let the ball down** (winch down).
2. **Removed features**
   - **He can no longer drive the crawler crane.** It now drives into range by itself (`autoDrive`).
   - **He can no longer set the ball height on its own.** The cable now reels to his finger while he drags the ball,
     and a Swing auto-aims lower when only low walls are left.
   - The "New building" button (with its building picture and words) is now the generic New in the bottom bar. It
     still cycles the building styles.
3. **Changed behavior**
   - **Swing!** used to push a ball that was already swinging (`swingPush`). It now pulls the ball back by itself and
     lets go (it still pushes when the ball is already swinging hard).
   - **A tap anywhere on the picture now swings.** Before, a press anywhere pulled the ball toward the finger.
     Dragging the ball still pulls it back.
4. **Added**: Surprise (a face on the ball; pigeons land on the roof and flap off). The old page had no Surprise.

## construction-site/tower-crane.html (a652bf0)

1. **Removed choices**: none.
2. **Removed features**
   - **Floors cut from 5 to 3** (`FLOORS = 5` → `3`). The building tops out after 3 floors.
   - The "New building" button (with its picture and words) is now the generic New. The coach line "Tap New
     building!" is gone.
3. **Changed behavior**
   - **The forced order is gone.** Before: bricks and window in any order, then the steel beam last ("Bricks first!" /
     "Window first!"). Now bricks, window and beam go in any order; when the beam goes first, two temporary props
     hold it up.
   - **A tap on a load now sends the hook to fetch it and carry it to the building.** A tap on the hook or the
     building does the next piece, and a tap on the sky moves the hook there. Before, a press anywhere called the
     hook to the finger. Dragging the hook still works.
   - The crane top is drawn lower and the scene bigger.
   - **The topping-out confetti now lasts about 1.2–1.5 s** (before 3.5–5.5 s). Dust and sparkles are also shorter.
4. **Added**: Surprise (happy faces on the loads, birds on the jib, the driver waves). The old page had no Surprise.

## construction-site/forklift.html (75dcf3c)

1. **Removed choices**: none.
2. **Removed features/steps**
   - **Returning the empty pallets to the truck is gone.** Before, empties became a load he carried back ("Load the
     empty pallets on the truck!"). Now they slide by themselves to a stack under the scaffold.
   - **The wall is cut from 8 rows to 4** (taller rows). Blocks are used for the first 2 rows (was 4), then bricks.
   - The "New wall" button (with its picture and words) is now the generic New.
3. **Changed behavior**
   - **A tap on a pallet does that whole pallet move.** A tap on the forklift or forks does the next move, and a tap
     on the ground drives the forks there. Before, a press anywhere called the forks to the finger. Dragging the forks
     still drives and lifts by hand.
   - **The first truck is already parked** when the page opens. Before, it drove in.
   - Trucks come and go faster (the next one after 1 s instead of 3 s; the drive in takes 3 s instead of 4.5 s).
   - Lumber and pipe loads now only come while the yard has room (at most 3 waiting).
   - Tire marks fade in 1.5 s (was 6 s). The confetti lasts 1.2–1.5 s (was 3.5–5.5 s).
   - Surprise is unchanged (faces, crossing, hop, bird).

## construction-site/concrete.html (7d3a73b, the pilot)

1. **Removed choices**: none.
2. **Removed features/controls**
   - **The hold-to-pour "Pour" button is gone.** He used to hold it and the concrete flowed only while he held, so he
     chose how much and when to stop. **Now Go "Pour!" (or a tap on the stage) pours a whole load by itself.** Holding
     a finger on the stage still pours where the finger is.
   - The "New road" button that replaced Pour when the road was done is gone (now "Again!" in the step row).
   - The Pour / Flatten / Smooth / Dry progress strip is gone (replaced by the step row).
3. **Changed behavior**
   - **Pour, Flatten and Smooth each finish by themselves** once he has done enough by hand:
     - pour: 60% poured;
     - flatten: half the screed pass;
     - smooth: half the slab troweled.
   - A tap does the whole step (a whole screed pass, or the whole slab troweled).
   - Shorter waits:
     - pour 12 s → 5.5 s;
     - drying about 7 s → 3 s (a tap makes the sun brighter and it dries faster);
     - truck faster, chute swing 1.6 s → 0.9 s;
     - line painting 2.4 s → 1.8 s.
4. **Added**: New (start this form over) and Surprise (a face on the mixer, a pup, a bird). The old page had only
   "New road" at the end.

---

## 3d-printer/index.html (912b946)

1. **Removed choices**
   - **One color | Many colors**: gone. Each model is now fixed:
     - **always many colors**: Benchy, Rocket, Dinosaur, Name sign, Vase;
     - **always one color**: Cube, Gear, Star.
     - So **the Gear can no longer print its Hub in a second color**, and the multi-part models can no longer be
       printed all in one color (except by setting every spool to the same color).
   - **Filament colors cut from 24 to 10.** The color picker (lid open, then a grid of 24 swatches, plus the 24-swatch
     row on the Colors tab) is gone. **A tap on a spool now cycles through 10**: orange, red, yellow, green, blue,
     purple, pink, white, rainbow, galaxy.
     - **No longer pickable (14)**: Sky blue, Black, Grey, Silk gold, Silk silver, Silk copper, Matte mint, Matte
       lilac, Glow green, Glow blue, Sunset, Ocean, Sparkle blue, Sparkle purple.
     - All 24 are still defined, and saved spools and prints still draw them.
   - **Faster** (toggle): gone. Prints are now fixed at about 3 s of prep and about 25 s of printing.
2. **Removed features/controls**
   - **Skip ⏩ / Zoom!** (speed up during prep or print): gone. Go during a print just says "Watch it print!".
   - **The filament box lid handle** (tap to open or close the box, with an up/down arrow) is gone. A tap on the case
     only lifts the lid for a moment.
   - **Selecting a spool** separately (tap a spool with the lid closed) is merged into cycling its color: every tap on
     a spool now changes its color too.
   - **The four spool slot buttons** on the Colors tab are gone.
   - The tabs **Models | Colors | My prints** are gone.
   - **The status strip under the printer is gone**: the phase label (Ready, Heating, Leveling the bed, Purge line,
     Done!, Cooling down, All cool) and the progress bar. Phases now show as short name tags; progress shows as the Go
     fill.
   - The "Saved in My prints" toast is gone (now a wiggle on Shelf and "On the shelf!").
   - The fuel-gauge timer on the picture is replaced by the shared time-left badge (not a play feature).
3. **Changed behavior**
   - Prep is about 9.5 s → 3 s (bed leveling 9 probe points → 5). The print is about 40 s → 25 s. Color changes are
     quicker on many-change models.
   - **A tap on a spool cycles its color AND makes it the active spool.** Before, the lid had to be open to change a
     color.
   - New: the printer's green button on the drawn printer works like Print!, and dragging inside the printer moves the
     toolhead while idle (before: tap only).
   - New "New" button: clears the plate (a finished print goes to the shelf first).
   - Unchanged: the shelf collection and the viewer (drag to turn a print), the name-sign setting, and Surprise.
4. **Moved**
   - The 8 models moved from the Models tab to choice tiles ("Name sign" is labelled "Sign").
   - My prints moved from a tab with 20 slots to Shelf in the bottom bar (a shelf view over the stage, newest first,
     tap to view).

---

## Things that look broken or questionable now

- **3D Printer**:
  - The default fourth spool is Black, but Black is not in the tap cycle. Once he taps it away, he can never get it
    back.
  - Any spool saved with a color outside the cycle (silk, glow, sparkle and so on) jumps to orange on its first tap
    (`nextFil` gets index -1).
- **Wrecking Ball**: there is no way at all to drive the crane. If the auto-drive goal ever leaves the ball short of
  what is left standing, he has no control to fix it.
- **Tower Crane / Forklift**: the finished-building and finished-wall confetti now fades in about 1.5 s. This may
  clash with the "results stay on screen / celebrations calm" rule. The building and wall themselves stay.
- **Cutting Board**: PLAN.md §10 still describes "Cut it in half!" → "Now in quarters!" (fractions as pictures).
  Banana, cucumber, carrot and cheese no longer have the quarters stage.
- **Stand Mixer**: a tap on the lever can no longer reach Stir, Low or High (only Off ↔ Medium) unless he hits the
  exact speed dot or drags.
- No page errors in the smoke test on any of the 13 pages.

# Part B: Workshop, Birdhouse, Rocket, Car, Train
# Audit B: what the redesign removed or changed (Workshop, Rocket, Car, Train)

How this was checked: each page's version in the redesign commit's parent was compared with the current working
tree (data tables, panel HTML, click handlers, settings code). Later commits were checked too. The only later
commit that touched these pages is 5d5346d ("Workshop fix-ups"), which is included below. Styling and size
changes are left out.

---

## workshop/index.html (old Tool Wall + gear-up) -> workshop/index.html (map + gate) and workshop/tool-wall.html (249147e, then 5d5346d)

**Removed choices**
- **The 12 tool-section tabs (chips) under the wall are gone.** Before, tapping a tab jumped the wall to that section and the section's tools shook. Now the only way to get around is scrolling; the painted section signs on the wall stay.
- **The Use it | Parts toggle on an open tool card is gone.** The Parts view showed the tool drawn with every part labelled, leader lines, and the tool's description text (`t.d`). That code is still in `tool-wall.html` (`setView("parts")`, `layoutD`, `#dDesc`), but nothing calls it any more, so the labelled diagram and the descriptions can't be reached.
  - Replacement: a tap on the tool drawing pops up at most 6 part-name tags for 2.6 s, at most once every 5 s.

**Removed features or controls**
- **Station tiles in the Tool Wall panel.** Build a birdhouse, Drill Press, Saw Bench, Hammer & Screws, Lathe, Router Table, Wrenches, Measuring and Shadow Board are no longer on the Tool Wall. They moved to the Workshop map (`index.html`, 10 places).
- **The gear badge** (eye and ear protection) in the header.

**Changed behavior**
- **Gear-up.**
  - Before: he dragged the eye protection and the ear protection onto the worker one at a time (a tap put on just that item), then pressed "Open the Workshop!".
  - Now (`Toybox.gate`): one tap on the worker or on either item puts both on and the workshop opens by itself. Dragging a single item onto the worker still works.
- **Tool cards play by themselves.** A tap on the card's stage now plays the tool's whole job (`autoStart`).
- **Claw hammer:** pulling the old nail was a drag on the handle. Now it is a tap on the old nail.
- **The title** is "Tool Wall" (it was "Workshop Tool Wall").

**Moved, not removed**
- The stations moved to the Workshop map.
- All 81 tools are still on the wall (checked id by id).
- `?tool=` and `?next=` deep links are forwarded.

---

## workshop/saw-bench.html (9e731c7, then 5d5346d)

**Removed choices**
- **Saws on the rack:** it held 11 hand saws and 8 power saws. **Dozuki, Kataba and Fret saw were dropped from the Hand saws tiles** (`RACK.hand` is now ryoba, panel, backsaw, dovetail, coping, hacksaw, bow, keyhole). They still open from a Tool Wall card's "Try it!" link (`?tool=`), but there is no tile for them, and once he picks another saw he can't get them back.
- **Material picker** (picture buttons for every saw that has more than one stock):

  | Saw | Materials he could pick |
  | --- | --- |
  | Ryoba, Kataba, Panel saw, Table saw | Pine, Oak, Plywood |
  | Dozuki, Dovetail | Oak, Dowel |
  | Backsaw | Pine, Dowel |
  | Hacksaw | Pipe, Steel bar |
  | Circular saw | Plywood, Pine |
  | Band saw | Pine, Oak |
  | Scroll saw | Plywood, Pine |
  | Miter saw | 2x4 stud, Oak |
  | Reciprocating saw | Pipe, Stud |
  | Track saw | Plywood, Oak |

  It is gone. New now steps through the stock in turn.
- **Ryoba "Teeth: Crosscut | Rip"** is gone. It is always Crosscut.
- **Table saw "Rip | Crosscut"** is gone. Free play is always Rip, so crosscutting with the miter gauge (and its -30 / 0 / 30 angle) can only happen inside a project step.
- **Circular saw and Track saw depth** (− Shallow / Medium / Deep +) is gone. The depth is always the deepest.
- **Miter saw "Front view | Side view"** is gone. It is always the front view.
- **Band saw and Scroll saw "Top view / Front view"** (a drawn switch on the bench) is gone. It is always the front view.
- **Hand-saw scenes "Side view / My view"** is gone. It is always the operator's view.
- **Band saw and Scroll saw "Turn ↺ ↻" board buttons** are gone. Only a two-finger twist turns the board now.
- **Project mode (5d5346d):** crosscut steps used to let him pick any of 7 saws (Ryoba, Panel, Backsaw, Miter saw, Table saw, Circular, Track saw). The saw is now locked to the miter saw (the table saw for rips), and the saw tiles and job bar are hidden.

**Changed behavior**
- One tap finishes a whole cut on every saw.
- New brings the next stock in turn instead of the stock he picked.
- In project mode, one green Go ("Cut!" / "Rip it!") does the whole cut (5d5346d).

**Moved, not removed**
- The scroll saw speed knob, the miter-saw angle (drag, or tap to step) and the table-saw fence and blade height are still drawn on the machines.
- The curve-saw patterns still change with each new piece.
- New: Surprise (the scrap bin "dominoes", a long sawdust curl).

---

## workshop/project.html + workshop/projects.js (20ced94: the Birdhouse)

**Removed (the child no longer does these jobs; the plan just shows them done)**
- The project went from **22 station visits to 6**: Plane, Measure, Cut, Drill, Nail, Sand.
- **Measuring:** only "Measure the Back: 12" with the tape is left. Gone:
  - Front 9, Roof 7.5, Side blank 26, Side 10 (×2) and Floor 4 (combination square or tape);
  - the door mark, "6 up, make an X".
  - `covers` marks the old steps as done, but no station plays them.
  - The combination square is now unreachable anywhere: Measuring free play merged it into Square (see below), and the only project measure visit uses the tape.
- **Cutting:** only the Back crosscut on the miter saw is left. Gone (`job.more` exists in `projects.js`, but **saw-bench.html never reads it**):
  - crosscuts of the Front, Roof, Blank, both Sides and Floor;
  - **Rip the Side blank to 4 on the table saw** (the fence step);
  - **Cut the roof angle on both Sides** (miter saw pre-swung).
- **Drilling:** only the door hole with the hole saw is left. **The four drain holes in the Floor with the twist bit** are gone (`job.also` exists, but **drill-press.html never reads it**).

**Removed features or controls**
- **New is no longer a 2-second hold.** It is a one-tap New in the bottom bar and wipes the plan's progress at once (`startOver`). This makes accidental resets easy.
- **Step chips no longer answer a tap.** Before, a tap gave "Done: …" / "First: …" toasts and wiggled the part.
- **The counter** "Parts: N of 6" became "Houses: N".

**Changed behavior**
- One Go opens each station.
- **Hammer & Screws in project mode (5d5346d):** the Nails | Screws job bar and the hammer/driver tiles are hidden. Before (the old CSS kept `.modetabs` and the tool buttons visible in project mode), he could pick a hammer or the drill/driver for the joins.

**Moved, not removed**
- The Plan | Shelf tabs became the Shelf button.
- New: Surprise (everything hops; a bird visits).
- Old saves and old `?step=` links still map to the new visits.

---

## workshop/drill-press.html (570614d, then 5d5346d)

**Removed choices:** none. The 6 bits (Twist, Spade, Forstner, Hole saw, Auger, Step), New board and the project bit lists are all kept.

**Changed behavior**
- A green Go "Drill a hole" (and a tap on the feed handle) drills a whole hole by itself.
- A tap on the board slides that spot under the bit.
- Chips no longer leave the small heap on the board; they fade within about 1.2 s.

**Added:** Surprise (a worm, a ladybug).

---

## workshop/lathe.html (570614d)

**Removed choices**
- **Wood picker on New** (Pine, Oak, Walnut, Cherry) is gone. New and Shelf now step to the next wood in turn.

**Removed features or controls**
- **The always-visible shelf drawn on the stage** (and its "Finished pieces go here" label) is gone. The shelf is now a full-stage view behind the Shelf button.
- **The separate "Done" button** is gone.

**Changed behavior**
- **Go has two jobs.** It reads "Turn the wood" and runs a whole shaping pass. Once the current tool has been used, the same Go turns into **"Put it on the shelf"**, so a second Go press with the same tool shelves the piece instead of turning more. To keep turning he has to pick another tool or drag.
- The 4 tools (Roughing, Spindle, Skew, Parting) and Sand are kept as tiles.

**Added:** Surprise.

---

## workshop/router-table.html (570614d)

**Removed choices**
- **Bit height: Low | Middle | High** is gone. It is fixed at Middle (`S.lvl = 1`), so the profile depth no longer changes.
- **Wood: Pine | Oak | Walnut** is gone. Each new board steps to the next wood in turn.
- **The Bits / Height / Wood panel tabs** are gone.

**Removed features or controls**
- The always-visible shelf on the stage is gone. It is now behind the Shelf button.

**Changed behavior**
- One tap runs a whole pass.

**Kept:** the 5 bits (Roundover, Chamfer, Ogee, Cove, Straight) and the end-view corner panel.

---

## workshop/hammer-screws.html (1c390f5, then 5d5346d)

The nail-size and screw-length pickers were already fixed before the redesign (old line 957), so they are not losses from this batch.

**Removed choices**
- **Hit | Pull out** (claw) is gone. Now a tap on a nail that is all the way in pulls it with the claw.
- **Ball-peen face: Ball peen | Flat face** is gone. It is always the ball, so **"flatten" is gone**.
- **Mallet / dead-blow job: Post | Chisel** and **sledgehammer job: Wedge | Stake** are gone. Each hammer brings its own job (mallet = chisel, dead-blow = post, sledge = stake), and a tap right on the other object still works it.
- **Separate New buttons** (New board, New plate, New wood, New log, New stake) are now one New. In the yard it resets both the log and the stake.
- **Screw direction:**
  - hand drivers' "↻ Righty tighty | ↺ Lefty loosey" and the power drivers' "Forward ↻ / Reverse ↺" are gone;
  - direction is automatic: a tap on a screw that is in turns it back out.
- **The Tools | Supplies sub-tabs** are gone.

**Removed features or controls**
- **The on-stage Trigger button** for the drill/driver and impact driver (press and hold) is gone. Now he holds anywhere on the bench.
- **The cam-out card** (it said which screw it was, with a "Use the Torx driver" button) is gone. Now the coach line names the right driver and the second slip switches it for him.
- **The tool fact card** (iPad landscape, `FACTS`: one line per hammer and driver) is gone.

**Changed behavior**
- One tap hits until the nail is in, or turns the screw all the way.
- Birdhouse joins: one Go per join does the glue and both nails.

**Moved, not removed**
- Job bar Nails | Screws.
- 6 hammer tiles, 7 driver tiles.

**Added:** Surprise.

---

## workshop/wrenches.html (60aec48)

**Removed choices**
- **Ratchet direction button: Loosen | Tighten** is gone. The direction follows the bolt.

**Changed behavior**
- A bolt that is all the way out hops into the tray by itself. Before, he carried it; dragging a bolt still works.
- One tap on the tool turns the bolt all the way.

**Moved, not removed**
- Wrench | Ratchet became the job bar.
- The 5 sizes (8, 10, 13, 17, 19) are tiles.

**Added:** New and Surprise.

---

## workshop/measuring.html (60aec48 + common/toybox.js)

**Removed choices**
- **Tools: Tape, Combination square, Level, Speed square, Caliper.** **The combination square is gone from free play.** The job bar is Tape | Level | Square | Caliper, and old saves with `combosquare` load as Square.
- **Inches | Centimetres** (two copies of the toggle) is gone from the page.
- **Speed square edge: 90° | 45°** is gone. The edge is now picked by where the pencil starts.

**Removed features or controls**
- **The Zero button** (HTML) and the **drawn ZERO button** on the caliper are gone. The caliper zeroes itself, and old saved zeros are ignored. The drawn "ON" (decoration) is gone too.
- **Clear** (pencil lines) is now New.

**Changed behavior**
- One tap does each tool's whole move: the tape runs out and back; the level settles, or tips when it is already level; the square slides and draws; the caliper closes on a part.

**Moved, not removed**
- **Inches/cm moved to the home-screen Grown-ups sheet:** `SETTINGS` gained `measuring-cm` ("Measure in centimeters (instead of inches)", default off) in 60aec48.

**Added:** Surprise.

---

## workshop/shadow-board.html (60aec48)

**Removed choices**
- **Each board went from 12 tools to 8:**

  | Board | Tools removed |
  | --- | --- |
  | Hand tools | wooden mallet, utility knife, adjustable wrench, F-clamp |
  | Wrenches & pliers | 8 mm combination wrench, pipe wrench, needle-nose pliers, wire cutters |
  | Mixed | adjustable wrench, flathead screwdriver, 13 mm wrench, speed square |

**Removed features or controls**
- **The big "Mess it up!" button** that appeared over the finished board is gone. The bottom bar's New does it now.

**Changed behavior**
- A tap puts a tool away (dragging still works).

**Kept:** the 3 boards as tiles.

**Added:** Surprise.

---

## rocket-builder/index.html (4cb4a32)

**Removed choices**
- **Nose: Pointy | Round | Capsule | Dome.** **Round is gone.**
- **Fins: Swept | Big | Round | Zigzag.** **Round is gone.**
- **Stages (1 / 2 / 3) and Size (Short / Medium / Tall)** were two separate rows (9 combinations). They are **merged into one Body choice**: Small = 1 stage short, Medium = 2 medium, Big = 3 tall. The other 6 combinations (for example 3 stages short, or 1 stage tall) are gone.
- **Colors:** the 8 swatches (Red, Orange, Yellow, Green, Blue, Purple, Pink, White) he picked directly for the nose, body or fins are replaced by a **Paint tile that steps to the next color**. The colors are the same 8, but he can't jump to one.
- **Trip choice (Moon | Mars | Planets)** was picked before launch. Now it is picked out in space after Launch, and **the Moon is chosen by itself after a few seconds** if he doesn't pick.

**Removed features or controls**
- The Build part buttons (Nose, Stages, Size, Fins, Windows, Boosters) and the ‹ › stepper are gone. Parts are picked by tapping the rocket.

**Looks broken**
- **Windows can't be reached again after "None".** Windows are only selectable by tapping a drawn window (`data-c="windows"`). Once he picks None, there is no window to tap, so Windows can't be brought back until New. Boosters are fine because the engine is always drawn.

**Kept:** the 4 Surprise moments (comet, satellite, saucer, face), Again and Build on the flight screen.

**Added:** New.

---

## car-builder/index.html (17aa80d)

**Removed choices**
- **Engine "None"** is gone (`NO_TILE.engine`). Only 1 pipe, 2 pipes and Blower are left.
- **These rows were whole picture rows** and are now **one action tile that steps to the next**, with no direct pick:

  | Row | Options before |
  | --- | --- |
  | Rims | Star, Spokes, Dish, Holes |
  | Stripes | None, Stripes, Flames, Checks, Zigzag |
  | Number | None, 1–9 (10 options; up to 9 taps to reach one) |
  | Roof topper | None, Beacon, Lights / Spoiler, Big wing / Roll bar, Light bar; F1 wing Small, Medium, Big |
  | Colors (body and builder's arm, blade, bed or drum) | 8 swatches (Red, Orange, Yellow, Green, Sky, Blue, Purple, Pink) |

**Removed features or controls**
- **The Vehicle tab** (families + kinds as picture rows) became the job bar (Builders | Fast cars | Monsters) plus vehicle tiles when no part is picked.
- **The Build pager** (Tool / Wheels / Top / Engine / Lights / Paint pages, several rows of option pictures at once) and its tabs are gone. Parts are picked by tapping the vehicle, and at most 4 tiles show.

**Kept:** every vehicle and data table is unchanged (same `OPT`, `KINDS`, `FAMILIES`); the drive screen (horn, actions, Go pedal); the 4 Surprise moments.

**Added:** New.

---

## train-builder/index.html (199a0d5)

**Removed choices**
- **Cars: boxcar, tanker, hopper, logs, pipes, containers, passenger, coal, caboose (9).** **The Pipes flatcar is gone** (`CAR_TILES` has 8). Old saves with pipes still draw.
- **Several engines (double-headers) are gone.** Each engine tile used to add another engine to the front. Now an engine tile *replaces* the lead engine, so there is only ever one.
- **Speed: Slow | Fast** tiles (picked any time) are gone. Now, after Go, the same button flips between "Faster!" and "Slower!" only while the train runs, and New resets it.
- **Night | Day toggle** (a lasting choice, saved) is gone. **It is now only a 14 s Surprise moment.** `state.night` is always false.
- **Paint:** the 10 swatches he picked directly for a tapped car are replaced by a Paint tile that steps to the next color.

**Removed features or controls**
- **Stop:** the Go button used to toggle Go! / Stop. **There is no way to stop the train now** (only New or the timer; tapping the engine only toots or starts it).
- **Take off for an engine:** before, a tapped engine got the same pane as a car (paint, Take off). Now a tap on the engine shows the engine tiles + Paint, with **no Take off**.
- **The Toot button** is gone. Now he taps the engine.
- **The Done button** on the selected-car pane is gone.
- **The Engines / Cars / Track tabs** are gone. The scene picks the tiles: the engine shows engines, the rails or a car show cars, the grass shows tracks.

**Kept:** the 4 engines, the 3 layouts (Oval, Figure 8, Switches), Surprise (cow, balloon, birds, face) plus night as a fifth moment.

---

## common/toybox.js SETTINGS (these batches)

- **Added `measuring-cm`** (60aec48): "Measure in centimeters (instead of inches)", default off. It replaces the child's in/cm toggle.
- No other SETTINGS change from these batches.
  - `mathgrid-twelve` was added in 213e777 (batch 6c, Math Grid, not in this audit's pages).
  - No setting was removed.

---

## Things that look broken or risky now

1. **Rocket Builder:** after Windows: None, Windows can't be picked again without New (nothing to tap).
2. **Birdhouse:**
   - `job.more` (the remaining cuts, the rip and the roof angle) and `job.also` (the drain holes) are defined, but no station plays them;
   - the plan just marks them done;
   - the combination square, the table-saw rip and the miter angle steps can no longer be reached.
3. **Birdhouse New is one tap with no hold:** it wipes the plan's progress immediately.
4. **Tool Wall:** the Parts view and the tool descriptions are dead code (`setView("parts")` is never called).
5. **Train Builder:** no Stop, and the lead engine can't be taken off.
6. **Saw Bench:** Dozuki, Kataba and Fret saw open only from a Tool Wall link; after switching saws they are unreachable.

# Part C: toys, Jigsaw, Garden, Bubbles, old farm field
# Audit C: features removed or changed by the redesign (batches 6a, 6b, 6c, 7A, 7B)

Method: `git show <commit>^:<path>` compared with the current working tree, reading the controls and the logic in both versions. No later commit touched these pages after their redesign commit (`git log <commit>^..HEAD -- <folder>` shows only the redesign commit). Pure styling and size changes are left out.

---

## Spin Shop (e5f8549)

**Removed choices**
- **Style** (whole row gone; every toy is stuck on its first style):
  - Wheel: Classic | Split | Swirl | Mesh | Windows (always Classic)
  - Fan: Ceiling | Desk | Box | Swoosh | Leaf | Propeller (always Ceiling)
  - Flower: Round | Pointy | Heart | Double (always Round)
  - Pinwheel: Classic | Pointy | Swirl (always Classic)
  - Jet engine: Airliner | Fighter | Turboprop | Turbojet (always Airliner)
- **Pattern**: One color | Take turns | Rainbow (gone). Each toy keeps its default: wheel, fan, flower and jet are always "One color", the pinwheel is always "Take turns". No rainbow blades. The second blade color (`main2`) can only be picked on the pinwheel.
- **Speed**: Stop | Slow | Fast | Zoom (gone). The motor always runs at Slow (or stays still under reduced motion). A finger fling still spins it.
- **How many** for every toy except the wheel: blades (fan), petals (flower), vanes (pinwheel) and jet blades are fixed at their defaults (5, 8, 4, 18). The wheel keeps − / + spokes, now on the stage. The **Min** and **Max** buttons are gone.
- **Ceiling-fan lights count**: − / + from 0 to 6 bulbs, then a "Dome" light (gone; always 3 bulbs). The light *color* can still be changed by tapping the lights.
- **Swatches for a part**: before, 7 colors (Red, Orange, Yellow, Green, Blue, Purple, Pink) plus the part's usual color (or Sky for blades). Now 6 (Orange dropped) plus the usual color (or Orange for blades, White for other parts). So Sky is gone for blades, and Orange is gone for tire, hub, middle, stem, stick and cowling unless it is that part's usual color.

**Removed controls**
- The tabs Make / Style.

**Changed behavior**
- Coloring still works by tapping a part. The swatches now replace the toy tiles in the panel, with a "Toys" tile to go back.
- New (added) resets the current toy to its defaults. Older saves keep their style and pattern, but he can't change them, and New throws them away.

**Moved, not removed**
- Make a: Wheel / Fan / Flower / Pinwheel / Jet engine are now the toy tiles. The wheel's spoke count is on the stage.
- Surprise is unchanged (roll / streamers / petals / seed / afterburner, taking turns with a face).

---

## Kaleidoscope (e5f8549)

**Removed choices**
- **How many**: 2 | 3 | 4 | 6 | 8 | 12 is now 3 | 4 | 6 | 8. 2 and 12 are gone, and an old save with them is changed to 3 or 8.
- **Color**: Rainbow plus 11 colors (Red, Orange, Yellow, Lime, Green, Sky, Blue, Purple, Pink, White, Black) is now Rainbow | Red | Blue | Green. Orange, Yellow, Lime, Sky, Purple, Pink, White and Black are gone.
- **Brush**: Small | Medium | Big (gone; always Medium).

**Removed features / Effects toggles** (the whole Effects tab)
- **Mirror** on/off: gone, always on.
- **Glow** on/off: gone, always on. The old default was **off**, so the look changed for everyone.
- **Lines** (guide lines) on/off: gone, always off.
- **Dark** (dark paper) on/off: gone, always light paper. Before, turning Glow on also switched Dark on. Now Glow is always on and the paper is always light.

**Changed behavior**
- A tap used to paint a dot. Now a tap paints a starburst.
- Clear became New (same action).

**Moved, not removed**
- **Spin**: the Effects toggle is now a tap on the knob in the middle of the picture.
- Surprise is unchanged (fractal zoom / bloom).

---

## Spirograph (e5f8549)

**Removed choices**
- **Pen hole**: Edge | Middle | Center (gone; always Edge). This was a separate row under the wheels. Picking a wheel now resets the hole to Edge.

**Removed features / controls**
- **Draw! / Stop** Go button:
  - Draw! rolled the wheel until the pattern closed (several laps), and Stop halted it.
  - Draw! on a finished pattern started a **new layer**: the wheel re-seated a few teeth over and the next solid pen went in. That auto-layer is gone.
- Tabs Gears / Rings / Pens / Mine.

**Changed behavior**
- A tap on the paper now rolls **one lap only**, so a pattern that needs several laps takes several taps.
- A tap on a **finished** pattern just rolls the wheel round over the old line. Nothing new is drawn and no new layer starts. It moves, but to him it looks like nothing happens.
- **Pens**: the 8 direct pen tiles (Red, Orange, Green, Blue, Purple, Pink, Rainbow, Glitter) became one "Pen" tile that steps to the next pen on each tap. All 8 pens still exist, but he can't pick one directly.
- New also resets the hole to Edge.

**Moved, not removed**
- Rings: Round / Oval / Flower / Triangle are tiles. Wheels: Small / Medium / Big are tiles.
- "Mine" is now the Shelf button, which opens over the paper. A tap on a drawing still puts it back on the paper.
- Surprise is unchanged (roll / spin / face).

---

## Peg Drop (54e1437)

**Removed choices**
- **Ball color**: Rainbow | Red | Orange | Yellow | Green | Sky | Blue | Purple (gone; always Rainbow).
- **Ball size**: Small | Big (gone; always Small).
- **Shoot** mode toggle (gone). In Shoot mode a press anywhere on the board aimed the cannon. Now only grabbing the cannon itself shoots, which also worked before in drop mode.

**Removed features**
- **Rain** toggle: it rained balls continuously until he switched it off. Now rain is only one of three Surprise moments and lasts 4.5 s.

**Changed behavior**
- Drop 10 became the Go "Drop!" (same action).
- Empty became New. It now also pops the balls in flight and stops the rain.

**Moved, not removed**
- Board: Classic / Bumpers / Spinners / Zigzag are tiles.
- Rain is now a Surprise moment.
- Surprise was **added** (there was none before): rainbow rain, a cannon fan, a peg wave.

---

## Marble Run (54e1437)

**Removed choices**
- **Lift**: Conveyor | Spiral (gone). Each run now forces its own lift:
  - Zigzag, Loop, Machine: conveyor.
  - Spiral, Funnels, Mix: spiral (screw).
  - Before, every run defaulted to the conveyor and he could switch any run to either lift. Only Kit forced the spiral.
- **Colors**: Mix | Rainbow | Red | Orange | Yellow | Green | Sky | Blue | Purple | Pink (gone; always Mix).

**Removed runs**
- **Mix 2**: a paddle wheel, a loop-de-loop, a funnel, then a xylophone ramp. The `BUILD.mix2` code is deleted.
- **Kit**: real marble-run-kit pieces in see-through jewel plastic on columns and red base plates. It had a stair-step track, a slotted funnel bowl, a long ramp into a ring catch, an S-curve and a half-pipe into a wavy squiggle, a hanging pinwheel, a paddle wheel in a clear case, and a swirl bowl with a spinner. The `BUILD.kit` code is deleted. An old save on mix2 or kit starts on Zigzag.

**Changed behavior**
- The panel **Drop** button (press = one marble, hold = keep dropping) is gone. Tapping or holding the hopper on the stage does the same.
- "Mix 1" is renamed "Mix".
- New (added) pops every marble.

**Moved, not removed**
- Lots! is now the Go.
- Surprise is unchanged (toy car / faces).

---

## Gear Box (54e1437)

**Removed choices**
- **Motor speed dial**: Off / Slow / Medium / Fast (0–60 in steps of 5). Gone; the motor always runs at one speed (30).

**Removed controls**
- **Long train** button (gone from the panel).
- The **Crank | Motor** switch.
- The **Drive this** button.

**Changed behavior**
- The Go "Turn!/Stop" turns the motor on and off. Grabbing the crank takes over from the motor.
- Drive this: now he taps an already-picked gear a second time to move the crank onto it.
- A tap on a gear tile places the gear (tiles are also draggable). This is the same as the old tray tap.
- The two-gear speed info ("Blue goes twice as fast") now appears in the coach pill instead of an info bar. The jam hint ("Three gears in a circle get stuck!") also moved to the coach.
- Before, Long train switched the motor on (speed 10). The first-visit long train now waits with the motor off.

**Moved, not removed**
- Long train now happens only through **Surprise**, when the plate has 0 or 1 gears. It also still loads on a first visit.

**Looks broken / against the rules**
- Surprise with exactly **one** gear on the plate calls `example("long")`, which **erases his gear** and builds the long train. That breaks the rule that Surprise never changes his build.
- The old empty-plate "rolling gear" moment can no longer happen on an empty plate.

---

## Math Grid (213e777)

**Removed choices**
- **0 to 10 | 0 to 12**: he can no longer pick it. It is now the grown-up setting `mathgrid-twelve` ("Grid from 0 to 12 (instead of 0 to 10)"), added to `SETTINGS` in common/toybox.js in this commit. AGENTS.md §6 still calls this the child's choice.
- **Multiples of N stepper** (− / + buttons, N from 1 to 12): gone. N is now the last number he tapped on the grid, if it is 2–12, or a tapped header number. Multiples of 1 is reachable only from the header.

**Changed behavior**
- Add | Times became the job tabs (same choice).
- The Blocks button no longer shows the equation it will build (it used to show e.g. "3 × 4").
- Clear became New (same action).
- Tapping any grid cell now silently changes the Multiples number.

**Moved, not removed**
- Doubles / Squares / Same answer / Multiples are tiles.
- Surprise was **added** (wave / faces / jelly).

---

## Water Table (213e777)

- **Nothing removed.** The 6 layouts are the same (Bowls, Zigzag, Wheels, Gears, Spinners, Steps).
- Added: New (empties the water), Surprise (duck ride, rainbow, wave), a tap on the squeegee that wipes the whole wall by itself, and bigger hit areas.
- The Wheels layout may now show more than 4 wheels (the cap of 4 was removed).
- Tap-a-cup-to-pour already existed.

---

## Sand Table (213e777)

**Removed choices**
- **Sand color**: Beach | Pink | Blue | Green | Purple | Space | Rainbow (gone; always Beach).

**Removed controls**
- **Draw! / Stop** Go button.
  - Draw! continued the current pattern, or after a finished one started the **next** shape on top.
  - Stop halted a pattern part-way.
- Separate **Smooth** and **New** buttons:
  - Smooth was the rake.
  - New was a fast rake that also cleared the visitors' surprise acts and reset the pattern to Spiral.

**Changed behavior**
- New now does only the Smooth rake.
- A tap on a shape tile draws it, as before. Re-tapping the finished shape draws a variant on top.
- Tap on the sand: the ball rolls there by itself (added).

**Moved, not removed**
- Rainbow and Space sand now appear only as a Surprise moment for about 6 s, then wash back to Beach.

**Looks broken**
- `stopDrawing()` is still defined but nothing calls it, so there is **no way to stop a pattern** once it starts. Dragging only pauses it, and it resumes 2.6 s later.

---

## Garden (7e8d2b8)

**Removed choices**
- **Choosing the spot by tapping**: before, he tapped a packet and then tapped a spot ("Tap a spot!"). Now a packet tap plants in the **next empty spot, left to right**. He can choose a spot only by dragging the packet.

**Changed behavior** (steps merged / automatic)
- Watering: one watering now takes a seed through the sprout **and straight on to leaves** (two stages).
- Sun: one tap now grows **every plant that is up all the way** to flower or fruit, stage after stage. Before, each tap grew each plant one stage.
- Picking: one tap picks the fruit. Before it needed 2 taps (first "Pull it up!") or a pull. Pulling still works.

**Moved, not removed**
- None. New and Surprise are unchanged; the Surprise code is identical.

---

## Hamster (7e8d2b8)

- **Nothing removed.** Treat! is now the shared Go and Surprise the shared bar, with the same 5 Surprise moments (flip, tunnel, ball, wave, super). The hamster is drawn 1.2× on upright phones.
- Minor: the ghost-hand comment says "taps the food jar, later carries the scoop", but the code shows the drag first. This is cosmetic.

---

## Bubble Machine (7e8d2b8)

**Changed / moved**
- **Soap colors** (Rainbow | Pink | Blue | Green | Glitter): the 5 tiles under a Colors tab are gone. A tap on the soap jar on the stage now steps to the next soap. All 5 still exist, but he can't pick one directly.
- The 7 wands are unchanged. The machine's switch and speed dial (Slow / Medium / Fast) are unchanged. The Surprise code is identical.
- Added: a tap on the sky sends the wand there to blow a stream.

---

## Spinning Tops (7e8d2b8)

- **Nothing removed.** The 5 tops are tiles; New and Surprise are unchanged.
- Added: a tap on a spinning top gives a medium flick.

---

## Jigsaw (eec88a6)

**Removed choices**
- **Piece count**: 4 | 6 | 9 | 12 | 16 | 24 is now 4 | 6 | 12. **9, 16 and 24 are gone.** The shelf still keeps old 16/24 entries, but the "real challenge" sizes can't be played any more.
- **Picking the size before the picture**: the size row used to show on the picture-chooser screen. It now shows only while a puzzle is being played, and picking a size restarts that puzzle.

**Changed behavior**
- **A tap on a piece flies it to its spot by itself.** Every puzzle can now be finished by tapping, with no fitting. This is a big change to the core play; dragging still works.
- New used to restart the same picture at the same size, newly cut. Now New goes **back to the picture chooser**. Re-tapping the current size tile does the restart.
- "Next puzzle!" used to go back to the chooser. Now "Do the next one" starts the **next picture in the list automatically**, at the same size.

**Moved, not removed**
- Pictures tab became New. "My shelf" became the Shelf button over the stage. Peek is now the Go "Peek!".
- Surprise is unchanged (alive / hop / face).

---

## Launcher (index.html) and common/toybox.js SETTINGS

- The launcher `index.html` was **not touched** by batches 6a–7B. Its last change is a762d58 (the Farm tile).
- `SETTINGS` in common/toybox.js: the only change in these batches is **`mathgrid-twelve`** (Math Grid 0 to 12), added in 213e777.
- Nothing else from these apps moved to home-screen settings. Kaleidoscope's Effects, Spin Shop's speed and Peg Drop's ball size were simply cut.

---

## Farm: what the old field ("It's Sow Time", farm/field.html before f7f5b9a) did that no station does now

field.html now only redirects to spuds.html. The old page:

- **Field work in real order**, one pass across the field per step, with Drive! or by dragging the tractor:
  - **Plow**: furrows, with gulls following the plow and worms poking out of the fresh furrows.
  - **Harrow**.
  - **Seed drill**: rows of sprouts come up behind it.
  - **Sprayer**.
  - No current station has a plow, harrow, seed drill or sprayer (checked with grep across farm/*.html and farm.js).
- **Automatic implement change**: the tractor lifts, drops the old implement on the headland, turns and hitches the next one, with a "Now the harrow!" line. The unhitched implement stays parked on the headland.
- **"Weeks go by"**: after spraying, the sprouted field grows and **turns golden wheat**. It showed the whole sow-to-ripe cycle. Combine Time starts from a field that is already ripe.
- A "jobs" counter of passes, plus the step strip Plow → Harrow → Drill → Sprayer → Wheat.
- **Surprise moments** (taking turns):
  - A hare runs across and the tractor stops, honks and flashes its lights. Hares now appear in Bales, Carrots and Silage.
  - A rain shower with puddles. Rain now appears in Combine.
  - A flock of gulls follows the implement. Gulls are now in Spuds.
  - Happy faces.
  - **The tractor swaps its wheels for crawler tracks for a while.** Caterpillar Hunt is a whole wheels-vs-tracks station, but it is not a quick swap on the field tractor.
