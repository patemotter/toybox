(function () {
  "use strict";
  // Sewing Machine: the family's white computerized sewing machine (drawn without its logo), seen from the chair:
  // the head with the needle on the left, the arm, the pillar with the screen on the right, the handwheel on its
  // side, the spool on top and the foot pedal on the floor. He sews for real:
  //   Start/Stop (green, red while sewing) or the foot pedal runs the machine; the needle goes up and down, the
  //   take-up lever bobs, the feed dogs move the fabric away from him one stitch at a time and the handwheel turns.
  //   He steers by dragging the fabric sideways while it sews. The stitch tiles (and the arrow keys under the
  //   screen) pick the stitch: the needle swings sideways and the feed goes forward and back to make it.
  //   Reverse sews a few stitches backwards (a back-tack); the needle button puts the needle down or up; the
  //   speed slider is Slow / Medium / Fast; turning the handwheel sews one stitch by hand.
  //   The presser foot lever lifts the foot: then the fabric slides freely (move it to sew another row, or pull
  //   it out toward him). The thread cutter on the side of the head snips the threads: the piece is done.
  //   A tap on a spool in the thread rack threads that color; a tap on a fabric in the pile starts a new piece.
  // Units: one "unit" is the drawing's own scale; x to the right, y down; the needle point on the needle plate
  // is (0, 0). The fabric is drawn flat on the table without perspective so the stitches keep their shape.
  //
  // Sections:
  //   Setup and saved state
  //   Stitches, threads and fabrics
  //   Layout and projection
  //   Fabric texture
  //   The machine's motion
  //   Actions
  //   Coach, counter, ghost, tiles, bottom bar
  //   Surprise
  //   Sound
  //   Input
  //   Drawing helpers
  //   Drawing the scene
  //   Loop and start
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2, INK = "#1D2340";
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  const now = () => performance.now() / 1000;
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const locked = () => !!(window.Toybox && Toybox.timer.locked());

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  // localStorage "sewing-machine-v1": { stitch, thread, fabric, speed, pieces, fx, ftop, foot, runs: [{ c, p: [u, w, ...] }], open }
  const KEY = "sewing-machine-v1";
  const startFresh = !!(window.Toybox && Toybox.fresh());
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (startFresh || typeof saved !== "object" || Array.isArray(saved)) saved = {};

  // =====================================================================================================
  // Stitches, threads and fabrics
  // =====================================================================================================
  // Each stitch is the list of needle drops in one repeat: [sideways, along] (units; "along" grows away from the
  // back edge of the fabric, toward him). The feed between two drops is the difference in "along" (it can be
  // negative: decorative stitches feed back and forth, like the real machine), the needle swings to "sideways".
  function heartSeq() {
    const out = [], n = 14;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, hx = 16 * Math.pow(Math.sin(a), 3);
      const hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
      out.push([hx * 0.25, (12 - hy) * 0.24]);
    }
    // all the way round, back to the notch, then down the right side again to the tip (where the next one starts)
    return out.concat([out[0]], out.slice(1, 8));
  }
  function starSeq() {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.8 : 4.2;
      out.push([r * Math.cos(a), 4.5 + r * Math.sin(a)]);
    }
    return out.concat([out[0]], out.slice(1, 5));
  }
  const STITCHES = [
    { id: "straight", name: "Straight", seq: [[0, 0]], R: 2.4 },
    { id: "zigzag", name: "Zigzag", seq: [[-3.4, 0], [3.4, 1.5]], R: 3 },
    { id: "wave", name: "Wave", seq: Array.from({ length: 10 }, (_, i) => [3.4 * Math.sin(i / 10 * TAU), i * 1.1]), R: 11 },
    { id: "scallop", name: "Scallop", seq: Array.from({ length: 8 }, (_, i) => [-3.4 + 6.8 * Math.sin(Math.PI * i / 8), i * 1.15]), R: 9.2 },
    { id: "hearts", name: "Hearts", seq: heartSeq(), R: 9.5 },
    { id: "stars", name: "Stars", seq: starSeq(), R: 10.5 }
  ];
  const ST = {};
  STITCHES.forEach((s) => { ST[s.id] = s; });
  const THREADS = [
    { name: "Red", c: "#E23B4E" }, { name: "Orange", c: "#FF8A1F" }, { name: "Yellow", c: "#FFD21F" },
    { name: "Green", c: "#2FAE57" }, { name: "Blue", c: "#2F6FE0" }, { name: "Purple", c: "#8A4FD8" }, { name: "Pink", c: "#FF6FB1" }
  ];
  const FABRICS = [
    { name: "Red check", base: "#FBE3DF", ink: "rgba(226,59,78,0.42)", kind: "check" },
    { name: "Denim", base: "#5F86BE", ink: "rgba(255,255,255,0.16)", kind: "twill" },
    { name: "Yellow dots", base: "#FFE58A", ink: "#FFFFFF", kind: "dots" },
    { name: "Green stripes", base: "#D3EFC9", ink: "#9FD58F", kind: "stripes" },
    { name: "Purple", base: "#D9CCF2", ink: "rgba(138,79,216,0.12)", kind: "plain" }
  ];
  const pickIdx = (v, n, d) => (Number.isInteger(v) && v >= 0 && v < n ? v : d);
  const S = {
    stitch: ST[saved.stitch] ? saved.stitch : "straight",
    thread: pickIdx(saved.thread, THREADS.length, 4),
    fabric: pickIdx(saved.fabric, FABRICS.length, 0),
    speed: pickIdx(saved.speed, 3, 1),
    pieces: pickIdx(saved.pieces, 1e6, 0)
  };
  const SPEED = [1.5, 2.4, 3.6];            // stitches a second: Slow, Medium, Fast (calm, AGENTS.md "Pace")
  const SPEED_NAME = ["Slow", "Medium", "Fast"];

  // The fabric: FW x FH units, drawn with its back-left corner at (F.x, F.top).
  const FW = 64, FH = 42, START_TOP = -7;
  const F = { x: -FW / 2, top: START_TOP, slide: null, swap: null };
  if (typeof saved.fx === "number" && isFinite(saved.fx)) F.x = clamp(saved.fx, -70, 10);
  if (typeof saved.ftop === "number" && isFinite(saved.ftop)) F.top = clamp(saved.ftop, -(FH - 1), 8);
  // Seams: runs of needle drops in fabric units (u from the left edge, w from the back edge), one thread color each.
  let runs = [];
  if (Array.isArray(saved.runs)) {
    runs = saved.runs.filter((r) => r && Array.isArray(r.p) && Number.isInteger(r.c) && r.c >= 0 && r.c < THREADS.length)
      .map((r) => ({ c: r.c, p: r.p.filter((v) => typeof v === "number" && isFinite(v)) })).slice(-60);
  }
  // the run still attached to the needle (threads not snipped yet), or null
  let cur = Number.isInteger(saved.open) && runs[saved.open] ? runs[saved.open] : null;
  let saveT = 0;
  function save() {
    saveT = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({ stitch: S.stitch, thread: S.thread, fabric: S.fabric, speed: S.speed, pieces: S.pieces,
        fx: +F.x.toFixed(2), ftop: +F.top.toFixed(2), foot: M.foot, runs: runs.map((r) => ({ c: r.c, p: r.p.map((v) => +v.toFixed(2)) })),
        open: cur ? runs.indexOf(cur) : -1 }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveT) saveT = setTimeout(save, 600); }

  // =====================================================================================================
  // Layout and projection
  // =====================================================================================================
  const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
  let W = 300, H = 300, DPR = 1, sc = 2, ox = 0, oy = 0, tall = true;
  // The machine (fixed): the head with the needle (left), the arm, the pillar (right) and the bed.
  const HEAD = { l: -34, r: 12, t: -82, b: -20 };
  const ARM = { l: -34, r: 46, t: -82, b: -50 };
  const PIL = { l: 44, r: 68, t: -82, b: -1 };
  const TOPB = { l: -34, r: 68, t: -92, b: -82 };
  const BED = { l: -64, r: 74, t: -8, b: 24 };
  const WHEEL = { x: 71, y: -55, rx: 3.4, ry: 15 };
  const BTN = { start: { x: -19, y: -35, r: 4.6 }, rev: { x: -29, y: -40, r: 3 }, ndl: { x: -29, y: -31, r: 3 },
    left: { x: 51, y: -59.5, r: 2.8 }, right: { x: 61, y: -59.5, r: 2.8 } };
  const SLIDER = { l: -31.5, r: -14.5, y: -24.5 };
  const LCD = { x: 47, y: -78, w: 18, h: 13 };
  const CUTTER = { x: -35.5, y: -47 };
  const SPOOL = { x: 32, y: -88 };
  const LEVER = { x: 5, y: -22 };
  const TABLE = { t: -46, b: 38, face: 44 };
  // Things around the machine move with the layout: the thread rack, the fabric pile, the button jar, the pedal.
  let L = null;
  function layoutScene() {
    tall = W / H < 1.15;
    const l = { tall };
    if (tall) {
      // the table runs off both sides of the stage, so the machine can be bigger
      l.tl = -98; l.tr = 102;
      l.shelf = { l: -67, r: 77, y: -104 };
      l.spools = THREADS.map((_, i) => ({ x: 28 + i * 7.6, y: -104 }));
      l.fabs = FABRICS.map((_, i) => ({ x: -65 + i * 13.2, y: -112, w: 11.5, h: 8 }));
      l.jar = { x: 14, y: -104 };
      l.pedal = { x: -36, y: 58 };
      l.box = { l: -68, r: 78, t: -122, b: 64 };
    } else {
      l.tl = -122; l.tr = 128;
      l.shelf = null;
      l.rack = { l: 80, r: 126, t: -30, b: 2 };
      l.spools = THREADS.map((_, i) => (i < 4 ? { x: 86 + i * 12, y: -11 } : { x: 92 + (i - 4) * 12, y: 1 }));
      l.fabs = [[-118, -36], [-100, -36], [-118, -22], [-100, -22], [-118, -8]].map((p) => ({ x: p[0], y: p[1], w: 16, h: 11 }));
      l.jar = { x: -93, y: 10 };
      l.pedal = { x: -44, y: 52 };
      l.box = { l: -124, r: 130, t: -96, b: 57 };
    }
    L = l;
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(50, r.width); H = Math.max(50, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    layoutScene();
    // room for the counter at the top and the coach line at the bottom (sideways the counter sits over the wall
    // and the coach over the table front, so the scene takes the height)
    const padT = tall ? 40 : 6, padB = tall ? 46 : 14, padX = 8, b = L.box;
    sc = Math.min((W - 2 * padX) / (b.r - b.l), (H - padT - padB) / (b.b - b.t));
    ox = W / 2 - (b.l + b.r) / 2 * sc;
    // A new instruction pops up in the middle of the stage: with room to spare, the middle falls on the front of
    // the table (nothing to tap there) rather than on the buttons.
    oy = clamp(H / 2 - 24 * sc, padT - b.t * sc, H - padB - b.b * sc);
  }
  // world -> stage px, and viewport px
  const sx = (x) => ox + x * sc, sy = (y) => oy + y * sc;
  function vp(x, y) { const b = cv.getBoundingClientRect(); return { x: b.left + sx(x), y: b.top + sy(y) }; }
  function world(cx, cy) { const b = cv.getBoundingClientRect(); return { x: (cx - b.left - ox) / sc, y: (cy - b.top - oy) / sc }; }

  // =====================================================================================================
  // Fabric texture
  // =====================================================================================================
  // The fabric with its seams lives on its own canvas (TS px a unit); new stitches are drawn into it as they happen.
  const TS = 8;
  const tex = document.createElement("canvas");
  tex.width = FW * TS; tex.height = FH * TS;
  const tx = tex.getContext("2d");
  function paintFabric(i, c, w, h, s) {
    const f = FABRICS[i];
    c.fillStyle = f.base; c.fillRect(0, 0, w, h);
    c.save();
    if (f.kind === "check") {
      c.fillStyle = f.ink;
      for (let x = 0; x < w; x += 6 * s) c.fillRect(x, 0, 3 * s, h);
      for (let y = 0; y < h; y += 6 * s) c.fillRect(0, y, w, 3 * s);
    } else if (f.kind === "twill") {
      c.strokeStyle = f.ink; c.lineWidth = 0.5 * s;
      for (let x = -h; x < w; x += 1.6 * s) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); }
    } else if (f.kind === "dots") {
      c.fillStyle = f.ink;
      for (let y = 2 * s, row = 0; y < h; y += 4.5 * s, row++) {
        for (let x = (row % 2 ? 4.5 : 2) * s; x < w; x += 5 * s) { c.beginPath(); c.arc(x, y, 0.95 * s, 0, TAU); c.fill(); }
      }
    } else if (f.kind === "stripes") {
      c.fillStyle = f.ink;
      for (let x = 0; x < w; x += 7 * s) c.fillRect(x, 0, 3.2 * s, h);
    } else {
      c.fillStyle = f.ink;
      for (let y = 0; y < h; y += 1.4 * s) c.fillRect(0, y, w, 0.5 * s);
    }
    c.restore();
  }
  const darker = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(v * (1 - k));
    return "rgb(" + f(n >> 16) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")";
  };
  // one stitch: a short thread from drop a to drop b, a little gap at each end where it goes into the fabric
  function stitchInto(c, s, col, ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 0.05) {
      c.fillStyle = darker(col, 0.35); c.beginPath(); c.arc(ax * s, ay * s, 0.55 * s, 0, TAU); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(ax * s, ay * s, 0.38 * s, 0, TAU); c.fill();
      return;
    }
    const g = Math.min(0.28, d * 0.2), ux = (bx - ax) / d, uy = (by - ay) / d;
    const x1 = (ax + ux * g) * s, y1 = (ay + uy * g) * s, x2 = (bx - ux * g) * s, y2 = (by - uy * g) * s;
    c.lineCap = "round";
    c.strokeStyle = darker(col, 0.4); c.lineWidth = 1.0 * s;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = 0.66 * s;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function drawRun(r) {
    const p = r.p, col = THREADS[r.c].c;
    for (let i = 2; i < p.length; i += 2) stitchInto(tx, TS, col, p[i - 2], p[i - 1], p[i], p[i + 1]);
    if (p.length === 2) stitchInto(tx, TS, col, p[0], p[1], p[0], p[1]);
  }
  function repaint() {
    paintFabric(S.fabric, tx, tex.width, tex.height, TS);
    runs.forEach(drawRun);
  }

  // =====================================================================================================
  // The machine's motion
  // =====================================================================================================
  // T counts stitches: the needle is at the top at whole numbers and down in the fabric at k + 0.5. Between k + 0.7
  // and k + 1 (needle up) the needle swings to its next spot and the feed dogs move the fabric.
  const M = {
    T: 0, v: 0, run: false, src: "", goal: null, goalV: 0, lat: 0, mv: null, pi: -1, rev: 0,
    foot: saved.foot === false ? false : true, footA: saved.foot === false ? 1 : 0,
    pedal: false, pedalA: 0, footTries: 0, warn: 0, flash: {}, spool: 0, everSewn: false, steered: false, sewn: 0
  };
  const depth = (T) => (1 - Math.cos(TAU * T)) / 2;
  const needleU = () => M.lat - F.x, needleW = () => -F.top;
  function under() { const u = -F.x, w = needleW(); return u > 0 && u < FW && w > 0 && w < FH; }
  const atEnd = () => under() && needleW() >= FH - 3;
  const attached = () => !!(cur && cur.p.length);
  function nextStep() {
    if (M.rev > 0) { M.rev--; if (M.rev === 0) M.pi = -1; return { lat: 0, feed: -2.2 }; }
    const s = ST[S.stitch], n = s.seq.length;
    if (M.pi < 0) { M.pi = 0; return { lat: s.seq[0][0], feed: 2 }; }
    const a = s.seq[M.pi % n], b = s.seq[(M.pi + 1) % n];
    const feed = b[1] - a[1] + ((M.pi + 1) % n === 0 ? s.R : 0);
    M.pi++;
    return { lat: b[0], feed };
  }
  function drop() {
    // the needle goes into the fabric: one stitch
    snd.tick();
    if (!under()) return;
    const u = needleU(), w = needleW();
    if (u <= 0.4 || u >= FW - 0.4) return;
    if (!cur) { cur = { c: S.thread, p: [] }; runs.push(cur); if (runs.length > 60) runs.shift(); }
    const p = cur.p, n = p.length;
    p.push(u, w);
    if (n) stitchInto(tx, TS, THREADS[cur.c].c, p[n - 2], p[n - 1], u, w);
    else stitchInto(tx, TS, THREADS[cur.c].c, u, w, u, w);
    M.sewn++;
    if (M.sewn % 12 === 0) saveSoon();
  }
  function advance(dT) {
    const T0 = M.T, T1 = T0 + dT;
    if (Math.floor(T0 - 0.5) < Math.floor(T1 - 0.5)) drop();
    if (Math.floor(T0 - 0.7) < Math.floor(T1 - 0.7)) {
      const n = nextStep();
      M.mv = { at: Math.floor(T1 - 0.7) + 0.7, lat0: M.lat, lat1: n.lat, feed: n.feed, done: 0 };
    }
    M.T = T1;
    if (M.mv) {
      const p = clamp((T1 - M.mv.at) / 0.3, 0, 1), dp = p - M.mv.done;
      M.lat = lerp(M.mv.lat0, M.mv.lat1, p);
      // the feed dogs only move the fabric when the presser foot holds it down
      if (M.foot && M.footA < 0.5 && under()) F.top -= M.mv.feed * dp;
      M.mv.done = p;
      if (p >= 1) M.mv = null;
    }
    if (atEnd()) {
      // the end of the fabric: the machine stops with the needle up
      if (M.run || M.goal == null || M.goal - M.T > 1) { M.run = false; M.rev = 0; M.goal = Math.ceil(M.T - 1e-6); M.goalV = Math.max(M.v, SPEED[0]); }
    }
  }
  function motion(dt) {
    if (M.run) {
      const tgt = M.rev > 0 ? SPEED[0] : SPEED[S.speed];
      M.v += (tgt - M.v) * Math.min(1, dt * 5);
      advance(M.v * dt);
    } else if (M.goal != null) {
      M.v += (M.goalV - M.v) * Math.min(1, dt * 6);
      const d = Math.min(M.goal - M.T, Math.max(0.2, M.v) * dt);
      if (d > 0) advance(d);
      if (M.goal - M.T <= 1e-6) { M.T = M.goal; M.goal = null; M.v = 0; saveSoon(); }
    } else M.v = 0;
    if (M.pedal && !M.run && M.pedalA > 0.6 && !locked()) startRun("pedal");
    M.footA += ((M.foot ? 0 : 1) - M.footA) * Math.min(1, dt * 8);
    M.pedalA += ((M.pedal ? 1 : 0) - M.pedalA) * Math.min(1, dt * 14);
    M.spool += M.v * dt * 0.8;
  }

  // =====================================================================================================
  // Actions
  // =====================================================================================================
  const busy = () => M.run || M.goal != null;
  function footBlocked(part) {
    M.footTries++;
    if (M.footTries >= 2) {
      // second try: lower the foot for him and carry on
      setFoot(true);
      return false;
    }
    M.warn = now() + 2.6;
    coach.say("Lower the presser foot lever.", 3);
    glowPart = "lever"; glowT = now() + 3;
    if (part) flashPart(part);
    return true;
  }
  function startRun(src) {
    if (locked() || M.run) return;
    if (!M.foot && footBlocked(src === "pedal" ? "pedal" : "start")) { M.pedal = false; return; }
    if (atEnd()) {
      coach.say("The fabric is all sewn. Lift the presser foot lever.", 3.5);
      glowPart = "lever"; glowT = now() + 3;
      M.pedal = false;
      return;
    }
    M.run = true; M.src = src; M.goal = null; M.everSewn = true; M.footTries = 0;
    snd.motor(true);
    ghost.learned("start");
  }
  function stopRun() {
    if (!M.run) return;
    M.run = false; M.rev = 0;
    M.goal = Math.ceil(M.T - 1e-6); M.goalV = Math.max(SPEED[0], M.v * 0.7);
    if (M.goal === M.T) M.goal = null;
    saveSoon();
  }
  function tapStart() {
    snd.click();
    flashPart("start");
    if (M.run) { stopRun(); return; }
    startRun("button");
  }
  function sewSome(n, part) {
    // a few stitches at Slow (a tap on the pedal, the handwheel or Reverse)
    if (M.run) return;
    if (!M.foot && part !== "wheel" && footBlocked(part)) return;
    if (atEnd() && part !== "wheel") { coach.say("The fabric is all sewn. Lift the presser foot lever.", 3.5); glowPart = "lever"; glowT = now() + 3; return; }
    const base = M.goal != null ? M.goal : M.T;
    M.goal = Math.floor(base + 1e-6) + n; M.goalV = SPEED[0] * (part === "wheel" ? 0.6 : 1);
    M.everSewn = true;
  }
  function tapReverse() {
    snd.click(); flashPart("rev");
    if (!M.foot && footBlocked("rev")) return;
    M.rev = 4;
    if (!M.run) sewSome(4, "rev");
  }
  function tapNeedle() {
    snd.click(); flashPart("ndl");
    if (M.run) return;
    if (M.goal != null) return;
    // needle up -> down into the fabric; down -> up again (finishing the stitch)
    const fr = M.T - Math.floor(M.T);
    M.goalV = SPEED[0] * 0.8;
    M.goal = fr < 0.01 ? Math.floor(M.T) + 0.5 : Math.ceil(M.T);
  }
  function setFoot(down) {
    if (M.foot === down) return;
    M.foot = down;
    snd.clunk();
    if (!down && M.run) stopRun();
    if (down) M.footTries = 0;
    saveSoon();
  }
  function tapLever() { setFoot(!M.foot); ghost.learned("lever"); }
  function setSpeed(i, tag) {
    i = clamp(i, 0, 2);
    if (i !== S.speed) snd.click();
    S.speed = i; saveSoon();
    if (tag) { const p = vp(SLIDER.l + (SLIDER.r - SLIDER.l) * i / 2, SLIDER.y - 3); Toybox.nametag(SPEED_NAME[i], p.x, p.y, 1800); }
  }
  function pickStitch(id, from) {
    if (!ST[id]) return;
    if (S.stitch !== id) { S.stitch = id; M.pi = -1; saveSoon(); }
    if (from !== "tile") tiles.set(id);
    snd.click();
  }
  function stepStitch(d) {
    const i = STITCHES.findIndex((s) => s.id === S.stitch);
    pickStitch(STITCHES[(i + d + STITCHES.length) % STITCHES.length].id);
    flashPart(d < 0 ? "left" : "right");
  }
  function snip() {
    snd.snip();
    flashPart("cutter");
    if (!attached()) { tagPart("cutter"); return; }
    const done = !under() && cur.p.length >= 12;
    cur = null; M.pi = -1;
    puff(CUTTER.x - 1, CUTTER.y, "#FFFFFF", 6);
    save();
    if (done) {
      S.pieces++; save(); setCount(true);
      const r = fabricRect();
      for (let i = 0; i < 16; i++) sparkle(r.x + Math.random() * r.w, r.y + Math.random() * r.h);
      snd.chime();
      if (window.Toybox) Toybox.kind();
    }
    ghost.learned("cutter");
  }
  function pickThread(i) {
    if (i === S.thread) { tagPart("spool"); return; }
    const from = L.spools[i], old = S.thread;
    flights.push({ c: i, x0: from.x, y0: from.y - 5, x1: SPOOL.x, y1: SPOOL.y, t0: now(), dur: 0.7, toPin: true });
    flights.push({ c: old, x0: SPOOL.x, y0: SPOOL.y, x1: L.spools[old].x, y1: L.spools[old].y - 5, t0: now(), dur: 0.7, toPin: false });
    S.thread = i;
    // a new spool means threading again: the old thread is cut at the needle
    if (cur) { cur = null; M.pi = -1; }
    snd.pop();
    const p = vp(from.x, from.y - 12);
    Toybox.nametag(THREADS[i].name + " thread", p.x, p.y, 2000);
    save();
  }
  function pickFabric(i) {
    if (F.swap) return;
    if (M.run) stopRun();
    const r = L.fabs[i], p = vp(r.x + r.w / 2, r.y - 1);
    Toybox.nametag(FABRICS[i].name, p.x, p.y, 2000);
    snd.pop();
    F.swap = { i, t0: now(), from: { x: F.x, top: F.top }, fab: { x: r.x, y: r.y, w: r.w, h: r.h }, done: false };
    M.foot = false;
  }
  function newPiece(fab) {
    S.fabric = fab;
    runs = []; cur = null; M.pi = -1;
    F.x = -FW / 2; F.top = START_TOP; F.slide = null;
    repaint();
    save();
  }
  function startOver() {
    if (M.run) stopRun();
    M.rev = 0;
    F.swap = { i: S.fabric, t0: now(), from: { x: F.x, top: F.top }, fab: null, done: false };
    M.foot = false;
    snd.pop();
  }
  function tapFabric() {
    if (!M.foot) {
      if (atEnd() || (under() && needleW() > FH * 0.6)) { slideTo(F.x, 4); return; }      // pull it out for him
      if (!under()) { slideTo(-FW / 2, START_TOP); return; }                                // back under the foot
      tagPart("fabric");
      return;
    }
    if (M.run) { coach.say("Drag the fabric to steer it.", 3); return; }
    tagPart("fabric");
  }
  function slideTo(x, top) { F.slide = { x0: F.x, t0: F.top, x1: x, t1: top, at: now(), dur: 0.9 }; if (M.T % 1) M.goal = Math.ceil(M.T); }
  function fabricRect() { return { x: F.x, y: F.top, w: FW, h: FH }; }

  // =====================================================================================================
  // Coach, counter, ghost, tiles, bottom bar
  // =====================================================================================================
  const coach = Toybox.coach($("coach"));
  function setCount(pop) {
    const el = $("pieces"); el.textContent = "Pieces: " + S.pieces;
    if (pop) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  }
  setCount(false);
  // What to do next, from what is on the machine: one line and the part it names (the ring on the scene).
  function want() {
    if (F.swap) return null;
    if (attached() && !under()) return { say: "Tap the thread cutter to snip the threads.", part: "cutter" };
    if (atEnd()) return M.foot ? { say: "Lift the presser foot lever.", part: "lever" } : { say: "Drag the fabric toward you to pull it out.", part: "fabric" };
    if (!under()) return { say: "Tap a fabric in the pile to sew a new piece.", part: "fab" + ((S.fabric + 1) % FABRICS.length) };
    if (!M.foot) return { say: "Lower the presser foot lever.", part: "lever" };
    // while it sews, no new line pops up over the needle: the ghost hand shows the steering instead
    if (M.run) return M.steered ? null : { say: "", part: "fabric", soft: true };
    if (busy()) return null;
    return { say: "Tap the green Start button to sew.", part: "start" };
  }
  let lastWant = "", glowPart = null, glowT = 0;
  function updCoach() {
    const w = want(), k = w ? w.say : "";
    if (k !== lastWant) { lastWant = k; if (k) coach.step(k); else coach.clear(); }
  }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked()) return null;
      const w = want();
      if (!w || w.soft && !M.run) return null;
      if (w.part === "fabric") {
        const r = fabricRect(), a = vp(r.x + r.w * 0.5, Math.max(r.y + 4, 8));
        if (atEnd()) return { pts: [[a.x, a.y], [a.x, a.y + 40 * sc / 2.2]], key: "pull" };
        return { pts: [[a.x, a.y], [a.x + 30, a.y], [a.x - 20, a.y]], key: "steer" };
      }
      const p = partPt(w.part);
      return p ? { pts: [[p.x, p.y]], tap: true, key: w.part.replace(/\d+$/, "") } : null;
    }
  });
  const tiles = Toybox.tiles($("tiles"), {
    items: STITCHES.map((s) => ({ id: s.id, name: s.name, pic: stitchPic(s) })),
    value: S.stitch, rows: 2,
    onPick: (id) => pickStitch(id, "tile")
  });
  Toybox.bar($("bottom"), { onNew: startOver, onSurprise: surprise });
  function stitchPic(s) {
    const pts = [];
    const n = s.seq.length;
    for (let k = 0, i = 0; k < 400; k++, i++) {
      const a = s.seq[i % n], t = a[1] + Math.floor(i / n) * s.R;
      if (t > 23) break;
      pts.push([20 + a[0] * 2.3, 6 + t * 1.25]);
    }
    let d = "";
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L2 = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, g = Math.min(0.6, L2 * 0.18);
      const ux = (b[0] - a[0]) / L2, uy = (b[1] - a[1]) / L2;
      d += "M" + (a[0] + ux * g).toFixed(1) + " " + (a[1] + uy * g).toFixed(1) + "L" + (b[0] - ux * g).toFixed(1) + " " + (b[1] - uy * g).toFixed(1);
    }
    return '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="5" y="2.5" width="30" height="35" rx="5" fill="#FFF3E0" stroke="#1D2340" stroke-width="2"/>' +
      '<path d="' + d + '" fill="none" stroke="#E23B4E" stroke-width="2.4" stroke-linecap="round"/></svg>';
  }
  function tagPart(id) {
    const N = { start: "Start/Stop", rev: "Reverse", ndl: "Needle up/down", slider: "Speed", wheel: "Handwheel", lever: "Presser foot lever",
      cutter: "Thread cutter", spool: "Thread spool", lcd: "Screen", takeup: "Take-up lever", pedal: "Foot pedal", jar: "Button jar",
      left: "Stitch", right: "Stitch", fabric: FABRICS[S.fabric].name, needle: "Needle", foot: "Presser foot", plate: "Needle plate", bobbin: "Bobbin" };
    const p = partPt(id);
    if (p && N[id]) Toybox.nametag(N[id], p.x, p.y - 14, 2000);
    flashPart(id);
  }
  function flashPart(id) { M.flash[id] = now(); }

  // =====================================================================================================
  // Surprise
  // =====================================================================================================
  // A fun moment on the table, then play goes on: the button jar tips over, a ball of yarn rolls across, a
  // butterfly lands on the fabric. They take turns.
  let fx = null, surpriseN = 0;
  const flights = [], bits = [];
  function surprise() {
    if (fx) return;
    const kinds = ["buttons", "yarn", "butterfly"], k = kinds[surpriseN++ % kinds.length];
    fx = { k, t0: now(), items: [] };
    if (k === "buttons") {
      const cols = ["#E23B4E", "#FFD21F", "#2F6FE0", "#2FAE57", "#FF8A1F", "#8A4FD8", "#FF6FB1", "#FFFFFF", "#43C6D9"];
      fx.items = cols.map((c, i) => ({ c, x1: L.jar.x + (tall ? 8 + (i % 5) * 2.6 : 8 + i * 6.5), y1: tall ? L.jar.y - 1.8 - Math.floor(i / 5) * 2.8 : L.jar.y + 22 + (i % 3) * 3, r: 1.8 + (i % 3) * 0.4, spin: Math.random() * TAU }));
      snd.rattle();
    } else if (k === "yarn") snd.pop();
    else snd.chime();
  }
  function fxDone(t) { return (fx.k === "buttons" && t > 6) || (fx.k === "yarn" && t > 7) || (fx.k === "butterfly" && t > 8); }

  // =====================================================================================================
  // Sound (Web Audio, soft; only through Toybox.sound.ready(), so nothing plays with sound off)
  // =====================================================================================================
  const snd = (() => {
    let hum = null;
    const ac = () => (window.Toybox ? Toybox.sound.ready() : null);
    function tone(f, d, type, g, f2) {
      const a = ac(); if (!a) return;
      const o = a.createOscillator(), v = a.createGain(), t = a.currentTime;
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g || 0.05, t + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
    }
    function noise(d, f, g) {
      const a = ac(); if (!a) return;
      const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = a.createBufferSource(), fl = a.createBiquadFilter(), v = a.createGain();
      s.buffer = b; fl.type = "bandpass"; fl.frequency.value = f; fl.Q.value = 1.2; v.gain.value = g;
      s.connect(fl).connect(v).connect(a.destination); s.start();
    }
    return {
      tick() { noise(0.03, 2600, 0.12); },
      click() { tone(880, 0.05, "sine", 0.04); },
      clunk() { tone(220, 0.09, "triangle", 0.06, 140); },
      snip() { noise(0.04, 4200, 0.2); setTimeout(() => noise(0.04, 3600, 0.16), 90); },
      pop() { tone(420, 0.14, "sine", 0.05, 820); },
      rattle() { for (let i = 0; i < 8; i++) setTimeout(() => tone(1200 + Math.random() * 900, 0.04, "sine", 0.03), i * 70); },
      chime() { tone(784, 0.25, "sine", 0.05); setTimeout(() => tone(1175, 0.35, "sine", 0.05), 140); },
      motor(on) {
        const a = ac();
        if (!a) { hum = null; return; }
        if (!hum) {
          const o = a.createOscillator(), fl = a.createBiquadFilter(), v = a.createGain();
          o.type = "sawtooth"; o.frequency.value = 70; fl.type = "lowpass"; fl.frequency.value = 380; v.gain.value = 0.0001;
          o.connect(fl).connect(v).connect(a.destination); o.start();
          hum = { o, v, a };
        }
        if (!on) hum.v.gain.setTargetAtTime(0.0001, a.currentTime, 0.08);
      },
      update(v) {
        if (!hum) { if (v > 0.1) this.motor(true); return; }
        const a = ac();
        if (!a || a !== hum.a) { try { hum.o.stop(); } catch (e) { /* ignore */ } hum = null; return; }
        hum.v.gain.setTargetAtTime(v > 0.05 ? 0.035 + v * 0.004 : 0.0001, a.currentTime, 0.08);
        hum.o.frequency.setTargetAtTime(60 + v * 14, a.currentTime, 0.1);
      }
    };
  })();

  // =====================================================================================================
  // Input
  // =====================================================================================================
  // Parts in world units: circles (x, y, r) and boxes. Small buttons sit close together, so a press takes the
  // nearest part within its reach (at least 22 px), then the fabric, then nothing.
  function leverEnd() { const a = M.footA; return { x: LEVER.x + 8, y: LEVER.y + 2 - a * 8 }; }
  function takeupY() { return -74 + 22 * depth(M.T + 0.06); }
  function partList() {
    const l = [
      { id: "start", x: BTN.start.x, y: BTN.start.y, r: BTN.start.r + 1 },
      { id: "rev", x: BTN.rev.x, y: BTN.rev.y, r: BTN.rev.r + 0.6 },
      { id: "ndl", x: BTN.ndl.x, y: BTN.ndl.y, r: BTN.ndl.r + 0.6 },
      { id: "left", x: BTN.left.x, y: BTN.left.y, r: BTN.left.r + 0.6 },
      { id: "right", x: BTN.right.x, y: BTN.right.y, r: BTN.right.r + 0.6 },
      { id: "slider", x: (SLIDER.l + SLIDER.r) / 2, y: SLIDER.y, r: 3, box: [SLIDER.l - 2, SLIDER.y - 3.5, SLIDER.r - SLIDER.l + 4, 7] },
      { id: "wheel", x: WHEEL.x, y: WHEEL.y, r: 5, box: [WHEEL.x - 5, WHEEL.y - WHEEL.ry - 1, 10, WHEEL.ry * 2 + 2] },
      { id: "lever", x: leverEnd().x, y: leverEnd().y, r: 4 },
      { id: "cutter", x: CUTTER.x, y: CUTTER.y, r: 3.5 },
      { id: "spool", x: SPOOL.x, y: SPOOL.y, r: 6 },
      { id: "lcd", x: LCD.x + LCD.w / 2, y: LCD.y + LCD.h / 2, r: 6, box: [LCD.x, LCD.y, LCD.w, LCD.h] },
      { id: "takeup", x: -9, y: takeupY(), r: 3 },
      { id: "pedal", x: L.pedal.x, y: L.pedal.y, r: 8, box: [L.pedal.x - 14, L.pedal.y - 7, 28, 13] },
      { id: "jar", x: L.jar.x, y: L.jar.y - 7, r: 7 }
    ];
    L.spools.forEach((s, i) => { if (i !== S.thread) l.push({ id: "spool" + i, x: s.x, y: s.y - 5.5, r: 4.2, box: [s.x - 3.6, s.y - 11.5, 7.2, 12] }); });
    L.fabs.forEach((f, i) => l.push({ id: "fab" + i, x: f.x + f.w / 2, y: f.y + f.h / 2, r: 5, box: [f.x, f.y, f.w, f.h] }));
    return l;
  }
  function partPt(id) {
    if (id === "fabric") { const r = fabricRect(); return vp(r.x + r.w / 2, Math.max(r.y + 6, 6)); }
    const p = partList().find((q) => q.id === id);
    if (!p) return null;
    const v = vp(p.x, p.y); v.r = p.r * sc; return v;
  }
  function hit(cx, cy) {
    const w = world(cx, cy), reach = 22 / sc;
    let best = null, bd = Infinity;
    partList().forEach((p) => {
      let d;
      if (p.box) {
        const b = p.box, dx = Math.max(b[0] - w.x, 0, w.x - (b[0] + b[2])), dy = Math.max(b[1] - w.y, 0, w.y - (b[1] + b[3]));
        d = Math.hypot(dx, dy) - 0.01;
      } else d = Math.hypot(w.x - p.x, w.y - p.y) - p.r;
      if (d <= reach && d < bd) { bd = d; best = p.id; }
    });
    if (best && bd <= 0) return best;
    const r = fabricRect();
    if (w.x > r.x && w.x < r.x + r.w && w.y > r.y && w.y < r.y + r.h && !inMachine(w.x, w.y)) return "fabric";
    return best;
  }
  function inMachine(x, y) {
    return (x > HEAD.l && x < HEAD.r && y > HEAD.t && y < HEAD.b) || (x > ARM.l && x < ARM.r && y > ARM.t && y < ARM.b) ||
      (x > PIL.l && x < PIL.r && y > PIL.t && y < PIL.b) || (x > PIL.r && x < WHEEL.x + 4 && y > WHEEL.y - WHEEL.ry && y < WHEEL.y + WHEEL.ry);
  }
  let drag = null;
  function sliderAt(cx) { const w = world(cx, 0); return Math.round(clamp((w.x - SLIDER.l) / (SLIDER.r - SLIDER.l), 0, 1) * 2); }
  Toybox.press(cv, {
    any: true,
    hit: (x, y) => hit(x, y) || "",
    down: (part, e, s) => {
      drag = null;
      if (locked()) return;
      if (part === "pedal") { M.pedal = true; M.pedalT = now(); flashPart("pedal"); snd.click(); ghost.learned("start"); }
    },
    dragStart: (part, e, s) => {
      if (locked()) return;
      if (part === "slider") drag = { k: "slider" };
      else if (part === "wheel") drag = { k: "wheel", y: s.y0 };
      else if (part === "fabric") {
        if (F.swap) return;
        if (M.foot && !M.run) { coach.say("Lift the presser foot lever to move the fabric.", 3); glowPart = "lever"; glowT = now() + 3; return; }
        if (!M.foot && M.T % 1) M.goal = Math.ceil(M.T);
        F.slide = null;
        drag = { k: "fabric", x0: F.x, t0: F.top, steer: M.foot };
      }
    },
    move: (part, e, s) => {
      if (!drag || locked()) return;
      if (drag.k === "slider") setSpeed(sliderAt(s.x), false);
      else if (drag.k === "wheel") {
        // turning the top of the handwheel toward him (down on the screen) sews by hand
        const d = (s.y - drag.y) / (sc * WHEEL.ry * 1.6);
        drag.y = s.y;
        if (d > 0 && !M.run && M.goal == null) { advance(Math.min(0.25, d)); M.everSewn = true; }
      } else if (drag.k === "fabric") {
        const dx = s.dx / sc, dy = s.dy / sc;
        if (drag.steer) {
          if (!M.foot) { drag.steer = false; return; }
          F.x = clamp(drag.x0 + dx, -FW + 5, -5);
          if (Math.abs(dx) > 3) { M.steered = true; ghost.learned("steer"); }
        } else if (!M.foot) {
          F.x = clamp(drag.x0 + dx, -70, 10);
          F.top = clamp(drag.t0 + dy, -(FH - 1), 8);
          if (dy > 4) ghost.learned("pull");
        }
      }
    },
    up: (part, e, s) => {
      if (part === "pedal" && M.pedal) {
        M.pedal = false;
        if (M.run && M.src === "pedal") stopRun();
        if (s.tap || (!M.run && M.goal == null && now() - (M.pedalT || 0) < 0.6)) sewSome(2, "pedal");
      }
      const d = drag; drag = null;
      if (!d || locked()) return;
      if (d.k === "slider") setSpeed(S.speed, true);
      if (d.k === "fabric") {
        if (!M.foot && s.dy / sc > 6 && needleW() < FH * 0.9 && needleW() > -2 && attached()) slideTo(F.x, 4);
        saveSoon();
      }
    },
    tap: (part) => {
      if (locked()) return;
      if (part === "start") tapStart();
      else if (part === "rev") tapReverse();
      else if (part === "ndl") tapNeedle();
      else if (part === "left") stepStitch(-1);
      else if (part === "right") stepStitch(1);
      else if (part === "slider") setSpeed((S.speed + 1) % 3, true);
      else if (part === "wheel") { flashPart("wheel"); sewSome(1, "wheel"); }
      else if (part === "lever") tapLever();
      else if (part === "cutter") snip();
      else if (part === "pedal") { /* handled on up */ }
      else if (/^spool\d$/.test(part)) pickThread(+part.slice(5));
      else if (/^fab\d$/.test(part)) pickFabric(+part.slice(3));
      else if (part === "fabric") tapFabric();
      else if (part === "jar") { tagPart("jar"); snd.rattle(); }
      else if (part) tagPart(part);
      else {
        const w = want();
        if (w && w.say) { coach.say(w.say, 3); glowPart = w.part; glowT = now() + 3; ghost.poke(); }
      }
    }
  });

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  let LWv = 1;
  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fs(fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.lineWidth = (lw || 1) * LWv; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(); }
  }
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); }
  function line(x1, y1, x2, y2, col, w) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.stroke();
  }
  function poly(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
  function pressK(id) { const t = M.flash[id]; return t ? Math.max(0, 1 - (now() - t) / 0.25) : 0; }

  // a spool standing up (the rack) or lying down (on the machine's spool pin)
  function spoolUp(x, y, col, k) {
    k = k || 1;
    const w = 3.2 * k, h = 10 * k;
    rr(x - w - 0.6 * k, y - 1.4 * k, (w + 0.6 * k) * 2, 1.4 * k, 0.6 * k); fs("#F1D9AE", 0.8);
    rr(x - w, y - h + 1.2 * k, w * 2, h - 2.6 * k, 0.6 * k); fs(col, 0.8);
    ctx.strokeStyle = "rgba(0,0,0,0.13)"; ctx.lineWidth = 0.35 * k;
    for (let yy = y - h + 2.4 * k; yy < y - 1.6 * k; yy += 1.1 * k) { ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy + 0.4 * k); ctx.stroke(); }
    line(x - w * 0.55, y - h + 2 * k, x - w * 0.55, y - 2 * k, "rgba(255,255,255,0.35)", 0.7 * k);
    rr(x - w - 0.6 * k, y - h, (w + 0.6 * k) * 2, 1.4 * k, 0.6 * k); fs("#F1D9AE", 0.8);
  }
  function spoolSide(x, y, col, rot) {
    const w = 6, r = 3;
    rr(x - w, y - r, w * 2, r * 2, 0.6); fs(col, 0.9);
    ctx.save(); rr(x - w, y - r, w * 2, r * 2, 0.6); ctx.clip();
    ctx.strokeStyle = "rgba(0,0,0,0.14)"; ctx.lineWidth = 0.35;
    for (let i = 0; i < 9; i++) { const yy = y - r + ((i * 0.75 + rot * 3) % 6); ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x + w, yy + 0.2); ctx.stroke(); }
    line(x - w, y - r * 0.4, x + w, y - r * 0.4, "rgba(255,255,255,0.3)", 0.7);
    ctx.restore();
    ell(x - w, y, 1.1, r + 0.9); fs("#F1D9AE", 0.8);
    ell(x + w, y, 1.1, r + 0.9); fs("#F1D9AE", 0.8);
    ell(x + w + 1.4, y, 0.9, 2.1); fs("#C9CED6", 0.8);           // the spool cap
  }
  function folded(f, i, x, y, w, h) {
    // a folded piece of fabric: the pattern on top, a fold line, a darker front edge
    ctx.save(); rr(x, y, w, h, 1.2); ctx.clip();
    ctx.translate(x, y);
    paintFabric(i, ctx, w, h, 0.7);
    ctx.restore();
    rr(x, y, w, h, 1.2); fs(null, 0.9);
    line(x + 0.8, y + h * 0.62, x + w - 0.8, y + h * 0.62, "rgba(29,35,64,0.25)", 0.5);
  }
  function stitchGlyph(s, x, y, len, wd, col, lw) {
    // a stitch drawn along x (the screen), for the machine's screen and its stitch chart
    const n = s.seq.length, k = len / 23;
    ctx.beginPath();
    for (let i = 0; i < 300; i++) {
      const a = s.seq[i % n], t = a[1] + Math.floor(i / n) * s.R;
      if (t > 23) break;
      const px = x + t * k, py = y + a[0] * wd / 7;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  }

  // =====================================================================================================
  // Drawing the scene
  // =====================================================================================================
  function drawRoom() {
    
    if (L.shelf) {
      const s = L.shelf;
      rr(s.l, s.y, s.r - s.l, 3.2, 0.8); fs("#C88F55", 1);
      line(s.l + 6, s.y + 3.2, s.l + 6, s.y + 8, INK, 1.2 * LWv); line(s.r - 6, s.y + 3.2, s.r - 6, s.y + 8, INK, 1.2 * LWv);
    }
    // table top, front edge, floor
    rr(L.tl, TABLE.t, L.tr - L.tl, TABLE.b - TABLE.t, 2); fs("#E2B47C", 1.2);
    ctx.strokeStyle = "rgba(150,95,40,0.18)"; ctx.lineWidth = 0.6;
    for (let y = TABLE.t + 6; y < TABLE.b - 2; y += 7) { ctx.beginPath(); ctx.moveTo(L.tl + 3, y); ctx.bezierCurveTo(L.tl + 60, y + 1.5, L.tr - 60, y - 1.5, L.tr - 3, y + 0.5); ctx.stroke(); }
    ctx.fillStyle = "#C9D4E2"; ctx.fillRect(-2000, TABLE.face, 4000, 2000);
    rr(L.tl, TABLE.b, L.tr - L.tl, TABLE.face - TABLE.b, 1); fs("#BF8A50", 1.2);
    rr(L.tl + 4, TABLE.face, 5, 40, 0); fs("#BF8A50", 1.2);
    rr(L.tr - 9, TABLE.face, 5, 40, 0); fs("#BF8A50", 1.2);
  }
  function drawPedal() {
    const p = L.pedal, a = M.pedalA;
    // the cord to the machine
    ctx.beginPath(); ctx.moveTo(p.x + 12, p.y - 2); ctx.bezierCurveTo(p.x + 30, p.y - 2, p.x + 34, TABLE.face + 2, p.x + 46, TABLE.face);
    ctx.strokeStyle = "#5A6170"; ctx.lineWidth = 1.1; ctx.stroke();
    rr(p.x - 14, p.y - 3, 28, 9, 3); fs("#5A6170", 1.1);
    const lift = (1 - a) * 2.2;
    poly([[p.x - 11, p.y - 2 - lift * 0.4], [p.x + 11, p.y - 2 - lift * 0.4], [p.x + 9.5, p.y - 6 - lift], [p.x - 9.5, p.y - 6 - lift]]);
    fs(a > 0.5 ? "#9AA3B2" : "#B9C1CD", 1);
    for (let i = -6; i <= 6; i += 3) line(p.x + i, p.y - 3 - lift * 0.5, p.x + i * 0.9, p.y - 5.4 - lift * 0.9, "rgba(29,35,64,0.3)", 0.6);
  }
  function drawRack() {
    if (L.rack) { const r = L.rack; rr(r.l, -24, r.r - r.l, 27, 2); fs("#C88F55", 1); }
    L.spools.forEach((s, i) => {
      line(s.x, s.y - 1, s.x, s.y - 11.5, "#8B5A2B", 0.9);            // the peg
      if (i === S.thread || flights.some((f) => f.c === i)) return;
      const k = pressK("spool" + i);
      spoolUp(s.x, s.y - k * 1.5, THREADS[i].c, 0.9);
    });
  }
  function drawPile() {
    L.fabs.forEach((f, i) => {
      const k = pressK("fab" + i), sel = i === S.fabric;
      folded(FABRICS[i], i, f.x, f.y - k * 1.5, f.w, f.h);
      if (sel) { rr(f.x - 1, f.y - 1, f.w + 2, f.h + 2, 2); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 2.2 * LWv; ctx.stroke(); }
    });
  }
  function drawJar(t) {
    const j = L.jar;
    let tilt = 0;
    if (fx && fx.k === "buttons") { const u = now() - fx.t0; tilt = u < 0.6 ? ease(u / 0.6) : u < 4.6 ? 1 : 1 - ease((u - 4.6) / 0.8); }
    tilt += pressK("jar") * 0.4 * Math.sin(now() * 40);
    ctx.save(); ctx.translate(j.x + 6, j.y); ctx.rotate(tilt * (tall ? -1.1 : 1.1) * 0.9); ctx.translate(-j.x - 6, -j.y);
    rr(j.x - 6, j.y - 13, 12, 13, 2.4); fs("rgba(205,233,255,0.75)", 1);
    const cols = ["#E23B4E", "#FFD21F", "#2F6FE0", "#2FAE57", "#FF8A1F", "#8A4FD8"];
    if (!(fx && fx.k === "buttons")) cols.forEach((c, i) => { circ(j.x - 3.5 + (i % 3) * 3.5, j.y - 2.2 - Math.floor(i / 3) * 2.6, 1.4); fs(c, 0.5); });
    rr(j.x - 6.6, j.y - 15, 13.2, 3, 1); fs("#E23B4E", 1);
    ctx.restore();
  }
  function drawBed() {
    rr(BED.l, BED.t, BED.r - BED.l, BED.b - BED.t + 2, 3); fs("#F6F7F4", 1.2);
    line(BED.l + 2, BED.b, BED.r - 2, BED.b, "rgba(29,35,64,0.18)", 0.8);
    // the needle plate with its guide lines, the feed dogs and the clear bobbin cover in front
    rr(-9, -4.5, 20, 8, 1); fs("#CDD3DC", 0.9);
    for (let i = 0; i < 4; i++) line(13 + i * 2.6, -4.2, 13 + i * 2.6, 3.4, "rgba(29,35,64,0.35)", 0.4);
    const fdog = M.mv && M.foot ? Math.sin(M.mv.done * Math.PI) * 0.8 : 0;
    [-4.5, 4.5].forEach((xx) => { rr(xx - 1, -3 - fdog, 2, 5, 0.4); fs("#5A6170", 0.5); });
    rr(-6.5, 4.2, 15, 5.6, 1.5); fs("rgba(190,225,255,0.65)", 0.8);
    circ(1, 7, 2); fs("#FFFFFF", 0.6); circ(1, 7, 0.7); fs("#C9CED6", 0.4);
  }
  function drawFabric() {
    const r = fabricRect();
    ctx.save();
    ctx.shadowColor = "rgba(29,35,64,0.18)"; ctx.shadowBlur = 6 * sc * DPR / 2; ctx.shadowOffsetY = 1;
    ctx.fillStyle = FABRICS[S.fabric].base; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
    ctx.drawImage(tex, r.x, r.y, r.w, r.h);
    ctx.strokeStyle = "rgba(29,35,64,0.45)"; ctx.lineWidth = 0.7 * LWv; ctx.strokeRect(r.x, r.y, r.w, r.h);
  }
  function drawSwapFabric() {
    // the old piece slides off the table to the front, the new one comes from the pile and settles under the foot
    const s = F.swap, u = (now() - s.t0) / (reduce ? 0.5 : 1.4);
    if (u < 0.45) {
      const k = ease(u / 0.45);
      F.x = lerp(s.from.x, s.from.x, k); F.top = lerp(s.from.top, 70, k);
    } else {
      if (!s.done) { s.done = true; newPiece(s.i); }
      const k = ease((u - 0.45) / 0.55), from = s.fab ? { x: s.fab.x, top: s.fab.y } : { x: -FW / 2, top: 70 };
      F.x = lerp(from.x, -FW / 2, k); F.top = lerp(from.top, START_TOP, k);
      if (u >= 1) { F.swap = null; M.foot = true; snd.clunk(); save(); }
    }
  }
  function drawMachineBack() {
    // top of the machine (seen from a little above), then the arm and the pillar
    rr(TOPB.l + 1, TOPB.t, TOPB.r - TOPB.l - 1, TOPB.b - TOPB.t + 4, 4); fs("#FFFFFF", 1.2);
    // bobbin winder and the thread guide on top
    rr(44, -90.5, 4.4, 3, 1); fs("#C9CED6", 0.8); circ(46.2, -89, 1.2); fs("#FFFFFF", 0.6);
    rr(-8, -88.5, 4, 2.2, 0.8); fs("#C9CED6", 0.8);
    // arm + pillar
    ctx.beginPath();
    ctx.moveTo(ARM.l + 3, ARM.t); ctx.lineTo(PIL.r - 3, PIL.t); ctx.quadraticCurveTo(PIL.r, PIL.t, PIL.r, PIL.t + 3);
    ctx.lineTo(PIL.r, PIL.b); ctx.lineTo(PIL.l - 2, PIL.b);
    ctx.quadraticCurveTo(PIL.l, PIL.b, PIL.l, PIL.b - 3);
    ctx.lineTo(PIL.l, ARM.b + 4); ctx.quadraticCurveTo(PIL.l, ARM.b, PIL.l - 4, ARM.b);
    ctx.lineTo(ARM.l + 3, ARM.b); ctx.closePath();
    fs("#F7F7F3", 1.2);
    // a soft shade along the underside of the arm and the pillar's base
    line(HEAD.r + 2, ARM.b - 1, PIL.l - 3, ARM.b - 1, "rgba(29,35,64,0.08)", 2);
    rr(PIL.l + 1, PIL.b - 5, PIL.r - PIL.l - 2, 4, 1); fs("#E4E6EA", 0);
  }
  function drawWheel() {
    const w = WHEEL;
    ell(w.x + 0.6, w.y, w.rx, w.ry); fs("#E1E4E9", 1.1);
    ctx.save(); ell(w.x + 0.6, w.y, w.rx, w.ry); ctx.clip();
    // grip ribs turning toward him: one turn per stitch
    for (let i = 0; i < 10; i++) {
      const a = (i / 10 + M.T) * TAU, yy = w.y - Math.cos(a) * w.ry;
      if (Math.sin(a) < 0) continue;
      line(w.x - w.rx, yy, w.x + w.rx + 1, yy, "rgba(29,35,64,0.28)", 0.6);
    }
    ctx.restore();
    // the turning arrow sticker
    const ar = M.flash.wheel && now() - M.flash.wheel < 0.6 ? "#FFC93C" : "#9AA3B2";
    ctx.beginPath(); ctx.moveTo(w.x - 2, w.y - 6); ctx.lineTo(w.x - 2, w.y + 3); ctx.strokeStyle = ar; ctx.lineWidth = 0.9; ctx.stroke();
    poly([[w.x - 3.4, w.y + 2.5], [w.x - 0.6, w.y + 2.5], [w.x - 2, w.y + 5]]); fs(ar, 0);
  }
  function drawPanel() {
    // the screen: the stitch he picked, or the presser foot picture when the foot is up and he tried to sew
    rr(LCD.x - 1.2, LCD.y - 1.2, LCD.w + 2.4, LCD.h + 2.4, 2); fs("#C9CED6", 1);
    rr(LCD.x, LCD.y, LCD.w, LCD.h, 1); fs("#CFE6D6", 0.8);
    if (M.warn > now() && Math.floor(now() * 3) % 2 === 0) {
      const x = LCD.x + LCD.w / 2, y = LCD.y + LCD.h / 2;
      rr(x - 3, y - 1, 6, 3, 0.8); fs("#2C3A33", 0);
      line(x, y - 1, x, y - 5, "#2C3A33", 1);
      poly([[x - 2.2, y - 4], [x + 2.2, y - 4], [x, y - 6.2]]); fs("#2C3A33", 0);
    } else stitchGlyph(ST[S.stitch], LCD.x + 2.5, LCD.y + LCD.h / 2, LCD.w - 5, 7.5, "#2C3A33", 0.8);
    // the stitch arrow keys
    ["left", "right"].forEach((id) => {
      const b = BTN[id], k = pressK(id);
      circ(b.x, b.y + k * 0.5, b.r); fs("#FFFFFF", 0.9);
      const d = id === "left" ? -1 : 1;
      poly([[b.x + d * 1.3, b.y + k * 0.5], [b.x - d * 0.9, b.y - 1.3 + k * 0.5], [b.x - d * 0.9, b.y + 1.3 + k * 0.5]]); fs(INK, 0);
    });
    // the stitch chart printed on the front
    rr(PIL.l + 2, -54.5, PIL.r - PIL.l - 4, 14, 1.5); fs("#EEF1F5", 0.6);
    STITCHES.forEach((s, i) => {
      const cx = PIL.l + 4 + (i % 3) * 6.8, cy = -50.5 + Math.floor(i / 3) * 6;
      stitchGlyph(s, cx, cy, 5, 2.6, s.id === S.stitch ? "#2F6FE0" : "#7C8596", 0.5);
    });
  }
  function drawHead() {
    rr(HEAD.l, HEAD.t, HEAD.r - HEAD.l, HEAD.b - HEAD.t, 4); fs("#F7F7F3", 1.2);
    // the threading slot and the take-up lever bobbing in it
    const th = THREADS[S.thread].c, ly = takeupY();
    rr(-12, -78, 6, 32, 2); fs("#E2E5EA", 0.8);
    line(-9, -77, -9, -47, "rgba(29,35,64,0.25)", 0.5);
    rr(-13.6, ly - 1.4, 9.2, 2.8, 1.2); fs("#9AA3B2", 0.9);
    // the thread: spool -> guide -> down the slot -> up to the take-up lever -> down to the needle
    const tip = needleTip();
    ctx.beginPath();
    ctx.moveTo(SPOOL.x - 6, SPOOL.y); ctx.lineTo(-6, -87.4); ctx.lineTo(-7.4, -78); ctx.lineTo(-7.4, -47.5);
    ctx.quadraticCurveTo(-9, -45.5, -10.6, -47.5); ctx.lineTo(-10.6, ly); ctx.lineTo(-3.2, -24); ctx.lineTo(M.lat - 0.3, -20.5);
    ctx.lineTo(M.lat, tip - 1.6);
    ctx.strokeStyle = th; ctx.lineWidth = 0.55; ctx.lineJoin = "round"; ctx.stroke();
    // buttons on the front of the head: Start/Stop, Reverse, Needle up/down, the speed slider
    const st = BTN.start, k = pressK("start");
    circ(st.x, st.y + 0.6, st.r + 0.4); fs("#C9CED6", 0);
    circ(st.x, st.y + k * 0.6, st.r); fs(M.run ? "#E5484D" : "#35C26B", 1);
    if (M.run) { rr(st.x - 1.5, st.y - 1.5 + k * 0.6, 3, 3, 0.4); fs("#FFFFFF", 0); }
    else { poly([[st.x - 1.2, st.y - 2 + k * 0.6], [st.x - 1.2, st.y + 2 + k * 0.6], [st.x + 2.1, st.y + k * 0.6]]); fs("#FFFFFF", 0); }
    const rv = BTN.rev, kr = pressK("rev");
    circ(rv.x, rv.y + kr * 0.5, rv.r); fs(M.rev > 0 ? "#FFC93C" : "#FFFFFF", 0.9);
    ctx.beginPath(); ctx.arc(rv.x, rv.y + kr * 0.5, 1.4, -Math.PI * 0.9, Math.PI * 0.5); ctx.strokeStyle = INK; ctx.lineWidth = 0.6; ctx.stroke();
    poly([[rv.x - 2.2, rv.y - 0.7 + kr * 0.5], [rv.x - 0.6, rv.y - 0.7 + kr * 0.5], [rv.x - 1.4, rv.y + 0.8 + kr * 0.5]]); fs(INK, 0);
    const nd = BTN.ndl, kn = pressK("ndl");
    circ(nd.x, nd.y + kn * 0.5, nd.r); fs("#FFFFFF", 0.9);
    line(nd.x, nd.y - 1.8 + kn * 0.5, nd.x, nd.y + 1.8 + kn * 0.5, INK, 0.5);
    poly([[nd.x - 1.1, nd.y - 1 + kn * 0.5], [nd.x + 1.1, nd.y - 1 + kn * 0.5], [nd.x, nd.y - 2.3 + kn * 0.5]]); fs(INK, 0);
    poly([[nd.x - 1.1, nd.y + 1 + kn * 0.5], [nd.x + 1.1, nd.y + 1 + kn * 0.5], [nd.x, nd.y + 2.3 + kn * 0.5]]); fs(INK, 0);
    rr(SLIDER.l, SLIDER.y - 0.7, SLIDER.r - SLIDER.l, 1.4, 0.7); fs("#5A6170", 0.6);
    // slow (one chevron) and fast (three) marks
    line(SLIDER.l - 1.8, SLIDER.y - 0.8, SLIDER.l - 1, SLIDER.y, "#7C8596", 0.45); line(SLIDER.l - 1, SLIDER.y, SLIDER.l - 1.8, SLIDER.y + 0.8, "#7C8596", 0.45);
    for (let i = 0; i < 3; i++) { const xx = SLIDER.r + 1 + i * 0.9; line(xx, SLIDER.y - 0.8, xx + 0.8, SLIDER.y, "#7C8596", 0.45); line(xx + 0.8, SLIDER.y, xx, SLIDER.y + 0.8, "#7C8596", 0.45); }
    const kx = SLIDER.l + (SLIDER.r - SLIDER.l) * S.speed / 2;
    rr(kx - 1.6, SLIDER.y - 2.4, 3.2, 4.8, 0.8); fs("#FFFFFF", 0.9);
    // the thread cutter on the left side of the head
    const kc = pressK("cutter");
    rr(CUTTER.x - 1.4 - kc * 0.5, CUTTER.y - 3, 2.6, 6, 0.8); fs("#9AA3B2", 0.9);
    line(CUTTER.x - 1.4, CUTTER.y, CUTTER.x + 0.6, CUTTER.y - 1.2, INK, 0.6);
    // the light under the head
    const g = ctx.createRadialGradient(0, -6, 1, 0, -6, 24);
    g.addColorStop(0, "rgba(255,248,214,0.55)"); g.addColorStop(1, "rgba(255,248,214,0)");
    ctx.fillStyle = g; ctx.fillRect(-26, -20, 52, 30);
  }
  function needleTip() { return -10 + depth(M.T) * 11; }
  function drawNeedleArea() {
    const fl = M.footA * 5, tip = needleTip(), x = M.lat;
    // the presser foot lever behind the needle bar
    const le = leverEnd();
    line(LEVER.x, LEVER.y, le.x, le.y, "#5A6170", 1.8); circ(le.x, le.y, 1.4); fs("#5A6170", 0.7);
    // the presser bar and the zigzag foot
    rr(2.4, HEAD.b - 1, 2, 12 - fl, 0.6); fs("#C9CED6", 0.7);
    rr(0.6, -9 - fl, 4, 5, 0.8); fs("#AEB6C2", 0.8);
    // a clear plastic foot (like the real satin-stitch foot): he can watch the stitches form under it
    poly([[-5.5, -2.6 - fl], [6.5, -2.6 - fl], [6.5, 1.4 - fl], [4.5, 3.2 - fl], [-3.5, 3.2 - fl], [-5.5, 1.4 - fl]]); fs("rgba(214,236,255,0.35)", 0.8);
    line(-4.5, -1.8 - fl, 5.5, -1.8 - fl, "rgba(255,255,255,0.7)", 0.5);
    // the needle bar and the needle (hidden where it is in the fabric)
    rr(x - 1.2, HEAD.b - 1, 2.4, tip - 7 - HEAD.b + 1, 0.5); fs("#C9CED6", 0.8);
    rr(x - 1.6, tip - 8.5, 3.2, 2.4, 0.6); fs("#9AA3B2", 0.7);
    ctx.save();
    if (under()) { ctx.beginPath(); ctx.rect(-50, -40, 100, 40.3); ctx.clip(); }
    poly([[x - 0.5, tip - 6.2], [x + 0.5, tip - 6.2], [x + 0.25, tip - 0.8], [x, tip], [x - 0.25, tip - 0.8]]); fs("#E8ECF1", 0.6);
    ctx.restore();
    if (tip > -0.3 && under()) { circ(x, 0, 0.55); fs("rgba(29,35,64,0.35)", 0); }
  }
  function drawLooseThreads() {
    // still attached: from the needle down to the last stitch (and the bobbin thread from the plate)
    if (!attached()) return;
    const p = cur.p, n = p.length, ex = F.x + p[n - 2], ey = F.top + p[n - 1];
    if (under() && Math.hypot(ex - M.lat, ey) < 1.5) return;
    const col = THREADS[cur.c].c, tip = needleTip();
    ctx.beginPath(); ctx.moveTo(M.lat, tip - 1.6); ctx.quadraticCurveTo((M.lat + ex) / 2, Math.max(tip, ey) + 3, ex, ey);
    ctx.strokeStyle = darker(col, 0.3); ctx.lineWidth = 0.75; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 0.45; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.5, 0.5); ctx.quadraticCurveTo((0.5 + ex) / 2, ey / 2 + 3, ex + 0.4, ey + 0.2);
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 0.45; ctx.stroke();
  }
  function drawFlights(t) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i], u = (t - f.t0) / f.dur;
      if (u >= 1) { flights.splice(i, 1); continue; }
      const k = ease(u), x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - Math.sin(u * Math.PI) * 14;
      spoolUp(x, y + 5, THREADS[f.c].c, 0.9);
    }
  }
  function drawSpoolOnPin() {
    if (flights.some((f) => f.toPin)) return;
    const k = pressK("spool");
    spoolSide(SPOOL.x, SPOOL.y - k, THREADS[S.thread].c, M.spool);
  }
  function drawFx(t) {
    if (!fx) return;
    const u = t - fx.t0;
    if (fxDone(u)) { fx = null; return; }
    if (fx.k === "buttons") {
      const j = L.jar;
      fx.items.forEach((b, i) => {
        let x, y, s = 1;
        const out = clamp((u - 0.4 - i * 0.05) / 1.1, 0, 1), back = clamp((u - 4.2 - i * 0.07) / 0.8, 0, 1);
        if (back > 0) { x = lerp(b.x1, j.x, ease(back)); y = lerp(b.y1, j.y - 5, ease(back)) - Math.sin(back * Math.PI) * 10; s = 1 - back * 0.4; }
        else { x = lerp(j.x + 4, b.x1, ease(out)); y = lerp(j.y - 8, b.y1, ease(out)) - Math.sin(out * Math.PI) * 6 * (1 - out * 0.5); }
        if (out <= 0) return;
        const r = b.r * s;
        circ(x, y, r); fs(b.c, 0.7);
        for (let h = 0; h < 4; h++) { const a = b.spin + h * TAU / 4 + out * 6; circ(x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, r * 0.13); fs("rgba(29,35,64,0.6)", 0); }
      });
    } else if (fx.k === "yarn") {
      const k = u / 7, x0 = L.tl - 10, x1 = L.tr + 10, y = TABLE.b - 6;
      const x = lerp(x0, x1, ease(k)), r = 5;
      ctx.beginPath(); ctx.moveTo(x0, y + 3); ctx.bezierCurveTo(lerp(x0, x, 0.3), y + 6, lerp(x0, x, 0.7), y - 1, x, y + r * 0.6);
      ctx.strokeStyle = "#FF6FB1"; ctx.lineWidth = 0.9; ctx.stroke();
      circ(x, y, r); fs("#FF8DC2", 1);
      ctx.save(); circ(x, y, r); ctx.clip();
      const rot = (x - x0) / r;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x, y, r * 1.1, r * 0.35, rot + i * 0.6, 0, TAU); ctx.strokeStyle = "rgba(200,40,110,0.45)"; ctx.lineWidth = 0.5; ctx.stroke(); }
      ctx.restore();
    } else if (fx.k === "butterfly") {
      const r = fabricRect(), lx = clamp(r.x + r.w * 0.7, -50, 40), lyy = clamp(r.y + r.h * 0.55, -10, 30);
      let x, y, flap;
      if (u < 2.6) { const k = ease(u / 2.6); x = lerp(L.box.l, lx, k); y = lerp(L.box.t + 10, lyy, k) + Math.sin(u * 5) * 6 * (1 - k); flap = Math.abs(Math.sin(u * 16)); }
      else if (u < 5.2) { x = lx; y = lyy; flap = 0.4 + 0.6 * Math.abs(Math.sin(u * 3)); }
      else { const k = ease((u - 5.2) / 2.8); x = lerp(lx, L.box.r, k); y = lerp(lyy, L.box.t, k) + Math.sin(u * 5) * 5; flap = Math.abs(Math.sin(u * 16)); }
      const w = 4.5 * (0.35 + 0.65 * flap);
      ell(x - w * 0.6, y - 1.5, w * 0.7, 2.6); fs("#FFB13B", 0.7);
      ell(x + w * 0.6, y - 1.5, w * 0.7, 2.6); fs("#FFB13B", 0.7);
      ell(x - w * 0.5, y + 1.6, w * 0.5, 1.8); fs("#FF6FB1", 0.7);
      ell(x + w * 0.5, y + 1.6, w * 0.5, 1.8); fs("#FF6FB1", 0.7);
      rr(x - 0.5, y - 3, 1, 6, 0.5); fs(INK, 0);
    }
  }
  function sparkle(x, y) { bits.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 8, t0: now(), life: 1.1, c: ["#FFC93C", "#FF6FB1", "#43C6D9", "#FFFFFF"][bits.length % 4], star: true }); }
  function puff(x, y, c, n) { for (let i = 0; i < n; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, t0: now(), life: 0.8, c }); }
  function drawBits(t, dt) {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i], u = (t - b.t0) / b.life;
      if (u >= 1) { bits.splice(i, 1); continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 14 * dt;
      ctx.globalAlpha = 1 - u;
      if (b.star) { poly([[b.x, b.y - 1.6], [b.x + 0.5, b.y - 0.5], [b.x + 1.6, b.y], [b.x + 0.5, b.y + 0.5], [b.x, b.y + 1.6], [b.x - 0.5, b.y + 0.5], [b.x - 1.6, b.y], [b.x - 0.5, b.y - 0.5]]); fs(b.c, 0); }
      else { circ(b.x, b.y, 0.6); fs(b.c, 0); }
      ctx.globalAlpha = 1;
    }
    if (bits.length > 80) bits.splice(0, bits.length - 80);
  }
  function drawGlow(t) {
    const w = want();
    let id = glowT > t ? glowPart : (w && !w.soft && !M.run ? w.part : null);
    if (!id || locked()) return;
    let x, y, r;
    if (id === "fabric") { const fr = fabricRect(); x = fr.x + fr.w / 2; y = clamp(fr.y + fr.h * 0.6, -6, 34); r = 9; }
    else { const p = partList().find((q) => q.id === id); if (!p) return; x = p.x; y = p.y; r = p.r + 1.8; }
    const a = 0.55 + 0.45 * Math.sin(t * 4);
    circ(x, y, r + a * 0.8);
    ctx.strokeStyle = "rgba(255,201,60," + (0.6 + 0.4 * a).toFixed(2) + ")"; ctx.lineWidth = 3.2 * LWv; ctx.stroke();
    ctx.strokeStyle = "rgba(29,35,64,0.5)"; ctx.lineWidth = 0.8 * LWv; ctx.stroke();
  }
  function draw(t, dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = "#EAF4FE"; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(DPR * sc, 0, 0, DPR * sc, DPR * ox, DPR * oy);
    LWv = 1.8 / sc;
    drawRoom();
    drawPedal();
    drawRack();
    drawPile();
    drawJar(t);
    drawBed();
    drawFabric();
    drawMachineBack();
    drawWheel();
    drawPanel();
    drawHead();
    drawSpoolOnPin();
    drawNeedleArea();
    drawLooseThreads();
    drawFlights(t);
    drawFx(t);
    drawBits(t, dt);
    drawGlow(t);
  }

  // =====================================================================================================
  // Loop and start
  // =====================================================================================================
  let last = now();
  function loop() {
    const t = now(), dt = Math.min(0.05, t - last);
    last = t;
    if (!locked() || M.goal != null) motion(dt);
    if (F.slide) {
      const s = F.slide, k = ease((t - s.at) / s.dur);
      F.x = lerp(s.x0, s.x1, k); F.top = lerp(s.t0, s.t1, k);
      if (k >= 1) { F.slide = null; saveSoon(); }
    }
    if (F.swap) drawSwapFabric();
    snd.update(M.v);
    updCoach();
    draw(t, dt);
    requestAnimationFrame(loop);
  }
  function onEnding(done) {
    // time is up: the machine finishes its stitch with the needle up and stops
    M.pedal = false;
    if (M.run) stopRun();
    const wait = () => (busy() ? setTimeout(wait, 150) : done());
    wait();
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 160 120" aria-hidden="true">' +
      '<rect x="18" y="92" width="124" height="10" rx="3" fill="#F6F7F4" stroke="#1D2340" stroke-width="2.5"/>' +
      '<path d="M30 30 H118 Q124 30 124 36 V92 H104 V54 H62 V70 H30 Z" fill="#F7F7F3" stroke="#1D2340" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="106" y="38" width="14" height="10" rx="2" fill="#CFE6D6" stroke="#1D2340" stroke-width="2"/>' +
      '<rect x="44" y="70" width="3" height="14" fill="#C9CED6" stroke="#1D2340" stroke-width="1.5"/>' +
      '<rect x="68" y="22" width="22" height="8" rx="2" fill="#2F6FE0" stroke="#1D2340" stroke-width="2"/>' +
      '<text x="128" y="26" font-family="sans-serif" font-weight="800" font-size="12" fill="#FFFFFF">z</text><text x="138" y="18" font-family="sans-serif" font-weight="800" font-size="9" fill="#FFFFFF">z</text>' +
      "</svg>";
  }

  layoutScene();
  repaint();
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) { M.pedal = false; if (M.run) stopRun(); save(); } });
  window.addEventListener("pagehide", save);
  Toybox.init({
    app: "sewing-machine",
    big: { button: $("bigToggle") },
    badge: $("tbadge"),
    timerIntro: "When time is up, the sewing machine finishes its stitch and stops, and the controls lock.",
    goodbyeOption: "End with a “Goodnight, sewing machine” button to press",
    farewellText: "Time to put the sewing away",
    goodbyeLabel: "Goodnight, sewing machine",
    farewellDone: "Night night, sewing machine!",
    restLine: "The sewing machine is resting.",
    restLine2: "The sewing will be right here next time.",
    restArt,
    soundNote: "Soft motor hum, needle ticks and snips. Hold for 2 seconds.",
    onEnding,
    onWake: () => { last = now(); },
    onSound: (on) => { if (on) snd.chime(); }
  });
  Toybox.offFirst({ running: () => M.run, off: (done) => { M.pedal = false; stopRun(); setTimeout(done, 300); } });
  requestAnimationFrame(loop);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__sew = {
      state: () => ({ run: M.run, T: +M.T.toFixed(2), foot: M.foot, stitch: S.stitch, thread: THREADS[S.thread].name, fabric: FABRICS[S.fabric].name,
        speed: SPEED_NAME[S.speed], fx: +F.x.toFixed(1), ftop: +F.top.toFixed(1), under: under(), atEnd: atEnd(), attached: attached(),
        stitches: runs.reduce((a, r) => a + r.p.length / 2, 0), runs: runs.length, pieces: S.pieces, coach: coach.text(), want: (want() || {}).part || null }),
      pt: (id) => partPt(id),
      tap: (id) => { if (id === "pedal") { sewSome(2, "pedal"); return; } const fn = { start: tapStart, rev: tapReverse, ndl: tapNeedle, lever: tapLever, cutter: snip, fabric: tapFabric }[id]; if (fn) fn(); else if (/^spool\d$/.test(id)) pickThread(+id.slice(5)); else if (/^fab\d$/.test(id)) pickFabric(+id.slice(3)); },
      ghost: () => ghost.show()
    };
  }
})();
