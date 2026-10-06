// Quick smoke test: load pages, do one drag on the main canvas/SVG, report page errors.
// Usage (from the repo root, with a local server running):
//   npx http-server . -p 8120 -c-1 -s &
//   node tools/smoke.js workshop/ workshop/drill-press.html spin-shop/
// Options (environment): PORT (default 8120), SIZE (default 1180x820), MOBILE=1 for touch/isMobile,
// CHANNEL=chrome to drive an installed Google Chrome when Playwright's own Chromium isn't downloaded.
// If Playwright is installed globally, run with NODE_PATH=$(npm root -g).
// Workshop and Construction Site gear flags are set so station pages don't redirect to the gear-up.
// Needs Playwright (Chromium). Google Fonts are blocked so pages don't wait on the network.
const { chromium } = require('playwright');
const pages = process.argv.slice(2);
const port = process.env.PORT || 8120;
const [w, h] = (process.env.SIZE || '1180x820').split('x').map(Number);
const mobile = process.env.MOBILE === '1';
(async () => {
  const b = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  let bad = 0;
  for (const url of pages) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: mobile });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem('workshop-gear', 'on');
        sessionStorage.setItem('workshop-check-skip', '1');
        sessionStorage.setItem('site-gear', 'on');
      } catch (e) { /* ignore */ }
    });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    try {
      await p.goto(`http://localhost:${port}/` + url, { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(1500);
      const c = await p.$('canvas, svg');
      if (c) {
        const bb = await c.boundingBox();
        if (bb) {
          await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down();
          await p.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 - 60, { steps: 8 }); await p.mouse.up();
        }
      }
      await p.waitForTimeout(500);
      const scroll = await p.evaluate(() => [document.documentElement.scrollWidth > innerWidth, document.documentElement.scrollHeight > innerHeight]);
      if (url && (scroll[0] || scroll[1])) errs.push('page scrolls ' + JSON.stringify(scroll));
    } catch (e) { errs.push('LOAD ' + e.message.slice(0, 100)); }
    if (errs.length) bad++;
    console.log((errs.length ? 'ERR ' : 'ok  ') + (url || '(launcher)') + (errs.length ? '  ' + errs.join(' | ') : ''));
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
