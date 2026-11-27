(function () {
  "use strict";
  // Christmas · Cookies: a warm Christmas kitchen counter with an oven, seen from where the baker stands.
  // Two jobs, as folder tabs under the stage:
  //
  // Cookies: he makes a batch of Christmas cookies the real way, one hands-on step at a time. A drag does the real
  // motion for as long as he does it; a tap on the same part plays that part's motion once.
  //   1. Pick the dough (tiles: Sugar cookie or Gingerbread) and roll it out: drag the rolling pin up and down over
  //      the dough and it flattens into a sheet (a tap on the pin or the dough is one roll).
  //   2. Cut shapes: pick a cookie cutter (tiles) and drag it onto the dough, or tap the dough where it should press
  //      (a tap on the cutter presses it into the next smooth spot). The shapes stay in the dough.
  //   3. Put the cookies on the baking sheet: tap each cut shape or drag it off the dough.
  //   4. Open the oven door (tap it or pull it down), slide the baking sheet in (drag or tap it) and close the door.
  //      The oven window glows and the cookies puff up a little and turn golden (calm, about 5 s; nothing burns).
  //   5. Take the baking sheet out with the oven mitt (tap the oven, or drag the sheet out). Steam curls up.
  //   6. Decorate: each cookie comes to the board big. Tiles: White, Red and Green icing (the piping bag draws
  //      exactly where his finger goes; a tap is a dot), Sprinkles (they fall where he holds or taps), Gumdrops,
  //      Candy buttons, Red hots and Candy eyes (one per tap, or drag one where it goes). Nothing is ever added for
  //      him, so a gingerbread person only gets a face if he gives it one, one candy at a time.
  //   7. Put the cookie on the plate (tap the plate); the next cookie comes up. A tap on a waiting cookie brings it
  //      up instead. The plate is his collection, kept across visits (the last 12); the Plate button (or a tap on
  //      the plate) shows it big, with the gingerbread people standing in a row (the family) and the last house.
  //   Left-over dough: once the shapes are lifted, the rolling pin balls the scraps up and rolls them out again.
  //
  // House: a real gingerbread house. The baked pieces come one at a time (back wall, two side walls, front wall,
  //   two roof pieces): squeeze royal icing along the edge with the piping bag (drag along it, or tap: the bag runs
  //   along the edge) and the piece stands up into place on the cake board. When the roof is on, the windows light
  //   up and icing sugar dusts the house. Then decorate with the tiles: Icing, Icing snow (on the roof), Icicles
  //   (under the roof's edge), Gumdrops (they snap to the ridge), Peppermints, Candy canes (they snap to the door
  //   frame) and Candy buttons. The latest built house is kept with the plate.
  //
  // A yellow ring and one instruction show the next part; parts not needed right now still answer (a wiggle and
  // their name). Surprise takes turns between live moments (icing sugar snows down, the oven light blinks or the
  // house windows twinkle, steam curls off the cookies or the candy sparkles) and never changes his work.
  // Units: the scene is drawn in world units (the TALL or WIDE layout, picked from the stage's shape) and scaled to
  // fit the stage; x to the right, y down. Cookie decorations are kept in the cookie's own units (its size = 1).
  //
  // Sections:
  //   Setup and saved state
  //   Shapes, doughs and decorations
  //   Layout
  //   Tweens and particles
  //   The cookie batch
  //   Cookies: roll and cut
  //   Cookies: baking sheet and oven
  //   Cookies: decorate and plate
  //   The gingerbread house
  //   Decorating tools
  //   Drawing helpers
  //   Drawing cookies and candy
  //   Drawing the kitchen, oven and tools
  //   Drawing the house
  //   The plate view
  //   What comes next: coach, ring and ghost hand
  //   Input
  //   Panel, jobs and surprise
  //   Loop, timer, start and debug hook

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), stage = $("stage");
  let ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, INK = "#1D2340";
  let LW = 2.4;
  const now = () => performance.now() / 1000;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const hash = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let ending = false;
  const locked = () => ending || Toybox.timer.locked();

  const KEY_PLATE = "christmas-cookies-plate-v1", KEY_WORK = "christmas-cookies-work-v1";
  const PLATE_MAX = 12, TRAY_MAX = 6;
  function load(key) {
    try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch (e) { return null; }
  }
  const fresh = Toybox.fresh();
  const savedPlate = load(KEY_PLATE) || {};
  const savedWork = fresh ? null : load(KEY_WORK);

  // =====================================================================================================
  // Shapes, doughs and decorations
  // =====================================================================================================
  const SHAPES = [
    { id: "star", name: "Star" }, { id: "tree", name: "Tree", full: "Christmas tree" }, { id: "bell", name: "Bell" },
    { id: "snowman", name: "Snowman" }, { id: "cane", name: "Candy cane" }, { id: "person", name: "Person", full: "Gingerbread person" },
    { id: "heart", name: "Heart" }, { id: "mitten", name: "Mitten" }
  ];
  const PERSON = 5;
  const DOUGHS = [
    { id: "sugar", name: "Sugar cookie", raw: "#F8E4BD", baked: "#EFBE73", rim: "#C98A3A" },
    { id: "ginger", name: "Gingerbread", raw: "#B9773F", baked: "#93531F", rim: "#5E3010" }
  ];
  const ICING = ["#FFFFFF", "#E8303F", "#2FA84F"];
  const SPRINK = ["#E8303F", "#2FA84F", "#FFFFFF", "#FFD23B", "#3D8BFF", "#FF7FC0"];
  const GUM = ["#E8303F", "#2FA84F", "#FFD23B", "#8E4FD9", "#FF8A1F"];
  const BUTTON = ["#FF9CC8", "#FFE36B", "#8FD3FF", "#B6F0A0"];
  // Cookie decorating tools. Candy t: g gumdrop, b candy button, r red hot, e candy eye, m peppermint, c candy cane.
  const TOOLS = [
    { id: "white", name: "White icing", kind: "icing", c: 0 }, { id: "red", name: "Red icing", kind: "icing", c: 1 },
    { id: "green", name: "Green icing", kind: "icing", c: 2 }, { id: "sprinkles", name: "Sprinkles", kind: "sprinkles" },
    { id: "gum", name: "Gumdrops", kind: "candy", t: "g" }, { id: "button", name: "Candy buttons", kind: "candy", t: "b" },
    { id: "redhot", name: "Red hots", kind: "candy", t: "r" }, { id: "eye", name: "Candy eyes", kind: "candy", t: "e" }
  ];
  const HTOOLS = [
    { id: "hicing", name: "Icing", kind: "icing" }, { id: "snow", name: "Icing snow", kind: "snow" },
    { id: "icicles", name: "Icicles", kind: "icicles" }, { id: "hgum", name: "Gumdrops", kind: "candy", t: "g" },
    { id: "mint", name: "Peppermints", kind: "candy", t: "m" }, { id: "hcane", name: "Candy canes", kind: "candy", t: "c" },
    { id: "hbutton", name: "Candy buttons", kind: "candy", t: "b" }
  ];
  const CANDY_T = ["g", "b", "r", "e", "m", "c"];

  // Each cutter shape as one path, its size 1 (it fits in -1..1). Pieces that overlap all run clockwise, so the
  // fill is their union; the outline is a double-width stroke under the fill.
  const PATHS = SHAPES.map((sh) => shapePath(sh.id));
  function shapePath(id) {
    const p = new Path2D();
    const C = (x, y, r) => { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU); };
    const cap = (x1, y1, x2, y2, r) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      p.moveTo(x2 + Math.cos(a - Math.PI / 2) * r, y2 + Math.sin(a - Math.PI / 2) * r);
      p.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2); p.arc(x1, y1, r, a + Math.PI / 2, a + Math.PI * 1.5); p.closePath();
    };
    const poly = (pts) => { p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); };
    if (id === "star") {
      const pts = [];
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.46 : 1.02; pts.push(Math.cos(a) * r, Math.sin(a) * r + 0.06); }
      poly(pts);
    } else if (id === "tree") {
      poly([0, -1, 0.42, -0.44, 0.25, -0.44, 0.66, 0.14, 0.43, 0.14, 0.88, 0.7, 0.17, 0.7, 0.17, 1, -0.17, 1, -0.17, 0.7, -0.88, 0.7, -0.43, 0.14, -0.66, 0.14, -0.25, -0.44, -0.42, -0.44]);
    } else if (id === "bell") {
      p.moveTo(0, -0.76); p.bezierCurveTo(0.42, -0.76, 0.58, -0.4, 0.62, 0.1); p.bezierCurveTo(0.66, 0.45, 0.8, 0.55, 0.94, 0.68);
      p.quadraticCurveTo(0, 0.92, -0.94, 0.68); p.bezierCurveTo(-0.8, 0.55, -0.66, 0.45, -0.62, 0.1); p.bezierCurveTo(-0.58, -0.4, -0.42, -0.76, 0, -0.76); p.closePath();
      C(0, -0.84, 0.15); C(0, 0.84, 0.17);
    } else if (id === "snowman") {
      C(0, 0.44, 0.55); C(0, -0.36, 0.38);
      poly([-0.27, -1.02, 0.27, -1.02, 0.27, -0.7, -0.27, -0.7]); poly([-0.42, -0.76, 0.42, -0.76, 0.42, -0.64, -0.42, -0.64]);
    } else if (id === "cane") {
      const dx = 0.15, dy = -0.1;
      p.moveTo(0.4 + dx, 1 + dy); p.lineTo(0.4 + dx, -0.4 + dy);
      p.arc(-0.15 + dx, -0.4 + dy, 0.55, 0, Math.PI, true); p.lineTo(-0.7 + dx, -0.15 + dy);
      p.arc(-0.5 + dx, -0.15 + dy, 0.2, Math.PI, 0, true); p.lineTo(-0.3 + dx, -0.4 + dy);
      p.arc(-0.15 + dx, -0.4 + dy, 0.15, Math.PI, 0, false); p.lineTo(0 + dx, 1 + dy);
      p.arc(0.2 + dx, 1 + dy, 0.2, Math.PI, 0, true); p.closePath();
    } else if (id === "person") {
      C(0, -0.64, 0.3); cap(0, -0.3, 0, 0.22, 0.34); cap(-0.74, -0.14, 0.74, -0.14, 0.17);
      cap(-0.12, 0.24, -0.42, 0.84, 0.19); cap(0.12, 0.24, 0.42, 0.84, 0.19);
    } else if (id === "heart") {
      p.moveTo(0, 0.9); p.bezierCurveTo(-0.6, 0.45, -1.0, 0.05, -0.88, -0.38); p.bezierCurveTo(-0.76, -0.82, -0.2, -0.9, 0, -0.5);
      p.bezierCurveTo(0.2, -0.9, 0.76, -0.82, 0.88, -0.38); p.bezierCurveTo(1.0, 0.05, 0.6, 0.45, 0, 0.9); p.closePath();
    } else if (id === "mitten") {
      cap(0.08, 0.2, 0.08, -0.5, 0.46); cap(-0.34, 0.06, -0.7, -0.3, 0.19); poly([-0.46, 0.42, 0.62, 0.42, 0.62, 0.94, -0.46, 0.94]);
    }
    return p;
  }
  // Is a point (cookie units) on the cookie? A probe canvas tests the shape path.
  const probe = document.createElement("canvas").getContext("2d");
  function onShape(sh, x, y) { probe.setTransform(100, 0, 0, 100, 0, 0); return probe.isPointInPath(PATHS[sh], x * 100, y * 100); }

  // The plate (kept across visits): cookies as { s: shape, d: dough, i: [[icing color, x, y, x, y, ...]],
  // p: [[color, x, y, angle*10]], k: [[candy, x, y, color]] } with every x, y in hundredths of the cookie's size.
  const r100 = (v) => Math.round(v * 100);
  function ser(c) {
    return { s: c.sh, d: c.d, i: c.i.map((st) => [st.c].concat(st.pts.map(r100))), p: c.p.map((q) => [q[0], r100(q[1]), r100(q[2]), Math.round(q[3] * 10)]),
      k: c.k.map((q) => [q[0], r100(q[1]), r100(q[2]), q[3] | 0]) };
  }
  const okInt = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
  const num = (v) => typeof v === "number" && isFinite(v);
  function des(o) {
    if (!o || !okInt(o.s, SHAPES.length) || !okInt(o.d, 2)) return null;
    const c = newCookie(o.s, o.d);
    c.bake = 1;
    if (Array.isArray(o.i)) o.i.forEach((st) => { if (Array.isArray(st) && okInt(st[0], 3) && st.length >= 3) c.i.push({ c: st[0], pts: st.slice(1).filter(num).map((v) => v / 100) }); });
    if (Array.isArray(o.p)) o.p.forEach((q) => { if (Array.isArray(q) && okInt(q[0], SPRINK.length) && num(q[1]) && num(q[2])) c.p.push([q[0], q[1] / 100, q[2] / 100, (q[3] || 0) / 10]); });
    if (Array.isArray(o.k)) o.k.forEach((q) => { if (Array.isArray(q) && CANDY_T.includes(q[0]) && num(q[1]) && num(q[2])) c.k.push([q[0], q[1] / 100, q[2] / 100, q[3] | 0]); });
    return c;
  }
  function newCookie(sh, d) { return { sh, d, bake: 0, i: [], p: [], k: [], slot: 0, x: 0, y: 0, s: 1, where: "tray", wob: 0, ph: 0 }; }
  let plate = Array.isArray(savedPlate.plate) ? savedPlate.plate.map(des).filter(Boolean).slice(-PLATE_MAX) : [];
  // The latest built house: its decorations, in world units from the house's front corner.
  let savedHouse = okHouseDec(savedPlate.house) ? savedPlate.house : null;
  function okHouseDec(h) { return !!(h && typeof h === "object" && Array.isArray(h.i) && Array.isArray(h.sn) && Array.isArray(h.ic) && Array.isArray(h.k)); }
  function savePlate() {
    try { localStorage.setItem(KEY_PLATE, JSON.stringify({ v: 1, plate: plate.map(ser), house: savedHouse })); } catch (e) { /* ignore */ }
  }

  // =====================================================================================================
  // Layout
  // =====================================================================================================
  // Two layouts in world units: TALL (upright phones, iPad sideways) and WIDE (iPad upright, phones sideways).
  // tray, sheet, big and lie are centers; board and oven are boxes.
  const TALL = {
    w: 420, h: 480, wall: 54,
    tray: { x: 125, y: 127, w: 222, h: 122, cols: 3, rows: 2 },
    oven: { x: 256, y: 8, w: 152, h: 198 },
    board: { x: 12, y: 214, w: 396, h: 198 },
    sheet: { x: 210, y: 313, w: 352, h: 168 }, cs: 26,
    pinRest: { x: 148, y: 448 }, pinLen: 230, cutterRest: { x: 294, y: 446 }, plate: { x: 370, y: 444, r: 44 },
    big: { x: 210, y: 313, s: 80 },
    house: { x: 118, y: 322 }, cake: { x: 232, y: 318, rx: 186, ry: 36 }, lie: { x: 222, y: 416, w: 200, h: 98 }, pile: { x: 56, y: 432 }, bag: { x: 372, y: 428 }
  };
  const WIDE = {
    w: 680, h: 420, wall: 54,
    tray: { x: 99, y: 188, w: 170, h: 236, cols: 2, rows: 3 },
    oven: { x: 516, y: 26, w: 152, h: 232 },
    board: { x: 196, y: 66, w: 306, h: 266 },
    sheet: { x: 349, y: 199, w: 274, h: 226 }, cs: 30,
    pinRest: { x: 330, y: 376 }, pinLen: 250, cutterRest: { x: 486, y: 374 }, plate: { x: 592, y: 362, r: 52 },
    big: { x: 349, y: 199, s: 98 },
    house: { x: 330, y: 330 }, cake: { x: 444, y: 326, rx: 196, ry: 38 }, lie: { x: 128, y: 220, w: 210, h: 150 }, pile: { x: 96, y: 362 }, bag: { x: 206, y: 362 }
  };
  let L = TALL, W = 0, H = 0, dpr = 1, vs = 1, vox = 0, voy = 0;
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const was = L;
    L = W / H > 1.2 ? WIDE : TALL;
    vs = Math.min(W / L.w, H / L.h) * 0.98;
    vox = (W - L.w * vs) / 2; voy = (H - L.h * vs) / 2;
    if (was !== L) placeAll();
  }
  function vp(x, y) { const r = cv.getBoundingClientRect(); return { x: r.left + vox + x * vs, y: r.top + voy + y * vs }; }
  function wpt(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - vox) / vs, y: (cy - r.top - voy) / vs }; }
  const worldT = () => ctx.setTransform(dpr * vs, 0, 0, dpr * vs, dpr * vox, dpr * voy);
  // The tray's slots (world), for a tray at pose { x, y, k }.
  function slotXY(i, pose) {
    const T = L.tray, col = i % T.cols, row = Math.floor(i / T.cols);
    const sx = -T.w / 2 + (col + 0.5) * T.w / T.cols, sy = -T.h / 2 + (row + 0.5) * T.h / T.rows;
    const p = pose || V.tray;
    return { x: p.x + sx * p.k, y: p.y + sy * p.k, s: L.cs * p.k };
  }
  const cavity = () => { const O = L.oven; return { x: O.x + 10, y: O.y + O.h * 0.22, w: O.w - 20, h: O.h * 0.68 }; };
  function ovenPose() {
    const c = cavity(), T = L.tray;
    return { x: c.x + c.w / 2, y: c.y + c.h * 0.56, k: Math.min(c.w * 0.86 / T.w, c.h * 0.72 / T.h) };
  }
  const counterPose = () => ({ x: L.tray.x, y: L.tray.y, k: 1 });
  const sheetXY = (q) => ({ x: L.sheet.x + q.u * L.sheet.w / 2, y: L.sheet.y + q.v * L.sheet.h / 2 });

  // =====================================================================================================
  // Tweens and particles
  // =====================================================================================================
  let tweens = [];
  // A motion over dur seconds: step(p) with p from 0 to 1, then done().
  function tween(dur, step, done, delay) {
    const tw = { t0: now() + (delay || 0), dur: Math.max(0.01, dur), step, done, job };
    tweens.push(tw);
    return tw;
  }
  function untween(tw) { const i = tweens.indexOf(tw); if (i >= 0) tweens.splice(i, 1); }
  function runTweens(t) {
    for (const tw of tweens.slice()) {
      if (!tweens.includes(tw)) continue;
      const p = (t - tw.t0) / tw.dur;
      if (p < 0) continue;
      if (tw.step) tw.step(Math.min(1, p));
      if (p >= 1) { untween(tw); if (tw.done) tw.done(); }
    }
  }
  const later = (sec, fn) => tween(sec, null, fn);

  let parts = [];
  function puff(kind, x, y, n, color) {
    if (reduce && kind !== "steam") n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      if (parts.length > 160) parts.shift();
      const a = Math.random() * TAU, sp = Math.random();
      const p = { kind, x, y, vx: 0, vy: 0, t: 0, life: 1, size: 3, color: color || "#FFFFFF", seed: Math.random() * 10 };
      if (kind === "flour") { p.x += (Math.random() - 0.5) * 30; p.vx = Math.cos(a) * 30 * sp; p.vy = -10 - sp * 20; p.life = 0.9; p.size = 4 + sp * 5; }
      else if (kind === "spark") { p.vx = Math.cos(a) * (40 + sp * 80); p.vy = Math.sin(a) * (40 + sp * 80); p.life = 0.8; p.size = 4 + sp * 4; p.color = color || "#FFE36B"; }
      else if (kind === "steam") { p.x += (Math.random() - 0.5) * 20; p.vx = (Math.random() - 0.5) * 6; p.vy = -18 - sp * 12; p.life = 1.8; p.size = 6 + sp * 6; }
      else if (kind === "snow") { p.x = Math.random() * L.w; p.y = -10 - Math.random() * 60; p.vy = 22 + sp * 18; p.life = 30; p.size = 1.6 + sp * 2.2; }
      parts.push(p);
    }
  }
  function stepParts(dt) {
    parts = parts.filter((p) => {
      p.t += dt;
      if (p.kind === "sprink") {
        const k = clamp(p.t / p.life, 0, 1);
        p.x = lerp(p.x0, p.tx, k); p.y = lerp(p.y0, p.ty, k * k);
        if (k >= 1) { if (p.land) p.land(); return false; }
        return true;
      }
      if (p.kind === "snow") { p.x += Math.sin(p.t * 1.6 + p.seed) * 10 * dt; p.y += p.vy * dt; return p.y < L.h + 10; }
      if (p.kind === "steam") p.vx += Math.sin(p.t * 3 + p.seed) * 14 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      return p.t < p.life;
    });
  }

  // =====================================================================================================
  // The cookie batch
  // =====================================================================================================
  // C.stage: prep (rolling, cutting, filling the baking sheet), oven (the sheet is in, door may be open), baking,
  // baked (golden, still in the oven), out (coming out), decorate, done.
  let job = savedWork && savedWork.job === "house" ? "house" : "cookies";
  let busy = false, drag = null, plateOpen = false;
  const pick = { cutter: 0, tool: 0, htool: 0 };
  if (savedWork && savedWork.pick) {
    const sp = savedWork.pick;
    if (okInt(sp.cutter, SHAPES.length)) pick.cutter = sp.cutter;
    if (okInt(sp.tool, TOOLS.length)) pick.tool = sp.tool;
    if (okInt(sp.htool, HTOOLS.length)) pick.htool = sp.htool;
  }
  function newBatch(d) { return { d: d || 0, roll: 0, cuts: [], holes: [], tray: [], stage: "prep", cur: -1 }; }
  let C = newBatch(0);
  (function restoreBatch() {
    const s = savedWork && savedWork.c;
    if (!s || typeof s !== "object") return;
    C.d = okInt(s.d, 2) ? s.d : 0;
    C.roll = num(s.roll) ? clamp(s.roll, 0, 1) : 0;
    const okQ = (q) => Array.isArray(q) && okInt(q[0], SHAPES.length) && num(q[1]) && num(q[2]);
    if (Array.isArray(s.cuts)) C.cuts = s.cuts.filter(okQ).map((q) => ({ sh: q[0], u: q[1], v: q[2], d: okInt(q[3], 2) ? q[3] : C.d, show: 1 }));
    if (Array.isArray(s.holes)) C.holes = s.holes.filter(okQ).map((q) => ({ sh: q[0], u: q[1], v: q[2] }));
    if (Array.isArray(s.tray)) s.tray.slice(0, TRAY_MAX).forEach((o, i) => { const c = des(o); if (c) { c.bake = num(o.b) ? clamp(o.b, 0, 1) : 0; c.slot = okInt(o.sl, TRAY_MAX) ? o.sl : i; C.tray.push(c); } });
    const st = ["prep", "oven", "baking", "baked", "out", "decorate"].includes(s.stage) ? s.stage : "prep";
    C.stage = st === "baking" || st === "out" ? "baked" : st;
    if (C.stage === "baked") C.tray.forEach((c) => { c.bake = 1; });
    if (C.stage !== "prep" && !C.tray.length) C = newBatch(C.d);
    if (C.stage === "oven") C.stage = "prep";
    if (C.stage === "decorate") C.cur = okInt(s.cur, C.tray.length) ? s.cur : 0;
  })();

  // What is on screen. Rebuilt from the batch (placeAll) when the page loads, a batch starts or the layout changes.
  const V = {
    pin: { x: 0, y: 0, on: false, spin: 0 }, pinWob: 0, doughA: 1, doughWob: 0,
    cutter: { x: 0, y: 0, press: 0, lift: 0, moving: false }, cutterWob: 0,
    tray: { x: 0, y: 0, k: 1 }, trayWhere: "counter", trayWob: 0,
    door: 0, doorWob: 0, glow: 0, light: 0, blink: 0, mitt: 0, plateBounce: 0,
    hand: null, held: null, steamUntil: 0, lit: 0, twinkle: 0, sparkleUntil: 0, snowCap: 0
  };
  function placeAll() {
    V.pin.on = false; V.pin.x = L.pinRest.x; V.pin.y = L.pinRest.y;
    V.cutter.x = L.cutterRest.x; V.cutter.y = L.cutterRest.y; V.cutter.press = 0; V.cutter.moving = false;
    const inOven = C.stage === "oven" || C.stage === "baking" || C.stage === "baked";
    const tp = inOven ? ovenPose() : counterPose();
    V.tray.x = tp.x; V.tray.y = tp.y; V.tray.k = tp.k; V.trayWhere = inOven ? "oven" : "counter";
    V.doughA = C.stage === "prep" ? 1 : 0;
    C.tray.forEach((c, i) => {
      if (c.where === "air" || c.where === "drag") c.where = "tray";
      if (C.stage === "decorate" && i === C.cur) { c.where = "board"; c.x = L.big.x; c.y = L.big.y; c.s = L.big.s; }
      else { const p = slotXY(c.slot, tp); c.where = "tray"; c.x = p.x; c.y = p.y; c.s = p.s; }
    });
    placeHouse();
  }
  function startBatch() {
    tweens = tweens.filter((tw) => tw.job !== "cookies"); rollTw = null; cutTw = null; doorTw = null; pendingCut = null;
    busy = false; drag = null; V.hand = null; V.held = null;
    C = newBatch(C.d);
    V.door = 0; V.glow = 0; V.mitt = 0;
    placeAll();
    V.doughA = 0;
    tween(0.5, (p) => { V.doughA = ease(p); });
    lastWant = ""; ghost.again();
    refreshTiles(); saveSoon();
  }

  let saveTimer = 0;
  function saveWork() {
    clearTimeout(saveTimer); saveTimer = 0;
    try {
      const c = {
        d: C.d, roll: +C.roll.toFixed(3), stage: C.stage, cur: C.cur,
        cuts: C.cuts.map((q) => [q.sh, +q.u.toFixed(3), +q.v.toFixed(3), q.d]), holes: C.holes.map((q) => [q.sh, +q.u.toFixed(3), +q.v.toFixed(3)]),
        tray: C.tray.filter((q) => q.where !== "gone").map((q) => Object.assign(ser(q), { b: +q.bake.toFixed(2), sl: q.slot }))
      };
      localStorage.setItem(KEY_WORK, JSON.stringify({ v: 1, job, pick, c, h: { placed: Hs.placed, dec: Hs.dec } }));
    } catch (e) { /* ignore */ }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(saveWork, 400); }

  // =====================================================================================================
  // Cookies: roll and cut
  // =====================================================================================================
  // The dough is a ball at roll 0 and a full sheet at roll 1. About three good passes of the pin roll it out.
  function doughBox(roll) {
    const e = ease(roll), S = L.sheet, R0 = L.cs * 1.8;
    return { x: S.x, y: S.y, w: lerp(R0 * 2, S.w, e), h: lerp(R0 * 1.85, S.h, e), r: lerp(R0, 22, e) };
  }
  const canRoll = () => C.stage === "prep" && C.cuts.length === 0 && (C.roll < 1 || (!freeSpot(L.sheet.x, L.sheet.y) && C.tray.length < TRAY_MAX));
  // Left-over dough with holes in it: the scraps ball up first, then it rolls out again.
  function reball(then) {
    if (C.roll < 1 || !C.holes.length) { if (then) then(); return; }
    busy = true;
    tween(0.6, (p) => { C.roll = 1 - 0.7 * ease(p); if (p > 0.4) C.holes = []; }, () => { busy = false; puff("flour", L.sheet.x, L.sheet.y, 6); if (then) then(); });
  }
  function rollBy(amount) {
    if (C.roll >= 1) return;
    C.roll = Math.min(1, C.roll + amount);
    V.pin.spin += amount * 40;
    if (Math.random() < amount * 8) puff("flour", L.sheet.x + (Math.random() - 0.5) * 120, V.pin.y, 1);
    if (C.roll >= 1) rollDone();
  }
  function rollDone() {
    C.roll = 1;
    puff("spark", L.sheet.x, L.sheet.y, 8);
    coach.say("The dough is rolled flat.", 3);
    if (drag && drag.k === "pin") drag = null;
    pinHome();
    refreshTiles(); saveSoon(); lastWant = "";
  }
  function pinHome() {
    const x0 = V.pin.x, y0 = V.pin.y;
    tween(0.5, (p) => { V.pin.x = lerp(x0, L.pinRest.x, ease(p)); V.pin.y = lerp(y0, L.pinRest.y, ease(p)); }, () => { V.pin.on = false; });
  }
  // A tap on the pin (or the dough): the pin comes onto the dough and rolls it once, up and back.
  let rollTw = null;
  function rollTap() {
    if (busy || rollTw || C.stage !== "prep") return;
    if (!canRoll()) { V.pinWob = 1; tag("Rolling pin", V.pin.x, V.pin.y - 16); hint(); return; }
    ghost.learned("pin");
    reball(() => {
      const S = L.sheet, x0 = V.pin.x, y0 = V.pin.y;
      V.pin.on = true;
      let last = S.y + S.h * 0.3;
      rollTw = tween(1.1, (p) => {
        const come = ease(Math.min(1, p * 4));
        const y = S.y + Math.cos(Math.max(0, p - 0.2) / 0.8 * TAU) * S.h * 0.3;
        V.pin.x = lerp(x0, S.x, come); V.pin.y = lerp(y0, y, come);
        if (p > 0.2) { rollBy(Math.abs(y - last) / (S.h * 4.2)); }
        last = y;
      }, () => { rollTw = null; if (C.roll >= 1) return; });
    });
  }
  // The nearest spot (to x, y) where the picked cutter can press into smooth dough, or null.
  function freeSpot(x, y) {
    if (C.roll < 1) return null;
    const S = L.sheet, cs = L.cs, step = cs * 0.35;
    const taken = C.cuts.concat(C.holes).map(sheetXY);
    let best = null, bd = Infinity;
    for (let gx = S.x - S.w / 2 + cs * 1.05; gx <= S.x + S.w / 2 - cs * 1.05; gx += step) {
      for (let gy = S.y - S.h / 2 + cs * 1.1; gy <= S.y + S.h / 2 - cs * 1.1; gy += step) {
        if (taken.some((q) => Math.hypot(q.x - gx, q.y - gy) < cs * 2.08)) continue;
        const d = Math.hypot(gx - x, gy - y);
        if (d < bd) { bd = d; best = { x: gx, y: gy }; }
      }
    }
    return best;
  }
  let cutTw = null, pendingCut = null;
  function finishCut() {
    if (cutTw) { untween(cutTw); cutTw = null; }
    if (pendingCut) { pendingCut.show = 1; pendingCut = null; }
    V.cutter.press = 0; V.cutter.moving = false;
  }
  // The picked cutter presses into the dough at (x, y), or at the nearest smooth spot.
  function cutAt(x, y) {
    if (busy || C.stage !== "prep") return;
    if (C.roll < 1) { hint(); return; }
    finishCut();
    if (C.cuts.length + C.tray.length >= TRAY_MAX) { V.trayWob = 1; coach.say("The baking sheet is full.", 3); return; }
    const spot = freeSpot(x, y);
    if (!spot) { coach.say("The dough is full of shapes.", 3); return; }
    ghost.learned("cutter");
    const q = { sh: pick.cutter, d: C.d, u: (spot.x - L.sheet.x) / (L.sheet.w / 2), v: (spot.y - L.sheet.y) / (L.sheet.h / 2), show: 0 };
    C.cuts.push(q); pendingCut = q;
    const c = V.cutter, x0 = c.x, y0 = c.y;
    c.moving = true;
    cutTw = tween(0.75, (p) => {
      const m = ease(Math.min(1, p / 0.4));
      c.x = lerp(x0, spot.x, m); c.y = lerp(y0, spot.y, m) - Math.sin(m * Math.PI) * 30;
      c.press = p < 0.4 ? 0 : Math.sin(clamp((p - 0.4) / 0.6, 0, 1) * Math.PI);
      if (p > 0.6 && !q.show) { q.show = 1; puff("flour", spot.x, spot.y, 4); }
    }, () => { cutTw = null; pendingCut = null; c.press = 0; cutterHome(); saveSoon(); lastWant = ""; });
  }
  function cutterHome() {
    const c = V.cutter, x0 = c.x, y0 = c.y;
    c.moving = true;
    cutTw = tween(0.35, (p) => { c.x = lerp(x0, L.cutterRest.x, ease(p)); c.y = lerp(y0, L.cutterRest.y, ease(p)); }, () => { cutTw = null; c.moving = false; });
  }
  const freeSlot = () => { for (let i = 0; i < TRAY_MAX; i++) if (!C.tray.some((c) => c.slot === i && c.where !== "gone")) return i; return -1; };
  // A cut shape hops from the dough onto the baking sheet; a hole stays in the dough.
  function liftCut(i, from) {
    const q = C.cuts[i];
    if (!q || C.stage !== "prep") return;
    const slot = freeSlot();
    if (slot < 0) return;
    if (q === pendingCut) finishCut();
    ghost.learned("cut");
    C.cuts.splice(i, 1);
    C.holes.push({ sh: q.sh, u: q.u, v: q.v });
    const c = newCookie(q.sh, q.d), p0 = from || sheetXY(q), t = slotXY(slot);
    c.slot = slot; c.where = "air"; c.x = p0.x; c.y = p0.y; c.s = L.cs;
    C.tray.push(c);
    tween(0.5, (p) => { const e = ease(p); c.x = lerp(p0.x, t.x, e); c.y = lerp(p0.y, t.y, e) - Math.sin(p * Math.PI) * 40; }, () => { c.where = "tray"; c.wob = 0.4; c.ph = 0; saveSoon(); lastWant = ""; });
  }

  // =====================================================================================================
  // Cookies: baking sheet and oven
  // =====================================================================================================
  let doorTw = null;
  function doorTo(to, dur, then) {
    if (doorTw) untween(doorTw);
    const from = V.door;
    doorTw = tween((dur || 0.45) * Math.max(0.2, Math.abs(to - from)), (p) => { V.door = lerp(from, to, ease(p)); }, () => { doorTw = null; if (then) then(); });
  }
  const baking = () => C.stage === "baking";
  // Two-step: sliding the sheet in with the door shut first says so (and the door wiggles); the next try opens it.
  let shutTries = 0;
  function slideIn(from) {
    if (busy || C.stage !== "prep" || !C.tray.length) return false;
    if (V.door < 0.5) {
      shutTries++;
      if (shutTries < 2) { V.doorWob = 1; coach.say("Open the oven door.", 3); return false; }
      doorTo(1, 0.45);
    }
    ghost.learned("tray");
    busy = true;
    // Shapes still in the dough hop onto the sheet first.
    const wait = C.cuts.length ? 0.55 : 0;
    while (C.cuts.length) liftCut(0);
    later(Math.max(wait, V.door < 0.5 ? 0.45 : 0), () => {
      const a = from || { x: V.tray.x, y: V.tray.y, k: V.tray.k }, b = ovenPose();
      V.trayWhere = "moving";
      tween(0.9, (p) => { const e = ease(p); V.tray.x = lerp(a.x, b.x, e); V.tray.y = lerp(a.y, b.y, e) - Math.sin(p * Math.PI) * 20; V.tray.k = lerp(a.k, b.k, e); }, () => {
        V.trayWhere = "oven"; C.stage = "oven"; busy = false; shutTries = 0; lastWant = "";
        // The left-over dough balls up and goes away until the next batch.
        tween(0.8, (p) => { C.roll = Math.min(C.roll, 1 - ease(p)); V.doughA = 1 - ease(Math.max(0, p - 0.4) / 0.6); }, () => { C.holes = []; C.roll = 0; });
        saveSoon();
      });
    });
    return true;
  }
  function backToCounter(from) {
    if (!from) return;
    const b = counterPose();
    tween(0.35, (p) => { V.tray.x = lerp(from.x, b.x, ease(p)); V.tray.y = lerp(from.y, b.y, ease(p)); V.tray.k = lerp(from.k, 1, ease(p)); }, () => { V.trayWhere = "counter"; });
  }
  function closeDoor() {
    ghost.learned("oven");
    doorTo(0, 0.5, () => { if (C.stage === "oven") startBake(); });
  }
  function startBake() {
    C.stage = "baking"; lastWant = "";
    coach.say("The cookies are baking.", 4);
    tween(5.2, (p) => {
      V.glow = Math.min(1, p * 5, (1 - p) * 8 + 0.2);
      C.tray.forEach((c) => { c.bake = ease(p); });
    }, () => {
      C.stage = "baked"; lastWant = "";
      tween(0.8, (p) => { V.glow = 0.2 * (1 - p); });
      blinkLight(2);
      saveSoon();
    }).keep = true;
  }
  function finishBakeNow() {
    if (!baking()) return;
    tweens = tweens.filter((tw) => !tw.keep);
    C.tray.forEach((c) => { c.bake = 1; });
    C.stage = "baked"; V.glow = 0; lastWant = "";
    saveSoon();
  }
  function blinkLight(n) { V.blink = n; tween(n * 0.9, (p) => { V.light = Math.sin(p * n * Math.PI) > 0 ? 1 : 0; }, () => { V.light = 0; }); }
  // Out with the oven mitt: the door opens, the mitt takes the sheet out onto the counter, the door shuts.
  function takeOut(from) {
    if (busy || C.stage !== "baked") return;
    ghost.learned("oven");
    busy = true; C.stage = "out"; lastWant = "";
    const go = () => {
      const a = from || ovenPose(), b = counterPose();
      V.trayWhere = "moving";
      tween(0.25, (p) => { V.mitt = Math.max(V.mitt, ease(p)); });
      tween(1.0, (p) => { const e = ease(p); V.tray.x = lerp(a.x, b.x, e); V.tray.y = lerp(a.y, b.y, e) - Math.sin(p * Math.PI) * 24; V.tray.k = lerp(a.k, 1, e); }, () => {
        V.trayWhere = "counter";
        tween(0.4, (p) => { V.mitt = 1 - ease(p); });
        doorTo(0, 0.5);
        V.steamUntil = now() + 5;
        C.stage = "decorate"; busy = false; refreshTiles();
        coach.say("Fresh cookies! They cool on the counter.", 3.5);
        later(1.2, () => { if (C.stage === "decorate" && C.cur < 0) bringNext(); });
        saveSoon();
      });
    };
    if (from) go(); else doorTo(1, 0.45, go);
  }

  // =====================================================================================================
  // Cookies: decorate and plate
  // =====================================================================================================
  const curCookie = () => (C.stage === "decorate" && C.cur >= 0 ? C.tray[C.cur] : null);
  const decoN = (c) => c.i.length + c.p.length / 6 + c.k.length;
  function bringNext(i) {
    const k = i != null ? i : C.tray.findIndex((c) => c.where === "tray");
    const c = C.tray[k];
    if (!c || c.where !== "tray") return;
    busy = true; c.where = "air";
    const a = { x: c.x, y: c.y, s: c.s }, B = L.big;
    tween(0.6, (p) => { const e = ease(p); c.x = lerp(a.x, B.x, e); c.y = lerp(a.y, B.y, e) - Math.sin(p * Math.PI) * 40; c.s = lerp(a.s, B.s, e); }, () => {
      c.where = "board"; C.cur = k; busy = false; c.plateHint = false; lastWant = ""; saveSoon();
    });
  }
  // A waiting cookie comes up; the one on the board goes back to its spot on the baking sheet.
  function swapTo(i) {
    if (busy || C.stage !== "decorate" || i === C.cur) return;
    const c0 = curCookie();
    if (c0) {
      const t = slotXY(c0.slot), a = { x: c0.x, y: c0.y, s: c0.s };
      c0.where = "air";
      tween(0.5, (p) => { const e = ease(p); c0.x = lerp(a.x, t.x, e); c0.y = lerp(a.y, t.y, e); c0.s = lerp(a.s, t.s, e); }, () => { c0.where = "tray"; });
    }
    C.cur = -1;
    bringNext(i);
  }
  function platePos() { return { x: L.plate.x, y: L.plate.y }; }
  function plateCookie() {
    const c = curCookie();
    if (!c || busy) return;
    ghost.learned("plate");
    busy = true; c.where = "air";
    const a = { x: c.x, y: c.y, s: c.s }, t = platePos();
    tween(0.75, (p) => { const e = ease(p); c.x = lerp(a.x, t.x, e); c.y = lerp(a.y, t.y, e) - Math.sin(p * Math.PI) * 60; c.s = lerp(a.s, L.plate.r * 0.3, e); }, () => {
      c.where = "gone"; c.bake = 1;
      plate.push(des(ser(c)));
      if (plate.length > PLATE_MAX) plate.splice(0, plate.length - PLATE_MAX);
      savePlate();
      V.plateBounce = 1; puff("spark", t.x, t.y, 6);
      C.tray = C.tray.filter((q) => q !== c);
      C.cur = -1; busy = false; lastWant = "";
      if (C.tray.some((q) => q.where === "tray")) bringNext();
      else finishBatch();
      saveSoon();
    });
  }
  function finishBatch() {
    C.stage = "done"; lastWant = "";
    coach.say("The cookies are on the plate!", 4);
    Toybox.kind();
    later(4, () => { if (C.stage === "done") startBatch(); });
  }

  // =====================================================================================================
  // The gingerbread house
  // =====================================================================================================
  // House geometry, in world units from the front wall's bottom-left corner (the house's base point): the front
  // wall faces us and the house runs back along DV (up and to the right), so the right side wall and both roof
  // pieces show. Each piece is drawn in its own flat units through a pose { o, ex, ey } (an affine map), so a
  // piece lying on the counter turns into a standing one by blending the two poses.
  const GW = 150, WH = 96, PH = 72, DV = { x: 70, y: -46 };
  const v2 = (x, y) => ({ x, y }), vadd = (a, b) => v2(a.x + b.x, a.y + b.y), vsub = (a, b) => v2(a.x - b.x, a.y - b.y), vmul = (a, k) => v2(a.x * k, a.y * k);
  const LD = Math.hypot(DV.x, DV.y), DU = vmul(DV, 1 / LD);
  const HR = v2(GW / 2, -WH - PH), LE = vadd(HR, vmul(vsub(v2(0, -WH), HR), 1.15)), RE = vadd(HR, vmul(vsub(v2(GW, -WH), HR), 1.15));
  const SL = Math.hypot(RE.x - HR.x, RE.y - HR.y), RL = LD * 1.16;
  const FO = vmul(DV, -0.08), BO = vmul(DV, 1.08);
  const RF = vadd(HR, FO), LEF = vadd(LE, FO), REF = vadd(RE, FO), REB = vadd(RE, BO);
  const PIECES = [
    { id: "back", kind: "gable", name: "back wall", stand: { o: DV, ex: v2(1, 0), ey: v2(0, 1) } },
    { id: "left", kind: "wall", name: "side wall", stand: { o: v2(0, 0), ex: DU, ey: v2(0, 1) } },
    { id: "right", kind: "wall", name: "side wall", stand: { o: v2(GW, 0), ex: DU, ey: v2(0, 1) } },
    { id: "front", kind: "gable", name: "front wall", stand: { o: v2(0, 0), ex: v2(1, 0), ey: v2(0, 1) } },
    { id: "roofL", kind: "roof", name: "roof", stand: { o: RF, ex: DU, ey: vmul(vsub(LE, HR), 1 / SL) } },
    { id: "roofR", kind: "roof", name: "roof", stand: { o: RF, ex: DU, ey: vmul(vsub(RE, HR), 1 / SL) } }
  ];
  const SHAPE_OF = { gable: [0, 0, GW, 0, GW, -WH, GW / 2, -WH - PH, 0, -WH], wall: [0, 0, LD, 0, LD, -WH, 0, -WH], roof: [0, 0, RL, 0, RL, SL, 0, SL] };
  const BOUNDS = { gable: [0, -WH - PH, GW, WH + PH], wall: [0, -WH, LD, WH], roof: [0, 0, RL, SL] };
  const EDGE_W = { gable: GW, wall: LD, roof: RL };
  const DOOR = { x0: GW / 2 - 19, x1: GW / 2 + 19, top: -54 };
  // Where icicles can hang (the roof's front edges and the right eave) and the ridge, house units.
  const EAVES = [[LEF, RF], [RF, REF], [REF, REB]];
  const RIDGE = [RF, vadd(HR, BO)];
  const BINS = 12, DRAW_ORDER = [0, 1, 2, 4, 3, 5];

  const Hs = { placed: 0, bins: new Array(BINS).fill(0), dec: { i: [], sn: [], all: 0, ic: [], k: [] } };
  (function restoreHouse() {
    const s = savedWork && savedWork.h;
    if (!s || typeof s !== "object") return;
    Hs.placed = okInt(s.placed, 7) ? s.placed : 0;
    if (Hs.placed === 6 && okHouseDec(s.dec)) Hs.dec = { i: s.dec.i.filter(Array.isArray), sn: s.dec.sn.filter(Array.isArray), all: s.dec.all ? 1 : 0, ic: s.dec.ic.filter(Array.isArray), k: s.dec.k.filter((q) => Array.isArray(q) && CANDY_T.includes(q[0])) };
  })();
  const built = () => Hs.placed >= 6;
  const HV = { stand: null, slide: 0, bag: { x: 0, y: 0, held: false, auto: false }, wob: 0, pileWob: 0 };
  function placeHouse() { HV.bag.x = L.bag.x; HV.bag.y = L.bag.y; HV.bag.held = false; V.lit = built() ? 1 : 0; if (Hs.dec.all) V.snowCap = 1; }
  const affine = (P, x, y) => v2(P.o.x + P.ex.x * x + P.ey.x * y, P.o.y + P.ex.y * x + P.ey.y * y);
  function inverse(P, w) {
    const det = P.ex.x * P.ey.y - P.ey.x * P.ex.y, dx = w.x - P.o.x, dy = w.y - P.o.y;
    return v2((dx * P.ey.y - dy * P.ey.x) / det, (P.ex.x * dy - P.ex.y * dx) / det);
  }
  function standPose(i) { const s = PIECES[i].stand; return { o: vadd(L.house, s.o), ex: s.ex, ey: s.ey }; }
  function lyingPose(i) {
    const b = BOUNDS[PIECES[i].kind], Lp = L.lie, k = Math.min(Lp.w / b[2], Lp.h / (b[3] * 0.8));
    const pose = { o: v2(Lp.x - (b[0] + b[2] / 2) * k, Lp.y - (b[1] + b[3] / 2) * k * 0.8), ex: v2(k, 0), ey: v2(0, k * 0.8) };
    if (HV.slide < 1) {
      // The next piece slides over from the pile.
      const e = ease(HV.slide), s = lerp(0.3, 1, e), c = v2(lerp(L.pile.x, Lp.x, e), lerp(L.pile.y, Lp.y, e));
      return { o: v2(c.x + s * (pose.o.x - Lp.x), c.y + s * (pose.o.y - Lp.y)), ex: vmul(pose.ex, s), ey: vmul(pose.ey, s) };
    }
    return pose;
  }
  function lerpPose(a, b, t) {
    return { o: v2(lerp(a.o.x, b.o.x, t), lerp(a.o.y, b.o.y, t)), ex: v2(lerp(a.ex.x, b.ex.x, t), lerp(a.ex.y, b.ex.y, t)), ey: v2(lerp(a.ey.x, b.ey.x, t), lerp(a.ey.y, b.ey.y, t)) };
  }
  const activePiece = () => (built() || HV.stand ? -1 : Hs.placed);
  // Icing along the active piece's edge: the bins under the bag's tip fill as it passes.
  function iceAt(w) {
    const i = activePiece();
    if (i < 0) return;
    const P = lyingPose(i), l = inverse(P, w), kind = PIECES[i].kind, ew = EDGE_W[kind], b = BOUNDS[kind];
    const tol = b[3] * 0.55 + 22 / P.ey.y;
    if (Math.abs(l.y) > tol || l.x < -20 / P.ex.x || l.x > ew + 20 / P.ex.x) return;
    const k = clamp(Math.floor(l.x / ew * BINS), 0, BINS - 1);
    for (let j = k - 1; j <= k + 1; j++) if (j >= 0 && j < BINS && !Hs.bins[j]) { Hs.bins[j] = 1; }
    if (Hs.bins.filter(Boolean).length >= BINS - 2) { Hs.bins.fill(1); standUp(); }
  }
  // A tap: the bag runs along the edge by itself.
  function autoIce() {
    const i = activePiece();
    if (i < 0 || busy) return;
    ghost.learned("piece");
    busy = true; HV.bag.auto = true;
    const P = lyingPose(i), ew = EDGE_W[PIECES[i].kind], b0 = { x: HV.bag.x, y: HV.bag.y };
    tween(0.3, (p) => { const t = affine(P, 0, 0); HV.bag.x = lerp(b0.x, t.x, ease(p)); HV.bag.y = lerp(b0.y, t.y, ease(p)); }, () => {
      tween(1.0, (p) => { const t = affine(P, ew * p, 0); HV.bag.x = t.x; HV.bag.y = t.y; Hs.bins[Math.min(BINS - 1, Math.floor(p * BINS))] = 1; }, () => {
        Hs.bins.fill(1); HV.bag.auto = false; busy = false; standUp();
      });
    });
  }
  function bagHome() {
    const b0 = { x: HV.bag.x, y: HV.bag.y };
    HV.bag.held = false;
    tween(0.4, (p) => { HV.bag.x = lerp(b0.x, L.bag.x, ease(p)); HV.bag.y = lerp(b0.y, L.bag.y, ease(p)); });
  }
  // The iced piece stands up into its place on the cake board and sticks.
  function standUp() {
    const i = activePiece();
    if (i < 0) return;
    if (drag && drag.k === "ice") drag = null;
    bagHome();
    busy = true; lastWant = "";
    const a = lyingPose(i), b = standPose(i);
    HV.stand = { i, p: 0, a, b };
    tween(1.1, (p) => { HV.stand.p = ease(p); }, () => {
      HV.stand = null; Hs.placed = i + 1; Hs.bins.fill(0); busy = false;
      const c = vadd(L.house, v2(GW / 2, -WH / 2));
      puff("spark", c.x, c.y, 5);
      if (built()) houseBuilt();
      else { HV.slide = 0; tween(0.5, (p) => { HV.slide = p; }); }
      lastWant = ""; saveSoon();
    });
  }
  function houseBuilt() {
    coach.say("The gingerbread house is standing!", 4);
    tween(1.5, (p) => { V.lit = ease(p); });
    snowSift(50);
    Toybox.kind();
    refreshTiles();
    savedHouse = Hs.dec; savePlate();
  }
  function newHouse() {
    tweens = tweens.filter((tw) => tw.job !== "house"); busy = false; drag = null; V.hand = null; V.held = null;
    Hs.placed = 0; Hs.bins.fill(0); Hs.dec = { i: [], sn: [], all: 0, ic: [], k: [] };
    HV.stand = null; HV.slide = 0; V.lit = 0; V.snowCap = 0;
    tween(0.5, (p) => { HV.slide = p; });
    placeHouse(); refreshTiles(); lastWant = ""; ghost.again(); saveSoon();
  }

  // =====================================================================================================
  // Decorating tools
  // =====================================================================================================
  // One surface at a time takes decorations: the cookie on the board (its own units) or the built house (world
  // units from the house's base point). Icing keeps every point his finger passes; candy follows the finger and
  // stays where he lets go (or where he taps).
  const POINT_CAP = 700, ITEM_CAP = 60, SPRINK_CAP = 160;
  let candyN = 0;
  function surface() {
    if (plateOpen) return null;
    if (job === "cookies") {
      const c = curCookie();
      if (!c || c.where !== "board") return null;
      return { kind: "cookie", c, tool: TOOLS[pick.tool], loc: (w) => v2((w.x - L.big.x) / L.big.s, (w.y - L.big.y) / L.big.s), minD: 0.035 };
    }
    if (!built()) return null;
    return { kind: "house", tool: HTOOLS[pick.htool], loc: (w) => v2(w.x - L.house.x, w.y - L.house.y), minD: 3 };
  }
  const pointsIn = (list) => list.reduce((n, st) => n + (st.pts ? st.pts.length : st.length), 0);
  function toolDown(sf, w) {
    const l = sf.loc(w), t = sf.tool;
    ghost.learned("deco");
    if (sf.kind === "cookie") sf.c.plateHint = false;
    lastDeco = now();
    if (t.kind === "icing") {
      if (sf.kind === "cookie") {
        if (pointsIn(sf.c.i) > POINT_CAP) return { kind: "none" };
        const st = { c: t.c, pts: [l.x, l.y] };
        sf.c.i.push(st);
        return { kind: "icing", st, last: l };
      }
      if (pointsIn(Hs.dec.i) > POINT_CAP * 2) return { kind: "none" };
      const st = [Math.round(l.x), Math.round(l.y)];
      Hs.dec.i.push(st);
      return { kind: "hicing", st, last: l };
    }
    if (t.kind === "sprinkles") { sprinkleBurst(sf, l, 4); return { kind: "sprinkles", l, acc: 0 }; }
    if (t.kind === "snow") { snowAt(l); return { kind: "snow", last: l, moved: 0 }; }
    if (t.kind === "icicles") { const ic = icicleAt(l, 0); return { kind: "icicles", last: ic }; }
    if (t.kind === "candy") {
      const col = candyN++;
      V.held = { t: t.t, w: v2(w.x, w.y), c: t.t === "g" ? col % GUM.length : t.t === "b" ? col % BUTTON.length : 0 };
      return { kind: "candy" };
    }
    return { kind: "none" };
  }
  function toolMove(sf, d, w, dt) {
    const l = sf.loc(w);
    lastDeco = now();
    if (d.kind === "icing") {
      if (Math.hypot(l.x - d.last.x, l.y - d.last.y) >= sf.minD && pointsIn(sf.c.i) < POINT_CAP) { d.st.pts.push(l.x, l.y); d.last = l; }
    } else if (d.kind === "hicing") {
      if (Math.hypot(l.x - d.last.x, l.y - d.last.y) >= sf.minD && pointsIn(Hs.dec.i) < POINT_CAP * 2) { d.st.push(Math.round(l.x), Math.round(l.y)); d.last = l; }
    } else if (d.kind === "sprinkles") { d.l = l; d.acc += dt || 0; }
    else if (d.kind === "snow") {
      if (Math.hypot(l.x - d.last.x, l.y - d.last.y) >= 6 && Hs.dec.sn.length < 220) { snowAt(l); d.last = l; d.moved = 1; }
    } else if (d.kind === "icicles") {
      if (!d.last || Math.hypot(l.x - d.last.x, l.y - d.last.y) > 4) { const ic = icicleAt(l, d.last); if (ic) d.last = ic; }
    } else if (d.kind === "candy" && V.held) V.held.w = v2(w.x, w.y - 10);
  }
  function toolUp(sf, d, w, tap) {
    if (d.kind === "candy" && V.held) {
      const pw = tap ? w : V.held.w;
      placeCandy(sf, V.held, pw);
      V.held = null;
    } else if (d.kind === "sprinkles" && tap) sprinkleBurst(sf, d.l, 14);
    else if (d.kind === "snow" && tap && !d.moved) snowAll();
    else if (d.kind === "icicles" && tap) { const l = sf.loc(w); icicleAt(l, null, 3); }
    lastDeco = now(); saveSoon();
    if (sf.kind === "house") { savedHouse = Hs.dec; savePlateSoon(); }
  }
  let plateSaveT = 0;
  function savePlateSoon() { clearTimeout(plateSaveT); plateSaveT = setTimeout(savePlate, 800); }
  function placeCandy(sf, h, w) {
    let l = sf.loc(w);
    if (sf.kind === "cookie") {
      const c = sf.c;
      if (c.k.length >= ITEM_CAP) return;
      // Off the cookie, the candy slides in until it sits on the cookie.
      for (let k = 0; k < 12 && !onShape(c.sh, l.x, l.y); k++) l = v2(l.x * 0.85, l.y * 0.85);
      c.k.push([h.t, l.x, l.y, h.c]);
    } else {
      if (Hs.dec.k.length >= ITEM_CAP * 2) return;
      l = snapCandy(h.t, l);
      Hs.dec.k.push([h.t, Math.round(l.x), Math.round(l.y), h.c]);
    }
    const p = sf.kind === "cookie" ? v2(L.big.x + l.x * L.big.s, L.big.y + l.y * L.big.s) : v2(L.house.x + l.x, L.house.y + l.y);
    puff("spark", p.x, p.y, 3);
  }
  // Candy canes snap beside the door; gumdrops near the ridge snap onto it.
  function snapCandy(t, l) {
    if (t === "c" && l.y > DOOR.top - 20 && l.y < 6 && l.x > DOOR.x0 - 26 && l.x < DOOR.x1 + 26) return v2(l.x < GW / 2 ? DOOR.x0 - 4 : DOOR.x1 + 4, -24);
    if (t === "g") { const q = nearestOn([RIDGE], l); if (q.d < 16) return v2(q.x, q.y - 4); }
    return l;
  }
  function nearestOn(segs, l) {
    let best = { x: l.x, y: l.y, d: Infinity };
    segs.forEach(([a, b]) => {
      const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((l.x - a.x) * dx + (l.y - a.y) * dy) / (dx * dx + dy * dy), 0, 1);
      const x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(l.x - x, l.y - y);
      if (d < best.d) best = { x, y, d };
    });
    return best;
  }
  function sprinkleBurst(sf, l, n) {
    const c = sf.c, B = L.big;
    for (let i = 0; i < n; i++) {
      if (c.p.length >= SPRINK_CAP) return;
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.2, tx = l.x + Math.cos(a) * r, ty = l.y + Math.sin(a) * r;
      const col = Math.floor(Math.random() * SPRINK.length), ang = Math.random() * Math.PI;
      const wx = B.x + tx * B.s, wy = B.y + ty * B.s;
      parts.push({ kind: "sprink", x0: wx + (Math.random() - 0.5) * 10, y0: wy - 34, x: wx, y: wy - 34, tx: wx, ty: wy, t: -Math.random() * 0.15, life: 0.25, color: SPRINK[col], ang,
        land: () => { if (onShape(c.sh, tx, ty) && c.p.length < SPRINK_CAP) c.p.push([col, tx, ty, ang]); } });
    }
  }
  function snowAt(l) { Hs.dec.sn.push([Math.round(l.x), Math.round(l.y)]); }
  function snowAll() {
    if (Hs.dec.all) { V.snowCap = 1; snowSift(20); return; }
    Hs.dec.all = 1;
    tween(0.8, (p) => { V.snowCap = ease(p); });
  }
  // Icicles hang from the nearest roof edge; n of them side by side for a tap.
  function icicleAt(l, last, n) {
    const q = nearestOn(EAVES, l);
    if (q.d > 60 || Hs.dec.ic.length >= 120) return last;
    n = n || 1;
    let made = null;
    for (let k = 0; k < n; k++) {
      const x = q.x + (k - (n - 1) / 2) * 8, y = q.y + (k - (n - 1) / 2) * (q.x > REF.x - 2 ? -5 : 0);
      if (last && Math.hypot(x - last.x, y - last.y) < 7) continue;
      const len = 9 + Math.round(hash(Hs.dec.ic.length, 4) * 12);
      Hs.dec.ic.push([Math.round(x), Math.round(y), len]);
      made = v2(x, y);
    }
    return made || last;
  }

  // =====================================================================================================
  // Drawing helpers
  // =====================================================================================================
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fs(fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.stroke(); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  const rgbOf = (h) => { const v = parseInt(h.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; };
  function shade(h, t) {
    const c = rgbOf(h), to = t > 0 ? 255 : 0, k = Math.abs(t);
    return "#" + c.map((v) => Math.round(v + (to - v) * k).toString(16).padStart(2, "0")).join("");
  }
  const rgba = (h, a) => "rgba(" + rgbOf(h).join(",") + "," + a + ")";
  function mixHex(a, b, t) {
    const x = rgbOf(a), y = rgbOf(b);
    return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  function polyPath(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); }
  function ring(x, y, r, pulse) {
    ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 4, 0, TAU);
    ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
  }
  function sparkle(x, y, r) {
    if (r <= 0.5) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
  }

  // =====================================================================================================
  // Drawing cookies and candy
  // =====================================================================================================
  // A cookie at (x, y), size s (world units). o: { rot, sc, wob, ph }.
  function drawCookie(c, x, y, s, o) {
    o = o || {};
    const D = DOUGHS[c.d], k = s * (1 + 0.06 * c.bake) * (o.sc || 1), a = o.wob ? o.wob * Math.sin(o.ph || 0) : 0, P = PATHS[c.sh];
    ctx.save();
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); ctx.scale(k * (1 + a), k * (1 - a));
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.lineWidth = LW * 2 / k; ctx.strokeStyle = INK; ctx.stroke(P);
    ctx.fillStyle = mixHex(D.raw, D.baked, c.bake); ctx.fill(P);
    ctx.save(); ctx.clip(P);
    // Baked edges brown a little; the top stays soft.
    if (c.bake > 0.02) { ctx.lineWidth = 0.24; ctx.strokeStyle = rgba(D.rim, 0.45 * c.bake); ctx.stroke(P); }
    ctx.fillStyle = c.d ? rgba("#5E3010", 0.35) : rgba("#FFFFFF", 0.5 * (1 - c.bake));
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc((hash(i, c.sh + 1) * 2 - 1) * 0.7, (hash(i, c.sh + 7) * 2 - 1) * 0.7, 0.03, 0, TAU); ctx.fill(); }
    c.p.forEach((q) => { ctx.save(); ctx.translate(q[1], q[2]); ctx.rotate(q[3]); ctx.fillStyle = SPRINK[q[0]]; rr(-0.045, -0.015, 0.09, 0.03, 0.015); ctx.fill(); ctx.lineWidth = 0.6 / k; ctx.strokeStyle = rgba(INK, 0.5); ctx.stroke(); ctx.restore(); });
    c.i.forEach((st) => icingLine(st.pts, ICING[st.c], 0.11, k));
    ctx.restore();
    c.k.forEach((q) => drawCandy(q[0], q[1], q[2], q[3], 0.12, 1.4 / k));
    ctx.restore();
  }
  // A line of icing through the points (x, y, x, y, ...): a soft darker edge under the color. w = width.
  function icingLine(pts, col, w, k) {
    if (pts.length < 2) return;
    const path = () => {
      ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
      if (pts.length === 2) ctx.lineTo(pts[0] + 0.001, pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    };
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    path(); ctx.strokeStyle = col === "#FFFFFF" ? "#AEB8CC" : shade(col, -0.35); ctx.lineWidth = w + 1.6 / k; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = w * 0.3; ctx.stroke();
  }
  // One candy at (x, y), its size z, outline width lw (same units).
  function drawCandy(t, x, y, ci, z, lw) {
    ctx.save(); ctx.translate(x, y); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round";
    if (t === "g") {
      const col = GUM[ci % GUM.length];
      ctx.beginPath(); ctx.moveTo(-z, z * 0.55); ctx.bezierCurveTo(-z, -z * 0.9, z, -z * 0.9, z, z * 0.55); ctx.closePath(); fs(col, lw);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc((hash(i, 2) - 0.5) * z * 1.3, (hash(i, 5) - 0.6) * z * 0.9, z * 0.08, 0, TAU); ctx.fill(); }
    } else if (t === "b") {
      ell(0, 0, z * 0.62, z * 0.62); fs(BUTTON[ci % BUTTON.length], lw);
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ell(-z * 0.2, -z * 0.2, z * 0.18, z * 0.12); ctx.fill();
    } else if (t === "r") {
      ell(0, 0, z * 0.42, z * 0.42); fs("#D61F2C", lw);
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ell(-z * 0.14, -z * 0.14, z * 0.1, z * 0.08); ctx.fill();
    } else if (t === "e") {
      ell(0, 0, z * 0.7, z * 0.7); fs("#FFFFFF", lw);
      ell(z * 0.12, z * 0.1, z * 0.36, z * 0.36); ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ell(z * 0.24, -z * 0.04, z * 0.1, z * 0.1); ctx.fill();
    } else if (t === "m") {
      ell(0, 0, z * 0.85, z * 0.85); fs("#FFFFFF", lw);
      ctx.fillStyle = "#E8303F";
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, z * 0.78, i * TAU / 4, i * TAU / 4 + 0.7); ctx.closePath(); ctx.fill(); }
      ell(0, 0, z * 0.85, z * 0.85); ctx.stroke();
    } else if (t === "c") {
      // A candy cane, upright, its hook to the outside (ci: 1 = hook to the right).
      const s = ci ? -1 : 1, path = () => { ctx.beginPath(); ctx.moveTo(0, z * 1.6); ctx.lineTo(0, -z * 0.7); ctx.arc(-s * z * 0.5, -z * 0.7, z * 0.5, 0, Math.PI, s > 0); };
      ctx.lineCap = "round";
      path(); ctx.strokeStyle = INK; ctx.lineWidth = z * 0.5 + lw * 2; ctx.stroke();
      path(); ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = z * 0.5; ctx.stroke();
      ctx.setLineDash([z * 0.3, z * 0.3]); path(); ctx.strokeStyle = "#E8303F"; ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Drawing the kitchen, oven and tools
  // =====================================================================================================
  function drawRoom(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wy = voy + L.wall * vs;
    ctx.fillStyle = "#FBE3C8"; ctx.fillRect(0, 0, W, wy);
    ctx.fillStyle = "#F7D6B4";
    const sw = 18 * vs;
    for (let x = vox % (sw * 2) - sw * 2; x < W; x += sw * 2) ctx.fillRect(x, 0, sw, wy);
    ctx.fillStyle = "#F3EBE1"; ctx.fillRect(0, wy, W, H - wy);
    ctx.strokeStyle = "rgba(29,35,64,0.07)"; ctx.lineWidth = 1;
    const tl = 70 * vs;
    for (let x = vox % tl - tl; x < W; x += tl) { ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = LW * vs;
    ctx.beginPath(); ctx.moveTo(0, wy); ctx.lineTo(W, wy); ctx.stroke();
    // A garland with little lights across the wall.
    const gy = Math.max(10, wy * 0.32), seg = 70 * vs, x0 = vox % seg - seg;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = x0; x < W + seg; x += seg) { ctx.moveTo(x, gy); ctx.quadraticCurveTo(x + seg / 2, gy + 26 * vs, x + seg, gy); }
    ctx.strokeStyle = INK; ctx.lineWidth = 13 * vs; ctx.stroke();
    ctx.strokeStyle = "#2E8B4A"; ctx.lineWidth = 9 * vs; ctx.stroke();
    const cols = ["#E8303F", "#FFD23B", "#3D8BFF", "#FF8A1F"];
    let k = 0;
    for (let x = x0; x < W + seg; x += seg, k++) {
      [0.3, 0.7].forEach((f, j) => {
        const bx = x + seg * f, by = gy + 26 * vs * 2 * f * (1 - f) * 2 * 0.5 + 6 * vs;
        const on = 0.75 + 0.25 * Math.sin(t * 1.5 + k + j * 2);
        ctx.fillStyle = cols[(k * 2 + j) % 4]; ctx.globalAlpha = on;
        ctx.beginPath(); ctx.ellipse(bx, by, 4 * vs, 6 * vs, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1; ctx.lineWidth = 1.5 * vs; ctx.strokeStyle = INK; ctx.stroke();
      });
    }
    worldT();
  }
  function drawBoard() {
    const B = L.board;
    rr(B.x, B.y, B.w, B.h, 16); fs("#E5B57A");
    ctx.save(); rr(B.x, B.y, B.w, B.h, 16); ctx.clip();
    ctx.strokeStyle = "rgba(150,90,40,0.25)"; ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) { const y = B.y + i * B.h / 6; ctx.beginPath(); ctx.moveTo(B.x, y); ctx.bezierCurveTo(B.x + B.w * 0.3, y + 6, B.x + B.w * 0.6, y - 6, B.x + B.w, y + 3); ctx.stroke(); }
    // Flour dusted on the board.
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(B.x + hash(i, 1) * B.w, B.y + hash(i, 2) * B.h, 2 + hash(i, 3) * 4, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawDough() {
    if (V.doughA <= 0.01 || C.stage === "decorate" || C.stage === "done") return;
    const D = DOUGHS[C.d], b = doughBox(C.roll), wob = Math.sin(V.doughWob * 20) * V.doughWob * 0.05;
    ctx.save(); ctx.globalAlpha = V.doughA;
    ctx.translate(b.x, b.y); ctx.scale(1 + wob, 1 - wob); ctx.translate(-b.x, -b.y);
    rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.r); fs(D.raw);
    ctx.save(); rr(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.r); ctx.clip();
    if (C.roll < 0.6) { const g = ctx.createRadialGradient(b.x - b.w * 0.2, b.y - b.h * 0.25, 2, b.x, b.y, b.w * 0.6); g.addColorStop(0, "rgba(255,255,255,0.5)"); g.addColorStop(1, "rgba(0,0,0,0.08)"); ctx.fillStyle = g; ctx.fillRect(b.x - b.w, b.y - b.h, b.w * 2, b.h * 2); }
    ctx.fillStyle = C.d ? "rgba(255,240,220,0.35)" : "rgba(255,255,255,0.7)";
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(b.x + (hash(i, 8) - 0.5) * b.w, b.y + (hash(i, 9) - 0.5) * b.h, 1.6, 0, TAU); ctx.fill(); }
    const cs = L.cs;
    C.holes.forEach((q) => {
      const p = sheetXY(q);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(cs, cs);
      ctx.fillStyle = "#E5B57A"; ctx.fill(PATHS[q.sh]);
      ctx.lineWidth = 1.6 / cs; ctx.strokeStyle = shade(D.raw, -0.35); ctx.stroke(PATHS[q.sh]);
      ctx.restore();
    });
    ctx.restore();
    C.cuts.forEach((q) => {
      if (!q.show) return;
      const p = sheetXY(q);
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(cs, cs);
      ctx.fillStyle = shade(DOUGHS[q.d].raw, 0.12); ctx.fill(PATHS[q.sh]);
      ctx.lineWidth = 2 / cs; ctx.strokeStyle = shade(D.raw, -0.45); ctx.stroke(PATHS[q.sh]);
      ctx.restore();
    });
    ctx.restore();
  }
  function drawPin() {
    const p = V.pin, len = L.pinLen, wob = Math.sin(V.pinWob * 25) * V.pinWob * 0.06;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wob);
    const bw = len * 0.62;
    [-1, 1].forEach((s) => { rr(s > 0 ? bw / 2 - 2 : -len / 2, -6, len / 2 - bw / 2 + 2, 12, 6); fs("#C0844B"); });
    rr(-bw / 2, -13, bw, 26, 12); fs("#E9B87C");
    ctx.save(); rr(-bw / 2, -13, bw, 26, 12); ctx.clip();
    ctx.strokeStyle = "rgba(150,90,40,0.35)"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const y = -13 + ((i * 6 + p.spin) % 36 + 36) % 36 - 4; ctx.beginPath(); ctx.moveTo(-bw / 2, y); ctx.lineTo(bw / 2, y); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-bw / 2, -9, bw, 5);
    ctx.restore();
    ctx.restore();
  }
  // A metal cookie cutter of shape sh at (x, y): just its rim.
  function drawCutter(sh, x, y, s, press, wob) {
    ctx.save(); ctx.translate(x, y - (1 - press) * 4);
    if (wob) ctx.rotate(Math.sin(wob * 25) * wob * 0.15);
    ctx.scale(s * (1 - press * 0.04), s * (1 - press * 0.04));
    if (press < 0.5) { ctx.save(); ctx.translate(0.08, 0.14); ctx.lineWidth = 0.22; ctx.strokeStyle = "rgba(29,35,64,0.15)"; ctx.stroke(PATHS[sh]); ctx.restore(); }
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.24 + LW * 2 / s; ctx.strokeStyle = INK; ctx.stroke(PATHS[sh]);
    ctx.lineWidth = 0.24; ctx.strokeStyle = "#D5DEE8"; ctx.stroke(PATHS[sh]);
    ctx.lineWidth = 0.07; ctx.strokeStyle = "#FFFFFF"; ctx.stroke(PATHS[sh]);
    ctx.restore();
  }
  function drawTray(pose, which) {
    const T = L.tray, k = pose.k, w = T.w * k, h = T.h * k, wob = Math.sin(V.trayWob * 25) * V.trayWob * 0.03;
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(wob); ctx.translate(-pose.x, -pose.y);
    rr(pose.x - w / 2, pose.y - h / 2, w, h, 10 * k); fs("#B8C3CF", LW);
    rr(pose.x - w / 2 + 6 * k, pose.y - h / 2 + 6 * k, w - 12 * k, h - 12 * k, 6 * k); fs("#F6EEDC", 1.4);
    ctx.restore();
    C.tray.forEach((c) => {
      if (c.where !== "tray" || (which && which !== "tray")) return;
      const p = slotXY(c.slot, pose);
      c.x = p.x; c.y = p.y; c.s = p.s;
      drawCookie(c, p.x, p.y, p.s, { wob: c.wob, ph: c.ph });
    });
  }
  function doorQuad() {
    const O = L.oven, hy = O.y + O.h * 0.93, top0 = O.y + O.h * 0.2, dh = hy - top0, th = V.door * Math.PI / 2 * 0.98;
    const top = hy - dh * Math.cos(th) + dh * 0.34 * Math.sin(th), sp = 9 * Math.sin(th), x0 = O.x + 6, x1 = O.x + O.w - 6;
    return { bl: v2(x0, hy), br: v2(x1, hy), tr: v2(x1 + sp, top), tl: v2(x0 - sp, top) };
  }
  const quadAt = (q, u, v) => { const b = v2(lerp(q.bl.x, q.br.x, u), lerp(q.bl.y, q.br.y, u)), t = v2(lerp(q.tl.x, q.tr.x, u), lerp(q.tl.y, q.tr.y, u)); return v2(lerp(b.x, t.x, v), lerp(b.y, t.y, v)); };
  function drawOven(t) {
    const O = L.oven, cv0 = cavity();
    // Body, control panel with two knobs and the oven light.
    rr(O.x, O.y, O.w, O.h, 12); fs("#E4E9EF");
    rr(O.x + 6, O.y + 6, O.w - 12, O.h * 0.13, 6); fs("#C9302C");
    const ky = O.y + 6 + O.h * 0.065, on = baking() ? 1 : 0;
    [0.22, 0.5].forEach((f, i) => {
      const kx = O.x + O.w * f;
      ell(kx, ky, 9, 9); fs("#F4F6F8", 1.8);
      const a = -Math.PI / 2 + on * (1.4 + i * 0.4);
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx + Math.cos(a) * 7, ky + Math.sin(a) * 7); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
    });
    const lightOn = Math.max(on * (0.7 + 0.3 * Math.sin(t * 3)), V.light);
    ell(O.x + O.w * 0.8, ky, 6, 6); fs(lightOn > 0.1 ? mixHex("#8A5A2A", "#FFB43C", lightOn) : "#8A5A2A", 1.6);
    if (lightOn > 0.3) { ctx.fillStyle = rgba("#FFD27A", 0.35 * lightOn); ell(O.x + O.w * 0.8, ky, 12, 12); ctx.fill(); }
    // Inside the oven: the rack, the warm glow and the baking sheet when it is in.
    rr(cv0.x, cv0.y, cv0.w, cv0.h, 6); fs("#3B2A27", 1.8);
    const glow = Math.max(V.glow, V.light * 0.5);
    if (glow > 0.01) { ctx.fillStyle = rgba("#FF9A2E", 0.55 * glow); rr(cv0.x, cv0.y, cv0.w, cv0.h, 6); ctx.fill(); }
    ctx.strokeStyle = "#8A7A72"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x = cv0.x + 8 + i * (cv0.w - 16) / 5; ctx.beginPath(); ctx.moveTo(x, cv0.y + cv0.h * 0.62); ctx.lineTo(x, cv0.y + cv0.h * 0.82); ctx.stroke(); }
    if (V.trayWhere === "oven") {
      ctx.save(); rr(cv0.x, cv0.y, cv0.w, cv0.h, 6); ctx.clip();
      drawTray(V.tray);
      if (glow > 0.01) { ctx.fillStyle = rgba("#FF9A2E", 0.18 * glow); ctx.fillRect(cv0.x, cv0.y, cv0.w, cv0.h); }
      ctx.restore();
    }
    // The door: hinged at the bottom, it drops toward us. Its window shows inside.
    const q = doorQuad(), wob = Math.sin(V.doorWob * 25) * V.doorWob * 3;
    const shift = (p) => v2(p.x, p.y + (p === q.tl || p === q.tr ? wob : 0));
    const outer = [q.bl, q.br, q.tr, q.tl].map(shift);
    const win = [quadAt(q, 0.14, 0.28), quadAt(q, 0.86, 0.28), quadAt(q, 0.86, 0.8), quadAt(q, 0.14, 0.8)].map(shift);
    ctx.beginPath();
    ctx.moveTo(outer[0].x, outer[0].y); outer.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
    ctx.moveTo(win[0].x, win[0].y); win.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
    ctx.fillStyle = "#EEF2F6"; ctx.fill("evenodd"); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke();
    polyPath(win); ctx.fillStyle = glow > 0.01 ? rgba("#FFB648", 0.25 + 0.2 * glow) : "rgba(60,80,110,0.28)"; ctx.fill();
    if (V.door < 0.5) { ctx.fillStyle = "rgba(255,255,255,0.35)"; const a = win[3], b = win[2]; ctx.beginPath(); ctx.moveTo(a.x + 6, a.y + 4); ctx.lineTo(a.x + 22, a.y + 4); ctx.lineTo(win[0].x + 10, win[0].y - 4); ctx.lineTo(win[0].x + 2, win[0].y - 4); ctx.closePath(); ctx.fill(); void b; }
    const h0 = shift(quadAt(q, 0.2, 0.9)), h1 = shift(quadAt(q, 0.8, 0.9));
    ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y);
    ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = "#C9302C"; ctx.lineWidth = 5; ctx.stroke();
  }
  function drawMitt(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.25);
    ctx.beginPath(); ctx.moveTo(-14, 22); ctx.lineTo(-16, -6); ctx.bezierCurveTo(-16, -30, 16, -30, 16, -6); ctx.lineTo(14, 22); ctx.closePath(); fs("#E8303F");
    ctx.beginPath(); ctx.ellipse(-18, 2, 6, 11, -0.5, 0, TAU); fs("#E8303F");
    rr(-16, 16, 32, 12, 4); fs("#FFFFFF");
    ctx.strokeStyle = "rgba(29,35,64,0.35)"; ctx.lineWidth = 1.2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8 - 6, -14); ctx.lineTo(i * 8 + 6, 12); ctx.stroke(); }
    ctx.restore();
  }
  function drawPlateSmall() {
    const P = L.plate, b = 1 + Math.sin(V.plateBounce * 14) * V.plateBounce * 0.06;
    ctx.save(); ctx.translate(P.x, P.y); ctx.scale(b, b);
    ell(0, 0, P.r, P.r * 0.78); fs("#FFFFFF");
    ell(0, 0, P.r * 0.72, P.r * 0.55); ctx.strokeStyle = "#7FB2E5"; ctx.lineWidth = 3; ctx.stroke();
    const list = plate.slice(-7), s = P.r * 0.3;
    list.forEach((c, i) => {
      const a = i / Math.max(1, list.length) * TAU + 0.4, r = list.length > 1 ? P.r * 0.4 : 0;
      drawCookie(c, Math.cos(a) * r, Math.sin(a) * r * 0.7, s);
    });
    ctx.restore();
  }
  // The tool in his hand while decorating: the piping bag (tip at his finger) or the sprinkles shaker above it.
  function drawHand(t) {
    const h = V.hand;
    if (!h) return;
    if (h.kind === "icing" || h.kind === "hicing" || h.kind === "bag") drawBag(h.x, h.y, h.col || "#FFFFFF", h.squeeze || 0);
    else if (h.kind === "sprinkles") {
      ctx.save(); ctx.translate(h.x + 4, h.y - 46); ctx.rotate(Math.PI + 0.5 + Math.sin(t * 22) * 0.12);
      rr(-12, -20, 24, 36, 6); fs("#FFFFFF");
      ctx.fillStyle = "#E8303F"; ctx.fillRect(-11, -4, 22, 8);
      rr(-13, 14, 26, 9, 3); fs("#FFD23B");
      ctx.restore();
    }
  }
  function drawBag(x, y, col, squeeze) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.6);
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(3, -6); ctx.lineTo(0, 0); ctx.closePath(); fs("#C9D3E0", 1.6);
    const sq = 1 - squeeze * 0.12;
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.bezierCurveTo(-18 * sq, -24, -20 * sq, -46, -12, -56); ctx.lineTo(12, -56); ctx.bezierCurveTo(20 * sq, -46, 18 * sq, -24, 4, -6); ctx.closePath();
    fs("rgba(240,246,255,0.95)");
    ctx.save(); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(-24, -40, 48, 40); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.bezierCurveTo(-18 * sq, -24, -20 * sq, -46, -12, -56); ctx.lineTo(12, -56); ctx.bezierCurveTo(20 * sq, -46, 18 * sq, -24, 4, -6); ctx.closePath();
    ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    rr(-13, -62, 26, 8, 3); fs("#E8303F", 1.8);
    ctx.restore();
  }
  function drawCookieScene(t) {
    drawBoard();
    drawDough();
    drawOven(t);
    if (V.trayWhere !== "oven") drawTray(V.tray);
    if (V.mitt > 0.01) { const T = L.tray; ctx.globalAlpha = V.mitt; drawMitt(V.tray.x - T.w * V.tray.k / 2 - 4, V.tray.y + 4, 1.1); ctx.globalAlpha = 1; }
    drawPlateSmall();
    drawPin();
    if (C.stage === "prep" && C.roll >= 1 || V.cutter.moving) drawCutter(pick.cutter, V.cutter.x, V.cutter.y, L.cs * (V.cutter.moving || drag && drag.k === "cutter" ? 1 : 0.85), V.cutter.press, V.cutterWob);
    C.tray.forEach((c) => { if (c.where === "board") drawCookie(c, c.x, c.y, c.s, { wob: c.wob, ph: c.ph }); });
    C.tray.forEach((c) => { if (c.where === "air" || c.where === "drag") drawCookie(c, c.x, c.y, c.s, { wob: c.wob, ph: c.ph }); });
  }

  // =====================================================================================================
  // Drawing the house
  // =====================================================================================================
  const GINGER = "#B8743A";
  function drawCake() {
    const K = L.cake;
    ell(K.x, K.y + 6, K.rx, K.ry); fs("#C8D3DF");
    ell(K.x, K.y, K.rx, K.ry); fs("#F5F8FB");
    ctx.save(); ell(K.x, K.y, K.rx, K.ry); ctx.clip();
    ctx.strokeStyle = "rgba(29,35,64,0.12)"; ctx.lineWidth = 1.5;
    ell(K.x, K.y, K.rx * 0.88, K.ry * 0.8); ctx.stroke();
    ctx.restore();
  }
  // A piece through pose P: the gingerbread, its edge darker, windows and the door, roof tiles.
  function drawPiece(i, P, o) {
    const kind = PIECES[i].kind, sh = SHAPE_OF[kind], pts = [];
    for (let k = 0; k < sh.length; k += 2) pts.push(affine(P, sh[k], sh[k + 1]));
    const col = PIECES[i].id === "right" ? shade(GINGER, -0.08) : PIECES[i].id === "roofL" ? shade(GINGER, 0.08) : GINGER;
    polyPath(pts); ctx.lineJoin = "round"; fs(col);
    ctx.save(); polyPath(pts); ctx.clip();
    const T = (x, y) => affine(P, x, y), line = (a, b) => { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
    ctx.lineCap = "round";
    if (kind === "roof") {
      // Rows of roof tiles piped on in icing-brown.
      ctx.strokeStyle = shade(GINGER, -0.3); ctx.lineWidth = 1.6;
      for (let y = 18; y < SL; y += 18) {
        ctx.beginPath();
        for (let x = 0; x <= RL; x += 3) { const p = T(x, y + Math.abs(Math.sin(x / RL * Math.PI * 6)) * 6); if (x === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
        ctx.stroke();
      }
    }
    const lit = V.lit * (0.85 + 0.15 * Math.sin(now() * (3 + V.twinkle * 9)) * Math.max(0.3, V.twinkle));
    const glass = lit > 0.02 ? mixHex("#4A2A18", "#FFD25A", Math.min(1, lit)) : "#4A2A18";
    const win = (cx, cy, w, h) => {
      polyPath([T(cx - w / 2, cy - h / 2), T(cx + w / 2, cy - h / 2), T(cx + w / 2, cy + h / 2), T(cx - w / 2, cy + h / 2)]); fs(glass, 2);
      ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2.6; line(T(cx, cy - h / 2), T(cx, cy + h / 2)); line(T(cx - w / 2, cy), T(cx + w / 2, cy));
    };
    const roundWin = (cx, cy, r) => { const ps = []; for (let k = 0; k < 16; k++) ps.push(T(cx + Math.cos(k / 16 * TAU) * r, cy + Math.sin(k / 16 * TAU) * r)); polyPath(ps); fs(glass, 2); };
    if (PIECES[i].id === "front") {
      const ps = [T(DOOR.x0, 0), T(DOOR.x0, DOOR.top + 19)];
      for (let k = 0; k <= 10; k++) ps.push(T(GW / 2 - Math.cos(k / 10 * Math.PI) * 19, DOOR.top + 19 - Math.sin(k / 10 * Math.PI) * 19));
      ps.push(T(DOOR.x1, 0));
      polyPath(ps); fs(lit > 0.02 ? mixHex("#6B3A1A", "#FFC24A", lit * 0.7) : "#6B3A1A", 2);
      ell(T(DOOR.x1 - 7, -26).x, T(DOOR.x1 - 7, -26).y, 2.4, 2.4); ctx.fillStyle = "#FFD23B"; ctx.fill();
      roundWin(GW / 2, -WH - 22, 12);
      win(26, -58, 24, 24); win(GW - 26, -58, 24, 24);
    } else if (PIECES[i].id === "back") roundWin(GW / 2, -WH - 22, 12);
    else if (PIECES[i].id === "right") { win(LD * 0.3, -56, 22, 26); win(LD * 0.72, -56, 22, 26); }
    // The baked edge.
    polyPath(pts); ctx.lineWidth = 6; ctx.strokeStyle = rgba("#6E3C14", 0.3); ctx.stroke();
    ctx.restore();
    polyPath(pts); ctx.lineWidth = LW; ctx.strokeStyle = INK; ctx.stroke();
    // Royal icing along the edge.
    if (o && o.bins) {
      const ew = EDGE_W[kind];
      for (let k = 0; k < BINS; k++) {
        if (!o.bins[k]) continue;
        for (let j = 0; j < 3; j++) { const p = T((k + (j + 0.5) / 3) / BINS * ew, 0); ell(p.x, p.y, 4.2, 4.2); fs("#FFFFFF", 1.4); }
      }
    }
    if (o && o.edgeHint) {
      const a = T(0, 0), b = T(EDGE_W[kind], 0), pulse = 0.5 + 0.5 * Math.sin(now() * 4);
      ctx.setLineDash([8, 8]); ctx.lineDashOffset = -now() * 20;
      ctx.lineWidth = 4 + pulse * 2; ctx.strokeStyle = "#FFC93C"; line(a, b); ctx.setLineDash([]);
    }
  }
  function housePath(ids) {
    const p = new Path2D();
    ids.forEach((i) => { const P = standPose(i), sh = SHAPE_OF[PIECES[i].kind]; for (let k = 0; k < sh.length; k += 2) { const q = affine(P, sh[k], sh[k + 1]); if (k) p.lineTo(q.x, q.y); else p.moveTo(q.x, q.y); } p.closePath(); });
    return p;
  }
  function drawSnow(roofI) {
    const d = Hs.dec, P = standPose(roofI), clipP = housePath([roofI]);
    ctx.save(); ctx.clip(clipP);
    if (d.all && V.snowCap > 0.01) {
      ctx.globalAlpha = V.snowCap;
      const ps = [affine(P, -10, -10), affine(P, RL + 10, -10)];
      for (let x = RL + 10; x >= -10; x -= 4) ps.push(affine(P, x, SL * 0.42 + Math.sin(x / 9) * 5 + Math.sin(x / 23) * 4));
      polyPath(ps); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = "#AFC3D6"; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#FFFFFF";
    d.sn.forEach((q) => { ell(L.house.x + q[0], L.house.y + q[1], 11, 9); ctx.fill(); });
    ctx.restore();
  }
  function drawHouse(t) {
    const placedN = Hs.placed, standing = HV.stand;
    DRAW_ORDER.forEach((i) => {
      if (i < placedN) drawPiece(i, standPose(i));
      if (i === 4 && placedN > 4) drawSnow(4);
      if (i === 5 && placedN > 5) drawSnow(5);
    });
    // The piece standing up right now comes to the front while it moves.
    if (standing) {
      const pose = lerpPose(standing.a, standing.b, standing.p);
      pose.o = v2(pose.o.x, pose.o.y - Math.sin(standing.p * Math.PI) * 26);
      drawPiece(standing.i, pose, { bins: Hs.bins });
    }
    if (!built()) return;
    const d = Hs.dec, X = L.house.x, Y = L.house.y;
    ctx.save(); ctx.clip(housePath([3, 2, 4, 5]));
    ctx.translate(X, Y);
    d.i.forEach((st) => icingLine(st, "#FFFFFF", 4.5, 1));
    ctx.restore();
    d.ic.forEach((q, n) => {
      const x = X + q[0], y = Y + q[1], len = q[2] * (0.92 + 0.08 * Math.sin(t * 2 + n));
      ctx.beginPath(); ctx.moveTo(x - 3.5, y - 1); ctx.lineTo(x + 3.5, y - 1); ctx.lineTo(x, y + len); ctx.closePath(); fs("#F2FAFF", 1.4);
    });
    d.k.forEach((q) => drawCandy(q[0], X + q[1], Y + q[2], q[3], q[0] === "c" ? 13 : q[0] === "b" ? 8 : q[0] === "m" ? 9 : 10, 1.6));
    if (now() < V.sparkleUntil) d.k.forEach((q, n) => { const ph = (t * 1.3 + n * 0.37) % 1; if (ph < 0.3) sparkle(X + q[1] + 5, Y + q[2] - 5, 6 * Math.sin(ph / 0.3 * Math.PI)); });
  }
  function drawPile() {
    const n = Math.max(0, 5 - Hs.placed - (HV.slide < 1 ? 0 : 0)), P = L.pile, wob = Math.sin(HV.pileWob * 25) * HV.pileWob * 0.05;
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(wob);
    for (let k = 0; k < n; k++) { rr(-44 + k * 2, 10 - k * 9, 88, 16, 5); fs(k % 2 ? GINGER : shade(GINGER, -0.06)); }
    ctx.restore();
  }
  function drawHouseScene(t) {
    drawCake();
    drawHouse(t);
    const i = activePiece();
    if (i >= 0) drawPiece(i, lyingPose(i), { bins: Hs.bins, edgeHint: !drag && !busy && HV.slide >= 1 });
    if (!built()) {
      drawPile();
      drawBag(HV.bag.x, HV.bag.y, "#FFFFFF", HV.bag.held || HV.bag.auto ? 0.6 : 0);
    }
  }

  // =====================================================================================================
  // The plate view
  // =====================================================================================================
  // The Plate button (or a tap on the plate) shows the plate big: the last house at the back, the gingerbread
  // people standing in a row in front of it (the family), the other cookies on the plate. Each one hops when tapped.
  let pv = { a: 0, hops: [] };
  function openPlate(on) {
    if (on === plateOpen) return;
    plateOpen = on;
    bar.shelfOpen(on);
    pv.hops = plate.map(() => ({ y: 0, v: 0 }));
    lastWant = "";
    if (on) { coach.step(plate.length || savedHouse ? "Tap a cookie to make it hop." : "The plate is empty. Bake some cookies!"); ghost.stop(); drag = null; }
    tween(0.3, (p) => { pv.a = on ? ease(p) : 1 - ease(p); });
  }
  function pvLayout() {
    const fam = [], rest = [];
    plate.forEach((c, i) => (c.sh === PERSON ? fam : rest).push(i));
    const hasH = !!savedHouse, spots = [];
    const famY = H * (hasH ? 0.64 : 0.42), fs0 = Math.min(H * 0.1, W / (fam.length + 1) / 2.3, 60);
    fam.forEach((i, k) => spots[i] = { x: W / 2 + (k - (fam.length - 1) / 2) * fs0 * 2.1, y: famY, s: fs0 });
    const prx = Math.min(W * 0.44, 340), pry = Math.min(H * 0.13, prx * 0.32), py = H * 0.84;
    const rs = Math.min(pry * 0.75, prx * 2 / Math.max(1, rest.length) / 2.2, 48);
    rest.forEach((i, k) => {
      const perRow = Math.max(1, Math.floor(prx * 1.8 / (rs * 2.2))), row = Math.floor(k / perRow), n = Math.min(perRow, rest.length - row * perRow);
      spots[i] = { x: W / 2 + (k % perRow - (n - 1) / 2) * rs * 2.2, y: py - pry * 0.25 + row * rs * 0.9, s: rs };
    });
    const hk = Math.min(W * 0.5 / 250, H * 0.36 / 230);
    return { spots, plate: { x: W / 2, y: py, rx: prx, ry: pry }, house: hasH ? { x: W / 2 - 115 * hk, y: H * 0.5, k: hk } : null };
  }
  function pvHit(sx, sy) {
    const lay = pvLayout();
    let best = -1, bd = Infinity;
    lay.spots.forEach((p, i) => { if (!p) return; const d = Math.hypot(sx - p.x, sy - p.y); if (d < p.s * 1.2 && d < bd) { bd = d; best = i; } });
    return best;
  }
  function drawPlateView(t) {
    if (pv.a <= 0.01) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "rgba(29,35,64," + 0.55 * pv.a + ")"; ctx.fillRect(0, 0, W, H);
    const lay = pvLayout(), svs = vs;
    ctx.save(); ctx.globalAlpha = pv.a;
    if (lay.house) {
      // The saved house, drawn with its decorations at a small size.
      const h = lay.house, oldDec = Hs.dec, oldP = Hs.placed, oldL = L.house, oldLit = V.lit;
      ctx.save(); ctx.translate(h.x, h.y); ctx.scale(h.k, h.k);
      Hs.dec = savedHouse; Hs.placed = 6; L.house = v2(0, 0); V.lit = 1;
      const st = HV.stand; HV.stand = null; const cap = V.snowCap; V.snowCap = 1;
      try { ell(116, -4, 150, 26); fs("#F5F8FB"); drawHouse(t); } finally { Hs.dec = oldDec; Hs.placed = oldP; L.house = oldL; V.lit = oldLit; HV.stand = st; V.snowCap = cap; }
      ctx.restore();
    }
    vs = 1;
    const P = lay.plate;
    ell(P.x, P.y, P.rx, P.ry); fs("#FFFFFF", 3);
    ell(P.x, P.y, P.rx * 0.75, P.ry * 0.7); ctx.strokeStyle = "#7FB2E5"; ctx.lineWidth = 4; ctx.stroke();
    plate.forEach((c, i) => { const p = lay.spots[i], h = pv.hops[i]; if (p) drawCookie(c, p.x, p.y - (h ? h.y : 0), p.s); });
    vs = svs;
    ctx.restore();
  }

  // =====================================================================================================
  // What comes next: coach, ring and ghost hand
  // =====================================================================================================
  let lastDeco = 0;
  function toolLine(sf) {
    const t = sf.tool, on = sf.kind === "cookie" ? "cookie" : "house";
    if (t.kind === "icing") return "Draw icing on the " + on + ".";
    if (t.kind === "sprinkles") return "Shake sprinkles on the cookie.";
    if (t.kind === "snow") return "Spread icing snow on the roof.";
    if (t.kind === "icicles") return "Make icicles under the edge of the roof.";
    if (t.t === "c") return "Put candy canes beside the door.";
    if (t.t === "g" && sf.kind === "house") return "Put gumdrops along the top of the roof.";
    return "Put " + t.name.toLowerCase() + " on the " + on + ".";
  }
  function want() {
    if (busy || plateOpen) return null;
    if (job === "cookies") {
      switch (C.stage) {
        case "prep":
          if (C.roll < 1) return { line: "Roll out the dough.", part: "pin" };
          if (C.cuts.length + C.tray.length < 3 && freeSpot(L.sheet.x, L.sheet.y)) return { line: "Cut shapes with the cookie cutter.", part: "cutter" };
          if (C.cuts.length) return { line: "Put the cookies on the baking sheet.", part: "cut0" };
          if (!C.tray.length) return { line: "Roll out the dough.", part: "pin" };
          if (V.door < 0.5) return { line: "Open the oven door.", part: "oven" };
          return { line: "Slide the baking sheet into the oven.", part: "tray" };
        case "oven": return V.door > 0.5 ? { line: "Close the oven door.", part: "oven" } : null;
        case "baked": return { line: "Take the baking sheet out with the oven mitt.", part: "oven" };
        case "decorate": {
          const sf = surface();
          if (!sf) return null;
          if (sf.c.plateHint || (decoN(sf.c) >= 3 && now() - lastDeco > 3.5 && !drag)) { sf.c.plateHint = true; return { line: "Put the cookie on the plate.", part: "plate" }; }
          return { line: toolLine(sf), part: "deco" };
        }
      }
      return null;
    }
    const i = activePiece();
    if (i >= 0) {
      if (HV.slide < 1) return null;
      const pc = PIECES[i];
      return { line: pc.kind === "roof" ? "Squeeze icing along the top of the roof piece." : "Squeeze icing along the bottom of the " + pc.name + ".", part: "piece" };
    }
    const sf = surface();
    return sf ? { line: toolLine(sf), part: "house" } : null;
  }
  // A part's spot (world) and size, for the ring, the coach and the ghost hand.
  function partPt(part) {
    if (part === "pin") return { x: V.pin.x, y: V.pin.y, r: 36 };
    if (part === "cutter") return { x: V.cutter.x, y: V.cutter.y, r: L.cs * 1.15 };
    if (part === "oven") { const q = doorQuad(); return { x: (q.bl.x + q.br.x) / 2, y: (q.bl.y + q.tl.y) / 2, r: L.oven.w * 0.45 }; }
    if (part === "tray") return { x: V.tray.x, y: V.tray.y, r: Math.min(L.tray.w, L.tray.h) * 0.5 };
    if (part === "plate") return { x: L.plate.x, y: L.plate.y, r: L.plate.r };
    if (part === "deco") return { x: L.big.x, y: L.big.y, r: L.big.s * 1.05 };
    if (part === "sheet") return { x: L.sheet.x, y: L.sheet.y, r: 60 };
    if (/^cut\d+$/.test(part)) { const q = C.cuts[+part.slice(3)]; if (!q) return null; const p = sheetXY(q); return { x: p.x, y: p.y, r: L.cs * 1.1 }; }
    if (part === "piece") { const i = activePiece(); if (i < 0) return null; const P = lyingPose(i), b = BOUNDS[PIECES[i].kind], c = affine(P, b[0] + b[2] / 2, b[1] + b[3] / 2); return { x: c.x, y: c.y, r: L.lie.h * 0.55 }; }
    if (part === "house") return { x: L.house.x + GW / 2 + 20, y: L.house.y - 90, r: 100 };
    return null;
  }
  function drawRing(t) {
    const w = want();
    if (!w || locked() || drag || w.part === "piece" || w.part === "house") return;
    if (w.part === "deco" && (decoN(curCookie()) > 0 || now() - lastDeco < 6)) return;
    const p = partPt(w.part), pulse = 0.5 + 0.5 * Math.sin(t * 4);
    if (!p) return;
    if (w.part === "tray") {
      const T = L.tray, k = V.tray.k, g = 4 + pulse * 4;
      rr(V.tray.x - T.w * k / 2 - g, V.tray.y - T.h * k / 2 - g, T.w * k + g * 2, T.h * k + g * 2, 14);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    } else if (w.part === "pin") {
      const g = 4 + pulse * 4, len = L.pinLen;
      rr(V.pin.x - len / 2 - g, V.pin.y - 13 - g, len + g * 2, 26 + g * 2, 18);
      ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 4; ctx.stroke();
    } else ring(p.x, p.y, Math.min(p.r, 80), pulse);
  }
  const coach = Toybox.coach($("coach"));
  let lastWant = "";
  function updateCoach() {
    // While he holds something the line stays as it is, so a new instruction never pops up over his work.
    if (plateOpen || drag) return;
    const w = want(), line = w ? w.line : "";
    if (line === lastWant) return;
    lastWant = line;
    if (!line) { coach.busy(); return; }
    coach.step(line);
    const p = partPt(w.part);
    if (p) { const v = vp(p.x, p.y); coach.avoid(v.x, v.y); }
  }
  // The ghost hand shows a tap first and the real move (a drag) after that.
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (locked() || press.active() || drag || plateOpen) return null;
      const w = want();
      if (!w) return null;
      const key = w.part.replace(/\d+$/, ""), first = ghost.shown(key) < 1;
      const P = (x, y) => { const v = vp(x, y); return [v.x, v.y]; };
      const S = L.sheet;
      if (w.part === "pin") {
        if (first) return { pts: [P(V.pin.x, V.pin.y)], tap: true, key };
        return { pts: [P(V.pin.x, V.pin.y), P(S.x, S.y + S.h * 0.3), P(S.x, S.y - S.h * 0.3), P(S.x, S.y + S.h * 0.3), P(S.x, S.y - S.h * 0.2)], dur: 2400, key };
      }
      if (w.part === "cutter") {
        const f = freeSpot(S.x, S.y);
        if (first || !f) return { pts: [P(V.cutter.x, V.cutter.y)], tap: true, key };
        return { pts: [P(V.cutter.x, V.cutter.y), P(f.x, f.y)], dur: 1500, key };
      }
      if (/^cut\d+$/.test(w.part)) {
        const p = partPt(w.part), s = slotXY(Math.max(0, freeSlot()));
        return first ? { pts: [P(p.x, p.y)], tap: true, key } : { pts: [P(p.x, p.y), P(s.x, s.y)], dur: 1500, key };
      }
      if (w.part === "tray" && !first) { const o = ovenPose(); return { pts: [P(V.tray.x, V.tray.y), P(o.x, o.y)], dur: 1600, key }; }
      if (w.part === "deco") {
        const B = L.big, t = surface() && surface().tool;
        if (t && t.kind === "icing") return { pts: [P(B.x - B.s * 0.4, B.y - B.s * 0.1), P(B.x - B.s * 0.1, B.y + B.s * 0.15), P(B.x + B.s * 0.2, B.y - B.s * 0.1), P(B.x + B.s * 0.4, B.y + B.s * 0.1)], dur: 1600, key };
        return { pts: [P(B.x, B.y)], tap: true, key };
      }
      if (w.part === "piece") {
        const i = activePiece(), Pp = lyingPose(i), ew = EDGE_W[PIECES[i].kind], a = affine(Pp, 0, 0), b = affine(Pp, ew, 0), c = partPt("piece");
        return first ? { pts: [P(c.x, c.y)], tap: true, key } : { pts: [P(a.x, a.y), P(b.x, b.y)], dur: 1600, key };
      }
      const p = partPt(w.part);
      return p ? { pts: [P(p.x, p.y)], tap: true, key } : null;
    }
  });

  // =====================================================================================================
  // Input
  // =====================================================================================================
  function tag(name, x, y) { const v = vp(x, y); Toybox.nametag(name, v.x, v.y - 10, 1800); }
  const inBox = (w, B, pad) => w.x >= B.x - pad && w.x <= B.x + B.w + pad && w.y >= B.y - pad && w.y <= B.y + B.h + pad;
  // The part under a press (client px). The things he works with right now come before the scenery.
  function hitPart(cx, cy) {
    if (locked()) return null;
    if (plateOpen) { const r = cv.getBoundingClientRect(), i = pvHit(cx - r.left, cy - r.top); return i >= 0 ? "pv" + i : "pvout"; }
    const w = wpt(cx, cy), minR = 26 / vs;
    let best = null, bd = Infinity;
    const cand = (id, x, y, r) => { const d = Math.hypot(w.x - x, w.y - y); if (d <= Math.max(r, minR) && d - r * 0.3 < bd) { bd = d - r * 0.3; best = id; } };
    if (job === "house") {
      const i = activePiece();
      if (i >= 0) {
        const P = lyingPose(i), l = inverse(P, w), b = BOUNDS[PIECES[i].kind], pad = 24 / P.ex.x;
        if (l.x > b[0] - pad && l.x < b[0] + b[2] + pad && l.y > b[1] - pad && l.y < b[1] + b[3] + pad * 1.5) return "piece";
        cand("bag", HV.bag.x, HV.bag.y - 28, 36);
        cand("pile", L.pile.x, L.pile.y, 46);
        if (best) return best;
      }
      if (built()) {
        const K = L.cake, hx = L.house.x, hy = L.house.y;
        if (w.x > hx - 40 && w.x < hx + GW + DV.x + 40 && w.y > hy + DV.y - WH - PH - 50 && w.y < hy + 30) return "house";
        if (Math.hypot((w.x - K.x) / K.rx, (w.y - K.y) / K.ry) < 1.1) return "house";
      } else if (Hs.placed && w.x > L.house.x - 20 && w.x < L.house.x + GW + DV.x + 20 && w.y > L.house.y - 220 && w.y < L.house.y + 10) return "standing";
      const K = L.cake;
      if (Math.hypot((w.x - K.x) / K.rx, (w.y - K.y) / K.ry) < 1) return "cake";
      return null;
    }
    const st = C.stage;
    if (st === "decorate") {
      const c = curCookie();
      if (c && c.where === "board" && Math.hypot(w.x - L.big.x, w.y - L.big.y) < L.big.s * 1.25) return "deco";
      C.tray.forEach((q, i) => { if (q.where === "tray") cand("tc" + i, q.x, q.y, q.s * 1.1); });
    }
    if (st === "prep") {
      C.cuts.forEach((q, i) => { if (q.show) { const p = sheetXY(q); cand("cut" + i, p.x, p.y, L.cs * 1.05); } });
      if (C.roll >= 1) cand("cutter", V.cutter.x, V.cutter.y, L.cs * 1.1);
      if (best) return best;
    }
    if (best) return best;
    cand("plate", L.plate.x, L.plate.y, L.plate.r);
    // The pin: anywhere along its length.
    if (Math.abs(w.x - V.pin.x) < L.pinLen / 2 + 6 && Math.abs(w.y - V.pin.y) < Math.max(22, minR * 0.8)) cand("pin", w.x, V.pin.y, 1);
    if (best) return best;
    const O = L.oven, q = doorQuad();
    if (inBox(w, O, 6) || (V.door > 0.3 && w.x > O.x - 10 && w.x < O.x + O.w + 10 && w.y < Math.max(q.tl.y, q.bl.y) + 10 && w.y > O.y)) return "oven";
    if (V.trayWhere === "counter") { const T = L.tray; if (Math.abs(w.x - V.tray.x) < T.w / 2 + 6 && Math.abs(w.y - V.tray.y) < T.h / 2 + 6) return "tray"; }
    if (st === "prep" && V.doughA > 0.5) {
      const b = doughBox(C.roll);
      if (Math.abs(w.x - b.x) < b.w / 2 + 8 && Math.abs(w.y - b.y) < b.h / 2 + 8) return C.roll >= 1 ? "sheet" : "dough";
    }
    if (inBox(w, L.board, 0)) return "board";
    return null;
  }
  function hint() {
    const w = want();
    if (!w) return;
    coach.say(w.line, 3);
    ghost.poke();
  }
  // A tap: each part does its own one motion. Parts not needed right now still answer (a wiggle and their name).
  function doTap(part, cx, cy) {
    if (locked() || part == null) return;
    if (plateOpen) {
      if (part === "pvout") openPlate(false);
      else { const h = pv.hops[+part.slice(2)]; if (h && h.y <= 0) h.v = 260; }
      return;
    }
    const w = cx != null ? wpt(cx, cy) : null, st = C.stage;
    if (part === "pin") rollTap();
    else if (part === "dough") rollTap();
    else if (part === "sheet") { if (w) cutAt(w.x, w.y); else { const f = freeSpot(L.sheet.x, L.sheet.y); if (f) cutAt(f.x, f.y); } }
    else if (part === "cutter") { if (C.roll < 1) { V.cutterWob = 1; hint(); } else cutAt(L.sheet.x - L.sheet.w * 0.3, L.sheet.y - L.sheet.h * 0.2); }
    else if (/^cut\d+$/.test(part)) liftCut(+part.slice(3));
    else if (part === "tray") {
      if (st === "prep" && C.tray.length) slideIn();
      else { V.trayWob = 1; tag("Baking sheet", V.tray.x, V.tray.y - L.tray.h / 2); if (st === "prep") hint(); }
    } else if (part === "oven") ovenTap();
    else if (part === "plate") { if (st === "decorate" && curCookie() && !busy) plateCookie(); else openPlate(true); }
    else if (/^tc\d+$/.test(part)) swapTo(+part.slice(2));
    else if (part === "board") { if (w) tag("Pastry board", w.x, w.y); }
    else if (part === "piece" || part === "bag") autoIce();
    else if (part === "pile") { HV.pileWob = 1; tag("Gingerbread pieces", L.pile.x, L.pile.y - 30); }
    else if (part === "cake") { if (w) tag("Cake board", w.x, w.y); }
    else if (part === "standing") { HV.wob = 1; tag("Gingerbread house", L.house.x + GW / 2, L.house.y - WH - PH); hint(); }
  }
  function ovenTap() {
    if (busy) return;
    const st = C.stage;
    if (st === "baked") takeOut();
    else if (baking()) { blinkLight(2); coach.say("The cookies are baking.", 3); }
    else if (st === "oven") { if (V.door > 0.5) closeDoor(); else doorTo(1); }
    else if (st === "prep" && C.tray.length && !C.cuts.length && V.door < 0.5) { ghost.learned("oven"); doorTo(1); shutTries = 1; }
    else doorTo(V.door > 0.5 ? 0 : 1);
  }

  // Drags: the part follows his finger and the real thing happens while he does it. One finger owns the drag
  // (drag.pid); a press held still and let go within the slop counts as that part's tap.
  const SLOP = 12;
  let skipTap = false;
  const press = Toybox.press(cv, {
    any: true,
    hit: (x, y) => hitPart(x, y),
    // Decorating and icing start the moment the finger lands, so a still finger already pipes or sprinkles.
    down: (part, e, s) => {
      if (drag || locked() || plateOpen) return;
      const w = wpt(s.x0, s.y0);
      if (part === "deco" || part === "house") {
        const sf = surface();
        if (!sf) return;
        const d = toolDown(sf, w);
        drag = { k: "tool", pid: e.pointerId, far: 0, d, sf };
        handFor(sf, d, w);
      } else if ((part === "piece" || part === "bag") && activePiece() >= 0 && !busy && HV.slide >= 1) {
        drag = { k: "ice", pid: e.pointerId, far: 0, part };
        HV.bag.held = true;
        if (part === "piece") { HV.bag.x = w.x; HV.bag.y = w.y; iceAt(w); }
        ghost.learned("piece");
      }
    },
    dragStart: (part, e, s) => {
      if (drag || locked() || part == null) return;
      const answered = plateOpen ? false : startDrag(part, s);
      if (!drag && !answered) drag = { k: "hold", part };
      if (drag) { drag.pid = e.pointerId; drag.far = Math.hypot(s.dx, s.dy); }
    },
    move: (part, e, s) => {
      if (!drag || drag.pid !== e.pointerId || locked()) return;
      drag.far = Math.max(drag.far, Math.hypot(s.dx, s.dy));
      const w = wpt(s.x, s.y);
      if (drag.k === "tool") { toolMove(drag.sf, drag.d, w); handFor(drag.sf, drag.d, w); }
      else if (drag.k === "ice") { HV.bag.x = w.x; HV.bag.y = w.y; iceAt(w); }
      else if (drag.k === "pin") {
        const S = L.sheet, y = clamp(w.y, L.board.y + 16, L.board.y + L.board.h - 16);
        V.pin.x = S.x; V.pin.on = true;
        const b = doughBox(C.roll), over = Math.abs(y - b.y) < b.h / 2 + 24;
        if (over && !busy) rollBy(Math.abs(y - V.pin.y) / (S.h * 4.2));
        V.pin.y = y;
      } else if (drag.k === "cutter") { V.cutter.x = w.x; V.cutter.y = w.y - 8; }
      else if (drag.k === "cookie") { drag.c.x = w.x + drag.ox; drag.c.y = w.y + drag.oy; }
      else if (drag.k === "tray") {
        V.tray.x = w.x + drag.ox; V.tray.y = w.y + drag.oy;
        const o = ovenPose(), c = counterPose(), dTot = Math.hypot(o.x - c.x, o.y - c.y), near = clamp(1 - Math.hypot(V.tray.x - o.x, V.tray.y - o.y) / dTot, 0, 1);
        V.tray.k = lerp(1, o.k, near);
      } else if (drag.k === "door") {
        const O = L.oven, top0 = O.y + O.h * 0.2, hy = O.y + O.h * 0.93;
        V.door = clamp(drag.d0 + (w.y - drag.y0) / ((hy - top0) * 0.9), 0, 1);
      } else if (drag.k === "out") {
        V.tray.x = w.x + drag.ox; V.tray.y = w.y + drag.oy;
        const o = ovenPose(), c = counterPose(), dTot = Math.hypot(o.x - c.x, o.y - c.y), near = clamp(1 - Math.hypot(V.tray.x - o.x, V.tray.y - o.y) / dTot, 0, 1);
        V.tray.k = lerp(1, o.k, near);
      }
    },
    up: (part, e, s) => {
      const d = drag;
      if (!d || d.pid !== e.pointerId) return;
      drag = null;
      const w = wpt(s.x, s.y), still = d.far <= SLOP && Math.hypot(s.dx, s.dy) <= SLOP;
      if (d.k === "tool") { skipTap = s.tap; if (!locked()) toolUp(d.sf, d.d, w, still); V.hand = null; lastWant = ""; }
      else if (d.k === "ice") {
        skipTap = s.tap;
        if (still && !locked() && activePiece() >= 0 && !Hs.bins.every(Boolean)) { HV.bag.held = false; autoIce(); }
        else if (!HV.stand && !busy) bagHome();
      } else if (d.k === "hold") { if (still && !locked()) doTap(d.part, s.x, s.y); }
      else if (d.k === "pin") { if (still && !locked()) rollTap(); else if (C.roll >= 1 && !rollTw) pinHome(); }
      else if (d.k === "cutter") {
        const b = doughBox(C.roll);
        if (!locked() && (still || (Math.abs(w.x - b.x) < b.w / 2 && Math.abs(w.y - b.y) < b.h / 2))) cutAt(still ? L.sheet.x : w.x, still ? L.sheet.y : w.y);
        else cutterHome();
      } else if (d.k === "cookie") {
        const c = d.c, i = C.cuts.indexOf(d.q);
        dragCookie = null; d.q.show = 1;
        if (i >= 0) liftCut(i, { x: c.x, y: c.y });
      } else if (d.k === "tray") {
        const o = ovenPose(), from = { x: V.tray.x, y: V.tray.y, k: V.tray.k };
        if (!locked() && (still || Math.hypot(V.tray.x - o.x, V.tray.y - o.y) < L.oven.w * 0.8)) { if (!slideIn(from)) backToCounter(from); }
        else { backToCounter(from); hint(); }
      } else if (d.k === "door") {
        if (still) ovenTap();
        else doorTo(V.door > 0.45 ? 1 : 0, 0.3, () => { if (C.stage === "oven" && V.door < 0.01) startBake(); });
      } else if (d.k === "out") { busy = false; C.stage = "baked"; takeOut({ x: V.tray.x, y: V.tray.y, k: V.tray.k }); }
    },
    tap: (part, x, y) => {
      if (skipTap) { skipTap = false; return; }
      if (!drag) doTap(part, x, y);
    }
  });
  function handFor(sf, d, w) {
    if (d.kind === "icing" || d.kind === "hicing") V.hand = { kind: "icing", x: w.x, y: w.y, col: sf.kind === "cookie" ? ICING[sf.tool.c] : "#FFFFFF", squeeze: 1 };
    else if (d.kind === "snow") V.hand = { kind: "icing", x: w.x, y: w.y, col: "#FFFFFF", squeeze: 1 };
    else if (d.kind === "icicles") V.hand = { kind: "icing", x: w.x, y: w.y, col: "#EAF6FF", squeeze: 1 };
    else if (d.kind === "sprinkles") V.hand = { kind: "sprinkles", x: w.x, y: w.y };
    else V.hand = null;
  }
  // Starts the drag for a part (sets drag), or answers at once (true: no tap on release).
  function startDrag(part, s) {
    const w = wpt(s.x, s.y), w0 = wpt(s.x0, s.y0), st = C.stage;
    if (part === "pin" || part === "dough") {
      if (busy || rollTw || !canRoll()) return false;
      ghost.learned("pin");
      reball(() => {});
      drag = { k: "pin" };
      V.pin.on = true; V.pin.x = L.sheet.x;
      V.pin.y = clamp(w.y, L.board.y + 16, L.board.y + L.board.h - 16);
    } else if (part === "cutter" && st === "prep" && C.roll >= 1 && !busy) {
      finishCut();
      drag = { k: "cutter" }; V.cutter.x = w.x; V.cutter.y = w.y - 8;
    } else if (/^cut\d+$/.test(part) && st === "prep") {
      const q = C.cuts[+part.slice(3)];
      if (!q) return false;
      if (q === pendingCut) finishCut();
      const p = sheetXY(q), c = newCookie(q.sh, q.d);
      c.where = "drag"; c.x = p.x; c.y = p.y; c.s = L.cs;
      // The shape leaves the dough and rides on his finger.
      q.show = 0; dragCookie = c;
      drag = { k: "cookie", c, q, ox: p.x - w0.x, oy: p.y - w0.y - 6 };
      ghost.learned("cut");
    } else if (part === "tray" && st === "prep" && C.tray.length && !busy) {
      if (V.door < 0.5 && shutTries < 1) { shutTries = 1; V.doorWob = 1; coach.say("Open the oven door.", 3); return true; }
      if (V.door < 0.5) doorTo(1);
      drag = { k: "tray", ox: V.tray.x - w0.x, oy: V.tray.y - w0.y }; V.trayWhere = "held";
      ghost.learned("tray");
    } else if (part === "oven") {
      if (busy) return false;
      if (st === "baked") {
        ghost.learned("oven");
        busy = true; C.stage = "out";
        doorTo(1, 0.4);
        tween(0.25, (p) => { V.mitt = ease(p); });
        const o = ovenPose();
        V.trayWhere = "held";
        drag = { k: "out", ox: o.x - w0.x, oy: o.y - w0.y };
      } else if (!baking()) {
        const q = doorQuad();
        if (V.door < 0.5 && w0.y < q.tl.y + (q.bl.y - q.tl.y) * 0.4 && w0.y < L.oven.y + L.oven.h * 0.2) return false;
        if (doorTw) { untween(doorTw); doorTw = null; }
        drag = { k: "door", d0: V.door, y0: w0.y };
      } else return false;
    } else if (/^tc\d+$/.test(part)) { swapTo(+part.slice(2)); return true; }
    return false;
  }
  let dragCookie = null;

  // =====================================================================================================
  // Panel, jobs and surprise
  // =====================================================================================================
  // Tile pictures are drawn on little canvases with the scene's own drawing code.
  function picCanvas(fn) {
    return () => {
      const c = document.createElement("canvas"), S = 96;
      c.width = S; c.height = S;
      const old = ctx, oldLW = LW;
      ctx = c.getContext("2d"); LW = 4.4;
      try { ctx.translate(S / 2, S / 2); fn(S); } finally { ctx = old; LW = oldLW; }
      return c;
    };
  }
  const PIC = {
    dough: (d) => picCanvas(() => { ell(0, 6, 34, 30); fs(DOUGHS[d].raw, 3); ctx.fillStyle = "rgba(255,255,255,0.45)"; ell(-12, -6, 12, 7); ctx.fill(); }),
    cutter: (sh) => picCanvas(() => { const c = newCookie(sh, 0); c.bake = 0.7; drawCookie(c, 0, 2, 36); }),
    icing: (col) => picCanvas(() => { ctx.translate(-14, 38); ctx.scale(1.25, 1.25); drawBag(0, 0, col, 0); }),
    sprinkles: picCanvas(() => {
      ctx.save(); ctx.rotate(Math.PI + 0.5); rr(-14, -24, 28, 40, 6); fs("#FFFFFF", 3); ctx.fillStyle = "#E8303F"; ctx.fillRect(-13, -6, 26, 9); rr(-15, 14, 30, 10, 3); fs("#FFD23B", 3); ctx.restore();
      SPRINK.forEach((col, i) => { ctx.save(); ctx.translate(-26 + i * 9, 26 + (i % 2) * 8); ctx.rotate(i); ctx.fillStyle = col; ctx.fillRect(-5, -2, 10, 4); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.strokeRect(-5, -2, 10, 4); ctx.restore(); });
    }),
    candy: (t) => picCanvas(() => {
      const pts = t === "c" ? [[-14, -8, 0], [14, -8, 1]] : [[-18, 10, 0], [18, 10, 1], [0, -14, 2]];
      pts.forEach(([x, y, c]) => drawCandy(t, x, y, c, t === "r" ? 34 : t === "c" ? 18 : t === "e" ? 26 : 22, 2.6));
    }),
    snow: picCanvas(() => {
      ctx.beginPath(); ctx.moveTo(-40, 24); ctx.lineTo(0, -22); ctx.lineTo(40, 24); ctx.closePath(); fs(GINGER, 3);
      ctx.beginPath(); ctx.moveTo(-26, 8); ctx.lineTo(0, -22); ctx.lineTo(26, 8); for (let x = 26; x >= -26; x -= 8) ctx.lineTo(x, 8 + Math.sin(x / 4) * 4); ctx.closePath(); fs("#FFFFFF", 2.4);
    }),
    icicles: picCanvas(() => {
      rr(-40, -26, 80, 16, 4); fs(GINGER, 3);
      [-28, -12, 4, 20, 32].forEach((x, i) => { ctx.beginPath(); ctx.moveTo(x - 5, -10); ctx.lineTo(x + 5, -10); ctx.lineTo(x, 12 + (i % 2) * 14); ctx.closePath(); fs("#F2FAFF", 2.4); });
    })
  };
  const jobPics = {
    cookies: '<svg viewBox="0 0 50 50"><path d="M25 5l5.5 12.5 13.5 1.2-10.2 9 3 13.3L25 34l-11.8 7 3-13.3-10.2-9 13.5-1.2z" fill="#EFBE73" stroke="#1D2340" stroke-width="2.4" stroke-linejoin="round"/><path d="M19 22c3 3 9 3 12 0" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/></svg>',
    house: '<svg viewBox="0 0 50 50"><path d="M9 24h32v20H9z" fill="#B8743A" stroke="#1D2340" stroke-width="2.4" stroke-linejoin="round"/><path d="M5 26 25 8l20 18" fill="#B8743A" stroke="#1D2340" stroke-width="2.4" stroke-linejoin="round"/><path d="M8 24 25 9l17 15" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/><path d="M21 44V33a4 4 0 0 1 8 0v11z" fill="#6B3A1A" stroke="#1D2340" stroke-width="2"/><circle cx="15" cy="32" r="3" fill="#E8303F" stroke="#1D2340" stroke-width="1.5"/><circle cx="35" cy="32" r="3" fill="#2FA84F" stroke="#1D2340" stroke-width="1.5"/></svg>'
  };
  const tileOpts = { items: [], rows: 2, onPick: (id) => onTile(id) };
  const tilesEl = $("tiles");
  const tiles = Toybox.tiles(tilesEl, tileOpts);
  let tileMode = "";
  function modeNow() {
    if (job === "house") return "house";
    if (C.stage === "prep") return C.roll < 1 && !C.cuts.length ? "dough" : "cutters";
    return "decor";
  }
  const waiting = () => (job === "house" ? !built() : C.stage !== "decorate");
  function refreshTiles() {
    const m = modeNow();
    if (m !== tileMode) {
      tileMode = m;
      let items, value;
      if (m === "dough") { items = DOUGHS.map((d, i) => ({ id: d.id, name: d.name, pic: PIC.dough(i) })); value = DOUGHS[C.d].id; }
      else if (m === "cutters") { items = SHAPES.map((s, i) => ({ id: s.id, name: s.name, pic: PIC.cutter(i) })); value = SHAPES[pick.cutter].id; }
      else if (m === "decor") { items = TOOLS.map((t) => ({ id: t.id, name: t.name, pic: t.kind === "icing" ? PIC.icing(ICING[t.c]) : t.kind === "sprinkles" ? PIC.sprinkles : PIC.candy(t.t) })); value = TOOLS[pick.tool].id; }
      else { items = HTOOLS.map((t) => ({ id: t.id, name: t.name, pic: t.kind === "icing" ? PIC.icing("#FFFFFF") : t.kind === "candy" ? PIC.candy(t.t) : PIC[t.kind] })); value = HTOOLS[pick.htool].id; }
      tileOpts.rows = items.length <= 2 ? 1 : 2;
      tilesEl.classList.toggle("is-two", items.length <= 2);
      tiles.items(items); tiles.set(value);
      if (m === "cutters") SHAPES.forEach((s) => { const b = tiles.button(s.id); if (b && s.full) b.setAttribute("aria-label", s.full); });
    }
    tilesEl.classList.toggle("is-waiting", (m === "decor" || m === "house") && waiting());
  }
  function onTile(id) {
    if (locked()) return;
    const m = tileMode;
    if (m === "dough") {
      const d = DOUGHS.findIndex((q) => q.id === id);
      if (d < 0 || C.stage !== "prep" || C.roll >= 1 || C.cuts.length) return;
      C.d = d; V.doughWob = 1; puff("flour", L.sheet.x, L.sheet.y, 6);
      tag(DOUGHS[d].name + " dough", L.sheet.x, L.sheet.y - 50);
    } else if (m === "cutters") {
      const k = SHAPES.findIndex((q) => q.id === id);
      if (k >= 0) { pick.cutter = k; V.cutterWob = 1; }
    } else if (m === "decor") {
      const k = TOOLS.findIndex((q) => q.id === id);
      if (k >= 0) pick.tool = k;
      if (waiting()) coach.say("Decorate the cookies when they come out of the oven.", 3.5);
    } else {
      const k = HTOOLS.findIndex((q) => q.id === id);
      if (k >= 0) pick.htool = k;
      if (!built()) { HV.wob = 1; coach.say("The house needs its walls and roof first.", 3.5); }
    }
    lastWant = ""; saveSoon();
  }
  const jobs = Toybox.jobs($("jobs"), {
    jobs: [{ id: "cookies", name: "Cookies", pic: jobPics.cookies }, { id: "house", name: "House", pic: jobPics.house }],
    value: job,
    onPick: (id) => pickJob(id)
  });
  function pickJob(id) {
    if (id === job) return;
    cancelDrag();
    if (plateOpen) openPlate(false);
    job = id; lastWant = "";
    refreshTiles(); ghost.again(); saveSoon();
  }
  function cancelDrag() {
    if (!drag) return;
    const d = drag;
    drag = null; V.hand = null; V.held = null;
    if (d.k === "cookie") { d.q.show = 1; dragCookie = null; }
    if (d.k === "tray") backToCounter({ x: V.tray.x, y: V.tray.y, k: V.tray.k });
    if (d.k === "out") { busy = false; C.stage = "baked"; takeOut({ x: V.tray.x, y: V.tray.y, k: V.tray.k }); }
    if (d.k === "cutter") cutterHome();
    if (d.k === "ice") bagHome();
    if (d.k === "door") doorTo(V.door > 0.45 ? 1 : 0, 0.3);
  }
  function newTap() {
    if (locked()) return;
    if (plateOpen) openPlate(false);
    cancelDrag();
    if (job === "cookies") {
      if (baking()) finishBakeNow();
      doorTo(0, 0.4);
      startBatch();
      puff("flour", L.sheet.x, L.sheet.y, 8);
    } else newHouse();
  }
  const bar = Toybox.bar($("bottom"), { shelf: () => openPlate(!plateOpen), onNew: newTap, onSurprise: surprise });
  if (bar.shelf) { const sp = bar.shelf.querySelector("span"); if (sp) sp.textContent = "Plate"; bar.shelf.setAttribute("aria-label", "Cookie plate"); }

  // Takes turns between live moments; none of them changes his cookies or his house.
  let surpriseNext = 0;
  function snowSift(n) { puff("snow", 0, 0, reduce ? Math.ceil(n / 3) : n); }
  function surprise() {
    if (locked()) return;
    const k = surpriseNext; surpriseNext = (surpriseNext + 1) % 3;
    if (k === 0) snowSift(70);
    else if (job === "cookies") {
      if (k === 1) { blinkLight(3); V.trayWob = 1; }
      else V.steamUntil = now() + 3.5;
    } else if (k === 1) { tween(4, (p) => { V.twinkle = Math.sin(p * Math.PI); }, () => { V.twinkle = 0; }); if (!built()) HV.pileWob = 1; }
    else { V.sparkleUntil = now() + 3; HV.wob = 1; if (!Hs.dec.k.length) snowSift(30); }
  }
  function steamFrom(dt) {
    if (now() > V.steamUntil || reduce && Math.random() < 0.5) return;
    const list = job === "cookies" ? C.tray.filter((c) => c.where === "tray" || c.where === "board") : [];
    if (job === "cookies" && !list.length) { if (Math.random() < dt * 4) puff("steam", L.plate.x, L.plate.y - 10, 1); return; }
    list.forEach((c) => { if (Math.random() < dt * 2.2) puff("steam", c.x, c.y - c.s * 0.5, 1); });
  }

  // =====================================================================================================
  // Loop, timer, start and debug hook
  // =====================================================================================================
  function drawParts() {
    parts.forEach((p) => {
      const k = p.t / p.life;
      if (p.kind === "flour") { ctx.fillStyle = "rgba(255,255,255," + (0.8 * (1 - k)) + ")"; ell(p.x, p.y, p.size * (1 + k), p.size * (1 + k)); ctx.fill(); }
      else if (p.kind === "spark") { ctx.globalAlpha = 1 - k; sparkle(p.x, p.y, p.size); ctx.globalAlpha = 1; }
      else if (p.kind === "steam") { ctx.fillStyle = "rgba(255,255,255," + (0.55 * (1 - k)) + ")"; ell(p.x, p.y, p.size * (1 + k), p.size * (1 + k)); ctx.fill(); }
      else if (p.kind === "snow") { ell(p.x, p.y, p.size, p.size); ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = "rgba(29,35,64,0.25)"; ctx.stroke(); }
      else if (p.kind === "sprink" && p.t >= 0) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.fillStyle = p.color; ctx.fillRect(-3.5, -1.2, 7, 2.4); ctx.restore(); }
    });
  }
  let lastT = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    runTweens(t);
    stepParts(dt);
    C.tray.forEach((c) => { if (c.wob > 0.002) { c.wob *= Math.exp(-dt * 3.5); c.ph += dt * 18; } else c.wob = 0; });
    pv.hops.forEach((h) => { if (h.v || h.y > 0) { h.y += h.v * dt; h.v -= 900 * dt; if (h.y <= 0) { h.y = 0; h.v = 0; } } });
    ["pinWob", "doughWob", "cutterWob", "trayWob", "doorWob", "plateBounce"].forEach((k) => { V[k] = Math.max(0, V[k] - dt * 1.6); });
    HV.wob = Math.max(0, HV.wob - dt * 1.6); HV.pileWob = Math.max(0, HV.pileWob - dt * 1.6);
    // Sprinkles keep falling while his finger holds the shaker.
    if (drag && drag.k === "tool" && drag.d.kind === "sprinkles") { drag.d.acc = (drag.d.acc || 0) + dt; while (drag.d.acc > 0.06) { drag.d.acc -= 0.06; sprinkleBurst(drag.sf, drag.d.l, 1); } }
    if (dragCookie && (!drag || drag.k !== "cookie")) dragCookie = null;
    steamFrom(dt);
    updateCoach();
    refreshTiles();
    draw(t);
    requestAnimationFrame(frame);
  }
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawRoom(t);
    if (job === "cookies") {
      drawCookieScene(t);
      if (dragCookie) drawCookie(dragCookie, dragCookie.x, dragCookie.y, dragCookie.s * 1.08);
      if (V.held) drawCandy(V.held.t, V.held.w.x, V.held.w.y, V.held.c, 0.12 * L.big.s, LW * 0.7);
    } else {
      const wob = Math.sin(HV.wob * 25) * HV.wob * 0.02;
      ctx.save(); ctx.translate(L.house.x + GW / 2, L.house.y); ctx.rotate(wob); ctx.translate(-L.house.x - GW / 2, -L.house.y);
      drawHouseScene(t);
      ctx.restore();
      if (V.held) drawCandy(V.held.t, V.held.w.x, V.held.w.y, V.held.c, V.held.t === "c" ? 13 : 10, 1.6);
    }
    drawHand(t);
    drawParts();
    drawRing(t);
    drawPlateView(t);
  }
  function onEnding(done) {
    ending = true;
    cancelDrag(); press.cancel();
    if (plateOpen) openPlate(false);
    finishBakeNow();
    if (V.door > 0 && C.stage !== "out") doorTo(0, 0.5);
    saveWork();
    setTimeout(done, 1500);
  }
  function restArt() {
    return '<svg class="rest-art" viewBox="0 0 100 100"><ellipse cx="50" cy="66" rx="40" ry="20" fill="#FFFFFF" stroke="#1D2340" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="66" rx="29" ry="13" fill="none" stroke="#7FB2E5" stroke-width="2"/>' +
      '<path d="M32 46l3.4 7.6 8.3.8-6.3 5.5 1.9 8.1-7.3-4.3-7.3 4.3 1.9-8.1-6.3-5.5 8.3-.8z" fill="#EFBE73" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/>' +
      '<g fill="#93531F" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"><circle cx="52" cy="38" r="6"/><path d="M46 46h12l7 4-1 4-6-2 3 13h-5l-3-6-3 6h-5l3-13-6 2-1-4z"/></g>' +
      '<path d="M70 66l7-18 7 18z" fill="#2FA84F" stroke="#1D2340" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M58 62c3 2 7 2 10 0" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  resize();
  placeAll();
  if (!built()) HV.slide = 1;
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveWork(); });
  window.addEventListener("pagehide", saveWork);
  refreshTiles();
  Toybox.init({
    app: "christmas",
    badge: $("tbadge"),
    timerIntro: "When time is up, the oven turns off and the Christmas kitchen closes.",
    goodbyeOption: "End with a “Goodbye, cookies” button to press",
    farewellText: "Time to close the Christmas kitchen",
    goodbyeLabel: "Goodbye, cookies",
    farewellDone: "Bye bye, cookies!",
    restLine: "The Christmas kitchen is resting.",
    restLine2: "The cookies will be on the plate next time.",
    restArt,
    onEnding,
    onWake: () => { ending = false; }
  });
  Toybox.offFirst({ running: () => baking(), off: (done) => { finishBakeNow(); done(); } });
  requestAnimationFrame(frame);

  // Test hooks, only with ?debug in the address.
  if (/[?&]debug\b/.test(location.search)) {
    const stepNext = () => {
      const w = want();
      if (!w || busy) return false;
      const B = L.big;
      switch (w.part) {
        case "pin": rollTap(); break;
        case "cutter": { const f = freeSpot(L.sheet.x - L.sheet.w * 0.3, L.sheet.y); if (f) cutAt(f.x, f.y); break; }
        case "oven": ovenTap(); break;
        case "tray": slideIn(); break;
        case "plate": plateCookie(); break;
        case "deco": {
          const sf = surface();
          const d = toolDown(sf, v2(B.x - B.s * 0.4, B.y));
          [0.1, 0.2, 0.3, 0.4].forEach((f) => toolMove(sf, d, v2(B.x - B.s * 0.4 + B.s * f * 2, B.y + Math.sin(f * 9) * B.s * 0.2)));
          toolUp(sf, d, v2(B.x + B.s * 0.4, B.y), false);
          sf.c.plateHint = true;
          break;
        }
        case "piece": autoIce(); break;
        case "house": { const sf = surface(), d = toolDown(sf, v2(L.house.x + 40, L.house.y - 40)); toolUp(sf, d, v2(L.house.x + 40, L.house.y - 40), true); break; }
        default: if (/^cut\d+$/.test(w.part)) liftCut(+w.part.slice(3));
      }
      return true;
    };
    window.__toybox = {
      state: () => {
        const w = want();
        return { job, stage: C.stage, dough: DOUGHS[C.d].id, roll: +C.roll.toFixed(2), cuts: C.cuts.length, holes: C.holes.length, tray: C.tray.length,
          baked: C.tray.length ? +C.tray[0].bake.toFixed(2) : 0, cur: C.cur, door: +V.door.toFixed(2), plate: plate.length, placed: Hs.placed, built: built(),
          houseDecor: Hs.dec.i.length + Hs.dec.sn.length + Hs.dec.ic.length + Hs.dec.k.length + Hs.dec.all, savedHouse: !!savedHouse, tiles: tileMode,
          busy, plateOpen, want: w && w.part, coach: coach.text() };
      },
      next: stepNext,
      tap: (part) => doTap(part),
      job: (id) => { pickJob(id); jobs.set(id); },
      tile: (id) => { const b = tiles.button(id); if (b) b.click(); return !!b; },
      pt: (part) => { const p = partPt(part); return p ? vp(p.x, p.y) : null; },
      world: (x, y) => vp(x, y),
      layout: () => ({ name: L === TALL ? "tall" : "wide", big: L.big, house: L.house, sheet: L.sheet }),
      plate: (on) => openPlate(on !== false),
      surprise: () => surprise(),
      newJob: () => newTap(),
      ghost: () => ghost.show()
    };
  }
})();
