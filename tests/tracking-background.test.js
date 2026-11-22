// End-to-end adapter tests: run the REAL background.js inside a mock Chrome MV3
// environment with a deterministic clock (no browser or wall-clock delays).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../extension/tracking-core.js");
const source = fs.readFileSync(path.join(__dirname, "../extension/background.js"), "utf8");
const time = (minutes) => new Date(2026, 10, 22, 12, 0).getTime() + minutes * 60000;
const key = core.dayKey(time(0));
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function eventHook() {
  const handlers = [];
  return {
    addListener(fn) { handlers.push(fn); },
    fire(...args) { for (const fn of handlers) fn(...args); }
  };
}

function boot(state, storage = {}) {
  const events = {
    alarm: eventHook(), activated: eventHook(), updated: eventHook(),
    removed: eventHook(), focus: eventHook(), idle: eventHook(),
    installed: eventHook(), startup: eventHook(), message: eventHook(),
    storage: eventHook()
  };
  const alarmMap = new Map();
  class FakeDate extends Date {
    constructor(...args) { if (args.length) super(...args); else super(state.now); }
    static now() { return state.now; }
  }
  const tabs = () => [
    { id: 1, windowId: 1, active: state.activeId === 1, url: state.one || "https://github.com" },
    { id: 2, windowId: 1, active: state.activeId === 2, url: state.two || "https://example.com" }
  ];
  const chrome = {
    storage: {
      onChanged: events.storage,
      local: {
        async get(keys) {
          const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(storage);
          return Object.fromEntries(list.filter(k => storage[k] !== undefined).map(k => [k, clone(storage[k])]));
        },
        async set(values) { Object.assign(storage, clone(values)); },
        async remove(key) { delete storage[key]; }
      }
    },
    alarms: {
      onAlarm: events.alarm,
      async get(name) { return alarmMap.get(name) || null; },
      async create(name, opts) { alarmMap.set(name, opts); },
      async clear(name) { return alarmMap.delete(name); }
    },
    idle: { onStateChanged: events.idle, async queryState() { return state.idle || "active"; } },
    tabs: {
      onActivated: events.activated, onUpdated: events.updated, onRemoved: events.removed,
      async query(options) {
        if (options.windowId !== undefined && options.windowId !== 1) return [];
        return tabs().filter(tab => !options.active || tab.active);
      },
      async get(id) {
        const tab = tabs().find(tab => tab.id === id);
        if (!tab) throw Error("Tab closed");
        return tab;
      },
      async update(id, update) {
        if (id === 1) state.one = update.url;
        if (id === 2) state.two = update.url;
        return tabs().find(tab => tab.id === id);
      }
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged: events.focus,
      async getLastFocused() { return { id: 1, focused: state.focused !== false }; }
    },
    runtime: {
      onInstalled: events.installed, onStartup: events.startup,
      onMessage: events.message,
      getURL(relative) { return "chrome-extension://mock/" + relative; }
    },
    scripting: { async executeScript() {}, async insertCSS() {}, async removeCSS() {} },
    notifications: { create() {} }
  };
  vm.runInNewContext(source, {
    chrome, FocusFlowTrackingCore: core, importScripts() {},
    URL, Date: FakeDate, console
  }, { filename: "background.js" });
  const drain = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };
  return { state, storage, events, alarmMap, drain };
}
const read = (env, site) => (env.storage.timeData?.[key] || {})[site] || 0;

test("real background alarm handler credits 30 seconds, then another 30", async () => {
  const state = { now: time(0), activeId: 1 };
  const env = boot(state);
  await env.drain();
  assert.equal(env.alarmMap.get("tickAlarm").periodInMinutes, 0.5);
  state.now = time(0.5);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  state.now = time(1);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 60);
});

test("real adapter switches sites and ignores background blocked-site updates", async () => {
  const state = { now: time(0), activeId: 1 };
  const env = boot(state);
  await env.drain();
  state.now = time(0.5);
  state.two = "https://instagram.com";
  env.events.updated.fire(2, { status: "complete" }, { id: 2, url: state.two });
  await env.drain();
  assert.equal(read(env, "github.com"), 30);
  assert.match(state.two, /blocked.html/);
  state.now = time(1);
  state.activeId = 2;
  state.two = "https://example.com";
  env.events.activated.fire({ tabId: 2 });
  await env.drain();
  state.now = time(1.5);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 60);
  assert.equal(read(env, "example.com"), 30);
});

test("idle and unfocused Chrome stop accumulating time through the real events", async () => {
  const state = { now: time(0), activeId: 1, focused: true, idle: "active" };
  const env = boot(state);
  await env.drain();
  state.now = time(0.5);
  state.idle = "idle";
  env.events.idle.fire("idle");
  await env.drain();
  state.now = time(1);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 30);
  state.now = time(1.5);
  state.idle = "active";
  state.focused = false;
  env.events.focus.fire(-1);
  await env.drain();
  state.now = time(2);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 30);
  state.focused = true;
  env.events.focus.fire(1);
  await env.drain();
  state.now = time(2.5);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 60);
});

test("worker restart, repeated tab events and GET_LIVE_STATUS do not double-count", async () => {
  const state = { now: time(0), activeId: 1 };
  const storage = {};
  let env = boot(state, storage);
  await env.drain();
  state.now = time(0.5);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 30);
  // Fresh VM with the same persistent chrome.storage.local backing.
  env = boot(state, storage);
  await env.drain();
  env.events.activated.fire({ tabId: 1 });
  env.events.updated.fire(1, { status: "complete" }, { id: 1, url: "https://github.com" });
  await env.drain();
  assert.equal(read(env, "github.com"), 30);
  state.now = time(0.75);
  const messages = [];
  env.events.message.fire({ type: "GET_LIVE_STATUS" }, null, data => messages.push(data));
  await env.drain();
  assert.equal(messages[0].domain, "github.com");
  assert.equal(messages[0].elapsedSeconds, 15);
  assert.equal(read(env, "github.com"), 30); // pending time not persisted twice
  state.now = time(1);
  env.events.alarm.fire({ name: "tickAlarm" });
  await env.drain();
  assert.equal(read(env, "github.com"), 60);
});
