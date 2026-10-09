# Sewing Machine: design and engineering plan

## 1. Summary

A full sewing machine, drawn from where you sit to sew, where every part on it works: the power switch, the
foot pedal, the handwheel, the stitch selector, the reverse lever, the presser foot lever, the tension dial, the
thread cutter and the clear bobbin cover. He makes real things from start to finish. The pieces are already cut.
He lines them up and pins them, sews the seams, turns corners with the needle down, backstitches, pulls the work
out and snips the threads, turns it right side out, stuffs it and sews the gap closed. v1 has three projects (a
pillow, a patch on jeans, a little stuffed fish) and a scrap of fabric for free sewing. An "Inside" view shows the
real lockstitch forming in slow motion: the needle thread loop is caught by the rotary hook, goes around the bobbin
case and locks with the bobbin thread. Finished items go onto a shelf on the wall, kept across visits as his
collection.

- Folder `sewing-machine/`, a single page `sewing-machine/index.html` (see 4.1 for why), plus
  `manifest.webmanifest` and the four icons. It has no `sw.js`.
- Launcher tile: **"Sewing Machine"**. Header title "Sewing Machine", or "Sewing" if fit.js reports the longer one
  cut off at 390 px.
- `Toybox.init({ app: "sewing-machine" })`. Storage key `sewing-machine-v1`.

---

## 2. The real thing

### 2.1 The machine (a mechanical home machine with a drop-in bobbin, no brand)
These are the parts as you meet them along the thread, then the controls. **Bold** names appear on screen as name
tags (see 3.2, "Name tags").

| Part | What it really does | In the app |
| --- | --- | --- |
| **Spool pin** + spool cap | Holds the spool of thread on top of the machine | Spool sits on it and spins as thread is used |
| **Thread guide** | Hooks on top and on the front of the head that lead the thread | Thread path drawn through them |
| **Tension dial** + tension discs | Discs squeeze the top thread so the stitch locks in the middle of the fabric | Working dial (see 3.2) |
| **Take-up lever** | Swings up and down with each stitch: gives thread for the loop, then pulls the stitch tight | Bobs in time with the needle, always visible |
| **Needle** + needle clamp, needle bar | Carries the top thread through the fabric; its eye is at the point end | Big, moves up and down, swings side to side for zigzag |
| **Presser foot** + **presser foot lever** | The foot holds the fabric flat on the feed dogs; the lever behind the head raises and lowers it | Working lever; clear foot (open toe) so new stitches show |
| **Needle plate** with seam guide lines | Metal plate under the foot; engraved lines for keeping the fabric edge straight | Guide lines drawn **without numbers** |
| **Feed dogs** | Little toothed bars that rise through the plate and walk the fabric to the back, one stitch at a time | Visible through the plate slots, moving in their real up, back, down, forward loop |
| **Bobbin** + **bobbin case** + **rotary hook** | The bobbin holds the bottom thread; the rotating hook catches the top loop and takes it around the bobbin case | Under a **clear bobbin cover** you can see the bobbin spin; shown in full in the Inside view |
| **Bobbin winder** | A spindle on top that fills an empty bobbin from the spool | Automatic moment when the thread color changes |
| **Handwheel** | Turned toward you, it moves the needle by hand | Working: drag it round |
| **Stitch selector** | Dial with pictures of the stitches | Working dial with six stitch pictures |
| **Reverse lever** | Held down, the machine sews backward (to backstitch) | Working lever |
| **Thread cutter** | A small blade on the side of the head for cutting the threads | Cuts the threads when he pulls the work out |
| **Speed slider** | Sets the top speed (on many machines) | Working slider: Slow / Medium / Fast |
| **Power switch** + sewing light | Switches the motor and the light on | Working switch; the light glows on the needle area |
| **Foot pedal** (foot controller) | Press to sew; press harder to go faster | Working pedal on the floor, pressed by holding it |

Tools on the table, also with real names: **pin cushion** (a tomato pin cushion, the classic one) and **pins**,
**fabric shears**, **thread snips**, **point turner**, a bag of **stuffing**, a soft **tape measure** (only in a
Surprise, drawn without numbers).

### 2.2 Making something, in the real order
1. **Pick the fabric** (printed cotton; the pattern side is the "right side", the paler back is the "wrong side").
2. **Cut the pieces** with fabric shears, using a pattern piece.
3. **Line up** the pieces right sides together (the pattern sides face each other).
4. **Pin** across the seam line.
5. **Thread the machine**: spool on the spool pin, through the thread guides, between the tension discs, up
   through the take-up lever, down to the needle and through its eye. **Wind the bobbin** and drop it in the
   bobbin case.
6. Put the fabric under the foot, **lower the presser foot**.
7. **Backstitch** a few stitches at the start (reverse lever), then sew forward along the seam line, keeping the
   edge on a guide line. Take each pin out just before the needle gets to it.
8. At a **corner**: stop with the **needle down**, **lift the foot**, **turn the fabric** around the needle,
   **lower the foot**, sew on.
9. Leave a **gap for turning** (pillow, toy); **backstitch** at the end.
10. Lift the foot, pull the work out to the back, cut the threads on the **thread cutter**.
11. **Trim the thread tails** with thread snips. On curves, **clip the curves** (little snips in the seam
    allowance so the curve lies flat once it is turned right side out).
12. **Turn it right side out** through the gap; push the corners out with the **point turner**.
13. **Stuff** it (pillow, toy).
14. **Close the gap** (by hand with a ladder stitch, or with a short seam on the machine close to the edge).

The patch is shorter: pin the patch over the hole, set the stitch selector to **zigzag**, sew around the patch
edge (turning at each corner), snip the threads.

### 2.3 Kept, made automatic, dropped
- **Kept as things he does himself**: power switch, pedal, steering the fabric, presser foot lever, turning
  corners with the needle down, reverse lever, handwheel, stitch selector, speed slider, lining up the pieces,
  pinning, pulling the work out, snipping thread tails, clipping curves, turning right side out, stuffing.
- **Automatic, and he watches it happen** (each about 2-5 s at the calm pace, with name tags so the real names
  stay visible):
  - **Cutting the pieces**: they come off the fabric already cut, with a quick pass of the shears.
  - **Threading**: a bright line runs the real path, from the spool pin through the thread guide, the tension
    discs, the take-up lever and the needle eye. It runs on the first thread color, and again whenever he picks
    a new thread color.
  - **Winding the bobbin**: the bobbin winder fills a bobbin and it drops into the bobbin case. This also runs
    with each new thread color (a real rule: the bobbin is wound from the new spool).
  - **Taking out pins**: each pin pops out and flies into the pin cushion just before the foot gets to it. He
    can also tap a pin to take it out.
  - **Pushing out corners**: the point turner pokes each corner after the item is turned right side out.
- **Dropped** (the "no procedural extras" rule):
  - Threading by hand and using a needle threader.
  - Changing the needle.
  - The **stitch length dial** (its only effect is a number).
  - Bobbin thread running out.
  - Pattern tracing and cutting by hand (Cutting Board already has cutting).
  - Pressing seams with an iron (a "later" idea).
  - Closing the gap by hand: v1 closes it on the machine (a real method). See the open questions.

---

## 3. Experience design

### 3.1 The scene and the view
**Operator's view**: what you see sitting at the sewing table, looking a little down at the machine. The camera
moves between two framings (it is one scene, with no insets):
- **Machine framing** (between seams and for table steps): the whole machine on the sewing table, seen from the
  front. The head with the needle is on the left. The arm runs right to the pillar with the spool pin and the
  bobbin winder on top, and the handwheel is at the right end. The stitch selector, speed slider, reverse lever and
  power switch are on the front of the pillar. The work area of the table is to the left and in front. The pin
  cushion, snips and stuffing bag are on the table. The foot pedal is on the floor under the table, bottom right.
  The shelf of finished items is on the wall above.
- **Sewing framing** (whenever fabric is under the foot): the camera tips down and closes in on the needle area,
  seen steeply from above (about 60 degrees down). The fabric fills most of the stage and moves away from him (up
  the screen), as it really does. The clear presser foot shows each new stitch. Further up, the sewn line shows
  again past the head. The take-up lever, needle bar, presser foot lever and thread cutter stay in view at the
  top. The handwheel, reverse lever, stitch selector and pedal stay in reach along the right and bottom edges,
  drawn at the same scale as in the machine framing.
- The camera eases between the two framings over 0.9 s. It moves only because of the work (fabric goes under the
  foot, or the work is pulled out). Tabs and tiles never move it.

**One obvious first action.** On a fresh visit the pillow pieces are already lined up, pinned and under the
lowered foot, and the machine is threaded. This way his first two touches make stitches. Line up and pin come with
the next item. Coach: **"Switch it on!"** (the switch flashes). Then **"Press the pedal!"**. Ghost hand: a tap on
the switch, then a press and hold on the pedal (shown as a long press with the gold ring filling).

Each step has one coach line, short words, always true:
"Switch it on!", "Press the pedal!", "Backstitch!", "Lift the foot!", "Turn the fabric!", "Foot down!",
"Pull it out!", "Snip the threads!", "Snip the curves!", "Line them up!", "Pin it!", "Turn it out!",
"Stuff it!", "Sew it closed!", "Turn the dial to zigzag!", and at the end "A pillow!", "A patch!", "A fish!".

**Ghost hand** (shared snippet, at most 2 per visit, never again once he has done the move). Its move follows the
current step:
- machine off: tap the switch;
- ready to sew: hold the pedal;
- at a corner: tap the foot lever, then drag the fabric round;
- pieces apart: drag the top piece onto the bottom one;
- tails showing: tap a tail;
- turning out: drag out of the gap;
- stuffing: drag a handful from the bag into the gap.

### 3.2 Every interaction

**Power switch** (front right of the base). Tap: it flips, the sewing light comes on with a warm glow on the
needle area, and the motor gives a small start-up shiver. Tap again: off.

**Two-step rule.** If he presses the pedal while the machine is off, the coach says "Switch it on!" and the switch
flashes. On the second press the machine switches on for him.

**Foot pedal** (drawn big, at least 96 px wide on phones, bottom-right of the stage).
- Press and hold: the pedal tips down, the motor ramps up over 0.4 s and the machine sews at the speed slider's
  setting.
- Letting go: it slows to a stop within 0.3 s, and always stops with the needle **up** (except at corners, see
  below).
- Sliding the finger further down the pedal presses it deeper. Deeper is a bit faster, never faster than the
  slider allows.
- A quick tap sews exactly one stitch, slowly, so a tap always shows something.
- Holding works one-handed: the machine keeps the fabric on the seam line by itself (see steering).

**Every stitch shows, with sound off:**
- the needle drops through the fabric;
- the take-up lever bobs;
- the spool turns;
- the feed dogs walk the fabric back;
- a new stitch of colored thread appears in the clear foot;
- the bobbin spins under the clear bobbin cover.

**Speed slider** (Slow / Medium / Fast, with a tortoise and a hare pictured; words, no numbers). Drag or tap a
spot. The default is **Slow**, about 2 stitches a second. Medium is 3.5 and Fast is 5, which is still calm to
watch.

**Steering the fabric.** He drags anywhere on the fabric. With the foot down, a sideways drag turns the fabric
slowly about the needle, the way your hands guide it. The feed dogs always pull it straight back.
- **Assist**: on a project, the fabric is turned toward the chalk seam line by itself. It looks ahead about one
  foot length and keeps the edge on the needle plate guide line, so a held pedal alone sews a neat seam. His
  steering can wobble it a little, but the assist pulls it back. If the seam drifts more than a set distance, the
  assist strengthens for a few stitches.
- On the **Scrap** there is no assist: he sews any path he likes, curls and all.

**Corners (needle down, foot up, turn, foot down).** On a seam line, the machine stops by itself at each corner
with the needle **down** in the fabric. Home machines with a needle-down setting really do this.
1. The coach says "Lift the foot!" and the presser foot lever glows. He taps the lever: the foot rises with a
   clack.
2. "Turn the fabric!": he drags the fabric round. It pivots about the needle and snaps to the new direction within
   about 15 degrees.
3. "Foot down!": he taps the lever.
4. "Press the pedal!"

Forgiving: if he just keeps pressing the pedal at a corner, the first press flashes the lever. The second press
does the whole pivot for him (foot up, turn, foot down), shown at the calm pace, then sewing carries on.

**Pedal with the foot up** (any time): "Foot down!" and the lever flashes. The second press lowers it for him.

**Reverse lever.**
- Holding it while the pedal is held sews backward: the feed dogs walk the fabric toward him and the new stitches
  run back over the old ones, visibly doubled.
- A quick tap while sewing (or just before) does a real backstitch by itself: a few stitches back, then forward
  again. The few stitches are shown, not counted.
- At the start and the end of each project seam the coach says "Backstitch!" and the lever glows once. If he
  skips it, nothing goes wrong and the seam still holds (no fail states).

**Handwheel.** Drag it round in a circle: one full turn is one stitch. The needle, the take-up lever and the feed
dogs follow his finger exactly, so he can move the needle down by hand. Turning either way turns it toward him
(the right way), so a wrong-way drag still moves it. This works with the power off too, as on the real machine.

**Stitch selector.** Drag the dial round or tap a picture on its rim. It clicks to one of six stitch pictures:
Straight, Zigzag, Scallop, Feather, Ric-rac and Blind hem (real stitch names on mechanical machines; the name tag
shows the word). From the next stitch, the needle bar swings side to side to make the pattern. On the patch the
coach suggests "Turn the dial to zigzag!" once. A straight stitch is not wrong there either.

**Tension dial** (a dial with dots, no numbers). Turning it squeezes or opens the two tension discs, so you can see
the discs close on the thread. In the Inside view, the lock point of the stitch moves a little up or down inside
the fabric. The stitches on top never look broken. Tighter or looser only changes how flat they lie (a gentle look,
never a fault).

**Presser foot lever.** Tap: the foot goes up or down with a clack. Foot up lets the fabric slide freely, so he can
place it, turn it or pull it out.

**Placing the work.** When a pinned piece is waiting on the table:
- **Drag it toward the machine**: it slides under the raised foot and snaps to the start mark, then the foot
  lowers itself. Lowering it is a step that only adds waiting.
- A **tap on the work** does the same, as a backup.

**Pulling the work out.** At the end of a seam:
1. "Lift the foot!"
2. "Pull it out!": he drags the work away. The threads stretch, catch on the thread cutter and snip (a tiny spark
   of light at the cutter). The camera eases back to the machine framing.
- If he tries the pedal instead, the second press does it for him.

**Name tags.** Touching any machine part or tool for the first time this visit pops a small white tag with its
real name ("Take-up lever", "Feed dogs", "Bobbin") for about 3 s, next to the part. The same tags appear while
threading and winding run. Tags are words, not lessons, and never block a touch.

**Table steps** (on the table, machine framing):
- **Line them up**: drag the top piece (pattern side down, showing the paler wrong side) onto the bottom piece. It
  snaps when it is close, with a little bounce. Backup: a tap on the top piece slides it into place.
- **Pin it**: pin marks glow along the seam line. A tap on each mark pushes in a pin (colorful glass heads) with a
  tiny wobble. Backup: a tap on the pin cushion pins every mark one by one (about 0.4 s apart).
- **Snip the threads**: two thread tails hang at each seam end. Tapping a tail, or dragging the thread snips across
  it, snips it and the tail drifts down. Backup: a tap on the snips trims them all, one by one.
- **Snip the curves** (fish only): little wedge marks glow around the curve, and each tap snips a notch. Backup: a
  tap on the snips.
- **Turn it out**:
  1. He drags outward from the gap: the item squashes, turns through the gap, wobbles and shows its pattern side.
     The seam is now hidden inside, which is how it really looks.
  2. The point turner then pokes each corner out by itself.
  - Backup: a tap on the item.
- **Stuff it**: he drags from the stuffing bag to the gap. Each handful is a white cloud that shrinks into the gap,
  and the item puffs up rounder (a pillow takes 4 handfuls, the fish 3). Backup: a tap on the bag drops one
  handful.
- **Sew it closed**: the stuffed item goes under the foot along the gap. A short seam close to the edge closes it,
  with the same pedal and the same backstitch prompt.

**Finished.**
- A sparkle runs along the seams and the coach says "A pillow!".
- `Toybox.kind()` is called.
- The item **stays on the table** (results stay). A copy goes to the shelf on the wall with a hop, and the counter
  goes up.
- It stays until he picks a project tile or New.

**Multi-touch.** Pedal and steering at the same time (two hands on the iPad, two thumbs on the phone), pedal and
reverse lever at the same time. Every control tracks its own `pointerId`.

### 3.3 Projects (v1)
Each project has pieces with a chalk seam line in fabric coordinates, corner points, a gap for turning, pin points
and the order of its steps. The target is about 2-3 minutes from start to the finished item with assist.

| Project | Pieces | Steps after "line up, pin" | Seams |
| --- | --- | --- | --- |
| **Pillow** | Two squares | Sew round 4 sides, leaving a gap on the last side (3 corners), snip, turn, stuff, sew closed | 2 |
| **Jeans patch** | A jeans leg laid flat with a hole at the knee, and a patch (square in v1) | Pin the patch, zigzag around it (4 corners, the seam ends where it began), snip | 1 |
| **Stuffed fish** | Two fish shapes | Sew round the curved outline (the tail tips are 2 corners), gap at the belly, snip threads, snip the curves, turn, stuff, sew closed. The eye is embroidered by the machine in v1: a tiny tight zigzag spot that the machine sews by itself after closing | 2 |
| **Scrap** | One scrap rectangle (doubled) | Free sewing: any stitch, any path, no steps. When it is crowded the coach says "New scrap?" and New gives a fresh one | - |

### 3.4 Panel
**No Go button.** The pedal is the main action and it is on the machine; an HTML "Sew" button would duplicate it.
The table steps each have the in-scene backup taps described above.

**Tabs**: `Make` · `Fabric` · `Thread` · `New` (orange) · `Surprise` (rainbow). The panel stays the same height for
every tab.
- **Make**: picture tiles for Pillow, Patch, Fish and Scrap. The project being made is marked `aria-pressed`.
  Re-tapping it gets the shared wiggle. Tapping another one clears the table: the cut pieces of the new project
  appear with a quick pass of the shears, ready for "Line them up!". The finished item, if any, is already on the
  shelf.
- **Fabric**: six printed cottons as tiles: Stars, Polka dots, Stripes, Gingham, Rainbow, Rockets. On the patch,
  the patch fabric changes (the jeans stay denim).
  - Before the first stitch: the pieces change at once.
  - After it: the coach says "Next time!" and the tile is marked for the next project, so the tap is never dead.
- **Thread**: six spools as tiles (red, orange, yellow, green, blue, purple) and a seventh tile, **Inside**, which
  opens the Inside view (it stays pressed while the view is on; tapping it again goes back).
  - A new color runs threading and bobbin winding (the work in progress keeps its stitches). The next stitches
    are in the new color, as on a real machine.
  - Tapping the clear bobbin cover on the machine also opens the Inside view, because that is where you really
    look at the bobbin.
- **New**: starts the current project over, with fresh pieces. On the Scrap it gives a fresh scrap.
- **Surprise**: see 3.7.

**Counter**: **"Made: N"**, the items finished this visit (only one counter on the page).

### 3.5 Inside view (an alternate full view, allowed by the "no insets" rule)
The whole stage becomes a cutaway seen from the front: the needle with the top thread, the presser foot, the two
fabric layers, the needle plate, the feed dogs, and under the plate the **rotary hook** (a ring with a sharp point)
turning around the **bobbin case**, with the **bobbin** inside it and its thread coming up.
- The same pedal (bottom-right) and handwheel (right) are drawn, and they drive the same machine. Here one stitch
  takes about 3 s at Slow, so he can watch the lock form. The handwheel lets him step through it by hand.
- Name tags label every part.
- In this view, the needle thread is drawn in the spool color. The bobbin thread is drawn in the same color with a
  darker outline, so the two can be told apart where they lock (open question 4).
- Tapping the Inside tile again, or the bobbin cover drawn in the cutaway, returns to the sewing scene.

### 3.6 Layout per size
Shared: the standard shell. The header has Home, the title and Big. The stage is a canvas. The panel is under the
stage in portrait and a right-hand column in landscape.

**390x844 (iPhone upright)**
- Stage about 370x600; panel about 150 tall (one row of tiles and the tab bar).
- Machine framing: the shelf is a thin strip along the top (about 50 px, the last 4 items). The machine fills the
  width just below it (about 370x230). The table and work area are below that, with the pedal in the bottom-right
  corner (about 100x70).
- Sewing framing: the needle and foot sit about a third of the way down. The fabric fills the lower two thirds and
  feeds upward, which suits an upright phone (the seam runs up the screen). The handwheel's lower half sits on the
  right edge, with the reverse lever and stitch selector stacked above it. The pedal stays bottom-right.
- The coach pill is bottom-center, just above the pedal row and clear of it.

**844x390 (iPhone sideways)**
- Stage about 600x330; panel column 200 wide. Tiles in 2 columns: Make has 4 tiles, Thread has 7 (it scrolls
  inside the column if it must, as in the lathe).
- Machine framing: the machine is about 470 wide, the table work area to its left is narrow, and the pedal is
  bottom-right. The shelf is hidden in this framing (no room); it is shown on the tablet sizes and the upright
  phone.
- Sewing framing: the needle is at the upper middle, the fabric below it and the controls on the right edge.

**820x1180 (iPad upright)**
- Stage about 800x880. The shelf is on the wall with up to 6 items, the whole machine is big, and the table work
  area is in front of it. Sewing framing as on the phone, with more fabric visible.

**1180x820 and 1024x1366 (iPad)**
- The panel column is 340 wide. In the machine framing the whole machine, the table and the shelf (6 items) all fit
  with room to spare, and the scene is framed so the machine and pedal are as big as they can be.

**Orientation preference: none.** Both framings work either way round.

**Big mode** hides the panel. The Make, Fabric and Thread choices go away, but every machine control is in the
scene, so play carries on.

### 3.7 Surprise (a fun moment on the current scene, in turns)
1. **Button tin spill**: the button tin on the table tips over, buttons of every color roll and spin across the
   table and the fabric, then hop back into the tin one by one.
2. **Tape measure snake**: the soft tape measure (no numbers printed on it) unrolls itself, wriggles across the
   table and zips back into a roll.
3. **Faces**: the machine, the spool and the tomato pin cushion get happy faces for about 5 s. The machine blinks
   its light, the spool looks at his finger and the pin cushion's pins wiggle like hair.
4. **The item comes alive** (only when a finished item is on the table; otherwise this turn is skipped):
   - the fish swims a lap of the table and flops back;
   - the pillow bounces like a little trampoline;
   - the jeans do a knee-bend.
- Surprise never changes his work and never sews by itself.

### 3.8 Results, collections, fresh start
- **Kept across visits (collection)**: the **shelf** of finished items, each with its project, fabric, thread
  color and stitch type. They are redrawn from those, so the saved data stays small. The last 12 are kept; the
  wall shows the most recent 4 or 6.
- **Kept on reload**: the work in progress (step, pieces, stitches), the machine settings and the counter.
- **Fresh visit** (`Toybox.fresh()`):
  - The Pillow is ready under the foot as described in 3.1. Fabric is Stars, thread is red, the stitch is Straight,
    the speed is Slow and the tension dial is in the middle.
  - The power is off, "Made" is 0 and the Inside view is closed.
  - The shelf is kept.
- **Grown-up setting**: one entry in `SETTINGS`: `{ id: "sewing-clear", app: "Sewing Machine", label: "Hold to
  clear the shelf", type: "action" }` (like `printer-clear`).

### 3.9 Timer ending and rest
- `onEnding`:
  - With the goodbye option: the "Switch off" button shows.
  - Otherwise, or after it is pressed: the machine winds down, stops with the needle up, the presser foot rises,
    the sewing light fades and the spool stops turning.
  - `done()` is called once the motor is still.
- Rest art: the machine with a cover half over it and "z z".
- Rest line: **"The sewing machine is resting."**; line 2: "Your things will be on the shelf next time."
- `Toybox.offFirst({ running, off })` switches the motor off quietly if he leaves while sewing.
- **Kind words**: `Toybox.kind()` when a project item is finished (not for the Scrap).

### 3.10 Safety ritual
None. A real one would be "fingers away from the needle". It is a one-off rule rather than gear to put on, and the
dad toned rituals down. The clear foot and the steering hand stay away from the needle in the drawing: the steering
drag works anywhere on the fabric and the needle is never a touch target.

### 3.11 Sound (Web Audio, soft, only when sound is on)
- **Motor**: a low hum (triangle about 90 Hz, low-passed) whose pitch and volume follow the speed.
- **Each stitch**: a soft "tuk" (a 30 ms filtered noise tick at about 1.2 kHz) when the needle goes in, so the
  rhythm matches what he sees.
- **Feed**: a faint rustle (band-passed noise) under the motor.
- **Clicks**:
  - presser foot lever: a 2-part clack;
  - stitch selector: a detent tick per position;
  - power switch: a click and a rising hum.
- **Handwheel**: a gentle ratchet tick per eighth of a turn.
- **Threads snip** (cutter or snips): a short bright noise burst.
- **Pins**: a glassy tink.
- **Bobbin winder**: a higher whirr that rises as the bobbin fills.
- **Stuffing**: a soft "fff".
- **Finish**: a short 3-note chime.
- **Surprise**: rolling-button clatter (a few randomized ticks), a zip for the tape measure.

### 3.12 Numbers
None shown except the counter "Made: N". On purpose, these have no numbers:
- the tension dial (dots);
- the stitch selector (pictures);
- the speed slider (Slow / Medium / Fast);
- the needle plate guide lines;
- the tape measure in the Surprise.

Name tags are words. There is no stitch counter.

---

## 4. Engineering plan

### 4.1 Files and pages
- `sewing-machine/index.html` is **a single page**. Kitchen and Workshop are split because each page is a different
  machine. Here there is one machine, and every step happens on the same table under the same camera. On one page
  the step flow, the camera and the state are one state machine, and he never waits for a page load in the
  middle of a project.
- `manifest.webmanifest`, `icons/icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.
- Registration: `python3 tools/add-app.py sewing-machine "Sewing Machine" "Sew a pillow, a patch or a toy fish"
  "Sewing Machine: a real sewing machine with working pedal, handwheel, stitch selector, presser foot and reverse
  lever; make a pillow, a jeans patch or a stuffed fish, and see the lockstitch form inside"`.
  - This adds the tile and the CORE entries; the deploy stamps the cache version.
- The coordinator adds `sewing-clear` to `SETTINGS` in `common/toybox.js`. "Good to know" needs no change (sound
  only).

### 4.2 Rendering
- **Canvas** (one 2D canvas for the stage, DPR capped at 2). Reasons:
  - The fabric is patterned and turns freely.
  - Stitches build up in the thousands.
  - The camera zooms.
  - There are particles (stuffing, sparkles, buttons).
- **Machine body**: pre-rendered to an offscreen canvas at each framing's scale on resize. It is redrawn only when
  the size changes. During a camera tween, the cached bitmap is drawn with `drawImage` scaling; it is a little soft
  for 0.9 s, then re-cached at the new scale.
- **Live parts**, drawn each frame on top:
  - needle bar, needle and clamp;
  - take-up lever;
  - presser foot;
  - feed dogs (clipped to the plate slots);
  - the bobbin under the clear cover;
  - handwheel spokes;
  - the spool and its label stripe (to show it turning);
  - the selector, tension and speed dials;
  - reverse lever, foot lever, switch, pedal, the sewing light glow;
  - the thread path.
- **Fabric pieces**:
  - Each fabric pattern is a small tile canvas (64-96 px) made once at load, used with
    `createPattern(...).setTransform(matrix)` so the print turns with the piece.
  - The wrong side is the same tile drawn at 45% contrast over the base color.
  - Pieces are `Path2D` outlines in fabric units (1 unit is 1 mm of the drawn object; no units are ever shown).
  - Two layers are drawn 1.5 px apart so both edges show.
- **Stitch layer**: each piece group (the work) owns an offscreen canvas in fabric coordinates (at most 1024 px on
  its long side, at close-framing resolution). New stitch segments are stroked into it **incrementally** as they
  form (two strokes: a dark 1 px under-stroke, then the thread color with a 1 px highlight). Each frame it is drawn
  with the work's transform: one `drawImage`, whatever the number of stitches.
  - Turning right side out swaps to the "inside" look: seams hidden, with a small pucker line along each seam. That
    is a separate cached outline drawing.
- **Thread path**:
  - A polyline from the spool through the guide points, the tension discs and the take-up lever eye (moving), down
    to the needle eye (moving) and into the fabric.
  - It is 2 px in the spool color with a darker edge, recomputed every frame (about 10 points).
  - During threading, a "head" point runs along the path at about 120 px/s and the path is drawn only up to it,
    with the name tags popping as it passes each part.
- **Puffing** (stuffing): the item outline is a list of points with outward normals. The puffed outline is
  point + normal * puff * bulge(t). A radial shading gradient's strength follows the puff, and the seam line is
  drawn just inside the edge.
- **Turning right side out**: a 1.2 s squash. The item scales on x through 1 → 0.15 → 1 while it wobbles; the wrong
  side shows during the first half and the pattern side after. The point turner sprite pokes each corner (0.4 s
  each).
- **Inside view**: drawn live with paths. The rotary hook is an ellipse (a ring seen at a slant) with a point
  marker that travels round it. The loop is a cubic Bezier chain (see 4.3).

### 4.3 Simulation
**Machine cycle.**
- One stitch is one turn of the main shaft: the phase `th` runs from 0 to 1, with 0 meaning needle at the top.
- The motor's speed `w` (turns per second) eases toward a target:
  - Slow 2, Medium 3.5, Fast 5;
  - times the pedal depth 0.6-1.0;
  - 0 when the pedal is off.
- The handwheel sets `th` directly while it is dragged.

```
needleY(th)   = top + stroke * (1 - cos(2*PI*th)) / 2          // lowest at th = 0.5
takeUp(th)    = lever angle: low around th 0.25..0.55 (giving thread), high near th 0.85 (pulling tight)
feedDog(th)   : th in [0.70, 1.0) U [0, 0.20): up, moving back by stitchLen * dir (smoothstep over that window)
                else: down, returning forward under the plate
hookAngle(th) = 2 * 2*PI*th      // a horizontal rotary hook turns twice per stitch
in fabric      = needleY below the plate top, which is th in about [0.36, 0.64]
```

**Each frame:**
```
prev = th; th += w * dt (or the handwheel delta); wrap at 1 -> stitchIndex++
if crossed(prev, th, 0.36):                        // needle enters the fabric
    x = baseX + swing(stitchType, stitchIndex) * swingW
    p = worldToFabric(needleX = x, needleY = plateY)
    if work under foot and foot down:
        addStitch(prevPoint, p, threadColor); prevPoint = p
        popPinsNear(p)                             // pins within a foot length ahead fly to the cushion
if the feed window is active and foot down and needle out of the fabric:
    work.pos += feedDir * dir * stitchLen * d(smoothstep)   // dir = -1 while the reverse lever is held
```

`swing(type, i)` returns the needle's sideways offset for stitch i:
- straight: [0]
- zigzag: [-1, 1]
- scallop: the satin-like run 0, .3, .6, .85, 1, .85, .6, .3 with a short feed
- feather: [-1, 0, 1, 0]
- ric-rac: [-1, -1, 1, 1] with reverse-forward feeds
- blind hem: [0, 0, 0, 0, 1]

Each type also gives its feed per stitch, so the patterns come out with their real look.

**Steering and assist** (fabric transform: `pos`, `ang`, pivoting about the needle point):
```
if foot down:
    target = seam line point ahead by L along the seam, from the current fabric needle point
    want   = heading that keeps the needle on the seam line
    err    = angleDiff(want, ang)
    ang   += clamp(assist * err * kAssist + fingerTurn, -maxRate, maxRate) * dt   // fingerTurn from his drag
    if off the line by more than a set distance: assist -> 1.0 for the next 6 stitches
if foot up:
    his drag rotates about the needle point (if the needle is down) or moves the work freely (needle up)
```

**Corner stop**: when the remaining seam distance to the next corner is less than half a stitch length, the
machine finishes this stitch, stops at `th = 0.5` (needle down) and sets `step = "corner"`. The pivot snaps to the
next seam segment's heading.

**Step state machine** (per project, data-driven):
```
STEPS.pillow = ["lineup", "pin", "place", "sew:A", "out", "snip", "turn", "stuff", "place:gap", "sew:gap", "out",
                "done"]
sew:A        = { seam: polyline with corners [c1, c2, c3], start backstitch, end backstitch, gap after the end }
sub-states inside sew: ready -> sewing -> (corner: lift -> turn -> lower) -> ... -> end -> lifted -> pulled
Every sub-state has: coach line, ghost plan, glow target, pedal behaviour, backup (second-try auto action).
```

**Work out of the machine**: while the work is dragged away with the foot up, two thread lines run from the needle
and from the plate hole to the work's last stitch. Once they are longer than a set length, they snap at the thread
cutter point, leaving 2 tails on the work (stored as tail objects for the "snip" step).

**Inside view loop** (`th` drives everything; the time scale is 0.35 in this view):
```
0.00-0.36  needle descends; the thread runs down the front of the needle to the eye, back up its groove
0.36-0.52  needle at the bottom, then rises a little; a loop (2 Beziers) bulges out behind the needle eye
0.52       the hook point (its angle at that moment) reaches the needle: the loop is caught
0.52-0.78  the loop is stretched round the bobbin case: its far end follows the hook point round the ellipse,
           and it is drawn behind the case for the back half, so the bobbin thread ends up inside the loop
0.78-0.95  the loop slips off the hook; the take-up lever rises and the loop shrinks back up toward the fabric
0.95-1.00  the lock (top and bobbin threads crossed) settles between the two fabric layers at the tension offset;
           the feed dogs carry the fabric one stitch; the finished stitch joins the row of lock points
```
The lock point's height between the layers is `0.5 + tensionOffset * 0.3`, which is the only visible effect of the
tension dial in this view.

**Particles** (pooled, at most about 120): stuffing puffs, snip sparkles, thread tail falls, Surprise buttons
(simple ballistic motion plus a table-bounce damping), finish sparkles.

### 4.4 State and storage
`localStorage["sewing-machine-v1"]`, read and written in try/catch, saved 400 ms after a change and flushed on
`visibilitychange`:
```
{ v: 1,
  project: "pillow", fabric: "stars", nextFabric: null, thread: "red", stitch: "straight",
  tension: 0.5, speed: 0, made: 0,
  work: { step: "sew:A", sub: "ready", pos: [x, y], ang: 0,
          stitches: [[x1, y1, x2, y2, colorIndex], ...],     // rounded to 0.5 units, capped at 4000
          seamAt: 123.5, corner: 1, pinsLeft: [..], tails: [..], puff: 0, turned: false },
  shelf: [ { k: "pillow", f: "stars", t: "red", s: "zigzag", d: 1760000000000 }, ... ]  // last 12
}
```
- On load the stitch layer is rebuilt by stroking the saved stitches once.
- `Toybox.fresh()`: `S = freshState(); S.shelf = saved.shelf;` then write (as in the lathe).
- The action `Toybox.settings.action("sewing-clear", ...)` empties the shelf.
- Older or unknown fields are ignored, so the format can grow.

### 4.5 Toybox integration
```
Toybox.init({
  app: "sewing-machine", big: { button: bigToggle }, badge: tbadge,
  timerIntro: "When time is up, the sewing machine stops with the needle up, the light goes off and the controls lock.",
  goodbyeOption: "End with a “Switch off” button to press", goodbyeLabel: "Switch off",
  farewellText: "Time to finish sewing", farewellDone: "Bye bye!",
  restLine: "The sewing machine is resting.", restLine2: "Your things will be on the shelf next time.",
  restArt: restArt, soundNote: "A soft motor hum, stitch ticks and snips. Hold for 2 seconds.",
  onEnding, onGoodbye, onRest, onWake, onBig: resize, onSound, onTimer
});
Toybox.offFirst({ running: () => motor.w > 0.05 || pedalHeld, off: stopMotorNeedleUp });
```
- All play input checks `Toybox.timer.locked()`.
- Paste the ghost hand from `tools/snippets/ghost-hand.js` and its `.css`, and the coach pill CSS.
- Picked tiles carry `aria-pressed` so the shared re-tap wiggle works.
- `?debug` exposes `window.__sew` (state, hit zones, a `fastForward(stitches)` helper for tests).
- Pointer events, `touch-action: none` on the canvas, `gesturestart` and `contextmenu` prevented, several pointers
  at once.
- Respect `prefers-reduced-motion`: shorter camera tweens, no wobble on turning out, and Surprise moments without
  the rolling.

### 4.6 Performance (60 fps on iPad, DPR at most 2)
- Static machine body: one cached bitmap per framing.
- Stitches: one cached layer, with incremental strokes (one or two segments per frame at most).
- Fabric print: one pattern fill per layer.
- Thread path: about 10 points; Inside view: about 10 paths.
- Particles pooled and capped.
- Nothing allocates in the frame loop.
- The frame loop pauses while resting.
- Measure: Chrome performance trace at 1180x820 with DPR 2 while sewing at Fast with steering. The target is under
  8 ms of script and paint per frame.

### 4.7 Test plan
- Serve: `npx http-server . -p <port> -c-1 -s`; block Google Fonts in Playwright.
- `node tools/smoke.js sewing-machine/` at all five sizes (390x844, 844x390, 820x1180, 1180x820, 1024x1366), with
  `MOBILE=1` for the phone sizes: no page errors, no page scroll.
- `tools/buttons.js sewing-machine/`: every tile and tab gives a visible change (including Fabric after the first
  stitch, which shows "Next time!").
- `tools/fit.js sewing-machine/`: the title, tiles, tabs and counter fit at every size.
- Playwright play script (with `?debug`, positions from `__sew` hit zones):
  1. Fresh launch. Tap the switch, then hold the pedal for 3 s: the stitch count rises, the work moves up the
     screen and `seamAt` grows.
  2. Hold until the machine stops at a corner. Press the pedal twice: the automatic pivot runs, then sewing goes on.
  3. Do one corner by hand: tap the foot lever, drag the fabric round, tap the lever, then the pedal.
  4. Tap the reverse lever: a backstitch shows (the seam position goes back, then forward).
  5. Turn the stitch selector to zigzag: the needle swing is not zero.
  6. Finish the seam, lift the foot and drag the work out: there are 4 tails. Tap each tail, drag out of the gap,
     drag stuffing 4 times, sew the gap: the shelf grows by 1, "Made: 1" shows and the item stays on the table.
  7. Reload: the item and shelf are still there. A fresh launch (new `toybox-launch`) resets the work and keeps the
     shelf.
  8. Thread tab: tap blue (threading and winding run, then blue stitches). Tap Inside: the cutaway draws and the
     pedal makes a slow stitch. Tap Inside again to come back.
  9. Surprise 4 times: each moment runs and play continues.
  10. Timer: set it to end and check that the machine stops with the needle up and the rest screen shows.
- Screenshots of the machine framing, sewing framing, Inside view and finished item at the three main sizes;
  **look at them**.

---

## 5. Phasing

**v1a** (effort L, 1 agent):
- The machine, with every part working and the name tags.
- Both framings and the camera.
- Stitching with the six stitch types, steering with assist, corners, backstitch, pulling out and the thread
  cutter.
- Threading and bobbin winding moments.
- **Scrap** and **Pillow**, end to end.
- Shelf, counter, storage, fresh start, timer, sound, Surprise moments 1-3.

**v1b** (effort M, 1 agent, after v1a, or alongside it on its own data and drawing functions if the coordinator
splits it):
- **Jeans patch** and **Stuffed fish** (curves, clip the curves, the machine-sewn eye).
- **Inside view**.
- Surprise moment 4.
- The `sewing-clear` setting.

Later, if the dad likes it:
- **Tote bag**, with the real **free arm**: tap the accessory tray, it slides off and the bag's top goes round the
  free arm for the hem.
- **Sewing on a button** (zigzag with the feed dogs dropped).
- A **buttonhole** with the buttonhole foot.
- **Pressing** seams with an iron.
- A quilt square from four patches.
- More fabrics, and a patch shape choice (heart, star).

---

## 6. Risks

- **Too many steps for a 3-year-old.** Every step has:
  - one coach line;
  - a glowing target;
  - a ghost hand;
  - an in-scene backup tap;
  - the second-try automatic action.

  The pillow should take about 2-3 minutes. If testing shows a step is a chore, it becomes automatic. Candidates:
  pinning, then clipping the curves.
- **Two hands needed (pedal plus steering).** The assist sews a neat seam with the pedal alone, and corners stop
  and pivot for him. Steering is extra fun, not a requirement.
- **The sewing framing hides the sewn seam under the head.** Mitigations: the steep camera, the clear presser foot
  and a foreshortened head. If it still hides too much at 844x390, the head is drawn smaller in that framing, or
  the camera pans with the work.
- **Lockstitch drawing looks wrong.** Check the hook timing against references for a horizontal rotary hook before
  drawing. Build the Inside view with the handwheel first, so each phase can be checked frame by frame.
- **Hit areas crowd each other on phones** (handwheel, reverse lever, selector, pedal and fabric). Controls get
  fixed hit zones that win over the fabric, each at least 48 px. Steering works anywhere else on the fabric, and
  the needle is never a target. Run buttons.js and a manual pass at 390x844.
- **Performance with many stitches.** The incremental stitch layer avoids redrawing them; the 4000-segment cap and
  the Scrap's "New scrap?" keep it bounded.
- **State bugs across steps and reloads.** One step table per project, saved after each change, and a reload test
  at every step in the Playwright script.

---

## 7. Open questions for the dad

1. **Corners**: the machine stops by itself with the needle down at each corner (as a needle-down setting does),
   then he lifts the foot and turns. Or does he stop with the pedal himself, with a hint when he passes a corner?
2. **Pins**: they pop out into the pin cushion by themselves just before the foot gets there. Or should he pull
   each one, with sewing pausing at a pin?
3. **The machine's look**: a mechanical machine with dials (planned) or a computerized one with a screen and
   buttons? Does the family have a machine it should look like (still without logos)?
4. **Bobbin thread color**: the same as the top thread (the real way, planned), or a contrasting bobbin color so
   the lock shows clearly in the Inside view and on the back of the fabric?
5. **Closing the gap**: a short machine seam (planned), or a hand ladder stitch with a hand needle (more real, more
   fiddly)?
6. **Projects**: are Pillow, Jeans patch and Stuffed fish the right first three, or is there something he would
   rather make (the tote bag, something for a family member)?

---

## 8. Icon idea

The machine's head and needle area, big and slightly from the front-left, on a flat #CDE9FF background:
- a red machine body with chunky #1D2340 outlines;
- the needle down into a yellow-and-blue star-print fabric;
- a row of bright red straight stitches running away up the fabric;
- a big spool of red thread on the spool pin at the top right;
- the handwheel peeking at the right edge.

For the maskable icon, the needle, the stitches and the spool stay inside the central 80%.
