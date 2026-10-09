# Garbage Truck: design and engineering plan

## 1. Summary

A new top-level app, folder `garbage-truck/`, one page `garbage-truck/index.html`, tile name **"Garbage Truck"**.
He works a real **automated side-loader** garbage truck along a street of houses: he drives to each bin at
the curb, pulls the truck's **arm** out, its **grabber** closes on the bin, he lifts the bin up and tips it over
the **hopper**, shakes it out and sets it back. The **packer blade** pushes the loose trash out of the hopper and
squashes it into the **body**. When the body is full he drives to the **landfill**, backs up to the pile, the
**tailgate** lifts, the body tips and the whole squashed load slides out; the **landfill compactor** rolls over it.
Then back to a new street. The main control is dragging the grabber (like the Excavator's bucket), with backup
buttons that each run a whole motion. One page with two scenes (Street and Landfill) in one continuous world,
joined by a short drive. One counter: **"Bins: N"**. v1 is the side loader only; the rear loader, front loader and
recycling truck come later as truck choices (section 5).

---

## 2. The real thing

### The truck (automated side loader)
Real parts, front to back, as drawn and named in coach lines where it helps:
- **Cab**: low, flat-fronted cab with big windows. Side loaders are usually **right-hand drive**, so the driver
  sits on the curb side and watches the arm out of the side window. The driver is drawn in the near-side
  window (hi-vis shirt, no face details beyond a simple smile), visible because of our viewing angle.
- **Amber beacons** (flashing lights) on the cab roof and the body's rear corners, on whenever the truck works.
- **Arm** (lift arm): a hydraulic arm mounted behind the cab on the right side. It **reaches out** sideways to
  the curb (a telescoping boom), and a **lift** swings the grabbed bin up the side of the truck and turns it
  upside down over the hopper.
- **Grabber**: two curved **gripper arms** with rubber pads at the arm's end. They close around the bin's middle.
- **Hopper**: the open-top box behind the cab where the bins are emptied.
- **Packer blade** (packer panel): a steel wall in the hopper that slides from the front of the hopper to the
  rear, pushing the trash through the opening into the body and squashing it. One push and return is a
  **packer cycle**.
- **Body**: the big closed box where the squashed load builds up from the back toward the front.
- **Tailgate**: the rear door, hinged at the top, held shut by **tailgate locks** and lifted by two cylinders.
- **Body hoist**: two big cylinders under the front of the body that tip the body up to empty it. (Many real side
  loaders instead push the load out with the packer, called **full eject**; we use the tipping body because the
  load visibly slides out. See open questions.)
- Tandem rear axles, mud flaps, mirrors, a backup alarm.

### The bin (cart)
A two-wheeled wheeled bin with a hinged lid and a handle (the industry calls it a **cart**). Put out at the curb
with the lid opening toward the street and a little space around it. Contents drawn: tied trash bags (most), a
cardboard box, crumpled paper, a banana peel, an egg carton. No food mess, no smells, nothing gross.

### Real steps, in order
1. Drive along the street and stop with the arm lined up with the bin.
2. Arm reaches out; grabber closes on the bin.
3. Lift: the arm pulls the bin in and up the side of the truck and turns it upside down over the hopper; the lid
   flops open and the trash falls into the hopper. The operator gives it a **shake** to get everything out.
4. Arm lowers the bin back to the curb, grabber opens, arm comes back in.
5. Packer cycle: the packer blade pushes the hopper's trash into the body and squashes it (run every few bins,
   or whenever the hopper is full).
6. Repeat along the street until the body is full.
7. Drive to the landfill, back up to the **working face** (the spot where trucks unload today), backup alarm on.
8. Tailgate locks open, tailgate lifts, body hoist tips the body, the load slides out; a little shake.
9. Body down, tailgate down, locks shut. The **landfill compactor** (a big machine with spiked steel wheels and
   a front blade) drives over the new pile and flattens it.
10. Drive back for the next street.

### Kept, simplified, dropped
- **Kept**: every step above with the real part names; the shake; the lined-up stop; the packer pushing and
  squashing; the tailgate and the tipping body; backing up with the beep; the compactor.
- **Simplified**: lining up is forgiving (the truck nudges itself the last bit); the shake is automatic at the top
  of the lift; tailgate locks open and shut by themselves; the arm's reach and lift are one drag path.
- **Dropped** (no procedural extras): starting the engine, engaging the hydraulic pump, the joystick and cab
  switches, weighing at the landfill scale house (a number readout anyway), sorting anything, missed or
  overfilled bins, traffic.

---

## 3. Experience design

### Scenes and view
One continuous world scrolled by a camera that follows the truck.
- **Street** (left part of the world): a side view from a little above the near sidewalk (the operator's side of
  the truck). Top to bottom: sky, a row of houses across the street (each a different simple color, trees and
  fences between), the street, **the truck** facing right with its right side (arm side) toward us and the top of
  the hopper visible because we look slightly down on it, the near curb with **6 bins**, and a strip of sidewalk,
  grass, mailboxes and driveway gaps (the near houses are behind the camera). Depth (curb toward street) is
  drawn as a slant downward on screen, so "reach out to the curb" is a drag **down**, and "lift" is a drag **up**.
- **Road** (a short stretch with trees and a hill, about 4 s of driving) leads right to:
- **Landfill**: a gravel road up onto a wide brown mound with a flat working face, a few older flattened layers
  with green cover on the far slopes, the landfill compactor parked to one side, and gulls on the ground.
- **Body cutaway**: the body's near side panel is drawn see-through (the outline and ribs stay), so the squashed
  load is visible building up from the tailgate toward the hopper. This is the only way to see the packer's work
  from the side. (Open question for the dad.)

The truck is drawn big: on every size it takes most of the stage width at the arm and hopper.

### One obvious first action
The truck starts lined up at the first bin. The grabber glows softly (a pulsing yellow ring on the gripper arms).
Coach: **"Pull the arm to the bin!"** Ghost hand: presses on the grabber and drags it down to the bin.

### Coach lines (one at a time, always true)
- Arm stowed, lined up at a full bin: "Pull the arm to the bin!"
- Bin grabbed, not lifted: "Lift it up!"
- Bin upside down and empty: "Put it back!"
- Hopper over about half full: "Pack it down!" (shown once per load, then only when the hopper is full)
- Bin back at the curb, more full bins: "Drive to the next bin!"
- Body full or street done: "To the landfill!"
- At the working face: "Open the tailgate!", then "Tip the load!"
- Load out: "Back to the street!"
Flash lines (about 3 s): "Got it!" (grab), "All gone!" (bin empty), "Squash!" (packer), "Full!" (body full),
"Street done!" (all six bins).

### Interactions

**Drag the grabber (main control).** The arm follows the finger along its real path (one curve, see section
4): dragging down reaches the arm out toward the curb; dragging up pulls it in, lifts the bin up the truck's side
and turns it over the hopper.
- Reaching the bin: when the grabber gets within a big radius of the bin's middle, the gripper arms close by
  themselves with a clunk and a squeeze (pads press, the bin jiggles). Visible: the grabber glow turns green,
  "Got it!".
- Lift: the bin rises, tilts past level, the lid flops open (hinged, swings with a bounce), the contents tumble
  out in an arc into the hopper (bags bounce, the box flips, paper flutters). At the top it shakes twice by
  itself (the last bits drop), the bin counts as empty: counter **Bins +1** with a bump animation.
- Put it back: drag down; the bin turns upright and lowers to the curb; near the ground the grabber opens by
  itself and the arm glides back in when he lets go. The empty bin stays at the curb with its lid shut, a little
  askew, the way real ones end up (results stay).
- Let go mid-way: the arm holds where it is (hydraulics hold); a held bin never drops. If he lets go with the arm
  out and nothing grabbed, it glides back in after a moment.
- Grabbing air: reaching where there is no bin gives the gripper a little open-close snap and "Drive to a bin!",
  and the next bin gets a sparkle. If the bin is close (within about one bin width), the truck rolls itself the
  last bit to line up while the arm reaches (auto-assist, no message).
- Empty bins: grabbing an empty bin works (lift, tip, nothing falls out, a puff of dust) so the arm never feels
  broken; the counter does not go up and the coach says "That one is empty!".

**Drive.**
- Tap a full bin at the curb: the truck drives to it and stops lined up (air brake hiss puff, a gentle nose dip).
  This is how he "directs" the truck, also in Big mode.
- Drag the truck (finger on the cab or body, not the arm): it rolls with the finger, speed-limited, wheels
  turning, and snaps to line up when stopped near a bin.
- The Go button (below) drives to the next full bin.
- Driving with the arm out: the arm folds in first (calm, about 0.8 s), then the truck moves. Driving with a bin
  in the grabber: the bin is set back down first.

**Pack.** Tap the hopper, or the Pack tile: one packer cycle. The packer blade slides rearward through the
hopper (about 1.8 s), the loose trash piles up against it and goes into the body; in the cutaway the new layer
bulges in, then squashes flat with a bounce, a few crumbs puff up, the truck sinks a hair on its springs. The
blade slides back (about 1.2 s). Auto-assist: if the hopper is full when he tips another bin, the packer runs
by itself before the trash falls (the bin waits upside down). Tapping Pack with an empty hopper still runs the
blade (a visible answer), coach "The hopper is empty!".

**Full truck.** After the sixth bin plus a pack, the body is full: the beacons pulse faster for a moment, coach
"To the landfill!", the Go button reads "Landfill". Driving on without unloading is not possible: the next
street only comes after the landfill. If the street still has full bins when the body is full (he skipped
packing), the truck packs by itself; the body is sized so six bins always fit.

**Landfill.** Go (or dragging the truck past the "Landfill" arrow sign at the street's end, or tapping the
sign) drives there: the camera follows along the road. At the working face the truck stops, then backs up with
the backup alarm (visible "beep" marks behind it, as in the Excavator) and stops at the edge.
- **Tailgate**: drag the tailgate's bottom edge up (a glowing handle on it). The locks pop open with a clunk and
  the tailgate swings up on its top hinge, following the finger, and stays where he leaves it; past halfway it
  finishes opening by itself.
- **Tip**: drag the front of the body up (a glowing handle where the hoist cylinders are). The body tips about
  45 degrees; the load slides out of the back as one squashed block that breaks into chunks on the pile; the
  cutaway empties. At full tip it does one small shake. Lowering is by dragging back down, or by itself when he
  lets go after the load is out.
- **Two-step rule**: dragging the body up with the tailgate shut: the tailgate flashes and "Open the tailgate!";
  on the second try the tailgate opens by itself and the tip carries on.
- Body down: the tailgate closes by itself (locks clunk shut). The compactor then drives forward over the new
  pile (spiked wheels turning, blade pushing), flattening the heap, and backs off. Tapping the compactor makes it
  do another pass. Gulls lift off as the load lands and settle again.
- After the unload: Toybox.kind(), coach "Back to the street!", Go reads "Street".

**Back to the street.** The truck drives back left; the street has new house colors and six new full bins (the
empty ones from before stay until he leaves the street, so the finished street is on screen while he drives
to the landfill).

**Taps on everything else** give a small answer: houses (a light flicks on in a window), mailboxes (flag pops up),
trees (leaves shiver), the beacons (they flash brighter), the driver (waves).

### Sound off
Every action is visual: clunk squeeze on grab, lid flop, tumbling contents, the shake, crumbs and the bulging
then squashed layer, beacons, the brake puff, beep marks when backing, the block sliding out and breaking, the
compactor wheels, gulls flapping. The counter bumps.

### Panel
- **Go** (green, the next drive): label and icon follow the situation: "Next bin" (a bin icon with an arrow),
  "Landfill" (a mound icon), "Street" (a house icon). When the truck is already lined up at a full bin, Go stays
  enabled: a tap wiggles the grabber and shows "Pull the arm to the bin!" (no dead buttons).
- **Choices** (two picture tiles, one row):
  - Street: **Grab** (runs the whole bin motion: reach, grab, lift, tip, shake, put back, stow; if not lined up it
    drives to the nearest full bin first) and **Pack** (one packer cycle).
  - Landfill: **Empty** (the whole unload: tailgate up, tip, slide out, shake, down, close) and **Pack** (still
    works: the blade runs; inside the landfill it simply pushes nothing).
  - Pressing a tile while its motion runs gives the shared wiggle and does nothing else; pressing the other one
    queues it (as the Excavator's Dig/Dump do).
- **Tab bar**: **New** (orange: a new street with full bins and an empty truck back at the first bin; the counter
  stays for the visit) and **Surprise**. No section tabs in v1 (later: a **Trucks** tab, see section 5).
- **Counter**: "Bins: N" (top-left), every bin he emptied this visit (both by hand and with Grab).

### Layout
Panel order: Go row, the two tiles, the tab bar (New, Surprise).
- **390x844 (upright phone)**: stage about 370x560. The camera frames the cab, arm and hopper (about 75% of the
  truck's length) at full stage width, curb and bins in the bottom fifth, the lift arc and houses above, so the
  arm is big; it pans to the rear when the tailgate or body is in use and follows the truck while driving (the
  Tower crane's follow camera). Panel: Go (52 px), one row of two tiles, tab bar: three rows total; tiles show
  picture plus word. Coach at the bottom-center of the stage, above the curb strip (the stage keeps 56 px of
  ground below the bins for it, as the Excavator does).
- **844x390 (sideways phone)**: stage on the left about 520x330, panel column on the right (Go, two tiles side by
  side, tab bar at the bottom). The camera fits height (curb to the top of the lift arc) and shows about the
  whole truck plus half a house either side.
- **820x1180 (upright iPad)**: stage about 800x820: the whole truck, two houses either side, the lift arc with
  sky to spare; the camera pans only while driving. Panel under it: Go, tiles, tabs.
- **1180x820 (sideways iPad)**: stage about 760x700, panel column on the right: the whole truck and about three
  houses; at the landfill the working face, the compactor and the truck all fit.
- **1024x1366**: like 820x1180, a bit more street.
- **Orientation preference: none.** The scene works both ways; the camera handles upright framing.
- **Big mode**: hides the panel; everything still works on the scene: drag the grabber, tap a bin to drive to it,
  tap the hopper to pack, tap the Landfill sign or drag the truck to drive there, drag the tailgate and body.

### Surprise (fun moments on the current scene; they take turns)
1. **Wave and honk**: a child in a house window across the street waves; the driver leans out of the window and
   waves back, and the truck gives two honks (honk lines drawn at the horn; sound only if on). A dog in the next
   window wags.
2. **Bin faces**: every bin on the curb gets a happy face for about 4 s (blinks, smiles, eyes follow his finger),
   the lids flap like they are talking, and they do a little hop in turn, full and empty alike.
3. **Raccoon peek**: the lid of the next full bin lifts, a raccoon peeks out, waves, hops down and scampers up a
   tree; it sits on a branch for a while and climbs down later. (Never inside a bin that gets tipped.)
4. **At the landfill** (replaces whichever would not fit): the gulls lift off together and circle over the truck
   in a loop, then land on the compactor's roof.
Surprise while a motion runs: it plays alongside and never stops the motion.

### Results, collections, fresh start
- Results stay: emptied bins stay at the curb; the body's load stays in the cutaway until he unloads; the new
  layer on the landfill stays (it builds up over the visit, flattened each time).
- No collections in v1.
- Fresh visit (`Toybox.fresh()`): first street, six full bins, empty truck lined up at the first bin, counter 0,
  landfill back to its starting heap.
- Reload or rotate: keeps the street, which bins are done, hopper and body contents, the scene, the counter.

### Timer ending and rest
`onEnding`: any running motion finishes its current safe step (a held bin is set back down, the grabber opens, the
arm stows; a tipped body lowers and the tailgate shuts), the truck rolls to a stop at the curb, the beacons stop
flashing, the driver's window light goes off. `endingMaxMs` about 15000 is enough. Goodbye button "Honk goodbye":
two soft honks and the driver waves. Rest art: the truck parked at night by a house, beacons dark, a moon, "z z z"
above the cab. Rest line: **"The garbage truck is resting."** Line 2: "It will be right here next time."
Kind words: `Toybox.kind()` after each finished street (sixth bin emptied) and after each unload at the landfill.

### Safety ritual
None. The real crew wear hi-vis, but a gear-up screen here would only add a step (the dad toned these down). The
driver's hi-vis shirt is drawn.

### Sound (Web Audio, soft, only when sound is on)
- Diesel idle: a low sawtooth around 45 Hz through a low-pass filter, very low gain, slight wobble; rises a
  little while driving.
- Hydraulic whine while the arm, tailgate or hoist move: band-passed noise whose pitch follows the motion speed.
- Grab clunk: a short low thump (sine drop 120 to 60 Hz) plus a click.
- Tumble: a few soft noise bursts with low-pass, staggered (bags thud, box knocks).
- Packer: a low groan (filtered noise swelling) and a soft crunch crackle at the squash.
- Air brake: a short high-passed noise "pssh".
- Backup alarm: a soft sine beep around 900 Hz, low gain, slow cadence.
- Horn: two detuned square waves through a low-pass, short and gentle.
- Gulls: two quick pitch-bent sine chirps.

### Numbers
Only "Bins: N". No fill percentage, weight, volume or gauges: the body's fullness is shown by the cutaway.

---

## 4. Engineering plan

### Files
- `garbage-truck/index.html` (inline CSS and JS, `"use strict"` IIFE, ES5), `manifest.webmanifest`,
  `icons/icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. No `sw.js`.
- **Single page, two scenes**: the street and the landfill share the truck and its state, and the drive between
  them is part of the fun; separate pages would cut the drive and reload the truck. When other trucks are added
  (section 5), they share the route and the landfill, so they stay on this page as Truck choices. If the file
  grows past about 2500 lines, shared drawing can move to `garbage-truck/scene.js` (a plain script like
  `workshop/projects.js`, added to sw.js CORE).

### Rendering
- **One canvas** for the world (`#cv`, DPR capped at 2), world units with y up, ground at y = 0 (the Excavator's
  conventions: `worldT()`, `screenToWorld()`), camera offset OX/OY and scale S.
- **Pre-rendered layers**: each street's backdrop (sky gradient, houses, trees, fences, far street edge) and the
  landfill backdrop are drawn once per street into an offscreen canvas strip (world width times stage height at
  the current scale), blitted with the camera offset each frame. Redrawn on resize and on a new street.
- **Per frame (vector)**: the truck (cab, driver, beacons, arm, grabber, hopper with its contents, packer blade,
  cutaway body with load, tailgate, wheels), bins, the near curb strip, particles, compactor, gulls.
- **Body load texture**: a small offscreen canvas of squashed trash (flattened colored bits on a gray-brown base)
  made once, used as a pattern clipped to the load shape.
- Tiles: inline SVG in the HTML (like the Excavator's Dig and Dump tiles).

### Projection
Oblique: a point (x, z, d) (along the street, height, depth toward the curb) draws at
`screenX = x + d * 0.18`, `screenY(world y) = z - d * 0.55`. The truck's near side is at d = 0, the curb at
d = CURB_D, the hopper's far wall at d = -TRUCK_W. Bins sit at d = CURB_D.

### Arm model
The arm is one path parameter `s` in [-1, 1]:
- s in [-1, 0]: reach. Grabber at x = ARM_X (truck-relative), z = Z_GRAB, d = -s * CURB_D (out to the curb at
  s = -1).
- s in [0, 0.55]: lift. The arm pulls the grabber in to d = 0 while z rises from Z_GRAB to Z_TOP along an arc
  up the truck's side.
- s in [0.55, 1]: tip. The grabber swings over the hopper (d from 0 to -0.4 TRUCK_W, z up a little), the bin's
  angle goes from 0 to 140 degrees. Lid angle follows gravity (a damped spring toward "hanging open" once the bin
  passes 90 degrees).

```
// Precompute PATH[i] = screen point of the grabber for s = -1 + 2*i/N (N = 120), refreshed when the camera moves.
function dragArm(fingerScreen) {
  // search only near the current s so the arm never jumps across the curve
  var best = s, bestD = Infinity;
  for (var j = idx(s) - 25; j <= idx(s) + 25; j++) { d = dist(PATH[j], finger); if (d < bestD) { bestD = d; best = sOf(j); } }
  target = best;
}
// each frame: s moves toward target at most ARM_RATE * dt (rate about 0.9 per second, calm but responsive)
// gating: without a bin, s is capped at 0.2 (the arm lifts a little, no tipping); s > 0.55 only when gripping
// grip: if (!grip && s < -0.92 && |truck.x + ARM_X - bin.x| < LINE_TOL) closeGrip(bin)
//       if (|...| < ASSIST_TOL) truck.target = bin.x - ARM_X  // nudge to line up while reaching
// release: if (grip && s < -0.95 && fingerUp) openGrip(); then s glides to 0 after 0.6 s
// tip: on crossing s > 0.85 with a full bin: if hopper.full -> pause at 0.85, run packer, then continue
//      at s >= 0.98 start shake (angle +-8 degrees, 2 cycles, 0.3 s each), spawn contents, bin.full = false, bins++
```
The backup **Grab** motion is a short step list like the Excavator's `digPlan()`: `[lineUp, reachTo(-1), grip,
liftTo(1), shake, liftTo(-1), release, stow]`, each step driving `target` at a calm rate; a finger on the grabber
cancels the plan and takes over.

### Truck driving
`truck = { x, v, target }`; acceleration-limited approach to the target (max speed about 1.2 truck lengths per
second, ease-in-out), wheel angle from distance travelled, a small spring for body pitch (nose dip on braking).
Lined up means `|truck.x + ARM_X - bin.x| < LINE_TOL`. Drag on the truck sets target = finger x minus the grab
offset; on release, snap to the nearest bin within one bin width.

### Hopper contents and packer
- Hopper interior is a box seen from slightly above; contents are **items** (`{kind, x, y, vx, vy, rot, vr,
  settled}`) with simple gravity, bounce, and a column heightmap `hop[i]` (12 columns) for settling, like the
  Excavator's `gheap`. Settled items stay as sprites (cap 40; beyond that the heightmap rises with a textured
  fill).
- `hopperVol` = sum of the heightmap. "Full" when it reaches the hopper rim.
- **Packer cycle** (state machine `idle -> push -> squash -> return -> idle`): blade position p goes 0 to 1 over
  1.8 s. Every column behind the blade (`i < p * N`) moves its height and its items to the column at the blade
  face; the pile at the face rises (items get pushed with the blade); at p = 1 the pile goes through the opening:
  `body.fill += hopperVol * COMPACT` (COMPACT about 0.35, so six bins fill the body), a new load layer is added
  with a bulge animation (`layer.squash` from 1.4 to 1 with an overshoot), crumbs spawn. Then the blade returns
  over 1.2 s.

### Body and unload
- `body.fill` in [0, 1] draws as the load block in the cutaway, from the tailgate forward, the newest layer at its
  front edge.
- Unload state machine: `parked -> backing -> atFace -> (tailgate a: 0..1 by drag or auto) -> (tilt t: 0..1 by drag
  or auto) -> sliding -> shaking -> lowering -> closing -> done`.
- Sliding: once t > 0.6 and the tailgate is open, the load block moves along the body axis with acceleration
  `g * sin(tilt)`; when its rear end passes the tailgate it falls as a rigid block, and on landing splits into
  6 to 10 chunks (polygons) that tumble onto a landfill heightmap `lf[i]`; `body.fill` goes to 0.
- Compactor: after `done`, it drives over the heap left to right and back (about 5 s); columns under its wheels
  lerp toward the flattened height; spiked wheels rotate with distance. Each unload raises the base layer a
  little (capped so the mound never grows off-screen).

### Camera
Like the Tower crane's `camera(dt)`: visible width depends on the stage (upright phones about 0.75 truck length,
wide stages more), focus point is the arm and hopper while loading, the tailgate while unloading, the truck's
middle while driving (with a lead in the driving direction); smoothed with `1 - exp(-2.6 dt)`, clamped to the world.
Vertical: the curb sits a fixed distance above the stage bottom (plus 56 px on phones for the coach line).

### Particles and moments
Pooled arrays with caps: crumbs (60), dust puffs (30), tumbling contents (only while falling), sparkles (30),
beep marks, honk lines, gull flock (8 birds, simple flap animation), raccoon (a small scripted sprite path).
Faces for the bins: eyes and mouth drawn on the bin body, eye direction toward the last pointer position.

### State and storage
- Key `garbage-truck-v1` in localStorage, try/catch on every access:
  `{ v: 1, bins: N, street: { seed, done: [bool x6] }, fill, hopper, scene: "street"|"landfill", heap: [..] }`
  (hopper saved as volume only; items are recreated as a settled pile on load).
- `var startFresh = Toybox.fresh();` at load: if fresh, ignore the saved state and save the defaults.
- Saved after each bin, each pack, each unload and on `pagehide`.
- Big mode is the shared `toybox-big-garbage-truck`.

### Integration
- `Toybox.init({ app: "garbage-truck", big: { button: $("bigToggle") }, restArt, restLine, restLine2,
  timerIntro: "When time is up, the truck puts the bin down, folds its arm and parks.", goodbyeOption:
  "End with a “Honk goodbye” button to press", goodbyeLabel: "Honk goodbye", farewellDone: "Bye bye, truck!",
  soundNote: "Soft engine, hydraulic and horn sounds. Hold for 2 seconds.", onEnding, onGoodbye, onRest, onWake,
  onBig })`. No orientation option. No `offFirst` (nothing dangerous runs; motions finish quickly).
- No new home-screen settings. "Good to know" in `SETTINGS` needs no change (no turning, only the usual sound).
- Header: Home icon, title "Garbage Truck" (drop it on phones if it does not fit without "…"), Big icon. No Back.
- Ghost hand and coach pill pasted from `tools/snippets/`. Ghost plan per state: drag grabber to bin; drag grabber
  up to the top; drag it back down; tap the hopper; tap Go; drag the tailgate up; drag the body up. `learned()` after
  his first hand-made bin.
- `python3 tools/add-app.py garbage-truck "Garbage Truck" "Grab the bins, pack the load, tip it at the landfill"
  "Garbage Truck: an automated side loader: grab bins, pack, unload at the landfill."` (no extra pages). The
  cache version is stamped by the deploy (per `add-app.py`); the coordinator handles sw.js and the launcher.
- `?debug` test hook `window.__truck`: `state()`, `grabberScreen()`, `binScreen(i)`, `hopperScreen()`,
  `tailgateScreen()`, `bodyHandleScreen()`, `ghost()`.

### Performance
- Backdrops blitted from offscreen canvases (one `drawImage` per frame); the truck is about 60 path draws;
  particles capped as above; the load texture is a pattern, not per-item drawing. Target 60 fps on iPad at DPR 2.
- The loop sleeps (no redraw) when nothing moves for 2 s and the beacons are hidden (`document.hidden`), and in
  the rest screen.
- `prefers-reduced-motion`: no camera smoothing jitter (camera snaps on scene change), fewer particles, beacons
  steady instead of rotating, Surprise moments shorter.

### Test plan
- `node tools/smoke.js garbage-truck/` at the five sizes (`SIZE=390x844`, `844x390`, `820x1180`, `1180x820`,
  `1024x1366`, `MOBILE=1` for phones): no page errors, no page scroll.
- `node tools/buttons.js` on the page: Go, Grab, Pack, Empty, New, Surprise, Big all change the screen in every
  state (including Pack with an empty hopper and Go when already lined up).
- `node tools/fit.js`: tile and Go labels ("Next bin", "Landfill", "Street", "Grab", "Pack", "Empty") fit at all sizes.
- Playwright play script (with `?debug`, Google Fonts blocked):
  1. Drag from `grabberScreen()` to `binScreen(0)` in steps; expect `state().grip`.
  2. Drag up to the top of the path; wait for the shake; expect counter "Bins: 1" and hopper volume > 0.
  3. Drag back down, release; expect the bin at the curb, grip open, arm stowed.
  4. Tap the hopper; expect body fill to rise.
  5. Tap Go; expect the truck lined up at bin 1. Press Grab five times (waiting for each), Pack; expect "Full!".
  6. Go to the landfill; drag the body handle with the tailgate shut twice; expect the tailgate to open on the
     second try; finish with Empty; expect fill 0 and the compactor pass.
  7. Go back; expect a new street with six full bins. Reload: state kept. Open with a new launch id: fresh.
  8. Surprise four times; no errors. Timer ending with a bin held: it is set down and the arm stows.
- Screenshots at the five sizes on the street (arm up, bin tipping) and at the landfill (body tipped); look at them.

---

## 5. Phasing

**v1 (L, 1 agent):** the side loader, one street of six bins, the Pack cycle with the cutaway body, the road, the
landfill with tailgate, tipping body and compactor, Go/Grab/Pack/Empty, New, three Surprise moments plus the gulls,
timer ending, sound, ghost hand, coach, the five layouts.

**v2 (M, 1 agent): Recycling truck.** A Truck choice (a **Trucks** tab appears: Trash, Recycling). Same side
loader painted blue and white, a street of blue recycling bins, contents of flattened boxes, bottles, cans and
newspaper, and the destination is a **recycling center**: the truck backs into a big open building and tips onto
the **tipping floor**, and a wheel loader pushes the pile onto a conveyor belt that carries it away inside. All
bins on a street are the same kind, so there is nothing to sort.

**v3 (L each, 1 agent each), later truck types, if the dad wants them:**
- **Rear loader**: the classic one with a worker. A worker in hi-vis rides on the **riding step** at the back;
  at each house he hops down, wheels the bin to the **cart tipper** on the rear hopper's sill, which lifts and
  tips it; the rear **packer** runs its real two-motion cycle (the **sweep panel** swings down and scoops, the
  **slide panel** carries the load up into the body), very visible from the side. He controls the cart tipper
  lever and the packer lever (both drawn on the truck's back, as on real trucks). Bags can also be thrown in.
- **Front loader**: works a row of shops with big metal **dumpsters**. The **forks** come down in front of the cab,
  he drives them into the dumpster's fork pockets, lifts it up over the cab and flips it into the top hopper; the
  dumpster lid bangs open. Needs a business street backdrop.
Both share the route, packer, body, landfill and camera code; each adds its own loading mechanic and drawing.

---

## 6. Risks

- **The oblique arm path reads wrong** (dragging down to reach out may not feel natural). Reduce: draw the curb
  clearly below the truck with the bins close; draw a faint dotted guide along the arm path while dragging;
  accept the finger anywhere near the curve (nearest point); test early with the ghost hand and screenshots.
- **The drag jumps between reach and lift** where the path doubles back near the truck side. Reduce: the windowed
  nearest-point search around the current s (no jumps), plus the rate limit.
- **Too much waiting**: driving, backing up and unloading take time. Reduce: keep the drive to the landfill short
  (about 4 s), back up in about 2 s, and let him do the tailgate and tip himself; the compactor runs while he can
  already press Go.
- **Page size and complexity** (truck, street, landfill, compactor, gulls). Reduce: v1 scope fixed above; simple
  shapes with chunky outlines; reuse Excavator helpers (`shape`, `rrect`, `fatLine`, `cylinder`, beep marks).
- **Upright phone framing**: a long truck in a narrow stage. Reduce: the follow camera with a tight frame on the
  arm and hopper while loading, pan to the rear for unloading.
- **Garbage could look dirty or smelly**. Reduce: clean, colorful bags and boxes, no food mess, no flies; the
  landfill is a tidy brown mound with green cover slopes and gulls.

---

## 7. Open questions for the dad

1. What does he call them at home: **bins**, trash cans or carts? The counter and coach lines use that word.
2. Is the **see-through side of the body** (to watch the load get squashed) OK, or should the body stay closed
   like the real truck and the squash only show in the hopper?
3. **Landfill or transfer station** for the trash truck? (Landfill: outdoors, a compactor with spiked wheels and
   gulls. Transfer station: a building with a tipping floor where a loader pushes the pile into a big trailer.)
4. Unloading by **tipping the body** (the load slides out) or **full eject** (the tailgate lifts and the packer
   blade pushes the load out the back, as many real side loaders do)?
5. Which other trucks, if any, after v1: **recycling** (same truck, blue bins), **rear loader** (worker and cart
   tipper), **front loader** (dumpsters over the cab)?
6. Does the truck in your street look like this (one arm on the right side), so the picture matches what he sees
   on collection day? Any colors he knows (white body, green, orange)?

---

## 8. Icon idea

A side-loader garbage truck in profile facing right, white cab and green body with chunky #1D2340 outlines, the
arm raised with a dark green bin tipped upside down over the hopper and three colorful trash bags falling in, an
amber beacon on the cab roof. Full-bleed #CDE9FF background, a short strip of gray street under the wheels. For the
maskable icon the truck and the raised bin stay inside the central 80% (the bin above the cab is the tallest point,
so the truck is drawn a little smaller and lower).
