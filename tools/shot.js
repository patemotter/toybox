// Screenshot tool: load one page at one or more sizes, optionally do a few taps/drags, save pictures, report
// page errors and page scroll. Use it instead of writing a new Playwright script for each change.
//
// Usage (from the repo root, with a local server running):
//   npx http-server . -p 8120 -c-1 -s &
//   node tools/shot.js workshop/saw-bench.html                         # upright phone, first screen
//   node tools/shot.js hamster/ --sizes phone,ipad-wide                 # several sizes
//   node tools/shot.js marble-run/ --sizes all --do "click:#drop" "wait:3000" "shot:after-drop"
//   node tools/shot.js gear-box/ --do "drag:0.5,0.5,0.7,0.4" "tap:0.5,0.3" "wait:1500"
// Sizes: phone (390x844), phone-wide (844x390), ipad (820x1180), ipad-wide (1180x820), ipad-pro (1024x1366),
//   all (those five), or any WxH. Phone sizes are emulated as touch + mobile, iPad sizes as touch.
// Steps (--do, run in order at every size; coordinates <= 1 are fractions of the viewport, else CSS px):
//   tap:x,y             a tap (mouse down/up at one point)
//   drag:x1,y1,x2,y2    a drag in 12 steps
//   click:<selector>    click the first matching element (fails the run if none)
//   wait:<ms>           wait
//   eval:<js>           run JavaScript in the page (e.g. a ?debug hook)
//   shot:<name>         an extra picture now (the final picture is always taken)
// Options: --out <dir> (default /tmp/toybox-shots), --query "<qs>" (appended to the URL, e.g. "debug"),
//   --fresh (a new launch id, as if opened from the home screen). Environment: PORT (default 8120),
//   CHANNEL=chrome (installed Chrome). With Playwright installed globally, run with NODE_PATH=$(npm root -g).
// The page is prepared like tools/buttons.js: gear flags on, the turn-the-device card skipped, kind-words cards
// off, the idle ghost hand hidden, Google Fonts blocked. Exit code 1 on a page error, page scroll or failed step.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SIZES = { phone: '390x844', 'phone-wide': '844x390', ipad: '820x1180', 'ipad-wide': '1180x820', 'ipad-pro': '1024x1366' };
const PORT = process.env.PORT || 8120;

function parseArgs(argv) {
  const o = { page: null, sizes: ['phone'], steps: [], out: '/tmp/toybox-shots', query: '', fresh: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sizes') o.sizes = argv[++i].split(',');
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--query') o.query = argv[++i];
    else if (a === '--fresh') o.fresh = true;
    else if (a === '--do') { while (argv[i + 1] && !argv[i + 1].startsWith('--')) o.steps.push(argv[++i]); }
    else if (!o.page) o.page = a;
    else throw new Error('unknown argument: ' + a);
  }
  if (!o.page) throw new Error('usage: node tools/shot.js <page> [--sizes ...] [--do steps...] [--out dir]');
  if (o.sizes.includes('all')) o.sizes = Object.keys(SIZES);
  return o;
}

function point(vp, x, y) {
  x = Number(x); y = Number(y);
  return [x <= 1 ? x * vp.width : x, y <= 1 ? y * vp.height : y];
}

(async () => {
  const o = parseArgs(process.argv.slice(2));
  fs.mkdirSync(o.out, { recursive: true });
  const slug = o.page.replace(/\/$/, '/index').replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  const b = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  let bad = 0;
  for (const sz of o.sizes) {
    const [w, h] = (SIZES[sz] || sz).split('x').map(Number);
    const mobile = w < 600 || h < 600;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: mobile, deviceScaleFactor: 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript((fresh) => {
      try {
        sessionStorage.setItem('workshop-gear', 'on');
        sessionStorage.setItem('workshop-check-skip', '1');
        sessionStorage.setItem('site-gear', 'on');
        sessionStorage.setItem('kitchen-ready', 'on');
        if (fresh) sessionStorage.setItem('toybox-launch', 'shot' + Date.now());
        ['train-builder', 'construction-site', 'concrete', 'workshop', 'kitchen', 'farm'].forEach(a => sessionStorage.setItem('toybox-turn-ok:' + a, '1'));
        const s = JSON.parse(localStorage.getItem('toybox-settings-v1') || '{}');
        s['kind-words'] = false;
        localStorage.setItem('toybox-settings-v1', JSON.stringify(s));
      } catch (e) { /* ignore */ }
      const st = document.createElement('style');
      st.textContent = '.ghosthand{visibility:hidden!important}';
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st));
    }, o.fresh);
    const p = await ctx.newPage();
    const errs = [];
    const shots = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    const vp = { width: w, height: h };
    const tag = `${slug}-${w}x${h}`;
    try {
      await p.goto(`http://localhost:${PORT}/${o.page}${o.query ? (o.page.includes('?') ? '&' : '?') + o.query : ''}`, { waitUntil: 'load', timeout: 20000 });
      await p.waitForTimeout(1500);
      const play = await p.$('.tb-turn:not([hidden]) button');
      if (play) { await play.click().catch(() => {}); await p.waitForTimeout(400); }
      for (const step of o.steps) {
        const i = step.indexOf(':');
        const kind = i < 0 ? step : step.slice(0, i);
        const arg = i < 0 ? '' : step.slice(i + 1);
        if (kind === 'tap') {
          const [x, y] = point(vp, ...arg.split(','));
          await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up();
          await p.waitForTimeout(300);
        } else if (kind === 'drag') {
          const c = arg.split(',');
          const [x1, y1] = point(vp, c[0], c[1]);
          const [x2, y2] = point(vp, c[2], c[3]);
          await p.mouse.move(x1, y1); await p.mouse.down();
          await p.mouse.move(x2, y2, { steps: 12 }); await p.mouse.up();
          await p.waitForTimeout(300);
        } else if (kind === 'click') {
          const el = await p.$(arg);
          if (!el) { errs.push('no element for click:' + arg); break; }
          await el.click({ force: true });
          await p.waitForTimeout(300);
        } else if (kind === 'wait') {
          await p.waitForTimeout(Number(arg) || 0);
        } else if (kind === 'eval') {
          await p.evaluate(arg);
        } else if (kind === 'shot') {
          const f = path.join(o.out, `${tag}-${arg || shots.length}.png`);
          await p.screenshot({ path: f }); shots.push(f);
        } else {
          errs.push('unknown step: ' + step); break;
        }
      }
      await p.waitForTimeout(500);
      const f = path.join(o.out, `${tag}.png`);
      await p.screenshot({ path: f }); shots.push(f);
      const scroll = await p.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight > innerHeight]);
      if (scroll[0] || scroll[1]) errs.push('page scrolls ' + JSON.stringify(scroll));
    } catch (e) { errs.push('FAIL ' + e.message.split('\n')[0].slice(0, 160)); }
    if (errs.length) bad++;
    console.log(`${errs.length ? 'ERR' : 'ok '} ${w}x${h}  ${shots.join('  ')}${errs.length ? '\n    ' + errs.join('\n    ') : ''}`);
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(2); });
