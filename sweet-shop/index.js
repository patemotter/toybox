(function () {
  "use strict";
  // Sweet Shop: a sweet shop counter seen from where the candy maker stands. Gummies for now (donuts or cookies
  // may come later as their own jobs). He makes a batch of gummies the real way, one hands-on step at a time.
  // Every step is done with his hands on the scene: a drag does the real thing for as long as he keeps doing it,
  // and a tap on the same part plays that part's whole motion once (the dad, 2026-11-01: the first version was
  // mostly pushing the yellow ring).
  //   1. Pour a flavor: carry a bottle over the pot and it tips and pours while he holds it there (tap: it pours).
  //   2. Tip the gelatin and sugar: carry the bowl over the pot and the powder falls while he holds it there.
  //   3. Turn the hot plate's knob round (tap: on or off; it works at any time and the flame follows it).
  //   4. Stir: the whisk follows his finger round the pot; the mix clears while the pot is hot (tap: one stir).
  //      Off the heat the knob turns off by itself.
  //   5. Fill the silicone mold: touch a shape and the candy dropper comes to his finger; the shape fills while
  //      he holds it there, and he moves on to the next (tap: that shape fills).
  //   6. Put the mold in the fridge (drag it there: the door opens as it comes near; or tap it).
  //   7. Push the gummies out: tap each one and it pops out, or push the mold to turn it over.
  //   8. Coat each gummy: drag it into Sour sugar, Sugar or Shiny (a little oil), or tap a bowl for all the rest.
  //   9. Put the gummies in the candy jar (drag them, tap each, or tap the jar).
  // A yellow ring and one instruction show the next part; parts not needed right now still answer (a wiggle and
  // their name, the fridge door opens, the pot sloshes). Every gummy jiggles when touched, and gummies can be
  // moved round the tray. The molds (Bears, Worms, Fruits) are tiles in the panel. The candy jar on the shelf
  // is his collection, kept across visits; the Jar button (or a tap on the jar) shows it big.
  // Units: the scene is drawn in world units (the TALL or WIDE layout, picked from the stage's shape) and scaled
  // to fit the stage; x to the right, y down.
  //
  // Sections:
  //   Setup and saved state
  //   Flavors, molds and coatings
  //   Sound
  //   Layout
  //   Tweens and particles
  //   The batch
  //   Steps: pour, gelatin, heat, stir
  //   Steps: fill, chill, pop
  //   Steps: coat and jar
  //   Gummy shapes
  //   Drawing helpers
  //   Drawing the shop
  //   Drawing the pot, bottles, mold, bowls, fridge and jar
  //   The jar view
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Panel and surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const TAU = Math.PI * 2, INK = "#1D2340", LW = 2.4;
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "sweet-shop-v1";
  const JAR_MAX = 48;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};

  // =====================================================================================================
  // Flavors, molds and coatings
  // =====================================================================================================
  const FLAVORS = [
    { id: "cherry", name: "Cherry", hex: "#E8303F" },
    { id: "orange", name: "Orange", hex: "#FF8A1F" },
    { id: "lemon", name: "Lemon", hex: "#FFD23B" },
    { id: "lime", name: "Lime", hex: "#5CC93A" },
    { id: "blue", name: "Blue raspberry", hex: "#2F8CFF" },
    { id: "grape", name: "Grape", hex: "#8E4FD9" },
    { id: "strawberry", name: "Strawberry", hex: "#FF5C9E" }
  ];
  // Each mold's shapes, placed relative to the mold's middle (world units) with their size s.
  const MOLDS = [
    { id: "bears", name: "Bears", cav: [-84, -28, 28, 84].map((dx) => ({ sh: "bear", dx, dy: 2, s: 25 })) },
    { id: "worms", name: "Worms", cav: [-36, 0, 36].map((dy, k) => ({ sh: "worm", dx: (k - 1) * 4, dy, s: 34 })) },
    { id: "fruits", name: "Fruits", cav: [["strawberry", -84], ["slice", -28], ["cherries", 28], ["apple", 84]].map(([sh, dx]) => ({ sh, dx, dy: 4, s: 24 })) }
  ];
  const MOLD_BY = {};
  MOLDS.forEach((m) => { MOLD_BY[m.id] = m; });
  const COATS = [
    { id: "sour", name: "Sour sugar", short: "Sour", line: "Sour sugar makes the gummies sour." },
    { id: "sugar", name: "Sugar", short: "Sugar", line: "Sugar makes the gummies sweet and soft." },
    { id: "shiny", name: "Shiny", short: "Shiny", line: "A little oil makes the gummies shiny." }
  ];
  const SHAPES = ["bear", "worm", "strawberry", "slice", "cherries", "apple"];
  // Half width and half height of each shape, in units of its size s.
  const EXTENT = { bear: [0.7, 1], worm: [1.9, 0.6], strawberry: [0.95, 1], slice: [1, 0.7], cherries: [0.85, 1], apple: [0.95, 0.95] };

  // The candy jar: [{ s: shape, f: flavor index, c: coat id }], oldest first. Kept across visits.
  const okEntry = (e) => e && SHAPES.includes(e.s) && Number.isInteger(e.f) && e.f >= 0 && e.f < FLAVORS.length &&
    (e.c === "" || COATS.some((c) => c.id === e.c));
  let jar = Array.isArray(saved.jar) ? saved.jar.filter(okEntry).slice(-JAR_MAX) : [];
  // The batch (fresh on a visit from the home screen; a reload keeps it).
  const fresh = Toybox.fresh();
  const sb = !fresh && saved.batch && typeof saved.batch === "object" ? saved.batch : null;

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        jar,
        batch: { step: B.step, flavor: B.flavor, mold: B.mold, next: nextMold, fill: B.fill, coats: B.coats }
      }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }

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
    pour() { noise(1.1, 500, 0.05, 0, 2); tone(300, 200, 0.2, "sine", 0.03, 0.2); tone(280, 190, 0.2, "sine", 0.03, 0.6); },
    sprinkle() { noise(0.8, 4200, 0.03, 0, 1.5); },
    click() { tone(900, 700, 0.06, "square", 0.02); noise(0.5, 1800, 0.02, 0.05); },
    stir() { noise(0.6, 900, 0.03, 0, 1.2); },
    clear() { tone(660, 660, 0.25, "sine", 0.04); tone(990, 990, 0.35, "sine", 0.035, 0.14); },
    drip() { tone(900, 420, 0.16, "sine", 0.05); },
    door() { tone(140, 90, 0.18, "sine", 0.06); },
    hum() { tone(110, 110, 1.6, "triangle", 0.015); },
    boing() { tone(260, 520, 0.18, "sine", 0.05); tone(520, 300, 0.25, "sine", 0.03, 0.12); },
    shake() { for (let k = 0; k < 5; k++) noise(0.14, 3000, 0.03, k * 0.24, 2); },
    plink(k) { const f = 700 + (k % 5) * 90; tone(f, f * 1.2, 0.14, "sine", 0.04); },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); tone(1320, 1320, 0.4, "sine", 0.03, 0.24); }
  };

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Two layouts in world units: TALL (upright phones and tablets) and WIDE (sideways).
  const TALL = {
    w: 400, h: 660, wall: 300, front: 620,
    shelves: [{ y: 118, x0: 6, x1: 394 }, { y: 236, x0: 6, x1: 292 }],
    bottles: [[55, 118], [145, 118], [235, 118], [325, 118], [45, 236], [115, 236], [185, 236]], bw: 50, bh: 84,
    jar: { x: 252, y: 236, w: 74, h: 96 },
    fridge: { x: 300, y: 150, w: 96, h: 520, split: 150 },
    plate: { x: 15, y: 345, w: 140, h: 70, top: 34 },
    pot: { x: 85, y: 362, w: 128, h: 76 },
    gel: { x: 228, y: 380 },
    work: { x: 150, y: 472 },
    dropRest: { x: 262, y: 404 },
    bowls: { y: 562, xs: [62, 150, 238] }
  };
  const WIDE = {
    w: 900, h: 500, wall: 250, front: 460,
    shelves: [{ y: 112, x0: 14, x1: 690 }],
    bottles: [0, 1, 2, 3, 4, 5, 6].map((i) => [60 + i * 80, 112]), bw: 54, bh: 88,
    jar: { x: 628, y: 112, w: 84, h: 100 },
    fridge: { x: 752, y: 30, w: 140, h: 480, split: 160 },
    plate: { x: 30, y: 285, w: 160, h: 72, top: 34 },
    pot: { x: 110, y: 302, w: 150, h: 86 },
    gel: { x: 262, y: 325 },
    work: { x: 470, y: 334 },
    dropRest: { x: 640, y: 296 },
    bowls: { y: 424, xs: [380, 470, 560] }
  };
  const MOLD_W = 240, MOLD_H = 124;
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
  // The pot's rim (its top) and the liquid's surface.
  const potRim = () => L.pot.y - L.pot.h;
  const surfY = () => potRim() + 8 + (1 - V.level) * 30;
  const cavPos = (k) => { const c = MOLD_BY[B.mold].cav[k]; return { x: V.mold.x + c.dx, y: V.mold.y + c.dy, s: c.s, sh: c.sh }; };
  const fridgeIn = () => ({ x: L.fridge.x + L.fridge.w / 2, y: L.fridge.y + L.fridge.split + (L.fridge.h - L.fridge.split) * 0.32 });
  const jarMouth = () => ({ x: L.jar.x, y: L.jar.y - L.jar.h + 6 });

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

  let parts = [];
  function puff(kind, x, y, n, color) {
    if (reduce && kind !== "steam") n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 90) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 3, color: color || "#FFFFFF" };
      if (kind === "powder") { p.x += (Math.random() - 0.5) * 16; p.vx = (Math.random() - 0.5) * 30; p.vy = 40 + sp * 60; p.life = 0.7; p.size = 2 + sp * 2; }
      else if (kind === "steam") { p.x += (Math.random() - 0.5) * 60; p.vx = (Math.random() - 0.5) * 10; p.vy = -30 - sp * 20; p.life = 1.3; p.size = 8 + sp * 8; }
      else if (kind === "spark") { p.vx = Math.cos(a) * (40 + sp * 80); p.vy = Math.sin(a) * (40 + sp * 80); p.life = 0.7; p.size = 5 + sp * 4; p.color = color || "#FFE36B"; }
      else if (kind === "crystal") { p.vx = Math.cos(a) * 60 * sp; p.vy = -60 - sp * 80; p.life = 0.9; p.size = 2.5 + sp * 2; }
      else if (kind === "drop") { p.vx = Math.cos(a) * 30 * sp; p.vy = -40 - sp * 40; p.life = 0.6; p.size = 2.5 + sp * 2; }
      else if (kind === "flake") { p.x += (Math.random() - 0.5) * 60; p.y += (Math.random() - 0.5) * 100; p.vx = (Math.random() - 0.5) * 12; p.vy = 10 + sp * 14; p.life = 1.2; p.size = 4 + sp * 3; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "powder" || p.kind === "crystal" || p.kind === "drop") p.vy += 300 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // The batch
  // =====================================================================================================
  // Steps in order. Each step is done by hand on the scene: a drag does the real thing for as long as he keeps
  // doing it (a bottle pours while it is tipped over the pot, the dropper fills the shape it is held over), and
  // a tap on the same part plays that part's whole motion once.
  const STEPS = ["flavor", "gel", "heat", "stir", "fill", "chill", "pop", "coat", "jar", "done"];
  let nextMold = MOLD_BY[saved.batch && saved.batch.next] && !fresh ? saved.batch.next : null;
  function newBatch(mold) {
    const m = MOLD_BY[mold] ? mold : "bears";
    return { step: "flavor", flavor: -1, mold: m, fill: MOLD_BY[m].cav.map(() => false), coats: MOLD_BY[m].cav.map(() => ""), gum: [] };
  }
  const okCoat = (c) => c === "" || COATS.some((q) => q.id === c);
  let B = newBatch(sb && sb.mold);
  if (sb && STEPS.includes(sb.step) && sb.step !== "done") {
    B.step = sb.step;
    if (Number.isInteger(sb.flavor) && sb.flavor >= 0 && sb.flavor < FLAVORS.length) B.flavor = sb.flavor;
    if (Array.isArray(sb.fill) && sb.fill.length === B.fill.length) B.fill = sb.fill.map((v) => !!v);
    if (Array.isArray(sb.coats) && sb.coats.length === B.coats.length) B.coats = sb.coats.map((c) => (okCoat(c) ? c : ""));
    else if (okCoat(sb.coat) && sb.step === "jar") B.coats = B.coats.map(() => sb.coat);
    if (B.flavor < 0 && B.step !== "flavor") B = newBatch(B.mold);
  }
  const at = (step) => STEPS.indexOf(B.step) >= STEPS.indexOf(step);
  const hex = () => (B.flavor >= 0 ? FLAVORS[B.flavor].hex : "#FFFFFF");

  // What is on screen. Rebuilt from the batch (placeAll) when a page loads, a batch starts or the layout changes.
  let busy = false, drag = null;
  const V = {
    level: 0, cloud: 0, clear: 0, heat: 0, knob: 0, gelShow: 1,
    carry: null, gelPose: null, stream: null, whisk: { x: 0, y: 0 }, whiskShow: 0, swirl: 0, swirlV: 0, slosh: 0,
    drop: { x: 0, y: 0, show: 0, squeeze: 0, fillAmt: 0, held: false }, cavLevel: [], fillQ: [], filling: false,
    mold: { x: 0, y: 0, k: 1, flip: 1, alpha: 1, show: 1, inFridge: false, lift: 0 }, set: false,
    door: 0, frost: 0, tray: 0, bowls: 0, bowlShake: -1, shakeAmt: 0, lid: 0, jarBounce: 0,
    bwob: FLAVORS.map(() => 0), gelWob: 0, knobTw: null, doorTw: false
  };
  function newGum(k, where) {
    const c = MOLD_BY[B.mold].cav[k], p = cavPos(k);
    return { k, sh: c.sh, s: c.s, x: p.x, y: p.y, hx: p.x, hy: p.y, wob: 0, ph: 0, rot: 0, coat: B.coats[k] || "", where, sc: 1 };
  }
  function placeAll() {
    const st = B.step;
    V.level = at("gel") || (st === "flavor" && B.flavor >= 0) ? 1 : 0;
    if (st === "flavor" && B.flavor >= 0) V.level = 0.5;
    V.cloud = at("gel") && !at("fill") ? 1 : 0;
    V.clear = at("fill") ? 1 : 0;
    V.knob = st === "stir" ? 1 : 0; V.heat = V.knob;
    V.gelShow = at("heat") ? 0 : 1;
    V.whiskShow = st === "stir" ? 1 : 0;
    V.whisk = { x: L.pot.x + L.pot.w * 0.22, y: surfY() };
    V.carry = null; V.gelPose = null; V.stream = null;
    V.drop = { x: L.dropRest.x, y: L.dropRest.y, show: st === "fill" ? 1 : 0, squeeze: 0, fillAmt: 1, held: false };
    V.fillQ = []; V.filling = false;
    V.cavLevel = B.fill.map((f) => (f ? 1 : 0));
    if (at("fill")) V.level = 1 - 0.75 * B.fill.filter(Boolean).length / B.fill.length;
    V.set = at("pop");
    V.mold = { x: L.work.x, y: L.work.y, k: 1, flip: 1, alpha: 1, show: at("coat") ? 0 : 1, inFridge: false, lift: 0 };
    V.door = 0; V.frost = 0;
    V.tray = at("coat") ? 1 : 0;
    V.bowls = st === "coat" ? 1 : 0; V.bowlShake = -1;
    V.lid = st === "coat" || st === "jar" ? 1 : 0;
    // The gummies: still in the mold while it is popped, then on the tray.
    if (st === "pop") B.gum = MOLD_BY[B.mold].cav.map((c, k) => newGum(k, "mold"));
    else B.gum = at("coat") && st !== "done" ? MOLD_BY[B.mold].cav.map((c, k) => newGum(k, "tray")) : [];
  }
  function startBatch() {
    tweens = []; busy = false; parts = []; drag = null;
    B = newBatch(nextMold || B.mold);
    nextMold = null;
    placeAll();
    V.gelShow = 0;
    tween(0.5, (p) => { V.gelShow = ease(p); });
    tiles.set(B.mold);
    lastWant = "";
    ghost.again();
    saveSoon();
  }
  function advance(step) {
    B.step = step;
    lastWant = "";
    ghost.poke();
    saveSoon();
    if (step === "pop") B.gum = MOLD_BY[B.mold].cav.map((c, k) => newGum(k, "mold"));
    // The knob may already be on when the gelatin is in: then the stirring starts at once.
    if (step === "heat" && V.knob > 0.5) heatReached();
  }
  // A gentle "not this one": the part wiggles and says its name.
  function wiggleTag(name, x, y) { tag(name, x, y); snd.boing(); }

  // =====================================================================================================
  // Steps: pour, gelatin, heat, stir
  // =====================================================================================================
  function bottleHome(i) { const [x, y] = L.bottles[i]; return { x, y }; }
  // The bottle's mouth for a bottle standing at (x, y) and tipped by ang (it turns about its bottom).
  const mouthOf = (x, y, ang) => ({ x: x + Math.sin(ang) * L.bh, y: y - Math.cos(ang) * L.bh });
  // A carried bottle or bowl is "over the pot" when its bottom (x, y) is level with the rim or a little above
  // it, and close enough at the side for its mouth to reach the pot. Higher up it would pour from the shelf.
  function overPot(x, y, reach) {
    return Math.abs(x - L.pot.x) < L.pot.w * 0.5 + reach && y > potRim() - 100 && y < potRim() + 50;
  }
  // Only the flavor already in the pot can be poured on; any bottle can start an empty pot.
  const pourable = (i) => B.step === "flavor" && (B.flavor < 0 || B.flavor === i);
  // The lower shelf sits just above the pot in the upright layout, so a bottle must also leave its spot first.
  function bottleOver(c) {
    const h = bottleHome(c.i);
    return pourable(c.i) && Math.hypot(c.x - h.x, c.y - h.y) > L.bh * 0.5 && overPot(c.x, c.y, L.bh);
  }
  function pourLine() { return B.flavor >= 0 ? "Pour the " + FLAVORS[B.flavor].name.toLowerCase() + " bottle into the pot." : "Pour a flavor into the pot."; }
  let pourSnd = 0;
  // Each frame while he holds a bottle: over the pot it tips toward it and pours for as long as he holds it there.
  function stepPour(dt) {
    const c = V.carry;
    if (!c || !c.held) return;
    const over = bottleOver(c), side = c.x >= L.pot.x ? -1 : 1;
    c.ang += ((over ? 2.0 * side : 0) - c.ang) * Math.min(1, dt * 7);
    if (over && Math.abs(c.ang) > 1.2) {
      if (B.flavor < 0) { B.flavor = c.i; const tg = vp(L.pot.x, potRim() - 30); Toybox.nametag(FLAVORS[c.i].name, tg.x, tg.y, 2200); }
      V.level = Math.min(1, V.level + dt * 0.55);
      const m = mouthOf(c.x, c.y, c.ang);
      V.stream = { x: m.x, y: m.y, a: 1 };
      if (now() > pourSnd) { pourSnd = now() + 1.1; snd.pour(); }
      if (Math.random() < dt * 12) puff("drop", L.pot.x, surfY(), 1, hex());
      if (V.level >= 1) pourDone();
    } else V.stream = null;
  }
  function pourDone() {
    const c = V.carry;
    V.stream = null; drag = null;
    if (c) bottleBack(c.i, { x: c.x, y: c.y }, c.ang);
    advance("gel");
  }
  // A tap on a bottle (or a bottle let go over the pot): it goes over the pot, tips, pours until the pot is
  // full, and goes back.
  function pour(i, from) {
    if (busy || !pourable(i)) return;
    busy = true;
    const home = bottleHome(i), f0 = from || { x: home.x, y: home.y, ang: 0 }, over = { x: L.pot.x + L.pot.w * 0.42 + L.bh * 0.5, y: potRim() - 10 };
    V.carry = { i, x: f0.x, y: f0.y, ang: f0.ang || 0, held: false };
    tween(from ? 0.3 : 0.6, (p) => { const e = ease(p); V.carry.x = lerp(f0.x, over.x, e); V.carry.y = lerp(f0.y, over.y, e) - Math.sin(p * Math.PI) * (from ? 0 : 30); }, () => {
      if (B.flavor < 0) { B.flavor = i; const tg = vp(L.pot.x, potRim() - 30); Toybox.nametag(FLAVORS[i].name, tg.x, tg.y, 2200); }
      const a0 = V.carry.ang;
      tween(0.35, (p) => { V.carry.ang = lerp(a0, -2.0, ease(p)); }, () => {
        snd.pour();
        const l0 = V.level;
        tween(1.1, (p) => {
          const m = mouthOf(V.carry.x, V.carry.y, V.carry.ang);
          V.stream = { x: m.x, y: m.y, a: p < 0.85 ? 1 : (1 - p) / 0.15 };
          V.level = Math.max(V.level, lerp(l0, 1, ease(p)));
          if (Math.random() < 0.3) puff("drop", L.pot.x, surfY(), 1, hex());
        }, () => { V.stream = null; busy = false; bottleBack(i, { x: V.carry.x, y: V.carry.y }, V.carry.ang); advance("gel"); });
      });
    });
  }
  function bottleBack(i, from, ang) {
    const home = bottleHome(i), a0 = ang || 0;
    V.carry = { i, x: from.x, y: from.y, ang: a0, held: false };
    const c = V.carry;
    tween(0.5, (p) => { const e = ease(p); c.x = lerp(from.x, home.x, e); c.y = lerp(from.y, home.y, e) - Math.sin(p * Math.PI) * 20; c.ang = lerp(a0, 0, e); }, () => { if (V.carry === c) V.carry = null; });
  }
  // Each frame while he holds the gelatin bowl: over the pot it tips and the powder falls while he holds it there.
  function stepGel(dt) {
    const g = V.gelPose;
    if (!g || !g.held) return;
    const over = B.step === "gel" && overPot(g.x, g.y, 50), side = g.x >= L.pot.x ? -1 : 1;
    g.ang += ((over ? 1.9 * side : 0) - g.ang) * Math.min(1, dt * 7);
    if (over && Math.abs(g.ang) > 1.0) {
      if (Math.random() < dt * 30) puff("powder", g.x + side * 26, g.y + 4, 1);
      if (now() > pourSnd) { pourSnd = now() + 0.8; snd.sprinkle(); }
      V.cloud = Math.min(1, V.cloud + dt * 0.7);
      if (V.cloud >= 1) gelDone();
    }
  }
  function gelDone() {
    drag = null;
    const g = V.gelPose || { x: L.gel.x, y: L.gel.y, ang: 0 };
    busy = true;
    tween(0.4, (p) => { V.gelShow = 1 - p; g.ang *= 0.9; }, () => { V.gelPose = null; busy = false; advance("heat"); });
    V.gelPose = g; g.held = false;
  }
  // A tap on the bowl (or the bowl let go over the pot): it goes over the pot and tips the gelatin and sugar in.
  function tipGel(from) {
    if (busy || B.step !== "gel") return;
    busy = true;
    const f0 = from || { x: L.gel.x, y: L.gel.y }, over = { x: L.pot.x + 30, y: potRim() - 34 };
    V.gelPose = { x: f0.x, y: f0.y, ang: 0, held: false };
    tween(0.55, (p) => { const e = ease(p); V.gelPose.x = lerp(f0.x, over.x, e); V.gelPose.y = lerp(f0.y, over.y, e) - Math.sin(p * Math.PI) * 26; }, () => {
      snd.sprinkle();
      const c0 = V.cloud;
      tween(1.0, (p) => {
        V.gelPose.ang = -1.9 * ease(Math.min(1, p * 2.5));
        if (p > 0.25 && Math.random() < 0.7) puff("powder", V.gelPose.x - 22, V.gelPose.y + 4, 2);
        V.cloud = Math.max(V.cloud, lerp(c0, 1, ease((p - 0.2) / 0.8)));
      }, () => { busy = false; gelDone(); });
    });
  }
  function gelBack(from) {
    const g = { x: from.x, y: from.y, ang: from.ang || 0, held: false };
    V.gelPose = g;
    tween(0.4, (p) => { const e = ease(p); g.x = lerp(from.x, L.gel.x, e); g.y = lerp(from.y, L.gel.y, e); g.ang = lerp(from.ang || 0, 0, e); }, () => { if (V.gelPose === g) V.gelPose = null; });
  }
  // The knob works at any time: a tap turns it on or off, a drag turns it as far as he turns it. The flame
  // follows the knob.
  function setKnob(v) {
    const was = V.knob;
    V.knob = clamp(v, 0, 1);
    if ((was < 0.5) !== (V.knob < 0.5)) snd.click();
    if (V.knob > 0.5 && B.step === "heat" && !busy) heatReached();
  }
  function knobTap() {
    if (V.knobTw) return;
    const from = V.knob, to = from > 0.5 ? 0 : 1;
    V.knobTw = tween(0.35, (p) => { setKnob(lerp(from, to, ease(p))); }, () => { V.knobTw = null; });
  }
  function heatReached() {
    if (B.step !== "heat") return;
    V.whisk = { x: L.pot.x + L.pot.w * 0.22, y: surfY() };
    tween(0.5, (p) => { V.whiskShow = Math.max(V.whiskShow, ease(p)); });
    advance("stir");
  }
  // Stirring clears the mix while the pot is hot: about two good circles round the pot, or three taps.
  let coldSaid = 0;
  function stirBy(dist) {
    if (B.step !== "stir" || busy) return;
    V.swirl += dist * 0.04; V.swirlV = Math.min(1, V.swirlV + dist * 0.02);
    if (V.knob < 0.5) {
      if (now() > coldSaid) { coldSaid = now() + 4; coach.say("Turn the knob to heat the pot.", 3); }
      return;
    }
    const before = V.clear;
    V.clear = Math.min(1, V.clear + dist / 360);
    V.cloud = 1 - V.clear;
    if (Math.floor(before * 6) !== Math.floor(V.clear * 6)) snd.stir();
    if (V.clear >= 1) clearDone();
  }
  // Puts the whisk where his finger is, inside the pot.
  function whiskTo(x, y) {
    const rx = L.pot.w / 2 - 16, sy = surfY();
    V.whisk = { x: clamp(x, L.pot.x - rx, L.pot.x + rx), y: sy + clamp((y - sy) * 0.15, -5, 5) };
  }
  let stirTw = null;
  function stirTap() {
    if (B.step !== "stir" || busy || stirTw) return;
    if (V.knob < 0.5) { stirBy(0); return; }
    snd.stir();
    let last = { x: V.whisk.x, y: V.whisk.y };
    stirTw = tween(0.9, (p) => {
      const a = p * TAU, x = L.pot.x + Math.cos(a) * L.pot.w * 0.28, y = surfY() + Math.sin(a) * 5;
      whiskTo(x, y); stirBy(Math.hypot(x - last.x, y - last.y) * 0.85); last = { x, y };
    }, () => { stirTw = null; });
  }
  function clearDone() {
    busy = true; drag = null;
    if (stirTw) { tweens.splice(tweens.indexOf(stirTw), 1); stirTw = null; }
    snd.clear();
    puff("spark", L.pot.x, surfY(), 10);
    coach.say("The mix is clear and glossy.", 3);
    // Off the heat: the knob turns off by itself.
    tween(0.4, (p) => { setKnob(1 - ease(p)); }, () => {
      tween(0.6, (p) => { V.whiskShow = 1 - ease(p); }, () => { busy = false; startFill(); });
    });
  }

  // =====================================================================================================
  // Steps: fill, chill, pop
  // =====================================================================================================
  // The candy dropper dips into the pot by itself, then waits beside the mold.
  function startFill() {
    advance("fill");
    busy = true;
    const d = V.drop, dip = { x: L.pot.x + 10, y: surfY() + 4 };
    d.x = dip.x; d.y = dip.y - 80; d.fillAmt = 0; d.held = false;
    tween(0.35, (p) => { d.show = p; d.y = lerp(dip.y - 80, dip.y, ease(p)); }, () => {
      tween(0.6, (p) => { d.squeeze = Math.sin(p * Math.PI); d.fillAmt = ease(p); }, () => {
        tween(0.7, (p) => { const e = ease(p); d.x = lerp(dip.x, L.dropRest.x, e); d.y = lerp(dip.y, L.dropRest.y, e) - Math.sin(p * Math.PI) * 50; }, () => {
          busy = false; lastWant = ""; ghost.poke();
          // Shapes he tapped while the dropper was dipping are filled now.
          if (V.fillQ.length && !V.filling) fillNext();
        });
      });
    });
  }
  const nextEmpty = () => B.fill.findIndex((f, k) => !f && !V.fillQ.includes(k));
  const filledCount = () => B.fill.filter(Boolean).length;
  function cavFull(k) {
    B.fill[k] = true; V.cavLevel[k] = 1;
    V.level = 1 - 0.75 * filledCount() / B.fill.length;
    V.drop.fillAmt = 1 - filledCount() / B.fill.length * 0.8;
    const c = cavPos(k); puff("spark", c.x, c.y - c.s * 0.6, 4);
    saveSoon(); lastWant = "";
  }
  // Each frame while he holds the dropper: over a shape that is not full yet, the bulb squeezes and the shape
  // fills for as long as he holds it there.
  let dripAt = 0;
  function stepFill(dt) {
    const d = V.drop;
    if (!d.held || B.step !== "fill" || busy) { if (!V.filling) d.squeeze = Math.max(0, d.squeeze - dt * 4); return; }
    let k = -1;
    B.fill.forEach((f, j) => { if (!f && k < 0) { const c = cavPos(j); if (Math.hypot(d.x - c.x, d.y - (c.y - c.s * 0.3)) < c.s * 1.4) k = j; } });
    if (k < 0) { d.squeeze = Math.max(0, d.squeeze - dt * 4); return; }
    d.squeeze = Math.min(1, d.squeeze + dt * 6);
    if (now() > dripAt) { dripAt = now() + 0.35; snd.drip(); }
    V.cavLevel[k] = Math.min(1, (V.cavLevel[k] || 0) + dt * 1.6);
    if (V.cavLevel[k] >= 1) { if (drag && drag.k === "dropper") drag.filled = true; cavFull(k); if (B.fill.every(Boolean)) { drag = null; d.held = false; fillDone(); } }
  }
  // A shape to fill by tapping: queued, so quick taps all count (also while the dropper is still dipping).
  function fillCav(k) {
    if (B.step !== "fill" || k < 0 || B.fill[k] || V.fillQ.includes(k)) return;
    V.fillQ.push(k);
    if (!V.filling && !busy) fillNext();
  }
  function fillNext() {
    const k = V.fillQ[0];
    if (k == null) { V.filling = false; return; }
    V.filling = true;
    const d = V.drop, c = cavPos(k), x0 = d.x, y0 = d.y, tx = c.x, ty = c.y - c.s * 0.3;
    const go = Math.hypot(tx - x0, ty - y0) > 4 ? 0.3 : 0.01;
    tween(go, (p) => { const e = ease(p); d.x = lerp(x0, tx, e); d.y = lerp(y0, ty, e); }, () => {
      snd.drip();
      const l0 = V.cavLevel[k] || 0;
      tween(0.55 * (1 - l0) + 0.05, (p) => {
        d.squeeze = Math.sin(Math.min(1, p * 1.3) * Math.PI);
        V.cavLevel[k] = lerp(l0, 1, ease(p));
      }, () => {
        V.fillQ.shift();
        if (!B.fill[k]) cavFull(k);
        if (B.fill.every(Boolean)) { V.fillQ = []; V.filling = false; fillDone(); }
        else fillNext();
      });
    });
  }
  function fillDone() {
    busy = true;
    const d = V.drop, x0 = d.x, y0 = d.y;
    tween(0.5, (p) => { d.x = lerp(x0, L.dropRest.x, ease(p)); d.y = lerp(y0, L.dropRest.y, ease(p)); d.show = 1 - ease(p); }, () => {
      busy = false; advance("chill");
    });
  }
  const nearFridge = (x) => x + MOLD_W * 0.3 > L.fridge.x - 10;
  function chill() {
    if (busy || B.step !== "chill") return;
    busy = true; drag = null;
    const m = V.mold, fi = fridgeIn(), k1 = (L.fridge.w * 0.78) / MOLD_W, x0 = L.work.x, y0 = L.work.y, mx = m.x, my = m.y, d0 = V.door;
    snd.door();
    tween(0.45 * (1 - d0) + 0.01, (p) => { V.door = lerp(d0, 1, ease(p)); }, () => {
      tween(0.9, (p) => { const e = ease(p); m.x = lerp(mx, fi.x, e); m.y = lerp(my, fi.y, e) - Math.sin(p * Math.PI) * 40; m.k = lerp(1, k1, e); }, () => {
        m.inFridge = true;
        tween(0.45, (p) => { V.door = 1 - ease(p); }, () => {
          snd.door(); snd.hum();
          coach.say("The fridge makes the gummies cold and firm.", 3.5);
          tween(2.0, (p) => {
            V.frost = Math.sin(p * Math.PI);
            if (Math.random() < 0.25) puff("flake", fi.x, fi.y, 1, "#FFFFFF");
            if (p > 0.5) V.set = true;
          }, () => {
            snd.door();
            tween(0.45, (p) => { V.door = ease(p); }, () => {
              m.inFridge = false;
              tween(0.9, (p) => { const e = ease(p); m.x = lerp(fi.x, x0, e); m.y = lerp(fi.y, y0, e) - Math.sin(p * Math.PI) * 40; m.k = lerp(k1, 1, e); }, () => {
                tween(0.45, (p) => { V.door = 1 - ease(p); }, () => { busy = false; advance("pop"); });
              });
            });
          });
        });
      });
    });
  }
  function moldBack(from) {
    const m = V.mold, d0 = V.door;
    tween(0.4, (p) => { m.x = lerp(from.x, L.work.x, ease(p)); m.y = lerp(from.y, L.work.y, ease(p)); V.door = d0 * (1 - p); });
  }
  // Out of turn, a tap on the fridge opens its door for a look inside.
  function fridgePeek() {
    if (busy || V.doorTw || drag) return;
    V.doorTw = true; snd.door();
    tween(0.4, (p) => { V.door = ease(p); }, () => {
      later(2.2, () => { tween(0.4, (p) => { V.door = 1 - ease(p); }, () => { V.doorTw = false; snd.door(); }); });
    });
  }
  // Popping: a push on one shape pops that gummy out with a boing; a push on the mold itself turns it over and
  // they all pop out. When the last one is out, the mold slides away and they sit on the tray.
  const inMold = () => B.gum.filter((g) => g.where === "mold");
  function popOne(k) {
    if (busy || B.step !== "pop") return;
    const g = B.gum[k];
    if (!g || g.where !== "mold") return;
    g.where = "air";
    snd.boing();
    ghost.learned("pop");
    tween(0.55, (p) => { g.y = g.hy - Math.sin(p * Math.PI) * 60; g.rot = Math.sin(p * Math.PI) * 0.6 * (k % 2 ? 1 : -1); }, () => {
      g.y = g.hy; g.rot = 0; g.where = "out"; g.wob = 0.4; g.ph = 0;
      if (!inMold().length && !B.gum.some((q) => q.where === "air")) moldAway();
    });
    lastWant = "";
  }
  function pop() {
    if (busy || B.step !== "pop") return;
    const rest = inMold();
    if (!rest.length) return;
    busy = true;
    const m = V.mold;
    rest.forEach((g) => { g.where = "air"; g.hide = true; });
    tween(0.45, (p) => { m.lift = ease(p) * 34; m.flip = Math.cos(p * Math.PI); }, () => {
      snd.boing();
      rest.forEach((g, i) => {
        g.hide = false;
        const y0 = g.hy - 40;
        tween(0.5, (p) => { g.y = y0 + (g.hy - y0) * (p < 0.7 ? (p / 0.7) ** 2 : 1 - Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.12); }, () => {
          g.y = g.hy; g.where = "out"; g.wob = 0.35; g.ph = 0;
        }, i * 0.06);
      });
      later(0.3 + rest.length * 0.06, () => { busy = false; moldAway(); });
    });
  }
  function moldAway() {
    busy = true;
    const m = V.mold, x0 = m.x, l0 = m.lift;
    tween(0.3, (p) => { V.tray = ease(p); });
    tween(0.55, (p) => { m.x = x0 + ease(p) * 140; m.lift = l0 + ease(p) * 40; m.alpha = 1 - ease(p); }, () => {
      m.show = 0; m.alpha = 1; m.flip = 1; m.lift = 0; m.x = x0;
      B.gum.forEach((g) => { g.where = "tray"; });
      busy = false;
      advance("coat");
      tween(0.5, (p) => { V.bowls = ease(p); V.lid = Math.max(V.lid, ease(p)); });
    });
  }

  // =====================================================================================================
  // Steps: coat and jar
  // =====================================================================================================
  // Each gummy can have its own coating: drag one into a bowl, or tap a bowl and the gummies that have none yet
  // all go in (all of them if every one has one). The gummies can go in the candy jar at any time after this.
  function bowlPos(i) { return { x: L.bowls.xs[i], y: L.bowls.y }; }
  const onTray = () => B.gum.filter((g) => g.where === "tray");
  function coatIn(i, list) {
    if (busy || B.step !== "coat") return;
    const c = COATS[i], b = bowlPos(i);
    if (!list) { const bare = onTray().filter((g) => !g.coat); list = bare.length ? bare : onTray(); }
    if (!list.length) return;
    busy = true;
    const n = list.length;
    list.forEach((g, j) => {
      const x0 = g.x, y0 = g.y, tx = b.x + (j - (n - 1) / 2) * 12, ty = b.y - 6;
      g.where = "air"; g.bj = j;
      tween(0.5, (p) => { const e = ease(p); g.x = lerp(x0, tx, e); g.y = lerp(y0, ty, e) - Math.sin(p * Math.PI) * 50; g.sc = lerp(1, 0.5, e); }, () => { g.where = "bowl"; }, j * 0.07);
    });
    later(0.5 + n * 0.07, () => {
      snd.shake();
      V.bowlShake = i;
      tween(1.2, (p) => {
        V.shakeAmt = Math.sin(p * Math.PI * 7) * (1 - p);
        if (Math.random() < 0.5) puff(c.id === "shiny" ? "spark" : "crystal", b.x + (Math.random() - 0.5) * 50, b.y - 10, 1, c.id === "shiny" ? "#FFF3B0" : "#FFFFFF");
        if (p > 0.5) list.forEach((g) => { g.coat = c.id; B.coats[g.k] = c.id; });
      }, () => {
        V.bowlShake = -1; V.shakeAmt = 0;
        coach.say(c.line, 3.5);
        list.forEach((g, j) => {
          const x0 = g.x, y0 = g.y;
          g.where = "air";
          tween(0.5, (p) => { const e = ease(p); g.x = lerp(x0, g.hx, e); g.y = lerp(y0, g.hy, e) - Math.sin(p * Math.PI) * 50; g.sc = lerp(0.5, 1, e); }, () => {
            g.where = "tray"; g.wob = 0.3; g.ph = 0;
          }, j * 0.07);
        });
        later(0.5 + n * 0.07, () => {
          busy = false; saveSoon(); lastWant = "";
          if (B.gum.every((g) => g.coat || g.where === "jar")) toJarStep();
        });
      });
    });
  }
  function toJarStep() {
    if (B.step !== "coat") return;
    tween(0.4, (p) => { V.bowls = 1 - ease(p); });
    advance("jar");
  }
  // A gummy hops from the tray into the candy jar.
  function hopToJar(g, delay) {
    if (g.where !== "tray") return;
    g.where = "air";
    const x0 = g.x, y0 = g.y, m = jarMouth();
    tween(0.65, (p) => { const e = ease(p); g.x = lerp(x0, m.x, e); g.y = lerp(y0, m.y, e) - Math.sin(p * Math.PI) * 70; g.sc = lerp(1, 0.35, e); g.rot = p * 3; }, () => {
      g.where = "jar";
      jar.push({ s: g.sh, f: B.flavor, c: g.coat || "" });
      if (jar.length > JAR_MAX) jar.shift();
      V.jarBounce = 1;
      snd.plink(jar.length);
      saveSoon();
      if (B.gum.every((q) => q.where === "jar")) finishBatch();
      else if (B.gum.every((q) => q.coat || q.where === "jar")) toJarStep();
    }, delay || 0);
  }
  function allToJar() {
    if (busy || (B.step !== "jar" && B.step !== "coat")) return;
    onTray().forEach((g, j) => hopToJar(g, j * 0.3));
  }
  function finishBatch() {
    advance("done");
    busy = true;
    tween(0.4, (p) => { V.lid = 1 - ease(p); V.bowls = Math.min(V.bowls, 1 - ease(p)); });
    snd.chime();
    const m = jarMouth();
    puff("spark", m.x, m.y + 30, 12);
    coach.say("The gummies are in the candy jar!", 3.5);
    Toybox.kind();
    later(3, () => { busy = false; startBatch(); });
  }

  // =====================================================================================================
  // Gummy shapes
  // =====================================================================================================
  // One path per shape, made of overlapping clockwise pieces so the fill is their union.
  function gummyPath(sh, s) {
    ctx.beginPath();
    const C = (x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); };
    const E = (x, y, rx, ry, rot) => { ctx.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); };
    if (sh === "bear") {
      C(0, -0.45 * s, 0.42 * s); C(-0.33 * s, -0.8 * s, 0.17 * s); C(0.33 * s, -0.8 * s, 0.17 * s);
      E(0, 0.25 * s, 0.5 * s, 0.58 * s); C(-0.47 * s, 0.02 * s, 0.19 * s); C(0.47 * s, 0.02 * s, 0.19 * s);
      C(-0.28 * s, 0.78 * s, 0.22 * s); C(0.28 * s, 0.78 * s, 0.22 * s);
    } else if (sh === "worm") {
      for (let k = 0; k <= 16; k++) { const u = -1.6 + 3.2 * k / 16; C(u * s, 0.22 * s * Math.sin(u * 2.4), 0.3 * s); }
    } else if (sh === "strawberry") {
      ctx.moveTo(0, 0.95 * s);
      ctx.bezierCurveTo(-0.55 * s, 0.55 * s, -0.95 * s, 0.05 * s, -0.8 * s, -0.42 * s);
      ctx.bezierCurveTo(-0.65 * s, -0.8 * s, -0.2 * s, -0.7 * s, 0, -0.56 * s);
      ctx.bezierCurveTo(0.2 * s, -0.7 * s, 0.65 * s, -0.8 * s, 0.8 * s, -0.42 * s);
      ctx.bezierCurveTo(0.95 * s, 0.05 * s, 0.55 * s, 0.55 * s, 0, 0.95 * s);
      ctx.closePath();
      E(-0.26 * s, -0.72 * s, 0.28 * s, 0.12 * s, -0.5); E(0.26 * s, -0.72 * s, 0.28 * s, 0.12 * s, 0.5); C(0, -0.82 * s, 0.14 * s);
    } else if (sh === "slice") {
      ctx.moveTo(-s, 0.35 * s); ctx.arc(0, 0.35 * s, s, Math.PI, TAU); ctx.closePath();
    } else if (sh === "cherries") {
      C(-0.42 * s, 0.42 * s, 0.42 * s); C(0.42 * s, 0.46 * s, 0.4 * s);
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        C(lerp(-0.36, 0.12, t) * s, lerp(0.05, -0.9, t) * s, 0.085 * s);
        C(lerp(0.4, 0.12, t) * s, lerp(0.1, -0.9, t) * s, 0.085 * s);
      }
      E(0.38 * s, -0.86 * s, 0.26 * s, 0.1 * s, -0.3);
    } else if (sh === "apple") {
      C(-0.3 * s, 0.12 * s, 0.6 * s); C(0.3 * s, 0.12 * s, 0.6 * s); E(0, 0.42 * s, 0.62 * s, 0.48 * s);
      E(0.26 * s, -0.68 * s, 0.26 * s, 0.11 * s, -0.6); C(0, -0.5 * s, 0.09 * s); C(0.02 * s, -0.62 * s, 0.08 * s);
    }
  }
  // Molded lines on a shape (drawn inside its clip).
  function gummyDetails(sh, s, color) {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(1, s * 0.07); ctx.lineCap = "round";
    if (sh === "slice") {
      ctx.beginPath(); ctx.arc(0, 0.35 * s, s * 0.82, Math.PI, TAU); ctx.stroke();
      for (let k = 1; k < 6; k++) {
        const a = Math.PI + k * Math.PI / 6;
        ctx.beginPath(); ctx.moveTo(0, 0.3 * s); ctx.lineTo(Math.cos(a) * s * 0.72, 0.35 * s + Math.sin(a) * s * 0.72); ctx.stroke();
      }
    } else if (sh === "strawberry") {
      ctx.fillStyle = color;
      [[-0.4, -0.2], [0, -0.25], [0.4, -0.2], [-0.25, 0.15], [0.25, 0.15], [0, 0.5], [-0.5, 0.2], [0.5, 0.2]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.ellipse(x * s, y * s, s * 0.05, s * 0.08, 0, 0, TAU); ctx.fill();
      });
    } else if (sh === "worm") {
      for (let k = 1; k < 8; k++) {
        const u = -1.6 + 3.2 * k / 8, y = 0.22 * s * Math.sin(u * 2.4);
        ctx.beginPath(); ctx.moveTo(u * s - 0.05 * s, y - 0.24 * s); ctx.lineTo(u * s + 0.05 * s, y + 0.24 * s); ctx.stroke();
      }
    } else if (sh === "bear") {
      ctx.beginPath(); ctx.ellipse(0, 0.3 * s, 0.28 * s, 0.32 * s, 0, 0, TAU); ctx.stroke();
    }
  }
  // A gummy at (x, y). o: { wob, ph, rot, k (scale), coat, liquid (0..1 for a soft unset fill), t }
  function drawGummy(sh, x, y, s, col, o) {
    o = o || {};
    const a = o.wob ? o.wob * Math.sin(o.ph || 0) : 0, k = o.k == null ? 1 : o.k;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(k, k);
    const base = s * EXTENT[sh][1];
    ctx.translate(0, base); ctx.scale(1 + a, 1 - a); ctx.translate(0, -base);
    gummyPath(sh, s);
    ctx.lineJoin = "round";
    if (o.liquid != null) {
      ctx.globalAlpha = 0.25 + 0.6 * o.liquid;
      ctx.fillStyle = col; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save(); ctx.clip();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(-0.25 * s, -0.3 * s, s * 0.35, s * 0.12, -0.3, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.restore();
      return;
    }
    const tiny = s * k * vs < 9;
    ctx.lineWidth = tiny ? 1.4 / Math.max(0.2, k) : Math.max(2, s * 0.1) * 2;
    ctx.strokeStyle = INK; ctx.stroke();
    if (tiny) { ctx.fillStyle = col; ctx.fill(); ctx.restore(); return; }
    const g = ctx.createRadialGradient(-0.3 * s, -0.4 * s, s * 0.1, 0, 0, s * 1.5);
    g.addColorStop(0, shade(col, 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, shade(col, -0.3));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    gummyDetails(sh, s, shade(col, -0.18));
    if (o.coat === "sour" || o.coat === "sugar") {
      ctx.fillStyle = o.coat === "sour" ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.42)";
      ctx.fillRect(-2 * s, -1.2 * s, 4 * s, 2.4 * s);
      const n = o.coat === "sour" ? 26 : 50, ex = EXTENT[sh];
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      for (let i = 0; i < n; i++) {
        const px = (hash(i, 3) * 2 - 1) * ex[0] * s, py = (hash(i, 7) * 2 - 1) * ex[1] * s;
        const z = o.coat === "sour" ? s * (0.06 + hash(i, 9) * 0.05) : s * 0.035;
        if (o.coat === "sour") { ctx.save(); ctx.translate(px, py); ctx.rotate(hash(i, 5) * 3); ctx.fillRect(-z, -z, z * 2, z * 2); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(px, py, z, 0, TAU); ctx.fill(); }
      }
    }
    // The glossy highlight (stronger when Shiny).
    const shiny = o.coat === "shiny";
    ctx.fillStyle = shiny ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.ellipse(-0.25 * s, -0.35 * s, s * (shiny ? 0.3 : 0.24), s * 0.11, -0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0.15 * s, -0.5 * s, s * 0.06, 0, TAU); ctx.fill();
    ctx.restore();
    // Sour crystals and shiny gummies glint now and then.
    if ((o.coat === "sour" || shiny) && o.t != null) {
      const ph = (o.t * 0.7 + (o.seed || 0)) % 1;
      if (ph < 0.25) star(0.3 * s, -0.2 * s, s * 0.28 * Math.sin(ph / 0.25 * Math.PI));
    }
    ctx.restore();
  }
  function star(x, y, r) {
    if (r <= 0.5) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fs(fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.stroke(); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  const rgbOf = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  function shade(h, t) {
    const c = rgbOf(h), to = t > 0 ? 255 : 0, k = Math.abs(t);
    return "rgb(" + c.map((v) => Math.round(v + (to - v) * k)).join(",") + ")";
  }
  const rgba = (h, a) => "rgba(" + rgbOf(h).join(",") + "," + a + ")";
  function mixHex(a, b, t) {
    const x = rgbOf(a), y = rgbOf(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  // =====================================================================================================
  // Drawing the shop
  // =====================================================================================================
  function drawRoom() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wy = voy + L.wall * vs, fy = voy + L.front * vs;
    // Striped wallpaper, a marble counter top and a mint counter front, past the world's edges.
    ctx.fillStyle = "#FFE3EC"; ctx.fillRect(0, 0, W, wy);
    ctx.fillStyle = "#FFD0DF";
    const sw = 22 * vs;
    for (let x = vox % (sw * 2) - sw * 2; x < W; x += sw * 2) ctx.fillRect(x, 0, sw, wy);
    ctx.fillStyle = "#F7F1EA"; ctx.fillRect(0, wy, W, fy - wy);
    ctx.fillStyle = "#8ED9C6"; ctx.fillRect(0, fy, W, H - fy);
    ctx.fillStyle = "#7CCAB7";
    for (let x = vox % (sw * 2) - sw * 2; x < W; x += sw * 2) ctx.fillRect(x, fy, sw, H - fy);
    ctx.strokeStyle = INK; ctx.lineWidth = LW * vs;
    ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
    // Shelves.
    L.shelves.forEach((s) => {
      rr(s.x0, s.y, s.x1 - s.x0, 10, 3); fs("#C98B5A");
      [s.x0 + 24, s.x1 - 24].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, s.y + 10); ctx.lineTo(x - 8, s.y + 26); ctx.lineTo(x + 8, s.y + 26); ctx.closePath(); fs("#B07546"); });
    });
  }

  // =====================================================================================================
  // Drawing the pot, bottles, mold, bowls, fridge and jar
  // =====================================================================================================
  // A flavor bottle with its fruit on the label. (x, y) = the bottom middle.
  function drawBottle(i, x, y, ang, t) {
    const f = FLAVORS[i], w = L.bw, h = L.bh;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    rr(-w * 0.18, -h, w * 0.36, h * 0.16, 3); fs(shade(f.hex, -0.35));
    ctx.beginPath(); ctx.moveTo(-w * 0.16, -h * 0.84); ctx.lineTo(w * 0.16, -h * 0.84); ctx.lineTo(w * 0.5, -h * 0.6); ctx.lineTo(w * 0.5, 0); ctx.lineTo(-w * 0.5, 0); ctx.lineTo(-w * 0.5, -h * 0.6); ctx.closePath();
    fs("rgba(225,242,255,0.75)");
    ctx.save(); ctx.clip();
    ctx.fillStyle = rgba(f.hex, 0.85); ctx.fillRect(-w, -h * 0.66, w * 2, h);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-w * 0.16, -h * 0.84); ctx.lineTo(w * 0.16, -h * 0.84); ctx.lineTo(w * 0.5, -h * 0.6); ctx.lineTo(w * 0.5, 0); ctx.lineTo(-w * 0.5, 0); ctx.lineTo(-w * 0.5, -h * 0.6); ctx.closePath();
    ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ell(0, -h * 0.34, w * 0.34, w * 0.34); fs("#FFFFFF", 2);
    drawFruit(f.id, 0, -h * 0.34, w * 0.27);
    ctx.fillStyle = "rgba(255,255,255,0.55)"; rr(-w * 0.42, -h * 0.58, w * 0.1, h * 0.5, 3); ctx.fill();
    ctx.restore();
    void t;
  }
  // The fruit on a bottle's label.
  function drawFruit(id, x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = 1.6; ctx.strokeStyle = INK;
    const leaf = (lx, ly, a) => { ctx.beginPath(); ctx.ellipse(lx, ly, r * 0.34, r * 0.16, a, 0, TAU); fs("#4CB33E", 1.4); };
    if (id === "cherry") {
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.1); ctx.quadraticCurveTo(-r * 0.1, -r * 0.5, r * 0.25, -r * 0.85); ctx.moveTo(r * 0.4, r * 0.15); ctx.quadraticCurveTo(r * 0.3, -r * 0.4, r * 0.25, -r * 0.85); ctx.stroke();
      ell(-r * 0.42, r * 0.4, r * 0.38, r * 0.38); fs("#E8303F", 1.4); ell(r * 0.42, r * 0.45, r * 0.36, r * 0.36); fs("#E8303F", 1.4);
    } else if (id === "orange" || id === "lime") {
      const c = id === "orange" ? "#FF8A1F" : "#5CC93A";
      ell(0, 0, r * 0.85, r * 0.85); fs(c, 1.4);
      ell(0, 0, r * 0.62, r * 0.62); fs(shade(c, 0.45), 1.2);
      for (let k = 0; k < 6; k++) { const a = k * TAU / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); ctx.stroke(); }
    } else if (id === "lemon") {
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.6, -0.3, 0, TAU); fs("#FFD23B", 1.4);
      leaf(r * 0.45, -r * 0.6, -0.6);
    } else if (id === "blue") {
      for (let k = 0; k < 7; k++) { const a = k * TAU / 6, d = k === 6 ? 0 : r * 0.42; ell(Math.cos(a) * d, Math.sin(a) * d + r * 0.1, r * 0.26, r * 0.26); fs("#2F8CFF", 1.2); }
      leaf(0, -r * 0.65, 0);
    } else if (id === "grape") {
      [[0, -0.45], [-0.35, -0.15], [0.35, -0.15], [0, 0.15], [-0.25, 0.45], [0.25, 0.45], [0, 0.72]].forEach(([gx, gy]) => { ell(gx * r, gy * r, r * 0.25, r * 0.25); fs("#8E4FD9", 1.2); });
      leaf(r * 0.35, -r * 0.8, -0.4);
    } else if (id === "strawberry") {
      ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.bezierCurveTo(-r * 0.7, r * 0.3, -r * 0.85, -r * 0.4, 0, -r * 0.45); ctx.bezierCurveTo(r * 0.85, -r * 0.4, r * 0.7, r * 0.3, 0, r * 0.9); fs("#FF4F6A", 1.4);
      leaf(-r * 0.25, -r * 0.55, -0.4); leaf(r * 0.25, -r * 0.55, 0.4);
      ctx.fillStyle = "#FFE9A8";
      [[-0.25, 0], [0.25, 0], [0, 0.35], [0, -0.2]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx * r, sy * r, r * 0.06, 0, TAU); ctx.fill(); });
    }
    ctx.restore();
  }
  function drawBottles(t) {
    L.bottles.forEach(([x, y], i) => {
      if (V.carry && V.carry.i === i) return;
      drawBottle(i, x, y, Math.sin(t * 30) * 0.15 * V.bwob[i], t);
    });
  }
  function drawPlate() {
    const p = L.plate, top = p.y + p.top;
    // The hot plate: a box with a burner on top and the knob on its front.
    rr(p.x, p.y, p.w, p.h, 8); fs("#E7ECF2");
    ctx.beginPath(); ctx.moveTo(p.x, top); ctx.lineTo(p.x + p.w, top); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    ell(L.pot.x, L.pot.y, L.pot.w * 0.42, 9); fs("#3A3F4B");
    if (V.heat > 0.01) {
      const n = 12;
      for (let k = 0; k < n; k++) {
        const a = k / n * TAU, fx = L.pot.x + Math.cos(a) * L.pot.w * 0.4, fy = L.pot.y + Math.sin(a) * 8;
        const fl = (8 + Math.sin(now() * 14 + k * 1.7) * 3) * V.heat;
        ctx.beginPath(); ctx.moveTo(fx - 4, fy); ctx.quadraticCurveTo(fx, fy - fl * 1.6, fx + 4, fy); ctx.closePath();
        ctx.fillStyle = "rgba(70,140,255,0.9)"; ctx.fill();
        ctx.beginPath(); ctx.moveTo(fx - 2, fy); ctx.quadraticCurveTo(fx, fy - fl * 0.8, fx + 2, fy); ctx.closePath();
        ctx.fillStyle = "rgba(200,230,255,0.9)"; ctx.fill();
      }
    }
    // Knob: the pointer turns from up (off) to sideways (on).
    const kx = L.pot.x, ky = top + (p.h - p.top) / 2, kr = (p.h - p.top) * 0.36;
    ell(kx, ky, kr, kr); fs("#FFFFFF");
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(V.knob * Math.PI / 2);
    rr(-kr * 0.22, -kr * 0.95, kr * 0.44, kr * 1.3, 3); fs("#E8303F", 1.8);
    ctx.restore();
    // The light beside the knob glows while the plate is on.
    ell(p.x + p.w - 18, ky, 5, 5); fs(V.knob > 0.5 ? "#FF7A2E" : "#B9C1CC", 1.6);
  }
  function knobPt() { const p = L.plate, top = p.y + p.top; return { x: L.pot.x, y: top + (p.h - p.top) / 2, r: (p.h - p.top) * 0.6 }; }
  function drawPot(t) {
    const P = L.pot, rim = potRim(), rx = P.w / 2, ry = 14;
    // The handle (to the right) and the inside of the pot.
    rr(P.x + rx - 6, rim + 8, 64, 12, 6); fs("#3A3F4B");
    ell(P.x, rim, rx, ry); fs("#9AA5B4");
    ell(P.x, rim + 3, rx - 6, ry - 4); ctx.fillStyle = "#5B6573"; ctx.fill();
    if (V.level > 0.02) {
      const sy = surfY() + Math.sin(t * 14) * 3 * V.slosh, srx = (rx - 8) * (0.85 + 0.15 * V.level), sry = ry - 5;
      const col = mixHex(hex(), "#F3EEE6", V.cloud * 0.6);
      ctx.save();
      ell(P.x, rim + 3, rx - 6, ry - 4); ctx.clip();
      ell(P.x, sy, srx, sry); ctx.fillStyle = col; ctx.fill();
      // Cloudy grains before it is clear, bubbles while it heats, a gloss when it is clear.
      if (V.cloud > 0.05) {
        ctx.fillStyle = "rgba(255,255,255," + (0.8 * V.cloud) + ")";
        for (let k = 0; k < 18; k++) { ctx.beginPath(); ctx.arc(P.x + (hash(k, 1) - 0.5) * srx * 1.7, sy + (hash(k, 2) - 0.5) * sry * 1.4, 1.6, 0, TAU); ctx.fill(); }
      }
      if (V.heat > 0.3) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.5;
        for (let k = 0; k < 5; k++) {
          const ph = (t * 0.9 + hash(k, 4)) % 1;
          ctx.beginPath(); ctx.arc(P.x + (hash(k, 6) - 0.5) * srx * 1.4, sy + (hash(k, 8) - 0.5) * sry, 1 + ph * 3, 0, TAU); ctx.stroke();
        }
      }
      ctx.fillStyle = "rgba(255,255,255," + (0.2 + 0.4 * V.clear) + ")";
      ctx.beginPath(); ctx.ellipse(P.x - srx * 0.35, sy - 1, srx * 0.3, 2.5, 0, 0, TAU); ctx.fill();
      // The swirl the whisk leaves while he stirs.
      if (V.swirlV > 0.02) {
        ctx.strokeStyle = "rgba(255,255,255," + (0.7 * V.swirlV) + ")"; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          const a0 = V.swirl + k * TAU / 3, rr0 = srx * (0.35 + 0.18 * k);
          ctx.beginPath(); ctx.ellipse(P.x, sy, rr0, rr0 * sry / srx, 0, a0, a0 + 1.6); ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (V.whiskShow > 0.01) drawWhisk();
    // The front of the pot.
    ctx.beginPath(); ctx.moveTo(P.x - rx, rim); ctx.ellipse(P.x, rim, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(P.x + rx, P.y - 10); ctx.quadraticCurveTo(P.x + rx, P.y, P.x + rx - 12, P.y);
    ctx.lineTo(P.x - rx + 12, P.y); ctx.quadraticCurveTo(P.x - rx, P.y, P.x - rx, P.y - 10); ctx.closePath();
    fs("#B8C2CF");
    ctx.fillStyle = "rgba(255,255,255,0.45)"; rr(P.x - rx + 10, rim + 18, 10, P.h - 36, 5); ctx.fill();
  }
  function whiskPt() { return { x: V.whisk.x, y: V.whisk.y }; }
  function drawWhisk() {
    const w = whiskPt(), al = V.whiskShow, hx = w.x + 26, hy = w.y - 76;
    ctx.globalAlpha = al;
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath(); ctx.ellipse(w.x + 10, w.y - 18, 5 + Math.abs(k) * 3.2, 22, 0.35, 0, TAU);
      ctx.strokeStyle = "#7D8796"; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = "#DCE3EC"; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(w.x + 16, w.y - 34); ctx.lineTo(hx, hy); ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.stroke();
    ctx.strokeStyle = "#FF8FB7"; ctx.lineWidth = 6; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function drawGel() {
    const p = V.gelPose || { x: L.gel.x, y: L.gel.y, ang: 0 }, al = V.gelPose ? 1 : V.gelShow;
    if (al <= 0.01) return;
    ctx.save(); ctx.globalAlpha = al; ctx.translate(p.x, p.y); ctx.rotate(p.ang + Math.sin(now() * 30) * 0.15 * V.gelWob);
    // A small bowl heaped with gelatin and sugar.
    ctx.beginPath(); ctx.ellipse(0, -10, 34, 9, 0, 0, TAU); fs("#FFFFFF");
    if (!V.gelPose || Math.abs(p.ang) < 0.8) { ctx.beginPath(); ctx.moveTo(-26, -10); ctx.quadraticCurveTo(0, -36, 26, -10); ctx.closePath(); fs("#FFF8E6", 1.8); ctx.fillStyle = "#E9DFC8"; for (let k = 0; k < 8; k++) ctx.fillRect(-16 + k * 4.5, -14 - (k % 3) * 4, 2, 2); }
    ctx.beginPath(); ctx.moveTo(-34, -10); ctx.quadraticCurveTo(-30, 14, 0, 14); ctx.quadraticCurveTo(30, 14, 34, -10); ctx.ellipse(0, -10, 34, 9, 0, 0, Math.PI); ctx.closePath();
    fs("#6EC6F0");
    ctx.restore();
  }
  function drawCarry(t) {
    if (V.stream && V.carry) {
      const s = V.stream, sy = surfY();
      ctx.globalAlpha = s.a; ctx.strokeStyle = rgba(FLAVORS[V.carry.i].hex, 0.9); ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.quadraticCurveTo(s.x - 6, (s.y + sy) / 2, L.pot.x + 8, sy); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (V.carry) drawBottle(V.carry.i, V.carry.x, V.carry.y, V.carry.ang, t);
  }
  // The silicone mold with its shapes, empty, filling or firm.
  function drawMold(t) {
    const m = V.mold;
    if (!m.show || m.inFridge) return;
    ctx.save(); ctx.globalAlpha = m.alpha;
    ctx.translate(m.x, m.y - m.lift); ctx.scale(m.k, m.k * m.flip);
    rr(-MOLD_W / 2, -MOLD_H / 2, MOLD_W, MOLD_H, 18); fs(m.flip < 0 ? "#7FCDBB" : "#9EE3D2");
    if (m.flip > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.35)"; rr(-MOLD_W / 2 + 8, -MOLD_H / 2 + 6, MOLD_W - 16, 10, 5); ctx.fill();
      MOLD_BY[B.mold].cav.forEach((c, k) => {
        ctx.save(); ctx.translate(c.dx, c.dy);
        gummyPath(c.sh, c.s * 1.08);
        ctx.fillStyle = "#6FBFAD"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#3E8F7E"; ctx.stroke();
        ctx.restore();
        const lv = V.cavLevel[k] || 0, gk = B.gum[k];
        if (gk && gk.where !== "mold") return;
        if (V.set && lv > 0) drawGummy(c.sh, c.dx, c.dy, c.s, hex(), { t, seed: k * 0.3 });
        else if (lv > 0.01) drawGummy(c.sh, c.dx, c.dy, c.s * (0.7 + 0.3 * lv), hex(), { liquid: lv });
      });
      if (V.set && B.step === "pop") {
        ctx.fillStyle = "rgba(220,240,255,0.25)"; rr(-MOLD_W / 2, -MOLD_H / 2, MOLD_W, MOLD_H, 18); ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawTray() {
    if (V.tray <= 0.01) return;
    ctx.save(); ctx.globalAlpha = V.tray;
    rr(L.work.x - MOLD_W / 2 - 10, L.work.y - MOLD_H / 2 - 6, MOLD_W + 20, MOLD_H + 12, 10); fs("#D9DFE7");
    rr(L.work.x - MOLD_W / 2, L.work.y - MOLD_H / 2 + 2, MOLD_W, MOLD_H - 4, 6); fs("#FFFDF7", 1.6);
    ctx.restore();
  }
  function drawGummies(where, t) {
    B.gum.forEach((g, i) => {
      if (g.hide || g.where === "jar" || g.where === "mold" || g.where === "bowl") return;
      if ((where === "air") !== (g.where === "air" || g.where === "drag")) return;
      drawGummy(g.sh, g.x, g.y, g.s, hex(), { wob: g.wob, ph: g.ph, rot: g.rot, k: g.sc, coat: g.coat, t, seed: i * 0.27 });
    });
  }
  function drawBowls(t) {
    if (V.bowls <= 0.01) return;
    COATS.forEach((c, i) => {
      const b = bowlPos(i), dy = (1 - V.bowls) * 80, shake = V.bowlShake === i ? V.shakeAmt : 0;
      ctx.save(); ctx.globalAlpha = V.bowls; ctx.translate(b.x + shake * 6, b.y + dy); ctx.rotate(shake * 0.12);
      ell(0, 0, 38, 10); fs("#FFFFFF");
      // What is in each bowl: sour crystals, fine sugar, or a little oil.
      ell(0, 1, 32, 7);
      ctx.fillStyle = c.id === "shiny" ? "#FFE89A" : "#FFFFFF"; ctx.fill();
      if (c.id === "sour") { ctx.fillStyle = "#CFE6F5"; for (let k = 0; k < 14; k++) ctx.fillRect(-26 + k * 4, -2 + (k % 3) * 2, 3, 3); }
      else if (c.id === "sugar") { ctx.fillStyle = "#E8E2D6"; for (let k = 0; k < 20; k++) ctx.fillRect(-27 + k * 2.8, -1 + (k % 4) * 1.5, 1.4, 1.4); }
      else { ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.beginPath(); ctx.ellipse(-8, -1, 10, 2, 0, 0, TAU); ctx.fill(); }
      if (V.bowlShake === i) { ctx.save(); ctx.translate(0, 0); drawGummiesIn(t); ctx.restore(); }
      ctx.beginPath(); ctx.moveTo(-38, 0); ctx.quadraticCurveTo(-34, 30, 0, 30); ctx.quadraticCurveTo(34, 30, 38, 0); ctx.ellipse(0, 0, 38, 10, 0, 0, Math.PI); ctx.closePath();
      fs(["#FF9CC2", "#FFC93C", "#8ED0FF"][i]);
      ctx.fillStyle = INK; ctx.font = "700 15px 'Baloo 2', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(c.short, 0, 18);
      ctx.restore();
    });
  }
  // Gummies being tossed in the shaking bowl, drawn in the bowl's own frame.
  function drawGummiesIn(t) {
    const n = B.gum.filter((g) => g.where === "bowl").length;
    B.gum.forEach((g, i) => {
      if (g.where !== "bowl") return;
      const x = ((g.bj || 0) - (n - 1) / 2) * 13, y = -6 - Math.abs(Math.sin(t * 12 + i * 1.3)) * 10 * Math.abs(V.shakeAmt);
      drawGummy(g.sh, x, y, g.s, hex(), { k: 0.5, rot: Math.sin(t * 9 + i) * 0.5, coat: g.coat, t });
    });
  }
  function drawDropper() {
    const d = V.drop;
    if (d.show <= 0.01) return;
    ctx.save(); ctx.globalAlpha = d.show; ctx.translate(d.x, d.y);
    // The candy dropper: a soft bulb on a clear tube; the tip is at (0, 0).
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-9, -46); ctx.lineTo(9, -46); ctx.lineTo(6, -8); ctx.lineTo(2, 0); ctx.lineTo(-2, 0); ctx.closePath();
    fs("rgba(225,242,255,0.8)", 2);
    if (d.fillAmt > 0.02) {
      ctx.save(); ctx.clip();
      ctx.fillStyle = rgba(hex(), 0.85); ctx.fillRect(-12, -46 * Math.min(1, d.fillAmt) - 2, 24, 50);
      ctx.restore();
    }
    const sq = d.squeeze;
    ctx.beginPath(); ctx.ellipse(0, -60, 15 * (1 + 0.25 * sq), 17 * (1 - 0.25 * sq), 0, 0, TAU); fs("#FF7FA8");
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(-5, -66, 4, 6, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawFridge() {
    const F = L.fridge, x = F.x, y = F.y, w = F.w, h = F.h, sy = y + F.split;
    rr(x, y, w, h, 12); fs("#F2F6FA");
    // Freezer door on top.
    rr(x + 5, y + 5, w - 10, F.split - 10, 8); fs("#FFFFFF", 2);
    rr(x + 12, y + F.split - 46, 8, 34, 4); fs("#B9C4D0", 1.8);
    const dh = h - F.split - 8;
    if (V.door > 0.01) {
      // Inside: light, shelves, and the mold while it chills.
      rr(x + 5, sy, w - 10, dh, 6); fs("#E6F6FF", 2);
      ctx.strokeStyle = "#B7D6EA"; ctx.lineWidth = 3;
      [0.32, 0.6].forEach((k) => { ctx.beginPath(); ctx.moveTo(x + 8, sy + dh * k + 26); ctx.lineTo(x + w - 8, sy + dh * k + 26); ctx.stroke(); });
    }
    if (V.mold.inFridge && V.door > 0.01) {
      const m = V.mold;
      ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.k, m.k);
      rr(-MOLD_W / 2, -MOLD_H / 2, MOLD_W, MOLD_H, 18); fs("#9EE3D2", LW / m.k);
      ctx.restore();
    }
    // The door swings open to the left on its hinge.
    const o = V.door, dw = (w - 10) * (1 - o * 0.82);
    ctx.beginPath();
    ctx.moveTo(x + 5, sy); ctx.lineTo(x + 5 - (w - 10) * 0.18 * o - (o > 0 ? 0 : 0), sy - 10 * o);
    ctx.lineTo(x + 5 - (w - 10) * 0.18 * o, sy + dh + 10 * o); ctx.lineTo(x + 5, sy + dh); ctx.closePath();
    if (o > 0.01) fs("#FFFFFF", 2);
    if (o < 0.99) {
      rr(x + 5, sy, dw, dh, 8); fs("#FFFFFF", 2);
      if (dw > 30) { rr(x + 5 + dw - 20, sy + 14, 8, 60, 4); fs("#B9C4D0", 1.8); }
      if (V.frost > 0.01) {
        ctx.save(); rr(x + 5, sy, dw, dh, 8); ctx.clip();
        ctx.fillStyle = "rgba(190,230,255," + (0.55 * V.frost) + ")"; ctx.fillRect(x, sy, w, dh);
        ctx.strokeStyle = "rgba(255,255,255," + V.frost + ")"; ctx.lineWidth = 2;
        for (let k = 0; k < 6; k++) {
          const fx = x + 10 + hash(k, 2) * (dw - 20), fy = sy + 20 + hash(k, 3) * (dh - 40), r = 6 + hash(k, 4) * 6;
          for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; ctx.beginPath(); ctx.moveTo(fx - Math.cos(an) * r, fy - Math.sin(an) * r); ctx.lineTo(fx + Math.cos(an) * r, fy + Math.sin(an) * r); ctx.stroke(); }
        }
        ctx.restore();
      }
    }
  }
  // Positions of the gummies in a jar: rows from the bottom, normalized to the jar's inside (0..1).
  function pileSpot(i, cols, rows) {
    const row = Math.floor(i / cols), col = i % cols;
    const x = (col + 0.5 + (row % 2 ? 0.25 : -0.25) + (hash(i, 11) - 0.5) * 0.3) / cols;
    const y = 1 - (row + 0.55 + (hash(i, 13) - 0.5) * 0.2) / rows;
    return { x: clamp(x, 0.08, 0.92), y, rot: (hash(i, 17) - 0.5) * 1.6 };
  }
  // The candy jar: glass with a short neck and a striped pink lid, his gummies inside. (x, y) = the bottom middle.
  function drawJar(x, y, w, h, t, big, wobs) {
    const lw = LW * (big ? 1.4 : 1), neck = h * 0.08, lidH = h * 0.1, top = y - h + lidH + neck;
    const body = () => { rr(x - w / 2, top, w, y - top, w * 0.2); };
    body(); ctx.fillStyle = "rgba(220,240,255,0.45)"; ctx.fill();
    // Gummies inside.
    const cols = big ? 6 : 5, rows = big ? 8 : 10, ix = x - w / 2 + w * 0.08, iw = w * 0.84, iy = top + h * 0.05, ih = y - top - h * 0.08;
    const s = iw / cols * (big ? 0.5 : 0.42);
    ctx.save(); body(); ctx.clip();
    jar.forEach((e, i) => {
      const p = pileSpot(i, cols, rows), wb = wobs && wobs[i];
      const bounce = V.jarBounce * Math.sin(t * 20 + i) * (big ? 0 : 1.5);
      const sz = e.s === "worm" ? s * 0.55 : s;
      drawGummy(e.s, ix + p.x * iw, iy + p.y * ih + bounce - (wb ? wb.hop : 0), sz, FLAVORS[e.f].hex,
        { rot: p.rot, coat: e.c, wob: wb ? wb.wob : 0, ph: wb ? wb.ph : 0, t: big ? t : null, seed: i * 0.31 });
    });
    ctx.restore();
    body(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)"; rr(x - w / 2 + w * 0.1, top + h * 0.08, w * 0.07, (y - top) * 0.7, w * 0.035); ctx.fill();
    // The neck, and the lid (it lifts and tips back while gummies go in).
    rr(x - w * 0.34, top - neck - 2, w * 0.68, neck + 4, 3); ctx.fillStyle = "rgba(220,240,255,0.7)"; ctx.fill(); ctx.lineWidth = lw; ctx.stroke();
    const lift = big ? 0 : V.lid * h * 0.3, tilt = big ? 0 : V.lid * -0.18, lx = x - w * 0.4, ly = top - neck;
    ctx.save(); ctx.translate(lx, ly - lift); ctx.rotate(tilt);
    const lid = () => rr(0, -lidH, w * 0.8, lidH, lidH * 0.35);
    lid(); ctx.fillStyle = "#FF7FA8"; ctx.fill();
    ctx.save(); lid(); ctx.clip(); ctx.fillStyle = "#FFFFFF";
    for (let k = 0; k < 5; k++) ctx.fillRect(w * (0.06 + k * 0.16), -lidH, w * 0.07, lidH);
    ctx.restore();
    lid(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  function drawParts() {
    parts.forEach((p) => {
      const a = 1 - p.t / p.life;
      if (p.kind === "steam") { ctx.fillStyle = "rgba(255,255,255," + 0.45 * a + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + p.t), 0, TAU); ctx.fill(); }
      else if (p.kind === "spark") { ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); star(0, 0, p.size); ctx.restore(); ctx.fillStyle = p.color; ctx.globalAlpha = a * 0.8; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      else if (p.kind === "flake") { ctx.strokeStyle = "rgba(255,255,255," + a + ")"; ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(p.x - Math.cos(an) * p.size, p.y - Math.sin(an) * p.size); ctx.lineTo(p.x + Math.cos(an) * p.size, p.y + Math.sin(an) * p.size); ctx.stroke(); } }
      else { ctx.fillStyle = p.kind === "drop" ? rgba(p.color, a) : "rgba(255,255,255," + a + ")"; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
    });
  }

  // =====================================================================================================
  // The jar view
  // =====================================================================================================
  // The Jar button (or a tap on the jar) shows the candy jar big; every gummy in it jiggles when tapped.
  let jarOpen = false, jv = { a: 0, wobs: [] };
  function jarRect() {
    const h = Math.min(H * 0.64, W * 0.66 / 0.8), w = h * 0.8;
    return { x: W / 2, y: H / 2 + h / 2, w, h };
  }
  function openJar(on) {
    if (on === jarOpen) return;
    jarOpen = on;
    bar.shelfOpen(on);
    jv.wobs = jar.map(() => ({ wob: 0, ph: 0, hop: 0, v: 0 }));
    lastWant = "";
    if (on) { coach.step(jar.length ? "Tap a gummy to make it wiggle." : "The candy jar is empty. Make some gummies!"); ghost.stop(); }
    tween(0.3, (p) => { jv.a = on ? ease(p) : 1 - ease(p); });
  }
  function jvSpot(i) {
    // Same spots as drawJar's big jar.
    const r = jarRect(), top = r.y - r.h * 0.82, cols = 6, rows = 8;
    const ix = r.x - r.w / 2 + r.w * 0.08, iw = r.w * 0.84, iy = top + r.h * 0.05, ih = r.y - top - r.h * 0.08;
    const p = pileSpot(i, cols, rows);
    return { x: ix + p.x * iw, y: iy + p.y * ih, s: iw / cols * 0.5 };
  }
  function jvHit(sx, sy) {
    let best = -1, bd = Infinity;
    jar.forEach((e, i) => { const p = jvSpot(i), d = Math.hypot(sx - p.x, sy - p.y); if (d < p.s * 1.3 && d < bd) { bd = d; best = i; } });
    return best;
  }
  function jvPoke(i) {
    const w = jv.wobs[i]; if (!w) return;
    w.wob = 0.4; w.ph = 0; w.v = 160;
    snd.boing();
  }
  function drawJarView(t) {
    if (jv.a <= 0.01) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(29,35,64," + 0.5 * jv.a + ")"; ctx.fillRect(0, 0, W, H);
    const r = jarRect();
    ctx.save(); ctx.globalAlpha = jv.a;
    ctx.translate(r.x, r.y); ctx.scale(0.8 + 0.2 * jv.a, 0.8 + 0.2 * jv.a); ctx.translate(-r.x, -r.y);
    const svs = vs; vs = 1;
    drawJar(r.x, r.y, r.w, r.h, t, true, jv.wobs);
    vs = svs;
    ctx.restore();
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  function want() {
    if (busy || jarOpen) return null;
    switch (B.step) {
      case "flavor": return { line: pourLine(), part: B.flavor >= 0 ? "bottle" + B.flavor : "bottles" };
      case "gel": return { line: "Tip the gelatin and sugar into the pot.", part: "gel" };
      case "heat": return { line: "Turn the knob to heat the pot.", part: "knob" };
      case "stir": return V.knob < 0.5 ? { line: "Turn the knob to heat the pot.", part: "knob" } : { line: "Stir the pot with the whisk.", part: "whisk" };
      case "fill": { const k = nextEmpty(); return k < 0 ? null : { line: "Fill the mold with the candy dropper.", part: "cav" + k }; }
      case "chill": return { line: "Put the mold in the fridge.", part: "mold" };
      case "pop": { const g = inMold()[0]; return g ? { line: "Push the gummies out of the mold.", part: "pop" + g.k } : null; }
      case "coat": return { line: "Put the gummies in a bowl: sour, sugar or shiny.", part: "bowls" };
      case "jar": return { line: "Put the gummies in the candy jar.", part: "jar" };
    }
    return null;
  }
  function partPt(part) {
    if (part === "gel") return { x: L.gel.x, y: L.gel.y - 10, r: 40 };
    if (part === "knob") return knobPt();
    if (part === "whisk") { const w = whiskPt(); return { x: w.x + 14, y: w.y - 24, r: 40 }; }
    if (part === "pot") return { x: L.pot.x, y: L.pot.y - L.pot.h * 0.5, r: L.pot.w * 0.55 };
    if (part === "mold") return { x: V.mold.x, y: V.mold.y, r: MOLD_W * 0.5 };
    if (part === "fridge") return { x: L.fridge.x + L.fridge.w / 2, y: L.fridge.y + L.fridge.h * 0.5, r: L.fridge.w * 0.6 };
    if (part === "jar") return { x: L.jar.x, y: L.jar.y - L.jar.h / 2, r: L.jar.w * 0.65 };
    if (part === "dropper") return { x: V.drop.x, y: V.drop.y - 40, r: 30 };
    if (part === "bowls") return { x: L.bowls.xs[1], y: L.bowls.y, r: 40 };
    if (/^(cav|pop)\d$/.test(part)) { const c = cavPos(+part.slice(3)); return { x: c.x, y: c.y, r: c.s * 1.1 }; }
    if (/^bottle\d$/.test(part)) { const [x, y] = L.bottles[+part.slice(6)]; return { x, y: y - L.bh * 0.45, r: L.bw * 0.7 }; }
    if (/^bowl\d$/.test(part)) { const b = bowlPos(+part.slice(4)); return { x: b.x, y: b.y + 8, r: 40 }; }
    if (/^gum\d$/.test(part)) { const g = B.gum[+part.slice(3)]; return g ? { x: g.x, y: g.y, r: g.s } : null; }
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked() || drag) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const ring = (x, y, r) => {
      ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 4, 0, TAU);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    };
    const box = (x, y, bw, bh, r) => {
      const g = 4 + pulse * 4;
      rr(x - bw / 2 - g, y - bh / 2 - g, bw + g * 2, bh + g * 2, r + g);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    };
    if (w.part === "bottles") L.bottles.forEach(([x, y]) => ring(x, y - L.bh * 0.42, L.bw * 0.62));
    else if (w.part === "mold") box(V.mold.x, V.mold.y - V.mold.lift, MOLD_W, MOLD_H, 18);
    else if (w.part === "jar") box(L.jar.x, L.jar.y - L.jar.h / 2, L.jar.w, L.jar.h, 14);
    else if (w.part === "bowls") L.bowls.xs.forEach((x) => ring(x, L.bowls.y + 6, 42));
    else { const p = partPt(w.part); if (p) ring(p.x, p.y, Math.min(p.r, 70)); }
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = "";
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if (jarOpen || drag) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    const p = w.part === "bottles" ? { x: L.pot.x, y: L.bottles[0][1] - L.bh / 2 } : partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  // The ghost hand shows a tap first and the real move (a drag) after that.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag) return null;
      const w = want();
      if (!w) return null;
      const key = w.part.replace(/\d$/, "").replace(/^bottle$/, "bottles"), first = ghost.shown(key) < 1;
      const P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const potTop = P(L.pot.x + L.pot.w * 0.6, potRim() - 40);
      if (w.part === "bottles" || /^bottle\d$/.test(w.part)) {
        const i = B.flavor >= 0 ? B.flavor : 2, b = P(L.bottles[i][0], L.bottles[i][1] - L.bh * 0.4);
        return first ? { pts: [b], tap: true, key } : { pts: [b, potTop], dur: 1600, key };
      }
      if (w.part === "gel") { const g = P(L.gel.x, L.gel.y - 10); return first ? { pts: [g], tap: true, key } : { pts: [g, potTop], dur: 1500, key }; }
      if (w.part === "whisk" && !first) {
        const pts = [];
        for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU; pts.push(P(L.pot.x + Math.cos(a) * L.pot.w * 0.28, surfY() - 20 + Math.sin(a) * 10)); }
        return { pts, dur: 2000, key };
      }
      if (/^cav\d$/.test(w.part) && !first) {
        const pts = [P(V.drop.x, V.drop.y - 30)];
        B.fill.forEach((f, k) => { if (!f) { const c = cavPos(k); pts.push(P(c.x, c.y - c.s * 0.3)); } });
        return { pts, dur: 600 * pts.length, key };
      }
      if (w.part === "mold" && B.step === "chill" && !first) return { pts: [P(V.mold.x, V.mold.y), P(L.fridge.x + L.fridge.w / 2, fridgeIn().y)], dur: 1600, key };
      if (w.part === "bowls") {
        const g = onTray().find((q) => !q.coat) || onTray()[0], b = P(L.bowls.xs[1], L.bowls.y);
        return first || !g ? { pts: [b], tap: true, key } : { pts: [P(g.x, g.y), b], dur: 1500, key };
      }
      if (w.part === "jar" && !first) { const g = onTray()[0]; if (g) return { pts: [P(g.x, g.y), P(L.jar.x, L.jar.y - L.jar.h / 2)], dur: 1600, key }; }
      const p = partPt(w.part);
      if (!p) return null;
      return { pts: [P(p.x, p.y)], tap: true, key };
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  const NAMES = { gel: "Gelatin and sugar", knob: "Stove knob", whisk: "Whisk", pot: "Saucepan", mold: "Silicone mold",
    fridge: "Fridge", jar: "Candy jar", dropper: "Candy dropper", tray: "Tray" };
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  const inRect = (w, x, y, hw, hh) => Math.abs(w.x - x) <= hw && Math.abs(w.y - y) <= hh;
  // The part under a press (client px). Every target is at least a fingertip wide, and the things he works
  // with right now (the dropper and the shapes, the gummies, the bowls) come before the scenery behind them.
  function hitPart(cx, cy) {
    if (locked()) return null;
    if (jarOpen) { const r = cv.getBoundingClientRect(), i = jvHit(cx - r.left, cy - r.top); return i >= 0 ? "jv" + i : "jvout"; }
    const w = wpt(cx, cy), minR = 30 / vs;
    let best = null, bd = Infinity;
    const cand = (id, x, y, r) => { const d = Math.hypot(w.x - x, w.y - y); if (d <= Math.max(r, minR) && d - r * 0.3 < bd) { bd = d - r * 0.3; best = id; } };
    const st = B.step;
    if (st === "fill") {
      const d = V.drop; if (d.show > 0.5) cand("dropper", d.x, d.y - 36, 40);
      B.fill.forEach((f, k) => { const c = cavPos(k); cand("cav" + k, c.x, c.y, c.s * 1.1); });
      if (best) return best;
      if (inRect(w, V.mold.x, V.mold.y, MOLD_W / 2 + 10, MOLD_H / 2 + 10)) return "moldfill";
    }
    if (st === "pop") {
      B.gum.forEach((g, k) => { if (g.where === "mold") cand("pop" + k, g.x, g.y, g.s * 1.1); });
      if (best) return best;
    }
    if (st === "coat" || st === "jar" || st === "pop") B.gum.forEach((g, i) => { if (g.where === "tray" || g.where === "out") cand("gum" + i, g.x, g.y, g.s * 1.25); });
    if (st === "coat") L.bowls.xs.forEach((x, i) => cand("bowl" + i, x, L.bowls.y + 8, 46));
    if (best) return best;
    L.bottles.forEach(([x, y], i) => cand("bottle" + i, x, y - L.bh * 0.45, L.bw * 0.62));
    if (V.gelShow > 0.5) cand("gel", L.gel.x, L.gel.y - 10, 42);
    // The knob sits right under the pot: near it, it wins.
    const k = knobPt();
    if (Math.hypot(w.x - k.x, w.y - k.y) <= Math.max(k.r * 1.2, minR)) return "knob";
    if (st === "stir") { const wh = whiskPt(); cand("whisk", wh.x + 14, wh.y - 24, 40); }
    // The whole pot, from its rim to its bottom, is one big target (stirring happens anywhere in it).
    if (inRect(w, L.pot.x, L.pot.y - L.pot.h * 0.55, L.pot.w * 0.6, L.pot.h * 0.75)) cand("pot", w.x, w.y, 1);
    if (V.mold.show && !V.mold.inFridge && inRect(w, V.mold.x, V.mold.y, MOLD_W / 2 + 8, MOLD_H / 2 + 8)) cand("mold", w.x, w.y, 2);
    if (V.tray > 0.5 && st !== "coat" && st !== "jar" && inRect(w, L.work.x, L.work.y, MOLD_W / 2, MOLD_H / 2)) cand("tray", w.x, w.y, 3);
    const F = L.fridge;
    if (inRect(w, F.x + F.w / 2, F.y + F.h / 2, F.w / 2, F.h / 2)) cand("fridge", w.x, w.y, F.w);
    cand("jar", L.jar.x, L.jar.y - L.jar.h / 2, L.jar.w * 0.6);
    return best;
  }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    ghost.poke();
  }
  // A tap: each part does its own one motion. Parts that are not needed right now still answer (a wiggle and
  // their name, the knob turns, the fridge door opens).
  function doTap(part) {
    if (locked() || part == null) return;
    if (jarOpen) {
      if (part === "jvout") openJar(false);
      else jvPoke(+part.slice(2));
      return;
    }
    const st = B.step;
    if (/^bottle\d$/.test(part)) {
      const i = +part.slice(6);
      if (pourable(i) && !busy) { ghost.learned("bottles"); pour(i); }
      else {
        V.bwob[i] = 1; const p = partPt(part); wiggleTag(FLAVORS[i].name, p.x, p.y - L.bh * 0.5);
        if (st === "flavor") coach.say(pourLine(), 3);
      }
    } else if (part === "gel") {
      if (st === "gel" && !busy) { ghost.learned("gel"); tipGel(); }
      else { V.gelWob = 1; wiggleTag(NAMES.gel, L.gel.x, L.gel.y - 30); }
    } else if (part === "knob") { if (!(busy && st === "stir")) { ghost.learned("knob"); knobTap(); } }
    else if (part === "whisk" || (part === "pot" && st === "stir")) { if (!busy) { ghost.learned("whisk"); stirTap(); } }
    else if (part === "pot") { V.slosh = 1; tag(NAMES.pot, L.pot.x, potRim() - 16); }
    else if (part === "dropper") fillCav(nextEmpty());
    else if (part === "moldfill") fillCav(nextEmpty());
    else if (/^cav\d$/.test(part)) { ghost.learned("cav"); const k = +part.slice(3); if (B.fill[k] || V.fillQ.includes(k)) fillCav(nextEmpty()); else fillCav(k); }
    else if (/^pop\d$/.test(part)) popOne(+part.slice(3));
    else if (part === "mold") {
      if (busy) return;
      if (st === "chill") { ghost.learned("mold"); chill(); }
      else if (st === "pop") { ghost.learned("pop"); pop(); }
      else { pokeMold(); if (st !== "fill") hint(); }
    } else if (part === "fridge") {
      if (st === "chill" && !busy) { ghost.learned("mold"); chill(); }
      else fridgePeek();
    } else if (/^bowl\d$/.test(part)) { ghost.learned("bowls"); coatIn(+part.slice(4)); }
    else if (/^gum\d$/.test(part)) {
      const g = B.gum[+part.slice(3)];
      if (!g) return;
      if (st === "jar" && !busy) { ghost.learned("jar"); hopToJar(g); }
      else { g.wob = 0.45; g.ph = 0; snd.boing(); }
    } else if (part === "jar") {
      if ((st === "jar" || st === "coat") && !busy) { ghost.learned("jar"); allToJar(); }
      else openJar(true);
    } else if (part === "tray") tag(NAMES.tray, L.work.x, L.work.y - MOLD_H / 2);
  }
  // The empty mold wobbles when tapped (it is soft silicone).
  let moldWob = 0;
  function pokeMold() { moldWob = 1; tag(NAMES.mold, V.mold.x, V.mold.y - MOLD_H / 2); }

  // Drags: the part follows his finger, and the real thing happens while he does it. One finger owns the drag
  // (drag.pid); other fingers are ignored until it lifts, so a second touch never leaves a part half carried.
  // A press held still and let go within the tap slop (drag.far) counts as that part's tap.
  const SLOP = 12, LIFT = 14;
  let skipTap = false;
  const isFillPart = (part) => part === "dropper" || part === "moldfill" || /^cav\d$/.test(part);
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    // The dropper comes to his finger as soon as he touches a shape, so a finger held still on a shape fills it
    // (a still finger sends no moves).
    down: (part, e, s) => {
      if (drag) return;
      if (locked() || jarOpen || B.step !== "fill" || busy || !isFillPart(part)) return;
      const w = wpt(s.x0, s.y0);
      drag = { k: "dropper", pid: e.pointerId, far: 0 };
      V.drop.held = true; V.drop.x = w.x; V.drop.y = w.y - 12;
      ghost.learned("cav");
    },
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null) return;
      const answered = jarOpen ? false : startDrag(part, s);
      // A part with no drag of its own waits for the release: let go in place, it gets its tap.
      if (!drag && !answered) drag = { k: "hold", part };
      if (drag) { drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy); }
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const w = wpt(s.x, s.y);
      if (drag.k === "bottle" && V.carry && V.carry.held) { V.carry.x = w.x + drag.ox; V.carry.y = w.y + drag.oy; }
      else if (drag.k === "gel" && V.gelPose && V.gelPose.held) { V.gelPose.x = w.x + drag.ox; V.gelPose.y = w.y + drag.oy; }
      // The knob turns only once the finger really moves, so a press held on it can still be a tap.
      else if (drag.k === "knob") { if (drag.far > SLOP) knobDrag(w); }
      else if (drag.k === "stir") {
        const dist = Math.hypot(w.x - drag.x, w.y - drag.y);
        drag.x = w.x; drag.y = w.y;
        whiskTo(w.x, w.y);
        stirBy(Math.min(dist, 40));
      } else if (drag.k === "dropper") { V.drop.x = w.x; V.drop.y = w.y - 12; }
      else if (drag.k === "mold") { V.mold.x = w.x + drag.ox; V.mold.y = w.y + drag.oy; }
      else if (drag.k === "gum") { drag.g.x = w.x + drag.ox; drag.g.y = w.y + drag.oy; drag.g.wob = 0.12; drag.g.ph += 0.4; }
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const w = wpt(s.x, s.y), still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (d.k === "hold") { if (still && !locked()) doTap(d.part); }
      else if (d.k === "knob") { if (still && !locked()) knobTap(); }
      else if (d.k === "stir") { if (still && !locked()) stirTap(); }
      else if (d.k === "bottle" && V.carry && V.carry.held) {
        // Let go over the pot (or in place after a still hold), the bottle finishes the pour by itself;
        // anywhere else it goes back to the shelf.
        const c = V.carry; V.stream = null;
        if (!locked() && (bottleOver(c) || (still && pourable(c.i)))) pour(c.i, { x: c.x, y: c.y, ang: c.ang });
        else { bottleBack(c.i, { x: c.x, y: c.y }, c.ang); if (B.step === "flavor" && V.level < 0.05) hint(); }
      } else if (d.k === "gel" && V.gelPose && V.gelPose.held) {
        const g = V.gelPose;
        if (!locked() && B.step === "gel" && (still || overPot(g.x, g.y, 50))) tipGel({ x: g.x, y: g.y });
        else { gelBack({ x: g.x, y: g.y, ang: g.ang }); if (B.step === "gel" && V.cloud < 0.05) hint(); }
      } else if (d.k === "dropper") {
        V.drop.held = false;
        // The press is handled here, so its tap must not fill another shape.
        skipTap = s.tap;
        // Let go over a shape that is not full yet, that shape finishes filling. A quick press that filled
        // nothing and is over no empty shape fills the next one, as a tap on a full shape does.
        const k = B.fill.findIndex((f, j) => { if (f) return false; const c = cavPos(j); return Math.hypot(V.drop.x - c.x, V.drop.y - (c.y - c.s * 0.3)) < c.s * 1.4; });
        if (!locked()) { if (k >= 0) fillCav(k); else if (still && !d.filled) fillCav(nextEmpty()); }
        // Let go away from the mold, the dropper floats back beside it.
        if (!inRect(V.drop, V.mold.x, V.mold.y, MOLD_W / 2 + 30, MOLD_H / 2 + 60)) {
          const d0 = { x: V.drop.x, y: V.drop.y };
          tween(0.35, (p) => { V.drop.x = lerp(d0.x, L.dropRest.x, ease(p)); V.drop.y = lerp(d0.y, L.dropRest.y, ease(p)); });
        }
      } else if (d.k === "mold") {
        if (!locked() && (still || nearFridge(V.mold.x))) { ghost.learned("mold"); chill(); }
        else { moldBack({ x: V.mold.x, y: V.mold.y }); hint(); }
      } else if (d.k === "gum") {
        const g = d.g;
        g.where = "tray";
        const bi = L.bowls.xs.findIndex((x) => Math.hypot(g.x - x, g.y - L.bowls.y) < 56);
        const tray = { x: L.work.x, y: L.work.y };
        if (still && !locked()) { g.x = g.hx; g.y = g.hy; doTap("gum" + B.gum.indexOf(g)); }
        else if (!locked() && B.step === "coat" && bi >= 0) { g.x = g.hx; g.y = g.hy; ghost.learned("bowls"); coatIn(bi, [g]); }
        else if (!locked() && Math.hypot(w.x - L.jar.x, w.y - (L.jar.y - L.jar.h / 2)) < L.jar.w) { ghost.learned("jar"); hopToJar(g); }
        else if (inRect(g, tray.x, tray.y, MOLD_W / 2 - 14, MOLD_H / 2 - 14)) { g.hx = g.x; g.hy = g.y; g.wob = 0.35; g.ph = 0; snd.boing(); }
        else {
          const x0 = g.x, y0 = g.y;
          g.where = "air";
          tween(0.35, (p) => { g.x = lerp(x0, g.hx, ease(p)); g.y = lerp(y0, g.hy, ease(p)); }, () => { g.where = "tray"; g.wob = 0.3; g.ph = 0; });
        }
      }
    },
    tap: (part) => {
      if (skipTap) { skipTap = false; return; }
      // While another finger carries something, a tap is ignored.
      if (!drag) doTap(part);
    }
  });
  // Starts the drag for a part (sets drag), or answers at once. True when the part already answered (a wiggle,
  // a pop, a bowl that coats) and needs no tap on release.
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0), st = B.step;
    if (/^bottle\d$/.test(part)) {
      const i = +part.slice(6), h = bottleHome(i);
      if (busy || (V.carry && V.carry.i !== i)) return false;
      if (!pourable(i)) { V.bwob[i] = 1; const p = partPt(part); wiggleTag(FLAVORS[i].name, p.x, p.y - L.bh * 0.5); if (st === "flavor") coach.say(pourLine(), 3); return true; }
      // The bottle lifts off the shelf as he picks it up, so a finger held still on it shows it in his hand.
      drag = { k: "bottle", i, ox: h.x - w0.x, oy: h.y - w0.y - LIFT };
      V.carry = { i, x: w.x + drag.ox, y: w.y + drag.oy, ang: 0, held: true };
      ghost.learned("bottles");
    } else if (part === "gel") {
      if (st !== "gel" || busy) { V.gelWob = 1; wiggleTag(NAMES.gel, L.gel.x, L.gel.y - 30); return true; }
      drag = { k: "gel", ox: L.gel.x - w0.x, oy: L.gel.y - w0.y - LIFT };
      V.gelPose = { x: w.x + drag.ox, y: w.y + drag.oy, ang: 0, held: true };
      ghost.learned("gel");
    } else if (part === "knob") {
      if (busy && st === "stir") return false;
      if (V.knobTw) { tweens.splice(tweens.indexOf(V.knobTw), 1); V.knobTw = null; }
      drag = { k: "knob" }; ghost.learned("knob");
    } else if ((part === "whisk" || part === "pot") && st === "stir" && !busy) {
      drag = { k: "stir", x: w.x, y: w.y };
      whiskTo(w.x, w.y);
      ghost.learned("whisk");
    } else if (isFillPart(part) && st === "fill" && !busy) {
      // The dropper comes to his finger, its tip just above the fingertip so he can see the shape fill.
      drag = { k: "dropper" };
      V.drop.held = true;
      V.drop.x = w.x; V.drop.y = w.y - 12;
      ghost.learned("cav");
    } else if (part === "mold" && st === "chill" && !busy) {
      drag = { k: "mold", ox: V.mold.x - w0.x, oy: V.mold.y - w0.y };
    } else if (part === "mold" && st === "pop" && !busy) { ghost.learned("pop"); pop(); return true; }
    else if (/^pop\d$/.test(part)) { popOne(+part.slice(3)); return true; }
    else if (/^gum\d$/.test(part) && (st === "coat" || st === "jar") && !busy) {
      const g = B.gum[+part.slice(3)];
      if (g && g.where === "tray") { g.where = "drag"; drag = { k: "gum", g, ox: g.x - w0.x, oy: g.y - w0.y }; g.x = w.x + drag.ox; g.y = w.y + drag.oy; }
    } else if (/^bowl\d$/.test(part)) { ghost.learned("bowls"); coatIn(+part.slice(4)); return true; }
    return false;
  }
  // Turning the knob: the pointer follows his finger round, from up (off) to the right (full on).
  function knobDrag(w) {
    const k = knobPt(), dx = w.x - k.x, dy = w.y - k.y;
    if (Math.hypot(dx, dy) < 4) return;
    const a = Math.atan2(dx, -dy);
    setKnob(a / (Math.PI / 2));
  }

  // =====================================================================================================
  // Panel and surprise
  // =====================================================================================================
  const PIC = {
    bears: '<svg viewBox="0 0 50 50"><rect x="3" y="7" width="44" height="36" rx="9" fill="#9EE3D2" stroke="#1D2340" stroke-width="2"/>' +
      '<g fill="#FF5C9E" stroke="#1D2340" stroke-width="1.8"><circle cx="17" cy="22" r="4"/><circle cx="33" cy="22" r="4"/></g>' +
      '<g fill="#FF5C9E"><circle cx="14" cy="18.5" r="1.8"/><circle cx="20" cy="18.5" r="1.8"/><ellipse cx="17" cy="29" rx="4.5" ry="5.5"/><circle cx="30" cy="18.5" r="1.8"/><circle cx="36" cy="18.5" r="1.8"/><ellipse cx="33" cy="29" rx="4.5" ry="5.5"/></g></svg>',
    worms: '<svg viewBox="0 0 50 50"><rect x="3" y="7" width="44" height="36" rx="9" fill="#9EE3D2" stroke="#1D2340" stroke-width="2"/>' +
      '<path d="M10 19q6-6 12 0t12 0 8 0" fill="none" stroke="#1D2340" stroke-width="7" stroke-linecap="round"/><path d="M10 19q6-6 12 0t12 0 8 0" fill="none" stroke="#5CC93A" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M10 32q6-6 12 0t12 0 8 0" fill="none" stroke="#1D2340" stroke-width="7" stroke-linecap="round"/><path d="M10 32q6-6 12 0t12 0 8 0" fill="none" stroke="#FF8A1F" stroke-width="4" stroke-linecap="round"/></svg>',
    fruits: '<svg viewBox="0 0 50 50"><rect x="3" y="7" width="44" height="36" rx="9" fill="#9EE3D2" stroke="#1D2340" stroke-width="2"/>' +
      '<path d="M16 34c-5-3-7-8-6-12s5-4 6-2c1-2 5-2 6 2s-1 9-6 12z" fill="#E8303F" stroke="#1D2340" stroke-width="1.8"/>' +
      '<path d="M26 31a8 8 0 0 1 16 0z" fill="#FFD23B" stroke="#1D2340" stroke-width="1.8"/><path d="M34 31l-5-5M34 31v-7M34 31l5-5" stroke="#C99A16" stroke-width="1.2"/></svg>'
  };
  const tiles = Toybox.tiles($("tiles"), {
    items: MOLDS.map((m) => ({ id: m.id, name: m.name, pic: PIC[m.id] })),
    value: nextMold || B.mold, rows: 1,
    onPick: (id) => pickMold(id)
  });
  // A new mold: swapped in at once while it is still empty; otherwise the next batch uses it.
  function pickMold(id) {
    if (!MOLD_BY[id] || locked()) return;
    const empty = B.step === "flavor" || B.step === "gel" || B.step === "heat" || B.step === "stir" || (B.step === "fill" && !B.fill.some(Boolean) && !V.fillQ.length);
    if (empty) {
      B.mold = id; B.fill = MOLD_BY[id].cav.map(() => false); V.cavLevel = B.fill.map(() => 0); nextMold = null;
      moldWob = 1;
      lastWant = "";
    } else if (id !== B.mold) {
      nextMold = id;
      coach.say("The next batch uses this mold.", 3);
    } else nextMold = null;
    saveSoon();
  }
  function newBatchTap() {
    if (locked()) return;
    if (jarOpen) openJar(false);
    startBatch();
    puff("spark", L.pot.x, potRim(), 6);
  }
  const bar = Toybox.bar($("bottom"), { shelf: () => openJar(!jarOpen), onNew: newBatchTap, onSurprise: surprise });
  if (bar.shelf) { const sp = bar.shelf.querySelector("span"); if (sp) sp.textContent = "Jar"; bar.shelf.setAttribute("aria-label", "Candy jar"); }

  // Takes turns between three moments on the counter: everything on it bounces (the bottles, the gelatin bowl,
  // the pot, the mold and any gummies), a giant gummy bear wobbles across the counter, and a long gummy worm
  // inches across.
  let surpriseNext = 0, actor = null;
  function surprise() {
    if (locked()) return;
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    if (k === 0) {
      B.gum.forEach((g) => { g.wob = 0.45; g.ph = 0; });
      V.bwob = V.bwob.map(() => 1); V.gelWob = 1; V.slosh = 1; moldWob = 1;
      V.jarBounce = 1;
      jv.wobs.forEach((w) => { w.wob = 0.4; w.ph = Math.random() * 3; w.v = 120 + Math.random() * 80; });
      snd.boing(); setTimeout(() => snd.boing(), 250);
    } else {
      const f = B.flavor >= 0 ? B.flavor : Math.floor(Math.random() * FLAVORS.length);
      actor = { kind: k === 1 ? "bear" : "worm", f, t0: now(), dur: 5 };
      snd.boing();
    }
  }
  function drawActor(t) {
    if (!actor) return;
    const p = (t - actor.t0) / actor.dur;
    if (p >= 1) { actor = null; return; }
    const y = L.front - 6, x = lerp(-80, L.w + 80, p), col = FLAVORS[actor.f].hex;
    if (actor.kind === "bear") {
      const hop = Math.abs(Math.sin(p * Math.PI * 6)) * 40;
      drawGummy("bear", x, y - 60 - hop, 60, col, { wob: 0.25 * (1 - Math.abs(Math.sin(p * Math.PI * 6))) + 0.05, ph: t * 10, t });
    } else {
      const stretch = 1 + 0.25 * Math.sin(p * Math.PI * 10);
      ctx.save(); ctx.translate(x, y - 20); ctx.scale(stretch, 1 / stretch);
      drawGummy("worm", 0, 0, 34, col, { t });
      ctx.restore();
    }
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now(), steamAt = 0;
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    // Jiggle: every gummy springs back after a poke.
    B.gum.forEach((g) => { if (g.wob > 0.002) { g.wob *= Math.exp(-dt * 3.2); g.ph += dt * 18; } else g.wob = 0; });
    jv.wobs.forEach((w) => {
      if (w.wob > 0.002) { w.wob *= Math.exp(-dt * 3); w.ph += dt * 18; } else w.wob = 0;
      if (w.v || w.hop > 0) { w.hop += w.v * dt; w.v -= 900 * dt; if (w.hop <= 0) { w.hop = 0; w.v = w.v < -80 ? -w.v * 0.35 : 0; if (w.v) w.wob = 0.25; } }
    });
    V.jarBounce = Math.max(0, V.jarBounce - dt * 2.5);
    // The things he is holding do their work while he holds them.
    stepPour(dt); stepGel(dt); stepFill(dt);
    V.heat += (V.knob - V.heat) * Math.min(1, dt * 5);
    if (drag && drag.k === "mold") V.door += ((nearFridge(V.mold.x) ? 1 : 0) - V.door) * Math.min(1, dt * 6);
    V.bwob = V.bwob.map((v) => Math.max(0, v - dt * 1.6));
    V.gelWob = Math.max(0, V.gelWob - dt * 1.6);
    V.slosh = Math.max(0, V.slosh - dt * 1.2);
    V.swirlV = Math.max(0, V.swirlV - dt * 0.8);
    moldWob = Math.max(0, moldWob - dt * 2);
    if (V.heat > 0.5 && t > steamAt) { steamAt = t + 0.35; puff("steam", L.pot.x, potRim() - 6, 1); }
    updateCoach();
    draw(t);
    requestAnimationFrame(frame);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawRoom();
    drawFridge();
    drawBottles(t);
    drawJar(L.jar.x, L.jar.y, L.jar.w, L.jar.h, t, false, null);
    drawPlate();
    drawPot(t);
    drawGel();
    drawTray();
    if (moldWob > 0) {
      ctx.save(); const a = Math.sin(moldWob * 18) * moldWob * 0.04;
      ctx.translate(V.mold.x, V.mold.y); ctx.scale(1 + a, 1 - a); ctx.translate(-V.mold.x, -V.mold.y);
      drawMold(t); ctx.restore();
    } else drawMold(t);
    drawGummies("tray", t);
    drawBowls(t);
    drawDropper();
    drawCarry(t);
    drawGummies("air", t);
    drawParts();
    drawActor(t);
    drawRing(t);
    drawJarView(t);
  }
  // The hot plate goes off by itself: when the shop closes and when he leaves the page.
  function knobOff() {
    if (V.knobTw) { tweens.splice(tweens.indexOf(V.knobTw), 1); V.knobTw = null; }
    const from = V.knob;
    if (from > 0) V.knobTw = tween(0.4, (p) => { setKnob(from * (1 - ease(p))); }, () => { V.knobTw = null; });
  }
  function onEnding(done) {
    ending = true;
    drag = null; press.cancel();
    if (jarOpen) openJar(false);
    knobOff();
    setTimeout(done, 1500);
  }
  function restArt() {
    const g = [["#E8303F", 38, 70], ["#FFD23B", 52, 74], ["#5CC93A", 64, 69], ["#2F8CFF", 44, 58], ["#FF8A1F", 58, 58], ["#8E4FD9", 50, 46], ["#FF5C9E", 64, 82], ["#FF8A1F", 36, 82]];
    let s = '<svg class="rest-art" viewBox="0 0 100 100"><rect x="24" y="30" width="52" height="60" rx="10" fill="#DDEFFF" stroke="#1D2340" stroke-width="2.5"/>';
    g.forEach(([c, x, y]) => { s += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + c + '" stroke="#1D2340" stroke-width="1.5"/>'; });
    return s + '<rect x="28" y="20" width="44" height="11" rx="4" fill="#FF7FA8" stroke="#1D2340" stroke-width="2.5"/></svg>';
  }

  resize();
  placeAll();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "sweet-shop",
    badge: $("tbadge"),
    timerIntro: "When time is up, the shop closes and the controls lock.",
    goodbyeOption: "End with a “Goodbye, Sweet Shop” button to press",
    farewellText: "Time to close the sweet shop",
    goodbyeLabel: "Goodbye, Sweet Shop",
    farewellDone: "Bye bye, Sweet Shop!",
    restLine: "The Sweet Shop is closed.",
    restLine2: "The candy jar will be right here next time.",
    restArt,
    soundNote: "Soft pours, drips and boings. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; },
    onSound: (on) => { if (on) snd.chime(); }
  });
  Toybox.offFirst({ running: () => V.knob > 0.01, off: (done) => { knobOff(); done(); } });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__sweet = {
      state: () => {
        const w = want();
        return { step: B.step, flavor: B.flavor >= 0 ? FLAVORS[B.flavor].id : null, mold: B.mold, next: nextMold,
          filled: B.fill.filter(Boolean).length, coats: B.coats.join(","), level: +V.level.toFixed(2), knob: +V.knob.toFixed(2), jar: jar.length, busy, jarOpen, wanted: w && w.part, coach: coach.text() };
      },
      tap: (part) => doTap(part),
      cavs: () => B.fill.length,
      hit: (x, y) => hitPart(x, y),
      clear: () => V.clear,
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      ghost: () => ghost.show()
    };
  }
})();
