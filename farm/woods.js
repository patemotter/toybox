(function () {
  "use strict";
  // Timberrrrr! (and Chip Chipping): work in the woods at the edge of the farm, the way the episodes show it.
  // Logs (the Timberrrrr! episode: where do fence posts come from?), five steps he does himself, each tap on a
  //   machine part plays that one control's motion, the vehicles also drive with a drag:
  //   Fell:    drive the forestry harvester to the spruce, the head grips it, the saw cuts, "Timber!".
  //   Logs:    each tap feeds the trunk through the head (the knives strip the branches) and the saw cuts a log.
  //   Lorry:   the timber lorry's crane loads the logs; he drives it to the sawmill's weighbridge, counts its six
  //            wheels, and its crane lifts the logs onto the holding pile.
  //   Sawmill: drive the log loader to the pile, grab the logs, drive to the log deck and drop them on it; then
  //            each log rolls onto the conveyor: the squaring saw cuts off the round sides, the splitting saw
  //            cuts it into two square fence posts (an end-view inset shows it).
  //   Fence:   at the field Farmer Tom stands a post in the gap, the tractor backs up
  //            with the post knocker and knocks it in, Farmer Tom fixes the netting: the sheep are safe.
  // Chipper: the tractor's seat swivels round to face the wood chipper on the back; the chipper's crane
  //          unfolds, grabs the branches off the brash pile and lays them on the infeed table; the rollers pull
  //          them in and the chips shoot out of the spout in a big arc into the trailer, which fills to a heap.
  // One world along the machine line (metres): the woods, the road, the sawmill, the field. On an upright stage
  // the stage is split: the whole job on top (every machine fully in view) and a close-up of the work below.
  var $ = function (id) { return document.getElementById(id); };
  var U = Farm.u, clamp = U.clamp, lerp = U.lerp, ease = U.ease, hash = U.hash, mix = U.mix, INK = U.INK;
  var D = Farm.draw, SH = Farm.shape, snd = Farm.sound, TAU = Math.PI * 2, PI = Math.PI;
  var Pp = SH.P, Rr = SH.R, Cc = SH.C, Ln = SH.Ln, tube = SH.tube, fs = SH.fs;
  var NAME = (Farm.NAMES && Farm.NAMES.woods) || "Timberrrrr!";
  document.title = NAME; $("title").textContent = NAME;
  function LW() { return Farm.LW; }
  function shine(c, x1, y1, x2, y2, w) { Ln(c, x1, y1, x2, y2, "rgba(255,255,255,0.45)", w); }
  var Y1 = "#F2B33A", YD = "#C98A1A", RED = "#D8403A", REDD = "#A82E28", CH = "#E5612F", CHD = "#B54520";
  var BARK = "#8A5A35", BARKD = "#6B4428", WOOD = "#EBCF98", WOODD = "#C9A46A", NEEDLE = "#2C8538", NEEDLE2 = "#3FA246";
  var CHIP = ["#D9B36A", "#C99A50", "#EBCB8A", "#B9884A"];

  // ---------- State ----------
  var KEY = "farm-woods-v1";
  var startFresh = !!(window.Toybox && Toybox.fresh());
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (startFresh || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  function num(v) { return typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : 0; }
  var posts = num(saved.posts), loads = num(saved.loads);
  var job = saved.job === "chip" ? "chip" : "logs";
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ posts: posts, loads: loads, job: job })); } catch (e) { /* ignore */ } }

  // ---------- The world (metres along the machine line) ----------
  // Logs, left to right: the harvester works at HV0 on the spruce at x = 0 and the logs stack at STKA_X; the timber
  // lorry (front axle at LXF, depth LR) loads there and drives to the weighbridge (WB; the lorry stops at LXW); its
  // crane puts the logs on the holding pile (STK2); the loader carries them to the log deck (DECK); the saw line
  // squares them (SAW1) and splits them (SAW2); the posts land on PSTK. The field: the fence (posts FENCE_X, the
  // gap at HOLE), the new posts' pile (PPILE), the tractor with the post knocker (parked at TED0, knocking at TEDK).
  var HV0 = -7.4, HPIV = [2.7, 2.75], TH = 8.6, CUT_H = 0.4, SG = 0.9, LOGL = 2.5;
  var STKA_X = -2.05;
  var PARK = { x: HV0 + 4.95, h: 1.45, r: 1, rot: 0 };
  var LR = 0.96, LXF = 4.6, WB = 62, LXW = WB + 6, LBUNK = -9.3, LBED = 1.66, LCP = [-1.9, 3.2], LREST = [-3.6, 3.0];
  var STK2 = WB + 12.5, DECK = WB + 25, LD_STK = STK2 + 3.1, LD_DECK = DECK - 3.1, LDP = WB + 19.5;
  var SAW1 = DECK + 5.4, SAW2 = DECK + 9.4, CONV1 = DECK + 13.2, PSTK = DECK + 15.4, CONVH = 1.1, MSPD = 3.0;
  var HOLE = 152, PPILE = HOLE - 3.8, TED0 = HOLE + 8.5, TEDK = HOLE + 2.05, FENCE_X = [137.6, 141.2, 144.8, 148.4, 155.6, 159.2, 162.8, 166.4];
  var WOODS_END = 24, HUT = [WB + 16, 1.4];
  // Chipper: the tractor's rear axle at x = 0 facing left; the chipper behind it (to the right), the brash pile
  // further right, the trailer parked in front of the tractor.
  var CPIV = [2.9, 2.65], TRL = -5.0, TRC = TRL - 4.5, PILE0 = 5.0, PILE1 = 8.7, NOZ = [1.0, 4.05];
  var GFOLD = { x: 3.45, h: 2.9 }, GREADY = { x: 5.5, h: 2.75 }, GUP = { x: 5.4, h: 3.05 }, GTUP = { x: 4.15, h: 2.65 }, GTAB = { x: 4.15, h: 1.55 };
  var EDGE = { logs: [-9.6, 6.2, 10.4], chip: [-8.6, 0.1, 10.6] }, EDGE_R = 1.16;

  // ---------- Small drawing helpers (farm.js style) ----------
  function wheel(c, cx, cy, r, rot, o) {
    o = o || {};
    var n = o.lugs || Math.round(r * 22), i, a, l0 = LW();
    c.save(); c.translate(cx, cy);
    for (i = 0; i < n; i++) {
      a = rot + i * TAU / n;
      var co = Math.cos(a), s = Math.sin(a), c2 = Math.cos(a + 0.12), s2 = Math.sin(a + 0.12);
      Pp(c, [co * r * 0.93, s * r * 0.93, co * r * 1.06, s * r * 1.06, c2 * r * 1.06, s2 * r * 1.06, c2 * r * 0.93, s2 * r * 0.93], "#2A2C36", l0 * 0.7);
    }
    Cc(c, 0, 0, r * 0.97, "#33363F", l0);
    Cc(c, 0, 0, r * 0.8, "#40434E", 0);
    var rimR = r * (o.rim || 0.6);
    Cc(c, 0, 0, rimR, o.rimCol || "#C3CCD6", l0);
    Cc(c, 0, 0, rimR * 0.78, "#A9B4C1", l0 * 0.6);
    Cc(c, 0, 0, rimR * 0.36, "#8C97A6", l0 * 0.7);
    for (i = 0; i < 6; i++) { a = rot + i * TAU / 6; Cc(c, Math.cos(a) * rimR * 0.55, Math.sin(a) * rimR * 0.55, rimR * 0.07, "#6E7887", 0); }
    c.restore();
  }
  function driverFig(c, x, y, sx, seat) {
    var l0 = LW();
    c.save(); c.translate(x, y); c.scale(Math.abs(sx) < 0.15 ? (sx < 0 ? -0.15 : 0.15) : sx, 1);
    if (seat) { Rr(c, -0.5, -0.12, 0.18, 0.72, 0.07, "#2B3040", l0 * 0.6); Rr(c, -0.5, 0.5, 0.7, 0.14, 0.05, "#2B3040", l0 * 0.6); }
    Rr(c, -0.26, 0.1, 0.52, 0.5, 0.16, "#3D6FB6", l0 * 0.7);
    Cc(c, 0, 0, 0.17, "#F2C8A0", l0 * 0.7);
    Pp(c, [-0.18, -0.04, -0.16, -0.2, 0.16, -0.2, 0.3, -0.06], "#E8473B", l0 * 0.6);
    c.restore();
  }
  function beacon(c, x, y, on, time) {
    var bc = on ? (Math.sin((time || 0) * 9) > 0 ? "#FFD34D" : "#F08A1C") : "#F2A23A";
    if (on) { c.save(); c.globalAlpha = 0.35 + 0.3 * Math.max(0, Math.sin(time * 9)); Cc(c, x, y - 0.08, 0.32, "#FFD34D", 0); c.restore(); }
    c.beginPath(); c.arc(x, y, 0.12, Math.PI, 0); c.closePath(); fs(c, bc, LW() * 0.7);
  }
  // a spruce in screen px (the woods), trunk foot at (x, y), height h
  function spruce(c, x, y, h, lw, col) {
    c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = "round";
    c.fillStyle = "#6E4A2E"; c.fillRect(x - h * 0.035, y - h * 0.22, h * 0.07, h * 0.22); c.strokeRect(x - h * 0.035, y - h * 0.22, h * 0.07, h * 0.22);
    for (var i = 0; i < 4; i++) {
      var yt = y - h + i * h * 0.19, yb = yt + h * 0.36, hw = h * (0.12 + i * 0.055);
      c.beginPath(); c.moveTo(x, yt); c.lineTo(x + hw, yb); c.quadraticCurveTo(x, yb - h * 0.05, x - hw, yb); c.closePath();
      c.fillStyle = col; c.fill(); c.stroke();
    }
  }

  // =====================================================================================================
  // The tree, the logs and the brash (could move into farm.js)
  // =====================================================================================================
  function diam(s) { return Math.max(0.1, 0.46 - 0.034 * s); }
  function makeWhorls() { var a = []; for (var s = 2.4; s <= 8.0001; s += 0.5) a.push({ s: s, w: 0.28 + 1.4 * Math.pow(1 - (s - 2.4) / 5.8, 0.9), off: false }); return a; }
  function bough(c, s, w, i, sway) {
    var dr = 0.42 + w * 0.14, sw = sway || 0;
    c.beginPath(); c.moveTo(0, -s - 0.42); c.lineTo(w + sw, -s + dr); c.quadraticCurveTo(w * 0.45, -s + dr * 0.5, 0, -s + 0.22);
    c.quadraticCurveTo(-w * 0.45, -s + dr * 0.5, -w + sw, -s + dr); c.closePath();
    fs(c, i % 2 ? NEEDLE : NEEDLE2, LW() * 0.8);
  }
  // A spruce in its own frame: the butt at the origin, the stem up along -y (s = metres up the stem).
  // o = { s0 (lowest wood left), top (the spire is still on), whorls, cut (saw line 0..1), butt (show the cut face), sway }
  function treeShape(c, o) {
    var l0 = LW(), s0 = o.s0, s1 = TH - 0.3, i;
    c.beginPath(); c.moveTo(-diam(s0) / 2, -s0); c.lineTo(-diam(s1) / 2, -s1); c.lineTo(diam(s1) / 2, -s1); c.lineTo(diam(s0) / 2, -s0); c.closePath(); fs(c, BARK);
    for (i = 0; i < 12; i++) {
      var bs = s0 + 0.25 + hash(i, 3) * (s1 - s0 - 0.6), dx = (hash(i, 4) - 0.5) * diam(bs) * 0.55;
      Ln(c, dx, -bs, dx, -bs - 0.3, BARKD, 0.035);
    }
    if (o.butt) { c.beginPath(); c.ellipse(0, -s0, diam(s0) / 2, 0.07, 0, 0, TAU); fs(c, WOOD, l0 * 0.7); }
    var sw = o.sway || 0;
    for (i = 0; i < o.whorls.length; i++) { var w = o.whorls[i]; if (!w.off) bough(c, w.s, w.w, i, sw * (w.s / TH)); }
    if (o.top) Pp(c, [sw * 0.5, -TH - 0.35, -0.3 + sw * 0.4, -TH + 0.45, 0.3 + sw * 0.4, -TH + 0.45], NEEDLE2, l0 * 0.8);
    if (o.cut > 0) { var d = diam(CUT_H); Ln(c, -d / 2, -CUT_H, -d / 2 + d * o.cut, -CUT_H, INK, 0.06); }
  }
  // A log lying along x, centred at the origin. pt = how far its right end is pointed (0..1).
  function logShape(c, len, d, pt) {
    var l0 = LW(), xl = -len / 2, xr = len / 2, pl = 0.48 * clamp(pt || 0, 0, 1), i;
    c.beginPath(); c.moveTo(xl, -d / 2); c.lineTo(xr - pl, -d / 2); c.lineTo(xr, 0); c.lineTo(xr - pl, d / 2); c.lineTo(xl, d / 2); c.closePath(); fs(c, BARK);
    for (i = 0; i < 5; i++) { var bx = xl + 0.2 + hash(i, len * 7) * (len - pl - 0.5); Ln(c, bx, -d * 0.18, bx + 0.32, -d * 0.22, BARKD, 0.03); Ln(c, bx + 0.2, d * 0.15, bx + 0.5, d * 0.12, BARKD, 0.03); }
    if (pl > 0.01) { Pp(c, [xr - pl, -d / 2, xr, 0, xr - pl, d / 2, xr - pl - 0.04, d * 0.15, xr - pl - 0.04, -d * 0.15], WOOD, l0 * 0.8); Ln(c, xr - pl * 0.6, -d * 0.2, xr - pl * 0.6, d * 0.2, WOODD, 0.025); }
    else Ln(c, xr, -d / 2, xr, d / 2, INK, l0);
    c.beginPath(); c.ellipse(xl, 0, d * 0.13, d / 2, 0, 0, TAU); fs(c, WOOD, l0 * 0.8);
    c.beginPath(); c.ellipse(xl, 0, d * 0.06, d * 0.24, 0, 0, TAU); c.strokeStyle = WOODD; c.lineWidth = 0.025; c.stroke();
  }
  // A fence post: square-sawn timber with flat ends (the sawmill cuts flat posts for fencing, not a pencil point)
  function postShape(c, len, d) {
    var l0 = LW(), xl = -len / 2, xr = len / 2, h = d * 0.82;
    Rr(c, xl, -h / 2, len, h, 0.02, WOOD, l0);
    Pp(c, [xl, -h / 2, xl + 0.08, -h / 2 - 0.06, xr + 0.08, -h / 2 - 0.06, xr, -h / 2], WOODD, l0 * 0.7);
    Ln(c, xl + 0.2, -h * 0.15, xr - 0.2, -h * 0.15, WOODD, 0.03);
    Ln(c, xl + 0.35, h * 0.2, xr - 0.15, h * 0.2, WOODD, 0.03);
    Pp(c, [xr, -h / 2, xr + 0.08, -h / 2 - 0.06, xr + 0.08, h / 2 - 0.06, xr, h / 2], WOODD, l0 * 0.8);
    c.beginPath(); c.arc(xr + 0.04, 0, h * 0.3, -PI * 0.4, PI * 0.4); c.strokeStyle = "#A88348"; c.lineWidth = 0.025; c.stroke();
  }
  // two stakes that hold a stack of logs or posts tidy (x is the stack's middle)
  function stakes(c, half, h) { [-half, half].forEach(function (x) { Rr(c, x - 0.07, -h, 0.14, h, 0.04, "#7A5236", LW() * 0.8); }); }
  // a lumpy pile of branches from xa to xb, height hh
  function brashPile(c, xa, xb, hh, seed) {
    if (hh <= 0.02 || xb - xa < 0.1) return;
    var n = Math.max(5, Math.round((xb - xa) * 3)), i;
    for (i = 0; i < Math.round((xb - xa) * 3); i++) {
      var sx = lerp(xa + 0.2, xb - 0.2, hash(i, seed)), sy = -hh * (0.2 + 0.6 * hash(i, seed + 1)), a = (hash(i, seed + 2) - 0.5) * 1.2;
      Ln(c, sx - Math.cos(a) * 0.5, sy - Math.sin(a) * 0.5, sx + Math.cos(a) * 0.5, sy + Math.sin(a) * 0.5, INK, 0.11);
      Ln(c, sx - Math.cos(a) * 0.5, sy - Math.sin(a) * 0.5, sx + Math.cos(a) * 0.5, sy + Math.sin(a) * 0.5, BARK, 0.06);
    }
    c.beginPath(); c.moveTo(xa, 0);
    for (i = 0; i <= n; i++) { var f = i / n; c.lineTo(lerp(xa, xb, f), -hh * Math.pow(Math.sin(f * Math.PI), 0.6) - (i % 2 ? 0.08 : 0) * Math.min(1, hh * 2)); }
    c.closePath(); fs(c, NEEDLE, LW() * 0.8);
    c.save(); c.clip();
    for (i = 0; i < Math.round((xb - xa) * 4); i++) {
      var bx = lerp(xa, xb, hash(i, seed + 5)), by = -hh * hash(i, seed + 6) * 0.95, w = 0.25 + 0.2 * hash(i, seed + 7);
      Pp(c, [bx, by - 0.2, bx + w, by + 0.15, bx - w, by + 0.15], i % 2 ? NEEDLE2 : "#2A6B33", LW() * 0.5);
    }
    c.restore();
  }

  // =====================================================================================================
  // The machines (could move into farm.js as Farm.draw.harvester / head / pointer / chipper)
  // =====================================================================================================
  // The forestry harvester: six wheels (a big pair at the back, a bogie at the front), the engine at the back,
  // the cab with big windows at the front and the crane's base just ahead of the cab. Origin on the ground under
  // the middle, facing +x. st = { wheel, time, beacon }
  function harvester(c, st) {
    var l0 = LW(), rot = st.wheel || 0, i;
    Rr(c, -3.35, -1.62, 6.4, 0.5, 0.08, "#3A3F4E");
    c.beginPath(); c.moveTo(-3.6, -1.45); c.lineTo(-3.6, -2.4); c.quadraticCurveTo(-3.6, -2.7, -3.3, -2.7); c.lineTo(-0.85, -2.7); c.lineTo(-0.62, -2.35); c.lineTo(-0.62, -1.45); c.closePath(); fs(c, Y1);
    shine(c, -3.35, -2.56, -0.95, -2.56, 0.07);
    for (i = 0; i < 4; i++) Ln(c, -3.38 + i * 0.17, -2.35, -3.38 + i * 0.17, -1.75, YD, 0.06);
    Rr(c, -2.55, -2.32, 1.45, 0.6, 0.08, YD, l0 * 0.7);
    tube(c, -1.05, -2.7, -1.05, -3.25, 0.12, "#4E5463"); Rr(c, -1.14, -3.38, 0.18, 0.16, 0.04, "#3A3F4E", l0 * 0.6);
    Rr(c, -0.62, -1.98, 0.44, 0.78, 0.08, "#3A3F4E");
    Rr(c, -0.2, -1.98, 3.35, 0.44, 0.08, Y1);
    Pp(c, [-0.05, -1.92, 0.02, -3.45, 1.9, -3.45, 2.12, -1.92], "#2B3040");
    Pp(c, [0.08, -2.02, 0.14, -3.33, 1.78, -3.33, 1.98, -2.02], "#BFE7FA", l0 * 0.6);
    driverFig(c, 0.95, -2.68, 1);
    Ln(c, 1.42, -2.2, 1.6, -2.45, INK, 0.05);
    c.save(); c.globalAlpha = 0.5; Pp(c, [0.38, -3.33, 0.72, -3.33, 0.22, -2.12, 0.14, -2.45], "#FFFFFF", 0); c.restore();
    Ln(c, 1.0, -3.4, 1.02, -2.0, "#2B3040", 0.06);
    Rr(c, -0.18, -3.68, 2.38, 0.26, 0.08, Y1);
    shine(c, -0.05, -3.6, 2.05, -3.6, 0.05);
    beacon(c, 0.3, -3.68, st.beacon, st.time);
    Rr(c, 1.72, -3.84, 0.34, 0.16, 0.05, "#FFE98A", l0 * 0.7);
    // ladder
    for (i = 0; i < 3; i++) Ln(c, -0.12, -0.75 - i * 0.38, 0.14, -0.75 - i * 0.38, INK, 0.05);
    Ln(c, -0.12, -0.6, -0.12, -1.6, INK, 0.05); Ln(c, 0.14, -0.6, 0.14, -1.6, INK, 0.05);
    // the crane base: a pillar on a slewing ring
    Pp(c, [2.12, -1.94, 3.18, -1.94, 2.98, -2.62, 2.42, -2.62], YD);
    Cc(c, 2.7, -2.75, 0.3, "#7C8696");
    Cc(c, 2.7, -2.75, 0.12, "#C3CCD6", l0 * 0.7);
    // wheels
    wheel(c, -2.3, -0.82, 0.82, rot / 0.82, { rim: 0.55 });
    Rr(c, 1.0, -0.82, 1.8, 0.26, 0.08, "#3A3F4E");
    wheel(c, 1.25, -0.64, 0.64, rot / 0.64, { rim: 0.55 });
    wheel(c, 2.55, -0.64, 0.64, rot / 0.64, { rim: 0.55 });
    c.beginPath(); c.arc(-2.3, -0.82, 1.0, -Math.PI + 0.3, -0.35); c.arc(-2.3, -0.82, 0.88, -0.35, -Math.PI + 0.3, true); c.closePath(); fs(c, Y1);
  }
  // The harvester head, in its own frame: the stem runs along y through x = 0 (the saw at +y, the butt end).
  // The rotator link to the crane is at (-0.85, -0.1). st = { grip (0..1), saw (0..1 bar out), roll, time }
  var HEAD_TIP = [-0.85, -0.1];
  function harvesterHead(c, st) {
    var l0 = LW(), g = clamp(st.grip || 0, 0, 1), op = 1 - g, i, t = st.time || 0;
    tube(c, -0.45, -0.1, HEAD_TIP[0], HEAD_TIP[1], 0.16, "#5D6675");
    Cc(c, HEAD_TIP[0], HEAD_TIP[1], 0.14, "#7C8696", l0 * 0.8);
    if (st.saw > 0.02) {
      var bl = st.saw * 1.05;
      Rr(c, -0.42, 0.43, bl + 0.12, 0.14, 0.07, "#C3CCD6", l0 * 0.8);
      for (i = 0; i * 0.12 < bl; i++) Cc(c, -0.36 + i * 0.12 + ((t * 0.9) % 0.12), 0.5, 0.025, INK, 0);
    }
    Rr(c, -0.58, -0.62, 0.66, 1.12, 0.12, Y1);
    shine(c, -0.48, -0.5, -0.48, 0.25, 0.05);
    Rr(c, -0.58, 0.34, 0.66, 0.26, 0.06, YD, l0 * 0.8);
    // the spiked feed roller over the stem
    Cc(c, 0.02, -0.16, 0.27, "#3A3F4E");
    for (i = 0; i < 8; i++) { var a = (st.roll || 0) + i * TAU / 8; Ln(c, 0.02 + Math.cos(a) * 0.17, -0.16 + Math.sin(a) * 0.17, 0.02 + Math.cos(a) * 0.3, -0.16 + Math.sin(a) * 0.3, INK, 0.06); }
    Cc(c, 0.02, -0.16, 0.1, "#8C97A6", l0 * 0.7);
    // the delimbing knives wrap round the stem
    [-0.5, 0.08].forEach(function (y) {
      c.beginPath(); c.moveTo(-0.04, y - 0.1); c.quadraticCurveTo(0.42 + op * 0.2, y - 0.1 - op * 0.25, 0.28 + op * 0.36, y + 0.2 - op * 0.32);
      c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 0.13 + l0 * 2; c.stroke(); c.strokeStyle = YD; c.lineWidth = 0.13; c.stroke();
    });
  }
  // A forestry crane in world units (y = -h): the boom from the pivot, the knuckle, the telescopic stick to the tip.
  function craneGeo(px, ph, tx, th, L1) {
    var dx = tx - px, dh = th - ph, d = Math.sqrt(dx * dx + dh * dh), sg = dx >= 0 ? 1 : -1;
    var a = lerp(1.05, 0.32, clamp((d - 2) / 6, 0, 1));
    a = Math.max(a, Math.atan2(dh, Math.abs(dx)) + 0.3);
    return { ex: px + sg * Math.cos(a) * L1, eh: ph + Math.sin(a) * L1, sg: sg };
  }
  function craneShape(c, px, ph, tx, th, L1, col, colD) {
    var g = craneGeo(px, ph, tx, th, L1), l0 = LW(), ex = g.ex, ey = -g.eh;
    var mx = lerp(px, ex, 0.55), my = lerp(-ph, ey, 0.55);
    tube(c, px + g.sg * 0.2, -ph + 0.55, mx, my + 0.05, 0.1, "#C3CCD6");
    tube(c, px, -ph, ex, ey, 0.34, col);
    shine(c, lerp(px, ex, 0.15), lerp(-ph, ey, 0.15) - 0.08, lerp(px, ex, 0.85), lerp(-ph, ey, 0.85) - 0.08, 0.05);
    var sx = lerp(ex, tx, 0.55), sy = lerp(ey, -th, 0.55);
    tube(c, sx, sy, tx, -th, 0.17, "#8C97A6");
    tube(c, ex, ey, sx, sy, 0.27, col);
    tube(c, lerp(px, ex, 0.7), lerp(-ph, ey, 0.7) - 0.18, lerp(ex, sx, 0.35), lerp(ey, sy, 0.35) - 0.16, 0.08, "#C3CCD6");
    Cc(c, ex, ey, 0.17, colD, l0 * 0.8); Cc(c, px, -ph, 0.17, "#7C8696", l0 * 0.8);
    Cc(c, tx, -th, 0.1, "#5D6675", l0 * 0.7);
  }
  // ---------- The timber lorry: a red cab, the crane behind it, a log trailer; six big wheels down the side (the
  // episode counts them). Origin on the ground under the front axle, facing +x. st = { wheel, time, beacon }
  var LWHEELS = [0, -3.55, -4.75, -10.7, -11.9, -13.1], LWR = 0.56, LCOL = "#3A7FC4", LCOLD = "#2A5F96";
  function lorryShape(c, st) {
    var l0 = LW(), rot = (st.wheel || 0) / LWR, i;
    // the trailer: its bed and the three bolsters with their stakes
    Rr(c, -14.15, -1.42, 10.15, 0.3, 0.06, "#3A3F4E");
    Rr(c, -14.15, -1.66, 9.9, 0.26, 0.05, "#5D6675", l0 * 0.8);
    [-12.95, -9.3, -5.95].forEach(function (x) {
      Rr(c, x - 0.8, -1.8, 1.6, 0.16, 0.04, "#7C8696", l0 * 0.8);
      Rr(c, x - 0.86, -3.5, 0.13, 1.8, 0.04, "#8C97A6", l0 * 0.8);
      Rr(c, x + 0.73, -3.5, 0.13, 1.8, 0.04, "#8C97A6", l0 * 0.8);
    });
    Rr(c, -13.85, -1.32, 3.7, 0.14, 0.05, "#3A3F4E", l0 * 0.7);
    Rr(c, -14.3, -1.5, 0.22, 0.4, 0.04, "#E8473B", l0 * 0.7);
    // the tractor unit: chassis, fuel tank, fifth wheel under the trailer's nose
    Rr(c, -5.45, -1.22, 6.95, 0.34, 0.08, "#3A3F4E");
    Rr(c, -3.05, -1.12, 1.15, 0.52, 0.16, "#C3CCD6", l0 * 0.8);
    Rr(c, -5.2, -1.45, 1.3, 0.22, 0.05, "#5D6675", l0 * 0.7);
    // the crane pillar behind the cab
    Pp(c, [LCP[0] - 0.45, -1.22, LCP[0] + 0.45, -1.22, LCP[0] + 0.3, -LCP[1] + 0.2, LCP[0] - 0.3, -LCP[1] + 0.2], LCOL);
    Cc(c, LCP[0], -LCP[1], 0.26, "#7C8696", l0 * 0.8);
    tube(c, -1.0, -1.3, -1.0, -3.95, 0.12, "#8C97A6");
    // the cab
    Pp(c, [-0.9, -1.15, -0.9, -3.4, -0.7, -3.62, 1.0, -3.62, 1.35, -3.0, 1.45, -1.15], RED);
    Pp(c, [-0.55, -2.35, -0.55, -3.32, 0.95, -3.32, 1.2, -2.78, 1.2, -2.35], "#BFE7FA", l0 * 0.6);
    driverFig(c, 0.35, -2.62, 1);
    c.save(); c.globalAlpha = 0.5; Pp(c, [0.55, -3.32, 0.85, -3.32, 0.4, -2.35, 0.2, -2.35], "#FFFFFF", 0); c.restore();
    Ln(c, -0.85, -2.12, 1.38, -2.12, REDD, 0.06);
    shine(c, -0.6, -3.5, 0.9, -3.5, 0.05);
    Rr(c, 1.25, -2.05, 0.26, 0.82, 0.05, "#3A3F4E", l0 * 0.7);
    for (i = 0; i < 3; i++) Ln(c, 1.3, -1.9 + i * 0.25, 1.46, -1.9 + i * 0.25, "#8C97A6", 0.04);
    Rr(c, 0.85, -1.28, 0.75, 0.3, 0.06, "#3A3F4E");
    Rr(c, 1.3, -1.62, 0.2, 0.22, 0.04, "#FFE98A", l0 * 0.6);
    Rr(c, -0.65, -1.02, 0.55, 0.12, 0.03, "#5D6675", l0 * 0.6);
    beacon(c, 0.15, -3.62, st.beacon, st.time);
    // mudguards and the six wheels
    c.beginPath(); c.arc(0, -LWR, LWR + 0.18, PI, 0); c.arc(0, -LWR, LWR + 0.06, 0, PI, true); c.closePath(); fs(c, REDD, l0 * 0.8);
    Rr(c, -5.2, -1.4, 2.1, 0.14, 0.05, "#3A3F4E", l0 * 0.7);
    for (i = 0; i < LWHEELS.length; i++) wheel(c, LWHEELS[i], -LWR, LWR, rot, { rim: 0.56 });
  }
  // The weighbridge: a long steel deck set in the ground, and the hut beside it with the weight display (a bar
  // that fills and a lamp that goes green; no numbers). Origin at the deck's middle. lit 0..1, time.
  function weighDeck(c) {
    var l0 = LW();
    Rr(c, -8.2, -0.12, 16.4, 0.16, 0.03, "#9AA4B2", l0 * 0.8);
    for (var i = 0; i < 9; i++) Ln(c, -7.6 + i * 1.9, -0.1, -7.6 + i * 1.9, 0.02, "#7C8696", 0.04);
    Pp(c, [-8.2, -0.12, -9.0, 0.02, -8.2, 0.02], "#7C8696", l0 * 0.7);
    Pp(c, [8.2, -0.12, 9.0, 0.02, 8.2, 0.02], "#7C8696", l0 * 0.7);
  }
  function weighHut(c, lit, time) {
    var l0 = LW();
    Rr(c, -1.3, -2.55, 2.6, 2.55, 0.06, "#E9E2D0");
    Pp(c, [-1.55, -2.5, 0, -3.15, 1.55, -2.5], "#5E8F5A");
    Rr(c, 0.55, -1.95, 0.55, 1.95, 0.04, "#7A5236", l0 * 0.8);
    // the display: a dark panel with a bar that fills and a lamp
    Rr(c, -1.05, -2.3, 1.35, 0.95, 0.06, "#2B3040");
    Rr(c, -0.92, -2.05, 1.08, 0.24, 0.05, "#3D4458", l0 * 0.5);
    if (lit > 0.01) Rr(c, -0.9, -2.03, 1.04 * clamp(lit, 0, 1), 0.2, 0.04, lit >= 1 ? "#6FD46B" : "#FFC93C", 0);
    var on = lit >= 1;
    if (on) { c.save(); c.globalAlpha = 0.35 + 0.25 * Math.sin(time * 5); Cc(c, -0.38, -1.6, 0.2, "#9CF09A", 0); c.restore(); }
    Cc(c, -0.38, -1.6, 0.1, on ? "#3FBF4A" : "#59606E", l0 * 0.6);
  }
  // The log loader: a big wheel loader with a log grab on its arms. Origin on the ground between the axles,
  // facing +x. st = { wheel, lift (0 low .. 1 high), clamp (0 open .. 1 shut), time, beacon }
  var LDTIP = 2.8;
  function loaderH(lift) { return lerp(0.42, 2.9, clamp(lift, 0, 1)); }
  function loaderShape(c, st) {
    var l0 = LW(), rot = (st.wheel || 0) / 0.82, th = loaderH(st.lift), cl = clamp(st.clamp || 0, 0, 1);
    Rr(c, -2.45, -1.25, 4.1, 0.48, 0.08, "#3A3F4E");
    Pp(c, [-2.7, -1.05, -2.7, -2.25, -0.75, -2.3, -0.55, -1.05], Y1);
    shine(c, -2.5, -2.12, -0.95, -2.15, 0.05);
    for (var i = 0; i < 4; i++) Ln(c, -2.5 + i * 0.18, -2.0, -2.5 + i * 0.18, -1.35, YD, 0.05);
    Rr(c, -3.0, -1.75, 0.38, 0.95, 0.1, YD);
    tube(c, -1.2, -2.3, -1.2, -2.95, 0.11, "#4E5463");
    Pp(c, [-0.72, -2.2, -0.66, -3.6, 0.66, -3.6, 0.8, -2.2], "#2B3040");
    Pp(c, [-0.58, -2.3, -0.54, -3.48, 0.54, -3.48, 0.66, -2.3], "#BFE7FA", l0 * 0.6);
    driverFig(c, 0.02, -2.95, 1);
    Rr(c, -0.85, -3.76, 1.78, 0.18, 0.06, Y1);
    beacon(c, -0.1, -3.76, st.beacon, st.time);
    Rr(c, 0.75, -2.05, 0.9, 0.82, 0.1, Y1);
    // the arms and the lift ram
    tube(c, 1.1, -1.25, lerp(0.95, LDTIP - 0.4, 0.55), lerp(-2.15, -th - 0.25, 0.55), 0.13, "#C3CCD6");
    tube(c, 0.95, -2.15, LDTIP - 0.4, -th - 0.25, 0.32, Y1);
    Cc(c, 0.95, -2.15, 0.15, YD, l0 * 0.8);
    // the log grab: a back frame, two forks forward and the clamp arm on top
    Rr(c, LDTIP - 0.62, -th - 1.0, 0.24, 1.08, 0.05, "#5D6675");
    Rr(c, LDTIP - 0.62, -th - 0.04, 1.65, 0.13, 0.05, "#5D6675");
    Pp(c, [LDTIP + 1.0, -th - 0.04, LDTIP + 1.18, -th + 0.06, LDTIP + 1.0, -th + 0.09], "#5D6675", l0 * 0.7);
    c.save(); c.translate(LDTIP - 0.5, -th - 1.0); c.rotate(lerp(-1.05, 0.28, cl));
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0.95, -0.25, 1.35, 0.42);
    c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 0.16 + l0 * 2; c.stroke(); c.strokeStyle = "#7C8696"; c.lineWidth = 0.16; c.stroke();
    c.restore();
    Cc(c, LDTIP - 0.5, -th - 1.0, 0.1, "#3A3F4E", l0 * 0.7);
    // wheels and mudguards
    wheel(c, -1.6, -0.82, 0.82, rot, { rim: 0.55 });
    wheel(c, 1.35, -0.82, 0.82, rot, { rim: 0.55 });
    [-1.6, 1.35].forEach(function (x) { c.beginPath(); c.arc(x, -0.82, 1.0, -PI + 0.35, -0.35); c.arc(x, -0.82, 0.9, -0.35, -PI + 0.35, true); c.closePath(); fs(c, Y1, l0 * 0.8); });
  }
  // The sawmill shed (drawn behind the saw line): steel columns and a long roof. Local x from DECK.
  // The sawmill is indoors, like in the episode (the dad: the child noticed it was "outside"): a closed building with
  // its front wall cut away so he can see in. millBack (behind the saw line, local x from DECK): the cladded back
  // wall, the roof's underside with lights, and the big open doorway at the left end that the loader drives through.
  var MILL_X0 = -3.8, MILL_X1 = 19.2, MILL_H = 6.4;
  function millBack(c) {
    var l0 = LW(), i;
    Rr(c, MILL_X0, -MILL_H, MILL_X1 - MILL_X0, MILL_H, 0.02, "#8E9E8B", l0);
    for (i = 0; MILL_X0 + 0.5 + i * 0.6 < MILL_X1; i++) Ln(c, MILL_X0 + 0.5 + i * 0.6, -MILL_H + 0.1, MILL_X0 + 0.5 + i * 0.6, -0.1, "#7D8D7A", 0.05);
    Rr(c, MILL_X0, -1.2, MILL_X1 - MILL_X0, 1.2, 0.02, "#B9B4A8", l0 * 0.8);
    for (i = 0; i < 5; i++) Rr(c, MILL_X0 + 2.5 + i * 4.2, -MILL_H + 0.35, 2.4, 0.5, 0.05, "#CFE8F5", l0 * 0.6);
    Rr(c, MILL_X0 - 0.3, -MILL_H - 0.55, MILL_X1 - MILL_X0 + 0.6, 0.6, 0.04, "#5E6B5C", l0);
    [MILL_X0 + 4.2, MILL_X0 + 9.6, MILL_X0 + 15.0, MILL_X0 + 20.4].forEach(function (x) {
      if (x > MILL_X1) return;
      Ln(c, x, -MILL_H, x, -MILL_H + 0.7, INK, 0.04);
      c.beginPath(); c.arc(x, -MILL_H + 0.7, 0.28, PI, 0); c.closePath(); fs(c, "#5D6675", l0 * 0.6);
      c.save(); c.globalAlpha = 0.18; c.beginPath(); c.moveTo(x - 0.25, -MILL_H + 0.72); c.lineTo(x - 1.4, -0.2); c.lineTo(x + 1.4, -0.2); c.lineTo(x + 0.25, -MILL_H + 0.72); c.closePath(); c.fillStyle = "#FFF4C2"; c.fill(); c.restore();
    });
    // the open doorway at the left end: the yard shows through it
    Rr(c, MILL_X0, -4.4, 2.6, 4.4, 0.02, "#A9DCFF", l0);
    Rr(c, MILL_X0, -1.0, 2.6, 1.0, 0.02, "#93AE5E", 0);
    Rr(c, MILL_X0, -4.75, 2.6, 0.35, 0.04, "#E2B33A", l0 * 0.8);
    for (i = 0; i < 6; i++) Ln(c, MILL_X0 + 0.1, -4.62 + i * 0.0, MILL_X0 + 2.5, -4.62, "#C98A1A", 0.02);
  }
  // in front of the saw line: the cut edges of the walls and the roof, so it reads as the inside of a building
  function millFrame(c) {
    var l0 = LW();
    Rr(c, MILL_X0 - 0.35, -MILL_H - 0.35, 0.35, MILL_H + 0.35, 0.02, "#6F7F6C", l0);
    Rr(c, MILL_X1, -MILL_H - 0.35, 0.35, MILL_H + 0.35, 0.02, "#6F7F6C", l0);
    Pp(c, [MILL_X0 - 0.6, -MILL_H - 0.3, MILL_X1 + 0.6, -MILL_H - 0.3, MILL_X1 + 0.6, -MILL_H - 0.75, MILL_X0 - 0.6, -MILL_H - 0.75], "#5E6B5C", l0);
  }
  // The saw line at the machine line (local x from DECK): the conveyor of rollers, the squaring saw at SAW1 (two
  // blades take the round sides off) and the splitting saw at SAW2 (a band blade cuts the square log into two
  // posts). st = { spin, run (0..1 conveyor moving), time }
  var MBLUE = "#4A7BB7", MBLUED = "#33598A";
  function millLine(c, st) {
    var l0 = LW(), i, s1 = SAW1 - DECK, s2 = SAW2 - DECK, e = CONV1 - DECK, a = st.spin || 0;
    // legs and the frame under the rollers
    for (i = 0; i <= 7; i++) { var lx = -1.0 + i * (e + 0.8) / 7; Rr(c, lx - 0.07, -CONVH + 0.1, 0.14, CONVH - 0.1, 0.03, "#5D6675", l0 * 0.6); }
    Rr(c, -1.25, -CONVH + 0.05, e + 1.35, 0.22, 0.05, "#7C8696", l0 * 0.8);
    for (i = 0; i < Math.floor(e + 1.2) * 2; i++) {
      var rx = -1.05 + i * 0.5;
      Cc(c, rx, -CONVH + 0.06, 0.1, "#C3CCD6", l0 * 0.5);
      Ln(c, rx, -CONVH + 0.06, rx + Math.cos(a * 3 + i) * 0.08, -CONVH + 0.06 + Math.sin(a * 3 + i) * 0.08, "#7C8696", 0.025);
    }
    // the squaring saw: a housing with a window, one blade above the log and one below
    Rr(c, s1 - 1.0, -3.15, 2.0, 1.1, 0.12, MBLUE);
    shine(c, s1 - 0.8, -3.0, s1 + 0.8, -3.0, 0.05);
    Rr(c, s1 - 1.0, -CONVH + 0.24, 2.0, CONVH - 0.24, 0.08, MBLUE);
    [[s1, -1.95, 0.52], [s1, -0.62, 0.5]].forEach(function (b, k) {
      Cc(c, b[0], b[1], b[2], "#D3DAE2", l0 * 0.8);
      for (var j = 0; j < 14; j++) { var t = a * (k ? -12 : 12) + j * TAU / 14; Pp(c, [b[0] + Math.cos(t) * b[2], b[1] + Math.sin(t) * b[2], b[0] + Math.cos(t + 0.12) * (b[2] + 0.07), b[1] + Math.sin(t + 0.12) * (b[2] + 0.07), b[0] + Math.cos(t + 0.24) * b[2], b[1] + Math.sin(t + 0.24) * b[2]], "#9AA4B2", 0); }
      for (j = 0; j < 4; j++) { var t2 = a * (k ? -12 : 12) + j * TAU / 4; Ln(c, b[0], b[1], b[0] + Math.cos(t2) * b[2] * 0.8, b[1] + Math.sin(t2) * b[2] * 0.8, "#AEB8C4", 0.05); }
      Cc(c, b[0], b[1], 0.1, "#3A3F4E", l0 * 0.6);
    });
    // the splitting saw: a tall frame with the band blade running across at the middle of the log
    Rr(c, s2 - 0.35, -3.4, 0.7, 3.4, 0.08, MBLUED);
    Rr(c, s2 - 0.9, -3.55, 1.8, 0.45, 0.1, MBLUE);
    Ln(c, s2 - 0.75, -CONVH - 0.21, s2 + 0.75, -CONVH - 0.21, "#C3CCD6", 0.05);
    for (i = 0; i < 8; i++) { var bx = s2 - 0.7 + ((i * 0.2 + a * 0.8) % 1.6); Ln(c, bx, -CONVH - 0.24, bx + 0.05, -CONVH - 0.19, INK, 0.02); }
    // the outfeed table sloping down to the post stack
    Pp(c, [e - 0.2, -CONVH + 0.05, e + 1.1, -0.45, e + 1.1, -0.3, e - 0.2, -CONVH + 0.25], "#9AA4B2", l0 * 0.8);
  }
  // the near half of the squaring saw's housing, over the log as it goes through
  function millFront(c) {
    var s1 = SAW1 - DECK, l0 = LW();
    Pp(c, [s1 - 1.0, -2.05, s1 - 1.0, -2.3, s1 + 1.0, -2.3, s1 + 1.0, -2.05], MBLUED, l0 * 0.8);
    Rr(c, s1 - 1.08, -2.05, 0.16, 0.9, 0.04, MBLUED, l0 * 0.8);
    Rr(c, s1 + 0.92, -2.05, 0.16, 0.9, 0.04, MBLUED, l0 * 0.8);
  }
  // A squared log (a cant): sawn faces, the wood showing, a strip of bark left on the corners. split: cut in two.
  function cantShape(c, len, d, split) {
    var l0 = LW(), hs = d * 0.74, xl = -len / 2;
    if (split) { [-hs / 4 - 0.01, hs / 4 + 0.01].forEach(function (y) { c.save(); c.translate(0, y); postShape(c, len, hs * 0.6); c.restore(); }); return; }
    Rr(c, xl, -hs / 2, len, hs, 0.02, WOOD, l0);
    Ln(c, xl + 0.15, -hs * 0.18, xl + len - 0.15, -hs * 0.18, WOODD, 0.03);
    Ln(c, xl + 0.3, hs * 0.2, xl + len - 0.2, hs * 0.2, WOODD, 0.03);
    Rr(c, xl, -hs / 2 - 0.03, len, 0.06, 0.02, BARK, 0);
  }
  // A fence post standing in the ground: its foot on the ground line, tilt (radians, + leans right), hs = height
  // above the ground. level: show the spirit level on it (0..1).
  function standPost(c, hs, tilt, level) {
    var l0 = LW(), d = 0.24;
    c.save(); c.rotate(tilt || 0);
    Rr(c, -d / 2, -hs, d, hs + 0.04, 0.03, WOOD, l0);
    Ln(c, -d * 0.15, -hs + 0.15, -d * 0.15, -0.15, WOODD, 0.025);
    Rr(c, -d / 2, -hs - 0.04, d, 0.1, 0.02, WOODD, l0 * 0.7);
    if (level > 0.01) {
      c.globalAlpha = level;
      Rr(c, d / 2, -hs + 0.25, 0.1, 0.95, 0.03, "#FFC93C", l0 * 0.8);
      var ok = Math.abs(tilt || 0) < 0.03, bub = clamp((tilt || 0) * 2.5, -1, 1) * 0.055;
      Rr(c, d / 2 - 0.07, -hs + 0.68, 0.24, 0.1, 0.05, ok ? "#C9F2C2" : "#E6F7D8", l0 * 0.5);
      Cc(c, d / 2 + 0.05 + bub, -hs + 0.73, 0.035, ok ? "#3FBF4A" : "#9ACD32", 0);
      c.globalAlpha = 1;
    }
    c.restore();
  }
  // The post knocker on the tractor's linkage (tractor units: origin under the rear axle, facing +x): a tall red
  // mast behind the tractor with the heavy weight that slides up it and drops onto the post. top = height of the
  // post top under it, lift 0..1 (the weight raised).
  var KX = -2.05;
  function knocker(c, top, lift) {
    var l0 = LW(), wy = top + 0.05 + lift * 1.7;
    tube(c, -1.05, -0.62, KX + 0.35, -0.9, 0.12, "#7C8696");
    tube(c, -1.0, -1.35, KX + 0.35, -2.4, 0.11, "#E2B33A");
    Rr(c, KX + 0.2, -4.3, 0.2, 4.0, 0.04, RED, l0 * 0.8);
    Rr(c, KX - 0.4, -4.3, 0.2, 4.0, 0.04, RED, l0 * 0.8);
    Rr(c, KX - 0.55, -4.5, 1.1, 0.28, 0.06, REDD, l0 * 0.8);
    Rr(c, KX - 0.45, -0.45, 0.9, 0.16, 0.04, "#5D6675", l0 * 0.7);
    Ln(c, KX, -4.36, KX, -wy - 0.6, "#3A3F4E", 0.04);
    Rr(c, KX - 0.42, -wy - 0.62, 0.84, 0.62, 0.08, "#3A3F4E");
    shine(c, KX - 0.3, -wy - 0.5, KX + 0.3, -wy - 0.5, 0.04);
  }
  // A sheep (from Come Bye): origin on the ground under the middle, facing +x.
  // st = { ph (leg phase), gait (0..1), head (0..1 down to graze), munch }
  var WOOL = "#F6F0E2", WOOLD = "#DED3BC", FACE = "#2A2C36";
  function sheepShape(c, st) {
    var l0 = LW(), g = st.gait || 0, s = Math.sin((st.ph || 0) * TAU), hd = clamp(st.head || 0, 0, 1);
    function leg(x, a, far) {
      var fx = x + a * 0.22;
      Ln(c, x, -0.44, fx, 0, INK, 0.12 + (far ? 0 : 0.01));
      Ln(c, x, -0.44, fx, 0, far ? "#3A3D48" : FACE, 0.075);
    }
    leg(0.3, -s * g, true); leg(-0.3, s * g, true);
    var bumps = [], n = 12, i;
    for (i = 0; i < n; i++) { var a = i / n * TAU; bumps.push([Math.cos(a) * 0.48, -0.64 + Math.sin(a) * 0.22, 0.15 + 0.03 * hash(i, 3)]); }
    bumps.push([-0.6, -0.68, 0.085]);
    bumps.push([0.5, lerp(-0.76, -0.58, hd), 0.17]);
    for (i = 0; i < bumps.length; i++) Cc(c, bumps[i][0], bumps[i][1], bumps[i][2] + l0, INK, 0);
    c.beginPath(); c.ellipse(0, -0.64, 0.48 + l0, 0.22 + l0, 0, 0, TAU); c.fillStyle = INK; c.fill();
    c.beginPath(); c.ellipse(0, -0.64, 0.48, 0.22, 0, 0, TAU); c.fillStyle = WOOL; c.fill();
    for (i = 0; i < bumps.length; i++) Cc(c, bumps[i][0], bumps[i][1], bumps[i][2], WOOL, 0);
    c.strokeStyle = WOOLD; c.lineWidth = 0.025; c.lineCap = "round";
    for (i = 0; i < 7; i++) { var cx = -0.4 + i * 0.13, cy = -0.6 + (i % 2 ? -0.1 : 0.05); c.beginPath(); c.arc(cx, cy, 0.045, 0.3, 2.6); c.stroke(); }
    leg(0.22, s * g, false); leg(-0.36, -s * g, false);
    var hx = lerp(0.68, 0.74, hd), hy = lerp(-0.88, -0.3, hd), rot = lerp(0.35, 1.15, hd);
    if (st.munch) hy += Math.sin(st.munch * 18) * 0.015;
    c.save(); c.translate(hx, hy); c.rotate(rot);
    c.beginPath(); c.ellipse(-0.12, -0.02, 0.1, 0.045, -0.5, 0, TAU); fs(c, FACE, l0 * 0.7);
    c.beginPath(); c.ellipse(0.02, 0, 0.17, 0.11, 0, 0, TAU); fs(c, FACE);
    Cc(c, -0.07, -0.08, 0.075, WOOL, l0 * 0.6);
    Cc(c, 0.02, -0.04, 0.028, "#FFFFFF", 0); Cc(c, 0.03, -0.04, 0.014, INK, 0);
    c.restore();
  }
  // A person (from Caterpillar Hunt's farmer), side view facing +x, origin at the feet: wellies, a jumper and a
  // hat. st = { walk (phase), stride (0..1), hands: [[x, y], [x, y]] | null, bend (0..1), jumper, collar, short (sleeves), hat: "cap" | "beanie" | "bald" }
  function person(c, st) {
    var l0 = LW(), wk = st.walk || 0, sd = st.stride || 0, bend = st.bend || 0, jum = st.jumper || "#3F8D36";
    var hip = [0, -0.9], sh = [0.04 + bend * 0.2, -1.38 + bend * 0.22], hd = [0.08 + bend * 0.3, -1.57 + bend * 0.24];
    function welly(x, y, front) {
      Pp(c, [x - 0.08, y - 0.32, x + 0.07, y - 0.32, x + 0.07, y - 0.08, x + 0.2, y - 0.06, x + 0.2, y, x - 0.09, y], front ? "#2F8F3A" : "#277A31", l0 * 0.8);
    }
    function leg(fx, fy, front) {
      var kx = (hip[0] + fx) / 2 + 0.08, ky = (hip[1] + fy) / 2;
      c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(kx, ky); c.lineTo(fx, fy - 0.12);
      c.strokeStyle = INK; c.lineWidth = 0.16 + l0 * 2; c.stroke(); c.strokeStyle = front ? "#3D6FB6" : "#2F5A99"; c.lineWidth = 0.16; c.stroke();
      welly(fx, fy, front);
    }
    var sw = Math.sin(wk) * 0.22 * sd;
    leg(-sw, -Math.max(0, Math.cos(wk)) * 0.06 * sd, false);
    c.beginPath(); c.moveTo(hip[0] - 0.15, hip[1] + 0.06); c.lineTo(sh[0] - 0.17, sh[1] - 0.02); c.quadraticCurveTo(sh[0], sh[1] - 0.1, sh[0] + 0.17, sh[1] - 0.02); c.lineTo(hip[0] + 0.15, hip[1] + 0.06); c.closePath(); fs(c, jum);
    leg(sw, -Math.max(0, -Math.cos(wk)) * 0.06 * sd, true);
    Cc(c, hd[0], hd[1], 0.13, "#F2C8A0", l0 * 0.8);
    Cc(c, hd[0] + 0.07, hd[1] - 0.01, 0.018, INK, 0);
    c.beginPath(); c.arc(hd[0] + 0.06, hd[1] + 0.03, 0.04, 0.1 * PI, 0.7 * PI); c.strokeStyle = INK; c.lineWidth = l0 * 0.8; c.stroke();
    if (st.hat === "bald") {
      // Farmer Tom (the dad's photo): bald, light stubble, the pale shirt collar showing at the neck of his fleece
      c.beginPath(); c.arc(hd[0] + 0.02, hd[1] + 0.03, 0.1, 0.1 * PI, 0.9 * PI); c.strokeStyle = "rgba(90,70,50,0.35)"; c.lineWidth = 0.045; c.stroke();
      Ln(c, hd[0] - 0.06, hd[1] - 0.08, hd[0] + 0.02, hd[1] - 0.1, "rgba(255,255,255,0.6)", 0.025);
      Pp(c, [sh[0] - 0.07, sh[1] - 0.01, sh[0] + 0.09, sh[1] - 0.01, sh[0] + 0.02, sh[1] + 0.13], st.collar || "#F4F1E8", l0 * 0.5);
    } else if (st.hat === "beanie") { c.beginPath(); c.arc(hd[0] - 0.01, hd[1] - 0.04, 0.14, PI, 0); c.closePath(); fs(c, "#D8403A", l0 * 0.7); Cc(c, hd[0] - 0.01, hd[1] - 0.19, 0.045, "#D8403A", l0 * 0.6); }
    else Pp(c, [hd[0] - 0.14, hd[1] - 0.04, hd[0] - 0.12, hd[1] - 0.16, hd[0] + 0.12, hd[1] - 0.16, hd[0] + 0.24, hd[1] - 0.06], "#7A5234", l0 * 0.7);
    var hands = st.hands || [[sh[0] + 0.05 + sw * 0.4, -0.9], [sh[0] - 0.05 - sw * 0.4, -0.92]];
    hands.forEach(function (h, k) {
      var ex = (sh[0] + h[0]) / 2 - 0.04, ey = (sh[1] + h[1]) / 2 + 0.05;
      c.beginPath(); c.moveTo(sh[0], sh[1] + 0.04); c.lineTo(ex, ey); c.lineTo(h[0], h[1]);
      c.strokeStyle = INK; c.lineWidth = 0.11 + l0 * 2; c.stroke(); c.strokeStyle = k ? mix(jum, INK, 0.15) : jum; c.lineWidth = 0.11; c.stroke();
      if (st.short) { c.beginPath(); c.moveTo(lerp(sh[0], ex, 0.75), lerp(sh[1] + 0.04, ey, 0.75)); c.lineTo(ex, ey); c.lineTo(h[0], h[1]); c.strokeStyle = "#EBC09A"; c.lineWidth = 0.09; c.stroke(); }
      Cc(c, h[0], h[1], 0.055, "#F2C8A0", l0 * 0.6);
    });
  }
  // The PTO wood chipper on the tractor's rear linkage (tractor units, the tractor faces +x): the flywheel
  // housing, the feed rollers, the infeed table, the spout curving up and over, the crane pillar on top.
  // st = { fly (flywheel angle), roll, time, aim (-1..1) }
  function chipper(c, st) {
    var l0 = LW(), i, fa = st.fly || 0;
    tube(c, -1.05, -0.5, -1.3, -0.62, 0.13, "#7C8696");
    tube(c, -1.0, -1.3, -1.3, -1.7, 0.11, "#E2B33A");
    tube(c, -0.3, -0.74, -1.3, -1.05, 0.11, "#F2C230");
    for (i = 0; i < 3; i++) { var q = (fa * 0.05 + i / 3) % 1; Ln(c, lerp(-0.35, -1.25, q), lerp(-0.75, -1.03, q) - 0.05, lerp(-0.35, -1.25, q), lerp(-0.75, -1.03, q) + 0.05, INK, 0.04); }
    Rr(c, -4.05, -0.66, 2.9, 0.24, 0.05, "#3A3F4E");
    tube(c, -3.75, -0.45, -3.8, 0, 0.09, "#5D6675");
    // the far wall of the infeed hopper (behind the branches)
    Pp(c, [-3.05, -0.68, -4.6, -0.68, -4.6, -2.0, -3.05, -1.8], CHD);
    // the spout: up from the housing and over towards the front
    c.save(); c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(-1.95, -2.3); c.lineTo(-1.85, -3.55); c.quadraticCurveTo(-1.75, -4.1, -1.05, -4.08);
    c.strokeStyle = INK; c.lineWidth = 0.4 + l0 * 2; c.stroke(); c.strokeStyle = CH; c.lineWidth = 0.4; c.stroke(); c.restore();
    c.save(); c.translate(-1.05, -4.08); c.rotate(0.15 + (st.aim || 0) * 0.18);
    Pp(c, [0, -0.24, 0.42, -0.2, 0.52, 0.06, 0, 0.22], CHD, l0 * 0.8); c.restore();
    // the flywheel housing with the disc spinning inside
    Cc(c, -1.95, -1.55, 0.92, CH);
    shine(c, -2.5, -2.1, -1.5, -2.32, 0.06);
    Cc(c, -1.95, -1.55, 0.66, CHD, l0 * 0.8);
    for (i = 0; i < 4; i++) { var b = fa + i * TAU / 4; Ln(c, -1.95, -1.55, -1.95 + Math.cos(b) * 0.58, -1.55 + Math.sin(b) * 0.58, "#E2E6EB", 0.09); }
    Cc(c, -1.95, -1.55, 0.14, "#C3CCD6", l0 * 0.7);
    // the feed roller box with its two spiked rollers
    Rr(c, -3.15, -1.85, 1.2, 1.2, 0.1, CH);
    [-1.48, -1.0].forEach(function (y, k) {
      Cc(c, -2.6, y, 0.22, "#3A3F4E", l0 * 0.8);
      for (var j = 0; j < 6; j++) { var a2 = (k ? -1 : 1) * (st.roll || 0) + j * TAU / 6; Ln(c, -2.6 + Math.cos(a2) * 0.12, y + Math.sin(a2) * 0.12, -2.6 + Math.cos(a2) * 0.24, y + Math.sin(a2) * 0.24, INK, 0.05); }
    });
    // the crane pillar on top
    Pp(c, [-3.2, -1.85, -2.6, -1.85, -2.72, -2.55, -3.08, -2.55], CHD);
    Cc(c, -2.9, -2.65, 0.22, "#7C8696");
  }
  // the near side of the infeed hopper: a low lip, so the branches on the table stay in view
  function chipperFront(c) {
    var l0 = LW();
    Pp(c, [-3.05, -0.66, -4.62, -0.66, -4.62, -1.0, -3.05, -1.12], CH);
    Ln(c, -4.6, -2.0, -4.6, -1.0, INK, 0.07);
    Ln(c, -3.1, -1.82, -4.6, -2.02, INK, 0.07);
    shine(c, -3.2, -1.0, -4.5, -0.9, 0.05);
    Rr(c, -4.7, -0.7, 0.2, 0.08, 0.03, "#3A3F4E", l0 * 0.6);
  }
  // the crane's log grapple, hanging from the tip at (0, 0); jaws open 0..1
  function grapple(c, open) {
    var l0 = LW(), o = clamp(open, 0, 1);
    tube(c, 0, 0, 0, 0.32, 0.1, "#5D6675");
    Rr(c, -0.22, 0.28, 0.44, 0.22, 0.06, "#3A3F4E", l0 * 0.8);
    [-1, 1].forEach(function (s) {
      c.save(); c.translate(s * 0.12, 0.45); c.rotate(-s * (0.15 + o * 0.6));
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.42, 0.25, s * 0.15, 0.62);
      c.lineCap = "round"; c.strokeStyle = INK; c.lineWidth = 0.12 + l0 * 2; c.stroke(); c.strokeStyle = "#7C8696"; c.lineWidth = 0.12; c.stroke();
      c.restore();
    });
  }
  // a bundle of branches (a few sticks with green boughs), centred at the origin
  function bundle(c, amt, seed) {
    var n = 4 + Math.round(amt * 4), i, len = 1.2 + amt * 0.6;
    for (i = 0; i < n; i++) {
      var y = (hash(i, seed) - 0.5) * 0.5, a = (hash(i, seed + 1) - 0.5) * 0.5, x0 = -len / 2 + hash(i, seed + 2) * 0.3;
      var x1 = x0 + Math.cos(a) * len, y1 = y + Math.sin(a) * len * 0.3;
      Ln(c, x0, y, x1, y1, INK, 0.11); Ln(c, x0, y, x1, y1, BARK, 0.06);
      for (var j = 0; j < 3; j++) { var f = 0.3 + j * 0.28, bx = lerp(x0, x1, f), by = lerp(y, y1, f), w = 0.22 + 0.12 * hash(i, j + seed); Pp(c, [bx + w, by, bx - w * 0.5, by - w * 0.8, bx - w * 0.5, by + w * 0.8], (i + j) % 2 ? NEEDLE : NEEDLE2, LW() * 0.6); }
    }
  }
  // the wood chip heap in the trailer (trailer units: origin at the drawbar eye), then the mesh sides
  function chipHeap(c, load) {
    if (load < 0.01) return;
    var hh = load * 1.45, i, n = 14;
    c.beginPath(); c.moveTo(-7.45, -2.5);
    for (i = 0; i <= n; i++) { var f = i / n; c.lineTo(lerp(-7.45, -1.55, f), -2.6 - hh * Math.pow(Math.sin(f * Math.PI), 0.55) - (i % 2 ? 0.04 : 0)); }
    c.lineTo(-1.55, -2.5); c.closePath(); fs(c, CHIP[0], LW() * 0.8);
    c.save(); c.clip();
    for (i = 0; i < 46; i++) { var x = lerp(-7.3, -1.7, hash(i, 31)), y = -2.6 - hh * hash(i, 32) * 0.95; Ln(c, x, y, x + 0.12, y - 0.03, CHIP[1 + (i % 3)], 0.05); }
    c.restore();
  }
  function meshSides(c) {
    var l0 = LW(), i;
    c.save(); c.globalAlpha = 0.16; Rr(c, -7.62, -3.6, 6.2, 0.9, 0.02, "#FFFFFF", 0); c.restore();
    c.save(); c.globalAlpha = 0.35;
    for (i = 0; i < 16; i++) Ln(c, -7.55 + i * 0.4, -2.72, -7.25 + i * 0.4, -3.55, INK, 0.025);
    c.restore();
    Rr(c, -7.7, -3.66, 6.36, 0.13, 0.05, "#7C8696", l0 * 0.8);
    [-7.62, -4.55, -1.5].forEach(function (x) { Rr(c, x - 0.05, -3.6, 0.1, 0.9, 0.02, "#7C8696", l0 * 0.7); });
  }
  // a red squirrel in screen px, at (x, y) = its feet; s = px per metre; up = climbing (head up)
  function squirrel(c, x, y, s, ph, up, flip) {
    c.save(); c.translate(x, y); c.scale(flip ? -s : s, s); if (up) c.rotate(-Math.PI / 2);
    var keep = c.lineWidth, lw = 2 / s, R = "#C2602E", RD = "#9A4520";
    c.lineJoin = "round"; c.lineCap = "round";
    var tw = Math.sin(ph * 2) * 0.05;
    c.beginPath(); c.moveTo(-0.12, -0.1); c.bezierCurveTo(-0.45, -0.05, -0.5, -0.45 + tw, -0.25, -0.5 + tw); c.bezierCurveTo(-0.08, -0.52, -0.1, -0.3, -0.2, -0.3);
    c.fillStyle = RD; c.fill(); c.lineWidth = lw; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.ellipse(0, -0.12, 0.16, 0.1, -0.2, 0, TAU); c.fillStyle = R; c.fill(); c.stroke();
    c.beginPath(); c.arc(0.15, -0.2, 0.075, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0.12, -0.26); c.lineTo(0.13, -0.34); c.lineTo(0.17, -0.27); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(0.18, -0.21, 0.016, 0, TAU); c.fillStyle = INK; c.fill();
    c.beginPath(); c.ellipse(0.04, -0.09, 0.06, 0.04, 0, 0, TAU); c.fillStyle = "#F4E2C8"; c.fill();
    var lg = Math.sin(ph * TAU) * 0.04;
    c.strokeStyle = INK; c.lineWidth = lw * 1.2; c.beginPath(); c.moveTo(-0.08, -0.05); c.lineTo(-0.1 + lg, 0); c.moveTo(0.08, -0.05); c.lineTo(0.1 - lg, 0); c.stroke();
    c.lineWidth = keep; c.restore();
  }

  // =====================================================================================================
  // Machine and scene state
  // =====================================================================================================
  var harv = { x: HV0, v: 0, wheel: 0, st: "park" };
  var head = { x: PARK.x, h: PARK.h, r: 1, rot: 0, grip: 0, saw: 0, roll: 0 };
  var tree = { on: true, px: 0, ph: 0, rot: 0, s0: 0, top: true, cut: false, cutP: 0, f: 0, sway: 0 };
  var whorls = makeWhorls();
  var logs = [], brash = { n: 0 };
  var sub = "drive", mo = null, glow = 0, lorry, loader, mill, mposts, fld;   // the logs job (resetLogsWorld)
  resetLogsWorld();
  var ch = { stream: 0, sw: 0, unfold: 0, fly: 0, flyA: 0, roll: 0, pile: 1, load: 0, aim: 0, kick: 0, chipT: 0, rate: 0 };
  var grp = { x: GFOLD.x, h: GFOLD.h, open: 0.3 };
  var bnd = null;                                   // the bundle of branches: { st: "held"|"table", x, h, amt, feed }
  var phase = "ready", phaseT = 0, stepId = "fell", ending = false, dusk = 0, time = 0, shake = 0;
  var wk = null;                                     // the running step: { t, ev: {}, ... }
  var dog = null, sq = null;

  function locked() { return ending || (window.Toybox && Toybox.timer.locked()); }
  function firstStep() { return job === "chip" ? "turn" : "fell"; }

  // =====================================================================================================
  // The stage: one view, or two on an upright stage (the whole job on top, a close-up of the work below)
  // =====================================================================================================
  var cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  var W = 300, H = 300, DPR = 1, split = false;
  var RW = { x: 0, y: 0, w: 300, h: 300 }, RC = { x: 0, y: 150, w: 300, h: 150 };
  var zW = { span: 22, mh: 6, target: 22, mht: 6, cx: 0 }, zC = { span: 9, mh: 4.4, target: 9, mht: 4.4, cx: 0 };
  function fitFor(z) {
    return function (w, h) {
      var gy = h * ((h < 460 && h <= w * 1.05) ? 0.75 : 0.7);
      return Math.min(w * 0.95 / z.span, gy * 0.93 / z.mh);
    };
  }
  var scW = new Farm.Scene({ L: 20, xmin: -80, xmax: 200, rowDz: 0.5, fit: fitFor(zW) });
  var scC = new Farm.Scene({ L: 20, xmin: -80, xmax: 200, rowDz: 0.5, fit: fitFor(zC) });
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(50, r.width); H = Math.max(50, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    split = H > W * 0.92;
    // the coach pill sits at the bottom of the stage: on a split stage the close-up stops above it, so the work
    // it shows (the wheels, the foot of the post) is never under the pill
    if (split) { var hy = Math.round(H * 0.52), co = Math.min(84, Math.round(H * 0.12)); RW = { x: 0, y: 0, w: W, h: hy }; RC = { x: 0, y: hy, w: W, h: H - hy - co }; }
    else RW = { x: 0, y: 0, w: W, h: H };
    scW.layout(RW.w, RW.h); scC.layout(RC.w, RC.h);
    follow(0, true);
  }
  function regOf(sc) { return sc === scC ? RC : RW; }
  // Screen x of world x at depth r in plain perspective. Farm.Scene's X() bends depths beyond the machine line
  // towards its backdrop (made for a 20 m field), which puts things far down the track in the wrong place.
  function PX(sc, x, r) { return sc.W / 2 + (x - sc.cam) * sc.k / (r || 1); }
  function views() { return split ? [scW, scC] : [scW]; }
  function onScreen(sc, x, y) { var b = cv.getBoundingClientRect(), R = regOf(sc); return { x: b.left + R.x + x, y: b.top + R.y + y }; }
  // world (x, h) at depth r -> viewport point in a view
  function scrPt(sc, x, h, r) { r = r || 1; return onScreen(sc, PX(sc, x, r), sc.Y(r) - h * sc.S(r)); }
  function inView(sc, x, h, r) { var R = regOf(sc), px = PX(sc, x, r || 1), py = sc.Y(r || 1) - h * sc.S(r || 1); return px > 20 && px < R.w - 20 && py > 20 && py < R.h - 10; }
  // the best view to point at a world spot: the close-up when it shows it, else the whole view
  function bestPt(x, h, r) { if (split && inView(scC, x, h, r)) return scrPt(scC, x, h, r); return scrPt(scW, x, h, r); }

  // ---------- Coach, counter, name tags ----------
  var coach = Toybox.coach($("coach"));
  function counterText() { return job === "chip" ? "Loads: " + loads : "Posts: " + posts; }
  function setCount(pop) { var el = $("loads"); el.textContent = counterText(); if (pop) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); } }
  setCount(false);
  function tag(text, x, h, r) { var p = bestPt(x, h, r); Toybox.nametag(text, p.x, p.y, 2400); }

  // =====================================================================================================
  // The jobs and their steps
  // =====================================================================================================
  var STEPS = {
    logs: [
      { id: "fell", name: "Fell", go: "Cut it", coach: "Drive the harvester to the tree." },
      { id: "logs", name: "Logs", go: "Cut logs", coach: "Tap the harvester head to cut a log." },
      { id: "lorry", name: "Lorry", go: "Haul logs", coach: "Drive the timber lorry to the sawmill." },
      { id: "saw", name: "Sawmill", go: "Saw posts", coach: "Drive the loader to the log pile." },
      { id: "fence", name: "Fence", go: "Fix fence", coach: "Tap a post to stand it in the hole." }
    ],
    chip: [
      { id: "turn", name: "Turn", go: "Turn round", coach: "Turn the seat round." },
      { id: "feed", name: "Feed", go: "Feed it", coach: "Feed the branches in." },
      { id: "chips", name: "Chips", go: "Fill it up", coach: "Fill the trailer with chips." }
    ]
  };
  var BUSY = { turn: "The seat is turning.", feed: "The chipper is busy.", chips: "The chipper is busy." };
  // Logs: the things he does inside each step, in order, with the coach's line and the part it names
  var SUB = {
    "fell.drive": { say: "Drive the harvester to the tree.", part: "harv" },
    "fell.grip": { say: "Tap the harvester head to grab the tree.", part: "head" },
    "fell.saw": { say: "Tap the harvester head to cut the tree down.", part: "head" },
    "logs.feed": { say: "Tap the harvester head to cut a log.", part: "head" },
    "lorry.drive": { say: "Drive the timber lorry to the sawmill.", part: "lorry" },
    "lorry.count": { say: "Tap the lorry's wheels to count them.", part: "wheel" },
    "lorry.grab": { say: "Tap the logs to lift them off the lorry.", part: "lorrylogs" },
    "lorry.drop": { say: "Tap the log pile to put the logs down.", part: "stack2" },
    "saw.drive": { say: "Drive the loader to the log pile.", part: "loader" },
    "saw.grab": { say: "Tap the grab to pick up the logs.", part: "grab" },
    "saw.drive2": { say: "Drive the loader to the log deck.", part: "loader" },
    "saw.drop": { say: "Tap the grab to put the logs on the deck.", part: "grab" },
    "saw.feed": { say: "Tap a log to send it through the saws.", part: "deck" },
    "fence.stand": { say: "Tap a post to stand it in the hole.", part: "ppile" },
    "fence.ted": { say: "Drive the tractor to the post.", part: "ted" },
    "fence.knock": { say: "Tap the post knocker to knock the post in.", part: "knocker" },
    "fence.wire": { say: "Tap the fence wire to fix it to the post.", part: "wire" }
  };

  // ---------- Pictures for the steps and the job tabs (drawn with the scene's own code) ----------
  var picCache = {};
  function pic(id) {
    if (picCache[id] !== undefined) return picCache[id];
    var cnv = document.createElement("canvas"), PW = 168, PH = 120, x;
    cnv.width = PW; cnv.height = PH;
    try { x = cnv.getContext("2d"); } catch (e) { x = null; }
    if (!x) return (picCache[id] = "");
    function fit(w, h, ox, fn) { var s = Math.min(PW * 0.94 / w, PH * 0.9 / h); Farm.inUnits(x, PW / 2 + ox * s, PH * 0.95, s, 3.4, fn); }
    var hd = { grip: 1, saw: 0, roll: 0, time: 0 };
    if (id === "logs") fit(9.6, 4.5, 0, function () {
      x.translate(-2.6, 0);
      harvester(x, {});
      craneShape(x, HPIV[0], HPIV[1], 6.2, 1.95, 2.9, Y1, YD);
      x.save(); x.translate(6.2 - 0.1, -1.1); logShape(x, 2.4, 0.32, 0); x.rotate(PI / 2); harvesterHead(x, hd); x.restore();
    });
    else if (id === "chip") fit(9.4, 4.5, 0, function () {
      x.scale(-1, 1); x.translate(-2.3, 0);
      chipper(x, { fly: 0.4 }); chipperFront(x); D.tractor(x, { plain: true, hitch: { lift: 0 } });
    });
    else if (id === "fell") fit(4.6, 9.4, 0, function () {
      x.save(); x.scale(0.95, 0.95); treeShape(x, { s0: 0, top: true, whorls: makeWhorls(), cut: 0 });
      x.translate(0, -SG); harvesterHead(x, { grip: 1, saw: 0.7, roll: 0, time: 0 }); x.restore();
    });
    else if (id === "logs-step") fit(3.4, 1.4, 0, function () {
      stakes(x, 1.45, 1.25); [[0, 0.21, 0.41], [0.1, 0.6, 0.36], [-0.06, 0.94, 0.3]].forEach(function (q) { x.save(); x.translate(q[0], -q[1]); logShape(x, 2.5, q[2], 0); x.restore(); });
    });
    else if (id === "posts") fit(3.4, 1.4, 0, function () {
      stakes(x, 1.45, 1.25); [[0, 0.21, 0.41], [0.1, 0.6, 0.36], [-0.06, 0.94, 0.3]].forEach(function (q) { x.save(); x.translate(q[0], -q[1]); postShape(x, 2.5, q[2]); x.restore(); });
    });
    else if (id === "lorry") fit(15.9, 3.9, 0, function () {
      x.translate(6.35, 0); lorryShape(x, {});
      [[0.21, 0.41], [0.6, 0.36], [0.94, 0.3]].forEach(function (q) { x.save(); x.translate(LBUNK, -LBED - 0.15 - q[0]); logShape(x, 2.5, q[1], 0); x.restore(); });
    });
    else if (id === "loader") fit(7.4, 4.0, 0, function () {
      x.translate(-1.4, 0); loaderShape(x, { lift: 0.35, clamp: 1 });
      [[0.2, 0.36], [0.55, 0.32]].forEach(function (q) { x.save(); x.translate(LDTIP + 0.3, -loaderH(0.35) - 0.05 - q[0]); logShape(x, 2.4, q[1], 0); x.restore(); });
    });
    else if (id === "fence") fit(4.6, 2.6, 0, function () {
      netSpan(x, -2.1, 2.1, 0);
      [-2.1, 2.1].forEach(function (px) { x.save(); x.translate(px, 0); standPost(x, 1.3, 0, 0); x.restore(); });
      standPost(x, 1.45, 0, 1);
    });
    else if (id === "turn") fit(5.2, 3.9, 0, function () {
      x.scale(-1, 1); x.translate(-1.8, 0);
      D.tractor(x, { plain: true, driver: false }); driverFig(x, 0.3, -2.42, -1);
      x.beginPath(); x.arc(0.3, -3.25, 0.6, -PI * 0.95, -PI * 0.08); x.strokeStyle = INK; x.lineWidth = 0.24; x.lineCap = "round"; x.stroke();
      x.strokeStyle = "#FFC93C"; x.lineWidth = 0.13; x.stroke();
      Pp(x, [0.95, -3.5, 0.62, -3.3, 1.05, -3.05], "#FFC93C", LW());
    });
    else if (id === "feed") fit(5.4, 4.0, 0, function () {
      x.scale(-1, 1); x.translate(3.0, 0);
      chipper(x, { fly: 0.4 });
      x.save(); x.translate(-3.95, -1.2); x.scale(-1, 1); bundle(x, 0.7, 3); x.restore();
      chipperFront(x);
    });
    else if (id === "chips") fit(8.0, 4.4, 0, function () {
      x.translate(4.6, -0.5); chipHeap(x, 1); D.trailer(x, { load: 0 }); meshSides(x);
    });
    var url = "";
    try { url = cnv.toDataURL("image/png"); } catch (e) { url = ""; }
    return (picCache[id] = url ? '<img alt="" src="' + url + '" style="width:100%;height:100%;object-fit:contain;display:block">' : "");
  }
  var PICS = { fell: "fell", logs: "logs-step", lorry: "lorry", saw: "posts", fence: "fence", turn: "turn", feed: "feed", chips: "chips" };
  function stepList(j) { return STEPS[j].map(function (s) { return { id: s.id, name: s.name, go: s.go, coach: s.coach, pic: pic(PICS[s.id]) }; }); }

  // ---------- Steps, job bar, bottom bar, ghost ----------
  var ghost = Toybox.ghost({
    max: 3,
    onShow: function (p, on) { if (steps) steps.pulse(on); },
    plan: function () {
      if (locked()) return null;
      if (phase === "ready") { var p = partScreen(stepId); if (!p) return null; return { pts: [[p.x, p.y]], tap: true, key: job === "logs" ? key() : "go" }; }
      if (phase === "done" && phaseT > 4) { var g = steps.go.el.getBoundingClientRect(); if (g.width) return { pts: [[g.left + g.width / 2, g.top + g.height / 2]], tap: true, key: "again" }; }
      return null;
    }
  });
  function mkSteps(el, j) { return Toybox.steps(el, { steps: stepList(j), coach: coach, ghost: ghost, onGo: function () { return doGo(); }, onAgain: function () { again(); }, onBusy: function () { busyHint(); } }); }
  var stepsL = mkSteps($("stepsLogs"), "logs"), stepsC = mkSteps($("stepsChip"), "chip");
  var steps = job === "chip" ? stepsC : stepsL;
  function showSteps() {
    steps = job === "chip" ? stepsC : stepsL;
    $("stepsLogs").hidden = job === "chip"; $("stepsChip").hidden = job !== "chip";
  }
  var jobs = Toybox.jobs($("jobs"), {
    jobs: [{ id: "logs", name: "Logs", pic: pic("logs") }, { id: "chip", name: "Chipper", pic: pic("chip") }],
    value: job,
    onPick: function (id) { switchJob(id); }
  });
  Toybox.bar($("bottom"), { onNew: startOver, onSurprise: surprise });

  function doGo() {
    if (locked()) return false;
    if (job === "logs") {
      // The Go never does the job for him: it says what to do next and points at it.
      if (phase === "done") return again();
      if (phase === "work") { busyHint(); return true; }
      hint(); return true;
    }
    if (phase === "ready") return go();
    if (phase === "done") return again();
    busyHint(); return true;
  }
  var BUSYL = { fell: "The harvester is working.", logs: "The harvester head is cutting.", lorry: "The timber lorry is working.", saw: "The loader and the saws are working.", fence: "Farmer Tom is working." };
  function busyHint() {
    if (job === "logs") { snd.horn(); coach.say(BUSYL[stepId] || "Wait a moment.", 3); return; }
    if (phase === "arrive") { coach.say("Here comes the harvester.", 3); return; }
    if (phase === "work") { snd.horn(); coach.say(BUSY[stepId], 3); }
  }
  function hint() { var d = SUB[key()]; if (d) coach.say(d.say, 3); glow = 3; if (ghost) ghost.poke(); }

  // =====================================================================================================
  // The flow
  // =====================================================================================================
  function setPhase(p) { phase = p; phaseT = 0; }
  // Logs: each step has a few things for him to do in turn (sub); each tap on the right machine part plays that
  // one control's motion (mo), then the next thing is his again.
  function key() { return stepId + "." + sub; }
  function setSub(s) {
    sub = s; setPhase("ready"); steps.busy(false);
    var d = SUB[key()]; if (d) coach.step(d.say);
    if (ghost) ghost.poke();
  }
  function run(dur, fn, end) { mo = { t: 0, dur: dur, fn: fn, end: end, ev: {} }; setPhase("work"); steps.busy(true); }
  function onceM(id) { if (!mo || mo.ev[id]) return false; mo.ev[id] = 1; return true; }
  function bringIn(id) {
    if (job === "logs") { bringLogs(id); return; }
    stepId = id; steps.at(id); wk = null;
    setPhase("ready"); steps.busy(false);
    if (id === "turn") tag("Wood chipper", 2.4, 2.6);
  }
  function bringLogs(id) {
    stepId = id; steps.at(id); mo = null;
    if (id === "fell") { setSub("drive"); tag("Forestry harvester", harv.x, 3.4); }
    else if (id === "logs") setSub("feed");
    else if (id === "lorry") lorryIn();
    else if (id === "saw") { lorry.leave = true; setSub("drive"); tag("Log loader", loader.x, 3.9); }
    else if (id === "fence") fenceIn();
  }
  function go() {
    if (phase !== "ready") return false;
    if (ghost) ghost.learned("go");
    setPhase("work"); snd.horn(); steps.busy(true);
    wk = { t: 0, ev: {}, from: { x: head.x, h: head.h, r: head.r, rot: head.rot } };
    if (stepId === "turn") coach.say("The seat turns round.", 3);
    else if (stepId === "feed" || stepId === "chips") { wk.amt = stepId === "feed" ? 0.5 : ch.pile; wk.feedDur = stepId === "feed" ? 1.5 : 1.8; wk.load0 = ch.load; wk.g0 = { x: grp.x, h: grp.h }; coach.say("The crane grabs the branches.", 3); }
    return true;
  }
  function stepDone(id) {
    var list = STEPS[job], i = list.map(function (s) { return s.id; }).indexOf(id);
    steps.done(id);
    if (i < list.length - 1) bringIn(list[i + 1].id);
    else finish();
  }
  function finish() {
    setPhase("done"); wk = null; mo = null; steps.finish("Again!"); steps.busy(false);
    if (job === "chip") {
      loads++; coach.say("The trailer is full of chips!", 5);
      Farm.world.update(function (w) { w.chips = (typeof w.chips === "number" && isFinite(w.chips) ? w.chips : 0) + 1; });
    } else { coach.say("The sheep are safe in the field.", 5); fld.home = 0.01; }
    save(); setCount(true); snd.chime(); Toybox.kind();
  }
  function again() {
    if (phase !== "done") return false;
    if (ghost) ghost.learned("again");
    resetScene(false);
    steps.reset(); bringIn(firstStep()); follow(0, true);
    coach.say(job === "chip" ? "More branches to chip!" : "Here is the next tree.", 3);
    return true;
  }
  function resetScene(keepHarv) {
    parts.length = 0; dog = null; sq = null; wk = null; mo = null; drag = null; glow = 0;
    tree = { on: true, px: 0, ph: 0, rot: 0, s0: 0, top: true, cut: false, cutP: 0, f: 0, sway: 0 };
    whorls = makeWhorls(); logs = []; brash.n = 0;
    head.x = PARK.x; head.h = PARK.h; head.r = 1; head.rot = 0; head.grip = 0; head.saw = 0;
    if (!keepHarv) { harv.x = HV0 - 9; head.x = harv.x - HV0 + PARK.x; }
    resetLogsWorld();
    ch.sw = 0; ch.unfold = 0; ch.fly = 0; ch.pile = 1; ch.load = 0; ch.rate = 0; ch.kick = 0;
    grp.x = GFOLD.x; grp.h = GFOLD.h; grp.open = 0.3; bnd = null;
  }
  function resetLogsWorld() {
    lorry = { x: -40, wheel: 0, on: false, leave: false, crane: { x: -40 + LREST[0], h: LREST[1], open: 0.4 }, lit: 0, pop: [], popT: [] };
    loader = { x: LDP, dir: -1, tdir: -1, wheel: 0, lift: 0.2, clamp: 0, carry: false };
    mill = { spin: 0, run: 0, inset: null };
    mposts = [];
    fld = {
      post: { st: "pile", tilt: 0, sink: 0 }, pileN: 1, wire: 0, lift: 0, knocks: 0, home: 0, said: false,
      ted: { x: TED0, wheel: 0 },
      tom: { x: PPILE - 1.5, px: PPILE - 1.5, walk: 0, stride: 0, hands: null, bend: 0, flip: false },
      midge: { x: HOLE + 4.8, ph: 0 },
      sheep: [{ x: 140.5, r: 1.42, ph: 0.1, head: 1, flip: false }, { x: 144.2, r: 1.24, ph: 0.6, head: 1, flip: true }, { x: 158.8, r: 1.34, ph: 0.3, head: 1, flip: false },
        { x: 163.4, r: 1.18, ph: 0.8, head: 1, flip: true }, { x: 150.2, r: 1.2, ph: 0.4, head: 0, flip: false, gap: true }]
    };
  }
  function startOver() {
    if (locked()) return;
    resetScene(false); steps.reset(); bringIn(firstStep()); follow(0, true);
    coach.say(job === "chip" ? "A new day in the woods!" : "Farmer Tom needs new fence posts.", 3);
    save();
  }
  function switchJob(id) {
    if (locked()) { jobs.set(job); return; }
    job = id === "chip" ? "chip" : "logs";
    resetScene(false); showSteps(); steps.reset(); bringIn(firstStep()); follow(0, true); setCount(false);
    coach.say(job === "chip" ? "Chip the branches!" : "Farmer Tom needs new fence posts.", 3);
    save();
  }

  // ---------- Logs: what he does, one control at a time ----------
  function act(part) {
    var k = key(), p = part || "", wheelTap = /^wheel\d$/.test(p);
    if (k === "fell.drive" && (p === "harv" || p === "head")) return driveHarv(), true;
    if (k === "fell.grip" && (p === "head" || p === "tree" || p === "harv")) return gripTree(), true;
    if (k === "fell.saw" && (p === "head" || p === "tree" || p === "harv")) return sawTree(), true;
    if (k === "logs.feed" && (p === "head" || p === "tree" || p === "harv" || p === "stack")) return cutNext(), true;
    if (k === "lorry.drive" && (p === "lorry" || p === "lorrylogs" || p === "crane" || wheelTap)) return driveLorry(), true;
    if (k === "lorry.count" && (p === "lorry" || p === "lorrylogs" || p === "weigh" || wheelTap)) return countWheel(p), true;
    if (k === "lorry.grab" && (p === "lorrylogs" || p === "crane" || p === "lorry")) return craneGrab(), true;
    if (k === "lorry.drop" && (p === "stack2" || p === "crane" || p === "lorrylogs")) return craneDrop(), true;
    if (k === "saw.drive" && (p === "loader" || p === "stack2" || p === "grab")) return driveLoader(LD_STK, -1, "grab"), true;
    if (k === "saw.grab" && (p === "grab" || p === "loader" || p === "stack2")) return loaderGrab(), true;
    if (k === "saw.drive2" && (p === "loader" || p === "deck" || p === "grab")) return driveLoader(LD_DECK, 1, "drop"), true;
    if (k === "saw.drop" && (p === "grab" || p === "loader" || p === "deck")) return loaderDrop(), true;
    if (k === "saw.feed" && (p === "deck" || p === "saw")) return sawNext(), true;
    if (k === "fence.stand" && (p === "ppile" || p === "tom" || p === "hole")) return standPostUp(), true;
    if (k === "fence.ted" && (p === "ted" || p === "knocker")) return driveTed(), true;
    if (k === "fence.knock" && (p === "knocker" || p === "ted" || p === "post")) return knock(), true;
    if (k === "fence.wire" && (p === "wire" || p === "tom" || p === "post")) return fixWire(), true;
    return false;
  }
  // Fell: drive up to the tree, grip it, saw it.
  function syncHead() { head.x = harv.x - HV0 + PARK.x; head.h = PARK.h; head.r = 1; head.rot = 0; }
  function driveHarv() {
    var x0 = harv.x, dur = Math.max(0.6, (HV0 - x0) / 3.0);
    snd.horn();
    run(dur, function (t) { var nx = lerp(x0, HV0, ease(t / dur)); harv.wheel += nx - harv.x; harv.x = nx; syncHead(); },
      function () { harv.x = HV0; syncHead(); snd.clunk(); coach.say("The harvester has six big wheels.", 3); setSub("grip"); });
  }
  function gripTree() {
    var from = { x: head.x, h: head.h, r: head.r, rot: head.rot };
    coach.say("The head grips the tree.", 3);
    run(1.5, function (t) {
      setHead(track([[0, from], [1.1, pose(0, SG, 1, 0)]], t));
      head.grip = clamp((t - 1.1) / 0.3, 0, 1);
      if (t > 1.2 && onceM("grip")) snd.clunk();
    }, function () { head.grip = 1; setSub("saw"); });
  }
  function sawTree() {
    run(3.5, function (t, dt) { fellAt(1.4 + t, dt); }, function () { stepDone("fell"); tag("Felled tree", 3.5, 1.8); });
  }
  function fellAt(t, dt) {
    setHead(pose(0, SG, 1, 0)); head.grip = 1;
    if (onceM("saw")) coach.say("The saw cuts the trunk.", 3);
    if (t < 2.5) head.saw = ease(clamp((t - 1.4) / 1.1, 0, 1));
    else head.saw = 1 - ease(clamp((t - 2.5) / 0.3, 0, 1));
    tree.cutP = clamp((t - 1.4) / 1.1, 0, 1);
    if (t > 1.45 && t < 2.5 && Math.random() < dt * 40) addPart({ kind: "dust", x: 0.2 + Math.random() * 0.2, h: CUT_H + (Math.random() - 0.3) * 0.1, vx: 1.2 + Math.random() * 2.2, vh: Math.random() * 1.6, g: 6, life: 0.6 + Math.random() * 0.3, size: 0.035 + Math.random() * 0.03, col: Math.random() < 0.5 ? WOOD : "#F6E2B5" });
    if (t >= 2.5 && onceM("cut")) { tree.cut = true; tree.s0 = CUT_H; tree.cutP = 0; }
    if (t > 2.8) {
      if (onceM("timber")) { coach.say("Timber!", 3); snd.horn(); }
      var u = clamp((t - 2.8) / 1.4, 0, 1), rot = PI / 2 * u * u;
      if (t > 4.2) rot = PI / 2 - 0.05 * Math.sin(PI * clamp((t - 4.2) / 0.4, 0, 1));
      treeAt(rot); head.rot = rot;
      if (t >= 4.2 && onceM("land")) {
        shake = 0.45; snd.clunk(); snd.clunk();
        for (var i = 0; i < 16; i++) addPart({ kind: "puff", x: 1 + Math.random() * 7, h: 0.2 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 1.2, vh: 0.4 + Math.random() * 0.6, life: 1.1, size: 0.18, grow: 0.5, col: "#E6E0C8", alpha: 0.5 });
        for (i = 0; i < 10; i++) addPart({ kind: "bough", x: 2 + Math.random() * 6, h: 1.0, vx: (Math.random() - 0.5) * 3, vh: 1.5 + Math.random() * 2, g: 9, life: 0.8, size: 0.12, col: NEEDLE2, spin: 5, floor: 0.1 });
      }
    }
  }
  // Logs: each tap feeds the trunk one log's length through the head (the knives strip the branches) and the
  // saw cuts it off; the third log finishes the tree.
  function cutNext() {
    var k = logs.length;
    if (k === 0) coach.say("The knives take off the branches.", 3);
    run(k >= 2 ? 2.8 : 2.2, function (t, dt) { feedAt(k, t, dt); }, function () { if (k >= 2) stepDone("logs"); else setSub("feed"); });
  }
  function feedAt(k, t, dt) {
    setHead(pose(0, SG, 1, PI / 2)); head.grip = 1;
    var f, cutting = false;
    if (t < 1.5) { f = LOGL * k + LOGL * ease(t / 1.5); head.roll += dt * 14; }
    else {
      f = LOGL * (k + 1);
      if (t < 2.1) { head.saw = Math.sin(PI * (t - 1.5) / 0.6); cutting = true; }
      if (t >= 1.8 && onceM("log")) cutLog(k);
    }
    if (!cutting) head.saw = 0;
    tree.f = f; tree.px = -SG - f; tree.ph = SG;
    var knife = 0.5;
    whorls.forEach(function (w) {
      if (w.off || tree.px + w.s > knife) return;
      w.off = true; brash.n++;
      for (var j = 0; j < 2; j++) addPart({ kind: "bough", x: knife + 0.1, h: SG + (j ? -0.3 : 0.4), vx: 0.6 + Math.random() * 1.6, vh: Math.random() * 1.5, g: 9, life: 0.55, size: 0.2 + w.w * 0.12, col: j ? NEEDLE : NEEDLE2, spin: (Math.random() - 0.5) * 8, floor: 0.2 });
      snd.tick();
    });
    if (cutting && Math.random() < dt * 30) addPart({ kind: "dust", x: -0.5 + (Math.random() - 0.5) * 0.1, h: SG - 0.1, vx: (Math.random() - 0.5) * 2, vh: -Math.random() * 1.5, g: 6, life: 0.6, size: 0.04, col: WOOD });
    if (k >= 2 && t > 2.2) {
      if (onceM("top")) {
        tree.top = false; tree.on = false; brash.n += 3;
        addPart({ kind: "stick", x: 1.0, h: SG, vx: 0.8, vh: 0.5, g: 9, life: 0.6, size: 0.35, col: BARK, spin: 2, floor: 0.3 });
        for (var j = 0; j < 4; j++) addPart({ kind: "bough", x: 1.2 + j * 0.3, h: SG + 0.2, vx: 0.8 + Math.random(), vh: Math.random(), g: 9, life: 0.55, size: 0.18, col: NEEDLE2, spin: 5, floor: 0.25 });
        snd.clunk();
      }
      head.grip = 1 - clamp((t - 2.2) / 0.3, 0, 1);
    }
  }
  function cutLog(k) {
    var sA = CUT_H + LOGL * k, sB = sA + LOGL, d = diam((sA + sB) / 2), below = 0, i;
    for (i = 0; i < logs.length; i++) below += logs[i].d;
    var slot = [0, 0.1, -0.06][k] || 0;
    logs.push({ k: k, len: LOGL, d: d, x: tree.px + (sA + sB) / 2, h: SG, r: 1, st: "fall", vh: 0, tx: STKA_X + slot, th: below + d / 2 });
    tree.s0 = sB;
    if (k === 0) coach.say("The saw cuts a log.", 3);
    snd.tick();
  }
  function updateLogs(dt) {
    logs.forEach(function (L) {
      if (L.st === "fall") {
        L.vh -= 9 * dt; L.h += L.vh * dt; L.x += (L.tx - L.x) * Math.min(1, dt * 5);
        if (L.h <= L.th) { L.h = L.th; L.x = L.tx; L.st = "stack"; snd.clunk(); }
      } else if (L.st === "lorry") L.x = lorry.x + LBUNK;
      else if (L.st === "deckroll") {
        var e = Math.min(1, dt * 4);
        L.x += (L.tx - L.x) * e; L.h += (L.th - L.h) * e; L.r += (L.tr - L.r) * e;
        if (Math.abs(L.th - L.h) < 0.01 && Math.abs(L.tr - L.r) < 0.005) { L.x = L.tx; L.h = L.th; L.r = L.tr; L.st = "deck"; }
      }
    });
  }
  // the logs as one bundle: stacked up from height hb at x, depth r
  function totD() { var s = 0; logs.forEach(function (L) { if (L.st !== "gone") s += L.d; }); return s; }
  function stackLogs(x, hb, r, st) {
    var y = hb;
    logs.forEach(function (L) { if (L.st === "gone") return; L.x = x; L.h = y + L.d / 2; L.r = r; L.st = st; y += L.d; });
  }
  // Lorry: it drives into the woods and its crane loads the logs (that part is automatic), then he drives it
  // to the sawmill's weighbridge, counts its six wheels, and lifts the logs off onto the holding pile.
  function restPt() { return { x: lorry.x + LREST[0], h: LREST[1] }; }
  function craneRest() { var p = restPt(); lorry.crane.x = p.x; lorry.crane.h = p.h; lorry.crane.open = 0.4; }
  function lorryIn() {
    lorry.on = true; lorry.leave = false; lorry.x = LXF - 34; lorry.pop = []; lorry.popT = []; lorry.lit = 0; craneRest();
    var x0 = lorry.x;
    coach.say("Here comes the timber lorry.", 4);
    run(4.0, function (t) { var nx = lerp(x0, LXF, ease(t / 4)); lorry.wheel += nx - lorry.x; lorry.x = nx; craneRest(); },
      function () { snd.clunk(); coach.say("The lorry's crane loads the logs.", 4); loadLorry(); });
  }
  function loadLorry() {
    var R0 = restPt(), top = 0.08 + totD();
    var above = { x: STKA_X, h: top + 1.7 }, at = { x: STKA_X, h: top + 0.5 };
    var up = { x: lorry.x + LBUNK, h: 4.8 }, bunk = { x: lorry.x + LBUNK, h: LBED + 0.2 + totD() + 0.5 };
    run(4.4, function (t) {
      var p = track([[0, R0], [1.0, above], [1.4, at], [1.6, at], [2.6, up], [3.05, bunk], [3.3, bunk], [4.4, R0]], t);
      lorry.crane.x = p.x; lorry.crane.h = p.h;
      lorry.crane.open = t < 1.4 ? 1 : (t < 1.6 ? 1 - (t - 1.4) / 0.2 : (t < 3.15 ? 0 : clamp((t - 3.15) / 0.2, 0, 1)));
      if (t >= 1.55 && t < 3.15) { stackLogs(p.x, p.h - 0.5 - totD(), LR, "held"); if (onceM("g")) snd.clunk(); }
      if (t >= 3.15 && onceM("put")) { stackLogs(lorry.x + LBUNK, LBED + 0.2, LR, "lorry"); snd.clunk(); }
    }, function () { craneRest(); setSub("drive"); tag("Timber lorry", lorry.x - 1.5, 4.2, LR); });
  }
  function driveLorry() {
    var x0 = lorry.x, dur = Math.max(1.0, (LXW - x0) / 9 + 1.4);
    if (x0 < LXW - 8) coach.say("The timber lorry drives to the sawmill.", 4);
    run(dur, function (t) { var nx = lerp(x0, LXW, ease(t / dur)); lorry.wheel += nx - lorry.x; lorry.x = nx; craneRest(); }, onWeigh);
  }
  function onWeigh() {
    lorry.x = LXW; craneRest(); snd.clunk();
    coach.say("The weighbridge weighs the lorry.", 4);
    setSub("count");
  }
  var NUMW = ["One wheel.", "Two wheels.", "Three wheels.", "Four wheels.", "Five wheels.", "Six wheels!"];
  function countWheel(p) {
    var idx = /^wheel\d$/.test(p) ? +p.slice(5) : -1, i;
    if (idx < 0 || lorry.pop.indexOf(idx) >= 0) { idx = -1; for (i = 0; i < LWHEELS.length; i++) if (lorry.pop.indexOf(i) < 0) { idx = i; break; } }
    if (idx < 0) return;
    lorry.pop.push(idx); lorry.popT.push(time); snd.tick();
    var n = lorry.pop.length;
    coach.say(NUMW[n - 1], 3);
    if (n >= LWHEELS.length) { snd.chime(); run(1.8, function () {}, function () { coach.say("The lorry has six wheels.", 3); setSub("grab"); }); }
  }
  function craneGrab() {
    var R0 = { x: lorry.crane.x, h: lorry.crane.h }, above = { x: lorry.x + LBUNK, h: 4.8 }, at = { x: lorry.x + LBUNK, h: LBED + 0.2 + totD() + 0.5 };
    coach.say("The crane grabs the logs.", 3);
    run(1.8, function (t) {
      var p = track([[0, R0], [0.9, above], [1.3, at]], t);
      lorry.crane.x = p.x; lorry.crane.h = p.h; lorry.crane.open = t < 1.3 ? 1 : 1 - clamp((t - 1.3) / 0.3, 0, 1);
      if (t > 1.5 && onceM("g")) snd.clunk();
    }, function () { lorry.crane.open = 0; logs.forEach(function (L) { if (L.st === "lorry") L.st = "held"; }); setSub("drop"); });
  }
  function craneDrop() {
    var R0 = { x: lorry.crane.x, h: lorry.crane.h }, up = { x: lorry.crane.x, h: 5.3 }, over = { x: STK2, h: 4.5 }, at = { x: STK2, h: 0.08 + totD() + 0.5 };
    run(3.0, function (t) {
      var p = track([[0, R0], [0.5, up], [1.5, over], [1.9, at], [2.1, at], [3.0, restPt()]], t);
      lorry.crane.x = p.x; lorry.crane.h = p.h;
      if (t < 2.0) { lorry.crane.open = 0; stackLogs(p.x, p.h - 0.5 - totD(), lerp(LR, 1, clamp((t - 0.5) / 1.4, 0, 1)), "held"); }
      else {
        lorry.crane.open = clamp((t - 2.0) / 0.2, 0, 1);
        if (onceM("put")) { stackLogs(STK2, 0.08, 1, "stack2"); snd.clunk(); coach.say("The logs go on the holding pile.", 3); }
      }
    }, function () { craneRest(); stepDone("lorry"); });
  }
  // Loader: drive to the pile, grab, drive to the log deck, drop the logs on it.
  function grabPt() { return { x: loader.x + loader.dir * (LDTIP + 0.3), h: loaderH(loader.lift) }; }
  function carryLogs() { if (!loader.carry) return; var g = grabPt(); stackLogs(g.x, g.h + 0.08, 1, "loader"); }
  function driveLoader(target, dir, next) {
    var x0 = loader.x, d0 = loader.dir, turn = Math.abs(d0 - dir) > 0.5 ? 0.9 : 0, dur = turn + Math.max(0.6, Math.abs(target - x0) / 3.0);
    run(dur, function (t) {
      if (t < turn) loader.dir = lerp(d0, dir, ease(t / turn));
      else { loader.dir = dir; var nx = lerp(x0, target, ease((t - turn) / Math.max(0.01, dur - turn))); loader.wheel += (nx - loader.x) * dir; loader.x = nx; }
      loader.tdir = loader.dir; carryLogs();
    }, function () { loader.x = target; loader.dir = loader.tdir = dir; carryLogs(); snd.clunk(); setSub(next); });
  }
  function loaderGrab() {
    var l0 = loader.lift;
    run(2.0, function (t) {
      loader.lift = t < 0.6 ? lerp(l0, 0, t / 0.6) : (t < 1.0 ? 0 : lerp(0, 0.38, (t - 1.0) / 1.0));
      loader.clamp = clamp((t - 0.6) / 0.35, 0, 1);
      if (t >= 0.9) { loader.carry = true; carryLogs(); if (onceM("g")) { snd.clunk(); coach.say("The grab picks up the logs.", 3); } }
    }, function () { setSub("drive2"); });
  }
  function loaderDrop() {
    var x0 = loader.x;
    run(3.0, function (t) {
      loader.lift = t < 0.8 ? lerp(0.38, 0.6, t / 0.8) : (t < 2.0 ? 0.6 : lerp(0.6, 0.2, (t - 2.0) / 1.0));
      loader.clamp = t < 0.8 ? 1 : 1 - clamp((t - 0.8) / 0.3, 0, 1);
      if (t < 1.0) carryLogs();
      else if (onceM("drop")) { loader.carry = false; deckLogs(); snd.clunk(); coach.say("The logs roll down the log deck.", 3); }
      if (t > 1.9) { var nx = lerp(x0, x0 - 2.4, ease((t - 1.9) / 1.1)); loader.wheel += (nx - loader.x); loader.x = nx; }
    }, function () { setSub("feed"); });
  }
  var QR = [1.06, 1.16, 1.26];
  function deckH(r) { return lerp(CONVH + 0.05, 1.6, clamp((r - 1.0) / 0.3, 0, 1)); }
  function deckLogs() {
    var q = 0;
    logs.forEach(function (L) { if (L.st === "gone") return; L.st = "deckroll"; L.q = q; L.tr = QR[q] || 1.3; L.tx = DECK + 0.3; L.th = deckH(L.tr) + L.d / 2; q++; });
  }
  // Saw: each tap rolls the front log onto the conveyor; it runs through the squaring saw and the splitting saw
  // and comes out as two square fence posts that slide onto the stack.
  function deckList() { return logs.filter(function (L) { return L.st === "deck" || L.st === "deckroll"; }).sort(function (a, b) { return a.q - b.q; }); }
  function sawNext() {
    var q = deckList()[0]; if (!q) return;
    q.st = "conv"; q.sq = 0; q.sp = 0; mill.run = 1;
    coach.say("The log goes to the saws.", 3);
    var r0 = q.r, h0 = q.h, x0 = DECK + 0.3, x1 = CONV1 - 0.9, dur = 0.6 + (x1 - x0) / MSPD + 0.4;
    mill.inset = { st: "round", t: 0 };
    run(dur, function (t, dt) {
      if (t < 0.6) { q.r = lerp(r0, 1, ease(t / 0.6)); q.h = lerp(h0, CONVH + q.d / 2, ease(t / 0.6)); q.x = x0; return; }
      var x = Math.min(x1, x0 + (t - 0.6) * MSPD);
      q.r = 1; q.h = CONVH + q.d / 2; q.x = x;
      q.sq = clamp(x + q.len / 2 - SAW1, 0, q.len); q.sp = clamp(x + q.len / 2 - SAW2, 0, q.len);
      if (q.sq > 0 && q.sq < q.len) {
        if (Math.random() < dt * 10) addPart({ kind: "stick", x: SAW1 + 0.4 + Math.random() * 0.4, h: CONVH + (Math.random() < 0.5 ? q.d * 0.85 : 0.05), vx: 0.4 + Math.random(), vh: Math.random() * 0.8, g: 9, life: 0.9, size: 0.3, col: BARK, spin: (Math.random() - 0.5) * 4, floor: 0.05 });
        if (Math.random() < dt * 30) addPart({ kind: "dust", x: SAW1 + 0.2, h: CONVH + q.d / 2 + (Math.random() - 0.5) * q.d, vx: 0.5 + Math.random() * 1.5, vh: (Math.random() - 0.5) * 1.2, g: 4, life: 0.6, size: 0.035, col: WOOD });
      }
      if (q.sp > 0 && q.sp < q.len && Math.random() < dt * 24) addPart({ kind: "dust", x: SAW2 + 0.2, h: CONVH + q.d / 2, vx: 0.4 + Math.random() * 1.2, vh: (Math.random() - 0.5) * 0.8, g: 4, life: 0.6, size: 0.035, col: WOOD });
      if (q.sq > 0.2 && onceM("sq")) { coach.say("The saws cut off the round sides.", 3); mill.inset = { st: "square", t: 0 }; snd.tick(); }
      if (q.sp > 0.2 && onceM("sp")) { coach.say("The saw cuts it into two posts.", 3); mill.inset = { st: "split", t: 0 }; snd.tick(); }
      if (x >= x1 && onceM("off")) postsOut(q);
    }, function () {
      if (q.st !== "gone") postsOut(q);
      var rest = deckList();
      rest.forEach(function (L, i) { L.q = i; L.tr = QR[i]; L.th = deckH(L.tr) + L.d / 2; L.st = "deckroll"; });
      if (rest.length) { mill.run = 0.3; setSub("feed"); }
      else { mill.run = 0; stepDone("saw"); }
    });
  }
  function postsOut(q) {
    q.st = "gone";
    for (var i = 0; i < 2; i++) mposts.push({ x: CONV1 - 0.9, h: CONVH + 0.2 + i * 0.12, n: mposts.length });
    posts += 2; save(); setCount(true); snd.clunk();
    Farm.world.update(function (w) { w.posts = (typeof w.posts === "number" && isFinite(w.posts) ? w.posts : 0) + 2; });
    fld.pileN = Math.min(6, mposts.length);
  }
  // Fence: the posts go to the field. Farmer Tom stands a post in the gap, the tractor backs up with the post
  // knocker and knocks it in, Farmer Tom fixes the netting to it.
  function fenceIn() {
    fld.pileN = Math.max(1, Math.min(6, mposts.length));
    coach.say("The fence posts go to the field.", 4);
    run(2.6, function () {}, function () { coach.say("The sheep can get out of the gap.", 4); setSub("stand"); tag("Farmer Tom", fld.tom.x, 2.0, 0.97); });
  }
  function standPostUp() {
    var T = fld.tom, x0 = T.x, pickX = PPILE + 0.9, holdX = HOLE - 0.55;
    coach.say("Farmer Tom carries a post to the hole.", 3);
    run(3.4, function (t) {
      if (t < 0.9) { T.x = lerp(x0, pickX, ease(t / 0.9)); T.flip = pickX < x0; T.bend = 0; }
      else if (t < 1.4) { T.bend = Math.sin(PI * (t - 0.9) / 0.5) * 0.8; if (t > 1.15 && onceM("pick")) { fld.post.st = "held"; fld.pileN = Math.max(0, fld.pileN - 1); snd.tick(); } }
      else if (t < 2.6) { T.flip = false; T.bend = 0; T.x = lerp(pickX, holdX, ease((t - 1.4) / 1.2)); }
      else if (onceM("stand")) { fld.post.st = "stand"; fld.post.tilt = 0; fld.post.sink = SINK[0]; snd.clunk(); }
      T.hands = fld.post.st === "held" ? [[0.25, -1.25], [0.1, -1.0]] : (fld.post.st === "stand" ? [[0.45, -1.3], [0.42, -1.02]] : null);
    }, function () { setSub("ted"); });
  }
  function driveTed() {
    var x0 = fld.ted.x, dur = Math.max(0.7, Math.abs(x0 - TEDK) / 2.4), tx = fld.tom.x;
    coach.say("The tractor backs up to the post.", 3);
    run(dur, function (t) {
      var nx = lerp(x0, TEDK, ease(t / dur)); fld.ted.wheel += nx - fld.ted.x; fld.ted.x = nx;
      fld.tom.x = lerp(tx, HOLE - 1.8, ease(t / dur)); fld.tom.hands = null;
    }, function () { fld.ted.x = TEDK; snd.clunk(); setSub("knock"); });
  }
  var SINK = [0.3, 0.6, 0.9, 1.2], KNOCKSAY = ["The weight drops on the post.", "The post goes down.", "The post is in the ground."];
  function knock() {
    var n = fld.knocks;
    run(1.35, function (t) {
      if (t < 0.95) fld.lift = ease(t / 0.95);
      else {
        fld.lift = Math.max(0, 1 - (t - 0.95) / 0.12);
        if (fld.lift <= 0 && onceM("bang")) {
          fld.knocks++; fld.post.sink = SINK[Math.min(3, fld.knocks)]; shake = 0.25; snd.clunk(); snd.clunk();
          for (var i = 0; i < 8; i++) addPart({ kind: "puff", x: HOLE + (Math.random() - 0.5) * 0.6, h: 0.05, vx: (Math.random() - 0.5) * 1.4, vh: 0.3 + Math.random() * 0.5, life: 0.9, size: 0.1, grow: 0.3, col: "#C9B38A", alpha: 0.6 });
          coach.say(KNOCKSAY[Math.min(2, n)], 3);
        }
      }
    }, function () {
      fld.lift = 0;
      if (fld.knocks < 3) { setSub("knock"); return; }
      var x0 = fld.ted.x;
      run(1.4, function (t) { var nx = lerp(x0, TEDK + 2.2, ease(t / 1.4)); fld.ted.wheel += nx - fld.ted.x; fld.ted.x = nx; }, function () { setSub("wire"); tag("Farmer Tom", fld.tom.x, 2.0, 0.97); });
    });
  }
  function fixWire() {
    var T = fld.tom, x0 = T.x, at = HOLE - 0.6, taps = 0;
    coach.say("Farmer Tom fixes the wire to the post.", 3);
    run(3.2, function (t) {
      if (t < 1.0) { T.x = lerp(x0, at, ease(t / 1.0)); T.flip = false; T.hands = null; }
      else {
        fld.wire = clamp((t - 1.0) / 1.7, 0, 1);
        var hit = Math.floor((t - 1.0) * 3);
        T.hands = [[0.42, -1.05 - Math.abs(Math.sin((t - 1.0) * PI * 3)) * 0.25], [0.4, -0.85]];
        if (hit > taps) { taps = hit; snd.tick(); }
      }
    }, function () { fld.wire = 1; T.hands = null; stepDone("fence"); });
  }

  // ---------- Surprise: a fun moment on the scene, taking turns ----------
  var surpriseN = 0;
  function forestNow() { return job === "chip" || stepId === "fell" || stepId === "logs"; }
  function brashSpot() { return job === "chip" ? PILE0 + 1.0 : (forestNow() ? (brash.n > 0 ? 1.6 : 0.9) : viewX(0.45)); }
  function viewX(f) { return scW.wx(RW.w * f, 1); }
  function surprise() {
    if (locked()) return;
    var pick = forestNow() ? ["dog", "squirrel"][surpriseN++ % 2] : "dog";
    if (pick === "dog") {
      var to = brashSpot();
      dog = { x: viewX(1.04), stop: to + 0.4, t: 0, st: "run", ph: 0, stick: false, flip: true, forest: forestNow() };
      coach.say("Here comes Midge.", 3);
      return;
    }
    if (pick === "squirrel") {
      var best = null, bd = 1e9;
      EDGE[job].forEach(function (x) { var px = scW.X(x, EDGE_R), d = Math.abs(px - RW.w * 0.5); if (px > RW.w * 0.08 && px < RW.w * 0.92 && d < bd) { bd = d; best = x; } });
      if (best === null) best = EDGE[job][1];
      sq = { tx: best, x: best - 2.6, h: 0, t: 0, st: "run", ph: 0 };
      coach.say("A squirrel runs up the tree!", 4);
    }
  }

  // =====================================================================================================
  // Particles (world x, height h in metres, depth r)
  // =====================================================================================================
  var parts = [];
  function addPart(p) { if (parts.length > 160) parts.shift(); p.t = 0; p.rot = p.rot || Math.random() * 3; p.r = p.r || 1; parts.push(p); }
  function updateParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      if (p.kind === "puff") { p.x += p.vx * dt; p.h += p.vh * dt; p.size += (p.grow || 0.5) * dt; continue; }
      p.vh -= (p.g === undefined ? 9 : p.g) * dt; p.x += p.vx * dt; p.h += p.vh * dt; p.rot += (p.spin || 0) * dt;
      var fl = p.floor || 0;
      if (p.h < fl) { p.h = fl; p.vh = 0; p.vx *= 0.2; p.spin = 0; if (p.t < p.life - 0.2) p.t = p.life - 0.2; }
    }
  }
  function drawParts(sc) {
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], s = sc.S(p.r), x = sc.X(p.x, p.r), y = sc.Y(p.r) - p.h * s, z = Math.max(1, p.size * s), f = p.t / p.life;
      if (x < -40 || x > sc.W + 40) continue;
      ctx.globalAlpha = p.kind === "puff" ? (p.alpha || 0.5) * (1 - f) : (f > 0.7 ? (1 - f) / 0.3 : 1);
      ctx.fillStyle = p.col;
      if (p.kind === "puff" || p.kind === "dust") { ctx.beginPath(); ctx.arc(x, y, z, 0, TAU); ctx.fill(); }
      else if (p.kind === "chip") { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillRect(-z, -z * 0.5, z * 2, z); ctx.restore(); }
      else if (p.kind === "bough") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(z, 0); ctx.lineTo(-z * 0.6, -z * 0.7); ctx.lineTo(-z * 0.6, z * 0.7); ctx.closePath();
        ctx.fill(); ctx.lineWidth = Math.max(1, sc.lw * 0.6); ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
      } else if (p.kind === "stick") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillRect(-z, -z * 0.12, z * 2, z * 0.24); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  function postTop() { return LOGL - (fld.post.sink || 0); }
  function targetPt() {
    var d = SUB[key()], t = d ? d.part : null, i;
    if (t === "harv") return bestPt(harv.x + 0.5, 1.9);
    if (t === "head") return bestPt(head.x, head.h, head.r);
    if (t === "lorry") return bestPt(lorry.x + 0.25, 2.6, LR);
    if (t === "wheel") { for (i = 0; i < LWHEELS.length; i++) if (lorry.pop.indexOf(i) < 0) return bestPt(lorry.x + LWHEELS[i], LWR, LR); return null; }
    if (t === "lorrylogs") return bestPt(lorry.x + LBUNK, 2.3, LR);
    if (t === "stack2") return bestPt(STK2, 0.6, 1);
    if (t === "loader") return bestPt(loader.x - loader.dir * 0.4, 1.8, 1);
    if (t === "grab") { var g = grabPt(); return bestPt(g.x, g.h + 0.5, 1); }
    if (t === "deck") { var q = deckList()[0]; return q ? bestPt(q.x, q.h, q.r) : null; }
    if (t === "ppile") return bestPt(PPILE, 0.35, 0.95);
    if (t === "post") return bestPt(HOLE + Math.sin(fld.post.tilt) * 1.2, postTop() - 0.6, 1);
    if (t === "ted") return bestPt(fld.ted.x + 0.6, 1.8, 1);
    if (t === "knocker") return bestPt(fld.ted.x + KX, postTop() + 1.0 + fld.lift * 1.7, 1);
    if (t === "wire") return bestPt(HOLE + 1.8, 0.6, 1);
    return null;
  }
  function partScreen(id) {
    if (job === "logs") return targetPt();
    if (id === "turn") return bestPt(-0.3, 2.4);
    if (id === "feed" || id === "chips") return bestPt((PILE0 + PILE1) / 2, 0.7);
    return null;
  }
  function partList() {
    var list = [];
    views().forEach(function (sc) {
      function add(id, x, h, size, r) { var p = scrPt(sc, x, h, r); if (inView(sc, x, h, r)) list.push({ id: id, x: p.x, y: p.y, r: Math.max(40, sc.k * size) }); }
      if (job === "logs") {
        add("harv", harv.x - 0.5, 1.9, 2.6);
        add("head", head.x, head.h, 1.0, head.r);
        if (tree.on && tree.rot < 0.1) add("tree", 0, 3.0, 1.6);
        else if (tree.on) add("tree", head.x + 2.8, 1.0, 1.6);
        if (logs.some(function (L) { return L.st === "stack"; })) add("stack", STKA_X, 0.5, 1.4);
        if (brash.n > 0) add("brash", 1.8, 0.4, 1.2);
        if (lorry.on && !lorry.leave) {
          add("lorry", lorry.x + 0.25, 2.4, 2.0, LR);
          LWHEELS.forEach(function (wx, i) { add("wheel" + i, lorry.x + wx, LWR, 0.55, LR); });
          if (logs.some(function (L) { return L.st === "lorry" || L.st === "held"; })) add("lorrylogs", lorry.x + LBUNK, 2.3, 1.5, LR);
          add("crane", lorry.crane.x, lorry.crane.h - 0.6, 0.9, LR);
        }
        add("weigh", HUT[0], 1.6, 1.2, HUT[1]);
        if (logs.some(function (L) { return L.st === "stack2"; }) || stepId === "lorry") add("stack2", STK2, 0.5, 1.4);
        add("loader", loader.x - loader.dir * 0.4, 1.9, 1.8);
        var g = grabPt(); add("grab", g.x, g.h + 0.5, 1.0);
        if (deckList().length) add("deck", DECK + 0.3, 1.45, 1.6, 1.15);
        add("saw", SAW1, 2.0, 1.2);
        if (mposts.length) add("postpile", PSTK, 0.7, 1.2);
        if (fld.pileN > 0) add("ppile", PPILE, 0.3, 1.1, 0.95);
        if (fld.post.st === "stand") add("post", HOLE, postTop() * 0.6, 0.9);
        add("hole", HOLE, 0.2, 0.5);
        add("ted", fld.ted.x + 0.6, 1.8, 1.8);
        add("knocker", fld.ted.x + KX, 2.4, 1.1);
        add("wire", HOLE + 1.8, 0.6, 1.1);
        add("tom", fld.tom.x, 1.1, 0.8, 0.97);
      } else {
        add("tractor", -0.9, 2.0, 2.0);
        add("chipper", 2.0, 1.5, 1.4);
        add("spout", NOZ[0] - 0.2, NOZ[1], 0.9);
        add("grapple", grp.x, grp.h, 0.9);
        if (ch.pile > 0.02) add("pile", (PILE0 + PILE1) / 2, 0.6, 1.8);
        add("trailer", TRC, 2.2, 2.4);
      }
    });
    return list;
  }
  // A real part's name pops up when he taps it (a small plain label)
  var NAMESL = { lorry: "Timber lorry", lorrylogs: "Logs", crane: "Crane", weigh: "Weighbridge", stack2: "Log pile", loader: "Log loader", grab: "Log grab", deck: "Log deck", saw: "Saws", postpile: "Fence posts", ppile: "Fence posts", post: "Fence post", hole: "Post hole", ted: "Tractor", knocker: "Post knocker", wire: "Sheep fence", tom: "Farmer Tom" };
  function tagLogs(part) {
    if (part === "harv") { snd.horn(); tag("Forestry harvester", harv.x, 3.4); return true; }
    if (part === "head") { snd.tick(); head.roll += 2; tag("Harvester head", head.x, head.h + 0.7, head.r); return true; }
    if (part === "tree") { tree.sway = 1; snd.tick(); tag(tree.rot < 0.1 ? "Spruce tree" : "Trunk", tree.rot < 0.1 ? 0 : head.x + 2.5, tree.rot < 0.1 ? 4.5 : 1.6); return true; }
    if (part === "stack") { snd.clunk(); tag("Logs", STKA_X, 1.2); return true; }
    if (part === "brash") { snd.tick(); tag("Brash", 1.8, 0.9); return true; }
    if (part && /^wheel\d$/.test(part)) { snd.tick(); tag("Wheel", lorry.x + LWHEELS[+part.slice(5)], 1.4, LR); return true; }
    if (part && NAMESL[part]) {
      if (part === "lorry" || part === "loader" || part === "ted") snd.horn(); else snd.tick();
      var p = { lorry: [lorry.x - 1, 4.2, LR], lorrylogs: [lorry.x + LBUNK, 3.0, LR], crane: [lorry.crane.x, lorry.crane.h + 0.3, LR], weigh: [HUT[0], 3.4, HUT[1]], stack2: [STK2, 1.6, 1],
        loader: [loader.x, 4.0, 1], grab: [grabPt().x, grabPt().h + 1.4, 1], deck: [DECK + 0.3, 2.2, 1.15], saw: [SAW1, 3.4, 1], postpile: [PSTK, 1.8, 1], ppile: [PPILE, 1.0, 0.95],
        post: [HOLE, postTop() + 0.4, 1], hole: [HOLE, 0.6, 1], ted: [fld.ted.x + 0.5, 3.6, 1], knocker: [fld.ted.x + KX, 4.7, 1], wire: [HOLE + 1.8, 1.5, 1], tom: [fld.tom.x, 2.0, 0.97] }[part];
      tag(NAMESL[part], p[0], p[1], p[2]); return true;
    }
    return false;
  }
  function tapLogs(part) {
    if (phase === "ready") {
      var k = key();
      if (act(part)) { if (ghost) ghost.learned(k); glow = 0; return; }
    }
    if (phase === "work" && part && part !== "hole") { busyHint(); return; }
    if (tagLogs(part)) return;
    if (phase === "done") { coach.say("The sheep are safe in the field.", 3); return; }
    hint();
  }
  // which view a finger is in, and the world x under it
  function scAt(vy) { var b = cv.getBoundingClientRect(); return split && vy - b.top >= RC.y ? scC : scW; }
  function wxAt(sc, vx) { var b = cv.getBoundingClientRect(), R = regOf(sc); return sc.wx(vx - b.left - R.x, 1); }
  var drag = null;
  var press = Toybox.press(cv, {
    any: true,
    parts: partList,
    dragStart: function (part, e, s) {
      drag = null;
      if (locked() || job !== "logs" || phase !== "ready") return;
      var k = key(), p = part || "", sc = scAt(s.y0), w0 = wxAt(sc, s.x0);
      if (k === "fell.drive" && (p === "harv" || p === "head")) drag = { kind: "harv", sc: sc, off: w0 - harv.x, x0: harv.x };
      else if (k === "lorry.drive" && (p === "lorry" || p === "lorrylogs" || p === "crane" || /^wheel\d$/.test(p))) drag = { kind: "lorry", sc: sc, off: w0 - lorry.x, x0: lorry.x };
      else if ((k === "saw.drive" || k === "saw.drive2") && (p === "loader" || p === "grab")) drag = { kind: "loader", sc: sc, off: w0 - loader.x, x0: loader.x };
      else if (k === "fence.ted" && (p === "ted" || p === "knocker")) drag = { kind: "ted", sc: sc, off: w0 - fld.ted.x, x0: fld.ted.x };
      else drag = { kind: "act", part: part };
    },
    move: function (part, e, s) {
      if (!drag || locked() || phase !== "ready") return;
      var nx;
      if (drag.kind === "harv") { nx = clamp(wxAt(drag.sc, s.x) - drag.off, HV0 - 13, HV0); harv.wheel += nx - harv.x; harv.x = nx; syncHead(); }
      else if (drag.kind === "lorry") { nx = clamp(wxAt(drag.sc, s.x) - drag.off, LXF, LXW); lorry.wheel += nx - lorry.x; lorry.x = nx; craneRest(); }
      else if (drag.kind === "loader") {
        nx = clamp(wxAt(drag.sc, s.x) - drag.off, LD_STK, LD_DECK);
        if (Math.abs(nx - loader.x) > 0.01) loader.tdir = nx < loader.x ? -1 : 1;
        loader.wheel += (nx - loader.x) * loader.dir; loader.x = nx; carryLogs();
      } else if (drag.kind === "ted") { nx = clamp(wxAt(drag.sc, s.x) - drag.off, TEDK, TED0 + 2); fld.ted.wheel += nx - fld.ted.x; fld.ted.x = nx; }
    },
    up: function (part, e, s) {
      var d = drag; drag = null;
      if (!d || locked() || job !== "logs" || phase !== "ready") return;
      var k = key();
      if (d.kind === "act") { if (act(d.part)) { if (ghost) ghost.learned(k); glow = 0; } return; }
      if (ghost) ghost.learned(k);
      // a drag towards the stop sets the machine going: it drives on to its stop when he lets go
      if (d.kind === "harv") { if (harv.x > d.x0 + 0.5 || HV0 - harv.x < 1.5) driveHarv(); return; }
      if (d.kind === "lorry") { if (lorry.x > d.x0 + 0.5 || LXW - lorry.x < 5) driveLorry(); return; }
      if (d.kind === "loader") {
        var tgt = sub === "drive" ? LD_STK : LD_DECK;
        if ((tgt - d.x0) * (loader.x - d.x0) > 0.25 || Math.abs(loader.x - tgt) < 1.5) driveLoader(tgt, sub === "drive" ? -1 : 1, sub === "drive" ? "grab" : "drop");
        return;
      }
      if (d.kind === "ted") { if (fld.ted.x < d.x0 - 0.5 || Math.abs(fld.ted.x - TEDK) < 1.2) driveTed(); return; }
    },
    tap: function (part, x, y) {
      if (locked()) return;
      if (job === "logs") { tapLogs(part); return; }
      var mine = false;
      if (stepId === "turn") mine = part === "tractor" || part === "chipper";
      else if (stepId === "feed" || stepId === "chips") mine = part === "pile" || part === "grapple" || part === "chipper" || part === "tractor";
      if (mine && phase === "ready") { go(); return; }
      if (part === "spout") { ch.kick = 1; snd.pop(); tag("Spout", NOZ[0], NOZ[1] + 0.3); if (phase !== "work") coach.say("The spout aims the chips.", 3); return; }
      if (part === "tractor") { snd.horn(); tag("Swivel seat", -0.3, 3.1); return; }
      if (part === "chipper") { snd.tick(); tag("Wood chipper", 2.2, 2.6); return; }
      if (part === "grapple") { grp.open = 1; snd.tick(); tag("Crane", grp.x, grp.h + 0.9); return; }
      if (part === "pile") { snd.tick(); tag("Branches", (PILE0 + PILE1) / 2, 1.5); return; }
      if (part === "trailer") { snd.clunk(); tag("Trailer", TRC, 3.9); return; }
      if (phase === "done") coach.say("Tap Again!", 3); else steps.sayStep();
      if (ghost) ghost.poke();
    }
  });

  // =====================================================================================================
  // Simulation: the steps as timelines
  // =====================================================================================================
  function pose(x, h, r, rot) { return { x: x, h: h, r: r, rot: rot }; }
  // waypoints: [[t, pose], ...] -> the pose at time t (eased between neighbours)
  function track(list, t) {
    if (t <= list[0][0]) return list[0][1];
    for (var i = 1; i < list.length; i++) {
      if (t <= list[i][0]) {
        var a = list[i - 1], b = list[i], k = ease((t - a[0]) / Math.max(0.001, b[0] - a[0]));
        return { x: lerp(a[1].x, b[1].x, k), h: lerp(a[1].h, b[1].h, k), r: lerp(a[1].r === undefined ? 1 : a[1].r, b[1].r === undefined ? 1 : b[1].r, k), rot: lerp(a[1].rot || 0, b[1].rot || 0, k) };
      }
    }
    return list[list.length - 1][1];
  }
  function setHead(p) { head.x = p.x; head.h = p.h; head.r = p.r === undefined ? 1 : p.r; head.rot = p.rot || 0; }
  function once(id) { if (wk.ev[id]) return false; wk.ev[id] = 1; return true; }
  function treeAt(rot) { var gx = 0, gh = SG; tree.rot = rot; tree.px = gx - SG * Math.sin(rot); tree.ph = gh - SG * Math.cos(rot); }

  // Turn: the seat swivels round, the crane unfolds, the chipper starts.
  function workTurn(dt) {
    var t = wk.t;
    ch.sw = ease(clamp(t / 1.4, 0, 1));
    ch.unfold = ease(clamp((t - 1.0) / 1.6, 0, 1));
    var p = track([[1.0, GFOLD], [1.8, { x: 4.4, h: 3.5 }], [2.6, GREADY]], t);
    grp.x = p.x; grp.h = p.h; grp.open = lerp(0.3, 0.6, ch.unfold);
    if (t > 1.0 && once("crane")) coach.say("The crane unfolds.", 3);
    if (t > 2.5) { ch.fly = Math.min(1, ch.fly + dt * 0.9); if (once("start")) { coach.say("The chipper starts up.", 3); snd.clunk(); } }
    if (t > 3.9) stepDone("turn");
  }
  // Feed / Chips: the crane grabs the branches, lays them on the infeed table; rollers pull them in; chips fly.
  function pileTop() { return 0.25 + 1.25 * Math.pow(ch.pile, 0.7); }
  function workFeed(dt) {
    var t = wk.t, fd = wk.feedDur, amt = wk.amt;
    if (!wk.pl) wk.pl = { x: 6.5, h: pileTop() + 0.35 };
    var p = track([[0, wk.g0], [0.8, wk.pl], [1.1, wk.pl], [1.6, GUP], [2.1, GTUP], [2.5, GTAB], [2.75, GTAB], [3.4, GREADY]], t);
    grp.x = p.x; grp.h = p.h;
    grp.open = t < 0.8 ? lerp(0.6, 1, t / 0.8) : (t < 1.1 ? 1 - (t - 0.8) / 0.3 : (t < 2.5 ? 0 : (t < 2.75 ? (t - 2.5) / 0.25 : lerp(1, 0.6, clamp((t - 2.75) / 0.6, 0, 1)))));
    if (t >= 1.05 && once("grab")) { bnd = { st: "held", amt: amt, seed: Math.floor(Math.random() * 50), feed: 0 }; ch.pile = Math.max(0, ch.pile - amt); snd.clunk(); for (var i = 0; i < 4; i++) addPart({ kind: "bough", x: 6.5 + (Math.random() - 0.5), h: pileTop(), vx: (Math.random() - 0.5) * 2, vh: 1 + Math.random(), g: 9, life: 0.5, size: 0.15, col: NEEDLE2, spin: 5, floor: 0.2 }); }
    if (bnd && bnd.st === "held") { bnd.x = grp.x; bnd.h = grp.h - 0.55; }
    if (t >= 2.62 && once("drop")) { bnd.st = "table"; bnd.x = GTAB.x; bnd.h = 1.02; snd.clunk(); coach.say("The rollers pull them in.", 3); }
    if (bnd && bnd.st === "table") {
      bnd.feed = clamp((t - 2.75) / fd, 0, 1); bnd.x = GTAB.x - 1.75 * bnd.feed; ch.roll += dt * 9;
      if (bnd.feed >= 1) bnd = null;
    }
    var c0 = 2.95, c1 = 2.75 + fd + 0.35;
    if (t > c0 && t < c1) {
      ch.rate = 1;
      ch.load = lerp(wk.load0, wk.load0 + amt * 1.05, clamp((t - c0) / (c1 - c0), 0, 1));
      if (t > c0 + 0.5 && once("fly")) coach.say(stepId === "feed" ? "Chips fly into the trailer!" : "The trailer fills right up!", 3);
    } else ch.rate = 0;
    if (t > Math.max(3.5, c1 + 0.25)) { ch.rate = 0; stepDone(stepId); }
  }
  function chipFx(dt) {
    if (ch.rate <= 0) return;
    var n = dt * 48, i;
    for (i = 0; i < 3; i++) {
      if (Math.random() > n / 3) continue;
      var T = 1.0 + Math.random() * 0.12, tx = TRC + ch.aim * 2.2 + (Math.random() - 0.5) * 1.6, th = 3.2 + ch.load * 1.1;
      addPart({ kind: "chip", x: NOZ[0] - 0.35, h: NOZ[1] + 0.05, vx: (tx - NOZ[0] + 0.35) / T, vh: (th - NOZ[1] + 0.5 * 9 * T * T) / T, g: 9, life: T, size: 0.09 + Math.random() * 0.06, col: CHIP[Math.floor(Math.random() * 4)], spin: 12, floor: -5 });
    }
  }

  // =====================================================================================================
  // Update
  // =====================================================================================================
  function wideRange() {
    if (job === "chip") return { xa: TRL - 8.7, xb: PILE1 + 0.5, mh: 5.3 };
    if (stepId === "fell") {
      var xa0 = Math.min(HV0 - 3.95, harv.x - 3.95);
      if (tree.rot > 0.08 || phase === "done") return { xa: xa0, xb: 9.4, mh: 5.4 };
      return { xa: xa0, xb: 1.9, mh: TH + 0.75 };
    }
    if (stepId === "logs") return { xa: HV0 - 3.95, xb: 9.4, mh: 5.4 };
    if (stepId === "lorry") {
      if (sub === "grab" || sub === "drop" || (sub === "count" && lorry.x >= LXW - 0.1)) return { xa: LXW - 15.4, xb: STK2 + 2.4, mh: 5.8 };
      if (lorry.x < LXF + 0.5) return { xa: Math.min(lorry.x - 15.4, STKA_X - 3), xb: lorry.x + 3.8, mh: 5.4 };
      return { xa: lorry.x - 15.4, xb: lorry.x + 4.6, mh: 5.2 };
    }
    if (stepId === "saw" && sub !== "feed") return { xa: STK2 - 2.6, xb: DECK + 2.6, mh: 4.6 };
    if (stepId === "saw") return { xa: DECK - 3.4, xb: PSTK + 2.6, mh: 7.4 };
    return { xa: PPILE - 3.2, xb: TED0 + 4.2, mh: 4.8 };
  }
  function closeTarget() {
    if (job === "chip") {
      if (phase === "done") return { cx: TRC + 0.6, span: 9.5, mh: 5.0 };
      if (stepId === "turn") return { cx: 0.6, span: 7.2, mh: 4.6 };
      return { cx: 3.9, span: 9.5, mh: 4.8 };
    }
    if (stepId === "fell" && sub === "drive") return { cx: harv.x + 1.5, span: 9.5, mh: 4.3 };
    if (stepId === "fell") return { cx: tree.rot > 0.3 ? 0.5 : -1.8, span: 9, mh: 4.4 };
    if (stepId === "logs") return { cx: -0.4, span: 9, mh: 4.0 };
    if (stepId === "lorry") {
      if (sub === "count") return { cx: lorry.x - 6.5, span: 16.5, mh: 4.2 };
      if (sub === "grab" || sub === "drop") return { cx: (lorry.x + LBUNK + STK2) / 2, span: 14, mh: 5.6 };
      if (lorry.x < LXF + 0.5) return { cx: (STKA_X + lorry.x + LBUNK) / 2, span: 10, mh: 5.0 };
      return { cx: lorry.x - 3.5, span: 11, mh: 4.6 };
    }
    if (stepId === "saw" && sub !== "feed") return { cx: loader.x + loader.dir * 1.3, span: 9, mh: 4.6 };
    if (stepId === "saw") return { cx: (SAW1 + SAW2) / 2, span: 9.5, mh: 4.0 };
    return { cx: HOLE + 0.8, span: 7.5, mh: 4.6 };
  }
  function follow(dt, snap) {
    var e = Math.min(1, dt * 2.2), rg = wideRange(), ct = closeTarget();
    zW.target = rg.xb - rg.xa; zW.mht = rg.mh; zW.tcx = (rg.xa + rg.xb) / 2;
    zC.target = ct.span; zC.mht = ct.mh; zC.tcx = ct.cx;
    [[zW, scW, RW], [zC, scC, RC]].forEach(function (q) {
      var z = q[0];
      if (snap) { z.span = z.target; z.mh = z.mht; q[1].layout(q[2].w, q[2].h); }
      else if (Math.abs(z.span - z.target) > 0.02 || Math.abs(z.mh - z.mht) > 0.02) { z.span += (z.target - z.span) * e; z.mh += (z.mht - z.mh) * e; q[1].layout(q[2].w, q[2].h); }
      q[1].follow(z.tcx, dt * 1.4, snap);
    });
  }
  var engLevel = 0;
  function update(dt) {
    time += dt; phaseT += dt;
    var work = 0;
    if (shake > 0) shake = Math.max(0, shake - dt);
    if (tree.sway > 0) tree.sway = Math.max(0, tree.sway - dt * 0.8);
    if (job === "logs") {
      if (mo) {
        mo.t += dt; work = Math.max(work, 0.8);
        mo.fn(Math.min(mo.t, mo.dur), dt);
        if (mo && mo.t >= mo.dur) { var en = mo.end; mo = null; en(); }
      }
      glow = Math.max(0, glow - dt);
      updateLogs(dt);
      // the lorry drives off after the unload
      if (lorry.leave) {
        var v = clamp(2 + (lorry.x - LXW) * 0.8, 2, 14); lorry.x += v * dt; lorry.wheel += v * dt; craneRest();
        if (lorry.x > DECK + 50) { lorry.on = false; lorry.leave = false; }
      }
      if (lorry.on && !lorry.leave && Math.abs(lorry.x - LXW) < 0.05) lorry.lit = Math.min(1, lorry.lit + dt * 0.8);
      else lorry.lit = Math.max(0, lorry.lit - dt * 0.8);
      if (!mo && Math.abs(loader.dir - loader.tdir) > 0.001) { loader.dir += clamp(loader.tdir - loader.dir, -dt * 2.5, dt * 2.5); carryLogs(); }
      mill.spin += dt * (mill.run > 0.5 ? 1 : 0.12);
      if (mill.inset) mill.inset.t += dt;
      if (mill.run > 0.5) work = Math.max(work, 0.7);
      mposts.forEach(function (p) {
        var tx = PSTK + (p.n % 2 ? 0.08 : -0.05), th = 0.14 + p.n * 0.2;
        p.x += (tx - p.x) * Math.min(1, dt * 4); p.h += (th - p.h) * Math.min(1, dt * 5);
      });
      // the people walk when they move; the sheep graze; the gap sheep wanders towards the gap until it is fixed
      [fld.tom].forEach(function (P) {
        var mv = Math.abs(P.x - P.px); P.px = P.x;
        if (mv > 0.0005) { P.walk += mv * 7; P.stride = Math.min(1, P.stride + dt * 6); } else P.stride = Math.max(0, P.stride - dt * 5);
      });
      fld.sheep.forEach(function (s, i) {
        s.ph += dt * 0.4;
        if (s.gap) {
          var tr = fld.wire >= 1 ? 1.32 : (stepId === "fence" ? 1.1 : 1.2), tx = fld.wire >= 1 ? HOLE - 3 : HOLE + 1.4;
          var dx = tx - s.x, dr = tr - s.r, mvg = Math.abs(dx) > 0.05 || Math.abs(dr) > 0.01;
          s.x += clamp(dx, -0.6, 0.6) * dt; s.r += clamp(dr, -0.08, 0.08) * dt; s.flip = dx < 0;
          s.gait = mvg ? 1 : 0; s.head = mvg ? 0 : 1; s.ph += mvg ? dt * 1.4 : 0;
        } else s.head = 0.8 + 0.2 * Math.sin(time * 0.7 + i);
      });
      if (phase === "done" && fld.home > 0) {
        fld.home += dt;
        if (fld.home > 2.5) {
          if (!fld.said) { fld.said = true; coach.say("Farmer Tom and Midge walk home.", 4); }
          fld.tom.flip = false; fld.tom.x += 1.3 * dt; fld.midge.x = fld.tom.x + 1.1; fld.midge.ph += dt * 2.6;
        }
      }
    } else {
      ch.flyA += dt * ch.fly * 16;
      ch.kick = Math.max(0, ch.kick - dt * 0.7);
      ch.aim = Math.sin(time * 1.4) * (ch.rate > 0 ? 1 : 0.2) + Math.sin(ch.kick * PI * 3) * ch.kick;
      if (phase === "work" && wk) {
        wk.t += dt; work = Math.max(work, 0.7);
        if (stepId === "turn") workTurn(dt);
        else workFeed(dt);
      }
      chipFx(dt);
      ch.stream += ((ch.rate > 0 ? 1 : 0) - ch.stream) * Math.min(1, dt * 4);
      if (ch.fly > 0) work = Math.max(work, 0.4 + ch.fly * 0.4);
    }
    if (dog) updateDog(dt);
    if (sq) updateSq(dt);
    if (ending) dusk = Math.min(1, dusk + dt * 0.5);
    updateParts(dt);
    follow(dt);
    engLevel += (work - engLevel) * Math.min(1, dt * 4);
    snd.engine(ending ? -1 : 0.15 + engLevel * 0.85);
    var buzz = (head.saw > 0.1 && job === "logs") || (mill.run > 0.5 && job === "logs") ? 0.6 : (ch.rate > 0 ? 0.7 : 0);
    snd.pour(ending ? 0 : buzz);
    snd.soil(job === "chip" && ch.fly > 0 && !ending ? 0.25 + ch.rate * 0.4 : 0);
  }
  function updateDog(dt) {
    var g = dog; g.t += dt;
    if (g.st === "run") { var dx = g.stop - g.x; g.x += clamp(dx * 2.2, -8, 8) * dt; g.ph += dt * 3; if (Math.abs(dx) < 0.25) { g.st = "sniff"; g.t = 0; } }
    else if (g.st === "sniff") {
      g.ph += dt * 0.6;
      if (g.t > 0.8 && !g.stick && g.forest) { g.stick = true; snd.pop(); coach.say("Midge takes a branch!", 3); }
      if (g.t > 1.3) { g.st = "go"; g.t = 0; g.flip = false; }
    } else {
      g.x += (job === "chip" ? 7 : -7) * dt; g.flip = job === "chip"; g.ph += dt * 3.4;
      if (g.t > 3.2) dog = null;
    }
  }
  function updateSq(dt) {
    var s = sq; s.t += dt; s.ph += dt * 3;
    if (s.st === "run") { s.x += 3.2 * dt; if (s.x >= s.tx) { s.x = s.tx; s.st = "up"; s.t = 0; } }
    else if (s.st === "up") { s.h += 2.6 * dt; if (s.h >= 4.4) { s.h = 4.4; s.st = "sit"; s.t = 0; snd.tick(); } }
    else if (s.st === "sit") { s.ph -= dt * 2.2; if (s.t > 2.6) { s.st = "top"; s.t = 0; } }
    else { s.h += 2.4 * dt; if (s.t > 1.4) sq = null; }
  }

  // =====================================================================================================
  // Drawing
  // =====================================================================================================
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    views().forEach(function (sc) { drawView(sc, regOf(sc)); });
    if (split) {
      var yb = RC.y + RC.h;
      ctx.fillStyle = mix("#7DBB52", "#1E2B44", dusk * 0.5); ctx.fillRect(0, yb, W, H - yb);
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, RC.y); ctx.lineTo(W, RC.y); ctx.moveTo(0, yb); ctx.lineTo(W, yb); ctx.stroke(); ctx.restore();
    }
    drawOverlays();
  }
  function drawView(sc, R) {
    ctx.save(); ctx.translate(R.x, R.y);
    ctx.beginPath(); ctx.rect(0, 0, R.w, R.h); ctx.clip();
    if (shake > 0) ctx.translate(Math.sin(time * 70) * shake * 6, Math.cos(time * 53) * shake * 4);
    drawWorld(sc);
    ctx.restore();
  }
  function put(sc, x, r, dir, fn) {
    var d = Math.abs(dir) < 0.12 ? (dir < 0 ? -0.12 : 0.12) : dir;
    Farm.inUnits(ctx, PX(sc, x, r), sc.Y(r), sc.S(r), sc.lw, function () { ctx.scale(d, 1); fn(); });
  }
  function drawWorld(sc) {
    sc.sky(ctx, { time: time, arc: null, season: "summer", dusk: dusk });
    drawWoods(sc);
    drawClearing(sc);
    EDGE[job].forEach(function (x) { drawEdgeTree(sc, x); if (sq && sq.tx === x) drawSq(sc); });
    if (job === "logs") drawLogsJob(sc); else drawChipJob(sc);
    drawParts(sc);
    sc.verge(ctx, {});
    if (dog) drawDog(sc);
  }
  // the woods on the hillside behind the clearing: rows of spruce and oak, the far rows hazy
  function drawWoods(sc) {
    var n = sc.night || 0, rows = [6.2, 4.4, 3.2, 2.4, 1.9];
    function lift(r) { return (r - 1.3) * 0.75; }
    var rT = rows[0], yTop = sc.Y(rT) - (lift(rT) + 2.5) * sc.S(rT), lw = Math.max(1.1, sc.lw * 0.6);
    ctx.fillStyle = mix("#7FAE68", "#1E2B44", n * 0.6); ctx.fillRect(0, yTop, sc.W, sc.Y(1.3) - yTop + 1);
    rows.forEach(function (r, ri) {
      var s = sc.S(r), yb = sc.Y(r) - lift(r) * s, rg = sc.xRange(r), sp = 1.7 + r * 0.35, haze = clamp((r - 1.7) / 4.5, 0, 1) * 0.55 + 0.18;
      for (var j = Math.floor(rg[0] / sp) - 2; j <= Math.ceil(rg[1] / sp) + 2; j++) {
        var x = (j + hash(j, ri + 40) * 0.8) * sp, h = (6.5 + 3.5 * hash(j, ri + 41)) * s, px = sc.X(x, r);
        if (job === "logs" && x > WOODS_END + ri * 4 + hash(j, ri + 45) * 5) continue;
        if (px < -h * 0.5 || px > sc.W + h * 0.5) continue;
        var col = mix(mix(hash(j, ri + 42) > 0.5 ? "#3A7442" : "#4A8650", "#A9C6DC", haze), "#1E2B44", n * 0.6);
        if (hash(j, ri + 43) > 0.3) spruce(ctx, px, yb, h, lw, col);
        else { ctx.save(); ctx.globalAlpha = 1 - haze * 0.45; D.tree(ctx, px, yb, h * 0.75, "oak", "summer", lw, hash(j, ri + 44)); ctx.restore(); }
      }
    });
  }
  // the clearing in front of the woods: a forest floor with needles, cones and ferns
  function drawClearing(sc) {
    var n = sc.night || 0, y0 = sc.Y(1.3), y1 = sc.Y(sc.rN);
    ctx.fillStyle = mix("#93AE5E", "#2B3A55", n * 0.5); ctx.fillRect(0, y0, sc.W, y1 - y0 + 1);
    ctx.fillStyle = mix("#A88A57", "#2B3A55", n * 0.5); ctx.fillRect(0, sc.Y(1.12), sc.W, sc.Y(0.95) - sc.Y(1.12));
    ctx.strokeStyle = "rgba(29,35,64,0.25)"; ctx.lineWidth = Math.max(1, sc.lw * 0.5);
    ctx.beginPath(); ctx.moveTo(0, sc.Y(1.12)); ctx.lineTo(sc.W, sc.Y(1.12)); ctx.moveTo(0, sc.Y(0.95)); ctx.lineTo(sc.W, sc.Y(0.95)); ctx.stroke();
    [1.22, 1.06, 0.97, 0.91].forEach(function (r, li) {
      var rg = sc.xRange(r), sp = 0.9, s = sc.S(r), y = sc.Y(r);
      for (var j = Math.floor(rg[0] / sp); j <= Math.ceil(rg[1] / sp); j++) {
        var hv = hash(j, li + 60); if (hv < 0.45) continue;
        if (job === "logs" && hv > 0.8 && (j + 1) * sp > WOODS_END) continue;
        var x = sc.X((j + hash(j, li + 61)) * sp, r);
        if (hv > 0.9 && li !== 1 && li !== 2) { // a fern
          ctx.strokeStyle = mix("#3F8A3A", "#2B3A55", n * 0.5); ctx.lineWidth = Math.max(1.2, s * 0.03); ctx.beginPath();
          for (var b = -2; b <= 2; b++) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + b * s * 0.12, y - s * 0.35, x + b * s * 0.25, y - s * (0.3 - Math.abs(b) * 0.05)); }
          ctx.stroke();
        } else if (hv > 0.8) { // a cone
          ctx.beginPath(); ctx.ellipse(x, y - s * 0.04, s * 0.07, s * 0.04, 0.3, 0, TAU); ctx.fillStyle = "#7A5236"; ctx.fill();
        } else { ctx.fillStyle = li === 1 || li === 2 ? "rgba(107,68,40,0.45)" : "rgba(60,110,50,0.4)"; ctx.fillRect(x, y - 1, Math.max(2, s * 0.12), Math.max(1, s * 0.02)); }
      }
    });
  }
  function drawEdgeTree(sc, x) {
    var px = sc.X(x, EDGE_R), s = sc.S(EDGE_R), h = 9.6 * s;
    if (px < -h || px > sc.W + h) return;
    spruce(ctx, px, sc.Y(EDGE_R), h, Math.max(1.2, sc.lw * 0.75), mix(mix("#3A7442", "#A9C6DC", 0.15), "#1E2B44", (sc.night || 0) * 0.6));
  }
  function drawSq(sc) {
    var s = sc.S(EDGE_R), px = sc.X(sq.x, EDGE_R), py = sc.Y(EDGE_R) - sq.h * s;
    var a = sq.st === "top" ? 1 - clamp(sq.t / 1.0, 0, 1) : 1;
    ctx.save(); ctx.globalAlpha = a;
    if (sq.st === "run") squirrel(ctx, px, py, s * 2.2, sq.ph, false, false);
    else if (sq.st === "sit") {
      squirrel(ctx, px + s * 0.12, py, s * 2.2, 0, false, true);
      ctx.beginPath(); ctx.ellipse(px - s * 0.12, py - s * 0.32, s * 0.07, s * 0.1, 0.4, 0, TAU); ctx.fillStyle = "#7A5236"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
    } else squirrel(ctx, px + s * 0.1, py, s * 2.2, sq.ph, true, false);
    ctx.restore();
  }
  function drawDog(sc) {
    var g = dog, r = 0.94, s = sc.S(r), x = sc.X(g.x, r), y = sc.Y(r);
    D.dog(ctx, x, y, s * 1.5, g.ph, g.flip, g.st === "sniff");
    if (g.stick) {
      var S = s * 1.5, sit = g.st === "sniff";
      ctx.save(); ctx.translate(x, y); ctx.scale(g.flip ? -S : S, S);
      var my = sit ? -0.5 : -0.44;
      ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 0.1; ctx.beginPath(); ctx.moveTo(0.2, my + 0.05); ctx.lineTo(1.05, my - 0.08); ctx.stroke();
      ctx.strokeStyle = BARK; ctx.lineWidth = 0.055; ctx.stroke();
      [[0.75, -0.06], [0.95, -0.09]].forEach(function (q) { ctx.beginPath(); ctx.moveTo(q[0] + 0.15, my + q[1]); ctx.lineTo(q[0] - 0.08, my + q[1] - 0.12); ctx.lineTo(q[0] - 0.08, my + q[1] + 0.1); ctx.closePath(); ctx.fillStyle = NEEDLE2; ctx.fill(); ctx.lineWidth = 0.02; ctx.strokeStyle = INK; ctx.stroke(); });
      ctx.restore();
    }
  }

  // ---------- Logs: the woods, the lorry and weighbridge, the sawmill, the field ----------
  function headTip(sc) {
    var c = Math.cos(head.rot), s = Math.sin(head.rot), px = HEAD_TIP[0], py = HEAD_TIP[1];
    var lx = px * c - py * s, ly = px * s + py * c, S = sc.S(head.r);
    var sx = sc.X(head.x, head.r) + lx * S, sy = sc.Y(head.r) - head.h * S + ly * S;
    return { x: sc.wx(sx, 1), h: (sc.gY - sy) / sc.k };
  }
  function drawLogsJob(sc) {
    var v0 = sc.wx(-120, 1), v1 = sc.wx(sc.W + 120, 1);
    function seen(a, b) { return b > v0 && a < v1; }
    if (seen(-16, 14)) drawForest(sc);
    if (seen(WB - 10, HUT[0] + 3)) drawWeigh(sc);
    if (seen(STK2 - 4, PSTK + 4)) drawMill(sc);
    if (lorry.on && seen(lorry.x - 16, lorry.x + 6)) drawLorry(sc);
    if (seen(PPILE - 12, TED0 + 12)) drawField(sc);
  }
  function drawForest(sc) {
    if (brash.n > 0) put(sc, 0, 1.03, 1, function () { brashPile(ctx, 0.45, 0.45 + Math.min(4.2, 1.0 + brash.n * 0.22), Math.min(0.8, 0.22 + brash.n * 0.045), 7); });
    if (logs.some(function (L) { return L.st === "stack" || L.st === "fall"; }) || stepId === "logs") put(sc, STKA_X, 1, 1, function () { stakes(ctx, 1.5, 1.25); });
    logs.forEach(function (L) { if (L.st === "stack") drawLog(sc, L); });
    if (tree.cut) put(sc, 0, 1, 1, function () { Rr(ctx, -diam(0) / 2, -CUT_H, diam(0), CUT_H, 0.04, BARK); ctx.beginPath(); ctx.ellipse(0, -CUT_H, diam(0) / 2, 0.07, 0, 0, TAU); fs(ctx, WOOD, LW() * 0.7); });
    drawTree(sc);
    put(sc, harv.x, 1, 1, function () { harvester(ctx, { wheel: harv.wheel, time: time, beacon: !!mo && stepId !== "lorry" }); });
    var tip = headTip(sc);
    put(sc, 0, 1, 1, function () { craneShape(ctx, harv.x + HPIV[0], HPIV[1], tip.x, tip.h, 2.9, Y1, YD); });
    logs.forEach(function (L) { if (L.st === "fall") drawLog(sc, L); });
    put(sc, head.x, head.r, 1, function () { ctx.translate(0, -head.h); ctx.rotate(head.rot); harvesterHead(ctx, { grip: head.grip, saw: head.saw, roll: head.roll, time: time }); });
  }
  function drawWeigh(sc) {
    put(sc, HUT[0], HUT[1], 1, function () { weighHut(ctx, lorry.lit, time); });
    put(sc, WB, LR, 1, function () { weighDeck(ctx); });
  }
  function drawLorry(sc) {
    put(sc, lorry.x, LR, 1, function () { lorryShape(ctx, { wheel: lorry.wheel, time: time, beacon: !!mo && stepId === "lorry" }); });
    logs.forEach(function (L) { if (L.st === "lorry") drawLog(sc, L); });
    put(sc, 0, LR, 1, function () {
      craneShape(ctx, lorry.x + LCP[0], LCP[1], lorry.crane.x, lorry.crane.h, 3.6, LCOL, LCOLD);
      ctx.save(); ctx.translate(lorry.crane.x, -lorry.crane.h); grapple(ctx, lorry.crane.open); ctx.restore();
    });
    logs.forEach(function (L) { if (L.st === "held") drawLog(sc, L); });
    // the wheels he has counted: a big number on each
    var s = sc.S(LR);
    lorry.pop.forEach(function (wi, n) {
      var x = PX(sc, lorry.x + LWHEELS[wi], LR), y = sc.Y(LR) - LWR * s, age = time - (lorry.popT[n] || 0);
      var rad = Math.max(13, s * 0.36) * (age < 0.3 ? 1 + 0.5 * Math.sin(PI * age / 0.3) : 1);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fillStyle = "#FFC93C"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.font = "800 " + Math.round(rad * 1.25) + "px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(n + 1), x, y + rad * 0.08);
    });
  }
  // world point -> screen in a view
  function wp(sc, x, h, r) { return [PX(sc, x, r), sc.Y(r) - h * sc.S(r)]; }
  function drawMill(sc) {
    put(sc, DECK, 1.14, 1, function () { millBack(ctx); });
    // the concrete floor inside, from the back wall to the cut-away front
    var f0 = wp(sc, DECK + MILL_X0, 0, 1.14), f1 = wp(sc, DECK + MILL_X1, 0, 1.14), f2 = wp(sc, DECK + MILL_X1, 0, 0.9), f3 = wp(sc, DECK + MILL_X0, 0, 0.9);
    ctx.beginPath(); ctx.moveTo(f0[0], f0[1]); ctx.lineTo(f1[0], f1[1]); ctx.lineTo(f2[0], f2[1]); ctx.lineTo(f3[0], f3[1]); ctx.closePath();
    ctx.fillStyle = mix("#C9C5BB", "#2B3A55", dusk * 0.5); ctx.fill();
    // the holding pile
    if (logs.some(function (L) { return L.st === "stack2"; }) || stepId === "lorry" || (stepId === "saw" && sub !== "feed")) put(sc, STK2, 1, 1, function () { stakes(ctx, 1.5, 1.25); });
    logs.forEach(function (L) { if (L.st === "stack2") drawLog(sc, L); });
    // the log deck: rails sloping from the back down to the infeed
    var lw = Math.max(1.5, sc.lw);
    [DECK - 0.9, DECK + 1.5].forEach(function (x) {
      var a = wp(sc, x, 1.62, 1.32), b = wp(sc, x, CONVH + 0.06, 1.02), fa = wp(sc, x, 0, 1.32);
      ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = lw + Math.max(2, sc.S(1) * 0.12);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(fa[0], fa[1]); ctx.stroke();
      ctx.strokeStyle = "#7C8696"; ctx.lineWidth = Math.max(2, sc.S(1) * 0.12); ctx.stroke();
    });
    logs.filter(function (L) { return L.st === "deck" || L.st === "deckroll"; }).sort(function (a, b) { return b.r - a.r; }).forEach(function (L) { drawLog(sc, L); });
    put(sc, DECK, 1, 1, function () { millLine(ctx, { spin: mill.spin, time: time }); });
    logs.forEach(function (L) { if (L.st === "conv") drawConvLog(sc, L); });
    put(sc, DECK, 1, 1, function () { millFront(ctx); });
    // the post stack
    put(sc, PSTK, 1, 1, function () { stakes(ctx, 1.45, 1.35); });
    mposts.forEach(function (p) { put(sc, p.x, 1, 1, function () { ctx.translate(0, -p.h); postShape(ctx, LOGL, 0.24); }); });
    // the loader and what it carries
    put(sc, loader.x, 1, loader.dir, function () { loaderShape(ctx, { wheel: loader.wheel, lift: loader.lift, clamp: loader.clamp, time: time, beacon: !!mo && stepId === "saw" && sub !== "feed" }); });
    logs.forEach(function (L) { if (L.st === "loader") drawLog(sc, L); });
    put(sc, DECK, 1.0, 1, function () { millFrame(ctx); });
  }
  // a log on the saw line: round where it has not reached the squaring saw, square after it, two posts after
  // the splitting saw
  function drawConvLog(sc, L) {
    put(sc, L.x, 1, 1, function () {
      ctx.translate(0, -L.h);
      var s1 = SAW1 - L.x, s2 = SAW2 - L.x;
      ctx.save(); ctx.beginPath(); ctx.rect(-20, -3, s1 + 20, 6); ctx.clip(); logShape(ctx, L.len, L.d, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(s1, -3, Math.max(0, s2 - s1), 6); ctx.clip(); cantShape(ctx, L.len, L.d, false); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(s2, -3, 20, 6); ctx.clip(); cantShape(ctx, L.len, L.d, true); ctx.restore();
    });
  }
  function drawLog(sc, L) {
    put(sc, L.x, L.r, 1, function () { ctx.translate(0, -L.h); logShape(ctx, L.len, L.d, 0); });
  }
  function drawTree(sc) {
    if (!tree.on) return;
    put(sc, 0, 1, 1, function () {
      ctx.save(); ctx.beginPath(); ctx.rect(-400, -80, 800, 80.05); ctx.clip();
      ctx.translate(tree.px, -tree.ph); ctx.rotate(tree.rot);
      var sw = tree.rot < 0.05 ? Math.sin(time * 1.1) * 0.06 + Math.sin(time * 9) * tree.sway * 0.25 : 0;
      treeShape(ctx, { s0: tree.s0, top: tree.top, whorls: whorls, cut: tree.cutP, butt: tree.cut, sway: sw });
      ctx.restore();
    });
  }
  // The field: sheep behind the fence, the fence with its gap, the old broken post, the tractor and the post
  // knocker, Farmer Tom, the pile of new posts, and Midge at the end of the day.
  function netSpan(c, xa, xb, sag) {
    var NET = [0.15, 0.4, 0.65, 0.9], l0 = LW(), n = Math.max(2, Math.round((xb - xa) / 0.4)), i, j;
    function yAt(hh, f) { return -Math.max(0.03, hh - sag * Math.sin(PI * f) * (0.4 + hh * 0.6)); }
    c.lineCap = "round";
    for (j = 0; j < NET.length; j++) {
      c.beginPath();
      for (i = 0; i <= n; i++) { var f = i / n, x = lerp(xa, xb, f), y = yAt(NET[j], f); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.strokeStyle = "#8C97A6"; c.lineWidth = 0.035; c.stroke();
    }
    for (i = 1; i < n; i++) { var f2 = i / n, x2 = lerp(xa, xb, f2); Ln(c, x2, yAt(NET[0], f2), x2, yAt(NET[NET.length - 1], f2), "#9AA4B2", 0.022); }
    c.beginPath();
    for (i = 0; i <= n; i++) { var f3 = i / n, x3 = lerp(xa, xb, f3), y3 = yAt(1.15, f3); if (i) c.lineTo(x3, y3); else c.moveTo(x3, y3); }
    c.strokeStyle = "#5D6675"; c.lineWidth = 0.03 + l0 * 0.2; c.stroke();
  }
  function drawField(sc) {
    fld.sheep.filter(function (s) { return s.r > 1; }).sort(function (a, b) { return b.r - a.r; }).forEach(function (s) {
      put(sc, s.x, s.r, s.flip ? -1 : 1, function () { sheepShape(ctx, { ph: s.ph, gait: s.gait || 0, head: s.head, munch: s.head > 0.5 ? time : 0 }); });
    });
    put(sc, 0, 1, 1, function () {
      var xs = FENCE_X, i;
      for (i = 0; i < xs.length - 1; i++) if (!(xs[i] < HOLE && xs[i + 1] > HOLE)) netSpan(ctx, xs[i], xs[i + 1], 0);
      var a = 148.4, b = 155.6, inPost = fld.post.st === "stand" && fld.knocks >= 3;
      if (fld.wire >= 1 && inPost) { netSpan(ctx, a, HOLE, 0); netSpan(ctx, HOLE, b, 0); }
      else netSpan(ctx, a, b, 0.75 * (1 - fld.wire));
      xs.forEach(function (x) { ctx.save(); ctx.translate(x, 0); standPost(ctx, 1.3, 0, 0); ctx.restore(); });
    });
    // the old broken post lying in the grass
    put(sc, HOLE - 1.4, 0.985, 1, function () { ctx.translate(0, -0.12); ctx.rotate(-0.08); Rr(ctx, -0.8, -0.1, 1.15, 0.2, 0.03, "#9C8A6A"); Pp(ctx, [0.35, -0.1, 0.55, -0.02, 0.42, 0.1, 0.35, 0.1], "#9C8A6A", LW() * 0.7); Ln(ctx, -0.6, -0.02, 0.2, 0.0, "#7A6A50", 0.03); });
    if (fld.post.st === "stand") put(sc, HOLE, 1, 1, function () { standPost(ctx, postTop(), 0, 0); });
    put(sc, fld.ted.x, 1, 1, function () {
      var over = Math.abs(fld.ted.x - TEDK) < 0.25 && fld.post.st === "stand";
      knocker(ctx, over ? postTop() : 1.2, fld.lift);
      D.tractor(ctx, { plain: true, wheel: fld.ted.wheel, time: time, hitch: { lift: 0 }, beacon: !!mo && (sub === "ted" || sub === "knock") });
    });
    put(sc, PPILE, 0.95, 1, function () {
      for (var i = 0; i < fld.pileN; i++) { ctx.save(); ctx.translate((i % 2) * 0.1, -0.12 - i * 0.2); postShape(ctx, LOGL, 0.24); ctx.restore(); }
    });
    [["tom", Farm.tom.top, "bald"]].forEach(function (q) {
      var P = fld[q[0]];
      if (P.x > TED0 + 30) return;
      put(sc, P.x, 0.97, P.flip ? -1 : 1, function () {
        if (fld.post.st === "held") { ctx.save(); ctx.translate(0.15, -1.15); ctx.rotate(-1.15); postShape(ctx, LOGL, 0.24); ctx.restore(); }
        person(ctx, { walk: P.walk, stride: P.stride, hands: P.hands, bend: P.bend, jumper: q[1], hat: q[2], collar: Farm.tom.collar, short: Farm.tom.short });
        if (q[0] === "tom" && P.hands) { tube(ctx, P.hands[0][0], P.hands[0][1], P.hands[0][0] + 0.05, P.hands[0][1] - 0.35, 0.05, "#B07B3C"); Rr(ctx, P.hands[0][0] - 0.08, P.hands[0][1] - 0.42, 0.24, 0.1, 0.03, "#5D6675", LW() * 0.6); }
      });
    });
    if (fld.home > 2.5) { var r = 0.96, s = sc.S(r); D.dog(ctx, PX(sc, fld.midge.x, r), sc.Y(r), s * 1.5, fld.midge.ph, false, false); }
  }
  // Over the scene: a ring on the thing to touch next, and the saw line's end view while a log goes through.
  function drawOverlays() {
    if (job !== "logs") return;
    var b = cv.getBoundingClientRect();
    if (phase === "ready" && !(drag && drag.kind !== "act")) {
      var p = targetPt();
      if (p) {
        var x = p.x - b.left, y = p.y - b.top, k = 0.5 + 0.5 * Math.sin(time * 4), rad = 30 + k * 8;
        ctx.save(); ctx.globalAlpha = glow > 0 ? 0.95 : 0.55 + 0.25 * k;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = "#FFC93C"; ctx.stroke();
        ctx.restore();
      }
    }
    if (stepId === "saw" && mill.inset) {
      var R = RW, sz = Math.round(Math.min(R.w * 0.26, R.h * 0.36, 132)), x0 = R.x + R.w - sz - 64, y0 = R.y + 10;
      if (x0 < R.x + R.w * 0.45) x0 = R.x + R.w - sz - 10;
      ctx.save();
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0, y0, sz, sz, 12) : ctx.rect(x0, y0, sz, sz);
      ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.font = "700 14px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("End view", x0 + sz / 2, y0 + 4);
      var cx = x0 + sz / 2, cy = y0 + sz * 0.58, rr = sz * 0.3, t = mill.inset.t, st = mill.inset.st, hs = rr * 1.25;
      ctx.lineWidth = 2; ctx.strokeStyle = INK;
      if (st === "round") {
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fillStyle = BARK; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, rr * 0.86, 0, TAU); ctx.fillStyle = WOOD; ctx.fill();
        for (var i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, rr * 0.86 * i / 4, 0, TAU); ctx.strokeStyle = WOODD; ctx.lineWidth = 1.2; ctx.stroke(); }
      } else {
        var f = clamp(t / 0.9, 0, 1), off = f * rr * 0.9;
        if (st === "square" && f < 1) {
          ctx.globalAlpha = 1 - f;
          [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(function (d) {
            ctx.save(); ctx.beginPath(); ctx.arc(cx + d[0] * off, cy + d[1] * off, rr, 0, TAU); ctx.rect(cx - hs / 2 + d[0] * off, cy - hs / 2 + d[1] * off, hs, hs); ctx.clip("evenodd");
            ctx.beginPath(); ctx.arc(cx + d[0] * off, cy + d[1] * off, rr, 0, TAU); ctx.fillStyle = BARK; ctx.fill(); ctx.restore();
          });
          ctx.globalAlpha = 1;
        }
        var gap = st === "split" ? clamp(t / 0.6, 0, 1) * 5 : 0;
        if (st === "split") {
          [[-1, cy - hs / 2 - gap / 2], [1, cy + gap / 2]].forEach(function (q) { ctx.fillStyle = WOOD; ctx.fillRect(cx - hs / 2, q[1], hs, hs / 2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(cx - hs / 2, q[1], hs, hs / 2); });
        } else { ctx.fillStyle = WOOD; ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(cx - hs / 2, cy - hs / 2, hs, hs); }
      }
      ctx.restore();
    }
  }

  // ---------- Chipper: the brash pile, the trailer, the tractor and chipper, the crane ----------
  function drawChipJob(sc) {
    if (ch.pile > 0.01) put(sc, 0, 1.03, 1, function () { brashPile(ctx, PILE0 + (1 - ch.pile) * 1.2, PILE1, pileTop(), 11); });
    put(sc, TRL, 1, 1, function () {
      ctx.translate(0, -0.5);
      tube(ctx, -0.55, 0.0, -0.55, 0.5, 0.08, "#5D6675");
      chipHeap(ctx, ch.load); D.trailer(ctx, { load: 0, time: time }); meshSides(ctx);
    });
    put(sc, 0, 1, -1, function () {
      chipper(ctx, { fly: ch.flyA, roll: ch.roll, time: time, aim: ch.aim });
      D.tractor(ctx, { plain: true, time: time, hitch: { lift: 0 }, driver: false, beacon: ch.fly > 0.5 });
      // the swivel seat: the driver turns round to face the chipper
      ctx.save(); ctx.beginPath(); ctx.rect(-0.5, -2.9, 1.6, 1.2); ctx.clip();
      driverFig(ctx, 0.3, -2.42, Math.cos(PI * ch.sw), true);
      if (ch.sw > 0.5) { Rr(ctx, -0.45, -2.0, 0.24, 0.16, 0.04, "#3A3F4E", LW() * 0.6); Ln(ctx, -0.33, -2.0, -0.38, -2.2, INK, 0.06); Cc(ctx, -0.38, -2.22, 0.05, "#E8473B", 0); }
      ctx.restore();
      if (stepId === "turn" && phase === "work" && wk && wk.t < 1.8) {
        // a turning arrow over the cab while the seat swivels
        var aa = clamp(Math.min(wk.t / 0.3, (1.8 - wk.t) / 0.4), 0, 1), sweep = ease(clamp(wk.t / 1.4, 0, 1));
        ctx.save(); ctx.globalAlpha = aa;
        ctx.beginPath(); ctx.arc(0.3, -3.25, 0.62, -PI * 0.92, -PI * 0.92 + sweep * PI * 0.85 + 0.01);
        ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 0.26; ctx.stroke(); ctx.strokeStyle = "#FFC93C"; ctx.lineWidth = 0.15; ctx.stroke();
        var ea = -PI * 0.92 + sweep * PI * 0.85, ex = 0.3 + Math.cos(ea) * 0.62, ey = -3.25 + Math.sin(ea) * 0.62, tx = -Math.sin(ea), ty = Math.cos(ea);
        Pp(ctx, [ex + tx * 0.3, ey + ty * 0.3, ex - ty * 0.24, ey + tx * 0.24, ex + ty * 0.24, ey - tx * 0.24], "#FFC93C", LW());
        ctx.restore();
      }
    });
    if (ch.rate > 0 || ch.stream > 0.01) put(sc, 0, 1, 1, function () {
      // the stream of chips from the spout to the trailer
      var x0 = NOZ[0] - 0.35, h0 = NOZ[1] + 0.05, x1 = TRC + ch.aim * 2.2, h1 = 3.3 + ch.load * 1.1;
      ctx.save(); ctx.globalAlpha = 0.4 * ch.stream; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, -h0); ctx.quadraticCurveTo((x0 + x1) / 2, -(Math.max(h0, h1) + 1.5), x1, -h1);
      ctx.strokeStyle = CHIP[2]; ctx.lineWidth = 0.32; ctx.stroke();
      ctx.setLineDash([0.15, 0.35]); ctx.lineDashOffset = -time * 4; ctx.strokeStyle = CHIP[3]; ctx.lineWidth = 0.14; ctx.stroke();
      ctx.restore();
    });
    if (bnd && bnd.st === "table") put(sc, 0, 1, 1, function () {
      ctx.save(); ctx.beginPath(); ctx.rect(3.02, -6, 10, 6); ctx.clip();
      ctx.translate(bnd.x, -bnd.h); bundle(ctx, bnd.amt, bnd.seed); ctx.restore();
    });
    put(sc, 0, 1, -1, function () { chipperFront(ctx); });
    put(sc, 0, 1, 1, function () {
      craneShape(ctx, CPIV[0], CPIV[1], grp.x, grp.h + 0.7, 2.4, CH, CHD);
      ctx.save(); ctx.translate(grp.x, -grp.h - 0.7);
      if (bnd && bnd.st === "held") { ctx.save(); ctx.translate(0, 1.25); bundle(ctx, bnd.amt, bnd.seed); ctx.restore(); }
      grapple(ctx, grp.open);
      ctx.restore();
    });
  }

  // ---------- Loop ----------
  var last = 0;
  function loop(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    if (!(window.Toybox && Toybox.timer.phase() === "resting")) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  function onEnding(done) { ending = true; ch.rate = 0; setTimeout(function () { ch.fly = 0; mill.run = 0; snd.engine(-1); snd.soil(0); snd.pour(0); done(); }, 2600); }
  function onWake() { ending = false; dusk = 0; }

  // ---------- Start ----------
  showSteps();
  resize();
  if (job === "logs") { harv.x = HV0 - 9; syncHead(); }
  bringIn(firstStep());
  follow(0, true);
  if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage);
  else window.addEventListener("resize", resize);

  Toybox.init({
    app: "farm",
    big: { button: $("bigToggle") },
    badge: $("tbadge"),
    timerIntro: "When time is up, the machines stop and the controls lock. The timer carries on across the Tractor Ted pages.",
    goodbyeOption: "End with a “Goodnight, farm” button to press",
    farewellText: "Time to say goodnight to the farm",
    goodbyeLabel: "Goodnight, farm",
    farewellDone: "Night night, farm!",
    restLine: "The farm is resting.",
    restLine2: "The machines will be right here next time.",
    restArt: Farm.restArt,
    soundNote: "Soft engine, saw and chipper sounds. Hold for 2 seconds.",
    onEnding: onEnding,
    onRest: onWake,
    onWake: onWake,
    onSound: function (on) { if (on) snd.chime(); }
  });
  requestAnimationFrame(loop);

  if (/[?&]debug\b/.test(location.search)) window.__farm = {
    state: function () { return { sub: sub, wheels: lorry.pop.length, mposts: mposts.length, knocks: fld.knocks, wire: fld.wire, tilt: fld.post.tilt, phase: phase, step: stepId, cur: steps.current(), finished: steps.finished(), job: job, posts: posts, loads: loads, logs: logs.length, pile: ch.pile, load: ch.load, sw: ch.sw, coach: coach.text(), split: split, parts: parts.length, t: wk ? wk.t : -1 }; },
    screen: function (id) { return partScreen(id || stepId); },
    surprise: surprise,
    tap: function (p) { tapLogs(p); },
    target: function () { return targetPt(); },
    ghost: function () { return ghost.show(); }
  };
})();
