(function () {
  "use strict";
  // Christmas: the app's front page. A snowy evening with the five Christmas stations standing in the snow, each
  // with a white button under it: the Tree (lights and ornaments), the Snowman, Presents (pick, wrap, open),
  // Snowflakes (fold and cut paper) and Cookies (sugar and gingerbread cookies and a gingerbread house).
  // Tapping a station, or its button, hops it and goes there. The map is a free choice, so it has no
  // instruction line and no idle hand pointing at one station. Snow falls calmly and the tree's lights twinkle.
  // No station pictures have faces: the snowman and the gingerbread person only get faces when he makes them.
  // Each station is drawn in a 300 x 340 tile standing on the snow at y = 270; the tiles are laid out in one,
  // two or three rows, whichever gives the biggest pictures for the stage's shape.
  //
  // Sections:
  //   Setup
  //   SVG helpers
  //   Station pictures
  //   Layout and drawing the evening
  //   Going to a station
  //   Timer
  //   Start and debug hook

  // =====================================================================================================
  // Setup
  // =====================================================================================================
  const $ = (id) => document.getElementById(id);
  const mapSvg = $("map"), stage = $("stage"), sbtns = $("sbtns");
  const reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const rand = (a, b) => a + Math.random() * (b - a);
  const locked = () => Toybox.timer.locked();
  const STATIONS = [
    { id: "tree", label: "Tree" },
    { id: "snowman", label: "Snowman" },
    { id: "presents", label: "Presents" },
    { id: "snowflakes", label: "Snowflakes" },
    { id: "cookies", label: "Cookies" }
  ];

  // =====================================================================================================
  // SVG helpers
  // =====================================================================================================
  const INK = "#1D2340";
  const f1 = (v) => Number(v).toFixed(1);
  const P = (d, fill, sw, extra) => `<path d="${d}" fill="${fill || "none"}" stroke="${INK}" stroke-width="${sw == null ? 4 : sw}" stroke-linejoin="round" stroke-linecap="round"${extra || ""}/>`;
  const S = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
  const Rc = (x, y, w, h, rx, fill, sw, extra) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx || 0}" fill="${fill}" stroke="${INK}" stroke-width="${sw == null ? 4 : sw}"${extra || ""}/>`;
  const C = (cx, cy, r, fill, sw, extra) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw == null ? 4 : sw}"${extra || ""}/>`;
  const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(60,80,130,0.22)"/>`;
  function starPath(x, y, r, inner) {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * (inner || 0.45) : r;
      d += (i ? "L" : "M") + f1(x + Math.cos(a) * rr) + " " + f1(y + Math.sin(a) * rr);
    }
    return d + "Z";
  }

  // =====================================================================================================
  // Station pictures (each in a 300 x 340 tile, standing on y = 270; icon = the small version for buttons)
  // =====================================================================================================
  function treeArt(icon) {
    let o = shadow(150, 272, 96, 8);
    o += Rc(134, 236, 32, 36, 4, "#8A5A2B", 4);
    if (!icon) o += Rc(112, 258, 76, 18, 5, "#E63946", 4);
    o += P("M150 40 L208 116 L184 116 L234 182 L206 182 L258 248 L42 248 L94 182 L66 182 L116 116 L92 116 Z", "#2E9E5B", 4);
    o += S("M104 132 Q150 156 196 128", "rgba(29,35,64,0.55)", 3) + S("M84 198 Q150 226 218 194", "rgba(29,35,64,0.55)", 3);
    const lights = [[112, 136, "#FF4D5E"], [150, 146, "#FFC93C"], [190, 134, "#3A86FF"], [92, 204, "#FF6FB5"], [130, 216, "#7ED957"], [172, 216, "#FFC93C"], [210, 200, "#FF4D5E"], [150, 90, "#3A86FF"]];
    lights.forEach((l, i) => {
      if (!icon) o += `<circle cx="${l[0]}" cy="${l[1]}" r="15" fill="${l[2]}" opacity="0.35" class="glow" style="animation-delay:${(i * 0.45).toFixed(2)}s"/>`;
      o += `<g${icon ? "" : ` class="tw" style="animation-delay:${(i * 0.4).toFixed(2)}s"`}>${C(l[0], l[1], 7, l[2], 3)}</g>`;
    });
    o += C(124, 172, 10, "#E63946", 3) + C(184, 168, 10, "#9B5DE5", 3) + C(150, 232, 10, "#3A86FF", 3);
    o += P(starPath(150, 36, 24), "#FFD43B", 4);
    return o;
  }
  function snowmanArt() {
    // Hat, scarf, nose, arms and buttons; no eyes or mouth (he makes the face himself in the station).
    let o = shadow(150, 272, 70, 8);
    o += S("M110 150 L62 120 M74 128 L60 112 M196 150 L244 118 M232 126 L248 110", "#7A4B1E", 6);
    o += C(150, 222, 52, "#FFFFFF", 4) + C(150, 148, 38, "#FFFFFF", 4) + C(150, 92, 28, "#FFFFFF", 4);
    o += S("M120 238 Q150 262 182 238", "rgba(150,180,220,0.6)", 5);
    o += C(150, 136, 5, INK, 0) + C(150, 156, 5, INK, 0) + C(150, 206, 5, INK, 0);
    o += P("M120 118 Q150 132 180 118 L182 128 Q150 142 118 128 Z", "#E63946", 3.5) + P("M164 126 L170 162 L156 162 L152 130 Z", "#E63946", 3.5);
    o += P("M152 96 L178 102 L152 106 Z", "#FF8A1F", 3);
    o += Rc(118, 64, 64, 8, 3, "#2B3045", 3.5) + Rc(128, 26, 44, 40, 4, "#2B3045", 3.5) + Rc(128, 54, 44, 8, 0, "#E63946", 3);
    return o;
  }
  function presentsArt() {
    let o = shadow(150, 272, 110, 8);
    const box = (x, y, w, h, fill, rib, pat) => {
      let g = Rc(x, y, w, h, 5, fill, 4);
      if (pat) g += pat;
      g += `<rect x="${f1(x + w / 2 - 7)}" y="${f1(y)}" width="14" height="${f1(h)}" fill="${rib}" stroke="${INK}" stroke-width="3"/>`;
      g += `<rect x="${f1(x)}" y="${f1(y + h / 2 - 7)}" width="${f1(w)}" height="14" fill="${rib}" stroke="${INK}" stroke-width="3"/>`;
      g += P(`M${x + w / 2} ${y} Q${x + w / 2 - 30} ${y - 26} ${x + w / 2 - 22} ${y - 4} Z`, rib, 3) + P(`M${x + w / 2} ${y} Q${x + w / 2 + 30} ${y - 26} ${x + w / 2 + 22} ${y - 4} Z`, rib, 3);
      return g;
    };
    let dots = "";
    for (let i = 0; i < 6; i++) dots += P(starPath(56 + (i % 3) * 30, 196 + Math.floor(i / 3) * 40, 7), "#FFD43B", 2);
    o += box(40, 170, 110, 100, "#E63946", "#FFD43B", dots);
    o += box(150, 196, 110, 74, "#2E9E5B", "#FFFFFF", S("M160 206 L250 260 M190 206 L250 242 M160 236 L210 266", "rgba(255,255,255,0.35)", 6));
    o += box(100, 98, 92, 72, "#3A86FF", "#FF6FB5", "");
    return o;
  }
  function flakeD(cx, cy, r) {
    // One arm of a paper snowflake, repeated six times round the middle.
    let d = "";
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
      const pt = (x, y) => f1(cx + x * ca - y * sa) + " " + f1(cy + x * sa + y * ca);
      d += `M${pt(0, 0)} L${pt(r, 0)} M${pt(r * 0.45, 0)} L${pt(r * 0.68, -r * 0.2)} M${pt(r * 0.45, 0)} L${pt(r * 0.68, r * 0.2)} M${pt(r * 0.72, 0)} L${pt(r * 0.88, -r * 0.13)} M${pt(r * 0.72, 0)} L${pt(r * 0.88, r * 0.13)} `;
    }
    return d;
  }
  function snowflakesArt(icon) {
    let o = "";
    if (!icon) {
      // A window at night with the paper snowflake taped to the glass.
      o += shadow(150, 272, 100, 8);
      o += Rc(44, 40, 212, 212, 10, "#E7D2B0", 4) + Rc(58, 54, 184, 184, 4, "#20345E", 4);
      for (let i = 0; i < 9; i++) o += C(72 + (i * 47) % 160, 70 + (i * 61) % 150, 2.5, "#FFFFFF", 0);
      o += Rc(36, 246, 228, 18, 5, "#C9A06A", 4);
    }
    const r = icon ? 110 : 78;
    o += S(flakeD(150, 146, r), INK, icon ? 26 : 19) + S(flakeD(150, 146, r), icon ? "#BFE3FF" : "#FFFFFF", icon ? 17 : 12);
    o += C(150, 146, icon ? 22 : 15, icon ? "#BFE3FF" : "#FFFFFF", 4);
    return o;
  }
  function cookiesArt(icon) {
    let o = "";
    if (!icon) {
      o += shadow(150, 272, 112, 8);
      o += Rc(30, 236, 240, 30, 6, "#B8C4D6", 4) + Rc(38, 230, 224, 10, 4, "#DDE4EE", 3);
      o += P(starPath(74, 222, 26, 0.5), "#E9B872", 3.5) + S(starPath(74, 222, 18, 0.5), "#FFFFFF", 3);
      o += P("M228 196 L252 232 L204 232 Z", "#E9B872", 3.5) + S("M214 224 Q228 216 242 224 M220 212 Q228 206 236 212", "#7ED957", 3);
    }
    // A gingerbread person with icing trim and gumdrop buttons; no face.
    const g = "M150 60 C172 60 180 76 176 96 C174 104 168 110 166 112 L206 122 C222 126 222 148 206 150 L176 148 L186 210 C190 230 166 236 160 218 L150 184 L140 218 C134 236 110 230 114 210 L124 148 L94 150 C78 148 78 126 94 122 L134 112 C132 110 126 104 124 96 C120 76 128 60 150 60 Z";
    o += P(g, "#B8743B", 4);
    o += S("M98 130 Q104 140 98 146 M202 130 Q196 140 202 146 M122 218 Q130 212 136 220 M164 220 Q170 212 178 218", "#FFFFFF", 4);
    o += C(150, 128, 6, "#E63946", 2.5) + C(150, 148, 6, "#7ED957", 2.5) + C(150, 168, 6, "#FFC93C", 2.5);
    return o;
  }
  const ART = { tree: treeArt, snowman: snowmanArt, presents: presentsArt, snowflakes: snowflakesArt, cookies: cookiesArt };
  const ICONBOX = { tree: "30 4 240 272", snowman: "50 20 210 256", presents: "30 64 240 210", snowflakes: "30 26 240 240", cookies: "70 52 160 190" };

  // =====================================================================================================
  // Layout and drawing the evening
  // =====================================================================================================
  const TW = 300, TH = 340, TOP = 70;
  let L = null;
  // The arrangement with the biggest pictures: one row of five, rows of three and two, or rows of two, two, one.
  function chooseLayout(cw, ch) {
    let best = null;
    [[5], [3, 2], [2, 2, 1]].forEach((rows) => {
      const cols = Math.max(...rows), w = cols * TW + 40, h = TOP + rows.length * TH + 20;
      const s = Math.min(cw / w, ch / h);
      if (!best || s > best.s + 0.0001) best = { rows, cols, w, h, s };
    });
    best.VW = cw / best.s;
    best.VH = ch / best.s;
    best.gx = (best.VW - best.cols * TW) / 2;
    best.gy = (best.VH - (best.h - 20)) / 2 + TOP * 0.5;
    return best;
  }
  function buildMap() {
    const cw = stage.clientWidth, ch = stage.clientHeight;
    if (cw < 10 || ch < 10) return;
    L = chooseLayout(cw, ch);
    const { VW, VH, gx, gy } = L;
    let o = '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2550"/><stop offset="1" stop-color="#3D5A96"/></linearGradient></defs>';
    o += `<rect x="0" y="0" width="${f1(VW)}" height="${f1(VH)}" fill="url(#sky)"/>`;
    // Stars and the moon high in the sky.
    for (let i = 0; i < 26; i++) {
      const x = (i * 97.3) % VW, y = (i * 53.7) % Math.max(60, gy + 40);
      o += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${i % 3 ? 1.8 : 2.8}" fill="#FFF4CC"/>`;
    }
    o += `<circle cx="${f1(VW - 70)}" cy="${f1(Math.max(46, gy * 0.5))}" r="24" fill="#FFF4CC" stroke="${INK}" stroke-width="3"/>`;
    // A snowbank under each row.
    const places = [];
    let idx = 0;
    L.rows.forEach((n, r) => {
      const y0 = gy + r * TH, rx0 = gx + (L.cols - n) * TW / 2;
      const by = y0 + 262, bottom = r === L.rows.length - 1 ? VH + 6 : y0 + TH + 6;
      o += P(`M-20 ${f1(by + 6)} Q${f1(VW * 0.25)} ${f1(by - 16)} ${f1(VW * 0.5)} ${f1(by)} Q${f1(VW * 0.75)} ${f1(by + 14)} ${f1(VW + 20)} ${f1(by - 4)} L${f1(VW + 20)} ${f1(bottom)} L-20 ${f1(bottom)} Z`, "#F4F9FF", 4);
      o += S(`M${f1(VW * 0.1)} ${f1(by + 26)} q30 -8 60 0 M${f1(VW * 0.62)} ${f1(by + 30)} q40 -10 80 0`, "#C9DCF2", 4);
      for (let k = 0; k < n; k++) {
        const st = STATIONS[idx++], tx = rx0 + k * TW;
        places.push({ st, x: tx, y: y0 });
        o += `<g transform="translate(${f1(tx)} ${f1(y0)})" data-go="${st.id}"><g class="st" id="m-${st.id}">${ART[st.id](false)}</g>` +
          '<rect x="10" y="10" width="280" height="330" fill="transparent"/></g>';
      }
    });
    // Calm falling snow over everything (a still scatter when motion is reduced).
    const fall = VH + 80;
    for (let i = 0; i < 34; i++) {
      const x = rand(0, VW), r = rand(2.2, 4.6), dur = rand(9, 16);
      const y = reduceMotion ? rand(0, VH) : 0;
      o += `<circle class="flake" cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#FFFFFF" opacity="0.85" style="--fall:${f1(fall)}px;animation-duration:${f1(dur)}s;animation-delay:-${f1(rand(0, dur))}s"/>`;
    }
    mapSvg.setAttribute("viewBox", `0 0 ${f1(VW)} ${f1(VH)}`);
    mapSvg.innerHTML = o;
    const small = L.s < 0.62;
    places.forEach((p) => {
      const b = btnEls[p.st.id];
      b.classList.toggle("small", small);
      b.style.left = f1((p.x + 150) * L.s) + "px";
      b.style.top = f1((p.y + 302) * L.s) + "px";
    });
  }
  const btnEls = {};
  STATIONS.forEach((st) => {
    const a = document.createElement("a");
    a.className = "btn sbtn";
    a.href = st.id + ".html";
    a.dataset.go = st.id;
    a.innerHTML = `<svg viewBox="${ICONBOX[st.id]}" aria-hidden="true">${ART[st.id](true)}</svg><span>${st.label}</span>`;
    sbtns.appendChild(a);
    btnEls[st.id] = a;
  });
  let buildPending = false, lastSize = "";
  function scheduleBuild() {
    if (buildPending) return;
    buildPending = true;
    requestAnimationFrame(() => {
      buildPending = false;
      const key = stage.clientWidth + "x" + stage.clientHeight;
      if (key === lastSize) return;
      lastSize = key;
      buildMap();
    });
  }
  window.addEventListener("resize", scheduleBuild);
  window.addEventListener("orientationchange", () => setTimeout(scheduleBuild, 200));

  // =====================================================================================================
  // Going to a station
  // =====================================================================================================
  let going = false;
  function sparkle(x, y, i) {
    const d = document.createElementNS("http://www.w3.org/2000/svg", "svg"), s = rand(16, 28);
    d.setAttribute("class", "spark");
    d.setAttribute("viewBox", "-12 -12 24 24");
    d.style.width = d.style.height = s + "px";
    d.innerHTML = P(starPath(0, 0, 10, 0.42), ["#FFD43B", "#FFFFFF", "#FF6FB5", "#7ED957"][i % 4], 2);
    document.body.appendChild(d);
    const dx = rand(-90, 90), dy = rand(-100, -10);
    if (!d.animate || reduceMotion) { setTimeout(() => d.remove(), 300); return; }
    d.animate([{ transform: `translate(${x - s / 2}px,${y - s / 2}px) scale(0.4)`, opacity: 1 },
      { transform: `translate(${x - s / 2 + dx}px,${y - s / 2 + dy}px) scale(1.2) rotate(90deg)`, opacity: 0 }], { duration: rand(550, 850), easing: "ease-out" }).onfinish = () => d.remove();
  }
  function goStation(id) {
    if (going || locked()) return;
    going = true;
    const m = $("m-" + id);
    if (m) {
      const r = m.getBoundingClientRect();
      for (let i = 0; i < 12; i++) sparkle(r.left + r.width * rand(0.2, 0.8), r.top + r.height * rand(0.15, 0.6), i);
      m.classList.remove("hop");
      void m.getBoundingClientRect();
      if (!reduceMotion) m.classList.add("hop");
    }
    setTimeout(() => { location.href = id + ".html"; }, reduceMotion ? 0 : 520);
  }
  mapSvg.addEventListener("click", (e) => {
    if (locked()) return;
    const g = e.target.closest && e.target.closest("[data-go]");
    if (g) goStation(g.getAttribute("data-go"));
  });
  sbtns.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-go]");
    if (!a) return;
    e.preventDefault();
    goStation(a.dataset.go);
  });
  window.addEventListener("pageshow", (e) => {
    going = false;
    if (e.persisted) { lastSize = ""; scheduleBuild(); }
  });

  // =====================================================================================================
  // Timer
  // =====================================================================================================
  // The map is a free choice: no instruction line and no idle hand pointing at one station.
  function onEnding(done, info) {
    try { mapSvg.pauseAnimations(); } catch (e) { /* ignore */ }
    if (info.goodbye) { done(); return; }
    setTimeout(done, 3000);
  }
  function restArt() {
    let o = '<rect width="400" height="300" fill="#1B2550"/>';
    [[40, 30], [120, 60], [210, 24], [300, 50], [360, 90], [80, 110]].forEach((s) => { o += `<circle cx="${s[0]}" cy="${s[1]}" r="2.5" fill="#FFF4CC"/>`; });
    o += `<circle cx="340" cy="40" r="20" fill="#FFF4CC" stroke="${INK}" stroke-width="3"/>`;
    o += P("M-10 240 Q120 220 220 236 Q320 250 410 232 L410 310 L-10 310 Z", "#F4F9FF", 4);
    o += '<g transform="translate(20 -18) scale(0.85)">' + treeArt(true) + "</g>";
    o += '<g transform="translate(200 40) scale(0.62)">' + snowmanArt() + "</g>";
    o += '<text x="300" y="150" font-family="Baloo 2, sans-serif" font-weight="800" font-size="30" fill="#FFFFFF">z</text><text x="324" y="126" font-family="Baloo 2, sans-serif" font-weight="800" font-size="22" fill="#FFFFFF">z</text><text x="344" y="106" font-family="Baloo 2, sans-serif" font-weight="800" font-size="15" fill="#FFFFFF">z</text>';
    return '<svg class="rest-art" viewBox="0 0 400 300" aria-hidden="true">' + o + "</svg>";
  }

  // =====================================================================================================
  // Start and debug hook
  // =====================================================================================================
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("dblclick", (e) => e.preventDefault());
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  Toybox.init({
    app: "christmas",
    badge: $("tbadge"),
    timerIntro: "When time is up, the Christmas stations finish what they are doing and the controls lock. The timer carries on across the Christmas pages.",
    restLine: "Christmas is resting.",
    restLine2: "The snow will still be here next time.",
    restArt,
    onEnding,
    onRest: () => { try { mapSvg.pauseAnimations(); } catch (e) { /* ignore */ } },
    onWake: () => { try { mapSvg.unpauseAnimations(); } catch (e) { /* ignore */ } }
  });
  scheduleBuild();

  if (/[?&]debug\b/.test(location.search)) {
    // state()/next() let tools/playtest.js step through: each next() wiggles the next station in turn.
    let shown = -1;
    window.__toybox = {
      state: () => ({ shown, going }),
      next: () => {
        shown = (shown + 1) % STATIONS.length;
        const m = $("m-" + STATIONS[shown].id);
        if (m) { m.classList.remove("wig"); void m.getBoundingClientRect(); m.classList.add("wig"); }
      },
      layout: () => L && { rows: L.rows, s: L.s },
      stations: () => STATIONS.map((s) => s.id),
      go: goStation
    };
  }
})();
