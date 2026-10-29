# Forge: design and engineering plan

## 1. Summary

A blacksmith's corner seen from where the smith stands. He makes the fire hot with a hand-crank blower, heats a
steel bar until it glows, and shapes it on the anvil with his own hammer taps: the metal moves only where he hits
it and only while it is hot. The hero project is the dad's real coffee spoon: a hammered copper bowl riveted to a
twisted steel handle. Finished pieces hang on a rack and stay there across visits (his collection).

- Folder `forge/`: `index.html` (markup, styles) + `index.js` (script, with a "Sections" list at its top),
  `manifest.webmanifest`, the four icons. No `sw.js`. Model the page on `glow-board/`.
- Launcher tile **"Forge"**, header title "Forge". `Toybox.init({ app: "forge" })`. Storage key `forge-v1`.
- Safety gear: `Toybox.gate` with flag `forge-gear` (already in `GEAR_FLAGS` in `common/toybox.js` and set by the
  test tools): **Eye protection**, **Ear protection**, **Leather apron**, **Gloves**.

## 2. The real thing

| Part | What it really does | In the app |
| --- | --- | --- |
| **Forge** (coal forge, firepot) | Holds the burning coal | Glows dull to bright with the blower; flames rise when it is hot |
| **Blower** (hand-crank) | Turning the crank pushes air into the fire and makes it hotter | Working crank: drag it round, or tap for one turn; the fire dies down slowly when he stops |
| **Tongs** | Hold the hot bar | The bar is always held by tongs; he drags the tongs |
| **Anvil**: face, horn, edge | Face for flattening, rounded horn and edge for bending | Hammer taps on the bar where it lies |
| **Hammer** | Moves hot metal | His tap on the bar is the hammer blow |
| **Vise** + **twisting wrench** | Holds the bar while the wrench twists the hot part | Drag the wrench round; the twist follows his drag |
| **Dishing stake** (ball-shaped) | Copper is hammered over it to make a bowl | Each tap leaves a dimple and deepens the bowl |
| **Slack tub** (water bucket) | Cools hot metal fast | Steam burst; the bar turns dark grey |
| **Rivet** (copper) | Joins the handle to the bowl | Drop it in, hammer its head round |
| **Polishing cloth** | Shines copper, waxes steel | One drag or tap: the bowl shines |

Heat colors of steel, in order (real incandescence): black, dull red, cherry red, orange, yellow. Steel only moves
when it is at least dull red; cold steel just clinks. Copper for the spoon is worked cold (the dad didn't heat it).

## 3. Play

### 3.1 The bar model (what makes it feel real)
The steel bar is a chain of short segments (about 40 to 60). Each segment has a heat, a width, a thickness, a
twist angle and a bend angle, and is drawn from those (a ribbon seen from the front and a little above, with a
hammered texture on flattened parts).
- Segments inside the fire heat at a rate set by the fire's brightness; heat spreads a little to neighbors and
  fades over time everywhere. A heat stays workable for about 12 to 15 s on the anvil (calm pace).
- A hammer tap on a hot segment makes the segments under the hammer thinner and wider and the bar a little longer
  (the metal has to go somewhere). Sparks and scale flakes fly and are gone within about 1 s.
- Tap on cold metal: a clink, a small bounce, and the coach line "The bar is cold. Put the bar in the fire."
- Twisting in the vise turns only the hot part between the jaws and the wrench.
- Bending: a hot end over the anvil edge bends a step with each tap.

### 3.2 Controls (every one works with a single tap too)
- **Blower crank**: drag in a circle or tap for one turn. The fire never goes fully out, so a bar in a low fire
  still heats, just slowly. If he puts the bar in a low fire, the crank glows and the coach says "Turn the blower
  crank to make the fire hot."; on the second time the blower gives a few turns by itself.
- **Moving the bar**: drag the tongs to the fire, the anvil, the vise or the tub; or tap one of those places and
  the bar goes there.
- **Hammer**: tap the bar where it lies on the anvil or stake. Holding keeps hammering at a steady calm beat.
- **Twisting wrench**: drag round, or tap for a quarter turn.

### 3.3 What to make (tiles: picture + word)
1. **Spoon** (the project, the dad's real spoon; steps in this order):
   1. **Twist the handle**: heat the middle of the bar, clamp it in the vise, turn the twisting wrench.
   2. **Flatten both ends**: heat each end and hammer it flat on the anvil face. One end becomes the round tab
      for the rivet, the other the end of the handle (a plain flat paddle).
   3. **Bend the neck**: heat the tab end, hammer it over the anvil edge so the handle angles up.
   Then **Dunk** the handle in the tub so it is cool before the copper work.
   4. **Dish the bowl**: hammer the cold copper disc on the dishing stake; each tap leaves a dimple where it
      lands and the bowl gets deeper. Smooth inside, dimpled outside.
   5. **Rivet**: the tab goes against the bowl (holes are already punched), drop in the copper rivet, hammer its
      head round.
   Then the polishing cloth, and the spoon goes on the rack. Progress through the steps is saved (a reload or a
   fresh visit continues where he left off; it is not a number). Each step's instruction names the part:
   "Hammer the hot end of the bar flat."
2. **S-hook**: point both ends, bend each over the horn the opposite way.
3. **Fire poker**: twist the middle, bend one end into a loop handle over the horn, point the other end.
4. **Bar**: a plain bar to shape freely.

A finished piece is quenched (or, for the spoon, polished) and hung on the **rack** on the wall. The rack keeps
pieces across visits (collection); oldest drop off when it is full.

### 3.4 Coach lines (verb first, literal)
"Turn the blower crank to make the fire hot." "Put the steel bar in the fire." "Hammer the hot end of the bar
flat." "Turn the twisting wrench to twist the hot bar." "Hammer the copper disc on the stake." "Put the rivet in
the hole." "Dunk the hot bar in the water." Information lines: "The bar glows orange. It is hot enough to hammer."

### 3.5 Surprise (a moment on the current scene, taking turns)
A tall shower of sparks from the fire; a robin lands on the anvil horn and hops off; the blower spins by itself and
the flames dance up. Never a face on an object.

### 3.6 Fresh visit, timer
- Fresh visit: the current piece and the picked make go back to defaults (the spoon project's progress and the rack
  stay).
- `onEnding`: the fire dies down to embers, the bar cools to grey. Rest line: "The forge is resting."

## 4. Layout
One main view he controls. The forge, anvil, vise and tub stay fully visible at every size with the bar; the
anvil sits low near his hands. On upright phones stack them closer together rather than shrink everything. The
panel holds the make tiles and the bottom bar (New, Surprise). Test at 390x844, 844x390, 820x1180, 1180x820,
1024x1366.

## 5. Open questions for the dad
- Dishing: a ball-shaped stake (as built) or a hollow in a log?
- Rivet holes: punched or drilled? (Built as already punched.)
- The far end of the spoon handle: built as a plain flat paddle. Another shape?
- Should a finished spoon appear as the bean scoop in the Espresso Machine?
- A copper make that shows copper's rainbow heat colors (a copper leaf)?
- The dunk between bending the neck and dishing was added while building (the tub gets used, the handle is cool
  for the copper work). Keep it, or let the handle cool by itself?
- The plain Bar goes to the rack only when he dunks it after working it. Is that the right finish?
- On an upright phone the bar is drawn thin (about 9 px). Bigger, at the cost of a tighter scene?
