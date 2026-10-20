(function () {
  "use strict";
  // Hello Ewe!: a day in the dairy sheep shed, the way the episode shows it (plans/tractor-ted-episodes.md).
  // Four steps he does himself, built like Timberrrrr! (farm/woods.js): no step row, one view, a yellow ring on
  // the scene and one coach line point at the next thing to touch; each tap on a machine part plays that one
  // control's motion, the tractors also drive with a drag. After the last step a tap on the scene starts again.
  //   Scrape:    the blue yard tractor's rubber scraper pushes the old feed along the feed passage into a pile;
  //              the tractor turns round, drives into the pile to fill its loader bucket, lifts the bucket,
  //              drives out to the muck heap in the yard and tips it.
  //   Parlor:    four sheep come into the milking parlor; each tap counts the next sheep as it climbs the ramp
  //              onto the raised platform (the episode's counting moment: one, two, three, four). No milking.
  //   Foot care: a sheep walks into the narrow race, Farmer Tom lifts its foot to check the hoof and puts the
  //              blue antiseptic spray on it (the foot stays blue).
  //   Bedding:   the red tractor brings the trailed straw chopper, he switches it on and drives down the
  //              passage while it blows chopped straw into a fresh bed; the flock walks back into the clean shed.
  // One world along the passage (metres): the muck heap in the yard, the sheep shed, the parlor, the holding yard.
  //
  // Sections:
  //   Setup and saved state
  //   The world (metres)
  //   Small drawing helpers
  //   The blue yard tractor and the straw chopper
  //   Sheep and Farmer Tom
  //   Scene state
  //   The stage: camera and projection
  //   Coach, counter, ghost, bottom bar
  //   The flow
  //   Scrape
  //   Parlor
  //   Foot care
  //   Bedding
  //   Surprise
  //   Particles
  //   Input
  //   Update
  //   Drawing the scene
  //   Loop and start
  const $ = (id) => document.getElementById(id);
  const U = Farm.u, clamp = U.clamp, lerp = U.lerp, ease = U.ease, hash = U.hash, mix = U.mix, INK = U.INK;
  const D = Farm.draw, SH = Farm.shape, snd = Farm.sound, TAU = Math.PI * 2, PI = Math.PI;
  const Pp = SH.P, Rr = SH.R, Cc = SH.C, Ln = SH.Ln, tube = SH.tube, fs = SH.fs;
  const NAME = (Farm.NAMES && Farm.NAMES.ewe) || "Hello Ewe!";
  document.title = NAME; $("title").textContent = NAME;
  const noop = () => {};

  // =====================================================================================================
  // Setup and saved state
  // =====================================================================================================
  const KEY = "farm-ewe-v1";
  const startFresh = !!(window.Toybox && Toybox.fresh());
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  if (startFresh || typeof saved !== "object" || Array.isArray(saved)) saved = {};
  const num = (v) => (typeof v === "number" && isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  let beds = num(saved.beds);
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ beds })); } catch (e) { /* ignore */ } }

  // =====================================================================================================
  // The world (metres along the passage; depth r: 1 = the line the tractors drive on, > 1 further back)
  // =====================================================================================================
  const RF = 0.86, RB = 1.7, WALLH = 3.6, RBAR = 1.18, PEN_R0 = 1.22, PEN_R1 = 1.66;
  const SHED = [0, 24], PARLOR = [29.5, 44.5];
  // Scrape: the blue tractor starts at the far end facing out (BT0), reverses with the scraper down to SCR_END,
  // drives on to TURN_X and turns round, scoops the pile and drives out to the muck heap (stopping at HEAP_STOP).
  const BT0 = 19.5, SCR_END = 5.0, TURN_X = 9.0, HEAP = -9, HEAP_R = 1.05, HEAP_STOP = HEAP + 3.2, BT_PARK = -14.5, LIFT = 0.85;
  const FEED0 = 4.4, FEED1 = 17.6;
  const BT = { A: [0.95, -1.65], LA: 2.4, th0: 0.547, th1: -0.75, SCR: -1.25, FRONT: 3.96 };
  // Parlor: a ramp up onto the raised platform, the places along it (filled from the far end), the queue below
  const RPL = 1.08, RPF = 1.0, RHL = 1.2, PLAT_H = 0.85, RAMP = [34.6, 36.2], PLAT_END = 40.9, RAMP_DN = 42.5;
  const SPOTS = [40.2, 38.95, 37.7, 36.45], QUEUE = [33.6, 32.4, 31.2, 30.0];
  // The holding yard: the pen, the narrow race beside it, Farmer Tom's place and Midge's
  const PEN = [53, 60.6], RRACE = 1.08, RACE = [60.6, 67.4], SPOT_RACE = 64.0, TOM_X = 65.2, TOM_R = 1.065, MIDGE_X = 66.4;
  const HOLD = [[59.3, 1.3], [57.0, 1.46], [55.4, 1.34], [56.2, 1.56], [54.0, 1.48], [53.8, 1.3]];
  // Bedding: the red tractor and chopper come in from the far end facing the door and drive down the passage
  const RT0 = 27.5, RT_START = 19.5, RT_END = 1.5, SPOUT = 2.45;
  const BIN0 = 0.25, BINW = 0.5, NBIN = 48;
  const PENS = [[4, 1.34], [7.5, 1.5], [10.6, 1.38], [13.8, 1.54], [16.8, 1.33], [20, 1.46]];

  const BLUE = "#2F6FD0", BLUED = "#1F4E9E", STEEL = "#C3CCD6", GALV = "#B8C2CC", DARK = "#3A3F4E";
  const CHG = "#4BA35A", CHGD = "#357A42", STRAW = "#E8C65E", STRAWD = "#C9A443", OLDBED = "#9A8458", NEWBED = "#EDCD6E";
  const FEEDC = ["#6F7B3A", "#7E6A38", "#8C8A45", "#5F6B33"], MUCK = "#6B4E31", MUCKD = "#4E3822", SPRAY = "#2F7DE1";
  const WOOL = "#F6F0E2", WOOLD = "#DED3BC", FACE = "#EEE0D2", FACED = "#C9B2A2", HOOF = "#5A4F48";

  // =====================================================================================================
  // Small drawing helpers (farm.js style, in metres, y up negative)
  // =====================================================================================================
  function wheel(c, cx, cy, r, rot, o) {
    o = o || {};
    const n = Math.max(8, Math.round(r * 22)), l0 = Farm.LW;
    c.save(); c.translate(cx, cy);
    for (let i = 0; i < n; i++) {
      const a = rot + i * TAU / n, co = Math.cos(a), s = Math.sin(a), c2 = Math.cos(a + 0.12), s2 = Math.sin(a + 0.12);
      Pp(c, [co * r * 0.93, s * r * 0.93, co * r * 1.06, s * r * 1.06, c2 * r * 1.06, s2 * r * 1.06, c2 * r * 0.93, s2 * r * 0.93], "#2A2C36", l0 * 0.7);
    }
    Cc(c, 0, 0, r * 0.97, "#33363F", l0);
    const rimR = r * (o.rim || 0.6);
    Cc(c, 0, 0, rimR, o.rimCol || STEEL, l0);
    Cc(c, 0, 0, rimR * 0.36, "#8C97A6", l0 * 0.7);
    for (let i = 0; i < 5; i++) { const a = rot + i * TAU / 5; Cc(c, Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62, rimR * 0.08, "#6E7887", 0); }
    c.restore();
  }
  function beacon(c, x, y, on, time) {
    const bc = on ? (Math.sin((time || 0) * 9) > 0 ? "#FFD34D" : "#F08A1C") : "#F2A23A";
    if (on) { c.save(); c.globalAlpha = 0.35 + 0.3 * Math.max(0, Math.sin(time * 9)); Cc(c, x, y - 0.08, 0.3, "#FFD34D", 0); c.restore(); }
    c.beginPath(); c.arc(x, y, 0.11, PI, 0); c.closePath(); fs(c, bc, Farm.LW * 0.7);
  }
  // Farmer Tom's head and shoulders behind a cab's glass (bald, light stubble; his fleece from Farm.tom)
  function cabTom(c, x, y) {
    const l0 = Farm.LW, T = Farm.tom;
    Rr(c, x - 0.24, y + 0.1, 0.48, 0.46, 0.15, T.top, l0 * 0.7);
    Pp(c, [x - 0.06, y + 0.12, x + 0.06, y + 0.12, x, y + 0.25], T.collar, 0);
    Cc(c, x, y, 0.16, "#EBC09A", l0 * 0.7);
    c.beginPath(); c.arc(x + 0.02, y + 0.04, 0.11, 0.15 * PI, 0.85 * PI); c.strokeStyle = "rgba(90,70,50,0.35)"; c.lineWidth = 0.045; c.stroke();
  }
  // A galvanised hurdle (sheep gate) along x at one depth, in local units: from x0 to x1, h high
  function hurdle(c, x0, x1, h) {
    const n = Math.max(1, Math.round((x1 - x0) / 1.8));
    for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); tube(c, x, 0, x, -h, 0.06, GALV); }
    [0.22, 0.42, 0.62, 0.82, 1.0].forEach((f) => tube(c, x0, -f * h, x1, -f * h, 0.045, GALV));
  }

  // =====================================================================================================
  // The blue yard tractor and the straw chopper
  // =====================================================================================================
  // The compact blue yard tractor (facing +x, origin on the ground under the rear axle): a front loader with its
  // bucket and a rubber yard scraper on the back. st = { wheel, lift (0..1), tilt (0..1 tipped), fill (0..1),
  // time, beacon }
  function bucketPivot(lift) {
    const th = lerp(BT.th0, BT.th1, clamp(lift, 0, 1));
    return [BT.A[0] + BT.LA * Math.cos(th), BT.A[1] + BT.LA * Math.sin(th)];
  }
  function bucketShape(c, fill) {
    const l0 = Farm.LW;
    if (fill > 0.01) {
      c.beginPath(); c.ellipse(0.32, -0.12, 0.4, 0.08 + 0.26 * fill, -0.4, PI, TAU); c.closePath(); fs(c, FEEDC[1], l0 * 0.7);
      for (let i = 0; i < 4; i++) Cc(c, 0.1 + i * 0.16, -0.16 - 0.16 * fill * (i % 2 ? 0.7 : 1) + i * 0.05, 0.06, FEEDC[i], 0);
    }
    // the bucket's side plate: the back, the floor out to the cutting edge, the top edge sloping back
    c.beginPath(); c.moveTo(-0.04, -0.34); c.lineTo(-0.04, 0.22); c.quadraticCurveTo(-0.02, 0.44, 0.2, 0.44); c.lineTo(0.98, 0.44); c.lineTo(1.0, 0.34); c.lineTo(0.3, -0.34); c.closePath();
    fs(c, "#4A5262", l0);
    Ln(c, 0.22, 0.44, 0.96, 0.44, STEEL, 0.06);
    Ln(c, 0.06, -0.24, 0.06, 0.22, "rgba(255,255,255,0.3)", 0.04);
  }
  function blueTractor(c, st) {
    const l0 = Farm.LW, rot = st.wheel || 0;
    // the rubber scraper on its links behind the rear wheel
    tube(c, -0.3, -0.78, -1.1, -0.62, 0.08, "#5E6A7A");
    tube(c, -0.3, -0.45, -1.1, -0.34, 0.08, "#5E6A7A");
    Rr(c, -1.28, -0.8, 0.18, 0.66, 0.04, "#F2B33A", l0);
    Rr(c, -1.31, -0.18, 0.24, 0.18, 0.04, "#2A2C36", l0 * 0.8);
    // chassis, cab, hood
    Rr(c, -0.35, -0.98, 2.75, 0.34, 0.08, DARK, l0);
    Pp(c, [-0.55, -0.95, -0.5, -2.32, 0.62, -2.32, 0.74, -1.38, 0.74, -0.95], "#2B3040", l0);
    Pp(c, [-0.42, -1.07, -0.38, -2.2, 0.52, -2.2, 0.62, -1.42, 0.62, -1.07], "#BFE7FA", l0 * 0.6);
    cabTom(c, 0.08, -1.78);
    Pp(c, [-0.3, -2.18, -0.05, -2.18, -0.36, -1.5, -0.38, -1.75], "rgba(255,255,255,0.55)", 0);
    Rr(c, -0.68, -2.47, 1.52, 0.17, 0.06, BLUE, l0);
    beacon(c, 0.1, -2.5, st.beacon, st.time);
    tube(c, 1.0, -1.45, 1.0, -2.05, 0.08, "#5D6675");
    Pp(c, [0.62, -0.92, 2.42, -0.92, 2.5, -1.34, 0.62, -1.46], BLUE, l0);
    Farm.shine(c, 0.72, -1.38, 2.36, -1.3, 0.06);
    Rr(c, 2.3, -1.28, 0.22, 0.34, 0.04, BLUED, l0 * 0.7);
    for (let i = 0; i < 3; i++) Ln(c, 2.34, -1.2 + i * 0.1, 2.48, -1.2 + i * 0.1, INK, 0.025);
    // fender over the rear wheel
    c.beginPath(); c.arc(0, -0.62, 0.76, PI * 1.02, PI * 1.98); c.arc(0, -0.62, 0.66, PI * 1.98, PI * 1.02, true); c.closePath(); fs(c, BLUE, l0 * 0.8);
    wheel(c, 0, -0.62, 0.62, rot / 0.62);
    wheel(c, 1.95, -0.45, 0.45, rot / 0.45);
    // the loader: tower, arm, ram and bucket
    Rr(c, 0.8, -1.86, 0.32, 0.98, 0.05, BLUED, l0);
    const B = bucketPivot(st.lift || 0), A = BT.A;
    tube(c, 1.35, -0.95, lerp(A[0], B[0], 0.5), lerp(A[1], B[1], 0.5), 0.07, STEEL);
    tube(c, A[0], A[1], B[0], B[1], 0.17, BLUE);
    c.save(); c.translate(B[0], B[1]); c.rotate((st.tilt || 0) * 1.5); bucketShape(c, st.fill || 0); c.restore();
    Cc(c, A[0], A[1], 0.07, STEEL, l0 * 0.6); Cc(c, B[0], B[1], 0.06, STEEL, l0 * 0.6);
  }
  // The trailed straw chopper / blower, drawn in the tractor's frame (behind the tractor is -x): the drawbar on
  // the tractor's hitch, the PTO shaft, the round tub with the straw bale in it, the fan and the tall chute.
  // st = { wheel, spin (fan angle), bale (0..1 left), on }
  function chopper(c, st) {
    const l0 = Farm.LW, sp = st.spin || 0;
    tube(c, Farm.DRAWBAR[0], Farm.DRAWBAR[1], -2.55, -0.8, 0.12, "#7C8696");
    tube(c, -1.05, -0.78, -2.5, -1.08, 0.07, "#F2C230");
    Rr(c, -4.95, -0.78, 2.45, 0.22, 0.05, DARK, l0);
    wheel(c, -3.7, -0.42, 0.42, (st.wheel || 0) / 0.42);
    // the bale in the tub (it gets smaller as the rotor chops it)
    if (st.bale > 0.02) {
      const bh = 0.12 + 0.6 * st.bale, bw = 1.2 + 0.7 * st.bale;
      Rr(c, -3.75 - bw / 2, -2.05 - bh, bw, bh + 0.15, Math.min(0.3, bh * 0.5), STRAW, l0 * 0.8);
      for (let i = 0; i < 5; i++) { const x = -3.75 - bw / 2 + 0.15 + i * (bw - 0.3) / 4; Ln(c, x, -2.0 - bh * 0.85, x + 0.12, -2.0 - bh * 0.25, STRAWD, 0.03); }
    }
    // the tub, its ribs turn while it runs
    Rr(c, -4.95, -2.08, 2.4, 1.36, 0.14, CHG, l0);
    const off = ((sp * 0.08) % 0.4 + 0.4) % 0.4;
    for (let x = -4.85 + off; x < -2.6; x += 0.4) Ln(c, x, -1.95, x, -0.85, CHGD, 0.04);
    Farm.shine(c, -4.8, -1.98, -2.7, -1.98, 0.05);
    Rr(c, -5.02, -2.16, 2.54, 0.14, 0.05, CHGD, l0);
    // the fan housing with its blades, and the chute
    Cc(c, -2.45, -1.15, 0.44, CHGD, l0);
    for (let i = 0; i < 4; i++) { const a = sp + i * PI / 2; Ln(c, -2.45, -1.15, -2.45 + Math.cos(a) * 0.34, -1.15 + Math.sin(a) * 0.34, "#DDE3EA", 0.07); }
    Cc(c, -2.45, -1.15, 0.08, STEEL, l0 * 0.6);
    tube(c, -2.45, -1.5, -2.42, -2.75, 0.3, CHG);
    Pp(c, [-2.66, -2.7, -2.18, -2.7, -2.26, -3.02, -2.78, -2.98], CHGD, l0);
    if (st.on) { c.save(); c.globalAlpha = 0.6; Cc(c, -2.5, -3.02, 0.12, STRAW, 0); c.restore(); }
  }

  // =====================================================================================================
  // Sheep and Farmer Tom
  // =====================================================================================================
  // A white-faced dairy ewe in profile, facing +x, origin at her feet (from Timberrrrr!'s sheep).
  // st = { ph, gait (0..1 walking), head (0 up .. 1 down to eat), munch, foot (0..1 the near foreleg lifted),
  // blue (0..1 the spray on that foot) }
  function sheepShape(c, st) {
    const l0 = Farm.LW, g = st.gait || 0, s = Math.sin((st.ph || 0) * TAU), hd = clamp(st.head || 0, 0, 1);
    function leg(x, a, far, lift, blue) {
      let kx = x + a * 0.11, ky = -0.22, fx = x + a * 0.22, fy = 0;
      if (lift > 0) { kx = x + 0.1 * lift; ky = -0.24 - 0.06 * lift; fx = lerp(fx, x + 0.26, lift); fy = -0.3 * lift; }
      c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(x, -0.44); c.lineTo(kx, ky); c.lineTo(fx, fy);
      c.strokeStyle = INK; c.lineWidth = 0.12 + (far ? 0 : 0.01); c.stroke();
      c.strokeStyle = far ? FACED : FACE; c.lineWidth = 0.075; c.stroke();
      if (blue > 0) { c.save(); c.globalAlpha = blue; c.beginPath(); c.moveTo(lerp(kx, fx, 0.15), lerp(ky, fy, 0.15)); c.lineTo(fx, fy); c.strokeStyle = SPRAY; c.lineWidth = 0.09; c.stroke(); c.restore(); }
      Cc(c, fx, fy - 0.02, 0.045, blue > 0.5 ? "#1F5FB8" : HOOF, 0);
    }
    leg(0.3, -s * g, true, 0, 0); leg(-0.3, s * g, true, 0, 0);
    const bumps = [], n = 12;
    for (let i = 0; i < n; i++) { const a = i / n * TAU; bumps.push([Math.cos(a) * 0.48, -0.64 + Math.sin(a) * 0.22, 0.15 + 0.03 * hash(i, 3)]); }
    bumps.push([-0.6, -0.68, 0.085]);
    bumps.push([0.5, lerp(-0.76, -0.58, hd), 0.17]);
    for (const b of bumps) Cc(c, b[0], b[1], b[2] + l0, INK, 0);
    c.beginPath(); c.ellipse(0, -0.64, 0.48 + l0, 0.22 + l0, 0, 0, TAU); c.fillStyle = INK; c.fill();
    c.beginPath(); c.ellipse(0, -0.64, 0.48, 0.22, 0, 0, TAU); c.fillStyle = WOOL; c.fill();
    for (const b of bumps) Cc(c, b[0], b[1], b[2], WOOL, 0);
    c.strokeStyle = WOOLD; c.lineWidth = 0.025; c.lineCap = "round";
    for (let i = 0; i < 7; i++) { const cx = -0.4 + i * 0.13, cy = -0.6 + (i % 2 ? -0.1 : 0.05); c.beginPath(); c.arc(cx, cy, 0.045, 0.3, 2.6); c.stroke(); }
    leg(0.22, s * g, false, st.foot || 0, st.blue || 0); leg(-0.36, -s * g, false, 0, 0);
    let hx = lerp(0.68, 0.74, hd), hy = lerp(-0.88, -0.3, hd);
    const rot = lerp(0.35, 1.15, hd);
    if (st.munch) hy += Math.sin(st.munch * 18) * 0.015;
    c.save(); c.translate(hx, hy); c.rotate(rot);
    c.beginPath(); c.ellipse(-0.12, -0.04, 0.11, 0.045, -0.6, 0, TAU); fs(c, "#E9B9AE", l0 * 0.7);
    c.beginPath(); c.ellipse(0.02, 0, 0.17, 0.11, 0, 0, TAU); fs(c, FACE);
    Cc(c, 0.17, 0.03, 0.03, "#E39C92", 0);
    Cc(c, 0.03, -0.04, 0.018, INK, 0);
    c.restore();
  }
  // A person in profile facing +x, origin at the feet (from Timberrrrr!): Farmer Tom, bald, in his fleece.
  // st = { walk, stride, hands: [[x, y], [x, y]] | null, bend (0..1) }
  function tomShape(c, st) {
    const l0 = Farm.LW, T = Farm.tom, wk = st.walk || 0, sd = st.stride || 0, bend = st.bend || 0, jum = T.top;
    const hip = [0, -0.9], sh = [0.04 + bend * 0.2, -1.38 + bend * 0.22], hd = [0.08 + bend * 0.3, -1.57 + bend * 0.24];
    function welly(x, y, front) {
      Pp(c, [x - 0.08, y - 0.32, x + 0.07, y - 0.32, x + 0.07, y - 0.08, x + 0.2, y - 0.06, x + 0.2, y, x - 0.09, y], front ? "#2F8F3A" : "#277A31", l0 * 0.8);
    }
    function leg(fx, fy, front) {
      const kx = (hip[0] + fx) / 2 + 0.08 + bend * 0.06, ky = (hip[1] + fy) / 2;
      c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(kx, ky); c.lineTo(fx, fy - 0.12);
      c.strokeStyle = INK; c.lineWidth = 0.16 + l0 * 2; c.stroke(); c.strokeStyle = front ? "#3D6FB6" : "#2F5A99"; c.lineWidth = 0.16; c.stroke();
      welly(fx, fy, front);
    }
    const sw = Math.sin(wk) * 0.22 * sd;
    leg(-sw, -Math.max(0, Math.cos(wk)) * 0.06 * sd, false);
    c.beginPath(); c.moveTo(hip[0] - 0.15, hip[1] + 0.06); c.lineTo(sh[0] - 0.17, sh[1] - 0.02); c.quadraticCurveTo(sh[0], sh[1] - 0.1, sh[0] + 0.17, sh[1] - 0.02); c.lineTo(hip[0] + 0.15, hip[1] + 0.06); c.closePath(); fs(c, jum);
    leg(sw, -Math.max(0, -Math.cos(wk)) * 0.06 * sd, true);
    Cc(c, hd[0], hd[1], 0.13, "#F2C8A0", l0 * 0.8);
    Cc(c, hd[0] + 0.07, hd[1] - 0.01, 0.018, INK, 0);
    c.beginPath(); c.arc(hd[0] + 0.06, hd[1] + 0.03, 0.04, 0.1 * PI, 0.7 * PI); c.strokeStyle = INK; c.lineWidth = l0 * 0.8; c.stroke();
    c.beginPath(); c.arc(hd[0] + 0.02, hd[1] + 0.03, 0.1, 0.1 * PI, 0.9 * PI); c.strokeStyle = "rgba(90,70,50,0.35)"; c.lineWidth = 0.045; c.stroke();
    Ln(c, hd[0] - 0.06, hd[1] - 0.08, hd[0] + 0.02, hd[1] - 0.1, "rgba(255,255,255,0.6)", 0.025);
    Pp(c, [sh[0] - 0.07, sh[1] - 0.01, sh[0] + 0.09, sh[1] - 0.01, sh[0] + 0.02, sh[1] + 0.13], T.collar, l0 * 0.5);
    const hands = st.hands || [[sh[0] + 0.05 + sw * 0.4, -0.9], [sh[0] - 0.05 - sw * 0.4, -0.92]];
    hands.forEach((h, k) => {
      const ex = (sh[0] + h[0]) / 2 - 0.04, ey = (sh[1] + h[1]) / 2 + 0.05;
      c.beginPath(); c.moveTo(sh[0], sh[1] + 0.04); c.lineTo(ex, ey); c.lineTo(h[0], h[1]);
      c.strokeStyle = INK; c.lineWidth = 0.11 + l0 * 2; c.stroke(); c.strokeStyle = k ? mix(jum, INK, 0.15) : jum; c.lineWidth = 0.11; c.stroke();
      Cc(c, h[0], h[1], 0.055, "#F2C8A0", l0 * 0.6);
    });
    return { sh };
  }
  // The blue antiseptic spray can, its nozzle pointing along +x
  function sprayCan(c) {
    const l0 = Farm.LW;
    Rr(c, -0.1, -0.05, 0.22, 0.1, 0.03, SPRAY, l0 * 0.7);
    Rr(c, 0.12, -0.035, 0.05, 0.07, 0.015, "#E9EEF3", l0 * 0.5);
    Ln(c, -0.06, -0.02, 0.08, -0.02, "rgba(255,255,255,0.6)", 0.015);
  }

  // =====================================================================================================
  // Scene state
  // =====================================================================================================
  let bt, rt, pile, heap, feed, fresh, sheep, tom, gate, dog;
  let stepId = "scrape", sub = "scrape", phase = "ready", phaseT = 0, mo = null, glow = 0, time = 0, ending = false, counted = 0;
  function resetWorld() {
    bt = { x: BT0, dir: 1, wheel: 0, lift: 0, tilt: 0, fill: 0, busy: false };
    rt = { vis: false, x: RT0, dir: -1, wheel: 0, on: false, spin: 0, rate: 0, bale: 1, flow: 0 };
    pile = { amt: 0, x: BT0 + BT.SCR, w: 0.5 };
    heap = heap || { n: 0 };
    feed = [];
    for (let i = 0; i < 64; i++) feed.push({ x: lerp(FEED0, FEED1, (i + hash(i, 2) * 0.8) / 64), r: 1.05 + hash(i, 5) * 0.11, s: 0.1 + hash(i, 7) * 0.1, c: FEEDC[i % 4], got: false });
    fresh = new Array(NBIN).fill(0);
    sheep = PENS.map((p, i) => ({ i, x: p[0], r: p[1], h: 0, path: [], tele: null, ph: hash(i, 1), gait: 0, head: 0.7, flip: i % 2 === 1, plat: false, num: 0, numT: 0, foot: 0, blue: 0, hop: 0, spd: 1.3, munch: 0 }));
    tom = { x: TOM_X + 1.3, px: TOM_X + 1.3, walk: 0, stride: 0, bend: 0, check: 0, spray: 0, canPt: null, tx: TOM_X + 1.3 };
    gate = { open: 0, to: 0 };
    dog = null; counted = 0; parts.length = 0; mo = null; drag = null; glow = 0;
  }

  // =====================================================================================================
  // The stage: camera and projection
  // =====================================================================================================
  const cv = $("cv"), ctx = cv.getContext("2d"), stage = $("stage");
  let W = 300, H = 300, DPR = 1;
  const V = { x: BT0, k: 40, B: 300, gY: 250 }, VT = { x: BT0, k: 40, B: 300, gY: 250 };
  // In perspective: depth r spreads the floor up the screen (B), sizes shrink with 1/r
  const X = (x, r) => W / 2 + (x - V.x) * V.k / (r || 1);
  const Y = (r) => V.gY - V.B * (1 - 1 / (r || 1));
  const S = (r) => V.k / (r || 1);
  const wxAt = (vx) => { const b = cv.getBoundingClientRect(); return V.x + (vx - b.left - W / 2) / V.k; };
  function lwPx() { return clamp(V.k * 0.05, 1.5, 3.2); }
  function put(x, r, dir, fn) {
    const d = Math.abs(dir) < 0.12 ? (dir < 0 ? -0.12 : 0.12) : dir;
    Farm.inUnits(ctx, X(x, r), Y(r), S(r), lwPx(), () => { ctx.scale(d, 1); fn(); });
  }
  function onStage(x, r, pad) { const px = X(x, r); return px > -(pad || 60) && px < W + (pad || 60); }
  // the thing he works on, and what must be fully in view with it, for the current moment: { xa, xb, mh }
  function btExt() { return bt.dir > 0 ? [bt.x - 1.4, bt.x + 4.0] : [bt.x - 4.0, bt.x + 1.4]; }
  function rtExt() { return rt.dir < 0 ? [rt.x - 4.3, rt.x + 5.05] : [rt.x - 5.05, rt.x + 4.3]; }
  function frame() {
    const port = H > W * 1.1;
    const driving = !!mo && phase === "work" && mo.drive;
    if (stepId === "scrape") {
      let [xa, xb] = btExt();
      if (driving) { if (mo.drive < 0) xa -= 2.5; else xb += 2.5; }
      if ((sub === "scoop" || sub === "lift") && pile.amt > 0.02) xa = Math.min(xa, pile.x - pile.w - 0.3);
      if (sub === "heap" && phase !== "work" && !port) xa = Math.min(xa, HEAP - 3);
      if (sub === "tip" || (sub === "heap" && bt.x < HEAP_STOP + 3)) xa = Math.min(xa, HEAP - 3.0);
      return { xa: xa - 0.4, xb: xb + 0.4, mh: 3.25 };
    }
    if (stepId === "parlor") return { xa: QUEUE[0] - 0.8, xb: PLAT_END + 0.3, mh: 2.4 };
    if (stepId === "foot") return sheep[0].r < 1.2 && !(sub === "race" && phase === "ready") ? { xa: 62.4, xb: 66.9, mh: 2.0 } : { xa: 58.6, xb: 66.9, mh: 2.0 };
    let [xa, xb] = rtExt();
    if (driving) { if (mo.drive < 0) xa -= 2.5; else xb += 2.5; }
    if (stepId === "bed" && sub === "sheep") xa = Math.min(xa, -3.2);
    if (phase === "done") { xa = Math.min(xa, -3.2); if (!port) xb = Math.max(xb, 21.5); }
    return { xa: xa - 0.3, xb: xb + 0.3, mh: 3.75 };
  }
  function fitTarget() {
    const f = frame(), port = H > W * 1.1;
    const span = Math.max(f.xb - f.xa, port ? 5.2 : Math.max(7, W / 90));
    let k = Math.min(W * 0.92 / span, H * 0.6 / f.mh), B = 0, gY = 0;
    const a = 1 - 1 / RB, b = 1 / RF - 1;
    for (let i = 0; i < 8; i++) {
      B = clamp((0.92 * H - WALLH * k / RB) / (a + b), 1.2 * k, 16 * k);
      gY = H - B * b;
      if (gY - (f.mh + 0.25) * k >= 0.05 * H) break;
      k *= 0.9;
    }
    VT.x = (f.xa + f.xb) / 2; VT.k = k; VT.B = B; VT.gY = gY;
  }
  function follow(dt, snap) {
    fitTarget();
    if (snap) { V.x = VT.x; V.k = VT.k; V.B = VT.B; V.gY = VT.gY; return; }
    const e = Math.min(1, dt * 2.2);
    V.k += (VT.k - V.k) * e; V.B += (VT.B - V.B) * e; V.gY += (VT.gY - V.gY) * e;
    const dx = (VT.x - V.x) * Math.min(1, dt * 3.0);
    V.x += clamp(dx, -26 * dt, 26 * dt);
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(50, r.width); H = Math.max(50, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    follow(0, true);
  }
  // a world spot -> viewport point
  function vp(x, h, r) { const b = cv.getBoundingClientRect(); return { x: b.left + X(x, r), y: b.top + Y(r) - h * S(r) }; }

  // =====================================================================================================
  // Coach, counter, ghost, bottom bar
  // =====================================================================================================
  const coach = Toybox.coach($("coach"));
  function setCount(pop) { const el = $("loads"); el.textContent = "Beds: " + beds; if (pop) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); } }
  setCount(false);
  const SUB = {
    "scrape.scrape": { say: "Drive the blue tractor to scrape the passage.", part: "blue" },
    "scrape.scoop": { say: "Drive the blue tractor into the pile to fill the bucket.", part: "blue" },
    "scrape.lift": { say: "Tap the bucket to lift it up.", part: "bucket" },
    "scrape.heap": { say: "Drive the blue tractor to the muck heap.", part: "blue" },
    "scrape.tip": { say: "Tap the bucket to tip it on the muck heap.", part: "bucket" },
    "parlor.count": { say: "Tap the sheep to count them.", part: "queue" },
    "foot.race": { say: "Tap the sheep to walk it into the race.", part: "patient" },
    "foot.check": { say: "Tap the sheep's foot to check the hoof.", part: "foot" },
    "foot.spray": { say: "Tap the blue spray to spray the sheep's foot.", part: "spray" },
    "bed.on": { say: "Tap the straw chopper to switch it on.", part: "chopper" },
    "bed.drive": { say: "Drive the tractor down the passage to blow the straw.", part: "red" },
    "bed.sheep": { say: "Tap the gate to let the sheep into the shed.", part: "gate" }
  };
  const BUSY = { scrape: "The blue tractor is working.", parlor: "The sheep are walking.", foot: "Farmer Tom is working.", bed: "The tractor is working." };
  const ghost = Toybox.ghost({
    max: 3,
    plan: () => {
      if (Farm.locked(ending)) return null;
      if (phase === "ready") { const p = targetPt(); if (!p) return null; return { pts: [[p.x, p.y]], tap: true, key: key() }; }
      if (phase === "done" && phaseT > 4) { const b = cv.getBoundingClientRect(); return { pts: [[b.left + W / 2, b.top + H * 0.62]], tap: true, key: "again" }; }
      return null;
    }
  });
  Toybox.bar($("bottom"), { onNew: startOver, onSurprise: surprise });
  function hint() { const d = SUB[key()]; if (d) coach.say(d.say, 3); glow = 3; ghost.poke(); }
  function busyHint() { snd.horn(); coach.say(BUSY[stepId] || "Wait a moment.", 3); }

  // =====================================================================================================
  // The flow
  // =====================================================================================================
  // Each step has a few things for him to do in turn (sub); each tap on the right part plays that one
  // control's motion (mo), then the next thing is his again. mo.fn may return true to end the motion early.
  const ORDER = ["scrape", "parlor", "foot", "bed"];
  const key = () => stepId + "." + sub;
  // Leaving "ready" for a busy phase: the instruction he has just carried out goes (coach.busy()).
  function setPhase(p) { if (phase === "ready" && p !== "ready") coach.busy(); phase = p; phaseT = 0; }
  function setSub(s) { sub = s; setPhase("ready"); const d = SUB[key()]; if (d) coach.step(d.say); ghost.poke(); }
  function run(dur, fn, end) { mo = { t: 0, dur, fn, end, ev: {} }; setPhase("work"); }
  function onceM(id) { if (!mo || mo.ev[id]) return false; mo.ev[id] = 1; return true; }
  function bringIn(id) {
    stepId = id; mo = null;
    if (id === "scrape") setSub("scrape");
    else if (id === "parlor") parlorIn();
    else if (id === "foot") footIn();
    else bedIn();
  }
  function stepDone(id) { const i = ORDER.indexOf(id); if (i < ORDER.length - 1) bringIn(ORDER[i + 1]); else finish(); }
  function finish() {
    setPhase("done"); mo = null;
    beds++; save(); setCount(true); snd.chime(); Toybox.kind();
    coach.say("The sheep are back in the clean shed.", 5);
    coach.step("Tap the shed to start again.");
  }
  function again() {
    if (phase !== "done") return false;
    ghost.learned("again");
    startNew();
    coach.say("A new day in the sheep shed.", 3);
    return true;
  }
  function startNew() { resetWorld(); stepId = "scrape"; bringIn("scrape"); follow(0, true); }
  function startOver() {
    if (Farm.locked(ending)) return;
    startNew();
    coach.say("Farmer Tom cleans the sheep shed.", 3);
    save();
  }
  function act(part) {
    const k = key(), p = part || "", sh = /^sheep\d$/.test(p) ? +p.slice(5) : -1;
    const blue = p === "blue" || p === "bucket" || p === "scraper";
    if (k === "scrape.scrape" && (blue || p === "feed")) return doScrape(), true;
    if (k === "scrape.scoop" && (blue || p === "pile")) return doScoop(), true;
    if (k === "scrape.lift" && (blue || p === "pile")) return doLift(), true;
    if (k === "scrape.heap" && (blue || p === "heap")) return doHeap(), true;
    if (k === "scrape.tip" && (blue || p === "heap")) return doTip(), true;
    if (k === "parlor.count" && (sh >= 0 || p === "platform")) return countSheep(), true;
    if (k === "foot.race" && (sh >= 0 || p === "race")) return toRace(), true;
    if (k === "foot.check" && (p === "foot" || sh === 0 || p === "tom")) return checkFoot(), true;
    if (k === "foot.spray" && (p === "spray" || p === "foot" || sh === 0 || p === "tom")) return sprayFoot(), true;
    if (k === "bed.on" && (p === "chopper" || p === "bale" || p === "red")) return chopperOn(), true;
    if (k === "bed.drive" && (p === "red" || p === "chopper" || p === "bale")) return driveRed(), true;
    if (k === "bed.sheep" && (p === "gate" || p === "pens" || sh >= 0)) return sheepIn(), true;
    return false;
  }

  // =====================================================================================================
  // Scrape
  // =====================================================================================================
  function scrEdge() { return bt.x + bt.dir * BT.SCR; }
  function collect() {
    const e = scrEdge();
    let n = 0;
    feed.forEach((f) => { if (!f.got && f.x > e - 0.05) f.got = true; if (f.got) n++; });
    pile.amt = n / feed.length; pile.w = 0.6 + 1.2 * pile.amt; pile.x = e - 0.06;
  }
  function bucketPt() {
    const B = bucketPivot(bt.lift), a = bt.tilt * 1.5, lx = B[0] + Math.cos(a) * 0.45 - Math.sin(a) * 0.15, ly = B[1] + Math.sin(a) * 0.45 + Math.cos(a) * 0.15;
    return { x: bt.x + bt.dir * lx, h: -ly };
  }
  function bucketLip() {
    const B = bucketPivot(bt.lift), a = bt.tilt * 1.5;
    return { x: bt.x + bt.dir * (B[0] + Math.cos(a) * 0.9 - Math.sin(a) * 0.4), h: -(B[1] + Math.sin(a) * 0.9 + Math.cos(a) * 0.4) };
  }
  function scoopX() { return pile.x - pile.w + 0.2 + BT.FRONT; }
  function scoopFill() {
    const front = bt.x - BT.FRONT, w = Math.max(0.3, pile.w);
    bt.fill = clamp((pile.x + 0.1 - front) / w, 0, 1);
  }
  function blueRange() {
    if (sub === "scrape") return [SCR_END, BT0];
    if (sub === "scoop") return [scoopX(), TURN_X];
    return [HEAP_STOP, scoopX()];
  }
  function driveBlue(to, speed, each, end) {
    const x0 = bt.x, dur = Math.max(0.6, Math.abs(to - x0) / speed);
    run(dur, (t) => { const nx = lerp(x0, to, ease(t / dur)); bt.wheel += (nx - bt.x) * bt.dir; bt.x = nx; if (each) each(t); }, () => { bt.x = to; end(); });
    mo.drive = to < x0 ? -1 : 1;
  }
  function doScrape() {
    snd.horn();
    coach.say("The rubber scraper pushes the old feed.", 3);
    driveBlue(SCR_END, 2.3, collect, () => {
      collect(); snd.clunk();
      coach.say("The old feed is in a pile.", 3);
      // the tractor drives on a little and turns round so the bucket faces the pile
      const x0 = bt.x;
      run(2.9, (t) => {
        if (t < 1.6) { const nx = lerp(x0, TURN_X, ease(t / 1.6)); bt.wheel += (nx - bt.x) * bt.dir; bt.x = nx; }
        else bt.dir = lerp(1, -1, ease((t - 1.6) / 1.3));
      }, () => { bt.dir = -1; bt.x = TURN_X; setSub("scoop"); });
    });
  }
  function doScoop() {
    driveBlue(scoopX(), 2.0, scoopFill, () => { bt.fill = 1; pile.amt = 0; snd.clunk(); setSub("lift"); coach.say("The bucket is full of old feed.", 3); });
  }
  function doLift() {
    const l0 = bt.lift;
    snd.tick();
    run(1.6, (t) => { bt.lift = lerp(l0, LIFT, ease(t / 1.6)); }, () => { bt.lift = LIFT; setSub("heap"); });
  }
  function doHeap() {
    snd.horn();
    driveBlue(HEAP_STOP, 2.6, null, () => { snd.clunk(); setSub("tip"); });
  }
  function doTip() {
    run(3.0, (t, dt) => {
      if (t < 1.3) bt.tilt = ease(t / 1.3);
      if (t > 0.5 && t < 1.4) {
        bt.fill = clamp(1 - (t - 0.5) / 0.8, 0, 1);
        const lp = bucketLip();
        for (let i = 0; i < 2; i++) addPart({ kind: "muck", x: lp.x + (Math.random() - 0.5) * 0.4, h: lp.h, r: 1.02 + Math.random() * 0.1, vx: (Math.random() - 0.5) * 0.8, vh: -0.5 - Math.random(), life: 0.9, size: 0.1 + Math.random() * 0.09, col: FEEDC[i + (Math.random() * 2 | 0)], floor: heapTop() - 0.25 });
      }
      if (t > 1.0 && onceM("heap")) { heap.n = Math.min(5, heap.n + 1); snd.clunk(); }
      if (t > 1.5) { const f = ease((t - 1.5) / 1.5); bt.tilt = 1 - f; bt.lift = lerp(LIFT, 0.1, f); }
      void dt;
    }, () => {
      bt.tilt = 0; bt.lift = 0.1; bt.fill = 0;
      coach.say("The old feed goes on the muck heap.", 4);
      stepDone("scrape");
    });
  }
  function heapTop() { return 1.15 + 0.08 * heap.n; }

  // =====================================================================================================
  // Parlor
  // =====================================================================================================
  // where a sheep stands on the parlor's ramps and platform
  function platH(x) {
    if (x <= RAMP[0]) return 0;
    if (x < RAMP[1]) return PLAT_H * (x - RAMP[0]) / (RAMP[1] - RAMP[0]);
    if (x <= PLAT_END) return PLAT_H;
    if (x < RAMP_DN) return PLAT_H * (1 - (x - PLAT_END) / (RAMP_DN - PLAT_END));
    return 0;
  }
  const arrived = (s) => !s.path.length && !s.tele;
  function queued() { return sheep.filter((s) => s.q >= 0 && s.num === 0).sort((a, b) => a.q - b.q); }
  function parlorIn() {
    coach.say("The sheep walk to the milking parlor.", 4);
    sheep.forEach((s, i) => {
      s.q = i < 4 ? i : -1; s.num = 0;
      s.tele = i < 4 ? { x: QUEUE[i] - 5, r: RPL, plat: true, path: [[QUEUE[i], RPL]], spd: 1.5 } : { x: HOLD[i][0], r: HOLD[i][1], plat: false, path: [] };
    });
    run(14, (t) => t > 1.5 && sheep.slice(0, 4).every(arrived), () => setSub("count"));
  }
  function countSheep() {
    const q = queued();
    if (!q.length) return;
    const s = q[0];
    s.num = ++counted; s.numT = time; s.spd = 1.6;
    s.path = [[RAMP[0] - 0.2, RPL], [SPOTS[counted - 1], RPL]];
    snd.pop();
    q.slice(1).forEach((o, j) => { o.path = [[QUEUE[j], RPL]]; o.spd = 1.2; });
    if (counted < 4) { setSub("count"); return; }
    ghost.learned("parlor.count");
    run(20, () => sheep.slice(0, 4).every(arrived), () => {
      snd.chime();
      coach.say("Four sheep stand on the milking platform.", 4);
      run(3.6, noop, () => {
        sheep.slice(0, 4).forEach((o, j) => { o.path = [[RAMP_DN + 0.6 + j * 0.2, RPL], [48.5 + j * 1.3, RPL]]; o.spd = 1.5; });
        run(3.2, noop, () => stepDone("parlor"));
      });
    });
  }

  // =====================================================================================================
  // Foot care
  // =====================================================================================================
  function footIn() {
    coach.say("Farmer Tom checks the sheep's feet.", 4);
    sheep.forEach((s, i) => {
      s.q = -1;
      if (i < 4) s.tele = { x: 52.8 - i * 0.9, r: HOLD[i][1], plat: false, path: [[HOLD[i][0], HOLD[i][1]]], spd: 1.5 };
    });
    tom.x = tom.px = tom.tx = TOM_X + 1.3; tom.check = 0; tom.spray = 0; tom.bend = 0;
    run(12, (t) => t > 1.2 && arrived(sheep[0]), () => { sheep[0].flip = false; setSub("race"); });
  }
  function toRace() {
    const s = sheep[0];
    s.path = [[60.1, 1.3], [60.9, RRACE], [SPOT_RACE, RRACE]]; s.spd = 1.2;
    tom.tx = TOM_X;
    snd.tick();
    run(12, (t) => t > 0.5 && arrived(s), () => { s.flip = false; setSub("check"); coach.say("The sheep stands still in the race.", 3); });
  }
  function checkFoot() {
    const s = sheep[0];
    run(1.8, (t) => { const f = ease(t / 1.8); tom.check = f; s.foot = clamp(f * 1.3 - 0.2, 0, 1); }, () => {
      tom.check = 1; s.foot = 1;
      coach.say("Farmer Tom checks the sheep's hoof.", 3);
      setSub("spray");
    });
  }
  function sprayFoot() {
    const s = sheep[0];
    run(2.6, (t) => {
      tom.spray = t < 0.5 ? ease(t / 0.5) : (t < 1.9 ? 1 : 1 - ease((t - 1.9) / 0.6));
      if (t > 0.5 && t < 1.7) {
        if (onceM("hiss")) snd.pour(0.5);
        s.blue = clamp((t - 0.6) / 0.8, 0, 1);
        const n = tom.nozzle;
        if (n && Math.random() < 0.8) addPart({ kind: "mist", x: n.x, h: n.h, r: n.r, vx: n.vx * (0.9 + Math.random() * 0.5), vh: n.vh + (Math.random() - 0.5) * 0.5, life: 0.8, size: 0.05, grow: 0.25, col: SPRAY, alpha: 0.55, g: 0 });
      }
      if (t > 1.7 && onceM("quiet")) snd.pour(0);
    }, () => {
      tom.spray = 0; s.blue = 1;
      coach.say("The blue spray keeps the hoof healthy.", 4);
      run(1.4, (t) => { const f = ease(t / 1.4); tom.check = 1 - f; s.foot = 1 - f; }, () => {
        tom.check = 0; s.foot = 0;
        s.path = [[60.9, RRACE], [60.1, 1.3], [HOLD[0][0] - 0.3, 1.32]]; s.spd = 1.2;
        tom.tx = TOM_X + 1.3;
        run(4.6, noop, () => stepDone("foot"));
      });
    });
  }
  function footWorld() { const s = sheep[0], f = s.foot; return { x: s.x + (s.flip ? -1 : 1) * lerp(0.26, 0.48, f), h: s.h + 0.3 * f + 0.04, r: s.r }; }
  function footVp() { const p = footWorld(); return vp(p.x, p.h, p.r); }

  // =====================================================================================================
  // Bedding
  // =====================================================================================================
  function spoutX() { return rt.x - rt.dir * SPOUT; }
  function bedIn() {
    coach.say("The tractor brings the straw chopper.", 4);
    bt.x = BT_PARK; bt.dir = -1; bt.lift = 0; bt.tilt = 0; bt.fill = 0;
    rt.vis = true; rt.x = RT0; rt.dir = -1; rt.on = false; rt.bale = 1;
    const x0 = rt.x, dur = 4.0;
    run(dur, (t) => { const nx = lerp(x0, RT_START, ease(t / dur)); rt.wheel += Math.abs(nx - rt.x); rt.x = nx; }, () => { rt.x = RT_START; snd.clunk(); setSub("on"); });
    mo.drive = -1;
  }
  function chopperOn() {
    rt.on = true; snd.clunk();
    run(1.4, (t) => { rt.rate = ease(t / 1.4); }, () => { rt.rate = 1; setSub("drive"); coach.say("The chopper shreds the straw bale.", 3); });
  }
  function redMoved() { const p = clamp((RT_START - rt.x) / (RT_START - RT_END), 0, 1); rt.bale = Math.min(rt.bale, lerp(1, 0.12, p)); }
  function driveRed() {
    if (!rt.on) { chopperOn(); return; }
    snd.horn();
    const x0 = rt.x, dur = Math.max(0.6, Math.abs(x0 - RT_END) / 2.1);
    run(dur, (t) => { const nx = lerp(x0, RT_END, ease(t / dur)); rt.wheel += Math.abs(nx - rt.x); rt.x = nx; redMoved(); if (mo) mo.drive = -1; }, () => {
      rt.x = RT_END;
      // the last of the bale blows out over the beds, then the rotor runs down
      run(2.2, (t, dt) => {
        rt.bale = Math.max(0, rt.bale - dt * 0.06);
        for (let i = 0; i < NBIN; i++) fresh[i] = Math.min(1, fresh[i] + dt * 0.7);
        if (t > 1.5) rt.rate = Math.max(0, 1 - (t - 1.5) / 0.7);
      }, () => {
        fresh.fill(1); rt.on = false; rt.rate = 0; rt.bale = 0;
        coach.say("The sheep have a fresh straw bed.", 4);
        setSub("sheep");
      });
    });
  }
  function sheepIn() {
    snd.clunk();
    sheep.forEach((s, i) => {
      s.num = 0; s.q = -1;
      s.tele = { x: -10 - i * 0.9, r: 1.43, plat: false, path: [[-0.8, 1.43], [1.6, 1.43], [PENS[i][0], PENS[i][1]]], spd: 2.4 };
    });
    gate.to = 1;
    run(30, (t) => t > 2 && sheep.every((s) => !s.tele && s.x > 1.2), () => {
      gate.to = 0; snd.clunk();
      sheep.forEach((s, i) => { s.flip = i % 2 === 1; });
      run(1.2, noop, finish);
    });
  }

  // =====================================================================================================
  // Surprise: a fun moment on the scene, taking turns
  // =====================================================================================================
  let surpriseN = 0;
  function surprise() {
    if (Farm.locked(ending)) return;
    const pick = surpriseN++ % 2 ? "hop" : "midge";
    const idle = sheep.filter((s) => arrived(s) && onStage(s.x, s.r, -20) && !(stepId === "foot" && s.i === 0 && phase !== "done"));
    if (pick === "hop" && idle.length) {
      const s = idle[Math.floor(Math.random() * idle.length)];
      s.hop = 1; snd.pop();
      coach.say("A sheep jumps for joy!", 3);
      return;
    }
    // Midge plays tag (the episode starts with her running round the sheep pens)
    const from = stepId === "foot" ? MIDGE_X : V.x + W / V.k / 2 + 1;
    dog = { x: from, t: 0, ph: 0, flip: true, r: stepId === "foot" ? 0.97 : 0.93, hop: 0 };
    snd.pop();
    coach.say("Midge runs by to play tag.", 3);
  }

  // =====================================================================================================
  // Particles (world x, height h in metres, depth r)
  // =====================================================================================================
  const parts = [];
  function addPart(p) { if (parts.length > 150) parts.shift(); p.t = 0; p.rot = p.rot || Math.random() * 3; p.vr = p.vr || 0; parts.push(p); }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vh -= (p.g === undefined ? 9 : p.g) * dt;
      p.x += p.vx * dt; p.h += p.vh * dt; p.r += p.vr * dt; p.rot += (p.spin || 0) * dt;
      if (p.grow) p.size += p.grow * dt;
      const fl = p.floor || 0;
      if (p.h < fl) { p.h = fl; p.vh = 0; p.vx *= 0.2; p.vr = 0; p.spin = 0; if (p.t < p.life - 0.25) p.t = p.life - 0.25; }
    }
  }
  function drawParts() {
    for (const p of parts) {
      const s = S(p.r), x = X(p.x, p.r), y = Y(p.r) - p.h * s, z = Math.max(1.2, p.size * s), f = p.t / p.life;
      if (x < -30 || x > W + 30) continue;
      ctx.globalAlpha = p.kind === "mist" ? (p.alpha || 0.5) * (1 - f) : (f > 0.65 ? (1 - f) / 0.35 : 1);
      if (p.kind === "straw") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-z, -z * 0.18, z * 2, z * 0.36); ctx.restore();
      } else { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(x, y, z, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  // =====================================================================================================
  // Input
  // =====================================================================================================
  function targetPt() {
    const d = SUB[key()], t = d ? d.part : null;
    if (t === "blue") return vp(bt.x + bt.dir * 0.5, 1.5, 1);
    if (t === "bucket") { const b = bucketPt(); return vp(b.x, b.h + 0.1, 1); }
    if (t === "queue") { const s = queued()[0]; return s ? vp(s.x, s.h + 0.62, s.r) : null; }
    if (t === "patient") { const s = sheep[0]; return vp(s.x, s.h + 0.62, s.r); }
    if (t === "foot") return footVp();
    if (t === "spray") { if (!tom.canPt) return null; const b = cv.getBoundingClientRect(); return { x: b.left + tom.canPt.x, y: b.top + tom.canPt.y }; }
    if (t === "chopper") return vp(rt.x - rt.dir * 3.5, 1.6, 1);
    if (t === "red") return vp(rt.x + rt.dir * 1.4, 1.9, 1);
    if (t === "gate") return vp(gateEnd().x * 0.5, 0.6, (PEN_R0 + gateEnd().r) / 2);
    return null;
  }
  function partList() {
    const L = [], b = cv.getBoundingClientRect();
    function add(id, x, h, r, size) {
      const px = X(x, r), py = Y(r) - h * S(r);
      if (px < -10 || px > W + 10 || py < -10 || py > H + 10) return;
      L.push({ id, x: b.left + px, y: b.top + py, r: Math.max(36, S(r) * size) });
    }
    if (stepId === "scrape" || bt.x > -12) {
      add("blue", bt.x + bt.dir * 0.5, 1.5, 1, 1.3);
      const bp = bucketPt(); add("bucket", bp.x, bp.h, 1, 0.6);
      add("scraper", scrEdge(), 0.4, 1, 0.45);
    }
    if (pile.amt > 0.02) add("pile", pile.x - pile.w / 2, 0.25, 1.01, 0.6);
    add("heap", HEAP, 1.0, HEAP_R, 1.6);
    if (stepId === "scrape" && sub === "scrape") add("feed", (FEED0 + FEED1) / 2, 0.1, 1.1, 1.0);
    sheep.forEach((s) => add("sheep" + s.i, s.x, s.h + 0.62 + s.hop * 0.3, s.r, 0.55));
    if (stepId === "parlor") add("platform", 40.6, PLAT_H + 0.2, RPL, 1.0);
    if (stepId === "foot") {
      add("tom", tom.x, 1.1, TOM_R, 0.55);
      add("race", 62.2, 0.6, RRACE, 0.8);
      const f = footWorld(); add("foot", f.x, f.h, f.r, 0.35);
      if (tom.canPt) L.push({ id: "spray", x: b.left + tom.canPt.x, y: b.top + tom.canPt.y, r: Math.max(36, S(TOM_R) * 0.3) });
    }
    if (rt.vis) {
      add("red", rt.x + rt.dir * 1.4, 1.9, 1, 1.6);
      add("chopper", rt.x - rt.dir * 3.5, 1.6, 1, 1.1);
      if (rt.bale > 0.05) add("bale", rt.x - rt.dir * 3.75, 2.35, 1, 0.6);
    }
    if (stepId === "bed") { const g = gateEnd(); add("gate", g.x * 0.5, 0.6, (PEN_R0 + g.r) / 2, 0.6); add("pens", 12, 0.3, 1.45, 2.0); }
    if (dog || stepId === "foot") add("midge", dog ? dog.x : MIDGE_X, 0.3, dog ? dog.r : 0.97, 0.4);
    return L;
  }
  const NAMES = { blue: "Yard tractor", bucket: "Loader bucket", scraper: "Rubber scraper", pile: "Old feed", heap: "Muck heap", feed: "Feed passage",
    platform: "Milking platform", tom: "Farmer Tom", race: "Race", foot: "Hoof", spray: "Blue spray", red: "Tractor", chopper: "Straw chopper",
    bale: "Straw bale", gate: "Gate", pens: "Straw bed", midge: "Midge" };
  function tagPart(part) {
    if (!part) return false;
    const p = partList().find((q) => q.id === part);
    if (!p) return false;
    const name = /^sheep\d$/.test(part) ? "Sheep" : NAMES[part];
    if (!name) return false;
    if (part === "blue" || part === "red") snd.horn(); else snd.tick();
    if (/^sheep\d$/.test(part)) { const s = sheep[+part.slice(5)]; if (arrived(s) && !s.hop) s.hop = 0.5; }
    Toybox.nametag(name, p.x, p.y - Math.min(60, p.r * 0.6), 2400);
    return true;
  }
  function tapPart(part) {
    if (phase === "done") { again(); return; }   // no step row: a tap on the finished scene starts the next day
    if (phase === "ready") { const k = key(); if (act(part)) { ghost.learned(k); glow = 0; return; } }
    if (phase === "work" && part) { if (!tagPart(part)) busyHint(); return; }
    if (tagPart(part)) return;
    hint();
  }
  let drag = null;
  const BLUEP = { blue: 1, bucket: 1, scraper: 1 }, REDP = { red: 1, chopper: 1, bale: 1 };
  Toybox.press(cv, {
    any: true,
    parts: partList,
    dragStart: (part, e, s) => {
      drag = null;
      if (Farm.locked(ending) || phase !== "ready") return;
      const k = key(), p = part || "", w0 = wxAt(s.x0);
      if ((k === "scrape.scrape" || k === "scrape.scoop" || k === "scrape.heap") && BLUEP[p]) drag = { kind: "blue", off: w0 - bt.x, x0: bt.x };
      else if (k === "bed.drive" && REDP[p]) drag = { kind: "red", off: w0 - rt.x, x0: rt.x };
      else drag = { kind: "act", part };
    },
    move: (part, e, s) => {
      if (!drag || Farm.locked(ending) || phase !== "ready") return;
      if (drag.kind === "blue") {
        const rg = blueRange(), nx = clamp(wxAt(s.x) - drag.off, rg[0], rg[1]);
        bt.wheel += (nx - bt.x) * bt.dir; bt.x = nx;
        if (sub === "scrape") collect(); else if (sub === "scoop") scoopFill();
      } else if (drag.kind === "red") {
        const nx = clamp(wxAt(s.x) - drag.off, RT_END, RT_START);
        rt.wheel += Math.abs(nx - rt.x); rt.x = nx; redMoved();
      }
    },
    up: (part) => {
      const d = drag; drag = null;
      if (!d || Farm.locked(ending) || phase !== "ready") return;
      const k = key();
      if (d.kind === "act") { if (act(d.part)) { ghost.learned(k); glow = 0; } return; }
      ghost.learned(k);
      // a drag towards the stop sets the machine going: it drives on to its stop when he lets go
      if (d.kind === "blue" && Math.abs(bt.x - d.x0) > 0.3) act("blue");
      if (d.kind === "red" && Math.abs(rt.x - d.x0) > 0.3) act("red");
    },
    tap: (part) => { if (!Farm.locked(ending)) tapPart(part); }
  });

  // =====================================================================================================
  // Update
  // =====================================================================================================
  let engLevel = 0;
  function updateSheep(dt) {
    sheep.forEach((s, i) => {
      if (s.tele && !onStage(s.x, s.r, 80)) {
        const T = s.tele; s.tele = null;
        s.x = T.x; s.r = T.r; s.plat = !!T.plat; s.path = T.path.slice(); if (T.spd) s.spd = T.spd; s.num = s.num && T.plat ? s.num : 0;
      }
      let moving = false;
      if (!s.tele && s.path.length) {
        const tg = s.path[0], dx = tg[0] - s.x, dr = tg[1] - s.r, dist = Math.hypot(dx, dr * 4);
        if (dist < 0.04) { s.x = tg[0]; s.r = tg[1]; s.path.shift(); }
        else {
          const st = Math.min(1, s.spd * dt / dist);
          s.x += dx * st; s.r += dr * st; moving = true;
          if (Math.abs(dx) > 0.02) s.flip = dx < 0;
        }
      }
      s.gait += ((moving ? 1 : 0) - s.gait) * Math.min(1, dt * 8);
      s.ph += dt * (moving ? 1.6 * s.spd : 0.15);
      s.head += ((moving ? 0 : (s.plat ? 0.15 : 0.75 + 0.25 * Math.sin(time * 0.6 + i * 2))) - s.head) * Math.min(1, dt * 3);
      s.munch = !moving && s.head > 0.6 ? time : 0;
      s.h = s.plat ? platH(s.x) : 0;
      if (s.hop > 0) s.hop = Math.max(0, s.hop - dt * 0.8);
    });
  }
  function updateTom(dt) {
    const dx = tom.tx - tom.x;
    if (Math.abs(dx) > 0.01) tom.x += clamp(dx, -1.1 * dt, 1.1 * dt);
    const mv = Math.abs(tom.x - tom.px); tom.px = tom.x;
    if (mv > 0.0005) { tom.walk += mv * 7; tom.stride = Math.min(1, tom.stride + dt * 6); } else tom.stride = Math.max(0, tom.stride - dt * 5);
    tom.bend = Math.max(tom.check, tom.spray);
  }
  function update(dt) {
    time += dt; phaseT += dt;
    let work = 0;
    if (mo) {
      mo.t += dt; work = 0.8;
      const fin = mo.fn(Math.min(mo.t, mo.dur), dt);
      if (mo && (mo.t >= mo.dur || fin === true)) { const en = mo.end; mo = null; en(); }
    }
    glow = Math.max(0, glow - dt);
    updateSheep(dt);
    updateTom(dt);
    gate.open += clamp(gate.to - gate.open, -dt * 1.2, dt * 1.2);
    // the straw chopper: the fan turns, the chopped straw blows over the barrier onto the beds
    rt.spin += dt * (rt.on ? 18 * rt.rate : 0);
    rt.flow = rt.on ? rt.rate : 0;
    if (rt.flow > 0.05 && !ending) {
      const sx = spoutX();
      for (let i = 0; i < NBIN; i++) {
        const d = Math.abs(BIN0 + (i + 0.5) * BINW - sx);
        if (d < 2.4) fresh[i] = Math.min(1, fresh[i] + dt * 0.75 * rt.flow * (1 - d / 2.4) * 2);
      }
      if (Math.random() < rt.flow * dt * 40) {
        for (let n = 0; n < 2; n++) addPart({ kind: "straw", x: sx + (Math.random() - 0.5) * 0.3, h: 3.0, r: 1.0, vx: (Math.random() - 0.5) * 2.4, vh: 1.4 + Math.random() * 1.4, vr: 0.32 + Math.random() * 0.22, g: 5, life: 1.25, size: 0.09 + Math.random() * 0.08, spin: (Math.random() - 0.5) * 8, col: Math.random() < 0.5 ? STRAW : STRAWD, floor: 0.05 });
      }
      work = Math.max(work, 0.7);
    }
    if (dog) {
      dog.t += dt; dog.ph += dt * 3.2; dog.x -= 4.2 * dt; dog.hop = Math.abs(Math.sin(dog.t * 7)) * 0.12;
      if (dog.x < V.x - W / V.k / 2 - 2) dog = null;
    }
    updateParts(dt);
    follow(dt);
    engLevel += (work - engLevel) * Math.min(1, dt * 4);
    const machine = stepId === "scrape" || stepId === "bed";
    snd.engine(ending || !machine ? -1 : 0.15 + engLevel * 0.85);
    snd.pour(ending ? 0 : (rt.flow > 0.05 ? 0.45 * rt.flow : 0));
    snd.soil(!ending && stepId === "scrape" && sub === "scrape" && phase === "work" ? 0.35 : 0);
  }

  // =====================================================================================================
  // Drawing the scene
  // =====================================================================================================
  // ground quads and walls in perspective (screen px)
  function floorQuad(xa, xb, ra, rb, fill, h) {
    h = h || 0;
    ctx.beginPath();
    ctx.moveTo(X(xa, ra), Y(ra) - h * S(ra)); ctx.lineTo(X(xb, ra), Y(ra) - h * S(ra));
    ctx.lineTo(X(xb, rb), Y(rb) - h * S(rb)); ctx.lineTo(X(xa, rb), Y(rb) - h * S(rb)); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function wall(xa, xb, r, h0, h1, fill, line) {
    const x0 = X(xa, r), x1 = X(xb, r), y0 = Y(r) - h1 * S(r), y1 = Y(r) - h0 * S(r);
    ctx.fillStyle = fill; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (line) { ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); }
  }
  // a building's end wall at x, between depths r0 and r1, from h0 up (to the top of the stage)
  function endWall(x, r0, r1, h0, fill) {
    const h1 = 60;
    ctx.beginPath();
    ctx.moveTo(X(x, r0), Y(r0) - h0 * S(r0)); ctx.lineTo(X(x, r1), Y(r1) - h0 * S(r1));
    ctx.lineTo(X(x, r1), Y(r1) - h1 * S(r1)); ctx.lineTo(X(x, r0), Y(r0) - h1 * S(r0)); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
  }
  function visible(xa, xb, r) { return X(xb, r) > -20 && X(xa, r) < W + 20; }
  function drawBackdrop() {
    const hz = V.gY - V.B;
    if (hz > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, hz);
      g.addColorStop(0, "#7CC4F5"); g.addColorStop(1, "#CDEBFF");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 1);
      // soft clouds and the hills
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 260 - V.x * V.k * 0.03 + time * 6) % (W + 300) + W + 300) % (W + 300) - 150, cy = hz * (0.25 + 0.15 * (i % 2));
        if (cy < 12) continue;
        ctx.beginPath(); ctx.ellipse(cx, cy, 46, 14, 0, 0, TAU); ctx.ellipse(cx + 26, cy - 8, 26, 14, 0, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "#9CCB72"; ctx.beginPath(); ctx.moveTo(0, hz + 2);
      for (let px = 0; px <= W + 20; px += 20) ctx.lineTo(px, hz - 14 - 10 * Math.sin((px + V.x * V.k * 0.04) / 70));
      ctx.lineTo(W, hz + 2); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "#86C25A"; ctx.fillRect(0, Math.max(0, hz), W, H);
    // the hedge behind the yard
    const rh = 2.5, yh = Y(rh), sh = S(rh);
    if (yh > 0) {
      ctx.fillStyle = "#3E8A3A"; ctx.beginPath(); ctx.moveTo(0, yh);
      for (let px = 0; px <= W + 16; px += 16) ctx.lineTo(px, yh - sh * (1.5 + 0.25 * Math.sin((px / sh + V.x) * 2.1)));
      ctx.lineTo(W, yh); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(29,35,64,0.5)"; ctx.stroke();
    }
    // the farmyard's concrete
    floorQuad(-40, 80, RF - 0.2, 2.2, "#C4BFB2");
  }
  function drawShed() {
    if (!visible(SHED[0] - 1, SHED[1] + 1, RF)) return;
    const [a, b] = SHED, top = Y(RB) - WALLH * S(RB);
    floorQuad(a, b, RF - 0.2, RB, "#BDB6A6");
    // the back wall: a concrete panel and Yorkshire boarding with light showing between the boards
    wall(a, b, RB, 0, 1.3, "#A9A9A2");
    wall(a, b, RB, 1.3, WALLH, "#86663F");
    ctx.strokeStyle = "#D6ECF7"; ctx.lineWidth = Math.max(1, S(RB) * 0.03);
    for (let x = a + 0.2; x < b; x += 0.3) { const px = X(x, RB); if (px < -2 || px > W + 2) continue; ctx.beginPath(); ctx.moveTo(px, Y(RB) - 1.35 * S(RB)); ctx.lineTo(px, top); ctx.stroke(); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(a, RB), Y(RB) - 1.3 * S(RB)); ctx.lineTo(X(b, RB), Y(RB) - 1.3 * S(RB)); ctx.stroke();
    // the roof seen from inside, up to the top of the stage, with clear roof lights
    if (top > 0) {
      const xl0 = X(a, RB), xr0 = X(b, RB), xl1 = X(a, 0.75), xr1 = X(b, 0.75);
      ctx.fillStyle = "#5E5246"; ctx.beginPath(); ctx.moveTo(xl0, top); ctx.lineTo(xr0, top); ctx.lineTo(xr1, 0); ctx.lineTo(xl1, 0); ctx.closePath(); ctx.fill();
      for (let x = a + 3; x < b; x += 6) {
        ctx.fillStyle = "rgba(220,240,250,0.55)"; ctx.beginPath();
        ctx.moveTo(X(x, RB), top); ctx.lineTo(X(x + 1.4, RB), top); ctx.lineTo(X(x + 1.4, 0.75), 0); ctx.lineTo(X(x, 0.75), 0); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = "rgba(29,35,64,0.55)"; ctx.lineWidth = 1.5;
      [0.3, 0.6].forEach((f) => { const y = top * (1 - f); ctx.beginPath(); ctx.moveTo(lerp(xl0, xl1, f), y); ctx.lineTo(lerp(xr0, xr1, f), y); ctx.stroke(); });
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xl0, top); ctx.lineTo(xr0, top); ctx.stroke();
    }
    // the shed's open ends: only the boarding high up (the passage and the pen gate are open below)
    [a, b].forEach((x) => endWall(x, 0.95, RB, 3.4, "#7A5C38"));
    // the bedding in the pens, old and trodden or fresh and golden, bin by bin
    for (let i = 0; i < NBIN; i++) {
      const xa = BIN0 + i * BINW, xb = xa + BINW + 0.02;
      if (!visible(xa, xb, PEN_R0)) continue;
      floorQuad(xa, xb, PEN_R0, RB, mix(OLDBED, NEWBED, fresh[i]));
      ctx.strokeStyle = fresh[i] > 0.5 ? STRAWD : "#7C6A44"; ctx.lineWidth = Math.max(1, S(1.4) * 0.025);
      for (let j = 0; j < 4; j++) {
        const x = xa + hash(i, j) * BINW, r = lerp(PEN_R0 + 0.03, RB - 0.03, hash(j, i + 9)), px = X(x, r), py = Y(r);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + S(r) * 0.18 * (hash(i + j, 4) - 0.5) * 2, py - S(r) * 0.05); ctx.stroke();
      }
    }
    // the feed passage and the old feed lying along the barrier
    floorQuad(a, b, RF - 0.2, RBAR + 0.04, "#CFCABE");
    if (stepId === "scrape" && (sub === "scrape" || phase !== "done")) {
      for (const f of feed) {
        if (f.got) continue;
        const s = S(f.r);
        ctx.fillStyle = f.c; ctx.beginPath(); ctx.ellipse(X(f.x, f.r), Y(f.r) - f.s * s * 0.25, f.s * s * 1.6, f.s * s * 0.55, 0, 0, TAU); ctx.fill();
      }
    }
  }
  function drawParlor() {
    if (!visible(PARLOR[0] - 1, PARLOR[1] + 1, RF)) return;
    const [a, b] = PARLOR, top = Y(RB) - WALLH * S(RB);
    floorQuad(a, b, RF - 0.2, RB, "#C9C6BE");
    wall(a, b, RB, 0, WALLH, "#E9E6DD");
    ctx.strokeStyle = "rgba(29,35,64,0.18)"; ctx.lineWidth = 1;
    for (let h = 0.25; h < WALLH; h += 0.25) { const y = Y(RB) - h * S(RB); ctx.beginPath(); ctx.moveTo(X(a, RB), y); ctx.lineTo(X(b, RB), y); ctx.stroke(); }
    wall(a, b, RB, 0, 0.5, "#B7C9C2");
    wall(38.5, 41.5, RB, 1.9, 2.9, "#BFE7FA", true);
    if (top > 0) {
      const xl0 = X(a, RB), xr0 = X(b, RB), xl1 = X(a, 0.75), xr1 = X(b, 0.75);
      ctx.fillStyle = "#D9D5C9"; ctx.beginPath(); ctx.moveTo(xl0, top); ctx.lineTo(xr0, top); ctx.lineTo(xr1, 0); ctx.lineTo(xl1, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "rgba(29,35,64,0.4)"; ctx.lineWidth = 1;
      [0.35, 0.7].forEach((f) => { const y = top * (1 - f), xl = lerp(X(35, RB), X(35, 0.75), f), xr = lerp(X(44, RB), X(44, 0.75), f), hh = Math.max(3, top * 0.04); ctx.fillRect(xl, y - hh / 2, xr - xl, hh); ctx.strokeRect(xl, y - hh / 2, xr - xl, hh); });
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xl0, top); ctx.lineTo(xr0, top); ctx.stroke();
    }
    // the end walls, with a door for the sheep at each end
    [a, b].forEach((x) => { endWall(x, 0.9, 0.98, 0, "#DCD8CC"); endWall(x, 1.17, RB, 0, "#DCD8CC"); endWall(x, 0.98, 1.17, 1.9, "#DCD8CC"); });
  }
  // the raised platform with its ramps (drawn behind the sheep on it)
  function platformPts(r) {
    const pts = [[RAMP[0], 0], [RAMP[1], PLAT_H], [PLAT_END, PLAT_H], [RAMP_DN, 0]];
    return pts.map((q) => [X(q[0], r), Y(r) - q[1] * S(r)]);
  }
  function drawPlatform() {
    // headlocks and the feed trough along the back of the platform
    put(0, RHL, 1, () => {
      const c = ctx;
      for (let x = RAMP[1] + 0.2; x < PLAT_END; x += 0.34) tube(c, x, -PLAT_H, x, -PLAT_H - 1.05, 0.04, STEEL);
      tube(c, RAMP[1], -PLAT_H - 1.05, PLAT_END, -PLAT_H - 1.05, 0.06, STEEL);
      Rr(c, RAMP[1], -PLAT_H - 0.55, PLAT_END - RAMP[1], 0.22, 0.05, "#DDE3EA", Farm.LW * 0.8);
    });
    // the top of the platform and ramps, from the headlocks to its front edge
    const back = platformPts(RHL), front = platformPts(RPF);
    ctx.fillStyle = "#B8B3A8"; ctx.beginPath();
    back.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    for (let i = front.length - 1; i >= 0; i--) ctx.lineTo(front[i][0], front[i][1]);
    ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(29,35,64,0.5)"; ctx.stroke();
    // its front face
    const g0 = Y(RPF);
    ctx.fillStyle = "#A39E93"; ctx.beginPath(); ctx.moveTo(front[0][0], g0);
    front.forEach((p) => ctx.lineTo(p[0], p[1])); ctx.lineTo(front[3][0], g0); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = "rgba(29,35,64,0.3)"; ctx.lineWidth = 1;
    for (let x = RAMP[1]; x < PLAT_END; x += 1.4) { ctx.beginPath(); ctx.moveTo(X(x, RPF), g0); ctx.lineTo(X(x, RPF), front[1][1]); ctx.stroke(); }
  }
  function drawPlatformRail() {
    put(0, RPF - 0.005, 1, () => {
      const c = ctx, h1 = PLAT_H + 0.55, h2 = PLAT_H + 0.95;
      for (let x = RAMP[1]; x <= PLAT_END + 0.01; x += (PLAT_END - RAMP[1]) / 4) tube(c, x, -PLAT_H, x, -h2, 0.05, STEEL);
      tube(c, RAMP[1], -h1, PLAT_END, -h1, 0.05, STEEL); tube(c, RAMP[1], -h2, PLAT_END, -h2, 0.05, STEEL);
      tube(c, RAMP[0], -0.95, RAMP[1], -h2, 0.05, STEEL); tube(c, RAMP[0], 0, RAMP[0], -0.95, 0.05, STEEL);
    });
  }
  function drawHeap() {
    put(HEAP, HEAP_R + 0.25, 1, () => {
      Rr(ctx, -3.3, -1.3, 6.6, 1.3, 0.05, "#A7A399", Farm.LW);
      for (let x = -2.2; x < 3.3; x += 1.1) Ln(ctx, x, -1.3, x, 0, "rgba(29,35,64,0.3)", 0.03);
    });
    put(HEAP, HEAP_R, 1, () => {
      const c = ctx, w = 2.5 + 0.15 * heap.n, h = heapTop();
      c.beginPath(); c.moveTo(-w, 0); c.bezierCurveTo(-w * 0.6, -h * 0.9, -w * 0.25, -h, 0, -h); c.bezierCurveTo(w * 0.3, -h, w * 0.6, -h * 0.85, w, 0); c.closePath(); fs(c, MUCK, Farm.LW);
      for (let i = 0; i < 14; i++) { const x = (hash(i, 1) - 0.5) * w * 1.4, y = -h * (0.2 + 0.6 * hash(i, 2)) * (1 - Math.abs(x) / w); Ln(c, x, y, x + 0.25, y - 0.06, i % 3 ? "#B39A5A" : MUCKD, 0.05); }
    });
  }
  function gateEnd() { const o = ease(gate.open); return { x: lerp(0, -1.7, o), r: lerp(PEN_R1, PEN_R0 + 0.02, o) }; }
  function drawGate() {
    const e = gateEnd(), lw = Math.max(1.5, S(1.4) * 0.05);
    ctx.lineCap = "round";
    [0.15, 0.4, 0.65, 0.95].forEach((hh, i) => {
      const x0 = X(0, PEN_R0), y0 = Y(PEN_R0) - hh * S(PEN_R0), x1 = X(e.x, e.r), y1 = Y(e.r) - hh * S(e.r);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = INK; ctx.lineWidth = lw + 2.5; ctx.stroke(); ctx.strokeStyle = i ? GALV : "#9AA6B2"; ctx.lineWidth = lw; ctx.stroke();
    });
    [[0, PEN_R0], [e.x, e.r]].forEach((q) => {
      const x = X(q[0], q[1]), y = Y(q[1]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 1.0 * S(q[1])); ctx.strokeStyle = INK; ctx.lineWidth = lw + 3; ctx.stroke(); ctx.strokeStyle = GALV; ctx.lineWidth = lw + 0.5; ctx.stroke();
    });
  }
  function drawBarrier() {
    put(0, RBAR, 1, () => {
      const c = ctx, x0 = Math.max(SHED[0], V.x - W / V.k), x1 = Math.min(SHED[1], V.x + W / V.k);
      if (x1 <= x0) return;
      Rr(c, x0, -0.3, x1 - x0, 0.3, 0.02, "#9C9890", Farm.LW * 0.8);
      for (let x = Math.ceil(x0 / 0.36) * 0.36; x < x1; x += 0.36) tube(c, x, -0.3, x + 0.14, -1.05, 0.035, "#7FAE5A");
      tube(c, x0, -1.08, x1, -1.08, 0.07, "#7FAE5A");
    });
    // the steel portal frame's columns
    for (let x = SHED[0]; x <= SHED[1]; x += 6) {
      const px = X(x, RBAR + 0.01), y = Y(RBAR + 0.01), w = Math.max(5, S(RBAR) * 0.2);
      if (px < -w || px > W + w) continue;
      ctx.fillStyle = "#6E7887"; ctx.fillRect(px - w / 2, 0, w, y); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.strokeRect(px - w / 2, -2, w, y + 2);
    }
  }
  // the holding pen's back hurdle, and its side next to the race
  function drawPenBack() {
    put(0, PEN_R1, 1, () => hurdle(ctx, PEN[0], PEN[1], 1.0));
    const lw = Math.max(1.5, S(1.4) * 0.05);
    [0.25, 0.5, 0.75, 1.0].forEach((hh) => {
      ctx.beginPath(); ctx.moveTo(X(PEN[1], 1.16), Y(1.16) - hh * S(1.16)); ctx.lineTo(X(PEN[1], PEN_R1), Y(PEN_R1) - hh * S(PEN_R1));
      ctx.strokeStyle = INK; ctx.lineWidth = lw + 2.5; ctx.stroke(); ctx.strokeStyle = GALV; ctx.lineWidth = lw; ctx.stroke();
    });
  }
  function drawRaceBack() { put(0, 1.16, 1, () => hurdle(ctx, RACE[0], RACE[1], 0.95)); }
  function drawPenFront() { put(0, PEN_R0, 1, () => hurdle(ctx, PEN[0], 59.6, 1.0)); }
  function drawRaceFront() {
    put(0, 1.0, 1, () => { hurdle(ctx, RACE[0], 62.8, 0.95); hurdle(ctx, 66.2, RACE[1], 0.95); });
    const lw = Math.max(1.5, S(1.1) * 0.05);
    [0.25, 0.5, 0.75, 0.95].forEach((hh) => {
      ctx.beginPath(); ctx.moveTo(X(RACE[1], 1.0), Y(1.0) - hh * S(1.0)); ctx.lineTo(X(RACE[1], 1.16), Y(1.16) - hh * S(1.16));
      ctx.strokeStyle = INK; ctx.lineWidth = lw + 2.5; ctx.stroke(); ctx.strokeStyle = GALV; ctx.lineWidth = lw; ctx.stroke();
    });
  }
  function drawSheep(s) {
    put(s.x, s.r, s.flip ? -1 : 1, () => {
      ctx.translate(0, -s.h - Math.abs(Math.sin(s.hop * PI * 2)) * 0.45 * (s.hop > 0 ? 1 : 0));
      sheepShape(ctx, { ph: s.ph, gait: s.gait, head: s.head, munch: s.munch, foot: s.foot, blue: s.blue });
    });
  }
  function drawTom() {
    const r = TOM_R, s0 = S(r), ox = X(tom.x, r), oy = Y(r);
    const toL = (p) => [-(p.x - ox) / s0, (p.y - oy) / s0];   // screen -> Tom's own units (he faces left)
    const fp = footWorld(), fsc = { x: X(fp.x, fp.r), y: Y(fp.r) - fp.h * S(fp.r) }, foot = toL(fsc);
    const rest0 = [0.2, -0.95], rest1 = [-0.06, -0.92];
    const h1 = [lerp(rest1[0], foot[0], tom.check), lerp(rest1[1], foot[1] - 0.02, tom.check)];
    const sprayAt = [foot[0] - 0.3, foot[1] - 0.14], hold0 = [lerp(rest0[0], 0.3, tom.check), lerp(rest0[1], -1.05, tom.check)];
    const h0 = [lerp(hold0[0], sprayAt[0], tom.spray), lerp(hold0[1], sprayAt[1], tom.spray)];
    put(tom.x, r, -1, () => {
      tomShape(ctx, { walk: tom.walk, stride: tom.stride, bend: tom.bend, hands: [h0, h1] });
      ctx.save(); ctx.translate(h0[0], h0[1]);
      const ang = tom.spray > 0.3 ? Math.atan2(foot[1] - h0[1], foot[0] - h0[0]) : -0.3;
      ctx.rotate(ang); sprayCan(ctx); ctx.restore();
    });
    // where the can is on screen (for the ring and the tap), and its nozzle in the world (for the mist)
    tom.canPt = { x: ox - h0[0] * s0, y: oy + h0[1] * s0 };
    const ang = tom.spray > 0.3 ? Math.atan2(foot[1] - h0[1], foot[0] - h0[0]) : -0.3;
    const nzL = [h0[0] + Math.cos(ang) * 0.17, h0[1] + Math.sin(ang) * 0.17], nz = { x: ox - nzL[0] * s0, y: oy + nzL[1] * s0 };
    const rr = TOM_R + 0.05, wxN = V.x + (nz.x - W / 2) * rr / V.k, hN = (Y(rr) - nz.y) / S(rr);
    const dirX = (fp.x - wxN), dirH = (fp.h - hN), dl = Math.max(0.05, Math.hypot(dirX, dirH));
    tom.nozzle = { x: wxN, h: hN, r: rr, vx: dirX / dl * 1.4, vh: dirH / dl * 1.4 };
  }
  function drawMidge() {
    if (dog) { D.dog(ctx, X(dog.x, dog.r), Y(dog.r) - dog.hop * S(dog.r), S(dog.r) * 1.0, dog.ph, dog.flip, false); return; }
    if (stepId === "foot") D.dog(ctx, X(MIDGE_X, 0.97), Y(0.97), S(0.97) * 1.0, time * 0.3, true, true);
  }
  function drawBlue() {
    put(bt.x, 1, bt.dir, () => blueTractor(ctx, { wheel: bt.wheel, lift: bt.lift, tilt: bt.tilt, fill: bt.fill, time, beacon: !!mo && stepId === "scrape" }));
  }
  function drawPile() {
    if (pile.amt < 0.02) return;
    const amt = stepId === "scrape" && sub === "scoop" ? pile.amt * (1 - bt.fill) : pile.amt;
    if (amt < 0.02) return;
    put(pile.x - pile.w / 2, 1.01, 1, () => {
      const c = ctx, w = pile.w / 2 * (0.5 + 0.5 * amt / Math.max(0.01, pile.amt)), h = 0.2 + 0.6 * Math.sqrt(amt);
      c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(-w * 0.4, -h * 1.3, 0, -h); c.quadraticCurveTo(w * 0.5, -h * 1.2, w, 0); c.closePath(); fs(c, FEEDC[1], Farm.LW);
      for (let i = 0; i < 6; i++) Cc(c, (hash(i, 3) - 0.5) * w * 1.3, -h * (0.2 + 0.5 * hash(i, 4)), 0.06, FEEDC[i % 4], 0);
    });
  }
  function drawRed() {
    if (!rt.vis) return;
    put(rt.x, 1, rt.dir, () => {
      chopper(ctx, { wheel: rt.wheel, spin: rt.spin, bale: rt.bale, on: rt.on });
      D.tractor(ctx, { wheel: rt.wheel, time, beacon: !!mo && stepId === "bed", drawbar: true });
    });
  }
  function drawNumbers() {
    sheep.forEach((s) => {
      if (!s.num) return;
      const sc = S(s.r), x = X(s.x, s.r), y = Y(s.r) - (s.h + 1.25) * sc, age = time - s.numT;
      const rad = Math.max(15, sc * 0.3) * (age < 0.3 ? 1 + 0.5 * Math.sin(PI * age / 0.3) : 1);
      ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fillStyle = "#FFC93C"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.font = "800 " + Math.round(rad * 1.25) + "px 'Baloo 2', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(s.num), x, y + rad * 0.08);
    });
  }
  function drawRing() {
    const p = phase !== "ready" || (drag && drag.kind !== "act") ? null : targetPt(), b = cv.getBoundingClientRect();
    // A new instruction keeps clear of the ringed part (viewport px).
    Farm.avoid(coach, p && p.x, p && p.y);
    if (!p) return;
    Farm.drawRing(ctx, p.x - b.left, p.y - b.top, time, { glow: glow });
  }
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawBackdrop();
    drawShed();
    drawParlor();
    // everything standing on the floor, from the back to the front
    const list = [];
    const L = (r, fn) => list.push([r, fn]);
    if (visible(PEN[0] - 2, RACE[1] + 2, 1)) { L(PEN_R1 + 0.001, drawPenBack); L(PEN_R0, drawPenFront); L(1.16, drawRaceBack); L(1.0, drawRaceFront); }
    if (visible(SHED[0] - 2, SHED[1] + 2, 1)) { L(RBAR, drawBarrier); L(1.25, drawGate); }
    if (visible(PARLOR[0] - 1, PARLOR[1] + 1, 1)) { L(RHL + 0.01, drawPlatform); L(RPF - 0.005, drawPlatformRail); }
    if (visible(HEAP - 4, HEAP + 4, 1)) L(HEAP_R, drawHeap);
    sheep.forEach((s) => { if (onStage(s.x, s.r, 60)) L(s.r, () => drawSheep(s)); });
    L(1.01, drawPile);
    if (onStage(bt.x, 1, 260)) L(1.0, drawBlue);
    L(0.999, drawRed);
    if (stepId === "foot" && onStage(tom.x, TOM_R, 80)) L(TOM_R, drawTom);
    L(dog ? dog.r : 0.97, drawMidge);
    list.sort((p, q) => q[0] - p[0]).forEach((q) => q[1]());
    drawParts();
    drawNumbers();
    if (ending) { ctx.fillStyle = "rgba(20,30,60,0.25)"; ctx.fillRect(0, 0, W, H); }
    drawRing();
  }

  // =====================================================================================================
  // Loop and start
  // =====================================================================================================
  let last = 0;
  function loop(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    if (!(window.Toybox && Toybox.timer.phase() === "resting")) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  function chopperOff(done) { rt.on = false; rt.rate = 0; rt.flow = 0; snd.pour(0); if (done) done(); }
  function onEnding(done) { ending = true; chopperOff(); setTimeout(() => { snd.engine(-1); snd.soil(0); snd.pour(0); done(); }, 2600); }
  function onWake() { ending = false; }

  resetWorld();
  resize();
  bringIn("scrape");
  follow(0, true);
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(stage);
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
    restLine2: "The sheep will be right here next time.",
    restArt: Farm.restArt,
    soundNote: "Soft tractor, scraper and straw chopper sounds. Hold for 2 seconds.",
    onEnding,
    onRest: onWake,
    onWake,
    onSound: (on) => { if (on) snd.chime(); }
  });
  Toybox.offFirst({ running: () => rt.on, off: (done) => chopperOff(done) });
  requestAnimationFrame(loop);

  if (/[?&]debug\b/.test(location.search)) window.__farm = {
    state: () => ({ step: stepId, sub, phase, key: key(), part: (SUB[key()] || {}).part || null, beds, counted, pile: pile.amt, fill: bt.fill, heap: heap.n,
      fresh: fresh.reduce((a, b) => a + b, 0) / NBIN, blue: sheep[0].blue, on: rt.on, bale: rt.bale, coach: coach.text(), parts: parts.length, cam: V.x, k: V.k }),
    tap: (p) => tapPart(p),
    next: () => tapPart((SUB[key()] || {}).part === "queue" ? "sheep" + (queued()[0] || { i: 0 }).i : (SUB[key()] || {}).part === "patient" ? "sheep0" : (SUB[key()] || {}).part || null),
    target: () => targetPt(),
    surprise,
    ghost: () => ghost.show()
  };
})();
