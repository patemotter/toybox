(function () {
  "use strict";
  // Mighty Mushrooms: where button mushrooms come from, the way the episode shows it. Four steps he does himself,
  // each tap on a machine part plays that one control's motion (the vehicles also drive with a drag):
  //   Straw:   the crane lorry's rotating grab lifts straw from the pile into its high-sided bin (three grabs);
  //            he drives the lorry to the compost yard and tips the straw out.
  //   Compost: the loading shovel mixes the chicken manure into the straw, the water pipe wets it, the loading
  //            shovel puts it in the concrete bunker; he shuts the bunker door, the compost gets hot and steams
  //            inside; he opens the door: the compost is dark.
  //   Racks:   in the growing house (indoors) the elevator lifts the compost onto the three shelves of the rack,
  //            one shelf per tap of its switch; the peat bag empties and the elevator covers the shelves with peat.
  //   Grow:    the climate control makes the room warm and damp: pinheads come up and grow into white mushrooms;
  //            the picker on the picking platform picks each one he taps into a punnet (the platform goes up and
  //            down the shelves). Four mushrooms fill a punnet: "Punnets" counts them.
  // No step row and one view, like Timberrrrr!: the coach line and a yellow ring on the scene point at the next
  // thing to touch; at the end a tap on the scene starts again.
  //
  // Sections (search for the titles):
  //   State | The world | Small drawing helpers | Straw, compost and mushrooms | The machines | The buildings |
  //   Machine and scene state | The stage | Coach, counter, name tags | The steps | The flow |
  //   Straw: the crane lorry | Compost: the loading shovel and the bunker | Racks: the elevator |
  //   Grow and pick | Surprise | Particles | Input | Update | Drawing | Loop | Start
  var $ = function (id) { return document.getElementById(id); };
  var U = Farm.u, clamp = U.clamp, lerp = U.lerp, ease = U.ease, hash = U.hash, mix = U.mix, INK = U.INK;
  var D = Farm.draw, SH = Farm.shape, snd = Farm.sound, TAU = Math.PI * 2, PI = Math.PI;
  var Pp = SH.P, Rr = SH.R, Cc = SH.C, Ln = SH.Ln, tube = SH.tube, fs = SH.fs;
  var NAME = (Farm.NAMES && Farm.NAMES.mushrooms) || "Mighty Mushrooms";
  document.title = NAME; $("title").textContent = NAME;
  function seg(t, a, b) { return ease(clamp((t - a) / (b - a), 0, 1)); }
  var Y1 = "#F2B33A", YD = "#C98A1A", CAB = "#3A7FC4", CABD = "#2A5F96", BINC = "#3E8E4A", BIND = "#2E6E38";
  var CR = "#E5612F", CRD = "#B54520";
  var STRAW = "#E6C25A", STRAWD = "#C99A35", MANURE = "#7A5A3A", MIXC = "#B48A48", WETC = "#8E6A3A", DARKC = "#4E3424";
  var PEAT = "#3A3430", PEATL = "#5E554C", CAPC = "#F8F4EA", CAPD = "#E2D8C4", PUN = "#3F7FD1", PUND = "#2C5FA6";

  // =====================================================================================================
  // State
  // =====================================================================================================
  var KEY = "farm-mushrooms-v1";
  var startFresh = !!(window.Toybox && Toybox.fresh());
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (startFresh || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  function num(v) { return typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
  var punnets = num(saved.punnets);
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ punnets: punnets })); } catch (e) { /* ignore */ } }

  // =====================================================================================================
  // The world (metres along the machine line)
  // =====================================================================================================
  // Left to right: the stable yard with the straw pile (PILEX) and the crane lorry (front axle at LX0, depth LR);
  // the compost yard: the loading shovel parked at LDX0, the chicken manure (MX), the heap (CX), the water pipe,
  // the bunker shed (BK0..BK1, its door centred at DC, the front wall at depth BKR); the growing house (GH0..GH1,
  // back wall at RB): the hopper (HOP) under the peat bag, the elevator, the rack (RK0..RK1, shelf boards at TB),
  // the picking platform (parked at PPARK, depth PR), the climate control on the back wall (CLX).
  var LR = 0.95, LX0 = 0, PILEX = -8.6, PILEW = 3.2;
  var BIN0 = -6.75, BIN1 = -1.75, BINF = 1.35, BINT = 3.55, LCP = [-1.3, 3.9], LWHEELS = [0, -4.4, -5.6], LWR = 0.55;
  var CX = 50, LXC = CX + 1.0 - BIN0, MX = CX - 3.0, LTIP = 2.85, LDX0 = CX - 4.3 - LTIP, LMID = CX - 2.4 - LTIP;
  var BK0 = CX + 2.6, BKL = 6.2, BK1 = BK0 + BKL, DOOR0 = 0.8, DOORW = 4.0, DOORH = 3.4, DC = BK0 + DOOR0 + DOORW / 2, BKR = 1.08;
  var LPARK2 = BK0 + 0.3 - LTIP, PIPEX = CX + 2.2, PIPER = 1.04;
  var GH0 = CX + 26, HOP = GH0 + 1.5, ELX = GH0 + 3.25, RK0 = GH0 + 3.55, RK1 = RK0 + 3.6, GH1 = RK1 + 2.5, RB = 1.45, WALLH = 5.6;
  var TB = [0.45, 1.35, 2.25, 3.15], DECKH = [0.35, 0.55, 1.45, 2.35], PR = 0.97, PPARK = RK1 + 0.95, CLX = GH1 - 1.0, CLH = 2.75;
  var NT = TB.length, MPT = 3, MPER = 4;

  // =====================================================================================================
  // Small drawing helpers (farm.js style)
  // =====================================================================================================
  function wheel(c, cx, cy, r, rot) {
    var n = Math.round(r * 22), i, a, l0 = Farm.LW;
    c.save(); c.translate(cx, cy);
    for (i = 0; i < n; i++) {
      a = rot + i * TAU / n;
      var co = Math.cos(a), s = Math.sin(a), c2 = Math.cos(a + 0.12), s2 = Math.sin(a + 0.12);
      Pp(c, [co * r * 0.93, s * r * 0.93, co * r * 1.06, s * r * 1.06, c2 * r * 1.06, s2 * r * 1.06, c2 * r * 0.93, s2 * r * 0.93], "#2A2C36", l0 * 0.7);
    }
    Cc(c, 0, 0, r * 0.97, "#33363F", l0);
    Cc(c, 0, 0, r * 0.58, "#C3CCD6", l0);
    Cc(c, 0, 0, r * 0.45, "#A9B4C1", l0 * 0.6);
    Cc(c, 0, 0, r * 0.2, "#8C97A6", l0 * 0.7);
    for (i = 0; i < 6; i++) { a = rot + i * TAU / 6; Cc(c, Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, r * 0.04, "#6E7887", 0); }
    c.restore();
  }
  function driverFig(c, x, y) {
    var l0 = Farm.LW;
    c.save(); c.translate(x, y);
    Rr(c, -0.26, 0.1, 0.52, 0.5, 0.16, "#3D6FB6", l0 * 0.7);
    Cc(c, 0, 0, 0.17, "#F2C8A0", l0 * 0.7);
    Pp(c, [-0.18, -0.04, -0.16, -0.2, 0.16, -0.2, 0.3, -0.06], "#E8473B", l0 * 0.6);
    c.restore();
  }
  function beacon(c, x, y, on, time) {
    var bc = on ? (Math.sin((time || 0) * 9) > 0 ? "#FFD34D" : "#F08A1C") : "#F2A23A";
    if (on) { c.save(); c.globalAlpha = 0.35 + 0.3 * Math.max(0, Math.sin(time * 9)); Cc(c, x, y - 0.08, 0.32, "#FFD34D", 0); c.restore(); }
    c.beginPath(); c.arc(x, y, 0.12, Math.PI, 0); c.closePath(); fs(c, bc, Farm.LW * 0.7);
  }
  // the colour of the compost: straw, mixed with the manure, wet, then dark after the bunker
  function compCol(m, w, k) { return mix(mix(mix(STRAW, MIXC, m), WETC, w), DARKC, k); }

  // =====================================================================================================
  // Straw, compost and mushrooms
  // =====================================================================================================
  // A lumpy mound from x - w/2 to x + w/2, height h, its foot on the ground (units, y up negative).
  function mound(c, x, w, h, col, seed, strands) {
    if (h <= 0.02 || w <= 0.1) return;
    var n = Math.max(6, Math.round(w * 3)), i, xa = x - w / 2;
    c.beginPath(); c.moveTo(xa, 0);
    for (i = 0; i <= n; i++) {
      var f = i / n, b = (i % 2 ? 0.07 : 0) + (hash(i, seed) - 0.5) * 0.08;
      c.lineTo(xa + w * f, -h * Math.pow(Math.sin(f * PI), 0.7) - b * Math.min(1, h * 2));
    }
    c.closePath(); fs(c, col, Farm.LW * 0.8);
    if (strands) {
      c.save(); c.clip();
      for (i = 0; i < Math.round(w * 5); i++) {
        var sx = xa + w * hash(i, seed + 3), sy = -h * (0.15 + 0.75 * hash(i, seed + 4)), a = (hash(i, seed + 5) - 0.5) * 1.6;
        Ln(c, sx, sy, sx + Math.cos(a) * 0.35, sy + Math.sin(a) * 0.35, strands, 0.045);
      }
      c.restore();
    }
  }
  // A button mushroom on a bed, its foot at the origin; g = growth 0 (nothing) .. 1 (a full white cap).
  function mushroom(c, g, wig) {
    if (g <= 0.01) return;
    var l0 = Farm.LW;
    if (g < 0.25) { var p = g / 0.25; Cc(c, 0, -0.04 * p, 0.03 + 0.04 * p, CAPC, l0 * 0.6); return; }
    var s = lerp(0.3, 1, ease((g - 0.25) / 0.75)), r = 0.3 * s, st = 0.15 * s;
    c.save(); c.rotate(Math.sin((wig || 0) * 18) * 0.25 * (wig || 0));
    Rr(c, -0.08 * s, -st - 0.02, 0.16 * s, st + 0.04, 0.03 * s, "#EFE8D8", l0 * 0.7);
    c.beginPath(); c.moveTo(-r, -st); c.bezierCurveTo(-r, -st - r * 1.25, r, -st - r * 1.25, r, -st); c.closePath(); fs(c, CAPC, l0 * 0.8);
    Ln(c, -r * 0.8, -st - r * 0.12, r * 0.8, -st - r * 0.12, CAPD, 0.035 * s);
    Farm.shine(c, -r * 0.45, -st - r * 0.72, -r * 0.05, -st - r * 0.86, 0.05 * s);
    c.restore();
  }
  // a punnet (a blue tray) with n mushrooms in it, its foot at the origin
  function punnet(c, n) {
    var l0 = Farm.LW;
    for (var i = 0; i < n; i++) { c.save(); c.translate(-0.14 + i * 0.095, -0.1); c.scale(0.42, 0.42); mushroom(c, 1); c.restore(); }
    Pp(c, [-0.22, -0.16, 0.22, -0.16, 0.19, 0, -0.19, 0], PUN, l0 * 0.8);
    Ln(c, -0.2, -0.1, 0.2, -0.1, PUND, 0.025);
  }

  // =====================================================================================================
  // The machines
  // =====================================================================================================
  // The crane lorry: a blue cab, the crane's pillar behind it, a high-sided green tipping bin on the back, three
  // axles. Origin on the ground under the front axle, facing +x. st = { wheel, tip (rad), gate (0..1), fill
  // (0..1), beacon, time }. The bin pivots at its rear bottom corner (BIN0, BINF).
  function lorryShape(c, st) {
    var l0 = Farm.LW, rot = (st.wheel || 0) / LWR, i, tip = st.tip || 0, fill = st.fill || 0;
    Rr(c, -6.95, -1.3, 8.45, 0.38, 0.08, "#3A3F4E");
    if (tip > 0.01) {
      var rx = -3.6, ra = [rx - BIN0, -0.2], ca = Math.cos(-tip), sa = Math.sin(-tip);
      var ex = BIN0 + ra[0] * ca - ra[1] * sa, ey = -BINF + ra[0] * sa + ra[1] * ca;
      tube(c, rx, -1.25, ex, ey, 0.16, "#C3CCD6");
      tube(c, rx, -1.25, lerp(rx, ex, 0.5), lerp(-1.25, ey, 0.5), 0.24, "#7C8696");
    }
    c.save(); c.translate(BIN0, -BINF); c.rotate(-tip); c.translate(-BIN0, BINF);
    // the straw heaped up inside shows over the rim
    if (fill > 0.01) {
      var sh = BINT - 0.2 + fill * 0.85;
      c.save(); c.translate((BIN0 + BIN1) / 2, -BINT + 0.6); mound(c, 0, BIN1 - BIN0 - 0.3, sh - BINT + 0.6, STRAW, 7, STRAWD); c.restore();
    }
    Rr(c, BIN0, -BINT, BIN1 - BIN0, BINT - BINF, 0.06, BINC);
    for (i = 1; i < 8; i++) Ln(c, BIN0 + i * 0.625, -BINT + 0.25, BIN0 + i * 0.625, -BINF - 0.1, BIND, 0.06);
    Rr(c, BIN0 - 0.05, -BINT - 0.12, BIN1 - BIN0 + 0.1, 0.16, 0.04, BIND, l0 * 0.8);
    Rr(c, BIN1 - 0.15, -BINT - 0.45, 0.22, BINT - BINF + 0.45, 0.04, BIND, l0 * 0.8);
    Farm.shine(c, BIN0 + 0.2, -BINT + 0.12, BIN1 - 0.3, -BINT + 0.12, 0.06);
    // the tailgate, hinged at the top
    c.save(); c.translate(BIN0, -BINT); c.rotate((st.gate || 0) * 0.95);
    Rr(c, -0.16, 0, 0.18, BINT - BINF, 0.04, BIND, l0 * 0.8);
    c.restore();
    c.restore();
    // the crane pillar behind the cab
    Pp(c, [LCP[0] - 0.32, -1.3, LCP[0] + 0.32, -1.3, LCP[0] + 0.2, -LCP[1] + 0.2, LCP[0] - 0.2, -LCP[1] + 0.2], CR);
    Cc(c, LCP[0], -LCP[1], 0.24, "#7C8696", l0 * 0.8);
    // the cab
    Pp(c, [-0.95, -1.2, -0.95, -3.4, -0.75, -3.6, 1.05, -3.6, 1.45, -2.9, 1.55, -1.2], CAB);
    Pp(c, [-0.6, -2.35, -0.6, -3.32, 0.95, -3.32, 1.25, -2.8, 1.25, -2.35], "#BFE7FA", l0 * 0.6);
    driverFig(c, 0.3, -2.62);
    c.save(); c.globalAlpha = 0.5; Pp(c, [0.55, -3.32, 0.85, -3.32, 0.4, -2.35, 0.2, -2.35], "#FFFFFF", 0); c.restore();
    Ln(c, -0.9, -2.12, 1.48, -2.12, CABD, 0.06);
    Farm.shine(c, -0.6, -3.5, 0.9, -3.5, 0.05);
    Rr(c, 1.3, -2.05, 0.26, 0.82, 0.05, "#3A3F4E", l0 * 0.7);
    Rr(c, 0.85, -1.3, 0.8, 0.3, 0.06, "#3A3F4E");
    Rr(c, 1.36, -1.64, 0.2, 0.22, 0.04, "#FFE98A", l0 * 0.6);
    beacon(c, 0.15, -3.6, st.beacon, st.time);
    c.beginPath(); c.arc(0, -LWR, LWR + 0.18, PI, 0); c.arc(0, -LWR, LWR + 0.06, 0, PI, true); c.closePath(); fs(c, CABD, l0 * 0.8);
    Rr(c, -6.1, -1.42, 2.2, 0.14, 0.05, "#3A3F4E", l0 * 0.7);
    for (i = 0; i < LWHEELS.length; i++) wheel(c, LWHEELS[i], -LWR, LWR, rot);
  }
  // The crane: the boom from the pivot, the stick down to the tip (tx, th). In the frame of the lorry's depth.
  function craneGeo(px, ph, tx, th, L1) {
    var dx = tx - px, dh = th - ph, d = Math.sqrt(dx * dx + dh * dh), sg = dx >= 0 ? 1 : -1;
    var a = lerp(1.05, 0.32, clamp((d - 2) / 6, 0, 1));
    a = Math.max(a, Math.atan2(dh, Math.abs(dx)) + 0.3);
    return { ex: px + sg * Math.cos(a) * L1, eh: ph + Math.sin(a) * L1, sg: sg };
  }
  function craneShape(c, px, ph, tx, th, L1) {
    var g = craneGeo(px, ph, tx, th, L1), l0 = Farm.LW, ex = g.ex, ey = -g.eh;
    tube(c, px + g.sg * 0.2, -ph + 0.55, lerp(px, ex, 0.55), lerp(-ph, ey, 0.55) + 0.05, 0.1, "#C3CCD6");
    tube(c, px, -ph, ex, ey, 0.32, CR);
    Farm.shine(c, lerp(px, ex, 0.15), lerp(-ph, ey, 0.15) - 0.08, lerp(px, ex, 0.85), lerp(-ph, ey, 0.85) - 0.08, 0.05);
    var sx = lerp(ex, tx, 0.55), sy = lerp(ey, -th, 0.55);
    tube(c, sx, sy, tx, -th, 0.16, "#8C97A6");
    tube(c, ex, ey, sx, sy, 0.26, CR);
    Cc(c, ex, ey, 0.16, CRD, l0 * 0.8); Cc(c, px, -ph, 0.16, "#7C8696", l0 * 0.8);
    Cc(c, tx, -th, 0.1, "#5D6675", l0 * 0.7);
  }
  // The rotating grab hanging from the crane's tip (origin), jaws below: the rotator turns it round (rot), the two
  // jaws open (open 0..1) and close on a bite of straw (load).
  function grabShape(c, open, rot, load) {
    var l0 = Farm.LW, o = clamp(open, 0, 1), sp = 0.65 + 0.35 * Math.abs(Math.cos(rot));
    tube(c, 0, 0, 0, 0.3, 0.09, "#5D6675");
    Rr(c, -0.2, 0.26, 0.4, 0.26, 0.08, "#3A3F4E", l0 * 0.8);
    for (var i = 0; i < 3; i++) { var yy = 0.3 + ((rot * 0.4 + i / 3) % 1) * 0.2; Ln(c, -0.18, yy, 0.18, yy, "#6E7887", 0.03); }
    if (load > 0.01) { c.save(); c.translate(0, 1.15); mound(c, 0, 1.0 * sp, 0.55 * load, STRAW, 5, STRAWD); c.restore(); }
    [-1, 1].forEach(function (s) {
      c.save(); c.translate(s * 0.1, 0.52); c.scale(sp, 1); c.rotate(-s * (0.1 + o * 0.65));
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.58, 0.12, s * 0.42, 0.66); c.lineTo(s * 0.06, 0.62); c.closePath();
      fs(c, CR, l0 * 0.8);
      Ln(c, s * 0.12, 0.1, s * 0.3, 0.55, CRD, 0.04);
      c.restore();
    });
  }
  // The loading shovel: a yellow wheel loader, origin on the ground between the axles, facing +x.
  // st = { wheel, lift (0..1), tilt (0 level .. 1 tipped), load (0..1), col, beacon, time }
  function loaderH(lift) { return lerp(0.5, 3.0, clamp(lift, 0, 1)); }
  function loaderShape(c, st) {
    var l0 = Farm.LW, rot = (st.wheel || 0) / 0.62, bh = loaderH(st.lift), tilt = st.tilt || 0;
    Pp(c, [-2.15, -0.95, -2.2, -2.0, -2.0, -2.15, -0.5, -2.15, -0.45, -0.95], Y1);
    for (var i = 0; i < 4; i++) Ln(c, -2.0 + i * 0.16, -1.95, -2.0 + i * 0.16, -1.25, YD, 0.06);
    Farm.shine(c, -1.95, -2.05, -0.65, -2.05, 0.06);
    tube(c, -0.9, -2.15, -0.9, -2.6, 0.1, "#4E5463");
    Rr(c, -2.05, -1.1, 3.4, 0.36, 0.08, "#3A3F4E");
    Pp(c, [-0.62, -1.95, -0.58, -3.12, 0.55, -3.12, 0.7, -1.95], "#2B3040");
    Pp(c, [-0.5, -2.05, -0.47, -3.0, 0.45, -3.0, 0.58, -2.05], "#BFE7FA", l0 * 0.6);
    driverFig(c, 0.0, -2.55);
    Rr(c, -0.75, -3.28, 1.55, 0.18, 0.05, Y1);
    beacon(c, 0.0, -3.28, st.beacon, st.time);
    Pp(c, [0.55, -0.95, 0.55, -2.05, 0.95, -2.05, 1.25, -0.95], Y1);
    wheel(c, -1.25, -0.62, 0.62, rot); wheel(c, 1.05, -0.62, 0.62, rot);
    tube(c, 0.95, -1.25, lerp(0.95, 2.15, 0.6), lerp(-1.25, -bh, 0.6), 0.1, "#C3CCD6");
    tube(c, 0.8, -1.9, 2.15, -bh, 0.24, Y1);
    Cc(c, 0.8, -1.9, 0.12, YD, l0 * 0.7);
    c.save(); c.translate(2.15, -bh); c.rotate(tilt * 1.6);
    if ((st.load || 0) > 0.01) { c.save(); c.translate(0.36, 0.16); mound(c, 0, 0.72, 0.42 * st.load, st.col || MIXC, 3, null); c.restore(); }
    c.beginPath(); c.moveTo(0.72, 0.24); c.lineTo(-0.08, 0.26); c.quadraticCurveTo(-0.24, 0.0, -0.1, -0.52); c.lineTo(0.04, -0.5);
    c.quadraticCurveTo(-0.08, -0.05, 0.02, 0.14); c.lineTo(0.72, 0.13); c.closePath(); fs(c, "#8C97A6", l0 * 0.8);
    Cc(c, 0, 0, 0.08, "#5D6675", l0 * 0.6);
    c.restore();
  }
  // The elevator: a steep belt from the hopper's foot (fx, fh) to its head (hx, hh) at the rack. run = belt
  // phase; col = what rides on it (null: empty)
  function elevatorShape(c, fx, fh, hx, hh, run, col) {
    var l0 = Farm.LW;
    Rr(c, hx - 0.18, -4.1, 0.14, 4.1, 0.03, "#8C97A6", l0 * 0.8);
    Rr(c, hx - 0.06, -4.1, 0.14, 4.1, 0.03, "#A9B4C1", l0 * 0.8);
    Rr(c, hx - 0.55, -0.12, 0.9, 0.12, 0.03, "#5D6675", l0 * 0.7);
    tube(c, fx, -fh, hx, -hh, 0.34, "#5D6675");
    tube(c, fx, -fh - 0.04, hx, -hh - 0.04, 0.2, "#3A3F4E");
    c.save(); c.setLineDash([0.12, 0.22]); c.lineDashOffset = -run * 1.2;
    Ln(c, fx, -fh - 0.12, hx, -hh - 0.12, col || "#8C97A6", col ? 0.16 : 0.06);
    c.restore();
    Cc(c, fx, -fh, 0.16, "#7C8696", l0 * 0.7); Cc(c, hx, -hh, 0.16, "#7C8696", l0 * 0.7);
    Pp(c, [hx, -hh - 0.2, hx + 0.42, -hh - 0.05, hx + 0.42, -hh + 0.12, hx, -hh + 0.12], Y1, l0 * 0.8);
  }
  // the elevator's switch box on its mast: a yellow box with a big green button (lit while it runs)
  function switchBox(c, x, h, on, time) {
    var l0 = Farm.LW;
    Rr(c, x - 0.24, -h - 0.3, 0.48, 0.6, 0.06, Y1, l0);
    Cc(c, x, -h, 0.13, on ? (Math.sin(time * 8) > 0 ? "#7BE07B" : "#3DBA4E") : "#3DBA4E", l0 * 0.8);
  }
  // The picking platform: a scissor lift, origin on the ground under its middle; the deck at height dh. The
  // picker stands on the deck (drawn by the page); full punnets stack in a crate on the deck (stack).
  function platformShape(c, dh, stack, time) {
    var l0 = Farm.LW, lift = Math.max(0, dh - 0.35), n = Math.max(1, Math.round(lift / 0.5)), i;
    Rr(c, -0.85, -0.38, 1.4, 0.26, 0.05, "#E5612F", l0);
    [-0.6, 0.35].forEach(function (x) { Cc(c, x, -0.12, 0.12, "#33363F", l0 * 0.8); });
    if (lift > 0.02) {
      var y0 = -0.38, step = lift / n;
      for (i = 0; i < n; i++) {
        var ya = y0 - step * i, yb = ya - step;
        Ln(c, -0.7, ya, 0.4, yb, INK, 0.12); Ln(c, -0.7, ya, 0.4, yb, "#8C97A6", 0.07);
        Ln(c, 0.4, ya, -0.7, yb, INK, 0.12); Ln(c, 0.4, ya, -0.7, yb, "#A9B4C1", 0.07);
      }
    }
    var dy = -dh;
    Rr(c, -0.85, dy - 0.12, 1.25, 0.14, 0.03, "#5D6675", l0);
    for (i = 0; i < stack; i++) { c.save(); c.translate(-0.62, dy - 0.12 - i * 0.17); punnet(c, MPER); c.restore(); }
    [[-0.82, 0], [0.34, 0]].forEach(function (p) { Ln(c, p[0], dy - 0.1, p[0], dy - 1.05, INK, 0.08); Ln(c, p[0], dy - 0.1, p[0], dy - 1.05, "#F2B33A", 0.045); });
    Ln(c, -0.82, dy - 1.05, 0.34, dy - 1.05, INK, 0.08); Ln(c, -0.82, dy - 1.05, 0.34, dy - 1.05, "#F2B33A", 0.045);
    Ln(c, -0.82, dy - 0.58, 0.34, dy - 0.58, INK, 0.06); Ln(c, -0.82, dy - 0.58, 0.34, dy - 0.58, "#F2B33A", 0.03);
    Rr(c, -1.05, dy - 1.1, 0.3, 0.06, 0.02, "#5D6675", l0 * 0.6);
  }
  // The mushroom picker: white coat, white hairnet, blue gloves. Origin at the feet, facing +x. hand = [x, y] the
  // reaching hand (units, relative), bend 0..1.
  function picker(c, hand, bend) {
    var l0 = Farm.LW, b = bend || 0, hip = [0, -0.85], sh = [0.05 + b * 0.18, -1.38 + b * 0.25], hd = [0.1 + b * 0.28, -1.58 + b * 0.27];
    c.lineCap = "round"; c.lineJoin = "round";
    [[-0.08, "#2B3550"], [0.08, "#34406A"]].forEach(function (q) {
      c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(q[0] + 0.04, -0.45); c.lineTo(q[0], -0.06);
      c.strokeStyle = INK; c.lineWidth = 0.15 + l0 * 2; c.stroke(); c.strokeStyle = q[1]; c.lineWidth = 0.15; c.stroke();
      Pp(c, [q[0] - 0.08, -0.08, q[0] + 0.16, -0.08, q[0] + 0.16, 0, q[0] - 0.08, 0], "#F4F4F4", l0 * 0.7);
    });
    c.beginPath(); c.moveTo(hip[0] - 0.2, hip[1] + 0.25); c.lineTo(sh[0] - 0.18, sh[1]); c.quadraticCurveTo(sh[0], sh[1] - 0.1, sh[0] + 0.18, sh[1]);
    c.lineTo(hip[0] + 0.2, hip[1] + 0.25); c.closePath(); fs(c, "#FBFBF8");
    Ln(c, sh[0] + 0.02, sh[1] + 0.05, hip[0] + 0.02, hip[1] + 0.2, "#D9DDE2", 0.03);
    Cc(c, hd[0], hd[1], 0.13, "#F2C8A0", l0 * 0.8);
    Cc(c, hd[0] + 0.07, hd[1] - 0.01, 0.018, INK, 0);
    c.beginPath(); c.arc(hd[0] + 0.06, hd[1] + 0.03, 0.04, 0.1 * PI, 0.7 * PI); c.strokeStyle = INK; c.lineWidth = l0 * 0.8; c.stroke();
    c.beginPath(); c.ellipse(hd[0] - 0.02, hd[1] - 0.07, 0.16, 0.1, 0, PI, 0); c.closePath(); fs(c, "#FFFFFF", l0 * 0.7);
    var hands = [hand || [sh[0] + 0.25, sh[1] + 0.45], [sh[0] - 0.22, sh[1] + 0.42]];
    hands.forEach(function (h, k) {
      var ex = (sh[0] + h[0]) / 2 - 0.03, ey = (sh[1] + h[1]) / 2 + 0.06;
      c.beginPath(); c.moveTo(sh[0], sh[1] + 0.04); c.lineTo(ex, ey); c.lineTo(h[0], h[1]);
      c.strokeStyle = INK; c.lineWidth = 0.11 + l0 * 2; c.stroke(); c.strokeStyle = k ? "#E6E9EE" : "#FBFBF8"; c.lineWidth = 0.11; c.stroke();
      Cc(c, h[0], h[1], 0.06, "#5B8FE0", l0 * 0.6);
    });
  }

  // =====================================================================================================
  // The buildings
  // =====================================================================================================
  // the stable block behind the straw pile (no horses: they are out)
  function stableBlock(c) {
    var l0 = Farm.LW, i;
    Rr(c, 0, -2.6, 16, 2.6, 0.02, "#B9634A", l0);
    for (i = 1; i < 9; i++) Ln(c, 0.1, -i * 0.29, 15.9, -i * 0.29, "#A55640", 0.03);
    Pp(c, [-0.4, -2.6, 16.4, -2.6, 15.6, -3.9, 0.4, -3.9], "#5E6B7A", l0);
    for (i = 0; i < 6; i++) {
      var x = 0.9 + i * 2.6;
      Rr(c, x, -2.1, 1.2, 2.1, 0.02, "#2E3A33", l0 * 0.8);
      Rr(c, x, -1.15, 1.2, 1.15, 0.02, "#3E7F52", l0 * 0.8);
      Ln(c, x + 0.1, -1.05, x + 1.1, -0.1, "#2F6A42", 0.05);
    }
  }
  // The bunker shed: a concrete building with a roller door in its front wall (local x 0..BKL from BK0, at depth
  // BKR). Inside: the compost (fill, its colour col). door 0 open .. 1 shut. Two vents on the roof.
  function bunkerShape(c, st) {
    var l0 = Farm.LW, i;
    Pp(c, [-0.3, -4.2, BKL + 0.3, -4.2, BKL, -4.75, 0, -4.75], "#6E7470", l0);
    [2.0, 5.6].forEach(function (x) {
      Rr(c, x - 0.2, -5.45, 0.4, 0.75, 0.04, "#8C97A6", l0 * 0.8);
      Rr(c, x - 0.32, -5.6, 0.64, 0.18, 0.04, "#5D6675", l0 * 0.8);
      if (st.hot > 0.05) { c.save(); c.globalAlpha = 0.5 * st.hot; Cc(c, x, -5.55, 0.35, "#FFB25A", 0); c.restore(); }
    });
    Rr(c, 0, -4.2, BKL, 4.2, 0.02, "#C9C4B8", l0);
    for (i = 1; i < 5; i++) Ln(c, i * BKL / 5, -4.15, i * BKL / 5, -0.05, "#B3AEA2", 0.05);
    Ln(c, 0.05, -2.1, BKL - 0.05, -2.1, "#B3AEA2", 0.04);
    // inside, through the doorway: dark walls, the floor, the compost heap
    c.save(); c.beginPath(); c.rect(DOOR0, -DOORH, DOORW, DOORH); c.clip();
    c.fillStyle = "#3F3D38"; c.fillRect(DOOR0, -DOORH, DOORW, DOORH);
    c.fillStyle = "#57544D"; c.fillRect(DOOR0, -0.5, DOORW, 0.5);
    if (st.fill > 0.01) { c.save(); c.translate(DOOR0 + DOORW / 2, 0); mound(c, 0, 3.9 * Math.sqrt(st.fill), 1.9 * st.fill, st.col, 11, st.cook < 0.5 ? STRAWD : "#3A2618"); c.restore(); }
    c.restore();
    Rr(c, DOOR0 - 0.15, -DOORH - 0.15, 0.15, DOORH + 0.15, 0.02, "#8C97A6", l0 * 0.8);
    Rr(c, DOOR0 + DOORW, -DOORH - 0.15, 0.15, DOORH + 0.15, 0.02, "#8C97A6", l0 * 0.8);
    // the roller door rolls down from its drum
    var dh = DOORH * clamp(st.door, 0, 1);
    if (dh > 0.02) {
      Rr(c, DOOR0, -DOORH, DOORW, dh, 0.02, "#9FB3A8", l0);
      for (i = 1; i * 0.22 < dh; i++) Ln(c, DOOR0 + 0.05, -DOORH + i * 0.22, DOOR0 + DOORW - 0.05, -DOORH + i * 0.22, "#7F978A", 0.04);
      Rr(c, DOOR0 + DOORW / 2 - 0.3, -DOORH + dh - 0.14, 0.6, 0.1, 0.03, "#5D6675", l0 * 0.6);
    }
    Rr(c, DOOR0 - 0.2, -DOORH - 0.5, DOORW + 0.4, 0.42, 0.08, "#8C97A6", l0);
  }

  // =====================================================================================================
  // Machine and scene state
  // =====================================================================================================
  var lorry, crane, pile, heap, manure, loader, bunk, hop, bag, elev, shelf, duct, mush, plat, spray;
  var grabs = 0, pickQ = [];
  function resetWorld() {
    lorry = { x: LX0, wheel: 0, tip: 0, gate: 0, fill: 0, on: true, leave: false };
    crane = { x: LX0 - 2.9, h: 5.0, open: 0.4, rot: 0, load: 0 };
    pile = { lvl: 1 };
    heap = { lvl: 0, mix: 0, wet: 0 };
    manure = { lvl: 1 };
    loader = { x: LDX0, wheel: 0, lift: 0.04, tilt: 0, load: 0, col: MANURE };
    bunk = { fill: 0, cook: 0, door: 0, hot: 0, col: compCol(1, 1, 0) };
    hop = { lvl: 0, peat: 0 };
    bag = { lvl: 1, pour: 0 };
    elev = { h: TB[0] + 0.32, run: 0, phase: 0, col: null };
    shelf = TB.map(function () { return { c: 0, p: 0 }; });
    duct = { inf: 0, mist: 0 };
    spray = 0;
    mush = [];
    for (var t = 0; t < NT; t++) for (var j = 0; j < MPT; j++) mush.push({ t: t, x: RK0 + 0.6 + j * 1.2, g: 0, delay: hash(t, j) * 0.9, picked: false, taken: false, fly: -1, wig: 0 });
    plat = { x: PPARK, h: DECKH[0], n: 0, stack: 0, hand: null, bend: 0 };
    grabs = 0; pickQ = [];
  }
  resetWorld();
  var stepId = "straw", sub = "grab", phase = "ready", phaseT = 0, mo = null, glow = 0, ending = false, dusk = 0, time = 0;
  var dog = null, birds = null;

  // =====================================================================================================
  // The stage: one view
  // =====================================================================================================
  var cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  var W = 300, H = 300, DPR = 1;
  var z = { span: 13, mh: 5, tspan: 13, tmh: 5, tcx: 0 };
  // the ground line: low on an upright stage, so the work sits below the coach line in the middle
  function gyFor(w, h) { return h * (h > w * 1.2 ? 0.9 : (h < 460 && h <= w * 1.05 ? 0.78 : 0.72)); }
  var sc = new Farm.Scene({ L: 20, xmin: -40, xmax: 160, fit: function (w, h) { return Math.min(w * 0.95 / z.span, gyFor(w, h) * 0.92 / z.mh); } });
  function layout() { sc.layout(W, H); sc.gY = gyFor(W, H); sc.B = sc.gY - sc.hY; }
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(50, r.width); H = Math.max(50, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    layout(); follow(0, true);
  }
  // plain perspective (Farm.Scene's X() bends far depths towards its field backdrop)
  function PX(x, r) { return sc.W / 2 + (x - sc.cam) * sc.k / (r || 1); }
  function PY(h, r) { return sc.Y(r || 1) - h * sc.S(r || 1); }
  function scrPt(x, h, r) { var b = cv.getBoundingClientRect(); return { x: b.left + PX(x, r), y: b.top + PY(h, r) }; }
  function inView(x, h, r) { var px = PX(x, r), py = PY(h, r); return px > 10 && px < W - 10 && py > 10 && py < H - 10; }
  function put(x, r, dir, fn) {
    var d = Math.abs(dir) < 0.12 ? (dir < 0 ? -0.12 : 0.12) : dir;
    Farm.inUnits(ctx, PX(x, r), sc.Y(r), sc.S(r), sc.lw, function () { ctx.scale(d, 1); fn(); });
  }

  // ---------- Coach, counter, name tags ----------
  var coach = Toybox.coach($("coach"));
  function setCount(pop) { var el = $("loads"); el.textContent = "Punnets: " + punnets; if (pop) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); } }
  setCount(false);
  function tag(text, x, h, r) { var p = scrPt(x, h, r); Toybox.nametag(text, p.x, p.y, 2400); }
  // a name tag once the camera has arrived (the place it names is still coming into view)
  var tagT = null;
  function tagLater(text, x, h, r, ms) { clearTimeout(tagT); tagT = setTimeout(function () { if (!Farm.locked(ending)) tag(text, x, h, r); }, ms || 1500); }

  // =====================================================================================================
  // The steps
  // =====================================================================================================
  // The things he does, in order, with the coach's line and the part the ring points at.
  var SUB = {
    "straw.grab": { say: "Tap the crane's grab to pick up the straw.", part: "grab" },
    "straw.drive": { say: "Drive the lorry to the compost yard.", part: "lorry" },
    "straw.tip": { say: "Tap the lorry's bin to tip out the straw.", part: "bin" },
    "compost.mix": { say: "Tap the loader to mix the chicken manure into the straw.", part: "loader" },
    "compost.water": { say: "Tap the water pipe to wet the straw.", part: "pipe" },
    "compost.load": { say: "Drive the loader to put the compost in the bunker.", part: "loader" },
    "compost.shut": { say: "Tap the bunker door to shut it.", part: "door" },
    "compost.open": { say: "Tap the bunker door to open it.", part: "door" },
    "racks.fill": { say: "Tap the elevator's switch to fill a shelf.", part: "switch" },
    "racks.peat": { say: "Tap the peat bag to cover the compost with peat.", part: "bag" },
    "grow.climate": { say: "Tap the climate control to make the room warm and damp.", part: "climate" },
    "grow.pick": { say: "Tap a mushroom to pick it.", part: "mush" }
  };
  var BUSY = { straw: "The crane lorry is working.", compost: "The compost is getting ready.", racks: "The elevator is working.", grow: "The mushrooms are growing." };
  function key() { return stepId + "." + sub; }
  function sayFor(k) {
    if (k === "racks.fill" && shelf[0].c >= 1) return "Tap the elevator's switch to fill the next shelf.";
    if (k === "straw.grab" && grabs > 0) return "Tap the crane's grab to pick up more straw.";
    return SUB[k] ? SUB[k].say : "";
  }

  var ghost = Toybox.ghost({
    max: 3,
    plan: function () {
      if (Farm.locked(ending)) return null;
      if (phase === "ready") { var p = targetPt(); if (!p) return null; return { pts: [[p.x, p.y]], tap: true, key: key() }; }
      if (phase === "done" && phaseT > 5) { var q = scrPt((RK0 + RK1) / 2, 1.6, 1); return { pts: [[q.x, q.y]], tap: true, key: "again" }; }
      return null;
    }
  });
  Toybox.bar($("bottom"), { onNew: startOver, onSurprise: surprise });
  function busyHint() { snd.horn(); coach.say(stepId === "grow" && sub === "pick" ? "The picker is picking." : BUSY[stepId], 3); }
  function hint() { var t = sayFor(key()); if (t) coach.say(t, 3); glow = 3; if (ghost) ghost.poke(); }

  // =====================================================================================================
  // The flow
  // =====================================================================================================
  function setPhase(p) { phase = p; phaseT = 0; }
  function setSub(s) {
    sub = s; setPhase("ready");
    var t = sayFor(key()); if (t) coach.step(t);
    if (ghost) ghost.poke();
  }
  // one control's motion: fn(t, dt) for dur seconds, then end()
  function run(dur, fn, end) { mo = { t: 0, dur: dur, fn: fn, end: end, ev: {} }; setPhase("work"); }
  function onceM(id) { if (!mo || mo.ev[id]) return false; mo.ev[id] = 1; return true; }
  function bringIn(id) {
    stepId = id; mo = null;
    if (id === "straw") { setSub("grab"); tagLater("Crane lorry", lorry.x - 1, 4.4, LR, 600); }
    else if (id === "compost") travel(2.0, "mix", function () { tag("Chicken manure", MX, 1.3, 1.02); });
    else if (id === "racks") {
      hop.lvl = 1; coach.say("The compost goes to the growing house.", 3);
      travel(2.6, "fill", function () { tag("Elevator", ELX - 0.9, 2.4, 0.98); });
    }
    else if (id === "grow") { setSub("climate"); tagLater("Climate control", CLX, CLH + 0.9, RB - 0.02, 1200); }
  }
  // the camera moves on to the next place, then it is his turn
  function travel(dur, next, then) { run(dur, function () {}, function () { setSub(next); if (then) then(); }); mo.cam = true; }
  var ORDER = ["straw", "compost", "racks", "grow"];
  function stepDone(id) { var i = ORDER.indexOf(id); if (i < ORDER.length - 1) bringIn(ORDER[i + 1]); else finish(); }
  function finish() {
    setPhase("done"); mo = null;
    coach.say("The mushrooms are picked and in their punnets.", 5);
    snd.chime(); Toybox.kind();
    coach.step("Tap the shelves to start again.");
  }
  function again() {
    if (phase !== "done") return false;
    if (ghost) ghost.learned("again");
    resetScene();
    coach.say("Here is more straw for the mushrooms.", 3);
    return true;
  }
  function resetScene() {
    parts.length = 0; dog = null; birds = null; mo = null; drag = null; glow = 0;
    resetWorld(); bringIn("straw"); follow(0, true);
  }
  function startOver() {
    if (Farm.locked(ending)) return;
    resetScene();
    coach.say("The mushroom farm needs straw.", 3);
  }

  function act(part) {
    var k = key(), p = part || "", m = /^m(\d+)$/.exec(p), sh = /^shelf(\d)$/.exec(p);
    if (k === "straw.grab" && (p === "grab" || p === "crane" || p === "pile" || p === "bin")) return craneGrab(), true;
    if (k === "straw.drive" && (p === "lorry" || p === "bin" || p === "grab" || p === "crane")) return driveLorry(), true;
    if (k === "straw.tip" && (p === "bin" || p === "lorry")) return tipBin(), true;
    if (k === "compost.mix" && (p === "loader" || p === "bucket" || p === "manure")) return loaderMix(), true;
    if (k === "compost.water" && (p === "pipe" || p === "heap" || p === "spray")) return water(), true;
    if (k === "compost.load" && (p === "loader" || p === "bucket" || p === "heap")) return loaderLoad(), true;
    if (k === "compost.shut" && (p === "door" || p === "bunker")) return shutDoor(), true;
    if (k === "compost.open" && (p === "door" || p === "bunker")) return openDoor(), true;
    if (k === "racks.fill" && (p === "switch" || p === "elevator" || p === "hopper" || sh)) return fillShelf(), true;
    if (k === "racks.peat" && (p === "bag" || p === "hopper" || p === "switch" || p === "elevator")) return peatAll(), true;
    if (k === "grow.climate" && (p === "climate" || p === "duct")) return climate(), true;
    if (k === "grow.pick") {
      if (m && !mush[+m[1]].taken) return pick(+m[1]), true;
      if (sh) { var i = nextMush(+sh[1]); if (i >= 0) return pick(i), true; }
      if (p === "platform" || p === "worker") return raisePlat(), true;
    }
    return false;
  }

  // ---------- Straw: the crane lorry ----------
  function restPt() { return { x: lorry.x - 2.9, h: 5.0 }; }
  function craneRest() { var p = restPt(); crane.x = p.x; crane.h = p.h; }
  function pileTop() { return 0.35 + 1.9 * pile.lvl; }
  function lp(a, b, f) { return { x: lerp(a.x, b.x, f), h: lerp(a.h, b.h, f) }; }
  function craneGrab() {
    var r0 = { x: crane.x, h: crane.h }, top = pileTop(), px = PILEX + (grabs - 1) * 0.7;
    var above = { x: px, h: top + 2.0 }, down = { x: px, h: top + 0.95 }, over = { x: lorry.x + (BIN0 + BIN1) / 2, h: 5.3 }, rest = restPt();
    snd.tick();
    run(4.0, function (t, dt) {
      var p;
      if (t < 1.0) p = lp(r0, above, seg(t, 0, 1.0));
      else if (t < 1.4) p = lp(above, down, seg(t, 1.0, 1.4));
      else if (t < 1.75) p = down;
      else if (t < 2.15) p = lp(down, above, seg(t, 1.75, 2.15));
      else if (t < 3.05) p = lp(above, over, seg(t, 2.15, 3.05));
      else if (t < 3.35) p = over;
      else p = lp(over, rest, seg(t, 3.35, 4.0));
      crane.x = p.x; crane.h = p.h;
      crane.open = t < 1.0 ? lerp(0.4, 1, seg(t, 0, 1.0)) : t < 1.4 ? 1 : t < 1.75 ? 1 - seg(t, 1.4, 1.75) : t < 3.05 ? 0 : t < 3.35 ? seg(t, 3.05, 3.3) : lerp(1, 0.4, seg(t, 3.35, 4.0));
      if (t < 1.0 || (t > 2.15 && t < 3.05)) crane.rot += dt * 2.2;
      if (t >= 1.6 && onceM("bite")) {
        crane.load = 1; pile.lvl = Math.max(0, pile.lvl - 1 / 3); snd.clunk();
        for (var i = 0; i < 6; i++) addPart({ x: px + (Math.random() - 0.5) * 1.2, h: top - 0.2, r: LR, vx: (Math.random() - 0.5) * 1.5, vh: 1 + Math.random() * 1.5, life: 1.0, size: 0.18, col: STRAW, kind: "straw", floor: 0.2 });
      }
      if (t >= 3.2 && onceM("drop")) {
        crane.load = 0; lorry.fill = Math.min(1, lorry.fill + 1 / 3); snd.soil(0.4); setTimeout(function () { snd.soil(0); }, 400);
        for (var j = 0; j < 8; j++) addPart({ x: over.x + (Math.random() - 0.5) * 1.6, h: over.h - 1.3, r: LR, vx: (Math.random() - 0.5) * 1.2, vh: -0.5, life: 0.7, size: 0.18, col: STRAW, kind: "straw", floor: BINT });
      }
    }, function () {
      grabs++;
      if (grabs >= 3) { coach.say("The bin is full of straw.", 3); setSub("drive"); }
      else setSub("grab");
    });
  }
  function driveLorry() {
    var x0 = lorry.x, dur = clamp((LXC - x0) / 6.5, 1.0, 9);
    snd.horn();
    run(dur, function (t) { var nx = lerp(x0, LXC, ease(t / dur)); lorry.wheel += nx - lorry.x; lorry.x = nx; craneRest(); },
      function () { lorry.x = LXC; craneRest(); snd.clunk(); coach.say("This is the compost yard.", 3); setSub("tip"); });
    mo.cam = true;
  }
  function tipBin() {
    coach.say("The bin tips up and the straw slides out.", 3);
    snd.clunk();
    run(4.6, function (t) {
      lorry.tip = t < 3.4 ? 0.72 * seg(t, 0, 1.4) : 0.72 * (1 - seg(t, 3.4, 4.6));
      lorry.gate = t < 3.4 ? seg(t, 0.8, 1.4) : 1 - seg(t, 3.6, 4.4);
      var f = seg(t, 1.2, 3.3);
      lorry.fill = 1 - f; heap.lvl = f;
      if (t > 1.2 && t < 3.3 && Math.random() < 0.5) addPart({ x: lorry.x + BIN0 - 0.2, h: 1.6 + Math.random() * 0.6, r: LR, vx: -1 - Math.random() * 1.5, vh: 0.5, life: 0.8, size: 0.18, col: STRAW, kind: "straw", floor: 0.3 });
      snd.soil(t > 1.2 && t < 3.3 ? 0.5 : 0);
    }, function () {
      lorry.tip = 0; lorry.gate = 0; lorry.fill = 0; heap.lvl = 1; lorry.leave = true; snd.soil(0); stepDone("straw");
    });
  }

  // ---------- Compost: the loading shovel and the bunker ----------
  function loaderMix() {
    var x0 = loader.x, xa = MX - 0.9 - LTIP, xb = CX - 0.9 - LTIP;
    snd.horn();
    run(5.8, function (t) {
      var nx;
      if (t < 1.2) nx = lerp(x0, xa, seg(t, 0, 1.2));
      else if (t < 1.8) nx = xa;
      else if (t < 3.0) nx = lerp(xa, xb, seg(t, 1.8, 3.0));
      else if (t < 3.9) nx = xb;
      else nx = lerp(xb, LMID, seg(t, 3.9, 5.8));
      loader.wheel += nx - loader.x; loader.x = nx;
      loader.lift = t < 1.2 ? 0.04 : t < 1.8 ? lerp(0.04, 0.22, seg(t, 1.2, 1.8)) : t < 3.0 ? lerp(0.22, 0.85, seg(t, 1.8, 3.0)) : t < 3.9 ? 0.85 : lerp(0.85, 0.04, seg(t, 3.9, 5.2));
      loader.tilt = t < 3.0 ? 0 : t < 3.6 ? seg(t, 3.0, 3.6) : 1 - seg(t, 3.9, 4.6);
      if (t >= 1.2 && t < 1.8) { manure.lvl = 1 - seg(t, 1.2, 1.8); loader.load = 1 - manure.lvl; loader.col = MANURE; }
      if (t >= 3.0 && t < 3.9) { var f = seg(t, 3.0, 3.8); loader.load = 1 - f; heap.mix = f; if (Math.random() < 0.4) addPart({ x: loader.x + LTIP, h: loaderH(0.85) - 0.2, r: 1, vx: 0.3, vh: 0, life: 0.6, size: 0.14, col: MANURE, kind: "dust", floor: 1.2 }); }
      if (t >= 1.3 && onceM("scoop")) { snd.clunk(); coach.say("The loader mixes in the chicken manure.", 3); }
    }, function () { manure.lvl = 0; heap.mix = 1; loader.load = 0; loader.lift = 0.04; loader.tilt = 0; setSub("water"); });
  }
  function water() {
    coach.say("The water makes the straw wet.", 3);
    run(3.8, function (t) {
      spray = t < 3.2 ? seg(t, 0, 0.3) : 1 - seg(t, 3.2, 3.6);
      heap.wet = seg(t, 0.5, 3.2);
      snd.pour(spray * 0.5);
    }, function () { spray = 0; snd.pour(0); setSub("load"); });
  }
  function loaderLoad() {
    var x0 = loader.x, xs = CX - 1.8 - LTIP + 0.4, xe = xs + 1.6, xd = DC - 0.4 - LTIP, col = compCol(heap.mix, heap.wet, 0);
    snd.horn();
    run(7.0, function (t) {
      var nx;
      if (t < 1.1) nx = lerp(x0, xs, seg(t, 0, 1.1));
      else if (t < 2.0) nx = lerp(xs, xe, seg(t, 1.1, 2.0));
      else if (t < 4.2) nx = lerp(xe, xd, seg(t, 2.0, 4.2));
      else if (t < 5.1) nx = xd;
      else nx = lerp(xd, LPARK2, seg(t, 5.1, 7.0));
      loader.wheel += nx - loader.x; loader.x = nx;
      loader.lift = t < 1.1 ? 0.04 : t < 2.0 ? lerp(0.04, 0.25, seg(t, 1.1, 2.0)) : t < 4.2 ? lerp(0.25, 0.5, seg(t, 2.0, 4.2)) : t < 5.1 ? 0.5 : lerp(0.5, 0.04, seg(t, 5.1, 6.4));
      loader.tilt = t < 4.2 ? 0 : t < 4.9 ? seg(t, 4.2, 4.9) : 1 - seg(t, 5.1, 5.8);
      if (t >= 1.1 && t < 2.0) { heap.lvl = 1 - seg(t, 1.1, 2.0); loader.load = 1 - heap.lvl; loader.col = col; }
      if (t >= 4.2 && t < 5.1) { var f = seg(t, 4.2, 5.0); loader.load = 1 - f; bunk.fill = f; bunk.col = col; }
      if (t >= 4.3 && onceM("in")) { snd.clunk(); coach.say("The compost goes in the bunker.", 3); }
    }, function () { heap.lvl = 0; loader.load = 0; bunk.fill = 1; loader.x = LPARK2; loader.lift = 0.04; loader.tilt = 0; setSub("shut"); });
    mo.cam = true;
  }
  function shutDoor() {
    snd.clunk();
    run(1.8, function (t) { bunk.door = seg(t, 0, 1.7); }, function () {
      bunk.door = 1; snd.clunk();
      coach.say("The compost gets hot inside and steams.", 4);
      run(5.0, function (t) {
        bunk.hot = t < 4.2 ? seg(t, 0, 1.0) : 1 - seg(t, 4.2, 5.0) * 0.6; bunk.cook = seg(t, 0.5, 4.5);
        bunk.col = compCol(1, 1, bunk.cook);
        if (Math.random() < 0.35) [2.0, 5.6].forEach(function (vx) { addPart({ x: BK0 + vx + (Math.random() - 0.5) * 0.2, h: 5.6, r: BKR, vx: 0.2 + Math.random() * 0.3, vh: 0.8 + Math.random() * 0.5, life: 2.2, size: 0.25, grow: 0.6, col: "#FFFFFF", kind: "puff", alpha: 0.75 }); });
      }, function () { setSub("open"); });
    });
  }
  function openDoor() {
    snd.clunk();
    run(3.2, function (t) {
      bunk.door = 1 - seg(t, 0, 1.6);
      if (t > 0.6 && t < 2.8 && Math.random() < 0.5) addPart({ x: DC + (Math.random() - 0.5) * 3, h: 0.8 + Math.random() * 1.6, r: BKR - 0.05, vx: (Math.random() - 0.5) * 0.4, vh: 0.9, life: 2.0, size: 0.35, grow: 0.7, col: "#FFFFFF", kind: "puff", alpha: 0.7 });
      if (t >= 1.2 && onceM("say")) coach.say("The compost is dark now. It is ready for the mushrooms.", 4);
    }, function () { bunk.door = 0; stepDone("compost"); });
  }

  // ---------- Racks: the elevator ----------
  function shelvesDone() { var n = 0; shelf.forEach(function (s) { if (s.c >= 1) n++; }); return n; }
  function headH(i, peat) { return TB[i] + (peat ? 0.5 : 0.36); }
  function fillShelf() {
    var i = shelvesDone(), h0 = elev.h, h1 = headH(i, false), l0 = hop.lvl;
    if (i > NT - 1) return;
    snd.tick();
    run(3.8, function (t) {
      elev.h = lerp(h0, h1, seg(t, 0, 0.8));
      elev.run = t > 0.6 && t < 3.4 ? 1 : 0; elev.col = DARKC;
      shelf[i].c = seg(t, 1.0, 3.3);
      hop.lvl = l0 - shelf[i].c / 3;
      if (t >= 0.6 && onceM("on")) snd.clunk();
    }, function () {
      shelf[i].c = 1; elev.run = 0;
      if (i < NT - 1) setSub("fill");
      else { coach.say("The shelves are full of compost.", 3); setSub("peat"); }
    });
  }
  function peatAll() {
    var h0 = elev.h;
    snd.tick();
    coach.say("The peat goes on top of the compost.", 3);
    run(1.4 + NT * 1.9 + 0.3, function (t) {
      bag.pour = t < 1.5 ? 1 : 0;
      bag.lvl = 1 - seg(t, 0.1, 1.4); hop.peat = Math.max(hop.peat, seg(t, 0.2, 1.4));
      var tt = t - 1.4;
      if (tt > 0) {
        var k = Math.min(NT - 1, Math.floor(tt / 1.9)), i = NT - 1 - k, u = tt - k * 1.9, from = k === 0 ? h0 : headH(i + 1, true);
        elev.h = lerp(from, headH(i, true), seg(u, 0, 0.5));
        elev.run = u > 0.2 ? 1 : 0; elev.col = PEAT;
        shelf[i].p = seg(u, 0.4, 1.8);
        for (var j = NT - 1; j > i; j--) shelf[j].p = 1;
        hop.peat = 1 - seg(tt, 0, NT * 1.9);
      }
      snd.soil(bag.pour ? 0.4 : 0);
    }, function () { shelf.forEach(function (s) { s.p = 1; }); elev.run = 0; hop.peat = 0; snd.soil(0); stepDone("racks"); });
  }

  // ---------- Grow and pick ----------
  function climate() {
    snd.tick();
    run(6.8, function (t) {
      duct.inf = seg(t, 0, 1.0); duct.mist = t > 0.8 && t < 6.2 ? 1 : Math.max(0, duct.mist - 0.02);
      mush.forEach(function (m) { m.g = seg(t, 1.3 + m.delay, 5.0 + m.delay); });
      if (t >= 1.4 && onceM("pin")) coach.say("Little pinheads come up in the peat.", 3);
      if (t >= 4.2 && onceM("grow")) coach.say("They grow into white mushrooms.", 3);
      if (duct.mist > 0.5 && Math.random() < 0.3) addPart({ x: lerp(GH0 + 1.2, GH1 - 1.2, Math.random()), h: 4.35, r: 1.3, vx: (Math.random() - 0.5) * 0.3, vh: -0.25, life: 2.2, size: 0.2, grow: 0.4, col: "#F4FAFF", kind: "puff", alpha: 0.45 });
    }, function () { mush.forEach(function (m) { m.g = 1; }); duct.mist = 0; setSub("pick"); });
  }
  function nextMush(tier) {
    for (var i = 0; i < mush.length; i++) if (!mush[i].taken && (tier === undefined || mush[i].t === tier)) return i;
    return -1;
  }
  function bedTop(t) { return TB[t] + 0.22 * shelf[t].c + 0.08 * shelf[t].p; }
  function pick(i) {
    var m = mush[i];
    if (!m || m.taken) return;
    if (phase === "work") { if (pickQ.indexOf(i) < 0 && pickQ.length < 3) { pickQ.push(i); m.wig = 1; snd.tick(); } return; }
    m.taken = true; m.wig = 1;
    var x0 = plat.x, h0 = plat.h, tx = m.x - 0.55, th = DECKH[m.t];
    var dm = Math.max(0.35, Math.max(Math.abs(tx - x0) / 2.4, Math.abs(th - h0) / 1.1)), bt = bedTop(m.t);
    snd.tick();
    run(dm + 1.25, function (t) {
      plat.x = lerp(x0, tx, seg(t, 0, dm)); plat.h = lerp(h0, th, seg(t, 0, dm));
      var dh = plat.h, reach = { x: m.x - plat.x - 0.05, y: -(bt + 0.12 - dh) };
      var pun = { x: -0.62, y: -1.12 };
      if (t < dm) plat.hand = null;
      else if (t < dm + 0.4) plat.hand = [lerp(0.35, reach.x, seg(t, dm, dm + 0.4)), lerp(-1.0, reach.y, seg(t, dm, dm + 0.4))];
      else plat.hand = [lerp(reach.x, pun.x + 0.3, seg(t, dm + 0.4, dm + 0.95)), lerp(reach.y, pun.y - 0.15, seg(t, dm + 0.4, dm + 0.95))];
      plat.bend = m.t === 0 && t >= dm ? 0.6 * Math.sin(PI * seg(t, dm, dm + 1.0)) : 0;
      if (t >= dm + 0.4 && onceM("pick")) { m.picked = true; m.fly = 0; snd.pop(); }
      if (m.fly >= 0) m.fly = seg(t, dm + 0.4, dm + 0.95);
      if (t >= dm + 0.95 && onceM("in")) { m.fly = -1; plat.n++; snd.tick(); }
    }, function () {
      plat.hand = null; plat.bend = 0;
      if (plat.n >= MPER) punnetFull(); else nextPick();
    });
  }
  function punnetFull() {
    coach.say("The punnet is full.", 3);
    run(1.0, function (t) { if (t >= 0.5 && onceM("full")) { plat.n = 0; plat.stack = Math.min(4, plat.stack + 1); punnets++; save(); setCount(true); snd.chime(); } },
      function () { nextPick(); });
  }
  function nextPick() {
    if (mush.every(function (m) { return m.picked; })) { finish(); return; }
    setSub("pick");
    while (pickQ.length) { var q = pickQ.shift(); if (!mush[q].taken) { pick(q); return; } }
  }
  function raisePlat() {
    var cur = 0, i;
    for (i = 0; i < NT; i++) if (Math.abs(plat.h - DECKH[i]) < 0.1) cur = i;
    var nx = (cur + 1) % NT, h0 = plat.h;
    snd.tick(); coach.say(nx > cur ? "The platform goes up." : "The platform goes down.", 3);
    run(1.2, function (t) { plat.h = lerp(h0, DECKH[nx], seg(t, 0, 1.2)); }, function () { setSub("pick"); });
  }

  // ---------- Surprise: a fun moment on the scene, taking turns ----------
  var surpriseN = 0;
  function indoors() { return stepId === "racks" || stepId === "grow"; }
  function viewX(f) { return sc.wx(W * f, 1); }
  function surprise() {
    if (Farm.locked(ending)) return;
    var pick2 = (indoors() ? ["dog", "mist"] : ["dog", "birds"])[surpriseN++ % 2];
    if (pick2 === "dog") {
      dog = { x: viewX(1.06), stop: viewX(0.5), t: 0, st: "run", ph: 0, flip: true };
      coach.say("Here comes Midge.", 3);
    } else if (pick2 === "birds") {
      birds = { t: 0, x0: viewX(-0.1) };
      coach.say("Swallows swoop over the yard.", 3);
    } else {
      duct.inf = 1;
      for (var i = 0; i < 26; i++) addPart({ x: lerp(GH0 + 1, GH1 - 1, i / 25), h: 4.45, r: 1.3, vx: (Math.random() - 0.5) * 0.6, vh: -0.4 - Math.random() * 0.3, life: 2.6, size: 0.3, grow: 0.6, col: "#F4FAFF", kind: "puff", alpha: 0.6 });
      snd.pour(0.4); setTimeout(function () { snd.pour(0); }, 700);
      coach.say("Whoosh! A big puff of mist.", 3);
    }
  }

  // =====================================================================================================
  // Particles (world x, height h in metres, depth r)
  // =====================================================================================================
  var parts = [];
  function addPart(p) { if (parts.length > 120) parts.shift(); p.t = 0; p.rot = Math.random() * 3; p.r = p.r || 1; parts.push(p); }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      if (p.kind === "puff") { p.x += p.vx * dt; p.h += p.vh * dt; p.size += (p.grow || 0.5) * dt; continue; }
      p.vh -= (p.kind === "drop" ? 9 : 6) * dt; p.x += p.vx * dt; p.h += p.vh * dt; p.rot += 3 * dt;
      var fl = p.floor || 0;
      if (p.h < fl) { p.h = fl; p.vh = 0; p.vx *= 0.2; if (p.t < p.life - 0.2) p.t = p.life - 0.2; }
    }
  }
  function drawParts() {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], s = sc.S(p.r), x = PX(p.x, p.r), y = PY(p.h, p.r), zz = Math.max(1, p.size * s), f = p.t / p.life;
      if (x < -40 || x > W + 40) continue;
      ctx.globalAlpha = p.kind === "puff" ? (p.alpha || 0.5) * (1 - f) : (f > 0.7 ? (1 - f) / 0.3 : 1);
      ctx.fillStyle = p.col;
      if (p.kind === "straw") { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillRect(-zz, -zz * 0.15, zz * 2, zz * 0.3); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(x, y, zz, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  function targetPt() {
    var d = SUB[key()], t = d ? d.part : null;
    if (t === "grab") return scrPt(crane.x, crane.h - 0.8, LR);
    if (t === "lorry") return scrPt(lorry.x + 0.3, 2.4, LR);
    if (t === "bin") return scrPt(lorry.x + (BIN0 + BIN1) / 2, 2.4, LR);
    if (t === "loader") return scrPt(loader.x - 0.1, 2.0, 1);
    if (t === "pipe") return scrPt(PIPEX, 1.2, PIPER);
    if (t === "door") return scrPt(DC, 1.7, BKR);
    if (t === "switch") return scrPt(ELX - 0.12, 1.25, 0.98);
    if (t === "bag") return scrPt(HOP, 2.6, 1.0);
    if (t === "climate") return scrPt(CLX, CLH, RB - 0.02);
    if (t === "mush") { var i = nextMush(); return i >= 0 ? scrPt(mush[i].x, bedTop(mush[i].t) + 0.15, 1) : null; }
    return null;
  }
  function partList() {
    var list = [];
    function add(id, x, h, size, r) { var p = scrPt(x, h, r); if (inView(x, h, r)) list.push({ id: id, x: p.x, y: p.y, r: Math.max(26, sc.S(r || 1) * size) }); }
    if (lorry.on) {
      add("lorry", lorry.x + 0.3, 2.3, 1.4, LR);
      add("bin", lorry.x + (BIN0 + BIN1) / 2, 2.4, 1.8, LR);
      add("grab", crane.x, crane.h - 0.8, 0.8, LR);
    }
    if (pile.lvl > 0.02 && stepId === "straw") add("pile", PILEX, pileTop() * 0.5, 1.4, LR + 0.02);
    if (manure.lvl > 0.02) add("manure", MX, 0.5, 0.9, 1.02);
    if (heap.lvl > 0.02) add("heap", CX, 0.8, 1.4, 1);
    add("loader", loader.x - 0.2, 2.0, 1.4, 1);
    add("bucket", loader.x + LTIP - 0.4, loaderH(loader.lift), 0.6, 1);
    add("pipe", PIPEX, 1.2, 0.7, PIPER);
    add("spray", CX, 4.2, 0.8, PIPER);
    add("door", DC, 1.7, 1.6, BKR);
    add("bunker", BK0 + BKL - 1.0, 3.2, 1.0, BKR);
    if (stepId === "racks" || stepId === "grow" || phase === "done") {
      add("hopper", HOP, 1.0, 0.8, 0.98);
      add("bag", HOP, 2.6, 0.7, 1.0);
      add("switch", ELX - 0.12, 1.25, 0.45, 0.98);
      add("elevator", lerp(HOP + 0.6, ELX, 0.5), lerp(1.2, elev.h, 0.5), 0.5, 0.98);
      add("climate", CLX, CLH, 0.6, RB - 0.02);
      add("duct", (GH0 + GH1) / 2, 4.6, 0.5, 1.3);
      add("platform", plat.x - 0.2, Math.max(0.3, plat.h - 0.3), 0.5, PR);
      add("worker", plat.x, plat.h + 1.2, 0.5, PR);
      for (var t = 0; t < NT; t++) add("shelf" + t, (RK0 + RK1) / 2, TB[t] - 0.2, 0.35, 1);
      mush.forEach(function (m, i) { if (!m.picked && m.g > 0.5) add("m" + i, m.x, bedTop(m.t) + 0.15, 0.4, 1); });
    }
    return list;
  }
  var NAMESL = { lorry: "Crane lorry", bin: "Bin", grab: "Rotating grab", pile: "Straw", manure: "Chicken manure", heap: "Compost", loader: "Loading shovel",
    bucket: "Bucket", pipe: "Water pipe", spray: "Sprayers", door: "Bunker door", bunker: "Compost bunker", hopper: "Hopper", bag: "Peat", switch: "Switch",
    elevator: "Elevator", climate: "Climate control", duct: "Air duct", platform: "Picking platform", worker: "Mushroom picker" };
  function tagPart(part) {
    var p = part || "", m = /^m(\d+)$/.exec(p), sh = /^shelf(\d)$/.exec(p);
    if (m) { var mm = mush[+m[1]]; mm.wig = 1; snd.pop(); tag("Button mushroom", mm.x, bedTop(mm.t) + 0.6, 1); return true; }
    if (sh) { snd.tick(); tag("Shelf", RK0 + 0.6, TB[+sh[1]] + 0.5, 1); return true; }
    if (!NAMESL[p]) return false;
    if (p === "lorry" || p === "loader") snd.horn(); else snd.tick();
    var at = { lorry: [lorry.x, 4.3, LR], bin: [lorry.x - 4.2, 4.3, LR], grab: [crane.x, crane.h + 0.3, LR], pile: [PILEX, pileTop() + 0.4, LR], manure: [MX, 1.4, 1.02],
      heap: [CX, 2.2, 1], loader: [loader.x, 3.6, 1], bucket: [loader.x + LTIP, loaderH(loader.lift) + 0.8, 1], pipe: [PIPEX, 2.0, PIPER], spray: [CX, 4.8, PIPER],
      door: [DC, 3.8, BKR], bunker: [BK0 + BKL / 2, 5.2, BKR], hopper: [HOP, 1.8, 0.98], bag: [HOP, 3.8, 1], switch: [ELX, 1.9, 0.98], elevator: [ELX - 0.8, 3.0, 0.98],
      climate: [CLX, CLH + 0.8, RB], duct: [(GH0 + GH1) / 2, 5.1, 1.3], platform: [plat.x, plat.h + 1.4, PR], worker: [plat.x, plat.h + 2.0, PR] }[p];
    if (p === "grab") crane.rot += 0.8;
    tag(NAMESL[p], at[0], at[1], at[2]); return true;
  }
  function tapPart(part) {
    if (phase === "ready" && act(part)) { if (ghost) ghost.learned(key()); glow = 0; return; }
    if (phase === "work" && stepId === "grow" && sub === "pick" && part && /^m\d+$/.test(part) && act(part)) return;
    if (phase === "done") { again(); return; }
    if (phase === "work" && part && NAMESL[part]) { busyHint(); return; }
    if (tagPart(part)) return;
    hint();
  }
  function wxAt(vx, r) { var b = cv.getBoundingClientRect(); return sc.wx(vx - b.left, r || 1); }
  var drag = null;
  Toybox.press(cv, {
    any: true,
    parts: partList,
    dragStart: function (part, e, s) {
      drag = null;
      if (Farm.locked(ending) || phase !== "ready") return;
      var k = key(), p = part || "";
      if (k === "straw.drive" && (p === "lorry" || p === "bin" || p === "grab")) drag = { kind: "lorry", off: wxAt(s.x0, LR) - lorry.x, x0: lorry.x };
      else if (k === "compost.load" && (p === "loader" || p === "bucket")) drag = { kind: "loader", off: wxAt(s.x0, 1) - loader.x, x0: loader.x };
      else drag = { kind: "act", part: part };
    },
    move: function (part, e, s) {
      if (!drag || Farm.locked(ending) || phase !== "ready") return;
      var nx;
      if (drag.kind === "lorry") { nx = clamp(wxAt(s.x, LR) - drag.off, LX0, LXC); lorry.wheel += nx - lorry.x; lorry.x = nx; craneRest(); }
      else if (drag.kind === "loader") { nx = clamp(wxAt(s.x, 1) - drag.off, LDX0, CX - 1.8 - LTIP + 0.4); loader.wheel += nx - loader.x; loader.x = nx; }
    },
    up: function () {
      var d = drag; drag = null;
      if (!d || Farm.locked(ending) || phase !== "ready") return;
      var k = key();
      if (d.kind === "act") { if (act(d.part)) { if (ghost) ghost.learned(k); glow = 0; } return; }
      if (ghost) ghost.learned(k);
      // a drag towards the stop sets the machine going: it carries on when he lets go
      if (d.kind === "lorry") { if (lorry.x > d.x0 + 0.5 || LXC - lorry.x < 3) driveLorry(); return; }
      if (d.kind === "loader" && loader.x > d.x0 + 0.4) loaderLoad();
    },
    tap: function (part) { if (!Farm.locked(ending)) tapPart(part); }
  });

  // =====================================================================================================
  // Update
  // =====================================================================================================
  // what the camera frames: the whole machine he works and the thing it works on
  function frame() {
    if (stepId === "straw") {
      if (sub === "tip") return { xa: CX - 2.4, xb: LXC + 2.1, mh: 6.2 };
      if (sub === "drive" && (phase === "work" || lorry.x > LX0 + 0.3)) return { xa: lorry.x - 8.6, xb: lorry.x + 4.0, mh: 6.0 };
      return { xa: PILEX - PILEW / 2 - 0.6, xb: lorry.x + 2.1, mh: 7.0 };
    }
    if (stepId === "compost") {
      if (sub === "mix") return { xa: LDX0 - 2.5, xb: CX + 3.3, mh: 4.8 };
      if (sub === "water") return { xa: LMID - 2.5, xb: CX + 3.3, mh: 4.8 };
      if (sub === "load") return { xa: Math.min(loader.x - 2.5, LMID - 2.5), xb: Math.max(DC + 1.0, loader.x + LTIP + 1.2), mh: 5.0 };
      return { xa: LPARK2 - 2.5, xb: BK1 + 0.5, mh: 5.8 };
    }
    if (stepId === "racks") return { xa: HOP - 1.3, xb: RK1 + 0.5, mh: 4.6 };
    if (sub === "climate") return { xa: ELX - 1.0, xb: GH1 - 0.2, mh: 4.6 };
    return { xa: ELX - 1.0, xb: PPARK + 0.65, mh: 4.6 };
  }
  function follow(dt, snap) {
    // while a finger drives a vehicle the camera holds still (else the vehicle would run away from the finger)
    if (!snap && drag && drag.kind !== "act") return;
    var f = frame(), e = Math.min(1, dt * (mo && mo.cam ? 4 : 2));
    z.tspan = f.xb - f.xa; z.tmh = f.mh; z.tcx = (f.xa + f.xb) / 2;
    if (snap) { z.span = z.tspan; z.mh = z.tmh; layout(); }
    else if (Math.abs(z.span - z.tspan) > 0.02 || Math.abs(z.mh - z.tmh) > 0.02) { z.span += (z.tspan - z.span) * e; z.mh += (z.tmh - z.mh) * e; layout(); }
    sc.follow(z.tcx, mo && mo.cam ? dt * 4 : dt * 1.5, snap);
  }
  var engLevel = 0;
  function update(dt) {
    time += dt; phaseT += dt;
    var work = 0;
    if (mo) {
      mo.t += dt; work = 0.8;
      mo.fn(Math.min(mo.t, mo.dur), dt);
      if (mo && mo.t >= mo.dur) { var en = mo.end; mo = null; en(); }
    }
    glow = Math.max(0, glow - dt);
    if (lorry.leave) {
      var v = clamp(2 + (lorry.x - LXC) * 0.8, 2, 12); lorry.x += v * dt; lorry.wheel += v * dt; craneRest();
      if (lorry.x > LXC + 22) { lorry.on = false; lorry.leave = false; }
    }
    elev.phase += dt * elev.run;
    if (spray > 0.2 && Math.random() < 0.6) addPart({ x: lerp(CX - 1.9, CX + 1.7, Math.random()), h: 4.1, r: PIPER, vx: 0, vh: -2, life: 0.8, size: 0.06, col: "#7EC8F2", kind: "drop", floor: 0.4 + 1.6 * heap.lvl });
    if (bunk.hot > 0.3 && bunk.door < 0.5 && Math.random() < 0.08) addPart({ x: DC + (Math.random() - 0.5) * 2, h: 1.6, r: BKR + 0.05, vx: 0, vh: 0.5, life: 1.8, size: 0.25, grow: 0.5, col: "#FFFFFF", kind: "puff", alpha: 0.4 });
    mush.forEach(function (m) { if (m.wig > 0) m.wig = Math.max(0, m.wig - dt * 1.6); });
    if (dog) updateDog(dt);
    if (birds) { birds.t += dt; if (birds.t > 6) birds = null; }
    if (ending) dusk = Math.min(1, dusk + dt * 0.5);
    updateParts(dt);
    follow(dt);
    engLevel += (work - engLevel) * Math.min(1, dt * 4);
    snd.engine(ending ? -1 : 0.12 + engLevel * 0.7);
  }
  function updateDog(dt) {
    var g = dog; g.t += dt;
    if (g.st === "run") { var dx = g.stop - g.x; g.x += clamp(dx * 2.2, -7, 7) * dt; g.ph += dt * 3; if (Math.abs(dx) < 0.25) { g.st = "sit"; g.t = 0; } }
    else if (g.st === "sit") { g.ph += dt * 0.5; if (g.t > 1.6) { g.st = "go"; g.t = 0; g.flip = false; } }
    else { g.x += 7 * dt; g.ph += dt * 3.4; if (g.t > 3.2) dog = null; }
  }

  // =====================================================================================================
  // Drawing
  // =====================================================================================================
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    sc.sky(ctx, { time: time, arc: null, season: "autumn", dusk: dusk });
    drawGround();
    put(-21, 1.75, 1, function () { stableBlock(ctx); });
    drawYardBack();
    drawHouse();
    if (pile.lvl > 0.01) put(PILEX, LR + 0.02, 1, function () { mound(ctx, 0, PILEW * (0.55 + 0.45 * pile.lvl), pileTop(), "#DDB75A", 21, STRAWD); });
    drawCompostYard();
    if (lorry.on) drawLorry();
    drawParts();
    if (dog) { var s = sc.S(0.92); D.dog(ctx, PX(dog.x, 0.92), sc.Y(0.92), s * 1.5, dog.ph, dog.flip, dog.st === "sit"); }
    if (birds) drawBirds();
    drawRing();
    if (dusk > 0) { ctx.fillStyle = "rgba(20,28,60," + (dusk * 0.35) + ")"; ctx.fillRect(0, 0, W, H); }
  }
  function drawGround() {
    var yh = sc.Y(sc.rH);
    ctx.fillStyle = "#8DBF5A"; ctx.fillRect(0, yh, W, sc.Y(2.4) - yh);
    ctx.fillStyle = "#C2BBAA"; ctx.fillRect(0, sc.Y(2.4), W, H - sc.Y(2.4));
    ctx.fillStyle = "#B3AC9B"; ctx.fillRect(0, sc.Y(1.12), W, sc.Y(0.86) - sc.Y(1.12));
    ctx.strokeStyle = "rgba(29,35,64,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, sc.Y(2.4)); ctx.lineTo(W, sc.Y(2.4)); ctx.stroke();
  }
  // trees behind the compost yard and the bunker shed
  function drawYardBack() {
    [CX - 14, CX - 9, CX - 1].forEach(function (x, i) { var s = sc.S(2.6); if (PX(x, 2.6) > -80 && PX(x, 2.6) < W + 80) D.tree(ctx, PX(x, 2.6), sc.Y(2.6), 7 * s, "oak", "autumn", Math.max(1.2, sc.lw * 0.6), 0.3 + i * 0.2); });
    if (PX(BK1, BKR) > -20 && PX(BK0, BKR) < W + 20) put(BK0, BKR, 1, function () { bunkerShape(ctx, bunk); });
  }
  function drawCompostYard() {
    if (PX(LDX0 - 4, 1) > W + 40 && PX(CX + 12, 1) > W + 40) return;
    if (PX(CX + 12, 1) < -40 && PX(LPARK2 + 4, 1) < -40) return;
    // the water pipe: a standpipe with a red valve and a spray bar over the heap
    put(PIPEX, PIPER, -1, function () {
      var l0 = Farm.LW;
      tube(ctx, 0, 0, 0, -4.3, 0.14, "#8C97A6"); tube(ctx, 0, -4.3, 4.3, -4.3, 0.12, "#8C97A6");
      for (var i = 0; i < 5; i++) Rr(ctx, 0.5 + i * 0.9 - 0.06, -4.3, 0.12, 0.16, 0.03, "#5D6675", l0 * 0.6);
      Cc(ctx, 0, -1.2, 0.22, "#D8403A", l0 * 0.8); Ln(ctx, -0.22, -1.2, 0.22, -1.2, "#A82E28", 0.05); Ln(ctx, 0, -1.42, 0, -0.98, "#A82E28", 0.05);
      if (spray > 0.05) { ctx.save(); ctx.globalAlpha = 0.45 * spray; for (var j = 0; j < 5; j++) { var nx = 0.5 + j * 0.9; Pp(ctx, [nx - 0.04, -4.14, nx + 0.04, -4.14, nx + 0.4, -2.4, nx - 0.4, -2.4], "#9ED8F7", 0); } ctx.restore(); }
    });
    if (manure.lvl > 0.01) put(MX, 1.02, 1, function () { mound(ctx, 0, 2.0 * (0.5 + 0.5 * manure.lvl), 1.0 * manure.lvl, MANURE, 31, "#5E4329"); });
    if (heap.lvl > 0.01) put(CX, 1.0, 1, function () { mound(ctx, 0, 4.2 * Math.sqrt(heap.lvl), 1.8 * heap.lvl, compCol(heap.mix, heap.wet, 0), 41, heap.mix > 0.5 ? "#6E5236" : STRAWD); });
    put(loader.x, 1, 1, function () { loaderShape(ctx, { wheel: loader.wheel, lift: loader.lift, tilt: loader.tilt, load: loader.load, col: loader.col, time: time, beacon: !!mo && stepId === "compost" }); });
  }
  function drawLorry() {
    put(lorry.x, LR, 1, function () { lorryShape(ctx, { wheel: lorry.wheel, tip: lorry.tip, gate: lorry.gate, fill: lorry.fill, time: time, beacon: !!mo && stepId === "straw" }); });
    put(0, LR, 1, function () {
      craneShape(ctx, lorry.x + LCP[0], LCP[1], crane.x, crane.h, 3.4);
      ctx.save(); ctx.translate(crane.x, -crane.h); grabShape(ctx, crane.open, crane.rot, crane.load); ctx.restore();
    });
  }
  // The growing house: we are inside. The back wall, the roof space over the top of the stage, the floor; the
  // hopper and the peat bag, the elevator, the rack and its mushrooms, the picking platform, the climate control.
  function drawHouse() {
    var xl = PX(GH0, 0.8), xr = PX(GH1, 0.8);
    if (xr < -20 || xl > W + 20) return;
    var bl = PX(GH0, RB), br = PX(GH1, RB), yf = sc.Y(RB), yw = PY(WALLH, RB), lw = Math.max(1.2, sc.lw * 0.7), i;
    // the roof space over the top, the end walls, the back wall with its panels, the floor
    ctx.fillStyle = "#C9D0D7"; ctx.fillRect(xl, 0, xr - xl, yf);
    ctx.strokeStyle = "#AEB7C1"; ctx.lineWidth = lw * 1.5;
    for (i = 0; GH0 + i * 2 < GH1; i++) { var tx0 = PX(GH0 + i * 2, RB), tx1 = PX(GH0 + i * 2 + 2, RB); ctx.beginPath(); ctx.moveTo(tx0, yw); ctx.lineTo((tx0 + tx1) / 2, yw - sc.S(RB) * 1.2); ctx.lineTo(tx1, yw); ctx.stroke(); }
    ctx.fillStyle = "#DCE1E6";
    ctx.beginPath(); ctx.moveTo(xl, PY(WALLH, 0.8)); ctx.lineTo(bl, yw); ctx.lineTo(bl, yf); ctx.lineTo(xl, sc.Y(0.8)); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(xr, PY(WALLH, 0.8)); ctx.lineTo(br, yw); ctx.lineTo(br, yf); ctx.lineTo(xr, sc.Y(0.8)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#EEF1F3"; ctx.fillRect(bl, yw, br - bl, yf - yw);
    ctx.strokeStyle = "#D2D8DE"; ctx.lineWidth = lw;
    for (var x = GH0 + 1.2; x < GH1; x += 1.2) { ctx.beginPath(); ctx.moveTo(PX(x, RB), yw + 2); ctx.lineTo(PX(x, RB), yf - 2); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.strokeRect(bl, yw, br - bl, yf - yw);
    ctx.fillStyle = "#B9BEC2"; ctx.beginPath(); ctx.moveTo(bl, yf); ctx.lineTo(br, yf); ctx.lineTo(xr, sc.Y(0.8)); ctx.lineTo(xr, H); ctx.lineTo(xl, H); ctx.lineTo(xl, sc.Y(0.8)); ctx.closePath(); ctx.fill();
    // lights under the roof
    for (var lx = GH0 + 1.5; lx < GH1 - 0.5; lx += 2.5) {
      var a = PX(lx - 0.5, 1.3), b = PX(lx + 0.5, 1.3), y = PY(5.25, 1.3), th = Math.max(3, sc.S(1.3) * 0.08);
      ctx.fillStyle = "#FFF6CC"; ctx.fillRect(a, y, b - a, th); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.strokeRect(a, y, b - a, th);
    }
    // the climate control on the back wall, the air duct along under the roof
    put(CLX, RB - 0.02, 1, function () {
      var l0 = Farm.LW;
      tube(ctx, 0.2, -CLH - 0.45, 0.2, -4.6, 0.16, "#C3CCD6");
      Rr(ctx, -0.42, -CLH - 0.48, 0.84, 0.95, 0.06, "#D3DAE2", l0);
      Cc(ctx, -0.12, -CLH - 0.03, 0.2, "#FFFFFF", l0 * 0.8);
      var na = -PI * 0.8 + duct.inf * PI * 0.6; Ln(ctx, -0.12, -CLH - 0.03, -0.12 + Math.cos(na) * 0.15, -CLH - 0.03 + Math.sin(na) * 0.15, "#D8403A", 0.05);
      Cc(ctx, 0.24, -CLH - 0.2, 0.07, duct.inf > 0.5 ? "#3DBA4E" : "#8C97A6", l0 * 0.6);
      Cc(ctx, 0.24, -CLH + 0.12, 0.07, duct.mist > 0.5 ? "#5BB5F0" : "#8C97A6", l0 * 0.6);
    });
    put(0, 1.3, 1, function () {
      var rad = lerp(0.09, 0.26, duct.inf), y = -4.6;
      Rr(ctx, GH0 + 0.8, y - rad, GH1 - GH0 - 1.6, rad * 2, rad, "#E9EEF2", Farm.LW);
      for (var hx = GH0 + 1.2; hx < GH1 - 1; hx += 0.6) Cc(ctx, hx, y + rad * 0.5, 0.03, "#8C97A6", 0);
    });
    // the rack: posts and three shelves; the compost and peat on them; the mushrooms
    put(RK0, 1, 1, function () {
      var l0 = Farm.LW, L = RK1 - RK0;
      [0, L].forEach(function (x) { Rr(ctx, x - 0.06, -TB[NT - 1] - 0.75, 0.12, TB[NT - 1] + 0.75, 0.03, "#A9B4C1", l0 * 0.8); });
      for (var t = 0; t < NT; t++) {
        var y = -TB[t], s = shelf[t];
        if (s.c > 0.01) Rr(ctx, 0, y - 0.22, L * s.c, 0.22, 0.02, DARKC, l0 * 0.7);
        if (s.p > 0.01) { Rr(ctx, 0, y - 0.3, L * s.p, 0.09, 0.02, PEAT, l0 * 0.6); for (var k = 0; k < L * s.p * 4; k++) Cc(ctx, 0.1 + k * 0.25, y - 0.26, 0.018, PEATL, 0); }
        Rr(ctx, -0.05, y, L + 0.1, 0.1, 0.02, "#C3CCD6", l0 * 0.8);
      }
    });
    mush.forEach(function (m) {
      if (m.picked) return;
      put(m.x, 1, 1, function () { ctx.translate(0, -bedTop(m.t)); mushroom(ctx, m.g, m.wig); });
    });
    // the hopper under the peat bag's frame, the elevator up to the rack
    put(HOP, 0.98, 1, function () {
      var l0 = Farm.LW;
      [-1.05, 1.05].forEach(function (x) { Rr(ctx, x - 0.07, -3.7, 0.14, 3.7, 0.03, "#8C97A6", l0 * 0.8); });
      Rr(ctx, -1.2, -3.8, 2.4, 0.16, 0.03, "#5D6675", l0 * 0.8);
      if (bag.lvl > 0.02) {
        var bh = 0.5 + 1.0 * bag.lvl, top = -3.55;
        Ln(ctx, -0.45, -3.64, -0.4, top + 0.05, INK, 0.05); Ln(ctx, 0.45, -3.64, 0.4, top + 0.05, INK, 0.05);
        Rr(ctx, -0.55, top, 1.1, bh, 0.18, "#F2F2EE", l0);
        Ln(ctx, -0.4, top + 0.25, 0.4, top + 0.25, "#C8CFD6", 0.04);
        Pp(ctx, [-0.12, top + bh - 0.02, 0.12, top + bh - 0.02, 0.08, top + bh + 0.22, -0.08, top + bh + 0.22], "#F2F2EE", l0 * 0.7);
      }
      if (bag.pour) { ctx.save(); ctx.globalAlpha = 0.85; Rr(ctx, -0.06, -2.2 + (1 - bag.lvl), 0.12, 0.95, 0.04, PEAT, 0); ctx.restore(); }
      var lv = Math.max(hop.lvl, hop.peat);
      if (lv > 0.01) { ctx.save(); ctx.translate(0, -1.3); mound(ctx, 0, 1.5, 0.3 * lv, hop.peat > hop.lvl ? PEAT : DARKC, 51, null); ctx.restore(); }
      Pp(ctx, [-0.85, -1.35, 0.85, -1.35, 0.35, -0.55, -0.35, -0.55], "#7C8696", l0);
      Farm.shine(ctx, -0.7, -1.25, 0.7, -1.25, 0.05);
      [-0.3, 0.3].forEach(function (x) { Ln(ctx, x, -0.55, x * 1.4, 0, INK, 0.1); Ln(ctx, x, -0.55, x * 1.4, 0, "#8C97A6", 0.06); });
    });
    put(0, 0.98, 1, function () {
      elevatorShape(ctx, HOP + 0.45, 0.75, ELX, elev.h, elev.phase, elev.run > 0.5 ? elev.col : null);
      switchBox(ctx, ELX - 0.12, 1.25, elev.run > 0.5, time);
    });
    // the picking platform with the picker, the punnet on its rail, the mushroom flying into it
    put(plat.x, PR, 1, function () {
      platformShape(ctx, plat.h, plat.stack, time);
      ctx.save(); ctx.translate(0.0, -plat.h - 0.12); picker(ctx, plat.hand, plat.bend); ctx.restore();
      ctx.save(); ctx.translate(-0.62, -plat.h - 1.12); punnet(ctx, plat.n); ctx.restore();
    });
    mush.forEach(function (m) {
      if (m.fly < 0) return;
      var f = m.fly, sx = m.x, sh = bedTop(m.t), ex = plat.x - 0.62, eh = plat.h + 1.25;
      put(lerp(sx, ex, f), 1, 1, function () { ctx.translate(0, -(lerp(sh, eh, f) + Math.sin(PI * f) * 0.5)); ctx.scale(1 - 0.5 * f, 1 - 0.5 * f); mushroom(ctx, 1); });
    });
    // the end walls' edges
    var cw = Math.max(6, sc.S(0.8) * 0.4);
    ctx.fillStyle = "#4E7A5C"; ctx.fillRect(xl - cw, 0, cw, H); ctx.fillRect(xr, 0, cw, H);
    ctx.strokeStyle = INK; ctx.lineWidth = lw * 1.4; ctx.strokeRect(xl - cw, -5, cw, H + 10); ctx.strokeRect(xr, -5, cw, H + 10);
  }
  function drawBirds() {
    var b = birds;
    for (var i = 0; i < 3; i++) {
      var x = PX(b.x0 + b.t * 4.5 + i * 1.6, 1.6), y = PY(6.5 + Math.sin(b.t * 2 + i) * 0.6 - i * 0.4, 1.6);
      D.gull(ctx, x, y, sc.S(1.6) * 0.9, b.t * 2.4 + i * 0.3, false);
    }
  }
  function drawRing() {
    if (phase !== "ready" || (drag && drag.kind !== "act")) return;
    var p = targetPt(); if (!p) return;
    var b = cv.getBoundingClientRect();
    Farm.drawRing(ctx, p.x - b.left, p.y - b.top, time, { r: 26, grow: 7, glow: glow });
  }

  // =====================================================================================================
  // Loop
  // =====================================================================================================
  var last = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    if (!(window.Toybox && Toybox.timer.phase() === "resting")) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  function onEnding(done) { ending = true; setTimeout(function () { elev.run = 0; spray = 0; snd.engine(-1); snd.soil(0); snd.pour(0); done(); }, 2600); }
  function onWake() { ending = false; dusk = 0; }

  // =====================================================================================================
  // Start
  // =====================================================================================================
  resize();
  bringIn("straw");
  follow(0, true);
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);
  else window.addEventListener("resize", resize);

  Toybox.init({
    app: "farm",
    badge: $("tbadge"),
    timerIntro: "When time is up, the machines stop and the controls lock. The timer carries on across the Tractor Ted pages.",
    goodbyeOption: "End with a “Goodnight, farm” button to press",
    farewellText: "Time to say goodnight to the farm",
    goodbyeLabel: "Goodnight, farm",
    farewellDone: "Night night, farm!",
    restLine: "The farm is resting.",
    restLine2: "The machines will be right here next time.",
    restArt: Farm.restArt,
    soundNote: "Soft engine, crane and elevator sounds. Hold for 2 seconds.",
    onEnding: onEnding,
    onRest: onWake,
    onWake: onWake,
    onSound: function (on) { if (on) snd.chime(); }
  });
  // leaving the page while a machine works switches it off quietly
  Toybox.offFirst({ running: function () { return !!mo || elev.run > 0; }, off: function (done) { mo = null; elev.run = 0; spray = 0; snd.engine(-1); snd.pour(0); snd.soil(0); done(); } });
  requestAnimationFrame(loop);

  if (/[?&]debug\b/.test(location.search)) window.__farm = {
    state: function () {
      var d = SUB[key()], want = d ? d.part : null;
      if (want === "mush") { var i = nextMush(); want = i >= 0 ? "m" + i : null; }
      return { step: stepId, sub: sub, phase: phase, want: want, grabs: grabs, punnets: punnets, picked: mush.filter(function (m) { return m.picked; }).length,
        lorry: lorry.x, loader: loader.x, heap: heap.lvl, bunk: bunk.fill, cook: bunk.cook, shelves: shelvesDone(), peat: shelf[0].p, grown: mush[0].g,
        plat: plat.h, coach: coach.text(), parts: parts.length, t: mo ? mo.t : -1 };
    },
    screen: function () { return targetPt(); },
    target: function () { return targetPt(); },
    surprise: surprise,
    tap: function (p) { tapPart(p); },
    parts: function () { return partList(); },
    drag: function () { return drag && drag.kind; },
    ghost: function () { return ghost.show(); }
  };
})();
