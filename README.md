# FocusFlow — Take Back Your Attention

**One Chrome workspace for fewer distractions and more intentional work.**

FocusFlow is an open-source Chrome productivity extension combining website blocking, browsing-time tracking, Pomodoro sessions, tasks, notes, video-speed controls, website dark mode, and activity insights.
<img width="466" height="742" alt="image" src="https://github.com/user-attachments/assets/c19bc30e-cefa-43db-ae64-243b23a18bdc" />



**[Download FocusFlow v4.1.1 source ZIP](https://github.com/cosmiccoder200x-sys/Focusflow/archive/7fec9e8624e020fd9f9c021984cd027ac998447d.zip)** · [Install in Chrome](#install-focusflow) · [Learn the controls](#your-first-five-minutes) · [Privacy](docs/PRIVACY.md)

FocusFlow v4.1.1 is available as an unpacked extension for desktop Chrome. The source ZIP includes everything needed for local use. Setup takes a few minutes and requires no account, backend, or API key.

## What you can do with FocusFlow

| Workspace | What it is for |
| --- | --- |
| **Dashboard** | A minimal overview of your current browsing activity and quick controls |
| **Focus** | Smart Focus sessions, daily goals, Pomodoro timer, tasks, and quick notes |
| **Tools** | Block distracting websites, adjust video speed, and enable website dark mode |
| **Analytics** | Review activity, streaks, achievements, productivity score, coding activity, and reports |
| **Settings** | Manage preferences, export or restore data, and reset data |




## Install FocusFlow

1. [Download the v4.1.1 source ZIP](https://github.com/cosmiccoder200x-sys/Focusflow/archive/7fec9e8624e020fd9f9c021984cd027ac998447d.zip) and extract it.
2. In desktop Chrome, enter `chrome://extensions` in the address bar.
3. Turn on **Developer mode**, then click **Load unpacked**.
4. Open the extracted folder and select its **`extension/`** subfolder, which contains `manifest.json`.
5. From Chrome's Extensions menu, pin **FocusFlow** and click its toolbar icon.

To update an existing unpacked installation, back up your data in **Settings**, copy the new extension files into the same loaded folder, and click **Reload** at `chrome://extensions`. [More installation help](docs/INSTALLATION.md)

## Your first five minutes

1. **Track a site.** Visit a regular website and browse in the active tab. Open FocusFlow and scroll to **Today’s Website Usage**. A new install starts at zero, and browser settings pages such as `chrome://extensions` are outside tracking.
2. **Count study time.** Click **Other** beside a tracked site to classify it as **Study**. **Focused time** is time on Study sites. **Focus rate** is the Study share of today’s tracked browsing time.
3. **Start a timer.** Choose **Pomodoro**, **Short Break**, or **Long Break**, then press **▶**. The same button pauses or resumes the timer. **↻** resets it, and **⏭** skips the phase. The **Focus** button opens Smart Focus for sessions with temporary blocking.
4. **Manage distractions.** Click **Website Blocking** to add or remove domains. The default list includes sites such as Instagram and Reddit. Remove any defaults you want to use.
5. **Open the full dashboard.** Click the expand icon in the top-right corner to open a tab. On a wide window it displays the sidebar. For **Website dark mode** or **Video playback speed**, open FocusFlow while the website you want to control is active.

## How to use each workspace

### 1. Dashboard

- See the currently tracked website and today's tracked screen time.
- Use **Website dark mode** to toggle dark mode for the current website.
- Use the **Video playback speed** dropdown when a supported video is open.
- Use the date picker under **Website Usage** to review recent days.

**Tip:** Screen-time tracking follows the active browser tab. It measures time in the browser, not time spent working away from the computer.

### 2. Focus — timer, tasks, and notes

#### Pomodoro timer

1. Open **Focus → Timer**.
2. Set your study duration (default: 25 minutes) and break duration (default: 5 minutes).
3. Press **Set** if you changed either duration.
4. Press **Start** to begin.
5. Use **Reset** to return to the configured study duration.

The extension keeps Pomodoro session state and history in Chrome storage. A completed session can trigger a browser notification if Chrome notifications are allowed.

#### Smart Focus

1. Open **Focus → Smart Focus**.
2. Choose **25 min**, **50 min**, **90 min**, or **Custom**.
3. Edit the distraction list and the sites that should always be allowed during the session. Separate domains with commas.
4. Select **Start focus**. FocusFlow applies the session's temporary block and allow rules while the countdown runs.
5. Use **Pause** to pause the countdown and temporarily suspend Smart Focus blocking. Select **Resume** to reactivate both.
6. Use **Emergency override · 5 minutes** when you need a short exception. The session timer continues, and blocking automatically resumes when the override expires.
7. Select **End session** to stop early and save actual focused time. Completed and ended sessions appear under Recent Focus Sessions.

Smart Focus rules are additive: they do not overwrite your regular blocked-sites list or Website Profiles. The session's allow list takes priority over blocked-site rules while the session is running. Paused sessions do not apply Smart Focus rules. Session state and history are stored locally and included in JSON backup/restore.


#### Daily Goals

1. Open **Focus → Daily Goals**.
2. Set a daily focus-time target (15–720 minutes) and a task-completion target (1–30 tasks).
3. Select **Save daily targets**. Progress rings update as study time is tracked and tasks are completed.
4. Review the current streak, best streak, completed-day count, and seven-day strip.

Focus time is calculated from websites classified as **Study** in **Website Usage**. Task progress counts tasks marked complete after Daily Goals is installed; earlier task completions are not backfilled. Daily goal settings and task-completion history are included in JSON backup/restore. A day counts toward a streak when both targets are met.

#### Tasks

1. Open **Focus → Tasks**.
2. Type a task into the input field.
3. Select **+ Add**.
4. Mark tasks complete as you finish them.

Completing tasks contributes to your daily task goal. Manage your regular block list from **Website Blocking**.

#### Quick notes

Open **Focus → Notes**, type your note, and let it save automatically. Notes are stored locally in the extension.

### 3. Tools — control distracting websites and media

#### Website blocking

1. Open **Tools → Block list**.
2. Enter a domain, for example `instagram.com`.
3. Select **Add site**.
4. To stop blocking a site, remove it from the blocked-sites list.

FocusFlow applies its block list during tab activity. Reload the website to check a new rule.

#### Video speed

1. Open **Tools → Speed**.
2. Choose a preset or move the slider.
3. Select **Apply to Page**.

The speed control works with supported HTML5 video/audio players. Some websites use custom players or restrict script access, so compatibility can vary.

#### Website dark mode

1. Open **Tools → Dark mode**.
2. Turn on **Global Dark Mode** to enable it across supported websites, or use the **Current Site** switch for a site-specific override.
3. Choose **Smart**, **Invert**, **Dim**, or **Grayscale**.
4. Adjust intensity if needed.

You can also use the Dashboard quick toggle for the current website. Some websites may render imperfectly with automatic dark-mode CSS; switch the site off or try another style if that happens.

#### Website Profiles

1. Open **Tools → Profiles**.
2. Enter a domain such as `youtube.com`, or select **Use current** while visiting the website.
3. Choose whether automatic profile rules are enabled.
4. Set a default playback speed for HTML5 video/audio players.
5. Optionally set a daily time limit in minutes. Use `0` for no limit.
6. Choose whether dark mode follows the global setting or is always on/off for that domain.
7. Select **Save website profile**. Use **Edit** or **Remove** to manage saved profiles.

Profiles match the saved domain and its subdomains. Daily limits use FocusFlow's existing per-site screen-time totals; when a limit is reached, the website is redirected to FocusFlow's blocked page. Browser-internal pages cannot be controlled. Profiles are stored locally in Chrome and are included in JSON backup/export files.


### 4. Analytics

Open **Analytics** and choose the panel you want:

- **Activity:** yearly activity heatmap, current/longest streak, and productive days.
- **Score:** daily productivity score and its contributing factors.
- **Badges:** achievements earned from tracked activity.
- **Coding:** time on supported coding platforms and platform breakdown.
- **Reports:** weekly summary and export options.
- **Smart Insights:** local analysis of study-time trends, focus share, top distractions, Smart Focus sessions, and practical suggestions.

#### Smart Insights

1. Open **Analytics → Smart Insights**.
2. Review your seven-day study time, focus share, week-over-week trend, and best study day.
3. Check the top non-study sites and recent Smart Focus session completion rate.
4. Use the suggestions as small experiments—not as a score or judgment.

Smart Insights runs locally using tracked browsing time, your Study/other site categories, and Smart Focus session history. It compares the latest seven days with the previous seven days. It does not upload browsing history or infer activity outside the extension's tracking data.

Insights depend on the activity FocusFlow has collected since installation. Empty or incomplete charts are normal when you are just getting started.

### 5. Settings — manage your data

- **Backup Data (JSON):** download a backup of supported extension data.
- **Restore Data:** select a FocusFlow JSON backup to restore its supported data keys.
- **Export All Data (JSON/CSV):** download data for your own records or analysis.
- **Reset Statistics:** remove tracking statistics and related history.
- **Reset ALL Data:** clear all extension storage.

**Important:** Reset actions are destructive. Create a backup first. Restoring a backup writes the included data into extension storage; reload the extension if it asks you to.

#### Optional RangOS sync

The repository includes an optional backend integration. It is not required for normal local use. To configure it, open the extension's options page and provide your own backend endpoint and matching sync key. See [SETUP.md](SETUP.md) for deployment and environment configuration. Never publish your sync key or backend secrets in a public repository.

## Back up and restore your data

A simple safety routine:

1. Open **Settings → Backup Data (JSON)**.
2. Save the downloaded file somewhere safe.
3. Before moving to another computer or reinstalling the extension, make another backup.
4. On the destination installation, open **Settings → Restore Data** and select the backup file.

Chrome extension storage is associated with the browser profile. A local backup is the portable copy you control. Keep backups private because they may contain browsing activity, tasks, and notes.

## Privacy and permissions

FocusFlow requests these Chrome permissions to provide its features:

| Permission | Why it is needed |
| --- | --- |
| `tabs` | Identify the active tab and its website for tracking and site controls |
| `storage` | Save preferences, tasks, notes, timer state, and activity data |
| `alarms` | Run periodic tracking and timer events |
| `idle` | Pause website-time tracking when Chrome reports the user as idle or locked |
| `notifications` | Notify you about timer completion |
| `scripting` | Apply supported website styles and media controls |
| `activeTab` | Interact with the active tab when you use extension tools |
| `host_permissions: <all_urls>` | Enable supported controls on websites you choose to use them on |

Core extension data is stored using Chrome extension storage. Optional sync requires configuring your own backend. Review the code and backend configuration before enabling any network sync.

### How accurate is website time?

FocusFlow measures active tab time only while a Chrome window is focused and the browser reports active user state. It checkpoints actual elapsed seconds approximately every 30 seconds; intervals longer than 90 seconds without a reliable checkpoint are skipped rather than guessed. Chrome idle detection uses a 60-second threshold, so website time is approximate, **not an exact measure of attention**. Historical `timeData` remains intact. See [Privacy](docs/PRIVACY.md).

## Troubleshooting

| Problem | Try this |
| --- | --- |
| FocusFlow does not appear after installation | Confirm Developer mode is enabled and that you loaded the `extension/` folder containing `manifest.json`. |
| The popup appears as a thin strip | Check that FocusFlow shows **4.1.1** in `chrome://extensions`, then click **Reload** and reopen it. If the issue persists, include your Chrome version and a screenshot in a bug report. |
| A feature does not respond | Open `chrome://extensions`, find FocusFlow, and inspect **Errors**. Then use the extension's reload button. |
| A blocked website still opens | Check that its domain is in **Tools → Block list**, then reload the tab. Restricted browser pages cannot be controlled by extensions. |
| Dark mode looks incorrect | Turn off the current-site override or choose another dark-mode style. |
| Video speed does not change | Confirm the page uses a supported HTML5 media player, then try **Apply to Page** again. |
| No activity appears in Insights | Keep a website active in a normal browser tab and check again after some usage has been recorded. |
| Restore does not accept a file | Use a valid FocusFlow JSON backup created by the extension. |

## For developers

**Validation:** Run `npm ci` and `npm run check` for manifest, JavaScript, backend, tracking, and layout checks. For browser behavior, follow the [manual Chrome checks](docs/RELEASE_CHECKLIST.md). `python3 scripts/package_extension.py` creates a **local, unpublished** ZIP after static path validation. Root `package.json` version 1.1.0 belongs to the optional backend and does not override the version in `extension/manifest.json`.

### Project structure

- `extension/`: Chrome Manifest V3 extension (popup, background service worker, options, and page assets).
- `api/`: optional backend endpoints.
- `package.json`: backend/project scripts and dependencies.

### Run locally

1. Clone the repository.
2. Load `extension/` in Chrome using the installation steps above.
3. Make changes in the extension source.
4. Return to `chrome://extensions` and click **Reload** on FocusFlow to test changes.

For backend development and deployment, follow [SETUP.md](SETUP.md). Do not commit API keys, sync secrets, or personal backup files.

## Build status

The v4.1.1 download includes the emerald dashboard and the toolbar popup width fix. Install it using the source ZIP above. See the [release checklist](docs/RELEASE_CHECKLIST.md) for browser-level validation and distribution steps.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) before reporting or changing code. Issues, bug reports, and focused pull requests are welcome. Please include:

- Chrome version and operating system
- Steps to reproduce the issue
- Expected behaviour and actual behaviour
- Relevant console or extension errors (remove private data first)

## License

MIT — see [LICENSE](LICENSE). Please verify third-party assets and dependency licenses before redistribution.
