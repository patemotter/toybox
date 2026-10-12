// Prints the pages (from the top-level sw.js CORE) touched by a git range, one per line, for the CI report job.
//
// Usage: node tools/changed-pages.js <base> [<head>]     # e.g. origin/main HEAD, or a push's before..after
//        node tools/changed-pages.js all                 # every page
// A change to common/, sw.js or a base it can't read means every page. Otherwise a page is listed when a
// changed file sits in its app folder (so a changed workshop/saw-bench.js lists every Workshop page), and
// the launcher when the top-level index.html changed. Docs, tools/, plans/ and archive/ list nothing.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const pages = [...sw.matchAll(/"\.\/([^"]*\.html)"/g)].map(m => m[1]);

function all() { console.log(pages.join('\n')); process.exit(0); }

const [base, head = 'HEAD'] = process.argv.slice(2);
if (!base || base === 'all' || /^0+$/.test(base)) all();
let files;
try {
  files = execFileSync('git', ['diff', '--name-only', base, head], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (e) { all(); }

if (files.some(f => f.startsWith('common/') || f === 'sw.js')) all();
const folders = new Set();
let launcher = false;
for (const f of files) {
  if (/\.md$/.test(f) || /^(tools|plans|archive|\.github)\//.test(f)) continue;
  if (!f.includes('/')) { if (f === 'index.html') launcher = true; continue; }
  folders.add(f.split('/')[0]);
}
const out = pages.filter(p => (p === 'index.html' ? launcher : folders.has(p.split('/')[0])));
if (out.length) console.log(out.join('\n'));
