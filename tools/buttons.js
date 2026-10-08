// Dead-button finder: taps every visible button on a page and reports the ones where nothing changed.
//
// Usage (from the repo root, with a local server running):
//   npx http-server . -p 8120 -c-1 -s &
//   NODE_PATH=$(npm root -g) node tools/buttons.js                    # every page in the top-level sw.js CORE
//   NODE_PATH=$(npm root -g) SIZE=390x844 MOBILE=1 node tools/buttons.js workshop/ spin-shop/
// Options (environment):
//   PORT (default 8120), SIZE (default 1180x820), MOBILE=1 (touch + isMobile), CHANNEL=chrome (installed Chrome),
//   CONC (pages tested at once, default 3), WAIT (ms to wait after a tap, default 1200),
//   PAGE_MS (time cap per page, default 240000), MAXBTN (taps per page, default 60),
//   OUT=file.json (write every result), SHOTS=dir (save before/after pictures of each "dead?" button),
//   VERBOSE=1 (print every tap, not just the dead ones).
// Always exits 0: it is a finder for a person to triage, not a pass/fail test.
//
// HOW IT WORKS
// 1. Each page is loaded in its own context with the gear flags set (like smoke.js), the "turn the device"
//    card skipped, kind-words cards switched off and the idle ghost hand hidden (it reacts to every touch,
//    which would make every tap look alive).
// 2. Candidates: button, [role=button|tab|radio|switch|checkbox|option], a[href], summary, label, inputs,
//    [onclick], [tabindex], plus the outermost element of any cursor:pointer area (picture tiles). Each must be
//    visible, big enough, inside the viewport and actually on top at its centre (elementFromPoint).
//    Skipped: the Big toggle, Home/Back (by label), links to other pages (counted as "link"), disabled ones.
// 3. Taps happen in sequence on one page (fast), depth first: whatever a tap reveals (a tab's tiles) is
//    tapped next, remembering the taps that revealed it. A candidate that is hidden when its turn comes is
//    retried later; a covered one (an overlay appeared) triggers a reload.
// 4. "Did anything change?" for each tap (every load counts as a fresh visit, so a reload brings back the
//    first screen):
//    - Pixels: screenshot P0, wait 600 ms, P1 (so the page's own animation is measured right then), tap,
//      E at 400 ms, Q at WAIT. Shots are downscaled 2x and cut into 16x16 cells; a cell counts when the number
//      of clearly different pixels from P1 is well above that cell's P0->P1 noise. A constantly animating
//      canvas therefore only masks its own cells, not the panel. E catches short reactions (a sparkle) and
//      leaves out the tapped element's own rectangle (its pressed look) unless it is a big play surface.
//    - DOM: a MutationObserver records P0->P1 as the noise set (keys = element + attribute / children /
//      text), then the tap window; a key outside the noise set that ends with a different value is a DOM
//      change. Only a visible (pixel) change makes a tap "alive"; a DOM-only change is reported in the note
//      ("dom only: ...") because it is often invisible (aria/data attributes, hidden text). DOM_OK=1 counts
//      it as alive instead.
//    - Navigation is aborted and counted as alive ("navigates").
// 5. Every tap with no visible change is re-checked on a freshly loaded page (replaying the taps
//    that revealed it) before it is reported as "dead?". Hold buttons (.hold) are marked. A tile or tab that
//    was already selected (aria-pressed/selected/checked, or an on/sel/active class) and did nothing is
//    listed separately as "already selected" rather than as dead.
// 6. Output: one line per page, then a table of every "dead?" button (page, size, label, selector, note).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 8120;
const [W, H] = (process.env.SIZE || '1180x820').split('x').map(Number);
const MOBILE = process.env.MOBILE === '1';
const CONC = +(process.env.CONC || 3);
const WAIT = +(process.env.WAIT || 1200);
const PAGE_MS = +(process.env.PAGE_MS || 240000);
const MAXBTN = +(process.env.MAXBTN || 60);
const VERBOSE = process.env.VERBOSE === '1';
const SHOTS = process.env.SHOTS || '';
const DOM_OK = process.env.DOM_OK === '1';  // count a DOM-only change as alive (the old, lenient rule)
const BASE = `http://localhost:${port}/`;

function corePages() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const out = [];
  (src.match(/"\.\/[^"]*"/g) || []).forEach(s => {
    const p = s.slice(3, -1);
    if (p === '' || p === 'index.html') return; // the launcher (its grown-up sheet is a different job)
    if (/\/index\.html$/.test(p)) return;        // the folder entry covers it
    if (/\/$/.test(p) || /\.html$/.test(p)) out.push(p);
  });
  return out;
}
const pages = process.argv.slice(2).length ? process.argv.slice(2) : corePages();

// ---------- in-page helpers (installed after load) ----------
function installHelpers() {
  if (window.__bt) return;
  var ids = new WeakMap(), next = 1;
  function idOf(n) { if (!ids.has(n)) ids.set(n, next++); return ids.get(n); }
  function skipNode(n) {
    var e = n.nodeType === 1 ? n : n.parentElement;
    return !e || !!(e.closest && e.closest('.ghosthand, .tb-kind'));
  }
  var recs = [];
  var mo = new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) recs.push(list[i]); });
  mo.observe(document.documentElement, { subtree: true, attributes: true, attributeOldValue: true, childList: true, characterData: true, characterDataOldValue: true });
  function keysOf(list) {
    var first = {};
    list.forEach(function (r) {
      if (skipNode(r.target)) return;
      var k = idOf(r.target) + ':' + (r.type === 'attributes' ? '@' + r.attributeName : r.type);
      if (!(k in first)) first[k] = r;
    });
    return first;
  }
  function net(k, r) {
    if (r.type === 'attributes') return r.oldValue !== r.target.getAttribute(r.attributeName);
    if (r.type === 'characterData') return r.oldValue !== r.target.data;
    return true; // children changed: count it (added/removed nodes)
  }
  function cssPath(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) { parts.unshift('#' + CSS.escape(el.id)); break; }
      var tag = el.tagName.toLowerCase(), i = 1, s = el;
      while ((s = s.previousElementSibling)) if (s.tagName === el.tagName) i++;
      parts.unshift(tag + ':nth-of-type(' + i + ')');
      el = el.parentElement;
    }
    return parts.join(' > ');
  }
  function onTop(el, r) {
    var pts = [[0.5, 0.5], [0.3, 0.3], [0.7, 0.7], [0.3, 0.7], [0.7, 0.3]];
    for (var i = 0; i < pts.length; i++) {
      var x = Math.min(innerWidth - 2, Math.max(1, r.left + r.width * pts[i][0]));
      var y = Math.min(innerHeight - 2, Math.max(1, r.top + r.height * pts[i][1]));
      var h = document.elementFromPoint(x, y);
      if (h && (h === el || el.contains(h))) return [x, y];
    }
    return null;
  }
  function visible(el) {
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return null;
    if (r.right < 2 || r.bottom < 2 || r.left > innerWidth - 2 || r.top > innerHeight - 2) return null;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return null;
    return onTop(el, r);
  }
  function label(el) {
    var t = el.getAttribute('aria-label') || (el.innerText || '').replace(/\s+/g, ' ').trim() || el.getAttribute('title') ||
      (el.querySelector('[aria-label]') && el.querySelector('[aria-label]').getAttribute('aria-label')) || '';
    if (!t) t = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && el.className.baseVal === undefined && el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : '');
    return t.slice(0, 40);
  }
  var SEL = 'button, [role=button], [role=tab], [role=radio], [role=switch], [role=checkbox], [role=option], [role=menuitem], a[href], summary, label, input:not([type=hidden]), select, [onclick], [tabindex]:not([tabindex="-1"])';
  window.__bt = {
    mark: function () { recs = []; },
    domChanges: function (noise) {
      var k = keysOf(recs.concat(mo.takeRecords())), out = [];
      Object.keys(k).forEach(function (key) {
        if (noise[key] || !net(key, k[key])) return;
        var t = k[key].target, e = t.nodeType === 1 ? t : t.parentElement;
        out.push((e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '') : '?') + key.replace(/^\d+/, ''));
      });
      return out;
    },
    noiseKeys: function () { var k = keysOf(recs.concat(mo.takeRecords())), o = {}; Object.keys(k).forEach(function (x) { o[x] = 1; }); return o; },
    candidates: function () {
      var set = [], seen = new Set();
      document.querySelectorAll(SEL).forEach(function (el) { if (!seen.has(el)) { seen.add(el); set.push(el); } });
      document.querySelectorAll('body *').forEach(function (el) {
        if (seen.has(el) || el instanceof SVGElement && !(el instanceof SVGSVGElement)) return;
        var cs = getComputedStyle(el);
        if (cs.cursor !== 'pointer') return;
        var p = el.parentElement;
        if (p && getComputedStyle(p).cursor === 'pointer') return;
        seen.add(el); set.push(el);
      });
      // keep the outermost of nested candidates (a tile button holding a picture)
      var inSet = new Set(set);
      set = set.filter(function (el) { var p = el.parentElement; while (p) { if (inSet.has(p)) return false; p = p.parentElement; } return true; });
      var out = [];
      set.forEach(function (el) {
        if (el.closest('.tb-layer, .ghosthand')) return;
        var at = visible(el);
        if (!at) return;
        var lab = label(el), kind = 'tap', href = el.getAttribute && el.getAttribute('href');
        if (el.classList.contains('bigtoggle')) kind = 'skip:big';
        else if (/^(‹|<|home\b|back\b|all machines|tool wall)/i.test(lab) || el.matches('.home, .back, [data-home]')) kind = 'skip:home/back';
        else if (href && !/^#/.test(href) && !/^javascript:/i.test(href)) {
          var u = new URL(href, location.href);
          if (u.pathname !== location.pathname) kind = 'link';
        }
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') kind = 'skip:disabled';
        var cs = getComputedStyle(el), op = parseFloat(cs.opacity);
        var sel = el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-checked') === 'true' ||
          /(^|\s)(on|sel|selected|active|current|picked|chosen)(\s|$)/.test(el.className && el.className.baseVal === undefined ? el.className : '');
        out.push({ path: cssPath(el), label: lab, kind: kind, x: at[0], y: at[1], hold: el.classList.contains('hold'),
          faded: op < 0.6, selected: sel, href: href || '' });
      });
      return out;
    },
    find: function (p) {
      var el = document.querySelector(p); if (!el) return null;
      var at = visible(el), r = el.getBoundingClientRect();
      return at ? { x: at[0], y: at[1], r: [r.left, r.top, r.right, r.bottom] } : { hidden: true };
    }
  };
}

// ---------- pixel diff (runs in a blank helper page) ----------
async function cellDiff(helper, bufs, skip) {
  // bufs: [P0, P1, Q, E?]. Returns { changed, px } for P1 -> Q (cells above the P0 -> P1 noise) and, when E
  // (an early shot ~400 ms after the tap) is given, the same for P1 -> E outside the tapped element's own
  // rectangle `skip` (a short sparkle or ring counts; the button's own pressed look does not).
  return helper.evaluate(async ({ b64s, skip }) => {
    const imgs = await Promise.all(b64s.map(async s => {
      const bin = atob(s), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return createImageBitmap(new Blob([u], { type: 'image/png' }));
    }));
    const w = Math.ceil(imgs[0].width / 2), h = Math.ceil(imgs[0].height / 2);
    const data = imgs.map(im => {
      const c = new OffscreenCanvas(w, h), g = c.getContext('2d');
      g.drawImage(im, 0, 0, w, h);
      return g.getImageData(0, 0, w, h).data;
    });
    const C = 16, cw = Math.ceil(w / C), ch = Math.ceil(h / C);
    function diff(a, b) {
      const cells = new Array(cw * ch).fill(0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        if (d > 48) cells[((y / C) | 0) * cw + ((x / C) | 0)]++;
      }
      return cells;
    }
    const noise = diff(data[0], data[1]);
    function score(change, skipRect) {
      let changed = 0, px = 0;
      for (let i = 0; i < change.length; i++) {
        if (skipRect) {
          const cx0 = (i % cw) * C * 2, cy0 = ((i / cw) | 0) * C * 2;  // cell in css px
          if (cx0 + C * 2 > skipRect[0] - 8 && cx0 < skipRect[2] + 8 && cy0 + C * 2 > skipRect[1] - 8 && cy0 < skipRect[3] + 8) continue;
        }
        const n = noise[i];
        if (change[i] > n * 1.6 + 6 + (n ? 10 : 0)) { changed++; px += change[i] - n; }
      }
      return { changed, px };
    }
    const late = score(diff(data[1], data[2]));
    const early = data[3] ? score(diff(data[1], data[3]), skip) : { changed: 0, px: 0 };
    return { changed: late.changed, early: early.changed };
  }, { b64s: bufs.map(b => b.toString('base64')), skip });
}

const shot = p => p.screenshot({ scale: 'css', animations: 'allow', caret: 'initial' }).catch(() => null);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openPage(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: MOBILE });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const state = { loaded: false, nav: null, errs: [] };
  await ctx.route('**/*', r => {
    const req = r.request();
    if (state.loaded && req.isNavigationRequest() && req.frame() === req.frame().page().mainFrame()) {
      state.nav = req.url(); return r.abort();
    }
    return r.fallback();
  });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('workshop-gear', 'on');
      sessionStorage.setItem('workshop-check-skip', '1');
      sessionStorage.setItem('site-gear', 'on');
      sessionStorage.setItem('kitchen-ready', 'on');
      // Every load is a fresh visit (as if opened from the home screen), so a reload brings back the
      // first screen (picture choosers, the first tab) for the buttons a previous tap hid.
      sessionStorage.setItem('toybox-launch', 'bt' + Date.now() + Math.random());
      ['train-builder', 'construction-site', 'concrete', 'workshop', 'kitchen'].forEach(a => sessionStorage.setItem('toybox-turn-ok:' + a, '1'));
      const s = JSON.parse(localStorage.getItem('toybox-settings-v1') || '{}');
      s['kind-words'] = false;
      localStorage.setItem('toybox-settings-v1', JSON.stringify(s));
    } catch (e) { /* ignore */ }
    const st = document.createElement('style');
    st.textContent = '.ghosthand{visibility:hidden!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => state.errs.push(e.message.slice(0, 160)));
  async function load() {
    state.loaded = false; state.nav = null;
    await page.goto(BASE + url, { waitUntil: 'load', timeout: 20000 });
    await sleep(1500);
    // pages that set the turn-ok key under a different app id: press "Play like this" if the card shows
    const play = await page.$('.tb-turn:not([hidden]) button');
    if (play) { await play.click().catch(() => {}); await sleep(300); }
    await page.evaluate(installHelpers);
    state.loaded = true;
  }
  return { ctx, page, state, load };
}

async function tapAt(page, x, y) {
  if (MOBILE) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

// Measure one tap at (x, y) on the current page state.
async function measure(P, helper, x, y, rect) {
  const { page, state } = P;
  const s0 = await shot(page);
  await page.evaluate(() => __bt.mark());
  await sleep(600);
  const s1 = await shot(page);
  const noise = await page.evaluate(() => __bt.noiseKeys());
  await page.evaluate(() => __bt.mark());
  state.nav = null;
  await tapAt(page, x, y);
  await sleep(400);
  const se = await shot(page);
  await sleep(Math.max(0, WAIT - 400));
  if (state.nav) return { alive: true, why: 'navigates', s1, s2: null };
  const dom = await page.evaluate(n => __bt.domChanges(n), noise).catch(() => ['(page changed)']);
  const s2 = await shot(page);
  let pix = { changed: 0, early: 0 };
  // The element's own rectangle is left out of the early check (its pressed look), unless it is a big
  // play surface (a stage canvas), where the reaction happens inside it.
  const small = rect && (rect[2] - rect[0]) * (rect[3] - rect[1]) < 0.2 * W * H;
  if (s0 && s1 && s2) pix = await cellDiff(helper, se ? [s0, s1, s2, se] : [s0, s1, s2], small ? rect : null);
  if (process.env.DEBUG) console.log('     dom', dom.slice(0, 12).join(' '), 'px', pix.changed, 'early', pix.early);
  // Alive = something visibly changed. A DOM change with no visible pixel change (an aria/data attribute,
  // text of a hidden element, a change hidden under an animating canvas) is reported as "dom only" to check.
  const seen = pix.changed >= 1 || pix.early >= 1;
  const alive = seen || (DOM_OK && dom.length > 0);
  if (!seen && dom.length) P.domOnly = dom.slice(0, 4);
  else P.domOnly = null;
  return { alive, why: (dom.length ? 'dom:' + dom.length : '') + (pix.changed ? ' px:' + pix.changed : '') + (pix.early ? ' early:' + pix.early : ''), s1, s2 };
}

async function replay(P, via) {
  for (const v of via) {
    const a = await P.page.evaluate(p => __bt.find(p), v).catch(() => null);
    if (a && !a.hidden) { await tapAt(P.page, a.x, a.y); await sleep(700); }
  }
}

async function testPage(browser, helper, url) {
  const t0 = Date.now();
  const res = { url, size: `${W}x${H}${MOBILE ? ' mobile' : ''}`, tapped: 0, alive: 0, links: 0, dead: [], notReached: [], errs: [] };
  let P;
  try {
    P = await openPage(browser, url);
    await P.load();
  } catch (e) { res.errs.push('LOAD ' + e.message.slice(0, 100)); if (P) await P.ctx.close(); return res; }
  const done = new Set(), queue = [], suspects = [];
  function add(list, via) {
    const fresh = [];
    for (const c of list) {
      if (done.has(c.path) || queue.some(q => q.path === c.path)) continue;
      if (c.kind === 'link') { done.add(c.path); res.links++; continue; }
      if (c.kind.startsWith('skip')) { done.add(c.path); continue; }
      c.via = via.slice(); c.tries = 0; fresh.push(c);
    }
    queue.unshift(...fresh); // depth first: what a tap reveals is tried next
  }
  add(await P.page.evaluate(() => __bt.candidates()), []);
  const history = [];
  while (queue.length && res.tapped < MAXBTN && Date.now() - t0 < PAGE_MS) {
    const c = queue.shift();
    let at = await P.page.evaluate(p => __bt.find(p), c.path).catch(() => null);
    if (!at || at.hidden) {
      // Hidden now (another tap opened a scene or switched a tab): start over on a fresh page and replay
      // the taps that revealed it.
      await P.load().catch(() => {});
      await replay(P, c.via);
      at = await P.page.evaluate(p => __bt.find(p), c.path).catch(() => null);
      if (!at || at.hidden) { res.notReached.push(c.label); done.add(c.path); continue; }
    }
    done.add(c.path);
    const m = await measure(P, helper, at.x, at.y, at.r).catch(e => ({ alive: true, why: 'error ' + e.message.slice(0, 60) }));
    res.tapped++;
    if (VERBOSE) console.log(`   ${url} [${c.label}] ${m.alive ? 'ok' : 'DEAD?'} ${m.why}`);
    if (m.alive) res.alive++; else suspects.push(c);
    history.push(c);
    if (m.why === 'navigates') { await P.load().catch(() => {}); }
    const now = await P.page.evaluate(() => __bt.candidates()).catch(() => []);
    add(now, c.via.concat([c.path]));
  }
  for (const q of queue) res.notReached.push(q.label + (Date.now() - t0 >= PAGE_MS ? ' (time cap)' : ''));
  // Re-check every suspect on a fresh page, replaying the taps that revealed it.
  for (const c of suspects) {
    let verdict = null;
    try {
      await P.load();
      await replay(P, c.via);
      const at = await P.page.evaluate(p => __bt.find(p), c.path);
      if (!at || at.hidden) verdict = { alive: false, why: 'not reachable on re-check' };
      else verdict = await measure(P, helper, at.x, at.y, at.r);
    } catch (e) { verdict = { alive: false, why: 'recheck error ' + e.message.slice(0, 50) }; }
    if (verdict.alive) { res.alive++; continue; }
    if (c.selected) { res.selectedNoop = (res.selectedNoop || []).concat(c.label); continue; } // tapping the current tab/choice again
    const note = [P.domOnly ? 'dom only: ' + P.domOnly.join(' ') : '', c.hold ? 'hold button' : '', c.selected ? 'already selected' : '', c.faded ? 'looks faded' : '', verdict.why].filter(Boolean).join(', ');
    res.dead.push({ label: c.label, path: c.path, note, via: c.via.length });
    if (SHOTS && verdict.s1 && verdict.s2) {
      fs.mkdirSync(SHOTS, { recursive: true });
      const base = path.join(SHOTS, `${url.replace(/[\/.]+/g, '_')}_${W}x${H}_${res.dead.length}`);
      fs.writeFileSync(base + '_before.png', verdict.s1); fs.writeFileSync(base + '_after.png', verdict.s2);
    }
  }
  res.errs.push(...P.state.errs);
  await P.ctx.close();
  return res;
}

(async () => {
  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  const results = [];
  let i = 0;
  async function worker() {
    const hctx = await browser.newContext();
    const helper = await hctx.newPage();
    await helper.setContent('<html><body></body></html>');
    while (i < pages.length) {
      const url = pages[i++];
      const r = await testPage(browser, helper, url);
      results.push(r);
      console.log(`${r.dead.length ? 'DEAD?' : 'ok   '} ${url || '(launcher)'}  tapped ${r.tapped}, alive ${r.alive}, links ${r.links}` +
        (r.notReached.length ? `, not reached ${r.notReached.length}` : '') + (r.errs.length ? `  ERR ${r.errs.join(' | ')}` : '') +
        (r.dead.length ? '  -> ' + r.dead.map(d => `[${d.label}]`).join(' ') : ''));
    }
    await hctx.close();
  }
  await Promise.all(Array.from({ length: Math.min(CONC, pages.length) }, worker));
  await browser.close();
  results.sort((a, b) => pages.indexOf(a.url) - pages.indexOf(b.url));
  const rows = [];
  results.forEach(r => r.dead.forEach(d => rows.push([r.url, r.size, d.label, d.note, d.path])));
  console.log(`\n${rows.length} dead? button(s) at ${W}x${H}${MOBILE ? ' mobile' : ''}`);
  if (rows.length) {
    const head = ['page', 'size', 'button', 'note', 'selector'];
    const wd = head.map((h, k) => Math.min(k === 4 ? 70 : 40, Math.max(h.length, ...rows.map(r => String(r[k]).length))));
    const fmt = r => r.map((v, k) => String(v).slice(0, wd[k]).padEnd(wd[k])).join(' | ');
    console.log(fmt(head)); console.log(wd.map(n => '-'.repeat(n)).join('-+-'));
    rows.forEach(r => console.log(fmt(r)));
  }
  const sel = results.filter(r => r.selectedNoop);
  if (sel.length) console.log('\nAlready selected, tap again does nothing (fine): ' + sel.map(r => `${r.url} [${r.selectedNoop.join('] [')}]`).join(', '));
  const nr = results.filter(r => r.notReached.length);
  if (nr.length) console.log('\nNot reached (hidden when their turn came, or time cap): ' + nr.map(r => `${r.url} (${r.notReached.length})`).join(', '));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(results, null, 1));
  process.exit(0);
})();
