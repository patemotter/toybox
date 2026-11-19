// Lint: catches real bugs in every published script (inline <script> blocks and .js files) with a few
// correctness rules: undefined names, duplicate keys, unreachable code, redeclared names and similar.
// Unused variables are listed as warnings; only errors fail the run (exit code 1).
//
// Usage (from the repo root; ESLint 9 and `globals` must be installed, e.g. `npm install --no-save eslint@9 globals`):
//   node tools/lint.js                   # every published page and script
//   node tools/lint.js farm/silage.html  # only these files
//   QUIET=1 node tools/lint.js           # errors only
// Inline scripts are linted in place, so the reported line numbers are the HTML file's own.
const { ESLint } = require('eslint');
const globals = require('globals');
const { execFileSync } = require('child_process');
const fs = require('fs');

function makeConfig(sourceType) {
  return [{
    languageOptions: {
      ecmaVersion: 2022,
      sourceType,
      globals: { ...globals.browser, Toybox: 'readonly', ToyboxProjects: 'readonly', Farm: 'readonly' },
    },
    rules: {
      'no-undef': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-redeclare': 'error',
      'no-self-assign': 'error', 'no-func-assign': 'error', 'no-const-assign': 'error', 'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error', 'use-isnan': 'error', 'valid-typeof': 'error', 'no-unsafe-negation': 'error',
      'no-cond-assign': ['error', 'except-parens'],
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  }];
}

const CONFIG = makeConfig('script');
const MODULE_CONFIG = makeConfig('module');

// The published files, as the deploy builds them (tools/, archive/, plans/, docs/, .github/ and .agents/ stay out).
function published() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n')
    .filter(f => /\.(html|js)$/.test(f) && !/^(tools|archive|plans|docs|\.github|\.agents)\//.test(f) && !/(^|\/)sw\.js$/.test(f));
}

function isModuleJs(text) {
  return /^\s*(?:import\s+(?:(?:[\w$*{}\s,]+\s+from\s+)?['"][^'"]+['"])|export\s+(?:default\b|const\b|let\b|var\b|function\b|async\s+function\b|class\b|\{|\*))/m.test(text);
}

// An HTML file as JavaScript: everything outside inline <script> blocks is blanked, keeping lines and columns.
// Classic scripts and <script type="module"> blocks are separated so each is parsed with the right sourceType.
function scriptsOf(html) {
  const blank = html.replace(/[^\n]/g, ' ');
  let classic = blank, mod = blank, hasClassic = false, hasMod = false;
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/json/i.test(m[1])) continue;
    const at = m.index + m[0].indexOf('>') + 1;
    if (/\btype\s*=\s*(['"]?)module\1/i.test(m[1])) {
      mod = mod.slice(0, at) + m[2] + mod.slice(at + m[2].length);
      hasMod = true;
    } else {
      classic = classic.slice(0, at) + m[2] + classic.slice(at + m[2].length);
      hasClassic = true;
    }
  }
  const out = [];
  if (hasClassic) out.push({ text: classic, isModule: false });
  if (hasMod) out.push({ text: mod, isModule: true });
  return out;
}

(async () => {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : published();
  const eslintScript = new ESLint({ overrideConfigFile: true, overrideConfig: CONFIG });
  const eslintModule = new ESLint({ overrideConfigFile: true, overrideConfig: MODULE_CONFIG });
  let errors = 0, warnings = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const chunks = f.endsWith('.html') ? scriptsOf(text) : [{ text, isModule: isModuleJs(text) }];
    for (const chunk of chunks) {
      const linter = chunk.isModule ? eslintModule : eslintScript;
      const [res] = await linter.lintText(chunk.text);
      for (const m of res.messages) {
        const err = m.severity === 2;
        if (err) errors++; else warnings++;
        if (err || !process.env.QUIET) console.log(`${err ? 'error' : 'warn '} ${f}:${m.line}:${m.column} ${m.message} (${m.ruleId})`);
      }
    }
  }
  console.log(`lint: ${files.length} file(s), ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
})();
