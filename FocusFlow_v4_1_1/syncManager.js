// ===== FOCUSFLOW — syncManager.js v4.2 =====
// Generic website sync — push FocusFlow data to any HTTP endpoint you configure
// in Settings > Website Sync. Works from both popup.js and background.js
// (loaded via <script> in the popup, via importScripts in the service worker).

const SYNC_VERSION = "1.0.0";
const APP_ID = "focusflow";

// ---- Export all user data in structured format ----
async function exportUserData() {
  const keys = [
    "timeData", "siteCategories", "blockedSites", "tasks", "quickNotes",
    "pomoHistory", "pomoState", "dailyPomoCount", "achievements",
    "dsaProgress", "weeklyReports"
  ];
  const r = await chrome.storage.local.get(keys);

  return {
    meta: {
      app: APP_ID,
      version: SYNC_VERSION,
      exportedAt: new Date().toISOString(),
      schemaVersion: 2
    },
    tracking: {
      timeData: r.timeData || {},
      siteCategories: r.siteCategories || {},
      blockedSites: r.blockedSites || []
    },
    productivity: {
      tasks: r.tasks || [],
      notes: r.quickNotes || "",
      pomoHistory: r.pomoHistory || {},
      pomoState: r.pomoState || {},
      dailyPomoCount: r.dailyPomoCount || {}
    },
    progress: {
      achievements: r.achievements || {},
      dsaProgress: r.dsaProgress || {}
    },
    reports: {
      weeklyReports: r.weeklyReports || []
    }
  };
}

// ---- Import user data from structured format ----
async function importUserData(payload) {
  if (!payload || !payload.meta || payload.meta.app !== APP_ID) {
    throw new Error("Invalid FocusFlow backup file.");
  }

  const toSet = {};

  if (payload.tracking) {
    if (payload.tracking.timeData)      toSet.timeData      = payload.tracking.timeData;
    if (payload.tracking.siteCategories) toSet.siteCategories = payload.tracking.siteCategories;
    if (payload.tracking.blockedSites)  toSet.blockedSites  = payload.tracking.blockedSites;
  }

  if (payload.productivity) {
    if (payload.productivity.tasks)         toSet.tasks         = payload.productivity.tasks;
    if (payload.productivity.notes)         toSet.quickNotes    = payload.productivity.notes;
    if (payload.productivity.pomoHistory)   toSet.pomoHistory   = payload.productivity.pomoHistory;
    if (payload.productivity.pomoState)     toSet.pomoState     = payload.productivity.pomoState;
    if (payload.productivity.dailyPomoCount) toSet.dailyPomoCount = payload.productivity.dailyPomoCount;
  }

  if (payload.progress) {
    if (payload.progress.achievements) toSet.achievements = payload.progress.achievements;
    if (payload.progress.dsaProgress)  toSet.dsaProgress  = payload.progress.dsaProgress;
  }

  if (payload.reports) {
    if (payload.reports.weeklyReports) toSet.weeklyReports = payload.reports.weeklyReports;
  }

  await chrome.storage.local.set(toSet);
  return { ok: true, imported: Object.keys(toSet) };
}

// =============================================
// WEBSITE SYNC — push exported data to a configured HTTP endpoint
// =============================================

// ---- Read / save the sync config (URL, optional key, auto-sync toggle) ----
async function getSyncConfig() {
  const r = await chrome.storage.local.get("syncConfig");
  return r.syncConfig || { url: "", key: "", autoSync: false };
}

async function saveSyncConfig(config) {
  const current = await getSyncConfig();
  const merged = { ...current, ...config };
  await chrome.storage.local.set({ syncConfig: merged });
  return merged;
}

// ---- POST the current export to the configured website ----
async function pushToWebsite(url, key) {
  if (!url) throw new Error("No website URL configured.");
  const payload = await exportUserData();

  const headers = { "Content-Type": "application/json" };
  if (key) headers["X-FocusFlow-Key"] = key;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`Sync failed: ${res.status} ${res.statusText}`);
  return { ok: true, status: res.status, sentAt: new Date().toISOString() };
}

// ---- Run a sync using the saved config, and record the result ----
async function runSync() {
  const config = await getSyncConfig();
  try {
    const result = await pushToWebsite(config.url, config.key);
    await chrome.storage.local.set({
      syncStatus: { ok: true, lastSyncedAt: result.sentAt, lastError: null }
    });
    return result;
  } catch (err) {
    await chrome.storage.local.set({
      syncStatus: { ok: false, lastSyncedAt: null, lastError: err.message }
    });
    throw err;
  }
}

// `self` resolves in both the popup window and the background service worker,
// unlike `window`, which only exists in the popup.
self.SyncManager = {
  exportUserData, importUserData,
  getSyncConfig, saveSyncConfig, pushToWebsite, runSync
};
