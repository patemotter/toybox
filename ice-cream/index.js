(function () {
  "use strict";
  // Ice Cream Shop: an ice cream counter seen from behind it, where the server stands. Customers (mostly people,
  // sometimes an animal) come to the counter one at a time and show their order in a speech bubble: a picture and
  // the words. An order is a cone (or a cup), a sundae or a milkshake. Every few customers one has no preference
  // ("Anything you like, please!") and is happy with whatever he makes. He makes it by hand on the scene:
  //   1. Start: drag a cone, a cup, a sundae dish or a steel milkshake cup from its stack to the holder (or tap
  //      the stack). All four stacks are always on the counter, in the same places.
  //   2. Scoop each flavor: touch a tub and the scoop comes to his finger and digs while he holds it there; drag
  //      the scoop to the holder and let go (tap a tub: the scoop digs and puts the ball in by itself).
  //   3. A milkshake: pour milk into the steel cup, put the cup on the mixer (it mixes by itself while a glass
  //      slides onto the holder), then pour the milkshake from the cup into the glass.
  //   4. Toppings: hold the whipped cream, the chocolate sauce or the sprinkle shaker over it and it sprays,
  //      squeezes or shakes while he holds it there; drag a cherry on top (a tap on each plays it once).
  //   5. Give it to the customer (drag it up to them, or tap it or the customer).
  // Each part of the order gets a green tick in the bubble when it matches. Something different is never wrong:
  // the customer gently says what they wanted or is pleased with an extra, and always takes it happily.
  // The ice cream maker on the counter is an option, never a step: a tap on it zooms in. There he takes the frozen
  // bowl out of the freezer, switches the machine on, pours in milk, cream, sugar and a flavor, watches it churn,
  // spoons the ice cream into a tub and carries the tub to the shop, where it fills that flavor's tub. The
  // header's Back button (or carrying the tub) zooms out again.
  // A yellow ring shows the next part. A step's instruction pops up only until he has done that step twice
  // (remembered across visits); after that the ring alone shows it, and the idle ghost hand brings the words back.
  // The panel holds only New and Surprise.
  // Units: the scene is drawn in world units, laid out from the stage's shape (STACK when upright: the cabinet
  // above the counter; ROW when sideways: the cabinet beside it) and scaled to fill the stage; x right, y down.
  //
  // Sections:
  //   Setup and saved state
  //   Flavors, toppings, menus and customers
  //   Sound
  //   Layout
  //   Tweens and particles
  //   Orders and matching
  //   Customers coming and going
  //   Saving and restoring
  //   Actions: holder and scoop
  //   Actions: pouring tools, toppings and milk
  //   Actions: milkshake mixer
  //   Actions: serve
  //   Actions: the ice cream maker
  //   Zooming in and out
  //   Drawing helpers
  //   Drawing the ice cream, sundae and milkshake
  //   Drawing the shop
  //   Drawing the tools
  //   Drawing the ice cream maker
  //   Drawing the customer and the bubble
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
  const rnd = (n) => Math.floor(Math.random() * n);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "ice-cream-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const fresh = Toybox.fresh();

  // How often he has done each step; once he has done one twice, its instruction stays hidden. Kept across visits:
  // it is what he knows, not a count he sees.
  const KNOWN_AFTER = 2;
  const known = {};
  if (saved.known && typeof saved.known === "object") {
    Object.keys(saved.known).forEach((k) => { if (Number.isInteger(saved.known[k])) known[k] = clamp(saved.known[k], 0, 9); });
  }
  const isKnown = (k) => (known[k] || 0) >= KNOWN_AFTER;
  function did(k) { known[k] = Math.min(9, (known[k] || 0) + 1); saveSoon(); }

  // =====================================================================================================
  // Flavors, toppings, menus and customers
  // =====================================================================================================
  const FLAVORS = [
    { id: "vanilla", name: "Vanilla", hex: "#FFF2C4", dark: "#E9D59B" },
    { id: "chocolate", name: "Chocolate", hex: "#93603F", dark: "#6E432A" },
    { id: "strawberry", name: "Strawberry", hex: "#FFA9C6", dark: "#EC84A8" },
    { id: "mint", name: "Mint chip", hex: "#B2EDD3", dark: "#86D2B3" },
    { id: "mango", name: "Mango", hex: "#FFC453", dark: "#EFA42E" },
    { id: "bubblegum", name: "Bubblegum", hex: "#9AD6FF", dark: "#6CB8EE" }
  ];
  const okF = (f) => Number.isInteger(f) && f >= 0 && f < FLAVORS.length;
  const TOPS = [
    { id: "cream", name: "Whipped cream", say: "whipped cream", verb: "Spray whipped cream on" },
    { id: "sauce", name: "Chocolate sauce", say: "chocolate sauce", verb: "Squeeze chocolate sauce on" },
    { id: "sprinkles", name: "Sprinkles", say: "sprinkles", verb: "Shake sprinkles on" },
    { id: "cherry", name: "Cherry", say: "a cherry", verb: "Put a cherry on top of" }
  ];
  const TOP_BY = {};
  TOPS.forEach((t) => { TOP_BY[t.id] = t; });
  const TOP_IDS = TOPS.map((t) => t.id);
  const MAXS = 3;
  // What each thing is started in. All four stacks are always on the counter.
  const STACKS = [
    { id: "cones", kind: "cone", name: "Cones" }, { id: "cups", kind: "cup", name: "Cups" },
    { id: "dishes", kind: "dish", name: "Sundae dishes" }, { id: "steels", kind: "steel", name: "Milkshake cups" }
  ];
  const STACK_IDS = STACKS.map((s) => s.id);
  const STACK_OF = {}, KIND_OF = {};
  STACKS.forEach((s) => { STACK_OF[s.kind] = s.id; KIND_OF[s.id] = s.kind; });
  const HOLDERS = STACKS.map((s) => s.kind);
  const MENUS = ["cone", "sundae", "shake"];
  const MENU_OF = { cone: "cone", cup: "cone", dish: "sundae", steel: "shake" };
  // How a customer names each start ("A cup? I wanted a cone!"), and the word for what is being made.
  const ASK = { cone: "a cone", cup: "a cup", dish: "a sundae", steel: "a milkshake" };
  const WORD = { cone: "ice cream", sundae: "sundae", shake: "milkshake" };
  const HOLD_LINE = { cone: "Put a cone in the holder.", cup: "Put a cup in the holder.", dish: "Put a sundae dish in the holder.",
    steel: "Put a steel cup in the holder." };
  const SPRINKLE_COLORS = ["#FF4F6D", "#FFD23B", "#3FA9FF", "#5CC93A", "#B57BFF", "#FFFFFF", "#FF8A1F"];

  const SKIN = ["#F7D7B8", "#EDBD93", "#CF9567", "#A36A43", "#74492B"];
  const HAIRC = ["#2B1D14", "#5A3A22", "#A8642F", "#E9C46F", "#9A9A9A", "#C2452D"];
  const SHIRT = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#B983FF", "#FF9F45", "#38C3C3"];
  const STYLES = ["short", "long", "bun", "curly", "bald", "ponytail", "pigtails", "spiky"];
  const ANIMALS = ["bear", "rabbit", "cat", "panda"];
  const okLook = (l) => l && typeof l === "object" && (l.kind === "person" || ANIMALS.includes(l.kind)) &&
    SKIN.includes(l.skin) && HAIRC.includes(l.hc) && SHIRT.includes(l.shirt) && STYLES.includes(l.style);
  function okOrder(o) {
    if (!o || typeof o !== "object") return false;
    if (o.menu === "any") return true;
    return MENUS.includes(o.menu) && HOLDERS.includes(o.holder) && MENU_OF[o.holder] === o.menu && Array.isArray(o.scoops) &&
      o.scoops.length >= 1 && o.scoops.length <= MAXS && o.scoops.every(okF) && Array.isArray(o.tops) && o.tops.every((t) => TOP_IDS.includes(t));
  }

  // =====================================================================================================
  // Sound (soft and synthesized; only when the grown-ups turned sound on)
  // =====================================================================================================
  let noiseBuf = null;
  function tone(f0, f1, dur, type, gain, delay) {
    const a = Toybox.sound.ready(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, freq, gain, delay, q) {
    const a = Toybox.sound.ready(); if (!a) return;
    if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q || 0.9;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  const snd = {
    bell() { tone(1320, 1320, 0.5, "sine", 0.04); tone(990, 990, 0.7, "sine", 0.035, 0.18); },
    dig() { noise(0.5, 700, 0.04, 0, 1.4); },
    plop() { tone(320, 160, 0.18, "sine", 0.06); },
    clack() { tone(500, 380, 0.08, "triangle", 0.04); },
    shake() { for (let k = 0; k < 4; k++) noise(0.12, 4200, 0.03, k * 0.2, 2); },
    squeeze() { noise(0.6, 300, 0.04, 0, 2); },
    hiss() { noise(0.35, 3000, 0.03, 0, 1.2); },
    pour() { noise(0.5, 520, 0.03, 0, 1.6); },
    whirr() { noise(0.55, 900, 0.025, 0, 3); },
    hum() { noise(0.6, 170, 0.03, 0, 2); },
    click() { tone(900, 650, 0.05, "square", 0.015); },
    boing() { tone(260, 520, 0.18, "sine", 0.05); tone(520, 300, 0.25, "sine", 0.03, 0.12); },
    talk() { tone(420, 520, 0.09, "sine", 0.025); tone(520, 440, 0.1, "sine", 0.025, 0.12); },
    whoosh() { noise(0.45, 1200, 0.025, 0, 0.7); },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); tone(1320, 1320, 0.4, "sine", 0.03, 0.24); }
  };

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // The world is as wide as the stage's shape asks for, so the scene fills the stage on every screen and the
  // spare room goes between things instead of around them. STACK (upright): the wall with the customer, the
  // dipping cabinet across the stage, then the counter: a row with the dipper well and the four stacks, the milk
  // and the ice cream maker on the left, the holder and the mixer in the middle, the toppings down the right.
  // ROW (sideways): the stacks down the left, the cabinet, the middle (well, milk and maker above the holder and
  // the mixer), the toppings down the right. Tool positions are their middles; the holder and the mixer are the
  // bottom of what stands on them.
  let L = null, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  const spread = (a, b, n) => { const r = []; for (let i = 0; i < n; i++) r.push(n === 1 ? (a + b) / 2 : lerp(a, b, i / (n - 1))); return r; };
  const slots = (a, b, n) => { const r = []; for (let i = 0; i < n; i++) r.push(a + (b - a) * (i + 0.5) / n); return r; };
  function cabinet(o, x, y, w, cols, maxH) {
    const rows = FLAVORS.length / cols, pad = 14, gap = 12;
    const tubW = (w - pad * 2 - gap * (cols - 1)) / cols;
    let tubH = clamp(tubW * 0.46, 48, 62), rowH = tubH + 34;
    if (maxH && pad + rows * rowH > maxH) { rowH = (maxH - pad) / rows; tubH = Math.max(40, rowH - 34); }
    o.cab = { x, y, w, h: pad + rows * rowH };
    o.tubW = tubW; o.tubH = tubH;
    o.tubs = FLAVORS.map((f, i) => { const c = i % cols, r = Math.floor(i / cols); return [x + pad + tubW / 2 + c * (tubW + gap), y + 12 + tubH / 2 + r * rowH]; });
  }
  function makeLayout(sw, sh) {
    const a = sw / sh, m = 12, row = a >= 1.3;
    let Hw, Ww;
    if (row) { Hw = a > 2.2 ? 470 : 520; Ww = Math.min(Hw * a, 1320); }
    else { Hw = 760; Ww = Hw * a; if (Ww < 420) { Ww = 420; Hw = Math.min(940, 420 / a); } }
    const o = { row, w: Ww, h: Hw, stacks: {}, tools: {} };
    let y1, cx0, cx1;
    if (!row) {
      o.counterY = Math.round(Math.min(232, Hw * 0.29));
      o.custX = Math.round(Ww * 0.74);
      o.win = { x: o.custX - 70, y: 34, w: 140, h: Math.min(150, o.counterY - 70) };
      o.door = { x: Ww - 34, w: 60 };
      o.bubble = { x: m, y: 8, w: Math.min(o.custX - 66 - 2 * m, 420), side: false };
      const cw = Math.min(Ww - 2 * m, 680);
      cabinet(o, (Ww - cw) / 2, o.counterY + 12, cw, 3, 0);
      const y0 = o.cab.y + o.cab.h + 8;
      y1 = Hw - 8;
      const x0 = o.cab.x, rx = o.cab.x + o.cab.w - 32;
      slots(y0, y1, 4).forEach((y, i) => { o.tools[TOP_IDS[i]] = { x: rx, y }; });
      const r1y = y0 + 44, xs = spread(x0 + 32, rx - 74, 5);
      o.well = { x: xs[0], y: r1y };
      STACKS.forEach((s, i) => { o.stacks[s.id] = { x: xs[i + 1], y: r1y }; });
      const r2 = y0 + 96;
      o.milk = { x: x0 + 32, y: r2 + (y1 - r2) * 0.24 };
      o.churn = { x: x0 + 38, y: r2 + (y1 - r2) * 0.72 };
      cx0 = x0 + 66; cx1 = rx - 36;
    } else {
      o.counterY = Math.round(Hw * 0.35);
      const y0 = o.counterY + 14;
      y1 = Hw - 8;
      slots(y0, y1, 4).forEach((y, i) => { o.stacks[STACKS[i].id] = { x: 50, y }; });
      const cols = Ww >= 960 ? 3 : 2;
      const tubW = cols === 2 ? 122 : clamp((Ww - 100 - 460) / 3 - 12, 110, 160);
      cabinet(o, 100, y0 + 2, tubW * cols + 12 * (cols - 1) + 28, cols, y1 - y0 - 4);
      const rx = Ww - 40;
      slots(y0, y1, 4).forEach((y, i) => { o.tools[TOP_IDS[i]] = { x: rx, y }; });
      cx0 = o.cab.x + o.cab.w + 8; cx1 = rx - 40;
      const xs = spread(cx0 + 44, cx1 - 44, 3);
      o.well = { x: xs[0], y: y0 + 40 }; o.milk = { x: xs[1], y: y0 + 44 }; o.churn = { x: xs[2], y: y0 + 46 };
      o.custX = Math.round(o.cab.x + o.cab.w * 0.45);
      o.win = { x: o.custX - 110, y: 24, w: 220, h: Math.min(132, o.counterY - 50) };
      o.door = { x: Ww - 70, w: 80 };
      const bx = o.custX + 82;
      o.bubble = { x: bx, y: 8, w: Math.min(460, Ww - 96 - bx), side: true };
    }
    // The holder and the mixer sit at the two ends of the free middle, as far apart as it allows.
    o.holder = { x: cx0 + 58, y: y1 - 10 };
    o.mixer = { x: Math.max(cx0 + 180, cx1 - 54), y: y1 - 4 };
    o.z = makeZoom(o, m);
    return o;
  }
  // The ice cream maker, close up: the freezer, the machine (drawn at scale k, base bottom at mx, my), the tub,
  // the milk, cream and sugar, and six flavors.
  function makeZoom(o, m) {
    const Ww = o.w, Hw = o.h, z = {};
    if (!o.row) {
      const fw = clamp(Ww * 0.3, 120, 210);
      z.fz = { x: m + 4, y: 40, w: fw, h: Math.round(Hw * 0.5) };
      z.my = z.fz.y + z.fz.h;
      z.mx = (z.fz.x + fw + Ww) / 2;
      z.k = Math.min((Ww - z.fz.x - fw - 24) / 175, (z.my - 50) / 210, 1.8);
      const rem = Hw - z.my, iy = z.my + rem * 0.2;
      z.tub = { x: z.fz.x + fw / 2, y: iy };
      const xs = spread(z.fz.x + fw + 46, Ww - 44, 3);
      z.ing = { jug: { x: xs[0], y: iy }, carton: { x: xs[1], y: iy }, sugar: { x: xs[2], y: iy } };
      const fx = spread(m + 54, Ww - m - 54, 3);
      z.fl = FLAVORS.map((f, i) => ({ x: fx[i % 3], y: z.my + rem * (i < 3 ? 0.5 : 0.8) }));
    } else {
      // The freezer and the tub on the left, the machine in the middle with the six flavors in two rows under
      // it, the milk, cream and sugar down the right.
      z.fz = { x: 24, y: 30, w: 140, h: Math.round(Hw * 0.58) };
      const rx = Ww - 64;
      const ys = slots(24, Hw * 0.8, 3);
      z.ing = { jug: { x: rx, y: ys[0] }, carton: { x: rx, y: ys[1] }, sugar: { x: rx, y: ys[2] } };
      z.my = Math.round(Hw * 0.6);
      z.mx = (z.fz.x + z.fz.w + rx - 50) / 2;
      z.k = Math.min((rx - 60 - z.fz.x - z.fz.w - 30) / 175, (z.my - 22) / 210, 1.8);
      z.tub = { x: z.fz.x + z.fz.w / 2, y: z.fz.y + z.fz.h + (Hw - z.fz.y - z.fz.h) * 0.5 };
      const fx = spread(z.fz.x + z.fz.w + 60, rx - 70, 3), rem = Hw - z.my;
      z.fl = FLAVORS.map((f, i) => ({ x: fx[i % 3], y: z.my + rem * (i < 3 ? 0.3 : 0.72) }));
    }
    z.ts = clamp(z.k * 0.8, 1, 1.4);
    return z;
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const was = L;
    L = makeLayout(W, H);
    vs = Math.min(W / L.w, H / L.h);
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) / 2;
    if (!was || was.w !== L.w || was.h !== L.h) placeAll();
  }
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  // The part of the world the stage shows (wider or taller than the layout when the stage's shape differs).
  const vis = () => ({ x0: -vox / vs, x1: (W - vox) / vs, y0: -voy / vs, y1: (H - voy) / vs });
  // Text never smaller than about 14 px on screen.
  const fpx = (base) => Math.max(base, 14.5 / vs);

  // The geometry of what is built, from the bottom of the holder (0, 0) upward.
  const R = 28;
  // Where scoop k of n sits: stacked on a cone or cup, side by side (and one on top) in a sundae dish, peeking
  // over the rim of the steel cup.
  function ballPos(h, k, n) {
    if (h === "dish") { if (n === 1) return { x: 0, y: -84 }; if (k < 2) return { x: k ? 22 : -22, y: -82 }; return { x: 0, y: -114 }; }
    if (h === "steel") return { x: [-9, 10, 0][k], y: -88 - k * 7 };
    return { x: 0, y: (h === "cup" ? -56 : -78) - k * 36 };
  }
  const RIM = { cone: -64, cup: -48, dish: -74, steel: -84 };
  const GLASS_RIM = -124;
  const creamH = (amt) => { let h = 0; const n = amt > 0 ? Math.max(1, Math.ceil(amt * 4)) : 0; for (let i = 0; i < n; i++) h += [13, 12, 11, 9][i] * 0.75; return h; };
  const onGlass = (b) => b.holder === "steel" && b.at !== "spot";
  // The top of what is built (local y), where toppings land.
  function peakY(b) {
    if (onGlass(b)) return GLASS_RIM + 2;
    if (!b.holder) return -40;
    const n = b.scoops.length;
    if (!n) return RIM[b.holder];
    let y = 0;
    for (let k = 0; k < n; k++) y = Math.min(y, ballPos(b.holder, k, n).y - R);
    return y;
  }
  const surfaceY = (b) => peakY(b) - (b.tops.cream > 0 ? creamH(b.tops.cream) : 0);
  function shakeColor(scoops) {
    if (!scoops.length) return "#FFF8EE";
    let r = 0, g = 0, bl = 0;
    scoops.forEach((f) => { const h = FLAVORS[f].hex; r += parseInt(h.slice(1, 3), 16); g += parseInt(h.slice(3, 5), 16); bl += parseInt(h.slice(5, 7), 16); });
    const n = scoops.length, mix = (v) => Math.round(lerp(v / n, 255, 0.22));
    return "rgb(" + mix(r) + "," + mix(g) + "," + mix(bl) + ")";
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
  function cancel(tw) { const i = tweens.indexOf(tw); if (i >= 0) tweens.splice(i, 1); }
  function runTweens(t) {
    const list = tweens.slice();
    for (const tw of list) {
      if (!tweens.includes(tw)) continue;
      const p = (t - tw.t0) / tw.dur;
      if (p < 0) continue;
      if (tw.step) tw.step(Math.min(1, p));
      if (p >= 1) { cancel(tw); if (tw.done) tw.done(); }
    }
  }
  const later = (sec, fn) => tween(sec, null, fn);
  // Customer motions and the zoom survive placeAll (a resize or New); everything else at the counter is reset by it.
  const keep = (tw) => { tw.keep = true; return tw; };

  let parts = [];
  function puff(kind, x, y, n, color) {
    if (reduce) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 120) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 3, rot: Math.random() * TAU, color: color || "#FFFFFF" };
      if (kind === "spark") { p.vx = Math.cos(a) * (40 + sp * 80); p.vy = Math.sin(a) * (40 + sp * 80); p.life = 0.7; p.size = 5 + sp * 4; p.color = color || "#FFE36B"; }
      else if (kind === "sprinkle") { p.x += (Math.random() - 0.5) * 14; p.vx = (Math.random() - 0.5) * 30; p.vy = 30 + sp * 40; p.life = 0.55; p.size = 4; p.color = SPRINKLE_COLORS[rnd(SPRINKLE_COLORS.length)]; }
      else if (kind === "rain") { p.x = vis().x0 + Math.random() * (vis().x1 - vis().x0); p.y = vis().y0 - 10 - Math.random() * 200; p.vy = 120 + sp * 80; p.vx = (Math.random() - 0.5) * 20; p.life = 4; p.size = 5; p.color = SPRINKLE_COLORS[rnd(SPRINKLE_COLORS.length)]; }
      else if (kind === "heart") { p.x += (Math.random() - 0.5) * 30; p.vx = (Math.random() - 0.5) * 20; p.vy = -40 - sp * 30; p.life = 1.4; p.size = 7 + sp * 4; p.color = "#FF5C8A"; }
      else if (kind === "drop") { p.x += (Math.random() - 0.5) * 8; p.vx = (Math.random() - 0.5) * 20; p.vy = 20 + sp * 30; p.life = 0.5; p.size = 3.5; }
      else if (kind === "splash") { p.vx = Math.cos(a) * 40 * sp; p.vy = -60 - sp * 50; p.life = 0.5; p.size = 3.5; }
      else if (kind === "frost") { p.x += (Math.random() - 0.5) * 60; p.vx = (Math.random() - 0.5) * 30; p.vy = 10 + sp * 20; p.life = 1.6; p.size = 3 + sp * 3; p.color = "#E9F7FF"; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "sprinkle" || p.kind === "drop" || p.kind === "splash") p.vy += 400 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4;
      if (p.kind === "rain" && p.y > vis().y1 + 10) return false;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // Orders and matching
  // =====================================================================================================
  // A build: what stands in the holder. For a milkshake, `at` says where the steel cup is: on the holder
  // ("spot"), on the mixer ("mixer", the glass waits on the holder), or poured into the glass ("glass").
  const emptyBuild = () => ({ holder: null, scoops: [], tops: { cream: 0, sauce: 0, sprinkles: 0, cherry: 0 }, milk: 0, mix: 0, pour: 0, at: "spot" });
  let B = emptyBuild();
  let served = 0, sinceAny = 0;
  const servedBy = { cone: 0, sundae: 0, shake: 0 };
  // Tubs he made with the ice cream maker this visit (heaped up in the cabinet).
  let madeTub = FLAVORS.map(() => 0);
  // What customers ask for: first cones, then a sundae, someone with no preference, a milkshake, and after that
  // any of them, with a no-preference customer every few.
  function pickMenu(n) {
    if (n < 2) return "cone";
    if (n === 2) return "sundae";
    if (n === 3) return "any";
    if (n === 4) return "shake";
    if (sinceAny >= 4 || (sinceAny >= 2 && Math.random() < 0.35)) return "any";
    return MENUS[rnd(MENUS.length)];
  }
  function pickScoops(ns, distinct) {
    const scoops = [];
    for (let k = 0; k < ns; k++) {
      if (k && !distinct && Math.random() < 0.3) { scoops.push(scoops[k - 1]); continue; }
      let f = rnd(FLAVORS.length);
      for (let g = 0; g < 8 && scoops.includes(f); g++) f = rnd(FLAVORS.length);
      scoops.push(f);
    }
    // A tub he made himself is often asked for.
    const made = FLAVORS.map((f, i) => i).filter((i) => madeTub[i] && !scoops.includes(i));
    if (made.length && Math.random() < 0.7) scoops[0] = made[rnd(made.length)];
    return scoops;
  }
  // Orders grow slowly within each menu.
  function makeOrder(n) {
    const menu = pickMenu(n);
    if (menu === "any") { sinceAny = 0; return { menu, holder: null, scoops: [], tops: [] }; }
    sinceAny++;
    const k = servedBy[menu];
    let ns, nt, holder, pool;
    if (menu === "cone") {
      ns = k < 2 ? 1 : k === 2 ? 2 : [1, 2, 2, 3, 3][rnd(5)];
      nt = k === 0 ? 0 : k === 1 ? 1 : k === 2 ? rnd(2) : [0, 1, 1, 2, 2][rnd(5)];
      holder = k === 0 || Math.random() < 0.6 ? "cone" : "cup";
      pool = ["sauce", "sprinkles", "cherry"];
    } else if (menu === "sundae") {
      ns = k === 0 ? 2 : [2, 3, 3][rnd(3)];
      nt = k === 0 ? 2 : [2, 3, 3, 4][rnd(4)];
      holder = "dish"; pool = k === 0 ? ["cream", "cherry"] : TOP_IDS;
    } else {
      ns = k === 0 ? 1 : [1, 2, 2][rnd(3)];
      nt = k === 0 ? 1 : [0, 1, 1, 2][rnd(4)];
      holder = "steel"; pool = k === 0 ? ["cream"] : TOP_IDS;
    }
    const ids = pool.slice().sort(() => Math.random() - 0.5).slice(0, nt);
    return { menu, holder, scoops: pickScoops(ns, menu === "shake"), tops: TOP_IDS.filter((t) => ids.includes(t)) };
  }
  const fname = (f) => FLAVORS[f].name.toLowerCase();
  function list(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  // The order in plain words: "A cone with chocolate and mango, and sprinkles on top, please!"
  function orderText(o) {
    if (o.menu === "any") return "Anything you like, please!";
    const tops = o.tops.length ? list(o.tops.map((t) => TOP_BY[t].say)) + " on top" : "";
    if (o.menu === "shake") {
      const names = [];
      o.scoops.forEach((f) => { if (!names.includes(fname(f))) names.push(fname(f)); });
      return "A " + list(names) + " milkshake" + (tops ? " with " + tops : "") + ", please!";
    }
    const counts = [];
    o.scoops.forEach((f) => { const c = counts.find((q) => q.f === f); if (c) c.n++; else counts.push({ f, n: 1 }); });
    const NUM = ["", "one", "two", "three"];
    let items;
    if (counts.every((c) => c.n === 1)) items = counts.map((c) => fname(c.f));
    else items = counts.map((c, i) => (c.n > 1 ? NUM[c.n] + " scoops of " + fname(c.f) : (i ? "one of " : "one scoop of ") + fname(c.f)));
    let s = "A " + (o.menu === "sundae" ? "sundae" : o.holder) + " with " + list(items);
    if (tops) s += ", and " + tops;
    return s + ", please!";
  }
  // What matches the order so far. Scoops match in any order.
  function matchInfo(o, b) {
    const avail = b.scoops.slice();
    const scoopOk = o.scoops.map((f) => { const i = avail.indexOf(f); if (i >= 0) { avail.splice(i, 1); return true; } return false; });
    return { holder: b.holder === o.holder, scoopOk, missing: o.scoops.filter((f, k) => !scoopOk[k]), extra: avail,
      tops: o.tops.map((t) => b.tops[t] >= 1) };
  }
  const anyOrder = () => !C.order || C.order.menu === "any";

  // =====================================================================================================
  // Customers coming and going
  // =====================================================================================================
  // C.phase: "none" (nobody), "in" (walking to the counter), "order" (waiting), "take" (just got it), "out"
  // (walking off with it).
  const C = { phase: "none", x: 0, look: null, order: null, say: "", sayUntil: 0, talk: 0, happy: 0, hop: 0, hold: null, walk: 0, wave: 0 };
  let lastLook = null;
  function makeLook(n) {
    const animal = n > 0 && Math.random() < 0.25;
    const l = { kind: animal ? ANIMALS[rnd(ANIMALS.length)] : "person", kid: Math.random() < 0.4, skin: SKIN[rnd(SKIN.length)],
      hc: HAIRC[rnd(HAIRC.length)], shirt: SHIRT[rnd(SHIRT.length)], style: STYLES[rnd(STYLES.length)], glasses: Math.random() < 0.2 };
    if (l.style === "bald") l.kid = false;
    if (lastLook && l.kind === lastLook.kind && l.shirt === lastLook.shirt) l.shirt = SHIRT[(SHIRT.indexOf(l.shirt) + 2) % SHIRT.length];
    return l;
  }
  let bubPop = 0;
  function nextCustomer() {
    if (locked()) return;
    C.look = makeLook(served); lastLook = C.look;
    C.order = makeOrder(served);
    C.phase = "in"; C.hold = null; C.happy = 0; C.say = ""; C.sayUntil = 0; C.wave = 0;
    const x0 = vis().x1 + 80;
    C.x = x0;
    snd.bell();
    keep(tween(reduce ? 0.6 : 2.6, (p) => { C.x = lerp(x0, L.custX, ease(p)); C.walk = p < 1 ? 1 : 0; }, () => {
      C.walk = 0; C.phase = "order"; C.talk = now() + 1.4; snd.talk();
      bubPop = 0; tween(0.35, (p) => { bubPop = p; });
      lastWant = null; ghost.poke(); saveSoon();
    }));
  }
  function say(text, sec) {
    C.say = text; C.sayUntil = now() + (sec || 3.5); C.talk = now() + 1.2;
    bubPop = 0.6; tween(0.25, (p) => { bubPop = lerp(0.6, 1, p); });
    snd.talk();
  }

  // =====================================================================================================
  // Saving and restoring
  // =====================================================================================================
  // The ice cream maker's state. bowl: "freezer" | "machine"; lid 0..1 (on); milk, cream and sugar 0..1 (poured);
  // flavor -1 or the flavor added; churn 0..1; tub: "empty" | "full".
  const freshM = () => ({ bowl: "freezer", on: false, lid: 1, milk: 0, cream: 0, sugar: 0, flavor: -1, churn: 0, tub: "empty" });
  let M = freshM();
  const Z = { on: false, t: 0, moving: false };

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      const c = C.phase === "order" ? { look: C.look, order: C.order } : null;
      localStorage.setItem(KEY, JSON.stringify({ c, build: B, served, servedBy, sinceAny, made: madeTub, m: M, zoom: Z.on, known }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }
  function okBuild(b) {
    const nb = emptyBuild();
    if (!b || typeof b !== "object" || !HOLDERS.includes(b.holder)) return nb;
    nb.holder = b.holder;
    if (Array.isArray(b.scoops)) nb.scoops = b.scoops.filter(okF).slice(0, MAXS);
    if (b.tops && typeof b.tops === "object") TOP_IDS.forEach((t) => { nb.tops[t] = b.tops[t] >= 1 ? 1 : 0; });
    if (nb.holder === "steel") {
      nb.milk = b.milk >= 1 ? 1 : 0;
      nb.at = nb.scoops.length && nb.milk && b.mix >= 1 && (b.at === "mixer" || b.at === "glass") ? b.at : "spot";
      nb.mix = nb.at === "spot" ? 0 : 1;
      nb.pour = nb.at === "glass" ? 1 : 0;
      if (nb.at !== "glass") TOP_IDS.forEach((t) => { nb.tops[t] = 0; });
    }
    if (!nb.scoops.length) TOP_IDS.forEach((t) => { nb.tops[t] = 0; });
    return nb;
  }
  function okM(m) {
    const n = freshM();
    if (!m || typeof m !== "object") return n;
    if (m.bowl === "machine") n.bowl = "machine";
    if (n.bowl !== "machine") return n;
    n.on = !!m.on;
    ["milk", "cream", "sugar"].forEach((k) => { n[k] = m[k] >= 1 ? 1 : 0; });
    if (okF(m.flavor)) n.flavor = m.flavor;
    if (n.milk && n.cream && n.sugar && n.flavor >= 0 && typeof m.churn === "number") n.churn = clamp(m.churn, 0, 1);
    if (n.churn >= 1 && m.tub === "full") { n.tub = "full"; n.lid = 0; n.on = false; }
    return n;
  }
  // A reload keeps the customer, what is in the holder and the ice cream maker; a visit from the home screen
  // starts with the first customer walking in and the maker's bowl in the freezer.
  function restore() {
    if (fresh) return false;
    if (Array.isArray(saved.made)) madeTub = FLAVORS.map((f, i) => (saved.made[i] ? 1 : 0));
    M = okM(saved.m);
    if (saved.zoom) { Z.on = true; Z.t = 1; }
    if (!saved.c || !okLook(saved.c.look)) return false;
    const o = saved.c.order;
    if (o && !o.menu && (o.holder === "cone" || o.holder === "cup")) o.menu = "cone";
    if (!okOrder(o)) return false;
    C.look = saved.c.look; C.order = o.menu === "any" ? { menu: "any", holder: null, scoops: [], tops: [] } : o;
    C.phase = "order"; C.x = L.custX; bubPop = 1;
    served = Number.isInteger(saved.served) && saved.served >= 0 ? saved.served : 5;
    sinceAny = Number.isInteger(saved.sinceAny) ? clamp(saved.sinceAny, 0, 9) : 0;
    if (saved.servedBy && typeof saved.servedBy === "object") MENUS.forEach((m) => { if (Number.isInteger(saved.servedBy[m])) servedBy[m] = clamp(saved.servedBy[m], 0, 99); });
    B = okBuild(saved.build);
    return true;
  }

  // =====================================================================================================
  // Actions: holder and scoop
  // =====================================================================================================
  let busy = false, drag = null;
  // What is on screen besides the build: the scoop (S), the tools (T), a start flying to the holder (V.hc), the
  // build lifted off the holder (V.ic), the steel cup moving (V.steel), and little wobbles.
  const S = { x: 0, y: 0, ang: 0, ball: 0, f: -1, tw: null, home: true };
  const T = {};
  const V = { hc: null, ic: { dx: 0, dy: 0, k: 1 }, fly: null, squish: 0, dent: FLAVORS.map(() => 0), wob: {}, misses: 0, holderGlow: 0,
    steel: null, glassIn: 1, spin: false, spinUntil: 0, streams: {}, tubFly: null };
  // The ice cream maker's moving parts: the bowl turning, the freezer door, the bowl carried, the spooning.
  const MV = { rot: 0, door: 0, bowlFly: null, out: 0, switchGlow: 0, fzGlow: 0, misses: 0, onMisses: 0 };
  const MAKE_TOOLS = ["jug", "carton", "sugar", "fl0", "fl1", "fl2", "fl3", "fl4", "fl5"];
  const SHOP_TOOLS = ["cream", "sauce", "sprinkles", "cherry", "milk"];
  function homeOf(id) {
    if (TOP_IDS.includes(id)) return L.tools[id];
    if (id === "milk") return L.milk;
    if (/^fl\d$/.test(id)) return L.z.fl[+id.slice(2)];
    return L.z.ing[id];
  }
  const toolScale = (id) => (MAKE_TOOLS.includes(id) ? L.z.ts : 1);
  const scoopHomePt = () => ({ x: L.well.x - 8, y: L.well.y - 4 });
  function placeAll() {
    tweens = tweens.filter((tw) => tw.keep);
    busy = false; drag = null;
    const h = scoopHomePt();
    Object.assign(S, { x: h.x, y: h.y, ang: 0, ball: 0, f: -1, tw: null, home: true });
    SHOP_TOOLS.concat(MAKE_TOOLS).forEach((id) => { const p = homeOf(id); T[id] = { x: p.x, y: p.y, ang: 0, tw: null, held: false, out: false, shake: 0 }; });
    V.hc = null; V.ic = { dx: 0, dy: 0, k: 1 }; V.steel = null; V.glassIn = 1; V.spin = false; V.streams = {};
    MV.bowlFly = null; MV.door = 0; MV.out = 0;
    if (M.bowl === "machine" && M.tub === "empty") M.lid = 1;
    if (C.phase === "order" || C.phase === "take") C.x = L.custX;
    if (B.holder === "steel" && B.at === "mixer" && B.mix < 1) startMix();
  }
  const wobble = (id) => { V.wob[id] = 1; };
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  const NAMES = { cones: "Cones", cups: "Cups", dishes: "Sundae dishes", steels: "Steel milkshake cups", scoop: "Ice cream scoop",
    well: "Dipper well", holder: "Holder", cream: "Whipped cream", sauce: "Chocolate sauce", sprinkles: "Sprinkles", cherry: "Cherries",
    milk: "Milk", mixer: "Milkshake mixer", churn: "Ice cream maker", freezer: "Freezer", switch: "Switch", jug: "Milk", carton: "Cream",
    sugar: "Sugar", bowl: "Freezer bowl", mtub: "Tub", machine: "Ice cream maker" };
  const nameOf = (id) => NAMES[id] || (/^fl\d$/.test(id) ? FLAVORS[+id.slice(2)].name : id);

  // Moves the scoop (cancelling its last motion), with an optional hop in the middle.
  function moveS(to, dur, done, hop) {
    if (S.tw) cancel(S.tw);
    const a = { x: S.x, y: S.y };
    S.tw = tween(dur, (p) => { const e = ease(p); S.x = lerp(a.x, to.x, e); S.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * (hop || 0); }, () => { S.tw = null; if (done) done(); });
  }
  function scoopHome() { S.home = false; const h = scoopHomePt(); moveS(h, 0.45, () => { S.home = true; S.ang = 0; }, 20); }
  const tubPt = (i) => ({ x: L.tubs[i][0], y: L.tubs[i][1] });
  function tubAt(x, y) { return L.tubs.findIndex(([tx, ty]) => Math.abs(x - tx) <= L.tubW / 2 + 4 && Math.abs(y - ty) <= L.tubH / 2 + 6); }
  const canScoop = () => B.holder && B.scoops.length < MAXS && (B.holder !== "steel" || B.at === "spot");
  function nextScoopPt() {
    const h = B.holder || "cone", n = B.scoops.length, p = ballPos(h, Math.min(n, MAXS - 1), Math.min(n + 1, MAXS));
    return { x: L.holder.x + p.x, y: L.holder.y + p.y };
  }
  const icTop = () => ({ x: L.holder.x + V.ic.dx, y: L.holder.y + V.ic.dy + surfaceY(B) });
  // A carried scoop is "at the holder" anywhere over what is built or just above it.
  function nearCone(x, y) {
    const top = L.holder.y + peakY(B);
    return Math.abs(x - L.holder.x) < 76 && y > top - 110 && y < L.holder.y + 10;
  }

  // Holder: a start goes into the holder. While nothing is in it yet, another start swaps in.
  function placeHolder(kind, from) {
    if (busy || V.hc) return;
    const sid = STACK_OF[kind], sp = L.stacks[sid];
    if (B.holder && (B.scoops.length || B.milk > 0)) {
      wobble(sid); tag(NAMES[sid], sp.x, sp.y - 40);
      if (B.holder !== kind) coach.say("Press New to start again.", 3);
      return;
    }
    if (B.holder === kind) { V.squish = 1; snd.clack(); return; }
    const a = from || { x: sp.x, y: sp.y + 24 };
    const was = B.holder;
    B.holder = null;
    if (was) puff("spark", L.holder.x, L.holder.y - 40, 5);
    V.hc = { kind, x: a.x, y: a.y };
    const to = { x: L.holder.x, y: L.holder.y };
    tween(0.4, (p) => { const e = ease(p); V.hc.x = lerp(a.x, to.x, e); V.hc.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * 40; }, () => {
      V.hc = null; B = emptyBuild(); B.holder = kind; V.squish = 1; snd.clack();
      ghost.learned("holder"); did("holder"); lastWant = null; saveSoon();
      const o = C.order;
      if (C.phase === "order" && o.menu !== "any" && kind !== o.holder) say(cap(ASK[kind]) + "? I wanted " + ASK[o.holder] + "!");
    });
  }
  const wantedHolder = () => (C.phase === "order" && C.order.menu !== "any" ? C.order.holder : "cone");
  function needHolder() {
    V.misses++;
    if (V.misses >= 2) { V.misses = 0; placeHolder(wantedHolder()); return; }
    V.holderGlow = 1;
    coach.say(anyOrder() ? "Put a cone, a cup, a dish or a steel cup in the holder." : HOLD_LINE[wantedHolder()], 3);
  }

  // Scoop: the full motion of a tap on a tub (the scoop flies there, digs, carries the ball to the holder).
  function scoopTap(tub) {
    if (busy) return;
    if (!B.holder) { needHolder(); return; }
    if (!canScoop()) { if (B.scoops.length >= MAXS) coneFull(); else hint(); return; }
    busy = true; S.home = false;
    const tp = tubPt(tub);
    const dig = () => {
      S.f = tub; snd.dig();
      const x0 = S.x;
      if (S.tw) cancel(S.tw);
      S.tw = tween(0.8, (p) => {
        S.ball = Math.max(S.ball, ease(p)); S.ang = -Math.sin(p * Math.PI) * 0.7;
        S.x = x0 + 26 - p * 40; S.y = tp.y + Math.sin(p * Math.PI) * 6; V.dent[tub] = 1;
      }, () => {
        S.tw = null;
        const np = nextScoopPt();
        moveS({ x: np.x, y: np.y - 8 }, 0.6, dropScoop, 50);
      });
    };
    if (S.f === tub && S.ball > 0.9) { const np = nextScoopPt(); moveS({ x: np.x, y: np.y - 8 }, 0.6, dropScoop, 50); }
    else moveS({ x: tp.x + 26, y: tp.y }, S.home ? 0.45 : 0.25, dig, 30);
  }
  function coneFull() {
    if (C.phase === "order" && !anyOrder()) say("That's plenty of scoops!", 3);
    else coach.say("The " + ({ cone: "cone", cup: "cup", dish: "dish", steel: "cup" }[B.holder]) + " is full.", 3);
    V.squish = 1;
  }
  function dropScoop() {
    const f = S.f;
    S.ball = 0; S.f = -1; busy = false;
    if (f >= 0 && canScoop()) addScoop(f);
    scoopHome();
  }
  function addScoop(f) {
    const before = C.phase === "order" && !anyOrder() ? matchInfo(C.order, B) : null;
    B.scoops.push(f);
    V.squish = 1; snd.plop();
    const p = nextScoopPt();
    puff("spark", p.x, p.y - R, 5, FLAVORS[f].hex);
    ghost.learned("tub"); did("tub"); lastWant = null; saveSoon();
    if (before) {
      if (before.missing.length && !before.missing.includes(f)) say(FLAVORS[f].name + "? I wanted " + fname(before.missing[0]) + "!");
      else if (!before.missing.length) say("Ooh, an extra scoop!", 3);
    }
  }
  // Each frame while he holds the scoop: in a tub it digs (a still finger digs too); full, it is ready to go.
  function stepScoop(dt) {
    if (!drag || drag.k !== "scoop") return;
    const tub = tubAt(S.x, S.y);
    if (tub >= 0 && (S.f < 0 || S.f === tub || S.ball < 0.05) && S.ball < 1) {
      if (S.f !== tub) { S.f = tub; snd.dig(); }
      S.ball = Math.min(1, S.ball + dt * 1.5);
      S.ang = -Math.sin(S.ball * Math.PI) * 0.7;
      V.dent[tub] = 1;
      if (S.ball >= 1) { snd.clack(); S.ang = 0; }
    }
  }
  function scoopRelease(still, wasTap) {
    const tub = tubAt(S.x, S.y);
    if (S.ball > 0.2 && S.f >= 0 && nearCone(S.x, S.y)) {
      if (!B.holder) { needHolder(); putBallBack(); return; }
      if (!canScoop()) { if (B.scoops.length >= MAXS) coneFull(); else hint(); putBallBack(); return; }
      busy = true; S.ball = 1;
      const np = nextScoopPt();
      moveS({ x: np.x, y: np.y - 8 }, 0.2, dropScoop);
      return;
    }
    if ((still || wasTap) && tub >= 0) { scoopTap(tub); return; }
    if (S.ball > 0 && S.f >= 0) putBallBack();
    else scoopHome();
  }
  function putBallBack() {
    const f = S.f;
    if (f < 0) { scoopHome(); return; }
    moveS({ x: tubPt(f).x, y: tubPt(f).y }, 0.35, () => { S.ball = 0; S.f = -1; V.dent[f] = 1; scoopHome(); }, 20);
  }

  // =====================================================================================================
  // Actions: pouring tools, toppings and milk
  // =====================================================================================================
  // Pouring tools tip over and pour while he holds them over their target; a tap brings one over and pours once.
  // ang is the tipped angle, h the distance from the tool's middle to its mouth (before the tool's scale).
  const POUR = {
    cream: { ang: Math.PI, h: 40, to: "top" }, sauce: { ang: Math.PI, h: 42, to: "top" }, sprinkles: { ang: Math.PI, h: 32, to: "top" },
    milk: { ang: 2.0, h: 34, to: "steel" },
    jug: { ang: 2.0, h: 34, to: "spout" }, carton: { ang: 2.1, h: 34, to: "spout" }, sugar: { ang: 2.2, h: 28, to: "spout" }
  };
  const ING_KEY = { jug: "milk", carton: "cream", sugar: "sugar" };
  const topsReady = () => !!B.holder && B.scoops.length > 0 && (B.holder !== "steel" || B.at === "glass");
  function pourTarget(id) {
    const to = POUR[id].to;
    if (to === "top") { const t = icTop(); return { x: t.x, y: t.y - 6 }; }
    if (to === "steel") return { x: L.holder.x, y: L.holder.y + RIM.steel - 4 };
    return spoutPt();
  }
  // Where the tool's middle goes so that, tipped, its mouth is just above the target.
  function pourAt(id) {
    const p = POUR[id], t = pourTarget(id), h = p.h * toolScale(id);
    return { x: t.x - Math.sin(p.ang) * h, y: t.y - 12 + Math.cos(p.ang) * h };
  }
  const mouthOf = (id, tl) => { const h = POUR[id].h * toolScale(id); return { x: tl.x + Math.sin(tl.ang) * h, y: tl.y - Math.cos(tl.ang) * h }; };
  function amtOf(id) {
    if (TOP_IDS.includes(id)) return B.tops[id];
    if (id === "milk") return B.milk;
    return M[ING_KEY[id]];
  }
  function readyFor(id) {
    if (TOP_IDS.includes(id)) return topsReady() && B.tops[id] < 1;
    if (id === "milk") return B.holder === "steel" && B.at === "spot" && B.milk < 1;
    return Z.on && M.bowl === "machine" && M.on && M.churn < 1 && M[ING_KEY[id]] < 1;
  }
  function addAmt(id, a) {
    const before = amtOf(id);
    if (before >= 1) return;
    const v = Math.min(1, before + a);
    if (TOP_IDS.includes(id)) B.tops[id] = v;
    else if (id === "milk") B.milk = v;
    else M[ING_KEY[id]] = v;
    if (v >= 1) pourDone(id);
  }
  function pourDone(id) {
    lastWant = null; saveSoon();
    if (TOP_IDS.includes(id)) {
      snd.chime(); ghost.learned("top"); did("top");
      const top = icTop(); puff("spark", top.x, top.y, 6);
      if (C.phase === "order" && !anyOrder() && !C.order.tops.includes(id)) say("Ooh, " + TOP_BY[id].say + " too!", 3);
    } else if (id === "milk") { snd.plop(); ghost.learned("milk"); did("milk"); }
    else { snd.plop(); ghost.learned("ing"); did("ing"); const s = spoutPt(); puff("spark", s.x, s.y, 4); }
  }
  // A pouring tool that has nothing to pour into says what to do first.
  function notReady(id) {
    const h = homeOf(id);
    if (MAKE_TOOLS.includes(id)) {
      if (M.bowl !== "machine") { needBowl(); return; }
      if (!M.on && M.churn < 1) { needOn(); return; }
      wobble(id); tag(nameOf(id), h.x, h.y - 44); if (M.churn < 1 && amtOf(id) >= 1) hint();
      return;
    }
    if (id === "milk") {
      if (!B.holder) { needHolder(); return; }
      wobble(id); tag(NAMES.milk, h.x, h.y - 40);
      if (B.holder !== "steel") coach.say("The milk is for milkshakes.", 3); else if (B.milk >= 1 || B.at !== "spot") hint();
      return;
    }
    if (!B.holder) { wobble(id); needHolder(); return; }
    if (!B.scoops.length) { wobble(id); coach.say("Scoop the ice cream first.", 3); return; }
    if (B.holder === "steel" && B.at !== "glass") { wobble(id); hint(); return; }
    wobble(id); tag(NAMES[id], h.x, h.y - 40);
  }
  // Each frame for a held pouring tool: over its target it tips and pours.
  let shakeT = 0;
  function stepPours(dt, t) {
    Object.keys(POUR).forEach((id) => {
      const tl = T[id];
      if (!tl || !tl.held) return;
      const at = pourAt(id), ok = readyFor(id);
      const near = Math.abs(tl.x - at.x) < 80 && tl.y > at.y - 110 && tl.y < at.y + 50, over = ok && near;
      const want = over ? POUR[id].ang : 0;
      tl.ang += (want - tl.ang) * Math.min(1, dt * 10);
      tl.near = near && !ok;
      if (over && Math.abs(tl.ang - want) < 0.6) pourTick(id, tl, dt, t);
      else tl.shake = 0;
    });
  }
  function pourTick(id, tl, dt, t) {
    addAmt(id, dt * 0.75);
    const m = mouthOf(id, tl), tgt = pourTarget(id);
    if (id === "sprinkles") {
      tl.shake = Math.sin(t * 30) * 6;
      if (t > shakeT) { shakeT = t + 0.06; puff("sprinkle", m.x, m.y, 2); }
      if (Math.random() < dt * 4) snd.shake();
    } else if (id === "sugar") {
      tl.shake = Math.sin(t * 24) * 3;
      if (t > shakeT) { shakeT = t + 0.05; puff("drop", m.x, m.y, 2, "#FFFFFF"); }
      if (Math.random() < dt * 3) snd.shake();
    } else if (id === "cream") {
      if (t > shakeT) { shakeT = t + 0.08; puff("drop", m.x, m.y, 1, "#FFFFFF"); }
      if (Math.random() < dt * 3) snd.hiss();
    } else {
      const col = id === "sauce" ? "#5A2E16" : id === "carton" ? "#FFF6DC" : "#FFFFFF";
      V.streams[id] = { x: m.x, y: m.y, tx: tgt.x, ty: tgt.y + 4, until: t + 0.08, col, w: id === "sauce" ? 5 : 7 };
      if (Math.random() < dt * 2) (id === "sauce" ? snd.squeeze : snd.pour)();
    }
  }
  function toolHome(id, dur) {
    const tl = T[id], h = homeOf(id), a = { x: tl.x, y: tl.y, ang: tl.ang };
    if (tl.tw) cancel(tl.tw);
    tl.out = true;
    tl.tw = tween(dur || 0.45, (p) => { const e = ease(p); tl.x = lerp(a.x, h.x, e); tl.y = lerp(a.y, h.y, e) - Math.sin(p * Math.PI) * 20; tl.ang = lerp(a.ang, 0, e); tl.shake = 0; },
      () => { tl.tw = null; tl.out = false; });
  }
  function pourTap(id) {
    if (busy) return;
    if (!readyFor(id)) { notReady(id); return; }
    busy = true;
    const tl = T[id], a = { x: tl.x, y: tl.y }, at = pourAt(id), ang = POUR[id].ang;
    if (tl.tw) cancel(tl.tw);
    tl.out = true;
    tl.tw = tween(0.45, (p) => { const e = ease(p); tl.x = lerp(a.x, at.x, e); tl.y = lerp(a.y, at.y, e) - Math.sin(p * Math.PI) * 30; tl.ang = ang * e; }, () => {
      tl.tw = tween(1.3, (p) => { pourTick(id, tl, 1 / 60, now()); if (p >= 1) addAmt(id, 1); }, () => {
        tl.tw = null; tl.shake = 0; busy = false; addAmt(id, 1); toolHome(id);
      });
    });
  }
  // A cherry hops from the bowl onto the top.
  function cherryOn(from) {
    if (B.tops.cherry >= 1) return;
    busy = true;
    const tl = T.cherry, a = from || { x: L.tools.cherry.x, y: L.tools.cherry.y - 8 };
    tl.out = true; tl.x = a.x; tl.y = a.y;
    const top0 = icTop();
    tween(0.5, (p) => { const e = ease(p); tl.x = lerp(a.x, top0.x, e); tl.y = lerp(a.y, top0.y - 8, e) - Math.sin(p * Math.PI) * 60; }, () => {
      tl.out = false; const h = homeOf("cherry"); tl.x = h.x; tl.y = h.y;
      busy = false; snd.boing(); V.squish = 1; addAmt("cherry", 1);
    });
  }
  function cherryTap() {
    if (busy) return;
    if (!readyFor("cherry")) { notReady("cherry"); return; }
    cherryOn();
  }

  // =====================================================================================================
  // Actions: milkshake mixer
  // =====================================================================================================
  // The steel cup sits on the mixer's base with the spindle down inside it; it mixes by itself once it is on.
  const mixerCupPt = () => ({ x: L.mixer.x, y: L.mixer.y - 8 });
  function toMixer(from) {
    if (busy || B.holder !== "steel" || B.at !== "spot") return;
    if (!B.scoops.length || B.milk < 1) { hint(); return; }
    busy = true;
    const a = from || { x: L.holder.x, y: L.holder.y }, to = mixerCupPt();
    V.steel = { x: a.x, y: a.y, ang: 0 };
    tween(0.5, (p) => { const e = ease(p); V.steel.x = lerp(a.x, to.x, e); V.steel.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * 50; }, () => {
      V.steel = null; B.at = "mixer"; busy = false; snd.clack();
      ghost.learned("mixer"); did("mixer"); lastWant = null; saveSoon();
      V.glassIn = 0; tween(0.45, (p) => { V.glassIn = ease(p); });
      startMix();
    });
  }
  function startMix() {
    const m0 = B.mix;
    V.spin = true;
    tween((reduce ? 1.5 : 3.6) * (1 - m0), (p) => {
      B.mix = lerp(m0, 1, p);
      if (Math.random() < 0.25) { const c = mixerCupPt(); puff("splash", c.x + (Math.random() - 0.5) * 30, c.y + RIM.steel, 1, shakeColor(B.scoops)); }
    }, () => { B.mix = 1; V.spin = false; snd.chime(); lastWant = null; saveSoon(); });
  }
  // Pouring: the cup tips over the glass on the holder. Its middle is the pivot.
  const STEEL_MID = 42, STEEL_ANG = 2.0;
  function steelPourAt() {
    const g = { x: L.holder.x, y: L.holder.y + GLASS_RIM - 10 };
    const mx = g.x - Math.sin(STEEL_ANG) * STEEL_MID, my = g.y + Math.cos(STEEL_ANG) * STEEL_MID;
    return { x: mx, y: my + STEEL_MID };
  }
  function steelMouth(s) { const my = s.y - STEEL_MID; return { x: s.x + Math.sin(s.ang || 0) * STEEL_MID, y: my - Math.cos(s.ang || 0) * STEEL_MID }; }
  function pourShake() {
    if (busy || B.holder !== "steel" || B.at !== "mixer" || B.mix < 1) return;
    busy = true;
    const a = V.steel ? { x: V.steel.x, y: V.steel.y, ang: V.steel.ang || 0 } : Object.assign(mixerCupPt(), { ang: 0 }), to = steelPourAt();
    V.steel = { x: a.x, y: a.y, ang: a.ang };
    tween(0.5, (p) => { const e = ease(p); V.steel.x = lerp(a.x, to.x, e); V.steel.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * 30; V.steel.ang = lerp(a.ang, STEEL_ANG, e); }, () => {
      const p0 = B.pour;
      tween(1.4 * (1 - p0) + 0.05, (p) => { B.pour = Math.max(B.pour, lerp(p0, 1, p)); shakeStream(); }, finishPour);
    });
  }
  function shakeStream() {
    if (!V.steel) return;
    const m = steelMouth(V.steel);
    V.streams.shake = { x: m.x, y: m.y, tx: L.holder.x, ty: L.holder.y - 30 - B.pour * 90, until: now() + 0.08, col: shakeColor(B.scoops), w: 8 };
    if (Math.random() < 0.05) snd.pour();
  }
  function finishPour() {
    B.pour = 1; B.at = "glass"; busy = false;
    snd.chime(); ghost.learned("pour"); did("pour"); lastWant = null; saveSoon();
    puff("spark", L.holder.x, L.holder.y + GLASS_RIM, 6);
    // The empty cup goes back to its stack.
    const s = V.steel || Object.assign(mixerCupPt(), { ang: 0 }), a = { x: s.x, y: s.y, ang: s.ang || 0 }, h = L.stacks.steels;
    V.steel = { x: a.x, y: a.y, ang: a.ang, empty: true };
    tween(0.5, (p) => { const e = ease(p); if (!V.steel) return; V.steel.x = lerp(a.x, h.x, e); V.steel.y = lerp(a.y, h.y + 20, e) - Math.sin(p * Math.PI) * 30; V.steel.ang = lerp(a.ang, 0, e); V.steel.k = 1 - e * 0.3; },
      () => { V.steel = null; });
  }
  function mixerTap() {
    if (B.holder === "steel" && B.at === "spot" && B.scoops.length && B.milk >= 1) { toMixer(); return; }
    if (B.holder === "steel" && B.at === "mixer" && B.mix >= 1) { pourShake(); return; }
    V.spinUntil = now() + 0.8; snd.whirr();
    tag(NAMES.mixer, L.mixer.x, L.mixer.y - 180);
    if (B.holder === "steel" && B.at === "spot") hint();
  }

  // =====================================================================================================
  // Actions: serve
  // =====================================================================================================
  const servable = () => !!B.holder && B.scoops.length > 0 && (B.holder !== "steel" || B.at === "glass");
  // The build goes into the customer's hand. Whatever it is, they take it happily.
  const handPt = () => {
    const kid = C.look && C.look.kid;
    return { x: C.x - 40, y: L.counterY - (kid ? 22 : 34) };
  };
  function serve() {
    if (busy || C.phase !== "order") return;
    if (!servable()) {
      if (!B.holder) say("Where is my " + (anyOrder() ? "ice cream" : WORD[C.order.menu]) + "?", 3);
      else if (!B.scoops.length) say("It needs ice cream!", 3);
      else hint();
      returnIc();
      return;
    }
    busy = true;
    const any = anyOrder();
    const m = any ? null : matchInfo(C.order, B), perfect = any || (m.holder && !m.missing.length && m.tops.every(Boolean));
    const build = JSON.parse(JSON.stringify(B));
    const a = { x: L.holder.x + V.ic.dx, y: L.holder.y + V.ic.dy }, h = handPt();
    V.fly = { b: build, x: a.x, y: a.y, k: V.ic.k };
    const menu = C.order.menu;
    B = emptyBuild(); V.ic = { dx: 0, dy: 0, k: 1 };
    ghost.learned("serve"); did("serve");
    keep(tween(0.7, (p) => { const e = ease(p); V.fly.x = lerp(a.x, h.x, e); V.fly.y = lerp(a.y, h.y + 44, e) - Math.sin(p * Math.PI) * 40; V.fly.k = lerp(1, 0.62, e); }, () => {
      V.fly = null; C.hold = build; C.phase = "take"; C.happy = 1; busy = false; served++;
      if (menu !== "any") servedBy[menu]++;
      say(any ? "Yum! Thank you!" : perfect ? "Yum! Just right. Thank you!" : "Thank you! Yum!", 3);
      snd.chime();
      puff("heart", C.x, L.counterY - 150, perfect ? 6 : 3);
      if (perfect) Toybox.kind();
      lastWant = null; saveSoon();
      keep(later(2.2, walkOut));
    }));
  }
  function walkOut() {
    if (C.phase !== "take") return;
    C.phase = "out";
    const x0 = C.x;
    const x1 = vis().x0 - 90;
    keep(tween(reduce ? 0.6 : 3, (p) => { C.x = lerp(x0, x1, ease(p)); C.walk = 1; }, () => {
      C.walk = 0; C.phase = "none"; C.hold = null;
      keep(later(0.9, nextCustomer));
    }));
  }
  function returnIc() {
    const a = { dx: V.ic.dx, dy: V.ic.dy };
    tween(0.3, (p) => { V.ic.dx = lerp(a.dx, 0, ease(p)); V.ic.dy = lerp(a.dy, 0, ease(p)); });
  }

  // =====================================================================================================
  // Actions: the ice cream maker
  // =====================================================================================================
  // The machine is a freezer-bowl churn: the bowl comes out of the freezer frozen, sits on the base, and turns
  // while the paddle held by the clear lid stays still and scrapes the freezing mix off the wall.
  const BOWL_H = 84, BASE_H = 72;
  const spoutPt = () => ({ x: L.z.mx + 46 * L.z.k, y: L.z.my - (BASE_H + 126) * L.z.k });
  const bowlMcPt = () => ({ x: L.z.mx, y: L.z.my - BASE_H * L.z.k });
  const fzScale = () => Math.min(0.75 * L.z.fz.w / 140, 0.62 * L.z.k);
  const bowlFzPt = () => ({ x: L.z.fz.x + L.z.fz.w / 2, y: L.z.fz.y + 22 + L.z.fz.h * 0.4 });
  const allIn = () => M.milk >= 1 && M.cream >= 1 && M.sugar >= 1 && M.flavor >= 0;
  function takeBowl(from) {
    if (busy || M.bowl !== "freezer") return;
    busy = true; snd.whoosh();
    const go = () => {
      const a = from || bowlFzPt(), b = bowlMcPt(), s0 = from ? from.s : fzScale();
      MV.bowlFly = { x: a.x, y: a.y, s: s0 };
      tween(0.6, (p) => { const e = ease(p); MV.bowlFly.x = lerp(a.x, b.x, e); MV.bowlFly.y = lerp(a.y, b.y, e) - Math.sin(p * Math.PI) * 50; MV.bowlFly.s = lerp(s0, L.z.k, e); }, () => {
        MV.bowlFly = null; M.bowl = "machine"; M.lid = 0; snd.clack();
        puff("frost", b.x, b.y - 40 * L.z.k, 8);
        tween(0.4, (p) => { M.lid = ease(p); }, null, 0.15);
        tween(0.35, (p) => { MV.door = 1 - ease(p); });
        busy = false; ghost.learned("bowl"); did("bowl"); lastWant = null; saveSoon();
      });
    };
    if (from) go();
    else tween(0.3, (p) => { MV.door = Math.max(MV.door, ease(p)); }, go);
  }
  function needBowl() {
    MV.misses++;
    if (MV.misses >= 2) { MV.misses = 0; takeBowl(); return; }
    MV.fzGlow = 1;
    coach.say("Take the frozen bowl out of the freezer first.", 3);
  }
  // Two-step machine: pouring while it is off says so; the second time it switches on for him.
  function needOn() {
    MV.onMisses++;
    if (MV.onMisses >= 2) { MV.onMisses = 0; setOn(true); return; }
    MV.switchGlow = 1;
    coach.say("Switch on the ice cream maker first.", 3);
  }
  function setOn(on) {
    if (M.on === on) return;
    M.on = on; snd.click(); MV.switchGlow = 0;
    if (on) { ghost.learned("switch"); did("switch"); }
    lastWant = null; saveSoon();
  }
  function switchTap() {
    if (M.bowl !== "machine") { needBowl(); return; }
    if (M.tub === "full") { tag(NAMES.switch, switchPt().x, switchPt().y - 30); hint(); return; }
    setOn(!M.on);
  }
  function flavorIn(i, from) {
    if (busy) return;
    const id = "fl" + i, h = homeOf(id);
    if (M.bowl !== "machine") { needBowl(); returnTool(id); return; }
    if (!M.on && M.churn < 1) { needOn(); returnTool(id); return; }
    if (M.flavor >= 0 || M.churn >= 1) {
      returnTool(id); wobble(id); tag(FLAVORS[i].name, h.x, h.y - 44);
      if (M.flavor >= 0 && M.flavor !== i) coach.say("The ice cream maker already has " + fname(M.flavor) + " in it.", 3);
      return;
    }
    busy = true;
    const tl = T[id], a = from || { x: tl.x, y: tl.y }, sp = spoutPt(), to = { x: sp.x - 26 * L.z.ts, y: sp.y - 30 * L.z.ts };
    if (tl.tw) cancel(tl.tw);
    tl.out = true; tl.x = a.x; tl.y = a.y;
    tl.tw = tween(0.5, (p) => { const e = ease(p); tl.x = lerp(a.x, to.x, e); tl.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * 40; tl.ang = 2.1 * e; }, () => {
      tl.tw = tween(0.9, (p) => { if (Math.random() < 0.5) puff("drop", sp.x, sp.y - 6, 1, FLAVORS[i].hex); if (p > 0.5 && M.flavor < 0) { M.flavor = i; snd.plop(); } }, () => {
        tl.tw = null; busy = false; M.flavor = i;
        ghost.learned("flavor"); did("flavor"); lastWant = null; saveSoon();
        toolHome(id);
      });
    });
  }
  function returnTool(id) { const tl = T[id]; if (tl.out && !tl.tw) toolHome(id); }
  function stepMake(dt, t) {
    if (M.bowl === "machine" && M.on) {
      MV.rot += dt * (reduce ? 0.6 : 1.4);
      if (t > humT && Z.on) { humT = t + 0.55; snd.hum(); }
      if (allIn() && M.churn < 1) {
        M.churn = Math.min(1, M.churn + dt / (reduce ? 5 : 11));
        if (M.churn >= 1) { snd.chime(); const b = bowlMcPt(); puff("spark", b.x, b.y - 90 * L.z.k, 8); did("churn"); lastWant = null; saveSoon(); }
      }
    }
  }
  let humT = 0;
  function spoonOut() {
    if (busy || M.churn < 1 || M.tub !== "empty") return;
    busy = true;
    setOn(false);
    tween(0.35, (p) => { M.lid = 1 - ease(p); }, () => {
      MV.out = 0;
      tween(reduce ? 0.8 : 1.8, (p) => {
        const was = Math.floor(MV.out * 3);
        MV.out = p;
        if (Math.floor(p * 3) > was) snd.plop();
      }, () => {
        M.tub = "full"; MV.out = 0; busy = false;
        ghost.learned("spoon"); did("spoon"); lastWant = null; saveSoon();
        puff("spark", L.z.tub.x, L.z.tub.y - 30, 6);
      });
    });
  }
  // The full tub goes to the shop: the view zooms out and the tub slides into its place in the cabinet.
  function carryTub() {
    if (busy || M.tub !== "full") return;
    const f = M.flavor;
    did("carry"); ghost.learned("carry");
    zoomOut(() => {
      const a = { x: L.churn.x, y: L.churn.y - 20 }, b = tubPt(f);
      V.tubFly = { f, x: a.x, y: a.y };
      tween(0.9, (p) => { const e = ease(p); V.tubFly.x = lerp(a.x, b.x, e); V.tubFly.y = lerp(a.y, b.y, e) - Math.sin(p * Math.PI) * 90; }, () => {
        V.tubFly = null; madeTub[f] = 1; snd.chime(); puff("spark", b.x, b.y, 10, FLAVORS[f].hex);
        Toybox.kind(); saveSoon();
      });
    });
    M = freshM(); MV.misses = 0; MV.onMisses = 0;
  }
  function machineTap(part) {
    if (part === "bowl" && M.churn >= 1 && M.tub === "empty") { spoonOut(); return; }
    const p = partPt(part) || { x: L.z.mx, y: L.z.my - 120 * L.z.k };
    tag(part === "bowl" && M.bowl === "machine" ? NAMES.bowl : NAMES.machine, p.x, p.y - 40);
    if (M.bowl !== "machine") { MV.fzGlow = 1; hint(); }
    else if (part === "bowl" && M.on) { puff("frost", bowlMcPt().x, bowlMcPt().y - 60 * L.z.k, 4); }
    else hint();
  }

  // =====================================================================================================
  // Zooming in and out
  // =====================================================================================================
  function setZoomUI(on) {
    $("back").hidden = !on; $("tapp").hidden = !on;
    $("tst").textContent = on ? "Ice Cream Maker" : "Ice Cream Shop";
  }
  function zoomIn() {
    if (Z.on || Z.moving || locked()) return;
    drag = null; press.cancel(); Z.moving = true; parts = [];
    setZoomUI(true); snd.whoosh(); coach.busy(); lastWant = "";
    keep(tween(reduce ? 0.25 : 0.75, (p) => { Z.t = ease(p); }, () => {
      Z.t = 1; Z.on = true; Z.moving = false; placeAll(); lastWant = null; ghost.poke(); saveSoon();
    }));
  }
  function zoomOut(after) {
    if (!Z.on || Z.moving) return;
    drag = null; press.cancel(); Z.moving = true; Z.on = false; parts = [];
    placeAll(); setZoomUI(false); snd.whoosh(); coach.busy(); lastWant = "";
    keep(tween(reduce ? 0.25 : 0.75, (p) => { Z.t = 1 - ease(p); }, () => {
      Z.t = 0; Z.moving = false; lastWant = null; saveSoon();
      if (after) after();
    }));
  }
  $("back").addEventListener("click", () => { if (!locked()) zoomOut(); });

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillStroke(fill, lw) { if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.lineJoin = "round"; ctx.stroke(); }
  function circle(x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fillStroke(fill, lw); }
  function ellipse(x, y, rx, ry, fill, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); fillStroke(fill, lw); }
  function text(s, x, y, size, color, weight, align) {
    ctx.font = (weight || 700) + " " + size + "px " + FONT; ctx.fillStyle = color || INK;
    ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(s, x, y);
  }
  function wrap(s, maxW, size) {
    ctx.font = "700 " + size + "px " + FONT;
    const words = s.split(" "), lines = [];
    let line = "";
    words.forEach((w) => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines;
  }
  function tick(x, y, r) {
    circle(x, y, r, "#3CC46B", 1.8);
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y); ctx.lineTo(x - r * 0.1, y + r * 0.38); ctx.lineTo(x + r * 0.5, y - r * 0.4);
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = Math.max(1.6, r * 0.32); ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
  }
  // A white name card with the name on it (tubs, flavors).
  function card(s, x, y, fs, maxW) {
    ctx.font = "700 " + fs + "px " + FONT;
    const tw = Math.min(maxW, ctx.measureText(s).width + 14);
    rr(x - tw / 2, y - fs * 0.55, tw, fs * 1.1, 5); fillStroke("#FFFFFF", 1.6);
    text(s, x, y + 1, fs, INK, 700);
  }

  // =====================================================================================================
  // Drawing the ice cream, sundae and milkshake
  // =====================================================================================================
  // One ball of ice cream at (x, y) with a wavy skirt at the bottom where it was pressed in the scoop.
  function ballPath(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, TAU);
    const n = 5, by = y + r * 0.42;
    ctx.lineTo(x + r, by - r * 0.1);
    for (let i = 0; i < n; i++) {
      const x1 = x + r - (i + 1) * (2 * r / n), xm = (x1 + x1 + 2 * r / n) / 2;
      ctx.quadraticCurveTo(xm, by + r * 0.34, x1, by - (i === n - 1 ? r * 0.1 : 0));
    }
    ctx.closePath();
  }
  function drawBall(x, y, r, f, seed, lw) {
    const F = FLAVORS[f];
    ballPath(x, y, r);
    ctx.fillStyle = F.hex; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = F.dark; ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.75, r * 1.1, r * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.5, r * 0.28, r * 0.16, -0.6, 0, TAU); ctx.fill();
    if (F.id === "mint" || F.id === "bubblegum" || F.id === "strawberry") {
      for (let i = 0; i < 7; i++) {
        const a = hash(seed, i) * TAU, d = Math.sqrt(hash(seed, i + 9)) * r * 0.8;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
        if (F.id === "mint") { ctx.fillStyle = "#4A2E1E"; ctx.fillRect(px - r * 0.07, py - r * 0.05, r * 0.14, r * 0.1); }
        else if (F.id === "strawberry") { ctx.fillStyle = "#E0456F"; ctx.beginPath(); ctx.arc(px, py, r * 0.06, 0, TAU); ctx.fill(); }
        else { ctx.fillStyle = i % 2 ? "#FF6FA8" : "#FFE15C"; ctx.beginPath(); ctx.arc(px, py, r * 0.07, 0, TAU); ctx.fill(); }
      }
    }
    ctx.restore();
    ballPath(x, y, r);
    ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.lineJoin = "round"; ctx.stroke();
  }
  function drawCone(x, y, lw) {
    ctx.beginPath(); ctx.moveTo(x - 27, y - 64); ctx.lineTo(x + 27, y - 64); ctx.lineTo(x, y); ctx.closePath();
    ctx.fillStyle = "#E9B460"; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = "#C88A36"; ctx.lineWidth = 2;
    for (let k = -4; k <= 4; k++) {
      ctx.beginPath(); ctx.moveTo(x + k * 14 - 30, y - 70); ctx.lineTo(x + k * 14 + 30, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + k * 14 + 30, y - 70); ctx.lineTo(x + k * 14 - 30, y); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - 27, y - 64); ctx.lineTo(x + 27, y - 64); ctx.lineTo(x, y); ctx.closePath();
    ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.lineJoin = "round"; ctx.stroke();
    rr(x - 30, y - 70, 60, 10, 5); fillStroke("#F2C477", lw);
  }
  function drawCup(x, y, lw) {
    ctx.beginPath(); ctx.moveTo(x - 32, y - 48); ctx.lineTo(x + 32, y - 48); ctx.lineTo(x + 23, y); ctx.lineTo(x - 23, y); ctx.closePath();
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = "#FF7FA8"; ctx.fillRect(x - 40, y - 34, 80, 14);
    ctx.fillStyle = "#FFD23B";
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.arc(x + k * 12, y - 27, 2.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - 32, y - 48); ctx.lineTo(x + 32, y - 48); ctx.lineTo(x + 23, y); ctx.lineTo(x - 23, y); ctx.closePath();
    ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.lineJoin = "round"; ctx.stroke();
    rr(x - 35, y - 53, 70, 8, 4); fillStroke("#FFFFFF", lw);
  }
  // The tulip sundae dish: a glass bowl on a short stem. The scoops show through the glass.
  function dishBowlPath(x, y) {
    ctx.beginPath(); ctx.moveTo(x - 50, y - 74);
    ctx.bezierCurveTo(x - 50, y - 44, x - 26, y - 30, x - 8, y - 30); ctx.lineTo(x + 8, y - 30);
    ctx.bezierCurveTo(x + 26, y - 30, x + 50, y - 44, x + 50, y - 74); ctx.closePath();
  }
  function drawDishBack(x, y, lw) {
    ellipse(x, y - 4, 30, 6, "#E8F4FF", lw);
    rr(x - 5, y - 33, 10, 30, 4); fillStroke("#E8F4FF", lw);
    ellipse(x, y - 74, 50, 9, "#D2E9F7", lw);
  }
  function drawDishFront(x, y, lw) {
    dishBowlPath(x, y); ctx.fillStyle = "rgba(225,242,255,0.45)"; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.lineJoin = "round"; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y - 74, 50, 9, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 40, y - 64); ctx.quadraticCurveTo(x - 36, y - 46, x - 22, y - 38); ctx.stroke(); ctx.lineCap = "butt";
  }
  // The steel milkshake cup. Scoops peek over the rim; the milk and then the mixed milkshake show at the top.
  function steelPath(x, y) {
    ctx.beginPath(); ctx.moveTo(x - 30, y - 84); ctx.lineTo(x - 24, y - 4); ctx.quadraticCurveTo(x, y + 2, x + 24, y - 4); ctx.lineTo(x + 30, y - 84); ctx.closePath();
  }
  function drawSteel(x, y, b, lw) {
    ellipse(x, y - 84, 30, 7, "#7D8A9C", lw);
    if (b && b.holder === "steel") {
      if (b.mix > 0.5 || (b.mix > 0 && !b.scoops.length)) {
        ellipse(x, y - 85, 27, 6, shakeColor(b.scoops), lw * 0.7);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x - 16 + i * 8, y - 86 + (i % 2) * 2, 2, 0, TAU); ctx.fill(); }
      } else {
        if (b.milk > 0) { ctx.beginPath(); ctx.ellipse(x, y - 83, 27 * Math.min(1, 0.4 + b.milk), 6, 0, 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill(); }
        const n = b.scoops.length;
        b.scoops.forEach((f, k) => { const p = ballPos("steel", k, n); drawBall(x + p.x, y + p.y + b.mix * 20, R * 0.8, f, k + f * 7, lw); });
      }
    }
    steelPath(x, y); fillStroke("#C5CED9", lw);
    ctx.save(); steelPath(x, y); ctx.clip();
    ctx.strokeStyle = "#AEB9C6"; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 9, y - 84); ctx.lineTo(x + k * 7.5, y); ctx.stroke(); }
    ctx.restore();
    rr(x - 31, y - 76, 62, 8, 3); fillStroke("#DCE3EA", lw * 0.8);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.moveTo(x - 20, y - 78); ctx.lineTo(x - 13, y - 78); ctx.lineTo(x - 11, y - 12); ctx.lineTo(x - 17, y - 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - 84, 30, 7, 0, 0, Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.stroke();
  }
  // The tall milkshake glass on a short stem, with a straw once it is full.
  function glassPath(x, y) {
    ctx.beginPath(); ctx.moveTo(x - 30, y + GLASS_RIM); ctx.lineTo(x - 17, y - 34); ctx.quadraticCurveTo(x, y - 24, x + 17, y - 34); ctx.lineTo(x + 30, y + GLASS_RIM); ctx.closePath();
  }
  function drawGlass(x, y, b, lw) {
    ellipse(x, y - 4, 26, 6, "#E8F4FF", lw);
    rr(x - 5, y - 31, 10, 28, 3); fillStroke("#E8F4FF", lw);
    const col = shakeColor(b.scoops), lvl = clamp(b.pour, 0, 1);
    if (lvl >= 1) drawStraw(x, y, lw);
    if (lvl > 0) {
      ctx.save(); glassPath(x, y); ctx.clip();
      const top = y - 26 - lvl * 96;
      ctx.fillStyle = col; ctx.fillRect(x - 40, top, 80, y - top);
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(x - 40, top, 80, 5);
      ctx.restore();
    }
    glassPath(x, y); ctx.fillStyle = "rgba(225,242,255,0.3)"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.lineJoin = "round"; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y + GLASS_RIM, 30, 6, 0, 0, TAU); ctx.fillStyle = lvl >= 1 ? col : "rgba(225,242,255,0.5)"; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 22, y - 112); ctx.lineTo(x - 14, y - 46); ctx.stroke(); ctx.lineCap = "butt";
    if (lvl >= 1) drawTopsOn(b, x, y, lw);
  }
  function drawStraw(x, y, lw) {
    ctx.save(); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + 6, y - 60); ctx.lineTo(x + 26, y - 178);
    ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 7; ctx.stroke();
    ctx.setLineDash([7, 7]); ctx.strokeStyle = "#FF4F6D"; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore(); void lw;
  }
  // Whipped cream: a swirl of tiers that grows as it is sprayed.
  function drawCream(x, by, amt, lw) {
    if (amt <= 0) return;
    const TIERS = [[32, 13], [25, 12], [17, 11], [8, 9]], n = Math.max(1, Math.ceil(amt * 4));
    let y = by;
    for (let i = 0; i < n; i++) {
      const [hw, h] = TIERS[i];
      ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, hw, h * 0.65, 0, 0, TAU); fillStroke("#FFFFFF", lw);
      ctx.strokeStyle = "#E3E8F0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x - 3, y - h * 0.55, hw * 0.6, h * 0.3, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      y -= h * 0.75;
    }
  }
  function drawSauceCap(x, ty, a, lw) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.6);
    // A cap over the top third of the scoop, with drips running down from its edge.
    const a0 = Math.PI + 0.62, a1 = TAU - 0.62, ey = ty + Math.sin(a0) * (R + 1);
    ctx.beginPath();
    ctx.arc(x, ty, R + 1, a0, a1);
    const ex = x + Math.cos(a0) * (R + 1);
    [[0.55, 12], [0.2, 18], [-0.15, 10], [-0.45, 15]].forEach(([u, len]) => {
      const dx = x + u * R, l = len * Math.min(1, a * 1.2);
      ctx.lineTo(dx + 4, ey + 2); ctx.lineTo(dx + 4, ey + l); ctx.arc(dx, ey + l, 4, 0, Math.PI); ctx.lineTo(dx - 4, ey + 2);
    });
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.fillStyle = "#5A2E16"; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = lw || LW; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(x - R * 0.35, ty - R * 0.72, 7, 3, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawCherry(x, y, k, lw) {
    ctx.beginPath(); ctx.moveTo(x + 1 * k, y - 8 * k); ctx.quadraticCurveTo(x + 4 * k, y - 20 * k, x + 12 * k, y - 22 * k);
    ctx.strokeStyle = "#3E7A2A"; ctx.lineWidth = 2.6 * k; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
    circle(x, y, 10 * k, "#E3233B", lw);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(x - 3.5 * k, y - 3.5 * k, 3 * k, 2 * k, -0.6, 0, TAU); ctx.fill();
  }
  // The scoops on the top layer, where sauce runs.
  function topBalls(b) {
    const n = b.scoops.length, ps = b.scoops.map((f, k) => ballPos(b.holder, k, n));
    return b.holder === "dish" && n === 2 ? ps : [ps[n - 1]];
  }
  // Toppings in the order they are really layered: sauce, whipped cream, sprinkles, cherry. On a milkshake the
  // cream sits on the glass and the sauce runs over the cream.
  function drawTopsOn(b, x, y, lw) {
    const glass = onGlass(b), py = y + peakY(b), t = b.tops;
    if (!glass && t.sauce > 0) topBalls(b).forEach((p) => drawSauceCap(x + p.x, y + p.y, t.sauce, lw));
    if (glass && t.sauce > 0 && !(t.cream > 0)) { ctx.beginPath(); ctx.ellipse(x, py - 1, 20, 4, 0, 0, TAU); ctx.strokeStyle = "#5A2E16"; ctx.globalAlpha = Math.min(1, t.sauce * 1.6); ctx.lineWidth = 4; ctx.stroke(); ctx.globalAlpha = 1; }
    const ch = t.cream > 0 ? creamH(t.cream) : 0;
    if (t.cream > 0) drawCream(x, py + (glass ? 2 : 8), t.cream, lw);
    if (glass && t.sauce > 0 && t.cream > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, t.sauce * 1.6); ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const u = i / 8, xx = x - 26 + u * 52, yy = py - ch * 0.3 - (i % 2 ? 10 : 0) + Math.abs(u - 0.5) * 12; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.strokeStyle = "#5A2E16"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); ctx.restore();
    }
    const n = Math.round((t.sprinkles || 0) * 22);
    for (let i = 0; i < n; i++) {
      let px, py2;
      if (t.cream > 0) { const u = hash(i, 3), v = hash(i, 5); px = x + (u - 0.5) * 50 * (1 - v * 0.6); py2 = py + (glass ? 2 : 8) - v * ch - 4; }
      else {
        const tb = glass ? [{ x: 0, y: GLASS_RIM + 18 }] : topBalls(b), p = tb[i % tb.length];
        const ang = Math.PI + 0.25 + hash(i, 3) * (Math.PI - 0.5), d = R * (0.35 + hash(i, 5) * 0.55);
        px = x + p.x + Math.cos(ang) * d; py2 = y + p.y + Math.sin(ang) * d * (glass ? 0.2 : 0.9) + (glass ? -14 : 4);
      }
      ctx.save(); ctx.translate(px, py2); ctx.rotate(hash(i, 7) * TAU);
      ctx.fillStyle = SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]; ctx.fillRect(-4, -1.4, 8, 2.8);
      ctx.restore();
    }
    if (t.cherry >= 1) drawCherry(x + 3, py - ch + (t.cream > 0 ? 4 : -4), 1, lw);
  }
  // A whole build with its holder bottom at (x, y), scaled by k.
  function drawItem(b, x, y, k, squish) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    if (squish) ctx.scale(1 + squish * 0.06, 1 - squish * 0.06);
    const lw = LW / Math.max(0.5, k) * Math.min(1, k + 0.3);
    if (b.holder === "steel") { if (b.at === "spot") drawSteel(0, 0, b, lw); else drawGlass(0, 0, b, lw); }
    else {
      if (b.holder === "dish") drawDishBack(0, 0, lw);
      else if (b.holder === "cup") drawCup(0, 0, lw); else drawCone(0, 0, lw);
      const n = b.scoops.length;
      b.scoops.forEach((f, i) => { const p = ballPos(b.holder, i, n); drawBall(p.x, p.y, R, f, i + f * 7, lw); });
      if (b.holder === "dish") drawDishFront(0, 0, lw);
      if (n) drawTopsOn(b, 0, 0, lw);
    }
    ctx.restore();
  }
  // The order as a picture for the bubble, with green ticks for what already matches. For a milkshake the
  // flavors are small scoops beside the glass.
  function orderBuild(o) {
    const b = emptyBuild();
    b.holder = o.holder; b.scoops = o.scoops.slice();
    o.tops.forEach((t) => { b.tops[t] = 1; });
    if (o.holder === "steel") { b.at = "glass"; b.pour = 1; b.mix = 1; b.milk = 1; }
    return b;
  }
  // The picture's size in its own units (width, and height above the bottom).
  function picSize(o) {
    if (o.menu === "any") return { w: 250, h: 150 };
    const b = orderBuild(o), top = -surfaceY(b) + (o.tops.includes("cherry") ? 24 : 6);
    if (o.holder === "steel") return { w: 120, h: Math.max(top, 182) };
    return { w: o.holder === "dish" ? 104 : 70, h: top };
  }
  function drawOrderPic(o, x, y, k, m) {
    if (o.menu === "any") {
      const mini = [
        { holder: "cone", scoops: [2], tops: [] }, { holder: "dish", scoops: [1, 4], tops: ["cherry"] }, { holder: "steel", scoops: [0], tops: ["cream"] }];
      mini.forEach((q, i) => drawItem(orderBuild(q), x + (i - 1) * 84 * k, y, k * 0.82, 0));
      return;
    }
    const b = orderBuild(o), tr = 7.5;
    const shake = o.holder === "steel", gx = shake ? x - 24 * k : x;
    drawItem(b, gx, y, k, 0);
    if (shake) {
      const n = o.scoops.length;
      o.scoops.forEach((f, i) => {
        const bx = x + 34 * k, by = y - 30 * k - i * 40 * k;
        drawBall(bx, by, R * 0.62 * k, f, i + f * 7, LW * 0.8);
        if (m.scoopOk[i]) tick(bx + 20 * k, by - 10 * k, tr);
      });
      if (m.holder) tick(gx - 30 * k, y - 10 * k, tr);
      void n;
    } else {
      const n = o.scoops.length;
      if (m.holder) tick(x + (o.holder === "dish" ? 52 : 36) * k, y - 30 * k, tr);
      o.scoops.forEach((f, i) => { if (m.scoopOk[i]) { const p = ballPos(o.holder, i, n); tick(x + (p.x + R * 0.75) * k, y + (p.y - R * 0.6) * k, tr); } });
    }
    // Toppings: ticks on the left of the top, the cherry's on its right.
    const py = y + peakY(b) * k, ch = b.tops.cream > 0 ? creamH(1) * k : 0, lx = x - (shake ? 60 : (o.holder === "dish" ? 60 : 42)) * k;
    o.tops.forEach((id, j) => {
      if (!m.tops[j]) return;
      if (id === "cherry") tick(gx + 26 * k, py - ch - 12 * k, tr);
      else if (id === "cream") tick(lx, py - ch * 0.5, tr);
      else if (id === "sauce") tick(lx, py + 10 * k, tr);
      else tick(lx, py - ch - 2 * k, tr);
    });
  }

  // =====================================================================================================
  // Drawing the shop
  // =====================================================================================================
  function drawRoom() {
    // The back wall: soft stripes.
    const v = vis();
    ctx.fillStyle = "#FFF4F7"; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, L.counterY + 10 - v.y0);
    ctx.fillStyle = "#FFDCE7";
    for (let x = Math.floor(v.x0 / 40) * 40; x < v.x1; x += 40) ctx.fillRect(x, v.y0, 20, L.counterY + 10 - v.y0);
    // Bunting along the top.
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(L.w / 2, 26, L.w, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (let i = 0; i < Math.floor(L.w / 34); i++) {
      const x = 14 + i * 34, u = x / L.w, y = 6 + 4 * 20 * u * (1 - u);
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x, y + 18); ctx.closePath();
      fillStroke(SPRINKLE_COLORS[i % 5], 1.6);
    }
    // The window behind the customer.
    const w = L.win;
    rr(w.x, w.y, w.w, w.h, 10); fillStroke("#BDE6FF", 3);
    ctx.save(); rr(w.x, w.y, w.w, w.h, 10); ctx.clip();
    ctx.fillStyle = "#FFFFFF";
    [[0.25, 0.3], [0.7, 0.2]].forEach(([u, vv]) => { const cx = w.x + u * w.w, cy = w.y + vv * w.h; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.arc(cx + 14, cy + 2, 10, 0, TAU); ctx.arc(cx - 13, cy + 3, 9, 0, TAU); ctx.fill(); });
    ctx.fillStyle = "#7DCB6A"; ctx.beginPath(); ctx.ellipse(w.x + w.w * 0.5, w.y + w.h + 10, w.w * 0.7, 46, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(w.x + w.w / 2, w.y); ctx.lineTo(w.x + w.w / 2, w.y + w.h); ctx.moveTo(w.x, w.y + w.h / 2); ctx.lineTo(w.x + w.w, w.y + w.h / 2);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    rr(w.x - 8, w.y + w.h - 2, w.w + 16, 10, 4); fillStroke("#FFFFFF", 2);
    // The door the customers come in by.
    const d = L.door;
    rr(d.x, 40, d.w + 20, L.counterY, 8); fillStroke("#8FD3C1", 3);
    rr(d.x + 10, 56, d.w - 12, 70, 6); fillStroke("#DDF3FF", 2);
  }
  // The dipping cabinet seen from above, its tubs and their name cards. A tub he made is heaped up high.
  function drawCabinet(t) {
    const c = L.cab;
    rr(c.x - 6, L.counterY - 6, c.w + 12, 18, 6); fillStroke("#E7EDF3", 2.4);
    rr(c.x, c.y, c.w, c.h, 12); fillStroke("#C9D3DE", 3);
    rr(c.x + 8, c.y + 8, c.w - 16, c.h - 16, 8); fillStroke("#5E6E86", 2);
    const fs = fpx(15);
    L.tubs.forEach(([x, y], i) => {
      const f = FLAVORS[i], w = L.tubW, h = L.tubH;
      ctx.save();
      if (V.wob["tub" + i]) { const a = Math.sin(V.wob["tub" + i] * 16) * V.wob["tub" + i] * 0.05; ctx.translate(x, y); ctx.scale(1 + a, 1 - a); ctx.translate(-x, -y); }
      rr(x - w / 2, y - h / 2, w, h, 8); fillStroke("#E3E9F0", 2.4);
      rr(x - w / 2 + 6, y - h / 2 + 5, w - 12, h - 10, 6);
      ctx.fillStyle = f.hex; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = f.dark; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let k = 0; k < 4; k++) { const cx = x - w / 2 + 18 + k * (w - 30) / 3, cy = y + (k % 2 ? -6 : 6); ctx.beginPath(); ctx.arc(cx, cy, 10, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
      if (V.dent[i] > 0) { ctx.fillStyle = "rgba(0,0,0," + (0.18 * V.dent[i]) + ")"; ctx.beginPath(); ctx.ellipse(x, y, 20, 10, 0, 0, TAU); ctx.fill(); }
      if (f.id === "mint") for (let k = 0; k < 10; k++) { ctx.fillStyle = "#4A2E1E"; ctx.fillRect(x - w / 2 + 10 + hash(i, k) * (w - 20), y - h / 2 + 8 + hash(k, i) * (h - 16), 4, 3); }
      if (f.id === "bubblegum") for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 2 ? "#FF6FA8" : "#FFE15C"; ctx.beginPath(); ctx.arc(x - w / 2 + 10 + hash(i, k) * (w - 20), y - h / 2 + 8 + hash(k, i) * (h - 16), 2.4, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.lineCap = "butt";
      rr(x - w / 2 + 6, y - h / 2 + 5, w - 12, h - 10, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      if (madeTub[i]) {
        // Freshly made: a heaped mound above the rim with a little shine.
        ctx.beginPath(); ctx.ellipse(x, y - 2, w * 0.36, h * 0.42, 0, Math.PI, TAU); ctx.closePath(); fillStroke(f.hex, 1.8);
        ctx.strokeStyle = f.dark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x - 8, y - 4, 9, Math.PI * 1.1, Math.PI * 1.8); ctx.stroke();
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
        star(x + w * 0.3, y - h * 0.3, 5 + tw * 3, "#FFE36B");
      }
      ctx.restore();
      card(f.name, x, y + h / 2 + fs * 0.55 + 2, fs, w + 8);
    });
    ctx.fillStyle = "rgba(220,240,255,0.35)"; ctx.fillRect(c.x, c.y, c.w, 6);
  }
  function star(x, y, r, col) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = i % 2 ? r * 0.4 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  }
  function drawCounter() {
    const v = vis();
    ctx.fillStyle = "#F3EEE6"; ctx.fillRect(v.x0, L.counterY + 8, v.x1 - v.x0, v.y1 - L.counterY);
    ctx.fillStyle = "#E8E0D4";
    for (let y = L.counterY + 60; y < v.y1; y += 36) ctx.fillRect(v.x0, y, v.x1 - v.x0, 2);
    ctx.beginPath(); ctx.moveTo(v.x0, L.counterY + 8); ctx.lineTo(v.x1, L.counterY + 8); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  }
  // The dipper well: a little sink of running water where the scoop waits.
  function drawWell(t) {
    const w = L.well;
    ellipse(w.x, w.y + 6, 36, 18, "#C9D3DE", 2.4);
    ellipse(w.x, w.y + 4, 28, 12, "#7FC8F0", 2);
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.6;
    for (let k = 0; k < 2; k++) { const r = ((t * 0.6 + k * 0.5) % 1); ctx.globalAlpha = 1 - r; ctx.beginPath(); ctx.ellipse(w.x + 6, w.y + 4, 6 + r * 18, 2 + r * 7, 0, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function drawScoop() {
    ctx.save();
    ctx.translate(S.x, S.y); ctx.rotate(S.ang);
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(34, -30); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.stroke();
    ctx.strokeStyle = "#D7DEE6"; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, -26); ctx.lineTo(50, -46); ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.stroke();
    ctx.strokeStyle = "#E5484D"; ctx.lineWidth = 9; ctx.stroke(); ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI); ctx.closePath(); fillStroke("#D7DEE6");
    ctx.restore();
    if (S.ball > 0.02 && S.f >= 0) drawBall(S.x, S.y - 6 * S.ball, R * (0.35 + 0.6 * S.ball), S.f, 3, LW);
  }
  function wobT(id) { const v = V.wob[id] || 0; return v ? Math.sin(v * 18) * v * 0.12 : 0; }
  // The four stacks, each three deep, drawn small. p is the stack's middle.
  const STACK_K = 0.7;
  function drawStacks() {
    STACKS.forEach((s) => {
      const p = L.stacks[s.id];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wobT(s.id)); ctx.scale(STACK_K, STACK_K);
      const lw = LW / STACK_K;
      if (s.kind === "cone") for (let k = 2; k >= 0; k--) drawCone(0, 40 - k * 9, lw);
      else if (s.kind === "cup") for (let k = 0; k < 3; k++) drawCup(0, 36 - k * 7, lw);
      else if (s.kind === "dish") [[14, 34], [-6, 44]].forEach(([x, y]) => { drawDishBack(x, y, lw); drawDishFront(x, y, lw); });
      else [[14, 36], [-6, 46]].forEach(([x, y]) => drawSteel(x, y, null, lw));
      ctx.restore();
    });
  }
  // The holder: a round steel stand with a hole the cone stands in (its front hides the cone's tip). Anything
  // else stands on the mat in front of it, where the stand steps aside.
  const standOn = () => (B.holder ? B.holder === "cone" : V.hc ? V.hc.kind === "cone" : true);
  function drawHolder() {
    const h = L.holder;
    ellipse(h.x, h.y + 6, 56, 12, "#BFE3F6", 2);
    if (standOn()) {
      rr(h.x - 26, h.y - 36, 52, 42, 8); fillStroke("#C9D3DE");
      ellipse(h.x, h.y - 36, 26, 7, "#E7EDF3", 2.2);
      ellipse(h.x, h.y - 36, 15, 4, "#5E6E86", 1.6);
    }
    if (V.holderGlow > 0) { ctx.save(); ctx.globalAlpha = V.holderGlow; ctx.beginPath(); ctx.arc(h.x, h.y - 30, 60, 0, TAU); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
  }
  function drawHolderRing() {
    const h = L.holder;
    ctx.beginPath(); ctx.moveTo(h.x - 26, h.y - 36); ctx.ellipse(h.x, h.y - 36, 26, 7, 0, Math.PI, 0, true); ctx.lineTo(h.x + 26, h.y - 2);
    ctx.arcTo(h.x + 26, h.y + 6, h.x + 18, h.y + 6, 8); ctx.lineTo(h.x - 18, h.y + 6); ctx.arcTo(h.x - 26, h.y + 6, h.x - 26, h.y - 2, 8); ctx.closePath();
    fillStroke("#C9D3DE");
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(h.x - 18, h.y - 26, 6, 26);
  }
  function drawBuild() {
    if (V.hc) drawItem({ holder: V.hc.kind, scoops: [], tops: {}, at: "spot" }, V.hc.x, V.hc.y, 1, 0);
    if (!B.holder) return;
    const sq = V.squish * Math.sin(V.squish * 14);
    if (B.holder === "steel" && B.at !== "spot") {
      // The glass slides onto the holder from the right while the cup goes to the mixer.
      const dx = (1 - V.glassIn) * 120;
      drawItem(B, L.holder.x + V.ic.dx + dx, L.holder.y + V.ic.dy, V.ic.k, sq);
      return;
    }
    if (B.holder === "steel" && V.steel) return;
    drawItem(B, L.holder.x + V.ic.dx, L.holder.y + V.ic.dy, V.ic.k, sq);
    if (B.holder === "cone" && !V.ic.dx && !V.ic.dy) drawHolderRing();
  }
  // The steel cup on the mixer or moving (to the mixer, pouring, or back to its stack empty).
  function drawSteelMoving() {
    if (B.holder !== "steel" && !(V.steel && V.steel.empty)) return;
    let s = null;
    if (V.steel) s = V.steel;
    else if (B.at === "mixer") s = Object.assign(mixerCupPt(), { ang: 0 });
    if (!s) return;
    const b = s.empty ? null : B, k = s.k || 1;
    ctx.save(); ctx.translate(s.x, s.y - STEEL_MID); ctx.rotate(s.ang || 0); ctx.translate(0, STEEL_MID);
    if (V.spin && !V.steel) ctx.translate(Math.sin(now() * 60) * 1.2, 0);
    ctx.scale(k, k);
    drawSteel(0, 0, b, LW / k);
    ctx.restore();
  }
  // The spindle drink mixer: a base, a column, the motor head and the spindle that reaches down into the cup.
  function drawMixer(t) {
    const x = L.mixer.x, y = L.mixer.y, spin = V.spin || t < V.spinUntil, j = spin ? Math.sin(t * 50) * 0.8 : 0;
    rr(x - 46, y - 8, 92, 14, 6); fillStroke("#7FD1C0");
    rr(x + 30, y - 160, 16, 156, 6); fillStroke("#7FD1C0");
    // The spindle and its little mixing disk.
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + j, y - 140); ctx.lineTo(x + j, y - 32); ctx.stroke();
    ctx.strokeStyle = "#D7DEE6"; ctx.lineWidth = 3; ctx.stroke(); ctx.lineCap = "butt";
    rr(x - 9 + j, y - 36, 18, 6, 3); fillStroke("#D7DEE6", 1.8);
    if (spin) {
      ctx.strokeStyle = "rgba(29,35,64,0.35)"; ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) { const yy = y - 136 + k * 30 + ((t * 120) % 30); ctx.beginPath(); ctx.ellipse(x, yy, 9, 3, 0, 0, TAU); ctx.stroke(); }
    }
    ctx.save(); ctx.translate(j, 0);
    rr(x - 48, y - 176, 96, 42, 18); fillStroke("#7FD1C0");
    rr(x - 48, y - 160, 96, 9, 4); fillStroke("#E7EDF3", 1.8);
    circle(x - 30, y - 166, 4, spin ? "#5CC93A" : "#E7EDF3", 1.6);
    ctx.restore();
  }
  function drawParts() {
    parts.forEach((p) => {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = p.kind === "rain" ? Math.min(1, a * 3) : a;
      if (p.kind === "sprinkle" || p.kind === "rain") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size, -1.5, p.size * 2, 3); ctx.restore(); }
      else if (p.kind === "heart") {
        const s = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y + s * 0.8); ctx.bezierCurveTo(p.x - s * 1.4, p.y - s * 0.2, p.x - s * 0.5, p.y - s * 1.2, p.x, p.y - s * 0.4);
        ctx.bezierCurveTo(p.x + s * 0.5, p.y - s * 1.2, p.x + s * 1.4, p.y - s * 0.2, p.x, p.y + s * 0.8); ctx.fillStyle = p.color; ctx.fill();
      } else if (p.kind === "drop" || p.kind === "splash" || p.kind === "frost") {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fillStyle = p.color; ctx.fill();
        ctx.strokeStyle = "rgba(29,35,64,0.5)"; ctx.lineWidth = 1; ctx.stroke();
      } else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  }
  function drawStreams(t, ids) {
    ids.forEach((id) => {
      const s = V.streams[id];
      if (!s || t > s.until) return;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x + (s.tx - s.x) * 0.2, s.ty - 20, s.tx, s.ty);
      ctx.lineCap = "round";
      ctx.strokeStyle = INK; ctx.lineWidth = s.w + 2.5; ctx.stroke();
      ctx.strokeStyle = s.col; ctx.lineWidth = s.w; ctx.stroke(); ctx.lineCap = "butt";
    });
  }
  // A tub he made, flying from the ice cream maker to its place in the cabinet.
  function drawTubFly() {
    if (!V.tubFly) return;
    drawMakeTub(V.tubFly.x, V.tubFly.y + 20, 0.8, 1, V.tubFly.f);
  }

  // =====================================================================================================
  // Drawing the tools
  // =====================================================================================================
  // Each tool is drawn around its middle at (0, 0), upright; drawTool places, turns and scales it.
  function drawTool(id, tl) {
    const s = toolScale(id);
    ctx.save(); ctx.translate(tl.x + (tl.shake || 0), tl.y); ctx.rotate(tl.ang + wobT(id)); ctx.scale(s, s);
    const lw = LW / s * Math.min(1.2, s);
    if (id === "sprinkles") shakerShape(lw);
    else if (id === "sauce") sauceShape(lw);
    else if (id === "cream") creamCanShape(lw);
    else if (id === "milk" || id === "jug") jugShape(lw);
    else if (id === "carton") cartonShape(lw);
    else if (id === "sugar") sugarShape(lw);
    else if (/^fl\d$/.test(id)) flavorShape(+id.slice(2), lw);
    ctx.restore();
  }
  function shakerShape(lw) {
    rr(-20, -24, 40, 50, 10); fillStroke("rgba(235,245,255,0.95)", lw);
    ctx.save(); rr(-20, -24, 40, 50, 10); ctx.clip();
    for (let i = 0; i < 26; i++) { ctx.fillStyle = SPRINKLE_COLORS[i % 7]; ctx.save(); ctx.translate(-16 + hash(i, 1) * 32, -2 + hash(i, 2) * 26); ctx.rotate(hash(i, 3) * TAU); ctx.fillRect(-4, -1.3, 8, 2.6); ctx.restore(); }
    ctx.restore();
    rr(-20, -24, 40, 50, 10); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
    rr(-22, -34, 44, 14, 6); fillStroke("#FF7FA8", lw);
    ctx.fillStyle = INK; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(k * 9, -27, 2, 0, TAU); ctx.fill(); }
  }
  function sauceShape(lw) {
    rr(-17, -26, 34, 60, 12); fillStroke("#6B3A1E", lw);
    rr(-12, -8, 24, 22, 4); fillStroke("#FFF2C4", 1.6);
    ctx.beginPath(); ctx.arc(0, 3, 6, 0, TAU); ctx.fillStyle = "#6B3A1E"; ctx.fill();
    rr(-9, -34, 18, 10, 3); fillStroke("#FFFFFF", lw);
    ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(0, -44); ctx.lineTo(4, -34); ctx.closePath(); fillStroke("#FFFFFF", 1.8);
  }
  function creamCanShape(lw) {
    rr(-16, -22, 32, 54, 8); fillStroke("#F4F8FB", lw);
    rr(-16, -4, 32, 16, 2); fillStroke("#8FC8FF", 1.6);
    ctx.beginPath(); ctx.ellipse(0, 4, 7, 4, 0, 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    rr(-12, -30, 24, 9, 3); fillStroke("#D7DEE6", lw);
    ctx.beginPath(); ctx.moveTo(-5, -30); ctx.lineTo(-2, -42); ctx.lineTo(2, -42); ctx.lineTo(5, -30); ctx.closePath(); fillStroke("#FFFFFF", 1.8);
  }
  function jugShape(lw) {
    ctx.beginPath(); ctx.arc(22, 0, 12, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = "#3F8CFF"; ctx.lineWidth = 4.5; ctx.stroke();
    rr(-20, -18, 42, 46, 12); fillStroke("#FFFFFF", lw);
    rr(-11, -28, 24, 12, 4); fillStroke("#FFFFFF", lw);
    rr(-12, -35, 26, 8, 3); fillStroke("#3F8CFF", lw);
    rr(-20, 0, 42, 13, 2); fillStroke("#BFE0FF", 1.6);
  }
  function cartonShape(lw) {
    rr(-18, -12, 36, 44, 3); fillStroke("#FFF7DA", lw);
    ctx.beginPath(); ctx.moveTo(-18, -12); ctx.lineTo(-10, -26); ctx.lineTo(10, -26); ctx.lineTo(18, -12); ctx.closePath(); fillStroke("#FFFFFF", lw);
    rr(-5, -34, 10, 8, 2); fillStroke("#FFFFFF", 1.8);
    rr(-18, 2, 36, 14, 2); fillStroke("#FFD23B", 1.6);
    ctx.beginPath(); ctx.ellipse(0, 9, 8, 4.5, 0, 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  }
  function sugarShape(lw) {
    rr(-20, -20, 40, 46, 9); fillStroke("rgba(235,245,255,0.95)", lw);
    ctx.save(); rr(-20, -20, 40, 46, 9); ctx.clip();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(-20, -6, 40, 32);
    ctx.fillStyle = "#D7DEE6"; for (let i = 0; i < 18; i++) ctx.fillRect(-17 + hash(i, 1) * 34, -4 + hash(i, 2) * 28, 2, 2);
    ctx.restore();
    rr(-20, -20, 40, 46, 9); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
    rr(-16, -28, 32, 9, 3); fillStroke("#FF8A1F", lw);
  }
  // The six flavorings: vanilla extract, cocoa, strawberries, mint with chocolate chips, mango and bubblegum flavoring.
  function flavorShape(i, lw) {
    const bottle = (glass, label, deco) => {
      rr(-13, -14, 26, 40, 7); fillStroke(glass, lw);
      rr(-6, -26, 12, 13, 3); fillStroke(glass, lw);
      rr(-8, -33, 16, 8, 3); fillStroke("#3A3F55", lw);
      rr(-13, -4, 26, 18, 3); fillStroke(label, 1.6);
      deco();
    };
    const bowl = (fill) => {
      fill();
      ctx.beginPath(); ctx.moveTo(-28, -2); ctx.quadraticCurveTo(-26, 24, 0, 24); ctx.quadraticCurveTo(26, 24, 28, -2); ctx.closePath();
      fillStroke("rgba(200,230,255,0.95)", lw);
    };
    if (i === 0) bottle("#7A4A2A", "#FFF2C4", () => { ctx.strokeStyle = "#5A3418"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(0, 0, 8, 2); ctx.stroke(); ctx.lineCap = "butt"; circle(5, 4, 3, "#FFFFFF", 1.2); });
    else if (i === 1) {
      rr(-18, -18, 36, 44, 6); fillStroke("#6E432A", lw);
      ellipse(0, -18, 18, 5, "#93603F", lw);
      rr(-18, -2, 36, 16, 2); fillStroke("#F2D2A8", 1.6);
      circle(0, 6, 5, "#6E432A", 1.2);
    } else if (i === 2) bowl(() => { [[-12, -6], [8, -8], [-2, -14]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y + 10); ctx.quadraticCurveTo(x - 11, y - 2, x - 6, y - 7); ctx.quadraticCurveTo(x, y - 9, x + 6, y - 7); ctx.quadraticCurveTo(x + 11, y - 2, x, y + 10); ctx.closePath(); fillStroke("#E3233B", 1.8); ctx.fillStyle = "#5CC93A"; ctx.fillRect(x - 4, y - 10, 8, 4); }); });
    else if (i === 3) {
      bottle("#3FAF7A", "#E6FFF2", () => { ctx.beginPath(); ctx.ellipse(0, 5, 7, 4, -0.5, 0, TAU); ctx.fillStyle = "#3FAF7A"; ctx.fill(); });
      ctx.fillStyle = "#4A2E1E"; [[-22, 22], [-17, 25], [18, 23], [22, 26], [14, 26]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 3, y + 2); ctx.lineTo(x, y - 3); ctx.lineTo(x + 3, y + 2); ctx.closePath(); ctx.fill(); });
    } else if (i === 4) bowl(() => { for (let k = 0; k < 6; k++) { rr(-20 + (k % 3) * 13, -10 - Math.floor(k / 3) * 9, 12, 11, 2); fillStroke(k % 2 ? "#FFC453" : "#FFB02E", 1.6); } });
    else bottle("#6CB8EE", "#FFE6F2", () => { ctx.fillStyle = "#FF6FA8"; [[-6, 2], [5, 8], [-1, 9], [6, 0]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill(); }); });
  }
  function drawCherryBowl() {
    const p = L.tools.cherry;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wobT("cherry"));
    const pts = [[-16, -8], [0, -12], [16, -8], [-8, -16], [9, -18]];
    pts.forEach(([x, y], i) => { if (i < 4 || !T.cherry.out) drawCherry(x, y, 0.9, 2); });
    ctx.beginPath(); ctx.moveTo(-32, -10); ctx.quadraticCurveTo(-30, 16, 0, 16); ctx.quadraticCurveTo(30, 16, 32, -10); ctx.closePath();
    fillStroke("rgba(200,230,255,0.9)");
    ctx.restore();
    if (T.cherry.out) drawCherry(T.cherry.x, T.cherry.y, 1, LW);
  }

  // =====================================================================================================
  // Drawing the ice cream maker
  // =====================================================================================================
  // The freezer bowl: a double-walled cylinder seen from the front and a little above. When it turns, the frost
  // ridges on its side move; inside, the mix rises and thickens as it churns.
  function bowlContents() {
    if (M.tub === "full") return { level: 0 };
    const amt = (M.milk + M.cream) * 0.4 + M.sugar * 0.1 + (M.flavor >= 0 ? 0.1 : 0);
    if (amt <= 0) return { level: 0 };
    const base = "#FFF7E6", col = M.flavor >= 0 ? FLAVORS[M.flavor].hex : base;
    return { level: Math.min(1, amt * 0.75 + M.churn * 0.3) * (1 - MV.out), col: M.churn > 0.15 || M.flavor >= 0 ? col : base, thick: M.churn, f: M.flavor };
  }
  function drawBowl(x, by, s, frozen) {
    ctx.save(); ctx.translate(x, by); ctx.scale(s, s);
    const lw = LW / s * Math.min(1.25, s);
    ctx.beginPath(); ctx.moveTo(-66, -BOWL_H); ctx.lineTo(-66, -6); ctx.ellipse(0, -6, 66, 12, 0, Math.PI, 0, true); ctx.lineTo(66, -BOWL_H); ctx.closePath();
    ctx.fillStyle = "#D6EEFA"; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.strokeStyle = "#B5DCEF"; ctx.lineWidth = 5;
    for (let i = 0; i < 8; i++) {
      const u = ((i / 8 + MV.rot * 0.08) % 1), ang = u * Math.PI, xx = -Math.cos(ang) * 66;
      ctx.beginPath(); ctx.moveTo(xx, -BOWL_H + 6); ctx.lineTo(xx, 4); ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-66, -BOWL_H); ctx.lineTo(-66, -6); ctx.ellipse(0, -6, 66, 12, 0, Math.PI, 0, true); ctx.lineTo(66, -BOWL_H); ctx.closePath();
    ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke();
    ellipse(0, -BOWL_H, 66, 15, "#EAF6FC", lw);
    ellipse(0, -BOWL_H + 2, 56, 12, "#A9CFE3", lw * 0.8);
    if (frozen) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(-50 + hash(i, 2) * 100, -BOWL_H + 2 + (hash(i, 4) - 0.5) * 14, 2.2, 0, TAU); ctx.fill(); }
    } else {
      const c = bowlContents();
      if (c.level > 0.02) {
        const k = 0.75 + 0.25 * c.level;
        ctx.beginPath(); ctx.ellipse(0, -BOWL_H + 2 + 8 * (1 - c.level), 54 * k, 11 * k, 0, 0, TAU); ctx.fillStyle = c.col; ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.6; ctx.stroke();
        // Thin mix shows ripples going round; thick ice cream shows scraped curls.
        ctx.save(); ctx.beginPath(); ctx.ellipse(0, -BOWL_H + 2 + 8 * (1 - c.level), 54 * k, 11 * k, 0, 0, TAU); ctx.clip();
        const cy = -BOWL_H + 2 + 8 * (1 - c.level);
        if (c.thick < 0.35) {
          ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1.6;
          for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.ellipse(0, cy, 14 + r * 13, 3 + r * 2.6, 0, MV.rot + r, MV.rot + r + 2); ctx.stroke(); }
        } else {
          const dark = c.f >= 0 ? FLAVORS[c.f].dark : "#E9D59B";
          ctx.strokeStyle = dark; ctx.lineWidth = 3; ctx.lineCap = "round";
          for (let r = 0; r < 6; r++) { const a = MV.rot * 1.0 + r * 1.05, d = 18 + (r % 3) * 12; ctx.beginPath(); ctx.arc(Math.cos(a) * d, cy + Math.sin(a) * d * 0.2, 6, 0, Math.PI); ctx.stroke(); }
          if (c.f === 3) { ctx.fillStyle = "#4A2E1E"; for (let r = 0; r < 8; r++) { const a = MV.rot + r * 0.8; ctx.fillRect(Math.cos(a) * (10 + r * 5) - 2, cy + Math.sin(a) * 6 - 1.5, 4, 3); } }
          ctx.lineCap = "butt";
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }
  const switchPt = () => ({ x: L.z.mx, y: L.z.my - 36 * L.z.k });
  // The whole machine at (mx, my) (the bottom of the base), scaled by k. Small is the copy on the shop counter.
  function drawMachine(mx, my, k, small, t) {
    // The copy on the shop counter always shows the whole machine, so it looks like an ice cream maker.
    const bowlOn = small || M.bowl === "machine";
    ctx.save(); ctx.translate(mx, my); ctx.scale(k, k);
    const lw = small ? LW / k : LW;
    rr(-82, -BASE_H, 164, BASE_H, 22); fillStroke("#FAFAFA", lw);
    rr(-82, -BASE_H, 164, 16, 8); fillStroke("#E7EDF3", lw * 0.8);
    // The on/off switch on the front: green and down when on.
    rr(-18, -52, 36, 32, 8); fillStroke("#E7EDF3", lw);
    rr(-13, M.on ? -40 : -48, 26, 18, 5); fillStroke(M.on ? "#5CC93A" : "#FFFFFF", lw);
    if (!small) {
      text(M.on ? "ON" : "OFF", 0, -10, Math.max(11, 14.5 / (vs * k)), INK, 800);
      if (MV.switchGlow > 0) { ctx.save(); ctx.globalAlpha = MV.switchGlow; ctx.beginPath(); ctx.arc(0, -36, 34, 0, TAU); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
    }
    ctx.restore();
    if (bowlOn) {
      drawBowl(mx, my - BASE_H * k, k, small && M.bowl !== "machine");
      drawLid(mx, my - BASE_H * k, k, small, t);
    } else {
      ctx.save(); ctx.translate(mx, my); ctx.scale(k, k);
      ellipse(0, -BASE_H, 62, 12, "#C9D3DE", lw * 0.8);
      ellipse(0, -BASE_H - 2, 12, 4, "#5E6E86", lw * 0.6);
      ctx.restore();
    }
  }
  // The clear lid holds the paddle still inside the turning bowl; ingredients go in through its spout.
  function drawLid(x, by, k, small, t) {
    if (M.lid <= 0 && !small) return;
    const lid = small ? 1 : M.lid;
    ctx.save(); ctx.translate(x, by - (1 - lid) * 70 * k); ctx.scale(k, k);
    ctx.globalAlpha = lid;
    const lw = small ? LW / k : LW;
    // The paddle, seen through the lid.
    rr(-6, -BOWL_H - 32, 12, 40, 4); fillStroke("#FFFFFF", lw * 0.8);
    ctx.beginPath(); ctx.ellipse(0, -BOWL_H - 2, 70, 17, 0, 0, TAU);
    ctx.moveTo(-70, -BOWL_H - 2); ctx.quadraticCurveTo(0, -BOWL_H - 52, 70, -BOWL_H - 2);
    ctx.fillStyle = "rgba(240,250,255,0.35)"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
    // The spout.
    ctx.beginPath(); ctx.moveTo(30, -BOWL_H - 20); ctx.lineTo(34, -BOWL_H - 42); ctx.lineTo(58, -BOWL_H - 42); ctx.lineTo(56, -BOWL_H - 12); ctx.closePath();
    ctx.fillStyle = "rgba(240,250,255,0.6)"; ctx.fill(); ctx.stroke();
    ellipse(46, -BOWL_H - 42, 12, 4.5, "#5E6E86", lw * 0.8);
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(-48, -BOWL_H - 22, 5, 14);
    ctx.restore();
    void t;
  }
  function drawFreezer(t) {
    const f = L.z.fz;
    rr(f.x, f.y, f.w, f.h, 14); fillStroke("#F4F8FB", 3);
    const ix = f.x + 10, iy = f.y + 12, iw = f.w - 20, ih = f.h - 40;
    rr(ix, iy, iw, ih, 8); fillStroke("#CFEAF7", 2);
    const sy = bowlFzPt().y;
    ctx.fillStyle = "#B5DCEF"; ctx.fillRect(ix + 2, sy, iw - 4, 6);
    ctx.fillRect(ix + 2, iy + ih * 0.78, iw - 4, 6);
    if (M.bowl === "freezer" && !MV.bowlFly && !(drag && drag.k === "bowl")) { const p = bowlFzPt(); drawBowl(p.x, p.y, fzScale(), true); }
    // Frost in the corners.
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(ix + 6 + hash(i, 6) * (iw - 12), iy + 6 + hash(i, 8) * 16, 2 + hash(i, 9) * 2, 0, TAU); ctx.fill(); }
    // The glass door, hinged on the left; open, it turns edge-on.
    const d = 1 - MV.door * 0.86, dw = f.w * d;
    rr(f.x, f.y, dw, f.h, 14);
    ctx.fillStyle = MV.door > 0.5 ? "#E7EDF3" : "rgba(220,240,255,0.28)"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    if (MV.door < 0.5) {
      ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x + 18, f.y + 30); ctx.lineTo(f.x + 34, f.y + 14); ctx.stroke(); ctx.lineCap = "butt";
      rr(f.x + dw - 18, f.y + f.h * 0.3, 8, f.h * 0.22, 4); fillStroke("#C9D3DE", 2);
    }
    rr(f.x + 6, f.y + f.h - 22, f.w - 12, 14, 4); fillStroke("#C9D3DE", 2);
    if (MV.fzGlow > 0) { ctx.save(); ctx.globalAlpha = MV.fzGlow; rr(f.x - 6, f.y - 6, f.w + 12, f.h + 12, 18); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
    void t;
  }
  // A steel ice cream tub seen from the front and a little above; full, the ice cream is heaped in it.
  function drawMakeTub(x, y, s, fill, f) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const lw = LW / s * Math.min(1.2, s);
    ctx.beginPath(); ctx.moveTo(-52, -24); ctx.lineTo(52, -24); ctx.lineTo(44, 26); ctx.lineTo(-44, 26); ctx.closePath(); fillStroke("#C9D3DE", lw);
    rr(-52, -32, 104, 16, 6); fillStroke("#E3E9F0", lw);
    ctx.beginPath(); ctx.ellipse(0, -24, 46, 6, 0, 0, TAU); ctx.fillStyle = "#5E6E86"; ctx.fill();
    if (fill > 0 && f >= 0) {
      const F = FLAVORS[f];
      ctx.beginPath(); ctx.ellipse(0, -24, 46, 6 + 18 * fill, 0, Math.PI, TAU); ctx.closePath(); fillStroke(F.hex, lw);
      ctx.strokeStyle = F.dark; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(-22 + k * 22, -28 - 6 * fill, 8, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.lineCap = "butt";
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(-38, -14, 6, 32);
    ctx.restore();
  }
  function drawMakeRoom() {
    const v = vis(), wy = L.z.my - 10;
    ctx.fillStyle = "#EAF6FC"; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, wy - v.y0);
    ctx.strokeStyle = "#D2E9F5"; ctx.lineWidth = 2;
    for (let y = Math.floor(v.y0 / 40) * 40; y < wy; y += 40) { ctx.beginPath(); ctx.moveTo(v.x0, y); ctx.lineTo(v.x1, y); ctx.stroke(); }
    for (let x = Math.floor(v.x0 / 40) * 40; x < v.x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, v.y0); ctx.lineTo(x, wy); ctx.stroke(); }
    ctx.fillStyle = "#F3EEE6"; ctx.fillRect(v.x0, wy, v.x1 - v.x0, v.y1 - wy);
    ctx.fillStyle = "#E8E0D4";
    for (let y = wy + 40; y < v.y1; y += 36) ctx.fillRect(v.x0, y, v.x1 - v.x0, 2);
    ctx.beginPath(); ctx.moveTo(v.x0, wy); ctx.lineTo(v.x1, wy); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  }
  function drawMake(t) {
    drawMakeRoom();
    drawFreezer(t);
    drawMachine(L.z.mx, L.z.my, L.z.k, false, t);
    if (MV.bowlFly && !(drag && drag.k === "bowl")) drawBowl(MV.bowlFly.x, MV.bowlFly.y, MV.bowlFly.s, true);
    // Spooning: dollops of ice cream go from the bowl to the tub.
    const tubFill = M.tub === "full" ? 1 : MV.out;
    drawMakeTub(L.z.tub.x, L.z.tub.y, L.z.ts, tubFill, M.flavor);
    if (MV.out > 0 && MV.out < 1 && M.flavor >= 0) {
      const ph = (MV.out * 3) % 1, a = { x: L.z.mx, y: L.z.my - (BASE_H + BOWL_H) * L.z.k }, b = { x: L.z.tub.x, y: L.z.tub.y - 30 * L.z.ts };
      drawBall(lerp(a.x, b.x, ph), lerp(a.y, b.y, ph) - Math.sin(ph * Math.PI) * 80, R * 0.7, M.flavor, 5, LW);
    }
    const fs = fpx(14);
    FLAVORS.forEach((f, i) => {
      const p = L.z.fl[i];
      card(f.name, p.x, p.y + 30 * L.z.ts + fs * 0.4, fs, 200);
    });
    MAKE_TOOLS.forEach((id) => { if (!T[id].held && !(drag && drag.k === "tool" && drag.id === id)) drawTool(id, T[id]); });
    drawStreams(t, ["jug", "carton"]);
    MAKE_TOOLS.forEach((id) => { if (T[id].held || (drag && drag.k === "tool" && drag.id === id)) drawTool(id, T[id]); });
    if (drag && drag.k === "bowl" && MV.bowlFly) drawBowl(MV.bowlFly.x, MV.bowlFly.y, MV.bowlFly.s, true);
  }

  // =====================================================================================================
  // Drawing the customer and the bubble
  // =====================================================================================================
  function drawHair(l, r, back) {
    ctx.fillStyle = l.hc;
    const st = l.style;
    if (back) {
      if (st === "long") { rr(-r - 4, -r * 0.4, r * 2 + 8, r * 1.9, r * 0.6); fillStroke(l.hc); }
      if (st === "ponytail") { ctx.beginPath(); ctx.ellipse(r * 0.9, r * 0.1, r * 0.35, r * 0.8, -0.4, 0, TAU); fillStroke(l.hc); }
      if (st === "pigtails") { circle(-r - 4, r * 0.1, r * 0.38, l.hc); circle(r + 4, r * 0.1, r * 0.38, l.hc); }
      if (st === "bun") circle(0, -r - 6, r * 0.42, l.hc);
      return;
    }
    if (st === "bald") return;
    if (st === "curly") {
      for (let k = 0; k < 7; k++) { const a = Math.PI + 0.1 + k * (Math.PI - 0.2) / 6; circle(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.34, l.hc, 1.8); }
      return;
    }
    if (st === "spiky") {
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.2);
      for (let k = 0; k <= 6; k++) { const x = -r + k * (2 * r / 6); ctx.lineTo(x, k % 2 ? -r * 1.35 : -r * 0.7); }
      ctx.lineTo(r, -r * 0.2); ctx.closePath(); fillStroke(l.hc); return;
    }
    ctx.beginPath(); ctx.arc(0, 0, r + 1, Math.PI * 1.02, Math.PI * 1.98); ctx.quadraticCurveTo(r * 0.2, -r * 0.45, -r, -r * 0.1); ctx.closePath(); fillStroke(l.hc);
  }
  function drawFace(l, r, t, eyeC) {
    const happy = C.happy > 0 || C.phase === "take" || C.phase === "out";
    const blink = (t % 3.7) < 0.12;
    ctx.strokeStyle = eyeC || INK; ctx.fillStyle = eyeC || INK; ctx.lineWidth = 2.6; ctx.lineCap = "round";
    [-1, 1].forEach((s) => {
      if (happy || blink) { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.02, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.05, r * 0.1, 0, TAU); ctx.fill(); }
    });
    ctx.fillStyle = "rgba(255,120,140,0.35)"; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * r * 0.58, r * 0.25, r * 0.15, 0, TAU); ctx.fill(); });
    const talking = t < C.talk;
    ctx.strokeStyle = INK; ctx.fillStyle = "#8C2F3A";
    if (talking) { const o = 0.5 + 0.5 * Math.abs(Math.sin(t * 14)); ctx.beginPath(); ctx.ellipse(0, r * 0.38, r * 0.16, r * 0.1 + o * r * 0.1, 0, 0, TAU); ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); }
    else { ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, r * 0.2, happy ? r * 0.3 : r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.lineCap = "butt";
    if (l.glasses && l.kind === "person") {
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * r * 0.36, -r * 0.04, r * 0.24, 0, TAU); ctx.stroke(); });
      ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.06); ctx.lineTo(r * 0.12, -r * 0.06); ctx.stroke();
    }
  }
  function drawHead(l, r, t) {
    if (l.kind === "person") {
      drawHair(l, r, true);
      circle(0, 0, r, l.skin);
      drawHair(l, r, false);
      if (l.style === "bald") { ctx.beginPath(); ctx.arc(0, r * 0.15, r * 0.82, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineTo(-r * 0.7, r * 0.3); ctx.closePath(); ctx.fillStyle = "rgba(120,90,70,0.25)"; ctx.fill(); }
      drawFace(l, r, t);
      return;
    }
    const A = { bear: ["#A9713F", "#E6C49A"], rabbit: ["#F2F0EE", "#FFC9D6"], cat: ["#F4A04C", "#FFE2BF"], panda: ["#FAFAFA", "#2B2B2B"] }[l.kind];
    if (l.kind === "bear" || l.kind === "panda") { [-1, 1].forEach((s) => circle(s * r * 0.72, -r * 0.72, r * 0.34, l.kind === "panda" ? "#2B2B2B" : A[0])); }
    if (l.kind === "rabbit") [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * r * 0.38, -r * 1.35, r * 0.26, r * 0.7, s * 0.12, 0, TAU); fillStroke(A[0]); ctx.beginPath(); ctx.ellipse(s * r * 0.38, -r * 1.3, r * 0.12, r * 0.5, s * 0.12, 0, TAU); ctx.fillStyle = A[1]; ctx.fill(); });
    if (l.kind === "cat") [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * r * 0.9, -r * 0.2); ctx.lineTo(s * r * 0.7, -r * 1.15); ctx.lineTo(s * r * 0.15, -r * 0.8); ctx.closePath(); fillStroke(A[0]); });
    circle(0, 0, r, A[0]);
    if (l.kind === "panda") [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * r * 0.36, -r * 0.04, r * 0.22, r * 0.28, s * 0.5, 0, TAU); ctx.fillStyle = "#2B2B2B"; ctx.fill(); });
    if (l.kind === "bear" || l.kind === "cat") { ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.42, r * 0.3, 0, 0, TAU); ctx.fillStyle = A[1]; ctx.fill(); }
    drawFace(l, r, t, l.kind === "panda" ? "#FFFFFF" : INK);
    ctx.beginPath(); ctx.ellipse(0, r * 0.16, r * 0.14, r * 0.09, 0, 0, TAU); ctx.fillStyle = l.kind === "rabbit" ? "#FF8FAB" : "#2B2B2B"; ctx.fill();
    if (l.kind === "cat") { ctx.strokeStyle = INK; ctx.lineWidth = 1.4; [-1, 1].forEach((s) => { [0, 1].forEach((k) => { ctx.beginPath(); ctx.moveTo(s * r * 0.3, r * (0.25 + k * 0.12)); ctx.lineTo(s * r * 0.9, r * (0.15 + k * 0.22)); ctx.stroke(); }); }); }
  }
  function drawCustomer(t) {
    if (C.phase === "none" || !C.look) return;
    const l = C.look, kid = l.kid, r = kid ? 27 : 31;
    const bob = C.walk ? Math.abs(Math.sin(t * 7)) * 5 : 0;
    const base = L.counterY + 8, headY = base - (kid ? 88 : 126) - bob - C.hop;
    const sw = kid ? 74 : 96, shoulder = headY + r + (kid ? 6 : 10);
    ctx.save(); ctx.translate(C.x, 0);
    rr(-sw / 2, shoulder, sw, base - shoulder + 30, 22); fillStroke(l.shirt);
    ctx.beginPath(); ctx.moveTo(-12, shoulder + 1); ctx.quadraticCurveTo(0, shoulder + 14, 12, shoulder + 1); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    // Holding what he made: the arm comes up to it, and a lick (or a sip) now and then.
    if (C.hold) {
      const hx = -40, hy = L.counterY - (kid ? 22 : 34) - C.hop - bob;
      ctx.beginPath(); ctx.moveTo(-sw / 2 + 12, shoulder + 16); ctx.quadraticCurveTo(-sw / 2 - 10, hy + 34, hx, hy + 22);
      ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.lineCap = "round"; ctx.stroke(); ctx.strokeStyle = l.shirt; ctx.lineWidth = 11; ctx.stroke(); ctx.lineCap = "butt";
      const lick = C.phase === "out" ? Math.max(0, Math.sin(t * 2.4)) * 10 : 0;
      ctx.restore();
      drawItem(C.hold, C.x + hx, hy + 44 - lick, 0.62, 0);
      ctx.save(); ctx.translate(C.x, 0);
      circle(hx, hy + 22, 9, l.kind === "person" ? l.skin : ({ bear: "#A9713F", rabbit: "#F2F0EE", cat: "#F4A04C", panda: "#2B2B2B" }[l.kind]));
    } else if (C.phase === "order" && C.wave > 0) {
      const a = Math.sin(t * 10) * 0.4;
      ctx.save(); ctx.translate(sw / 2 - 6, shoulder + 10); ctx.rotate(-2.4 + a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 40); ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.lineCap = "round"; ctx.stroke(); ctx.strokeStyle = l.shirt; ctx.lineWidth = 11; ctx.stroke(); ctx.lineCap = "butt";
      circle(0, 46, 9, l.kind === "person" ? l.skin : "#FFFFFF");
      ctx.restore();
    }
    ctx.translate(0, headY);
    ctx.rotate(C.walk ? Math.sin(t * 7) * 0.04 : 0);
    drawHead(l, r, t);
    ctx.restore();
  }
  // The speech bubble: the order as a picture with green ticks for what already matches, and the words. A
  // passing line ("Mint chip? I wanted mango!") replaces the words for a few seconds.
  function drawBubble(t) {
    if (C.phase === "none" || C.phase === "in" || !C.look) return;
    const passing = t < C.sayUntil;
    if (C.phase !== "order" && !passing) return;
    const bb = L.bubble, fs = fpx(L.row ? 17 : 16), lh = fs * 1.15, pad = 10;
    const showPic = C.phase === "order";
    const o = C.order;
    const maxH = L.counterY + 24 - bb.y;
    let k = L.row ? 0.62 : 0.58;
    const ps = picSize(o);
    let picH = showPic ? ps.h * k + 10 : 0;
    const textW0 = bb.side && showPic ? bb.w - ps.w * k - 30 - pad * 3 : bb.w - pad * 2;
    let lines = wrap(passing ? C.say : orderText(o), textW0, fs);
    let textH = lines.length * lh;
    // A tall order (a sundae with cream, a milkshake) shrinks its picture to fit above the counter.
    const fitH = bb.side ? maxH - pad * 2 : maxH - textH - pad * 2 - 4;
    if (showPic && picH > fitH) { k *= fitH / picH; picH = ps.h * k + 10; }
    const picW = showPic ? ps.w * k + 30 : 0;
    const textW = bb.side && showPic ? bb.w - picW - pad * 3 : bb.w - pad * 2;
    if (textW !== textW0) { lines = wrap(passing ? C.say : orderText(o), textW, fs); textH = lines.length * lh; }
    const h = Math.min(maxH, bb.side ? Math.max(picH, textH) + pad * 2 : picH + textH + pad * 2 + (showPic ? 4 : 0));
    const x = bb.x, y = bb.y, w = bb.w;
    const sc = 0.85 + 0.15 * ease(bubPop);
    ctx.save();
    const ax = x + w / 2, ay = y + h / 2;
    ctx.translate(ax, ay); ctx.scale(sc, sc); ctx.translate(-ax, -ay);
    // The tail points at the customer's head.
    const kid = C.look.kid, hy = L.counterY + 8 - (kid ? 88 : 126) + 10;
    const tx = bb.side ? x : x + w, tyy = Math.min(y + h - 24, Math.max(y + 24, hy));
    rr(x, y, w, h, 16);
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.beginPath();
    if (bb.side) { ctx.moveTo(tx + 2, tyy - 12); ctx.lineTo(C.x + 36, hy); ctx.lineTo(tx + 2, tyy + 12); }
    else { ctx.moveTo(tx - 2, tyy - 12); ctx.lineTo(C.x - 36, hy); ctx.lineTo(tx - 2, tyy + 12); }
    ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    rr(x, y, w, h, 16); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = "#FFFFFF"; ctx.beginPath();
    if (bb.side) ctx.rect(tx - 1, tyy - 11, 4, 22); else ctx.rect(tx - 3, tyy - 11, 4, 22);
    ctx.fill();
    if (showPic) {
      const m = o.menu === "any" ? null : matchInfo(o, B);
      const px = bb.side ? x + pad + picW / 2 : x + w / 2, py = bb.side ? y + h / 2 + picH / 2 - 6 : y + pad + picH - 4;
      drawOrderPic(o, px, py, k, m);
    }
    const tx0 = bb.side && showPic ? x + picW + pad * 2 : x + w / 2;
    const ty0 = bb.side ? y + h / 2 - textH / 2 + lh / 2 : y + pad + picH + (showPic ? 4 : 0) + lh / 2;
    lines.forEach((s, i) => text(s, tx0, ty0 + i * lh, fs, INK, 700, bb.side && showPic ? "left" : "center"));
    ctx.restore();
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  // The next thing to do: the part to ring, the instruction, and the step's key (for "known" and the ghost).
  function want() {
    if (Z.moving) return null;
    if (Z.on) return wantMake();
    if (C.phase !== "order" || !C.order || V.fly || V.tubFly) return null;
    const o = C.order, any = o.menu === "any";
    if (!B.holder || (!any && B.holder !== o.holder && !B.scoops.length && !B.milk)) {
      if (any) return { part: "stacks", key: "holder", line: "Pick a cone, a cup, a sundae dish or a steel cup." };
      return { part: STACK_OF[o.holder], key: "holder", line: HOLD_LINE[o.holder] };
    }
    const steel = B.holder === "steel";
    if (steel && B.at === "mixer") return B.mix < 1 ? null : { part: "steel", key: "pour", line: "Pour the milkshake into the glass." };
    if (!steel || B.at === "spot") {
      if (any && !B.scoops.length) return { part: "tubs", key: "tub", line: "Scoop any ice cream you like." };
      const m = any ? null : matchInfo(o, B);
      if (m && m.missing.length && B.scoops.length < MAXS) { const f = m.missing[0]; return { part: "tub" + f, key: "tub", line: "Scoop the " + fname(f) + " ice cream." }; }
      if (steel) {
        if (!B.scoops.length) return { part: "tubs", key: "tub", line: "Scoop ice cream into the steel cup." };
        if (B.milk < 1) return { part: "milk", key: "milk", line: "Pour the milk into the steel cup." };
        return { part: "mixer", key: "mixer", line: "Put the steel cup on the mixer." };
      }
    }
    const word = WORD[MENU_OF[B.holder]];
    if (!any) {
      const t = o.tops.find((id) => B.tops[id] < 1);
      if (t) return { part: t, key: "top", line: TOP_BY[t].verb + " the " + word + "." };
    }
    return { part: "serve", key: "serve", line: "Give the " + word + " to the customer." };
  }
  function wantMake() {
    if (busy && !drag) return null;
    if (M.bowl !== "machine") return { part: "freezer", key: "bowl", line: "Take the frozen bowl out of the freezer." };
    if (M.tub === "full") return { part: "mtub", key: "carry", line: "Carry the tub to the shop." };
    if (M.churn >= 1) return { part: "bowl", key: "spoon", line: "Spoon the ice cream into the tub." };
    if (!M.on) return { part: "switch", key: "switch", line: "Switch on the ice cream maker." };
    if (M.milk < 1) return { part: "jug", key: "ing", line: "Pour the milk into the ice cream maker." };
    if (M.cream < 1) return { part: "carton", key: "ing", line: "Pour the cream into the ice cream maker." };
    if (M.sugar < 1) return { part: "sugar", key: "ing", line: "Tip the sugar into the ice cream maker." };
    if (M.flavor < 0) return { part: "flavors", key: "flavor", line: "Pick a flavor and put it in the ice cream maker." };
    return { part: null, key: "churn", line: "The paddle stirs the ice cream while it freezes." };
  }
  function partPt(part) {
    if (Z.on) {
      const z = L.z;
      if (part === "freezer") return { x: z.fz.x + z.fz.w / 2, y: z.fz.y + z.fz.h / 2, r: Math.max(z.fz.w, z.fz.h) / 2 };
      if (part === "switch") { const s = switchPt(); return { x: s.x, y: s.y, r: 30 * z.k }; }
      if (part === "mtub") return { x: z.tub.x, y: z.tub.y - 4, r: 60 * z.ts };
      if (part === "bowl" || part === "machine") return { x: z.mx, y: z.my - (BASE_H + BOWL_H / 2) * z.k, r: 80 * z.k };
      if (z.ing[part]) return { x: z.ing[part].x, y: z.ing[part].y - 4, r: 40 * z.ts };
      if (/^fl\d$/.test(part)) { const p = z.fl[+part.slice(2)]; return { x: p.x, y: p.y, r: 36 * z.ts }; }
      return null;
    }
    if (L.stacks[part]) return { x: L.stacks[part].x, y: L.stacks[part].y, r: 42 };
    if (/^tub\d$/.test(part)) { const p = tubPt(+part.slice(3)); return { x: p.x, y: p.y, r: 50 }; }
    if (part === "tubs") return { x: L.cab.x + L.cab.w / 2, y: L.cab.y + L.cab.h / 2, r: 60 };
    if (part === "stacks") return { x: L.stacks.cups.x, y: L.stacks.cups.y, r: 60 };
    if (L.tools[part]) return { x: L.tools[part].x, y: L.tools[part].y - 4, r: 40 };
    if (part === "milk") return { x: L.milk.x, y: L.milk.y - 2, r: 40 };
    if (part === "mixer") return { x: L.mixer.x, y: L.mixer.y - 90, r: 60 };
    if (part === "steel") { const s = mixerCupPt(); return { x: s.x, y: s.y - 42, r: 48 }; }
    if (part === "churn") return { x: L.churn.x, y: L.churn.y, r: 46 };
    if (part === "serve") { const top = icTop(); return { x: L.holder.x, y: (top.y + L.holder.y) / 2, r: 60 }; }
    if (part === "customer") return { x: C.x, y: L.counterY - 80, r: 60 };
    return null;
  }
  function ringStroke() { ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke(); }
  function drawRing(t) {
    const w = want();
    if (!w || !w.part || locked() || drag || (busy && !Z.on)) return;
    const g = 4 + (0.5 + 0.5 * Math.sin(t * 4)) * 4;
    const ringCircle = (p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + g, 0, TAU); ringStroke(); };
    if (/^tub\d$/.test(w.part)) {
      const p = tubPt(+w.part.slice(3));
      rr(p.x - L.tubW / 2 - g, p.y - L.tubH / 2 - g, L.tubW + g * 2, L.tubH + g * 2, 10 + g); ringStroke();
    } else if (w.part === "tubs") {
      const c = L.cab; rr(c.x - g, c.y - g, c.w + g * 2, c.h + g * 2, 14 + g); ringStroke();
    } else if (w.part === "stacks") {
      STACK_IDS.forEach((id) => ringCircle(Object.assign({}, partPt(id), { r: 36 })));
    } else if (w.part === "flavors") {
      FLAVORS.forEach((f, i) => ringCircle(partPt("fl" + i)));
    } else if (w.part === "serve") {
      const top = icTop(), hgt = L.holder.y - top.y + 16;
      rr(L.holder.x - 52 - g, top.y - 10 - g, 104 + g * 2, hgt + g * 2, 30); ringStroke();
    } else if (w.part === "freezer") {
      const f = L.z.fz; rr(f.x - g, f.y - g, f.w + g * 2, f.h + g * 2, 16 + g); ringStroke();
    } else {
      const p = partPt(w.part);
      if (p) ringCircle(p);
    }
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = null;
  // A new instruction pops up only for a step he hasn't done twice yet; a known step is shown by the ring alone.
  function updateCoach() {
    if (drag) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line || isKnown(w.key)) { coach.busy(); return; }
    coach.step(line);
    const p = w.part && partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); } else coach.avoid();
  }
  // The ghost hand shows a tap first and the real move (a drag) after that. When it shows, so do the words.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag || busy || Z.moving) return null;
      const w = want();
      if (!w || !w.part) return null;
      const key = w.key;
      const P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const pp = w.part === "stacks" ? partPt("cones") : w.part === "tubs" ? partPt("tub0") : w.part === "flavors" ? partPt("fl0") : partPt(w.part);
      if (!pp) return null;
      if (ghost.shown(key) < 1 || key === "switch" || key === "spoon" || key === "carry") return { pts: [P(pp.x, pp.y)], tap: true, key };
      if (Z.on) {
        if (key === "bowl") { const b = bowlMcPt(); return { pts: [P(pp.x, pp.y), P(b.x, b.y - 40 * L.z.k)], dur: 1600, key }; }
        const s = spoutPt();
        return { pts: [P(pp.x, pp.y), P(s.x - 30, s.y - 30)], dur: 1600, key };
      }
      const top = icTop();
      if (key === "holder") return { pts: [P(pp.x, pp.y), P(L.holder.x, L.holder.y - 40)], dur: 1500, key };
      if (key === "tub") return { pts: [P(pp.x, pp.y), P(pp.x + 10, pp.y + 4), P(L.holder.x, top.y - 20)], dur: 2000, key };
      if (key === "serve") return { pts: [P(L.holder.x, L.holder.y - 50), P(C.x, L.counterY - 60)], dur: 1600, key };
      if (key === "mixer") { const c = mixerCupPt(); return { pts: [P(L.holder.x, L.holder.y - 40), P(c.x, c.y - 40)], dur: 1600, key }; }
      if (key === "pour") return { pts: [P(pp.x, pp.y), P(L.holder.x - 40, L.holder.y + GLASS_RIM - 30)], dur: 1600, key };
      const at = pourAt(w.part === "milk" ? "milk" : TOP_IDS.includes(w.part) && w.part !== "cherry" ? w.part : "sauce");
      return { pts: [P(pp.x, pp.y), P(at.x, at.y)], dur: 1600, key };
    },
    onShow: (p, on) => { if (on) { const w = want(); if (w && w.line) coach.say(w.line, 4); } }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  const inRect = (w, x, y, hw, hh) => Math.abs(w.x - x) <= hw && Math.abs(w.y - y) <= hh;
  // The part under a press (client px). Every target is at least a fingertip wide.
  function hitPart(cx, cy) {
    if (locked() || Z.moving) return null;
    const w = wpt(cx, cy), minR = 30 / vs;
    let best = null, bd = Infinity;
    const cand = (id, x, y, r) => { const d = Math.hypot(w.x - x, w.y - y); if (d <= Math.max(r, minR) && d - r * 0.3 < bd) { bd = d - r * 0.3; best = id; } };
    if (Z.on) {
      const z = L.z, s = switchPt();
      if (inRect(w, s.x, s.y, 26 * z.k, 22 * z.k)) return "switch";
      FLAVORS.forEach((f, i) => { if (!T["fl" + i].out) cand("fl" + i, z.fl[i].x, z.fl[i].y, 34 * z.ts); });
      ["jug", "carton", "sugar"].forEach((id) => { if (!T[id].out) cand(id, z.ing[id].x, z.ing[id].y, 34 * z.ts); });
      cand("mtub", z.tub.x, z.tub.y, 52 * z.ts);
      if (best) return best;
      if (w.x >= z.fz.x && w.x <= z.fz.x + z.fz.w && w.y >= z.fz.y && w.y <= z.fz.y + z.fz.h) return "freezer";
      if (inRect(w, z.mx, z.my - (BASE_H + BOWL_H / 2 + 10) * z.k, 76 * z.k, (BOWL_H / 2 + 34) * z.k)) return M.bowl === "machine" ? "bowl" : "machine";
      if (inRect(w, z.mx, z.my - BASE_H / 2 * z.k, 82 * z.k, BASE_H / 2 * z.k)) return "machine";
      return null;
    }
    if (B.holder && !busy) {
      const top = L.holder.y + peakY(B) - (B.tops.cream ? creamH(B.tops.cream) : 0);
      if (Math.abs(w.x - L.holder.x) <= 50 && w.y >= top - 16 && w.y <= L.holder.y + 10) return B.holder === "steel" && B.at === "spot" ? "steel" : "ic";
    }
    if (B.holder === "steel" && B.at === "mixer" && !busy) { const c = mixerCupPt(); if (inRect(w, c.x, c.y - 44, 40, 54)) return "steel"; }
    if (S.home && !busy) cand("scoop", S.x + 14, S.y - 12, 34);
    const tub = tubAt(w.x, w.y);
    if (tub >= 0) return "tub" + tub;
    // The name cards under the tubs count as the tub.
    const crd = L.tubs.findIndex(([x, y]) => Math.abs(w.x - x) <= L.tubW / 2 && w.y > y && w.y < y + L.tubH / 2 + fpx(15) * 1.3);
    if (crd >= 0) return "tub" + crd;
    STACK_IDS.forEach((id) => cand(id, L.stacks[id].x, L.stacks[id].y, 34));
    ["cream", "sauce", "sprinkles", "milk"].forEach((id) => { if (!T[id].out) cand(id, T[id].x, T[id].y, 36); });
    cand("cherry", L.tools.cherry.x, L.tools.cherry.y - 4, 36);
    cand("scoop", L.well.x, L.well.y, 34);
    cand("churn", L.churn.x, L.churn.y, 46);
    if (best) return best;
    if (inRect(w, L.mixer.x, L.mixer.y - 90, 50, 92)) return "mixer";
    if (!B.holder && inRect(w, L.holder.x, L.holder.y - 30, 56, 50)) return "holder";
    if (C.phase === "order") {
      if (inRect(w, C.x, L.counterY - 80, 56, 90)) return "customer";
      if (w.x >= L.bubble.x && w.x <= L.bubble.x + L.bubble.w && w.y >= L.bubble.y && w.y <= L.counterY - 20) return "customer";
    }
    return null;
  }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    ghost.poke();
  }
  // A tap: each part does its own one motion.
  function doTap(part) {
    if (locked() || part == null) return;
    if (Z.on) { tapMake(part); return; }
    const w = want();
    if (KIND_OF[part]) placeHolder(KIND_OF[part]);
    else if (/^tub\d$/.test(part)) scoopTap(+part.slice(3));
    else if (part === "scoop") {
      if (w && /^tub\d$/.test(w.part)) scoopTap(+w.part.slice(3));
      else { wobble("scoop"); tag(NAMES.scoop, S.x, S.y - 30); if (w && w.part === "tubs") hint(); }
    } else if (part === "cherry") cherryTap();
    else if (POUR[part]) pourTap(part);
    else if (part === "mixer") mixerTap();
    else if (part === "steel") { if (B.at === "spot") toMixer(); else if (B.mix >= 1) pourShake(); else tag(NAMES.mixer, L.mixer.x, L.mixer.y - 180); }
    else if (part === "churn") zoomIn();
    else if (part === "ic") {
      if (w && w.part === "serve") serve();
      else { V.squish = 1; snd.boing(); if (w) hint(); }
    } else if (part === "holder") { V.holderGlow = 1; tag(NAMES.holder, L.holder.x, L.holder.y - 60); hint(); }
    else if (part === "customer") {
      if (w && w.part === "serve") serve();
      else { say(orderText(C.order), 4); C.wave = 1; }
    }
  }
  function tapMake(part) {
    if (part === "freezer") { if (M.bowl === "freezer") takeBowl(); else { tag(NAMES.freezer, L.z.fz.x + L.z.fz.w / 2, L.z.fz.y + 30); hint(); } }
    else if (part === "switch") switchTap();
    else if (POUR[part]) pourTap(part);
    else if (/^fl\d$/.test(part)) flavorIn(+part.slice(2));
    else if (part === "mtub") { if (M.tub === "full") carryTub(); else if (M.churn >= 1) spoonOut(); else { tag(NAMES.mtub, L.z.tub.x, L.z.tub.y - 40); hint(); } }
    else machineTap(part);
  }

  // Drags: the part follows his finger, and the real thing happens while he does it. One finger owns the drag;
  // other fingers are ignored until it lifts. A press held still and let go in place counts as that part's tap.
  const SLOP = 12;
  let skipTap = false;
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    // Touching a tub brings the scoop to his finger at once, so a finger held still on a tub digs.
    down: (part, e, s) => {
      if (drag || locked() || busy || Z.on || !part || !/^tub\d$/.test(part)) return;
      if (!canScoop()) return;
      const w = wpt(s.x0, s.y0);
      if (S.tw) { cancel(S.tw); S.tw = null; }
      drag = { k: "scoop", pid: e.pointerId, far: 0 };
      S.home = false; S.x = w.x; S.y = w.y;
      if (S.f >= 0 && S.f !== tubAt(w.x, w.y)) { S.ball = 0; S.f = -1; }
      ghost.learned("tub");
    },
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null) return;
      const answered = startDrag(part, s);
      if (!drag && !answered) drag = { k: "hold", part };
      if (drag) { drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy); }
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const w = wpt(s.x, s.y);
      if (drag.k === "scoop") { S.x = w.x; S.y = w.y; }
      else if (drag.k === "hc") { V.hc.x = w.x + drag.ox; V.hc.y = w.y + drag.oy; }
      else if (drag.k === "tool") { const tl = T[drag.id]; tl.x = w.x + drag.ox; tl.y = w.y + drag.oy; }
      else if (drag.k === "ic") { V.ic.dx = w.x - drag.x0; V.ic.dy = w.y - drag.y0; }
      else if (drag.k === "steel") { V.steel.x = w.x + drag.ox; V.steel.y = w.y + drag.oy; }
      else if (drag.k === "bowl") { MV.bowlFly.x = w.x + drag.ox; MV.bowlFly.y = w.y + drag.oy; }
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const w = wpt(s.x, s.y), still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (locked()) { placeAll(); return; }
      if (d.k === "hold") { if (still) doTap(d.part); }
      else if (d.k === "scoop") { skipTap = s.tap; scoopRelease(still, s.tap); }
      else if (d.k === "hc") {
        const hc = V.hc;
        V.hc = null;
        if (still || Math.hypot(hc.x - L.holder.x, hc.y - L.holder.y) < 130) placeHolder(hc.kind, { x: hc.x, y: hc.y });
        else hint();
      } else if (d.k === "tool") toolRelease(d, still);
      else if (d.k === "ic") {
        if (still) { V.ic.dx = 0; V.ic.dy = 0; doTap("ic"); }
        else if (w.y < L.counterY + 40 && C.phase === "order") serve();
        else returnIc();
      } else if (d.k === "steel") steelRelease(d, still);
      else if (d.k === "bowl") {
        const b = bowlMcPt(), f = MV.bowlFly;
        if (still || Math.hypot(f.x - b.x, f.y - b.y) < 140 * L.z.k) { MV.bowlFly = null; takeBowl({ x: f.x, y: f.y, s: f.s }); }
        else {
          const a = { x: f.x, y: f.y }, h = bowlFzPt();
          tween(0.4, (p) => { const e2 = ease(p); MV.bowlFly.x = lerp(a.x, h.x, e2); MV.bowlFly.y = lerp(a.y, h.y, e2); MV.bowlFly.s = lerp(f.s, fzScale(), e2); }, () => {
            MV.bowlFly = null; M.bowl = "freezer"; tween(0.3, (p) => { MV.door = 1 - ease(p); }); hint();
          });
        }
      }
    },
    tap: (part) => {
      if (skipTap) { skipTap = false; return; }
      if (!drag) doTap(part);
    }
  });
  function toolRelease(d, still) {
    const tl = T[d.id];
    tl.held = false;
    if (d.id === "cherry") {
      if (still || (topsReady() && (Math.hypot(tl.x - icTop().x, tl.y - icTop().y) < 90 || nearCone(tl.x, tl.y)))) {
        if (readyFor("cherry")) cherryOn({ x: tl.x, y: tl.y }); else { tl.out = false; notReady("cherry"); }
      } else tl.out = false;
      return;
    }
    if (/^fl\d$/.test(d.id)) {
      const sp = spoutPt();
      if (still || Math.hypot(tl.x - sp.x, tl.y - sp.y) < 110 * L.z.ts) flavorIn(+d.id.slice(2), { x: tl.x, y: tl.y });
      else toolHome(d.id);
      return;
    }
    if (still && amtOf(d.id) < 1) { tl.out = false; tl.ang = 0; const h = homeOf(d.id); tl.x = h.x; tl.y = h.y; pourTap(d.id); return; }
    if (tl.near && amtOf(d.id) < 1) { tl.near = false; notReady(d.id); }
    // Some poured already: it finishes by itself as the tool goes back.
    const a0 = amtOf(d.id);
    if (a0 > 0.15 && a0 < 1 && readyFor(d.id)) tween(0.4, (p) => { const v = lerp(a0, 0.999, p); if (amtOf(d.id) < v) addAmt(d.id, v - amtOf(d.id)); }, () => addAmt(d.id, 1));
    toolHome(d.id);
  }
  function steelRelease(d, still) {
    const s = V.steel;
    if (d.from === "spot") {
      const c = mixerCupPt();
      if (still || Math.hypot(s.x - c.x, s.y - c.y) < 110) { V.steel = null; toMixer({ x: s.x, y: s.y }); return; }
      const a = { x: s.x, y: s.y };
      tween(0.3, (p) => { if (!V.steel) return; V.steel.x = lerp(a.x, L.holder.x, ease(p)); V.steel.y = lerp(a.y, L.holder.y, ease(p)); }, () => { V.steel = null; hint(); });
      return;
    }
    // From the mixer: poured enough, it finishes by itself; otherwise the cup goes back onto the mixer.
    if (B.at === "glass") return;
    if (still || B.pour > 0.15) { pourShake(); return; }
    const a = { x: s.x, y: s.y, ang: s.ang || 0 }, c = mixerCupPt();
    tween(0.35, (p) => { if (!V.steel) return; const e = ease(p); V.steel.x = lerp(a.x, c.x, e); V.steel.y = lerp(a.y, c.y, e); V.steel.ang = lerp(a.ang, 0, e); }, () => { V.steel = null; hint(); });
  }
  // Each frame while he holds the steel cup from the mixer over the glass: it tips and pours.
  function stepSteel(dt) {
    if (!drag || drag.k !== "steel" || drag.from !== "mixer" || !V.steel || B.at !== "mixer") return;
    // Anywhere near the glass and above its foot counts as over it.
    const at = steelPourAt(), over = Math.abs(V.steel.x - at.x) < 90 && V.steel.y > at.y - 120 && V.steel.y < L.holder.y + 10;
    V.steel.ang += ((over ? STEEL_ANG : 0) - (V.steel.ang || 0)) * Math.min(1, dt * 10);
    if (over && Math.abs(V.steel.ang - STEEL_ANG) < 0.6) {
      B.pour = Math.min(1, B.pour + dt * 0.8);
      shakeStream();
      if (B.pour >= 1) { drag = null; press.cancel(); finishPour(); }
    }
  }
  // Starts the drag for a part (sets drag), or answers at once (true).
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0);
    if (Z.on) {
      if (part === "freezer" && M.bowl === "freezer" && !busy) {
        const p = bowlFzPt();
        MV.door = 1;
        MV.bowlFly = { x: p.x, y: p.y, s: fzScale() * 1.2 };
        drag = { k: "bowl", ox: p.x - w0.x, oy: p.y - w0.y };
        return false;
      }
      if ((POUR[part] || /^fl\d$/.test(part)) && !busy) return grabTool(part, w, w0);
      return false;
    }
    if (KIND_OF[part] && !busy && !V.hc) {
      const kind = KIND_OF[part];
      if (B.holder && (B.scoops.length || B.milk > 0)) { placeHolder(kind); return true; }
      const h = L.stacks[part];
      drag = { k: "hc", ox: h.x - w0.x, oy: h.y + 30 - w0.y };
      V.hc = { kind, x: w.x + drag.ox, y: w.y + drag.oy };
      ghost.learned("holder");
    } else if (part === "scoop" && !busy) {
      if (S.tw) { cancel(S.tw); S.tw = null; }
      drag = { k: "scoop" }; S.home = false; S.x = w.x; S.y = w.y;
    } else if ((POUR[part] || part === "cherry") && !busy) {
      return grabTool(part, w, w0);
    } else if (part === "steel" && !busy) {
      if (B.at === "spot") { const a = { x: L.holder.x, y: L.holder.y }; V.steel = { x: a.x, y: a.y, ang: 0 }; drag = { k: "steel", from: "spot", ox: a.x - w0.x, oy: a.y - w0.y }; }
      else if (B.at === "mixer" && B.mix >= 1) { const a = mixerCupPt(); V.steel = { x: a.x, y: a.y, ang: 0 }; drag = { k: "steel", from: "mixer", ox: a.x - w0.x, oy: a.y - w0.y }; }
      else { tag(NAMES.mixer, L.mixer.x, L.mixer.y - 180); return true; }
    } else if (part === "ic" && !busy && B.holder) {
      drag = { k: "ic", x0: w0.x, y0: w0.y };
    }
    return false;
  }
  function grabTool(part, w, w0) {
    const tl = T[part];
    if (POUR[part] && amtOf(part) >= 1) { wobble(part); const h = homeOf(part); tag(nameOf(part), h.x, h.y - 40); return true; }
    if (part === "cherry" && B.tops.cherry >= 1) { wobble("cherry"); tag(NAMES.cherry, L.tools.cherry.x, L.tools.cherry.y - 30); return true; }
    if (tl.tw) { cancel(tl.tw); tl.tw = null; }
    if (part === "cherry") { tl.out = true; tl.x = w.x; tl.y = w.y - 14; drag = { k: "tool", id: part, ox: 0, oy: -14 }; }
    else {
      drag = { k: "tool", id: part, ox: tl.x - w0.x, oy: tl.y - w0.y - 10 }; tl.out = true; tl.x = w.x + drag.ox; tl.y = w.y + drag.oy;
      if (POUR[part]) tl.held = true;
    }
    ghost.learned(TOP_IDS.includes(part) ? "top" : part === "milk" ? "milk" : /^fl/.test(part) ? "flavor" : "ing");
    return false;
  }

  // =====================================================================================================
  // Panel and surprise
  // =====================================================================================================
  // New: what is being made starts again (the customer stays and still wants their order). In the ice cream
  // maker, the machine starts again with the bowl back in the freezer.
  function newTap() {
    if (locked() || busy || Z.moving) return;
    drag = null; press.cancel();
    if (Z.on) {
      M = freshM(); MV.misses = 0; MV.onMisses = 0; puff("frost", L.z.mx, L.z.my - 150 * L.z.k, 10);
    } else {
      if (B.holder) puff("spark", L.holder.x, L.holder.y - 60, 8);
      B = emptyBuild();
    }
    placeAll();
    lastWant = null; ghost.again(); saveSoon();
  }
  Toybox.bar($("bottom"), { onNew: newTap, onSurprise: surprise });

  // Takes turns between moments in the shop: sprinkles rain down over the shop, a dog peeks over the counter,
  // a bird flies past the window, and the customer does a happy hop. In the ice cream maker: sprinkles rain, or
  // the freezer puffs out a cloud of frost.
  let surpriseNext = 0, actor = null;
  function surprise() {
    if (locked() || Z.moving) return;
    let k = surpriseNext; surpriseNext = (surpriseNext + 1) % 4;
    if (Z.on) {
      if (k % 2 === 0) { for (let i = 0; i < 70; i++) puff("rain", 0, 0, 1); snd.shake(); }
      else { const f = L.z.fz; MV.door = 1; tween(0.6, null, () => { tween(0.4, (p) => { MV.door = 1 - ease(p); }); }); puff("frost", f.x + f.w / 2, f.y + f.h * 0.4, 30); snd.whoosh(); }
      return;
    }
    if (k === 3 && C.phase !== "order") { k = 0; }
    if (k === 0) { for (let i = 0; i < 70; i++) puff("rain", 0, 0, 1); snd.shake(); }
    else if (k === 1) { actor = { kind: "dog", t0: now(), dur: 4 }; snd.boing(); }
    else if (k === 2) { actor = { kind: "bird", t0: now(), dur: 5 }; snd.talk(); }
    else {
      C.happy = 1;
      tween(1.4, (p) => { C.hop = Math.abs(Math.sin(p * Math.PI * 3)) * 26 * (1 - p * 0.3); }, () => { C.hop = 0; C.happy = 0; });
      puff("heart", C.x, L.counterY - 150, 4); snd.boing();
    }
  }
  // The dog pops up beside the customer, behind the counter, so it is drawn before the cabinet.
  function drawDog(t) {
    if (!actor || actor.kind !== "dog") return;
    const p = (t - actor.t0) / actor.dur;
    if (p >= 1) { actor = null; return; }
    const up = p < 0.2 ? ease(p / 0.2) : p > 0.8 ? ease((1 - p) / 0.2) : 1;
    const x = clamp(C.phase === "none" ? L.custX : C.x + 96, 60, L.w - 60), y = L.counterY + 30 - up * 62;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 4) * 0.08);
    const col = "#C98A4B";
    [-1, 1].forEach((s) => { ctx.save(); ctx.translate(s * 20, -14); ctx.rotate(s * (0.3 + Math.sin(t * 9) * 0.15)); ctx.beginPath(); ctx.ellipse(0, 14, 9, 18, 0, 0, TAU); fillStroke("#8A5A2E"); ctx.restore(); });
    circle(0, 0, 24, col);
    ctx.beginPath(); ctx.ellipse(0, 10, 13, 10, 0, 0, TAU); ctx.fillStyle = "#F2D2A8"; ctx.fill();
    ctx.fillStyle = INK; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.arc(s * 9, -5, 3, 0, TAU); ctx.fill(); });
    ctx.beginPath(); ctx.ellipse(0, 5, 5, 3.5, 0, 0, TAU); ctx.fill();
    if (Math.sin(t * 6) > 0) { ctx.beginPath(); ctx.ellipse(3, 17, 4, 6, 0, 0, Math.PI); ctx.fillStyle = "#FF7F9B"; ctx.fill(); }
    ctx.restore();
  }
  function drawBird(t) {
    if (!actor || actor.kind !== "bird") return;
    const p = (t - actor.t0) / actor.dur;
    if (p >= 1) { actor = null; return; }
    const w = L.win;
    ctx.save(); rr(w.x, w.y, w.w, w.h, 10); ctx.clip();
    const sill = w.y + w.h - 18;
    let x, y, flap = Math.sin(t * 18);
    if (p < 0.35) { const q = p / 0.35; x = lerp(w.x - 20, w.x + w.w * 0.6, q); y = lerp(w.y + 20, sill, ease(q)); }
    else if (p < 0.7) { x = w.x + w.w * 0.6; y = sill; flap = 0; }
    else { const q = (p - 0.7) / 0.3; x = lerp(w.x + w.w * 0.6, w.x + w.w + 30, q); y = lerp(sill, w.y + 10, q); }
    ctx.translate(x, y);
    ellipse(0, 0, 12, 9, "#4DA3FF", 1.8);
    circle(10, -6, 6, "#4DA3FF", 1.8);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(12, -7, 1.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, -6); ctx.lineTo(21, -4); ctx.lineTo(15, -3); ctx.closePath(); ctx.fillStyle = "#FFB020"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-10, -2 - flap * 12); ctx.lineTo(4, -4); ctx.closePath(); fillStroke("#2F7FD8", 1.6);
    ctx.restore();
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now(), whirrT = 0;
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    stepScoop(dt); stepPours(dt, t); stepSteel(dt); stepMake(dt, t);
    if (V.spin && t > whirrT && !Z.on) { whirrT = t + 0.5; snd.whirr(); }
    V.squish = Math.max(0, V.squish - dt * 2.5);
    V.holderGlow = Math.max(0, V.holderGlow - dt * 0.8);
    MV.switchGlow = Math.max(0, MV.switchGlow - dt * 0.5);
    MV.fzGlow = Math.max(0, MV.fzGlow - dt * 0.6);
    V.dent = V.dent.map((v) => Math.max(0, v - dt * 0.6));
    Object.keys(V.wob).forEach((k) => { V.wob[k] = Math.max(0, V.wob[k] - dt * 1.6); });
    C.happy = Math.max(0, C.happy - dt * 0.4);
    C.wave = Math.max(0, C.wave - dt * 0.6);
    updateCoach();
    draw(t);
    requestAnimationFrame(frame);
  }
  function drawShop(t) {
    drawRoom();
    drawBird(t);
    drawCustomer(t);
    drawDog(t);
    drawCounter();
    drawCabinet(t);
    drawWell(t);
    drawStacks();
    drawMachine(L.churn.x, L.churn.y + 52, 0.5, true, t);
    drawMixer(t);
    drawHolder();
    drawBuild();
    drawSteelMoving();
    ["cream", "sauce", "sprinkles", "milk"].forEach((id) => { if (!T[id].held) drawTool(id, T[id]); });
    drawCherryBowl();
    if (V.fly) drawItem(V.fly.b, V.fly.x, V.fly.y, V.fly.k, 0);
    drawScoop();
    drawStreams(t, ["sauce", "milk", "shake"]);
    ["cream", "sauce", "sprinkles", "milk"].forEach((id) => { if (T[id].held) drawTool(id, T[id]); });
    drawTubFly();
    drawBubble(t);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#F3EEE6"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
    // The zoom: the shop grows around the ice cream maker while the close-up opens out from it.
    const e = Z.t, c0 = { x: L.churn.x, y: L.churn.y }, mid = { x: L.w / 2, y: L.h / 2 };
    if (e < 1) {
      ctx.save();
      if (e > 0) { const s = 1 + e * 2.5, c = { x: lerp(c0.x, mid.x, e), y: lerp(c0.y, mid.y, e) }; ctx.translate(c.x, c.y); ctx.scale(s, s); ctx.translate(-c0.x, -c0.y); }
      drawShop(t);
      ctx.restore();
    }
    if (e > 0) {
      ctx.save();
      if (e < 1) {
        const v = vis(), rmax = Math.hypot(v.x1 - v.x0, v.y1 - v.y0);
        ctx.beginPath(); ctx.arc(lerp(c0.x, mid.x, e), lerp(c0.y, mid.y, e), lerp(30, rmax, e * e), 0, TAU); ctx.clip();
      }
      drawMake(t);
      ctx.restore();
    }
    if (!Z.moving) { drawParts(); drawRing(t); }
  }
  function onEnding(done) {
    ending = true;
    drag = null; press.cancel();
    if (M.on) M.on = false;
    if (C.phase === "order" && !Z.on) { say("Bye bye!", 3); C.wave = 1; }
    setTimeout(done, 1500);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 100 100">' +
      '<path d="M38 56h24L50 92z" fill="#E9B460" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="47" r="14" fill="#FFA9C6" stroke="#1D2340" stroke-width="2.5"/>' +
      '<circle cx="50" cy="27" r="13" fill="#93603F" stroke="#1D2340" stroke-width="2.5"/>' +
      '<circle cx="52" cy="12" r="5" fill="#E3233B" stroke="#1D2340" stroke-width="2"/></svg>';
  }

  resize();
  const restored = restore();
  placeAll();
  setZoomUI(Z.on);
  if (!restored) keep(later(0.6, nextCustomer));
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "ice-cream",
    badge: $("tbadge"),
    timerIntro: "When time is up, the shop closes and the controls lock.",
    goodbyeOption: "End with a “Goodbye, Ice Cream Shop” button to press",
    farewellText: "Time to close the ice cream shop",
    goodbyeLabel: "Goodbye, Ice Cream Shop",
    farewellDone: "Bye bye, Ice Cream Shop!",
    restLine: "The Ice Cream Shop is closed.",
    restLine2: "The customers will be back next time.",
    restArt,
    soundNote: "A soft door bell, scoops, plops and a gentle machine hum. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; if (C.phase === "none") keep(later(0.6, nextCustomer)); },
    onSound: (on) => { if (on) snd.chime(); }
  });
  Toybox.offFirst({ running: () => M.on, off: (done) => { M.on = false; done(); } });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__ice = {
      state: () => {
        const w = want();
        return { phase: C.phase, zoom: Z.on, order: C.order && { menu: C.order.menu, holder: C.order.holder, scoops: C.order.scoops.map((f) => FLAVORS[f].id), tops: C.order.tops.slice() },
          build: { holder: B.holder, scoops: B.scoops.map((f) => FLAVORS[f].id), tops: TOP_IDS.filter((t) => B.tops[t] >= 1), milk: B.milk, mix: B.mix, pour: B.pour, at: B.at },
          maker: Object.assign({}, M), made: madeTub.slice(), busy, drag: drag && drag.k, steel: V.steel && { x: V.steel.x, y: V.steel.y, ang: V.steel.ang }, served, wanted: w && w.part, key: w && w.key, known: Object.assign({}, known),
          coach: coach.text(), say: now() < C.sayUntil ? C.say : "" };
      },
      tap: (part) => doTap(part),
      hit: (x, y) => hitPart(x, y),
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      // Puts the customer at the counter at once with this order (for tests and screenshots).
      order: (o, n) => {
        C.look = makeLook(n || 0); C.order = o || makeOrder(n || 4); C.phase = "order"; C.x = L.custX; C.hold = null; bubPop = 1;
        tweens = []; busy = false; B = emptyBuild(); placeAll(); lastWant = null;
      },
      flavor: (id) => FLAVORS.findIndex((f) => f.id === id),
      zoomIn: () => zoomIn(), zoomOut: () => zoomOut(),
      ghost: () => ghost.show()
    };
  }
})();
