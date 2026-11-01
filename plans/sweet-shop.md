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

| Step | Real action | He does | Shown happening |
| --- | --- | --- | --- |
| Flavor | Juice or flavoring into a saucepan | Drags a flavor bottle to the pot, or taps it | The bottle tips; the pot fills with that color |
| Gelatin | Gelatin and sugar into the pot | Tips the bowl (tap or drag) | Powder falls; the mix goes cloudy |
| Heat | Hot plate on | Turns the knob (tap or drag) | Blue flame, steam, bubbles |
| Stir | Whisk until dissolved | Drags round the pot, or taps for one stir (three stirs) | Cloudy turns clear and glossy; the knob turns off by itself |
| Fill | Candy dropper into a silicone mold | Taps a shape (or the dropper), or drags the dropper over the shapes | The dropper dips into the pot by itself; each shape fills with a wobble |
| Chill | Into the fridge to set | Taps the mold (or the fridge), or drags it there | The door opens, the mold goes in, frost, it comes back firm |
| Pop | Push the gummies out | Taps or drags the mold | The mold flips; the gummies bounce onto the tray |
| Coat | Toss in sour sugar, sugar or a little oil | Taps a bowl, or drags a gummy into one | The bowl shakes; the coating sticks |
| Jar | Into the candy jar | Taps the jar (all hop in), or taps or drags each gummy | The lid lifts; they drop in; the next batch starts |

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
