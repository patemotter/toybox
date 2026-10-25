(function () {
  "use strict";
  // Garbage Truck: an automated side loader works a street of bins, then unloads at the landfill. He works every
  // part himself, by dragging it or by tapping it (a tap plays that one part's own motion):
  //   Arm:      drag the arm down to the bin (the grabber closes on it), drag it up (the bin turns over the hopper and
  //             shakes out), drag it down (the bin goes back to the curb, the grabber opens, the arm folds in).
  //   Packer:   the packer blade pushes the hopper's trash into the body and squashes it. The near side of the
  //             hopper and the body is drawn see-through, so the load can be seen building up.
  //   Drive:    drag the truck (or tap it) to drive to the next bin; after the last bin, to the landfill.
  //   Landfill: the truck backs up to the working face by itself. Drag the tailgate up, then drag the body up: the
  //             load slides out. The body comes down, the tailgate shuts and the landfill compactor flattens the
  //             pile. Then on to the next street.
  // One world along the road that repeats every CYCLE metres: street, road, landfill, road, the next street.
  // Everything is drawn in metres with y up (the frame set by world()). Depth e is the distance behind the truck's
  // near side; it is drawn as an oblique offset (KX left and KY up per metre), so the curb in front of the truck sits
  // lower on the screen and the far side of the road higher.
  //
  // Sections:
  //   Setup and saved state
  //   The world and the projection
  //   Sound
  //   Drawing helpers
  //   Backdrop: street, road, landfill
  //   Bins and trash
  //   The truck
  //   Landfill: heap, compactor, birds
  //   Simulation: arm, packer, driving, unloading
  //   Coach, ring and ghost hand
  //   Input
  //   Surprise
  //   Camera and loop
  //   Timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const INK = "#1D2340", TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const locked = () => ending || Toybox.timer.locked();

  const KEY = "garbage-truck-v1";
  const startFresh = Toybox.fresh();
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (startFresh || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);

  // =====================================================================================================
  // The world and the projection
  // =====================================================================================================
  // Along the road, in metres from the start of each cycle: the six bins, the end of the street, the landfill
  // (from LF0 to LF1) and the road on to the next street.
  const CYCLE = 160, BIN_X = [10, 22, 34, 46, 58, 70], STREET_END = 82, LF0 = 100, LF1 = 140;
  const KX = 0.22, KY = 0.5;
  // The truck, in metres from the arm (x = 0 is the arm and the middle of the hopper; the truck faces +x).
  const TW = 2.4, FRONT = 3.4, REAR = -6.2, CAB0 = 1.05, HOP0 = -0.95, HOP1 = 1.05, BODY0 = -5.6;
  const ROOF = 3.45, CABTOP = 3.25, FLOOR = 1.15, RIM = 3.0, WHEELS = [2.25, -3.75, -4.85], WR = 0.52;
  const PIV = [-5.6, 1.05], TIP_MAX = 0.84;        // the body tips about this hinge at the back of the chassis
  const CURB_E = -2.6;                              // the bins stand on the sidewalk this far in front of the truck
  const BS = 1.3;                                   // bins are drawn bigger than life so they read on a phone
  // The arm's path (see armPose): stowed, at the bin, at the top of the lift, over the hopper.
  const Z_REST = 1.75, Z_GRAB = 0.62 * BS, Z_TOP = 3.7, E_SIDE = -0.5, E_OVER = 0.95, S_LIFT = 0.55, TIP_ANG = 2.45;
  // The landfill (cycle metres): the working face U (the truck's rear stops there), where the arm is then, the
  // stop before backing up, and where the compactor parks (its front blade).
  const U = 116, UNLOAD = U - REAR, FWD = UNLOAD + 6, COMP_PARK = U - 5.6;
  const HEAP0 = U - 7, HEAP_N = 28, HEAP_DX = 0.25;
  const CAP = 10, PER_BIN = 5, BODY_ITEMS = 30;    // the hopper holds two bins; the body holds the whole street
  const GREEN = "#35A85F", GREEND = "#24804A", GREENL = "#63C487", WHITE = "#F7F9FC", WHITED = "#D5DCE6";
  const STEEL = "#AEB6C2", DARK = "#4A5060", TIRE = "#2A2C36", INSIDE = "#2F3B35", BIN = "#3E7357", BIND = "#2C5641";

  // ---------- State ----------
  let seg = Math.max(0, Math.floor(num(saved.seg, 0)));
  let fill = clamp(num(saved.fill, 0), 0, 1);
  let ph = saved.at === "landfill" ? (fill > 0 ? "face" : "done") : "street";   // street | go-lf | back | face | done | go-st
  const doneSaved = Array.isArray(saved.done) ? saved.done : [];
  function newBin(i, full) { return { full: full, askew: full ? 0 : (hash(i, seg + 3) - 0.5) * 0.18, lid: 0, lidV: 0, held: false, wob: 0, peek: 0 }; }
  const bins = BIN_X.map((x, i) => newBin(i, !doneSaved[i]));
  const heap = [];
  for (let i = 0; i < HEAP_N; i++) heap.push(Array.isArray(saved.heap) ? clamp(num(saved.heap[i], 0), 0, 1.6) : 0);
  const items = [];      // trash in the hopper: { k, c, x (truck metres), z, vx, vz, r, vr, sz, set }
  const fx = [];         // short-lived bits: crumbs, dust, sparkles (world metres)
  const chunks = [];     // pieces of the load falling onto the landfill
  const truck = { x: 0, v: 0, target: 0, vmax: 7, arrive: null, pend: null, hold: false, wheel: 0, sink: 0, honk: 0, wave: 0, beep: 0 };
  const arm = { s: 0, target: 0, auto: false, held: false, grip: -1, gripA: 0, snap: 0, snapped: false, glide: 0, noGrip: false, lifted: false, wasFull: false, dumping: 0, wait: false, saidEmpty: false };
  const pk = { p: 0, st: "idle", byHand: false };
  const ul = { ta: 0, taT: 0, tt: 0, ttT: 0, slide: 0, sv: 0, held: "", tries: 0, flash: 0, lower: -1, close: -1, shake: 0 };
  const comp = { x: COMP_PARK, dir: 0, wheel: 0 };
  let bulge = 0, glow = 0, time = 0, active = 0, streetDone = false, saidPack = false, saidFull = false;
  let ending = false, endDone = null, snapCam = true;
  const segX = () => seg * CYCLE;
  const binWX = (i) => segX() + BIN_X[i];
  const lfX = () => segX();                        // the landfill after this street (same cycle)
  const nextFull = () => bins.findIndex((b) => b.full);
  const allDone = () => nextFull() < 0;
  const hopperCount = () => items.length;
  const driving = () => Math.abs(truck.target - truck.x) > 0.01 || Math.abs(truck.v) > 0.05 || !!truck.pend;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        v: 1, seg: seg, done: bins.map((b) => !b.full), fill: fill, hop: items.length,
        at: ph === "street" || ph === "go-st" ? "street" : "landfill", heap: heap.map((h) => Math.round(h * 100) / 100)
      }));
    } catch (e) { /* ignore */ }
  }

  // ---------- Projection ----------
  let W = 1, H = 1, DPR = 1, LW = 2, LWm = 0.06;
  const cam = { x: 0, S: 30, y0: -3 };
  // world point -> projected metres (x, y up)
  const Q = (x, z, e) => [x - (e || 0) * KX, z + (e || 0) * KY];
  // world point -> canvas px
  function cpx(x, z, e) { const q = Q(x, z, e); return [W / 2 + (q[0] - cam.x) * cam.S, H - (q[1] - cam.y0) * cam.S]; }
  // world point -> viewport px
  function vpx(x, z, e) { const b = cv.getBoundingClientRect(), p = cpx(x, z, e); return { x: b.left + p[0], y: b.top + p[1] }; }
  // canvas px -> world x on the ground line at depth e
  const wxAt = (px, e) => cam.x + (px - W / 2) / cam.S + (e || 0) * KX;
  function world() { ctx.setTransform(DPR * cam.S, 0, 0, -DPR * cam.S, DPR * (W / 2 - cam.x * cam.S), DPR * (H + cam.y0 * cam.S)); LWm = LW / cam.S; }
  // a point of the body, which turns about PIV by the tip angle (truck metres)
  function bodyPt(x, z) {
    const a = ul.tt * TIP_MAX, dx = x - PIV[0], dz = z - PIV[1];
    return [PIV[0] + dx * Math.cos(a) - dz * Math.sin(a), PIV[1] + dx * Math.sin(a) + dz * Math.cos(a)];
  }
  // a point of the tailgate (hinged at its top, then turned with the body)
  function gatePt(x, z) {
    const a = -ul.ta * 1.75, hx = BODY0 + 0.02, hz = ROOF + 0.02, dx = x - hx, dz = z - hz;
    return bodyPt(hx + dx * Math.cos(a) - dz * Math.sin(a), hz + dx * Math.sin(a) + dz * Math.cos(a));
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
  function noise(dur, type, freq, gain, delay, q) {
    const a = Toybox.sound.ready(); if (!a) return;
    if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q || 0.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.05, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  const snd = {
    clunk() { tone(120, 60, 0.18, "sine", 0.22); noise(0.05, "highpass", 2500, 0.04); },
    whine() { noise(0.7, "bandpass", 650, 0.025, 0, 5); },
    tumble() { for (let i = 0; i < 4; i++) noise(0.12, "lowpass", 380 + i * 90, 0.1, 0.12 + i * 0.13); },
    groan() { noise(1.5, "lowpass", 230, 0.07); tone(72, 56, 1.5, "triangle", 0.05); },
    crunch() { for (let i = 0; i < 5; i++) noise(0.05, "bandpass", 1700, 0.05, i * 0.06, 2); },
    pssh() { noise(0.35, "highpass", 3200, 0.04); },
    beep() { tone(900, 900, 0.2, "sine", 0.05); },
    horn() { [0, 0.35].forEach((d) => { tone(330, 330, 0.25, "triangle", 0.07, d); tone(392, 392, 0.25, "triangle", 0.05, d); }); },
    gull() { tone(1400, 900, 0.18, "sine", 0.04); tone(1500, 1000, 0.16, "sine", 0.03, 0.22); },
    thud() { tone(90, 45, 0.3, "sine", 0.22); noise(0.3, "lowpass", 300, 0.1); },
    tick() { tone(700, 500, 0.06, "triangle", 0.05); },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); }
  };

  // =====================================================================================================
  // Drawing helpers (metres, in the world() frame)
  // =====================================================================================================
  function stroke(lw) { ctx.lineWidth = LWm * (lw || 1); ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
  function shape(pts, fill, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) stroke(lw);
  }
  function box(x, y, w, h, fill, lw) { shape([x, y, x + w, y, x + w, y + h, x, y + h], fill, lw); }
  function rbox(x, y, w, h, r, fill, lw) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) stroke(lw);
  }
  function disc(x, y, r, fill, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) stroke(lw);
  }
  function line(x1, y1, x2, y2, col, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.stroke(); }
  // a rod with an ink edge
  function tube(x1, y1, x2, y2, w, col) { line(x1, y1, x2, y2, INK, w + 2 * LWm); line(x1, y1, x2, y2, col, w); }
  // the faces of a box seen from the near side, a little above and behind: the side at depth e, the top, the rear end
  function faceAt(x0, z0, x1, z1, e, fill, lw) { box(x0 - e * KX, z0 + e * KY, x1 - x0, z1 - z0, fill, lw); }
  function topAt(x0, x1, z, e0, e1, fill, lw) { shape([x0 - e0 * KX, z + e0 * KY, x1 - e0 * KX, z + e0 * KY, x1 - e1 * KX, z + e1 * KY, x0 - e1 * KX, z + e1 * KY], fill, lw); }
  function endAt(x, z0, z1, e0, e1, fill, lw) { shape([x - e0 * KX, z0 + e0 * KY, x - e1 * KX, z0 + e1 * KY, x - e1 * KX, z1 + e1 * KY, x - e0 * KX, z1 + e0 * KY], fill, lw); }
  // text in the world frame (upright, px size)
  function text(str, x, y, px, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1 / cam.S, -1 / cam.S);
    ctx.font = "800 " + px + "px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = col; ctx.fillText(str, 0, 0); ctx.restore();
  }
  function beacon(x, z, on) {
    const flash = on && (reduce || Math.sin(time * 9) > 0);
    if (on && !reduce) { ctx.save(); ctx.globalAlpha = 0.25 + 0.3 * Math.max(0, Math.sin(time * 9)); disc(x, z + 0.06, 0.42, "#FFD34D", 0); ctx.restore(); }
    ctx.beginPath(); ctx.arc(x, z, 0.16, 0, PI); ctx.closePath(); ctx.fillStyle = flash ? "#FFD34D" : "#F0A030"; ctx.fill(); stroke(0.8);
  }
  // squashed trash, used for the load in the body and the landfill pile
  let trashPat = null;
  function pattern() {
    if (trashPat !== null) return trashPat;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), cols = ["#3A3F4E", "#2F6DB5", "#ECEFF3", "#F2C94C", "#C8955A", "#5DBB63", "#9AA4B2", "#E58A5C"];
    x.fillStyle = "#857967"; x.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 52; i++) {
      x.fillStyle = cols[i % cols.length];
      x.save(); x.translate(hash(i, 1) * 64, hash(i, 2) * 64); x.rotate((hash(i, 5) - 0.5) * 0.5);
      x.fillRect(-(3 + hash(i, 3) * 6), -(1 + hash(i, 4) * 1.6), 6 + hash(i, 3) * 12, 2 + hash(i, 4) * 3.2); x.restore();
    }
    let p = null;
    try { p = ctx.createPattern(c, "repeat"); if (p && p.setTransform && window.DOMMatrix) p.setTransform(new DOMMatrix().scale(1 / 40)); else p = null; } catch (e) { p = null; }
    trashPat = p || "#857967";
    return trashPat;
  }

  // =====================================================================================================
  // Backdrop: street, road, landfill
  // =====================================================================================================
  const HOUSE_COLS = ["#F28B82", "#FDD663", "#81C995", "#78B6F0", "#C58AF9", "#F6AEA9", "#FFB74D", "#A1E3D8"];
  const ROOF_COLS = ["#B5543F", "#5A6478", "#8D5A3B", "#3E5C76"];
  const houseCache = {};
  // The houses across the street for street k, with the trees between them.
  function houses(k) {
    if (houseCache[k]) return houseCache[k];
    const list = [];
    let x = 1 + hash(k, 1) * 2, i = 0;
    while (x < STREET_END - 7) {
      const w = 7 + hash(k, i + 5) * 2.4, two = hash(k, i + 7) > 0.35;
      list.push({ x0: x, w: w, h: two ? 4.6 : 3.3, two: two, col: HOUSE_COLS[Math.floor(hash(k, i + 13) * HOUSE_COLS.length)],
        roof: ROOF_COLS[Math.floor(hash(k, i + 19) * ROOF_COLS.length)], door: HOUSE_COLS[Math.floor(hash(k, i + 23) * HOUSE_COLS.length)],
        lit: [0, 0, 0, 0], tree: { x: x + w + 1.9, h: 4.8 + hash(k, i + 29) * 2, shake: 0 } });
      x += w + 3.8 + hash(k, i + 17) * 1.6; i++;
    }
    return (houseCache[k] = list);
  }
  const roadTrees = {};
  function treesOf(k) {
    if (roadTrees[k]) return roadTrees[k];
    const list = [];
    [[STREET_END + 3, LF0 - 4], [LF1 + 3, CYCLE - 2]].forEach((r, j) => {
      for (let x = r[0]; x < r[1]; x += 5 + hash(k, x) * 3) list.push({ x: x, h: 4.5 + hash(x, k + j) * 2.5, e: 9 + hash(k, x + 1) * 3, shake: 0 });
    });
    return (roadTrees[k] = list);
  }
  function region(lx) { return lx < STREET_END ? "street" : lx < LF0 ? "road" : lx < LF1 ? "landfill" : "road"; }
  const BANDS = {
    street: [[-9, -3.5, "#8FCB62"], [-3.5, -2.15, "#DCD6C8"], [-2.15, -1.95, "#BDB7AA"], [-1.95, 7, "#70747F"], [7, 7.2, "#BDB7AA"], [7.2, 8.4, "#DCD6C8"], [8.4, 22, "#8FCB62"]],
    road: [[-9, -1.95, "#8FCB62"], [-1.95, 7, "#70747F"], [7, 22, "#8FCB62"]],
    landfill: [[-9, -1.95, "#B5A58A"], [-1.95, 5.5, "#C2B194"], [5.5, 22, "#A3825E"]]
  };
  function band(a, b, e0, e1, col) { shape([a - e0 * KX, e0 * KY, b - e0 * KX, e0 * KY, b - e1 * KX, e1 * KY, a - e1 * KX, e1 * KY], col, 0); }
  function tree(x, e, h, shake, col) {
    const q = Q(x, 0, e), sw = shake > 0 ? Math.sin(time * 30) * 0.12 * shake : 0;
    box(q[0] - 0.18, q[1], 0.36, h * 0.45, "#7A5233");
    [[0, 0.62, 0.3], [-0.22, 0.5, 0.24], [0.22, 0.52, 0.24], [0, 0.8, 0.22]].forEach((c) => disc(q[0] + c[0] * h + sw, q[1] + c[1] * h, c[2] * h, col || "#5DAE4B"));
  }
  function drawHouse(hs, ox) {
    const e = 10, x0 = ox + hs.x0 - e * KX, z0 = e * KY, x1 = x0 + hs.w, mid = (x0 + x1) / 2, dz = 3.2;
    // the left wall going back, the roof slope going back, the front wall and the gable
    shape([x0, z0, x0 - dz * KX, z0 + dz * KY, x0 - dz * KX, z0 + dz * KY + hs.h, x0, z0 + hs.h], shade(hs.col), 1);
    shape([x0 - 0.35, z0 + hs.h, mid, z0 + hs.h + 2, mid - dz * KX, z0 + hs.h + 2 + dz * KY, x0 - 0.35 - dz * KX, z0 + hs.h + dz * KY], hs.roof, 1);
    box(x0, z0, hs.w, hs.h, hs.col);
    shape([x0 - 0.35, z0 + hs.h, x1 + 0.35, z0 + hs.h, mid, z0 + hs.h + 2], hs.roof, 1);
    rbox(mid - 0.55, z0, 1.1, 2.1, 0.12, hs.door);
    disc(mid + 0.3, z0 + 1.0, 0.06, INK, 0);
    const win = (i, wx, wz) => { rbox(wx - 0.6, wz, 1.2, 1.0, 0.1, hs.lit[i] ? "#FFE58A" : "#BFE3FF"); line(wx, wz, wx, wz + 1.0, INK, LWm * 0.8); };
    win(0, x0 + hs.w * 0.2, z0 + 1.0); win(1, x1 - hs.w * 0.2, z0 + 1.0);
    if (hs.two) { win(2, x0 + hs.w * 0.25, z0 + 3.0); win(3, x1 - hs.w * 0.25, z0 + 3.0); }
    if (kid && kid.hs === hs) {
      // a child in the window waves at the truck
      const wx = x0 + hs.w * 0.25, wz = z0 + (hs.two ? 3.0 : 1.0), k = Math.sin(time * 9);
      ctx.save(); ctx.beginPath(); ctx.rect(wx - 0.6, wz, 1.2, 1.0); ctx.clip();
      rbox(wx - 0.28, wz - 0.1, 0.56, 0.5, 0.15, "#E8473B", 0.8);
      disc(wx, wz + 0.58, 0.2, "#F2C8A0", 0.8);
      disc(wx - 0.07, wz + 0.6, 0.025, INK, 0); disc(wx + 0.07, wz + 0.6, 0.025, INK, 0);
      tube(wx + 0.2, wz + 0.3, wx + 0.42 + k * 0.08, wz + 0.75, 0.08, "#F2C8A0");
      ctx.restore();
    }
  }
  function shade(col) {
    const n = parseInt(col.slice(1), 16), f = 0.82;
    return "rgb(" + Math.round((n >> 16) * f) + "," + Math.round(((n >> 8) & 255) * f) + "," + Math.round((n & 255) * f) + ")";
  }
  // the landfill's older mounds behind the working area, with grass grown on the finished slopes
  function drawMounds(ox) {
    const e = 13, dx = -e * KX, dz = e * KY;
    // an older finished mound further back, all grass, then the one in use with its stepped layers
    shape([ox + 92 + dx, dz + 2, ox + 102 + dx, dz + 9.5, ox + 118 + dx, dz + 11, ox + 134 + dx, dz + 10, ox + 150 + dx, dz + 2], "#8CC66E", 1);
    shape([ox + 96 + dx, dz, ox + 102 + dx, dz + 3, ox + 106 + dx, dz + 3.2, ox + 110 + dx, dz + 6, ox + 128 + dx, dz + 6.2, ox + 133 + dx, dz + 3.4, ox + 138 + dx, dz + 3.2, ox + 145 + dx, dz], "#9C7B57", 1);
    shape([ox + 96 + dx, dz, ox + 102 + dx, dz + 3, ox + 106 + dx, dz + 3.2, ox + 110 + dx, dz + 6, ox + 116 + dx, dz + 6.1, ox + 112 + dx, dz + 4.6, ox + 104 + dx, dz + 1.6, ox + 100 + dx, dz], "#7BB661", 1);
    for (let i = 0; i < 4; i++) line(ox + 99 + i * 2.5 + dx, dz + 0.8 + i * 1.3, ox + 141 - i * 2.5 + dx, dz + 0.8 + i * 1.3, "rgba(60,40,20,0.25)", 0.12);
    // the fence around the working area
    const fe = 7.5, fdx = -fe * KX, fdz = fe * KY;
    for (let x = ox + LF0 + 1; x < ox + LF1 - 1; x += 3) line(x + fdx, fdz, x + fdx, fdz + 1.6, "#6E737E", 0.08);
    line(ox + LF0 + 1 + fdx, fdz + 1.5, ox + LF1 - 2 + fdx, fdz + 1.5, "#6E737E", 0.06);
    line(ox + LF0 + 1 + fdx, fdz + 0.8, ox + LF1 - 2 + fdx, fdz + 0.8, "rgba(110,115,126,0.6)", 0.04);
  }
  function drawSign(ox) {
    // the landfill sign at the side of the road, before the gate
    const q = Q(ox + LF0 - 6, 0, -3.4);
    box(q[0] - 0.08, q[1], 0.16, 1.9, "#7A5233", 0.8);
    rbox(q[0] - 1.25, q[1] + 1.75, 2.5, 0.95, 0.12, "#2E7D4F", 1);
    text("Landfill", q[0], q[1] + 2.22, Math.max(11, cam.S * 0.42), "#FFFFFF");
  }
  function drawBackdrop() {
    // the sky (canvas px)
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#8ECFFF"); g.addColorStop(1, "#D7F0FF");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    world();
    const xa = cam.x - W / 2 / cam.S - 2, xb = cam.x + W / 2 / cam.S + 2;
    // clouds and far hills
    for (let j = Math.floor((xa + 4) / 23) - 1; j <= Math.floor((xb + 8) / 23) + 1; j++) {
      const hx = j * 23 + hash(j, 2) * 8, hy = 22 * KY;
      ctx.beginPath(); ctx.ellipse(hx, hy, 9 + hash(j, 3) * 5, 3 + hash(j, 4) * 3, 0, 0, PI); ctx.fillStyle = j % 2 ? "#A9DB8C" : "#97CF7B"; ctx.fill(); stroke(1);
      const cx = j * 23 + hash(j, 6) * 12, cz = 15 + hash(j, 7) * 3;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      [[0, 0, 1.4], [1.3, 0.2, 1.1], [-1.2, -0.1, 1.0]].forEach((c) => { ctx.beginPath(); ctx.arc(cx + c[0], cz + c[1], c[2], 0, TAU); ctx.fill(); });
    }
    // the ground: bands along the road, one set per kind of place
    for (let k = Math.floor((xa - 6) / CYCLE); k <= Math.floor((xb + 6) / CYCLE); k++) {
      const ox = k * CYCLE, cuts = [0, STREET_END, LF0, LF1, CYCLE];
      for (let r = 0; r < 4; r++) {
        const a = ox + cuts[r], b = ox + cuts[r + 1];
        if (b + 6 < xa || a - 6 > xb) continue;
        BANDS[region(cuts[r])].forEach((bd) => band(a - 0.02, b + 0.02, bd[0], bd[1], bd[2]));
      }
    }
    // things across the road, back to front
    for (let k = Math.floor((xa - 6) / CYCLE); k <= Math.floor((xb + 8) / CYCLE); k++) {
      const ox = k * CYCLE;
      if (ox + LF0 - 10 < xb && ox + LF1 + 10 > xa) drawMounds(ox);
      treesOf(k).forEach((t) => { if (ox + t.x > xa - 4 && ox + t.x - t.e * KX < xb + 6) tree(ox + t.x, t.e, t.h, t.shake, "#5DAE4B"); });
      if (ox < xb + 4 && ox + STREET_END > xa - 4) {
        houses(k).forEach((hs) => {
          if (ox + hs.x0 + hs.w < xa - 4 || ox + hs.x0 - 5 > xb + 4) return;
          drawHouse(hs, ox);
          tree(ox + hs.tree.x, 9.6, hs.tree.h, hs.tree.shake, "#4FA046");
        });
      }
      // the dashed middle line on the street and the road
      for (let x = Math.max(ox, Math.floor(xa / 6) * 6); x < Math.min(ox + LF0 - 2, xb + 4); x += 6) band(x, x + 2.6, 3.7, 3.95, "#F4F1E8");
      for (let x = Math.max(ox + LF1 + 2, Math.floor(xa / 6) * 6); x < Math.min(ox + CYCLE, xb + 4); x += 6) band(x, x + 2.6, 3.7, 3.95, "#F4F1E8");
    }
  }

  // =====================================================================================================
  // Bins and trash
  // =====================================================================================================
  const KINDS = ["bag", "bag", "box", "bag", "paper", "bag", "banana", "bag", "carton"];
  const BAGS = ["#3A3F4E", "#2F6DB5", "#ECEFF3", "#F2C94C", "#5DBB63", "#3A3F4E", "#8B6FD0"];
  // A bin with its bottom middle at the origin (metres, y up). The lid is hinged at the back (left) of the top.
  function drawBin(b) {
    ctx.save(); ctx.scale(BS, BS);
    disc(-0.25, 0.12, 0.13, TIRE, 0.8);
    shape([-0.3, 0.03, 0.3, 0.03, 0.37, 1.0, -0.37, 1.0], BIN);
    line(-0.12, 0.15, -0.14, 0.88, BIND, 0.035); line(0.12, 0.15, 0.14, 0.88, BIND, 0.035);
    tube(-0.41, 0.86, -0.41, 1.06, 0.05, BIND);
    const lid = Math.max(b.lid, b.peek, b.full && !b.held ? 0.12 : 0);
    if (b.full && !b.held) disc(0.06, 1.02, 0.15, "#3A3F4E", 0.8);
    ctx.save(); ctx.translate(-0.4, 1.0); ctx.rotate(lid);
    rbox(0, 0, 0.82, 0.11, 0.03, BIND);
    ctx.restore();
    ctx.restore();
  }
  function drawItem(k, c, sz) {
    const r = sz / 2;
    if (k === "bag") { disc(0, -r * 0.1, r * 0.92, c, 0.8); shape([-r * 0.25, r * 0.7, r * 0.25, r * 0.7, r * 0.4, r * 1.1, -r * 0.4, r * 1.1], c, 0.8); }
    else if (k === "box") { box(-r, -r * 0.75, sz, r * 1.5, "#C8955A", 0.8); line(-r, r * 0.1, r, r * 0.1, "#A87437", r * 0.2); }
    else if (k === "paper") shape([-r, -r * 0.4, -r * 0.3, -r, r * 0.6, -r * 0.7, r, 0, r * 0.4, r * 0.8, -r * 0.6, r * 0.6], "#F4F6F8", 0.8);
    else if (k === "banana") { ctx.beginPath(); ctx.arc(0, r * 0.6, r, PI * 1.15, PI * 1.85); ctx.lineWidth = r * 0.55 + 2 * LWm; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = r * 0.55; ctx.strokeStyle = "#F5D04A"; ctx.stroke(); }
    else { box(-r, -r * 0.4, sz, r * 0.8, "#C9CDD3", 0.8); for (let i = 0; i < 3; i++) disc(-r * 0.6 + i * r * 0.6, r * 0.4, r * 0.22, "#C9CDD3", 0.6); }
  }
  function newItem(x, z, i) {
    const k = KINDS[Math.floor(Math.random() * KINDS.length)];
    return { k: k, c: BAGS[(i + Math.floor(Math.random() * 7)) % BAGS.length], x: x, z: z, vx: (Math.random() - 0.5) * 0.9, vz: 0.3,
      r: Math.random() * TAU, vr: (Math.random() - 0.5) * 6, sz: k === "bag" ? 0.46 : 0.36, set: false };
  }
  // a settled pile, for a hopper restored from storage
  function restoreItems(n) {
    for (let i = 0; i < Math.min(CAP, n); i++) {
      const it = newItem(HOP0 + 0.35 + (i % 5) * 0.32, FLOOR + 0.25 + Math.floor(i / 5) * 0.36, i);
      it.set = true; it.r = 0; items.push(it);
    }
  }

  // =====================================================================================================
  // The truck
  // =====================================================================================================
  function drawTruck() {
    ctx.save(); ctx.translate(truck.x, truck.sink);
    const on = active > 0 && !ending;
    // shadow
    ctx.save(); ctx.globalAlpha = 0.18; topAt(REAR - 0.1, FRONT + 0.1, -truck.sink, -0.15, TW + 0.15, "#000000", 0); ctx.restore();
    faceAt(-5.95, 0.72, 3.25, 1.05, 0, DARK, 0.9);
    // the body hoist (two cylinders under the front of the body; seen when the body tips)
    if (ul.tt > 0.01) { const a = bodyPt(-1.4, 1.1); tube(-1.7, 0.95, a[0], a[1], 0.2, DARK); tube(-1.7, 0.95, lerp(-1.7, a[0], 0.6), lerp(0.95, a[1], 0.6), 0.12, "#D9DEE5"); }
    // Back to front: the view sees the rear ends of the boxes, so the cab is furthest and the tailgate nearest.
    drawCab(on);
    drawHopper();
    // the body and the tailgate, tipped together about the hinge at the back
    ctx.save();
    ctx.translate(PIV[0], PIV[1]); ctx.rotate(ul.tt * TIP_MAX); ctx.translate(-PIV[0], -PIV[1]);
    drawBody(on);
    drawGate();
    ctx.restore();
    // wheels, mud flaps
    WHEELS.forEach((wx, i) => {
      if (i === 0) { ctx.beginPath(); ctx.arc(wx, WR, WR + 0.16, 0, PI); ctx.lineTo(wx - WR - 0.16, WR); ctx.fillStyle = WHITED; ctx.fill(); stroke(); }
      disc(wx, WR, WR, TIRE);
      disc(wx, WR, WR * 0.58, "#C3CCD6", 0.8);
      const a = -truck.wheel / WR;
      for (let j = 0; j < 5; j++) disc(wx + Math.cos(a + j * TAU / 5) * WR * 0.34, WR + Math.sin(a + j * TAU / 5) * WR * 0.34, 0.045, "#6E7887", 0);
      disc(wx, WR, 0.09, "#8C97A6", 0.6);
    });
    box(-5.62, 0.12, 0.12, 0.62, TIRE, 0.8);
    box(1.48 - 0.06, 0.12, 0.1, 0.55, TIRE, 0.8);
    // honk lines at the front
    if (truck.honk > 0) for (let i = 0; i < 3; i++) {
      const k = (truck.honk * 3 + i * 0.33) % 1;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(FRONT + 0.2, 1.5, 0.3 + k * 0.9, -0.6, 0.6); ctx.lineWidth = 0.08; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
    }
    // backup beep marks behind the truck
    if (ph === "back") for (let i = 0; i < 3; i++) {
      const k = (time * 1.6 + i * 0.33) % 1;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.arc(REAR - 0.2, 2.2, 0.3 + k * 0.9, PI - 0.6, PI + 0.6); ctx.lineWidth = 0.09; ctx.strokeStyle = "#E8762B"; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function drawBody(on) {
    const z0 = 1.05, x0 = BODY0, x1 = HOP0, ix0 = x0 + 0.14, ix1 = x1 - 0.1, iz1 = ROOF - 0.16;
    topAt(x0, x1, ROOF, 0, TW, GREENL);
    endAt(x0, z0, ROOF, 0, TW, GREEND);
    // inside, seen through the see-through near side: the squashed load fills from the back
    faceAt(ix0, FLOOR, ix1, iz1, 0, INSIDE, 0);
    const L = ix1 - ix0, len = fill * L;
    if (len > 0.01) {
      ctx.save();
      ctx.beginPath(); ctx.rect(ul.ta > 0.3 ? ix0 - 6 : ix0, FLOOR, (ul.ta > 0.3 ? 6 : 0) + L, iz1 - FLOOR); ctx.clip();
      ctx.translate(-ul.slide, 0);
      const xf = ix0 + len, top = iz1 - 0.05, b = 0.32 * bulge * bulge;
      ctx.beginPath(); ctx.moveTo(ix0, FLOOR); ctx.lineTo(xf, FLOOR); ctx.quadraticCurveTo(xf + b * 2, (FLOOR + top) / 2, xf, top); ctx.lineTo(ix0, top); ctx.closePath();
      ctx.fillStyle = pattern(); ctx.fill(); stroke(0.8);
      // one squashed layer per bin
      for (let k = 1; k < 6 && k / 6 < fill - 0.02; k++) {
        const lx = ix0 + k * L / 6;
        ctx.beginPath(); ctx.moveTo(lx, FLOOR); ctx.quadraticCurveTo(lx + 0.12, (FLOOR + top) / 2, lx, top); ctx.lineWidth = 0.05; ctx.strokeStyle = "rgba(40,30,20,0.45)"; ctx.stroke();
      }
      ctx.restore();
    }
    // the near side: a frame with ribs, see-through between them
    ctx.save(); ctx.globalAlpha = 0.16; faceAt(ix0, FLOOR, ix1, iz1, 0, "#DFF3FF", 0); ctx.restore();
    line(ix0 + 0.4, iz1 - 0.3, ix0 + 1.3, FLOOR + 0.3, "rgba(255,255,255,0.35)", 0.08);
    faceAt(x0, z0, x1, FLOOR, 0, GREEN); faceAt(x0, iz1, x1, ROOF, 0, GREEN);
    faceAt(x0, z0, ix0, ROOF, 0, GREEN); faceAt(ix1, z0, x1, ROOF, 0, GREEN);
    for (let k = 1; k < 5; k++) { const rx = ix0 + k * L / 5; faceAt(rx - 0.05, FLOOR, rx + 0.05, iz1, 0, GREEND, 0.6); }
    beacon(x0 + 0.25, ROOF + 0.02, on);
  }
  function drawGate() {
    const hx = BODY0 + 0.02, hz = ROOF + 0.02, a = -ul.ta * 1.75;
    ctx.save(); ctx.translate(hx, hz); ctx.rotate(a);
    // the rear face (going back in depth), then the side
    shape([-0.62, -2.42, -0.62 - TW * KX, -2.42 + TW * KY, -0.62 - TW * KX, -0.12 + TW * KY, -0.62, -0.12], GREEND);
    shape([0.02, -2.42, -0.54, -2.42, -0.66, -1.7, -0.62, -0.2, -0.42, 0.02, 0.02, 0.02], GREEN);
    line(-0.5, -1.0, -0.06, -1.0, GREEND, 0.06);
    box(-0.2, -2.34, 0.16, 0.2, DARK, 0.7);                  // the tailgate lock
    disc(0, 0, 0.08, STEEL, 0.6);                             // the hinge
    if (ul.flash > 0) {
      ctx.save(); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 14);
      shape([0.06, -2.48, -0.6, -2.48, -0.72, -1.7, -0.68, -0.2, -0.45, 0.08, 0.06, 0.08], null, 0);
      ctx.lineWidth = 0.14; ctx.strokeStyle = "#FFC93C"; ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  function drawHopper() {
    const z0 = 1.05;
    // the open top and the inside, seen through the see-through near side
    topAt(HOP0, HOP1, RIM, 0, TW, INSIDE, 0);
    faceAt(HOP0, FLOOR, HOP1, RIM, 0, INSIDE, 0);
    const fr = Q(HOP0, RIM, TW), fr2 = Q(HOP1, RIM, TW);
    line(fr[0], fr[1], fr2[0], fr2[1], GREEND, 0.12);
    // the packer blade and its ram
    const bx = lerp(HOP1 - 0.14, HOP0 + 0.2, pk.p), r0 = Q(HOP1, 2.2, 1.2), r1 = Q(bx, 2.2, 1.2);
    tube(r0[0], r0[1], r1[0], r1[1], 0.14, "#D9DEE5");
    endAt(bx, FLOOR, RIM - 0.08, 0, TW, STEEL);
    faceAt(bx - 0.05, FLOOR, bx + 0.05, RIM - 0.08, 0, "#7D8794", 0.7);
    // the trash
    items.forEach((it) => { const q = Q(it.x, it.z, 0.7); ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(it.r); drawItem(it.k, it.c, it.sz); ctx.restore(); });
    // the near side frame
    ctx.save(); ctx.globalAlpha = 0.16; faceAt(HOP0, FLOOR, HOP1, RIM, 0, "#DFF3FF", 0); ctx.restore();
    faceAt(HOP0, z0, HOP1, FLOOR, 0, GREEN); faceAt(HOP0, RIM - 0.14, HOP1, RIM, 0, GREEN);
    faceAt(HOP0, z0, HOP0 + 0.1, RIM, 0, GREEN); faceAt(HOP1 - 0.1, z0, HOP1, RIM, 0, GREEN);
    topAt(HOP0, HOP1, RIM, 0, TW, null, 1);
  }
  function drawCab(on) {
    endAt(CAB0, RIM, CABTOP, 0, TW, WHITED);
    topAt(CAB0, FRONT - 0.25, CABTOP, 0, TW, WHITED);
    shape([CAB0, 0.95, FRONT, 0.95, FRONT, 2.25, FRONT - 0.25, CABTOP, CAB0, CABTOP], WHITE);
    box(CAB0, 1.3, FRONT - CAB0, 0.24, GREEN, 0.8);
    // the window with the driver (right-hand drive: he sits on this side, next to the arm)
    const win = [CAB0 + 0.5, 2.0, FRONT - 0.12, 2.0, FRONT - 0.32, 3.05, CAB0 + 0.5, 3.05];
    shape(win, "#BFE6FF");
    ctx.save(); shape(win, null, 0); ctx.clip();
    const dx = FRONT - 1.05, wv = truck.wave > 0 ? Math.sin(time * 10) * 0.12 : 0;
    rbox(dx - 0.42, 1.95, 0.2, 0.9, 0.06, "#3A3F4E", 0.7);                       // seat back
    rbox(dx - 0.25, 1.95, 0.58, 0.7, 0.14, "#F4D23C", 0.8);                      // hi-vis shirt
    line(dx - 0.22, 2.25, dx + 0.3, 2.25, "#C9D2DC", 0.07);
    disc(dx + 0.05, 2.86, 0.2, "#E8B98F", 0.8);
    shape([dx - 0.16, 2.95, dx + 0.22, 2.95, dx + 0.4, 2.92, dx + 0.2, 3.1, dx - 0.12, 3.1], "#2F4A78", 0.7);   // cap
    disc(dx + 0.15, 2.9, 0.028, INK, 0);
    ctx.beginPath(); ctx.arc(dx + 0.12, 2.8, 0.07, -PI * 0.9, -PI * 0.25); ctx.lineWidth = 0.025; ctx.strokeStyle = INK; ctx.stroke();
    if (truck.wave > 0) { tube(dx + 0.2, 2.45, dx + 0.42 + wv, 2.95, 0.09, "#E8B98F"); disc(dx + 0.44 + wv, 3.0, 0.08, "#E8B98F", 0.6); }
    else tube(dx + 0.2, 2.4, dx + 0.48, 2.42, 0.09, "#E8B98F");
    ctx.restore();
    line(CAB0 + 0.4, 1.0, CAB0 + 0.4, 3.1, "rgba(29,35,64,0.5)", LWm * 0.8);
    box(CAB0 + 0.62, 0.42, 0.5, 0.1, DARK, 0.6); box(CAB0 + 0.62, 0.78, 0.5, 0.1, DARK, 0.6);   // steps
    box(FRONT - 0.08, 0.5, 0.2, 0.45, DARK, 0.8);                                               // bumper
    disc(FRONT - 0.04, 1.15, 0.11, "#FFF4C2", 0.7);
    tube(FRONT - 0.3, 2.85, FRONT + 0.22, 2.65, 0.05, DARK); rbox(FRONT + 0.14, 2.2, 0.16, 0.5, 0.05, DARK, 0.7);   // mirror
    const bq = Q(FRONT - 0.9, CABTOP, TW / 2);
    beacon(bq[0], bq[1], on);
  }
  // The arm in the truck's frame: the arm's pivot on the chassis, the outer boom and the inner boom that slides out
  // of it, and the grabber (with the bin when it holds one), turned with the bin at the top of the lift.
  function armPose(s) {
    if (s <= 0) { const u = -s; return { e: lerp(E_SIDE, CURB_E, u), z: lerp(Z_REST, Z_GRAB, u), a: 0 }; }
    if (s <= S_LIFT) return { e: E_SIDE, z: lerp(Z_REST, Z_TOP, ease(s / S_LIFT)), a: 0 };
    const u = (s - S_LIFT) / (1 - S_LIFT);
    return { e: lerp(E_SIDE, E_OVER, ease(u)), z: Z_TOP + 0.55 * Math.sin(u * PI / 2), a: TIP_ANG * ease(u) };
  }
  function drawArm() {
    const p = armPose(arm.s), g = Q(0, p.z, p.e), b = Q(0, 1.25, -0.2);
    ctx.save(); ctx.translate(truck.x, truck.sink);
    faceAt(-0.42, 0.82, 0.42, 1.55, -0.2, DARK, 0.9);
    const dx = g[0] - b[0], dz = g[1] - b[1], L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, oL = Math.min(L - 0.1, 0.95);
    tube(b[0], b[1], g[0] - ux * 0.15, g[1] - uz * 0.15, 0.13, "#C9D0DA");
    if (oL > 0) tube(b[0], b[1], b[0] + ux * oL, b[1] + uz * oL, 0.26, DARK);
    disc(b[0], b[1], 0.15, "#7D8794", 0.8);
    ctx.save(); ctx.translate(g[0], g[1]);
    const shake = arm.dumping > 0 ? Math.sin(arm.dumping * 26) * 0.14 : 0;
    ctx.rotate(p.a + shake);
    if (arm.grip >= 0) { ctx.save(); ctx.translate(0, -Z_GRAB); drawBin(bins[arm.grip]); ctx.restore(); }
    // the grabber: a head and two curved gripper arms with rubber pads
    const hw = lerp(0.6, 0.4, arm.gripA) + Math.sin(arm.snap * 18) * 0.08 * arm.snap;
    rbox(-0.2, -0.1, 0.4, 0.22, 0.05, DARK, 0.8);
    [-1, 1].forEach((sd) => {
      ctx.beginPath(); ctx.moveTo(sd * 0.15, 0.04); ctx.quadraticCurveTo(sd * (hw + 0.08), 0.12, sd * hw, -0.2);
      ctx.lineWidth = 0.13 + 2 * LWm; ctx.strokeStyle = INK; ctx.lineCap = "round"; ctx.stroke(); ctx.lineWidth = 0.13; ctx.strokeStyle = "#F2B33A"; ctx.stroke();
      disc(sd * hw, -0.22, 0.07, TIRE, 0.6);
    });
    ctx.restore();
    ctx.restore();
  }

  // =====================================================================================================
  // Landfill: heap, compactor, birds
  // =====================================================================================================
  function heapAt(lx) {
    const f = (lx - HEAP0) / HEAP_DX, i = Math.floor(f);
    if (i < 0 || i >= HEAP_N - 1) return 0;
    return lerp(heap[i], heap[i + 1], f - i);
  }
  function addHeap(lx, amt, w) { for (let i = 0; i < HEAP_N; i++) { const d = (HEAP0 + i * HEAP_DX - lx) / w; heap[i] = Math.min(1.6, heap[i] + amt * Math.exp(-d * d)); } }
  function drawHeap(ox) {
    const e = 1.2, pts = [];
    const p0 = Q(ox + HEAP0 - 0.4, 0, e); pts.push(p0[0], p0[1]);
    for (let i = 0; i < HEAP_N; i++) { const q = Q(ox + HEAP0 + i * HEAP_DX, heap[i], e); pts.push(q[0], q[1]); }
    const p1 = Q(ox + HEAP0 + HEAP_N * HEAP_DX, 0, e); pts.push(p1[0], p1[1]);
    if (heap.some((h) => h > 0.02)) shape(pts, pattern(), 0.9);
  }
  function compZ() { return Math.max(heapAt(comp.x - 1.0), heapAt(comp.x - 3.6)) * 0.85; }
  function drawCompactor(ox) {
    const e = 0.5, q = Q(ox + comp.x, compZ(), e), Y = "#F2B33A", YD = "#C98A1A";
    ctx.save(); ctx.translate(q[0], q[1]);
    tube(-1.0, 0.8, 0.12, 0.85, 0.14, DARK);
    shape([0.05, 0.02, 0.4, 0.0, 0.5, 1.55, 0.12, 1.65], DARK);                                // the front blade
    rbox(-4.5, 0.85, 3.9, 1.05, 0.15, Y);
    rbox(-4.5, 1.85, 1.5, 0.55, 0.1, YD);
    tube(-4.1, 2.35, -4.1, 2.95, 0.09, DARK);
    rbox(-3.05, 1.85, 1.45, 1.4, 0.1, Y);
    rbox(-2.9, 2.15, 1.15, 0.9, 0.08, "#BFE6FF", 0.8);
    rbox(-2.55, 2.1, 0.42, 0.5, 0.1, "#F4D23C", 0.7); disc(-2.34, 2.78, 0.16, "#E8B98F", 0.7);   // the driver
    box(-3.15, 3.22, 1.65, 0.14, YD, 0.8);
    beacon(-2.3, 3.38, comp.dir !== 0 && !ending);
    [-1.0, -3.6].forEach((wx) => {
      // the spiked steel wheels
      const a = -comp.wheel / 0.78;
      for (let j = 0; j < 12; j++) {
        const t = a + j * TAU / 12, c = Math.cos(t), s = Math.sin(t), c2 = Math.cos(t + 0.18), s2 = Math.sin(t + 0.18), c3 = Math.cos(t + 0.09), s3 = Math.sin(t + 0.09);
        shape([wx + c * 0.72, 0.78 + s * 0.72, wx + c2 * 0.72, 0.78 + s2 * 0.72, wx + c3 * 0.92, 0.78 + s3 * 0.92], "#6E7887", 0.6);
      }
      disc(wx, 0.78, 0.74, "#8C96A3"); disc(wx, 0.78, 0.36, "#6E7887", 0.8); disc(wx, 0.78, 0.1, DARK, 0);
    });
    ctx.restore();
  }
  // Birds: gulls at the landfill and pigeons on the street (a Surprise). Each has a home to sit at and can fly a loop.
  const gulls = [];
  for (let i = 0; i < 6; i++) gulls.push({ hx: U - 11 + i * 2.6 + hash(i, 9), he: 5 + hash(i, 4) * 2, x: 0, z: 0, e: 0, st: "home", t: 0, ang: 0, ph: hash(i, 2) * 6, roof: false });
  gulls.forEach((g) => { g.x = g.hx; g.e = g.he; });
  const pigeons = [];
  function drawBird(x, z, e, flying, col, flap) {
    const q = Q(x, z, e);
    if (flying) {
      const w = Math.sin(flap) * 0.25;
      ctx.beginPath(); ctx.moveTo(q[0] - 0.42, q[1] + 0.12 + w); ctx.quadraticCurveTo(q[0] - 0.2, q[1] + 0.2 + w, q[0], q[1]); ctx.quadraticCurveTo(q[0] + 0.2, q[1] + 0.2 + w, q[0] + 0.42, q[1] + 0.12 + w);
      ctx.lineWidth = 0.09 + 2 * LWm; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 0.09; ctx.strokeStyle = col; ctx.stroke();
      return;
    }
    const bob = Math.max(0, Math.sin(flap)) * 0.06;
    ctx.beginPath(); ctx.ellipse(q[0], q[1] + 0.2, 0.22, 0.13, 0, 0, TAU); ctx.fillStyle = col; ctx.fill(); stroke(0.7);
    disc(q[0] + 0.18, q[1] + 0.32 - bob, 0.09, col, 0.7);
    shape([q[0] + 0.26, q[1] + 0.33 - bob, q[0] + 0.36, q[1] + 0.3 - bob, q[0] + 0.26, q[1] + 0.28 - bob], "#F2B33A", 0);
    disc(q[0] + 0.2, q[1] + 0.34 - bob, 0.018, INK, 0);
    line(q[0] - 0.02, q[1] + 0.08, q[0] - 0.04, q[1], "#E58A5C", 0.03); line(q[0] + 0.06, q[1] + 0.08, q[0] + 0.06, q[1], "#E58A5C", 0.03);
  }
  function spookGulls(roof) {
    gulls.forEach((g, i) => { g.st = "fly"; g.t = 0; g.ang = i * TAU / gulls.length; g.roof = !!roof; });
    snd.gull();
  }
  function updateGulls(dt) {
    const cx = U - 3;
    gulls.forEach((g, i) => {
      g.ph += dt * (g.st === "home" ? 2 : 14);
      if (g.st === "fly") {
        g.t += dt; g.ang += dt * 0.9;
        g.x = lerp(g.x, cx + Math.cos(g.ang) * 5, Math.min(1, dt * 2)); g.z = lerp(g.z, 6.5 + Math.sin(g.ang * 2) * 0.6 + i * 0.15, Math.min(1, dt * 2)); g.e = lerp(g.e, 3, Math.min(1, dt));
        if (g.t > 5 + i * 0.3) g.st = "land";
      } else if (g.st === "land") {
        // back to the ground, or onto the compactor's roof
        const tx = g.roof ? comp.x - 2.9 + (i % 3) * 0.55 : g.hx, tz = g.roof ? compZ() + 3.36 : 0, te = g.roof ? (i > 2 ? 0.9 : 0.3) : g.he;
        g.x = lerp(g.x, tx, Math.min(1, dt * 2.2)); g.z = lerp(g.z, tz, Math.min(1, dt * 2.2)); g.e = lerp(g.e, te, Math.min(1, dt * 2.2));
        if (Math.abs(g.x - tx) + Math.abs(g.z - tz) < 0.08) { g.st = g.roof ? "roof" : "home"; g.x = tx; g.z = tz; g.e = te; }
      } else if (g.st === "roof") { g.x = comp.x - 2.9 + (i % 3) * 0.55; g.z = compZ() + 3.36; }
    });
  }

  // =====================================================================================================
  // Simulation: arm, packer, driving, unloading
  // =====================================================================================================
  function addFx(k, x, z, e, vx, vz, life, c, r) { if (fx.length > (reduce ? 24 : 60)) fx.shift(); fx.push({ k: k, x: x, z: z, e: e, vx: vx, vz: vz, life: life, max: life, c: c, r: r }); }
  function dust(x, z, e, n) { for (let i = 0; i < n; i++) addFx("dust", x + (Math.random() - 0.5) * 0.6, z, e, (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, 0.9, "rgba(200,190,170,0.8)", 0.18 + Math.random() * 0.15); }
  function sparkle(x, z, e) { for (let i = 0; i < 6; i++) addFx("spark", x, z, e, Math.cos(i) * 1.4, Math.sin(i) * 1.4 + 0.6, 1.0, "#FFC93C", 0.12); }

  // ---------- Driving ----------
  // goTo drives straight to tx; drive() first folds the arm in. arrive runs once the truck stops there.
  function goTo(tx, vmax, arrive) { truck.target = tx; truck.vmax = vmax; truck.arrive = arrive || null; }
  function drive(tx, vmax, arrive) {
    truck.pend = { tx: tx, vmax: vmax, arrive: arrive };
    if (Math.abs(arm.s) > 0.02) { arm.target = 0; arm.auto = true; }
  }
  function brake() { snd.pssh(); dust(truck.x + WHEELS[1], 0.2, -0.2, reduce ? 1 : 3); }
  function goLandfill() {
    if (hopperCount() > 0 && pk.st === "idle") startPack(false);   // the last trash gets packed on the way
    ph = "go-lf";
    drive(lfX() + FWD, 13, () => { brake(); ph = "back"; truck.beep = 0; goTo(lfX() + UNLOAD, 2.2, () => { brake(); ph = "face"; Object.assign(ul, { ta: 0, taT: 0, tt: 0, ttT: 0, slide: 0, sv: 0, tries: 0, lower: -1, close: -1 }); save(); }); });
  }
  function goStreet() {
    seg++;
    bins.forEach((b, i) => Object.assign(b, newBin(i, true)));
    streetDone = false; ph = "go-st"; save();
    drive(segX() + BIN_X[0], 13, () => { brake(); ph = "street"; save(); });
  }
  // He asked the truck to drive (a tap on it, or a drag let go): to the next bin, the landfill or the next street.
  function driveNext() {
    if (ph === "street") {
      if (arm.grip >= 0) { hint(); return false; }
      const i = nextFull();
      if (i >= 0) {
        if (Math.abs(binWX(i) - truck.x) < 0.05) { hint(); return false; }
        drive(binWX(i), 7, brake); return true;
      }
      goLandfill(); return true;
    }
    if (ph === "done") { goStreet(); return true; }
    hint(); return false;
  }
  function updateTruck(dt) {
    if (truck.pend && Math.abs(arm.s) < 0.03) { const p = truck.pend; truck.pend = null; goTo(p.tx, p.vmax, p.arrive); }
    const A = 4.5, d = truck.hold ? 0 : truck.target - truck.x;
    const want = Math.sign(d) * Math.min(truck.vmax, Math.sqrt(2 * A * Math.abs(d)));
    truck.v += clamp(want - truck.v, -A * dt * 1.5, A * dt);
    const nx = truck.x + truck.v * dt;
    if (!truck.hold && (Math.abs(d) < 0.01 || Math.sign(truck.target - nx) !== Math.sign(d))) {
      truck.wheel += truck.target - truck.x; truck.x = truck.target; truck.v = 0;
      if (truck.arrive) { const f = truck.arrive; truck.arrive = null; f(); }
    } else { truck.wheel += nx - truck.x; truck.x = nx; }
    if (Math.abs(truck.v) > 0.05) active = 1.5;
    if (ph === "back") { truck.beep -= dt; if (truck.beep <= 0) { truck.beep = 0.65; snd.beep(); } }
    truck.sink *= Math.pow(0.02, dt);
  }

  // ---------- The arm ----------
  function binAtArm(tol) {
    for (let i = 0; i < bins.length; i++) if (!bins[i].held && Math.abs(binWX(i) - truck.x) < tol) return i;
    return -1;
  }
  function grip(i) {
    arm.grip = i; arm.lifted = false; arm.wasFull = bins[i].full; arm.saidEmpty = false;
    bins[i].held = true; bins[i].askew = 0; bins[i].peek = 0;
    snd.clunk();
    if (rac && rac.i === i && rac.t < 3) rac.t = 3;   // the raccoon hops out before the bin goes up
  }
  function release() {
    const b = bins[arm.grip];
    b.held = false; b.askew = (Math.random() - 0.5) * 0.16; b.wob = 1; b.lid = 0;
    arm.grip = -1; arm.glide = 0.5; arm.auto = false; arm.noGrip = true; snd.tick();
    if (allDone() && !streetDone) { streetDone = true; Toybox.kind(); }
    save();
  }
  function dumpBin() {
    const b = bins[arm.grip];
    b.full = false; arm.dumping = 0.9;
    snd.tumble();
    const p = armPose(arm.s);
    for (let i = 0; i < PER_BIN; i++) {
      const it = newItem(-0.35 + (Math.random() - 0.5) * 0.4, p.z - 0.2 + i * 0.12, i);
      items.push(it);
    }
    save();
  }
  function updateArm(dt) {
    if (arm.grip < 0) arm.target = Math.min(arm.target, 0.2);
    if (arm.wait) arm.target = Math.min(arm.target, 0.82);   // the bin waits while the packer makes room in the hopper
    const d = arm.target - arm.s, step = 0.85 * dt;
    arm.s += clamp(d, -step, step);
    if (Math.abs(d) > 0.003) active = 1.5;
    if (arm.auto && Math.abs(arm.target - arm.s) < 0.002) arm.auto = false;
    arm.gripA = clamp(arm.gripA + (arm.grip >= 0 ? 4 : -4) * dt, 0, 1);
    arm.snap = Math.max(0, arm.snap - dt * 1.5);
    if (arm.s > -0.5) { arm.snapped = false; arm.noGrip = false; }
    if (arm.grip < 0) {
      // reaching the bin: the grabber closes on it; close to a bin, the truck rolls the last bit to line up
      if (arm.s < -0.3 && ph === "street" && !truck.pend && !arm.noGrip) {
        let j = -1, bd = 2.6;
        bins.forEach((b, i) => { const dd = Math.abs(binWX(i) - truck.x); if (dd < bd) { bd = dd; j = i; } });
        if (j >= 0 && bd > 0.02 && Math.abs(truck.target - binWX(j)) > 0.01) goTo(binWX(j), 1.6, null);
      }
      if (arm.s <= -0.9 && !arm.noGrip) {
        const i = binAtArm(0.4);
        if (i >= 0) grip(i);
        else if (arm.s <= -0.99 && !arm.snapped && !driving()) {
          arm.snapped = true; arm.snap = 1; snd.tick();
          coach.say("Drive the truck to the next bin.", 3);
          const n = nextFull(); if (n >= 0) sparkle(binWX(n), 0.8, CURB_E);
          if (!arm.held) arm.glide = 0.8;
        }
      }
    } else {
      const b = bins[arm.grip];
      if (arm.s > -0.3) arm.lifted = true;
      if (b.full && arm.s >= 0.75 && !arm.wait && hopperCount() + PER_BIN > CAP) { arm.wait = true; startPack(false); }
      if (b.full && arm.s >= 0.97 && !arm.wait && arm.dumping <= 0) dumpBin();
      if (!arm.wasFull && arm.s >= 0.97 && !arm.saidEmpty) { arm.saidEmpty = true; const p = armPose(1); dust(truck.x - 0.3, p.z - 0.4, 0.9, 4); coach.say("That bin is empty.", 3); }
      if (arm.dumping > 0) arm.dumping = Math.max(0, arm.dumping - dt);
      if (arm.lifted && arm.s <= -0.97 && !arm.held && arm.dumping <= 0) release();
    }
    if (arm.glide > 0) { arm.glide -= dt; if (arm.glide <= 0 && arm.grip < 0 && !arm.held) { arm.target = 0; arm.auto = true; } }
    // the bins' lids: shut when upright, swinging open (with a bounce) once a bin is upside down
    bins.forEach((b) => {
      const a = b.held ? armPose(arm.s).a : 0, tgt = a > 1.3 ? clamp((a - 1.3) * 2, 0, 2.2) : 0;
      b.lidV += (tgt - b.lid) * 50 * dt; b.lidV *= Math.pow(0.02, dt); b.lid = clamp(b.lid + b.lidV * dt, -0.1, 2.4);
      b.wob = Math.max(0, b.wob - dt * 1.5);
    });
  }
  // A tap on the arm: the arm's next motion (reach out, lift and tip, or put the bin back).
  function armTap() {
    if (ph !== "street" || driving()) { tag("Arm", vpx(truck.x, 2, -0.5)); return; }
    if (arm.grip < 0) { arm.target = arm.s > -0.5 ? -1 : 0; arm.auto = true; return; }
    const b = bins[arm.grip];
    arm.target = b.full || !arm.lifted ? 1 : -1; arm.auto = true;
  }

  // ---------- The packer ----------
  const bladeX = () => lerp(HOP1 - 0.14, HOP0 + 0.2, pk.p);
  function startPack(byHand) {
    if (pk.st === "push" || pk.st === "ret") return false;
    pk.st = "push"; pk.byHand = !!byHand; snd.groan(); return true;
  }
  function transfer() {
    const n = items.length;
    items.length = 0;
    if (n > 0) {
      fill = Math.min(1, fill + n / BODY_ITEMS); bulge = 1; truck.sink = -0.05; snd.crunch();
      for (let i = 0; i < (reduce ? 3 : 8); i++) addFx("crumb", truck.x + HOP0 + Math.random() * 0.4, 2.4 + Math.random() * 0.6, 0.6, (Math.random() - 0.5) * 2, 1 + Math.random(), 1.0, BAGS[i % BAGS.length], 0.07);
      if (fill >= 0.999 && !saidFull) { saidFull = true; coach.say("The truck is full.", 3); }
      else if (!saidPack) { saidPack = true; coach.say("The packer blade squashes the trash.", 3); }
    } else if (pk.byHand) coach.say("The hopper is empty.", 3);
    arm.wait = false;
    save();
  }
  function updatePacker(dt) {
    if (pk.st === "push") { pk.p += dt / 1.9; if (pk.p >= 1) { pk.p = 1; transfer(); pk.st = "ret"; } }
    else if (pk.st === "ret") { pk.p -= dt / 1.3; if (pk.p <= 0) { pk.p = 0; pk.st = "idle"; } }
    if (pk.st !== "idle") active = 1.5;
    const bx = bladeX();
    // the trash falls into the hopper, piles up, and is pushed along by the blade
    const cols = [0, 0, 0, 0, 0, 0], c0 = HOP0 + 0.12, cw = (HOP1 - 0.24 - HOP0) / 6;
    const colOf = (x) => clamp(Math.floor((x - c0) / cw), 0, 5);
    items.forEach((it) => { if (it.set) { const c = colOf(it.x); cols[c] = Math.max(cols[c], it.z + it.sz * 0.35 - FLOOR); } });
    items.forEach((it) => {
      const lim = Math.min(bx - it.sz * 0.45, HOP1 - 0.1 - it.sz / 2), lo = HOP0 + 0.1 + it.sz / 2;
      if (!it.set) {
        it.vz -= 6.5 * dt; it.z += it.vz * dt; it.x = clamp(it.x + it.vx * dt, lo, lim); it.r += it.vr * dt;
        const c = colOf(it.x), floorZ = FLOOR + cols[c] + it.sz * 0.42;
        if (it.z <= floorZ && it.vz < 0) { it.z = floorZ; it.set = true; it.vr = 0; cols[c] += it.sz * 0.7; }
      } else if (it.x > lim) { it.z = Math.min(RIM + 0.15 - it.sz / 2, it.z + (it.x - lim) * 0.6); it.x = lim; }
    });
  }

  // ---------- Unloading at the landfill ----------
  function bodyLen() { return (HOP0 - 0.1) - (BODY0 + 0.14); }
  function dropLoad() {
    // the load leaves the body as one squashed block and breaks up on the pile
    const r = bodyPt(BODY0 + 0.1, FLOOR + 0.6), n = reduce ? 4 : 8;
    for (let i = 0; i < n; i++) chunks.push({ x: truck.x + r[0] - Math.random() * 0.8, z: r[1] + Math.random() * 0.8, vx: -1.2 - Math.random() * 1.6, vz: Math.random() * 0.6, r: Math.random(), vr: (Math.random() - 0.5) * 3, w: 0.5 + Math.random() * 0.4, h: 0.35 + Math.random() * 0.25, amt: fill / n, life: -1 });
    fill = 0; ul.slide = 0; ul.sv = 0; ul.shake = 0.6; ul.lower = 1.0;
    snd.thud(); spookGulls(false);
    save();
  }
  function updateUnload(dt) {
    ul.flash = Math.max(0, ul.flash - dt);
    const tr = ul.held === "gate" ? 2 : 0.8, ttr = ul.held === "body" ? 1.2 : (ul.ttT > ul.tt ? 0.45 : 0.55);
    if (ul.ta !== ul.taT) { ul.ta += clamp(ul.taT - ul.ta, -tr * dt, tr * dt); active = 1.5; }
    if (ul.tt !== ul.ttT) { ul.tt += clamp(ul.ttT - ul.tt, -ttr * dt, ttr * dt); active = 1.5; }
    if (ul.ta > 0.95) ul.tries = 0;
    if (fill > 0 && ul.tt > 0.5 && ul.ta > 0.6) {
      ul.sv += 3.2 * Math.sin(ul.tt * TIP_MAX) * dt; ul.slide += ul.sv * dt;
      if (ul.slide > fill * bodyLen() + 0.4) dropLoad();
    }
    if (ul.shake > 0) ul.shake = Math.max(0, ul.shake - dt);
    if (fill <= 0 && ul.lower > 0 && !ul.held) { ul.lower -= dt; if (ul.lower <= 0) ul.ttT = 0; }
    if (ph === "face" && fill <= 0 && ul.tt < 0.01 && ul.ttT === 0) {
      if (ul.close < 0) ul.close = 0.4;
      ul.close -= dt;
      if (ul.close <= 0 && ul.taT !== 0) ul.taT = 0;
      if (ul.taT === 0 && ul.ta < 0.01) {
        ph = "done"; ul.close = -1; comp.dir = 1; save();
        coach.say("The compactor flattens the trash.", 3.5);
        Toybox.kind();
      }
    }
    // the chunks fall, land on the pile and become part of it
    for (let i = chunks.length - 1; i >= 0; i--) {
      const c = chunks[i], ox = Math.floor(c.x / CYCLE) * CYCLE;
      if (c.life < 0) {
        c.vz -= 9 * dt; c.x += c.vx * dt; c.z += c.vz * dt; c.r += c.vr * dt;
        const hz = heapAt(c.x - ox);
        if (c.z <= hz + c.h / 2) { c.z = hz + c.h / 2; c.life = 0.6; addHeap(c.x - ox, 0.55 + c.amt * 1.4, 0.9); dust(c.x, c.z, 1.2, reduce ? 1 : 2); }
      } else { c.life -= dt; if (c.life <= 0) chunks.splice(i, 1); }
    }
    // the compactor drives over the new pile and back
    if (comp.dir !== 0) {
      const v = 1.5 * comp.dir; comp.x += v * dt; comp.wheel += v * dt;
      [-1.0, -3.6].forEach((wx) => { for (let i = 0; i < HEAP_N; i++) if (Math.abs(HEAP0 + i * HEAP_DX - (comp.x + wx)) < 0.8) heap[i] = lerp(heap[i], Math.min(heap[i], 0.16), Math.min(1, dt * 2.5)); });
      if (comp.dir > 0 && comp.x >= U - 1.8) comp.dir = -1;
      if (comp.dir < 0 && comp.x <= COMP_PARK) { comp.x = COMP_PARK; comp.dir = 0; save(); }
    }
  }
  function tipTap() {
    if (fill <= 0) { tag("Body", vpx(truck.x - 3, 3, 0)); return; }
    if (ul.ta < 0.5 && !twoStep()) return;
    ul.ttT = 1;
  }
  // The tailgate has to be open before the body tips: the first try flashes it and says so, the second opens it.
  function twoStep() {
    if (ul.taT > 0.5) return true;
    ul.tries++;
    if (ul.tries < 2) { ul.flash = 1.6; coach.say("Drag the tailgate up to open it.", 3); snd.tick(); return false; }
    ul.taT = 1; snd.clunk(); return true;
  }
  function gateTap() {
    if (ul.tt > 0.05) { hint(); return; }
    ul.taT = ul.ta > 0.5 ? 0 : 1; snd.clunk();
  }

  // ---------- Small moments ----------
  let kid = null, rac = null;
  function updateMoments(dt) {
    truck.honk = Math.max(0, truck.honk - dt); truck.wave = Math.max(0, truck.wave - dt);
    glow = Math.max(0, glow - dt); bulge = Math.max(0, bulge - dt * 1.3);
    if (active > 0) active -= dt;
    if (kid) { kid.t -= dt; if (kid.t <= 0) kid = null; }
    if (rac) {
      rac.t += dt;
      const b = bins[rac.i];
      b.peek = rac.t < 0.6 ? rac.t / 0.6 * 0.7 : rac.t < 2.6 ? 0.7 : Math.max(0, 0.7 - (rac.t - 2.6) * 2);
      if (rac.t > 6.5) { b.peek = 0; rac = null; }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt;
      if (f.life <= 0) { fx.splice(i, 1); continue; }
      f.x += f.vx * dt; f.z += f.vz * dt; f.vz -= (f.k === "crumb" ? 6 : f.k === "dust" ? -0.2 : 2) * dt;
    }
    pigeons.forEach((p) => {
      p.t += dt; p.ph += dt * (p.st === "sit" ? 2 : 14);
      const hx = truck.x + p.hx, hz = ROOF + truck.sink;
      if (p.st === "in") { p.x = lerp(p.x, hx, Math.min(1, dt * 2)); p.z = lerp(p.z, hz, Math.min(1, dt * 2)); if (Math.abs(p.x - hx) + Math.abs(p.z - hz) < 0.1) { p.st = "sit"; p.t = 0; } }
      else if (p.st === "sit") { p.x = hx; p.z = hz; if (p.t > 4.5 || Math.abs(truck.v) > 0.3 || ul.tt > 0.05) { p.st = "out"; p.t = 0; } }
      else { p.x -= dt * 5; p.z += dt * 3; }
    });
    for (let i = pigeons.length - 1; i >= 0; i--) if (pigeons[i].st === "out" && pigeons[i].t > 4) pigeons.splice(i, 1);
  }
  function drawRaccoon() {
    if (!rac) return;
    const t = rac.t, bx = binWX(rac.i), b = bins[rac.i];
    const top = 0.95 * BS;
    let x = bx + 0.05, z = top, e = CURB_E, show = 1, run = 0;
    if (t < 0.6) { z = top - 0.15 + t / 0.6 * 0.15; show = t / 0.6; }
    else if (t < 2.6) z = top;
    else if (t < 3.2) { const k = (t - 2.6) / 0.6; x = bx + 0.05 + k * 0.9; z = top + Math.sin(k * PI) * 0.6 - k * top; e = lerp(CURB_E, -3.0, k); run = 1; }
    else { x = bx + 0.95 + (t - 3.2) * 2.6; z = 0; e = -3.0; run = 1; }
    const q = Q(x, z, e), look = t > 0.6 && t < 2.6 ? Math.sin(t * 3) * 0.06 : 0, leg = run ? Math.sin(t * 22) * 0.06 : 0;
    ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(1.7, 1.7);
    if (!run) { ctx.beginPath(); ctx.rect(-0.6, -0.05, 1.2, 1.2); ctx.clip(); }
    if (run) {
      // body, striped tail, legs
      ctx.save(); ctx.translate(-0.42, 0.28); ctx.rotate(0.5);
      for (let i = 0; i < 4; i++) rbox(-0.06, i * 0.1, 0.13, 0.11, 0.05, i % 2 ? "#3A3F4E" : "#9BA1AB", 0.6);
      ctx.restore();
      line(-0.18, 0.1, -0.2 - leg, 0, INK, 0.07); line(0.18, 0.1, 0.2 + leg, 0, INK, 0.07);
      ctx.beginPath(); ctx.ellipse(0, 0.24, 0.3, 0.16, 0, 0, TAU); ctx.fillStyle = "#8A8F99"; ctx.fill(); stroke(0.7);
    }
    ctx.globalAlpha = show;
    const hx = run ? 0.32 : look, hz = run ? 0.38 : 0.12;
    shape([hx - 0.15, hz + 0.1, hx - 0.12, hz + 0.24, hx - 0.04, hz + 0.12], "#6E737E", 0.6);
    shape([hx + 0.15, hz + 0.1, hx + 0.12, hz + 0.24, hx + 0.04, hz + 0.12], "#6E737E", 0.6);
    disc(hx, hz, 0.16, "#9BA1AB", 0.7);
    rbox(hx - 0.14, hz - 0.02, 0.28, 0.08, 0.04, "#3A3F4E", 0);   // the mask
    disc(hx - 0.06, hz + 0.02, 0.025, "#FFFFFF", 0); disc(hx + 0.06, hz + 0.02, 0.025, "#FFFFFF", 0);
    disc(hx, hz - 0.08, 0.06, "#E8E6E0", 0); disc(hx, hz - 0.07, 0.02, INK, 0);
    ctx.restore();
    if (b) b.wob = Math.max(b.wob, t > 2.6 && t < 3 ? 0.6 : 0);
  }
  function drawFx() {
    fx.forEach((f) => {
      const q = Q(f.x, f.z, f.e), a = clamp(f.life / f.max, 0, 1);
      ctx.save(); ctx.globalAlpha = f.k === "dust" ? a * 0.7 : a;
      if (f.k === "spark") { const r = f.r * (1 + (1 - a)); shape([q[0], q[1] + r, q[0] + r * 0.3, q[1] + r * 0.3, q[0] + r, q[1], q[0] + r * 0.3, q[1] - r * 0.3, q[0], q[1] - r, q[0] - r * 0.3, q[1] - r * 0.3, q[0] - r, q[1], q[0] - r * 0.3, q[1] + r * 0.3], f.c, 0.6); }
      else if (f.k === "dust") disc(q[0], q[1], f.r * (1.6 - a * 0.6), f.c, 0);
      else box(q[0] - f.r, q[1] - f.r, f.r * 2, f.r * 2, f.c, 0.5);
      ctx.restore();
    });
    chunks.forEach((c) => {
      const q = Q(c.x, c.z, 1.2);
      ctx.save(); ctx.globalAlpha = c.life < 0 ? 1 : clamp(c.life / 0.6, 0, 1);
      ctx.translate(q[0], q[1]); ctx.rotate(c.r); rbox(-c.w / 2, -c.h / 2, c.w, c.h, 0.08, pattern(), 0.8);
      ctx.restore();
    });
  }

  // =====================================================================================================
  // Coach, ring and ghost hand
  // =====================================================================================================
  const coach = Toybox.coach($("coach"));
  function tag(name, p) { Toybox.nametag(name, p.x, p.y - 20, 2200); snd.tick(); }
  const LINES = {
    reach: "Drag the arm down to the bin.",
    lift: "Drag the arm up to lift the bin.",
    down: "Drag the arm down to put the bin back.",
    pack: "Tap the packer blade to pack the trash.",
    drive: "Drive the truck to the next bin.",
    landfill: "Drive the truck to the landfill.",
    gate: "Drag the tailgate up to open it.",
    tip: "Drag the body up to tip out the trash.",
    next: "Drive the truck to the next street."
  };
  // Screen points (canvas px) of the parts the coach names.
  function partPt(part) {
    if (part === "arm") { const p = armPose(arm.s); return cpx(truck.x, p.z, p.e); }
    if (part === "packer") return cpx(truck.x + bladeX(), (FLOOR + RIM) / 2 + 0.2, 0.6);
    if (part === "cab") return cpx(truck.x + FRONT - 1.0, 1.8, 0);
    if (part === "gate") { const g = gatePt(BODY0 - 0.3, ROOF - 1.9); return cpx(truck.x + g[0], g[1], 0); }
    if (part === "body") { const g = bodyPt(HOP0 - 0.7, ROOF - 0.5); return cpx(truck.x + g[0], g[1], 0); }
    return null;
  }
  // What he should do next: the coach's line, the part to ring and the ghost hand's move. null while the truck is
  // busy with something he started (driving, a tapped motion, the packer, the body coming down).
  function want() {
    if (locked()) return null;
    if (ph === "street") {
      if (driving() && !drag) return null;
      if (arm.dumping > 0 || arm.wait) return null;
      if (arm.grip >= 0) {
        if (arm.auto && !arm.held) return null;
        const b = bins[arm.grip];
        if (b.full || !arm.lifted) return { k: "lift", part: "arm", to: () => cpx(truck.x, armPose(1).z, armPose(1).e) };
        return { k: "down", part: "arm", to: () => cpx(truck.x, Z_GRAB, CURB_E) };
      }
      if (!arm.held && (arm.auto || arm.glide > 0 || Math.abs(arm.s) > 0.03)) return null;
      if (pk.st === "push" || pk.st === "ret") return null;
      if (hopperCount() >= CAP || (allDone() && hopperCount() > 0) || pk.st === "drag") return { k: "pack", part: "packer", to: () => cpx(truck.x + HOP0 + 0.2, (FLOOR + RIM) / 2 + 0.2, 0.6) };
      const i = nextFull();
      if (i >= 0) {
        if (Math.abs(binWX(i) - truck.x) < 0.4 || arm.held) return { k: "reach", part: "arm", to: () => cpx(truck.x, Z_GRAB, CURB_E) };
        return { k: "drive", part: "cab", to: () => cpx(Math.min(binWX(i), truck.x + W * 0.35 / cam.S) + FRONT - 1.0, 1.8, 0) };
      }
      return { k: "landfill", part: "cab", to: () => cpx(truck.x + FRONT - 1.0 + W * 0.3 / cam.S, 1.8, 0) };
    }
    if (ph === "face") {
      if (fill <= 0 || ul.shake > 0) return null;
      if (ul.ta < 0.85 && ul.tt < 0.05) {
        if (ul.taT > 0.5 && !ul.held) return null;
        return { k: "gate", part: "gate", to: () => { const h = cpx(truck.x + BODY0, ROOF, 0), p = partPt("gate"); return [h[0] - (p[1] - h[1]) * 0.9, h[1] - 10]; } };
      }
      if (ul.ttT > 0.5 && !ul.held) return null;
      return { k: "tip", part: "body", to: () => { const p = partPt("body"); return [p[0] - 0.3 * cam.S, p[1] - 3 * cam.S]; } };
    }
    if (ph === "done") {
      if (driving()) return null;
      return { k: "next", part: "cab", to: () => cpx(truck.x + FRONT - 1.0 + W * 0.3 / cam.S, 1.8, 0) };
    }
    return null;
  }
  let cur = null, shownK = null;
  function hint() { glow = 2.5; ghost.poke(); }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      const w = want(); if (!w) return null;
      const b = cv.getBoundingClientRect(), a = partPt(w.part), t = w.to();
      if (!a) return null;
      const p0 = [b.left + a[0], b.top + a[1]];
      if (w.k === "pack" || !ghost.shown(w.k)) return { pts: [p0], tap: true, key: w.k };
      return { pts: [p0, [b.left + t[0], b.top + t[1]]], key: w.k, dur: 2600 };
    }
  });
  // He did it himself: the ghost hand never shows that move again.
  const learned = (k) => ghost.learned(k);
  function drawRing() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const p = cur && !(drag && drag.k !== "tap") ? partPt(cur.part) : null;
    // A new instruction keeps clear of the ringed part.
    if (p) { const b = cv.getBoundingClientRect(); coach.avoid(b.left + p[0], b.top + p[1]); } else coach.avoid();
    if (!p) return;
    const k = 0.5 + 0.5 * Math.sin(time * 4), rad = Math.max(24, Math.min(36, cam.S * 0.9)) + k * 7;
    ctx.save(); ctx.globalAlpha = glow > 0 ? 0.95 : 0.55 + 0.25 * k;
    ctx.beginPath(); ctx.arc(p[0], p[1], rad, 0, TAU); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = "#FFC93C"; ctx.stroke();
    ctx.restore();
  }
  function updateCoach() {
    cur = want();
    const k = cur ? cur.k : null;
    if (k === shownK) return;
    shownK = k;
    if (cur) coach.step(LINES[k]); else coach.busy();
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  // Bounding box (canvas px) of world points [x, z, e], grown by pad.
  function bb(pts, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach((p) => { const c = cpx(p[0], p[1], p[2]); x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); });
    return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
  }
  const inB = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
  function truckBox(x0, x1, z0, z1, body) {
    const pts = [];
    [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach((c) => { const p = body ? bodyPt(c[0], c[1]) : c; pts.push([truck.x + p[0], p[1], 0], [truck.x + p[0], p[1], TW]); });
    return bb(pts, 4);
  }
  function hitAt(vx, vy) {
    const r = cv.getBoundingClientRect(), x = vx - r.left, y = vy - r.top;
    // The nearest of the small parts wins; the part the coach names has a bigger reach.
    let best = null, bd = 1;
    [["arm", 44], ["packer", 34], ["cab", 0], ["gate", 0], ["body", 0]].forEach((c) => {
      const p = partPt(c[0]), r = cur && cur.part === c[0] ? 58 : c[1];
      if (!p || !r) return;
      const d = Math.hypot(x - p[0], y - p[1]) / r;
      if (d < bd) { bd = d; best = c[0]; }
    });
    if (best) return best;
    if (distSeg(x, y, partPt("arm"), cpx(truck.x, 1.25, -0.2)) < 20) return "arm";
    const gp = [[BODY0 + 0.02, ROOF], [BODY0 - 0.66, ROOF - 0.7], [BODY0 - 0.6, 1.0], [BODY0 + 0.02, 1.0]].map((c) => { const g = gatePt(c[0], c[1]); return [truck.x + g[0], g[1], 0]; });
    if (inB(bb(gp, 6), x, y)) return "gate";
    if (inB(truckBox(HOP0, HOP1, 1.0, RIM, false), x, y)) return "hopper";
    if (inB(truckBox(BODY0, HOP0, 0.9, ROOF, true), x, y)) return "body";
    if (inB(truckBox(CAB0, FRONT, 0, CABTOP, false), x, y) || inB(truckBox(REAR, FRONT, 0, 1.05, false), x, y)) return "cab";
    for (let i = 0; i < bins.length; i++) if (!bins[i].held && inB(bb([[binWX(i) - 0.5 * BS, 0, CURB_E], [binWX(i) + 0.5 * BS, 1.2 * BS, CURB_E]], 8), x, y)) return "bin:" + i;
    const ox = Math.floor(cam.x / CYCLE) * CYCLE;
    if (inB(bb([[ox + comp.x - 4.6, compZ(), 0.5], [ox + comp.x + 0.5, compZ() + 3.4, 0.5]], 4), x, y)) return "comp";
    for (let k = Math.floor(cam.x / CYCLE) - 1; k <= Math.floor(cam.x / CYCLE) + 1; k++) {
      const hs = houses(k);
      for (let i = 0; i < hs.length; i++) {
        const h = hs[i], kx = k * CYCLE;
        if (inB(bb([[kx + h.x0, 0, 10], [kx + h.x0 + h.w, h.h + 2, 10]], 0), x, y)) return { house: h };
        if (inB(bb([[kx + h.tree.x - 1.2, 0, 9.6], [kx + h.tree.x + 1.2, h.tree.h, 9.6]], 0), x, y)) return { tree: h.tree };
      }
    }
    return null;
  }
  function distSeg(x, y, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1);
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  }
  // the arm's path on screen, searched near where the finger last had it, so a drag never jumps across the curve
  function armFromFinger(x, y) {
    const N = 120, i0 = Math.round((arm.target + 1) / 2 * N);
    let best = arm.s, bd = Infinity;
    for (let j = Math.max(0, i0 - 30); j <= Math.min(N, i0 + 30); j++) {
      const s = -1 + 2 * j / N, p = armPose(s), c = cpx(truck.x, p.z, p.e), d = Math.hypot(c[0] - x, c[1] - y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function canDrive() { return (ph === "street" && arm.grip < 0 && !truck.pend) || (ph === "done" && !driving()); }
  let drag = null;
  const local = (s) => { const r = cv.getBoundingClientRect(); return [s.x - r.left, s.y - r.top]; };
  Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitAt(x, y) || null,
    dragStart: (part, e, s) => {
      drag = null;
      if (locked() || typeof part !== "string") return;
      if (part === "arm" && ph === "street" && !truck.pend && Math.abs(truck.v) < 0.2) { drag = { k: "arm", moved: 0, s0: arm.s }; arm.held = true; arm.auto = false; arm.glide = 0; return; }
      if (part === "packer" && pk.st === "idle") { drag = { k: "pack" }; pk.st = "drag"; return; }
      if (part === "gate" && ph === "face") { drag = { k: "gate" }; ul.held = "gate"; return; }
      if (part === "body" && ph === "face") { if (ul.ta < 0.5 && !twoStep()) return; drag = { k: "body" }; ul.held = "body"; return; }
      if (part === "arm" || part === "hopper" || part === "body" || part === "cab" || part === "gate") {
        if (!canDrive()) { hint(); return; }
        const p = local(s);
        let hi;
        if (ph === "street") { const i = nextFull(); hi = i >= 0 ? binWX(i) + 0.3 : lfX() + FWD; }
        else hi = segX() + CYCLE + BIN_X[0];
        drag = { k: "drive", off: wxAt(p[0], 0) - truck.x, x0: truck.x, lo: truck.x - 3, hi: hi };
        if (Math.abs(arm.s) > 0.02) { arm.target = 0; arm.auto = true; }
      }
    },
    move: (part, e, s) => {
      if (!drag || locked()) return;
      const p = local(s);
      if (drag.k === "arm") { arm.target = armFromFinger(p[0], p[1]); drag.moved = Math.max(drag.moved, Math.abs(arm.target - drag.s0)); }
      else if (drag.k === "pack") {
        const a = cpx(truck.x + HOP1 - 0.14, 2, 0.6)[0], b = cpx(truck.x + HOP0 + 0.2, 2, 0.6)[0];
        pk.p = Math.max(pk.p, clamp((p[0] - a) / (b - a), 0, 1)); active = 1.5;
      } else if (drag.k === "gate") {
        const h = cpx(truck.x + bodyPt(BODY0, ROOF)[0], bodyPt(BODY0, ROOF)[1], 0), a = Math.atan2(-(p[0] - h[0]), p[1] - h[1]);
        ul.taT = clamp(a / 1.75, 0, 1);
      } else if (drag.k === "body") {
        const pv = cpx(truck.x + PIV[0], PIV[1], 0), r0 = cpx(truck.x + HOP0 - 0.7, ROOF - 0.5, 0);
        const a0 = Math.atan2(-(r0[1] - pv[1]), r0[0] - pv[0]), a1 = Math.atan2(-(p[1] - pv[1]), p[0] - pv[0]);
        ul.ttT = clamp((a1 - a0) / TIP_MAX, 0, 1);
      } else if (drag.k === "drive" && Math.abs(arm.s) < 0.03) {
        truck.target = clamp(wxAt(p[0], 0) - drag.off, drag.lo, drag.hi); truck.vmax = 8; truck.arrive = null;
      }
    },
    up: () => {
      const d = drag; drag = null;
      if (!d) return;
      if (d.k === "arm") {
        arm.held = false;
        if (d.moved > 0.25 && cur) learned(cur.k);
        // The arm carries on to where the finger left it and holds there (a held bin never drops). Let go near the
        // curb with a lifted bin, it sets the bin down; let go out at the curb with nothing grabbed, it folds back in.
        if (arm.grip >= 0) { if (arm.lifted && arm.target < -0.8) { arm.target = -1; arm.auto = true; } else if (bins[arm.grip].full && arm.target > 0.85) { arm.target = 1; arm.auto = true; } }
        else if (arm.target < -0.05) arm.glide = 1.2;
      } else if (d.k === "pack") {
        if (pk.p > 0.5) { pk.st = "push"; pk.byHand = true; snd.groan(); learned("pack"); } else pk.st = "ret";
      } else if (d.k === "gate") {
        ul.held = "";
        if (ul.taT > 0.5) { ul.taT = 1; learned("gate"); snd.clunk(); }
      } else if (d.k === "body") {
        ul.held = "";
        if (ul.ttT > 0.3) learned("tip");
        if (fill <= 0) ul.lower = 0.5;
      } else if (d.k === "drive") {
        if (Math.abs(truck.x - d.x0) > 1) learned(ph === "done" ? "next" : allDone() ? "landfill" : "drive");
        if (ph === "street") {
          const i = nextFull();
          // a drag toward the next bin sets the truck going: it drives on to the bin when he lets go
          if (i >= 0) { if (truck.target > d.x0 + 1 || Math.abs(binWX(i) - truck.target) < 4) goTo(binWX(i), 7, brake); else goTo(truck.target, 8, null); }
          else if (truck.target > d.x0 + 1) goLandfill();
          else goTo(truck.target, 8, null);
        } else if (ph === "done") { if (truck.target > d.x0 + 1) goStreet(); else goTo(d.x0, 3, null); }
      }
    },
    tap: (part) => {
      if (locked()) return;
      if (part && typeof part === "object") {
        if (part.house) { const h = part.house, i = Math.floor(Math.random() * (h.two ? 4 : 2)); h.lit[i] = h.lit[i] ? 0 : 1; snd.tick(); return; }
        if (part.tree) { part.tree.shake = 1; snd.tick(); return; }
      }
      const wantK = cur ? cur.k : null;
      if (part === "arm") { if (ph === "street") { armTap(); if (cur) learned(cur.k); } else tag("Arm", vpx(truck.x, 2, -0.5)); return; }
      if (part === "packer" || part === "hopper") {
        if (part === "hopper" && (wantK === "drive" || wantK === "landfill" || wantK === "next")) { driveTap(); return; }
        if (startPack(true)) learned("pack"); else hint();
        if (part === "hopper") tag("Hopper", vpx(truck.x, RIM + 0.4, 1.2));
        return;
      }
      if (part === "gate") { if (ph === "face") { gateTap(); learned("gate"); } else tag("Tailgate", vpx(truck.x + BODY0 - 0.3, 2.5, 0)); return; }
      if (part === "body") {
        if (ph === "face") { tipTap(); learned("tip"); return; }
        if (canDrive()) { driveTap(); return; }
        tag("Body", vpx(truck.x - 3, ROOF, 0)); return;
      }
      if (part === "cab") {
        if (canDrive()) { driveTap(); return; }
        truck.wave = 2.2; tag("Cab", vpx(truck.x + FRONT - 1, CABTOP, 0)); return;
      }
      if (typeof part === "string" && part.indexOf("bin:") === 0) {
        const i = +part.slice(4);
        if (bins[i].full && i === nextFull() && wantK === "drive") { driveTap(); return; }
        bins[i].wob = 1; tag("Bin", vpx(binWX(i), 1.3, CURB_E)); return;
      }
      if (part === "comp") { if (comp.dir === 0) comp.dir = 1; tag("Compactor", vpx(Math.floor(cam.x / CYCLE) * CYCLE + comp.x - 2, 3.6, 0.5)); return; }
      hint();
    }
  });
  function driveTap() { if (canDrive() && driveNext()) { if (cur) learned(cur.k); } else hint(); }

  // =====================================================================================================
  // Surprise (a fun moment on the scene, taking turns)
  // =====================================================================================================
  let spTurn = 0;
  function surprise() {
    if (locked()) return;
    const lx = cam.x - Math.floor(cam.x / CYCLE) * CYCLE, atLf = lx > LF0 - 8 && lx < LF1 + 4;
    const list = atLf ? ["gulls", "honk"] : ph === "street" ? ["honk", "raccoon", "pigeons"] : ["honk", "pigeons"];
    const k = list[spTurn++ % list.length];
    if (k === "gulls") { spookGulls(true); return; }
    if (k === "raccoon") {
      // a bin he can see, an emptied one first (if he grabs its bin, the raccoon hops out before it goes up)
      const xa = cam.x - W / 2 / cam.S + 1, xb = cam.x + W / 2 / cam.S - 1;
      const vis = bins.map((b, i) => i).filter((i) => !bins[i].held && binWX(i) > xa && binWX(i) < xb);
      const pick = vis.filter((i) => !bins[i].full)[0];
      const i = pick !== undefined ? pick : vis[vis.length - 1];
      if (i !== undefined && !rac) { rac = { i: i, t: 0 }; snd.tick(); return; }
    }
    if (k === "pigeons" && !pigeons.length && Math.abs(truck.v) < 0.3 && ul.tt < 0.05) {
      for (let i = 0; i < 4; i++) pigeons.push({ hx: -4.8 + i * 1.0 + hash(i, spTurn) * 0.3, x: truck.x + 6 + i * 1.5, z: 9 + i, st: "in", t: 0, ph: i });
      return;
    }
    truck.honk = 1.3; truck.wave = 2.6; snd.horn();
    if (ph === "street") {
      const hs = houses(seg).filter((h) => Math.abs(segX() + h.x0 + h.w / 2 - 10 * KX - truck.x) < 9);
      if (hs.length) kid = { hs: hs[0], t: 3.5 };
    }
  }
  Toybox.bar($("bottom"), { onNew: startOver, onSurprise: surprise });
  // New: a new street of full bins, the truck empty at the first bin. The landfill pile stays.
  function startOver() {
    if (locked()) return;
    seg++;
    bins.forEach((b, i) => Object.assign(b, newBin(i, true)));
    items.length = 0; fill = 0; streetDone = false; rac = null; kid = null; pigeons.length = 0;
    Object.assign(arm, { s: 0, target: 0, auto: false, held: false, grip: -1, gripA: 0, glide: 0, dumping: 0, wait: false });
    Object.assign(pk, { p: 0, st: "idle" });
    Object.assign(ul, { ta: 0, taT: 0, tt: 0, ttT: 0, slide: 0, sv: 0, tries: 0, lower: -1, close: -1 });
    ph = "street"; drag = null;
    Object.assign(truck, { x: segX() + BIN_X[0], target: segX() + BIN_X[0], v: 0, arrive: null, pend: null });
    snapCam = true; shownK = "?"; save();
  }

  // =====================================================================================================
  // Camera and loop
  // =====================================================================================================
  function resize() {
    W = Math.max(1, cv.clientWidth); H = Math.max(1, cv.clientHeight);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    LW = clamp(Math.min(W, H) / 170, 1.6, 3);
    snapCam = true;
  }
  function camera(dt) {
    // how much to show: the whole truck (with the bin up high), wider at the landfill for the tip and the compactor
    const atFace = (ph === "face" || ph === "back" || ph === "done") && Math.abs(truck.x - (lfX() + UNLOAD)) < 3;
    const ex = truckExtents();
    let vw = 11.9, vh = 9.2, lo = -2.7, fx = truck.x - 1.3, l = ex.l, r = ex.r;
    if (atFace) { l = Math.min(l, truck.x + REAR - 4); lo = -2.0; }                           // and where the load lands
    if (atFace && comp.dir !== 0) l = Math.min(l, lfX() + comp.x - 5);                        // and the compactor
    vw = Math.max(vw, r - l + 0.4); vh = Math.max(vh, ex.top - lo + 0.4);
    if (atFace) fx = (l + r) / 2;
    fx += clamp(truck.v * 0.3, -3, 3);
    const S = Math.min(W / vw, H / vh), k = snapCam || reduce ? 1 : 1 - Math.exp(-3 * dt);
    cam.S += (S - cam.S) * k;
    cam.x += (fx - cam.x) * k;
    // the whole truck stays on screen, at every size and every moment (the zoom may still be catching up)
    const half = W / 2 / cam.S;
    if (ex.r - ex.l < 2 * half) cam.x = clamp(cam.x, ex.r - half, ex.l + half);
    const extra = Math.max(0, H / cam.S - vh), y0 = lo - Math.min(extra * 0.2, 1.1);
    cam.y0 += (y0 - cam.y0) * k;
    snapCam = false;
  }
  // The truck's reach on screen (world x of its left and right ends, projected height of its top) in its pose now:
  // the open tailgate and the tipped body stick out behind and above it.
  function truckExtents() {
    let l = REAR - TW * KX - 0.3, top = 6.4;
    if (ul.ta > 0.01 || ul.tt > 0.01) {
      [[BODY0 - 0.66, ROOF - 1.7], [BODY0 - 0.54, ROOF - 2.42], [BODY0 + 0.02, ROOF - 2.42], [BODY0, ROOF]].forEach((c) => { l = Math.min(l, gatePt(c[0], c[1])[0] - TW * KX - 0.3); });
      top = Math.max(top, bodyPt(HOP0, ROOF)[1] + TW * KY + 0.4);
    }
    return { l: truck.x + l, r: truck.x + FRONT + 1.0, top: top };
  }
  function update(dt) {
    time += dt;
    updateTruck(dt);
    updateArm(dt);
    updatePacker(dt);
    updateUnload(dt);
    updateGulls(dt);
    updateMoments(dt);
    houses(seg).forEach((h) => { h.tree.shake = Math.max(0, h.tree.shake - dt * 1.5); });
    updateCoach();
    camera(dt);
    if (endDone && settled()) { const f = endDone; endDone = null; f(); }
  }
  function draw() {
    drawBackdrop();
    world();
    const ox = Math.floor(cam.x / CYCLE) * CYCLE;
    if (cam.x - ox > LF0 - 25 && cam.x - ox < LF1 + 25) {
      gulls.forEach((g) => { if (g.st === "home") drawBird(ox + g.x, g.z, g.e, false, "#F4F6F8", g.ph); });
      drawHeap(ox);
      drawCompactor(ox);
      gulls.forEach((g) => { if (g.st === "roof") drawBird(ox + g.x, g.z, g.e, false, "#F4F6F8", g.ph); });
    }
    drawTruck();
    pigeons.forEach((p) => drawBird(p.x, p.z, 1.2, p.st !== "sit", "#9AA4B2", p.ph));
    bins.forEach((b, i) => {
      if (b.held) return;
      const q = Q(binWX(i), 0, CURB_E);
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(b.askew + Math.sin(b.wob * 14) * 0.08 * b.wob); drawBin(b); ctx.restore();
    });
    drawRaccoon();
    drawArm();
    drawSign(ox);
    if (cam.x - ox > LF0 - 25 && cam.x - ox < LF1 + 25) gulls.forEach((g) => { if (g.st === "fly" || g.st === "land") drawBird(ox + g.x, g.z, g.e, true, "#F4F6F8", g.ph); });
    drawFx();
    drawRing();
  }
  function settled() { return arm.grip < 0 && Math.abs(arm.s) < 0.02 && ul.tt < 0.01 && Math.abs(truck.v) < 0.05 && (pk.st === "idle" || pk.st === "drag"); }
  let last = 0;
  function loop(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    if (Toybox.timer.phase() !== "resting") { update(dt); draw(); }
    requestAnimationFrame(loop);
  }

  // =====================================================================================================
  // Timer, start and debug hook
  // =====================================================================================================
  function onEnding(done) {
    ending = true; endDone = done; drag = null; arm.held = false; ul.held = "";
    // a held bin is set back down and the arm folds in; a tipped body comes down and the tailgate shuts
    if (arm.grip >= 0) { arm.lifted = true; arm.target = -1; arm.auto = true; } else { arm.target = 0; arm.auto = true; }
    arm.wait = false; ul.ttT = 0; ul.taT = 0; truck.hold = true; pigeons.forEach((p) => { p.st = "out"; p.t = 0; });
  }
  function onWake() { ending = false; endDone = null; truck.hold = false; shownK = "?"; }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 320 240" aria-hidden="true">' +
      '<rect width="320" height="240" fill="#2B3A67"/><circle cx="262" cy="50" r="22" fill="#FFF4C2"/><circle cx="252" cy="44" r="20" fill="#2B3A67"/>' +
      '<circle cx="60" cy="40" r="2" fill="#FFF"/><circle cx="120" cy="26" r="1.6" fill="#FFF"/><circle cx="190" cy="60" r="1.8" fill="#FFF"/>' +
      '<rect y="186" width="320" height="54" fill="#3C4660"/><rect y="182" width="320" height="6" fill="#56607A"/>' +
      '<path d="M18 182V120l44-32 44 32v62z" fill="#5A6890" stroke="#1D2340" stroke-width="3" stroke-linejoin="round"/><rect x="34" y="132" width="20" height="18" fill="#FFE58A" stroke="#1D2340" stroke-width="2.5"/>' +
      '<g stroke="#1D2340" stroke-width="3" stroke-linejoin="round"><rect x="124" y="118" width="110" height="56" rx="5" fill="#2A7A47"/><rect x="138" y="128" width="30" height="34" fill="#1E5A35"/>' +
      '<path d="M234 136h22v-18h22l14 22v34h-58z" fill="#D5DCE6"/><path d="M262 124h12l10 16h-22z" fill="#7A93B8"/><rect x="118" y="120" width="10" height="52" fill="#1E5A35"/></g>' +
      '<circle cx="150" cy="178" r="13" fill="#2A2C36" stroke="#1D2340" stroke-width="3"/><circle cx="176" cy="178" r="13" fill="#2A2C36" stroke="#1D2340" stroke-width="3"/><circle cx="266" cy="178" r="13" fill="#2A2C36" stroke="#1D2340" stroke-width="3"/>' +
      '<path d="M260 118a6 6 0 0 1 12 0z" fill="#8A6A3A" stroke="#1D2340" stroke-width="2"/>' +
      '<text x="250" y="100" fill="#FFFFFF" font-family="Baloo 2, sans-serif" font-weight="800" font-size="18">z</text><text x="264" y="86" fill="#FFFFFF" font-family="Baloo 2, sans-serif" font-weight="800" font-size="22">z</text><text x="280" y="70" fill="#FFFFFF" font-family="Baloo 2, sans-serif" font-weight="800" font-size="26">z</text>' +
      "</svg>";
  }

  // ---------- Start ----------
  if (ph === "street") { const i = nextFull(); truck.x = segX() + BIN_X[i >= 0 ? i : BIN_X.length - 1]; }
  else truck.x = lfX() + UNLOAD;
  truck.target = truck.x;
  restoreItems(ph === "street" ? Math.floor(num(saved.hop, 0)) : 0);
  streetDone = allDone();
  if (startFresh) save();
  resize();
  camera(0);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
  window.addEventListener("pagehide", save);

  Toybox.init({
    app: "garbage-truck",
    badge: $("tbadge"),
    timerIntro: "When time is up, the truck puts the bin down, folds its arm and parks.",
    goodbyeOption: "End with a “Honk goodbye” button to press",
    farewellText: "Time to say goodbye to the truck",
    goodbyeLabel: "Honk goodbye",
    farewellDone: "Bye bye, truck!",
    restLine: "The garbage truck is resting.",
    restLine2: "It will be right here next time.",
    restArt: restArt,
    soundNote: "Soft hydraulic, packer and horn sounds. Hold for 2 seconds.",
    onEnding: onEnding,
    onGoodbye: () => { truck.honk = 1.3; truck.wave = 2.6; snd.horn(); },
    onRest: () => { ending = true; },
    onWake: onWake,
    onSound: (on) => { if (on) snd.chime(); }
  });
  requestAnimationFrame(loop);

  if (/[?&]debug\b/.test(location.search)) {
    // Test hook: read the state, find parts on screen, and play them through the real input handlers.
    const pt = (id) => {
      let p = null;
      if (id === "bin") { const i = nextFull(); p = cpx(binWX(i < 0 ? 0 : i), Z_GRAB, CURB_E); }
      else if (id === "top") p = cpx(truck.x, armPose(1).z, armPose(1).e);
      else if (id === "curb") p = cpx(truck.x, Z_GRAB, CURB_E);
      else if (id === "right") p = cpx(truck.x + FRONT - 1.0 + W * 0.4 / cam.S, 1.8, 0);
      else if (id === "gateUp") { const h = cpx(truck.x + BODY0, ROOF, 0), g = partPt("gate"); p = [h[0] - (g[1] - h[1]), h[1]]; }
      else if (id === "bodyUp") { const g = partPt("body"); p = [g[0] - 0.4 * cam.S, g[1] - 3.2 * cam.S]; }
      else p = partPt(id);
      if (!p) return null;
      const b = cv.getBoundingClientRect();
      return { x: b.left + p[0], y: b.top + p[1] };
    };
    const fire = (type, p) => cv.dispatchEvent(new PointerEvent(type, { clientX: p.x, clientY: p.y, pointerId: 77, pointerType: "mouse", isPrimary: true, bubbles: true, button: 0, buttons: type === "pointerup" ? 0 : 1 }));
    window.__truck = {
      state: () => ({ ph: ph, s: +arm.s.toFixed(3), grip: arm.grip, full: bins.map((b) => b.full), hopper: items.length, fill: +fill.toFixed(3), ta: +ul.ta.toFixed(2), tt: +ul.tt.toFixed(2), x: +(truck.x - segX()).toFixed(2), seg: seg, pk: pk.st, comp: comp.dir, coach: coach.text(), want: cur ? cur.k : null }),
      pt: pt,
      tap: (id) => { const p = pt(id); if (!p) return false; fire("pointerdown", p); fire("pointerup", p); return true; },
      // a finger drag from one part to another place, in steps over ms
      drag: (from, to, ms) => new Promise((done) => {
        const a = pt(from), b = pt(to); if (!a || !b) { done(false); return; }
        const n = 24, dt = (ms || 900) / n; let i = 0;
        fire("pointerdown", a);
        const step = () => {
          i++; const t = i / n, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          fire("pointermove", p);
          if (i < n) setTimeout(step, dt); else setTimeout(() => { fire("pointerup", p); done(true); }, 500);
        };
        setTimeout(step, dt);
      }),
      surprise: surprise,
      ghost: () => ghost.show()
    };
  }
})();
