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
  (coloring pages, or Capitals | Numbers | Words), then New (orange) and Surprise. Picked items are yellow with a
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
matter, because those habits stick, but a 3-year-old's finger control is still growing, so wobbles count and
nothing is ever marked wrong.
- One stroke at a time: the letter shows as a dotted outline, the current stroke has a green start dot and an arrow
  along its direction, and the coach line says what to do ("Trace the line down from the green dot.").
- His ink snaps onto the stroke within a wide margin (about 2 cm on either side). The stroke only grows when his
  finger moves forward along it; going backwards or off the path doesn't grow it and shows no error.
- Lifting the finger keeps the progress; the next touch carries on from there.
- A finished stroke turns solid and the next stroke's dot appears. A finished letter or word gets a short sparkle,
  stays on screen, and the next one is one tap away (a Next arrow, or tap the finished word).
- Stuck: after about 4.5 s without progress the ghost hand traces the stroke; after another try without progress
  the stroke finishes along with his finger (the "auto-assist after a few misses" rule).
- Content order, picked in the drawer: **Capitals** (straight-line letters first: L, T, I, H, E, F, then the rest),
  **Numbers** (0 to 9), **Words**. Lowercase is a question below.
- Words: real words of any length (the dad, 2026-11-12: he knows lots of words, so no need to stick to short ones):
  DRILL, GEAR, TRACTOR, EXCAVATOR, SCREWDRIVER, COMBINE HARVESTER, CEMENT MIXER, MARBLE RUN.
- A long word doesn't shrink to fit: the letters stay big enough to trace, and the word slides along as he goes,
  with the whole word shown small along the top so he can read it. When it's done the whole word shows at once.
- Stroke data: each glyph is a list of strokes, each a polyline of points in a unit box with its direction, written
  by hand to match how handwriting is commonly taught (top to bottom, left to right, circles counterclockwise from
  the top). Words are built from the letter glyphs.
- Numbers here pass the Numbers rule (tracing them is the point).

### Surprise (a moment on the current page, then play goes on)
Takes turns: the page's colors shimmer like a rainbow for a moment, the finished drawing wiggles, sparkles trail
along every line. No faces on anything drawn on a coloring page.

### Kind words
`Toybox.kind()` when he finishes a coloring page (most areas filled) or a traced word.

## 3. Open questions for the dad

- Which coloring pages first, and how many? (Proposed: the nine above.)
- Write: lowercase letters too, or capitals only for now?
- Write: any family words like MOM and DAD, besides words from his interests? (The child's own name can never go
  in the code.)
- Drawer on the right edge (the guess) or the left? It may depend on which hand he draws with.
- Undo: wanted, or are New and the Eraser enough?
- Apple Pencil: does he use one? (Pointer events support it either way; the question is whether to tune for it.)
