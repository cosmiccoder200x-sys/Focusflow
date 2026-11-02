// ===== FOCUSFLOW — syncManager.js v4.0 =====
// HabitOS Integration Architecture — PREPARED BUT NOT ACTIVE
// Cloud sync is NOT implemented. This module only structures data for future use.

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

// ---- Queue pending sync operations (for future cloud sync) ----
async function syncQueue(operation, data) {
  // Future: push to HabitOS API
  // For now: stores locally in a pending queue
  const r = await chrome.storage.local.get("syncQueue");
  const queue = r.syncQueue || [];
  queue.push({
    id: Date.now(),
    operation,
    data,
    timestamp: new Date().toISOString(),
    status: "pending"
  });
  // Keep last 100 operations
  if (queue.length > 100) queue.splice(0, queue.length - 100);
  await chrome.storage.local.set({ syncQueue: queue });
}

// ---- Prepare HabitOS API payload ----
async function preparePayload(type = "full") {
  const data = await exportUserData();

  if (type === "habits") {
    // Map FocusFlow data → HabitOS habit format
    const today = new Date().toISOString().slice(0,10);
    const todayTracking = data.tracking.timeData[today] || {};
    const totalSecs = Object.values(todayTracking).reduce((a,b) => a+b, 0);
    const cats = data.tracking.siteCategories || {};
    const codingSecs = Object.entries(todayTracking)
      .filter(([d]) => ["leetcode.com","github.com","codeforces.com","codechef.com","hackerrank.com","geeksforgeeks.org"].includes(d))
      .reduce((a,[,s]) => a+s, 0);

    return {
      habitosPayload: {
        date: today,
        habits: [
          { id: "focus_time",    value: Math.round(totalSecs / 60), unit: "minutes" },
          { id: "coding_time",   value: Math.round(codingSecs / 60), unit: "minutes" },
          { id: "tasks_done",    value: (data.productivity.tasks || []).filter(t => t.done).length, unit: "count" },
          { id: "pomo_sessions", value: (data.productivity.dailyPomoCount[today] || 0), unit: "count" }
        ]
      }
    };
  }

  return { habitosPayload: data };
}

// Expose to popup via chrome.storage events (no direct import needed)
window.SyncManager = { exportUserData, importUserData, syncQueue, preparePayload };
