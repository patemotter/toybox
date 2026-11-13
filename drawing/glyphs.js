"use strict";
// Stroke data for Drawing's Write job: A-Z, a-z, 0-9 and the apostrophe.
// Coordinates are in a unit box: y = 0 is the cap height and the top of tall lowercase letters, y = 0.45 is the
// x-height (the top of a, c, e...), y = 1 is the baseline, and descenders (g, j, p, q, y) reach y = 1.35.
// x runs from 0 to the glyph's advance width `w`.
// Each glyph is { w, strokes }, where `strokes` lists the strokes in the order a child is taught to write them,
// and each stroke is a polyline [[x, y], ...] in the direction the pencil moves, with points no more than 0.04
// apart so curves are smooth. Strokes start at the top; circles and the c stroke go counterclockwise.
//
// The letter forms are simple vertical print (plain sticks and circles, single-story a and g), formed the way
// Learning Without Tears teaches them: capitals by their starting place (frog-jump letters draw the stem, then
// jump back to the top), lowercase a, d, g, q from the c stroke, and n, m, r, h, b, p back up their stem. A stroke
// may run back over itself where the pencil does (n goes down, then back up the same line before the arch).
// The strokes are built once at load from lines and elliptical arcs; the result is plain arrays.
(function () {
  const STEP = 0.035;
  const r3 = (v) => Math.round(v * 1000) / 1000;

  // A straight segment from (x1, y1) to (x2, y2).
  const L = (x1, y1, x2, y2) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / STEP));
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
    return pts;
  };

  // An elliptical arc from angle a0 to a1 in degrees. Angles are measured as on a clock face drawn in math
  // convention: 0 is 3 o'clock, 90 is 12 o'clock, 180 is 9 o'clock. Since y grows downward, a growing angle
  // moves counterclockwise on screen and a shrinking one moves clockwise.
  const A = (cx, cy, rx, ry, a0, a1) => {
    const len = Math.max(rx, ry) * Math.abs(a1 - a0) * Math.PI / 180;
    const n = Math.max(1, Math.ceil(len / STEP));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      pts.push([cx + rx * Math.cos(t), cy - ry * Math.sin(t)]);
    }
    return pts;
  };

  // Joins segments into one stroke. A gap between the end of one segment and the start of the next is bridged
  // with a straight line, so every stroke stays continuous.
  const S = (...segs) => {
    const out = [];
    for (const seg of segs) {
      if (out.length) {
        const [px, py] = out[out.length - 1];
        const [qx, qy] = seg[0];
        if (Math.hypot(qx - px, qy - py) > 1e-6) out.push(...L(px, py, qx, qy).slice(1));
        out.push(...seg.slice(1));
      } else {
        out.push(...seg);
      }
    }
    return out.map(([x, y]) => [r3(x), r3(y)]);
  };

  // A polyline through the given corners, sampled finely.
  const P = (...c) => S(...c.slice(1).map((q, i) => L(c[i][0], c[i][1], q[0], q[1])));

  // The tiny last stroke that dots i and j.
  const dot = (x) => P([x, 0.23], [x, 0.27]);

  // The lowercase c stroke and the bowls of a, d, g, q: one ellipse filling the x-height zone.
  const BOWL_Y = 0.725, BOWL_RY = 0.275;

  const g = {};

  // The frog-jump capitals F, E, D, P, B, R, N and M draw the stem first, then jump back to the top.
  g.F = { w: 0.64, strokes: [P([0.1, 0], [0.1, 1]), P([0.1, 0], [0.58, 0]), P([0.1, 0.48], [0.5, 0.48])] };
  g.E = { w: 0.68, strokes: [P([0.1, 0], [0.1, 1]), P([0.1, 0], [0.6, 0]), P([0.1, 0.5], [0.52, 0.5]),
    P([0.1, 1], [0.6, 1])] };
  g.D = { w: 0.8, strokes: [P([0.1, 0], [0.1, 1]),
    S(L(0.1, 0, 0.32, 0), A(0.32, 0.5, 0.38, 0.5, 90, -90), L(0.32, 1, 0.1, 1))] };
  g.P = { w: 0.7, strokes: [P([0.1, 0], [0.1, 1]),
    S(L(0.1, 0, 0.34, 0), A(0.34, 0.27, 0.27, 0.27, 90, -90), L(0.34, 0.54, 0.1, 0.54))] };
  g.B = { w: 0.7, strokes: [P([0.1, 0], [0.1, 1]),
    S(L(0.1, 0, 0.33, 0), A(0.33, 0.235, 0.24, 0.235, 90, -90), L(0.33, 0.47, 0.1, 0.47),
      L(0.1, 0.47, 0.36, 0.47), A(0.36, 0.735, 0.26, 0.265, 90, -90), L(0.36, 1, 0.1, 1))] };
  g.R = { w: 0.72, strokes: [P([0.1, 0], [0.1, 1]),
    S(L(0.1, 0, 0.34, 0), A(0.34, 0.27, 0.27, 0.27, 90, -90), L(0.34, 0.54, 0.1, 0.54), L(0.1, 0.54, 0.64, 1))] };
  g.N = { w: 0.8, strokes: [P([0.1, 0], [0.1, 1]), P([0.1, 0], [0.7, 1], [0.7, 0])] };
  g.M = { w: 0.92, strokes: [P([0.1, 0], [0.1, 1]), P([0.1, 0], [0.46, 0.6], [0.82, 0], [0.82, 1])] };

  // The capitals H, K, L, U, V, W, X, Y and Z start at the top-left corner.
  g.H = { w: 0.8, strokes: [P([0.1, 0], [0.1, 1]), P([0.7, 0], [0.7, 1]), P([0.1, 0.5], [0.7, 0.5])] };
  g.K = { w: 0.72, strokes: [P([0.1, 0], [0.1, 1]), P([0.64, 0], [0.11, 0.53], [0.66, 1])] };
  g.L = { w: 0.62, strokes: [P([0.1, 0], [0.1, 1]), P([0.1, 1], [0.56, 1])] };
  g.U = { w: 0.8, strokes: [S(L(0.1, 0, 0.1, 0.66), A(0.4, 0.66, 0.3, 0.34, 180, 360), L(0.7, 0.66, 0.7, 0))] };
  g.V = { w: 0.8, strokes: [P([0.08, 0], [0.4, 1], [0.72, 0])] };
  g.W = { w: 1.0, strokes: [P([0.06, 0], [0.28, 1], [0.5, 0], [0.72, 1], [0.94, 0])] };
  g.X = { w: 0.76, strokes: [P([0.08, 0], [0.68, 1]), P([0.68, 0], [0.08, 1])] };
  g.Y = { w: 0.8, strokes: [P([0.08, 0], [0.4, 0.5]), P([0.72, 0], [0.4, 0.5], [0.4, 1])] };
  g.Z = { w: 0.76, strokes: [P([0.08, 0], [0.68, 0], [0.08, 1], [0.68, 1])] };

  // The capitals C, O, Q, G, S, A, I, T and J start at the top center.
  g.C = { w: 0.84, strokes: [S(A(0.45, 0.5, 0.37, 0.5, 60, 305))] };
  g.O = { w: 0.92, strokes: [S(A(0.46, 0.5, 0.38, 0.5, 90, 452))] };
  g.Q = { w: 0.92, strokes: [S(A(0.46, 0.5, 0.38, 0.5, 90, 452)), P([0.5, 0.7], [0.84, 1.02])] };
  g.G = { w: 0.88, strokes: [S(A(0.45, 0.5, 0.37, 0.5, 60, 330), L(0.77, 0.75, 0.77, 0.56), L(0.77, 0.56, 0.5, 0.56))] };
  g.S = { w: 0.72, strokes: [S(A(0.36, 0.25, 0.25, 0.25, 40, 270), A(0.36, 0.75, 0.27, 0.25, 90, -140))] };
  g.A = { w: 0.8, strokes: [P([0.4, 0], [0.08, 1]), P([0.4, 0], [0.72, 1]), P([0.2, 0.62], [0.6, 0.62])] };
  g.I = { w: 0.6, strokes: [P([0.3, 0], [0.3, 1]), P([0.08, 0], [0.52, 0]), P([0.08, 1], [0.52, 1])] };
  g.T = { w: 0.76, strokes: [P([0.38, 0], [0.38, 1]), P([0.08, 0], [0.68, 0])] };
  g.J = { w: 0.74, strokes: [S(L(0.48, 0, 0.48, 0.72), A(0.29, 0.72, 0.19, 0.28, 0, -160)), P([0.18, 0], [0.7, 0])] };

  // The lowercase c, o, a, d, g and q start with the c stroke, and e ends with it.
  g.c = { w: 0.6, strokes: [S(A(0.31, BOWL_Y, 0.24, BOWL_RY, 50, 315))] };
  g.o = { w: 0.64, strokes: [S(A(0.32, BOWL_Y, 0.25, BOWL_RY, 60, 422))] };
  const cStroke = () => A(0.32, BOWL_Y, 0.25, BOWL_RY, 50, 350);
  g.a = { w: 0.66, strokes: [S(cStroke(), L(0.57, 0.45, 0.57, 1))] };
  g.d = { w: 0.66, strokes: [S(cStroke(), L(0.57, 0, 0.57, 1))] };
  g.g = { w: 0.66, strokes: [S(cStroke(), L(0.57, 0.45, 0.57, 1.13), A(0.38, 1.13, 0.19, 0.21, 0, -160))] };
  g.q = { w: 0.66, strokes: [S(cStroke(), L(0.57, 0.45, 0.57, 1.35))] };
  g.e = { w: 0.62, strokes: [S(L(0.07, BOWL_Y, 0.55, BOWL_Y), A(0.31, BOWL_Y, 0.24, BOWL_RY, 0, 318))] };

  // The lowercase b and p go down the stem, then back up it and around.
  const bump = (top, bottom) => S(L(0.1, top, 0.1, bottom), L(0.1, bottom, 0.1, 0.63),
    A(0.35, BOWL_Y, 0.25, BOWL_RY, 160, -180));
  g.b = { w: 0.68, strokes: [bump(0, 1)] };
  g.p = { w: 0.68, strokes: [bump(0.45, 1.35)] };

  // The diving letters n, m, r and h go down the stem, then back up the same line and over.
  const arch = (cx, rx) => A(cx, 0.67, rx, 0.22, 180, 0);
  g.n = { w: 0.66, strokes: [S(L(0.1, 0.45, 0.1, 1), L(0.1, 1, 0.1, 0.67), arch(0.33, 0.23), L(0.56, 0.67, 0.56, 1))] };
  g.h = { w: 0.66, strokes: [S(L(0.1, 0, 0.1, 1), L(0.1, 1, 0.1, 0.67), arch(0.33, 0.23), L(0.56, 0.67, 0.56, 1))] };
  g.m = { w: 0.88, strokes: [S(L(0.1, 0.45, 0.1, 1), L(0.1, 1, 0.1, 0.67), arch(0.27, 0.17), L(0.44, 0.67, 0.44, 1),
    L(0.44, 1, 0.44, 0.67), arch(0.61, 0.17), L(0.78, 0.67, 0.78, 1))] };
  g.r = { w: 0.54, strokes: [S(L(0.1, 0.45, 0.1, 1), L(0.1, 1, 0.1, 0.67), A(0.31, 0.67, 0.21, 0.22, 180, 40))] };

  // These are the rest of the lowercase letters.
  g.u = { w: 0.64, strokes: [S(L(0.1, 0.45, 0.1, 0.77), A(0.32, 0.77, 0.22, 0.23, 180, 360), L(0.54, 0.77, 0.54, 0.45),
    L(0.54, 0.45, 0.54, 1))] };
  g.s = { w: 0.56, strokes: [S(A(0.28, 0.5875, 0.19, 0.1375, 40, 270), A(0.28, 0.8625, 0.21, 0.1375, 90, -140))] };
  g.v = { w: 0.58, strokes: [P([0.07, 0.45], [0.29, 1], [0.51, 0.45])] };
  g.w = { w: 0.8, strokes: [P([0.06, 0.45], [0.22, 1], [0.4, 0.45], [0.58, 1], [0.74, 0.45])] };
  g.x = { w: 0.58, strokes: [P([0.08, 0.45], [0.5, 1]), P([0.5, 0.45], [0.08, 1])] };
  g.y = { w: 0.6, strokes: [P([0.07, 0.45], [0.3, 0.98]), P([0.53, 0.45], [0.14, 1.35])] };
  g.z = { w: 0.58, strokes: [P([0.08, 0.45], [0.5, 0.45], [0.08, 1], [0.5, 1])] };
  g.k = { w: 0.6, strokes: [P([0.1, 0], [0.1, 1]), P([0.5, 0.45], [0.11, 0.74], [0.52, 1])] };
  g.l = { w: 0.26, strokes: [P([0.13, 0], [0.13, 1])] };
  g.i = { w: 0.26, strokes: [P([0.13, 0.45], [0.13, 1]), dot(0.13)] };
  g.j = { w: 0.48, strokes: [S(L(0.35, 0.45, 0.35, 1.13), A(0.18, 1.13, 0.17, 0.21, 0, -165)), dot(0.35)] };
  g.t = { w: 0.5, strokes: [P([0.24, 0.12], [0.24, 1]), P([0.06, 0.45], [0.44, 0.45])] };
  g.f = { w: 0.52, strokes: [S(A(0.36, 0.17, 0.13, 0.15, 30, 180), L(0.23, 0.17, 0.23, 1)), P([0.06, 0.45], [0.46, 0.45])] };

  // Digits. Every digit starts at the top.
  g["0"] = { w: 0.66, strokes: [S(A(0.33, 0.5, 0.25, 0.5, 90, 452))] };
  g["1"] = { w: 0.42, strokes: [P([0.21, 0], [0.21, 1])] };
  g["2"] = { w: 0.66, strokes: [S(A(0.33, 0.27, 0.24, 0.27, 160, -35), L(0.527, 0.425, 0.08, 1), L(0.08, 1, 0.6, 1))] };
  g["3"] = { w: 0.64, strokes: [S(A(0.3, 0.24, 0.22, 0.24, 150, -90), A(0.3, 0.74, 0.25, 0.26, 90, -150))] };
  g["4"] = { w: 0.68, strokes: [P([0.1, 0], [0.1, 0.62], [0.62, 0.62]), P([0.48, 0], [0.48, 1])] };
  g["5"] = { w: 0.66, strokes: [S(L(0.16, 0, 0.16, 0.47), A(0.34, 0.69, 0.25, 0.29, 128, -140)), P([0.16, 0], [0.58, 0])] };
  g["6"] = { w: 0.66, strokes: [S(A(0.4, 0.6, 0.3, 0.58, 75, 180), L(0.1, 0.6, 0.1, 0.74), A(0.34, 0.74, 0.24, 0.26, 180, 530))] };
  g["7"] = { w: 0.66, strokes: [P([0.08, 0], [0.6, 0], [0.24, 1])] };
  // The 8 is a figure-eight curve (a lemniscate of Gerono): it starts at about 1 o'clock on the top loop, goes
  // over the top to the left, down through the middle like an S, around the bottom and back up through the middle.
  const eight = [];
  for (let t = -0.6; t <= 2 * Math.PI - 0.5 + 1e-9; t += 0.03) {
    eight.push([0.33 - 0.5 * Math.sin(t) * Math.cos(t), 0.5 - 0.5 * Math.cos(t)]);
  }
  g["8"] = { w: 0.66, strokes: [S(eight)] };
  g["9"] = { w: 0.64, strokes: [S(A(0.32, 0.27, 0.22, 0.27, 30, 390), L(0.511, 0.135, 0.511, 1))] };

  g["'"] = { w: 0.24, strokes: [P([0.13, 0], [0.11, 0.22])] };

  window.DrawingGlyphs = {
    metrics: { cap: 0, xHeight: 0.45, baseline: 1, descender: 1.35 },
    glyphs: g
  };
})();
