(function () {
  "use strict";
  // Christmas · Tree: a cozy evening living room with a big bare tree in its stand, a window with snow falling
  // outside, a wreath on the wall, a box of ornaments and a box of lights and garland on the floor. The lights'
  // cord is already plugged into the wall socket; the lights start switched off.
  // He decorates the tree the real way, with his hands on the scene:
  //   1. Lights: a coil of the picked lights sits in the lights box. He touches the coil and drags: the free end
  //      follows his finger, the string pays out behind it, and wherever it crosses the tree it drapes onto the
  //      branches (the wire sags a little between them and the bulbs sit along it). Letting go leaves it hanging.
  //      A tap on the coil winds one whole wrap round the tree by itself (the next wrap goes where the tree is
  //      barest). Dragging on the bare tree draws a string too (a second way; the kind last used).
  //   2. The switch on the cord: each press goes Off, Steady, Twinkle, Slow fade, Off (all calm, no flashing),
  //      and a name tag says which. With no lights up yet it still clicks and a line says what to do.
  //   3. Garland: the coil of the picked garland sits beside the lights and works the same way (drag to drape
  //      it, with a deeper sag; tap for a whole wrap). Tinsel is a shimmery fringe that glints, more when lit.
  //   4. Ornaments: the ornament box holds balls in four colors, a bell, a candy cane, a pinecone, a snowflake,
  //      an icicle and the star topper. Drag one onto the tree and it hangs from the nearest free branch tip; tap
  //      one and it hops onto the next free branch by itself. The box always has more (the star is the only one).
  //   5. The star topper has its own place at the very top of the tree.
  //   6. Taking things off: drag a hung ornament or the star off the tree and it goes back into the box. Press
  //      and pull a hung string or garland and it comes off the tree with his finger: let go off the tree (or on
  //      a box) and it winds back into its coil; let go on the tree and it hangs there instead. The box lifts its
  //      lid and glows while an ornament is carried over it, the lights box glows while a string is. A plain tap
  //      on a string only wiggles it and says its name.
  // The panel: folder tabs under the stage (Tree, Lights, Garland), each with pick-one tiles: the tree's shape
  // (Classic, Tall and slim, Round and full, Little) and color (Green, Blue spruce, Snowy, Silver); eight light
  // colors (they set the lights coil); eight garlands (they set the garland coil). Changing the tree keeps the
  // decorating: strings are kept relative to the tree (height fraction, and side-to-side as a fraction of the half
  // width there) and ornaments by branch tip, so everything glides to the new shape while the tree pops.
  // A yellow ring and one instruction show the next part (the lights coil, the switch, the garland coil, the box,
  // the star, the switch again); everything else still answers (a name tag, a swing, a wiggle). New = a bare tree
  // again (strings wind back into their coils, ornaments hop into the box, the lights switch off). Surprise takes
  // turns between live moments: a slow chase runs round the lit tree, snow falls thickly outside, every ornament
  // sparkles in turn, and a toy train rolls past the tree.
  // A visit from the home screen starts with a bare Classic green tree; a reload keeps the tree as it was.
  // Saved (localStorage "christmas-tree-v1", key "tree"): { v: 2, shape, tc, s: [{ k: "l" | "g", c, r: [[u, v]
  // x1000] }], o: [{ t, s (branch tip of that shape) }], star, power (0..3), color, gar, tried, tab }. Older saves
  // ({ s: [{ c, a: [[x, y]] }] in Classic tree units, plug, mode }) still load: Classic, Green, lights off.
  // Units: the room is drawn in world units (the TALL, MID or WIDE layout, picked from the stage's shape) scaled to
  // fit the stage; the tree, its strings and ornaments are drawn in tree units (the tree's own frame: 0 at the
  // top of the Classic tree's star, about 470 down to the floor), so the decorations stay put whichever layout
  // shows.
  //
  // Sections:
  //   Setup and saved state
  //   Choices: tree shapes and colors, lights, garland, ornaments
  //   Layout
  //   The tree shape, branch tips and tree-relative points
  //   Tweens and particles
  //   Strings: lights and garland
  //   Live strings, wraps, pulling off and winding back
  //   Ornaments
  //   Switch
  //   Changing the tree
  //   Drawing helpers
  //   Drawing the room
  //   Drawing the tree, strings, ornaments and star
  //   Drawing the boxes, coils, cord, switch and train
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Panel and surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), stage = $("stage");
  let ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, INK = "#1D2340", LW = 2.4;
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const backOut = (t) => { const u = clamp(t, 0, 1) - 1; return 1 + 2.2 * u * u * u + 1.2 * u * u; };
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
  // Choices: tree shapes and colors, lights, garland, ornaments
  // =====================================================================================================
  // Each shape is tiers of branches, top to bottom (tree units): top yt with half width wt, bottom yb with half
  // width wb, and n branch tips along the bottom. Every shape's lowest tier ends at YB.
  const SHAPES = [
    { id: "classic", name: "Classic", tiers: [
      { yt: 12, yb: 104, wt: 0, wb: 58, n: 2 }, { yt: 62, yb: 172, wt: 22, wb: 88, n: 3 }, { yt: 122, yb: 246, wt: 36, wb: 118, n: 4 },
      { yt: 186, yb: 322, wt: 50, wb: 146, n: 5 }, { yt: 254, yb: 400, wt: 64, wb: 172, n: 6 }] },
    { id: "slim", name: "Tall and slim", tiers: [
      { yt: 4, yb: 88, wt: 0, wb: 40, n: 2 }, { yt: 56, yb: 148, wt: 14, wb: 58, n: 2 }, { yt: 112, yb: 210, wt: 22, wb: 74, n: 3 },
      { yt: 170, yb: 274, wt: 30, wb: 90, n: 4 }, { yt: 234, yb: 338, wt: 38, wb: 104, n: 4 }, { yt: 296, yb: 400, wt: 46, wb: 118, n: 5 }] },
    { id: "round", name: "Round and full", tiers: [
      { yt: 48, yb: 132, wt: 0, wb: 84, n: 3 }, { yt: 94, yb: 198, wt: 40, wb: 132, n: 4 }, { yt: 156, yb: 268, wt: 66, wb: 164, n: 4 },
      { yt: 226, yb: 336, wt: 86, wb: 182, n: 5 }, { yt: 294, yb: 400, wt: 96, wb: 174, n: 5 }] },
    { id: "little", name: "Little", tiers: [
      { yt: 176, yb: 248, wt: 0, wb: 50, n: 2 }, { yt: 212, yb: 298, wt: 18, wb: 80, n: 3 }, { yt: 258, yb: 350, wt: 28, wb: 106, n: 4 },
      { yt: 306, yb: 400, wt: 38, wb: 128, n: 5 }] }
  ];
  const SHAPE_BY = {};
  SHAPES.forEach((s) => { SHAPE_BY[s.id] = s; });
  // Tree colors: the branches, the shade under each tier, the lighter needles along the tips.
  const TCOLS = [
    { id: "green", name: "Green", tag: "Fir tree", fill: "#2E9A57", shade: "#237A45", tip: "#4CBB76" },
    { id: "spruce", name: "Blue spruce", tag: "Blue spruce", fill: "#3F8F8C", shade: "#2D6E70", tip: "#82C6BF" },
    { id: "snowy", name: "Snowy", tag: "Snowy tree", fill: "#EDF5F7", shade: "#86B99C", tip: "#FFFFFF", flock: "#5FA77A" },
    { id: "silver", name: "Silver", tag: "Silver tree", fill: "#C9D2DE", shade: "#98A5B8", tip: "#F4F7FB", shine: true }
  ];
  const TC_BY = {};
  TCOLS.forEach((c) => { TC_BY[c.id] = c; });
  const LIGHTS = [
    { id: "colors", name: "Colors", cols: ["#FF4A4A", "#3FD16A", "#3D8BFF", "#FFD23B", "#FF8A2E"] },
    { id: "warm", name: "Warm white", cols: ["#FFE09A"] },
    { id: "cool", name: "Cool white", cols: ["#E4F3FF"] },
    { id: "red", name: "Red", cols: ["#FF3B3B"] },
    { id: "green", name: "Green", cols: ["#3FD16A"] },
    { id: "blue", name: "Blue", cols: ["#4FA8FF"] },
    { id: "gold", name: "Gold", cols: ["#FFB82E"] },
    { id: "purple", name: "Purple", cols: ["#B57BFF"] }
  ];
  const LIGHT_BY = {};
  LIGHTS.forEach((l) => { LIGHT_BY[l.id] = l; });
  // Garland: kind is how it is drawn; cols its colors (tinsel: base, dark, glint).
  const GARLANDS = [
    { id: "gold", name: "Gold tinsel", kind: "tinsel", cols: ["#FFC93C", "#D9900F", "#FFF1A6"] },
    { id: "silver", name: "Silver tinsel", kind: "tinsel", cols: ["#D3DBE6", "#8F9CAF", "#FFFFFF"] },
    { id: "red", name: "Red tinsel", kind: "tinsel", cols: ["#EE3445", "#A3162A", "#FFA3AA"] },
    { id: "beads", name: "Beads", kind: "beads", cols: ["#FFC93C", "#E8303F"] },
    { id: "popcorn", name: "Popcorn", kind: "popcorn", cols: ["#FFF8E4"] },
    { id: "berries", name: "Cran\u00ADberries", kind: "berries", cols: ["#C8182F"] },
    { id: "chain", name: "Paper chain", kind: "chain", cols: ["#E8303F", "#2FA84F", "#FFC93C"] },
    { id: "ribbon", name: "Ribbon", kind: "ribbon", cols: ["#D7263D", "#FFC93C"] }
  ];
  const GAR_BY = {};
  GARLANDS.forEach((g) => { GAR_BY[g.id] = g; });
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
  // The switch: Off, then the three patterns.
  const POWER = ["Off", "Steady", "Twinkle", "Slow fade"];
  const POWER_ID = ["off", "steady", "twinkle", "fade"];

  // The tree right now. strands: [{ k: "l" (lights) | "g" (garland), c: light or garland id, r: [{u, v}] anchors
  // relative to the tree, a: [{x, y}] the same anchors in tree units for this shape, ...built }];
  // orns: [{ t: ornament id, s: branch tip index, sw, swv, sp }].
  const S = { shape: "classic", tc: "green", strands: [], orns: [], star: false, power: 0, color: "colors", gar: "gold",
    modeTried: false, tab: "lights", lastKind: "l" };

  let saveTimer = 0;
  const q3 = (v) => Math.round(v * 1000);
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        tree: {
          v: 2, shape: S.shape, tc: S.tc,
          s: S.strands.map((sd) => ({ k: sd.k, c: sd.c, r: sd.r.map((q) => [q3(q.u), q3(q.v)]) })),
          o: S.orns.map((o) => ({ t: o.t, s: o.s })),
          star: S.star, power: S.power, color: S.color, gar: S.gar, tried: S.modeTried, tab: S.tab
        }
      }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }

  // Little bits of state the drawing and input share (declared early: resize and the loop read them).
  let boxWob = 0, trayWob = 0, ctrlPress = 0, starWob = 0, wreathWob = 0, plugWob = 0, boxHot = 0, trayHot = 0;
  const coilWob = { l: 0, g: 0 };
  let sway = 0, swayV = 0, pop = null, tcMorph = null, morph = null;
  let drag = null, skipTap = false, live = null, pull = null, carry = null, actor = null, lastWant = null;
  let fly = [], fading = [], winding = [], tweens = [], parts = [];

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Three layouts in world units: TALL (upright phones), MID (tablets, a stage that is nearly square) and WIDE
  // (sideways phones). tree: where the tree's frame sits and its scale; box: the ornament box; tray: the lights
  // box with the two coils (coil: how big they are drawn); ctrl: the switch on the cord.
  const TALL = {
    w: 410, h: 562, floor: 370,
    tree: { x: 205, y: 40, s: 0.88 },
    win: { x: 12, y: 44, w: 96, h: 136 },
    wreath: { x: 352, y: 100, r: 30 },
    socket: { x: 390, y: 326 },
    box: { x: 6, y: 450, w: 236, h: 106 },
    tray: { x: 250, y: 452, w: 154, h: 104 },
    ctrl: { x: 334, y: 404 },
    coil: 1.25,
    trainY: 446
  };
  const MID = {
    w: 620, h: 560, floor: 402,
    tree: { x: 340, y: 48, s: 0.98 },
    win: { x: 30, y: 52, w: 124, h: 172 },
    wreath: { x: 556, y: 112, r: 36 },
    socket: { x: 588, y: 360 },
    box: { x: 14, y: 444, w: 236, h: 108 },
    tray: { x: 466, y: 450, w: 144, h: 102 },
    ctrl: { x: 546, y: 420 },
    coil: 1.15,
    trainY: 534
  };
  const WIDE = {
    w: 820, h: 480, floor: 332,
    tree: { x: 410, y: 40, s: 0.875 },
    win: { x: 46, y: 46, w: 150, h: 180 },
    wreath: { x: 690, y: 114, r: 40 },
    socket: { x: 772, y: 290 },
    box: { x: 22, y: 364, w: 236, h: 108 },
    tray: { x: 600, y: 368, w: 150, h: 104 },
    ctrl: { x: 556, y: 352 },
    coil: 1.35,
    trainY: 458
  };
  let L = TALL, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ar = W / H;
    L = ar > 1.45 ? WIDE : ar > 1 ? MID : TALL;
    vs = Math.min(W / L.w, H / L.h) * 0.97;
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) / 2;
  }
  // World <-> viewport px, and tree units <-> world.
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  function tw(x, y) { const T = L.tree; return { x: T.x + x * T.s, y: T.y + y * T.s }; }
  function tl(x, y) { const T = L.tree; return { x: (x - T.x) / T.s, y: (y - T.y) / T.s }; }
  const tvp = (x, y) => { const w = tw(x, y); return vp(w.x, w.y); };
  // The two coils sit in the lights box: the lights on the left, the garland on the right.
  const COIL_R = 25;
  const coilPos = (k) => { const T = L.tray; return { x: T.x + T.w * (k === "l" ? 0.27 : 0.73), y: T.y + T.h * 0.44 }; };
  const coilS = () => L.tree.s * L.coil;
  // Where a string leaves its coil (tree units).
  const coilTreePt = (k) => { const c = coilPos(k); return tl(c.x, c.y - 6 * coilS()); };
  const inBox = (w, m) => w.x >= L.box.x - m && w.x <= L.box.x + L.box.w + m && w.y >= L.box.y - 14 - m && w.y <= L.box.y + L.box.h + m;
  const inTray = (w, m) => w.x >= L.tray.x - m && w.x <= L.tray.x + L.tray.w + m && w.y >= L.tray.y - 10 - m && w.y <= L.tray.y + L.tray.h + m;

  // =====================================================================================================
  // The tree shape, branch tips and tree-relative points
  // =====================================================================================================
  const YB = 400;
  let SH = SHAPE_BY.classic, TIERS = SH.tiers, YT = 12, TOP = { x: 0, y: -32 }, SPOTS = [];
  // Makes a shape the current one: its tiers, its branch tips (one hook per tip, just inside it) and the star's
  // hook (the star's middle sits 28 below it).
  function useShape(sh) {
    SH = sh; TIERS = sh.tiers; YT = TIERS[0].yt; TOP = { x: 0, y: YT - 44 };
    SPOTS = [];
    TIERS.forEach((t, i) => {
      for (let j = 0; j < t.n; j++) SPOTS.push({ x: (-t.wb + (2 * j + 1) * t.wb / t.n) * 0.86, y: t.yb - 30, tier: i, j, n: t.n });
    });
  }
  useShape(SH);
  // Half the tree's width at height y (the widest tier there).
  function hwAt(y) {
    let w = 0;
    for (const t of TIERS) if (y >= t.yt && y <= t.yb + 2) w = Math.max(w, lerp(t.wt, t.wb, (y - t.yt) / (t.yb - t.yt)));
    return w;
  }
  function overTree(p, m) {
    if (p.y < YT - m || p.y > YB + 2 + m) return false;
    return Math.abs(p.x) <= hwAt(clamp(p.y, YT + 2, YB)) + m;
  }
  // A point kept on the branches (strings never hang in the air).
  function onTree(p) {
    const y = clamp(p.y, YT + 18, YB - 8), hw = Math.max(6, hwAt(y) - 10);
    return { x: clamp(p.x, -hw, hw), y };
  }
  // Tree-relative points: v = how far down the branches (0 at the top tier, 1 at the bottom), u = side to side as a
  // fraction of the half width at that height. They survive a change of shape.
  function toRel(p) { const hw = Math.max(1, hwAt(p.y)); return { u: clamp(p.x / hw, -1, 1), v: clamp((p.y - YT) / (YB - YT), 0, 1) }; }
  function fromRel(q) { const y = YT + q.v * (YB - YT); return onTree({ x: q.u * hwAt(y), y }); }
  // A branch tip as fractions (which tier, where along it), and the free tip of the current shape closest to them.
  function spotFrac(i) { const p = SPOTS[i]; return { tf: TIERS.length > 1 ? p.tier / (TIERS.length - 1) : 0, jf: (p.j + 0.5) / p.n }; }
  function fitSpot(fr, taken) {
    let best = -1, bd = Infinity;
    SPOTS.forEach((p, i) => {
      if (taken.has(i)) return;
      const f = spotFrac(i), d = (f.tf - fr.tf) * (f.tf - fr.tf) * 3 + (f.jf - fr.jf) * (f.jf - fr.jf);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  // =====================================================================================================
  // Tweens and particles
  // =====================================================================================================
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
  // Strings: lights and garland
  // =====================================================================================================
  // A string is a list of anchors on the branches; the wire sags between neighbors (it drapes; garland sags
  // deeper), and the bulbs (or beads, links, tinsel) sit along it. A loose anchor (the bit between a coil and the
  // tree, or out to his finger) hangs in a deep curve.
  const GAP = 14, SEG = 34, MAX_LIGHTS = 28, MAX_GAR = 16;
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
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), ang: Math.atan2(b.y - a.y, b.x - a.x) };
      }
    }
    const e = poly[poly.length - 1], f = poly[Math.max(0, poly.length - 2)];
    return { x: e.x, y: e.y, ang: Math.atan2(e.y - f.y, e.x - f.x) };
  }
  // How far apart the garland's pieces sit along it.
  const GSTEP = { tinsel: 2.4, beads: 6.6, popcorn: 8.5, berries: 7.4, chain: 8.6, ribbon: 0 };
  // Works out the wire (poly) and the bulbs or garland pieces of a string from its anchors.
  function build(sd) {
    const a = sd.a, poly = [], G = sd.k === "g";
    if (!sd.seed) sd.seed = seedN++;
    if (a.length) poly.push({ x: a[0].x, y: a[0].y, d: 0 });
    for (let i = 0; i + 1 < a.length; i++) {
      const A = a[i], B = a[i + 1], dist = Math.hypot(B.x - A.x, B.y - A.y);
      const sag = sd.flat ? 0 : B.loose ? Math.min(90, dist * 0.34) : G ? Math.min(15, dist * 0.42) : Math.min(9, dist * 0.26);
      const cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2 + sag, n = B.loose ? 14 : 8;
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        poly.push({ x: u * u * A.x + 2 * u * t * cx + t * t * B.x, y: u * u * A.y + 2 * u * t * cy + t * t * B.y, d: 0 });
      }
    }
    let d = 0;
    for (let i = 1; i < poly.length; i++) { d += Math.hypot(poly[i].x - poly[i - 1].x, poly[i].y - poly[i - 1].y); poly[i].d = d; }
    sd.poly = poly; sd.len = d;
    const b = [];
    if (!G) {
      const cols = (LIGHT_BY[sd.c] || LIGHTS[0]).cols;
      let k = 0;
      for (let s = Math.min(GAP * 0.5, d); s <= d + 0.01; s += GAP) {
        const p = along(poly, s), col = cols[(k + sd.seed) % cols.length];
        b.push({ x: p.x, y: p.y, d: s, col, dim: mixHex(col, "#59627A", 0.5), ph: hash(k, sd.seed) * TAU, w: 1.3 + hash(k, sd.seed + 7) * 1.5, tilt: (k % 2 ? 1 : -1) * 0.32, k: 1 });
        k++;
      }
    } else {
      const step = GSTEP[(GAR_BY[sd.c] || GARLANDS[0]).kind];
      let k = 0;
      if (step) for (let s = step * 0.5; s <= d + 0.01 && k < 1600; s += step) {
        const p = along(poly, s);
        b.push({ x: p.x, y: p.y, d: s, ang: p.ang, h: hash(k, sd.seed), h2: hash(k, sd.seed + 3), i: k });
        k++;
      }
    }
    sd.b = b;
    if (sd.grow == null) sd.grow = 1;
    return sd;
  }
  // A new string from anchors in tree units (kept relative to the tree too).
  function makeStrand(k, c, a) {
    const sd = { k, c, a: a.map((p) => ({ x: p.x, y: p.y })), grow: 1 };
    sd.r = sd.a.map(toRel);
    return build(sd);
  }
  const lightN = () => S.strands.filter((s) => s.k === "l").length;
  const garN = () => S.strands.filter((s) => s.k === "g").length;
  const bulbCount = () => S.strands.reduce((n, sd) => n + (sd.k === "l" ? sd.b.length : 0), 0);
  function addStrand(sd) {
    S.strands.push(sd);
    const max = sd.k === "l" ? MAX_LIGHTS : MAX_GAR;
    while (S.strands.filter((s) => s.k === sd.k).length > max) S.strands.splice(S.strands.findIndex((s) => s.k === sd.k), 1);
    lastWant = null;
    saveSoon();
  }
  const strandName = (sd) => (sd.k === "l" ? (LIGHT_BY[sd.c] || LIGHTS[0]).name + " lights" : (GAR_BY[sd.c] || GARLANDS[0]).name);
  const nameOf = (k) => (k === "l" ? "lights" : "garland");
  function centerOf(sd) {
    let x = 0, y = 0;
    sd.a.forEach((p) => { x += p.x; y += p.y; });
    const n = Math.max(1, sd.a.length);
    return { x: x / n, y: y / n };
  }
  // The hung string under a point (tree units), or -1. The bulbs hang a little below the wire.
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1) : 0;
    return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t);
  }
  function strandAt(p, tol) {
    const q = { x: p.x, y: p.y - 5 };
    for (let i = S.strands.length - 1; i >= 0; i--) {
      const sd = S.strands[i], poly = sd.poly, m = tol + (sd.k === "g" ? 4 : 3);
      if (sd.grow < 1) continue;
      for (let j = 1; j < poly.length; j++) if (segDist(q, poly[j - 1], poly[j]) < m) return i;
    }
    return -1;
  }

  // =====================================================================================================
  // Live strings, wraps, pulling off and winding back
  // =====================================================================================================
  // The string following his finger: from a coil (the free end follows his finger, the rest pays out from the
  // coil and drapes wherever it crosses the tree) or drawn straight on the tree. raw: the points on the branches.
  function liveStart(k, fromCoil, w) {
    const p = tl(w.x, w.y);
    live = { k, c: k === "l" ? S.color : S.gar, coil: fromCoil, raw: fromCoil ? [] : [onTree(p)], end: p, a: [], grow: 1, seed: seedN++ };
    S.lastKind = k;
    liveBuild();
  }
  function liveMove(w) {
    if (!live) return;
    const p = tl(w.x, w.y), last = live.raw[live.raw.length - 1];
    live.end = p;
    // Once on the tree the string keeps to the branches until his finger is well off the tree.
    if (overTree(p, last ? 46 : 2) && live.raw.length < 600) {
      const q = onTree(p);
      if (!last || Math.hypot(q.x - last.x, q.y - last.y) >= 5) live.raw.push(q);
    }
    liveBuild();
  }
  function liveBuild() {
    const lv = live, a = anchorsFrom(lv.raw), out = [];
    if (lv.coil) out.push(coilTreePt(lv.k));
    a.forEach((q, i) => out.push({ x: q.x, y: q.y, loose: i === 0 && lv.coil }));
    if (!a.length || !overTree(lv.end, 2)) out.push({ x: lv.end.x, y: lv.end.y, loose: true });
    lv.a = out;
    build(lv);
  }
  // A short-lived bit of string that fades (the loose bits left between the coil, the tree and his finger).
  function fadeOut(k, c, a, seed) {
    const sd = build({ k, c, a, seed });
    const f = { s: sd, a: 1 };
    fading.push(f);
    tween(0.35, (p) => { f.a = 1 - p; }, () => { fading.splice(fading.indexOf(f), 1); });
  }
  function liveEnd(still, far) {
    const lv = live; live = null;
    if (!lv) return;
    if (still) { if (lv.coil) coilTap(lv.k); else treeTap(lv.end); return; }
    const a = anchorsFrom(lv.raw);
    const sd = a.length >= 2 ? makeStrand(lv.k, lv.c, a) : null;
    if (sd && sd.len >= 14) {
      ghost.learned(lv.k === "l" ? "coill" : "coilg");
      addStrand(sd);
      if (lv.coil) fadeOut(lv.k, lv.c, [coilTreePt(lv.k), { x: a[0].x, y: a[0].y, loose: true }], lv.seed);
      if (!overTree(lv.end, 2)) { const e = a[a.length - 1]; fadeOut(lv.k, lv.c, [{ x: e.x, y: e.y }, { x: lv.end.x, y: lv.end.y, loose: true }], lv.seed + 1); }
      const e = sd.poly[sd.poly.length - 1], w = tw(e.x, e.y);
      if (S.power && lv.k === "l") sparkle(w.x, w.y, 4, 10);
      if (lv.k === "g") sparkle(w.x, w.y, 3, 10, "#FFFFFF");
    } else {
      // Nothing reached the tree: it winds back into the coil.
      if (lv.coil) windBack(lv);
      if (lv.coil && far > 50) coach.say("Drag the " + nameOf(lv.k) + " all the way onto the tree.", 3);
    }
  }
  // A tap on a coil: one whole wrap round the tree by itself, where the tree is barest of that kind. Seen from the
  // front a wrap dips in the middle and climbs a little as it goes round; it starts on the coil's side and the
  // string pays out from the coil as it goes.
  const WRAP_V = [0.62, 0.38, 0.84, 0.2, 0.5, 0.74, 0.28, 0.92, 0.12, 0.56];
  function nextWrapV(k) {
    const have = S.strands.filter((s) => s.k === k).map((s) => s.r.reduce((n, q) => n + q.v, 0) / Math.max(1, s.r.length));
    // The first height in WRAP_V that is clear of the wraps already there; when none is, the clearest.
    let best = WRAP_V[0], bs = -1;
    for (const v of WRAP_V) {
      const d = have.length ? Math.min(...have.map((h) => Math.abs(h - v))) : 1;
      if (d >= 0.14) return v;
      if (d > bs) { bs = d; best = v; }
    }
    return best;
  }
  function wrapAt(k, v, fromCoil) {
    if (v == null) v = nextWrapV(k);
    const y = clamp(YT + v * (YB - YT), YT + 24, YB - 16);
    const hw = Math.max(16, hwAt(y) - 8), a = [], n = Math.max(2, Math.round(2 * hw / SEG));
    const dip = k === "g" ? 4 + hw * 0.06 : 6 + hw * 0.07;
    for (let i = 0; i <= n; i++) {
      const u = 1 - 2 * i / n;
      a.push(onTree({ x: u * hw, y: y + dip * (1 - u * u) - u * 6 }));
    }
    const sd = makeStrand(k, k === "l" ? S.color : S.gar, a);
    sd.grow = 0; sd.tail = !!fromCoil;
    tween(reduce ? 0.3 : 1.1, (p) => { sd.grow = ease(p); }, () => { sd.tail = false; });
    S.lastKind = k;
    addStrand(sd);
    return sd;
  }
  function coilTap(k) {
    coilWob[k] = 1;
    ghost.learned(k === "l" ? "coill" : "coilg");
    wrapAt(k, null, true);
  }
  // Pulling a hung string off: it comes away with his finger, gathering up toward his hand the farther it goes.
  // x0, y0: where he took hold (tree units); dx, dy: how far it has moved; k: how gathered it is (1 = not).
  function pullStart(i, w0, w) {
    const sd = S.strands[i];
    if (!sd) return;
    S.strands.splice(i, 1);
    const p0 = tl(w0.x, w0.y);
    pull = { sd, i, x0: p0.x, y0: p0.y, dx: 0, dy: 0, k: 1, fx: w.x, fy: w.y };
    pullMove(w);
  }
  function pullMove(w) {
    const p = tl(w.x, w.y);
    pull.dx = p.x - pull.x0; pull.dy = p.y - pull.y0; pull.fx = w.x; pull.fy = w.y;
    pull.k = Math.max(0.42, 1 - Math.hypot(pull.dx, pull.dy) / 320);
  }
  // Where a pulled string's middle is drawn now, and how gathered it is (for winding back from there).
  function pullFrom(pl) {
    const c = centerOf(pl.sd);
    return { x: pl.x0 + pl.dx + (c.x - pl.x0) * pl.k, y: pl.y0 + pl.dy - 4 + (c.y - pl.y0) * pl.k, k: pl.k };
  }
  // Let go here, a pulled string goes back into its coil (off the tree, or on either box).
  const pullOff = (pl) => { const f = { x: pl.fx, y: pl.fy }; return inTray(f, 8) || inBox(f, 8) || !overTree(tl(f.x, f.y), 6); };
  function pullEnd(still) {
    const pl = pull; pull = null;
    if (!pl) return;
    const sd = pl.sd;
    if (still) { S.strands.splice(Math.min(pl.i, S.strands.length), 0, sd); return; }
    if (pullOff(pl)) { windBack(sd, pullFrom(pl)); lastWant = null; saveSoon(); return; }
    // Let go on the tree: it hangs where he left it.
    sd.a = sd.a.map((q) => onTree({ x: q.x + pl.dx, y: q.y + pl.dy }));
    sd.r = sd.a.map(toRel);
    build(sd);
    S.strands.push(sd);
    lastWant = null;
    saveSoon();
  }
  // A string winding back into its coil: it shrinks into the coil and the coil bobs. from: where its middle is
  // drawn now and how big ({ x, y, k }; on the tree, unmoved, by default).
  function windBack(sd, from, delay) {
    const c = centerOf(sd), f = from || { x: c.x, y: c.y, k: 1 };
    const w = { sd, cx: c.x, cy: c.y, fx: f.x, fy: f.y, k0: f.k, to: coilTreePt(sd.k), p: 0 };
    winding.push(w);
    tween(reduce ? 0.3 : 0.6, (p) => { w.p = p; }, () => {
      winding.splice(winding.indexOf(w), 1);
      coilWob[sd.k] = 1;
      const cp = coilPos(sd.k);
      sparkle(cp.x, cp.y - 8, 3, 14);
    }, delay);
  }

  // =====================================================================================================
  // Ornaments
  // =====================================================================================================
  // The flights: ornaments on their way to a branch tip, to the top or back into the box.
  // { t, x0, y0, sc0, to: { spot } | { top } | { cell }, p, o (hung ornament to restore) }
  // What his finger carries: { t, from: "box" | "tree", o, x, y (world, the hook), fx, fy (world, his finger) }
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
    const mid = YT + (YB - YT) * 0.6;
    let best = free[0], bs = -Infinity;
    free.forEach((i) => {
      const p = SPOTS[i];
      let sc;
      if (!u.length) sc = -Math.abs(p.x) - Math.abs(p.y - mid) * 0.8;
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
  // An ornament's hook (tree units); while the tree changes shape it glides from the old tip to the new one.
  const ornHook = (o) => { const s = SPOTS[o.s]; if (o.mf && morph) { const e = ease(morph.p); return { x: lerp(o.mf.x, s.x, e), y: lerp(o.mf.y, s.y, e) }; } return s; };
  const ornMid = (o) => { const h = ornHook(o), d = ORN_BY[o.t]; return { x: h.x - Math.sin(o.sw) * d.cy, y: h.y + Math.cos(o.sw) * d.cy }; };
  const topNow = () => (morph ? { x: 0, y: lerp(morph.top0, TOP.y, ease(morph.p)) } : TOP);
  function launch(t, from, to, o) {
    const f = { t, x0: from.x, y0: from.y, sc0: from.sc, to, p: 0, o };
    fly.push(f);
    const dur = to.cell != null ? 0.45 : to.near ? 0.22 : 0.7;
    tween(reduce ? Math.min(dur, 0.3) : dur, (p) => { f.p = p; }, () => {
      fly.splice(fly.indexOf(f), 1);
      const to = f.to;
      if (to.spot != null) {
        // (If the tree changed shape on the way and that tip is gone or taken, the next free one; else the box.)
        const s = to.spot < SPOTS.length && !S.orns.some((q) => q.s === to.spot) ? to.spot : nextSpot();
        if (s >= 0) {
          S.orns.push({ t, s, sw: (Math.random() - 0.5) * 0.4, swv: 1.6, sp: 0 });
          afterOrn();
        } else { const p = flyPos(f); launch(t, p, { cell: cellOf(t) }); }
      } else if (to.top) {
        S.star = true;
        const w = tw(0, TOP.y + 28);
        sparkle(w.x, w.y, 10, 24);
        lastWant = null;
        if (S.strands.length || S.orns.length) Toybox.kind();
        saveSoon();
      } else if (to.cell != null) { takenAt[to.cell] = -9; boxWob = Math.max(boxWob, 0.5); }
    });
    return f;
  }
  function flyPos(f) {
    let x1, y1, sc1;
    if (f.to.spot != null) { const s = SPOTS[f.to.spot] || SPOTS[0], w = tw(s.x, s.y); x1 = w.x; y1 = w.y; sc1 = L.tree.s; }
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
  // Where a carried ornament would go if let go now: a branch tip, the top, or the box. Off the tree it goes back
  // into the box.
  function dropTarget(c) {
    const p = tl(c.x, c.y), f = { x: c.fx, y: c.fy };
    if (inBox(f, 6)) return { cell: cellOf(c.t), box: true };
    if (c.t === "star") return overTree(p, 50) || (Math.abs(p.x) < 90 && p.y < TOP.y + 92 && p.y > TOP.y - 88) ? { top: true } : { cell: cellOf("star") };
    if (!overTree(p, 34)) return { cell: cellOf(c.t) };
    const s = nearSpot(p);
    return s >= 0 ? { spot: s } : { cell: cellOf(c.t) };
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
        else { launch(c.t, from, { cell: cellOf(c.t) }); boxWob = 1; sayFull(); }
      }
      else if (c.t === "star") { launch("star", from, { top: true, near: true }); }
      else { launch(c.t, from, { spot: c.o.s, near: true }); }
      return;
    }
    const tg = dropTarget(c);
    if (tg.spot != null) { ghost.learned("box"); launch(c.t, from, { spot: tg.spot, near: true }); }
    else if (tg.top) { ghost.learned("star"); launch("star", from, { top: true, near: true }); }
    else {
      launch(c.t, from, { cell: tg.cell });
      if (c.from === "tree") afterOrn();
      else if (c.t !== "star" && !freeSpots().length) sayFull();
    }
  }
  function swing(o, k) { o.swv += (o.sw > 0 ? 1 : -1) * (k || 2.4) + (Math.random() - 0.5); }

  // =====================================================================================================
  // Switch
  // =====================================================================================================
  // The lights' plug is in the wall socket from the start; the switch on the cord turns them on and changes the
  // pattern: each press goes Off, Steady, Twinkle, Slow fade, Off.
  const socketPt = () => ({ x: L.socket.x, y: L.socket.y - 10 });
  const lit = () => S.power > 0;
  function pressSwitch() {
    S.power = (S.power + 1) % POWER.length;
    if (S.power >= 2) S.modeTried = true;
    ctrlPress = 1;
    lastWant = null;
    const v = vp(L.ctrl.x, L.ctrl.y - 18);
    Toybox.nametag(POWER[S.power], v.x, v.y, 2000);
    ghost.learned(S.power >= 2 ? "ctrl2" : "ctrl");
    if (S.power === 1) {
      if (lightN()) {
        const c = tw(0, YT + (YB - YT) * 0.55);
        sparkle(c.x, c.y, 8, 110);
        Toybox.kind();
      } else coach.say("Drag the lights from the box onto the tree.", 3);
    }
    saveSoon();
  }

  // =====================================================================================================
  // Changing the tree
  // =====================================================================================================
  // A new shape: the strings glide from where they are to the same places relative to the new shape, each
  // ornament moves to the matching branch tip (one that does not fit hops back into the box), the star moves to
  // the new top and the tree pops (a calm little squash and settle).
  function setShape(id) {
    const sh = SHAPE_BY[id];
    if (!sh || sh === SH || locked()) return;
    const hooks = S.orns.map((o) => ({ x: SPOTS[o.s].x, y: SPOTS[o.s].y })), fracs = S.orns.map((o) => spotFrac(o.s)), top0 = topNow().y;
    const flyFr = fly.map((f) => (f.to.spot != null ? spotFrac(f.to.spot) : null));
    S.strands.forEach((sd) => { sd.mA = sd.a.map((p) => ({ x: p.x, y: p.y })); });
    useShape(sh);
    S.shape = id;
    const taken = new Set(), keep = [];
    S.orns.forEach((o, i) => {
      const s = fitSpot(fracs[i], taken);
      if (s < 0) { const w = tw(hooks[i].x, hooks[i].y); launch(o.t, { x: w.x, y: w.y, sc: L.tree.s }, { cell: cellOf(o.t) }); return; }
      taken.add(s); o.s = s; o.mf = hooks[i]; keep.push(o);
    });
    S.orns = keep;
    fly.forEach((f, i) => {
      if (!flyFr[i]) return;
      const s = fitSpot(flyFr[i], taken);
      if (s >= 0) { taken.add(s); f.to = { spot: s, near: f.to.near }; } else { const p = flyPos(f); f.x0 = p.x; f.y0 = p.y; f.sc0 = p.sc; f.to = { cell: cellOf(f.t) }; }
    });
    S.strands.forEach((sd) => { sd.mB = sd.r.map(fromRel); });
    if (live) live.raw = live.raw.map(onTree);
    const m = { p: 0, top0 };
    morph = m;
    tween(reduce ? 0.25 : 0.7, (p) => {
      m.p = p;
      const e = ease(p);
      S.strands.forEach((sd) => {
        if (!sd.mA || !sd.mB) return;
        sd.a = sd.mA.map((q, j) => ({ x: lerp(q.x, sd.mB[j].x, e), y: lerp(q.y, sd.mB[j].y, e) }));
        build(sd);
      });
    }, () => {
      if (morph === m) morph = null;
      S.strands.forEach((sd) => { if (sd.mB) { sd.a = sd.mB; build(sd); } delete sd.mA; delete sd.mB; });
      S.orns.forEach((o) => { delete o.mf; });
    });
    popTree();
    lastWant = null;
    refreshShapePics();
    saveSoon();
  }
  function popTree() {
    const pp = { p: 0 };
    pop = pp;
    tween(reduce ? 0.2 : 0.7, (p) => { pp.p = p; }, () => { if (pop === pp) pop = null; });
    const c = tw(0, YT + (YB - YT) * 0.5);
    sparkle(c.x, c.y, 8, 120 * L.tree.s, "#FFFFFF");
  }
  // A new color: the branches blend to it.
  function setTreeColor(id) {
    if (!TC_BY[id] || id === S.tc || locked()) return;
    const from = tcNow(), m = { from, p: 0 };
    tcMorph = m;
    S.tc = id;
    tween(reduce ? 0.2 : 0.6, (p) => { m.p = p; }, () => { if (tcMorph === m) tcMorph = null; });
    popTree();
    refreshShapePics();
    saveSoon();
  }
  // The tree's colors this frame.
  function tcNow() {
    const to = TC_BY[S.tc];
    if (!tcMorph) return to;
    const f = tcMorph.from, e = ease(tcMorph.p), mx = (a, b) => mixHex(a, b, e);
    return { fill: mx(f.fill, to.fill), shade: mx(f.shade, to.shade), tip: mx(f.tip, to.tip), flock: e > 0.5 ? to.flock : f.flock, shine: e > 0.5 ? to.shine : f.shine };
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
  function stk(col, lw) { ctx.lineWidth = lw / K; ctx.strokeStyle = col; ctx.stroke(); }
  // A stroke w units wide in the current frame (garland ropes are sized in tree units).
  function wide(col, w) { ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke(); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  const rgbOf = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  const rgba = (h, a) => "rgba(" + rgbOf(h).join(",") + "," + a + ")";
  function mixHex(a, b, t) {
    const x = rgbOf(a), y = rgbOf(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  function worldFrame() { ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy); K = 1; }
  // The tree's frame, swaying a little about its foot when the stand is bumped, and popping when it changes.
  function treeFrame() {
    worldFrame();
    const T = L.tree;
    ctx.translate(T.x, T.y); ctx.scale(T.s, T.s);
    if (sway) { ctx.translate(0, 450); ctx.rotate(sway); ctx.translate(0, -450); }
    let k = 1;
    if (pop) { k = 0.9 + 0.1 * backOut(pop.p); ctx.translate(0, 452); ctx.scale(k, k); ctx.translate(0, -452); }
    K = T.s * k;
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
  // A small picture for a tile, drawn with the scene's own drawing code on a 96 px canvas.
  function picCanvas(fn) {
    return () => {
      const c = document.createElement("canvas");
      c.width = 96; c.height = 96;
      const old = ctx, oldK = K;
      ctx = c.getContext("2d");
      try { fn(); } finally { ctx = old; K = oldK; }
      return c;
    };
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
    rr(w.x + 4, w.y + 4, w.w - 8, w.h - 8, 3); stk(INK, 1.6);
    rr(w.x - 10, w.y + w.h + 2, w.w + 20, 10, 4); fs("#FFF8EC");
    if (sill > 0.02) { rr(w.x - 6, w.y + w.h + 2 - 6 * sill, w.w + 12, 6 * sill + 2, 4); ctx.fillStyle = "#FFFFFF"; ctx.fill(); }
  }
  function drawWreath() {
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
  // The wall socket with the lights' plug pushed into its upper outlet.
  function drawSocket() {
    const s = L.socket;
    rr(s.x - 15, s.y - 24, 30, 48, 5); fs("#FFFDF6");
    [-10, 10].forEach((oy) => {
      rr(s.x - 9, s.y + oy - 7, 18, 14, 5); fs("#F1EADB", 1.4);
      ctx.fillStyle = INK; ctx.fillRect(s.x - 5, s.y + oy - 4, 2, 5); ctx.fillRect(s.x + 3, s.y + oy - 4, 2, 5);
      ell(s.x, s.y + oy + 4, 1.6, 1.4); ctx.fill();
    });
  }
  function drawPlug() {
    const p = socketPt();
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.sin(plugWob * 16) * plugWob * 0.08);
    rr(-10, -12, 20, 25, 6); fs("#F7F6F0");
    ctx.beginPath(); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); ctx.moveTo(-6, 8); ctx.lineTo(6, 8); stk("#B8BCC6", 1.6);
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing the tree, strings, ornaments and star
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
  // The tree: its tiers in its colors (tc), with the stand and trunk, and the skirt on the floor (skirt).
  function drawTree(tiers, tc, skirt) {
    if (skirt) {
      ell(0, 452, 154, 22); fs("#FFFFFF");
      ell(0, 450, 140, 16); ctx.fillStyle = "#C8333A"; ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(-40, 420); ctx.lineTo(40, 420); ctx.lineTo(54, 452); ctx.lineTo(-54, 452); ctx.closePath(); fs("#2F6F48");
    rr(-46, 414, 92, 12, 4); fs("#3E8A5C");
    rr(-13, 386, 26, 32, 3); fs("#8A5A33");
    // The tiers, bottom first so each upper tier lies over the one below; the upper tier's shadow darkens
    // the top of the one below.
    for (let i = tiers.length - 1; i >= 0; i--) {
      const T = tiers[i];
      tierPath(T); ctx.fillStyle = tc.fill; ctx.fill();
      if (i > 0) {
        ctx.save(); tierPath(T); ctx.clip();
        ctx.translate(0, 12); tierPath(tiers[i - 1]); ctx.fillStyle = tc.shade; ctx.fill();
        ctx.restore();
      }
      const y1 = T.yb - 10;
      // A flocked tree shows a little green under the snow along each tier.
      if (tc.flock) {
        for (let j = 0; j < T.n; j++) {
          const x0 = -T.wb + 2 * T.wb * j / T.n, x1 = -T.wb + 2 * T.wb * (j + 1) / T.n, mx = (x0 + x1) / 2;
          ctx.beginPath(); ctx.moveTo(mx - 9, y1 - 14); ctx.lineTo(mx - 3, y1 - 8); ctx.moveTo(mx + 6, y1 - 18); ctx.lineTo(mx + 11, y1 - 11);
          ctx.lineCap = "round"; stk(tc.flock, 3 * K);
        }
      }
      // Lighter needles along each branch tip.
      for (let j = 0; j < T.n; j++) {
        const x0 = -T.wb + 2 * T.wb * j / T.n, x1 = -T.wb + 2 * T.wb * (j + 1) / T.n;
        ctx.beginPath(); ctx.moveTo(x0 + 8, y1 - 2); ctx.quadraticCurveTo((x0 + x1) / 2, T.yb + 3, x1 - 8, y1 - 2);
        stk(tc.tip, 3 * K);
      }
      // A silver tree has bright streaks of foil.
      if (tc.shine) {
        ctx.beginPath();
        for (let j = 0; j < T.n + 1; j++) { const x = -T.wb * 0.7 + 1.4 * T.wb * j / Math.max(1, T.n); ctx.moveTo(x * 0.6, lerp(T.yt, y1, 0.35)); ctx.lineTo(x * 0.85, lerp(T.yt, y1, 0.75)); }
        ctx.lineCap = "round"; stk("#FFFFFF", 2.2 * K);
      }
      tierPath(T); stk(INK, LW);
    }
  }
  // Brightness of a lit bulb (0..1): the switch's pattern, or the surprise chase.
  function bright(b, si, gi, t) {
    if (actor && actor.kind === "chase") {
      const c = Math.cos(gi * 0.42 - (t - actor.t0) * (reduce ? 1.2 : 2.4));
      return 0.1 + 0.9 * Math.pow(Math.max(0, c), 2);
    }
    const m = POWER_ID[S.power], amp = reduce ? 0.5 : 1;
    if (m === "twinkle") return 1 - amp * 0.42 * (0.5 + 0.5 * Math.sin(t * b.w + b.ph));
    if (m === "fade") return 1 - amp * 0.62 * (0.5 + 0.5 * Math.sin(t * 1.3 + si * 0.9));
    return 1;
  }
  // The path of a string's wire up to length lim.
  function polyPath(poly, lim) {
    ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length && poly[i - 1].d < lim; i++) {
      if (poly[i].d <= lim) ctx.lineTo(poly[i].x, poly[i].y);
      else { const p = along(poly, lim); ctx.lineTo(p.x, p.y); }
    }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
  }
  // A light string's wire and its bulbs (in the tree's frame). on: how far the lights are on (0..1).
  function drawLights(sd, on, alpha) {
    const lim = sd.len * (sd.grow == null ? 1 : sd.grow), poly = sd.poly;
    if (!poly || poly.length < 2) return;
    ctx.globalAlpha = alpha;
    polyPath(poly, lim);
    stk("#173B26", 2.4 * K);
    for (const b of sd.b) {
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
  // A garland along its wire (in the tree's frame). Tinsel glints now and then, more while the lights are on.
  function drawGarland(sd, on, t, alpha) {
    const G = GAR_BY[sd.c] || GARLANDS[0], lim = sd.len * (sd.grow == null ? 1 : sd.grow), poly = sd.poly, cols = G.cols;
    if (!poly || poly.length < 2) return;
    ctx.globalAlpha = alpha;
    const ink = 2 * LW / K;
    if (G.kind === "tinsel") {
      polyPath(poly, lim); wide(INK, 8 + ink); wide(cols[1], 8);
      // The fringe: short strands every way, in three shades.
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        for (const b of sd.b) {
          if (b.d > lim) break;
          if (b.i % 3 !== c) continue;
          const a = b.h * TAU, l = 4.5 + b.h2 * 4;
          ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a) * l, b.y + Math.sin(a) * l);
        }
        ctx.lineCap = "round"; wide(c === 1 ? cols[1] : c === 2 ? cols[2] : cols[0], c === 2 ? 1.4 : 1.8);
      }
      const amp = (0.45 + 0.55 * on) * (reduce ? 0.6 : 1);
      for (const b of sd.b) {
        if (b.d > lim) break;
        if (b.i % 9) continue;
        const s = Math.sin(t * (1.1 + b.h2) + b.h * TAU * 3);
        if (s > 0.55) twinkle4(b.x + Math.cos(b.h * TAU) * 3, b.y + Math.sin(b.h * TAU) * 3, (s - 0.55) * 13 * amp, "#FFFFFF");
      }
    } else if (G.kind === "ribbon") {
      polyPath(poly, lim); wide(INK, 10 + ink); wide(cols[1], 10); wide(cols[0], 6.4);
      ctx.setLineDash([5, 9]); wide("#FF8593", 2.2); ctx.setLineDash([]);
    } else {
      polyPath(poly, lim); wide(G.kind === "popcorn" ? "#B9A57E" : "#7C5A1E", 1.1);
      for (const b of sd.b) {
        if (b.d > lim) break;
        if (G.kind === "beads") {
          const big = b.i % 2 === 0;
          ell(b.x, b.y, big ? 3.6 : 2.6, big ? 3.6 : 2.6); fs(cols[b.i % 4 < 2 ? 0 : 1], 1.1);
          ell(b.x - 1, b.y - 1.2, 1, 1); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fill();
        } else if (G.kind === "berries") {
          ell(b.x, b.y + 0.8, 3.5, 3.5); fs(cols[0], 1.1);
          ell(b.x - 1.1, b.y - 0.4, 1.1, 0.9); ctx.fillStyle = "rgba(255,190,196,0.9)"; ctx.fill();
        } else if (G.kind === "popcorn") {
          const r = b.h * TAU;
          [[0, 0, 3], [2.6, -1.4, 2.4], [-2.2, 1.6, 2.3]].forEach(([dx, dy, rad]) => {
            const x = b.x + dx * Math.cos(r) - dy * Math.sin(r), y = b.y + 1 + dx * Math.sin(r) + dy * Math.cos(r);
            ell(x, y, rad, rad); fs(cols[0], 1);
          });
        } else if (G.kind === "chain") {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang);
          const col = cols[Math.floor(b.i / 2) % 3];
          if (b.i % 2 === 0) { ell(0, 0, 6.4, 4.2); wide(INK, 3 + ink); wide(col, 3); }
          else { ell(0, 0, 6.2, 1.8); fs(col, 1.1); }
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawString(sd, on, t, alpha) {
    if (sd.wig > 0) { ctx.save(); ctx.translate(0, Math.sin(sd.wig * 20) * sd.wig * 3); }
    if (sd.k === "g") drawGarland(sd, on, t, alpha); else drawLights(sd, on, alpha);
    if (sd.wig > 0) ctx.restore();
  }
  // The loose bit of string paying out from the coil to the tip of a wrap that is still winding on.
  function tailOf(sd) {
    const tip = along(sd.poly, sd.len * sd.grow);
    if (!sd._t) sd._t = { k: sd.k, c: sd.c, seed: sd.seed + 5 };
    sd._t.a = [coilTreePt(sd.k), { x: tip.x, y: tip.y, loose: true }];
    return build(sd._t);
  }
  // Works out each bulb's brightness for this frame (b.k) so the bulb and its glow agree.
  function lightLevels(t) {
    let gi = 0;
    const each = (sd, si) => { if (sd.k === "l") sd.b.forEach((b) => { b.k = bright(b, si, gi++, t); }); };
    S.strands.forEach(each);
    if (live) each(live, S.strands.length);
    if (pull) each(pull.sd, 0);
    winding.forEach((w) => each(w.sd, 0));
    fading.forEach((f) => each(f.s, 0));
  }
  function glowsOf(sd, on, a) {
    if (sd.k !== "l") return;
    const lim = sd.len * (sd.grow == null ? 1 : sd.grow), R = 17;
    for (const b of sd.b) {
      if (b.d > lim) break;
      ctx.globalAlpha = Math.min(1, on * a * b.k * 0.85);
      const gx = b.x - Math.sin(b.tilt) * 7, gy = b.y + Math.cos(b.tilt) * 7;
      ctx.drawImage(glow(b.col), gx - R, gy - R, R * 2, R * 2);
    }
  }
  // Glows of everything on the tree (the tree's frame). Strings in his hand glow later, with him.
  function drawGlows(on, t) {
    if (on <= 0.01) return;
    ctx.globalCompositeOperation = "lighter";
    S.strands.forEach((sd) => glowsOf(sd, on, 1));
    fading.forEach((f) => glowsOf(f.s, on, f.a));
    if (S.star) {
      const k = POWER_ID[S.power] === "fade" && !reduce ? 0.85 + 0.15 * Math.sin(t * 1.3) : 1, tp = topNow();
      ctx.globalAlpha = on * 0.9 * k;
      ctx.drawImage(glow("#FFD23B"), tp.x - 70, tp.y + 28 - 70, 140, 140);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  // One ornament, hook at (x, y) in the current frame, scaled by sc and swung by sw.
  function drawOrn(id, x, y, sc, sw) {
    const o = ORN_BY[id];
    ctx.save(); ctx.translate(x, y); if (sw) ctx.rotate(sw); ctx.scale(sc, sc);
    const k0 = K; K *= sc;
    const string = (len) => { ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, len); stk("#C9A227", 1.6); };
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
      ctx.beginPath(); ctx.moveTo(-5, 14); ctx.quadraticCurveTo(-7, 22, -8, 28); stk("rgba(255,255,255,0.7)", 2);
      ell(-5, 7, 5, 3); fs("#E8303F", 1.4); ell(5, 7, 5, 3); fs("#E8303F", 1.4); ell(0, 7, 2.4, 2.4); fs("#E8303F", 1.4);
    } else if (o.kind === "cane") {
      ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(0, 10); ctx.arc(7, 10, 7, Math.PI, 0); ctx.lineTo(14, 18);
      ctx.lineCap = "round"; stk(INK, 10); stk("#FFFFFF", 7);
      ctx.setLineDash([4.5, 4.5]); stk("#E8303F", 7); ctx.setLineDash([]);
    } else if (o.kind === "cone") {
      string(8);
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(14, 11, 13, 32, 0, 42); ctx.bezierCurveTo(-13, 32, -14, 11, 0, 9); ctx.closePath(); fs("#A0612F");
      ctx.save(); ctx.clip();
      for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) {
        const yy = 14 + r * 6, xx = c * 6 + (r % 2 ? 3 : 0);
        ctx.beginPath(); ctx.arc(xx, yy, 4, 0.15 * Math.PI, 0.85 * Math.PI); stk("#6E3E1C", 1.6);
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
      ctx.lineCap = "round"; stk(INK, 5.4); stk("#FFFFFF", 3);
      ell(0, 0, 3, 3); ctx.fillStyle = "#DDF1FF"; ctx.fill();
      ctx.restore();
    } else if (o.kind === "icicle") {
      string(6);
      ctx.beginPath(); ctx.moveTo(-7, 7); ctx.lineTo(7, 7); ctx.quadraticCurveTo(5, 20, 3, 30); ctx.quadraticCurveTo(1.5, 42, 0, 48);
      ctx.quadraticCurveTo(-1.5, 42, -3, 30); ctx.quadraticCurveTo(-5, 20, -7, 7); ctx.closePath(); fs("#BFE9FF");
      ctx.beginPath(); ctx.moveTo(-2.5, 11); ctx.quadraticCurveTo(-2.5, 24, -1, 36); stk("#FFFFFF", 2);
    } else if (o.kind === "star") {
      star5(0, 28, 28, 12); fs("#FFD23B");
      star5(0, 28, 17, 7.5); ctx.fillStyle = "#FFE98A"; ctx.fill();
    }
    K = k0;
    ctx.restore();
  }
  function drawOrnaments() {
    S.orns.forEach((o) => {
      const h = ornHook(o);
      drawOrn(o.t, h.x, h.y, 1, o.sw);
      if (o.sp > 0) {
        const m = ornMid(o), d = ORN_BY[o.t], s = Math.sin(o.sp * Math.PI) * 9;
        twinkle4(m.x + d.r * 0.55, m.y - d.r * 0.55, s, "#FFFFFF");
      }
    });
    if (S.star) { const tp = topNow(); drawOrn("star", tp.x, tp.y, 1, Math.sin(starWob * 12) * starWob * 0.15); }
  }

  // =====================================================================================================
  // Drawing the boxes, coils, cord, switch and train
  // =====================================================================================================
  function cellAt(w) {
    for (let k = 0; k < CELLS.length; k++) { const c = cellRect(k); if (w.x >= c.x && w.x < c.x + c.w && w.y >= c.y - 6 && w.y < c.y + c.h + 4) return k; }
    return -1;
  }
  // A soft warm glow round a box while something can be dropped into it.
  // (Drawn over the dimmed room, so it shows when the lights are on too.)
  function hotGlow(x, y, w, h, hot) {
    if (hot < 0.02) return;
    ctx.save();
    ctx.shadowColor = "rgba(255,214,80," + (0.95 * hot).toFixed(3) + ")"; ctx.shadowBlur = 30 * hot * vs * dpr;
    rr(x - 3, y - 3, w + 6, h + 6, 11);
    ctx.lineWidth = 5; ctx.strokeStyle = rgba("#FFE38A", hot); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = rgba("#FFFFFF", 0.8 * hot); ctx.stroke();
    ctx.restore();
  }
  function drawBox() {
    const B = L.box, hot = boxHot;
    ctx.save();
    if (boxWob > 0) { const a = Math.sin(boxWob * 16) * boxWob * 0.03; ctx.translate(B.x + B.w / 2, B.y + B.h); ctx.scale(1 + a, 1 - a); ctx.translate(-B.x - B.w / 2, -B.y - B.h); }
    // The open lid leans behind the box; it lifts up while something is carried over the box.
    const lift = 16 + hot * 14;
    ctx.beginPath(); ctx.moveTo(B.x + 10, B.y); ctx.lineTo(B.x + 22 - hot * 8, B.y - lift); ctx.lineTo(B.x + B.w - 22 + hot * 8, B.y - lift); ctx.lineTo(B.x + B.w - 10, B.y); ctx.closePath(); fs("#E8B67A");
    rr(B.x, B.y, B.w, B.h, 8); fs("#D9A066");
    rr(B.x + 6, B.y + 6, B.w - 12, B.h * 0.78 - 4, 6); fs("#F4DDB4", 2);
    for (let k = 0; k < CELLS.length; k++) {
      const c = cellRect(k);
      rr(c.x + 2, c.y + 2, c.w - 4, c.h - 4, 6); ctx.fillStyle = "#E9C893"; ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(B.x + 4, B.y + B.h * 0.78 + 4); ctx.lineTo(B.x + B.w - 4, B.y + B.h * 0.78 + 4); stk("#B98450", 2);
    // A red ribbon round the front of the box.
    rr(B.x + B.w / 2 - 9, B.y + B.h * 0.78 + 4, 18, B.h * 0.22 - 4, 2); ctx.fillStyle = "#C8333A"; ctx.fill();
    rr(B.x, B.y, B.w, B.h, 8); stk(INK, LW);
    ctx.restore();
    const tt = now();
    CELLS.forEach((id, k) => {
      if (!cellHas(k)) return;
      const h = cellHook(k), age = tt - takenAt[k];
      // A new one comes up from the bottom of the box after one is taken.
      const a = age < 0.5 ? 0 : age < 0.9 ? (age - 0.5) / 0.4 : 1;
      if (a <= 0) return;
      ctx.globalAlpha = a;
      drawOrn(id, h.x, h.y + (1 - a) * 8, h.sc, 0);
      ctx.globalAlpha = 1;
    });
  }
  // The coils lying in the lights box: a pseudo-string wound round in a flat spiral (coil units, about tree
  // units), rebuilt when the pick changes.
  const coilCache = { l: null, g: null };
  function coilStrand(k) {
    const c = k === "l" ? S.color : S.gar, cc = coilCache[k];
    if (cc && cc.c === c) return cc;
    const a = [], N = 46, loops = 2.6;
    for (let i = 0; i <= N; i++) {
      const f = i / N, ang = Math.PI * 0.9 + f * loops * TAU, R = COIL_R - 12 * f;
      a.push({ x: Math.cos(ang) * R, y: Math.sin(ang) * R * 0.42 - f * 7 });
    }
    coilCache[k] = build({ k, c, a, flat: true, seed: k === "l" ? 2 : 3 });
    return coilCache[k];
  }
  function drawCoil(k, t) {
    const c = coilPos(k), s = coilS(), wb = coilWob[k], sq = 1 + Math.sin(wb * 14) * wb * 0.08;
    worldFrame();
    ctx.translate(c.x, c.y); ctx.scale(s * sq, s / sq);
    K = s;
    ell(0, 4, COIL_R + 4, (COIL_R + 4) * 0.42); ctx.fillStyle = "rgba(60,30,10,0.22)"; ctx.fill();
    const sd = coilStrand(k);
    if (k === "l") drawLights(sd, 0, 1); else drawGarland(sd, 0, t, 1);
    worldFrame();
  }
  // The lights box: a low open box with the lights coil and the garland coil lying in it.
  function drawTray(t) {
    const T = L.tray, fy = T.y + T.h * 0.6;
    ctx.save();
    if (trayWob > 0) { const a = Math.sin(trayWob * 16) * trayWob * 0.03; ctx.translate(T.x + T.w / 2, T.y + T.h); ctx.scale(1 + a, 1 - a); ctx.translate(-T.x - T.w / 2, -T.y - T.h); }
    rr(T.x, T.y, T.w, T.h, 8); fs("#D9A066");
    rr(T.x + 6, T.y + 6, T.w - 12, fy - T.y, 6); ctx.fillStyle = "#B9844E"; ctx.fill();
    ctx.restore();
    drawCoil("l", t); drawCoil("g", t);
    // The low front of the box, in front of the coils.
    ctx.save();
    if (trayWob > 0) { const a = Math.sin(trayWob * 16) * trayWob * 0.03; ctx.translate(T.x + T.w / 2, T.y + T.h); ctx.scale(1 + a, 1 - a); ctx.translate(-T.x - T.w / 2, -T.y - T.h); }
    rr(T.x, fy, T.w, T.y + T.h - fy, 8); fs("#E2AE72");
    ctx.beginPath(); ctx.moveTo(T.x + T.w / 2, fy + 2); ctx.lineTo(T.x + T.w / 2, T.y + T.h - 2); stk("#C08A52", 2);
    rr(T.x, T.y, T.w, T.h, 8); stk(INK, LW);
    ctx.restore();
  }
  // The cord: from the tree stand to the switch, then up to the plug in the wall socket.
  function drawCord() {
    const a = tw(48, 446), c = L.ctrl, p = socketPt(), tail = { x: p.x, y: p.y + 13 };
    ctx.lineCap = "round";
    const path = (fn) => { ctx.beginPath(); fn(); stk(INK, 6); stk("#2C6B3F", 3.4); };
    path(() => { ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x + 24, a.y + 10, c.x - 44, c.y + 8, c.x - 22, c.y); });
    path(() => { ctx.moveTo(c.x + 22, c.y); ctx.bezierCurveTo(c.x + 44, c.y + 6, tail.x, Math.max(tail.y + 44, c.y + 6), tail.x, tail.y); });
  }
  function drawCtrl() {
    const c = L.ctrl, pr = ctrlPress > 0 ? 1.6 * ctrlPress : 0;
    rr(c.x - 22, c.y - 14, 44, 28, 9); fs("#2C6B3F");
    ell(c.x + 7, c.y + pr * 0.5, 9, 9); fs("#F6F4EE", 1.8);
    ell(c.x - 11, c.y, 3.2, 3.2); ctx.fillStyle = lit() ? "#7CFF8A" : "#1C4A2C"; ctx.fill();
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
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 5, y - 7 + Math.sin(a) * 5); ctx.lineTo(x - Math.cos(a) * 5, y - 7 - Math.sin(a) * 5); stk("#F4F4F4", 1.4);
    };
    // Two wagons, then the engine at the front (on the right).
    rr(x0, y - 30, 46, 20, 3); fs("#3DAA68"); wheel(x0 + 10); wheel(x0 + 36);
    rr(x0 + 52, y - 30, 46, 20, 3); fs("#FFD23B");
    rr(x0 + 62, y - 42, 16, 13, 2); fs("#E8303F"); ctx.beginPath(); ctx.moveTo(x0 + 70, y - 42); ctx.lineTo(x0 + 70, y - 29); stk("#FFD23B", 2);
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
  // The next part: the lights coil, the switch, the garland coil, ornaments, the star, the switch again; then
  // nothing.
  function want() {
    if (!lightN() && !(live && live.k === "l")) return { part: "coill", line: "Drag the lights from the box onto the tree." };
    if (!S.power) return { part: "ctrl", line: "Press the switch to turn on the lights." };
    if (!garN() && !(live && live.k === "g")) return { part: "coilg", line: "Drag the garland from the box onto the tree." };
    if (S.orns.length < 3) return { part: "box", line: "Drag ornaments from the box onto the tree." };
    if (!S.star) return { part: "starcell", line: "Put the star on top of the tree." };
    if (!S.modeTried) return { part: "ctrl2", line: "Press the switch to make the lights twinkle." };
    return null;
  }
  // A part's middle (world) and size, for the ring, the coach and the ghost hand.
  function partPt(part) {
    if (part === "tree") { const w = tw(0, YT + (YB - YT) * 0.6); return { x: w.x, y: w.y, r: 100 * L.tree.s }; }
    if (part === "coill" || part === "coilg") { const c = coilPos(part.slice(4)); return { x: c.x, y: c.y - 4, r: (COIL_R + 4) * coilS() }; }
    if (part === "ctrl" || part === "ctrl2") return { x: L.ctrl.x, y: L.ctrl.y, r: 26 };
    if (part === "socket" || part === "plug") return { x: L.socket.x, y: L.socket.y, r: 26 };
    if (part === "box") return { x: L.box.x + L.box.w / 2, y: L.box.y + L.box.h / 2, r: L.box.w / 2 };
    if (part === "tray") return { x: L.tray.x + L.tray.w / 2, y: L.tray.y + L.tray.h / 2, r: L.tray.w / 2 };
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
    } else { const p = partPt(w.part); if (p) ring(p.x, p.y, p.r); }
  }
  const coach = Toybox.coach($("coach"));
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if (drag || carry) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    // For a coil the pill keeps clear of the tree's middle, where he drags the string across.
    const p = w.part === "coill" || w.part === "coilg" ? (() => { const q = tw(0, YT + (YB - YT) * DRAG_V); return { x: q.x, y: q.y }; })() : partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  const DRAG_V = 0.64;
  function hint() { const w = want(); if (w) { coach.say(w.line, 3); ghost.poke(); } }
  // The ghost hand shows the real move: a drag from the coil across the tree, from the box to a branch, from the
  // box to the top; a tap on the switch.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag || carry) return null;
      const w = want();
      if (!w) return null;
      const key = w.part === "starcell" ? "star" : w.part, first = ghost.shown(key) < 1;
      const P2 = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const T2 = (x, y) => { const v = tvp(x, y); return [v.x, v.y]; };
      if (w.part === "coill" || w.part === "coilg") {
        const c = partPt(w.part), y = YT + (YB - YT) * DRAG_V, hw = hwAt(y) - 14;
        return { pts: [P2(c.x, c.y), T2(hw, y - 6), T2(hw * 0.2, y + 12), T2(-hw, y + 2)], dur: 2400, key };
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
  // The part under a press (client px). The things he works with (the switch, the coils, the boxes, the
  // ornaments, the star, the hung strings) come before the tree behind them; everything drawn answers.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 24 / vs, p = tl(w.x, w.y);
    const near = (q, r) => Math.hypot(w.x - q.x, w.y - q.y) <= Math.max(r, minR);
    if (near(L.ctrl, 28)) return "ctrl";
    for (const k of ["l", "g"]) { const c = coilPos(k); if (Math.abs(w.x - c.x) <= Math.max((COIL_R + 8) * coilS(), minR) && Math.abs(w.y - c.y + 4) <= Math.max(26 * coilS(), minR)) return "coil" + k; }
    if (inTray(w, 2)) return "tray";
    if (inBox(w, 4)) { const k = cellAt(w); return k >= 0 && cellHas(k) ? "cell" + k : "box"; }
    if (S.star && !morph && Math.hypot(p.x - TOP.x, p.y - (TOP.y + 28)) < 34) return "star";
    for (let i = S.orns.length - 1; i >= 0; i--) {
      const o = S.orns[i], m = ornMid(o);
      if (Math.hypot(p.x - m.x, p.y - m.y) < ORN_BY[o.t].r + 5) return "orn" + i;
    }
    if (!morph) { const si = strandAt(p, Math.max(8, 14 / (vs * L.tree.s))); if (si >= 0) return "str" + si; }
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
  // A tap on the bare tree rustles the branches (the ornaments swing) and says which tree it is.
  function treeTap(p) {
    swayV += 0.035;
    S.orns.forEach((o) => swing(o, 1.4));
    const w = tw(p.x, p.y);
    tag(TC_BY[S.tc].tag, w.x, w.y);
    if (!lightN()) hint();
  }
  // A tap: each part does its own one motion.
  function doTap(part, cx, cy) {
    if (locked() || part == null) return;
    if (part === "tree") { const w = wpt(cx, cy); treeTap(tl(w.x, w.y)); }
    else if (part === "coill" || part === "coilg") coilTap(part.slice(4));
    else if (/^str\d+$/.test(part)) {
      const sd = S.strands[+part.slice(3)];
      if (!sd) return;
      sd.wig = 1;
      const w = wpt(cx, cy);
      tag(strandName(sd), w.x, w.y - 8);
    }
    else if (/^cell\d$/.test(part)) hopFromBox(+part.slice(4));
    else if (part === "box") { boxWob = 1; tag("Ornament box", L.box.x + L.box.w / 2, L.box.y - 10); }
    else if (part === "tray") { trayWob = 1; tag("Lights box", L.tray.x + L.tray.w / 2, L.tray.y - 6); }
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
    } else if (part === "socket") { plugWob = 1; tag("Plug", L.socket.x, L.socket.y - 26); }
    else if (part === "ctrl") pressSwitch();
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
      if (drag.k === "live") liveMove(w);
      else if (drag.k === "carry" && carry) { carry.x = w.x + drag.ox; carry.y = w.y + drag.oy; carry.fx = w.x; carry.fy = w.y; }
      else if (drag.k === "pull" && pull) pullMove(w);
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null; skipTap = !!s.tap;
      const still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (locked()) { live = null; if (carry) dropCarry(true); if (pull) pullEnd(true); return; }
      if (d.k === "hold") { if (still) doTap(d.part, s.x, s.y); }
      else if (d.k === "live") liveEnd(still, d.far);
      else if (d.k === "carry") dropCarry(still);
      else if (d.k === "pull") { if (still) { pullEnd(true); doTap(d.part, s.x, s.y); } else pullEnd(false); }
    },
    tap: (part, x, y) => {
      if (skipTap) { skipTap = false; return; }
      if (!drag) doTap(part, x, y);
    }
  });
  // Starts the drag for a part (sets drag) when the part has one.
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0);
    if (part === "coill" || part === "coilg") {
      drag = { k: "live" };
      coilWob[part.slice(4)] = 0.6;
      liveStart(part.slice(4), true, w0); liveMove(w);
    } else if (part === "tree") {
      drag = { k: "live" };
      liveStart(S.lastKind, false, w0); liveMove(w);
    } else if (/^str\d+$/.test(part)) {
      drag = { k: "pull", part };
      pullStart(+part.slice(3), w0, w);
    } else if (/^cell\d$/.test(part)) {
      const k = +part.slice(4), h = cellHook(k);
      carry = { t: CELLS[k], from: "box", x: h.x, y: h.y, fx: w.x, fy: w.y };
      takenAt[k] = now();
      // He holds it by its hook: it hangs from just above his fingertip.
      drag = { k: "carry", ox: 0, oy: -ORN_BY[CELLS[k]].cy * L.tree.s - 6 };
      carry.x = w.x + drag.ox; carry.y = w.y + drag.oy;
    } else if (/^orn\d+$/.test(part)) {
      const i = +part.slice(3), o = S.orns[i];
      if (!o) return;
      S.orns.splice(i, 1);
      const h = tw(SPOTS[o.s].x, SPOTS[o.s].y);
      carry = { t: o.t, from: "tree", o, x: h.x, y: h.y, fx: w.x, fy: w.y };
      drag = { k: "carry", ox: h.x - w0.x, oy: h.y - w0.y };
      carry.x = w.x + drag.ox; carry.y = w.y + drag.oy;
    } else if (part === "star") {
      S.star = false;
      const h = tw(TOP.x, TOP.y);
      carry = { t: "star", from: "tree", x: h.x, y: h.y, fx: w.x, fy: w.y };
      drag = { k: "carry", ox: h.x - w0.x, oy: h.y - w0.y };
      carry.x = w.x + drag.ox; carry.y = w.y + drag.oy;
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
  // A tree tile: the whole tree (no skirt) scaled into the tile, so a Little tree looks little.
  const treePic = (sh, tc) => picCanvas(() => {
    const s = 0.2;
    ctx.translate(48, 4); ctx.scale(s, s);
    K = LW * s / 4.6;
    drawTree(sh.tiers, tc, false);
  });
  // A garland tile: two swags of it.
  const garPic = (g) => picCanvas(() => {
    ctx.translate(48, 36); ctx.scale(2.7, 2.7);
    K = LW * 2.7 / 4.4;
    const sd = build({ k: "g", c: g.id, a: [{ x: -15, y: -6 }, { x: 0, y: -6 }, { x: 15, y: -6 }], seed: 4 });
    drawGarland(sd, 0, 1.3, 1);
  });
  const JOB_PICS = {
    tree: '<svg viewBox="0 0 50 50"><path d="M25 4 37 19h-5l9 13h-6l9 12H6l9-12H9l9-13h-5z" fill="#2E9A57" stroke="#1D2340" stroke-width="2.4" stroke-linejoin="round"/><path d="M21 44h8v4h-8z" fill="#8A5A33" stroke="#1D2340" stroke-width="2"/></svg>',
    lights: bulbPic(["#FF4A4A", "#3FD16A", "#3D8BFF", "#FFD23B"]),
    garland: '<svg viewBox="0 0 50 50"><path d="M4 16Q14 36 25 22 36 36 46 16" fill="none" stroke="#1D2340" stroke-width="10" stroke-linecap="round"/><path d="M4 16Q14 36 25 22 36 36 46 16" fill="none" stroke="#FFC93C" stroke-width="6.5" stroke-linecap="round"/><path d="M4 16Q14 36 25 22 36 36 46 16" fill="none" stroke="#FFF1A6" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/></svg>'
  };
  const shapeTiles = Toybox.tiles($("shapes"), { items: [], value: S.shape, rows: 1, onPick: (id) => setShape(id) });
  function refreshShapePics() {
    shapeTiles.items(SHAPES.map((sh) => ({ id: sh.id, name: sh.name, pic: treePic(sh, TC_BY[S.tc]) })));
    shapeTiles.set(S.shape);
  }
  const tcTiles = Toybox.tiles($("tcols"), {
    items: TCOLS.map((c) => ({ id: c.id, name: c.name, pic: treePic(SHAPE_BY.classic, c) })), value: S.tc, rows: 1,
    onPick: (id) => setTreeColor(id)
  });
  const lightTiles = Toybox.tiles($("lights"), {
    items: LIGHTS.map((l) => ({ id: l.id, name: l.name, pic: bulbPic(l.id === "colors" ? ["#FF4A4A", "#3FD16A", "#3D8BFF", "#FFD23B"] : l.cols) })),
    value: S.color, rows: 2, onPick: (id) => pickColor(id)
  });
  const garTiles = Toybox.tiles($("garlands"), {
    items: GARLANDS.map((g) => ({ id: g.id, name: g.name, pic: garPic(g) })), value: S.gar, rows: 2,
    onPick: (id) => pickGarland(id)
  });
  // Picking lights or a garland changes its coil in the lights box (the coil bobs) and says what to do with it.
  function pickColor(id) {
    if (!LIGHT_BY[id] || locked()) return;
    S.color = id; S.lastKind = "l";
    coilWob.l = 1;
    const c = coilPos("l"); sparkle(c.x, c.y - 10, 4, 18);
    coach.say("Drag the " + LIGHT_BY[id].name.toLowerCase() + " lights from the box onto the tree.", 3);
    ghost.again("coill");
    saveSoon();
  }
  function pickGarland(id) {
    if (!GAR_BY[id] || locked()) return;
    S.gar = id; S.lastKind = "g";
    coilWob.g = 1;
    const c = coilPos("g"); sparkle(c.x, c.y - 10, 4, 18);
    coach.say("Drag the " + GAR_BY[id].name.toLowerCase() + " from the box onto the tree.", 3);
    ghost.again("coilg");
    saveSoon();
  }
  const jobs = Toybox.jobs($("jobs"), {
    jobs: [{ id: "tree", name: "Tree", pic: JOB_PICS.tree }, { id: "lights", name: "Lights", pic: JOB_PICS.lights }, { id: "garland", name: "Garland", pic: JOB_PICS.garland }],
    value: S.tab,
    onPick: (id) => pickTab(id)
  });
  function showTab() {
    $("grp-tree").hidden = S.tab !== "tree";
    $("grp-lights").hidden = S.tab !== "lights";
    $("grp-garland").hidden = S.tab !== "garland";
  }
  function pickTab(id) {
    S.tab = id;
    if (id === "lights") S.lastKind = "l";
    else if (id === "garland") S.lastKind = "g";
    showTab();
    saveSoon();
  }
  // New: a bare tree again. The strings wind back into their coils, the ornaments hop back into the box and the
  // lights switch off. The tree's shape and color and the picks stay.
  function newTree() {
    if (locked()) return;
    drag = null; press.cancel();
    if (live) { const lv = live; live = null; windBack(lv); }
    if (pull) { const pl = pull; pull = null; windBack(pl.sd, pullFrom(pl)); }
    if (carry) { const c = carry; carry = null; launch(c.t, { x: c.x, y: c.y, sc: L.tree.s }, { cell: cellOf(c.t) }); }
    fly.forEach((f) => { if (f.to.spot != null || f.to.top) { const p = flyPos(f); f.x0 = p.x; f.y0 = p.y; f.sc0 = p.sc; f.to = { cell: cellOf(f.t) }; } });
    S.orns.forEach((o) => {
      const h = ornHook(o), w = tw(h.x, h.y);
      launch(o.t, { x: w.x, y: w.y, sc: L.tree.s }, { cell: cellOf(o.t) });
    });
    if (S.star) { const h = tw(TOP.x, TOP.y); launch("star", { x: h.x, y: h.y, sc: L.tree.s }, { cell: cellOf("star") }); }
    S.strands.forEach((sd, i) => { sd.tail = false; sd.grow = 1; windBack(sd, null, Math.min(0.6, i * 0.05)); });
    S.strands = []; S.orns = []; S.star = false;
    S.power = 0; S.modeTried = false;
    lastWant = null;
    ghost.again();
    saveSoon();
  }
  Toybox.bar($("bottom"), { shelf: null, onNew: newTree, onSurprise: surprise });
  // Takes turns between live moments: a slow chase round the lit tree, a big snowfall outside, every ornament
  // sparkling in turn, and a toy train rolling past. The chase needs lit lights, so it waits its turn then.
  const MOMENTS = ["chase", "snow", "sparkle", "train"];
  let momentNext = 0;
  function surprise() {
    if (locked()) return;
    let k = momentNext;
    if (MOMENTS[k] === "chase" && !(lit() && lightN())) k = (k + 1) % MOMENTS.length;
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
    S.strands.forEach((sd) => { if (sd.wig > 0) sd.wig = Math.max(0, sd.wig - dt * 1.4); });
    swayV += (-30 * sway - 2 * swayV) * dt; sway += swayV * dt;
    if (Math.abs(sway) < 0.0002 && Math.abs(swayV) < 0.0005) { sway = 0; swayV = 0; }
    boxWob = Math.max(0, boxWob - dt * 2); trayWob = Math.max(0, trayWob - dt * 2); wreathWob = Math.max(0, wreathWob - dt * 1.5);
    coilWob.l = Math.max(0, coilWob.l - dt * 1.6); coilWob.g = Math.max(0, coilWob.g - dt * 1.6); plugWob = Math.max(0, plugWob - dt * 2);
    starWob = Math.max(0, starWob - dt * 1.5); ctrlPress = Math.max(0, ctrlPress - dt * 4);
    // The box glows (and lifts its lid) while an ornament can go back in; the lights box glows while a string can.
    const boxTo = carry && dropTarget(carry).cell != null && (carry.from === "tree" || dropTarget(carry).box) ? 1 : 0;
    const trayTo = pull && pullOff(pull) ? 1 : 0;
    boxHot += (boxTo - boxHot) * Math.min(1, dt * 10); trayHot += (trayTo - trayHot) * Math.min(1, dt * 10);
    // The lights switch on quickly and the room dims slowly.
    on += ((lit() ? 1 : 0) - on) * Math.min(1, dt * 7);
    const dimTo = lit() && (lightN() || S.star) ? 1 : 0;
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
    lightLevels(t);
    updateCoach();
    draw(t);
    requestAnimationFrame(frame);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawRoom(t);
    // The tree and what hangs on it.
    treeFrame();
    drawTree(TIERS, tcNow(), true);
    S.strands.forEach((sd) => drawString(sd, on, t, 1));
    drawOrnaments();
    // Where a carried ornament would hang if let go now.
    if (carry) {
      const tg = dropTarget(carry);
      if (tg.spot != null || tg.top) {
        const h = tg.top ? { x: TOP.x, y: TOP.y + 28 } : { x: SPOTS[tg.spot].x, y: SPOTS[tg.spot].y + ORN_BY[carry.t].cy };
        ctx.beginPath(); ctx.arc(h.x, h.y, ORN_BY[carry.t].r + 6, 0, TAU);
        ctx.setLineDash([6, 5]); stk("#FFE36B", 3); ctx.setLineDash([]);
      }
    }
    // The floor things: the cord, the switch, the boxes and the coils, the plug in the socket.
    worldFrame();
    drawTrain(t);
    drawCord();
    drawCtrl();
    drawBox();
    drawTray(t);
    drawPlug();
    // Strings on the move lie over the floor things: one paying out from a coil, the tails of wraps winding
    // on, strings winding back into their coils and the loose bits fading away.
    treeFrame();
    S.strands.forEach((sd) => { if (sd.tail && sd.grow < 1) drawString(tailOf(sd), on, t, 1); });
    winding.forEach((w) => windDraw(w, (sd, k) => drawString(sd, on, t, 1 - k * 0.5)));
    fading.forEach((f) => drawString(f.s, on, t, f.a));
    if (live) drawString(live, on, t, 1);
    // The room dims a little while the tree is lit, then the lights glow over everything.
    if (dim > 0.005) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "rgba(16,20,52," + (0.36 * dim).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); }
    if (on > 0.01 && lightN()) {
      worldFrame();
      const c = tw(0, YT + (YB - YT) * 0.6), r = 260 * L.tree.s, g = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, r);
      const a = 0.22 * on * Math.min(1, bulbCount() / 60);
      g.addColorStop(0, "rgba(255,214,140," + a.toFixed(3) + ")"); g.addColorStop(1, "rgba(255,214,140,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = "source-over";
    }
    treeFrame();
    drawGlows(on, t);
    if (on > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      S.strands.forEach((sd) => { if (sd.tail && sd.grow < 1) glowsOf(tailOf(sd), on, 1); });
      winding.forEach((w) => windDraw(w, (sd, k) => glowsOf(sd, on, 1 - k)));
      if (live) glowsOf(live, on, 1);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    worldFrame();
    hotGlow(L.box.x, L.box.y - 16 - boxHot * 14, L.box.w, L.box.h + 16 + boxHot * 14, boxHot);
    hotGlow(L.tray.x, L.tray.y, L.tray.w, L.tray.h, trayHot);
    if (lit()) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.8; ctx.drawImage(glow("#7CFF8A"), L.ctrl.x - 11 - 9, L.ctrl.y - 9, 18, 18); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
    // Things in the air and in his hand stay bright.
    if (pull) {
      treeFrame();
      ctx.save(); ctx.translate(pull.x0 + pull.dx, pull.y0 + pull.dy - 4); ctx.scale(pull.k, pull.k); ctx.translate(-pull.x0, -pull.y0);
      K *= pull.k;
      drawString(pull.sd, on, t, 1);
      if (on > 0.01) { ctx.globalCompositeOperation = "lighter"; glowsOf(pull.sd, on, 1); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
      ctx.restore();
      worldFrame();
    }
    fly.forEach((f) => { const p = flyPos(f); drawOrn(f.t, p.x, p.y, p.sc, 0); });
    if (carry) drawOrn(carry.t, carry.x, carry.y, L.tree.s, Math.sin(t * 5) * 0.06);
    drawParts();
    drawRing(t);
  }
  // Draws a string winding back into its coil: it shrinks toward the coil as it goes (in the tree's frame).
  function windDraw(w, fn) {
    const e = ease(w.p), sc = lerp(w.k0, 0.1, e);
    ctx.save();
    ctx.translate(lerp(w.fx, w.to.x, e), lerp(w.fy, w.to.y, e)); ctx.scale(sc, sc); ctx.translate(-w.cx, -w.cy);
    const k0 = K; K *= sc;
    fn(w.sd, e);
    K = k0;
    ctx.restore();
  }
  function onEnding(done) {
    ending = true;
    drag = null; press.cancel();
    if (live) { const lv = live; live = null; if (lv.coil) windBack(lv); }
    if (carry) dropCarry(true);
    if (pull) pullEnd(true);
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

  // Restore the tree after a reload (a fresh visit starts bare). Old saves hold light anchors in Classic tree
  // units: they are turned into tree-relative points with the Classic shape first.
  if (st0) {
    const rels = [];
    if (Array.isArray(st0.s)) st0.s.forEach((q) => {
      if (!q) return;
      const k = q.k === "g" ? "g" : "l";
      if (!(k === "l" ? LIGHT_BY : GAR_BY)[q.c]) return;
      const ok = (p) => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]);
      let r = null;
      if (Array.isArray(q.r)) r = q.r.filter(ok).map(([u, v]) => ({ u: clamp(u / 1000, -1, 1), v: clamp(v / 1000, 0, 1) }));
      else if (Array.isArray(q.a)) r = q.a.filter(ok).map(([x, y]) => toRel(onTree({ x, y })));
      if (r && r.length >= 2) rels.push({ k, c: q.c, r });
    });
    if (SHAPE_BY[st0.shape]) { useShape(SHAPE_BY[st0.shape]); S.shape = st0.shape; }
    if (TC_BY[st0.tc]) S.tc = st0.tc;
    rels.forEach((q) => { const sd = { k: q.k, c: q.c, r: q.r, grow: 1 }; sd.a = q.r.map(fromRel); S.strands.push(build(sd)); });
    ["l", "g"].forEach((k) => {
      const max = k === "l" ? MAX_LIGHTS : MAX_GAR;
      while (S.strands.filter((s) => s.k === k).length > max) S.strands.splice(S.strands.findIndex((s) => s.k === k), 1);
    });
    if (Array.isArray(st0.o)) {
      const used = new Set();
      st0.o.forEach((q) => {
        if (!q || !ORN_BY[q.t] || q.t === "star" || !Number.isInteger(q.s) || q.s < 0 || q.s >= SPOTS.length || used.has(q.s)) return;
        used.add(q.s); S.orns.push({ t: q.t, s: q.s, sw: 0, swv: 0, sp: 0 });
      });
    }
    S.star = !!st0.star;
    if (Number.isInteger(st0.power) && st0.power >= 0 && st0.power < POWER.length) S.power = st0.power;
    if (LIGHT_BY[st0.color]) S.color = st0.color;
    if (GAR_BY[st0.gar]) S.gar = st0.gar;
    if (["tree", "lights", "garland"].includes(st0.tab)) S.tab = st0.tab;
    S.lastKind = S.tab === "garland" ? "g" : "l";
    S.modeTried = !!st0.tried && st0.v === 2;
  }
  refreshShapePics();
  tcTiles.set(S.tc); lightTiles.set(S.color); garTiles.set(S.gar); jobs.set(S.tab);
  showTab();
  resize();
  if (lit()) { on = 1; dim = lightN() || S.star ? 1 : 0; }
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
    const strandVp = (i, f) => { const sd = S.strands[i]; if (!sd) return null; const p = along(sd.poly, sd.len * (f == null ? 0.5 : f)); return tvp(p.x, p.y); };
    window.__toybox = {
      state: () => {
        const w = want();
        return { lights: lightN(), garlands: garN(), strands: S.strands.map((sd) => sd.k + ":" + sd.c), bulbs: bulbCount(),
          orns: S.orns.map((o) => o.t + "@" + o.s), star: S.star, power: POWER_ID[S.power], color: S.color, garland: S.gar,
          shape: S.shape, treeColor: S.tc, tab: S.tab, spots: SPOTS.length, want: w && w.part, flying: fly.length,
          carrying: carry && carry.t, pulling: pull && pull.sd.k, live: live && live.k, winding: winding.length, morphing: !!morph,
          boxHot: +boxHot.toFixed(2), trayHot: +trayHot.toFixed(2), surprise: actor && actor.kind, coach: coach.text(), done: !w };
      },
      // Does the next wanted thing, the way a tap would.
      next: () => {
        const w = want();
        if (!w) return false;
        if (w.part === "coill") coilTap("l");
        else if (w.part === "coilg") coilTap("g");
        else if (w.part === "ctrl" || w.part === "ctrl2") pressSwitch();
        else if (w.part === "box") hopFromBox(S.orns.length % 9);
        else if (w.part === "starcell") hopFromBox(cellOf("star"));
        return true;
      },
      tap: (part) => { const p = partPt(part) || { x: 0, y: 0 }, v = vp(p.x, p.y); doTap(part, v.x, v.y); },
      wrap: (k, v) => wrapAt(k === "g" ? "g" : "l", v, true),
      coilTap: (k) => coilTap(k === "g" ? "g" : "l"),
      power: () => pressSwitch(),
      hang: (id) => hopFromBox(cellOf(id || "red")),
      color: (id) => { lightTiles.set(id); pickColor(id); },
      garland: (id) => { garTiles.set(id); pickGarland(id); },
      shape: (id) => { setShape(id); shapeTiles.set(S.shape); },
      treeColor: (id) => { tcTiles.set(id); setTreeColor(id); },
      tab: (id) => { jobs.set(id); pickTab(id); },
      // Takes string i (or ornament i) off the tree into its coil (or the box), the way a drag to the box would.
      remove: (i) => { const sd = S.strands[i]; if (!sd) return false; S.strands.splice(i, 1); windBack(sd); lastWant = null; saveSoon(); return true; },
      unhang: (i) => { const o = S.orns[i]; if (!o) return false; S.orns.splice(i, 1); const h = ornHook(o), w = tw(h.x, h.y); launch(o.t, { x: w.x, y: w.y, sc: L.tree.s }, { cell: cellOf(o.t) }); afterOrn(); return true; },
      newTree: () => newTree(),
      surprise: () => surprise(),
      // Viewport points for real pointer drags: a part, a coil, a point on the tree (tree units, or tree-relative
      // u, v), a branch tip, a point along hung string i (f: 0..1 along it), the ornament box, the lights box.
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      coilPt: (k) => { const c = coilPos(k === "g" ? "g" : "l"); return vp(c.x, c.y - 4); },
      treePt: (x, y) => tvp(x, y),
      relPt: (u, v) => { const p = fromRel({ u, v }); return tvp(p.x, p.y); },
      spotPt: (i) => tvp(SPOTS[i].x, SPOTS[i].y + 20),
      ornPt: (i) => { const o = S.orns[i]; if (!o) return null; const m = ornMid(o); return tvp(m.x, m.y); },
      strandPt: strandVp,
      boxPt: () => vp(L.box.x + L.box.w / 2, L.box.y + L.box.h / 2),
      trayPt: () => vp(L.tray.x + L.tray.w / 2, L.tray.y + L.tray.h * 0.8),
      spots: () => SPOTS.length,
      hit: (x, y) => hitPart(x, y),
      ghost: () => ghost.show()
    };
  }
})();
