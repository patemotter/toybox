(function () {
  "use strict";
  // Forge: a blacksmith's corner seen from where the smith stands: the coal forge with its hand-crank blower, the
  // anvil on a tree stump low in front, the vise, the slack tub of water and the rack on the wall.
  //   The blower crank (drag it round, or tap for one turn) makes the fire hotter; the fire dies down slowly but
  //   never goes out. The tongs hold the steel bar: drag them, or tap the forge, the anvil, the vise or the tub,
  //   and the bar goes there.
  //   The bar is a chain of short segments, each with its own heat, width, thickness, twist and bend. Segments in
  //   the coals heat up; heat spreads along the bar and fades. Only metal at dull red or hotter moves: a hammer tap
  //   on the anvil face flattens (or points) the hot part under it, on the part hanging past the heel it bends
  //   the bar over the edge, and on the horn it curls the hot end. In the vise the twisting wrench twists the hot
  //   part between the jaws and the wrench. The tub cools the bar at once.
  //   Makes (tiles): Spoon (the project, the dad's real copper coffee spoon: twist the handle, flatten both ends,
  //   bend the neck, dunk it, dish the cold copper disc on the stake, rivet, polish), S-hook, Fire poker and a
  //   plain Bar. Finished pieces hang on the rack, which is kept across visits.
  // Units: the scene is drawn in world units (the WIDE or TALL layout, picked from the stage's shape) and scaled
  // to fit the stage; x to the right, y down.
  //
  // Sections:
  //   Setup and saved state
  //   Makes and steps
  //   Sound
  //   Layout
  //   The bar model
  //   Moving the bar
  //   Fire and blower
  //   Working the metal
  //   Finishing a step or a piece
  //   Particles
  //   What comes next: coach, ring and ghost hand
  //   Drawing helpers
  //   Drawing the room, forge, blower, vise, tub, rack and anvil
  //   Drawing the bar, the tongs and the spoon
  //   Drawing the tools, the robin and the effects
  //   Input
  //   Panel, gear-up and surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const TAU = Math.PI * 2, PI = Math.PI, INK = "#1D2340";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (u) => u * u * (3 - 2 * u);
  const now = () => performance.now() / 1000;
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false, gateUp = false;
  const locked = () => ending || gateUp || Toybox.timer.locked();

  const N = 48;          // segments in a bar
  const T0 = 8;          // the side of the square bar in world units
  const WORK = 0.3;      // dull red: cooler steel does not move under the hammer
  const HOT = 0.6;       // orange: a good working heat
  const RACK_MAX = 6;
  const KEY = "forge-v1";

  // =====================================================================================================
  // Makes and steps
  // =====================================================================================================
  // seg: the length of one segment and thick: the bar's thickness, so the S-hook starts from a shorter, thinner bar.
  const MAKES = [
    { id: "spoon", name: "Spoon", seg: 2.9, thick: 1 },
    { id: "hook", name: "S-hook", seg: 2.3, thick: 0.75 },
    { id: "poker", name: "Fire poker", seg: 3.1, thick: 1 },
    { id: "bar", name: "Bar", seg: 2.9, thick: 1 }
  ];
  const MAKE_BY = {};
  MAKES.forEach((m) => { MAKE_BY[m.id] = m; });
  // end "a" is the high-index end of the bar, "b" the low-index end. The spoon's round tab is end a.
  const FLAT = "Hammer the hot end of the bar flat.", POINT = "Hammer the hot end of the bar to a point.";
  const TWIST = "Turn the twisting wrench to twist the hot bar.", HORN = "Hammer the hot end over the anvil horn.";
  const STEPS = {
    spoon: [
      { kind: "twist", line: TWIST, done: "The handle is twisted." },
      { kind: "flatten", end: "a", line: FLAT, done: "The round tab is flat." },
      { kind: "flatten", end: "b", line: FLAT, done: "The end of the handle is flat." },
      { kind: "bend", end: "a", line: "Hammer the hot end over the anvil edge.", done: "The neck is bent." },
      { kind: "dunk", done: "The handle is cool." },
      { kind: "dish", line: "Hammer the copper disc on the stake.", done: "The copper bowl is round." },
      { kind: "rivet", done: "The rivet holds the bowl on the handle." },
      { kind: "polish", done: "The spoon hangs on the rack." }
    ],
    hook: [
      { kind: "point", end: "a", line: POINT, done: "The end is pointed." },
      { kind: "point", end: "b", line: POINT, done: "Both ends are pointed." },
      { kind: "curl", end: "a", line: HORN, done: "The first hook is bent." },
      { kind: "curl", end: "b", line: HORN, done: "The second hook bends the other way." },
      { kind: "dunk", done: "The S-hook hangs on the rack." }
    ],
    poker: [
      { kind: "twist", line: TWIST, done: "The middle is twisted." },
      { kind: "curl", end: "b", loop: true, line: HORN, done: "The loop handle is bent." },
      { kind: "point", end: "a", line: POINT, done: "The end is pointed." },
      { kind: "dunk", done: "The fire poker hangs on the rack." }
    ],
    bar: []
  };
  const TWIST_REG = [16, 31];
  // The segments a step works on.
  function region(st) {
    if (st.kind === "twist") return TWIST_REG;
    if (st.kind === "curl") { const n = st.loop ? 22 : 15; return st.end === "a" ? [N - n, N - 1] : [0, n - 1]; }
    if (st.kind === "bend") return [N - 12, N - 1];
    return st.end === "a" ? [N - 8, N - 1] : [0, 7];
  }
  // The segments that must be hot for a step (the neck, not the tab, for the bend).
  function heatRegion(st) {
    if (st.kind === "bend") return [N - 11, N - 7];
    if (st.kind === "twist") return [TWIST_REG[0] + 1, TWIST_REG[1]];
    return region(st);
  }
  const PLACE = { twist: "vise", flatten: "anvil", point: "anvil", bend: "anvil", curl: "anvil" };
  const curStep = () => STEPS[P.make][P.step] || null;

  function newBar(seg) {
    return { seg, w: new Float32Array(N).fill(1), th: new Float32Array(N).fill(1), tw: new Float32Array(N),
      bd: new Float32Array(N), ln: new Float32Array(N).fill(1), hits: new Uint8Array(N), heat: new Float32Array(N) };
  }
  function newPiece(m) { return { make: m, step: 0, bar: newBar(MAKE_BY[m].seg), disc: { depth: 0, dm: [] }, rivet: 0, shine: 0, quenched: false }; }
  const r3 = (a) => Array.from(a, (v) => Math.round(v * 1000) / 1000);
  function packBar(b) { return { s: b.seg, w: r3(b.w), t: r3(b.th), tw: r3(b.tw), bd: r3(b.bd), ln: r3(b.ln), h: Array.from(b.hits) }; }
  function unpackBar(o, seg) {
    const b = newBar(o && o.s > 0 && o.s < 10 ? o.s : seg);
    if (!o || typeof o !== "object") return b;
    const take = (dst, src, lo, hi) => {
      if (Array.isArray(src) && src.length === N) src.forEach((v, i) => { if (typeof v === "number" && isFinite(v)) dst[i] = clamp(v, lo, hi); });
    };
    take(b.w, o.w, 0.2, 4); take(b.th, o.t, 0.2, 2); take(b.tw, o.tw, -300, 300); take(b.bd, o.bd, -2, 2);
    take(b.ln, o.ln, 0.5, 3); take(b.hits, o.h, 0, 255);
    return b;
  }
  function packDisc(d) { return { depth: Math.round(d.depth * 1000) / 1000, dm: d.dm.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]) }; }
  function unpackDisc(o) {
    const d = { depth: 0, dm: [] };
    if (o && typeof o === "object") {
      d.depth = clamp(+o.depth || 0, 0, 1.5);
      if (Array.isArray(o.dm)) d.dm = o.dm.filter((a) => Array.isArray(a) && a.length === 2).slice(-40).map(([x, y]) => [clamp(+x || 0, -1, 1), clamp(+y || 0, -1, 1)]);
    }
    return d;
  }
  function packPiece(p) { return { step: p.step, bar: packBar(p.bar), disc: packDisc(p.disc), rivet: p.rivet, shine: Math.round(p.shine * 1000) / 1000 }; }
  function unpackPiece(m, o) {
    const p = newPiece(m);
    if (!o || typeof o !== "object") return p;
    p.step = Number.isInteger(o.step) ? clamp(o.step, 0, Math.max(0, STEPS[m].length - 1)) : 0;
    p.bar = unpackBar(o.bar, p.bar.seg);
    p.disc = unpackDisc(o.disc);
    p.rivet = clamp(o.rivet | 0, 0, 4);
    p.shine = clamp(+o.shine || 0, 0, 1);
    return p;
  }

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
  // A fresh visit starts a new piece of every make except the spoon, whose project progress is kept.
  const fresh = Toybox.fresh();
  const pieces = {};
  const sp = saved.pieces && typeof saved.pieces === "object" ? saved.pieces : {};
  MAKES.forEach((m) => { pieces[m.id] = m.id === "spoon" || !fresh ? unpackPiece(m.id, sp[m.id]) : newPiece(m.id); });
  let make = !fresh && MAKE_BY[saved.make] ? saved.make : "spoon";
  let P = pieces[make];
  const rack = (Array.isArray(saved.rack) ? saved.rack : []).slice(-RACK_MAX)
    .filter((o) => o && MAKE_BY[o.k]).map((o) => ({ k: o.k, bar: unpackBar(o.bar, MAKE_BY[o.k].seg), disc: unpackDisc(o.disc) }));

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    const ps = {};
    MAKES.forEach((m) => { ps[m.id] = packPiece(pieces[m.id]); });
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, make, pieces: ps,
        rack: rack.map((it) => ({ k: it.k, bar: packBar(it.bar), disc: packDisc(it.disc) })) }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 600); }

  // =====================================================================================================
  // Sound (soft and synthesized; only when the grown-ups turned sound on)
  // =====================================================================================================
  let noiseBuf = null;
  function tone(f0, f1, dur, type, gain, delay) {
    const a = Toybox.sound.ready(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
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
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  const snd = {
    clang() { tone(820, 800, 0.35, "triangle", 0.05); tone(2350, 2300, 0.25, "sine", 0.02); noise(0.06, 2500, 0.03); },
    clink() { tone(2100, 2080, 0.45, "sine", 0.045); tone(3150, 3120, 0.3, "sine", 0.018); },
    copper() { tone(1250, 1200, 0.22, "triangle", 0.045); tone(1900, 1880, 0.15, "sine", 0.015); },
    whoosh() { noise(0.55, 420, 0.05); },
    hiss() { noise(1.3, 4200, 0.05); noise(0.7, 1600, 0.025, 0.05); },
    splash() { noise(0.35, 900, 0.04); },
    creak() { tone(150, 120, 0.3, "triangle", 0.03); },
    clamp() { tone(500, 380, 0.15, "square", 0.015); },
    place() { tone(600, 560, 0.18, "triangle", 0.03); },
    rub() { noise(0.4, 2600, 0.02); },
    chirp() { tone(3200, 4200, 0.09, "sine", 0.03); tone(3600, 4500, 0.09, "sine", 0.03, 0.13); },
    crackle() { for (let k = 0; k < 6; k++) noise(0.05, 3000 + Math.random() * 2000, 0.03, k * 0.12 + Math.random() * 0.05, 3); },
    chime() { tone(660, 660, 0.3, "sine", 0.05); tone(990, 990, 0.35, "sine", 0.04, 0.14); }
  };

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Three arrangements of the same corner. WIDE puts everything in a row; TALL (upright phones) and MID (iPads)
  // stand the forge and the vise behind the anvil and the tub, so nothing has to shrink much. The one that
  // draws the scene biggest is used.
  const WIDE = { w: 580, h: 356, wall: 290,
    forge: { x: 70, y: 200, w: 140, base: 344 }, blower: { x: 34, y: 262, r: 24, base: 344 },
    anvil: { x: 322, y: 262, base: 350 }, vise: { x: 452, y: 196, base: 344 },
    tub: { x: 532, y: 274, w: 66, base: 350 }, rack: { x: 236, y: 10, w: 186 } };
  const MID = { w: 470, h: 430, wall: 312,
    forge: { x: 70, y: 204, w: 140, base: 318 }, blower: { x: 34, y: 266, r: 24, base: 318 },
    anvil: { x: 218, y: 344, base: 424 }, vise: { x: 410, y: 206, base: 318 },
    tub: { x: 378, y: 362, w: 64, base: 424 }, rack: { x: 226, y: 10, w: 160 } };
  const TALL = { w: 330, h: 500, wall: 312,
    forge: { x: 46, y: 204, w: 124, base: 318 }, blower: { x: 22, y: 262, r: 20, base: 318 },
    anvil: { x: 168, y: 394, base: 492 }, vise: { x: 272, y: 210, base: 318 },
    tub: { x: 284, y: 414, w: 58, base: 492 }, rack: { x: 176, y: 10, w: 146 } };
  // vs, vox, voy: the camera this frame (world -> stage px); FIT is the whole corner fitted to the stage.
  let W = 1, H = 1, dpr = 1, L = WIDE, vs = 1, vox = 0, voy = 0;
  const FIT = { s: 1, ox: 0, oy: 0 };
  // g: the places derived from the layout, all in world units.
  const g = {};
  function geom() {
    const a = L.anvil, f = L.forge, v = L.vise, t = L.tub;
    Object.assign(g, { ax: a.x, ay: a.y, faceL: a.x - 52, faceR: a.x + 48, hornTip: a.x - 112, hardyX: a.x + 32,
      coalX: f.x + f.w / 2, coalY: f.y + 1, coalHalf: f.w * 0.3, viseX: v.x, jawY: v.y,
      tubX: t.x, tubY: t.y, tubW: t.w,
      bowlX: a.x - 18, bowlY: a.y - 16, tabX: a.x + 13, tabY: a.y - 14,
      tinX: a.x - 30, tinY: a.base - 12, clothX: a.x + 66, clothY: a.base - 16 });
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const m = 6, fit = (l) => Math.min((W - m * 2) / l.w, (H - m * 2) / l.h);
    const next = [WIDE, MID, TALL].reduce((a, l) => (fit(l) > fit(a) ? l : a)), changed = next !== L;
    L = next;
    FIT.s = fit(L); FIT.ox = (W - L.w * FIT.s) / 2; FIT.oy = (H - L.h * FIT.s) / 2;
    geom();
    const c = camTarget(); vs = c.s; vox = c.ox; voy = c.oy;
    if (changed || !B.pts.length) placeRest(true);
  }
  // While the copper bowl is worked, the camera moves in on the anvil (the forge is not needed then); it moves
  // back out for everything else, and before a finished spoon flies to the rack.
  function camTarget() {
    const st = curStep();
    if (!st || !(st.kind === "dish" || st.kind === "rivet" || st.kind === "polish") || finishing) return FIT;
    const x0 = g.hornTip - 14, x1 = Math.max(L.tub.x + L.tub.w / 2, g.clothX + 20) + 10, y0 = g.ay - 110, y1 = L.anvil.base + 8;
    const sc = Math.min((W - 12) / (x1 - x0), (H - 12) / (y1 - y0), FIT.s * 1.8);
    if (sc < FIT.s * 1.1) return FIT;
    const fitAxis = (o, size, world) => (world * sc >= size ? clamp(o, size - world * sc, 0) : (size - world * sc) / 2);
    return { s: sc, ox: fitAxis(W / 2 - (x0 + x1) / 2 * sc, W, L.w), oy: fitAxis(H / 2 - (y0 + y1) / 2 * sc, H, L.h) };
  }
  function camStep(dt) {
    const c = camTarget(), k = reduce ? 1 : 1 - Math.exp(-dt * 3.5);
    vs = lerp(vs, c.s, k); vox = lerp(vox, c.ox, k); voy = lerp(voy, c.oy, k);
  }
  // World point -> viewport point, and back.
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }

  // =====================================================================================================
  // The bar model
  // =====================================================================================================
  // The bar's centerline: N + 1 points. Walking from point 0, each segment turns by its bend and is as long as its
  // base length times its stretch. pose = { x, y, ang, held }: the held end (0 or N - 1, where the tongs grip)
  // sits at (x, y) and the middle of the bar points away from it in the direction ang, so a bent or curled end
  // does not swing the whole bar round. k scales the whole bar.
  function shape(bar, pose, k) {
    k = k || 1;
    const pts = new Array(N + 1);
    let x = 0, y = 0, h = 0;
    pts[0] = [0, 0];
    for (let i = 0; i < N; i++) {
      h += bar.bd[i];
      const l = bar.seg * bar.ln[i] * k;
      x += Math.cos(h) * l; y += Math.sin(h) * l;
      pts[i + 1] = [x, y];
    }
    const a = pose.held === 0 ? 0 : N, m = N >> 1;
    const dir = Math.atan2(pts[m + 1][1] - pts[m][1], pts[m + 1][0] - pts[m][0]) + (pose.held === 0 ? 0 : PI);
    const rot = pose.ang - dir, c = Math.cos(rot), s = Math.sin(rot), ox = pts[a][0], oy = pts[a][1];
    return pts.map(([px, py]) => [pose.x + (px - ox) * c - (py - oy) * s, pose.y + (px - ox) * s + (py - oy) * c]);
  }
  // A pose that puts point index idx (may be fractional) at (tx, ty).
  function poseFor(bar, held, ang, idx, tx, ty) {
    const pts = shape(bar, { x: 0, y: 0, ang, held });
    const i0 = clamp(Math.floor(idx), 0, N), i1 = Math.min(N, i0 + 1), f = idx - i0;
    return { x: tx - lerp(pts[i0][0], pts[i1][0], f), y: ty - lerp(pts[i0][1], pts[i1][1], f), ang, held };
  }
  const segMid = (pts, i) => ({ x: (pts[i][0] + pts[i + 1][0]) / 2, y: (pts[i][1] + pts[i + 1][1]) / 2 });
  // Softness of a segment, from 0 at dull red or cooler to 1 at bright orange and hotter.
  const soft = (i) => clamp((P.bar.heat[i] - WORK) / 0.4, 0, 1);
  function avgOf(arr, a, z) { let s = 0; for (let i = a; i <= z; i++) s += arr[i]; return s / (z - a + 1); }
  const avgHeat = (a, z) => avgOf(P.bar.heat, a, z);
  function maxHeat() { let m = 0; for (let i = 0; i < N; i++) m = Math.max(m, P.bar.heat[i]); return m; }
  function sumBend(a, z) { let s = 0; for (let i = a; i <= z; i++) s += P.bar.bd[i]; return s; }
  // The hottest stretch of n segments between segments lo and hi; when the bar is cold, the a end.
  function hottest(n, lo, hi) {
    lo = lo || 0; hi = hi == null ? N - 1 : hi;
    let best = Math.max(lo, hi - n + 1), bh = 0.05 * n;
    for (let s = lo; s + n - 1 <= hi; s++) {
      let h = 0; for (let i = s; i < s + n; i++) h += P.bar.heat[i];
      if (h > bh + 1e-6) { bh = h; best = s; }
    }
    return [best, best + n - 1];
  }
  function worked(bar) {
    for (let i = 0; i < N; i++) if (bar.hits[i] || Math.abs(bar.bd[i]) > 0.01 || Math.abs(bar.tw[i]) > 0.05) return true;
    return false;
  }

  // Heat: segments in the coals warm at a rate set by the fire; every segment out of the fire cools (a heat stays
  // workable for about 13 s), and heat spreads a little to its neighbors.
  function heatStep(dt) {
    const h = P.bar.heat, inFire = B.where === "fire" && !B.fly && !ending;
    const rate = ending ? 0 : 0.05 + 0.25 * F.fire, tau = ending ? 1.2 : B.quench ? 0.18 : 12;
    for (let i = 0; i < N; i++) {
      if (inFire && B.inCoal[i]) h[i] += dt * rate * (1.05 - h[i]);
      else h[i] *= Math.exp(-dt / tau);
    }
    const k = Math.min(0.4, 0.8 * dt);
    let prev = h[0];
    for (let i = 0; i < N; i++) {
      const l = i > 0 ? prev : h[i], r = i < N - 1 ? h[i + 1] : h[i];
      prev = h[i];
      h[i] += k * (l + r - 2 * h[i]);
    }
  }

  // =====================================================================================================
  // Moving the bar
  // =====================================================================================================
  // where: "fire" | "anvil" | "vise" | "tub" | "carry" (in his hand) | "assembled" (the spoon on the anvil).
  // pts: the bar's centerline this frame. fly: a calm move from the old points to the new pose.
  const B = { where: "anvil", pose: { x: 0, y: 0, ang: 0, held: 0 }, pts: [], fly: null, inCoal: new Uint8Array(N),
    vise: TWIST_REG.slice(), prev: "anvil", carry: null, flip: false, quench: false, hideUntil: 0, hotSaid: false };
  // The pose for a place: in a project the step's segments go where the step works on them; with the plain Bar
  // the hottest stretch goes there.
  function placeFor(where) {
    const b = P.bar, st = curStep();
    let reg, held;
    if (st && (st.end || st.kind === "twist")) {
      reg = region(st);
      held = (reg[0] + reg[1] + 1) / 2 >= N / 2 ? 0 : N - 1;
    } else {
      // The plain Bar: the tongs hold one end (a tap on them swaps ends) and the hottest stretch away from the
      // tongs, or else the free end, is the part that goes into the fire or onto the anvil.
      held = B.flip ? N - 1 : 0;
      reg = freeReg();
    }
    const rc = (reg[0] + reg[1] + 1) / 2;
    if (where === "fire") return poseFor(b, held, PI, rc, g.coalX, g.coalY - 1);
    if (where === "tub") return poseFor(b, held, 0.95, rc, g.tubX - 2, g.tubY + 24);
    if (where === "vise") {
      if (st && st.kind === "dish") { B.vise = [9, 24]; return poseFor(b, 0, -PI / 2, 9, g.viseX, g.jawY); }
      const s = st && st.kind === "twist" ? TWIST_REG[0] : clamp(hottest(14)[0] - 1, 1, N - 17);
      B.vise = [s, s + 15];
      return poseFor(b, 0, -PI / 2, s, g.viseX, g.jawY);
    }
    if (where === "assembled") return poseFor(b, N - 1, -0.65, N - 3, g.tabX, g.tabY);
    // The anvil: the bend hangs the neck over the heel's edge, a curl puts the end over the horn.
    if (st && st.kind === "bend") return poseFor(b, 0, 0, N - 9, g.faceR, g.ay - 4);
    if (st && st.kind === "curl") {
      const a = st.end === "a";
      return poseFor(b, a ? 0 : N - 1, PI, a ? reg[0] : reg[1] + 1, g.faceL - 6, g.ay - 3);
    }
    return poseFor(b, held, 0, rc, g.ax + 6, g.ay - 4);
  }
  function freeReg() {
    const reg = B.flip ? hottest(10, 0, N - 13) : hottest(10, 12, N - 1);
    if (avgHeat(reg[0], reg[1]) >= 0.05) return reg;
    return B.flip ? [0, 9] : [N - 10, N - 1];
  }
  // Where the current piece rests when nothing is being done to it.
  function restWhere() {
    const st = curStep();
    if (st && st.kind === "dish") return "vise";
    if (st && (st.kind === "rivet" || st.kind === "polish")) return "assembled";
    return "anvil";
  }
  function placeRest(instant) {
    B.where = restWhere(); B.prev = B.where; B.fly = null; B.carry = null;
    B.pose = placeFor(B.where);
    if (instant) B.pts = shape(P.bar, B.pose);
  }
  // The bar can only be moved while it is being forged (not while the spoon's bowl is worked).
  function movable() { const st = curStep(); return !st || PLACE[st.kind] || st.kind === "dunk"; }
  function moveBar(where) {
    if (!movable()) { hint(); return; }
    if (B.where === where && !B.carry) return;
    B.fly = { from: B.pts.map((p) => p.slice()), t0: now(), dur: 0.55 };
    B.where = where; B.carry = null;
    B.pose = placeFor(where);
    if (where !== "carry") B.prev = where;
    snd.place();
  }
  function arrive(where) {
    const st = curStep();
    if (where === "fire") {
      B.hotSaid = false;
      ghost.learned("fire");
      snd.whoosh();
      puff("ember", g.coalX, g.coalY - 6, 6);
      const reg = st && PLACE[st.kind] ? heatRegion(st) : hottest(10);
      if (F.fire < 0.35 && avgHeat(reg[0], reg[1]) < HOT) {
        lowFire++;
        // The second time the bar goes into a low fire, the blower gives a few turns by itself.
        if (lowFire >= 2) { lowFire = 0; F.auto += 3; coach.say("The blower turns to make the fire hot.", 3); }
        else glowPart("crank");
      }
    } else if (where === "tub") {
      ghost.learned("tub");
      quench();
    } else if (where === "vise") {
      ghost.learned("vise");
      snd.clamp(); WR.ang = 0;
    } else if (where === "anvil") {
      ghost.learned("anvil");
    }
  }
  // Dragging the tongs: the bar follows the finger and lands on the place it is let go over.
  function startCarry(w) {
    if (!movable() || B.where === "vise" || B.where === "assembled") return false;
    const ang = Math.cos(B.pose.ang) >= 0 ? 0 : PI;
    B.pose = { x: B.pose.x, y: B.pose.y, ang, held: B.pose.held };
    B.carry = { ox: B.pose.x - w.x, oy: B.pose.y - w.y };
    B.where = "carry"; B.fly = null;
    return true;
  }
  function placeAt(w) {
    const f = L.forge, t = L.tub, v = L.vise;
    if (w.x > f.x - 30 && w.x < f.x + f.w + 30 && w.y > f.y - 70 && w.y < f.base) return "fire";
    if (w.x > g.hornTip - 20 && w.x < g.faceR + 30 && w.y > g.ay - 70 && w.y < L.anvil.base) return "anvil";
    if (Math.abs(w.x - v.x) < 50 && w.y > g.jawY - 110 && w.y < v.base) return "vise";
    if (Math.abs(w.x - t.x) < t.w * 0.7 && w.y > t.y - 60 && w.y < t.base) return "tub";
    return null;
  }
  function dropCarry(w) {
    const where = placeAt(w) || B.prev;
    B.fly = { from: B.pts.map((p) => p.slice()), t0: now(), dur: 0.4 };
    B.where = where; B.carry = null; B.prev = where;
    // With the plain Bar, the fire and the anvil keep the spot he dropped it on.
    if (!curStep() && (where === "fire" || where === "anvil")) {
      const ty = where === "fire" ? g.coalY - 1 : g.ay - 4, tx = where === "fire" ? g.coalX : clamp(w.x, g.hornTip + 10, g.faceR + 40);
      const pts = shape(P.bar, B.pose);
      let bi = 0, bd = Infinity;
      for (let i = 0; i < N; i++) { const m = segMid(pts, i), d = Math.abs(m.x - tx); if (d < bd) { bd = d; bi = i; } }
      const m = segMid(pts, bi);
      B.pose = { x: B.pose.x + (bd > 30 ? tx - m.x : 0), y: B.pose.y + ty - m.y, ang: B.pose.ang, held: B.pose.held };
    } else B.pose = placeFor(where);
    snd.place();
  }
  function updateBar(t) {
    if (B.where === "carry" && B.carry) {
      B.pts = shape(P.bar, B.pose);
    } else {
      const target = shape(P.bar, B.pose);
      if (B.fly) {
        const u = clamp((t - B.fly.t0) / B.fly.dur, 0, 1), e = ease(u), lift = Math.sin(PI * u) * 26;
        B.pts = target.map((p, i) => [lerp(B.fly.from[i][0], p[0], e), lerp(B.fly.from[i][1], p[1], e) - lift]);
        if (u >= 1) { B.fly = null; arrive(B.where); }
      } else B.pts = target;
    }
    B.inCoal.fill(0);
    if (B.where === "fire") {
      for (let i = 0; i < N; i++) {
        const m = segMid(B.pts, i);
        B.inCoal[i] = Math.abs(m.x - g.coalX) < g.coalHalf && Math.abs(m.y - g.coalY) < 14 ? 1 : 0;
      }
    }
  }

  // =====================================================================================================
  // Fire and blower
  // =====================================================================================================
  // fire: 0 (embers) to 1 (roaring). crank: the crank's angle; auto: turns the blower still has to make by itself.
  const F = { fire: 0.15, crank: 0, auto: 0, spin: 0, flare: 0 };
  let lowFire = 0;
  function crankBy(d) {
    F.crank += d;
    F.spin = Math.min(3, F.spin + Math.abs(d) * 0.6);
    F.fire = Math.min(1, F.fire + Math.abs(d) / TAU * 0.22);
    if (Math.floor((F.crank - d) / TAU) !== Math.floor(F.crank / TAU)) { snd.whoosh(); puff("ember", g.coalX + (Math.random() - 0.5) * 30, g.coalY - 8, 3); }
  }
  function fireStep(dt) {
    if (F.auto > 0) { const d = Math.min(F.auto * TAU, dt * TAU * 1.3); F.auto -= d / TAU; crankBy(d); }
    F.fire = Math.max(ending ? 0.02 : 0.12, F.fire - dt * (ending ? 0.3 : 0.035));
    F.spin = Math.max(0, F.spin - dt * 1.5);
    F.flare = Math.max(0, F.flare - dt * 0.35);
  }

  // =====================================================================================================
  // Working the metal
  // =====================================================================================================
  // HM: the hammer. It hangs raised over the work and swings down at each blow.
  const HM = { x: 0, y: 0, t0: -9, cold: false };
  // WR: the twisting wrench's angle and a tap's quarter turn still to play.
  const WR = { ang: 0, left: 0, dir: 1 };
  let coldSaid = 0;
  function swing(x, y, cold) { HM.x = x; HM.y = y; HM.t0 = now(); HM.cold = cold; }
  function nearestSeg(pts, x, y) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < N; i++) {
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
      const u = clamp(((x - ax) * vx + (y - ay) * vy) / l2, 0, 1);
      const d = Math.hypot(x - ax - vx * u, y - ay - vy * u);
      if (d < bd) { bd = d; bi = i; }
    }
    return { i: bi, d: bd };
  }
  function coldHint(x, y) {
    swing(x, y, true); snd.clink();
    puff("ring", x, y, 1);
    const t = now();
    if (t - coldSaid > 3) { coldSaid = t; coach.say("The bar is cold. Put the bar in the fire.", 3.5); glowPart("fire"); }
  }
  // A hammer blow on the bar where it lies on the anvil. Over the face the hot part under the hammer gets thinner
  // and wider and the bar a little longer; past the heel's edge the bar bends over the edge; over the horn the
  // hot end curls.
  function hammerAt(x, y) {
    if (B.where !== "anvil" || B.fly) return;
    const b = P.bar, st = curStep();
    let i = nearestSeg(B.pts, x, y).i;
    // Forgiving aim: a blow just beside the step's part lands on it.
    // In a flatten or point step, a blow inside the end lands on its thickest spot nearby, so every blow counts.
    if (st && PLACE[st.kind] === "anvil") {
      const [a, z] = region(st);
      if (i < a && a - i <= 4) i = a; else if (i > z && i - z <= 4) i = z;
      if ((st.kind === "flatten" || st.kind === "point") && i >= a && i <= z) i = thickest(Math.max(a, i - 3), Math.min(z, i + 3));
    }
    const m = segMid(B.pts, i);
    const held = B.pose.held, freeRight = Math.cos(B.pose.ang) >= 0;
    // A part of the bar out in the air past the horn or the heel slides over the face first.
    if (m.x < g.hornTip - 4 || (m.x > g.faceR + 2 && !freeRight)) {
      B.fly = { from: B.pts.map((q) => q.slice()), t0: now(), dur: 0.4 };
      B.pose = { x: B.pose.x + g.ax - m.x, y: B.pose.y, ang: B.pose.ang, held };
      snd.place();
      return;
    }
    if (soft(i) < 0.05) { coldHint(m.x, m.y); return; }
    swing(m.x, m.y, false);
    snd.clang();
    puff("spark", m.x, m.y - 2, 9);
    puff("scale", m.x, m.y, 4);
    puff("ring", m.x, m.y, 1);
    ghost.learned("work");
    const sgn = (held === 0 ? 1 : -1) * (freeRight ? 1 : -1), step = held === 0 ? 1 : -1;
    const free = held === 0 ? N - 1 : 0;
    if (m.x > g.faceR && freeRight) {
      // Over the edge: the joint at the edge bends a step with each blow.
      let j = held === 0 ? 0 : N - 1;
      while (j !== free && segMid(B.pts, j).x <= g.faceR) j += step;
      // The spoon's neck stops at a gentle angle; a plain bar can be bent to a right angle.
      const cap = P.make === "spoon" ? 0.7 : 1.5;
      b.bd[j] = clamp(b.bd[j] + sgn * 0.2 * Math.max(soft(j), soft(i) * 0.6), -cap, cap);
    } else if (m.x < g.faceL && !freeRight) {
      // Over the horn: the hot end beyond the blow curls round.
      for (let k = i; k !== free + step; k += step) b.bd[k] = clamp(b.bd[k] + sgn * 0.075 * soft(k), -0.55, 0.55);
    } else {
      const point = st && st.kind === "point";
      [0.25, 0.55, 0.85, 1, 0.85, 0.55, 0.25].forEach((wt, n) => {
        const k = i - 3 + n;
        if (k < 0 || k >= N) return;
        const r = 0.2 * soft(k) * wt;
        if (r <= 0) return;
        if (point) {
          // Pointing: both sides are hammered, so the end tapers toward its tip.
          const e = st.end === "a" ? N - 1 - k : k, tf = clamp(1 - e / 8, 0, 1);
          b.th[k] = Math.max(0.28, b.th[k] * (1 - r * (0.5 + 0.5 * tf)));
          b.w[k] = Math.max(0.28, b.w[k] * (1 - r * 0.8 * tf));
          b.ln[k] = Math.min(2.4, b.ln[k] * (1 + r * 0.6));
        } else {
          // The spoon's tab spreads into a round tab.
          const tab = P.make === "spoon" && k >= N - 8;
          b.th[k] = Math.max(0.3, b.th[k] * (1 - r));
          b.w[k] = Math.min(tab ? 3.4 : 2.6, b.w[k] * (1 + (tab ? 0.9 : 0.55) * r));
          b.ln[k] = Math.min(2.2, b.ln[k] * (1 + 0.35 * r));
        }
        b.hits[k] = Math.min(255, b.hits[k] + 1);
      });
    }
    saveSoon();
  }
  function thickest(a, z) { let bi = a; for (let i = a; i <= z; i++) if (P.bar.th[i] > P.bar.th[bi] + 1e-4) bi = i; return bi; }
  // Twisting in the vise: only the hot part between the jaws and the wrench turns; the bar above the wrench
  // turns with it as one piece. Returns false when that part is too cold to move.
  function twistBy(d) {
    const b = P.bar, [j0, j1] = B.vise;
    let sum = 0;
    for (let i = j0 + 1; i <= j1; i++) sum += soft(i);
    if (sum < 0.4) return false;
    let acc = 0;
    for (let i = j0 + 1; i < N; i++) { if (i <= j1) acc += soft(i) / sum; b.tw[i] += d * acc; }
    WR.ang += d;
    if (Math.floor((WR.ang - d) / (PI / 2)) !== Math.floor(WR.ang / (PI / 2))) snd.creak();
    ghost.learned("wrench");
    saveSoon();
    return true;
  }
  function wrenchTap() {
    if (B.where !== "vise" || B.fly) return;
    if (WR.left) return;
    WR.left = PI / 2;
  }
  function wrenchStep(dt) {
    if (!WR.left) return;
    const d = Math.min(WR.left, dt * PI * 1.1);
    WR.left -= d;
    if (!twistBy(d * WR.dir)) { WR.left = 0; const c = wrenchCenter(); coldHint(c.x, c.y); }
    if (WR.left < 1e-4) WR.left = 0;
  }
  function wrenchCenter() { const j = B.vise[1]; return { x: B.pts[j][0], y: B.pts[j][1] }; }
  // The disc on the dishing stake: each blow leaves a dimple where it lands and deepens the bowl. The copper is
  // worked cold.
  function discCenter() { return { x: g.hardyX, y: g.ay - 34 + P.disc.depth * 2 }; }
  function dishAt(x, y) {
    const c = discCenter(), R = 26;
    let u = (x - c.x) / R, v = (y - c.y + 4) / (R * 0.5);
    const d = Math.hypot(u, v);
    if (d > 0.9) { u *= 0.9 / d; v *= 0.9 / d; }
    P.disc.dm.push([u, v]); if (P.disc.dm.length > 40) P.disc.dm.shift();
    P.disc.depth = Math.min(1.2, P.disc.depth + 0.14);
    swing(c.x + u * R * 0.8, c.y - 6 - P.disc.depth * 10 + v * 6, false);
    snd.copper();
    puff("ring", c.x + u * R * 0.8, c.y - 4, 1);
    ghost.learned("disc");
    saveSoon();
  }
  // The rivet: it goes through the tab's hole, then three blows spread its head round.
  let rivetFly = null;
  function rivetIn() {
    if (P.rivet || rivetFly) return;
    rivetFly = { t0: now(), dur: 0.5 };
    snd.place();
    ghost.learned("rivet");
  }
  function rivetHit() {
    if (!P.rivet) return;
    swing(g.tabX, g.tabY - 2, false);
    snd.copper();
    puff("ring", g.tabX, g.tabY, 1);
    if (P.rivet < 4) P.rivet++;
    ghost.learned("rivethead");
    saveSoon();
  }
  // The polishing cloth: a tap rubs the spoon all over; dragging it over the spoon rubs where it goes.
  const CL = { x: 0, y: 0, rub: 0, drag: false };
  function polishTap() { if (!CL.rub) CL.rub = now(); ghost.learned("cloth"); snd.rub(); }
  function polishBy(dist) { P.shine = Math.min(1, P.shine + dist / 300); if (Math.random() < 0.3) puff("shine", g.bowlX + (Math.random() - 0.5) * 40, g.bowlY + (Math.random() - 0.5) * 16, 1); }
  function clothStep(t, dt) {
    if (!CL.rub) return;
    const u = (t - CL.rub) / 1.8;
    if (u >= 1) { CL.rub = 0; return; }
    P.shine = Math.min(1, P.shine + dt * 0.6);
    if (Math.random() < dt * 8) { snd.rub(); puff("shine", g.bowlX + (Math.random() - 0.5) * 44, g.bowlY + (Math.random() - 0.5) * 18, 1); }
  }
  // The slack tub: the hot bar hisses, steam rises and the bar turns dark grey.
  function quench() {
    const hot = maxHeat() > 0.1;
    B.quench = true;
    setTimeout(() => { B.quench = false; }, 900);
    if (hot) {
      snd.hiss();
      for (let k = 0; k < 9; k++) setTimeout(() => puff("steam", g.tubX + (Math.random() - 0.5) * g.tubW * 0.6, g.tubY, 1), k * 90);
    } else snd.splash();
    puff("drop", g.tubX, g.tubY + 2, 6);
    P.quenched = true;
    // A worked plain bar is finished when it is dunked.
    if (!curStep() && worked(P.bar)) setTimeout(() => { if (B.where === "tub" && !curStep()) finishPiece(); }, 1200);
  }

  // =====================================================================================================
  // Finishing a step or a piece
  // =====================================================================================================
  function stepDone(st) {
    const b = P.bar;
    switch (st.kind) {
      case "twist": return Math.abs(b.tw[TWIST_REG[1]] - b.tw[TWIST_REG[0]]) >= 3 * PI;
      case "flatten": { const [a, z] = region(st); return avgOf(b.th, a, z) <= 0.6; }
      case "point": { const [a, z] = st.end === "a" ? [N - 4, N - 1] : [0, 3]; return avgOf(b.th, a, z) <= 0.62 && avgOf(b.w, a, z) <= 0.72; }
      case "bend": return Math.abs(sumBend(N - 12, N - 6)) >= 0.45;
      case "curl": { const [a, z] = region(st); return Math.abs(sumBend(a, z)) >= (st.loop ? 5.2 : 2.8); }
      case "dunk": return P.quenched && !B.fly;
      case "dish": return P.disc.depth >= 1;
      case "rivet": return P.rivet >= 4;
      case "polish": return P.shine >= 1;
    }
    return false;
  }
  let doneAt = 0, finishing = 0;
  function checkStep(t) {
    const st = curStep();
    if (!st || finishing) return;
    if (!doneAt && stepDone(st)) doneAt = t + (st.kind === "dunk" ? 1.2 : 0.7);
    if (doneAt && t >= doneAt) { doneAt = 0; completeStep(); }
  }
  function completeStep() {
    const st = curStep();
    if (!st) return;
    snd.chime();
    const at = workPoint();
    if (at) puff("shine", at.x, at.y, 6);
    P.step++; P.quenched = false;
    const nx = curStep();
    if (!nx) { finishPiece(st.done); return; }
    coach.say(st.done, 3.5);
    if (nx.kind === "dish" || nx.kind === "rivet") moveTo(restWhere());
    // The next step on the anvil may need the bar turned round or moved over the edge or the horn.
    else if (B.where === "anvil" && PLACE[nx.kind] === "anvil") moveTo("anvil");
    else if (nx.kind === "polish") CL.rub = 0;
    lastWant = "";
    saveSoon();
  }
  // Puts the piece at its resting place without the checks moveBar makes (the spoon's handle to the vise or
  // onto the bowl).
  function moveTo(where) {
    B.fly = { from: B.pts.map((p) => p.slice()), t0: now(), dur: 0.7 };
    B.where = where; B.prev = where; B.pose = placeFor(where);
  }
  // The finished piece flies to the rack and stays there; a new bar appears at the anvil.
  function finishPiece(line) {
    const pts = B.pts.map((p) => p.slice());
    const item = { k: P.make, bar: P.bar, disc: P.disc, fly: { t0: now(), dur: 1.4, from: pts, bowl: P.make === "spoon" ? { x: g.bowlX, y: g.bowlY } : null } };
    rack.push(item);
    while (rack.length > RACK_MAX) rack.shift();
    finishing = now() + 1.6;
    coach.say(line || "The bar hangs on the rack.", 4);
    snd.chime();
    Toybox.kind();
    pieces[make] = P = newPiece(make);
    B.hideUntil = finishing;
    placeRest(true);
    save();
  }

  // =====================================================================================================
  // Particles
  // =====================================================================================================
  // Sparks, scale flakes and drops are gone within about a second so they never hide the work.
  let fx = [];
  const MAX_FX = 140;
  function puff(type, x, y, n) {
    if (reduce && (type === "spark" || type === "scale")) n = Math.min(n, 2);
    for (let k = 0; k < n; k++) {
      if (fx.length >= MAX_FX) fx.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { type, x, y, vx: 0, vy: 0, life: 1, max: 1, s: 1, rot: Math.random() * TAU };
      if (type === "spark") { const ang = -PI / 2 + (Math.random() - 0.5) * 2.6; const v = 120 + sp * 160; p.vx = Math.cos(ang) * v; p.vy = Math.sin(ang) * v; p.max = 0.45 + Math.random() * 0.4; }
      else if (type === "scale") { p.vx = (Math.random() - 0.5) * 90; p.vy = -40 - sp * 60; p.max = 0.7 + Math.random() * 0.3; }
      else if (type === "steam") { p.vx = (Math.random() - 0.5) * 16; p.vy = -38 - sp * 22; p.max = 1.3; }
      else if (type === "ember") { p.vx = (Math.random() - 0.5) * 24; p.vy = -50 - sp * 50; p.max = 0.9; }
      else if (type === "shower") { const ang = -PI / 2 + (Math.random() - 0.5) * 0.8; const v = 260 + sp * 160; p.vx = Math.cos(ang) * v; p.vy = Math.sin(ang) * v; p.max = 0.9 + Math.random() * 0.3; }
      else if (type === "shine") { p.x += Math.cos(a) * sp * 18; p.y += Math.sin(a) * sp * 12; p.max = 0.8; }
      else if (type === "drop") { p.vx = Math.cos(a) * 50; p.vy = -60 - sp * 50; p.max = 0.6; }
      else if (type === "ring") p.max = 0.32;
      p.life = p.max;
      fx.push(p);
    }
  }
  function fxStep(dt) {
    fx = fx.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      const grav = p.type === "spark" || p.type === "shower" ? 420 : p.type === "scale" || p.type === "drop" ? 380 : 0;
      p.vy += grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6;
      return true;
    });
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  // want(): the next thing to do, as { part, line }; part is what the yellow ring and the ghost hand point at.
  function placeLine(place) { return place === "vise" ? "Put the hot bar in the vise." : "Put the hot bar on the anvil."; }
  function want() {
    if (B.fly || B.where === "carry" || finishing) return null;
    const st = curStep();
    if (!st) return wantFree();
    const k = st.kind;
    if (k === "dunk") return { part: "tub", line: maxHeat() > 0.1 ? "Dunk the hot bar in the water." : "Dunk the bar in the water." };
    if (k === "dish") return { part: "disc", line: st.line };
    if (k === "rivet") return P.rivet || rivetFly ? { part: "rivethead", line: "Hammer the rivet head round." } : { part: "rivet", line: "Put the rivet in the hole." };
    if (k === "polish") return { part: "cloth", line: "Rub the spoon with the polishing cloth." };
    const [a, z] = heatRegion(st), h = avgHeat(a, z), place = PLACE[k];
    if (B.where === place && h >= WORK + 0.05) return { part: k === "twist" ? "wrench" : "work", line: st.line };
    if (B.where === "fire") {
      if (h >= HOT) return { part: place, line: placeLine(place) };
      if (F.fire < 0.35) return { part: "crank", line: "Turn the blower crank to make the fire hot." };
      return { part: null, line: "The bar is getting hot." };
    }
    if (h >= WORK + 0.12) return { part: place, line: placeLine(place) };
    return { part: "fire", line: B.where === place && maxHeat() > 0.05 ? "The bar is cold. Put the bar in the fire." : "Put the steel bar in the fire." };
  }
  function wantFree() {
    const r = freeReg(), h = B.where === "vise" ? maxHeat() : avgHeat(r[0], r[1]);
    if (B.where === "fire") {
      if (h >= HOT) return { part: "anvil", line: "Put the hot bar on the anvil." };
      if (F.fire < 0.35) return { part: "crank", line: "Turn the blower crank to make the fire hot." };
      return { part: null, line: "The bar is getting hot." };
    }
    if (h >= WORK + 0.05) {
      if (B.where === "anvil") return { part: "work", line: "Hammer the hot bar." };
      if (B.where === "vise") return { part: "wrench", line: TWIST };
      if (B.where !== "tub") return { part: "anvil", line: "Put the hot bar on the anvil." };
    }
    return { part: "fire", line: "Put the steel bar in the fire." };
  }
  // The spot on the bar the current step works on.
  function workPoint() {
    const st = curStep();
    if (!B.pts.length) return null;
    if (st && st.kind === "dish") { const c = discCenter(); return { x: c.x, y: c.y - 8 }; }
    if (st && (st.kind === "rivet" || st.kind === "polish")) return { x: g.tabX, y: g.tabY };
    if (st && st.kind === "bend") return segMid(B.pts, N - 5);
    if (st && (st.kind === "flatten" || st.kind === "point")) { const [a, z] = region(st); return segMid(B.pts, thickest(a + 1, z - 1)); }
    let reg = st && st.kind !== "dunk" ? region(st) : freeReg();
    if (st && st.kind === "curl") reg = st.end === "a" ? [reg[0], reg[0] + 4] : [reg[1] - 4, reg[1]];
    return segMid(B.pts, Math.round((reg[0] + reg[1]) / 2));
  }
  function partPt(part) {
    switch (part) {
      case "crank": { const b = L.blower, r = b.r * 0.78; return { x: b.x + Math.cos(F.crank) * r, y: b.y + Math.sin(F.crank) * r, r: 16 }; }
      case "crankhub": return { x: L.blower.x, y: L.blower.y, r: 0 };
      case "wrenchc": return B.where === "vise" && B.pts.length ? Object.assign(wrenchCenter(), { r: 0 }) : null;
      case "fire": return { x: g.coalX, y: g.coalY - 6, r: 34 };
      case "anvil": return { x: g.ax, y: g.ay - 6, r: 34 };
      case "vise": return { x: g.viseX, y: g.jawY + 16, r: 30 };
      case "tub": return { x: g.tubX, y: g.tubY + 6, r: 32 };
      case "work": { const p = workPoint(); return p && { x: p.x, y: p.y, r: 16 }; }
      case "wrench": { if (B.where !== "vise" || !B.pts.length) return null; const c = wrenchCenter(), e = wrenchEnd(1); return { x: lerp(c.x, e.x, 0.8), y: lerp(c.y, e.y, 0.8), r: 14 }; }
      case "disc": { const c = discCenter(); return { x: c.x, y: c.y - 8, r: 30 }; }
      case "rivet": return { x: g.tinX, y: g.tinY - 4, r: 16 };
      case "rivethead": return { x: g.tabX, y: g.tabY, r: 14 };
      case "cloth": return CL.drag || CL.rub ? { x: CL.x, y: CL.y, r: 22 } : { x: g.clothX, y: g.clothY - 4, r: 22 };
    }
    return null;
  }
  let ringPart = null, ringUntil = 0;
  function glowPart(part) { ringPart = part; ringUntil = now() + 3; }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    if (w.part) glowPart(w.part);
    ghost.poke();
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = "";
  function updateCoach() {
    const w = want();
    const line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) return;
    coach.step(line);
    // The instruction keeps clear of the part it names; for the cloth, of the spoon it polishes.
    const p = w.part === "cloth" ? { x: g.bowlX, y: g.bowlY, r: 10 } : w.part && partPt(w.part);
    if (p) { const v = vp(p.x, p.y + p.r * 0.5); coach.avoid(v.x, v.y); }
  }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active()) return null;
      const w = want();
      if (!w || !w.part) return null;
      const p = partPt(w.part);
      if (!p) return null;
      const v = vp(p.x, p.y);
      return { pts: [[v.x, v.y]], tap: true, key: w.part };
    }
  });

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  const LW = 2.4;
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fillStroke(fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.stroke(); }
  function poly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const css = (c, al) => "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (al == null ? 1 : al) + ")";
  // Real incandescence, in order: black, dull red, cherry red, orange, yellow.
  const HEAT = [[0.2, [70, 22, 18]], [0.3, [140, 30, 18]], [0.45, [200, 42, 24]], [0.65, [255, 118, 28]], [0.85, [255, 196, 64]], [1.0, [255, 242, 160]]];
  function glowRGB(h) {
    if (h <= HEAT[0][0]) return HEAT[0][1];
    for (let i = 1; i < HEAT.length; i++) if (h <= HEAT[i][0]) return mixRGB(HEAT[i - 1][1], HEAT[i][1], (h - HEAT[i - 1][0]) / (HEAT[i][0] - HEAT[i - 1][0]));
    return HEAT[HEAT.length - 1][1];
  }
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

  // =====================================================================================================
  // Drawing the room, forge, blower, vise, tub, rack and anvil
  // =====================================================================================================
  function drawRoom() {
    // The wall and floor fill the whole stage, past the world's edges.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wy = voy + L.wall * vs;
    ctx.fillStyle = "#7B5E4D"; ctx.fillRect(0, 0, W, wy);
    ctx.fillStyle = "#5A4337"; ctx.fillRect(0, wy, W, H - wy);
    ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
    const x0 = -vox / vs - 4, x1 = (W - vox) / vs + 4, y0 = -voy / vs - 4;
    // Stone blocks on the wall.
    ctx.strokeStyle = "rgba(40,24,16,0.35)"; ctx.lineWidth = 1.5;
    for (let y = L.wall - 34, row = 0; y > y0 - 34; y -= 34, row++) {
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      for (let x = x0 + (row % 2) * 30 - 60; x < x1; x += 60) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 34); ctx.stroke(); }
    }
    ctx.lineWidth = LW; ctx.strokeStyle = INK;
    ctx.beginPath(); ctx.moveTo(x0, L.wall); ctx.lineTo(x1, L.wall); ctx.stroke();
    // The fire lights up the room.
    const f = F.fire * (1 + F.flare * 0.5);
    const gr = ctx.createRadialGradient(g.coalX, g.coalY, 10, g.coalX, g.coalY, 120 + 220 * f);
    gr.addColorStop(0, "rgba(255,150,60," + (0.18 + 0.3 * f) + ")"); gr.addColorStop(1, "rgba(255,150,60,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gr; ctx.fillRect(x0, y0, x1 - x0, L.h - y0 + 20);
    ctx.globalCompositeOperation = "source-over";
  }
  function coalColor(k) {
    const f = F.fire * (1 + F.flare);
    return css(mixRGB([90, 30, 20], [255, 190, 70], clamp(f * (0.6 + 0.5 * k), 0, 1)));
  }
  function drawForgeBack(t) {
    const f = L.forge, cx = g.coalX, top = Math.min(-voy / vs - 6, f.y - 120);
    // Chimney and hood.
    rr(cx - 14, top, 28, f.y - 110 - top, 0); fillStroke("#4D535E");
    poly([[cx - 26, f.y - 112], [cx + 26, f.y - 112], [cx + f.w * 0.42, f.y - 58], [cx - f.w * 0.42, f.y - 58]]); fillStroke("#5C6370");
    rr(cx - f.w * 0.45, f.y - 62, f.w * 0.9, 8, 3); fillStroke("#6B7380");
    // The brick hearth with a stone top.
    rr(f.x, f.y, f.w, f.base - f.y, 4); fillStroke("#B5523B");
    ctx.strokeStyle = "rgba(60,20,10,0.45)"; ctx.lineWidth = 1.4;
    for (let y = f.y + 20, row = 0; y < f.base - 4; y += 16, row++) {
      ctx.beginPath(); ctx.moveTo(f.x + 2, y); ctx.lineTo(f.x + f.w - 2, y); ctx.stroke();
      for (let x = f.x + (row % 2 ? 14 : 28); x < f.x + f.w - 4; x += 28) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
    }
    rr(f.x - 6, f.y - 6, f.w + 12, 14, 4); fillStroke("#8A7D76");
    // The firepot and the coals at its back.
    ctx.beginPath(); ctx.ellipse(cx, f.y, g.coalHalf + 8, 9, 0, 0, TAU); fillStroke("#2A1D1A");
    for (let k = 0; k < 9; k++) {
      const x = cx - g.coalHalf + 4 + k * (g.coalHalf * 2 - 8) / 8, y = f.y - 3 + hash(k, 1) * 2;
      ctx.beginPath(); ctx.arc(x, y, 5 + hash(k, 2) * 2, 0, TAU);
      ctx.fillStyle = coalColor(0.4 + 0.6 * Math.abs(Math.sin(t * 1.7 + k))); ctx.fill();
    }
    // Flames rise when the fire is hot.
    const fl = clamp((F.fire - 0.22) / 0.78, 0, 1) + F.flare;
    if (fl > 0) {
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 5; k++) {
        const x = cx + (k - 2) * g.coalHalf * 0.38, hgt = (16 + 44 * fl) * (0.75 + 0.35 * Math.sin(t * 5 + k * 1.9)), wob = Math.sin(t * 7 + k) * 4;
        const gr = ctx.createLinearGradient(x, f.y, x, f.y - hgt);
        gr.addColorStop(0, "rgba(255,200,80,0.85)"); gr.addColorStop(0.5, "rgba(255,120,30,0.55)"); gr.addColorStop(1, "rgba(255,80,20,0)");
        ctx.beginPath(); ctx.moveTo(x - 9, f.y - 2);
        ctx.quadraticCurveTo(x - 10 + wob, f.y - hgt * 0.5, x + wob * 1.5, f.y - hgt);
        ctx.quadraticCurveTo(x + 10 + wob, f.y - hgt * 0.5, x + 9, f.y - 2);
        ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }
  function drawForgeFront(t) {
    const f = L.forge, cx = g.coalX;
    for (let k = 0; k < 8; k++) {
      const x = cx - g.coalHalf + 8 + k * (g.coalHalf * 2 - 16) / 7, y = f.y + 4 + hash(k, 3) * 2;
      ctx.beginPath(); ctx.arc(x, y, 5.5 + hash(k, 4) * 2, 0, TAU);
      ctx.fillStyle = coalColor(0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + k * 2.1))); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(29,35,64,0.6)"; ctx.stroke();
    }
    // The firepot's front lip.
    ctx.beginPath(); ctx.ellipse(cx, f.y, g.coalHalf + 8, 9, 0, 0, PI); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
  }
  function drawBlower() {
    const b = L.blower, f = L.forge;
    // The air pipe into the hearth, the stand, the housing with its fan, and the crank.
    rr(b.x, b.y - 7, f.x - b.x + 4, 14, 3); fillStroke("#5E6B66");
    ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(b.x - b.r * 0.6, b.y + b.r * 0.6); ctx.lineTo(b.x - b.r * 0.9, b.base); ctx.moveTo(b.x + b.r * 0.6, b.y + b.r * 0.6); ctx.lineTo(b.x + b.r * 0.9, b.base); ctx.stroke();
    ctx.lineWidth = 2.6; ctx.strokeStyle = "#5E6B66"; ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); fillStroke("#6F8F7A");
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.66, 0, TAU); fillStroke("#2E3A36");
    // The fan inside turns four times for every turn of the crank.
    const fa = F.crank * 4;
    for (let k = 0; k < 5; k++) {
      const a = fa + k * TAU / 5;
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.arc(b.x, b.y, b.r * 0.58, a, a + 0.55); ctx.closePath();
      ctx.fillStyle = "#AAB6B0"; ctx.fill();
    }
    if (F.spin > 0.4) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fillStyle = "rgba(170,182,176," + Math.min(0.5, F.spin * 0.2) + ")"; ctx.fill(); }
    const r = b.r * 0.78, kx = b.x + Math.cos(F.crank) * r, ky = b.y + Math.sin(F.crank) * r;
    ctx.lineCap = "round";
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = "#8C969E"; ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, TAU); fillStroke("#8C969E", 2);
    ctx.beginPath(); ctx.arc(kx, ky, 7, 0, TAU); fillStroke("#C98B4E", 2);
  }
  function drawViseBack() {
    const v = L.vise, x = v.x, y = v.y;
    rr(x - 8, y + 34, 16, v.base - y - 34, 3); fillStroke("#9A6B43");
    rr(x - 48, y + 28, 96, 10, 3); fillStroke("#B07A4C");
    rr(x - 19, y - 2, 38, 38, 4); fillStroke("#59606C");
  }
  function drawViseFront() {
    const x = L.vise.x, y = L.vise.y;
    rr(x - 22, y + 2, 44, 40, 5); fillStroke("#6E7684");
    ctx.strokeStyle = "rgba(29,35,64,0.5)"; ctx.lineWidth = 1.2;
    for (let k = -18; k <= 18; k += 4) { ctx.beginPath(); ctx.moveTo(x + k, y + 3); ctx.lineTo(x + k, y + 8); ctx.stroke(); }
    ctx.lineCap = "round";
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(x - 38, y + 24); ctx.lineTo(x + 38, y + 24); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = "#9AA3B0"; ctx.stroke();
    ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(x, y + 24, 7, 0, TAU); fillStroke("#8A93A0", 2);
    [-40, 40].forEach((d) => { ctx.beginPath(); ctx.arc(x + d, y + 24, 4.5, 0, TAU); fillStroke("#8A93A0", 2); });
  }
  function tubPath(t) {
    const top = t.y + 4, hw = t.w / 2;
    ctx.beginPath(); ctx.moveTo(t.x - hw, top); ctx.lineTo(t.x - hw * 0.86, t.base); ctx.lineTo(t.x + hw * 0.86, t.base); ctx.lineTo(t.x + hw, top);
    ctx.ellipse(t.x, top, hw, 9, 0, 0, PI); ctx.closePath();
  }
  function drawTubBack() {
    const t = L.tub;
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 4, t.w / 2, 9, 0, 0, TAU); fillStroke("#7A5233");
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 6, t.w / 2 - 4, 7, 0, 0, TAU); ctx.fillStyle = "#4FA3D9"; ctx.fill();
  }
  function drawTubFront(time) {
    const t = L.tub, hw = t.w / 2;
    // The water over the part of the bar that is under it.
    ctx.beginPath(); ctx.ellipse(t.x, t.y + 6, hw - 4, 7, 0, 0, TAU); ctx.fillStyle = "rgba(79,163,217,0.55)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(t.x - 6 + Math.sin(time * 1.5) * 3, t.y + 6, hw * 0.4, 3, 0, PI * 1.1, PI * 1.6); ctx.stroke();
    tubPath(t); fillStroke("#9B6A3F");
    ctx.strokeStyle = "rgba(60,30,10,0.5)"; ctx.lineWidth = 1.4;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(t.x + k * hw * 0.36, t.y + 12); ctx.lineTo(t.x + k * hw * 0.32, t.base - 2); ctx.stroke(); }
    [0.3, 0.75].forEach((f) => {
      const y = lerp(t.y + 8, t.base, f), w = lerp(hw, hw * 0.86, f);
      ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(t.x - w, y); ctx.quadraticCurveTo(t.x, y + 6, t.x + w, y); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = "#7D858F"; ctx.stroke();
    });
  }
  function drawAnvil() {
    const { ax, ay } = g, base = L.anvil.base;
    // The stump.
    rr(ax - 40, ay + 52, 80, base - ay - 52, 4); fillStroke("#9A6B43");
    ctx.strokeStyle = "rgba(60,30,10,0.45)"; ctx.lineWidth = 1.4;
    [-24, -6, 14, 28].forEach((d) => { ctx.beginPath(); ctx.moveTo(ax + d, ay + 60); ctx.lineTo(ax + d + 2, base - 4); ctx.stroke(); });
    // The body: horn on the left, face, heel on the right, waist and feet.
    ctx.beginPath();
    ctx.moveTo(g.hornTip, ay + 2);
    ctx.quadraticCurveTo(ax - 82, ay - 9, g.faceL, ay - 8);
    ctx.lineTo(g.faceR, ay - 8); ctx.lineTo(g.faceR, ay + 16); ctx.lineTo(ax + 28, ay + 20);
    ctx.quadraticCurveTo(ax + 16, ay + 30, ax + 22, ay + 40); ctx.lineTo(ax + 42, ay + 48); ctx.lineTo(ax + 42, ay + 54);
    ctx.lineTo(ax - 46, ay + 54); ctx.lineTo(ax - 46, ay + 48); ctx.lineTo(ax - 26, ay + 40);
    ctx.quadraticCurveTo(ax - 20, ay + 30, ax - 34, ay + 20); ctx.lineTo(g.faceL, ay + 16);
    ctx.quadraticCurveTo(ax - 84, ay + 13, g.hornTip, ay + 2);
    ctx.closePath(); fillStroke("#4A5160");
    // The polished face and the top of the horn, seen a little from above.
    ctx.beginPath(); ctx.moveTo(g.faceL, ay - 8); ctx.lineTo(g.faceR, ay - 8); ctx.lineTo(g.faceR, ay); ctx.lineTo(g.faceL, ay);
    ctx.quadraticCurveTo(ax - 82, ay - 1, g.hornTip + 2, ay + 2); ctx.quadraticCurveTo(ax - 82, ay - 8, g.faceL, ay - 8);
    ctx.closePath(); ctx.fillStyle = "#A3ACBC"; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(g.faceL, ay); ctx.lineTo(g.faceR, ay); ctx.stroke();
    // The hardy hole near the heel.
    ctx.fillStyle = INK; ctx.fillRect(g.hardyX - 3.5, ay - 6.5, 7, 5);
  }
  function drawStake() {
    const x = g.hardyX, y = g.ay;
    rr(x - 3.5, y - 18, 7, 16, 1); fillStroke("#5A6170", 2);
    ctx.beginPath(); ctx.arc(x, y - 25, 11, 0, TAU);
    const gr = ctx.createRadialGradient(x - 4, y - 29, 1, x, y - 25, 11);
    gr.addColorStop(0, "#D5DBE5"); gr.addColorStop(1, "#5A6170");
    fillStroke(gr, 2);
  }
  function drawRack(t) {
    const R = L.rack, step = R.w / RACK_MAX;
    rr(R.x, R.y, R.w, 12, 4); fillStroke("#A6764A");
    for (let k = 0; k < RACK_MAX; k++) { ctx.beginPath(); ctx.arc(R.x + (k + 0.5) * step, R.y + 15, 3, 0, TAU); fillStroke("#8C969E", 1.6); }
    rack.forEach((it, k) => drawRackItem(it, k, t, false));
  }
  // A finished piece flies from the anvil to its peg in front of everything else.
  function drawRackItem(it, k, t, flying) {
    if (!!it.fly !== flying) return;
    const R = L.rack, px = R.x + (k + 0.5) * R.w / RACK_MAX, py = R.y + 15;
    const pts = hang(it, px, py), K = rackK(it), bowl = it.k === "spoon" ? bowlFor(pts, K) : null;
    if (!it.fly) { drawPiece(it, pts, K, bowl); return; }
    const u = clamp((t - it.fly.t0) / it.fly.dur, 0, 1), e = ease(u), lift = Math.sin(PI * u) * 30;
    if (u >= 1) { it.fly = null; return; }
    const fp = pts.map((p, i) => [lerp(it.fly.from[i][0], p[0], e), lerp(it.fly.from[i][1], p[1], e) - lift]);
    const fb = bowl && it.fly.bowl ? { x: lerp(it.fly.bowl.x, bowl.x, e), y: lerp(it.fly.bowl.y, bowl.y, e) - lift, r: lerp(26, bowl.r, e) } : bowl;
    drawPiece(it, fp, lerp(1, K, e), fb);
  }
  // A piece on the rack hangs from its peg with its weight straight below: the spoon and the bar by one end, the
  // S-hook by one hook and the poker by its loop.
  const PIVOT = { spoon: 0, bar: 0, hook: N - 8, poker: 11 };
  // Each piece is scaled to hang about as long as the others, so a short S-hook is as easy to see as a poker.
  function rackK(it) {
    if (!it.k2) { const pts = hang(it, 0, 0, 1); let lo = 0, hi = 0; pts.forEach((q) => { lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); }); it.k2 = clamp(66 / (hi - lo || 1), 0.3, 0.75); }
    return it.k2;
  }
  function hang(it, px, py, k) {
    const pts = shape(it.bar, { x: 0, y: 0, ang: 0, held: 0 }, k || rackK(it)), p = pts[PIVOT[it.k]];
    let cx = 0, cy = 0;
    pts.forEach(([x, y]) => { cx += x / pts.length; cy += y / pts.length; });
    const r = PI / 2 - Math.atan2(cy - p[1], cx - p[0]), c = Math.cos(r), s = Math.sin(r);
    return pts.map(([x, y]) => [px + (x - p[0]) * c - (y - p[1]) * s, py + (x - p[0]) * s + (y - p[1]) * c]);
  }
  function drawPiece(it, pts, k, bowl) {
    if (bowl) drawBowlFlat(bowl.x, bowl.y, bowl.r);
    drawBar(pts, it.bar, k, { cold: true, spoon: it.k === "spoon", thick: MAKE_BY[it.k].thick });
  }
  // On the rack the spoon hangs from the end of its handle with the bowl at the bottom, past the tab.
  function bowlFor(pts, k) {
    const a = pts[N - 3], b = pts[N], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, r = 26 * k;
    return { x: b[0] + (b[0] - a[0]) / d * r * 0.7, y: b[1] + (b[1] - a[1]) / d * r * 0.7, r };
  }

  // =====================================================================================================
  // Drawing the bar, the tongs and the spoon
  // =====================================================================================================
  const STEEL_TOP = [112, 118, 132], STEEL_FRONT = [60, 65, 76];
  // The bar as a ribbon seen from the front and a little above: the top face (its width) above the centerline and
  // the front face (its thickness) below it. Twist turns the cross-section, so the two faces trade places and a
  // spiral of ridges shows; flattened parts show the hammer's dimples; hot parts glow in their heat color.
  function drawBar(pts, bar, k, o) {
    o = o || {};
    const T = T0 * (o.thick || 1);
    const top = new Array(N + 1), bot = new Array(N + 1), tH = new Float32Array(N), fH = new Float32Array(N), nx = new Float32Array(N), ny = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
      let x = dy / l, y = -dx / l;
      if (y > 0.001 || (Math.abs(y) <= 0.001 && x > 0)) { x = -x; y = -y; }
      nx[i] = x; ny[i] = y;
      const c = Math.abs(Math.cos(bar.tw[i])), s = Math.abs(Math.sin(bar.tw[i]));
      tH[i] = T * k * 0.5 * (bar.w[i] * c + bar.th[i] * s);
      fH[i] = T * k * 0.62 * (bar.th[i] * c + bar.w[i] * s);
    }
    for (let j = 0; j <= N; j++) {
      const a = Math.max(0, j - 1), b = Math.min(N - 1, j);
      let x = nx[a] + nx[b], y = ny[a] + ny[b];
      const l = Math.hypot(x, y) || 1; x /= l; y /= l;
      const th = (tH[a] + tH[b]) / 2, fh = (fH[a] + fH[b]) / 2;
      top[j] = [pts[j][0] + x * th, pts[j][1] + y * th];
      bot[j] = [pts[j][0] - x * fh, pts[j][1] - y * fh];
    }
    // The spoon's round tab and the punched hole once it is flat.
    const tabFlat = o.spoon && avgOf(bar.th, N - 6, N - 1) < 0.8;
    let tab = null;
    if (tabFlat) {
      const c = pts[N - 3], r = T * k * avgOf(bar.w, N - 6, N - 1) * 0.55;
      tab = { x: c[0], y: c[1], r };
    }
    // Outline first, wider than the bar, then the faces on top.
    ctx.lineJoin = "round";
    ctx.beginPath();
    top.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let j = N; j >= 0; j--) ctx.lineTo(bot[j][0], bot[j][1]);
    ctx.closePath();
    ctx.lineWidth = Math.max(1.4, LW * Math.min(1, k * 1.6)); ctx.strokeStyle = INK; ctx.stroke();
    if (tab) { ctx.beginPath(); ctx.arc(tab.x, tab.y, tab.r, 0, TAU); ctx.stroke(); }
    const heat = o.cold ? null : bar.heat;
    for (let i = 0; i < N; i++) {
      const h = heat ? heat[i] : 0, g2 = clamp((h - 0.16) / 0.3, 0, 1), glow = glowRGB(h);
      const shade = 0.88 + 0.12 * Math.cos(4 * bar.tw[i]);
      const ct = mixRGB(STEEL_TOP.map((v) => v * shade), glow, g2), cf = mixRGB(STEEL_FRONT, mixRGB(glow, [0, 0, 0], 0.25), g2);
      const a = pts[i], b = pts[i + 1], ex = (b[0] - a[0]) * 0.08, ey = (b[1] - a[1]) * 0.08;
      poly([[a[0] - ex, a[1] - ey], [b[0] + ex, b[1] + ey], [top[i + 1][0] + ex, top[i + 1][1] + ey], [top[i][0] - ex, top[i][1] - ey]]);
      ctx.fillStyle = css(ct); ctx.fill();
      poly([[a[0] - ex, a[1] - ey], [b[0] + ex, b[1] + ey], [bot[i + 1][0] + ex, bot[i + 1][1] + ey], [bot[i][0] - ex, bot[i][1] - ey]]);
      ctx.fillStyle = css(cf); ctx.fill();
    }
    if (tab) {
      const h = heat ? avgOf(heat, N - 6, N - 1) : 0;
      ctx.beginPath(); ctx.arc(tab.x, tab.y, tab.r - 0.6, 0, TAU);
      ctx.fillStyle = css(mixRGB(STEEL_TOP, glowRGB(h), clamp((h - 0.16) / 0.3, 0, 1))); ctx.fill();
      if (o.hole) { ctx.beginPath(); ctx.arc(tab.x, tab.y, Math.max(1.2, tab.r * 0.22), 0, TAU); ctx.fillStyle = INK; ctx.fill(); }
    }
    // Twist ridges: a slanted line wherever a face edge of the turning bar passes.
    ctx.lineWidth = Math.max(0.8, 1.3 * k); ctx.strokeStyle = "rgba(20,22,30,0.45)";
    ctx.beginPath();
    for (let i = 0; i < N - 1; i++) {
      const f0 = bar.tw[i] / (PI / 2), f1 = bar.tw[i + 1] / (PI / 2);
      const lo = Math.min(f0, f1), hi = Math.max(f0, f1);
      let n = 0;
      for (let q = Math.floor(lo) + 1; q <= hi && n < 3; q++, n++) {
        const u = (q - lo) / ((hi - lo) || 1), m = segMid(pts, i), d = [pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]];
        const px = m.x + d[0] * (u - 0.5), py = m.y + d[1] * (u - 0.5);
        ctx.moveTo(px - nx[i] * fH[i] * 0.9 - d[0] * 0.4, py - ny[i] * fH[i] * 0.9 - d[1] * 0.4);
        ctx.lineTo(px + nx[i] * tH[i] * 0.9 + d[0] * 0.4, py + ny[i] * tH[i] * 0.9 + d[1] * 0.4);
      }
    }
    ctx.stroke();
    // Hammer dimples on flattened parts.
    ctx.fillStyle = "rgba(20,22,30,0.28)";
    for (let i = 0; i < N; i++) {
      if (!bar.hits[i] || bar.th[i] > 0.92) continue;
      const n = Math.min(2, bar.hits[i]);
      for (let q = 0; q < n; q++) {
        const u = hash(i, q), v = 0.3 + 0.5 * hash(i, q + 7), m = segMid(pts, i);
        const x = m.x + (pts[i + 1][0] - pts[i][0]) * (u - 0.5) + nx[i] * tH[i] * v, y = m.y + (pts[i + 1][1] - pts[i][1]) * (u - 0.5) + ny[i] * tH[i] * v;
        ctx.beginPath(); ctx.ellipse(x, y, 1.6 * k + 0.4, 1 * k + 0.3, 0, 0, TAU); ctx.fill();
      }
    }
    // The glow of hot metal.
    if (heat) {
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < N; i += 2) {
        const h = heat[i];
        if (h < 0.3) continue;
        const m = segMid(pts, i), r = 10 + 12 * h, c = glowRGB(h);
        const gr = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, r);
        gr.addColorStop(0, css(c, (h - 0.3) * 0.5)); gr.addColorStop(1, css(c, 0));
        ctx.fillStyle = gr; ctx.fillRect(m.x - r, m.y - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }
  // The tongs grip the held end; their reins come toward the smith.
  function tongsGrip() {
    const held = B.pose.held, a = held === 0 ? 0 : N, b = held === 0 ? 1 : N - 1, p = B.pts[a], q = B.pts[b];
    const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l;
    return { jx: p[0], jy: p[1], gx: p[0] + ux * 30, gy: p[1] + uy * 30 + 22, ux, uy };
  }
  function drawTongs() {
    const t = tongsGrip(), px = t.jx + t.ux * 9, py = t.jy + t.uy * 9 + 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    [-2.6, 2.6].forEach((o) => {
      ctx.beginPath(); ctx.moveTo(t.jx - t.uy * o * 1.4, t.jy + t.ux * o * 1.4); ctx.lineTo(px, py); ctx.lineTo(t.gx + o * 1.3, t.gy + o * 0.6);
      ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = "#3B404A"; ctx.stroke();
    });
    ctx.lineCap = "butt";
    ctx.beginPath(); ctx.arc(px, py, 3.2, 0, TAU); fillStroke("#7D858F", 1.6);
  }
  // The spoon's bowl seen face-on (the rack and its flight there): smooth polished copper inside, the rim
  // shows the dimpled outside.
  function drawBowlFlat(x, y, r) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.86, 0, 0, TAU);
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, "#FFD7B0"); gr.addColorStop(0.6, "#C8743A"); gr.addColorStop(1, "#8E4A22");
    fillStroke(gr, Math.max(1.4, LW * r / 26));
    ctx.beginPath(); ctx.ellipse(x - r * 0.28, y - r * 0.3, r * 0.3, r * 0.14, -0.5, 0, TAU); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
  }
  // The dishing: the copper disc over the ball of the stake, outside up. The dome rises with each blow and every
  // blow leaves its dimple.
  function drawDisc(t) {
    const c = discCenter(), d = P.disc.depth, R = 26 * (1 - 0.12 * Math.min(1, d)), ry = R * 0.36, hgt = 3 + 13 * Math.min(1.2, d);
    const rimY = c.y + 4;
    ctx.beginPath();
    ctx.moveTo(c.x - R, rimY);
    ctx.bezierCurveTo(c.x - R, rimY - hgt * 1.3, c.x + R, rimY - hgt * 1.3, c.x + R, rimY);
    ctx.ellipse(c.x, rimY, R, ry, 0, 0, PI);
    ctx.closePath();
    const gr = ctx.createLinearGradient(c.x - R, rimY - hgt, c.x + R, rimY + ry);
    gr.addColorStop(0, "#F0B27E"); gr.addColorStop(0.5, "#C8743A"); gr.addColorStop(1, "#8E4A22");
    fillStroke(gr);
    P.disc.dm.forEach(([u, v], i) => {
      const x = c.x + u * R * 0.85, y = rimY + v * ry * 0.8 - hgt * 0.9 * Math.sqrt(Math.max(0, 1 - u * u - v * v * 0.6));
      ctx.beginPath(); ctx.ellipse(x, y, 2.8, 1.8, 0, 0, TAU); ctx.fillStyle = "rgba(90,40,15,0.45)"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x - 0.6, y - 0.6, 1.4, 0.8, 0, 0, TAU); ctx.fillStyle = "rgba(255,220,180," + (i === P.disc.dm.length - 1 && t - HM.t0 < 0.4 ? 0.95 : 0.5) + ")"; ctx.fill();
    });
  }
  // The spoon put together on the anvil face: the bowl right way up (smooth inside, dimpled outside), the round tab
  // against the outside of the bowl and the handle angling up from it. The rivet goes through the tab.
  function drawAssembled(t) {
    const x = g.bowlX, y = g.bowlY, R = 27, ry = 11, sh = P.shine;
    // The outside of the bowl below the rim, with its dimples.
    ctx.beginPath(); ctx.moveTo(x - R, y); ctx.bezierCurveTo(x - R * 0.85, y + 24, x + R * 0.85, y + 24, x + R, y); ctx.closePath();
    const go = ctx.createLinearGradient(x, y, x, y + 20);
    go.addColorStop(0, "#B8662F"); go.addColorStop(1, "#7E3F1C");
    fillStroke(go);
    P.disc.dm.slice(0, 24).forEach(([u, v]) => {
      const dx = x + u * R * 0.8, dy = y + 6 + (1 - Math.abs(u)) * 9 + v * 3;
      ctx.beginPath(); ctx.ellipse(dx, dy, 2.4, 1.5, 0, 0, TAU); ctx.fillStyle = "rgba(255,200,160,0.35)"; ctx.fill();
    });
    // The handle and its tab.
    drawBar(B.pts, P.bar, 1, { cold: true, spoon: true, hole: true });
    // The inside: smooth, and it shines more as it is polished.
    ctx.beginPath(); ctx.ellipse(x, y, R, ry, 0, 0, TAU);
    const gi = ctx.createLinearGradient(x - R, y - ry, x + R, y + ry);
    gi.addColorStop(0, lerpHex("#D98A50", "#FFC890", sh)); gi.addColorStop(0.55, lerpHex("#B8662F", "#E99A5C", sh)); gi.addColorStop(1, "#8E4A22");
    fillStroke(gi);
    ctx.beginPath(); ctx.ellipse(x - 6, y - 2, R * 0.45, ry * 0.32, -0.1, 0, TAU); ctx.fillStyle = "rgba(255,255,255," + (0.25 + 0.5 * sh) + ")"; ctx.fill();
    if (sh > 0) {
      const u = (t * 0.5) % 1;
      ctx.save(); ctx.beginPath(); ctx.ellipse(x, y, R - 1, ry - 1, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = "rgba(255,255,255," + 0.35 * sh + ")"; ctx.fillRect(x - R + u * R * 2 - 4, y - ry, 8, ry * 2);
      ctx.restore();
    }
    // The rivet.
    if (P.rivet || rivetFly) {
      let rx = g.tabX, ry2 = g.tabY;
      if (rivetFly) { const u = clamp((t - rivetFly.t0) / rivetFly.dur, 0, 1); rx = lerp(g.tinX, g.tabX, ease(u)); ry2 = lerp(g.tinY - 4, g.tabY, ease(u)) - Math.sin(PI * u) * 30; }
      drawRivet(rx, ry2, rivetFly ? 1 : P.rivet);
    }
  }
  function lerpHex(a, b, t) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return css(mixRGB(p(a), p(b), clamp(t, 0, 1))); }
  // A copper rivet: a pin standing in the hole at stage 1, its head spreading rounder with each blow after.
  function drawRivet(x, y, stage) {
    const r = stage <= 1 ? 2.2 : 2.2 + (stage - 1) * 0.75, hgt = stage <= 1 ? 6 : Math.max(1.5, 6 - (stage - 1) * 1.6);
    rr(x - 2, y - hgt, 4, hgt, 1); fillStroke("#C8743A", 1.4);
    ctx.beginPath(); ctx.ellipse(x, y - hgt, r, r * 0.7, 0, 0, TAU);
    const gr = ctx.createRadialGradient(x - r * 0.3, y - hgt - r * 0.3, 0.2, x, y - hgt, r);
    gr.addColorStop(0, "#FFD2A6"); gr.addColorStop(1, "#B8662F");
    fillStroke(gr, 1.4);
  }
  function drawTin() {
    const x = g.tinX, y = g.tinY;
    ctx.beginPath(); ctx.ellipse(x, y, 13, 5, 0, 0, TAU); fillStroke("#8C969E", 2);
    rr(x - 13, y - 8, 26, 8, 2); fillStroke("#A3ACBC", 2);
    ctx.beginPath(); ctx.ellipse(x, y - 8, 13, 5, 0, 0, TAU); fillStroke("#5A6170", 2);
    if (!P.rivet && !rivetFly) [[-5, -9], [0, -11], [5, -9]].forEach(([dx, dy]) => drawRivet(x + dx, y + dy + 2, 1));
  }
  function drawCloth(t) {
    let x = g.clothX, y = g.clothY;
    if (CL.rub) {
      const u = (t - CL.rub) / 1.8, a = u * TAU * 2.5;
      x = g.bowlX + Math.cos(a) * 16 + Math.sin(u * PI) * 10; y = g.bowlY - 2 + Math.sin(a) * 6;
    } else if (CL.drag) { x = CL.x; y = CL.y; }
    CL.x = x; CL.y = y;
    ctx.beginPath(); ctx.moveTo(x - 16, y + 4); ctx.quadraticCurveTo(x - 10, y - 10, x + 2, y - 8); ctx.quadraticCurveTo(x + 16, y - 9, x + 15, y + 3);
    ctx.quadraticCurveTo(x, y + 9, x - 16, y + 4); ctx.closePath(); fillStroke("#F2E6C9", 2);
    ctx.strokeStyle = "rgba(29,35,64,0.35)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 8, y - 4); ctx.quadraticCurveTo(x, y, x + 8, y - 3); ctx.stroke();
  }

  // =====================================================================================================
  // Drawing the tools, the robin and the effects
  // =====================================================================================================
  // The twisting wrench sits on the bar above the jaws; seen a little from above, its arms sweep an ellipse.
  const WR_Y = 0.5;
  function wrenchEnd(s) { const c = wrenchCenter(); return { x: c.x + s * Math.cos(WR.ang) * 40, y: c.y + s * Math.sin(WR.ang) * 40 * WR_Y }; }
  function drawWrench() {
    const c = wrenchCenter(), a = wrenchEnd(1), b = wrenchEnd(-1);
    ctx.lineCap = "round";
    ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.lineWidth = 4.5; ctx.strokeStyle = "#5E6573"; ctx.stroke();
    ctx.lineCap = "butt";
    rr(c.x - 7, c.y - 5, 14, 10, 3); fillStroke("#6E7684", 2);
    [a, b].forEach((p) => { ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 5, 0, 0, TAU); fillStroke("#C98B4E", 2); });
  }
  // The hammer hangs raised over the work and pivots on the end of its handle to strike.
  function drawHammer(t) {
    const u = t - HM.t0;
    let th = 0.7;
    if (u < 0.08) th = lerp(0.7, 0, u / 0.08);
    else if (u < 0.42) th = HM.cold ? 0.7 * ease((u - 0.08) / 0.34) + Math.sin((u - 0.08) * 30) * 0.06 * (1 - (u - 0.08) / 0.34) : 0.7 * ease((u - 0.08) / 0.34);
    const px = HM.x + 50, py = HM.y + 22;
    ctx.save(); ctx.translate(px, py); ctx.rotate(th);
    ctx.lineCap = "round";
    ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-48, -26); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = "#C98B4E"; ctx.stroke();
    ctx.lineCap = "butt";
    ctx.save(); ctx.translate(-50, -27); ctx.rotate(0.5);
    rr(-13, -6, 26, 12, 3); fillStroke("#5E6573");
    ctx.fillStyle = "#9AA3B0"; ctx.fillRect(-11, -4, 22, 3);
    ctx.restore(); ctx.restore();
  }
  function hammerRest() {
    const st = curStep();
    if (st && st.kind === "dish") { const c = discCenter(); return { x: c.x - 6, y: c.y - 14 }; }
    if (st && st.kind === "rivet") return { x: g.tabX, y: g.tabY - 2 };
    if (B.where === "anvil" && !B.fly) { const p = workPoint(); if (p) return { x: p.x, y: p.y }; }
    return null;
  }
  // Surprise: a robin flies in, hops on the anvil's horn and flies off.
  let robin = null;
  function drawRobin(t) {
    const u = t - robin.t0, lx = g.hornTip + 8, ly = g.ay - 2;
    let x, y, fly = true, dir = 1;
    if (u < 1.3) { const e = ease(u / 1.3); x = lerp(lx - 160, lx, e); y = lerp(ly - 150, ly, e) - Math.sin(PI * e) * 20; }
    else if (u < 4.2) { fly = false; const hop = Math.max(0, Math.sin((u - 1.6) * PI * 1.5)); x = lx + (u > 2.6 ? 8 : 0); y = ly - (u > 1.6 && u < 3.6 ? hop * 6 : 0); dir = u > 3.3 ? -1 : 1; }
    else if (u < 5.6) { const e = ease((u - 4.2) / 1.4); x = lerp(lx + 8, lx + 200, e); y = lerp(ly, ly - 190, e); dir = 1; }
    else { robin = null; return; }
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * 1.4, 1.4);
    ctx.beginPath(); ctx.ellipse(-2, -8, 10, 7.5, -0.15, 0, TAU); fillStroke("#8A6A4F", 2);
    ctx.beginPath(); ctx.ellipse(4, -6, 5.5, 5, 0, 0, TAU); ctx.fillStyle = "#E8743B"; ctx.fill();
    ctx.beginPath(); ctx.arc(6, -15, 5.5, 0, TAU); fillStroke("#8A6A4F", 2);
    ctx.beginPath(); ctx.arc(7, -14, 3.5, 0, TAU); ctx.fillStyle = "#E8743B"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(11, -16); ctx.lineTo(15, -15); ctx.lineTo(11, -14); ctx.closePath(); fillStroke("#E8B13B", 1.2);
    ctx.beginPath(); ctx.arc(7.5, -16.5, 1.3, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-11, -9); ctx.lineTo(-18, -12); ctx.lineTo(-17, -6); ctx.closePath(); fillStroke("#6E523C", 1.6);
    if (fly) {
      const fl = Math.sin(t * 30) * 8;
      ctx.beginPath(); ctx.moveTo(-4, -11); ctx.quadraticCurveTo(-8, -20 - fl, 2, -14 - fl); ctx.closePath(); fillStroke("#6E523C", 1.6);
    } else {
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(-3, 2); ctx.moveTo(1, -1); ctx.lineTo(1, 2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawFx() {
    fx.forEach((p) => {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.type === "spark" || p.type === "shower") {
        ctx.strokeStyle = "rgba(255," + Math.round(180 + 70 * a) + "," + Math.round(60 + 100 * a) + "," + a + ")"; ctx.lineWidth = p.type === "shower" ? 2.6 : 1.8; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke(); ctx.lineCap = "butt";
      } else if (p.type === "scale") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = "rgba(40,36,40," + a + ")"; ctx.fillRect(-1.6, -1, 3.2, 2); ctx.restore();
      } else if (p.type === "steam") {
        const r = 6 + (1 - a) * 20;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = "rgba(255,255,255," + 0.5 * a + ")"; ctx.fill();
      } else if (p.type === "ember") {
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.8, 0, TAU); ctx.fillStyle = "rgba(255,170,60," + a + ")"; ctx.fill();
      } else if (p.type === "drop") {
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, TAU); ctx.fillStyle = "rgba(160,215,255," + a + ")"; ctx.fill();
      } else if (p.type === "ring") {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - a) * 14, 0, TAU); ctx.strokeStyle = "rgba(255,255,255," + 0.7 * a + ")"; ctx.lineWidth = 2; ctx.stroke();
      } else if (p.type === "shine") {
        const s = 2 + 5 * Math.sin(PI * a);
        ctx.fillStyle = "rgba(255,250,220," + a + ")";
        ctx.beginPath(); ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x + s * 0.3, p.y); ctx.lineTo(p.x, p.y + s); ctx.lineTo(p.x - s * 0.3, p.y); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x, p.y + s * 0.3); ctx.lineTo(p.x + s, p.y); ctx.lineTo(p.x, p.y - s * 0.3); ctx.closePath(); ctx.fill();
      }
    });
  }
  // The yellow ring round the next thing to do.
  function drawRing(t) {
    const w = want();
    let part = w && w.part;
    if (ringPart && t < ringUntil) part = ringPart;
    if (!part || press.active()) return;
    const p = partPt(part);
    if (!p) return;
    const r = p.r + 3 * Math.sin(t * 4);
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.lineWidth = 7; ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = "#FFC93C"; ctx.stroke();
  }

  let dim = 1;
  function draw(t) {
    drawRoom();
    drawRack(t);
    drawForgeBack(t);
    drawBlower();
    drawViseBack();
    drawTubBack();
    drawAnvil();
    const st = curStep(), show = t >= B.hideUntil;
    if (st && st.kind === "dish") { drawStake(); drawDisc(t); }
    if (st && (st.kind === "rivet" || st.kind === "polish") && show) drawAssembled(t);
    if (st && st.kind === "rivet") drawTin();
    if (st && st.kind === "polish") drawCloth(t);
    if (show && B.where !== "assembled" && B.pts.length) {
      if (B.where !== "vise" || B.fly) drawTongs();
      drawBar(B.pts, P.bar, 1, { spoon: P.make === "spoon", hole: P.make === "spoon" && P.step > 1, thick: MAKE_BY[P.make].thick });
    }
    drawForgeFront(t);
    drawViseFront();
    drawTubFront(t);
    if (show && B.where === "vise" && !B.fly && !(st && st.kind === "dish")) drawWrench();
    const hr = HM.t0 > t - 0.42 ? { x: HM.x, y: HM.y } : hammerRest();
    if (hr && show) { if (t - HM.t0 >= 0.42) { HM.x = hr.x; HM.y = hr.y; } drawHammer(t); }
    rack.forEach((it, k) => drawRackItem(it, k, t, true));
    if (robin) drawRobin(t);
    drawFx();
    if (!locked()) drawRing(t);
    // Winding down at the end of play time: the room darkens round the embers.
    if (dim < 1) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = "rgba(20,12,8," + (1 - dim) * 0.6 + ")"; ctx.fillRect(0, 0, W, H); }
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  // The part under a press, in world units, with at least a finger-sized target.
  function hitPart(cx, cy) {
    if (locked()) return null;
    const w = wpt(cx, cy), minR = 26 / vs;
    const near = (x, y, r) => Math.hypot(w.x - x, w.y - y) <= Math.max(r, minR);
    const st = curStep(), kind = st && st.kind;
    if (kind === "rivet") {
      if (!P.rivet && !rivetFly && near(g.tinX, g.tinY - 4, 18)) return "rivet";
      if ((P.rivet || rivetFly) && near(g.tabX, g.tabY, 18)) return "rivethead";
    }
    if (kind === "polish" && (near(CL.x || g.clothX, CL.y || g.clothY, 24) || near(g.bowlX, g.bowlY, 30))) return "cloth";
    if (kind === "dish") { const c = discCenter(); if (Math.hypot((w.x - c.x) / 1, (w.y - c.y + 6) / 0.7) < 36) return "disc"; }
    if (B.where === "vise" && !B.fly && kind !== "dish" && B.pts.length) {
      const a = wrenchEnd(1), b = wrenchEnd(-1), c = wrenchCenter();
      if (near(a.x, a.y, 16) || near(b.x, b.y, 16) || near(c.x, c.y, 14)) return "wrench";
    }
    const bl = L.blower, kr = bl.r * 0.78;
    if (near(bl.x + Math.cos(F.crank) * kr, bl.y + Math.sin(F.crank) * kr, 16) || near(bl.x, bl.y, bl.r + 4)) return "crank";
    if (t0Shown() && (B.where === "fire" || B.where === "anvil" || B.where === "tub") && !B.fly) {
      const tg = tongsGrip();
      if (near(tg.gx, tg.gy, 16) || near(lerp(tg.jx, tg.gx, 0.5), lerp(tg.jy, tg.gy, 0.5), 12)) return "tongs";
    }
    if (t0Shown() && B.pts.length && B.where !== "assembled" && nearestSeg(B.pts, w.x, w.y).d * vs < Math.max(14, 12 * vs)) return "bar";
    const place = placeAt(w);
    if (place) return place;
    const R = L.rack;
    if (w.x > R.x && w.x < R.x + R.w && w.y > R.y - 6 && w.y < R.y + 80) {
      const k = Math.floor((w.x - R.x) / (R.w / RACK_MAX));
      if (rack[k]) return "rack" + k;
    }
    return "";
  }
  const t0Shown = () => now() >= B.hideUntil;
  function isHammer(part) {
    const kind = (curStep() || {}).kind;
    if (part === "bar" || part === "anvil") return B.where === "anvil" && !B.fly && (part === "bar" || !kind || PLACE[kind] || kind === "dunk") && B.pts.length && t0Shown();
    return part === "disc" || part === "rivethead";
  }
  function strike(part, w) {
    if (part === "disc") dishAt(w.x, w.y);
    else if (part === "rivethead") rivetHit();
    else if (part === "anvil") {
      // A blow on the anvil near the bar lands on the bar.
      if (nearestSeg(B.pts, w.x, w.y).d < 50) hammerAt(w.x, w.y);
      else { swing(w.x, g.ay - 4, true); snd.clink(); }
    } else hammerAt(w.x, w.y);
  }
  let drag = null, holdTimer = 0;
  function stopHold() { clearInterval(holdTimer); holdTimer = 0; }
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  const NAMES = { fire: "Forge", anvil: "Anvil", vise: "Vise", tub: "Slack tub", tongs: "Tongs", bar: "Steel bar" };
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    down: (part, e, s) => {
      drag = null;
      if (locked() || !isHammer(part)) return;
      strike(part, wpt(s.x0, s.y0));
      // Holding keeps hammering at a calm, steady beat where the finger is.
      stopHold();
      holdTimer = setInterval(() => { if (locked()) { stopHold(); return; } const w = wpt(s.x, s.y), p = hitPart(s.x, s.y); strike(isHammer(p) ? p : part, w); }, 620);
    },
    dragStart: (part, e, s) => {
      if (locked()) return;
      const w = wpt(s.x, s.y);
      const bl = L.blower;
      if (part === "crank") drag = { k: "crank", a: Math.atan2(w.y - bl.y, w.x - bl.x) };
      else if (part === "wrench") { const c = wrenchCenter(); drag = { k: "wrench", a: Math.atan2((w.y - c.y) / WR_Y, w.x - c.x) }; }
      else if (part === "tongs" || (part === "bar" && (B.where === "fire" || B.where === "tub"))) { if (startCarry(w)) drag = { k: "carry" }; }
      else if (part === "rivet") drag = { k: "rivet" };
      else if (part === "cloth") { CL.rub = 0; CL.drag = true; drag = { k: "cloth", x: w.x, y: w.y }; }
    },
    move: (part, e, s) => {
      if (!drag || locked()) return;
      const w = wpt(s.x, s.y);
      if (drag.k === "crank") {
        const bl = L.blower, a = Math.atan2(w.y - bl.y, w.x - bl.x);
        let d = a - drag.a; d = Math.atan2(Math.sin(d), Math.cos(d)); drag.a = a;
        crankBy(Math.abs(d)); ghost.learned("crank");
      } else if (drag.k === "wrench") {
        const c = wrenchCenter(), a = Math.atan2((w.y - c.y) / WR_Y, w.x - c.x);
        let d = a - drag.a; d = Math.atan2(Math.sin(d), Math.cos(d)); drag.a = a;
        if (Math.abs(d) > 1e-3) { WR.dir = Math.sign(d); if (!twistBy(d)) { drag = null; coldHint(c.x, c.y); } }
      } else if (drag.k === "carry" && B.carry) {
        B.pose = { x: w.x + B.carry.ox, y: w.y + B.carry.oy, ang: B.pose.ang, held: B.pose.held };
      } else if (drag.k === "rivet") {
        drag.x = w.x; drag.y = w.y;
      } else if (drag.k === "cloth") {
        const d = Math.hypot(w.x - drag.x, w.y - drag.y);
        CL.x = w.x; CL.y = w.y; drag.x = w.x; drag.y = w.y;
        if (Math.hypot(w.x - g.bowlX, w.y - g.bowlY) < 80) polishBy(d);
        ghost.learned("cloth");
      }
    },
    up: (part, e, s) => {
      stopHold();
      const d = drag; drag = null;
      if (!d || locked()) return;
      const w = wpt(s.x, s.y);
      if (d.k === "carry") { dropCarry(w); ghost.learned("tongs"); }
      else if (d.k === "rivet") { if (Math.hypot(w.x - g.tabX, w.y - g.tabY) < 40) rivetIn(); else hint(); }
      else if (d.k === "cloth") CL.drag = false;
    },
    tap: (part) => {
      if (locked() || isHammer(part)) return;
      const st = curStep();
      if (part === "crank") { F.auto += 1; ghost.learned("crank"); }
      else if (part === "wrench") wrenchTap();
      else if (part === "rivet") rivetIn();
      else if (part === "cloth") polishTap();
      else if (part === "tongs") {
        // With the plain Bar, a tap on the tongs turns the bar round so the other end can be worked.
        if (!st && B.where !== "tub") { B.flip = !B.flip; const wh = B.where; B.where = ""; moveBar(wh); }
        else { const t = tongsGrip(); tag("Tongs", t.gx, t.gy); }
      } else if (part === "fire" || part === "anvil" || part === "vise" || part === "tub") {
        if (B.where === part || !movable()) { const p = partPt(part); tag(NAMES[part], p.x, p.y - p.r); if (!movable()) hint(); }
        else moveBar(part);
      } else if (part === "bar") { const m = workPoint() || { x: g.ax, y: g.ay }; tag("Steel bar", m.x, m.y - 10); }
      else if (/^rack\d$/.test(part)) {
        const k = +part.slice(4), R = L.rack;
        tag(MAKE_BY[rack[k].k].name, R.x + (k + 0.5) * R.w / RACK_MAX, R.y + 20);
      } else hint();
    }
  });
  ["gesturestart", "gesturechange"].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));

  // =====================================================================================================
  // Panel, gear-up and surprise
  // =====================================================================================================
  const PIC = {
    spoon: '<svg viewBox="0 0 50 50"><path d="M30 22 L44 6" stroke="#1D2340" stroke-width="7" stroke-linecap="round"/><path d="M30 22 L44 6" stroke="#4A4F5C" stroke-width="3.5" stroke-linecap="round"/><path d="M34 15l3 1M37 12l3 1M40 9l2 1" stroke="#A3ACBC" stroke-width="1.4"/><ellipse cx="20" cy="31" rx="15" ry="12" fill="#C8743A" stroke="#1D2340" stroke-width="2"/><ellipse cx="16" cy="27" rx="6" ry="3" fill="#FFD2A6"/><circle cx="29" cy="23" r="2.2" fill="#E9A673" stroke="#1D2340" stroke-width="1.2"/></svg>',
    hook: '<svg viewBox="0 0 50 50"><path d="M30 8a8 8 0 1 0-8 9v14a8 8 0 1 0 8 9" fill="none" stroke="#1D2340" stroke-width="7" stroke-linecap="round"/><path d="M30 8a8 8 0 1 0-8 9v14a8 8 0 1 0 8 9" fill="none" stroke="#4A4F5C" stroke-width="3.5" stroke-linecap="round"/></svg>',
    poker: '<svg viewBox="0 0 50 50"><path d="M12 12 L42 42" stroke="#1D2340" stroke-width="7" stroke-linecap="round"/><path d="M12 12 L42 42" stroke="#4A4F5C" stroke-width="3.5" stroke-linecap="round"/><circle cx="10" cy="10" r="6" fill="none" stroke="#1D2340" stroke-width="7"/><circle cx="10" cy="10" r="6" fill="none" stroke="#4A4F5C" stroke-width="3.5"/><path d="M20 21l3-1M24 25l3-1M28 29l3-1" stroke="#A3ACBC" stroke-width="1.4"/><path d="M42 42l4 4" stroke="#FF7A1C" stroke-width="3" stroke-linecap="round"/></svg>',
    bar: '<svg viewBox="0 0 50 50"><rect x="5" y="20" width="40" height="10" rx="2" fill="#4A4F5C" stroke="#1D2340" stroke-width="2"/><rect x="30" y="20" width="15" height="10" rx="2" fill="#FF8A2A" stroke="#1D2340" stroke-width="2"/><rect x="31" y="21" width="13" height="3" fill="#FFD27A"/></svg>'
  };
  const tiles = Toybox.tiles($("tiles"), {
    items: MAKES.map((m) => ({ id: m.id, name: m.name, pic: PIC[m.id] })),
    value: make, rows: 1,
    onPick: (id) => pickMake(id)
  });
  function pickMake(id) {
    if (!MAKE_BY[id] || id === make) return;
    make = id; P = pieces[id];
    B.flip = false; doneAt = 0; rivetFly = null; CL.rub = 0; WR.left = 0;
    placeRest(true);
    puff("shine", B.pts[N >> 1][0], B.pts[N >> 1][1], 5);
    lastWant = "";
    ghost.poke();
    saveSoon();
  }
  function newWork() {
    if (locked()) return;
    pieces[make] = P = newPiece(make);
    B.flip = false; doneAt = 0; rivetFly = null; CL.rub = 0; WR.left = 0; finishing = 0; B.hideUntil = 0;
    placeRest(true);
    for (let i = 4; i < N; i += 8) puff("shine", B.pts[i][0], B.pts[i][1], 1);
    snd.place();
    lastWant = "";
    saveSoon();
  }
  Toybox.bar($("bottom"), { onNew: newWork, onSurprise: surprise });
  tiles.set(make);

  // Takes turns between three moments on the scene: a tall shower of sparks from the fire, a robin on the anvil's
  // horn, and the blower spinning by itself while the flames dance up.
  let surpriseNext = 0;
  function surprise() {
    if (locked()) return;
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    if (k === 0) {
      for (let n = 0; n < 7; n++) setTimeout(() => puff("shower", g.coalX + (Math.random() - 0.5) * g.coalHalf, g.coalY - 6, 14), n * 200);
      F.flare = Math.max(F.flare, 0.6); snd.crackle();
    } else if (k === 1) {
      robin = { t0: now() };
      setTimeout(() => snd.chirp(), 1500); setTimeout(() => snd.chirp(), 2900);
    } else {
      F.auto += 3; F.flare = 1;
    }
  }

  const GEAR_ART = {
    eyes: '<svg viewBox="0 0 50 50"><rect x="5" y="17" width="18" height="15" rx="6" fill="#BFE8FF" stroke="#1D2340" stroke-width="2.5"/><rect x="27" y="17" width="18" height="15" rx="6" fill="#BFE8FF" stroke="#1D2340" stroke-width="2.5"/><path d="M23 24h4" stroke="#1D2340" stroke-width="2.5"/></svg>',
    ears: '<svg viewBox="0 0 50 50"><path d="M12 30a13 17 0 0 1 26 0" fill="none" stroke="#1D2340" stroke-width="4"/><rect x="6" y="24" width="11" height="18" rx="5" fill="#FFC93C" stroke="#1D2340" stroke-width="2.5"/><rect x="33" y="24" width="11" height="18" rx="5" fill="#FFC93C" stroke="#1D2340" stroke-width="2.5"/></svg>',
    apron: '<svg viewBox="0 0 50 50"><path d="M17 6h16v10l8 6v24H9V22l8-6z" fill="#8B5A34" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/><rect x="18" y="28" width="14" height="8" rx="2" fill="#6E4527" stroke="#1D2340" stroke-width="2"/></svg>',
    gloves: '<svg viewBox="0 0 50 50"><path d="M6 44V24a4 4 0 0 1 8 0v-4a4 4 0 0 1 8 0v24z" fill="#B07A4C" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 44V24a4 4 0 0 1 8 0v-4a4 4 0 0 1 8 0v24z" fill="#B07A4C" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/></svg>'
  };
  const WORKER = '<rect x="58" y="250" width="22" height="90" rx="11" fill="#3DB4FF" stroke="#1D2340" stroke-width="5"/><rect x="220" y="250" width="22" height="90" rx="11" fill="#3DB4FF" stroke="#1D2340" stroke-width="5"/>' +
    '<circle cx="69" cy="348" r="13" fill="#F2C094" stroke="#1D2340" stroke-width="5"/><circle cx="231" cy="348" r="13" fill="#F2C094" stroke="#1D2340" stroke-width="5"/>' +
    '<path d="M78 400V270q0-60 72-60t72 60v130" fill="#3DB4FF" stroke="#1D2340" stroke-width="5"/>' +
    '<circle cx="150" cy="120" r="56" fill="#F2C094" stroke="#1D2340" stroke-width="5"/><circle cx="130" cy="118" r="6" fill="#1D2340"/><circle cx="170" cy="118" r="6" fill="#1D2340"/>' +
    '<path d="M132 146q18 14 36 0" fill="none" stroke="#1D2340" stroke-width="5" stroke-linecap="round"/>';
  const GEAR = [
    { id: "eyes", name: "Eye protection", art: GEAR_ART.eyes,
      onArt: '<rect x="108" y="100" width="38" height="30" rx="12" fill="rgba(191,232,255,0.8)" stroke="#1D2340" stroke-width="5"/><rect x="154" y="100" width="38" height="30" rx="12" fill="rgba(191,232,255,0.8)" stroke="#1D2340" stroke-width="5"/><path d="M146 115h8M94 112h14M192 112h14" stroke="#1D2340" stroke-width="5"/>' },
    { id: "ears", name: "Ear protection", art: GEAR_ART.ears,
      onArt: '<path d="M96 120a54 70 0 0 1 108 0" fill="none" stroke="#1D2340" stroke-width="8"/><rect x="78" y="100" width="26" height="44" rx="11" fill="#FFC93C" stroke="#1D2340" stroke-width="5"/><rect x="196" y="100" width="26" height="44" rx="11" fill="#FFC93C" stroke="#1D2340" stroke-width="5"/>' },
    { id: "apron", name: "Leather apron", art: GEAR_ART.apron,
      onArt: '<path d="M126 196l-8-14M174 196l8-14" stroke="#6E4527" stroke-width="6" stroke-linecap="round"/><path d="M116 198h68v34l14 10v158H102V242l14-10z" fill="#8B5A34" stroke="#1D2340" stroke-width="5" stroke-linejoin="round"/><rect x="124" y="284" width="52" height="30" rx="6" fill="#6E4527" stroke="#1D2340" stroke-width="4"/>' },
    { id: "gloves", name: "Gloves", art: GEAR_ART.gloves,
      onArt: '<rect x="52" y="318" width="34" height="46" rx="12" fill="#B07A4C" stroke="#1D2340" stroke-width="5"/><rect x="214" y="318" width="34" height="46" rx="12" fill="#B07A4C" stroke="#1D2340" stroke-width="5"/>' }
  ];
  let gearOn = false;
  try { gearOn = sessionStorage.getItem("forge-gear") === "on"; } catch (e) { gearOn = false; }
  if (!gearOn) {
    gateUp = true;
    Toybox.gate({ flag: "forge-gear", title: "Gear up!", viewBox: "0 0 300 400", worker: WORKER, workerLabel: "Put all the gear on",
      items: GEAR, done: () => { gateUp = false; lastWant = ""; ghost.poke(); } });
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now();
  function loop() {
    const t = now(), dt = Math.min(0.05, t - lastT); lastT = t;
    fireStep(dt);
    wrenchStep(dt);
    updateBar(t);
    heatStep(dt);
    clothStep(t, dt);
    if (rivetFly && t - rivetFly.t0 >= rivetFly.dur) { rivetFly = null; P.rivet = Math.max(1, P.rivet); snd.copper(); saveSoon(); }
    if (finishing && t >= finishing) { finishing = 0; lastWant = ""; }
    // Once, when the part he needs glows orange in the fire.
    if (B.where === "fire" && !B.fly && !B.hotSaid) {
      const st = curStep(), r = st && PLACE[st.kind] ? heatRegion(st) : st ? null : freeReg();
      if (r && avgHeat(r[0], r[1]) >= HOT) {
        B.hotSaid = true;
        coach.say(st && st.kind === "twist" ? "The bar glows orange. It is hot enough to twist." : "The bar glows orange. It is hot enough to hammer.", 3);
      }
    }
    fxStep(dt);
    checkStep(t);
    camStep(dt);
    if (dim !== (ending ? 0.35 : 1)) dim += Math.sign((ending ? 0.35 : 1) - dim) * Math.min(Math.abs((ending ? 0.35 : 1) - dim), dt / 2);
    if (!gateUp) updateCoach();
    draw(t);
    requestAnimationFrame(loop);
  }
  function onEnding(done) {
    ending = true;
    stopHold(); drag = null; F.auto = 0; WR.left = 0; CL.rub = 0;
    setTimeout(done, 2600);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 160 120">' +
      '<rect x="0" y="0" width="160" height="120" fill="#6E5547"/><rect x="0" y="92" width="160" height="28" fill="#5A4337"/>' +
      '<rect x="62" y="80" width="40" height="34" rx="3" fill="#9A6B43" stroke="#1D2340" stroke-width="2.5"/>' +
      '<path d="M24 58q20-8 34-8h60v14l-14 4q-6 6-2 12h10v6H60v-6h10q4-6-2-12l-12-2q-18 0-32-8z" fill="#4A5160" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="40" y="44" width="70" height="6" rx="2" fill="#5A3A34" stroke="#1D2340" stroke-width="2"/><rect x="88" y="44" width="22" height="6" rx="2" fill="#8A2414"/></svg>';
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "forge",
    badge: $("tbadge"),
    timerIntro: "When time is up, the fire dies down to embers and the bar cools.",
    goodbyeOption: "End with a “Goodnight, Forge” button to press",
    farewellText: "Time to let the fire go out",
    goodbyeLabel: "Goodnight, Forge",
    farewellDone: "Night night, Forge!",
    restLine: "The forge is resting.",
    restLine2: "The rack and the spoon will be right here next time.",
    restArt,
    soundNote: "Soft hammer rings, whooshes and hisses. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; lastT = now(); },
    onSound: (on) => { if (on) snd.chime(); }
  });
  requestAnimationFrame(loop);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    const st = () => curStep();
    window.__forge = {
      state: () => {
        const s = st(), w = want();
        return { make, step: s ? s.kind + (s.end ? ":" + s.end : "") : null, stepIndex: P.step, where: B.where, flying: !!B.fly,
          fire: +F.fire.toFixed(2), maxHeat: +maxHeat().toFixed(2), regionHeat: s && PLACE[s.kind] ? +avgHeat(...heatRegion(s)).toFixed(2) : null,
          twist: +(P.bar.tw[TWIST_REG[1]] - P.bar.tw[TWIST_REG[0]]).toFixed(2), tabTh: +avgOf(P.bar.th, N - 8, N - 1).toFixed(2),
          endTh: +avgOf(P.bar.th, 0, 7).toFixed(2), neck: +sumBend(N - 12, N - 6).toFixed(2), depth: +P.disc.depth.toFixed(2),
          rivet: P.rivet, shine: +P.shine.toFixed(2), rack: rack.length, want: w && w.part, coach: coach.text(), gate: gateUp };
      },
      // Viewport point of a part (for tools/shot.js tap steps).
      pt: (part) => { const p = partPt(part); return p && vp(p.x, p.y); },
      tap: (part) => {
        if (isHammer(part) || part === "work") { const p = workPoint(); if (part === "work" || part === "bar") hammerAt(p.x, p.y); else strike(part, partPt(part)); return; }
        const fn = { crank: () => { F.auto += 1; }, wrench: wrenchTap, rivet: rivetIn, rivethead: rivetHit, cloth: polishTap,
          disc: () => { const c = discCenter(); dishAt(c.x + (Math.random() - 0.5) * 30, c.y); } }[part];
        if (fn) fn(); else moveBar(part);
      },
      // Stands in for waiting at the fire: the step's part of the bar glows orange.
      heat: () => { const s = st(), r = s && PLACE[s.kind] ? heatRegion(s) : [0, N - 1]; for (let i = Math.max(0, r[0] - 2); i <= Math.min(N - 1, r[1] + 2); i++) P.bar.heat[i] = 0.9; },
      // One move toward finishing the current step, the way he would do it.
      auto: () => {
        const w = want();
        if (!w) return "wait";
        if (!w.part) { window.__forge.heat(); return "heat"; }
        if (w.part === "crank") { F.fire = 1; return "crank"; }
        if (w.part === "work") { const p = workPoint(); hammerAt(p.x, p.y); return "hammer"; }
        window.__forge.tap(w.part);
        return w.part;
      },
      make: (id) => { pickMake(id); tiles.set(id); },
      tongs: () => { const t = tongsGrip(); return vp(t.gx, t.gy); },
      ghost: () => ghost.show()
    };
  }
})();
