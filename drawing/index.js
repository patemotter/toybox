(function () {
  "use strict";
  // Drawing: three jobs on one big page.
  //   Color: a coloring page (drawing/pages.js). The line art sits on a layer above the color, so crayon and
  //          paint never cover the lines. The paint bucket fills the area under a tap; with "Stay in the lines"
  //          on, a stroke only colors the area where it started.
  //   Draw:  a blank page.
  //   Write: tracing a letter, digit or word (drawing/glyphs.js, drawing/words.js) one stroke at a time.
  // The drawer on the page's edge (right in landscape, bottom when upright) holds the jobs, tools, colors, the
  // job's choices, New and Surprise. Design: plans/drawing.md.
  //
  // Sections:
  //   Setup and saved state
  //   Sound
  //   Pictures
  //   Layout
  //   Coloring pages and line art
  //   Brushes and strokes
  //   Paint bucket and stay in the lines
  //   Write: building and tracing
  //   Write: drawing the guide
  //   Effects and Surprise
  //   Input
  //   Drawer
  //   Write picker
  //   Coach and ghost hand
  //   Jobs, New and saving
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const now = () => performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const stage = $("stage"), touchEl = $("touch");
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();
  const INK = "#1D2340";

  const COLORS = [
    { id: "red", name: "Red", hex: "#E8343A" }, { id: "orange", name: "Orange", hex: "#FF8A1F" },
    { id: "yellow", name: "Yellow", hex: "#FFD21F" }, { id: "lime", name: "Lime green", hex: "#8BD13A" },
    { id: "green", name: "Green", hex: "#1FA34A" }, { id: "teal", name: "Teal", hex: "#15B3A3" },
    { id: "sky", name: "Sky blue", hex: "#3DB4FF" }, { id: "blue", name: "Blue", hex: "#2B5FE0" },
    { id: "purple", name: "Purple", hex: "#8A4FE0" }, { id: "pink", name: "Pink", hex: "#FF6FB5" },
    { id: "brown", name: "Brown", hex: "#8B5A2B" }, { id: "gray", name: "Gray", hex: "#8C93A8" },
    { id: "white", name: "White", hex: "#FFFFFF" }, { id: "black", name: "Black", hex: "#16181F" }
  ];
  const TOOLS = [
    { id: "crayon", name: "Crayon" }, { id: "marker", name: "Marker" }, { id: "brush", name: "Paint brush" },
    { id: "bucket", name: "Paint bucket" }, { id: "eraser", name: "Eraser" }
  ];
  const JOBS = [{ id: "color", name: "Color" }, { id: "draw", name: "Draw" }, { id: "write", name: "Write" }];
  const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
  const DIGITS = "0123456789".split("");
  const SETS = [
    { id: "upper", name: "A-Z", title: "Pick a letter", items: UPPER, what: "letter" },
    { id: "lower", name: "a-z", title: "Pick a letter", items: LOWER, what: "letter" },
    { id: "digits", name: "0-9", title: "Pick a number", items: DIGITS, what: "number" },
    { id: "words", name: "Words", title: "Pick a group of words", items: null, what: "word" }
  ];
  const PAGES = (Array.isArray(window.DrawingPages) ? window.DrawingPages : []).filter((p) => p && p.id && typeof p.svg === "string");
  const GLYPHS = (window.DrawingGlyphs && window.DrawingGlyphs.glyphs) || {};
  const WORDS = window.DrawingWords || {};
  const CATS = Array.isArray(WORDS.categories) ? WORDS.categories.filter((c) => c && Array.isArray(c.words) && c.words.length) : [];
  const MOST = Array.isArray(WORDS.mostUsed) ? WORDS.mostUsed : [];
  const ALL = Array.isArray(WORDS.all) ? WORDS.all : [];

  const KEY = "drawing-v1";
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { saved = null; }
  const firstVisit = Toybox.fresh() || !saved || typeof saved !== "object" || Array.isArray(saved);
  if (firstVisit) saved = {};
  const has = (list, id) => list.some((x) => x.id === id);
  let job = has(JOBS, saved.job) ? saved.job : "color";
  let tool = has(TOOLS, saved.tool) ? saved.tool : "crayon";
  let color = has(COLORS, saved.color) ? saved.color : "red";
  let stay = saved.stay !== false;
  let pageId = PAGES.some((p) => p.id === saved.page) ? saved.page : (PAGES[0] ? PAGES[0].id : "");
  const sw = saved.write && typeof saved.write === "object" ? saved.write : {};
  let wSet = has(SETS, sw.set) ? sw.set : "upper";
  let wItem = typeof sw.item === "string" && sw.item && sw.item.length <= 30 ? sw.item : "A";
  // The word list Next walks through: { cat: category id | "most" | "az", letter: "a".."z" for "az" }.
  let wList = sw.list && typeof sw.list === "object" ? { cat: String(sw.list.cat || ""), letter: String(sw.list.letter || "") } : null;
  if (job === "draw" && tool === "bucket") tool = "crayon";

  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, job, tool, color, stay, page: pageId,
        write: { set: wSet, item: wItem, list: wList } }));
    } catch (e) { /* storage blocked */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(save, 400); }
  const colorHex = () => (COLORS.find((c) => c.id === color) || COLORS[0]).hex;

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
    s.buffer = noiseBuf; s.loop = true; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
  }
  let lastScratch = 0;
  const snd = {
    // A soft scratch while a tool moves on the paper: crayon is grainy, marker smooth, brush and eraser hushed.
    scratch(t) {
      const n = now(); if (n - lastScratch < 120) return; lastScratch = n;
      if (t === "crayon") noise(0.11, 2600, 0.03);
      else if (t === "marker") noise(0.1, 4200, 0.018);
      else if (t === "eraser") noise(0.12, 1200, 0.025);
      else noise(0.14, 900, 0.015);
    },
    pick() { tone(660, 660, 0.12, "sine", 0.04); },
    fill() { tone(300, 600, 0.35, "sine", 0.05); tone(600, 900, 0.3, "sine", 0.03, 0.12); },
    stroke() { tone(784, 784, 0.18, "sine", 0.045); tone(1047, 1047, 0.22, "sine", 0.035, 0.1); },
    done() { [523, 659, 784, 1047].forEach((f, k) => tone(f, f, 0.35, "sine", 0.04, k * 0.13)); },
    wipe() { noise(0.6, 1500, 0.03); tone(700, 300, 0.6, "sine", 0.02); },
    sparkle() { for (let k = 0; k < 5; k++) tone(1600 + k * 240, 1600 + k * 240, 0.12, "sine", 0.022, k * 0.2); },
    wobble() { tone(300, 450, 0.5, "triangle", 0.03); tone(450, 300, 0.5, "triangle", 0.03, 0.5); },
    open() { tone(440, 560, 0.15, "sine", 0.03); },
    chime() { tone(660, 660, 0.25, "sine", 0.05); tone(880, 880, 0.3, "sine", 0.04, 0.12); }
  };

  // =====================================================================================================
  // Pictures (small flat drawings with a 2 px ink outline, one per thing)
  // =====================================================================================================
  const S = (inner) => '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' + inner + "</svg>";
  const G = '<g stroke="#1D2340" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">';
  const TXT = (x, y, size, s, fill) => '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="Baloo 2, Trebuchet MS, sans-serif" font-weight="800" font-size="' +
    size + '" fill="' + (fill || INK) + '">' + s + "</text>";
  const PIC = {
    crayon: (c) => S(G + '<g transform="rotate(-40 24 24)"><path d="M5 18h28v12H5z" fill="' + c + '"/><path d="M33 18l10 6-10 6z" fill="' + c +
      '"/><path d="M11 18v12M27 18v12" fill="none"/><rect x="14" y="21.5" width="10" height="5" rx="1" fill="#FFFFFF" stroke="none" opacity="0.6"/></g></g>'),
    marker: (c) => S(G + '<g transform="rotate(-40 24 24)"><rect x="3" y="17" width="24" height="14" rx="3" fill="#F4F6FB"/><rect x="22" y="15.5" width="11" height="17" rx="2" fill="' +
      c + '"/><path d="M33 19l9 3v4l-9 3z" fill="' + c + '"/></g></g>'),
    brush: (c) => S(G + '<g transform="rotate(-40 24 24)"><rect x="1" y="21.5" width="21" height="5" rx="2.5" fill="#C98A4B"/><rect x="21" y="19.5" width="9" height="9" rx="1.5" fill="#C9D1E3"/>' +
      '<path d="M30 19.5c7 0 12 2.5 15 4.5c-3 2-8 4.5-15 4.5z" fill="' + c + '"/></g></g>'),
    bucket: (c) => S(G + '<path d="M9 8c3-6 21-6 24 0" fill="none"/><path d="M8 13h26l-3.5 28h-19z" fill="#C9D1E3"/><ellipse cx="21" cy="13" rx="13" ry="3.5" fill="' + c +
      '"/><path d="M34 15c4 2 6 6 5 11c-1 4-5 4-5 0c0-3 1-5 0-11z" fill="' + c + '"/></g>'),
    eraser: () => S(G + '<g transform="rotate(-32 24 24)"><rect x="6" y="15" width="36" height="18" rx="3" fill="#FF9EC2"/><path d="M26 15h13a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H26z" fill="#7FB8FF"/></g></g>'),
    color: () => S(G + '<rect x="7" y="4" width="34" height="40" rx="3" fill="#FFFFFF"/><path d="M24 11l3.6 7.6 8.2 1-6 5.6 1.6 8.2L24 29.4l-7.4 4 1.6-8.2-6-5.6 8.2-1z" fill="#FFD21F"/>' +
      '<path d="M24 11v18.4l-7.4 4 1.6-8.2-6-5.6 8.2-1z" fill="#FFFFFF"/></g>'),
    draw: () => S(G + '<rect x="7" y="4" width="34" height="40" rx="3" fill="#FFFFFF"/></g><path d="M12 30c4-12 8 4 12-6s7 8 12-4" fill="none" stroke="#E8343A" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M13 37c6-3 12-3 22 0" fill="none" stroke="#2B5FE0" stroke-width="3.5" stroke-linecap="round"/>'),
    write: () => S(G + '<rect x="4" y="7" width="40" height="34" rx="3" fill="#FFFFFF"/><path d="M8 33h32" fill="none" stroke="#3DB4FF"/></g>' + TXT(24, 32, 22, "Aa")),
    upper: () => S(G + '<rect x="2" y="8" width="44" height="32" rx="6" fill="#FFFFFF"/></g>' + TXT(24, 32, 18, "ABC")),
    lower: () => S(G + '<rect x="2" y="8" width="44" height="32" rx="6" fill="#FFFFFF"/></g>' + TXT(24, 31, 20, "abc")),
    digits: () => S(G + '<rect x="2" y="8" width="44" height="32" rx="6" fill="#FFFFFF"/></g>' + TXT(24, 32, 18, "123")),
    words: () => S(G + '<rect x="2" y="8" width="44" height="32" rx="6" fill="#FFFFFF"/></g>' + TXT(24, 31, 18, "cat", "#2B5FE0")),
    stay: (on) => S(G + '<rect x="2" y="7" width="44" height="34" rx="5" fill="#FFFFFF"/></g><path d="M8 31c4-8 10-12 ' + (on ? "16 -12" : "33 -15") +
      '" fill="none" stroke="#E8343A" stroke-width="7" stroke-linecap="' + (on ? "butt" : "round") + '"/><path d="M26 7v34" stroke="#1D2340" stroke-width="3"/>'),
    next: '<svg class="tb-ui-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
  };
  // The Words picker's group pictures.
  const CAT_PIC = {
    most: S(G + '<path d="M24 5l5.6 11.6 12.6 1.6-9.2 8.8 2.3 12.6L24 33.5l-11.3 6.1 2.3-12.6-9.2-8.8 12.6-1.6z" fill="#FFD21F"/></g>'),
    az: S(G + '<rect x="2" y="8" width="44" height="32" rx="6" fill="#FFFFFF"/></g>' + TXT(24, 32, 18, "A-Z")),
    animals: S(G + '<ellipse cx="24" cy="31" rx="10" ry="8" fill="#B07A4A"/><circle cx="12" cy="20" r="4.5" fill="#B07A4A"/><circle cx="19" cy="12" r="4.5" fill="#B07A4A"/>' +
      '<circle cx="29" cy="12" r="4.5" fill="#B07A4A"/><circle cx="36" cy="20" r="4.5" fill="#B07A4A"/></g>'),
    farm: S(G + '<path d="M6 20L24 7l18 13v22H6z" fill="#E8343A"/><path d="M18 42V28h12v14M18 28l12 14M30 28L18 42" fill="#FFFFFF"/></g>'),
    colors: S(G + '<circle cx="18" cy="19" r="10" fill="#E8343A"/><circle cx="30" cy="19" r="10" fill="#FFD21F"/><circle cx="24" cy="30" r="10" fill="#2B5FE0"/></g>'),
    shapes: S(G + '<circle cx="14" cy="15" r="8" fill="#FF8A1F"/><rect x="27" y="7" width="15" height="15" rx="1" fill="#3DB4FF"/><path d="M24 26l11 17H13z" fill="#8BD13A"/></g>'),
    feelings: S(G + '<path d="M24 41C10 31 5 24 5 17a9 9 0 0 1 19-4a9 9 0 0 1 19 4c0 7-5 14-19 24z" fill="#FF6FB5"/></g>'),
    people: S(G + '<circle cx="16" cy="14" r="6" fill="#F5C6A0"/><path d="M7 42c0-11 4-17 9-17s9 6 9 17z" fill="#3DB4FF"/><circle cx="33" cy="17" r="5" fill="#C98A4B"/>' +
      '<path d="M25 42c0-9 3-14 8-14s8 5 8 14z" fill="#FF8A1F"/></g>'),
    body: S(G + '<path d="M14 44V22a3 3 0 0 1 6 0v-14a3 3 0 0 1 6 0v12a3 3 0 0 1 6 0v3a3 3 0 0 1 6 0v10c0 6-4 11-10 11z" fill="#F5C6A0"/><path d="M14 30l-4-5a3 3 0 0 0-4 4l8 10" fill="#F5C6A0"/></g>'),
    food: S(G + '<path d="M24 14c-8-4-17 1-17 11c0 10 8 18 12 18c2 0 3-1 5-1s3 1 5 1c4 0 12-8 12-18c0-10-9-15-17-11z" fill="#E8343A"/><path d="M24 14c0-4 2-8 6-9" fill="none"/>' +
      '<path d="M25 10c3-4 8-4 10-2c-3 3-7 3-10 2z" fill="#1FA34A"/></g>'),
    nature: S(G + '<rect x="21" y="30" width="6" height="13" fill="#8B5A2B"/><circle cx="24" cy="19" r="14" fill="#1FA34A"/></g>'),
    home: S(G + '<path d="M5 22L24 6l19 16" fill="none"/><path d="M10 19v23h28V19L24 8z" fill="#FFD21F"/><rect x="20" y="28" width="8" height="14" fill="#8B5A2B"/></g>'),
    machines: S(G + '<path d="M21 4h6l1 5 4 2 5-3 4 4-3 5 2 4 5 1v6l-5 1-2 4 3 5-4 4-5-3-4 2-1 5h-6l-1-5-4-2-5 3-4-4 3-5-2-4-5-1v-6l5-1 2-4-3-5 4-4 5 3 4-2z" fill="#8C93A8"/>' +
      '<circle cx="24" cy="24" r="6" fill="#FFFFFF"/></g>'),
    tools: S(G + '<g transform="rotate(-40 24 24)"><rect x="21" y="16" width="6" height="30" rx="2" fill="#C98A4B"/><path d="M10 6h24v10H10z" fill="#8C93A8"/><path d="M34 6l6 3v4l-6 3z" fill="#8C93A8"/></g></g>'),
    space: S(G + '<path d="M24 3c8 6 10 16 8 27H16C14 19 16 9 24 3z" fill="#F4F6FB"/><circle cx="24" cy="17" r="4" fill="#3DB4FF"/><path d="M16 26l-6 8v4l7-4M32 26l6 8v4l-7-4" fill="#E8343A"/>' +
      '<path d="M19 30l5 12 5-12" fill="#FF8A1F"/></g>'),
    places: S(G + '<path d="M24 44S9 28 9 18a15 15 0 0 1 30 0c0 10-15 26-15 26z" fill="#E8343A"/><circle cx="24" cy="18" r="6" fill="#FFFFFF"/></g>'),
    numbers: S(G + '<rect x="2" y="8" width="44" height="32" rx="6" fill="#FFFFFF"/></g>' + TXT(24, 32, 18, "123", "#1FA34A")),
    time: S(G + '<circle cx="24" cy="24" r="19" fill="#FFFFFF"/><path d="M24 12v12l8 5" fill="none" stroke-width="3"/></g>'),
    "doing-words": S(G + '<circle cx="30" cy="30" r="11" fill="#FF8A1F"/><path d="M5 18h12M3 26h11M6 34h8" fill="none" stroke-width="3"/></g>'),
    other: S(G + '<rect x="9" y="5" width="30" height="38" rx="3" fill="#3DB4FF"/><path d="M15 14h18M15 21h18M15 28h12" fill="none" stroke="#FFFFFF" stroke-width="3"/></g>')
  };
  const toolPic = (id, c) => PIC[id](c || colorHex());
  const svgUrl = (inner, size) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="' + size + '" height="' + size + '">' + inner + "</svg>");

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  const colorSheet = $("colorSheet"), drawSheet = $("drawSheet");
  const colorPaint = $("colorPaint"), colorLines = $("colorLines"), drawPaint = $("drawPaint");
  const guide = $("guide"), fx = $("fx");
  const gctx = guide.getContext("2d"), fctx = fx.getContext("2d");
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const scr = window.screen || { width: innerWidth, height: innerHeight };
  // The sheets keep one fixed resolution for the whole visit, so turning the device only scales them on screen and
  // never loses or blurs what he has made. Color's page is a square that fits the short side; Draw's sheet is a
  // square that covers the long side, so drawings survive turning (a part may go out of view and come back).
  const KC = clamp(Math.round(Math.min(scr.width, scr.height) * DPR), 600, 1600);
  const KD = clamp(Math.round(Math.max(scr.width, scr.height) * DPR), 800, 2048);
  colorPaint.width = colorPaint.height = colorLines.width = colorLines.height = KC;
  drawPaint.width = drawPaint.height = KD;
  const cpx = colorPaint.getContext("2d"), clx = colorLines.getContext("2d", { willReadFrequently: true });
  const dpx = drawPaint.getContext("2d");
  const scratch = document.createElement("canvas");
  scratch.width = scratch.height = KC;
  const sctx = scratch.getContext("2d");

  let W = 1, H = 1, side = true, stageBox = { left: 0, top: 0 };
  let colorRect = { x: 0, y: 0, s: 1 }, drawRect = { x: 0, y: 0, s: 1 };
  function resize() {
    W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight);
    measure();
    side = W > H * 1.05;
    document.body.classList.toggle("dr-side", side);
    document.body.classList.toggle("dr-low", !side);
    drawerEl.classList.toggle("side", side);
    drawerEl.classList.toggle("low", !side);
    const pad = 16, hw = handleSize() + 8;
    const aw = W - pad * 2 - (side ? hw * 2 : 0), ah = H - pad * 2 - (side ? 0 : hw);
    const s = Math.max(80, Math.min(aw, ah));
    colorRect = { x: (W - s) / 2, y: pad + (ah - s) / 2, s };
    place(colorSheet, colorRect);
    const ds = Math.max(W, H);
    drawRect = { x: (W - ds) / 2, y: (H - ds) / 2, s: ds };
    place(drawSheet, drawRect);
    [guide, fx].forEach((c) => { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); });
    if (T) T.snap = true;
  }
  function place(el, r) {
    el.style.left = r.x + "px"; el.style.top = r.y + "px"; el.style.width = r.s + "px"; el.style.height = r.s + "px";
  }
  // The stage's padding box in viewport px (where the canvases and the touch layer sit).
  function measure() {
    const r = stage.getBoundingClientRect();
    stageBox = { left: r.left + stage.clientLeft, top: r.top + stage.clientTop };
  }
  function cssPx(name, fb) {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return v > 0 ? v : fb;
  }
  const handleSize = () => cssPx("--dr-handle", 56);
  const vp = (x, y) => [stageBox.left + x, stageBox.top + y];

  // =====================================================================================================
  // Coloring pages and line art
  // =====================================================================================================
  // lab[i] is the area number of sheet pixel i (row * KC + column): -1 on a line, 1.. for the closed areas.
  // regions[n] = { area, x0, y0, x1, y1, border, cover, filled } for area n.
  let lab = null, regions = [], pageToken = 0, colorPainted = false;
  const maskCache = new Map();
  const pageSnaps = new Map();          // page id -> Blob of its coloring, for going back to a page this visit
  const kindGiven = new Set();
  function loadPage(id, restore) {
    const p = PAGES.find((q) => q.id === id);
    const tok = ++pageToken;
    lab = null; regions = []; maskCache.clear(); colorPainted = false;
    clx.clearRect(0, 0, KC, KC); cpx.clearRect(0, 0, KC, KC);
    if (!p) return;
    const img = new Image();
    img.onload = () => {
      if (tok !== pageToken) return;
      clx.clearRect(0, 0, KC, KC);
      clx.drawImage(img, 0, 0, KC, KC);
      labelPage();
    };
    img.src = svgUrl(p.svg, KC);
    const blob = restore && pageSnaps.get(id);
    if (blob) {
      const url = URL.createObjectURL(blob), im = new Image();
      im.onload = () => { if (tok === pageToken) { cpx.drawImage(im, 0, 0, KC, KC); colorPainted = true; } URL.revokeObjectURL(url); };
      im.src = url;
    }
  }
  function snapPage() {
    if (!colorPainted || !pageId || !colorPaint.toBlob) return;
    const id = pageId;
    try { colorPaint.toBlob((b) => { if (b) pageSnaps.set(id, b); }); } catch (e) { /* ignore */ }
  }
  // Numbers every closed area of the rendered line art with a breadth-first flood, once per page.
  function labelPage() {
    const K = KC, N = K * K, img = clx.getImageData(0, 0, K, K).data;
    const L = new Int32Array(N);
    for (let i = 0; i < N; i++) if (img[i * 4 + 3] >= 110) L[i] = -1;
    const q = new Int32Array(N);
    const regs = [null];
    for (let s = 0; s < N; s++) {
      if (L[s] !== 0) continue;
      const id = regs.length;
      let head = 0, tail = 0, x0 = K, y0 = K, x1 = 0, y1 = 0, border = false;
      q[tail++] = s; L[s] = id;
      while (head < tail) {
        const p = q[head++], y = (p / K) | 0, x = p - y * K;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x === 0 || y === 0 || x === K - 1 || y === K - 1) border = true;
        if (x > 0 && L[p - 1] === 0) { L[p - 1] = id; q[tail++] = p - 1; }
        if (x < K - 1 && L[p + 1] === 0) { L[p + 1] = id; q[tail++] = p + 1; }
        if (y > 0 && L[p - K] === 0) { L[p - K] = id; q[tail++] = p - K; }
        if (y < K - 1 && L[p + K] === 0) { L[p + K] = id; q[tail++] = p + K; }
      }
      regs.push({ area: tail, x0, y0, x1, y1, border, cover: 0, filled: false });
    }
    lab = L; regions = regs;
  }
  // The area under a sheet point; a press on a line or a speck between lines takes the nearest real area.
  function labelNear(p, rad) {
    if (!lab) return 0;
    const K = KC, px = Math.round(p[0]), py = Math.round(p[1]);
    const ok = (x, y) => {
      if (x < 0 || y < 0 || x >= K || y >= K) return 0;
      const l = lab[y * K + x];
      return l > 0 && regions[l].area > 40 ? l : 0;
    };
    let l = ok(px, py);
    if (l) return l;
    for (let r = 2; r <= rad; r += 2) {
      for (let k = 0; k < 16; k++) {
        const a = k * TAU / 16;
        l = ok(Math.round(px + Math.cos(a) * r), Math.round(py + Math.sin(a) * r));
        if (l) return l;
      }
    }
    return 0;
  }

  // =====================================================================================================
  // Brushes and strokes
  // =====================================================================================================
  // Widths in CSS px, a little wider on bigger screens.
  const WIDTH = { crayon: 15, marker: 12, brush: 38, eraser: 44 };
  const toolWidth = (t) => WIDTH[t] * clamp(Math.min(W, H) / 380, 1, 1.5);
  // Crayon: wax with small bare specks, as a canvas pattern. The specks are fixed to the sheet, so overlapping
  // stroke pieces line up and the joins never show darker beads.
  const grains = new Map();
  function crayonPattern(ctx, hex) {
    let g = grains.get(hex);
    if (!g) {
      const n = 96, c = document.createElement("canvas"); c.width = c.height = n;
      const x = c.getContext("2d"), id = x.createImageData(n, n), d = id.data;
      const v = parseInt(hex.slice(1), 16), r = v >> 16, gg = (v >> 8) & 255, b = v & 255;
      for (let yy = 0; yy < n; yy += 2) for (let xx = 0; xx < n; xx += 2) {
        const hole = Math.random() < 0.13, light = Math.random() * 0.1;
        for (let k = 0; k < 4; k++) {
          const i = ((yy + (k >> 1)) * n + xx + (k & 1)) * 4;
          d[i] = r + (255 - r) * light; d[i + 1] = gg + (255 - gg) * light; d[i + 2] = b + (255 - b) * light; d[i + 3] = hole ? 0 : 255;
        }
      }
      x.putImageData(id, 0, 0);
      g = c; grains.set(hex, g);
    }
    return ctx.createPattern(g, "repeat");
  }
  // Paint brush: one soft round dab, stamped close together along the stroke.
  const dabs = new Map();
  function dabOf(hex) {
    let c = dabs.get(hex);
    if (!c) {
      c = document.createElement("canvas"); c.width = c.height = 64;
      const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      const v = parseInt(hex.slice(1), 16), rgb = (v >> 16) + "," + ((v >> 8) & 255) + "," + (v & 255);
      g.addColorStop(0, "rgba(" + rgb + ",0.5)"); g.addColorStop(0.55, "rgba(" + rgb + ",0.3)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      dabs.set(hex, c);
    }
    return c;
  }
  const fingers = new Map();
  function sheetNow() {
    return job === "color" ? { ctx: cpx, rect: colorRect, K: KC } : { ctx: dpx, rect: drawRect, K: KD };
  }
  const toSheet = (sh, x, y) => [(x - sh.rect.x) * sh.K / sh.rect.s, (y - sh.rect.y) * sh.K / sh.rect.s];
  function startStroke(id, x, y) {
    const sh = sheetNow(), k = sh.K / sh.rect.s, p = toSheet(sh, x, y);
    const f = { sh, k, tool, hex: colorHex(), w: toolWidth(tool) * k, f: p.slice(), last: p.slice(), mid: p.slice(), raw: p.slice(),
      mask: null, carry: 0, moved: false };
    if (job === "color" && stay && lab) {
      const l = labelNear(p, 10 * k);
      if (l) f.mask = regionMask(l);
    }
    fingers.set(id, f);
    segment(f, p, p, p);
    if (job === "color") colorPainted = true; else drawPainted = true;
  }
  function moveStroke(f, x, y) {
    const p = toSheet(f.sh, x, y);
    f.raw = p;
    // A light smoothing filter, then curves through the midpoints, so a wobbly finger still draws a clean line.
    f.f[0] += (p[0] - f.f[0]) * 0.6; f.f[1] += (p[1] - f.f[1]) * 0.6;
    if (Math.hypot(f.f[0] - f.last[0], f.f[1] - f.last[1]) < 1.5 * f.k) return;
    const mid = [(f.last[0] + f.f[0]) / 2, (f.last[1] + f.f[1]) / 2];
    segment(f, f.mid, f.last, mid);
    f.mid = mid; f.last = f.f.slice(); f.moved = true;
    snd.scratch(f.tool);
  }
  function endStroke(f) {
    if (f.moved) segment(f, f.mid, f.last, f.raw);
  }
  // Draws one piece of a stroke: the curve from a to b with control point c (all in sheet px). With "Stay in the
  // lines", the piece is drawn on the scratch canvas, cut to the area's mask, then put on the page.
  function segment(f, a, c, b) {
    const pad = f.w / 2 + 4;
    let x0 = Math.floor(Math.min(a[0], b[0], c[0]) - pad), y0 = Math.floor(Math.min(a[1], b[1], c[1]) - pad);
    let x1 = Math.ceil(Math.max(a[0], b[0], c[0]) + pad), y1 = Math.ceil(Math.max(a[1], b[1], c[1]) + pad);
    const K = f.sh.K;
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(K, x1); y1 = Math.min(K, y1);
    const m = f.mask;
    if (m) { x0 = Math.max(x0, m.x); y0 = Math.max(y0, m.y); x1 = Math.min(x1, m.x + m.w); y1 = Math.min(y1, m.y + m.h); }
    if (x1 <= x0 || y1 <= y0) return;
    const w = x1 - x0, h = y1 - y0;
    if (!m) { render(f.sh.ctx, f, a, c, b, f.tool === "eraser"); trackCover(f, a, b); return; }
    sctx.save();
    sctx.beginPath(); sctx.rect(x0, y0, w, h); sctx.clip();
    sctx.clearRect(x0, y0, w, h);
    render(sctx, f, a, c, b, false);
    sctx.globalCompositeOperation = "destination-in";
    sctx.drawImage(m.c, x0 - m.x, y0 - m.y, w, h, x0, y0, w, h);
    sctx.restore();
    const pc = f.sh.ctx;
    pc.save();
    if (f.tool === "eraser") pc.globalCompositeOperation = "destination-out";
    pc.drawImage(scratch, x0, y0, w, h, x0, y0, w, h);
    pc.restore();
    trackCover(f, a, b);
  }
  function render(ctx, f, a, c, b, erase) {
    const t = f.tool;
    if (t === "brush") {
      // Stamp dabs every few px along the curve, carrying the leftover distance into the next piece.
      const dab = dabOf(f.hex), step = Math.max(1, f.w * 0.1), len = Math.hypot(c[0] - a[0], c[1] - a[1]) + Math.hypot(b[0] - c[0], b[1] - c[1]);
      const n = Math.max(1, Math.ceil(len / 1.5));
      let px = a[0], py = a[1];
      if (len < 0.5) { ctx.drawImage(dab, a[0] - f.w / 2, a[1] - f.w / 2, f.w, f.w); return; }
      for (let i = 1; i <= n; i++) {
        const s = i / n, u = 1 - s;
        const x = u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], y = u * u * a[1] + 2 * u * s * c[1] + s * s * b[1];
        f.carry += Math.hypot(x - px, y - py); px = x; py = y;
        while (f.carry >= step) { f.carry -= step; ctx.drawImage(dab, x - f.w / 2, y - f.w / 2, f.w, f.w); }
      }
      return;
    }
    ctx.save();
    if (erase) ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = f.w;
    ctx.strokeStyle = t === "crayon" ? crayonPattern(ctx, f.hex) : t === "eraser" ? "#000000" : f.hex;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]);
    if (Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) < 0.01) ctx.lineTo(a[0] + 0.05, a[1]);
    else ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
    ctx.stroke();
    if (t === "crayon") {
      // A ragged waxy edge: a few flecks just outside the stroke.
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / (f.w * 0.3)));
      const nx = len ? -(b[1] - a[1]) / len : 0, ny = len ? (b[0] - a[0]) / len : 1;
      ctx.fillStyle = f.hex; ctx.globalAlpha = 0.75;
      for (let i = 0; i < n; i++) {
        const s = Math.random(), side2 = Math.random() < 0.5 ? -1 : 1, off = (f.w / 2) * (0.85 + Math.random() * 0.25) * side2;
        const r = f.w * (0.04 + Math.random() * 0.06);
        ctx.fillRect(a[0] + (b[0] - a[0]) * s + nx * off - r, a[1] + (b[1] - a[1]) * s + ny * off - r, r * 2, r * 2);
      }
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Paint bucket and stay in the lines
  // =====================================================================================================
  // An area's mask: opaque where the area is, reaching 2 px in under the lines so no white seam shows at their edge.
  function regionMask(l) {
    let m = maskCache.get(l);
    if (m) return m;
    const K = KC, r = regions[l], pad = 3;
    const x = Math.max(0, r.x0 - pad), y = Math.max(0, r.y0 - pad);
    const w = Math.min(K, r.x1 + pad + 1) - x, h = Math.min(K, r.y1 + pad + 1) - y;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const cx = c.getContext("2d"), id = cx.createImageData(w, h), d = id.data;
    for (let yy = 0; yy < h; yy++) {
      const row = (y + yy) * K;
      for (let xx = 0; xx < w; xx++) {
        const p = row + x + xx, v = lab[p];
        let on = v === l;
        if (!on && v === -1) {
          for (let dy = -2; dy <= 2 && !on; dy++) {
            const yy2 = y + yy + dy; if (yy2 < 0 || yy2 >= K) continue;
            for (let dx = -2; dx <= 2; dx++) {
              const xx2 = x + xx + dx; if (xx2 < 0 || xx2 >= K) continue;
              if (lab[yy2 * K + xx2] === l) { on = true; break; }
            }
          }
        }
        if (on) { const i = (yy * w + xx) * 4; d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255; }
      }
    }
    cx.putImageData(id, 0, 0);
    m = { c, x, y, w, h, l };
    maskCache.set(l, m);
    if (maskCache.size > 16) maskCache.delete(maskCache.keys().next().value);
    return m;
  }
  let fills = [];
  function bucketAt(x, y) {
    const sh = sheetNow(), p = toSheet(sh, x, y);
    if (!lab) return;
    const l = labelNear(p, 14 * sh.K / sh.rect.s);
    if (!l) { sparkleAt(x, y, 8); coach.say("Tap inside the picture.", 3); return; }
    const m = regionMask(l), c = document.createElement("canvas");
    c.width = m.w; c.height = m.h;
    const cx = c.getContext("2d");
    cx.drawImage(m.c, 0, 0);
    cx.globalCompositeOperation = "source-in";
    cx.fillStyle = colorHex(); cx.fillRect(0, 0, m.w, m.h);
    const far = Math.max(Math.hypot(p[0] - m.x, p[1] - m.y), Math.hypot(p[0] - m.x - m.w, p[1] - m.y),
      Math.hypot(p[0] - m.x, p[1] - m.y - m.h), Math.hypot(p[0] - m.x - m.w, p[1] - m.y - m.h));
    fills.push({ c, m, cx: p[0], cy: p[1], far, t0: now(), dur: reduce ? 1 : 700 });
    colorPainted = true;
    regions[l].filled = true;
    addFx({ kind: "ring", x, y, color: colorHex(), life: 0.9 });
    snd.fill();
    checkPageDone();
  }
  // The fill spreads out from the tap as a growing circle.
  function runFills(t) {
    fills = fills.filter((f) => {
      const u = clamp((t - f.t0) / f.dur, 0, 1), r = f.far * (1 - (1 - u) * (1 - u)) + 2;
      cpx.save(); cpx.beginPath(); cpx.arc(f.cx, f.cy, r, 0, TAU); cpx.clip();
      cpx.drawImage(f.c, f.m.x, f.m.y);
      cpx.restore();
      return u < 1;
    });
  }
  // A rough count of how much of each area has been colored: each stroke piece adds its length times its width to
  // the area under it. The page counts as finished when most of its real areas are colored.
  function trackCover(f, a, b) {
    if (job !== "color" || !lab || f.tool === "eraser") return;
    const x = Math.round(b[0]), y = Math.round(b[1]);
    if (x < 0 || y < 0 || x >= KC || y >= KC) return;
    const l = f.mask ? f.mask.l : lab[y * KC + x];
    if (l <= 0) return;
    const r = regions[l];
    r.cover += Math.max(f.w * 0.5, Math.hypot(b[0] - a[0], b[1] - a[1])) * f.w * (f.tool === "brush" ? 0.7 : 1);
    if (!r.filled && r.cover > r.area * 0.6) { r.filled = true; checkPageDone(); }
  }
  function checkPageDone() {
    if (kindGiven.has(pageId)) return;
    const real = regions.filter((r) => r && !r.border && r.area > KC * KC * 0.0015);
    if (!real.length) return;
    const done = real.filter((r) => r.filled).length;
    if (done / real.length >= 0.75) {
      kindGiven.add(pageId);
      setTimeout(() => { sparkleLines(); snd.done(); Toybox.kind(); }, 500);
    }
  }

  // =====================================================================================================
  // Write: building and tracing
  // =====================================================================================================
  // T is the item being traced: its letters with strokes resampled to even spacing (in glyph units, laid out
  // along the word), where he is (letter li, stroke si, prog units along it), and the view (unit size u in px,
  // camX the word's x at the left edge of the writing area).
  let T = null, traceFinger = null;
  const LETTER_GAP = 0.14, LOOK = 0.2;
  // Even spacing along a polyline; cum[i] is the distance along the path to pts[i].
  function resample(pts, step) {
    const out = [[pts[0][0], pts[0][1]]], cum = [0];
    let need = step, total = 0;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1], d = Math.hypot(bx - ax, by - ay);
      let pos = 0;
      while (d - pos >= need) {
        pos += need; total += need; need = step;
        out.push([ax + (bx - ax) * pos / d, ay + (by - ay) * pos / d]); cum.push(total);
      }
      need -= d - pos; total += d - pos;
    }
    const last = pts[pts.length - 1], lp = out[out.length - 1];
    if (Math.hypot(last[0] - lp[0], last[1] - lp[1]) > 1e-6) { out.push([last[0], last[1]]); cum.push(total); }
    return { pts: out, cum, len: total };
  }
  function buildTrace(text) {
    const letters = [];
    let x = 0, maxY = 1;
    for (const ch of text) {
      const g = GLYPHS[ch];
      if (!g || !Array.isArray(g.strokes)) { x += 0.4; continue; }
      const strokes = g.strokes.filter((s) => Array.isArray(s) && s.length).map((s) => resample(s.map((q) => [q[0] + x, q[1]]), 0.012));
      strokes.forEach((s) => s.pts.forEach((q) => { if (q[1] > maxY) maxY = q[1]; }));
      letters.push({ ch, x0: x, w: g.w || 0.6, strokes });
      x += (g.w || 0.6) + LETTER_GAP;
    }
    const t = { text, letters, totalW: Math.max(0.3, x - LETTER_GAP), band: Math.min(1.4, maxY + 0.05), li: 0, si: 0, prog: 0, done: false,
      fails: 0, ghosted: false, assist: false, gain: 0, last: null, view: null, snap: true, missed: 0 };
    skipEmpty(t);
    return t;
  }
  function skipEmpty(t) {
    while (t.li < t.letters.length && t.si >= t.letters[t.li].strokes.length) { t.li++; t.si = 0; }
    if (t.li >= t.letters.length) t.done = true;
  }
  const curStroke = () => (T && !T.done ? T.letters[T.li].strokes[T.si] : null);
  const isWordItem = () => wSet === "words";
  function startTrace() {
    T = buildTrace(wItem);
    traceFinger = null;
    $("next").hidden = true;
    stripUpdate();
    if (job === "write") traceLine();
    if (T.done) finishItem(true);
  }
  // The writing area and the view (u, camX) it wants now.
  function writeArea() {
    const hs = handleSize() + 10, top = 16 + (isWordItem() ? 40 : 0);
    const bottom = H - (H < 450 ? 48 : 84) - (side ? 0 : hs), left = 20, right = W - 20 - (side ? hs : 0);
    return { x: left, y: top, w: Math.max(60, right - left), h: Math.max(60, bottom - top) };
  }
  function targetView() {
    const a = writeArea(), hU = a.h / T.band, many = T.letters.length > 1;
    const fit = Math.min(hU, a.w * (many ? 1 : 0.86) / T.totalW);
    // A long word keeps its letters big enough to trace and slides along instead of shrinking.
    const u = !many || T.done ? fit : Math.min(hU, Math.max(fit, Math.min(a.w * 0.7, 380)));
    const viewW = a.w / u;
    let camX;
    if (T.totalW <= viewW + 1e-6) camX = (T.totalW - viewW) / 2;
    else {
      const L = T.letters[Math.min(T.li, T.letters.length - 1)];
      camX = clamp(L.x0 + L.w / 2 - viewW / 2, 0, T.totalW - viewW);
    }
    return { u, camX, ox: a.x, oy: a.y + (a.h - T.band * u) / 2 };
  }
  function stepView(dt) {
    const tv = targetView();
    if (!T.view || T.snap || reduce) { T.view = tv; T.snap = false; return; }
    const k = 1 - Math.exp(-dt * 5), v = T.view;
    v.u += (tv.u - v.u) * k; v.camX += (tv.camX - v.camX) * k; v.ox = tv.ox; v.oy += (tv.oy - v.oy) * k;
  }
  const sx = (x) => T.view.ox + (x - T.view.camX) * T.view.u;
  const sy = (y) => T.view.oy + y * T.view.u;
  function pointAt(st, d) {
    const c = st.cum, n = c.length;
    if (d <= 0 || n < 2) return st.pts[0];
    if (d >= st.len) return st.pts[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] <= d) lo = mid; else hi = mid; }
    const s = (d - c[lo]) / Math.max(1e-9, c[hi] - c[lo]), p = st.pts[lo], q = st.pts[hi];
    return [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
  }
  function snapUnits() { return cssPx("--tb-key", 120) / T.view.u; }
  // Moves the progress forward if the finger is near the next stretch of the stroke. Only the stretch just ahead
  // of the progress point counts (LOOK units), never the nearest point anywhere on the stroke, because some
  // strokes run back over their own line (n goes down its stem and back up it). A small penalty for distance
  // along the path picks the stretch right ahead when two pieces of the path lie on top of each other.
  function advance(px, py, movedPx) {
    const st = curStroke(); if (!st) return;
    const v = T.view, fxu = v.camX + (px - v.ox) / v.u, fyu = (py - v.oy) / v.u, R = snapUnits();
    const before = T.prog;
    if (T.assist) {
      // Auto-assist: the stroke finishes along with his finger, wherever it moves.
      T.prog = Math.min(st.len, T.prog + movedPx / v.u * 0.9);
    } else if (st.len < 0.1) {
      if (st.pts.some((q) => Math.hypot(q[0] - fxu, q[1] - fyu) <= R)) T.prog = st.len;
    } else {
      const c = st.cum;
      let i = 0;
      while (i < c.length - 1 && c[i + 1] <= T.prog) i++;
      let best = -1, bestScore = Infinity;
      for (; i < c.length && c[i] <= T.prog + LOOK; i++) {
        const d = Math.hypot(st.pts[i][0] - fxu, st.pts[i][1] - fyu);
        if (d > R) continue;
        const score = d + 0.3 * (c[i] - T.prog);
        if (score < bestScore) { bestScore = score; best = i; }
      }
      if (best >= 0 && c[best] > T.prog) T.prog = c[best];
    }
    const gain = T.prog - before;
    if (gain > 0) { T.gain += gain; snd.scratch("marker"); }
    if (st.len - T.prog < 0.03) finishStroke();
  }
  function traceDown(id, x, y) {
    if (T.done) { sparkleAt(x, y, 10); snd.sparkle(); return; }
    if (traceFinger != null) return;
    traceFinger = id; T.gain = 0; T.last = [x, y];
    advance(x, y, 0);
  }
  function traceMove(x, y) {
    if (!T.last) return;
    const d = Math.hypot(x - T.last[0], y - T.last[1]), n = Math.max(1, Math.ceil(d / Math.max(4, T.view.u * 0.06)));
    for (let k = 1; k <= n && !T.done; k++) {
      advance(T.last[0] + (x - T.last[0]) * k / n, T.last[1] + (y - T.last[1]) * k / n, d / n);
    }
    T.last = [x, y];
  }
  function traceUp() {
    traceFinger = null;
    if (!T || T.done) return;
    if (T.gain < 0.02) {
      // A try without progress: after the ghost hand has shown the stroke, or after three tries, the next try
      // finishes the stroke along with his finger.
      T.fails++;
      if ((T.ghosted && T.fails >= 1) || T.fails >= 3) T.assist = true;
      if (T.prog === 0 && T.fails >= 2) coach.say("Put your finger on the green dot.", 4);
    }
    T.last = null;
  }
  function finishStroke() {
    const st = curStroke();
    T.prog = st.len;
    const end = st.pts[st.pts.length - 1];
    sparkleAt(sx(end[0]), sy(end[1]), 6);
    ghost.learned(strokeKey());
    T.si++; T.prog = 0; T.fails = 0; T.ghosted = false; T.assist = false; T.gain = 0;
    const li = T.li;
    skipEmpty(T);
    if (T.done) { finishItem(false); return; }
    if (T.li !== li) { letterSparkle(T.letters[li]); snd.done(); } else snd.stroke();
    stripUpdate();
    traceLine();
  }
  function finishItem(quiet) {
    T.done = true;
    traceFinger = null;
    stripUpdate();
    if (!quiet) {
      T.letters.forEach((L, k) => setTimeout(() => letterSparkle(L), k * 160));
      snd.done();
      if (isWordItem() && T.letters.length > 1) Toybox.kind();
    }
    const next = $("next");
    next.hidden = false;
    next.innerHTML = PIC.next + "<span>Next</span>";
    next.setAttribute("aria-label", "Next " + (SETS.find((s) => s.id === wSet) || SETS[0]).what);
    coachLine("Tap Next for the next " + (SETS.find((s) => s.id === wSet) || SETS[0]).what + ".");
    const tv = targetView(), mid = vp(W / 2, tv.oy + T.band * tv.u * 0.5);
    coach.avoid(mid[0], mid[1]);
  }
  const strokeKey = () => "trace:" + (T ? T.text + ":" + T.li + ":" + T.si : "");
  // The instruction for the current stroke, from the way it starts.
  function traceLine() {
    const st = curStroke(); if (!st) return;
    let text;
    if (st.len < 0.1) text = "Tap the green dot.";
    else {
      const a = st.pts[0], b = pointAt(st, Math.min(st.len, 0.12)), c = pointAt(st, Math.min(st.len, 0.3));
      const a1 = Math.atan2(b[1] - a[1], b[0] - a[0]), a2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
      let turn = Math.abs(a2 - a1); if (turn > Math.PI) turn = TAU - turn;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      // A stroke that turns back on itself at once (n, r, h: down the stem and back up) starts as a line.
      if (turn > 0.5 && turn < 2.6 && st.len > 0.5) text = "Trace the curve from the green dot.";
      else if (dy > Math.abs(dx) * 0.5) text = "Trace the line down from the green dot.";
      else if (-dy > Math.abs(dx) * 0.5) text = "Trace the line up from the green dot.";
      else if (dx > 0) text = "Trace the line across from the green dot.";
      else text = "Trace the line to the left from the green dot.";
    }
    coachLine(text);
    if (T.view) { const p = pointAt(st, T.prog), q = vp(sx(p[0]), sy(p[1])); coach.avoid(q[0], q[1]); }
  }
  function stripUpdate() {
    const el = $("strip");
    if (!T || !isWordItem() || T.letters.length < 2) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = "";
    let k = 0;
    for (const ch of T.text) {
      const sp = document.createElement("span");
      sp.textContent = ch;
      // Characters without a glyph are shown but not traced, so only glyph letters move k along.
      if (GLYPHS[ch]) {
        if (T.done || k < T.li) sp.className = "done"; else if (k === T.li) sp.className = "cur";
        k++;
      }
      el.appendChild(sp);
    }
  }
  function sequence() {
    if (wSet === "upper") return UPPER;
    if (wSet === "lower") return LOWER;
    if (wSet === "digits") return DIGITS;
    return wordList(wList) || MOST;
  }
  function wordList(l) {
    if (!l) return null;
    if (l.cat === "most") return MOST;
    if (l.cat === "az") return ALL.filter((w) => w.charAt(0).toLowerCase() === l.letter);
    const c = CATS.find((q) => q.id === l.cat);
    return c ? c.words : null;
  }
  function nextItem() {
    if (locked()) return;
    const seq = sequence();
    if (!seq || !seq.length) return;
    const i = seq.indexOf(wItem);
    wItem = seq[(i + 1) % seq.length];
    startTrace(); saveSoon(); snd.pick();
  }

  // =====================================================================================================
  // Write: drawing the guide
  // =====================================================================================================
  function polyline(ctx, st, d0, d1) {
    const c = st.cum;
    ctx.beginPath();
    const p0 = pointAt(st, d0); ctx.moveTo(sx(p0[0]), sy(p0[1]));
    for (let i = 0; i < c.length; i++) if (c[i] > d0 && c[i] < d1) ctx.lineTo(sx(st.pts[i][0]), sy(st.pts[i][1]));
    const p1 = pointAt(st, d1); ctx.lineTo(sx(p1[0]) + 0.01, sy(p1[1]));
  }
  function drawGuide(t) {
    const c = gctx, u = T.view.u;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    // Writing paper: the top line, a dashed middle line at the height of a small letter, and the baseline.
    c.lineWidth = 2; c.strokeStyle = "#B9DCF7";
    [[0, false], [0.45, true], [1, false]].forEach(([y, dash]) => {
      c.setLineDash(dash ? [10, 10] : []);
      c.beginPath(); c.moveTo(0, sy(y)); c.lineTo(W, sy(y)); c.stroke();
    });
    c.setLineDash([]);
    const w = Math.max(10, u * 0.1), hex = colorHex();
    c.lineCap = "round"; c.lineJoin = "round";
    T.letters.forEach((L, li) => {
      if (sx(L.x0 + L.w) < -u || sx(L.x0) > W + u) return;
      L.strokes.forEach((st, si) => {
        const done = T.done || li < T.li || (li === T.li && si < T.si), cur = !T.done && li === T.li && si === T.si;
        if (!done) {
          // The dotted outline: round dots along the stroke.
          c.setLineDash([0.01, w * 1.35]); c.lineWidth = w * 0.66;
          c.strokeStyle = cur ? "#7C86A6" : "#C3CADC";
          polyline(c, st, cur ? T.prog : 0, st.len); c.stroke();
          c.setLineDash([]);
        }
        const upto = done ? st.len : cur ? T.prog : 0;
        if (upto > 0) {
          polyline(c, st, 0, upto);
          c.lineWidth = w + 4; c.strokeStyle = "rgba(29,35,64,0.28)"; c.stroke();
          c.lineWidth = w; c.strokeStyle = hex; c.stroke();
        }
      });
    });
    const st = curStroke();
    if (st) {
      // The direction arrow just ahead, then the green dot where the finger goes next.
      const r = Math.max(14, u * 0.075), pulse = reduce ? 1 : 1 + 0.12 * Math.sin(t / 260);
      if (st.len - T.prog > 0.12) {
        const d0 = T.prog + Math.max(0.07, r * 1.3 / u), d1 = Math.min(st.len, d0 + 0.2);
        if (d1 > d0 + 0.04) {
          c.strokeStyle = "#1E8C4E"; c.lineWidth = Math.max(4, u * 0.025);
          polyline(c, st, d0, d1); c.stroke();
          const p = pointAt(st, d1), q = pointAt(st, d1 - 0.04), ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
          const ax = sx(p[0]), ay = sy(p[1]), al = Math.max(12, u * 0.07);
          c.fillStyle = "#1E8C4E";
          c.beginPath(); c.moveTo(ax + Math.cos(ang) * al * 0.4, ay + Math.sin(ang) * al * 0.4);
          c.lineTo(ax + Math.cos(ang + 2.5) * al, ay + Math.sin(ang + 2.5) * al);
          c.lineTo(ax + Math.cos(ang - 2.5) * al, ay + Math.sin(ang - 2.5) * al); c.closePath(); c.fill();
        }
      }
      const p = pointAt(st, T.prog), x = sx(p[0]), y = sy(p[1]);
      c.beginPath(); c.arc(x, y, r * 1.6 * pulse, 0, TAU); c.fillStyle = "rgba(30,140,78,0.18)"; c.fill();
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = "#1E8C4E"; c.fill();
      c.lineWidth = 3; c.strokeStyle = "#FFFFFF"; c.stroke();
    }
  }

  // =====================================================================================================
  // Effects and Surprise
  // =====================================================================================================
  // Short-lived sparkles and rings on the fx canvas, in stage px. Each fades out within about a second.
  let parts = [];
  const RAINBOW = ["#FF4D6D", "#FFB627", "#FFE14D", "#4CD964", "#3DB4FF", "#8E6CFF", "#FF6FD8"];
  function addFx(p) {
    if (parts.length > 500) parts.shift();
    p.t0 = (p.t0 || now()); parts.push(p);
  }
  function sparkleAt(x, y, n, delay) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = 40 + Math.random() * 90;
      addFx({ kind: "star", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: 5 + Math.random() * 6,
        color: RAINBOW[(Math.random() * RAINBOW.length) | 0], life: 0.9, t0: now() + (delay || 0) });
    }
  }
  // Twinkles along a list of points in order, spread over dur seconds, so the sparkles run along the lines.
  function sparkleRun(pts, dur) {
    const t = now();
    pts.forEach((p, i) => addFx({ kind: "star", x: p[0], y: p[1], vx: 0, vy: -10, size: 7 + Math.random() * 7,
      color: RAINBOW[i % RAINBOW.length], life: 0.9, t0: t + (i / Math.max(1, pts.length)) * dur * 1000 }));
  }
  function letterSparkle(L) {
    if (!T.view) return;
    const pts = [];
    L.strokes.forEach((st) => { for (let d = 0; d <= st.len; d += 0.1) { const p = pointAt(st, d); pts.push([sx(p[0]), sy(p[1])]); } });
    sparkleRun(pts, 0.9);
  }
  function drawFx(t) {
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fctx.clearRect(0, 0, W, H);
    parts = parts.filter((p) => {
      const s = (t - p.t0) / 1000;
      if (s < 0) return true;
      if (s > p.life) return false;
      const k = s / p.life, a = 1 - k;
      fctx.globalAlpha = a;
      if (p.kind === "ring") {
        fctx.beginPath(); fctx.arc(p.x, p.y, 10 + k * 70, 0, TAU);
        fctx.lineWidth = 6 * a + 1; fctx.strokeStyle = p.color; fctx.stroke();
      } else if (p.kind === "band") {
        const y = p.y0 + (p.y1 - p.y0) * k;
        const g = fctx.createLinearGradient(0, y - 30, 0, y + 30);
        g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,225,77,0.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
        fctx.globalAlpha = 1; fctx.fillStyle = g; fctx.fillRect(p.x0, y - 30, p.x1 - p.x0, 60);
      } else {
        const x = p.x + p.vx * s, y = p.y + p.vy * s, r = p.size * (k < 0.3 ? k / 0.3 : 1) * (1 - k * 0.4);
        fctx.fillStyle = p.color;
        fctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rr = i % 2 ? r * 0.4 : r, ang = i * Math.PI / 4 + s * 2;
          fctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
        }
        fctx.closePath(); fctx.fill();
      }
      return true;
    });
    fctx.globalAlpha = 1;
  }
  // Points along everything drawn on the page now, in stage px, for sparkles that run along the lines.
  function linePoints() {
    const out = [];
    if (job === "write") {
      if (!T || !T.view) return out;
      T.letters.forEach((L) => L.strokes.forEach((st) => { for (let d = 0; d <= st.len; d += 0.06) { const p = pointAt(st, d); out.push([sx(p[0]), sy(p[1])]); } }));
      return out;
    }
    const src = job === "color" ? colorLines : drawPaint, r = job === "color" ? colorRect : drawRect;
    const n = 120, c = document.createElement("canvas"); c.width = c.height = n;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(src, 0, 0, n, n);
    const d = x.getImageData(0, 0, n, n).data;
    for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) {
      if (d[(yy * n + xx) * 4 + 3] > 60) {
        const px = r.x + (xx + 0.5) * r.s / n, py = r.y + (yy + 0.5) * r.s / n;
        if (px > 0 && py > 0 && px < W && py < H) out.push([px, py]);
      }
    }
    // A sweep around the middle of the page, about 160 twinkles.
    const cx = W / 2, cy = H / 2;
    for (let i = out.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = out[i]; out[i] = out[j]; out[j] = tmp; }
    const pick = out.slice(0, 160);
    pick.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    return pick;
  }
  function sparkleLines() {
    let pts = linePoints();
    if (!pts.length) for (let i = 0; i < 60; i++) pts.push([W * (0.1 + 0.8 * i / 60), H * (0.3 + 0.4 * Math.sin(i / 4) * 0.5 + 0.2)]);
    if (job === "write") pts = pts.filter((_, i) => i % Math.max(1, Math.ceil(pts.length / 200)) === 0);
    sparkleRun(pts, 2.4);
    snd.sparkle();
  }
  function replay(el, cls) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
  }
  // Takes turns between three moments on the current page: the colors shimmer, the drawing wiggles, sparkles run
  // along the lines. A moment that would show nothing on an empty page gives way to the sparkles.
  let surpriseNext = 0;
  function surprise() {
    if (locked()) return;
    closeDrawer();
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    const el = job === "write" ? guide : job === "color" ? colorSheet : drawSheet;
    const inked = job === "write" ? !!T && (T.done || T.li > 0 || T.si > 0 || T.prog > 0) : job === "color" ? colorPainted : drawPainted;
    if (k === 0 && inked) { replay(el, "shimmer"); snd.sparkle(); }
    else if (k === 1 && (inked || job !== "draw")) { replay(el, "wiggle"); snd.wobble(); }
    else sparkleLines();
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  let drawPainted = false;
  const local = (e) => [e.clientX - stageBox.left, e.clientY - stageBox.top];
  Toybox.palmGuard(touchEl);
  touchEl.addEventListener("pointerdown", (e) => {
    if (locked() || Toybox.isPalm(e)) return;
    e.preventDefault();
    try { touchEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    measure();
    // A touch on the page closes the drawer, and the same touch draws.
    if (drawerOpen) closeDrawer();
    const [x, y] = local(e);
    if (job === "write") { if (T) traceDown(e.pointerId, x, y); return; }
    // Once he is coloring or drawing, the instruction goes away so it never covers the page; it comes back with
    // the next job or tool.
    coach.clear();
    if (job === "color" && tool === "bucket") { bucketAt(x, y); ghost.learned("bucket"); return; }
    startStroke(e.pointerId, x, y);
  });
  touchEl.addEventListener("pointermove", (e) => {
    if (locked()) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const evs = list.length ? list : [e];
    if (job === "write") {
      if (traceFinger !== e.pointerId || !T) return;
      evs.forEach((ev) => { const [x, y] = local(ev); traceMove(x, y); });
      return;
    }
    const f = fingers.get(e.pointerId);
    if (!f) return;
    evs.forEach((ev) => { const [x, y] = local(ev); moveStroke(f, x, y); });
  });
  function lift(e) {
    if (job === "write" && traceFinger === e.pointerId) { traceUp(); return; }
    const f = fingers.get(e.pointerId);
    if (!f) return;
    fingers.delete(e.pointerId);
    endStroke(f);
    ghost.learned("draw");
  }
  touchEl.addEventListener("pointerup", lift);
  touchEl.addEventListener("pointercancel", lift);
  ["gesturestart", "gesturechange"].forEach((n) => document.addEventListener(n, (e) => e.preventDefault()));

  // =====================================================================================================
  // Drawer
  // =====================================================================================================
  const drawerEl = $("drawer"), handle = $("handle");
  let drawerOpen = false, handleFound = false, drawerTouched = false;
  function openDrawer(byHim) {
    if (locked()) return;
    if (byHim) { handleFound = true; ghost.learned("handle"); }
    if (drawerOpen) return;
    drawerOpen = true;
    drawerEl.classList.remove("closing");
    drawerEl.classList.add("open");
    handle.setAttribute("aria-expanded", "true");
    snd.open();
  }
  let closingTimer = 0;
  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    drawerEl.classList.remove("open");
    // While it slides away, touches go through to the page instead of landing on the moving drawer.
    drawerEl.classList.add("closing");
    clearTimeout(closingTimer);
    closingTimer = setTimeout(() => drawerEl.classList.remove("closing"), 380);
    handle.setAttribute("aria-expanded", "false");
  }
  // A tap on the handle opens or closes the drawer; a drag out from it opens it at once.
  let hdrag = null;
  handle.addEventListener("pointerdown", (e) => { hdrag = { x: e.clientX, y: e.clientY, opened: false }; });
  handle.addEventListener("pointermove", (e) => {
    if (!hdrag || drawerOpen) return;
    const inward = side ? hdrag.x - e.clientX : hdrag.y - e.clientY;
    if (inward > 16) { hdrag.opened = true; openDrawer(true); }
  });
  handle.addEventListener("click", () => {
    if (locked()) return;
    const dragged = hdrag && hdrag.opened;
    hdrag = null;
    if (dragged) return;
    if (drawerOpen) closeDrawer(); else openDrawer(true);
  });
  drawerEl.addEventListener("pointerdown", () => { drawerTouched = true; });
  Toybox.palmGuard($("drScroll"));

  function tile(cls, pic, word, onTap) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn tb-tile dr-tile " + cls;
    b.innerHTML = '<span class="tb-pic" aria-hidden="true"></span><span class="dr-word"></span>';
    b.firstChild.innerHTML = pic;
    b.lastChild.textContent = word;
    b.setAttribute("aria-label", word);
    b.addEventListener("click", () => { if (!locked()) onTap(b); });
    return b;
  }
  function buildDrawer() {
    const jobs = $("drJobs");
    JOBS.forEach((j) => {
      const b = tile("dr-job", PIC[j.id](), j.name, () => { if (job !== j.id) { setJob(j.id); snd.pick(); } });
      b.dataset.id = j.id; jobs.appendChild(b);
    });
    const tools = $("drTools");
    TOOLS.forEach((t) => {
      const b = tile("dr-tool", "", t.name, () => { if (tool !== t.id) { setTool(t.id); snd.pick(); } });
      b.dataset.id = t.id; tools.appendChild(b);
    });
    const colors = $("drColors");
    COLORS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "sw"; b.dataset.id = c.id;
      b.style.setProperty("--sw", c.hex);
      b.setAttribute("aria-label", c.name);
      b.addEventListener("click", () => { if (!locked() && color !== c.id) { color = c.id; snd.pick(); refreshDrawer(); saveSoon(); } });
      colors.appendChild(b);
    });
    $("drStay").addEventListener("click", () => {
      if (locked()) return;
      stay = !stay; snd.pick(); refreshDrawer(); saveSoon();
    });
    Toybox.bar($("drBar"), { onNew: newPage, onSurprise: surprise });
  }
  function buildChoices() {
    const el = $("drChoices");
    el.innerHTML = "";
    el.classList.toggle("dr-pages", job === "color");
    el.hidden = job === "draw";
    if (job === "color") {
      PAGES.forEach((p) => {
        const b = tile("dr-page", '<img alt="" src="' + svgUrl(p.svg, 120) + '">', p.name || p.id, () => {
          if (pageId !== p.id) { setPage(p.id); snd.pick(); }
        });
        b.dataset.id = p.id; el.appendChild(b);
      });
    } else if (job === "write") {
      SETS.forEach((s) => {
        const b = tile("dr-set", PIC[s.id](), s.name, () => { closeDrawer(); openPicker(s.id); snd.pick(); });
        b.dataset.id = s.id; el.appendChild(b);
      });
    }
  }
  // Marks what is picked (yellow with a tick) and updates the pictures that show the current color.
  function refreshDrawer() {
    const hex = colorHex();
    document.querySelectorAll("#drJobs .dr-tile").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === job)));
    $("drTools").hidden = job === "write";
    document.querySelectorAll("#drTools .dr-tile").forEach((b) => {
      const id = b.dataset.id;
      b.hidden = id === "bucket" && job !== "color";
      b.firstChild.innerHTML = toolPic(id, hex);
      b.setAttribute("aria-pressed", String(id === tool));
    });
    document.querySelectorAll("#drColors .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === color)));
    const st = $("drStay");
    st.hidden = job !== "color";
    st.setAttribute("aria-checked", String(stay));
    st.firstElementChild.innerHTML = PIC.stay(stay);
    document.querySelectorAll("#drChoices .dr-page").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === pageId)));
    document.querySelectorAll("#drChoices .dr-set").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === wSet)));
    $("hSw").style.setProperty("--sw", hex);
    $("hTool").innerHTML = job === "write" ? PIC.write() : toolPic(tool, hex);
    if (!handle.querySelector(".tb-ui-ic")) handle.insertAdjacentHTML("beforeend", Toybox.icon("back"));
  }

  // =====================================================================================================
  // Write picker
  // =====================================================================================================
  const picker = $("picker"), pkGrid = $("pkGrid");
  let pickerOpen = false, pkBackTo = null;
  $("pkClose").innerHTML = Toybox.icon("close");
  $("pkBack").innerHTML = Toybox.icon("back");
  $("pkClose").addEventListener("click", () => { if (!locked()) closePicker(); });
  $("pkBack").addEventListener("click", () => { if (!locked() && pkBackTo) pkBackTo(); });
  Toybox.palmGuard(picker);
  function pkTile(cls, html, label, picked, onTap) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn tb-tile pk-tile " + cls;
    b.innerHTML = html;
    b.setAttribute("aria-label", label);
    b.setAttribute("aria-pressed", String(!!picked));
    b.addEventListener("click", () => { if (!locked()) onTap(); });
    return b;
  }
  function showPicker(title, min, back) {
    picker.hidden = false; pickerOpen = true;
    $("pkTitle").textContent = title;
    $("pkBack").hidden = !back; pkBackTo = back || null;
    pkGrid.style.setProperty("--pk-min", min + "px");
    pkGrid.innerHTML = "";
    pkGrid.scrollTop = 0;
    ghost.stop();
  }
  function closePicker() { picker.hidden = true; pickerOpen = false; }
  const textSpan = (cls, s) => { const sp = document.createElement("span"); sp.className = cls; sp.textContent = s; return sp.outerHTML; };
  function openPicker(set) {
    closeDrawer();
    if (job !== "write") setJob("write");
    if (set === "words") { openCategories(); return; }
    const s = SETS.find((q) => q.id === set);
    showPicker(s.title, 84, null);
    s.items.forEach((ch) => pkGrid.appendChild(pkTile("pk-char", ch, ch, wSet === set && wItem === ch, () => pickItem(set, ch, null))));
  }
  function openCategories() {
    showPicker("Pick a group of words", 140, null);
    const cats = [{ id: "most", name: "Most used" }].concat(CATS.map((c) => ({ id: c.id, name: c.name })), [{ id: "az", name: "A-Z" }]);
    cats.forEach((c) => {
      const html = '<span class="tb-pic" aria-hidden="true">' + (CAT_PIC[c.id] || CAT_PIC.other) + "</span>" + textSpan("", c.name);
      const picked = wSet === "words" && wList && wList.cat === c.id;
      pkGrid.appendChild(pkTile("pk-cat", html, c.name, picked, () => {
        if (c.id === "az") openLetters(); else openWords({ cat: c.id, letter: "" }, c.name, openCategories);
      }));
    });
  }
  function openLetters() {
    showPicker("Words that start with...", 84, openCategories);
    LOWER.forEach((ch) => {
      const list = { cat: "az", letter: ch };
      if (!wordList(list).length) return;
      const picked = wSet === "words" && wList && wList.cat === "az" && wList.letter === ch;
      pkGrid.appendChild(pkTile("pk-char", ch.toUpperCase(), ch.toUpperCase(), picked, () =>
        openWords(list, "Words that start with " + ch.toUpperCase(), openLetters)));
    });
  }
  function openWords(list, title, back) {
    showPicker(title, 150, back);
    (wordList(list) || []).forEach((w) => pkGrid.appendChild(pkTile("pk-word", textSpan("", w), w,
      wSet === "words" && wItem === w && wList && wList.cat === list.cat, () => pickItem("words", w, list))));
  }
  function pickItem(set, item, list) {
    wSet = set; wItem = item; wList = list;
    closePicker();
    startTrace();
    refreshDrawer(); saveSoon(); snd.pick();
  }

  // =====================================================================================================
  // Coach and ghost hand
  // =====================================================================================================
  const coach = Toybox.coach($("coach"));
  function coachLine(text) { coach.step(text); }
  function jobLine() {
    if (job === "write") { if (T && T.done) finishItem(true); else traceLine(); return; }
    coach.avoid();
    if (job === "draw") coachLine(tool === "eraser" ? "Rub out the drawing with the eraser." : "Draw with your finger.");
    else if (tool === "bucket") coachLine("Tap a space to fill it with paint.");
    else if (tool === "eraser") coachLine("Rub out the color with the eraser.");
    else coachLine("Color the picture with your finger.");
  }
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || drawerOpen || pickerOpen || fingers.size || traceFinger != null) return null;
      measure();
      if (job === "write") {
        const st = curStroke();
        if (!st || !T.view) return null;
        const pts = [], n = 20;
        for (let i = 0; i <= n; i++) { const p = pointAt(st, T.prog + (st.len - T.prog) * i / n); pts.push(vp(sx(p[0]), sy(p[1]))); }
        if (st.len - T.prog < 0.1) return { pts: [pts[0]], tap: true, key: strokeKey() };
        return { pts, dur: clamp((st.len - T.prog) * T.view.u * 9, 2600, 5200), key: strokeKey() };
      }
      if (!handleFound) {
        const r = handle.getBoundingClientRect();
        return { pts: [[r.left + r.width / 2, r.top + r.height / 2]], tap: true, key: "handle" };
      }
      if (job === "color" && tool === "bucket") {
        const l = regions.findIndex((r) => r && !r.border && !r.filled && r.area > KC * KC * 0.004);
        if (l < 1 || !lab) return null;
        const r = regions[l];
        let px = (r.x0 + r.x1) / 2, py = (r.y0 + r.y1) / 2;
        // The middle of the area's box may be outside the area: walk along its middle row to a pixel inside it.
        const row = Math.round(py);
        for (let x = r.x0; x <= r.x1; x++) if (lab[row * KC + x] === l) { px = x; if (x > (r.x0 + r.x1) / 2) break; }
        return { pts: [vp(colorRect.x + px * colorRect.s / KC, colorRect.y + py * colorRect.s / KC)], tap: true, key: "bucket" };
      }
      const cx = job === "color" ? colorRect.x + colorRect.s / 2 : W / 2, cy = job === "color" ? colorRect.y + colorRect.s / 2 : H / 2;
      const d = Math.min(W, H) * 0.22;
      return { pts: [vp(cx - d, cy), vp(cx - d * 0.3, cy - d * 0.4), vp(cx + d * 0.3, cy + d * 0.3), vp(cx + d, cy - d * 0.1)], dur: 2800, key: "draw" };
    },
    onShow: (p, on) => { if (on && T && p.key === strokeKey()) T.ghosted = true; }
  });

  // =====================================================================================================
  // Jobs, New and saving
  // =====================================================================================================
  function setJob(id) {
    job = id;
    if (job === "draw" && tool === "bucket") tool = "crayon";
    JOBS.forEach((j) => document.body.classList.toggle("job-" + j.id, j.id === job));
    fingers.clear(); traceFinger = null;
    if (job !== "write") { closePicker(); $("next").hidden = true; }
    else if (T && T.done) $("next").hidden = false;
    if (job === "write" && !T) startTrace();
    if (T) T.snap = true;
    buildChoices(); refreshDrawer(); jobLine(); ghost.poke(); saveSoon();
  }
  function setTool(id) {
    const was = tool;
    tool = id;
    refreshDrawer(); saveSoon();
    const kind = (t) => (t === "bucket" || t === "eraser" ? t : "paint");
    if (kind(was) !== kind(id)) jobLine();
  }
  function setPage(id) {
    snapPage();
    pageId = id;
    loadPage(id, true);
    refreshDrawer(); saveSoon();
  }
  // New: a yellow band sweeps down the page and wipes it clean behind it (Write starts the item over).
  let wipe = null;
  function newPage() {
    if (locked()) return;
    closeDrawer();
    snd.wipe();
    if (job === "write") { startTrace(); sparkleLines(); return; }
    const r = job === "color" ? colorRect : drawRect, y0 = Math.max(0, r.y), y1 = Math.min(H, r.y + r.s);
    wipe = { job, t0: now(), dur: reduce ? 1 : 800 };
    addFx({ kind: "band", x0: Math.max(0, r.x), x1: Math.min(W, r.x + r.s), y0, y1, life: wipe.dur / 1000 });
    fills = [];
    if (job === "color") {
      regions.forEach((g) => { if (g) { g.cover = 0; g.filled = false; } });
      kindGiven.delete(pageId); pageSnaps.delete(pageId);
    }
  }
  function runWipe(t) {
    const u = clamp((t - wipe.t0) / wipe.dur, 0, 1);
    const color = wipe.job === "color", ctx = color ? cpx : dpx, K = color ? KC : KD, r = color ? colorRect : drawRect;
    // The band moves over the visible part of the sheet; everything above it is cleared.
    const top = Math.max(0, r.y), bot = Math.min(H, r.y + r.s), yStage = top + (bot - top) * u;
    const ySheet = u >= 1 ? K : (yStage - r.y) * K / r.s;
    ctx.clearRect(0, 0, K, Math.max(0, ySheet));
    if (u >= 1) { if (color) colorPainted = false; else drawPainted = false; wipe = null; }
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  let lastT = now();
  function loop() {
    const t = now(), dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
    if (fills.length) runFills(t);
    if (wipe) runWipe(t);
    if (job === "write" && T) { stepView(dt); drawGuide(t); }
    if (parts.length || fxDirty) { drawFx(t); fxDirty = parts.length > 0; }
    requestAnimationFrame(loop);
  }
  let fxDirty = false;
  function onEnding(done) {
    ending = true;
    fingers.clear(); traceFinger = null;
    closeDrawer(); closePicker();
    setTimeout(done, 1200);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="6" fill="#FFFFFF" stroke="#1D2340" stroke-width="2"/>' +
      '<path d="M22 64c8-20 16-20 22-6s14 10 20-8" fill="none" stroke="#E8343A" stroke-width="5" stroke-linecap="round" opacity="0.8"/>' +
      '<path d="M24 76c14-5 30-5 50 0" fill="none" stroke="#2B5FE0" stroke-width="5" stroke-linecap="round" opacity="0.8"/>' +
      '<g transform="rotate(-40 70 34)" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"><path d="M52 28h26v12H52z" fill="#FFD21F"/><path d="M78 28l9 6-9 6z" fill="#FFD21F"/></g></svg>';
  }

  buildDrawer();
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  // The stage never scrolls: focusing a control in the closed drawer could otherwise slide the whole page sideways.
  stage.addEventListener("scroll", () => { stage.scrollTop = 0; stage.scrollLeft = 0; });
  document.addEventListener("visibilitychange", () => { if (document.hidden) save(); });
  window.addEventListener("pagehide", save);
  if (pageId) loadPage(pageId, false);
  setJob(job);
  // First visit: the drawer slides open by itself for a moment, so he sees it is there.
  if (firstVisit) {
    setTimeout(() => { if (!drawerOpen && !locked()) openDrawer(false); }, 700);
    setTimeout(() => { if (!drawerTouched && !handleFound) closeDrawer(); }, 3400);
  }
  Toybox.init({
    app: "drawing",
    badge: $("tbadge"),
    timerIntro: "When time is up, the crayons go back in the box and the page rests.",
    goodbyeOption: "End with a “Goodbye, crayons” button to press",
    farewellText: "Time to put the crayons away",
    goodbyeLabel: "Goodbye, crayons",
    farewellDone: "Bye bye, crayons!",
    restLine: "The crayons are resting.",
    restLine2: "The page will be here next time.",
    restArt,
    soundNote: "Soft scratchy crayon sounds and chimes. Hold for 2 seconds.",
    onEnding,
    onWake: () => { ending = false; },
    onSound: (on) => { if (on) snd.chime(); }
  });
  requestAnimationFrame(loop);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    window.__drawing = {
      state: () => ({ job, tool, color, stay, page: pageId, drawerOpen, pickerOpen, handleFound, colorPainted, drawPainted,
        regions: regions.length - 1, filled: regions.filter((r) => r && r.filled).length, pageReady: !!lab, finished: kindGiven.has(pageId),
        write: T ? { set: wSet, item: wItem, letter: T.li, stroke: T.si, prog: +T.prog.toFixed(3), done: T.done, assist: T.assist,
          letters: T.letters.length } : null, coach: coach.text() }),
      job: (id) => setJob(id),
      tool: (id) => setTool(id),
      color: (id) => { color = id; refreshDrawer(); },
      stay: (on) => { stay = !!on; refreshDrawer(); },
      page: (id) => setPage(id),
      open: () => openDrawer(true),
      close: () => closeDrawer(),
      picker: (set) => openPicker(set),
      write: (set, item, list) => pickItem(set, item, list || null),
      // Viewport point of a page point given as fractions of the coloring page (or of the stage elsewhere).
      pagePt: (fx2, fy2) => (job === "color" ? vp(colorRect.x + fx2 * colorRect.s, colorRect.y + fy2 * colorRect.s) : vp(fx2 * W, fy2 * H)),
      // Viewport points along the current stroke from its progress to its end, for driving a real trace.
      strokePts: (n) => {
        const st = curStroke(); if (!st) return [];
        const out = [];
        for (let i = 0; i <= (n || 12); i++) { const p = pointAt(st, T.prog + (st.len - T.prog) * i / (n || 12)); out.push(vp(sx(p[0]), sy(p[1]))); }
        return out;
      },
      // Viewport points, one inside each closed area of the coloring page.
      areaPts: () => regions.map((r, l) => {
        if (!r || r.border || !lab) return null;
        for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
          if (lab[y * KC + x] === l && lab[y * KC + Math.min(KC - 1, x + 3)] === l) return vp(colorRect.x + (x + 2) * colorRect.s / KC, colorRect.y + y * colorRect.s / KC);
        }
        return null;
      }).filter(Boolean),
      completeStroke: () => { if (curStroke()) finishStroke(); },
      completeTrace: () => { let k = 0; while (curStroke() && k++ < 200) finishStroke(); },
      next: () => nextItem(),
      surprise: () => surprise(),
      newPage: () => newPage(),
      ghost: () => ghost.show()
    };
  }
  $("next").addEventListener("click", nextItem);
  Toybox.palmGuard($("next"));
})();
