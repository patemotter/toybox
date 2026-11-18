# Ice Cream Shop: design notes

## 1. Summary

From the 2026-10-27 brainstorm ("an ice cream or sandwich shop with customers"). The dad, 2026-11-15: it is about
**making orders for people**. His answers that day:

- Something different from the order: **a gentle nudge**. Each part of the order gets a green tick in the bubble when
  it matches; the customer says what they still wanted, and always takes it happily. No buzzer.
- **No paying.**
- Customers: **mostly people, sometimes an animal** (bear, rabbit, cat, panda).

The dad, 2026-11-17 (second version):

- Too much wasted space, especially on the iPad: the layout is now computed from the stage's shape and fills it.
- Instructions kept popping up and cluttering the screen even after many runs: a step's instruction now shows only
  until he has done that step twice (remembered across visits); after that the yellow ring alone shows it, and the
  idle ghost hand brings the words back if he is stuck.
- Add **milkshakes** (scoops into a steel cup, the milkshake mixer, pour into a glass, serve), **sundaes** (several
  scoops and toppings) and **making the ice cream** (he loves watching it made at home; never required, offered as an
  option).
- **One shop**, not job tabs: the ice cream maker sits on the counter and a tap zooms in on it.
- The machine at home is a **freezer-bowl churn** (the bowl is frozen beforehand; it turns on the base while the
  paddle held by the lid stays still).
- Who decides what is made: **the customer**, except that every few customers one has **no preference** and is happy
  with whatever he makes.
- **All four starts are always on the counter** in the same places (cones, cups, sundae dishes, steel milkshake cups),
  so he can make anything for anyone; the customer gently says what they wanted and takes it happily.

Folder `ice-cream/`: `index.html` + `index.js` (script with a "Sections" list), manifest, icons. No `sw.js`.
`Toybox.init({ app: "ice-cream" })`. Storage key `ice-cream-v1`: the customer at the counter and their order, what is
being made, the ice cream maker, the tubs he made and whether the view is zoomed in (a reload keeps them; a visit from
the home screen starts fresh), plus `known` (how often he has done each step, kept across visits).

## 2. The shop (hands-on like the Farm stations)

Seen from behind the counter: the customer on the far side, the dipping cabinet with six tubs (Vanilla, Chocolate,
Strawberry, Mint chip, Mango, Bubblegum), and on the counter the dipper well and scoop, the four stacks, the milk, the
ice cream maker, the holder, the spindle milkshake mixer, and the toppings: whipped cream, chocolate sauce, sprinkles,
cherries. Upright: cabinet across the stage, the counter below. Sideways: stacks down the left, cabinet, the middle
(well, milk, maker over the holder and mixer), toppings down the right.

| Order | He does | Shown happening |
| --- | --- | --- |
| Cone or cup | Start in the holder, scoop (one to three, stacked), toppings, hand it over | As before |
| Sundae | A tulip sundae dish in the holder, two or three scoops (side by side, one on top), two to four toppings | Scoops show through the glass; sauce runs, cream swirls, cherry on top |
| Milkshake | A steel cup in the holder, scoops, pour the milk, put the cup on the mixer, pour the milkshake into the glass, toppings | The mixer spins by itself while a glass slides onto the holder; a straw goes in when it is full |
| Anything you like | Any start and anything on it | The customer is happy with all of it |

Every step works by drag (pours while held over the target) and by one tap (plays that part once). Scoops match in
any order. Orders grow within each menu. The first customers order cones, then a sundae, someone with no preference,
then a milkshake; after that any of them, with a no-preference customer every few.

## 3. The ice cream maker (zoomed in)

A tap on the maker zooms in (title "Ice Cream Shop · Ice Cream Maker"; the header's Back button zooms out). The
freezer (glass door, the frozen bowl inside), the machine, the tub, the milk, cream and sugar, and six flavorings
(vanilla extract, cocoa, strawberries, mint with chocolate chips, mango, bubblegum flavoring).

1. Take the frozen bowl out of the freezer (drag it to the machine, or tap the freezer); the lid with the paddle goes on.
2. Switch on the machine (the bowl turns). Pouring while it is off says so; the second time it switches on for him.
3. Pour the milk, the cream, the sugar and a flavor in through the spout (any order).
4. Watch it churn: the mix rises and thickens, ripples become scraped curls.
5. Spoon the ice cream into the tub (the machine switches itself off and the lid lifts).
6. Carry the tub to the shop: the view zooms out and the tub slides into its place in the cabinet, heaped up with a
   little star; the next customers often ask for that flavor.

New in the shop starts what is being made; New in the maker puts the bowl back in the freezer.

## 4. Open questions for the dad

- More flavors or toppings (more sauces, nuts)? Six tubs fit now.
- Should customers pay after all (coins into the till, no numbers)?
- A sandwich shop later, with the same customers?
- The flavorings in the maker are guesses at what goes in at home (extract bottles, cocoa, fruit); swap any that
  don't match.
