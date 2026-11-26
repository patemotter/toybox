#!/usr/bin/env python3
"""Scaffold a new Toybox app folder with clean starter files.

Usage:
  python3 tools/scaffold-app.py <folder> "<Name>" [--subtitle "<short line>"]

Refuses to overwrite an existing folder. Does not create a per-app sw.js or a Big button.
"""
import argparse
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build_html(name: str, subtitle: str) -> str:
    esc_name = html.escape(name, quote=True)
    esc_sub = html.escape(subtitle or f"{name} play stage. Tap to play.", quote=True)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>{esc_name}</title>
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#CDE9FF">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="{esc_name}">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../common/toybox.css">
<script src="../common/toybox.js"></script>
<style>
:root {{
  --bg: #CDE9FF; --panel: #FFFFFF; --ink: #1D2340; --muted: #4A5578; --edge: #1D2340; --accent: #FFC93C; --plate: #F4FAFF; --focus: #2D5BD7;
  --font: "Baloo 2", "Trebuchet MS", "Segoe UI", system-ui, sans-serif;
  color-scheme: light; box-sizing: border-box;
  padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px);
}}
*, *::before, *::after {{ box-sizing: inherit; }}
html, body {{ height: 100%; }}
body {{
  margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font); font-size: 18px; line-height: 1.4;
  overflow: hidden; overscroll-behavior: none; -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%;
}}
.tb-head a {{ text-decoration: none; }}
.stage {{ background: #E9F6FF; touch-action: none; }}
#cv {{ position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }}
.tbadge {{ position: absolute; top: 10px; right: 10px; z-index: 3; }}
body.ending .tb-panel {{ pointer-events: none; opacity: 0.4; }}
.rest-art {{ width: min(70vw, 300px, 46vh); aspect-ratio: 1; border: 3px solid #1D2340; border-radius: 18px; background: #E9F6FF; }}
</style>
</head>
<body>
<div class="tb-app-shell tb-v2">
  <header class="tb-head">
    <a class="btn tb-iconbtn homebtn" href="../" aria-label="Back to Toybox"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h4.5v-5.5h3V20H18V9.5"/></svg></a>
    <h1 class="tb-title"><span class="tb-station">{esc_name}</span></h1>
  </header>
  <div class="tb-body app">
    <main class="tb-stage stage" id="stage">
      <canvas id="cv" role="img" aria-label="{esc_sub}"></canvas>
      <div class="tb-coach" id="coach"></div>
      <svg class="tbadge" id="tbadge" viewBox="0 0 60 60" aria-hidden="true" hidden></svg>
    </main>
    <section class="tb-panel tb-panel-bar" id="panel">
      <div id="bottom"></div>
    </section>
  </div>
</div>
<script src="index.js"></script>
</body>
</html>
"""


def build_js(folder: str, name: str, subtitle: str) -> str:
    app_id = re.sub(r"[^a-z0-9-]+", "-", folder.lower()).strip("-") or "app"
    js_name = json.dumps(name)
    js_app = json.dumps(app_id)
    js_key = json.dumps(f"{app_id}-v1")
    js_prompt = json.dumps(subtitle or "Tap the ring to start.")
    return f"""(function () {{
  "use strict";

  // Sections:
  //   1. State and persistence
  //   2. Canvas sizing and layout
  //   3. Interaction and actions
  //   4. Coach, ghost hand and bottom bar
  //   5. Render loop
  //   6. Toybox init and debug hook

  const $ = (id) => document.getElementById(id);
  const cv = $("cv");
  const ctx = cv.getContext("2d");
  const stageEl = $("stage");

  // =========================================================================
  // 1. State and persistence
  // =========================================================================
  const STORE_KEY = {js_key};
  const COLORS = ["#FF595E", "#FFCA3A", "#8AC926", "#1982C4", "#9B5DE5", "#FF8C42"];
  const state = {{
    step: 0,
    colorIndex: 0,
    pulses: [],
    ending: false,
    resting: false
  }};

  function loadState() {{
    if (Toybox.fresh()) return;
    try {{
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (saved && typeof saved === "object") {{
        if (typeof saved.step === "number") state.step = saved.step;
        if (typeof saved.colorIndex === "number") state.colorIndex = saved.colorIndex % COLORS.length;
      }}
    }} catch (e) {{ /* ignore */ }}
  }}

  function saveState() {{
    try {{
      localStorage.setItem(STORE_KEY, JSON.stringify({{
        step: state.step,
        colorIndex: state.colorIndex
      }}));
    }} catch (e) {{ /* ignore */ }}
  }}

  // =========================================================================
  // 2. Canvas sizing and layout
  // =========================================================================
  let W = 0, H = 0, DPR = 1;

  function resize() {{
    const rect = stageEl.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }}

  function targetPoint() {{
    return {{ x: W * 0.5, y: H * 0.5, r: Math.min(W, H) * 0.16 }};
  }}

  function toViewport(x, y) {{
    const r = cv.getBoundingClientRect();
    return [r.left + x, r.top + y];
  }}

  // =========================================================================
  // 3. Interaction and actions
  // =========================================================================
  function locked() {{
    return state.ending || state.resting;
  }}

  function doStep(x, y) {{
    if (locked()) return;
    state.step += 1;
    state.colorIndex = (state.colorIndex + 1) % COLORS.length;
    const pt = targetPoint();
    state.pulses.push({{
      x: typeof x === "number" ? x : pt.x,
      y: typeof y === "number" ? y : pt.y,
      r: 18,
      maxR: Math.min(W, H) * 0.36,
      alpha: 1,
      color: COLORS[state.colorIndex]
    }});
    coach.step("Tap again for the next color.");
    ghost.poke();
    saveState();
  }}

  function resetPlay() {{
    if (locked()) return;
    state.step = 0;
    state.colorIndex = 0;
    state.pulses.length = 0;
    coach.step({js_prompt});
    ghost.poke();
    saveState();
  }}

  function surprise() {{
    if (locked()) return;
    const pt = targetPoint();
    for (let i = 0; i < 3; i++) {{
      state.pulses.push({{
        x: pt.x + (i - 1) * pt.r * 0.8,
        y: pt.y,
        r: 14,
        maxR: Math.min(W, H) * 0.42,
        alpha: 1,
        color: COLORS[(state.colorIndex + i) % COLORS.length]
      }});
    }}
    state.step += 1;
    state.colorIndex = (state.colorIndex + 2) % COLORS.length;
    ghost.poke();
    saveState();
  }}

  cv.addEventListener("pointerdown", (e) => {{
    const r = cv.getBoundingClientRect();
    doStep(e.clientX - r.left, e.clientY - r.top);
  }});

  // =========================================================================
  // 4. Coach, ghost hand and bottom bar
  // =========================================================================
  const coach = Toybox.coach($("coach"));
  coach.step({js_prompt});

  const ghost = Toybox.ghost({{
    max: 3,
    plan: () => {{
      if (locked()) return null;
      const pt = targetPoint();
      return {{ tap: true, pts: [toViewport(pt.x, pt.y)] }};
    }}
  }});

  Toybox.bar($("bottom"), {{ onNew: resetPlay, onSurprise: surprise }});

  // =========================================================================
  // 5. Render loop
  // =========================================================================
  let lastTs = 0;

  function draw(ts) {{
    const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0.016);
    lastTs = ts;

    ctx.clearRect(0, 0, W, H);
    const pt = targetPoint();

    // Soft target disc
    ctx.save();
    ctx.fillStyle = COLORS[state.colorIndex];
    ctx.strokeStyle = "#1D2340";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Gentle inviting ring
    const wave = 1 + Math.sin(ts * 0.004) * 0.06;
    ctx.strokeStyle = "#FFC93C";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r * 1.18 * wave, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Expanding touch ripples
    for (let i = state.pulses.length - 1; i >= 0; i--) {{
      const p = state.pulses[i];
      p.r += (p.maxR - p.r) * Math.min(1, dt * 4.5);
      p.alpha -= dt * 1.2;
      if (p.alpha <= 0.02) {{
        state.pulses.splice(i, 1);
        continue;
      }}
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }}

    requestAnimationFrame(draw);
  }}

  // =========================================================================
  // 6. Toybox init and debug hook
  // =========================================================================
  loadState();
  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {{ if (document.hidden) saveState(); }});
  window.addEventListener("pagehide", saveState);

  Toybox.init({{
    app: {js_app},
    badge: $("tbadge"),
    timerIntro: "When time is up, play pauses until next time.",
    restLine: {js_name} + " is resting.",
    restLine2: "It will be right here next time.",
    onEnding: (done) => {{ state.ending = true; done(); }},
    onRest: () => {{ state.resting = true; }},
    onWake: () => {{ state.ending = false; state.resting = false; }}
  }});

  if (/[?&]debug\\b/.test(location.search)) {{
    window.__toybox = {{
      state: () => ({{ step: state.step, color: COLORS[state.colorIndex], coach: coach.text() }}),
      next: () => {{ doStep(); return window.__toybox.state(); }},
      reset: () => {{ resetPlay(); return window.__toybox.state(); }}
    }};
  }}

  requestAnimationFrame(draw);
}})();
"""


def build_manifest(name: str) -> str:
    manifest = {
        "name": name,
        "short_name": name,
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "orientation": "any",
        "background_color": "#CDE9FF",
        "theme_color": "#CDE9FF",
        "icons": [
            {"src": "icons/icon-180.png", "sizes": "180x180", "type": "image/png"},
            {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    return json.dumps(manifest, indent=2) + "\n"


def build_svg(name: str) -> str:
    letter = html.escape((name.strip()[:1] or "T").upper())
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#CDE9FF"/>
  <circle cx="256" cy="256" r="158" fill="#FFC93C" stroke="#1D2340" stroke-width="18"/>
  <circle cx="256" cy="256" r="110" fill="#FFFFFF" stroke="#1D2340" stroke-width="14"/>
  <text x="256" y="294" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="140" font-weight="800" fill="#1D2340">{letter}</text>
</svg>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Scaffold a new Toybox app folder.")
    parser.add_argument("folder", help="App folder path or name (e.g. 'train-yard' or '/tmp/demo-app')")
    parser.add_argument("name", help="Display name of the app (e.g. 'Train Yard')")
    parser.add_argument("--subtitle", default="", help="Optional short description / starter coach line")
    args = parser.parse_args()

    target = os.path.abspath(args.folder) if os.path.isabs(args.folder) else os.path.join(ROOT, args.folder)
    if os.path.exists(target):
        print(f"Error: folder already exists: {target}", file=sys.stderr)
        return 1

    icons_dir = os.path.join(target, "icons")
    os.makedirs(icons_dir, exist_ok=False)

    folder_slug = os.path.basename(target.rstrip(os.sep))
    files = {
        os.path.join(target, "index.html"): build_html(args.name, args.subtitle),
        os.path.join(target, "index.js"): build_js(folder_slug, args.name, args.subtitle),
        os.path.join(target, "manifest.webmanifest"): build_manifest(args.name),
        os.path.join(icons_dir, "icon.svg"): build_svg(args.name),
    }

    for path, content in files.items():
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        print(f"created {os.path.relpath(path, os.getcwd())}")

    rel_folder = args.folder.rstrip("/")
    what = args.subtitle or f"Play with {args.name}."
    print("\nNext steps:")
    print(f"  1. Customize {rel_folder}/icons/icon.svg, render PNG icons, and remove the source SVG:")
    print(f"     node tools/render-icons.js {rel_folder}/icons/icon.svg {rel_folder} && rm {rel_folder}/icons/icon.svg")
    print(f"  2. Register the app in the launcher, sw.js CORE and README:")
    print(f'     python3 tools/add-app.py {rel_folder} "{args.name}" "{what}" "{what}" index.js')
    print(f"     node tools/sync-core.js --write")
    print(f"  3. Verify everything:")
    print(f"     node tools/verify.js --all-sizes {rel_folder}/ index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
