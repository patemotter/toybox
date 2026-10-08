// Text-fit finder: loads every page at the phone and iPad sizes, opens each tab of the panel, and reports text
// that doesn't fit its box (a label cut off by its button or tile, an ellipsis "…", text running off screen).
//
// Usage (from the repo root, with a local server running):
//   npx http-server . -p 8120 -c-1 -s &
//   NODE_PATH=$(npm root -g) node tools/fit.js                        # every page in the top-level sw.js CORE
//   NODE_PATH=$(npm root -g) SIZES=1180x820 node tools/fit.js workshop/router-table.html
// Options (environment): PORT (default 8120), SIZES (comma list, default the five test sizes),
//   CHANNEL=chrome (installed Chrome), SHOTS=dir (a picture of each page/size/tab with a problem).
// The Baloo 2 font is loaded through curl (not blocked), because a fallback font measures differently. Every phone and iPad
// size is emulated as a touch device, like the home-screen app. Always exits 0: a finder for a person to triage.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const PORT = process.env.PORT || 8120;
const BASE = 'http://localhost:' + PORT + '/';
const SIZES = (process.env.SIZES || '390x844,844x390,820x1180,1180x820,1024x1366').split(',');
const SHOTS = process.env.SHOTS || '';

function allPages() {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  return (sw.match(/"\.\/[^"]*\.html"/g) || []).map(s => s.slice(3, -1));
}

// Runs in the page: every visible text node whose box doesn't hold it.
function audit() {
  const out = [];
  const W = innerWidth, H = innerHeight;
  const BOXY = 'button,a,[role=button],[role=tab],[role=radio],[role=option],.btn,.tb-tile,label,select';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const text = n.nodeValue.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const el = n.parentElement;
    if (!el || el.closest('script,style,[hidden],[aria-hidden="true"],.sr-only')) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible' || +cs.opacity === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const rs = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
    if (!rs.length) continue;
    const t = { l: Math.min(...rs.map(r => r.left)), r: Math.max(...rs.map(r => r.right)),
                t: Math.min(...rs.map(r => r.top)), b: Math.max(...rs.map(r => r.bottom)) };
    if (t.r < 0 || t.l > W || t.b < 0 || t.t > H) continue;           // wholly off screen: a hidden tray etc.
    // invisible because an ancestor is hidden or has no size
    let hiddenAnc = false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) { hiddenAnc = true; break; }
    }
    if (hiddenAnc) continue;
    const where = el.closest(BOXY) || el;
    const label = (where.id ? '#' + where.id : where.tagName.toLowerCase() + (where.className && typeof where.className === 'string' ? '.' + where.className.trim().split(/\s+/).join('.') : ''));
    const report = (kind, by) => out.push({ text: text.slice(0, 40), kind, el: label.slice(0, 60), by: Math.round(by) });
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) { report('ellipsis', el.scrollWidth - el.clientWidth); continue; }
    // the first box around the text: a button/tile, or anything that clips its content
    let hit = false;
    for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const s = getComputedStyle(a);
      const clips = s.overflowX !== 'visible' || s.overflowY !== 'visible';
      const boxy = a.matches(BOXY);
      if (!clips && !boxy) continue;
      const b = a.getBoundingClientRect();
      const bl = b.left + parseFloat(s.borderLeftWidth), br = b.right - parseFloat(s.borderRightWidth);
      const bt = b.top + parseFloat(s.borderTopWidth), bb = b.bottom - parseFloat(s.borderBottomWidth);
      // line boxes are taller than the letters, so only a big vertical overhang counts
      const slack = 0.3 * (t.b - t.t);
      const over = Math.max(bl - t.l, t.r - br, (bt - t.t) - slack, (t.b - bb) - slack);
      // a scrolling box (a tray, the Grown-ups sheet) is meant to hold more than it shows
      const scrolls = /auto|scroll/.test(s.overflowX + s.overflowY) && !boxy;
      if (over > 1.5 && !scrolls) { report(boxy ? 'cut by its box' : 'clipped', over); hit = true; }
      break;
    }
    if (hit) continue;
    // past the screen edge counts, unless it sits in a scrolling row or list he can scroll to it
    let inScroller = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (/auto|scroll/.test(s.overflowX + s.overflowY) && (a.scrollWidth > a.clientWidth || a.scrollHeight > a.clientHeight)) { inScroller = true; break; }
    }
    const off = Math.max(-t.l, t.r - W, -t.t, t.b - H);
    if (off > 1.5 && !inScroller) report('off screen', off);
  }
  return out;
}

// Google Fonts through curl (it honours HTTPS_PROXY), cached on disk; blocked if curl can't reach them.
const FONT_DIR = path.join(require('os').tmpdir(), 'toybox-fontcache');
async function routeFonts(ctx) {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async route => {
    const url = route.request().url();
    const f = path.join(FONT_DIR, crypto.createHash('md5').update(url).digest('hex'));
    try {
      if (!fs.existsSync(f)) execFileSync('curl', ['-sSLf', '-A', 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120 Safari/537.36', '-o', f, url], { timeout: 20000 });
      await route.fulfill({ body: fs.readFileSync(f), contentType: /googleapis/.test(url) ? 'text/css' : 'font/woff2',
        headers: { 'access-control-allow-origin': '*' } });
    } catch (e) { await route.abort(); }
  });
}

async function tabsOf(page) {
  return page.$$eval('.tb-tabs button, .tb-tabs [role=tab], [role=tablist] [role=tab]', els => els
    .filter(e => !e.matches('.tb-new,.tb-surprise') && e.offsetParent && !e.disabled)
    .map(e => (e.textContent || e.getAttribute('aria-label') || '').trim()));
}

async function runPage(browser, url, size) {
  const [w, h] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('workshop-gear', 'on');
      sessionStorage.setItem('workshop-check-skip', '1');
      sessionStorage.setItem('site-gear', 'on');
      sessionStorage.setItem('kitchen-ready', 'on');
      sessionStorage.setItem('toybox-launch', 'fit' + Date.now() + Math.random());
      ['train-builder', 'construction-site', 'concrete', 'workshop', 'kitchen'].forEach(a => sessionStorage.setItem('toybox-turn-ok:' + a, '1'));
      const s = JSON.parse(localStorage.getItem('toybox-settings-v1') || '{}');
      s['kind-words'] = false;
      localStorage.setItem('toybox-settings-v1', JSON.stringify(s));
    } catch (e) { /* ignore */ }
    const st = document.createElement('style');
    st.textContent = '.ghosthand{visibility:hidden!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
  });
  await routeFonts(ctx);
  const page = await ctx.newPage();
  const found = [];
  try {
    await page.goto(BASE + url, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(1200);
    const play = await page.$('.tb-turn:not([hidden]) button');
    if (play) { await play.click().catch(() => {}); await page.waitForTimeout(500); }
    const shot = async tab => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, (url + '-' + size + '-' + (tab || 'first')).replace(/[^\w.-]+/g, '_') + '.png') }); };
    let r = await page.evaluate(audit);
    if (r.length) { found.push(...r.map(x => Object.assign(x, { tab: '' }))); await shot(''); }
    for (const tab of await tabsOf(page)) {
      const b = page.locator('.tb-tabs button, .tb-tabs [role=tab], [role=tablist] [role=tab]').filter({ hasText: tab }).first();
      if (!(await b.count())) continue;
      await b.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(600);
      r = await page.evaluate(audit);
      if (r.length) { found.push(...r.map(x => Object.assign(x, { tab }))); await shot(tab); }
    }
  } catch (e) {
    found.push({ text: '(page failed: ' + e.message.slice(0, 80) + ')', kind: 'error', el: '', by: 0, tab: '' });
  }
  await ctx.close();
  // one line per distinct problem
  const seen = new Set();
  return found.filter(f => { const k = f.text + '|' + f.el + '|' + f.kind; if (seen.has(k)) return false; seen.add(k); return true; });
}

(async () => {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : allPages();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const opts = process.env.CHANNEL ? { channel: process.env.CHANNEL } : {};
  const browser = await chromium.launch(opts);
  let total = 0;
  for (const url of pages) {
    for (const size of SIZES) {
      const found = await runPage(browser, url, size);
      for (const f of found) {
        total++;
        console.log([url, size, f.tab ? 'tab ' + f.tab : '-', f.kind, f.by + 'px', JSON.stringify(f.text), f.el].join('  '));
      }
    }
  }
  console.log(total ? total + ' text-fit problem(s).' : 'Every label fits.');
  await browser.close();
})();
