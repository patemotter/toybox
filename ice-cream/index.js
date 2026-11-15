(function () {
  "use strict";
  // Ice Cream Shop: an ice cream counter seen from behind it, where the server stands. Customers (mostly people,
  // sometimes an animal) come to the counter one at a time and show their order in a speech bubble: a picture of
  // the ice cream and the words ("A cone with chocolate and mango, and sprinkles on top, please!"). He makes it
  // by hand on the scene:
  //   1. Put a cone or a cup in the holder (drag one from its stack, or tap the stack).
  //   2. Scoop each flavor: touch a tub and the scoop comes to his finger and digs while he holds it there; drag
  //      the scoop to the cone and let go (tap a tub: the scoop digs and puts the ball on by itself).
  //   3. Toppings: hold the sprinkle shaker or the chocolate sauce bottle over the ice cream and it shakes or
  //      squeezes while he holds it there; drag a cherry on top (a tap on each plays it once).
  //   4. Give the ice cream to the customer (drag it up to them, or tap the finished ice cream or the customer).
  // Each part of the order gets a green tick in the bubble when it matches. Something different is never wrong:
  // the customer gently says what they wanted ("Mint chip? I wanted mango!") or is pleased with an extra, and
  // always takes the ice cream happily. Then they walk off eating it and the next customer comes in. No paying,
  // no counters. Orders start simple (one scoop) and grow to three scoops and two toppings.
  // A yellow ring and one instruction show the next part; parts not needed right now still answer (their name,
  // a wiggle). The panel holds only New (start this ice cream again) and Surprise.
  // Units: the scene is drawn in world units (the TALL or WIDE layout, picked from the stage's shape) and scaled
  // to fit the stage; x to the right, y down.
  //
  // Sections:
  //   Setup and saved state
  //   Flavors, toppings and customers
  //   Sound
  //   Layout
  //   Tweens and particles
  //   Orders and matching
  //   Customers coming and going
  //   Actions: holder, scoop, toppings, serve
  //   Drawing helpers
  //   Drawing the ice cream
  //   Drawing the shop
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
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "ice-cream-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const fresh = Toybox.fresh();

  // =====================================================================================================
  // Flavors, toppings and customers
  // =====================================================================================================
  const FLAVORS = [
    { id: "vanilla", name: "Vanilla", hex: "#FFF2C4", dark: "#E9D59B" },
    { id: "chocolate", name: "Chocolate", hex: "#93603F", dark: "#6E432A" },
    { id: "strawberry", name: "Strawberry", hex: "#FFA9C6", dark: "#EC84A8" },
    { id: "mint", name: "Mint chip", hex: "#B2EDD3", dark: "#86D2B3" },
    { id: "mango", name: "Mango", hex: "#FFC453", dark: "#EFA42E" },
    { id: "bubblegum", name: "Bubblegum", hex: "#9AD6FF", dark: "#6CB8EE" }
  ];
  const TOPS = [
    { id: "sauce", name: "Chocolate sauce", say: "chocolate sauce", line: "Squeeze chocolate sauce on the ice cream." },
    { id: "sprinkles", name: "Sprinkles", say: "sprinkles", line: "Shake sprinkles on the ice cream." },
    { id: "cherry", name: "Cherry", say: "a cherry", line: "Put a cherry on top of the ice cream." }
  ];
  const TOP_BY = {};
  TOPS.forEach((t) => { TOP_BY[t.id] = t; });
  const TOP_IDS = TOPS.map((t) => t.id);
  const MAXS = 3;
  const HOLDERS = ["cone", "cup"];
  const SPRINKLE_COLORS = ["#FF4F6D", "#FFD23B", "#3FA9FF", "#5CC93A", "#B57BFF", "#FFFFFF", "#FF8A1F"];

  const SKIN = ["#F7D7B8", "#EDBD93", "#CF9567", "#A36A43", "#74492B"];
  const HAIRC = ["#2B1D14", "#5A3A22", "#A8642F", "#E9C46F", "#9A9A9A", "#C2452D"];
  const SHIRT = ["#FF6B6B", "#4D96FF", "#6BCB77", "#FFD93D", "#B983FF", "#FF9F45", "#38C3C3"];
  const STYLES = ["short", "long", "bun", "curly", "bald", "ponytail", "pigtails", "spiky"];
  const ANIMALS = ["bear", "rabbit", "cat", "panda"];
  const okLook = (l) => l && typeof l === "object" && (l.kind === "person" || ANIMALS.includes(l.kind)) &&
    SKIN.includes(l.skin) && HAIRC.includes(l.hc) && SHIRT.includes(l.shirt) && STYLES.includes(l.style);
  const okOrder = (o) => o && HOLDERS.includes(o.holder) && Array.isArray(o.scoops) && o.scoops.length >= 1 && o.scoops.length <= MAXS &&
    o.scoops.every((f) => Number.isInteger(f) && f >= 0 && f < FLAVORS.length) && Array.isArray(o.tops) && o.tops.every((t) => TOP_IDS.includes(t));

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
    boing() { tone(260, 520, 0.18, "sine", 0.05); tone(520, 300, 0.25, "sine", 0.03, 0.12); },
    talk() { tone(420, 520, 0.09, "sine", 0.025); tone(520, 440, 0.1, "sine", 0.025, 0.12); },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); tone(1320, 1320, 0.4, "sine", 0.03, 0.24); }
  };

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Two layouts in world units: TALL (upright phones and tablets) and WIDE (sideways). Tool positions are their
  // middles; the holder is the bottom of the cone; tubs are their middles.
  const TALL = {
    w: 400, h: 680, counterY: 250, custX: 292,
    bubble: { x: 6, y: 8, w: 212, side: false },
    win: { x: 226, y: 36, w: 132, h: 150 }, door: { x: 366, w: 60 },
    cab: { x: 10, y: 262, w: 380, h: 176 },
    tubs: [[75, 304], [200, 304], [325, 304], [75, 382], [200, 382], [325, 382]], tubW: 110, tubH: 52,
    well: { x: 52, y: 484 }, cones: { x: 52, y: 568 }, cups: { x: 52, y: 646 },
    holder: { x: 200, y: 646 },
    sprinkles: { x: 348, y: 490 }, sauce: { x: 348, y: 574 }, cherry: { x: 348, y: 652 }
  };
  const WIDE = {
    w: 900, h: 500, counterY: 200, custX: 300,
    bubble: { x: 384, y: 8, w: 430, side: true },
    win: { x: 190, y: 24, w: 220, h: 132 }, door: { x: 830, w: 80 },
    cab: { x: 175, y: 210, w: 450, h: 172 },
    tubs: [[250, 246], [400, 246], [550, 246], [250, 324], [400, 324], [550, 324]], tubW: 130, tubH: 48,
    well: { x: 88, y: 254 }, cones: { x: 88, y: 346 }, cups: { x: 88, y: 446 },
    holder: { x: 718, y: 476 },
    sprinkles: { x: 838, y: 270 }, sauce: { x: 838, y: 364 }, cherry: { x: 838, y: 460 }
  };
  let L = TALL, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const was = L;
    L = W / H > 1.05 ? WIDE : TALL;
    vs = Math.min(W / L.w, H / L.h) * 0.98;
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) / 2;
    if (was !== L) placeAll();
  }
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  // The part of the world the stage shows (wider or taller than the layout when the stage's shape differs).
  const vis = () => ({ x0: -vox / vs, x1: (W - vox) / vs, y0: -voy / vs, y1: (H - voy) / vs });
  // Text never smaller than about 14 px on screen.
  const fpx = (base) => Math.max(base, 14.5 / vs);

  // The ice cream's own geometry, from the bottom of the holder (0, 0) upward.
  const R = 28;
  const scoopY = (holder, k) => (holder === "cup" ? -56 : -78) - k * 36;
  const topY = (holder, n) => (n ? scoopY(holder, n - 1) - R : (holder === "cup" ? -48 : -64));

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
  // Customer motions survive placeAll (a resize or New); everything else at the counter is reset by it.
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
      else if (kind === "rain") { p.x = vis().x0 + Math.random() * (vis().x1 - vis().x0); p.y = -10 - Math.random() * 200; p.vy = 120 + sp * 80; p.vx = (Math.random() - 0.5) * 20; p.life = 4; p.size = 5; p.color = SPRINKLE_COLORS[rnd(SPRINKLE_COLORS.length)]; }
      else if (kind === "heart") { p.x += (Math.random() - 0.5) * 30; p.vx = (Math.random() - 0.5) * 20; p.vy = -40 - sp * 30; p.life = 1.4; p.size = 7 + sp * 4; p.color = "#FF5C8A"; }
      else if (kind === "crumb") { p.vx = Math.cos(a) * 50 * sp; p.vy = -50 - sp * 50; p.life = 0.6; p.size = 3; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "sprinkle" || p.kind === "crumb") p.vy += 400 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4;
      if (p.kind === "rain" && p.y > L.h + 10) return false;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // Orders and matching
  // =====================================================================================================
  const emptyBuild = () => ({ holder: null, scoops: [], tops: { sauce: 0, sprinkles: 0, cherry: 0 } });
  let B = emptyBuild();
  let served = 0;
  // Orders grow slowly: one plain scoop, then one scoop and a topping, then two scoops, then up to three
  // scoops and two toppings.
  function makeOrder(n) {
    let ns = 1;
    if (n === 2) ns = 2;
    else if (n > 2) ns = [1, 2, 2, 3, 3][rnd(5)];
    const scoops = [];
    for (let k = 0; k < ns; k++) {
      if (k && Math.random() < 0.3) { scoops.push(scoops[k - 1]); continue; }
      let f = rnd(FLAVORS.length);
      for (let g = 0; g < 4 && scoops.includes(f); g++) f = rnd(FLAVORS.length);
      scoops.push(f);
    }
    let nt = 0;
    if (n === 1) nt = 1;
    else if (n === 2) nt = rnd(2);
    else if (n > 2) nt = [0, 1, 1, 2, 2][rnd(5)];
    const ids = TOP_IDS.slice().sort(() => Math.random() - 0.5).slice(0, nt);
    return { holder: n === 0 || Math.random() < 0.6 ? "cone" : "cup", scoops, tops: TOP_IDS.filter((t) => ids.includes(t)) };
  }
  const fname = (f) => FLAVORS[f].name.toLowerCase();
  function list(a) { return a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]; }
  // The order in plain words: "A cone with chocolate and mango, and sprinkles on top, please!"
  function orderText(o) {
    const counts = [];
    o.scoops.forEach((f) => { const c = counts.find((q) => q.f === f); if (c) c.n++; else counts.push({ f, n: 1 }); });
    const NUM = ["", "one", "two", "three"];
    let items;
    if (counts.every((c) => c.n === 1)) items = counts.map((c) => fname(c.f));
    else items = counts.map((c, i) => (c.n > 1 ? NUM[c.n] + " scoops of " + fname(c.f) : (i ? "one of " : "one scoop of ") + fname(c.f)));
    let s = "A " + o.holder + " with " + list(items);
    if (o.tops.length) s += ", and " + list(o.tops.map((t) => TOP_BY[t].say)) + " on top";
    return s + ", please!";
  }
  // What matches the order so far. Scoops match in any order.
  function matchInfo(o, b) {
    const avail = b.scoops.slice();
    const scoopOk = o.scoops.map((f) => { const i = avail.indexOf(f); if (i >= 0) { avail.splice(i, 1); return true; } return false; });
    return { holder: b.holder === o.holder, scoopOk, missing: o.scoops.filter((f, k) => !scoopOk[k]), extra: avail,
      tops: o.tops.map((t) => b.tops[t] >= 1) };
  }

  // =====================================================================================================
  // Customers coming and going
  // =====================================================================================================
  // C.phase: "none" (nobody), "in" (walking to the counter), "order" (waiting for the ice cream), "take" (just
  // got it), "out" (walking off with it).
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

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      const c = C.phase === "order" ? { look: C.look, order: C.order } : null;
      localStorage.setItem(KEY, JSON.stringify({ c, build: B, served }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }
  // A reload keeps the customer at the counter and the ice cream in the holder; a visit from the home screen
  // starts with the first customer walking in.
  function restore() {
    if (fresh || !saved.c || !okLook(saved.c.look) || !okOrder(saved.c.order)) return false;
    C.look = saved.c.look; C.order = saved.c.order; C.phase = "order"; C.x = L.custX; bubPop = 1;
    served = Number.isInteger(saved.served) && saved.served >= 0 ? saved.served : 3;
    const b = saved.build;
    if (b && typeof b === "object") {
      if (HOLDERS.includes(b.holder)) B.holder = b.holder;
      if (B.holder && Array.isArray(b.scoops)) B.scoops = b.scoops.filter((f) => Number.isInteger(f) && f >= 0 && f < FLAVORS.length).slice(0, MAXS);
      if (B.scoops.length && b.tops && typeof b.tops === "object") TOP_IDS.forEach((t) => { B.tops[t] = b.tops[t] >= 1 ? 1 : 0; });
    }
    return true;
  }

  // =====================================================================================================
  // Actions: holder, scoop, toppings, serve
  // =====================================================================================================
  let busy = false, drag = null;
  // What is on screen besides the build: the scoop (S), the topping tools (T), a cone or cup flying to the
  // holder (V.hc), the ice cream lifted off the holder (V.ic), and little wobbles.
  const S = { x: 0, y: 0, ang: 0, ball: 0, f: -1, tw: null, home: true };
  const T = {};
  const V = { hc: null, ic: { dx: 0, dy: 0, k: 1 }, fly: null, squish: 0, dent: FLAVORS.map(() => 0), wob: {}, misses: 0, holderGlow: 0 };
  function homeOf(id) { return L[id]; }
  const scoopHomePt = () => ({ x: L.well.x - 8, y: L.well.y - 4 });
  function placeAll() {
    tweens = tweens.filter((tw) => tw.keep);
    busy = false; drag = null;
    const h = scoopHomePt();
    Object.assign(S, { x: h.x, y: h.y, ang: 0, ball: 0, f: -1, tw: null, home: true });
    ["sprinkles", "sauce", "cherry"].forEach((id) => { const p = homeOf(id); T[id] = { x: p.x, y: p.y, ang: 0, tw: null, held: false, out: false }; });
    V.hc = null; V.ic = { dx: 0, dy: 0, k: 1 };
    if (C.phase === "order" || C.phase === "take") C.x = L.custX;
  }
  const wobble = (id) => { V.wob[id] = 1; };
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  const NAMES = { cones: "Cones", cups: "Cups", scoop: "Ice cream scoop", well: "Dipper well", holder: "Cone holder",
    sprinkles: "Sprinkles", sauce: "Chocolate sauce", cherry: "Cherries" };

  // Moves the scoop (cancelling its last motion), with an optional hop in the middle.
  function moveS(to, dur, done, hop) {
    if (S.tw) cancel(S.tw);
    const a = { x: S.x, y: S.y };
    S.tw = tween(dur, (p) => { const e = ease(p); S.x = lerp(a.x, to.x, e); S.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * (hop || 0); }, () => { S.tw = null; if (done) done(); });
  }
  function scoopHome() { S.home = false; const h = scoopHomePt(); moveS(h, 0.45, () => { S.home = true; S.ang = 0; }, 20); }
  const tubPt = (i) => ({ x: L.tubs[i][0], y: L.tubs[i][1] });
  function tubAt(x, y) { return L.tubs.findIndex(([tx, ty]) => Math.abs(x - tx) <= L.tubW / 2 + 4 && Math.abs(y - ty) <= L.tubH / 2 + 6); }
  const nextScoopPt = () => ({ x: L.holder.x, y: L.holder.y + scoopY(B.holder || "cone", B.scoops.length) });
  const icTop = () => ({ x: L.holder.x + V.ic.dx, y: L.holder.y + V.ic.dy + topY(B.holder || "cone", B.scoops.length) });
  // A carried scoop is "at the cone" anywhere over the ice cream or just above it.
  function nearCone(x, y) {
    const top = icTop();
    return Math.abs(x - L.holder.x) < 70 && y > top.y - 110 && y < L.holder.y + 10;
  }

  // Holder: a cone or a cup goes into the holder. While it is still empty, the other one swaps in.
  function placeHolder(kind, from) {
    if (busy || V.hc) return;
    if (B.holder && B.scoops.length) {
      wobble(kind); tag(NAMES[kind + "s"], L[kind + "s"].x, L[kind + "s"].y - 40);
      if (B.holder !== kind) coach.say("Press New to start again.", 3);
      return;
    }
    if (B.holder === kind) { V.squish = 1; snd.clack(); return; }
    const a = from || { x: L[kind + "s"].x, y: L[kind + "s"].y - 30 };
    const was = B.holder;
    B.holder = null;
    if (was) puff("spark", L.holder.x, L.holder.y - 40, 5);
    V.hc = { kind, x: a.x, y: a.y };
    const to = { x: L.holder.x, y: L.holder.y };
    tween(0.4, (p) => { const e = ease(p); V.hc.x = lerp(a.x, to.x, e); V.hc.y = lerp(a.y, to.y, e) - Math.sin(p * Math.PI) * 40; }, () => {
      V.hc = null; B.holder = kind; V.squish = 1; snd.clack();
      ghost.learned("holder"); lastWant = null; saveSoon();
      if (C.phase === "order" && kind !== C.order.holder) say("A " + kind + "? I wanted a " + C.order.holder + "!");
    });
  }
  function needHolder() {
    V.misses++;
    if (V.misses >= 2) { V.misses = 0; placeHolder(C.phase === "order" ? C.order.holder : "cone"); return; }
    V.holderGlow = 1;
    coach.say("Put a cone in the holder first.", 3);
  }

  // Scoop: the full motion of a tap on a tub (the scoop flies there, digs, carries the ball to the cone).
  function scoopTap(tub) {
    if (busy) return;
    if (!B.holder) { needHolder(); return; }
    if (B.scoops.length >= MAXS) { coneFull(); return; }
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
    if (C.phase === "order") say("That's plenty of scoops!", 3);
    else coach.say("The cone is full.", 3);
    V.squish = 1;
  }
  function dropScoop() {
    const f = S.f;
    S.ball = 0; S.f = -1; busy = false;
    if (f >= 0 && B.holder && B.scoops.length < MAXS) addScoop(f);
    scoopHome();
  }
  function addScoop(f) {
    const before = C.phase === "order" ? matchInfo(C.order, B) : null;
    B.scoops.push(f);
    V.squish = 1; snd.plop();
    const p = { x: L.holder.x, y: L.holder.y + scoopY(B.holder, B.scoops.length - 1) };
    puff("spark", p.x, p.y - R, 5, FLAVORS[f].hex);
    ghost.learned("tub"); lastWant = null; saveSoon();
    if (before) {
      if (before.missing.length && !before.missing.includes(f)) say(FLAVORS[f].name + "? I wanted " + fname(before.missing[0]) + "!");
      else if (!before.missing.length) say("Ooh, an extra scoop!", 3);
    }
  }
  // Each frame while he holds the scoop: in a tub it digs (a still finger digs too); full, it is ready to go.
  function stepScoop(dt) {
    if (!drag || drag.k !== "scoop") return;
    const tub = tubAt(S.x, S.y);
    if (tub >= 0 && (S.f < 0 || S.f === tub || S.ball < 0.05) && S.ball < 1 && B.scoops.length < MAXS) {
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
      if (B.scoops.length >= MAXS) { coneFull(); putBallBack(); return; }
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

  // Toppings. The sprinkle shaker and the sauce bottle shake or squeeze while they are held over the ice cream;
  // a tap brings them over and does it once. A cherry is carried or hops on.
  function overTop(tl) {
    if (!B.holder || !B.scoops.length) return false;
    const top = icTop();
    return Math.abs(tl.x - top.x) < 70 && tl.y > top.y - 180 && tl.y < top.y - 10;
  }
  function needScoops(id) {
    wobble(id);
    if (!B.holder) needHolder();
    else coach.say("Scoop the ice cream first.", 3);
  }
  function addTop(id, amt) {
    if (B.tops[id] >= 1) return;
    const before = B.tops[id];
    B.tops[id] = Math.min(1, B.tops[id] + amt);
    if (before < 1 && B.tops[id] >= 1) topDone(id);
  }
  function topDone(id) {
    snd.chime(); lastWant = null; ghost.learned("top"); saveSoon();
    const top = icTop(); puff("spark", top.x, top.y, 6);
    if (C.phase === "order" && !C.order.tops.includes(id)) say("Ooh, " + TOP_BY[id].say + " too!", 3);
  }
  const mouthOf = (id, tl) => {
    const h = id === "sauce" ? 40 : 32;
    return { x: tl.x - Math.sin(tl.ang) * h, y: tl.y - Math.cos(tl.ang) * h };
  };
  let shakeT = 0;
  function stepTops(dt, t) {
    ["sprinkles", "sauce"].forEach((id) => {
      const tl = T[id];
      if (!tl.held) return;
      const over = overTop(tl) && B.tops[id] < 1;
      tl.ang += ((over ? Math.PI : 0) - tl.ang) * Math.min(1, dt * 10);
      if (over && Math.abs(tl.ang - Math.PI) < 0.6) pourTop(id, tl, dt, t);
    });
  }
  function pourTop(id, tl, dt, t) {
    addTop(id, dt * 0.75);
    const m = mouthOf(id, tl);
    if (id === "sprinkles") {
      tl.shake = Math.sin(t * 30) * 6;
      if (t > shakeT) { shakeT = t + 0.06; puff("sprinkle", m.x, m.y, 2); }
      if (Math.random() < dt * 4) snd.shake();
    } else {
      V.stream = { x: m.x, y: m.y, until: t + 0.08 };
      if (Math.random() < dt * 2) snd.squeeze();
    }
  }
  function toolHome(id, dur) {
    const tl = T[id], h = homeOf(id), a = { x: tl.x, y: tl.y, ang: tl.ang };
    if (tl.tw) cancel(tl.tw);
    tl.out = true;
    tl.tw = tween(dur || 0.45, (p) => { const e = ease(p); tl.x = lerp(a.x, h.x, e); tl.y = lerp(a.y, h.y, e) - Math.sin(p * Math.PI) * 20; tl.ang = lerp(a.ang, 0, e); tl.shake = 0; },
      () => { tl.tw = null; tl.out = false; });
  }
  function topTap(id) {
    if (busy) return;
    if (!B.holder || !B.scoops.length) { needScoops(id); return; }
    if (B.tops[id] >= 1) { wobble(id); const h = homeOf(id); tag(NAMES[id], h.x, h.y - 40); return; }
    if (id === "cherry") { cherryOn(); return; }
    busy = true;
    const tl = T[id], top = icTop(), a = { x: tl.x, y: tl.y };
    if (tl.tw) cancel(tl.tw);
    tl.out = true;
    const at = { x: top.x + (L === WIDE ? -6 : 6), y: top.y - (id === "sauce" ? 70 : 64) };
    tl.tw = tween(0.45, (p) => { const e = ease(p); tl.x = lerp(a.x, at.x, e); tl.y = lerp(a.y, at.y, e) - Math.sin(p * Math.PI) * 30; tl.ang = Math.PI * e; }, () => {
      tl.tw = tween(1.3, (p) => { const t = now(); pourTop(id, tl, 1 / 60, t); if (p >= 1) addTop(id, 1); }, () => {
        tl.tw = null; tl.shake = 0; busy = false; addTop(id, 1); toolHome(id);
      });
    });
  }
  // A cherry hops from the bowl onto the top of the ice cream.
  function cherryOn(from) {
    if (B.tops.cherry >= 1) return;
    busy = true;
    const tl = T.cherry, a = from || { x: L.cherry.x, y: L.cherry.y - 8 };
    tl.out = true; tl.x = a.x; tl.y = a.y;
    const top0 = icTop();
    tween(0.5, (p) => { const e = ease(p); tl.x = lerp(a.x, top0.x, e); tl.y = lerp(a.y, top0.y - 8, e) - Math.sin(p * Math.PI) * 60; }, () => {
      tl.out = false; const h = homeOf("cherry"); tl.x = h.x; tl.y = h.y;
      busy = false; snd.boing(); V.squish = 1; addTop("cherry", 1);
    });
  }

  // Serve: the ice cream goes into the customer's hand. Whatever it is, they take it happily.
  const handPt = () => {
    const kid = C.look && C.look.kid;
    return { x: C.x - 40, y: L.counterY - (kid ? 22 : 34) };
  };
  function serve() {
    if (busy || C.phase !== "order") return;
    if (!B.holder || !B.scoops.length) {
      say(B.holder ? "It needs ice cream!" : "Where is my ice cream?", 3);
      returnIc();
      return;
    }
    busy = true;
    const m = matchInfo(C.order, B), perfect = m.holder && !m.missing.length && m.tops.every(Boolean);
    const build = { holder: B.holder, scoops: B.scoops.slice(), tops: Object.assign({}, B.tops) };
    const a = { x: L.holder.x + V.ic.dx, y: L.holder.y + V.ic.dy }, h = handPt();
    V.fly = { b: build, x: a.x, y: a.y, k: V.ic.k };
    B = emptyBuild(); V.ic = { dx: 0, dy: 0, k: 1 };
    ghost.learned("serve");
    keep(tween(0.7, (p) => { const e = ease(p); V.fly.x = lerp(a.x, h.x, e); V.fly.y = lerp(a.y, h.y + 44, e) - Math.sin(p * Math.PI) * 40; V.fly.k = lerp(1, 0.62, e); }, () => {
      V.fly = null; C.hold = build; C.phase = "take"; C.happy = 1; busy = false; served++;
      say(perfect ? "Yum! Just right. Thank you!" : "Thank you! Yum!", 3);
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

  // =====================================================================================================
  // Drawing the ice cream
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
  // Toppings sit on the top scoop.
  function drawTops(x, ty, tops, lw) {
    const a = tops.sauce || 0;
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6);
      // A cap over the top third of the scoop, with drips running down from its edge.
      const a0 = Math.PI + 0.62, a1 = TAU - 0.62, ey = ty + Math.sin(a0) * (R + 1);
      ctx.beginPath();
      ctx.arc(x, ty, R + 1, a0, a1);
      const ex = x + Math.cos(a0) * (R + 1);
      const drips = [[0.55, 12], [0.2, 18], [-0.15, 10], [-0.45, 15]];
      drips.forEach(([u, len]) => {
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
    const n = Math.round((tops.sprinkles || 0) * 22);
    for (let i = 0; i < n; i++) {
      const ang = Math.PI + 0.25 + hash(i, 3) * (Math.PI - 0.5), d = R * (0.35 + hash(i, 5) * 0.55);
      const px = x + Math.cos(ang) * d, py = ty + Math.sin(ang) * d * 0.9 + 4;
      ctx.save(); ctx.translate(px, py); ctx.rotate(hash(i, 7) * TAU);
      ctx.fillStyle = SPRINKLE_COLORS[i % SPRINKLE_COLORS.length]; ctx.fillRect(-4, -1.4, 8, 2.8);
      ctx.restore();
    }
    if (tops.cherry >= 1) drawCherry(x + 3, ty - R - 4, 1, lw);
  }
  function drawCherry(x, y, k, lw) {
    ctx.beginPath(); ctx.moveTo(x + 1 * k, y - 8 * k); ctx.quadraticCurveTo(x + 4 * k, y - 20 * k, x + 12 * k, y - 22 * k);
    ctx.strokeStyle = "#3E7A2A"; ctx.lineWidth = 2.6 * k; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
    circle(x, y, 10 * k, "#E3233B", lw);
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(x - 3.5 * k, y - 3.5 * k, 3 * k, 2 * k, -0.6, 0, TAU); ctx.fill();
  }
  // The whole ice cream with its holder bottom at (x, y), scaled by k. ticks: what matches, for the bubble.
  function drawIceCream(x, y, b, k, squish, ticks) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    if (squish) ctx.scale(1 + squish * 0.06, 1 - squish * 0.06);
    const lw = LW / Math.max(0.5, k) * Math.min(1, k + 0.3);
    if (b.holder === "cup") drawCup(0, 0, lw); else drawCone(0, 0, lw);
    b.scoops.forEach((f, i) => drawBall(0, scoopY(b.holder, i), R, f, i + f * 7, lw));
    if (b.scoops.length) drawTops(0, scoopY(b.holder, b.scoops.length - 1), b.tops, lw);
    ctx.restore();
    if (ticks) {
      // The holder and the scoops are ticked on the right, the toppings on the left of the top scoop.
      const tr = 7.5, rx = x + (R + 8) * k + tr, lx = x - (R + 8) * k - tr;
      if (ticks.holder) tick(rx, y - (b.holder === "cup" ? 24 : 34) * k, tr);
      ticks.scoopOk.forEach((ok, i) => { if (ok) tick(rx, y + scoopY(b.holder, i) * k, tr); });
      const ty = y + scoopY(b.holder, b.scoops.length - 1) * k;
      ticks.ids.forEach((id, j) => {
        if (!ticks.tops[j]) return;
        if (id === "cherry") tick(rx, ty - (R + 16) * k, tr);
        else if (id === "sauce") tick(lx, ty - R * 0.6 * k, tr);
        else tick(lx, ty + R * 0.25 * k, tr);
      });
    }
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
    [[0.25, 0.3], [0.7, 0.2]].forEach(([u, v]) => { const cx = w.x + u * w.w, cy = w.y + v * w.h; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.arc(cx + 14, cy + 2, 10, 0, TAU); ctx.arc(cx - 13, cy + 3, 9, 0, TAU); ctx.fill(); });
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
  // The dipping cabinet seen from above, its tubs and their name cards.
  function drawCabinet(t) {
    const c = L.cab;
    rr(L.cab.x - 6, L.counterY - 6, c.w + 12, 18, 6); fillStroke("#E7EDF3", 2.4);
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
      // Scoop marks: soft curls across the surface.
      ctx.strokeStyle = f.dark; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (let k = 0; k < 4; k++) { const cx = x - w / 2 + 18 + k * (w - 30) / 3, cy = y + (k % 2 ? -6 : 6); ctx.beginPath(); ctx.arc(cx, cy, 10, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke(); }
      if (V.dent[i] > 0) { ctx.fillStyle = "rgba(0,0,0," + (0.18 * V.dent[i]) + ")"; ctx.beginPath(); ctx.ellipse(x, y, 20, 10, 0, 0, TAU); ctx.fill(); }
      if (f.id === "mint") for (let k = 0; k < 10; k++) { ctx.fillStyle = "#4A2E1E"; ctx.fillRect(x - w / 2 + 10 + hash(i, k) * (w - 20), y - h / 2 + 8 + hash(k, i) * (h - 16), 4, 3); }
      if (f.id === "bubblegum") for (let k = 0; k < 10; k++) { ctx.fillStyle = k % 2 ? "#FF6FA8" : "#FFE15C"; ctx.beginPath(); ctx.arc(x - w / 2 + 10 + hash(i, k) * (w - 20), y - h / 2 + 8 + hash(k, i) * (h - 16), 2.4, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.lineCap = "butt";
      rr(x - w / 2 + 6, y - h / 2 + 5, w - 12, h - 10, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.restore();
      // The name card under the tub.
      ctx.font = "700 " + fs + "px " + FONT;
      const tw = Math.min(w + 8, ctx.measureText(f.name).width + 14), ly = y + h / 2 + fs * 0.55 + 2;
      rr(x - tw / 2, ly - fs * 0.55, tw, fs * 1.1, 5); fillStroke("#FFFFFF", 1.6);
      text(f.name, x, ly + 1, fs, INK, 700);
    });
    // The glass front at the customer's side.
    ctx.fillStyle = "rgba(220,240,255,0.35)"; ctx.fillRect(c.x, c.y, c.w, 6);
    void t;
  }
  function drawCounter() {
    const y0 = L.cab.y + L.cab.h + 2;
    const v = vis();
    ctx.fillStyle = "#F3EEE6"; ctx.fillRect(v.x0, L.counterY + 8, v.x1 - v.x0, v.y1 - L.counterY);
    ctx.fillStyle = "#E8E0D4";
    for (let y = y0 + 20; y < v.y1; y += 36) ctx.fillRect(v.x0, y, v.x1 - v.x0, 2);
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
    // The handle, up and to the right.
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(34, -30); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.stroke();
    ctx.strokeStyle = "#D7DEE6"; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, -26); ctx.lineTo(50, -46); ctx.strokeStyle = INK; ctx.lineWidth = 13; ctx.stroke();
    ctx.strokeStyle = "#E5484D"; ctx.lineWidth = 9; ctx.stroke(); ctx.lineCap = "butt";
    // The bowl.
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI); ctx.closePath(); fillStroke("#D7DEE6");
    ctx.restore();
    if (S.ball > 0.02 && S.f >= 0) drawBall(S.x, S.y - 6 * S.ball, R * (0.35 + 0.6 * S.ball), S.f, 3, LW);
  }
  function wobT(id) { const v = V.wob[id] || 0; return v ? Math.sin(v * 18) * v * 0.12 : 0; }
  function drawConeStack() {
    const p = L.cones;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wobT("cone")); ctx.scale(0.85, 0.85);
    for (let k = 2; k >= 0; k--) drawCone(0, 40 - k * 9, LW / 0.85);
    ctx.restore();
  }
  function drawCupStack() {
    const p = L.cups;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wobT("cup")); ctx.scale(0.85, 0.85);
    for (let k = 0; k < 3; k++) drawCup(0, 34 - k * 7, LW / 0.85);
    ctx.restore();
  }
  function drawShaker(tl) {
    ctx.save(); ctx.translate(tl.x + (tl.shake || 0), tl.y); ctx.rotate(tl.ang + wobT("sprinkles"));
    rr(-20, -24, 40, 50, 10); fillStroke("rgba(235,245,255,0.95)");
    ctx.save(); rr(-20, -24, 40, 50, 10); ctx.clip();
    for (let i = 0; i < 26; i++) { ctx.fillStyle = SPRINKLE_COLORS[i % 7]; ctx.save(); ctx.translate(-16 + hash(i, 1) * 32, -2 + hash(i, 2) * 26); ctx.rotate(hash(i, 3) * TAU); ctx.fillRect(-4, -1.3, 8, 2.6); ctx.restore(); }
    ctx.restore();
    rr(-20, -24, 40, 50, 10); ctx.strokeStyle = INK; ctx.lineWidth = LW; ctx.stroke();
    rr(-22, -34, 44, 14, 6); fillStroke("#FF7FA8");
    ctx.fillStyle = INK; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(k * 9, -27, 2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawSauce(tl) {
    ctx.save(); ctx.translate(tl.x, tl.y); ctx.rotate(tl.ang + wobT("sauce"));
    rr(-17, -26, 34, 60, 12); fillStroke("#6B3A1E");
    rr(-12, -8, 24, 22, 4); fillStroke("#FFF2C4", 1.6);
    ctx.beginPath(); ctx.arc(0, 3, 6, 0, TAU); ctx.fillStyle = "#6B3A1E"; ctx.fill();
    rr(-9, -34, 18, 10, 3); fillStroke("#FFFFFF");
    ctx.beginPath(); ctx.moveTo(-4, -34); ctx.lineTo(0, -44); ctx.lineTo(4, -34); ctx.closePath(); fillStroke("#FFFFFF", 1.8);
    ctx.restore();
  }
  function drawCherryBowl() {
    const p = L.cherry;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wobT("cherry"));
    const pts = [[-16, -8], [0, -12], [16, -8], [-8, -16], [9, -18]];
    pts.forEach(([x, y], i) => { if (i < 4 || !T.cherry.out) drawCherry(x, y, 0.9, 2); });
    ctx.beginPath(); ctx.moveTo(-32, -10); ctx.quadraticCurveTo(-30, 16, 0, 16); ctx.quadraticCurveTo(30, 16, 32, -10); ctx.closePath();
    fillStroke("rgba(200,230,255,0.9)");
    ctx.restore();
    if (T.cherry.out) drawCherry(T.cherry.x, T.cherry.y, 1, LW);
  }
  // The holder: a round steel stand with a hole the cone stands in (its front hides the cone's tip). A cup
  // stands on the mat in front of it, where the stand steps aside.
  const standOn = () => B.holder !== "cup" && !(V.hc && V.hc.kind === "cup");
  function drawHolder() {
    const h = L.holder;
    ellipse(h.x, h.y + 6, 50, 12, "#BFE3F6", 2);
    if (standOn()) {
      rr(h.x - 26, h.y - 36, 52, 42, 8); fillStroke("#C9D3DE");
      ellipse(h.x, h.y - 36, 26, 7, "#E7EDF3", 2.2);
      ellipse(h.x, h.y - 36, 15, 4, "#5E6E86", 1.6);
    }
    if (V.holderGlow > 0) { ctx.save(); ctx.globalAlpha = V.holderGlow; ctx.beginPath(); ctx.arc(h.x, h.y - 30, 60, 0, TAU); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 6; ctx.stroke(); ctx.restore(); }
  }
  // The stand's front, over the cone's tip.
  function drawHolderRing() {
    const h = L.holder;
    ctx.beginPath(); ctx.moveTo(h.x - 26, h.y - 36); ctx.ellipse(h.x, h.y - 36, 26, 7, 0, Math.PI, 0, true); ctx.lineTo(h.x + 26, h.y - 2);
    ctx.arcTo(h.x + 26, h.y + 6, h.x + 18, h.y + 6, 8); ctx.lineTo(h.x - 18, h.y + 6); ctx.arcTo(h.x - 26, h.y + 6, h.x - 26, h.y - 2, 8); ctx.closePath();
    fillStroke("#C9D3DE");
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(h.x - 18, h.y - 26, 6, 26);
  }
  function drawBuild() {
    if (V.hc) { if (V.hc.kind === "cup") drawCup(V.hc.x, V.hc.y); else drawCone(V.hc.x, V.hc.y); }
    if (!B.holder) return;
    // Lifted off the stand (being handed over), the cone's tip shows.
    drawIceCream(L.holder.x + V.ic.dx, L.holder.y + V.ic.dy, B, V.ic.k, V.squish * Math.sin(V.squish * 14));
    if (B.holder === "cone" && !V.ic.dx && !V.ic.dy) drawHolderRing();
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
      } else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
  }
  function drawStream(t) {
    if (!V.stream || t > V.stream.until) return;
    const top = icTop();
    ctx.beginPath(); ctx.moveTo(V.stream.x, V.stream.y); ctx.lineTo(top.x + (V.stream.x - top.x) * 0.3, top.y + 4);
    ctx.strokeStyle = "#5A2E16"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
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
    // Body (the counter hides the rest).
    rr(-sw / 2, shoulder, sw, base - shoulder + 30, 22); fillStroke(l.shirt);
    ctx.beginPath(); ctx.moveTo(-12, shoulder + 1); ctx.quadraticCurveTo(0, shoulder + 14, 12, shoulder + 1); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    // Holding the ice cream: the arm comes up to it, and a lick now and then.
    if (C.hold) {
      const hx = -40, hy = L.counterY - (kid ? 22 : 34) - C.hop - bob;
      ctx.beginPath(); ctx.moveTo(-sw / 2 + 12, shoulder + 16); ctx.quadraticCurveTo(-sw / 2 - 10, hy + 34, hx, hy + 22);
      ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.lineCap = "round"; ctx.stroke(); ctx.strokeStyle = l.shirt; ctx.lineWidth = 11; ctx.stroke(); ctx.lineCap = "butt";
      const lick = C.phase === "out" ? Math.max(0, Math.sin(t * 2.4)) * 10 : 0;
      ctx.restore();
      drawIceCream(C.x + hx, hy + 44 - lick, C.hold, 0.62, 0);
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
    const bb = L.bubble, fs = fpx(L === WIDE ? 17 : 16), lh = fs * 1.15, pad = 10;
    const showPic = C.phase === "order";
    const o = C.order;
    const k = L === WIDE ? 0.62 : 0.58;
    const picH = showPic ? (-topY(o.holder, o.scoops.length) + (o.tops.includes("cherry") ? 30 : 8)) * k + 10 : 0;
    const picW = showPic ? 116 * k + 30 : 0;
    const textW = bb.side && showPic ? bb.w - picW - pad * 3 : bb.w - pad * 2;
    const lines = wrap(passing ? C.say : orderText(o), textW, fs);
    const textH = lines.length * lh;
    const h = Math.min(L.counterY + 24 - bb.y, bb.side ? Math.max(picH, textH) + pad * 2 : picH + textH + pad * 2 + (showPic ? 4 : 0));
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
      const m = matchInfo(o, B);
      const ob = { holder: o.holder, scoops: o.scoops, tops: { sauce: o.tops.includes("sauce") ? 1 : 0, sprinkles: o.tops.includes("sprinkles") ? 1 : 0, cherry: o.tops.includes("cherry") ? 1 : 0 } };
      const px = bb.side ? x + pad + picW / 2 : x + w / 2, py = bb.side ? y + h / 2 + picH / 2 - 6 : y + pad + picH - 4;
      drawIceCream(px, py, ob, k, 0, { holder: m.holder, scoopOk: m.scoopOk, ids: o.tops, tops: m.tops });
    }
    const tx0 = bb.side && showPic ? x + picW + pad * 2 : x + w / 2;
    const ty0 = bb.side ? y + h / 2 - textH / 2 + lh / 2 : y + pad + picH + (showPic ? 4 : 0) + lh / 2;
    lines.forEach((s, i) => text(s, tx0, ty0 + i * lh, fs, INK, 700, bb.side && showPic ? "left" : "center"));
    ctx.restore();
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  function want() {
    if (C.phase !== "order" || !C.order || V.fly) return null;
    const o = C.order, m = matchInfo(o, B);
    if (!B.holder || (B.holder !== o.holder && !B.scoops.length)) return { part: o.holder + "s", line: "Put a " + o.holder + " in the holder." };
    if (m.missing.length && B.scoops.length < MAXS) { const f = m.missing[0]; return { part: "tub" + f, line: "Scoop the " + fname(f) + " ice cream." }; }
    const t = o.tops.find((id) => B.tops[id] < 1);
    if (t) return { part: t, line: TOP_BY[t].line };
    return { part: "serve", line: "Give the ice cream to the customer." };
  }
  function partPt(part) {
    if (part === "cones" || part === "cups") return { x: L[part].x, y: L[part].y - 6, r: 46 };
    if (/^tub\d$/.test(part)) { const p = tubPt(+part.slice(3)); return { x: p.x, y: p.y, r: 50 }; }
    if (part === "sprinkles" || part === "sauce") return { x: L[part].x, y: L[part].y - 4, r: 40 };
    if (part === "cherry") return { x: L.cherry.x, y: L.cherry.y - 6, r: 38 };
    if (part === "serve") { const top = icTop(); return { x: L.holder.x, y: (top.y + L.holder.y) / 2, r: 60 }; }
    if (part === "customer") return { x: C.x, y: L.counterY - 80, r: 60 };
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked() || drag || busy) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const g = 4 + pulse * 4;
    const stroke = () => { ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke(); };
    if (/^tub\d$/.test(w.part)) {
      const p = tubPt(+w.part.slice(3));
      rr(p.x - L.tubW / 2 - g, p.y - L.tubH / 2 - g, L.tubW + g * 2, L.tubH + g * 2, 10 + g); stroke();
    } else if (w.part === "serve") {
      const top = icTop(), hgt = L.holder.y - top.y + 16;
      rr(L.holder.x - 46 - g, top.y - 10 - g, 92 + g * 2, hgt + g * 2, 30); stroke();
    } else {
      const p = partPt(w.part);
      if (p) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r + g, 0, TAU); stroke(); }
    }
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = null;
  function updateCoach() {
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
      if (locked() || press.active() || drag || busy) return null;
      const w = want();
      if (!w) return null;
      const key = w.part === "cones" || w.part === "cups" ? "holder" : /^tub/.test(w.part) ? "tub" : w.part === "serve" ? "serve" : "top";
      const first = ghost.shown(key) < 1;
      const P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const p = partPt(w.part);
      if (!p) return null;
      if (first) return { pts: [P(p.x, p.y)], tap: true, key };
      const top = icTop();
      if (key === "holder") return { pts: [P(p.x, p.y), P(L.holder.x, L.holder.y - 40)], dur: 1500, key };
      if (key === "tub") return { pts: [P(p.x, p.y), P(p.x + 10, p.y + 4), P(L.holder.x, top.y - 20)], dur: 2000, key };
      if (key === "serve") return { pts: [P(L.holder.x, L.holder.y - 50), P(C.x, L.counterY - 60)], dur: 1600, key };
      return { pts: [P(p.x, p.y), P(top.x, top.y - 70)], dur: 1600, key };
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  const inRect = (w, x, y, hw, hh) => Math.abs(w.x - x) <= hw && Math.abs(w.y - y) <= hh;
  // The part under a press (client px). Every target is at least a fingertip wide.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 30 / vs;
    let best = null, bd = Infinity;
    const cand = (id, x, y, r) => { const d = Math.hypot(w.x - x, w.y - y); if (d <= Math.max(r, minR) && d - r * 0.3 < bd) { bd = d - r * 0.3; best = id; } };
    if (B.holder && !busy) { const top = icTop(); if (Math.abs(w.x - L.holder.x) <= 44 && w.y >= top.y - 16 && w.y <= L.holder.y + 10) return "ic"; }
    if (S.home && !busy) cand("scoop", S.x + 14, S.y - 12, 34);
    const tub = tubAt(w.x, w.y + 0);
    if (tub >= 0) return "tub" + tub;
    // The name cards under the tubs count as the tub.
    const card = L.tubs.findIndex(([x, y]) => Math.abs(w.x - x) <= L.tubW / 2 && w.y > y && w.y < y + L.tubH / 2 + fpx(15) * 1.3);
    if (card >= 0) return "tub" + card;
    cand("cones", L.cones.x, L.cones.y - 4, 40);
    cand("cups", L.cups.x, L.cups.y - 4, 38);
    ["sprinkles", "sauce"].forEach((id) => { if (!T[id].out) cand(id, T[id].x, T[id].y, 36); });
    cand("cherry", L.cherry.x, L.cherry.y - 4, 36);
    cand("scoop", L.well.x, L.well.y, 34);
    if (best) return best;
    if (!B.holder && inRect(w, L.holder.x, L.holder.y - 30, 50, 50)) return "holder";
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
    const w = want();
    if (part === "cones" || part === "cups") placeHolder(part.slice(0, -1));
    else if (/^tub\d$/.test(part)) scoopTap(+part.slice(3));
    else if (part === "scoop") {
      if (w && /^tub\d$/.test(w.part)) scoopTap(+w.part.slice(3));
      else { wobble("scoop"); tag(NAMES.scoop, S.x, S.y - 30); }
    } else if (part === "sprinkles" || part === "sauce" || part === "cherry") topTap(part);
    else if (part === "ic") {
      if (w && w.part === "serve") serve();
      else { V.squish = 1; snd.boing(); tag(B.holder === "cup" ? "Cup" : "Cone", L.holder.x, icTop().y - 10); if (w) hint(); }
    } else if (part === "holder") { V.holderGlow = 1; tag(NAMES.holder, L.holder.x, L.holder.y - 60); hint(); }
    else if (part === "customer") {
      if (w && w.part === "serve") serve();
      else { say(orderText(C.order), 4); C.wave = 1; }
    }
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
      if (drag || locked() || busy || !part || !/^tub\d$/.test(part)) return;
      if (!B.holder) return;
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
      } else if (d.k === "tool") {
        const tl = T[d.id];
        tl.held = false;
        if (d.id === "cherry") {
          if (still || overTop(tl) || nearCone(tl.x, tl.y)) { if (B.scoops.length) cherryOn({ x: tl.x, y: tl.y }); else { tl.out = false; needScoops("cherry"); } }
          else { tl.out = false; }
        } else if (still && B.tops[d.id] < 1) { tl.out = false; topTap(d.id); }
        else {
          // Some sprinkles or sauce already on: it finishes by itself as the tool goes back.
          if (B.tops[d.id] > 0.15 && B.tops[d.id] < 1) { const a0 = B.tops[d.id]; tween(0.4, (p) => { B.tops[d.id] = Math.max(B.tops[d.id], lerp(a0, 0.999, p)); }, () => addTop(d.id, 1)); }
          toolHome(d.id);
        }
      } else if (d.k === "ic") {
        if (still) { V.ic.dx = 0; V.ic.dy = 0; doTap("ic"); }
        else if (w.y < L.counterY + 40 && C.phase === "order") serve();
        else returnIc();
      }
    },
    tap: (part) => {
      if (skipTap) { skipTap = false; return; }
      if (!drag) doTap(part);
    }
  });
  // Starts the drag for a part (sets drag), or answers at once (true).
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0);
    if ((part === "cones" || part === "cups") && !busy && !V.hc) {
      const kind = part.slice(0, -1);
      if (B.holder && B.scoops.length) { placeHolder(kind); return true; }
      const h = L[part];
      drag = { k: "hc", ox: h.x - w0.x, oy: h.y + 30 - w0.y };
      V.hc = { kind, x: w.x + drag.ox, y: w.y + drag.oy };
      ghost.learned("holder");
    } else if (part === "scoop" && !busy) {
      if (S.tw) { cancel(S.tw); S.tw = null; }
      drag = { k: "scoop" }; S.home = false; S.x = w.x; S.y = w.y;
    } else if ((part === "sprinkles" || part === "sauce" || part === "cherry") && !busy) {
      if (part !== "cherry" && B.tops[part] >= 1) { wobble(part); tag(NAMES[part], L[part].x, L[part].y - 40); return true; }
      if (part === "cherry" && B.tops.cherry >= 1) { wobble("cherry"); tag(NAMES.cherry, L.cherry.x, L.cherry.y - 30); return true; }
      const tl = T[part];
      if (tl.tw) { cancel(tl.tw); tl.tw = null; }
      if (part === "cherry") { tl.out = true; tl.x = w.x; tl.y = w.y - 14; drag = { k: "tool", id: part, ox: 0, oy: -14 }; }
      else { drag = { k: "tool", id: part, ox: tl.x - w0.x, oy: tl.y - w0.y - 10 }; tl.held = true; tl.out = true; tl.x = w.x + drag.ox; tl.y = w.y + drag.oy; }
      ghost.learned("top");
    } else if (part === "ic" && !busy && B.holder) {
      drag = { k: "ic", x0: w0.x, y0: w0.y };
    }
    return false;
  }

  // =====================================================================================================
  // Panel and surprise
  // =====================================================================================================
  // New: this ice cream starts again (the customer stays and still wants their order).
  function newTap() {
    if (locked() || busy) return;
    drag = null; press.cancel();
    if (B.holder) puff("spark", L.holder.x, L.holder.y - 60, 8);
    B = emptyBuild();
    placeAll();
    lastWant = null; ghost.again(); saveSoon();
  }
  Toybox.bar($("bottom"), { onNew: newTap, onSurprise: surprise });

  // Takes turns between moments in the shop: sprinkles rain down over the shop, a dog peeks over the counter,
  // a bird flies past the window, and the customer does a happy hop.
  let surpriseNext = 0, actor = null;
  function surprise() {
    if (locked()) return;
    let k = surpriseNext; surpriseNext = (surpriseNext + 1) % 4;
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
  let lastT = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    stepScoop(dt); stepTops(dt, t);
    V.squish = Math.max(0, V.squish - dt * 2.5);
    V.holderGlow = Math.max(0, V.holderGlow - dt * 0.8);
    V.dent = V.dent.map((v) => Math.max(0, v - dt * 0.6));
    Object.keys(V.wob).forEach((k) => { V.wob[k] = Math.max(0, V.wob[k] - dt * 1.6); });
    C.happy = Math.max(0, C.happy - dt * 0.4);
    C.wave = Math.max(0, C.wave - dt * 0.6);
    updateCoach();
    draw(t);
    requestAnimationFrame(frame);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#F3EEE6"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
    drawRoom();
    drawBird(t);
    drawCustomer(t);
    drawDog(t);
    drawCounter();
    drawCabinet(t);
    drawWell(t);
    drawConeStack();
    drawCupStack();
    drawHolder();
    drawBuild();
    if (!T.sprinkles.out || !T.sprinkles.held) drawShaker(T.sprinkles);
    if (!T.sauce.out || !T.sauce.held) drawSauce(T.sauce);
    drawCherryBowl();
    if (V.fly) drawIceCream(V.fly.x, V.fly.y, V.fly.b, V.fly.k, 0);
    drawScoop();
    drawStream(t);
    if (T.sprinkles.held) drawShaker(T.sprinkles);
    if (T.sauce.held) drawSauce(T.sauce);
    drawParts();
    drawBubble(t);
    drawRing(t);
  }
  function onEnding(done) {
    ending = true;
    drag = null; press.cancel();
    if (C.phase === "order") { say("Bye bye!", 3); C.wave = 1; }
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
  placeAll();
  if (!restore()) keep(later(0.6, nextCustomer));
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
    soundNote: "A soft door bell, scoops and plops. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; if (C.phase === "none") keep(later(0.6, nextCustomer)); },
    onSound: (on) => { if (on) snd.chime(); }
  });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__ice = {
      state: () => {
        const w = want();
        return { phase: C.phase, order: C.order && { holder: C.order.holder, scoops: C.order.scoops.map((f) => FLAVORS[f].id), tops: C.order.tops.slice() },
          build: { holder: B.holder, scoops: B.scoops.map((f) => FLAVORS[f].id), tops: TOP_IDS.filter((t) => B.tops[t] >= 1) },
          busy, served, wanted: w && w.part, coach: coach.text(), say: now() < C.sayUntil ? C.say : "" };
      },
      tap: (part) => doTap(part),
      hit: (x, y) => hitPart(x, y),
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      // Puts the customer at the counter at once with this order (for tests and screenshots).
      order: (o, n) => {
        C.look = makeLook(n || 0); C.order = o || makeOrder(n || 4); C.phase = "order"; C.x = L.custX; C.hold = null; bubPop = 1;
        tweens = []; busy = false; B = emptyBuild(); placeAll(); lastWant = null;
      },
      ghost: () => ghost.show()
    };
  }
})();
