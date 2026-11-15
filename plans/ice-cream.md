# Ice Cream Shop: design notes

## 1. Summary

From the 2026-10-27 brainstorm ("an ice cream or sandwich shop with customers"). The dad, 2026-11-15: it is about
**making orders for people**, not about making ice cream from scratch. His answers that day:

- Something different from the order: **a gentle nudge**. Each part of the order gets a green tick in the bubble when
  it matches; the customer says what they still wanted, and always takes the ice cream happily. No buzzer.
- Menu for the first version: **scoops only** (cone or cup, one to three scoops, toppings).
- **No paying.**
- Customers: **mostly people, sometimes an animal** (bear, rabbit, cat, panda).

Folder `ice-cream/`: `index.html` + `index.js` (script with a "Sections" list), manifest, icons. No `sw.js`.
`Toybox.init({ app: "ice-cream" })`. Storage key `ice-cream-v1` (the customer at the counter, their order and the ice
cream so far, so a reload keeps them; a visit from the home screen starts with a new customer walking in).

## 2. The real thing, step by step (hands-on like the Farm stations)

Seen from behind the counter, where the server stands: the customer on the far side, the dipping cabinet with six tubs
(Vanilla, Chocolate, Strawberry, Mint chip, Mango, Bubblegum; a name card under each), and on the front counter the
dipper well with the scoop, the cone and cup stacks, the cone holder, the sprinkle shaker, the chocolate sauce bottle and
a bowl of cherries. A yellow ring and one instruction show the next part. No step row, no Go.

| Step | He does (drag) | Tap | Shown happening |
| --- | --- | --- | --- |
| Holder | Drags a cone or a cup from its stack to the holder | It flies into the holder | The cone stands in the steel stand; a cup stands on the mat |
| Scoop | Touches a tub: the scoop comes to his finger and digs while he holds it there; drags it to the cone and lets go | The scoop flies to the tub, digs and puts the ball on | The ball grows in the scoop; a dent in the tub; the ball lands with a squish |
| Toppings | Holds the shaker or the sauce bottle over the ice cream: it turns over and shakes or squeezes while held there; drags a cherry on top | That topping goes on once | Sprinkles fall, sauce runs down in drips, the cherry hops on |
| Serve | Drags the ice cream up to the customer | Tap the finished ice cream or the customer | The customer takes it, says thank you and walks off eating it |

- The order: a speech bubble with a picture of the ice cream and the words ("A cone with chocolate and mango, and
  sprinkles on top, please!"). Ticks: the holder and each scoop on the right, sauce and sprinkles on the left, the
  cherry by the cherry. Scoops match in any order.
- Different from the order: "A cup? I wanted a cone!" (while it is empty, the other one swaps in), "Mint chip? I
  wanted mango!", "Ooh, an extra scoop!", "Ooh, sprinkles too!". Three scoops at most ("That's plenty of scoops!").
  Handed over unfinished, the customer still says "Thank you! Yum!"; just right: "Yum! Just right. Thank you!",
  hearts, and sometimes `Toybox.kind()`.
- Orders grow: one plain scoop, then one scoop with a topping, then two scoops, then up to three scoops and two
  toppings. Cone or cup.
- Forgiving: a tub tapped with no holder says "Put a cone in the holder first."; the second time the holder fills
  itself with what the customer asked for. Tapping the customer repeats the order.
- New: this ice cream starts again (the customer stays). Surprise takes turns: sprinkles rain over the shop, a dog
  peeks over the counter, a bird lands on the window sill, the customer does a happy hop. No faces on objects.
- Upright, the scene keeps clear of the bottom strip where the coach line rests after his first touch, so it never
  covers the cone.
- No numbers on screen (the order's words may say "two scoops").

## 3. Open questions for the dad

- More on the menu: a soft-serve machine (lever, vanilla / chocolate / twist), sundaes in a dish, milkshakes?
- More flavors or toppings (whipped cream, more sauces)? Six tubs fit now; more would need smaller tubs or a second freezer.
- Should customers pay after all (coins into the till, no numbers)?
- Is the gentle nudge right, or should customers just be happy with anything?
- A sandwich shop later as its own counter (a job tab) with the same customers?
