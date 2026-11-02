// FocusFlow Smart Focus session engine.
// Session data is stored separately; existing blockedSites and Pomodoro data are untouched.
(() => {
  const ALARM = "focusFlowSmartFocusEnd";
  const MAX_HISTORY = 50;

  function normalizeDomain(value) {
    let raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    try {
      if (!raw.includes("://")) raw = "https://" + raw;
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
      if (!host || !host.includes(".") || /[^a-z0-9.-]/.test(host) || host.includes("..")) return "";
      return host;
    } catch { return ""; }
  }

  function normalizeList(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map(normalizeDomain).filter(Boolean))].slice(0, 50);
  }

  async function getState() {
    const r = await chrome.storage.local.get("smartFocusState");
    return r.smartFocusState || { status: "idle" };
  }

  async function saveState(state) {
    await chrome.storage.local.set({ smartFocusState: state });
    return state;
  }

  function activeElapsed(state, now = Date.now()) {
    const runningPart = state.status === "running" && state.startedAt
      ? Math.max(0, Math.floor((now - state.startedAt) / 1000)) : 0;
    return Math.max(0, Number(state.elapsedSec) || 0) + runningPart;
  }

  async function addHistory(state, status) {
    const r = await chrome.storage.local.get("smartFocusHistory");
    const history = Array.isArray(r.smartFocusHistory) ? r.smartFocusHistory : [];
    const now = Date.now();
    const actualFocusSec = Math.min(state.durationSec, activeElapsed(state, now));
    history.unshift({
      id: state.id,
      status,
      startedAt: state.createdAt,
      endedAt: now,
      plannedMinutes: Math.round(state.durationSec / 60),
      actualFocusSec,
      blockedSites: state.blockedSites || [],
      allowedSites: state.allowedSites || [],
      overrideCount: state.overrideCount || 0
    });
    await chrome.storage.local.set({ smartFocusHistory: history.slice(0, MAX_HISTORY) });
    return actualFocusSec;
  }

  async function finishSession(status) {
    const state = await getState();
    if (!["running", "paused"].includes(state.status)) return state;
    const actualFocusSec = await addHistory(state, status);
    await chrome.alarms.clear(ALARM);
    const finished = {
      ...state, status, endTime: null, startedAt: null, remainingSec: 0,
      elapsedSec: actualFocusSec, finishedAt: Date.now()
    };
    await saveState(finished);
    try {
      chrome.notifications.create("smart-focus-" + Date.now(), {
        type: "basic", iconUrl: "icon.png",
        title: status === "completed" ? "Focus session complete" : "Focus session ended",
        message: status === "completed"
          ? "You completed your planned focus session. Take a short break."
          : "Your focus session was ended early. Your progress was saved.",
        priority: 2
      });
    } catch (_) {}
    return finished;
  }

  async function handleAlarm() {
    const state = await getState();
    if (state.status !== "running" || !state.endTime) return;
    const remaining = state.endTime - Date.now();
    if (remaining > 0) {
      await chrome.alarms.create(ALARM, { when: state.endTime });
      return;
    }
    await finishSession("completed");
  }

  async function enforceCurrentTab(state) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) return;
      const domain = normalizeDomain(tab.url);
      if (!domain) return;
      const matches = site => domain === site || domain.endsWith("." + site);
      if ((state.allowedSites || []).some(matches)) return;
      const saved = await chrome.storage.local.get("blockedSites");
      const base = Array.isArray(saved.blockedSites) ? saved.blockedSites : [];
      const blocked = (state.blockedSites || []).some(matches) || base.some(site => matches(normalizeDomain(site)));
      if (blocked) await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
    } catch (_) {}
  }

  async function start(msg) {
    const current = await getState();
    if (["running", "paused"].includes(current.status)) {
      return { ok: false, reason: "End the current focus session before starting another.", state: current };
    }
    const durationMinutes = Number(msg.durationMinutes);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720) {
      return { ok: false, reason: "Choose a session from 1 to 720 minutes." };
    }
    const blockedSites = normalizeList(msg.blockedSites);
    const allowedSites = normalizeList(msg.allowedSites);
    const now = Date.now();
    const state = {
      id: "sf-" + now,
      status: "running",
      durationSec: durationMinutes * 60,
      remainingSec: durationMinutes * 60,
      elapsedSec: 0,
      createdAt: now,
      startedAt: now,
      endTime: now + durationMinutes * 60 * 1000,
      blockedSites,
      allowedSites,
      overrideUntil: null,
      overrideCount: 0
    };
    await saveState(state);
    await chrome.alarms.create(ALARM, { when: state.endTime });
    await enforceCurrentTab(state);
    return { ok: true, state };
  }

  async function pause() {
    const state = await getState();
    if (state.status !== "running") return { ok: false, reason: "No running focus session.", state };
    const now = Date.now();
    const remainingSec = Math.max(0, Math.ceil((state.endTime - now) / 1000));
    const elapsedSec = activeElapsed(state, now);
    await chrome.alarms.clear(ALARM);
    const next = { ...state, status: "paused", remainingSec, elapsedSec, startedAt: null, endTime: null, overrideUntil: null };
    await saveState(next);
    return { ok: true, state: next };
  }

  async function resume() {
    const state = await getState();
    if (state.status !== "paused") return { ok: false, reason: "No paused focus session.", state };
    const remainingSec = Math.max(0, Number(state.remainingSec) || 0);
    if (!remainingSec) return { ok: false, reason: "This session has no time remaining.", state };
    const now = Date.now();
    const next = { ...state, status: "running", startedAt: now, endTime: now + remainingSec * 1000, overrideUntil: null };
    await saveState(next);
    await chrome.alarms.create(ALARM, { when: next.endTime });
    await enforceCurrentTab(next);
    return { ok: true, state: next };
  }

  async function override() {
    const state = await getState();
    if (state.status !== "running") return { ok: false, reason: "Start a running session first.", state };
    const now = Date.now();
    const next = { ...state, overrideUntil: now + 5 * 60 * 1000, overrideCount: (state.overrideCount || 0) + 1 };
    await saveState(next);
    return { ok: true, state: next };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg?.type?.startsWith("SMART_FOCUS_")) return;
    const actions = {
      SMART_FOCUS_GET: () => getState().then(state => ({ ok: true, state })),
      SMART_FOCUS_START: () => start(msg),
      SMART_FOCUS_PAUSE: () => pause(),
      SMART_FOCUS_RESUME: () => resume(),
      SMART_FOCUS_OVERRIDE: () => override(),
      SMART_FOCUS_END: async () => ({ ok: true, state: await finishSession("ended") })
    };
    const action = actions[msg.type];
    if (!action) return;
    action().then(sendResponse).catch(error => sendResponse({ ok: false, reason: error.message }));
    return true;
  });

  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === ALARM) handleAlarm();
  });

  async function restoreAlarm() {
    const state = await getState();
    if (state.status === "running" && state.endTime) {
      if (state.endTime <= Date.now()) await finishSession("completed");
      else await chrome.alarms.create(ALARM, { when: state.endTime });
    }
  }
  chrome.runtime.onStartup.addListener(restoreAlarm);
  chrome.runtime.onInstalled.addListener(restoreAlarm);
  restoreAlarm();
})();
