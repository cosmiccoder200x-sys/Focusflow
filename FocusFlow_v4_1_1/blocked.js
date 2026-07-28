// ===== FocusFlow — blocked.js =====

// Show which site triggered the block, if we got it from background.js
(function showBlockedSite() {
  const params = new URLSearchParams(window.location.search);
  const site = params.get("site");
  const el = document.getElementById("blockedSite");
  if (site && el) el.textContent = site;
})();

// Live "time reclaimed this session" counter — ticks up while this page stays open,
// a small nudge that every second spent here is a second not lost to the blocked site.
(function reclaimTimer() {
  const el = document.getElementById("reclaimTime");
  if (!el) return;
  let seconds = 0;
  function tick() {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    el.textContent = `${m}:${s}`;
    seconds++;
  }
  tick();
  setInterval(tick, 1000);
})();

document.getElementById("closeTabBtn")?.addEventListener("click", () => {
  window.close();
  // Chrome only allows script-initiated tabs to self-close; if this tab was
  // navigated here (the usual case), fall back to a clean new tab instead.
  setTimeout(() => { window.location.href = "chrome://newtab/"; }, 150);
});
document.getElementById("newTabBtn")?.addEventListener("click", () => {
  window.location.href = "chrome://newtab/";
});
