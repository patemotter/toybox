(function () {
  "use strict";
  // Christmas · Snowman: a snowy front yard (the edge of the house with its lights, a wooden fence, pine trees,
  // gentle snow falling, a cardboard box of snowman things) where he makes a snowman the real way.
  //   1. Roll the snowball: he drags the small snowball across the yard. It turns as it rolls, grows as it picks
  //      up snow (it stays clean white), and presses a packed-snow trail into the deep snow. A tap on the snowball
  //      rolls it a short way by itself; a tap on the snow rolls it toward that spot. Big enough, it settles with
  //      a sparkle (the big one first rolls itself to a spot where the whole snowman fits) and the next one appears.
  //   2. Roll the middle snowball the same way, then lift it onto the big one (drag it there, or tap it and it
  //      lifts and stacks itself).
  //   3. Roll the small snowball for the head and lift it on top.
  //   4. Dress the snowman from the panel tiles: eyes, nose, smile, buttons, arms, mittens, scarf, hat. A piece with
  //      choices (eyes, buttons, mittens, scarf, hat) shows a little row of colored dots; a tap on it shows its
  //      choices as picture tiles (with Back to all the pieces), and picking one puts it on or swaps it. A piece with
  //      one choice (nose, smile, arms) goes straight on. He can also drag any tile onto the snowman.
  //   5. Take things off: he drags a piece off the snowman into the box (it opens and glows while a piece is over
  //      it). Let go anywhere else away from the snowman, the piece also goes back in the box.
  // FACE RULE (the dad: faces popping up on objects once scared him): the snowman has no face until he puts each
  // face piece on himself. Each eye, the nose and each smile stone goes on only by his own tap or drag, one at a
  // time. Nothing else ever adds a face piece (not New, Surprise, the ghost hand, a celebration or the debug
  // "next"), the snowballs carry no face while rolling, and the face never moves by itself (no blinking, no
  // expressions). Buttons, arms and mittens go on together (mittens bring the stick arms that hold them).
  // A yellow ring and one instruction show the next thing to do; everything drawn answers a touch (a wiggle, its
  // name, snow falling off a tree). Surprise takes turns between live moments that never touch his snowman: a
  // robin lands on the hat (or a stick arm, or the head) and hops, a puff of wind flutters the scarf and swirls the
  // snow, the snow falls thicker for a moment, a rabbit hops across the yard. New: the old snowman fades, the snow
  // fills the trails back in and a fresh small snowball sits in the yard. A fresh launch starts a new yard; a
  // reload keeps the snowman as he left it.
  // Units: the scene is drawn in world units (HW tall, WW wide, WW following the stage's shape) and scaled to fit
  // the stage; x to the right, y down. A snowball's (x, gy) is where it touches the snow.
  //
  // Sections:
  //   Setup and saved state
  //   Pieces, choices and sizes
  //   Layout
  //   Tweens and particles
  //   The build
  //   Rolling
  //   Stacking
  //   Dressing and taking off
  //   Drawing helpers
  //   Drawing the yard
  //   Drawing the box
  //   Drawing the snowballs and the snowman
  //   Visitors: robin, rabbit, wind and snow
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Dragging pieces from the panel
  //   Panel, New and Surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage"), tilesEl = $("tiles");
  const TAU = Math.PI * 2, INK = "#1D2340", LW = 2.4;
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "christmas-snowman-v2";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  // A launch from the home screen starts a new yard; a reload keeps the snowman.
  const fresh = Toybox.fresh();

  // =====================================================================================================
  // Pieces, choices and sizes
  // =====================================================================================================
  // The pieces, in panel order, each with the choices he can see and pick (a piece with one choice goes straight
  // on). slots: a face piece made of separate bits that go on one at a time (each eye, each smile stone).
  const KINDS = [
    { id: "eyes", name: "Eyes", face: true, slots: 2, opts: [
      { id: "coal", name: "Coal", tag: "Coal eye" }, { id: "button", name: "Buttons", tag: "Button eye" }] },
    { id: "nose", name: "Nose", face: true, opts: [{ id: "carrot", name: "Carrot", tag: "Carrot nose" }] },
    { id: "smile", name: "Smile", face: true, slots: 5, opts: [{ id: "coal", name: "Coal", tag: "Coal smile" }] },
    { id: "buttons", name: "Buttons", opts: [
      { id: "coal", name: "Coal", tag: "Coal buttons" },
      { id: "red", name: "Red", tag: "Red buttons", hex: "#E8303F", dark: "#B81F2E" },
      { id: "gold", name: "Gold", tag: "Gold buttons", hex: "#FFC93C", dark: "#C9961A" }] },
    { id: "arms", name: "Arms", opts: [{ id: "sticks", name: "Sticks", tag: "Stick arms" }] },
    { id: "mittens", name: "Mittens", opts: [
      { id: "red", name: "Red", tag: "Red mittens", hex: "#E8303F", dark: "#B81F2E" },
      { id: "blue", name: "Blue", tag: "Blue mittens", hex: "#2F8CFF", dark: "#1F64C0" },
      { id: "green", name: "Green", tag: "Green mittens", hex: "#3FA34D", dark: "#2A7A36" },
      { id: "yellow", name: "Yellow", tag: "Yellow mittens", hex: "#FFC93C", dark: "#D9A21B" }] },
    { id: "scarf", name: "Scarf", opts: [
      { id: "red", name: "Red", tag: "Red scarf", hex: "#E8303F", dark: "#B81F2E" },
      { id: "blue", name: "Blue", tag: "Blue scarf", hex: "#2F8CFF", dark: "#1F64C0" },
      { id: "green", name: "Green", tag: "Green scarf", hex: "#3FA34D", dark: "#2A7A36" },
      { id: "striped", name: "Striped", tag: "Striped scarf", hex: "#E8303F", dark: "#B81F2E", stripe: "#FFFFFF" }] },
    { id: "hat", name: "Hat", opts: [
      { id: "top", name: "Top hat", tag: "Top hat" }, { id: "knit", name: "Woolly hat", tag: "Woolly hat" },
      { id: "santa", name: "Santa hat", tag: "Santa hat" }, { id: "muffs", name: "Earmuffs", tag: "Earmuffs" }] }
  ];
  const KIND = {};
  KINDS.forEach((k) => { KIND[k.id] = k; });
  const many = (k) => KIND[k].opts.length > 1;
  // How many of each piece he can touch on the snowman (two eyes, five smile stones, three buttons, two arms...).
  const PARTS = { eyes: 2, nose: 1, smile: 5, buttons: 3, arms: 2, mittens: 2, scarf: 1, hat: 1 };
  // The three snowballs: start radius, finished radius, and how far each rolls to get there (a few seconds).
  const R0 = [18, 16, 14], RT = [84, 62, 46], DIST = [900, 720, 540];
  const BALL_NAMES = ["Big snowball", "Middle snowball", "Small snowball"];
  const SIT = 0.94, STACK_K = 0.8;
  // Lowest a finished big snowball may sit (its touch point) so the whole snowman, hat and a perching robin fit.
  const G_MIN = Math.ceil(RT[0] * SIT + (RT[0] + RT[1]) * STACK_K + (RT[1] + RT[2]) * STACK_K + RT[2] * 2.25 + 30);
  // How far the stick arms and mittens reach out from the middle (a finished snowman stays this far from the sides).
  const ARM_X = 176;

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  const HW = 580, HY = 210;     // world height; where the snow meets the fence
  let WW = 600, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  const Y = { x0: 24, x1: 576, gy0: HY + 40, gy1: HW - 14, bx0: ARM_X, bx1: 600 - ARM_X, houseR: 120, trees: [] };
  let S = null;   // the build (below)
  function layoutYard() {
    Y.x1 = WW - 24; Y.gy0 = HY + 40; Y.gy1 = HW - 14;
    Y.bx0 = ARM_X; Y.bx1 = WW - ARM_X;
    Y.houseR = Math.round(clamp(WW * 0.22, 96, 230));
    if (WW < 560) Y.trees = [{ x: WW - 56, s: 0.85 }];
    else if (WW < 840) Y.trees = [{ x: WW - 76, s: 1 }, { x: WW - 184, s: 0.72 }];
    else Y.trees = [{ x: WW - 82, s: 1 }, { x: WW - 198, s: 0.74 }, { x: Y.houseR + 176, s: 0.62 }];
    Y.trees.forEach((tr) => { tr.shake = 0; });
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    WW = Math.round(clamp(HW * W / H, 420, 1100));
    vs = Math.min(W / WW, H / HW);
    vox = (W - WW * vs) / 2; voy = (H - HW * vs) / 2;
    layoutYard();
    if (S && S.ww !== WW) { rescale(S, WW / S.ww); S.ww = WW; keepInYard(S); }
    tcv.width = cv.width; tcv.height = cv.height;
    oldTrack = null; oldB = null;
    redrawTrack();
  }
  // The part of the world the stage shows (a little more than WW x HW when the stage is very wide or tall).
  function vis() { return { x0: -vox / vs, x1: (W - vox) / vs, y0: -voy / vs, y1: (H - voy) / vs }; }
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }

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
    for (const tw of tweens.slice()) {
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
    if (reduce && kind !== "smoke") n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 150) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 3, ph: Math.random() * TAU, color: color || "#FFFFFF" };
      if (kind === "spark") { p.vx = Math.cos(a) * (40 + sp * 90); p.vy = Math.sin(a) * (40 + sp * 90) - 20; p.life = 0.8; p.size = 5 + sp * 4; p.color = color || "#FFD23B"; }
      else if (kind === "snow") { p.x += (Math.random() - 0.5) * 24; p.vx = Math.cos(a) * 45 * sp; p.vy = -50 - sp * 80; p.life = 0.9; p.size = 2.5 + sp * 3; }
      else if (kind === "crumb") { p.vx = (Math.random() - 0.5) * 40; p.vy = -30 - sp * 40; p.life = 0.6; p.size = 1.8 + sp * 2.2; }
      else if (kind === "smoke") { p.x += (Math.random() - 0.5) * 6; p.vx = 5 + sp * 6; p.vy = -16 - sp * 10; p.life = 3.4; p.size = 6 + sp * 4; }
      else if (kind === "swirl") { p.vx = 150 + sp * 130; p.vy = -14 - sp * 34; p.life = 1.5; p.size = 2.2 + sp * 2.6; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "snow" || p.kind === "crumb") p.vy += 300 * dt;
      if (p.kind === "smoke") p.size += dt * 5;
      if (p.kind === "swirl") p.vy += Math.sin(p.t * 7 + p.ph) * 120 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // The build
  // =====================================================================================================
  // Steps in order: roll the big snowball, roll the middle one, stack it, roll the head, stack it, dress.
  const ACTIVE = { roll0: 0, roll1: 1, stack1: 1, roll2: 2, stack2: 2, dress: -1 };
  const activeIndex = () => ACTIVE[S.step];
  const rolling = () => S.step.startsWith("roll");
  const stacking = () => S.step.startsWith("stack");
  // What he has put on: for each piece its choice (kept when he takes it off) and which of its bits are on (one
  // for most pieces; one per eye and per smile stone).
  function newDress() { const D = {}; KINDS.forEach((k) => { D[k.id] = { opt: 0, on: new Array(k.slots || 1).fill(false) }; }); return D; }
  function newBuild() { return { step: "roll0", balls: [null, null, null], D: newDress(), k1: false, all: false, ww: WW }; }
  function newBall(i, x, gy) {
    const b = { i, x, gy, r: R0[i], rt: RT[i], r0: R0[i], M: [1, 0, 0, 0, 1, 0, 0, 0, 1], done: false, stacked: false,
      lift: false, lx: 0, ly: 0, auto: null, sq: 0, pop: 1, heading: { x: 1, y: 0 } };
    rotM(b.M, 0.3, 0.8, 0.5, Math.random() * TAU);
    return b;
  }
  let busy = false, drag = null;
  // The whole snowman's wobble when touched, the pieces' own little moves, and the pieces flying on.
  const sm = { wob: 0, ph: 0 };
  let pwob = {}, flights = [], gone = [];
  // The yard he leaves behind on New, fading into the snow.
  let oldB = null, oldA = 0;

  // A snowball's middle on screen (world units).
  function ballC(B, i) {
    const b = B.balls[i];
    if (b.lift) return { x: b.lx, y: b.ly };
    if (b.stacked) return stackAt(B, i);
    return { x: b.x, y: b.gy - b.r * SIT * b.pop };
  }
  // Where ball 1 (on the big one) or ball 2 (on the middle one) sits once stacked.
  function stackAt(B, i) {
    const b0 = B.balls[0], r1 = B.balls[1] ? B.balls[1].r : RT[1], r2 = B.balls[2] ? B.balls[2].r : RT[2];
    const y1 = b0.gy - b0.r * SIT - (b0.r + r1) * STACK_K;
    if (i === 1) return { x: b0.x, y: y1 };
    return { x: b0.x + 2, y: y1 - (r1 + r2) * STACK_K };
  }
  // The dressed snowman's middle and head (all three balls stacked).
  function geom(B) {
    const c1 = stackAt(B, 1), c2 = stackAt(B, 2), m = B.balls[1].r, h = B.balls[2].r;
    return { mx: c1.x, my: c1.y, mr: m, hx: c2.x, hy: c2.y, hr: h, neck: c1.y - m * 0.8, base: B.balls[0] };
  }
  // A stick arm: j 0 the left one, j 1 the right one (raised a little higher, waving).
  function armAt(g, j, wob) {
    const s = j ? 1 : -1, a = (j ? -0.62 : Math.PI + 0.36) + (wob || 0);
    const sx = g.mx + s * g.mr * 0.72, sy = g.my - g.mr * 0.14, L = g.mr * 0.55 + 60;
    return { sx, sy, a, L, ex: sx + Math.cos(a) * L, ey: sy + Math.sin(a) * L, s };
  }
  // Each piece's natural place on the snowman.
  function pieceSpot(g, k, j) {
    switch (k) {
      case "eyes": return { x: g.hx + (j ? 1 : -1) * g.hr * 0.34, y: g.hy - g.hr * 0.16, r: g.hr * 0.14 };
      case "nose": return { x: g.hx + g.hr * 0.05, y: g.hy + g.hr * 0.1, r: g.hr * 0.3 };
      case "smile": { const a = Math.PI * (0.8 - 0.6 * j / 4); return { x: g.hx + Math.cos(a) * g.hr * 0.52, y: g.hy + g.hr * 0.18 + Math.sin(a) * g.hr * 0.36, r: g.hr * 0.085 }; }
      case "buttons": return { x: g.mx, y: g.my - g.mr * 0.36 + j * g.mr * 0.4, r: g.mr * 0.12 };
      case "arms": { const a = armAt(g, j); return { x: lerp(a.sx, a.ex, 0.55), y: lerp(a.sy, a.ey, 0.55), r: 22 }; }
      case "mittens": { const a = armAt(g, j); return { x: a.ex, y: a.ey, r: 15 }; }
      case "scarf": return { x: g.mx, y: g.neck + 4, r: g.hr * 0.55 };
      case "hat": return { x: g.hx, y: g.hy - g.hr * 1.1, r: g.hr * 0.95 };
    }
    return { x: g.hx, y: g.hy, r: 10 };
  }
  // Where a whole piece is pinned (the point it flies to or is carried by).
  function anchorOf(g, k, j) {
    if (KIND[k].slots) return pieceSpot(g, k, j);
    if (k === "buttons") return pieceSpot(g, "buttons", 1);
    if (k === "arms" || k === "mittens") return { x: g.mx, y: g.my - g.mr * 0.3 };
    return pieceSpot(g, k, 0);
  }
  const isOn = (k, j) => (KIND[k].slots ? !!S.D[k].on[j] : S.D[k].on[0]);
  const anyOn = (k) => S.D[k].on.some(Boolean);
  const full = (k) => S.D[k].on.every(Boolean);
  const allOn = () => KINDS.every((k) => full(k.id));

  // Saving: the build in progress (fresh on a launch from the home screen; a reload keeps it).
  let track = [];
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!S) return;
    try {
      const pk = [];
      track.slice(-2400).forEach((p) => { if (p) pk.push(Math.round(p.x), Math.round(p.y), Math.round(p.w)); else pk.push(-1, -1, -1); });
      localStorage.setItem(KEY, JSON.stringify({ v: 2, build: {
        ww: S.ww, step: S.step, D: S.D, k1: S.k1, all: S.all, track: pk,
        balls: S.balls.map((b) => b && { x: +b.x.toFixed(1), gy: +b.gy.toFixed(1), r: +b.r.toFixed(2), done: b.done, stacked: b.stacked, M: b.M.map((v) => +v.toFixed(4)) })
      } }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 500); }
  function loadBuild(sb) {
    if (!sb || typeof sb !== "object" || !(sb.ww > 0) || !Array.isArray(sb.balls)) return null;
    const B = newBuild();
    B.ww = sb.ww;
    for (let i = 0; i < 3; i++) {
      const o = sb.balls[i];
      if (!o || typeof o !== "object") continue;
      if (![o.x, o.gy, o.r].every(Number.isFinite)) return null;
      const b = newBall(i, o.x, o.gy);
      b.done = !!o.done; b.r = b.done ? RT[i] : clamp(o.r, R0[i], RT[i]);
      b.stacked = i > 0 && b.done && !!o.stacked;
      if (Array.isArray(o.M) && o.M.length === 9 && o.M.every(Number.isFinite)) { b.M = o.M.slice(); ortho(b.M); }
      B.balls[i] = b;
    }
    const [b0, b1, b2] = B.balls;
    // The step follows from the balls, so a save made in the middle of a move still makes sense.
    if (!b0) return null;
    if (!b0.done) { B.step = "roll0"; B.balls[1] = B.balls[2] = null; }
    else if (!b1 || !b1.done) { B.step = "roll1"; B.balls[2] = null; if (b1) b1.stacked = false; }
    else if (!b1.stacked) { B.step = "stack1"; B.balls[2] = null; }
    else if (!b2 || !b2.done) B.step = "roll2";
    else if (!b2.stacked) B.step = "stack2";
    else B.step = "dress";
    if (B.step === "dress" && sb.D && typeof sb.D === "object") {
      KINDS.forEach((k) => {
        const v = sb.D[k.id], d = B.D[k.id];
        if (!v || typeof v !== "object") return;
        if (Number.isInteger(v.opt) && v.opt >= 0 && v.opt < k.opts.length) d.opt = v.opt;
        if (Array.isArray(v.on) && v.on.length === d.on.length) d.on = v.on.map(Boolean);
      });
      if (!B.D.arms.on[0]) B.D.mittens.on[0] = false;
      B.k1 = !!sb.k1; B.all = !!sb.all;
    }
    track = [];
    if (Array.isArray(sb.track)) {
      for (let k = 0; k + 2 < sb.track.length; k += 3) {
        const x = sb.track[k], y = sb.track[k + 1], w = sb.track[k + 2];
        if (x === -1 && y === -1) { if (track.length && track[track.length - 1]) track.push(null); }
        else if ([x, y, w].every(Number.isFinite)) track.push({ x, y, w });
      }
    }
    return B;
  }
  // The cardboard box of snowman things sits in the front corner of the yard; snowballs roll round it.
  function boxGeo() { return { x: Y.x0 + 58, gy: HW - 66, w: 104, h: 54, d: 18 }; }
  // Things on the snow a snowball must not roll into: the box and the other snowballs on the ground.
  function obstacles(B, b) {
    const bx = boxGeo(), list = [{ x: bx.x + 4, gy: bx.gy - 8, r: 54 }];
    B.balls.forEach((o) => { if (o && o !== b && !o.stacked && !o.lift) list.push({ x: o.x, gy: o.gy, r: o.r }); });
    return list;
  }
  // Moves (x, gy) for a snowball of radius r out of the obstacles (a round patch on the slanted snow is half as deep).
  function pushOut(B, b, x, gy, r) {
    obstacles(B, b).forEach((o) => {
      const R = r + o.r, ex = (x - o.x) / R, ey = (gy - o.gy) / (R * 0.5), e = Math.hypot(ex, ey);
      if (e >= 1) return;
      const ux = e > 1e-4 ? ex / e : (x >= o.x ? 1 : -1), uy = e > 1e-4 ? ey / e : 0;
      x = o.x + ux * R; gy = o.gy + uy * R * 0.5;
    });
    return { x, gy };
  }
  const blocked = (B, b, x, gy, r) => obstacles(B, b).some((o) => Math.hypot((x - o.x) / (r + o.r), (gy - o.gy) / ((r + o.r) * 0.5)) < 0.98);
  // When the stage changes shape the yard gets wider or narrower: everything moves with it.
  function rescale(B, k) {
    B.balls.forEach((b) => { if (b) b.x *= k; });
    track.forEach((p) => { if (p) p.x *= k; });
  }
  function keepInYard(B) {
    B.balls.forEach((b) => {
      if (!b || b.stacked) return;
      const m = b.r * 0.9;
      b.x = clamp(b.x, Y.x0 + m, Y.x1 - m); b.gy = clamp(b.gy, Y.gy0, Y.gy1);
    });
    const b0 = B.balls[0];
    if (b0 && b0.done) { const p = settleSpot(B, b0); b0.x = p.x; b0.gy = p.y; }
    [0, 1, 2].forEach((i) => {
      const b = B.balls[i];
      if (!b || b.stacked || (i === 0 && b.done)) return;
      if (blocked(B, b, b.x, b.gy, b.r)) { const p = openSpot(B); b.x = p.x; b.gy = p.y; }
    });
  }
  // Where the finished big snowball settles: near where he finished rolling it, but where the whole snowman fits
  // and clear of the box.
  function settleSpot(B, b) {
    let x = clamp(b.x, Y.bx0, Y.bx1), y = clamp(b.gy, G_MIN, Y.gy1);
    const bx = boxGeo(), o = { x: bx.x + 4, gy: bx.gy - 8, r: 54 }, R = b.r + o.r, dy = (y - o.gy) / (R * 0.5);
    if (Math.abs(dy) < 1 && Math.abs(x - o.x) < R) {
      const ax = o.x + Math.sqrt(1 - dy * dy) * R + 2, ay = o.gy - R * 0.5 - 2;
      const okX = ax <= Y.bx1, okY = ay >= G_MIN;
      if (okX && (!okY || ax - x < y - ay)) x = ax; else if (okY) y = ay; else x = Y.bx1;
    }
    return { x, y };
  }
  // A clear spot in the yard for a new snowball: well away from the others, toward the front.
  function openSpot(B) {
    let best = { x: WW * 0.35, y: HY + (HW - HY) * 0.62 }, bs = -Infinity;
    for (let x = Y.x0 + 50; x <= Y.x1 - 50; x += 26) {
      for (let y = Y.gy0 + 40; y <= Y.gy1 - 70; y += 22) {
        let d = 3;
        obstacles(B, null).forEach((o) => {
          const R = o.r + 46;
          d = Math.min(d, Math.hypot((x - o.x) / R, (y - o.gy) / (R * 0.5)));
        });
        // Clear of the others first; then in the middle of the yard (not under the coach line at the bottom).
        const sc = Math.min(d, 2.2) - Math.abs(y - (Y.gy0 + Y.gy1) / 2) / 900 - Math.abs(x - WW / 2) / 3000;
        if (sc > bs) { bs = sc; best = { x, y }; }
      }
    }
    return best;
  }
  // A new small snowball pops up out of the snow.
  function spawn(i) {
    const p = openSpot(S), b = newBall(i, p.x, p.y);
    b.pop = 0;
    S.balls[i] = b;
    tween(0.55, (q) => { b.pop = ease(q) + Math.sin(q * Math.PI) * 0.25; }, () => { b.pop = 1; });
    puff("snow", p.x, p.y - 8, 6);
  }
  function advance(step) {
    S.step = step;
    lastWant = "";
    ghost.poke();
    updateTiles();
    saveSoon();
    updateCoach();
  }

  // =====================================================================================================
  // Rolling
  // =====================================================================================================
  // Each snowball keeps its own turn (a rotation matrix), so the soft shading and little bumps of packed snow on
  // it roll round as it goes. Rows are kept orthonormal.
  function ortho(M) {
    let a = M[0], b = M[1], c = M[2], n = Math.hypot(a, b, c) || 1;
    a /= n; b /= n; c /= n;
    let d = M[3], e = M[4], f = M[5];
    const dot = a * d + b * e + c * f;
    d -= dot * a; e -= dot * b; f -= dot * c; n = Math.hypot(d, e, f) || 1;
    d /= n; e /= n; f /= n;
    M[0] = a; M[1] = b; M[2] = c; M[3] = d; M[4] = e; M[5] = f;
    M[6] = b * f - c * e; M[7] = c * d - a * f; M[8] = a * e - b * d;
  }
  function rotM(M, ax, ay, az, ang) {
    const n = Math.hypot(ax, ay, az) || 1;
    ax /= n; ay /= n; az /= n;
    const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    const R = [t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay,
      t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax,
      t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c];
    const N = new Array(9);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) N[r * 3 + q] = R[r * 3] * M[q] + R[r * 3 + 1] * M[3 + q] + R[r * 3 + 2] * M[6 + q];
    ortho(N);
    for (let k = 0; k < 9; k++) M[k] = N[k];
  }
  // A step toward or away from him on the screen covers more ground than a step across.
  const DEPTH = 1.6;
  // Moves snowball i by (dx, dy) on the snow, kept in the yard and off the other snowballs. It turns as it rolls,
  // grows while it is not big enough yet, and leaves its track. Returns how far it rolled (ground units).
  function moveBall(i, dx, dy) {
    const b = S.balls[i];
    if (!b) return 0;
    const m = b.r * 0.9;
    let nx = clamp(b.x + dx, Y.x0 + m, Y.x1 - m), ny = clamp(b.gy + dy, Y.gy0, Y.gy1);
    const p = pushOut(S, b, nx, ny, b.r);
    nx = clamp(p.x, Y.x0 + m, Y.x1 - m); ny = clamp(p.gy, Y.gy0, Y.gy1);
    const mx = nx - b.x, my = ny - b.gy, d = Math.hypot(mx, my * DEPTH);
    if (d < 0.01) return 0;
    b.x = nx; b.gy = ny;
    // Rolling across turns it about the axis pointing at him; rolling toward him, about the side-to-side axis.
    rotM(b.M, my * DEPTH / d, 0, -mx / d, d / b.r);
    b.heading = { x: mx / d, y: my * DEPTH / d };
    trackAdd(b);
    if (!b.done) {
      b.r = Math.min(b.rt, b.r + d * (b.rt - b.r0) / DIST[i]);
      if (Math.random() < d * 0.03) puff("crumb", b.x - b.heading.x * b.r * 0.7, b.gy - 3, 1);
      if (b.r >= b.rt - 0.01) ballDone(i);
    }
    saveSoon();
    return d;
  }
  // The rolled trail: snow pressed down and packed (a little blue-grey in its own shade), with a soft raised rim
  // of loose snow pushed aside. Painted once into its own layer.
  const K = 0.42;   // the snow is seen at a slant: a round patch on it looks this flat
  const tcv = document.createElement("canvas"), tctx = tcv.getContext("2d");
  let oldTrack = null;
  function trackAdd(b) {
    const last = track.length ? track[track.length - 1] : null;
    if (last && Math.hypot(last.x - b.x, last.y - b.gy) < 3) return;
    const p = { x: b.x, y: b.gy, w: b.r * 1.05 };
    track.push(p);
    paintSeg(last || p, p);
  }
  function trackBreak() { if (track.length && track[track.length - 1]) track.push(null); }
  function paintSeg(a, b) {
    const c = tctx;
    c.setTransform(dpr * vs, 0, 0, dpr * vs * K, dpr * vox, dpr * voy);
    c.lineCap = "round"; c.lineJoin = "round";
    const line = (w, col) => { c.beginPath(); c.moveTo(a.x, a.y / K); c.lineTo(b.x + 0.01, b.y / K); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    c.globalCompositeOperation = "source-over";
    line(b.w, "#D3DEED");
    // The rim goes under what is already there, so it never covers trail rolled earlier: a pale edge of loose
    // snow, then its soft blue shadow.
    c.globalCompositeOperation = "destination-over";
    line(b.w + 5, "#BFCDE2");
    line(b.w + 13, "#FFFFFF");
    line(b.w + 17, "#E2EAF6");
    c.globalCompositeOperation = "source-over";
  }
  function redrawTrack() {
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, tcv.width, tcv.height);
    let prev = null;
    track.forEach((p) => { if (p) paintSeg(prev || p, p); prev = p; });
  }
  // A tap rolls the snowball a short way by itself: on the way it was going if there is room, otherwise toward
  // the open middle of the yard (or toward the spot he tapped). It curves a little and turns off the edges.
  function autoRoll(i, dir, dist) {
    const b = S.balls[i];
    if (!b || b.done || busy) return;
    if (b.auto) { b.auto.remain = Math.min(b.auto.remain + dist, 320); if (dir) b.auto.dir = dir; return; }
    b.auto = { dir: dir || openDir(b), remain: dist, curve: (Math.random() < 0.5 ? -1 : 1) * 0.55 };
  }
  function openDir(b) {
    const h = b.heading, ax = b.x + h.x * 130, ay = b.gy + h.y * 130 / DEPTH;
    const clear = (x, y) => x > Y.x0 + b.r && x < Y.x1 - b.r && y > Y.gy0 + 10 && y < Y.gy1 - 10 && !blocked(S, b, x, y, b.r * 1.1);
    if (clear(ax, ay)) return { x: h.x, y: h.y };
    let dx = (Y.x0 + Y.x1) / 2 + 40 - b.x, dy = ((Y.gy0 + Y.gy1) / 2 - 30 - b.gy) * DEPTH;
    const o = S.balls[0];
    if (o && o !== b && o.done) { dx += (b.x - o.x) * 0.8; dy += (b.gy - o.gy) * DEPTH * 0.8; }
    const n = Math.hypot(dx, dy) || 1, a = (Math.random() - 0.5) * 0.8, c = Math.cos(a), s = Math.sin(a);
    return { x: (dx / n) * c - (dy / n) * s, y: (dx / n) * s + (dy / n) * c };
  }
  function stepAuto(dt) {
    S.balls.forEach((b, i) => {
      if (!b || !b.auto) return;
      if (b.done) { b.auto = null; return; }
      const a = b.auto, sp = 210 * (0.3 + 0.7 * Math.min(1, a.remain / 80)), st = Math.min(a.remain, sp * dt);
      const ang = a.curve * dt, c = Math.cos(ang), s = Math.sin(ang);
      a.dir = { x: a.dir.x * c - a.dir.y * s, y: a.dir.x * s + a.dir.y * c };
      const d = moveBall(i, a.dir.x * st, a.dir.y * st / DEPTH);
      if (b.done || !b.auto) return;
      if (d < st * 0.5) {
        const m = b.r * 0.9, atX = b.x <= Y.x0 + m + 1 || b.x >= Y.x1 - m - 1, atY = b.gy <= Y.gy0 + 1 || b.gy >= Y.gy1 - 1;
        if (atX) a.dir.x = -a.dir.x;
        if (atY) a.dir.y = -a.dir.y;
        if (!atX && !atY) { const q = Math.cos(1.6), r = Math.sin(1.6); a.dir = { x: a.dir.x * q - a.dir.y * r, y: a.dir.x * r + a.dir.y * q }; }
      }
      a.remain -= st;
      if (a.remain <= 0) b.auto = null;
    });
  }
  const DONE_LINES = ["The big snowball is ready.", "The middle snowball is ready.", "The snowball for the head is ready."];
  // Big enough: it stops growing, settles (the big one first rolls itself to where the whole snowman fits), and
  // sparkles; then the next small snowball appears or it waits to be stacked.
  function ballDone(i) {
    const b = S.balls[i];
    b.done = true; b.r = b.rt; b.auto = null;
    if (drag && drag.k === "roll" && drag.i === i) drag.k = "spent";
    ghost.learned("roll");
    busy = true;
    let tx = b.x, ty = b.gy;
    if (i === 0) { const p = settleSpot(S, b); tx = p.x; ty = p.y; }
    const settle = () => {
      trackBreak();
      b.sq = 1;
      const c = ballC(S, i);
      puff("spark", c.x, c.y - b.r * 0.5, 12);
      puff("snow", b.x, b.gy - 4, 6);
      later(0.7, () => {
        busy = false;
        if (i === 0) { spawn(1); advance("roll1"); }
        else advance(i === 1 ? "stack1" : "stack2");
        coach.say(DONE_LINES[i], 3);
      });
    };
    const d = Math.hypot(tx - b.x, ty - b.gy);
    if (d > 2) {
      const x0 = b.x, y0 = b.gy;
      let px = x0, py = y0;
      tween(clamp(d / 150, 0.5, 1.5), (p) => { const e = ease(p), nx = lerp(x0, tx, e), ny = lerp(y0, ty, e); moveBall(i, nx - px, ny - py); px = nx; py = ny; }, settle);
    } else settle();
  }

  // =====================================================================================================
  // Stacking
  // =====================================================================================================
  // He lifts a finished snowball onto the snowman: drag it there (it snaps on when it is close), or tap it and it
  // lifts and stacks itself. Let go somewhere else, it drops back onto the snow.
  function startLift(i, w0) {
    const b = S.balls[i], c = ballC(S, i);
    b.auto = null;
    b.lift = true; b.lx = c.x; b.ly = c.y - 10;
    drag = { k: "lift", i, ox: c.x - w0.x, oy: c.y - 10 - w0.y };
    ghost.learned("stack");
  }
  function liftMove(w) {
    const b = S.balls[drag.i];
    b.lx = clamp(w.x + drag.ox, b.r, WW - b.r); b.ly = clamp(w.y + drag.oy, b.r + 4, HW - b.r);
  }
  const nearStack = (i) => { const b = S.balls[i], T = stackAt(S, i); return Math.hypot(b.lx - T.x, b.ly - T.y) < Math.max(60, b.r * 1.5); };
  function liftUp(d, still) {
    const b = S.balls[d.i];
    if (!b || !b.lift) return;
    if (locked()) { dropBall(d.i, true); return; }
    if (nearStack(d.i)) {
      busy = true;
      const T = stackAt(S, d.i), x0 = b.lx, y0 = b.ly;
      tween(0.25, (p) => { b.lx = lerp(x0, T.x, ease(p)); b.ly = lerp(y0, T.y, ease(p)); }, () => snapStack(d.i));
    } else if (still) { b.lift = false; stackTap(d.i); }
    else dropBall(d.i);
  }
  function stackTap(i) {
    const b = S.balls[i];
    if (!b || busy || b.stacked || !b.done) return;
    busy = true;
    ghost.learned("stack");
    const c = ballC(S, i), T = stackAt(S, i), top = Math.min(c.y, T.y) - 70;
    b.lift = true; b.lx = c.x; b.ly = c.y;
    tween(1.0, (p) => {
      const e = ease(p), u = 1 - e;
      b.lx = lerp(c.x, T.x, e); b.ly = u * u * c.y + 2 * u * e * top + e * e * T.y;
    }, () => snapStack(i));
  }
  function snapStack(i) {
    const b = S.balls[i], T = stackAt(S, i);
    b.lift = false; b.stacked = true; b.auto = null;
    b.x = T.x; b.gy = T.y + b.r * SIT;
    sm.wob = 0.7; sm.ph = 0;
    puff("spark", T.x, T.y - b.r * 0.6, 12);
    puff("snow", T.x, T.y + b.r * 0.85, 6);
    busy = true;
    saveSoon();
    later(0.6, () => {
      busy = false;
      if (i === 1) { spawn(2); advance("roll2"); }
      else { advance("dress"); popTiles(); }
    });
  }
  function dropBall(i, quiet) {
    const b = S.balls[i];
    let gx = clamp(b.lx, Y.x0 + b.r * 0.9, Y.x1 - b.r * 0.9), gy = clamp(b.ly + b.r * SIT, Y.gy0, Y.gy1);
    const p = pushOut(S, b, gx, gy, b.r);
    gx = clamp(p.x, Y.x0 + b.r * 0.9, Y.x1 - b.r * 0.9); gy = clamp(p.gy, Y.gy0, Y.gy1);
    if (blocked(S, b, gx, gy, b.r)) { const q = openSpot(S); gx = q.x; gy = q.y; }
    const x0 = b.lx, y0 = b.ly, ty = gy - b.r * SIT;
    busy = true;
    tween(0.35, (p) => { b.lx = lerp(x0, gx, p); b.ly = lerp(y0, ty, p * p); }, () => {
      b.lift = false; b.x = gx; b.gy = gy; b.sq = 0.8; busy = false;
      puff("snow", gx, gy - 2, 5);
      saveSoon();
      if (!quiet) hint();
    });
  }

  // =====================================================================================================
  // Dressing and taking off
  // =====================================================================================================
  // Puts a piece on with choice opt, or swaps the choice when that piece is already on. Eyes and smile stones go on
  // one at a time (the next empty place); buttons, arms and mittens go on together (mittens bring the stick arms).
  // from: where it flies in from (his finger, or the tile). Returns true when something changed.
  function putPiece(k, opt, from, btn) {
    if (locked() || !KIND[k]) return false;
    const K = KIND[k];
    if (S.step !== "dress") {
      if (btn) Toybox.wiggle(btn);
      coach.say("Build the snowman first. Then dress him.", 3);
      ghost.poke();
      return false;
    }
    const d = S.D[k];
    opt = clamp(opt | 0, 0, K.opts.length - 1);
    ghost.learned("dress");
    if (anyOn(k) && d.opt !== opt) {
      // A different choice: the old one goes back in the box and the new one goes on in its place.
      d.on.forEach((v, j) => { if (v) sendToBox(k, K.slots ? j : -1, d.opt, 0, 0, 0.12); });
      d.opt = opt;
      d.on.forEach((v, j) => { if (v) fly(k, K.slots ? j : -1, from); });
      tagSoon(k, opt);
    } else if (K.slots) {
      const j = d.on.indexOf(false);
      if (j < 0) { fullNote(k, btn); return false; }
      d.opt = opt; d.on[j] = true;
      fly(k, j, from);
    } else {
      if (d.on[0]) { fullNote(k, btn); return false; }
      d.opt = opt; d.on[0] = true;
      fly(k, -1, from);
      if (k === "mittens" && !S.D.arms.on[0]) { S.D.arms.on[0] = true; fly("arms", -1, from); }
      if (many(k)) tagSoon(k, opt);
    }
    updateTiles();
    saveSoon();
    checkDone();
    return true;
  }
  function fullNote(k, btn) {
    if (btn) Toybox.wiggle(btn);
    const g = geom(S), a = anchorOf(g, k, KIND[k].slots ? KIND[k].slots - 1 : 0);
    tag(KIND[k].opts[S.D[k].opt].tag, a.x, a.y - 14);
  }
  function tagSoon(k, opt) {
    later(0.55, () => { if (S.step !== "dress") return; const a = anchorOf(geom(S), k, 0); tag(KIND[k].opts[opt].tag, a.x, a.y - 16); });
  }
  // A piece flying to its place from a point (dx, dy from its place); j is -1 for a whole piece.
  function fly(k, j, from, delay) {
    const a = anchorOf(geom(S), k, Math.max(0, j)), f = from || { x: a.x, y: a.y - 150 };
    flights = flights.filter((q) => !(q.k === k && q.j === j));
    flights.push({ k, j, dx: f.x - a.x, dy: f.y - a.y, t0: now() + (delay || 0), dur: 0.5, arc: Math.hypot(f.x - a.x, f.y - a.y) > 80 ? 1 : 0.3 });
  }
  function landFlights(t) {
    if (S.step !== "dress") { flights = []; gone = []; return; }
    flights = flights.filter((f) => {
      if (t < f.t0 + f.dur) return true;
      const a = anchorOf(geom(S), f.k, Math.max(0, f.j)), face = KIND[f.k].face;
      puff("spark", a.x, a.y, face ? 3 : 6);
      if (!face) pwob[f.k] = 0.7;
      return false;
    });
    gone = gone.filter((q) => {
      if (t < q.t0 + q.dur) return true;
      boxBounce = 1;
      const bx = boxGeo();
      puff("snow", bx.x, bx.gy - bx.h, 4);
      return false;
    });
  }
  // Takes a piece (or one eye, one smile stone) off: it goes back into the box from where he let go of it.
  function takeOff(k, j, dx, dy) {
    const d = S.D[k];
    if (KIND[k].slots) d.on[j] = false; else d.on[0] = false;
    sendToBox(k, KIND[k].slots ? j : -1, d.opt, dx, dy, 0);
    if (k === "arms" && S.D.mittens.on[0]) { S.D.mittens.on[0] = false; sendToBox("mittens", -1, S.D.mittens.opt, dx, dy, 0); }
    updateTiles();
    saveSoon();
  }
  function sendToBox(k, j, opt, dx, dy, delay) {
    const g = geom(S), a = anchorOf(g, k, Math.max(0, j)), bx = boxGeo();
    gone.push({ k, j, opt, g, a, dx, dy, tx: bx.x - a.x, ty: bx.gy - bx.h - 6 - a.y, t0: now() + (delay || 0), dur: 0.5 });
  }
  // A real completion: some pieces on (and again when he has put everything on).
  function checkDone() {
    const kinds = KINDS.filter((k) => anyOn(k.id)).length;
    if (!S.k1 && kinds >= 3) { S.k1 = true; later(1.2, () => Toybox.kind()); }
    if (!S.all && allOn()) {
      S.all = true;
      later(0.8, () => {
        if (S.step !== "dress") return;
        const g = geom(S);
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; puff("spark", g.mx + Math.cos(a) * 110, g.my + Math.sin(a) * 90 - 40, 2); }
        coach.say("The snowman is all dressed.", 4);
        if (S.k1) later(2.5, () => Toybox.kind());
      });
    }
  }

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillStroke(fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.stroke();
  }
  function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function star(x, y, r) {
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU - Math.PI / 2, q = k % 2 ? r * 0.38 : r; k ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
    ctx.closePath();
  }
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 6, 1800); }

  // =====================================================================================================
  // Drawing the yard
  // =====================================================================================================
  const BULBS = ["#E8303F", "#3FA34D", "#FFC93C", "#2F8CFF"];
  let lightsGlow = 0, windowGlow = 0, smokeAt = 0;
  const HOUSE_TOP = 96;
  function windowRect() { const R = Y.houseR, ww = Math.min(64, R * 0.56); return { x: R * 0.5 - ww / 2 - 4, y: HOUSE_TOP + 34, w: ww, h: 60 }; }
  function chimneyRect() { return { x: Y.houseR * 0.3, y: HOUSE_TOP - 84, w: 22, h: 46 }; }
  function drawYard(t) {
    const v = vis(), x0 = v.x0 - 2, x1 = v.x1 + 2, y0 = v.y0 - 2, y1 = v.y1 + 2;
    const sky = ctx.createLinearGradient(0, Math.min(0, y0), 0, HY);
    sky.addColorStop(0, "#A9D3F5"); sky.addColorStop(1, "#E3F1FF");
    ctx.fillStyle = sky; ctx.fillRect(x0, y0, x1 - x0, HY - y0 + 2);
    // Snowy hills far away.
    ctx.beginPath(); ctx.moveTo(x0, HY);
    for (let x = x0; x <= x1 + 20; x += 20) ctx.lineTo(x, HY - 52 - 22 * Math.sin(x * 0.006 + 1) - 9 * Math.sin(x * 0.017));
    ctx.lineTo(x1, HY); ctx.closePath(); ctx.fillStyle = "#D3E3F5"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x0, HY);
    for (let x = x0; x <= x1 + 20; x += 20) ctx.lineTo(x, HY - 26 - 12 * Math.sin(x * 0.009 + 2.5));
    ctx.lineTo(x1, HY); ctx.closePath(); ctx.fillStyle = "#E7F0FB"; ctx.fill();
    Y.trees.forEach((tr) => drawTree(tr, t));
    drawHouse(t);
    drawFence(x1);
    // The snow in the yard.
    ctx.beginPath(); ctx.moveTo(x0, HY + 4);
    for (let x = x0; x <= x1 + 16; x += 16) ctx.lineTo(x, HY + 3 - 3 * Math.sin(x * 0.045) - 2 * Math.sin(x * 0.13));
    ctx.lineTo(x1, y1); ctx.lineTo(x0, y1); ctx.closePath();
    ctx.fillStyle = "#F6FAFF"; ctx.fill();
    ctx.beginPath();
    for (let x = x0; x <= x1 + 16; x += 16) { const y = HY + 3 - 3 * Math.sin(x * 0.045) - 2 * Math.sin(x * 0.13); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.lineWidth = 2; ctx.strokeStyle = "#B4C8E3"; ctx.stroke();
    // Soft drifts.
    ctx.fillStyle = "#EAF1FB";
    [[0.18, 0.72, 90], [0.62, 0.55, 120], [0.86, 0.86, 80], [0.4, 0.93, 110]].forEach(([fx, fy, r]) => {
      ell(fx * WW, HY + (HW - HY) * fy, r, r * 0.16); ctx.fill();
    });
  }
  function drawTree(tr, t) {
    const s = tr.s, h = 200 * s, w = 70 * s;
    const sway = tr.shake * Math.sin(t * 22) * 0.05 + windNow(t) * Math.sin(t * 5 + tr.x) * 0.035;
    ctx.save(); ctx.translate(tr.x, HY - 6); ctx.rotate(sway);
    rr(-8 * s, -22 * s, 16 * s, 26 * s, 3); fillStroke("#8A5A36");
    for (let k = 0; k < 3; k++) {
      const tw = w * (1 - k * 0.22), yb = -18 * s - k * h * 0.26, yt = yb - h * 0.44;
      ctx.beginPath(); ctx.moveTo(0, yt);
      ctx.lineTo(tw, yb); ctx.quadraticCurveTo(tw * 0.5, yb - 8 * s, 0, yb + 2 * s); ctx.quadraticCurveTo(-tw * 0.5, yb - 8 * s, -tw, yb); ctx.closePath();
      fillStroke("#2F8F5B");
      // Snow lying on the branches.
      const sy = yt + (yb - yt) * 0.52, sx = tw * 0.52;
      ctx.beginPath(); ctx.moveTo(0, yt + 2);
      ctx.lineTo(sx, sy);
      for (let q = 1; q <= 4; q++) { const x = sx - sx * 2 * q / 4; ctx.quadraticCurveTo(x + sx / 4, sy + (q % 2 ? 7 : 2) * s, x, sy - (q % 2 ? 0 : 3) * s); }
      ctx.closePath();
      ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "#9FB5D3"; ctx.stroke();
    }
    ctx.restore();
  }
  function drawHouse(t) {
    const R = Y.houseR, top = HOUSE_TOP, L = vis().x0 - 30;
    // Chimney (behind the roof), with gentle smoke.
    const ch = chimneyRect();
    rr(ch.x, ch.y, ch.w, ch.h, 2); fillStroke("#B5524A");
    ell(ch.x + ch.w / 2, ch.y, ch.w * 0.62, 5); fillStroke("#FFFFFF", 1.8);
    // Wall with siding and a white corner board.
    ctx.fillStyle = "#C8483F"; ctx.fillRect(L, top, R - L, HY + 12 - top);
    ctx.strokeStyle = "#AD3C34"; ctx.lineWidth = 1.5;
    for (let y = top + 16; y < HY + 8; y += 15) { ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R, y); ctx.stroke(); }
    ctx.beginPath(); ctx.rect(L, top, R - L, HY + 12 - top); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    rr(R - 9, top, 9, HY + 12 - top, 1); fillStroke("#F4F1EA");
    // The window: warm light inside and a wreath.
    const wr = windowRect(), glow = 0.3 + windowGlow * 0.5;
    ctx.fillStyle = `rgba(255, 214, 110, ${glow})`; rr(wr.x - 14, wr.y - 14, wr.w + 28, wr.h + 28, 14); ctx.fill();
    rr(wr.x - 5, wr.y - 5, wr.w + 10, wr.h + 10, 3); fillStroke("#FFFFFF");
    const gl = ctx.createLinearGradient(0, wr.y, 0, wr.y + wr.h);
    gl.addColorStop(0, "#FFE9A8"); gl.addColorStop(1, "#FFC85A");
    ctx.beginPath(); ctx.rect(wr.x, wr.y, wr.w, wr.h); fillStroke(gl, 1.8);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(wr.x + wr.w / 2 - 2, wr.y, 4, wr.h); ctx.fillRect(wr.x, wr.y + wr.h / 2 - 2, wr.w, 4);
    const cx = wr.x + wr.w / 2, cy = wr.y + wr.h * 0.42;
    ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.lineWidth = 9; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = 5.5; ctx.strokeStyle = "#2F8F5B"; ctx.stroke();
    [0.4, 1.6, 2.8, 4.1, 5.3].forEach((a) => { ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 2.2, 0, TAU); ctx.fillStyle = "#E8303F"; ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx - 7, cy + 7); ctx.lineTo(cx - 7, cy + 17); ctx.closePath(); fillStroke("#E8303F", 1.5);
    ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx + 7, cy + 7); ctx.lineTo(cx + 7, cy + 17); ctx.closePath(); fillStroke("#E8303F", 1.5);
    rr(wr.x - 9, wr.y + wr.h + 4, wr.w + 18, 7, 3.5); fillStroke("#FFFFFF", 1.8);
    // Roof covered in snow, the slate edge along the eaves, icicles.
    ctx.beginPath(); ctx.moveTo(L, top + 2); ctx.lineTo(R + 18, top + 2); ctx.lineTo(R - 26, top - 48); ctx.lineTo(L, top - 48); ctx.closePath();
    fillStroke("#F7FAFF");
    ctx.strokeStyle = "#C5D5EA"; ctx.lineWidth = 1.5;
    for (let k = 1; k < 3; k++) { const y = top + 2 - k * 16; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(R + 18 - k * 14.7, y); ctx.stroke(); }
    rr(L, top - 3, R + 20 - L, 8, 2); fillStroke("#5B6478", 2);
    for (let x = 6; x < R + 8; x += 22) {
      const len = 7 + hash(x, 5) * 9;
      ctx.beginPath(); ctx.moveTo(x - 3, top + 5); ctx.lineTo(x + 3, top + 5); ctx.lineTo(x, top + 5 + len); ctx.closePath();
      ctx.fillStyle = "#DDF0FF"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = "#7E9BC4"; ctx.stroke();
    }
    // Christmas lights along the eaves.
    ctx.beginPath(); ctx.moveTo(L, top + 6);
    const hooks = [];
    for (let x = -4; x < R + 14; x += 24) hooks.push(x);
    hooks.forEach((x, k) => { if (k) ctx.quadraticCurveTo((hooks[k - 1] + x) / 2, top + 16, x, top + 6); else ctx.lineTo(x, top + 6); });
    ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
    hooks.forEach((x, k) => {
      if (!k) return;
      const bx = (hooks[k - 1] + x) / 2, by = top + 13, col = BULBS[k % BULBS.length];
      const tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 1.3 + k * 1.7);
      const g = Math.min(1, tw * 0.35 + lightsGlow * 0.6);
      ctx.globalAlpha = g; ctx.beginPath(); ctx.arc(bx, by + 5, 8 + lightsGlow * 4, 0, TAU); ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
      ell(bx, by + 5, 3.4, 5); fillStroke(col, 1.4);
      rr(bx - 2.5, by - 1, 5, 3.5, 1); fillStroke("#5B6478", 1);
    });
    if (t > smokeAt) { smokeAt = t + (reduce ? 2.4 : 1.3); puff("smoke", ch.x + ch.w / 2, ch.y - 6, 1); }
  }
  function drawFence(x1) {
    const x0 = Y.houseR - 2;
    [HY - 46, HY - 24].forEach((y) => { ctx.beginPath(); ctx.rect(x0, y, x1 - x0, 9); fillStroke("#B98250", 2); });
    rr(x0, HY - 51, x1 - x0, 6, 3); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    for (let x = Y.houseR + 26; x < x1 + 20; x += 54) {
      rr(x - 7, HY - 60, 14, 66, 3); fillStroke("#A8723F", 2);
      ell(x, HY - 60, 9.5, 4.5); fillStroke("#FFFFFF", 1.6);
    }
  }
  // Snow falling: always a little, calm; thicker for a moment on Surprise.
  const FLAKES = [], HEAVY = [];
  for (let k = 0; k < (reduce ? 16 : 40); k++) FLAKES.push({ u: Math.random(), y: Math.random() * HW, s: 1.6 + Math.random() * 2.2, sp: 14 + Math.random() * 16, ph: Math.random() * TAU });
  for (let k = 0; k < (reduce ? 40 : 120); k++) HEAVY.push({ u: Math.random(), y: Math.random() * HW, s: 2.4 + Math.random() * 2.4, sp: 34 + Math.random() * 24, ph: Math.random() * TAU });
  function stepFlakes(dt, t) {
    const v = vis(), span = Math.max(1, v.x1 - v.x0), wind = windNow(t), slow = reduce ? 0.6 : 1;
    const go = (f) => {
      f.y += f.sp * dt * slow;
      f.u += ((Math.sin(t * 0.7 + f.ph) * 7 + wind * 170) * dt * slow) / span;
      if (f.y > v.y1 + 6) { f.y = v.y0 - 6; f.u = Math.random(); }
      if (f.u > 1.02) f.u -= 1.04; else if (f.u < -0.02) f.u += 1.04;
    };
    FLAKES.forEach(go);
    if (heavyNow(t) > 0) HEAVY.forEach(go);
  }
  function drawFlakes(t) {
    const v = vis(), span = v.x1 - v.x0, hv = heavyNow(t);
    ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "rgba(110, 140, 185, 0.55)"; ctx.lineWidth = 1;
    const one = (f) => { ctx.beginPath(); ctx.arc(v.x0 + f.u * span, f.y, f.s, 0, TAU); ctx.fill(); ctx.stroke(); };
    FLAKES.forEach(one);
    if (hv > 0) { ctx.globalAlpha = hv; HEAVY.forEach(one); ctx.globalAlpha = 1; }
  }
  function drawParts() {
    for (const p of parts) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5));
      if (p.kind === "spark") { star(p.x, p.y, p.size * (0.6 + a * 0.4)); ctx.fillStyle = p.color; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke(); }
      else if (p.kind === "smoke") { ctx.globalAlpha = a * 0.7; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fillStyle = "#EEF1F6"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(120, 130, 150, 0.5)"; ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = "#9DB4D4"; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }

  // =====================================================================================================
  // Drawing the box
  // =====================================================================================================
  // An open cardboard box of snowman things. What is not on the snowman peeks out of it. While he carries a piece
  // off the snowman its flaps open wider, and over it the box glows.
  let boxBounce = 0, boxWob = 0, boxOpen = 0;
  function overBox(w) { const b = boxGeo(); return w.x > b.x - b.w / 2 - 34 && w.x < b.x + b.w / 2 + 44 && w.y > b.gy - b.h - b.d - 60 && w.y < b.gy + 14; }
  function drawBox(t) {
    const b = boxGeo(), x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, top = b.gy - b.h, d = b.d;
    const carrying = drag && drag.k === "piece", hover = carrying && overBox({ x: drag.x, y: drag.y });
    ell(b.x + 6, b.gy - 3, b.w * 0.62, 10); ctx.fillStyle = "rgba(90, 120, 170, 0.22)"; ctx.fill();
    ctx.save();
    const sq = Math.sin(boxBounce * Math.PI * 3) * boxBounce * 0.06 + Math.sin(boxWob * 20) * boxWob * 0.03;
    ctx.translate(b.x, b.gy); ctx.scale(1 + sq, 1 - sq); ctx.translate(-b.x, -b.gy);
    if (hover) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 8);
      ctx.globalAlpha = 0.45 + pulse * 0.25;
      ctx.beginPath(); ctx.ellipse(b.x + 5, top - d / 2, b.w * 0.75, b.h * 0.95, 0, 0, TAU); ctx.fillStyle = "#FFE7A0"; ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Inside (the dark back of the open top).
    ctx.beginPath(); ctx.moveTo(x0, top); ctx.lineTo(x0 + 10, top - d); ctx.lineTo(x1 + 10, top - d); ctx.lineTo(x1, top); ctx.closePath();
    fillStroke("#8A5A36", 2);
    drawBoxThings(b, top, t);
    // The flaps stand open; wider while a piece is carried, widest over the box.
    const th = lerp(0.42, 1.15, boxOpen), fl = 30;
    const flap = (hx, sgn) => {
      const vx = sgn * Math.sin(th) * fl, vy = -Math.cos(th) * fl;
      ctx.beginPath(); ctx.moveTo(hx, top); ctx.lineTo(hx + 10, top - d); ctx.lineTo(hx + 10 + vx, top - d + vy); ctx.lineTo(hx + vx, top + vy); ctx.closePath();
      fillStroke("#E2B07A", 2);
    };
    flap(x0, -1); flap(x1, 1);
    // Right side and front.
    ctx.beginPath(); ctx.moveTo(x1, top); ctx.lineTo(x1 + 10, top - d); ctx.lineTo(x1 + 10, b.gy - d); ctx.lineTo(x1, b.gy); ctx.closePath();
    fillStroke("#B97B42", 2);
    ctx.beginPath(); ctx.rect(x0, top, b.w, b.h); fillStroke("#D9A066");
    ctx.fillStyle = "#E9C08E"; ctx.fillRect(b.x - 9, top + 1.5, 18, b.h - 3);
    ctx.strokeStyle = "rgba(29, 35, 64, 0.25)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0 + 8, top + 14); ctx.lineTo(x1 - 8, top + 14); ctx.stroke();
    // A scarf off the snowman hangs over the front edge.
    if (S.step !== "dress" || !S.D.scarf.on[0]) {
      const o = KIND.scarf.opts[S.D.scarf.opt];
      rr(x1 - 30, top - 6, 15, 34, 4); fillStroke(o.hex, 1.8);
      if (o.stripe) { ctx.fillStyle = o.stripe; ctx.fillRect(x1 - 29, top + 10, 13, 4); ctx.fillRect(x1 - 29, top + 18, 13, 4); }
    }
    if (hover) {
      rr(x0 - 8, top - d - 8, b.w + 26, b.h + d + 14, 12);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.restore();
  }
  // The snowman things waiting in the box (only what is not on the snowman).
  function drawBoxThings(b, top) {
    const D = S.D, off = (k) => S.step !== "dress" || !full(k);
    if (off("arms")) {
      drawStick({ sx: b.x - 34, sy: top + 4, ex: b.x - 46, ey: top - 34, a: -1.82, L: 39, s: -1 }, false);
      drawStick({ sx: b.x - 22, sy: top + 4, ex: b.x - 10, ey: top - 32, a: -1.2, L: 37, s: 1 }, false);
    }
    if (off("hat")) {
      ctx.save(); ctx.translate(b.x + 26, top + 2); ctx.rotate(0.35);
      drawHatKind(D.hat.opt, { hx: 0, hy: 12, hr: 19 }, 0);
      ctx.restore();
    }
    if (off("nose")) drawCarrot(b.x - 4, top - 2, 30, 10, -0.75);
    if (off("eyes") || off("smile")) { drawCoal(b.x - 16, top - 3, 5.5, 3); drawCoal(b.x + 2, top - 1, 5, 8); drawCoal(b.x - 7, top - 7, 4.5, 5); }
  }

  // =====================================================================================================
  // Drawing the snowballs and the snowman
  // =====================================================================================================
  // Soft shading and little bumps of packed snow on a snowball's surface, spread evenly round it (it stays clean).
  const SPECKS = Array.from({ length: 34 }, (_, i) => {
    const y = 1 - (i + 0.5) / 34 * 2, rad = Math.sqrt(1 - y * y), th = i * 2.39996;
    return { p: [Math.cos(th) * rad, y, Math.sin(th) * rad], k: i % 3 === 0 ? 1 : 0, s: 0.6 + hash(i, 1) * 0.8 };
  });
  const TILT = 0.38, CT = Math.cos(TILT), ST = Math.sin(TILT);
  function drawBallBody(x, y, r, M) {
    const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.45, r * 0.08, x - r * 0.1, y - r * 0.1, r * 1.15);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(0.6, "#EEF4FD"); g.addColorStop(1, "#BED0EA");
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    const base = ctx.globalAlpha;
    for (const sp of SPECKS) {
      const p = sp.p;
      const qx = M[0] * p[0] + M[1] * p[1] + M[2] * p[2], qy = M[3] * p[0] + M[4] * p[1] + M[5] * p[2], qz = M[6] * p[0] + M[7] * p[1] + M[8] * p[2];
      const v = qy * ST + qz * CT;
      if (v < 0.08) continue;
      const sx = x + qx * r * 0.96, sy = y - (qy * CT - qz * ST) * r * 0.96;
      ctx.globalAlpha = base * Math.min(1, v * 2.5);
      if (sp.k === 0) { const q = r * 0.05 * sp.s + 0.6; ell(sx, sy, q, q * (0.5 + 0.5 * v)); ctx.fillStyle = "#C3D3EA"; ctx.fill(); }
      else { ell(sx, sy, r * 0.1 * sp.s + 0.8, (r * 0.08 * sp.s + 0.6) * (0.5 + 0.5 * v)); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = "#C3D3EA"; ctx.stroke(); }
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
  }
  // A snowball sitting on the snow: its shadow, the ball (popping up, squashing when it lands) and a little snow
  // banked round its foot.
  function drawGroundBall(b) {
    const r = b.r * b.pop;
    if (r < 0.5) return;
    ell(b.x, b.gy, r * 0.95, r * 0.26); ctx.fillStyle = "rgba(90, 120, 170, 0.22)"; ctx.fill();
    ctx.save();
    if (b.sq > 0) { const s = Math.sin(b.sq * Math.PI * 3) * b.sq * 0.07; ctx.translate(b.x, b.gy); ctx.scale(1 + s, 1 - s); ctx.translate(-b.x, -b.gy); }
    drawBallBody(b.x, b.gy - r * SIT, r, b.M);
    ctx.restore();
    ell(b.x, b.gy - 1, r * 0.62, r * 0.1); ctx.fillStyle = "#F6FAFF"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(b.x, b.gy - 1, r * 0.62, r * 0.1, 0, Math.PI, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = "#B4C8E3"; ctx.stroke();
  }
  function drawLifted(b) {
    const gy = Math.min(Y.gy1, b.ly + b.r + 36);
    ell(b.lx, gy, b.r * 0.7, b.r * 0.18); ctx.fillStyle = "rgba(90, 120, 170, 0.16)"; ctx.fill();
    drawBallBody(b.lx, b.ly, b.r, b.M);
  }
  // The offset of piece (k, j) while it flies to its place: null when it is in place, "wait" before it starts.
  function flightOff(k, j, t) {
    const f = flights.find((q) => q.k === k && q.j === j);
    if (!f) return null;
    const p = (t - f.t0) / f.dur;
    if (p < 0) return "wait";
    const e = ease(Math.min(1, p));
    return { x: f.dx * (1 - e), y: f.dy * (1 - e) - Math.sin(Math.min(1, p) * Math.PI) * 50 * f.arc };
  }
  // Draws the bits of piece k with choice opt: all of them, or just bit j (one eye, one smile stone).
  function drawPiece(g, k, opt, j, t, o) {
    const w = o.w || 0, arms = (wob) => [0, 1].map((q) => armAt(g, q, wob + (o.wind || 0) * Math.sin(t * 7 + q) * 0.04));
    const each = (n, fn) => { for (let q = 0; q < n; q++) if (j < 0 || j === q) fn(q); };
    const O = KIND[k].opts[opt];
    switch (k) {
      case "eyes": each(2, (q) => { const sp = pieceSpot(g, "eyes", q); if (O.id === "coal") drawCoal(sp.x, sp.y, sp.r, q * 2 + 1); else drawButtonEye(sp.x, sp.y, sp.r * 1.05); }); break;
      case "nose": { const sp = pieceSpot(g, "nose", 0); drawCarrot(sp.x, sp.y, g.hr * 0.82, g.hr * 0.27, 0.2); break; }
      case "smile": each(5, (q) => { const sp = pieceSpot(g, "smile", q); drawCoal(sp.x, sp.y, sp.r, q + 7); }); break;
      case "buttons": each(3, (q) => { const sp = pieceSpot(g, "buttons", q), r = sp.r * (1 + Math.sin(t * 18) * w * 0.25); if (O.id === "coal") drawCoal(sp.x, sp.y, r * 0.95, q + 11); else drawButton(sp.x, sp.y, r, O); }); break;
      case "arms": arms(Math.sin(t * 16) * w * 0.18).forEach((am) => drawStick(am, o.mitts)); break;
      case "mittens": arms(Math.sin(t * 16) * (o.aw || 0) * 0.18).forEach((am) => drawMitten(am, O, w, t)); break;
      case "scarf": drawScarf(g, O, t, Math.max(w, o.wind || 0)); break;
      case "hat": drawHatKind(opt, g, Math.abs(Math.sin(t * 9)) * w * 12); break;
    }
  }
  // The snowman: the big snowball, the stacked ones, and the pieces he put on (each where it belongs, flying on,
  // or left out while he carries it).
  const ORDER_BACK = ["arms"], ORDER_MID = ["buttons"], ORDER_FRONT = ["scarf", "mittens", "eyes", "nose", "smile", "hat"];
  function drawSnowman(B, t) {
    const b0 = B.balls[0];
    if (!b0) return;
    const live = B === S, D = B.D;
    const a = live ? Math.sin(sm.ph) * sm.wob * 0.05 : 0;
    ctx.save();
    ctx.translate(b0.x, b0.gy); ctx.scale(1 + a, 1 - a); ctx.translate(-b0.x, -b0.gy);
    drawGroundBall(b0);
    const st1 = B.balls[1] && B.balls[1].stacked, st2 = st1 && B.balls[2] && B.balls[2].stacked;
    const g = st2 ? geom(B) : null;
    const pieces = (list) => {
      if (!g) return;
      list.forEach((k) => {
        const d = D[k], n = KIND[k].slots || 0;
        const o = { w: live ? (pwob[k] || 0) : 0, aw: live ? (pwob.arms || 0) : 0, wind: live ? windNow(t) : 0, mitts: D.mittens.on[0] };
        const one = (j) => {
          if (live && drag && drag.k === "piece" && drag.kind === k && drag.j === j) return;
          if (live && k === "mittens" && drag && drag.k === "piece" && drag.kind === "arms") return;
          let f = live ? flightOff(k, j, t) : null;
          if (live && k === "mittens" && !f) f = flightOff("arms", -1, t);
          if (f === "wait") return;
          if (f) { ctx.save(); ctx.translate(f.x, f.y); drawPiece(g, k, d.opt, j, t, o); ctx.restore(); }
          else drawPiece(g, k, d.opt, j, t, o);
        };
        if (n) d.on.forEach((v, j) => { if (v) one(j); });
        else if (d.on[0]) one(-1);
      });
    };
    pieces(ORDER_BACK);
    if (st1) { const c = stackAt(B, 1); drawBallBody(c.x, c.y, B.balls[1].r, B.balls[1].M); }
    pieces(ORDER_MID);
    if (st2) { const c = stackAt(B, 2); drawBallBody(c.x, c.y, B.balls[2].r, B.balls[2].M); }
    // The face: only the pieces he put on, each where he put it; it never moves by itself.
    pieces(ORDER_FRONT);
    ctx.restore();
  }
  // The piece in his hand, and pieces on their way back into the box (drawn over everything).
  function drawCarried(t) {
    if (S.step !== "dress") return;
    if (drag && drag.k === "piece") {
      const g = geom(S), k = drag.kind, d = S.D[k];
      ctx.save(); ctx.translate(drag.x - drag.gx, drag.y - drag.gy);
      if (k === "arms") drawPiece(g, "arms", d.opt, -1, t, { mitts: S.D.mittens.on[0] });
      if (k === "arms" && S.D.mittens.on[0]) drawPiece(g, "mittens", S.D.mittens.opt, -1, t, {});
      if (k !== "arms") drawPiece(g, k, d.opt, drag.j, t, { mitts: S.D.mittens.on[0] });
      ctx.restore();
    }
    gone.forEach((q) => {
      const p = (t - q.t0) / q.dur;
      if (p < 0) return;
      const e = ease(Math.min(1, p)), dx = lerp(q.dx, q.tx, e), dy = lerp(q.dy, q.ty, e) - Math.sin(Math.min(1, p) * Math.PI) * 40, s = lerp(1, 0.35, e);
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, (p - 0.8) / 0.2);
      ctx.translate(q.a.x + dx, q.a.y + dy); ctx.scale(s, s); ctx.translate(-q.a.x, -q.a.y);
      drawPiece(q.g, q.k, q.opt, q.j, t, { mitts: false });
      ctx.restore();
    });
  }
  function drawCoal(x, y, r, seed) {
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * TAU + seed, q = r * (0.82 + 0.3 * hash(seed * 7 + k, 2));
      k ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    }
    ctx.closePath();
    fillStroke("#2B2F3A", 1.6);
    ell(x - r * 0.25, y - r * 0.3, r * 0.34, r * 0.18, -0.5); ctx.fillStyle = "#4E5568"; ctx.fill();
  }
  function drawButtonEye(x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fillStroke("#2E3A5C", 1.6);
    ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = "#5A6A92"; ctx.stroke();
    ctx.fillStyle = "#8A97B8";
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * r * 0.24, y + b * r * 0.24, r * 0.12, 0, TAU); ctx.fill(); });
  }
  function drawCarrot(x, y, len, wd, ang) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -wd / 2);
    ctx.quadraticCurveTo(len * 0.5, -wd * 0.36, len, -1.2); ctx.quadraticCurveTo(len + 2, 0, len, 1.2);
    ctx.quadraticCurveTo(len * 0.5, wd * 0.36, 0, wd / 2); ctx.quadraticCurveTo(-wd * 0.3, 0, 0, -wd / 2); ctx.closePath();
    fillStroke("#FF8A1F", 1.8);
    ctx.strokeStyle = "#C9631A"; ctx.lineWidth = 1.5;
    [0.28, 0.5, 0.72].forEach((f) => { const hw = (1 - f) * wd * 0.42; ctx.beginPath(); ctx.moveTo(len * f, -hw); ctx.lineTo(len * f + 2, -hw * 0.2); ctx.stroke(); });
    ctx.restore();
  }
  function drawButton(x, y, r, O) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fillStroke(O.hex, 1.8);
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = O.dark; ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(x - r * 0.28, y, r * 0.14, 0, TAU); ctx.arc(x + r * 0.28, y, r * 0.14, 0, TAU); ctx.fill();
  }
  function drawStick(am, mitten) {
    const tw = am.a + (am.s > 0 ? -0.78 : 0.78), fx = am.sx + Math.cos(am.a) * am.L * 0.55, fy = am.sy + Math.sin(am.a) * am.L * 0.55;
    const segs = [[am.sx, am.sy, am.ex, am.ey, 5.5], [fx, fy, fx + Math.cos(tw) * 22, fy + Math.sin(tw) * 22, 3.5]];
    if (!mitten) [-0.5, 0.45].forEach((d) => segs.push([am.ex, am.ey, am.ex + Math.cos(am.a + d) * 12, am.ey + Math.sin(am.a + d) * 12, 3]));
    ctx.lineCap = "round";
    segs.forEach(([x0, y0, x1, y1, w]) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = w + 3.2; ctx.strokeStyle = INK; ctx.stroke(); });
    segs.forEach(([x0, y0, x1, y1, w]) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineWidth = w; ctx.strokeStyle = "#8A5A36"; ctx.stroke(); });
    ctx.lineCap = "butt";
  }
  function drawMitten(am, O, w, t) {
    ctx.save(); ctx.translate(am.ex, am.ey); ctx.rotate(am.a + Math.sin(t * 16) * w * 0.15);
    if (am.s < 0) ctx.scale(1, -1);
    ell(8, -9, 4.5, 6.5, -0.5); fillStroke(O.hex, 1.8);
    ell(13, 0, 11, 9.5); fillStroke(O.hex, 1.8);
    rr(-6, -8.5, 9, 17, 3); fillStroke("#FFFFFF", 1.8);
    ctx.restore();
  }
  function drawScarf(g, O, t, flutter) {
    const x = g.mx, y = g.neck, nw = g.hr * 1.0, bh = g.hr * 0.38;
    // The tail hangs down the front from the knot; it flutters in the wind.
    const ax = x + nw * 0.42, ay = y + bh * 0.3, len = g.mr * 0.95, tw = g.hr * 0.42;
    const ang = 0.12 + flutter * Math.sin(t * 10) * 0.3 - flutter * 0.25;
    const bx = ax + Math.sin(ang) * len, by = ay + Math.cos(ang) * len;
    const sway = flutter * Math.sin(t * 12 + 1) * 6;
    ctx.beginPath(); ctx.moveTo(ax - tw / 2, ay);
    ctx.lineTo(ax + tw / 2, ay); ctx.quadraticCurveTo((ax + bx) / 2 + tw / 2 + sway, (ay + by) / 2, bx + tw / 2, by);
    ctx.lineTo(bx - tw / 2, by); ctx.quadraticCurveTo((ax + bx) / 2 - tw / 2 + sway, (ay + by) / 2, ax - tw / 2, ay); ctx.closePath();
    ctx.save(); fillStroke(O.hex, 2); ctx.clip();
    if (O.stripe) {
      ctx.fillStyle = O.stripe;
      [0.3, 0.55, 0.8].forEach((f) => { const sx = lerp(ax, bx, f) + sway * Math.sin(f * Math.PI), sy = lerp(ay, by, f); ctx.fillRect(sx - tw, sy - 3.5, tw * 2, 7); });
    } else {
      ctx.strokeStyle = "rgba(29, 35, 64, 0.18)"; ctx.lineWidth = 1.2;
      [0.35, 0.6, 0.85].forEach((f) => { const sx = lerp(ax, bx, f), sy = lerp(ay, by, f); ctx.beginPath(); ctx.moveTo(sx - tw, sy); ctx.lineTo(sx + tw, sy); ctx.stroke(); });
    }
    ctx.restore();
    ctx.strokeStyle = O.dark; ctx.lineWidth = 2; ctx.lineCap = "round";
    for (let k = 0; k < 4; k++) { const fx = bx - tw / 2 + tw * (k + 0.5) / 4; ctx.beginPath(); ctx.moveTo(fx, by + 1); ctx.lineTo(fx + sway * 0.3, by + 7); ctx.stroke(); }
    ctx.lineCap = "butt";
    // The band round the neck.
    const band = () => {
      ctx.beginPath(); ctx.moveTo(x - nw, y - bh * 0.5);
      ctx.quadraticCurveTo(x, y - bh * 0.5 + bh * 0.6, x + nw, y - bh * 0.5);
      ctx.lineTo(x + nw * 0.96, y + bh * 0.5);
      ctx.quadraticCurveTo(x, y + bh * 0.5 + bh * 0.75, x - nw * 0.96, y + bh * 0.5); ctx.closePath();
    };
    band();
    ctx.save(); ctx.fillStyle = O.hex; ctx.fill(); ctx.clip();
    if (O.stripe) { ctx.fillStyle = O.stripe; [-0.55, 0, 0.55].forEach((f) => ctx.fillRect(x + f * nw - 3.5, y - bh, 7, bh * 2.2)); }
    ctx.restore();
    band(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ell(ax, ay + 1, tw * 0.6, bh * 0.5); fillStroke(O.dark, 2);
  }
  // The top of each hat (where the robin perches).
  function hatTop(g, opt) { return g.hy - g.hr * [2.08, 1.56, 1.62, 1.1][opt]; }
  function drawHatKind(opt, g, hop) {
    if (opt === 0) drawTopHat(g, hop);
    else if (opt === 1) drawKnitHat(g, hop);
    else if (opt === 2) drawSantaHat(g, hop);
    else drawEarmuffs(g, hop);
  }
  function drawTopHat(g, hop) {
    const r = g.hr;
    ctx.save(); ctx.translate(g.hx, g.hy - r * 0.8 - hop); ctx.rotate(-0.1);
    ell(0, 0, r * 0.98, r * 0.2); fillStroke("#2B2F3A");
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0); ctx.lineTo(-r * 0.6, -r * 1.18); ctx.lineTo(r * 0.6, -r * 1.18); ctx.lineTo(r * 0.6, 0);
    ctx.quadraticCurveTo(0, r * 0.12, -r * 0.6, 0); ctx.closePath(); fillStroke("#2B2F3A");
    ctx.fillStyle = "#454C5E"; ctx.fillRect(-r * 0.46, -r * 1.08, r * 0.12, r * 0.6);
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.4); ctx.lineTo(r * 0.6, -r * 0.4); ctx.lineTo(r * 0.6, -r * 0.16); ctx.lineTo(-r * 0.6, -r * 0.16); ctx.closePath(); fillStroke("#E8303F", 1.8);
    ell(0, -r * 1.18, r * 0.6, r * 0.12); fillStroke("#3A4050");
    // Holly on the band.
    ell(r * 0.3, -r * 0.34, r * 0.2, r * 0.08, -0.5); fillStroke("#2F8F5B", 1.4);
    ell(r * 0.5, -r * 0.3, r * 0.2, r * 0.08, 0.4); fillStroke("#2F8F5B", 1.4);
    [[0.36, -0.24], [0.44, -0.2], [0.4, -0.3]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(r * dx, r * dy, r * 0.06, 0, TAU); fillStroke("#E8303F", 1.2); });
    ctx.restore();
  }
  function drawKnitHat(g, hop) {
    const r = g.hr, x = g.hx, y = g.hy - hop;
    const dome = () => { ctx.beginPath(); ctx.moveTo(x - r * 0.97, y - r * 0.4); ctx.bezierCurveTo(x - r * 0.95, y - r * 1.48, x + r * 0.95, y - r * 1.48, x + r * 0.97, y - r * 0.4); };
    dome(); ctx.closePath();
    ctx.save(); fillStroke("#2F8CFF"); ctx.clip();
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(x - r, y - r * 0.92, r * 2, r * 0.14);
    ctx.restore();
    dome(); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    rr(x - r * 1.03, y - r * 0.58, r * 2.06, r * 0.3, r * 0.13); fillStroke("#1F64C0");
    ctx.strokeStyle = "rgba(29, 35, 64, 0.35)"; ctx.lineWidth = 1.2;
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.22, y - r * 0.54); ctx.lineTo(x + k * r * 0.22, y - r * 0.32); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y - r * 1.3, r * 0.26, 0, TAU); fillStroke("#FFFFFF");
  }
  function drawSantaHat(g, hop) {
    const r = g.hr, x = g.hx, y = g.hy - hop;
    ctx.beginPath(); ctx.moveTo(x - r * 0.92, y - r * 0.5);
    ctx.bezierCurveTo(x - r * 0.85, y - r * 1.55, x + r * 0.2, y - r * 1.85, x + r * 1.15, y - r * 1.2);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.25, x + r * 0.85, y - r * 0.85, x + r * 0.92, y - r * 0.5);
    ctx.closePath(); fillStroke("#E8303F");
    ctx.beginPath(); ctx.arc(x + r * 1.18, y - r * 1.14, r * 0.24, 0, TAU); fillStroke("#FFFFFF");
    rr(x - r * 1.04, y - r * 0.7, r * 2.08, r * 0.34, r * 0.17); fillStroke("#FFFFFF");
  }
  function drawEarmuffs(g, hop) {
    const r = g.hr, x = g.hx, y = g.hy - hop;
    ctx.beginPath(); ctx.arc(x, y - r * 0.02, r * 1.02, Math.PI * 1.06, Math.PI * 1.94);
    ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4.5; ctx.strokeStyle = "#8E4FD9"; ctx.stroke();
    [-1, 1].forEach((s) => { ell(x + s * r * 0.96, y - r * 0.1, r * 0.26, r * 0.32); fillStroke("#FF7FB5"); ell(x + s * r * 0.96, y - r * 0.1, r * 0.13, r * 0.17); ctx.fillStyle = "#FFC2DA"; ctx.fill(); });
  }

  // =====================================================================================================
  // Visitors: robin, rabbit, wind and snow
  // =====================================================================================================
  let bird = null, rabbit = null, windT = -99, heavyT = -99;
  const WIND_S = 3.4, HEAVY_S = 5.5;
  function windNow(t) { const p = (t - windT) / WIND_S; return p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0; }
  function heavyNow(t) { const p = (t - heavyT) / HEAVY_S; return p > 0 && p < 1 ? Math.min(1, Math.sin(p * Math.PI) * 1.6) : 0; }
  // Where the robin perches: the hat, else the right stick arm, else the top of the snowman, else a fence post.
  function perch() {
    if (S.step === "dress") {
      const g = geom(S);
      if (S.D.hat.on[0]) return { x: g.hx + g.hr * 0.1, y: hatTop(g, S.D.hat.opt), hop: S.D.hat.opt === 3 ? 6 : 9 };
      if (S.D.arms.on[0]) { const a = armAt(g, 1); return { x: lerp(a.sx, a.ex, 0.72), y: lerp(a.sy, a.ey, 0.72) - 3, hop: 0 }; }
      return { x: g.hx, y: g.hy - g.hr * 0.98, hop: 7 };
    }
    let top = null;
    [0, 1, 2].forEach((i) => { const b = S.balls[i]; if (b && b.done && (i === 0 || b.stacked) && !b.lift) top = i; });
    if (top !== null && !busy) { const c = ballC(S, top); return { x: c.x, y: c.y - S.balls[top].r * 0.99, hop: 6 }; }
    const x = Y.houseR + 26 + 54 * Math.max(1, Math.floor((WW - Y.houseR) / 54 / 2));
    return { x, y: HY - 64, hop: 0 };
  }
  function startBird(t) {
    const from = { x: vis().x1 + 40, y: 40 }, to = { x: vis().x0 - 40, y: 30 };
    bird = { t0: t, from, to, dir: -1 };
  }
  // In: 2.2 s. Sitting: 3.6 s with a few hops. Out: 2 s.
  function birdPose(t) {
    const b = bird, p = perch(), u = t - b.t0;
    if (u < 2.2) {
      const e = ease(u / 2.2), mx = (b.from.x + p.x) / 2, my = Math.min(b.from.y, p.y) - 40, q = 1 - e;
      return { x: q * q * b.from.x + 2 * q * e * mx + e * e * p.x, y: q * q * b.from.y + 2 * q * e * my + e * e * p.y, fly: true, dir: -1 };
    }
    if (u < 5.8) {
      const s = u - 2.2, k = Math.floor(s / 0.9), f = (s % 0.9) / 0.9;
      const side = k % 2 ? 1 : -1, hopping = f < 0.35 && k > 0 && k < 4;
      const dx = p.hop * (k % 2 ? 1 : 0) - p.hop * 0.5, up = hopping ? Math.sin(f / 0.35 * Math.PI) * 8 : 0;
      return { x: p.x + dx, y: p.y - up, fly: false, dir: side };
    }
    if (u < 7.8) {
      const e = ease((u - 5.8) / 2), q = 1 - e, mx = (p.x + b.to.x) / 2, my = Math.min(p.y, b.to.y) - 50;
      return { x: q * q * p.x + 2 * q * e * mx + e * e * b.to.x, y: q * q * p.y + 2 * q * e * my + e * e * b.to.y, fly: true, dir: -1 };
    }
    bird = null;
    return null;
  }
  function drawBird(t) {
    if (!bird) return;
    const p = birdPose(t);
    if (!p) return;
    const flap = p.fly ? Math.sin(t * 26) : 0;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir * 1.3, 1.3);
    ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(-20, -11); ctx.lineTo(-19, -3); ctx.closePath(); fillStroke("#6E5440", 1.6);
    if (!p.fly) { ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-3, 2); ctx.moveTo(3, -1); ctx.lineTo(3, 2); ctx.stroke(); }
    ell(0, -8, 11, 8); fillStroke("#8A6A4F", 1.6);
    ctx.save(); ell(0, -8, 11, 8); ctx.clip(); ell(6, -6, 7, 6.5); ctx.fillStyle = "#F0643C"; ctx.fill(); ctx.restore();
    ell(0, -8, 11, 8); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(8, -16, 6, 0, TAU); fillStroke("#8A6A4F", 1.6);
    ctx.save(); ctx.beginPath(); ctx.arc(8, -16, 6, 0, TAU); ctx.clip(); ctx.beginPath(); ctx.arc(11, -13, 4, 0, TAU); ctx.fillStyle = "#F0643C"; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(8, -16, 6, 0, TAU); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13.5, -17); ctx.lineTo(18.5, -15.5); ctx.lineTo(13.5, -14); ctx.closePath(); fillStroke("#F2B33D", 1.2);
    ctx.beginPath(); ctx.arc(9.5, -17.5, 1.3, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    if (p.fly) ell(-1, -11, 10, 4, -0.5 - flap * 0.7);
    else ell(-2, -8, 8, 4.5, 0.25);
    fillStroke("#6E5440", 1.6);
    ctx.restore();
  }
  function startRabbit(t) {
    const right = Math.random() < 0.5;
    rabbit = { t0: t, dir: right ? 1 : -1, gy: Y.gy0 + 12 };
  }
  // Hops across the back of the yard in 7 s, sitting still for a moment in the middle.
  function rabbitPose(t) {
    const u = t - rabbit.t0, v = vis(), a = rabbit.dir > 0 ? v.x0 - 40 : v.x1 + 40, b = rabbit.dir > 0 ? v.x1 + 40 : v.x0 - 40;
    if (u > 7) { rabbit = null; return null; }
    const run = u < 3 ? u / 3 * 0.5 : u < 4 ? 0.5 : 0.5 + (u - 4) / 3 * 0.5;
    const hopping = u < 3 || u >= 4, hp = hopping ? Math.abs(Math.sin(u * Math.PI * 2.2)) : 0;
    return { x: lerp(a, b, run), y: rabbit.gy, hop: hp * 14, sit: !hopping };
  }
  function drawRabbit(t) {
    const p = rabbitPose(t);
    if (!p) return;
    ell(p.x, p.y, 12, 3.5); ctx.fillStyle = "rgba(90, 120, 170, 0.2)"; ctx.fill();
    ctx.save(); ctx.translate(p.x, p.y - p.hop); ctx.scale(rabbit.dir * 1.2, 1.2);
    ell(-12, -12, 4.5, 4.5); fillStroke("#FFFFFF", 1.4);
    ell(0, -10, 13, p.sit ? 10 : 8.5); fillStroke("#A57C5B", 1.6);
    ell(7, -30, 2.8, 8.5, -0.15); fillStroke("#A57C5B", 1.4);
    ell(12, -29, 2.8, 8.5, 0.25 + (p.sit ? Math.sin(t * 6) * 0.15 : 0)); fillStroke("#A57C5B", 1.4);
    ell(7.2, -30, 1.2, 5.5, -0.15); ctx.fillStyle = "#F4B6C2"; ctx.fill();
    ctx.beginPath(); ctx.arc(10, -18, 7, 0, TAU); fillStroke("#A57C5B", 1.6);
    ctx.beginPath(); ctx.arc(12.5, -19.5, 1.3, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(16.6, -17.4, 1.3, 0, TAU); ctx.fillStyle = "#F48FA6"; ctx.fill();
    ell(8, -2, 4, 2.4); fillStroke("#A57C5B", 1.2);
    ctx.restore();
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  function want() {
    if (busy) return null;
    switch (S.step) {
      case "roll0": return { line: "Roll the snowball.", part: "ball" };
      case "roll1": return { line: "Roll a snowball for the middle.", part: "ball" };
      case "stack1": return { line: "Lift the snowball onto the big one.", part: "stack" };
      case "roll2": return { line: "Roll a small snowball for the head.", part: "ball" };
      case "stack2": return { line: "Lift the head onto the snowman.", part: "stack" };
      case "dress": return allOn() ? null : { line: "Put the pieces on the snowman.", part: "tiles" };
    }
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked() || (drag && drag.k !== "hold") || (pdrag && pdrag.on)) return;
    if (w.part !== "ball" && w.part !== "stack") return;
    const i = activeIndex(), b = S.balls[i];
    if (!b || b.lift || b.pop < 0.9) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    if (w.part === "stack") {
      const T = stackAt(S, i);
      ctx.save(); ctx.setLineDash([9, 8]);
      ctx.beginPath(); ctx.arc(T.x, T.y, b.r, 0, TAU); ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; ctx.fill();
      ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(29, 35, 64, 0.45)"; ctx.stroke();
      ctx.restore();
    }
    const c = ballC(S, i), r = b.r * b.pop + 7 + pulse * 4;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU);
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = "";
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if ((drag && drag.k !== "hold") || (pdrag && pdrag.on)) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    let p = null;
    if (w.part === "tiles") { const g = geom(S); p = vp(g.hx, (g.hy + g.my) / 2); }
    else { const b = S.balls[activeIndex()]; if (b) { const c = ballC(S, activeIndex()); p = vp(c.x, c.y); } }
    if (p) coach.avoid(p.x, p.y);
  }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    ghost.poke();
  }
  // The ghost hand shows the real move: rolling the snowball across the snow, lifting it onto the snowman,
  // carrying a hat (or another piece that is not part of the face) from the panel onto the snowman.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag || pdrag) return null;
      const w = want();
      if (!w) return null;
      const P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const i = activeIndex(), b = S.balls[i];
      if (w.part === "ball" && b) {
        const c = ballC(S, i), d = openDir(b);
        const ex = clamp(c.x + d.x * 180, Y.x0 + 40, Y.x1 - 40), ey = clamp(c.y + d.y * 90, Y.gy0 - 20, Y.gy1 - 30);
        const mx = (c.x + ex) / 2 - d.y * 30, my = (c.y + ey) / 2 + d.x * 15;
        return { pts: [P(c.x, c.y), P(mx, my), P(ex, ey)], dur: 1900, key: "roll" };
      }
      if (w.part === "stack" && b) {
        const c = ballC(S, i), T = stackAt(S, i);
        return { pts: [P(c.x, c.y), P((c.x + T.x) / 2, Math.min(c.y, T.y) - 60), P(T.x, T.y)], dur: 1800, key: "stack" };
      }
      if (w.part === "tiles") {
        if (optK) return null;
        const k = ["hat", "scarf", "arms", "buttons"].find((id) => !anyOn(id));
        const btn = k && tiles.button(k);
        if (!btn) return null;
        const r = btn.getBoundingClientRect(), sp = anchorOf(geom(S), k, 0);
        return { pts: [[r.left + r.width / 2, r.top + r.height / 2], P(sp.x, sp.y)], dur: 1800, carry: { html: OPTPIC(k, S.D[k].opt), size: 56 }, key: "dress" };
      }
      return null;
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  // The part under a press (client px). The snowball he is working with comes first and is at least a fingertip
  // wide; then the pieces on the snowman, the snowballs, the yard.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 44 / vs, i = activeIndex();
    if (i >= 0 && S.balls[i] && !S.balls[i].stacked && !busy) {
      const b = S.balls[i], c = ballC(S, i);
      if (Math.hypot(w.x - c.x, w.y - c.y) <= Math.max(b.r * 1.25, minR)) return "ball";
    }
    if (S.step === "dress") {
      const g = geom(S);
      let best = null, bd = Infinity;
      KINDS.forEach((k) => {
        for (let j = 0; j < PARTS[k.id]; j++) {
          if (!isOn(k.id, j)) continue;
          const sp = pieceSpot(g, k.id, j), d = Math.hypot(w.x - sp.x, w.y - sp.y);
          if (d <= sp.r + 10 && d < bd) { bd = d; best = "pc:" + k.id + ":" + j; }
        }
      });
      if (best) return best;
    }
    { const b = boxGeo(); if (w.x > b.x - b.w / 2 - 6 && w.x < b.x + b.w / 2 + 14 && w.y > b.gy - b.h - b.d - 36 && w.y < b.gy + 6) return "box"; }
    for (let j = 2; j >= 0; j--) {
      const b = S.balls[j];
      if (!b || (j === i && !b.stacked)) continue;
      const c = ballC(S, j);
      if (Math.hypot(w.x - c.x, w.y - c.y) <= b.r) return "sb" + j;
    }
    for (let k = 0; k < Y.trees.length; k++) {
      const tr = Y.trees[k];
      if (Math.abs(w.x - tr.x) < 62 * tr.s && w.y < HY && w.y > HY - 196 * tr.s) return "tree" + k;
    }
    const ch = chimneyRect(), wr = windowRect();
    if (w.x > ch.x - 4 && w.x < ch.x + ch.w + 4 && w.y > ch.y - 6 && w.y < ch.y + ch.h) return "chimney";
    if (w.x > wr.x - 6 && w.x < wr.x + wr.w + 6 && w.y > wr.y - 6 && w.y < wr.y + wr.h + 10) return "window";
    if (w.x < Y.houseR + 10 && w.y > HOUSE_TOP - 50 && w.y < HY + 4) return "house";
    if (w.x >= Y.houseR + 10 && w.y > HY - 62 && w.y < HY + 2) return "fence";
    return w.y > HY ? "snow" : "sky";
  }
  // A tap: each part does its own one motion; the rest of the yard answers too.
  function doTap(part, cx, cy) {
    if (locked() || part == null) return;
    const w = wpt(cx, cy), i = activeIndex();
    if (part === "ball") {
      if (busy) return;
      if (rolling()) { ghost.learned("roll"); autoRoll(i, null, 150); }
      else if (stacking()) stackTap(i);
    } else if (part === "snow") {
      const b = i >= 0 ? S.balls[i] : null;
      if (rolling() && b && !b.done && !busy) {
        const dx = w.x - b.x, dy = (w.y - b.gy) * DEPTH, d = Math.hypot(dx, dy);
        if (d > 8) { ghost.learned("roll"); autoRoll(i, { x: dx / d, y: dy / d }, clamp(d, 90, 240)); }
        puff("snow", w.x, w.y, 3);
      } else {
        puff("snow", w.x, w.y, 4);
        if (stacking() && !busy) hint();
      }
    } else if (/^sb\d$/.test(part)) {
      const j = +part[2], b = S.balls[j], c = ballC(S, j);
      if (b.stacked || (j === 0 && S.balls[1] && S.balls[1].stacked)) { sm.wob = 0.7; sm.ph = 0; }
      else b.sq = 0.8;
      tag(BALL_NAMES[j], c.x, c.y - b.r);
      if (stacking() && j !== i && !busy) hint();
    } else if (part.startsWith("pc:")) {
      const [, k, js] = part.split(":"), sp = pieceSpot(geom(S), k, +js);
      tag(KIND[k].opts[S.D[k].opt].tag, sp.x, sp.y - sp.r - 4);
      if (!KIND[k].face) pwob[k] = 1;
    } else if (part === "box") {
      boxWob = 1;
      const b = boxGeo();
      tag("Box", b.x, b.gy - b.h - b.d - 8);
      if (S.step === "dress" && KINDS.some((k) => anyOn(k.id))) coach.say("Drag a piece into the box to take it off.", 3.5);
    } else if (part.startsWith("tree")) {
      const tr = Y.trees[+part.slice(4)];
      tr.shake = 1;
      puff("snow", tr.x - 20 * tr.s, HY - 110 * tr.s, 5); puff("snow", tr.x + 24 * tr.s, HY - 60 * tr.s, 5);
      tag("Pine tree", tr.x, HY - 206 * tr.s);
    } else if (part === "house") { lightsGlow = 1; tag("House", w.x, w.y - 10); }
    else if (part === "window") { windowGlow = 1; const wr = windowRect(); tag("Window", wr.x + wr.w / 2, wr.y - 8); }
    else if (part === "chimney") { const ch = chimneyRect(); puff("smoke", ch.x + ch.w / 2, ch.y - 6, 4); tag("Chimney", ch.x + ch.w / 2, ch.y - 10); }
    else if (part === "fence") { puff("snow", w.x, HY - 56, 5); tag("Fence", w.x, HY - 64); }
    else if (part === "sky") { puff("spark", w.x, w.y, 3, "#FFFFFF"); }
  }
  const SLOP = 12;
  let tookHint = false;
  // Let go of a piece: into the box (or anywhere away from the snowman) it comes off and goes in the box; back on
  // the snowman it goes back to its place. A press held still is a tap (its name).
  function pieceUp(d, still, cancel) {
    const dx = d.x - d.gx, dy = d.y - d.gy, w = { x: d.x, y: d.y };
    if (S.step !== "dress") return;
    if (!still && !cancel && !locked() && (overBox(w) || !onSnowman(w))) { takeOff(d.kind, d.j, dx, dy); return; }
    flights = flights.filter((q) => !(q.k === d.kind && q.j === d.j));
    flights.push({ k: d.kind, j: d.j, dx, dy, t0: now(), dur: still ? 0.15 : 0.3, arc: 0 });
    if (still) doTap("pc:" + d.kind + ":" + Math.max(0, d.j), 0, 0);
  }
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null || (pdrag && pdrag.on)) return;
      const w0 = wpt(s.x0, s.y0), w = wpt(s.x, s.y), i = activeIndex(), b = i >= 0 ? S.balls[i] : null;
      if (part === "ball" && b && !busy) {
        if (rolling() && !b.done) {
          // The snowball rolls under his finger, as far as his finger goes.
          b.auto = null;
          drag = { k: "roll", i, lx: w0.x, ly: w0.y };
          ghost.learned("roll");
          moveBall(i, w.x - w0.x, w.y - w0.y);
          if (drag && drag.k === "roll") { drag.lx = w.x; drag.ly = w.y; }
        } else if (stacking() && b.done && !b.stacked) startLift(i, w0);
      }
      if (part.startsWith("pc:") && S.step === "dress" && !busy) {
        // A piece on the snowman comes off in his hand (one eye or one smile stone; anything else whole).
        const [, k, js] = part.split(":");
        drag = { k: "piece", kind: k, j: KIND[k].slots ? +js : -1, gx: w0.x, gy: w0.y, x: w.x, y: w.y };
        if (!tookHint) { tookHint = true; coach.say("Drop it in the box to take it off.", 3); }
      }
      if (!drag) drag = { k: "hold", part };
      drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy);
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const w = wpt(s.x, s.y);
      if (drag.k === "roll") {
        const d = drag;
        moveBall(d.i, w.x - d.lx, w.y - d.ly);
        d.lx = w.x; d.ly = w.y;
      } else if (drag.k === "lift") liftMove(w);
      else if (drag.k === "piece") { drag.x = w.x; drag.y = w.y; }
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (d.k === "hold") { if (still && !locked() && !s.cancel) doTap(d.part, s.x, s.y); }
      else if (d.k === "roll") { if (still && !locked() && !s.cancel) doTap("ball", s.x, s.y); }
      else if (d.k === "lift") liftUp(d, still && !s.cancel);
      else if (d.k === "piece") pieceUp(d, still && !s.cancel, s.cancel);
    },
    tap: (part, x, y) => { if (!drag) doTap(part, x, y); }
  });

  // =====================================================================================================
  // Dragging pieces from the panel
  // =====================================================================================================
  // A piece can be carried from its tile onto the snowman: it follows his finger and goes on where it belongs
  // when he lets go over the snowman. Let go anywhere else, it floats back to its tile. A tap on a tile (the
  // tile's own click) shows that piece's choices, or puts on a piece that has only one.
  let pdrag = null, skipClickUntil = 0;
  const carryEl = document.createElement("div");
  carryEl.className = "sn-carry";
  carryEl.setAttribute("aria-hidden", "true");
  carryEl.hidden = true;
  document.body.appendChild(carryEl);
  const carrySize = () => Math.round(clamp(vs * 84, 54, 100));
  function carryAt(x, y) {
    const s = carrySize();
    carryEl.style.width = s + "px"; carryEl.style.height = s + "px";
    carryEl.style.transform = `translate(${x - s / 2}px, ${y - s * 0.95}px)`;
  }
  function carryPt(e) { return { x: e.clientX, y: e.clientY - carrySize() * 0.45 }; }
  function onSnowman(w) {
    if (S.step !== "dress") return false;
    const g = geom(S), b0 = S.balls[0];
    return w.x > b0.x - b0.r - 70 && w.x < b0.x + b0.r + 70 && w.y > hatTop(g, 0) - 40 && w.y < b0.gy + 20;
  }
  // The tile under a press: { k, opt } (a piece tile carries its current choice), or null (Back).
  function tileWhat(btn) {
    const k = KINDS.find((q) => tiles.button(q.id) === btn);
    if (k) return { k: k.id, opt: S.D[k.id].opt };
    if (optK) for (let i = 0; i < KIND[optK].opts.length; i++) if (otiles.button("o" + i) === btn) return { k: optK, opt: i };
    return null;
  }
  tilesEl.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest ? e.target.closest(".tb-tile") : null;
    if (!btn || pdrag || locked()) return;
    const what = tileWhat(btn);
    if (what) pdrag = { k: what.k, opt: what.opt, pid: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, btn };
  });
  document.addEventListener("pointermove", (e) => {
    if (!pdrag || e.pointerId !== pdrag.pid) return;
    if (!pdrag.on) {
      if (Math.hypot(e.clientX - pdrag.x0, e.clientY - pdrag.y0) < 14) return;
      if (S.step !== "dress" || locked()) { pdrag.on = "no"; putPiece(pdrag.k, pdrag.opt, null, pdrag.btn); return; }
      pdrag.on = true;
      carryEl.classList.remove("back");
      carryEl.innerHTML = CARRYPIC(pdrag.k, pdrag.opt);
      carryEl.hidden = false;
      ghost.learned("dress");
    }
    if (pdrag.on === true) { carryAt(e.clientX, e.clientY); pdrag.cx = e.clientX; pdrag.cy = e.clientY; }
  });
  function pEnd(e, cancel) {
    if (!pdrag || e.pointerId !== pdrag.pid) return;
    const d = pdrag;
    pdrag = null;
    if (!d.on) return;
    skipClickUntil = performance.now() + 600;
    if (d.on !== true) return;
    const c = carryPt(e), w = wpt(c.x, c.y);
    if (!cancel && !locked() && onSnowman(w) && putPiece(d.k, d.opt, w, d.btn)) { carryEl.hidden = true; return; }
    // Back to its tile.
    const r = d.btn.getBoundingClientRect();
    carryEl.classList.add("back");
    carryAt(r.left + r.width / 2, r.top + r.height * 0.75);
    setTimeout(() => { if (!pdrag) { carryEl.hidden = true; carryEl.classList.remove("back"); } }, 320);
    if (!cancel && !locked() && S.step === "dress" && !onSnowman(w)) coach.say("Drop the piece on the snowman.", 3);
  }
  document.addEventListener("pointerup", (e) => pEnd(e, false));
  document.addEventListener("pointercancel", (e) => pEnd(e, true));
  // While a piece is carried over the snowman, a soft ring shows where it will go.
  function nextSpot(k, opt) {
    const g = geom(S);
    if (KIND[k].slots) {
      if (anyOn(k) && S.D[k].opt !== opt) return anchorOf(g, k, S.D[k].on.indexOf(true));
      const j = S.D[k].on.indexOf(false);
      return j < 0 ? null : pieceSpot(g, k, j);
    }
    if (S.D[k].on[0] && S.D[k].opt === opt) return null;
    const a = anchorOf(g, k, 0), sp = pieceSpot(g, k, 0);
    return { x: a.x, y: a.y, r: sp.r };
  }
  function drawCarryTarget(t) {
    if (!pdrag || pdrag.on !== true || S.step !== "dress" || pdrag.cx == null) return;
    const w = wpt(pdrag.cx, pdrag.cy - carrySize() * 0.45);
    if (!onSnowman(w)) return;
    const sp = nextSpot(pdrag.k, pdrag.opt);
    if (!sp) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.beginPath(); ctx.arc(sp.x, sp.y, clamp(sp.r * 1.2, 10, 50) + pulse * 3, 0, TAU);
    ctx.fillStyle = "rgba(255, 201, 60, 0.3)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#FFC93C"; ctx.stroke();
  }

  // =====================================================================================================
  // Panel, New and Surprise
  // =====================================================================================================
  // The pieces' pictures: each choice on its own, and for a piece with choices a tile picture showing a few of them.
  const S2 = 'stroke="#1D2340" stroke-width="2" stroke-linejoin="round"';
  const svg = (inner) => `<svg viewBox="0 0 50 50">${inner}</svg>`;
  const lump = (x, y, sc) => `<path transform="translate(${x} ${y}) scale(${sc || 1})" d="M-8 1l5-6h7l4 6-3 7h-8z" fill="#2B2F3A" ${S2}/>`;
  const btnEye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2E3A5C" ${S2}/><g fill="#8A97B8"><circle cx="${x - r * 0.28}" cy="${y - r * 0.28}" r="1.3"/><circle cx="${x + r * 0.28}" cy="${y - r * 0.28}" r="1.3"/><circle cx="${x - r * 0.28}" cy="${y + r * 0.28}" r="1.3"/><circle cx="${x + r * 0.28}" cy="${y + r * 0.28}" r="1.3"/></g>`;
  const button = (x, y, o) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${o.hex}" ${S2}/><g fill="#1D2340"><circle cx="${x - 2}" cy="${y}" r="1.3"/><circle cx="${x + 2}" cy="${y}" r="1.3"/></g>`;
  const mitten = (x, y, rot, col, flip) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip ? -1 : 1} 1)"><ellipse cx="-7" cy="-2" rx="3.6" ry="5.5" transform="rotate(-25 -7 -2)" fill="${col}" ${S2}/>` +
    `<path d="M-6 7v-10a6 6 0 0 1 12 0v10z" fill="${col}" ${S2}/><rect x="-7" y="6" width="14" height="6" rx="2" fill="#FFFFFF" ${S2}/></g>`;
  const scarf = (fill, tail, stripe) =>
    `<path d="M29 22h9l2 20-10 1z" fill="${tail}" ${S2}/>` + (stripe ? `<path d="M31 30h8M31.5 36h8" stroke="${stripe}" stroke-width="3"/>` : "") +
    `<path d="M7 13c12 5 24 5 36 0l1 10c-13 5-25 5-38 0z" fill="${fill}" ${S2}/>` + (stripe ? `<path d="M16 16v9M25 17v9M34 16v9" stroke="${stripe}" stroke-width="3"/><path d="M7 13c12 5 24 5 36 0l1 10c-13 5-25 5-38 0z" fill="none" ${S2}/>` : "");
  const HATPIC = [
    `<ellipse cx="25" cy="39" rx="21" ry="5" fill="#2B2F3A" ${S2}/><path d="M13 39V11h24v28c-8 2-16 2-24 0z" fill="#2B2F3A" ${S2}/><path d="M13 29h24v6H13z" fill="#E8303F" ${S2}/><ellipse cx="25" cy="11" rx="12" ry="3" fill="#3A4050" ${S2}/>`,
    `<path d="M9 35C9 10 41 10 41 35z" fill="#2F8CFF" ${S2}/><path d="M11 24h28" stroke="#FFFFFF" stroke-width="3"/><rect x="7" y="32" width="36" height="9" rx="4" fill="#1F64C0" ${S2}/><circle cx="25" cy="10" r="6" fill="#FFFFFF" ${S2}/>`,
    `<path d="M8 34C8 16 22 8 42 18c-8 0-10 6-8 16z" fill="#E8303F" ${S2}/><circle cx="42" cy="19" r="5" fill="#FFFFFF" ${S2}/><rect x="6" y="32" width="34" height="9" rx="4.5" fill="#FFFFFF" ${S2}/>`,
    `<path d="M11 32a14 14 0 0 1 28 0" fill="none" stroke="#1D2340" stroke-width="7" stroke-linecap="round"/><path d="M11 32a14 14 0 0 1 28 0" fill="none" stroke="#8E4FD9" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="11" cy="33" rx="7" ry="9" fill="#FF7FB5" ${S2}/><ellipse cx="39" cy="33" rx="7" ry="9" fill="#FF7FB5" ${S2}/>`
  ];
  const ARMS = (() => { const d = "M21 34L6 15M11 21l-1-9M6 15l-4 0M29 34l15-19M39 21l1-9M44 15l4 0"; return `<path d="${d}" fill="none" stroke="#1D2340" stroke-width="6.5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8A5A36" stroke-width="3.2" stroke-linecap="round"/>`; })();
  function OPTPIC(k, i) {
    const o = KIND[k].opts[i];
    switch (k) {
      case "eyes": return svg(i === 0 ? lump(15, 23) + lump(35, 22) : btnEye(15, 24, 7.5) + btnEye(35, 24, 7.5));
      case "nose": return svg(`<path d="M7 20c3-3 7-4 10-3l26 7c2 1 2 3 0 3L17 34c-3 1-7 0-10-3-3-3-3-8 0-11z" fill="#FF8A1F" ${S2}/><path d="M18 21v3M25 23v3M32 25v2" stroke="#C9631A" stroke-width="2" stroke-linecap="round"/>`);
      case "smile": return svg(`<g fill="#2B2F3A" ${S2}><circle cx="8" cy="19" r="4"/><circle cx="15" cy="28" r="4"/><circle cx="25" cy="32" r="4"/><circle cx="35" cy="28" r="4"/><circle cx="42" cy="19" r="4"/></g>`);
      case "buttons": return svg(o.id === "coal" ? lump(25, 9, 0.85) + lump(25, 24, 0.85) + lump(25, 39, 0.85) : button(25, 10, o) + button(25, 25, o) + button(25, 40, o));
      case "arms": return svg(ARMS);
      case "mittens": return svg(mitten(15, 24, -12, o.hex, false) + mitten(35, 24, 12, o.hex, true));
      case "scarf": return svg(scarf(o.hex, o.hex, o.stripe) + `<path d="M32 44v3M35 44v3M38 43v3" stroke="${o.dark}" stroke-width="2" stroke-linecap="round"/>`);
      case "hat": return svg(HATPIC[i]);
    }
    return svg("");
  }
  // A piece with choices shows a few of them at once on its tile.
  function MAINPIC(k) {
    const O = KIND[k].opts;
    switch (k) {
      case "eyes": return svg(lump(15, 23) + btnEye(35, 24, 7.5));
      case "buttons": return svg(lump(25, 9, 0.85) + button(25, 25, O[1]) + button(25, 40, O[2]));
      case "mittens": return svg(mitten(15, 24, -12, O[0].hex, false) + mitten(35, 24, 12, O[1].hex, true));
      case "scarf": return svg(`<path d="M29 22h9l2 20-10 1z" fill="#E8303F" ${S2}/><path d="M31 30h8M31.5 36h8" stroke="#FFFFFF" stroke-width="3"/>` +
        `<path d="M7 13c4 2 8 3 12 3.5v10C15 26 11 25 6 23z" fill="#E8303F" ${S2}/><path d="M19 16.5c4 .5 8 .5 12 0v10c-4 .5-8 .5-12 0z" fill="#2F8CFF" ${S2}/><path d="M31 16.5c4-.5 8-1.5 12-3.5l1 10c-4 2-8 3-13 3.5z" fill="#3FA34D" ${S2}/>`);
      case "hat": return svg(`<g transform="translate(-3 6) scale(0.8)">${HATPIC[2]}</g><g transform="translate(15 8) scale(0.72)">${HATPIC[0]}</g>`);
    }
    return OPTPIC(k, 0);
  }
  // What his finger carries: the chosen piece; one eye or one smile stone at a time (each goes on by itself).
  function CARRYPIC(k, i) {
    if (k === "eyes") return svg(i === 0 ? lump(25, 24, 1.4) : btnEye(25, 25, 10));
    if (k === "smile") return svg(lump(25, 24, 1.1));
    return OPTPIC(k, i);
  }
  const BACKPIC = svg(`<path d="M30 11L16 25l14 14" fill="none" stroke="#1D2340" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
  tilesEl.innerHTML = '<div id="tilesMain"></div><div id="tilesOpt" hidden></div>';
  const mainEl = $("tilesMain"), optEl = $("tilesOpt");
  const fromTile = (btn) => { if (!btn) return null; const r = btn.getBoundingClientRect(); return wpt(r.left + r.width / 2, r.top + r.height / 2); };
  // All the pieces. A tap on a piece with choices shows its choices; a piece with one choice goes straight on.
  const tiles = Toybox.tiles(mainEl, {
    items: KINDS.map((k) => ({ id: k.id, name: k.name, pic: MAINPIC(k.id) })),
    kind: "action", rows: 2,
    onPick: (id) => {
      if (performance.now() < skipClickUntil) return;
      const btn = tiles.button(id);
      if (S.step === "dress" && many(id)) { openOpts(id); return; }
      putPiece(id, S.D[id].opt, fromTile(btn), btn);
    }
  });
  // One piece's choices, with Back to all the pieces. The one on the snowman is marked (yellow, with a tick).
  let optK = null;
  const otiles = Toybox.tiles(optEl, {
    items: [], kind: "action", rows: 2,
    onPick: (id) => {
      if (performance.now() < skipClickUntil || !optK) return;
      if (id === "back") { closeOpts(); return; }
      const btn = otiles.button(id);
      putPiece(optK, +id.slice(1), fromTile(btn), btn);
    }
  });
  function openOpts(k) {
    optK = k;
    otiles.items([{ id: "back", name: "Back", pic: BACKPIC }].concat(KIND[k].opts.map((o, i) => ({ id: "o" + i, name: o.name, pic: OPTPIC(k, i) }))));
    const back = otiles.button("back");
    if (back) { back.classList.add("sn-back"); back.setAttribute("aria-label", "Back to all the pieces"); }
    mainEl.hidden = true; optEl.hidden = false;
    updateTiles();
    KIND[k].opts.forEach((o, i) => setTimeout(() => otiles.flash("o" + i), 40 + i * 60));
  }
  function closeOpts() {
    if (!optK) return;
    const k = optK;
    optK = null;
    optEl.hidden = true; mainEl.hidden = false;
    tiles.flash(k);
  }
  // The tiles wait (dimmed, still answering with a hint) until the snowman is built.
  function updateTiles() {
    if (!S) return;
    tilesEl.classList.toggle("sn-later", S.step !== "dress");
    const none = KINDS.every((q) => !anyOn(q.id));
    KINDS.forEach((k) => {
      const b = tiles.button(k.id);
      if (!b) return;
      b.classList.toggle("sn-opts", many(k.id));
      b.classList.toggle("sn-on", S.step === "dress" && full(k.id));
      b.classList.toggle("sn-next", S.step === "dress" && k.id === "hat" && none);
    });
    if (optK) {
      const d = S.D[optK];
      KIND[optK].opts.forEach((o, i) => {
        const b = otiles.button("o" + i);
        if (!b) return;
        const on = anyOn(optK) && d.opt === i;
        b.classList.toggle("sn-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
  }
  function popTiles() { KINDS.forEach((k, j) => setTimeout(() => tiles.flash(k.id), j * 60)); }
  // New: the old snowman fades, the snow fills the trails back in, and a fresh small snowball sits in the yard.
  function newYard() {
    if (locked()) return;
    drag = null; press.cancel();
    tweens = []; flights = []; gone = []; pwob = {}; busy = false;
    closeOpts();
    if (bird) bird.t0 = Math.min(bird.t0, now() - 5.8);
    oldB = S; oldA = 1;
    const o = document.createElement("canvas");
    o.width = tcv.width; o.height = tcv.height;
    o.getContext("2d").drawImage(tcv, 0, 0);
    oldTrack = { cv: o, a: 1 };
    track = []; redrawTrack();
    tween(0.7, (p) => { oldA = 1 - ease(p); }, () => { oldB = null; });
    tween(1.6, (p) => { if (oldTrack) oldTrack.a = 1 - ease(p); }, () => { oldTrack = null; });
    heavyT = Math.max(heavyT, now() - HEAVY_S * 0.3);
    S = newBuild();
    S.balls[0] = newBall(0, WW * 0.35, HY + (HW - HY) * 0.62);
    const b = S.balls[0];
    b.pop = 0;
    busy = true;
    tween(0.55, (q) => { b.pop = ease(q) + Math.sin(q * Math.PI) * 0.25; }, () => { b.pop = 1; busy = false; lastWant = ""; }, 0.5);
    lastWant = "";
    ghost.again("roll"); ghost.again("stack"); ghost.again("dress");
    updateTiles();
    save();
  }
  const bar = Toybox.bar($("bottom"), { shelf: null, onNew: newYard, onSurprise: surprise });
  // Takes turns between four live moments in the yard; none of them touches his snowman.
  let surpriseNext = 0;
  function surprise() {
    if (locked()) return;
    const t = now();
    let k = surpriseNext;
    if (k === 0 && bird) k = 1;
    if (k === 3 && rabbit) k = 0;
    surpriseNext = (k + 1) % 4;
    if (k === 0) startBird(t);
    else if (k === 1) {
      windT = t;
      const v = vis();
      for (let q = 0; q < 14; q++) later(q * 0.12, () => puff("swirl", v.x0 - 10, Y.gy0 + Math.random() * (HW - Y.gy0) * 0.9, 1));
    } else if (k === 2) heavyT = t;
    else startRabbit(t);
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT);
    lastT = t;
    runTweens(t);
    stepAuto(dt);
    stepParts(dt);
    stepFlakes(dt, t);
    landFlights(t);
    if (sm.wob > 0.002) { sm.wob *= Math.exp(-dt * 3); sm.ph += dt * 16; } else sm.wob = 0;
    S.balls.forEach((b) => { if (b && b.sq > 0) b.sq = Math.max(0, b.sq - dt * 1.6); });
    Object.keys(pwob).forEach((k) => { pwob[k] = Math.max(0, pwob[k] - dt * 1.4); });
    Y.trees.forEach((tr) => { tr.shake = Math.max(0, tr.shake - dt * 1.5); });
    lightsGlow = Math.max(0, lightsGlow - dt * 0.7);
    boxBounce = Math.max(0, boxBounce - dt * 2); boxWob = Math.max(0, boxWob - dt * 1.8);
    const carrying = drag && drag.k === "piece";
    boxOpen += ((carrying ? (overBox({ x: drag.x, y: drag.y }) ? 1 : 0.6) : 0) - boxOpen) * Math.min(1, dt * 8);
    windowGlow = Math.max(0, windowGlow - dt * 0.7);
    updateCoach();
    draw(t);
    requestAnimationFrame(frame);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
    drawYard(t);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (oldTrack) { ctx.globalAlpha = oldTrack.a; ctx.drawImage(oldTrack.cv, 0, 0); ctx.globalAlpha = 1; }
    ctx.drawImage(tcv, 0, 0);
    ctx.restore();
    // Things on the snow, back to front.
    const items = [];
    if (oldB) {
      oldB.balls.forEach((b, i) => {
        if (!b || b.stacked || b.lift) return;
        items.push({ y: b.gy - 0.5, f: () => { ctx.globalAlpha = oldA; i === 0 ? drawSnowman(oldB, t) : drawGroundBall(b); ctx.globalAlpha = 1; } });
      });
    }
    S.balls.forEach((b, i) => {
      if (!b || b.stacked || b.lift) return;
      items.push({ y: b.gy, f: () => (i === 0 ? drawSnowman(S, t) : drawGroundBall(b)) });
    });
    if (rabbit) items.push({ y: rabbit.gy, f: () => drawRabbit(t) });
    items.push({ y: boxGeo().gy - 8, f: () => drawBox(t) });
    items.sort((a, b) => a.y - b.y).forEach((it) => it.f());
    S.balls.forEach((b) => { if (b && b.lift) drawLifted(b); });
    drawParts();
    drawBird(t);
    drawFlakes(t);
    drawCarried(t);
    drawRing(t);
    drawCarryTarget(t);
  }
  function onEnding(done) {
    ending = true;
    if (drag && drag.k === "piece") pieceUp(drag, false, true);
    drag = null; press.cancel();
    if (pdrag) { pdrag = null; carryEl.hidden = true; }
    S.balls.forEach((b, i) => { if (b) { b.auto = null; if (b.lift) dropBall(i, true); } });
    save();
    setTimeout(done, 1500);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2B3A67"/>' +
      '<g fill="#FFF6C9"><circle cx="16" cy="16" r="1.6"/><circle cx="38" cy="10" r="1.2"/><circle cx="82" cy="20" r="1.6"/><circle cx="66" cy="8" r="1.1"/><circle cx="90" cy="40" r="1.2"/></g>' +
      '<circle cx="78" cy="22" r="7" fill="#FFF6C9" stroke="#1D2340" stroke-width="1.5"/>' +
      '<path d="M0 78c20-6 40-6 60-2s30 2 40-1v25H0z" fill="#F6FAFF" stroke="#1D2340" stroke-width="2"/>' +
      '<g stroke="#1D2340" stroke-width="2" fill="#FFFFFF"><circle cx="46" cy="72" r="15"/><circle cx="46" cy="50" r="11"/><circle cx="46" cy="33" r="8.5"/></g>' +
      '<path d="M38 41c5 2 11 2 16 0l1 4c-6 2-12 2-18 0z" fill="#E8303F" stroke="#1D2340" stroke-width="1.6"/>' +
      '<path d="M50 43h4l1 10h-4z" fill="#E8303F" stroke="#1D2340" stroke-width="1.6"/>' +
      '<ellipse cx="46" cy="26" rx="10" ry="2.4" fill="#2B2F3A" stroke="#1D2340" stroke-width="1.6"/><path d="M40 26V14h12v12z" fill="#2B2F3A" stroke="#1D2340" stroke-width="1.6"/>' +
      '<path d="M36 50L24 42M56 50l12-9" stroke="#1D2340" stroke-width="3.5" stroke-linecap="round"/><path d="M36 50L24 42M56 50l12-9" stroke="#8A5A36" stroke-width="1.8" stroke-linecap="round"/>' +
      '<g fill="#FFFFFF"><circle cx="20" cy="30" r="1.4"/><circle cx="30" cy="58" r="1.2"/><circle cx="70" cy="50" r="1.4"/><circle cx="84" cy="64" r="1.2"/><circle cx="12" cy="60" r="1.3"/></g></svg>';
  }

  // Start: the stage size first (it sets the yard's width), then the build (saved or new).
  resize();
  S = fresh ? null : loadBuild(saved.build);
  if (S) {
    if (S.ww !== WW) { rescale(S, WW / S.ww); S.ww = WW; }
    keepInYard(S);
    if (!S.balls[S.step === "roll1" ? 1 : S.step === "roll2" ? 2 : 0]) spawn(S.step === "roll1" ? 1 : 2);
    redrawTrack();
  } else {
    track = [];
    S = newBuild();
    S.balls[0] = newBall(0, WW * 0.35, HY + (HW - HY) * 0.62);
    redrawTrack();
  }
  updateTiles();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "christmas",
    badge: $("tbadge"),
    restLine: "The snowman is resting.",
    restLine2: "Snow keeps falling in the yard.",
    restArt,
    onEnding,
    onWake: () => { ending = false; }
  });
  requestAnimationFrame(frame);
  void bar;

  // Test hooks, only with ?debug in the address. next() never adds a face piece.
  if (/[?&]debug\b/.test(location.search)) {
    const finish = () => {
      const i = activeIndex(), b = i >= 0 ? S.balls[i] : null;
      if (!b || b.done || !rolling() || busy) return false;
      let dir = openDir(b), n = 0;
      while (!b.done && n++ < 3000) {
        const d = moveBall(i, dir.x * 6, dir.y * 6 / DEPTH);
        const a = d < 2 ? 1.4 : 0.03, c = Math.cos(a), s = Math.sin(a);
        dir = { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
      }
      return b.done;
    };
    window.__toybox = {
      state: () => {
        const w = want(), pieces = {};
        KINDS.forEach((k) => { pieces[k.id] = { opt: k.opts[S.D[k.id].opt].id, on: S.D[k.id].on.filter(Boolean).length }; });
        return { step: S.step, r: S.balls.map((b) => (b ? +b.r.toFixed(1) : 0)), done: S.balls.map((b) => !!(b && b.done)),
          stacked: S.balls.map((b) => !!(b && b.stacked)), pieces, panel: optK || "pieces", busy, wanted: w && w.part,
          coach: coach.text(), track: track.length, allOn: allOn(), bird: !!bird, rabbit: !!rabbit, carrying: !!(drag && drag.k === "piece") };
      },
      // One step: rolls, stacks, or puts on the next piece that is not part of the face (never eyes, nose or smile).
      next: () => {
        if (busy) return "wait";
        if (rolling()) { doTapPart("ball"); return "roll"; }
        if (stacking()) { stackTap(activeIndex()); return "stack"; }
        const k = ["hat", "scarf", "arms", "buttons", "mittens"].find((id) => !anyOn(id));
        if (k) { putPiece(k, S.D[k].opt, null); return k; }
        return "done";
      },
      finish,
      stack: () => stackTap(activeIndex()),
      // put(kind, choice): as his tap on that choice (one eye or one smile stone at a time).
      put: (k, opt) => putPiece(k, opt == null ? S.D[k].opt : opt, null),
      // off(kind, bit): as his drag of that piece into the box.
      off: (k, j) => { if (S.step === "dress" && isOn(k, j || 0)) takeOff(k, KIND[k].slots ? (j || 0) : -1, 0, 0); return S.D[k].on.filter(Boolean).length; },
      choices: (k) => (k ? openOpts(k) : closeOpts()),
      newYard: () => newYard(),
      surprise: () => surprise(),
      hit: (x, y) => hitPart(x, y),
      pt: (part) => {
        const i = activeIndex();
        if (part === "ball" && i >= 0 && S.balls[i]) { const c = ballC(S, i); return vp(c.x, c.y); }
        if (part === "target" && i > 0) { const T = stackAt(S, i); return vp(T.x, T.y); }
        if (part === "box") { const b = boxGeo(); return vp(b.x, b.gy - b.h / 2); }
        if (S.step === "dress" && part && part.startsWith("pc:")) { const [, k, j] = part.split(":"); const sp = pieceSpot(geom(S), k, +j || 0); return vp(sp.x, sp.y); }
        if (part === "head" && S.step === "dress") { const g = geom(S); return vp(g.hx, g.hy); }
        if (part === "middle" && S.step === "dress") { const g = geom(S); return vp(g.mx, g.my); }
        if (part && part.startsWith("tile:")) {
          const id = part.slice(5), b = tiles.button(id) && !mainEl.hidden ? tiles.button(id) : otiles.button(id);
          if (b) { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
        }
        return null;
      },
      ghost: () => ghost.show()
    };
    const doTapPart = (part) => { const p = window.__toybox.pt(part); if (p) doTap(part, p.x, p.y); };
  }
})();
