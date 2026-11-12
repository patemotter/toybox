# Drawing: design notes

## 1. Summary

The dad asked (2026-11-12) for a drawing app with three jobs: a coloring book, free drawing, and outlines for
writing letters, numbers and words. He reads well and absorbs everything; writing is the real activity, so the
learning comes from doing it (AGENTS.md §1). No shelf (the dad, 2026-11-12: it isn't needed for this app).

- Folder `drawing/`: `index.html` + `index.js` (script with a "Sections" list), manifest, icons. No `sw.js`.
- `Toybox.init({ app: "drawing" })`, both orientations. Storage key `drawing-v1` holds only the current page of
  each job, so a reload keeps it; a visit from the home screen starts fresh (`Toybox.fresh()`).
- Built like Glow Board (`tb-v2` shell, `Toybox.jobs` tabs, the colors and tools as a tray of drawn buttons on the
  stage next to the page, so the panel holds only the bottom bar: New and Surprise).
- Jobs: **Color | Draw | Write**.

## 2. The jobs

### Shared tools (Color and Draw)
- Tray on the stage, beside the page in landscape and under it in portrait: Crayon (waxy, slightly grainy edge),
  Marker (smooth, solid), Paint brush (soft, wide), Paint bucket (Color only: one tap fills an area), Eraser.
- Colors: about 12 bright swatches plus white and black. The picked tool and color are yellow with a tick badge.
- Several fingers draw at once; the palm guard ignores a resting hand. Strokes are smoothed so a wobbly finger
  still draws a clean line.
- Canvas at devicePixelRatio capped at 2. Undo isn't planned (New clears; the Eraser fixes); ask if wanted.

### Color (coloring book)
- Line-art pages of things he loves: tractor, excavator, rocket, train, gears, the 3D printer (a P1S without
  logos), the water table, a garbage truck, a marble run. Drawn as SVG paths, reusing the shapes of drawings already
  in the Toybox where that is quicker. Chunky ink outlines with closed areas big enough for the bucket.
- A page picker (picture tiles) opens from the page itself or a Pages button in the tray; picking a page swaps it in.
- Line art sits on a layer above the color, so crayon and paint never cover the lines.
- Default guess (see questions): ink stays inside the area where the stroke started.

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
- Content order, picked from tabs or tiles inside Write: **Capitals** (straight-line letters first: L, T, I, H, E,
  F, then the rest), **Numbers** (0 to 9), **Words** (short real words he knows: DRILL, SAW, GEAR, TRAIN, ROCKET,
  TRACTOR). Lowercase is a question below.
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

- Name on the home screen: "Drawing"? "Draw & Write"? Something else?
- Coloring: should ink stay inside the lines (the default guess), or go wherever his finger goes?
- Which coloring pages first, and how many? (Proposed: the nine above.)
- Write: lowercase letters too, or capitals only for now?
- Write: which words? Family words like MOM and DAD, or only things from his interests? (The child's own name
  can never go in the code.)
- Undo: wanted, or are New and the Eraser enough?
- Apple Pencil: does he use one? (Pointer events support it either way; the question is whether to tune for it.)
