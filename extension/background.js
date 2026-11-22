// ===== FOCUSFLOW — background.js v4.0 =====
// Preserves all v3.0 tracking accuracy + new scoring + coding detection

const DEFAULT_BLOCKED = [
  "instagram.com","facebook.com","twitter.com","x.com",
  "snapchat.com","tiktok.com","reddit.com","9gag.com",
  "netflix.com","hotstar.com","primevideo.com"
];

const CODING_SITES = [
  "leetcode.com","codeforces.com","codechef.com",
  "hackerrank.com","github.com","geeksforgeeks.org"
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

let BLOCKED_SITES = [...DEFAULT_BLOCKED];

chrome.storage.local.get("blockedSites").then(r => {
  if (r.blockedSites && r.blockedSites.length) BLOCKED_SITES = r.blockedSites;
  else chrome.storage.local.set({ blockedSites: BLOCKED_SITES });
});

// ---- Helpers ----
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
  return BLOCKED_SITES.some(b => domain === b || domain.endsWith("." + b));
}

function isCodingSite(domain) {
  if (!domain) return false;
  return CODING_SITES.some(c => domain === c || domain.endsWith("." + c));
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
  if (alarm.name === POMO_ALARM) handlePomoAlarm();
});

async function init() {
  // Chrome 120+ supports minimum 30-second alarms; 1-second alarms do not run
  // at their requested cadence. Measure real elapsed time instead.
  await chrome.alarms.create(TICK_ALARM, { periodInMinutes: 0.5 });
  await reconcileTracking();

  // Existing Pomodoro alarm behavior is preserved.
  const ps = await getPomoState();
  if (ps.running && ps.endTime && ps.endTime > Date.now()) {
    const existing = await chrome.alarms.get(POMO_ALARM);
    if (!existing) await chrome.alarms.create(POMO_ALARM, { when: ps.endTime });
  }
}

chrome.runtime.onInstalled.addListener(() => { init().catch(console.warn); });
chrome.runtime.onStartup.addListener(() => { init().catch(console.warn); });
init().catch(console.warn);

// Re-query the *actual* focused browser state rather than trusting event args.
chrome.tabs.onActivated.addListener(({ tabId }) => { handleTabFocus(tabId).catch(console.warn); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
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

  if (msg.type === "GET_BLOCKED_SITES") {
    sendResponse({ sites: BLOCKED_SITES });
  }

  if (msg.type === "SET_BLOCKED_SITES") {
    BLOCKED_SITES = msg.sites;
    chrome.storage.local.set({ blockedSites: BLOCKED_SITES });
    sendResponse({ ok: true });
  }

  if (msg.type === "GET_AUTO_CATEGORIES") {
    sendResponse({ categories: SITE_CATEGORIES_AUTO });
  }

  if (msg.type === "POMO_GET_STATE") {
    getPomoState().then(sendResponse); return true;
  }

  if (msg.type === "POMO_START") {
    (async () => {
      const state = await getPomoState();
      const studySec = msg.studySec || POMO_STUDY_SEC;
      const breakSec = msg.breakSec || POMO_BREAK_SEC;
      const fullDur  = state.phase === "study" ? studySec : breakSec;
      const remaining = state.remaining > 0 ? state.remaining : fullDur;
      const endTime   = Date.now() + remaining * 1000;
      const newState  = { running: true, phase: state.phase, remaining, endTime, studySec, breakSec };
      await setPomoState(newState);
      await chrome.alarms.create(POMO_ALARM, { when: endTime });
      sendResponse(newState);
    })(); return true;
  }

  if (msg.type === "POMO_PAUSE") {
    (async () => {
      const state = await getPomoState();
      const remaining = (state.running && state.endTime)
        ? Math.max(0, Math.round((state.endTime - Date.now()) / 1000))
        : state.remaining;
      await chrome.alarms.clear(POMO_ALARM);
      const newState = { running: false, phase: state.phase, remaining, endTime: null,
        studySec: state.studySec, breakSec: state.breakSec };
      await setPomoState(newState);
      sendResponse(newState);
    })(); return true;
  }

  if (msg.type === "POMO_RESET") {
    (async () => {
      await chrome.alarms.clear(POMO_ALARM);
      const state = await getPomoState();
      const newState = defaultPomoState(state.studySec || POMO_STUDY_SEC, state.breakSec || POMO_BREAK_SEC);
      await setPomoState(newState);
      sendResponse(newState);
    })(); return true;
  }

  if (msg.type === "POMO_SET_DURATIONS") {
    (async () => {
      const state = await getPomoState();
      if (state.running) { sendResponse({ ok: false, reason: "Stop timer first" }); return; }
      const newState = defaultPomoState(msg.studySec, msg.breakSec);
      await setPomoState(newState);
      sendResponse(newState);
    })(); return true;
  }

  return true;
});

// ===== POMODORO =====
const POMO_STUDY_SEC = 25 * 60;
const POMO_BREAK_SEC = 5  * 60;

function defaultPomoState(studySec = POMO_STUDY_SEC, breakSec = POMO_BREAK_SEC) {
  return { running: false, phase: "study", remaining: studySec, endTime: null, studySec, breakSec };
}

async function getPomoState() {
  const r = await chrome.storage.local.get("pomoState");
  return r.pomoState || defaultPomoState();
}

async function setPomoState(state) {
  await chrome.storage.local.set({ pomoState: state });
}

async function savePomoHistory(phase) {
  const r = await chrome.storage.local.get("pomoHistory");
  const history = r.pomoHistory || {};
  const today = getTodayKey();
  if (!history[today]) history[today] = [];
  history[today].unshift({
    phase, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  });
  if (history[today].length > 50) history[today] = history[today].slice(0, 50);
  await chrome.storage.local.set({ pomoHistory: history });

  // Increment pomo count for achievements
  const ar = await chrome.storage.local.get("dailyPomoCount");
  const dpc = ar.dailyPomoCount || {};
  if (!dpc[today]) dpc[today] = 0;
  if (phase === "study") dpc[today]++;
  await chrome.storage.local.set({ dailyPomoCount: dpc });
}

function notifyPomoDone(donePhase) {
  try {
    chrome.notifications.create("pomo-" + Date.now(), {
      type: "basic", iconUrl: "icon.png",
      title: donePhase === "study" ? "✅ Study Session Complete!" : "⏰ Break Over!",
      message: donePhase === "study" ? "Time for a well-earned break." : "Back to work — stay focused.",
      priority: 2
    });
  } catch {}
}

async function handlePomoAlarm() {
  const state = await getPomoState();
  const donePhase = state.phase;
  await savePomoHistory(donePhase);
  notifyPomoDone(donePhase);
  const nextPhase     = donePhase === "study" ? "break" : "study";
  const studySec      = state.studySec || POMO_STUDY_SEC;
  const breakSec      = state.breakSec || POMO_BREAK_SEC;
  const nextRemaining = nextPhase === "study" ? studySec : breakSec;
  await setPomoState({ running: false, phase: nextPhase, remaining: nextRemaining, endTime: null, studySec, breakSec });
}

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;
  if (changes.tasks) {
    // Task blocking handled via SET_BLOCKED_SITES messages
  }
});


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

    if (enabled) {
      await chrome.scripting.insertCSS({
        target,
        css: focusFlowDarkCss(state.style || "smart", Math.max(50, Math.min(100, Number(state.intensity) || 90)))
      });
    }
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
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.darkMode) focusFlowApplyDarkToOpenTabs(changes.darkMode.oldValue || null);
});
chrome.runtime.onStartup.addListener(() => focusFlowApplyDarkToOpenTabs());
chrome.runtime.onInstalled.addListener(() => focusFlowApplyDarkToOpenTabs());


// Website profile automation (kept separate from existing tracking and dark-mode handlers).
importScripts("profiles-background.js", "smart-focus-background.js");
