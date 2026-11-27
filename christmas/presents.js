(function () {
  "use strict";
  // Christmas · Presents: a wrapping table seen from where he stands. Someone comes in (a dog, a builder, a cat,
  // a girl who loves trains, a hamster, a baker, a pony, a farmer, a painter, an astronaut; one at a time, a calm
  // walk-in) and a thought bubble shows, in a picture and words, what they love. He picks a present, wraps it the
  // real way and gives it to them, then helps them open it. Every step is done with his hands on the scene: a drag
  // does the real motion for as long as he does it, and a tap on the same part plays that part's motion once.
  //   1. Pick a present from the toy shelf: drag it into the open box (tap: it hops in). Anything is fine; the
  //      present they were thinking of gets a green tick in the bubble and an extra-happy hop.
  //   2. Put the lid on the box (drag the lid onto it, or tap).
  //   3. Roll a wrapping paper over the box: four rolls (red with stars, green with trees, blue with snowflakes,
  //      stripes) lie on the table. Drag one over the box and the paper unrolls behind it, then folds round the
  //      box (tap a roll: it rolls over by itself).
  //   4. Put tape on the three folds: tap each fold, or pull a piece from the tape dispenser onto one.
  //   5. Put a ribbon and a bow on: four bows (gold, white, purple, pink); drag one onto the present, or tap it.
  //   6. Give the present: slide it across the table to them (or tap it).
  //   7. Pull the paper off: the paper tears exactly where his finger goes and the scraps flutter away and fade;
  //      a tap rips one big strip. The ribbon and bow come off at the first tear.
  //   8. Lift the lid: the present pops up and they play with it, delighted, then wave and take it home.
  // Then the next one walks in. Every present given becomes a little card on the garland along the top of the
  // wall (kept across visits, the last 12). A yellow ring and one instruction show the next part; everything else
  // still answers a touch (a wiggle and its name). Surprise takes turns: they dance (the dog chases its tail),
  // snow flurries past the window, or a toy train chugs along the table. New starts the present over.
  // Units: the scene is drawn in world units (TALL or WIDE, picked from the stage's shape) and scaled to fit the
  // stage; x to the right, y down.
  //
  // Sections:
  //   Setup and saved state
  //   Recipients, gifts, papers and bows
  //   Layout
  //   Tweens and particles
  //   The present
  //   Steps: pick and lid
  //   Steps: paper, tape and bow
  //   Steps: give, open and lift
  //   Play, goodbye and the next one
  //   Drawing helpers
  //   Drawing the gifts
  //   Drawing the box, paper and present
  //   Drawing the room, the tray and the cards
  //   Drawing the recipients and the bubbles
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Panel and surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const TAU = Math.PI * 2, INK = "#1D2340", LW = 2.4, FONT = '"Baloo 2", "Trebuchet MS", system-ui, sans-serif';
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "christmas-presents-v1";
  const CARDS_MAX = 12;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const fresh = Toybox.fresh();

  // =====================================================================================================
  // Recipients, gifts, papers and bows
  // =====================================================================================================
  // Real people and animals, named by what they are (never a family title, never a personal name).
  const RECIPS = [
    { id: "dog", kind: "dog", name: "the dog", tag: "Dog", wish: "ball" },
    { id: "builder", kind: "person", role: "builder", name: "the builder", tag: "Builder", wish: "digger", skin: "#C68B59", hair: "#3B2A20", shirt: "#3D6FD8" },
    { id: "cat", kind: "cat", name: "the cat", tag: "Cat", wish: "yarn" },
    { id: "girl", kind: "person", role: "girl", kid: true, name: "the girl", tag: "A girl who loves trains", wish: "train", skin: "#E8B48A", hair: "#7A4A2A", shirt: "#E8303F" },
    { id: "hamster", kind: "hamster", name: "the hamster", tag: "Hamster", wish: "wheel" },
    { id: "baker", kind: "person", role: "baker", name: "the baker", tag: "Baker", wish: "book", skin: "#F2C9A0", hair: "#C9853A", shirt: "#FFFFFF" },
    { id: "pony", kind: "pony", name: "the pony", tag: "Pony", wish: "carrots" },
    { id: "farmer", kind: "person", role: "farmer", name: "the farmer", tag: "Farmer", wish: "tractor", skin: "#8D5A3B", hair: "#2B1D14", shirt: "#E8494F" },
    { id: "painter", kind: "person", role: "painter", name: "the painter", tag: "Painter", wish: "paint", skin: "#6B4430", hair: "#1E1410", shirt: "#FFFFFF" },
    { id: "astronaut", kind: "person", role: "astronaut", name: "the astronaut", tag: "Astronaut", wish: "rocket", skin: "#F0C7A0", hair: "#5A3A22", shirt: "#F4F6FA" }
  ];
  const REC_BY = {};
  RECIPS.forEach((r) => { REC_BY[r.id] = r; });
  // The toy shelf: real gifts (no faces on any of them). play = how the gift is played with once it is opened.
  const GIFTS = [
    { id: "ball", name: "Ball", a: "A ball", play: "bounce" },
    { id: "bone", name: "Bone", a: "A bone", play: "wiggle" },
    { id: "yarn", name: "Yarn ball", a: "A yarn ball", play: "roll" },
    { id: "wheel", name: "Hamster wheel", a: "A hamster wheel", play: "spin" },
    { id: "carrots", name: "Carrots", a: "Carrots", play: "wiggle" },
    { id: "digger", name: "Toy digger", a: "A toy digger", play: "drive" },
    { id: "train", name: "Toy train", a: "A toy train", play: "drive" },
    { id: "tractor", name: "Toy tractor", a: "A toy tractor", play: "drive" },
    { id: "blocks", name: "Blocks", a: "Blocks", play: "bounce" },
    { id: "rocket", name: "Toy rocket", a: "A toy rocket", play: "fly" },
    { id: "book", name: "Book", a: "A book", play: "wiggle" },
    { id: "paint", name: "Paint set", a: "A paint set", play: "wiggle" }
  ];
  const GIFT_BY = {};
  GIFTS.forEach((g, i) => { GIFT_BY[g.id] = g; g.i = i; });
  const PAPERS = [
    { id: "stars", name: "Red with stars", bg: "#E8303F", fg: "#FFD23B" },
    { id: "trees", name: "Green with trees", bg: "#36B25E", fg: "#17703A" },
    { id: "snow", name: "Blue with snowflakes", bg: "#3B82E0", fg: "#FFFFFF" },
    { id: "stripes", name: "Stripes", bg: "#FFFFFF", fg: "#E8303F" }
  ];
  const PAPER_BY = {};
  PAPERS.forEach((p) => { PAPER_BY[p.id] = p; });
  const BOWS = [
    { id: "gold", name: "Gold bow", hex: "#FFC93C" },
    { id: "white", name: "White bow", hex: "#F7F8FC" },
    { id: "purple", name: "Purple bow", hex: "#9B5DE5" },
    { id: "pink", name: "Pink bow", hex: "#FF6FA8" }
  ];
  const BOW_BY = {};
  BOWS.forEach((b) => { BOW_BY[b.id] = b; });

  // The cards on the garland: [{ r: recipient id, g: gift id }], oldest first. Kept across visits.
  let cards = Array.isArray(saved.cards) ? saved.cards.filter((c) => c && REC_BY[c.r] && GIFT_BY[c.g]).slice(-CARDS_MAX) : [];

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Two layouts in world units: TALL (upright phones and tablets) and WIDE (sideways). back = the table's back
  // edge (people and the pony stand behind it; the dog, the cat and the hamster sit on it). wrap = where the box
  // is wrapped, give = where it is opened (next to them). The tray holds whatever the step needs (the toy shelf,
  // the lid, the paper rolls, the tape dispenser, the bows); unroll = the way a paper roll goes over the box.
  const TALL = {
    w: 400, h: 740, back: 290, rec: 96,
    bubble: { x: 178, y: 54, w: 214, h: 132 },
    win: { x: 12, y: 58, w: 116, h: 92 },
    garland: { x0: 6, x1: 394, y: 10 },
    wrap: { x: 238, y: 404 }, give: { x: 232, y: 336 }, box: [160, 96, 34, 16],
    tray: { x: 10, y: 484, w: 380, h: 250 }, shelf: { x: 10, y: 484, w: 380, h: 250, cols: 4 },
    unroll: "up", wreath: null
  };
  const WIDE = {
    w: 820, h: 440, back: 215, rec: 112,
    bubble: { x: 200, y: 46, w: 226, h: 140 },
    win: { x: 440, y: 52, w: 104, h: 104 },
    garland: { x0: 188, x1: 814, y: 8 },
    wrap: { x: 394, y: 334 }, give: { x: 278, y: 274 }, box: [150, 90, 32, 15],
    tray: { x: 540, y: 228, w: 272, h: 206 }, shelf: { x: 562, y: 96, w: 250, h: 338, cols: 3 },
    unroll: "left", wreath: { x: 700, y: 112 }
  };
  // The box: front face BW x BH, top face BD deep and BI narrower at the back (seen from a little above).
  let BW = 136, BH = 84, BD = 30, BI = 14;
  let L = TALL, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const was = L;
    L = W / H > 1.05 ? WIDE : TALL;
    [BW, BH, BD, BI] = L.box;
    vs = Math.min(W / L.w, H / L.h) * 0.98;
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) / 2;
    if (was !== L) placeAll();
  }
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  // The box's faces for a box whose front face is centered at (cx, cy).
  function geom(cx, cy, pad) {
    const p = pad || 0;
    return { cx, cy, x0: cx - BW / 2 - p, x1: cx + BW / 2 + p, yt: cy - BH / 2 - p, yb: cy + BH / 2, d: BD, i: BI };
  }
  const boxG = () => geom(V.box.x, V.box.y);
  // The tray's slots: the toy shelf (3 rows of 4), the paper rolls, the bows, the lid and the tape dispenser.
  function shelfSlot(i) {
    const T = L.shelf, n = T.cols, rows = Math.ceil(GIFTS.length / n), c = i % n, r = Math.floor(i / n), cw = T.w / n, rh = T.h / rows;
    return { x: T.x + cw * (c + 0.5), y: T.y + rh * (r + 0.56), s: Math.min(cw * 0.66, rh * 0.68) };
  }
  function rollSlot(i) {
    const T = L.tray;
    if (L.unroll === "up") return { x: T.x + T.w / 2, y: T.y + 34 + i * 56, len: 204, dia: 36 };
    return { x: T.x + 36 + i * 67, y: T.y + T.h / 2, len: 168, dia: 34 };
  }
  function bowSlot(i) {
    const T = L.tray;
    if (L.unroll === "up") return { x: T.x + T.w * (i + 0.5) / 4, y: T.y + T.h * 0.3 };
    return { x: T.x + T.w * (i % 2 ? 0.72 : 0.28), y: T.y + T.h * (i < 2 ? 0.28 : 0.72) };
  }
  const lidSlot = () => ({ x: L.tray.x + L.tray.w * 0.5, y: L.tray.y + L.tray.h * (L.unroll === "up" ? 0.3 : 0.42) });
  const dispSlot = () => ({ x: L.tray.x + L.tray.w * 0.5, y: L.tray.y + L.tray.h * (L.unroll === "up" ? 0.36 : 0.55) });
  const mouthPt = () => { const d = dispSlot(); return { x: d.x + 46, y: d.y - 26 }; };
  // Where the recipient stands (people and the pony behind the table) or sits (on the table).
  const onTable = (r) => r.kind === "dog" || r.kind === "cat" || r.kind === "hamster";
  const recBase = (r) => L.back + (onTable(r) ? 30 : 0);
  // The head (for the bubbles' tails and the ring).
  function headPt(r) {
    const x = V.rec.x, b = recBase(r) - V.rec.hop;
    if (r.kind === "person") return { x, y: b - (r.kid ? 98 : 112), r: r.kid ? 29 : 32 };
    if (r.kind === "dog") return { x, y: b - 100, r: 30 };
    if (r.kind === "cat") return { x, y: b - 92, r: 28 };
    if (r.kind === "hamster") return { x, y: b - 44, r: 36 };
    return { x: x + 4, y: b - 116, r: 34 };
  }
  // Where the seams (the three folds to tape) are on a present.
  function seams(g) {
    return [{ x: g.x0 + 17, y: g.cy + 4 }, { x: g.cx - 38, y: g.yt - g.d / 2 }, { x: g.x1 - 17, y: g.cy + 4 }];
  }

  // =====================================================================================================
  // Tweens and particles
  // =====================================================================================================
  let tweens = [];
  // A motion over dur seconds: step(p) with p from 0 to 1, then done().
  function tween(dur, step, done, delay) {
    const tw = { t0: now() + (delay || 0), dur: Math.max(0.01, dur), step, done };
    tweens.push(tw);
    return tw;
  }
  function runTweens(t) {
    const list = tweens.slice();
    for (const tw of list) {
      if (!tweens.includes(tw)) continue;
      const p = (t - tw.t0) / tw.dur;
      if (p < 0) continue;
      if (tw.step) tw.step(Math.min(1, p));
      if (p >= 1) { tweens.splice(tweens.indexOf(tw), 1); if (tw.done) tw.done(); }
    }
  }
  const later = (sec, fn) => tween(sec, null, fn);

  // Paper scraps flutter and fade within about 1.2 s (capped), sparkles pop, steam puffs from the toy train.
  let parts = [];
  function puff(kind, x, y, n, color, color2) {
    if (reduce) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 70) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 4, rot: Math.random() * TAU, vr: 0, color: color || "#FFFFFF", c2: color2 || null };
      if (kind === "scrap") { p.vx = (Math.random() - 0.5) * 120; p.vy = -60 - sp * 90; p.life = 1.0 + sp * 0.25; p.size = 7 + sp * 7; p.vr = (Math.random() - 0.5) * 10; }
      else if (kind === "spark") { p.vx = Math.cos(a) * (40 + sp * 80); p.vy = Math.sin(a) * (40 + sp * 80); p.life = 0.7; p.size = 5 + sp * 4; p.color = color || "#FFE36B"; }
      else if (kind === "steam") { p.vx = (Math.random() - 0.5) * 10; p.vy = -24 - sp * 14; p.life = 1.1; p.size = 6 + sp * 5; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "scrap") { p.vy += 160 * dt; p.vx *= Math.exp(-dt * 1.5); p.x += Math.sin(p.t * 9 + p.rot) * 40 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // The present
  // =====================================================================================================
  // Steps in order: pick, lid, paper, tape, bow, give, open, lift, play, out. A walk-in happens during pick.
  const STEPS = ["pick", "lid", "paper", "tape", "bow", "give", "open", "lift", "play", "out"];
  const COLS = 8, ROWS = 7, TOP_ROWS = 2;   // the paper's tear grid: 2 rows on the top face, 5 on the front
  let who = 0;
  function newBuild() { return { step: "pick", gift: null, paper: null, tapes: [0, 0, 0], bow: null }; }
  let B = newBuild();
  const sb = !fresh && saved.b && typeof saved.b === "object" ? saved.b : null;
  if (!fresh && Number.isInteger(saved.who) && saved.who >= 0 && saved.who < RECIPS.length) who = saved.who;
  if (sb && STEPS.includes(sb.step)) {
    if (sb.step === "play" || sb.step === "out") who = (who + 1) % RECIPS.length;
    else {
      B.step = sb.step;
      if (GIFT_BY[sb.gift]) B.gift = sb.gift;
      if (PAPER_BY[sb.paper]) B.paper = sb.paper;
      if (Array.isArray(sb.tapes) && sb.tapes.length === 3) B.tapes = sb.tapes.map((v) => (v ? 1 : 0));
      if (BOW_BY[sb.bow]) B.bow = sb.bow;
      // A build that does not hang together starts over.
      const at = STEPS.indexOf(B.step);
      if ((at >= 1 && !B.gift) || (at >= 3 && !B.paper) || (at >= 5 && !B.bow)) B = newBuild();
      if (B.step === "bow" && B.tapes.some((v) => !v)) B.tapes = [1, 1, 1];
    }
  }
  const R = () => RECIPS[who];
  const at = (step) => STEPS.indexOf(B.step) >= STEPS.indexOf(step);
  const matched = () => B.gift && B.gift === R().wish;

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({ cards, who, b: { step: B.step, gift: B.gift, paper: B.paper, tapes: B.tapes, bow: B.bow } }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }

  // What is on screen, rebuilt from the build (placeAll) when the page loads, a build starts or the layout changes.
  let busy = false, drag = null;
  const V = {
    rec: { x: 0, walk: false, hop: 0, vy: 0, happy: 0, cheer: 0, wave: 0, dance: 0, wob: 0, reach: 0, face: 1 },
    box: { x: 0, y: 0 }, boxWob: 0, boxAlpha: 1, giftIn: false, lidOn: false, lidPose: null, lidOff: null,
    carry: null, roll: null, rollBack: null, fold: 0, wrapped: false, tapeFly: [], tapeCarry: null, tapePend: [0, 0, 0],
    ribbon: 0, bowPose: null, bowOn: false, bowOff: 0, torn: new Uint8Array(COLS * ROWS), tearing: false,
    gp: null, bubPop: 0, tickPop: 0, say: "", sayPop: 0,
    tray: { kind: "shelf", target: "shelf", off: 0 }, swob: GIFTS.map(() => 0), rwob: [0, 0, 0, 0], bwob: [0, 0, 0, 0], dwob: 0, lwob: 0,
    cardNew: -1, cardWob: [], winWob: 0
  };
  function trayFor(step) {
    return { pick: "shelf", lid: "lid", paper: "rolls", tape: "tape", bow: "bows" }[step] || "";
  }
  function placeAll() {
    const st = B.step, r = R();
    V.rec.x = L.rec; V.rec.walk = false; V.rec.hop = 0; V.rec.vy = 0; V.rec.reach = at("open") ? 1 : 0;
    const there = at("open");
    V.box = { x: there ? L.give.x : L.wrap.x, y: there ? L.give.y : L.wrap.y };
    V.boxAlpha = 1; V.boxWob = 0;
    V.giftIn = !!B.gift && !at("play");
    V.lidOn = at("paper") && st !== "play" && st !== "out";
    V.lidPose = null; V.lidOff = null; V.carry = null; V.roll = null; V.rollBack = null;
    V.wrapped = !!B.paper; V.fold = B.paper ? 1 : 0;
    V.tapeFly = []; V.tapeCarry = null; V.tapePend = [0, 0, 0];
    V.ribbon = B.bow ? 1 : 0; V.bowOn = !!B.bow; V.bowOff = 0; V.bowPose = null;
    V.torn = new Uint8Array(COLS * ROWS);
    if (st === "lift") { V.torn.fill(1); V.bowOff = 1; }
    V.gp = null; V.say = "";
    V.bubPop = 1; V.tickPop = matched() ? 1 : 0;
    const k = trayFor(st);
    V.tray = { kind: k, target: k, off: 0 };
    void r;
  }
  function advance(step) {
    B.step = step;
    lastWant = "";
    ghost.poke();
    saveSoon();
  }
  // A new present for the one at the table; walk = they walk in first (the next one).
  function newBuildFor(walk) {
    tweens = []; busy = false; drag = null; press.cancel();
    B = newBuild();
    placeAll();
    if (walk) {
      V.tray.kind = ""; V.tray.off = 1;
      V.rec.x = -150; V.rec.walk = true; V.bubPop = 0;
      tween(2.4, (p) => { V.rec.x = lerp(-150, L.rec, ease(p)); }, () => {
        V.rec.walk = false; V.rec.hop = 0;
        tween(0.4, (p) => { V.bubPop = ease(p); });
        lastWant = "";
      });
    }
    lastWant = "";
    ghost.again();
    saveSoon();
  }
  // A gentle "this is me": the part wiggles and says its name.
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  function hopRec(power) { if (V.rec.hop <= 0.5) V.rec.vy = power || 260; }

  // =====================================================================================================
  // Steps: pick and lid
  // =====================================================================================================
  // The gift lands inside the open box (its top peeks out above the front).
  const inBoxPt = () => { const g = boxG(); GIFT_IN_S = BW * 0.45; return { x: g.cx, y: g.yt - 8 }; };
  let GIFT_IN_S = 64;
  function pickGift(id, from) {
    if (busy || B.step !== "pick" || !GIFT_BY[id]) return;
    busy = true;
    const sl = shelfSlot(GIFT_BY[id].i), f = from || { x: sl.x, y: sl.y }, s0 = from ? from.s || sl.s : sl.s;
    const to = inBoxPt();
    V.carry = { id, x: f.x, y: f.y, s: s0, held: false };
    const c = V.carry;
    tween(from ? 0.4 : 0.65, (p) => {
      const e = ease(p);
      c.x = lerp(f.x, to.x, e); c.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 30 : 90); c.s = lerp(s0, GIFT_IN_S, e);
    }, () => {
      V.carry = null; B.gift = id; V.giftIn = true; V.boxWob = 1; busy = false;
      const g = boxG();
      puff("spark", g.cx, g.yt - 20, 6);
      // A match gets a green tick and an extra-happy hop; anything else is welcomed with a happy bounce.
      if (matched()) {
        tween(0.4, (p) => { V.tickPop = ease(p); });
        hopRec(320); later(0.6, () => hopRec(260)); V.rec.happy = now() + 2.5;
        const b = L.bubble; puff("spark", b.x + b.w / 2, b.y + 50, 8);
      } else { hopRec(200); V.rec.happy = now() + 1.8; }
      advance("lid");
    });
  }
  function lidOn(from) {
    if (busy || B.step !== "lid") return;
    busy = true;
    const s = lidSlot(), f = from || { x: s.x, y: s.y }, g = boxG(), to = { x: g.cx, y: g.yt + 5 };
    V.lidPose = { x: f.x, y: f.y };
    const lp = V.lidPose;
    tween(from ? 0.35 : 0.6, (p) => { const e = ease(p); lp.x = lerp(f.x, to.x, e); lp.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 20 : 60); }, () => {
      V.lidPose = null; V.lidOn = true; V.boxWob = 0.8; busy = false;
      advance("paper");
    });
  }

  // =====================================================================================================
  // Steps: paper, tape and bow
  // =====================================================================================================
  // A roll goes over the box along L.unroll: the paper lies from the start line (just past the box's near edge)
  // to the roll. prog 0..1 = how far over the box it is; at 1 the box is covered and the paper folds round it.
  function rollLine() {
    const g = boxG();
    if (L.unroll === "up") return { start: g.yb + 10, end: g.yt - g.d - 10, perp: g.cx, span: BW + 18 };
    return { start: g.x1 + 10, end: g.x0 - 10, perp: (g.yt - g.d + g.yb) / 2, span: BH + BD + 18 };
  }
  const along = (p) => (L.unroll === "up" ? p.y : p.x);
  function rollProg(r) {
    const ln = rollLine();
    return clamp((ln.start - along(r)) / (ln.start - ln.end), 0, 1);
  }
  // Each frame while he holds a roll: once it is past the start line it lines up with the box and unrolls.
  function stepRoll(dt) {
    const r = V.roll;
    if (!r || !r.held) return;
    const ln = rollLine(), pr = rollProg(r);
    if (pr > 0) {
      const k = Math.min(1, dt * 12);
      if (L.unroll === "up") r.x += (ln.perp - r.x) * k; else r.y += (ln.perp - r.y) * k;
    }
    r.prog = Math.max(r.prog || 0, pr);
    if (r.prog >= 1) { drag = null; r.held = false; wrapDone(r.i); }
  }
  // A tap on a roll (or a roll let go part way): it lines up with the box and rolls over it by itself.
  function rollAuto(i, from) {
    if (busy || B.step !== "paper") return;
    busy = true;
    const sl = rollSlot(i), ln = rollLine(), f = from || { x: sl.x, y: sl.y };
    V.roll = { i, x: f.x, y: f.y, held: false, prog: from ? rollProg(from) : 0 };
    const r = V.roll;
    const st = L.unroll === "up" ? { x: ln.perp, y: Math.max(ln.start, Math.min(f.y, ln.start)) } : { x: Math.max(ln.start, Math.min(f.x, ln.start)), y: ln.perp };
    const go = () => {
      const a0 = along(r);
      tween(1.2 * (1 - r.prog) + 0.2, (p) => {
        const v = lerp(a0, ln.end, ease(p));
        if (L.unroll === "up") r.y = v; else r.x = v;
        r.prog = Math.max(r.prog, rollProg(r));
      }, () => { busy = false; wrapDone(i); });
    };
    if (r.prog > 0) { if (L.unroll === "up") r.x = ln.perp; else r.y = ln.perp; go(); }
    else {
      const p0 = { x: r.x, y: r.y };
      tween(0.4, (p) => { r.x = lerp(p0.x, st.x, ease(p)); r.y = lerp(p0.y, st.y, ease(p)); }, go);
    }
  }
  function wrapDone(i) {
    if (B.step !== "paper") return;
    B.paper = PAPERS[i].id;
    V.wrapped = true; V.fold = 0;
    const r = V.roll;
    if (r) { V.rollBack = { i, x: r.x, y: r.y, a: 1 }; V.roll = null; }
    busy = true;
    const rb = V.rollBack, sl = rollSlot(i), p0 = rb ? { x: rb.x, y: rb.y } : sl;
    tween(0.7, (p) => {
      V.fold = ease(p);
      if (rb) { rb.x = lerp(p0.x, sl.x, ease(p)); rb.y = lerp(p0.y, sl.y, ease(p)); }
    }, () => { V.rollBack = null; busy = false; V.boxWob = 0.6; advance("tape"); });
  }
  function rollBackTo(i, from) {
    const sl = rollSlot(i), p0 = { x: from.x, y: from.y };
    V.roll = null;
    V.rollBack = { i, x: p0.x, y: p0.y };
    const rb = V.rollBack;
    tween(0.35, (p) => { rb.x = lerp(p0.x, sl.x, ease(p)); rb.y = lerp(p0.y, sl.y, ease(p)); }, () => { if (V.rollBack === rb) V.rollBack = null; });
  }
  const nextSeam = () => B.tapes.findIndex((v, k) => !v && !V.tapePend[k]);
  // A piece of tape flies from the dispenser (or from his finger) onto a fold and sticks.
  function tapeSeam(k, from) {
    if (B.step !== "tape" || k < 0 || B.tapes[k] || V.tapePend[k]) return;
    V.tapePend[k] = 1;
    V.dwob = 1;
    const f = from || mouthPt(), to = seams(boxG())[k];
    const fl = { k, x: f.x, y: f.y, a: 0.6 };
    V.tapeFly.push(fl);
    tween(from ? 0.2 : 0.4, (p) => { const e = ease(p); fl.x = lerp(f.x, to.x, e); fl.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 6 : 40); fl.a = lerp(0.6, 0, e); }, () => {
      V.tapeFly.splice(V.tapeFly.indexOf(fl), 1);
      B.tapes[k] = 1; V.tapePend[k] = 0; V.boxWob = 0.35;
      puff("spark", to.x, to.y, 3, "#FFFFFF");
      saveSoon();
      if (B.tapes.every(Boolean)) { busy = true; later(0.35, () => { busy = false; advance("bow"); }); }
      else lastWant = "";
    });
  }
  // The ribbon goes round the present, then the bow flies on top.
  function bowOn(i, from) {
    if (busy || B.step !== "bow") return;
    busy = true;
    B.bow = BOWS[i].id;
    V.bwob[i] = 0;
    const sl = bowSlot(i), f = from || sl, g = boxG(), to = { x: g.cx, y: g.yt - g.d / 2 - 2 };
    V.bowPose = { i, x: f.x, y: f.y, s: 1 };
    const bp = V.bowPose;
    tween(0.7, (p) => { V.ribbon = ease(p); });
    tween(0.55, (p) => { const e = ease(p); bp.x = lerp(f.x, to.x, e); bp.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * 50; }, () => {
      V.bowPose = null; V.bowOn = true; V.boxWob = 0.8; busy = false;
      puff("spark", to.x, to.y, 8, BOWS[i].hex);
      advance("give");
    }, from ? 0.1 : 0.25);
  }

  // =====================================================================================================
  // Steps: give, open and lift
  // =====================================================================================================
  function giveIt(from) {
    if (busy || B.step !== "give") return;
    busy = true;
    const f = from || { x: V.box.x, y: V.box.y }, to = L.give;
    tween(0.4, (p) => { V.rec.reach = Math.max(V.rec.reach, ease(p)); });
    tween(from ? 0.45 : 0.85, (p) => { const e = ease(p); V.box.x = lerp(f.x, to.x, e); V.box.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * 12; }, () => {
      busy = false; V.boxWob = 0.6; hopRec(240); V.rec.happy = now() + 1.5;
      advance("open");
    });
  }
  // The tear grid's corner (i, j): rows 0..2 on the top face, rows 2..7 on the front. Inner corners are nudged a
  // little (always the same way), so the torn edges are ragged.
  function gridPt(g, i, j) {
    const u = i / COLS;
    let x, y;
    if (j <= TOP_ROWS) {
      const v = j / TOP_ROWS, xl = lerp(g.x0 + g.i, g.x0, v), xr = lerp(g.x1 - g.i, g.x1, v);
      x = lerp(xl, xr, u); y = g.yt - g.d + v * g.d;
    } else {
      const v = (j - TOP_ROWS) / (ROWS - TOP_ROWS);
      x = lerp(g.x0, g.x1, u); y = lerp(g.yt, g.yb, v);
    }
    if (i > 0 && i < COLS && j > 0 && j < ROWS && j !== TOP_ROWS) { x += (hash(i, j) - 0.5) * 7; y += (hash(j, i + 9) - 0.5) * 6; }
    return { x, y };
  }
  const covered = () => V.torn.reduce((n, v) => n + (v ? 0 : 1), 0);
  function tearCell(c, r) {
    const k = r * COLS + c;
    if (V.torn[k]) return false;
    V.torn[k] = 1;
    const g = paperG(), a = gridPt(g, c, r), b = gridPt(g, c + 1, r + 1), P = PAPER_BY[B.paper];
    if (Math.random() < 0.8) puff("scrap", (a.x + b.x) / 2, (a.y + b.y) / 2, 1, P.bg, P.fg);
    return true;
  }
  function firstTear() {
    if (V.bowOff > 0 || !V.bowOn) return;
    tween(0.6, (p) => { V.bowOff = ease(p); });
  }
  // Tears the paper under his finger (world point), all along the way from the last point.
  function tearAt(x, y) {
    if (B.step !== "open") return;
    const g = paperG(), rad = 19;
    let any = false;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (V.torn[r * COLS + c]) continue;
      const a = gridPt(g, c, r), b = gridPt(g, c + 1, r + 1), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (Math.hypot(mx - x, my - y) < rad) { tearCell(c, r); any = true; }
    }
    if (any) { firstTear(); V.boxWob = Math.max(V.boxWob, 0.15); checkOpen(); }
  }
  function tearLine(a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
    for (let k = 1; k <= n; k++) tearAt(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n));
  }
  // A tap rips one big strip, top to bottom, two columns wide (the nearest columns that still have paper).
  function ripStrip(x) {
    if (B.step !== "open") return;
    const g = paperG();
    let c = clamp(Math.floor((x - g.x0) / ((g.x1 - g.x0) / COLS)), 0, COLS - 1);
    const has = (cc) => { for (let r = 0; r < ROWS; r++) if (!V.torn[r * COLS + cc]) return true; return false; };
    if (!has(c) && !(c + 1 < COLS && has(c + 1))) {
      let best = -1, bd = 99;
      for (let cc = 0; cc < COLS; cc++) if (has(cc) && Math.abs(cc - c) < bd) { bd = Math.abs(cc - c); best = cc; }
      if (best < 0) return;
      c = best;
    }
    const c2 = c + 1 < COLS ? c + 1 : c - 1;
    firstTear();
    V.boxWob = 0.4;
    for (let r = 0; r < ROWS; r++) later(r * 0.045, () => { if (B.step === "open") { tearCell(c, r); tearCell(c2, r); checkOpen(); } });
  }
  // Nearly all the paper is off: the last bits fall away and the lid is next.
  function checkOpen() {
    if (B.step !== "open" || covered() > 7) return;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) tearCell(c, r);
    if (V.bowOff < 1) tween(0.3, (p) => { V.bowOff = Math.max(V.bowOff, p); });
    advance("lift");
  }
  // The lid comes off and the gift pops up; then the box clears away and they play with the gift.
  function liftLid(from) {
    if (busy || B.step !== "lift") return;
    busy = true;
    const g = boxG(), on = { x: g.cx, y: g.yt + 5 }, f = from || on;
    const up = { x: f.x + 10, y: Math.min(f.y, on.y) - 50 }, land = { x: L.wrap.x + 46, y: L.wrap.y + 72 };
    V.lidOn = false;
    V.lidOff = { x: f.x, y: f.y, ang: 0, a: 1 };
    const lo = V.lidOff;
    tween(0.3, (p) => { const e = ease(p); lo.x = lerp(f.x, up.x, e); lo.y = lerp(f.y, up.y, e); lo.ang = 0.15 * e; }, () => {
      tween(0.5, (p) => { const e = ease(p); lo.x = lerp(up.x, land.x, e); lo.y = lerp(up.y, land.y, e) - Math.sin(p * Math.PI) * 30; lo.ang = lerp(0.15, 0, e); });
    });
    // The gift pops up out of the box.
    const s0 = inBoxPt();
    later(0.25, () => {
      V.giftIn = false;
      V.gp = { x: s0.x, y: s0.y, s: GIFT_IN_S, rot: 0 };
      const gp = V.gp;
      puff("spark", s0.x, s0.y - 30, 10);
      tween(0.55, (p) => { const e = ease(p); gp.y = lerp(s0.y, s0.y - 86, e); gp.s = lerp(GIFT_IN_S, 92, e); gp.rot = Math.sin(p * Math.PI) * 0.25; }, () => {
        tween(0.6, (p) => { V.boxAlpha = 1 - ease(p); if (V.lidOff) V.lidOff.a = 1 - ease(p); }, () => { V.lidOff = null; });
        const y0 = gp.y, y1 = L.give.y + 6;
        tween(0.6, (p) => { gp.y = lerp(y0, y1, ease(p)); }, () => { busy = false; startPlay(); }, 0.3);
      });
    });
  }

  // =====================================================================================================
  // Play, goodbye and the next one
  // =====================================================================================================
  let playT0 = 0;
  function startPlay() {
    advance("play");
    playT0 = now();
    V.rec.cheer = now() + 2.6; V.rec.happy = now() + 6;
    hopRec(matched() ? 340 : 280);
    if (matched()) later(0.7, () => hopRec(280));
    V.say = GIFT_BY[B.gift].a + "!";
    V.sayPop = 0;
    tween(0.35, (p) => { V.sayPop = ease(p); });
    const gp = V.gp;
    puff("spark", gp.x, gp.y - 30, 12);
    // The present goes on the garland as a card.
    cards.push({ r: R().id, g: B.gift });
    if (cards.length > CARDS_MAX) cards = cards.slice(-CARDS_MAX);
    V.cardNew = cards.length - 1; cardDrop = 0;
    save();
    Toybox.kind();
    later(reduce ? 6 : 5.5, goOut);
  }
  // They wave, then walk out with the gift; the next one walks in.
  function goOut() {
    if (B.step !== "play") return;
    advance("out");
    busy = true;
    V.rec.wave = now() + 1.2;
    V.sayPop = 1;
    later(1.0, () => {
      V.rec.walk = true;
      const x0 = V.rec.x, gp = V.gp, gx0 = gp ? gp.x : 0;
      tween(0.3, (p) => { V.sayPop = 1 - p; V.bubPop = 1 - p; });
      tween(2.2, (p) => {
        const e = ease(p);
        V.rec.x = lerp(x0, -170, e);
        if (gp) { gp.x = lerp(gx0, -170 + 70, e); gp.y = L.give.y + 6 - Math.abs(Math.sin(p * Math.PI * 5)) * 14; }
      }, () => {
        busy = false;
        who = (who + 1) % RECIPS.length;
        newBuildFor(true);
      });
    });
  }

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fs(fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(); }
  function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function circle(x, y, r, fill, lw) { ell(x, y, r, r); fs(fill, lw); }
  function poly(pts) { ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  function line(x0, y0, x1, y1, color, w) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = color || INK; ctx.lineWidth = w || LW; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt"; }
  // A thick outlined stroke (arms, handles): ink first, then the color inside it.
  function limb(pts, color, w) {
    ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = w + 4.4; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    ctx.lineCap = "butt";
  }
  function text(s, x, y, size, color, weight, align) {
    ctx.font = (weight || 800) + " " + size + "px " + FONT;
    ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = color || INK; ctx.fillText(s, x, y);
  }
  const rgbOf = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  function shade(h, t) {
    const c = rgbOf(h), to = t > 0 ? 255 : 0, k = Math.abs(t);
    return "rgb(" + c.map((v) => Math.round(v + (to - v) * k)).join(",") + ")";
  }
  const rgba = (h, a) => "rgba(" + rgbOf(h).join(",") + "," + a + ")";
  function star(x, y, r, fill, lw) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
    if (lw) fs(fill, lw); else { ctx.fillStyle = fill; ctx.fill(); }
  }
  function tick(x, y, r) {
    circle(x, y, r, "#3CC46B", 2);
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.4);
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = Math.max(2, r * 0.32); ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
  }
  // Squash-and-stretch about (x, y) for a wobble k (0..1).
  function wob(x, y, k, t, fn) {
    if (k <= 0.001) { fn(); return; }
    const a = Math.sin(t * 22) * k * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + a, 1 - a); ctx.translate(-x, -y); fn(); ctx.restore();
  }

  // =====================================================================================================
  // Drawing the gifts
  // =====================================================================================================
  // Each gift is drawn centered on (x, y), about s across. o: { t, spin, wheels, flame }.
  function drawGift(id, x, y, s, o) {
    o = o || {};
    const k = s / 60, t = o.t || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const lw = LW / Math.max(0.6, k) * 1.0;
    const F = (c) => fs(c, lw);
    switch (id) {
      case "ball": {
        ell(0, 0, 24, 24); F("#E8303F");
        ctx.save(); ell(0, 0, 24, 24); ctx.clip();
        ctx.fillStyle = "#FFD23B"; ctx.beginPath(); ctx.ellipse(0, 0, 34, 8, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2F8CFF"; ctx.beginPath(); ctx.ellipse(0, 0, 8, 34, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
        ell(0, 0, 24, 24); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        ell(-8, -9, 5, 3, -0.6); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fill();
        break;
      }
      case "bone": {
        ctx.save(); ctx.rotate(-0.35);
        rr(-18, -7, 36, 14, 5); F("#FFF4DE");
        [[-20, -7], [-20, 7], [20, -7], [20, 7]].forEach(([a, b]) => { ell(a, b, 9, 9); F("#FFF4DE"); });
        rr(-17, -6, 34, 12, 4); ctx.fillStyle = "#FFF4DE"; ctx.fill();
        ctx.restore();
        break;
      }
      case "yarn": {
        ctx.beginPath(); ctx.moveTo(14, 16); ctx.quadraticCurveTo(30, 24, 26, 10); ctx.strokeStyle = "#E0428A"; ctx.lineWidth = 3; ctx.stroke();
        ell(0, 0, 22, 22); F("#FF6FA8");
        ctx.save(); ell(0, 0, 22, 22); ctx.clip();
        ctx.strokeStyle = "#D93D7E"; ctx.lineWidth = 2.4;
        for (let n = -2; n <= 2; n++) { ctx.beginPath(); ctx.ellipse(n * 7, 0, 7, 26, 0.6, 0, TAU); ctx.stroke(); }
        for (let n = -1; n <= 1; n++) { ctx.beginPath(); ctx.ellipse(0, n * 9, 26, 6, -0.3, 0, Math.PI); ctx.stroke(); }
        ctx.restore();
        ell(0, 0, 22, 22); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        break;
      }
      case "wheel": {
        poly([[-16, 26], [-4, 0], [4, 0], [16, 26]]); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        rr(-22, 22, 44, 8, 3); F("#8E9AAF");
        ell(0, -2, 24, 24); F("#2F8CFF");
        ell(0, -2, 17, 17); F("#DDEFFF");
        ctx.save(); ctx.translate(0, -2); ctx.rotate(o.spin || 0);
        ctx.strokeStyle = "#2F8CFF"; ctx.lineWidth = 2.6;
        for (let n = 0; n < 6; n++) { const a = n * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
        ctx.restore();
        circle(0, -2, 4, "#FFD23B", 1.6);
        break;
      }
      case "carrots": {
        [[-12, -0.35], [0, 0], [12, 0.35]].forEach(([dx, a]) => {
          ctx.save(); ctx.translate(dx, 4); ctx.rotate(a);
          [[-5, -1.2], [0, 0], [5, 1.2]].forEach(([lx, la]) => { ctx.save(); ctx.translate(lx * 0.6, -16); ctx.rotate(la * 0.4); ell(0, -8, 3.5, 9); F("#4CB848"); ctx.restore(); });
          poly([[-7, -16], [7, -16], [1, 24], [-1, 24]]); F("#FF8A1F");
          line(-4, -6, 1, -6, "#C85F0A", 1.6); line(-2, 4, 3, 4, "#C85F0A", 1.6);
          ctx.restore();
        });
        break;
      }
      case "digger": {
        const tr = o.wheels || 0;
        rr(-26, 12, 40, 12, 6); F("#3A3F55");
        [-20, -8, 4].forEach((wx) => { circle(wx, 18, 3.5, "#8E9AAF", 1.4); line(wx, 18, wx + Math.cos(tr) * 3, 18 + Math.sin(tr) * 3, INK, 1.2); });
        rr(-24, -4, 32, 17, 4); F("#FFC21A");
        rr(-16, -20, 18, 17, 4); F("#FFC21A");
        rr(-12, -16, 10, 9, 2); F("#BFE6FF", 1.6);
        limb([[6, 2], [20, -16], [28, -2]], "#FFC21A", 6);
        poly([[24, -2], [34, -2], [32, 10], [22, 6]]); F("#8E9AAF");
        break;
      }
      case "train": {
        const tr = o.wheels || 0;
        rr(-26, -6, 30, 20, 4); F("#E8303F");
        rr(-26, -22, 16, 18, 3); F("#E8303F");
        rr(-23, -19, 10, 8, 2); F("#BFE6FF", 1.6);
        rr(4, -2, 22, 14, 7); F("#2F8CFF");
        rr(10, -14, 7, 12, 2); F("#3A3F55");
        poly([[26, 6], [32, 14], [24, 14]]); F("#FFD23B");
        [[-18, 16, 7], [-2, 16, 7], [14, 17, 5]].forEach(([wx, wy, r]) => { circle(wx, wy, r, "#3A3F55", 1.6); line(wx, wy, wx + Math.cos(tr) * (r - 2), wy + Math.sin(tr) * (r - 2), "#FFFFFF", 1.6); });
        break;
      }
      case "tractor": {
        const tr = o.wheels || 0;
        rr(-8, -4, 34, 16, 4); F("#3FAE4B");
        rr(-24, -24, 22, 30, 4); F("#3FAE4B");
        rr(-20, -20, 14, 12, 2); F("#BFE6FF", 1.6);
        rr(16, -16, 4, 14, 2); F("#3A3F55");
        circle(-14, 14, 13, "#3A3F55", 1.8); circle(-14, 14, 6, "#FFD23B", 1.6);
        line(-14, 14, -14 + Math.cos(tr) * 11, 14 + Math.sin(tr) * 11, "#FFFFFF", 1.6);
        circle(18, 18, 8, "#3A3F55", 1.8); circle(18, 18, 3.5, "#FFD23B", 1.4);
        break;
      }
      case "blocks": {
        rr(-24, 2, 22, 22, 3); F("#2F8CFF"); star(-13, 13, 6, "#FFFFFF");
        rr(2, 2, 22, 22, 3); F("#FFD23B"); ell(13, 13, 6, 6); ctx.fillStyle = "#E8303F"; ctx.fill();
        rr(-11, -21, 22, 22, 3); F("#E8303F"); poly([[0, -16], [6, -6], [-6, -6]]); ctx.fillStyle = "#FFFFFF"; ctx.fill();
        break;
      }
      case "rocket": {
        if (o.flame) {
          const f = 0.7 + 0.3 * Math.sin(t * 30);
          ctx.beginPath(); ctx.moveTo(-7, 18); ctx.quadraticCurveTo(0, 18 + 22 * f, 7, 18); ctx.closePath(); ctx.fillStyle = "#FF8A1F"; ctx.fill();
          ctx.beginPath(); ctx.moveTo(-4, 18); ctx.quadraticCurveTo(0, 18 + 13 * f, 4, 18); ctx.closePath(); ctx.fillStyle = "#FFE36B"; ctx.fill();
        }
        poly([[-10, 6], [-20, 20], [-8, 18]]); F("#2F8CFF");
        poly([[10, 6], [20, 20], [8, 18]]); F("#2F8CFF");
        ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(13, -14, 11, 18); ctx.lineTo(-11, 18); ctx.quadraticCurveTo(-13, -14, 0, -28); ctx.closePath(); F("#F4F6FA");
        ctx.save(); ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(13, -14, 11, 18); ctx.lineTo(-11, 18); ctx.quadraticCurveTo(-13, -14, 0, -28); ctx.clip();
        ctx.fillStyle = "#E8303F"; ctx.fillRect(-14, -30, 28, 13); ctx.restore();
        ctx.beginPath(); ctx.moveTo(-9, -17); ctx.lineTo(9, -17); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
        circle(0, -2, 5.5, "#7FD0FF", 1.8);
        break;
      }
      case "book": {
        ctx.save(); ctx.rotate(-0.12);
        rr(-20, -24, 40, 48, 4); F("#2F8CFF");
        rr(-20, -24, 8, 48, 3); F("#1F62C4");
        rr(16, -21, 6, 42, 2); F("#FFFFFF", 1.6);
        rr(-20, -24, 40, 48, 4); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        // A cupcake on the cover.
        poly([[-2, 4], [14, 4], [12, 14], [0, 14]]); F("#FFC93C", 1.6);
        ell(6, 0, 9, 6); F("#FF8FB7", 1.6); circle(6, -7, 2.6, "#E8303F", 1.2);
        ctx.restore();
        break;
      }
      case "paint": {
        rr(-26, -14, 52, 30, 6); F("#F4F6FA");
        ["#E8303F", "#FFD23B", "#3FAE4B", "#2F8CFF", "#9B5DE5", "#FF8A1F"].forEach((c, n) => {
          const px = -16 + (n % 3) * 16, py = -5 + Math.floor(n / 3) * 13; ell(px, py, 6, 4.5); fs(c, 1.4);
        });
        ctx.save(); ctx.rotate(-0.5);
        rr(-4, -34, 6, 30, 3); F("#C98B5A");
        rr(-4.5, -40, 7, 9, 2); F("#8E9AAF", 1.6);
        ctx.beginPath(); ctx.moveTo(-3, -40); ctx.quadraticCurveTo(-1, -50, 1, -40); ctx.closePath(); fs("#E8303F", 1.4);
        ctx.restore();
        break;
      }
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing the box, paper and present
  // =====================================================================================================
  const BOX = "#EBC48E", BOX_D = "#D7A86B", BOX_IN = "#B98852", LID = "#E3B57A";
  const topFace = (g) => [[g.x0 + g.i, g.yt - g.d], [g.x1 - g.i, g.yt - g.d], [g.x1, g.yt], [g.x0, g.yt]];
  // The paper covers the lidded box (a little bigger than the box itself).
  const paperG = () => geom(V.box.x, V.box.y, 3);
  // A paper pattern over a rectangle (it is clipped to the paper's shape before this).
  function pattern(P, x0, y0, x1, y1) {
    ctx.fillStyle = P.bg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (P.id === "stripes") {
      ctx.fillStyle = P.fg;
      for (let x = x0 - (y1 - y0) - 40; x < x1 + 20; x += 26) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + 13, y1); ctx.lineTo(x + 13 + (y1 - y0), y0); ctx.lineTo(x + (y1 - y0), y0); ctx.closePath(); ctx.fill(); }
      return;
    }
    const sp = 30;
    for (let j = 0, y = y0 + 10; y < y1 + sp; y += sp * 0.8, j++) {
      for (let x = x0 + (j % 2 ? sp / 2 : 0) + 6; x < x1 + sp; x += sp) {
        if (P.id === "stars") star(x, y, 7, P.fg);
        else if (P.id === "trees") {
          ctx.fillStyle = P.fg; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y + 5); ctx.lineTo(x - 7, y + 5); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#8A5A2B"; ctx.fillRect(x - 1.5, y + 5, 3, 4);
          ctx.fillStyle = "#FFE36B"; ctx.beginPath(); ctx.arc(x, y - 9, 1.8, 0, TAU); ctx.fill();
        } else {
          ctx.strokeStyle = P.fg; ctx.lineWidth = 1.8; ctx.lineCap = "round";
          for (let n = 0; n < 3; n++) { const a = n * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); ctx.stroke(); }
          ctx.lineCap = "butt";
        }
      }
    }
  }
  // The plain box: open (its inside and the gift showing) or with its lid on.
  function drawBox(t, g) {
    if (!V.lidOn) {
      // The inside: the back wall and the floor, then the gift, then the front face over the gift's bottom.
      poly(topFace(g)); fs(BOX_IN);
      poly([[g.x0 + g.i, g.yt - g.d], [g.x1 - g.i, g.yt - g.d], [g.x1 - g.i - 4, g.yt - g.d + 12], [g.x0 + g.i + 4, g.yt - g.d + 12]]);
      ctx.fillStyle = BOX_D; ctx.fill();
      if (V.giftIn && B.gift) { const p = inBoxPt(); drawGift(B.gift, p.x, p.y, GIFT_IN_S, { t }); }
      rr(g.x0, g.yt, BW, BH, 4); fs(BOX);
      line(g.x0 + 6, g.yt + 4, g.x1 - 6, g.yt + 4, "rgba(255,255,255,0.5)", 2);
    } else {
      rr(g.x0, g.yt, BW, BH, 4); fs(BOX);
      drawLidShape(g.cx, g.yt + 5, 1);
    }
  }
  // The lid: its top face and the band round its front, centered on the band at (x, y).
  function drawLidShape(x, y, a) {
    ctx.save(); ctx.globalAlpha *= a;
    const o = 4, x0 = x - BW / 2 - o, x1 = x + BW / 2 + o, yt = y - 8;
    poly([[x0 + BI, yt - BD], [x1 - BI, yt - BD], [x1, yt], [x0, yt]]); fs(LID);
    rr(x0, yt, x1 - x0, 17, 3); fs(shade(LID, -0.06));
    ctx.restore();
  }
  // The paper over the present: every cell not torn yet, its ragged torn edges outlined. The top face is a
  // little lighter, so the box still reads as a box.
  function drawPaper(g, t) {
    const P = PAPER_BY[B.paper], torn = V.torn;
    const cellPath = () => {
      ctx.beginPath();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (torn[r * COLS + c]) continue;
        const a = gridPt(g, c, r), b = gridPt(g, c + 1, r), d = gridPt(g, c + 1, r + 1), e = gridPt(g, c, r + 1);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
      }
    };
    if (covered() === 0) return;
    ctx.save();
    cellPath(); ctx.clip();
    pattern(P, g.x0 - 4, g.yt - g.d - 4, g.x1 + 4, g.yb + 4);
    // Lighter top face; the folds at the ends and along the top.
    poly(topFace(g)); ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
    ctx.strokeStyle = rgba("#1D2340", 0.35); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(g.x0, g.yt + 2); ctx.lineTo(g.x0 + 20, g.cy + 4); ctx.lineTo(g.x0, g.yb - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.x1, g.yt + 2); ctx.lineTo(g.x1 - 20, g.cy + 4); ctx.lineTo(g.x1, g.yb - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g.x0 + g.i * 0.5, g.yt - g.d / 2); ctx.lineTo(g.x1 - g.i * 0.5, g.yt - g.d / 2); ctx.stroke();
    ctx.restore();
    // Outline: every cell side that borders a torn cell or the paper's edge, plus the top/front edge.
    ctx.beginPath();
    const open = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || torn[r * COLS + c];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (torn[r * COLS + c]) continue;
      const a = gridPt(g, c, r), b = gridPt(g, c + 1, r), d = gridPt(g, c + 1, r + 1), e = gridPt(g, c, r + 1);
      if (open(c, r - 1) || r === TOP_ROWS) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      if (open(c + 1, r)) { ctx.moveTo(b.x, b.y); ctx.lineTo(d.x, d.y); }
      if (open(c, r + 1)) { ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); }
      if (open(c - 1, r)) { ctx.moveTo(e.x, e.y); ctx.lineTo(a.x, a.y); }
    }
    ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
  }
  // Is the paper still on under a point (for the tape and the ribbon)?
  function paperAt(g, x, y) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const a = gridPt(g, c, r), d = gridPt(g, c + 1, r + 1);
      if (x >= Math.min(a.x, d.x) - 1 && x <= Math.max(a.x, d.x) + 1 && y >= a.y - 1 && y <= d.y + 1) return !V.torn[r * COLS + c];
    }
    return false;
  }
  function drawTape(x, y, a, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.globalAlpha *= a == null ? 1 : a;
    rr(-8, -17, 16, 34, 2); ctx.fillStyle = "rgba(235,245,255,0.75)"; ctx.fill();
    ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.lineWidth = 1.4; ctx.stroke();
    line(-5, -10, 3, -4, "rgba(255,255,255,0.9)", 2);
    ctx.restore();
  }
  function drawBow(x, y, s, hex, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a == null ? 1 : a;
    const dk = shade(hex, -0.22);
    poly([[-3, 2], [-16, 22], [-9, 21], [-6, 26], [1, 4]]); fs(dk);
    poly([[3, 2], [16, 22], [9, 21], [6, 26], [-1, 4]]); fs(dk);
    ell(-15, -5, 16, 10, 0.35); fs(hex); ell(-14, -5, 7, 4, 0.35); ctx.fillStyle = dk; ctx.fill();
    ell(15, -5, 16, 10, -0.35); fs(hex); ell(14, -5, 7, 4, -0.35); ctx.fillStyle = dk; ctx.fill();
    rr(-6, -10, 12, 13, 4); fs(hex);
    ctx.restore();
  }
  // The ribbon round the present: down the middle of the top and the front, and across the front.
  function drawRibbon(g, p, hex, a) {
    if (p <= 0 || a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    const w = 13, dk = shade(hex, -0.2);
    const pv = clamp(p * 1.6, 0, 1), ph = clamp(p * 1.6 - 0.6, 0, 1);
    const yTop = g.yt - g.d, yEnd = lerp(yTop, g.yb, pv);
    const strip = (pts) => { poly(pts); ctx.fillStyle = hex; ctx.fill(); ctx.strokeStyle = dk; ctx.lineWidth = 1.6; ctx.stroke(); };
    if (ph > 0) strip([[g.x0, g.cy + 4 - w / 2], [lerp(g.x0, g.x1, ph), g.cy + 4 - w / 2], [lerp(g.x0, g.x1, ph), g.cy + 4 + w / 2], [g.x0, g.cy + 4 + w / 2]]);
    if (yEnd > yTop) {
      const yA = Math.min(yEnd, g.yt);
      strip([[g.cx - w / 2 + 1, yTop], [g.cx + w / 2 - 1, yTop], [g.cx + w / 2, yA], [g.cx - w / 2, yA]]);
      if (yEnd > g.yt) strip([[g.cx - w / 2, g.yt], [g.cx + w / 2, g.yt], [g.cx + w / 2, yEnd], [g.cx - w / 2, yEnd]]);
    }
    ctx.restore();
  }
  function drawPresent(t) {
    if (V.boxAlpha <= 0.01 && !V.gp) return;
    const g = boxG();
    ctx.save(); ctx.globalAlpha = V.boxAlpha;
    // Table shadow.
    ell(g.cx, g.yb + 2, BW * 0.6, 8); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
    wob(g.cx, g.yb, V.boxWob, t, () => {
      drawBox(t, g);
      if (V.wrapped && B.paper) {
        const pg = paperG();
        // While the paper folds round the box, the loose sheet shrinks onto it.
        if (V.fold < 1) {
          const ln = rollLine(), sp = ln.span / 2, k = ease(V.fold);
          let x0, y0, x1, y1;
          if (L.unroll === "up") { x0 = ln.perp - sp; x1 = ln.perp + sp; y0 = ln.end; y1 = ln.start; }
          else { x0 = ln.end; x1 = ln.start; y0 = ln.perp - sp; y1 = ln.perp + sp; }
          x0 = lerp(x0, pg.x0, k); x1 = lerp(x1, pg.x1, k); y0 = lerp(y0, pg.yt - pg.d, k); y1 = lerp(y1, pg.yb, k);
          ctx.save(); rr(x0, y0, x1 - x0, y1 - y0, 4); ctx.clip(); pattern(PAPER_BY[B.paper], x0, y0, x1, y1); ctx.restore();
          ctx.save(); ctx.globalAlpha *= k; drawPaper(pg, t); ctx.restore();
          rr(x0, y0, x1 - x0, y1 - y0, 4); ctx.strokeStyle = rgba("#1D2340", 1 - k); ctx.lineWidth = LW; ctx.stroke();
        } else drawPaper(pg, t);
        // Tape on the folds (only where the paper is still on).
        seams(pg).forEach((s, k) => { if (B.tapes[k] && paperAt(pg, s.x, s.y)) drawTape(s.x, s.y, 1, k === 1 ? 0.1 : 0); });
        if (B.step === "tape" && !drag) seams(pg).forEach((s, k) => {
          if (B.tapes[k] || V.tapePend[k]) return;
          ctx.save(); ctx.setLineDash([4, 4]); rr(s.x - 9, s.y - 18, 18, 36, 3); ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
        });
        const bh = B.bow ? BOW_BY[B.bow].hex : "#FFC93C";
        drawRibbon(pg, V.ribbon, bh, 1 - V.bowOff);
        if (V.bowOn) {
          const off = V.bowOff, bx = pg.cx + off * 90, by = pg.yt - pg.d / 2 - 2 - Math.sin(off * Math.PI) * 50;
          drawBow(bx, by, 1.05, bh, 1 - off);
        }
      }
    });
    ctx.restore();
    // The loose lid (in the air, or set down on the table) and the gift that popped out.
    if (V.lidOff) drawLidShape(V.lidOff.x, V.lidOff.y, V.lidOff.a);
  }
  // A paper roll centered at (x, y): along the box's width when it rolls up, upright when it rolls left.
  function drawRoll(P, x, y, len, dia, a) {
    ctx.save(); ctx.translate(x, y); if (L.unroll !== "up") ctx.rotate(Math.PI / 2); ctx.globalAlpha *= a == null ? 1 : a;
    rr(-len / 2, -dia / 2, len, dia, dia / 2);
    ctx.save(); ctx.clip(); pattern(P, -len / 2, -dia / 2, len / 2, dia / 2);
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(-len / 2, -dia / 2, len, dia * 0.3);
    ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fillRect(-len / 2, dia * 0.2, len, dia * 0.3);
    ctx.restore();
    rr(-len / 2, -dia / 2, len, dia, dia / 2); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
    ell(len / 2 - dia * 0.22, 0, dia * 0.2, dia / 2 - 1); fs("#E7C08A", 1.8);
    ell(len / 2 - dia * 0.22, 0, dia * 0.09, dia * 0.22); ctx.fillStyle = "#9A6C3A"; ctx.fill();
    ctx.restore();
  }
  // The roll he is using and the paper lying behind it.
  function drawRolling(t) {
    const r = V.roll;
    if (r) {
      const P = PAPERS[r.i], ln = rollLine(), sl = rollSlot(r.i), pr = rollProg(r);
      if (pr > 0) {
        const sp = ln.span / 2;
        let x0, y0, x1, y1;
        if (L.unroll === "up") { x0 = ln.perp - sp; x1 = ln.perp + sp; y0 = r.y; y1 = ln.start; }
        else { x0 = r.x; x1 = ln.start; y0 = ln.perp - sp; y1 = ln.perp + sp; }
        ctx.save(); rr(x0, y0, x1 - x0, y1 - y0, 3); ctx.clip(); pattern(P, x0, y0, x1, y1);
        ctx.fillStyle = "rgba(29,35,64,0.1)";
        if (L.unroll === "up") ctx.fillRect(x0, y0, x1 - x0, 8); else ctx.fillRect(x0, y0, 8, y1 - y0);
        ctx.restore();
        rr(x0, y0, x1 - x0, y1 - y0, 3); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
      }
      drawRoll(P, r.x, r.y, sl.len, sl.dia * (1 - 0.25 * pr));
    }
    if (V.rollBack) { const rb = V.rollBack, sl = rollSlot(rb.i); drawRoll(PAPERS[rb.i], rb.x, rb.y, sl.len, sl.dia * 0.8); }
  }

  // =====================================================================================================
  // Drawing the room, the tray and the cards
  // =====================================================================================================
  let flakes = [];
  for (let k = 0; k < 70; k++) flakes.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2, v: 0.05 + Math.random() * 0.06, ph: Math.random() * TAU });
  let snowUntil = 0, sill = 0;
  function drawRoom(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const by = voy + L.back * vs;
    // A warm wall with soft stripes and a wooden table, past the world's edges.
    ctx.fillStyle = "#FFE9D6"; ctx.fillRect(0, 0, W, by);
    ctx.fillStyle = "#FFE0C7";
    const sw = 20 * vs;
    for (let x = vox % (sw * 2) - sw * 2; x < W; x += sw * 2) ctx.fillRect(x, 0, sw, by);
    ctx.fillStyle = "#E9B57D"; ctx.fillRect(0, by, W, H - by);
    ctx.fillStyle = "#E0A86E";
    const ph = 46 * vs;
    for (let y = by + ph; y < H; y += ph) ctx.fillRect(0, y, W, 2 * Math.max(1, vs * 0.8));
    ctx.fillStyle = "#D99E62"; ctx.fillRect(0, by, W, 8 * vs);
    ctx.strokeStyle = INK; ctx.lineWidth = LW * vs;
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.stroke();
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
  }
  function drawWindow(t, dt) {
    const w = L.win, heavy = t < snowUntil;
    ctx.save();
    const wk = V.winWob;
    if (wk > 0) { ctx.translate(w.x + w.w / 2, w.y + w.h); ctx.rotate(Math.sin(t * 20) * wk * 0.02); ctx.translate(-(w.x + w.w / 2), -(w.y + w.h)); }
    rr(w.x - 6, w.y - 6, w.w + 12, w.h + 12, 8); fs("#FFFFFF");
    rr(w.x, w.y, w.w, w.h, 4);
    const gr = ctx.createLinearGradient(0, w.y, 0, w.y + w.h); gr.addColorStop(0, "#6FA8E8"); gr.addColorStop(1, "#BFE1FF");
    ctx.fillStyle = gr; ctx.fill();
    ctx.save(); rr(w.x, w.y, w.w, w.h, 4); ctx.clip();
    // Snowy hills and a little snowy tree outside.
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h * 0.78); ctx.quadraticCurveTo(w.x + w.w * 0.35, w.y + w.h * 0.6, w.x + w.w * 0.7, w.y + w.h * 0.8); ctx.quadraticCurveTo(w.x + w.w * 0.9, w.y + w.h * 0.7, w.x + w.w, w.y + w.h * 0.74); ctx.lineTo(w.x + w.w, w.y + w.h); ctx.lineTo(w.x, w.y + w.h); ctx.closePath(); ctx.fill();
    const tx = w.x + w.w * 0.74, ty = w.y + w.h * 0.74;
    ctx.fillStyle = "#2E9455"; ctx.beginPath(); ctx.moveTo(tx, ty - 34); ctx.lineTo(tx + 14, ty); ctx.lineTo(tx - 14, ty); ctx.closePath(); ctx.fill();
    // Falling snow (a flurry for a Surprise).
    const n = heavy ? 70 : 22, sp = heavy ? 1.8 : 1;
    flakes.forEach((f, k) => {
      f.y += f.v * sp * dt; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
      if (k >= n) return;
      const x = w.x + (f.x + Math.sin(t * 0.8 + f.ph) * 0.03) * w.w, y = w.y + f.y * w.h;
      ctx.beginPath(); ctx.arc(x, y, f.s * (heavy ? 2.2 : 1), 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    });
    ctx.restore();
    rr(w.x, w.y, w.w, w.h, 4); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
    line(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h, INK, 5); line(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h, "#FFFFFF", 2.4);
    line(w.x, w.y + w.h / 2, w.x + w.w, w.y + w.h / 2, INK, 5); line(w.x, w.y + w.h / 2, w.x + w.w, w.y + w.h / 2, "#FFFFFF", 2.4);
    rr(w.x - 10, w.y + w.h + 4, w.w + 20, 8, 3); fs("#FFFFFF");
    // A flurry piles a little snow on the outside of the sill (it stays for this visit).
    if (heavy) sill = Math.min(1, sill + dt * 0.25);
    if (sill > 0.02) {
      const sy = w.y + w.h - 1;
      ctx.beginPath(); ctx.moveTo(w.x + 2, sy);
      ctx.quadraticCurveTo(w.x + w.w * 0.3, sy - 12 * sill, w.x + w.w * 0.55, sy - 6 * sill);
      ctx.quadraticCurveTo(w.x + w.w * 0.8, sy - 14 * sill, w.x + w.w - 2, sy); ctx.closePath();
      ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.strokeStyle = "#9CC3E8"; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.restore();
  }
  function drawWreath(t) {
    const p = L.wreath;
    if (!p) return;
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; circle(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 11, k % 2 ? "#2E9455" : "#3FAE5E", 1.6); }
    [[0.4, "#E8303F"], [2.1, "#E8303F"], [3.6, "#E8303F"], [5.0, "#E8303F"]].forEach(([a, c]) => circle(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 4, c, 1.4));
    drawBow(p.x, p.y + 32, 0.8, "#E8303F");
  }
  // The garland of lights along the top, with a card hanging for each present given.
  function cardPt(k) {
    const G = L.garland, n = CARDS_MAX, sp = (G.x1 - G.x0 - 28) / (n - 1), x = G.x0 + 14 + k * sp;
    return { x, y: G.y + 6 + Math.sin((x - G.x0) / (G.x1 - G.x0) * Math.PI) * 10 };
  }
  function drawGarland(t) {
    const G = L.garland;
    ctx.beginPath(); ctx.moveTo(G.x0, G.y);
    for (let x = G.x0; x <= G.x1; x += 8) ctx.lineTo(x, G.y + Math.sin((x - G.x0) / (G.x1 - G.x0) * Math.PI) * 10);
    ctx.strokeStyle = "#2E9455"; ctx.lineWidth = 3; ctx.stroke();
    const cols = ["#E8303F", "#FFC93C", "#2F8CFF", "#3FAE4B"];
    for (let k = 0, x = G.x0 + 8; x < G.x1; x += 26, k++) {
      const y = G.y + Math.sin((x - G.x0) / (G.x1 - G.x0) * Math.PI) * 10, glow = 0.6 + 0.4 * Math.sin(t * 1.6 + k * 1.3);
      ell(x, y + 6, 3.6, 5); ctx.fillStyle = cols[k % 4]; ctx.globalAlpha = 0.55 + 0.45 * glow; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
    }
    cards.forEach((c, k) => {
      const p = cardPt(k), w = 24, h = 30, sw = V.cardWob[k] || 0;
      const drop = k === V.cardNew ? cardDrop : 1;
      ctx.save(); ctx.translate(p.x, p.y - (1 - drop) * 40); ctx.rotate(Math.sin(t * 1.2 + k) * 0.04 + Math.sin(t * 18) * sw * 0.25);
      ctx.globalAlpha = drop;
      line(0, 0, 0, 5, INK, 1.4);
      rr(-w / 2, 5, w, h, 3); fs("#FFFFFF", 1.8);
      drawGift(c.g, 0, 5 + h / 2, 17, { t });
      ctx.restore();
    });
  }
  let cardDrop = 1;
  // The tray: whatever this step needs, sliding in from the side.
  function drawTray(t) {
    const k = V.tray.kind, off = V.tray.off;
    if (!k || off >= 1) return;
    const T = k === "shelf" ? L.shelf : L.tray;
    ctx.save(); ctx.translate(ease(off) * (L.w - T.x + 40), 0);
    if (k === "shelf") {
      // A wooden toy shelf.
      const rows = Math.ceil(GIFTS.length / T.cols);
      rr(T.x, T.y - 4, T.w, T.h + 2, 10); fs("#C98B5A");
      rr(T.x + 7, T.y + 3, T.w - 14, T.h - 12, 6); fs("#F7E3C6");
      for (let r = 1; r <= rows; r++) { const y = T.y + T.h / rows * r - 6; rr(T.x + 4, y - 3, T.w - 8, 7, 3); fs("#B97A47", 1.8); }
      GIFTS.forEach((gd, i) => {
        if ((V.carry && V.carry.id === gd.id) || (B.gift === gd.id && at("lid")) || (B.gift === gd.id && V.giftIn)) return;
        const s = shelfSlot(i), w0 = V.swob[i];
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.sin(t * 24) * w0 * 0.25);
        drawGift(gd.id, 0, 0, s.s, { t });
        ctx.restore();
      });
    } else if (k === "lid") {
      if (!V.lidPose && !V.lidOn) { const s = lidSlot(); wob(s.x, s.y, V.lwob, t, () => drawLidShape(s.x, s.y + 8, 1)); }
    } else if (k === "rolls") {
      PAPERS.forEach((P, i) => {
        if ((V.roll && V.roll.i === i) || (V.rollBack && V.rollBack.i === i)) return;
        const s = rollSlot(i), w0 = V.rwob[i];
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.sin(t * 24) * w0 * 0.06);
        drawRoll(P, 0, 0, s.len, s.dia);
        ctx.restore();
      });
    } else if (k === "tape") {
      const d = dispSlot();
      wob(d.x, d.y + 20, V.dwob, t, () => drawDispenser(d.x, d.y));
    } else if (k === "bows") {
      BOWS.forEach((b, i) => {
        if (V.bowPose && V.bowPose.i === i) return;
        if (B.bow === b.id && V.bowOn) return;
        const s = bowSlot(i), w0 = V.bwob[i];
        ell(s.x, s.y + 22, 26, 6); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.sin(t * 24) * w0 * 0.25);
        drawBow(0, 0, 1.15, b.hex);
        ctx.restore();
      });
    }
    ctx.restore();
  }
  // A heavy tape dispenser with a roll of clear tape; the tape comes out at the teeth (mouthPt).
  function drawDispenser(x, y) {
    ell(x, y + 34, 70, 9); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 62, y + 32); ctx.quadraticCurveTo(x - 66, y - 26, x - 10, y - 30); ctx.lineTo(x + 40, y - 22); ctx.lineTo(x + 52, y - 20); ctx.lineTo(x + 50, y + 32); ctx.closePath(); fs("#E8303F");
    ell(x - 10, y - 4, 30, 30); fs("rgba(225,236,248,0.9)");
    ell(x - 10, y - 4, 15, 15); fs("#E9D7B5", 1.8);
    ell(x - 10, y - 4, 6, 6); fs("#C9302C", 1.6);
    ctx.beginPath(); ctx.moveTo(x + 14, y - 30); ctx.lineTo(x + 44, y - 26); ctx.strokeStyle = "rgba(29,35,64,0.5)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 38, y - 30);
    for (let k = 0; k < 4; k++) { ctx.lineTo(x + 41 + k * 3, y - 34); ctx.lineTo(x + 43 + k * 3, y - 30); }
    ctx.lineTo(x + 52, y - 22); ctx.lineTo(x + 38, y - 22); ctx.closePath(); fs("#8E9AAF", 1.6);
    rr(x - 62, y + 26, 112, 8, 3); fs("#B5262E", 1.8);
  }
  // Things moving between places: the gift, the lid, a tape piece, a bow.
  function drawMoving(t) {
    if (V.carry) drawGift(V.carry.id, V.carry.x, V.carry.y, V.carry.s, { t });
    if (V.lidPose) drawLidShape(V.lidPose.x, V.lidPose.y, 1);
    V.tapeFly.forEach((f) => drawTape(f.x, f.y, 1));
    if (V.tapeCarry) {
      const m = mouthPt(), c = V.tapeCarry;
      if (V.tray.kind === "tape") { ctx.save(); ctx.setLineDash([3, 3]); line(m.x, m.y, c.x, c.y, "rgba(29,35,64,0.25)", 2); ctx.restore(); }
      drawTape(c.x, c.y, 1);
    }
    if (V.bowPose) drawBow(V.bowPose.x, V.bowPose.y, 1.05, BOWS[V.bowPose.i].hex);
  }
  // The opened gift, played with.
  function drawPlayGift(t) {
    const gp = V.gp;
    if (!gp || !B.gift) return;
    const gd = GIFT_BY[B.gift], tt = t - playT0, playing = B.step === "play";
    let x = gp.x, y = gp.y, rot = gp.rot || 0;
    const o = { t };
    if (playing) {
      const m = reduce ? 0.5 : 1;
      if (gd.play === "bounce") y -= Math.abs(Math.sin(tt * 3.2)) * 46 * m;
      else if (gd.play === "roll") { x += Math.sin(tt * 1.6) * 34 * m; rot = Math.sin(tt * 1.6) * 1.2; }
      else if (gd.play === "spin") o.spin = tt * 6;
      else if (gd.play === "drive") { x += Math.sin(tt * 1.2) * 40 * m; o.wheels = Math.sin(tt * 1.2) * 12; }
      else if (gd.play === "fly") { y -= 34 + Math.sin(tt * 2) * 18 * m; o.flame = true; rot = Math.sin(tt * 1.3) * 0.15; }
      else rot = Math.sin(tt * 4) * 0.14;
    }
    ell(gp.x, L.give.y + 6 + gp.s * 0.42, gp.s * 0.4, 6); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); drawGift(gd.id, 0, 0, gp.s, o); ctx.restore();
  }
  // Surprise: a toy train chugs along the back of the table.
  let actor = null;
  function drawActor(t) {
    if (!actor) return;
    const p = (t - actor.t0) / actor.dur;
    if (p >= 1) { actor = null; return; }
    const x = lerp(-120, L.w + 120, p), y = L.back + 22, wh = p * 60;
    if (Math.random() < 0.08) puff("steam", x + 22, y - 44, 1);
    drawGift("train", x, y - 16, 58, { t, wheels: wh });
    [["#FFC93C", -60], ["#3FAE4B", -108]].forEach(([c, dx]) => {
      rr(x + dx - 20, y - 26, 40, 22, 4); fs(c);
      [x + dx - 11, x + dx + 11].forEach((wx) => { circle(wx, y - 2, 6, "#3A3F55", 1.6); line(wx, y - 2, wx + Math.cos(wh) * 4, y - 2 + Math.sin(wh) * 4, "#FFFFFF", 1.4); });
      line(x + dx + 20, y - 10, x + dx + 28, y - 10, INK, 3);
    });
  }
  function drawParts() {
    parts.forEach((p) => {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, a);
      if (p.kind === "scrap") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const s = p.size, sq = Math.cos(p.t * 8 + p.rot);
        ctx.scale(1, 0.4 + 0.6 * Math.abs(sq));
        poly([[-s / 2, -s / 2], [s / 2, -s * 0.35], [s * 0.4, s / 2], [-s * 0.45, s * 0.4]]);
        ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
        if (p.c2) { ctx.fillStyle = p.c2; ctx.fillRect(-s * 0.15, -s * 0.15, s * 0.3, s * 0.3); }
        ctx.restore();
      } else if (p.kind === "spark") star(p.x, p.y, p.size, p.color);
      else if (p.kind === "steam") { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.t), 0, TAU); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill(); }
      ctx.globalAlpha = 1;
    });
  }

  // =====================================================================================================
  // Drawing the recipients and the bubbles
  // =====================================================================================================
  // Faces stay on these real people and animals all the time; they smile wider (eyes curved shut) when happy.
  function face(r, happy, open, t, eye) {
    const blink = (t % 4.1) < 0.12;
    ctx.strokeStyle = eye || INK; ctx.fillStyle = eye || INK; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    [-1, 1].forEach((s) => {
      if (happy || blink) { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.02, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.06, r * 0.1, 0, TAU); ctx.fill(); }
    });
    ctx.fillStyle = "rgba(255,120,140,0.35)"; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * r * 0.58, r * 0.24, r * 0.15, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = INK;
    if (open) { ctx.beginPath(); ctx.arc(0, r * 0.26, r * 0.24, 0, Math.PI); ctx.closePath(); ctx.fillStyle = "#8C2F3A"; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, r * 0.2, happy ? r * 0.3 : r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.lineCap = "butt";
  }
  function drawHat(rc, hr, t) {
    switch (rc.role) {
      case "builder":
        ctx.beginPath(); ctx.arc(0, -hr * 0.25, hr * 0.98, Math.PI, TAU); ctx.closePath(); fs("#FFC21A");
        rr(-hr * 1.18, -hr * 0.3, hr * 2.36, 9, 4); fs("#FFC21A");
        rr(-5, -hr * 1.2, 10, hr * 0.9, 4); fs("#FFD84D", 1.8);
        break;
      case "baker":
        rr(-hr * 0.8, -hr * 1.05, hr * 1.6, hr * 0.5, 4); fs("#FFFFFF");
        [[-hr * 0.5, -hr * 1.35], [0, -hr * 1.55], [hr * 0.5, -hr * 1.35]].forEach(([x, y]) => circle(x, y, hr * 0.42, "#FFFFFF"));
        rr(-hr * 0.78, -hr * 1.1, hr * 1.56, hr * 0.36, 3); ctx.fillStyle = "#FFFFFF"; ctx.fill();
        break;
      case "farmer":
        ell(0, -hr * 0.62, hr * 1.5, hr * 0.32); fs("#F2C24E");
        ctx.beginPath(); ctx.moveTo(-hr * 0.7, -hr * 0.6); ctx.quadraticCurveTo(-hr * 0.7, -hr * 1.35, 0, -hr * 1.35); ctx.quadraticCurveTo(hr * 0.7, -hr * 1.35, hr * 0.7, -hr * 0.6); ctx.closePath(); fs("#F2C24E");
        rr(-hr * 0.7, -hr * 0.82, hr * 1.4, 7, 2); fs("#E8494F", 1.6);
        break;
      case "girl":
        ctx.beginPath(); ctx.arc(0, -hr * 0.3, hr * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); fs("#3D6FD8");
        ctx.save(); ctx.beginPath(); ctx.arc(0, -hr * 0.3, hr * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.clip();
        ctx.fillStyle = "#FFFFFF"; for (let k = -3; k <= 3; k++) ctx.fillRect(k * 9 - 2, -hr * 1.4, 4, hr * 1.2); ctx.restore();
        ctx.beginPath(); ctx.arc(0, -hr * 0.3, hr * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
        ell(hr * 0.75, -hr * 0.42, hr * 0.5, 6); fs("#3D6FD8");
        break;
      case "painter":
        ell(-hr * 0.12, -hr * 0.78, hr * 0.98, hr * 0.38, -0.18); fs("#E8303F");
        rr(-3, -hr * 1.28, 6, 8, 2); fs("#E8303F", 1.6);
        break;
    }
  }
  function drawPerson(rc, t, P) {
    const kid = !!rc.kid, hr = kid ? 29 : 32, sh = kid ? 58 : 70, sw = kid ? 78 : 96;
    const shY = -sh, hy = shY - hr - 8;
    const happy = P.happy, open = P.cheer || P.walkout;
    // Arms: up for a cheer, one up for a wave, reaching to the present, or down by the sides.
    const arm = (side, hand) => limb([[side * (sw / 2 - 10), shY + 14], hand], rc.shirt, 12);
    const hand = (x, y) => circle(x, y, 8.5, rc.role === "astronaut" ? "#FFFFFF" : rc.skin, 2);
    const arms = [];
    if (P.cheer) { const w = Math.sin(t * 9) * 6; arms.push([-1, [-sw / 2 - 18 + w, shY - 46]], [1, [sw / 2 + 18 - w, shY - 46]]); }
    else if (P.wave) { arms.push([1, [sw / 2 + 22 + Math.sin(t * 10) * 10, shY - 44]]); }
    else if (P.reach > 0.05) { const k = P.reach; arms.push([1, [sw / 2 + 4 + 28 * k, shY + 50 - 10 * k]], [-1, [-sw / 2 + 10 + 30 * k, shY + 58]]); }
    else arms.push([-1, [-sw / 2 + 4, shY + 80]], [1, [sw / 2 - 4, shY + 80]]);
    // The body (it runs down behind the table).
    if (rc.role === "girl") { ell(-hr * 0.98, hy + hr * 0.25, 8, 13, 0.4); fs(rc.hair); ell(hr * 0.98, hy + hr * 0.25, 8, 13, -0.4); fs(rc.hair); }
    rr(-sw / 2, shY, sw, sh + 30, 24); fs(rc.shirt);
    ctx.save(); rr(-sw / 2, shY, sw, sh + 30, 24); ctx.clip();
    if (rc.role === "builder") {
      ctx.fillStyle = "#FF8A1F"; ctx.fillRect(-sw / 2, shY, sw * 0.36, sh + 30); ctx.fillRect(sw / 2 - sw * 0.36, shY, sw * 0.36, sh + 30);
      ctx.fillStyle = "#E6ECF5"; ctx.fillRect(-sw / 2, shY + 36, sw * 0.36, 7); ctx.fillRect(sw / 2 - sw * 0.36, shY + 36, sw * 0.36, 7);
      line(-sw / 2 + sw * 0.36, shY, -sw / 2 + sw * 0.36, 30, INK, 1.6); line(sw / 2 - sw * 0.36, shY, sw / 2 - sw * 0.36, 30, INK, 1.6);
    } else if (rc.role === "baker") {
      [-10, 10].forEach((bx) => [16, 32, 48].forEach((dy) => circle(bx, shY + dy, 3, "#DDE3EE", 1.2)));
      line(0, shY + 4, 0, 30, "rgba(29,35,64,0.25)", 1.6);
    } else if (rc.role === "farmer") {
      ctx.strokeStyle = "rgba(120,20,30,0.35)"; ctx.lineWidth = 3;
      for (let x = -sw / 2 + 8; x < sw / 2; x += 14) { ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x, 30); ctx.stroke(); }
      for (let y = shY + 8; y < 30; y += 14) { ctx.beginPath(); ctx.moveTo(-sw / 2, y); ctx.lineTo(sw / 2, y); ctx.stroke(); }
      rr(-sw * 0.3, shY + 26, sw * 0.6, sh, 6); fs("#3D6FD8");
      [-1, 1].forEach((s) => { line(s * sw * 0.26, shY + 28, s * sw * 0.3, shY, INK, 9); line(s * sw * 0.26, shY + 28, s * sw * 0.3, shY, "#3D6FD8", 5.5); circle(s * sw * 0.24, shY + 30, 3, "#FFD23B", 1.2); });
    } else if (rc.role === "girl") {
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-sw / 2, shY + 22, sw, 8);
    } else if (rc.role === "painter") {
      [["#2F8CFF", -18, 22], ["#FFD23B", 14, 34], ["#3FAE4B", -6, 48], ["#E8303F", 20, 14], ["#9B5DE5", -26, 40]].forEach(([c, x, y]) => { ell(x, shY + y, 5, 4); ctx.fillStyle = c; ctx.fill(); });
    } else if (rc.role === "astronaut") {
      rr(-14, shY + 18, 28, 20, 4); fs("#DDE3EE", 1.8);
      circle(-6, shY + 28, 3, "#E8303F", 1.2); circle(4, shY + 28, 3, "#2F8CFF", 1.2);
    }
    ctx.restore();
    rr(-sw / 2, shY, sw, sh + 30, 24); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    // Collar.
    if (rc.role === "astronaut") { rr(-hr * 0.9, shY - 6, hr * 1.8, 12, 6); fs("#8E9AAF"); }
    else { ctx.beginPath(); ctx.moveTo(-12, shY + 1); ctx.quadraticCurveTo(0, shY + 14, 12, shY + 1); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
    arms.forEach(([s, h]) => { arm(s, h); hand(h[0], h[1]); });
    // The head.
    ctx.save(); ctx.translate(0, hy); ctx.rotate(P.tilt || 0);
    if (rc.role === "girl" || rc.role === "baker" || rc.role === "painter" || rc.role === "astronaut") {
      ctx.beginPath(); ctx.arc(0, 0, hr + 2, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); fs(rc.hair);
    }
    circle(0, 0, hr, rc.skin);
    if (rc.role === "builder" || rc.role === "farmer") { ctx.beginPath(); ctx.arc(0, -2, hr, Math.PI * 1.1, Math.PI * 1.9); ctx.quadraticCurveTo(0, -hr * 0.55, -hr * 0.95, -hr * 0.3); ctx.closePath(); fs(rc.hair); }
    if (rc.role === "astronaut") { ctx.beginPath(); ctx.arc(0, -2, hr, Math.PI * 1.08, Math.PI * 1.92); ctx.quadraticCurveTo(hr * 0.2, -hr * 0.5, -hr * 0.95, -hr * 0.3); ctx.closePath(); fs(rc.hair); }
    face(hr, happy, open, t);
    drawHat(rc, hr, t);
    if (rc.role === "astronaut") {
      ell(0, -2, hr + 13, hr + 13); ctx.fillStyle = "rgba(170,215,255,0.28)"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -2, hr + 8, Math.PI * 1.15, Math.PI * 1.45); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
    }
    ctx.restore();
  }
  function drawDog(t, P) {
    const wag = Math.sin(t * (P.happy ? 16 : 5)) * (P.happy ? 0.6 : 0.3);
    const C = "#C98A52", D = "#8A5530";
    ctx.save(); ctx.translate(30, -24); ctx.rotate(-0.6 + wag);
    limb([[0, 0], [14, -18], [18, -34]], C, 9); ctx.restore();
    ell(0, -36, 34, 38); fs(C);
    ell(0, -30, 18, 26); ctx.fillStyle = "#FFF1E0"; ctx.fill();
    rr(-24, -14, 18, 16, 8); fs(C); rr(6, -14, 18, 16, 8); fs(C);
    ctx.save(); ctx.translate(0, -100); ctx.rotate(P.tilt || 0);
    const flap = P.happy ? Math.sin(t * 12) * 0.15 : 0;
    ell(-28, 2, 11, 22, 0.25 + flap); fs(D); ell(28, 2, 11, 22, -0.25 - flap); fs(D);
    circle(0, 0, 30, C);
    ell(0, 14, 18, 13); fs("#FFF1E0", 2);
    face(30, P.happy, false, t);
    ell(0, 7, 6, 4.5); ctx.fillStyle = INK; ctx.fill();
    if (P.happy) { rr(-5, 18, 10, 13, 5); fs("#FF7FA0", 1.6); }
    ctx.restore();
  }
  function drawCat(t, P) {
    const sway = Math.sin(t * (P.happy ? 5 : 2)) * 0.25;
    const C = "#F4A04C";
    ctx.save(); ctx.translate(26, -14); ctx.rotate(sway);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(30, -10, 22, -50); ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = C; ctx.lineWidth = 8.6; ctx.stroke(); ctx.lineCap = "butt";
    ctx.restore();
    ell(0, -32, 30, 34); fs(C);
    ell(0, -26, 14, 20); ctx.fillStyle = "#FFE2BF"; ctx.fill();
    rr(-20, -12, 15, 14, 7); fs(C); rr(5, -12, 15, 14, 7); fs(C);
    ctx.save(); ctx.translate(0, -92); ctx.rotate(P.tilt || 0);
    [-1, 1].forEach((s) => { poly([[s * 26, -4], [s * 22, -38], [s * 4, -24]]); fs(C); poly([[s * 20, -10], [s * 19, -28], [s * 10, -21]]); ctx.fillStyle = "#FFC4A8"; ctx.fill(); });
    circle(0, 0, 28, C);
    ctx.strokeStyle = "#D9822E"; ctx.lineWidth = 3; [-8, 0, 8].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -27); ctx.lineTo(x, -18); ctx.stroke(); });
    ell(0, 12, 12, 8); ctx.fillStyle = "#FFE2BF"; ctx.fill();
    face(28, P.happy, false, t);
    poly([[-4, 6], [4, 6], [0, 10]]); ctx.fillStyle = "#FF8FAB"; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    [-1, 1].forEach((s) => [0, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(s * 10, 10 + k * 4); ctx.lineTo(s * 30, 6 + k * 8); ctx.stroke(); }));
    ctx.restore();
  }
  function drawHamster(t, P) {
    const C = "#E9A65A";
    ctx.save(); ctx.translate(0, 0); ctx.rotate(P.tilt || 0);
    [-1, 1].forEach((s) => { circle(s * 24, -70, 10, C); circle(s * 24, -70, 5, "#FFB8C8", 1.4); });
    ell(0, -40, 40, 40); fs(C);
    ell(0, -28, 26, 24); ctx.fillStyle = "#FFF4E2"; ctx.fill();
    ctx.translate(0, -50);
    face(30, P.happy, false, t);
    ell(0, 4, 4, 3); ctx.fillStyle = "#FF7F9E"; ctx.fill();
    [-1, 1].forEach((s) => { line(s * 6, 8, s * 22, 4, INK, 1.2); line(s * 6, 10, s * 22, 12, INK, 1.2); });
    ctx.translate(0, 50);
    [-1, 1].forEach((s) => circle(s * 12, -14, 6, "#FFC9D3", 1.6));
    ctx.restore();
  }
  function drawPony(t, P) {
    const C = "#A8683C", M = "#5A3A22";
    // The neck runs down behind the table.
    poly([[-26, 40], [-20, -70], [22, -78], [28, 40]]); fs(C);
    ctx.save(); ctx.translate(4, -116); ctx.rotate((P.tilt || 0) + (P.happy ? Math.sin(t * 6) * 0.06 : 0));
    [-1, 1].forEach((s) => { poly([[s * 10, -30], [s * 22, -62], [s * 26, -26]]); fs(C); });
    ell(0, 0, 30, 40); fs(C);
    ell(0, 26, 22, 18); fs("#E2B48A");
    [-8, 8].forEach((x) => { ell(x, 28, 3, 4.5); ctx.fillStyle = INK; ctx.fill(); });
    ctx.save(); ctx.translate(0, -8); face(30, P.happy, false, t); ctx.restore();
    // Forelock and mane.
    ctx.beginPath(); ctx.moveTo(-14, -34); ctx.quadraticCurveTo(-4, -18, 2, -40); ctx.quadraticCurveTo(10, -18, 16, -34); ctx.quadraticCurveTo(4, -46, -14, -34); ctx.closePath(); fs(M);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(16, -150); ctx.quadraticCurveTo(40, -100, 30, -40); ctx.lineTo(22, -40); ctx.quadraticCurveTo(28, -100, 8, -146); ctx.closePath(); fs(M);
  }
  // The one at the table, with whatever they are doing right now.
  function drawRecipient(t, which) {
    const rc = R(), sit = onTable(rc);
    if ((which === "behind") === sit) return;
    const rv = V.rec, tt = now();
    const P = {
      happy: tt < rv.happy || B.step === "play" || B.step === "out",
      cheer: tt < rv.cheer, wave: tt < rv.wave, reach: rv.reach, tilt: 0, walkout: false
    };
    let x = rv.x, base = recBase(rc) - rv.hop, rot = 0, sx = 1;
    if (rv.walk) { base -= Math.abs(Math.sin(t * 6)) * 6; rot = Math.sin(t * 6) * 0.05; }
    if (tt < rv.dance) {
      const d = t * 5;
      if (rc.kind === "dog") sx = Math.cos(d * 1.2);        // the dog chases its tail round and round
      else { rot = Math.sin(d) * 0.14; base -= Math.abs(Math.sin(d)) * 14; P.tilt = Math.sin(d) * 0.15; }
      P.happy = true;
    }
    if (rv.wob > 0) rot += Math.sin(t * 22) * rv.wob * 0.08;
    ctx.save(); ctx.translate(x, base); ctx.rotate(rot); ctx.scale(Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx, 1);
    if (sit) { ell(0, 2, 40, 7); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill(); }
    if (rc.kind === "person") drawPerson(rc, t, P);
    else if (rc.kind === "dog") drawDog(t, P);
    else if (rc.kind === "cat") drawCat(t, P);
    else if (rc.kind === "hamster") drawHamster(t, P);
    else drawPony(t, P);
    ctx.restore();
  }
  // A puffy cloud shape over (x, y, w, h).
  function cloud(x, y, w, h) {
    ctx.beginPath();
    const n = Math.max(4, Math.round(w / 34)), m = Math.max(2, Math.round(h / 34));
    const pts = [];
    for (let k = 0; k < n; k++) pts.push([x + w * (k + 0.5) / n, y, 0]);
    for (let k = 0; k < m; k++) pts.push([x + w, y + h * (k + 0.5) / m, 1]);
    for (let k = n - 1; k >= 0; k--) pts.push([x + w * (k + 0.5) / n, y + h, 2]);
    for (let k = m - 1; k >= 0; k--) pts.push([x, y + h * (k + 0.5) / m, 3]);
    rr(x, y, w, h, Math.min(w, h) * 0.3);
    const fill = () => { ctx.fillStyle = "#FFFFFF"; ctx.fill(); };
    fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    pts.forEach(([px, py, side]) => {
      const r = side % 2 ? h / m * 0.42 : w / n * 0.42;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); fill(); ctx.stroke();
    });
    rr(x, y, w, h, Math.min(w, h) * 0.3); fill();
  }
  // The thought bubble (what they love: a picture and words; a green tick once he picked it) and, once the
  // present is open, a speech bubble with what it is.
  function drawBubbles(t) {
    const rc = R(), b = L.bubble, hp = headPt(rc);
    const thinking = !at("play") && V.bubPop > 0.01;
    if (thinking) {
      const k = 0.6 + 0.4 * ease(V.bubPop), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      ctx.save(); ctx.globalAlpha = ease(V.bubPop); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
      // The little puffs from the head up to the bubble.
      const ax = hp.x + hp.r * 0.9, ay = hp.y - hp.r * 0.3, bx = b.x + 18, by = b.y + b.h - 8;
      [[0.25, 5], [0.5, 8], [0.78, 11]].forEach(([f, r]) => circle(lerp(ax, bx, f), lerp(ay, by, f) - Math.sin(f * Math.PI) * 10, r, "#FFFFFF", 2));
      cloud(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      const g = GIFT_BY[rc.wish], ps = Math.min(66, b.h * 0.5);
      drawGift(g.id, cx, b.y + 16 + ps / 2, ps, { t });
      text(g.a, cx, b.y + b.h - 30, 21, INK, 800);
      if (V.tickPop > 0.01) {
        const s = ease(V.tickPop);
        ctx.save(); ctx.translate(cx + ps * 0.62, b.y + 26); ctx.scale(s, s); tick(0, 0, 14); ctx.restore();
      }
      ctx.restore();
    }
    if (V.say && V.sayPop > 0.01) {
      const w = Math.min(b.w, 210), h = 74, x = b.x + (b.w - w) / 2, y = b.y + 22, cx = x + w / 2, k = 0.7 + 0.3 * ease(V.sayPop);
      ctx.save(); ctx.globalAlpha = ease(V.sayPop); ctx.translate(cx, y + h / 2); ctx.scale(k, k); ctx.translate(-cx, -(y + h / 2));
      rr(x, y, w, h, 18); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
      const tx = hp.x + hp.r + 6, ty = hp.y - 4;
      ctx.beginPath(); ctx.moveTo(x + 10, y + h - 26); ctx.lineTo(tx, ty); ctx.lineTo(x + 26, y + h - 2); ctx.closePath(); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x + 8, y + h - 30, 22, 26);
      text(V.say, cx, y + 24, 22, INK, 800);
      text("Thank you!", cx, y + 52, 21, "#2E9455", 800);
      ctx.restore();
    }
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  function want() {
    if (busy || V.rec.walk || V.tray.off > 0.05 && trayFor(B.step)) return null;
    const rc = R();
    switch (B.step) {
      case "pick": return { line: "Pick a present for " + rc.name + ".", part: "shelf" };
      case "lid": return { line: "Put the lid on the box.", part: "lid" };
      case "paper": return { line: "Roll a wrapping paper over the box.", part: "rolls" };
      case "tape": { const k = nextSeam(); return k < 0 ? null : { line: "Put tape on the folds of the paper.", part: "seam" + k }; }
      case "bow": return { line: "Put a ribbon and a bow on the present.", part: "bows" };
      case "give": return { line: "Give the present to " + rc.name + ".", part: "box" };
      case "open": return { line: "Pull the paper off the present for " + rc.name + ".", part: "box" };
      case "lift": return { line: "Lift the lid off the box.", part: "lidon" };
    }
    return null;
  }
  function partPt(part) {
    const g = boxG(), T = L.tray;
    if (part === "box") return { x: g.cx, y: g.cy - BD / 2, r: BW * 0.55 };
    if (part === "lidon") return { x: g.cx, y: g.yt - 6, r: BW * 0.5 };
    if (part === "lid") { const s = lidSlot(); return { x: s.x, y: s.y, r: BW * 0.5 }; }
    if (part === "shelf") { const S = L.shelf; return { x: S.x + S.w / 2, y: S.y + S.h / 2, r: S.h / 2 }; }
    if (part === "rolls" || part === "bows") return { x: T.x + T.w / 2, y: T.y + T.h / 2, r: T.h / 2 };
    if (part === "tape") { const d = dispSlot(); return { x: d.x, y: d.y, r: 56 }; }
    if (part === "rec") { const h = headPt(R()); return { x: h.x, y: h.y + 20, r: 50 }; }
    if (/^seam\d$/.test(part)) { const s = seams(paperG())[+part.slice(4)]; return { x: s.x, y: s.y, r: 22 }; }
    if (/^gift\d+$/.test(part)) { const s = shelfSlot(+part.slice(4)); return { x: s.x, y: s.y, r: s.s * 0.6 }; }
    if (/^roll\d$/.test(part)) { const s = rollSlot(+part.slice(4)); return { x: s.x, y: s.y, r: 30 }; }
    if (/^bow\d$/.test(part)) { const s = bowSlot(+part.slice(3)); return { x: s.x, y: s.y, r: 32 }; }
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked() || drag) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const ring = (x, y, r) => {
      ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 4, 0, TAU);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    };
    const box = (x0, y0, x1, y1, r) => {
      const gp = 3 + pulse * 4;
      rr(x0 - gp, y0 - gp, x1 - x0 + gp * 2, y1 - y0 + gp * 2, r + gp);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    };
    const T = L.tray, g = boxG();
    if (w.part === "shelf") { const S = L.shelf; box(S.x, S.y - 4, S.x + S.w, S.y + S.h - 2, 12); }
    else if (w.part === "rolls" || w.part === "bows") box(T.x, T.y - 4, T.x + T.w, T.y + T.h - 2, 12);
    else if (w.part === "box") box(g.x0 - 4, g.yt - g.d - 6, g.x1 + 4, g.yb + 2, 10);
    else if (w.part === "lidon") box(g.x0 - 6, g.yt - g.d - 10, g.x1 + 6, g.yt + 14, 10);
    else if (w.part === "lid") { const s = lidSlot(); box(s.x - BW / 2 - 8, s.y - BD - 2, s.x + BW / 2 + 8, s.y + 19, 10); }
    else { const p = partPt(w.part); if (p) ring(p.x, p.y, p.r); }
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = "";
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if (drag) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    const p = partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  // The ghost hand shows a tap first and the real move (a drag) after that.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag) return null;
      const w = want();
      if (!w) return null;
      const key = B.step, first = ghost.shown(key) < 1;
      const P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const g = boxG(), boxP = P(g.cx, g.cy - 10);
      if (B.step === "pick") {
        const s = shelfSlot(GIFT_BY[R().wish].i), a = P(s.x, s.y);
        return first ? { pts: [a], tap: true, key } : { pts: [a, P(g.cx, g.yt - 10)], dur: 1600, key };
      }
      if (B.step === "lid") { const s = lidSlot(), a = P(s.x, s.y); return first ? { pts: [a], tap: true, key } : { pts: [a, P(g.cx, g.yt)], dur: 1500, key }; }
      if (B.step === "paper") {
        const s = rollSlot(0), ln = rollLine(), a = P(s.x, s.y);
        if (first) return { pts: [a], tap: true, key };
        return L.unroll === "up" ? { pts: [a, P(ln.perp, ln.start), P(ln.perp, ln.end)], dur: 2200, key } : { pts: [a, P(ln.start, ln.perp), P(ln.end, ln.perp)], dur: 2200, key };
      }
      if (B.step === "tape") {
        const k = nextSeam(); if (k < 0) return null;
        const s = seams(paperG())[k], m = mouthPt();
        return first ? { pts: [P(s.x, s.y)], tap: true, key } : { pts: [P(m.x, m.y), P(s.x, s.y)], dur: 1400, key };
      }
      if (B.step === "bow") { const s = bowSlot(0), a = P(s.x, s.y); return first ? { pts: [a], tap: true, key } : { pts: [a, P(g.cx, g.yt - g.d / 2)], dur: 1500, key }; }
      if (B.step === "give") return first ? { pts: [boxP], tap: true, key } : { pts: [boxP, P(L.give.x, L.give.y - 10)], dur: 1400, key };
      if (B.step === "open") {
        if (first) return { pts: [boxP], tap: true, key };
        const pg = paperG(), pts = [];
        for (let k = 0; k <= 6; k++) pts.push(P(lerp(pg.x0 + 14, pg.x1 - 14, k / 6), k % 2 ? pg.yb - 14 : pg.yt - pg.d + 8));
        return { pts, dur: 2200, key };
      }
      if (B.step === "lift") { const a = P(g.cx, g.yt - 4); return first ? { pts: [a], tap: true, key } : { pts: [a, P(g.cx + 20, g.yt - 90)], dur: 1200, key }; }
      return null;
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  const NAMES = { box: "Box", lid: "Lid", tape: "Tape dispenser", window: "Window", wreath: "Wreath", present: "Present" };
  const inBox = (w, g, pad) => w.x >= g.x0 - pad && w.x <= g.x1 + pad && w.y >= g.yt - g.d - pad && w.y <= g.yb + pad;
  const trayIn = () => V.tray.off < 0.05;
  // The part under a press (client px). Every target is at least a fingertip wide, and the things he works with
  // right now come before the scenery behind them.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 26 / vs;
    let best = null, bd = Infinity;
    const cand = (id, x, y, r) => { const d = Math.hypot(w.x - x, w.y - y); if (d <= Math.max(r, minR) && d - r * 0.3 < bd) { bd = d - r * 0.3; best = id; } };
    const st = B.step, g = boxG(), k = V.tray.kind;
    if (st === "tape" && V.wrapped) seams(paperG()).forEach((s, i) => { if (!B.tapes[i]) cand("seam" + i, s.x, s.y, 24); });
    if (best) return best;
    if (trayIn() && k) {
      if (k === "shelf") GIFTS.forEach((gd, i) => { if (!(B.gift === gd.id && (V.giftIn || at("lid"))) && !(V.carry && V.carry.id === gd.id)) { const s = shelfSlot(i); cand("gift" + i, s.x, s.y, s.s * 0.62); } });
      else if (k === "lid" && !V.lidOn && !V.lidPose) { const s = lidSlot(); if (Math.abs(w.x - s.x) < BW / 2 + 10 && Math.abs(w.y - s.y) < 40) cand("lid", w.x, w.y, 1); }
      else if (k === "rolls") PAPERS.forEach((P, i) => {
        if (V.roll && V.roll.i === i) return;
        const s = rollSlot(i), up = L.unroll === "up";
        if (Math.abs(w.x - s.x) < (up ? s.len / 2 : s.dia / 2 + 8) && Math.abs(w.y - s.y) < (up ? s.dia / 2 + 8 : s.len / 2)) cand("roll" + i, w.x, w.y, 1 + i * 0.01);
      });
      else if (k === "tape") { const d = dispSlot(); if (Math.abs(w.x - d.x) < 70 && Math.abs(w.y - d.y) < 46) cand("tape", w.x, w.y, 2); }
      else if (k === "bows") BOWS.forEach((b, i) => { if (!(V.bowPose && V.bowPose.i === i)) { const s = bowSlot(i); cand("bow" + i, s.x, s.y, 34); } });
      if (best) return best;
    }
    if (V.boxAlpha > 0.5 && inBox(w, g, 8)) return st === "lift" && w.y < g.yt + 20 ? "lidon" : "box";
    if (V.gp && (st === "play")) { const gp = V.gp; cand("gift", gp.x, gp.y, gp.s * 0.6); if (best) return best; }
    // The one at the table.
    const rc = R(), hp = headPt(rc), base = recBase(rc);
    if (Math.abs(w.x - V.rec.x) < 54 && w.y > hp.y - hp.r - 30 && w.y < base + 6) return "rec";
    const b = L.bubble;
    if (V.bubPop > 0.5 && w.x > b.x && w.x < b.x + b.w && w.y > b.y && w.y < b.y + b.h) return "bubble";
    const wn = L.win;
    if (w.x > wn.x - 8 && w.x < wn.x + wn.w + 8 && w.y > wn.y - 8 && w.y < wn.y + wn.h + 14) return "window";
    if (L.wreath && Math.hypot(w.x - L.wreath.x, w.y - L.wreath.y) < 46) return "wreath";
    cards.forEach((c, i) => { const p = cardPt(i); cand("card" + i, p.x, p.y + 20, 16); });
    return best;
  }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    ghost.poke();
  }
  // A tap: each part does its own one motion. Parts not needed right now still answer (a wiggle and a name).
  function doTap(part, cx, cy) {
    if (locked() || part == null) return;
    const st = B.step, g = boxG();
    if (/^gift\d+$/.test(part)) {
      const i = +part.slice(4), gd = GIFTS[i];
      if (st === "pick" && !busy) { ghost.learned("pick"); pickGift(gd.id); }
      else { V.swob[i] = 1; const s = shelfSlot(i); tag(gd.name, s.x, s.y - s.s * 0.5); }
    } else if (part === "lid" || (part === "box" && st === "lid")) {
      if (st === "lid" && !busy) { ghost.learned("lid"); lidOn(); }
    } else if (/^roll\d$/.test(part)) {
      const i = +part.slice(4);
      if (st === "paper" && !busy) { ghost.learned("paper"); rollAuto(i); }
      else { V.rwob[i] = 1; const s = rollSlot(i); tag(PAPERS[i].name, s.x, s.y - 20); }
    } else if (/^seam\d$/.test(part)) { ghost.learned("tape"); tapeSeam(+part.slice(4)); }
    else if (part === "tape" || (part === "box" && st === "tape")) { ghost.learned("tape"); if (nextSeam() >= 0) tapeSeam(nextSeam()); else { V.dwob = 1; const d = dispSlot(); tag(NAMES.tape, d.x, d.y - 40); } }
    else if (/^bow\d$/.test(part)) {
      const i = +part.slice(3);
      if (st === "bow" && !busy) { ghost.learned("bow"); bowOn(i); }
      else { V.bwob[i] = 1; const s = bowSlot(i); tag(BOWS[i].name, s.x, s.y - 26); }
    } else if (part === "box") {
      if (st === "give" && !busy) { ghost.learned("give"); giveIt(); }
      else if (st === "open") { ghost.learned("open"); ripStrip(wpt(cx, cy).x); }
      else if (st === "lift" && !busy) { ghost.learned("lift"); liftLid(); }
      else { V.boxWob = 0.6; tag(V.wrapped ? NAMES.present : NAMES.box, g.cx, g.yt - g.d); if (st === "pick" || st === "paper" || st === "bow") hint(); }
    } else if (part === "lidon") { if (st === "lift" && !busy) { ghost.learned("lift"); liftLid(); } }
    else if (part === "rec") {
      const rc = R();
      if (st === "give" && !busy) { ghost.learned("give"); giveIt(); return; }
      hopRec(220); V.rec.happy = Math.max(V.rec.happy, now() + 1.2);
      const h = headPt(rc); tag(rc.tag, h.x, h.y - h.r - 30);
    } else if (part === "bubble") {
      const gd = GIFT_BY[R().wish], b = L.bubble; V.bubPop = 0.85; tween(0.25, (p) => { V.bubPop = lerp(0.85, 1, ease(p)); });
      tag(gd.name, b.x + b.w / 2, b.y);
    } else if (part === "gift") { const gp = V.gp; if (gp) { hopRec(240); tag(GIFT_BY[B.gift].name, gp.x, gp.y - gp.s * 0.6); } }
    else if (part === "window") { V.winWob = 1; snowUntil = Math.max(snowUntil, now() + 2.5); tag(NAMES.window, L.win.x + L.win.w / 2, L.win.y); }
    else if (part === "wreath") { tag(NAMES.wreath, L.wreath.x, L.wreath.y - 40); puff("spark", L.wreath.x, L.wreath.y, 5); }
    else if (/^card\d+$/.test(part)) {
      const i = +part.slice(4), c = cards[i];
      if (!c) return;
      V.cardWob[i] = 1;
      const p = cardPt(i); tag(GIFT_BY[c.g].a + " for " + REC_BY[c.r].name, p.x, p.y + 4);
    }
  }

  // Drags: the part follows his finger and the real thing happens while he does it. One finger owns the drag;
  // others are ignored until it lifts. A press held still and let go in place counts as that part's tap.
  const SLOP = 12;
  let skipTap = false;
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null) return;
      startDrag(part, s);
      if (!drag) drag = { k: "hold", part };
      drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy); drag.cx = s.x0; drag.cy = s.y0;
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const w = wpt(s.x, s.y);
      if (drag.k === "gift" && V.carry) { V.carry.x = w.x + drag.ox; V.carry.y = w.y + drag.oy; V.carry.s = lerp(V.carry.s, inBox(V.carry, boxG(), 30) ? GIFT_IN_S : drag.s0, 0.2); }
      else if (drag.k === "lid" && V.lidPose) { V.lidPose.x = w.x + drag.ox; V.lidPose.y = w.y + drag.oy; }
      else if (drag.k === "roll" && V.roll) {
        const ln = rollLine(), r = V.roll, nx = w.x + drag.ox, ny = w.y + drag.oy;
        // Past the start line the roll keeps lined up with the box (stepRoll eases it in).
        if (L.unroll === "up") { r.y = ny; if (rollProg(r) <= 0) r.x = nx; } else { r.x = nx; if (rollProg(r) <= 0) r.y = ny; }
        void ln;
      } else if (drag.k === "tape" && V.tapeCarry) { V.tapeCarry.x = w.x; V.tapeCarry.y = w.y - 14; }
      else if (drag.k === "bow" && V.bowPose) { V.bowPose.x = w.x + drag.ox; V.bowPose.y = w.y + drag.oy; }
      else if (drag.k === "give") {
        V.box.x = clamp(w.x + drag.ox, L.give.x - 40, L.wrap.x + 60); V.box.y = clamp(w.y + drag.oy, L.give.y - 30, L.wrap.y + 40);
      } else if (drag.k === "tear") { tearLine(drag.last, w); drag.last = w; }
      else if (drag.k === "lift") { const g = boxG(); V.lidOff.x = g.cx + clamp(w.x + drag.ox - g.cx, -30, 30); V.lidOff.y = Math.min(g.yt + 5, w.y + drag.oy); }
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (s.tap) skipTap = true;
      if (locked()) { cancelCarry(d); return; }
      const g = boxG();
      if (d.k === "hold") { if (still) doTap(d.part, d.cx, d.cy); }
      else if (d.k === "gift") {
        const c = V.carry;
        busy = false;
        if (still || inBox(c, g, 34)) pickGift(c.id, { x: c.x, y: c.y, s: c.s });
        else giftBack(c);
      } else if (d.k === "lid") {
        const lp = V.lidPose; busy = false;
        if (still || Math.hypot(lp.x - g.cx, lp.y - g.yt) < 90) { V.lidPose = null; lidOn({ x: lp.x, y: lp.y }); }
        else lidBack(lp);
      } else if (d.k === "roll") {
        const r = V.roll; busy = false;
        if (!r) return;
        r.held = false;
        if (still || rollProg(r) > 0.25) rollAuto(r.i, { x: r.x, y: r.y });
        else { rollBackTo(r.i, r); hint(); }
      } else if (d.k === "tape") {
        const c = V.tapeCarry; V.tapeCarry = null;
        if (!c) return;
        let k = -1, kd = Infinity;
        seams(paperG()).forEach((sm, i) => { if (!B.tapes[i] && !V.tapePend[i]) { const dd = Math.hypot(c.x - sm.x, c.y - sm.y); if (dd < kd) { kd = dd; k = i; } } });
        if (still) tapeSeam(nextSeam());
        else if (k >= 0 && (kd < 60 || inBox(c, g, 20))) tapeSeam(k, c);
        else { const fl = { x: c.x, y: c.y }, m = mouthPt(); V.tapeFly.push(fl); tween(0.25, (p) => { fl.x = lerp(c.x, m.x, p); fl.y = lerp(c.y, m.y, p); }, () => V.tapeFly.splice(V.tapeFly.indexOf(fl), 1)); }
      } else if (d.k === "bow") {
        const bp = V.bowPose; busy = false;
        if (still || inBox(bp, g, 30)) { V.bowPose = null; bowOn(bp.i, { x: bp.x, y: bp.y }); }
        else bowBack(bp);
      } else if (d.k === "give") {
        busy = false;
        const to = L.give, fr = L.wrap;
        const dg = Math.hypot(V.box.x - to.x, V.box.y - to.y), dw = Math.hypot(V.box.x - fr.x, V.box.y - fr.y);
        if (still || dg < dw * 1.2) giveIt({ x: V.box.x, y: V.box.y });
        else { const f = { x: V.box.x, y: V.box.y }; tween(0.3, (p) => { V.box.x = lerp(f.x, fr.x, ease(p)); V.box.y = lerp(f.y, fr.y, ease(p)); }); hint(); }
      } else if (d.k === "tear") { if (still) ripStrip(wpt(d.cx, d.cy).x); }
      else if (d.k === "lift") {
        busy = false;
        const lo = V.lidOff, on = g.yt + 5;
        if (still || on - lo.y > 26) liftLid({ x: lo.x, y: lo.y });
        else { const y0 = lo.y, x0 = lo.x; tween(0.2, (p) => { lo.x = lerp(x0, g.cx, p); lo.y = lerp(y0, on, p); }, () => { V.lidOff = null; V.lidOn = true; }); }
      }
    },
    tap: (part, x, y) => {
      if (skipTap) { skipTap = false; return; }
      if (!drag) doTap(part, x, y);
    }
  });
  // Starts the drag for a part (sets drag), or answers at once.
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0), st = B.step, g = boxG();
    if (/^gift\d+$/.test(part) && st === "pick" && !busy) {
      const i = +part.slice(4), sl = shelfSlot(i);
      busy = true;
      drag = { k: "gift", ox: sl.x - w0.x, oy: sl.y - w0.y - 10, s0: sl.s * 1.15 };
      V.carry = { id: GIFTS[i].id, x: w.x + drag.ox, y: w.y + drag.oy, s: sl.s * 1.15, held: true };
      ghost.learned("pick");
    } else if (part === "lid" && st === "lid" && !busy) {
      const sl = lidSlot();
      busy = true;
      drag = { k: "lid", ox: sl.x - w0.x, oy: sl.y + 8 - w0.y - 10 };
      V.lidPose = { x: w.x + drag.ox, y: w.y + drag.oy };
      ghost.learned("lid");
    } else if (/^roll\d$/.test(part) && st === "paper" && !busy) {
      const i = +part.slice(4), sl = rollSlot(i);
      busy = true;
      drag = { k: "roll", ox: sl.x - w0.x, oy: sl.y - w0.y };
      V.roll = { i, x: w.x + drag.ox, y: w.y + drag.oy, held: true, prog: 0 };
      ghost.learned("paper");
    } else if ((part === "tape" || /^seam\d$/.test(part)) && st === "tape") {
      if (/^seam\d$/.test(part)) { tapeSeam(+part.slice(4)); drag = { k: "done" }; return; }
      drag = { k: "tape" };
      V.tapeCarry = { x: w.x, y: w.y - 14 };
      V.dwob = 0.6;
      ghost.learned("tape");
    } else if (/^bow\d$/.test(part) && st === "bow" && !busy) {
      const i = +part.slice(3), sl = bowSlot(i);
      busy = true;
      drag = { k: "bow", ox: sl.x - w0.x, oy: sl.y - w0.y - 10 };
      V.bowPose = { i, x: w.x + drag.ox, y: w.y + drag.oy, s: 1 };
      ghost.learned("bow");
    } else if ((part === "box" || part === "rec") && st === "give" && !busy) {
      if (part === "rec") { giveIt(); drag = { k: "done" }; return; }
      busy = true;
      drag = { k: "give", ox: V.box.x - w0.x, oy: V.box.y - w0.y };
      ghost.learned("give");
    } else if (part === "box" && st === "open") {
      drag = { k: "tear", last: w0 };
      tearLine(w0, w);
      drag.last = w;
      ghost.learned("open");
    } else if ((part === "box" || part === "lidon") && st === "lift" && !busy) {
      busy = true;
      V.lidOn = false;
      V.lidOff = { x: g.cx, y: g.yt + 5, ang: 0, a: 1 };
      drag = { k: "lift", ox: g.cx - w0.x, oy: g.yt + 5 - w0.y };
      ghost.learned("lift");
    }
  }
  // Let go somewhere else: the part goes back where it came from.
  function giftBack(c) {
    const i = GIFT_BY[c.id].i, sl = shelfSlot(i), f = { x: c.x, y: c.y, s: c.s };
    V.carry = { id: c.id, x: f.x, y: f.y, s: f.s };
    const cc = V.carry;
    busy = true;
    tween(0.35, (p) => { const e = ease(p); cc.x = lerp(f.x, sl.x, e); cc.y = lerp(f.y, sl.y, e); cc.s = lerp(f.s, sl.s, e); }, () => { V.carry = null; busy = false; V.swob[i] = 0.6; hint(); });
  }
  function lidBack(lp) {
    const sl = lidSlot(), f = { x: lp.x, y: lp.y };
    busy = true;
    tween(0.35, (p) => { lp.x = lerp(f.x, sl.x, ease(p)); lp.y = lerp(f.y, sl.y + 8, ease(p)); }, () => { V.lidPose = null; busy = false; hint(); });
  }
  function bowBack(bp) {
    const sl = bowSlot(bp.i), f = { x: bp.x, y: bp.y };
    busy = true;
    tween(0.3, (p) => { bp.x = lerp(f.x, sl.x, ease(p)); bp.y = lerp(f.y, sl.y, ease(p)); }, () => { V.bowPose = null; busy = false; hint(); });
  }
  function cancelCarry(d) {
    if (d.k === "gift" && V.carry) giftBack(V.carry);
    else if (d.k === "lid" && V.lidPose) lidBack(V.lidPose);
    else if (d.k === "roll" && V.roll) { busy = false; rollBackTo(V.roll.i, V.roll); }
    else if (d.k === "bow" && V.bowPose) bowBack(V.bowPose);
    else if (d.k === "tape") V.tapeCarry = null;
    else if (d.k === "give") { busy = false; V.box.x = L.wrap.x; V.box.y = L.wrap.y; }
    else if (d.k === "lift") { busy = false; V.lidOff = null; V.lidOn = true; }
  }

  // =====================================================================================================
  // Panel and surprise
  // =====================================================================================================
  // New: the present starts over for the one at the table (a walk-in or walk-out in progress finishes at once).
  function newTap() {
    if (locked()) return;
    if (B.step === "out") who = (who + 1) % RECIPS.length;
    const sayBack = B.step !== "pick" || B.gift;
    newBuildFor(false);
    V.bubPop = 1;
    if (sayBack) puff("spark", L.wrap.x, L.wrap.y - 40, 6);
  }
  Toybox.bar($("bottom"), { shelf: null, onNew: newTap, onSurprise: surprise });
  // Takes turns between three live moments: they dance (the dog chases its tail), snow flurries past the
  // window, and a toy train chugs along the back of the table.
  let surpriseNext = 0;
  function surprise() {
    if (locked()) return;
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    if (k === 0) { V.rec.dance = now() + (reduce ? 1.6 : 3); V.rec.happy = Math.max(V.rec.happy, now() + 3); }
    else if (k === 1) { snowUntil = now() + 6; V.winWob = 0.5; }
    else actor = { t0: now(), dur: reduce ? 9 : 7 };
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    stepRoll(dt);
    // A hop springs up and comes down.
    const rv = V.rec;
    if (rv.vy || rv.hop > 0) { rv.hop += rv.vy * dt; rv.vy -= 1300 * dt; if (rv.hop <= 0) { rv.hop = 0; rv.vy = 0; } }
    if (B.step !== "open" && B.step !== "give" && B.step !== "lift" && B.step !== "play" && rv.reach > 0) rv.reach = Math.max(0, rv.reach - dt * 2);
    rv.wob = Math.max(0, rv.wob - dt * 2);
    V.boxWob = Math.max(0, V.boxWob - dt * 2);
    V.swob = V.swob.map((v) => Math.max(0, v - dt * 2));
    V.rwob = V.rwob.map((v) => Math.max(0, v - dt * 2));
    V.bwob = V.bwob.map((v) => Math.max(0, v - dt * 2));
    V.cardWob = V.cardWob.map((v) => Math.max(0, (v || 0) - dt * 1.5));
    V.dwob = Math.max(0, V.dwob - dt * 2);
    V.lwob = Math.max(0, V.lwob - dt * 2);
    V.winWob = Math.max(0, V.winWob - dt * 1.5);
    if (cardDrop < 1) cardDrop = Math.min(1, cardDrop + dt * 1.6);
    // The tray slides out, changes, and slides back in.
    const tr = V.tray;
    tr.target = B.step === "pick" && rv.walk && rv.x < L.rec - 90 ? "" : trayFor(B.step);
    if (tr.kind !== tr.target) {
      if (!tr.kind) { tr.kind = tr.target; tr.off = 1; }
      else { tr.off = Math.min(1, tr.off + dt * 2.4); if (tr.off >= 1) { tr.kind = tr.target; tr.off = tr.kind ? 1 : 0; } }
    } else if (tr.off > 0) tr.off = Math.max(0, tr.off - dt * 2.4);
    updateCoach();
    draw(t, dt);
    requestAnimationFrame(frame);
  }
  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawRoom(t);
    drawWindow(t, dt);
    drawWreath(t);
    drawGarland(t);
    drawRecipient(t, "behind");
    // Redraw the table's back edge over anyone standing behind it.
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const by = voy + L.back * vs;
    ctx.fillStyle = "#E9B57D"; ctx.fillRect(0, by, W, H - by);
    ctx.fillStyle = "#E0A86E"; const ph = 46 * vs;
    for (let y = by + ph; y < H; y += ph) ctx.fillRect(0, y, W, 2 * Math.max(1, vs * 0.8));
    ctx.fillStyle = "#D99E62"; ctx.fillRect(0, by, W, 8 * vs);
    ctx.strokeStyle = INK; ctx.lineWidth = LW * vs; ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.stroke();
    ctx.restore();
    drawActor(t);
    drawRecipient(t, "table");
    drawTray(t);
    drawPresent(t);
    drawPlayGift(t);
    drawRolling(t);
    drawMoving(t);
    drawParts();
    drawBubbles(t);
    drawRing(t);
  }
  function onEnding(done) {
    ending = true;
    drag = null; press.cancel();
    setTimeout(done, 1500);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 100 100">' +
      '<g fill="#FFFFFF"><circle cx="18" cy="20" r="2.5"/><circle cx="80" cy="16" r="2"/><circle cx="66" cy="30" r="1.8"/><circle cx="30" cy="34" r="1.6"/><circle cx="86" cy="40" r="2.2"/></g>' +
      '<rect x="24" y="48" width="52" height="36" rx="3" fill="#E8303F" stroke="#1D2340" stroke-width="2.5"/>' +
      '<rect x="20" y="38" width="60" height="12" rx="3" fill="#E8303F" stroke="#1D2340" stroke-width="2.5"/>' +
      '<rect x="46" y="38" width="8" height="46" fill="#FFC93C" stroke="#1D2340" stroke-width="2"/>' +
      '<ellipse cx="40" cy="32" rx="11" ry="7" transform="rotate(20 40 32)" fill="#FFC93C" stroke="#1D2340" stroke-width="2.5"/>' +
      '<ellipse cx="60" cy="32" rx="11" ry="7" transform="rotate(-20 60 32)" fill="#FFC93C" stroke="#1D2340" stroke-width="2.5"/>' +
      '<rect x="45" y="30" width="10" height="9" rx="3" fill="#FFC93C" stroke="#1D2340" stroke-width="2"/></svg>';
  }

  resize();
  placeAll();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "christmas",
    badge: $("tbadge"),
    timerIntro: "When time is up, the presents are put away and the controls lock.",
    goodbyeOption: "End with a “Goodbye, presents” button to press",
    farewellText: "Time to put the presents away",
    goodbyeLabel: "Goodbye, presents",
    farewellDone: "Bye bye, presents!",
    restLine: "All the presents are wrapped.",
    restLine2: "They will wait under the tree. Merry Christmas.",
    restArt,
    onEnding,
    onWake: () => { ending = false; }
  });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    // Does the next wanted thing, the way a tap would.
    const next = () => {
      if (busy || V.rec.walk) return "wait";
      const st = B.step;
      if (st === "pick") pickGift(R().wish);
      else if (st === "lid") lidOn();
      else if (st === "paper") rollAuto(0);
      else if (st === "tape") tapeSeam(nextSeam());
      else if (st === "bow") bowOn(0);
      else if (st === "give") giveIt();
      else if (st === "open") {
        let c = 0;
        while (c < COLS - 1 && [...Array(ROWS).keys()].every((r) => V.torn[r * COLS + c])) c++;
        const g = paperG(); ripStrip(g.x0 + (c + 0.5) * (g.x1 - g.x0) / COLS);
      }
      else if (st === "lift") liftLid();
      else if (st === "play") goOut();
      else return "wait";
      return st;
    };
    window.__toybox = {
      state: () => {
        const w = want();
        return { step: B.step, who: R().id, wish: R().wish, gift: B.gift, matched: !!matched(), paper: B.paper, tapes: B.tapes.join(""), bow: B.bow,
          covered: covered(), cards: cards.length, tray: V.tray.kind, busy, walking: V.rec.walk, wanted: w && w.part, coach: coach.text() };
      },
      next,
      tap: (part) => doTap(part, 0, 0),
      pick: (id) => pickGift(id || R().wish),
      lid: () => lidOn(),
      paper: (i) => rollAuto(i || 0),
      tape: (k) => tapeSeam(k == null ? nextSeam() : k),
      bow: (i) => bowOn(i || 0),
      give: () => giveIt(),
      tear: (u0, v0, u1, v1) => { const g = paperG(), P = (u, v) => ({ x: lerp(g.x0, g.x1, u), y: lerp(g.yt - g.d, g.yb, v) }); tearLine(P(u0, v0), P(u1, v1)); },
      rip: (u) => { const g = paperG(); ripStrip(lerp(g.x0, g.x1, u == null ? 0.5 : u)); },
      lift: () => liftLid(),
      out: () => goOut(),
      newTap,
      surprise,
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      hit: (x, y) => hitPart(x, y),
      ghost: () => ghost.show()
    };
  }
})();
