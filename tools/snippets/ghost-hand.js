// The ghost hand now lives in common/toybox.js: new and migrated pages call
//   var ghost = Toybox.ghost({ plan: function () { return { pts: [[x, y]], tap: true, key: "pour" }; } });
//   ghost.learned("pour");   // he did it himself: never again this visit
// (API in the header of common/toybox.js; the look is in common/toybox.css, "Ghost hand"). Delete the page's pasted
// copy when the page moves to the shared components (plans/redesign.md 2.6).
// This file is the old pasted copy, kept for reference while pages that still carry it are migrated; keep its look
// identical to common/ if you touch it.
  // ---------- Ghost hand (same look in every app) ----------
  // After a few quiet seconds, a see-through hand shows the main move once. A touch re-arms it, it shows
  // at most twice per visit, and never again once the child has done the move (ghost.learned()).
  // plan() returns { pts: [[x, y], ...] in page px, tap: true for a tap, carry: { html, size } for a see-through
  // thing under the finger (a gear being dragged), dur: ms } or null when there is nothing to show.
  function makeGhost(plan, opt) {
    opt = opt || {};
    var IDLE = opt.idle || 4500, MAX = opt.max || 2;
    var last = Date.now(), shown = 0, armed = true, learned = false, run = null, el = null;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
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
    var carryEl = document.createElement("div");
    carryEl.className = "gh-carry";
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
      if (p.carry) {
        var c = p.carry.size;
        carryEl.style.cssText = "position:absolute;left:" + (24 * s - c / 2) + "px;top:" + (18 * s - c / 2) + "px;width:" + c + "px;height:" + c + "px";
      }
      run = { p: p, s: s, t0: Date.now(), dur: p.dur || (p.tap ? 2400 : 3200) };
      requestAnimationFrame(frame);
    }
    setInterval(function () {
      if (run || learned || !armed || shown >= MAX || Date.now() - last < IDLE) return;
      if (blocked()) { last = Date.now(); return; }
      var p = plan();
      if (!p || !p.pts || !p.pts.length) return;
      armed = false; shown++;
      show(p);
    }, 250);
    return {
      learned: function () { learned = true; stop(); },
      // something new to show (a new mode): allow the hint again
      again: function () { learned = false; shown = 0; armed = true; last = Date.now(); },
      poke: poke,
      // test hook: show it now
      show: function () { var p = plan(); if (p) show(p); return !!p; }
    };
  }
  // Page px of a point inside an element, as fractions of its box.
  function ghostPt(elm, fx, fy) {
    var r = elm.getBoundingClientRect();
    return [r.left + r.width * fx, r.top + r.height * fy];
  }
