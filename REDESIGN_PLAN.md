# FocusFlow 2.0 — Minimal Redesign Plan

## Safety rules
- Work only on `feat/minimal-redesign`; do not modify `main` directly.
- Preserve Manifest V3, the service worker, all storage keys and existing feature logic.
- Keep all existing feature panel IDs and controls so existing event listeners and data rendering remain compatible.
- Do not clear, migrate, or rewrite Chrome Local Storage.
- Review the pull request before merging.

## Current architecture reviewed
- Root extension: `manifest.json`, `popup.html`, `popup.css`, `popup.js`, `background.js`.
- Popup logic is a single vanilla JavaScript file; current tab navigation is a small click-handler that activates `#tab-<name>`.
- Existing features include site tracking, blocking, speed control, Pomodoro, notes, tasks, heatmap, badges, productivity score, coding dashboard, reports, settings, dark mode and RangOS sync.
- Repository also contains older nested extension snapshots; leave them untouched during this redesign.

## Implementation phases
1. Replace the two crowded tab rows with five workspace groups: Home, Focus, Tools, Insights and Settings.
2. Keep existing feature buttons and tab panel IDs; add only a thin navigation controller.
3. Apply a minimal dark design system with restrained lime accent, readable typography, consistent spacing, accessible focus states and reduced-motion support.
4. Restyle the sync options page and blocked-site page without changing their behaviour.
5. Verify JavaScript syntax, HTML structure, all referenced panel IDs, Manifest V3 configuration and storage/feature code invariance.
6. Open a pull request for review; do not merge automatically.

## Explicitly out of scope
- No React/Vite migration.
- No storage key changes or data deletion.
- No changes to tracking, blocking, timers, sync API, permissions or backend.
- No deletion of legacy folders or files.
