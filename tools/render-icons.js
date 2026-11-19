// Render the four PNG app icons from an input SVG using Playwright Chromium.
//
// Usage:
//   node tools/render-icons.js <input.svg> <app-folder> [--bg "#CDE9FF"]
//
// Generates in <app-folder>/icons/:
//   icon-180.png          (180x180, full bleed)
//   icon-192.png          (192x192, full bleed)
//   icon-512.png          (512x512, full bleed)
//   icon-maskable-512.png (512x512, --bg fill with SVG centered in the 80% safe zone)

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parseArgs(argv) {
  const opts = { svg: null, appDir: null, bg: '#CDE9FF' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--bg') {
      opts.bg = argv[++i];
    } else if (a.startsWith('--bg=')) {
      opts.bg = a.slice(5);
    } else if (!opts.svg) {
      opts.svg = a;
    } else if (!opts.appDir) {
      opts.appDir = a;
    } else {
      throw new Error('Unknown argument: ' + a);
    }
  }
  if (opts.svg && !opts.appDir && fs.existsSync(opts.svg) && fs.statSync(opts.svg).isDirectory()) {
    opts.appDir = opts.svg;
    opts.svg = path.join(opts.appDir, 'icons', 'icon.svg');
  }
  if (!opts.svg || !opts.appDir) {
    throw new Error('Usage: node tools/render-icons.js <input.svg> <app-folder> [--bg "#CDE9FF"]');
  }
  return opts;
}

const TARGETS = [
  { file: 'icon-180.png', size: 180, maskable: false },
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const svgPath = path.resolve(opts.svg);
  if (!fs.existsSync(svgPath)) throw new Error('SVG not found: ' + svgPath);

  const svgText = fs.readFileSync(svgPath, 'utf8');
  const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svgText, 'utf8').toString('base64');

  const iconsDir = path.join(path.resolve(opts.appDir), 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  try {
    for (const t of TARGETS) {
      const ctx = await browser.newContext({
        viewport: { width: t.size, height: t.size },
        deviceScaleFactor: 1,
      });
      const page = await ctx.newPage();
      const pad = t.maskable ? '10%' : '0';
      const bg = t.maskable ? opts.bg : 'transparent';
      await page.setContent(`<!doctype html>
<html>
<head><style>
  html, body { margin: 0; padding: 0; width: ${t.size}px; height: ${t.size}px; overflow: hidden; background: ${bg}; }
  body { display: flex; align-items: center; justify-content: center; box-sizing: border-box; padding: ${pad}; }
  img { width: 100%; height: 100%; object-fit: contain; display: block; }
</style></head>
<body><img id="ic" src="${dataUri}" alt=""></body>
</html>`, { waitUntil: 'load' });
      await page.evaluate(async () => {
        const img = document.getElementById('ic');
        if (img && img.decode) await img.decode();
      });

      const outPath = path.join(iconsDir, t.file);
      await page.screenshot({ path: outPath, omitBackground: !t.maskable });
      const bytes = fs.statSync(outPath).size;
      console.log(`${path.relative(process.cwd(), outPath)}  (${t.size}x${t.size}, ${bytes} bytes)`);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
