// FocusFlow Website Profiles — background automation.
// Reads the existing timeData ledger; does not replace or migrate user data.
(() => {
  const ALARM = "focusFlowProfileLimitCheck";

  function dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function supported(tab) {
    return Boolean(tab?.id && tab.url && !/^(chrome|edge|about|chrome-extension):/.test(tab.url));
  }

  function domainOf(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); }
    catch { return ""; }
  }

  function profileFor(domain, profiles) {
    if (profiles[domain]) return profiles[domain];
    const match = Object.keys(profiles)
      .filter(root => domain === root || domain.endsWith("." + root))
      .sort((a, b) => b.length - a.length)[0];
    return match ? profiles[match] : null;
  }

  async function enforceTab(tab) {
    if (!supported(tab) || tab.url.includes("/blocked.html")) return;
    const domain = domainOf(tab.url);
    if (!domain) return;

    const saved = await chrome.storage.local.get(["siteProfiles", "timeData"]);
    const profiles = saved.siteProfiles && typeof saved.siteProfiles === "object" ? saved.siteProfiles : {};
    const profile = profileFor(domain, profiles);
    if (!profile || profile.enabled === false) return;

    const rate = Number(profile.playbackRate);
    if (Number.isFinite(rate) && rate >= 0.5 && rate <= 4) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (playbackRate) => {
            const apply = media => {
              if (media instanceof HTMLMediaElement) {
                try { media.playbackRate = playbackRate; media.defaultPlaybackRate = playbackRate; } catch (_) {}
              }
            };
            document.querySelectorAll("video,audio").forEach(apply);
            document.addEventListener("play", event => apply(event.target), true);
            document.addEventListener("loadedmetadata", event => apply(event.target), true);
            window.__focusFlowProfileObserver?.disconnect?.();
            const observer = new MutationObserver(records => {
              for (const record of records) for (const node of record.addedNodes) {
                if (node.nodeType !== 1) continue;
                if (node.matches?.("video,audio")) apply(node);
                node.querySelectorAll?.("video,audio").forEach(apply);
              }
            });
            if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
            window.__focusFlowProfileObserver = observer;
          },
          args: [rate]
        });
      } catch (_) { /* Restricted browser pages cannot be scripted. */ }
    }

    const limitMinutes = Number(profile.dailyLimitMinutes);
    if (!Number.isFinite(limitMinutes) || limitMinutes <= 0) return;
    const today = (saved.timeData || {})[dayKey()] || {};
    const usedSeconds = Object.entries(today).reduce((sum, [site, seconds]) => {
      return site === domain || site.endsWith("." + domain) ? sum + (Number(seconds) || 0) : sum;
    }, 0);

    if (usedSeconds >= limitMinutes * 60) {
      try { await chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") }); } catch (_) {}
    }
  }

  async function checkActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) await enforceTab(tab);
    } catch (_) {}
  }

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") enforceTab(tab);
  });
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try { await enforceTab(await chrome.tabs.get(tabId)); } catch (_) {}
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.siteProfiles || changes.timeData)) checkActiveTab();
  });
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === ALARM) checkActiveTab();
  });

  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
  chrome.runtime.onStartup.addListener(checkActiveTab);
  chrome.runtime.onInstalled.addListener(checkActiveTab);
})();
