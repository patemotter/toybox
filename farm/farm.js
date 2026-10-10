/* Farm: the shared script for every Farm page (the map and the stations). Plain ES5, no modules.
 * Load it after ../common/toybox.js:   <script src="farm.js"></script>   It defines window.Farm.
 * One owner at a time (plans/farm.md 0.5); smoke-test every farm page after a change.
 *
 * THE LOOK (the dad: like the farm-machinery show he watches): a low side-on view from the edge of the field.
 * The machine crosses the screen in profile on the near strip of the field, big; the field stretches back in
 * rows to a hedge with trees, the farm and hills sit on the horizon, the sky on top. The camera pans with the
 * machine (the far field moves slower: parallax). Behind the machine the whole field changes, along a line that
 * runs from the machine back to the hedge (in perspective), so "behind the tractor it is done" reads at once.
 * In front of the field (nearer to us) is the farm track, where a trailer drives alongside a harvester and on to
 * the store shed at the right end, and a grass verge with flowers.
 *
 * API
 *   Farm.NAMES                  { spuds: "Spuds in Mud", combine: "Combine Time" }: the stations' names (map labels,
 *                               headers, titles). Rename a station here only.
 *   Farm.world                  the shared farm (localStorage "farm-world-v1", every access in try/catch, unknown
 *                               fields kept): .get() -> { v, wheat: "golden"|"stubble", spuds: a SPUDS stage,
 *                               grain: loads in the grain store, potatoes: loads in the potato store, season }.
 *                               .update(fn) reads, fn(world), writes, returns it.
 *   Farm.Scene(o)               the side view. o = { L (field length, m), span (machine length to fit, m),
 *                               mh (machine height to fit, m), xmin, xmax (world x the camera may show),
 *                               fit: optional fn(W, H) -> px per metre (overrides span/mh) }. Members (css px):
 *     .layout(W, H)             size it; .W .H .k (px per m on the machine line) .hY (horizon) .gY (machine ground)
 *     .X(x, r) .Y(r) .S(r)      world x at depth r (1 = the machine line, < 1 nearer, > 1 further) -> screen x;
 *                               the ground line of depth r; px per m at depth r. R.TRACK = the farm track's depth.
 *     .wx(px, r)                screen x -> world x (r <= 1)
 *     .cam, .follow(x, dt, snap) camera (world x at the screen centre), eased toward x, kept in [xmin, xmax]
 *     .sky(ctx, o)              sky, sun, clouds, hills, the farm on the horizon, the hedge. o = { time, arc (null
 *                               or 0..1: weeks go by, the sun runs over three times), season, dusk (0..1) }
 *     .field(ctx, part, paint)  the field, part "far" (behind the machine line) or "near" (in front of it).
 *                               paint = { stage, wipe: null | { bx, dir, to }, time, ... } and a painter id in
 *                               paint.crop: "spuds" | "wheat". bx = world x of the change line; dir = +1: the
 *                               field left of bx shows `to`, right of it `stage` (dir -1 the other way round).
 *     .verge(ctx, o)            the farm track and the grass verge in front (drawn after the field's near part)
 *     .store(ctx, level, o)     the store shed at o.x with its heap (level 0..1+), kind "grain" | "potato"
 *     .put(ctx, x, r, dir, fn)  draw fn() in machine units (metres, y up negative, facing +x) at world x, depth r,
 *                               facing dir (+1 right, -1 left). Farm.LW is the outline width in units meanwhile.
 *   Farm.draw.tractor(ctx, st)  the one green tractor (generic, no logos), origin on the ground under the rear axle.
 *                               st = { wheel (m driven), time, face (0..1), lights (0..1), beacon, hitch: { lift } }.
 *                               Farm.HITCH = [x, y] of the lower hitch pin; Farm.DRAWBAR = [x, y] of the drawbar eye.
 *   Farm.draw.bedformer / destoner / planter / harvester (ctx, st)  the potato machines, origin at their hitch
 *                               (st = { wheel, time, work (0..1 running), level (hopper 0..1), lift }).
 *   Farm.draw.trailer(ctx, st)  the tipping trailer, origin at its drawbar eye: st = { wheel, load (0..1), crop
 *                               "grain"|"potato", tip (0..1) }.
 *   Farm.draw.combine(ctx, st)  the combine harvester, origin under the front axle: st = { wheel, time, work,
 *                               tank (0..1), auger (0..1 swung out; the page draws the swung tube, see .augerTube),
 *                               face, beacon }. Farm.COMBINE = { cut (x of the cutter bar), pivot: [x, y] }.
 *   Farm.draw.hare / deer / gull / hawk (ctx, x, y, s, phase, flip)   the farm's life, in screen px.
 *   Farm.rear.bedformer / destoner / planter / harvester / trailer (ctx, st)   the potato machines seen from behind
 *                               (a close-up looking along the rows), origin on the ground in the middle, metres,
 *                               row crests at x = +-0.5: st = { time, run (belt phase), work, level, load, face }.
 *                               Farm.rear.crossBelt(ctx, x0, y0, x1, y1, run) the destoner's stone conveyor,
 *                               Farm.rear.hood(ctx, c, h, thick) a steel row hood.
 *   Farm.inUnits(ctx, x, y, s, lwPx, fn)  draw fn() in metres at screen (x, y), s px per metre, lwPx outlines.
 *   Farm.shape                  the drawing helpers (P, R, C, Ln, tube, fs, rr) for pages drawing in units.
 *   Farm.MACHINES               { id: { name, len (m behind the hitch), work (m behind the hitch where it works),
 *                               trailed } } for the potato machines.
 *   Farm.draw.boom(..., kind) kind "belt" (potatoes riding), "belt-empty" (stopped belt), else the green auger.
 *   Farm.Particles()            world-space particles: add({ x, h, r, vx, vh, life, size, col, kind }), update(dt),
 *                               draw(ctx, scene), clear(), count().
 *   Farm.pic(id)                the step/tile picture of a machine ("bedformer", "destoner", "planter", "harvester",
 *                               "combine", "trailer", "grow", "wheat", "potato") as an <img> string.
 *   Farm.sound                  soft Web Audio through Toybox.sound.ready(): engine(level 0..1 | -1 off),
 *                               soil(level), pour(level), horn(), clunk(), tick(), pop(), chime(), stop().
 *   Farm.restArt()              the rest screen picture.
 *   Farm.u                      small helpers (clamp, lerp, ease, hash, mix, INK).
 */
(function () {
  "use strict";
  var INK = "#1D2340", TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hash(i, j) { var s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
  function hex(c) {
    if (c.charAt(0) === "r") { var m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]]; }
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    var x = hex(a), y = hex(b); t = clamp(t, 0, 1);
    return "rgb(" + Math.round(lerp(x[0], y[0], t)) + "," + Math.round(lerp(x[1], y[1], t)) + "," + Math.round(lerp(x[2], y[2], t)) + ")";
  }
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  var NAMES = { spuds: "Spuds in Mud", combine: "Combine Time", bales: "Brilliant Baler", silage: "Glorious Grass" };

  // =====================================================================================================
  // World: the shared farm (farm-world-v1)
  // =====================================================================================================
  var WKEY = "farm-world-v1";
  var SPUDS = ["soil", "beds", "destoned", "planted", "grown", "harvested"];
  function readWorld() {
    var w = null;
    try { w = JSON.parse(localStorage.getItem(WKEY) || "null"); } catch (e) { w = null; }
    if (!w || typeof w !== "object" || Array.isArray(w)) w = {};
    w.v = 1;
    if (w.wheat !== "golden" && w.wheat !== "stubble") {
      // Older saves kept the wheat field as lanes with a summary stage.
      w.wheat = (w.field && w.field.stage === "golden") || !w.field ? "golden" : "stubble";
    }
    if (SPUDS.indexOf(w.spuds) < 0) w.spuds = "soil";
    ["grain", "potatoes"].forEach(function (k) { if (typeof w[k] !== "number" || !isFinite(w[k]) || w[k] < 0) w[k] = 0; });
    if (typeof w.season !== "string") w.season = "summer";
    return w;
  }
  function writeWorld(w) { try { localStorage.setItem(WKEY, JSON.stringify(w)); } catch (e) { /* ignore */ } }
  var world = {
    KEY: WKEY,
    get: readWorld,
    update: function (fn) { var w = readWorld(); try { fn(w); } catch (e) { setTimeout(function () { throw e; }); } writeWorld(w); return w; }
  };

  // =====================================================================================================
  // Sound (soft, synthesized, only when sound is on)
  // =====================================================================================================
  var snd = { ac: null, out: null, eng: null, soil: null, pour: null, noise: null };
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
  function stopAll() { stopNode(snd.eng); stopNode(snd.soil); stopNode(snd.pour); snd.eng = snd.soil = snd.pour = null; snd.ac = null; }
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
    e.g.gain.setTargetAtTime(0.04 + level * 0.02, t, 0.15);
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
    pour: function (l) { noiseLoop("pour", "bandpass", 1800, l, 0.03); },
    horn: function () { tone(392, 0.22, 0.035, "square", null, 0, 900); tone(330, 0.3, 0.035, "square", null, 0.24, 900); },
    clunk: function () { tone(120, 0.18, 0.06, "triangle", 70); tone(900, 0.06, 0.02, "square", 600, 0.02, 2000); },
    tick: function () { tone(1800 + Math.random() * 600, 0.04, 0.012, "sine"); },
    pop: function () { tone(380, 0.12, 0.04, "sine", 620); },
    chime: function () { tone(523, 0.4, 0.035); tone(659, 0.45, 0.035, "sine", null, 0.12); tone(784, 0.6, 0.035, "sine", null, 0.24); },
    stop: stopAll
  };
  window.addEventListener("pagehide", function () { stopAll(); });

  // =====================================================================================================
  // Drawing helpers in machine units (metres; y up is negative). LW = outline width in units.
  // =====================================================================================================
  var LW = 0.05;
  function fs(ctx, fill, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw !== 0) { ctx.lineWidth = lw || LW; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke(); }
  }
  function P(ctx, pts, fill, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath(); fs(ctx, fill, lw);
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function R(ctx, x, y, w, h, r, fill, lw) { rr(ctx, x, y, w, h, r || 0.0001); fs(ctx, fill, lw); }
  function C(ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.001, r), 0, TAU); fs(ctx, fill, lw); }
  function Ln(ctx, x1, y1, x2, y2, col, w) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.stroke(); }
  function tube(ctx, x1, y1, x2, y2, w, col) { Ln(ctx, x1, y1, x2, y2, INK, w + LW * 2); Ln(ctx, x1, y1, x2, y2, col, w); }
  // A shine stripe: a light translucent line along a panel's top.
  function shine(ctx, x1, y1, x2, y2, w) { Ln(ctx, x1, y1, x2, y2, "rgba(255,255,255,0.45)", w); }

  // A big tyre with tread lugs that turn, a grey rim and a hub. rot = angle (rad).
  function wheel(ctx, cx, cy, r, rot, o) {
    o = o || {};
    var n = o.lugs || Math.round(r * 22), i, a;
    ctx.save(); ctx.translate(cx, cy);
    // lugs (the tread blocks standing out of the tyre)
    if (!o.smooth) {
      for (i = 0; i < n; i++) {
        a = rot + i * TAU / n;
        var c = Math.cos(a), s = Math.sin(a), c2 = Math.cos(a + 0.12), s2 = Math.sin(a + 0.12);
        P(ctx, [c * r * 0.93, s * r * 0.93, c * r * 1.06, s * r * 1.06, c2 * r * 1.06, s2 * r * 1.06, c2 * r * 0.93, s2 * r * 0.93], "#2A2C36", LW * 0.7);
      }
    }
    C(ctx, 0, 0, r * (o.smooth ? 1 : 0.97), "#33363F", LW);
    C(ctx, 0, 0, r * 0.8, "#40434E", 0);
    // the rim, the hub and its bolts (they turn too)
    var rimR = r * (o.rim || 0.6);
    C(ctx, 0, 0, rimR, o.rimCol || "#C3CCD6", LW);
    C(ctx, 0, 0, rimR * 0.78, o.rimIn || "#A9B4C1", LW * 0.6);
    C(ctx, 0, 0, rimR * 0.36, "#8C97A6", LW * 0.7);
    for (i = 0; i < 6; i++) { a = rot + i * TAU / 6; C(ctx, Math.cos(a) * rimR * 0.55, Math.sin(a) * rimR * 0.55, rimR * 0.07, "#6E7887", 0); }
    // a soft highlight on the tyre
    ctx.beginPath(); ctx.arc(0, 0, r * 0.88, -2.5, -1.4); ctx.strokeStyle = "rgba(255,255,255,0.13)"; ctx.lineWidth = r * 0.1; ctx.stroke();
    ctx.restore();
  }
  // A cartoon face: two eyes at (x, y) apart dx, a smile below. f = 0..1 (fade), look = [x, y] direction.
  function face(ctx, x, y, r, dx, f, time, look, smileW) {
    if (!f) return;
    ctx.save(); ctx.globalAlpha = clamp(f, 0, 1);
    var blink = Math.sin((time || 0) * 2.1) > 0.985 ? 0.15 : 1, lx = 0, ly = 0;
    if (look) { var d = Math.hypot(look[0], look[1]) || 1; lx = look[0] / d * r * 0.35; ly = look[1] / d * r * 0.35; }
    [0, dx].forEach(function (ox) {
      ctx.save(); ctx.translate(x + ox, y); ctx.scale(1, blink);
      C(ctx, 0, 0, r, "#FFFFFF", LW * 0.8); C(ctx, lx, ly, r * 0.5, INK, 0); C(ctx, lx + r * 0.18, ly - r * 0.2, r * 0.16, "#FFFFFF", 0);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(x + dx / 2, y + r * 1.0, smileW || r * 1.3, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = INK; ctx.lineWidth = LW * 1.3; ctx.lineCap = "round"; ctx.stroke();
    ctx.restore();
  }

  // =====================================================================================================
  // The green tractor (side view, facing +x, origin on the ground under the rear axle)
  // =====================================================================================================
  var G = { body: "#3E9F3A", dark: "#2B7A2A", light: "#6CC65C", frame: "#2B3040", glass: "#BFE7FA", steel: "#C3CCD6", grey: "#7C8696" };
  var HITCH = [-1.05, -0.5], TOPLINK = [-1.0, -1.3], DRAWBAR = [-1.3, -0.5];
  function driver(ctx, x, y, s) {
    // shoulders, head and cap behind the glass
    R(ctx, x - 0.26 * s, y + 0.1 * s, 0.52 * s, 0.5 * s, 0.16 * s, "#3D6FB6", LW * 0.7);
    C(ctx, x, y, 0.17 * s, "#F2C8A0", LW * 0.7);
    P(ctx, [x - 0.18 * s, y - 0.04 * s, x - 0.16 * s, y - 0.2 * s, x + 0.16 * s, y - 0.2 * s, x + 0.3 * s, y - 0.06 * s], "#E8473B", LW * 0.6);
  }
  function tractor(ctx, st) {
    st = st || {};
    var lift = (st.hitch && st.hitch.lift) || 0, t = st.time || 0, rot = (st.wheel || 0);
    var ly = -lift * 0.4;
    // three-point linkage (behind everything)
    if (st.hitch) {
      Ln(ctx, -0.25, -0.7, HITCH[0], HITCH[1] + ly, INK, 0.16 + LW * 2); Ln(ctx, -0.25, -0.7, HITCH[0], HITCH[1] + ly, G.grey, 0.16);
      Ln(ctx, -0.5, -1.55, TOPLINK[0], TOPLINK[1] + ly, INK, 0.12 + LW * 2); Ln(ctx, -0.5, -1.55, TOPLINK[0], TOPLINK[1] + ly, "#E2B33A", 0.12);
      Ln(ctx, -0.3, -1.62, -0.72, -1.3 + ly, INK, 0.11 + LW * 2); Ln(ctx, -0.3, -1.62, -0.72, -1.3 + ly, G.grey, 0.11);
      Ln(ctx, -0.72, -1.3 + ly, -0.72, -0.62 + ly * 0.6, INK, 0.08);
    }
    if (st.drawbar) tube(ctx, -0.2, -0.5, DRAWBAR[0], DRAWBAR[1], 0.14, G.grey);
    // frame / engine block between the wheels
    R(ctx, -0.45, -1.32, 4.15, 0.55, 0.1, "#3A3F4E");
    // front weights
    R(ctx, 3.72, -1.38, 0.46, 0.66, 0.08, "#8B95A5");
    for (var i = 0; i < 3; i++) Ln(ctx, 3.8, -1.25 + i * 0.18, 4.1, -1.25 + i * 0.18, "#5D6675", LW * 0.8);
    // hood
    ctx.beginPath();
    ctx.moveTo(1.0, -2.08); ctx.lineTo(3.4, -2.0); ctx.quadraticCurveTo(3.8, -1.98, 3.82, -1.62); ctx.lineTo(3.84, -1.12); ctx.lineTo(1.0, -1.12); ctx.closePath();
    fs(ctx, G.body);
    P(ctx, [1.0, -1.42, 3.84, -1.42, 3.84, -1.12, 1.0, -1.12], G.dark, LW * 0.8);
    shine(ctx, 1.15, -1.98, 3.3, -1.92, 0.07);
    // side vents
    for (i = 0; i < 4; i++) Ln(ctx, 2.0 + i * 0.22, -1.86, 2.12 + i * 0.22, -1.56, G.dark, 0.06);
    // grille and the headlight
    R(ctx, 3.62, -1.86, 0.24, 0.72, 0.06, G.frame, LW * 0.8);
    for (i = 0; i < 4; i++) Ln(ctx, 3.66, -1.74 + i * 0.16, 3.82, -1.74 + i * 0.16, "#59607A", 0.04);
    var lit = clamp(st.lights || 0, 0, 1);
    if (lit) { ctx.save(); ctx.globalAlpha = 0.5 * lit; C(ctx, 3.95, -1.8, 0.55, "#FFF7C2", 0); ctx.restore(); }
    R(ctx, 3.32, -1.97, 0.34, 0.14, 0.05, lit ? "#FFFDE0" : "#FFE98A", LW * 0.7);
    // cab
    P(ctx, [-0.62, -1.58, -0.56, -3.0, 1.12, -3.0, 1.24, -1.58], G.frame);
    P(ctx, [-0.5, -1.7, -0.46, -2.9, 1.02, -2.9, 1.11, -1.7], G.glass, LW * 0.6);
    if (st.driver !== false) driver(ctx, 0.3, -2.42, 1);
    Ln(ctx, 0.62, -2.05, 0.82, -2.3, INK, 0.05); // steering wheel
    ctx.save(); ctx.globalAlpha = 0.55;
    P(ctx, [-0.3, -2.9, 0.05, -2.9, -0.45, -1.95, -0.48, -2.35], "#FFFFFF", 0);
    P(ctx, [0.5, -2.9, 0.68, -2.9, 0.1, -1.7, -0.08, -1.7], "#FFFFFF", 0);
    ctx.restore();
    Ln(ctx, 0.48, -2.95, 0.5, -1.62, G.frame, 0.07); // door post
    // roof, beacon, mirror
    R(ctx, -0.78, -3.22, 2.08, 0.26, 0.09, G.body);
    shine(ctx, -0.65, -3.16, 1.15, -3.16, 0.05);
    var bc = st.beacon ? (Math.sin(t * 9) > 0 ? "#FFD34D" : "#F08A1C") : "#F2A23A";
    if (st.beacon) { ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * Math.max(0, Math.sin(t * 9)); C(ctx, 0.05, -3.3, 0.35, "#FFD34D", 0); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0.05, -3.22, 0.13, Math.PI, 0); ctx.closePath(); fs(ctx, bc, LW * 0.7);
    Ln(ctx, 1.15, -2.8, 1.45, -2.95, INK, 0.04); R(ctx, 1.4, -3.08, 0.1, 0.26, 0.04, G.frame, LW * 0.5);
    // exhaust stack
    tube(ctx, 1.33, -2.0, 1.33, -3.28, 0.11, "#4E5463");
    R(ctx, 1.25, -3.42, 0.17, 0.16, 0.04, "#3A3F4E", LW * 0.6);
    // steps
    Ln(ctx, 1.0, -1.55, 1.0, -0.95, INK, 0.05); Ln(ctx, 1.22, -1.55, 1.22, -0.95, INK, 0.05);
    Ln(ctx, 1.0, -1.3, 1.22, -1.3, INK, 0.05); Ln(ctx, 1.0, -1.05, 1.22, -1.05, INK, 0.05);
    // wheels
    wheel(ctx, 0, -0.95, 0.95, rot / 0.95, { rim: 0.58 });
    wheel(ctx, 2.7, -0.66, 0.66, rot / 0.66, { rim: 0.58 });
    // fenders
    ctx.beginPath(); ctx.arc(0, -0.95, 1.13, -Math.PI + 0.22, -0.2); ctx.arc(0, -0.95, 1.0, -0.2, -Math.PI + 0.22, true); ctx.closePath(); fs(ctx, G.body);
    ctx.beginPath(); ctx.arc(2.7, -0.66, 0.82, -Math.PI + 0.55, -0.4); ctx.arc(2.7, -0.66, 0.72, -0.4, -Math.PI + 0.55, true); ctx.closePath(); fs(ctx, G.body);
    face(ctx, 2.75, -1.72, 0.13, 0.36, st.face, t, st.look, 0.2);
  }

  // =====================================================================================================
  // Potato machines (origin at the hitch pin / drawbar eye; the ground is at y = +0.5)
  // =====================================================================================================
  var MACHINES = {
    bedformer: { name: "Bed former", len: 3.05, work: 2.6, trailed: false },
    destoner: { name: "Destoner", len: 6.0, work: 2.4, drop: 5.0, trailed: true },
    planter: { name: "Potato planter", len: 3.15, work: 2.6, trailed: false },
    harvester: { name: "Potato harvester", len: 8.3, work: 2.6, trailed: true, pivot: [-7.3, -2.75] }
  };
  function headstock(ctx) {
    P(ctx, [0.06, 0.1, 0.06, -0.86, -0.18, -0.86, -0.46, -0.12, -0.46, 0.1], G.grey);
    C(ctx, 0, 0, 0.07, G.steel, LW * 0.7); C(ctx, 0.04, -0.8, 0.07, G.steel, LW * 0.7);
  }
  function pto(ctx, x2, y2) { tube(ctx, 0.15, -0.42, x2, y2, 0.1, "#F2C230"); }
  function bedformer(ctx, st) {
    var t = st.time || 0, ph = (st.wheel || 0) * 2.2;
    var O = "#F07E22", OD = "#C9600F";
    pto(ctx, -0.35, -0.75);
    headstock(ctx);
    R(ctx, -0.6, -1.08, 0.62, 0.42, 0.06, O);
    // the rotor hood, the tines turning under it
    P(ctx, [-2.15, 0.28, -0.32, 0.28, -0.32, -0.38, -0.6, -0.68, -1.95, -0.68, -2.15, -0.45], O);
    shine(ctx, -0.65, -0.6, -1.9, -0.6, 0.06);
    R(ctx, -2.12, -0.58, 0.36, 0.86, 0.06, OD, LW * 0.8);
    ctx.save(); rr(ctx, -2.1, 0.26, 1.8, 0.28, 0.02); ctx.clip();
    ctx.fillStyle = "#5A3520"; ctx.fillRect(-2.2, 0.2, 2, 0.4);
    for (var i = 0; i < 9; i++) {
      var x = -0.35 - (((i * 0.21) + ph * 0.25) % 1.9 + 1.9) % 1.9;
      Ln(ctx, x, 0.28, x - 0.08, 0.5, G.steel, 0.05); Ln(ctx, x - 0.08, 0.5, x - 0.18, 0.5, G.steel, 0.05);
    }
    ctx.restore();
    // the forming hood that shapes the bed
    ctx.beginPath(); ctx.moveTo(-2.05, -0.42); ctx.quadraticCurveTo(-2.95, -0.4, -3.05, 0.5); ctx.lineTo(-2.12, 0.5); ctx.closePath(); fs(ctx, G.steel);
    shine(ctx, -2.2, -0.3, -2.75, -0.05, 0.05);
    if (st.work) { // a lip of fine soil flowing off the hood
      ctx.beginPath(); ctx.moveTo(-3.05, 0.5); ctx.quadraticCurveTo(-3.2, 0.32 + Math.sin(t * 20) * 0.02, -3.32, 0.5); ctx.closePath(); fs(ctx, "#8E5A36", LW * 0.6);
    }
  }
  function destoner(ctx, st) {
    var ph = (st.wheel || 0) * 1.6, Rd = "#D9443A", RD = "#A92F27";
    tube(ctx, 0, 0, -2.0, -0.4, 0.13, Rd);
    Ln(ctx, -0.5, -0.12, -0.5, 0.42, INK, 0.06);
    pto(ctx, -1.7, -0.6);
    // share (digging blade) at the front
    P(ctx, [-1.9, 0.48, -2.7, 0.22, -2.85, 0.5], G.steel);
    // rear roller and the wheel
    wheel(ctx, -5.55, 0.2, 0.3, ph / 0.3, { smooth: true, rim: 0.7, rimCol: "#9AA5B4" });
    wheel(ctx, -3.95, 0.05, 0.45, ph / 0.45, { rim: 0.55 });
    // body with a window onto the webs
    P(ctx, [-1.95, 0.22, -2.0, -0.55, -4.7, -1.6, -5.9, -1.6, -5.9, -0.68, -4.9, -0.32, -2.3, 0.28], Rd);
    shine(ctx, -2.1, -0.5, -4.65, -1.48, 0.07);
    ctx.save();
    P(ctx, [-2.45, 0.08, -4.55, -0.98, -4.6, -0.62, -2.6, 0.24], "#4A2E1E", LW * 0.7);
    ctx.clip();
    for (var i = 0; i < 16; i++) {
      var f = ((i / 16 + ph * 0.08) % 1 + 1) % 1, x = lerp(-2.5, -4.6, f), y = lerp(0.16, -0.8, f);
      Ln(ctx, x, y - 0.12, x + 0.07, y + 0.14, "#C3CCD6", 0.035);
      if (st.work && hash(i, Math.floor(ph * 0.08 + i / 16)) > 0.55) C(ctx, x + 0.02, y - 0.08, 0.05, hash(i, 3) > 0.5 ? "#9B9EA6" : "#7A4A2C", 0);
    }
    ctx.restore();
    // cross conveyor and the stone chute at the back
    R(ctx, -5.95, -1.86, 1.0, 0.32, 0.06, RD);
    P(ctx, [-5.25, -1.55, -4.85, -1.55, -4.75, -0.95, -5.2, -0.95], "#9AA5B4");
    Ln(ctx, -5.9, -1.95, -5.9, -2.3, INK, 0.05); Ln(ctx, -5.0, -1.95, -5.0, -2.3, INK, 0.05); Ln(ctx, -5.95, -2.3, -4.95, -2.3, INK, 0.05);
  }
  function potatoBlob(ctx, x, y, s, k) {
    ctx.beginPath(); ctx.ellipse(x, y, s * (1 + 0.25 * hash(k, 1)), s * 0.78, hash(k, 2) * 2, 0, TAU); fs(ctx, "#C9935A", LW * 0.5);
    C(ctx, x - s * 0.3, y - s * 0.25, s * 0.18, "#E0B47E", 0);
  }
  function planter(ctx, st) {
    var ph = (st.wheel || 0) * 1.4, B = "#2F7FD1", BD = "#215E9E", lv = st.level === undefined ? 1 : st.level;
    pto(ctx, -0.4, -0.95);
    headstock(ctx);
    wheel(ctx, -0.65, 0.22, 0.28, ph / 0.28, { rim: 0.55 });
    // disc coulter
    C(ctx, -1.25, 0.22, 0.28, G.steel); C(ctx, -1.25, 0.22, 0.06, G.grey, LW * 0.6);
    R(ctx, -2.15, -0.98, 1.95, 0.3, 0.05, BD);
    // the hopper with seed potatoes heaped on top
    if (lv > 0.02) {
      var top = -2.15 - 0.22 * lv;
      for (var i = 0; i < 9; i++) potatoBlob(ctx, -0.5 - i * 0.19, top + 0.1 + 0.07 * Math.sin(i * 1.7), 0.11, i);
    }
    P(ctx, [-0.32, -0.9, -0.28, -2.18, -2.22, -2.18, -2.06, -0.9], B);
    R(ctx, -2.28, -2.26, 2.06, 0.13, 0.05, BD, LW * 0.8);
    shine(ctx, -0.45, -2.0, -2.05, -2.0, 0.06);
    // cup belt housing with cups lifting potatoes
    R(ctx, -2.62, -1.8, 0.44, 2.05, 0.14, "#4C95E0");
    ctx.save(); rr(ctx, -2.54, -1.7, 0.28, 1.85, 0.1); ctx.fillStyle = "#1F3F66"; ctx.fill(); ctx.clip();
    for (i = 0; i < 8; i++) {
      var f = ((i / 8 + ph * 0.12) % 1 + 1) % 1, y = lerp(0.1, -1.7, f);
      R(ctx, -2.52, y - 0.06, 0.24, 0.12, 0.03, "#C3CCD6", 0);
      if (st.work !== 0) C(ctx, -2.4, y - 0.1, 0.07, "#C9935A", 0);
    }
    ctx.restore();
    // ridging body that covers the potatoes
    ctx.beginPath(); ctx.moveTo(-2.15, 0.12); ctx.quadraticCurveTo(-2.9, -0.15, -3.15, 0.5); ctx.lineTo(-2.2, 0.5); ctx.closePath(); fs(ctx, G.steel);
    shine(ctx, -2.3, 0.05, -2.8, 0.05, 0.05);
  }
  function harvester(ctx, st) {
    var ph = (st.wheel || 0) * 1.6, Y = "#F2A51E", YD = "#C27E0D";
    tube(ctx, 0, 0, -2.3, -0.85, 0.14, G.grey);
    Ln(ctx, -0.6, -0.2, -0.6, 0.42, INK, 0.06);
    pto(ctx, -2.0, -0.95);
    P(ctx, [-2.05, 0.46, -2.85, 0.22, -3.0, 0.5], G.steel);
    C(ctx, -2.45, 0.12, 0.3, G.steel); C(ctx, -2.45, 0.12, 0.06, G.grey, LW * 0.6);
    // body
    P(ctx, [-2.35, 0.22, -2.3, -0.5, -2.95, -1.35, -5.0, -2.45, -7.95, -2.45, -8.3, -1.6, -8.1, -0.55, -6.6, -0.18, -3.2, 0.25], Y);
    shine(ctx, -3.1, -1.25, -4.95, -2.32, 0.07);
    shine(ctx, -5.2, -2.36, -7.8, -2.36, 0.07);
    // window onto the main web: soil and potatoes riding up
    ctx.save();
    P(ctx, [-2.75, -0.05, -5.0, -1.75, -5.15, -1.35, -2.95, 0.2], "#4A2E1E", LW * 0.7);
    ctx.clip();
    for (var i = 0; i < 18; i++) {
      var f = ((i / 18 + ph * 0.08) % 1 + 1) % 1, x = lerp(-2.8, -5.15, f), y = lerp(0.12, -1.6, f);
      Ln(ctx, x, y - 0.14, x + 0.08, y + 0.14, "#C3CCD6", 0.035);
      if (st.work && hash(i, Math.floor(ph * 0.08 + i / 18)) > 0.4) C(ctx, x, y - 0.06, 0.07, "#C9935A", LW * 0.4);
    }
    ctx.restore();
    // picking table roof, rails, the big wheel
    R(ctx, -7.95, -2.8, 3.05, 0.35, 0.08, YD);
    Ln(ctx, -7.8, -2.8, -7.8, -3.25, INK, 0.05); Ln(ctx, -5.1, -2.8, -5.1, -3.25, INK, 0.05); Ln(ctx, -7.85, -3.25, -5.05, -3.25, INK, 0.05);
    wheel(ctx, -6.05, -0.25, 0.75, ph / 0.75, { rim: 0.55 });
    ctx.beginPath(); ctx.arc(-6.05, -0.25, 0.92, -Math.PI + 0.3, -0.3); ctx.arc(-6.05, -0.25, 0.82, -0.3, -Math.PI + 0.3, true); ctx.closePath(); fs(ctx, YD);
    // the side elevator, folded flat on top (the page draws it swung out over the trailer)
    if (!st.out) {
      R(ctx, -7.4, -3.05, 4.4, 0.24, 0.06, "#5D6675"); C(ctx, -7.3, -2.93, 0.14, "#5D6675");
    } else {
      C(ctx, MACHINES.harvester.pivot[0], MACHINES.harvester.pivot[1], 0.16, "#5D6675");
    }
  }

  // =====================================================================================================
  // The potato machines seen from behind (for a close-up that looks along the rows). Machine units (metres),
  // origin on the ground in the middle, y up negative. The rows' crests are at x = +-0.5 (1 m apart).
  // st = { time, run (belt/web phase, grows while working), work (0..1), level (hopper 0..1), load (0..1), face }
  // =====================================================================================================
  function tyreBack(ctx, x, yb, w, h, run) {
    R(ctx, x - w / 2, yb - h, w, h, w * 0.45, "#33363F");
    ctx.save(); rr(ctx, x - w / 2, yb - h, w, h, w * 0.45); ctx.clip();
    for (var i = 0; i < 9; i++) { var y = yb - h + (((i / 9) + (run || 0) * 0.35) % 1) * h; Ln(ctx, x - w * 0.42, y, x + w * 0.42, y, "#22242C", LW * 1.4); }
    ctx.restore();
    R(ctx, x - w / 2, yb - h, w, h, w * 0.45, null);
  }
  // A steel hood shaped like a row (an arch over x = c), from y top of the row h (m) above the ground.
  function rowHood(ctx, c, h, thick) {
    ctx.beginPath();
    for (var i = 0; i <= 16; i++) { var f = i / 16, x = c - 0.56 + f * 1.12, y = -(h + 0.06) * Math.pow(Math.sin(f * Math.PI), 0.8); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = INK; ctx.lineWidth = thick + LW * 2; ctx.stroke();
    ctx.strokeStyle = G.steel; ctx.lineWidth = thick; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = thick * 0.3; ctx.stroke();
  }
  function rearBedformer(ctx, st) {
    var O = "#F07E22", OD = "#C9600F", t = st.time || 0, j = st.work ? Math.sin(t * 40) * 0.008 : 0;
    ctx.save(); ctx.translate(0, j);
    tube(ctx, 0, -1.0, 0, -1.75, 0.1, "#F2C230");                                           // PTO shaft
    tube(ctx, -0.32, -0.95, 0, -1.7, 0.08, G.grey); tube(ctx, 0.32, -0.95, 0, -1.7, 0.08, G.grey); // headstock
    R(ctx, -1.2, -1.12, 2.4, 0.66, 0.1, O);
    shine(ctx, -1.05, -1.02, 1.05, -1.02, 0.06);
    R(ctx, -1.2, -0.6, 2.4, 0.14, 0.04, OD, LW * 0.8);
    R(ctx, -1.26, -1.1, 0.14, 1.1, 0.04, OD); R(ctx, 1.12, -1.1, 0.14, 1.1, 0.04, OD);       // side plates
    [-0.5, 0.5].forEach(function (c) {
      Ln(ctx, c - 0.32, -0.46, c - 0.32, -0.3, INK, 0.06); Ln(ctx, c + 0.32, -0.46, c + 0.32, -0.3, INK, 0.06);
      rowHood(ctx, c, st.h === undefined ? 0.38 : st.h, 0.07);
    });
    face(ctx, -0.25, -0.86, 0.11, 0.5, st.face, t, [0, 1], 0.2);
    ctx.restore();
  }
  function rearDestoner(ctx, st) {
    var Rd = "#D9443A", RD = "#A92F27", t = st.time || 0, run = st.run || 0, j = st.work ? Math.sin(t * 34) * 0.01 : 0;
    tyreBack(ctx, -1.28, 0, 0.3, 0.92, run); tyreBack(ctx, 1.28, 0, 0.3, 0.92, run);
    ctx.save(); ctx.translate(0, j);
    R(ctx, -1.02, -1.62, 2.04, 1.2, 0.1, Rd);
    R(ctx, -1.1, -1.74, 2.2, 0.16, 0.06, RD, LW * 0.8);
    shine(ctx, -0.9, -1.5, 0.9, -1.5, 0.06);
    // the web, seen through the back: bars running up, soil crumbs falling through
    ctx.save(); rr(ctx, -0.76, -1.36, 1.52, 0.78, 0.06); ctx.fillStyle = "#3E2618"; ctx.fill(); ctx.clip();
    for (var i = 0; i < 8; i++) { var y = -0.58 - (((i / 8) + run * 0.5) % 1) * 0.78; Ln(ctx, -0.76, y, 0.76, y, "#B9C2CD", 0.04); }
    if (st.work) for (i = 0; i < 10; i++) { var cx = -0.7 + hash(i, 1) * 1.4, cy = -1.36 + (((hash(i, 2) + t * 1.6) % 1)) * 0.8; C(ctx, cx, cy, 0.03, "#8E5A36", 0); }
    ctx.restore();
    R(ctx, -0.76, -1.36, 1.52, 0.78, 0.06, null, LW * 0.8);
    ctx.restore();
    face(ctx, -0.25, -1.48, 0.1, 0.5, st.face, t, [0, 1], 0.18);
  }
  // the destoner's cross conveyor (drawn over the body): from (x0, y0) on the right to (x1, y1) on the left
  function crossBelt(ctx, x0, y0, x1, y1, run) {
    tube(ctx, x0, y0, x1, y1, 0.16, "#4A505E");
    var n = 9;
    for (var i = 0; i < n; i++) { var f = ((i / n) + run * 0.6) % 1; Ln(ctx, lerp(x0, x1, f), lerp(y0, y1, f) - 0.06, lerp(x0, x1, f), lerp(y0, y1, f) + 0.06, "#8D97A6", 0.03); }
    C(ctx, x0, y0, 0.09, "#6E7887"); C(ctx, x1, y1, 0.09, "#6E7887");
  }
  function rearPlanter(ctx, st) {
    var B = "#2F7FD1", BD = "#215E9E", t = st.time || 0, run = st.run || 0, lv = st.level === undefined ? 1 : st.level;
    tyreBack(ctx, -1.15, 0, 0.22, 0.5, run); tyreBack(ctx, 1.15, 0, 0.22, 0.5, run);
    Ln(ctx, -1.15, -0.3, -0.9, -0.95, INK, 0.07); Ln(ctx, 1.15, -0.3, 0.9, -0.95, INK, 0.07);
    // the hopper, heaped with seed potatoes
    if (lv > 0.02) for (var i = 0; i < 11; i++) potatoBlob(ctx, -0.82 + i * 0.165, -1.78 - 0.16 * lv * Math.sin((i + 0.5) / 11 * Math.PI) + 0.04 * hash(i, 3), 0.1, i);
    P(ctx, [-1.02, -1.8, 1.02, -1.8, 0.8, -1.02, -0.8, -1.02], B);
    shine(ctx, -0.9, -1.7, 0.9, -1.7, 0.06);
    R(ctx, -1.08, -1.88, 2.16, 0.12, 0.05, BD, LW * 0.8);
    R(ctx, -1.0, -1.06, 2.0, 0.12, 0.04, BD, LW * 0.8);
    // the cup belts: cups carry one potato each down to the row
    [-0.5, 0.5].forEach(function (c, k) {
      R(ctx, c - 0.16, -1.0, 0.32, 0.82, 0.08, "#4C95E0");
      ctx.save(); rr(ctx, c - 0.09, -0.94, 0.18, 0.7, 0.05); ctx.fillStyle = "#1F3F66"; ctx.fill(); ctx.clip();
      for (var q = 0; q < 4; q++) {
        var y = -0.94 + (((q / 4) + run * 0.5 + k * 0.12) % 1) * 0.78;
        R(ctx, c - 0.08, y + 0.05, 0.16, 0.04, 0.02, "#C3CCD6", 0);
        potatoBlob(ctx, c, y, 0.055, q + k * 4);
      }
      ctx.restore();
      R(ctx, c - 0.09, -0.94, 0.18, 0.7, 0.05, null, LW * 0.7);
      rowHood(ctx, c, 0.34, 0.05);
    });
    face(ctx, -0.25, -1.42, 0.11, 0.5, st.face, t, [0, 1], 0.2);
  }
  function rearHarvester(ctx, st) {
    var Y = "#F2A51E", YD = "#C27E0D", t = st.time || 0, run = st.run || 0, j = st.work ? Math.sin(t * 30) * 0.01 : 0;
    tyreBack(ctx, -1.3, 0, 0.34, 1.1, run); tyreBack(ctx, 1.3, 0, 0.34, 1.1, run);
    ctx.save(); ctx.translate(0, j);
    R(ctx, -1.08, -2.05, 2.16, 1.62, 0.12, Y);
    R(ctx, -1.16, -2.2, 2.32, 0.18, 0.06, YD, LW * 0.8);
    Ln(ctx, -1.0, -2.2, -1.0, -2.5, INK, 0.05); Ln(ctx, 1.0, -2.2, 1.0, -2.5, INK, 0.05); Ln(ctx, -1.05, -2.5, 1.05, -2.5, INK, 0.05);
    shine(ctx, -0.95, -1.92, 0.95, -1.92, 0.06);
    ctx.save(); rr(ctx, -0.8, -1.78, 1.6, 1.14, 0.06); ctx.fillStyle = "#3E2618"; ctx.fill(); ctx.clip();
    for (var i = 0; i < 10; i++) { var y = -0.64 - (((i / 10) + run * 0.5) % 1) * 1.14; Ln(ctx, -0.8, y, 0.8, y, "#B9C2CD", 0.04); }
    if (st.work) for (i = 0; i < 12; i++) C(ctx, -0.74 + hash(i, 1) * 1.48, -1.78 + ((hash(i, 2) + t * 1.4) % 1) * 1.2, 0.03, "#8E5A36", 0);
    ctx.restore();
    R(ctx, -0.8, -1.78, 1.6, 1.14, 0.06, null, LW * 0.8);
    // the share under the front lifts the whole row
    P(ctx, [-0.86, -0.46, 0.86, -0.46, 0.8, -0.3, -0.8, -0.3], YD, LW * 0.8);
    ctx.restore();
    face(ctx, -0.27, -1.96, 0.11, 0.54, st.face, t, [0, 1], 0.2);
  }
  // the tipping trailer from behind: tailgate toward us, the heap of potatoes above the rim
  function rearTrailer(ctx, st) {
    var Rd = "#D8403A", RD = "#A82E28", load = clamp(st.load || 0, 0, 1.2);
    tyreBack(ctx, -1.02, 0, 0.36, 1.0, st.run || 0); tyreBack(ctx, 1.02, 0, 0.36, 1.0, st.run || 0);
    R(ctx, -0.95, -0.78, 1.9, 0.16, 0.04, "#3A3F4E");
    if (load > 0.01) {
      var hh = 0.1 + load * 0.55;
      ctx.beginPath(); ctx.moveTo(-1.15, -1.86);
      for (var i = 0; i <= 12; i++) { var f = i / 12; ctx.lineTo(lerp(-1.15, 1.15, f), -1.86 - hh * Math.pow(Math.sin(f * Math.PI), 0.6) + Math.sin(i * 2.3) * 0.03); }
      ctx.closePath(); fs(ctx, CROP.potato[0], LW * 0.8);
      for (i = 0; i < 13; i++) { var fx = hash(i, 5); potatoBlob(ctx, lerp(-1.0, 1.0, fx), -1.86 - hh * Math.pow(Math.sin(fx * Math.PI), 0.6) * (0.25 + 0.65 * hash(i, 6)), 0.11, i); }
    }
    R(ctx, -1.2, -1.9, 2.4, 1.16, 0.08, Rd);
    R(ctx, -1.26, -1.98, 2.52, 0.14, 0.05, RD, LW * 0.8);
    for (i = 1; i < 4; i++) Ln(ctx, -1.2 + i * 0.6, -1.84, -1.2 + i * 0.6, -0.8, RD, 0.05);
    shine(ctx, -1.05, -1.78, 1.05, -1.78, 0.05);
    R(ctx, -1.08, -0.98, 0.18, 0.1, 0.03, "#FFB648", LW * 0.6); R(ctx, 0.9, -0.98, 0.18, 0.1, 0.03, "#FFB648", LW * 0.6);
    face(ctx, -0.3, -1.42, 0.13, 0.6, st.face, st.time, [0, 1], 0.22);
  }
  // Draw fn() in machine units at screen (x, y) with s px per metre and outlines lw px wide.
  function inUnits(ctx, x, y, s, lwPx, fn) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var keep = LW; LW = lwPx / s;
    try { fn(); } finally { LW = keep; ctx.restore(); }
  }

  // =====================================================================================================
  // Tipping trailer (origin at the drawbar eye, ground at +0.5, facing +x)
  // =====================================================================================================
  var CROP = { grain: ["#EBB93E", "#C99322"], potato: ["#C9935A", "#9E6B39"] };
  function trailer(ctx, st) {
    st = st || {};
    var rot = st.wheel || 0, Rd = "#D8403A", RD = "#A82E28", load = clamp(st.load || 0, 0, 1.2), tip = clamp(st.tip || 0, 0, 1);
    var col = CROP[st.crop || "grain"];
    // drawbar and chassis
    P(ctx, [0.1, 0.05, -1.5, -0.62, -1.5, -0.42, 0.1, 0.12], G.grey);
    Ln(ctx, -0.9, -0.3, -0.9, 0.42, INK, 0.06);
    R(ctx, -7.6, -0.9, 6.2, 0.22, 0.04, "#3A3F4E");
    wheel(ctx, -4.05, -0.12, 0.62, rot / 0.62, { rim: 0.55, rimCol: "#E2E6EB" });
    wheel(ctx, -5.4, -0.12, 0.62, rot / 0.62, { rim: 0.55, rimCol: "#E2E6EB" });
    // the body tips about its rear hinge
    ctx.save();
    ctx.translate(-7.6, -0.9); ctx.rotate(-tip * 0.62); ctx.translate(7.6, 0.9);
    if (tip > 0.02) { // ram
      ctx.save(); ctx.translate(-7.6, -0.9); ctx.rotate(tip * 0.62); ctx.translate(7.6, 0.9);
      tube(ctx, -2.3, -0.85, -2.3 + tip * 0.6, -0.95 - tip * 2.6, 0.12, G.steel); ctx.restore();
    }
    if (load > 0.01) {
      // the heap above the rim (grain smooth, potatoes lumpy)
      var hh = 0.12 + load * 0.55;
      ctx.beginPath(); ctx.moveTo(-7.45, -2.6);
      for (var i = 0; i <= 12; i++) {
        var f = i / 12, x = lerp(-7.45, -1.55, f), y = -2.6 - hh * Math.pow(Math.sin(f * Math.PI), 0.6);
        ctx.lineTo(x, y + (st.crop === "potato" ? Math.sin(i * 2.3) * 0.05 : 0));
      }
      ctx.lineTo(-1.55, -2.6); ctx.closePath(); fs(ctx, col[0], LW * 0.8);
      if (st.crop === "potato") for (i = 0; i < 14; i++) potatoBlob(ctx, lerp(-7.1, -1.9, i / 13), -2.62 - hh * 0.7 * Math.pow(Math.sin((i / 13) * Math.PI), 0.6) + 0.05 * hash(i, 4), 0.13, i);
      else for (i = 0; i < 16; i++) Ln(ctx, lerp(-7.0, -2.0, hash(i, 7)), -2.66 - hh * 0.5 * hash(i, 8), lerp(-7.0, -2.0, hash(i, 7)) + 0.12, -2.68 - hh * 0.5 * hash(i, 8), col[1], 0.04);
    }
    R(ctx, -7.6, -2.62, 6.2, 1.76, 0.08, Rd);
    R(ctx, -7.68, -2.74, 6.36, 0.17, 0.06, RD, LW * 0.8);
    for (i = 1; i < 8; i++) Ln(ctx, -7.6 + i * 0.775, -2.55, -7.6 + i * 0.775, -0.95, RD, 0.07);
    shine(ctx, -7.45, -2.45, -1.75, -2.45, 0.07);
    // tailgate (opens at the top hinge while tipping)
    ctx.save(); ctx.translate(-7.62, -2.66); ctx.rotate(tip * 0.9);
    R(ctx, -0.14, 0, 0.16, 1.72, 0.04, RD, LW * 0.8); ctx.restore();
    ctx.restore();
    // mudguard
    ctx.beginPath(); ctx.arc(-4.72, -0.12, 1.45, -Math.PI + 0.75, -0.75); ctx.lineWidth = 0.12; ctx.strokeStyle = INK; ctx.stroke();
    face(ctx, -2.25, -1.95, 0.16, 0.42, st.face, st.time, st.look, 0.24);
  }

  // =====================================================================================================
  // Combine harvester (origin on the ground under the front axle, facing +x)
  // =====================================================================================================
  var COMBINE = { cut: 4.75, pivot: [-4.05, -3.6], back: -6.35, len: 11.1 };
  function combine(ctx, st) {
    st = st || {};
    var t = st.time || 0, rot = st.wheel || 0, tank = clamp(st.tank || 0, 0, 1), reel = st.reel || 0;
    // rear: straw chopper hood
    P(ctx, [-5.65, -2.45, -6.38, -1.92, -6.38, -1.0, -5.65, -0.95], G.dark);
    R(ctx, -6.3, -1.35, 0.25, 0.32, 0.04, INK, 0);
    // main body
    R(ctx, -5.75, -3.08, 6.65, 2.2, 0.14, G.body);
    R(ctx, -5.75, -1.5, 6.65, 0.62, 0.1, G.dark, LW * 0.8);
    P(ctx, [-5.6, -2.3, 0.75, -2.3, 0.75, -2.12, -5.6, -2.12], G.light, 0);
    shine(ctx, -5.55, -2.95, 0.7, -2.95, 0.08);
    Ln(ctx, -4.25, -2.95, -4.25, -1.55, G.dark, 0.05); Ln(ctx, -2.1, -2.95, -2.1, -1.55, G.dark, 0.05);
    R(ctx, -5.55, -2.9, 1.1, 0.55, 0.06, "#2D3242", LW * 0.7);
    for (var i = 0; i < 4; i++) Ln(ctx, -5.45, -2.8 + i * 0.12, -4.55, -2.8 + i * 0.12, "#59607A", 0.04);
    // grain tank with its see-through window and the heap
    if (tank > 0.82) {
      var hh = (tank - 0.82) / 0.18 * 0.42;
      ctx.beginPath(); ctx.moveTo(-4.3, -4.45); ctx.quadraticCurveTo(-2.2, -4.45 - hh * 2, -0.15, -4.45); ctx.closePath(); fs(ctx, CROP.grain[0], LW * 0.8);
    }
    P(ctx, [-4.05, -3.05, -4.22, -4.18, -0.28, -4.18, -0.48, -3.05], G.body);
    P(ctx, [-4.22, -4.16, -4.38, -4.47, -0.1, -4.47, -0.28, -4.16], G.light, LW * 0.8);
    ctx.save(); rr(ctx, -3.75, -4.02, 3.05, 0.86, 0.08); ctx.fillStyle = "#3E3424"; ctx.fill(); ctx.clip();
    var lv = -3.16 - 0.86 * Math.min(1, tank / 0.82);
    ctx.fillStyle = CROP.grain[0]; ctx.fillRect(-3.8, lv, 3.2, 1);
    ctx.beginPath(); for (var g = 0; g < 10; g++) { ctx.moveTo(-3.75 + g * 0.31, -4.05); ctx.lineTo(-3.75 + g * 0.31, -3.1); }
    ctx.moveTo(-3.8, -3.6); ctx.lineTo(-0.6, -3.6); ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.lineWidth = 0.035; ctx.stroke();
    ctx.restore();
    R(ctx, -3.75, -4.02, 3.05, 0.86, 0.08, null, LW * 0.8);
    // folded unloading auger (lies along the side, spout to the back)
    if (!st.auger) {
      tube(ctx, COMBINE.pivot[0], COMBINE.pivot[1], -6.55, -3.42, 0.24, "#5E9E4F");
      for (i = 1; i < 7; i++) Ln(ctx, lerp(COMBINE.pivot[0], -6.55, i / 7), lerp(COMBINE.pivot[1], -3.42, i / 7) - 0.1, lerp(COMBINE.pivot[0], -6.55, i / 7) + 0.08, lerp(COMBINE.pivot[1], -3.42, i / 7) + 0.1, G.dark, 0.035);
      P(ctx, [-6.62, -3.55, -6.42, -3.55, -6.48, -3.15, -6.66, -3.2], "#5E9E4F", LW * 0.8);
    }
    C(ctx, COMBINE.pivot[0], COMBINE.pivot[1], 0.2, G.dark);
    // platform, cab
    R(ctx, -0.25, -3.08, 2.15, 0.13, 0.04, "#3A3F4E", LW * 0.7);
    P(ctx, [0.0, -2.98, 0.04, -4.04, 1.52, -4.04, 1.78, -2.98], G.frame);
    P(ctx, [0.12, -3.06, 0.15, -3.95, 1.43, -3.95, 1.66, -3.06], G.glass, LW * 0.6);
    driver(ctx, 0.75, -3.5, 1);
    ctx.save(); ctx.globalAlpha = 0.55;
    P(ctx, [0.35, -3.95, 0.62, -3.95, 0.25, -3.1, 0.17, -3.4], "#FFFFFF", 0);
    P(ctx, [1.0, -3.95, 1.15, -3.95, 0.75, -3.06, 0.6, -3.06], "#FFFFFF", 0);
    ctx.restore();
    R(ctx, -0.12, -4.25, 2.0, 0.24, 0.08, "#F2EEE2");
    var bc = st.beacon ? (Math.sin(t * 9) > 0 ? "#FFD34D" : "#F08A1C") : "#F2A23A";
    if (st.beacon) { ctx.save(); ctx.globalAlpha = 0.35 + 0.3 * Math.max(0, Math.sin(t * 9)); C(ctx, 0.6, -4.32, 0.38, "#FFD34D", 0); ctx.restore(); }
    ctx.beginPath(); ctx.arc(0.6, -4.25, 0.13, Math.PI, 0); ctx.closePath(); fs(ctx, bc, LW * 0.7);
    Ln(ctx, 1.75, -3.8, 2.05, -3.95, INK, 0.04); R(ctx, 2.0, -4.1, 0.1, 0.28, 0.04, G.frame, LW * 0.5);
    // ladder
    Ln(ctx, 1.05, -2.95, 1.2, -1.1, INK, 0.05); Ln(ctx, 1.3, -2.95, 1.45, -1.1, INK, 0.05);
    for (i = 0; i < 5; i++) Ln(ctx, 1.07 + i * 0.033, -2.7 + i * 0.38, 1.33 + i * 0.033, -2.7 + i * 0.38, INK, 0.04);
    // feeder house
    P(ctx, [0.85, -2.62, 2.55, -1.62, 2.55, -0.52, 0.85, -1.2], G.dark);
    for (i = 1; i < 4; i++) Ln(ctx, 0.85 + i * 0.42, -2.62 + i * 0.25 + 0.08, 0.85 + i * 0.42, -1.2 + i * 0.17 - 0.08, "#24602A", 0.04);
    // header: back wall, table, auger, reel, the pointed crop divider
    R(ctx, 2.4, -1.6, 0.38, 1.45, 0.05, "#8F9AAA");
    P(ctx, [2.4, -0.34, 4.55, -0.24, 4.78, -0.12, 2.4, -0.1], "#AEB8C5");
    C(ctx, 3.08, -0.55, 0.31, "#C9D1DB");
    ctx.save(); ctx.beginPath(); ctx.arc(3.08, -0.55, 0.3, 0, TAU); ctx.clip();
    for (i = -3; i < 4; i++) { var ox = ((reel * 0.6) % 0.3) + i * 0.3; Ln(ctx, 3.08 + ox - 0.2, -0.85, 3.08 + ox + 0.1, -0.25, "#7C8696", 0.05); }
    ctx.restore();
    // reel: arms turn, each with a yellow bat and tines
    tube(ctx, 2.7, -1.5, 3.88, -1.78, 0.1, "#8F9AAA");
    var rc = [3.88, -1.78], rr0 = 0.74;
    ctx.beginPath(); ctx.arc(rc[0], rc[1], rr0 * 0.55, 0, TAU); ctx.strokeStyle = "#E2B33A"; ctx.lineWidth = 0.06; ctx.stroke();
    for (i = 0; i < 6; i++) {
      var a = reel + i * TAU / 6, bx = rc[0] + Math.cos(a) * rr0, by = rc[1] + Math.sin(a) * rr0;
      Ln(ctx, rc[0], rc[1], bx, by, INK, 0.09); Ln(ctx, rc[0], rc[1], bx, by, "#E2B33A", 0.05);
      Ln(ctx, bx, by, bx + 0.08, by + 0.38, INK, 0.04); Ln(ctx, bx - 0.08, by, bx - 0.02, by + 0.36, INK, 0.04);
      R(ctx, bx - 0.16, by - 0.08, 0.32, 0.16, 0.06, "#FFC93C", LW * 0.7);
    }
    C(ctx, rc[0], rc[1], 0.12, "#8F9AAA");
    ctx.save(); ctx.globalAlpha = 0.85;
    P(ctx, [2.4, -1.05, 3.2, -1.05, 4.85, -0.2, 4.8, -0.06, 2.4, -0.06], "rgba(225,231,238,0.55)", LW * 0.8);
    ctx.restore();
    for (i = 0; i < 4; i++) P(ctx, [4.45 + i * 0.09, -0.12, 4.5 + i * 0.09, -0.02, 4.55 + i * 0.09, -0.12], "#E2E6EB", LW * 0.4);
    // wheels
    wheel(ctx, -3.7, -0.62, 0.62, rot / 0.62, { rim: 0.56 });
    wheel(ctx, 0, -0.95, 0.95, rot / 0.95, { rim: 0.58 });
    ctx.beginPath(); ctx.arc(0, -0.95, 1.12, -Math.PI + 0.25, -0.35); ctx.arc(0, -0.95, 1.0, -0.35, -Math.PI + 0.25, true); ctx.closePath(); fs(ctx, G.body);
    face(ctx, 0.45, -3.55, 0.17, 0.5, st.face, t, st.look, 0.26);
  }

  // A long tube or belt between two screen points (the swung-out auger or elevator), widths w1 -> w2 px.
  function boom(ctx, x1, y1, x2, y2, w1, w2, phase, kind, lw) {
    var dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    var belt = kind === "belt" || kind === "belt-empty", col = belt ? "#5D6675" : "#5E9E4F";
    ctx.beginPath();
    ctx.moveTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2); ctx.lineTo(x2 + nx * w2 / 2, y2 + ny * w2 / 2);
    ctx.lineTo(x2 - nx * w2 / 2, y2 - ny * w2 / 2); ctx.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.stroke();
    var n = Math.max(4, Math.round(d / 14)), i;
    for (i = 0; i < n; i++) {
      var f = ((i + phase) / n) % 1, w = lerp(w1, w2, f), x = x1 + dx * f, y = y1 + dy * f;
      if (belt) {
        ctx.beginPath(); ctx.moveTo(x + nx * w * 0.4, y + ny * w * 0.4); ctx.lineTo(x - nx * w * 0.4, y - ny * w * 0.4);
        ctx.strokeStyle = "#AEB8C5"; ctx.lineWidth = Math.max(1, lw * 0.6); ctx.stroke();
        if (kind === "belt" && (i * 7) % 3 !== 0) { ctx.beginPath(); ctx.ellipse(x - nx * w * 0.55, y - ny * w * 0.55, w * 0.22, w * 0.17, 0, 0, TAU); ctx.fillStyle = "#C9935A"; ctx.fill(); ctx.lineWidth = lw * 0.5; ctx.stroke(); }
      } else {
        ctx.beginPath(); ctx.moveTo(x + nx * w * 0.45 - dx / d * w * 0.2, y + ny * w * 0.45 - dy / d * w * 0.2); ctx.lineTo(x - nx * w * 0.45 + dx / d * w * 0.2, y - ny * w * 0.45 + dy / d * w * 0.2);
        ctx.strokeStyle = "#2B7A2A"; ctx.lineWidth = Math.max(1, lw * 0.6); ctx.stroke();
      }
    }
    ctx.beginPath(); ctx.moveTo(x1 + nx * w1 * 0.3, y1 + ny * w1 * 0.3); ctx.lineTo(x2 + nx * w2 * 0.3, y2 + ny * w2 * 0.3);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = Math.max(1, w2 * 0.12); ctx.stroke();
    // spout
    ctx.beginPath(); ctx.moveTo(x2 - w2 * 0.55, y2 - w2 * 0.2); ctx.lineTo(x2 + w2 * 0.55, y2 - w2 * 0.2); ctx.lineTo(x2 + w2 * 0.35, y2 + w2 * 0.6); ctx.lineTo(x2 - w2 * 0.35, y2 + w2 * 0.6); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
  }

  // =====================================================================================================
  // The farm's life (screen px: x, y on the ground, s = px per metre)
  // =====================================================================================================
  function hare(ctx, x, y, s, ph, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); LW = 2.2 / s;
    var st = Math.sin(ph * TAU);
    P(ctx, [-0.18, -0.08, -0.38, -0.02 + st * 0.05, -0.3, 0.0, -0.08, -0.06], "#8E5F37", LW * 0.8);
    ctx.beginPath(); ctx.ellipse(0, -0.2, 0.3, 0.15, -0.15 + st * 0.12, 0, TAU); fs(ctx, "#B07A4A");
    P(ctx, [0.18, -0.32, 0.22, -0.62, 0.3, -0.62, 0.28, -0.3], "#B07A4A", LW * 0.8);
    P(ctx, [0.24, -0.33, 0.33, -0.6, 0.4, -0.58, 0.32, -0.3], "#B07A4A", LW * 0.8);
    Ln(ctx, 0.25, -0.6, 0.27, -0.55, INK, 0.04);
    C(ctx, 0.28, -0.28, 0.1, "#B07A4A"); C(ctx, 0.31, -0.3, 0.022, INK, 0);
    P(ctx, [0.12, -0.12, 0.28 + st * 0.06, 0.0, 0.2, 0.0, 0.06, -0.08], "#8E5F37", LW * 0.7);
    C(ctx, -0.3, -0.22, 0.06, "#FFFFFF", LW * 0.7);
    ctx.restore();
  }
  function deer(ctx, x, y, s, ph, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); LW = 2.2 / s;
    var st = Math.sin(ph * TAU), ext = 0.5 + 0.5 * st, Bn = "#B8693A";
    function leg(x0, y0, a, l) { Ln(ctx, x0, y0, x0 + Math.sin(a) * l, y0 + Math.cos(a) * l, INK, 0.075); Ln(ctx, x0, y0, x0 + Math.sin(a) * l, y0 + Math.cos(a) * l, Bn, 0.045); }
    leg(-0.42, -0.7, -0.4 - ext * 0.9, 0.6); leg(0.38, -0.72, 0.5 + ext * 0.9, 0.6);
    ctx.beginPath(); ctx.ellipse(0, -0.82, 0.55, 0.22, 0, 0, TAU); fs(ctx, Bn);
    C(ctx, -0.52, -0.84, 0.12, "#FFF6E8", LW * 0.7);
    P(ctx, [0.35, -0.9, 0.55, -1.35, 0.68, -1.3, 0.55, -0.82], Bn, LW * 0.9);
    ctx.beginPath(); ctx.ellipse(0.72, -1.36, 0.17, 0.1, 0.4, 0, TAU); fs(ctx, Bn);
    P(ctx, [0.6, -1.42, 0.55, -1.6, 0.66, -1.45], Bn, LW * 0.7);
    C(ctx, 0.86, -1.3, 0.035, INK, 0); C(ctx, 0.72, -1.4, 0.025, INK, 0);
    leg(-0.35, -0.72, -0.2 - ext * 0.6, 0.6); leg(0.3, -0.74, 0.3 + ext * 0.6, 0.6);
    ctx.restore();
  }
  function gull(ctx, x, y, s, flap, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); LW = 2 / s;
    var w = Math.sin(flap * TAU) * 0.35;
    P(ctx, [-0.05, -0.02, -0.45, -0.25 - w, -0.25, -0.02], "#BFC8D2", LW * 0.8);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.3, 0.1, 0, 0, TAU); fs(ctx, "#FFFFFF");
    C(ctx, 0.27, -0.05, 0.08, "#FFFFFF"); P(ctx, [0.33, -0.06, 0.45, -0.03, 0.33, -0.01], "#F2B233", LW * 0.6);
    C(ctx, 0.29, -0.07, 0.015, INK, 0);
    P(ctx, [0.05, -0.02, -0.3, -0.3 - w * 1.2, -0.1, -0.02], "#D7DEE6", LW * 0.8);
    ctx.restore();
  }
  function hawk(ctx, x, y, s, flap, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); LW = 2 / s;
    var w = Math.sin(flap * TAU) * 0.25;
    P(ctx, [-0.1, 0, -0.65, -0.18 - w, -0.75, -0.05 - w, -0.25, 0.08], "#7A5434", LW * 0.8);
    ctx.beginPath(); ctx.ellipse(0, 0.02, 0.32, 0.11, 0, 0, TAU); fs(ctx, "#9A6B42");
    P(ctx, [-0.3, 0, -0.5, -0.06, -0.5, 0.1], "#7A5434", LW * 0.7);
    C(ctx, 0.3, -0.03, 0.09, "#E8D3B0"); P(ctx, [0.37, -0.05, 0.45, 0.0, 0.36, 0.01], "#F2B233", LW * 0.6);
    C(ctx, 0.32, -0.05, 0.016, INK, 0);
    P(ctx, [0.0, 0, -0.55, -0.25 - w, -0.62, -0.12 - w, -0.15, 0.06], "#9A6B42", LW * 0.8);
    ctx.restore();
  }


  function dog(ctx, x, y, s, ph, flip, sit) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); LW = 2.2 / s;
    var st = Math.sin(ph * TAU), wag = Math.sin(ph * TAU * 3) * 0.25, K = "#2A2D38", Wt = "#FFFFFF";
    function leg(x0, a) { Ln(ctx, x0, -0.22, x0 + Math.sin(a) * 0.24, 0, INK, 0.09); Ln(ctx, x0, -0.22, x0 + Math.sin(a) * 0.24, 0, Wt, 0.05); }
    if (!sit) { leg(-0.22, -0.5 * st); leg(0.2, 0.5 * st); }
    P(ctx, [-0.32, -0.36, -0.55, -0.55 + wag * 0.4, -0.5, -0.6 + wag * 0.4, -0.3, -0.42], K, LW * 0.8);
    ctx.beginPath(); ctx.ellipse(0, sit ? -0.24 : -0.34, 0.36, 0.14, sit ? -0.5 : 0, 0, TAU); fs(ctx, K);
    ctx.beginPath(); ctx.ellipse(0.18, sit ? -0.3 : -0.3, 0.13, 0.1, 0, 0, TAU); fs(ctx, Wt, 0);
    C(ctx, 0.36, sit ? -0.56 : -0.5, 0.13, K);
    P(ctx, [0.42, sit ? -0.58 : -0.52, 0.58, sit ? -0.52 : -0.46, 0.44, sit ? -0.46 : -0.4], Wt, LW * 0.7);
    C(ctx, 0.58, sit ? -0.52 : -0.46, 0.03, INK, 0);
    P(ctx, [0.28, sit ? -0.64 : -0.58, 0.3, sit ? -0.78 : -0.72, 0.38, sit ? -0.66 : -0.6], K, LW * 0.7);
    C(ctx, 0.41, sit ? -0.6 : -0.54, 0.022, "#FFFFFF", 0);
    if (!sit) { leg(-0.28, 0.5 * st); leg(0.26, -0.5 * st); }
    else { leg(0.22, 0.1); leg(-0.12, 1.2); }
    ctx.restore();
  }

  // =====================================================================================================
  // Particles (world space: x, h above the ground, depth r)
  // =====================================================================================================
  function Particles() { this.a = []; }
  Particles.prototype.add = function (p) {
    if (this.a.length > 500) this.a.shift();
    p.t = 0; p.life = p.life || 1; p.vx = p.vx || 0; p.vh = p.vh || 0; p.r = p.r || 1; p.size = p.size || 0.1; p.rot = p.rot || 0;
    this.a.push(p); return p;
  };
  Particles.prototype.update = function (dt) {
    var a = this.a, i, p;
    for (i = a.length - 1; i >= 0; i--) {
      p = a[i]; p.t += dt;
      if (p.t >= p.life) { a.splice(i, 1); continue; }
      if (p.kind === "puff") { p.x += p.vx * dt; p.h += p.vh * dt; p.size += (p.grow || 0.6) * dt; continue; }
      p.vh -= (p.g === undefined ? 11 : p.g) * dt; p.x += p.vx * dt; p.h += p.vh * dt; p.rot += (p.spin || 0) * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vh *= 1 - p.drag * dt * 0.3; }
      if (p.h < (p.floor || 0)) { p.h = p.floor || 0; p.vh = p.bounce ? -p.vh * p.bounce : 0; p.vx *= 0.4; p.spin = 0; if (!p.bounce && p.t < p.life - 0.6) p.t = p.life - 0.6; p.bounce = 0; }
    }
  };
  Particles.prototype.draw = function (ctx, sc, filter) {
    var a = this.a, i, p, lw = Math.max(1, sc.k * 0.035);
    for (i = 0; i < a.length; i++) {
      p = a[i];
      if (filter && !filter(p)) continue;
      var S = sc.S(p.r), x = sc.X(p.x, p.r), y = sc.Y(p.r) - p.h * S, z = Math.max(0.8, p.size * S), f = p.t / p.life;
      if (x < -40 || x > sc.W + 40) continue;
      ctx.globalAlpha = p.kind === "puff" ? (p.alpha || 0.5) * (1 - f) : (f > 0.8 ? (1 - f) / 0.2 : 1);
      if (p.kind === "puff") { ctx.beginPath(); ctx.arc(x, y, z, 0, TAU); ctx.fillStyle = p.col; ctx.fill(); }
      else if (p.kind === "straw") { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-z, -z * 0.18, z * 2, z * 0.36); ctx.restore(); }
      else if (p.kind === "chunk") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(-z, -z * 0.6); ctx.lineTo(z * 0.8, -z * 0.8); ctx.lineTo(z, z * 0.5); ctx.lineTo(-z * 0.6, z * 0.7); ctx.closePath();
        ctx.fillStyle = p.col; ctx.fill(); if (z > 2.5) { ctx.lineWidth = lw * 0.7; ctx.strokeStyle = INK; ctx.stroke(); } ctx.restore();
      } else {
        ctx.beginPath(); if (p.kind === "potato" || p.kind === "stone") ctx.ellipse(x, y, z * 1.2, z * 0.9, p.rot, 0, TAU); else ctx.arc(x, y, z, 0, TAU);
        ctx.fillStyle = p.col; ctx.fill(); if (z > 2.5 && p.kind !== "dot") { ctx.lineWidth = lw * 0.7; ctx.strokeStyle = INK; ctx.stroke(); }
      }
    }
    ctx.globalAlpha = 1;
  };
  Particles.prototype.clear = function () { this.a.length = 0; };
  Particles.prototype.count = function () { return this.a.length; };

  // =====================================================================================================
  // The scene: projection, sky, field, verge, store
  // =====================================================================================================
  function Scene(o) {
    o = o || {};
    this.L = o.L || 24; this.span = o.span || 11; this.spanPort = o.spanPort || this.span * 0.82; this.mh = o.mh || 4;
    this.xmin = o.xmin === undefined ? -14 : o.xmin; this.xmax = o.xmax === undefined ? this.L + 14 : o.xmax;
    this.store0 = o.store || null; this.rowDz = o.rowDz || 0.5; this.fit = o.fit || null;
    this.cam = 0; this.TRACK = 0.77; this.rN = 0.88; this.rH = 1 / 0.17;
    this.W = 300; this.H = 300;
  }
  var SP = Scene.prototype;
  SP.layout = function (W, H) {
    this.W = W; this.H = H;
    var port = H > W * 1.05, a = W / H;
    this.port = port;
    var short = !port && H < 460;
    this.k = this.fit ? this.fit(W, H) : Math.min(port ? W * 0.95 / this.spanPort : W * 0.84 / this.span, H * (port ? 0.28 : (short ? 0.37 : 0.32)) / this.mh);
    this.gY = H * (short ? 0.75 : 0.7);
    this.hY = H * lerp(0.31, 0.4, clamp((a - 0.8) / 0.9, 0, 1));
    this.B = this.gY - this.hY;
    this.kf = this.k * 0.1;
    var vw = W / this.k;
    this.camMin = this.xmin + vw / 2; this.camMax = this.xmax - vw / 2;
    if (this.camMin > this.camMax) this.camMin = this.camMax = (this.xmin + this.xmax) / 2;
    this.Wf = W * 1.3 + (this.camMax - this.camMin) * this.kf;
    this.lw = clamp(this.k * 0.055, 1.6, 3.2);
    // rows of the field: from the machine line out to the hedge, and in to the near edge
    var rows = [], r = 1, dr0 = this.rowDz / 10, dr, i = 0, h;
    while (r < this.rH) {
      dr = dr0; var lvl = 0;
      while ((h = this.B * (1 / r - 1 / (r + dr))) < 2.4 && lvl < 8) { dr *= 2; lvl++; }
      var r1 = Math.min(this.rH, r + dr);
      rows.push({ r0: r, r1: r1, rc: (r + r1) / 2, i: i++, fine: lvl === 0 });
      r = r1;
    }
    var near = []; r = 1; i = -1;
    while (r > this.rN + 1e-6) { var r0 = Math.max(this.rN, r - dr0); near.push({ r0: r0, r1: r, rc: (r0 + r) / 2, i: i--, fine: true }); r = r0; }
    var self = this;
    function fin(row) { row.y0 = self.Y(row.r0); row.y1 = self.Y(row.r1); row.yc = self.Y(row.rc); row.s = self.k / row.rc; }
    rows.forEach(fin); near.forEach(fin);
    this.rowsFar = rows.reverse(); this.rowsNear = near.reverse();
  };
  SP.Y = function (r) { return this.hY + this.B / r; };
  SP.S = function (r) { return this.k / r; };
  SP.farX = function (x) { return this.W / 2 + (x - this.L / 2) / this.L * this.Wf - (this.cam - this.L / 2) * this.kf; };
  SP.X = function (x, r) {
    if (r <= 1) return this.W / 2 + (x - this.cam) * this.k / r;
    var n = this.W / 2 + (x - this.cam) * this.k, u = (1 - 1 / r) / (1 - 1 / this.rH);
    return n + (this.farX(x) - n) * u;
  };
  SP.wx = function (px, r) { return this.cam + (px - this.W / 2) * (r || 1) / this.k; };
  SP.follow = function (x, dt, snap) {
    var t = clamp(x, this.camMin, this.camMax);
    this.cam = snap ? t : this.cam + (t - this.cam) * Math.min(1, dt * 2.6);
  };
  SP.put = function (ctx, x, r, dir, fn, sOver) {
    var s = sOver || this.S(r);
    var d = typeof dir === "number" ? dir : 1; if (Math.abs(d) < 0.12) d = d < 0 ? -0.12 : 0.12;
    ctx.save(); ctx.translate(this.X(x, r), this.Y(r)); ctx.scale(s * d, s);
    var keep = LW; LW = this.lw / s; fn(); LW = keep;
    ctx.restore();
  };
  // world x range at depth r that is on screen
  SP.xRange = function (r) {
    var b = this.X(0, r), a = this.X(1, r) - b;
    return [(-20 - b) / a, (this.W + 20 - b) / a, a, b];
  };

  // ---------- Sky, hills, the farm on the horizon, the hedge ----------
  function cloud(ctx, x, y, s, col, lw) {
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + 26 * s, y - 16 * s, 24 * s, Math.PI, Math.PI * 1.9);
    ctx.arc(x + 58 * s, y - 8 * s, 20 * s, Math.PI * 1.2, Math.PI * 1.95); ctx.arc(x + 74 * s, y + 2 * s, 20 * s, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
  }
  function tree(ctx, x, y, h, kind, season, lw, seed) {
    var leaf = season === "autumn" ? (seed > 0.5 ? "#E39A3B" : "#D6B046") : (seed > 0.5 ? "#4E9A3C" : "#5DAA45");
    var dark = season === "autumn" ? "#B9722B" : "#3D7F31";
    ctx.lineWidth = lw; ctx.strokeStyle = INK;
    ctx.fillStyle = "#7A5236"; ctx.fillRect(x - h * 0.05, y - h * 0.42, h * 0.1, h * 0.42); ctx.strokeRect(x - h * 0.05, y - h * 0.42, h * 0.1, h * 0.42);
    if (kind === "poplar") {
      ctx.beginPath(); ctx.ellipse(x, y - h * 0.6, h * 0.16, h * 0.45, 0, 0, TAU); ctx.fillStyle = leaf; ctx.fill(); ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.arc(x - h * 0.2, y - h * 0.55, h * 0.24, 0, TAU); ctx.arc(x + h * 0.2, y - h * 0.58, h * 0.26, 0, TAU); ctx.arc(x, y - h * 0.78, h * 0.28, 0, TAU);
    ctx.fillStyle = leaf; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = dark; ctx.fillRect(x - h, y - h * 0.48, h * 2, h * 0.3); ctx.restore();
    ctx.beginPath();
    ctx.arc(x - h * 0.2, y - h * 0.55, h * 0.24, 0.6, 3.6); ctx.moveTo(x + h * 0.46, y - h * 0.58); ctx.arc(x + h * 0.2, y - h * 0.58, h * 0.26, 0, -Math.PI * 0.85, true);
    ctx.moveTo(x + h * 0.28, y - h * 0.78); ctx.arc(x, y - h * 0.78, h * 0.28, 0, -Math.PI, true);
    ctx.stroke();
    if (season === "spring" && seed > 0.3) { for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (hash(i, seed) - 0.5) * h * 0.7, y - h * (0.5 + hash(seed, i) * 0.4), h * 0.035, 0, TAU); ctx.fillStyle = "#FFC7DA"; ctx.fill(); } }
  }
  // the farm on the horizon: barn, house, grain bins, trees
  function farmstead(ctx, x, y, s, lw, season) {
    ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = "round";
    function box(x0, y0, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); }
    tree(ctx, x - 70 * s, y, 46 * s, "oak", season, lw, 0.7);
    // grain bins (round, with cone roofs)
    [[-40, 30], [-18, 34]].forEach(function (b) {
      box(x + b[0] * s, y - b[1] * s, 18 * s, b[1] * s, "#D3DAE2");
      ctx.beginPath(); ctx.moveTo(x + (b[0] - 1) * s, y - b[1] * s); ctx.lineTo(x + (b[0] + 9) * s, y - (b[1] + 9) * s); ctx.lineTo(x + (b[0] + 19) * s, y - b[1] * s); ctx.closePath(); ctx.fillStyle = "#B7C1CC"; ctx.fill(); ctx.stroke();
      for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + b[0] * s, y - b[1] * s * i / 4); ctx.lineTo(x + (b[0] + 18) * s, y - b[1] * s * i / 4); ctx.stroke(); }
    });
    // barn
    ctx.beginPath(); ctx.moveTo(x + 4 * s, y); ctx.lineTo(x + 4 * s, y - 26 * s); ctx.lineTo(x + 12 * s, y - 38 * s); ctx.lineTo(x + 34 * s, y - 38 * s); ctx.lineTo(x + 42 * s, y - 26 * s); ctx.lineTo(x + 42 * s, y); ctx.closePath();
    ctx.fillStyle = "#D2483D"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 4 * s, y - 26 * s); ctx.lineTo(x + 12 * s, y - 38 * s); ctx.lineTo(x + 34 * s, y - 38 * s); ctx.lineTo(x + 42 * s, y - 26 * s); ctx.lineWidth = lw * 2.2; ctx.strokeStyle = "#F4EFE6"; ctx.stroke(); ctx.lineWidth = lw; ctx.strokeStyle = INK;
    box(x + 15 * s, y - 18 * s, 16 * s, 18 * s, "#A8352D");
    ctx.beginPath(); ctx.moveTo(x + 15 * s, y - 18 * s); ctx.lineTo(x + 31 * s, y); ctx.moveTo(x + 31 * s, y - 18 * s); ctx.lineTo(x + 15 * s, y); ctx.strokeStyle = "#F4EFE6"; ctx.stroke(); ctx.strokeStyle = INK;
    // house
    box(x + 50 * s, y - 20 * s, 26 * s, 20 * s, "#FBF4E4");
    ctx.beginPath(); ctx.moveTo(x + 47 * s, y - 20 * s); ctx.lineTo(x + 63 * s, y - 32 * s); ctx.lineTo(x + 79 * s, y - 20 * s); ctx.closePath(); ctx.fillStyle = "#5E6B7A"; ctx.fill(); ctx.stroke();
    box(x + 54 * s, y - 15 * s, 6 * s, 6 * s, "#BFE7FA"); box(x + 66 * s, y - 13 * s, 6 * s, 13 * s, "#8E5F37");
    tree(ctx, x + 92 * s, y, 40 * s, "oak", season, lw, 0.2);
  }
  SP.sky = function (ctx, o) {
    o = o || {};
    var W = this.W, H = this.H, hY = this.hY, t = o.time || 0, lw = Math.max(1.4, this.lw * 0.8), season = o.season || "summer";
    var night = 0, sunX = W * 0.82, sunY = hY * 0.32, days = 3;
    if (o.arc !== null && o.arc !== undefined) {
      var f = (o.arc * days + 0.5) % 1;
      sunX = lerp(-0.08 * W, 1.08 * W, f); sunY = hY + 20 - Math.sin(f * Math.PI) * (hY * 0.85 + 20);
      night = 1 - ease(Math.min(f, 1 - f) / 0.2);
      if (o.arc <= 0.001 || o.arc >= 0.999) night = 0;
    }
    var dusk = Math.max(o.dusk || 0, night * 0.6);
    var g = ctx.createLinearGradient(0, 0, 0, hY);
    g.addColorStop(0, mix(mix("#5DB6EC", "#3B4A8C", dusk), "#16204A", night * 0.85));
    g.addColorStop(1, mix(mix("#D6F1FF", "#F7B98A", dusk), "#2B3A6E", night * 0.8));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hY + 2);
    if (night > 0.2) { ctx.globalAlpha = (night - 0.2) / 0.8; for (var si = 0; si < 30; si++) { ctx.beginPath(); ctx.arc(hash(si, 1) * W, hash(si, 2) * hY * 0.9, 1.4, 0, TAU); ctx.fillStyle = "#FFF6CC"; ctx.fill(); } ctx.globalAlpha = 1; }
    // sun (rays turn slowly)
    var sr = Math.max(14, Math.min(W, H) * 0.045);
    if (sunY < hY + sr) {
      ctx.save(); ctx.translate(sunX, sunY); ctx.rotate(reduceMotion ? 0 : t * 0.15);
      ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = lw * 1.4; ctx.lineCap = "round";
      for (var ri = 0; ri < 10; ri++) { var a = ri * TAU / 10; ctx.beginPath(); ctx.moveTo(Math.cos(a) * sr * 1.35, Math.sin(a) * sr * 1.35); ctx.lineTo(Math.cos(a) * sr * 1.75, Math.sin(a) * sr * 1.75); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.fillStyle = "#FFD84D"; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
      ctx.restore();
    }
    // clouds drift (and slide a little with the camera)
    var cs = Math.max(0.55, Math.min(1.2, W / 900));
    for (var ci = 0; ci < 4; ci++) {
      var span = W + 260 * cs, cx = ((hash(ci, 9) * span + t * (6 + ci * 2) - this.cam * this.k * 0.03) % span + span) % span - 130 * cs;
      cloud(ctx, cx, hY * (0.18 + 0.17 * ci % 0.5) + 14 * cs, cs * (0.7 + 0.3 * hash(ci, 3)), mix("#FFFFFF", "#9AA6C8", night * 0.7), lw);
    }
    // hills (two layers, parallax)
    var self = this;
    function hills(col, amp, base, par, freq, ph) {
      var off = self.cam * self.k * par;
      ctx.beginPath(); ctx.moveTo(-10, hY + 4);
      for (var x = -10; x <= W + 20; x += 16) ctx.lineTo(x, hY - base - amp * (0.5 + 0.5 * Math.sin((x + off) * freq + ph)) * (0.7 + 0.3 * Math.sin((x + off) * freq * 2.7 + ph * 2)));
      ctx.lineTo(W + 20, hY + 4); ctx.closePath();
      ctx.fillStyle = mix(col, "#2B3A55", night * 0.6); ctx.fill(); ctx.lineWidth = lw * 0.8; ctx.strokeStyle = INK; ctx.stroke();
    }
    hills("#A9D293", this.B * 0.2, this.B * 0.05, 0.015, 0.006, 1.3);
    hills("#8BC572", this.B * 0.12, 0, 0.03, 0.009, 4.1);
    // the farm on the horizon
    var fsS = Math.max(0.55, this.B / 140);
    farmstead(ctx, W * 0.62 - this.cam * this.k * 0.035, hY + 2, fsS, lw * 0.8, season);
    // distant fields between the horizon and the hedge (a patchwork, parallax)
    var yH = this.Y(this.rH), pal = ["#9ACD6A", "#B7D978", "#E3C96C", "#8CC261", "#C7DC8B", "#A6D07A"];
    var bands = 3;
    for (var b = 0; b < bands; b++) {
      var y0 = lerp(hY, yH, b / bands), y1 = lerp(hY, yH, (b + 1) / bands), par = 0.02 + b * 0.025, pw = 70 + b * 70;
      var off = this.cam * this.k * par, j0 = Math.floor((off - 20) / pw);
      for (var j = j0; j < j0 + W / pw + 3; j++) {
        var x0 = j * pw - off + hash(j, b) * 20, x1 = (j + 1) * pw - off + hash(j + 1, b) * 20;
        ctx.fillStyle = mix(pal[Math.floor(hash(j, b + 5) * pal.length)], "#2B3A55", night * 0.6); ctx.fillRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
        ctx.fillStyle = "rgba(61,127,49,0.7)"; ctx.fillRect(x0, y0, Math.max(1, lw * 0.7), y1 - y0);
      }
      ctx.fillStyle = "rgba(61,127,49,0.75)"; ctx.fillRect(0, y1 - Math.max(1, lw * 0.6), W, Math.max(1.5, lw * 0.9));
    }
    ctx.lineWidth = lw * 0.8; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(0, hY); ctx.lineTo(W, hY); ctx.stroke();
    // grass below the hedge (the headlands and the verge are this green)
    ctx.fillStyle = mix("#82C257", "#2B3A55", night * 0.5); ctx.fillRect(0, yH, W, H - yH);
    this.night = night;
  };
  // the hedge along the far side of the field, with trees
  SP.hedge = function (ctx, o) {
    var yH = this.Y(this.rH), hh = Math.max(7, this.B * 0.07), lw = Math.max(1.4, this.lw * 0.8), season = (o && o.season) || "summer";
    var rg = this.xRange(this.rH), a = rg[2], b = rg[3], sp = 2.4, i, night = this.night || 0;
    ctx.beginPath(); ctx.moveTo(-10, yH + 2);
    for (i = Math.floor(rg[0] / sp) - 1; i <= Math.ceil(rg[1] / sp) + 1; i++) {
      var x = a * i * sp + b; ctx.lineTo(x, yH - hh * (0.75 + 0.35 * hash(i, 4)));
      ctx.quadraticCurveTo(x + a * sp * 0.5, yH - hh * (1.15 + 0.3 * hash(i, 5)), x + a * sp, yH - hh * (0.75 + 0.35 * hash(i + 1, 4)));
    }
    ctx.lineTo(this.W + 10, yH + 2); ctx.closePath();
    ctx.fillStyle = mix(season === "autumn" ? "#6E8B3A" : "#3F8237", "#1E2B44", night * 0.6); ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
    // trees standing in the hedge
    var ts = 11;
    for (i = Math.floor(rg[0] / ts) - 1; i <= Math.ceil(rg[1] / ts) + 1; i++) {
      if (hash(i, 11) < 0.25) continue;
      var tx = a * (i * ts + hash(i, 12) * 6) + b, th = this.B * (0.22 + 0.12 * hash(i, 13));
      tree(ctx, tx, yH - hh * 0.3, th, hash(i, 14) > 0.8 ? "poplar" : "oak", season, lw, hash(i, 15));
    }
  };

  // ---------- The field ----------
  // A clip region between two world x lines over the whole field depth (screen polygon).
  SP.clipX = function (ctx, xa, xb) {
    var self = this, yT = this.Y(this.rH) - this.B * 0.5, yM = this.gY, yB = this.H + 10, rB = this.B / (yB - this.hY);
    function xAtTop(x) { var x1 = self.X(x, 1), x2 = self.X(x, self.rH), y2 = self.Y(self.rH); return x1 + (x2 - x1) * (yT - yM) / (y2 - yM); }
    ctx.beginPath();
    ctx.moveTo(xAtTop(xa), yT); ctx.lineTo(xAtTop(xb), yT);
    ctx.lineTo(this.X(xb, 1), yM); ctx.lineTo(this.X(xb, rB), yB);
    ctx.lineTo(this.X(xa, rB), yB); ctx.lineTo(this.X(xa, 1), yM);
    ctx.closePath(); ctx.clip();
  };
  SP.field = function (ctx, part, P) {
    var rows = part === "near" ? this.rowsNear : this.rowsFar, painter = PAINT[P.crop] || PAINT.spuds;
    var L = this.L, w = P.wipe, self = this;
    function run(stage, xa, xb) {
      if (xb - xa < 0.01) return;
      ctx.save(); self.clipX(ctx, xa, xb);
      for (var i = 0; i < rows.length; i++) painter(ctx, self, rows[i], stage, P, xa, xb);
      ctx.restore();
    }
    if (!w) run(P.stage, 0, L);
    else if (w.dir > 0) { run(w.to, 0, clamp(w.bx, 0, L)); run(P.stage, clamp(w.bx, 0, L), L); }
    else { run(P.stage, 0, clamp(w.bx, 0, L)); run(w.to, clamp(w.bx, 0, L), L); }
    if (w && w.bx > 0 && w.bx < L && P.edge) {
      ctx.save(); ctx.strokeStyle = P.edge; ctx.lineWidth = Math.max(2, this.lw * 1.2); ctx.lineCap = "round";
      var r0 = part === "near" ? this.rN : 1, r1 = part === "near" ? 1 : this.rH;
      ctx.beginPath(); ctx.moveTo(this.X(w.bx, r0), this.Y(r0)); ctx.lineTo(this.X(w.bx, r1), this.Y(r1)); ctx.stroke(); ctx.restore();
    }
    if (part === "far") {
      // a soft edge line where the field meets the headland grass
      ctx.save(); ctx.strokeStyle = "rgba(61,90,40,0.55)"; ctx.lineWidth = Math.max(1.5, this.lw);
      [0, L].forEach(function (x) { ctx.beginPath(); ctx.moveTo(self.X(x, self.rH), self.Y(self.rH)); ctx.lineTo(self.X(x, 1), self.gY); ctx.lineTo(self.X(x, self.rN), self.Y(self.rN)); ctx.stroke(); });
      ctx.restore();
    }
  };
  // Calls fn(x, sx, j) for world x on a grid of `sp` metres (thinned out when it gets too dense on screen).
  function eachX(sc, row, sp, minPx, xa, xb, fn) {
    var rg = sc.xRange(row.rc), a = rg[2], b = rg[3];
    while (a * sp < minPx) sp *= 2;
    var lo = Math.max(rg[0], xa - sp), hi = Math.min(rg[1], xb + sp);
    for (var j = Math.floor(lo / sp); j <= Math.ceil(hi / sp); j++) {
      var x = (j + hash(j, row.i) * 0.6) * sp;
      fn(x, a * x + b, j);
    }
  }
  function band(ctx, sc, row, col) { ctx.fillStyle = col; ctx.fillRect(0, row.y1 - 0.5, sc.W, row.y0 - row.y1 + 1); }
  var PAINT = {
    spuds: function (ctx, sc, row, stage, P, xa, xb) {
      // Calm, readable stages (the dad: the old dotted texture hid everything). Flat soil is one plain brown;
      // a field of rows is bold stripes, one per row of the scene (rowDz ~ the row spacing): a light crest line,
      // the lit face and a dark furrow, so "behind the tractor there are rows now" reads at a glance.
      var s = row.s, odd = row.i & 1, hgt = row.y0 - row.y1;
      if (stage === "soil" || stage === "harvested") {
        band(ctx, sc, row, stage === "soil" ? (odd ? "#8E5B38" : "#8B5836") : (odd ? "#A2714B" : "#9E6D47"));
        return;
      }
      var fresh = stage === "beds", planted = stage !== "beds" && stage !== "destoned";
      var face = fresh ? "#A36C43" : (planted ? "#9A633D" : "#B57D50"), crest = fresh ? "#C8915F" : (planted ? "#C18A5A" : "#DDA977");
      var furrow = "#4B2B18";
      if (!row.fine || hgt < 3) {
        band(ctx, sc, row, mix(face, furrow, odd ? 0.15 : 0.45));
      } else {
        band(ctx, sc, row, face);
        ctx.fillStyle = furrow; ctx.fillRect(0, row.y0 - hgt * 0.3, sc.W, hgt * 0.3 + 0.5);
        var cw = Math.max(1.2, hgt * 0.17), cy = row.y1 + hgt * 0.14;
        if (fresh) {
          // fresh rows are lumpy on top, with stones and clods showing
          var step = Math.max(6, s * 0.35);
          ctx.beginPath(); ctx.moveTo(-5, cy + cw);
          for (var x = -5; x <= sc.W + step; x += step) ctx.lineTo(x, cy - (hash(Math.floor((x + sc.cam * sc.k / row.rc) / step), row.i) - 0.5) * hgt * 0.22);
          ctx.lineTo(sc.W + step, cy + cw); ctx.closePath(); ctx.fillStyle = crest; ctx.fill();
          if (s * 0.08 > 1.6) {
            eachX(sc, row, 1.5, 22, xa, xb, function (x2, sx, j) {
              var z = s * (0.06 + 0.05 * hash(j, 8)), st = hash(j, 7) > 0.35;
              ctx.beginPath(); ctx.ellipse(sx, row.y1 + hgt * (0.35 + 0.25 * hash(j, 9)), z * 1.3, z, 0, 0, TAU);
              ctx.fillStyle = st ? "#B3B6BD" : "#6F4529"; ctx.fill();
              if (z > 2.5) { ctx.lineWidth = Math.max(1, sc.lw * 0.55); ctx.strokeStyle = INK; ctx.stroke(); }
            });
          }
        } else {
          ctx.fillStyle = crest; ctx.fillRect(0, cy - cw / 2, sc.W, cw);
          if (row.i % 3 === 0 && s * 0.05 > 1.6) {
            // the stones the destoner laid in the furrow
            eachX(sc, row, 0.45, 9, xa, xb, function (x2, sx, j) {
              var z = s * (0.035 + 0.02 * hash(j, 3));
              ctx.beginPath(); ctx.ellipse(sx, row.y0 - hgt * 0.14, z * 1.3, z, 0, 0, TAU); ctx.fillStyle = hash(j, 4) > 0.5 ? "#8E929A" : "#A3A7AE"; ctx.fill();
            });
          }
        }
      }
      if (stage === "grow" || stage === "grown") {
        var g = stage === "grown" ? 1 : clamp(P.g || 0, 0, 1);
        if (g < 0.04) return;
        var sz = g < 0.6 ? lerp(0.08, 0.42, g / 0.6) : lerp(0.42, 0.3, clamp((g - 0.75) / 0.25, 0, 1));
        var die = clamp((g - 0.75) / 0.25, 0, 1);
        var leaf = mix("#4FA83A", "#B89B4B", die), dk = mix("#2F7A25", "#80632F", die);
        var rad = sz * 0.5 * s, by = row.y1 + hgt * 0.2;
        if (rad < 1.6 || !row.fine) { ctx.fillStyle = leaf; ctx.fillRect(0, by - Math.max(1, rad * 1.6), sc.W, Math.max(1, rad * 1.6) + hgt * 0.4); return; }
        var lw = Math.max(1, Math.min(sc.lw * 0.7, rad * 0.15));
        eachX(sc, row, 0.4, rad * 1.7, xa, xb, function (x2, sx, j) {
          var sw = Math.sin((P.time || 0) * 1.5 + x2 * 0.6) * rad * 0.08, rj = rad * (0.88 + 0.24 * hash(j, 6));
          ctx.beginPath();
          ctx.arc(sx - rj * 0.6 + sw, by - rj * 0.6, rj * 0.68, 0, TAU); ctx.arc(sx + rj * 0.6 + sw, by - rj * 0.62, rj * 0.7, 0, TAU); ctx.arc(sx + sw, by - rj * 1.1, rj * 0.76, 0, TAU);
          ctx.fillStyle = leaf; ctx.fill();
          if (rj > 3) { ctx.lineWidth = lw; ctx.strokeStyle = dk; ctx.stroke(); }
          if (g > 0.45 && g < 0.78 && rj > 4 && hash(j, 10) > 0.45) {
            ctx.beginPath(); ctx.arc(sx + sw + (hash(j, 1) - 0.5) * rj, by - rj * 1.55, Math.max(1.5, rj * 0.2), 0, TAU); ctx.fillStyle = "#FFFFFF"; ctx.fill();
            ctx.beginPath(); ctx.arc(sx + sw + (hash(j, 1) - 0.5) * rj, by - rj * 1.55, Math.max(0.8, rj * 0.08), 0, TAU); ctx.fillStyle = "#FFC93C"; ctx.fill();
          }
        });
      }
    },
    wheat: function (ctx, sc, row, stage, P, xa, xb) {
      var s = row.s, odd = row.i & 1, hgt = row.y0 - row.y1, t = P.time || 0;
      if (stage === "stubble") {
        band(ctx, sc, row, odd ? "#D9B56C" : "#CDA85F");
        if (row.fine && s * 0.1 > 2) {
          var hh = s * 0.13;
          ctx.strokeStyle = "#A9833E"; ctx.lineWidth = Math.max(1, s * 0.018); ctx.beginPath();
          eachX(sc, row, 0.12, 4, xa, xb, function (x, sx, j) { var yy = row.y0 - hgt * hash(j, 3) * 0.8; ctx.moveTo(sx, yy); ctx.lineTo(sx + s * 0.01, yy - hh * (0.7 + 0.5 * hash(j, 4))); });
          ctx.stroke();
          ctx.fillStyle = "#F0D58E";
          eachX(sc, row, 0.5, 10, xa, xb, function (x, sx, j) { ctx.save(); ctx.translate(sx, row.yc); ctx.rotate(hash(j, 6) * 3); ctx.fillRect(-s * 0.15, -s * 0.015, s * 0.3, Math.max(1, s * 0.03)); ctx.restore(); });
        }
        return;
      }
      // growing wheat: g 0 bare soil .. 0.6 tall and green .. 1 golden
      var g = stage === "golden" ? 1 : clamp(P.g || 0, 0, 1);
      if (g < 0.12) {
        band(ctx, sc, row, odd ? "#8D5A36" : "#84532F");
        if (g > 0.04 && row.fine) { ctx.fillStyle = "#6DBA45"; eachX(sc, row, 0.15, 4, xa, xb, function (x, sx, j) { ctx.fillRect(sx, row.yc - s * 0.03, Math.max(1, s * 0.02), Math.max(1.5, s * 0.05 * (g - 0.04) / 0.08)); }); }
        return;
      }
      var h = lerp(0.12, 0.95, clamp((g - 0.12) / 0.48, 0, 1)), gold = clamp((g - 0.6) / 0.4, 0, 1);
      var col = mix(mix("#5FAE3E", "#7CBF4A", clamp((g - 0.3) / 0.3, 0, 1)), "#E8B941", gold), dk = mix("#3E8A2E", "#C2902B", gold), lt = mix("#8ED061", "#F7D774", gold);
      band(ctx, sc, row, dk);
      var hp = h * s;
      if (hp < 2) { ctx.fillStyle = col; ctx.fillRect(0, row.y1 - hp, sc.W, hgt * 0.7 + hp); return; }
      var step = Math.max(4, Math.min(10, hp * 0.6)), yc = row.yc, W = sc.W, off = sc.cam * sc.k / row.rc;
      ctx.beginPath(); ctx.moveTo(-5, row.y0 + 0.5);
      for (var x = -5; x <= W + step; x += step) {
        var q = Math.floor((x + off) / step), sw = Math.sin(t * 1.7 + (x + off) * 0.02 + row.i * 0.6) * hp * 0.1;
        ctx.lineTo(x + sw, yc - hp * (0.92 + 0.16 * hash(q, row.i)));
      }
      ctx.lineTo(W + step, row.y0 + 0.5); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = Math.max(1, Math.min(sc.lw * 0.8, hp * 0.06)); ctx.strokeStyle = lt; ctx.stroke();
      // shade at the bottom of the crop, and the ears on the near rows
      ctx.fillStyle = "rgba(90,60,10,0.18)"; ctx.fillRect(0, row.y0 - Math.min(hp * 0.35, hgt * 0.5), W, Math.min(hp * 0.35, hgt * 0.5) + 0.5);
      if (gold > 0.25 && row.fine && s * 0.05 > 1.6) {
        var ear = s * 0.075, lwE = Math.max(0.8, sc.lw * 0.45);
        ctx.lineWidth = lwE;
        eachX(sc, row, 0.13, ear * 2.2, xa, xb, function (x2, sx, j) {
          var sw = Math.sin(t * 1.7 + (sx + off) * 0.02 + row.i * 0.6) * hp * 0.1, top = yc - hp * (0.95 + 0.18 * hash(j, row.i + 9));
          ctx.save(); ctx.translate(sx + sw, top); ctx.rotate(sw / Math.max(1, hp) * 1.2 + (hash(j, 2) - 0.5) * 0.3);
          ctx.beginPath(); ctx.ellipse(0, 0, ear * 0.55, ear * 1.25, 0, 0, TAU); ctx.fillStyle = mix("#9CCB5A", "#F2C84E", gold); ctx.fill();
          ctx.strokeStyle = mix("#5E8E2E", "#B4862A", gold); ctx.stroke();
          if (ear > 3) { ctx.beginPath(); ctx.moveTo(0, -ear * 1.2); ctx.lineTo(-ear * 0.3, -ear * 2.1); ctx.moveTo(0, -ear * 1.2); ctx.lineTo(ear * 0.3, -ear * 2.1); ctx.stroke(); }
          ctx.restore();
        });
      }
    }
  };
  // The farm track and the grass verge in front of the field.
  SP.verge = function (ctx, o) {
    o = o || {};
    var W = this.W, H = this.H, lw = Math.max(1.4, this.lw * 0.8), night = this.night || 0, self = this;
    var yF = this.Y(this.rN), yT0 = this.Y(0.83), yT1 = this.Y(0.715);
    ctx.fillStyle = mix("#7DBD52", "#2B3A55", night * 0.5); ctx.fillRect(0, yF - 0.5, W, H - yF + 1);
    ctx.fillStyle = mix("#C9A26C", "#2B3A55", night * 0.5); ctx.fillRect(0, yT0, W, yT1 - yT0);
    ctx.fillStyle = mix("#B48C58", "#2B3A55", night * 0.5);
    [0.8, 0.735].forEach(function (r) { var y = self.Y(r), h = (yT1 - yT0) * 0.16; ctx.fillRect(0, y - h / 2, W, h); });
    ctx.fillStyle = mix("#8FC764", "#2B3A55", night * 0.5); ctx.fillRect(0, self.Y(0.765) - (yT1 - yT0) * 0.07, W, (yT1 - yT0) * 0.14);
    ctx.lineWidth = lw * 0.8; ctx.strokeStyle = "rgba(29,35,64,0.5)";
    ctx.beginPath(); ctx.moveTo(0, yT0); ctx.lineTo(W, yT0); ctx.moveTo(0, yT1); ctx.lineTo(W, yT1); ctx.stroke();
    // grass tufts and wild flowers in the foreground (parallax: nearer moves faster)
    var rr0 = [0.86, 0.68, 0.6, 0.53];
    rr0.forEach(function (r, li) {
      var y = self.Y(r); if (y > H + 30) return;
      var rg = self.xRange(r), sp = 1.6 + li * 0.4, s = self.S(r);
      for (var j = Math.floor(rg[0] / sp); j <= Math.ceil(rg[1] / sp); j++) {
        if (hash(j, li + 20) < 0.35) continue;
        var x = self.X((j + hash(j, li) * 0.8) * sp, r), hh = s * (0.18 + 0.2 * hash(j, li + 3));
        ctx.strokeStyle = mix("#4E9A3C", "#2B3A55", night * 0.5); ctx.lineWidth = Math.max(1.2, s * 0.025); ctx.beginPath();
        for (var b = -2; b <= 2; b++) { ctx.moveTo(x + b * s * 0.03, y); ctx.quadraticCurveTo(x + b * s * 0.05, y - hh * 0.6, x + b * s * 0.09, y - hh * (1 - Math.abs(b) * 0.15)); }
        ctx.stroke();
        var fl = hash(j, li + 7);
        if (fl > 0.55) {
          var fx = x + s * 0.06, fy = y - hh * 0.95, fr = Math.max(2, s * 0.045);
          ctx.fillStyle = fl > 0.8 ? "#E8473B" : "#FFFFFF";
          for (var pq = 0; pq < 5; pq++) { var a = pq * TAU / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, fr * 0.8, 0, TAU); ctx.fill(); }
          ctx.beginPath(); ctx.arc(fx, fy, fr * 0.7, 0, TAU); ctx.fillStyle = fl > 0.8 ? INK : "#FFC93C"; ctx.fill();
        }
      }
    });
  };
  // The store shed beyond the field's right end: an open-fronted barn with the heap inside, an intake pit in
  // the track beside it and a short elevator up to a hatch in the shed's side. level 0..1 (heap size),
  // o = { x (the shed's middle), kind, run (0..1 elevator running), time }. Sets this.pit = { x, r }.
  SP.store = function (ctx, level, o) {
    var self = this, kind = o.kind || "grain", col = CROP[kind], r = 1.02, x = o.x;
    this.put(ctx, x, r, 1, function () {
      P(ctx, [-4.6, 0, -4.6, -5.0, 0, -7.0, 4.6, -5.0, 4.6, 0], "#86A97C");
      for (var i = -4; i <= 4; i++) Ln(ctx, i, -0.1, i, -5.0 - (4.6 - Math.abs(i)) * 0.43 + 0.3, "#6E9264", 0.06);
      P(ctx, [-5.1, -4.85, 0, -7.25, 5.1, -4.85, 5.1, -4.45, 0, -6.8, -5.1, -4.45], "#5E6B7A");
      R(ctx, -3.6, -4.3, 7.2, 4.3, 0.1, "#3A3326");
      var lv = clamp(level, 0, 1.2), hh = 0.5 + lv * 2.9;
      if (level > 0.001) {
        var h0 = -3.5, h1 = lerp(-0.5, 3.5, clamp(lv, 0, 1));
        ctx.beginPath(); ctx.moveTo(h0, 0);
        for (var j = 0; j <= 16; j++) { var f = j / 16; ctx.lineTo(lerp(h0, h1, f), -hh * Math.pow(Math.sin(f * Math.PI), 0.7) - (kind === "potato" ? Math.sin(j * 2.1) * 0.08 : 0)); }
        ctx.lineTo(h1, 0); ctx.closePath(); fs(ctx, col[0], LW * 0.8);
        if (kind === "potato") for (j = 0; j < 14; j++) potatoBlob(ctx, lerp(h0 + 0.5, h1 - 0.5, hash(j, 1)), -hh * 0.9 * Math.pow(Math.sin(hash(j, 1) * Math.PI), 0.7) * hash(j, 2), 0.16, j);
        else for (j = 0; j < 14; j++) C(ctx, lerp(h0 + 0.5, h1 - 0.5, hash(j, 1)), -hh * 0.9 * Math.pow(Math.sin(hash(j, 1) * Math.PI), 0.7) * hash(j, 2), 0.05, col[1], 0);
      }
      Ln(ctx, -3.6, -4.3, 3.6, -4.3, INK, LW);
      R(ctx, -3.95, -4.45, 0.35, 4.45, 0.04, "#6E7887"); R(ctx, 3.6, -4.45, 0.35, 4.45, 0.04, "#6E7887");
    });
    // intake pit grate in the track, and the elevator up to the hatch
    var pr = this.TRACK, px = x - 2.6, y = this.Y(pr), s = this.S(1);
    var gx0 = this.X(px, pr) - s * 1.2;
    ctx.fillStyle = "#3A3F4E"; ctx.fillRect(gx0, y - s * 0.14, s * 2.4, s * 0.28);
    ctx.strokeStyle = "#8C97A6"; ctx.lineWidth = Math.max(1, this.lw * 0.6); ctx.beginPath();
    for (var g = 0; g < 8; g++) { var gx = gx0 + s * (0.1 + g * 0.31); ctx.moveTo(gx, y - s * 0.12); ctx.lineTo(gx, y + s * 0.12); } ctx.stroke();
    var a = [this.X(px, pr) - s * 1.6, y - s * 0.05], b = [this.X(x - 2.2, r), this.Y(r) - this.S(r) * 3.9];
    boom(ctx, a[0], a[1], b[0], b[1], s * 0.5, this.S(r) * 0.4, (o.time || 0) * (o.run ? 2.2 : 0), kind === "potato" ? "belt" : "auger", this.lw);
    this.pit = { x: px, r: pr };
  };

  // =====================================================================================================
  // Pictures for the step row and tiles (drawn with the same code as the scene)
  // =====================================================================================================
  var picCache = {};
  function pic(id) {
    if (picCache[id]) return picCache[id];
    var c = document.createElement("canvas"), W = 168, H = 120, ctx;
    c.width = W; c.height = H;
    try { ctx = c.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return "";
    var fit = {
      bedformer: [3.4, 2.0, 1.6, 0.5], destoner: [6.4, 2.6, 3.2, 0.5], planter: [3.5, 2.8, 1.7, 0.5],
      harvester: [8.8, 3.6, 4.4, 0.5], combine: [11.6, 5.0, 0.8, 0], trailer: [8.2, 3.6, 3.9, 0.5], graintrailer: [8.2, 3.6, 3.9, 0.5]
    }[id];
    var keep = LW;
    if (fit) {
      var s = Math.min(W * 0.94 / fit[0], H * 0.9 / fit[1]);
      ctx.save(); ctx.translate(W / 2 + fit[2] * s, H * 0.94 - fit[3] * s); ctx.scale(s, s); LW = 3.4 / s;
      var st = { wheel: 0, time: 0, work: 0, level: 1, tank: 0.9, load: 1, crop: id === "graintrailer" ? "grain" : "potato" };
      ({ bedformer: bedformer, destoner: destoner, planter: planter, harvester: harvester, combine: combine, trailer: trailer, graintrailer: trailer })[id](ctx, st);
      ctx.restore();
    } else if (id === "grow") {
      LW = 3.4;
      ctx.save(); ctx.translate(112, 40);
      ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 5; ctx.lineCap = "round";
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40); ctx.stroke(); }
      C(ctx, 0, 0, 22, "#FFD84D"); ctx.restore();
      ctx.save(); ctx.translate(58, 112);
      R(ctx, -50, -14, 100, 18, 9, "#A06A43");
      [[-18, -40, 20], [16, -44, 22], [-1, -64, 24]].forEach(function (b) { C(ctx, b[0], b[1], b[2], "#4FA83A"); });
      ctx.restore();
    } else if (id === "wheat") {
      LW = 3;
      for (var k = 0; k < 5; k++) {
        var x0 = 34 + k * 25; Ln(ctx, x0, 116, x0 + 4, 40, "#C2902B", 4);
        ctx.save(); ctx.translate(x0 + 4, 34); ctx.rotate(0.08); ctx.beginPath(); ctx.ellipse(0, 0, 9, 22, 0, 0, TAU); fs(ctx, "#F2C84E", 3);
        ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(-5, -34); ctx.moveTo(0, -20); ctx.lineTo(5, -34); ctx.stroke(); ctx.restore();
      }
    } else if (id === "potato") {
      LW = 3.4;
      [[52, 76, 30], [104, 70, 34], [80, 46, 26]].forEach(function (p, j) { potatoBlob(ctx, p[0], p[1], p[2], j + 3); });
    }
    LW = keep;
    var url = "";
    try { url = c.toDataURL("image/png"); } catch (e) { url = ""; }
    picCache[id] = url ? '<img alt="" src="' + url + '" style="width:100%;height:100%;object-fit:contain;display:block">' : "";
    return picCache[id];
  }

  // =====================================================================================================
  // Rest picture: the farm at dusk, the combine and the tractor parked
  // =====================================================================================================
  function restArt() {
    var c = document.createElement("canvas"), W = 400, H = 300, ctx;
    c.width = W * 2; c.height = H * 2;
    try { ctx = c.getContext("2d"); } catch (e) { ctx = null; }
    if (!ctx) return "";
    ctx.scale(2, 2);
    var sc = new Scene({ L: 24, span: 14, mh: 4.4 });
    sc.layout(W, H); sc.cam = 12;
    sc.sky(ctx, { time: 0, dusk: 1, season: "summer" });
    ctx.fillStyle = "rgba(20,24,60,0.35)"; ctx.fillRect(0, 0, W, H);
    C(ctx, 330, 50, 18, "#FFF4CC", 3);
    sc.hedge(ctx, {}); sc.field(ctx, "far", { crop: "wheat", stage: "stubble" });
    sc.verge(ctx, {});
    sc.put(ctx, 6, 1, 1, function () { combine(ctx, { tank: 0.3 }); });
    sc.put(ctx, 16, 1, -1, function () { tractor(ctx, { driver: false }); });
    ctx.fillStyle = "rgba(20,24,60,0.3)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFFFFF"; ctx.font = "800 26px 'Baloo 2', sans-serif"; ctx.fillText("z", 150, 120); ctx.font = "800 18px 'Baloo 2', sans-serif"; ctx.fillText("z", 170, 104);
    var url = "";
    try { url = c.toDataURL("image/png"); } catch (e) { return ""; }
    return '<img class="rest-art" alt="" src="' + url + '">';
  }

  window.Farm = {
    NAMES: NAMES,
    SPUDS: SPUDS,
    world: world,
    sound: sound,
    Scene: Scene,
    Particles: Particles,
    MACHINES: MACHINES,
    HITCH: HITCH,
    DRAWBAR: DRAWBAR,
    COMBINE: COMBINE,
    CROP: CROP,
    draw: { tractor: tractor, bedformer: bedformer, destoner: destoner, planter: planter, harvester: harvester, trailer: trailer, combine: combine,
      boom: boom, dog: dog, hare: hare, deer: deer, gull: gull, hawk: hawk, tree: tree, farmstead: farmstead, potato: potatoBlob },
    rear: { bedformer: rearBedformer, destoner: rearDestoner, planter: rearPlanter, harvester: rearHarvester, trailer: rearTrailer, crossBelt: crossBelt, hood: rowHood },
    inUnits: inUnits,
    shape: { P: P, R: R, C: C, Ln: Ln, tube: tube, fs: fs, rr: rr },
    pic: pic,
    restArt: restArt,
    get LW() { return LW; },
    u: { clamp: clamp, lerp: lerp, ease: ease, hash: hash, mix: mix, INK: INK, reduceMotion: reduceMotion }
  };
})();
