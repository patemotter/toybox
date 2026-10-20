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

const CONFIG = [{
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
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

// The published files, as the deploy builds them (tools/, archive/, plans/ and .github/ stay out).
function published() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n')
    .filter(f => /\.(html|js)$/.test(f) && !/^(tools|archive|plans|\.github)\//.test(f) && !/(^|\/)sw\.js$/.test(f));
}

// An HTML file as JavaScript: everything outside inline <script> blocks is blanked, keeping lines and columns.
function scriptOf(html) {
  let out = html.replace(/[^\n]/g, ' ');
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/json/.test(m[1])) continue;
    const at = m.index + m[0].indexOf('>') + 1;
    out = out.slice(0, at) + m[2] + out.slice(at + m[2].length);
  }
  return out;
}

(async () => {
  const files = process.argv.slice(2).length ? process.argv.slice(2) : published();
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: CONFIG });
  let errors = 0, warnings = 0;
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    const [res] = await eslint.lintText(f.endsWith('.html') ? scriptOf(text) : text);
    for (const m of res.messages) {
      const err = m.severity === 2;
      if (err) errors++; else warnings++;
      if (err || !process.env.QUIET) console.log(`${err ? 'error' : 'warn '} ${f}:${m.line}:${m.column} ${m.message} (${m.ruleId})`);
    }
  }
  console.log(`lint: ${files.length} file(s), ${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
})();
