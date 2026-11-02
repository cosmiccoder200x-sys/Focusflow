# FocusFlow

> A Chrome productivity workspace for understanding your browsing habits, reducing distractions, and building consistent deep-work routines.

![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/version-4.1.0-8BC34A)
![Platform](https://img.shields.io/badge/platform-Chrome%20desktop-4285F4)

FocusFlow brings screen-time tracking, website blocking, a Pomodoro timer, tasks, notes, video-speed controls, dark mode, and productivity insights into one browser extension.

---

## Contents

- [What you can do with FocusFlow](#what-you-can-do-with-focusflow)
- [Install FocusFlow](#install-focusflow)
- [Your first five minutes](#your-first-five-minutes)
- [How to use each workspace](#how-to-use-each-workspace)
- [Back up and restore your data](#back-up-and-restore-your-data)
- [Privacy and permissions](#privacy-and-permissions)
- [Troubleshooting](#troubleshooting)
- [For developers](#for-developers)
- [Roadmap](#roadmap)

## What you can do with FocusFlow

| Workspace | What it is for |
| --- | --- |
| **Home** | A minimal overview of your current browsing activity and quick controls |
| **Focus** | Pomodoro timer, tasks, and quick notes |
| **Tools** | Block distracting websites, adjust video speed, and enable website dark mode |
| **Insights** | Review activity, streaks, achievements, productivity score, coding activity, and reports |
| **Settings** | Manage preferences, export or restore data, and reset data |

## Install FocusFlow

FocusFlow is currently loaded in Chrome as an unpacked extension.

1. Download the repository: click **Code → Download ZIP** on GitHub, then extract it. Alternatively, clone it:
   ```bash
   git clone https://github.com/cosmiccoder200x-sys/Focusflow.git
   ```
2. Open Chrome and visit **[chrome://extensions](chrome://extensions)**.
3. Turn on **Developer mode** (top-right).
4. Select **Load unpacked**.
5. Choose the **`extension`** folder inside the extracted/cloned repository. Choose the folder that contains `manifest.json`, not the repository root.
6. Pin FocusFlow from Chrome's Extensions menu so it is easy to open.

Repository layout:

```text
Focusflow/
├── extension/       # Load this folder in Chrome
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── options.html
│   └── ...
├── api/              # Optional backend for sync
├── package.json
└── README.md
```

> **Note:** FocusFlow is a browser extension, not a standalone website. The extension's core local features do not require you to deploy the optional backend.

## Your first five minutes

1. **Open FocusFlow:** click the pinned FocusFlow icon in Chrome.
2. **Check Home:** get familiar with the overview and quick controls.
3. **Add a task:** open **Focus → Tasks**, enter one small task, and add it.
4. **Start a focus session:** open **Focus → Timer**, choose your study and break durations, then press **Start**.
5. **Review your activity:** after browsing or studying, visit **Insights → Activity** or **Insights → Reports**.
6. **Protect your data:** open **Settings** and create a JSON backup.

You can use the extension gradually. You do not need to configure every tool before starting.

## How to use each workspace

### 1. Home — your daily overview

- See the currently tracked website and today's tracked screen time.
- Use **Website dark mode** to toggle dark mode for the current website.
- Use the video-speed shortcuts when a supported video is open.
- Keep Home as your quick check-in; open the other workspaces when you need more detail.

**Tip:** Screen-time tracking follows the active browser tab. It measures time in the browser, not time spent working away from the computer.

### 2. Focus — timer, tasks, and notes

#### Pomodoro timer

1. Open **Focus → Timer**.
2. Set your study duration (default: 25 minutes) and break duration (default: 5 minutes).
3. Press **Set** if you changed either duration.
4. Press **Start** to begin.
5. Use **Reset** to restart the current timer.

The extension keeps Pomodoro session state and history in Chrome storage. A completed session can trigger a browser notification if Chrome notifications are allowed.

#### Tasks

1. Open **Focus → Tasks**.
2. Type a task into the input field.
3. Select **+ Add**.
4. Mark tasks complete as you finish them.

The task panel also displays the current task/blocking status. Follow the status shown in the extension; do not assume that adding a task alone starts a timed focus session.

#### Quick notes

Open **Focus → Notes**, type your note, and let it save automatically. Notes are stored locally in the extension.

### 3. Tools — control distracting websites and media

#### Website blocking

1. Open **Tools → Block**.
2. Enter a domain, for example `instagram.com`.
3. Select **+ Add**.
4. To stop blocking a site, remove it from the blocked-sites list.

Enter a domain rather than a full page URL. Blocking is applied by the extension's background service worker when Chrome reports navigation/tab activity.

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

You can also use the Home quick toggle for the current website. Some websites may render imperfectly with automatic dark-mode CSS; switch the site off or try another style if that happens.

#### Website Profiles (branch preview)

1. Open **Tools → Profiles**.
2. Enter a domain such as `youtube.com`, or select **Use current** while visiting the website.
3. Choose whether automatic profile rules are enabled.
4. Set a default playback speed for HTML5 video/audio players.
5. Optionally set a daily time limit in minutes. Use `0` for no limit.
6. Choose whether dark mode follows the global setting or is always on/off for that domain.
7. Select **Save website profile**. Use **Edit** or **Remove** to manage saved profiles.

Profiles match the saved domain and its subdomains. Daily limits use FocusFlow's existing per-site screen-time totals; when a limit is reached, the website is redirected to FocusFlow's blocked page. Browser-internal pages cannot be controlled. Profiles are stored locally in Chrome and are included in JSON backup/export files.


### 4. Insights — understand your habits

Open **Insights** and choose the panel you want:

- **Activity:** yearly activity heatmap, current/longest streak, and productive days.
- **Score:** daily productivity score and its contributing factors.
- **Badges:** achievements earned from tracked activity.
- **Coding:** time on supported coding platforms and platform breakdown.
- **Reports:** weekly summary and export options.

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
| `notifications` | Notify you about timer completion |
| `scripting` | Apply supported website styles and media controls |
| `activeTab` | Interact with the active tab when you use extension tools |
| `host_permissions: <all_urls>` | Enable supported controls on websites you choose to use them on |

Core extension data is stored using Chrome extension storage. Optional sync requires configuring your own backend. Review the code and backend configuration before enabling any network sync.

## Troubleshooting

| Problem | Try this |
| --- | --- |
| FocusFlow does not appear after installation | Confirm Developer mode is enabled and that you loaded the `extension/` folder containing `manifest.json`. |
| A feature does not respond | Open `chrome://extensions`, find FocusFlow, and inspect **Errors**. Then use the extension's reload button. |
| A blocked website still opens | Check that its domain is in **Tools → Block**, then reload the tab. Restricted browser pages cannot be controlled by extensions. |
| Dark mode looks incorrect | Turn off the current-site override or choose another dark-mode style. |
| Video speed does not change | Confirm the page uses a supported HTML5 media player, then try **Apply to Page** again. |
| No activity appears in Insights | Keep a website active in a normal browser tab and check again after some usage has been recorded. |
| Restore does not accept a file | Use a valid FocusFlow JSON backup created by the extension. |

## For developers

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

## Roadmap

### FocusFlow 2.0 — in development

The next productivity upgrade is being developed separately and is intended to connect:

- **Smart Focus Mode:** 25-, 50-, 90-minute, and custom sessions, session-aware site blocking, pause/resume, and an emergency override.
- **Daily Goals:** daily focus-time and task targets, progress indicators, and streak history.
- **Website Profiles:** an initial implementation is available on this feature branch: per-site playback speed, daily time limits, dark-mode overrides, and enable/disable controls. It still needs browser-level regression testing before release.

Smart Focus Mode and Daily Goals remain planned. Website Profiles are a branch preview only; do not treat them as released until the pull request is reviewed, tested, and merged.

---

## Contributing

Issues, bug reports, and focused pull requests are welcome. Please include:

- Chrome version and operating system
- Steps to reproduce the issue
- Expected behaviour and actual behaviour
- Relevant console or extension errors (remove private data first)

## License

MIT — see [LICENSE](LICENSE) if present in this repository.
