const closeButton = document.getElementById("close-tab");
const closeStatus = document.getElementById("close-status");

closeButton.addEventListener("click", async () => {
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id == null) {
      closeStatus.textContent = "You can close this tab from your browser.";
      return;
    }

    await chrome.tabs.remove(tab.id);
  } catch {
    closeStatus.textContent = "You can close this tab from your browser.";
  }
});
