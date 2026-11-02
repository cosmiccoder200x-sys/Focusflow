// ===== FOCUSFLOW — popup.js v4.0 =====
// All v3.0 features preserved + Heatmap, Badges, Score, Coding Dashboard, Report, Settings

// =============================================
// TAB NAVIGATION
// =============================================

function activateFeatureTab(btn) {
  if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
  btn.classList.add("active");
  const panel = document.getElementById("tab-" + btn.dataset.tab);
  if (panel) panel.classList.add("active");
  // Keep the original lazy-render behaviour for analytics panels.
  if (btn.dataset.tab === "stats") renderHeatmap();
  if (btn.dataset.tab === "badges") renderBadges();
  if (btn.dataset.tab === "score") renderScore();
  if (btn.dataset.tab === "code") renderCodingDashboard();
  if (btn.dataset.tab === "report") renderReport();
  if (btn.dataset.tab === "smartinsights") renderSmartInsights();
  if (btn.dataset.tab === "goals") renderDailyGoals();
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => activateFeatureTab(btn));
});

document.querySelectorAll(".workspace-btn").forEach(workspaceBtn => {
  workspaceBtn.addEventListener("click", () => {
    const groupName = workspaceBtn.dataset.navGroup;
    document.querySelectorAll(".workspace-btn").forEach(btn => {
      const selected = btn === workspaceBtn;
      btn.classList.toggle("active", selected);
      btn.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll(".nav-group").forEach(group => {
      const selected = group.dataset.group === groupName;
      group.hidden = !selected;
      group.classList.toggle("active", selected);
    });
    const firstFeature = document.querySelector('.nav-group[data-group="' + groupName + '"] .tab-btn');
    activateFeatureTab(firstFeature);
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
  const homeUsage = document.getElementById("homeTotalUsage");
  if (homeUsage) homeUsage.textContent = fmtSec(totalSec);
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
// SPEED TAB (preserved)
// =============================================

const slider = document.getElementById("speedSlider");
const speedVal = document.getElementById("speedVal");
const speedStatus = document.getElementById("speedStatus");
function updateSpeedDisplay(val) {
  const n = Math.min(4, Math.max(0.25, parseFloat(val) || 1));
  slider.value = n;
  speedVal.textContent = Number.isInteger(n) ? n.toFixed(1) : n.toFixed(2).replace(/0+$/, "");
}
slider.addEventListener("input", () => updateSpeedDisplay(slider.value));
document.querySelectorAll(".preset-btn").forEach(btn => btn.addEventListener("click", () => {
  const spd = Math.min(4, parseFloat(btn.dataset.speed));
  updateSpeedDisplay(spd);
  document.querySelectorAll(".preset-btn").forEach(b => b.classList.toggle("active", b === btn));
}));
async function applySelectedSpeed() {
  const spd = Math.min(4, Math.max(0.25, parseFloat(slider.value) || 1));
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || /^(chrome|edge|about):/.test(tab.url)) throw new Error("This page does not allow playback controls.");
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: (rate) => {
      const applyRate = media => { if (media instanceof HTMLMediaElement) try { media.playbackRate = rate; media.defaultPlaybackRate = rate; } catch (_) {} };
      document.querySelectorAll("video, audio").forEach(applyRate);
      document.addEventListener("play", event => applyRate(event.target), true);
      document.addEventListener("loadedmetadata", event => applyRate(event.target), true);
      const observer = new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.("video, audio")) applyRate(node);
        node.querySelectorAll?.("video, audio").forEach(applyRate);
      }});
      if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
      window.__focusFlowSpeedObserver?.disconnect?.();
      window.__focusFlowSpeedObserver = observer;
      window.__focusFlowPlaybackRate = rate;
    }, args: [spd] });
    if (speedStatus) speedStatus.textContent = `Applied ${spd}× to this page. New videos will use the same speed.`;
  } catch(e) {
    if (speedStatus) speedStatus.textContent = e.message || "Could not control playback on this page.";
    console.warn("Speed inject failed:", e.message);
  }
}
document.getElementById("applySpeed").addEventListener("click", applySelectedSpeed);
document.querySelectorAll("[data-home-speed]").forEach(btn => btn.addEventListener("click", () => {
  const rate = Math.min(4, Number(btn.dataset.homeSpeed));
  slider.value = String(rate); updateSpeedDisplay(rate);
  document.querySelectorAll(".preset-btn").forEach(b => b.classList.toggle("active", Number(b.dataset.speed) === rate));
  applySelectedSpeed();
}));
document.getElementById("homeDarkShortcut")?.addEventListener("click", () => document.getElementById("quickDarkToggle")?.click());

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
      tasks[idx].done = !tasks[idx].done;
      if (tasks[idx].done) await recordDailyTaskCompletion(tasks[idx]);
      await saveTasks(tasks);
      await renderTaskList(); await syncTaskBlocking();
      await renderDailyGoals();
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


/* =============================================
   DAILY GOALS — DAILY TARGETS + STREAKS
   ============================================= */
const DEFAULT_DAILY_GOALS = { focusMinutes: 120, tasks: 3 };

async function recordDailyTaskCompletion(task) {
  const result = await chrome.storage.local.get("dailyTaskCompletions");
  const completions = result.dailyTaskCompletions || {};
  const today = getTodayKey();
  if (!Array.isArray(completions[today])) completions[today] = [];
  const taskKey = String(task.id ?? task.text ?? "task");
  if (!completions[today].includes(taskKey)) {
    completions[today].push(taskKey);
    await chrome.storage.local.set({ dailyTaskCompletions: completions });
  }
}

function getDailyFocusSeconds(dateKey, timeData, categories) {
  // The background tracker flushes active-tab seconds into timeData every second.
  // Read the persisted total only; adding activeTracking elapsed time would double-count it.
  let total = 0;
  Object.entries(timeData[dateKey] || {}).forEach(([domain, seconds]) => {
    if ((categories[domain] || "waste") === "study") total += Math.max(0, Number(seconds) || 0);
  });
  return total;
}

function getDailyTaskCount(dateKey, completions) {
  return Array.isArray(completions[dateKey]) ? new Set(completions[dateKey].map(String)).size : 0;
}

function isDailyGoalMet(dateKey, focusTargetSec, taskTarget, timeData, categories, completions) {
  return getDailyFocusSeconds(dateKey, timeData, categories, null) >= focusTargetSec &&
    getDailyTaskCount(dateKey, completions) >= taskTarget;
}

async function renderDailyGoals() {
  const result = await chrome.storage.local.get(["dailyGoalSettings","dailyTaskCompletions","timeData","siteCategories"]);
  const settings = { ...DEFAULT_DAILY_GOALS, ...(result.dailyGoalSettings || {}) };
  const completions = result.dailyTaskCompletions || {};
  const timeData = result.timeData || {};
  const categories = result.siteCategories || {};
  const focusTargetSec = settings.focusMinutes * 60;
  const today = getTodayKey();
  const focusSec = getDailyFocusSeconds(today, timeData, categories);
  const taskCount = getDailyTaskCount(today, completions);
  const focusPct = Math.min(100, Math.round(focusSec / Math.max(1, focusTargetSec) * 100));
  const taskPct = Math.min(100, Math.round(taskCount / Math.max(1, settings.tasks) * 100));
  const updateRing = (id, pct) => {
    const ring = document.getElementById(id);
    if (ring) ring.style.background = `conic-gradient(var(--accent) ${pct}%, rgba(255,255,255,.075) 0)`;
  };
  updateRing("goalFocusRing", focusPct);
  updateRing("goalTasksRing", taskPct);
  document.getElementById("goalFocusValue").textContent = focusPct + "%";
  document.getElementById("goalTasksValue").textContent = taskPct + "%";
  document.getElementById("goalFocusAmount").textContent = `${Math.floor(focusSec / 60)} / ${settings.focusMinutes} min`;
  document.getElementById("goalTasksAmount").textContent = `${taskCount} / ${settings.tasks} done`;
  document.getElementById("goalFocusTarget").value = settings.focusMinutes;
  document.getElementById("goalTasksTarget").value = settings.tasks;

  let bestStreak = 0, runningStreak = 0, daysMet = 0;
  for (let i = 364; i >= 0; i--) {
    if (isDailyGoalMet(getDateKey(i), focusTargetSec, settings.tasks, timeData, categories, completions)) {
      daysMet++; runningStreak++; bestStreak = Math.max(bestStreak, runningStreak);
    } else runningStreak = 0;
  }
  let currentStreak = 0;
  for (let i = 0; i < 365; i++) {
    if (isDailyGoalMet(getDateKey(i), focusTargetSec, settings.tasks, timeData, categories, completions)) currentStreak++;
    else if (i !== 0) break;
  }
  document.getElementById("goalCurrentStreak").textContent = currentStreak;
  document.getElementById("goalBestStreak").textContent = bestStreak;
  document.getElementById("goalDaysMet").textContent = daysMet;

  const strip = document.getElementById("goalWeekStrip");
  strip.replaceChildren();
  for (let i = 6; i >= 0; i--) {
    const key = getDateKey(i);
    const focus = getDailyFocusSeconds(key, timeData, categories);
    const tasks = getDailyTaskCount(key, completions);
    const met = focus >= focusTargetSec && tasks >= settings.tasks;
    const day = document.createElement("div");
    day.className = "goal-week-day" + (met ? " is-complete" : "");
    const label = document.createElement("span");
    label.textContent = i === 0 ? "Today" : new Date(key + "T12:00:00").toLocaleDateString([], { weekday: "short" });
    const dot = document.createElement("i");
    dot.setAttribute("aria-label", met ? "Goal completed" : "Goal not completed");
    const value = document.createElement("small");
    value.textContent = met ? "Done" : Math.min(100, Math.round(Math.min(focus / focusTargetSec, tasks / settings.tasks) * 100)) + "%";
    day.append(label, dot, value);
    strip.appendChild(day);
  }
}

document.getElementById("dailyGoalSave").addEventListener("click", async () => {
  const focusMinutes = Number(document.getElementById("goalFocusTarget").value);
  const tasks = Number(document.getElementById("goalTasksTarget").value);
  const status = document.getElementById("dailyGoalStatus");
  if (!Number.isInteger(focusMinutes) || focusMinutes < 15 || focusMinutes > 720 ||
      !Number.isInteger(tasks) || tasks < 1 || tasks > 30) {
    status.textContent = "Choose 15–720 focus minutes and 1–30 tasks.";
    return;
  }
  await chrome.storage.local.set({ dailyGoalSettings: { focusMinutes, tasks } });
  status.textContent = "Daily targets saved.";
  await renderDailyGoals();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.timeData || changes.siteCategories || changes.dailyTaskCompletions ||
      changes.dailyGoalSettings) {
    if (document.getElementById("tab-goals")?.classList.contains("active")) renderDailyGoals();
  }
});

chrome.storage.local.get("dailyGoalSettings").then(result => {
  if (!result.dailyGoalSettings) chrome.storage.local.set({ dailyGoalSettings: DEFAULT_DAILY_GOALS });
});

// =============================================
// STATS TAB — GITHUB-STYLE HEATMAP
// =============================================

async function renderHeatmap() {
  const canvas = document.getElementById("heatmapCanvas");
  if (!canvas) return;

  const r = await chrome.storage.local.get(["timeData", "siteCategories"]);
  const timeData = r.timeData || {};
  const cats = r.siteCategories || {};

  // Build 365 days of data
  const cellSize = 10, gap = 2, step = cellSize + gap;
  const weeks = 53;
  const W = weeks * step + 20;
  const H = 7 * step + 20;

  canvas.width  = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const today = new Date();
  const dayData = {};
  let maxMinutes = 0;

  // Collect data for last 365 days
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

  // Calculate streaks
  let currentStreak = 0, longestStreak = 0, totalProductiveDays = 0;
  let tempStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mins = dayData[key]?.mins || 0;
    if (mins >= 30) { // 30+ minutes = productive
      if (i === 0) currentStreak = 1;
      else if (currentStreak > 0) currentStreak++;
      totalProductiveDays++;
    } else {
      if (i === 0) currentStreak = 0;
      else break; // streak broken
    }
  }
  // Longest streak
  tempStreak = 0;
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const mins = dayData[key]?.mins || 0;
    if (mins >= 30) { tempStreak++; longestStreak = Math.max(longestStreak, tempStreak); }
    else tempStreak = 0;
  }

  document.getElementById("currentStreak").textContent  = currentStreak;
  document.getElementById("longestStreak").textContent  = longestStreak;
  document.getElementById("totalProductiveDays").textContent = totalProductiveDays;

  // Color scale
  function getColor(mins) {
    if (mins === 0) return "#1a1a22";
    if (mins < 30)  return "#1c3a2a";
    if (mins < 90)  return "#2a6644";
    if (mins < 180) return "#3aa866";
    return "#4caf82";
  }

  // Draw cells — grid by week column / day row
  const cellMap = [];
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() - 364);
  // Align to Sunday
  const startDow = startDay.getDay();
  startDay.setDate(startDay.getDate() - startDow);

  let d = new Date(startDay);
  let col = 0;
  while (d <= today) {
    for (let row = 0; row < 7; row++) {
      const cur = new Date(d);
      const key = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
      const info = dayData[key];
      const x = col * step + 16;
      const y = row * step + 8;
      ctx.fillStyle = info ? getColor(info.mins) : "#1a1a22";
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

  // Tooltip on hover
  const wrap = document.getElementById("heatmapWrap");
  const tooltip = document.getElementById("heatmapTooltip");
  const tasks_r = await chrome.storage.local.get("tasks");

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let found = null;
    for (const cell of cellMap) {
      if (mx >= cell.x && mx <= cell.x + cellSize && my >= cell.y && my <= cell.y + cellSize) {
        found = cell; break;
      }
    }
    if (found) {
      tooltip.style.left = (e.clientX + 12) + "px";
      tooltip.style.top  = (e.clientY - 40) + "px";
      tooltip.textContent = `${found.date}\n⏱ ${found.mins}m focus`;
      tooltip.style.opacity = "1";
    } else {
      tooltip.style.opacity = "0";
    }
  });
  canvas.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });
}

// =============================================
// BADGES TAB — ACHIEVEMENT SYSTEM
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


/* =============================================
   SMART INSIGHTS — LOCAL, RULE-BASED ANALYSIS
   ============================================= */
function insightNode(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}
function insightCard(title, value, detail) {
  const card = insightNode("article", "insight-card");
  card.append(insightNode("span","insight-card-label",title),
    insightNode("strong","insight-card-value",value),
    insightNode("span","insight-card-detail",detail));
  return card;
}
async function renderSmartInsights() {
  const root = document.getElementById("smartInsightsContent");
  if (!root) return;
  const data = await chrome.storage.local.get(["timeData","siteCategories","smartFocusHistory"]);
  const timeData = data.timeData || {};
  const categories = data.siteCategories || {};
  const sessions = Array.isArray(data.smartFocusHistory) ? data.smartFocusHistory : [];
  const sumDays = (start,end) => {
    let study=0, distraction=0, total=0, sites={};
    for(let i=start;i<end;i++){
      Object.entries(timeData[getDateKey(i)]||{}).forEach(([domain,raw])=>{
        const seconds=Math.max(0,Number(raw)||0); total+=seconds;
        sites[domain]=(sites[domain]||0)+seconds;
        if((categories[domain]||"waste")==="study")study+=seconds;else distraction+=seconds;
      });
    }
    return {study,distraction,total,sites};
  };
  const recent=sumDays(0,7), previous=sumDays(7,14);
  const changePct=previous.study>0?Math.round((recent.study-previous.study)/previous.study*100):null;
  const focusShare=recent.total?Math.round(recent.study/recent.total*100):0;
  const topDistractions=Object.entries(recent.sites)
    .filter(([domain])=>(categories[domain]||"waste")!=="study")
    .sort((a,b)=>b[1]-a[1]).slice(0,3);
  const cutoff=Date.now()-7*86400000;
  const weekSessions=sessions.filter(s=>Number(s.endedAt||0)>=cutoff);
  const completed=weekSessions.filter(s=>s.status==="completed").length;
  const sessionRate=weekSessions.length?Math.round(completed/weekSessions.length*100):null;
  const avgSession=weekSessions.length?Math.round(weekSessions.reduce((n,s)=>n+Math.max(0,Number(s.actualFocusSec)||0),0)/weekSessions.length/60):0;
  let bestDay=null;
  for(let i=0;i<7;i++){
    const key=getDateKey(i);let study=0;
    Object.entries(timeData[key]||{}).forEach(([domain,seconds])=>{
      if((categories[domain]||"waste")==="study")study+=Math.max(0,Number(seconds)||0);
    });
    if(!bestDay||study>bestDay.study)bestDay={key,study};
  }
  const bestLabel=bestDay?.study?(bestDay.key===getTodayKey()?"Today":new Date(bestDay.key+"T12:00:00").toLocaleDateString([],{weekday:"long"})):"Not enough data";
  const metrics=document.createElement("div");metrics.className="insight-metric-grid";
  metrics.append(
    insightCard("Study time · 7 days",fmtSec(recent.study),"Across sites marked Study"),
    insightCard("Focus share",recent.total?focusShare+"%":"—","Study time as a share of tracked browsing"),
    insightCard("Study-time trend",changePct===null?"Building baseline":(changePct>0?"+":"")+changePct+"%","Compared with the previous 7 days"),
    insightCard("Best study day",bestLabel,bestDay?.study?fmtSec(bestDay.study)+" of study time":"Start tracking to find your pattern")
  );
  const suggestions=[];
  if(!recent.total)suggestions.push("Browse as usual for a few days. FocusFlow needs tracked activity before it can spot useful patterns.");
  else{
    if(focusShare<35)suggestions.push("Try one 25-minute Smart Focus session with only the sites needed for your current task allowed.");
    else if(focusShare<65)suggestions.push("Protect one distraction-free block to increase focused time while keeping your routine balanced.");
    else suggestions.push("Your tracked time is mostly on Study sites. Keep the routine sustainable with planned breaks.");
    if(topDistractions[0]&&topDistractions[0][1]>=1800)suggestions.push("Consider adding "+topDistractions[0][0]+" to a Smart Focus block list during your next study session.");
    if(changePct!==null&&changePct< -15)suggestions.push("Study time is down from the previous week. Set a smaller target and rebuild consistency.");
    else if(changePct!==null&&changePct>15)suggestions.push("Study time is trending upward. Keep the schedule repeatable rather than increasing it too quickly.");
    if(!weekSessions.length)suggestions.push("Try a Smart Focus session this week so you can compare planned and completed focus time.");
    else if(sessionRate<50)suggestions.push("Many recent Smart Focus sessions ended early. Shorten the planned duration or make the allow list more practical.");
  }
  const suggestionPanel=insightNode("section","insight-panel-card");
  suggestionPanel.appendChild(insightNode("h3","insight-panel-title","Suggestions to try"));
  const list=insightNode("ul","insight-recommendations");
  suggestions.slice(0,4).forEach(s=>list.appendChild(insightNode("li","",s)));
  suggestionPanel.appendChild(list);

  const distractionPanel=insightNode("section","insight-panel-card");
  distractionPanel.appendChild(insightNode("h3","insight-panel-title","Top distractions · 7 days"));
  if(!topDistractions.length)distractionPanel.appendChild(insightNode("p","insight-muted","No non-study browsing time recorded yet."));
  else{
    const rows=insightNode("div","insight-domain-list");
    topDistractions.forEach(([domain,seconds])=>{
      const row=insightNode("div","insight-domain-row");
      row.append(insightNode("span","insight-domain-name",domain),insightNode("strong","",fmtSec(seconds)));
      rows.appendChild(row);
    });
    distractionPanel.appendChild(rows);
  }
  const sessionPanel=insightNode("section","insight-panel-card");
  sessionPanel.appendChild(insightNode("h3","insight-panel-title","Smart Focus · 7 days"));
  const sessionGrid=insightNode("div","insight-session-grid");
  [["Sessions",String(weekSessions.length)],["Completed",String(completed)],
   ["Completion rate",sessionRate===null?"—":sessionRate+"%"],
   ["Average focused",weekSessions.length?avgSession+" min":"—"]].forEach(([label,value])=>{
    const item=insightNode("div","insight-session-stat");
    item.append(insightNode("span","",label),insightNode("strong","",value));sessionGrid.appendChild(item);
  });
  sessionPanel.appendChild(sessionGrid);
  const comparePanel=insightNode("section","insight-panel-card");
  comparePanel.appendChild(insightNode("h3","insight-panel-title","Study time · week over week"));
  comparePanel.appendChild(insightNode("p","insight-muted",changePct===null?
    "A comparison will appear after you have activity across two weeks.":
    "You logged "+fmtSec(recent.study)+" this week and "+fmtSec(previous.study)+" last week."));
  root.replaceChildren(metrics,suggestionPanel,distractionPanel,sessionPanel,comparePanel);
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
  const keys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","achievements","dsaProgress","siteProfiles","darkMode","smartFocusState","smartFocusHistory","dailyGoalSettings","dailyTaskCompletions"];
  const r = await chrome.storage.local.get(keys);
  const payload = { meta: { app: "focusflow", version: "4.0", exportedAt: new Date().toISOString() }, ...r };
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
  // Preserve the existing stored theme value; the redesigned interface uses a fixed emerald palette.
  document.body.setAttribute("data-theme", "emerald");
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
  const keys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","siteProfiles","darkMode","smartFocusState","smartFocusHistory","dailyGoalSettings","dailyTaskCompletions"];
  const r = await chrome.storage.local.get(keys);
  const payload = { meta: { app: "focusflow", version: "4.0", exportedAt: new Date().toISOString(), schemaVersion: 2 }, ...r };
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
  const allowedKeys = ["timeData","siteCategories","blockedSites","tasks","quickNotes","pomoHistory","pomoState","dailyPomoCount","achievements","dsaProgress","weeklyReports","siteProfiles","darkMode","smartFocusState","smartFocusHistory","dailyGoalSettings","dailyTaskCompletions"];
  allowedKeys.forEach(k => { if (payload[k] !== undefined) toSet[k] = payload[k]; });
  await chrome.storage.local.set(toSet);
  alert("Data restored successfully! Please reload the extension.");
  e.target.value = "";
});

// Reset stats
document.getElementById("resetStatsBtn").addEventListener("click", async () => {
  if (!confirm("Reset all tracking statistics? This cannot be undone.")) return;
  await chrome.storage.local.remove(["timeData","dailyPomoCount","pomoHistory","achievements","smartFocusHistory","dailyTaskCompletions"]);
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
// DARK MODE TAB
// =============================================

const DARK_STYLES = {
  smart: (i) => `html { color-scheme: dark !important; background: #101216 !important; filter: invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg) !important; }`,
  invert: (i) => `html { filter: invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture, [style*="background-image"] { filter: invert(100%) hue-rotate(180deg) !important; }`,
  dim: (i) => `html { background: #101216 !important; filter: brightness(${Math.max(35, 100 - Math.round(i * 0.45))}%) !important; color-scheme: dark !important; }`,
  grayscale: (i) => `html { filter: grayscale(100%) invert(${i}%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg, picture { filter: invert(100%) hue-rotate(180deg) !important; }`
};

let darkState = { global: false, style: "smart", intensity: 90, sites: {} };
let darkCurrentDomain = null;
let darkCurrentTabId = null;

async function loadDarkState() {
  const r = await chrome.storage.local.get("darkMode");
  if (r.darkMode) darkState = { ...darkState, ...r.darkMode, sites: { ...(r.darkMode.sites || {}) } };
}

async function saveDarkState() {
  await chrome.storage.local.set({ darkMode: darkState });
}

function getDarkCSS(style, intensity) {
  return (DARK_STYLES[style] || DARK_STYLES.smart)(intensity);
}

async function applyDarkToTab(tabId, enabled, style, intensity, previousStyle = style, previousIntensity = intensity) {
  const target = { tabId };
  try {
    await chrome.scripting.removeCSS({
      target, css: getDarkCSS(previousStyle, previousIntensity)
    }).catch(() => {});
    await chrome.scripting.removeCSS({
      target,
      css: `html { filter: invert(90%) hue-rotate(180deg) !important; } img, video, canvas, iframe, svg { filter: invert(100%) hue-rotate(180deg) !important; }`
    }).catch(() => {});
    if (enabled) await chrome.scripting.insertCSS({ target, css: getDarkCSS(style, intensity) });
  } catch(e) {
    console.warn("Dark mode injection failed:", e.message);
  }
}

function isSupportedPage(tab) {
  return Boolean(tab?.id && tab.url && !/^(chrome|edge|about|chrome-extension):/.test(tab.url));
}

function getDarkEnabledForDomain(domain) {
  return darkState.sites[domain] !== undefined ? darkState.sites[domain] : darkState.global;
}

async function getCurrentDarkTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function updateQuickDarkButton(enabled) {
  const button = document.getElementById("quickDarkToggle");
  const label = document.getElementById("quickDarkLabel");
  if (!button) return;
  button.classList.toggle("is-on", Boolean(enabled));
  button.setAttribute("aria-pressed", String(Boolean(enabled)));
  if (label) label.textContent = enabled ? "Dark on" : "Dark";
}

async function syncDarkToCurrentTab() {
  try {
    const tab = await getCurrentDarkTab();
    if (!isSupportedPage(tab)) {
      darkCurrentDomain = null;
      darkCurrentTabId = null;
      updateQuickDarkButton(false);
      return;
    }
    const domain = new URL(tab.url).hostname.replace(/^www\./, "");
    darkCurrentDomain = domain;
    darkCurrentTabId = tab.id;
    document.getElementById("darkCurrentSite").textContent = domain;
    const enabled = getDarkEnabledForDomain(domain);
    document.getElementById("darkSiteToggle").checked = enabled;
    document.getElementById("darkGlobalToggle").checked = darkState.global;
    document.getElementById("darkIntensity").value = darkState.intensity;
    document.getElementById("darkIntensityVal").textContent = darkState.intensity + "%";
    document.querySelectorAll(".dark-style-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.style === darkState.style);
    });
    updateQuickDarkButton(enabled);
    await applyDarkToTab(tab.id, enabled, darkState.style, darkState.intensity);
    renderDarkSiteList();
  } catch(e) { console.warn("Dark sync error:", e); }
}

async function applyDarkToAllTabs(previousStyle = darkState.style, previousIntensity = darkState.intensity) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!isSupportedPage(tab)) continue;
    try {
      const domain = new URL(tab.url).hostname.replace(/^www\./, "");
      await applyDarkToTab(tab.id, getDarkEnabledForDomain(domain), darkState.style, darkState.intensity, previousStyle, previousIntensity);
    } catch {}
  }
  await syncDarkToCurrentTab();
}

function renderDarkSiteList() {
  const list = document.getElementById("darkSiteList");
  const entries = Object.entries(darkState.sites);
  if (!entries.length) {
    list.innerHTML = '<div class="empty-state">No per-site overrides yet.</div>';
    return;
  }
  list.innerHTML = entries.map(([domain, enabled]) => `
    <div class="dark-site-row">
      <span class="dark-site-row-name">${domain}</span>
      <span class="dark-site-row-mode">${enabled ? "Dark" : "Light"}</span>
      <button class="dark-rm-btn" data-domain="${domain}" aria-label="Remove override for ${domain}">Remove</button>
    </div>`).join("");
  list.querySelectorAll(".dark-rm-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      delete darkState.sites[btn.dataset.domain];
      await saveDarkState();
      renderDarkSiteList();
      await applyDarkToAllTabs();
    });
  });
}

document.getElementById("quickDarkToggle")?.addEventListener("click", async () => {
  if (!darkCurrentDomain || !darkCurrentTabId) {
    await syncDarkToCurrentTab();
    return;
  }
  const next = !getDarkEnabledForDomain(darkCurrentDomain);
  darkState.sites[darkCurrentDomain] = next;
  await saveDarkState();
  await applyDarkToTab(darkCurrentTabId, next, darkState.style, darkState.intensity);
  document.getElementById("darkSiteToggle").checked = next;
  updateQuickDarkButton(next);
  renderDarkSiteList();
});

document.getElementById("darkGlobalToggle").addEventListener("change", async (e) => {
  darkState.global = e.target.checked;
  await saveDarkState();
  await applyDarkToAllTabs();
});

document.getElementById("darkSiteToggle").addEventListener("change", async (e) => {
  if (!darkCurrentDomain || !darkCurrentTabId) return;
  darkState.sites[darkCurrentDomain] = e.target.checked;
  await saveDarkState();
  await applyDarkToTab(darkCurrentTabId, e.target.checked, darkState.style, darkState.intensity);
  updateQuickDarkButton(e.target.checked);
  renderDarkSiteList();
});

document.querySelectorAll(".dark-style-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const previousStyle = darkState.style;
    const previousIntensity = darkState.intensity;
    darkState.style = btn.dataset.style;
    document.querySelectorAll(".dark-style-btn").forEach(b => b.classList.toggle("active", b.dataset.style === darkState.style));
    await saveDarkState();
    await applyDarkToAllTabs(previousStyle, previousIntensity);
  });
});

document.getElementById("darkIntensity").addEventListener("input", async (e) => {
  const previousStyle = darkState.style;
  const previousIntensity = darkState.intensity;
  darkState.intensity = parseInt(e.target.value, 10);
  document.getElementById("darkIntensityVal").textContent = darkState.intensity + "%";
  await saveDarkState();
  await applyDarkToAllTabs(previousStyle, previousIntensity);
});

loadDarkState().then(() => syncDarkToCurrentTab());
