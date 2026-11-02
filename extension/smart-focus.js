// FocusFlow Smart Focus popup controller.
(() => {
  const $ = id => document.getElementById(id);
  const presetButtons = [...document.querySelectorAll("[data-sf-duration]")];
  const durationInput = $("sfCustomMinutes");
  const blockedInput = $("sfBlockedSites");
  const allowedInput = $("sfAllowedSites");
  const startButton = $("sfStart");
  const pauseButton = $("sfPause");
  const resumeButton = $("sfResume");
  const endButton = $("sfEnd");
  const overrideButton = $("sfOverride");
  let selectedDuration = 25;
  let sessionState = { status: "idle" };
  let tick = null;

  const formatTime = seconds => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
  };
  const elapsedNow = state => (Number(state.elapsedSec) || 0) +
    (state.status === "running" && state.startedAt ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0);
  const remainingNow = state => state.status === "running"
    ? Math.max(0, Math.ceil(((state.endTime || Date.now()) - Date.now()) / 1000))
    : Math.max(0, Number(state.remainingSec) || 0);

  function setMessage(message) { $("sfMessage").textContent = message || ""; }

  function renderState() {
    const state = sessionState || { status: "idle" };
    const running = state.status === "running";
    const paused = state.status === "paused";
    const active = running || paused;
    const duration = Number(state.durationSec) || selectedDuration * 60;
    const remaining = active ? remainingNow(state) : (state.status === "completed" ? 0 : selectedDuration * 60);
    const elapsed = active ? elapsedNow(state) : (Number(state.elapsedSec) || 0);
    const progress = duration ? Math.min(100, Math.max(0, elapsed / duration * 100)) : 0;

    $("sfSessionClock").textContent = formatTime(remaining);
    $("sfSessionProgress").style.width = progress + "%";
    $("sfSessionStatus").textContent = running ? "FOCUS SESSION ACTIVE" : paused ? "SESSION PAUSED" :
      state.status === "completed" ? "SESSION COMPLETE" : state.status === "ended" ? "SESSION ENDED" : "READY TO FOCUS";
    $("sfSessionRemaining").textContent = active ? Math.round(remaining / 60) + " MIN LEFT" : "";
    $("sfSessionCaption").textContent = running
      ? (state.overrideUntil > Date.now() ? "Emergency override is active — blocking resumes when it expires." : "Stay with your priority. Distractions are being blocked.")
      : paused ? "Blocking is paused. Resume when you're ready."
      : state.status === "completed" ? "You completed your planned focus session."
      : state.status === "ended" ? "Your progress was saved. Start another session when ready."
      : "Choose a duration and protect your focus time.";

    startButton.hidden = active;
    pauseButton.hidden = !running;
    resumeButton.hidden = !paused;
    endButton.hidden = !active;
    overrideButton.hidden = !running;
    const overrideActive = running && state.overrideUntil > Date.now();
    overrideButton.disabled = Boolean(overrideActive);
    overrideButton.textContent = overrideActive
      ? "Emergency override active · " + formatTime(Math.ceil((state.overrideUntil - Date.now()) / 1000))
      : "Emergency override · 5 minutes";

    [durationInput, blockedInput, allowedInput].forEach(el => { el.disabled = active; });
    presetButtons.forEach(button => { button.disabled = active; });
    if (running && remaining === 0) setMessage("Session time reached. Saving your summary…");
  }

  async function refreshState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: "SMART_FOCUS_GET" });
      if (response?.state) sessionState = response.state;
      renderState();
      await renderHistory();
    } catch (_) { setMessage("Could not load the focus session. Reload the extension and try again."); }
  }

  async function renderHistory() {
    const result = await chrome.storage.local.get("smartFocusHistory");
    const history = Array.isArray(result.smartFocusHistory) ? result.smartFocusHistory : [];
    $("sfHistoryCount").textContent = String(history.length);
    const container = $("sfHistory");
    container.replaceChildren();
    if (!history.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Your completed sessions will appear here.";
      container.appendChild(empty);
      return;
    }
    for (const item of history.slice(0, 8)) {
      const row = document.createElement("div"); row.className = "sf-history-item";
      const main = document.createElement("div"); main.className = "sf-history-main";
      const title = document.createElement("div"); title.className = "sf-history-title";
      title.textContent = item.status === "completed" ? "Completed focus session" : "Session " + (item.status || "ended");
      const meta = document.createElement("div"); meta.className = "sf-history-meta";
      const date = item.endedAt ? new Date(item.endedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
      meta.textContent = Math.round((item.actualFocusSec || 0) / 60) + " min focused · " + (item.plannedMinutes || 0) + " min planned · " + date;
      main.append(title, meta);
      const time = document.createElement("div"); time.className = "sf-history-time";
      time.textContent = formatTime(item.actualFocusSec || 0);
      row.append(main, time); container.appendChild(row);
    }
  }

  presetButtons.forEach(button => button.addEventListener("click", () => {
    const value = button.dataset.sfDuration;
    presetButtons.forEach(item => item.classList.toggle("active", item === button));
    if (value === "custom") {
      selectedDuration = Math.min(720, Math.max(1, Number(durationInput.value) || 50));
      durationInput.focus();
    } else {
      selectedDuration = Number(value);
      durationInput.value = String(selectedDuration);
    }
    renderState();
  }));

  durationInput.addEventListener("input", () => {
    if (document.querySelector('[data-sf-duration="custom"]').classList.contains("active")) {
      selectedDuration = Math.min(720, Math.max(1, Number(durationInput.value) || 1));
      renderState();
    }
  });

  startButton.addEventListener("click", async () => {
    const customSelected = document.querySelector('[data-sf-duration="custom"]').classList.contains("active");
    const durationMinutes = customSelected ? Number(durationInput.value) : selectedDuration;
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 720) {
      setMessage("Choose a whole number from 1 to 720 minutes."); return;
    }
    const split = value => value.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean);
    const response = await chrome.runtime.sendMessage({
      type: "SMART_FOCUS_START", durationMinutes,
      blockedSites: split(blockedInput.value), allowedSites: split(allowedInput.value)
    });
    if (!response?.ok) { setMessage(response?.reason || "Could not start the focus session."); return; }
    sessionState = response.state;
    setMessage("Focus session started. Your selected websites are now controlled.");
    renderState(); await renderHistory();
  });

  pauseButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({ type: "SMART_FOCUS_PAUSE" });
    if (!response?.ok) { setMessage(response?.reason); return; }
    sessionState = response.state; setMessage("Session paused. Focus blocking is temporarily inactive.");
    renderState();
  });

  resumeButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({ type: "SMART_FOCUS_RESUME" });
    if (!response?.ok) { setMessage(response?.reason); return; }
    sessionState = response.state; setMessage("You're back. Focus blocking is active again.");
    renderState();
  });

  overrideButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({ type: "SMART_FOCUS_OVERRIDE" });
    if (!response?.ok) { setMessage(response?.reason); return; }
    sessionState = response.state;
    setMessage("Emergency override enabled for 5 minutes. Your session timer continues.");
    renderState();
  });

  endButton.addEventListener("click", async () => {
    const response = await chrome.runtime.sendMessage({ type: "SMART_FOCUS_END" });
    if (!response?.ok) { setMessage(response?.reason || "Could not end session."); return; }
    sessionState = response.state;
    setMessage("Session ended. Your actual focus time has been saved.");
    renderState(); await renderHistory();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.smartFocusState) {
      sessionState = changes.smartFocusState.newValue || { status: "idle" };
      renderState();
    }
    if (changes.smartFocusHistory) renderHistory();
  });

  chrome.storage.local.get(["blockedSites", "smartFocusState"]).then(result => {
    if (Array.isArray(result.blockedSites)) blockedInput.value = result.blockedSites.join(", ");
    else blockedInput.value = "instagram.com, reddit.com, youtube.com, tiktok.com";
    allowedInput.value = "github.com, leetcode.com, codeforces.com, study.iitm.ac.in, docs.python.org";
    const state = result.smartFocusState;
    if (state && ["running", "paused"].includes(state.status)) {
      blockedInput.value = (state.blockedSites || []).join(", ");
      allowedInput.value = (state.allowedSites || []).join(", ");
      durationInput.value = String(Math.round((state.durationSec || 1500) / 60));
      selectedDuration = Math.round((state.durationSec || 1500) / 60);
    }
    refreshState();
  });

  tick = setInterval(() => {
    if (sessionState.status === "running") renderState();
  }, 1000);
})();
