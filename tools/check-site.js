// Offline check: every file of the published site is in the top-level sw.js CORE, and every CORE entry exists.
// A page or file missing from CORE silently doesn't work offline (on the plane); a CORE entry that doesn't exist
// makes the service worker's install fail, so nothing new gets saved.
//
// Usage: node tools/check-site.js [site folder]   (default: the repo root; CI runs it on the staged _site folder)
// Not part of the site (never cached): sw.js files (the Toybox-wide worker and the apps' retire stubs), Markdown,
// and the dev folders tools/, archive/, .github/ (the deploy leaves those out). No dependencies; exits 1 on a problem.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SKIP_DIRS = new Set(['.git', '.github', 'tools', 'archive', 'node_modules']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join('/');
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out); }
    else if (!/(^|\/)sw\.js$/.test(rel) && !/\.md$/.test(rel) && !e.name.startsWith('.')) out.push(rel);
  }
  return out;
}

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const block = /const CORE = \[([\s\S]*?)\];/.exec(sw);
if (!block) { console.error('check-site: no CORE list in sw.js'); process.exit(1); }
const core = (block[1].match(/"\.\/[^"]*"/g) || []).map(s => s.slice(3, -1));

const problems = [];
const inCore = new Set();
for (const u of core) {
  if (u === '' || u.endsWith('/')) {
    // A folder URL is served by its index.html.
    if (!fs.existsSync(path.join(ROOT, u, 'index.html'))) problems.push('in CORE but missing: ./' + u + ' (no index.html)');
  } else {
    if (inCore.has(u)) problems.push('listed twice in CORE: ./' + u);
    inCore.add(u);
    if (!fs.existsSync(path.join(ROOT, u))) problems.push('in CORE but missing: ./' + u);
  }
}
for (const f of walk(ROOT, [])) {
  if (!inCore.has(f)) problems.push('not in CORE (won\'t work offline): ./' + f);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error('\nFix the CORE list in sw.js (tools/add-app.py adds a new app\'s files).');
  process.exit(1);
}
console.log('check-site: ok, ' + core.length + ' CORE entries, every site file is cached offline');
