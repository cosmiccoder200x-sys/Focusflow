// ===== FocusFlow — options.js =====
// Logic for the RangOS sync settings page (options.html)

const $ = (id) => document.getElementById(id);

const endpointInput = $("endpoint");
const syncKeyInput = $("syncKey");
const syncEnabledInput = $("syncEnabled");
const saveBtn = $("saveBtn");
const testBtn = $("testBtn");
const syncNowBtn = $("syncNowBtn");
const statusMsg = $("statusMsg");
const lastSyncTime = $("lastSyncTime");
const lastSyncReason = $("lastSyncReason");
const lastSyncStatus = $("lastSyncStatus");

// ---- Load saved settings ----
async function loadSettings() {
  const r = await chrome.storage.local.get([
    "rangosSyncEndpoint",
    "rangosSyncKey",
    "rangosSyncEnabled",
    "rangosLastSync",
    "rangosLastSyncReason",
    "rangosSyncError",
  ]);

  endpointInput.value = r.rangosSyncEndpoint || "";
  syncKeyInput.value = r.rangosSyncKey || "";
  syncEnabledInput.checked = !!r.rangosSyncEnabled;

  updateSyncStatus(r);
}

// ---- Update sync status display ----
function updateSyncStatus(r) {
  if (r.rangosLastSync) {
    const d = new Date(r.rangosLastSync);
    lastSyncTime.textContent = d.toLocaleString();
  } else {
    lastSyncTime.textContent = "Never";
  }

  lastSyncReason.textContent = r.rangosLastSyncReason || "—";

  if (r.rangosSyncError) {
    lastSyncStatus.textContent = r.rangosSyncError;
    lastSyncStatus.className = "value error-text";
  } else if (r.rangosLastSync) {
    lastSyncStatus.textContent = "✓ OK";
    lastSyncStatus.className = "value success-text";
  } else {
    lastSyncStatus.textContent = "—";
    lastSyncStatus.className = "value";
  }
}

// ---- Show status message ----
function showStatus(type, message) {
  statusMsg.className = `status ${type}`;
  statusMsg.textContent = message;

  // Auto-hide after 6 seconds
  clearTimeout(statusMsg._timer);
  statusMsg._timer = setTimeout(() => {
    statusMsg.className = "status";
    statusMsg.textContent = "";
  }, 6000);
}

// ---- Save settings ----
saveBtn.addEventListener("click", async () => {
  const endpoint = endpointInput.value.trim();
  const syncKey = syncKeyInput.value.trim();
  const enabled = syncEnabledInput.checked;

  // Basic validation
  if (enabled && !endpoint) {
    showStatus("error", "Endpoint URL is required when sync is enabled");
    return;
  }

  if (enabled && !syncKey) {
    showStatus("error", "Sync key is required when sync is enabled");
    return;
  }

  if (endpoint && !endpoint.startsWith("https://")) {
    showStatus("error", "Endpoint must use HTTPS");
    return;
  }

  await chrome.storage.local.set({
    rangosSyncEndpoint: endpoint,
    rangosSyncKey: syncKey,
    rangosSyncEnabled: enabled,
  });

  showStatus("success", "✓ Settings saved successfully");
});

// ---- Test connection ----
testBtn.addEventListener("click", async () => {
  const endpoint = endpointInput.value.trim();
  const syncKey = syncKeyInput.value.trim();

  if (!endpoint) {
    showStatus("error", "Enter an endpoint URL first");
    return;
  }

  if (!syncKey) {
    showStatus("error", "Enter a sync key first");
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = "⏳ Testing...";
  showStatus("info", "Sending test request...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FocusFlow-Key": syncKey,
      },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        total_minutes: 0,
        productive_minutes: 0,
        distracting_minutes: 0,
        productivity_percent: 0,
        sessions: 0,
        top_sites: [],
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      showStatus("success", `✓ Connection successful! (${result.action || "ok"})`);
    } else if (response.status === 401) {
      showStatus("error", "✗ Authentication failed — check your sync key");
    } else {
      showStatus("error", `✗ Server error (${response.status}): ${result.error || "Unknown"}`);
    }
  } catch (err) {
    showStatus("error", `✗ Connection failed: ${err.message}`);
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = "🔄 Test Sync";
  }
});

// ---- Sync Now ----
syncNowBtn.addEventListener("click", async () => {
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = "⏳ Syncing...";
  showStatus("info", "Triggering sync...");

  try {
    const response = await chrome.runtime.sendMessage({ type: "RANGOS_SYNC_NOW" });

    if (response && response.ok) {
      showStatus("success", `✓ Synced successfully at ${new Date(response.lastSync).toLocaleTimeString()}`);
    } else if (response && response.error) {
      showStatus("error", `✗ Sync failed: ${response.error}`);
    } else {
      showStatus("error", "✗ No response from sync service");
    }

    // Refresh status display
    const r = await chrome.storage.local.get([
      "rangosLastSync",
      "rangosLastSyncReason",
      "rangosSyncError",
    ]);
    updateSyncStatus(r);
  } catch (err) {
    showStatus("error", `✗ Error: ${err.message}`);
  } finally {
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = "⚡ Sync Now";
  }
});

// ---- Initialize ----
document.addEventListener("DOMContentLoaded", loadSettings);
