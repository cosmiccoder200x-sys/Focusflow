// Static source/manifest checks only. These are NOT browser runtime tests.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(manifest.manifest_version, 3, 'Manifest V3 expected');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Semver extension version expected');
const entries = [
  manifest.action?.default_popup,
  manifest.action?.default_icon,
  manifest.options_page,
  manifest.background?.service_worker,
  ...Object.values(manifest.icons || {}),
  ...(manifest.web_accessible_resources || []).flatMap(x => x.resources || []),
].filter(Boolean);
for (const relative of entries) {
  assert(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), 'Unsafe manifest path: ' + relative);
  assert(fs.existsSync(path.join(dir, relative)), 'Missing referenced file: ' + relative);
}
function visit(folder) {
  for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
    const filename = path.join(folder, item.name);
    if (item.isDirectory()) visit(filename);
    else if (item.name.endsWith('.js')) execFileSync(process.execPath, ['--check', filename], { stdio: 'pipe' });
  }
}
visit(dir);
console.log('Static extension checks passed: manifest references and JS syntax. Browser behavior NOT tested.');
