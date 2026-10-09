/* Farm: the shared script for every Farm page (the map and the stations). Plain ES5, no modules.
 * Load it after ../common/toybox.js:
 *   <script src="farm.js"></script>
 * It defines window.Farm. One owner at a time (see plans/farm.md 0.5); smoke-test every farm page after a change.
 *
 * DRAWING CONVENTIONS
 *   Machines are drawn in "units" with the origin on the ground, under the tractor's rear axle, facing right
 *   (+x), y up is negative. The caller translates/scales (and mirrors with a negative x scale to face left).
 *   Outlines are #1D2340; pass t.lw (outline width in units) so lines look the same at every size.
 *
 * API
 *   Farm.world                    the shared farm (localStorage "farm-world-v1"; every access in try/catch,
 *                                 unknown fields kept):
 *     .get()                      -> { v:1, field:{ lanes:[4 x {a,b,lo,hi,by}], stage }, season, grain, bales,
 *                                    clamp, muck, ... }. A lane: a = the worked look (stage index, see
 *                                    Farm.STAGES), b = the look not yet worked, lo..hi = the worked part as
 *                                    fractions of the lane (0 = left end), by = the implement of the last
 *                                    finished pass. field.stage = a summary name ("stubble" ... "golden").
 *     .update(fn)                 read, fn(world), write; returns the world.
 *     .resetField()               the field back to stubble (a fresh visit); the stores are kept.
 *     .fieldStage(field)          the summary name for a field.
 *   Farm.STAGES                   ["stubble","plowed","harrowed","sown","sprouts","growing","green","golden"]
 *   Farm.lanes(opts)              the lane engine (four lanes, near = 0 at the bottom, far = 3). Returns an
 *                                 engine E. opts:
 *       canvas                    the play surface (pointer input is bound to it)
 *       len, head, vmax, n        lane length, headland width (units), top speed (units/s), lanes (4)
 *       span                      machine length to fit (units) when choosing the scale
 *       work()                    distance behind the machine x where the tool touches the soil
 *       reach()                   { front, back }: machine extent ahead of / behind x (hit area, camera)
 *       canDrive()                false holds the machine still (a hare crossing, the timer)
 *       locked()                  true ignores input (timer ending/resting)
 *       onWork(lane, workX, v, dt)  each frame while the tool moves along a lane
 *       onPass(lane)              a lane is finished; the engine then turns at the headland by itself
 *       onTurn(lane)              a headland turn starts
 *       onFieldDone()             the last lane is finished and the machine parked in the headland
 *       parkAt()                  optional { x, lane, face }: where to park after the last lane
 *       onTap(kind, info)         "machine" (a tap on the machine), "ahead" (a tap ahead in its lane: it
 *                                 drives there), "behind" (dragging backwards: say "Pull it forward!"),
 *                                 "field" (a tap anywhere else; info = {px, py})
 *       onDrag()                  the machine was dragged forward (the move is learned)
 *     E.layout(w, h)              size the field to the stage (css px); E.update(dt) once a frame
 *     E.m                         the machine: { lane (float in tweens), x, dir (+1/-1), face (drawn facing,
 *                                 -1..1), v, lift (0..1, the hitch), phase: "work"|"tween"|"park", dist }
 *     E.geo(laneF)                { top, h, s, ground, kk (px per unit) } for a lane (-1 = the field track)
 *     E.sx(wx, laneF) / E.wx(px, laneF)   world x <-> screen x;  E.cam = { x, y }
 *     E.hold(on), E.nudge(sec)    the Drive! button: hold for top speed, a tap drives a short way
 *     E.play(keys, done)          a scripted move: keys [{ dur, x, lane, face, lift, fn }]; E.place(lane, x, dir)
 *     E.park(), E.busy()          park where it is; true while a tween runs
 *     E.machineRect()             screen rect of the machine (for hit tests and the ghost hand)
 *   Farm.paintLane(ctx, g, stage, wx0, wx1, opt)   paint one lane's look between two world x. g = { sx(wx),
 *                                 top, h, kk, lane }. opt = { time, gold (0..1 green -> golden), rip (sprout
 *                                 ripple: { from, to, p }) }.
 *   Farm.drawTractor(ctx, t, attachment)   the one green tractor (generic: no logos; grey hubs). t = { lw,
 *                                 lift, wheel (distance driven, turns the wheels/tracks), tracks (bool),
 *                                 time, bounce, lights (0..1 flash), face (0..1 cartoon face), look ([x,y] in
 *                                 units for the eyes), work (0..1 tool in the soil and moving), level (hopper/
 *                                 tank 0..1), unfold (sprayer boom 0..1), span (lane height in units),
 *                                 driver (default true) }. attachment: an implement id or null.
 *   Farm.drawImplement(ctx, id, st)  one implement on its own, origin at its lower hitch pin.
 *   Farm.IMPLEMENTS               { plow, harrow, drill, spreader, sprayer }: { name, len, work, after }.
 *                                 work = distance from the hitch pin back to where it works the soil;
 *                                 Farm.HITCH = distance from the rear axle back to the hitch pin.
 *   Farm.sky(ctx, t, season, timeOfDay)  sky, sun, clouds, hills and the farm on the horizon.
 *                                 t = { w, h (horizon y), time (s), arc (null or 0..1: "weeks go by", the sun
 *                                 runs over the sky a few times), rain (0..1 grey), rainbow (0..1), farmX (0..1) }.
 *                                 season "spring"|"summer"|"autumn"|"winter"; timeOfDay 0 day .. 1 dusk.
 *   Farm.drawSheep / drawCow / drawGull / drawHare (ctx, x, y, s, phase)   the farm's life.
 *   Farm.Particles(cap)           a pooled particle list: add(p), update(dt), draw(ctx, E), clear().
 *   Farm.sound                    soft Web Audio through Toybox.sound.ready(): engine(level 0..1 | -1 off),
 *                                 soil(level), spray(level), horn(), clunk(), tick(), chime(), pop(), stop().
 *   Farm.ghost(plan, opt)         the Toybox ghost hand (tools/snippets/ghost-hand.js; CSS injected once).
 *   Farm.coach(el, base)          the coach pill: base() gives the standing line; .say(text, ms) shows a
 *                                 short line for at least 3.2 s; .tick() refreshes.
 *   Farm.restArt()                the rest screen picture (a barn at dusk, a sleeping cow, the tractor).
 */
(function () {
  "use strict";
  var INK = "#1D2340", TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(i, j) { var s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
  function hex(c) {
    if (c.charAt(0) === "r") { var m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return "rgb(" + Math.round(lerp(x[0], y[0], t)) + "," + Math.round(lerp(x[1], y[1], t)) + "," + Math.round(lerp(x[2], y[2], t)) + ")";
  }
  function rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fs(ctx, fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  function circ(ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); fs(ctx, fill, lw); }
  function poly(ctx, pts, fill, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); fs(ctx, fill, lw);
  }
  function seg(ctx, x1, y1, x2, y2, col, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); }
  function rod(ctx, x1, y1, x2, y2, col, w, lw) { seg(ctx, x1, y1, x2, y2, INK, w + lw * 2); seg(ctx, x1, y1, x2, y2, col, w); }
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  // =====================================================================================================
  // World: the shared farm (farm-world-v1)
  // =====================================================================================================
  var WKEY = "farm-world-v1";
  var STAGES = ["stubble", "plowed", "harrowed", "sown", "sprouts", "growing", "green", "golden"];
  function defLane() { return { a: 0, b: 0, lo: 0, hi: 0, by: "" }; }
  function defField() { return { lanes: [defLane(), defLane(), defLane(), defLane()], stage: "stubble" }; }
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function stageIdx(v) { v = Math.round(num(v, 0)); return clamp(v, 0, STAGES.length - 1); }
  function readWorld() {
    var w = null;
    try { w = JSON.parse(localStorage.getItem(WKEY) || "null"); } catch (e) { w = null; }
    if (!w || typeof w !== "object" || Array.isArray(w)) w = {};
    w.v = 1;
    if (!w.field || typeof w.field !== "object" || !Array.isArray(w.field.lanes)) w.field = defField();
    var L = w.field.lanes;
    for (var i = 0; i < 4; i++) {
      var l = L[i];
      if (!l || typeof l !== "object") l = L[i] = defLane();
      l.a = stageIdx(l.a); l.b = stageIdx(l.b);
      l.lo = clamp(num(l.lo, 0), 0, 1); l.hi = clamp(num(l.hi, 0), 0, 1);
      if (l.hi < l.lo) l.hi = l.lo;
      if (typeof l.by !== "string") l.by = "";
    }
    if (L.length > 4) L.length = 4;
    if (typeof w.field.stage !== "string") w.field.stage = fieldStage(w.field);
    ["grain", "bales", "clamp"].forEach(function (k) { if (typeof w[k] !== "number") w[k] = 0; });
    if (typeof w.muck !== "number") w.muck = 1;
    if (typeof w.season !== "string") w.season = "spring";
    return w;
  }
  function writeWorld(w) { try { localStorage.setItem(WKEY, JSON.stringify(w)); } catch (e) { /* ignore */ } }
  // The look most of the field shows (the lowest look across the lanes).
  function fieldStage(f) {
    var lo = 99;
    (f.lanes || []).forEach(function (l) {
      var full = l.hi - l.lo >= 0.999;
      var s = full ? l.a : Math.min(l.a, l.b);
      if (l.hi - l.lo <= 0.001) s = l.b;
      lo = Math.min(lo, s);
    });
    return STAGES[lo === 99 ? 0 : lo];
  }
  var world = {
    KEY: WKEY,
    get: readWorld,
    update: function (fn) { var w = readWorld(); try { fn(w); } catch (e) { setTimeout(function () { throw e; }); } writeWorld(w); return w; },
    resetField: function () { return world.update(function (w) { w.field = defField(); }); },
    fieldStage: fieldStage,
    defField: defField
  };

  // =====================================================================================================
  // Implements (side view, origin at the lower hitch pin, ground at y = +36 when lowered)
  // =====================================================================================================
  var HITCH = 92; // rear axle -> lower hitch pin
  var STEEL = "#C9D3E0", STEEL_D = "#8E99A8", SOIL = "#6B4127", SOIL_L = "#9A6440";
  function aframe(ctx, col, lw, back) {
    // Headstock: the A-frame that takes the two lower links (pin at 0,0) and the top link (0,-78).
    poly(ctx, [4, 4, 4, -82, -10, -82, -back, -40, -back, 4], col, lw);
    circ(ctx, 0, 0, 6, STEEL, lw * 0.7);
    circ(ctx, 0, -78, 6, STEEL, lw * 0.7);
  }
  function faceAt(ctx, x, y, r, st) {
    if (!st.face) return;
    ctx.save(); ctx.globalAlpha = clamp(st.face, 0, 1);
    var lx = 0, ly = 0;
    if (st.look) { var dx = st.look[0] - x, dy = st.look[1] - y, d = Math.hypot(dx, dy) || 1; lx = dx / d * r * 0.3; ly = dy / d * r * 0.3; }
    var blink = (Math.sin((st.time || 0) * 2.3) > 0.97) ? 0.15 : 1;
    [-r * 1.1, r * 1.1].forEach(function (ox) {
      ctx.save(); ctx.translate(x + ox, y); ctx.scale(1, blink);
      circ(ctx, 0, 0, r, "#FFFFFF", st.lw * 0.8); circ(ctx, lx, ly, r * 0.48, INK, 0);
      circ(ctx, lx + r * 0.15, ly - r * 0.18, r * 0.15, "#FFFFFF", 0);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(x, y + r * 1.1, r * 1.3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.lineWidth = st.lw * 1.1; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  var IMPLEMENTS = {
    plow: {
      name: "Plow", len: 270, work: 150, after: 1, col: "#E0523A", face: [-140, -78],
      draw: function (ctx, st) {
        var lw = st.lw, col = this.col, wk = st.work || 0, t = st.time || 0;
        aframe(ctx, col, lw, 30);
        // Main beam, running back and down at an angle (the bottoms sit in a staggered row).
        poly(ctx, [-14, -66, -260, -44, -262, -28, -14, -50], col, lw);
        var legs = [-62, -114, -166, -218];
        legs.forEach(function (lx, i) {
          var by = -58 + (lx + 14) / -246 * -22 + 14; // beam underside at this x
          // Soil mound in front of the share while it cuts (the share tip is under the ground).
          rrect(ctx, lx - 6, by - 8, 12, 18 - by + 8, 3); fs(ctx, col, lw);
          ctx.beginPath();
          ctx.moveTo(lx + 30, 39); ctx.lineTo(lx - 22, 37);
          ctx.quadraticCurveTo(lx - 40, 22, lx - 46, -4);
          ctx.lineTo(lx - 30, -6); ctx.quadraticCurveTo(lx - 4, 8, lx + 14, 24); ctx.closePath();
          fs(ctx, STEEL, lw);
          seg(ctx, lx - 26, 28, lx - 36, 4, "#FFFFFF", lw * 0.8);
          poly(ctx, [lx + 30, 39, lx + 4, 39, lx + 10, 30], STEEL_D, lw * 0.6);
          if (wk > 0.05) {
            // A ribbon of soil curls up the moldboard and flips over.
            var ph = (t * 3 + i * 0.37) % 1;
            ctx.save(); ctx.globalAlpha = Math.min(1, wk * 1.5);
            ctx.beginPath(); ctx.moveTo(lx + 16, 36);
            ctx.quadraticCurveTo(lx - 8, 2 - ph * 6, lx - 40, 0 - ph * 4);
            ctx.quadraticCurveTo(lx - 56, 6, lx - 52, 28);
            ctx.lineWidth = 14; ctx.strokeStyle = INK; ctx.stroke();
            ctx.lineWidth = 14 - lw * 1.6; ctx.strokeStyle = SOIL; ctx.stroke();
            seg(ctx, lx - 16, 6 - ph * 5, lx - 36, 2 - ph * 4, SOIL_L, 3);
            ctx.beginPath(); ctx.ellipse(lx + 24, 40, 20, 7, 0, Math.PI, TAU); fs(ctx, SOIL, lw * 0.7);
            ctx.restore();
          }
        });
        // Depth wheel at the back.
        rod(ctx, -250, -36, -262, 10, col, 8, lw * 0.6);
        circ(ctx, -262, 18, 18, "#2B2F3A", lw); circ(ctx, -262, 18, 7, STEEL, lw * 0.6);
        faceAt(ctx, -140, -78, 12, st);
      }
    },
    harrow: {
      name: "Harrow", len: 200, work: 105, after: 2, col: "#F2A33A", face: [-100, -84],
      draw: function (ctx, st) {
        var lw = st.lw, col = this.col, rot = (st.dist || 0) / 26;
        aframe(ctx, col, lw, 26);
        rrect(ctx, -188, -66, 186, 16, 4); fs(ctx, col, lw);
        function gang(x0) {
          rod(ctx, x0 + 6, -52, x0 - 10, -6, col, 9, lw * 0.6);
          rod(ctx, x0 - 38, -52, x0 - 30, -6, col, 9, lw * 0.6);
          for (var j = 0; j < 5; j++) {
            var cx = x0 - j * 9;
            ctx.beginPath(); ctx.ellipse(cx, 10, 9, 26, 0, 0, TAU); fs(ctx, STEEL, lw * 0.8);
            ctx.beginPath(); ctx.ellipse(cx + 2.5, 10, 4, 20, 0, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = STEEL_D; ctx.lineWidth = 2.5; ctx.stroke();
            var a = rot + j * 0.9;
            seg(ctx, cx, 10, cx + Math.cos(a) * 6, 10 + Math.sin(a) * 19, INK, lw * 0.6);
          }
          rrect(ctx, x0 - 44, 4, 52, 10, 4); fs(ctx, "#4A5163", lw * 0.7);
        }
        gang(-34); gang(-112);
        // Packer roller at the back levels the crumbs.
        rod(ctx, -176, -54, -186, 10, col, 8, lw * 0.6);
        circ(ctx, -186, 18, 18, STEEL, lw);
        for (var k = 0; k < 6; k++) { var b = rot * 1.4 + k * TAU / 6; seg(ctx, -186, 18, -186 + Math.cos(b) * 15, 18 + Math.sin(b) * 15, STEEL_D, 3); }
        circ(ctx, -186, 18, 5, INK, 0);
        faceAt(ctx, -100, -86, 10, st);
      }
    },
    drill: {
      name: "Seed drill", len: 180, work: 100, after: 3, col: "#3E7CC9", face: [-90, -118],
      draw: function (ctx, st) {
        var lw = st.lw, col = this.col, rot = (st.dist || 0) / 14, t = st.time || 0, wk = st.work || 0;
        var lvl = st.level == null ? 0.8 : st.level;
        aframe(ctx, col, lw, 22);
        rrect(ctx, -176, -44, 172, 14, 4); fs(ctx, col, lw);
        // Seed tubes (clear) from the hopper to the disc openers.
        var tubes = [-116, -96, -76, -56];
        tubes.forEach(function (x) { seg(ctx, x, -64, x - 12, 18, INK, 9); seg(ctx, x, -64, x - 12, 18, "#DDF2FF", 5); });
        if (wk > 0.05) {
          tubes.forEach(function (x, j) {
            for (var q = 0; q < 2; q++) {
              var f = (t * 1.6 + j * 0.27 + q * 0.5) % 1;
              circ(ctx, x - 12 * f, -64 + 82 * f, 2.6, "#E8B83A", 0);
            }
          });
        }
        // Hopper with the lid and a window showing the seed level.
        poly(ctx, [-166, -152, -12, -152, -34, -62, -144, -62], col, lw);
        rrect(ctx, -172, -164, 166, 14, 5); fs(ctx, "#2C5C9A", lw);
        rrect(ctx, -126, -140, 74, 40, 6); fs(ctx, "#DDF2FF", lw * 0.7);
        ctx.save(); rrect(ctx, -126, -140, 74, 40, 6); ctx.clip();
        ctx.fillStyle = "#E8B83A"; ctx.fillRect(-126, -100 - 40 * lvl, 74, 40 * lvl);
        ctx.fillStyle = "#C9962A"; for (var s = 0; s < 8; s++) ctx.fillRect(-122 + s * 9, -98 - 40 * lvl + (s % 2) * 6, 4, 3);
        ctx.restore();
        rrect(ctx, -126, -140, 74, 40, 6); fs(ctx, null, lw * 0.7);
        // Disc openers and the press wheels behind them.
        tubes.forEach(function (x) { circ(ctx, x - 12, 24, 12, STEEL, lw * 0.7); var a = rot + x; seg(ctx, x - 12, 24, x - 12 + Math.cos(a) * 9, 24 + Math.sin(a) * 9, INK, lw * 0.5); });
        rod(ctx, -150, -36, -164, 18, col, 7, lw * 0.6);
        circ(ctx, -168, 22, 14, "#3A4150", lw); circ(ctx, -168, 22, 5, STEEL, lw * 0.5);
        // Row marker, folded up at the front of the hopper (a disc on a long arm).
        rod(ctx, -10, -60, -4, -196, "#2C5C9A", 6, lw * 0.6);
        circ(ctx, -4, -204, 11, STEEL, lw * 0.7);
        faceAt(ctx, -90, -120, 10, st);
      }
    },
    spreader: {
      name: "Spreader", len: 135, work: 85, after: 5, col: "#F07F2D", face: [-68, -132], pto: [-40, -46],
      draw: function (ctx, st) {
        var lw = st.lw, col = this.col, t = st.time || 0, lvl = st.level == null ? 0.8 : st.level, spin = st.work ? t * 18 : t * 2;
        aframe(ctx, "#4A5163", lw, 18);
        rod(ctx, -20, -40, -24, -70, "#4A5163", 8, lw * 0.6);
        rod(ctx, -116, -40, -112, -70, "#4A5163", 8, lw * 0.6);
        rrect(ctx, -124, -48, 108, 12, 4); fs(ctx, "#4A5163", lw);
        // The hopper (a big funnel) with a grid on top, granules inside.
        poly(ctx, [-136, -176, -2, -176, -54, -74, -84, -74], col, lw);
        ctx.save(); poly(ctx, [-136, -176, -2, -176, -54, -74, -84, -74], null, 0); ctx.clip();
        var top = -74 - 102 * lvl;
        ctx.fillStyle = "#F4EEE6"; ctx.fillRect(-140, top, 140, 110);
        ctx.fillStyle = "#E7A9B9"; for (var s = 0; s < 14; s++) ctx.fillRect(-128 + (s * 37) % 120, top + 6 + (s * 13) % 40, 4, 4);
        ctx.restore();
        poly(ctx, [-136, -176, -2, -176, -54, -74, -84, -74], null, lw);
        seg(ctx, -128, -152, -10, -152, "#C45E18", lw * 0.6);
        rrect(ctx, -142, -186, 146, 12, 4); fs(ctx, "#C45E18", lw);
        for (var g = 0; g < 6; g++) seg(ctx, -128 + g * 22, -184, -128 + g * 22, -176, INK, 2);
        // Gearbox and the two spinning discs with vanes.
        rrect(ctx, -82, -72, 28, 18, 3); fs(ctx, "#8A94A6", lw * 0.7);
        [[-58, -46], [-90, -44]].forEach(function (d, i) {
          ctx.beginPath(); ctx.ellipse(d[0], d[1], 28, 7, 0, 0, TAU); fs(ctx, STEEL, lw * 0.8);
          for (var v = 0; v < 4; v++) { var a = spin * (i ? -1 : 1) + v * TAU / 4; seg(ctx, d[0], d[1], d[0] + Math.cos(a) * 26, d[1] + Math.sin(a) * 6, INK, lw * 0.6); }
        });
        faceAt(ctx, -68, -134, 11, st);
      }
    },
    sprayer: {
      name: "Sprayer", len: 160, work: 150, after: 6, col: "#3E7CC9", face: [-70, -120], pto: [-30, -40],
      draw: function (ctx, st) {
        var lw = st.lw, col = this.col, t = st.time || 0, lvl = st.level == null ? 0.8 : st.level;
        var u = st.unfold || 0, span = st.span || 240, wk = st.work || 0;
        aframe(ctx, col, lw, 20);
        rrect(ctx, -146, -50, 144, 14, 4); fs(ctx, col, lw);
        circ(ctx, -30, -40, 11, "#E0523A", lw * 0.7); // pump
        // Tank with a level window.
        rrect(ctx, -134, -164, 122, 112, 30); fs(ctx, "#F4F7FA", lw);
        rrect(ctx, -60, -176, 30, 14, 4); fs(ctx, "#E0E6EE", lw * 0.8);
        rrect(ctx, -112, -146, 18, 80, 8); fs(ctx, "#DDF2FF", lw * 0.6);
        ctx.save(); rrect(ctx, -112, -146, 18, 80, 8); ctx.clip();
        ctx.fillStyle = "#58C1C7"; ctx.fillRect(-112, -66 - 80 * lvl, 18, 80 * lvl); ctx.restore();
        rrect(ctx, -112, -146, 18, 80, 8); fs(ctx, null, lw * 0.6);
        // Boom: folded forward along the tank; unfolded it reaches across the lane (far side up the picture,
        // near side down), with a nozzle every so often making a fan of fine mist.
        var px = -150, py = -96;
        rrect(ctx, px - 8, -150, 14, 116, 4); fs(ctx, "#2C5C9A", lw);
        var arms = [[lerp(0, -1.72, u), lerp(130, span * 0.62, u)], [lerp(0.06, 1.42, u), lerp(126, span * 0.3, u)]];
        arms.forEach(function (a, ai) {
          var ex = px + Math.cos(a[0]) * a[1], ey = py + Math.sin(a[0]) * a[1] + (ai ? 10 : -10) * (1 - u);
          var sy = py + (ai ? 8 : -8) * (1 - u);
          rod(ctx, px, sy, ex, ey, "#2C5C9A", 7, lw * 0.6);
          seg(ctx, px, sy, ex, ey, "#7FA9DE", 2);
          var n = Math.max(2, Math.floor(a[1] / 26));
          for (var k = 1; k <= n; k++) {
            var f = k / n, nx = lerp(px, ex, f), ny = lerp(sy, ey, f);
            seg(ctx, nx, ny, nx, ny + 7, INK, 3);
            if (wk > 0.05 && u > 0.95) {
              ctx.save(); ctx.globalAlpha = 0.5 * wk * (0.75 + 0.25 * Math.sin(t * 20 + k));
              poly(ctx, [nx, ny + 6, nx - 13, ny + 40, nx + 13, ny + 40], "#E6F6FF", 0);
              ctx.restore();
            }
          }
        });
        faceAt(ctx, -70, -122, 11, st);
      }
    }
  };
  function drawImplement(ctx, id, st) {
    var imp = IMPLEMENTS[id];
    if (!imp) return;
    st = st || {};
    if (!st.lw) st.lw = 4;
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
    imp.draw(ctx, st);
    ctx.restore();
  }

  // =====================================================================================================
  // The tractor (green, generic: no logos, grey hubs, a cab with glass and a driver)
  // =====================================================================================================
  var GREEN = "#3FAF5A", GREEN_D = "#2A8445", GREEN_L = "#86D99A", HUB = "#B7C0CA", HUB_D = "#7D8796";
  var TIRE = "#2B2F3A", LUG = "#4A5163", CABF = "#3A4250", GLASS = "#BFE6FF";
  function wheel(ctx, cx, cy, r, ang, lw) {
    ctx.save(); ctx.translate(cx, cy);
    circ(ctx, 0, 0, r - 5, TIRE, lw);
    var n = Math.max(12, Math.round(r / 3.6));
    // Tread lugs (they turn with the distance driven) and the chevrons on the sidewall.
    for (var j = 0; j < n; j++) {
      var a = ang + j * TAU / n;
      ctx.save(); ctx.rotate(a);
      rrect(ctx, r - 9, -r * 0.09, 10, r * 0.18, 2); fs(ctx, TIRE, lw * 0.7);
      seg(ctx, r * 0.62, -r * 0.05, r * 0.86, r * 0.07, LUG, r * 0.07);
      ctx.restore();
    }
    circ(ctx, 0, 0, r * 0.5, HUB, lw);
    circ(ctx, 0, 0, r * 0.36, HUB_D, lw * 0.5);
    for (var b = 0; b < 6; b++) { var q = ang + b * TAU / 6; circ(ctx, Math.cos(q) * r * 0.28, Math.sin(q) * r * 0.28, r * 0.045, INK, 0); }
    circ(ctx, 0, 0, r * 0.13, HUB, lw * 0.6);
    ctx.restore();
  }
  function tracks(ctx, dist, lw) {
    // A crawler: one long rubber track round a big drive wheel at the back and an idler at the front.
    var rx = 0, ry = -62, rr = 62, fx = 176, fy = -40, fr = 40;
    ctx.beginPath();
    ctx.moveTo(rx, 0); ctx.lineTo(fx, 0);
    ctx.arc(fx, fy, fr, Math.PI / 2, -Math.PI / 2 - 0.25, true);
    ctx.lineTo(rx + Math.sin(0.25) * rr, ry - rr * Math.cos(0.25));
    ctx.arc(rx, ry, rr, -Math.PI / 2 - 0.25, Math.PI / 2, true);
    ctx.closePath();
    fs(ctx, TIRE, lw);
    ctx.save(); ctx.clip();
    ctx.setLineDash([10, 9]); ctx.lineDashOffset = dist % 19;
    ctx.beginPath(); ctx.moveTo(rx, -4); ctx.lineTo(fx, -4); ctx.strokeStyle = LUG; ctx.lineWidth = 8; ctx.stroke();
    ctx.lineDashOffset = -dist % 19;
    ctx.beginPath(); ctx.moveTo(rx, ry - rr + 4); ctx.lineTo(fx, fy - fr + 4); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    circ(ctx, fx, fy, fr - 12, "#3A4150", lw * 0.8); circ(ctx, fx, fy, fr * 0.4, HUB, lw * 0.7);
    [48, 88, 128].forEach(function (x) { circ(ctx, x, -18, 15, "#3A4150", lw * 0.8); circ(ctx, x, -18, 6, HUB, lw * 0.5); });
    circ(ctx, rx, ry, rr - 14, "#3A4150", lw * 0.8);
    circ(ctx, rx, ry, rr * 0.44, HUB, lw);
    for (var b = 0; b < 8; b++) { var q = dist / 50 + b * TAU / 8; circ(ctx, Math.cos(q) * rr * 0.6, ry + Math.sin(q) * rr * 0.6, 4.5, INK, 0); }
    circ(ctx, rx, ry, rr * 0.14, HUB_D, lw * 0.6);
  }
  function drawTractor(ctx, t, att) {
    t = t || {};
    var lw = t.lw || 4, lift = clamp(t.lift || 0, 0, 1), dist = t.wheel || 0, time = t.time || 0;
    var imp = typeof att === "string" ? IMPLEMENTS[att] : null;
    var pinL = [-HITCH, -36 - 50 * lift], pinT = [-HITCH, -114 - 50 * lift];
    var bob = t.bounce || 0;
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
    // Shadow.
    ctx.beginPath(); ctx.ellipse(70, 2, 170, 10, 0, 0, TAU); ctx.fillStyle = "rgba(40,30,10,0.2)"; ctx.fill();
    // The implement on the three-point hitch.
    if (imp) {
      ctx.save(); ctx.translate(pinL[0], pinL[1]);
      imp.draw(ctx, { lw: lw, lift: lift, work: t.work || 0, dist: dist, time: time, level: t.level, unfold: t.unfold, span: t.span, face: t.face, look: t.look ? [t.look[0] - pinL[0], t.look[1] - pinL[1]] : null });
      ctx.restore();
      if (imp.pto) {
        // PTO shaft, spinning (the stripes move).
        var ex = pinL[0] + imp.pto[0], ey = pinL[1] + imp.pto[1];
        seg(ctx, -50, -60, ex, ey, INK, 11); seg(ctx, -50, -60, ex, ey, "#F2C14E", 6);
        ctx.save(); ctx.setLineDash([4, 6]); ctx.lineDashOffset = -time * 40; seg(ctx, -50, -60, ex, ey, INK, 6); ctx.restore();
      }
    }
    ctx.translate(0, bob);
    // Three-point hitch: lower link, top link, lift arm and lift rod.
    rod(ctx, -10, -50 - bob, pinL[0], pinL[1] - bob, "#6E7787", 9, lw * 0.6);
    rod(ctx, -40, -128, pinT[0], pinT[1] - bob, "#6E7787", 8, lw * 0.6);
    var la = [-74, -112 - 40 * lift];
    rod(ctx, -26, -122, la[0], la[1], "#6E7787", 8, lw * 0.6);
    rod(ctx, la[0], la[1], lerp(-10, pinL[0], 0.66), lerp(-50, pinL[1], 0.66) - bob, "#9AA5B1", 5, lw * 0.5);
    circ(ctx, pinL[0], pinL[1] - bob, 5, "#9AA5B1", lw * 0.5);
    // Chassis and engine block.
    rrect(ctx, 30, -82, 190, 30, 6); fs(ctx, "#4A5163", lw);
    // Hood.
    ctx.beginPath(); ctx.moveTo(58, -74); ctx.lineTo(58, -124); ctx.lineTo(200, -122);
    ctx.quadraticCurveTo(230, -120, 232, -100); ctx.lineTo(234, -74); ctx.closePath(); fs(ctx, GREEN, lw);
    seg(ctx, 66, -116, 196, -114, GREEN_L, lw * 1.1);
    seg(ctx, 62, -82, 228, -82, GREEN_D, lw * 1.2);
    for (var v = 0; v < 4; v++) seg(ctx, 170 + v * 9, -110, 166 + v * 9, -90, GREEN_D, 3.5);
    // Grille at the front and the front weights below it.
    rrect(ctx, 222, -116, 16, 44, 5); fs(ctx, "#5B6476", lw);
    for (var g = 0; g < 4; g++) seg(ctx, 225, -108 + g * 9, 235, -108 + g * 9, INK, 2.5);
    rrect(ctx, 224, -76, 34, 32, 5); fs(ctx, "#4A5163", lw);
    for (var w = 0; w < 3; w++) seg(ctx, 232 + w * 8, -72, 232 + w * 8, -48, "#2B2F3A", 3);
    // Headlight.
    rrect(ctx, 206, -114, 16, 10, 3); fs(ctx, "#FFF4B0", lw * 0.7);
    // Exhaust stack.
    rrect(ctx, 126, -198, 12, 78, 3); fs(ctx, "#4A5160", lw);
    rrect(ctx, 123, -204, 18, 9, 3); fs(ctx, "#8A94A6", lw * 0.7);
    // Cab: frame, the driver, glass.
    ctx.beginPath(); ctx.moveTo(-42, -96); ctx.lineTo(-42, -228); ctx.lineTo(70, -228); ctx.lineTo(80, -100); ctx.closePath(); fs(ctx, CABF, lw);
    if (t.driver !== false) {
      rrect(ctx, 4, -166, 44, 50, 14); fs(ctx, "#3D6BC9", lw * 0.7);              // shirt
      circ(ctx, 30, -180, 16, "#F2C49B", lw * 0.7);                              // head
      ctx.beginPath(); ctx.arc(30, -184, 16, Math.PI, TAU); ctx.lineTo(50, -184); fs(ctx, "#E0523A", lw * 0.7); // cap
      circ(ctx, 40, -180, 2.4, INK, 0);
      seg(ctx, 54, -150, 66, -132, INK, 5);                                      // steering wheel
    }
    ctx.save(); ctx.globalAlpha = 0.55;
    poly(ctx, [-34, -218, -8, -218, -8, -108, -34, -108], GLASS, 0);
    poly(ctx, [0, -218, 62, -218, 70, -108, 0, -108], GLASS, 0);
    ctx.restore();
    poly(ctx, [-34, -218, -8, -218, -8, -108, -34, -108], null, lw * 0.6);
    poly(ctx, [0, -218, 62, -218, 70, -108, 0, -108], null, lw * 0.6);
    seg(ctx, 8, -210, 22, -196, "#FFFFFF", 4);
    // Roof with work lights.
    rrect(ctx, -52, -246, 136, 22, 9); fs(ctx, GREEN, lw);
    seg(ctx, -44, -240, 76, -240, GREEN_L, 3);
    rrect(ctx, 68, -232, 14, 9, 3); fs(ctx, "#FFF4B0", lw * 0.6);
    // Step under the door.
    rrect(ctx, 14, -100, 34, 8, 3); fs(ctx, "#4A5163", lw * 0.6);
    rrect(ctx, 18, -78, 26, 7, 3); fs(ctx, "#4A5163", lw * 0.6);
    ctx.translate(0, -bob);
    // Running gear.
    if (t.tracks) {
      tracks(ctx, dist, lw);
    } else {
      wheel(ctx, 168, -40, 40, dist / 40, lw);
      wheel(ctx, 0, -64, 64, dist / 64, lw);
    }
    ctx.translate(0, bob);
    // Fenders over the wheels.
    ctx.beginPath(); ctx.arc(0, -64, 80, Math.PI * 1.08, Math.PI * 1.92); ctx.arc(0, -64, 68, Math.PI * 1.92, Math.PI * 1.08, true); ctx.closePath(); fs(ctx, GREEN, lw);
    if (!t.tracks) { ctx.beginPath(); ctx.arc(168, -40, 50, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(168, -40, 42, Math.PI * 1.9, Math.PI * 1.1, true); ctx.closePath(); fs(ctx, GREEN, lw); }
    // Headlight flash (a tap on the tractor).
    if (t.lights) {
      ctx.save(); ctx.globalAlpha = clamp(t.lights, 0, 1) * 0.8;
      circ(ctx, 216, -109, 26, "#FFF7C2", 0); circ(ctx, 78, -228, 20, "#FFF7C2", 0);
      ctx.restore();
    }
    // Cartoon face: the headlight is an eye, the grille smiles.
    if (t.face) {
      ctx.save(); ctx.globalAlpha = clamp(t.face, 0, 1);
      var lx = 0, ly = 0;
      if (t.look) { var dx = t.look[0] - 212, dy = t.look[1] + 104, d = Math.hypot(dx, dy) || 1; lx = dx / d * 5; ly = dy / d * 5; }
      var blink = Math.sin(time * 2.1) > 0.97 ? 0.15 : 1;
      ctx.save(); ctx.translate(208, -104); ctx.scale(1, blink);
      circ(ctx, 0, 0, 15, "#FFFFFF", lw * 0.8); circ(ctx, lx, ly, 7, INK, 0); circ(ctx, lx + 2.5, ly - 2.5, 2.4, "#FFFFFF", 0);
      ctx.restore();
      ctx.beginPath(); ctx.arc(214, -96, 22, 0.25 * Math.PI, 0.62 * Math.PI); ctx.lineWidth = lw * 1.2; ctx.strokeStyle = INK; ctx.stroke();
      circ(ctx, 190, -90, 6, "rgba(255,120,140,0.6)", 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Lane looks
  // =====================================================================================================
  var BASE = ["#C9A35A", "#6B4127", "#A87A4C", "#9A6C44", "#9A6C44", "#8C6640", "#4E9A34", "#D6A537"];
  function paintLane(ctx, g, st, wx0, wx1, opt) {
    opt = opt || {};
    if (wx1 <= wx0) return;
    var px0 = g.sx(wx0), px1 = g.sx(wx1);
    if (px1 < -20 || px0 > ctx.canvas.width + 20) return;
    var top = g.top, h = g.h, kk = g.kk, li = g.lane || 0, time = opt.time || 0;
    var gold = st === 6 ? clamp(opt.gold || 0, 0, 1) : (st === 7 ? 1 : 0);
    ctx.fillStyle = st >= 6 ? mix(BASE[6], BASE[7], gold) : BASE[st];
    ctx.fillRect(px0, top, px1 - px0 + 0.6, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(px0, top - h, px1 - px0, h * 2); ctx.clip();
    function grid(stepPx, fn) {
      var step = stepPx / kk, i0 = Math.ceil(wx0 / step), i1 = Math.floor(wx1 / step);
      if (i1 - i0 > 2000) i1 = i0 + 2000;
      for (var i = i0; i <= i1; i++) fn(i, g.sx(i * step));
    }
    var R, gap, r, y;
    if (st === 0) {
      R = Math.max(3, Math.round(h / 13)); gap = h / R;
      ctx.beginPath();
      for (r = 0; r < R; r++) { y = top + gap * (r + 0.5); ctx.moveTo(px0, y + gap * 0.3); ctx.lineTo(px1, y + gap * 0.3); }
      ctx.strokeStyle = "rgba(120,84,40,0.35)"; ctx.lineWidth = 1.5; ctx.stroke();
      var tall = Math.min(10, gap * 0.6);
      ctx.beginPath();
      for (r = 0; r < R; r++) {
        y = top + gap * (r + 0.55);
        grid(7, function (i, x) { var j = hash(i, r + li * 31); if (j < 0.25) return; x += (j - 0.5) * 4; ctx.moveTo(x, y + gap * 0.25); ctx.lineTo(x + (j - 0.5) * 3, y + gap * 0.25 - tall * (0.6 + j * 0.4)); });
      }
      ctx.strokeStyle = "#F1D88E"; ctx.lineWidth = 1.8; ctx.stroke();
    } else if (st === 1) {
      R = Math.max(4, Math.round(h / 11)); gap = h / R;
      for (r = 0; r < R; r++) {
        y = top + gap * (r + 0.85);
        ctx.fillStyle = "#583420"; ctx.fillRect(px0, y - gap * 0.32, px1 - px0, gap * 0.32);
        ctx.fillStyle = "#8C5A38"; ctx.fillRect(px0, y - gap * 0.86, px1 - px0, Math.max(1.5, gap * 0.16));
      }
      ctx.fillStyle = "#4C2C1A";
      for (r = 0; r < R; r++) {
        y = top + gap * (r + 0.5);
        grid(18, function (i, x) { var j = hash(i, r * 7 + li); if (j < 0.55) return; ctx.fillRect(x, y - 2, 4 + j * 4, 3.5); });
      }
    } else if (st === 2 || st === 3 || st === 4) {
      R = Math.max(4, Math.round(h / (st === 2 ? 8 : 10))); gap = h / R;
      ctx.fillStyle = "#8D623A";
      for (r = 0; r < R; r++) {
        y = top + gap * (r + 0.5);
        grid(9, function (i, x) { var j = hash(i + r * 13, li + 3); if (j < 0.5) return; ctx.fillRect(x + j * 3, y + (j - 0.5) * gap * 0.5, 2.5, 2.2); });
      }
      if (st >= 3) {
        ctx.beginPath();
        for (r = 0; r < R; r++) { y = top + gap * (r + 0.62); ctx.moveTo(px0, y); ctx.lineTo(px1, y); }
        ctx.strokeStyle = "#6E4A2C"; ctx.lineWidth = 1.6; ctx.stroke();
      }
      if (st === 4 || (st === 3 && opt.rip)) {
        var rp = opt.rip, sz = Math.min(8, gap * 0.75);
        ctx.beginPath();
        for (r = 0; r < R; r++) {
          y = top + gap * (r + 0.62);
          grid(10, function (i, x) {
            var k = 1;
            if (st === 3) {
              var wx = (x - g.sx(0)) / kk, f = (wx - rp.from) / ((rp.to - rp.from) || 1);
              k = clamp((rp.p * 1.3 - Math.abs(f)) * 5, 0, 1);
              if (k <= 0) return;
            }
            var s2 = sz * k;
            ctx.moveTo(x - s2 * 0.5, y - s2); ctx.lineTo(x, y); ctx.lineTo(x + s2 * 0.5, y - s2);
          });
        }
        ctx.strokeStyle = "#4FAE3B"; ctx.lineWidth = 2; ctx.stroke();
      }
    } else if (st === 5) {
      R = Math.max(4, Math.round(h / 11)); gap = h / R;
      var th = Math.min(16, gap * 1.1);
      for (r = 0; r < R; r++) {
        y = top + gap * (r + 0.7);
        ctx.beginPath();
        grid(9, function (i, x) { var j = hash(i, r + li * 5); var sw = Math.sin(time * 1.4 + i * 0.6) * 1.5; ctx.moveTo(x, y); ctx.lineTo(x - th * 0.45 + sw, y - th * 0.8); ctx.moveTo(x, y); ctx.lineTo(x + sw, y - th * (0.9 + j * 0.2)); ctx.moveTo(x, y); ctx.lineTo(x + th * 0.45 + sw, y - th * 0.75); });
        ctx.strokeStyle = r % 2 ? "#4DA33A" : "#6CC04A"; ctx.lineWidth = 2.2; ctx.stroke();
      }
    } else {
      // Tall crop: green, turning golden; heads appear as it ripens.
      R = Math.max(4, Math.round(h / 10)); gap = h / R;
      var hh = Math.min(30, gap * 1.9) * (opt.grow == null ? 1 : opt.grow);
      var c1 = mix("#5DB043", "#EAC458", gold), c2 = mix("#3E8A2C", "#C99428", gold);
      var heads = gold > 0.4, sway = reduceMotion ? 0 : 1;
      for (r = 0; r < R; r++) {
        y = top + gap * (r + 0.75);
        ctx.beginPath();
        var hp = [];
        grid(6, function (i, x) {
          var j = hash(i, r * 3 + li * 17), hgt = hh * (0.8 + j * 0.3), s = Math.sin(time * 1.3 + i * 0.35 + r) * 2.2 * sway;
          ctx.moveTo(x, y); ctx.quadraticCurveTo(x, y - hgt * 0.6, x + s, y - hgt);
          if (heads) hp.push(x + s, y - hgt);
        });
        ctx.strokeStyle = r % 2 ? c1 : c2; ctx.lineWidth = 2; ctx.stroke();
        if (heads && hp.length) {
          ctx.beginPath();
          for (var q = 0; q < hp.length; q += 2) { ctx.moveTo(hp[q] + 1.6, hp[q + 1] - 3); ctx.ellipse(hp[q], hp[q + 1] - 3, 1.8, 4, 0, 0, TAU); }
          ctx.fillStyle = mix("#E9D27A", "#F3D06A", gold); ctx.globalAlpha = clamp((gold - 0.4) * 2.5, 0, 1); ctx.fill(); ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore();
  }

  // =====================================================================================================
  // Lane engine
  // =====================================================================================================
  var SC = [1, 0.9, 0.81, 0.73];
  function Lanes(o) {
    this.o = o;
    this.n = o.n || 4; this.len = o.len || 1400; this.head = o.head || 520; this.vmax = o.vmax || 200;
    this.m = { lane: 0, x: 0, dir: 1, face: 1, v: 0, lift: 0, phase: "work", dist: 0 };
    this.cam = { x: this.len / 2, y: 0 };
    this.W = 1; this.H = 1; this.k = 0.5; this.snap = true;
    this.inp = { drag: null, tap: null, held: false, nudge: 0 };
    this.tw = null; this.behind = false; this.finger = null;
    if (o.canvas) this.bind(o.canvas);
  }
  Lanes.prototype.layout = function (W, H) {
    var o = this.o, span = o.span || 600;
    this.W = W; this.H = H;
    var k = Math.min(W * 0.64 / span, H * 0.31 / 250);
    this.k = k;
    var minSky = Math.max(34, H * 0.1);
    var H0 = (H - minSky) / (3.44 + 0.34 + 0.4);
    H0 = clamp(H0, 250 * k * 0.62, 250 * k * 1.25);
    this.H0 = H0; this.track = H0 * 0.34; this.back = H0 * 0.4;
    var fieldH = 3.44 * H0 + this.track + this.back;
    var sky = H - fieldH;
    this.scrollY = 0;
    if (sky < minSky) { this.scrollY = minSky - sky; sky = minSky; }
    this.sky = sky;
    this.tops = [];
    var y = sky + this.back;
    for (var i = this.n - 1; i >= 0; i--) { this.tops[i] = y; y += H0 * SC[i]; }
    this.trackTop = y;
    this.snap = true;
  };
  Lanes.prototype.s = function (lf) {
    if (lf <= 0) return 1;
    var i = Math.min(this.n - 2, Math.floor(lf)), f = clamp(lf - i, 0, 1);
    return lerp(SC[i], SC[i + 1], f);
  };
  Lanes.prototype.geo = function (lf) {
    var top, h, s;
    if (lf < 0) {
      var f = clamp(-lf, 0, 1);
      top = lerp(this.tops[0], this.trackTop, f); h = lerp(this.H0, this.track, f); s = 1;
    } else {
      var i = Math.min(this.n - 2, Math.floor(lf)), q = clamp(lf - i, 0, 1);
      if (lf >= this.n - 1) { i = this.n - 2; q = 1; }
      top = lerp(this.tops[i], this.tops[i + 1], q); h = this.H0 * lerp(SC[i], SC[i + 1], q); s = lerp(SC[i], SC[i + 1], q);
    }
    top -= this.cam.y;
    return { top: top, h: h, s: s, ground: top + h * (lf < 0 ? 0.62 : 0.72), kk: this.k * s };
  };
  Lanes.prototype.sx = function (wx, lf) { return this.W / 2 + (wx - this.cam.x) * this.k * this.s(Math.max(0, lf)); };
  Lanes.prototype.wx = function (px, lf) { return this.cam.x + (px - this.W / 2) / (this.k * this.s(Math.max(0, lf))); };
  Lanes.prototype.place = function (lane, x, dir) {
    var m = this.m; m.lane = lane; m.x = x; m.dir = dir; m.face = dir; m.v = 0; m.lift = 0; m.phase = "work"; this.tw = null; this.snap = true;
  };
  Lanes.prototype.busy = function () { return !!this.tw; };
  Lanes.prototype.hold = function (on) { this.inp.held = !!on; };
  Lanes.prototype.nudge = function (sec) { this.inp.nudge = Math.max(this.inp.nudge, sec || 0.6); };
  Lanes.prototype.play = function (keys, done) {
    this.tw = { keys: keys.slice(), i: -1, t: 0, from: null, done: done };
    this.m.phase = "tween";
    this.inp.tap = null;
    this.nextKey();
  };
  Lanes.prototype.nextKey = function () {
    var tw = this.tw, m = this.m;
    tw.i++;
    while (tw.i < tw.keys.length && !tw.keys[tw.i].dur) { if (tw.keys[tw.i].fn) tw.keys[tw.i].fn(); tw.i++; }
    if (tw.i >= tw.keys.length) {
      this.tw = null;
      if (m.phase === "tween") m.phase = "work";
      if (tw.done) tw.done();
      return;
    }
    var k = tw.keys[tw.i];
    if (k.fn) k.fn();
    tw.t = 0;
    tw.from = { x: m.x, lane: m.lane, face: m.face, lift: m.lift };
    if (k.face != null) m.dir = k.face > 0 ? 1 : (k.face < 0 ? -1 : m.dir);
  };
  Lanes.prototype.stepTween = function (dt) {
    var tw = this.tw, m = this.m, k = tw.keys[tw.i], f;
    tw.t += dt;
    f = clamp(tw.t / k.dur, 0, 1);
    var e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
    var ox = m.x;
    if (k.x != null) m.x = lerp(tw.from.x, k.x, e);
    if (k.lane != null) m.lane = lerp(tw.from.lane, k.lane, e);
    if (k.face != null) m.face = lerp(tw.from.face, k.face, e);
    if (k.lift != null) m.lift = lerp(tw.from.lift, k.lift, e);
    m.dist += (m.x - ox) * (m.face >= 0 ? 1 : -1);
    m.v = dt > 0 ? Math.abs(m.x - ox) / dt : 0;
    if (f >= 1) this.nextKey();
  };
  Lanes.prototype.park = function () { this.m.phase = "park"; this.m.v = 0; this.tw = null; };
  Lanes.prototype.reach = function () { return this.o.reach ? this.o.reach() : { front: 260, back: 300 }; };
  Lanes.prototype.update = function (dt) {
    var m = this.m, o = this.o, inp = this.inp;
    dt = Math.min(dt, 0.05);
    if (this.tw) this.stepTween(dt);
    else if (m.phase === "work") {
      var target = m.x;
      var can = !(o.canDrive && !o.canDrive());
      if (can) {
        if (inp.drag) {
          inp.drag.wx = this.wx(inp.drag.px, m.lane); target = inp.drag.wx - inp.drag.off;
          // Forgiving: still pulling forward near the end of the lane (the finger may be at the screen edge)
          // finishes the pass.
          var left = m.dir > 0 ? this.len - (m.x - (o.work ? o.work() : 0)) : (m.x + (o.work ? o.work() : 0));
          if (left < 260 && (target - m.x) * m.dir > -300 && inp.drag.moved && !this.behind) target = m.x + m.dir * 1e6;
        }
        else if (inp.tap != null) target = inp.tap;
        else if (inp.held || inp.nudge > 0) target = m.x + m.dir * 1e6;
      }
      var want = clamp((target - m.x) * m.dir * 2.2, 0, this.vmax);
      if (!can) want = 0;
      m.v += (want - m.v) * Math.min(1, dt * 6);
      if (want === 0 && m.v < 1) m.v = 0;
      var dx = m.dir * m.v * dt;
      m.x += dx; m.dist += Math.abs(dx);
      inp.nudge = Math.max(0, inp.nudge - dt);
      if (inp.tap != null && (inp.tap - m.x) * m.dir < 3) inp.tap = null;
      var work = o.work ? o.work() : 0;
      var wxp = m.x - m.dir * work, end = m.dir > 0 ? this.len : 0;
      var reached = m.dir > 0 ? wxp >= end : wxp <= end;
      if (reached) { wxp = end; m.x = end + m.dir * work; }
      if (m.v > 0 && o.onWork) o.onWork(Math.round(m.lane), wxp, m.v, dt);
      if (reached) this.finishPass();
    } else m.v = Math.max(0, m.v - dt * 400);
    this.camera(dt);
  };
  Lanes.prototype.finishPass = function () {
    var m = this.m, o = this.o, self = this, lane = Math.round(m.lane), d = m.dir, work = o.work ? o.work() : 0;
    this.inp.tap = null; this.inp.nudge = 0;
    this.inp.drag = null; this.behind = false; // the finger lets go of it here; a new drag starts on the next lane
    m.v = 0;
    if (o.onPass) o.onPass(lane);
    var end = d > 0 ? this.len : 0, nd = -d;
    if (lane < this.n - 1) {
      if (o.onTurn) o.onTurn(lane);
      this.play([
        { dur: 0.45, lift: 1 },
        { dur: 1.0, x: end + d * (work + 170), lane: lane + 0.5, face: 0 },
        { dur: 0.95, x: end + nd * work, lane: lane + 1, face: nd },
        { dur: 0.45, lift: 0 }
      ], function () { m.lane = lane + 1; m.dir = nd; m.face = nd; m.phase = "work"; });
    } else {
      var keys = [{ dur: 0.45, lift: 1 }, { dur: 1.3, x: end + d * (work + 150) }];
      // Park where the next job starts (o.parkAt), e.g. the near headland, ready for the next hitch.
      var pk = o.parkAt ? o.parkAt() : null;
      if (pk) keys.push({ dur: 1.0, x: pk.x + d * 120, lane: (pk.lane + lane) / 2, face: 0 }, { dur: 1.2, x: pk.x, lane: pk.lane, face: pk.face || 1 });
      this.play(keys, function () { m.phase = "park"; if (pk) { m.lane = pk.lane; m.dir = pk.face || 1; } if (o.onFieldDone) o.onFieldDone(); });
    }
  };
  Lanes.prototype.camera = function (dt) {
    var m = this.m, kk = this.k * this.s(Math.max(0, m.lane)), r = this.reach();
    var fd = m.face >= 0 ? 1 : -1;
    var c = m.x + fd * (r.front - r.back) / 2;
    var target = c + fd * 0.12 * this.W / kk;
    var hw = this.W / 2 / kk, minX = -this.head + hw, maxX = this.len + this.head - hw;
    target = minX > maxX ? this.len / 2 : clamp(target, minX, maxX);
    var ty = this.scrollY * (1 - clamp(m.lane, 0, this.n - 1) / (this.n - 1));
    if (this.snap) { this.cam.x = target; this.cam.y = ty; this.snap = false; }
    else {
      var a = reduceMotion ? 1 : Math.min(1, dt * 2.4);
      this.cam.x += (target - this.cam.x) * a; this.cam.y += (ty - this.cam.y) * a;
    }
  };
  Lanes.prototype.machineRect = function () {
    var m = this.m, r = this.reach(), g = this.geo(m.lane), fd = m.face >= 0 ? 1 : -1;
    var a = this.sx(m.x - fd * r.back, m.lane), b = this.sx(m.x + fd * r.front, m.lane);
    return { left: Math.min(a, b), right: Math.max(a, b), top: g.ground - 250 * g.kk, bottom: g.ground + 8, ground: g.ground };
  };
  Lanes.prototype.bind = function (cv) {
    var self = this, o = this.o, inp = this.inp;
    function pt(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    var lastBehind = 0;
    cv.addEventListener("pointerdown", function (e) {
      var p = pt(e);
      self.finger = p;
      if (o.locked && o.locked()) return;
      var m = self.m, R = self.machineRect(), pad = 40;
      var onMachine = p[0] > R.left - pad && p[0] < R.right + pad && p[1] > R.top - pad && p[1] < R.bottom + pad;
      if (onMachine && !inp.drag) {
        var wx = self.wx(p[0], m.lane);
        inp.drag = { id: e.pointerId, p0: p, px: p[0], t0: Date.now(), wx: wx, off: wx - m.x, moved: false, gone: 0 };
        inp.tap = null;
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        return;
      }
      if (m.phase === "work" && !self.tw) {
        var g = self.geo(m.lane), fd = m.dir;
        var wxp = self.wx(p[0], m.lane);
        if (p[1] > g.top - g.h * 0.6 && p[1] < g.top + g.h * 1.25 && (wxp - m.x) * fd > 0) {
          var front = self.reach().front;
          inp.tap = wxp - fd * front * 0.4;
          if ((inp.tap - m.x) * fd < 40) inp.tap = m.x + fd * 40;
          if (o.onTap) o.onTap("ahead", { px: p[0], py: p[1] });
          return;
        }
      }
      if (o.onTap) o.onTap("field", { px: p[0], py: p[1] });
    });
    cv.addEventListener("pointermove", function (e) {
      var p = pt(e);
      self.finger = p;
      var d = inp.drag;
      if (!d || d.id !== e.pointerId) return;
      var m = self.m;
      d.px = p[0]; d.wx = self.wx(p[0], m.lane);
      if (Math.hypot(p[0] - d.p0[0], p[1] - d.p0[1]) > 8) d.moved = true;
      var ahead = (d.wx - d.off - m.x) * m.dir;
      self.behind = d.moved && ahead < -24 && m.phase === "work" && !self.tw;
      if (self.behind && Date.now() - lastBehind > 2500) { lastBehind = Date.now(); if (o.onTap) o.onTap("behind", { px: p[0], py: p[1] }); }
      if (d.moved && ahead > 20 && m.phase === "work" && !self.tw && o.onDrag) o.onDrag();
    });
    function end(e) {
      var d = inp.drag;
      if (!d || d.id !== e.pointerId) return;
      inp.drag = null; self.behind = false;
      if (!d.moved && Date.now() - d.t0 < 450 && o.onTap) { var p = pt(e); o.onTap("machine", { px: p[0], py: p[1] }); }
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.addEventListener("lostpointercapture", end);
  };

  // =====================================================================================================
  // Particles (world coordinates on a lane: x in units, h = height above the ground in units,
  // dy = across the lane as a fraction of its height)
  // =====================================================================================================
  function Particles(cap) { this.a = []; this.cap = cap || 400; }
  Particles.prototype.add = function (p) {
    if (this.a.length >= this.cap) return null;
    p.age = 0; if (p.dy == null) p.dy = 0; if (p.vdy == null) p.vdy = 0; if (p.g == null) p.g = 0; if (p.rot == null) p.rot = 0;
    this.a.push(p); return p;
  };
  Particles.prototype.clear = function () { this.a.length = 0; };
  Particles.prototype.update = function (dt) {
    var a = this.a;
    for (var i = a.length - 1; i >= 0; i--) {
      var p = a[i];
      p.age += dt;
      if (p.age >= p.life) { a[i] = a[a.length - 1]; a.pop(); continue; }
      p.x += (p.vx || 0) * dt; p.h += (p.vh || 0) * dt; p.dy += p.vdy * dt; p.vh -= p.g * dt; p.rot += (p.vr || 0) * dt;
      if (p.g && p.h < 0) { p.h = 0; p.vh = 0; p.vx = 0; p.vdy = 0; p.vr = 0; }
    }
  };
  Particles.prototype.draw = function (ctx, E) {
    var a = this.a;
    for (var i = 0; i < a.length; i++) {
      var p = a[i], g = E.geo(p.lane), x = E.sx(p.x, p.lane), y = g.ground + p.dy * g.h - p.h * g.kk, f = p.age / p.life;
      var s = (p.size || 6) * g.kk * (p.grow ? 1 + f * p.grow : 1);
      ctx.globalAlpha = p.fade ? 1 - f : (f > 0.8 ? (1 - f) * 5 : 1);
      if (p.kind === "chunk") { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillStyle = p.col || SOIL; ctx.fillRect(-s / 2, -s / 2, s, s * 0.8); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-s / 2, -s / 2, s, s * 0.8); ctx.restore(); }
      else if (p.kind === "puff") { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, s), 0, TAU); ctx.fillStyle = p.col; ctx.fill(); }
      else if (p.kind === "dot") { ctx.fillStyle = p.col; ctx.fillRect(x - s / 2, y - s / 2, s, s); }
      else if (p.kind === "spark") { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillStyle = p.col || "#FFE14D"; ctx.beginPath(); for (var k = 0; k < 8; k++) { var r = k % 2 ? s * 0.35 : s; ctx.lineTo(Math.cos(k * Math.PI / 4) * r, Math.sin(k * Math.PI / 4) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
  };

  // =====================================================================================================
  // Animals and birds
  // =====================================================================================================
  function drawSheep(ctx, x, y, s, ph, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); ctx.lineJoin = "round";
    var lw = 3, graze = ph && ph.graze || 0, t = ph && ph.t || 0;
    [-14, -4, 8, 16].forEach(function (lx, i) { rrect(ctx, lx, -14, 5, 15, 2); fs(ctx, "#2F3442", lw * 0.6); });
    ctx.beginPath();
    for (var k = 0; k < 9; k++) { var a = k / 9 * TAU; ctx.arc(Math.cos(a) * 20, -24 + Math.sin(a) * 11, 7, 0, TAU); }
    ctx.fillStyle = "#FFFFFF"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, -24, 24, 14, 0, 0, TAU); fs(ctx, "#F6F4EE", lw);
    var hy = -30 + graze * 16, hx = 24;
    ctx.beginPath(); ctx.ellipse(hx, hy, 8, 10, 0.3 + graze * 0.6, 0, TAU); fs(ctx, "#2F3442", lw * 0.7);
    circ(ctx, hx + 3, hy - 2, 1.6, "#FFFFFF", 0);
    ctx.beginPath(); ctx.ellipse(hx - 6, hy - 6, 5, 2.4, -0.5 + Math.sin(t * 3) * 0.2, 0, TAU); fs(ctx, "#2F3442", 0);
    ctx.restore();
  }
  function drawCow(ctx, x, y, s, ph, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); ctx.lineJoin = "round";
    var lw = 3, graze = ph && ph.graze || 0, t = ph && ph.t || 0;
    [-26, -16, 16, 26].forEach(function (lx) { rrect(ctx, lx - 3, -22, 7, 22, 2); fs(ctx, "#F6F4EE", lw * 0.6); rrect(ctx, lx - 3, -4, 7, 4, 1); fs(ctx, INK, 0); });
    rrect(ctx, -34, -50, 68, 32, 12); fs(ctx, "#FFFFFF", lw);
    ctx.save(); rrect(ctx, -34, -50, 68, 32, 12); ctx.clip();
    ctx.fillStyle = "#2F3442"; ctx.beginPath(); ctx.ellipse(-12, -40, 12, 9, 0.4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(16, -28, 10, 7, -0.3, 0, TAU); ctx.fill();
    ctx.restore();
    rrect(ctx, -34, -50, 68, 32, 12); fs(ctx, null, lw);
    var sw = Math.sin(t * 2) * 0.3;
    seg(ctx, -34, -44, -42 + sw * 6, -24, INK, 3); circ(ctx, -42 + sw * 6, -22, 3, INK, 0);
    var hy = -50 + graze * 26;
    rrect(ctx, 30, hy - 6, 22, 18, 8); fs(ctx, "#FFFFFF", lw);
    rrect(ctx, 42, hy + 2, 12, 10, 5); fs(ctx, "#F4B6C2", lw * 0.6);
    circ(ctx, 38, hy, 2, INK, 0);
    poly(ctx, [32, hy - 6, 28, hy - 14, 36, hy - 8], "#E8DCC0", lw * 0.5);
    ctx.restore();
  }
  function drawGull(ctx, x, y, s, flap, sit, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (sit) {
      ctx.beginPath(); ctx.ellipse(0, -9, 12, 7, 0, 0, TAU); fs(ctx, "#FFFFFF", 2.4);
      poly(ctx, [-4, -12, -16, -10, -6, -6], "#9AA5B1", 2);
      circ(ctx, 11, -15, 5, "#FFFFFF", 2.4); poly(ctx, [15, -15, 21, -14, 15, -13], "#F2B53A", 1.2);
      seg(ctx, -2, -3, -2, 1, "#F2B53A", 2); seg(ctx, 3, -3, 3, 1, "#F2B53A", 2);
    } else {
      var w = Math.sin(flap) * 10;
      ctx.beginPath(); ctx.moveTo(-18, -w); ctx.quadraticCurveTo(-8, -6 - w * 0.4, 0, 0); ctx.quadraticCurveTo(8, -6 - w * 0.4, 18, -w);
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = "#FFFFFF"; ctx.stroke();
      circ(ctx, 0, 0, 3.2, "#FFFFFF", 1.6);
    }
    ctx.restore();
  }
  function drawHare(ctx, x, y, s, ph, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s); ctx.lineJoin = "round";
    var hop = Math.abs(Math.sin(ph * Math.PI));
    ctx.translate(0, -hop * 16);
    ctx.beginPath(); ctx.ellipse(0, -14, 20, 11, -0.1 - hop * 0.2, 0, TAU); fs(ctx, "#B8854E", 3);
    ctx.beginPath(); ctx.ellipse(-12, -6, 9, 6, 0.4, 0, TAU); fs(ctx, "#A87644", 2.4);
    circ(ctx, -20, -16, 4, "#FFFFFF", 1.5);
    ctx.beginPath(); ctx.ellipse(18, -24, 9, 7, 0, 0, TAU); fs(ctx, "#B8854E", 3);
    ctx.beginPath(); ctx.ellipse(14, -40, 3.4, 13, -0.35, 0, TAU); fs(ctx, "#B8854E", 2.4);
    ctx.beginPath(); ctx.ellipse(20, -40, 3.4, 13, 0.1, 0, TAU); fs(ctx, "#B8854E", 2.4);
    circ(ctx, 21, -26, 1.8, INK, 0);
    rrect(ctx, 8, -8 + hop * 4, 12, 5, 2); fs(ctx, "#A87644", 2);
    ctx.restore();
  }

  // =====================================================================================================
  // Sky, sun, clouds, hills and the farm on the horizon
  // =====================================================================================================
  var TREE = { spring: ["#5DB043", "#FFD1E0"], summer: ["#3E9A3A", null], autumn: ["#E58A2E", "#C9541F"], winter: ["#8A94A6", null] };
  function cloud(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-50, 10); ctx.quadraticCurveTo(-56, -12, -32, -14); ctx.quadraticCurveTo(-26, -36, 0, -32);
    ctx.quadraticCurveTo(20, -44, 36, -22); ctx.quadraticCurveTo(60, -22, 56, 2); ctx.quadraticCurveTo(60, 14, 44, 14); ctx.lineTo(-40, 14); ctx.quadraticCurveTo(-52, 14, -50, 10); ctx.closePath();
    fs(ctx, col || "#FFFFFF", 3 / s);
    ctx.restore();
  }
  function farmstead(ctx, x, y, s, season) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = "round";
    var lw = 3, tr = TREE[season] || TREE.spring;
    function tree(tx, r) {
      rrect(ctx, tx - 4, -r * 1.2, 8, r * 1.2, 2); fs(ctx, "#7A4B22", lw * 0.7);
      circ(ctx, tx, -r * 1.6, r, tr[0], lw);
      if (tr[1]) for (var i = 0; i < 6; i++) circ(ctx, tx + Math.cos(i * 1.7) * r * 0.55, -r * 1.6 + Math.sin(i * 2.3) * r * 0.5, r * 0.16, tr[1], 0);
    }
    tree(-120, 22); tree(-96, 16);
    // Farmhouse.
    rrect(ctx, -84, -46, 58, 46, 2); fs(ctx, "#F6E7C8", lw);
    poly(ctx, [-90, -44, -55, -72, -20, -44], "#6E7787", lw);
    rrect(ctx, -74, -34, 14, 12, 2); fs(ctx, "#BFE6FF", lw * 0.7); rrect(ctx, -48, -26, 12, 26, 2); fs(ctx, "#8B5A2B", lw * 0.7);
    // Barn with a white X door, and a silo.
    poly(ctx, [-12, 0, -12, -54, 26, -80, 64, -54, 64, 0], "#D2453A", lw);
    poly(ctx, [-16, -52, 26, -84, 68, -52, 64, -48, 26, -76, -12, -48], "#6E3A2E", lw * 0.7);
    rrect(ctx, 10, -34, 32, 34, 1); fs(ctx, "#B83A30", lw * 0.8);
    seg(ctx, 12, -32, 40, -2, "#FFFFFF", 3.5); seg(ctx, 40, -32, 12, -2, "#FFFFFF", 3.5);
    rrect(ctx, 20, -64, 12, 10, 1); fs(ctx, "#FFFFFF", lw * 0.6);
    rrect(ctx, 70, -96, 26, 96, 3); fs(ctx, "#C9D3E0", lw);
    ctx.beginPath(); ctx.arc(83, -96, 13, Math.PI, TAU); fs(ctx, "#8E99A8", lw);
    for (var b = 0; b < 4; b++) seg(ctx, 71, -78 + b * 20, 95, -78 + b * 20, "#8E99A8", 2);
    tree(118, 20); tree(140, 14);
    ctx.restore();
  }
  function sky(ctx, t, season, tod) {
    var w = t.w, h = t.h, time = t.time || 0;
    tod = clamp(tod || 0, 0, 1);
    var day = 1, sunX = w * (t.sunX == null ? 0.86 : t.sunX), sunY = Math.max(22, h * 0.32);
    if (t.arc != null) {
      var p = clamp(t.arc, 0, 1) * 3, f = p - Math.floor(p);
      if (t.arc >= 1) f = 0.5;
      day = Math.pow(Math.sin(Math.PI * f), 0.6);
      sunX = lerp(-w * 0.05, w * 1.05, f); sunY = h * 0.95 - Math.sin(Math.PI * f) * h * 0.8;
    }
    var top = mix("#1E2A55", mix("#6EC3FF", "#5B4B8A", tod), day), bot = mix("#41507F", mix("#CFEFFF", "#FFB27A", tod), day);
    var gr = ctx.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, w, h + 1);
    if (t.rain) { ctx.fillStyle = "rgba(110,120,140," + (0.35 * t.rain) + ")"; ctx.fillRect(0, 0, w, h + 1); }
    var sc = clamp(h / 150, 0.35, 1.1);
    if (t.rainbow) {
      ctx.save(); ctx.globalAlpha = clamp(t.rainbow, 0, 1) * 0.75;
      var cols = ["#FF4D6D", "#FFB627", "#FFE14D", "#4CD964", "#3DB4FF", "#8E6CFF"], R = Math.min(w * 0.42, h * 1.6);
      cols.forEach(function (c, i) { ctx.beginPath(); ctx.arc(w * 0.52, h * 1.05, R - i * 7 * sc, Math.PI, TAU); ctx.strokeStyle = c; ctx.lineWidth = 7 * sc; ctx.stroke(); });
      ctx.restore();
    }
    // Sun (or the moon at night in "weeks go by").
    var sr = 22 * clamp(sc, 0.6, 1.1);
    if (day > 0.15) {
      ctx.save(); ctx.globalAlpha = clamp((day - 0.15) * 2, 0, 1);
      ctx.beginPath();
      for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6 + time * 0.15; ctx.moveTo(sunX + Math.cos(a) * sr * 1.3, sunY + Math.sin(a) * sr * 1.3); ctx.lineTo(sunX + Math.cos(a) * sr * 1.75, sunY + Math.sin(a) * sr * 1.75); }
      ctx.strokeStyle = tod > 0.5 ? "#FF8A3D" : "#FFB400"; ctx.lineWidth = 4 * sc + 1; ctx.lineCap = "round"; ctx.stroke();
      circ(ctx, sunX, sunY, sr, tod > 0.5 ? "#FFB45C" : "#FFD84D", 3);
      ctx.restore();
    } else {
      circ(ctx, w - sunX, h * 0.3, sr * 0.8, "#FFF4CC", 3);
    }
    // Clouds drift.
    var cl = [[0.22, 0.3, 0.8, 9], [0.62, 0.5, 1, 6], [0.9, 0.22, 0.7, 11]];
    cl.forEach(function (c, i) {
      if (h < 60 && i === 1) return;
      var x = ((c[0] * w + time * c[3]) % (w + 160)) - 80;
      cloud(ctx, x, h * c[1], c[2] * sc, t.rain ? "#D9DEE7" : "#FFFFFF");
    });
    // Rolling hills and the farm on the horizon.
    var hill = season === "autumn" ? "#9DBB55" : (season === "winter" ? "#DDE6EE" : "#7FC35A"), hill2 = season === "autumn" ? "#87A447" : (season === "winter" ? "#C8D3DE" : "#69AE4A");
    ctx.beginPath(); ctx.moveTo(0, h);
    for (var x = 0; x <= w + 20; x += 20) ctx.lineTo(x, h - (14 + Math.sin(x * 0.006 + 1) * 10) * sc);
    ctx.lineTo(w, h); ctx.closePath(); fs(ctx, hill, 3);
    farmstead(ctx, w * (t.farmX == null ? 0.72 : t.farmX), h - 6 * sc, 0.62 * sc, season);
    ctx.beginPath(); ctx.moveTo(0, h);
    for (x = 0; x <= w + 20; x += 20) ctx.lineTo(x, h - (5 + Math.sin(x * 0.01 + 3) * 4) * sc);
    ctx.lineTo(w, h); ctx.closePath(); fs(ctx, hill2, 2.5);
    if (day < 1 || tod > 0) { ctx.fillStyle = "rgba(20,24,60," + (Math.max(0.55 * (1 - day), tod * 0.18)) + ")"; ctx.fillRect(0, 0, w, h + 1); }
  }

  // =====================================================================================================
  // Sound (soft, synthesized, only when sound is on)
  // =====================================================================================================
  var snd = { ac: null, out: null, eng: null, soil: null, spray: null, noise: null };
  function audio() {
    var ac = window.Toybox && Toybox.sound.ready();
    if (!ac) { if (snd.ac) stopAll(); return null; }
    if (ac !== snd.ac) { stopAll(); snd.ac = ac; snd.out = ac.createGain(); snd.out.gain.value = 0.8; snd.out.connect(ac.destination); }
    return ac;
  }
  function noiseBuf(ac) {
    if (snd.noise && snd.noise.sampleRate === ac.sampleRate) return snd.noise;
    var b = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { var wv = Math.random() * 2 - 1; last = (last + 0.04 * wv) / 1.04; d[i] = last * 3.2; }
    snd.noise = b; return b;
  }
  function stopNode(n) { if (!n) return; try { n.g.gain.setTargetAtTime(0, snd.ac.currentTime, 0.08); var s = n.srcs; setTimeout(function () { s.forEach(function (x) { try { x.stop(); } catch (e) { /* ignore */ } }); }, 400); } catch (e) { /* ignore */ } }
  function stopAll() { stopNode(snd.eng); stopNode(snd.soil); stopNode(snd.spray); snd.eng = snd.soil = snd.spray = null; snd.ac = null; }
  function engine(level) {
    var ac = audio();
    if (!ac) return;
    if (level < 0) { stopNode(snd.eng); snd.eng = null; return; }
    if (!snd.eng) {
      var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), amp = ac.createGain();
      o.type = "sawtooth"; o.frequency.value = 52; f.type = "lowpass"; f.frequency.value = 300;
      lfo.type = "square"; lfo.frequency.value = 9; lg.gain.value = 0.4; amp.gain.value = 0.6;
      g.gain.value = 0;
      o.connect(f); f.connect(amp); amp.connect(g); g.connect(snd.out);
      lfo.connect(lg); lg.connect(amp.gain);
      o.start(); lfo.start();
      snd.eng = { o: o, lfo: lfo, g: g, srcs: [o, lfo] };
    }
    var t = ac.currentTime, e = snd.eng;
    e.g.gain.setTargetAtTime(0.045 + level * 0.02, t, 0.15);
    e.o.frequency.setTargetAtTime(52 + level * 12, t, 0.2);
    e.lfo.frequency.setTargetAtTime(9 + level * 5, t, 0.2);
  }
  function noiseLoop(key, type, freq, level, max) {
    var ac = audio();
    if (!ac) return;
    var n = snd[key];
    if (!n) {
      if (level <= 0.01) return;
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf(ac); s.loop = true; f.type = type; f.frequency.value = freq; g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(snd.out); s.start();
      n = snd[key] = { g: g, srcs: [s] };
    }
    n.g.gain.setTargetAtTime(clamp(level, 0, 1) * max, ac.currentTime, 0.12);
  }
  function tone(freq, dur, vol, type, slideTo, delay, filt) {
    var ac = audio();
    if (!ac) return;
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (filt) { var f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filt; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(snd.out); o.start(t); o.stop(t + dur + 0.05);
  }
  var sound = {
    engine: engine,
    soil: function (l) { noiseLoop("soil", "lowpass", 380, l, 0.05); },
    spray: function (l) { noiseLoop("spray", "highpass", 3200, l, 0.025); },
    horn: function () { tone(392, 0.22, 0.035, "square", null, 0, 900); tone(330, 0.3, 0.035, "square", null, 0.24, 900); },
    clunk: function () { tone(120, 0.18, 0.06, "triangle", 70); tone(900, 0.06, 0.02, "square", 600, 0.02, 2000); },
    tick: function () { tone(1800 + Math.random() * 600, 0.04, 0.012, "sine"); },
    pop: function () { tone(380, 0.12, 0.04, "sine", 620); },
    chime: function () { tone(523, 0.4, 0.035); tone(659, 0.45, 0.035, "sine", null, 0.12); tone(784, 0.6, 0.035, "sine", null, 0.24); },
    baa: function () { tone(330, 0.5, 0.02, "sawtooth", 300, 0, 1200); },
    stop: stopAll
  };
  window.addEventListener("pagehide", function () { stopAll(); });

  // =====================================================================================================
  // Ghost hand (master copy: tools/snippets/ghost-hand.js; same look in every app)
  // =====================================================================================================
  var GH_CSS = ".ghosthand { position: fixed; left: 0; top: 0; z-index: 45; display: none; pointer-events: none; opacity: 0; will-change: transform, opacity; }" +
    ".ghosthand svg { display: block; width: 100%; height: 100%; overflow: visible; }" +
    ".ghosthand > svg { position: relative; }" +
    ".ghosthand .gh-carry svg { width: 100%; height: 100%; transform: rotate(14deg); }" +
    ".ghosthand .gh-press { opacity: 0; transition: opacity 0.12s ease; }";
  function makeGhost(plan, opt) {
    if (!document.getElementById("farm-ghost-css")) {
      var st = document.createElement("style"); st.id = "farm-ghost-css"; st.textContent = GH_CSS; document.head.appendChild(st);
    }
    opt = opt || {};
    var IDLE = opt.idle || 4500, MAX = opt.max || 2;
    var last = Date.now(), shown = 0, armed = true, learned = false, run = null, el = null;
    var reduce = reduceMotion;
    var carryEl = document.createElement("div");
    carryEl.className = "gh-carry";
    function build() {
      el = document.createElement("div");
      el.className = "ghosthand";
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = '<svg viewBox="-24 -18 64 84"><circle class="gh-press" cx="0" cy="0" r="17" fill="rgba(255,201,60,0.55)"/>' +
        '<g fill="#FFFFFF" stroke="#1D2340" stroke-width="3" stroke-linejoin="round">' +
        '<rect x="-9" y="-6" width="18" height="40" rx="9"/><rect x="-12" y="22" width="44" height="40" rx="16"/>' +
        '<rect x="10" y="14" width="14" height="24" rx="7"/></g>' +
        '<circle cx="0" cy="2" r="5" fill="rgba(255,201,60,0.9)"/></svg>';
      el.insertBefore(carryEl, el.firstChild);
      document.body.appendChild(el);
    }
    function stop() { run = null; if (el) { el.style.display = "none"; carryEl.innerHTML = ""; } }
    function poke() { last = Date.now(); armed = true; if (run) stop(); }
    document.addEventListener("pointerdown", poke, true);
    document.addEventListener("keydown", poke, true);
    function blocked() {
      if (document.hidden) return true;
      if (window.Toybox && (Toybox.sheetOpen() || Toybox.timer.phase() === "ending" || Toybox.timer.phase() === "resting")) return true;
      return !!(opt.ok && !opt.ok());
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    function at(pts, f) {
      if (pts.length < 2) return pts[0];
      var segs = [], tot = 0, i;
      for (i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); tot += l; }
      var d = f * tot;
      for (i = 0; i < segs.length; i++) {
        if (d <= segs[i] || i === segs.length - 1) { var t = segs[i] ? Math.min(1, d / segs[i]) : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; }
        d -= segs[i];
      }
      return pts[pts.length - 1];
    }
    function frame() {
      if (!run) return;
      var t = (Date.now() - run.t0) / run.dur, p = run.p, s = run.s, x, y, a, press, sc = 1;
      if (t >= 1) { stop(); return; }
      if (p.tap || p.pts.length < 2) {
        var pt = p.pts[0];
        x = pt[0]; y = pt[1];
        a = t < 0.15 ? t / 0.15 : (t > 0.85 ? (1 - t) / 0.15 : 1);
        press = (t > 0.3 && t < 0.42) || (t > 0.55 && t < 0.67);
        sc = press ? 0.92 : 1;
        if (t < 0.3) { var k = 1 - t / 0.3; x += 26 * s * k; y += 30 * s * k; }
      } else {
        a = t < 0.1 ? t / 0.1 : (t > 0.9 ? (1 - t) / 0.1 : 1);
        var f = reduce ? 0.5 : ease(Math.max(0, Math.min(1, (t - 0.16) / 0.66)));
        var q = at(p.pts, f); x = q[0]; y = q[1];
        press = t > 0.12 && t < 0.86;
        sc = t < 0.12 ? 1.12 - 0.12 * (t / 0.12) : 1;
      }
      el.style.opacity = (0.85 * a).toFixed(3);
      el.style.transform = "translate(" + (x - 24 * s) + "px," + (y - 18 * s) + "px) rotate(-14deg) scale(" + sc + ")";
      el.lastChild.firstChild.style.opacity = press ? "1" : "0";
      carryEl.style.opacity = press ? "0.75" : "0";
      requestAnimationFrame(frame);
    }
    function show(p) {
      if (!el) build();
      var s = Math.max(1, Math.min(1.7, Math.min(innerWidth, innerHeight) / 360));
      el.style.width = (64 * s) + "px"; el.style.height = (84 * s) + "px";
      el.style.transformOrigin = (24 * s) + "px " + (18 * s) + "px";
      el.style.display = "block";
      carryEl.innerHTML = p.carry ? p.carry.html : "";
      run = { p: p, s: s, t0: Date.now(), dur: p.dur || (p.tap ? 2400 : 3200) };
      requestAnimationFrame(frame);
    }
    setInterval(function () {
      if (run || learned || !armed || shown >= MAX || Date.now() - last < IDLE) return;
      if (blocked()) { last = Date.now(); return; }
      var p = null;
      try { p = plan(); } catch (e) { p = null; }
      if (!p || !p.pts || !p.pts.length) return;
      armed = false; shown++;
      show(p);
    }, 250);
    return {
      learned: function () { learned = true; stop(); },
      again: function () { learned = false; shown = 0; armed = true; last = Date.now(); },
      poke: poke,
      show: function () { var p = plan(); if (p) show(p); return !!p; }
    };
  }

  // =====================================================================================================
  // Coach pill
  // =====================================================================================================
  function coach(el, base) {
    var said = "", until = 0;
    function tick() {
      var txt = Date.now() < until ? said : ((base && base()) || "");
      if (txt) { if (el.textContent !== txt) el.textContent = txt; el.classList.remove("off"); el.hidden = false; }
      else el.classList.add("off");
    }
    setInterval(tick, 250);
    tick();
    return {
      say: function (t, ms) { said = t; until = Date.now() + Math.max(3200, ms || 0); tick(); },
      clear: function () { until = 0; tick(); },
      tick: tick,
      text: function () { return el.classList.contains("off") ? "" : el.textContent; }
    };
  }

  // =====================================================================================================
  // Rest picture: a barn at dusk, a sleeping cow and the tractor parked beside it
  // =====================================================================================================
  function restArt() {
    var c = document.createElement("canvas"), W = 400, H = 300, ctx;
    c.width = W * 2; c.height = H * 2;
    try { ctx = c.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return "";
    ctx.scale(2, 2);
    sky(ctx, { w: W, h: 200, time: 0, farmX: 2, sunX: 5 }, "spring", 1);
    ctx.fillStyle = "rgba(20,24,60,0.35)"; ctx.fillRect(0, 0, W, 200);
    circ(ctx, 330, 50, 20, "#FFF4CC", 3);
    [[60, 40], [120, 70], [210, 30], [270, 80], [36, 110]].forEach(function (s) { circ(ctx, s[0], s[1], 2.5, "#FFF4CC", 0); });
    ctx.fillStyle = "#4E7F3A"; ctx.fillRect(0, 200, W, 100); seg(ctx, 0, 200, W, 200, INK, 4);
    farmstead(ctx, 120, 214, 1.15, "spring");
    ctx.save(); ctx.translate(250, 262); ctx.scale(0.42, 0.42); drawTractor(ctx, { lw: 7, driver: false }, null); ctx.restore();
    drawCow(ctx, 70, 284, 0.9, { graze: 0.9, t: 0 }, false);
    ctx.fillStyle = "#FFFFFF"; ctx.font = "800 26px 'Baloo 2', sans-serif"; ctx.fillText("z", 116, 236); ctx.font = "800 18px 'Baloo 2', sans-serif"; ctx.fillText("z", 136, 220);
    var url = "";
    try { url = c.toDataURL("image/png"); } catch (e) { return ""; }
    return '<img class="rest-art" alt="" src="' + url + '">';
  }

  window.Farm = {
    STAGES: STAGES,
    HITCH: HITCH,
    IMPLEMENTS: IMPLEMENTS,
    world: world,
    lanes: function (o) { return new Lanes(o || {}); },
    paintLane: paintLane,
    drawTractor: drawTractor,
    drawImplement: drawImplement,
    sky: sky,
    farmstead: farmstead,
    cloud: cloud,
    drawSheep: drawSheep,
    drawCow: drawCow,
    drawGull: drawGull,
    drawHare: drawHare,
    Particles: Particles,
    sound: sound,
    ghost: makeGhost,
    coach: coach,
    restArt: restArt,
    util: { clamp: clamp, lerp: lerp, hash: hash, mix: mix, rrect: rrect, circ: circ, poly: poly, seg: seg, fs: fs, INK: INK }
  };
})();
