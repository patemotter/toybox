(function () {
  "use strict";
  // Christmas · Snowflakes: a craft table by a window. He makes a real fold-and-cut paper snowflake. Two rows of
  // tiles are real choices: the fold type (4, 5, 6 or 8 points; each tile shows the kind of snowflake it makes)
  // and the paper color (White, Blue, Silver, Pink). A pick takes effect on the flat sheet at once; once folding
  // has started, it is for the next sheet. The fold types, each a real way to fold a square:
  //   4 points: in half, the left side over, into a triangle (8 mirrored slices of 45 degrees).
  //   5 points: in half, the right side over, the left side over, in half again (the five-point star fold, 10
  //             slices of 36 degrees).
  //   6 points: in half into a triangle, the right and left sides over (thirds), in half again (the real
  //             snowflake, 12 slices of 30 degrees).
  //   8 points: in half, the left side over, into a triangle, the triangle in half (16 slices of 22.5 degrees).
  // Each fold is hands-on: drag the paper's corner across (it follows his finger) or tap the paper and it folds
  // by itself. The coach line names each fold. Then:
  //   Trim: the scissors trim the top of the wedge by themselves (the real cut that makes the points).
  //   Cut: touching the paper brings the big craft scissors to his finger; dragging cuts a narrow strip of
  //      paper away along the path, and pieces cut off from the middle fall away. A tap snips one notch
  //      (a triangle, a half circle or a diamond, in turn). Little paper bits drop and fade.
  //   Open: the "Open the paper" tile (in the colors' row while he cuts). The paper unfolds back through the
  //      folds and the snowflake grows big in the middle, glinting and turning slowly: the wedge's cuts mirrored
  //      into every slice.
  //   Hang it: drag the snowflake to the window (or tap it, or tap the window) and it sticks to the glass.
  //      A fresh sheet of paper comes.
  // The window full of his snowflakes is his collection (up to 12, kept across visits; the oldest comes down
  // to make room). Tapping a hung snowflake shows it big. A yellow ring and one instruction show what is next;
  // the window, the fairy lights, the snow outside, the mat and the scissors all answer a touch.
  // Coordinates: "sheet" units have the middle of the sheet at 0,0 and the square from -1 to 1 (y down). "Flat"
  // units are the folded paper in the same units. The camera maps flat units to stage CSS px. Angles in the
  // geometry are degrees, measured like Math.atan2(y, x).
  //
  // Sections:
  //   Setup and saved state
  //   Paper colors
  //   Layout and camera
  //   Tweens and particles
  //   Paper geometry: folds as facets
  //   The cut mask
  //   Rendering a snowflake
  //   The window collection
  //   The sheet: fold and trim
  //   The sheet: cut, open and hang
  //   Drawing helpers
  //   Drawing the room and the window
  //   Drawing the paper and the scissors
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Panel and surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const TAU = Math.PI * 2, DEG = Math.PI / 180, INK = "#1D2340";
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const mkCanvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h || w)); return c; };
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "christmas-snowflakes-v1";
  const WIN_MAX = 12;
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const fresh = Toybox.fresh();

  // =====================================================================================================
  // Paper colors
  // =====================================================================================================
  const COLORS = [
    { id: "white", name: "White", hex: "#FFFFFF" },
    { id: "blue", name: "Blue", hex: "#BFE3FF" },
    { id: "silver", name: "Silver", hex: "#D6DCE6" },
    { id: "pink", name: "Pink", hex: "#FFD2E3" }
  ];
  const okColor = (c) => Number.isInteger(c) && c >= 0 && c < COLORS.length;

  // =====================================================================================================
  // Layout and camera
  // =====================================================================================================
  // The stage is laid out in CSS px from its shape: upright, the window is across the top and the craft table
  // below it; sideways, the window is on the left and the table on the right.
  let W = 1, H = 1, dpr = 1, tall = true;
  const LY = { win: {}, glass: {}, table: {}, pa: {}, ca: {}, rv: {}, fw: 8, sc: 140, rest: {}, flake: 40 };
  function layout() {
    tall = W / H < 1.2;
    if (tall) {
      const ww = W * 0.86, wh = Math.min(H * 0.3, ww * 0.62);
      LY.win = { x: (W - ww) / 2, y: Math.max(8, H * 0.035), w: ww, h: wh };
      const ty = LY.win.y + wh + Math.max(16, H * 0.035);
      LY.table = { x: -6, y: ty, w: W + 12, h: H - ty + 6 };
      LY.pa = { x: W * 0.05, y: ty + 10, w: W * 0.9, h: H - ty - 16 };
      LY.ca = { x: W * 0.06, y: H * 0.04, w: W * 0.74, h: H * 0.92 };
      LY.rv = { x: W / 2, y: H * 0.53, r: Math.min(W * 0.45, H * 0.4) };
    } else {
      const wl = W * 0.4;
      LY.win = { x: W * 0.04, y: H * 0.08, w: wl - W * 0.08, h: H * 0.68 };
      LY.table = { x: wl, y: -6, w: W - wl + 6, h: H + 12 };
      LY.pa = { x: wl + 10, y: 10, w: W - wl - 20, h: H - 20 };
      LY.ca = { x: W * 0.3, y: H * 0.04, w: W * 0.56, h: H * 0.92 };
      LY.rv = { x: wl + (W - wl) * 0.47, y: H / 2, r: Math.min((W - wl) * 0.44, H * 0.44) };
    }
    LY.fw = clamp(Math.min(LY.win.w, LY.win.h) * 0.055, 6, 16);
    const fw = LY.fw;
    LY.glass = { x: LY.win.x + fw, y: LY.win.y + fw, w: LY.win.w - fw * 2, h: LY.win.h - fw * 2 };
    LY.sc = clamp(Math.min(W, H) * 0.36, 110, 210);
    LY.rest = { x: W - LY.sc * 0.24 - 14, y: H - 12 - LY.sc * 0.66, a: -Math.PI / 2 };
    // The paper keeps clear of the scissors resting at the right.
    const strip = LY.sc * 0.5;
    LY.pf = { x: LY.pa.x + (tall ? strip * 0.25 : 0), y: LY.pa.y, w: LY.pa.w - strip * (tall ? 1.25 : 1), h: LY.pa.h };
    LY.flake = clamp(Math.sqrt(LY.glass.w * LY.glass.h) * 0.25, 40, 130);
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    layout();
    skyGrad = null;
    if (typeof onLayout === "function") onLayout();
  }
  // Viewport px (for the coach, the ghost hand and name tags) from stage px, and back.
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; }
  function local(cx, cy) { const r = cv.getBoundingClientRect(); return { x: cx - r.left, y: cy - r.top }; }

  // The camera: flat units to stage px. x, y = where the sheet's middle M is; s = px per unit; r = turn (rad).
  let cam = { x: 0, y: 0, s: 100, r: 0 };
  const camMat = (c) => { const co = Math.cos(c.r) * c.s, si = Math.sin(c.r) * c.s; return [co, si, -si, co, c.x, c.y]; };
  const toScr = (c, x, y) => { const co = Math.cos(c.r), si = Math.sin(c.r); return { x: c.x + c.s * (x * co - y * si), y: c.y + c.s * (x * si + y * co) }; };
  const fromScr = (c, sx, sy) => { const dx = sx - c.x, dy = sy - c.y, co = Math.cos(c.r), si = Math.sin(c.r); return { x: (dx * co + dy * si) / c.s, y: (-dx * si + dy * co) / c.s }; };
  // Canvas matrices [a, b, c, d, e, f]: x' = a x + c y + e, y' = b x + d y + f. mul(A, B) applies B first.
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
    A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  // The camera that fits some flat polygons into a stage rect, turned by rot degrees.
  function fitCam(polys, rot, area, fill, maxS) {
    const r = rot * DEG, co = Math.cos(r), si = Math.sin(r);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    polys.forEach((poly) => poly.forEach(([x, y]) => {
      const rx = x * co - y * si, ry = x * si + y * co;
      x0 = Math.min(x0, rx); x1 = Math.max(x1, rx); y0 = Math.min(y0, ry); y1 = Math.max(y1, ry);
    }));
    const s = Math.min(area.w * fill / (x1 - x0), area.h * fill / (y1 - y0), maxS || Infinity);
    return { x: area.x + area.w / 2 - s * (x0 + x1) / 2, y: area.y + area.h / 2 - s * (y0 + y1) / 2, s, r };
  }

  // =====================================================================================================
  // Tweens and particles
  // =====================================================================================================
  let tweens = [];
  // A motion over dur seconds: step(p) with p from 0 to 1, then done(). Tweens tagged "sheet" belong to the
  // sheet of paper and stop when a new sheet comes.
  function tween(dur, step, done, delay, tag) {
    const tw = { t0: now() + (delay || 0), dur: Math.max(0.01, dur), step, done, tag: tag || "" };
    tweens.push(tw);
    return tw;
  }
  function runTweens(t) {
    for (const tw of tweens.slice()) {
      if (!tweens.includes(tw)) continue;
      const p = (t - tw.t0) / tw.dur;
      if (p < 0) continue;
      if (tw.step) tw.step(Math.min(1, p));
      if (p >= 1) { const i = tweens.indexOf(tw); if (i >= 0) tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
  }
  const later = (sec, fn, tag) => tween(sec, null, fn, 0, tag);
  const dropTag = (tag) => { tweens = tweens.filter((tw) => tw.tag !== tag); };

  // Screen-space particles: paper bits (fall and fade within about a second) and sparkles.
  let parts = [];
  function puff(kind, x, y, n, color) {
    if (reduce) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 120) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 4, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, color: color || "#FFFFFF" };
      if (kind === "bit") { p.vx = (Math.random() - 0.5) * 90; p.vy = -30 - sp * 50; p.life = 0.9 + sp * 0.35; p.size = 3 + sp * 4; }
      else if (kind === "spark") { p.vx = Math.cos(a) * (40 + sp * 90); p.vy = Math.sin(a) * (40 + sp * 90); p.life = 0.8; p.size = 5 + sp * 5; p.color = color || "#FFE36B"; }
      else if (kind === "twinkle") { p.life = 0.9; p.size = 9 + sp * 7; p.x += (Math.random() - 0.5) * 6; p.y += (Math.random() - 0.5) * 6; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "bit") { p.vy += 260 * dt; p.vx *= 1 - dt * 1.5; p.rot += p.vr * dt; }
      if (p.kind === "spark") { p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // Paper geometry: folds as facets
  // =====================================================================================================
  // A facet is one piece of one layer of the folded paper: the part of the sheet between the angles a0 and a1
  // round the middle M (every fold line passes through M, so every piece is a slice), its map to the folded
  // paper (flat angle = d * sheet angle + g; d = -1 means it lies face down) and its height z in the stack.
  // Each fold type is a real way to fold a square for a paper snowflake: a list of folds (each a line through M
  // at a flat angle, and a flat angle on the side that moves), ending in a wedge of 2n mirrored slices between
  // the flat angles w0 and w0 + 180/n. After the last fold the scissors trim the wedge from the notch radius rv
  // on one edge to the point radius RP on the edge at pAng, which makes the n points.
  const TYPES = [
    { id: "p4", n: 4, name: "4 points", w0: 0, pAng: 45, rotFold: 0, rv: 0.46,
      folds: [{ line: 0, move: -90 }, { line: 90, move: 180 }, { line: 45, move: 67.5 }],
      lines: ["Fold the paper in half.", "Fold the left side over.", "Fold the paper into a triangle."] },
    { id: "p5", n: 5, name: "5 points", w0: 72, pAng: 72, rotFold: 0, rv: 0.52,
      folds: [{ line: 0, move: -90 }, { line: 72, move: 36 }, { line: 144, move: 162 }, { line: 108, move: 126 }],
      lines: ["Fold the paper in half.", "Fold the right side over.", "Fold the left side over.", "Fold the paper in half again."] },
    { id: "p6", n: 6, name: "6 points", w0: 15, pAng: 45, rotFold: 45, rv: 0.7,
      folds: [{ line: 135, move: -135 }, { line: 15, move: -15 }, { line: 75, move: 105 }, { line: 45, move: 60 }],
      lines: ["Fold the paper in half.", "Fold the right side over.", "Fold the left side over.", "Fold the paper in half again."] },
    { id: "p8", n: 8, name: "8 points", w0: 0, pAng: 0, rotFold: 0, rv: 0.74,
      folds: [{ line: 0, move: -90 }, { line: 90, move: 180 }, { line: 45, move: 67.5 }, { line: 22.5, move: 33.75 }],
      lines: ["Fold the paper in half.", "Fold the left side over.", "Fold the paper into a triangle.", "Fold the triangle in half."] }
  ];
  const TYPE_BY = {};
  TYPES.forEach((t, i) => { TYPE_BY[t.id] = i; });
  const facetMat = (f) => { const c = Math.cos(f.g * DEG), s = Math.sin(f.g * DEG); return f.d > 0 ? [c, s, -s, c, 0, 0] : [c, s, s, -c, 0, 0]; };
  // A fold in progress (p from 0 to 1): the moving side turns over the line, seen from above (it narrows, then
  // lands mirrored on the other side).
  function animMat(L, p) {
    const c = Math.cos(Math.PI * p) - 1, s = Math.sin(L * DEG), co = Math.cos(L * DEG);
    return [1 + c * s * s, -c * s * co, -c * s * co, 1 + c * co * co, 0, 0];
  }
  function foldFacets(list, F) {
    const L = F.line;
    const side = (fa) => Math.sin((fa - L) * DEG) > 0;
    const mvSide = side(F.move), pieces = [];
    for (const f of list) {
      const base = f.d * (L - f.g);
      const cuts = [];
      for (let t = base + Math.ceil((f.a0 + 1e-6 - base) / 180) * 180; t < f.a1 - 1e-6; t += 180) cuts.push(t);
      const edges = [f.a0, ...cuts, f.a1];
      for (let i = 0; i < edges.length - 1; i++) {
        const a0 = edges[i], a1 = edges[i + 1], fa = f.d * (a0 + a1) / 2 + f.g;
        pieces.push({ a0, a1, d: f.d, g: f.g, z: f.z, mv: side(fa) === mvSide });
      }
    }
    const maxZ = Math.max(...pieces.map((p) => p.z));
    const after = pieces.map((p) => (p.mv ? { a0: p.a0, a1: p.a1, d: -p.d, g: 2 * L - p.g, z: 2 * maxZ + 1 - p.z } : { a0: p.a0, a1: p.a1, d: p.d, g: p.g, z: p.z }));
    after.sort((a, b) => a.z - b.z);
    after.forEach((f, i) => { f.z = i; });
    return { pieces, after };
  }
  // The square cut down to a facet's slice (sheet units).
  const SQ = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function clipHalf(poly, nx, ny) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length];
      const dp = nx * P[0] + ny * P[1], dq = nx * Q[0] + ny * Q[1];
      if (dp >= -1e-9) out.push(P);
      if ((dp >= -1e-9) !== (dq >= -1e-9)) { const t = dp / (dp - dq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
    }
    return out;
  }
  const polyCache = {};
  function facetPoly(f) {
    const key = f.a0 + ":" + f.a1;
    if (polyCache[key]) return polyCache[key];
    let poly = SQ;
    if (f.a1 - f.a0 < 359) {
      const a0 = f.a0 * DEG, a1 = f.a1 * DEG;
      poly = clipHalf(SQ, -Math.sin(a0), Math.cos(a0));
      poly = clipHalf(poly, Math.sin(a1), -Math.cos(a1));
    }
    return (polyCache[key] = poly);
  }
  const RP = 0.97;
  const mapPoly = (M, poly) => poly.map(([x, y]) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]]);
  const dirPt = (a, r) => [r * Math.cos(a * DEG), r * Math.sin(a * DEG)];
  // Everything about one fold type, worked out once: every state of the sheet (0 = flat, NF = the wedge), the
  // pieces of each fold, the paper's corner for each fold, the wedge's slices as maps back to the sheet, the
  // trim line and the scraps it cuts off, the mask's box and the camera turns.
  function buildType(T) {
    const sig = 180 / T.n, w1 = T.w0 + sig, vAng = T.pAng === T.w0 ? w1 : T.w0;
    const L1 = T.folds[0].line, NF = T.folds.length;
    const STATES = [[{ a0: L1 - 360, a1: L1, d: 1, g: 0, z: 0 }]], SPLITS = [];
    T.folds.forEach((F) => { const r = foldFacets(STATES[STATES.length - 1], F); SPLITS.push(r.pieces); STATES.push(r.after); });
    // The trimmed sheet is a star: points at pAng + k * 360/n (radius RP), notches between (rv).
    const starR = (a) => { const q = Math.round((a - T.pAng) / sig); return ((q % 2) + 2) % 2 === 0 ? RP : T.rv; };
    const starPoly = (f) => {
      const pts = f.a1 - f.a0 < 359 ? [[0, 0]] : [];
      for (let a = f.a0; a <= f.a1 + 1e-6; a += sig) pts.push(dirPt(a, starR(a)));
      return pts;
    };
    const FLAT = STATES.map((st) => st.map((f) => mapPoly(facetMat(f), facetPoly(f))));
    const FLAT_STAR = STATES.map((st) => st.map((f) => mapPoly(facetMat(f), starPoly(f))));
    const GRAB = T.folds.map((F, k) => {
      const L = F.line * DEG;
      let n = [-Math.sin(L), Math.cos(L)];
      if (Math.sin((F.move - F.line) * DEG) < 0) n = [-n[0], -n[1]];
      let best = null, bd = -1;
      SPLITS[k].forEach((f) => { if (f.mv) mapPoly(facetMat(f), facetPoly(f)).forEach((p) => { const d = p[0] * n[0] + p[1] * n[1]; if (d > bd + 1e-6) { bd = d; best = p; } }); });
      return { g: best, d0: bd, n, to: [best[0] - 2 * bd * n[0], best[1] - 2 * bd * n[1]] };
    });
    const SECTORS = STATES[NF].map((f) => facetMat({ d: f.d, g: f.d > 0 ? -f.g : f.g }));
    const TA = dirPt(vAng, T.rv), TB = dirPt(T.pAng, RP), WEDGE = [[0, 0], TA, TB];
    const nx = -(TB[1] - TA[1]), ny = TB[0] - TA[0];
    const sg = (nx * (0 - TA[0]) + ny * (0 - TA[1])) > 0 ? -1 : 1;   // keep the side away from M
    const SCRAPS = [];
    FLAT[NF].forEach((poly) => {
      const sh = poly.map(([x, y]) => [x - TA[0], y - TA[1]]);
      const c = clipHalf(sh, sg * nx, sg * ny).map(([x, y]) => [x + TA[0], y + TA[1]]);
      if (c.length > 2) SCRAPS.push(c);
    });
    const xs = WEDGE.map((p) => p[0]), ys = WEDGE.map((p) => p[1]);
    const MX0 = Math.min(...xs) - 0.03, MY0 = Math.min(...ys) - 0.03;
    // The camera turns: the wedge hangs straight down from M while he cuts; the snowflake has a point straight
    // up when it is open.
    const per = 360 / T.n;
    let rotRev = -90 - T.pAng - T.rotFold;
    rotRev = T.rotFold + (((rotRev % per) + per * 1.5) % per - per / 2);
    return Object.assign({}, T, { sig, w1, NF, STATES, SPLITS, FLAT, FLAT_STAR, GRAB, SECTORS, TA, TB, WEDGE, SCRAPS,
      MX0, MY0, MW: Math.max(...xs) - MX0 + 0.03, MH: Math.max(...ys) - MY0 + 0.03,
      rotCut: 90 - (T.w0 + sig / 2), rotRev });
  }
  const GEO = TYPES.map(buildType);
  // The fold type in use (the sheet's own type; a hung snowflake's type while it is drawn).
  let G = GEO[TYPE_BY.p6], FOLDS = G.folds, STATES = G.STATES, SPLITS = G.SPLITS, FLAT = G.FLAT, FLAT_STAR = G.FLAT_STAR, GRAB = G.GRAB,
    SECTORS = G.SECTORS, TA = G.TA, TB = G.TB, WEDGE = G.WEDGE, SCRAPS = G.SCRAPS, MX0 = G.MX0, MY0 = G.MY0, NF = G.NF;
  function useType(i) {
    G = GEO[i];
    ({ folds: FOLDS, STATES, SPLITS, FLAT, FLAT_STAR, GRAB, SECTORS, TA, TB, WEDGE, SCRAPS, MX0, MY0, NF } = G);
  }
  function withType(i, fn) { const was = TYPE_BY[G.id]; useType(i); try { return fn(); } finally { useType(was); } }

  // =====================================================================================================
  // The cut mask
  // =====================================================================================================
  // The wedge's paper as an alpha mask in flat units (its box starts at MX0, MY0 and is G.MW by G.MH units, at res
  // px per unit; each fold type has its own box).
  // Cuts are kept as ops in flat units: { k: "s", p: [x, y, x, y, ...] } a cut along a path (a strip CUTW wide
  // is taken away) and { k: "n", t, x, y, a } a notch (t: 0 triangle, 1 half circle, 2 diamond; a = the
  // direction into the paper, degrees). Pieces that fall away are kept as drops [op index, x, y] (a point in the
  // piece) so the same snowflake comes back at any size.
  const CUTW = 0.046, NOTCH = 0.075;
  function newMask(res) {
    const c = mkCanvas(G.MW * res, G.MH * res), g = c.getContext("2d", { willReadFrequently: true });
    g.setTransform(res, 0, 0, res, -MX0 * res, -MY0 * res);
    g.fillStyle = "#FFFFFF";
    g.beginPath(); g.moveTo(0, 0); g.lineTo(TA[0], TA[1]); g.lineTo(TB[0], TB[1]); g.closePath(); g.fill();
    return { c, g, res };
  }
  function notchPath(g, op) {
    const a = op.a * DEG, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]], s = NOTCH, x = op.x, y = op.y;
    g.beginPath();
    if (op.t === 1) { g.arc(x, y, s * 1.05, 0, TAU); return; }
    const P = op.t === 0
      ? [[x + u[0] * s * 1.5, y + u[1] * s * 1.5], [x - u[0] * s * 0.6 + v[0] * s * 0.95, y - u[1] * s * 0.6 + v[1] * s * 0.95], [x - u[0] * s * 0.6 - v[0] * s * 0.95, y - u[1] * s * 0.6 - v[1] * s * 0.95]]
      : [[x + u[0] * s * 1.35, y + u[1] * s * 1.35], [x + v[0] * s * 0.85, y + v[1] * s * 0.85], [x - u[0] * s * 1.35, y - u[1] * s * 1.35], [x - v[0] * s * 0.85, y - v[1] * s * 0.85]];
    P.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.closePath();
  }
  // Cuts one op (or one new stretch of a cut path, from point index i0) out of the mask.
  function applyOp(mk, op, i0) {
    const g = mk.g;
    g.globalCompositeOperation = "destination-out";
    if (op.k === "s") {
      g.lineWidth = CUTW; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#000";
      const p = op.p, from = Math.max(0, (i0 || 0) - 1);
      g.beginPath(); g.moveTo(p[from * 2], p[from * 2 + 1]);
      if (p.length === 2) g.lineTo(p[0] + 1e-4, p[1]);
      for (let i = from + 1; i < p.length / 2; i++) g.lineTo(p[i * 2], p[i * 2 + 1]);
      g.stroke();
    } else { notchPath(g, op); g.fillStyle = "#000"; g.fill(); }
    g.globalCompositeOperation = "source-over";
  }
  // How far a point is inside each fold edge of the wedge (negative = outside).
  const edge0 = (x, y) => -Math.sin(G.w0 * DEG) * x + Math.cos(G.w0 * DEG) * y;
  const edge1 = (x, y) => Math.sin(G.w1 * DEG) * x - Math.cos(G.w1 * DEG) * y;
  // Pieces cut off from the middle fall away. A piece stays when it reaches the middle of the snowflake or both
  // fold edges (it then goes all the way round); if nothing would stay, the biggest piece stays. Returns the
  // fallen pieces (a point in each, and a picture of it when sprites is set).
  function settle(mk, hex, sprites) {
    const w = mk.c.width, h = mk.c.height, res = mk.res, n = w * h;
    const img = mk.g.getImageData(0, 0, w, h), a = img.data;
    const lab = new Int32Array(n).fill(-1), stack = new Int32Array(n), comps = [];
    const tol = 2.5 / res;
    for (let i = 0; i < n; i++) {
      if (lab[i] >= 0 || a[i * 4 + 3] < 128) continue;
      const cp = { id: comps.length, n: 0, apex: false, e15: false, e45: false, seed: i, inner: -1, x0: w, x1: 0, y0: h, y1: 0 };
      comps.push(cp);
      let sp = 0; stack[sp++] = i; lab[i] = cp.id;
      while (sp) {
        const j = stack[--sp], x = j % w, y = (j / w) | 0;
        cp.n++;
        if (x < cp.x0) cp.x0 = x; if (x > cp.x1) cp.x1 = x; if (y < cp.y0) cp.y0 = y; if (y > cp.y1) cp.y1 = y;
        const fx = MX0 + (x + 0.5) / res, fy = MY0 + (y + 0.5) / res;
        if (fx * fx + fy * fy < 0.0036) cp.apex = true;
        if (edge0(fx, fy) < tol) cp.e15 = true;
        if (edge1(fx, fy) < tol) cp.e45 = true;
        let all = 0;
        if (x > 0) { const q = j - 1; if (a[q * 4 + 3] >= 128) { all++; if (lab[q] < 0) { lab[q] = cp.id; stack[sp++] = q; } } }
        if (x < w - 1) { const q = j + 1; if (a[q * 4 + 3] >= 128) { all++; if (lab[q] < 0) { lab[q] = cp.id; stack[sp++] = q; } } }
        if (y > 0) { const q = j - w; if (a[q * 4 + 3] >= 128) { all++; if (lab[q] < 0) { lab[q] = cp.id; stack[sp++] = q; } } }
        if (y < h - 1) { const q = j + w; if (a[q * 4 + 3] >= 128) { all++; if (lab[q] < 0) { lab[q] = cp.id; stack[sp++] = q; } } }
        if (all === 4 && cp.inner < 0) cp.inner = j;
      }
    }
    const keep = comps.map((c) => c.apex || (c.e15 && c.e45));
    if (comps.length && !keep.some(Boolean)) { let b = 0; comps.forEach((c, i) => { if (c.n > comps[b].n) b = i; }); keep[b] = true; }
    if (keep.every(Boolean)) return [];
    // Sprites of the bigger fallen pieces, so they can be seen falling.
    const fall = comps.filter((c, i) => !keep[i]).map((c) => {
      const j = c.inner >= 0 ? c.inner : c.seed;
      const out = { x: MX0 + ((j % w) + 0.5) / res, y: MY0 + (((j / w) | 0) + 0.5) / res, comp: c };
      if (sprites && c.n > 30) {
        out.cv = mkCanvas(c.x1 - c.x0 + 3, c.y1 - c.y0 + 3);
        out.img = out.cv.getContext("2d").createImageData(out.cv.width, out.cv.height);
        out.mx = c.x0 - 1; out.my = c.y0 - 1;
      }
      return out;
    });
    const byId = {};
    fall.forEach((f) => { byId[f.comp.id] = f; });
    const rgb = hexRgb(hex);
    const put = (f, i, al) => {
      if (!f || !f.img) return;
      const x = (i % w) - f.mx, y = ((i / w) | 0) - f.my, o = (y * f.img.width + x) * 4;
      f.img.data[o] = rgb[0]; f.img.data[o + 1] = rgb[1]; f.img.data[o + 2] = rgb[2]; f.img.data[o + 3] = al;
    };
    for (let i = 0; i < n; i++) {
      const al = a[i * 4 + 3];
      if (!al) continue;
      const L = lab[i];
      if (L >= 0) { if (!keep[L]) { put(byId[L], i, al); a[i * 4 + 3] = 0; } continue; }
      // A soft edge pixel goes with the piece next to it.
      const x = i % w;
      let gone = -1, stay = false;
      const look = (q) => { const l = lab[q]; if (l >= 0) { if (keep[l]) stay = true; else gone = l; } };
      if (x > 0) look(i - 1); if (x < w - 1) look(i + 1); if (i >= w) look(i - w); if (i + w < n) look(i + w);
      if (!stay && gone >= 0) { put(byId[gone], i, al); a[i * 4 + 3] = 0; }
    }
    mk.g.putImageData(img, 0, 0);
    fall.forEach((f) => { if (f.img) { f.cv.getContext("2d").putImageData(f.img, 0, 0); f.cv = rimify(f.cv, hex, Math.max(1.5, res / 400)); f.img = null; } });
    return fall;
  }
  // Takes away the pieces with these points in them (a replay of pieces that fell).
  function dropSeeds(mk, seeds) {
    const w = mk.c.width, h = mk.c.height, res = mk.res, n = w * h;
    const img = mk.g.getImageData(0, 0, w, h), a = img.data, seen = new Uint8Array(n), stack = new Int32Array(n);
    seeds.forEach(([fx, fy]) => {
      let x = Math.round((fx - MX0) * res - 0.5), y = Math.round((fy - MY0) * res - 0.5), found = -1;
      for (let r = 0; r <= 2 && found < 0; r++) {
        for (let dy = -r; dy <= r && found < 0; dy++) for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && a[(yy * w + xx) * 4 + 3] >= 128) { found = yy * w + xx; break; }
        }
      }
      if (found < 0 || seen[found]) return;
      // Flood the piece first; a piece that reaches the middle or both fold edges is never dropped (at a small
      // size a seed can land on the main paper).
      const list = [], soft = [];
      let sp = 0, apex = false, e15 = false, e45 = false;
      const tol = 2.5 / res;
      stack[sp++] = found; seen[found] = 1;
      while (sp) {
        const j = stack[--sp]; x = j % w; y = (j / w) | 0;
        list.push(j);
        const fx = MX0 + (x + 0.5) / res, fy = MY0 + (y + 0.5) / res;
        if (fx * fx + fy * fy < 0.0036) apex = true;
        if (edge0(fx, fy) < tol) e15 = true;
        if (edge1(fx, fy) < tol) e45 = true;
        const nb = [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w];
        for (const q of nb) {
          if (q < 0 || q >= n || seen[q]) continue;
          if (a[q * 4 + 3] >= 128) { seen[q] = 1; stack[sp++] = q; }
          else if (a[q * 4 + 3] > 0) { seen[q] = 3; soft.push(q); }
        }
      }
      if (apex || (e15 && e45)) { soft.forEach((q) => { seen[q] = 0; }); return; }
      list.forEach((j) => { a[j * 4 + 3] = 0; });
      soft.forEach((q) => { seen[q] = 2; });
    });
    // Soft edge pixels next to a dropped piece go too, unless they touch paper that stays.
    for (let i = 0; i < n; i++) {
      if (seen[i] !== 2) continue;
      const x = i % w;
      let stay = false;
      const look = (q) => { if (q >= 0 && q < n && a[q * 4 + 3] >= 128) stay = true; };
      if (x > 0) look(i - 1); if (x < w - 1) look(i + 1); look(i - w); look(i + w);
      if (!stay) a[i * 4 + 3] = 0;
    }
    mk.g.putImageData(img, 0, 0);
  }
  function replay(mk, ops, drops) {
    ops.forEach((op, i) => {
      applyOp(mk, op);
      const ds = drops.filter((d) => d[0] === i).map((d) => [d[1], d[2]]);
      if (ds.length) dropSeeds(mk, ds);
    });
  }
  function hexRgb(hex) { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }

  // =====================================================================================================
  // Rendering a snowflake
  // =====================================================================================================
  // Paper with a 2 px ink edge: the shape in ink, and the shape a little smaller in the paper color on top.
  function rimify(src, hex, rim, out, tmp) {
    const w = src.width, h = src.height;
    out = out || mkCanvas(w, h); tmp = tmp || mkCanvas(w, h);
    const g = out.getContext("2d"), q = tmp.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, w, h);
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in"; g.fillStyle = INK; g.fillRect(0, 0, w, h);
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "source-over"; q.clearRect(0, 0, w, h);
    q.drawImage(src, 0, 0);
    q.globalCompositeOperation = "destination-in";
    for (let k = 0; k < 8; k++) { const an = k * TAU / 8; q.drawImage(src, Math.cos(an) * rim, Math.sin(an) * rim); }
    q.globalCompositeOperation = "source-in"; q.fillStyle = hex; q.fillRect(0, 0, w, h);
    q.globalCompositeOperation = "source-over";
    g.globalCompositeOperation = "source-over"; g.drawImage(tmp, 0, 0);
    return out;
  }
  // The whole snowflake from the wedge's mask: the wedge mirrored into all 12 slices of the sheet (an N px
  // square for the sheet from -1 to 1). tex = the paper; cr = its fold creases; sh = its shape in ink (for
  // shading a flap as it turns).
  function composeFlake(mk, hex, N, rim, creaseW) {
    const fm = mkCanvas(N), g = fm.getContext("2d");
    g.globalCompositeOperation = "lighter";
    const k = N / 2, ir = 1 / mk.res;
    SECTORS.forEach((sm) => {
      const T = mul([k, 0, 0, k, k, k], mul(sm, [ir, 0, 0, ir, MX0, MY0]));
      g.setTransform(T[0], T[1], T[2], T[3], T[4], T[5]);
      g.drawImage(mk.c, 0, 0);
    });
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over";
    const tex = rimify(fm, hex, rim);
    const cr = mkCanvas(N), c2 = cr.getContext("2d");
    c2.strokeStyle = INK; c2.lineWidth = creaseW;
    for (let j = 0; j < G.n; j++) {
      const an = (G.pAng + j * G.sig) * DEG, cx = Math.cos(an) * k, cy = Math.sin(an) * k;
      c2.beginPath(); c2.moveTo(k - cx, k - cy); c2.lineTo(k + cx, k + cy); c2.stroke();
    }
    c2.globalCompositeOperation = "destination-in"; c2.drawImage(fm, 0, 0);
    const sh = mkCanvas(N), c3 = sh.getContext("2d");
    c3.drawImage(fm, 0, 0); c3.globalCompositeOperation = "source-in"; c3.fillStyle = INK; c3.fillRect(0, 0, N, N);
    return { tex, cr, sh, N };
  }
  // A finished snowflake as one picture (s = CSS px per sheet unit), creases faintly baked in.
  function renderEntry(e, s) { return withType(e.t, () => renderEntryNow(e, s)); }
  function renderEntryNow(e, s) {
    const mk = newMask(clamp(s * dpr * 1.4, 160, 900));
    replay(mk, e.ops, e.drops);
    const N = Math.ceil(2 * s * dpr);
    const f = composeFlake(mk, COLORS[e.c].hex, N, Math.max(1, (s > 60 ? 1.8 : 1) * dpr), Math.max(0.8, 0.8 * dpr));
    const g = f.tex.getContext("2d");
    g.globalAlpha = 0.28; g.drawImage(f.cr, 0, 0); g.globalAlpha = 1;
    return { c: f.tex, s };
  }

  // =====================================================================================================
  // The window collection
  // =====================================================================================================
  // hung: [{ c: color, ops, drops, u, v (place on the glass, 0..1), r (its turn, rad) }], oldest first.
  function decodeOps(list) {
    if (!Array.isArray(list)) return null;
    const out = [];
    for (const o of list) {
      if (!o || typeof o !== "object") return null;
      if (o.k === "s" && Array.isArray(o.p) && o.p.length >= 2 && o.p.length % 2 === 0 && o.p.length <= 4000 && o.p.every(Number.isFinite)) out.push({ k: "s", p: o.p.map((v) => v / 1000) });
      else if (o.k === "n" && [0, 1, 2].includes(o.t) && [o.x, o.y, o.a].every(Number.isFinite)) out.push({ k: "n", t: o.t, x: o.x / 1000, y: o.y / 1000, a: o.a });
      else return null;
    }
    return out;
  }
  const encodeOps = (ops) => ops.map((o) => (o.k === "s" ? { k: "s", p: o.p.map((v) => Math.round(v * 1000)) } : { k: "n", t: o.t, x: Math.round(o.x * 1000), y: Math.round(o.y * 1000), a: Math.round(o.a) }));
  const decodeDrops = (d, nOps) => (Array.isArray(d) ? d.filter((x) => Array.isArray(x) && x.length === 3 && x.every(Number.isFinite) && x[0] >= 0 && x[0] < nOps).map((x) => [x[0], x[1] / 1000, x[2] / 1000]) : null);
  const encodeDrops = (d) => d.map((x) => [x[0], Math.round(x[1] * 1000), Math.round(x[2] * 1000)]);
  function decodeEntry(e) {
    if (!e || typeof e !== "object" || !okColor(e.c)) return null;
    const ops = decodeOps(e.ops); if (!ops) return null;
    const drops = decodeDrops(e.drops, ops.length); if (!drops) return null;
    if (![e.u, e.v, e.r].every(Number.isFinite)) return null;
    // Snowflakes saved before there were fold types are six-point ones.
    const t = TYPE_BY[e.t] != null ? TYPE_BY[e.t] : TYPE_BY.p6;
    return { t, c: e.c, ops, drops, u: clamp(e.u, 0, 1), v: clamp(e.v, 0, 1), r: e.r, pic: null };
  }
  let hung = Array.isArray(saved.window) ? saved.window.map(decodeEntry).filter(Boolean).slice(-WIN_MAX) : [];
  const leaving = [];
  hung.forEach((e, i) => { e.sway = 0; e.ph = i * 1.7; e.glint = -1; });
  const hungS = () => LY.flake / (2 * RP);
  function hungPic(e) {
    const s = hungS();
    if (!e.pic || Math.abs(e.pic.s - s) / s > 0.12) e.pic = renderEntry(e, s);
    return e.pic;
  }
  // Where a place on the glass is (stage px), kept inside the glass with a margin.
  function glassPt(u, v) {
    const g = LY.glass, m = LY.flake * 0.5;
    return { x: g.x + clamp(u * g.w, Math.min(m, g.w / 2), Math.max(g.w - m, g.w / 2)), y: g.y + clamp(v * g.h, Math.min(m, g.h / 2), Math.max(g.h - m, g.h / 2)) };
  }
  function glassUV(x, y) { const g = LY.glass; return { u: clamp((x - g.x) / g.w, 0, 1), v: clamp((y - g.y) / g.h, 0, 1) }; }
  // The free place on the glass farthest from the snowflakes already there.
  function bestSpot() {
    const g = LY.glass, wide = g.w >= g.h, cols = wide ? 4 : 3, rows = wide ? 3 : 4;
    let best = null, bd = -Infinity;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i + 0.5 + (hash(i, j) - 0.5) * 0.35) / cols, v = 0.08 + 0.92 * (j + 0.5 + (hash(j, i + 7) - 0.5) * 0.3) / rows;
      const p = glassPt(u, v);
      let d = 1e4;
      hung.forEach((e) => { const q = glassPt(e.u, e.v); d = Math.min(d, Math.hypot(p.x - q.x, p.y - q.y)); });
      // Ties go to the place nearest the middle of the glass.
      d -= Math.hypot(u - 0.5, v - 0.5) * 0.01 * LY.flake;
      if (d > bd) { bd = d; best = { u, v }; }
    }
    return best;
  }
  function addHung(e) {
    e.sway = 0; e.ph = Math.random() * 6; e.glint = now();
    hung.push(e);
    while (hung.length > WIN_MAX) { const old = hung.shift(); leaving.push({ e: old, t0: now() }); }
  }

  // =====================================================================================================
  // The sheet: fold and trim
  // =====================================================================================================
  // S.ph: "fold" (S.f folds done), "trim" (the scissors trim the top), "cut", "open" (unfolding), "hang" (the
  // snowflake waits to be hung), "hung" (it is on the window; a new sheet comes).
  const S = { ph: "fold", f: 0, c: 0, next: null, t: TYPE_BY.p6, nextT: null, ops: [], drops: [], mk: null, notchNext: 0 };
  let busy = false, drag = null, sheetId = 0, TEX = null, WD = null, WDtmp = null, wdDirty = true;
  const V = {
    fold: null, unfold: null, shown: 4, creaseA: 0.7, slide: 0, flutter: 0, crease: null,
    sc: { x: 0, y: 0, a: -Math.PI / 2, open: 0.5, snip: 0, held: false, dist: 0 },
    flake: null, flying: null, falls: [], breath: 0, halo: 0
  };
  const paperHex = () => COLORS[S.c].hex;
  // The camera for each moment.
  const camFold = (k) => {
    if (k === 0) return fitCam(FLAT[0], 0, LY.pf, tall ? 0.86 : 0.8);
    return fitCam(FLAT[k], G.rotFold, LY.pf, 0.88, camFold(0).s * 1.7);
  };
  const camCutPre = () => fitCam(FLAT[NF], G.rotCut, LY.ca, 0.88);
  const camCut = () => fitCam([WEDGE], G.rotCut, LY.ca, 0.88, Math.min(W, H) * 1.6);
  const camOpen = (k) => {
    const s0 = LY.rv.r / RP;
    if (k === 0) return { x: LY.rv.x, y: LY.rv.y, s: s0, r: G.rotRev * DEG };
    const a = LY.rv.r * 2;
    return fitCam(FLAT_STAR[k], G.rotRev, { x: LY.rv.x - a / 2, y: LY.rv.y - a / 2, w: a, h: a }, 0.9, s0 * 1.25);
  };
  function camNow() {
    if (S.ph === "fold") return camFold(S.f);
    if (S.ph === "trim") return camCutPre();
    if (S.ph === "cut") return camCut();
    return camOpen(0);
  }
  function camTween(to, dur) {
    const from = { x: cam.x, y: cam.y, s: cam.s, r: cam.r };
    return tween(dur, (p) => { const e = ease(p); cam = { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), s: lerp(from.s, to.s, e), r: lerp(from.r, to.r, e) }; }, null, 0, "sheet");
  }
  // The camera as drawn: a new sheet slides in from the side; a gust makes the paper flutter.
  function paperCam() {
    const fl = V.flutter > 0.002 ? Math.sin(now() * 13) * 0.035 * V.flutter : 0;
    return { x: cam.x + V.slide * W, y: cam.y, s: cam.s, r: cam.r + fl };
  }

  function newSheet(slide) {
    dropTag("sheet");
    sheetId++;
    busy = false; drag = null;
    if (S.next != null) { S.c = S.next; S.next = null; }
    if (S.nextT != null) { S.t = S.nextT; S.nextT = null; }
    useType(S.t);
    folds.set(GEO[S.t].id);
    S.ph = "fold"; S.f = 0; S.ops = []; S.drops = []; S.mk = null; S.notchNext = 0;
    TEX = null; WD = null;
    V.fold = null; V.unfold = null; V.flake = null; V.crease = null; V.falls = []; V.breath = 0;
    V.sc.held = false;
    cam = camFold(0);
    tiles.set(COLORS[S.c].id);
    panelSync();
    lastWant = "";
    if (slide && !reduce) {
      busy = true; V.slide = 1;
      tween(0.7, (p) => { V.slide = 1 - ease(p); }, () => { V.slide = 0; busy = false; ghost.poke(); }, 0, "sheet");
    } else V.slide = 0;
    scissorsHome(0.4);
    ghost.again();
    saveSoon();
  }
  // The paper's corner for the next fold and where it lands (stage px).
  function grabPts(c) {
    const G = GRAB[S.f];
    return { from: toScr(c || paperCam(), G.g[0], G.g[1]), to: toScr(c || paperCam(), G.to[0], G.to[1]) };
  }
  // Starts a fold that follows his finger: the corner goes as far across as his finger goes.
  function foldStart(sx, sy) {
    if (busy || S.ph !== "fold" || S.f >= NF || V.fold) return false;
    const c = paperCam(), f0 = fromScr(c, sx, sy);
    V.fold = { k: S.f, p: 0, f0, c };
    ghost.learned("fold");
    return true;
  }
  function foldMove(sx, sy) {
    const F = V.fold; if (!F || F.auto) return;
    const G = GRAB[F.k], f = fromScr(F.c, sx, sy);
    const s = -((f.x - F.f0.x) * G.n[0] + (f.y - F.f0.y) * G.n[1]);
    F.p = Math.acos(clamp((G.d0 - s) / G.d0, -1, 1)) / Math.PI;
    if (F.p > 0.93) foldFinish();
  }
  function foldRelease(still) {
    const F = V.fold; if (!F || F.auto) return;
    if (still || F.p >= 0.1) foldFinish();
    else {
      F.auto = true;
      const p0 = F.p;
      tween(0.25, (p) => { F.p = p0 * (1 - ease(p)); }, () => { V.fold = null; }, 0, "sheet");
      hint();
    }
  }
  // Lets the fold finish by itself, from wherever it is.
  function foldFinish() {
    const F = V.fold; if (!F || F.auto) return;
    F.auto = true; busy = true;
    const p0 = F.p, dur = 0.15 + 0.65 * (1 - p0);
    tween(dur, (p) => { F.p = lerp(p0, 1, reduce ? p : ease(p)); }, () => foldDone(F.k), 0, "sheet");
  }
  // A tap on the paper: the fold plays by itself.
  function foldTap() {
    if (busy || S.ph !== "fold" || S.f >= NF || V.fold) return;
    ghost.learned("fold");
    V.fold = { k: S.f, p: 0, c: paperCam() };
    foldFinish();
  }
  function foldDone(k) {
    V.fold = null;
    S.f = k + 1;
    // The new crease shines for a moment.
    V.crease = { k, t0: now() };
    lastWant = "";
    saveSoon();
    if (S.f >= NF) { startTrim(); return; }
    camTween(camFold(S.f), 0.65);
    later(0.65, () => { busy = false; ghost.poke(); }, "sheet");
  }
  // The scissors trim the top off the wedge, along the line that makes the six points.
  function startTrim() {
    S.ph = "trim"; busy = true; lastWant = "";
    const pre = camCutPre();
    camTween(pre, 0.8);
    const ext = 0.2, A2 = [TA[0] + (TA[0] - TB[0]) * ext, TA[1] + (TA[1] - TB[1]) * ext], B2 = [TB[0] + (TB[0] - TA[0]) * ext, TB[1] + (TB[1] - TA[1]) * ext];
    const a2 = toScr(pre, A2[0], A2[1]), b2 = toScr(pre, B2[0], B2[1]), ang = Math.atan2(b2.y - a2.y, b2.x - a2.x);
    const sc = V.sc, s0 = { x: sc.x, y: sc.y, a: sc.a };
    coach.say("The scissors cut the top off.", 3);
    tween(0.8, (p) => { const e = ease(p); sc.x = lerp(s0.x, a2.x, e); sc.y = lerp(s0.y, a2.y, e); sc.a = lerpAng(s0.a, ang, e); sc.open = lerp(0.5, 0.9, e); }, () => {
      let bitAt = 0;
      tween(reduce ? 0.8 : 1.1, (p) => {
        sc.x = lerp(a2.x, b2.x, p); sc.y = lerp(a2.y, b2.y, p);
        sc.open = 0.5 + 0.45 * Math.cos(p * TAU * 4);
        if (p > 0.15 && p < 0.85 && now() > bitAt) { bitAt = now() + 0.07; puff("bit", sc.x, sc.y, 1, paperHex()); }
      }, finishTrim, 0, "sheet");
    }, 0, "sheet");
  }
  function finishTrim() {
    S.ph = "cut";
    startMask();
    const c = paperCam();
    V.falls.push({ polys: SCRAPS, c, t0: now(), dur: 1.25, vx: 40, spin: 0.7 });
    scissorsHome(0.5);
    camTween(camCut(), 0.7);
    later(0.7, () => { busy = false; panelSync(); lastWant = ""; ghost.poke(); }, "sheet");
    saveSoon();
  }
  // The live mask for cutting, made as sharp as the wedge is on screen.
  function startMask() {
    S.mk = newMask(clamp(camCut().s * dpr, 360, 1000));
    wdDirty = true;
  }
  function rebuildWD() {
    const mk = S.mk;
    if (!WD || WD.width !== mk.c.width) { WD = mkCanvas(mk.c.width); WDtmp = mkCanvas(mk.c.width); }
    rimify(mk.c, paperHex(), Math.max(1.5, 2 * mk.res / camCut().s), WD, WDtmp);
    wdDirty = false;
  }

  // =====================================================================================================
  // The sheet: cut, open and hang
  // =====================================================================================================
  // The scissors come to his finger; dragging cuts along the path. (sx, sy) stage px.
  let cutOp = null;
  const inWedge = (f, m) => {
    // Inside the trimmed wedge, grown by m units.
    const ang = Math.atan2(f.y, f.x) / DEG, r = Math.hypot(f.x, f.y);
    if (ang < G.w0 - m * 90 / Math.max(r, 0.05) || ang > G.w1 + m * 90 / Math.max(r, 0.05)) return false;
    const nx = -(TB[1] - TA[1]), ny = TB[0] - TA[0], ln = Math.hypot(nx, ny);
    return ((f.x - TA[0]) * nx + (f.y - TA[1]) * ny) / ln <= m;
  };
  function scissorsTo(sx, sy) {
    const sc = V.sc;
    sc.x = sx; sc.y = sy; sc.held = true;
  }
  function cutStart(sx, sy) {
    if (busy || S.ph !== "cut" || !S.mk) return false;
    const f = fromScr(cam, sx, sy);
    scissorsTo(sx, sy);
    cutOp = { k: "s", p: [f.x, f.y] };
    S.ops.push(cutOp);
    applyOp(S.mk, cutOp, 0);
    wdDirty = true;
    ghost.learned("cut");
    return true;
  }
  function cutMove(sx, sy) {
    if (!cutOp) return;
    const sc = V.sc, dx = sx - sc.x, dy = sy - sc.y, d = Math.hypot(dx, dy);
    if (d > 0.5) {
      // The blades turn toward where he cuts, a little at a time; they open and close as he goes.
      // The tips stay pointing up and lean toward the way he cuts, so the handles stay under his hand.
      const want = -Math.PI / 2 + clamp(dx / d, -1, 1) * 0.7;
      if (d > 2) sc.a = lerpAng(sc.a, want, Math.min(1, d / 60));
      sc.dist += d;
      sc.open = 0.5 + 0.45 * Math.cos(sc.dist * 0.09);
    }
    sc.x = sx; sc.y = sy;
    const f = fromScr(cam, sx, sy), p = cutOp.p, lx = p[p.length - 2], ly = p[p.length - 1];
    const step = Math.hypot(f.x - lx, f.y - ly);
    if (step < 0.012) return;
    // Long jumps (a fast finger) are cut as one straight line.
    if (p.length < 4000) {
      p.push(f.x, f.y);
      applyOp(S.mk, cutOp, p.length / 2 - 1);
      wdDirty = true;
      if (inWedge(f, 0) && Math.random() < 0.5) puff("bit", sx, sy, 1, paperHex());
    }
  }
  function cutEnd(still) {
    const op = cutOp;
    cutOp = null;
    if (!op) return;
    if (still && op.p.length <= 4) {
      // A finger held still: a notch, as a tap does. The dot it cut is put back by redoing the mask.
      S.ops.pop();
      rebuildMask();
      const f = { x: op.p[0], y: op.p[1] };
      notchAt(f.x, f.y);
      return;
    }
    afterCut();
  }
  function rebuildMask() {
    S.mk = newMask(S.mk.res);
    replay(S.mk, S.ops, S.drops);
    wdDirty = true;
  }
  // After each cut: pieces cut off from the middle fall away.
  function afterCut() {
    const i = S.ops.length - 1;
    const fall = settle(S.mk, paperHex(), true);
    fall.forEach((f) => {
      S.drops.push([i, f.x, f.y]);
      if (f.cv) V.falls.push({ cv: f.cv, mx: f.mx, my: f.my, ox: MX0, oy: MY0, res: S.mk.res, c: { x: cam.x, y: cam.y, s: cam.s, r: cam.r }, t0: now(), dur: 1.2, vx: (Math.random() - 0.5) * 60, spin: (Math.random() - 0.5) * 1.6 });
    });
    if (fall.length) wdDirty = true;
    lastWant = "";
    saveSoon();
  }
  // A notch at a spot (flat units). Close to an edge it is cut into that edge.
  function notchAt(fx, fy) {
    if (busy || S.ph !== "cut" || !S.mk) return;
    const edges = [
      { a: [0, 0], b: dirPt(G.w0, RP * 1.05), n: [-Math.sin(G.w0 * DEG), Math.cos(G.w0 * DEG)] },
      { a: [0, 0], b: dirPt(G.w1, RP * 1.05), n: [Math.sin(G.w1 * DEG), -Math.cos(G.w1 * DEG)] },
      { a: TA, b: TB, n: null }
    ];
    let best = null, bd = 0.09;
    edges.forEach((e) => {
      const ex = e.b[0] - e.a[0], ey = e.b[1] - e.a[1], t = clamp(((fx - e.a[0]) * ex + (fy - e.a[1]) * ey) / (ex * ex + ey * ey), 0, 1);
      const px = e.a[0] + ex * t, py = e.a[1] + ey * t, d = Math.hypot(fx - px, fy - py);
      if (d < bd) {
        let n = e.n;
        if (!n) { const ln = Math.hypot(ex, ey); n = [ey / ln, -ex / ln]; if (n[0] * (0 - px) + n[1] * (0 - py) < 0) n = [-n[0], -n[1]]; }
        bd = d; best = { x: px, y: py, n };
      }
    });
    let op;
    const t = S.notchNext;
    S.notchNext = (S.notchNext + 1) % 3;
    if (best) op = { k: "n", t, x: best.x, y: best.y, a: Math.atan2(best.n[1], best.n[0]) / DEG };
    else op = { k: "n", t, x: fx, y: fy, a: Math.atan2(-fy, -fx) / DEG };
    S.ops.push(op);
    applyOp(S.mk, op);
    wdDirty = true;
    const p = toScr(cam, op.x, op.y);
    snipAt(p.x, p.y);
    puff("bit", p.x, p.y, 5, paperHex());
    ghost.learned("cut");
    afterCut();
  }
  // The scissors go to a spot and snip once.
  function snipAt(sx, sy) {
    scissorsTo(sx, sy);
    V.sc.snip = 1;
  }
  function scissorsHome(dur) {
    const sc = V.sc, s0 = { x: sc.x, y: sc.y, a: sc.a }, r = LY.rest;
    sc.held = false;
    if (!dur || !s0.x) { sc.x = r.x; sc.y = r.y; sc.a = r.a; sc.open = 0.25; return; }
    tween(dur, (p) => { const e = ease(p); sc.x = lerp(s0.x, r.x, e); sc.y = lerp(s0.y, r.y, e); sc.a = lerpAng(s0.a, r.a, e); sc.open = lerp(sc.open, 0.25, e); });
  }
  const lerpAng = (a, b, t) => { let d = ((b - a) % TAU + TAU * 1.5) % TAU - Math.PI; return a + d * t; };

  // Open: the paper unfolds back through the folds and the snowflake grows big in the middle.
  function texN() { const sMax = Math.max(camCut().s, LY.rv.r / RP); return Math.round(clamp(2 * sMax * dpr, 400, W < 700 ? 1200 : 1600)); }
  function makeTex() {
    const N = texN(), su = N / 2, sr = LY.rv.r / RP;   // tex px per unit; stage px per unit at the reveal
    TEX = composeFlake(S.mk, paperHex(), N, Math.max(1.5, 2.1 * su / sr), Math.max(1, 1.4 * su / sr));
  }
  function openPaper() {
    if (S.ph !== "cut" || busy || locked() || !S.mk) return;
    if (drag) { drag = null; cutOp = null; }
    busy = true; S.ph = "open"; lastWant = "";
    ghost.learned("open");
    panelSync();
    makeTex();
    scissorsHome(0.5);
    V.shown = NF; V.creaseA = 0.75;
    let k = NF - 1;
    const step = () => {
      if (k < 0) { reveal(); return; }
      const kk = k;
      V.unfold = { k: kk, p: 1 };
      camTween(camOpen(kk), 0.8);
      const c0 = V.creaseA, c1 = 0.75 - (NF - kk) * 0.44 / NF;
      tween(0.8, (p) => { V.unfold.p = 1 - ease(p); V.creaseA = lerp(c0, c1, p); }, () => {
        V.unfold = null; V.shown = kk; k--;
        later(0.12, step, "sheet");
      }, 0, "sheet");
    };
    later(0.15, step, "sheet");
  }
  function reveal() {
    S.ph = "hang";
    const c = camOpen(0);
    V.flake = { x: c.x, y: c.y, s: c.s, rot: c.r, spin: 0 };
    V.breath = 1; V.halo = 0;
    tween(0.8, (p) => { V.breath = 1 - p; V.halo = ease(p); }, null, 0, "sheet");
    for (let j = 0; j < G.n; j++) {
      const an = c.r + (G.pAng + j * 360 / G.n) * DEG;
      puff("twinkle", c.x + Math.cos(an) * c.s * RP, c.y + Math.sin(an) * c.s * RP, 1);
    }
    puff("spark", c.x, c.y, 10, "#FFFFFF");
    coach.say("Real snowflakes have six points too.", 3.5);
    busy = false; lastWant = "";
    panelSync();
    saveSoon();
  }
  // Hang it: it flies to a place on the glass and sticks there.
  function hangAt(u, v) {
    if (S.ph !== "hang" || busy || !V.flake || locked()) return;
    busy = true; drag = null;
    ghost.learned("hang");
    const f = V.flake, id = sheetId, entry = { t: S.t, c: S.c, ops: S.ops.slice(), drops: S.drops.slice(), u, v, r: 0, pic: null };
    V.flake = null; V.flying = f;
    const tgt = glassPt(u, v), s1 = hungS(), x0 = f.x, y0 = f.y, s0 = f.s;
    tween(0.75, (p) => { const e = ease(p); f.x = lerp(x0, tgt.x, e); f.y = lerp(y0, tgt.y, e) - Math.sin(p * Math.PI) * 30; f.s = lerp(s0, s1, e); }, () => {
      entry.r = f.rot + f.spin;
      addHung(entry);
      hungPic(entry);
      V.flying = null;
      puff("spark", tgt.x, tgt.y, 8, "#FFFFFF");
      save();
      if (sheetId !== id) return;
      S.ph = "hung"; busy = false;
      Toybox.kind();
      coach.say("The snowflake is on the window.", 3);
      later(1.6, () => { if (sheetId === id) newSheet(true); }, "sheet");
    });
  }
  function flakeBack() {
    const f = V.flake; if (!f) return;
    const c = camOpen(0), x0 = f.x, y0 = f.y, s0 = f.s;
    tween(0.4, (p) => { const e = ease(p); f.x = lerp(x0, c.x, e); f.y = lerp(y0, c.y, e); f.s = lerp(s0, c.s, e); }, null, 0, "sheet");
  }
  // While he carries it, the snowflake shrinks as it comes near the window.
  function carryTo(x, y) {
    const f = V.flake, g = LY.glass, c = camOpen(0);
    f.x = x; f.y = y;
    const dx = Math.max(g.x - x, 0, x - g.x - g.w), dy = Math.max(g.y - y, 0, y - g.y - g.h), d = Math.hypot(dx, dy);
    const t = ease(1 - clamp(d / (LY.rv.r * 1.2), 0, 1));
    f.s = lerp(c.s * 0.92, hungS() * 1.3, t);
  }
  const overGlass = (x, y) => { const g = LY.glass; return x > g.x - 12 && x < g.x + g.w + 12 && y > g.y - 12 && y < g.y + g.h + 12; };

  // The big view of a hung snowflake: it comes off the glass big for a few seconds, glinting.
  let big = null;
  function openBig(i) {
    const e = hung[i]; if (!e) return;
    if (!e.bigPic || Math.abs(e.bigPic.s - LY.rv.r / RP) > 2) e.bigPic = renderEntry(e, LY.rv.r / RP);
    big = { e, a: 0, t0: now(), closing: false };
    e.glint = now();
    tween(0.4, (p) => { if (big && big.e === e && !big.closing) big.a = ease(p); });
    lastWant = "";
    coach.busy();
    ghost.stop();
  }
  function closeBig() {
    if (!big || big.closing) return;
    const b = big; b.closing = true;
    const a0 = b.a;
    tween(0.35, (p) => { b.a = a0 * (1 - ease(p)); }, () => { if (big === b) big = null; lastWant = ""; });
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
  function rgba(hex, a) { const c = hexRgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  // A four-point twinkle (a glint of light).
  function twinkle(x, y, r, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4, rr2 = k % 2 ? r * 0.18 : r; ctx.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); }
    ctx.closePath(); ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.restore();
  }
  // A real snowflake (an ice crystal): six arms, each with two pairs of side branches.
  function crystal(x, y, r, rot, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
    ctx.lineCap = "round";
    const arms = () => {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const an = k * Math.PI / 3, c = Math.cos(an), s = Math.sin(an);
        ctx.moveTo(0, 0); ctx.lineTo(c * r, s * r);
        [0.45, 0.72].forEach((t, j) => {
          const bx = c * r * t, by = s * r * t, l = r * (j ? 0.22 : 0.3);
          [1, -1].forEach((sg) => { const b = an + sg * Math.PI / 3; ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(b) * l, by + Math.sin(b) * l); });
        });
      }
    };
    arms(); ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.lineWidth = Math.max(3, r * 0.2); ctx.stroke();
    arms(); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = Math.max(1.6, r * 0.1); ctx.stroke();
    ctx.restore();
  }
  function ringAt(x, y, r, pulse) {
    ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 4, 0, TAU);
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
  }
  function polyPath(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); }

  // =====================================================================================================
  // Drawing the room and the window
  // =====================================================================================================
  let skyGrad = null;
  const SNOW = Array.from({ length: 70 }, (_, i) => ({ u: hash(i, 1), v: hash(i, 2), sp: 0.035 + hash(i, 3) * 0.05, sz: 0.6 + hash(i, 4), ph: hash(i, 5) * TAU }));
  let wind = 0, heavy = 0, lightsBright = 0;
  const TREES = [{ u: 0.12, h: 0.36 }, { u: 0.24, h: 0.24 }, { u: 0.8, h: 0.42 }, { u: 0.92, h: 0.27 }];
  function drawWall() {
    ctx.fillStyle = "#F7E8D0"; ctx.fillRect(0, 0, W, H);
    // Soft wallpaper stripes.
    ctx.fillStyle = "rgba(226,196,156,0.25)";
    const sw = Math.max(18, Math.min(W, H) * 0.05);
    for (let x = sw * 0.5; x < W; x += sw * 2) ctx.fillRect(x, 0, sw * 0.5, H);
  }
  function drawOutside(t, dt) {
    const g = LY.glass;
    ctx.save();
    ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    if (!skyGrad) { skyGrad = ctx.createLinearGradient(0, g.y, 0, g.y + g.h); skyGrad.addColorStop(0, "#22397A"); skyGrad.addColorStop(1, "#5D80C9"); }
    ctx.fillStyle = skyGrad; ctx.fillRect(g.x, g.y, g.w, g.h);
    const m = Math.min(g.w, g.h);
    // The moon.
    ctx.fillStyle = "#FFF6D6"; ctx.beginPath(); ctx.arc(g.x + g.w * 0.72, g.y + g.h * 0.2, m * 0.08, 0, TAU); ctx.fill();
    // Snowy hills.
    const hill = (y0, amp, ph, col) => {
      ctx.beginPath(); ctx.moveTo(g.x, g.y + g.h);
      for (let i = 0; i <= 24; i++) { const u = i / 24; ctx.lineTo(g.x + u * g.w, g.y + g.h * y0 - Math.sin(u * 3.1 + ph) * amp * g.h); }
      ctx.lineTo(g.x + g.w, g.y + g.h); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    };
    hill(0.7, 0.07, 0.4, "#C9DAF2");
    // Pine trees with snow on them.
    TREES.forEach((tr) => {
      const x = g.x + tr.u * g.w, base = g.y + g.h * (0.86 - Math.sin(tr.u * 3.1 + 1.2) * 0.04), th = tr.h * g.h, tw = th * 0.62;
      ctx.fillStyle = "#6B4A2E"; ctx.fillRect(x - tw * 0.07, base - th * 0.12, tw * 0.14, th * 0.14);
      for (let k = 0; k < 3; k++) {
        const y1 = base - th * (0.1 + k * 0.28), y2 = y1 - th * 0.42, w2 = tw * (1 - k * 0.24) / 2;
        ctx.beginPath(); ctx.moveTo(x - w2, y1); ctx.lineTo(x, y2); ctx.lineTo(x + w2, y1); ctx.closePath();
        ctx.fillStyle = "#2E7D4F"; ctx.fill(); ctx.strokeStyle = "#1D4A33"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - w2 * 0.45, y2 + (y1 - y2) * 0.45); ctx.lineTo(x, y2); ctx.lineTo(x + w2 * 0.45, y2 + (y1 - y2) * 0.45); ctx.closePath();
        ctx.fillStyle = "#FFFFFF"; ctx.fill();
      }
    });
    hill(0.88, 0.035, 1.9, "#F4F8FF");
    // Snow falling outside.
    const fall = 1 + heavy * 1.6;
    ctx.fillStyle = "#FFFFFF";
    SNOW.forEach((f, i) => {
      if (!reduce || i % 2 === 0) {
        f.v += f.sp * dt * fall * (reduce ? 0.6 : 1);
        f.u += (Math.sin(t * 0.8 + f.ph) * 0.012 + wind * 0.25) * dt;
        if (f.v > 1.02) { f.v -= 1.04; f.u = hash(i, Math.floor(t)); }
        f.u = ((f.u % 1) + 1) % 1;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(g.x + f.u * g.w, g.y + f.v * g.h, f.sz * Math.max(1.2, m * 0.008), 0, TAU); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    // A soft shine on the glass.
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.moveTo(g.x + g.w * 0.08, g.y + g.h); ctx.lineTo(g.x + g.w * 0.3, g.y); ctx.lineTo(g.x + g.w * 0.4, g.y); ctx.lineTo(g.x + g.w * 0.18, g.y + g.h); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function drawWindow(t, dt) {
    const w = LY.win, g = LY.glass, fw = LY.fw;
    // The sill.
    rr(w.x - fw * 0.9, w.y + w.h - fw * 0.4, w.w + fw * 1.8, fw * 1.5, 4);
    ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    rr(w.x, w.y, w.w, w.h, 8);
    ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    drawOutside(t, dt);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(g.x, g.y, g.w, g.h);
    // The window bars.
    const bw = Math.max(4, fw * 0.55);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(g.x + g.w / 2 - bw / 2, g.y, bw, g.h); ctx.strokeRect(g.x + g.w / 2 - bw / 2, g.y, bw, g.h);
    ctx.fillRect(g.x, g.y + g.h * 0.5 - bw / 2, g.w, bw); ctx.strokeRect(g.x, g.y + g.h * 0.5 - bw / 2, g.w, bw);
    drawHung(t);
    drawLights(t);
  }
  // Fairy lights along the top of the window, glowing softly.
  const LIGHT_COLS = ["#FF5C5C", "#FFD23B", "#4CC26B", "#3D8BFF"];
  function lightPts() {
    const w = LY.win, n = Math.max(7, Math.round(w.w / 34)), sag = Math.min(14, w.h * 0.06), pts = [];
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, seg = 3, su = (u * seg) % 1;
      pts.push({ x: w.x + u * w.w, y: w.y + 3 + Math.sin(su * Math.PI) * sag, c: LIGHT_COLS[i % 4], i });
    }
    return pts;
  }
  function drawLights(t) {
    const w = LY.win, sag = Math.min(14, w.h * 0.06), r = clamp(w.w * 0.012, 4, 7);
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const u = i / 60, su = (u * 3) % 1; const x = w.x - 4 + u * (w.w + 8), y = w.y + 3 + Math.sin(su * Math.PI) * sag; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = "#2E4A35"; ctx.lineWidth = 2; ctx.stroke();
    lightPts().forEach((p) => {
      const glow = reduce ? 0.55 : 0.4 + 0.3 * Math.sin(t * 1.6 + p.i * 1.3) + lightsBright * 0.5;
      ctx.fillStyle = rgba(p.c, clamp(glow * 0.45, 0, 0.7));
      ctx.beginPath(); ctx.arc(p.x, p.y + r * 1.4, r * 2.3, 0, TAU); ctx.fill();
      ctx.fillStyle = "#4A5578"; ctx.fillRect(p.x - r * 0.45, p.y - 1, r * 0.9, r * 0.8);
      ctx.beginPath(); ctx.ellipse(p.x, p.y + r * 1.25, r * 0.7, r, 0, 0, TAU);
      ctx.fillStyle = p.c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }
  function drawHung(t) {
    const flakeDraw = (e, x, y, s, rot, alpha) => {
      const pic = hungPic(e);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(x, y); ctx.rotate(rot);
      ctx.shadowColor = "rgba(29,35,64,0.35)"; ctx.shadowOffsetX = 1.5 * dpr; ctx.shadowOffsetY = 2 * dpr; ctx.shadowBlur = 2 * dpr;
      ctx.drawImage(pic.c, -s, -s, s * 2, s * 2);
      ctx.restore();
    };
    const s = hungS();
    hung.forEach((e, i) => {
      if (big && big.e === e) return;
      const p = glassPt(e.u, e.v);
      const sway = e.sway > 0.002 ? Math.sin(t * 3.2 + e.ph) * e.sway * 0.35 : 0;
      flakeDraw(e, p.x, p.y, s, e.r + sway, 1);
      if (e.glint > 0) {
        const q = (t - e.glint) / 0.8;
        if (q >= 0 && q <= 1) {
          const an = e.r + sway + GEO[e.t].pAng * DEG;
          twinkle(p.x + Math.cos(an) * s * RP * 0.8, p.y + Math.sin(an) * s * RP * 0.8, s * 0.55 * Math.sin(q * Math.PI), Math.sin(q * Math.PI));
        } else if (q > 1) e.glint = -1;
      }
      void i;
    });
    leaving.forEach((l) => {
      const q = (t - l.t0) / 1.1;
      const p = glassPt(l.e.u, l.e.v);
      if (q < 1) flakeDraw(l.e, p.x, p.y + q * q * 60, s, l.e.r + q, 1 - q);
    });
    for (let i = leaving.length - 1; i >= 0; i--) if (t - leaving[i].t0 > 1.1) leaving.splice(i, 1);
  }
  function drawTable() {
    const T = LY.table;
    rr(T.x, T.y, T.w, T.h, 14);
    ctx.fillStyle = "#E9B982"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    // Wood grain.
    ctx.save(); rr(T.x, T.y, T.w, T.h, 14); ctx.clip();
    ctx.strokeStyle = "rgba(160,98,45,0.22)"; ctx.lineWidth = 2;
    const n = 7;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      if (tall) { const y = T.y + (i + 0.6) * T.h / n; ctx.moveTo(T.x, y); ctx.bezierCurveTo(T.x + T.w * 0.3, y - 6, T.x + T.w * 0.6, y + 6, T.x + T.w, y - 2); }
      else { const x = T.x + (i + 0.6) * T.w / n; ctx.moveTo(x, T.y); ctx.bezierCurveTo(x - 6, T.y + T.h * 0.3, x + 6, T.y + T.h * 0.6, x - 2, T.y + T.h); }
      ctx.stroke();
    }
    ctx.restore();
    // The green cutting mat under the paper.
    const c = camFold(0), half = 1.12 * c.s, mx = c.x - half, my = c.y - half;
    rr(mx, my, half * 2, half * 2, 10);
    ctx.fillStyle = "#86CFA6"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); rr(mx, my, half * 2, half * 2, 10); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1;
    const step = half / 4.5;
    ctx.beginPath();
    for (let x = mx + step; x < mx + half * 2; x += step) { ctx.moveTo(x, my); ctx.lineTo(x, my + half * 2); }
    for (let y = my + step; y < my + half * 2; y += step) { ctx.moveTo(mx, y); ctx.lineTo(mx + half * 2, y); }
    ctx.stroke();
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing the paper and the scissors
  // =====================================================================================================
  // One facet as a flat paper polygon (before the trim).
  function drawFacet(c, f, A, lift) {
    let M = facetMat(f); if (A) M = mul(A, M);
    const T = mul(camMat(c), M), poly = facetPoly(f);
    ctx.beginPath();
    poly.forEach(([x, y], i) => { const X = T[0] * x + T[2] * y + T[4], Y = T[1] * x + T[3] * y + T[5]; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    ctx.fillStyle = paperHex();
    if (lift > 0.01) {
      ctx.save(); ctx.shadowColor = "rgba(29,35,64,0.28)"; ctx.shadowBlur = 14 * lift * dpr; ctx.shadowOffsetY = 6 * lift * dpr; ctx.fill(); ctx.restore();
      ctx.fillStyle = "rgba(29,35,64," + (0.16 * lift).toFixed(3) + ")"; ctx.fill();
    } else ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
  }
  // One facet drawn from the finished snowflake's picture (while it opens).
  function drawTexFacet(c, f, A, lift) {
    let M = facetMat(f); if (A) M = mul(A, M);
    if (Math.abs(M[0] * M[3] - M[1] * M[2]) < 0.02) return;
    const T = mul(camMat(c), M);
    ctx.save();
    ctx.setTransform(dpr * T[0], dpr * T[1], dpr * T[2], dpr * T[3], dpr * T[4], dpr * T[5]);
    if (f.a1 - f.a0 < 359) {
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let a = f.a0; ; a = Math.min(f.a1, a + 30)) { ctx.lineTo(2 * Math.cos(a * DEG), 2 * Math.sin(a * DEG)); if (a >= f.a1) break; }
      ctx.closePath(); ctx.clip();
    }
    const q = 2 / TEX.N;
    ctx.transform(q, 0, 0, q, -1, -1);
    ctx.drawImage(TEX.tex, 0, 0);
    if (V.creaseA > 0) { ctx.globalAlpha = V.creaseA; ctx.drawImage(TEX.cr, 0, 0); }
    if (lift > 0.01) { ctx.globalAlpha = 0.16 * lift; ctx.drawImage(TEX.sh, 0, 0); }
    ctx.restore();
  }
  const byZ = (a, b) => a.z - b.z;
  // A fold or an unfold in progress: the still layers, then the turning ones on top.
  function drawSplit(c, k, p, tex) {
    const sp = SPLITS[k], A = animMat(FOLDS[k].line, p), lift = Math.sin(Math.PI * p);
    sp.filter((f) => !f.mv).sort(byZ).forEach((f) => (tex ? drawTexFacet(c, f, null, 0) : drawFacet(c, f, null, 0)));
    const mv = sp.filter((f) => f.mv).sort(byZ);
    if (p > 0.5) mv.reverse();
    mv.forEach((f) => (tex ? drawTexFacet(c, f, A, lift) : drawFacet(c, f, A, lift)));
  }
  function drawPaper(t) {
    const c = paperCam();
    if (S.ph === "fold" || S.ph === "trim") {
      if (V.fold) drawSplit(c, V.fold.k, V.fold.p, false);
      else STATES[S.f].forEach((f) => drawFacet(c, f, null, 0));
      // The new crease shines for a moment.
      if (V.crease) {
        const q = (t - V.crease.t0) / 0.7;
        if (q > 1) V.crease = null;
        else {
          const L = FOLDS[V.crease.k].line * DEG, a = toScr(c, Math.cos(L) * 1.5, Math.sin(L) * 1.5), b = toScr(c, -Math.cos(L) * 1.5, -Math.sin(L) * 1.5);
          ctx.save(); ctx.beginPath();
          STATES[S.f].forEach((f) => { const T = mul(camMat(c), facetMat(f)); facetPoly(f).forEach(([x, y], i) => { const X = T[0] * x + T[2] * y + T[4], Y = T[1] * x + T[3] * y + T[5]; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); });
          ctx.clip();
          ctx.strokeStyle = "rgba(255,226,120," + (0.9 * Math.sin(q * Math.PI)).toFixed(3) + ")"; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          ctx.restore();
        }
      }
    } else if (S.ph === "cut") drawWedge(c);
    else if (S.ph === "open" && TEX) {
      if (V.unfold) drawSplit(c, V.unfold.k, V.unfold.p, true);
      else STATES[V.shown].slice().sort(byZ).forEach((f) => drawTexFacet(c, f, null, 0));
    } else if (S.ph === "hang" && V.flake && TEX) drawFlakeTex(V.flake, t, drag && drag.k === "carry");
    if (V.flying && TEX) drawFlakeTex(V.flying, t, true);
  }
  function drawWedge(c) {
    if (!S.mk) return;
    if (wdDirty || !WD) rebuildWD();
    const ir = 1 / S.mk.res, T = mul(camMat(c), [ir, 0, 0, ir, MX0, MY0]);
    ctx.save();
    ctx.setTransform(dpr * T[0], dpr * T[1], dpr * T[2], dpr * T[3], dpr * T[4], dpr * T[5]);
    ctx.shadowColor = "rgba(29,35,64,0.3)"; ctx.shadowOffsetY = 4 * dpr; ctx.shadowOffsetX = 2 * dpr; ctx.shadowBlur = 5 * dpr;
    ctx.drawImage(WD, 0, 0);
    ctx.restore();
  }
  // The finished snowflake: big, glinting at its points and turning slowly.
  function drawFlakeTex(f, t, carried) {
    const s = f.s * (1 + 0.06 * Math.sin(V.breath * Math.PI)), rot = f.rot + f.spin;
    if (!carried && V.halo > 0) {
      const gr = ctx.createRadialGradient(f.x, f.y, s * 0.2, f.x, f.y, s * 1.25);
      gr.addColorStop(0, "rgba(255,255,255," + (0.55 * V.halo).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, s * 1.25, 0, TAU); ctx.fill();
    }
    const q = 2 / TEX.N, co = Math.cos(rot) * s, si = Math.sin(rot) * s;
    const T = mul([co, si, -si, co, f.x, f.y], [q, 0, 0, q, -1, -1]);
    ctx.save();
    ctx.setTransform(dpr * T[0], dpr * T[1], dpr * T[2], dpr * T[3], dpr * T[4], dpr * T[5]);
    ctx.shadowColor = "rgba(29,35,64,0.25)"; ctx.shadowOffsetY = 4 * dpr; ctx.shadowBlur = 6 * dpr;
    ctx.drawImage(TEX.tex, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = 0.3; ctx.drawImage(TEX.cr, 0, 0);
    ctx.restore();
    // A glint runs round the points, one after another.
    if (!carried) {
      const per = 0.7, j = Math.floor(t / per) % G.n, ph = (t % per) / per;
      const an = rot + (G.pAng + j * 360 / G.n) * DEG;
      twinkle(f.x + Math.cos(an) * s * RP * 0.92, f.y + Math.sin(an) * s * RP * 0.92, s * 0.13 * Math.sin(ph * Math.PI), Math.sin(ph * Math.PI));
    }
  }
  // Falling pieces: the trimmed-off top and the pieces cut free.
  function drawFalls(t) {
    V.falls = V.falls.filter((fl) => {
      const q = (t - fl.t0) / fl.dur;
      if (q >= 1) return false;
      const dy = q * q * 260, dx = fl.vx * q, an = fl.spin * q;
      ctx.save();
      ctx.globalAlpha = 1 - ease(q);
      const cx = fl.c.x, cy = fl.c.y;
      // Turn about the paper's middle as it falls.
      const R = [Math.cos(an), Math.sin(an), -Math.sin(an), Math.cos(an), 0, 0];
      const pre = mul([1, 0, 0, 1, cx + dx, cy + dy], mul(R, [1, 0, 0, 1, -cx, -cy]));
      if (fl.polys) {
        const T = mul(pre, camMat(fl.c));
        fl.polys.forEach((poly) => {
          ctx.beginPath();
          poly.forEach(([x, y], i) => { const X = T[0] * x + T[2] * y + T[4], Y = T[1] * x + T[3] * y + T[5]; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
          ctx.closePath(); ctx.fillStyle = paperHex(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
        });
      } else {
        const ir = 1 / fl.res, T = mul(pre, mul(camMat(fl.c), [ir, 0, 0, ir, fl.ox + fl.mx * ir, fl.oy + fl.my * ir]));
        ctx.setTransform(dpr * T[0], dpr * T[1], dpr * T[2], dpr * T[3], dpr * T[4], dpr * T[5]);
        ctx.drawImage(fl.cv, 0, 0);
      }
      ctx.restore();
      return true;
    });
  }
  function drawParts() {
    parts.forEach((p) => {
      const a = 1 - p.t / p.life;
      if (p.kind === "bit") {
        ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.moveTo(-p.size, -p.size * 0.6); ctx.lineTo(p.size, -p.size * 0.3); ctx.lineTo(-p.size * 0.2, p.size * 0.7); ctx.closePath();
        ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      } else if (p.kind === "spark") {
        ctx.fillStyle = rgba(p.color, a); ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.35 * (0.5 + a), 0, TAU); ctx.fill();
      } else if (p.kind === "twinkle") twinkle(p.x, p.y, p.size * Math.sin(Math.PI * p.t / p.life), Math.sin(Math.PI * p.t / p.life));
    });
  }
  // Kid's craft scissors with round-tipped steel blades and blue handles. (x, y) is where they cut (where the
  // blades cross), a is the way the tips point, open 0..1, sz the length in px.
  function drawScissors(x, y, a, open, sz) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a); ctx.scale(sz, sz); ctx.translate(-0.24, 0);
    const lw = 2 / sz, th = 0.03 + clamp(open, 0, 1) * 0.24;
    const piece = (sg) => {
      ctx.save(); ctx.rotate(-sg * th);
      // Handle loop (on the other side of the screw).
      ctx.beginPath();
      ctx.moveTo(0.02, -0.025 * sg); ctx.lineTo(-0.14, 0.03 * sg); ctx.lineTo(-0.15, 0.085 * sg); ctx.lineTo(0.0, 0.035 * sg); ctx.closePath();
      ctx.fillStyle = "#2F8CFF"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-0.27, 0.105 * sg, 0.135, 0.09, -0.2 * sg, 0, TAU);
      ctx.ellipse(-0.275, 0.105 * sg, 0.082, 0.045, -0.2 * sg, 0, TAU);
      ctx.fillStyle = "#2F8CFF"; ctx.fill("evenodd"); ctx.stroke();
      // Blade: a straight cutting edge along the middle, a rounded tip.
      ctx.beginPath();
      ctx.moveTo(-0.03, 0.012 * sg);
      ctx.lineTo(0.08, -0.058 * sg);
      ctx.lineTo(0.42, -0.046 * sg);
      ctx.quadraticCurveTo(0.58, -0.034 * sg, 0.56, 0.004 * sg);
      ctx.lineTo(0.3, 0.008 * sg);
      ctx.lineTo(0.0, 0.016 * sg);
      ctx.closePath();
      ctx.fillStyle = "#DCE3EC"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0.1, -0.038 * sg); ctx.lineTo(0.42, -0.03 * sg);
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = lw * 1.2; ctx.stroke();
      ctx.restore();
    };
    piece(-1); piece(1);
    ctx.beginPath(); ctx.arc(0, 0, 0.032, 0, TAU);
    ctx.fillStyle = "#AEB8C8"; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke();
    ctx.restore();
  }
  function drawSc() {
    const sc = V.sc;
    const open = sc.snip > 0 ? sc.open * (1 - Math.sin(sc.snip * Math.PI)) : sc.open;
    drawScissors(sc.x, sc.y, sc.a, open, LY.sc);
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  function want() {
    if (busy || big || locked()) return null;
    if (S.ph === "fold") return { line: G.lines[S.f], part: "corner" };
    if (S.ph === "cut") return S.ops.length < 3 ? { line: "Cut shapes into the paper.", part: "wedge" } : { line: "Cut more, or open the paper.", part: "open" };
    if (S.ph === "hang") return { line: "Hang the snowflake on the window.", part: "flake" };
    return null;
  }
  function wedgeScr(c) { return WEDGE.map(([x, y]) => toScr(c || cam, x, y)); }
  function partPt(part) {
    if (part === "corner") { const g = grabPts(); return { x: g.from.x, y: g.from.y, r: 26 }; }
    if (part === "wedge" || part === "open") { const w = wedgeScr(); return { x: (w[0].x + w[1].x + w[2].x) / 3, y: (w[0].y + w[1].y + w[2].y) / 3, r: 60 }; }
    if (part === "flake" && V.flake) return { x: V.flake.x, y: V.flake.y, r: V.flake.s * RP };
    if (part === "glass") return { x: LY.glass.x + LY.glass.w / 2, y: LY.glass.y + LY.glass.h / 2, r: 40 };
    if (part === "scissors") return { x: V.sc.x, y: V.sc.y + LY.sc * 0.2, r: 40 };
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || drag) return;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    if (w.part === "corner") { if (V.fold) return; const p = partPt("corner"); ringAt(p.x, p.y, p.r, pulse); }
    else if (w.part === "wedge" || w.part === "open") {
      if (w.part === "open" && pulse < -1) return;
      const pts = wedgeScr();
      ctx.save(); ctx.lineJoin = "round";
      polyPath(pts); ctx.strokeStyle = INK; ctx.lineWidth = 8 + pulse * 3; ctx.globalAlpha = w.part === "open" ? 0.35 : 0.8; ctx.stroke();
      polyPath(pts); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4 + pulse * 3; ctx.stroke();
      ctx.restore();
    } else if (w.part === "flake" && V.flake) {
      ringAt(V.flake.x, V.flake.y, V.flake.s * RP + 4, pulse);
      const g = LY.glass;
      ctx.save(); ctx.globalAlpha = 0.6 + 0.4 * pulse;
      rr(g.x - 4, g.y - 4, g.w + 8, g.h + 8, 8); ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.setLineDash([12, 8]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = "";
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if (drag || big) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    const p = partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  function openBtnPt() { const r = openBtn.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  // The ghost hand shows a tap first and the real move (a drag) after that.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag || big) return null;
      const w = want();
      if (!w) return null;
      const P = (p) => { const v = vp(p.x, p.y); return [v.x, v.y]; };
      if (w.part === "corner") {
        const g = grabPts(), first = ghost.shown("fold") < 1;
        return first ? { pts: [P(g.from)], tap: true, key: "fold" } : { pts: [P(g.from), P(g.to)], dur: 1600, key: "fold" };
      }
      if (w.part === "wedge") {
        const first = ghost.shown("cut") < 1, c = cam;
        if (first) return { pts: [P(toScr(c, 0.42, 0.27))], tap: true, key: "cut" };
        // A V-shaped snip into the side of the wedge and back out.
        const pts = [[0.38, 0.03], [0.5, 0.25], [0.6, 0.06]].map(([x, y]) => P(toScr(c, x, y)));
        return { pts, dur: 1800, key: "cut" };
      }
      if (w.part === "open") return { pts: [openBtnPt()], tap: true, key: "open" };
      if (w.part === "flake" && V.flake) {
        const first = ghost.shown("hang") < 1, sp = bestSpot();
        return first ? { pts: [P(V.flake)], tap: true, key: "hang" } : { pts: [P(V.flake), P(glassPt(sp.u, sp.v))], dur: 1700, key: "hang" };
      }
      return null;
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 12, 1800); }
  const inPoly = (pts, x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  };
  const inRect = (r, x, y, m) => x >= r.x - (m || 0) && x <= r.x + r.w + (m || 0) && y >= r.y - (m || 0) && y <= r.y + r.h + (m || 0);
  function onPaper(x, y) {
    const c = paperCam();
    return STATES[S.f].some((f) => { const T = mul(camMat(c), facetMat(f)); return inPoly(facetPoly(f).map(([px, py]) => ({ x: T[0] * px + T[2] * py + T[4], y: T[1] * px + T[3] * py + T[5] })), x, y); });
  }
  function onScissors(x, y) {
    const sc = V.sc, dx = x - sc.x, dy = y - sc.y, co = Math.cos(-sc.a), si = Math.sin(-sc.a);
    const lx = (dx * co - dy * si) / LY.sc + 0.24, ly = (dx * si + dy * co) / LY.sc;
    return lx > -0.45 && lx < 0.6 && Math.abs(ly) < 0.22;
  }
  function hungAt(x, y) {
    const s = LY.flake * 0.55;
    let best = -1, bd = Infinity;
    hung.forEach((e, i) => { const p = glassPt(e.u, e.v), d = Math.hypot(x - p.x, y - p.y); if (d < s && d < bd) { bd = d; best = i; } });
    return best;
  }
  function onLights(x, y) { return lightPts().some((p) => Math.hypot(x - p.x, y - p.y - 6) < 16); }
  // The part under a press (client px).
  function hitPart(cx, cy) {
    if (locked()) return null;
    const { x, y } = local(cx, cy);
    if (big) return "big";
    if (S.ph === "hang" && V.flake && Math.hypot(x - V.flake.x, y - V.flake.y) < Math.max(V.flake.s * RP, 40)) return "flake";
    if (S.ph === "fold" && !busy) {
      const g = grabPts();
      if (Math.hypot(x - g.from.x, y - g.from.y) < 44 || onPaper(x, y)) return "paper";
    }
    if (S.ph === "cut") {
      if (inPoly(wedgeScr(), x, y) || inWedge(fromScr(cam, x, y), 0.05)) return "paper";
      if (onScissors(x, y)) return "scissors";
    }
    if (S.ph !== "cut" && onScissors(x, y)) return "scissors";
    if (onLights(x, y)) return "lights";
    const hi = hungAt(x, y);
    if (hi >= 0) return "hung" + hi;
    if (inRect(LY.glass, x, y)) return "glass";
    if (inRect(LY.win, x, y, LY.fw)) return "frame";
    if (S.ph === "fold" || S.ph === "trim") { const c = camFold(0), h = 1.12 * c.s; if (Math.abs(x - c.x) < h && Math.abs(y - c.y) < h) return "mat"; }
    if (inRect(LY.table, x, y)) return "table";
    return "wall";
  }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    ghost.poke();
  }
  // A tap: each part does its own one motion; parts not needed right now still answer.
  function doTap(part, x, y) {
    if (locked() || part == null) return;
    if (part === "big") { closeBig(); return; }
    const ph = S.ph;
    if (part === "flake") { if (ph === "hang") hangAt(...Object.values(bestSpot())); return; }
    if (part === "paper") {
      if (ph === "fold") foldTap();
      else if (ph === "cut") { const f = fromScr(cam, x, y); notchAt(f.x, f.y); }
      return;
    }
    if (part === "scissors") {
      V.sc.snip = 1; tag("Scissors", V.sc.x, V.sc.y - LY.sc * 0.35);
      if (ph === "fold") hint();
      return;
    }
    if (part === "lights") { lightsBright = 1; tag("Fairy lights", x, y + 8); return; }
    if (/^hung\d+$/.test(part)) {
      const i = +part.slice(4);
      if (ph === "hang" && !busy) { const e = hung[i], u = clamp(e.u + 0.12, 0, 1), v = e.v; hangAt(u, v); return; }
      openBig(i);
      return;
    }
    if (part === "glass") {
      if (ph === "hang" && !busy) { const g = glassUV(x, y); hangAt(g.u, g.v); return; }
      heavy = Math.max(heavy, 0.6); tag("Snow", x, y);
      return;
    }
    if (part === "frame") { tag("Window", x, y); return; }
    if (ph === "cut" && !busy) { snipAt(x, y); return; }
    if (part === "mat") { tag("Cutting mat", x, y); if (ph === "fold") hint(); return; }
    if (part === "table") { tag("Craft table", x, y); hint(); return; }
    hint();
  }
  // Drags: one finger owns a drag (drag.pid); other fingers are ignored until it lifts.
  const SLOP = 12;
  let skipTap = false;
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    // In the cut step the scissors come to his finger as soon as he touches the paper.
    down: (part, e, s) => {
      if (drag || locked() || big) return;
      if (S.ph === "cut" && !busy && (part === "paper" || part === "scissors")) { const p = local(s.x0, s.y0); scissorsTo(p.x, p.y); }
    },
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null || big) return;
      const p0 = local(s.x0, s.y0), p = local(s.x, s.y);
      if (S.ph === "fold" && part === "paper" && !busy) {
        if (foldStart(p0.x, p0.y)) { drag = { k: "fold" }; foldMove(p.x, p.y); }
      } else if (S.ph === "cut" && !busy) {
        // Cutting is the job here: a drag from anywhere brings the scissors and cuts.
        if (cutStart(p0.x, p0.y)) { drag = { k: "cut" }; cutMove(p.x, p.y); }
      } else if (S.ph === "hang" && part === "flake" && !busy && V.flake) {
        drag = { k: "carry", ox: V.flake.x - p0.x, oy: V.flake.y - p0.y };
        ghost.learned("hang");
        carryTo(p.x + drag.ox, p.y + drag.oy);
      }
      if (!drag) drag = { k: "hold", part };
      drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy);
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const p = local(s.x, s.y);
      if (drag.k === "fold") foldMove(p.x, p.y);
      else if (drag.k === "cut") cutMove(p.x, p.y);
      else if (drag.k === "carry" && V.flake) carryTo(p.x + drag.ox, p.y + drag.oy);
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      const p = local(s.x, s.y);
      if (d.k === "hold") { if (still && !locked()) { const p0 = local(s.x0, s.y0); doTap(d.part, p0.x, p0.y); } }
      else if (d.k === "fold") foldRelease(still);
      else if (d.k === "cut") { cutEnd(still); if (!locked()) skipTap = s.tap; }
      else if (d.k === "carry" && V.flake) {
        if (still) hangAt(...Object.values(bestSpot()));
        else if (overGlass(V.flake.x, V.flake.y)) { const g = glassUV(V.flake.x, V.flake.y); hangAt(g.u, g.v); }
        else { flakeBack(); hint(); }
      }
      void p;
    },
    tap: (part, cx, cy) => {
      if (skipTap) { skipTap = false; return; }
      if (drag) return;
      const p = local(cx, cy);
      doTap(part, p.x, p.y);
    }
  });

  // =====================================================================================================
  // Panel and surprise
  // =====================================================================================================
  const paperPic = (hex) => '<svg viewBox="0 0 50 50"><path d="M8 8h25l9 9v25H8z" fill="' + hex + '" stroke="#1D2340" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M33 8v9h9" fill="#E3E8F2" stroke="#1D2340" stroke-width="2.2" stroke-linejoin="round"/></svg>';
  // A tiny paper snowflake for each fold type: its points, a ring of holes and a hole in the middle.
  function typePic(T) {
    const n = T.n, c = 25, R = 22, rv = R * T.rv / RP;
    let d = "";
    for (let k = 0; k < n * 2; k++) { const an = (k * 180 / n - 90) * DEG, r = k % 2 ? rv : R; d += (k ? "L" : "M") + (c + Math.cos(an) * r).toFixed(1) + " " + (c + Math.sin(an) * r).toFixed(1); }
    let holes = "";
    for (let k = 0; k < n; k++) { const an = (k * 360 / n - 90) * DEG; holes += '<circle cx="' + (c + Math.cos(an) * R * 0.52).toFixed(1) + '" cy="' + (c + Math.sin(an) * R * 0.52).toFixed(1) + '" r="2.6"/>'; }
    return '<svg viewBox="0 0 50 50"><path d="' + d + 'Z" fill="#FFFFFF" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/>' +
      '<g fill="#BFE3FF" stroke="#1D2340" stroke-width="1.4">' + holes + '<circle cx="25" cy="25" r="3.4"/></g></svg>';
  }
  const folds = Toybox.tiles($("folds"), {
    items: GEO.map((T) => ({ id: T.id, name: T.name, pic: typePic(T) })),
    value: "p6", rows: 1,
    onPick: (id) => pickType(TYPE_BY[id])
  });
  // A fold type: the flat sheet takes it at once; once folding has started, the next sheet uses it.
  function pickType(i) {
    if (GEO[i] == null || locked()) return;
    if (S.ph === "fold" && S.f === 0 && !V.fold && !busy) {
      S.t = i; S.nextT = null; useType(i);
      V.flutter = Math.max(V.flutter, 0.5);
      lastWant = ""; ghost.again("fold");
      saveSoon();
      return;
    }
    if (i === S.t) { S.nextT = null; saveSoon(); return; }
    S.nextT = i;
    coach.say("The next paper makes " + GEO[i].n + " points.", 3);
    saveSoon();
  }
  const tiles = Toybox.tiles($("tiles"), {
    items: COLORS.map((c) => ({ id: c.id, name: c.name, pic: paperPic(c.hex) })),
    value: COLORS[0].id, rows: 1,
    onPick: (id) => pickColor(COLORS.findIndex((c) => c.id === id))
  });
  // A color for the paper: the flat sheet changes at once; once it is folded, the next sheet is that color.
  function pickColor(i) {
    if (!okColor(i) || locked()) return;
    if (S.ph === "fold" && S.f === 0 && !V.fold && !busy) {
      S.c = i; S.next = null;
      V.flutter = Math.max(V.flutter, 0.5);
      saveSoon();
      return;
    }
    if (i === S.c) { S.next = null; saveSoon(); return; }
    S.next = i;
    coach.say("The next paper is " + COLORS[i].name.toLowerCase() + ".", 3);
    saveSoon();
  }
  const openBtn = $("openbtn"), actRow = $("act"), tilesRow = $("tiles");
  Toybox.palmGuard(actRow);
  openBtn.addEventListener("click", () => { if (!locked()) openPaper(); });
  function panelSync() {
    const cut = S.ph === "cut";
    tilesRow.hidden = cut; actRow.hidden = !cut;
  }
  function newTap() {
    if (locked()) return;
    if (big) closeBig();
    newSheet(true);
  }
  const bar = Toybox.bar($("bottom"), { shelf: null, onNew: newTap, onSurprise: surprise });
  void bar;

  // Takes turns between three moments by the window: snow falls and real snowflakes drift past; the
  // snowflakes on the window catch the light one after another; a gust makes them sway and the paper flutter.
  let surpriseNext = 0, drift = [];
  function surprise() {
    if (locked()) return;
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    const t = now();
    if (k === 0) {
      heavy = 1;
      const n = reduce ? 3 : 6;
      drift = Array.from({ length: n }, (_, i) => ({ x: W * (0.1 + 0.8 * hash(i, t % 7)), t0: t + i * 0.7, r: Math.min(W, H) * (0.035 + 0.025 * hash(i, 3)), ph: hash(i, 9) * TAU, sp: 30 + 20 * hash(i, 4) }));
    } else if (k === 1) {
      hung.forEach((e, i) => { e.glint = t + i * 0.35; });
      lightsBright = 1;
      if (S.ph === "hang" && V.flake) for (let j = 0; j < G.n; j++) { const an = V.flake.rot + V.flake.spin + (G.pAng + j * 360 / G.n) * DEG; puff("twinkle", V.flake.x + Math.cos(an) * V.flake.s * RP, V.flake.y + Math.sin(an) * V.flake.s * RP, 1); }
      else if (S.ph === "cut") wedgeScr().forEach((p) => puff("twinkle", p.x, p.y, 1));
      else { const c = paperCam(); [[-1, -1], [1, 1], [1, -1], [-1, 1]].forEach(([x, y]) => { const p = toScr(c, x * 0.6, y * 0.6); puff("twinkle", p.x, p.y, 1); }); }
    } else {
      wind = 1;
      hung.forEach((e) => { e.sway = 1; });
      V.flutter = 1;
    }
  }
  function drawDrift(t) {
    drift = drift.filter((d) => {
      const q = t - d.t0;
      if (q < 0) return true;
      const y = -d.r * 2 + q * d.sp * (reduce ? 0.6 : 1);
      if (y > H + d.r * 2) return false;
      const x = d.x + Math.sin(q * 0.9 + d.ph) * d.r * 1.4;
      crystal(x, y, d.r, d.ph + q * 0.4, 0.95);
      return true;
    });
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    const ph = S.ph === "trim" ? "cut" : S.ph === "open" ? "hang" : S.ph;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        window: hung.map((e) => ({ t: GEO[e.t].id, c: e.c, ops: encodeOps(e.ops), drops: encodeDrops(e.drops), u: +e.u.toFixed(3), v: +e.v.toFixed(3), r: +e.r.toFixed(3) })),
        build: { t: GEO[S.t].id, nextT: S.nextT != null ? GEO[S.nextT].id : null, c: S.c, next: S.next, f: S.f, ph: ph === "hung" ? "fold" : ph, ops: ph === "hung" ? [] : encodeOps(S.ops), drops: ph === "hung" ? [] : encodeDrops(S.drops), notch: S.notchNext }
      }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }
  // A reload (not a fresh visit from the home screen) keeps the sheet as it was.
  function restore() {
    const b = saved.build;
    if (fresh || !b || typeof b !== "object") return;
    if (okColor(b.c)) S.c = b.c;
    if (okColor(b.next)) S.next = b.next;
    if (TYPE_BY[b.t] != null) S.t = TYPE_BY[b.t];
    if (TYPE_BY[b.nextT] != null) S.nextT = TYPE_BY[b.nextT];
    useType(S.t);
    const ops = decodeOps(b.ops) || [], drops = decodeDrops(b.drops, ops.length) || [];
    if ([0, 1, 2].includes(b.notch)) S.notchNext = b.notch;
    if (b.ph === "fold" && Number.isInteger(b.f) && b.f >= 0 && b.f < NF) S.f = b.f;
    else if (b.ph === "cut" || b.ph === "hang") {
      S.f = NF; S.ops = ops; S.drops = drops; S.ph = "cut";
      startMask(); replay(S.mk, S.ops, S.drops);
      if (b.ph === "hang") { makeTex(); S.ph = "hang"; const c = camOpen(0); V.flake = { x: c.x, y: c.y, s: c.s, rot: c.r, spin: 0 }; V.halo = 1; }
    }
  }
  // After a change of size: everything goes to its place for the new layout.
  function onLayout() {
    if (!tiles) return;
    if (!drag) {
      cam = camNow();
      if (!V.sc.held || S.ph !== "cut") scissorsHome(0);
    }
    if (S.ph === "hang" && V.flake && !(drag && drag.k === "carry")) { const c = camOpen(0); V.flake.x = c.x; V.flake.y = c.y; V.flake.s = c.s; }
    if (S.ph === "cut" && S.mk) wdDirty = true;
    lastWant = "";
  }
  let lastT = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    V.sc.snip = Math.max(0, V.sc.snip - dt * 4);
    V.flutter = Math.max(0, V.flutter - dt * 0.6);
    wind = Math.max(0, wind - dt * 0.35);
    heavy = Math.max(0, heavy - dt * 0.12);
    lightsBright = Math.max(0, lightsBright - dt * 0.6);
    hung.forEach((e) => { e.sway = Math.max(0, e.sway - dt * 0.3); });
    if (V.flake && !reduce && !(drag && drag.k === "carry")) V.flake.spin += dt * 0.12;
    if (big && !big.closing && t - big.t0 > 5) closeBig();
    updateCoach();
    draw(t, dt);
    requestAnimationFrame(frame);
  }
  function draw(t, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWall();
    drawTable();
    drawWindow(t, dt);
    drawPaper(t);
    drawFalls(t);
    drawParts();
    if (S.ph === "fold" || S.ph === "trim" || S.ph === "cut") drawSc();
    else if (V.sc.x) drawSc();
    drawRing(t);
    drawDrift(t);
    drawBig(t);
  }
  function drawBig(t) {
    if (!big || big.a <= 0.01) return;
    const b = big, e = b.e, a = b.a;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(29,35,64," + (0.45 * a).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H);
    const from = glassPt(e.u, e.v), sF = hungS(), sT = LY.rv.r / RP;
    const x = lerp(from.x, W / 2, a), y = lerp(from.y, H / 2, a), s = lerp(sF, sT, a), rot = e.r + (t - b.t0) * (reduce ? 0 : 0.12);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.drawImage(e.bigPic.c, -s, -s, s * 2, s * 2);
    ctx.restore();
    const gt = GEO[e.t], per = 0.7, j = Math.floor(t / per) % gt.n, ph = (t % per) / per, an = rot + (gt.pAng + j * 360 / gt.n) * DEG;
    twinkle(x + Math.cos(an) * s * RP * 0.92, y + Math.sin(an) * s * RP * 0.92, s * 0.13 * Math.sin(ph * Math.PI) * a, Math.sin(ph * Math.PI) * a);
  }
  function onEnding(done) {
    ending = true;
    drag = null; cutOp = null; press.cancel();
    if (big) closeBig();
    if (V.fold && !V.fold.auto) { V.fold = null; }
    setTimeout(done, 1500);
  }
  function restArt() {
    const flake = (cx, cy, r) => {
      let d = "";
      for (let k = 0; k < 12; k++) { const an = (k * 30 - 90) * Math.PI / 180, rr2 = k % 2 ? r * 0.72 : r; d += (k ? "L" : "M") + (cx + Math.cos(an) * rr2).toFixed(1) + " " + (cy + Math.sin(an) * rr2).toFixed(1); }
      return '<path d="' + d + 'Z" fill="#FFFFFF" stroke="#1D2340" stroke-width="1.6" stroke-linejoin="round"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.22).toFixed(1) + '" fill="#2F4A8A"/>';
    };
    return '<svg class="rest-art" viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="6" fill="#2F4A8A" stroke="#1D2340" stroke-width="3"/>' +
      '<path d="M14 74q20-8 36-2t36-4V86H14z" fill="#F4F8FF"/><path d="M50 14v72M14 50h72" stroke="#FFFFFF" stroke-width="4"/>' +
      '<path d="M50 14v72M14 50h72" stroke="#1D2340" stroke-width="1" opacity="0.4"/>' +
      flake(32, 32, 11) + flake(68, 36, 9) + flake(36, 66, 8) + flake(66, 66, 10) + "</svg>";
  }

  resize();
  restore();
  cam = camNow();
  scissorsHome(0);
  tiles.set(COLORS[S.next != null ? S.next : S.c].id);
  folds.set(GEO[S.nextT != null ? S.nextT : S.t].id);
  panelSync();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "christmas",
    badge: $("tbadge"),
    timerIntro: "When time is up, the snowflakes rest on the window and the controls lock.",
    goodbyeOption: "End with a “Goodbye, snowflakes” button to press",
    farewellText: "Time to say goodnight to the snowflakes",
    goodbyeLabel: "Goodbye, snowflakes",
    farewellDone: "Goodnight, snowflakes!",
    restLine: "The snowflakes are resting on the window.",
    restLine2: "They will be right here next time.",
    restArt,
    onEnding,
    onWake: () => { ending = false; }
  });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    const flatVp = (x, y) => { const p = toScr(cam, x, y); return vp(p.x, p.y); };
    // How far the finished snowflake is from six-fold symmetry (0 = perfect): turned by 60 degrees and
    // mirrored, compared pixel by pixel.
    const symmetry = () => {
      if (!TEX) return null;
      const n = 240, c = mkCanvas(n), g = c.getContext("2d");
      g.drawImage(TEX.tex, 0, 0, n, n);
      const d = g.getImageData(0, 0, n, n).data, px = (x, y) => d[(y * n + x) * 4 + 3] || 0,
        // Sampled smoothly between pixels (pixel i covers i..i+1), so a turn by any angle compares fairly.
        al = (x, y) => { x -= 0.5; y -= 0.5; const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
          return (px(x0, y0) * (1 - fx) + px(x0 + 1, y0) * fx) * (1 - fy) + (px(x0, y0 + 1) * (1 - fx) + px(x0 + 1, y0 + 1) * fx) * fy; };
      let rot = 0, mir = 0, cnt = 0, paper = 0;
      for (let r = 0.05; r < 0.98; r += 0.03) for (let a = 0; a < 360; a += 3) {
        const P = (an) => [n / 2 + Math.cos(an * DEG) * r * n / 2, n / 2 + Math.sin(an * DEG) * r * n / 2];
        const v0 = al(...P(a)), v1 = al(...P(a + 360 / G.n)), v2 = al(...P(2 * G.pAng - a));
        rot += Math.abs(v0 - v1) / 255; mir += Math.abs(v0 - v2) / 255; cnt++; if (v0 > 128) paper++;
      }
      return { type: G.id, rot: +(rot / cnt).toFixed(4), mirror: +(mir / cnt).toFixed(4), paper: +(paper / cnt).toFixed(3) };
    };
    // Sample cuts in wedge terms: [radius, 0..1 across from the w0 edge to the w1 edge] (outside 0..1 = off the paper).
    const wedgePt = (r, t) => dirPt(G.w0 + t * G.sig, r);
    const SAMPLE_CUTS = [
      [[0.36, -0.5], [0.44, 0.55], [0.52, -0.5]],
      [[0.7, 1.5], [0.66, 0.4], [0.8, 0.5], [0.84, 1.5]],
      [[0.2, 0.45], [0.27, 0.8], [0.3, 0.3]]
    ];
    const debugCut = (pts) => {
      if (S.ph !== "cut" || busy) return false;
      const P = pts.map(([r, t]) => { const q = wedgePt(r, t); return toScr(cam, q[0], q[1]); });
      cutStart(P[0].x, P[0].y);
      for (let i = 1; i < P.length; i++) {
        const a = P[i - 1], b = P[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
        for (let j = 1; j <= n; j++) cutMove(lerp(a.x, b.x, j / n), lerp(a.y, b.y, j / n));
      }
      cutEnd(false);
      V.sc.held = false;
      return true;
    };
    window.__toybox = {
      state: () => {
        const w = want();
        return { type: G.id, nextType: S.nextT != null ? GEO[S.nextT].id : null, phase: S.ph, folds: S.f, foldsTotal: NF, color: COLORS[S.c].id, next: S.next != null ? COLORS[S.next].id : null, ops: S.ops.length, drops: S.drops.length,
          window: hung.length, busy, want: w && w.part, coach: coach.text(), big: !!big, unfold: V.unfold && V.unfold.k };
      },
      next: () => {
        if (busy) return "wait";
        if (S.ph === "fold") { foldTap(); return "fold"; }
        if (S.ph === "cut") { if (S.ops.length < 3) { debugCut(SAMPLE_CUTS[S.ops.length % 3]); return "cut"; } openPaper(); return "open"; }
        // Each finished snowflake is followed by the next fold type, so next() steps through them all.
        if (S.ph === "hang") { const b = bestSpot(); S.nextT = (S.t + 1) % GEO.length; folds.set(GEO[S.nextT].id); hangAt(b.u, b.v); return "hang"; }
        return "wait";
      },
      fold: () => foldTap(),
      cut: (pts) => debugCut(pts || SAMPLE_CUTS[0]),
      notch: (x, y) => notchAt(x, y),
      open: () => openPaper(),
      hang: (u, v) => { const b = bestSpot(); hangAt(u == null ? b.u : u, v == null ? b.v : v); },
      newSheet: () => newTap(),
      surprise: () => surprise(),
      color: (id) => pickColor(COLORS.findIndex((c) => c.id === id)),
      type: (id) => { pickType(TYPE_BY[id]); folds.set(GEO[S.nextT != null ? S.nextT : S.t].id); },
      types: () => GEO.map((T) => T.id),
      bigView: (i) => openBig(i || 0),
      flatVp,
      wedgeVp: (r, t) => { const q = wedgePt(r, t); return flatVp(q[0], q[1]); },
      pt: (part) => { if (part === "open") { const p = openBtnPt(); return { x: p[0], y: p[1] }; } const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      grab: () => { const g = grabPts(); return { from: vp(g.from.x, g.from.y), to: vp(g.to.x, g.to.y) }; },
      glass: (u, v) => { const p = glassPt(u, v); return vp(p.x, p.y); },
      symmetry,
      hungInfo: () => hung.map((e) => { const p = hungPic(e), d = p.c.getContext("2d").getImageData(0, 0, p.c.width, p.c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 128) n++; return { w: p.c.width, paper: n, pos: glassPt(e.u, e.v) }; }),
      ghost: () => ghost.show()
    };
  }
})();
