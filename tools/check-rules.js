// Static invariant checker for published Toybox files (zero dependencies).
//
// Usage:
//   node tools/check-rules.js                  # check every published file in the repo
//   node tools/check-rules.js forge/index.html # check only specific file(s)
//
// Exits 0 if clean, 1 if any rule violation is found.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// _site is the deploy's build of the published files; it repeats every page under another path.
const SKIP_DIRS = new Set(['tools', 'archive', 'plans', 'docs', 'node_modules', '_site']);

const ALLOWED_URL_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.w3.org',
  'patemotter.com',
]);

// Existing retired per-app service worker stubs only; new apps must NEVER add a sw.js.
const RETIRED_SW_ALLOW = new Set([
  '3d-printer/sw.js',
  'bubble-machine/sw.js',
  'car-builder/sw.js',
  'construction-site/sw.js',
  'espresso-machine/sw.js',
  'garden/sw.js',
  'gear-box/sw.js',
  'hamster/sw.js',
  'jigsaw/sw.js',
  'kaleidoscope/sw.js',
  'kitchen/sw.js',
  'marble-run/sw.js',
  'math-grid/sw.js',
  'peg-drop/sw.js',
  'rocket-builder/sw.js',
  'sand-table/sw.js',
  'spin-shop/sw.js',
  'spinning-tops/sw.js',
  'spirograph/sw.js',
  'train-builder/sw.js',
  'water-works/sw.js',
  'workshop/sw.js',
]);

// Redirect pages and launcher that do not use the standard app header shell.
const SHELL_EXEMPT = new Set([
  'index.html',
  'workshop/tool-wall.html',
  'farm/field.html',
]);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(full, out);
    } else if (!/\.md$/.test(rel) && !e.name.startsWith('.')) {
      out.push(rel);
    }
  }
  return out;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// Replace JS/CSS comments with spaces (preserving newlines) so comment mentions don't trip code rules.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
}

function findToyboxInitCalls(code) {
  const calls = [];
  const needle = 'Toybox.init(';
  let idx = 0;
  while ((idx = code.indexOf(needle, idx)) !== -1) {
    let i = idx + needle.length;
    let depth = 1;
    while (i < code.length && depth > 0) {
      const ch = code[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    calls.push({ index: idx, body: code.slice(idx, i) });
    idx = i;
  }
  return calls;
}

function checkFile(rel, issues) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return;

  // b) No new per-app sw.js files
  if (/(^|\/)sw\.js$/.test(rel)) {
    if (rel !== 'sw.js' && !RETIRED_SW_ALLOW.has(rel)) {
      issues.push(`${rel}: per-app sw.js is forbidden (the top-level sw.js serves every app offline)`);
    }
    return;
  }

  if (!/\.(html|js|css)$/.test(rel)) return;
  const raw = fs.readFileSync(full, 'utf8');
  const code = stripComments(raw);

  // a) No unauthorized external URLs
  for (const m of raw.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
    const host = m[1].toLowerCase();
    if (!ALLOWED_URL_HOSTS.has(host)) {
      issues.push(`${rel}:${lineAt(raw, m.index)}: unauthorized external URL host "${host}"`);
    }
  }

  // c) No tilt/shake motion APIs
  for (const m of code.matchAll(/\b(DeviceMotionEvent|DeviceOrientationEvent|devicemotion|deviceorientation)\b/g)) {
    issues.push(`${rel}:${lineAt(code, m.index)}: tilt/shake motion API "${m[1]}" is not allowed`);
  }

  // d) No direct new AudioContext / webkitAudioContext outside common/
  if (/\.(html|js)$/.test(rel) && !rel.startsWith('common/')) {
    for (const m of code.matchAll(/\bnew\s+(?:window\.)?(?:webkit)?AudioContext\b/g)) {
      issues.push(`${rel}:${lineAt(code, m.index)}: direct "${m[0]}" outside common/ (use Toybox.sound.ready())`);
    }
  }

  // e) No big: in Toybox.init outside common/
  if (/\.(html|js)$/.test(rel) && !rel.startsWith('common/')) {
    for (const call of findToyboxInitCalls(code)) {
      const bm = /\bbig\s*:/.exec(call.body);
      if (bm) {
        issues.push(`${rel}:${lineAt(code, call.index + bm.index)}: "big:" in Toybox.init is removed (do not add a Big button)`);
      }
    }
  }

  // f) App page shell invariants
  if (rel.endsWith('.html') && !SHELL_EXEMPT.has(rel)) {
    if (!/common\/toybox\.css/.test(raw)) {
      issues.push(`${rel}: missing common/toybox.css`);
    }
    if (!/common\/toybox\.js/.test(raw)) {
      issues.push(`${rel}: missing common/toybox.js`);
    }
    if (!/\btb-title\b/.test(raw)) {
      issues.push(`${rel}: missing tb-title heading in app header`);
    }
  }
}

const args = process.argv.slice(2);
const files = args.length
  ? args.map(a => path.relative(ROOT, path.resolve(ROOT, a)).split(path.sep).join('/'))
  : walk(ROOT, []);

const issues = [];
for (const f of files) checkFile(f, issues);

if (issues.length) {
  for (const msg of issues) console.error('FAIL ' + msg);
  console.error(`\ncheck-rules: ${issues.length} violation(s) across ${files.length} file(s)`);
  process.exit(1);
}
console.log(`check-rules: ok, ${files.length} file(s) checked, 0 violations`);
