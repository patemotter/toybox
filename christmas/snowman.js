(function () {
  "use strict";
  // Christmas · Snowman: a snowy front yard (the edge of the house with its lights, a wooden fence, pine trees,
  // gentle snow falling) where he makes a snowman the real way, one hands-on step at a time.
  //   1. Roll the snowball: he drags the small snowball across the yard. It turns as it rolls, grows as it picks
  //      up snow, and leaves a rolled track where the grass shows through. A tap on the snowball rolls it a short
  //      way by itself; a tap on the snow rolls it toward that spot. Big enough, it settles with a sparkle (the
  //      big one first rolls itself to a spot where the whole snowman will fit) and the next small one appears.
  //   2. Roll the middle snowball the same way, then lift it onto the big one (drag it there, or tap it and it
  //      lifts and stacks itself).
  //   3. Roll the small snowball for the head and lift it on top.
  //   4. Dress the snowman from the panel tiles: coal eyes, carrot nose, a smile of coal stones, buttons, stick
  //      arms, mittens on the stick ends, a scarf (Scarf again: the next color) and a hat (Hat again: top hat or
  //      woolly hat). He drags a piece onto the snowman (it snaps to its place) or taps its tile.
  // FACE RULE (the dad: faces popping up on objects once scared him): the snowman has no face until he puts each
  // face piece on himself. Every eye, the nose and every smile stone goes on by his own tap or drag only, one at a
  // time. Nothing else ever adds a face piece (not New, Surprise, the ghost hand, a celebration or the debug
  // "next"), the snowballs carry no face while rolling, and the face never moves by itself (no blinking, no
  // expressions). Buttons, arms and mittens go on together with one tap.
  // A yellow ring and one instruction show the next thing to do; everything drawn answers a touch (a wiggle, its
  // name, snow falling off a tree). Surprise takes turns between live moments that never touch his snowman: a
  // robin lands on the hat (or a stick arm, or the head) and hops, a puff of wind flutters the scarf and swirls the
  // snow, the snow falls thicker for a moment, a rabbit hops across the yard. New: the old snowman fades, the snow
  // fills the tracks back in and a fresh small snowball sits in the yard. A fresh launch starts a new yard; a
  // reload keeps the snowman as he left it.
  // Units: the scene is drawn in world units (HW tall, WW wide, WW following the stage's shape) and scaled to fit
  // the stage; x to the right, y down. A snowball's (x, gy) is where it touches the snow.
  //
  // Sections:
  //   Setup and saved state
  //   Pieces and sizes
  //   Layout
  //   Tweens and particles
  //   The build
  //   Rolling
  //   Stacking
  //   Dressing
  //   Drawing helpers
  //   Drawing the yard
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

  const KEY = "christmas-snowman-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  // A launch from the home screen starts a new yard; a reload keeps the snowman.
  const fresh = Toybox.fresh();

  // =====================================================================================================
  // Pieces and sizes
  // =====================================================================================================
  const SCARVES = [
    { id: "red", hex: "#E8303F", dark: "#B81F2E", stripe: "#FFFFFF" },
    { id: "green", hex: "#3FA34D", dark: "#2A7A36", stripe: "#FFE36B" },
    { id: "blue", hex: "#2F8CFF", dark: "#1F64C0", stripe: "#FFFFFF" },
    { id: "yellow", hex: "#FFC93C", dark: "#D9A21B", stripe: "#E8303F" }
  ];
  const HATS = [{ id: "top", name: "Top hat" }, { id: "knit", name: "Woolly hat" }];
  // The tiles, in panel order. face: one piece per tap or drag, never added any other way.
  const KINDS = [
    { id: "eyes", name: "Eyes", max: 2, face: true, tag: "Coal eye", full: "Coal eyes" },
    { id: "nose", name: "Nose", max: 1, face: true, tag: "Carrot nose", full: "Carrot nose" },
    { id: "smile", name: "Smile", max: 5, face: true, tag: "Coal smile", full: "Coal smile" },
    { id: "buttons", name: "Buttons", max: 3, tag: "Button", full: "Buttons" },
    { id: "arms", name: "Arms", max: 2, tag: "Stick arm", full: "Stick arms" },
    { id: "mittens", name: "Mittens", max: 2, tag: "Mitten", full: "Mittens" },
    { id: "scarf", name: "Scarf", max: 1, tag: "Scarf" },
    { id: "hat", name: "Hat", max: 1, tag: "Hat" }
  ];
  const KIND = {};
  KINDS.forEach((k) => { KIND[k.id] = k; });
  // The three snowballs: start radius, finished radius, and how far each rolls to get there (a few seconds).
  const R0 = [18, 16, 14], RT = [84, 62, 46], DIST = [900, 720, 540];
  const BALL_NAMES = ["Big snowball", "Middle snowball", "Small snowball"];
  const SIT = 0.94, STACK_K = 0.8;
  // Lowest a finished big snowball may sit (its touch point) so the whole snowman, hat and a perching robin fit.
  const G_MIN = Math.ceil(RT[0] * SIT + (RT[0] + RT[1]) * STACK_K + (RT[1] + RT[2]) * STACK_K + RT[2] * 2.25 + 30);
  // How far the stick arms and mittens reach out from the middle (a finished snowman stays this far from the sides).
  const ARM_X = 154;

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
  const STEPS = ["roll0", "roll1", "stack1", "roll2", "stack2", "dress"];
  const ACTIVE = { roll0: 0, roll1: 1, stack1: 1, roll2: 2, stack2: 2, dress: -1 };
  const activeIndex = () => ACTIVE[S.step];
  const rolling = () => S.step.startsWith("roll");
  const stacking = () => S.step.startsWith("stack");
  function newDress() { return { eyes: 0, nose: 0, smile: 0, buttons: 0, arms: 0, mittens: 0, scarf: -1, hat: -1 }; }
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
  let pwob = {}, flights = [];
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
      case "scarf": return { x: g.mx, y: g.neck + 4, r: g.hr * 0.8 };
      case "hat": return { x: g.hx, y: g.hy - g.hr * 1.2, r: g.hr * 0.9 };
    }
    return { x: g.hx, y: g.hy, r: 10 };
  }
  const count = (k) => (k === "scarf" || k === "hat" ? (S.D[k] >= 0 ? 1 : 0) : S.D[k]);
  const isFull = (k) => k !== "scarf" && k !== "hat" && S.D[k] >= KIND[k].max;
  const allOn = () => KINDS.every((k) => count(k.id) >= k.max);

  // Saving: the build in progress (fresh on a launch from the home screen; a reload keeps it).
  let track = [];
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (!S) return;
    try {
      const pk = [];
      track.slice(-2400).forEach((p) => { if (p) pk.push(Math.round(p.x), Math.round(p.y), Math.round(p.w)); else pk.push(-1, -1, -1); });
      localStorage.setItem(KEY, JSON.stringify({ v: 1, build: {
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
        const v = sb.D[k.id];
        if (k.id === "scarf") B.D.scarf = Number.isInteger(v) && v >= 0 && v < SCARVES.length ? v : -1;
        else if (k.id === "hat") B.D.hat = Number.isInteger(v) && v >= 0 && v < HATS.length ? v : -1;
        else B.D[k.id] = Number.isInteger(v) ? clamp(v, 0, k.max) : 0;
      });
      if (B.D.arms < 2) B.D.mittens = 0;
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
    if (b0 && b0.done) { b0.x = clamp(b0.x, Y.bx0, Y.bx1); b0.gy = clamp(b0.gy, G_MIN, Y.gy1); }
    [1, 2].forEach((i) => {
      const b = B.balls[i];
      if (!b || b.stacked || !b0) return;
      if (Math.hypot((b.x - b0.x) / (b.r + b0.r), (b.gy - b0.gy) / ((b.r + b0.r) * 0.5)) < 1) { const p = openSpot(B); b.x = p.x; b.gy = p.y; }
    });
  }
  // A clear spot in the yard for a new snowball: well away from the others, toward the front.
  function openSpot(B) {
    let best = { x: WW * 0.35, y: HY + (HW - HY) * 0.62 }, bs = -Infinity;
    for (let x = Y.x0 + 50; x <= Y.x1 - 50; x += 26) {
      for (let y = Y.gy0 + 40; y <= Y.gy1 - 10; y += 22) {
        let d = 3;
        B.balls.forEach((o) => {
          if (!o || o.stacked) return;
          const R = o.r + 46;
          d = Math.min(d, Math.hypot((x - o.x) / R, (y - o.gy) / (R * 0.5)));
        });
        const sc = Math.min(d, 2.2) + (y - Y.gy0) / 500 - Math.abs(x - WW / 2) / 3000;
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
  // Each snowball keeps its own turn (a rotation matrix), so the specks of packed snow and bits of grass on it
  // roll round as it goes. Rows are kept orthonormal.
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
    S.balls.forEach((o, j) => {
      if (j === i || !o || o.stacked || o.lift) return;
      const R = b.r + o.r, ex = (nx - o.x) / R, ey = (ny - o.gy) / (R * 0.5), e = Math.hypot(ex, ey);
      if (e >= 1) return;
      const ux = e > 1e-4 ? ex / e : (nx >= o.x ? 1 : -1), uy = e > 1e-4 ? ey / e : 0;
      nx = clamp(o.x + ux * R, Y.x0 + m, Y.x1 - m); ny = clamp(o.gy + uy * R * 0.5, Y.gy0, Y.gy1);
    });
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
  // The rolled track: grass showing through, a packed rim of snow round it. Painted once into its own layer.
  const K = 0.42;   // the snow is seen at a slant: a round patch on it looks this flat
  const tcv = document.createElement("canvas"), tctx = tcv.getContext("2d");
  let oldTrack = null;
  function trackAdd(b) {
    const last = track.length ? track[track.length - 1] : null;
    if (last && Math.hypot(last.x - b.x, last.y - b.gy) < 3) return;
    const p = { x: b.x, y: b.gy, w: b.r * 1.2 };
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
    line(b.w, "#A3C77A");
    const n = hash(Math.round(b.x), Math.round(b.y));
    if (n < 0.55) {
      const ox = (hash(Math.round(b.y), Math.round(b.x)) - 0.5) * b.w * 0.6, oy = (n - 0.27) * b.w;
      c.beginPath(); c.moveTo(b.x + ox, b.y / K + oy); c.lineTo(b.x + ox + 2.5, b.y / K + oy - 7);
      c.lineWidth = 2.2; c.strokeStyle = n < 0.2 ? "#B79B6A" : "#6F9F45"; c.stroke();
    }
    // The rim goes under what is already there, so it never covers grass rolled earlier.
    c.globalCompositeOperation = "destination-over";
    line(b.w + 9, "#CFDDF0");
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
    const clear = (x, y) => x > Y.x0 + b.r && x < Y.x1 - b.r && y > Y.gy0 + 10 && y < Y.gy1 - 10 &&
      S.balls.every((o) => !o || o === b || o.stacked || Math.hypot((x - o.x) / (o.r + b.r), (y - o.gy) / ((o.r + b.r) * 0.5)) > 1.1);
    if (clear(ax, ay)) return { x: h.x, y: h.y };
    let dx = (Y.x0 + Y.x1) / 2 - b.x, dy = ((Y.gy0 + Y.gy1) / 2 - b.gy) * DEPTH;
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
    if (i === 0) { tx = clamp(b.x, Y.bx0, Y.bx1); ty = clamp(b.gy, G_MIN, Y.gy1); }
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
    const b = S.balls[i], o = S.balls[0];
    let gx = clamp(b.lx, Y.x0 + b.r * 0.9, Y.x1 - b.r * 0.9), gy = clamp(b.ly + b.r * SIT, Y.gy0, Y.gy1);
    const R = b.r + o.r, ex = (gx - o.x) / R, ey = (gy - o.gy) / (R * 0.5), e = Math.hypot(ex, ey);
    if (e < 1) {
      const ux = e > 1e-4 ? ex / e : 1, uy = e > 1e-4 ? ey / e : 0;
      gx = clamp(o.x + ux * R, Y.x0 + b.r, Y.x1 - b.r); gy = clamp(o.gy + uy * R * 0.5, Y.gy0, Y.gy1);
      if (Math.hypot((gx - o.x) / R, (gy - o.gy) / (R * 0.5)) < 0.98) { const p = openSpot(S); gx = p.x; gy = p.y; }
    }
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
  // Dressing
  // =====================================================================================================
  // Puts one piece on (eyes, nose and smile one at a time; buttons, arms and mittens all together). The scarf
  // and hat change on a second tap. from: where the piece flies in from (his finger, or the tile).
  function putPiece(k, from, btn) {
    if (locked() || !KIND[k]) return false;
    const b = btn || tiles.button(k);
    if (S.step !== "dress") {
      if (b) Toybox.wiggle(b);
      coach.say("Build the snowman first. Then dress him.", 3);
      ghost.poke();
      return false;
    }
    const D = S.D, g = geom(S), K = KIND[k];
    if (k === "mittens" && D.arms < 2) {
      if (b) Toybox.wiggle(b);
      Toybox.wiggle(tiles.button("arms"));
      coach.say("Put the stick arms on first.", 3);
      return false;
    }
    ghost.learned("dress");
    if (k === "scarf") {
      if (D.scarf < 0) { D.scarf = 0; fly("scarf", 0, from); }
      else {
        D.scarf = (D.scarf + 1) % SCARVES.length;
        pwob.scarf = 1;
        const sp = pieceSpot(g, "scarf", 0);
        puff("spark", sp.x, sp.y, 6, SCARVES[D.scarf].hex);
      }
    } else if (k === "hat") {
      const first = D.hat < 0;
      D.hat = first ? 0 : (D.hat + 1) % HATS.length;
      // A different hat drops on from above.
      fly("hat", 0, first ? from : { x: g.hx, y: g.hy - g.hr * 3.4 });
      const sp = pieceSpot(g, "hat", 0);
      later(0.5, () => tag(HATS[D.hat].name, sp.x, sp.y - g.hr * 1.1));
    } else {
      if (D[k] >= K.max) {
        if (b) Toybox.wiggle(b);
        const sp = pieceSpot(g, k, K.max - 1);
        tag(K.full, sp.x, sp.y - sp.r - 6);
        return false;
      }
      if (K.face) { fly(k, D[k], from); D[k] += 1; }
      else { const n0 = D[k]; for (let j = n0; j < K.max; j++) fly(k, j, from, (j - n0) * 0.14); D[k] = K.max; }
    }
    updateTiles();
    saveSoon();
    checkDone();
    return true;
  }
  function fly(k, j, from, delay) {
    const sp = pieceSpot(geom(S), k, j), f = from || { x: sp.x, y: sp.y - 150 };
    flights = flights.filter((q) => !(q.k === k && q.j === j));
    flights.push({ k, j, fx: f.x, fy: f.y, t0: now() + (delay || 0), dur: 0.5, arc: Math.hypot(f.x - sp.x, f.y - sp.y) > 80 ? 1 : 0.3 });
  }
  function landFlights(t) {
    if (!flights.length || S.step !== "dress") { flights = []; return; }
    flights = flights.filter((f) => {
      if (t < f.t0 + f.dur) return true;
      const sp = pieceSpot(geom(S), f.k, f.j), face = KIND[f.k].face;
      puff("spark", sp.x, sp.y, face ? 3 : 6);
      if (!face) pwob[f.k] = 0.7;
      return false;
    });
  }
  // A real completion: some pieces on (and again when he has put everything on).
  function checkDone() {
    const kinds = KINDS.filter((k) => count(k.id) > 0).length;
    if (!S.k1 && kinds >= 3) { S.k1 = true; later(1.2, () => Toybox.kind()); }
    if (!S.all && allOn()) {
      S.all = true;
      later(0.8, () => {
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
  // Drawing the snowballs and the snowman
  // =====================================================================================================
  // Bits on a snowball's surface (packed-snow shading, little bumps, bits of grass), spread evenly round it.
  const SPECKS = Array.from({ length: 34 }, (_, i) => {
    const y = 1 - (i + 0.5) / 34 * 2, rad = Math.sqrt(1 - y * y), th = i * 2.39996;
    return { p: [Math.cos(th) * rad, y, Math.sin(th) * rad], k: i % 7 === 3 ? 2 : (i % 3 === 0 ? 1 : 0), s: 0.6 + hash(i, 1) * 0.8, a: hash(i, 2) * TAU };
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
      if (sp.k === 0) { ell(sx, sy, r * 0.05 * sp.s + 0.6, (r * 0.05 * sp.s + 0.6) * (0.5 + 0.5 * v)); ctx.fillStyle = "#B3C7E3"; ctx.fill(); }
      else if (sp.k === 1) { ell(sx, sy, r * 0.1 * sp.s + 0.8, (r * 0.08 * sp.s + 0.6) * (0.5 + 0.5 * v)); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = "#C3D3EA"; ctx.stroke(); }
      else { const l = r * 0.07 + 1.5; ctx.beginPath(); ctx.moveTo(sx - Math.cos(sp.a) * l, sy - Math.sin(sp.a) * l); ctx.lineTo(sx + Math.cos(sp.a) * l, sy + Math.sin(sp.a) * l); ctx.lineWidth = 1.8; ctx.strokeStyle = "#7FA650"; ctx.stroke(); }
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
  // Draws piece (k, j) at its place, or on its way there while it flies on.
  function withFlight(B, k, j, sp, t, fn) {
    const f = B === S ? flights.find((q) => q.k === k && q.j === j) : null;
    if (!f) { fn(); return; }
    const p = (t - f.t0) / f.dur;
    if (p < 0) return;
    const e = ease(Math.min(1, p)), dx = (f.fx - sp.x) * (1 - e), dy = (f.fy - sp.y) * (1 - e) - Math.sin(Math.min(1, p) * Math.PI) * 50 * f.arc;
    ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore();
  }
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
    const wob = (k) => (live ? (pwob[k] || 0) : 0);
    const arms = [];
    if (g) for (let j = 0; j < D.arms; j++) arms.push(armAt(g, j, Math.sin(t * 16) * wob("arms") * 0.18 + (live ? windNow(t) * Math.sin(t * 7 + j) * 0.04 : 0)));
    if (g) arms.forEach((am, j) => withFlight(B, "arms", j, pieceSpot(g, "arms", j), t, () => drawStick(am, j < D.mittens)));
    if (st1) { const c = stackAt(B, 1); drawBallBody(c.x, c.y, B.balls[1].r, B.balls[1].M); }
    if (g) for (let j = 0; j < D.buttons; j++) { const sp = pieceSpot(g, "buttons", j); withFlight(B, "buttons", j, sp, t, () => drawButton(sp.x, sp.y, sp.r * (1 + Math.sin(t * 18) * wob("buttons") * 0.25))); }
    if (st2) { const c = stackAt(B, 2); drawBallBody(c.x, c.y, B.balls[2].r, B.balls[2].M); }
    if (g) {
      if (D.scarf >= 0) withFlight(B, "scarf", 0, pieceSpot(g, "scarf", 0), t, () => drawScarf(g, D.scarf, t, live ? Math.max(wob("scarf"), windNow(t)) : 0));
      arms.forEach((am, j) => { if (j < D.mittens) withFlight(B, "mittens", j, pieceSpot(g, "mittens", j), t, () => drawMitten(am, D.scarf, wob("mittens"), t)); });
      // The face: only the pieces he put on, each where he put it; it never moves by itself.
      for (let j = 0; j < D.eyes; j++) { const sp = pieceSpot(g, "eyes", j); withFlight(B, "eyes", j, sp, t, () => drawCoal(sp.x, sp.y, sp.r, j * 2 + 1)); }
      if (D.nose) { const sp = pieceSpot(g, "nose", 0); withFlight(B, "nose", 0, sp, t, () => drawCarrot(sp.x, sp.y, g.hr * 0.82, g.hr * 0.27, 0.2)); }
      for (let j = 0; j < D.smile; j++) { const sp = pieceSpot(g, "smile", j); withFlight(B, "smile", j, sp, t, () => drawCoal(sp.x, sp.y, sp.r, j + 7)); }
      if (D.hat >= 0) {
        const hop = Math.abs(Math.sin(t * 9)) * wob("hat") * 12;
        withFlight(B, "hat", 0, pieceSpot(g, "hat", 0), t, () => (D.hat === 0 ? drawTopHat(g, hop) : drawKnitHat(g, D.scarf, hop)));
      }
    }
    ctx.restore();
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
  function drawButton(x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); fillStroke("#E8303F", 1.8);
    ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = "#B81F2E"; ctx.stroke();
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
  function drawMitten(am, scarf, w, t) {
    const sc = SCARVES[scarf >= 0 ? scarf : 0];
    ctx.save(); ctx.translate(am.ex, am.ey); ctx.rotate(am.a + Math.sin(t * 16) * w * 0.15);
    if (am.s < 0) ctx.scale(1, -1);
    ell(8, -9, 4.5, 6.5, -0.5); fillStroke(sc.hex, 1.8);
    ell(13, 0, 11, 9.5); fillStroke(sc.hex, 1.8);
    rr(-6, -8.5, 9, 17, 3); fillStroke("#FFFFFF", 1.8);
    ctx.restore();
  }
  function drawScarf(g, col, t, flutter) {
    const sc = SCARVES[col], x = g.mx, y = g.neck, nw = g.hr * 1.0, bh = g.hr * 0.38;
    // The tail hangs down the front from the knot; it flutters in the wind.
    const ax = x + nw * 0.42, ay = y + bh * 0.3, len = g.mr * 0.95, tw = g.hr * 0.42;
    const ang = 0.12 + flutter * Math.sin(t * 10) * 0.3 - flutter * 0.25;
    const bx = ax + Math.sin(-ang) * len * -1, by = ay + Math.cos(ang) * len;
    const sway = flutter * Math.sin(t * 12 + 1) * 6;
    ctx.beginPath(); ctx.moveTo(ax - tw / 2, ay);
    ctx.lineTo(ax + tw / 2, ay); ctx.quadraticCurveTo((ax + bx) / 2 + tw / 2 + sway, (ay + by) / 2, bx + tw / 2, by);
    ctx.lineTo(bx - tw / 2, by); ctx.quadraticCurveTo((ax + bx) / 2 - tw / 2 + sway, (ay + by) / 2, ax - tw / 2, ay); ctx.closePath();
    ctx.save(); fillStroke(sc.hex, 2); ctx.clip();
    ctx.fillStyle = sc.stripe;
    [0.45, 0.7].forEach((f) => { const sx = lerp(ax, bx, f) + sway * Math.sin(f * Math.PI), sy = lerp(ay, by, f); ctx.fillRect(sx - tw, sy - 3.5, tw * 2, 7); });
    ctx.restore();
    ctx.strokeStyle = sc.dark; ctx.lineWidth = 2; ctx.lineCap = "round";
    for (let k = 0; k < 4; k++) { const fx = bx - tw / 2 + tw * (k + 0.5) / 4; ctx.beginPath(); ctx.moveTo(fx, by + 1); ctx.lineTo(fx + sway * 0.3, by + 7); ctx.stroke(); }
    ctx.lineCap = "butt";
    // The band round the neck.
    ctx.beginPath(); ctx.moveTo(x - nw, y - bh * 0.5);
    ctx.quadraticCurveTo(x, y - bh * 0.5 + bh * 0.6, x + nw, y - bh * 0.5);
    ctx.lineTo(x + nw * 0.96, y + bh * 0.5);
    ctx.quadraticCurveTo(x, y + bh * 0.5 + bh * 0.75, x - nw * 0.96, y + bh * 0.5); ctx.closePath();
    ctx.save(); fillStroke(sc.hex, 2); ctx.clip();
    ctx.fillStyle = sc.stripe;
    [-0.55, 0, 0.55].forEach((f) => ctx.fillRect(x + f * nw - 3.5, y - bh, 7, bh * 2.2));
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - nw, y - bh * 0.5); ctx.quadraticCurveTo(x, y - bh * 0.5 + bh * 0.6, x + nw, y - bh * 0.5);
    ctx.lineTo(x + nw * 0.96, y + bh * 0.5); ctx.quadraticCurveTo(x, y + bh * 0.5 + bh * 0.75, x - nw * 0.96, y + bh * 0.5); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ell(ax, ay + 1, tw * 0.6, bh * 0.5); fillStroke(sc.dark, 2);
  }
  function hatTop(g, D) { return D.hat === 0 ? g.hy - g.hr * 2.08 : g.hy - g.hr * 1.56; }
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
  function drawKnitHat(g, scarf, hop) {
    const r = g.hr, x = g.hx, y = g.hy - hop, sc = SCARVES[scarf >= 0 ? scarf : 0];
    ctx.beginPath(); ctx.moveTo(x - r * 0.97, y - r * 0.4);
    ctx.bezierCurveTo(x - r * 0.95, y - r * 1.48, x + r * 0.95, y - r * 1.48, x + r * 0.97, y - r * 0.4); ctx.closePath();
    ctx.save(); fillStroke(sc.hex); ctx.clip();
    ctx.fillStyle = sc.stripe; ctx.fillRect(x - r, y - r * 0.92, r * 2, r * 0.14);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(x - r * 0.97, y - r * 0.4); ctx.bezierCurveTo(x - r * 0.95, y - r * 1.48, x + r * 0.95, y - r * 1.48, x + r * 0.97, y - r * 0.4);
    ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    rr(x - r * 1.03, y - r * 0.58, r * 2.06, r * 0.3, r * 0.13); fillStroke(sc.dark);
    ctx.strokeStyle = "rgba(29, 35, 64, 0.35)"; ctx.lineWidth = 1.2;
    for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.22, y - r * 0.54); ctx.lineTo(x + k * r * 0.22, y - r * 0.32); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y - r * 1.3, r * 0.26, 0, TAU); fillStroke("#FFFFFF");
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
      if (S.D.hat >= 0) return { x: g.hx + g.hr * 0.1, y: hatTop(g, S.D), hop: 9 };
      if (S.D.arms >= 2) { const a = armAt(g, 1); return { x: lerp(a.sx, a.ex, 0.72), y: lerp(a.sy, a.ey, 0.72) - 3, hop: 0 }; }
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
        const k = ["hat", "scarf", "arms", "buttons"].find((id) => count(id) === 0);
        const btn = k && tiles.button(k);
        if (!btn) return null;
        const r = btn.getBoundingClientRect(), sp = pieceSpot(geom(S), k, 0);
        return { pts: [[r.left + r.width / 2, r.top + r.height / 2], P(sp.x, sp.y)], dur: 1800, carry: { html: PIC[k](), size: 56 }, key: "dress" };
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
        const n = count(k.id);
        for (let j = 0; j < n; j++) {
          const sp = pieceSpot(g, k.id, j), d = Math.hypot(w.x - sp.x, w.y - sp.y);
          if (d <= sp.r + 10 && d < bd) { bd = d; best = "pc:" + k.id + ":" + j; }
        }
      });
      if (best) return best;
    }
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
      tag(k === "hat" ? HATS[S.D.hat].name : KIND[k].tag, sp.x, sp.y - sp.r - 4);
      if (!KIND[k].face) pwob[k] = 1;
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
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (d.k === "hold") { if (still && !locked() && !s.cancel) doTap(d.part, s.x, s.y); }
      else if (d.k === "roll") { if (still && !locked() && !s.cancel) doTap("ball", s.x, s.y); }
      else if (d.k === "lift") liftUp(d, still && !s.cancel);
    },
    tap: (part, x, y) => { if (!drag) doTap(part, x, y); }
  });

  // =====================================================================================================
  // Dragging pieces from the panel
  // =====================================================================================================
  // A piece can be carried from its tile onto the snowman: it follows his finger and goes on where it belongs
  // when he lets go over the snowman. Let go anywhere else, it floats back to its tile. A tap on a tile (the
  // tile's own click) puts the piece on.
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
    return w.x > b0.x - b0.r - 70 && w.x < b0.x + b0.r + 70 && w.y > hatTop(g, { hat: 0 }) - 40 && w.y < b0.gy + 20;
  }
  tilesEl.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest ? e.target.closest(".tb-tile") : null;
    if (!btn || pdrag || locked()) return;
    const k = KINDS.find((q) => tiles.button(q.id) === btn);
    if (k) pdrag = { k: k.id, pid: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, btn };
  });
  document.addEventListener("pointermove", (e) => {
    if (!pdrag || e.pointerId !== pdrag.pid) return;
    if (!pdrag.on) {
      if (Math.hypot(e.clientX - pdrag.x0, e.clientY - pdrag.y0) < 14) return;
      if (S.step !== "dress" || locked()) { pdrag.on = "no"; putPiece(pdrag.k, null, pdrag.btn); return; }
      pdrag.on = true;
      carryEl.classList.remove("back");
      carryEl.innerHTML = PIC[pdrag.k]();
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
    if (!cancel && !locked() && onSnowman(w) && putPiece(d.k, w, d.btn)) { carryEl.hidden = true; return; }
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
  function nextSpot(k) {
    const g = geom(S);
    if (k === "scarf" || k === "hat") return pieceSpot(g, k, 0);
    if (k === "mittens" && S.D.arms < 2) return null;
    if (isFull(k)) return null;
    return pieceSpot(g, k, S.D[k]);
  }
  function drawCarryTarget(t) {
    if (!pdrag || pdrag.on !== true || S.step !== "dress" || pdrag.cx == null) return;
    const w = wpt(pdrag.cx, pdrag.cy - carrySize() * 0.45);
    if (!onSnowman(w)) return;
    const sp = nextSpot(pdrag.k);
    if (!sp) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.beginPath(); ctx.arc(sp.x, sp.y, Math.max(10, sp.r * 1.2) + pulse * 3, 0, TAU);
    ctx.fillStyle = "rgba(255, 201, 60, 0.3)"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#FFC93C"; ctx.stroke();
  }

  // =====================================================================================================
  // Panel, New and Surprise
  // =====================================================================================================
  const S2 = 'stroke="#1D2340" stroke-width="2" stroke-linejoin="round"';
  const mittenPic = (x, y, rot, col, flip) =>
    `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip ? -1 : 1} 1)"><ellipse cx="-7" cy="-2" rx="3.6" ry="5.5" transform="rotate(-25 -7 -2)" fill="${col}" ${S2}/>` +
    `<path d="M-6 7v-10a6 6 0 0 1 12 0v10z" fill="${col}" ${S2}/><rect x="-7" y="6" width="14" height="6" rx="2" fill="#FFFFFF" ${S2}/></g>`;
  const curScarf = () => SCARVES[S && S.D.scarf >= 0 ? S.D.scarf : 0];
  const nextScarf = () => SCARVES[S && S.D.scarf >= 0 ? (S.D.scarf + 1) % SCARVES.length : 0];
  const PIC = {
    eyes: () => `<svg viewBox="0 0 50 50"><g fill="#2B2F3A" ${S2}><path d="M7 22l5-6h7l4 6-3 7h-8z"/><path d="M27 21l6-5 7 2 2 7-5 5-8-2z"/></g><g fill="#596075"><ellipse cx="12.5" cy="20" rx="2.6" ry="1.4"/><ellipse cx="32.5" cy="19.5" rx="2.6" ry="1.4"/></g></svg>`,
    nose: () => `<svg viewBox="0 0 50 50"><path d="M7 20c3-3 7-4 10-3l26 7c2 1 2 3 0 3L17 34c-3 1-7 0-10-3-3-3-3-8 0-11z" fill="#FF8A1F" ${S2}/><path d="M18 21v3M25 23v3M32 25v2" stroke="#C9631A" stroke-width="2" stroke-linecap="round"/></svg>`,
    smile: () => `<svg viewBox="0 0 50 50"><g fill="#2B2F3A" ${S2}><circle cx="8" cy="19" r="4"/><circle cx="15" cy="28" r="4"/><circle cx="25" cy="32" r="4"/><circle cx="35" cy="28" r="4"/><circle cx="42" cy="19" r="4"/></g></svg>`,
    buttons: () => `<svg viewBox="0 0 50 50"><g fill="#E8303F" ${S2}><circle cx="25" cy="10" r="6.5"/><circle cx="25" cy="25" r="6.5"/><circle cx="25" cy="40" r="6.5"/></g><g fill="#1D2340"><circle cx="23" cy="10" r="1.3"/><circle cx="27" cy="10" r="1.3"/><circle cx="23" cy="25" r="1.3"/><circle cx="27" cy="25" r="1.3"/><circle cx="23" cy="40" r="1.3"/><circle cx="27" cy="40" r="1.3"/></g></svg>`,
    arms: () => {
      const d = "M21 34L6 15M11 21l-1-9M6 15l-4 0M29 34l15-19M39 21l1-9M44 15l4 0";
      return `<svg viewBox="0 0 50 50"><path d="${d}" fill="none" stroke="#1D2340" stroke-width="6.5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8A5A36" stroke-width="3.2" stroke-linecap="round"/></svg>`;
    },
    mittens: () => `<svg viewBox="0 0 50 50">${mittenPic(15, 24, -12, curScarf().hex, false)}${mittenPic(35, 24, 12, curScarf().hex, true)}</svg>`,
    scarf: () => {
      const s = nextScarf();
      return `<svg viewBox="0 0 50 50"><path d="M29 22h9l2 20-10 1z" fill="${s.hex}" ${S2}/><path d="M31 30h8M31.5 36h8" stroke="${s.stripe}" stroke-width="3"/>` +
        `<path d="M7 13c12 5 24 5 36 0l1 10c-13 5-25 5-38 0z" fill="${s.hex}" ${S2}/><path d="M16 16v9M25 17v9M34 16v9" stroke="${s.stripe}" stroke-width="3"/>` +
        `<path d="M7 13c12 5 24 5 36 0l1 10c-13 5-25 5-38 0z" fill="none" ${S2}/><path d="M32 44v3M35 44v3M38 43v3" stroke="${s.dark}" stroke-width="2" stroke-linecap="round"/></svg>`;
    },
    hat: () => {
      const next = S && S.D.hat >= 0 ? (S.D.hat + 1) % HATS.length : 0;
      if (next === 0) {
        return `<svg viewBox="0 0 50 50"><ellipse cx="25" cy="39" rx="21" ry="5" fill="#2B2F3A" ${S2}/><path d="M13 39V11h24v28c-8 2-16 2-24 0z" fill="#2B2F3A" ${S2}/>` +
          `<path d="M13 29h24v6H13z" fill="#E8303F" ${S2}/><ellipse cx="25" cy="11" rx="12" ry="3" fill="#3A4050" ${S2}/></svg>`;
      }
      const s = curScarf();
      return `<svg viewBox="0 0 50 50"><path d="M9 35C9 10 41 10 41 35z" fill="${s.hex}" ${S2}/><path d="M11 24h28" stroke="${s.stripe}" stroke-width="3"/>` +
        `<rect x="7" y="32" width="36" height="9" rx="4" fill="${s.dark}" ${S2}/><circle cx="25" cy="10" r="6" fill="#FFFFFF" ${S2}/></svg>`;
    }
  };
  const tiles = Toybox.tiles(tilesEl, {
    items: KINDS.map((k) => ({ id: k.id, name: k.name, pic: PIC[k.id]() })),
    kind: "action", rows: 2,
    onPick: (id) => {
      if (performance.now() < skipClickUntil) return;
      const btn = tiles.button(id), r = btn ? btn.getBoundingClientRect() : null;
      putPiece(id, r ? wpt(r.left + r.width / 2, r.top + r.height / 2) : null, btn);
    }
  });
  // The tiles wait (dimmed, still answering with a hint) until the snowman is built.
  function updateTiles() {
    if (!S) return;
    tilesEl.classList.toggle("sn-later", S.step !== "dress");
    KINDS.forEach((k) => {
      const b = tiles.button(k.id);
      if (!b) return;
      b.classList.toggle("sn-full", S.step === "dress" && isFull(k.id));
      b.classList.toggle("sn-next", S.step === "dress" && k.id === "hat" && KINDS.every((q) => count(q.id) === 0));
      if (k.id === "scarf" || k.id === "hat" || k.id === "mittens") { const pic = b.querySelector(".tb-pic"); if (pic) pic.innerHTML = PIC[k.id](); }
    });
  }
  function popTiles() { KINDS.forEach((k, j) => setTimeout(() => tiles.flash(k.id), j * 60)); }
  // New: the old snowman fades, the snow fills the tracks back in, and a fresh small snowball sits in the yard.
  function newYard() {
    if (locked()) return;
    drag = null; press.cancel();
    tweens = []; flights = []; pwob = {}; busy = false;
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
    items.sort((a, b) => a.y - b.y).forEach((it) => it.f());
    S.balls.forEach((b) => { if (b && b.lift) drawLifted(b); });
    drawParts();
    drawBird(t);
    drawFlakes(t);
    drawRing(t);
    drawCarryTarget(t);
  }
  function onEnding(done) {
    ending = true;
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
        const w = want();
        return { step: S.step, r: S.balls.map((b) => (b ? +b.r.toFixed(1) : 0)), done: S.balls.map((b) => !!(b && b.done)),
          stacked: S.balls.map((b) => !!(b && b.stacked)), pieces: Object.assign({}, S.D), busy, wanted: w && w.part,
          coach: coach.text(), track: track.length, allOn: allOn(), bird: !!bird, rabbit: !!rabbit };
      },
      next: () => {
        if (busy) return "wait";
        if (rolling()) { doTapPart("ball"); return "roll"; }
        if (stacking()) { stackTap(activeIndex()); return "stack"; }
        const k = ["hat", "scarf", "arms", "buttons", "mittens"].find((id) => count(id) === 0);
        if (k) { putPiece(k, null); return k; }
        return "done";
      },
      finish,
      stack: () => stackTap(activeIndex()),
      put: (k) => putPiece(k, null),
      newYard: () => newYard(),
      surprise: () => surprise(),
      hit: (x, y) => hitPart(x, y),
      pt: (part) => {
        const i = activeIndex();
        if (part === "ball" && i >= 0 && S.balls[i]) { const c = ballC(S, i); return vp(c.x, c.y); }
        if (part === "target" && i > 0) { const T = stackAt(S, i); return vp(T.x, T.y); }
        if (part === "head" && S.step === "dress") { const g = geom(S); return vp(g.hx, g.hy); }
        if (part === "middle" && S.step === "dress") { const g = geom(S); return vp(g.mx, g.my); }
        if (part && part.startsWith("tile:")) { const b = tiles.button(part.slice(5)); if (b) { const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } }
        return null;
      },
      ghost: () => ghost.show()
    };
    const doTapPart = (part) => { const p = window.__toybox.pt(part); if (p) doTap(part, p.x, p.y); };
  }
})();
