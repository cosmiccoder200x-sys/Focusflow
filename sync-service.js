// ===== FocusFlow → RangOS — sync-service.js =====
// Manifest V3 service worker that wraps the existing background.js
// and adds RangOS screen-time synchronization via Chrome alarms.
//
// Architecture:
//   importScripts("background.js") — preserves ALL existing tracking, blocking,
//   Pomodoro, and message handling from the original service worker.
//   This file ONLY adds the sync layer on top.

// ---- Import the existing background.js (all its listeners remain active) ----
importScripts("background.js");

// ---- Alarm names (namespaced to avoid collision with existing alarms) ----
const RANGOS_SYNC_ALARM = "rangos_sync_15min";
const RANGOS_DAILY_ALARM = "rangos_sync_daily";

// ---- Category classification for productivity scoring ----
// Uses the same categories defined in background.js SITE_CATEGORIES_AUTO.
// "Productive" = coding, documentation, study
// "Distracting" = entertainment, social
// Other categories (news, uncategorized) are neutral — counted in total but not in either bucket.
const PRODUCTIVE_CATEGORIES = new Set(["coding", "documentation", "study"]);
const DISTRACTING_CATEGORIES = new Set(["entertainment", "social"]);

// ---- Initialize sync alarms on extension start ----
async function initRangosSync() {
  const r = await chrome.storage.local.get("rangosSyncEnabled");
  if (!r.rangosSyncEnabled) {
    console.log("[RangOS Sync] Sync disabled — skipping alarm setup");
    return;
  }

  // 15-minute periodic sync
  const existing15 = await chrome.alarms.get(RANGOS_SYNC_ALARM);
  if (!existing15) {
    chrome.alarms.create(RANGOS_SYNC_ALARM, {
      delayInMinutes: 15,
      periodInMinutes: 15,
    });
    console.log("[RangOS Sync] Created 15-minute sync alarm");
  }

  // Daily sync at ~23:58 local time
  scheduleDailyAlarm();

  // Also sync now on startup if there's pending data
  await performSync("startup");
}

// ---- Schedule daily alarm for 23:58 local time ----
function scheduleDailyAlarm() {
  const now = new Date();
  let target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    58,
    0
  );

  // If 23:58 already passed today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const delayMs = target.getTime() - now.getTime();
  const delayMin = delayMs / (60 * 1000);

  chrome.alarms.create(RANGOS_DAILY_ALARM, {
    delayInMinutes: delayMin,
    periodInMinutes: 24 * 60, // repeat every 24 hours
  });
  console.log(
    `[RangOS Sync] Daily alarm scheduled for ${target.toLocaleString()} (in ${Math.round(delayMin)} minutes)`
  );
}

// ---- Build sync payload from existing FocusFlow storage ----
async function buildSyncPayload() {
  const r = await chrome.storage.local.get(["timeData", "siteCategories"]);
  const timeData = r.timeData || {};
  const siteCategories = r.siteCategories || {};

  // Get today's date key (matches background.js getTodayKey format)
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const todayData = timeData[today] || {};

  // Calculate totals from the existing tracking data (values are in seconds)
  let totalSeconds = 0;
  let productiveSeconds = 0;
  let distractingSeconds = 0;
  const siteTimes = []; // for top sites

  for (const [domain, seconds] of Object.entries(todayData)) {
    totalSeconds += seconds;
    const category = siteCategories[domain] || "uncategorized";

    if (PRODUCTIVE_CATEGORIES.has(category)) {
      productiveSeconds += seconds;
    } else if (DISTRACTING_CATEGORIES.has(category)) {
      distractingSeconds += seconds;
    }

    siteTimes.push({ domain, seconds });
  }

  // Convert to minutes
  const totalMinutes = Math.round(totalSeconds / 60);
  const productiveMinutes = Math.round(productiveSeconds / 60);
  const distractingMinutes = Math.round(distractingSeconds / 60);
  const productivityPercent =
    totalMinutes > 0
      ? Math.round((productiveMinutes / totalMinutes) * 100)
      : 0;

  // Top sites — sorted by time, top 10
  siteTimes.sort((a, b) => b.seconds - a.seconds);
  const topSites = siteTimes.slice(0, 10).map((s) => ({
    domain: s.domain,
    minutes: Math.round(s.seconds / 60),
  }));

  // Session count proxy: number of distinct tracked domains today.
  // NOTE: FocusFlow does not track individual browser sessions.
  // This is a documented proxy — each unique domain visited counts as one "session".
  // When real session tracking is added, replace this with actual session data.
  const sessions = Object.keys(todayData).length;

  return {
    date: today,
    total_minutes: totalMinutes,
    productive_minutes: productiveMinutes,
    distracting_minutes: distractingMinutes,
    productivity_percent: productivityPercent,
    sessions: sessions,
    top_sites: topSites,
  };
}

// ---- Perform the actual sync to the backend ----
async function performSync(reason = "scheduled") {
  console.log(`[RangOS Sync] Starting sync (reason: ${reason})`);

  try {
    // Check if sync is enabled and configured
    const config = await chrome.storage.local.get([
      "rangosSyncEnabled",
      "rangosSyncEndpoint",
      "rangosSyncKey",
    ]);

    if (!config.rangosSyncEnabled) {
      console.log("[RangOS Sync] Sync disabled — skipping");
      return;
    }

    if (!config.rangosSyncEndpoint || !config.rangosSyncKey) {
      const errMsg = "Sync not configured (missing endpoint or key)";
      console.warn("[RangOS Sync]", errMsg);
      await chrome.storage.local.set({ rangosSyncError: errMsg });
      return;
    }

    // Build payload from existing FocusFlow data
    const payload = await buildSyncPayload();

    // Skip if no tracking data today
    if (payload.total_minutes === 0) {
      console.log("[RangOS Sync] No tracking data today — skipping");
      await chrome.storage.local.set({
        rangosLastSync: new Date().toISOString(),
        rangosLastSyncReason: reason,
        rangosSyncError: null,
      });
      return;
    }

    // Send to backend
    const response = await fetch(config.rangosSyncEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FocusFlow-Key": config.rangosSyncKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      console.log(`[RangOS Sync] Success (${result.action || "ok"}) for ${payload.date}`);
      await chrome.storage.local.set({
        rangosLastSync: new Date().toISOString(),
        rangosLastSyncReason: reason,
        rangosSyncError: null,
      });
    } else {
      const errMsg = `HTTP ${response.status}: ${result.error || "Unknown error"}`;
      console.error("[RangOS Sync] Failed:", errMsg);
      await chrome.storage.local.set({
        rangosSyncError: errMsg,
        rangosLastSyncReason: reason,
      });
    }
  } catch (err) {
    // Network error, backend down, etc. — don't crash, just store the error
    const errMsg = `Network error: ${err.message || "Unknown"}`;
    console.error("[RangOS Sync] Error:", errMsg);
    await chrome.storage.local.set({
      rangosSyncError: errMsg,
      rangosLastSyncReason: reason,
    });
  }
}

// ---- Handle sync alarms ----
// NOTE: We add a SECOND alarm listener here. Chrome Manifest V3 supports
// multiple addListener calls — they all fire. The existing background.js
// alarm listener handles "tickAlarm" and "pomoAlarm"; this one handles
// the rangos sync alarms. There is no conflict.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === RANGOS_SYNC_ALARM) {
    await performSync("periodic");
  }
  if (alarm.name === RANGOS_DAILY_ALARM) {
    await performSync("daily");
  }
});

// ---- Handle manual sync requests from options page / popup ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "RANGOS_SYNC_NOW") {
    performSync("manual").then(() => {
      chrome.storage.local
        .get(["rangosLastSync", "rangosSyncError"])
        .then((r) => {
          sendResponse({
            ok: !r.rangosSyncError,
            lastSync: r.rangosLastSync,
            error: r.rangosSyncError,
          });
        });
    });
    return true; // keep channel open for async response
  }

  if (msg.type === "RANGOS_GET_STATUS") {
    chrome.storage.local
      .get(["rangosLastSync", "rangosLastSyncReason", "rangosSyncError", "rangosSyncEnabled"])
      .then((r) => {
        sendResponse(r);
      });
    return true;
  }
});

// ---- Storage change listener to enable/disable sync alarms ----
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local") return;

  if (changes.rangosSyncEnabled) {
    if (changes.rangosSyncEnabled.newValue) {
      console.log("[RangOS Sync] Sync enabled — setting up alarms");
      await initRangosSync();
    } else {
      console.log("[RangOS Sync] Sync disabled — clearing alarms");
      await chrome.alarms.clear(RANGOS_SYNC_ALARM);
      await chrome.alarms.clear(RANGOS_DAILY_ALARM);
    }
  }
});

// ---- Initialize on service worker startup ----
// Uses a separate init function to avoid conflicting with background.js init()
(async () => {
  try {
    await initRangosSync();
    console.log("[RangOS Sync] Service worker initialized");
  } catch (err) {
    console.error("[RangOS Sync] Init error:", err);
  }
})();
