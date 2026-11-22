# FocusFlow Design 01 — Warm Minimal × Dark Emerald

## Goal

A premium, calm interface consistent across the Chrome popup, optional sync settings, and the standalone landing page. The website uses warm cream, editorial typography, and forest green. The Chrome extension remains dark charcoal with soft emerald accents.

This implementation is **not** a Chrome Web Store release or a deployed website. The existing GitHub-hosted screenshot in the landing page is expressly labeled as pre-redesign; it is not a fabricated capture of the new UI.

## Compact Chrome popup correction

The first Design 01 implementation looked crowded in a real **344px-wide Chrome popup** because a fixed 132px sidebar left less than two-thirds of the window for actual content. The promotional reference is a wide composition, not a suitable pixel-for-pixel layout for a narrow popup.

The updated implementation preserves Design 01's dark emerald aesthetic but adapts the layout to the real installation:

- `extension/compact-layout.css` loads **after** the original and premium stylesheets, replacing the sidebar with five icon-and-label destinations across the top.
- The Home content now uses the full width, with an easier-to-read heading, current-site card, two-column action buttons, and an unclipped website-time breakdown.
- The site dark-mode switch stays directly accessible in the header. Sub-tabs scroll horizontally only when needed; the main content has one vertical scroll area.
- Other workspaces remain present with their original IDs and event handlers. Responsive fields avoid squeezing two-column configuration panels at narrow widths.
- `tests/compact-layout.test.js` checks the DOM hooks, stylesheet order, and narrow-layout constraints; browser layout and real feature behavior still need manual verification.

The cream/forest-green marketing landing page remains a **separate, wider website layout**. This change does not deploy it or touch tracking, permissions, or saved data.

## Original Design 01 implementation

- \`extension/premium-design.css\`: presentation layer after the original stylesheet. Original sidebar prototype (superseded by `compact-layout.css` in the extension popup), improved cards, accessible focus states, reduced-motion accommodation, real website-time breakdown, responsive small-window adjustments.
- \`extension/popup.html\`: refreshed Home, explicit focus/Pomodoro/block/appearance shortcuts, original DOM hooks preserved for timers, tasks, blocking, reports, preferences, profiles, daily goals, Insights and media tools.
- \`extension/premium-ui.js\`: shortcut buttons delegate to the existing navigation handlers; no storage writes.
- \`extension/popup.js\`: per-website ranking now renders a proportional bar from real \`timeData\`, plus easier-to-read category labels. Existing data and tracking logic unchanged.
- \`extension/options-premium.css\`: visual refresh of optional sync settings, no network or secret behavior changes.
- \`docs/index.html\`: standalone responsive cream/forest landing page with an existing real project screenshot and source-only installation links.
- \`tests/premium-design.test.js\`: protects core DOM hooks, navigation shortcuts, media labeling and screenshot integrity.

## Reviewer acceptance criteria

### Appearance
- [ ] Unpacked Chrome popup opens at **344px and 380px viewport widths**, without a permanent sidebar, overlapping header elements, clipped navigation, or unwanted horizontal scroll.
- [ ] The five icon-and-label workspaces fit across the top; sub-tabs remain legible, horizontally scrollable where needed, keyboard reachable and named.
- [ ] Home shows CURRENT WEBSITE, today's actual browsing time and a **visible** per-website ranking. No fake analytics.
- [ ] Date selector changes the ranked site list and both charts.
- [ ] Relative site bars match recorded durations.
- [ ] Site dark mode is available at the top of the popup and from Home.
- [ ] A new user sees a meaningful empty state if tracking has no history.
- [ ] Optional sync settings have matching emerald styling.

### Functional regression
- [ ] Smart Focus start/pause/resume/override/finish and regular blocking behave as before.
- [ ] Pomodoro, Daily Goals, tasks, notes, Insights, coding reports, exports/restores all still work.
- [ ] Website Profiles and video speed still work on supported pages.
- [ ] Site-level dark-mode and global dark-mode controls still work.
- [ ] No new permissions, storage schemas or host integrations were introduced by Design 01.
- [ ] Verify extension privacy and permission descriptions remain accurate.

### Marketing page
- [ ] Open \`docs/index.html\` locally and test at desktop and narrow mobile widths.
- [ ] Verify installation and GitHub links point to existing sources.
- [ ] Existing screenshot correctly states it predates this redesign.
- [ ] Capture a new genuine screenshot from the running extension **after** browser verification, then replace the old image in README and landing page.
- [ ] Decide where to host the landing page and explicitly approve any deployment; none occurs in this PR.

## How to verify

\`\`\`bash
npm ci
npm run check:extension
npm test
npm run test:tracking
npm run test:design
\`\`\`

Those checks are static/integration tests and cannot prove Chrome popup rendering or browser UI behavior. Manual Chrome verification is required.
