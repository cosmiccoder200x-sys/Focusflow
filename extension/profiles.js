// FocusFlow Website Profiles — per-domain preferences and limits.
(() => {
  const $ = (id) => document.getElementById(id);
  const domainInput = $("profileDomain");
  const enabledInput = $("profileEnabled");
  const speedInput = $("profileSpeed");
  const limitInput = $("profileLimit");
  const darkInput = $("profileDarkMode");
  const list = $("profileList");
  const status = $("profileStatus");

  function normalizeDomain(value) {
    let raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    try {
      if (!raw.includes("://")) raw = "https://" + raw;
      const url = new URL(raw);
      const host = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
      if (!host || !host.includes(".") || /[^a-z0-9.-]/.test(host) || host.includes("..")) return "";
      return host;
    } catch { return ""; }
  }

  async function getProfiles() {
    const result = await chrome.storage.local.get("siteProfiles");
    return result.siteProfiles && typeof result.siteProfiles === "object" ? result.siteProfiles : {};
  }

  async function currentDomain() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return "";
    try { return new URL(tab.url).hostname.replace(/^www\./, ""); } catch { return ""; }
  }

  async function editProfile(domain) {
    const profiles = await getProfiles();
    const profile = profiles[domain];
    if (!profile) return;
    domainInput.value = domain;
    enabledInput.checked = profile.enabled !== false;
    speedInput.value = String(profile.playbackRate || 1);
    limitInput.value = String(profile.dailyLimitMinutes || 0);
    const dark = await chrome.storage.local.get("darkMode");
    const overrides = dark.darkMode?.sites || {};
    darkInput.value = Object.prototype.hasOwnProperty.call(overrides, domain)
      ? (overrides[domain] ? "on" : "off") : "inherit";
    status.textContent = "Editing " + domain;
  }

  async function renderProfiles() {
    const profiles = await getProfiles();
    const entries = Object.entries(profiles).sort(([a], [b]) => a.localeCompare(b));
    $("profileCount").textContent = String(entries.length);
    if (!entries.length) {
      list.innerHTML = '<div class="empty-state">No website profiles yet. Add one above.</div>';
      return;
    }
    list.innerHTML = entries.map(([domain, p]) => {
      const enabled = p.enabled !== false;
      const limit = Number(p.dailyLimitMinutes) > 0 ? Number(p.dailyLimitMinutes) + " min/day" : "No time limit";
      return '<div class="profile-item"><div class="profile-item-main"><div class="profile-item-domain">' +
        domain + '</div><div class="profile-item-meta">' + (enabled ? "Rules on" : "Rules paused") +
        " · " + Number(p.playbackRate || 1) + "× · " + limit + '</div></div><div class="profile-item-actions">' +
        '<button type="button" data-edit="' + domain + '">Edit</button><button type="button" data-remove="' + domain + '">Remove</button></div></div>';
    }).join("");
    list.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => editProfile(button.dataset.edit)));
    list.querySelectorAll("[data-remove]").forEach(button => button.addEventListener("click", async () => {
      const profiles = await getProfiles();
      delete profiles[button.dataset.remove];
      await chrome.storage.local.set({ siteProfiles: profiles });
      await renderProfiles();
      status.textContent = "Profile removed. Existing dark-mode override was left unchanged.";
    }));
  }

  $("profileUseCurrent").addEventListener("click", async () => {
    const domain = await currentDomain();
    if (domain) domainInput.value = domain;
    else status.textContent = "Open a regular website first.";
  });

  $("profileSave").addEventListener("click", async () => {
    const domain = normalizeDomain(domainInput.value);
    const rate = Number(speedInput.value);
    const limit = Number(limitInput.value);
    if (!domain) { status.textContent = "Enter a valid domain, such as youtube.com."; return; }
    if (!Number.isFinite(rate) || rate < 0.5 || rate > 4) { status.textContent = "Choose a playback speed from 0.5× to 4×."; return; }
    if (!Number.isInteger(limit) || limit < 0 || limit > 1440) { status.textContent = "Daily limit must be a whole number from 0 to 1440."; return; }

    const profiles = await getProfiles();
    profiles[domain] = { enabled: enabledInput.checked, playbackRate: rate, dailyLimitMinutes: limit, updatedAt: Date.now() };
    await chrome.storage.local.set({ siteProfiles: profiles });

    const darkResult = await chrome.storage.local.get("darkMode");
    const darkMode = darkResult.darkMode || { global: false, style: "smart", intensity: 90, sites: {} };
    darkMode.sites = { ...(darkMode.sites || {}) };
    if (darkInput.value === "inherit") delete darkMode.sites[domain];
    else darkMode.sites[domain] = darkInput.value === "on";
    await chrome.storage.local.set({ darkMode });

    status.textContent = "Saved " + domain + ". Rules apply on the next page load.";
    await renderProfiles();
  });

  currentDomain().then(domain => { if (domain) domainInput.value = domain; });
  renderProfiles();
})();
