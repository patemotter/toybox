(function () {
  "use strict";
  // Christmas · Presents: a wrapping table seen from where he stands. Someone comes in (a dog, a builder in a hard
  // hat and vest, a cat, a girl in a train-driver cap, a hamster, a baker in an apron, a pony, a farmer, a painter
  // with a beret, an astronaut; one at a time, a calm walk-in). Nobody says what they want: who they are and what
  // they wear are the only clues, there is no right answer, and every gift gets real delight. He makes a present
  // with his hands on the scene: a drag does the real motion as he moves, and a tap plays that one step. Three
  // jobs, as folder tabs under the stage:
  //   Box: put a present in the box (the lid closes by itself); pull paper off a roll (8 papers: Christmas ones and
  //     diggers, trains, rockets, paw prints); cut it along the dotted line (the scissors follow his finger); set
  //     the box on the paper; fold the far side and the near side up over the box; pull a piece of tape off the
  //     dispenser onto the seam; at each end fold the corners in, fold the end flap up and tape it; wrap a ribbon
  //     round both ways (4 colors); pull out both bow loops; slide the scissors along each ribbon end to curl it.
  //     A gift tag and stickers are extras, never a step.
  //   Bag: pick a gift bag (6 prints), put a present in, stuff tissue paper in (it fluffs up out of the top), hang
  //     the tag on the handle.
  //   Stocking: drop small things into the stocking on the mantel (candy cane, orange, toy car, bouncy ball,
  //     crayons, little book, bell, chocolate coin). It bulges as it fills, things poke out of the top.
  // Then he gives it (slide it across, or tap). They open it themselves, quickly and happily, and play with it in a
  // way that fits the gift (the dog chases the ball, anyone hugs the teddy, the builder drives the toy digger).
  // Then they give HIM a small present (a little box, a little bag or a cracker, taking turns) and he opens it
  // himself, side by side with them: the paper tears exactly where his finger goes, he pulls the tissue out, or he
  // pulls the cracker's end. A small surprise pops out and hangs on the garland along the top (kept across visits,
  // the last 12). When the fun settles they wave and go, and the next one walks in by themselves.
  // A yellow ring and one instruction show the next part; everything else answers a touch (a wiggle and its name).
  // Surprise takes turns: they dance (the dog chases its tail), snow flurries past the window, a toy train chugs
  // along the table. New starts the present over. Debris (paper scraps, confetti) fades within about 1.2 s.
  // Units: the scene is drawn in world units (TALL or WIDE, picked from the stage's shape) and scaled to fit the
  // stage; x to the right, y down. The wrapping is seen from above, the people and animals from the front.
  //
  // Sections:
  //   Setup and saved state
  //   Things: recipients, gifts, stocking stuffers, surprises, papers, bags, ribbons
  //   Layout
  //   Tweens and particles
  //   The round: jobs, builds and steps
  //   Box: gift, paper, cut, place
  //   Box: folds and tape
  //   Box: ribbon, bow, curls and extras
  //   Bag and stocking
  //   Giving, opening together and the next one
  //   Drawing helpers
  //   Drawing things: gifts, stuffers and surprises
  //   Drawing papers, rolls, tools and the wrap
  //   Drawing the bag, the stocking and the fireplace
  //   Drawing his small present
  //   Drawing the room, the tray and the garland
  //   Drawing the recipients
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Panel, jobs and surprise
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
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  // Save format v2: { v: 2, who, job, round, treats: [surprise id], k: the present being made }. The first
  // version ({ cards, who, b }) only gives its recipient (who); its cards were the presents he gave, not his.
  const KEY = "christmas-presents-v1";
  const TREATS_MAX = 12;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const fresh = Toybox.fresh();

  // =====================================================================================================
  // Things: recipients, gifts, stocking stuffers, surprises, papers, bags, ribbons
  // =====================================================================================================
  // Real people and animals, named by what they are (never a family title or a personal name). What they wear is
  // the only clue to who they are; nobody wants anything in particular.
  const RECIPS = [
    { id: "dog", kind: "dog", name: "the dog", tag: "Dog" },
    { id: "builder", kind: "person", role: "builder", name: "the builder", tag: "Builder", skin: "#C68B59", hair: "#3B2A20", shirt: "#3D6FD8" },
    { id: "cat", kind: "cat", name: "the cat", tag: "Cat" },
    { id: "girl", kind: "person", role: "girl", kid: true, name: "the girl", tag: "A girl in a train-driver cap", skin: "#E8B48A", hair: "#7A4A2A", shirt: "#E8303F" },
    { id: "hamster", kind: "hamster", name: "the hamster", tag: "Hamster" },
    { id: "baker", kind: "person", role: "baker", name: "the baker", tag: "Baker", skin: "#F2C9A0", hair: "#C9853A", shirt: "#FFFFFF" },
    { id: "pony", kind: "pony", name: "the pony", tag: "Pony" },
    { id: "farmer", kind: "person", role: "farmer", name: "the farmer", tag: "Farmer", skin: "#8D5A3B", hair: "#2B1D14", shirt: "#E8494F" },
    { id: "painter", kind: "person", role: "painter", name: "the painter", tag: "Painter", skin: "#6B4430", hair: "#1E1410", shirt: "#FFFFFF" },
    { id: "astronaut", kind: "person", role: "astronaut", name: "the astronaut", tag: "Astronaut", skin: "#F0C7A0", hair: "#5A3A22", shirt: "#F4F6FA" }
  ];
  // The toy shelf (no faces on any of them except the teddy's stitched eyes and nose, always there).
  // play = how it is played with once it is opened.
  const GIFTS = [
    { id: "ball", name: "Ball", a: "A ball", play: "bounce" },
    { id: "bone", name: "Bone", a: "A bone", play: "chew" },
    { id: "teddy", name: "Teddy bear", a: "A teddy bear", play: "hug" },
    { id: "yarn", name: "Yarn ball", a: "A yarn ball", play: "roll" },
    { id: "digger", name: "Toy digger", a: "A toy digger", play: "drive" },
    { id: "train", name: "Toy train", a: "A toy train", play: "drive" },
    { id: "tractor", name: "Toy tractor", a: "A toy tractor", play: "drive" },
    { id: "rocket", name: "Toy rocket", a: "A toy rocket", play: "fly" },
    { id: "carrots", name: "Carrots", a: "Carrots", play: "chew" },
    { id: "blocks", name: "Blocks", a: "Blocks", play: "bounce" },
    { id: "book", name: "Book", a: "A book", play: "hug" },
    { id: "paint", name: "Paint set", a: "A paint set", play: "wiggle" }
  ];
  const STUFF = [
    { id: "cane", name: "Candy cane" }, { id: "orange", name: "Orange" }, { id: "car", name: "Toy car" },
    { id: "bball", name: "Bouncy ball" }, { id: "crayons", name: "Crayons" }, { id: "minibook", name: "Little book" },
    { id: "bell", name: "Bell" }, { id: "coin", name: "Chocolate coin" }
  ];
  // His small surprises (what pops out of the present they give him).
  const TREATS = [
    { id: "sticker", name: "A star sticker" }, { id: "cane", name: "A candy cane" }, { id: "train", name: "A tiny toy train" },
    { id: "bell", name: "A bell" }, { id: "cookie", name: "A star cookie" }, { id: "flake", name: "A snowflake ornament" },
    { id: "car", name: "A tiny toy car" }, { id: "rocket", name: "A tiny rocket" }, { id: "marble", name: "A marble" },
    { id: "digger", name: "A tiny digger" }
  ];
  const BY = (list) => { const m = {}; list.forEach((x, i) => { m[x.id] = x; x.i = i; }); return m; };
  BY(RECIPS); const GIFT_BY = BY(GIFTS), STUFF_BY = BY(STUFF), TREAT_BY = BY(TREATS);
  // Papers: four Christmas ones and four with toys and animals. Any paper is fine for anyone.
  const PAPERS = [
    { id: "stars", name: "Red with stars", bg: "#E8303F", fg: "#FFD23B" },
    { id: "trees", name: "Green with trees", bg: "#36B25E", fg: "#17703A" },
    { id: "snow", name: "Blue with snowflakes", bg: "#3B82E0", fg: "#FFFFFF" },
    { id: "stripes", name: "Candy stripes", bg: "#FFFFFF", fg: "#E8303F" },
    { id: "diggers", name: "Diggers", bg: "#9AD7FF", fg: "#FFC21A" },
    { id: "trains", name: "Trains", bg: "#BDEBC9", fg: "#E8303F" },
    { id: "rockets", name: "Rockets and stars", bg: "#27336B", fg: "#FFFFFF" },
    { id: "paws", name: "Paw prints and bones", bg: "#FFD9A8", fg: "#8A5530" }
  ];
  const PAPER_BY = BY(PAPERS);
  const BAGS = [
    { id: "redbag", name: "Red bag with stars", paper: "stars" },
    { id: "greenbag", name: "Green bag with trees", paper: "trees" },
    { id: "bluebag", name: "Blue bag with snowflakes", paper: "snow" },
    { id: "diggerbag", name: "Bag with diggers", paper: "diggers" },
    { id: "rocketbag", name: "Bag with rockets", paper: "rockets" },
    { id: "pawbag", name: "Bag with paw prints", paper: "paws" }
  ];
  const BAG_BY = BY(BAGS);
  const RIBBONS = [
    { id: "gold", name: "Gold ribbon", hex: "#FFC93C" }, { id: "white", name: "White ribbon", hex: "#F7F8FC" },
    { id: "blue", name: "Blue ribbon", hex: "#2F8CFF" }, { id: "pink", name: "Pink ribbon", hex: "#FF6FA8" }
  ];
  const TISSUE = ["#FFFFFF", "#FFB8D2", "#B8F0D8", "#FFE59A"];
  const STICKERS = [{ id: "star", name: "Star sticker" }, { id: "flake", name: "Snowflake sticker" }, { id: "holly", name: "Holly sticker" }];
  const JOBS = [{ id: "box", name: "Box" }, { id: "bag", name: "Bag" }, { id: "stocking", name: "Stocking" }];

  let treats = Array.isArray(saved.treats) ? saved.treats.filter((t) => TREAT_BY[t]).slice(-TREATS_MAX) : [];

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Two layouts in world units: TALL (upright) and WIDE (sideways). back = the table's back edge; rec = where the
  // recipient stands; mat = where the box's top sits once it is on the paper (also the bag and his present);
  // wait = where the closed box waits while the paper is cut; tray = the tools for the step; shelf = the toy
  // shelf and the paper rolls (bigger); give = where their present lands and is played with.
  const TALL = {
    w: 400, h: 740, back: 280, rec: 80,
    win: { x: 232, y: 62, w: 150, h: 118 }, garland: { x0: 6, x1: 394, y: 10 },
    mat: { x: 190, y: 404 }, wait: { x: 158, y: 294, s: 0.5 }, give: { x: 172, y: 316 }, mine: { x: 214, y: 430 }, bs: 1.35, ms: 1.3,
    tray: { x: 10, y: 556, w: 380, h: 178 }, shelf: { x: 10, y: 520, w: 380, h: 214, cols: 4 },
    fire: { x: 46, y: 300, w: 300, h: 236 }, wreath: null
  };
  const WIDE = {
    w: 820, h: 440, back: 200, rec: 100,
    win: { x: 412, y: 40, w: 128, h: 108 }, garland: { x0: 180, x1: 814, y: 6 },
    mat: { x: 364, y: 302 }, wait: { x: 206, y: 304, s: 0.62 }, give: { x: 200, y: 236 }, mine: { x: 376, y: 322 }, bs: 1.1, ms: 1.1,
    tray: { x: 566, y: 214, w: 246, h: 220 }, shelf: { x: 566, y: 92, w: 246, h: 342, cols: 3 },
    fire: { x: 236, y: 198, w: 280, h: 238 }, wreath: { x: 640, y: 96 }
  };
  // The box seen from above: a top face BW x BD and a strip of its front face BF. The paper reaches FF past the
  // far edge, NF past the front's bottom edge (so it goes up the front and over the top) and E past each end.
  // Each layout scales these (bs) so the wrap is as big as the stage allows.
  let BW = 112, BD = 64, BF = 20, FF = 38, NF = 58, E = 40, OV = BD * 0.56;
  function setBox() {
    const k = L.bs;
    BW = 112 * k; BD = 64 * k; BF = 20 * k; FF = 38 * k; NF = 58 * k; E = 40 * k; OV = BD * 0.56;
    MW = 100 * L.ms; MH = 58 * L.ms; MD = 24 * L.ms;
  }
  let L = TALL, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const was = L;
    L = W / H > 1.05 ? WIDE : TALL;
    setBox();
    vs = Math.min(W / L.w, H / L.h) * 0.98;
    // Spare height goes mostly below the scene (more table), so the garland stays near the top of the wall.
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) * 0.2;
    if (was !== L) placeAll();
  }
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  // The wrap's geometry for a box whose top face is centered on (cx, cy).
  function geo(cx, cy) {
    const x0 = cx - BW / 2, x1 = cx + BW / 2, y0 = cy - BD / 2, y1 = cy + BD / 2;
    return { cx, cy, x0, x1, y0, y1, yf: y1 + BF, sx0: x0 - E, sx1: x1 + E, sy0: y0 - FF, sy1: y1 + BF + NF, mid: (y0 + y1 + BF) / 2, seam: y1 - OV };
  }
  const matG = () => geo(L.mat.x, L.mat.y);
  // Tray slots: n things in a grid of cols across the rect R.
  function grid(R, n, cols, i, pad) {
    const rows = Math.ceil(n / cols), c = i % cols, r = Math.floor(i / cols), cw = R.w / cols, rh = R.h / rows;
    return { x: R.x + cw * (c + 0.5), y: R.y + rh * (r + 0.5) + (pad || 0), s: Math.min(cw, rh), cw, rh };
  }
  const shelfSlot = (i) => { const g = grid(L.shelf, GIFTS.length, L.shelf.cols, i, 4); g.s = Math.min(g.cw * 0.66, g.rh * 0.66); return g; };
  // Paper rolls: lying in the tray when upright (2 x 4), standing in the shelf when sideways (4 x 2).
  function rollSlot(i) {
    if (L === TALL) { const g = grid(L.tray, 8, 2, i); return { x: g.x, y: g.y, len: g.cw - 16, dia: 30, ang: 0 }; }
    const g = grid(L.shelf, 8, 4, i); return { x: g.x, y: g.y, len: g.rh - 22, dia: 30, ang: Math.PI / 2 };
  }
  const bagSlot = (i) => (L === TALL ? grid(L.tray, 6, 3, i, 6) : grid(L.shelf, 6, 2, i, 8));
  const tisSlot = (i) => grid(L.tray, 4, L === TALL ? 4 : 2, i);
  const stuffSlot = (i) => grid(L.tray, 8, L === TALL ? 4 : 2, i);
  const spoolSlot = (i) => grid(L.tray, 4, L === TALL ? 4 : 2, i);
  const extraSlot = (i) => grid(L.tray, 4, L === TALL ? 4 : 2, i);
  function toolSlot(k) {
    const T = L.tray;
    if (L === TALL) return { x: T.x + T.w * (k ? 0.68 : 0.22), y: T.y + T.h * 0.5 };
    return { x: T.x + T.w * 0.5, y: T.y + T.h * (k ? 0.68 : 0.24) };
  }
  const mouthPt = () => { const d = toolSlot(1); return { x: d.x + 46, y: d.y - 26 }; };
  const rollMat = () => { const g = matG(); return { x: g.sx1 + 17, y: (g.sy0 + g.sy1) / 2, len: g.sy1 - g.sy0 + 10, dia: 34, ang: Math.PI / 2 }; };
  // The stocking hangs from a peg on the mantel; the bag stands on the mat.
  const pegPt = () => ({ x: L.fire.x + L.fire.w * 0.5, y: L.fire.y + 26 });
  const bagPt = () => ({ x: L.mat.x, y: L.mat.y + 70 });
  const onTable = (r) => r.kind === "dog" || r.kind === "cat" || r.kind === "hamster";
  const recBase = (r) => L.back + (onTable(r) ? 30 : 0);
  function headPt(r) {
    const x = V.rec.x, b = recBase(r) - V.rec.hop;
    if (r.kind === "person") return { x, y: b - (r.kid ? 95 : 110), r: r.kid ? 29 : 32 };
    if (r.kind === "dog") return { x, y: b - 100, r: 30 };
    if (r.kind === "cat") return { x, y: b - 92, r: 28 };
    if (r.kind === "hamster") return { x, y: b - 50, r: 36 };
    return { x: x + 4, y: b - 116, r: 34 };
  }

  // =====================================================================================================
  // Tweens and particles
  // =====================================================================================================
  let tweens = [];
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
  // Scraps, confetti and sparkles; everything fades within about 1.2 s and stays capped.
  let parts = [];
  function puff(kind, x, y, n, color, color2) {
    if (reduce) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 80) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 4, rot: Math.random() * TAU, vr: 0, color: color || "#FFFFFF", c2: color2 || null };
      if (kind === "scrap") { p.vx = (Math.random() - 0.5) * 140; p.vy = -60 - sp * 100; p.life = 0.9 + sp * 0.3; p.size = 7 + sp * 7; p.vr = (Math.random() - 0.5) * 10; }
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
  const CONFETTI = ["#E8303F", "#FFC93C", "#2F8CFF", "#3FAE4B", "#FF6FA8", "#9B5DE5"];
  function confetti(x, y, n) { for (let k = 0; k < n; k++) puff("scrap", x, y, 1, CONFETTI[k % CONFETTI.length]); }

  // =====================================================================================================
  // The round: jobs, builds and steps
  // =====================================================================================================
  // phase: "make" (he makes the present; its last step is giving it), "open" (they open theirs and give him one),
  // "mine" (he opens his), "joy" (both play), "out" (they wave and go; the next one walks in).
  let job = JOBS.some((j) => j.id === saved.job) ? saved.job : "box";
  let nextJob = null, who = 0, round = 0, phase = "make";
  if (!fresh && Number.isInteger(saved.who) && saved.who >= 0 && saved.who < RECIPS.length) who = saved.who;
  if (!fresh && Number.isInteger(saved.round) && saved.round >= 0) round = saved.round;
  if (fresh) job = JOBS.some((j) => j.id === saved.job) ? saved.job : "box";
  function newBuild(j) {
    if (j === "bag") return { job: "bag", bag: null, gift: null, tissue: [], tag: false, stickers: [] };
    if (j === "stocking") return { job: "stocking", items: [] };
    return { job: "box", gift: null, lid: 0, paper: null, pull: 0, cut: 0, placed: false, side: [0, 0], tape: { s: 0, l: 0, r: 0 },
      tri: [0, 0], flap: [0, 0], ribbon: null, rib: [0, 0], loop: [0, 0], curl: [0, 0], tag: false, stickers: [] };
  }
  let K = newBuild(job);
  // A saved present in progress comes back as it was (each part either done or not done).
  if (saved.v === 2 && !fresh && saved.k && saved.k.job === job) {
    const s = saved.k, one = (v) => (v >= 1 ? 1 : 0), two = (a) => (Array.isArray(a) && a.length === 2 ? a.map(one) : [0, 0]);
    if (job === "box") {
      if (GIFT_BY[s.gift]) { K.gift = s.gift; K.lid = 1; }
      if (K.gift && PAPER_BY[s.paper]) { K.paper = s.paper; K.pull = one(s.pull); K.cut = K.pull ? one(s.cut) : 0; K.placed = !!(K.cut && s.placed); }
      if (K.placed) {
        K.side = two(s.side);
        if (K.side[0] && K.side[1] && s.tape) {
          K.tape.s = one(s.tape.s);
          if (K.tape.s) { K.tri = two(s.tri); K.flap = two(s.flap); K.tape.l = one(s.tape.l); K.tape.r = one(s.tape.r); }
        }
        if (K.tape.r && RIBBONS[s.ribbon]) { K.ribbon = s.ribbon; K.rib = two(s.rib); K.loop = two(s.loop); K.curl = two(s.curl); }
        K.tag = !!s.tag; K.stickers = Array.isArray(s.stickers) ? s.stickers.filter((x) => STICKERS.some((q) => q.id === x)) : [];
      }
    } else if (job === "bag") {
      if (BAG_BY[s.bag]) K.bag = s.bag;
      if (K.bag && GIFT_BY[s.gift]) K.gift = s.gift;
      if (K.gift && Array.isArray(s.tissue)) K.tissue = s.tissue.filter((c) => Number.isInteger(c) && c >= 0 && c < 4).slice(0, 4);
      K.tag = !!(K.gift && s.tag); K.stickers = Array.isArray(s.stickers) ? s.stickers.filter((x) => STICKERS.some((q) => q.id === x)) : [];
    } else if (Array.isArray(s.items)) K.items = s.items.filter((x) => STUFF_BY[x]).slice(0, 8);
  } else if (saved.v === 2 && !fresh && saved.phase && saved.phase !== "make") who = (who + 1) % RECIPS.length;
  const R = () => RECIPS[who];

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, who, job, round, phase, treats, k: K })); } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }

  // The next step of the present being made.
  const allOne = (a) => a[0] >= 1 && a[1] >= 1;
  function stepOf() {
    if (K.job === "box") {
      if (!K.gift || K.lid < 1) return "gift";
      if (K.pull < 1) return "roll";
      if (K.cut < 1) return "cut";
      if (!K.placed) return "place";
      if (!allOne(K.side)) return "sides";
      if (!K.tape.s) return "tapeS";
      if (K.tri[0] < 1) return "triL";
      if (K.flap[0] < 1) return "flapL";
      if (!K.tape.l) return "tapeL";
      if (K.tri[1] < 1) return "triR";
      if (K.flap[1] < 1) return "flapR";
      if (!K.tape.r) return "tapeR";
      if (!allOne(K.rib)) return "ribbon";
      if (!allOne(K.loop)) return "bow";
      if (!allOne(K.curl)) return "curl";
      return "give";
    }
    if (K.job === "bag") {
      if (!K.bag) return "bag";
      if (!K.gift) return "gift";
      if (K.tissue.length < 3) return "tissue";
      if (!K.tag) return "tag";
      return "give";
    }
    return K.items.length < 4 ? "fill" : "give";
  }
  // What the tray holds for a step.
  function trayFor() {
    if (phase !== "make" || V.rec.walk && V.rec.x < L.rec - 90) return "";
    const st = stepOf();
    if (K.job === "box") {
      if (st === "gift") return "shelf";
      if (st === "roll") return "rolls";
      if (st === "ribbon" || st === "bow" || st === "curl") return "spools";
      if (st === "give") return "extras";
      return "tools";
    }
    if (K.job === "bag") return { bag: "bags", gift: "shelf", tissue: "tissue", tag: "extras", give: "extras" }[st];
    return "stuff";
  }

  // What is on screen (rebuilt by placeAll when the page loads, a present starts or the layout changes).
  let busy = false, drag = null;
  const V = {
    rec: { x: 0, walk: false, hop: 0, vy: 0, happy: 0, cheer: 0, wave: 0, dance: 0, wob: 0, reach: 0 },
    box: { x: 0, y: 0, s: 1, a: 1 }, roll: null, edge: 0, cutBins: new Uint8Array(24), scis: null, tapeCarry: null, tapeFly: [],
    carry: null, ribTrail: null, loopPull: -1, tissuePop: [], bag: null, stock: { x: 0, y: 0, bulge: 0, swing: 0 }, drop: [],
    gp: null, items: [], say: "", sayPop: 0, mine: null, treat: null, tray: { kind: "", target: "", off: 1 },
    wob: {}, winWob: 0, treatWob: [], flare: 0, giftA: 1
  };
  const wobble = (id, k) => { V.wob[id] = k == null ? 1 : k; };
  const wv = (id) => V.wob[id] || 0;
  function placeAll() {
    const g = matG(), st = stepOf();
    V.rec.x = L.rec; V.rec.walk = false; V.rec.hop = 0; V.rec.vy = 0;
    V.box = K.job === "box" && (st === "roll" || st === "cut") ? { x: L.wait.x, y: L.wait.y, s: L.wait.s, a: 1 } : { x: g.cx, y: g.cy, s: 1, a: 1 };
    V.roll = null; V.scis = null; V.tapeCarry = null; V.tapeFly = []; V.carry = null; V.ribTrail = null;
    V.edge = K.pull >= 1 ? g.sx0 : g.sx1;
    V.cutBins = new Uint8Array(24); if (K.cut >= 1) V.cutBins.fill(1);
    V.tissuePop = K.job === "bag" ? K.tissue.map(() => 1) : [];
    V.stock = { x: pegPt().x, y: pegPt().y, bulge: K.job === "stocking" ? K.items.length / 8 : 0, swing: 0 };
    V.drop = []; V.gp = null; V.items = []; V.say = ""; V.mine = null; V.treat = null; V.giftA = 1;
    const k = trayFor();
    V.tray = { kind: k, target: k, off: k ? 0 : 1 };
  }
  let lastWant = null;
  function changed() { lastWant = null; if (typeof ghost !== "undefined") ghost.poke(); saveSoon(); }
  // A new present for the one at the table; walk = the next one walks in first.
  function startBuild(walk) {
    tweens = []; busy = false; drag = null; press.cancel(); parts = [];
    if (nextJob) { job = nextJob; nextJob = null; jobs.set(job); }
    K = newBuild(job);
    phase = "make";
    placeAll();
    Object.assign(V.rec, { happy: 0, cheer: 0, wave: 0, dance: 0, wob: 0, reach: 0 });
    if (walk) {
      V.rec.x = -150; V.rec.walk = true;
      tween(2.4, (p) => { V.rec.x = lerp(-150, L.rec, ease(p)); }, () => { V.rec.walk = false; V.rec.hop = 0; V.rec.happy = now() + 1.2; hopRec(200); lastWant = null; });
    }
    lastWant = null;
    ghost.again();
    saveSoon();
  }
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  function hopRec(power) { if (V.rec.hop <= 0.5) V.rec.vy = power || 260; }
  // He did a step: they watch happily now and then.
  function cheerStep() { V.rec.happy = Math.max(V.rec.happy, now() + 1.2); if (Math.random() < 0.4) hopRec(180); }

  // =====================================================================================================
  // Box: gift, paper, cut, place
  // =====================================================================================================
  // The open box sits on the mat; a gift dropped in settles inside and the lid comes down by itself.
  const inBoxPt = () => { const g = matG(); return { x: g.cx, y: g.cy - 4 }; };
  function giftIn(id, from) {
    if (busy || phase !== "make" || stepOf() !== "gift" || !GIFT_BY[id]) return;
    busy = true;
    const sl = shelfSlot(GIFT_BY[id].i), f = from || { x: sl.x, y: sl.y, s: sl.s };
    const to = K.job === "bag" ? { x: bagPt().x, y: bagPt().y - 84 } : inBoxPt(), s1 = K.job === "bag" ? 50 : 46 * L.bs;
    V.carry = { kind: "gift", id, x: f.x, y: f.y, s: f.s || sl.s };
    const c = V.carry, s0 = c.s;
    tween(from ? 0.35 : 0.6, (p) => { const e = ease(p); c.x = lerp(f.x, to.x, e); c.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 20 : 80); c.s = lerp(s0, s1, e); }, () => {
      V.carry = null; K.gift = id; puff("spark", to.x, to.y - 20, 6);
      wobble(K.job === "bag" ? "bag" : "box", 0.8); cheerStep();
      if (K.job === "bag") {
        // It drops down into the bag.
        V.drop.push({ id, x: to.x, y: to.y, s: s1, t0: now() });
        busy = false; changed(); return;
      }
      // The lid comes down, then the box moves aside while the paper is cut.
      tween(0.4, (p) => { K.lid = ease(p); }, () => {
        wobble("box", 0.6); changed();
        const g = matG();
        tween(0.6, (p) => { const e = ease(p); V.box.x = lerp(g.cx, L.wait.x, e); V.box.y = lerp(g.cy, L.wait.y, e) - Math.sin(p * Math.PI) * 30; V.box.s = lerp(1, L.wait.s, e); }, () => { busy = false; changed(); });
      });
    });
  }
  // Pulling paper: the roll stands at the paper's right end and the paper comes off it to the left, where his
  // finger is. pull 0..1 = how much of the sheet is out.
  function pickRoll(i) {
    const was = K.paper;
    K.paper = PAPERS[i].id;
    if (!V.roll) {
      const sl = rollSlot(i), to = rollMat();
      V.roll = { i, x: sl.x, y: sl.y, len: sl.len, dia: sl.dia, ang: sl.ang };
      const r = V.roll, f = { ...r };
      tween(0.3, (p) => { const e = ease(p); r.x = lerp(f.x, to.x, e); r.y = lerp(f.y, to.y, e); r.len = lerp(f.len, to.len, e); r.dia = lerp(f.dia, to.dia, e); r.ang = lerp(f.ang, to.ang, e); });
    } else V.roll.i = i;
    if (was !== K.paper) tag(PAPERS[i].name, rollMat().x, rollMat().y - rollMat().len / 2 - 10);
  }
  function setPull(x) {
    const g = matG();
    V.edge = clamp(x, g.sx0, g.sx1);
    K.pull = Math.max(K.pull, (g.sx1 - V.edge) / (g.sx1 - g.sx0));
    V.edge = g.sx1 - K.pull * (g.sx1 - g.sx0);
    if (K.pull >= 0.999) { K.pull = 1; V.edge = g.sx0; }
  }
  function pullAuto(i) {
    if (busy || stepOf() !== "roll") return;
    busy = true;
    if (i != null) pickRoll(i);
    const p0 = K.pull;
    tween(0.9 * (1 - p0) + 0.15, (p) => { const g = matG(); K.pull = lerp(p0, 1, ease(p)); V.edge = g.sx1 - K.pull * (g.sx1 - g.sx0); }, () => { busy = false; K.pull = 1; pullDone(); }, V.roll && V.roll.x !== rollMat().x ? 0.3 : 0);
  }
  function pullDone() { cheerStep(); changed(); }
  // Cutting: the scissors' tip cuts the bins of the dotted line it passes over.
  function cutAt(p) {
    const g = matG();
    if (Math.abs(p.x - g.sx1) > 34 || p.y < g.sy0 - 20 || p.y > g.sy1 + 20) return;
    const n = V.cutBins.length, k = clamp(Math.floor((p.y - g.sy0) / (g.sy1 - g.sy0) * n), 0, n - 1);
    for (let j = Math.max(0, k - 1); j <= Math.min(n - 1, k + 1); j++) V.cutBins[j] = 1;
    K.cut = Math.max(K.cut, V.cutBins.reduce((a, b) => a + b, 0) / n);
    if (K.cut >= 0.8) cutDone();
  }
  function cutAuto() {
    if (busy || stepOf() !== "cut") return;
    busy = true;
    const g = matG();
    V.scis = { x: g.sx1, y: g.sy0 - 10, ang: Math.PI / 2, open: 0 };
    tween(0.9, (p) => { V.scis.y = lerp(g.sy0 - 10, g.sy1 + 6, p); V.scis.open = Math.abs(Math.sin(p * 18)); cutAt({ x: g.sx1, y: V.scis.y }); }, () => { V.scis = null; busy = false; cutDone(); });
  }
  function cutDone() {
    if (K.cut >= 1) return;
    K.cut = 1; V.cutBins.fill(1);
    const g = matG();
    puff("scrap", g.sx1, g.sy0 + 10, 3, "#FFFFFF");
    // The roll goes back to the tray.
    if (V.roll) {
      const r = V.roll, f = { ...r }, sl = rollSlot(r.i);
      tween(0.5, (p) => { const e = ease(p); r.x = lerp(f.x, sl.x, e); r.y = lerp(f.y, sl.y, e); r.len = lerp(f.len, sl.len, e); r.dia = lerp(f.dia, sl.dia, e); r.ang = lerp(f.ang, sl.ang, e); }, () => { V.roll = null; }, 0.15);
    }
    cheerStep(); changed();
  }
  function placeBox(from) {
    if (busy || stepOf() !== "place") return;
    busy = true;
    const g = matG(), f = from || { x: V.box.x, y: V.box.y, s: V.box.s }, s0 = f.s || V.box.s;
    tween(from ? 0.3 : 0.6, (p) => { const e = ease(p); V.box.x = lerp(f.x, g.cx, e); V.box.y = lerp(f.y, g.cy, e) - Math.sin(p * Math.PI) * (from ? 10 : 50); V.box.s = lerp(s0, 1, e); }, () => {
      K.placed = true; busy = false; wobble("box", 0.8); puff("spark", g.cx, g.yf, 4); cheerStep(); changed();
    });
  }

  // =====================================================================================================
  // Box: folds and tape
  // =====================================================================================================
  // A part done by a drag eases the rest of the way once he lets go past `snap`, or back if he did not.
  function settle(obj, key, i, snap, done) {
    const get = () => (i == null ? obj[key] : obj[key][i]), set = (v) => { if (i == null) obj[key] = v; else obj[key][i] = v; };
    const v0 = get(), to = v0 >= snap ? 1 : 0;
    if (to === 0 && v0 <= 0) return;
    busy = true;
    tween(0.25 + 0.3 * Math.abs(to - v0), (p) => set(lerp(v0, to, ease(p))), () => { set(to); busy = false; if (to === 1 && done) done(); changed(); });
  }
  function sideAuto(k) { if (busy || stepOf() !== "sides" || K.side[k] >= 1) return; K.side[k] = Math.max(K.side[k], 0.001); settle(K, "side", k, 0, () => { wobble("box", 0.4); cheerStep(); }); }
  function endAuto(e) {
    if (busy) return;
    const st = stepOf();
    if (st === (e ? "triR" : "triL")) { K.tri[e] = Math.max(K.tri[e], 0.001); settle(K, "tri", e, 0, () => cheerStep()); }
    else if (st === (e ? "flapR" : "flapL")) { K.flap[e] = Math.max(K.flap[e], 0.001); settle(K, "flap", e, 0, () => { wobble("box", 0.4); cheerStep(); }); }
  }
  // Where the next tape piece goes.
  function tapeSpot(key) {
    const g = matG();
    if (key === "s") return { x: g.cx, y: g.seam, rot: 0 };
    if (key === "l") return { x: g.x0 + 4, y: g.mid, rot: Math.PI / 2 };
    return { x: g.x1 - 4, y: g.mid, rot: Math.PI / 2 };
  }
  const tapeKey = () => ({ tapeS: "s", tapeL: "l", tapeR: "r" }[stepOf()] || null);
  function tapeOn(from) {
    const key = tapeKey();
    if (!key || busy) return;
    busy = true;
    const f = from || mouthPt(), to = tapeSpot(key);
    const fl = { x: f.x, y: f.y, rot: from ? 0 : -0.4 };
    V.tapeFly.push(fl); wobble("disp", 1);
    tween(from ? 0.18 : 0.4, (p) => { const e = ease(p); fl.x = lerp(f.x, to.x, e); fl.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 4 : 40); fl.rot = lerp(fl.rot, to.rot, e); }, () => {
      V.tapeFly.splice(V.tapeFly.indexOf(fl), 1);
      K.tape[key] = 1; busy = false; wobble("box", 0.3); puff("spark", to.x, to.y, 3, "#FFFFFF"); cheerStep(); changed();
    });
  }

  // =====================================================================================================
  // Box: ribbon, bow, curls and extras
  // =====================================================================================================
  function ribbonGo(i) {
    if (K.ribbon == null || (K.rib[0] <= 0 && K.rib[1] <= 0)) K.ribbon = i == null ? (K.ribbon == null ? 0 : K.ribbon) : i;
  }
  // Rubbing the ribbon end across the box lays the long band, then the short band (any direction counts).
  function ribbonMove(a, b) {
    const g = matG();
    const inside = b.x > g.x0 - 40 && b.x < g.x1 + 40 && b.y > g.y0 - 40 && b.y < g.yf + 40;
    if (!inside) return;
    if (K.rib[0] < 1) K.rib[0] = Math.min(1, K.rib[0] + Math.abs(b.x - a.x) / (BW * 0.9) + Math.abs(b.y - a.y) / (BW * 3));
    else K.rib[1] = Math.min(1, K.rib[1] + Math.abs(b.y - a.y) / ((BD + BF) * 0.9) + Math.abs(b.x - a.x) / (BW * 3));
    if (allOne(K.rib)) { puff("spark", g.cx, g.cy, 6, RIBBONS[K.ribbon].hex); cheerStep(); changed(); }
  }
  function ribbonAuto(i) {
    if (busy || stepOf() !== "ribbon") return;
    ribbonGo(i);
    busy = true;
    const a0 = K.rib[0], b0 = K.rib[1];
    tween(0.5 * (1 - a0) + 0.05, (p) => { K.rib[0] = lerp(a0, 1, ease(p)); }, () => {
      tween(0.5 * (1 - b0) + 0.05, (p) => { K.rib[1] = lerp(b0, 1, ease(p)); }, () => { busy = false; const g = matG(); puff("spark", g.cx, g.cy, 6, RIBBONS[K.ribbon].hex); cheerStep(); changed(); });
    });
  }
  const knotPt = () => { const g = matG(); return { x: g.cx, y: g.cy }; };
  const loopHandle = (k) => { const n = knotPt(), d = 10 + 26 * K.loop[k]; return { x: n.x + (k ? d : -d), y: n.y - 6 }; };
  function loopAuto(k) {
    if (busy || stepOf() !== "bow") return;
    if (k == null) k = K.loop[0] < 1 ? 0 : 1;
    if (K.loop[k] >= 1) return;
    K.loop[k] = Math.max(K.loop[k], 0.001);
    settle(K, "loop", k, 0, () => { wobble("bow", 1); cheerStep(); if (allOne(K.loop)) puff("spark", knotPt().x, knotPt().y, 8, RIBBONS[K.ribbon].hex); });
  }
  // The ribbon ends hang from the knot over the front of the box.
  function tailEnd(k) { const g = matG(); return { x: g.cx + (k ? 30 : -30) * L.bs, y: g.yf + 26 * L.bs }; }
  function curlAt(k, p) {
    const a = knotPt(), b = tailEnd(k), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const along = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (len * len), off = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
    if (off < 40) K.curl[k] = Math.max(K.curl[k], clamp(along, 0, 1));
  }
  function curlAuto(k) {
    if (busy || stepOf() !== "curl") return;
    if (k == null) k = K.curl[0] < 1 ? 0 : 1;
    if (K.curl[k] >= 1) return;
    busy = true;
    const a = knotPt(), b = tailEnd(k), c0 = K.curl[k];
    V.scis = { x: a.x, y: a.y, ang: Math.atan2(b.y - a.y, b.x - a.x), open: 1 };
    tween(0.6, (p) => { V.scis.x = lerp(a.x, b.x, p); V.scis.y = lerp(a.y, b.y, p); K.curl[k] = Math.max(c0, p); }, () => { V.scis = null; busy = false; K.curl[k] = 1; curlDone(k); });
  }
  function curlDone(k) { wobble("bow", 0.6); puff("spark", tailEnd(k).x, tailEnd(k).y, 4, RIBBONS[K.ribbon].hex); cheerStep(); changed(); }
  // Extras (never a step): the gift tag and three stickers, stuck on where they fit.
  function extraSpot(id) {
    if (K.job === "bag") {
      const b = bagPt();
      if (id === "tag") return { x: b.x + 40, y: b.y - 122 };
      return { star: { x: b.x - 26, y: b.y - 40 }, flake: { x: b.x + 24, y: b.y - 58 }, holly: { x: b.x + 6, y: b.y - 22 } }[id];
    }
    const g = matG();
    if (id === "tag") return { x: g.x1 - 16, y: g.y0 + 12 };
    return { star: { x: g.x0 + 18, y: g.y0 + 14 }, flake: { x: g.x0 + 20, y: g.y1 + 8 }, holly: { x: g.x1 - 22, y: g.y1 + 9 } }[id];
  }
  function extraOn(id, from) {
    if (busy || phase !== "make") return;
    const st = stepOf();
    if (!(st === "give" || (K.job === "bag" && st === "tag" && id === "tag"))) return;
    if (id === "tag" ? K.tag : K.stickers.includes(id)) return;
    busy = true;
    const sl = extraSlot(id === "tag" ? 0 : 1 + STICKERS.findIndex((q) => q.id === id)), f = from || sl, to = extraSpot(id);
    V.carry = { kind: "extra", id, x: f.x, y: f.y, s: 1 };
    const c = V.carry;
    tween(from ? 0.25 : 0.5, (p) => { const e = ease(p); c.x = lerp(f.x, to.x, e); c.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 10 : 40); }, () => {
      V.carry = null; busy = false;
      if (id === "tag") K.tag = true; else K.stickers.push(id);
      wobble(K.job === "bag" ? "bag" : "box", 0.4); puff("spark", to.x, to.y, 5); cheerStep(); changed();
    });
  }

  // =====================================================================================================
  // Bag and stocking
  // =====================================================================================================
  function pickBag(i, from) {
    if (busy || stepOf() !== "bag") return;
    busy = true;
    const sl = bagSlot(i), f = from || sl, to = bagPt();
    V.bag = { i, x: f.x, y: f.y, s: 0.55 };
    const b = V.bag;
    tween(from ? 0.3 : 0.55, (p) => { const e = ease(p); b.x = lerp(f.x, to.x, e); b.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * 40; b.s = lerp(0.55, 1, e); }, () => {
      V.bag = null; K.bag = BAGS[i].id; busy = false; wobble("bag", 1); puff("spark", to.x, to.y - 60, 6); cheerStep(); changed();
    });
  }
  // Tissue paper: each sheet goes into the bag and fluffs up out of the top.
  function tissueIn(i, from) {
    if (busy || K.job !== "bag" || !K.gift || K.tissue.length >= 4 || K.tissue.includes(i)) return;
    if (stepOf() !== "tissue" && stepOf() !== "tag" && stepOf() !== "give") return;
    busy = true;
    const sl = tisSlot(i), f = from || sl, b = bagPt(), to = { x: b.x, y: b.y - 110 };
    V.carry = { kind: "tissue", id: i, x: f.x, y: f.y, s: 1 };
    const c = V.carry;
    tween(from ? 0.25 : 0.45, (p) => { const e = ease(p); c.x = lerp(f.x, to.x, e); c.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * (from ? 10 : 50); }, () => {
      V.carry = null; busy = false;
      K.tissue.push(i); V.tissuePop.push(0);
      const k = V.tissuePop.length - 1;
      tween(0.45, (p) => { V.tissuePop[k] = p; });
      wobble("bag", 0.6); puff("spark", to.x, to.y, 4, TISSUE[i]); cheerStep(); changed();
    });
  }
  // Stocking stuffers drop into the stocking; it swings and bulges a little more each time.
  const stockTop = () => ({ x: V.stock.x, y: V.stock.y + 30 });
  function stuffIn(id, from) {
    if (busy || K.job !== "stocking" || phase !== "make" || K.items.length >= 8 || K.items.includes(id)) return;
    busy = true;
    const sl = stuffSlot(STUFF_BY[id].i), f = from || sl, to = stockTop();
    V.carry = { kind: "stuff", id, x: f.x, y: f.y, s: 40 };
    const c = V.carry;
    tween(from ? 0.25 : 0.5, (p) => { const e = ease(p); c.x = lerp(f.x, to.x, e); c.y = lerp(f.y, to.y - 10, e) - Math.sin(p * Math.PI) * (from ? 10 : 60); }, () => {
      V.carry = null; busy = false;
      K.items.push(id);
      const b0 = V.stock.bulge;
      tween(0.4, (p) => { V.stock.bulge = lerp(b0, K.items.length / 8, ease(p)); });
      V.stock.swing = 1; puff("spark", to.x, to.y, 4); cheerStep(); changed();
    });
  }

  // =====================================================================================================
  // Giving, opening together and the next one
  // =====================================================================================================
  // The present (box, bag or stocking) at its spot on the scene, for giving and the ring.
  function presentPt() {
    if (K.job === "box") { const g = geo(V.box.x, V.box.y); return { x: g.cx, y: g.cy + BF / 2, r: BW * 0.6 }; }
    if (K.job === "bag") { const b = bagPt(); return { x: b.x, y: b.y - 60, r: 70 }; }
    return { x: V.stock.x, y: V.stock.y + 90, r: 70 };
  }
  // Giving: it slides across to them. from = where his finger let it go.
  let given = null;
  function giveIt(from) {
    if (busy || phase !== "make" || stepOf() !== "give") return;
    busy = true;
    phase = "open"; changed();
    given = { job: K.job, x: 0, y: 0, s: 1, a: 1 };
    const p0 = presentPt(), f = from || { x: p0.x, y: p0.y }, to = { x: L.give.x, y: L.give.y };
    given.x = f.x; given.y = f.y;
    V.rec.reach = 1;
    tween(from ? 0.45 : 0.8, (p) => { const e = ease(p); given.x = lerp(f.x, to.x, e); given.y = lerp(f.y, to.y, e) - Math.sin(p * Math.PI) * 30; given.s = lerp(1, 0.72, e); }, () => {
      hopRec(260); V.rec.happy = now() + 6;
      later(0.4, theyOpen);
    });
  }
  // They open it themselves, quickly: the paper flies off, the tissue flies out, or the stocking tips out.
  function theyOpen() {
    const g = given, at = { x: L.give.x, y: L.give.y };
    if (g.job === "box") {
      const P = PAPER_BY[K.paper];
      for (let k = 0; k < 18; k++) puff("scrap", at.x + (Math.random() - 0.5) * 60, at.y + (Math.random() - 0.5) * 30, 1, P.bg, P.fg);
    } else if (g.job === "bag") K.tissue.forEach((c) => { for (let k = 0; k < 3; k++) puff("scrap", at.x, at.y - 40, 1, TISSUE[c]); });
    tween(0.3, (p) => { given.a = 1 - p; }, () => { given = null; });
    if (g.job === "stocking") {
      // The stuffers tumble out onto the table in front of them.
      V.items = K.items.map((id, k) => ({ id, x: at.x, y: at.y - 20, tx: at.x - 40 + (k % 4) * 30 + (k > 3 ? 14 : 0), ty: at.y + 10 + Math.floor(k / 4) * 22, ph: k }));
      V.items.forEach((it, k) => { const x0 = it.x, y0 = it.y; tween(0.6, (p) => { it.x = lerp(x0, it.tx, ease(p)); it.y = lerp(y0, it.ty, ease(p)) - Math.sin(p * Math.PI) * 60; }, null, k * 0.06); });
      const toy = K.items.find((id) => id === "bball" || id === "car");
      V.say = toy ? STUFF_BY[toy].name + "!" : "A full stocking!";
    } else {
      V.gp = { id: K.gift, x: at.x, y: at.y, s: 40, rot: 0 };
      const gp = V.gp;
      tween(0.5, (p) => { gp.s = lerp(40, 66, ease(p)); gp.y = at.y - Math.sin(p * Math.PI) * 50; });
      V.say = GIFT_BY[K.gift].a + "!";
    }
    puff("spark", at.x, at.y - 30, 12);
    V.rec.cheer = now() + 2.4; V.rec.reach = 0; hopRec(320);
    V.sayPop = 0; tween(0.35, (p) => { V.sayPop = ease(p); });
    playT0 = now();
    Toybox.kind();
    // Then they give him a small present back across the table.
    later(1.4, giveBack);
  }
  let playT0 = 0;
  const MINE_TYPES = ["box", "bag", "cracker"];
  function giveBack() {
    const type = MINE_TYPES[round % 3], P = PAPERS[(round * 3 + 1) % PAPERS.length];
    const treat = TREATS[(round * 7 + who * 3) % TREATS.length].id;
    const home = minePos(type), from = { x: L.give.x + 30, y: L.give.y + 10 };
    V.mine = { type, paper: P.id, treat, x: from.x, y: from.y, s: 0.5, torn: new Uint8Array(MC * MR), tiss: [0, 0, 0], pullK: -1, ext: 0, open: false };
    const m = V.mine;
    V.rec.reach = 1;
    tween(0.8, (p) => { const e = ease(p); m.x = lerp(from.x, home.x, e); m.y = lerp(from.y, home.y, e) - Math.sin(p * Math.PI) * 30; m.s = lerp(0.5, 1, e); }, () => {
      busy = false; V.rec.reach = type === "cracker" ? 1 : 0; phase = "mine"; changed();
    });
  }
  function minePos(type) { return type === "cracker" ? { x: L.rec + 150, y: L.back + 26 } : { x: L.mine.x, y: L.mine.y }; }
  // His small box: a tear grid over its top (2 rows) and front (3 rows).
  const MC = 6, MR = 5, MTOP = 2;
  let MW = 100, MH = 58, MD = 24;
  function mineG() { const m = V.mine; return { x0: m.x - MW / 2, x1: m.x + MW / 2, yt: m.y - MH / 2, yb: m.y + MH / 2, d: MD, i: 10, cx: m.x, cy: m.y }; }
  function mgPt(g, i, j) {
    const u = i / MC;
    let x, y;
    if (j <= MTOP) { const v = j / MTOP, xl = lerp(g.x0 + g.i, g.x0, v), xr = lerp(g.x1 - g.i, g.x1, v); x = lerp(xl, xr, u); y = g.yt - g.d + v * g.d; }
    else { const v = (j - MTOP) / (MR - MTOP); x = lerp(g.x0, g.x1, u); y = lerp(g.yt, g.yb, v); }
    if (i > 0 && i < MC && j > 0 && j < MR && j !== MTOP) { x += (hash(i, j) - 0.5) * 7; y += (hash(j, i + 9) - 0.5) * 6; }
    return { x, y };
  }
  const mineLeft = () => V.mine.torn.reduce((n, v) => n + (v ? 0 : 1), 0);
  function tearMine(c, r) {
    const m = V.mine, k = r * MC + c;
    if (m.torn[k]) return false;
    m.torn[k] = 1;
    const g = mineG(), a = mgPt(g, c, r), b = mgPt(g, c + 1, r + 1), P = PAPER_BY[m.paper];
    puff("scrap", (a.x + b.x) / 2, (a.y + b.y) / 2, 1, P.bg, P.fg);
    return true;
  }
  function tearMineAt(x, y) {
    const m = V.mine;
    if (!m || m.type !== "box" || m.open || phase !== "mine") return;
    const g = mineG();
    let any = false;
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
      if (m.torn[r * MC + c]) continue;
      const a = mgPt(g, c, r), b = mgPt(g, c + 1, r + 1);
      if (Math.hypot((a.x + b.x) / 2 - x, (a.y + b.y) / 2 - y) < 20) { tearMine(c, r); any = true; }
    }
    if (any) { wobble("mine", 0.2); if (mineLeft() <= 4) mineOpen(); }
  }
  function tearMineLine(a, b) { const n = Math.max(1, Math.ceil(dist(a, b) / 8)); for (let k = 1; k <= n; k++) tearMineAt(lerp(a.x, b.x, k / n), lerp(a.y, b.y, k / n)); }
  // A tap rips a big strip, top to bottom.
  function ripMine(x) {
    const m = V.mine;
    if (!m || m.type !== "box" || m.open) return;
    const g = mineG(), has = (c) => { for (let r = 0; r < MR; r++) if (!m.torn[r * MC + c]) return true; return false; };
    let c = clamp(Math.floor((x - g.x0) / (MW / MC)), 0, MC - 1);
    if (!has(c)) { let best = -1, bd = 99; for (let cc = 0; cc < MC; cc++) if (has(cc) && Math.abs(cc - c) < bd) { bd = Math.abs(cc - c); best = cc; } if (best < 0) return; c = best; }
    const c2 = c + 1 < MC ? c + 1 : c - 1;
    wobble("mine", 0.4);
    for (let r = 0; r < MR; r++) later(r * 0.05, () => { if (V.mine === m && !m.open) { tearMine(c, r); tearMine(c2, r); if (mineLeft() <= 4) mineOpen(); } });
  }
  // His little bag: three tissue sheets to pull out.
  function tissOut(k, from) {
    const m = V.mine;
    if (!m || m.type !== "bag" || m.open) return;
    if (k == null) k = m.tiss.findIndex((v) => v < 1);
    if (k < 0 || m.tiss[k] >= 1) return;
    m.tiss[k] = 1; m.pullK = -1;
    const f = from || tissPt(k), fl = { x: f.x, y: f.y, c: TISSUE[(k + round) % 4], a: 1 };
    V.tissueFly = V.tissueFly || [];
    V.tissueFly.push(fl);
    tween(0.9, (p) => { fl.y = f.y - 80 * ease(p); fl.x = f.x + (k - 1) * 50 * p; fl.a = 1 - p; }, () => V.tissueFly.splice(V.tissueFly.indexOf(fl), 1));
    wobble("mine", 0.4);
    if (m.tiss.every((v) => v >= 1)) mineOpen();
  }
  const tissPt = (k) => { const m = V.mine; return { x: m.x + (k - 1) * 22, y: m.y - 40 }; };
  // The cracker: he pulls one end while they hold the other; at full stretch it pops.
  function crackerPull(ext) {
    const m = V.mine;
    if (!m || m.type !== "cracker" || m.open) return;
    m.ext = Math.max(0, Math.min(1, ext));
    if (m.ext >= 1) mineOpen();
  }
  function crackerAuto() {
    const m = V.mine;
    if (!m || m.type !== "cracker" || m.open || busy) return;
    busy = true;
    const e0 = m.ext;
    tween(0.5, (p) => { m.ext = lerp(e0, 1, ease(p)); }, () => { busy = false; mineOpen(); });
  }
  // His present opens: the surprise pops out, then hangs on the garland.
  function mineOpen() {
    const m = V.mine;
    if (!m || m.open) return;
    m.open = true;
    if (m.type === "box") { const g = mineG(); for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) tearMine(c, r); void g; }
    if (m.type === "cracker") { confetti(m.x + 10, m.y, 16); puff("spark", m.x + 10, m.y, 10); }
    const at = { x: m.type === "cracker" ? m.x + 14 : m.x, y: m.y - 20 };
    V.treat = { id: m.treat, x: at.x, y: at.y, s: 30, rot: 0 };
    const tr = V.treat;
    puff("spark", at.x, at.y - 10, 10);
    tween(0.6, (p) => { tr.y = at.y - 70 * Math.sin(p * Math.PI * 0.6) - 20 * p; tr.s = lerp(30, 64, ease(p)); tr.rot = Math.sin(p * Math.PI) * 0.4; });
    const v = vp(at.x, at.y - 100); Toybox.nametag(TREAT_BY[m.treat].name, v.x, v.y, 2600);
    V.rec.cheer = now() + 2; hopRec(280);
    later(0.3, () => { phase = "joy"; changed(); });
    // After a good look it flies up to the garland.
    later(3.0, () => {
      treats.push(m.treat);
      if (treats.length > TREATS_MAX) treats = treats.slice(-TREATS_MAX);
      const k = treats.length - 1, to = treatPt(k), f = { x: tr.x, y: tr.y, s: tr.s };
      round++;
      save();
      tween(0.8, (p) => { const e = ease(p); tr.x = lerp(f.x, to.x, e); tr.y = lerp(f.y, to.y + 20, e) - Math.sin(p * Math.PI) * 60; tr.s = lerp(f.s, 20, e); }, () => { V.treat = null; V.treatWob[k] = 1; });
      tween(0.6, (p) => { if (V.mine === m) m.a = 1 - p; }, () => { if (V.mine === m) V.mine = null; }, 0.2);
      Toybox.kind();
      later(reduce ? 4 : 3.2, goOut);
    });
  }
  function goOut() {
    if (phase !== "joy") return;
    phase = "out"; busy = true; changed();
    V.rec.wave = now() + 1.2;
    later(1.0, () => {
      V.rec.walk = true;
      const x0 = V.rec.x, gp = V.gp, gx = gp ? gp.x : 0, items = V.items.map((it) => ({ it, x: it.x }));
      tween(0.3, (p) => { V.sayPop = 1 - p; });
      tween(2.2, (p) => {
        const e = ease(p);
        V.rec.x = lerp(x0, -170, e);
        if (gp) { gp.x = lerp(gx, -100, e); gp.y = L.give.y - Math.abs(Math.sin(p * Math.PI * 5)) * 12; }
        items.forEach((q) => { q.it.x = lerp(q.x, -100, e); });
      }, () => {
        busy = false;
        who = (who + 1) % RECIPS.length;
        startBuild(true);
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
  function limb(pts, color, w) {
    ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = w + 4.4; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
    ctx.lineCap = "butt";
  }
  function text(s, x, y, size, color, weight) {
    ctx.font = (weight || 800) + " " + size + "px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = color || INK; ctx.fillText(s, x, y);
  }
  const rgbOf = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  function shade(h, t) { const c = rgbOf(h), to = t > 0 ? 255 : 0, k = Math.abs(t); return "rgb(" + c.map((v) => Math.round(v + (to - v) * k)).join(",") + ")"; }
  const rgba = (h, a) => "rgba(" + rgbOf(h).join(",") + "," + a + ")";
  function star(x, y, r, fill, lw) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r2 = k % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); }
    ctx.closePath();
    if (lw) fs(fill, lw); else { ctx.fillStyle = fill; ctx.fill(); }
  }
  function snowflake(x, y, r, color, w) {
    ctx.strokeStyle = color; ctx.lineWidth = w || 1.8; ctx.lineCap = "round";
    for (let n = 0; n < 3; n++) { const a = n * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    ctx.lineCap = "butt";
  }
  // Squash-and-stretch about (x, y) for a wobble k (0..1).
  function wob(x, y, k, t, fn) {
    if (k <= 0.001) { fn(); return; }
    const a = Math.sin(t * 22) * k * 0.08;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + a, 1 - a); ctx.translate(-x, -y); fn(); ctx.restore();
  }

  // =====================================================================================================
  // Drawing things: gifts, stuffers and surprises
  // =====================================================================================================
  // Each thing is drawn centered on (x, y), about s across. o: { t, spin, wheels, flame }.
  function drawThing(id, x, y, s, o) {
    o = o || {};
    const k = s / 60, t = o.t || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const lw = LW / Math.max(0.5, k);
    const F = (c) => fs(c, lw);
    switch (id) {
      case "ball": case "bball": case "marble": {
        const r = id === "ball" ? 24 : id === "bball" ? 20 : 16;
        const cols = id === "ball" ? ["#E8303F", "#FFD23B", "#2F8CFF"] : id === "bball" ? ["#3FAE4B", "#FFFFFF", "#9B5DE5"] : ["#7FD0FF", "#FFFFFF", "#2F8CFF"];
        ell(0, 0, r, r); F(cols[0]);
        ctx.save(); ell(0, 0, r, r); ctx.clip();
        ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.4, r * 0.32, -0.5, 0, TAU); ctx.fill();
        ctx.fillStyle = cols[2]; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 1.4, -0.5, 0, TAU); ctx.fill();
        ctx.restore();
        ell(0, 0, r, r); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        ell(-r * 0.33, -r * 0.38, r * 0.2, r * 0.12, -0.6); ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fill();
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
      case "teddy": {
        const C = "#B9773F", M = "#E9C59A";
        [-1, 1].forEach((sd) => { circle(sd * 13, -24, 7, C, lw); circle(sd * 13, -24, 3.5, M, 1.2); });
        ell(0, 12, 18, 16); F(C); ell(0, 14, 10, 9); ctx.fillStyle = M; ctx.fill();
        [-1, 1].forEach((sd) => { ell(sd * 18, 6, 6, 9, sd * 0.5); F(C); ell(sd * 10, 26, 7, 6); F(C); });
        circle(0, -12, 16, C, lw);
        ell(0, -6, 8, 6); F(M);
        ell(0, -8, 3, 2.2); ctx.fillStyle = INK; ctx.fill();
        circle(-6, -15, 1.9, INK, 0.1); circle(6, -15, 1.9, INK, 0.1);
        poly([[-6, 2], [6, 2], [0, 8]]); fs("#E8303F", 1.4);
        break;
      }
      case "yarn": {
        ctx.beginPath(); ctx.moveTo(14, 16); ctx.quadraticCurveTo(30, 24, 26, 10); ctx.strokeStyle = "#E0428A"; ctx.lineWidth = 3; ctx.stroke();
        ell(0, 0, 22, 22); F("#FF6FA8");
        ctx.save(); ell(0, 0, 22, 22); ctx.clip();
        ctx.strokeStyle = "#D93D7E"; ctx.lineWidth = 2.4;
        for (let n = -2; n <= 2; n++) { ctx.beginPath(); ctx.ellipse(n * 7, 0, 7, 26, 0.6, 0, TAU); ctx.stroke(); }
        ctx.restore();
        ell(0, 0, 22, 22); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        break;
      }
      case "carrots": {
        [[-12, -0.35], [0, 0], [12, 0.35]].forEach(([dx, a]) => {
          ctx.save(); ctx.translate(dx, 4); ctx.rotate(a);
          [[-5, -1.2], [0, 0], [5, 1.2]].forEach(([lx, la]) => { ctx.save(); ctx.translate(lx * 0.6, -16); ctx.rotate(la * 0.4); ell(0, -8, 3.5, 9); F("#4CB848"); ctx.restore(); });
          poly([[-7, -16], [7, -16], [1, 24], [-1, 24]]); F("#FF8A1F");
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
        rr(-12, -16, 10, 9, 2); F("#BFE6FF");
        limb([[6, 2], [20, -16], [28, -2]], "#FFC21A", 6);
        poly([[24, -2], [34, -2], [32, 10], [22, 6]]); F("#8E9AAF");
        break;
      }
      case "train": {
        const tr = o.wheels || 0;
        rr(-26, -6, 30, 20, 4); F("#E8303F");
        rr(-26, -22, 16, 18, 3); F("#E8303F");
        rr(-23, -19, 10, 8, 2); F("#BFE6FF");
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
        rr(-20, -20, 14, 12, 2); F("#BFE6FF");
        rr(16, -16, 4, 14, 2); F("#3A3F55");
        circle(-14, 14, 13, "#3A3F55", 1.8); circle(-14, 14, 6, "#FFD23B", 1.6);
        line(-14, 14, -14 + Math.cos(tr) * 11, 14 + Math.sin(tr) * 11, "#FFFFFF", 1.6);
        circle(18, 18, 8, "#3A3F55", 1.8); circle(18, 18, 3.5, "#FFD23B", 1.4);
        break;
      }
      case "car": {
        const tr = o.wheels || 0;
        ctx.beginPath(); ctx.moveTo(-26, 10); ctx.lineTo(-26, 0); ctx.quadraticCurveTo(-24, -6, -14, -6); ctx.lineTo(-8, -18); ctx.lineTo(12, -18); ctx.lineTo(20, -6); ctx.quadraticCurveTo(28, -5, 28, 4); ctx.lineTo(28, 10); ctx.closePath(); F("#2F8CFF");
        poly([[-5, -15], [3, -15], [3, -7], [-9, -7]]); F("#BFE6FF");
        poly([[6, -15], [11, -15], [16, -7], [6, -7]]); F("#BFE6FF");
        [-14, 16].forEach((wx) => { circle(wx, 11, 7, "#3A3F55", 1.6); line(wx, 11, wx + Math.cos(tr) * 5, 11 + Math.sin(tr) * 5, "#FFFFFF", 1.4); });
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
        const body = () => { ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(13, -14, 11, 18); ctx.lineTo(-11, 18); ctx.quadraticCurveTo(-13, -14, 0, -28); ctx.closePath(); };
        body(); F("#F4F6FA");
        ctx.save(); body(); ctx.clip(); ctx.fillStyle = "#E8303F"; ctx.fillRect(-14, -30, 28, 13); ctx.restore();
        body(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        circle(0, -2, 5.5, "#7FD0FF", 1.8);
        break;
      }
      case "book": case "minibook": {
        const c = id === "book" ? "#2F8CFF" : "#9B5DE5";
        ctx.save(); ctx.rotate(-0.12);
        rr(-20, -24, 40, 48, 4); F(c);
        rr(-20, -24, 8, 48, 3); F(shade(c, -0.25));
        rr(16, -21, 6, 42, 2); F("#FFFFFF");
        rr(-20, -24, 40, 48, 4); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        star(6, 0, 10, "#FFD23B", 1.6);
        ctx.restore();
        break;
      }
      case "paint": {
        rr(-26, -14, 52, 30, 6); F("#F4F6FA");
        ["#E8303F", "#FFD23B", "#3FAE4B", "#2F8CFF", "#9B5DE5", "#FF8A1F"].forEach((c, n) => { ell(-16 + (n % 3) * 16, -5 + Math.floor(n / 3) * 13, 6, 4.5); fs(c, 1.4); });
        ctx.save(); ctx.rotate(-0.5);
        rr(-4, -34, 6, 30, 3); F("#C98B5A");
        rr(-4.5, -40, 7, 9, 2); F("#8E9AAF");
        ctx.beginPath(); ctx.moveTo(-3, -40); ctx.quadraticCurveTo(-1, -50, 1, -40); ctx.closePath(); fs("#E8303F", 1.4);
        ctx.restore();
        break;
      }
      case "cane": {
        ctx.beginPath(); ctx.moveTo(6, 28); ctx.lineTo(6, -12); ctx.arc(-6, -12, 12, 0, Math.PI, true);
        ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 8.6; ctx.stroke();
        ctx.setLineDash([5, 6]); ctx.strokeStyle = "#E8303F"; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = "butt";
        break;
      }
      case "orange": {
        circle(0, 4, 21, "#FF9A1F", lw);
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ell(-7, -4, 5, 3, -0.5); ctx.fill();
        ell(6, -18, 8, 4, -0.5); F("#4CB848");
        circle(0, -16, 2.5, "#7A5A2B", 1.2);
        break;
      }
      case "crayons": {
        ["#E8303F", "#FFD23B", "#2F8CFF", "#3FAE4B"].forEach((c, n) => {
          const x = -15 + n * 10;
          rr(x - 4, -18, 8, 34, 2); F(c);
          poly([[x - 4, -18], [x + 4, -18], [x, -27]]); F(c);
          line(x - 3, -8, x + 3, -8, INK, 1.2);
        });
        rr(-20, 0, 40, 18, 3); F("#F2C24E");
        break;
      }
      case "bell": {
        ctx.beginPath(); ctx.moveTo(-20, 14); ctx.quadraticCurveTo(-18, -20, 0, -20); ctx.quadraticCurveTo(18, -20, 20, 14); ctx.closePath(); F("#FFC93C");
        rr(-23, 10, 46, 8, 4); F("#FFC93C");
        circle(0, 21, 5, "#E8A91A", 1.8);
        ell(-6, -8, 3, 7, 0.3); ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
        rr(-8, -28, 16, 9, 3); F("#E8303F");
        break;
      }
      case "coin": {
        circle(0, 0, 20, "#FFC93C", lw); circle(0, 0, 14, "#F5B92A", 1.4); star(0, 0, 8, "#FFE59A");
        break;
      }
      case "sticker": { circle(0, 0, 20, "#FFFFFF", lw); star(0, 0, 15, "#FFC93C", 1.8); break; }
      case "cookie": { star(0, 2, 24, "#E9B062", lw); star(0, 2, 15, "#FFFFFF"); [[-4, -2], [5, 3], [0, 8]].forEach(([a, b]) => circle(a, b, 2, "#E8303F", 0.1)); break; }
      case "flake": {
        circle(0, 0, 22, "#DDF1FF", lw);
        snowflake(0, 0, 15, "#2F8CFF", 3.4);
        circle(0, -24, 3, "#FFC93C", 1.4);
        break;
      }
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing papers, rolls, tools and the wrap
  // =====================================================================================================
  // A paper's pattern over a rectangle (clip to the paper's shape first). Every motif is flat with an outline.
  function pattern(P, x0, y0, x1, y1) {
    ctx.fillStyle = P.bg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (P.id === "stripes") {
      ctx.fillStyle = P.fg;
      for (let x = x0 - (y1 - y0) - 40; x < x1 + 20; x += 26) { ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + 13, y1); ctx.lineTo(x + 13 + (y1 - y0), y0); ctx.lineTo(x + (y1 - y0), y0); ctx.closePath(); ctx.fill(); }
      return;
    }
    const sp = 30;
    const sx = Math.floor(x0 / sp) * sp, syy = Math.floor(y0 / (sp * 0.8)) * sp * 0.8;
    for (let j = 0, y = syy; y < y1 + sp; y += sp * 0.8, j++) {
      for (let x = sx + (Math.round(y / (sp * 0.8)) % 2 ? sp / 2 : 0); x < x1 + sp; x += sp) motif(P, x, y, Math.round(x / sp + y / sp));
    }
  }
  function motif(P, x, y, n) {
    const o = 1.3;
    if (P.id === "stars") star(x, y, 7, P.fg);
    else if (P.id === "trees") {
      ctx.fillStyle = P.fg; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y + 5); ctx.lineTo(x - 7, y + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#8A5A2B"; ctx.fillRect(x - 1.5, y + 5, 3, 4);
      ctx.fillStyle = "#FFE36B"; ctx.beginPath(); ctx.arc(x, y - 9, 1.8, 0, TAU); ctx.fill();
    } else if (P.id === "snow") snowflake(x, y, 7, P.fg, 1.8);
    else if (P.id === "diggers") {
      rr(x - 8, y + 1, 12, 4, 2); fs("#3A3F55", o);
      rr(x - 8, y - 6, 10, 7, 1.5); fs(P.fg, o); rr(x - 5, y - 11, 6, 5, 1); fs(P.fg, o);
      ctx.beginPath(); ctx.moveTo(x + 1, y - 3); ctx.lineTo(x + 6, y - 9); ctx.lineTo(x + 9, y - 3); ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = P.fg; ctx.lineWidth = 1.6; ctx.stroke();
      poly([[x + 7, y - 3], [x + 11, y - 3], [x + 10, y + 1], [x + 7, y]]); fs("#8E9AAF", o);
    } else if (P.id === "trains") {
      rr(x - 9, y - 4, 12, 8, 1.5); fs(P.fg, o); rr(x - 9, y - 9, 6, 6, 1); fs(P.fg, o);
      rr(x + 2, y - 3, 8, 6, 3); fs("#2F8CFF", o);
      circle(x - 6, y + 5, 2.6, "#3A3F55", o); circle(x + 1, y + 5, 2.6, "#3A3F55", o); circle(x + 7, y + 5, 2, "#3A3F55", o);
    } else if (P.id === "rockets") {
      if (n % 2) { star(x, y, 4, "#FFD23B"); return; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(0.5);
      poly([[-4, 3], [-7, 8], [-3, 7]]); fs("#E8303F", o); poly([[4, 3], [7, 8], [3, 7]]); fs("#E8303F", o);
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(5, -5, 4, 7); ctx.lineTo(-4, 7); ctx.quadraticCurveTo(-5, -5, 0, -10); ctx.closePath(); fs(P.fg, o);
      circle(0, -2, 1.8, "#7FD0FF", 1);
      ctx.restore();
    } else if (P.id === "paws") {
      if (n % 2) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
        rr(-6, -2, 12, 4, 2); fs("#FFFFFF", o); [[-7, -2], [-7, 2], [7, -2], [7, 2]].forEach(([a, b]) => circle(a, b, 2.6, "#FFFFFF", o)); rr(-5.5, -1.5, 11, 3, 1.5); ctx.fillStyle = "#FFFFFF"; ctx.fill();
        ctx.restore(); return;
      }
      ctx.fillStyle = P.fg;
      ell(x, y + 2, 4.6, 3.8); ctx.fill();
      [[-5, -3], [-1.7, -6], [1.7, -6], [5, -3]].forEach(([a, b]) => { ell(x + a, y + b, 1.8, 2.3); ctx.fill(); });
    }
  }
  // The plain white back of wrapping paper, with its faint grid lines.
  function backSide(x0, y0, x1, y1) {
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = "rgba(120,140,180,0.22)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.ceil(x0 / 16) * 16; x < x1; x += 16) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = Math.ceil(y0 / 16) * 16; y < y1; y += 16) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();
  }
  // A paper roll centered at (x, y), lying along ang.
  function drawRoll(P, x, y, len, dia, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
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
  function drawScissors(x, y, ang, open) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    const a = 0.12 + 0.3 * (open || 0);
    [-1, 1].forEach((sd) => {
      ctx.save(); ctx.rotate(sd * a);
      poly([[0, -2.5], [34, -1], [36, 0], [34, 1.5], [0, 3]]); fs("#D7DEE8", 1.8);
      ctx.restore();
      ctx.save(); ctx.rotate(-sd * a);
      ell(-18, sd * 6, 9, 6, sd * 0.3); fs("#E8303F", 2); ell(-18, sd * 6, 4.5, 2.6, sd * 0.3); ctx.fillStyle = "#FFE9D6"; ctx.fill();
      ctx.restore();
    });
    circle(0, 0, 2.6, "#8E9AAF", 1.4);
    ctx.restore();
  }
  function drawDispenser(x, y) {
    ell(x, y + 34, 70, 9); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 62, y + 32); ctx.quadraticCurveTo(x - 66, y - 26, x - 10, y - 30); ctx.lineTo(x + 40, y - 22); ctx.lineTo(x + 52, y - 20); ctx.lineTo(x + 50, y + 32); ctx.closePath(); fs("#E8303F");
    ell(x - 10, y - 4, 30, 30); fs("rgba(225,236,248,0.9)");
    ell(x - 10, y - 4, 15, 15); fs("#E9D7B5", 1.8);
    ell(x - 10, y - 4, 6, 6); fs("#C9302C", 1.6);
    ctx.beginPath(); ctx.moveTo(x + 38, y - 30);
    for (let k = 0; k < 4; k++) { ctx.lineTo(x + 41 + k * 3, y - 34); ctx.lineTo(x + 43 + k * 3, y - 30); }
    ctx.lineTo(x + 52, y - 22); ctx.lineTo(x + 38, y - 22); ctx.closePath(); fs("#8E9AAF", 1.6);
    rr(x - 62, y + 26, 112, 8, 3); fs("#B5262E", 1.8);
  }
  function drawTape(x, y, rot, len) {
    const l = len || 34;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    rr(-8, -l / 2, 16, l, 2); ctx.fillStyle = "rgba(235,245,255,0.78)"; ctx.fill();
    ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.lineWidth = 1.4; ctx.stroke();
    line(-5, -l / 2 + 7, 3, -l / 2 + 13, "rgba(255,255,255,0.9)", 2);
    ctx.restore();
  }
  function drawSpool(x, y, hex, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    ctx.beginPath(); ctx.moveTo(10, 4); ctx.quadraticCurveTo(26, 10, 22, 24); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.stroke(); ctx.strokeStyle = hex; ctx.lineWidth = 5.4; ctx.stroke(); ctx.lineCap = "butt";
    circle(0, 0, 20, hex); circle(0, 0, 20, "rgba(0,0,0,0)"); ell(0, 0, 13, 13); ctx.strokeStyle = rgba("#1D2340", 0.2); ctx.lineWidth = 1.4; ctx.stroke();
    circle(0, 0, 7, "#E7C08A", 1.8); circle(0, 0, 2.5, "#9A6C3A", 1);
    ctx.restore();
  }
  const BOX = "#EBC48E", BOX_D = "#D7A86B", BOX_IN = "#B98852";
  // A plain cardboard box from above: top face and front strip (open: its inside and the gift showing).
  function drawCardboard(g, open, t) {
    rr(g.x0, g.y1, BW, BF, 3); fs(BOX_D);
    if (open) {
      rr(g.x0, g.y0, BW, BD, 3); fs(BOX);
      rr(g.x0 + 7, g.y0 + 7, BW - 14, BD - 14, 3); fs(BOX_IN);
      if (K.gift && K.job === "box" && !V.carry) { ctx.save(); rr(g.x0 + 7, g.y0 + 7, BW - 14, BD - 14, 3); ctx.clip(); drawThing(K.gift, g.cx, g.cy - 2, 46 * L.bs, { t }); ctx.restore(); }
    } else {
      rr(g.x0, g.y0, BW, BD, 3); fs(BOX);
      line(g.x0 + 4, g.y0 + 6, g.x1 - 4, g.y0 + 6, "rgba(255,255,255,0.45)", 2);
    }
  }
  // The box wrap from above at the mat, in whatever state the folds are.
  function drawWrap(t) {
    const g = matG(), P = K.paper ? PAPER_BY[K.paper] : null;
    const pf = K.side[0], pn = K.side[1];
    // The sheet (white side up) while it is pulled and cut, before the box is on it.
    if (P && K.pull > 0 && !K.placed) {
      const x0 = V.edge;
      backSide(x0, g.sy0, g.sx1, g.sy1);
      ctx.fillStyle = P.bg; ctx.fillRect(x0, g.sy0, 5, g.sy1 - g.sy0);
      rr(x0, g.sy0, g.sx1 - x0, g.sy1 - g.sy0, 2); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
      if (K.pull >= 1 && K.cut < 1) {
        // The dotted cut line, solid where it is already cut.
        const n = V.cutBins.length;
        for (let k = 0; k < n; k++) {
          const ya = lerp(g.sy0, g.sy1, k / n), yb = lerp(g.sy0, g.sy1, (k + 0.6) / n);
          line(g.sx1, ya, g.sx1, yb, V.cutBins[k] ? INK : "#2F8CFF", V.cutBins[k] ? 2.4 : 3);
        }
      }
    }
    if (!K.placed || !P) return;
    const pg = (x0, y0, x1, y1) => { ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); pattern(P, x0, y0, x1, y1); ctx.restore(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(); };
    const wh = (x0, y0, x1, y1, sh) => { backSide(x0, y0, x1, y1); if (sh) { ctx.fillStyle = "rgba(29,35,64," + sh + ")"; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); } ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(); };
    // The ends: they shrink to the box's height as the sides fold, then fold in.
    const eyT = lerp(g.sy0, g.y0, pf), eyB = lerp(g.sy1, g.yf, pn);
    [0, 1].forEach((e) => drawEnd(g, P, e, eyT, eyB));
    // Flat flaps (white) before they rise.
    if (pf < 0.5) wh(g.x0, g.y0 - FF * (1 - 2 * pf), g.x1, g.y0, pf * 0.4);
    if (pn < 0.5) wh(g.x0, g.yf, g.x1, g.yf + NF * (1 - 2 * pn), pn * 0.4);
    drawCardboard(g, false, t);
    // Folded over the top (pattern side).
    if (pf > 0.5) pg(g.x0, g.y0, g.x1, g.y0 + OV * (2 * pf - 1) + 0.5);
    if (pn > 0.5) {
      const top = g.yf - (BF + OV) * (2 * pn - 1);
      pg(g.x0, top, g.x1, g.yf);
      ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fillRect(g.x0, Math.max(top, g.y1), BW, g.yf - Math.max(top, g.y1));
    }
    // The folded ends' tips on the box's ends.
    [0, 1].forEach((e) => {
      const f = K.flap[e];
      if (f <= 0.5) return;
      const sd = e ? -1 : 1, x = e ? g.x1 : g.x0, d = 18 * Math.min(1, (f - 0.5) * 2);
      poly([[x, g.mid - 22], [x + sd * d, g.mid], [x, g.mid + 22]]);
      ctx.save(); ctx.clip(); pattern(P, x - 30, g.mid - 30, x + 30, g.mid + 30); ctx.restore();
      poly([[x, g.mid - 22], [x + sd * d, g.mid], [x, g.mid + 22]]); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
    });
    // Tape.
    ["s", "l", "r"].forEach((key) => { if (K.tape[key]) { const s = tapeSpot(key); drawTape(s.x, s.y, s.rot); } });
    // Where the next piece of tape goes.
    const tk = tapeKey();
    if (tk && phase === "make" && !busy) { const s = tapeSpot(tk); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.setLineDash([4, 4]); rr(-9, -18, 18, 36, 3); ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 2.6; ctx.stroke(); ctx.restore(); }
    drawRibbonBow(g, t);
    drawExtras();
  }
  // One end of the paper: flat (white), then its corners fold in (pattern triangles), then it folds up.
  function drawEnd(g, P, e, yT, yB) {
    const sd = e ? 1 : -1, xb = e ? g.x1 : g.x0, xo = xb + sd * E, tri = K.tri[e], f = K.flap[e];
    if (f >= 1) return;
    const mid = (yT + yB) / 2, reach = 1 - Math.min(1, f * 2);
    const ox = xb + sd * E * reach;
    const B = [ox, lerp(yT, mid - 5, tri)], C = [ox, lerp(yB, mid + 5, tri)];
    poly([[xb, yT], B, C, [xb, yB]]);
    ctx.save(); ctx.clip(); backSide(Math.min(xb, ox) - 2, yT - 2, Math.max(xb, ox) + 2, yB + 2); if (f > 0) { ctx.fillStyle = "rgba(29,35,64," + f * 0.3 + ")"; ctx.fillRect(Math.min(xb, ox) - 2, yT - 2, E + 4, yB - yT + 4); } ctx.restore();
    poly([[xb, yT], B, C, [xb, yB]]); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
    if (tri > 0.02) {
      [[[xb, yT], B, [xb, lerp(yT, mid, tri)]], [[xb, yB], C, [xb, lerp(yB, mid, tri)]]].forEach((tr) => {
        poly(tr); ctx.save(); ctx.clip(); pattern(P, Math.min(xb, ox) - 4, yT - 4, Math.max(xb, ox) + 4, yB + 4); ctx.restore();
        poly(tr); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
      });
    }
    void xo;
  }
  // The ribbon both ways, the bow loops, and the two ends (curled where the scissors went).
  function drawRibbonBow(g, t) {
    if (K.ribbon == null) return;
    const hex = RIBBONS[K.ribbon].hex, dk = shade(hex, -0.22), w = 12;
    const strip = (x0, y0, x1, y1) => { rr(x0, y0, x1 - x0, y1 - y0, 1); ctx.fillStyle = hex; ctx.fill(); ctx.strokeStyle = dk; ctx.lineWidth = 1.6; ctx.stroke(); };
    if (K.rib[0] > 0) strip(g.x0 - 2, g.cy - w / 2, g.x0 - 2 + (BW + 4) * K.rib[0], g.cy + w / 2);
    if (K.rib[1] > 0) strip(g.cx - w / 2, g.y0 - 2, g.cx + w / 2, g.y0 - 2 + (BD + BF + 4) * K.rib[1]);
    if (!allOne(K.rib)) return;
    const n = knotPt(), ww = wv("bow");
    ctx.save(); ctx.translate(n.x, n.y); ctx.scale(1 + Math.sin(t * 22) * ww * 0.06, 1 - Math.sin(t * 22) * ww * 0.06); ctx.translate(-n.x, -n.y);
    // Ends.
    [0, 1].forEach((k) => {
      const a = n, b = tailEnd(k), c = K.curl[k], pts = [];
      for (let i = 0; i <= 24; i++) {
        const u = i / 24, ln = 1 - 0.3 * c * u, x = lerp(a.x, b.x, u * ln), y = lerp(a.y, b.y, u * ln);
        const amp = 7 * c * Math.min(1, u * 3), ph = u * 22;
        pts.push([x + Math.cos(ph) * amp, y + Math.sin(ph) * amp * 0.6]);
      }
      limb(pts, hex, 6);
    });
    // Loops.
    [0, 1].forEach((k) => {
      const l = 0.25 + 0.75 * K.loop[k], sd = k ? 1 : -1;
      ell(n.x + sd * 15 * l, n.y - 4, 16 * l, 10 * Math.max(0.6, l), sd * -0.35); fs(hex);
      ell(n.x + sd * 14 * l, n.y - 4, 7 * l, 4 * l, sd * -0.35); ctx.fillStyle = dk; ctx.fill();
    });
    rr(n.x - 6, n.y - 10, 12, 13, 4); fs(hex);
    ctx.restore();
  }
  function drawTag(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1); ctx.rotate(-0.25);
    poly([[-10, -14], [10, -14], [12, 10], [0, 18], [-12, 10]]); fs("#FFF6DC", 1.8);
    circle(0, -8, 2.5, "#FFE9D6", 1.2);
    star(0, 4, 6, "#E8303F");
    ctx.restore();
  }
  function drawSticker(id, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
    if (id === "star") star(0, 0, 11, "#FFC93C", 1.8);
    else if (id === "flake") { circle(0, 0, 10, "#DDF1FF", 1.8); snowflake(0, 0, 7, "#2F8CFF", 2); }
    else { [-1, 1].forEach((sd) => { ell(sd * 6, 0, 8, 4, sd * 0.4); fs("#2E9455", 1.6); }); [[-2, -3], [3, -3], [0, 2]].forEach(([a, b]) => circle(a, b, 3, "#E8303F", 1.2)); }
    ctx.restore();
  }
  function drawExtras() {
    if (K.tag) { const p = extraSpot("tag"); drawTag(p.x, p.y, 1); }
    K.stickers.forEach((id) => { const p = extraSpot(id); drawSticker(id, p.x, p.y, 1); });
  }
  // The finished box present, small, anywhere (giving it).
  function drawGivenBox(x, y, s, a) {
    const P = PAPER_BY[K.paper] || PAPERS[0], hex = K.ribbon != null ? RIBBONS[K.ribbon].hex : "#FFC93C";
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
    rr(-BW / 2, -BD / 2, BW, BD + BF, 3); ctx.save(); ctx.clip(); pattern(P, -BW / 2, -BD / 2, BW / 2, BD / 2 + BF); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fillRect(-BW / 2, BD / 2, BW, BF); ctx.restore();
    rr(-BW / 2, -BD / 2, BW, BD + BF, 3); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke(); line(-BW / 2, BD / 2, BW / 2, BD / 2, INK, 2);
    rr(-BW / 2, -6, BW, 12, 1); ctx.fillStyle = hex; ctx.fill(); rr(-6, -BD / 2, 12, BD + BF, 1); ctx.fill();
    [-1, 1].forEach((sd) => { ell(sd * 15, -4, 16, 10, sd * -0.35); fs(hex); });
    rr(-6, -10, 12, 13, 4); fs(hex);
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing the bag, the stocking and the fireplace
  // =====================================================================================================
  // A gift bag standing with its bottom middle at (x, y).
  function drawBag(bag, x, y, s, o) {
    o = o || {};
    const P = PAPER_BY[bag.paper], w = 104, h = 112, t = o.t || 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // Handles behind and tissue behind the front.
    [-1, 1].forEach((sd) => { ctx.beginPath(); ctx.moveTo(sd * 30 - 14, -h + 4); ctx.quadraticCurveTo(sd * 30, -h - 34, sd * 30 + 14, -h + 4); ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 3; ctx.stroke(); });
    (o.tissue || []).forEach((c, k) => {
      const pop = ease((o.pop || [])[k] == null ? 1 : o.pop[k]), ang = [-0.5, 0.45, -0.1, 0.25][k], hh = 46 * pop;
      ctx.save(); ctx.translate([-22, 20, -4, 8][k], -h + 6); ctx.rotate(ang + Math.sin(t * 2 + k) * 0.03);
      ctx.beginPath(); ctx.moveTo(-18, 6);
      for (let i = 0; i <= 6; i++) ctx.lineTo(-18 + i * 6, 6 - hh + (i % 2 ? 0 : 12 * pop));
      ctx.lineTo(18, 6); ctx.closePath(); fs(TISSUE[c], 1.8);
      ctx.restore();
    });
    if (o.gift) drawThing(o.gift, 0, -h + 4, 46, { t });
    poly([[-w / 2, -h], [w / 2, -h], [w / 2 + 6, 0], [-w / 2 - 6, 0]]);
    ctx.save(); ctx.clip(); pattern(P, -w / 2 - 8, -h, w / 2 + 8, 0); ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-w / 2 - 8, -h, w + 16, 14); ctx.restore();
    poly([[-w / 2, -h], [w / 2, -h], [w / 2 + 6, 0], [-w / 2 - 6, 0]]); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineJoin = "round"; ctx.stroke();
    line(-w / 2 + 1, -h + 14, w / 2 - 1, -h + 14, rgba("#1D2340", 0.35), 1.6);
    [-1, 1].forEach((sd) => circle(sd * 30 - 14 * sd * 0, -h + 8, 3, "#FFFFFF", 1.4));
    ctx.restore();
  }
  // The stocking hangs from the peg at (x, y): a fluffy cuff, then the leg and the foot, bulging as it fills.
  function drawStocking(x, y, bulge, items, t, swing) {
    const bw = 58 + bulge * 26, cw = bw + 12;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 6) * swing * 0.12);
    line(0, -4, 0, 12, INK, 3);
    // The last few things poke out of the top.
    items.slice(-4).forEach((id, k) => { const n = Math.min(4, items.length); drawThing(id, (k - (n - 1) / 2) * 18, 18 - (k % 2) * 6, 30, { t }); });
    const top = 30, leg = 92, foot = 46;
    ctx.beginPath();
    ctx.moveTo(-bw / 2, top);
    ctx.quadraticCurveTo(-bw / 2 - 6 * bulge, top + leg * 0.6, -bw / 2 + 2, top + leg);
    ctx.quadraticCurveTo(-bw / 2, top + leg + 40, -bw / 2 + 28, top + leg + 40);
    ctx.lineTo(bw / 2 + foot - 8, top + leg + 40);
    ctx.quadraticCurveTo(bw / 2 + foot + 14, top + leg + 26, bw / 2 + foot - 6, top + leg + 4);
    ctx.lineTo(bw / 2 + 2, top + leg - 10);
    ctx.quadraticCurveTo(bw / 2 + 6 * bulge, top + leg * 0.5, bw / 2, top);
    ctx.closePath();
    ctx.save(); ctx.fillStyle = "#E8303F"; ctx.fill(); ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    for (let k = 0; k < 4; k++) ctx.fillRect(-bw, top + 24 + k * 22, bw * 3, 6);
    ctx.fillStyle = "#2E9455"; ctx.fillRect(bw / 2 + foot - 26, top + leg - 20, 60, 70);
    ell(-bw / 2 + 20, top + leg + 30, 24, 18); ctx.fill();
    ctx.restore();
    ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke();
    // Cuff.
    rr(-cw / 2, 8, cw, 30, 12); fs("#FFFFFF");
    for (let k = 0; k < 6; k++) circle(-cw / 2 + 8 + k * (cw - 16) / 5, 34, 5, "#FFFFFF", 0.1);
    ctx.restore();
  }
  function drawFireplace(t) {
    const F = L.fire, fl = 1 + V.flare * 0.6;
    rr(F.x, F.y + 18, F.w, F.h - 18, 6); fs("#C2563C");
    ctx.save(); rr(F.x, F.y + 18, F.w, F.h - 18, 6); ctx.clip();
    ctx.strokeStyle = "rgba(255,230,210,0.45)"; ctx.lineWidth = 2;
    for (let j = 0, y = F.y + 34; y < F.y + F.h; y += 18, j++) {
      ctx.beginPath(); ctx.moveTo(F.x, y); ctx.lineTo(F.x + F.w, y); ctx.stroke();
      for (let x = F.x + (j % 2 ? 0 : 20); x < F.x + F.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y); ctx.stroke(); }
    }
    ctx.restore();
    // The firebox with a calm, low fire.
    const fx = F.x + F.w * 0.24, fw = F.w * 0.52, fy = F.y + F.h * 0.5;
    ctx.beginPath(); ctx.moveTo(fx, F.y + F.h); ctx.lineTo(fx, fy + 30); ctx.quadraticCurveTo(fx, fy, fx + 30, fy); ctx.lineTo(fx + fw - 30, fy); ctx.quadraticCurveTo(fx + fw, fy, fx + fw, fy + 30); ctx.lineTo(fx + fw, F.y + F.h); ctx.closePath(); fs("#2B2238");
    const cx = fx + fw / 2, by = F.y + F.h - 14;
    [["#FF8A1F", 30, 46], ["#FFC93C", 18, 30]].forEach(([c, w, h]) => {
      const hh = h * fl * (0.9 + 0.1 * Math.sin(t * 5));
      ctx.beginPath(); ctx.moveTo(cx - w, by); ctx.quadraticCurveTo(cx - w * 0.8, by - hh * 0.6, cx, by - hh); ctx.quadraticCurveTo(cx + w * 0.8, by - hh * 0.6, cx + w, by); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    });
    rr(cx - 40, by - 4, 80, 10, 4); fs("#8A5530");
    // The mantel with a little garland.
    rr(F.x - 16, F.y, F.w + 32, 20, 4); fs("#8A5530");
    for (let k = 0; k < 10; k++) circle(F.x - 6 + k * (F.w + 12) / 9, F.y + 2, 7, k % 2 ? "#2E9455" : "#3FAE5E", 1.4);
    [0.15, 0.85].forEach((u) => circle(F.x + F.w * u, F.y + 4, 4, "#E8303F", 1.2));
    const p = pegPt(); circle(p.x, p.y - 6, 4, "#FFC93C", 1.4);
  }

  // =====================================================================================================
  // Drawing his small present
  // =====================================================================================================
  function drawMine(t) {
    const m = V.mine;
    if (!m) return;
    ctx.save(); ctx.globalAlpha = m.a == null ? 1 : m.a;
    const P = PAPER_BY[m.paper], mw = wv("mine");
    if (m.type === "box") {
      const g = mineG();
      wob(g.cx, g.yb, mw, t, () => {
        // The plain box under the paper, opening once the paper is off.
        ell(g.cx, g.yb + 3, MW * 0.58, 7); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
        rr(g.x0, g.yt, MW, MH, 3); fs("#F7F1E6");
        poly([[g.x0 + g.i, g.yt - g.d], [g.x1 - g.i, g.yt - g.d], [g.x1, g.yt], [g.x0, g.yt]]); fs(m.open ? "#C9B79A" : "#FFFFFF");
        if (!m.open) {
          ctx.save(); ctx.beginPath();
          for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
            if (m.torn[r * MC + c]) continue;
            const a = mgPt(g, c, r), b = mgPt(g, c + 1, r), d = mgPt(g, c + 1, r + 1), e = mgPt(g, c, r + 1);
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
          }
          ctx.clip(); pattern(P, g.x0 - 4, g.yt - g.d - 4, g.x1 + 4, g.yb + 4);
          poly([[g.x0 + g.i, g.yt - g.d], [g.x1 - g.i, g.yt - g.d], [g.x1, g.yt], [g.x0, g.yt]]); ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
          ctx.restore();
          ctx.beginPath();
          const open = (c, r) => c < 0 || r < 0 || c >= MC || r >= MR || m.torn[r * MC + c];
          for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
            if (m.torn[r * MC + c]) continue;
            const a = mgPt(g, c, r), b = mgPt(g, c + 1, r), d = mgPt(g, c + 1, r + 1), e = mgPt(g, c, r + 1);
            if (open(c, r - 1) || r === MTOP) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
            if (open(c + 1, r)) { ctx.moveTo(b.x, b.y); ctx.lineTo(d.x, d.y); }
            if (open(c, r + 1)) { ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y); }
            if (open(c - 1, r)) { ctx.moveTo(e.x, e.y); ctx.lineTo(a.x, a.y); }
          }
          ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
        }
      });
    } else if (m.type === "bag") {
      wob(m.x, m.y + 40, mw, t, () => {
        const tiss = [0, 1, 2].filter((k) => m.tiss[k] < 1 && k !== m.pullK).map((k) => (k + round) % 4);
        drawBag({ paper: m.paper }, m.x, m.y + 40, 0.62, { tissue: tiss, t });
        if (m.pullK >= 0 && V.tissPull) {
          const tp = V.tissPull;
          ctx.save(); ctx.translate(tp.x, tp.y);
          ctx.beginPath(); ctx.moveTo(-14, 10); for (let i = 0; i <= 6; i++) ctx.lineTo(-14 + i * 4.7, -18 + (i % 2 ? 0 : 8)); ctx.lineTo(14, 10); ctx.closePath(); fs(TISSUE[(m.pullK + round) % 4], 1.8);
          ctx.restore();
        }
      });
      (V.tissueFly || []).forEach((f) => { ctx.save(); ctx.globalAlpha *= f.a; ctx.translate(f.x, f.y); ctx.beginPath(); ctx.moveTo(-14, 10); for (let i = 0; i <= 6; i++) ctx.lineTo(-14 + i * 4.7, -18 + (i % 2 ? 0 : 8)); ctx.lineTo(14, 10); ctx.closePath(); fs(f.c, 1.8); ctx.restore(); });
    } else {
      // The cracker: a paper tube with twisted ends; it stretches as he pulls, then pops in two.
      const ext = m.open ? 1.4 : m.ext, gap = m.open ? 26 : 0, x = m.x, y = m.y;
      const half = (sd) => {
        ctx.save(); ctx.translate(x + sd * (gap / 2) + (sd > 0 ? ext * 40 : 0), y);
        const L0 = 40;
        rr(sd > 0 ? 0 : -L0, -11, L0, 22, 6);
        ctx.save(); ctx.clip(); pattern(P, -L0, -11, L0, 11); ctx.restore();
        rr(sd > 0 ? 0 : -L0, -11, L0, 22, 6); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
        const ex = sd * L0;
        poly([[ex, -11], [ex + sd * 10, -3], [ex + sd * 10, 3], [ex, 11]]); fs(P.bg, 1.8);
        poly([[ex + sd * 10, -3], [ex + sd * 24, -14], [ex + sd * 24, 14], [ex + sd * 10, 3]]); fs(P.bg, 1.8);
        rr((sd > 0 ? 6 : -34), -3, 28, 6, 3); ctx.fillStyle = "#FFC93C"; ctx.fill();
        ctx.restore();
      };
      ctx.save(); ctx.translate(0, 0); half(-1); half(1); ctx.restore();
      if (!m.open && m.ext > 0.05) { const mx = x + ext * 20; [-1, 1].forEach((sd) => line(mx - 4, y + sd * 6, mx + 4, y + sd * 8, INK, 1.4)); }
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing the room, the tray and the garland
  // =====================================================================================================
  let flakes = [];
  for (let k = 0; k < 70; k++) flakes.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2, v: 0.05 + Math.random() * 0.06, ph: Math.random() * TAU });
  let snowUntil = 0, sill = 0;
  function drawWall() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const by = voy + L.back * vs;
    ctx.fillStyle = "#FFE9D6"; ctx.fillRect(0, 0, W, by);
    ctx.fillStyle = "#FFE0C7";
    const sw = 20 * vs;
    for (let x = vox % (sw * 2) - sw * 2; x < W; x += sw * 2) ctx.fillRect(x, 0, sw, by);
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
  }
  function drawTable() {
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const by = voy + L.back * vs;
    ctx.fillStyle = "#E9B57D"; ctx.fillRect(0, by, W, H - by);
    ctx.fillStyle = "#E0A86E"; const ph = 46 * vs;
    for (let y = by + ph; y < H; y += ph) ctx.fillRect(0, y, W, 2 * Math.max(1, vs * 0.8));
    ctx.fillStyle = "#D99E62"; ctx.fillRect(0, by, W, 8 * vs);
    ctx.strokeStyle = INK; ctx.lineWidth = LW * vs; ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(W, by); ctx.stroke();
    ctx.restore();
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
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h * 0.78); ctx.quadraticCurveTo(w.x + w.w * 0.35, w.y + w.h * 0.6, w.x + w.w * 0.7, w.y + w.h * 0.8); ctx.quadraticCurveTo(w.x + w.w * 0.9, w.y + w.h * 0.7, w.x + w.w, w.y + w.h * 0.74); ctx.lineTo(w.x + w.w, w.y + w.h); ctx.lineTo(w.x, w.y + w.h); ctx.closePath(); ctx.fill();
    const tx = w.x + w.w * 0.74, ty = w.y + w.h * 0.74;
    ctx.fillStyle = "#2E9455"; ctx.beginPath(); ctx.moveTo(tx, ty - 34); ctx.lineTo(tx + 14, ty); ctx.lineTo(tx - 14, ty); ctx.closePath(); ctx.fill();
    const n = heavy ? 70 : 22, sp = heavy ? 1.8 : 1;
    flakes.forEach((f, k) => {
      f.y += f.v * sp * dt; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
      if (k >= n) return;
      ctx.beginPath(); ctx.arc(w.x + (f.x + Math.sin(t * 0.8 + f.ph) * 0.03) * w.w, w.y + f.y * w.h, f.s * (heavy ? 2.2 : 1), 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    });
    ctx.restore();
    rr(w.x, w.y, w.w, w.h, 4); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
    line(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h, INK, 5); line(w.x + w.w / 2, w.y, w.x + w.w / 2, w.y + w.h, "#FFFFFF", 2.4);
    line(w.x, w.y + w.h / 2, w.x + w.w, w.y + w.h / 2, INK, 5); line(w.x, w.y + w.h / 2, w.x + w.w, w.y + w.h / 2, "#FFFFFF", 2.4);
    rr(w.x - 10, w.y + w.h + 4, w.w + 20, 8, 3); fs("#FFFFFF");
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
  function drawWreath() {
    const p = L.wreath;
    if (!p) return;
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; circle(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 11, k % 2 ? "#2E9455" : "#3FAE5E", 1.6); }
    [0.4, 2.1, 3.6, 5.0].forEach((a) => circle(p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, 4, "#E8303F", 1.4));
    const hex = "#E8303F";
    ell(p.x - 12, p.y + 30, 12, 7, 0.35); fs(hex); ell(p.x + 12, p.y + 30, 12, 7, -0.35); fs(hex); rr(p.x - 5, p.y + 24, 10, 11, 3); fs(hex);
  }
  // The garland of lights along the top; his small surprises hang from it.
  function treatPt(k) {
    const G = L.garland, sp = (G.x1 - G.x0 - 28) / (TREATS_MAX - 1), x = G.x0 + 14 + k * sp;
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
    treats.forEach((id, k) => {
      if (V.treat && k === treats.length - 1 && V.treat.id === id) return;
      const p = treatPt(k), sw = V.treatWob[k] || 0;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(t * 1.2 + k) * 0.05 + Math.sin(t * 18) * sw * 0.3);
      line(0, 0, 0, 8, INK, 1.4);
      drawThing(id, 0, 20, 22, { t });
      ctx.restore();
    });
  }
  // The tray: whatever this step needs, sliding in from the side.
  function trayRect(k) { return k === "shelf" || (k === "rolls" && L === WIDE) || (k === "bags" && L === WIDE) ? L.shelf : L.tray; }
  function drawTray(t) {
    const k = V.tray.kind, off = V.tray.off;
    if (!k || off >= 1) return;
    const T = trayRect(k);
    ctx.save(); ctx.translate(ease(off) * (L.w - T.x + 40), 0);
    if (k === "shelf" || T === L.shelf) {
      const rows = k === "shelf" ? Math.ceil(GIFTS.length / T.cols) : k === "rolls" ? 2 : 3;
      rr(T.x, T.y - 4, T.w, T.h + 2, 10); fs("#C98B5A");
      rr(T.x + 7, T.y + 3, T.w - 14, T.h - 12, 6); fs("#F7E3C6");
      if (k !== "rolls" || L === WIDE) for (let r = 1; r <= rows; r++) { const y = T.y + T.h / rows * r - 6; rr(T.x + 4, y - 3, T.w - 8, 7, 3); fs("#B97A47", 1.8); }
    }
    const sway = (id) => Math.sin(t * 24) * wv(id) * 0.25;
    const at = (x, y, id, fn) => { ctx.save(); ctx.translate(x, y); ctx.rotate(sway(id)); fn(); ctx.restore(); };
    if (k === "shelf") GIFTS.forEach((gd, i) => {
      if ((V.carry && V.carry.kind === "gift" && V.carry.id === gd.id) || K.gift === gd.id) return;
      const s = shelfSlot(i); at(s.x, s.y, "g" + i, () => drawThing(gd.id, 0, 0, s.s, { t }));
    });
    else if (k === "rolls") PAPERS.forEach((P, i) => { if (V.roll && V.roll.i === i) return; const s = rollSlot(i); at(s.x, s.y, "r" + i, () => drawRoll(P, 0, 0, s.len, s.dia, s.ang)); });
    else if (k === "tools") {
      const sc = toolSlot(0), d = toolSlot(1);
      if (!V.scis && !(drag && drag.k === "cut")) at(sc.x, sc.y, "scis", () => drawScissors(0, 0, -0.5, 0.3));
      wob(d.x, d.y + 20, wv("disp"), t, () => drawDispenser(d.x, d.y));
    } else if (k === "spools") RIBBONS.forEach((rb, i) => { const s = spoolSlot(i); at(s.x, s.y, "sp" + i, () => drawSpool(0, 0, rb.hex, 1.1)); });
    else if (k === "extras") {
      const s0 = extraSlot(0);
      if (!K.tag && !(V.carry && V.carry.id === "tag")) at(s0.x, s0.y, "tag", () => drawTag(0, 0, 1.6));
      if (K.job === "box" || stepOf() === "give") STICKERS.forEach((q, i) => {
        if (K.stickers.includes(q.id) || (V.carry && V.carry.id === q.id)) return;
        const s = extraSlot(1 + i); at(s.x, s.y, "st" + i, () => drawSticker(q.id, 0, 0, 1.8));
      });
    } else if (k === "bags") BAGS.forEach((b, i) => { if (V.bag && V.bag.i === i) return; const s = bagSlot(i); at(s.x, s.y + 30, "b" + i, () => drawBag(b, 0, 0, L === TALL ? 0.5 : 0.5, { t })); });
    else if (k === "tissue") TISSUE.forEach((c, i) => {
      if (K.tissue.includes(i) || (V.carry && V.carry.kind === "tissue" && V.carry.id === i)) return;
      const s = tisSlot(i); at(s.x, s.y, "ts" + i, () => drawTissueSheet(c, 1));
    });
    else if (k === "stuff") STUFF.forEach((sf, i) => {
      if (K.items.includes(sf.id) || (V.carry && V.carry.id === sf.id)) return;
      const s = stuffSlot(i); at(s.x, s.y, "sf" + i, () => drawThing(sf.id, 0, 0, Math.min(46, s.s * 0.7), { t }));
    });
    ctx.restore();
  }
  function drawTissueSheet(c, s) {
    ctx.save(); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-26, 18); ctx.quadraticCurveTo(-30, -6, -18, -20); ctx.lineTo(-6, -12); ctx.lineTo(4, -24); ctx.lineTo(14, -12); ctx.lineTo(26, -18); ctx.quadraticCurveTo(30, 4, 24, 18); ctx.closePath(); fs(c, 1.8);
    line(-10, -4, 8, 8, "rgba(29,35,64,0.18)", 1.4);
    ctx.restore();
  }
  // Things moving between places.
  function drawMoving(t) {
    const c = V.carry;
    if (c) {
      if (c.kind === "gift" || c.kind === "stuff") drawThing(c.id, c.x, c.y, c.s, { t });
      else if (c.kind === "tissue") { ctx.save(); ctx.translate(c.x, c.y); drawTissueSheet(TISSUE[c.id], 1); ctx.restore(); }
      else if (c.kind === "extra") { if (c.id === "tag") drawTag(c.x, c.y, 1.2); else drawSticker(c.id, c.x, c.y, 1.3); }
    }
    if (V.bag) drawBag(BAGS[V.bag.i], V.bag.x, V.bag.y, V.bag.s, { t });
    V.tapeFly.forEach((f) => drawTape(f.x, f.y, f.rot));
    if (V.tapeCarry) {
      const m = mouthPt(), tc = V.tapeCarry, ang = Math.atan2(tc.y - m.y, tc.x - m.x), len = Math.min(140, dist(m, tc));
      ctx.save(); ctx.translate((m.x + tc.x) / 2, (m.y + tc.y) / 2); ctx.rotate(ang - Math.PI / 2);
      rr(-8, -len / 2, 16, len, 2); ctx.fillStyle = "rgba(235,245,255,0.78)"; ctx.fill(); ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.restore();
    }
    if (V.ribTrail && K.ribbon != null) {
      const s = spoolSlot(K.ribbon), p = V.ribTrail;
      ctx.beginPath(); ctx.moveTo(s.x + V.tray.off * 0, s.y); ctx.quadraticCurveTo((s.x + p.x) / 2, Math.max(s.y, p.y) + 40, p.x, p.y);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.stroke(); ctx.strokeStyle = RIBBONS[K.ribbon].hex; ctx.lineWidth = 4; ctx.stroke(); ctx.lineCap = "butt";
    }
    if (V.roll) { const r = V.roll; drawRoll(PAPERS[r.i], r.x, r.y, r.len, r.dia, r.ang); }
    if (V.scis) drawScissors(V.scis.x, V.scis.y, V.scis.ang, V.scis.open);
  }
  // Their opened gift, played with in a way that fits it.
  function drawPlay(t) {
    const tt = t - playT0, rc = R();
    V.items.forEach((it, k) => {
      let x = it.x, y = it.y, o = { t };
      if (phase !== "open" || tt > 0.8) {
        if (it.id === "bball" && k === V.items.findIndex((q) => q.id === "bball")) y -= Math.abs(Math.sin(tt * 3.2 + k)) * 30;
        if (it.id === "car") { x += Math.sin(tt * 1.3) * 24; o.wheels = Math.sin(tt * 1.3) * 10; }
      }
      drawThing(it.id, x, y, 28, o);
    });
    const gp = V.gp;
    if (!gp) return;
    const gd = GIFT_BY[gp.id], playing = phase !== "make" && tt > 0.6;
    let x = gp.x, y = gp.y, rot = gp.rot || 0;
    const o = { t }, m = reduce ? 0.5 : 1;
    if (playing && phase !== "out") {
      const hold = { x: V.rec.x + (onTable(rc) ? 34 : 26), y: recBase(rc) - (onTable(rc) ? 40 : 30) };
      if (gd.play === "bounce") { x = gp.x + Math.sin(tt * 1.6) * 30 * m; y -= Math.abs(Math.sin(tt * 3.2)) * 44 * m; }
      else if (gd.play === "roll") { x += Math.sin(tt * 1.6) * 34 * m; rot = Math.sin(tt * 1.6) * 1.2; }
      else if (gd.play === "drive") { x += Math.sin(tt * 1.2) * 40 * m; o.wheels = Math.sin(tt * 1.2) * 12; }
      else if (gd.play === "fly") { y -= 34 + Math.sin(tt * 2) * 18 * m; o.flame = true; rot = Math.sin(tt * 1.3) * 0.15; }
      else if (gd.play === "hug" || gd.play === "chew") { const k = ease(Math.min(1, (tt - 0.6) * 2)); x = lerp(gp.x, hold.x, k); y = lerp(gp.y, hold.y, k); rot = Math.sin(tt * (gd.play === "chew" ? 9 : 2)) * (gd.play === "chew" ? 0.12 : 0.08); }
      else rot = Math.sin(tt * 4) * 0.14;
    }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); drawThing(gd.id, 0, 0, gp.s, o); ctx.restore();
  }
  let actor = null;
  function drawActor(t) {
    if (!actor) return;
    const p = (t - actor.t0) / actor.dur;
    if (p >= 1) { actor = null; return; }
    const x = lerp(-120, L.w + 120, p), y = L.back + 22, wh = p * 60;
    if (Math.random() < 0.08) puff("steam", x + 22, y - 44, 1);
    drawThing("train", x, y - 16, 58, { t, wheels: wh });
    [["#FFC93C", -60], ["#3FAE4B", -108]].forEach(([c, dx]) => {
      rr(x + dx - 20, y - 26, 40, 22, 4); fs(c);
      [x + dx - 11, x + dx + 11].forEach((wx) => { circle(wx, y - 2, 6, "#3A3F55", 1.6); line(wx, y - 2, wx + Math.cos(wh) * 4, y - 2 + Math.sin(wh) * 4, "#FFFFFF", 1.4); });
      line(x + dx + 20, y - 10, x + dx + 28, y - 10, INK, 3);
    });
  }
  function drawParts() {
    parts.forEach((p) => {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      if (p.kind === "scrap") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const s = p.size; ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.cos(p.t * 8 + p.rot)));
        poly([[-s / 2, -s / 2], [s / 2, -s * 0.35], [s * 0.4, s / 2], [-s * 0.45, s * 0.4]]);
        ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
        if (p.c2) { ctx.fillStyle = p.c2; ctx.fillRect(-s * 0.15, -s * 0.15, s * 0.3, s * 0.3); }
        ctx.restore();
      } else if (p.kind === "spark") star(p.x, p.y, p.size, p.color);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.t), 0, TAU); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill(); }
      ctx.globalAlpha = 1;
    });
  }
  // The present on the scene (box at the mat or waiting; bag on the mat; stocking on the mantel).
  function drawWork(t) {
    if (given) {
      if (given.job === "box") drawGivenBox(given.x, given.y, given.s, given.a);
      else if (given.job === "bag") drawBag(BAG_BY[K.bag], given.x, given.y + 50 * given.s, given.s, { tissue: K.tissue, t });
      else { ctx.save(); ctx.globalAlpha = given.a; drawStocking(given.x, given.y - 80 * given.s, V.stock.bulge, K.items, t, 0); ctx.restore(); }
    }
    if (phase !== "make") return;
    if (K.job === "box") {
      const st = stepOf();
      if (st === "gift") {
        const g = matG();
        ell(g.cx, g.yf + 4, BW * 0.6, 8); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
        wob(g.cx, g.yf, wv("box"), t, () => {
          drawCardboard(g, K.lid < 1, t);
          if (K.lid > 0 && K.lid < 1) { const y = lerp(g.y0 - 80, g.y0, K.lid); ctx.save(); ctx.globalAlpha = K.lid; rr(g.x0 - 3, y - 3, BW + 6, BD + 6, 4); fs("#E3B57A"); ctx.restore(); }
        });
        return;
      }
      drawWrap(t);
      if (!K.placed) {
        const g = geo(V.box.x, V.box.y);
        ctx.save(); ctx.translate(V.box.x, V.box.y); ctx.scale(V.box.s, V.box.s); ctx.translate(-V.box.x, -V.box.y);
        ell(g.cx, g.yf + 4, BW * 0.6, 8); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
        wob(g.cx, g.yf, wv("box"), t, () => drawCardboard(g, false, t));
        ctx.restore();
      }
    } else if (K.job === "bag") {
      if (!K.bag) {
        const b = bagPt();
        ctx.save(); ctx.setLineDash([6, 6]); rr(b.x - 58, b.y - 116, 116, 116, 10); ctx.strokeStyle = "rgba(29,35,64,0.25)"; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
        return;
      }
      const b = bagPt();
      ell(b.x, b.y + 2, 64, 8); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill();
      wob(b.x, b.y, wv("bag"), t, () => {
        const dropping = V.drop.length && now() - V.drop[0].t0 < 0.4;
        drawBag(BAG_BY[K.bag], b.x, b.y, 1, { tissue: K.tissue, pop: V.tissuePop, gift: K.gift && !K.tissue.length && !dropping ? K.gift : null, t });
      });
      if (K.tag) { const p = extraSpot("tag"); line(b.x + 30, b.y - 136, p.x, p.y - 12, INK, 1.4); drawTag(p.x, p.y, 1); }
      K.stickers.forEach((id) => { const p = extraSpot(id); drawSticker(id, p.x, p.y, 1); });
    }
  }
  function drawStockingWork(t) {
    if (phase !== "make" || K.job !== "stocking") return;
    drawStocking(V.stock.x, V.stock.y, V.stock.bulge, K.items, t, V.stock.swing);
  }

  // =====================================================================================================
  // Drawing the recipients
  // =====================================================================================================
  // Real people and animals keep their faces all the time; they smile wider (eyes curved shut) when happy.
  function face(r, happy, open, t, eye) {
    const blink = (t % 4.1) < 0.12;
    ctx.strokeStyle = eye || INK; ctx.fillStyle = eye || INK; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    [-1, 1].forEach((s) => {
      if (happy || blink) { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.02, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.06, r * 0.1, 0, TAU); ctx.fill(); }
    });
    ctx.fillStyle = "rgba(255,120,140,0.35)"; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * r * 0.58, r * 0.24, r * 0.15, 0, TAU); ctx.fill(); });
    ctx.strokeStyle = INK;
    if (open) { ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.24, 0, Math.PI); ctx.closePath(); ctx.fillStyle = "#8C2F3A"; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, r * 0.22, happy ? r * 0.3 : r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.lineCap = "butt";
  }
  // Animal faces: eyes up top, then the nose, and the mouth always below the nose.
  function animalEyes(dx, y, r, happy, t) {
    const blink = (t % 4.3) < 0.12;
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    [-1, 1].forEach((s) => {
      if (happy || blink) { ctx.beginPath(); ctx.arc(s * dx, y + r * 0.4, r, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(s * dx, y, r * 0.75, 0, TAU); ctx.fill(); ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(s * dx + 1, y - 1, r * 0.25, 0, TAU); ctx.fill(); ctx.fillStyle = INK; }
    });
    ctx.lineCap = "butt";
  }
  function animalMouth(y, w, happy) {
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, y - 3); ctx.lineTo(0, y);
    ctx.moveTo(-w, y - 1); ctx.quadraticCurveTo(-w / 2, y + (happy ? 6 : 4), 0, y); ctx.quadraticCurveTo(w / 2, y + (happy ? 6 : 4), w, y - 1); ctx.stroke();
    ctx.lineCap = "butt";
  }
  function drawHat(rc, hr) {
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
      case "girl": {
        const cap = () => { ctx.beginPath(); ctx.arc(0, -hr * 0.3, hr * 0.95, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); };
        cap(); fs("#3D6FD8");
        ctx.save(); cap(); ctx.clip(); ctx.fillStyle = "#FFFFFF"; for (let k = -3; k <= 3; k++) ctx.fillRect(k * 9 - 2, -hr * 1.4, 4, hr * 1.2); ctx.restore();
        cap(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
        ell(hr * 0.75, -hr * 0.42, hr * 0.5, 6); fs("#3D6FD8");
        break;
      }
      case "painter":
        ell(-hr * 0.12, -hr * 0.78, hr * 0.98, hr * 0.38, -0.18); fs("#E8303F");
        rr(-3, -hr * 1.28, 6, 8, 2); fs("#E8303F", 1.6);
        break;
    }
  }
  function drawPerson(rc, t, P) {
    const kid = !!rc.kid, hr = kid ? 29 : 32, sh = kid ? 58 : 70, sw = kid ? 78 : 96;
    const shY = -sh, hy = shY - hr - 8;
    const arm = (side, hand) => limb([[side * (sw / 2 - 10), shY + 14], hand], rc.shirt, 12);
    const hand = (x, y) => circle(x, y, 8.5, rc.role === "astronaut" ? "#FFFFFF" : rc.skin, 2);
    const arms = [];
    if (P.cheer) { const w = Math.sin(t * 9) * 6; arms.push([-1, [-sw / 2 - 18 + w, shY - 46]], [1, [sw / 2 + 18 - w, shY - 46]]); }
    else if (P.wave) arms.push([1, [sw / 2 + 22 + Math.sin(t * 10) * 10, shY - 44]], [-1, [-sw / 2 + 4, shY + 80]]);
    else if (P.reach > 0.05) { const k = P.reach; arms.push([1, [sw / 2 + 6 + 30 * k, shY + 56 - 6 * k]], [-1, [-sw / 2 + 4, shY + 80]]); }
    else arms.push([-1, [-sw / 2 + 4, shY + 80]], [1, [sw / 2 - 4, shY + 80]]);
    if (rc.role === "girl") { ell(-hr * 0.98, hy + hr * 0.25, 8, 13, 0.4); fs(rc.hair); ell(hr * 0.98, hy + hr * 0.25, 8, 13, -0.4); fs(rc.hair); }
    rr(-sw / 2, shY, sw, sh + 30, 24); fs(rc.shirt);
    ctx.save(); rr(-sw / 2, shY, sw, sh + 30, 24); ctx.clip();
    if (rc.role === "builder") {
      ctx.fillStyle = "#FF8A1F"; ctx.fillRect(-sw / 2, shY, sw * 0.36, sh + 30); ctx.fillRect(sw / 2 - sw * 0.36, shY, sw * 0.36, sh + 30);
      ctx.fillStyle = "#E6ECF5"; ctx.fillRect(-sw / 2, shY + 36, sw * 0.36, 7); ctx.fillRect(sw / 2 - sw * 0.36, shY + 36, sw * 0.36, 7);
      line(-sw / 2 + sw * 0.36, shY, -sw / 2 + sw * 0.36, 30, INK, 1.6); line(sw / 2 - sw * 0.36, shY, sw / 2 - sw * 0.36, 30, INK, 1.6);
    } else if (rc.role === "baker") {
      // A striped apron over the white jacket.
      rr(-sw * 0.32, shY + 20, sw * 0.64, sh, 6); fs("#9FD3FF");
      ctx.fillStyle = "#FFFFFF"; for (let x = -sw * 0.32 + 6; x < sw * 0.32; x += 12) ctx.fillRect(x, shY + 21, 4, sh);
      rr(-sw * 0.32, shY + 20, sw * 0.64, sh, 6); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      [-1, 1].forEach((s) => line(s * sw * 0.3, shY + 22, s * sw * 0.16, shY + 2, INK, 2));
    } else if (rc.role === "farmer") {
      ctx.strokeStyle = "rgba(120,20,30,0.35)"; ctx.lineWidth = 3;
      for (let x = -sw / 2 + 8; x < sw / 2; x += 14) { ctx.beginPath(); ctx.moveTo(x, shY); ctx.lineTo(x, 30); ctx.stroke(); }
      for (let y = shY + 8; y < 30; y += 14) { ctx.beginPath(); ctx.moveTo(-sw / 2, y); ctx.lineTo(sw / 2, y); ctx.stroke(); }
      rr(-sw * 0.3, shY + 26, sw * 0.6, sh, 6); fs("#3D6FD8");
      [-1, 1].forEach((s) => { line(s * sw * 0.26, shY + 28, s * sw * 0.3, shY, INK, 9); line(s * sw * 0.26, shY + 28, s * sw * 0.3, shY, "#3D6FD8", 5.5); circle(s * sw * 0.24, shY + 30, 3, "#FFD23B", 1.2); });
    } else if (rc.role === "girl") { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-sw / 2, shY + 22, sw, 8); }
    else if (rc.role === "painter") {
      [["#2F8CFF", -18, 22], ["#FFD23B", 14, 34], ["#3FAE4B", -6, 48], ["#E8303F", 20, 14], ["#9B5DE5", -26, 40]].forEach(([c, x, y]) => { ell(x, shY + y, 5, 4); ctx.fillStyle = c; ctx.fill(); });
    } else if (rc.role === "astronaut") {
      rr(-14, shY + 18, 28, 20, 4); fs("#DDE3EE", 1.8);
      circle(-6, shY + 28, 3, "#E8303F", 1.2); circle(4, shY + 28, 3, "#2F8CFF", 1.2);
    }
    ctx.restore();
    rr(-sw / 2, shY, sw, sh + 30, 24); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    if (rc.role === "astronaut") { rr(-hr * 0.9, shY - 6, hr * 1.8, 12, 6); fs("#8E9AAF"); }
    else { ctx.beginPath(); ctx.moveTo(-12, shY + 1); ctx.quadraticCurveTo(0, shY + 14, 12, shY + 1); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }
    arms.forEach(([s, h]) => { arm(s, h); hand(h[0], h[1]); });
    ctx.save(); ctx.translate(0, hy); ctx.rotate(P.tilt || 0);
    if (rc.role === "girl" || rc.role === "baker" || rc.role === "painter" || rc.role === "astronaut") { ctx.beginPath(); ctx.arc(0, 0, hr + 2, Math.PI * 0.95, Math.PI * 2.05); ctx.closePath(); fs(rc.hair); }
    circle(0, 0, hr, rc.skin);
    if (rc.role === "builder" || rc.role === "farmer") { ctx.beginPath(); ctx.arc(0, -2, hr, Math.PI * 1.1, Math.PI * 1.9); ctx.quadraticCurveTo(0, -hr * 0.55, -hr * 0.95, -hr * 0.3); ctx.closePath(); fs(rc.hair); }
    if (rc.role === "astronaut") { ctx.beginPath(); ctx.arc(0, -2, hr, Math.PI * 1.08, Math.PI * 1.92); ctx.quadraticCurveTo(hr * 0.2, -hr * 0.5, -hr * 0.95, -hr * 0.3); ctx.closePath(); fs(rc.hair); }
    face(hr, P.happy, P.cheer, t);
    drawHat(rc, hr);
    if (rc.role === "astronaut") {
      ell(0, -2, hr + 13, hr + 13); ctx.fillStyle = "rgba(170,215,255,0.28)"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -2, hr + 8, Math.PI * 1.15, Math.PI * 1.45); ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
    }
    ctx.restore();
  }
  function drawDog(t, P) {
    const wag = Math.sin(t * (P.happy ? 16 : 5)) * (P.happy ? 0.6 : 0.3), C = "#C98A52", D = "#8A5530";
    ctx.save(); ctx.translate(30, -24); ctx.rotate(-0.6 + wag); limb([[0, 0], [14, -18], [18, -34]], C, 9); ctx.restore();
    ell(0, -36, 34, 38); fs(C);
    ell(0, -30, 18, 26); ctx.fillStyle = "#FFF1E0"; ctx.fill();
    rr(-24, -14, 18, 16, 8); fs(C); rr(6, -14, 18, 16, 8); fs(C);
    // A red collar with a round tag.
    rr(-22, -74, 44, 9, 4); fs("#E8303F"); circle(0, -62, 5, "#FFC93C", 1.6);
    ctx.save(); ctx.translate(0, -100); ctx.rotate(P.tilt || 0);
    const flap = P.happy ? Math.sin(t * 12) * 0.15 : 0;
    ell(-28, 2, 11, 22, 0.25 + flap); fs(D); ell(28, 2, 11, 22, -0.25 - flap); fs(D);
    circle(0, 0, 30, C);
    ell(0, 15, 17, 12); fs("#FFF1E0", 2);
    animalEyes(11, -6, 4.2, P.happy, t);
    ell(0, 8, 6, 4.5); ctx.fillStyle = INK; ctx.fill();
    animalMouth(17, 8, P.happy);
    if (P.happy) { rr(-4, 18, 8, 10, 4); fs("#FF7FA0", 1.6); }
    ctx.restore();
  }
  function drawCat(t, P) {
    const sway = Math.sin(t * (P.happy ? 5 : 2)) * 0.25, C = "#F4A04C";
    ctx.save(); ctx.translate(26, -14); ctx.rotate(sway);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(30, -10, 22, -50); ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.stroke(); ctx.strokeStyle = C; ctx.lineWidth = 8.6; ctx.stroke(); ctx.lineCap = "butt";
    ctx.restore();
    ell(0, -32, 30, 34); fs(C);
    ell(0, -26, 14, 20); ctx.fillStyle = "#FFE2BF"; ctx.fill();
    rr(-20, -12, 15, 14, 7); fs(C); rr(5, -12, 15, 14, 7); fs(C);
    rr(-18, -66, 36, 8, 4); fs("#2F8CFF"); circle(0, -56, 4.5, "#FFC93C", 1.6);
    ctx.save(); ctx.translate(0, -92); ctx.rotate(P.tilt || 0);
    [-1, 1].forEach((s) => { poly([[s * 26, -4], [s * 22, -38], [s * 4, -24]]); fs(C); poly([[s * 20, -10], [s * 19, -28], [s * 10, -21]]); ctx.fillStyle = "#FFC4A8"; ctx.fill(); });
    circle(0, 0, 28, C);
    ctx.strokeStyle = "#D9822E"; ctx.lineWidth = 3; [-8, 0, 8].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, -27); ctx.lineTo(x, -18); ctx.stroke(); });
    ell(0, 12, 12, 8); ctx.fillStyle = "#FFE2BF"; ctx.fill();
    animalEyes(10, -4, 4, P.happy, t);
    poly([[-4, 5], [4, 5], [0, 9]]); ctx.fillStyle = "#FF8FAB"; ctx.fill();
    animalMouth(13, 6, P.happy);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
    [-1, 1].forEach((s) => [0, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(s * 12, 9 + k * 4); ctx.lineTo(s * 30, 5 + k * 8); ctx.stroke(); }));
    ctx.restore();
  }
  function drawHamster(t, P) {
    const C = "#E9A65A";
    ctx.save(); ctx.rotate(P.tilt || 0);
    [-1, 1].forEach((s) => { circle(s * 24, -70, 10, C); circle(s * 24, -70, 5, "#FFB8C8", 1.4); });
    ell(0, -40, 40, 40); fs(C);
    ell(0, -28, 26, 24); ctx.fillStyle = "#FFF4E2"; ctx.fill();
    animalEyes(13, -56, 4, P.happy, t);
    ell(0, -47, 4, 3); ctx.fillStyle = "#FF7F9E"; ctx.fill();
    animalMouth(-42, 5, P.happy);
    [-1, 1].forEach((s) => { line(s * 7, -46, s * 24, -50, INK, 1.2); line(s * 7, -44, s * 24, -42, INK, 1.2); });
    ctx.fillStyle = "rgba(255,120,140,0.35)"; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * 22, -44, 5, 0, TAU); ctx.fill(); });
    [-1, 1].forEach((s) => circle(s * 12, -14, 6, "#FFC9D3", 1.6));
    ctx.restore();
  }
  // A cartoon pony looking over the table: eyes up on the head, a long muzzle with the nostrils at its end and
  // the smile under them.
  function drawPony(t, P) {
    const C = "#A8683C", M = "#5A3A22", MZ = "#E2B48A";
    ctx.beginPath(); ctx.moveTo(-36, 40); ctx.quadraticCurveTo(-30, -40, -16, -84); ctx.lineTo(20, -90); ctx.quadraticCurveTo(30, -30, 40, 40); ctx.closePath(); fs(C);
    ctx.beginPath(); ctx.moveTo(14, -120); ctx.quadraticCurveTo(42, -90, 34, -30); ctx.lineTo(24, -30); ctx.quadraticCurveTo(28, -84, 4, -112); ctx.closePath(); fs(M);
    ctx.save(); ctx.translate(4, -124); ctx.rotate((P.tilt || 0) + (P.happy ? Math.sin(t * 6) * 0.06 : 0));
    [-1, 1].forEach((s) => { poly([[s * 8, -26], [s * 20, -58], [s * 26, -22]]); fs(C); poly([[s * 12, -30], [s * 19, -50], [s * 22, -28]]); ctx.fillStyle = "#E79A8A"; ctx.fill(); });
    // The head: rounder at the top, narrowing to a long muzzle.
    ctx.beginPath(); ctx.moveTo(-28, -10); ctx.quadraticCurveTo(-30, -38, 0, -38); ctx.quadraticCurveTo(30, -38, 28, -10); ctx.quadraticCurveTo(26, 14, 22, 26); ctx.lineTo(-22, 26); ctx.quadraticCurveTo(-26, 14, -28, -10); ctx.closePath(); fs(C);
    ell(0, 34, 25, 20); fs(MZ);
    animalEyes(15, -12, 4.6, P.happy, t);
    ctx.fillStyle = "rgba(255,120,140,0.35)"; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * 21, 4, 5, 0, TAU); ctx.fill(); });
    [-9, 9].forEach((x) => { ell(x, 32, 3.2, 4.6); ctx.fillStyle = INK; ctx.fill(); });
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-10, 44); ctx.quadraticCurveTo(0, P.happy ? 51 : 48, 10, 44); ctx.stroke(); ctx.lineCap = "butt";
    // Forelock.
    ctx.beginPath(); ctx.moveTo(-14, -36); ctx.quadraticCurveTo(-4, -20, 2, -42); ctx.quadraticCurveTo(10, -20, 16, -36); ctx.quadraticCurveTo(4, -48, -14, -36); ctx.closePath(); fs(M);
    ctx.restore();
  }
  function drawRecipient(t, which) {
    const rc = R(), sit = onTable(rc);
    if ((which === "behind") === sit) return;
    const rv = V.rec, tt = now();
    const P = { happy: tt < rv.happy || phase === "joy" || phase === "out" || phase === "mine", cheer: tt < rv.cheer, wave: tt < rv.wave, reach: rv.reach, tilt: 0 };
    let base = recBase(rc) - rv.hop, rot = 0, sx = 1;
    if (rv.walk) { base -= Math.abs(Math.sin(t * 6)) * 6; rot = Math.sin(t * 6) * 0.05; }
    // They follow a bouncing ball or a rolling yarn ball with their head.
    if (V.gp && (phase === "joy" || phase === "mine") && /bounce|roll/.test(GIFT_BY[V.gp.id].play)) P.tilt = Math.sin((t - playT0) * 1.6) * 0.18;
    if (tt < rv.dance) {
      const d = t * 5;
      if (rc.kind === "dog") sx = Math.cos(d * 1.2);
      else { rot = Math.sin(d) * 0.14; base -= Math.abs(Math.sin(d)) * 14; P.tilt = Math.sin(d) * 0.15; }
      P.happy = true;
    }
    if (rv.wob > 0) rot += Math.sin(t * 22) * rv.wob * 0.08;
    ctx.save(); ctx.translate(rv.x, base); ctx.rotate(rot); ctx.scale(Math.abs(sx) < 0.15 ? 0.15 * Math.sign(sx || 1) : sx, 1);
    if (sit) { ell(0, 2, 40, 7); ctx.fillStyle = "rgba(29,35,64,0.12)"; ctx.fill(); }
    if (rc.kind === "person") drawPerson(rc, t, P);
    else if (rc.kind === "dog") drawDog(t, P);
    else if (rc.kind === "cat") drawCat(t, P);
    else if (rc.kind === "hamster") drawHamster(t, P);
    else drawPony(t, P);
    ctx.restore();
  }
  function drawSay() {
    if (!V.say || V.sayPop <= 0.01) return;
    const hp = headPt(R()), w = 190, h = 70, x = clamp(hp.x + hp.r + 26, 8, L.w - w - 8), y = Math.max(40, hp.y - h - 10), cx = x + w / 2, k = 0.7 + 0.3 * ease(V.sayPop);
    ctx.save(); ctx.globalAlpha = ease(V.sayPop); ctx.translate(cx, y + h / 2); ctx.scale(k, k); ctx.translate(-cx, -(y + h / 2));
    rr(x, y, w, h, 18); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 14, y + h - 2); ctx.lineTo(hp.x + hp.r * 0.6, hp.y - hp.r * 0.4); ctx.lineTo(x + 34, y + h - 2); ctx.closePath(); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x + 12, y + h - 6, 24, 5);
    text(V.say, cx, y + 23, 21, INK, 800);
    text("Thank you!", cx, y + 49, 20, "#2E9455", 800);
    ctx.restore();
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  const LINES = {
    gift: () => (K.job === "bag" ? "Put a present in the bag." : "Put a present in the box."),
    roll: () => "Pull wrapping paper off a roll.",
    cut: () => "Cut the paper along the dotted line.",
    place: () => "Put the box on the paper.",
    sides: () => "Fold the paper up over the box.",
    tapeS: () => "Pull a piece of tape onto the paper.",
    triL: () => "Fold in the corners at the left end.",
    flapL: () => "Fold up the paper at the left end.",
    tapeL: () => "Pull a piece of tape onto the left end.",
    triR: () => "Fold in the corners at the right end.",
    flapR: () => "Fold up the paper at the right end.",
    tapeR: () => "Pull a piece of tape onto the right end.",
    ribbon: () => "Wrap a ribbon round the present.",
    bow: () => "Pull out both loops of the bow.",
    curl: () => "Slide the scissors along each ribbon end.",
    bag: () => "Pick a gift bag.",
    tissue: () => "Put tissue paper in the bag.",
    tag: () => "Hang the tag on the bag.",
    fill: () => "Drop small things into the stocking.",
    give: () => "Give the " + (K.job === "stocking" ? "stocking" : "present") + " to " + R().name + "."
  };
  function want() {
    if (busy || V.rec.walk || drag) return null;
    const tk = trayFor();
    if (tk && (V.tray.kind !== tk || V.tray.off > 0.05)) return null;
    if (phase === "mine" && V.mine) {
      const m = V.mine;
      if (m.type === "box") return { line: "Pull the paper off your present.", part: "mine" };
      if (m.type === "bag") return { line: "Pull the tissue paper out of your bag.", part: "tiss" };
      return { line: "Pull the end of the cracker.", part: "crk" };
    }
    if (phase !== "make") return null;
    const st = stepOf();
    return { line: LINES[st](), part: st };
  }
  // The point and radius for a part (world units).
  function partPt(part) {
    const g = matG(), T = L.tray;
    switch (part) {
      case "gift": return { x: L.shelf.x + L.shelf.w / 2, y: L.shelf.y + L.shelf.h / 2, r: 80, box: L.shelf };
      case "roll": { const R0 = trayRect("rolls"); return { x: R0.x + R0.w / 2, y: R0.y + R0.h / 2, r: 80, box: R0 }; }
      case "cut": return { x: g.sx1, y: (g.sy0 + g.sy1) / 2, r: 30, rect: [g.sx1 - 14, g.sy0 - 6, g.sx1 + 14, g.sy1 + 6] };
      case "place": return { x: V.box.x, y: V.box.y + 6, r: 56 };
      case "sides": return K.side[0] < 1 ? { x: g.cx, y: g.y0 - FF / 2, r: 30, rect: [g.x0, g.y0 - FF, g.x1, g.y0] } : { x: g.cx, y: g.yf + NF / 2, r: 30, rect: [g.x0, g.yf, g.x1, g.yf + NF] };
      case "tapeS": case "tapeL": case "tapeR": { const s = tapeSpot(tapeKey()); return { x: s.x, y: s.y, r: 24 }; }
      case "triL": case "flapL": return { x: g.x0 - E / 2, y: g.mid, r: 30, rect: [g.sx0, g.y0, g.x0, g.yf] };
      case "triR": case "flapR": return { x: g.x1 + E / 2, y: g.mid, r: 30, rect: [g.x1, g.y0, g.sx1, g.yf] };
      case "ribbon": return K.ribbon != null && (K.rib[0] > 0 || K.rib[1] > 0) ? { x: g.cx, y: g.cy, r: 60 } : { x: T.x + T.w / 2, y: T.y + T.h / 2, r: 60, box: T };
      case "bow": { const k = K.loop[0] < 1 ? 0 : 1, h = loopHandle(k); return { x: h.x, y: h.y, r: 18 }; }
      case "curl": { const k = K.curl[0] < 1 ? 0 : 1, a = knotPt(), b = tailEnd(k); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 6, r: 26 }; }
      case "bag": { const R0 = trayRect("bags"); return { x: R0.x + R0.w / 2, y: R0.y + R0.h / 2, r: 60, box: R0 }; }
      case "tissue": return { x: T.x + T.w / 2, y: T.y + T.h / 2, r: 60, box: T };
      case "tag": { const s = extraSlot(0); return { x: s.x, y: s.y, r: 30 }; }
      case "fill": return { x: T.x + T.w / 2, y: T.y + T.h / 2, r: 60, box: T };
      case "give": { const p = presentPt(); return { x: p.x, y: p.y, r: p.r }; }
      case "mine": { const m = V.mine; return { x: m.x, y: m.y - 8, r: 62 }; }
      case "tiss": { const m = V.mine, k = m.tiss.findIndex((v) => v < 1); const p = tissPt(Math.max(0, k)); return { x: p.x, y: p.y, r: 24 }; }
      case "crk": { const m = V.mine; return { x: m.x + 62, y: m.y, r: 26 }; }
    }
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked()) return;
    const p = partPt(w.part);
    if (!p) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const stroke = () => { ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke(); };
    const gp = 3 + pulse * 4;
    if (p.box) { const B = p.box; rr(B.x - gp, B.y - 4 - gp, B.w + gp * 2, B.h + gp * 2, 12 + gp); stroke(); }
    else if (p.rect) { const [x0, y0, x1, y1] = p.rect; rr(x0 - gp, y0 - gp, x1 - x0 + gp * 2, y1 - y0 + gp * 2, 8 + gp); stroke(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 4 + pulse * 4, 0, TAU); stroke(); }
  }
  const coach = Toybox.coach($("coach"));
  function updateCoach() {
    if (drag) return;
    const w = want(), ln = w ? w.line : "";
    if (ln === lastWant) return;
    lastWant = ln;
    if (!ln) { coach.busy(); return; }
    coach.step(ln);
    // The line keeps clear of the work in the middle (the mat or his present).
    const p = phase === "mine" ? partPt(w.part) : K.job === "stocking" ? stockTop() : { x: L.mat.x, y: L.mat.y };
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag) return null;
      const w = want();
      if (!w) return null;
      const key = w.part, first = ghost.shown(key) < 1, P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const g = matG(), tap = (x, y) => ({ pts: [P(x, y)], tap: true, key });
      const st = w.part;
      if (st === "gift") { const s = shelfSlot(2), to = K.job === "bag" ? { x: bagPt().x, y: bagPt().y - 70 } : inBoxPt(); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(to.x, to.y)], dur: 1600, key }; }
      if (st === "roll") { const s = rollSlot(4), m = rollMat(); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(m.x - 10, m.y), P(g.sx0, m.y)], dur: 2200, key }; }
      if (st === "cut") return first ? tap(g.sx1, (g.sy0 + g.sy1) / 2) : { pts: [P(g.sx1, g.sy0), P(g.sx1, g.sy1)], dur: 1500, key };
      if (st === "place") return first ? tap(V.box.x, V.box.y) : { pts: [P(V.box.x, V.box.y), P(g.cx, g.cy)], dur: 1400, key };
      if (st === "sides") return K.side[0] < 1 ? (first ? tap(g.cx, g.y0 - FF / 2) : { pts: [P(g.cx, g.y0 - FF / 2), P(g.cx, g.cy)], dur: 1200, key }) : { pts: [P(g.cx, g.yf + NF / 2), P(g.cx, g.cy)], dur: 1200, key };
      if (/^tape/.test(st)) { const s = tapeSpot(tapeKey()), m = mouthPt(); return first ? tap(s.x, s.y) : { pts: [P(m.x, m.y), P(s.x, s.y)], dur: 1400, key }; }
      if (/^(tri|flap)/.test(st)) { const e = /R$/.test(st) ? 1 : 0, sd = e ? -1 : 1, x = e ? g.sx1 - 10 : g.sx0 + 10; return first ? tap(x, g.mid) : { pts: [P(x, g.mid), P(x + sd * 40, g.mid)], dur: 1000, key }; }
      if (st === "ribbon") { const s = spoolSlot(0); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(g.x0, g.cy), P(g.x1, g.cy), P(g.cx, g.y0), P(g.cx, g.yf)], dur: 2600, key }; }
      if (st === "bow") { const h = loopHandle(K.loop[0] < 1 ? 0 : 1), n = knotPt(); return first ? tap(h.x, h.y) : { pts: [P(h.x, h.y), P(h.x + (h.x - n.x) * 2, h.y - 6)], dur: 1000, key }; }
      if (st === "curl") { const k = K.curl[0] < 1 ? 0 : 1, a = knotPt(), b = tailEnd(k); return first ? tap((a.x + b.x) / 2, (a.y + b.y) / 2) : { pts: [P(a.x, a.y), P(b.x, b.y)], dur: 1200, key }; }
      if (st === "bag") { const s = bagSlot(0), b = bagPt(); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(b.x, b.y - 50)], dur: 1400, key }; }
      if (st === "tissue") { const i = [0, 1, 2, 3].find((k) => !K.tissue.includes(k)), s = tisSlot(i), b = bagPt(); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(b.x, b.y - 110)], dur: 1400, key }; }
      if (st === "tag") { const s = extraSlot(0), p = extraSpot("tag"); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(p.x, p.y)], dur: 1400, key }; }
      if (st === "fill") { const i = STUFF.findIndex((q) => !K.items.includes(q.id)), s = stuffSlot(i), tp = stockTop(); return first ? tap(s.x, s.y) : { pts: [P(s.x, s.y), P(tp.x, tp.y)], dur: 1400, key }; }
      if (st === "give") { const p = presentPt(); return first ? tap(p.x, p.y) : { pts: [P(p.x, p.y), P(L.give.x, L.give.y)], dur: 1400, key }; }
      if (st === "mine") { const m = V.mine; return first ? tap(m.x, m.y) : { pts: [P(m.x - 40, m.y - 30), P(m.x - 10, m.y + 20), P(m.x + 20, m.y - 30), P(m.x + 44, m.y + 20)], dur: 1800, key }; }
      if (st === "tiss") { const p = partPt("tiss"); return first ? tap(p.x, p.y) : { pts: [P(p.x, p.y), P(p.x, p.y - 60)], dur: 1000, key }; }
      if (st === "crk") { const m = V.mine; return first ? tap(m.x + 62, m.y) : { pts: [P(m.x + 62, m.y), P(m.x + 130, m.y)], dur: 1000, key }; }
      return null;
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  const trayIn = () => V.tray.off < 0.05;
  const inRect = (w, r, pad) => w.x >= r[0] - (pad || 0) && w.x <= r[2] + (pad || 0) && w.y >= r[1] - (pad || 0) && w.y <= r[3] + (pad || 0);
  // The part under a press (client px): the things he works with now come before the scenery behind them.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 26 / vs;
    let best = null, bd = Infinity;
    const cand = (id, x, y, r) => { const d = Math.hypot(w.x - x, w.y - y); if (d <= Math.max(r, minR) && d - r * 0.3 < bd) { bd = d - r * 0.3; best = id; } };
    const g = matG(), st = phase === "make" ? stepOf() : null;
    // His present.
    if (phase === "mine" && V.mine) {
      const m = V.mine;
      if (m.type === "box" && !m.open && Math.abs(w.x - m.x) < MW / 2 + 20 && w.y > m.y - MH / 2 - MD - 20 && w.y < m.y + MH / 2 + 16) return "mine";
      if (m.type === "bag" && !m.open) { m.tiss.forEach((v, k) => { if (v < 1) { const p = tissPt(k); cand("tiss" + k, p.x, p.y, 24); } }); if (best) return best; if (Math.abs(w.x - m.x) < 50 && Math.abs(w.y - m.y) < 60) return "minebag"; }
      if (m.type === "cracker" && !m.open && w.x > m.x - 70 && w.x < m.x + 110 && Math.abs(w.y - m.y) < 40) return "crk";
    }
    // The tray.
    const k = V.tray.kind;
    if (trayIn() && k) {
      if (k === "shelf") GIFTS.forEach((gd, i) => { if (K.gift !== gd.id) { const s = shelfSlot(i); cand("g" + i, s.x, s.y, s.s * 0.62); } });
      else if (k === "rolls") PAPERS.forEach((P, i) => { if (!(V.roll && V.roll.i === i)) { const s = rollSlot(i), up = s.ang === 0; if (Math.abs(w.x - s.x) < (up ? s.len / 2 : s.dia / 2 + 10) && Math.abs(w.y - s.y) < (up ? s.dia / 2 + 10 : s.len / 2)) cand("r" + i, w.x, w.y, 1 + i * 0.01); } });
      else if (k === "tools") { const sc = toolSlot(0), d = toolSlot(1); cand("scis", sc.x, sc.y, 34); if (Math.abs(w.x - d.x) < 66 && Math.abs(w.y - d.y) < 44) cand("disp", w.x, w.y, 2); }
      else if (k === "spools") RIBBONS.forEach((rb, i) => { const s = spoolSlot(i); cand("sp" + i, s.x, s.y, 30); });
      else if (k === "extras") { if (!K.tag) { const s = extraSlot(0); cand("tag", s.x, s.y, 30); } STICKERS.forEach((q, i) => { if (!K.stickers.includes(q.id) && (K.job === "box" || st === "give")) { const s = extraSlot(1 + i); cand("st" + i, s.x, s.y, 28); } }); }
      else if (k === "bags") BAGS.forEach((b, i) => { const s = bagSlot(i); cand("b" + i, s.x, s.y, 36); });
      else if (k === "tissue") TISSUE.forEach((c, i) => { if (!K.tissue.includes(i)) { const s = tisSlot(i); cand("ts" + i, s.x, s.y, 32); } });
      else if (k === "stuff") STUFF.forEach((sf, i) => { if (!K.items.includes(sf.id)) { const s = stuffSlot(i); cand("sf" + i, s.x, s.y, 28); } });
      if (best) return best;
    }
    // The work.
    if (phase === "make") {
      if (K.job === "box") {
        if (st === "cut" && Math.abs(w.x - g.sx1) < 36 && w.y > g.sy0 - 20 && w.y < g.sy1 + 20) return "cutline";
        if (st === "roll" && V.roll && Math.abs(w.x - V.roll.x) < 30 && Math.abs(w.y - V.roll.y) < V.roll.len / 2) return "rollm";
        if (st === "roll" && K.pull > 0 && w.x > V.edge - 20 && w.x < g.sx1 && w.y > g.sy0 && w.y < g.sy1) return "edge";
        if (!K.placed && V.box.s < 0.95 && Math.abs(w.x - V.box.x) < BW * V.box.s * 0.6 + 6 && Math.abs(w.y - V.box.y) < (BD + BF) * V.box.s * 0.6 + 14) return "boxw";
        if (st === "place" && w.x > g.sx0 && w.x < g.sx1 && w.y > g.sy0 && w.y < g.sy1) return "sheet";
        if (st === "sides") { if (K.side[0] < 1 && inRect(w, [g.x0, g.y0 - FF, g.x1, g.y0 + 10], 10)) return "flapF"; if (K.side[1] < 1 && inRect(w, [g.x0, g.y1, g.x1, g.yf + NF], 10)) return "flapN"; }
        if (/^(tri|flap)L$/.test(st) && inRect(w, [g.sx0, g.y0, g.x0 + 10, g.yf], 14)) return "endL";
        if (/^(tri|flap)R$/.test(st) && inRect(w, [g.x1 - 10, g.y0, g.sx1, g.yf], 14)) return "endR";
        if (st === "bow") { [0, 1].forEach((kk) => { if (K.loop[kk] < 1) { const h = loopHandle(kk); cand("loop" + kk, h.x, h.y, 22); } }); if (best) return best; }
        if (st === "curl") {
          [0, 1].forEach((kk) => { if (K.curl[kk] < 1) { const a = knotPt(), b = tailEnd(kk); cand("tail" + kk, lerp(a.x, b.x, 0.6), lerp(a.y, b.y, 0.6), 26); } });
          if (best) return best;
        }
        if (K.placed && inRect(w, [g.x0, g.y0, g.x1, g.yf], 10)) return "box";
        if (st === "gift" && inRect(w, [g.x0, g.y0, g.x1, g.yf], 10)) return "box";
      } else if (K.job === "bag") {
        const b = bagPt();
        if (Math.abs(w.x - b.x) < 64 && w.y > b.y - 150 && w.y < b.y + 8) return "bag";
      } else {
        const s = V.stock;
        if (Math.abs(w.x - s.x - 16) < 70 && w.y > s.y - 10 && w.y < s.y + 175) return "stocking";
        const F = L.fire; if (w.x > F.x && w.x < F.x + F.w && w.y > F.y + F.h * 0.5) return "fire";
      }
    }
    if (V.gp && (phase === "joy" || phase === "mine")) { cand("their", V.gp.x, V.gp.y, 34); if (best) return best; }
    const rc = R(), hp = headPt(rc), base = recBase(rc);
    if (Math.abs(w.x - V.rec.x) < 54 && w.y > hp.y - hp.r - 30 && w.y < base + 6) return "rec";
    const wn = L.win;
    if (w.x > wn.x - 8 && w.x < wn.x + wn.w + 8 && w.y > wn.y - 8 && w.y < wn.y + wn.h + 14) return "window";
    treats.forEach((id, i) => { const p = treatPt(i); cand("tr" + i, p.x, p.y + 20, 14); });
    return best;
  }
  function hint() { const w = want(); if (w) { coach.say(w.line, 3); ghost.poke(); } }
  // A tap: each part does its own one step. Parts not needed right now still answer (a wiggle and a name).
  function doTap(part, cx, cy) {
    if (locked() || part == null) return;
    const st = phase === "make" ? stepOf() : null, w = wpt(cx, cy);
    const nm = (id, name, x, y) => { wobble(id); tag(name, x, y); };
    let m;
    if ((m = /^g(\d+)$/.exec(part))) { const i = +m[1]; if (st === "gift") { ghost.learned("gift"); giftIn(GIFTS[i].id); } else { const s = shelfSlot(i); nm("g" + i, GIFTS[i].name, s.x, s.y - 30); } }
    else if ((m = /^r(\d)$/.exec(part))) { const i = +m[1]; if (st === "roll" && !busy) { ghost.learned("roll"); pullAuto(i); } else { const s = rollSlot(i); nm("r" + i, PAPERS[i].name, s.x, s.y - 20); } }
    else if (part === "rollm" || part === "edge") { if (st === "roll") pullAuto(); }
    else if (part === "scis" || part === "cutline") { if (st === "cut") { ghost.learned("cut"); cutAuto(); } else if (st === "curl") curlAuto(); else { const s = toolSlot(0); nm("scis", "Scissors", s.x, s.y - 20); } }
    else if (part === "disp") { if (tapeKey()) { ghost.learned(st); tapeOn(); } else { const d = toolSlot(1); nm("disp", "Tape dispenser", d.x, d.y - 40); } }
    else if (part === "boxw" || part === "sheet") { if (st === "place") { ghost.learned("place"); placeBox(); } else { wobble("box"); hint(); } }
    else if (part === "flapF") { ghost.learned("sides"); sideAuto(0); }
    else if (part === "flapN") { ghost.learned("sides"); sideAuto(1); }
    else if (part === "endL" || part === "endR") { ghost.learned(st); endAuto(part === "endR" ? 1 : 0); }
    else if ((m = /^sp(\d)$/.exec(part))) { const i = +m[1]; if (st === "ribbon") { ghost.learned("ribbon"); ribbonAuto(i); } else { const s = spoolSlot(i); nm("sp" + i, RIBBONS[i].name, s.x, s.y - 26); } }
    else if ((m = /^loop(\d)$/.exec(part))) { ghost.learned("bow"); loopAuto(+m[1]); }
    else if ((m = /^tail(\d)$/.exec(part))) { ghost.learned("curl"); curlAuto(+m[1]); }
    else if (part === "box") {
      if (st === "give") { ghost.learned("give"); giveIt(); }
      else if (st === "sides") sideAuto(K.side[0] < 1 ? 0 : 1);
      else if (tapeKey()) tapeOn();
      else if (/^(tri|flap)/.test(st)) endAuto(/R$/.test(st) ? 1 : 0);
      else if (st === "ribbon") ribbonAuto();
      else if (st === "bow") loopAuto();
      else if (st === "curl") curlAuto();
      else { wobble("box"); const g = matG(); tag(K.placed ? "Present" : "Box", g.cx, g.y0 - 10); hint(); }
    }
    else if (part === "tag" || (m = /^st(\d)$/.exec(part))) { const id = part === "tag" ? "tag" : STICKERS[+m[1]].id; ghost.learned("tag"); extraOn(id); }
    else if ((m = /^b(\d)$/.exec(part))) { const i = +m[1]; if (st === "bag") { ghost.learned("bag"); pickBag(i); } else { const s = bagSlot(i); nm("b" + i, BAGS[i].name, s.x, s.y - 30); } }
    else if ((m = /^ts(\d)$/.exec(part))) { ghost.learned("tissue"); tissueIn(+m[1]); }
    else if ((m = /^sf(\d)$/.exec(part))) { ghost.learned("fill"); stuffIn(STUFF[+m[1]].id); }
    else if (part === "bag") {
      if (st === "give") { ghost.learned("give"); giveIt(); }
      else if (st === "tissue") { const i = [0, 1, 2, 3].find((q) => !K.tissue.includes(q)); if (i != null) tissueIn(i); }
      else if (st === "tag") extraOn("tag");
      else { wobble("bag"); const b = bagPt(); tag(K.bag ? BAG_BY[K.bag].name : "Gift bag", b.x, b.y - 130); hint(); }
    }
    else if (part === "stocking") { if (st === "give") { ghost.learned("give"); giveIt(); } else { V.stock.swing = 1; tag("Stocking", V.stock.x, V.stock.y); hint(); } }
    else if (part === "fire") { V.flare = 1; tag("Fireplace", L.fire.x + L.fire.w / 2, L.fire.y + L.fire.h * 0.5); }
    else if (part === "mine") { ghost.learned("mine"); ripMine(w.x); }
    else if ((m = /^tiss(\d)$/.exec(part)) || part === "minebag") { ghost.learned("tiss"); tissOut(m ? +m[1] : null); }
    else if (part === "crk") { ghost.learned("crk"); crackerAuto(); }
    else if (part === "their") { hopRec(220); const gp = V.gp; wobble("their"); tag(GIFT_BY[gp.id].name, gp.x, gp.y - 36); }
    else if (part === "rec") {
      if (st === "give") { ghost.learned("give"); giveIt(); return; }
      hopRec(220); V.rec.happy = Math.max(V.rec.happy, now() + 1.2);
      const rc = R(), h = headPt(rc); tag(rc.tag, h.x, h.y - h.r - 30);
    }
    else if (part === "window") { V.winWob = 1; snowUntil = Math.max(snowUntil, now() + 2.5); tag("Window", L.win.x + L.win.w / 2, L.win.y); }
    else if ((m = /^tr(\d+)$/.exec(part))) { const i = +m[1]; V.treatWob[i] = 1; const p = treatPt(i); tag(TREAT_BY[treats[i]].name, p.x, p.y + 4); }
  }

  // Drags: the part follows his finger and the real thing happens while he does it. One finger owns the drag.
  // A press held still and let go in place counts as that part's tap.
  const SLOP = 12;
  let skipTap = false;
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null) return;
      startDrag(part, s);
      if (!drag) drag = { k: "hold", part };
      drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy); drag.cx = s.x0; drag.cy = s.y0; drag.last = wpt(s.x0, s.y0);
      if (drag.k !== "hold") moveDrag(wpt(s.x, s.y));
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      moveDrag(wpt(s.x, s.y));
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      if (s.tap) skipTap = true;
      endDrag(d, d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP);
    },
    tap: (part, x, y) => { if (skipTap) { skipTap = false; return; } if (!drag) doTap(part, x, y); }
  });
  // Starts the drag for a part (sets drag) when the part has a motion of its own right now.
  function startDrag(part, s) {
    const w0 = wpt(s.x0, s.y0), st = phase === "make" ? stepOf() : null;
    let m;
    const carry = (kind, id, home, size) => { busy = true; drag = { k: "carry", kind, id, ox: home.x - w0.x, oy: home.y - w0.y - 12, home: { ...home } }; V.carry = { kind, id, x: home.x, y: home.y, s: size || home.s || 40 }; };
    if ((m = /^g(\d+)$/.exec(part)) && st === "gift" && !busy) { const sl = shelfSlot(+m[1]); carry("gift", GIFTS[+m[1]].id, sl, sl.s * 1.1); ghost.learned("gift"); }
    else if ((m = /^sf(\d)$/.exec(part)) && st && K.job === "stocking" && !busy) { const sl = stuffSlot(+m[1]); carry("stuff", STUFF[+m[1]].id, sl, 44); ghost.learned("fill"); }
    else if ((m = /^ts(\d)$/.exec(part)) && K.job === "bag" && K.gift && !busy && K.tissue.length < 4) { carry("tissue", +m[1], tisSlot(+m[1]), 1); ghost.learned("tissue"); }
    else if ((part === "tag" || (m = /^st(\d)$/.exec(part))) && !busy && (st === "give" || (st === "tag" && part === "tag"))) { const id = part === "tag" ? "tag" : STICKERS[+m[1]].id; carry("extra", id, extraSlot(part === "tag" ? 0 : 1 + +m[1]), 1); ghost.learned("tag"); }
    else if ((m = /^b(\d)$/.exec(part)) && st === "bag" && !busy) { const sl = bagSlot(+m[1]); busy = true; drag = { k: "bag", ox: sl.x - w0.x, oy: sl.y + 30 - w0.y }; V.bag = { i: +m[1], x: sl.x, y: sl.y + 30, s: 0.6 }; ghost.learned("bag"); }
    else if (((m = /^r(\d)$/.exec(part)) || part === "rollm" || part === "edge") && st === "roll" && !busy) { if (m) pickRoll(+m[1]); drag = { k: "pull" }; ghost.learned("roll"); }
    else if ((part === "scis" || part === "cutline") && st === "cut" && !busy) { drag = { k: "cut" }; V.scis = { x: w0.x, y: w0.y, ang: Math.PI / 2, open: 0.3 }; ghost.learned("cut"); }
    else if ((part === "boxw" || part === "sheet") && st === "place" && !busy) { busy = true; drag = { k: "box", ox: V.box.x - w0.x, oy: V.box.y - w0.y }; ghost.learned("place"); }
    else if ((part === "flapF" || part === "flapN") && st === "sides" && !busy) { drag = { k: "side", i: part === "flapF" ? 0 : 1, y0: w0.y, v0: K.side[part === "flapF" ? 0 : 1] }; ghost.learned("sides"); }
    else if ((part === "endL" || part === "endR") && /^(tri|flap)/.test(st) && !busy) { const e = part === "endR" ? 1 : 0; drag = { k: /^tri/.test(st) ? "tri" : "flap", e, x0: w0.x }; ghost.learned(st); }
    else if ((part === "disp" || part === "box") && tapeKey() && !busy) { drag = { k: "tape" }; V.tapeCarry = { x: w0.x, y: w0.y }; wobble("disp", 0.6); ghost.learned(st); }
    else if (((m = /^sp(\d)$/.exec(part)) || part === "box") && st === "ribbon" && !busy) { ribbonGo(m ? +m[1] : null); drag = { k: "ribbon" }; V.ribTrail = { x: w0.x, y: w0.y }; ghost.learned("ribbon"); }
    else if ((m = /^loop(\d)$/.exec(part)) && st === "bow" && !busy) { drag = { k: "loop", i: +m[1] }; ghost.learned("bow"); }
    else if ((m = /^tail(\d)$/.exec(part)) && st === "curl" && !busy) { drag = { k: "curl", i: +m[1] }; V.scis = { x: w0.x, y: w0.y, ang: 0, open: 1 }; ghost.learned("curl"); }
    else if ((part === "box" || part === "bag" || part === "stocking") && st === "give" && !busy) { busy = true; const p = presentPt(); drag = { k: "give", ox: p.x - w0.x, oy: p.y - w0.y, p }; V.giveDrag = { x: p.x, y: p.y }; ghost.learned("give"); }
    else if (part === "mine" && phase === "mine") { drag = { k: "tear" }; ghost.learned("mine"); }
    else if ((m = /^tiss(\d)$/.exec(part)) && phase === "mine") { const k = +m[1], p = tissPt(k); drag = { k: "tiss", i: k, y0: w0.y, p }; V.mine.pullK = k; V.tissPull = { x: p.x, y: p.y }; ghost.learned("tiss"); }
    else if (part === "crk" && phase === "mine" && !busy) { drag = { k: "crk", x0: w0.x, e0: V.mine.ext }; ghost.learned("crk"); }
  }
  function moveDrag(w) {
    const d = drag, g = matG();
    if (!d) return;
    if (d.k === "carry" && V.carry) { V.carry.x = w.x + d.ox; V.carry.y = w.y + d.oy; }
    else if (d.k === "bag" && V.bag) { V.bag.x = w.x + d.ox; V.bag.y = w.y + d.oy; }
    else if (d.k === "pull") { if (V.roll && stepOf() === "roll") setPull(w.x); if (K.pull >= 1) { drag = null; pullDone(); } }
    else if (d.k === "cut" && V.scis) {
      const near = Math.abs(w.x - g.sx1) < 34;
      V.scis.x = near ? g.sx1 : w.x; V.scis.y = w.y; V.scis.open = Math.abs(Math.sin(w.y * 0.15));
      cutAt({ x: V.scis.x, y: w.y });
      if (K.cut >= 1) { drag = null; V.scis = null; }
    } else if (d.k === "box") { V.box.x = w.x + d.ox; V.box.y = w.y + d.oy; V.box.s = lerp(V.box.s, w.x > g.sx0 && w.x < g.sx1 && w.y > g.sy0 && w.y < g.sy1 ? 1 : 0.8, 0.25); }
    else if (d.k === "side") {
      const span = d.i === 0 ? FF + OV : NF + BF + OV;
      K.side[d.i] = clamp(Math.max(d.v0, (d.i === 0 ? w.y - d.y0 : d.y0 - w.y) / span * 1.4), 0, 1);
      if (K.side[d.i] >= 1) { drag = null; wobble("box", 0.4); cheerStep(); changed(); }
    } else if (d.k === "tri" || d.k === "flap") {
      const inward = d.e ? d.x0 - w.x : w.x - d.x0, key = d.k;
      K[key][d.e] = clamp(Math.max(K[key][d.e], inward / (E * 0.8)), 0, 1);
      if (K[key][d.e] >= 1) { drag = null; if (key === "flap") wobble("box", 0.4); cheerStep(); changed(); }
    } else if (d.k === "tape" && V.tapeCarry) { V.tapeCarry.x = w.x; V.tapeCarry.y = w.y; }
    else if (d.k === "ribbon") { ribbonMove(d.last, w); V.ribTrail = { x: w.x, y: w.y }; if (allOne(K.rib)) { drag = null; V.ribTrail = null; } }
    else if (d.k === "loop") { const n = knotPt(); K.loop[d.i] = clamp(Math.max(K.loop[d.i], Math.abs(w.x - n.x) / 46), 0, 1); if (K.loop[d.i] >= 1) { drag = null; wobble("bow", 1); cheerStep(); changed(); } }
    else if (d.k === "curl" && V.scis) { V.scis.x = w.x; V.scis.y = w.y; const a = knotPt(), b = tailEnd(d.i); V.scis.ang = Math.atan2(b.y - a.y, b.x - a.x); curlAt(d.i, w); if (K.curl[d.i] >= 1) { drag = null; V.scis = null; curlDone(d.i); } }
    else if (d.k === "give") { V.giveDrag = { x: w.x + d.ox, y: w.y + d.oy }; }
    else if (d.k === "tear") tearMineLine(d.last, w);
    else if (d.k === "tiss" && V.tissPull) { V.tissPull = { x: d.p.x + (w.x - d.p.x) * 0.3, y: Math.min(d.p.y, d.p.y + (w.y - d.y0)) }; if (d.y0 - w.y > 40) { const p = V.tissPull; drag = null; V.tissPull = null; tissOut(d.i, p); } }
    else if (d.k === "crk") { crackerPull(d.e0 + (w.x - d.x0) / 70); if (V.mine && V.mine.open) drag = null; }
    if (drag) drag.last = w;
  }
  function endDrag(d, still) {
    const g = matG();
    if (locked()) { cancelDrag(d); return; }
    if (d.k === "hold") { if (still) doTap(d.part, d.cx, d.cy); return; }
    if (d.k === "carry") {
      const c = V.carry; busy = false;
      if (!c) return;
      let target = null;
      if (c.kind === "gift") target = K.job === "bag" ? { x: bagPt().x, y: bagPt().y - 70, r: 80 } : { x: g.cx, y: g.cy, r: 80 };
      else if (c.kind === "stuff") target = { x: V.stock.x + 10, y: V.stock.y + 70, r: 90 };
      else if (c.kind === "tissue") target = { x: bagPt().x, y: bagPt().y - 70, r: 90 };
      else { const p = presentPt(); target = { x: p.x, y: p.y, r: 90 }; }
      const ok = still || dist(c, target) < target.r;
      V.carry = null;
      if (ok) {
        const from = { x: c.x, y: c.y, s: c.s };
        if (c.kind === "gift") giftIn(c.id, from);
        else if (c.kind === "stuff") stuffIn(c.id, from);
        else if (c.kind === "tissue") tissueIn(c.id, from);
        else extraOn(c.id, from);
      } else back(c, d.home);
    } else if (d.k === "bag") {
      const b = V.bag; busy = false;
      if (still || dist(b, bagPt()) < 120) { V.bag = null; pickBag(b.i, { x: b.x, y: b.y }); }
      else { const sl = bagSlot(b.i), f = { x: b.x, y: b.y }; busy = true; tween(0.3, (p) => { b.x = lerp(f.x, sl.x, ease(p)); b.y = lerp(f.y, sl.y + 30, ease(p)); }, () => { V.bag = null; busy = false; hint(); }); }
    } else if (d.k === "pull") {
      if (stepOf() !== "roll") return;
      if (still || K.pull >= 0.25) pullAuto();
      else if (V.roll) {
        // Not far enough: the paper rolls back up and the roll goes back to the tray.
        const r = V.roll, f = { ...r }, sl = rollSlot(r.i), p0 = K.pull;
        busy = true;
        tween(0.4, (p) => { const e = ease(p); K.pull = lerp(p0, 0, e); V.edge = g.sx1 - K.pull * (g.sx1 - g.sx0); r.x = lerp(f.x, sl.x, e); r.y = lerp(f.y, sl.y, e); r.len = lerp(f.len, sl.len, e); r.dia = lerp(f.dia, sl.dia, e); r.ang = lerp(f.ang, sl.ang, e); }, () => { V.roll = null; K.paper = null; K.pull = 0; busy = false; hint(); });
      }
    } else if (d.k === "cut") { V.scis = null; if (still) cutAuto(); else if (K.cut < 1 && K.cut > 0.5) cutAuto(); }
    else if (d.k === "box") { busy = false; const inSheet = V.box.x > g.sx0 && V.box.x < g.sx1 && V.box.y > g.sy0 - 20 && V.box.y < g.sy1; if (still || inSheet) placeBox({ x: V.box.x, y: V.box.y, s: V.box.s }); else { const f = { x: V.box.x, y: V.box.y, s: V.box.s }; busy = true; tween(0.3, (p) => { V.box.x = lerp(f.x, L.wait.x, ease(p)); V.box.y = lerp(f.y, L.wait.y, ease(p)); V.box.s = lerp(f.s, L.wait.s, ease(p)); }, () => { busy = false; hint(); }); } }
    else if (d.k === "side") { if (still) sideAuto(d.i); else if (K.side[d.i] < 1) settle(K, "side", d.i, 0.35, () => { wobble("box", 0.4); cheerStep(); }); }
    else if (d.k === "tri" || d.k === "flap") { if (still) endAuto(d.e); else if (K[d.k][d.e] < 1) settle(K, d.k, d.e, 0.35, () => cheerStep()); }
    else if (d.k === "tape") {
      const c = V.tapeCarry; V.tapeCarry = null;
      const key = tapeKey();
      if (!c || !key) return;
      const s = tapeSpot(key);
      if (still || dist(c, s) < 70 || inRect(c, [g.x0, g.y0, g.x1, g.yf], 16)) tapeOn(still ? null : c);
      else hint();
    } else if (d.k === "ribbon") { V.ribTrail = null; if (still) ribbonAuto(); else if (!allOne(K.rib) && K.rib[0] + K.rib[1] > 0.6) ribbonAuto(); }
    else if (d.k === "loop") { if (still) loopAuto(d.i); else if (K.loop[d.i] < 1) settle(K, "loop", d.i, 0.4, () => { wobble("bow", 1); cheerStep(); }); }
    else if (d.k === "curl") { V.scis = null; if (still || K.curl[d.i] > 0.4) curlAuto(d.i); }
    else if (d.k === "give") {
      busy = false;
      const p = V.giveDrag || d.p; V.giveDrag = null;
      if (still || dist(p, L.give) < dist(p, d.p) * 1.1 || dist(p, L.give) < 140) giveIt({ x: p.x, y: p.y });
      else hint();
    } else if (d.k === "tear") { if (still) ripMine(d.last.x); }
    else if (d.k === "tiss") { V.tissPull = null; if (V.mine) V.mine.pullK = -1; if (still) tissOut(d.i); }
    else if (d.k === "crk") { if (still) crackerAuto(); else if (V.mine && !V.mine.open) { const m = V.mine, e0 = m.ext; tween(0.25, (p) => { if (!m.open) m.ext = lerp(e0, 0, ease(p)); }); } }
  }
  // Let go somewhere else: the thing goes back where it came from.
  function back(c, home) {
    const f = { x: c.x, y: c.y };
    V.carry = c; busy = true;
    tween(0.3, (p) => { c.x = lerp(f.x, home.x, ease(p)); c.y = lerp(f.y, home.y, ease(p)); }, () => { V.carry = null; busy = false; hint(); });
  }
  function cancelDrag(d) {
    if (d.k === "carry" && V.carry) back(V.carry, d.home);
    else if (d.k === "bag") { V.bag = null; busy = false; }
    else if (d.k === "box") { busy = false; V.box = { x: L.wait.x, y: L.wait.y, s: L.wait.s, a: 1 }; }
    else if (d.k === "give") { busy = false; V.giveDrag = null; }
    V.tapeCarry = null; V.ribTrail = null; V.scis = null; V.tissPull = null;
  }

  // =====================================================================================================
  // Panel, jobs and surprise
  // =====================================================================================================
  const JOB_PIC = {
    box: '<svg viewBox="0 0 40 40"><rect x="7" y="15" width="26" height="19" rx="2" fill="#E8303F" stroke="#1D2340" stroke-width="2"/><rect x="5" y="10" width="30" height="7" rx="2" fill="#E8303F" stroke="#1D2340" stroke-width="2"/><rect x="17" y="10" width="6" height="24" fill="#FFC93C" stroke="#1D2340" stroke-width="1.6"/><ellipse cx="14" cy="7" rx="6" ry="3.6" transform="rotate(20 14 7)" fill="#FFC93C" stroke="#1D2340" stroke-width="1.8"/><ellipse cx="26" cy="7" rx="6" ry="3.6" transform="rotate(-20 26 7)" fill="#FFC93C" stroke="#1D2340" stroke-width="1.8"/></svg>',
    bag: '<svg viewBox="0 0 40 40"><path d="M13 14q0-9 7-9t7 9" fill="none" stroke="#1D2340" stroke-width="2.4"/><path d="M14 14l-4-4 4 2 3-6 3 6 3-6 3 6 4-2-4 4z" fill="#FFB8D2" stroke="#1D2340" stroke-width="1.6"/><path d="M9 14h22l2 21H7z" fill="#36B25E" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/><path d="M20 20l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" fill="#FFD23B"/></svg>',
    stocking: '<svg viewBox="0 0 40 40"><path d="M13 9h14v15l6 4q3 4-1 7H18q-6 0-6-6z" fill="#E8303F" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/><rect x="10" y="5" width="20" height="8" rx="3" fill="#FFFFFF" stroke="#1D2340" stroke-width="2"/><path d="M14 18h12M14 23h12" stroke="#FFFFFF" stroke-width="2.4"/></svg>'
  };
  const jobs = Toybox.jobs($("jobs"), { jobs: JOBS.map((j) => ({ id: j.id, name: j.name, pic: JOB_PIC[j.id] })), value: job, onPick: (id) => pickJob(id) });
  function pickJob(id) {
    if (id === job && !nextJob) return;
    if (phase === "make" && !V.rec.walk) { if (drag) { cancelDrag(drag); drag = null; } job = id; nextJob = null; startBuild(false); }
    else { nextJob = id; coach.say("The next present is a " + JOBS.find((j) => j.id === id).name.toLowerCase() + ".", 3); }
    saveSoon();
  }
  // New: the present starts over for the one at the table (a visit in progress finishes at once).
  function newTap() {
    if (locked()) return;
    if (phase === "joy" || phase === "out" || phase === "mine" || phase === "open") { if (V.treat) { treats.push(V.treat.id); if (treats.length > TREATS_MAX) treats = treats.slice(-TREATS_MAX); round++; } who = (who + 1) % RECIPS.length; given = null; }
    startBuild(false);
    puff("spark", L.mat.x, L.mat.y, 6);
  }
  Toybox.bar($("bottom"), { shelf: null, onNew: newTap, onSurprise: surprise });
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
    const rv = V.rec;
    if (rv.vy || rv.hop > 0) { rv.hop += rv.vy * dt; rv.vy -= 1300 * dt; if (rv.hop <= 0) { rv.hop = 0; rv.vy = 0; } }
    if (phase === "make" || phase === "joy") rv.reach = Math.max(0, rv.reach - dt * 2);
    rv.wob = Math.max(0, rv.wob - dt * 2);
    Object.keys(V.wob).forEach((k) => { V.wob[k] = Math.max(0, V.wob[k] - dt * 2); });
    V.treatWob = V.treatWob.map((v) => Math.max(0, (v || 0) - dt * 1.5));
    V.winWob = Math.max(0, V.winWob - dt * 1.5);
    V.flare = Math.max(0, V.flare - dt * 0.8);
    V.stock.swing = Math.max(0, V.stock.swing - dt * 1.2);
    if (V.drop.length && now() - V.drop[0].t0 > 0.5) V.drop.shift();
    // The tray slides out, changes, and slides back in.
    const tr = V.tray;
    tr.target = trayFor() || "";
    if (tr.kind !== tr.target) {
      if (!tr.kind) { tr.kind = tr.target; tr.off = 1; }
      else { tr.off = Math.min(1, tr.off + dt * 2.6); if (tr.off >= 1) { tr.kind = tr.target; tr.off = tr.kind ? 1 : 0; } }
    } else if (tr.off > 0) tr.off = Math.max(0, tr.off - dt * 2.6);
    updateCoach();
    draw(t, dt);
    requestAnimationFrame(frame);
  }
  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawWall();
    drawWindow(t, dt);
    drawWreath();
    drawGarland(t);
    drawRecipient(t, "behind");
    drawTable();
    if (K.job === "stocking" && phase === "make") drawFireplace(t);
    drawActor(t);
    drawRecipient(t, "table");
    drawTray(t);
    if (V.giveDrag && drag && drag.k === "give") {
      const p = V.giveDrag;
      if (K.job === "box") drawGivenBox(p.x, p.y - BF / 2, 1, 1);
      else if (K.job === "bag") drawBag(BAG_BY[K.bag], p.x, p.y + 60, 1, { tissue: K.tissue, t });
      else drawStocking(p.x, p.y - 90, V.stock.bulge, K.items, t, 0.3);
    } else { drawWork(t); drawStockingWork(t); }
    drawPlay(t);
    drawMine(t);
    if (V.treat) { const tr = V.treat; ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(tr.rot); drawThing(tr.id, 0, 0, tr.s, { t }); ctx.restore(); }
    drawMoving(t);
    drawParts();
    drawSay();
    drawRing(t);
  }
  function onEnding(done) { ending = true; if (drag) cancelDrag(drag); drag = null; press.cancel(); setTimeout(done, 1500); }
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
    // Does the next wanted thing the way a tap would. Returns what it did, "wait" while something moves, or
    // "done" once his surprise is out (the round is complete).
    const next = () => {
      if (busy || V.rec.walk) return "wait";
      if (phase === "mine" && V.mine) { const m = V.mine; if (m.type === "box") ripMine(m.x - MW / 2 + (MC - mineLeft() / MR) * 0 + 8 + (m.torn.indexOf(0) % MC) * (MW / MC)); else if (m.type === "bag") tissOut(); else crackerAuto(); return "mine"; }
      if (phase !== "make") return phase === "joy" || phase === "out" ? "done" : "wait";
      const st = stepOf();
      switch (st) {
        case "gift": giftIn(GIFTS[(who + round) % GIFTS.length].id); break;
        case "roll": pullAuto(round % PAPERS.length); break;
        case "cut": cutAuto(); break;
        case "place": placeBox(); break;
        case "sides": sideAuto(K.side[0] < 1 ? 0 : 1); break;
        case "tapeS": case "tapeL": case "tapeR": tapeOn(); break;
        case "triL": case "flapL": endAuto(0); break;
        case "triR": case "flapR": endAuto(1); break;
        case "ribbon": ribbonAuto(round % 4); break;
        case "bow": loopAuto(); break;
        case "curl": curlAuto(); break;
        case "bag": pickBag(round % BAGS.length); break;
        case "tissue": tissueIn([0, 1, 2, 3].find((q) => !K.tissue.includes(q))); break;
        case "tag": extraOn("tag"); break;
        case "fill": stuffIn(STUFF.find((q) => !K.items.includes(q.id)).id); break;
        case "give": giveIt(); break;
      }
      return st;
    };
    window.__toybox = {
      state: () => {
        const w = want();
        return { job, phase, step: phase === "make" ? stepOf() : phase, who: R().id, round, busy, walking: V.rec.walk, tray: V.tray.kind, wanted: w && w.part, coach: coach.text(),
          gift: K.gift || null, paper: K.paper || null, bag: K.bag || null, items: K.items ? K.items.length : 0, tissue: K.tissue ? K.tissue.length : 0,
          mine: V.mine ? V.mine.type : null, mineOpen: !!(V.mine && V.mine.open), treats: treats.length };
      },
      next,
      tap: (part) => doTap(part, 0, 0),
      job: (id) => { pickJob(id); jobs.set(id); },
      meet: (i) => { who = ((i % RECIPS.length) + RECIPS.length) % RECIPS.length; startBuild(false); },
      round: (n) => { round = n; },
      newTap, surprise,
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      wpt: (x, y) => vp(x, y),
      geo: () => { const g = matG(), s = (x, y) => vp(x, y); return { g, vp: { box: s(g.cx, g.cy), x0: s(g.x0, g.y0), x1: s(g.x1, g.yf), sx0: s(g.sx0, g.sy0), sx1: s(g.sx1, g.sy1), seam: s(g.cx, g.seam), knot: s(g.cx, g.cy), tailL: s(tailEnd(0).x, tailEnd(0).y), tailR: s(tailEnd(1).x, tailEnd(1).y), mouth: s(mouthPt().x, mouthPt().y), scis: s(toolSlot(0).x, toolSlot(0).y), roll: V.roll ? s(V.roll.x, V.roll.y) : null, box0: s(V.box.x, V.box.y), give: s(L.give.x, L.give.y), stock: s(stockTop().x, stockTop().y), bag: s(bagPt().x, bagPt().y - 70), mine: V.mine ? s(V.mine.x, V.mine.y) : null, rollSlot: (i) => s(rollSlot(i).x, rollSlot(i).y) } }; },
      slot: (kind, i) => { const f = { shelf: shelfSlot, roll: rollSlot, bag: bagSlot, tissue: tisSlot, stuff: stuffSlot, spool: spoolSlot, extra: extraSlot }[kind]; const s = f(i); return vp(s.x, kind === "bag" ? s.y + 20 : s.y); },
      hit: (x, y) => hitPart(x, y),
      ghost: () => ghost.show()
    };
  }
})();
