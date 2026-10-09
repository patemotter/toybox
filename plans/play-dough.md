# Play Dough: design and engineering plan

## 1. Summary

A play dough table, seen from where you stand over it: a light vinyl play mat with the real play dough tools,
and two real machines clamped to the far edge of the table, a **dough press** (an extruder on a stand, worked by
pulling a long lever) and a **crank roller** (a hand-crank roller like a pasta machine, the tool clay makers use to
roll even sheets). He takes dough from the tubs, squishes it, rolls it into balls, snakes and flat sheets, sticks
colors together and twists them, cuts it with a plastic knife and a pizza cutter, cuts shapes with cookie cutters,
presses stamps into it, makes hair with the hair maker, and pushes it through the press's dies (noodles, star,
heart, flat ribbon, gear, round). Colors never blend into a new color: they stay as separate streaks and swirls
(marbling), the way real dough looks after two colors are kneaded a few times. Everything he makes stays on the mat
until he taps New.

- Folder `play-dough/`, one page `play-dough/index.html` (see 4.1), `manifest.webmanifest`, the four icons. No `sw.js`.
- Launcher tile and header title: **"Play Dough"** (short, fits at 390 px).
- `Toybox.init({ app: "play-dough" })`. Storage key `play-dough-v1`.
- **"Factory" decision: yes, two machines next to the hand tools**, not a separate factory screen. Reason: he loves
  machines that make things, and both machines are real tools for dough and clay (the lever extruder and the crank
  roller), each worked by one big, obvious motion (pull the lever down, turn the crank round). They take dough from
  the same mat and put their output back onto it, so the hand tools and the machines work together: roll a sheet
  in the roller, then cut stars out of it; press a heart rod, then slice it into hearts. A separate factory page
  would split the dough between two places. No conveyor belts, motors or switches: nothing on a real play dough
  table is powered, and adding fake automation would only add waiting.

---

## 2. The real thing

### 2.1 Tools and machines, with their real names

| Real thing | What it really does | In the app |
| --- | --- | --- |
| **Dough tubs** with lids | Each color lives in its own tub so it stays soft | Panel tiles (Dough tab): tap, a ball of that color rolls onto the mat |
| **Play mat** | Smooth wipe-clean surface to work on | The stage floor |
| **Hands** | Squish, poke, roll balls and snakes, stick pieces together, knead | Default tool |
| **Rolling pin** | Rolls a lump into a flat, even sheet | Drawn on the mat, dragged across |
| **Plastic knife** | Cuts straight through | Finger drag cuts a straight line |
| **Pizza cutter** (wheel) | Rolls along, cuts long curvy strips | Wheel follows the finger, cuts along the path |
| **Cookie cutters** | Press down, lift, pop the shape out | Cutter follows the finger, presses on release |
| **Stamper** | Presses a picture into the dough (no cut) | Same shapes as the cutters, makes a relief |
| **Hair maker** (a garlic press) | Fill the cup, squeeze the handles, strands come out of the holes | Tap a lump, hold to squeeze, a tuft of strands |
| **Dough press** (lever extruder) | Barrel, **plunger**, long **lever** (handle) with a ratchet, **die wheel** with shaped holes; pull the lever and dough is pushed out of the die in the die's shape; a **cut-off wire** snips it | Clamped at the far edge of the table |
| **Crank roller** | Two steel rollers turned by a **crank**; a **thickness knob** sets the gap; dough fed into the top comes out as an even sheet | Clamped at the far edge of the table |

Real press dies chosen for v1 (six on one die wheel): **Noodles** (a plate of small round holes, several strands),
**Star**, **Heart**, **Flat ribbon** (a wide thin slot), **Gear** (a round shape with square teeth), **Round** (one
thick rope). Cookie cutter and stamper shapes (eight): Star, Heart, Circle, Gear, Rocket, Train engine, Dump truck,
Fish. Dough colors (eight): red, orange, yellow, green, blue, purple, pink, white.

### 2.2 What real play looks like, in order (no fixed order is forced)
1. Open a tub, take out the dough, **squish** it in the hand to soften it.
2. Roll a **ball** between the palms, or roll a **snake** on the mat under a flat hand, back and forth.
3. **Flatten** it with a palm or roll it **flat** with the rolling pin.
4. **Cut**: cookie cutter pressed straight down, wiggle, lift, pop the shape out; knife or pizza cutter for strips.
5. **Press**: stuff dough into the press barrel, choose a die, pull the lever down (each pull pushes the plunger a
   little further: the ratchet holds it), dough comes out in the die's shape, snip it off with the wire.
6. **Roll even sheets** in the crank roller: start Thick, then pass it again on Thin.
7. **Combine colors**: stick two colors together, roll and fold: the colors make stripes and swirls. Two snakes
   twisted together make a two-color rope (like a candy cane).
8. **Slice a rod** from the press: thin slices tip over and show the die's shape (real clay "cane" slicing).
9. Clean up: dough back into its tubs.

### 2.3 Kept, made automatic, dropped
- **Kept as his actions**: everything in 2.2 except clean-up and choosing a tub lid.
- **Automatic**: opening tub lids (tap a tub and the ball arrives); pushing the cutout shape out of the cutter (it
  hops out of its hole onto a free spot); the press ratchet resetting when the lever goes back up; the lying strand
  curling on the mat; slices tipping over to show their face; New gathers the dough back into balls that roll away.
- **Dropped** (no procedural extras): softening/conditioning passes, putting lids back, choosing a die by
  unscrewing a ring (the die wheel clicks round instead), cleaning dried dough out of the die, the hand-held
  plunger extruder (the stand press does the same with a bigger, more machine-like motion), molds (later, 5).
- **Simplified**: kneading is just "roll and press" (rolling stretches the stripes, pressing a long snake folds it).
  Colors never mush into a new color; real dough does muddy after a lot of kneading, but the shelved Color Mixing
  app is too close to that, and crisp streaks look better.

---

## 3. Experience design

### 3.1 Scene and view
- **Operator's view**: standing at the table, looking down at the mat. The mat is drawn straight from above (heights
  shown by light and shadow: light from the top left, a soft shadow to the bottom right). The two machines stand at
  the far edge (top of the screen), drawn from the front and a little above, so their lever, crank, die wheel and
  thickness knob face him. Their output comes toward him onto the mat, like on a real table.
- **Far edge band** (machines): crank roller on the left, dough press on the right. The press's barrel top may run
  off the top of the stage; its lever handle, die wheel and die are always in view.
- Toybox look: the mat is pale mint with a faint grid printed on it (no numbers), chunky dark outlines on the
  machines and tools, dough outlined in a darker shade of its own color (not the #1D2340 ink, so it reads as soft).

### 3.2 First action and coach lines
- A fresh visit starts with one yellow ball in the middle of the mat and the Hands tool picked.
- First coach line: **"Squish the dough!"**. Ghost hand: presses and holds on the ball (the ball flattens a little
  under it).
- Coach lines, one at a time, always true for the current state (bottom-center on phones, top-center on tablets,
  shown at least 3 s):
  - Hands, no dough on the mat: "Tap a tub!" (the Dough tab's tiles sparkle once).
  - Hands, after a squish: "Roll a snake!" once, then nothing unless idle.
  - Rolling pin: "Roll it flat!"; Knife / Pizza cutter: "Cut the dough!"; Cutter: "Press a star!" (names the
    picked shape); Stamper: "Stamp it!"; Hair maker: "Tap some dough!" then "Hold to squeeze!".
  - Press empty, lever touched: "Put dough in the press!" (barrel glows). Press loaded: "Pull the handle!".
  - Roller: "Turn the crank!" when it holds dough; "Put dough in the roller!" when its tray glows.
- Ghost hand moves per tool: Hands: press-hold the biggest lump; Rolling pin: a drag across the biggest lump;
  Cutter/Stamper: a tap on the flattest piece; Knife: a drag across a piece; press loaded: drag the lever handle
  down; roller loaded: a circle around the crank. At most twice per visit per move; `learned()` once done.

### 3.3 Interactions (everything works with sound off; every touch has a visible answer)
**Dough tubs (Dough tab).** Tap a tub tile: its lid flips open on the tile, and a ball of that color rolls in from
the bottom edge of the mat to a free spot, with a little squash on landing. Mat full (16 pieces): the tile wiggles,
coach "Stick some dough together!", and the two smallest pieces nearby slide together and stick (so the tap still
works).

**Hands (default).**
- **Tap** a piece: a fingertip dent where he tapped (the dent stays).
- **Press and hold**: a deep finger dent at once; after 0.4 s still holding, the palm comes down: the whole piece
  flattens into a round pancake, wider and wider while he holds (volume kept), stopping at a thin flat disc. A long
  snake that is pressed first **folds in half** (a quick fold animation), then flattens: this is kneading, and the
  color stripes double each fold.
- **Drag** a piece: it lifts (bigger shadow) and follows the finger; dropped on another piece, they **stick
  together** (both colors kept side by side as separate streaks; a soft squash where they join).
- **Rub back and forth** on a piece (two direction changes within about a second, any direction): the piece rolls
  into a **snake** lying across the rubbing direction, getting longer and thinner with each rub, stripes stretching
  along it. Fast rubs work as well as slow ones.
- **Two snakes side by side** (dropped one onto the other, roughly parallel, within 30 degrees) and then rubbed:
  they **twist** into one rope with spiral stripes of both colors; more rubbing twists it tighter, up to a limit.
- **Drag a piece onto the press barrel or the roller tray**: it goes in (see machines). Two fingers can drag two
  pieces at once.

**Rolling pin.** The pin lies on the mat. Touch anywhere on the mat: the pin comes under the finger (it is long, so
the finger holds its middle) and rolls as he drags. It turns to lie across the drag direction (snaps to across or
along the screen, with a quick turn), handles spinning as it rolls. Dough under it gets flattened to an even
thickness, pushing ahead and making the sheet longer; a second pass across makes it wider. Rolling over two colors
stretches the streaks. Rolling over nothing: the pin still rolls and its handles spin.

**Plastic knife.** Drag across: the knife follows the finger; when the finger leaves the dough (or lifts), the
cut is the straight line from where it entered to where it left, made with a clean thin gap; the parts slide a
little apart so the cut shows. A cut through nothing: the knife taps the mat and a crumb-free "tick" mark flashes.

**Pizza cutter.** The wheel follows the finger and spins; the cut follows the finger's path (curves too), so long
wavy strips are easy. Parts separate slightly as with the knife.

**Cookie cutter (shape from the Shapes tab).** The cutter follows the finger (centered on it, drawn larger than a
fingertip so its edge shows around the finger). On lift it presses straight down (a visible push), cuts, lifts,
and the shape **hops out** of the hole onto the nearest free spot next to it, with a little bounce; the sheet keeps
the shape-shaped hole. Cutter overlapping the edge of a piece: a partial shape, also fine (real). A press on empty
mat: the cutter bonks the mat and wiggles; coach "Press it on the dough!". Each whole cutout counts on the counter.

**Stamper.** Same shapes; on lift it presses down and leaves the picture pressed into the dough (outline groove,
raised inside details). A gear stamp leaves a gear; the train engine leaves wheels and a cab window.

**Hair maker.** Tap a piece: the hair maker comes over it and the piece squeezes into its cup (small pieces fit
whole; a big piece gives a scoop). **Hold** anywhere (or drag the handles together): the handles close and
thin strands push out of the holes below, a wavy tuft growing while he holds. Let go: the tuft is snipped and
drops where the hair maker is; drag it (with Hands) onto a ball and it sticks there as hair. A tap without
holding squeezes a short tuft (quick taps still move visibly).

**Dough press.**
- **Load**: drag a piece onto the barrel (it glows while a piece is dragged near), or tap the barrel: the nearest
  piece hops in (auto-assist). The barrel window shows the dough inside, colors in the order they went in.
- **Die wheel**: tap it: it clicks round one die (six), and the new die's shape pops up big beside it for 1.5 s.
- **Lever**: drag the handle down along its arc (it follows the finger). On the way down the plunger pushes and
  dough comes out of the die, as long as the stroke; letting go, the lever springs back up and the ratchet clicks
  (the plunger stays). A tap on the handle does one whole calm stroke for him. Empty press: the lever moves, coach
  "Put dough in the press!", the barrel flashes; on the second empty pull, the nearest piece hops in for him and
  that pull already pushes dough out.
- **Output**: the strand (or several, for Noodles) comes out of the die with its shape, hangs a moment, and lays
  down on the mat toward him, curling in loose loops when it gets long. Colors layered in the barrel come out one
  after the other along the strand, with the real bullet-shaped boundary (the middle moves faster); colors side by
  side in the barrel come out as stripes along the strand.
- **Cut-off wire**: drag across just under the die (a big hit band), or tap the wire: it swipes and the strand drops
  free. When the barrel runs empty, the wire snips by itself. The pressed rod or noodles stay on the mat.
- **Slicing a rod**: knife cuts across a Star/Heart/Gear/Round rod make slices; a slice shorter than its width tips
  over (a small flip) and shows the die shape face-up: a row of stars or hearts. Each tipped slice counts.

**Crank roller.**
- **Load**: drag a piece onto the tray on top (or tap the tray: the nearest piece hops in).
- **Crank**: drag round the crank hub (any direction counts forward; it follows the finger). The rollers turn, the
  dough is drawn in and comes out at the bottom onto the mat as an even sheet, growing toward him. A tap on the
  crank does a calm half turn. A thick lump is drawn in fine (no jams).
- **Thickness knob**: tap it: it clicks Thick → Medium → Thin (a picture of the roller gap on the knob, wide to
  narrow, plus the word on tablets). The same sheet fed again on Thin comes out longer and thinner.

**Forgiving input.** Hit areas: pieces have a 16 px grab margin; lever handle, crank, die wheel, knob and wire
each ≥ 64 px. Three missed taps beside a small piece select it anyway. Ops cap at the mat edge (pieces never leave
the mat; dragged off, they slide back in).

### 3.4 Panel
- **No Go button** (there is no single main action; the machines' own lever and crank are the controls).
- **Choices** (picture tiles, `aria-pressed` on the picked one; re-tap gives the shared wiggle):
  - **Tools** tab: Hands, Rolling pin, Knife, Pizza cutter, Cutter, Stamper, Hair maker (7 tiles).
  - **Shapes** tab: the eight shapes (used by both Cutter and Stamper; picking a shape while Hands is picked
    switches to Cutter).
  - **Dough** tab: the eight tubs (tap = a ball arrives; no picked state, they are actions, so no aria-pressed).
- **Tab bar** (last): Tools | Shapes | Dough | New (orange) | Surprise (rainbow outline). Panel height is the same
  for every tab (sized for the tallest: two rows of four).
- **Counter** (top-left of the stage): **"Shapes: N"**: whole cookie-cutter cutouts, stamps and tipped die slices.
- **New**: the dough pieces gather into balls by their main color and roll off into the tubs (calm, 1.5 s), then a
  fresh yellow ball arrives. Machines empty too. Counter back to 0.

### 3.5 Layout (App shell: header, stage, panel)
Header everywhere: [Home icon] [Play Dough] … [Big icon]. No Back (single page).

- **390x844 (upright phone)**: stage about 374x540. Machine band = top 28 % (about 150 px): roller in the left 44 %,
  press in the right 56 % (lever on its right side, swinging down over the mat's right edge). Mat below (about 380
  px tall). Panel: two rows of four tiles + tab bar. Coach bottom-center. Big mode hides the panel: mat gets taller.
- **844x390 (sideways phone)**: stage about 510x330 on the left, panel column on the right (tiles 2 per row scroll
  inside the choices area, tab bar at the bottom of the column). Machine band = top 34 % (about 112 px): roller at the
  top-left corner, press at the top-right corner, the mat reaches up between them. The press barrel runs off the top;
  die, wheel and handle stay visible. Tight but workable; Big mode recommended (open question 5).
- **820x1180 (iPad upright)**: stage about 790x820; band top 24 %; both machines drawn large; mat about 620 px tall.
- **1180x820 (iPad sideways)**: stage about 730x740 left, panel right; band top 26 %.
- **1024x1366**: as 820x1180, more mat.
- **Orientation preference: none.** Both ways work; the band stays on top in both.
- **Tab change never touches the stage** (machines and mat are always there).
- **Mat coordinates**: dough is stored in mat cells (4.3). The cell size is fixed per device at load from the
  screen's short side (`clamp(min(screen.w, screen.h) / 300, 1.2, 2.4)` css px per cell), so rotating never
  re-rasterizes dough; on rotate the mat rectangle changes shape and piece positions are remapped in proportion and
  pushed apart if they overlap.

### 3.6 Surprise (fun moments on the current scene, taking turns)
1. **Faces**: every dough piece gets googly eyes and a smile for 5 s (real kids add googly eyes to dough); the eyes
   follow his finger, blink, and pieces bounce when touched.
2. **The shapes come alive** (when there are cutouts or slices): gears spin in place, rockets hop up with a puff and
   land, train engines chug a short way and back, fish wiggle, stars twinkle, hearts beat, trucks tip their bed.
   Without shapes this moment is skipped in the turn order.
3. **The snake wiggles**: the longest snake or rope inches along like a worm in a loop and back to its spot (or,
   with no snake, the roundest ball rolls a lap round the mat and back).
4. **Jelly wobble**: all dough jiggles and bounces once, as if the table was bumped, while the press lever bobs.
Everything returns to exactly where it was; nothing new is made or kept. Surprise never changes his dough.

### 3.7 Results, collections, fresh start
- **Results stay** on the mat until New: sheets, cutouts, holes, rods, slices, hair, twisted ropes.
- **Reload / back-forward**: the mat, the machines' contents, the tool, die, knob and counter are restored.
- **Fresh visit** (`Toybox.fresh()`): empty mat with one yellow ball, Hands, Star shape, Noodles die, Thick, counter 0.
- **Shelf collection: not in v1.** Reasons: play dough is about the lump in front of him (real dough goes back into
  its tubs; it is not a thing you keep like a print or a turned spindle); a shelf adds a tab, a storage format and a
  "send to shelf" step; and the mat already keeps everything for as long as he plays (and across reloads). Ready
  design if the dad wants one (question 1): a whole cutout or slice dropped onto a small drying board at the bottom
  edge of the mat bakes hard (a matte look) and joins a **Shelf** row of the last twelve, kept across visits
  (`play-dough-shelf-v1`, each a 48x48 color/height snapshot).

### 3.8 Timer ending, rest, kind words
- `onEnding(done)`: the lever rises, the crank stops, the tool lays down on the mat edge, any strand in progress is
  snipped, every piece settles flat (a small sag), then the tub lids close on the tiles. About 4 s, then `done()`.
- Rest art: three tubs with lids and a ball of dough; rest line **"The dough is resting."**
- `Toybox.kind()` after: a whole cookie-cutter cutout hops out (at most once a minute), a press batch is snipped
  off, a sheet finishes coming out of the roller, a twisted rope reaches full twist.

### 3.9 Safety ritual
None. Real play dough needs no gear, and the dad toned these down.

### 3.10 Sound (Web Audio synthesis, soft, only when sound is on)
- Squish: low-passed noise burst with a falling cutoff (soft, wet). Poke: tiny low "thup".
- Roll / rolling pin: a soft rumble of low noise following the speed; handles: faint wooden ticks.
- Knife: short "tk"; pizza cutter: a quiet whirr whose pitch follows speed; cutter: a pat then a bright pop when the
  shape hops out. Stamp: a pat.
- Press: lever ratchet clicks (short filtered clicks), a slow low squelch while dough comes out, wire "tsip".
- Roller: crank ratchet ticks and a soft rolling hum. Tub lid: a pop. Surprise: a little boing per piece.
- All under a master gain of 0.6; nothing sharp or loud.

### 3.11 Numbers
Only the counter "Shapes: N". The roller knob says Thick / Medium / Thin (words, and pictures on phones); no numbers
on the knob, dies, cutters or tubs.

---

## 4. Engineering plan

### 4.1 Files and pages
- `play-dough/index.html`: one page. Reason: every tool and both machines share the same dough on one mat (a sheet
  from the roller is cut with cutters; a rod from the press is sliced with the knife). Pages would split that.
  Expected size about 3,000 lines (inline CSS + JS, `"use strict"` IIFE, ES5).
- `manifest.webmanifest`, `icons/icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.

### 4.2 Rendering
- **One stage canvas** (DPR capped at 2) drawn every frame while anything moves, otherwise only on change:
  1. Mat background (cached offscreen canvas, redrawn on resize).
  2. Dough pieces: each piece owns a small **cell canvas** (one pixel per mat cell) that is re-shaded only in its dirty
     rectangle; per frame it is just `drawImage` scaled up with smoothing (soft shading), plus its cached shadow.
  3. **Crisp edges**: each piece keeps a `Path2D` outline from marching squares on its coverage (recomputed after a
     change, not per frame), stroked 2.5 px in the dark shade of the piece's main color and used as a clip for the
     scaled cell canvas. So edges are crisp at any DPR while the inside shading stays soft.
  4. Machines and tools: vector drawing with cached `Path2D`s per part (static parts pre-rendered to offscreen
     canvases at layout; moving parts, the lever, plunger, crank, rollers, die wheel, knob, drawn live).
  5. Hanging strands and the hair-maker tuft: drawn analytically (4.3.7), not as heightmaps, until they land.
  6. Overlays: faces, sparkles, cutter outline ghost.
- **SVG** for the panel tiles (tools, shapes, tubs) and the rest art. Coach, counter, ghost hand: DOM (shared snippets).
- Why canvas for dough: per-cell lighting over thousands of cells and arbitrary deforming shapes; SVG would need a
  new path per change and cannot shade a heightmap.

### 4.3 Dough model

**4.3.1 Piece.** A piece is a small grid in mat cells:
```
Piece = { x, y,                   // mat-cell position of grid (0,0)
          w, h,                   // grid size, margin of 8 empty cells kept around the dough
          H: Float32Array(w*h),   // height in cells (0 = no dough). Ball ~ 30, sheet ~ 3
          C: Uint8Array(w*h),     // color index 0..7 (the color on top at that cell); never blended
          A: Uint8Array(w*h),     // coverage 0..255 at the edge (anti-aliased cut edges)
          vol,                    // sum of H, kept constant by every op (checked under ?debug)
          kind: "lump" | "rod",   // rod = came out of the press; rod.die, rod.axis kept for slicing
          img: canvas (w x h), outline: Path2D, dirty: rect }
```
Grow the grid (reallocate with a new margin, copy) when an op writes within 2 cells of the border.

**4.3.2 Shading** (dirty rect only; same idea as `sand-table` `shade()`):
```
for each cell i in dirty rect:
  if A[i] == 0: pixel transparent; continue
  gx = (H[i+1]-H[i-1])/2 ; gy = (H[i+w]-H[i-w])/2          // slopes
  n = normalize(-gx*KS, -gy*KS, 1)
  diff = max(0, dot(n, L))                                  // L from top-left, above
  spec = pow(max(0, dot(reflect(-L, n), V)), 12) * 0.12    // faint satin sheen
  rim  = 1 + 0.08 * clamp(1 - H[i]/3, 0, 1)                 // thin edges a touch lighter (soft dough)
  rgb  = PALETTE[C[i]] * (0.62 + 0.45*diff) * rim + spec
  pixel = rgb, alpha = A[i]
putImageData(dirty rect) into piece.img
```
Colors stay crisp because `C` is an index (nearest-neighbor) and shading only scales brightness.

**4.3.3 Deforming by remapping (how marbling happens).** Every shape change is written as a backward map: for a
target cell p, where did its dough come from? Height is resampled bilinearly (smooth), color by nearest cell
(crisp). Then height is rescaled so the piece's volume is unchanged. Stripes stretch, fold and twist but never mix.
```
function remap(piece, rect, src /* p -> source point */, hScale /* p -> factor */):
  for p in rect: q = src(p); H2[p] = bilinear(H, q) * hScale(p); C2[p] = C[round(q)]; A2[p] = coverage(H2[p])
  fixVolume(piece)                           // H *= vol / sum(H) over the piece
```
- **Palm press / pancake** (hold): a radial scale about the press point c, growing while held:
  `s += dt * 0.6 (until H max < 3)`; `src(p) = c + (p - c)/s`, `hScale = 1/s²`.
- **Snake roll** (rubbing along direction d, snake axis a = perp(d)): per rub, stretch along a and shrink across:
  `src(p) = c + a*(dot(p-c,a)/k) + d*(dot(p-c,d)*k)` with `k = 1.25`, then re-shape the cross-section toward a
  half-round: `H = max(0, r² - t²)^0.5` with r from volume and length (blend 40 % per rub, so it stays dough-like).
- **Fold** (press on a snake with length > 3x width): mirror the far half onto the near half:
  `src(p) = p` for the near half; `p' = reflect(p, foldLine)` adds the far half's H and its colors overwrite where
  its H is larger (the fold lies on top), then a pancake press. Stripes double.
- **Rolling pin**, per frame, in the pin's frame (lanes along the roll direction, one lane per cell across):
```
for each lane under the pin:
  j = pin's cell along the lane (leading edge)
  excess = sum over cells under the pin of max(0, H - T)      // T = pin height (Medium sheet)
  set those cells to min(H, T)
  carry[lane] += excess
  // stretch: shift the run of cells ahead of the pin forward by carry/T cells, copying C and H (as a remap with
  // src(p) = p - roll * (carry/T) for cells ahead), new cells at the far end get H = T and the color behind them
  carry[lane] = 0
```
  So the sheet grows in the roll direction and its stripes stretch; the dough ahead bulges slightly (a ridge one
  cell tall that the next frame flattens), which reads as a bow wave.
- **Finger dent** (tap / start of a hold): `H -= depth * bump(dist/r)` inside r, the removed volume is added as a
  ring in [r, 1.6r] with a `sin` profile (the sand-table ridge idea), cells in the ring that had no dough take the
  color of the nearest dough cell inward (so dents near an edge push the edge out).
- **Sticking two pieces** (drop): make a new grid over the union, `H = H1 + H2`, `C = C2 where H2 > 0 else C1`
  (the dropped piece lies on top), then a small dent at the overlap center.

**4.3.4 Cutting (clean edges).**
```
function cut(piece, polyline, halfWidth = 0.6 cell):
  for p in piece within halfWidth+1 of the polyline:
    d = distance(p, polyline)
    if d < halfWidth: H[p] = 0
    A[p] = min(A[p], 255 * clamp((d - halfWidth) / 1, 0, 1))  // anti-aliased wall
  volume removed (tiny) is spread over the neighbours on both sides
  parts = connectedComponents(H > 0, 4-connected)
  for each part: new Piece from its bounding box (copy H, C, A); drop parts < 6 cells (crumbs merge into nearest)
  push parts apart along the cut normal by 3 cells (animated, 0.3 s)
```
- Knife: polyline = the straight segment from where the finger entered the dough to where it left.
- Pizza cutter: polyline = the finger path, simplified (Douglas-Peucker, 0.8 cell).
- Cookie cutter: the shape is a polygon (from the same outline data as its SVG tile) placed at the finger:
```
for p in piece ∩ shapeBounds:
  sd = signedDistance(p, shape)                   // < 0 inside
  inside: Ainside[p] = 255*clamp(0.5 - sd, 0, 1);  outside: Aoutside[p] = 255*clamp(0.5 + sd, 0, 1)
newPiece = copy of cells with Ainside > 0 (H, C, coverage Ainside)   // the cutout
piece keeps Aoutside (the hole), then connectedComponents (a cutter across a thin strip can split it)
```
  Signed distance to a polygon of ≤ 120 points over ≤ 120x120 cells is about 1.7 M segment tests worst case; done
  once per press (about 10 ms on iPad), within the press animation.
- Stamper: same SDF; `H -= 0.6 * groove(sd)` near the outline (a 1.5-cell groove) and `H += 0.3` on the shape's
  inside detail strokes (windows, wheels), then fixVolume.

**4.3.5 Outline.** Marching squares on A (threshold 128) per piece after each change gives closed loops; build one
`Path2D` (even-odd for holes). Cost is linear in grid size, only on change.

**4.3.6 Twisted rope.** When two snakes are stuck side by side and rubbed, the result's color is computed directly
(not remapped), which gives clean candy-cane spirals:
```
// s = position along the rope axis, t = across (-r..r), k = twist (grows per rub, up to 1 turn per 2r of length)
phi = asin(clamp(t / r, -1, 1))                 // angle on the visible top of the round rope
band = floor(((phi + k * s) / PI) mod 2)        // 0 or 1: which strand shows here
C[p] = strandColor[band] (each strand keeps its own streaks: index its own color map at (s, phi + k*s))
H[p] = sqrt(max(0, r² - t²)) * (1 - 0.15 * |sin(2*(phi + k*s))|)   // a groove between the strands
```

**4.3.7 Press.**
- Barrel contents: a list of layers `{color map slice, volume}` in loading order (a marbled piece is loaded as its
  color fractions in its own stripe order, so stripes survive).
- Lever: angle θ follows the finger on the downstroke; plunger advance `dP = max(0, θ - θprev) * K`; output length
  `dL = dP * barrelArea / dieArea` (all holes together), capped so a full barrel gives about 6 full strokes. Upstroke:
  ratchet clicks every 8 degrees, plunger stays.
- Strand, while attached: a list of points along its centerline; the first part hangs straight down from the die
  (drawn foreshortened, 40 px), the rest lies on the mat: each new length unit extends the lying path toward the
  viewer with a slow wander `heading += (noise(t) - 0.5) * 0.15`, turning into loose loops when it reaches the mat's
  lower half (heading bends by +0.06 rad per unit, alternating side each loop).
- **Die cross-section drawing**: per die, precompute a 1-pixel-tall **shading strip** across the profile's width
  from its top surface normals (star: bright and dark bands for each point; ribbon: flat; gear: square ridges).
  The hanging part = this strip `drawImage`d stretched along its length; the end facing him = the die shape drawn as
  a cap. Very cheap per frame.
- **Colors along the strand**: each lane x across the strand gets a color boundary offset by the real flow profile:
```
// u = x / halfWidth in [-1, 1]; the middle of the die flows faster, so a new color shows first in the middle
lag(u) = Lt * u * u                          // Lt = transition length (about 1.5 widths)
colorAt(s, u) = layerAt(extrudedLength(s) - lag(u))   // nearest layer, no blending: crisp bullet-shaped fronts
```
- **Landing**: the lying part is stamped into a rod piece's heightmap as it grows, using the profile's top height
  `h(t)` across (precomputed per die), along the path (the `stampSeg` idea from `sand-table`, max-combined so loops
  lie on top). The cut-off wire ends the rod; it becomes a normal piece with `kind: "rod", die, axis`.
- **Slices**: a knife cut across a rod (cut within 30 degrees of perpendicular to its axis) produces parts; any part
  shorter than the die width is replaced by a **face-up coin**: the die shape rasterized flat (H = 2.5, coverage
  from its SDF), colors taken from the rod's colors at that point, with a 0.4 s tip-over animation (scaleY 0 → 1
  with a hop).
- Noodles die: five round strands side by side, each its own path with a little independent wander.

**4.3.8 Crank roller.** Loaded piece is held in the tray. Crank angle change `dA` (absolute, any direction) feeds
`dF = dA * Rroll` cells of the piece's length (its long axis turned to the feed direction). The output sheet piece
grows row by row:
```
gap = {Thick: 6, Medium: 4, Thin: 2.5}[knob]   // cells
width = clamp(sourceWidth * 1.05, ..., matWidth*0.8)
// remap rows: output row j comes from source row j * (gap * width) / (sourceArea), i.e. a uniform stretch,
// colors nearest-neighbor, H = gap with a soft rounded edge 2 cells wide
```
The sheet appears below the rollers, drawn as an unrolling piece; it stops growing when the fed length is used up.

**4.3.9 Hair maker.** Cup volume V; while holding, n = 9 strand tips advance at 30 px/s, each a wavy polyline
drawn as a 2-cell rope; on release the tuft becomes one piece (strands stamped with the round profile, all
connected at their root, so it moves as one). Stuck to a ball with the normal stick rule.

**4.3.10 Moving pieces.** Dragging changes `x, y` only (no re-rasterizing); the shadow grows with lift. Collision on
drop: if overlapping another piece by more than 20 % of the smaller area it sticks; otherwise both stay separate
and are nudged apart by up to 4 cells.

**4.3.11 Gesture detection (Hands).** Per pointer: record the last 1.2 s of positions. Classify:
```
moved < 6 px and released < 250 ms        -> tap (dent)
moved < 10 px and held > 400 ms           -> palm press (pancake grows while held)
direction reversals >= 2 within 1.2 s, amplitude > 12 px -> rub (snake roll / twist), piece stays near the mean
otherwise                                  -> drag (move)
```
A drag that turns into rubbing keeps the piece where it is; rubbing never moves it far.

### 4.4 State and storage (every access in try/catch)
- `play-dough-v1` (JSON, saved 1.5 s after the last change and on `pagehide`):
  `{ v: 1, tool, shape, die, knob, count, mat: { w, h }, pieces: [{ x, y, w, h, kind, die?, axis?, png }],
  press: { layers: [[color, vol]...], plunger }, roller: { piece?: index } }`.
  Each piece's grids are packed into one PNG data URL (R = height x 8, G = color index x 32, B = coverage), like the
  sand table's save. A full mat is about 100-300 KB; a cap of 16 pieces keeps it under 1 MB.
- `Toybox.fresh()` → ignore the saved mat and start the fresh state (3.7). No collections in v1.
- Restore failures (bad JSON, image error) fall back to the fresh state.

### 4.5 Integration
- `Toybox.init({ app: "play-dough", big: { into: headerEl }, badge, restArt, restLine: "The dough is resting.",
  restLine2: "It will be right here next time.", onEnding, onWake, onBig: relayout })`. No orientation option, no
  `offFirst` (no powered machine), no settings in `SETTINGS`, no change to the "Good to know" list.
- `python3 tools/add-app.py play-dough "Play Dough" "Squish, roll, cut and press play dough" "Play Dough: squish,
  roll, cut, stamp and press dough through real dies; colors stay as streaks."` (adds the launcher tile, the
  top-level `sw.js` CORE entry and the README line). The coordinator bumps the cache.
- Debug hooks behind `?debug`: `window.__dough = { state, pieces(), volumes(), tool(id), press(), roller() }`.

### 4.6 Performance (60 fps on iPad, DPR cap 2)
- Per frame: blit ≤ 16 piece canvases with clip outlines, draw machines (cached static parts), hanging strands as
  stretched strips. No per-frame per-cell work unless a deforming op is active.
- Deforming ops touch only their rectangle: a finger dent ~ 40x40 cells; the rolling pin ~ its width x 3 cells per
  lane per frame; palm press ~ the piece (≤ 150x150 = 22k cells, about 1 ms). Shading only dirty rects.
- Heavy one-offs (cookie cutter SDF, connected components, marching squares) run once per action, inside a 0.3 s
  press animation, so a 10-15 ms spike hides behind motion. If a test shows a dropped frame, spread the SDF over
  two frames by rows.
- Typed arrays allocated per piece and reused; no allocation in the frame loop (scratch buffers sized to the
  largest piece).
- Loop sleeps (no rAF) when nothing moves and no finger is down.

### 4.7 Test plan
- Serve `npx http-server . -p <port> -c-1 -s`; block Google Fonts.
- `node tools/smoke.js play-dough/index.html` at 390x844, 844x390, 820x1180, 1180x820, 1024x1366 (MOBILE=1 for
  phones): no errors, no page scroll.
- `tools/buttons.js`: every tile and tab gives a visible change (tub tiles add a ball; re-tapping a picked tool wiggles).
- `tools/fit.js`: no cut-off labels ("Pizza cutter" and "Rolling pin" are the risky ones at 390 px; shorten to
  "Pizza" / "Pin" only if it reports them).
- Playwright play script (with `?debug` volume checks after each step, sum of all piece volumes + press + roller
  constant within 0.5 %):
  1. Press-and-hold the starting ball 1 s: its max height drops, its area grows.
  2. Tap the red tub; drag the red ball onto the yellow one: one piece with two colors.
  3. Rub back and forth over it (6 reversals): aspect > 3; screenshot shows stripes.
  4. Rolling pin: drag across: max height ≤ T + 0.5.
  5. Cutter (Star): tap on the sheet: piece count +2 (cutout + sheet), counter "Shapes: 1", hole visible.
  6. Knife across a piece: piece count +1.
  7. Drag a piece to the press; tap the die wheel twice (Heart); drag the lever down three times; tap the wire:
     a rod piece exists; knife across it near the end: a face-up heart coin, counter +1.
  8. Drag a piece to the roller; drag circles round the crank; tap the knob; a sheet piece appears.
  9. Surprise four times (each moment runs, nothing changes afterwards: compare piece hashes).
  10. New: one ball, counter 0. Reload: state kept. Fresh launch (`toybox-launch` set): fresh state.
- Screenshots at all five sizes, plus a timing check: 5 s of rolling-pin drags on a full mat with the CPU throttled
  4x in Chromium stays above 50 fps.

---

## 5. Phasing

**v1 (L, 1 agent, about 2 sessions):** the mat and dough model (pieces, shading, outlines, remap, cuts), tubs,
Hands (tap, palm press, drag/stick, rub to snake, fold, twist), Rolling pin, Knife, Pizza cutter, Cookie cutters
(eight shapes), Stamper, the dough press with six dies, rod slicing, Surprise moments 1, 3, 4, timer ending, save
and fresh start. If time runs short, the crank roller and hair maker move to v1.1.

**v1.1 (M):** crank roller with the thickness knob; hair maker; Surprise moment 2 (shapes come alive).

**Later:** the roller's **noodle cutter** rollers (wide and thin strips, a real pasta-machine attachment); **molds**
(press dough into a fish/rocket/gear mold, lift a raised 3D shape out); the drying board and Shelf (if the dad wants
it); a two-color **cane** (wrap a sheet round a snake, slice it to show rings and spirals); more die shapes.

---

## 6. Risks and how to reduce them

- **Dough looking like flat stickers or like plastic.** Height lighting with soft shading, the darker-shade outline,
  a small sheen, and the bigger lifted shadow when dragging. Build the shading and one ball first and get the dad's
  OK on a screenshot before the tools.
- **Volume drift or holes after many remaps** (bilinear resampling smears heights). `fixVolume` after every op;
  crumbs merged; a debug volume check in the test script; ops clamp `H ≥ 0`.
- **Marbling turning into noise** after many folds (stripes thinner than a cell). Folds are capped visually: when a
  stripe is under 1.5 cells, the fold keeps the larger color's run (a mode filter on 3x3 for that op only), so streaks
  stay readable.
- **Gesture conflicts** (drag vs rub vs hold). Clear thresholds (4.3.11), tested with recorded drags; ambiguity
  defaults to drag (the safest result).
- **Tight sideways phone layout** (machine band only ~112 px). Machines drawn from their working parts outward (die,
  wheel, handle, crank, knob first); hit areas larger than the drawing; Big mode.
- **Performance of the cutter SDF on large sheets.** Bound by the shape's box; spread over two frames if needed.
- **Storage size.** PNG packing, piece cap of 16, crumbs merged; on a quota error, keep running and skip saving.

---

## 7. Open questions for the dad

1. Should finished shapes go to a **Shelf** kept across visits (a drying board at the mat's edge, last twelve kept),
   or is the mat enough (v1: mat only, cleared on a fresh visit)?
2. Colors stay as **streaks forever** (never muddy into one color, unlike real dough after a lot of kneading). OK?
3. The **crank roller** in v1 or after (v1 has the press; the roller is the second machine)?
4. Eight colors and eight shapes (Star, Heart, Circle, Gear, Rocket, Train engine, Dump truck, Fish): any shape he
   would love more (an excavator, a 3D-printer Benchy boat, a marble)?
5. On a phone held sideways the machines are small. Fine as is (Big helps), or should the app prefer upright?

---

## 8. Icon idea

A chunky lever dough press seen from the front, slightly to the left of center, its long red lever handle angled
up to the right; out of its die comes a fat star-shaped rod in blue and yellow stripes that curls in one loose loop
at the bottom right. In the lower left, a small pink cookie-cutter star shape. Flat colors, #1D2340 outlines 4 px,
#CDE9FF full-bleed background. The maskable version keeps the press, the loop and the star inside the central 80 %.
