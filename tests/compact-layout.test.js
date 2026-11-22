// Regression guard for Design 01's narrow Chrome popup correction.
// Run with: node --test tests/compact-layout.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname,"..");
const file = (p) => fs.readFileSync(path.join(root,p),"utf8");
const html = file("extension/popup.html");
const css = file("extension/compact-layout.css");
const base = file("extension/premium-design.css");
const dashboard = file("extension/dashboard.css");

test("compact stylesheet overrides desktop sidebar after premium theme", () => {
  const links = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(links,["popup.css","premium-design.css","compact-layout.css","dashboard.css"]);
  assert.match(base,/grid-template-columns:\s*132px/);
  assert.match(css,/body,\s*body\[data-theme\]\s*\{[^}]*display:\s*flex/s);
  assert.match(css,/flex-direction:\s*column/);
  assert.match(css,/width:\s*380px/);
  assert.match(css,/max-width:\s*100vw/);
  assert.match(css,/\.workspace-nav\s*\{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css,/\.workspace-nav::before\s*\{\s*display:\s*none\s*!important;/);
  assert.match(css,/\.tab-content\s*\{[^}]*flex:\s*1\s+1\s+auto/s);
  assert.match(css,/\.tab-content\s*\{[^}]*overflow-y:\s*auto/s);
});
test("small popup keeps usable controls and avoids sidebar width tax", () => {
  assert.match(css,/@media\s*\(max-width:\s*355px\)/);
  assert.match(css,/\.workspace-nav\s+\.workspace-btn\s*\{[^}]*min-height:\s*52px/s);
  assert.match(dashboard,/\.dashboard-metrics\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(dashboard,/@media \(min-width: 570px\) \{\s*body\.dashboard-expanded/);
  assert.match(css,/\.home-legacy-data\s*\{[^}]*display:\s*flex\s*!important/s);
  assert.match(css,/\.home-charts\s+canvas\s*\{[^}]*max-width:\s*100%/s);
  assert.match(css,/\.profile-field-grid\s*\{\s*grid-template-columns:\s*1fr/s);
});
test("critical view IDs and all navigation groups remain intact", () => {
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,"Duplicate popup IDs");
  for(const name of ["home","focus","tools","insights","settings"]){
    assert.ok(html.includes('data-nav-group="'+name+'"'),"Missing workspace "+name);
    assert.ok(html.includes('data-group="'+name+'"'),"Missing feature group "+name);
  }
  for(const id of [
    "quickDarkToggle","homeFocusShortcut","homeTimerShortcut",
    "homeBlockShortcut","homeAppearanceShortcut","homeBlockCount",
    "liveDomain","liveTime","homeTotalUsage","datePicker","siteList",
    "chart","dayGraph","sfStart","sfEnd","pomoStart","pomoReset",
    "darkGlobalToggle","darkSiteToggle","darkIntensity","addBlockBtn",
    "blockList","speedSlider","notesArea","taskList","profileSave",
    "heatmapCanvas","goalFocusTarget","dailyGoalSave"
  ])assert.ok(ids.includes(id),"Missing UI hook: "+id);
});
test("dashboard actions expose readable labels and working feature hooks", () => {
  assert.match(html,/id="quickDarkToggle"[^>]*aria-label="Website dark mode"/);
  assert.match(html,/id="openDashboard"[^>]*aria-label="Open full dashboard"/);
  assert.match(html,/id="dashboardTimerStart"[^>]*aria-label="Start timer"/);
  assert.match(html,/id="dashboardTimerSkip"[^>]*aria-label="Skip timer phase"/);
  assert.match(html,/data-pomo-phase="longBreak"/);
  assert.match(html,/id="dashboardSpeed"[^>]*aria-label="Apply video playback speed"/);
});
