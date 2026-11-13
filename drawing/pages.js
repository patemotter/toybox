"use strict";
// Coloring pages for Drawing's Color job. Each page is line art only, drawn in a 1000 x 1000 box:
//   { id, name, svg }
// `svg` is the inner markup of an <svg viewBox="0 0 1000 1000"> element: black strokes (#1D2340), no fills,
// round joins and caps, stroke width 10 to 14. Every area meant for coloring is closed, so the paint bucket and
// "Stay in the lines" can find it by flood fill on the rendered lines; no gaps wider than 2 units.
// The page script renders the markup to a canvas through an SVG data URL, so no external references.
//
// Drawing rules that keep the pages colorable (tools/drawing-pages-preview.html checks the first two):
// - A line that ends must end on another line, so the areas it bounds stay closed.
// - Every closed area is at least 30 units across; parallel lines sit at least 45 apart (12 of stroke plus room).
// - Without fills nothing can hide what is behind it, so a part in front (a wheel over the frame) is drawn whole
//   and the lines behind it stop where they meet its outline. Shapes never overlap by a little: the sliver
//   between them would be a crumb too small to color.
(function () {
  const OPEN = '<g fill="none" stroke="#1D2340" stroke-width="12" stroke-linejoin="round" stroke-linecap="round">';
  const page = (...parts) => OPEN + parts.join("") + "</g>";
  const n1 = v => Math.round(v * 10) / 10;
  const rad = deg => deg * Math.PI / 180;
  const at = (cx, cy, r, deg) => n1(cx + r * Math.cos(rad(deg))) + " " + n1(cy + r * Math.sin(rad(deg)));
  const circle = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  const rect = (x, y, w, h, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ""}/>`;
  const path = d => `<path d="${d}"/>`;

  // A toothed outline (gears, water wheel paddles): `n` teeth, tips on radius `ro`, roots on radius `ri`, the
  // first tooth centered at angle `phase` (degrees, clockwise from the right). Each tooth is `tipW` units wide
  // at its tip and `rootW` wide at its root.
  function toothed(cx, cy, n, ro, ri, phase, tipW, rootW) {
    const step = 360 / n;
    const tip = tipW / 2 / ro * 180 / Math.PI, root = rootW / 2 / ri * 180 / Math.PI;
    let d = "";
    for (let k = 0; k < n; k++) {
      const a = phase + k * step;
      d += (k ? " L" : "M") + at(cx, cy, ri, a - root) +
        " L" + at(cx, cy, ro, a - tip) +
        ` A${n1(ro)} ${n1(ro)} 0 0 1 ` + at(cx, cy, ro, a + tip) +
        " L" + at(cx, cy, ri, a + root) +
        ` A${n1(ri)} ${n1(ri)} 0 0 1 ` + at(cx, cy, ri, a + step - root);
    }
    return path(d + " Z");
  }

  // `n` straight lines from radius r1 to radius r2 (tire treads, spokes).
  function radial(cx, cy, r1, r2, n, phase) {
    let d = "";
    for (let k = 0; k < n; k++) {
      const a = phase + k * 360 / n;
      d += "M" + at(cx, cy, r1, a) + " L" + at(cx, cy, r2, a) + " ";
    }
    return path(d.trim());
  }

  // ---------- Tractor ----------
  // Side view facing right. The rear wheel is in front of the cab and the front wheel in front of the hood, so
  // the cab, fender and hood lines stop on the wheels.
  const tractor = page(
    rect(40, 850, 920, 90, 30),
    rect(170, 130, 340, 60, 18),
    path("M305 130 V110 Q305 76 340 76 Q375 76 375 110 V130"),
    path("M200 190 V521.4"),
    path("M480 190 V543.4"),
    path("M200 458.3 A240 240 0 0 1 480 472.7"),
    rect(245, 235, 190, 130, 16),
    path("M480 400 H865 Q890 400 890 425 V670 H875.1"),
    path("M519.7 670 H705"),
    path("M800 400 V630.5"),
    circle(845, 455, 22),
    path("M715 400 V282 Q715 256 740 256 Q765 256 765 282 V400"),
    circle(795, 196, 28), circle(848, 134, 36), circle(912, 70, 44),
    path("M506.6 730 H680.5"),
    circle(330, 660, 190), circle(330, 660, 125), circle(330, 660, 50),
    radial(330, 660, 160, 190, 14, 0),
    circle(790, 740, 110), circle(790, 740, 66), circle(790, 740, 26)
  );

  // ---------- Excavator ----------
  // Side view facing right: tracks, the turntable, the house with the cab, then the boom (in front of the cab's
  // corner), the stick (behind the boom's tip) and the bucket over a pile of dirt.
  const excavator = page(
    rect(40, 860, 920, 80, 30),
    path("M700 860 Q790 770 900 860"),
    rect(80, 700, 520, 160, 80),
    circle(160, 780, 46), circle(520, 780, 46),
    circle(262, 810, 26), circle(340, 810, 26), circle(418, 810, 26),
    rect(250, 655, 180, 45),
    path("M110 655 V585 Q110 545 150 545 H560 V655 Z"),
    path("M185 548 V494 Q185 476 208 476 Q231 476 231 494 V548"),
    path("M360 545 V355 Q360 330 385 330 H500 Q515 330 522 345 L560 430 V545"),
    path("M405 380 H488 L515 440 V500 H405 Z"),
    path("M541.9 389.6 L708.2 192.4 A35 35 0 0 1 761.8 237.6 L560 477"),
    path("M769.3 221.7 L879.2 524.9"),
    path("M726.5 279.4 L822.8 545.3"),
    circle(860, 560, 40),
    path("M894.6 580 C935 650 915 745 845 772 L805 782 L812 755 L775 762 L785 736 L750 740 Q775 665 831.7 588.3")
  );

  // ---------- Rocket ----------
  // Lifting off the launch pad: flame under the nozzle, smoke clouds on the pad, the tower on the right.
  const rocket = page(
    rect(120, 905, 760, 50, 20),
    path("M500 60 C570 120 600 200 600 300 V640 H400 V300 C400 200 430 120 500 60 Z"),
    path("M400 300 H600"),
    circle(500, 400, 50), circle(500, 535, 38),
    path("M400 470 L310 600 Q295 622 295 645 V705 L400 640"),
    path("M600 470 L690 600 Q705 622 705 645 V705 L600 640"),
    path("M445 640 L425 715 H575 L555 640"),
    path("M425 715 Q380 795 440 830 Q458 878 500 888 Q542 878 560 830 Q620 795 575 715"),
    path("M500 745 C555 785 540 825 500 838 C460 825 445 785 500 745 Z"),
    path("M150 905 A40 40 0 0 1 200 855 A55 55 0 0 1 300 835 A45 45 0 0 1 380 875 A30 30 0 0 1 400 905"),
    path("M600 905 A30 30 0 0 1 625 870 A45 45 0 0 1 700 835 A50 50 0 0 1 790 875 V905"),
    path("M820 905 V260 H890 V905 M820 380 H890 M820 500 H890 M820 620 H890 M820 740 H890"),
    circle(180, 170, 70),
    circle(320, 300, 24), circle(130, 420, 24), circle(720, 140, 24),
    path("M860 60 L878 108 L928 110 L888 140 L902 190 L860 160 L818 190 L832 140 L792 110 L842 108 Z")
  );

  // ---------- Train ----------
  // A steam engine facing right with a coach behind it, on a rail with sleepers.
  const sleepers = [];
  for (let x = 50; x < 960; x += 110) sleepers.push(rect(x, 850, 60, 45, 6));
  const train = page(
    rect(30, 800, 940, 50, 14),
    sleepers.join(""),
    // Coach.
    rect(35, 380, 380, 45, 18),
    path("M50 425 V675 Q50 690 65 690 H385 Q400 690 400 675 V425"),
    rect(95, 470, 105, 100, 12), rect(250, 470, 105, 100, 12),
    path("M50 620 H400"),
    circle(130, 745, 55), circle(320, 745, 55),
    path("M400 625 H460 M400 670 H460"),
    // Engine: cab, boiler, smokebox, chimney, dome, frame and wheels.
    rect(440, 330, 180, 45, 16),
    path("M460 375 V690 H600 V375"),
    rect(505, 420, 50, 100, 10),
    path("M600 460 H870 V640 H600"),
    path("M680 460 V640 M760 460 V640"),
    path("M870 460 H905 Q925 460 925 480 V620 Q925 640 905 640 H870"),
    path("M790 463 V400 L770 350 H870 L850 400 V463"),
    path("M690 463 Q690 410 720 410 Q750 410 750 463"),
    path("M600 640 H930 V690 H897.4 M782.6 690 H737.4 M622.6 690 H600"),
    circle(680, 730, 70), circle(680, 730, 24), circle(840, 730, 70), circle(840, 730, 24),
    circle(530, 755, 45),
    circle(790, 280, 42), circle(700, 215, 50), circle(575, 160, 55),
    circle(150, 160, 70),
    radial(150, 160, 95, 135, 8, 0)
  );

  // ---------- Gears ----------
  // Four meshing gears on a board. Tooth spacing matches on every gear, each pair is turned so a tooth of one
  // faces a gap of the other, and the centers sit a little farther apart than a tight mesh so outlines never touch.
  const holes = (cx, cy, ring, r, n, phase) => {
    let out = "";
    for (let k = 0; k < n; k++) {
      const a = rad(phase + k * 360 / n);
      out += circle(n1(cx + ring * Math.cos(a)), n1(cy + ring * Math.sin(a)), r);
    }
    return out;
  };
  // Teeth are spaced 110 apart on each gear's pitch circle; pitch radius = 110 * teeth / (2 * pi), tips 26
  // outside it and roots 30 inside. Centers are 16 farther apart than the two pitch radii.
  const gear = (cx, cy, n, phase) => {
    const rp = 110 * n / (2 * Math.PI);
    return toothed(cx, cy, n, rp + 26, rp - 30, phase, 30, 46);
  };
  const gears = page(
    rect(25, 130, 950, 770, 30),
    circle(65, 170, 24), circle(935, 170, 24), circle(65, 860, 24), circle(935, 860, 24),
    gear(310, 620, 12, -50),
    circle(310, 620, 34), holes(310, 620, 115, 34, 5, -90),
    gear(545.4, 339.5, 8, 152.5),
    circle(545.4, 339.5, 28), holes(545.4, 339.5, 68, 24, 4, 45),
    gear(794.4, 418, 6, 227.5),
    circle(794.4, 418, 28),
    gear(636.1, 677.5, 6, 220),
    circle(636.1, 677.5, 28)
  );

  // ---------- 3D printer ----------
  // The enclosed printer from the front with its glass door, a boat print on the bed and the toolhead on its
  // rail. The AMS sits on top with its four spools side by side behind the lid. No logos or text.
  const spools = [0, 1, 2, 3].map(i => rect(n1(294.2 + i * 115.2), 180, 66, 75, 14)).join("");
  const printer = page(
    rect(60, 880, 880, 70, 24),
    path("M200 325 V132 Q200 110 222 110 H778 Q800 110 800 132 V325"),
    rect(245, 155, 510, 125, 12),
    spools,
    path("M180 880 V349 Q180 325 204 325 H796 Q820 325 820 349 V880"),
    rect(225, 370, 550, 420, 14),
    path("M225 425 H775"),
    path("M640 425 V495 L670 520 H700 L730 495 V425"),
    path("M310 690 H690 L720 740 H280 Z"),
    path("M400 690 L375 625 H625 L600 690"),
    rect(450, 545, 120, 80, 10),
    path("M515 545 V500 H561 V545"),
    rect(250, 815, 140, 46, 10)
  );

  // ---------- Water table ----------
  // The tub on its legs with water inside, a cup, a ball and a boat floating; on the board behind, a funnel and a
  // bowl pour onto two water wheels. Each stream lands on the top paddle of its wheel.
  const waterTable = page(
    rect(40, 900, 920, 50, 20),
    rect(150, 70, 700, 380, 20),
    path("M190 100 H410 L325 170 V200 H275 V170 Z"),
    path("M278 200 V251.3 M322 200 V251.3"),
    toothed(300, 345, 6, 95, 66, -90, 50, 25),
    radial(300, 345, 22, 66, 6, -60),
    circle(300, 345, 22),
    path("M560 100 H800 Q795 165 705 175 V200 H655 V175 Q565 165 560 100 Z"),
    path("M658 200 V252.6 M702 200 V252.6"),
    toothed(680, 345, 6, 95, 66, -90, 50, 25),
    radial(680, 345, 22, 66, 6, -60),
    circle(680, 345, 22),
    rect(80, 450, 840, 210, 30),
    rect(125, 495, 750, 120, 20),
    path("M110 660 L150 770 H850 L890 660"),
    path("M170 770 V900 H230 V770 M770 770 V900 H830 V770"),
    path("M230 850 H770"),
    path("M215 590 L195 540 H240 V512 H300 V540 H345 L325 590 Z"),
    path("M560 595 L545 520 H655 L640 595 Z"),
    circle(770, 555, 36)
  );

  // ---------- Garbage truck ----------
  // An automated side loader facing right: the body with its tailgate, the arm housing between body and cab,
  // and the arm's gripper holding a bin at the curb in front of the truck.
  const garbageTruck = page(
    rect(40, 860, 920, 80, 30),
    path("M110 655 V340 Q110 300 150 300 H550 V555"),
    path("M190 300 V655 M320 300 V655 M440 300 V655"),
    path("M550 555 V400 H650 V555"),
    path("M650 555 V340 Q650 300 690 300 H805 Q835 300 848 330 L895 455 V655"),
    path("M700 350 H800 L835 445 H700 Z"),
    path("M705 300 V287 Q705 252 742 252 Q779 252 779 287 V300"),
    // The frame stops at the bin's sides; the bin stands in front of it.
    path("M110 655 H513.8 M686.2 655 H905 V710 H682.4 M517.6 710 H110 V655"),
    rect(500, 555, 200, 45, 10),
    path("M510 600 L518 715 M690 600 L682 715"),
    rect(490, 715, 220, 55, 16),
    path("M521.8 770 L528 860 H672 L678.2 770"),
    circle(230, 785, 75), circle(230, 785, 30),
    circle(400, 785, 75), circle(400, 785, 30),
    circle(800, 785, 75), circle(800, 785, 30)
  );

  // ---------- Marble run ----------
  // Two posts on a base with four ramps zigzagging between them, a funnel on top, marbles rolling on the ramps
  // and dropping through the gaps, and a tray of marbles at the bottom.
  const ramp = (yHigh, fromLeft) => {
    // A band 48 tall dropping 60 from the post to its rounded free end, leaving a gap for the marbles to drop.
    const low = yHigh + 60;
    return fromLeft
      ? path(`M230 ${yHigh} L640 ${low} A24 24 0 0 1 640 ${low + 48} L230 ${yHigh + 48}`)
      : path(`M770 ${yHigh} L360 ${low} A24 24 0 0 0 360 ${low + 48} L770 ${yHigh + 48}`);
  };
  // A marble resting on a ramp's top edge at x. It sits a little into the edge's stroke, so the two lines
  // merge instead of touching at one point and leaving a speck between them.
  const onRamp = (yHigh, fromLeft, x) => {
    const y = yHigh + 60 * (fromLeft ? x - 230 : 770 - x) / 410;
    return circle(x, n1(y - 24 * Math.hypot(410, 60) / 410), 30);
  };
  const marbleRun = page(
    rect(120, 860, 760, 80, 24),
    rect(170, 110, 60, 750, 16), rect(770, 110, 60, 750, 16),
    ramp(200, true), ramp(340, false), ramp(480, true), ramp(620, false),
    path("M260 30 H460 L385 105 V135 H335 V105 Z"),
    onRamp(200, true, 360), onRamp(200, true, 520),
    circle(717, 285, 30),
    onRamp(340, false, 480),
    circle(283, 425, 30),
    onRamp(480, true, 560),
    onRamp(620, false, 520),
    rect(250, 760, 350, 100, 16),
    circle(330, 810, 28), circle(420, 810, 28), circle(510, 810, 28)
  );

  window.DrawingPages = [
    { id: "tractor", name: "Tractor", svg: tractor },
    { id: "excavator", name: "Excavator", svg: excavator },
    { id: "rocket", name: "Rocket", svg: rocket },
    { id: "train", name: "Train", svg: train },
    { id: "gears", name: "Gears", svg: gears },
    { id: "printer", name: "3D printer", svg: printer },
    { id: "water-table", name: "Water table", svg: waterTable },
    { id: "garbage-truck", name: "Garbage truck", svg: garbageTruck },
    { id: "marble-run", name: "Marble run", svg: marbleRun }
  ];
})();
