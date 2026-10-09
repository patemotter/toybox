# Toybox UI/UX redesign

One design system for every app, then a migration list for every page. Written 2026-10-09 after the dad's feedback:
"so many little things that don't really matter and get in the way", "way too tedious", "it's not clear if the
options on the app are steps or different jobs or what", "we should do a cohesive one", "one press is always
enough", "the colors and UX need to be consistent and well thought out for a three year old", and "the general
look could be made cleaner or more professional looking". He reads almost anything; his motor skills, attention
span and touch accuracy are a 3-year-old's.

How this was made: every page in `sw.js` CORE (Farm skipped: it is being reworked) was opened at 390x844 with
Playwright, every visible control and every control behind every tab was listed, and the code was read for the
step order, waits and repeat counts. Step counts below are from that code reading ("about"). Farm's new field
(Drive!, a step strip Plow → Harrow → Drill → Sprayer → golden wheat, no tabs, New, Surprise) is the first example of
this system; everything here is meant to stay consistent with it.

Contents: 1 The system (1.8–1.14: touch, location, color, words, feedback, tokens, visual style) · 2 Shared components · 3 Per-app migration · 4 Rollout · 5 Unbuilt plans · 6 Questions
for the dad · Sources.

---

## 1. The system

### 1.1 What is wrong today (the pattern behind the dad's words)
- **Four kinds of control look the same.** A white square tile can be a choice (a color), a job (Pancakes vs
  Soup), a step (Concrete's Pour/Flatten/Smooth/Dry, drawn as dashed tiles), or an action (a fruit to drop in).
  Text tabs at the bottom ("Make", "Style", "Board", "Balls", "Lift", "Height", "Wood") hide more choices of yet
  another kind. A 3-year-old cannot tell them apart, and neither could the dad.
- **Jobs and choices are mixed in one grid**: Stove (Pancakes/Soup/Pasta next to Syrup/Butter/Berries),
  Spirograph (wheel sizes next to pen holes), Car Builder (categories next to vehicles), Rocket Builder
  (destinations, a part carousel and part shapes), Math Grid (Add/Times next to 0 to 10/0 to 12).
- **Too many steps before the payoff**: Espresso 17 steps per latte; the Birdhouse 22 station visits; Stand Mixer
  about 10 actions before it mixes; Tower Crane 5 floors in a forced order; Saw Bench 4–6 strokes per cut.
- **Options that rarely matter**: material pickers, units, view toggles, speed toggles, bit height, wood type,
  ratchet direction, hammer face, nail and screw pickers, brush size, five Effects toggles, 22 filament colors.
- **Text-only buttons everywhere** (he reads well, but an icon makes a button quick to spot and the same action
  look the same in every app): every tab bar, New, Surprise, Stop/Slow/Fast/
  Zoom, Crosscut/Rip/Side view, in/cm, Add/Times, 0 to 10, Wrench/Ratchet, Done!, Mess it up!.
- **One color means different things**: yellow is Back, "picked", Lots!, Toot! and tab highlight; orange is New
  and also Empty/Clear/New board; the dashed outline marks steps in Concrete and empty slots elsewhere.
- **Targets are adult-sized**: tabs 46 px, tiles about 64–84 px, the bottom row sits on the bottom edge where his
  wrists rest.

### 1.2 The screen (every app, every device)
```
┌ Header ───────────────────────────────────────────────┐
│ [‹ Back]* [Home]   Title            [Big]              │   * stations only
├ Stage ────────────────────────────────────────────────┤
│ counter (top-left)                                     │
│            the play scene: the star of the screen      │
│ coach line (one pill; bottom-center on phones)         │
├ Panel ────────────────────────────────────────────────┤
│ 1 JOB BAR      [Pancakes][Soup][Pasta]   (only if jobs)│
│ 2 ACTION ROW   EITHER steps:  (✓)─[ ▶ Flatten! ]─(Smooth)─(Dry)   (Go = current step)
│                OR  Go + tiles: [ ▶ Drive! ] / [pic][pic][pic][pic] (real choices)
│ 3 BOTTOM BAR   [Shelf]* ........ [↻ New] [🎁 Surprise] │   * only apps with a collection
└────────────────────────────────────────────────────────┘
```
Landscape (phone held sideways, iPad sideways): the panel is a right-hand column with the same order top to bottom.

**In a stepped job, Go and the strip are one row**: the current step *is* the Go button (a green pill with the
step's verb), the done steps sit to its left as small green tick chips, the coming steps to its right as small faded
chips with their word under them. So a stepped app's panel is: job bar (if any), the step row, the bottom bar.
An app without steps: Go (if any), up to two tile rows, the bottom bar.
**Row budget on an upright phone: the panel may use at most about 300 px of 844 (the stage keeps ≥ 60 %)**: job bar
64 + step row 90 + bottom bar 60, or Go 72 + one tile row 84 + bottom bar 60 (a second tile row only without a Go).
If more seems needed, something gets cut. See the mock in 1.14.
**At most 12 tappable controls in the panel** on a phone (job bar ≤ 4, Go 1, tiles ≤ 8 or strip ≤ 6, bottom
bar ≤ 3); the stage itself should hold most of the play.

### 1.3 The six kinds of control, each with one look

| Kind | What it is | Look (the only one allowed) | Rules |
| --- | --- | --- | --- |
| **Go** | The main action: "do the next thing for me" | Green pill, white bold verb + icon, 72 px tall on phones; full width when alone, the flexible middle of the step row in a stepped job | One per screen. Label follows the state ("Pour!" → "Flip!" → "Plate!"). Never disabled: when there is nothing to do, it wiggles and the coach says what to do. Always does a whole motion. |
| **Step strip** | Ordered steps of one job | One row: done steps = small green chips with a white tick (left), the current step = the Go pill, coming steps = small white faded chips with their word under them (right), joined by a thin line. Chips are not button-shaped (no lip). | Shows where he is, never a choice. Tapping a chip: wiggle + the coach repeats the current step. Max 6 steps; group sub-steps (Espresso 17 → 6). Never dashed. |
| **Job bar** | Different jobs or modes of one page (Pancakes/Soup/Pasta, Nails/Screws, Add/Times) | Folder tabs that grow out of the stage's bottom edge: picture + one word, the picked tab is white and joins the stage, the others light blue. | 2–4 jobs. Switching a job changes the scene. More than 4 jobs, or jobs with their own machine: make them stations (separate pages) instead. |
| **Choice tiles** | Real choices that change what he sees: which tool, which picture, which color, which model | White square tile, a big picture, one word under it; picked = yellow fill + ink tick badge in the corner | ≤ 4 per row on phones, ≤ 2 rows (8). Picking applies at once to the scene. Re-tap = shared wiggle. Color swatches are tiles whose fill is the color; picked = thick ring + tick. Action tiles (drop a fruit in) have no picked state and show a small "+" badge. |
| **New** | Start this scene over | Orange, circular-arrow icon + "New" | Always in the bottom bar, never in a corner (see 1.9). Replaces Clear, Empty, New board, New blank, New road, New wall, New building, Mess it up!, Smooth (sand). |
| **Surprise** | A fun moment now | White, rainbow sparkle outline, gift icon + "Surprise" | Always last in the bottom bar. |

Also allowed, outside the panel: **Shelf** (collection view: Jigsaw My puzzles, 3D Printer My prints, Spirograph
Mine, Lathe/Router shelves, Birdhouse shelf) as the first bottom-bar button: blue `#3DB4FF`, shelf icon + "Shelf";
it toggles a full-stage view, pressed while open.

**Never in the panel** (cut it, make it automatic, put it on the machine, or move it to the home screen's App
settings): units (in/cm), ranges (0 to 12), materials (pine/oak/plywood, wood type), view toggles (Side view),
speed toggles (Slow/Fast/Faster/Zoom) unless he really chooses them on the machine, setup values (bit height,
ratchet direction, hammer face, pen hole, brush size), effects toggles, part carousels (‹ Nose ›), "Done!"
buttons (finishing is automatic), hold-to-move buttons (Back up/Drive/Up/Down), duplicates of an on-machine control
(Toot!, Low/High/Pulse), text-only section tabs, numbered step badges.

### 1.4 Which pattern when (steps, jobs or choices)
- **Ordered steps** (the real job has an order: concrete, espresso, a smoothie, a cake, pancakes, the field) →
  **the step row (strip with Go as the current step)**. The strip is the only place steps appear. Steps that are only waiting or fiddling are made
  automatic and shown happening (a name tag pops up: "Heating", "Leveling the bed").
- **Different jobs that share one machine and scene** (Pancakes/Soup/Pasta on the Stove, Nails/Screws, Add/Times,
  the three drinks, Tape/Level/Square/Caliper) → **job bar**, 2–4 jobs.
- **Different jobs with their own machine** → **stations** (separate pages on a map), as Workshop, Construction
  Site, Kitchen and Farm do.
- **Building something from parts** (Rocket, Car, Train): **tap a part on the scene to choose what the tiles
  show** (the picked part glows); the tiles are that part's options. No tabs, no carousels. With nothing picked,
  the tiles show the most-used part.
- **Everything else he picks** → choice tiles, max 8. If there are more, keep the 8 most distinct and drop the rest
  (they can live on the Tool Wall cards or come back later as a real option, never behind a tab).
- **No section tabs anywhere.** The old tab bar becomes the bottom bar (Shelf, New, Surprise only).

### 1.5 One press is always enough
Every drawn control has two ways in: **tap = the whole motion, played for him at the calm pace; drag/turn/hold =
the same motion, following his finger**. A tap is a press that moves less than 12 px and lasts less than 350 ms.
- Drag a thing to a place → tap the thing: it travels to the best place (or tap the place: the nearest thing comes).
- Turn a crank, wheel, valve or knob → tap: it turns a full useful amount (one stitch, one hole, open/close, next
  setting).
- Hold a trigger or pedal → tap: it runs for a short visible go (about 1.5 s or one whole job, e.g. a screw all
  the way in).
- Pull a handle or lever → tap: one full stroke down and back.
- Push a board or a saw → tap: one full pass or cut.
- Rub or stir round and round → tap: three turns.
- Flick → tap: a medium flick.
Go does the same for the current step. The ghost hand shows the tap first; the drag only on its second showing,
after he has used the tap (1.6).

### 1.6 Coach line and ghost hand, with steps
- **One coach line**, at most 4 words, verb first, the same word as the current chip and the Go label ("Pour!" ↔
  chip "Pour" ↔ Go "Pour!"). It changes only when the step changes or after a mistake. No second coach line.
- **Ghost hand** (`Toybox.ghost`, 2.6): after 4.5 s without a touch it taps the part that does the current step
  (the one-press way), at most 3 times per visit per step kind; never again for a step he has done himself. While
  it shows, the current chip and Go pulse in step with it.
- Wrong tries (dragging backwards, tapping a done chip, pressing with the machine off) get a gentle line and the
  right part flashes. Two-step machines keep the AGENTS rule: the second try switches on for him.
- A finished job: the strip fills with ticks, a celebration, `Toybox.kind()`, the result stays; Go becomes
  "Again!" (same job) and the strip starts over when he taps it or New.

### 1.7 Multi-page apps (Workshop, Construction Site, Kitchen, Farm)
- **Map page**: the stage is the place itself (the site, the kitchen, the farm, the workshop room), each station
  drawn big as a place with a name label (picture + word), the whole place is the hit area. The panel is empty (no
  Go, no tiles): the stage takes the full height. Tapping a station opens it.
- **Station page**: header shows `‹` + a small picture of the map + the map's name (iPad) or the picture only
  (phone). The station follows 1.2–1.6 like any app.
- **Gear-up and getting-ready gates** (Workshop, Site, Kitchen): **one tap** on the worker or any item puts
  everything on in order (about 1.5 s, each item with its real name tag: "Eye protection", "Ear protection", ...),
  then straight in. Dragging or tapping items one by one still works. No extra "Let's go" button. The 10-minute rule
  stays. Use one shared component (2.7) instead of three copies.
- **Workshop**: today's Tool Wall is both the map and an 81-tool encyclopedia with 12 text tabs. Proposed: the
  Workshop home becomes a map like the others (the bench room with the 8 machines and the pegboard drawn as places);
  the pegboard opens the Tool Wall as its own station (`workshop/tool-wall.html`, a new CORE page) without the
  category tabs (painted signs on the wall group the tools). The Birdhouse is a place on the map (the plan pinned
  on the wall).

### 1.8 Touch targets (for a 3-year-old's finger)
Evidence: NN/g recommends touch targets of at least **2 cm x 2 cm for young children**, about four times the adult
1 cm (and notes that kids miss small targets, that precise dragging is hard, and that every action should have more
than one way, e.g. drag or tap the destination) [1]. Children miss targets far more than adults even at 7–11 [3];
smaller targets about double drag errors [4]; for 18–42 month olds, tapping and swiping are easiest, dragging is
harder, pinch/rotate hardest [5]. Apple's adult minimum is 44 x 44 pt [6]; that is a floor, not our target.
CSS px to millimeters: iPhone (390 px wide) about 6 px per mm; iPad 11" about 5.2 px per mm.
- **Key targets (Go, the main object's tap area, station places, gear items): ≥ 2 cm** → phone 120 px in the
  smaller dimension where possible (Go: full width x 72 px, its area is far above 2 cm²), iPad 104 px.
- **Choice tiles: ≥ 14 mm** → phone 84 x 84 px (4 per row fit in 374 px with 12 px gaps), iPad 112 x 112 px.
- **Bottom bar buttons**: phone 60 px tall, iPad 68 px; **job tabs** phone 64 px, iPad 72 px; **header icons**
  phone 52 px, iPad 60 px.
- **Spacing between two different controls ≥ 12 px on phones (2 mm), 16 px on iPad**, and **≥ 24 px between New
  and anything he taps often**. Hit areas never overlap.
- **Drawn parts on the stage** (switches, handles, cranks, valves, the bucket, pallets): invisible hit area at
  least 2 cm across (phone 120 px, iPad 104 px), centered on the part, even if the drawing is smaller. Snap radius
  for drops ≥ 1.5 cm.
- **Text**: ≥ 18 px on tiles and bars (phones), 20 px on iPad; Go 26 px phone, 30 px iPad; coach 18/22 px.

### 1.9 Location (reach, palms, iOS edges)
- **Bottom edge and bottom corners**: preschoolers rest their wrists along the bottom edge and in the lower corners
  of a tablet, which triggers hotspots there by accident [2][7]; iOS reserves a swipe-up zone over the home
  indicator. So: the panel's bottom row sits at least `safe-area-inset-bottom + 16 px` above the edge; New is never
  in a bottom corner (bottom bar order: Shelf left, New center-right, Surprise right, with the bar inset 16 px from
  each side on phones and centered with max width 560 px on iPad); nothing important within 24 px of any screen
  edge.
- **Palm guard** (2.8): in the panel and on the stage, ignore a touch that starts within 20 px of the bottom edge,
  and a touch that lands while another touch already rests still for > 1 s (a resting palm), and very large
  contacts (Touch radius > 30 px when the browser reports it).
- **Top edge**: iOS pulls down Notification/Control Center from the top and the status bar/Dynamic Island sits
  there: no drags that start in the top 24 px; header buttons are fine (taps).
- **Left/right edges**: no drag that must start within 24 px of a side edge (system back/forward swipes, Split View
  on iPad); scenes keep draggable parts away from the side edges.
- **Upright phone** (his favorite way): stage on top, panel at the bottom (thumb zone of the grown-up holding it,
  finger zone for him). **Phone sideways and iPad sideways**: panel column on the right (most children are
  right-handed; the left hand holds the device), Go at the top of the column, bottom bar at its bottom.
  Preschoolers often hold tablets sideways [7], so iPad landscape must be first-class. **iPad upright**: as the phone.
- **Gestures to avoid as the only way**: anything with two or more fingers, pinch/rotate, long holds (> 0.6 s),
  quick reaction timing, precise placement, swipes near edges, two-handed use [1][5]. Many fingers at once must
  never break anything (he is sensory seeking). Note for the Grown-ups "Good to know": on iPad, turn off
  Settings > Multitasking & Gestures four/five-finger gestures, or use Guided Access, so a whole hand on the screen
  doesn't switch apps.
- Grown-up holds (2 s sound, 4 s rest unlock) stay long on purpose.

### 1.10 Color system (one meaning per color, everywhere)
Chrome uses only these; everything else colorful belongs to the play scene, which stays the star.

| Token | Hex | Meaning (only this) | Always paired with |
| --- | --- | --- | --- |
| `--tb-ink` | `#1D2340` | outlines, text, icons | – |
| `--tb-bg` | `#CDE9FF` | page background | – |
| `--tb-surface` | `#FFFFFF` | panel, tiles, header buttons, not-picked tabs' text background | – |
| `--tb-go` | `#1E8C4E` | Go (main action), done ticks in the strip | white text ≥ 20 px bold (4.6:1), play/action icon |
| `--tb-pick` | `#FFC93C` | picked tile, current step chip, picked job tab underline | ink tick badge (picked) or glow ring (current step): never color alone |
| `--tb-new` | `#FF9A4D` | New (start over) only | circular-arrow icon |
| Rainbow outline | `#FF4D6D #FFB627 #4CD964 #3DB4FF #8E6CFF` | Surprise only | gift icon, sparkles |
| `--tb-shelf` | `#3DB4FF` | Shelf (his collection) only | shelf icon |
| `--tb-job` | `#BFE0FF` | not-picked job tabs | picture + word |
| `--tb-off` | `#E3E8F2` | future steps, disabled-looking but still answers taps | faded picture |
- **Red is never chrome.** Red and green appear only where the real machine has them (power paddles, ON/OFF
  switches), drawn on the machine.
- **Back and Home** become white with ink icons (today Back is yellow, the "picked" color). Big stays white.
- **Contrast**: text on any chrome color ≥ 4.5:1 (ink on yellow 10:1, ink on orange 7:1, white on `#1E8C4E` 4.6:1);
  the 4 px ink outline separates every control from the scene. WCAG large-text 3:1 is the floor for icons.
- **Never color alone**: picked = yellow + tick; current step = yellow + glow + bigger; done = green + tick;
  New = orange + arrow; Surprise = rainbow + gift.
- Dark mode keeps the same meanings (the existing `:root` dark tokens shift only bg/surface/ink).

### 1.11 Instructions (he reads well; a 3-year-old's attention)
He reads almost anything, so real words are the main instruction. His attention, motor skills and touch accuracy
are still a 3-year-old's, so words stay short and every control is also quick to recognize.
- **Every button: an icon + a real word** (one or two words: "Pour!", "New", "Surprise", "Hand saws"). No
  icon-only buttons in the panel (header Home/Back/Big are the exception, they are the same everywhere), no
  text-only buttons either.
- **Coach line: one short sentence, at most about 5 words, verb first**, matching the Go label and the current
  step's word ("Pour the batter!" ↔ Go "Pour!" ↔ step "Pour"). Real names are welcome ("Lower the presser foot!"
  is fine when that is the real step). One line at a time; it changes only when the step changes or after a
  mistake.
- **Name tags for real parts**: the first touch on a machine part, or an automatic step, pops a small white tag
  with its real name ("Hopper", "Leveling the bed") for about 2 s. This is where the learning lives, without a
  lesson.
- **Same icon and word for the same action everywhere**: New = circular arrow + "New"; Surprise = gift +
  "Surprise"; Shelf = shelf + "Shelf"; Back = `‹` + the map's name ("Kitchen") on iPad; Home = house; Big = four
  corners. Go uses the action's own icon (a pour spout, a drill bit; a play triangle when generic).
- **Show as well as tell**: the ghost hand demonstrates the move; the part to touch glows; the strip shows what
  comes next. Words never sit alone on the scene as long text: no paragraphs, no "Pick a face" headings in the panel.
- **Optional spoken coach** (proposed App setting, off by default, only when sound is on), as Math Grid already
  speaks numbers: useful on the plane with headphones, not needed for reading.

### 1.12 Mechanics and feedback
- Every touch answers within 100 ms (press scale 0.94 + a visible flash/sparkle), motion then runs at the calm pace.
- Tap = whole action (1.5). Forgiving: big hit areas, snapping, auto-assist after 2 misses (it finishes the move).
- No time pressure: nothing expires, no "quick!" moments, waits ≤ 3 s (machines warm up, trucks arrive, things dry
  in ≤ 3 s, shown happening).
- No repeated chores before a payoff: at most 2 repeats of the same move (2 saw strokes, 2 passes, 2 cuts); more
  becomes automatic after the second.
- Consistent timing tokens: press 80 ms; tile pick 160 ms; scene move per step 600–1200 ms; celebration 1.8 s;
  coach change fade 200 ms; results stay on screen.

### 1.13 Tokens for `common/toybox.css`
```css
:root {
  /* color (meanings in 1.10) */
  --tb-ink: #1D2340; --tb-bg: #CDE9FF; --tb-surface: #FFFFFF;
  --tb-go: #1E8C4E; --tb-pick: #FFC93C; --tb-new: #FF9A4D; --tb-shelf: #3DB4FF;
  --tb-job: #BFE0FF; --tb-off: #E3E8F2;
  /* shape, type, spacing, lips: see 1.14 */
  /* phone (default) */
  --tb-key: 120px;        /* 2 cm: main targets, invisible hit areas of drawn parts */
  --tb-go-h: 72px; --tb-tile: 84px; --tb-tab-h: 64px; --tb-bar-h: 60px; --tb-head-icon: 52px;
  --tb-gap: 12px; --tb-gap-new: 24px; --tb-edge: 16px;   /* min distance from any screen edge */
  --tb-text: 18px; --tb-go-text: 26px; --tb-coach-text: 18px;
  --tb-chip: 56px;        /* step chip diameter (current chip scales to 1.15) */
  /* timing */
  --tb-t-press: 80ms; --tb-t-pick: 160ms; --tb-t-move: 900ms; --tb-t-cheer: 1800ms;
}
@media (min-width: 700px) and (min-height: 700px) {   /* iPad either way */
  :root { --tb-key: 104px; --tb-go-h: 84px; --tb-tile: 112px; --tb-tab-h: 72px; --tb-bar-h: 68px;
          --tb-head-icon: 60px; --tb-gap: 16px; --tb-text: 20px; --tb-go-text: 30px; --tb-coach-text: 22px;
          --tb-chip: 68px; }
}
@media (max-height: 500px) {                          /* phone held sideways: panel column 220–260 px */
  :root { --tb-go-h: 60px; --tb-tile: 84px; --tb-bar-h: 56px; --tb-chip: 48px; }
}
.tb-panel { padding-bottom: max(var(--tb-edge), env(safe-area-inset-bottom) + 16px); }
```
Existing `.tb-go`, `.tb-new`, `.tb-surprise`, `.tb-tile`, `.tb-tabs` and `.btn[aria-pressed]` switch to these tokens;
`.tb-tabs` is retired in favor of `.tb-bottombar` and `.tb-jobs`. Visual tokens (type, spacing, radii, lips) are
in 1.14.

### 1.14 Visual style (a cleaner, more polished chrome)
The dad: "the general look could be made cleaner or more professional looking". The drawn scenes and machines stay
as they are (chunky ink outlines are their style); the **chrome** (header, panel, buttons, tiles, coach pill,
counter, map labels) gets calmer so the scene stands out and the controls read as one family.

**What looks unpolished today**: every chrome element has the same 3–4 px ink outline *and* a hard 3–5 px offset
shadow, so the panel, the stage, every tile, every tab and the coach pill all shout equally; tiles are cream,
yellow, white or dashed in different apps; type sizes and weights vary per page; tabs are text-only; spacing is
6/8/10 px depending on the page.

**Keep**: Baloo 2; bright flat fills; the ink color `#1D2340`; rounded shapes; a tactile "press me" feel (he
needs to see what is pressable). **Soften**: outlines on chrome go from 3–4 px to 2 px (3 px for the stage frame,
which meets the drawn scene); hard diagonal offset shadows become a short **bottom lip** (a darker band under a
pressable thing, like a real push button) on buttons only; the panel loses its outline and becomes a white card
with a soft blur shadow; non-pressable things (counter, coach, chips) get no lip.

**Palette for the chrome** (meanings in 1.10):
```
ink        #1D2340   text, icons, 2 px outlines      ink-2   #4A5578  secondary words (coming steps, job tabs)
bg         #CDE9FF   page                            surface #FFFFFF  panel, tiles, header buttons, pills
tile       #F6F9FF   tile face (barely blue)         lip     #B9C6DE  lip under white buttons and tiles
go         #1E8C4E   lip #146638                     pick    #FFC93C  lip #D9A21A   glow rgba(255,201,60,.35)
new        #FF9A4D   lip #D9702A                     shelf   #3DB4FF  lip #1E8FD6
job        #E3F1FF   unpicked job tabs               off     #E3E8F2  future chips, lines
focus      #2D5BD7   keyboard focus ring             card shadow 0 6px 18px rgba(29,35,64,.14)
```

**Type scale** (Baloo 2; phone / iPad):
| Use | Size | Weight |
| --- | --- | --- |
| Header title | 24 / 30 px | 800 |
| Go label | 26 / 30 px | 800 |
| Button and job-tab words | 18 / 20 px | 700 |
| Tile word | 16 / 18 px | 700 |
| Coach line | 18 / 22 px | 700 |
| Counter | 18 / 20 px | 800 |
| Step chip word, name tags | 14 / 16 px | 700 |
Line height 1.1 for labels, letter spacing 0.2 px on titles. No text below 14 px anywhere a child looks.

**Spacing scale**: 4, 8, 12, 16, 24, 32 px (`--tb-s1`…`--tb-s6`). Panel padding 12 (phone) / 16 (iPad); gaps
between controls 12 / 16; between the stage and the panel 10 / 16; page gutter 12 / 20 px plus safe areas.

**Radii**: stage 24 px; panel 24; buttons and Go 16; tiles 18; job tabs 0 0 16 16 (they hang from the stage);
pills and chips fully round. iPad: stage and panel 28.

**Outlines and depth**:
- Stage: 3 px ink frame, no shadow. Panel: no outline, card shadow. Header buttons, tiles, bars: 2 px ink outline +
  bottom lip (4 px for Go/New/Shelf, 3 px for white buttons and tiles). Counter, coach pill, name tags: 2 px ink
  outline, coach gets the card shadow, nothing else. Map labels: white pill, 2 px outline, card shadow.
- Dark mode: same rules, lips use the darker variants.

**Icons**: one family for UI actions: 24 px grid, 2.5 px rounded stroke in `currentColor`, no fill (Home, Back,
Big, New, Surprise, Shelf, close). Content pictures (tiles, job tabs, chips, Go action icons) are small flat-color
drawings with a 2 px ink outline, the same style as the drawn machines, centered with 6 px inner padding. One
picture per thing, reused everywhere it appears (the tile, the chip and the Go for "Pour" use the same spout).

**States**:
| State | Look |
| --- | --- |
| Rest | fill + 2 px outline + lip |
| Pressed (finger down) | moves down by the lip height, lip disappears, fill 6 % darker; 80 ms |
| Picked (tile, job) | tile: `pick` fill, 3 px outline, a round ink tick badge top-right; job tab: white, joins the stage, a 5 px `pick` underline |
| Current step | the Go pill (green) with the step's icon and verb; a soft pulse when the ghost hand shows |
| Done step | small green chip with a white tick |
| Coming step / "nothing to do yet" | `off` fill, picture at 55 %, no lip, still answers a tap with a wiggle and a hint |
| Disabled | not used for children's controls (No dead buttons); only for the grown-up sheet |
| Focus (keyboard) | 3 px `focus` ring, 3 px offset |

**Tokens to add** (with 1.13):
```css
:root {
  --tb-tile-bg: #F6F9FF; --tb-lip: #B9C6DE; --tb-go-lip: #146638; --tb-pick-lip: #D9A21A; --tb-new-lip: #D9702A;
  --tb-shelf-lip: #1E8FD6; --tb-glow: rgba(255,201,60,.35); --tb-ink-2: #4A5578;
  --tb-card: 0 6px 18px rgba(29,35,64,.14);
  --tb-outline: 2px; --tb-frame: 3px; --tb-lip-h: 4px; --tb-lip-h-sm: 3px;
  --tb-r-stage: 24px; --tb-r-btn: 16px; --tb-r-tile: 18px; --tb-r-pill: 999px;
  --tb-s1: 4px; --tb-s2: 8px; --tb-s3: 12px; --tb-s4: 16px; --tb-s5: 24px; --tb-s6: 32px;
  --tb-fs-title: 24px; --tb-fs-go: 26px; --tb-fs-btn: 18px; --tb-fs-tile: 16px; --tb-fs-coach: 18px;
  --tb-fs-count: 18px; --tb-fs-small: 14px;
}
@media (min-width: 700px) and (min-height: 700px) {
  :root { --tb-r-stage: 28px; --tb-fs-title: 30px; --tb-fs-go: 30px; --tb-fs-btn: 20px; --tb-fs-tile: 18px;
          --tb-fs-coach: 22px; --tb-fs-count: 20px; --tb-fs-small: 16px; }
}
```

**Which `common/toybox.css` rules change**:
- `.btn`: border 3 px → `var(--tb-outline)`; `box-shadow: 3px 3px 0` → `0 var(--tb-lip-h-sm) 0 var(--tb-lip)`;
  `:active` → `translateY(var(--tb-lip-h-sm))` + no shadow; font-size → `var(--tb-fs-btn)`; min-height → tokens.
- `.btn[aria-pressed="true"]`: add the tick badge (`::after`) and 3 px outline; keep the `pick` fill.
- `.btn.primary` (yellow): retire (yellow means picked only); pages using it move to `.tb-go` or plain `.btn`.
- `.tb-back`: yellow → white like the other header buttons.
- `.tb-stage`: border 4 px → `var(--tb-frame)`, drop the 5 px offset shadow. `.tb-panel`: drop the border and
  offset shadow, add `var(--tb-card)`, padding `var(--tb-s3)`.
- `.tb-tile`: face `var(--tb-tile-bg)`, radius `var(--tb-r-tile)`, size `var(--tb-tile)`, label `var(--tb-fs-tile)`.
- `.tb-tabs`: retired → `.tb-jobs` (hanging tabs) and `.tb-bottombar`.
- `.btn.tb-go`: `#2EA05A` → `var(--tb-go)` with the lip; drop the text-shadow; size tokens.
- `.btn.tb-new`: add the lip and the circular-arrow icon; `.btn.tb-surprise`: border 4 → 3 px, glow halo and the two
  twinkling stars kept but smaller (the stars are the "magic" cue), gift icon.
- `.tb-counter`, `.tb-coach`: outline 3–4 px → 2 px, drop offset shadows (coach gets `var(--tb-card)`), sizes from
  tokens; the coach pill gets a small `pick`-colored dot at its start when it names the current step.
- `.tb-head .tb-title`, `.tb-iconbtn`: sizes from tokens; icon stroke 2.6 → 2.5.
- New: `.tb-steps`, `.tb-chip`, `.tb-jobs`, `.tb-bottombar`, `.tb-tick`, `.tb-nametag`.
- Kept as is: the rest screen, the timer badge, toasts and the Grown-ups sheet (grown-up chrome), restyled later
  only if they clash.

**Before/after mock (Stove, 390x844)**: `stove_before_after.png` in this session's scratchpad
(`/tmp/claude-0/-home-user-toybox/12e70ef0-baca-5716-8e21-c0a618986546/scratchpad/`, source `mock.html`). Left:
today (Pancakes/Soup/Pasta mixed with Syrup/Butter/Berries in one grid, yellow Back, text-only New/Surprise, heavy
offset shadows). Right: white header buttons with line icons and the title; the stage with a 3 px frame; the job
bar hanging from the stage (Pancakes picked); the step row with the green "Pour!" as the current step and Flip,
Plate coming; New and Surprise with icons; the panel as a soft white card. The stage keeps about 60 % of the
height. (The mock's font fell back to a system font because Google Fonts were blocked; the real page uses Baloo 2.)

---

## 2. Shared components to add to `common/`
All ES5, in `common/toybox.js` + `common/toybox.css`, documented in the header. Each renders into a container the
page provides, so pages keep their own scene code. `tools/shell-demo.html` shows all of them.

**2.1 `Toybox.go(el, opts)`** – the green Go (apps without steps).
`var go = Toybox.go(el, { label: "Drive!", icon: svg, onPress: fn, onIdle: fn })` →
`go.set(label, icon)`, `go.pulse(on)`, `go.busy(on)` (shows a fill while a motion runs; a press then wiggles).
Never disabled; `onIdle` runs when pressed with nothing to do (show a hint).

**2.2 `Toybox.steps(el, opts)`** – the step row (strip with the Go built in).
`var st = Toybox.steps(el, { steps: [{ id: "pour", name: "Pour", pic: svg, go: "Pour!", coach: "Pour the batter!" },
...], onGo: fn(stepId), coach: coachApi, ghost: ghostApi })` → `st.at(id)` (current: its Go pill shows `go` + `pic`,
coach line follows, ghost re-armed), `st.done(id)`, `st.reset()`, `st.current()`, `st.busy(on)`, `st.finish(label)`
(all ticks, cheer, Go becomes `label`, e.g. "Again!"). Chips wiggle on tap; `role="list"`, `aria-current="step"`.
Lays out as one row (done chips | Go | coming chips); with 5–6 steps on a phone, done chips collapse into one
"✓ ×n" chip so the Go keeps ≥ 160 px.

**2.3 `Toybox.jobs(el, opts)`** – the job bar.
`Toybox.jobs(el, { jobs: [{ id, name, pic }], value: "pancakes", onPick: fn(id) })` → `.set(id)`, `.value()`.
Re-tap wiggles. Remembered across reloads by the page, reset by `Toybox.fresh()`.

**2.4 `Toybox.tiles(el, opts)`** – choice tiles.
`Toybox.tiles(el, { items: [{ id, name, pic, color }], value, kind: "pick" | "action" | "swatch", rows: 1 | 2,
onPick: fn(id) })` → `.set(id)`, `.items(list)` (swap the options, e.g. when a different part is tapped), `.flash(id)`.
Handles `aria-pressed`, the tick badge, the shared wiggle, sizes from tokens, at most 8 items (throws a console
warning above 8).

**2.5 `Toybox.bar(el, opts)`** – the bottom bar.
`Toybox.bar(el, { shelf: fn | null, onNew: fn, onSurprise: fn })` → `.shelfOpen(on)`. Builds Shelf/New/Surprise
with their icons and colors and the palm-safe placement.

**2.6 `Toybox.coach(el)` and `Toybox.ghost(opts)`** – move the snippets into common.
`coach.say(text, sec)`, `coach.step(text)` (sticky line for the current step). `Toybox.ghost({ plan: fn() →
{ pts, tap, hold, carry }, max: 3, idleMs: 4500 })` → `.learned()`, `.again()`; it already pauses for the timer and
the turn card. Delete the per-page copies of `tools/snippets/ghost-hand.js` as pages migrate.

**2.7 `Toybox.press(target, opts)`** – one press is always enough.
`Toybox.press(canvas, { hit: fn(x, y) → partId | null, tap: fn(part, x, y), down/move/up: fn(part, e),
holdMs: 0 })`: decides tap vs drag (< 12 px, < 350 ms), applies the 2 cm minimum hit radius around `hit`, supports
several pointers, ignores palm touches (2.8), and calls `tap` with the part so the page plays the whole motion.

**2.8 `Toybox.palmGuard(el)`** – applied by `press`, `tiles`, `bar`, `jobs` and `go`: ignores touches that start
within 20 px of the bottom edge, touches while another contact rests still > 1 s, and very large contacts.

**2.9 `Toybox.gate(opts)`** – the gear-up/getting-ready screen.
`Toybox.gate({ flag: "workshop-gear", title: "Gear up!", items: [{ id, name: "Eye protection", art, onArt }],
worker: svg, extra: { hands: washFn }, done: fn })`: one tap on the worker or any item dresses all, in order, with
name tags; still drag- or tap-per-item; records the time for the 10-minute rule. Replaces three copies.

**2.10 `Toybox.map(opts)`** – station maps.
`Toybox.map({ stage, places: [{ href, name, rect, pic }] })`: big hit areas, name labels (picture + word), a sparkle
on press, `Toybox.beforeLeave` handling.

---

## 3. Per-app migration (every page)
Format per page: **Today** (steps to the first payoff, clutter) · **Steps** · **Panel** (components it adopts) ·
**Scene** · **One press** (each drag/turn/hold → what its tap does) · **Fit** (sizes, positions, colors, text-only
buttons, gestures). Every page also: tokens from 1.13 and the chrome style of 1.14 (delete page-local outlines, offset shadows,
cream/dashed tiles and font sizes on chrome), bottom bar via `Toybox.bar`, coach via `Toybox.coach`, ghost via
`Toybox.ghost`, white Back/Home, an icon + word on every panel button, targets and spacing from 1.8, the panel's
bottom row ≥ 16 px above the safe area, no drag starting within 24 px of an edge.

### Launcher (`index.html`)
- Today: picture + name tiles, one screen. Good.
- Fit: tiles ≥ 2 cm (3 per row on upright phones is about 120 px: OK); keep 16 px from the bottom edge; Grown-ups
  button stays small and top-left (grown-up only). Add "Good to know": iPad multitasking gestures / Guided Access,
  and the spoken-coach setting (1.11).

### Spin Shop
- Today: payoff at once (spin). Panel: Stop/Slow/Fast/Zoom (text-only), 5 toys, spokes stepper, Make/Style tabs;
  Style hides 5 patterns + 3 color modes.
- Panel: Go "Spin!" (a big motor spin; tap again while spinning = a bigger push). Tiles row 1: the 5 toys. Spokes
  −/+ shown only for the Wheel, as a small stepper on the scene's hub (counts he chooses stay). Cut the speed row,
  the Make/Style tabs, patterns and color modes (coloring stays: tap a part, colors appear as a swatch row 2).
- One press: finger spin → tap the toy = a good spin (exists, keep).
- Fit: no text-only buttons left; "Zoom" ambiguity (AGENTS §6) goes away with the speed row.

### Kaleidoscope
- Today: payoff at once. Panel: 6 "copies" + 3 brushes + Draw/Colors/Effects tabs (12 colors, 5 text toggles) + Clear.
- Panel: tiles row 1: How many 3/4/6/8 as picture tiles (a tiny kaleidoscope with n slices; numbers kept); row 2:
  colors as swatches (Rainbow + 6). Cut brush size (medium), Effects (Mirror and Glow always on; Spin = tap the
  center of the scene; Lines/Dark cut). Clear → New.
- One press: drawing is the action; a tap paints a mirrored dot burst (exists if a dot; make it a starburst).
- Fit: text toggles gone; tiles to 84 px.

### Peg Drop
- Today: payoff at once (tap to drop). Panel: Drop 10/Rain/Shoot + Play/Board/Balls tabs (4 boards, 8 colors, 2
  sizes) + Empty.
- Panel: Go "Drop!" (drops 10); tiles row 1: the 4 boards. Cut Rain and Shoot as buttons (Rain becomes a Surprise
  moment), cut ball colors/sizes (rainbow balls), Empty → New. No tabs.
- One press: drag the launcher → tap anywhere above the pegs drops a ball there (exists).
- Fit: bin counts stay (allowed).

### Rocket Builder
- Today: Launch! → about 2.5 s countdown + climb: fine. Panel: Moon/Mars/Planets + Launch! + ‹ Nose › carousel + 4
  part tiles + Build/Surprise tabs: three rows on phones (PLAN open issue).
- Panel: Go "Launch!". Tiles = options of the part he taps on the rocket (nose, body, fins, engine; nose picked at
  start). Cut the carousel and the Build tab. Destination: after liftoff, in space, the tiles become Moon/Mars/
  Planets (picture tiles) and a tap flies there; default goes on to the Moon by itself after 4 s.
- One press: tap a part = pick it (exists for color); tap the rocket on the pad = Launch.
- Fit: planet labels and "Planets" fit once the row holds only tiles.

### Workshop: map + gate (`workshop/index.html`)
- Today: gate 2 items (drag or tap each) + a Let's-go button. Then the Tool Wall: 81 tools, 12 text category tabs,
  a station row of 9 tiles; a tool card with Use it/Parts tabs + Try it.
- Steps: gate via `Toybox.gate` (one tap, both items, no extra button).
- Panel: map page per 1.7 (no panel). The Tool Wall moves to `tool-wall.html` (new CORE page) without category tabs;
  the card shows the use animation and a green Go "Try it!"; Parts = tap the tool drawing in the card (labels
  pop); "Hang it back" → a close icon button (top-right, 52 px).
- One press: Tool Wall: tap a tool = lift it off (exists).
- Fit: station places ≥ 2 cm; no text-only tabs.

### Drill Press
- Today: switch on + pull the handle (2 actions; the second try switches on). Panel: 6 bits + New board.
  Bug: the label "Step bit bit".
- Panel: Go "Drill!" (on if off, a whole hole: down, through, up). Tiles: 6 bits. New board → New.
- One press: handle pull → tap the handle = a full plunge; slide the board → tap a spot on the board = it slides
  there; switch tap (exists).
- Fit: fix "Step bit bit" → "Step bit"; bigger in phone landscape (PLAN open issue).

### Saw Bench
- Today: the busiest page: 3 materials, Crosscut/Rip, Side view, 12 hand saws (overflowing the row), Hand/Power
  tabs (8 power saws), New board; hand saws need 4–6 strokes per cut; "Set the depth deeper!" on the circular saw.
- Steps: 2 strokes per hand-saw cut (the second finishes it); depth set automatically.
- Panel: job bar Hand saws | Power saws (2 jobs). Tiles: 8 saws per job (hand: keep Ryoba, Panel saw, Backsaw,
  Dovetail saw, Coping saw, Hacksaw, Bow saw, Keyhole saw; Dozuki, Kataba, Tenon, Fret saw stay on the Tool Wall
  cards). Cut the material picker (each saw brings its own stock, as `mats` already lists), Crosscut/Rip (each saw
  does its natural cut; the table saw rips, the miter saw crosscuts), Side view. New board → New. Add Surprise
  (planned: pieces hop like dominoes).
- One press: saw strokes → tap the saw = the whole cut; push a board into the table/band saw → tap the board = one
  pass; fence/miter angle drag → tap = next setting (Straight/Angle); circular-saw hold-and-push → tap the saw = a
  full pass; switch tap (exists).
- Fit: no tile row may scroll sideways (swipes); text-only Crosscut/Rip/Side view gone.

### Hammer & Screws
- Today: mode tabs (Hammer/Screw) + 4 sub-tabs (Hammers, Nails, Drivers, Screws) + 6 hammers + per-hammer
  sub-panels ("Pick a face", "Pick a job": chisel/post/stake/wedge; Hit/Pull) + "Hold to drive" trigger.
- Panel: job bar Nails | Screws. Tiles: 6 hammers or the drivers. Cut the nail and screw pickers (each hammer/driver
  brings its matching nail/screw), Hit/Pull (the claw pulls a bent nail by itself; tapping a sunk nail with the claw
  hammer pulls it), the face picker (ball-peen uses the ball face on rivets), "Pick a job" (one job per hammer:
  mallet = chisel, sledgehammer = stake, etc.). Remove the "Pick a ..." text lines. Add New and Surprise
  (whack-a-nail, planned).
- One press: hammer swing drag → tap the nail = one hit (exists: "Tap to hit"); driver hold trigger → tap = drives
  the screw all the way in; claw pull drag → tap = pulls it out.
- Fit: panel was 4+ rows on phones; target 3.

### Lathe
- Today: switch on, push the tool up; "Done!" green button visible before any shape (ambiguous); 4 tools + Sand +
  New blank; speed dial on the machine.
- Panel: Go "Turn!" (on if off, one shaping pass with the picked tool); after a shape exists Go becomes "Shelf!"
  (finishes and puts it on the shelf). Tiles: 4 tools + Sand. New blank → New. Shelf → bottom bar.
- One press: push the tool along the rest → tap the wood = one pass; speed dial drag → tap = next speed; switch tap.
- Fit: the big OFF paddle on the machine stays red (real); "Done!" text-only button gone.

### Router Table
- Today: switch on, push the board. Panel: 5 bits + Bits/Height/Wood tabs + New.
- Panel: tiles: 5 bits only. Cut Height (Middle) and Wood (each new board takes the next wood by itself). Add
  Surprise (planned curl). Shelf → bottom bar.
- One press: push the board → tap the board = a full pass; switch tap.
- Fit: the end-view corner panel stays (allowed).

### Wrenches & Sockets
- Today: drag tool to bolt, turn it round (circular drag), drag the bolt to the tray. Panel: 5 sizes + Wrench/
  Ratchet tabs + a direction toggle.
- Steps: the loosened bolt drops into the tray by itself.
- Panel: job bar Wrench | Ratchet. Tiles: the 5 sizes (numbers kept). Cut the direction toggle (loosen when in,
  tighten when out). Add New and Surprise (planned popcorn jar).
- One press: drag tool to bolt → tap a bolt with a size picked = the tool goes on (wrong size slips + hint); turn
  → tap the tool on the bolt = turns it all the way; bolt to tray → automatic.
- Fit: handle swinging off the board (PLAN issue) checked during the pass.

### Measuring
- Today: Tape/Combo/Level/Square/Caliper text tabs, in/cm, Clear, caliper Zero.
- Panel: job bar Tape | Level | Square | Caliper (Combo merges into Square). Move in/cm to App settings (grown-up).
  Caliper zeroes itself. Clear → New. Add Surprise (planned snap-back).
- One press: pull the tape → tap the hook = pulls to the board's end and reads; slide the square → tap the mark =
  it slides there and draws the line; caliper jaw drag → tap the object = jaws close on it; level: tap = settles.
- Fit: "ZERO"/"ON" label overflow goes away; objects bigger in phone landscape.

### Shadow Board
- Today: 12 tools to drag per set; 3 sets; "Mess it up!" (looks like a disabled bar).
- Steps: 8 tools per set ("Put away: 0 of 8").
- Panel: tiles: 3 sets (picture tiles). Mess it up! → New. Add Surprise (planned march).
- One press: drag a tool → tap it = it flies to its shadow.

### Birdhouse (`workshop/project.html`, `projects.js`)
- Today: 22 station visits; the panel lists all 22 steps as text buttons; Plan/Shelf tabs; hold-to-reset New.
- Steps: 6 visits, as a step strip: Plane → Measure & cut (all parts in one Saw Bench visit, the saw cuts each mark
  in turn after he does the first) → Drill (door + drain holes in one visit) → Nail (all joins) → Sand → the bird.
- Panel: the step row (the current step's Go is the deep link: "Go cut!"), Shelf in the bottom bar, New (tap, with the standard New;
  the hold stays only if the dad wants protection). Cut the 22-row text list.
- Fit: no text-only buttons; strip chips are pictures of the tool.

### Gear Box
- Today: drag a gear onto the plate, then crank. Panel: 7 gear tiles, Crank/Motor, speed, Long train, New, Surprise.
- Panel: Go "Turn!" (motor on/off). Tiles: 7 gears (numbers kept). Cut Crank/Motor (the crank on the plate is the
  hand way, Go is the motor), the speed toggle, Long train (a Surprise moment).
- One press: drag a gear → tap a gear tile = it snaps into the next free meshing spot; crank turn → tap the crank =
  two turns.

### Marble Run
- Today: payoff at once. Panel: Drop, Lots, 8 runs, Runs/Lift/Colors tabs (2 lifts, 10 colors).
- Panel: Go "Lots!" (fills to 30, the dad's favorite); a tap on the hopper drops one marble. Tiles: 6 runs (drop
  Mix 1/Mix 2 or Kit: ask). Cut the Lift tab (each run brings its lift) and the Colors tab (mixed colors).
- One press: plunger pull → tap = a full pull; lift crank → tap = runs the lift for 3 s.
- Fit: the small DROP on the hopper goes (the hopper itself is the target).

### Car Builder
- Today: Drive! then 3 category tiles + 4 vehicles (two levels) + Vehicle/Build tabs; Build has 6 part sub-tabs.
- Panel: Go "Drive!". Tiles: 8 vehicles in two rows (no categories). Parts: tap a part on the car = tiles show its
  options (as Rocket). Cut Build tab and sub-tabs.
- One press: everything is already tap; tap the car = honk + bounce.

### Math Grid
- Today: payoff at once. Panel: Blocks, Add/Times, 0 to 10/0 to 12, Grid/Patterns tabs; Patterns has 4 + a number
  stepper.
- Panel: job bar + / × (pictures of the signs). Go "Blocks". Tiles: 4 patterns (Multiples, Doubles, Squares, Same
  answer); the multiples number = the last number he tapped (cut the stepper). Move 0 to 12 to App settings
  (AGENTS §6 open question). Clear → New.
- One press: drag a rectangle → tap a square = its rectangle fills (exists).
- Fit: grid squares about 28 px stay an open question (bigger needs a rewrite).

### 3D Printer
- Today: Print! → about 9.5 s prep (heating, leveling, purge line) + about 40 s print. Panel: Print!, Faster,
  8 models, Models/Colors/My prints tabs; Colors: One/Many + 4 spools + 22 filaments.
- Steps: prep 3 s (name tags still show "Heating", "Leveling the bed", "Purge line"); print about 25 s; cut Faster.
- Panel: Go "Print!". Tiles: 8 models (2 rows). Spool colors: tap a spool in the AMS on the scene = next color from
  10 (cut the palette and One/Many: each model's own setting). My prints → Shelf.
- One press: already taps.
- Fit: "Faster" text toggle gone; empty shelf boxes hidden until filled.

### Water Table
- Today: "Fill the bowls!"; panel: 6 layout tiles only (no New, no Surprise).
- Panel: tiles: 6 layouts (pictures). Add New (empty the water) and Surprise (to propose: a rubber duck rides).
- One press: valve circle drag → tap = open/close; cup carry → tap the cup = scoops and pours into the next bowl;
  wheels: tap = a push.
- Fit: PLAN layout issues fixed during the pass.

### Construction Site: map + gate (`construction-site/index.html`)
- Today: gate 4 items (tap or drag each); map with 5 lots and no panel. Good map.
- Steps: `Toybox.gate` one tap. Map via `Toybox.map`; labels picture + word, ≥ 2 cm.

### Excavator
- Today: drag the bucket; Dig and Dump buttons; "Wait for the truck!".
- Panel: one Go that alternates "Dig!" / "Dump!" (merge the two buttons). Truck is always there (a new one rolls
  in within 2 s).
- One press: drag the bucket → tap the dirt = dig, tap the truck = dump.
- Fit: crate bigger on phone landscape.

### Concrete
- Today: mixer arrives, hold Pour, drag the board (screed), rub round and round (trowel), drying, plus a step row
  drawn as dashed tiles (looks like buttons).
- Steps: mixer arrives ≤ 2 s; dry ≤ 3 s; each step one tap or one drag.
- Panel: the step row via `Toybox.steps` Pour → Flatten → Smooth → Dry (the pilot page), its Go label follows the step.
- One press: hold to pour → tap = a full load; drag the board → tap = one full screed pass; rub → tap = the
  trowel does the whole slab.
- Fit: the dashed tiles become the chip rail.

### Wrecking Ball
- Today: Swing + 4 hold buttons (Back up, Drive, Up, Down) + New building.
- Panel: Go "Swing!". Cut the 4 hold buttons: the crane drives into range by itself; ball height by dragging the
  ball. New building → New. Add Surprise (to propose).
- One press: pull back and let go → tap the building = the ball swings into it.

### Tower Crane
- Today: drag the hook; Lift!; forced order (bricks and window before the beam); 5 floors at about 15 s each.
- Steps: 3 floors; no forced order (the next piece the building needs glows; any carried piece lands on its spot).
- Panel: Go "Lift!" (exists). New building → New. Add Surprise.
- One press: drag the hook → tap a load = the hook fetches it and carries it to the building.

### Forklift
- Today: "Here comes the truck!" wait; per pallet: forks in, lift, drive, set down, back out; empties back on the
  truck; Move it!, New wall, Surprise.
- Steps: the truck is there on open; empties return by themselves.
- Panel: Go "Move it!" (exists). New wall → New.
- One press: drag the forks → tap a pallet = the whole move to the next place.
- Fit: frame the truck and wall on upright phones (PLAN issue).

### Train Builder
- Today: tap an engine first (hidden order), then cars; Go/Toot; Engines/Cars/Track tabs; Track holds 3 layouts +
  Slow/Fast + Night.
- Panel: Go "Go!" (tapping the engine also starts a stopped train: PLAN follow-up). Tiles: the options of the
  picked place: tap the engine = engines; tap behind the train = cars (default after an engine is on); tap the
  ground = 3 layouts. Cut Toot! (tap the engine toots), Slow/Fast (calm speed; Go while running = a little faster),
  Night (a Surprise moment).
- One press: everything tap; switches: tap the yellow arrow (exists).

### Bubble Machine
- Today: switch on; payoff at once. 7 wands + Wands/Colors tabs (5 soaps).
- Panel: tiles row 1: 7 wands; soap colors: tap the soap jar on the scene = next soap (cut the Colors tab).
- One press: wand drag → tap the sky = a bubble stream there; machine switch tap (exists); speed dial tap = next.

### Hamster
- Today: clean (Treat!, Surprise; tap wheel/food/water/bed).
- Change: only the shared tokens and bottom bar; hamster bigger on upright phones (PLAN issue).

### Garden
- Today: plant, water, about 3–4 sun taps, then pull: about 7 actions before the first pick.
- Steps: one watering grows it to leaves; one sun tap to ripe/flower.
- Panel: tiles: 6 seed packets (tap = plants in the next empty spot: no second tap on a spot).
- One press: watering can drag → tap the can = waters (exists); pull a carrot → tap it = picks; cloud drag → tap
  = rain for 3 s (exists).

### Spinning Tops
- Today: clean (press the button). 5 tops, New, Surprise.
- One press: flick a top → tap = a medium flick.
- Change: tokens only; the 45 s spin is an open question.

### Kitchen: map + gate (`kitchen/index.html`)
- Today: 3 items (Wash hands plays a wash; apron; chef hat), each tapped or dragged.
- Steps: `Toybox.gate` one tap (wash 1.5 s, apron, hat). Map via `Toybox.map`.

### Blender
- Today: drag fruit, lid on, Low/High/Pulse on the machine, pour, straw: about 6 actions.
- Steps: strip Fill → Blend → Pour. The lid goes on by itself when he blends (shown); pouring and the straw happen
  by themselves after the blend (a tap on the jar pours sooner).
- Panel: the step row (Go "Blend!", "Pour!"). The 7 ingredients stand on the counter in the scene (tap one =
  it drops in; the panel has no ingredient tiles, keeping it to two rows).
- One press: drag fruit → tap the tile or fruit = in (exists); speed buttons on the machine stay (Go = High).

### Cutting Board
- Today: pick a food, cut in half, quarters, coins/cubes, slide into the bowl.
- Steps: at most 2 cuts per food, then the pieces slide into the bowl by themselves.
- Panel: tiles: 7 foods (two rows, no Go: the knife on the board is the action).
- One press: knife drag → tap the food = the next cut (exists); slicer press → tap = presses.

### Stand Mixer
- Today: pick a recipe, tilt the head, click the beater, add 3–5 ingredients one by one, lower the head, push the
  lever: about 10 actions before it mixes.
- Steps: picking the recipe tilts the head and clicks in the right beater by itself (name tags show); ingredients:
  a tap on the bowl adds the next one (or tap each tile); the head lowers by itself after the last; strip Add → Mix
  → Bowl.
- Panel: job bar Cookies | Whipped cream | Bread; the step row (Go "Add!" adds the next ingredient, then "Mix!" =
  the lever). The recipe's ingredients stand in a row on the counter in the scene (tap one = in).
- One press: lever drag → tap = Medium; head tilt drag → tap = up/down.

### Stove
- Today: turn the knob, pour, wait for bubbles, flip, slide onto the plate, toppings; jobs and toppings mixed in one
  tile grid.
- Steps: the first pour turns the burner on (two-step rule); bubbles ≤ 3 s; the pancake slides to the plate by
  itself after the flip. Strip Pour → Flip → Plate.
- Panel: job bar Pancakes | Soup | Pasta; the step row. Toppings (and the soup/pasta ingredients) stand as jars
  and bowls beside the stove in the scene (tap = onto the pancake or into the pot), not as panel tiles.
  Mock of this page: 1.14.
- One press: knob turn → tap = on/next; flip flick → tap the pan = a good flip; stir round → tap the pot = 3 turns.

### Spirograph
- Today: Draw! + 3 wheels + 3 pen holes in one grid + Gears/Rings/Pens/Mine tabs (4 rings, 8 pens).
- Panel: Go "Draw!". Tiles row 1: 3 wheels; row 2: 8 pen swatches. Ring: tap the ring on the scene = next ring
  shape (4). Pen hole: cut (each new wheel uses Edge; Surprise keeps shuffling the setup). Mine → Shelf.
- One press: finger round and round → tap the paper = one full loop drawn.

### Jigsaw
- Today: pick a picture, sizes as 6 tiles, Pictures/My shelf tabs.
- Steps: tapping a picture starts at once at the last size (default 6).
- Panel: tiles: 9 pictures (choose screen) → while playing, tiles: 3 sizes (4, 6, 12; counts kept) to restart at
  another size. My shelf → Shelf.
- One press: drag a piece → tap a piece = it flies to its spot.

### Sand Table
- Today: Draw! + Smooth + 7 shapes + Shapes/Sand tabs (7 sands) + New ("start over with smooth sand"): Smooth and
  New do the same thing.
- Panel: Go "Draw!". Tiles: 7 shapes. Smooth merges into New (the rake sweep is New's animation). Cut the Sand tab
  (beach sand; space/rainbow sand as Surprise moments, or ask).
- One press: drag the ball → tap the sand = the ball rolls there.

### Espresso Machine
- Today: 17 steps per latte (power, ready, weigh, hopper, grind, dump, whisk, tamp, lock, shot, milk, jug, steam,
  pour, serve, knock, rinse), about 85 s; 8 progress pictures exist.
- Steps: strip of 6: Beans (weigh 18.0 g + hopper in one tap) → Grind (dump into the basket by itself) → Tamp
  (whisk + tamp, one tap or the real moves) → Shot (lock-in automatic; the 28 s shot, scale numbers kept) → Milk
  (pour the carton + steam) → Pour. Warm-up, flush, knock-out and rinse happen by themselves. Steamer: Milk →
  Pour.
- Panel: job bar Latte | Cappuccino | Steamer (the three drinks are jobs); the step row.
- One press: hold the shot button → tap = the whole shot; whisk round → tap = whisked; tamp press → tap = tamped;
  jug up/down at the wand → tap = steams to "Milk is ready!".

### Farm (reference, being reworked by its own agent)
- Field already follows the system's kinds (Drive!, strip, New, Surprise). When `common/` components land, make
  Drive! the current step's pill in the step row (`Toybox.steps`, label "Plow!", "Harrow!"... or keep "Drive!"), its map for `Toybox.map`. Tap the tractor = drives the pass (rule example).

---

## 4. Rollout (at most 3 agents at a time, no shared files within a batch)
- **Batch 0 (1 agent)**: tokens (1.13) and components 2.1–2.10 in `common/`, update `tools/shell-demo.html`,
  migrate **Concrete** as the pilot (it already has a strip). Coordinator reviews with the dad before batch 1.
  Also updates AGENTS.md "Standard layout" and `tools/buttons.js`/`fit.js` checks for tile sizes and text-only buttons.
- **Batch 1**: Kitchen map+gate, Blender, Cutting Board | Stand Mixer, Stove | Espresso Machine.
- **Batch 2**: Site map+gate, Excavator, Wrecking Ball | Tower Crane, Forklift | 3D Printer.
- **Batch 3**: Workshop map+gate and the new `tool-wall.html` (coordinator adds it to CORE) | Saw Bench | Birdhouse
  (`project.html`, `projects.js`; keep the job kinds' API so stations still work).
- **Batch 4**: Hammer & Screws | Drill Press, Lathe, Router Table | Wrenches, Measuring, Shadow Board.
- **Batch 5**: Rocket Builder | Car Builder | Train Builder.
- **Batch 6**: Spin Shop, Kaleidoscope, Spirograph | Peg Drop, Marble Run, Gear Box | Math Grid, Water Table, Sand
  Table.
- **Batch 7**: Garden, Hamster, Bubble Machine, Spinning Tops | Jigsaw (+ the launcher's "Good to know" via the
  coordinator) | Farm alignment (the Farm agent, once its rework lands).
- About 8 batches. Each agent: adopt the components, apply the page's entry above, run `smoke.js`, `buttons.js`,
  `fit.js` at the five sizes, screenshots, report. The coordinator commits per batch.

## 5. Unbuilt plans: how each fits, what to cut
**Garbage Truck** (`plans/garbage-truck.md`)
- Fits well: Go follows the situation ("Next bin", "Landfill", "Street"); Grab and Pack are action tiles; New,
  Surprise.
- Cut: the separate tailgate and tip drags as required steps (one Go "Empty!" or tap the body does both; drags stay
  optional); six bins per street → four; the 4 s road drive → 2 s. Add a strip only at the landfill (Tailgate →
  Tip → Compactor) or none. One press: tap a bin = the whole grab, lift, tip, shake, set back.

**Sewing Machine** (`plans/sewing-machine.md`)
- Fits as: job bar Pillow | Patch | Fish | Scrap; a step row per project (Pin → Sew → Snip → Turn → Stuff → Close,
  max 6); the pedal on the machine and the step row's Go both sew (on the machine: tap = a short sewing run, hold = keep sewing).
- Cut: the Fabric and Thread tabs (fabric per project, thread color = tap the spool on the machine); the tension dial
  and the stitch selector as required (keep them working on the machine, never a step); pinning: one tap pins all;
  snipping curves automatic; corners: the machine stops and turns with one tap; the "Inside" view stays behind a
  tap on the bobbin cover. Target: first stitches within 2 taps, a finished pillow in about 1 minute.

**Play Dough** (`plans/play-dough.md`)
- Fits as: choice tiles of tools (Hands, Rolling pin, Knife, Cutter, Stamper, Hair maker; pizza cutter merged with
  the knife) in one row; shapes as row 2 only when Cutter or Stamper is picked; Dough tubs on the scene (tap a tub =
  a ball), not a tab.
- Cut: the Tools/Shapes/Dough tabs; the thickness knob (Medium); the die wheel stays on the press (tap = next die);
  marbling stays. One press: lever pull → tap = a full extrusion; crank → tap = one sheet; cutter drag → tap the
  dough = cut there.

## 6. Decisions (the dad, 2026-10-09: "most of these are fine; do what you think and make it something we examine
again in the future")
All nine questions below are decided by the coordinator as proposed: the Tool Wall becomes a station behind a
Workshop map; Birdhouse in 6 visits; Espresso in 6 steps; Marble Run drops Mix 2 and Kit (keeps Mix 1); Saw Bench
keeps the 8 saws the Saw Bench entry lists; a spoken coach line as an App setting, off by default; New is one tap
everywhere (palm guard); the cleaner chrome as in the mock; Go inside the step row. **Revisit after he has played
the redesigned apps** (each batch report lists what to look at again).

### The original questions
- OK to turn the Workshop's Tool Wall into a station behind a workshop map (1.7)?
- Birdhouse in 6 visits instead of 22: OK?
- Espresso in 6 strip steps (warm-up, flush, knock-out, rinse automatic): OK?
- Marble Run: which 6 runs stay (drop two of Mix 1, Mix 2, Kit)?
- Saw Bench: which 8 hand saws stay?
- Spoken coach line as an App setting (off by default)?
- New with one tap everywhere (the Birdhouse's hold-to-reset included), now that the palm guard protects it?
- The cleaner chrome (1.14, mock): thinner outlines and a bottom lip instead of the chunky offset shadows: OK?
- Go inside the step row (the current step is the green button) instead of a separate Go row: OK?

## Sources
1. Nielsen Norman Group, "Physical Development in Kids: Designing for Motor Skills" (touch targets at least
   2 cm x 2 cm for young children; drag precision; offer drag or tap the destination; no two-handed use or quick
   reactions under 5): https://www.nngroup.com/articles/children-ux-physical-development/
2. Joan Ganz Cooney Center / Sesame Workshop, "Best Practices: Designing Touch Tablet Experiences for Preschoolers"
   (tap is most intuitive; pinch and flick are hard; wrists rest on the bottom edge and trigger hotspots there;
   preschoolers hold tablets in landscape; dialogue + visual reinforcement):
   https://joanganzcooneycenter.org/?p=19607 ; summary: https://www.theregister.co.uk/2012/12/20/sesame_street_touch_apps_best_practice/
3. Anthony et al., children's touch and gesture interaction (children miss targets 46% vs adults 32%; need more
   tolerance): https://lisa-anthony.com/wp-content/uploads/2013/04/anthony-et-al-jpuc2013.pdf ,
   https://init.cise.ufl.edu/wp-content/uploads/sites/378/2019/03/anthony-et-al-IJHCS2019-MTAGIC-final-preprint.pdf
4. FittsFarm: children's drag-and-drop on tablets (errors about double with smaller targets):
   https://dl.ifip.org/IFIP-LNCS/hal-02553903v1
5. "Toddler Techie Touch Generation" (CHI 2018), 18–42 month olds: tapping and swiping easiest, dragging harder,
   pinch/rotate hardest: https://unpaywall.org/10.1145%2F3242671.3242693 ; see also Hourcade et al., "Look, My Baby
   Is Using an iPad!": https://storycarnival.cs.uiowa.edu/public/research/Look,%20My%20Baby%20Is%20Using%20an%20iPad!.pdf
6. Apple Human Interface Guidelines (44 x 44 pt minimum hit target; keep controls out of the home indicator area):
   https://developer.apple.com/design/human-interface-guidelines/accessibility
7. Same as 2 (orientation and wrist placement).
WCAG 2.x contrast (4.5:1 text, 3:1 large text/graphics) for the color checks in 1.10.
