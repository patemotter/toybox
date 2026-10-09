# Forklift: design and engineering plan

## 1. Summary

**Recommendation: a new Construction Site station**, page `construction-site/forklift.html`, map lot label
**"Forklift"**, linked from the site map (`construction-site/index.html`) and behind the site's existing gear-up
(`site-gear`). He drives a **rough-terrain forklift** (the big-tired, straight-mast forklift used on building sites)
in the same flat side view as the other stations. A small **delivery truck** backs in with a stack of pallets
(bricks, concrete blocks, lumber, pipes). He slides the **forks** under the top pallet, lifts it, tilts the
**mast** back, drives with the forks low, lifts the load up to the **scaffold** where the bricklayer is building a
wall (or sets it down in the yard), lowers it, and backs out. The wall grows a row with each pallet of bricks or
blocks. When the truck is empty he loads the stack of empty pallets back onto it, and it drives off; the next truck
backs in. Main control: drag the forks (the forklift drives with the finger left and right; the forks follow it up
and down). Backup green **Go** ("Move it!") runs the next whole move. One counter: **"Pallets: N"**.
v1 is the straight-mast forklift; a **telehandler** (boom forklift) is the planned second machine (section 5).

### Option (a) vs option (b)
| | (a) Construction Site station | (b) Separate warehouse app |
| --- | --- | --- |
| The dad | "could be under construction app"; his shortlist line "forks under a pallet, raise the mast, load a truck" fits a site delivery as well as a dock | Not asked for |
| His interests | Construction vehicles and machines are on his list; it sits next to the excavator, crane and mixer he already plays with | Warehouses are not on his list |
| Reuse | Site gear-up, site timer text, the map, the tower crane's brick pallets and brick colors, the excavator's drag-the-tool pattern, the flat side-view style | New folder, manifest, four icons, a launcher tile (the launcher must fit every tile on one screen; each tile makes the rest smaller), its own look |
| Real fit | Rough-terrain forklifts and telehandlers really unload delivery trucks and serve scaffolds on sites | Counterbalance forklift, pallet racking, loading dock, dock leveler, box truck: also real and good |
| Result that stays | The wall he supplied grows, the yard fills with neat stacks | Racks fill up (good too) |
| Cost | One page + one map drawing (M) | One app (M-L) |

**Why (a):** the dad pointed at it; it reuses the site's gear-up, pallets and style; it adds a different job to the
site (delivery and placing materials) instead of another digging or lifting machine; and it keeps the launcher
from growing. The warehouse ideas worth keeping (stacking to a height, loading a truck) are inside the station:
unstacking the truck's pallet stack, stacking two-high in the yard, and loading the empties. A warehouse can come
later as a second forklift page if he loves it (open question 5).

### How it fits among the other site stations
PLAN.md section 5 plans **Dump truck** (haul dirt) and **Big auger** (drill for foundations) next. The site then
tells the real order of a build: Excavator digs, Dump truck hauls, Big auger drills, Concrete pours, **Forklift
brings the materials**, Tower crane builds high, Wrecking ball knocks down. The forklift is the only station about
**deliveries and placing loads at a height**, so it does not repeat the others. It overlaps the tower crane a little
(both carry brick pallets up), and the difference is kept visible: the forklift drives and lifts from the ground to
the scaffold (low and middle), the crane lifts to the top floors. Suggested map order: Excavator, Dump truck,
Concrete, Forklift, Tower crane, Wrecking ball, Big auger (or in build order; the dad picks). It is one page owned
by one agent, so it can be built alongside the dump truck or auger agents (three agents at most).

---

## 2. The real thing

### The machine: rough-terrain forklift (straight mast)
Parts, as drawn and as named in coach lines where it helps:
- **Forks** (also called tines): two steel L-shaped arms; the flat **blade** goes under the load, the upright
  **shank** hangs on the carriage. The bend is the **heel**.
- **Carriage**: the steel plate the forks hang on; it rides up and down inside the mast on rollers.
- **Load backrest**: the steel grille above the carriage that stops a tall load tipping back toward the driver.
- **Mast**: the upright steel channels (rails). v1 draws a **two-stage mast**: the **outer channel** is fixed to
  the machine; the **inner channel** slides up out of it. With **free lift** the carriage first rises inside the
  mast without the mast getting taller; after that the inner channel rises too.
- **Lift chains**: run from the carriage over a **chain sheave** (pulley wheel) at the top of the inner channel
  and down to an anchor. Visible and moving: one of the best parts to watch.
- **Lift cylinder**: the big hydraulic cylinder in the middle of the mast that pushes the inner channel up.
- **Tilt cylinders**: two short cylinders between the frame and the mast; they lean the mast **forward** (to
  slide into and out of a pallet) and **back** (to cradle the load while driving).
- **Overhead guard**: the steel cage roof over the driver, protecting him from falling things.
- **Counterweight**: the heavy rounded iron block at the back that balances the load on the forks.
- **Cab / seat** with the **seat belt**, the **steering wheel**, the **lift lever** and the **tilt lever**
  (pull back to lift / tilt back, push forward to lower / tilt forward), the **horn** button.
- **Big knobbly tires** (rough terrain), front-wheel drive, **rear-wheel steering** (why forklifts turn so tightly).
- **Amber beacon** on the guard, **backup alarm**, headlights, a step and grab handle.
- The **operator**: hi-vis vest, hard hat, seat belt on (drawn, not a step).

### The loads
- **Pallet**: wooden deck boards on three **stringers** or blocks, with two **fork openings** in the side we see.
- Loads: a pallet of **bricks** (red, held with steel banding), **concrete blocks** (grey, the holes visible on top),
  **lumber** (a stack of boards with thin spacer strips between layers, strapped), **pipes** (a bundle of plastic
  pipes, round ends toward us, strapped). An empty pallet; a stack of empties.
- The **delivery truck**: a short flatbed (stake-bed) truck whose bed carries **one stack of up to three pallets**
  at its rear (see section 6, "unloading from the end").
- The **scaffold**: steel tube frames with braces and two wooden **decks** (a low lift and a high lift), with a
  toe board and guard rail on the far side, standing against the house wall. A **bricklayer** (hard hat, trowel)
  works on the deck by the wall.

### The real moves, in order (one pallet)
1. Drive up to the load with the forks **low** and level.
2. Line up: forks at the height of the fork openings, square to the pallet.
3. Drive in slowly until the pallet touches the **load backrest** (forks all the way under).
4. **Lift** the pallet just clear.
5. **Tilt back** a little so the load leans against the backrest.
6. **Back out** (backup alarm, look behind), then drive to the place with the forks **low** (just off the ground).
7. At the place: stop, **lift** to just above the place, **tilt level**, inch forward.
8. **Lower** until the pallet sits on the place and the forks are free.
9. **Back out** straight, then lower the forks to travel height.
10. Parked: forks **flat on the ground**, mast tilted forward a little, beacon off.
Safety habits shown by the machine itself: forks low while driving, mast tilted back with a load, horn at the
corner and when someone walks by, backup alarm and beacon when reversing, seat belt on, nobody under the forks.

### Kept, simplified, dropped
- **Kept**: every move above, the real part names, the free lift and the rising inner channel, the moving chains,
  the tilt, unstacking from the top of a stack, stacking two high, loading the truck, the backup alarm, the horn.
- **Simplified (happens by itself, visibly)**: lining up the fork height (the forks snap to the openings when
  close), driving the last bit until the pallet touches the backrest, tilt back after lifting and tilt level
  before placing, lowering to travel height when he drives a long way with a load, inching slowly at height,
  turning around (a quick turn in place when he drags far behind the machine), squaring up to a stack.
- **Dropped** (no procedural extras): starting the engine, the key, the seat belt step, the parking brake,
  choosing a gear, spreading the forks to the pallet width, side shift, checking the capacity plate and the load
  chart (numbers), tying down loads on the truck, the truck driver's paperwork, setting up the scaffold.

---

## 3. Experience design

### Scene and view
One continuous yard in side view, y up, ground flat (packed gravel), the camera follows the forklift.
Left to right:
- **Truck bay** (left): the delivery truck, cab facing left, its bed rear toward the yard; a small curb and cones.
- **Yard** (middle): three **lay-down spots** on the ground, each a painted rectangle with a faint picture of the
  load that goes there (lumber, pipes, anything); a pallet can be stacked two high on a spot.
- **Scaffold and house** (right): the two-deck scaffold, and behind it the house's **wall** growing in rows. Each
  deck has one **landing spot** at its open (left) end, marked with a faint outline.
- Sky, sun, clouds, a far fence and the tower crane in the distance (the same site).

The forklift is the hero: on every size it is about a third to a half of the stage width. The cutaway trick is not
needed: everything is visible from the side.

Facing: the forklift faces **left** at the truck and **right** at the yard and scaffold. It drives forward or
backward with the finger; when he drags more than about 1.3 forklift lengths **behind** it and holds, it turns
around in place (0.7 s: the body narrows to edge-on and widens again the other way, the rear wheels swing, a curve
of tire marks on the gravel). This is real (rear-wheel steering turns a forklift almost on the spot) and needs no
button.

### One obvious first action
The forklift starts in the yard facing left toward the truck, forks low. The truck has just backed in (its backup
lights blink twice, then stop). The forks glow softly (pulsing yellow outline). Coach: **"Drag the forks to the
pallet!"** Ghost hand: presses on the forks and drags them left to the top pallet's fork openings.

### Coach lines (one at a time, always true)
- Forks empty, pallets on the truck: "Drag the forks to the pallet!"
- Forks under a pallet, not lifted: "Lift it up!"
- Carrying, next place is the scaffold: "Take it to the bricklayer!"; next place is the yard: "Put it in the yard!"
- Carrying, at the place but too high: "Lower it down!"
- Pallet placed, forks still in: "Back out!"
- Truck empty, empties waiting on the scaffold: "Load the empty pallets on the truck!"
Flash lines (about 3 s): "Forks in!", "Up it goes!", "Set it down!", "A new row!" (wall), "Truck loaded!",
"Here comes the next truck!". Tapping the cab: "Beep beep!".

### Interactions

**Drag the forks (main control).** Touch anywhere on the stage and drag; a small fork-shaped marker shows where the
finger is. The forklift drives so its **fork tips** move toward the finger's x; the carriage moves toward the
finger's y. Both are speed-limited and eased, so it looks heavy and calm, but it starts moving the moment he
touches.
- **Driving**: wheels turn, the body bobs on the tires, a little dust kicks up behind. Reversing: the beacon
  flashes and small "beep" arcs pop from the back (visible with sound off).
- **Lifting**: with no load the carriage first rises inside the mast (free lift), then the inner channel slides up
  out of the outer one, the lift cylinder's rod extends, the chains run over the sheave (the chain links visibly
  scroll), the sheave turns. Lowering does the reverse.
- **Forks in**: when the forks reach a pallet within about half a pallet's height of its openings, the carriage
  snaps to the opening height and the forklift drives in by itself until the pallet touches the load backrest
  (clunk, the pallet nudges, "Forks in!"). Drag up: the pallet lifts with the forks.
- **Tilt back**: as soon as a loaded pallet clears its support the tilt cylinders extend and the mast leans back a
  few degrees (clearly visible, the load settles against the backrest). Before setting down it tilts level again.
- **Forks low to drive**: dragging a long way with a load and the forks high, the carriage first comes down to
  travel height (just off the ground), then the forklift drives at full speed. Near the place it lifts toward the
  finger again. At height it only **inches** (slow). This is the real habit, done by the machine, never a scolding.
- **Set it down**: lowering a pallet within about a pallet width of a free spot (truck bed, yard spot, scaffold
  landing, top of another pallet in the yard) squares it onto the spot and it sits down (thud, a puff of dust,
  "Set it down!"). Lowering in empty air over the ground: the pallet sets down where it is (anywhere on the ground
  is fine, no wrong place). Lowering over a spot that is taken: it stacks on top if stacking is allowed there,
  otherwise the forks stop just above and the coach says "That spot is full!" with a sparkle on a free spot.
- **Back out**: dragging back with the forks empty under a placed pallet slides them out (the pallet stays put).
- **Bumping**: the forks cannot pass through the truck, a pallet, the scaffold or the wall; they stop against it
  with a small bounce. After two bumps in a row at the wrong height, the carriage moves itself to the right height
  (auto-assist, no message).

**The wall grows.** A bricks or blocks pallet set on a scaffold landing: the bricklayer walks over, lifts pieces
one by one onto the wall (about 6 visible lifts, calm), the wall gains a row ("A new row!"), and the now empty
pallet is stacked by the bricklayer at the deck's end. Lumber or pipes on the scaffold stay there as they are
(still fine). Blocks build the lower rows, bricks the upper rows; either one adds a row. The next landing to use
is the low deck until the wall passes it, then the high deck.

**Load the truck.** When the truck's bed is empty, the empty pallets on the scaffold sit as one stack. He forks
the stack, brings it down and sets it on the truck bed. The truck toots, its beacon flashes, it drives off left;
after about 3 s the next truck backs in (backup lights, a short beep arc) with a new stack. If there are no empties
yet (only lumber and pipes were in that load), the truck leaves as soon as it is empty.

**Horn.** Tap the cab or the operator: the horn sounds (when sound is on) and big "beep" rings pop from the front;
the operator waves. Tapping the truck: it toots back with its own rings.

**Go button "Move it!"** Runs the next whole move by itself at a calm pace: drive to the next pallet, forks in,
lift, tilt back, back out, turn if needed, drive with forks low, lift, inch in, tilt level, lower, back out. One
press does one pallet (about 14 s). Any touch on the stage stops the auto-move at once and he takes over from
there.

### Sound off
Every action is visible: the chains scroll, the cylinders extend, the beacon flashes and beep arcs pop when
reversing, the horn rings, dust and puffs on every set-down, the counter bumps, the wall row lands with a little
dust line, the truck's exhaust puffs and wheels turn.

### Panel
- **Go**: green **"Move it!"** (picture: a forklift carrying a pallet).
- **Choices**: none in v1 (one machine). Phase 2 adds two tiles: **Forklift** and **Telehandler**.
- **Tab bar**: orange **New** ("New wall": a new truck with a full stack, an empty yard, a bare wall),
  **Surprise** (rainbow outline).
- **Counter**: "Pallets: N", every pallet set down at a place (the stack of empties counts as one).

### Layout
Same shell as the tower crane page: header [‹ All machines] [Home] [Forklift] … [Big]; stage; panel under the stage
in portrait, a right column in landscape. The world is about 1700 units wide (truck bay 0–450, yard 450–1050,
scaffold and house 1050–1700) and about 650 units tall at the top of the mast at full lift.
- **390x844 (upright phone)**: stage about 390x560. Scale fits about 700 units of height (the full mast height plus
  the high deck plus a strip of sky), so about 480 units of width show: the camera pans horizontally to keep the
  forklift and the finger target in view, and leans ahead in the direction of travel. The forklift is about 230 px
  long. Panel: Go on the left, New and Surprise in one row. Coach pill at the bottom of the stage.
- **844x390 (sideways phone)**: stage about 690x340. Scale fits the full height (about 0.5 px per unit), so
  about 1350 units of width show: nearly the whole yard, a small pan. Panel column 150 px: Go on top, tabs below.
- **820x1180 (upright iPad)**: stage about 820x880. Fits full height with room; about 900 units width; pan.
- **1180x820 and 1024x1366 (iPad)**: the whole world fits sideways at about 0.6 px per unit (1180 wide); no pan.
- No orientation preference: both ways work (the tall mast suits upright, the long yard suits sideways).

### Surprise (fun moments on the current scene; they take turns)
Construction Site stations have no Surprise yet ("still to propose to the dad" in PLAN.md). Proposed set:
1. **Faces**: the forklift and the truck get cartoon eyes and a smile for about 5 s; the forklift "waves hello"
   by lifting and lowering its forks twice, the truck answers with a toot.
2. **Someone crossing**: a worker pushing a wheelbarrow walks across the yard; the forklift stops by itself,
   honks gently (rings), the worker waves and walks on, then play goes on (pedestrians first: a real habit).
3. **Brick hop**: the bricks on the nearest bricks pallet hop up one after another into a little tower, wobble
   and drop back into place.
4. **A bird on the guard**: a small bird lands on the overhead guard, rides along for a bit (it stays even if he
   drives), then flies up to the top of the wall and sits there.
While the auto-move or a turn is running, the moment waits until the forklift stops (at most about 2 s).

### Results, collections, fresh start
- **Results stay**: the wall, the stacks in the yard, everything on the scaffold, the truck stack. Nothing clears
  itself.
- When the wall reaches the top (8 rows), the bricklayer puts a little flag on it and a roof plate is set on top by
  the distant tower crane (a short calm animation); the house stays finished until New. `Toybox.kind()` here.
- Yard full (three spots, two high): the next trucks bring only bricks and blocks.
- **No collection** across visits. **Fresh visit**: a new wall, an empty yard, the first truck backing in, the
  forklift at its start spot, counter 0. A reload or coming back from the map keeps the state (like the crane).

### Timer ending and rest
`onEnding`: the auto-move or any drag stops; if carrying, the forklift sets the pallet down where it is (or on the
nearest free spot within reach); it backs out, drives to its parking spot by the fence, lowers the forks **flat on
the ground**, tilts the mast forward a little, the beacon goes off (the real parking habit), then `done()`. The
truck stays. Goodbye option: "Park it" (like the crane). Rest art: the forklift parked under a moon with forks on
the ground, a pallet beside it, "z z z". Rest line: **"The forklift is resting."** Line 2: "The forklift will be right
here next time."

### Kind words
`Toybox.kind()` when a truck is fully unloaded and sent off with its empties, and when the wall is finished.

### Safety ritual
None new: the site's gear-up (hard hat, vest, eye and ear protection) already covers it. The operator is drawn with
the seat belt on and a hard hat; the habits are done by the machine (above).

### Sound (Web Audio, soft, only when sound is on)
- Engine: a low hum (two detuned triangle oscillators through a lowpass at about 300 Hz), pitch and level rise
  gently with speed.
- Hydraulics: a soft whine (filtered noise through a bandpass, rising a little while lifting, falling lowering).
- Chains: tiny clicks while the carriage moves (short noise bursts at a rate following the speed).
- Tilt: a short low hiss. Forks in: a wooden clunk (low sine with fast decay plus a click).
- Set down: a soft thud. A new row: three soft taps (bricks) then a little chime.
- Backup alarm: a soft sine beep (about 1 kHz, quiet, 0.4 s on/off), only while reversing.
- Horn: two soft square tones through a lowpass. Truck toot: a lower two-tone. Air brake: a short filtered hiss.

### Numbers
Only the counter "Pallets: N". No capacity, heights, load chart, weights or row counts. The wall's 8 rows are
seen, never counted.

---

## 4. Engineering plan

### Files
- `construction-site/forklift.html` (new, the whole station; ES5 IIFE, inline CSS and JS, like `tower-crane.html`).
- Coordinator edits (shared files): `construction-site/index.html` (add `{ id: "forklift", label: "Forklift" }` to
  `STATIONS`, a `forklift(anim)` drawing for the map lot in `ART`, an `ICONBOX` and a `LOT` color; check the map
  layout with the new count), top-level `sw.js` (add `./construction-site/forklift.html` to `CORE`, bump
  `toybox-vN`), README's site line, PLAN.md section 5 (station list). No new app, so no `tools/add-app.py`, no
  manifest or icons, no launcher tile.

### Rendering
One `<canvas>` for the whole scene (like the tower crane): continuous motion, a panning camera, many moving parts
(chains, cylinders, particles). DPR capped at 2. Static layers (sky gradient, far fence, distant crane, scaffold
tubes, wall rows already built) are drawn into an offscreen canvas in world units and redrawn only when the wall
grows, the size changes or the camera scale changes; each frame blits the part in view, then draws the moving
things (forklift, pallets, truck, bricklayer, particles). Chunky #1D2340 outlines (4 px at a scale of 1), flat
colors, the site palette (`YEL #FFC93C`, `STEEL #9AA5B1`, the tower crane's brick `STYLES`).

### World and camera
Units are about centimeters (never shown). Ground y = 0. Fixed places:
`TRUCK_BED_TOP = 120`, truck bed rear x = 430; yard spots at x = 560, 740, 920; scaffold low deck top = 200, high
deck top = 400, landing spots at x = 1110 (left end of the decks); wall from x = 1240.
Camera: scale `s = stageH / VIEW_H` with `VIEW_H = 700`, but not smaller than `stageW / 1700` (so wide stages show
the whole world). Camera x eases toward `forkTipX + lead * dir`, clamped to the world, where `lead` is a quarter of
the visible width; when the finger target is off the visible width, the camera follows the target with a lag.

### Forklift model
```
F = { x, dir (+1 right / -1 left), vx, h (fork blade height above ground), vh,
      tilt (deg, + = back), load (pallet or null), turning (0..1 or null), auto (job list or null) }
geometry (dir = +1): front axle at x, fork tips at x + dir*TIP (TIP = 150: overhang + 110 fork blade),
counterweight back to x - dir*230. FREE_LIFT = 140, H_MAX = 460 (to reach the high deck plus a pallet).
```
Each frame (dt ≤ 0.05):
```
target = finger (or auto job step, or nothing)
if target:
  wantTipX = target.x;  wantH = clamp(target.y - FORK_GRAB_OFFSET, 0, H_MAX)
  if target is behind (dir*(wantTipX - tipX) < -1.3*LEN) and held 0.4 s and not turning: startTurn()
  // forks low to drive: carrying, far from target, forks high -> lower first
  far = |wantTipX - tipX| > 260
  if F.load and far and F.h > TRAVEL_H + 10: wantH = TRAVEL_H; driveCap = 0
  else driveCap = F.h > 120 ? INCH_SPEED : DRIVE_SPEED     // inch at height
  vx = approach(vx, clamp((wantTipX - tipX) * K_DRIVE, -driveCap, driveCap), ACCEL * dt)
  vh = approach(vh, clamp((wantH - F.h) * K_LIFT, -LIFT_SPEED, LIFT_SPEED), LIFT_ACCEL * dt)
x += vx*dt (then collide);  h += vh*dt (then collide)
tilt target: load && liftedClear ? 5 : (placing ? 0 : 2); tilt eases at 6 deg/s
```
Collisions are 1D tests in the forklift's lane: the fork blades (two thin rectangles at height h) against every
solid box (truck bed, pallets not on the forks, scaffold deck edges, wall, posts); the body against the truck's rear
and the scaffold's first post. On a hit: clamp x or h, `vx = -0.2 * vx` (small bounce), count bumps for auto-assist.

Forks in (per frame while not carrying):
```
for each pallet p that is reachable (on top of its stack, nothing above it):
  if facing p and |F.h - p.slotY| < 0.5*PALLET_H and fork tips within 30 of p's near face:
     F.h snaps (eased 0.15 s) to p.slotY; then auto-drive in until tipX reaches p.farFace - 5
     -> F.engaged = p   ("Forks in!")
if F.engaged and F.h > p.restY + 6: p is lifted -> F.load = p (p.y follows the forks, rotated by tilt)
```
Set down (while carrying, lowering):
```
spot = nearest free placement under the pallet within PALLET_W (bed, yard spot top, landing, ground)
if spot: when the pallet's bottom comes within 30 of spot.top, ease the pallet x to spot.x (0.2 s), tilt to 0
when pallet bottom <= spot.top: pallet rests there, F.load = null, F.engaged = pallet (forks still in)
backing out: when tipX leaves the pallet's near face, F.engaged = null
```
Turn: `turning` goes 0 to 1 over 0.7 s; draw with `ctx.scale(dir * cos(pi*t), 1)` around the body center
(edge-on at the middle, then `dir` flips), plus a skid arc. The load stays on the forks.

### Mast drawing
```
if h <= FREE_LIFT: carriageY = h, innerRise = 0
else:              innerRise = (h - FREE_LIFT) / 2;  carriageY = h      // chains double the travel
outer channel: from the axle up to OUTER_TOP (fixed)
inner channel: from innerRise to OUTER_TOP + innerRise; sheave at its top
chain: anchor on the outer channel low -> up to the sheave -> down to the carriage; draw links as a dashed
line whose dash offset = carriageY (so links move with the carriage); sheave rotation = carriageY / r
lift cylinder rod length = innerRise (or a short rise during free lift for the free-lift cylinder)
the mast group rotates by -tilt*dir around the mast foot pin; tilt cylinders drawn from frame to mast mid
```

### Truck, bricklayer, wall
- Truck state machine: `arriving` (backs in from off-screen left, backup lights, 4 s) → `parked` (stack of 1–3
  pallets on the bed) → when empty: `waiting` for empties (if any exist) → `leaving` (toot, drives off, 3 s) →
  next truck after 3 s. Loads per truck are chosen from what the wall and yard still need (bricks/blocks first; one
  lumber or pipes pallet when the yard has room).
- Bricklayer: a simple figure on the deck with states `idle` (trowel taps), `walk`, `lift` (6 lifts, 0.9 s each),
  `stack` (carries the empty pallet to the deck end). Wall rows: `rows` 0..8, each row drawn in bricks or blocks
  pattern; a row "lands" with a 0.3 s drop-in and a dust line.
- Empties: each used pallet joins `empties` (a stack at the deck end, drawn as up to 3 pallets). The stack is one
  carryable object (counts as one pallet).

### Auto-move ("Move it!") and ghost hand
The auto-move is a list of targets the forklift drives through using the same model as the finger (so it can never
do anything the child cannot): approach point at travel height, fork-in point, lift-clear point, back-out point,
(turn), approach the place at travel height, lift point, inch point, lower point, back-out point. Each step ends when
the model is within tolerance, then the next starts after a 0.3 s pause. A touch cancels it.
Ghost hand (master copy `tools/snippets/ghost-hand.js` and `.css`): after about 4.5 s idle, it drags from the forks to
the next useful point (the pallet's openings, then up, then the place), at most 2–3 times per visit, never again once
he has placed a pallet by hand (`ghost.learned()`).

### Particles and moments
A small pool (max about 80): dust puffs, tire grit, beep arcs (rings), horn rings, sparkles, the bird, the
wheelbarrow worker. Surprise moments are small state machines with their own clocks; they never move the pallets'
saved positions (the brick hop is drawn as an offset only).

### State and storage
- Key `site-forklift-v1` (localStorage, every access in try/catch), saved on every set-down and truck change:
  `{ v: 1, rows, wallDone, yard: [[kind,...] x3], deck: { low: kind|null, high: kind|null }, empties, truck: [kind,...],
  truckState, fork: { x, dir, h }, carrying: kind|null, count }`. A carried pallet is saved as set down at the
  forklift's position on load (no half-lifted restore).
- `Toybox.fresh()`: when true, write the default state (first truck backing in, everything empty) before drawing,
  as `tower-crane.html` does. Unknown or broken saved data falls back to the default.
- Gear check at the top of the script, copied from the tower crane: if `sessionStorage["site-gear"] !== "on"`,
  `location.replace("./?next=forklift")` (needs `forklift` in the map's `STATIONS` so `?next=` works).

### Integration
`Toybox.init({ app: "construction-site", big: { button: $("bigToggle") }, timerIntro: "When time is up, the forklift
sets its load down and parks, and the buttons lock. The timer carries on across the site pages.", goodbyeOption: "End
with a “Park it” button to press", goodbyeLabel: "Park it", farewellDone: "Bye bye, forklift!", restLine, restLine2,
restArt, soundNote: "Soft engine hums, beeps and clunks. Hold for 2 seconds.", legacy: {...same as the crane},
onEnding, onGoodbye, onRest, onWake, onBig, onTimer })`. No orientation option. No new SETTINGS entry; the "Good to know"
list needs no change (no turning, no special sound). `Toybox.offFirst` is not needed (no switched-on machine; the
engine just idles). Test hook `window.__forklift` only with `?debug` (state, toScreen, forkScreen, palletScreen(kind),
placeScreen, ghost).

### Performance
60 fps on iPad: one canvas, the static background cached offscreen, about 10 to 20 moving drawn objects plus at
most 80 particles, no shadows or filters, paths built once per shape per frame. Chain links are a dashed stroke,
not individual shapes. Pause the loop on the rest screen and when the page is hidden.

### Test plan
- Serve with `npx http-server . -p <port> -c-1 -s`; set `sessionStorage["site-gear"]="on"`; block Google Fonts.
- `node tools/smoke.js construction-site/forklift.html construction-site/` at 390x844, 844x390, 820x1180, 1180x820,
  1024x1366 (no errors, no page scroll).
- `node tools/buttons.js` (Move it!, New, Surprise, Big, Back, Home all change the screen) and `node tools/fit.js`
  (no cut labels: "Move it!", "New wall", "All machines").
- Playwright play script with `?debug`: drag from `forkScreen()` to `palletScreen(top)`, check `engaged`; drag up,
  check `carrying`; drag to `placeScreen()`, drop, check `count` = 1 and the pallet's spot; repeat until the truck
  is empty; check a wall row was added; load the empties, check the truck leaves and the next one arrives. Press
  Move it! and check one pallet is moved within about 20 s. Drag far behind: check `dir` flips. Bump test: drive the
  forks into the truck bed at the wrong height twice, check the auto height fix.
- Fresh start: set a launch id, reload, check the default state; plain reload keeps the state.
- Timer: set a 1-minute timer while carrying; check the pallet is set down, forks on the ground, rest screen.
- Screenshots at the five sizes, mid-lift with the mast fully up, and look at them (chains, cylinders, framing on
  the upright phone).

---

## 5. Phasing

**v1 (M, one agent, about one session):** the station page with the rough-terrain forklift, the truck cycle, the
yard, the two-deck scaffold, the bricklayer and the wall, Move it!, New, Surprise (the four moments), the ghost
hand and coach lines, the timer ending, sound. The coordinator adds the map lot drawing, `STATIONS`, `sw.js`.

**Later:**
1. **Telehandler** as a second machine (a choice tile Forklift / Telehandler, same page): the boom raises and
   telescopes out, the **stabilizers** (outriggers) come down by themselves before a high lift, the fork carriage
   stays level as the boom raises (real automatic leveling). It reaches the roof: deliver roof tiles and roof trusses
   to the top of the finished wall, which a straight mast cannot reach.
2. A second load-the-truck job: finished items (for example bundled scrap) going out.
3. Stacking challenge in the yard: three high with the mast at full lift.
4. If he loves it: a warehouse page (counterbalance forklift, racking with beams, a loading dock with a dock leveler
   and a box trailer), as a second forklift page or its own app.

---

## 6. Risks

- **Unloading from the end of the truck**: in a side view the forks can only reach the pallet nearest the bed's
  end, while real flatbeds are mostly unloaded from the side. Reduced by using a short stake-bed truck that carries
  a single stack at its rear, so every pallet is reachable from the end and unstacking from the top is real. If it
  looks wrong to the dad, the alternative is a rear view of the truck (open question 3).
- **The turn-around** may read oddly as a squash. Reduce: tire marks, the rear wheels visibly steering, the operator
  turning with it, a short 0.7 s; try a quick screenshot strip early.
- **Two axes from one finger** (drive and lift) can fight: a diagonal drag lifts and drives together. Reduce: the
  forks-low-to-drive rule and inch-at-height make the result look like a real operator's; tune `K_DRIVE` and
  `K_LIFT` with a real tablet; the snap-to-openings and auto-height after bumps keep it forgiving.
- **Upright phone width**: the yard is long. Reduce: the camera lead, the Move it! button for long trips, and the
  scaffold landing close to the yard.
- **Map crowding**: with Dump truck, Big auger and Forklift the map has seven lots. `chooseLayout` in
  `construction-site/index.html` only tries one row, one column and two rows; it may need a three-row option on
  upright phones (coordinator check at 390x844).
- **Overlap with the tower crane** (brick pallets, a growing wall). Reduce: a house wall at the scaffold (low),
  not floors; different finish (flag and a roof plate) and the delivery-truck loop as the center of play.

---

## 7. Open questions for the dad

1. Construction Site station (recommended) or a separate warehouse app?
2. Straight-mast forklift first (your words "raise the mast"), with the telehandler later; or the telehandler first
   (the boom forklift that is on most building sites)?
3. Is a short truck carrying one stack at its back OK, or should the truck be shown from behind so the forks can
   reach pallets along its side?
4. Should the wall growing be part of it (the bricklayer uses the bricks), or should the job be only moving and
   stacking pallets, with the truck loop as the whole game?
5. The Construction Site Surprise moments proposed here (faces, a worker crossing with a wheelbarrow, bricks
   hopping, a bird riding the overhead guard): good, and should the other site stations get the same kind?

---

## 8. Icon idea

As a station there is no app icon; the art is the **map lot drawing** `forklift(anim)` in
`construction-site/index.html` (same helpers and style as `excavator` and `towerCrane`): a yellow rough-terrain
forklift seen from the side facing right, big black knobbly tires, the dark grey mast with the inner channel raised
a little, the forks holding a red pallet of bricks with steel bands, the overhead guard with an amber beacon
(blinking when `anim`), the operator in a hard hat; beside it a short stack of a grey block pallet. Lot color a
warm sand like the others (`#D8B47C`). `ICONBOX` framed tight on the forklift and its pallet.
If the dad picks the separate app instead: the same forklift on a #CDE9FF full-bleed background, forks raised with a
pallet of brown boxes, chunky outlines, the subject inside the central 80% for the maskable icon.
