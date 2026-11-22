// Design 01 smoke checks: no browser dependencies; no extension behavior mocks.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("extension/popup.html");
const baseCss = read("extension/popup.css");
const designCss = read("extension/premium-design.css");
const popupJs = read("extension/popup.js");
const landing = read("docs/index.html");
const opts = read("extension/options.html");

function ids(source) { return [...source.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); }

test("popup has unique IDs and preserves key feature hooks", () => {
  const all = ids(html);
  assert.equal(all.length, new Set(all).size, "Duplicate IDs in popup");
  const required = [
    "datePicker","chart","dayGraph","siteList",
    "quickDarkToggle","liveDomain","liveTime","homeTotalUsage",
    "homeFocusShortcut","homeBlockShortcut","homeBlockCount",
    "homeTimerShortcut","homeAppearanceShortcut",
    "sfStart","sfPause","sfResume","sfEnd","sfOverride",
    "goalFocusTarget","dailyGoalSave","pomoStart","pomoReset",
    "blockInput","addBlockBtn","blockList","speedSlider","applySpeed",
    "darkGlobalToggle","darkSiteToggle","darkIntensity",
    "tasksBlockStatus","taskList","notesArea",
    "heatmapCanvas","scoreRingFg","codingGraphCanvas","profileSave"
  ];
  for(const id of required) assert.ok(all.includes(id), "Missing existing control: " + id);
});
test("premium stylesheet is loaded last, after existing popup rules", () => {
  assert.ok(html.indexOf('href="premium-design.css"') > html.indexOf('href="popup.css"'));
  assert.match(baseCss, /\.home-legacy-data\s*\{\s*display:none!important/);
  assert.match(designCss, /\.home-legacy-data\s*\{[^}]*display:\s*flex\s*!important/s);
  assert.match(designCss, /grid-template-areas/);
  assert.match(designCss, /prefers-reduced-motion/);
});
test("five workspace controls and full feature navigation are retained", () => {
  for(const name of ["home","focus","tools","insights","settings"]) {
    assert.match(html, new RegExp('data-nav-group="' + name + '"'));
    assert.match(html, new RegExp('data-group="' + name + '"'));
  }
  for(const tab of ["track","pomo","smartfocus","goals","tasks","notes","block","speed","dark","profiles","stats","score","badges","code","report","smartinsights","settings"]) {
    assert.ok(html.includes('id="tab-' + tab + '"'), "Missing panel " + tab);
  }
  assert.match(html, /id="homeTimerShortcut"[^>]*data-open-group="focus"[^>]*data-open-tab="pomo"/);
  assert.match(html, /id="homeAppearanceShortcut"[^>]*data-open-group="tools"[^>]*data-open-tab="dark"/);
});
test("shortcut script delegates navigation to existing handlers", () => {
  const callbacks = [];
  const clickLog = [];
  const makeShortcut = (group, tab) => ({
    dataset: { openGroup:group, openTab:tab },
    addEventListener(type, fn) { assert.equal(type,"click"); callbacks.push(fn); }
  });
  const shortcuts = [makeShortcut("focus","pomo"),makeShortcut("tools","dark")];
  const document = {
    querySelectorAll(selector) {
      assert.equal(selector,"[data-open-group][data-open-tab]");
      return shortcuts;
    },
    querySelector(selector) {
      return {click() {clickLog.push(selector);}};
    }
  };
  vm.runInNewContext(read("extension/premium-ui.js"), {document});
  assert.equal(callbacks.length,2);
  callbacks[0]();
  callbacks[1]();
  assert.deepEqual(clickLog,[
    '.workspace-btn[data-nav-group="focus"]',
    '.tab-btn[data-tab="pomo"]',
    '.workspace-btn[data-nav-group="tools"]',
    '.tab-btn[data-tab="dark"]'
  ]);
});
test("site list uses real persisted timeData, with real relative usage bars", () => {
  assert.match(popupJs, /const timeData = r\.timeData \|\| \{\}/);
  assert.match(popupJs, /maxSiteSeconds/);
  assert.match(popupJs, /class="site-meter"/);
  assert.match(popupJs, /fmtSec\(secs\)/);
  assert.ok(!html.includes('aria-hidden="true"><select id="datePicker"'),
    "Site history must no longer be an aria-hidden legacy panel");
});
test("landing page is responsive and describes real availability, not fake metrics", () => {
  assert.match(landing,/max-width:\s*1190px/);
  assert.match(landing,/@media\(max-width:650px\)/);
  assert.match(landing,/Real repository image/);
  assert.match(landing,/pre.*Design 01/i);
  assert.match(landing,/source installation only/i);
  assert.ok(!/(\b[1-9]\d*h\s*\d+m\b|\b\d+%\s*productivity\b)/i.test(landing),
    "Do not invent product analytics in promotional art");
  assert.ok(!landing.includes('Chrome Web Store</a>'),
    "Do not imply a store listing exists");
  assert.match(opts,/href="options-premium\.css"/);
});
