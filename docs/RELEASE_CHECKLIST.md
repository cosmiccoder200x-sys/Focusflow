# Release readiness — not yet a published release

## Automated/static checks

- [ ] `npm ci` succeeds with Node.js 18+.
- [ ] `npm run check:extension` succeeds (manifest, referenced entrypoints and JS syntax).
- [ ] `npm test` succeeds (optional backend).
- [ ] `python3 scripts/package_extension.py` produces a ZIP and validates required paths.
- [ ] Inspect package contents for secrets, backup files, user data, unwanted artifacts and version mismatch.

## Manual Chrome checks (required; static checks are not browser tests)

- [ ] Load `extension/` in a clean Chrome desktop profile.
- [ ] Open popup, navigate all workspaces, and inspect for runtime errors.
- [ ] Validate block/unblock navigation and blocked page in real tabs.
- [ ] Validate timer start/pause/reset, state after popup close and notification behavior.
- [ ] Validate tasks, notes, insights and export/restore with disposable test data.
- [ ] Validate Smart Focus and Website Profiles (if advertised) including override, allowance and persistence.
- [ ] Validate video-speed and per-site dark mode on representative permitted pages.
- [ ] Check keyboard accessibility, contrast and narrow popup layouts.
- [ ] Verify network requests, permissions and optional sync opt-in against published privacy wording.
- [ ] Capture genuine screenshots and a demo, with private data removed.

## Publishing gate

Only after every applicable check is evidenced: draft release notes, confirm licensing/asset rights, and propose a GitHub release or Web Store listing for explicit approval. **This branch must not publish anything.**
