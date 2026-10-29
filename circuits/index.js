(function () {
  "use strict";
  // Circuits: chunky electric parts on a board, like a snap-together circuit kit. Two jobs:
  //   Board: drag parts from the tray onto the snap points; every part spans two neighboring points. When a loop
  //          closes, dots run along the wires and the bulb glows, the fan spins, the buzzer buzzes.
  //   House: a cutaway house at night with a battery or a hand crank in the basement and four loops in the walls,
  //          each with a gap. He drags a wire, switch or push button into a gap, then uses it.
  // Both jobs share one solver (a small nodal analysis), so series dimming, parallel brightness, the one-way LED
  // and short circuits come from the electricity, not from special cases.
  // The board is 4 x 4 snap points on phones and 6 x 6 on tablets, picked once from the screen's short side so
  // turning the device never changes it.
  //
  // Sections:
  //   Setup and saved state
  //   Solver
  //   Sound
  //   Layout
  //   Running the circuit
  //   Drawing parts
  //   Drawing the board
  //   Drawing the house
  //   The tray
  //   Surprise moments
  //   Placing and using parts
  //   Input
  //   Coach, ghost hand and tabs
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const TAU = Math.PI * 2;
  const INK = "#1D2340";
  const now = () => performance.now();
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const NAMES = { battery: "Battery", crank: "Hand crank", wire: "Wire", switch: "Switch", button: "Push button",
    bulb: "Bulb", led: "LED", motor: "Motor", buzzer: "Buzzer" };
  // Tray labels are shorter where the real name doesn't fit a slot.
  const LABELS = Object.assign({}, NAMES, { crank: "Crank", button: "Button" });
  const TRAY = {
    board: ["battery", "crank", "wire", "switch", "button", "bulb", "led", "motor", "buzzer"],
    house: ["wire", "switch", "button", "battery", "crank"]
  };
  const LOADS = ["bulb", "led", "motor", "buzzer"];
  const SOURCES = ["battery", "crank"];
  const CONDUCTORS = ["wire", "switch", "button"];
  const LED_COLORS = ["#FF4D4D", "#4CD964", "#3D8BFF", "#FFE14D", "#A66BFF", "#FF6FC8"];
  const RAINBOW = ["#FF4D4D", "#FF9A2E", "#FFE14D", "#4CD964", "#3D8BFF", "#A66BFF"];

  const N = Math.min(innerWidth, innerHeight) < 600 ? 4 : 6;
  // Board spots: every pair of neighboring snap points in grid units; a is the left or top point, b the other.
  const BOARD_SPOTS = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N - 1; x++) BOARD_SPOTS.push({ a: y * N + x, b: y * N + x + 1, u1: [x, y], u2: [x + 1, y] });
  for (let x = 0; x < N; x++) for (let y = 0; y < N - 1; y++) BOARD_SPOTS.push({ a: y * N + x, b: (y + 1) * N + x, u1: [x, y], u2: [x, y + 1] });
  const boardSpot = (x1, y1, x2, y2) => BOARD_SPOTS.findIndex((s) =>
    (s.u1[0] === x1 && s.u1[1] === y1 && s.u2[0] === x2 && s.u2[1] === y2) || (s.u1[0] === x2 && s.u1[1] === y2 && s.u2[0] === x1 && s.u2[1] === y1));

  // House nodes: 0 is the minus side of the power, 1 the plus side, 2 to 5 sit between each gap and its light or
  // machine. Coordinates are fractions of the house square; u1 is the a end of a spot, u2 the b end.
  const HOUSE_SPOTS = [
    { a: 0, b: 1, u1: [0.40, 0.86], u2: [0.60, 0.86], kinds: SOURCES },
    { a: 2, b: 0, u1: [0.36, 0.48], u2: [0.20, 0.48], kinds: CONDUCTORS },
    { a: 1, b: 3, u1: [0.655, 0.705], u2: [0.655, 0.57], kinds: CONDUCTORS },
    { a: 1, b: 4, u1: [0.89, 0.28], u2: [0.73, 0.28], kinds: CONDUCTORS },
    { a: 1, b: 5, u1: [0.46, 0.36], u2: [0.30, 0.36], kinds: CONDUCTORS }
  ];
  // The house's fixed lights and machines, in the order the coach walks through them. at is the drawing's center.
  const HOUSE_LOADS = [
    { id: "porch", t: "bulb", a: 1, b: 2, gap: 1, part: "wire", name: "Porch light", at: [0.77, 0.51] },
    { id: "bell", t: "buzzer", a: 3, b: 0, gap: 2, part: "button", name: "Doorbell", at: [0.50, 0.56] },
    { id: "fan", t: "motor", a: 4, b: 0, gap: 3, part: "switch", name: "Ceiling fan", at: [0.72, 0.175] },
    { id: "lamp", t: "bulb", a: 5, b: 0, gap: 4, part: "switch", name: "Lamp", at: [0.24, 0.29] }
  ];
  HOUSE_LOADS.forEach((L) => Object.assign(L, { cur: 0, r: 0, spin: 0, ph: 0, used: false }));
  // The wires in the house walls, each drawn from its plus end towards its minus end. of() names whose current
  // flows in it: "src" for the power's own wires, otherwise a load id.
  const HOUSE_WIRES = [
    { of: "src", pts: [[0.60, 0.86], [0.91, 0.86], [0.91, 0.28]] },
    { of: "src", pts: [[0.72, 0.14], [0.09, 0.14], [0.09, 0.86], [0.40, 0.86]] },
    { of: "porch", pts: [[0.91, 0.48], [0.80, 0.48]] },
    { of: "porch", pts: [[0.74, 0.48], [0.36, 0.48]] },
    { of: "porch", pts: [[0.20, 0.48], [0.09, 0.48]] },
    { of: "bell", pts: [[0.91, 0.74], [0.655, 0.74], [0.655, 0.705]] },
    { of: "bell", pts: [[0.655, 0.57], [0.655, 0.56], [0.53, 0.56]] },
    { of: "bell", pts: [[0.47, 0.56], [0.09, 0.56]] },
    { of: "fan", pts: [[0.91, 0.28], [0.89, 0.28]] },
    { of: "fan", pts: [[0.73, 0.28], [0.72, 0.28], [0.72, 0.19]] },
    { of: "fan", pts: [[0.72, 0.16], [0.72, 0.14]] },
    { of: "lamp", pts: [[0.91, 0.36], [0.46, 0.36]] },
    { of: "lamp", pts: [[0.30, 0.36], [0.27, 0.36]] },
    { of: "lamp", pts: [[0.21, 0.36], [0.09, 0.36]] }
  ];
  const SPOTS = { board: BOARD_SPOTS, house: HOUSE_SPOTS };

  let nextId = 1;
  function mk(t, s, f, extra) {
    return Object.assign({ id: nextId++, t, s, f: !!f, on: false, c: 0, lev: 0, held: false, until: 0, spd: 0, ang: 0,
      pump: 0, tapTurn: 0, cur: 0, r: 0, spin: 0, ph: 0, born: now(), hot: false }, extra || {});
  }
  // The starting board: a battery, a bulb and wires in a loop with one gap in the bottom row.
  function startBoard() {
    const x0 = Math.floor((N - 4) / 2), y0 = Math.floor((N - 2) / 2);
    const gap = boardSpot(x0 + 1, y0 + 1, x0 + 2, y0 + 1);
    return {
      parts: [
        // The battery's plus end is at the top, so current runs left to right along the top row.
        mk("battery", boardSpot(x0, y0, x0, y0 + 1), true),
        mk("bulb", boardSpot(x0 + 1, y0, x0 + 2, y0)),
        mk("wire", boardSpot(x0, y0, x0 + 1, y0)), mk("wire", boardSpot(x0 + 2, y0, x0 + 3, y0)),
        mk("wire", boardSpot(x0 + 3, y0, x0 + 3, y0 + 1)), mk("wire", boardSpot(x0 + 2, y0 + 1, x0 + 3, y0 + 1)),
        mk("wire", boardSpot(x0, y0 + 1, x0 + 1, y0 + 1))
      ],
      gap
    };
  }
  const START_GAP = startBoard().gap;
  const startHouse = () => [mk("battery", 0)];

  const KEY = "circuits-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (Toybox.fresh() || typeof saved !== "object" || Array.isArray(saved) || saved.n !== N) saved = {};

  // Saved parts are checked one by one: a bad entry is dropped, never the whole board.
  function loadParts(list, jb) {
    const out = [], taken = new Set();
    (Array.isArray(list) ? list : []).forEach((o) => {
      if (!o || !NAMES[o.t] || !Number.isInteger(o.s) || !SPOTS[jb][o.s] || taken.has(o.s)) return;
      const kinds = SPOTS[jb][o.s].kinds;
      if (kinds && !kinds.includes(o.t)) return;
      taken.add(o.s);
      out.push(mk(o.t, o.s, jb === "board" && o.f, { on: !!o.on, lev: o.on ? 1 : 0, c: Number.isInteger(o.c) ? Math.abs(o.c) % LED_COLORS.length : 0 }));
    });
    return out;
  }
  const parts = {
    board: saved.board ? loadParts(saved.board, "board") : startBoard().parts,
    house: saved.house ? loadParts(saved.house, "house") : startHouse()
  };
  if (!parts.house.some((q) => q.s === 0)) parts.house.push(mk("battery", 0));
  if (Array.isArray(saved.used)) HOUSE_LOADS.forEach((L, i) => { L.used = !!saved.used[i]; });
  let job = saved.job === "house" ? "house" : "board";
  let ledNext = Number.isInteger(saved.ledNext) ? Math.abs(saved.ledNext) % LED_COLORS.length : 0;

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    const out = (q) => ({ t: q.t, s: q.s, f: q.f ? 1 : 0, on: q.on ? 1 : 0, c: q.c });
    try {
      localStorage.setItem(KEY, JSON.stringify({ n: N, job, ledNext, board: parts.board.map(out), house: parts.house.map(out),
        used: HOUSE_LOADS.map((L) => (L.used ? 1 : 0)) }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }

  // =====================================================================================================
  // Solver
  // =====================================================================================================
  // Every snap point is a node and every part joins two nodes. Wires and closed switches are a tiny resistance;
  // bulbs, the motor and the buzzer a fixed one; a source is a push (its emf) behind a small internal resistance,
  // written as a current source beside a conductance so plain nodal analysis is enough. The LED conducts only
  // forwards: it is solved as on or off and solved again until no LED disagrees with its own voltage. Every node
  // also leaks a tiny conductance to ground, so loose parts never leave the equations without an answer.
  // Units are arbitrary: one battery pushes 1 and one bulb resists 1.
  const R_WIRE = 0.0005, R_LOAD = 1, R_SRC = 0.05, G_OFF = 1e-9, G_LEAK = 1e-6;
  // The current of one bulb on one battery through a few wires: "full glow".
  const I_FULL = 1 / (R_LOAD + R_SRC + 6 * R_WIRE);
  const ON = 0.05;
  // el: [{ a, b, k: "wire" | "open" | "load" | "led" | "src", emf }]. Returns the node voltages, the current from
  // a to b through each element, and for each source whether its ends are joined by wires alone (a short circuit:
  // the voltage between its ends collapses).
  function solve(n, el) {
    const ledOn = el.map(() => true);
    let v = new Float64Array(n), g = [];
    for (let pass = 0; pass < 12; pass++) {
      const A = Array.from({ length: n }, () => new Float64Array(n)), z = new Float64Array(n);
      for (let i = 0; i < n; i++) A[i][i] = G_LEAK;
      g = el.map((e, i) => (e.k === "wire" ? 1 / R_WIRE : e.k === "load" ? 1 / R_LOAD : e.k === "src" ? 1 / R_SRC :
        e.k === "led" && ledOn[i] ? 1 / R_LOAD : G_OFF));
      el.forEach((e, i) => {
        if (e.a === e.b) return;
        const G = g[i];
        A[e.a][e.a] += G; A[e.b][e.b] += G; A[e.a][e.b] -= G; A[e.b][e.a] -= G;
        if (e.k === "src") { z[e.b] += e.emf * G; z[e.a] -= e.emf * G; }
      });
      v = gauss(A, z);
      let changed = false;
      el.forEach((e, i) => {
        if (e.k !== "led") return;
        const fwd = v[e.a] - v[e.b];
        if (ledOn[i] && fwd < 0) { ledOn[i] = false; changed = true; } else if (!ledOn[i] && fwd > 1e-6) { ledOn[i] = true; changed = true; }
      });
      if (!changed) break;
    }
    const cur = el.map((e, i) => (e.k === "src" ? g[i] * (e.emf - (v[e.b] - v[e.a])) : g[i] * (v[e.a] - v[e.b])));
    const short = el.map((e) => e.k === "src" && e.emf > 0.02 && v[e.b] - v[e.a] < 0.35 * e.emf);
    return { v, cur, short };
  }
  // Gaussian elimination with partial pivoting; A and z are overwritten.
  function gauss(A, z) {
    const n = z.length;
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      [z[c], z[piv]] = [z[piv], z[c]];
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / A[c][c];
        if (!f) continue;
        for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
        z[r] -= f * z[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) {
      let s = z[r];
      for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
      x[r] = s / A[r][r];
    }
    return x;
  }
  // Checks the solver against the behaviors the app relies on. Run from tests with ?debug.
  function selfTest() {
    const src = (a, b, emf) => ({ a, b, k: "src", emf: emf == null ? 1 : emf });
    const w = (a, b) => ({ a, b, k: "wire" }), load = (a, b) => ({ a, b, k: "load" });
    const one = solve(4, [src(0, 1), w(1, 2), load(2, 3), w(3, 0)]);
    const series = solve(5, [src(0, 1), w(1, 2), load(2, 3), load(3, 4), w(4, 0)]).cur[2];
    const par = solve(4, [src(0, 1), w(1, 2), load(2, 3), load(2, 3), w(3, 0)]).cur;
    const ledF = solve(4, [src(0, 1), w(1, 2), { a: 2, b: 3, k: "led" }, w(3, 0)]).cur[2];
    const ledR = solve(4, [src(0, 1), w(1, 2), { a: 3, b: 2, k: "led" }, w(3, 0)]).cur[2];
    const sh = solve(3, [src(0, 1), w(1, 2), w(2, 0)]).short[0];
    const open = solve(4, [src(0, 1), { a: 1, b: 2, k: "open" }, load(2, 3), w(3, 0)]).cur[2];
    const still = solve(4, [src(0, 1, 0), w(1, 2), load(2, 3), w(3, 0)]).cur[2];
    const I1 = one.cur[2];
    const checks = [
      ["one bulb lights", I1 / I_FULL > 0.9],
      ["two bulbs in series are dimmer than one", series < 0.6 * I1 && series > 0.3 * I1],
      ["two bulbs in parallel each glow like one", par[2] > 0.85 * I1 && par[3] > 0.85 * I1],
      ["a forward LED lights", ledF / I_FULL > 0.9],
      ["a reversed LED is dark", Math.abs(ledR) < 1e-4],
      ["a wire-only loop is a short", sh === true],
      ["a bulb loop is not a short", one.short[0] === false],
      ["an open switch stops the current", Math.abs(open) < 1e-4],
      ["a crank at rest makes nothing", Math.abs(still) < 1e-6]
    ].map(([name, ok]) => ({ name, ok }));
    return { ok: checks.every((c) => c.ok), checks };
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
  function noise(dur, freq, gain) {
    const a = Toybox.sound.ready(); if (!a) return;
    if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  const snd = {
    snap() { noise(0.05, 2400, 0.08); tone(900, 600, 0.08, "triangle", 0.03); },
    lift() { tone(500, 700, 0.1, "sine", 0.03); },
    out() { tone(600, 260, 0.18, "sine", 0.035); },
    click() { noise(0.04, 3000, 0.07); },
    flip() { tone(500, 900, 0.18, "sine", 0.035); },
    tick() { noise(0.02, 4000, 0.025); },
    glow() { tone(660, 660, 0.3, "sine", 0.04); tone(990, 990, 0.4, "sine", 0.03, 0.12); },
    wipe() { tone(700, 300, 0.5, "sine", 0.035); },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); }
  };
  // Steady voices for the buzzer and the motor: created once sound is ready, their loudness follows the current.
  const voices = {};
  function voice(name, type, freq, level) {
    const a = Toybox.sound.ready();
    let v = voices[name];
    if (!a) { if (v) { try { v.o.stop(); } catch (e) { /* ignore */ } delete voices[name]; } return; }
    if (!v) {
      if (level < 0.002) return;
      const o = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
      o.type = type; f.type = "lowpass"; f.frequency.value = 1100; g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(a.destination); o.start();
      v = voices[name] = { o, g };
    }
    v.o.frequency.setTargetAtTime(freq, a.currentTime, 0.08);
    v.g.gain.setTargetAtTime(level, a.currentTime, 0.06);
  }

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  let W = 0, H = 0, dpr = 1;
  // The board square (bx, by, bs) holds the snap grid with pitch p, or the house; both jobs use the same square
  // and the same tray box, so switching tabs never moves anything.
  let bx = 0, by = 0, bs = 0, p = 0;
  let tray = { x: 0, y: 0, w: 0, h: 0, cols: 9, rows: 1 };
  const SLOT_MIN = N === 4 ? 70 : 96, SLOT_MAX = N === 4 ? 96 : 128, M = 8, GAP = 12;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    // Try the tray under the board (9 x 1 or 5 x 2) and beside it (2 x 5, 3 x 3 or 5 x 2). Keep the shape that
    // leaves the biggest board, with slots no smaller than SLOT_MIN unless no shape fits that.
    // On a tall stage the bottom band stays free for the coach line, which drops there after his first touch.
    const band = H > 500 ? 70 : 0;
    const aw = W - 2 * M, ah = H - 2 * M - band;
    let best = null;
    [[9, 1, "under"], [5, 2, "under"], [2, 5, "beside"], [3, 3, "beside"], [5, 2, "beside"]].forEach(([cols, rows, side]) => {
      const fit = side === "under" ? aw / cols : ah / rows;
      const room = side === "under" ? (ah - GAP - aw) / rows : (aw - GAP - ah) / cols;
      const slot = Math.min(fit, SLOT_MAX, Math.max(SLOT_MIN, room));
      const board = side === "under" ? Math.min(aw, ah - GAP - slot * rows) : Math.min(ah, aw - GAP - slot * cols);
      const score = board - (slot < SLOT_MIN ? 1e4 : 0);
      if (!best || score > best.score) best = { cols, rows, side, slot, board, score };
    });
    bs = Math.max(40, best.board);
    tray = { cols: best.cols, rows: best.rows, w: best.slot * best.cols, h: best.slot * best.rows };
    if (best.side === "beside") {
      bx = (W - bs - GAP - tray.w) / 2; by = (H - band - bs) / 2;
      tray.x = bx + bs + GAP; tray.y = (H - band - tray.h) / 2;
    } else {
      bx = (W - bs) / 2; by = (H - band - bs - GAP - tray.h) / 2;
      tray.x = (W - tray.w) / 2; tray.y = by + bs + GAP;
    }
    p = bs / N;
  }
  // A spot's two ends in stage px: [x1, y1, x2, y2] with (x1, y1) at its a end.
  function spotXY(s, jb) {
    const sp = SPOTS[jb || job][s];
    if ((jb || job) === "board") return [bx + (sp.u1[0] + 0.5) * p, by + (sp.u1[1] + 0.5) * p, bx + (sp.u2[0] + 0.5) * p, by + (sp.u2[1] + 0.5) * p];
    return [bx + sp.u1[0] * bs, by + sp.u1[1] * bs, bx + sp.u2[0] * bs, by + sp.u2[1] * bs];
  }
  // A part's ends in drawing order: from its first end (a battery's minus, the LED's way in) to its second.
  function partXY(q) {
    const e = spotXY(q.s);
    return q.f ? [e[2], e[3], e[0], e[1]] : e;
  }
  const mid = (e) => [(e[0] + e[2]) / 2, (e[1] + e[3]) / 2];
  const hx = (u) => bx + u * bs, hy = (v) => by + v * bs;
  function vp(x, y) { const r = cv.getBoundingClientRect(); return [r.left + x, r.top + y]; }

  // =====================================================================================================
  // Running the circuit
  // =====================================================================================================
  // power is 1 while playing and fades to 0 when play time is up.
  let power = 1, powerTo = 1;
  let shortSrc = null, volts = new Float64Array(1);
  const cur = () => parts[job];
  const partOn = (s) => cur().find((q) => q.s === s);
  // The element a part becomes in the solver. ideal: switches closed, buttons held and cranks turning, to ask
  // what the circuit could do once he uses it.
  function elOf(q, ideal) {
    const sp = SPOTS[job][q.s], a = q.f ? sp.b : sp.a, b = q.f ? sp.a : sp.b;
    switch (q.t) {
      case "battery": return { a, b, k: "src", emf: power };
      case "crank": return { a, b, k: "src", emf: (ideal ? 1 : q.spd) * power };
      case "wire": return { a, b, k: "wire" };
      case "switch": return { a, b, k: q.on || ideal ? "wire" : "open" };
      case "button": return { a, b, k: q.held || ideal ? "wire" : "open" };
      case "led": return { a, b, k: "led" };
      default: return { a, b, k: "load" };
    }
  }
  // Solves the current job. extra: parts to add for a trial; change(q) may return a different element for q.
  function run(opts) {
    const o = opts || {}, list = cur().concat(o.extra || []), who = [], el = [];
    list.forEach((q) => { const e = o.change && o.change(q); el.push(e || elOf(q, o.ideal)); who.push(q); });
    if (job === "house") HOUSE_LOADS.forEach((L) => { el.push({ a: L.a, b: L.b, k: "load" }); who.push(L); });
    return { who, res: solve(job === "board" ? N * N : 6, el) };
  }
  const isLoad = (q) => LOADS.includes(q.t);
  function working(o) {
    const { who, res } = run(o);
    return who.filter((q, i) => isLoad(q) && Math.abs(res.cur[i]) / I_FULL > ON).length;
  }
  function analyze() {
    const { who, res } = run();
    shortSrc = null;
    volts = res.v;
    who.forEach((q, i) => { q.cur = res.cur[i]; q.r = Math.abs(res.cur[i]) / I_FULL; if (res.short[i]) shortSrc = q; });
    who.forEach((q) => { q.hot = !!shortSrc && CONDUCTORS.includes(q.t) && q.r > 2; });
  }
  // How bright a light looks for a current: dimmer than linear, so two bulbs in a row look clearly dimmer.
  const lum = (r) => Math.pow(Math.min(1, r), 1.6) * power;
  function reversedLed(q) {
    if (q.t !== "led") return false;
    const sp = SPOTS[job][q.s], a = q.f ? sp.b : sp.a, b = q.f ? sp.a : sp.b;
    return volts[b] - volts[a] > 0.1;
  }

  let lastWorking = 0, lastAction = -1e9;
  function update(dt, t) {
    if (powerTo !== power) power += Math.sign(powerTo - power) * Math.min(Math.abs(powerTo - power), dt / 2);
    cur().forEach((q) => {
      if (q.t === "crank") {
        // A tap turns the crank once; a drag adds its own turning to pump. Faster turning gives more push.
        if (q.tapTurn > 0) { const d = Math.min(q.tapTurn, dt * TAU / 1.2); q.tapTurn -= d; q.ang += d; q.pump += d; }
        const want = Math.min(1, q.pump / Math.max(dt, 1e-3) / (TAU / 1.4));
        q.pump = 0;
        q.spd += (want - q.spd) * Math.min(1, dt * (want > q.spd ? 8 : 1.6));
        if (locked()) q.spd = Math.max(0, q.spd - dt);
        const tick = Math.floor(q.ang / (TAU / 8));
        if (tick !== q.lastTick) { q.lastTick = tick; snd.tick(); }
      }
      if (q.t === "switch") q.lev += ((q.on ? 1 : 0) - q.lev) * Math.min(1, dt * 10);
      if (q.t === "button" && q.until && t > q.until && !q.finger) { q.until = 0; q.held = false; }
    });
    analyze();
    let buzz = 0, hum = 0, n = 0;
    const all = job === "house" ? cur().concat(HOUSE_LOADS) : cur();
    all.forEach((q) => {
      const r = Math.min(1.5, q.r) * power;
      if (q.t === "motor") { q.spin += dt * r * 10; hum = Math.max(hum, r); }
      if (q.t === "buzzer" && r > ON) buzz = Math.max(buzz, r);
      if (CONDUCTORS.includes(q.t) || q.t === "battery" || q.t === "crank") q.ph += dt * Math.sign(q.cur) * Math.min(3, q.r) * 0.9 * power;
      if (isLoad(q) && q.r > ON) n++;
      if (job === "house" && q.gap && q.r > 0.3 && !q.used) { q.used = true; saveSoon(); }
    });
    HOUSE_LOADS.forEach((L) => { L.ph += dt * Math.min(3, L.r) * 0.9 * power; });
    voice("buzz", "square", 190 + buzz * 40, buzz * 0.02);
    voice("hum", "triangle", 70 + hum * 70, hum * 0.025);
    // Something new lit up after his own action: a chime, and sometimes kind words.
    if (n > lastWorking && t - lastAction < 2500) {
      snd.glow();
      if (lastWorking === 0) Toybox.kind();
    }
    lastWorking = n;
  }

  // =====================================================================================================
  // Drawing parts
  // =====================================================================================================
  function rgb(hex) { const v = parseInt(hex.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
  function mix(hex, to, t) { const a = rgb(hex), b = rgb(to); return "rgb(" + a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",") + ")"; }
  function rgba(hex, al) { return "rgba(" + rgb(hex).join(",") + "," + al + ")"; }
  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(x, y, r, fill, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  // Moves the drawing frame onto a part lying from (x1, y1) to (x2, y2): x runs along it, its length is returned.
  function frame(x1, y1, x2, y2) {
    ctx.translate(x1, y1); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
    return Math.hypot(x2 - x1, y2 - y1);
  }
  const BASE = { wire: "#3D8BFF", battery: "#3A4060", crank: "#6B7594", switch: "#E8EDF4", button: "#E8EDF4",
    bulb: "#E8EDF4", led: "#E8EDF4", motor: "#6B7594", buzzer: "#6B7594" };
  // One part in its frame: the plastic block between its two snaps, then its own picture.
  function drawPart(q, x1, y1, x2, y2, t) {
    ctx.save();
    const L = frame(x1, y1, x2, y2), h = L * 0.2, lw = Math.max(2, L * 0.028), c = L / 2;
    const age = (t - q.born) / 260, sc = !reduce && age >= 0 && age < 1 ? 1 + 0.15 * (1 - age) * (1 - age) : 1;
    if (sc !== 1) { ctx.translate(c, 0); ctx.scale(sc, sc); ctx.translate(-c, 0); }
    if (q.t === "buzzer" && q.r > ON && !reduce) ctx.translate(Math.sin(t * 0.09) * h * 0.08 * Math.min(1, q.r), Math.cos(t * 0.13) * h * 0.06);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    roundRect(-h, -h, L + 2 * h, 2 * h, h);
    ctx.fillStyle = BASE[q.t]; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    const metal = (x0, x1b, w) => { ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x1b, 0); ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = w - lw; ctx.strokeStyle = "#D9E2EC"; ctx.stroke(); };
    switch (q.t) {
      case "wire": {
        metal(0, L, h * 0.6);
        if (q.hot) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.lineWidth = h * 0.4; ctx.strokeStyle = "#FF8A2E"; ctx.stroke(); }
        break;
      }
      case "battery": {
        const g = ctx.createLinearGradient(0, -h, 0, h);
        g.addColorStop(0, "#FFE08A"); g.addColorStop(0.5, "#FFC93C"); g.addColorStop(1, "#E89B1A");
        roundRect(L * 0.12, -h * 0.85, L * 0.74, h * 1.7, h * 0.35); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        roundRect(L * 0.12, -h * 0.85, L * 0.2, h * 1.7, h * 0.35); ctx.fillStyle = "#2A2F45"; ctx.fill(); ctx.stroke();
        roundRect(L * 0.86, -h * 0.38, L * 0.06, h * 0.76, h * 0.12); ctx.fillStyle = "#C9D3E0"; ctx.fill(); ctx.stroke();
        // A minus in the dark band and a plus near the nub: symbols, not values.
        ctx.lineWidth = Math.max(2.5, h * 0.2); ctx.lineCap = "round";
        ctx.strokeStyle = "#FFFFFF"; ctx.beginPath(); ctx.moveTo(L * 0.18, 0); ctx.lineTo(L * 0.26, 0); ctx.stroke();
        ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(L * 0.66, 0); ctx.lineTo(L * 0.78, 0); ctx.moveTo(L * 0.72, -L * 0.06); ctx.lineTo(L * 0.72, L * 0.06); ctx.stroke();
        break;
      }
      case "crank": {
        const R = h * 1.25;
        circle(c, 0, R, "#C9D3E0", lw);
        ctx.save(); ctx.translate(c, 0); ctx.rotate(q.ang);
        ctx.lineWidth = Math.max(2, h * 0.16); ctx.strokeStyle = "#7A859E";
        for (let k = 0; k < 3; k++) { const a = k * TAU / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85); ctx.stroke(); }
        circle(0, 0, R * 0.2, "#7A859E", lw);
        circle(R * 0.68, 0, R * 0.3, "#FF4D4D", lw);
        ctx.restore();
        break;
      }
      case "switch": {
        roundRect(L * 0.14, -h * 0.35, L * 0.14, h * 0.7, h * 0.15); ctx.fillStyle = "#7A859E"; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        roundRect(L * 0.72, -h * 0.35, L * 0.14, h * 0.7, h * 0.15); ctx.fill(); ctx.stroke();
        // The lever pivots on the first contact; open, it is lifted off the second.
        const ang = -(1 - q.lev) * 0.6, len = L * 0.6;
        ctx.save(); ctx.translate(L * 0.21, 0); ctx.rotate(ang);
        roundRect(0, -h * 0.16, len, h * 0.32, h * 0.16); ctx.fillStyle = "#C9D3E0"; ctx.fill(); ctx.stroke();
        roundRect(len - h * 0.15, -h * 0.42, h * 0.7, h * 0.84, h * 0.3); ctx.fillStyle = "#FF7A1F"; ctx.fill(); ctx.stroke();
        ctx.restore();
        circle(L * 0.21, 0, h * 0.18, "#4A5578", lw * 0.7);
        break;
      }
      case "button": {
        circle(c, 0, h * 1.02, "#3A4060", lw);
        circle(c, q.held ? h * 0.06 : 0, q.held ? h * 0.64 : h * 0.78, q.held ? "#D93636" : "#FF4D4D", lw);
        if (!q.held) { ctx.beginPath(); ctx.ellipse(c - h * 0.22, -h * 0.28, h * 0.28, h * 0.14, -0.5, 0, TAU); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill(); }
        break;
      }
      case "bulb": {
        const g = lum(q.r);
        circle(c, 0, h * 1.02, "#9AA5B8", lw);
        circle(c, 0, h * 0.8, mix("#EEF3F8", "#FFF2A6", g), lw * 0.8);
        if (g > 0.05) circle(c, 0, h * 0.45 * g + h * 0.2, "rgba(255,255,255," + g + ")");
        ctx.beginPath(); ctx.moveTo(c - h * 0.38, h * 0.1);
        for (let k = 0; k < 4; k++) ctx.lineTo(c - h * 0.28 + k * h * 0.19, k % 2 ? h * 0.1 : -h * 0.16);
        ctx.lineTo(c + h * 0.38, h * 0.1);
        ctx.lineWidth = Math.max(1.5, h * 0.09); ctx.strokeStyle = g > 0.05 ? mix("#FF9A2E", "#FFFFFF", g * 0.4) : "#7A6A50"; ctx.stroke();
        break;
      }
      case "led": {
        const col = LED_COLORS[q.c], g = lum(q.r);
        circle(c - L * 0.08, 0, h * 0.78, g > 0.03 ? mix(col, "#FFFFFF", 0.35 * g) : mix(col, "#2A2E38", 0.6), lw);
        ctx.beginPath(); ctx.ellipse(c - L * 0.08 - h * 0.22, -h * 0.28, h * 0.26, h * 0.13, -0.5, 0, TAU);
        ctx.fillStyle = "rgba(255,255,255," + (0.35 + 0.4 * g) + ")"; ctx.fill();
        // The diode mark points the way the current may go.
        const ax = L * 0.7, s = h * 0.42;
        ctx.beginPath(); ctx.moveTo(ax - s * 0.7, -s); ctx.lineTo(ax + s * 0.6, 0); ctx.lineTo(ax - s * 0.7, s); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill();
        ctx.beginPath(); ctx.moveTo(ax + s * 0.75, -s); ctx.lineTo(ax + s * 0.75, s); ctx.lineWidth = Math.max(2, s * 0.35); ctx.strokeStyle = INK; ctx.stroke();
        break;
      }
      case "motor": {
        circle(c, 0, h * 1.02, "#C9D3E0", lw);
        ctx.save(); ctx.translate(c, 0); ctx.rotate(q.spin);
        for (let k = 0; k < 3; k++) {
          ctx.rotate(TAU / 3);
          ctx.beginPath(); ctx.ellipse(h * 0.85, 0, h * 0.8, h * 0.34, 0, 0, TAU);
          ctx.fillStyle = "#FF9A2E"; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = INK; ctx.stroke();
        }
        ctx.restore();
        circle(c, 0, h * 0.3, "#4A5578", lw * 0.8);
        break;
      }
      case "buzzer": {
        circle(c, 0, h * 1.02, "#22263A", lw);
        circle(c, 0, h * 0.7, null, 0); ctx.lineWidth = Math.max(1.5, h * 0.08); ctx.strokeStyle = "#4A5578"; ctx.stroke();
        circle(c, 0, h * 0.18, "#0E1020");
        if (q.r > ON) {
          // Rings spread out from the buzzer while it buzzes.
          for (let k = 0; k < 3; k++) {
            const u = ((t / 700 + k / 3) % 1), R = h * (1.1 + u * 1.6);
            ctx.beginPath(); ctx.arc(c, 0, R, 0, TAU);
            ctx.lineWidth = Math.max(2, h * 0.14); ctx.strokeStyle = "rgba(255,225,77," + (1 - u) * Math.min(1, q.r) * power + ")"; ctx.stroke();
          }
        }
        break;
      }
    }
    // Snap studs at both ends.
    [0, L].forEach((x) => { circle(x, 0, h * 0.42, "#D9E2EC", lw * 0.8); circle(x, 0, h * 0.16, "#7A859E"); });
    ctx.restore();
  }
  // Light added under the parts: halos round lit bulbs and LEDs, and the orange of a short circuit's wires.
  function drawGlow(q, x1, y1, x2, y2, t) {
    let col = null, g = 0;
    if (q.t === "bulb") { col = "#FFE58A"; g = lum(q.r); } else if (q.t === "led") { col = LED_COLORS[q.c]; g = lum(q.r); } else if (q.hot) { col = "#FF8A2E"; g = 0.8; }
    const tw = twinkleAt(q, t);
    if (tw) { col = tw; g = Math.max(g, 0.8); }
    if (!col || g < 0.03) return;
    ctx.save();
    const L = frame(x1, y1, x2, y2), h = L * 0.2;
    if (q.hot) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.lineWidth = h * 2.2; ctx.strokeStyle = rgba(col, 0.35); ctx.stroke();
    } else {
      const cx = q.t === "led" ? L / 2 - L * 0.08 : L / 2, R = h * (1.3 + 3 * g);
      const gr = ctx.createRadialGradient(cx, 0, h * 0.5, cx, 0, R);
      gr.addColorStop(0, rgba(col, 0.85 * g)); gr.addColorStop(0.5, rgba(col, 0.3 * g)); gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr; ctx.fillRect(cx - R, -R, 2 * R, 2 * R);
      if (q.t === "bulb" && !tw) {
        ctx.lineWidth = Math.max(2, h * 0.14); ctx.strokeStyle = rgba(col, g); ctx.lineCap = "round";
        for (let k = 0; k < 8; k++) {
          const a = k * TAU / 8 + 0.2, r0 = h * 1.25, r1 = h * (1.4 + 1.1 * g);
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  // Glowing dots running along a stretch of wire, gap px apart; off (px) moves them along, r is the current.
  function drawDots(x1, y1, x2, y2, off, r, size, hot, gap) {
    if (r < ON) return;
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return;
    ctx.fillStyle = hot ? "#FFB066" : "#FFF4B8";
    ctx.globalAlpha = Math.min(1, 0.4 + r * 0.6) * power;
    for (let d = ((off % gap) + gap) % gap; d < len; d += gap) {
      ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * d / len, y1 + (y2 - y1) * d / len, size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function partDots(q, e) {
    if (!(CONDUCTORS.includes(q.t) && (q.t === "wire" || (q.t === "switch" && q.on) || (q.t === "button" && q.held)))) return;
    const L = Math.hypot(e[2] - e[0], e[3] - e[1]);
    drawDots(e[0], e[1], e[2], e[3], q.ph * L, q.r, L * 0.06, q.hot, L / 2);
  }

  // =====================================================================================================
  // Drawing the board
  // =====================================================================================================
  let hint = null;
  function drawRing(e, t) {
    // A yellow pulsing ring round a spot or part: where the coach line points.
    ctx.save();
    const L = frame(e[0], e[1], e[2], e[3]), h = L * 0.2, pulse = reduce ? 0 : Math.sin(t / 260) * 0.5 + 0.5;
    roundRect(-h * 1.9, -h * 2, L + h * 3.8, h * 4, h * 2);
    ctx.lineWidth = 4 + pulse * 3; ctx.strokeStyle = "rgba(255,201,60," + (0.65 + pulse * 0.35) + ")"; ctx.setLineDash([]); ctx.stroke();
    ctx.restore();
  }
  function drawEmptySpot(e) {
    ctx.save();
    const L = frame(e[0], e[1], e[2], e[3]), h = L * 0.2;
    roundRect(-h, -h, L + 2 * h, 2 * h, h);
    ctx.setLineDash([h * 0.5, h * 0.4]); ctx.lineWidth = Math.max(2, L * 0.03); ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.stroke();
    ctx.setLineDash([]);
    [0, L].forEach((x) => { circle(x, 0, h * 0.42, "#D9E2EC", 2); circle(x, 0, h * 0.16, "#7A859E"); });
    ctx.restore();
  }
  function drawBoard(t) {
    roundRect(bx, by, bs, bs, bs * 0.05);
    ctx.fillStyle = "#2A3560"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    // Faint lines between the snap points, so the grid reads as a pegboard.
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 2;
    for (let i = 0; i < N; i++) {
      ctx.beginPath(); ctx.moveTo(bx + p * 0.5, by + (i + 0.5) * p); ctx.lineTo(bx + bs - p * 0.5, by + (i + 0.5) * p);
      ctx.moveTo(bx + (i + 0.5) * p, by + p * 0.5); ctx.lineTo(bx + (i + 0.5) * p, by + bs - p * 0.5); ctx.stroke();
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      circle(bx + (x + 0.5) * p, by + (y + 0.5) * p, p * 0.09, "#5B6894");
      circle(bx + (x + 0.5) * p, by + (y + 0.5) * p, p * 0.04, "#1B2347");
    }
    if (hint && hint.spot != null && !partOn(hint.spot)) drawEmptySpot(spotXY(hint.spot));
    drawParts(t);
  }
  function drawParts(t) {
    const list = cur();
    ctx.globalCompositeOperation = "lighter";
    list.forEach((q) => { const e = partXY(q); drawGlow(q, e[0], e[1], e[2], e[3], t); });
    ctx.globalCompositeOperation = "source-over";
    list.forEach((q) => { const e = partXY(q); drawPart(q, e[0], e[1], e[2], e[3], t); });
    ctx.globalCompositeOperation = "lighter";
    list.forEach((q) => partDots(q, partXY(q)));
    ctx.globalCompositeOperation = "source-over";
  }

  // =====================================================================================================
  // Drawing the house
  // =====================================================================================================
  // Fixed stars, so the sky doesn't flicker between frames.
  const STARS = Array.from({ length: 26 }, (_, i) => [((i * 0.6180339) % 1), ((i * 0.381966 * 1.7) % 1) * 0.16 + 0.005, 0.6 + (i % 3) * 0.35]);
  function poly(pts, fill, lw) {
    ctx.beginPath(); pts.forEach(([u, v], i) => (i ? ctx.lineTo(hx(u), hy(v)) : ctx.moveTo(hx(u), hy(v)))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  function box(u, v, w, h, fill, lw) { poly([[u, v], [u + w, v], [u + w, v + h], [u, v + h]], fill, lw); }
  const loadById = (id) => HOUSE_LOADS.find((L) => L.id === id);
  function drawHouse(t) {
    const s = bs, lw = Math.max(2, s * 0.006);
    ctx.save();
    roundRect(bx, by, bs, bs, bs * 0.05); ctx.clip();
    // Night sky with stars and a crescent moon.
    const sky = ctx.createLinearGradient(0, by, 0, by + bs * 0.72);
    sky.addColorStop(0, "#0C1230"); sky.addColorStop(1, "#24306A");
    ctx.fillStyle = sky; ctx.fillRect(bx, by, bs, bs);
    STARS.forEach(([u, v, r], i) => circle(hx(u), hy(v), s * 0.004 * r * (reduce ? 1 : 0.8 + 0.2 * Math.sin(t / 700 + i)), "#FFF6CC"));
    circle(hx(0.89), hy(0.065), s * 0.034, "#FFF3B8");
    circle(hx(0.905), hy(0.055), s * 0.03, "#18205A");
    // Ground, grass and the dug-out basement.
    box(0, 0.72, 1, 0.3, "#3B2B22");
    box(0, 0.715, 1, 0.012, "#2F6B3F");
    box(0.06, 0.745, 0.88, 0.225, "#55443A", lw);
    // The house: roof, walls, two floors, and the cut-away rooms.
    poly([[0.03, 0.135], [0.5, 0.02], [0.97, 0.135]], "#5A3442", lw);
    box(0.06, 0.13, 0.88, 0.59, "#3A4470", lw);
    const lamp = loadById("lamp"), porch = loadById("porch");
    const lampLit = lum(lamp.r), porchLit = lum(porch.r);
    box(0.08, 0.145, 0.41, 0.27, mix("#2A3152", "#F7D98A", lampLit * 0.8));
    box(0.51, 0.145, 0.41, 0.27, "#2A3152");
    box(0.08, 0.44, 0.51, 0.28, "#2A3152");
    // The front of the house by the door is not cut away: a wall with the front door and a step.
    box(0.61, 0.44, 0.31, 0.28, "#7A4B44");
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 1;
    for (let v = 0.465; v < 0.72; v += 0.03) { ctx.beginPath(); ctx.moveTo(hx(0.61), hy(v)); ctx.lineTo(hx(0.92), hy(v)); ctx.stroke(); }
    if (porchLit > 0.03) {
      const g = ctx.createRadialGradient(hx(0.77), hy(0.52), s * 0.02, hx(0.77), hy(0.62), s * 0.22);
      g.addColorStop(0, rgba("#FFE58A", 0.55 * porchLit)); g.addColorStop(1, rgba("#FFE58A", 0));
      ctx.fillStyle = g; ctx.fillRect(hx(0.55), hy(0.44), s * 0.45, s * 0.33);
    }
    box(0.72, 0.55, 0.12, 0.17, "#2F8F6A", lw);
    box(0.74, 0.57, 0.08, 0.05, "#3FB487", lw * 0.7);
    circle(hx(0.825), hy(0.64), s * 0.008, "#FFC93C", lw * 0.6);
    box(0.69, 0.72, 0.18, 0.025, "#9AA5B8", lw);
    // Furniture: a bed and a bedside table in the bedroom, a sofa in the living room.
    box(0.09, 0.37, 0.10, 0.045, "#6B7594", lw * 0.7);
    box(0.09, 0.345, 0.025, 0.07, "#8A6A4A", lw * 0.7);
    box(0.12, 0.358, 0.05, 0.016, "#F4F4F4", lw * 0.6);
    box(0.20, 0.365, 0.08, 0.05, "#8A6A4A", lw * 0.7);
    box(0.12, 0.65, 0.30, 0.07, "#4A6FB5", lw * 0.7);
    box(0.12, 0.615, 0.30, 0.04, "#3D5E9C", lw * 0.7);
    // The floor between the storeys and the inside walls.
    box(0.06, 0.415, 0.88, 0.025, "#4A5578", lw);
    box(0.49, 0.145, 0.02, 0.27, "#4A5578");
    box(0.59, 0.44, 0.02, 0.28, "#4A5578");
    ctx.restore();
    drawHouseWires(t, lw);
    // Gaps that are still empty: dashed sockets.
    HOUSE_SPOTS.forEach((_, i) => { if (!partOn(i)) drawEmptySpot(spotXY(i)); });
    drawHouseLoads(t, lw);
    drawParts(t);
  }
  function wirePath(pts, w, col) {
    ctx.beginPath(); pts.forEach(([u, v], i) => (i ? ctx.lineTo(hx(u), hy(v)) : ctx.moveTo(hx(u), hy(v))));
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  }
  function drawHouseWires(t) {
    const w = Math.max(3, bs * 0.011), src = partOn(0);
    HOUSE_WIRES.forEach((wr) => wirePath(wr.pts, w + 3, INK));
    HOUSE_WIRES.forEach((wr) => wirePath(wr.pts, w, "#E39B3B"));
    ctx.globalCompositeOperation = "lighter";
    HOUSE_WIRES.forEach((wr) => {
      const q = wr.of === "src" ? src : loadById(wr.of);
      if (!q) return;
      for (let k = 0; k < wr.pts.length - 1; k++) {
        const [u1, v1] = wr.pts[k], [u2, v2] = wr.pts[k + 1];
        drawDots(hx(u1), hy(v1), hx(u2), hy(v2), q.ph * bs * 0.08, q.r, w * 0.6, false, bs * 0.08);
      }
    });
    ctx.globalCompositeOperation = "source-over";
  }
  function drawHouseLoads(t, lw) {
    const s = bs;
    HOUSE_LOADS.forEach((L) => {
      const x = hx(L.at[0]), y = hy(L.at[1]), g = lum(L.r), tw = twinkleAt(L, t), gl = tw ? 0.8 : g, col = tw || "#FFE58A";
      if (gl > 0.03 && L.t === "bulb") {
        ctx.globalCompositeOperation = "lighter";
        const R = s * (0.04 + 0.08 * gl), gr = ctx.createRadialGradient(x, y, 2, x, y, R);
        gr.addColorStop(0, rgba(col, 0.9 * gl)); gr.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = gr; ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
        ctx.globalCompositeOperation = "source-over";
      }
      if (L.id === "porch") {
        // A wall lantern above the front door.
        box(L.at[0] - 0.006, 0.48, 0.012, 0.006, INK);
        box(L.at[0] - 0.022, 0.486, 0.044, 0.008, "#22263A", lw);
        box(L.at[0] - 0.018, 0.494, 0.036, 0.03, g > 0.03 ? mix("#FFF2A6", "#FFFFFF", g * 0.3) : "#5A6380", lw);
        box(L.at[0] - 0.022, 0.524, 0.044, 0.007, "#22263A", lw);
      } else if (L.id === "bell") {
        // A brass bell on a plate; it shakes while it rings.
        const sh = L.r > ON && !reduce ? Math.sin(t * 0.12) * s * 0.004 : 0;
        box(L.at[0] - 0.03, L.at[1] - 0.012, 0.06, 0.024, "#6B7594", lw);
        ctx.beginPath(); ctx.arc(x + sh, y + s * 0.012, s * 0.028, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = "#FFC93C"; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
        if (L.r > ON) {
          for (let k = 0; k < 3; k++) {
            const u = ((t / 650 + k / 3) % 1), R = s * (0.035 + u * 0.05);
            ctx.beginPath(); ctx.arc(x, y, R, -Math.PI * 0.85, -Math.PI * 0.15);
            ctx.lineWidth = Math.max(2, s * 0.006); ctx.strokeStyle = "rgba(255,225,77," + (1 - u) * power + ")"; ctx.stroke();
          }
        }
      } else if (L.id === "fan") {
        // A ceiling fan seen from the front: the blades turn round the rod.
        box(0.716, 0.14, 0.008, 0.03, INK);
        const R = s * 0.11;
        const blades = [0, 1, 2, 3].map((k) => L.spin + k * TAU / 4).sort((a, b) => Math.sin(a) - Math.sin(b));
        blades.forEach((a) => {
          const ex = Math.cos(a) * R, ey = Math.sin(a) * R * 0.18;
          ctx.beginPath(); ctx.moveTo(x, y - s * 0.004); ctx.lineTo(x + ex, y + ey - s * 0.008); ctx.lineTo(x + ex, y + ey + s * 0.006); ctx.lineTo(x, y + s * 0.006); ctx.closePath();
          ctx.fillStyle = "#C9A27A"; ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = INK; ctx.stroke();
        });
        circle(x, y, s * 0.02, "#C9D3E0", lw);
      } else {
        // The bedroom lamp: a shade on a stand on the bedside table.
        box(0.235, 0.30, 0.01, 0.055, "#8A6A4A");
        box(0.215, 0.35, 0.05, 0.01, "#8A6A4A", lw * 0.6);
        poly([[0.21, 0.305], [0.27, 0.305], [0.255, 0.26], [0.225, 0.26]], g > 0.03 ? mix("#F4E3B5", "#FFF8D8", g) : "#B8A27A", lw);
      }
    });
  }

  // =====================================================================================================
  // The tray
  // =====================================================================================================
  // Slots are the same size in both jobs: the House's five parts sit in the middle of the Board's nine-slot box.
  function slotRect(k) {
    const n = TRAY[job].length, w = tray.w / tray.cols, h = tray.h / tray.rows;
    const cols = Math.min(tray.cols, n), rows = Math.ceil(n / cols), row = Math.floor(k / cols);
    const inRow = row < rows - 1 ? cols : n - row * cols;
    return { x: tray.x + (tray.w - inRow * w) / 2 + (k % cols) * w, y: tray.y + (tray.h - rows * h) / 2 + row * h, w, h };
  }
  function trayAt(x, y) {
    for (let k = 0; k < TRAY[job].length; k++) {
      const r = slotRect(k);
      if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return k;
    }
    return -1;
  }
  const inTray = (x, y) => x >= tray.x - 6 && x <= tray.x + tray.w + 6 && y >= tray.y - 6 && y <= tray.y + tray.h + 6;
  // The tray's own parts, drawn like the real ones but never powered.
  const protos = {};
  function proto(t) { const q = protos[t] || (protos[t] = mk(t, -1, false, { born: -1e9 })); q.c = ledNext; return q; }
  function drawTray(t, dropping) {
    roundRect(tray.x - 4, tray.y - 4, tray.w + 8, tray.h + 8, 18);
    ctx.fillStyle = dropping ? "rgba(255,201,60,0.22)" : "rgba(255,255,255,0.07)"; ctx.fill();
    TRAY[job].forEach((type, k) => {
      const r = slotRect(k), fs = Math.max(14, Math.min(17, r.h * 0.17)), cx = r.x + r.w / 2;
      const L = Math.min(r.w * 0.6, (r.h - fs - 14) * 1.5), cy = r.y + (r.h - fs - 8) / 2 + 2;
      drawPart(proto(type), cx - L / 2, cy, cx + L / 2, cy, t);
      ctx.font = "700 " + fs + "px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#FFFFFF"; ctx.fillText(LABELS[type], cx, r.y + r.h - 6);
    });
  }

  // =====================================================================================================
  // Surprise moments
  // =====================================================================================================
  // Moments play over the scene and never change the circuit: a moth, paper streamers, twinkling lights, a cat,
  // a delivery box. Times are about a third slower than natural (AGENTS.md "Pace").
  let fx = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  function twinkleAt(q, t) {
    const f = fx.find((e) => e.type === "twinkle");
    if (!f || (q.t !== "bulb" && q.t !== "led")) return null;
    const u = (t - f.t0) / 2600 - (typeof q.id === "number" ? q.id % 5 : HOUSE_LOADS.indexOf(q)) * 0.06;
    return u > 0 && u < 1 ? RAINBOW[Math.floor(u * RAINBOW.length)] : null;
  }
  // The brightest light on the scene, or the middle of the board if nothing glows.
  function brightest() {
    let best = null, at = [bx + bs / 2, by + bs * 0.4];
    if (job === "house") { const L = loadById("porch"); return [hx(L.at[0]), hy(L.at[1])]; }
    cur().forEach((q) => { if ((q.t === "bulb" || q.t === "led") && (!best || q.r > best.r)) best = q; });
    if (best) at = mid(partXY(best));
    return at;
  }
  function drawFx(t) {
    fx = fx.filter((e) => {
      const s = (t - e.t0) / 1000;
      if (e.type === "twinkle") return s < 3.2;
      if (e.type === "moth") {
        if (s > 7) return false;
        const [tx, ty] = e.to, R = Math.max(30, bs * 0.08);
        let x, y;
        if (s < 1.8) { const u = s / 1.8, k = u * u * (3 - 2 * u); x = e.from[0] + (tx - e.from[0]) * k; y = e.from[1] + (ty - R - e.from[1]) * k + Math.sin(u * 9) * 10; }
        else if (s < 5) { const a = (s - 1.8) * 2.4 - Math.PI / 2; x = tx + Math.cos(a) * R; y = ty + Math.sin(a) * R * 0.7; }
        else { const u = (s - 5) / 2, a = 3.2 * 2.4 - Math.PI / 2, x0 = tx + Math.cos(a) * R, y0 = ty + Math.sin(a) * R * 0.7; x = x0 + (W + 80 - x0) * u * u; y = y0 - u * bs * 0.4 + Math.sin(u * 9) * 10; }
        drawMoth(x, y, t, Math.max(16, bs * 0.055));
        return true;
      }
      if (e.type === "streamers") {
        if (s > 3.6) return false;
        ctx.globalAlpha = Math.min(1, (3.6 - s) / 1.2);
        e.bits.forEach((b) => {
          const d = b.v * (1 - Math.exp(-s * 1.2)) * 1.2, x = e.x + Math.cos(b.a) * d, y = e.y + Math.sin(b.a) * d + s * s * 6;
          ctx.save(); ctx.translate(x, y); ctx.rotate(b.a + Math.sin(s * 7 + b.a * 3) * 0.6);
          ctx.beginPath(); ctx.moveTo(0, -3);
          for (let k = 1; k <= 4; k++) ctx.lineTo(k * b.len / 4, Math.sin(s * 9 + k) * 4 - 3);
          for (let k = 4; k >= 0; k--) ctx.lineTo(k * b.len / 4, Math.sin(s * 9 + k) * 4 + 3);
          ctx.closePath(); ctx.fillStyle = b.col; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
          ctx.restore();
        });
        ctx.globalAlpha = 1;
        return true;
      }
      if (e.type === "cat") {
        if (s > 9) return false;
        const u = s / 9, x = hx(1.06 - u * 1.14), y = hy(0.715), k = bs * 0.0011;
        drawCat(x, y, k, s);
        return true;
      }
      if (e.type === "parcel") {
        if (s > 12) return false;
        const u = Math.min(1, s / 1.6), k = 1 - (1 - u) * (1 - u), x = hx(1.05 - k * 0.27), y = hy(0.72);
        ctx.globalAlpha = s > 11 ? 12 - s : 1;
        const w = bs * 0.06;
        box((x - bx) / bs - 0.03, 0.72 - 0.05, 0.06, 0.05, "#C8955A", Math.max(2, bs * 0.005));
        ctx.fillStyle = "#E8D3A8"; ctx.fillRect(x - w * 0.08, y - bs * 0.05, w * 0.16, bs * 0.05);
        ctx.globalAlpha = 1;
        return true;
      }
      return false;
    });
  }
  function drawMoth(x, y, t, s) {
    const flap = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(t / 45));
    ctx.save(); ctx.translate(x, y);
    [-1, 1].forEach((d) => {
      ctx.beginPath(); ctx.ellipse(d * s * 0.55 * flap, -s * 0.15, s * 0.6 * flap, s * 0.45, d * 0.4, 0, TAU);
      ctx.fillStyle = "#E8DCC0"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(d * s * 0.4 * flap, s * 0.35, s * 0.4 * flap, s * 0.3, -d * 0.4, 0, TAU);
      ctx.fillStyle = "#D6C7A6"; ctx.fill(); ctx.stroke();
    });
    ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.16, s * 0.55, 0, 0, TAU); ctx.fillStyle = "#8A7556"; ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawCat(x, y, k, s) {
    // A cat's dark shape walking left along the ground; only the legs and tail move.
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = "#151A2E"; ctx.strokeStyle = "#151A2E"; ctx.lineCap = "round";
    const step = reduce ? 0 : Math.sin(s * 6);
    ctx.lineWidth = 6;
    [[-14, step], [-6, -step], [14, -step], [22, step]].forEach(([lx, ph]) => { ctx.beginPath(); ctx.moveTo(lx, -14); ctx.lineTo(lx + ph * 5, 0); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(4, -20, 24, 10, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-22, -30, 10, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-30, -36); ctx.lineTo(-28, -46); ctx.lineTo(-22, -38); ctx.moveTo(-20, -38); ctx.lineTo(-14, -46); ctx.lineTo(-14, -34); ctx.fill();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(26, -24); ctx.quadraticCurveTo(44, -30 + step * 4, 40, -50); ctx.stroke();
    ctx.restore();
  }
  let surpriseNext = 0;
  function surprise() {
    if (locked()) return;
    const t = now();
    if (job === "house") {
      const k = surpriseNext++ % 3;
      if (k === 0) fx.push({ type: "cat", t0: t });
      else if (k === 1) { fx = fx.filter((e) => e.type !== "parcel"); fx.push({ type: "parcel", t0: t }); snd.snap(); }
      else fx.push({ type: "moth", t0: t, from: [W + 40, rnd(0, H * 0.4)], to: brightest() });
      return;
    }
    // Streamers need a spinning fan and twinkling needs a light; the moth always has somewhere to fly.
    const motor = cur().find((q) => q.t === "motor" && q.r > ON), light = cur().some((q) => q.t === "bulb" || q.t === "led");
    for (let tries = 0; tries < 3; tries++) {
      const k = surpriseNext++ % 3;
      if ((k === 1 && !motor) || (k === 2 && !light)) continue;
      if (k === 0) fx.push({ type: "moth", t0: t, from: [-40, rnd(0, H * 0.5)], to: brightest() });
      else if (k === 1) {
        const [x, y] = mid(partXY(motor));
        fx.push({ type: "streamers", t0: t, x, y, bits: Array.from({ length: 6 }, (_, i) => ({ a: i * TAU / 6 + rnd(-0.3, 0.3), v: bs * rnd(0.2, 0.32), len: bs * rnd(0.06, 0.09), col: RAINBOW[i] })) });
        snd.wipe();
      } else { fx.push({ type: "twinkle", t0: t }); snd.chime(); }
      return;
    }
  }

  // =====================================================================================================
  // Placing and using parts
  // =====================================================================================================
  function allowed(s, type) { const k = SPOTS[job][s].kinds; return !k || k.includes(type); }
  // Puts a part on a spot. A part already there moves to where the new one came from, or goes back to the tray.
  function placeAt(q, s, from) {
    const old = partOn(s);
    if (old && old !== q) {
      if (from != null && from >= 0 && allowed(from, old.t)) old.s = from;
      else parts[job].splice(parts[job].indexOf(old), 1);
    }
    q.s = s; q.born = now();
    if (!parts[job].includes(q)) parts[job].push(q);
    if (q.t === "led" && q.c === ledNext && from == null) ledNext = (ledNext + 1) % LED_COLORS.length;
    lastAction = now();
    snd.snap(); saveSoon(); refreshHint(true);
  }
  // Where a tapped tray part goes: the free spot where it makes the most work once switches and cranks are used,
  // then a spot next to loose ends, then the middle of the board.
  function bestSpot(type) {
    const spots = SPOTS[job];
    if (job === "house") {
      if (SOURCES.includes(type)) return 0;
      const free = HOUSE_LOADS.filter((L) => !partOn(L.gap));
      const pick = free.find((L) => L.part === type) || free[0];
      return pick ? pick.gap : -1;
    }
    const deg = new Array(N * N).fill(0);
    cur().forEach((q) => { deg[spots[q.s].a]++; deg[spots[q.s].b]++; });
    const base = working({ ideal: true });
    let best = -1, score = -1;
    spots.forEach((sp, s) => {
      if (partOn(s)) return;
      const trialPart = mk(type, s, false), gain = Math.max(working({ ideal: true, extra: [trialPart] }),
        type === "led" ? working({ ideal: true, extra: [mk(type, s, true)] }) : 0) - base;
      const loose = (deg[sp.a] === 1 ? 2 : deg[sp.a] ? 1 : 0) + (deg[sp.b] === 1 ? 2 : deg[sp.b] ? 1 : 0);
      const [mx, my] = [(sp.u1[0] + sp.u2[0]) / 2, (sp.u1[1] + sp.u2[1]) / 2], c = (N - 1) / 2;
      const sc = gain * 100 + loose * 10 - Math.hypot(mx - c, my - c);
      if (sc > score) { score = sc; best = s; }
    });
    return best;
  }
  function tapTray(type, k) {
    const s = bestSpot(type);
    const r = slotRect(k), [vx, vy] = vp(r.x + r.w / 2, r.y);
    if (s < 0) { coach.say("Every gap has a part in it.", 3); Toybox.nametag(NAMES[type], vx, vy); return; }
    const q = mk(type, s, false, { c: ledNext });
    // A tapped LED goes in the way round that lights it, if either way does.
    if (type === "led" && job === "board") {
      const base = working({ ideal: true });
      if (working({ ideal: true, extra: [q] }) <= base && working({ ideal: true, extra: [mk(type, s, true)] }) > base) q.f = true;
    }
    placeAt(q, s, null);
    const e = mid(spotXY(s)), v = vp(e[0], e[1]);
    Toybox.nametag(NAMES[type], v[0], v[1] - p * 0.4);
  }
  function tapPart(q) {
    const e = mid(partXY(q)), v = vp(e[0], e[1]);
    lastAction = now();
    if (q.t === "switch") { q.on = !q.on; snd.click(); ghost.learned("switch"); saveSoon(); }
    else if (q.t === "button") { q.held = true; q.until = Math.max(q.until, now() + 600); snd.click(); ghost.learned("button"); }
    else if (q.t === "crank") { q.tapTurn = TAU; ghost.learned("crank"); }
    else if (q.t === "led") { q.f = !q.f; q.born = now(); snd.flip(); ghost.learned("led"); saveSoon(); }
    else snd.lift();
    if (!q.tagged || !["switch", "button", "crank"].includes(q.t)) Toybox.nametag(NAMES[q.t], v[0], v[1] - 30);
    q.tagged = true;
    refreshHint(true);
  }
  function newScene() {
    if (job === "board") parts.board = startBoard().parts;
    else { parts.house = startHouse(); HOUSE_LOADS.forEach((L) => { L.used = false; }); }
    fingers.clear(); fx = [];
    snd.wipe(); save(); refreshHint(true);
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  // Each finger is a tray press, a press on a placed part, or nothing. Moving past the slop starts a drag: the
  // part is lifted off its spot and snaps to the nearest spot where it is let go.
  const fingers = new Map();
  const SLOP = 12, TAP_MS = 350;
  function local(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function segDist(x, y, e) {
    const dx = e[2] - e[0], dy = e[3] - e[1], u = Math.max(0, Math.min(1, ((x - e[0]) * dx + (y - e[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - e[0] - dx * u, y - e[1] - dy * u);
  }
  const reach = () => (job === "board" ? p * 0.48 : bs * 0.1);
  function partAt(x, y) {
    let best = null, bd = reach();
    cur().forEach((q) => { const d = segDist(x, y, spotXY(q.s)); if (d < bd) { bd = d; best = q; } });
    return best;
  }
  function loadAt(x, y) { return HOUSE_LOADS.find((L) => Math.hypot(x - hx(L.at[0]), y - hy(L.at[1])) < bs * 0.07); }
  // The spot a held part would snap to at (x, y), or -1.
  function targetSpot(x, y, type) {
    let best = -1, bd = job === "board" ? p * 0.62 : bs * 0.15;
    SPOTS[job].forEach((sp, s) => {
      if (!allowed(s, type)) return;
      const m = mid(spotXY(s)), d = Math.hypot(x - m[0], y - m[1]);
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  cv.addEventListener("pointerdown", (e) => {
    if (locked() || Toybox.isPalm(e)) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const pt = local(e), f = { x0: pt.x, y0: pt.y, x: pt.x, y: pt.y, t0: now(), drag: false, held: null, from: null };
    const k = trayAt(pt.x, pt.y);
    if (k >= 0) { f.tray = TRAY[job][k]; f.slot = k; }
    else {
      const q = partAt(pt.x, pt.y);
      if (q) {
        f.part = q;
        if (q.t === "button") { q.held = true; q.finger = true; lastAction = now(); snd.click(); }
        if (q.t === "crank") { const c = mid(partXY(q)); f.ang = Math.atan2(pt.y - c[1], pt.x - c[0]); }
      } else if (job === "house" && loadAt(pt.x, pt.y)) {
        const L = loadAt(pt.x, pt.y), v = vp(hx(L.at[0]), hy(L.at[1]));
        Toybox.nametag(L.name, v[0], v[1] - 30);
        return;
      } else { coach.say(job === "board" ? "Drag a part from the tray onto the board." : "Drag a part from the tray into a gap.", 3); return; }
    }
    fingers.set(e.pointerId, f);
  });
  function startDrag(f) {
    f.drag = true;
    if (f.tray) { f.held = mk(f.tray, -1, false, { c: ledNext }); }
    else {
      const q = f.part;
      // The house's power stays in the basement; a new one is swapped in from the tray.
      if (job === "house" && q.s === 0) { f.drag = false; f.part = null; return; }
      if (q.t === "button") { q.held = false; q.finger = false; }
      f.held = q; f.from = q.s;
      parts[job].splice(parts[job].indexOf(q), 1);
      snd.lift();
    }
  }
  cv.addEventListener("pointermove", (e) => {
    const f = fingers.get(e.pointerId);
    if (!f || locked()) return;
    const pt = local(e);
    f.x = pt.x; f.y = pt.y;
    const moved = Math.hypot(pt.x - f.x0, pt.y - f.y0) > SLOP;
    if (f.part && f.part.t === "crank" && !f.drag) {
      // Turning: the finger goes round the wheel. Leaving the wheel far behind moves the crank instead.
      const q = f.part, c = mid(partXY(q)), d = Math.hypot(pt.x - c[0], pt.y - c[1]);
      const far = d > (job === "board" ? p : bs * 0.16) && !(job === "house" && q.s === 0);
      if (!(moved && far)) {
        const a = Math.atan2(pt.y - c[1], pt.x - c[0]);
        let da = a - f.ang;
        if (da > Math.PI) da -= TAU; else if (da < -Math.PI) da += TAU;
        f.ang = a;
        if (d > 6) { q.ang += da; q.pump += Math.abs(da); if (Math.abs(da) > 0.01) { f.turned = true; lastAction = now(); ghost.learned("crank"); } }
        return;
      }
    }
    if (!f.drag && moved && (f.tray || f.part)) startDrag(f);
  });
  function lift(e, cancel) {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    if (f.part && f.part.t === "button" && !f.drag) {
      const q = f.part;
      q.finger = false;
      // A quick tap still closes the button for a moment, so the bell rings and the bulb flashes.
      if (now() - f.t0 < TAP_MS) q.until = now() + 600; else q.held = false;
      ghost.learned("button");
      if (!q.tagged) { q.tagged = true; const m = mid(partXY(q)), v = vp(m[0], m[1]); Toybox.nametag(NAMES.button, v[0], v[1] - 30); }
      return;
    }
    if (f.drag && f.held) {
      const q = f.held, s = cancel ? -1 : targetSpot(f.x, f.y, q.t);
      if (s >= 0) { placeAt(q, s, f.from); ghost.learned("place"); }
      else if (f.from != null && !inTray(f.x, f.y) && !cancel) { placeAt(q, f.from, f.from); }
      else if (f.from != null && cancel) { q.s = f.from; parts[job].push(q); }
      else { if (f.from != null) snd.out(); saveSoon(); refreshHint(true); }
      return;
    }
    if (cancel || f.drag) return;
    if (f.tray) tapTray(f.tray, f.slot);
    else if (f.part && !f.turned) tapPart(f.part);
  }
  cv.addEventListener("pointerup", (e) => lift(e, false));
  cv.addEventListener("pointercancel", (e) => lift(e, true));
  function dragging() { for (const f of fingers.values()) if (f.drag && f.held) return f; return null; }
  function drawHeld(t) {
    fingers.forEach((f) => {
      if (!f.drag || !f.held) return;
      const s = targetSpot(f.x, f.y, f.held.t);
      const L = job === "board" ? p : bs * 0.16;
      let dx = L / 2, dy = 0;
      if (s >= 0) {
        const e = spotXY(s);
        ctx.save(); const SL = frame(e[0], e[1], e[2], e[3]), h = SL * 0.2;
        roundRect(-h * 1.2, -h * 1.2, SL + h * 2.4, h * 2.4, h * 1.2); ctx.fillStyle = "rgba(255,201,60,0.45)"; ctx.fill();
        ctx.restore();
        const len = Math.hypot(e[2] - e[0], e[3] - e[1]);
        dx = (e[2] - e[0]) / len * L / 2; dy = (e[3] - e[1]) / len * L / 2;
        if (f.held.f) { dx = -dx; dy = -dy; }
      }
      ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
      drawPart(f.held, f.x - dx, f.y - dy, f.x + dx, f.y + dy, t);
      ctx.restore();
    });
  }

  // =====================================================================================================
  // Coach, ghost hand and tabs
  // =====================================================================================================
  const coach = Toybox.coach($("coach"));
  let hintKey = "", infoSaid = "";
  // What the coach should say about the scene now: { line, spot | part, need, key } or { info } or null.
  function boardHint() {
    const list = cur(), srcs = list.filter((q) => SOURCES.includes(q.t));
    const srcName = (q) => (q && q.t === "crank" ? "crank" : "battery");
    if (shortSrc) return { line: "The wire goes straight back to the " + srcName(shortSrc) + ". Put a bulb in the loop.", key: "short" };
    if (!srcs.length) return { line: "Drag the battery onto the board.", need: "battery", spot: bestSpot("battery"), key: "place" };
    const led = list.find((q) => reversedLed(q));
    if (led) return { line: "Tap the LED to turn it around.", part: led, key: "led" };
    const now0 = working(), ideal = working({ ideal: true });
    if (ideal > now0) {
      // Something would work once he uses a control: the switch first, then the button, then the crank.
      const sw = list.find((q) => q.t === "switch" && !q.on);
      if (sw) return { line: "Tap the switch to close the loop.", part: sw, key: "switch" };
      const bt = list.find((q) => q.t === "button" && !q.held);
      if (bt) return { line: "Hold the button to close the loop.", part: bt, key: "button" };
      const cr = list.find((q) => q.t === "crank");
      if (cr) return { line: "Turn the crank to make electricity.", part: cr, key: "crank" };
    }
    if (now0 === 0) {
      if (!list.some(isLoad)) return { line: "Drag a bulb onto the board.", need: "bulb", spot: bestSpot("bulb"), key: "place" };
      // A gap: one free spot that a wire would turn into a working loop.
      let gap = -1;
      const spots = SPOTS.board;
      if (!partOn(START_GAP) && working({ ideal: true, extra: [mk("wire", START_GAP)] }) > ideal) gap = START_GAP;
      for (let s = 0; s < spots.length && gap < 0; s++) if (!partOn(s) && working({ ideal: true, extra: [mk("wire", s)] }) > ideal) gap = s;
      const bulb = list.some((q) => q.t === "bulb");
      if (gap >= 0) return { line: "Drag a wire into the gap to " + (bulb ? "light the bulb." : "close the loop."), need: "wire", spot: gap, key: "place" };
      return { line: "Connect both ends of the " + srcName(srcs[0]) + " in a loop.", key: "loop" };
    }
    const lit = list.filter((q) => q.t === "bulb" && q.r > ON);
    if (lit.length >= 2 && lit.every((q) => q.r < 0.65)) return { info: "Two bulbs in a row share the electricity. They glow less." };
    return null;
  }
  function houseHint() {
    const src = partOn(0);
    for (const L of HOUSE_LOADS) {
      const g = partOn(L.gap);
      if (!g) {
        const lines = {
          porch: "Drag a wire into the gap to light the porch light.",
          bell: "Drag the push button into the gap by the front door.",
          fan: "Drag a switch into the gap to work the ceiling fan.",
          lamp: "Drag a switch into the gap to work the bedroom lamp."
        };
        return { line: lines[L.id], need: L.part, spot: L.gap, key: "place" };
      }
      if (L.used) continue;
      const closed = g.t === "wire" || (g.t === "switch" && g.on) || (g.t === "button" && g.held);
      if (!closed) {
        if (g.t === "button") return { line: L.id === "bell" ? "Hold the doorbell button to ring the bell." : "Hold the button to close the loop.", part: g, key: "button" };
        const what = { porch: "porch light", bell: "doorbell", fan: "ceiling fan", lamp: "bedroom lamp" }[L.id];
        return { line: "Tap the switch to turn on the " + what + ".", part: g, key: "switch" };
      }
      if (src && src.t === "crank") return { line: "Turn the crank to make electricity.", part: src, key: "crank" };
    }
    return null;
  }
  let houseDone = false;
  function refreshHint(force) {
    if (locked()) return;
    // The hint is worked out again when the parts change or when the number of working loads does (a crank
    // slowing down to nothing).
    const key = job + "|" + cur().map((q) => q.t + q.s + (q.f ? "f" : "") + (q.on ? "o" : "") + (q.held ? "h" : "")).join(",") +
      "|" + (shortSrc ? 1 : 0) + "|" + lastWorking + "|" + HOUSE_LOADS.map((L) => (L.used ? 1 : 0)).join("");
    if (!force && key === hintKey) return;
    hintKey = key;
    // Keep the moving parts' state current before asking what works.
    analyze();
    const h = job === "board" ? boardHint() : houseHint();
    hint = h && !h.info ? h : null;
    if (h && h.line) {
      coach.step(h.line);
      // A new line must not cover the part or gap it names (or, without one, the tray slot he drags from).
      let e = h.part ? mid(partXY(h.part)) : h.spot != null && h.spot >= 0 ? mid(spotXY(h.spot)) : null;
      if (!e && h.need) { const r = slotRect(TRAY[job].indexOf(h.need)); e = [r.x + r.w / 2, r.y + r.h / 2]; }
      if (e) { const v = vp(e[0], e[1]); coach.avoid(v[0], v[1]); } else coach.avoid(null);
    } else {
      coach.clear();
      if (h && h.info && infoSaid !== h.info) coach.say(h.info, 5);
    }
    infoSaid = h && h.info ? h.info : "";
    if (job === "house" && !h && !houseDone && HOUSE_LOADS.every((L) => L.used)) { houseDone = true; Toybox.kind(); }
    ghost.poke();
  }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || fingers.size || !hint) return null;
      if (hint.part) {
        const e = mid(partXY(hint.part)), v = vp(e[0], e[1]);
        return hint.key === "button" ? { pts: [v], hold: true, key: "button" } : { pts: [v], tap: true, key: hint.key };
      }
      if (hint.need && hint.spot != null && hint.spot >= 0) {
        const k = TRAY[job].indexOf(hint.need), r = slotRect(k), e = mid(spotXY(hint.spot));
        return { pts: [vp(r.x + r.w / 2, r.y + r.h * 0.4), vp(e[0], e[1])], dur: 1800, key: "place" };
      }
      return null;
    }
  });
  function pic(kind) {
    if (kind === "board") {
      return '<svg viewBox="0 0 50 50"><rect x="2" y="2" width="46" height="46" rx="7" fill="#2A3560" stroke="#1D2340" stroke-width="2"/>' +
        '<rect x="11" y="15" width="28" height="22" fill="none" stroke="#3D8BFF" stroke-width="5" stroke-linejoin="round"/>' +
        '<circle cx="25" cy="15" r="9" fill="#FFF2A6" stroke="#1D2340" stroke-width="2"/><rect x="6" y="21" width="10" height="12" rx="2" fill="#FFC93C" stroke="#1D2340" stroke-width="2"/></svg>';
    }
    return '<svg viewBox="0 0 50 50"><rect x="2" y="2" width="46" height="46" rx="7" fill="#1B2347" stroke="#1D2340" stroke-width="2"/>' +
      '<path d="M7 22 25 8l18 14" fill="#5A3442" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/>' +
      '<rect x="10" y="22" width="30" height="22" fill="#3A4470" stroke="#1D2340" stroke-width="2"/>' +
      '<rect x="14" y="26" width="9" height="8" fill="#FFE58A" stroke="#1D2340" stroke-width="1.5"/><rect x="28" y="31" width="7" height="13" fill="#2F8F6A" stroke="#1D2340" stroke-width="1.5"/></svg>';
  }
  Toybox.jobs($("jobs"), {
    jobs: [{ id: "board", name: "Board", pic: pic("board") }, { id: "house", name: "House", pic: pic("house") }],
    value: job,
    onPick: (id) => pickJob(id)
  });
  // A part lifted by a finger goes back to its spot (tab change, play time up).
  function dropAll() {
    fingers.forEach((f) => { if (f.drag && f.held && f.from != null) { f.held.s = f.from; parts[job].push(f.held); } });
    fingers.clear();
  }
  function pickJob(id) {
    dropAll();
    job = id;
    infoSaid = "";
    lastWorking = 0;
    analyze();
    lastWorking = cur().concat(job === "house" ? HOUSE_LOADS : []).filter((q) => isLoad(q) && q.r > ON).length;
    refreshHint(true);
    saveSoon();
  }
  Toybox.bar($("bottom"), { onNew: newScene, onSurprise: surprise });

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now(), lastHint = 0;
  function loop() {
    const t = now(), dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    update(dt, t);
    if (t - lastHint > 250) { lastHint = t; refreshHint(false); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (job === "board") drawBoard(t); else drawHouse(t);
    if (hint && !dragging()) {
      if (hint.part && cur().includes(hint.part)) drawRing(partXY(hint.part), t);
      else if (hint.spot != null && hint.spot >= 0) drawRing(spotXY(hint.spot), t);
    }
    const d = dragging();
    drawTray(t, d && d.from != null && inTray(d.x, d.y));
    drawHeld(t);
    drawFx(t);
    // Winding down at the end of play time: the whole stage dims as the power fades.
    if (power < 1) { ctx.fillStyle = "rgba(10,12,24," + (1 - power) * 0.5 + ")"; ctx.fillRect(0, 0, W, H); }
    requestAnimationFrame(loop);
  }
  function onEnding(done) {
    ending = true;
    dropAll(); fx = [];
    powerTo = 0;
    cur().forEach((q) => { q.tapTurn = 0; q.held = false; q.until = 0; });
    coach.clear();
    setTimeout(done, 2400);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 100 100"><rect x="22" y="30" width="56" height="44" fill="none" stroke="#3D8BFF" stroke-width="8" stroke-linejoin="round"/>' +
      '<rect x="12" y="40" width="20" height="24" rx="4" fill="#FFC93C" stroke="#1D2340" stroke-width="2.5"/>' +
      '<circle cx="50" cy="30" r="14" fill="#C9C2A0" stroke="#1D2340" stroke-width="2.5"/><circle cx="50" cy="30" r="9" fill="#E8E2C8"/></svg>';
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  pickJob(job);
  Toybox.init({
    app: "circuits",
    badge: $("tbadge"),
    timerIntro: "When time is up, the lights dim, the fan slows and the controls lock.",
    goodbyeOption: "End with a “Goodnight, circuits” button to press",
    farewellText: "Time to switch off the lights",
    goodbyeLabel: "Goodnight, circuits",
    farewellDone: "Night night, circuits!",
    restLine: "The circuits are resting.",
    restLine2: "The parts will be in the tray next time.",
    restArt,
    soundNote: "Soft clicks, a buzz and a hum. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; powerTo = 1; refreshHint(true); },
    onSound: (on) => { if (on) snd.chime(); }
  });
  requestAnimationFrame(loop);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__circuits = {
      selfTest,
      state: () => {
        analyze();
        return {
          n: N, job, short: !!shortSrc, coach: coach.text(), hint: hint && (hint.line || null),
          parts: cur().map((q) => ({ id: q.id, t: q.t, s: q.s, f: q.f, on: q.on, held: q.held, r: +q.r.toFixed(3), spd: +q.spd.toFixed(2) })),
          house: HOUSE_LOADS.map((L) => ({ id: L.id, r: +L.r.toFixed(3), used: L.used }))
        };
      },
      // Board: place("bulb", [x1, y1], [x2, y2]) with grid points; the part's first end goes on the first point.
      // House: place("switch", gapNumber) with 1 porch, 2 doorbell, 3 fan, 4 lamp (0 is the power).
      place: (type, a, b) => {
        let s, f = false;
        if (job === "board") { s = boardSpot(a[0], a[1], b[0], b[1]); f = s >= 0 && (BOARD_SPOTS[s].u1[0] !== a[0] || BOARD_SPOTS[s].u1[1] !== a[1]); }
        else s = a;
        if (s == null || s < 0 || !SPOTS[job][s] || !allowed(s, type)) return null;
        const q = mk(type, s, f, { c: ledNext });
        placeAt(q, s, null);
        return q.id;
      },
      tap: (id) => { const q = cur().find((x) => x.id === id); if (q) tapPart(q); return !!q; },
      hold: (id, on) => { const q = cur().find((x) => x.id === id); if (q) { q.held = !!on; q.finger = !!on; lastAction = now(); } return !!q; },
      remove: (id) => { const q = cur().find((x) => x.id === id); if (q) { parts[job].splice(parts[job].indexOf(q), 1); refreshHint(true); } return !!q; },
      clear: () => { parts[job] = job === "board" ? [] : startHouse(); refreshHint(true); },
      job: (id) => { pickJob(id); },
      pt: (x, y) => vp(bx + (x + 0.5) * p, by + (y + 0.5) * p),
      spot: (s) => { const e = mid(spotXY(s)); return vp(e[0], e[1]); },
      slot: (type) => { const r = slotRect(TRAY[job].indexOf(type)); return vp(r.x + r.w / 2, r.y + r.h * 0.4); },
      ghost: () => ghost.show()
    };
  }
})();
