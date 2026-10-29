# Circuits: design and engineering plan

## 1. Summary

Chunky electric parts on a board, like a snap-together circuit kit. He drags parts and wires into place, and the
moment a loop closes, glowing dots run around it and the bulb lights, the fan spins, the buzzer buzzes. A hand-crank
generator can replace the battery, so the lights stay on only while he turns it. A second job puts the same parts in
a cutaway house at night: the porch light, the doorbell, the fan and the lamp each work once he wires them.

- Folder `circuits/`: `index.html` + `index.js` (with a "Sections" list at its top), `manifest.webmanifest`, the
  four icons. No `sw.js`. Model the page on `glow-board/`.
- Launcher tile **"Circuits"**, header title "Circuits". `Toybox.init({ app: "circuits" })`. Storage key
  `circuits-v1`.

## 2. The parts (real names, no values or numbers anywhere)

| Part | Real behavior | In the app |
| --- | --- | --- |
| **Battery** | Pushes current around a closed loop | A chunky battery block; a big + on one end is fine (a symbol, not a number) |
| **Hand crank** (generator) | Makes electricity only while turned; faster gives more | Drag round or tap for one turn; lights fade when he stops |
| **Wire** | Connects | Straight block, plus a corner block |
| **Switch** | Opens and closes the loop | Real lever that moves; tap toggles |
| **Push button** | Closed only while pressed | Closed while he holds it; a tap is a short press |
| **Bulb** | Glows; two in a row glow dimmer than one | Glow and rays scale with current |
| **Colored light** (LED) | Lights only one way round | Picked color; backwards = dark with the hint "Turn the light around." (tap it to flip) |
| **Motor** with fan | Spins; faster with more current | Fan blades spin |
| **Buzzer** | Buzzes | Visible rings and a shake (works with sound off) |

## 3. Play

### 3.1 Board
- A pegboard of snap points (fewer and bigger on phones). Every part spans two neighboring points, horizontal or
  vertical. A parts tray on the stage (like Glow Board's tray) holds one of each; dragging from it places a copy.
  Drag a placed part to move it; drag it back to the tray to remove it. Tap a placed part to use it (switch,
  button, crank) or flip it (light); turning a part is a drag around its other end.
- **Solver**: the board is a graph of nodes (snap points) and two-terminal parts. Each change runs a small nodal
  analysis (Gaussian elimination on a few dozen nodes: wires and closed switches as tiny resistance, bulbs, motor
  and buzzer as fixed resistances, the LED as a one-way part, the source as a voltage). Current through each part
  sets its glow, spin or buzz and the speed of the dots on its wires. Series dimming and parallel brightness come
  out of the solver, not special cases.
- **Short circuit** (the source connected straight back to itself through wires only): the wires glow orange and
  the coach says "The wire goes straight back to the battery. Put a bulb in the loop." Nothing breaks, nothing is
  scary.
- **Fresh visit** starts with a battery, a bulb and wires in a loop with one gap; coach: "Drag a wire into the gap
  to light the bulb."

### 3.2 House
A cutaway house at night (dark windows, stars), with power coming from a battery box (or the hand crank, a choice)
in the basement. Four things to wire, each a short loop in the wall with a missing piece: the **porch light**, the
**doorbell** (push button by the door: rings while held), the **ceiling fan** (switch) and the **bedroom lamp**
(switch). He drags the missing wire, switch or button into its gap, then uses it. Lit rooms stay lit until he
switches them off. Same solver as the board.

### 3.3 Coach lines (verb first, literal)
"Drag a wire into the gap to light the bulb." "Tap the switch to close the loop." "Turn the crank to make
electricity." "Hold the doorbell button to ring the bell." Information: "Two bulbs in a row share the electricity.
They glow less."

### 3.4 Surprise (a moment on the current scene, taking turns)
A moth flutters to the brightest bulb and away; the fan blows a few paper streamers; every light on the board
twinkles through its colors once. In the House: a cat walks past the porch light; the doorbell's visitor is a
delivery box that slides onto the step. Never a face on an object.

### 3.5 Timer
`onEnding`: lights dim, the fan slows, the crank stops. Rest line: "The circuits are resting."

## 4. Layout
Jobs **Board | House** as tabs; the stage never re-lays out when the tab changes. The panel holds the tabs and the
bottom bar (New, Surprise); parts live in the tray on the stage. Big parts and snap points (2 cm hit radius).
Test at 390x844, 844x390, 820x1180, 1180x820, 1024x1366.

## 5. Open questions for the dad
- Is the colored light's one-way rule fun or confusing at 3?
- Should the house have more rooms (a lighthouse outside, a garage door motor)?
- Keep his board across fresh visits as a collection, or start fresh each time (built: fresh)?
- Built differently from section 2 and 3.1: no corner wire block (every snap point joins what meets there); a part
  is turned by dragging it to a spot that runs the other way; each new colored light takes the next color (no
  picker). Wanted the other way?
- Any part fits any house gap, so a wire in the doorbell gap rings it nonstop. Should that gap take only the button?
- On a phone held sideways the house parts are small (about 35 px). Acceptable?
