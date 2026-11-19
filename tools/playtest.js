// Automated playthrough tester: loads pages with ?debug and steps through them via their debug hooks,
// asserting zero pageerrors and real state progression.
//
// Usage:
//   node tools/playtest.js                             # all supported pages
//   node tools/playtest.js farm/woods.html forge/      # specific page(s)
//
// Options (environment):
//   PORT (reuse running server), CONC (parallel contexts, default 4),
//   MAX_STEPS (step cap per page, default 40), PAGE_MS (time cap per page, default 30000),
//   CHANNEL (browser channel, e.g. chrome).
//
// Exits 0 if every page passes, 1 on any failure.

const { chromium } = require('playwright');
const { ensureServer } = require('./serve');

const DEFAULT_PAGES = [
  'farm/spuds.html',
  'farm/combine.html',
  'farm/bales.html',
  'farm/silage.html',
  'farm/carrots.html',
  'farm/muck.html',
  'farm/woods.html',
  'farm/berries.html',
  'farm/cows.html',
  'farm/sheep.html',
  'farm/hens.html',
  'farm/tracks.html',
  'farm/ewe.html',
  'farm/mushrooms.html',
  'forge/',
  'sweet-shop/',
  'ice-cream/',
  'garbage-truck/',
];

const CONC = Math.max(1, Number(process.env.CONC || 4));
const MAX_STEPS = Math.max(5, Number(process.env.MAX_STEPS || 40));
const PAGE_MS = Math.max(5000, Number(process.env.PAGE_MS || 30000));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function stateSig(hook, s) {
  if (!s || typeof s !== 'object') return String(s);
  if (hook === 'farm') {
    return JSON.stringify([
      s.phase, s.step, s.sub, s.key, s.want, s.part, s.finished, s.done,
      s.loads, s.count, s.beds, s.counted, s.punnets, s.picked, s.wheels, s.knocks, s.wire,
    ]);
  }
  if (hook === 'forge') {
    return JSON.stringify([
      s.step, s.stepIndex, s.where, s.want, s.rack,
      s.twist, s.tabTh, s.endTh, s.neck, s.depth, s.rivet, s.shine,
    ]);
  }
  if (hook === 'sweet') {
    return JSON.stringify([s.step, s.flavor, s.filled, s.coats, s.jar, s.wanted]);
  }
  if (hook === 'ice') {
    return JSON.stringify([
      s.phase, s.wanted, s.served,
      s.build && s.build.holder, s.build && s.build.scoops, s.build && s.build.tops,
      s.build && s.build.milk, s.build && s.build.mix, s.build && s.build.pour,
    ]);
  }
  if (hook === 'truck') {
    return JSON.stringify([s.ph, s.want, s.seg, s.grip, s.hopper, s.full, s.pk, s.comp]);
  }
  return JSON.stringify(s);
}

async function detectHook(page) {
  return page.evaluate(() => {
    if (window.__toybox && typeof window.__toybox.state === 'function' && typeof window.__toybox.next === 'function') return 'toybox';
    if (window.__farm && typeof window.__farm.state === 'function') return 'farm';
    if (window.__forge && typeof window.__forge.state === 'function' && typeof window.__forge.auto === 'function') return 'forge';
    if (window.__sweet && typeof window.__sweet.state === 'function' && typeof window.__sweet.tap === 'function') return 'sweet';
    if (window.__ice && typeof window.__ice.state === 'function' && typeof window.__ice.tap === 'function') return 'ice';
    if (window.__truck && typeof window.__truck.state === 'function' && typeof window.__truck.tap === 'function') return 'truck';
    return null;
  });
}

async function readState(page, hook) {
  return page.evaluate((h) => {
    const obj = {
      toybox: window.__toybox,
      farm: window.__farm,
      forge: window.__forge,
      sweet: window.__sweet,
      ice: window.__ice,
      truck: window.__truck,
    }[h];
    return obj && obj.state ? obj.state() : null;
  }, hook);
}

async function stepOnce(page, hook, s) {
  if (hook === 'toybox') {
    await page.evaluate(() => window.__toybox.next());
    return { acted: true, waitMs: 120 };
  }

  if (hook === 'forge') {
    const act = await page.evaluate(() => window.__forge.auto());
    return { acted: act !== 'wait', waitMs: act === 'wait' ? 250 : 120 };
  }

  if (hook === 'sweet') {
    if (s.busy || !s.wanted) return { acted: false, waitMs: 250 };
    const part = s.wanted === 'bottles' ? 'bottle0' : (s.wanted === 'bowls' ? 'bowl0' : s.wanted);
    await page.evaluate((w) => window.__sweet.tap(w), part);
    return { acted: true, waitMs: 250 };
  }

  if (hook === 'ice') {
    if (s.busy || !s.wanted) return { acted: false, waitMs: 250 };
    await page.evaluate((w) => window.__ice.tap(w), s.wanted);
    return { acted: true, waitMs: 250 };
  }

  if (hook === 'truck') {
    if (!s.want) return { acted: false, waitMs: 250 };
    const partMap = {
      drive: 'cab', landfill: 'cab', next: 'cab',
      reach: 'arm', lift: 'arm', down: 'arm',
      pack: 'packer', gate: 'gate', tip: 'body',
    };
    const part = partMap[s.want] || s.want;
    const ok = await page.evaluate((w) => window.__truck.tap(w), part);
    return { acted: !!ok, waitMs: 350 };
  }

  if (hook === 'farm') {
    if (s.phase === 'done' || s.finished || s.done) {
      return { done: true };
    }
    if (s.phase && s.phase !== 'ready') {
      return { acted: false, waitMs: 250 };
    }
    const mode = await page.evaluate((st) => {
      const f = window.__farm;
      if (typeof f.next === 'function') {
        f.next();
        return { kind: 'next' };
      }
      const w = st.want || st.part;
      if (w && typeof f.tap === 'function') {
        f.tap(w);
        return { kind: 'tap', w };
      }
      if (typeof f.target === 'function') {
        const pt = f.target();
        if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
          return { kind: 'click', x: pt.x, y: pt.y };
        }
      }
      if (typeof f.want === 'function') {
        const pt = f.want();
        if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
          return { kind: 'click', x: pt.x, y: pt.y };
        }
      }
      return { kind: 'wait' };
    }, s);

    if (mode.kind === 'click') {
      await page.mouse.click(mode.x, mode.y);
      return { acted: true, waitMs: 250 };
    }
    if (mode.kind === 'next' || mode.kind === 'tap') {
      return { acted: true, waitMs: 250 };
    }
    return { acted: false, waitMs: 250 };
  }

  return { acted: false, waitMs: 250 };
}

function isDone(hook, s, initial) {
  if (!s) return false;
  if (hook === 'farm') return s.phase === 'done' || !!s.finished || !!s.done;
  if (hook === 'forge') return (s.rack || 0) > (initial.rack || 0);
  if (hook === 'sweet') return (s.jar || 0) > (initial.jar || 0);
  if (hook === 'ice') return (s.served || 0) > (initial.served || 0);
  return false;
}

async function runPage(browser, baseUrl, pageUrl) {
  const ctx = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    hasTouch: true,
    isMobile: false,
    deviceScaleFactor: 1,
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('workshop-gear', 'on');
      sessionStorage.setItem('workshop-check-skip', '1');
      sessionStorage.setItem('site-gear', 'on');
      sessionStorage.setItem('forge-gear', 'on');
      sessionStorage.setItem('kitchen-ready', 'on');
      sessionStorage.setItem('toybox-launch', 'pt' + Date.now() + Math.random());
      ['train-builder', 'construction-site', 'concrete', 'workshop', 'kitchen', 'farm']
        .forEach(a => sessionStorage.setItem('toybox-turn-ok:' + a, '1'));
      const s = JSON.parse(localStorage.getItem('toybox-settings-v1') || '{}');
      s['kind-words'] = false;
      localStorage.setItem('toybox-settings-v1', JSON.stringify(s));
    } catch (e) { /* ignore */ }
  });

  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 180)));

  const sep = pageUrl.includes('?') ? '&' : '?';
  const fullUrl = `${baseUrl}/${pageUrl}${sep}debug`;
  const t0 = Date.now();
  let hook = null;
  let actions = 0;
  let completed = false;
  const seen = new Set();

  try {
    await page.goto(fullUrl, { waitUntil: 'load', timeout: 20000 });
    await sleep(600);
    const play = await page.$('.tb-turn:not([hidden]) button');
    if (play) { await play.click().catch(() => {}); await sleep(300); }

    hook = await detectHook(page);
    if (!hook) {
      errs.push('no supported ?debug playtest hook found');
    } else {
      const initial = await readState(page, hook);
      seen.add(stateSig(hook, initial));

      const stepLimit = hook === 'toybox' ? Math.min(5, MAX_STEPS) : MAX_STEPS;
      while (actions < stepLimit && Date.now() - t0 < PAGE_MS && !errs.length) {
        const s = await readState(page, hook);
        seen.add(stateSig(hook, s));
        if (isDone(hook, s, initial)) {
          completed = true;
          break;
        }
        const res = await stepOnce(page, hook, s);
        if (res.done) {
          completed = true;
          break;
        }
        if (res.acted) actions++;
        await sleep(res.waitMs || 200);
      }

      const finalState = await readState(page, hook);
      seen.add(stateSig(hook, finalState));
      if (isDone(hook, finalState, initial)) completed = true;

      if (seen.size < 2) {
        errs.push('state did not advance');
      }
    }
  } catch (e) {
    errs.push('FAIL ' + e.message.split('\n')[0].slice(0, 160));
  } finally {
    await ctx.close();
  }

  const ms = Date.now() - t0;
  return { pageUrl, hook, actions, states: seen.size, completed, ms, errs };
}

module.exports = { DEFAULT_PAGES };

if (require.main === module) {
  (async () => {
    const targets = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PAGES;
    const srv = await ensureServer();
    let browser = null;
    const results = [];
    let idx = 0;

    try {
      browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
      async function worker() {
        while (idx < targets.length) {
          const url = targets[idx++];
          const r = await runPage(browser, srv.url, url);
          results.push(r);
          const status = r.errs.length ? 'FAIL' : 'ok  ';
          const detail = r.errs.length
            ? r.errs.join(' | ')
            : `${r.hook}  ${r.actions} act, ${r.states} states${r.completed ? ', completed' : ''} (${(r.ms / 1000).toFixed(1)}s)`;
          console.log(`${status} ${r.pageUrl.padEnd(22)} ${detail}`);
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONC, targets.length) }, worker));
    } finally {
      if (browser) await browser.close();
      await srv.close();
    }

    const failed = results.filter(r => r.errs.length);
    console.log(`\nplaytest: ${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
  })().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
