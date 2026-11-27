(function () {
  "use strict";
  // Christmas · Tree: a cozy evening living room with a big bare fir tree in its stand, a window with snow
  // falling outside, a wreath on the wall, a box of ornaments on the floor and a wall socket by the baseboard.
  // He decorates the tree the real way, with his hands on the scene:
  //   1. Lights: he drags a finger across the tree and a light string drapes along his path (the wire sags a
  //      little between the branches and the bulbs sit along it, kept on the tree). A tap on the tree winds one
  //      whole wrap of lights round the tree at that height. The light colors (Colors, Warm white, Blue) are
  //      the panel tiles: a real "pick one" for the next string.
  //   2. Plug in: the strings' cord runs from the stand, through the light button, to a plug lying on the floor.
  //      Drag the plug into the wall socket (or tap it) and every light switches on with a warm glow, the star
  //      glows and the room dims a little. Pull it out (or tap it again) to switch off. Before there are lights
  //      the plug still goes in (the star and the button's little lamp answer, and a line says what to do).
  //   3. Ornaments: the ornament box on the floor holds balls in four colors, a bell, a candy cane, a pinecone,
  //      a snowflake, an icicle and the star topper. Drag one onto the tree and it hangs from the nearest free
  //      branch tip; tap one and it hops onto the next free branch by itself. The box always has more (the star
  //      is the only one). Hung ornaments swing when touched and can be dragged to another branch or back into
  //      the box.
  //   4. The star topper has its own place at the very top of the tree.
  //   5. The light button on the cord changes the lights: Steady, Twinkle or Slow fade (all calm, no flashing).
  // A yellow ring and one instruction show the next part (tree, then plug, then the box, the star and the
  // button); everything else still answers (a name tag, a swing, a wiggle). New = a bare tree again. Surprise
  // takes turns between live moments: a slow chase runs round the lit tree, snow falls thickly outside, every
  // ornament sparkles in turn, and a toy train rolls past the tree.
  // A visit from the home screen starts with a bare tree; a reload keeps the tree as it was.
  // Units: the room is drawn in world units (the TALL, MID or WIDE layout, picked from the stage's shape) scaled to
  // fit the stage; the tree, its lights and ornaments are drawn in tree units (the tree's own frame: 0 at the
  // star, about 470 down to the floor), so the decorations stay put whichever layout shows.
  //
  // Sections:
  //   Setup and saved state
  //   Lights, ornaments and patterns
  //   Layout
  //   The tree shape and branch tips
  //   Tweens and particles
  //   Light strings
  //   Ornaments
  //   Plug, socket and light button
  //   Drawing helpers
  //   Drawing the room
  //   Drawing the tree, lights, ornaments and star
  //   Drawing the box, cord, plug and train
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

  const KEY = "christmas-tree-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  // The tree is fresh on a visit from the home screen; a reload keeps it.
  const fresh = Toybox.fresh();
  const st0 = !fresh && saved.tree && typeof saved.tree === "object" ? saved.tree : null;

  // =====================================================================================================
  // Lights, ornaments and patterns
  // =====================================================================================================
  const LIGHTS = [
    { id: "colors", name: "Colors", cols: ["#FF4A4A", "#3FD16A", "#3D8BFF", "#FFD23B", "#FF8A2E"] },
    { id: "warm", name: "Warm white", cols: ["#FFE09A"] },
    { id: "blue", name: "Blue", cols: ["#4FA8FF"] }
  ];
  const LIGHT_BY = {};
  LIGHTS.forEach((l) => { LIGHT_BY[l.id] = l; });
  const MODES = [{ id: "steady", name: "Steady" }, { id: "twinkle", name: "Twinkle" }, { id: "fade", name: "Slow fade" }];
  // Each ornament hangs from a hook at (0, 0) in its own frame; cy and r are its middle and size below the hook.
  const ORNS = [
    { id: "red", name: "Red ball", kind: "ball", col: "#E8303F", cy: 27, r: 15 },
    { id: "gold", name: "Gold ball", kind: "ball", col: "#FFC93C", cy: 27, r: 15 },
    { id: "blue", name: "Blue ball", kind: "ball", col: "#2F8CFF", cy: 27, r: 15 },
    { id: "purple", name: "Purple ball", kind: "ball", col: "#9B5DE5", cy: 27, r: 15 },
    { id: "bell", name: "Bell", kind: "bell", col: "#FFC93C", cy: 23, r: 15 },
    { id: "cane", name: "Candy cane", kind: "cane", cy: 22, r: 14 },
    { id: "cone", name: "Pinecone", kind: "cone", cy: 25, r: 14 },
    { id: "flake", name: "Snowflake", kind: "flake", cy: 24, r: 15 },
    { id: "icicle", name: "Icicle", kind: "icicle", cy: 26, r: 12 },
    { id: "star", name: "Star", kind: "star", cy: 28, r: 28 }
  ];
  const ORN_BY = {};
  ORNS.forEach((o) => { ORN_BY[o.id] = o; });
  // The box: five across, two rows (the order of ORNS).
  const CELLS = ORNS.map((o) => o.id);

  // The tree right now. strands: [{ c: light id, a: [{x, y}] anchors in tree units, ...built }];
  // orns: [{ t: ornament id, s: branch tip index, sw, swv, sp }].
  const S = { strands: [], orns: [], star: false, plugged: false, mode: 0, color: "colors", modeTried: false };

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        tree: {
          s: S.strands.map((st) => ({ c: st.c, a: st.a.map((p) => [Math.round(p.x), Math.round(p.y)]) })),
          o: S.orns.map((o) => ({ t: o.t, s: o.s })),
          star: S.star, plug: S.plugged, mode: S.mode, color: S.color, tried: S.modeTried
        }
      }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Three layouts in world units: TALL (upright phones), MID (tablets, a stage that is nearly square) and WIDE
  // (sideways phones). tree: where the tree's frame sits (its star) and its scale.
  const TALL = {
    w: 400, h: 620, floor: 438,
    tree: { x: 200, y: 48, s: 0.95 },
    win: { x: 14, y: 46, w: 104, h: 148 },
    wreath: { x: 340, y: 104, r: 32 },
    socket: { x: 372, y: 400 },
    box: { x: 12, y: 506, w: 236, h: 108 },
    ctrl: { x: 290, y: 540 },
    plugRest: { x: 354, y: 584 },
    trainY: 500
  };
  const MID = {
    w: 620, h: 560, floor: 402,
    tree: { x: 360, y: 48, s: 0.98 },
    win: { x: 30, y: 52, w: 124, h: 172 },
    wreath: { x: 556, y: 112, r: 36 },
    socket: { x: 588, y: 366 },
    box: { x: 14, y: 444, w: 236, h: 108 },
    ctrl: { x: 520, y: 500 },
    plugRest: { x: 584, y: 532 },
    trainY: 534
  };
  const WIDE = {
    w: 820, h: 480, floor: 332,
    tree: { x: 410, y: 40, s: 0.875 },
    win: { x: 46, y: 46, w: 150, h: 180 },
    wreath: { x: 690, y: 114, r: 40 },
    socket: { x: 772, y: 296 },
    box: { x: 22, y: 364, w: 236, h: 108 },
    ctrl: { x: 600, y: 430 },
    plugRest: { x: 694, y: 450 },
    trainY: 458
  };
  let L = TALL, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const was = L;
    const ar = W / H;
    L = ar > 1.45 ? WIDE : ar > 0.82 ? MID : TALL;
    vs = Math.min(W / L.w, H / L.h) * 0.97;
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) / 2;
    if (was !== L && !P.in && !P.held) { P.x = L.plugRest.x; P.y = L.plugRest.y; }
    if (P.in) { const s = socketPt(); P.x = s.x; P.y = s.y; }
  }
  // World <-> viewport px, and tree units <-> world.
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  function tw(x, y) { const T = L.tree; return { x: T.x + x * T.s, y: T.y + y * T.s }; }
  function tl(x, y) { const T = L.tree; return { x: (x - T.x) / T.s, y: (y - T.y) / T.s }; }
  const tvp = (x, y) => { const w = tw(x, y); return vp(w.x, w.y); };

  // =====================================================================================================
  // The tree shape and branch tips
  // =====================================================================================================
  // Five tiers of branches, top to bottom (tree units): top yt with half width wt, bottom yb with half width
  // wb, and n branch tips along the bottom.
  const TIERS = [
    { yt: 12, yb: 104, wt: 0, wb: 58, n: 2 },
    { yt: 62, yb: 172, wt: 22, wb: 88, n: 3 },
    { yt: 122, yb: 246, wt: 36, wb: 118, n: 4 },
    { yt: 186, yb: 322, wt: 50, wb: 146, n: 5 },
    { yt: 254, yb: 400, wt: 64, wb: 172, n: 6 }
  ];
  // The branch tips an ornament can hang from: one hook per tip, just inside it.
  const SPOTS = [];
  TIERS.forEach((t, i) => {
    for (let j = 0; j < t.n; j++) SPOTS.push({ x: (-t.wb + (2 * j + 1) * t.wb / t.n) * 0.86, y: t.yb - 30, tier: i });
  });
  // The star's hook (its middle sits 28 below).
  const TOP = { x: 0, y: -32 };
  // Half the tree's width at height y (the widest tier there).
  function hwAt(y) {
    let w = 0;
    for (const t of TIERS) if (y >= t.yt && y <= t.yb + 2) w = Math.max(w, lerp(t.wt, t.wb, (y - t.yt) / (t.yb - t.yt)));
    return w;
  }
  function overTree(p, m) {
    if (p.y < TIERS[0].yt - m || p.y > 402 + m) return false;
    return Math.abs(p.x) <= hwAt(clamp(p.y, 14, 400)) + m;
  }
  // A point kept on the branches (lights never hang in the air).
  function onTree(p) {
    const y = clamp(p.y, 30, 392), hw = Math.max(6, hwAt(y) - 10);
    return { x: clamp(p.x, -hw, hw), y };
  }

  // =====================================================================================================
  // Tweens and particles
  // =====================================================================================================
  let tweens = [];
  function tween(dur, step, done, delay) {
    const t = { t0: now() + (delay || 0), dur: Math.max(0.01, dur), step, done };
    tweens.push(t);
    return t;
  }
  function runTweens(t) {
    for (const tw0 of tweens.slice()) {
      if (!tweens.includes(tw0)) continue;
      const p = (t - tw0.t0) / tw0.dur;
      if (p < 0) continue;
      if (tw0.step) tw0.step(Math.min(1, p));
      if (p >= 1) { tweens.splice(tweens.indexOf(tw0), 1); if (tw0.done) tw0.done(); }
    }
  }
  // Particles in world units: sparkles (four-point twinkles) and puffs (steam from the toy train).
  let parts = [];
  function sparkle(x, y, n, spread, col) {
    if (reduce) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 120) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      parts.push({ kind: "spark", x: x + Math.cos(a) * spread * sp, y: y + Math.sin(a) * spread * sp, vx: Math.cos(a) * 18, vy: Math.sin(a) * 18 - 10,
        t: -Math.random() * 0.25, life: 0.9 + sp * 0.4, size: 5 + sp * 5, color: col || (i % 2 ? "#FFFFFF" : "#FFE36B") });
    }
  }
  function puff(x, y) {
    if (parts.length > 120) parts.shift();
    parts.push({ kind: "puff", x, y, vx: -14 + Math.random() * 6, vy: -22 - Math.random() * 10, t: 0, life: 1.1, size: 6 + Math.random() * 4 });
  }
  function stepParts(dt) {
    parts = parts.filter((p) => { p.t += dt; if (p.t > 0) { p.x += p.vx * dt; p.y += p.vy * dt; } return p.t < p.life; });
  }

  // =====================================================================================================
  // Light strings
  // =====================================================================================================
  // A string is a list of anchors on the branches; the wire sags a little between neighbors (it drapes), and
  // the bulbs sit along the wire every GAP.
  const GAP = 14, SEG = 34, MAX_STRANDS = 28;
  let seedN = 1;
  function anchorsFrom(raw) {
    if (!raw.length) return [];
    const out = [{ x: raw[0].x, y: raw[0].y }];
    let acc = 0;
    for (let i = 1; i < raw.length; i++) {
      let ax = raw[i - 1].x, ay = raw[i - 1].y;
      const bx = raw[i].x, by = raw[i].y;
      let d = Math.hypot(bx - ax, by - ay);
      while (acc + d >= SEG && d > 0) {
        const k = (SEG - acc) / d;
        ax += (bx - ax) * k; ay += (by - ay) * k;
        out.push({ x: ax, y: ay });
        d = Math.hypot(bx - ax, by - ay); acc = 0;
      }
      acc += d;
    }
    const last = raw[raw.length - 1];
    if (acc > 4) out.push({ x: last.x, y: last.y });
    return out;
  }
  function along(poly, s) {
    for (let i = 1; i < poly.length; i++) {
      if (poly[i].d >= s) {
        const a = poly[i - 1], b = poly[i], k = (s - a.d) / Math.max(0.001, b.d - a.d);
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) };
      }
    }
    const e = poly[poly.length - 1];
    return { x: e.x, y: e.y };
  }
  // Works out the wire (poly) and the bulbs of a string from its anchors.
  function build(st) {
    const a = st.a, poly = [];
    if (!st.seed) st.seed = seedN++;
    if (a.length) poly.push({ x: a[0].x, y: a[0].y, d: 0 });
    for (let i = 0; i + 1 < a.length; i++) {
      const A = a[i], B = a[i + 1], dist = Math.hypot(B.x - A.x, B.y - A.y), sag = Math.min(9, dist * 0.26);
      const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2 + sag;
      for (let k = 1; k <= 8; k++) {
        const t = k / 8, u = 1 - t;
        poly.push({ x: u * u * A.x + 2 * u * t * cx + t * t * B.x, y: u * u * A.y + 2 * u * t * cy + t * t * B.y, d: 0 });
      }
    }
    let d = 0;
    for (let i = 1; i < poly.length; i++) { d += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y); poly[i].d = d; }
    st.poly = poly; st.len = d;
    const cols = (LIGHT_BY[st.c] || LIGHTS[0]).cols, b = [];
    let k = 0;
    for (let s = Math.min(GAP * 0.5, d); s <= d + 0.01; s += GAP) {
      const p = along(poly, s), col = cols[(k + st.seed) % cols.length];
      b.push({ x: p.x, y: p.y, d: s, col, dim: mixHex(col, "#59627A", 0.5), ph: hash(k, st.seed) * TAU, w: 1.3 + hash(k, st.seed + 7) * 1.5, tilt: (k % 2 ? 1 : -1) * 0.32 });
      k++;
    }
    st.b = b;
    if (st.grow == null) st.grow = 1;
    return st;
  }
  // The string being draped right now (follows his finger).
  let live = null;
  function strokeStart(w) {
    live = { c: S.color, raw: [onTree(tl(w.x, w.y))], a: [], grow: 1 };
    live.a = anchorsFrom(live.raw); build(live);
  }
  function strokeTo(w) {
    if (!live) return;
    const p = onTree(tl(w.x, w.y)), q = live.raw[live.raw.length - 1];
    if (Math.hypot(p.x - q.x, p.y - q.y) < 5) return;
    if (live.raw.length > 600) return;
    live.raw.push(p);
    live.a = anchorsFrom(live.raw); build(live);
  }
  function addStrand(st) {
    S.strands.push(st);
    while (S.strands.length > MAX_STRANDS) S.strands.shift();
    afterLights();
    saveSoon();
  }
  function strokeEnd(still) {
    const st = live; live = null;
    if (!st) return;
    if (still || st.len < 14) { wrapAt(st.raw[0].y); return; }
    delete st.raw;
    ghost.learned("tree");
    addStrand(st);
    const e = st.poly[st.poly.length - 1], w = tw(e.x, e.y);
    if (S.plugged) sparkle(w.x, w.y, 4, 10);
  }
  // A tap on the tree: one whole wrap of lights round the tree at that height. Seen from the front a wrap
  // dips in the middle, and it climbs a little as it goes round.
  function wrapAt(y) {
    y = clamp(y, 34, 384);
    const hw = Math.max(16, hwAt(y) - 8), a = [], n = Math.max(2, Math.round(2 * hw / SEG));
    for (let i = 0; i <= n; i++) {
      const u = -1 + 2 * i / n;
      a.push(onTree({ x: u * hw, y: y + (6 + hw * 0.07) * (1 - u * u) + u * 6 }));
    }
    const st = build({ c: S.color, a, grow: 0 });
    tween(reduce ? 0.3 : 0.9, (p) => { st.grow = ease(p); });
    ghost.learned("tree");
    addStrand(st);
  }
  function afterLights() { lastWant = null; }
  const bulbCount = () => S.strands.reduce((n, st) => n + st.b.length, 0);

  // =====================================================================================================
  // Ornaments
  // =====================================================================================================
  // The flights: ornaments on their way to a branch tip, to the top or back into the box.
  // { t, x0, y0, sc0, to: { spot } | { top } | { cell }, p, o (hung ornament to restore) }
  let fly = [];
  // What his finger carries: { t, from: "box" | "tree", o (hung ornament it came from), x, y (world, the hook) }
  let carry = null;
  const takenAt = CELLS.map(() => -9);
  function usedSpots() {
    const u = new Set(S.orns.map((o) => o.s));
    fly.forEach((f) => { if (f.to.spot != null) u.add(f.to.spot); });
    return u;
  }
  const freeSpots = () => { const u = usedSpots(); return SPOTS.map((p, i) => i).filter((i) => !u.has(i)); };
  // The next free branch tip for a tap: the one farthest from the ornaments already up (it starts low in the
  // middle), so the tree fills evenly.
  function nextSpot() {
    const free = freeSpots(), u = [...usedSpots()];
    if (!free.length) return -1;
    let best = free[0], bs = -Infinity;
    free.forEach((i) => {
      const p = SPOTS[i];
      let sc;
      if (!u.length) sc = -Math.abs(p.x) - Math.abs(p.y - 240) * 0.8;
      else sc = Math.min(...u.map((j) => Math.hypot(p.x - SPOTS[j].x, (p.y - SPOTS[j].y) * 1.2))) - p.y * 0.01;
      if (sc > bs) { bs = sc; best = i; }
    });
    return best;
  }
  // The free branch tip nearest a hook point (tree units), or -1.
  function nearSpot(p) {
    let best = -1, bd = Infinity;
    freeSpots().forEach((i) => { const d = Math.hypot(SPOTS[i].x - p.x, SPOTS[i].y - p.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const boxScale = () => L.tree.s * 0.8;
  function cellRect(k) {
    const B = L.box, cw = (B.w - 16) / 5, ch = (B.h * 0.78 - 8) / 2;
    return { x: B.x + 8 + (k % 5) * cw, y: B.y + 8 + Math.floor(k / 5) * ch, w: cw, h: ch };
  }
  // The hook of the ornament lying in cell k (world), so its middle sits in the middle of the cell.
  function cellHook(k) {
    const c = cellRect(k), o = ORN_BY[CELLS[k]], sc = boxScale() * (o.kind === "star" ? 0.7 : 1);
    return { x: c.x + c.w / 2, y: c.y + c.h / 2 - o.cy * sc + 1, sc };
  }
  const cellOf = (t) => CELLS.indexOf(t);
  const cellHas = (k) => CELLS[k] !== "star" || (!S.star && !(carry && carry.t === "star") && !fly.some((f) => f.t === "star"));
  const ornHook = (o) => SPOTS[o.s];
  const ornMid = (o) => { const h = ornHook(o), d = ORN_BY[o.t]; return { x: h.x - Math.sin(o.sw) * d.cy, y: h.y + Math.cos(o.sw) * d.cy }; };
  function launch(t, from, to, o) {
    const f = { t, x0: from.x, y0: from.y, sc0: from.sc, to, p: 0, o };
    fly.push(f);
    const dur = to.cell != null ? 0.45 : to.near ? 0.22 : 0.7;
    tween(reduce ? Math.min(dur, 0.3) : dur, (p) => { f.p = p; }, () => {
      fly.splice(fly.indexOf(f), 1);
      const to = f.to;
      if (to.spot != null) {
        S.orns.push({ t, s: to.spot, sw: (Math.random() - 0.5) * 0.4, swv: 1.6, sp: 0 });
        afterOrn();
      } else if (to.top) {
        S.star = true;
        const w = tw(0, TOP.y + 28);
        sparkle(w.x, w.y, 10, 24);
        lastWant = null;
        if (S.strands.length || S.orns.length) Toybox.kind();
        saveSoon();
      } else if (to.cell != null) takenAt[to.cell] = -9;
    });
    return f;
  }
  function flyPos(f) {
    let x1, y1, sc1;
    if (f.to.spot != null) { const w = tw(SPOTS[f.to.spot].x, SPOTS[f.to.spot].y); x1 = w.x; y1 = w.y; sc1 = L.tree.s; }
    else if (f.to.top) { const w = tw(TOP.x, TOP.y); x1 = w.x; y1 = w.y; sc1 = L.tree.s; }
    else { const h = cellHook(f.to.cell); x1 = h.x; y1 = h.y; sc1 = h.sc; }
    const e = ease(f.p), lift = f.to.near ? 0 : Math.sin(f.p * Math.PI) * 50;
    return { x: lerp(f.x0, x1, e), y: lerp(f.y0, y1, e) - lift, sc: lerp(f.sc0, sc1, e) };
  }
  function afterOrn() { lastWant = null; saveSoon(); }
  let fullSaid = 0;
  function sayFull() { if (now() > fullSaid) { fullSaid = now() + 4; coach.say("Every branch has an ornament.", 3); } }
  // A tap on an ornament in the box: it hops onto the next free branch tip by itself (the star to the top).
  function hopFromBox(k) {
    const t = CELLS[k];
    if (!cellHas(k)) return;
    const h = cellHook(k);
    if (t === "star") { ghost.learned("star"); launch(t, h, { top: true }); takenAt[k] = now(); return; }
    const s = nextSpot();
    if (s < 0) { boxWob = 1; sayFull(); return; }
    ghost.learned("box");
    takenAt[k] = now();
    launch(t, h, { spot: s });
  }
  // Where a carried ornament would go if let go now: a branch tip, the top, the box, or nowhere (null).
  function dropTarget(c) {
    const p = tl(c.x, c.y);
    if (c.from === "tree" && inBox(c, 6)) return { cell: cellOf(c.t) };
    if (c.t === "star") return overTree(p, 50) || (Math.abs(p.x) < 90 && p.y < 60 && p.y > -120) ? { top: true } : null;
    if (!overTree(p, 34)) return null;
    const s = nearSpot(p);
    return s >= 0 ? { spot: s } : null;
  }
  function dropCarry(still) {
    const c = carry; carry = null;
    if (!c) return;
    const from = { x: c.x, y: c.y, sc: L.tree.s * (c.from === "box" ? 0.95 : 1) };
    if (still) {
      // A press held still: the same as a tap.
      if (c.from === "box") {
        const s = c.t === "star" ? 0 : nextSpot();
        if (c.t === "star") { ghost.learned("star"); launch("star", from, { top: true }); }
        else if (s >= 0) { ghost.learned("box"); launch(c.t, from, { spot: s }); }
        else { launchHome(c, from); boxWob = 1; sayFull(); }
      }
      else if (c.t === "star") { launch("star", from, { top: true, near: true }); }
      else { launch(c.t, from, { spot: c.o.s, near: true }); }
      return;
    }
    const tg = dropTarget(c);
    if (tg && tg.spot != null) { ghost.learned("box"); launch(c.t, from, { spot: tg.spot, near: true }); }
    else if (tg && tg.top) { ghost.learned("star"); launch("star", from, { top: true, near: true }); }
    else if (tg && tg.cell != null) { launch(c.t, from, { cell: tg.cell }); afterOrn(); }
    else {
      if (c.from === "tree" && c.t !== "star" && usedSpots().has(c.o.s)) launch(c.t, from, { cell: cellOf(c.t) });
      else launchHome(c, from);
      if (c.from === "box" && c.t !== "star" && !freeSpots().length) sayFull();
    }
  }
  // Back where it came from: its cell, its branch tip, or the top.
  function launchHome(c, from) {
    if (c.from === "box") return launch(c.t, from, { cell: cellOf(c.t) });
    if (c.t === "star") return launch("star", from, { top: true, near: true });
    return launch(c.t, from, { spot: c.o.s, near: true });
  }
  function swing(o, k) { o.swv += (o.sw > 0 ? 1 : -1) * (k || 2.4) + (Math.random() - 0.5); }

  // =====================================================================================================
  // Plug, socket and light button
  // =====================================================================================================
  // The plug: where it is (world), its angle (0 = prongs up) and whether it is in the socket.
  const P = { x: TALL.plugRest.x, y: TALL.plugRest.y, ang: -0.6, in: false, held: false };
  const socketPt = () => ({ x: L.socket.x, y: L.socket.y - 10 });
  const lit = () => S.plugged;
  function plugIn() {
    const s = socketPt();
    P.in = true; P.x = s.x; P.y = s.y; P.ang = 0;
    S.plugged = true;
    ghost.learned("plug");
    lastWant = null;
    sparkle(s.x, s.y, 5, 10);
    if (S.strands.length) {
      const c = tw(0, 220);
      sparkle(c.x, c.y, 8, 120);
      Toybox.kind();
    } else coach.say("Now drag lights onto the tree.", 3);
    saveSoon();
  }
  function unplug(to) {
    S.plugged = false; P.in = false;
    lastWant = null;
    if (to) {
      const x0 = P.x, y0 = P.y;
      tween(0.45, (p) => { const e = ease(p); P.x = lerp(x0, to.x, e); P.y = lerp(y0, to.y, e) - Math.sin(p * Math.PI) * 30; });
    }
    saveSoon();
  }
  let plugTw = null;
  function plugTap() {
    if (plugTw || P.held) return;
    if (P.in) { unplug(L.plugRest); return; }
    const x0 = P.x, y0 = P.y, s = socketPt();
    plugTw = tween(0.55, (p) => { const e = ease(p); P.x = lerp(x0, s.x, e); P.y = lerp(y0, s.y, e) - Math.sin(p * Math.PI) * 40; }, () => { plugTw = null; plugIn(); });
  }
  function dropPlug(still) {
    P.held = false;
    const s = socketPt();
    if (still) { plugTap(); return; }
    if (Math.hypot(P.x - s.x, P.y - s.y) < 60) {
      const x0 = P.x, y0 = P.y;
      plugTw = tween(0.15, (p) => { P.x = lerp(x0, s.x, p); P.y = lerp(y0, s.y, p); }, () => { plugTw = null; plugIn(); });
    } else {
      // Let go anywhere else, it drops to the floor there.
      const to = { x: clamp(P.x, L.w * 0.55, L.w - 16), y: clamp(P.y, L.floor + 26, L.h - 16) };
      const x0 = P.x, y0 = P.y;
      tween(0.3, (p) => { const e = p * p; P.x = lerp(x0, to.x, e); P.y = lerp(y0, to.y, e); });
      if (!S.plugged && S.strands.length) hint();
    }
  }
  function cycleMode() {
    S.mode = (S.mode + 1) % MODES.length;
    S.modeTried = true;
    ctrlPress = 1;
    lastWant = null;
    const v = vp(L.ctrl.x, L.ctrl.y - 14);
    Toybox.nametag(MODES[S.mode].name, v.x, v.y, 2000);
    ghost.learned("ctrl");
    saveSoon();
  }

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  // K: how many world units one unit of the current frame is (for 2 px-looking outlines in any frame).
  let K = 1;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fs(fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = (lw || LW) / K; ctx.strokeStyle = INK; ctx.stroke(); }
  function st(col, lw) { ctx.lineWidth = lw / K; ctx.strokeStyle = col; ctx.stroke(); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  const rgbOf = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const rgba = (h, a) => "rgba(" + rgbOf(h).join(",") + "," + a + ")";
  function mixHex(a, b, t) {
    const x = rgbOf(a), y = rgbOf(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  function worldFrame() { ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy); K = 1; }
  // The tree's frame, swaying a little about its foot when the stand is bumped.
  let sway = 0, swayV = 0;
  function treeFrame() {
    worldFrame();
    const T = L.tree;
    ctx.translate(T.x, T.y); ctx.scale(T.s, T.s);
    if (sway) { ctx.translate(0, 450); ctx.rotate(sway); ctx.translate(0, -450); }
    K = T.s;
  }
  function star5(x, y, ro, ri) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function twinkle4(x, y, s, col) {
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  // Soft glow sprites, one per light color.
  const glowC = {};
  function glow(col) {
    if (glowC[col]) return glowC[col];
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.16, rgba(col, 0.9)); gr.addColorStop(0.45, rgba(col, 0.3)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowC[col] = c;
    return c;
  }

  // =====================================================================================================
  // Drawing the room
  // =====================================================================================================
  // Snow outside the window: flakes in the window's own 0..1 frame.
  const flakes = [];
  for (let i = 0; i < 90; i++) flakes.push({ x: Math.random(), y: Math.random(), v: 0.05 + Math.random() * 0.06, r: 1.2 + Math.random() * 1.8, ph: Math.random() * TAU, on: i < 28 });
  let sill = 0, gust = 0;
  function drawRoom(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fy = voy + L.floor * vs;
    // A warm wall with soft stripes, a white baseboard and a wooden floor, past the world's edges.
    ctx.fillStyle = "#F2DCB6"; ctx.fillRect(0, 0, W, fy);
    ctx.fillStyle = "#ECD1A6";
    const sw = 26 * vs;
    for (let x = vox % (sw * 2) - sw * 2; x < W; x += sw * 2) ctx.fillRect(x, 0, sw, fy);
    ctx.fillStyle = "#B97A4A"; ctx.fillRect(0, fy, W, H - fy);
    ctx.strokeStyle = "#A66A3D"; ctx.lineWidth = 2 * vs;
    for (let y = fy + 24 * vs; y < H; y += 26 * vs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = "#FFF8EC"; ctx.fillRect(0, fy - 12 * vs, W, 12 * vs);
    ctx.strokeStyle = INK; ctx.lineWidth = LW * vs;
    ctx.beginPath(); ctx.moveTo(0, fy - 12 * vs); ctx.lineTo(W, fy - 12 * vs); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke();
    worldFrame();
    drawWindow(t);
    drawWreath(t);
    drawSocket();
  }
  function drawWindow(t) {
    const w = L.win;
    // Curtains behind the frame's edges.
    [[w.x - 14, 1], [w.x + w.w - 8, -1]].forEach(([x]) => {
      ctx.beginPath(); ctx.moveTo(x, w.y - 12); ctx.lineTo(x + 22, w.y - 12);
      ctx.quadraticCurveTo(x + 18, w.y + w.h * 0.5, x + 24, w.y + w.h + 14); ctx.lineTo(x - 2, w.y + w.h + 14);
      ctx.quadraticCurveTo(x + 4, w.y + w.h * 0.5, x, w.y - 12); ctx.closePath(); fs("#C8333A");
    });
    rr(w.x - 4, w.y - 4, w.w + 8, w.h + 8, 6); fs("#FFF8EC");
    // The night outside: deep blue sky, a moon, snowy ground with two little pines.
    ctx.save();
    rr(w.x + 4, w.y + 4, w.w - 8, w.h - 8, 3); ctx.clip();
    ctx.fillStyle = "#22356A"; ctx.fillRect(w.x, w.y, w.w, w.h);
    ell(w.x + w.w * 0.72, w.y + w.h * 0.2, 9, 9); ctx.fillStyle = "#FFF4C8"; ctx.fill();
    ell(w.x + w.w * 0.72 + 4, w.y + w.h * 0.2 - 3, 8, 8); ctx.fillStyle = "#22356A"; ctx.fill();
    [[0.22, 0.86, 16], [0.5, 0.88, 12]].forEach(([fx, fy0, s]) => {
      const x = w.x + w.w * fx, y = w.y + w.h * fy0;
      ctx.beginPath(); ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s, y); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fillStyle = "#1D4B48"; ctx.fill();
    });
    ctx.beginPath(); ctx.moveTo(w.x, w.y + w.h * (0.86 - sill * 0.05));
    ctx.quadraticCurveTo(w.x + w.w * 0.5, w.y + w.h * (0.78 - sill * 0.05), w.x + w.w, w.y + w.h * (0.84 - sill * 0.05));
    ctx.lineTo(w.x + w.w, w.y + w.h); ctx.lineTo(w.x, w.y + w.h); ctx.closePath(); ctx.fillStyle = "#EAF4FF"; ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    flakes.forEach((f) => {
      if (!f.on) return;
      ell(w.x + f.x * w.w + Math.sin(t * 0.7 + f.ph) * 3, w.y + f.y * w.h, f.r, f.r); ctx.fill();
    });
    ctx.restore();
    // Frame bars and the sill (snow piles up on it in a big snowfall).
    ctx.lineWidth = 5; ctx.strokeStyle = "#FFF8EC";
    ctx.beginPath(); ctx.moveTo(w.x + w.w / 2, w.y + 2); ctx.lineTo(w.x + w.w / 2, w.y + w.h - 2); ctx.moveTo(w.x + 2, w.y + w.h * 0.48); ctx.lineTo(w.x + w.w - 2, w.y + w.h * 0.48); ctx.stroke();
    rr(w.x + 4, w.y + 4, w.w - 8, w.h - 8, 3); st(INK, 1.6);
    rr(w.x - 10, w.y + w.h + 2, w.w + 20, 10, 4); fs("#FFF8EC");
    if (sill > 0.02) { rr(w.x - 6, w.y + w.h + 2 - 6 * sill, w.w + 12, 6 * sill + 2, 4); ctx.fillStyle = "#FFFFFF"; ctx.fill(); }
  }
  let wreathWob = 0;
  function drawWreath(t) {
    const c = L.wreath, r = c.r;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.sin(wreathWob * 14) * wreathWob * 0.12);
    ell(0, 0, r, r); ctx.lineWidth = r * 0.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.lineWidth = r * 0.5 - 4; ctx.strokeStyle = "#2E8B57"; ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, x = Math.cos(a) * r, y = Math.sin(a) * r;
      ell(x, y, r * 0.2, r * 0.13); ctx.fillStyle = i % 2 ? "#3DAA68" : "#2A7C4E"; ctx.fill();
    }
    [[0.6, 0.55], [-0.7, 0.4], [0.1, -0.95], [-0.35, -0.85], [0.95, -0.1]].forEach(([x, y]) => { ell(x * r, y * r, 3.4, 3.4); fs("#E8303F", 1.4); });
    // The bow at the bottom.
    ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(-r * 0.5, r * 0.6, -r * 0.45, r * 1.15); ctx.closePath(); fs("#E8303F", 1.8);
    ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(r * 0.5, r * 0.6, r * 0.45, r * 1.15); ctx.closePath(); fs("#E8303F", 1.8);
    ctx.beginPath(); ctx.moveTo(-3, r); ctx.lineTo(-10, r * 1.5); ctx.lineTo(-4, r * 1.45); ctx.lineTo(0, r * 1.05); ctx.lineTo(4, r * 1.45); ctx.lineTo(10, r * 1.5); ctx.lineTo(3, r); ctx.closePath(); fs("#D12A36", 1.6);
    ell(0, r, 4, 4); fs("#FF5A64", 1.6);
    ctx.restore();
  }
  function drawSocket() {
    const s = L.socket;
    rr(s.x - 15, s.y - 24, 30, 48, 5); fs("#FFFDF6");
    [-10, 10].forEach((oy) => {
      rr(s.x - 9, s.y + oy - 7, 18, 14, 5); fs("#F1EADB", 1.4);
      ctx.fillStyle = INK; ctx.fillRect(s.x - 5, s.y + oy - 4, 2, 5); ctx.fillRect(s.x + 3, s.y + oy - 4, 2, 5);
      ell(s.x, s.y + oy + 4, 1.6, 1.4); ctx.fill();
    });
  }

  // =====================================================================================================
  // Drawing the tree, lights, ornaments and star
  // =====================================================================================================
  function tierPath(T) {
    const y1 = T.yb - 10, n = T.n, wb = T.wb;
    const cx = lerp(T.wt, wb, 0.5) - 7, cy = lerp(T.yt, y1, 0.5) + 6;
    ctx.beginPath(); ctx.moveTo(-T.wt, T.yt);
    if (T.wt > 0) ctx.quadraticCurveTo(0, T.yt - 8, T.wt, T.yt);
    ctx.quadraticCurveTo(cx, cy, wb, y1);
    for (let j = n - 1; j >= 0; j--) {
      const x0 = -wb + 2 * wb * (j + 1) / n, x1 = -wb + 2 * wb * j / n;
      ctx.quadraticCurveTo((x0 + x1) / 2, T.yb + 14, x1, y1);
    }
    ctx.quadraticCurveTo(-cx, cy, -T.wt, T.yt);
    ctx.closePath();
  }
  function drawTree() {
    // The tree skirt on the floor, the stand and the trunk.
    ell(0, 452, 154, 22); fs("#FFFFFF");
    ell(0, 450, 140, 16); ctx.fillStyle = "#C8333A"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, 420); ctx.lineTo(40, 420); ctx.lineTo(54, 452); ctx.lineTo(-54, 452); ctx.closePath(); fs("#2F6F48");
    rr(-46, 414, 92, 12, 4); fs("#3E8A5C");
    rr(-13, 386, 26, 32, 3); fs("#8A5A33");
    // The tiers, bottom first so each upper tier lies over the one below; the upper tier's shadow darkens
    // the top of the one below.
    for (let i = TIERS.length - 1; i >= 0; i--) {
      const T = TIERS[i];
      tierPath(T); ctx.fillStyle = "#2E9A57"; ctx.fill();
      if (i > 0) {
        ctx.save(); tierPath(T); ctx.clip();
        ctx.translate(0, 12); tierPath(TIERS[i - 1]); ctx.fillStyle = "#237A45"; ctx.fill();
        ctx.restore();
      }
      // Lighter needles along each branch tip.
      const y1 = T.yb - 10;
      for (let j = 0; j < T.n; j++) {
        const x0 = -T.wb + 2 * T.wb * j / T.n, x1 = -T.wb + 2 * T.wb * (j + 1) / T.n;
        ctx.beginPath(); ctx.moveTo(x0 + 8, y1 - 2); ctx.quadraticCurveTo((x0 + x1) / 2, T.yb + 3, x1 - 8, y1 - 2);
        st("#4CBB76", 3 * K);
      }
      tierPath(T); st(INK, LW);
    }
  }
  // Brightness of a lit bulb (0..1): the light button's pattern, or the surprise chase.
  function bright(b, si, gi, t) {
    if (actor && actor.kind === "chase") {
      const c = Math.cos(gi * 0.42 - (t - actor.t0) * (reduce ? 1.2 : 2.4));
      return 0.1 + 0.9 * Math.pow(Math.max(0, c), 2);
    }
    const m = MODES[S.mode].id, amp = reduce ? 0.5 : 1;
    if (m === "twinkle") return 1 - amp * 0.42 * (0.5 + 0.5 * Math.sin(t * b.w + b.ph));
    if (m === "fade") return 1 - amp * 0.62 * (0.5 + 0.5 * Math.sin(t * 1.3 + si * 0.9));
    return 1;
  }
  // A string's wire and its bulbs (in the tree's frame). on: how far the lights are on (0..1).
  function drawStrand(st0, on, t, si, alpha) {
    const lim = st0.len * (st0.grow == null ? 1 : st0.grow), poly = st0.poly;
    if (!poly || !poly.length) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length && poly[i - 1].d < lim; i++) {
      if (poly[i].d <= lim) ctx.lineTo(poly[i].x, poly[i].y);
      else { const p = along(poly, lim); ctx.lineTo(p.x, p.y); }
    }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    st("#173B26", 2.4 * K);
    for (const b of st0.b) {
      if (b.d > lim) break;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tilt);
      ctx.fillStyle = "#173B26"; ctx.fillRect(-2.2, -1, 4.4, 4);
      ell(0, 7.5, 4.3, 6.2); ctx.fillStyle = b.dim; ctx.fill();
      if (on > 0) { ctx.globalAlpha = alpha * on * (0.55 + 0.45 * b.k); ctx.fillStyle = b.col; ctx.fill(); ctx.globalAlpha = alpha; }
      ctx.lineWidth = 1.2 / K; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // Works out each bulb's brightness for this frame (b.k) so the bulb and its glow agree.
  function lightLevels(t) {
    let gi = 0;
    S.strands.forEach((s, si) => { s.b.forEach((b) => { b.k = bright(b, si, gi++, t); }); });
    if (live) live.b.forEach((b) => { b.k = bright(b, S.strands.length, gi++, t); });
    fading.forEach((f) => f.s.b.forEach((b) => { b.k = 1; }));
  }
  function drawGlows(on, t) {
    if (on <= 0.01) return;
    ctx.globalCompositeOperation = "lighter";
    const R = 17;
    const each = (s, a) => {
      const lim = s.len * (s.grow == null ? 1 : s.grow);
      for (const b of s.b) {
        if (b.d > lim) break;
        ctx.globalAlpha = Math.min(1, on * a * b.k * 0.85);
        const gx = b.x - Math.sin(b.tilt) * 7, gy = b.y + Math.cos(b.tilt) * 7;
        ctx.drawImage(glow(b.col), gx - R, gy - R, R * 2, R * 2);
      }
    };
    S.strands.forEach((s) => each(s, 1));
    if (live) each(live, 1);
    fading.forEach((f) => each(f.s, f.a));
    if (S.star) {
      const k = MODES[S.mode].id === "fade" && !reduce ? 0.85 + 0.15 * Math.sin(t * 1.3) : 1;
      ctx.globalAlpha = on * 0.9 * k;
      ctx.drawImage(glow("#FFD23B"), TOP.x - 70, TOP.y + 28 - 70, 140, 140);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  // One ornament, hook at (x, y) in the current frame, scaled by sc and swung by sw.
  function drawOrn(id, x, y, sc, sw, t) {
    const o = ORN_BY[id];
    ctx.save(); ctx.translate(x, y); if (sw) ctx.rotate(sw); ctx.scale(sc, sc);
    const k0 = K; K *= sc;
    const string = (len) => { ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, len); st("#C9A227", 1.6); };
    if (o.kind === "ball") {
      string(8);
      rr(-4.5, 7, 9, 6, 1.5); fs("#E3C15A", 1.4);
      ell(0, 27, 14.5, 14.5); fs(o.col);
      ctx.save(); ell(0, 27, 14.5, 14.5); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-16, 24); ctx.quadraticCurveTo(0, 30, 16, 24); ctx.lineTo(16, 29); ctx.quadraticCurveTo(0, 35, -16, 29); ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fill();
      ctx.restore();
      ell(-5, 21, 3.6, 2.6); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
    } else if (o.kind === "bell") {
      string(6);
      ctx.beginPath(); ctx.moveTo(-4, 8); ctx.quadraticCurveTo(-11, 10, -11, 22); ctx.quadraticCurveTo(-11, 30, -15, 33); ctx.lineTo(15, 33);
      ctx.quadraticCurveTo(11, 30, 11, 22); ctx.quadraticCurveTo(11, 10, 4, 8); ctx.closePath(); fs(o.col);
      ell(0, 35.5, 3.6, 3.6); fs("#C98A1B", 1.4);
      ctx.beginPath(); ctx.moveTo(-5, 14); ctx.quadraticCurveTo(-7, 22, -8, 28); st("rgba(255,255,255,0.7)", 2);
      ell(-5, 7, 5, 3); fs("#E8303F", 1.4); ell(5, 7, 5, 3); fs("#E8303F", 1.4); ell(0, 7, 2.4, 2.4); fs("#E8303F", 1.4);
    } else if (o.kind === "cane") {
      ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(0, 10); ctx.arc(7, 10, 7, Math.PI, 0); ctx.lineTo(14, 18);
      ctx.lineCap = "round"; st(INK, 10); st("#FFFFFF", 7);
      ctx.setLineDash([4.5, 4.5]); st("#E8303F", 7); ctx.setLineDash([]);
    } else if (o.kind === "cone") {
      string(8);
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(14, 11, 13, 32, 0, 42); ctx.bezierCurveTo(-13, 32, -14, 11, 0, 9); ctx.closePath(); fs("#A0612F");
      ctx.save(); ctx.clip();
      for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) {
        const yy = 14 + r * 6, xx = c * 6 + (r % 2 ? 3 : 0);
        ctx.beginPath(); ctx.arc(xx, yy, 4, 0.15 * Math.PI, 0.85 * Math.PI); st("#6E3E1C", 1.6);
      }
      ctx.restore();
    } else if (o.kind === "flake") {
      string(8);
      ctx.save(); ctx.translate(0, 24);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU, cx = Math.cos(a), sy = Math.sin(a);
        ctx.moveTo(0, 0); ctx.lineTo(cx * 14, sy * 14);
        const bx = cx * 8, by = sy * 8, a1 = a + 0.8, a2 = a - 0.8;
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a1) * 5, by + Math.sin(a1) * 5);
        ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a2) * 5, by + Math.sin(a2) * 5);
      }
      ctx.lineCap = "round"; st(INK, 5.4); st("#FFFFFF", 3);
      ell(0, 0, 3, 3); ctx.fillStyle = "#DDF1FF"; ctx.fill();
      ctx.restore();
    } else if (o.kind === "icicle") {
      string(6);
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(7, 7); ctx.quadraticCurveTo(5, 20, 3, 30); ctx.quadraticCurveTo(1.5, 42, 0, 48);
      ctx.quadraticCurveTo(-1.5, 42, -3, 30); ctx.quadraticCurveTo(-5, 20, -7, 7); ctx.closePath(); fs("#BFE9FF");
      ctx.beginPath(); ctx.moveTo(-2.5, 11); ctx.quadraticCurveTo(-2.5, 24, -1, 36); st("#FFFFFF", 2);
    } else if (o.kind === "star") {
      star5(0, 28, 28, 12); fs("#FFD23B");
      star5(0, 28, 17, 7.5); ctx.fillStyle = "#FFE98A"; ctx.fill();
    }
    K = k0;
    ctx.restore();
  }
  function drawOrnaments(t) {
    S.orns.forEach((o) => {
      const h = ornHook(o);
      drawOrn(o.t, h.x, h.y, 1, o.sw, t);
      if (o.sp > 0) {
        const m = ornMid(o), d = ORN_BY[o.t], s = Math.sin(o.sp * Math.PI) * 9;
        twinkle4(m.x + d.r * 0.55, m.y - d.r * 0.55, s, "#FFFFFF");
      }
    });
    if (S.star) drawOrn("star", TOP.x, TOP.y, 1, Math.sin(starWob * 12) * starWob * 0.15, t);
  }

  // =====================================================================================================
  // Drawing the box, cord, plug and train
  // =====================================================================================================
  let boxWob = 0, ctrlPress = 0;
  const inBox = (w, m) => w.x >= L.box.x - m && w.x <= L.box.x + L.box.w + m && w.y >= L.box.y - 14 - m && w.y <= L.box.y + L.box.h + m;
  function cellAt(w) {
    for (let k = 0; k < CELLS.length; k++) { const c = cellRect(k); if (w.x >= c.x && w.x < c.x + c.w && w.y >= c.y - 6 && w.y < c.y + c.h + 4) return k; }
    return -1;
  }
  function drawBox(t) {
    const B = L.box;
    ctx.save();
    if (boxWob > 0) { const a = Math.sin(boxWob * 16) * boxWob * 0.03; ctx.translate(B.x + B.w / 2, B.y + B.h); ctx.scale(1 + a, 1 - a); ctx.translate(-B.x - B.w / 2, -B.y - B.h); }
    // The open lid leans behind the box.
    ctx.beginPath(); ctx.moveTo(B.x + 10, B.y); ctx.lineTo(B.x + 22, B.y - 16); ctx.lineTo(B.x + B.w - 22, B.y - 16); ctx.lineTo(B.x + B.w - 10, B.y); ctx.closePath(); fs("#E8B67A");
    rr(B.x, B.y, B.w, B.h, 8); fs("#D9A066");
    rr(B.x + 6, B.y + 6, B.w - 12, B.h * 0.78 - 4, 6); fs("#F4DDB4", 2);
    for (let k = 0; k < CELLS.length; k++) {
      const c = cellRect(k);
      rr(c.x + 2, c.y + 2, c.w - 4, c.h - 4, 6); ctx.fillStyle = "#E9C893"; ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(B.x + 4, B.y + B.h * 0.78 + 4); ctx.lineTo(B.x + B.w - 4, B.y + B.h * 0.78 + 4); st("#B98450", 2);
    // A red ribbon round the front of the box.
    rr(B.x + B.w / 2 - 9, B.y + B.h * 0.78 + 4, 18, B.h * 0.22 - 4, 2); ctx.fillStyle = "#C8333A"; ctx.fill();
    rr(B.x, B.y, B.w, B.h, 8); st(INK, LW);
    ctx.restore();
    const tt = now();
    CELLS.forEach((id, k) => {
      if (!cellHas(k)) return;
      const h = cellHook(k), age = tt - takenAt[k];
      // A new one comes up from the bottom of the box after one is taken.
      const a = age < 0.5 ? 0 : age < 0.9 ? (age - 0.5) / 0.4 : 1;
      if (a <= 0) return;
      ctx.globalAlpha = a;
      drawOrn(id, h.x, h.y + (1 - a) * 8, h.sc, 0, t);
      ctx.globalAlpha = 1;
    });
  }
  // The plug's back, where the cord comes out (world).
  const plugTail = () => ({ x: P.x - Math.sin(P.ang) * 13, y: P.y + Math.cos(P.ang) * 13 });
  function drawCord() {
    const a = tw(48, 446), c = L.ctrl, tail = plugTail();
    ctx.lineCap = "round";
    const path = (fn) => { ctx.beginPath(); fn(); st(INK, 6); ctx.stroke(); st("#2C6B3F", 3.4); };
    path(() => { ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x + 30, a.y + 14, c.x - 50, c.y + 6, c.x - 16, c.y); });
    const bx = tail.x + Math.sin(P.ang) * 34, by = tail.y + Math.max(20, Math.cos(P.ang) * 34);
    path(() => { ctx.moveTo(c.x + 16, c.y); ctx.bezierCurveTo(c.x + 50, c.y + 6, bx, Math.max(by, c.y + 4), tail.x, tail.y); });
  }
  function drawCtrl(t) {
    const c = L.ctrl, pr = ctrlPress > 0 ? 1.5 * ctrlPress : 0;
    rr(c.x - 17, c.y - 11, 34, 22, 7); fs("#2C6B3F");
    ell(c.x + 5, c.y + pr * 0.5, 7, 7); fs("#F6F4EE", 1.8);
    ell(c.x - 9, c.y, 2.6, 2.6); ctx.fillStyle = S.plugged ? "#7CFF8A" : "#1C4A2C"; ctx.fill();
  }
  function drawPlug() {
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.ang);
    if (!P.in) {
      ctx.fillStyle = "#C9CED8"; ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      [-6, 2].forEach((x) => { ctx.beginPath(); ctx.rect(x, -24, 4, 13); ctx.fill(); ctx.stroke(); });
    }
    rr(-10, -12, 20, 25, 6); fs("#F7F6F0");
    ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); st("#B8BCC6", 1.6);
    ctx.restore();
  }
  // The surprise toy train rolling past the tree.
  function drawTrain(t) {
    if (!actor || actor.kind !== "train") return;
    const k = 1.2, p = (t - actor.t0) / actor.dur, x0 = lerp(-190, L.w / k + 30, p), y = L.trainY;
    ctx.save(); ctx.translate(0, y); ctx.scale(k, k); ctx.translate(0, -y);
    const wheel = (x) => {
      ell(x, y - 7, 7, 7); fs("#1D2340", 1.6);
      ell(x, y - 7, 3, 3); ctx.fillStyle = "#E8303F"; ctx.fill();
      const a = x0 * 0.12;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 5, y - 7 + Math.sin(a) * 5); ctx.lineTo(x - Math.cos(a) * 5, y - 7 - Math.sin(a) * 5); st("#F4F4F4", 1.4);
    };
    // Two wagons, then the engine at the front (on the right).
    rr(x0, y - 30, 46, 20, 3); fs("#3DAA68"); wheel(x0 + 10); wheel(x0 + 36);
    rr(x0 + 52, y - 30, 46, 20, 3); fs("#FFD23B");
    rr(x0 + 62, y - 42, 16, 13, 2); fs("#E8303F"); ctx.beginPath(); ctx.moveTo(x0 + 70, y - 42); ctx.lineTo(x0 + 70, y - 29); st("#FFD23B", 2);
    wheel(x0 + 62); wheel(x0 + 88);
    const e = x0 + 104;
    rr(e, y - 46, 22, 34, 3); fs("#2F8CFF");
    rr(e - 3, y - 50, 28, 6, 2); fs("#1D2340");
    rr(e + 20, y - 34, 40, 22, 9); fs("#E8303F");
    rr(e + 44, y - 46, 9, 14, 2); fs("#1D2340");
    ctx.beginPath(); ctx.moveTo(e + 60, y - 14); ctx.lineTo(e + 68, y - 6); ctx.lineTo(e + 58, y - 6); ctx.closePath(); fs("#FFD23B", 1.6);
    wheel(e + 8); wheel(e + 30); wheel(e + 50);
    ctx.restore();
    if (Math.random() < 0.08) puff((e + 48) * k, y - 50 * k);
  }
  function drawParts() {
    parts.forEach((p) => {
      if (p.t < 0) return;
      const k = p.t / p.life;
      if (p.kind === "spark") twinkle4(p.x, p.y, p.size * Math.sin(k * Math.PI), p.color);
      else { ctx.globalAlpha = 0.7 * (1 - k); ell(p.x, p.y, p.size * (1 + k), p.size * (1 + k)); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.globalAlpha = 1; }
    });
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  // The next part: lights, the plug, ornaments, the star, the light button; then nothing.
  function want() {
    if (!S.strands.length && !live) return { part: "tree", line: "Drag lights onto the tree." };
    if (!S.plugged) return { part: "plug", line: "Push the plug into the socket." };
    if (S.orns.length < 3) return { part: "box", line: "Hang ornaments on the tree." };
    if (!S.star) return { part: "starcell", line: "Put the star on top of the tree." };
    if (!S.modeTried) return { part: "ctrl", line: "Press the light button." };
    return null;
  }
  // A part's middle (world) and size, for the ring, the coach and the ghost hand.
  function partPt(part) {
    if (part === "tree") { const w = tw(0, 250); return { x: w.x, y: w.y, r: 100 * L.tree.s }; }
    if (part === "plug") return { x: P.x, y: P.y - 4, r: 24 };
    if (part === "socket") return { x: L.socket.x, y: L.socket.y, r: 26 };
    if (part === "ctrl") return { x: L.ctrl.x, y: L.ctrl.y, r: 22 };
    if (part === "box") return { x: L.box.x + L.box.w / 2, y: L.box.y + L.box.h / 2, r: L.box.w / 2 };
    if (part === "starcell") { const c = cellRect(cellOf("star")); return { x: c.x + c.w / 2, y: c.y + c.h / 2, r: 26 }; }
    if (part === "top") { const w = tw(0, TOP.y + 28); return { x: w.x, y: w.y, r: 26 }; }
    if (/^cell\d$/.test(part)) { const c = cellRect(+part.slice(4)); return { x: c.x + c.w / 2, y: c.y + c.h / 2, r: 22 }; }
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked() || drag || carry) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);
    const ring = (x, y, r) => {
      ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 4, 0, TAU);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    };
    if (w.part === "box") {
      const B = L.box, g = 4 + pulse * 4;
      rr(B.x - g, B.y - g, B.w + g * 2, B.h * 0.8 + g * 2, 10 + g);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    } else if (w.part === "plug") {
      const p = partPt("plug"), s = partPt("socket");
      ring(p.x, p.y, p.r); ring(s.x, s.y, s.r);
    } else { const p = partPt(w.part); if (p) ring(p.x, p.y, p.r); }
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = null;
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if (drag || carry) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    const p = partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  function hint() { const w = want(); if (w) { coach.say(w.line, 3); ghost.poke(); } }
  // The ghost hand shows a tap first and the real move (a drag) after that.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag || carry) return null;
      const w = want();
      if (!w) return null;
      const key = w.part === "starcell" ? "star" : w.part, first = ghost.shown(key) < 1;
      const P2 = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const T2 = (x, y) => { const v = tvp(x, y); return [v.x, v.y]; };
      if (w.part === "tree") {
        if (first) return { pts: [T2(10, 280)], tap: true, key };
        return { pts: [T2(-110, 270), T2(-40, 300), T2(30, 286), T2(110, 312)], dur: 2000, key };
      }
      if (w.part === "plug") {
        const s = socketPt();
        return first ? { pts: [P2(P.x, P.y)], tap: true, key } : { pts: [P2(P.x, P.y), P2(s.x, s.y)], dur: 1600, key };
      }
      if (w.part === "box") {
        const k = S.orns.length % 9, c = partPt("cell" + k), s = nextSpot();
        if (first || s < 0) return { pts: [P2(c.x, c.y)], tap: true, key };
        const h = SPOTS[s];
        return { pts: [P2(c.x, c.y), T2(h.x, h.y + 20)], dur: 1600, key };
      }
      if (w.part === "starcell") {
        const c = partPt("starcell"), tp = partPt("top");
        return first ? { pts: [P2(c.x, c.y)], tap: true, key } : { pts: [P2(c.x, c.y), P2(tp.x, tp.y)], dur: 1800, key };
      }
      const p = partPt(w.part);
      return p ? { pts: [P2(p.x, p.y)], tap: true, key } : null;
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  // The part under a press (client px). The things he works with (the plug, the box, the ornaments on the
  // tree, the star) come before the tree behind them; everything drawn answers.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 24 / vs, p = tl(w.x, w.y);
    const near = (q, r) => Math.hypot(w.x - q.x, w.y - q.y) <= Math.max(r, minR);
    if (!P.held && near({ x: P.x - Math.sin(P.ang) * 4, y: P.y - Math.cos(P.ang) * 4 }, 26)) return "plug";
    if (near(L.ctrl, 22)) return "ctrl";
    if (inBox(w, 4)) { const k = cellAt(w); return k >= 0 && cellHas(k) ? "cell" + k : "box"; }
    if (S.star && Math.hypot(p.x - TOP.x, p.y - (TOP.y + 28)) < 34) return "star";
    for (let i = S.orns.length - 1; i >= 0; i--) {
      const o = S.orns[i], m = ornMid(o);
      if (Math.hypot(p.x - m.x, p.y - m.y) < ORN_BY[o.t].r + 5) return "orn" + i;
    }
    if (overTree(p, 18)) return "tree";
    if (p.y > 380 && p.y < 458 && Math.abs(p.x) < 62) return "stand";
    if (Math.abs(p.y - 452) < 24 && Math.abs(p.x) < 156) return "skirt";
    if (near(L.socket, 28)) return "socket";
    const wi = L.win;
    if (w.x > wi.x - 10 && w.x < wi.x + wi.w + 10 && w.y > wi.y - 10 && w.y < wi.y + wi.h + 12) return "window";
    if (near(L.wreath, L.wreath.r + 10)) return "wreath";
    return null;
  }
  const SLOP = 12;
  let drag = null, skipTap = false, starWob = 0;
  // A tap: each part does its own one motion.
  function doTap(part, cx, cy) {
    if (locked() || part == null) return;
    if (part === "tree") { const w = wpt(cx, cy); wrapAt(tl(w.x, w.y).y); }
    else if (/^cell\d$/.test(part)) hopFromBox(+part.slice(4));
    else if (part === "box") { boxWob = 1; tag("Ornament box", L.box.x + L.box.w / 2, L.box.y - 10); }
    else if (/^orn\d+$/.test(part)) {
      const o = S.orns[+part.slice(3)];
      if (!o) return;
      swing(o, 3); o.sp = 0.01;
      const m = ornMid(o), w = tw(m.x, m.y - ORN_BY[o.t].r);
      tag(ORN_BY[o.t].name, w.x, w.y);
    } else if (part === "star") {
      starWob = 1;
      const w = tw(0, TOP.y + 28);
      sparkle(w.x, w.y, 5, 20);
      tag("Star", w.x, w.y - 24);
    } else if (part === "plug" || part === "socket") plugTap();
    else if (part === "ctrl") cycleMode();
    else if (part === "stand" || part === "skirt") {
      swayV += 0.05;
      const w = tw(0, part === "stand" ? 410 : 440);
      tag(part === "stand" ? "Tree stand" : "Tree skirt", w.x, w.y - 12);
      S.orns.forEach((o) => swing(o, 1.2));
    } else if (part === "window") { gust = 2.5; tag("Snow", L.win.x + L.win.w / 2, L.win.y); }
    else if (part === "wreath") { wreathWob = 1; tag("Wreath", L.wreath.x, L.wreath.y - L.wreath.r); }
  }
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null) return;
      startDrag(part, s);
      if (!drag) drag = { k: "hold", part };
      drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy);
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const w = wpt(s.x, s.y);
      if (drag.k === "lights") strokeTo(w);
      else if (drag.k === "carry" && carry) { carry.x = w.x + drag.ox; carry.y = w.y + drag.oy; }
      else if (drag.k === "plug") { P.x = w.x; P.y = w.y + 6; }
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null; skipTap = !!s.tap;
      const still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (locked()) { live = null; if (carry) dropCarry(true); if (P.held) dropPlug(false); return; }
      if (d.k === "hold") { if (still) doTap(d.part, s.x, s.y); }
      else if (d.k === "lights") strokeEnd(still);
      else if (d.k === "carry") dropCarry(still);
      else if (d.k === "plug") dropPlug(still);
    },
    tap: (part, x, y) => {
      if (skipTap) { skipTap = false; return; }
      if (!drag) doTap(part, x, y);
    }
  });
  // Starts the drag for a part (sets drag) when the part has one.
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0);
    if (part === "tree") {
      drag = { k: "lights" };
      strokeStart(w0); strokeTo(w);
    } else if (/^cell\d$/.test(part)) {
      const k = +part.slice(4), h = cellHook(k);
      carry = { t: CELLS[k], from: "box", x: h.x, y: h.y };
      takenAt[k] = now();
      // He holds it by its hook: it hangs from just above his fingertip.
      drag = { k: "carry", ox: 0, oy: -ORN_BY[CELLS[k]].cy * L.tree.s - 6 };
      carry.x = w.x + drag.ox; carry.y = w.y + drag.oy;
    } else if (/^orn\d+$/.test(part)) {
      const i = +part.slice(3), o = S.orns[i];
      if (!o) return;
      S.orns.splice(i, 1);
      const h = tw(SPOTS[o.s].x, SPOTS[o.s].y);
      carry = { t: o.t, from: "tree", o, x: h.x, y: h.y };
      drag = { k: "carry", ox: h.x - w0.x, oy: h.y - w0.y };
      carry.x = w.x + drag.ox; carry.y = w.y + drag.oy;
    } else if (part === "star") {
      S.star = false;
      const h = tw(TOP.x, TOP.y);
      carry = { t: "star", from: "tree", x: h.x, y: h.y };
      drag = { k: "carry", ox: h.x - w0.x, oy: h.y - w0.y };
      carry.x = w.x + drag.ox; carry.y = w.y + drag.oy;
    } else if (part === "plug") {
      if (plugTw) return;
      if (P.in) unplug(null);
      P.held = true;
      drag = { k: "plug" };
      P.x = w.x; P.y = w.y + 6;
    }
  }

  // =====================================================================================================
  // Panel and surprise
  // =====================================================================================================
  const bulbPic = (cols) => {
    const pts = [[9, 21], [19, 27], [30, 26], [41, 21]];
    let s = '<svg viewBox="0 0 50 50"><path d="M3 16 Q14 30 25 26 T47 16" fill="none" stroke="#173B26" stroke-width="2.6" stroke-linecap="round"/>';
    pts.forEach(([x, y], i) => {
      s += '<rect x="' + (x - 2.5) + '" y="' + (y - 1) + '" width="5" height="5" fill="#173B26"/>' +
        '<ellipse cx="' + x + '" cy="' + (y + 10) + '" rx="5" ry="7.5" fill="' + cols[i % cols.length] + '" stroke="#1D2340" stroke-width="1.8"/>';
    });
    return s + "</svg>";
  };
  const tiles = Toybox.tiles($("tiles"), {
    items: LIGHTS.map((l) => ({ id: l.id, name: l.name, pic: bulbPic(l.id === "colors" ? ["#FF4A4A", "#3FD16A", "#3D8BFF", "#FFD23B"] : l.cols) })),
    value: S.color, rows: 1,
    onPick: (id) => pickColor(id)
  });
  function pickColor(id) {
    if (!LIGHT_BY[id] || locked()) return;
    S.color = id;
    coach.say("Drag the " + LIGHT_BY[id].name.toLowerCase() + " lights onto the tree.", 3);
    ghost.again("tree");
    saveSoon();
  }
  // New: a bare tree again. The ornaments hop back into the box and the lights fade away.
  let fading = [];
  function newTree() {
    if (locked()) return;
    drag = null; press.cancel(); live = null;
    if (carry) { const c = carry; carry = null; launch(c.t, { x: c.x, y: c.y, sc: L.tree.s }, { cell: cellOf(c.t) }); }
    fly.forEach((f) => { if (f.to.spot != null || f.to.top) { const p = flyPos(f); f.x0 = p.x; f.y0 = p.y; f.sc0 = p.sc; f.to = { cell: cellOf(f.t) }; } });
    S.orns.forEach((o) => {
      const h = tw(SPOTS[o.s].x, SPOTS[o.s].y);
      launch(o.t, { x: h.x, y: h.y, sc: L.tree.s }, { cell: cellOf(o.t) });
    });
    if (S.star) { const h = tw(TOP.x, TOP.y); launch("star", { x: h.x, y: h.y, sc: L.tree.s }, { cell: cellOf("star") }); }
    S.strands.forEach((s) => { const f = { s, a: 1 }; fading.push(f); tween(0.5, (p) => { f.a = 1 - p; }, () => { fading.splice(fading.indexOf(f), 1); }); });
    S.strands = []; S.orns = []; S.star = false;
    if (S.plugged) unplug(L.plugRest);
    S.mode = 0; S.modeTried = false;
    lastWant = null;
    ghost.again();
    saveSoon();
  }
  const bar = Toybox.bar($("bottom"), { shelf: null, onNew: newTree, onSurprise: surprise });
  // Takes turns between live moments: a slow chase round the lit tree, a big snowfall outside, every ornament
  // sparkling in turn, and a toy train rolling past. The chase needs lit lights, so it waits its turn then.
  const MOMENTS = ["chase", "snow", "sparkle", "train"];
  let momentNext = 0, actor = null;
  function surprise() {
    if (locked()) return;
    let k = momentNext;
    if (MOMENTS[k] === "chase" && !(S.plugged && S.strands.length)) k = (k + 1) % MOMENTS.length;
    momentNext = (k + 1) % MOMENTS.length;
    const m = MOMENTS[k];
    if (m === "chase") actor = { kind: "chase", t0: now(), dur: 7 };
    else if (m === "snow") { actor = { kind: "snow", t0: now(), dur: 9 }; }
    else if (m === "train") actor = { kind: "train", t0: now(), dur: reduce ? 10 : 8 };
    else {
      actor = { kind: "sparkle", t0: now(), dur: 4 };
      const list = S.orns.slice().sort((a, b) => SPOTS[a.s].y - SPOTS[b.s].y);
      if (list.length) list.forEach((o, i) => tween(0.01, null, () => { if (S.orns.includes(o)) { o.sp = 0.01; swing(o, 1); const m2 = ornMid(o), w = tw(m2.x, m2.y); sparkle(w.x, w.y, 3, 12); } }, i * 0.28));
      else SPOTS.forEach((p, i) => tween(0.01, null, () => { const w = tw(p.x, p.y + 8); sparkle(w.x, w.y, 2, 8); }, i * 0.15));
      if (S.star) tween(0.01, null, () => { const w = tw(0, TOP.y + 28); sparkle(w.x, w.y, 8, 26); starWob = 1; }, list.length * 0.28);
    }
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now(), on = 0, dim = 0;
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    if (actor && t - actor.t0 > actor.dur) actor = null;
    // Ornaments swing like little pendulums and settle.
    S.orns.forEach((o) => {
      o.swv += (-26 * o.sw - 1.1 * o.swv) * dt; o.sw += o.swv * dt;
      if (o.sp > 0) { o.sp += dt * 1.4; if (o.sp >= 1) o.sp = 0; }
    });
    swayV += (-30 * sway - 2 * swayV) * dt; sway += swayV * dt;
    if (Math.abs(sway) < 0.0002 && Math.abs(swayV) < 0.0005) { sway = 0; swayV = 0; }
    boxWob = Math.max(0, boxWob - dt * 2); wreathWob = Math.max(0, wreathWob - dt * 1.5);
    starWob = Math.max(0, starWob - dt * 1.5); ctrlPress = Math.max(0, ctrlPress - dt * 4);
    // The lights switch on quickly and the room dims slowly.
    on += ((S.plugged ? 1 : 0) - on) * Math.min(1, dt * 7);
    const dimTo = S.plugged && (S.strands.length || S.star) ? 1 : 0;
    dim += (dimTo - dim) * Math.min(1, dt * 1.8);
    // Snow outside: a gentle fall, thicker in the surprise or after a tap on the window.
    gust = Math.max(0, gust - dt);
    const heavy = (actor && actor.kind === "snow") || gust > 0;
    const sp = reduce ? 0.5 : 1;
    flakes.forEach((f, i) => {
      f.on = i < (heavy ? 90 : 28);
      f.y += f.v * dt * sp * (heavy ? 1.6 : 1);
      if (f.y > 1.02) { f.y = -0.03; f.x = Math.random(); }
    });
    if (actor && actor.kind === "snow") sill = Math.min(1, sill + dt * 0.25);
    // The plug turns its prongs toward the socket while it is out.
    if (!P.in) { const s = socketPt(), a = clamp(Math.atan2(s.x - P.x, -(s.y - P.y)), -1.3, 1.3); P.ang += (a - P.ang) * Math.min(1, dt * 8); }
    lightLevels(t);
    updateCoach();
    draw(t);
    requestAnimationFrame(frame);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawRoom(t);
    treeFrame();
    drawTree();
    S.strands.forEach((s, i) => drawStrand(s, on, t, i, 1));
    fading.forEach((f) => drawStrand(f.s, on, t, 0, f.a));
    if (live) drawStrand(live, on, t, S.strands.length, 1);
    drawOrnaments(t);
    // Where a carried ornament would hang if let go now.
    if (carry) {
      const tg = dropTarget(carry);
      if (tg && (tg.spot != null || tg.top)) {
        const h = tg.top ? { x: TOP.x, y: TOP.y + 28 } : { x: SPOTS[tg.spot].x, y: SPOTS[tg.spot].y + ORN_BY[carry.t].cy };
        ctx.beginPath(); ctx.arc(h.x, h.y, ORN_BY[carry.t].r + 6, 0, TAU);
        ctx.setLineDash([6, 5]); st("#FFE36B", 3); ctx.setLineDash([]);
      }
    }
    worldFrame();
    drawTrain(t);
    drawCord();
    drawCtrl(t);
    drawBox(t);
    drawPlug();
    // The room dims a little while the tree is lit, then the lights glow over everything.
    if (dim > 0.005) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "rgba(16,20,52," + (0.36 * dim).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); }
    if (on > 0.01 && S.strands.length) {
      worldFrame();
      const c = tw(0, 260), r = 260 * L.tree.s, g = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, r);
      const a = 0.22 * on * Math.min(1, bulbCount() / 60);
      g.addColorStop(0, "rgba(255,214,140," + a.toFixed(3) + ")"); g.addColorStop(1, "rgba(255,214,140,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = "source-over";
    }
    treeFrame();
    drawGlows(on, t);
    worldFrame();
    if (S.plugged) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.8; ctx.drawImage(glow("#7CFF8A"), L.ctrl.x - 9 - 8, L.ctrl.y - 8, 16, 16); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    // Things in the air and in his hand stay bright.
    fly.forEach((f) => { const p = flyPos(f); drawOrn(f.t, p.x, p.y, p.sc, 0, t); });
    if (carry) drawOrn(carry.t, carry.x, carry.y, L.tree.s, Math.sin(t * 5) * 0.06, t);
    drawParts();
    drawRing(t);
  }
  function onEnding(done) {
    ending = true;
    drag = null; press.cancel(); live = null;
    if (carry) dropCarry(true);
    if (P.held) dropPlug(false);
    setTimeout(done, 1500);
  }
  function restArt() {
    let s = '<svg class="rest-art" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="#20345E"/>' +
      '<rect x="0" y="80" width="100" height="20" fill="#8A5A33"/>' +
      '<path d="M50 14 L70 44 L60 44 L76 66 L62 66 L82 84 L18 84 L38 66 L24 66 L40 44 L30 44 Z" fill="#2E9A57" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/>';
    [[44, 38, "#FF4A4A"], [56, 42, "#FFD23B"], [40, 58, "#3D8BFF"], [52, 56, "#3FD16A"], [62, 60, "#FF8A2E"], [32, 76, "#FFD23B"], [46, 74, "#FF4A4A"], [60, 78, "#3D8BFF"], [70, 76, "#3FD16A"]]
      .forEach(([x, y, c]) => { s += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + c + '" opacity="0.35"/><circle cx="' + x + '" cy="' + y + '" r="2.2" fill="' + c + '"/>'; });
    return s + '<path d="M50 4 L53 11 L60 11 L54.5 15.5 L56.5 22.5 L50 18.3 L43.5 22.5 L45.5 15.5 L40 11 L47 11 Z" fill="#FFD23B" stroke="#1D2340" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }

  // Restore the tree after a reload (a fresh visit starts bare).
  if (st0) {
    if (Array.isArray(st0.s)) st0.s.forEach((q) => {
      if (!q || !LIGHT_BY[q.c] || !Array.isArray(q.a)) return;
      const a = q.a.filter((p) => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1])).map(([x, y]) => onTree({ x, y }));
      if (a.length) S.strands.push(build({ c: q.c, a }));
    });
    S.strands = S.strands.slice(-MAX_STRANDS);
    if (Array.isArray(st0.o)) {
      const used = new Set();
      st0.o.forEach((q) => {
        if (!q || !ORN_BY[q.t] || q.t === "star" || !Number.isInteger(q.s) || q.s < 0 || q.s >= SPOTS.length || used.has(q.s)) return;
        used.add(q.s); S.orns.push({ t: q.t, s: q.s, sw: 0, swv: 0, sp: 0 });
      });
    }
    S.star = !!st0.star;
    S.plugged = !!st0.plug;
    if (Number.isInteger(st0.mode) && st0.mode >= 0 && st0.mode < MODES.length) S.mode = st0.mode;
    if (LIGHT_BY[st0.color]) S.color = st0.color;
    S.modeTried = !!st0.tried;
  }
  tiles.set(S.color);
  resize();
  if (S.plugged) { P.in = true; const s = socketPt(); P.x = s.x; P.y = s.y; P.ang = 0; on = 1; dim = S.strands.length || S.star ? 1 : 0; }
  else { P.x = L.plugRest.x; P.y = L.plugRest.y; }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "christmas",
    badge: $("tbadge"),
    timerIntro: "When time is up, the tree rests and the controls lock.",
    goodbyeOption: "End with a “Goodnight, tree” button to press",
    farewellText: "Time to say goodnight to the tree",
    goodbyeLabel: "Goodnight, tree",
    farewellDone: "Goodnight, tree!",
    restLine: "The tree is resting.",
    restLine2: "Its lights glow softly until next time.",
    restArt,
    onEnding,
    onWake: () => { ending = false; }
  });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__toybox = {
      state: () => {
        const w = want();
        return { strands: S.strands.length, bulbs: bulbCount(), orns: S.orns.map((o) => o.t + "@" + o.s), star: S.star, plugged: S.plugged,
          mode: MODES[S.mode].id, color: S.color, want: w && w.part, flying: fly.length, carrying: carry && carry.t,
          surprise: actor && actor.kind, coach: coach.text(), done: !w };
      },
      // Does the next wanted thing, the way a tap would.
      next: () => {
        const w = want();
        if (!w) return false;
        if (w.part === "tree") wrapAt(250);
        else if (w.part === "plug") plugTap();
        else if (w.part === "box") hopFromBox(S.orns.length % 9);
        else if (w.part === "starcell") hopFromBox(cellOf("star"));
        else if (w.part === "ctrl") cycleMode();
        return true;
      },
      tap: (part) => { const p = partPt(part) || { x: 0, y: 0 }, v = vp(p.x, p.y); doTap(part, v.x, v.y); },
      wrap: (y) => wrapAt(y == null ? 250 : y),
      plug: () => plugTap(),
      hang: (id) => hopFromBox(cellOf(id || "red")),
      color: (id) => { tiles.set(id); pickColor(id); },
      mode: () => cycleMode(),
      newTree: () => newTree(),
      surprise: () => surprise(),
      // Viewport points for real pointer drags: a part, a point on the tree (tree units), a branch tip.
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      treePt: (x, y) => tvp(x, y),
      spotPt: (i) => tvp(SPOTS[i].x, SPOTS[i].y + 20),
      spots: () => SPOTS.length,
      hit: (x, y) => hitPart(x, y),
      ghost: () => ghost.show()
    };
  }
})();
