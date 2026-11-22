// Deterministic regression tests: node --test tests/tracking-core.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { reconcile, getLiveStatus, MAX_GAP_MS, dayKey } = require("../extension/tracking-core.js");

const at = (h, m, s = 0) => new Date(2026, 10, 22, h, m, s).getTime();
const github = { tabId: 1, windowId: 1, domain: "github.com" };
const youtube = { tabId: 2, windowId: 1, domain: "youtube.com" };
const blank = () => ({ timeData: {}, siteCategories: {}, activeTracking: null });
const step = (state, context, time) => reconcile(state, context, time);
const seconds = (state, site, time = at(12, 0)) => (state.timeData[dayKey(time)] || {})[site] || 0;

test("uses elapsed milliseconds, not one second per 30-second alarm", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, github, at(12, 0, 30));
  s = step(s, github, at(12, 1));
  assert.equal(seconds(s, "github.com"), 60);
  assert.equal(s.activeTracking.start, at(12, 0));
  assert.equal(getLiveStatus(s, github, at(12, 1, 15)).elapsedSeconds, 15);
});
test("switches domains without attributing time to the new site prematurely", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, youtube, at(12, 0, 20));
  s = step(s, youtube, at(12, 0, 50));
  assert.equal(seconds(s, "github.com"), 20);
  assert.equal(seconds(s, "youtube.com"), 30);
  assert.deepEqual(getLiveStatus(s, github, at(12, 0, 55)), { domain: null, elapsedSeconds: 0 });
});
test("switches between tabs on the same domain without double-counting", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, { ...github, tabId: 3 }, at(12, 0, 20));
  s = step(s, github, at(12, 0, 40));
  s = step(s, github, at(12, 1));
  assert.equal(seconds(s, "github.com"), 60);
});
test("idle ends a session and resumed activity starts a new checkpoint", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, null, at(12, 0, 30));
  s = step(s, null, at(12, 1));
  assert.equal(seconds(s, "github.com"), 30);
  assert.equal(s.activeTracking, null);
  s = step(s, github, at(12, 2));
  s = step(s, github, at(12, 2, 30));
  assert.equal(seconds(s, "github.com"), 60);
});
test("losing browser focus stops tracking and returns to the correct window", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, null, at(12, 0, 15));
  s = step(s, null, at(12, 0, 45));
  s = step(s, youtube, at(12, 0, 50));
  s = step(s, youtube, at(12, 1));
  assert.equal(seconds(s, "github.com"), 15);
  assert.equal(seconds(s, "youtube.com"), 10);
});
test("rehydrating a service worker and duplicate events never replay checkpoints", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, github, at(12, 0, 30));
  s = step(JSON.parse(JSON.stringify(s)), github, at(12, 0, 40));
  s = step(s, github, at(12, 0, 40));
  s = step(s, github, at(12, 1));
  assert.equal(seconds(s, "github.com"), 60);
});
test("sleep or shutdown gaps above the threshold are not fabricated", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, github, at(12, 0, 30));
  s = step(s, github, at(12, 5));
  assert.equal(seconds(s, "github.com"), 30);
  s = step(s, github, at(12, 5, 30));
  assert.equal(seconds(s, "github.com"), 60);
  assert.ok(MAX_GAP_MS < 5*60*1000);
});
test("keeps old timeData totals, site keys, and value types", () => {
  const original = blank();
  original.timeData[dayKey(at(12, 0))] = { "github.com": 120, "example.com": 9 };
  let s = step(original, github, at(12, 0));
  s = step(s, github, at(12, 0, 30));
  assert.equal(seconds(s, "github.com"), 150);
  assert.equal(seconds(s, "example.com"), 9);
  assert.equal(original.timeData[dayKey(at(12, 0))]["github.com"], 120);
});
test("divides elapsed time correctly at the local midnight boundary", () => {
  const start = new Date(2026, 10, 22, 23, 59, 50).getTime();
  const end = new Date(2026, 10, 23, 0, 0, 10).getTime();
  let s = step(blank(), github, start);
  s = step(s, github, end);
  assert.equal(seconds(s, "github.com", start), 10);
  assert.equal(seconds(s, "github.com", end), 10);
});
test("does not backfill old legacy activeTracking, retains history", () => {
  const original = { timeData: { [dayKey(at(12, 0))]: { "github.com": 77 } },
    activeTracking: { tabId: 1, domain: "github.com", start: at(11, 0) } };
  const s = step(original, github, at(12, 0));
  assert.equal(seconds(s, "github.com"), 77);
  assert.equal(s.activeTracking.version, 2);
});
test("preserves fractions through short tab switches", () => {
  let s = step(blank(), github, at(12, 0));
  s = step(s, youtube, at(12, 0)+250);
  s = step(s, github, at(12, 0)+750);
  s = step(s, github, at(12, 0)+1000);
  assert.equal(seconds(s, "github.com"), 0.5);
  assert.equal(seconds(s, "youtube.com"), 0.5);
});
test("does not override a manually assigned category", () => {
  const original = blank();
  original.siteCategories["github.com"] = "study";
  let s = reconcile(original, github, at(12, 0), { "github.com": "coding" });
  s = reconcile(s, github, at(12, 0, 30), { "github.com": "coding" });
  assert.equal(s.siteCategories["github.com"], "study");
});
