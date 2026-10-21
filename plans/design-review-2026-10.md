# Design review, October 2026

A review of every page against `AGENTS.md`, at all five test sizes (upright and sideways phone, upright and
sideways iPad, iPad Pro), with the main interaction played on each page. Nothing was broken in the sense of page
errors or page scroll: all 59 pages load and pass the smoke test at every size. The findings below are rule
violations and polish, grouped by theme so one agent can fix one theme across pages. Screenshots from the review
were in `/tmp/toybox-review/` (not kept).

The engineering cleanup that ran alongside it is done and not repeated here: the idle ghost hand is the shared one,
the Workshop stations and Hammer & Screws use the shared coach line, the six biggest pages moved their scripts to
`.js` files, the whole site lints clean (`tools/lint.js`, now a blocking deploy check), and the shared layer had
four bugs fixed (reduced motion on new instructions, a palm guard that could block every touch, toasts, keyboard
holds).

## 1. Fix without asking (clear rule violations)

**Status 2026-10-20: done.** Every item below is fixed and deployed, with these exceptions, which stay open:
- Train Builder's car tiles are under 14 px on upright phones; at 14 px five no longer fit a row (question 14).
- Some hard offset shadows remain on chrome not listed here (Rocket Builder's trip and back buttons, the 3D Printer's
  swatches, the picture buttons in Spin Shop, Rocket Builder and Car Builder; see section 2's sweep).
- Spuds in Mud and Munchy Crunchy keep the done instruction for about a second while an implement lowers; the next
  instruction replaces it (clearing it would make the pill blink).

### 1a. Machines and scenes cut off ("The whole machine stays on screen")
- **Espresso Machine**: on the first screen (drink chooser) on an upright phone and the 820 px iPad, the machine is
  off-screen; only the wall and the knock box show. Frame the machine on the chooser too. Worst finding.
- **Workshop**: Drill Press (sideways phone; upright iPad: head touches the top, base runs off), Lathe (upright phone:
  both ends), Router Table (upright and sideways phone), Hammer & Screws (sideways phone and upright iPad: the hammer),
  Birdhouse plan (sideways iPad: the board), Measuring in project mode (upright phone).
- **Kitchen**: Stove (sideways phone), Cutting Board (iPad: the knife handle).
- **Marble Run**: the bottom tray and the lift's lower gear are clipped on iPad and sideways phone.
- **Garden**: the watering can, trowel and basket are clipped on sideways phone and iPad.
- **Construction Site**: Excavator (upright phone and iPad: the counterweight; the truck off-screen at the start),
  Tower Crane (counter-jib and jib end on phone and iPad; the mast leaves the screen during Lift on the phone),
  Concrete (upright iPad: the form runs past both edges), Forklift (upright iPad Pro: the rack and the load), site
  map (sideways phone: the bottom labels are cut off).
- **Farm**: Moooovie Time (the mixer wagon is cut off at the right at every size), Come Bye (the pen fence runs off
  the right), Feathered Friends (the close-up hen house is cut at the right).

### 1b. Shavings and chips stay on the work ("Debris never hides the work")
Drill Press chips, Lathe shavings on the bed and tool rest, and Router Table chips are still there 2 s after the cut.
Fade them within 1 to 1.5 s; only a tidy pile on the floor may stay.

### 1c. The instruction pill covers what it names
- The centered instruction sits on the ringed target on most Farm stations on a sideways phone, and on the cab or
  head on iPad; the part's name tag can land on the pill's text (Spuds, Munchy Crunchy). Also Sewing Machine (the
  spool rack, sideways phone), Sand Table (the ball, iPad and sideways phone), Router Table (the End view label),
  Jigsaw (the Train tile), Rocket Builder (the rocket body).
- Shared fix (done): `coach.avoid(x, y)` moves a new centered instruction to the other half of the stage when it
  would cover that point; stations pass the ringed part.
- Farm stations: a passing info line falls back to the step line, so an instruction for something already done
  comes back while the machine works ("Tap the sheep to count them." after the count). Clear the step line when a
  station enters its work phase, or add a shared `coach.busy()`.

### 1d. Instructions with pronouns or wrong objects ("Literal, complete instructions")
"Cut it in half!", "Slice it into coins!" (Cutting Board: name the food), "Drag fruit into the jar!" (Blender: yogurt,
milk and ice aren't fruit), "Turn it on!" (Drill Press), "Switch it on!" (Espresso), "Drag the tool onto a bolt!"
(Wrenches), "Press the button!" (Spinning Tops: which one), "Treat!" (Hamster: a bare noun), the Birdhouse project
lines with several actions each (`workshop/projects.js`), "Drive the yard scraper…" (Mucky Muck: the tractor drives).
Sewing Machine's first line is three lines tall on an upright phone; shorten it.

### 1e. Text under 14 px
Tool Wall tag subtitles and category chips, Saw Bench material and saw cards, Kaleidoscope section labels and On/Off,
Math Grid panel buttons, Marble Run layout tiles, Spin Shop's "spokes" caption, Rocket Builder's "Stage away!"
(about 8 px), Car Builder tiles on iPad, Blender Low/High/Pulse on the phone, Garden tiles, Espresso's "for Mom" lines,
Combine Time's "Close-up" label. (The Farm's name tags looked small in downscaled pictures, but they are the shared
`Toybox.nametag` at 14 px.)

### 1f. Chrome against the Look rules
- Red as chrome: Train Builder's Stop button, Wrecking Ball's red Down arrow.
- Dashed outlines: Saw Bench's Wood and Teeth groups, Hammer & Screws' info card, Concrete's coming-step chips,
  3D Printer's 20 empty "My prints" boxes.
- Hard offset shadows: the launcher tiles (`box-shadow: 5px 5px 0`) and Jigsaw's picture cards.
- Cream tiles mixed with white: Stove's dish tiles.
- Lathe's green "Done!" shows before anything is done (green means Go).
- Construction Site: Forklift's Surprise has no gift icon; Wrecking Ball and Tower Crane have no Surprise button.
- Farm: name tags show by themselves when a machine arrives (`tagRig`), against "no name tags shown by themselves"
  (see question 6).

## 2. Polish (space and framing)
- Scenes framed for landscape on upright screens, with empty sky or ground: Bubbles (the machine is tiny in a
  corner), Timberrrrr!, Mucky Muck (the heap isn't visible), Forklift, Wrecking Ball, Mighty Mushrooms, Hello Ewe,
  Garden, Espresso on the iPad Pro, Birdhouse plan.
- Grey bands around Gear Box's board; white bands around Jigsaw's picker.
- Empty panels on iPad (Router, Lathe, Blender, Cutting Board, Stove, Shadow Board, Spin Shop, Rocket, Car Builder,
  Hamster, Math Grid, Water Table, Spinning Tops, 3D Printer); Stand Mixer's three tiles stretch huge; Wrenches' size
  tiles stretch very tall on sideways iPad.
- Kitchen tile rows on the 820 px iPad wrap one tile onto a second row (seven tiles in six columns).
- The launcher's pictures are small on the 820 px iPad and the sideways iPad; two names wrap to two lines.
- Water Table's layout strip shows three of six layouts on an upright phone.
- Router Table bit names differ by size (Round/Bevel/Groove on the phone, Roundover/Chamfer/Straight on iPad); use
  one set of real names.
- Hammer & Screws has four tabs on the phone and two on iPad; its sideways-phone panel is half empty.
- Sewing Machine's spools are tiny targets; Spinning Tops' launcher sits far from his hands on iPad.
- Rocket Builder: brownish engine particles; a white ring and a dark star over the rocket during staging.
- Train Builder: the tunnel hill reads as a green pipe with no tunnel mouth.
- Kitchen map on iPad: the coach and station labels cover the cutting board and the stove.
- Hard offset shadows (`box-shadow: Npx Npx 0`) are still set in page CSS about 90 times, mostly the older apps'
  original style (e.g. the Construction Site map's labels and gate card); move chrome to the shared lip and card
  look when a page is worked on. Many older pages' Surprise buttons also lack the shared gift icon.
- Tool Wall on a sideways phone: the station tiles are about 11 px (52 px wide; "Measure" needs a layout change to
  fit at 14 px), and the tool drawings carry tiny words ("TIP", "SHAPE").
- Upright phones now show the whole Excavator and Tower Crane, which makes them small under a lot of sky, and
  Concrete's mixer truck cab is still cut off at the right on upright screens (fitting it would shrink the form).

## 3. Questions for the dad (keep as is until he answers)

**Answered 2026-10-21 (not built yet unless noted):**
- One rule for every page: a tap on the ringed part does its next motion, so side buttons that play a job go
  (Forklift "Move it!", Excavator Dig/Dump, Tower Crane "Lift!", Espresso "Do it!"). Concrete stays as it is.
- One signal at a time: where a page shows a yellow ring, no ghost hand; the ghost hand only on pages with no ring.
  (He and the dad couldn't tell the two apart.)
- Sand Table's and Spirograph's Draw! stay. Spirograph: after a curve closes, more spinning (finger or Draw!)
  shifts the gear to the next slot by itself and keeps drawing rotated copies until the picture is full; one pen
  color per picture (Rainbow stays rainbow); Draw! no longer switches to the next color. The PLAN.md line that
  credited the dad with "a new layer only when he picks a new pen" was an agent's wording, not his.
- Busy panels (question 2): try picture tabs that show each group's current pick, with one group's choices open
  above them (the dad: he and the child forget what they can't see). Pilot built on Kaleidoscope (phones only;
  iPads already show every group); roll out to the other busy panels if it works.
1. **Whole-job buttons**: Construction Site's "Move it!", Dig/Dump, "Lift!" and Concrete's step Go, Espresso's
   "Do it!", and the "Draw!" buttons in Spirograph and Sand Table play a whole job. Keep them as optional helpers, or
   make those pages hands-on like the Farm? (At least Espresso's button should say its step's verb.)
2. **Control rows on upright phones**: Spin Shop, Rocket Builder, Kaleidoscope, Math Grid, 3D Printer, Train
   Builder and Spirograph have four rows of controls under the stage, Marble Run five, Saw Bench 16+ controls. Merge
   or move some onto the stage?
3. **Marble Run**: two Drop controls (on the hopper and in the panel). Keep both?
4. **Shadow Board**: a tap turns a tool 45 degrees; should a tap hang it on its shadow ("one press is enough")?
5. **Birdhouse**: are the sizes on the plan's step chips ("Back 12", "Roof 7.5") fine? May project mode hide the
   saws a step doesn't use?
6. **Farm**: make the split close-ups (Brilliant Baler, Munchy Crunchy, Juicy Squeezy, Feathered Friends, Spuds)
   corner insets on wide screens, or switch them off in phases where they repeat the main view? Keep the name tag
   that shows when a machine arrives? Should the tracked tractor be green (Feathered Friends, Caterpillar Hunt) or
   red like every other tractor? Should Come Bye's shepherd be Farmer Tom? Add Feathered Friends' "loader lifts the
   feed hopper" moment from the guide?
7. **Grown-ups sheet**: it opens with a single tap on the home screen, and he reads well. Make opening it a hold?
8. **Launcher**: six columns on wide tablets so the pictures are bigger?
9. **Shared coach on the Workshop stations**: each new instruction now pops into the middle until his first touch.
   Hammer & Screws changes its line on nearly every nail; is the middle too much there? Measuring now has an empty
   band at the top where its old coach sat; reclaim it for the scene?
10. **Blender line**: "Drag an ingredient into the jar!" (correct, two lines on a phone) or "Drag food into the
    jar!" (one line, but ice isn't food)?
11. **Small whole machines**: on phones the whole Excavator, Tower Crane, Drill Press, Lathe and Router Table are
    now small (Router Table on an upright phone most; crane loads about 20 px; touch areas stay big), and Measuring's
    project mode shows the whole 60-inch board. Fine, or is a bigger, partly cut-off machine better for him?
12. **Wrecking Ball's Up arrow** is green (green means Go): make Up and Down both ink?
13. **Surprise on Wrecking Ball and Tower Crane**: they have none; add one (a new feature)?
14. **Train Builder car tiles**: 14 px needs four tiles a row (a third row in the panel, so the stage gets a
    little shorter) or shorter car names. Which?
15. **Car Builder's Stop pedal** is red. It is a drawn pedal he presses, like a real brake; keep it red?

## 4. Engineering follow-ups
- `Toybox.coach`: a new `step()` line and `clear()` cut a running `say()` line short, so Excavator and the four
  Kitchen stations each keep a small guard that makes the step line wait. A shared option (for example
  `Toybox.coach(el, { stepWaits: true })` plus `coach.hush()`) would let those five pages drop their guards.
  (Done: `coach.avoid()`, `coach.busy()`, and `step()` with an unchanged line no longer cutting a passing line.)
- Sand Table still runs its own coach: several of its lasting lines are information lines, which would need the
  shared coach to show a lasting line without the step styling.
- `Toybox.gate` has no user, and `Toybox.steps`/`Toybox.go` are only used by the Farm's design-system pages and
  `tools/shell-demo.html`; `migrate()` and the pages' `legacy:` keys are one-time moves from before the shared layer.
  Ask the dad before deleting any of them.
- The label-fit MutationObserver in `common/toybox.js` re-measures every button on any class change in the body;
  narrow it if it ever shows up as slow on the iPad.

## 5. Suggested order
1. Section 1 in parallel batches, one theme or page group per agent, no two agents on one file: 1a+1b per app,
   1c's shared coach change in common/ first, then 1d/1e/1f with the page groups.
2. Section 2 after that, page by page.
3. Section 3 once the dad has answered; until then nothing there changes.
