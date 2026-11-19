// All-in-one verification runner for Toybox changes.
//
// Usage:
//   node tools/verify.js [pages-or-files...] [--all-sizes] [--no-shots] [--no-playtest]
//
// If no targets are given, discovers changed pages via tools/changed-pages.js origin/main HEAD,
// falling back to uncommitted changes in git status --porcelain.
// Starts one shared local server on an ephemeral port and passes PORT to every child tool.

const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { startServer } = require('./serve');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const opts = { targets: [], allSizes: false, noShots: false, noPlaytest: false };
  for (const a of argv) {
    if (a === '--all-sizes') opts.allSizes = true;
    else if (a === '--no-shots') opts.noShots = true;
    else if (a === '--no-playtest') opts.noPlaytest = true;
    else if (a.startsWith('--')) throw new Error('Unknown flag: ' + a);
    else opts.targets.push(a);
  }
  return opts;
}

function normPage(p) {
  let s = p.replace(/^\.\//, '').replace(/\\/g, '/');
  if (s.endsWith('/index.html')) s = s.slice(0, -'index.html'.length);
  return s;
}

function isPublishedFile(f) {
  return !/^(tools|archive|plans|docs|\.github|\.agents)\//.test(f) && !/\.md$/.test(f) && !/(^|\/)sw\.js$/.test(f);
}

function folderLintFiles(folder) {
  const dir = path.join(ROOT, folder);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    const rel = (folder ? folder + '/' : '') + e.name;
    if (/\.(html|js)$/.test(rel) && isPublishedFile(rel)) out.push(rel);
  }
  return out;
}

function swPages() {
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  return [...sw.matchAll(/"\.\/([^"]*\.html)"/g)].map(m => m[1]);
}

function resolveTargets(rawTargets) {
  const pages = new Set();
  const lintFiles = new Set();

  if (rawTargets.length) {
    for (const raw of rawTargets) {
      const clean = raw.replace(/^\.\//, '').replace(/\\/g, '/');
      const full = path.join(ROOT, clean);
      if (clean === '.' || clean === '' || clean.endsWith('/') || (fs.existsSync(full) && fs.statSync(full).isDirectory())) {
        const folder = clean === '.' ? '' : clean.replace(/\/+$/, '');
        pages.add(folder ? folder + '/' : 'index.html');
        folderLintFiles(folder).forEach(f => lintFiles.add(f));
      } else if (clean.endsWith('.html')) {
        pages.add(normPage(clean));
        if (fs.existsSync(full) && isPublishedFile(clean)) lintFiles.add(clean);
        const twinJs = clean.replace(/\.html$/, '.js');
        if (fs.existsSync(path.join(ROOT, twinJs)) && isPublishedFile(twinJs)) lintFiles.add(twinJs);
      } else if (clean.endsWith('.js')) {
        if (fs.existsSync(full) && isPublishedFile(clean)) lintFiles.add(clean);
        const twinHtml = clean.replace(/\.js$/, '.html');
        if (fs.existsSync(path.join(ROOT, twinHtml))) {
          pages.add(normPage(twinHtml));
        } else if (clean.includes('/')) {
          const folder = clean.split('/')[0];
          if (fs.existsSync(path.join(ROOT, folder, 'index.html'))) pages.add(folder + '/');
        }
      } else {
        pages.add(clean);
      }
    }
    return { pages: [...pages], lintFiles: [...lintFiles] };
  }

  // Auto-discover from git diff origin/main HEAD plus uncommitted changes.
  let diffPages = [];
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, 'changed-pages.js'), 'origin/main', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    if (out) diffPages = out.split('\n').filter(Boolean);
  } catch (e) { /* ignore */ }

  let changedFiles = [];
  try {
    const out = execFileSync('git', ['diff', '--name-only', 'origin/main', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    if (out) changedFiles = out.split('\n').filter(Boolean);
  } catch (e) { /* ignore */ }

  // Also check uncommitted changes (staged, unstaged, untracked).
  try {
    const status = execFileSync('git', ['status', '--porcelain', '-uall'], { cwd: ROOT, encoding: 'utf8' }).trimEnd();
    if (status) {
      const dirty = status.split('\n').filter(Boolean).map(line => {
        const p = line.slice(3).trim();
        const arrow = p.indexOf(' -> ');
        return arrow >= 0 ? p.slice(arrow + 4) : p;
      });
      changedFiles.push(...dirty);
      const allSw = swPages();
      const dirtyFolders = new Set();
      let dirtyAll = false;
      let dirtyLauncher = false;
      for (const f of dirty) {
        if ((f.startsWith('common/') && !/\.md$/.test(f)) || f === 'sw.js') { dirtyAll = true; break; }
        if (!isPublishedFile(f)) continue;
        if (!f.includes('/')) { if (f === 'index.html') dirtyLauncher = true; continue; }
        dirtyFolders.add(f.split('/')[0]);
      }
      if (dirtyAll) {
        diffPages = allSw;
      } else {
        for (const p of allSw) {
          if (p === 'index.html' ? dirtyLauncher : dirtyFolders.has(p.split('/')[0])) diffPages.push(p);
        }
        // Include brand-new app folders not yet in sw.js.
        for (const folder of dirtyFolders) {
          if (fs.existsSync(path.join(ROOT, folder, 'index.html'))) {
            diffPages.push(folder + '/');
          }
        }
      }
    }
  } catch (e) { /* ignore */ }

  for (const p of diffPages) pages.add(normPage(p) || 'index.html');
  for (const f of changedFiles) {
    if (/\.(html|js)$/.test(f) && isPublishedFile(f) && fs.existsSync(path.join(ROOT, f))) {
      lintFiles.add(f);
    }
  }
  return { pages: [...pages], lintFiles: [...lintFiles] };
}

function hasPlaytestHook(pageUrl, defaultSet) {
  const n = normPage(pageUrl);
  if (defaultSet.has(n)) return true;
  // Also allow scaffolded apps using window.__toybox.
  const htmlPath = n.endsWith('.html') ? n : (n ? n + 'index.html' : 'index.html');
  const candidates = [htmlPath, htmlPath.replace(/\.html$/, '.js')];
  for (const rel of candidates) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      const src = fs.readFileSync(full, 'utf8');
      if (/window\.__(toybox|farm|forge|sweet|ice|truck)\b/.test(src)) return true;
    }
  }
  return false;
}

function runStep(label, args, extraEnv) {
  console.log(`\n==> ${label}`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
    });
    child.on('close', (code) => {
      resolve({ label, ok: code === 0, code: code ?? 1 });
    });
    child.on('error', (err) => {
      console.error(err.message);
      resolve({ label, ok: false, code: 1 });
    });
  });
}

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const { pages, lintFiles } = resolveTargets(opts.targets);

  const playtestMod = require('./playtest');
  const defaultPlaytestSet = new Set((playtestMod.DEFAULT_PAGES || []).map(normPage));
  const playtestPages = pages.filter(p => hasPlaytestHook(p, defaultPlaytestSet));

  console.log(`verify: ${pages.length} target page(s)${pages.length ? ': ' + pages.join(', ') : ''}`);

  const srv = await startServer(ROOT, 0);
  const envBase = { PORT: String(srv.port) };
  const results = [];

  try {
    results.push(await runStep('check-site', [path.join(__dirname, 'check-site.js')], envBase));
    results.push(await runStep('check-rules', [path.join(__dirname, 'check-rules.js')], envBase));

    const lintArgs = [path.join(__dirname, 'lint.js'), ...lintFiles];
    results.push(await runStep(
      `lint (${lintFiles.length ? lintFiles.length + ' file(s)' : 'all published'})`,
      lintArgs,
      { ...envBase, QUIET: '1' }
    ));

    if (pages.length) {
      results.push(await runStep(
        'smoke (phone 390x844)',
        [path.join(__dirname, 'smoke.js'), ...pages],
        { ...envBase, SIZE: '390x844', MOBILE: '1' }
      ));
      results.push(await runStep(
        'smoke (iPad 1180x820)',
        [path.join(__dirname, 'smoke.js'), ...pages],
        { ...envBase, SIZE: '1180x820', MOBILE: '0' }
      ));

      if (!opts.noShots) {
        for (const p of pages) {
          const shotArgs = [path.join(__dirname, 'shot.js'), p];
          if (opts.allSizes) shotArgs.push('--sizes', 'all');
          results.push(await runStep(`shot (${p})`, shotArgs, envBase));
        }
      }

      if (!opts.noPlaytest && playtestPages.length) {
        results.push(await runStep(
          `playtest (${playtestPages.length} page(s))`,
          [path.join(__dirname, 'playtest.js'), ...playtestPages],
          envBase
        ));
      }
    } else {
      console.log('\n==> No target pages changed; skipping smoke, shot, and playtest.');
    }
  } finally {
    await srv.close();
  }

  console.log('\n=== Verify Summary ===');
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`);
  }
  console.log(`\n${results.length - failed}/${results.length} step(s) passed.`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
