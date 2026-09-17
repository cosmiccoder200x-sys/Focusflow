// ===== LockIn — popup.js v1.0 =====
// Redesigned UI, all original business logic preserved

// =============================================
// HELPERS
// =============================================

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDateKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtSec(s) {
  s = Math.max(0, Math.round(s));
  if (s < 60) return s + "s";
  if (s < 3600) {
    const m = Math.floor(s/60), r = s%60;
    return r > 0 ? `${m}m ${r}s` : `${m}m`;
  }
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), r = s%60;
  return r > 0 ? `${h}h ${m}m ${r}s` : `${h}h ${m}m`;
}

function fmtShort(s) {
  s = Math.max(0, Math.round(s));
  if (s === 0) return "0s";
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s/60) + "m";
  return Math.floor(s/3600) + "h" + (Math.floor((s%3600)/60) > 0 ? Math.floor((s%3600)/60)+"m" : "");
}

function fmtMin(s) {
  const m = Math.round(s / 60);
  if (m < 60) return m + "m";
  const h = Math.floor(m / 60), rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

const CODING_SITES = ["leetcode.com","codeforces.com","codechef.com","hackerrank.com","github.com","geeksforgeeks.org"];
const CAT_COLORS = {
  coding: "#4caf82", study: "#5b8dd9", documentation: "#9b59b6",
  entertainment: "#c0564a", social: "#e67e22", news: "#00b4cc", other: "#5e5a52"
};

// =============================================
// NAVIGATION
// =============================================

let currentView = "home";

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.view === view);
    b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false");
  });
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById("view-" + view).classList.add("active");
  currentView = view;

  // Lazy render
  if (view === "insights") renderInsights();
  if (view === "home") refreshHome();
}

// Settings button in home header navigates to settings
document.getElementById("homeSettingsBtn")?.addEventListener("click", () => switchView("settings"));

// =============================================
// THEME
// =============================================

async function loadTheme() {
  const r = await chrome.storage.local.get(["theme", "bgStyle", "fontFamily"]);
  const t = r.theme || "gold";
  const bg = r.bgStyle || "solid";
  const font = r.fontFamily || "inter";
  
  document.body.setAttribute("data-theme", t);
  document.body.setAttribute("data-bg", bg);
  document.body.setAttribute("data-font", font);
  
  document.querySelectorAll(".theme-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.theme === t));
  document.querySelectorAll(".bg-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.bg === bg));
  document.querySelectorAll(".font-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.font === font));
}

document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const t = btn.dataset.theme;
    document.body.setAttribute("data-theme", t);
    await chrome.storage.local.set({ theme: t });
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.toggle("active", b.dataset.theme === t));
  });
});

document.querySelectorAll(".bg-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const bg = btn.dataset.bg;
    document.body.setAttribute("data-bg", bg);
    await chrome.storage.local.set({ bgStyle: bg });
    document.querySelectorAll(".bg-btn").forEach(b => b.classList.toggle("active", b.dataset.bg === bg));
  });
});

document.querySelectorAll(".font-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const font = btn.dataset.font;
    document.body.setAttribute("data-font", font);
    await chrome.storage.local.set({ fontFamily: font });
    document.querySelectorAll(".font-btn").forEach(b => b.classList.toggle("active", b.dataset.font === font));
  });
});

loadTheme();

// =============================================
// HOME DATE
// =============================================

function updateHomeDate() {
  const el = document.getElementById("homeDate");
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
updateHomeDate();

// =============================================
// LIVE TRACKING (background update)
// =============================================

let liveInterval = null;
let lastLive = null;

function startLive() {
  if (liveInterval) return;
  liveInterval = setInterval(async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "GET_LIVE_STATUS" });
      lastLive = resp;
      // Update live bar in insights
      const liveDomEl = document.getElementById("liveDomain");
      const liveTimeEl = document.getElementById("liveTime");
      if (liveDomEl) liveDomEl.textContent = resp.domain || "—";
      if (liveTimeEl) liveTimeEl.textContent = fmtSec(resp.elapsedSeconds);
      // Update home progress
      refreshHomeProgress(resp);
      // Update home status
      const homeLive = document.getElementById("homeLiveStatus");
      if (homeLive && resp.domain) {
        homeLive.textContent = "● " + resp.domain;
      }
      // Update Deep Work timer if active
      syncDeepWorkTimerDisplay();
    } catch {}
  }, 1000);
}

startLive();

// =============================================
// HOME — REFRESH
// =============================================

async function refreshHome() {
  updateHomeDate();
  await refreshHomeProgress(lastLive);
  await refreshHomeSummary();
  await renderHomeTaskList();
  syncDeepWorkHero();
}

async function refreshHomeSummary() {
  const today = getTodayKey();
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","dailyPomoCount"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];

  const dayData = timeData[today] || {};
  let focusSec = 0;
  Object.entries(dayData).forEach(([d, s]) => {
    if ((cats[d] || "waste") === "study") focusSec += s;
  });
  // Add live
  if (lastLive && lastLive.domain) {
    const dom = lastLive.domain;
    if ((cats[dom] || "waste") === "study") focusSec += (lastLive.elapsedSeconds || 0);
  }

  const doneTasks = tasks.filter(t => t.done).length;

  document.getElementById("sumFocusTime").textContent = fmtShort(focusSec);
  document.getElementById("sumTasksDone").textContent = doneTasks;

  // Score
  const score = await calcProductivityScore(today);
  document.getElementById("sumScore").textContent = score.total;
}

async function refreshHomeProgress(liveData) {
  const today = getTodayKey();
  const r = await chrome.storage.local.get(["timeData","siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const dayData = { ...(timeData[today] || {}) };

  if (liveData && liveData.domain) {
    dayData[liveData.domain] = (dayData[liveData.domain] || 0) + (liveData.elapsedSeconds || 0);
  }

  let focusSec = 0, wasteSec = 0;
  Object.entries(dayData).forEach(([d, s]) => {
    if ((cats[d] || "waste") === "study") focusSec += s;
    else wasteSec += s;
  });
  const total = focusSec + wasteSec || 1;

  const studyEl = document.getElementById("progStudy");
  const wasteEl = document.getElementById("progWaste");
  const studyTime = document.getElementById("progStudyTime");
  const wasteTime = document.getElementById("progWasteTime");

  if (studyEl) studyEl.style.width = Math.min(100, (focusSec / total) * 100) + "%";
  if (wasteEl) wasteEl.style.width = Math.min(100, (wasteSec / total) * 100) + "%";
  if (studyTime) studyTime.textContent = fmtShort(focusSec);
  if (wasteTime) wasteTime.textContent = fmtShort(wasteSec);
}

// =============================================
// HOME — TASKS
// =============================================

async function loadTasks() {
  const r = await chrome.storage.local.get("tasks"); return r.tasks || [];
}
async function saveTasks(tasks) { await chrome.storage.local.set({ tasks }); }

async function renderHomeTaskList() {
  const tasks = await loadTasks();
  const list = document.getElementById("homeTaskList");
  if (!list) return;

  if (!tasks.length) {
    list.innerHTML = '<li class="empty-state" style="padding:8px 0">No tasks yet. Add one above!</li>';
    return;
  }

  list.innerHTML = "";
  tasks.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "home-task-item";
    li.innerHTML = `
      <button class="task-check-btn ${t.done ? "done" : ""}" data-idx="${i}" aria-label="${t.done ? "Mark undone" : "Mark done"}" title="${t.done ? "Mark undone" : "Mark done"}">
        ${t.done ? "✓" : ""}
      </button>
      <span class="home-task-text ${t.done ? "done" : ""}">${escapeHtml(t.text)}</span>
      ${!t.done ? `<button class="home-task-focus-btn" data-idx="${i}" title="Start focus on this task">Focus</button>` : ""}
      <button class="task-del-btn" data-idx="${i}" aria-label="Delete task">✕</button>`;

    li.querySelector(".task-check-btn").addEventListener("click", async () => {
      const tasks = await loadTasks();
      tasks[i].done = !tasks[i].done;
      await saveTasks(tasks);
      await renderHomeTaskList();
      await refreshHomeSummary();
      await syncTaskBlocking();
    });

    const focusBtn = li.querySelector(".home-task-focus-btn");
    if (focusBtn) {
      focusBtn.addEventListener("click", () => {
        // Navigate to focus tab and set the task
        const goalInput = document.getElementById("dwGoalInput");
        if (goalInput) goalInput.value = t.text;
        switchView("focus");
      });
    }

    li.querySelector(".task-del-btn").addEventListener("click", async () => {
      const tasks = await loadTasks();
      tasks.splice(i, 1);
      await saveTasks(tasks);
      await renderHomeTaskList();
      await syncTaskBlocking();
    });

    list.appendChild(li);
  });
}

// Add task via home
const homeAddTaskBtn = document.getElementById("homeAddTaskBtn");
const homeTaskInputWrap = document.getElementById("homeTaskInputWrap");
const homeAddTaskConfirm = document.getElementById("homeAddTaskConfirm");
const homeTaskInput = document.getElementById("homeTaskInput");

homeAddTaskBtn?.addEventListener("click", () => {
  const isVisible = homeTaskInputWrap.style.display !== "none";
  homeTaskInputWrap.style.display = isVisible ? "none" : "flex";
  if (!isVisible) homeTaskInput.focus();
});

homeAddTaskConfirm?.addEventListener("click", async () => {
  const text = homeTaskInput.value.trim();
  if (!text) return;
  const tasks = await loadTasks();
  tasks.push({ text, done: false, id: Date.now() });
  await saveTasks(tasks);
  homeTaskInput.value = "";
  homeTaskInputWrap.style.display = "none";
  await renderHomeTaskList();
  await syncTaskBlocking();
});

homeTaskInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") homeAddTaskConfirm.click();
  if (e.key === "Escape") {
    homeTaskInputWrap.style.display = "none";
    homeTaskInput.value = "";
  }
});

// Task blocking sync (preserved logic)
async function syncTaskBlocking() {
  const tasks = await loadTasks();
  const hasPending = tasks.some(t => !t.done);
  const r = await chrome.storage.local.get(["blockedSites","taskBlockedSites"]);
  const blockedSites = r.blockedSites || [];
  const taskBlockedSites = r.taskBlockedSites || [];
  if (hasPending) {
    if (taskBlockedSites.length === 0) await chrome.storage.local.set({ taskBlockedSites: blockedSites });
    const activeSites = blockedSites.length > 0 ? blockedSites : taskBlockedSites;
    if (activeSites.length > 0) chrome.runtime.sendMessage({ type: "SET_BLOCKED_SITES", sites: activeSites });
  }
}

// Init home
renderHomeTaskList();
refreshHomeSummary();
refreshHomeProgress(null);

// =============================================
// DEEP WORK
// =============================================

let dwState = { active: false, goal: "", startTime: null, durationSec: 3600, pausedRemaining: null, paused: false };

function saveDwState() {
  chrome.storage.local.set({ deepWorkState: dwState });
}

async function loadDwState() {
  const r = await chrome.storage.local.get("deepWorkState");
  if (r.deepWorkState) dwState = { ...dwState, ...r.deepWorkState };
}

function syncDeepWorkHero() {
  const heroInactive = document.getElementById("heroInactive");
  const heroActive = document.getElementById("heroActive");
  if (!heroInactive || !heroActive) return;

  if (dwState.active) {
    heroInactive.style.display = "none";
    heroActive.style.display = "flex";
    document.getElementById("heroStatusPill").textContent = dwState.paused ? "PAUSED" : "DEEP WORK";
    document.getElementById("heroTaskLabel").textContent = dwState.goal || "Focus session";
    syncDeepWorkTimerDisplay();
  } else {
    heroActive.style.display = "none";
    heroInactive.style.display = "flex";
    // Show current task in inactive hero
    const taskEl = document.getElementById("heroCurrentTaskInactive");
    if (taskEl) {
      loadTasks().then(tasks => {
        const pending = tasks.find(t => !t.done);
        taskEl.textContent = pending ? "Next: " + pending.text : "";
      });
    }
  }
}

function syncDeepWorkFocusView() {
  const dwInactive = document.getElementById("dwInactive");
  const dwActive = document.getElementById("dwActive");
  const badge = document.getElementById("deepWorkBadge");
  if (!dwInactive || !dwActive) return;

  if (dwState.active) {
    dwInactive.style.display = "none";
    dwActive.style.display = "flex";
    dwActive.style.flexDirection = "column";
    if (badge) badge.style.display = "flex";
    document.getElementById("dwTaskDisplay").textContent = dwState.goal || "Focus session";
    syncDeepWorkTimerDisplay();
    const pauseBtn = document.getElementById("dwPauseBtn");
    if (pauseBtn) pauseBtn.textContent = dwState.paused ? "Resume" : "Pause";

    // Block status
    const blockStatusEl = document.getElementById("dwBlockStatus");
    if (blockStatusEl) {
      chrome.runtime.sendMessage({ type: "GET_BLOCKED_SITES" }).then(resp => {
        if (resp.sites && resp.sites.length > 0) {
          blockStatusEl.textContent = "🔒 " + resp.sites.length + " sites blocked";
        } else {
          blockStatusEl.textContent = "";
        }
      }).catch(() => {});
    }
  } else {
    dwActive.style.display = "none";
    dwInactive.style.display = "flex";
    dwInactive.style.flexDirection = "column";
    if (badge) badge.style.display = "none";
  }
}

function syncDeepWorkTimerDisplay() {
  if (!dwState.active) return;
  let remaining;
  if (dwState.paused && dwState.pausedRemaining != null) {
    remaining = dwState.pausedRemaining;
  } else if (dwState.startTime) {
    const elapsed = Math.floor((Date.now() - dwState.startTime) / 1000);
    remaining = Math.max(0, dwState.durationSec - elapsed);
  } else {
    remaining = dwState.durationSec;
  }

  const min = String(Math.floor(remaining / 60)).padStart(2, "0");
  const sec = String(remaining % 60).padStart(2, "0");
  const timeStr = `${min}:${sec}`;

  const heroTimer = document.getElementById("heroTimer");
  const dwTimer = document.getElementById("dwTimer");
  if (heroTimer) heroTimer.textContent = timeStr;
  if (dwTimer) dwTimer.textContent = timeStr;

  // Done check
  if (remaining <= 0 && dwState.active && !dwState.paused) {
    finishDeepWork();
  }
}

function finishDeepWork() {
  dwState.active = false;
  dwState.paused = false;
  dwState.startTime = null;
  dwState.pausedRemaining = null;
  saveDwState();
  syncDeepWorkHero();
  syncDeepWorkFocusView();
  // Notification
  try {
    chrome.notifications.create("deepwork-done-" + Date.now(), {
      type: "basic", iconUrl: "FocusFlow_v4_1_1/icon128.png",
      title: "✅ Deep Work Complete!",
      message: "Great session! Your focus time has been logged.",
      priority: 2
    });
  } catch {}
}

document.getElementById("heroStartBtn")?.addEventListener("click", () => {
  // Navigate to focus tab to set up
  switchView("focus");
});

document.getElementById("heroPauseBtn")?.addEventListener("click", () => {
  if (!dwState.active) return;
  if (!dwState.paused) {
    // Pause: capture remaining
    const elapsed = Math.floor((Date.now() - dwState.startTime) / 1000);
    dwState.pausedRemaining = Math.max(0, dwState.durationSec - elapsed);
    dwState.paused = true;
  } else {
    // Resume: new start time from remaining
    dwState.startTime = Date.now() - (dwState.durationSec - dwState.pausedRemaining) * 1000;
    dwState.paused = false;
    dwState.pausedRemaining = null;
  }
  saveDwState();
  syncDeepWorkHero();
  syncDeepWorkFocusView();
});

document.getElementById("heroStopBtn")?.addEventListener("click", () => {
  if (!dwState.active) return;
  dwState.active = false;
  dwState.paused = false;
  dwState.startTime = null;
  dwState.pausedRemaining = null;
  saveDwState();
  syncDeepWorkHero();
  syncDeepWorkFocusView();
});

document.getElementById("dwStartBtn")?.addEventListener("click", async () => {
  const goal = document.getElementById("dwGoalInput")?.value.trim() || "";
  const dur = parseInt(document.getElementById("dwDurInput")?.value) || 60;
  dwState.active = true;
  dwState.paused = false;
  dwState.goal = goal;
  dwState.durationSec = dur * 60;
  dwState.startTime = Date.now();
  dwState.pausedRemaining = null;
  saveDwState();
  syncDeepWorkFocusView();
  syncDeepWorkHero();
});

document.getElementById("dwPauseBtn")?.addEventListener("click", () => {
  if (!dwState.active) return;
  if (!dwState.paused) {
    const elapsed = Math.floor((Date.now() - dwState.startTime) / 1000);
    dwState.pausedRemaining = Math.max(0, dwState.durationSec - elapsed);
    dwState.paused = true;
    document.getElementById("dwPauseBtn").textContent = "Resume";
  } else {
    dwState.startTime = Date.now() - (dwState.durationSec - dwState.pausedRemaining) * 1000;
    dwState.paused = false;
    dwState.pausedRemaining = null;
    document.getElementById("dwPauseBtn").textContent = "Pause";
  }
  saveDwState();
  syncDeepWorkHero();
});

document.getElementById("dwStopBtn")?.addEventListener("click", () => {
  dwState.active = false;
  dwState.paused = false;
  dwState.startTime = null;
  dwState.pausedRemaining = null;
  saveDwState();
  syncDeepWorkFocusView();
  syncDeepWorkHero();
});

// Init deep work
loadDwState().then(() => {
  syncDeepWorkHero();
  syncDeepWorkFocusView();
});

// =============================================
// POMODORO (all logic preserved from original)
// =============================================

const RING_CIRCUM = 238.8; // 2 * pi * 38
let pomoUI = { running: false, phase: "study", remaining: 25*60, endTime: null, studySec: 25*60, breakSec: 5*60 };
let pomoTickInterval = null;

function playAlarm(type) {
  try {
    const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = type === "study" ? [880, 660, 440] : [440, 660, 880];
    freqs.forEach((f, i) => {
      const osc = ctx2.createOscillator(), gain = ctx2.createGain();
      osc.connect(gain); gain.connect(ctx2.destination);
      osc.type = "sine"; osc.frequency.value = f;
      const t = ctx2.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t); osc.stop(t + 0.4);
    });
  } catch {}
}

async function loadPomoHistory() {
  const histEl = document.getElementById("pomoHistory");
  if (!histEl) return;
  const r = await chrome.storage.local.get("pomoHistory");
  const history = r.pomoHistory || {};
  const items = history[getTodayKey()] || [];
  if (!items.length) { histEl.innerHTML = '<div class="empty-state">No sessions yet today.</div>'; return; }
  histEl.innerHTML = items.slice(0, 8).map(item => `
    <div class="pomo-hist-item">
      <span class="ph-type ${item.phase}">${item.phase === "study" ? "Study" : "Break"}</span>
      <span style="color:var(--text3);font-size:11px">completed</span>
      <span class="ph-time">${item.time}</span>
    </div>`).join("");
}

function updatePomoUI() {
  const min = String(Math.floor(pomoUI.remaining / 60)).padStart(2, "0");
  const sec = String(pomoUI.remaining % 60).padStart(2, "0");
  const timeEl = document.getElementById("pomoTime");
  if (timeEl) timeEl.textContent = `${min}:${sec}`;

  const badge = document.getElementById("pomoPhaseBadge");
  if (badge) badge.textContent = pomoUI.phase === "study" ? "STUDY" : "BREAK";

  const total = pomoUI.phase === "study" ? (pomoUI.studySec || 25*60) : (pomoUI.breakSec || 5*60);
  const offset = RING_CIRCUM * (1 - pomoUI.remaining / total);
  const ring = document.getElementById("ringProgress");
  if (ring) {
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = pomoUI.phase === "study" ? (cssVar("--accent") || "#c9a84c") : (cssVar("--green") || "#4caf82");
  }

  const startBtn = document.getElementById("pomoStart");
  if (startBtn) startBtn.textContent = pomoUI.running ? "Pause" : (pomoUI.remaining < total ? "Resume" : "Start");

  if (!pomoUI.running) {
    const studyIn = document.getElementById("studyMinInput");
    const breakIn = document.getElementById("breakMinInput");
    if (studyIn) studyIn.value = Math.round((pomoUI.studySec || 25*60) / 60);
    if (breakIn) breakIn.value = Math.round((pomoUI.breakSec || 5*60) / 60);
  }
}

function startPomoTick() {
  stopPomoTick();
  pomoTickInterval = setInterval(() => {
    if (!pomoUI.running || !pomoUI.endTime) return;
    pomoUI.remaining = Math.max(0, Math.round((pomoUI.endTime - Date.now()) / 1000));
    updatePomoUI();
  }, 1000);
}

function stopPomoTick() {
  if (pomoTickInterval) { clearInterval(pomoTickInterval); pomoTickInterval = null; }
}

function applyPomoState(state) {
  const prevPhase = pomoUI.phase, wasRunning = pomoUI.running;
  pomoUI = { ...state };
  if (pomoUI.running && pomoUI.endTime) {
    pomoUI.remaining = Math.max(0, Math.round((pomoUI.endTime - Date.now()) / 1000));
    startPomoTick();
  } else { stopPomoTick(); }
  updatePomoUI();
  if (wasRunning && !pomoUI.running) {
    const statusEl = document.getElementById("pomoStatus");
    if (statusEl) statusEl.textContent = prevPhase === "study" ? "✅ Study complete! Take a break." : "⏰ Break over! Back to work.";
    playAlarm(prevPhase);
    loadPomoHistory();
  }
}

async function syncPomoState() {
  try { const state = await chrome.runtime.sendMessage({ type: "POMO_GET_STATE" }); applyPomoState(state); } catch {}
}

document.getElementById("pomoStart")?.addEventListener("click", async () => {
  if (pomoUI.running) {
    const state = await chrome.runtime.sendMessage({ type: "POMO_PAUSE" });
    applyPomoState(state);
    const statusEl = document.getElementById("pomoStatus");
    if (statusEl) statusEl.textContent = "Paused.";
  } else {
    const state = await chrome.runtime.sendMessage({ type: "POMO_START" });
    applyPomoState(state);
    const statusEl = document.getElementById("pomoStatus");
    if (statusEl) statusEl.textContent = "";
  }
});

document.getElementById("pomoReset")?.addEventListener("click", async () => {
  const state = await chrome.runtime.sendMessage({ type: "POMO_RESET" });
  applyPomoState(state);
  const statusEl = document.getElementById("pomoStatus");
  if (statusEl) statusEl.textContent = "";
});

document.getElementById("applyDurBtn")?.addEventListener("click", async () => {
  if (pomoUI.running) {
    const statusEl = document.getElementById("pomoStatus");
    if (statusEl) statusEl.textContent = "⚠ Stop timer before changing duration.";
    return;
  }
  const studyMin = parseInt(document.getElementById("studyMinInput")?.value) || 25;
  const breakMin = parseInt(document.getElementById("breakMinInput")?.value) || 5;
  const state = await chrome.runtime.sendMessage({ type: "POMO_SET_DURATIONS", studySec: Math.max(1, studyMin)*60, breakSec: Math.max(1, breakMin)*60 });
  applyPomoState(state);
  const statusEl = document.getElementById("pomoStatus");
  if (statusEl) {
    statusEl.textContent = `✓ Set: ${studyMin}m study / ${breakMin}m break`;
    setTimeout(() => { statusEl.textContent = ""; }, 2500);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.pomoState) applyPomoState(changes.pomoState.newValue);
  if (changes.pomoHistory) loadPomoHistory();
});

syncPomoState();
loadPomoHistory();

// =============================================
// TOOLS — BLOCK TAB
// =============================================

async function loadBlockList() {
  const list = document.getElementById("blockList");
  if (!list) return;
  list.innerHTML = "";
  let resp;
  try { resp = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_SITES" }); }
  catch { return; }
  const sites = resp.sites || [];
  if (!sites.length) {
    list.innerHTML = '<li class="empty-state">No sites blocked.</li>';
    return;
  }
  sites.forEach(site => {
    const li = document.createElement("li");
    li.className = "block-item";
    li.innerHTML = `<span>${escapeHtml(site)}</span><button class="rm-btn" data-site="${escapeHtml(site)}">Remove</button>`;
    li.querySelector(".rm-btn").addEventListener("click", async () => {
      const newSites = sites.filter(s => s !== site);
      await chrome.runtime.sendMessage({ type: "SET_BLOCKED_SITES", sites: newSites });
      loadBlockList();
    });
    list.appendChild(li);
  });
}

document.getElementById("addBlockBtn")?.addEventListener("click", async () => {
  const inp = document.getElementById("blockInput");
  if (!inp) return;
  const val = inp.value.trim().toLowerCase().replace(/^www\./, "").replace(/\/.*$/, "");
  if (!val || !val.includes(".")) return;
  const resp = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_SITES" });
  const sites = resp.sites || [];
  if (!sites.includes(val)) { sites.push(val); await chrome.runtime.sendMessage({ type: "SET_BLOCKED_SITES", sites }); }
  inp.value = ""; loadBlockList();
});

document.getElementById("blockInput")?.addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("addBlockBtn")?.click();
});

loadBlockList();

// =============================================
// TOOLS — VIDEO SPEED
// =============================================

let currentSpeed = 1;

document.querySelectorAll(".speed-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const spd = parseFloat(btn.dataset.speed);
    currentSpeed = spd;
    document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const curValEl = document.getElementById("speedCurrentVal");
    if (curValEl) curValEl.textContent = spd + "x";
  });
});

document.getElementById("applySpeed")?.addEventListener("click", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (rate) => { document.querySelectorAll("video, audio").forEach(el => el.playbackRate = rate); },
      args: [currentSpeed]
    });
  } catch(e) { console.warn("Speed inject failed:", e.message); }
});

// =============================================
// TOOLS — NOTES
// =============================================

const notesArea = document.getElementById("notesArea");
const savedBadge = document.getElementById("notesSaved");
let saveTimeout = null;

chrome.storage.local.get("quickNotes").then(r => {
  if (notesArea) notesArea.value = r.quickNotes || "";
  if (savedBadge) savedBadge.style.opacity = "0.6";
});

notesArea?.addEventListener("input", () => {
  if (savedBadge) savedBadge.style.opacity = "0";
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await chrome.storage.local.set({ quickNotes: notesArea.value });
    if (savedBadge) savedBadge.style.opacity = "1";
    setTimeout(() => { if (savedBadge) savedBadge.style.opacity = "0"; }, 1500);
  }, 400);
});

// =============================================
// TOOLS — DARK MODE (preserved logic)
// =============================================

const DARK_STYLES = {
  invert:    (i) => `html { filter: invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg { filter: invert(100%) hue-rotate(180deg) !important; }`,
  dim:       (i) => `html { filter: brightness(${Math.round(i * 0.6)}%) !important; }`,
  grayscale: (i) => `html { filter: grayscale(100%) invert(${i}%) !important; img, video, canvas { filter: invert(100%) !important; } }`,
};

let darkState = { global: false, style: "invert", intensity: 90, sites: {} };
let darkCurrentDomain = null;

async function loadDarkState() {
  const r = await chrome.storage.local.get("darkMode");
  if (r.darkMode) darkState = { ...darkState, ...r.darkMode };
}

async function saveDarkState() {
  await chrome.storage.local.set({ darkMode: darkState });
}

function getDarkCSS(style, intensity) {
  return DARK_STYLES[style] ? DARK_STYLES[style](intensity) : DARK_STYLES.invert(intensity);
}

async function applyDarkToTab(tabId, enabled, style, intensity) {
  const css = getDarkCSS(style, intensity);
  try {
    for (const s of ["invert","dim","grayscale"]) {
      for (let i = 50; i <= 100; i += 5) {
        await chrome.scripting.removeCSS({ target: { tabId }, css: getDarkCSS(s, i) }).catch(() => {});
      }
    }
    if (enabled) await chrome.scripting.insertCSS({ target: { tabId }, css });
  } catch(e) { console.warn("Dark mode inject failed:", e.message); }
}

async function syncDarkToCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith("chrome")) return;
    const domain = new URL(tab.url).hostname.replace(/^www\./, "");
    darkCurrentDomain = domain;
    const darkCurrentSiteEl = document.getElementById("darkCurrentSite");
    if (darkCurrentSiteEl) darkCurrentSiteEl.textContent = domain;
    const siteEnabled = darkState.sites[domain];
    const isEnabled = siteEnabled !== undefined ? siteEnabled : darkState.global;
    const darkSiteToggle = document.getElementById("darkSiteToggle");
    const darkGlobalToggle = document.getElementById("darkGlobalToggle");
    const darkIntensity = document.getElementById("darkIntensity");
    const darkIntensityVal = document.getElementById("darkIntensityVal");
    if (darkSiteToggle) darkSiteToggle.checked = isEnabled;
    if (darkGlobalToggle) darkGlobalToggle.checked = darkState.global;
    if (darkIntensity) darkIntensity.value = darkState.intensity;
    if (darkIntensityVal) darkIntensityVal.textContent = darkState.intensity + "%";
    document.querySelectorAll(".dark-style-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.style === darkState.style);
    });
    await applyDarkToTab(tab.id, isEnabled, darkState.style, darkState.intensity);
  } catch(e) {}
}

async function applyDarkToAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith("chrome") || tab.url.startsWith("about")) continue;
    try {
      const domain = new URL(tab.url).hostname.replace(/^www\./, "");
      const siteEnabled = darkState.sites[domain];
      const isEnabled = siteEnabled !== undefined ? siteEnabled : darkState.global;
      await applyDarkToTab(tab.id, isEnabled, darkState.style, darkState.intensity);
    } catch {}
  }
}

document.getElementById("darkGlobalToggle")?.addEventListener("change", async (e) => {
  darkState.global = e.target.checked;
  await saveDarkState();
  await applyDarkToAllTabs();
  if (darkCurrentDomain) {
    const siteOverride = darkState.sites[darkCurrentDomain];
    const darkSiteToggle = document.getElementById("darkSiteToggle");
    if (darkSiteToggle) darkSiteToggle.checked = siteOverride !== undefined ? siteOverride : darkState.global;
  }
});

document.getElementById("darkSiteToggle")?.addEventListener("change", async (e) => {
  if (!darkCurrentDomain) return;
  darkState.sites[darkCurrentDomain] = e.target.checked;
  await saveDarkState();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await applyDarkToTab(tab.id, e.target.checked, darkState.style, darkState.intensity);
});

document.querySelectorAll(".dark-style-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    darkState.style = btn.dataset.style;
    document.querySelectorAll(".dark-style-btn").forEach(b => b.classList.toggle("active", b.dataset.style === darkState.style));
    await saveDarkState();
    await applyDarkToAllTabs();
  });
});

document.getElementById("darkIntensity")?.addEventListener("input", async (e) => {
  darkState.intensity = parseInt(e.target.value);
  const val = document.getElementById("darkIntensityVal");
  if (val) val.textContent = darkState.intensity + "%";
  await saveDarkState();
  await applyDarkToAllTabs();
});

loadDarkState().then(() => syncDarkToCurrentTab());

// =============================================
// INSIGHTS — DATE PICKER
// =============================================

let selectedDate = getTodayKey();

function buildInsightsDatePicker() {
  const picker = document.getElementById("insightsDatePicker");
  if (!picker) return;
  picker.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    const key = getDateKey(i);
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = i === 0 ? "Today" : i === 1 ? "Yesterday" : key;
    picker.appendChild(opt);
  }
  picker.addEventListener("change", () => {
    selectedDate = picker.value;
    renderInsights();
  });
}
buildInsightsDatePicker();

// =============================================
// INSIGHTS — RENDER
// =============================================

async function renderInsights() {
  await renderInsightStats();
  await renderInsightScore();
  await drawDayGraph(lastLive);
  renderInsightSiteList(lastLive);
  await renderBadgesCompact();
  await renderCodingDashboard();
  await renderHeatmap();
  await renderReport();
}

async function renderInsightStats() {
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];

  const dayData = { ...(timeData[selectedDate] || {}) };
  if (lastLive && lastLive.domain && selectedDate === getTodayKey()) {
    dayData[lastLive.domain] = (dayData[lastLive.domain] || 0) + (lastLive.elapsedSeconds || 0);
  }

  let focusSec = 0, wasteSec = 0;
  Object.entries(dayData).forEach(([d, s]) => {
    if ((cats[d] || "waste") === "study") focusSec += s;
    else wasteSec += s;
  });
  const totalSec = focusSec + wasteSec;
  const focusRatio = totalSec > 0 ? Math.round((focusSec / totalSec) * 100) : 0;
  const doneTasks = tasks.filter(t => t.done).length;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el("isFocusTime", fmtShort(focusSec));
  el("isTasksDone", doneTasks);
  el("isFocusRatio", focusRatio + "%");

  const score = await calcProductivityScore(selectedDate);
  el("isScore", score.total);
}

async function renderInsightScore() {
  const today = selectedDate;
  const score = await calcProductivityScore(today);

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el("insightScoreVal", score.total);

  // Trend
  if (today === getTodayKey()) {
    const yesterday = getDateKey(1);
    const yScore = await calcProductivityScore(yesterday);
    const diff = score.total - yScore.total;
    const trendEl = document.getElementById("insightScoreTrend");
    if (trendEl) {
      trendEl.textContent = diff >= 0 ? `↑ ${diff} from yesterday` : `↓ ${Math.abs(diff)} from yesterday`;
      trendEl.style.color = diff >= 0 ? "var(--green)" : "var(--red)";
    }
  }

  const setBar = (barId, valId, pct, val) => {
    const bar = document.getElementById(barId);
    const valEl = document.getElementById(valId);
    if (bar) bar.style.width = pct + "%";
    if (valEl) valEl.textContent = val;
  };

  setBar("sf-focus", "sf-focus-val", (score.focusScore / 40) * 100, score.focusScore);
  setBar("sf-pomo",  "sf-pomo-val",  (score.pomoScore  / 25) * 100, score.pomoScore);
  setBar("sf-tasks", "sf-tasks-val", (score.taskScore  / 20) * 100, score.taskScore);
  setBar("sf-block", "sf-block-val", (score.blockScore / 15) * 100, Math.round(score.focusRatio * 100) + "%");
}

// =============================================
// INSIGHTS — CHARTS
// =============================================

async function drawDayGraph(liveData) {
  const canvas = document.getElementById("dayGraph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cBg2   = cssVar("--bg2")    || "#18181b";
  const cBord  = cssVar("--border") || "#222228";
  const cMuted = cssVar("--text3")  || "#5e5a54";
  const cAccent= cssVar("--accent") || "#c9a84c";
  const cGreen = cssVar("--green")  || "#4caf82";

  ctx.fillStyle = cBg2;
  ctx.fillRect(0, 0, W, H);

  const r = await chrome.storage.local.get(["timeData","siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const key = getDateKey(i);
    const dayData = { ...(timeData[key] || {}) };
    if (i === 0 && liveData && liveData.domain) {
      dayData[liveData.domain] = (dayData[liveData.domain] || 0) + (liveData.elapsedSeconds || 0);
    }
    let total = 0, study = 0;
    Object.entries(dayData).forEach(([dom, secs]) => {
      const s = Number(secs) || 0;
      total += s;
      if ((cats[dom] || "waste") === "study") study += s;
    });
    days.push({ key, total, study, label: i === 0 ? "T" : key.slice(8) });
  }

  const lM = 10, rM = 10, tM = 8, bM = 18;
  const plotW = W - lM - rM;
  const plotH = H - tM - bM;
  const maxVal = Math.max(...days.map(d => Number.isFinite(d.total) ? d.total : 0), 1) * 1.2;
  const xAt = i => lM + (plotW / (days.length - 1)) * i;
  const yAt = v => {
    const val = Number.isFinite(v) ? v : 0;
    const m = Number.isFinite(maxVal) && maxVal > 0 ? maxVal : 1;
    return tM + plotH - (val / m) * plotH;
  };

  // Grid lines
  ctx.strokeStyle = cBord;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  [0, 0.5, 1].forEach(f => {
    const gy = tM + plotH * (1 - f);
    ctx.beginPath(); ctx.moveTo(lM, gy); ctx.lineTo(W - rM, gy); ctx.stroke();
  });
  ctx.setLineDash([]);

  function drawLine(dataKey, color, fill) {
    ctx.beginPath();
    let first = true;
    days.forEach((d, i) => { 
      const x = xAt(i), y = yAt(d[dataKey]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        if (first) { ctx.moveTo(x, y); first = false; }
        else { ctx.lineTo(x, y); }
      }
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    if (fill) {
      const startX = xAt(days.length - 1), startY = yAt(0);
      const endX = xAt(0), endY = yAt(0);
      if (Number.isFinite(startX) && Number.isFinite(startY) && Number.isFinite(endX) && Number.isFinite(endY)) {
        ctx.lineTo(startX, startY); ctx.lineTo(endX, endY); ctx.closePath();
        const grad = ctx.createLinearGradient(0, tM, 0, tM + plotH);
        grad.addColorStop(0, color + "30"); grad.addColorStop(1, color + "00");
        ctx.fillStyle = grad; ctx.fill();
      }
    }
    days.forEach((d, i) => {
      const x = xAt(i), y = yAt(d[dataKey]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      }
    });
  }

  drawLine("total", cAccent, true);
  drawLine("study", cGreen, false);

  ctx.fillStyle = cMuted;
  ctx.font = `9px ${cssVar("--font-mono") || "monospace"}`;
  ctx.textAlign = "center";
  days.forEach((d, i) => ctx.fillText(d.label, xAt(i), H - 4));
}

// =============================================
// INSIGHTS — SITE LIST
// =============================================

async function renderInsightSiteList(liveData) {
  const r = await chrome.storage.local.get(["timeData","siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const dayData = timeData[selectedDate] || {};
  let display = { ...dayData };
  if (liveData && liveData.domain && selectedDate === getTodayKey()) {
    const d = liveData.domain;
    display[d] = (display[d] || 0) + (liveData.elapsedSeconds || 0);
  }

  const list = document.getElementById("siteList");
  if (!list) return;
  list.innerHTML = "";
  const sorted = Object.entries(display).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    list.innerHTML = '<div class="empty-state">No data yet.</div>'; return;
  }

  sorted.forEach(([domain, secs]) => {
    const cat = cats[domain] || "waste";
    const isStudy = cat === "study";
    const isLive = liveData && liveData.domain === domain && selectedDate === getTodayKey();
    const row = document.createElement("div");
    row.className = "site-row";
    row.innerHTML = `
      ${isLive ? '<span class="live-dot" style="width:5px;height:5px;flex-shrink:0"></span>' : ""}
      <span class="site-name" title="${domain}">${domain}</span>
      <span class="site-time">${fmtSec(secs)}</span>
      <button class="toggle-btn ${isStudy ? "study" : "waste"}" data-domain="${domain}" data-current="${cat}">
        ${isStudy ? "Study" : "Waste"}
      </button>`;
    row.querySelector(".toggle-btn").addEventListener("click", async (e) => {
      const d = e.currentTarget.dataset.domain;
      const cur = e.currentTarget.dataset.current;
      const next = cur === "study" ? "waste" : "study";
      const cr = await chrome.storage.local.get("siteCategories");
      const cs = cr.siteCategories || {};
      cs[d] = next;
      await chrome.storage.local.set({ siteCategories: cs });
      renderInsightSiteList(lastLive);
    });
    list.appendChild(row);
  });
}

// =============================================
// INSIGHTS — PRODUCTIVITY SCORE (preserved logic)
// =============================================

async function calcProductivityScore(dateKey) {
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","dailyPomoCount","blockedSites"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];
  const dpc = r.dailyPomoCount || {};

  const dayData = timeData[dateKey] || {};
  let focusSec = 0, wasteSec = 0;
  Object.entries(dayData).forEach(([d, s]) => {
    if ((cats[d] || "waste") === "study") focusSec += s; else wasteSec += s;
  });
  const totalSec = focusSec + wasteSec;
  const focusScore = Math.min(40, Math.round((focusSec / (4 * 3600)) * 40));
  const pomoCount = dpc[dateKey] || 0;
  const pomoScore = Math.min(25, Math.round((pomoCount / 8) * 25));
  const doneTasks = tasks.filter(t => t.done).length;
  const totalTasks = tasks.length;
  const taskScore = totalTasks > 0 ? Math.min(20, Math.round((doneTasks / Math.max(totalTasks, 3)) * 20)) : 0;
  const focusRatio = totalSec > 0 ? focusSec / totalSec : 0;
  const blockScore = Math.round(focusRatio * 15);
  const total = focusScore + pomoScore + taskScore + blockScore;

  return {
    total: Math.min(100, total),
    focusScore, pomoScore, taskScore, blockScore,
    focusSec, pomoCount, doneTasks, totalTasks, focusRatio
  };
}

// =============================================
// INSIGHTS — BADGES (compact version)
// =============================================

const BADGES_DEF = [
  { id: "first_focus",    icon: "🎯", name: "First Focus",    max: 1   },
  { id: "streak_7",       icon: "🔥", name: "7 Day Streak",   max: 7   },
  { id: "streak_30",      icon: "⚡", name: "30 Day Streak",  max: 30  },
  { id: "hours_100",      icon: "💯", name: "100 Hours",      max: 100 },
  { id: "tasks_500",      icon: "✅", name: "500 Tasks",      max: 500 },
  { id: "pomo_master",    icon: "🍅", name: "Pomo Master",    max: 50  },
  { id: "deep_work",      icon: "🧠", name: "Deep Work",      max: 1   },
  { id: "coding_warrior", icon: "⚔️", name: "Coding Warrior", max: 20  },
];

async function getBadgeProgress() {
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","pomoHistory","dailyPomoCount"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];
  const pomoHistory = r.pomoHistory || {};

  let totalFocusSec = 0;
  Object.values(timeData).forEach(day => Object.entries(day).forEach(([d, s]) => {
    if ((cats[d] || "waste") === "study") totalFocusSec += s;
  }));
  const totalFocusHours = totalFocusSec / 3600;
  const tasksCompleted = tasks.filter(t => t.done).length;
  let totalPomos = 0;
  Object.values(pomoHistory).forEach(arr => { arr.forEach(p => { if (p.phase === "study") totalPomos++; }); });
  let codingHours = 0;
  Object.values(timeData).forEach(day => Object.entries(day).forEach(([d, s]) => {
    if (CODING_SITES.includes(d)) codingHours += s / 3600;
  }));
  let maxDayHours = 0;
  Object.values(timeData).forEach(day => {
    let t = 0; Object.values(day).forEach(s => t += s);
    maxDayHours = Math.max(maxDayHours, t / 3600);
  });
  const today = new Date();
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const td = timeData[key] || {};
    let t = 0; Object.values(td).forEach(s => t += s);
    if (t >= 1800) { if (i === 0 || currentStreak > 0) currentStreak++; else break; }
    else { if (i > 0) break; }
  }
  const pomoSessions = Object.values(pomoHistory).reduce((a, arr) => a + arr.filter(p => p.phase === "study").length, 0);

  return {
    first_focus:    { current: Math.min(1, pomoSessions), unlocked: pomoSessions >= 1 },
    streak_7:       { current: Math.min(7, currentStreak), unlocked: currentStreak >= 7 },
    streak_30:      { current: Math.min(30, currentStreak), unlocked: currentStreak >= 30 },
    hours_100:      { current: Math.min(100, Math.floor(totalFocusHours)), unlocked: totalFocusHours >= 100 },
    tasks_500:      { current: Math.min(500, tasksCompleted), unlocked: tasksCompleted >= 500 },
    pomo_master:    { current: Math.min(50, totalPomos), unlocked: totalPomos >= 50 },
    deep_work:      { current: maxDayHours >= 4 ? 1 : 0, unlocked: maxDayHours >= 4 },
    coding_warrior: { current: Math.min(20, Math.floor(codingHours)), unlocked: codingHours >= 20 },
  };
}

async function renderBadgesCompact() {
  const grid = document.getElementById("badgeGrid");
  if (!grid) return;
  const progress = await getBadgeProgress();

  grid.innerHTML = BADGES_DEF.map(b => {
    const p = progress[b.id] || { current: 0, unlocked: false };
    const pct = Math.round((p.current / b.max) * 100);
    return `
      <div class="badge-card-compact ${p.unlocked ? "unlocked" : ""}">
        <div class="badge-card-header">
          <span class="badge-icon-sm">${b.icon}</span>
          <span class="badge-name-sm">${b.name}</span>
          ${p.unlocked ? '<span class="badge-check">✓</span>' : ""}
        </div>
        <div class="badge-progress-sm">
          <div class="badge-progress-fill-sm" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join("");
}

// =============================================
// INSIGHTS — CODING DASHBOARD
// =============================================

async function renderCodingDashboard() {
  const r = await chrome.storage.local.get("timeData");
  const timeData = r.timeData || {};
  const today = getTodayKey();
  const dayData = timeData[today] || {};
  let codingTodaySec = 0;
  CODING_SITES.forEach(s => { codingTodaySec += (dayData[s] || 0); });

  let codingWeekSec = 0;
  for (let i = 0; i < 7; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    CODING_SITES.forEach(s => { codingWeekSec += (dd[s] || 0); });
  }

  let codingStreak = 0;
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    let t = 0; CODING_SITES.forEach(s => { t += (dd[s] || 0); });
    if (t >= 600) { if (i === 0 || codingStreak > 0) codingStreak++; else break; }
    else { if (i > 0) break; }
  }

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el("codingToday",  fmtMin(codingTodaySec));
  el("codingWeek",   fmtMin(codingWeekSec));
  el("codingStreak", codingStreak);

  const platforms = document.getElementById("codingPlatforms");
  if (platforms) {
    const maxSec = Math.max(...CODING_SITES.map(s => dayData[s] || 0), 1);
    platforms.innerHTML = CODING_SITES.map(site => {
      const secs = dayData[site] || 0;
      const pct = Math.round((secs / maxSec) * 100);
      return `
        <div class="platform-row">
          <span class="platform-name">${site}</span>
          <div class="platform-bar-bg"><div class="platform-bar-fill" style="width:${pct}%"></div></div>
          <span class="platform-time">${fmtMin(secs)}</span>
        </div>`;
    }).join("");
  }
}

// =============================================
// INSIGHTS — HEATMAP (preserved logic)
// =============================================

async function renderHeatmap() {
  const canvas = document.getElementById("heatmapCanvas");
  if (!canvas) return;

  const r = await chrome.storage.local.get(["timeData","siteCategories"]);
  const timeData = r.timeData || {};

  const cellSize = 9, gap = 2, step = cellSize + gap;
  const weeks = 53;
  const W = weeks * step + 16;
  const H = 7 * step + 16;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const today = new Date();
  const dayData = {};
  let maxMinutes = 0;

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const td = timeData[key] || {};
    let totalSec = 0;
    Object.values(td).forEach(s => totalSec += s);
    const mins = Math.round(totalSec / 60);
    dayData[key] = { mins, date: new Date(d), key };
    if (mins > maxMinutes) maxMinutes = mins;
  }

  // Streaks
  let currentStreak = 0, longestStreak = 0, totalProductiveDays = 0, tempStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mins = dayData[key]?.mins || 0;
    if (mins >= 30) { if (i === 0) currentStreak = 1; else if (currentStreak > 0) currentStreak++; totalProductiveDays++; }
    else { if (i === 0) currentStreak = 0; else break; }
  }
  tempStreak = 0;
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mins = dayData[key]?.mins || 0;
    if (mins >= 30) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
    else tempStreak = 0;
  }

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el("currentStreak", currentStreak);
  el("longestStreak", longestStreak);
  el("totalProductiveDays", totalProductiveDays);

  function getColor(mins) {
    if (mins === 0) return cssVar("--bg4") || "#26262c";
    if (mins < 30)  return "#1c3a2a";
    if (mins < 90)  return "#2a6644";
    if (mins < 180) return "#3aa866";
    return cssVar("--green") || "#4caf82";
  }

  const cellMap = [];
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - 364);
  const startDow = startDay.getDay();
  startDay.setDate(startDay.getDate() - startDow);
  let d = new Date(startDay);
  let col = 0;
  while (d <= today) {
    for (let row = 0; row < 7; row++) {
      const cur = new Date(d);
      const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
      const info = dayData[key];
      const x = col * step + 8;
      const y = row * step + 4;
      ctx.fillStyle = info ? getColor(info.mins) : (cssVar("--bg4") || "#26262c");
      if (ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(x, y, cellSize, cellSize, 2); ctx.fill();
      } else {
        ctx.fillRect(x, y, cellSize, cellSize);
      }
      if (info) cellMap.push({ x, y, key, mins: info.mins, date: cur.toDateString() });
      d.setDate(d.getDate() + 1);
    }
    col++;
    if (d > today) break;
  }

  const tooltip = document.getElementById("heatmapTooltip");
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = null;
    for (const cell of cellMap) {
      if (mx >= cell.x && mx <= cell.x + cellSize && my >= cell.y && my <= cell.y + cellSize) {
        found = cell; break;
      }
    }
    if (found && tooltip) {
      tooltip.style.left = (e.clientX + 12) + "px";
      tooltip.style.top  = (e.clientY - 40) + "px";
      tooltip.textContent = `${found.date}\n⏱ ${found.mins}m`;
      tooltip.style.opacity = "1";
    } else if (tooltip) {
      tooltip.style.opacity = "0";
    }
  });
  canvas.addEventListener("mouseleave", () => { if (tooltip) tooltip.style.opacity = "0"; });
}

// =============================================
// INSIGHTS — WEEKLY REPORT
// =============================================

async function renderReport() {
  const el = document.getElementById("reportContent");
  if (!el) return;

  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","dailyPomoCount"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];
  const dpc = r.dailyPomoCount || {};

  let totalFocusSec = 0, totalCodingSec = 0;
  let siteTotals = {};
  let maxSec = 0, minSec = Infinity;
  let mostProd = "—", leastProd = "—";

  for (let i = 0; i < 7; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    let daySec = 0;
    Object.entries(dd).forEach(([d, s]) => {
      daySec += s;
      siteTotals[d] = (siteTotals[d] || 0) + s;
      if ((cats[d] || "waste") === "study") totalFocusSec += s;
      if (CODING_SITES.includes(d)) totalCodingSec += s;
    });
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : key;
    if (daySec > maxSec) { maxSec = daySec; mostProd = label; }
    if (daySec < minSec && daySec > 0) { minSec = daySec; leastProd = label; }
  }

  const topSites = Object.entries(siteTotals).sort((a,b) => b[1]-a[1]).slice(0, 3);
  let weekPomos = 0;
  for (let i = 0; i < 7; i++) { weekPomos += (dpc[getDateKey(i)] || 0); }

  const card = (title, rows) => `
    <div class="report-card">
      <div class="report-card-title">${title}</div>
      ${rows.map(([k,v]) => `<div class="report-row"><span class="report-key">${k}</span><span class="report-val">${v}</span></div>`).join("")}
    </div>`;

  el.innerHTML = [
    card("This Week", [
      ["Focus Time",   fmtSec(totalFocusSec)],
      ["Coding Time",  fmtSec(totalCodingSec)],
      ["Pomodoros",    weekPomos + " sessions"],
      ["Tasks Done",   tasks.filter(t => t.done).length + " / " + tasks.length],
    ]),
    card("Best & Worst", [
      ["Most Productive",  mostProd],
      ["Least Productive", leastProd],
    ]),
    card("Top Sites", topSites.length ? topSites.map(([d, s]) => [d, fmtSec(s)]) : [["—","—"]]),
  ].join("");
}

// Export buttons
document.getElementById("exportJsonBtn")?.addEventListener("click", async () => {
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","pomoHistory"]);
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `lockin-report-${getTodayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("exportCsvBtn")?.addEventListener("click", async () => {
  const r = await chrome.storage.local.get(["timeData","siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  let csv = "Date,Domain,Seconds,Category\n";
  Object.entries(timeData).forEach(([date, sites]) => {
    Object.entries(sites).forEach(([domain, secs]) => {
      csv += `${date},${domain},${secs},${cats[domain] || "other"}\n`;
    });
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `lockin-history-${getTodayKey()}.csv`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("exportDataBtn")?.addEventListener("click", async () => {
  const keys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","achievements","dsaProgress"];
  const r = await chrome.storage.local.get(keys);
  const payload = { meta: { app: "lockin", version: "1.0.0", exportedAt: new Date().toISOString() }, ...r };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `lockin-all-data-${getTodayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
});

// =============================================
// SETTINGS
// =============================================

// Backup
document.getElementById("backupBtn")?.addEventListener("click", async () => {
  const keys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount"];
  const r = await chrome.storage.local.get(keys);
  const payload = { meta: { app: "lockin", version: "1.0.0", exportedAt: new Date().toISOString(), schemaVersion: 2 }, ...r };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `lockin-backup-${getTodayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
});

// Export All (delegating)
document.getElementById("exportAllBtn")?.addEventListener("click", () => {
  document.getElementById("exportDataBtn")?.click();
});
document.getElementById("exportCsvAllBtn")?.addEventListener("click", () => {
  document.getElementById("exportCsvBtn")?.click();
});

// Restore
document.getElementById("restoreInput")?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); } catch { alert("Invalid JSON file."); return; }
  // Accept both old focusflow and new lockin backups
  if (!payload.meta || (payload.meta.app !== "focusflow" && payload.meta.app !== "lockin")) {
    alert("Not a valid LockIn backup file."); return;
  }
  const toSet = {};
  const allowedKeys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","achievements","dsaProgress","weeklyReports"];
  allowedKeys.forEach(k => { if (payload[k] !== undefined) toSet[k] = payload[k]; });
  await chrome.storage.local.set(toSet);
  alert("Data restored successfully! Please reopen the extension.");
  e.target.value = "";
});

// Reset stats
document.getElementById("resetStatsBtn")?.addEventListener("click", async () => {
  if (!confirm("Reset all tracking statistics? This cannot be undone.")) return;
  await chrome.storage.local.remove(["timeData","dailyPomoCount","pomoHistory","achievements"]);
  alert("Statistics reset.");
});

// Reset all
document.getElementById("resetAllBtn")?.addEventListener("click", async () => {
  if (!confirm("⚠ Reset ALL data including tasks, notes, and settings? This cannot be undone.")) return;
  await chrome.storage.local.clear();
  alert("All data cleared. Extension will reload.");
  window.location.reload();
});

// Sync settings (load/save)
async function loadSyncSettings() {
  const r = await chrome.storage.local.get(["syncApiUrl","syncKey","autoSync"]);
  const apiInput = document.getElementById("syncApiUrl");
  const keyInput = document.getElementById("syncKey");
  const autoToggle = document.getElementById("autoSyncToggle");
  if (apiInput && r.syncApiUrl) apiInput.value = r.syncApiUrl;
  if (keyInput && r.syncKey) keyInput.value = r.syncKey;
  if (autoToggle) autoToggle.checked = r.autoSync || false;
}

document.getElementById("syncApiUrl")?.addEventListener("change", async (e) => {
  await chrome.storage.local.set({ syncApiUrl: e.target.value });
});
document.getElementById("syncKey")?.addEventListener("change", async (e) => {
  await chrome.storage.local.set({ syncKey: e.target.value });
});
document.getElementById("autoSyncToggle")?.addEventListener("change", async (e) => {
  await chrome.storage.local.set({ autoSync: e.target.checked });
});
document.getElementById("manualSyncBtn")?.addEventListener("click", () => {
  alert("Sync endpoint not configured. Enter your API URL and key to enable sync.");
});

loadSyncSettings();

// =============================================
// INIT
// =============================================

// Refresh home on load
refreshHome();
