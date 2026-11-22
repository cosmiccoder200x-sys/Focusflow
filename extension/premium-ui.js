// Design 01: navigation-only shortcuts. No storage, tracking or blocking writes.
(() => {
  "use strict";
  for (const shortcut of document.querySelectorAll("[data-open-group][data-open-tab]")) {
    shortcut.addEventListener("click", () => {
      const group = shortcut.dataset.openGroup;
      const tab = shortcut.dataset.openTab;
      // Reuse FocusFlow's existing navigation handlers and their lazy renders.
      const workspace = document.querySelector('.workspace-btn[data-nav-group="' + group + '"]');
      const feature = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
      if (!workspace || !feature) return;
      workspace.click();
      feature.click();
    });
  }
})();
