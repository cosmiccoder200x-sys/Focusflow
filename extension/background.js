// ===== FOCUSFLOW — background.js v4.0 =====
// Preserves all v3.0 tracking accuracy + new scoring + coding detection

const DEFAULT_BLOCKED = [
  "instagram.com","facebook.com","twitter.com","x.com",
  "snapchat.com","tiktok.com","reddit.com","9gag.com",
  "netflix.com","hotstar.com","primevideo.com"
];

const SITE_CATEGORIES_AUTO = {
  "leetcode.com": "coding", "codeforces.com": "coding", "codechef.com": "coding",
  "hackerrank.com": "coding", "github.com": "coding", "geeksforgeeks.org": "coding",
  "stackoverflow.com": "coding", "developer.mozilla.org": "documentation",
  "docs.python.org": "documentation", "docs.oracle.com": "documentation",
  "npmjs.com": "documentation", "pypi.org": "documentation",
  "youtube.com": "entertainment", "netflix.com": "entertainment",
  "hotstar.com": "entertainment", "primevideo.com": "entertainment",
  "twitch.tv": "entertainment", "9gag.com": "entertainment",
  "instagram.com": "social", "facebook.com": "social", "twitter.com": "social",
  "x.com": "social", "snapchat.com": "social", "tiktok.com": "social",
  "linkedin.com": "social", "reddit.com": "social",
  "cnn.com": "news", "bbc.com": "news", "ndtv.com": "news",
  "thehindu.com": "news", "timesofindia.com": "news",
  "coursera.org": "study", "udemy.com": "study", "edx.org": "study",
  "khanacademy.org": "study", "nptel.ac.in": "study",
  "iitm.ac.in": "study", "study.iitm.ac.in": "study"
};

async function getBlockedSites() {
  const { blockedSites } = await chrome.storage.local.get("blockedSites");
  return Array.isArray(blockedSites) ? blockedSites : [...DEFAULT_BLOCKED];
}

// ---- Helpers ----
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

async function isBlocked(domain) {
  if (!domain) return false;
  const saved = await chrome.storage.local.get("smartFocusState");
  const focus = saved.smartFocusState;
  if (focus?.status === "running" && focus.endTime > Date.now()) {
    if (focus.overrideUntil && focus.overrideUntil > Date.now()) return false;
    const matches = site => domain === site || domain.endsWith("." + site);
    if ((focus.allowedSites || []).some(matches)) return false;
    if ((focus.blockedSites || []).some(matches)) return true;
  }
  return (await getBlockedSites()).some(b => domain === b || domain.endsWith("." + b));
}

// ---- ACCURATE PER-SITE TRACKING (Manifest V3) ----
// Pure ledger logic is unit-tested independently of the Chrome event adapters.
importScripts("tracking-core.js");
const TICK_ALARM = "tickAlarm";
const POMO_ALARM = "pomoAlarm";
const IDLE_THRESHOLD_SECONDS = 60;
let trackingQueue = Promise.resolve();

// Chrome fires several navigation/focus/alarm events concurrently. Serialize all
// read-modify-write cycles to avoid losing increments or double-counting a gap.
function queueTracking(work) {
  const next = trackingQueue.then(work);
  trackingQueue = next.catch(error => console.warn("FocusFlow tracking:", error));
  return next;
}

async function currentTrackingContext() {
  // A background/unfocused Chrome window is not active browsing time.
  const win = await chrome.windows.getLastFocused();
  if (!win || !win.focused || !Number.isInteger(win.id)) return null;

  // With the "idle" permission this also stops counting while locked/idle.
  if (chrome.idle && await chrome.idle.queryState(IDLE_THRESHOLD_SECONDS) !== "active") return null;

  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  if (!tab || !Number.isInteger(tab.id) || tab.windowId !== win.id || !tab.active) return null;
  if (!tab.url || !/^https?:\/\//i.test(tab.url)) return null;

  const domain = getDomain(tab.url);
  if (!domain || await isBlocked(domain)) return null;
  return { tabId: tab.id, windowId: win.id, domain };
}

async function persistTracking() {
  const now = Date.now();
  const context = await currentTrackingContext();
  const before = await chrome.storage.local.get(["activeTracking", "timeData", "siteCategories"]);
  const change = FocusFlowTrackingCore.reconcile(before, context, now, SITE_CATEGORIES_AUTO);

  // One storage transaction includes the new checkpoint and its credited time.
  // A restarted worker reads the checkpoint and cannot replay credited seconds.
  const update = { activeTracking: change.activeTracking };
  if (change.timeChanged) update.timeData = change.timeData;
  if (change.categoriesChanged) update.siteCategories = change.siteCategories;
  await chrome.storage.local.set(update);
}

function reconcileTracking() {
  return queueTracking(persistTracking);
}

// All normal site changes are reconciled from the actual focused window/tab,
// never from an unrelated background tab's onUpdated event.
async function handleTabFocus(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = tab && getDomain(tab.url);
    if (domain && await isBlocked(domain)) {
      await chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
    }
  } catch (_) { /* Tab may have closed during navigation. */ }
  await reconcileTracking();
}

async function onTick() {
  await reconcileTracking();
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === TICK_ALARM) { onTick().catch(console.warn); return; }
  if (alarm.name === POMO_ALARM) queuePomo(finishExpiredPomo).catch(console.warn);
});

async function init() {
  // Chrome 120+ supports minimum 30-second alarms; 1-second alarms do not run
  // at their requested cadence. Measure real elapsed time instead.
  if (!await chrome.alarms.get(TICK_ALARM)) {
    await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 0.5 });
  }
  await reconcileTracking();

  await queuePomo(async () => {
    const state = await finishExpiredPomo();
    if (state.running && !await chrome.alarms.get(POMO_ALARM)) {
      await chrome.alarms.create(POMO_ALARM, { when: state.endTime });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => { init().catch(console.warn); });
chrome.runtime.onStartup.addListener(() => { init().catch(console.warn); });
init().catch(console.warn);

// Re-query the *actual* focused browser state rather than trusting event args.
chrome.tabs.onActivated.addListener(({ tabId }) => { handleTabFocus(tabId).catch(console.warn); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!changeInfo.url && changeInfo.status !== "complete") return;
  handleTabFocus(tabId).catch(console.warn);
});
chrome.tabs.onRemoved.addListener(() => { reconcileTracking().catch(console.warn); });
chrome.windows.onFocusChanged.addListener(() => { reconcileTracking().catch(console.warn); });
if (chrome.idle) {
  chrome.idle.onStateChanged.addListener(() => { reconcileTracking().catch(console.warn); });
}

// ---- Messages ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_LIVE_STATUS") {
    // The popup adds this amount to persisted timeData; return only the
    // pending interval, not elapsed time already stored by an alarm.
    queueTracking(async () => {
      const [context, state] = await Promise.all([
        currentTrackingContext(), chrome.storage.local.get("activeTracking")
      ]);
      return FocusFlowTrackingCore.getLiveStatus(state, context, Date.now());
    }).then(sendResponse).catch(() => sendResponse({ domain: null, elapsedSeconds: 0 }));
    return true;
  }

  if (msg.type === "GET_TRACKING_SNAPSHOT") {
    queueTracking(async () => {
      const context = await currentTrackingContext();
      const snapshot = await chrome.storage.local.get(["activeTracking", "timeData", "siteCategories"]);
      const now = Date.now();
      const timeData = {};
      for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
        const day = new Date(now);
        day.setDate(day.getDate() - daysAgo);
        const key = FocusFlowTrackingCore.dayKey(day.getTime());
        if (snapshot.timeData?.[key]) timeData[key] = snapshot.timeData[key];
      }
      const projected = FocusFlowTrackingCore.reconcile(
        { ...snapshot, timeData }, context, now, SITE_CATEGORIES_AUTO
      );
      return {
        timeData: projected.timeData,
        siteCategories: projected.siteCategories,
        ...FocusFlowTrackingCore.getLiveStatus(snapshot, context, now)
      };
    }).then(sendResponse, error => {
      console.warn("FocusFlow tracking:", error);
      sendResponse(null);
    });
    return true;
  }

  if (msg.type === "GET_BLOCKED_SITES") {
    getBlockedSites().then(sites => sendResponse({ sites }), () => sendResponse(null));
    return true;
  }

  if (msg.type === "SET_BLOCKED_SITES") {
    if (!Array.isArray(msg.sites) || msg.sites.some(site => typeof site !== "string")) {
      sendResponse({ ok: false });
      return;
    }
    chrome.storage.local.set({ blockedSites: msg.sites }).then(async () => {
      await reconcileTracking();
      sendResponse({ ok: true });
    }).catch(error => {
      console.warn("FocusFlow blocked sites:", error);
      sendResponse({ ok: false });
    });
    return true;
  }

  if (msg.type === "GET_AUTO_CATEGORIES") {
    sendResponse({ categories: SITE_CATEGORIES_AUTO });
  }

  if (msg.type?.startsWith("POMO_")) {
    queuePomo(() => applyPomoCommand(msg)).then(sendResponse, error => {
      console.warn("FocusFlow timer:", error);
      sendResponse({ ok: false, reason: "Could not update the timer." });
    });
    return true;
  }
});

// ===== POMODORO =====
const POMO_STUDY_SEC = 25 * 60;
const POMO_BREAK_SEC = 5 * 60;
const POMO_LONG_BREAK_SEC = 15 * 60;
let pomoQueue = Promise.resolve();

function queuePomo(work) {
  const next = pomoQueue.then(work);
  pomoQueue = next.catch(() => {});
  return next;
}

function selectPomoPhase(state, phase) {
  const durations = { study: state.studySec, break: state.breakSec, longBreak: POMO_LONG_BREAK_SEC };
  return {
    studySec: state.studySec, breakSec: state.breakSec,
    phase, remaining: durations[phase], running: false, endTime: null
  };
}

async function getPomoState() {
  const { pomoState } = await chrome.storage.local.get("pomoState");
  const durations = { studySec: POMO_STUDY_SEC, breakSec: POMO_BREAK_SEC };
  return pomoState ? { ...durations, ...pomoState } : selectPomoPhase(durations, "study");
}

function nextPomoPhase(state, completedStudySessions) {
  if (state.phase !== "study") return "study";
  return completedStudySessions > 0 && completedStudySessions % 4 === 0 ? "longBreak" : "break";
}

async function finishExpiredPomo() {
  const state = await getPomoState();
  if (!state.running || !state.endTime || state.endTime > Date.now()) return state;

  const { pomoHistory = {}, dailyPomoCount = {} } = await chrome.storage.local.get(["pomoHistory", "dailyPomoCount"]);
  const today = FocusFlowTrackingCore.dayKey(state.endTime);
  const done = state.phase;
  const sessionCount = dailyPomoCount[today] ?? (pomoHistory[today] || []).filter(item => item.phase === "study").length;
  dailyPomoCount[today] = sessionCount + Number(done === "study");
  const time = new Date(state.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  pomoHistory[today] = [{ phase: done, time }, ...(pomoHistory[today] || [])].slice(0, 50);
  const next = {
    ...selectPomoPhase(state, nextPomoPhase(state, dailyPomoCount[today])),
    completedAt: state.endTime
  };
  await chrome.storage.local.set({ pomoState: next, pomoHistory, dailyPomoCount });
  try {
    await chrome.notifications.create("pomo-" + state.endTime, {
      type: "basic", iconUrl: "icon.png",
      title: done === "study" ? "Study Session Complete" : "Break Over",
      message: done === "study" ? "Time for a well-earned break." : "Ready for another focus session."
    });
  } catch (error) {
    console.warn("FocusFlow timer notification:", error);
  }
  return next;
}

async function applyPomoCommand(msg) {
  const state = await finishExpiredPomo();
  let next;
  switch (msg.type) {
    case "POMO_GET_STATE":
      return state;
    case "POMO_START": {
      if (state.running) return state;
      const remaining = state.remaining || selectPomoPhase(state, state.phase).remaining;
      next = { ...state, remaining, running: true, endTime: Date.now() + remaining * 1000, completedAt: null };
      break;
    }
    case "POMO_PAUSE":
      if (!state.running) return state;
      next = { ...state, running: false, remaining: Math.ceil((state.endTime - Date.now()) / 1000), endTime: null };
      break;
    case "POMO_RESET":
      next = selectPomoPhase(state, "study");
      break;
    case "POMO_SKIP":
      next = selectPomoPhase(state, state.phase === "study" ? "break" : "study");
      break;
    case "POMO_SELECT_PHASE":
      if (state.running || !["study", "break", "longBreak"].includes(msg.phase)) {
        return { ok: false, reason: "Pause the timer before changing modes." };
      }
      next = selectPomoPhase(state, msg.phase);
      break;
    case "POMO_SET_DURATIONS":
      if (state.running) return { ok: false, reason: "Pause the timer before changing durations." };
      if (!Number.isInteger(msg.studySec / 60) || msg.studySec < 60 || msg.studySec > 7200 ||
          !Number.isInteger(msg.breakSec / 60) || msg.breakSec < 60 || msg.breakSec > 3600) {
        return { ok: false, reason: "Enter 1–120 study minutes and 1–60 break minutes." };
      }
      next = selectPomoPhase({ studySec: msg.studySec, breakSec: msg.breakSec }, "study");
      break;
    default:
      return { ok: false, reason: "Unknown timer command." };
  }
  await chrome.storage.local.set({ pomoState: next });
  if (next.running) await chrome.alarms.create(POMO_ALARM, { when: next.endTime });
  else await chrome.alarms.clear(POMO_ALARM);
  return next;
}

/* ===== Persistent per-site dark mode ===== */
const FOCUSFLOW_DARK_STYLES = {
  smart: (i) => `html { color-scheme: dark !important; background: #101216 !important; filter: invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg) !important; }`,
  invert: (i) => `html { filter: invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg) !important; }`,
  dim: (i) => `html { background: #101216 !important; filter: brightness(${Math.max(35, 100 - Math.round(i * 0.45))}%) !important; color-scheme: dark !important; }`,
  grayscale: (i) => `html { filter: grayscale(100%) invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture { filter: invert(100%) hue-rotate(180deg) !important; }`
};

function focusFlowDarkCss(style, intensity) {
  return (FOCUSFLOW_DARK_STYLES[style] || FOCUSFLOW_DARK_STYLES.smart)(intensity);
}

function focusFlowSupportedTab(tab) {
  return Boolean(tab?.id && tab.url && !/^(chrome|edge|about|chrome-extension):/.test(tab.url));
}

async function focusFlowApplyDark(tab, previousState = null) {
  if (!focusFlowSupportedTab(tab)) return;
  try {
    const saved = await chrome.storage.local.get("darkMode");
    const state = saved.darkMode || { global: false, style: "smart", intensity: 90, sites: {} };
    const domain = new URL(tab.url).hostname.replace(/^www\./, "");
    const enabled = state.sites?.[domain] !== undefined ? state.sites[domain] : Boolean(state.global);
    const target = { tabId: tab.id };

    if (previousState) {
      const oldStyle = previousState.style || "smart";
      const oldIntensity = Math.max(50, Math.min(100, Number(previousState.intensity) || 90));
      await chrome.scripting.removeCSS({
        target, css: focusFlowDarkCss(oldStyle, oldIntensity)
      }).catch(() => {});
    }

    const css = focusFlowDarkCss(state.style || "smart", Math.max(50, Math.min(100, Number(state.intensity) || 90)));
    await chrome.scripting.removeCSS({ target, css }).catch(() => {});
    if (enabled) await chrome.scripting.insertCSS({ target, css });
  } catch (error) {
    // Chrome internal pages and restricted pages cannot accept injected CSS.
  }
}

async function focusFlowApplyDarkToOpenTabs(previousState = null) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) await focusFlowApplyDark(tab, previousState);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") focusFlowApplyDark(tab);
});
let darkQueue = Promise.resolve();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.darkMode) {
    darkQueue = darkQueue.then(() => focusFlowApplyDarkToOpenTabs(changes.darkMode.oldValue || null)).catch(console.warn);
  }
});
chrome.runtime.onStartup.addListener(() => focusFlowApplyDarkToOpenTabs());
chrome.runtime.onInstalled.addListener(() => focusFlowApplyDarkToOpenTabs());


// Website profile automation (kept separate from existing tracking and dark-mode handlers).
importScripts("profiles-background.js", "smart-focus-background.js");
