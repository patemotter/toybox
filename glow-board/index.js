(function () {
  "use strict";
  // Glow Board: a black board of round light-up buttons, like the light-up peg toys with touch buttons. Three jobs:
  //   Draw:       pick a color, then tap or drag across buttons to light them. Like the real toy, each tap on a lit
  //               button steps it to the next color, and to off after the last one.
  //   Fill:       tap any button and the whole board floods to the picked color, outward from that button.
  //   Light show: tap any button and an effect plays from it over the picture (rainbow line, ripple, firework,
  //               sparkle, spin, beams). Effects only light buttons for a moment; the picture stays.
  // The grid is 8 x 8 on phones and 16 x 16 on tablets, picked once from the screen's short side so turning the
  // device never changes it.
  //
  // Sections:
  //   Setup and saved state
  //   Sound
  //   Layout and button sprites
  //   Effects
  //   Drawing
  //   Draw, fill and clear
  //   Input
  //   Coach, ghost hand and panel
  //   Surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  const TAU = Math.PI * 2;
  const now = () => performance.now();
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const COLORS = [
    { id: "red", name: "Red", hex: "#FF4D4D" }, { id: "orange", name: "Orange", hex: "#FF9A2E" },
    { id: "yellow", name: "Yellow", hex: "#FFE14D" }, { id: "green", name: "Green", hex: "#4CD964" },
    { id: "blue", name: "Blue", hex: "#3D8BFF" }, { id: "purple", name: "Purple", hex: "#A66BFF" },
    { id: "pink", name: "Pink", hex: "#FF6FC8" }, { id: "white", name: "White", hex: "#FFFFFF" }
  ];
  const RAINBOW = ["#FF3B3B", "#FF7A1F", "#FFB21F", "#FFE53B", "#B6F03B", "#4CD964", "#2FE0B0", "#33C8FF", "#3D8BFF",
    "#6B6BFF", "#A66BFF", "#FF5FD2"];
  const EFFECTS = [
    { id: "rainbow", name: "Rainbow" }, { id: "ripple", name: "Ripple" }, { id: "firework", name: "Firework" },
    { id: "sparkle", name: "Sparkle" }, { id: "spin", name: "Spin" }, { id: "beams", name: "Beams" }
  ];
  const JOBS = ["draw", "fill", "show"];

  const N = Math.min(innerWidth, innerHeight) < 600 ? 8 : 16;
  const KEY = "glow-board-v1";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (Toybox.fresh() || typeof saved !== "object" || Array.isArray(saved)) saved = {};

  // board[i] is a COLORS index, or -1 for an unlit button (i = row * N + column).
  const board = new Int8Array(N * N).fill(-1);
  if (saved.n === N && Array.isArray(saved.board) && saved.board.length === N * N) {
    saved.board.forEach((v, i) => { board[i] = Number.isInteger(v) && v >= -1 && v < COLORS.length ? v : -1; });
  }
  let job = JOBS.includes(saved.job) ? saved.job : "draw";
  let color = COLORS.some((c) => c.id === saved.color) ? COLORS.findIndex((c) => c.id === saved.color) : 2;
  let effect = EFFECTS.some((f) => f.id === saved.effect) ? saved.effect : "rainbow";

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({ n: N, board: Array.from(board), job, color: COLORS[color].id, effect }));
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
  function noise(dur, freq, gain, delay) {
    const a = Toybox.sound.ready(); if (!a) return;
    if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
      noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  // A pentatonic scale, so any run of lit buttons sounds pleasant; higher rows play higher notes.
  const SCALE = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];
  let lastBlip = 0;
  const snd = {
    blip(row) {
      const t = now(); if (t - lastBlip < 45) return; lastBlip = t;
      const f = SCALE[Math.round((N - 1 - row) * 15 / (N - 1))];
      tone(f, f, 0.18, "sine", 0.05);
    },
    off() { const t = now(); if (t - lastBlip < 45) return; lastBlip = t; tone(330, 220, 0.12, "triangle", 0.035); },
    fill() { [0, 0.12, 0.24, 0.36].forEach((d, k) => tone(SCALE[2 + k * 2], SCALE[2 + k * 2], 0.4, "sine", 0.04, d)); },
    wipe() { tone(700, 260, 0.6, "sine", 0.035); },
    show(id) {
      if (id === "rainbow") tone(1400, 500, 0.9, "sine", 0.035);
      else if (id === "ripple") { tone(440, 440, 0.5, "sine", 0.05); tone(660, 660, 0.5, "sine", 0.03, 0.4); }
      else if (id === "firework") { tone(500, 1500, 0.7, "sine", 0.025); noise(0.5, 900, 0.06, 0.7); }
      else if (id === "sparkle") { for (let k = 0; k < 5; k++) tone(1800 + k * 220, 1800 + k * 220, 0.12, "sine", 0.025, k * 0.2); }
      else if (id === "spin") tone(500, 900, 1.6, "triangle", 0.025);
      else tone(800, 1200, 0.5, "sine", 0.03);
    },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); }
  };

  // =====================================================================================================
  // Layout and button sprites
  // =====================================================================================================
  let W = 0, H = 0, dpr = 1;
  // The board: its outer square (bx, by, bs), the button grid's corner (gx, gy) and the button pitch p.
  let bx = 0, by = 0, bs = 0, gx = 0, gy = 0, p = 0;
  let sprites = new Map();
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    bs = Math.max(40, Math.min(W, H) - 16);
    bx = (W - bs) / 2; by = (H - bs) / 2;
    const pad = bs * 0.055;
    p = (bs - pad * 2) / N; gx = bx + pad; gy = by + pad;
    sprites = new Map();
    dirty = true;
  }
  const cellX = (x) => gx + (x + 0.5) * p, cellY = (y) => gy + (y + 0.5) * p;
  // The button under (x, y) in stage px, or -1. A press just past the grid's edge still takes the nearest button.
  function cellAt(x, y) {
    const cx = Math.floor((x - gx) / p), cy = Math.floor((y - gy) / p);
    if (cx < -1 || cy < -1 || cx > N || cy > N) return -1;
    if ((cx < 0 || cy < 0 || cx >= N || cy >= N) && (x < gx - p * 0.5 || y < gy - p * 0.5 || x > gx + N * p + p * 0.5 || y > gy + N * p + p * 0.5)) return -1;
    return Math.max(0, Math.min(N - 1, cy)) * N + Math.max(0, Math.min(N - 1, cx));
  }

  function rgb(hex) { const v = parseInt(hex.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
  function mix(hex, to, t) { const a = rgb(hex), b = rgb(to); return "rgb(" + a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",") + ")"; }
  function rgba(hex, al) { return "rgba(" + rgb(hex).join(",") + "," + al + ")"; }

  // Each look of a button is drawn once into a small canvas: "off", a lit body per color, and a halo per color.
  // The halo reaches into the neighbors, so all halos are drawn before any body.
  function sprite(kind, hex) {
    const k = kind + hex;
    let s = sprites.get(k);
    if (s) return s;
    const R = kind === "halo" ? p * 1.05 : p * 0.5, size = Math.ceil(R * 2 * dpr);
    s = document.createElement("canvas"); s.width = s.height = size;
    const c = s.getContext("2d"), m = size / 2, r = p * 0.4 * dpr;
    if (kind === "halo") {
      const g = c.createRadialGradient(m, m, r * 0.7, m, m, m);
      g.addColorStop(0, rgba(hex, 0.6)); g.addColorStop(0.45, rgba(hex, 0.22)); g.addColorStop(1, rgba(hex, 0));
      c.fillStyle = g; c.fillRect(0, 0, size, size);
    } else {
      const lit = kind === "lit";
      const g = c.createRadialGradient(m - r * 0.3, m - r * 0.35, r * 0.1, m, m, r);
      if (lit) { g.addColorStop(0, mix(hex, "#FFFFFF", 0.75)); g.addColorStop(0.5, hex); g.addColorStop(1, mix(hex, "#000000", 0.2)); }
      else { g.addColorStop(0, "#80868F"); g.addColorStop(0.55, "#4E535B"); g.addColorStop(1, "#33363C"); }
      c.beginPath(); c.arc(m, m, r, 0, TAU); c.fillStyle = g; c.fill();
      c.lineWidth = Math.max(1, dpr * 1.2); c.strokeStyle = lit ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.6)"; c.stroke();
      c.beginPath(); c.ellipse(m - r * 0.32, m - r * 0.42, r * 0.34, r * 0.18, -0.5, 0, TAU);
      c.fillStyle = lit ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.18)"; c.fill();
    }
    sprites.set(k, s);
    return s;
  }

  // =====================================================================================================
  // Effects
  // =====================================================================================================
  // An effect lights buttons for a moment over the picture. Each frame, run(e, t, put) calls put(x, y, hex, alpha)
  // for the buttons it lights t seconds after it started, and returns false once it is over.
  // Times are about a third slower than a natural light show (AGENTS.md "Pace").
  let effects = [];
  const MAX_EFFECTS = 14;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function flash(e, t, put) { if (t < 0.4) put(e.x, e.y, "#FFFFFF", 1 - t / 0.4); }
  const RUN = {
    // A rainbow streak falls down the button's column from the top edge and splashes on the button.
    rainbow(e, t, put) {
      flash(e, t, put);
      const fall = 0.35 + 1.0 * (e.y + 1) / N, TAIL = 5;
      const hue = (k) => RAINBOW[(e.hue + k * 2) % 12];
      if (t < fall) {
        const head = Math.round(-1 + (e.y + 1) * t / fall);
        for (let k = 0; k < TAIL; k++) {
          const r = head - k;
          if (r >= 0 && r <= e.y) put(e.x, r, hue(k), 1 - k * 0.17);
        }
        return true;
      }
      const u = (t - fall) / 0.8;
      if (u >= 1) return false;
      put(e.x, e.y, "#FFFFFF", 1 - u);
      put(e.x - 1, e.y, hue(1), 0.8 * (1 - u));
      put(e.x + 1, e.y, hue(2), 0.8 * (1 - u));
      put(e.x, e.y - 1, hue(3), 0.5 * (1 - u));
      return true;
    },
    // Three rings of light spread out from the button.
    ripple(e, t, put) {
      flash(e, t, put);
      const speed = N / 2.4, maxR = N * 1.45;
      if ((t - 0.8) * speed > maxR) return false;
      for (let k = 0; k < 3; k++) {
        const R = (t - k * 0.4) * speed;
        if (R <= 0) continue;
        const hex = RAINBOW[(k * 4 + e.hue) % 12], fade = 1 - R / maxR;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const w = Math.abs(Math.hypot(x - e.x, y - e.y) - R);
          if (w < 0.75) put(x, y, hex, (1 - w / 0.75) * fade);
        }
      }
      return true;
    },
    // A spark shoots up the button's column from the bottom edge, then bursts into a ring of falling sparks.
    firework(e, t, put) {
      const rise = 0.35 + 0.7 * (N - e.y) / N, life = 1.5;
      if (t < rise) {
        const head = Math.round(N - (N - e.y) * t / rise);
        for (let k = 0; k < 3; k++) {
          const r = head + k;
          if (r < N && r >= e.y) put(e.x, r, k ? "#FFB21F" : "#FFFFFF", 1 - k * 0.35);
        }
        return true;
      }
      const s = t - rise;
      if (s > life) return false;
      if (s < 0.35) put(e.x, e.y, "#FFFFFF", 1 - s / 0.35);
      const g = N * 0.12, fade = 1 - s / life;
      e.parts.forEach((q, i) => {
        put(Math.round(e.x + q.dx * s), Math.round(e.y + q.dy * s + 0.5 * g * s * s), i % 3 === 2 ? "#FFFFFF" : e.hex, fade);
      });
      return true;
    },
    // Buttons around the button twinkle one after another.
    sparkle(e, t, put) {
      flash(e, t, put);
      if (t > 1.8) return false;
      e.pts.forEach((q) => { const s = t - q.t0; if (s > 0 && s < 0.55) put(q.x, q.y, q.hex, Math.sin(Math.PI * s / 0.55)); });
      return true;
    },
    // A rainbow hand turns once around the button, like a clock hand, with a fading tail.
    spin(e, t, put) {
      flash(e, t, put);
      const dur = 1.9, R = N * 0.42 + 0.5;
      if (t > dur + 0.4) return false;
      const head = -Math.PI / 2 + TAU * Math.min(1, t / dur), out = t > dur ? 1 - (t - dur) / 0.4 : 1;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
        if (d < 0.5 || d > R) continue;
        const ang = Math.atan2(dy, dx), lag = ((head - ang) % TAU + TAU) % TAU;
        if (lag < 1.3) put(x, y, RAINBOW[Math.floor(((ang + TAU) % TAU) / TAU * 12) % 12], (1 - lag / 1.3) * out);
      }
      return true;
    },
    // Beams of light shoot out from the button along its row and its column to the edges.
    beams(e, t, put) {
      flash(e, t, put);
      const D = t * N / 1.3;
      if (D - 3 > N) return false;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        for (let k = 0; k < 3; k++) {
          const s = Math.round(D) - k;
          if (s >= 1) put(e.x + dx * s, e.y + dy * s, RAINBOW[(s + e.hue) % 12], 1 - k * 0.33);
        }
      });
      return true;
    },
    // New: a white line runs down the board and the buttons go dark behind it.
    wipe(e, t, put) {
      const dur = 0.9, row = Math.floor(t / dur * N);
      if (row >= N) return false;
      for (let x = 0; x < N; x++) put(x, row, "#FFFFFF", 0.75);
      return true;
    },
    // Surprise: a rainbow band sweeps across the board corner to corner.
    wave(e, t, put) {
      const head = t / 2.8 * (2 * N + 4) - 2;
      if (head > 2 * N + 2) return false;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const w = Math.abs(x + y - head);
        if (w < 1.8) put(x, y, RAINBOW[(x + y) % 12], 1 - w / 1.8);
      }
      return true;
    },
    // Surprise: every button twinkles once, in a random order.
    twinkle(e, t, put) {
      if (t > 3) return false;
      e.pts.forEach((q) => { const s = t - q.t0; if (s > 0 && s < 0.5) put(q.x, q.y, q.hex, Math.sin(Math.PI * s / 0.5)); });
      return true;
    }
  };
  function addEffect(type, x, y, delay) {
    if (effects.length >= MAX_EFFECTS) effects.shift();
    const e = { type, x, y, t0: now() + (delay || 0) * 1000, hue: Math.floor(Math.random() * 12) };
    if (type === "firework") {
      e.hex = COLORS[Math.floor(Math.random() * 7)].hex;
      const v = N * 0.26;
      e.parts = Array.from({ length: 12 }, (_, i) => {
        const a = i * TAU / 12 + rnd(-0.12, 0.12), sp = v * rnd(0.85, 1.15);
        return { dx: Math.cos(a) * sp, dy: Math.sin(a) * sp };
      });
    } else if (type === "sparkle") {
      const R = Math.max(2.2, N * 0.28);
      e.pts = Array.from({ length: Math.round(N * 1.6) }, () => {
        const a = rnd(0, TAU), d = rnd(0.8, R);
        return { x: Math.round(x + Math.cos(a) * d), y: Math.round(y + Math.sin(a) * d), t0: rnd(0, 1.2),
          hex: Math.random() < 0.4 ? "#FFFFFF" : COLORS[Math.floor(Math.random() * 7)].hex };
      });
    } else if (type === "twinkle") {
      e.pts = [];
      for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
        e.pts.push({ x: xx, y: yy, t0: rnd(0, 2.4), hex: Math.random() < 0.3 ? "#FFFFFF" : RAINBOW[Math.floor(Math.random() * 12)] });
      }
    }
    effects.push(e);
    dirty = true;
  }

  // =====================================================================================================
  // Drawing
  // =====================================================================================================
  let dirty = true, dim = 1, dimTo = 1;
  const popAt = new Float64Array(N * N).fill(-1e9);
  const POP_MS = 260;
  let popUntil = 0;
  const ovHex = new Array(N * N), ovA = new Float32Array(N * N);
  function put(x, y, hex, a) {
    if (x < 0 || y < 0 || x >= N || y >= N || a <= 0) return;
    const i = y * N + x;
    if (a > ovA[i]) { ovA[i] = Math.min(1, a); ovHex[i] = hex; }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw(t) {
    ovA.fill(0);
    effects = effects.filter((e) => { const s = (t - e.t0) / 1000; return s < 0 || RUN[e.type](e, s, put); });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // The board's body: black plastic with a soft edge highlight, and a darker panel under the buttons.
    roundRect(bx, by, bs, bs, bs * 0.05);
    ctx.fillStyle = "#16171B"; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = "#1D2340"; ctx.stroke();
    roundRect(bx + 3, by + 3, bs - 6, bs - 6, bs * 0.045);
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.stroke();
    roundRect(gx - p * 0.12, gy - p * 0.12, N * p + p * 0.24, N * p + p * 0.24, p * 0.3);
    ctx.fillStyle = "#0C0D10"; ctx.fill();

    // Halos first (added light, so neighboring glows mix), then every button's body on top.
    const hs = p * 2.1;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < N * N; i++) {
      const base = board[i] >= 0 ? COLORS[board[i]].hex : null, a = ovA[i];
      const x = cellX(i % N), y = cellY(Math.floor(i / N));
      const sc = popScale(i, t);
      if (base && a < 1) { ctx.globalAlpha = 1 - a * 0.6; ctx.drawImage(sprite("halo", base), x - hs * sc / 2, y - hs * sc / 2, hs * sc, hs * sc); }
      if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(sprite("halo", ovHex[i]), x - hs / 2, y - hs / 2, hs, hs); }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    for (let i = 0; i < N * N; i++) {
      const base = board[i] >= 0 ? COLORS[board[i]].hex : null, a = ovA[i];
      const x = cellX(i % N), y = cellY(Math.floor(i / N));
      const sc = popScale(i, t), bsz = p * sc;
      ctx.drawImage(base ? sprite("lit", base) : sprite("off", ""), x - bsz / 2, y - bsz / 2, bsz, bsz);
      if (a > 0) { ctx.globalAlpha = a; ctx.drawImage(sprite("lit", ovHex[i]), x - p / 2, y - p / 2, p, p); ctx.globalAlpha = 1; }
    }
    // Winding down at the end of play time: the whole board dims.
    if (dim < 1) { roundRect(bx, by, bs, bs, bs * 0.05); ctx.fillStyle = "rgba(10,12,24," + (1 - dim) * 0.75 + ")"; ctx.fill(); }
  }
  function popScale(i, t) {
    const u = (t - popAt[i]) / POP_MS;
    return u >= 0 && u < 1 ? 1 + 0.22 * (1 - u) * (1 - u) : 1;
  }
  function pop(i) { if (reduce) return; const t = now(); popAt[i] = t; popUntil = Math.max(popUntil, t + POP_MS); }

  // =====================================================================================================
  // Draw, fill and clear
  // =====================================================================================================
  // Buttons waiting to change color at a set time: the outward flood of Fill and the sweep of New.
  let pending = [];
  // The color each button was lit with (by a tap, a drag or Fill), where its color cycle ends.
  const cycleFrom = Int8Array.from(board);
  let cycling = false;
  function setCell(i, c) {
    if (board[i] === c) return false;
    board[i] = c; pop(i); dirty = true; saveSoon();
    if (c >= 0 && !cycling) cycleFrom[i] = c;
    return true;
  }
  function fillFrom(i) {
    const x0 = i % N, y0 = Math.floor(i / N), t = now(), speed = N / 1.2;
    pending = pending.filter((q) => q.c !== -1 || q.at < t);
    for (let k = 0; k < N * N; k++) {
      const d = Math.hypot(k % N - x0, Math.floor(k / N) - y0);
      pending.push({ i: k, c: color, at: t + d / speed * 1000 });
    }
    addEffect("ripple", x0, y0);
    snd.fill();
    ghost.learned("fill");
  }
  function clearBoard() {
    const t = now();
    pending = [];
    effects = effects.filter((e) => e.type === "wipe");
    for (let k = 0; k < N * N; k++) if (board[k] >= 0) pending.push({ i: k, c: -1, at: t + (Math.floor(k / N) + 1) / N * 900 });
    addEffect("wipe", 0, 0);
    snd.wipe();
  }
  function runPending(t) {
    if (!pending.length) return;
    pending = pending.filter((q) => { if (q.at > t) return true; setCell(q.i, q.c); return false; });
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  // Several fingers at once: each remembers the last button it crossed.
  const fingers = new Map();
  function local(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function paintAt(i) { if (setCell(i, color)) snd.blip(Math.floor(i / N)); }
  // A press on a lit button steps it to the next color, wrapping round, and turns it off once every color has
  // shown since it was lit.
  function cycleAt(i) {
    let next = (board[i] + 1) % COLORS.length;
    if (next === cycleFrom[i]) next = -1;
    cycling = true; setCell(i, next); cycling = false;
    if (next < 0) snd.off(); else { lastBlip = 0; snd.blip(Math.floor(i / N)); }
  }
  function showAt(i) {
    addEffect(effect, i % N, Math.floor(i / N));
    snd.show(effect);
    ghost.learned("show");
  }
  cv.addEventListener("pointerdown", (e) => {
    if (locked() || Toybox.isPalm(e)) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const pt = local(e), i = cellAt(pt.x, pt.y);
    if (i < 0) { coach.say("Tap a button on the board.", 3); return; }
    const f = { last: i, x: pt.x, y: pt.y, t: now(), moved: false };
    fingers.set(e.pointerId, f);
    if (job === "draw") { if (board[i] >= 0) cycleAt(i); else paintAt(i); }
    else if (job === "fill") fillFrom(i);
    else showAt(i);
    // The tab's instruction goes away once he has done it, so it never covers the bottom row.
    coach.clear();
  });
  cv.addEventListener("pointermove", (e) => {
    const f = fingers.get(e.pointerId);
    if (!f || locked() || job === "fill") return;
    const pt = local(e), d = Math.hypot(pt.x - f.x, pt.y - f.y), steps = Math.max(1, Math.ceil(d / (p * 0.4)));
    // Walk the finger's path in small steps so a fast drag still lights every button it crossed.
    for (let s = 1; s <= steps; s++) {
      const i = cellAt(f.x + (pt.x - f.x) * s / steps, f.y + (pt.y - f.y) * s / steps);
      if (i < 0 || i === f.last) continue;
      f.last = i; f.moved = true;
      if (job === "draw") paintAt(i);
      else if (now() - f.t > 150) { f.t = now(); showAt(i); }
    }
    f.x = pt.x; f.y = pt.y;
  });
  function lift(e) {
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    if (job === "draw") { ghost.learned("draw"); if (f.moved) ghost.learned("drag"); }
  }
  cv.addEventListener("pointerup", lift);
  cv.addEventListener("pointercancel", lift);
  ["gesturestart", "gesturechange"].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));

  // =====================================================================================================
  // Coach, ghost hand and panel
  // =====================================================================================================
  const coach = Toybox.coach($("coach"));
  const LINES = {
    draw: "Tap a button to light it up.",
    fill: "Tap a button to fill the board.",
    show: "Tap a button for a light show."
  };
  function vp(x, y) { const r = cv.getBoundingClientRect(); return [r.left + x, r.top + y]; }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || fingers.size) return null;
      const m = Math.floor(N / 2);
      if (job === "draw") {
        // Show the tap first; once he has tapped, show a drag along a row.
        if (ghost.shown("draw") < 1 || !ghost.shown("drag") && board.every((v) => v < 0)) return { pts: [vp(cellX(m - 1), cellY(m - 1))], tap: true, key: "draw" };
        return { pts: [vp(cellX(1), cellY(m)), vp(cellX(N - 2), cellY(m))], dur: 1800, key: "drag" };
      }
      return { pts: [vp(cellX(m), cellY(m - 1))], tap: true, key: job };
    }
  });
  function pic(rows) {
    const map = { r: "#FF4D4D", o: "#FF9A2E", y: "#FFE14D", g: "#4CD964", b: "#3D8BFF", p: "#A66BFF", k: "#FF6FC8", w: "#FFFFFF" };
    let s = '<svg viewBox="0 0 50 50"><rect x="1" y="1" width="48" height="48" rx="7" fill="#16171B" stroke="#1D2340" stroke-width="2"/>';
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      s += '<circle cx="' + (9 + x * 8) + '" cy="' + (9 + y * 8) + '" r="3.2" fill="' + (map[ch] || "#4E535B") + '"/>';
    }));
    return s + "</svg>";
  }
  const PICS = {
    draw: ["y....", ".y...", "..y..", "...y.", "....y"],
    fill: ["bbbbb", "bbbbb", "bbbbb", "bbbbb", "bbbbb"],
    show: ["y.y.y", ".ywy.", "yy.yy", ".y.y.", "y...y"],
    rainbow: ["..r..", "..o..", "..y..", "..g..", ".bwb."],
    ripple: [".bbb.", "b...b", "b.w.b", "b...b", ".bbb."],
    firework: ["r.r.r", ".rwr.", "r.r.r", "..y..", "..y.."],
    sparkle: ["w...y", "..k..", ".y..w", "w..k.", "..w.."],
    spin: [".kkk.", "k.w.k", "k.w.k", "k...k", ".kkk."],
    beams: ["..g..", "..g..", "ggwgg", "..g..", "..g.."]
  };

  Toybox.jobs($("jobs"), {
    jobs: [{ id: "draw", name: "Draw", pic: pic(PICS.draw) }, { id: "fill", name: "Fill", pic: pic(PICS.fill) },
      { id: "show", name: "Light show", pic: pic(PICS.show) }],
    value: job,
    onPick: (id) => pickJob(id)
  });
  Toybox.tiles($("colors"), {
    kind: "swatch", rows: 2, value: COLORS[color].id,
    items: COLORS.map((c) => ({ id: c.id, name: c.name, color: c.hex })),
    onPick: (id) => { color = COLORS.findIndex((c) => c.id === id); saveSoon(); }
  });
  Toybox.tiles($("effects"), {
    rows: 2, value: effect,
    items: EFFECTS.map((f) => ({ id: f.id, name: f.name, pic: pic(PICS[f.id]) })),
    onPick: (id) => { effect = id; saveSoon(); }
  });
  function pickJob(id) {
    job = id;
    $("colors").hidden = job === "show";
    $("effects").hidden = job !== "show";
    coach.step(LINES[job]);
    ghost.poke();
    saveSoon();
  }
  Toybox.bar($("bottom"), { onNew: clearBoard, onSurprise: surprise });

  // =====================================================================================================
  // Surprise
  // =====================================================================================================
  // Takes turns between three moments on the board; the picture is never changed.
  let surpriseNext = 0;
  function surprise() {
    if (locked()) return;
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    if (k === 0) { addEffect("wave", 0, 0); snd.show("rainbow"); }
    else if (k === 1) {
      for (let n = 0; n < 3; n++) {
        addEffect("firework", Math.floor(rnd(1, N - 1)), Math.floor(rnd(1, N * 0.6)), n * 0.7);
        setTimeout(() => snd.show("firework"), n * 700);
      }
    } else { addEffect("twinkle", 0, 0); snd.show("sparkle"); }
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now();
  function loop() {
    const t = now(), dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    runPending(t);
    if (dim !== dimTo) { dim += Math.sign(dimTo - dim) * Math.min(Math.abs(dimTo - dim), dt / 1.5); dirty = true; }
    if (dirty || effects.length || t < popUntil + 20) { dirty = false; draw(t); }
    requestAnimationFrame(loop);
  }
  function onEnding(done) {
    ending = true;
    fingers.clear(); pending = []; effects = [];
    dimTo = 0.3;
    setTimeout(done, 1600);
  }
  function restArt() {
    let s = '<svg class="rest-art" viewBox="0 0 100 100"><rect x="12" y="12" width="76" height="76" rx="6" fill="#16171B" stroke="#1D2340" stroke-width="2"/>';
    const lit = { 12: "#FFE14D", 13: "#FFE14D", 18: "#3D8BFF", 21: "#FF4D4D", 27: "#4CD964", 30: "#A66BFF", 34: "#FF9A2E", 35: "#FF9A2E" };
    for (let i = 0; i < 36; i++) {
      s += '<circle cx="' + (22 + (i % 6) * 11.2) + '" cy="' + (22 + Math.floor(i / 6) * 11.2) + '" r="4" fill="' + (lit[i] || "#3A3E45") + '" opacity="' + (lit[i] ? 0.75 : 1) + '"/>';
    }
    return s + "</svg>";
  }

  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  pickJob(job);
  Toybox.init({
    app: "glow-board",
    badge: $("tbadge"),
    timerIntro: "When time is up, the buttons dim and the controls lock.",
    goodbyeOption: "End with a “Goodnight, Glow Board” button to press",
    farewellText: "Time to switch off the lights",
    goodbyeLabel: "Goodnight, Glow Board",
    farewellDone: "Night night, Glow Board!",
    restLine: "The Glow Board is resting.",
    restLine2: "The picture will be right here next time.",
    restArt,
    soundNote: "Soft notes when buttons light up. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; dimTo = 1; },
    onSound: (on) => { if (on) snd.chime(); }
  });
  requestAnimationFrame(loop);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__glow = {
      state: () => ({ n: N, job, color: COLORS[color].id, effect, lit: board.filter((v) => v >= 0).length, effects: effects.length,
        pending: pending.length, coach: coach.text() }),
      pt: (x, y) => vp(cellX(x), cellY(y)),
      cell: (x, y) => (board[y * N + x] >= 0 ? COLORS[board[y * N + x]].id : null),
      ghost: () => ghost.show()
    };
  }
})();
