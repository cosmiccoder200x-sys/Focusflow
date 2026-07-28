// ===== FOCUSFLOW — popup.js v4.0 =====
// All v3.0 features preserved + Heatmap, Badges, Score, Coding Dashboard, Report, Settings

// =============================================
// TAB NAVIGATION
// =============================================

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    const tabId = "tab-" + btn.dataset.tab;
    document.getElementById(tabId).classList.add("active");
    // Lazy render tabs
    if (btn.dataset.tab === "score")    { renderScore(); renderBadges(); }
    if (btn.dataset.tab === "code")     renderCodingDashboard();
    if (btn.dataset.tab === "coach")    { renderCoach(); renderReport(); }
  });
});

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
// TRACK TAB (fully preserved from v3.0)
// =============================================

let liveInterval = null;
let selectedDate = getTodayKey();
let lastLive = null;

function buildDatePicker() {
  const picker = document.getElementById("datePicker");
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
    renderTrack(lastLive);
  });
}

function drawChart(studySec, wasteSec, totalSec) {
  const canvas = document.getElementById("chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cBg2   = cssVar("--bg2")    || "#16161a";
  const cBord  = cssVar("--border2")|| "#2e2e3a";
  const cMuted = cssVar("--text3")  || "#5e5a52";
  const cGold  = cssVar("--gold")   || "#c9a84c";
  const cGreen = cssVar("--green")  || "#4caf82";
  const cRed   = cssVar("--red")    || "#c0564a";

  ctx.fillStyle = cBg2;
  ctx.fillRect(0, 0, W, H);

  const leftM = 42, rightM = 14, topM = 20, bottomM = 22;
  const plotW = W - leftM - rightM;
  const plotH = H - topM - bottomM;

  const bars = [
    { label: "Study",  val: studySec,  color: cGreen },
    { label: "Waste",  val: wasteSec,  color: cRed   },
    { label: "Total",  val: totalSec,  color: cGold  },
  ];

  const maxVal = Math.max(totalSec, 1) * 1.2;

  ctx.strokeStyle = cBord;
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach(f => {
    const gy = topM + plotH * (1 - f);
    ctx.setLineDash([3,4]);
    ctx.beginPath();
    ctx.moveTo(leftM, gy); ctx.lineTo(W - rightM, gy);
    ctx.stroke();
    if (f > 0) {
      ctx.setLineDash([]);
      ctx.fillStyle = cMuted;
      ctx.font = `9px 'JetBrains Mono', monospace`;
      ctx.textAlign = "right";
      ctx.fillText(fmtShort(maxVal * f), leftM - 4, gy + 3);
    }
  });
  ctx.setLineDash([]);

  const barW = Math.floor(plotW / bars.length * 0.45);
  const gap   = plotW / bars.length;

  bars.forEach((bar, i) => {
    const x = leftM + gap * i + (gap - barW) / 2;
    const barH = bar.val > 0 ? Math.max(2, (bar.val / maxVal) * plotH) : 0;
    const y = topM + plotH - barH;

    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, bar.color);
    grad.addColorStop(1, bar.color + "44");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [3,3,0,0]) : ctx.rect(x, y, barW, barH);
    ctx.fill();

    ctx.fillStyle = bar.color;
    ctx.font = `bold 9px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(fmtShort(bar.val), x + barW / 2, Math.max(topM - 2, y - 4));

    ctx.fillStyle = cMuted;
    ctx.font = `9px 'JetBrains Mono', monospace`;
    ctx.textAlign = "center";
    ctx.fillText(bar.label, x + barW / 2, H - 6);
  });
}

async function drawDayGraph(liveData) {
  const canvas = document.getElementById("dayGraph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cBg2   = cssVar("--bg2")    || "#16161a";
  const cBord  = cssVar("--border2")|| "#2e2e3a";
  const cMuted = cssVar("--text3")  || "#5e5a52";
  const cGold  = cssVar("--gold")   || "#c9a84c";
  const cGreen = cssVar("--green")  || "#4caf82";

  ctx.fillStyle = cBg2;
  ctx.fillRect(0, 0, W, H);

  const r = await chrome.storage.local.get(["timeData", "siteCategories"]);
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
      total += secs;
      if ((cats[dom] || "waste") === "study") study += secs;
    });
    days.push({ key, total, study, label: i === 0 ? "Today" : key.slice(5) });
  }

  const leftM = 38, rightM = 12, topM = 12, bottomM = 18;
  const plotW = W - leftM - rightM;
  const plotH = H - topM - bottomM;
  const maxVal = Math.max(...days.map(d => d.total), 1) * 1.2;

  const xAt = i => leftM + (plotW / (days.length - 1)) * i;
  const yAt = v => topM + plotH - (v / maxVal) * plotH;

  ctx.strokeStyle = cBord;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  [0, 0.5, 1].forEach(f => {
    const gy = topM + plotH * (1 - f);
    ctx.beginPath(); ctx.moveTo(leftM, gy); ctx.lineTo(W - rightM, gy); ctx.stroke();
  });
  ctx.setLineDash([]);

  function drawLine(dataKey, color, fill) {
    ctx.beginPath();
    days.forEach((d, i) => {
      const x = xAt(i), y = yAt(d[dataKey]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

    if (fill) {
      ctx.lineTo(xAt(days.length - 1), yAt(0));
      ctx.lineTo(xAt(0), yAt(0));
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, topM, 0, topM + plotH);
      grad.addColorStop(0, color + "30"); grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad; ctx.fill();
    }
    days.forEach((d, i) => {
      const x = xAt(i), y = yAt(d[dataKey]);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
  }

  drawLine("total", cGold, true);
  drawLine("study", cGreen, false);

  ctx.fillStyle = cMuted;
  ctx.font = `8px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  days.forEach((d, i) => ctx.fillText(d.label.slice(-5), xAt(i), H - 4));
  ctx.fillStyle = cMuted; ctx.font = `8px 'JetBrains Mono', monospace`;
  ctx.textAlign = "left";
  ctx.fillText(fmtShort(maxVal), 2, topM + 8);
}

function renderSiteList(dayData, categories, liveData) {
  const list = document.getElementById("siteList");
  list.innerHTML = "";
  let display = { ...dayData };
  if (liveData && liveData.domain && selectedDate === getTodayKey()) {
    const d = liveData.domain;
    display[d] = (display[d] || 0) + (liveData.elapsedSeconds || 0);
  }
  const sorted = Object.entries(display).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    list.innerHTML = '<div class="empty-state">No data yet. Start browsing!</div>'; return;
  }
  sorted.forEach(([domain, secs]) => {
    const cat = categories[domain] || "waste";
    const isStudy = cat === "study";
    const row = document.createElement("div");
    row.className = `site-row ${isStudy ? "is-study" : "is-waste"}`;
    const isLive = liveData && liveData.domain === domain && selectedDate === getTodayKey();
    const liveDot = isLive ? `<span class="live-dot" style="width:5px;height:5px;margin-right:3px;flex-shrink:0"></span>` : "";
    row.innerHTML = `${liveDot}
      <span class="site-name" title="${domain}">${domain}</span>
      <span class="site-time">${fmtSec(secs)}</span>
      <button class="toggle-btn ${isStudy ? "study" : "waste"}" data-domain="${domain}" data-current="${cat}">
        ${isStudy ? "📗 Study" : "📕 Waste"}
      </button>`;
    row.querySelector(".toggle-btn").addEventListener("click", async (e) => {
      const d = e.currentTarget.dataset.domain;
      const cur = e.currentTarget.dataset.current;
      const next = cur === "study" ? "waste" : "study";
      const r = await chrome.storage.local.get("siteCategories");
      const cats = r.siteCategories || {};
      cats[d] = next;
      await chrome.storage.local.set({ siteCategories: cats });
      renderTrack(lastLive);
    });
    list.appendChild(row);
  });
}

async function renderTrack(liveData) {
  const r = await chrome.storage.local.get(["timeData", "siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const dayData = timeData[selectedDate] || {};
  let display = { ...dayData };
  if (liveData && liveData.domain && selectedDate === getTodayKey()) {
    const d = liveData.domain;
    display[d] = (display[d] || 0) + (liveData.elapsedSeconds || 0);
  }
  let studySec = 0, wasteSec = 0;
  Object.entries(display).forEach(([domain, secs]) => {
    if ((cats[domain] || "waste") === "study") studySec += secs;
    else wasteSec += secs;
  });
  const totalSec = studySec + wasteSec;
  document.getElementById("totalUsage").textContent = "⏱ " + fmtSec(totalSec);
  drawChart(studySec, wasteSec, totalSec);
  await drawDayGraph(liveData);
  renderSiteList(dayData, cats, liveData);
}

function startLive() {
  if (liveInterval) return;
  liveInterval = setInterval(async () => {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "GET_LIVE_STATUS" });
      lastLive = resp;
      document.getElementById("liveDomain").textContent = resp.domain || "—";
      document.getElementById("liveTime").textContent   = fmtSec(resp.elapsedSeconds);
      renderTrack(resp);
    } catch {}
  }, 1000);
}

buildDatePicker();
renderTrack(null);
startLive();

// =============================================
// BLOCK TAB (preserved)
// =============================================

async function loadBlockList() {
  const list = document.getElementById("blockList");
  list.innerHTML = "";
  let resp;
  try { resp = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_SITES" }); }
  catch { return; }
  const sites = resp.sites || [];
  if (!sites.length) {
    list.innerHTML = '<li style="padding:10px;color:var(--text3);font-size:11px;font-family:monospace">No sites blocked.</li>';
    return;
  }
  sites.forEach(site => {
    const li = document.createElement("li");
    li.className = "block-item";
    li.innerHTML = `<span>${site}</span><button class="rm-btn" data-site="${site}">Remove</button>`;
    li.querySelector(".rm-btn").addEventListener("click", async () => {
      const newSites = sites.filter(s => s !== site);
      await chrome.runtime.sendMessage({ type: "SET_BLOCKED_SITES", sites: newSites });
      loadBlockList();
    });
    list.appendChild(li);
  });
}

document.getElementById("addBlockBtn").addEventListener("click", async () => {
  const inp = document.getElementById("blockInput");
  const val = inp.value.trim().toLowerCase().replace(/^www\./, "").replace(/\/.*$/, "");
  if (!val || !val.includes(".")) return;
  const resp = await chrome.runtime.sendMessage({ type: "GET_BLOCKED_SITES" });
  const sites = resp.sites || [];
  if (!sites.includes(val)) { sites.push(val); await chrome.runtime.sendMessage({ type: "SET_BLOCKED_SITES", sites }); }
  inp.value = ""; loadBlockList();
});
document.getElementById("blockInput").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("addBlockBtn").click(); });
loadBlockList();

// =============================================
// SPEED TAB
// Max speed is intentionally capped at 4x. Applied speeds are remembered as personal shortcuts.
const slider   = document.getElementById("speedSlider");
const speedVal = document.getElementById("speedVal");

function formatSpeed(n) {
  return Number.isInteger(n) ? n.toFixed(1) : n.toFixed(2).replace(/0+$/, "");
}

function updateSpeedDisplay(val) {
  const n = Math.min(4, Math.max(0.25, parseFloat(val)));
  speedVal.textContent = formatSpeed(n);
}

async function renderMostUsedSpeeds() {
  const wrap = document.getElementById("mostUsedSpeeds");
  if (!wrap) return;
  const r = await chrome.storage.local.get("speedUsage");
  const usage = r.speedUsage || {};
  let entries = Object.entries(usage)
    .map(([speed, count]) => [parseFloat(speed), Number(count)])
    .filter(([speed, count]) => speed >= 0.25 && speed <= 4 && count > 0)
    .sort((a,b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 5);
  if (!entries.length) entries = [[1,0],[1.5,0],[2,0]];
  wrap.innerHTML = entries.map(([speed, count]) =>
    `<button class="preset-btn most-used-btn" data-speed="${speed}" title="Used ${count} time${count === 1 ? '' : 's'}">${formatSpeed(speed)}x${count ? ` · ${count}` : ''}</button>`
  ).join("");
  wrap.querySelectorAll(".most-used-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const spd = parseFloat(btn.dataset.speed);
      slider.value = spd; updateSpeedDisplay(spd);
      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

slider.addEventListener("input", () => updateSpeedDisplay(slider.value));
document.querySelectorAll(".preset-btn[data-speed]").forEach(btn => {
  btn.addEventListener("click", () => {
    const spd = Math.min(4, parseFloat(btn.dataset.speed));
    slider.value = spd; updateSpeedDisplay(spd);
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.getElementById("applySpeed").addEventListener("click", async () => {
  const spd = Math.min(4, Math.max(0.25, parseFloat(slider.value)));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (rate) => { document.querySelectorAll("video, audio").forEach(el => el.playbackRate = rate); },
      args: [spd]
    });
    const r = await chrome.storage.local.get("speedUsage");
    const usage = r.speedUsage || {};
    const key = String(spd);
    usage[key] = (usage[key] || 0) + 1;
    await chrome.storage.local.set({ speedUsage: usage, lastSpeed: spd });
    await renderMostUsedSpeeds();
  } catch(e) { console.warn("Speed inject failed:", e.message); }
});

renderMostUsedSpeeds();

// =============================================
// POMO TAB (preserved)
// =============================================

const RING_CIRCUM = 339.3;
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
  const r = await chrome.storage.local.get("pomoHistory");
  const history = r.pomoHistory || {};
  const items = history[getTodayKey()] || [];
  if (!items.length) { histEl.innerHTML = '<div class="empty-state">No sessions yet today.</div>'; return; }
  histEl.innerHTML = items.map(item => `
    <div class="pomo-hist-item">
      <span class="ph-type ${item.phase}">${item.phase === "study" ? "📗 Study" : "☕ Break"}</span>
      <span>completed</span>
      <span class="ph-time">${item.time}</span>
    </div>`).join("");
}

function updatePomoUI() {
  const min = String(Math.floor(pomoUI.remaining / 60)).padStart(2, "0");
  const sec = String(pomoUI.remaining % 60).padStart(2, "0");
  document.getElementById("pomoTime").textContent  = `${min}:${sec}`;
  document.getElementById("pomoLabel").textContent = pomoUI.phase === "study" ? "STUDY" : "BREAK";
  const total  = pomoUI.phase === "study" ? (pomoUI.studySec || 25*60) : (pomoUI.breakSec || 5*60);
  const offset = RING_CIRCUM * (pomoUI.remaining / total);
  const ring   = document.getElementById("ringProgress");
  ring.style.strokeDashoffset = RING_CIRCUM - offset;
  ring.style.stroke = pomoUI.phase === "study" ? (cssVar("--gold") || "#c9a84c") : (cssVar("--green") || "#4caf82");
  const total2 = pomoUI.phase === "study" ? (pomoUI.studySec || 25*60) : (pomoUI.breakSec || 5*60);
  document.getElementById("pomoStart").textContent = pomoUI.running
    ? "⏸ Pause" : (pomoUI.remaining < total2 ? "▶ Resume" : "▶ Start");
  if (!pomoUI.running) {
    document.getElementById("studyMinInput").value = Math.round((pomoUI.studySec || 25*60) / 60);
    document.getElementById("breakMinInput").value = Math.round((pomoUI.breakSec || 5*60) / 60);
  }
}

function startTick() {
  stopTick();
  pomoTickInterval = setInterval(() => {
    if (!pomoUI.running || !pomoUI.endTime) return;
    pomoUI.remaining = Math.max(0, Math.round((pomoUI.endTime - Date.now()) / 1000));
    updatePomoUI();
  }, 1000);
}
function stopTick() {
  if (pomoTickInterval) { clearInterval(pomoTickInterval); pomoTickInterval = null; }
}

function applyPomoState(state) {
  const prevPhase = pomoUI.phase, wasRunning = pomoUI.running;
  pomoUI = { ...state };
  if (pomoUI.running && pomoUI.endTime) {
    pomoUI.remaining = Math.max(0, Math.round((pomoUI.endTime - Date.now()) / 1000));
    startTick();
  } else { stopTick(); }
  updatePomoUI();
  if (wasRunning && !pomoUI.running) {
    document.getElementById("pomoStatus").textContent =
      prevPhase === "study" ? "✅ Study complete! Take a break." : "⏰ Break over! Back to work.";
    playAlarm(prevPhase); loadPomoHistory();
  }
}

async function syncPomoState() {
  try { const state = await chrome.runtime.sendMessage({ type: "POMO_GET_STATE" }); applyPomoState(state); } catch {}
}

document.getElementById("pomoStart").addEventListener("click", async () => {
  if (pomoUI.running) {
    const state = await chrome.runtime.sendMessage({ type: "POMO_PAUSE" });
    applyPomoState(state); document.getElementById("pomoStatus").textContent = "Paused.";
  } else {
    const state = await chrome.runtime.sendMessage({ type: "POMO_START" });
    applyPomoState(state); document.getElementById("pomoStatus").textContent = "";
  }
});

document.getElementById("pomoReset").addEventListener("click", async () => {
  const state = await chrome.runtime.sendMessage({ type: "POMO_RESET" });
  applyPomoState(state); document.getElementById("pomoStatus").textContent = "";
});

document.getElementById("applyDurBtn").addEventListener("click", async () => {
  if (pomoUI.running) { document.getElementById("pomoStatus").textContent = "⚠ Stop timer before changing duration."; return; }
  const studyMin = parseInt(document.getElementById("studyMinInput").value) || 25;
  const breakMin = parseInt(document.getElementById("breakMinInput").value) || 5;
  const state = await chrome.runtime.sendMessage({ type: "POMO_SET_DURATIONS", studySec: Math.max(1, studyMin)*60, breakSec: Math.max(1, breakMin)*60 });
  applyPomoState(state);
  document.getElementById("pomoStatus").textContent = `✓ Set: ${studyMin}m study / ${breakMin}m break`;
  setTimeout(() => { document.getElementById("pomoStatus").textContent = ""; }, 2500);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.pomoState)   applyPomoState(changes.pomoState.newValue);
  if (changes.pomoHistory) loadPomoHistory();
});

syncPomoState(); loadPomoHistory();

// =============================================
// NOTES TAB (preserved)
// =============================================

const notesArea  = document.getElementById("notesArea");
const savedBadge = document.getElementById("notesSaved");
let saveTimeout  = null;

chrome.storage.local.get("quickNotes").then(r => {
  notesArea.value = r.quickNotes || "";
  savedBadge.style.opacity = "0.6";
});

notesArea.addEventListener("input", () => {
  savedBadge.style.opacity = "0";
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await chrome.storage.local.set({ quickNotes: notesArea.value });
    savedBadge.style.opacity = "0.8";
  }, 400);
});

// =============================================
// TASKS TAB (preserved)
// =============================================

async function loadTasks() {
  const r = await chrome.storage.local.get("tasks"); return r.tasks || [];
}
async function saveTasks(tasks) { await chrome.storage.local.set({ tasks }); }

async function syncTaskBlocking() {
  const tasks = await loadTasks();
  const hasPending = tasks.some(t => !t.done);
  const r = await chrome.storage.local.get(["blockedSites", "taskBlockedSites"]);
  const blockedSites = r.blockedSites || [];
  const taskBlockedSites = r.taskBlockedSites || [];
  if (hasPending) {
    if (taskBlockedSites.length === 0) await chrome.storage.local.set({ taskBlockedSites: blockedSites });
    const activeSites = blockedSites.length > 0 ? blockedSites : taskBlockedSites;
    if (activeSites.length > 0) chrome.runtime.sendMessage({ type: "SET_BLOCKED_SITES", sites: activeSites });
  }
  updateTasksBlockUI(hasPending, tasks);
}

function updateTasksBlockUI(hasPending, tasks) {
  const statusEl = document.getElementById("tasksBlockStatus");
  const hintEl   = document.getElementById("taskHint");
  const emptyEl  = document.getElementById("taskEmpty");
  const listEl   = document.getElementById("taskList");
  if (!statusEl) return;
  const allDone = tasks.length > 0 && !hasPending;
  const noTasks = tasks.length === 0;
  if (noTasks) {
    statusEl.textContent = "🟢 No Tasks — Sites Free"; statusEl.className = "tasks-block-status tasks-free";
    hintEl.style.display = "none"; emptyEl.style.display = "block"; listEl.style.display = "none";
  } else if (allDone) {
    statusEl.textContent = "🟢 All Done — Sites Unblocked!"; statusEl.className = "tasks-block-status tasks-free";
    hintEl.textContent = "Great work! All tasks complete."; hintEl.style.display = "block";
    emptyEl.style.display = "none"; listEl.style.display = "block";
  } else {
    statusEl.textContent = "🔴 Sites Blocked"; statusEl.className = "tasks-block-status tasks-blocked";
    const pending = tasks.filter(t => !t.done).length;
    hintEl.textContent = `${pending} task${pending > 1 ? "s" : ""} remaining — complete them to unblock sites.`;
    hintEl.style.display = "block"; emptyEl.style.display = "none"; listEl.style.display = "block";
  }
}

async function renderTaskList() {
  const tasks = await loadTasks();
  const listEl = document.getElementById("taskList");
  if (!listEl) return;
  listEl.innerHTML = tasks.map((t, i) => `
    <li class="task-item ${t.done ? "task-done" : ""}">
      <button class="task-check-btn" data-idx="${i}" title="${t.done ? "Mark undone" : "Mark done"}">${t.done ? "✅" : "⬜"}</button>
      <span class="task-text">${escapeHtml(t.text)}</span>
      <button class="task-del-btn" data-idx="${i}" title="Delete">✕</button>
    </li>`).join("");
  listEl.querySelectorAll(".task-check-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.idx), tasks = await loadTasks();
      tasks[idx].done = !tasks[idx].done; await saveTasks(tasks);
      await renderTaskList(); await syncTaskBlocking();
    });
  });
  listEl.querySelectorAll(".task-del-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const idx = parseInt(btn.dataset.idx), tasks = await loadTasks();
      tasks.splice(idx, 1); await saveTasks(tasks);
      await renderTaskList(); await syncTaskBlocking();
    });
  });
  await syncTaskBlocking();
}

document.getElementById("addTaskBtn").addEventListener("click", async () => {
  const inp = document.getElementById("taskInput"), text = inp.value.trim();
  if (!text) return;
  const tasks = await loadTasks(); tasks.push({ text, done: false, id: Date.now() });
  await saveTasks(tasks); inp.value = ""; await renderTaskList(); await syncTaskBlocking();
});
document.getElementById("taskInput").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("addTaskBtn").click(); });
renderTaskList();

// =============================================
// STATS TAB — GITHUB-STYLE HEATMAP
// =============================================

// =============================================
// BADGES — ACHIEVEMENT SYSTEM (shown inside Score tab)
// =============================================

const BADGES_DEF = [
  { id: "first_focus",    icon: "🎯", name: "First Focus",     desc: "Complete your first study session",   max: 1,    unit: "session"  },
  { id: "streak_7",       icon: "🔥", name: "7 Day Streak",    desc: "7 consecutive productive days",        max: 7,    unit: "days"     },
  { id: "streak_30",      icon: "⚡", name: "30 Day Streak",   desc: "30 consecutive productive days",       max: 30,   unit: "days"     },
  { id: "hours_100",      icon: "💯", name: "100 Hours",       desc: "Accumulate 100 hours of focus time",   max: 100,  unit: "hours"    },
  { id: "tasks_500",      icon: "✅", name: "500 Tasks",       desc: "Complete 500 tasks",                   max: 500,  unit: "tasks"    },
  { id: "pomo_master",    icon: "🍅", name: "Pomo Master",     desc: "Complete 50 Pomodoro study sessions",  max: 50,   unit: "pomos"    },
  { id: "deep_work",      icon: "🧠", name: "Deep Work",       desc: "Have a 4-hour focus day",              max: 1,    unit: "day"      },
  { id: "coding_warrior", icon: "⚔️", name: "Coding Warrior",  desc: "20 hours on coding platforms",         max: 20,   unit: "hours"    },
];

async function getBadgeProgress() {
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","pomoHistory","dailyPomoCount"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];
  const pomoHistory = r.pomoHistory || {};
  const dpc = r.dailyPomoCount || {};

  // Total focus hours
  let totalFocusSec = 0;
  Object.values(timeData).forEach(day => Object.entries(day).forEach(([d, s]) => {
    if ((cats[d] || "waste") === "study") totalFocusSec += s;
  }));
  const totalFocusHours = totalFocusSec / 3600;

  // Total tasks done
  const tasksCompleted = tasks.filter(t => t.done).length;

  // Total pomo study sessions
  let totalPomos = 0;
  Object.values(pomoHistory).forEach(arr => { arr.forEach(p => { if (p.phase === "study") totalPomos++; }); });

  // Coding hours
  let codingHours = 0;
  Object.values(timeData).forEach(day => Object.entries(day).forEach(([d, s]) => {
    if (CODING_SITES.includes(d)) codingHours += s / 3600;
  }));

  // Max focus day
  let maxDayHours = 0;
  Object.values(timeData).forEach(day => {
    let t = 0; Object.values(day).forEach(s => t += s);
    maxDayHours = Math.max(maxDayHours, t / 3600);
  });

  // Streak (reuse from heatmap logic)
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

async function renderBadges() {
  const grid = document.getElementById("badgeGrid");
  if (!grid) return;
  const progress = await getBadgeProgress();

  grid.innerHTML = BADGES_DEF.map(b => {
    const p = progress[b.id] || { current: 0, unlocked: false };
    const pct = Math.round((p.current / b.max) * 100);
    return `
      <div class="badge-card ${p.unlocked ? "unlocked" : "locked"}">
        ${p.unlocked ? '<div class="badge-unlocked-stamp">✓ UNLOCKED</div>' : ""}
        <span class="badge-icon">${b.icon}</span>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-progress-bg">
          <div class="badge-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="badge-progress-label">${p.current} / ${b.max} ${b.unit}</div>
      </div>`;
  }).join("");
}

// =============================================
// SCORE TAB — PRODUCTIVITY SCORE
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

  // Factor 1: Focus time (max 40 pts, target 4 hours)
  const focusScore = Math.min(40, Math.round((focusSec / (4 * 3600)) * 40));

  // Factor 2: Pomodoro completion (max 25 pts, target 8 sessions)
  const pomoCount = dpc[dateKey] || 0;
  const pomoScore = Math.min(25, Math.round((pomoCount / 8) * 25));

  // Factor 3: Task completion (max 20 pts)
  const doneTasks = tasks.filter(t => t.done).length;
  const totalTasks = tasks.length;
  const taskScore = totalTasks > 0 ? Math.min(20, Math.round((doneTasks / Math.max(totalTasks, 3)) * 20)) : 0;

  // Factor 4: Focus ratio — less time on waste (max 15 pts)
  const focusRatio = totalSec > 0 ? focusSec / totalSec : 0;
  const blockScore = Math.round(focusRatio * 15);

  const total = focusScore + pomoScore + taskScore + blockScore;

  return {
    total: Math.min(100, total),
    focusScore, pomoScore, taskScore, blockScore,
    focusSec, pomoCount, doneTasks, totalTasks, focusRatio
  };
}

function getScoreColor(score) {
  if (score >= 80) return cssVar("--green") || "#4caf82";
  if (score >= 50) return cssVar("--gold") || "#c9a84c";
  return cssVar("--red") || "#c0564a";
}

async function renderScore() {
  const today = getTodayKey();
  const score = await calcProductivityScore(today);
  const CIRC = 314.2;

  document.getElementById("scoreValue").textContent = score.total;
  const ring = document.getElementById("scoreRingFg");
  const offset = CIRC - (score.total / 100) * CIRC;
  ring.style.strokeDashoffset = offset;
  ring.style.stroke = getScoreColor(score.total);

  // Factors
  document.getElementById("sf-focus").style.width    = (score.focusScore / 40 * 100) + "%";
  document.getElementById("sf-pomo").style.width     = (score.pomoScore  / 25 * 100) + "%";
  document.getElementById("sf-tasks").style.width    = (score.taskScore  / 20 * 100) + "%";
  document.getElementById("sf-block").style.width    = (score.blockScore / 15 * 100) + "%";
  document.getElementById("sf-focus-val").textContent = score.focusScore;
  document.getElementById("sf-pomo-val").textContent  = score.pomoScore;
  document.getElementById("sf-tasks-val").textContent = score.taskScore;
  document.getElementById("sf-block-val").textContent = Math.round(score.focusRatio * 100) + "%";

  // Score trend (7 days)
  const scores = [];
  for (let i = 6; i >= 0; i--) {
    const key = getDateKey(i);
    const s = await calcProductivityScore(key);
    scores.push({ label: i === 0 ? "T" : getDateKey(i).slice(8), val: s.total });
  }
  drawScoreTrend(scores);

  // Category pie
  await renderCategoryPie(today);
}

function drawScoreTrend(scores) {
  const canvas = document.getElementById("scoreTrendCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cssVar("--bg2") || "#16161a";
  ctx.fillRect(0, 0, W, H);

  const lM = 24, rM = 10, tM = 8, bM = 16;
  const plotW = W - lM - rM, plotH = H - tM - bM;
  const xAt = i => lM + (plotW / (scores.length - 1)) * i;
  const yAt = v => tM + plotH - (v / 100) * plotH;

  // Grid
  ctx.strokeStyle = cssVar("--border2") || "#2e2e3a";
  ctx.lineWidth = 1; ctx.setLineDash([2,3]);
  [0, 50, 100].forEach(v => {
    const y = yAt(v); ctx.beginPath(); ctx.moveTo(lM, y); ctx.lineTo(W - rM, y); ctx.stroke();
  });
  ctx.setLineDash([]);

  // Line
  ctx.beginPath();
  scores.forEach((s, i) => { i === 0 ? ctx.moveTo(xAt(i), yAt(s.val)) : ctx.lineTo(xAt(i), yAt(s.val)); });
  ctx.strokeStyle = cssVar("--gold") || "#c9a84c"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

  // Fill
  ctx.lineTo(xAt(scores.length - 1), yAt(0)); ctx.lineTo(xAt(0), yAt(0)); ctx.closePath();
  const grad = ctx.createLinearGradient(0, tM, 0, tM + plotH);
  grad.addColorStop(0, (cssVar("--gold") || "#c9a84c") + "30");
  grad.addColorStop(1, (cssVar("--gold") || "#c9a84c") + "00");
  ctx.fillStyle = grad; ctx.fill();

  // Labels
  ctx.fillStyle = cssVar("--text3") || "#5e5a52";
  ctx.font = `8px 'JetBrains Mono', monospace`; ctx.textAlign = "center";
  scores.forEach((s, i) => ctx.fillText(s.label, xAt(i), H - 4));
}

async function renderCategoryPie(dateKey) {
  const r = await chrome.storage.local.get(["timeData","siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const dayData = timeData[dateKey] || {};

  const catTotals = {};
  Object.entries(dayData).forEach(([d, s]) => {
    const c = cats[d] || "other";
    catTotals[c] = (catTotals[c] || 0) + s;
  });

  const canvas = document.getElementById("catPieCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const total = Object.values(catTotals).reduce((a,b) => a+b, 0);
  if (total === 0) {
    ctx.fillStyle = cssVar("--text3") || "#5e5a52"; ctx.font = "9px monospace";
    ctx.textAlign = "center"; ctx.fillText("No data", W/2, H/2); return;
  }

  const entries = Object.entries(catTotals).sort((a,b) => b[1]-a[1]);
  let angle = -Math.PI / 2;
  const cx = W/2, cy = H/2, rad = Math.min(W,H)/2 - 4;

  entries.forEach(([cat, secs]) => {
    const slice = (secs / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rad, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = CAT_COLORS[cat] || "#5e5a52";
    ctx.fill();
    angle += slice;
  });

  // Legend
  const legend = document.getElementById("catLegend");
  legend.innerHTML = entries.slice(0, 6).map(([cat, secs]) => `
    <div class="cat-row">
      <div class="cat-dot" style="background:${CAT_COLORS[cat] || "#5e5a52"}"></div>
      <span class="cat-name">${cat}</span>
      <span class="cat-pct">${Math.round(secs/total*100)}%</span>
    </div>`).join("");
}

// =============================================
// CODING DASHBOARD
// =============================================

async function renderCodingDashboard() {
  const r = await chrome.storage.local.get("timeData");
  const timeData = r.timeData || {};

  // Today's coding
  const today = getTodayKey();
  const dayData = timeData[today] || {};
  let codingTodaySec = 0;
  CODING_SITES.forEach(s => { codingTodaySec += (dayData[s] || 0); });

  // This week
  let codingWeekSec = 0;
  for (let i = 0; i < 7; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    CODING_SITES.forEach(s => { codingWeekSec += (dd[s] || 0); });
  }

  // Coding streak
  let codingStreak = 0;
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    let t = 0; CODING_SITES.forEach(s => { t += (dd[s] || 0); });
    if (t >= 600) { if (i === 0 || codingStreak > 0) codingStreak++; else break; }
    else { if (i > 0) break; }
  }

  document.getElementById("codingToday").textContent  = fmtMin(codingTodaySec);
  document.getElementById("codingWeek").textContent   = fmtMin(codingWeekSec);
  document.getElementById("codingStreak").textContent = codingStreak;

  // Platform breakdown (today)
  const platforms = document.getElementById("codingPlatforms");
  const maxSec = Math.max(...CODING_SITES.map(s => dayData[s] || 0), 1);
  platforms.innerHTML = CODING_SITES.map(site => {
    const secs = dayData[site] || 0;
    const pct = Math.round((secs / maxSec) * 100);
    return `
      <div class="platform-row">
        <span class="platform-name">${site}</span>
        <div class="platform-bar-bg">
          <div class="platform-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="platform-time">${fmtMin(secs)}</span>
      </div>`;
  }).join("");

  // 7-day coding graph
  const codingDays = [];
  for (let i = 6; i >= 0; i--) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    let t = 0; CODING_SITES.forEach(s => { t += (dd[s] || 0); });
    codingDays.push({ label: i === 0 ? "T" : key.slice(8), secs: t });
  }
  drawCodingGraph(codingDays);
}

function drawCodingGraph(days) {
  const canvas = document.getElementById("codingGraphCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = cssVar("--bg2") || "#16161a"; ctx.fillRect(0, 0, W, H);

  const lM = 10, rM = 10, tM = 8, bM = 16;
  const plotW = W - lM - rM, plotH = H - tM - bM;
  const maxVal = Math.max(...days.map(d => d.secs), 1) * 1.2;
  const barW = Math.floor(plotW / days.length * 0.6);
  const gap = plotW / days.length;

  days.forEach((d, i) => {
    const x = lM + gap * i + (gap - barW) / 2;
    const bH = d.secs > 0 ? Math.max(2, (d.secs / maxVal) * plotH) : 0;
    const y = tM + plotH - bH;
    const grad = ctx.createLinearGradient(0, y, 0, y + bH);
    grad.addColorStop(0, cssVar("--green") || "#4caf82");
    grad.addColorStop(1, (cssVar("--green") || "#4caf82") + "44");
    ctx.fillStyle = grad;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, barW, bH, [2,2,0,0]); ctx.fill(); }
    else ctx.fillRect(x, y, barW, bH);
    ctx.fillStyle = cssVar("--text3") || "#5e5a52"; ctx.font = `8px monospace`; ctx.textAlign = "center";
    ctx.fillText(d.label, x + barW/2, H - 4);
  });
}

// =============================================
// REPORT TAB — WEEKLY REPORT
// =============================================

async function renderReport() {
  const el = document.getElementById("reportContent");
  if (!el) return;

  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","dailyPomoCount"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};
  const tasks = r.tasks || [];
  const dpc = r.dailyPomoCount || {};

  // Aggregate last 7 days
  let totalFocusSec = 0, totalWasteSec = 0, totalCodingSec = 0;
  let dayScores = {}, bestDay = null, worstDay = null;
  let bestMin = Infinity, worstMin = -1;
  let siteTotals = {};

  for (let i = 0; i < 7; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    let daySec = 0;
    Object.entries(dd).forEach(([d, s]) => {
      daySec += s;
      siteTotals[d] = (siteTotals[d] || 0) + s;
      if ((cats[d] || "waste") === "study") totalFocusSec += s;
      else totalWasteSec += s;
      if (CODING_SITES.includes(d)) totalCodingSec += s;
    });
    if (daySec > 0) {
      if (daySec > worstMin) { worstMin = daySec; }
      if (daySec < bestMin) { bestMin = daySec; }
    }
  }

  // Find most/least productive
  let mostProd = "—", leastProd = "—";
  let maxSec = 0, minSec = Infinity;
  for (let i = 0; i < 7; i++) {
    const key = getDateKey(i);
    const dd = timeData[key] || {};
    let t = 0; Object.values(dd).forEach(s => t += s);
    const label = i === 0 ? "Today" : i === 1 ? "Yesterday" : key;
    if (t > maxSec) { maxSec = t; mostProd = label; }
    if (t < minSec && t > 0) { minSec = t; leastProd = label; }
  }

  // Top 3 sites
  const topSites = Object.entries(siteTotals).sort((a,b) => b[1]-a[1]).slice(0, 3);

  // Weekly pomo count
  let weekPomos = 0;
  for (let i = 0; i < 7; i++) { weekPomos += (dpc[getDateKey(i)] || 0); }

  const card = (title, rows) => `
    <div class="report-card">
      <div class="report-card-title">${title}</div>
      ${rows.map(([k,v]) => `<div class="report-row"><span class="report-key">${k}</span><span class="report-val">${v}</span></div>`).join("")}
    </div>`;

  el.innerHTML = [
    card("This Week", [
      ["Total Focus Time",   fmtSec(totalFocusSec)],
      ["Total Coding Time",  fmtSec(totalCodingSec)],
      ["Pomodoros",          weekPomos + " sessions"],
      ["Tasks Done",         tasks.filter(t => t.done).length + " / " + tasks.length],
    ]),
    card("Best & Worst", [
      ["Most Productive",    mostProd],
      ["Least Productive",   leastProd],
    ]),
    card("Top Sites", topSites.length ? topSites.map(([d, s]) => [d, fmtSec(s)]) : [["—","—"]]),
  ].join("");
}

document.getElementById("exportJsonBtn").addEventListener("click", async () => {
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","pomoHistory"]);
  const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `focusflow-report-${getTodayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("exportCsvBtn").addEventListener("click", async () => {
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
  a.download = `focusflow-history-${getTodayKey()}.csv`; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("exportDataBtn").addEventListener("click", async () => {
  const keys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","achievements","dsaProgress","speedUsage","lastSpeed","deepWorkHistory"];
  const r = await chrome.storage.local.get(keys);
  const payload = { meta: { app: "focusflow", version: "4.1", exportedAt: new Date().toISOString() }, ...r };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `focusflow-all-data-${getTodayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
});

// =============================================
// SETTINGS TAB
// =============================================

// Theme switching
async function loadTheme() {
  const r = await chrome.storage.local.get("theme");
  const t = r.theme || "gold";
  document.body.setAttribute("data-theme", t);
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === t);
  });
}

document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const t = btn.dataset.theme;
    document.body.setAttribute("data-theme", t);
    await chrome.storage.local.set({ theme: t });
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.toggle("active", b.dataset.theme === t));
  });
});

// Backup
document.getElementById("backupBtn").addEventListener("click", async () => {
  const keys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","speedUsage","lastSpeed","deepWorkHistory"];
  const r = await chrome.storage.local.get(keys);
  const payload = { meta: { app: "focusflow", version: "4.1", exportedAt: new Date().toISOString(), schemaVersion: 2 }, ...r };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `focusflow-backup-${getTodayKey()}.json`; a.click();
  URL.revokeObjectURL(url);
});

// Export all (JSON)
document.getElementById("exportAllBtn").addEventListener("click", () => {
  document.getElementById("exportDataBtn").click();
});

// Export all (CSV)
document.getElementById("exportCsvAllBtn").addEventListener("click", () => {
  document.getElementById("exportCsvBtn").click();
});

// Restore
document.getElementById("restoreInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  let payload;
  try { payload = JSON.parse(text); } catch { alert("Invalid JSON file."); return; }
  if (!payload.meta || payload.meta.app !== "focusflow") { alert("Not a valid FocusFlow backup."); return; }

  const toSet = {};
  const allowedKeys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","achievements","dsaProgress","weeklyReports","speedUsage","lastSpeed","deepWorkHistory"];
  allowedKeys.forEach(k => { if (payload[k] !== undefined) toSet[k] = payload[k]; });
  await chrome.storage.local.set(toSet);
  alert("Data restored successfully! Please reload the extension.");
  e.target.value = "";
});

// Reset stats
document.getElementById("resetStatsBtn").addEventListener("click", async () => {
  if (!confirm("Reset all tracking statistics? This cannot be undone.")) return;
  await chrome.storage.local.remove(["timeData","dailyPomoCount","pomoHistory","achievements"]);
  alert("Statistics reset.");
});

// Reset all
document.getElementById("resetAllBtn").addEventListener("click", async () => {
  if (!confirm("⚠ Reset ALL data including tasks, notes, and settings? This cannot be undone.")) return;
  await chrome.storage.local.clear();
  alert("All data cleared. Extension will reload.");
  window.location.reload();
});

// Init theme
loadTheme();

// =============================================
// WEBSITE SYNC
// =============================================

function formatSyncStatus(status) {
  if (!status) return "Not connected yet";
  if (status.ok) {
    const t = new Date(status.lastSyncedAt);
    return `✓ Last synced ${t.toLocaleDateString()} ${t.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`;
  }
  return `✕ Last attempt failed — ${status.lastError}`;
}

async function loadSyncSettings() {
  const config = await SyncManager.getSyncConfig();
  const r = await chrome.storage.local.get("syncStatus");
  document.getElementById("syncUrl").value = config.url || "";
  document.getElementById("syncKey").value = config.key || "";
  document.getElementById("syncAutoToggle").checked = !!config.autoSync;
  document.getElementById("syncStatus").textContent = formatSyncStatus(r.syncStatus);
}

document.getElementById("syncUrl")?.addEventListener("change", async (e) => {
  await SyncManager.saveSyncConfig({ url: e.target.value.trim() });
});

document.getElementById("syncKey")?.addEventListener("change", async (e) => {
  await SyncManager.saveSyncConfig({ key: e.target.value.trim() });
});

document.getElementById("syncAutoToggle")?.addEventListener("change", async (e) => {
  const config = await SyncManager.getSyncConfig();
  if (e.target.checked && !config.url) {
    alert("Add your website's API URL above before turning on auto-sync.");
    e.target.checked = false;
    return;
  }
  await SyncManager.saveSyncConfig({ autoSync: e.target.checked });
});

document.getElementById("syncNowBtn")?.addEventListener("click", async () => {
  const statusEl = document.getElementById("syncStatus");
  const config = await SyncManager.getSyncConfig();
  if (!config.url) { alert("Add your website's API URL above first."); return; }
  statusEl.textContent = "Syncing…";
  try {
    await SyncManager.runSync();
  } catch {
    // runSync already records the failure in syncStatus — nothing more to do here.
  }
  const r = await chrome.storage.local.get("syncStatus");
  statusEl.textContent = formatSyncStatus(r.syncStatus);
});

loadSyncSettings();

// =============================================
// DEEP WORK MODE
// =============================================
const DEEP_WORK_DEFAULTS = [
  "instagram.com","facebook.com","twitter.com","x.com","snapchat.com",
  "tiktok.com","reddit.com","9gag.com","netflix.com","hotstar.com","primevideo.com"
];
let deepWorkSelectedMin = 25;
let deepWorkInterval = null;

function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

async function renderDeepWork() {
  const state = (await chrome.runtime.sendMessage({ type: "DEEP_WORK_GET_STATE" })) || { running:false };
  const status = document.getElementById("deepWorkStatus");
  const timer = document.getElementById("deepWorkTimer");
  const btn = document.getElementById("deepWorkBtn");
  if (!status || !timer || !btn) return;
  clearInterval(deepWorkInterval);
  if (state.running && state.endTime) {
    const update = () => {
      const remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
      timer.textContent = fmtClock(remaining);
      status.textContent = `Deep Work active${state.goal ? ` · ${state.goal}` : ''}`;
      status.className = "focus-status focus-active";
      btn.textContent = "End Deep Work";
      btn.className = "btn btn-danger";
      if (remaining <= 0) { clearInterval(deepWorkInterval); renderDeepWork(); }
    };
    update();
    deepWorkInterval = setInterval(update, 1000);
  } else {
    timer.textContent = fmtClock(deepWorkSelectedMin * 60);
    status.textContent = "Ready for deep work.";
    status.className = "focus-status focus-idle";
    btn.textContent = "Start Deep Work";
    btn.className = "btn btn-primary";
  }
}

document.querySelectorAll(".focus-duration").forEach(btn => btn.addEventListener("click", () => {
  deepWorkSelectedMin = parseInt(btn.dataset.min, 10);
  document.querySelectorAll(".focus-duration").forEach(b => b.classList.toggle("active", b === btn));
  renderDeepWork();
}));

document.getElementById("deepWorkBtn").addEventListener("click", async () => {
  const state = await chrome.runtime.sendMessage({ type: "DEEP_WORK_GET_STATE" });
  if (state && state.running) {
    await chrome.runtime.sendMessage({ type: "DEEP_WORK_STOP", completed: false });
  } else {
    const goal = document.getElementById("focusGoal").value.trim();
    await chrome.runtime.sendMessage({ type: "DEEP_WORK_START", durationMin: deepWorkSelectedMin, goal });
  }
  await renderDeepWork();
});
renderDeepWork();

// =============================================
// LOCAL PRODUCTIVITY COACH
// =============================================
function coachDomainTotals(timeData, today) {
  return Object.entries((timeData || {})[today] || {})
    .map(([domain, seconds]) => [domain, Number(seconds) || 0])
    .sort((a,b) => b[1] - a[1]);
}

async function renderCoach() {
  const summary = document.getElementById("coachSummary");
  const insights = document.getElementById("coachInsights");
  if (!summary || !insights) return;
  const today = getTodayKey();
  const r = await chrome.storage.local.get(["timeData","siteCategories","tasks","dailyPomoCount","pomoHistory","deepWorkHistory"]);
  const domains = coachDomainTotals(r.timeData, today);
  const categories = r.siteCategories || {};
  const total = domains.reduce((a,[,s]) => a+s, 0);
  const productive = domains.reduce((a,[d,s]) => a + ((categories[d] === "social" || categories[d] === "entertainment" || categories[d] === "news") ? 0 : s), 0);
  const distracting = Math.max(0, total - productive);
  const tasks = r.tasks || [];
  const done = tasks.filter(t => t.done).length;
  const pomo = Number(r.dailyPomoCount || 0);
  const deepSessions = (r.deepWorkHistory || []).filter(x => x.date === today);
  const deepMinutes = deepSessions.reduce((a,x) => a + (Number(x.durationMin) || 0), 0);
  const focusPct = total ? Math.round((productive / total) * 100) : 0;

  summary.innerHTML = `
    <div class="coach-stat"><div class="coach-stat-value">${fmtMin(productive)}</div><div class="coach-stat-label">productive</div></div>
    <div class="coach-stat"><div class="coach-stat-value">${focusPct}%</div><div class="coach-stat-label">focus ratio</div></div>
    <div class="coach-stat"><div class="coach-stat-value">${pomo}</div><div class="coach-stat-label">pomodoros</div></div>`;

  const list = [];
  if (!total) list.push(`<div class="coach-insight"><strong>Start small.</strong> Begin a 25-minute Deep Work session and give it one clear goal.</div>`);
  else if (focusPct >= 80) list.push(`<div class="coach-insight"><strong>Excellent focus.</strong> ${focusPct}% of today's tracked time looks productive. Protect this pattern.</div>`);
  else if (focusPct >= 60) list.push(`<div class="coach-insight"><strong>Good progress.</strong> You're at ${focusPct}% productive time. One distraction-free session could push this higher.</div>`);
  else list.push(`<div class="coach-insight"><strong>Reduce context switching.</strong> Only ${focusPct}% of tracked time looks productive. Try Deep Work Mode for your next session.</div>`);

  if (domains[0]) list.push(`<div class="coach-insight"><strong>Top site:</strong> ${escapeHtml(domains[0][0])} — ${fmtMin(domains[0][1])} today.</div>`);
  if (distracting > 0) list.push(`<div class="coach-insight"><strong>Distraction budget:</strong> ${fmtMin(distracting)} of tracked time was outside your productive categories.</div>`);
  if (tasks.length) list.push(`<div class="coach-insight"><strong>Tasks:</strong> ${done}/${tasks.length} completed. ${done === tasks.length ? 'Clear the list and set tomorrow\'s goal.' : 'Finish one pending task before opening another distraction.'}</div>`);
  if (deepMinutes) list.push(`<div class="coach-insight"><strong>Deep Work:</strong> ${deepMinutes} minutes logged today across ${deepSessions.length} session${deepSessions.length === 1 ? '' : 's'}.</div>`);
  if (domains.some(([d]) => /youtube|instagram|reddit|facebook|tiktok|x\.com|twitter/.test(d))) list.push(`<div class="coach-insight"><strong>Coach tip:</strong> Keep entertainment/social sites outside your next focus block. FocusFlow can block them automatically.</div>`);
  if (!list.length) list.push(`<div class="coach-insight"><strong>Next move:</strong> Start a Deep Work session with a measurable goal.</div>`);
  insights.innerHTML = list.join("");
}

document.getElementById("refreshCoach")?.addEventListener("click", () => { renderCoach(); renderReport(); });
renderCoach();
renderReport();

// =============================================
// DARK MODE TAB
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
    // Remove existing first
    await chrome.scripting.removeCSS({ target: { tabId }, css: getDarkCSS("invert", 90) }).catch(() => {});
    await chrome.scripting.removeCSS({ target: { tabId }, css: getDarkCSS("dim", 90) }).catch(() => {});
    await chrome.scripting.removeCSS({ target: { tabId }, css: getDarkCSS("grayscale", 90) }).catch(() => {});
    // Remove all style variants
    for (const s of ["invert","dim","grayscale"]) {
      for (let i = 50; i <= 100; i += 5) {
        await chrome.scripting.removeCSS({ target: { tabId }, css: getDarkCSS(s, i) }).catch(() => {});
      }
    }
    if (enabled) {
      await chrome.scripting.insertCSS({ target: { tabId }, css });
    }
  } catch(e) { console.warn("Dark mode inject failed:", e.message); }
}

async function syncDarkToCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || tab.url.startsWith("chrome")) return;

    const domain = new URL(tab.url).hostname.replace(/^www\./, "");
    darkCurrentDomain = domain;
    document.getElementById("darkCurrentSite").textContent = domain;

    const siteEnabled = darkState.sites[domain];
    const isEnabled = siteEnabled !== undefined ? siteEnabled : darkState.global;

    document.getElementById("darkSiteToggle").checked = isEnabled;
    document.getElementById("darkGlobalToggle").checked = darkState.global;
    document.getElementById("darkIntensity").value = darkState.intensity;
    document.getElementById("darkIntensityVal").textContent = darkState.intensity + "%";

    // Sync active style button
    document.querySelectorAll(".dark-style-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.style === darkState.style);
    });

    await applyDarkToTab(tab.id, isEnabled, darkState.style, darkState.intensity);
    renderDarkSiteList();
  } catch(e) { console.warn("Dark sync error:", e); }
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

function renderDarkSiteList() {
  const list = document.getElementById("darkSiteList");
  const entries = Object.entries(darkState.sites);
  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">No per-site overrides yet.</div>'; return;
  }
  list.innerHTML = entries.map(([domain, enabled]) => `
    <div class="dark-site-row">
      <span class="dark-site-row-name">${domain}</span>
      <span class="dark-site-row-mode">${enabled ? "🌙 Dark" : "☀️ Light"}</span>
      <button class="dark-rm-btn" data-domain="${domain}">✕</button>
    </div>`).join("");
  list.querySelectorAll(".dark-rm-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      delete darkState.sites[btn.dataset.domain];
      await saveDarkState();
      renderDarkSiteList();
    });
  });
}

// Global toggle
document.getElementById("darkGlobalToggle").addEventListener("change", async (e) => {
  darkState.global = e.target.checked;
  await saveDarkState();
  await applyDarkToAllTabs();
  if (darkCurrentDomain) {
    const siteOverride = darkState.sites[darkCurrentDomain];
    document.getElementById("darkSiteToggle").checked =
      siteOverride !== undefined ? siteOverride : darkState.global;
  }
});

// Per-site toggle
document.getElementById("darkSiteToggle").addEventListener("change", async (e) => {
  if (!darkCurrentDomain) return;
  darkState.sites[darkCurrentDomain] = e.target.checked;
  await saveDarkState();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await applyDarkToTab(tab.id, e.target.checked, darkState.style, darkState.intensity);
  renderDarkSiteList();
});

// Style selector
document.querySelectorAll(".dark-style-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    darkState.style = btn.dataset.style;
    document.querySelectorAll(".dark-style-btn").forEach(b => b.classList.toggle("active", b.dataset.style === darkState.style));
    await saveDarkState();
    await applyDarkToAllTabs();
  });
});

// Intensity slider
document.getElementById("darkIntensity").addEventListener("input", async (e) => {
  darkState.intensity = parseInt(e.target.value);
  document.getElementById("darkIntensityVal").textContent = darkState.intensity + "%";
  await saveDarkState();
  await applyDarkToAllTabs();
});

// Init dark mode tab
loadDarkState().then(() => syncDarkToCurrentTab());
