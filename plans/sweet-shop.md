# Sweet Shop: design notes

## 1. Summary

The dad asked (2026-11-01) for an app where he makes candy, flavors it and decorates it, starting with gummies
(worms, bears, fruits; different flavors; sour or not). It is its own app, **Sweet Shop**, so donuts or cookies
can join later as jobs (`Toybox.jobs` tabs) or as their own counters.

- Folder `sweet-shop/`: `index.html` + `index.js` (script with a "Sections" list), manifest, icons. No `sw.js`.
- `Toybox.init({ app: "sweet-shop" })`. Storage key `sweet-shop-v1`: `{ jar: [{ s, f, c }], batch: {...} }`.
- No getting-ready gate (the dad toned the rituals down; ask if he wants hand washing and an apron like the Kitchen).

## 2. The real thing, step by step (hands-on like the Farm stations)

A yellow ring and one instruction show the next part; other parts say their name when tapped. No step row, no Go.
**Every step is done by hand** (the dad, 2026-11-01: the first version was mostly pushing the yellow ring, and the
real actions were hard to do): a drag does the real thing for as long as he keeps doing it, and a tap on the same
part plays that part's whole motion once. Letting go in the right place finishes the job (a bottle over the pot
pours, the dropper over a shape fills it). A press held still and let go in place counts as that part's tap; while one
finger carries something, other fingers are ignored.

| Step | Real action | He does (drag) | Tap | Shown happening |
| --- | --- | --- | --- | --- |
| Flavor | Juice or flavoring into a saucepan | Carries a bottle over the pot: it tips and pours while he holds it there | The bottle pours | The pot fills with that color |
| Gelatin | Gelatin and sugar into the pot | Carries the bowl over the pot: it tips and the powder falls while he holds it | The bowl tips | The mix goes cloudy |
| Heat | Hot plate on | Turns the knob round (works at any time; the flame follows the knob) | On or off | Blue flame, steam, bubbles |
| Stir | Whisk until dissolved | The whisk follows his finger round the pot; it clears only while the pot is hot | One stir | A swirl; cloudy turns clear and glossy; the knob turns off by itself |
| Fill | Candy dropper into a silicone mold | Touches a shape: the dropper comes to his finger and the shape fills while he holds it there | That shape fills | The dropper dips into the pot by itself |
| Chill | Into the fridge to set | Drags the mold to the fridge (the door opens as it comes near) | The mold goes in | Frost; the mold comes back firm |
| Pop | Push the gummies out | Pushes the mold over: they all pop out | One gummy pops out | Each gummy jumps out with a boing |
| Coat | Toss in sour sugar, sugar or a little oil | Drags a gummy into a bowl (each gummy can have its own coating) | A bowl takes all the uncoated ones | The bowl shakes; the coating sticks |
| Jar | Into the candy jar | Drags a gummy to the jar | A gummy, or the jar for all | The lid lifts; they drop in; the next batch starts |

- Parts that aren't needed right now still answer: bottles and the bowl wiggle and say their name, the pot sloshes,
  the fridge door opens for a look, the empty mold wobbles, the knob turns.
- Gummies on the tray can be moved round it; every gummy jiggles when touched.

- Flavors (bottles with a fruit on the label, one color each): Cherry, Orange, Lemon, Lime, Blue raspberry, Grape,
  Strawberry.
- Molds (panel tiles): Bears (4), Worms (3), Fruits (strawberry, orange slice, cherries, apple). Picking another
  mold swaps it in while the mold is still empty; after filling has started, the next batch uses it.
- Coatings: Sour sugar (white crystals that glint), Sugar (fine frost), Shiny (a stronger gloss).
- Every gummy jiggles when touched (a spring squash), on the tray and in the big jar view.
- The candy jar (his collection, at most 48, oldest drops out) stays across visits; the batch starts fresh on a
  visit from the home screen and survives a reload. The Jar button (blue) or a tap on the jar shows it big.
- Surprise takes turns: everything bounces, a giant gummy bear hops across the counter, a gummy worm inches across.
  No faces on any gummy.
- No numbers or counters anywhere.

## 3. Open questions for the dad

- Mixing two flavors in one pot (a new color), or two-tone worms?
- Can he "taste" a gummy from the jar (a bite comes out of it)?
- More shapes (rings, sharks, dinosaurs)?
- A getting-ready screen (wash hands, apron) like the Kitchen?
- Is the batch the right length (nine short steps), or should something happen by itself?
- Should a second flavor poured into the pot mix into a new color? (For now only the first flavor pours on.)
