# Drawing: design notes

## 1. Summary

The dad asked (2026-11-12) for a drawing app with three jobs: a coloring book, free drawing, and outlines for
writing letters, numbers and words. He reads well and absorbs everything; writing is the real activity, so the
learning comes from doing it (AGENTS.md §1). No shelf (the dad, 2026-11-12: it isn't needed for this app).

- Folder `drawing/`: `index.html` + `index.js` (script with a "Sections" list), manifest, icons. No `sw.js`.
- `Toybox.init({ app: "drawing" })`, both orientations. Storage key `drawing-v1` holds only the current page of
  each job and the drawer's picks, so a reload keeps it; a visit from the home screen starts fresh (`Toybox.fresh()`).
- Shown on the home screen as "Drawing" (the dad, 2026-11-12).
- Jobs: **Color | Draw | Write**.

### Layout: the page is nearly the whole screen
The dad (2026-11-12): give as much of the screen as possible to the drawing area; the colors and tools can live in
a small pull-out bar on the side.
- The header stays (Home, the title on iPad only), and the page fills everything under it, edge to edge inside the
  safe areas. No panel under or beside the stage, no job bar, no bottom bar: this app leaves the `tb-v2` panel
  layout on purpose.
- **The drawer**: a slim handle on the right edge of the page (about 56 px wide, the height of a few fingers),
  showing the current color as a big swatch and the current tool's picture, so the picked state is never hidden.
  A tap on the handle (or a drag out from it) slides the drawer open over the page's edge.
- The drawer holds, top to bottom: the jobs (Color | Draw | Write), the tools, the colors, the job's own choices
  (coloring pages, or Write's four sets), then New (orange) and Surprise. Picked items are yellow with a
  tick badge, as everywhere.
- The drawer stays open while he picks; a touch on the page closes it, and that touch also draws, so no tap is
  wasted. The handle closes it too.
- New lives in the drawer. Reading of "nothing traps him: always a visible way to start over": the handle is always
  on screen and New is one tap behind it.
- On an upright phone the drawer opens over the right part of the page (about 40% of its width), in two columns if
  it needs them; on iPad and in landscape it is a single column.
- The first visit opens the drawer once by itself for a moment, so he sees it is there; the idle ghost hand points
  at the handle when he hasn't found it.

## 2. The jobs

### Shared tools (Color and Draw)
- In the drawer: Crayon (waxy, slightly grainy edge),
  Marker (smooth, solid), Paint brush (soft, wide), Paint bucket (Color only: one tap fills an area), Eraser.
- Colors: about 12 bright swatches plus white and black. The picked tool and color are yellow with a tick badge.
- Several fingers draw at once; the palm guard ignores a resting hand. Strokes are smoothed so a wobbly finger
  still draws a clean line.
- Canvas at devicePixelRatio capped at 2. Undo isn't planned (New clears; the Eraser fixes); ask if wanted.

### Color (coloring book)
- Line-art pages of things he loves: tractor, excavator, rocket, train, gears, the 3D printer (a P1S without
  logos), the water table, a garbage truck, a marble run. Drawn as SVG paths, reusing the shapes of drawings already
  in the Toybox where that is quicker. Chunky ink outlines with closed areas big enough for the bucket.
- The pages are picture tiles in the drawer; picking one swaps it in.
- Line art sits on a layer above the color, so crayon and paint never cover the lines.
- **"Stay in the lines" switch** in the drawer (the dad, 2026-11-12): a real-looking toggle with a picture (a crayon
  stroke stopping at a line vs crossing it) and the words "Stay in the lines". On: crayon, marker and paint stay
  inside the area where the stroke started. Off: ink goes wherever his finger goes, like a real crayon. On by
  default; a visit from the home screen sets it back to on, a reload keeps it.

### Draw (free drawing)
- A blank white page with the same tools minus the bucket. New clears it (the shared New, orange).

### Write (tracing)
Guided but forgiving (the dad, 2026-11-12, after talking it through): the start point and direction of each stroke
matter, because those habits stick [1], but a 3-year-old's finger control is still growing [4], so wobbles count
and nothing is ever marked wrong. Sources are in section 3.
- One stroke at a time: the letter shows as a dotted outline, the current stroke has a green start dot and an arrow
  along its direction, and the coach line says what to do ("Trace the line down from the green dot.").
- His ink snaps onto the stroke within a wide margin (about 2 cm on either side). The stroke only grows when his
  finger moves forward along it; going backwards or off the path doesn't grow it and shows no error.
- Lifting the finger keeps the progress; the next touch carries on from there.
- A finished stroke turns solid and the next stroke's dot appears. A finished letter or word gets a short sparkle,
  stays on screen, and the next one is one tap away (a Next arrow: the next letter or digit in order, or the next
  word in the list).
- Stuck: after about 4.5 s without progress the ghost hand traces the stroke; after another try without progress
  the stroke finishes along with his finger (the "auto-assist after a few misses" rule).
- **Picking what to write** (the dad, 2026-11-12: he picks it himself, straight from the set). Write shows four big
  picture tiles: **A-Z**, **a-z**, **0-9** and **Words**. A tile opens a picker over the page with the whole set
  in order: A-Z shows the capital alphabet A to Z, a-z the lowercase alphabet, 0-9 the digits 0 to 9; he taps the
  one he wants and it comes up big, ready to trace. The four tiles stay in the drawer to pick again.
- Words picker: the 1000 words don't fit one screen, so it shows the alphabet first; a letter opens the words that
  start with it, in the list's order, in a picker that scrolls inside itself (a guess; see the questions).
- Words are shown as the list writes them (lowercase, with capitals only on names like France).
- The order children are usually taught [2] (capitals L, F, E, H, T, I first, then the curved letters, then the
  diagonal ones; lowercase c, o, s, v, w, t first; digits 1 to 5 before 6 to 9 and 0 [3]) no longer decides what he
  writes, since he picks. It still guides the build: test the stroke data in that order, and the diagonal letters
  (K, A, N, M, V, W, X, Y, Z), which children usually manage about two years after lines and circles [4], need the
  wide margin and the ghost hand most (a child can imitate a move he watches before he can copy it from a picture
  [4]). Every digit starts at the top; 0 goes counterclockwise [3].
- Words: the **Fry 1000 Instant Words** [5] (the dad, 2026-11-12: "grab a set of common words for kids to learn,
  top 1000"; words of any length are fine; the dad, 2026-11-12, on its unclear copyright: "That's probably fine"). The list is in `plans/drawing-words.txt`;
  the build copies it, minus the exclusions, into `drawing/words.js`.
- Left out for a 3-year-old (a proposal for the dad): war, died, fight, killed, army, blood, soldiers, dead, death,
  gun. Kept unless he says otherwise: God, church, beat, hit, lie, fear, bones, fire, wife, sir.
- A long word doesn't shrink to fit: the letters stay big enough to trace, and the word slides along as he goes,
  with the whole word shown small along the top so he can read it. When it's done the whole word shows at once.
- Stroke data: each glyph is a list of strokes, each a polyline of points in a unit box with its direction, written
  by hand: strokes start at the top and go top to bottom [1][3]; circles and the c stroke go counterclockwise. Words
  are built from the letter glyphs.
- Numbers here pass the Numbers rule (tracing them is the point).

### Surprise (a moment on the current page, then play goes on)
Takes turns: the page's colors shimmer like a rainbow for a moment, the finished drawing wiggles, sparkles trail
along every line. No faces on anything drawn on a coloring page.

### Kind words
`Toybox.kind()` when he finishes a coloring page (most areas filled) or a traced word.

## 3. Sources (checked 2026-11-12)

1. Letter formation and stroke order: The OT Toolbox, "Letter formation",
   https://www.theottoolbox.com/letter-formation/ ("A child who is demonstrating a bottom to top orientation or
   sequence of strokes, when writing may have a significantly harder time learning to form letters correctly and
   fluidly.")
2. Teaching order: Learning Without Tears, https://www.lwtears.com/support/product-information/why-handwriting-without-tears-teaching-order-different-how-does-it-work
   ("We teach easy letters first, beginning with capitals, and then teach lowercase letters in groups of similar
   stroke sequence"; the page doesn't list the groups). The groups above come from The OT Toolbox's summary of the
   program: https://www.theottoolbox.com/handwriting-without-tears-letter-order/
3. Numbers: The OT Toolbox, "How to teach number formation", https://www.theottoolbox.com/how-to-teach-number-formation/
   ("Work on numbers 1 to 5 first ... we move on to number 6 to 10"; "All of the numbers start at the top";
   anti-clockwise circles "to prevent letter reversals").
4. Shape milestones (from the Beery VMI): Growing Hands-On Kids,
   https://www.growinghandsonkids.com/typical-visual-motor-development-in-children.html (imitates a single circle at
   30-36 months, a cross at 36-41 months, a square and diagonal lines at 54-59 months).
5. Fry, E. (1980). "The New Instant Word List." The Reading Teacher, 34(3), 284-289. Full list copied from
   https://sightwords.com/sight-words/fry/. Copyright of the list itself is unclear: no source found says it is free
   to use. It's widely reprinted by schools. The Dolch list (Dolch, 1936; about 315 words) is the older alternative.

Not sourced: that tracing with a finger on a screen is easier than writing with a pencil, and the 2 cm margin
(a starting guess to tune in testing).

## 4. Open questions for the dad

- Which coloring pages first, and how many? (Proposed: the nine above.)
- Write: the Fry exclusions above: right, too many or too few?
- Write: also his machine words (EXCAVATOR, COMBINE HARVESTER...) besides the Fry list?
- Words picker: the alphabet first, then the words for one letter (the guess), or another way in?
- Drawer on the right edge (the guess) or the left? It may depend on which hand he draws with.
- Undo: wanted, or are New and the Eraser enough?
- Apple Pencil: does he use one? (Pointer events support it either way; the question is whether to tune for it.)
