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

function isBlocked(domain) {
  if (!domain) return false;
  return BLOCKED_SITES.some(b => domain === b || domain.endsWith("." + b));
}

function isCodingSite(domain) {
  if (!domain) return false;
  return CODING_SITES.some(c => domain === c || domain.endsWith("." + c));
}

// ---- TRACKING STATE ----
let activeTabId     = null;
let activeTabDomain = null;
let activeTabStart  = null;

async function flushSeconds(domain, secs) {
  if (!domain || secs <= 0) return;
  const key = getTodayKey();
  const r = await chrome.storage.local.get("timeData");
  const timeData = r.timeData || {};
  if (!timeData[key]) timeData[key] = {};
  timeData[key][domain] = (timeData[key][domain] || 0) + Math.round(secs);
  await chrome.storage.local.set({ timeData });

  // Auto-categorize if not already categorized
  if (SITE_CATEGORIES_AUTO[domain]) {
    const cr = await chrome.storage.local.get("siteCategories");
    const cats = cr.siteCategories || {};
    if (!cats[domain]) {
      cats[domain] = SITE_CATEGORIES_AUTO[domain];
      await chrome.storage.local.set({ siteCategories: cats });
    }
  }
}

async function onTick() {
  if (activeTabDomain && activeTabStart) {
    const now = Date.now();
    await flushSeconds(activeTabDomain, 1);
    activeTabStart = now;
  }
  // Update productivity score every 60 seconds (handled by popup, but keep fresh)
}

async function startTracking(tabId, domain) {
  if (activeTabDomain && activeTabDomain !== domain && activeTabStart) {
    const elapsed = (Date.now() - activeTabStart) / 1000;
    if (elapsed > 0) await flushSeconds(activeTabDomain, elapsed);
  }
  activeTabId     = tabId;
  activeTabDomain = domain;
  activeTabStart  = Date.now();
  await chrome.storage.local.set({
    activeTracking: { tabId, domain, start: activeTabStart }
  });
}

async function stopTracking() {
  if (activeTabDomain && activeTabStart) {
    const elapsed = (Date.now() - activeTabStart) / 1000;
    if (elapsed > 0) await flushSeconds(activeTabDomain, elapsed);
  }
  activeTabId     = null;
  activeTabDomain = null;
  activeTabStart  = null;
  await chrome.storage.local.remove("activeTracking");
}

async function handleTabFocus(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith("chrome") || tab.url.startsWith("about")) {
      await stopTracking(); return;
    }
    const domain = getDomain(tab.url);
    if (isBlocked(domain)) {
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
      await stopTracking(); return;
    }
    if (domain) await startTracking(tabId, domain);
    else await stopTracking();
  } catch { await stopTracking(); }
}

// ---- Alarms ----
const TICK_ALARM = "tickAlarm";
const POMO_ALARM = "pomoAlarm";

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === TICK_ALARM) { await onTick(); return; }
  if (alarm.name === POMO_ALARM) { await handlePomoAlarm(); }
});

async function init() {
  const r = await chrome.storage.local.get("activeTracking");
  if (r.activeTracking) {
    const { tabId, domain, start } = r.activeTracking;
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.active) {
        activeTabId     = tabId;
        activeTabDomain = domain;
        const missedSec = Math.floor((Date.now() - start) / 1000);
        if (missedSec > 0) await flushSeconds(domain, missedSec);
        activeTabStart = Date.now();
      }
    } catch { await chrome.storage.local.remove("activeTracking"); }
  }

  const existing = await chrome.alarms.get(TICK_ALARM);
  if (!existing) {
    chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1/60 });
  }

  const ps = await getPomoState();
  if (ps.running && ps.endTime && ps.endTime > Date.now()) {
    const ex2 = await chrome.alarms.get(POMO_ALARM);
    if (!ex2) chrome.alarms.create(POMO_ALARM, { when: ps.endTime });
  }
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
init();

// ---- Tab Events ----
chrome.tabs.onActivated.addListener(({ tabId }) => handleTabFocus(tabId));

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const domain = getDomain(tab.url);
  if (isBlocked(domain)) {
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL("blocked.html") });
    await stopTracking(); return;
  }
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (active && active.id === tabId) await startTracking(tabId, domain);
  } catch {}
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === activeTabId) await stopTracking();
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab) await handleTabFocus(tab.id);
    else await stopTracking();
  } catch {}
});

// ---- Messages ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_LIVE_STATUS") {
    const elapsed = (activeTabStart && activeTabDomain)
      ? Math.floor((Date.now() - activeTabStart) / 1000) : 0;
    sendResponse({ domain: activeTabDomain, elapsedSeconds: elapsed });
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
