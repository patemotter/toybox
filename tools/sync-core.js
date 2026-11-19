// Keep the top-level sw.js CORE list in sync with the published files on disk.
//
// Usage:
//   node tools/sync-core.js          # check only: prints missing/extra entries, exits 1 if out of sync
//   node tools/sync-core.js --write  # update CORE in sw.js in place without touching CACHE or other code
//
// Uses the exact same published-file exclusion rules as tools/check-site.js.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SW_PATH = path.join(ROOT, 'sw.js');
const SKIP_DIRS = new Set(['tools', 'archive', 'plans', 'docs', 'node_modules']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    const rel = path.relative(ROOT, full).split(path.sep).join('/');
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(full, out);
    } else if (!/(^|\/)sw\.js$/.test(rel) && !/\.md$/.test(rel) && !e.name.startsWith('.')) {
      out.push(rel);
    }
  }
  return out;
}

function sectionOf(u) {
  if (!u || !u.includes('/')) return '';
  return u.split('/')[0];
}

function sortGroup(entries) {
  const rank = (u) => {
    if (u.endsWith('/')) return 0;
    if (u.endsWith('/index.html') || u === 'index.html') return 1;
    if (u.endsWith('.html')) return 2;
    if (u.endsWith('.js') || u.endsWith('.css')) return 3;
    if (u.endsWith('.webmanifest')) return 4;
    if (u.includes('/icons/') || u.startsWith('icons/')) return 5;
    return 6;
  };
  return entries.slice().sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function run(write) {
  const sw = fs.readFileSync(SW_PATH, 'utf8');
  const match = /(const CORE = \[)([\s\S]*?)(\];)/.exec(sw);
  if (!match) {
    console.error('sync-core: no CORE list in sw.js');
    process.exit(1);
  }

  const published = walk(ROOT, []).sort();
  const publishedSet = new Set(published);

  // Expected folder URLs (root "./" and any top-level "<app>/" that has an index.html).
  const expectedFolders = new Set();
  if (publishedSet.has('index.html')) expectedFolders.add('');
  for (const f of published) {
    const m = /^([^/]+)\/index\.html$/.exec(f);
    if (m) expectedFolders.add(m[1] + '/');
  }

  const body = match[2];
  const rawLines = body.split('\n');
  const entryRe = /^(\s*)"\.\/([^"]*)"\s*,?\s*$/;

  const coreEntries = [];
  const seen = new Set();
  const extra = [];
  const dupes = [];

  for (const line of rawLines) {
    const em = entryRe.exec(line);
    if (!em) continue;
    const u = em[2];
    coreEntries.push(u);
    if (seen.has(u)) {
      dupes.push(u);
      continue;
    }
    seen.add(u);
    if (u === '' || u.endsWith('/')) {
      if (!fs.existsSync(path.join(ROOT, u, 'index.html'))) extra.push(u);
    } else if (!publishedSet.has(u)) {
      extra.push(u);
    }
  }

  const missing = [];
  for (const dirUrl of expectedFolders) {
    if (!seen.has(dirUrl)) missing.push(dirUrl);
  }
  for (const f of published) {
    if (!seen.has(f)) missing.push(f);
  }

  if (!missing.length && !extra.length && !dupes.length) {
    console.log(`sync-core: ok, sw.js CORE is in sync (${coreEntries.length} entries)`);
    return 0;
  }

  if (!write) {
    for (const u of missing) console.log(`missing: ./${u}`);
    for (const u of extra) console.log(`extra:   ./${u}`);
    for (const u of dupes) console.log(`dupe:    ./${u}`);
    console.log(`\nsync-core: ${missing.length} missing, ${extra.length} extra, ${dupes.length} duplicate. Run with --write to update sw.js.`);
    return 1;
  }

  const extraSet = new Set(extra);
  const keptSeen = new Set();
  const lines = [];

  // Keep valid entries, comments, and blank lines; drop missing/extra/duplicate entries.
  for (const line of rawLines) {
    const em = entryRe.exec(line);
    if (!em) {
      lines.push({ kind: line.trim() === '' ? 'blank' : 'comment', text: line });
      continue;
    }
    const u = em[2];
    if (extraSet.has(u) || keptSeen.has(u)) continue;
    keptSeen.add(u);
    lines.push({ kind: 'entry', u, section: sectionOf(u) });
  }

  // Group missing entries by top-level folder section.
  const bySection = new Map();
  for (const u of sortGroup(missing)) {
    const sec = sectionOf(u);
    if (!bySection.has(sec)) bySection.set(sec, []);
    bySection.get(sec).push(u);
  }

  for (const [sec, items] of bySection.entries()) {
    // Find existing entries belonging to this section.
    let firstIdx = -1;
    let lastIdx = -1;
    let manifestIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].kind === 'entry' && lines[i].section === sec) {
        if (firstIdx < 0) firstIdx = i;
        lastIdx = i;
        if (lines[i].u.endsWith('/manifest.webmanifest') || lines[i].u === 'manifest.webmanifest') {
          manifestIdx = i;
        }
      }
    }

    if (lastIdx >= 0) {
      // Insert new code/html files right before manifest.webmanifest when present; others at end of section.
      const beforeManifest = [];
      const afterAll = [];
      for (const u of items) {
        if (manifestIdx >= 0 && (u.endsWith('.html') || u.endsWith('.js') || u.endsWith('.css'))) {
          beforeManifest.push({ kind: 'entry', u, section: sec });
        } else {
          afterAll.push({ kind: 'entry', u, section: sec });
        }
      }
      if (afterAll.length) {
        lines.splice(lastIdx + 1, 0, ...afterAll);
      }
      if (beforeManifest.length) {
        lines.splice(manifestIdx, 0, ...beforeManifest);
      }
    } else {
      // Create a new section block at the end of CORE.
      while (lines.length && lines[lines.length - 1].kind === 'blank') lines.pop();
      lines.push({ kind: 'blank', text: '' });
      lines.push({ kind: 'comment', text: `  // ${sec || 'Root'}` });
      for (const u of items) {
        lines.push({ kind: 'entry', u, section: sec });
      }
    }
  }

  // Remove orphaned section comments (comment lines not followed by any entry before the next blank/comment/end).
  const cleaned = [];
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    if (cur.kind === 'comment') {
      let hasEntry = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].kind === 'entry') { hasEntry = true; break; }
        if (lines[j].kind === 'blank') break;
      }
      if (!hasEntry) continue;
    }
    if (cur.kind === 'blank' && cleaned.length && cleaned[cleaned.length - 1].kind === 'blank') continue;
    cleaned.push(cur);
  }
  while (cleaned.length && cleaned[0].kind === 'blank') cleaned.shift();
  while (cleaned.length && cleaned[cleaned.length - 1].kind === 'blank') cleaned.pop();

  // Format entries with trailing commas on all but the last entry.
  let lastEntryIdx = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i].kind === 'entry') lastEntryIdx = i;
  }

  const outLines = cleaned.map((item, idx) => {
    if (item.kind !== 'entry') return item.text;
    const comma = idx === lastEntryIdx ? '' : ',';
    return `  "./${item.u}"${comma}`;
  });

  const newBody = '\n' + outLines.join('\n') + '\n';
  const newSw = sw.slice(0, match.index) + match[1] + newBody + match[3] + sw.slice(match.index + match[0].length);
  fs.writeFileSync(SW_PATH, newSw, 'utf8');
  console.log(`sync-core: updated sw.js (+${missing.length} added, -${extra.length} removed, -${dupes.length} duplicates)`);
  return 0;
}

const write = process.argv.includes('--write');
process.exit(run(write));
