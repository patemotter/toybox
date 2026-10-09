# Farm: design and engineering plan

## 1. Summary

**Farm** is a multi-page app in `farm/`, tile name **"Farm"**, built like the Construction Site: a farm map
(`farm/index.html`) and one page per station. The focus is the real farm work done with real machines, plus the two
daily animal jobs the dad named. **v1 has four stations**: **Field** (`field.html`: one tractor that hitches a
plow, a disc harrow, a seed drill or a sprayer), **Combine** (`combine.html`: harvest wheat, unload into a grain
cart that feeds a grain truck), **Milking** (`milking.html`: a milking parlor, one cow at a time) and **Eggs**
(`eggs.html`: a hen house with nest boxes and an egg carton). **Hay** (`hay.html`: mower, wheel rake, round
baler) comes right after v1, because it reuses the Field page's driving code. **Feeding** (`feeding.html`: a feed
mixer wagon) comes later. One small shared script, `farm/farm.js`, holds what the driving stations and the map
share (see 4.1). The Farm is different from the Garden: the Garden is hand-sized (seed packets, a watering can,
picking a carrot); the Farm is field-sized work done by machines, with grain crops and farm animals.

---

## 2. The real thing

### 2.1 The crop year (wheat or corn on a grain farm), in order
1. **Primary tillage: plowing.** A tractor pulls a **moldboard plow** (several **bottoms**, each a pointed
   **share** that cuts a slice of soil and a curved **moldboard** that lifts and turns it upside down). The old
   stubble and weeds are buried; the field is left in ridged, shiny **furrows**. Gulls often follow the plow to eat
   the worms it turns up. The plow hangs on the tractor's **three-point hitch** (two **lower links**, one **top
   link**, raised and lowered by the hydraulic **lift arms**). At the end of the field (the **headland**) the
   driver lifts the plow out of the ground, turns around and lowers it again for the next **pass**.
2. **Secondary tillage: disc harrow** (or a field cultivator). Two **gangs** of round, concave steel **discs**,
   set at an angle, roll and slice the big clods into fine crumbly soil and level it: the **seedbed**.
3. **Planting: seed drill** (for wheat; a **row planter** for corn). Seed sits in the **hopper** on top; a **seed
   meter** feeds it down **seed tubes**; **disc openers** cut a narrow slot, the seed drops in, and **closing
   wheels** (press wheels) press the soil shut. A folding **row marker** arm scratches a line on the soil so the
   next pass lines up.
4. **Spraying: sprayer.** A **tank** of liquid (fertilizer, or crop protection) and a long **boom** that unfolds
   out to the sides with **nozzles** every so often, each making a fan of fine mist. A **pump** (driven by the
   tractor's spinning **PTO shaft**, power take-off) pushes the liquid out. The crop grows taller and greener.
5. **Growing.** Weeks pass: sprouts, then a green crop, then the wheat heads turn golden.
6. **Harvest: combine harvester.** At the front, the **header** (grain head): the turning **reel** (bats with
   tines) leans the stalks back onto the **cutterbar** (a long knife with triangular sections sliding back and
   forth), and the **header auger** pulls the cut crop to the middle. The **feeder house** (a chain conveyor)
   carries it up into the machine. Inside, the **rotor** (or threshing cylinder) rubs the grain out of the heads
   against the **concaves**; grain falls through onto shaking **sieves** while the **cleaning fan** blows the light
   **chaff** out of the back; the **clean grain elevator** (paddles on a chain) lifts the grain into the **grain
   tank** on top. The **straw** goes out the back through the **straw chopper** and **spreader**, or in a row (a
   **windrow**) to be baled. When the tank is full, a **grain cart** (a big wagon with its own auger, pulled by a
   tractor) drives alongside and the combine swings out its **unloading auger** and pours grain into it while
   both keep moving ("unloading on the go"). The grain cart then empties into a **grain truck** at the field edge,
   which drives the grain to the **grain bins** at the farm.

### 2.2 Hay (early summer, several times a year)
**Mow** the grass and clover with a **disc mower** (small fast-spinning discs with little knives; a
**conditioner** crimps the stalks so they dry faster); it lies in a flat **swath**. Let it dry in the sun (a few
days), turning it with a **tedder**. **Rake** it into one **windrow** with a **wheel rake** (big tined wheels that
the ground turns). **Bale** it: the **round baler**'s **pickup** (spring tines) lifts the windrow, belts roll it
round and round inside the **bale chamber** until it is full, **net wrap** goes around it, the **tailgate** lifts
and the bale rolls out. A tractor with a **bale spear** carries the bales to the stack.

### 2.3 Animals (every day)
- **Milking (dairy cows), twice a day.** Cows walk into the **milking parlor** and stand in their **stalls**; the
  farmer works from the **pit**, with the udders at chest height. Steps: **pre-dip** each teat (a dip cup),
  **wipe**, **strip** a few squirts by hand, attach the **milking unit** (the **claw** with four **teat cups**;
  inside each, a rubber **liner** that the **pulsator** squeezes and opens about once a second), milk flows down
  clear **milk hoses** to a glass **milk meter jar** and on through the pipeline to the stainless steel **bulk
  tank** (cold, with a slow **agitator** paddle). When the flow slows, the **automatic take-off** pulls the unit off
  by its cord. **Post-dip**, the exit gate opens and the cow walks out. A **milk truck** collects from the bulk
  tank. Breeds: Holstein (black and white), Jersey (light brown), Brown Swiss (grey-brown).
- **Eggs (hens).** Hens sleep on a **roost** bar and lay in **nest boxes** on straw, about one egg a day. After
  laying a hen often **cackles** loudly (the "egg song"). The farmer reaches under or lifts the hen, collects the
  eggs into a wire **egg basket**, then puts them in **egg cartons**. Hens eat from a hanging **feeder** and drink
  from a **waterer**. Egg color comes from the breed: Rhode Island Red and Barred Rock lay brown eggs, White
  Leghorn white, Ameraucana blue-green.
- **Feeding (later).** A **feed mixer wagon** (also called a TMR mixer: big **vertical augers** inside a tub) mixes
  hay, silage (scooped from the **silage bunker** by a loader) and grain, drives along the **feed alley** and its
  **side conveyor** lays a line of feed along the **feed bunk**; the cows put their heads through the
  **headlocks** and eat.

### 2.4 Kept, simplified, dropped
- **Kept** (the real order and the real parts, by name and look): plow, then disc harrow, then seed drill, then
  sprayer; the three-point hitch lifting at every headland; the turned furrows; the reel, cutterbar, feeder house,
  grain tank, unloading auger, grain cart, grain truck; the milking unit with four cups, the pulsing liners, the
  clear hoses, the jar and bulk tank, the automatic take-off; nest boxes, cackling, egg cartons.
- **Simplified**: weeks of growing and days of hay drying happen in a few seconds (a fast sun arc); one field of
  **four passes**; machines fill and empty faster than real; refilling the seed hopper and sprayer tank is
  automatic at the headland; pre-dip, wipe and post-dip are done by the farmer's gloved hand automatically
  (shown in about a second, so he sees the real step without doing it).
- **Dropped** ("no procedural extras"): starting the engine with a key, picking gears, raising and lowering the
  hitch by hand, connecting the PTO shaft, folding the sprayer boom and row markers by hand, engaging the
  combine's threshing, stripping teats by hand, washing and grading eggs, any setting of depth, rate or speed.
  **Hitching is automatic**: picking an implement drives the tractor back to it and it clicks on.
- **Not in v1**: tedder, bale stacking, feed mixer, grain bins as a station, candling eggs, the milk truck as a
  station (it appears in the background), corn (wheat first; see question 2).

---

## 3. Experience design

### 3.1 Shared look and view for the driving stations (Field, Combine, Hay)
- **View**: standing at the edge of the field on a little rise, looking across it. The field is four
  horizontal **lanes** stacked from near (bottom, biggest) to far (top, slightly smaller: lane scale 1.0, 0.9,
  0.81, 0.73), with a dirt **field track** in front, the headland at each end, and a strip of sky at the top
  with the farm (barn, silo, trees) on the horizon. Machines are drawn from the side, big, in the lane they are
  working. Work goes near to far, so the finished lanes are in front and stay visible. This is the view a person
  watching the work would have; the side view shows every working part (shares, discs, openers, reel).
- **The machine is the handle**: he drags the tractor or combine forward along its lane. It follows his finger
  with a calm top speed (a lane takes about 6 to 8 s at top speed) and never goes backward. Dragging behind it does
  nothing harmful: it idles, a small arrow pulses ahead of it and the coach says "Pull it forward!". A tap
  anywhere ahead in the same lane drives it there (forgiving). The hit area is the whole machine plus implement
  plus 40 px.
- **Go button "Drive!"** (backup): hold to drive at top speed; a quick tap still drives a short visible distance
  (about 0.6 s).
- **Engine**: always running on arrival (a puff of dark smoke from the **exhaust stack** on the first touch, then
  soft puffs that come faster while driving). No switch, so no two-step rule here.
- **Headland turn (automatic, about 2.5 s)**: the hitch lift arms raise the implement out of the ground (visible),
  the machine drives into the headland, turns around (a short swerve while it flips direction) onto the next lane,
  lowers the implement and waits for him. Input during the turn: a tap gets a horn toot and a headlight flash.
- **Tap the cab**: horn toot and headlights flash (a visible answer anywhere on the machine).
- **Camera**: always shows the whole height of the field. Horizontally it follows the machine (machine at about
  35% from the leading side so he sees the field ahead); a stage wide enough for the whole lane shows it all.

### 3.2 Field station (`field.html`, title "Field")
- **Start**: a stubble field (short yellow stalks), the tractor with the **Plow** already hitched, waiting at the
  left end of the near lane. Coach: **"Drag the tractor!"** Ghost hand: grabs the tractor and drags it right
  along the lane.
- **Implements (choice tiles, in the real order)**: **Plow**, **Harrow** (disc harrow; label "Harrow" so it fits),
  **Seed drill**, **Sprayer**. Tapping a tile: the tractor lifts the current implement, drives to the parking spot
  at the headland, drops it, backs up to the new one, the lower links click on (a small spark and a "clunk"
  shake), lifts it, drives to the start of the near lane (about 3 s in all, calm). The tractor always starts a
  new job on the near lane. Re-tapping the picked tile: the shared wiggle.
- **What each pass does (visible behind the implement, sound off or on)**:
  - **Plow**: four bottoms in the ground; behind each, a ribbon of soil curls up the moldboard and flips over
    into a ridge (soil chunks rotate and land); the lane turns from stubble to dark, glossy furrows. Worms poke
    out; two or three gulls land behind and hop along.
  - **Harrow**: two gangs of shiny discs spin (their rotation follows the ground speed); clods burst into crumbs
    with small dust puffs; the lane turns smooth, fine and light brown with faint lines.
  - **Seed drill**: the hopper lid has a window showing the seed level dropping; seeds trickle down clear seed
    tubes into the slots; closing wheels roll; the row marker arm on the far side scratches a line. A moment after
    the pass, rows of tiny green sprouts pop up along the lane (a quick ripple from one end to the other).
  - **Sprayer**: on lowering, the boom unfolds sideways across the lane (folded arms swing open, visible); the
    PTO shaft spins; every nozzle makes a fan of fine mist; the mist settles and the sprouts behind grow into a
    green crop (taller, swaying). The tank window level drops.
  - Any implement works on any lane (no wrong choice): drilling into stubble is real ("no-till"), harrowing a
    plowed lane is the real next step. The lane simply takes the new look.
- **Field done**: when all four lanes are done with the current implement, the field gives a sparkle sweep, the
  tractor parks at the headland, the **next tile in the real order glows** and the coach says "Now the harrow!"
  (then "Now the seed drill!", "Now the sprayer!"). After the sprayer, the crop grows up green, then the sun
  makes a quick arc (weeks go by) and the wheat turns golden and stays: coach **"Ready to harvest!"**,
  `Toybox.kind()`. The golden field stays until New.
- **Panel**: Go "Drive!"; choices: the four implement tiles (picture of each implement, real outline); tab bar:
  **New** (back to stubble, Plow hitched), **Surprise**. No sections.
- **Counter**: **"Passes: N"** (one pass = one trip across the field; the real word).
- **Coach lines** (one at a time): "Drag the tractor!", "Pull it forward!", "Now the harrow!" (and the others),
  "Ready to harvest!".

### 3.3 Combine station (`combine.html`, title "Combine")
- **Start**: a golden wheat field (four lanes, heads swaying), the combine at the left end of the near lane, the
  grain cart tractor waiting on the field track, the grain truck parked at the right headland. Coach **"Drive the
  combine!"**; ghost hand drags the combine right.
- **Driving**: the reel turns with ground speed and leans the wheat onto the cutterbar (the knife sections slide
  back and forth); cut stalks topple onto the header and the auger fingers sweep them into the feeder house;
  behind, the lane becomes short stubble with a scatter of chopped straw fanned out by the spreader (a spray of
  straw bits and a soft chaff cloud from the back). The grain tank on top fills: a golden heap rises above the tank
  sides (visible from the side, through the tank's top grate) and the tank extensions flip up when it is half full.
- **See inside (choice tile "Inside")**: a toggle (aria-pressed). The body panels go see-through and show the
  real flow, moving with the machine: the feeder chain carrying crop up, the rotor turning, grain falling through
  the concaves onto the shaking sieves, the fan blowing chaff out the back, the clean grain elevator paddles
  carrying grain up into the tank, the tank's auger. Remembered for the visit, not across fresh visits.
- **Unloading**: when the tank is full, the amber beacon on the cab flashes, the grain cart tractor drives up
  alongside on the lane in front (or the field track for lane one) and the coach says **"Unload the grain!"**;
  the Go button becomes **"Unload!"**. He taps the unloading auger (drawn folded along the side; a big hit area) or
  Unload!: the auger swings out over the cart and a thick golden stream pours into it, the cart heap grows, the
  tank heap sinks (about 5 s). He may keep driving while it unloads; the cart keeps alongside. Two-step handling:
  if he drags the combine forward while the tank is full and the auger is still folded, the combine stops at the
  edge of the uncut wheat, the auger flashes and the coach repeats "Unload the grain!"; **on the second try the
  auger swings out by itself** and unloading starts while it drives on.
- **After unloading**: the auger folds back; the grain cart drives to the grain truck at the headland and pours
  in with its own auger (smaller, in the background); after three carts the truck's heap is full, it honks and
  drives off along the road toward the farm, and an empty truck rolls in (the full truck's grain adds to the
  **grain bin on the map**; see 3.7).
- **Field done**: all four lanes cut: the combine parks, the last load is unloaded automatically if needed,
  `Toybox.kind()`, the stubble field stays. **New** brings a fresh golden field.
- **Panel**: Go "Drive!" (becomes "Unload!" while the tank is full); choices: **Inside** (toggle tile); tab bar:
  **New**, **Surprise**. (One tile only: the panel stays short and the stage bigger.)
- **Counter**: **"Loads: N"** (tank loads unloaded into the cart).
- **Coach lines**: "Drive the combine!", "Unload the grain!", "Drive on!", "All cut!".

### 3.4 Milking station (`milking.html`, title "Milking")
- **View**: from the pit, as the farmer stands: the cow's side and back half at the top of the stage (her udder
  at the farmer's chest height, mid-stage), the stall rail and the exit gate, the **milking unit** hanging on its
  hook at the left (claw, four teat cups, two clear short tubes per cup, the long milk hose and pulsation hose
  going to the pipeline), the glass **milk jar** on the right wall with the pipeline running off to the **bulk
  tank**, seen through the milk room window at the right edge (stainless steel, lid open, the agitator paddle
  turning, the milk level visible). Upright phones turn the composition vertical: cow on top, unit left, jar and
  tank stacked at the right.
- **Arrival (automatic, about 4 s)**: the entry gate lifts, a cow walks in and settles (chewing, tail swishing,
  ears flicking), a gloved hand dips each teat (brown dip) and wipes it with a towel (about 1 s in all).
- **The one action**: **drag the milking unit up to the udder** (coach **"Put the milker on!"**; ghost hand
  carries the claw from the hook to the udder). Near the udder (forgiving: within about 90 px) it snaps up and the
  four cups go on one after another (each with a small suck-in squash). After two near misses, the right spot
  glows; after three, the unit floats up and attaches for him.
- **Milking (about 10 s per cow, calm)**: the liners squeeze and open about once a second (visible), white milk
  pulses down the short tubes into the clear claw bowl, along the long hose in moving dashes, splashes into the
  jar; the jar fills, then empties into the pipeline and the bulk tank level rises, the agitator turns. Flow
  slows near the end; the **automatic take-off** cord pulls the unit off and swings it back to the hook. The gloved
  hand post-dips. The exit gate opens, the cow walks out with a little tail flick, the next cow walks in (cycling
  Holstein, Jersey, Brown Swiss, Holstein with a different pattern).
- **Other touches**: tap the cow: she turns her head and moos (a small "Moo!" word bubble); tap her tail: a big
  swish; tap the bulk tank: the agitator speeds up for a moment. All get a visible response.
- **Milk truck**: every sixth cow the bulk tank is full; through the milk room's back door the milk truck backs up,
  the driver hooks a hose, the tank empties (about 5 s) and the truck drives off (the trip is added to the map).
- **Panel**: Go **"Milk!"** (backup for the drag, never dead: while a cow waits and the unit is on its hook, it
  floats the unit up and attaches it for him; while milking, the coach says "Milk is flowing!" and the hoses glow;
  while cows are changing, the next cow hurries in a little). Choices: none in v1. Tab bar: **New**,
  **Surprise**. On phones the panel is just two rows (Go, tabs): the stage gets the height.
- **Counter**: **"Cows: N"** (cows milked).
- **Coach lines**: "Put the milker on!", "Milk is flowing!", "Here comes the next cow!".

### 3.5 Eggs station (`eggs.html`, title "Eggs")
- **View**: standing inside the hen house facing the nest boxes: a wooden row of **four nest boxes** with straw,
  a hen sitting in each (Rhode Island Red, White Leghorn, Ameraucana, Barred Rock), a roost bar above, a hanging
  feeder and a red waterer on the floor, the door to the run with daylight, and an open **egg carton** of twelve
  cups on a shelf in front. Upright phones: the boxes in two rows of two, the carton below; landscape: one row of
  four with the carton below or to the side.
- **The one action**: **tap a hen** (coach **"Tap a hen!"**). She stands up, fluffs, and steps to the side of the
  box, showing her egg (its color matches her breed). Ghost hand: taps a hen, then (once an egg shows) drags the egg
  to the carton.
- **Collect**: drag the egg into the carton (it snaps into the next empty cup with a little bounce; anywhere near
  the carton counts); a tap on an egg also sends it gently into the carton. The hen settles back on the nest.
- **Laying**: an empty nest's hen lays again after about 8 s: she wiggles, stands, does the **egg song** (head
  bobs, a "Bawk bawk!" word bubble), and an egg is there. Tapping a hen that has no egg yet: she clucks and
  settles (word bubble "Cluck!"), and the coach says "She is laying!".
- **Carton full**: twelve eggs: the lid closes, the carton slides onto the stack on the shelf (stays, up to six
  cartons shown, then the oldest drops out of view), a new empty carton opens, `Toybox.kind()`.
- **Feed**: choice tile **Feed**: a scoop scatters grain on the floor; the hens hop down from the nests, peck
  (heads bobbing), and hop back up (about 5 s). Tile **Water**: the waterer is refilled from a pail with a splash and
  the hens drink (they tip their heads back, as real chickens do). Both are real chores with a visible answer; both
  never block egg collecting.
- **Panel**: Go: none (the hens are the main action). Choices: **Feed**, **Water**. Tab bar: **New**, **Surprise**.
- **Counter**: **"Eggs: N"**.

### 3.6 Hay station (`hay.html`, after v1)
Same driving engine and view as Field, on a grass and clover field. Implement tiles: **Mower** (side-mounted disc
mower: the discs spin, the grass falls flat in a swath; green), **Rake** (wheel rake: the tined wheels turn by
themselves on the ground and roll two swaths into one windrow; the hay has turned from green to pale gold, dried by
a quick sun arc after mowing), **Baler** (round baler: the pickup tines lift the windrow; through the side window
the bale grows as a spiral; when full the net wrap spins around it, the **tailgate** lifts and the bale rolls out
and stays on the field). Counter **"Bales: N"**. Bales go to the hay stack on the map.

### 3.7 The farm map (`index.html`, title "Farm")
- Like the Construction Site map: a farmyard seen from a little above, in lots. **Field** (a tractor and plow on
  brown furrows), **Combine** (a combine in golden wheat), **Milking** (a red barn with a silo, a cow at the door),
  **Eggs** (the hen house with hens in the run). Each lot is a big picture link; the station buttons in the panel
  repeat them with a picture and a short name (as the site map does). Only ready stations get a lot.
- **The farm's stores** (his collection, kept across visits): the **grain bin** next to the Combine lot fills up a
  step per full grain truck (a golden level visible through the bin's open top, no numbers; when full, a new bin
  appears beside it, up to three), the **egg stand** by the hen house shows his stacked cartons, the **milk truck**
  parked by the barn gets a little star sticker per trip on its door (up to a row of five, then it resets to a new
  row of five). After Hay: a **hay stack** of his bales.
- Animated life: the barn's weathervane rooster turns, a cow grazes, hens peck in the run, clouds drift.
- Tap a lot: it bounces and goes to the station. Ghost hand taps the Field lot.
- No safety ritual (see 3.11). No Surprise on the map (it is a map; same as the site map).

### 3.8 Layout per size (all pages use the App shell: header, stage, panel)
Header on every station: "‹ Farm" back (icon only on phones), Home icon, title, Big icon at the right edge.

| Size | Driving stations (Field, Combine, Hay) | Milking | Eggs |
| --- | --- | --- | --- |
| **390x844** | Stage about 370x560. Sky trimmed to about 60 px with the farm on the horizon; the four lanes fill the lower part, near lane above the bottom-center coach pill. Camera pans to follow the machine; machine plus implement about 60% of the stage width. Panel: Drive! row, one row of tiles (four implement tiles, or Inside), tab bar. | Cow on top half, udder mid-stage; unit hook left, jar right; bulk tank as a small window top-right. Panel: Milk!, tabs. | 2x2 nest boxes, carton and stack below. Panel: one row of two tiles, tabs. |
| **844x390** | Stage about 520x330 on the left, panel column on the right (Drive!, tiles 2x2, tabs). Sky a thin strip; lanes compressed; camera pans. | Cow across the top, unit left, jar and tank right. | One row of four boxes, carton on the right side of the floor. |
| **820x1180** | Stage about 800x800. Taller sky with the farm, bigger lanes; pans only if the lane is wider than the view. Panel under the stage, one row of tiles. | Roomy version of the phone layout; the milk room window is larger. | One row of four boxes, roost above, carton below. |
| **1180x820** | Stage about 730x700, panel column on the right; usually the whole lane visible with little panning. | Full parlor width: cow center, unit left, jar and bulk tank right. | One row of four boxes, carton and stack below. |
| **1024x1366** | As 820x1180, bigger. | As 820x1180. | As 820x1180. |

**Orientation preference**: none. Every page works both ways (the dad prefers upright on the iPhone).
Map: same layout logic as the construction map (lots in one row, one column or two rows, whichever is biggest).

### 3.9 Surprise (fun moments on the current scene, taking turns)
- **Field**: (1) a hare hops out of the hedge and across the lane in front of the tractor; the tractor waits with
  a toot, then carries on; (2) a cloud drifts over and rains on the field, puddles shine, a rainbow; (3) a flock of
  gulls swoops down and follows the tractor (behind any implement); (4) faces: the tractor's headlights become
  eyes and the grille smiles, the implement gets a little face too, for a few seconds (they look at his finger).
- **Combine**: (1) a deer bounds out of the wheat ahead and away, the combine waits; (2) a hawk circles and dives
  near the cut edge (they follow combines for mice), then flies off; (3) a little whirlwind of chaff spins across
  the stubble; (4) faces on the combine and the grain cart tractor; the cart tractor's driver waves.
- **Milking**: (1) the barn cat strolls in, sits by the pit and gets a squirt of milk, licks its lips; (2) the
  cow's calf pokes its head through the gate and moos; (3) the cow gives the window a big slow lick with her tongue.
- **Eggs**: (1) one egg wobbles, cracks and a chick hatches, peeps and runs under its mother (the egg is replaced
  by a fresh one in the nest); (2) the rooster struts in, flaps and crows (comb wiggling, "Cock-a-doodle-doo!"
  bubble), struts out; (3) all four hens do a flappy dance on their nests.
- Never randomizes choices, never unlocks anything.

### 3.10 Results that stay, collections, fresh start
- **Stay on screen until he moves on**: worked lanes, the golden field, the cut stubble, the full cart, cartons on
  the stack, the tank level. Toasts and coach lines at least 3 s.
- **Collections kept across visits** (`farm-store-v1`): grain bins, egg cartons on the stand, milk truck stars,
  hay stack (later). Shown on the map, and the carton stack on the Eggs shelf.
- **Fresh visit** (`Toybox.fresh()`): Field back to stubble with the Plow; Combine a fresh golden field, empty
  tank, empty cart; Milking a new first cow and an empty jar (bulk tank level is part of the scene and resets);
  Eggs: hens on full nests and an empty carton; all counters to 0. Inside off. Reloading or going map ↔ station
  keeps the state.

### 3.11 Timer ending and kind words
- **onEnding** (calm, within 15 s): Field and Combine: the implement lifts, the machine drives to the headland and
  parks, the exhaust stops puffing, the sky warms to evening. Milking: the current cow finishes (the take-off pulls
  the unit at once), she walks out, the gate closes, the lights dim. Eggs: the hens fluff up and close their eyes on
  their nests, the door to the run closes. Map: the sun sets behind the barn.
- **Rest**: restLine **"The farm is resting."**, restLine2 "The animals and machines will be right here next
  time." restArt: a red barn at dusk with a sleeping cow and a tractor parked beside it. Goodbye option "End with
  a "Goodnight, farm" button to press", farewellText "Time to say goodnight to the farm", farewellDone "Night
  night, farm!".
- **`Toybox.kind()`**: Field: when all four lanes are finished with an implement, and when the crop turns golden.
  Combine: when the grain truck leaves full, and when the field is all cut. Milking: when a cow is finished (it shows
  only sometimes anyway). Eggs: when a carton is full. Hay: when a bale rolls out.
- **Safety ritual**: none. A farm has no gear-up comparable to eye and ear protection that would be fun, and the
  dad toned rituals down. (If he wants one later: a farmer's cap and work gloves, `farm-gear`, same shared 10-minute
  rule.)

### 3.12 Sound (Web Audio only, soft, only when sound is on)
- **Tractor diesel**: a low sawtooth (about 55 Hz) through a lowpass at 300 Hz, amplitude chopped by a square LFO
  (about 9 Hz idling, 14 Hz driving) for the "putt-putt"; gain 0.05. **Horn**: two soft filtered square tones.
- **Soil** (plow, harrow): lowpassed brown noise that follows speed; discs add a soft metallic ring (two sine
  partials, very quiet). **Seeds**: tiny high ticks. **Spray**: highpassed white noise hiss, gentle.
- **Combine**: a slightly higher hum plus a rhythmic knife "chk" at low volume; **grain pour**: bandpassed noise
  with random sprinkle clicks; truck honk.
- **Milking**: the pulsator's soft "chk-shh" at 1 Hz (filtered noise bursts); milk splash in the jar (short
  bandpass noise); **moo**: a sawtooth sliding 190 → 140 Hz through two formant bandpass filters, 0.9 s, soft.
- **Hens**: clucks (short sine blips with a quick pitch drop), the egg song as a run of them; chick peeps (high
  sine chirps); egg into carton: a soft wooden tick; rooster crow (a gentle formant glide).
- Sound helpers live in `farm.js` so every page sounds the same.

### 3.13 Numbers
Nothing but the one counter per page: "Passes", "Loads", "Cows", "Eggs" (later "Bales"). Tank, hopper, jar and bin
levels are shown as drawn levels only. No sizes, speeds, depths, rates, counts of bottoms or nozzles, and no
numbered steps. The carton's twelve cups are a picture, not a number.

---

## 4. Engineering plan

### 4.1 Files and pages
```
farm/
  index.html          map (SVG), station lots, the stores
  field.html          tractor + plow / harrow / seed drill / sprayer
  combine.html        combine + grain cart + grain truck
  milking.html        milking parlor
  eggs.html           hen house
  hay.html            (after v1) mower / rake / round baler
  farm.js             shared: STATIONS, store API, lane-field engine, tractor drawing, drive input, sounds
  manifest.webmanifest, icons/icon-180.png, icon-192.png, icon-512.png, icon-maskable-512.png
```
- **Multi-page** because the stations are separate scenes with different mechanics, can be built in parallel by
  different agents (one page each), and it matches Construction Site / Workshop / Kitchen, which he already knows.
- **`farm.js`** (plain script, ES5, an IIFE exposing `window.Farm`; precedent: `workshop/projects.js`): the
  driving stations share 40% or more of their code (lanes, camera, drag-to-drive, headland turn, tractor drawing
  with the three-point hitch). One copy keeps them consistent. It contains: `Farm.STATIONS`, `Farm.store`
  (get/add for the collections), `Farm.lanes(opts)` (the engine below), `Farm.drawTractor(ctx, t)`,
  `Farm.sound` (the synth helpers, all calling `Toybox.sound.ready()`), `Farm.ghost` (the ghost hand snippet,
  pasted once here instead of in each page), the coach helper. Milking and Eggs use only the store, sound and
  ghost parts.

### 4.2 Rendering
- **Map**: SVG, built from strings like the construction map (static art, SMIL animations, crisp at any size).
- **All stations**: one `<canvas>` filling the stage, DPR capped at 2, redrawn each frame while anything moves
  (stop the loop when everything is still, as the other pages do). Canvas because of the particles, texture
  reveals, per-stalk wheat sway and the hose physics.
- **Lane textures**: each soil stage (stubble, plowed, harrowed, drilled, sprouts, green crop, golden wheat, cut
  stubble; for Hay: grass, swath, windrow, baled) is drawn once into a small offscreen canvas tile (at the current
  DPR and lane scale) and used as a `createPattern` fill. A lane is drawn as two rectangles: the "before" pattern
  from the far end to the work edge, the "after" pattern from the start to the work edge (clip to the lane
  quad). Rebuild the tiles on resize only.
- **Tall crops** (green crop, golden wheat, grass): drawn as columns of stalk sprites from a pre-rendered strip
  (three variants), in 32-unit chunks, each chunk with a small sway skew `ctx.transform(1,0,sin(t*0.9+i*0.7)*0.06,1,0,0)`.
  Cut chunks are skipped. About 60 chunks visible at most.
- **Machines**: drawn with canvas paths in the Toybox style (4 px #1D2340 outlines in world units, flat colors),
  side view. The tractor: a generic red body (no logos, no brand color combination), black lugged rear tires whose
  chevrons rotate with distance, cab with glass, exhaust stack, front weights, three-point hitch with lift arms.
  The combine: generic, a cream-and-grey body with red trim (no brand color scheme), a big glass cab;
  wheels, header with reel (bats rotate with distance), cutterbar teeth, feeder house, grain tank with
  extensions, folded unloading auger, ladder, beacon. Internals for "Inside" drawn in a separate function.
- **Milking**: canvas; the cow is a set of shapes (body, legs, head, tail, udder) with a few joint angles (head
  turn, tail swing, walk cycle). The long milk hose is a **verlet rope** (12 points) between the claw and the
  pipeline inlet, so it sags and follows the drag.
- **Eggs**: canvas; hens as shapes with a few states (sit, stand, peck, flap, sleep); eggs as ellipses with a
  highlight.

### 4.3 Simulation and animation
**Lane engine (`Farm.lanes`)**
```
state: lanes[4] = { before: stageId, after: stageId, edge: x }   // edge = how far the work has reached
       mach = { lane, x, dir (+1/-1), v, phase: "ready"|"work"|"turn"|"hitch"|"park" }
loop(dt):
  if phase == "work":
    target = held ? x + dir*1e6 : (finger in lane ? fingerX : x)
    want = clamp((target - x)*dir * 2.2, 0, VMAX)           // forward only
    v += (want - v) * min(1, dt*6)                           // ease, taps answer at once
    x += dir * v * dt
    workX = x - dir * implementOffset                        // where the tool touches the soil
    lane.edge = dir>0 ? max(lane.edge, workX) : min(lane.edge, workX)
    emit particles at workX proportional to v*dt
    if x passes lane end: phase = "turn"; start turn tween
  if phase == "turn": tween 2.5 s: hitch up 0.5 s, drive out + flip dir + move to next lane 1.5 s, hitch down 0.5 s
     -> lane++, if lane == 4: phase = "park", onFieldDone()
```
- Lanes alternate direction (left to right, then right to left), as real passes do.
- `implementOffset` and particle emitters come from the implement definition: `{ id, length, hitchY, draw(ctx,t),
  emit(workX, v), after: stageId, onLane(laneIdx) }`.
- **Hitching** (`phase "hitch"`): a scripted tween: lift, drive to parking x, drop, reverse to the new implement,
  links swing down, "clunk" shake (2 px, 0.2 s), lift, drive to lane 0 start.
- **Sprouts / growth**: a per-lane `grow` value 0..1 tweened after a drill pass (sprouts) and a spray pass
  (crop); the field-done golden turn tweens a hue blend between the green and golden crop tiles.
- **Particles**: one pooled array (cap 400 on phones, 700 on iPad): soil chunks (rotate, gravity, land and fade
  into the texture), dust (grow, fade), seeds (fall down tube path), spray (short-lived dots in a fan), straw bits,
  chaff, grain (stream), drops (rain).
- **Gulls**: 3 boids-lite birds: target = a point behind the plow; flap when far, hop when close.

**Combine**
- Tank `fill` 0..1 grows with cut distance (full after about 1.5 lanes). Heap drawn as a mound whose height
  follows `fill`. Full: `phase "needUnload"`; drive input stops at the uncut edge; `misses++`; at 2 auto-unload.
- Auger state: `angle` 0 (folded) → 1 (out) over 0.8 s; while out and `fill > 0`: `fill -= dt/5`, cart
  `heap += same`; the grain stream is a Bézier from spout to cart with particles along it.
- Grain cart: follows `x` of the combine with a lag (`cx += (combineX - cx) * dt*3`) on the nearer lane or track;
  when unloading ends, state machine: `toTruck → pour (4 s) → back`. Truck `heap` 0..3 carts; at 3: honk, drive off,
  `Farm.store.add("grain", 1)`, a new truck rolls in (6 s).
- Inside view flow: three looping particle channels along fixed internal paths (crop up the feeder, grain down to
  sieves then up the elevator, chaff out the back), speed scaled by `v` (they stop when he stops).

**Milking**
```
cowPhase: enter(4s) -> prep(1s, gloved hand) -> waitUnit -> attach(0.6s) -> milk(10s) -> takeoff(1s)
          -> postdip(0.8s) -> exit(3s) -> enter (next breed)
unit: { x, y, held, attached }, rope = verlet(12 pts) from claw to inlet; 4 iterations/frame
milk: flow(t) = smooth ramp up 1 s, plateau, ramp down last 2 s; pulse = (sin(2πt) > 0)
      jar += flow*dt*k; when jar > 0.8 -> drain to bulkTank over 1 s
bulkTank >= 1 -> truck sequence (back up, hose, pump 5 s, drive off), Farm.store.add("milk", 1)
```
**Eggs**
- Per nest: `{ breed, hasEgg, state: sit|stand|lay|feed|drink|dance, t }`. `lay` timer 8 s after an egg is taken.
- Dragged egg: follows finger; release within 120 px of the carton → fly to next empty cup (cubic ease 0.35 s).
- Carton: 12 slots; full → lid tween 0.6 s → slide to stack 0.8 s → `Farm.store.add("cartons", 1)` → new carton.

### 4.4 State and storage (every access in try/catch)
- `farm-field-v1`: `{ v:1, lanes:[{b,a,e}...], imp:"plow", lane:0, x, dir, passes, grown:0|1|2 }`
- `farm-combine-v1`: `{ v:1, lanes:[...], tank, cart, truck, lane, x, dir, loads, inside }`
- `farm-milking-v1`: `{ v:1, cows, cowIdx, bulk }` (a cow in the middle of milking restarts from "enter")
- `farm-eggs-v1`: `{ v:1, eggs, carton:[colors], nests:[{hasEgg}] }`
- `farm-store-v1` (the collection, **never cleared by fresh**): `{ v:1, grain, cartons:[colors...] (last 30),
  milk, bales }`.
- Each station: `if (Toybox.fresh()) remove its own key` before loading (as Garden does); the store is kept.
- Save on every finished pass, unload, cow, egg, and on `pagehide`. Unknown fields ignored; missing fields default.

### 4.5 Integration
- Every page: `Toybox.init({ app: "farm", big: { button: $("bigToggle") }, restLine, restLine2, restArt,
  farewellText, goodbyeLabel, farewellDone, soundNote: "Soft engine, moo and cluck sounds. Hold for 2 seconds.",
  onEnding, onWake, onRest })`. No `orientation`.
- Driving stations register `Toybox.offFirst({ running: () => mach.v > 0 || phase == "turn", off: stopNow })` so
  leaving mid-pass parks quietly.
- Settings: none. "Good to know" in `SETTINGS` needs no entry (no turning, no special sound).
- Ghost hand: `tools/snippets/ghost-hand.js` pasted once into `farm.js` (`Farm.ghost(plan)`), its CSS into each
  page's `<style>` (or `farm.js` injects it once); coach pill from `tools/snippets/coach-pill.css`.
- Add: `python3 tools/add-app.py farm "Farm" "Drive the tractor, harvest wheat, milk cows, collect eggs"
  "<README line>" field.html combine.html milking.html eggs.html farm.js`. Later pages are added to the top-level
  `sw.js` CORE by the coordinator. `add-app.py` appends the tile at the end; the coordinator may move it next to Construction Site.
- Icons: rendered from an SVG with Playwright at 180/192/512 and maskable 512 (subject in the central 80%).

### 4.6 Performance (60 fps on iPad, DPR cap 2)
- Lane textures and stalk strips pre-rendered on resize; per frame only pattern fills, sprite blits and machine
  paths (a few hundred path ops).
- Particle caps (above); dead particles recycled. Wheat chunks culled to the visible window.
- Verlet rope: 12 points × 4 iterations: trivial.
- The loop sleeps when nothing moves (no input, no tweens, no particles) and on the rest screen.
- `prefers-reduced-motion`: no sway, fewer particles, shorter tweens, no camera easing.

### 4.7 Test plan
- Serve with `npx http-server . -p <port> -c-1 -s`; block Google Fonts in Playwright.
- `node tools/smoke.js farm/ farm/field.html farm/combine.html farm/milking.html farm/eggs.html` at the five
  sizes (390x844, 844x390, 820x1180, 1180x820, 1024x1366), `MOBILE=1` for phones: no page errors, no page scroll.
- `node tools/buttons.js` on every page: every tile and tab changes the screen (Drive! on a parked tractor after a
  field is done must still answer: it shows the next-tile glow and the coach line).
- `node tools/fit.js`: "Seed drill", "Harrow", "Sprayer", "Milk!", "Unload!" fit at 390 and 844 widths.
- Real play, driven with Playwright and read through a `?debug` hook (`window.__farm` with lane edges, tank,
  counters):
  - Field: drag the tractor across all four lanes (pointer drags of 300 px steps); check `passes == 4`, all lanes
    "plowed"; tap Harrow, wait for the hitch, hold Drive! until done; repeat drill and sprayer; check the field is
    golden. Screenshots after each implement at the three main sizes; look at them.
  - Combine: drive until the tank is full; drag again twice → auto unload; tap the auger; check `loads`; finish the
    field; check the truck left and `farm-store-v1.grain` grew.
  - Milking: drag the claw from the hook to the udder; wait for take-off; check `cows == 1` and the next cow
    enters; press Milk! with the unit on the hook.
  - Eggs: tap each hen, drag eggs to the carton, fill a carton (12), check the stack and `farm-store-v1.cartons`.
  - Fresh start: set `sessionStorage["toybox-launch"]` to a new id and reload: counters 0, stores kept.
  - Timer: set a 1-minute timer in `toybox-timer-v1`, check the ending motion and the rest screen.

---

## 5. Phasing

| Phase | What | Effort | Agents |
| --- | --- | --- | --- |
| **v1a** | `farm.js` (lane engine, tractor, store, sound, ghost) + **Field** + the map with the Field lot | L | 1 |
| **v1b** (in parallel with v1a) | **Eggs** (S–M) and **Milking** (M), each its own page, using only store/sound/ghost from `farm.js` (stub until v1a lands) | M | 2 |
| **v1c** | **Combine** (after the lane engine is stable), map lots for all four, stores on the map | L | 1 |
| **v2** | **Hay** (mower, rake, round baler; reuses the engine), hay stack on the map | M | 1 |
| **v3** | **Feeding** (feed mixer wagon, a loader at the silage bunker, cows at the headlocks); corn as a second crop (row planter, corn head) if the dad wants it; egg candling as an Eggs tile; a bale spear to stack bales | M each | 1 each |

At most three agents at a time: v1a + two for v1b, then v1c.

---

## 6. Risks and how to reduce them

- **Machine drawings look crude or wrong** (the dad likes accuracy). Look up real side-view proportions first
  (tractor rear wheel about as tall as the cab roof's lower edge; combine header wider than the body; plow bottoms
  in an angled row); draw at large size, review screenshots before animating.
- **The oblique four-lane field gets cramped on a phone held sideways (330 px of stage height).** Lane scale
  floor; on very short stages show three lanes on screen and slide the field up as he moves to the far lanes.
- **Too slow / too long**: a full Field cycle is 4 implements × 4 passes ≈ 2.5 minutes. Pace check with the dad
  (question 3); the lane length is one constant.
- **Wheat sway and particles cost frames on older iPads**: pre-rendered chunks, culling, caps, sleep when idle.
- **Shared `farm.js` diverges or breaks one page when another changes it**: one owner (the v1a agent / the
  coordinator), a small documented API in its header, smoke-test every farm page after any change to it.
- **Milking might feel too close to a medical or private body scene** for some viewers: draw it like a picture
  book (simple udder shape, clean equipment, the real steps); show the dad screenshots before polishing.
- **Scope creep** ("almost all aspects"): v1 is four stations; everything else waits in section 5.

---

## 7. Open questions for the dad

1. **v1 stations**: Field, Combine, Milking and Eggs first, with Hay (the baler) right after. Or should Hay
   replace Eggs in v1?
2. **Crop**: wheat (golden heads, reel header, seed drill) as proposed, or corn (corn head with pointed snouts,
   row planter, yellow kernels)? Corn could be a second crop tile later.
3. **Pace**: four passes per job, four jobs to a golden field (about 2.5 minutes of driving). Fewer lanes, or does
   he like the long run?
4. **Carry-over**: should the Field's finished golden crop be what he harvests in the Combine (one shared field,
   so the order matters), or should every station always start ready to play, as proposed?
5. **Milking**: a farmer attaching the unit in a parlor (proposed), or a milking robot (the cow walks in, a robot
   arm finds the teats with a laser)? The robot is a great machine but takes the job out of his hands.
6. **Stores on the map** (grain bins, egg cartons, milk truck stars, hay stack): keep them across visits like the
   Kitchen table, as proposed, or clear them on a fresh visit?

---

## 8. Icon idea

A red tractor seen from the side, big and centered, pulling a moldboard plow (two bottoms visible) across a band of
dark brown furrows along the bottom, a small puff of smoke from the exhaust stack, on the flat #CDE9FF background.
Chunky #1D2340 outlines, black rear tire with bold chevron treads, a yellow wheel hub, a light blue cab window. No
barn (one clear subject). Maskable version: tractor and plow inside the central 80%, furrow band full-bleed.
