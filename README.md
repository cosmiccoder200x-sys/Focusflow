# FocusFlow — Productivity Suite

> A minimal Chrome productivity workspace for screen-time tracking, distraction blocking, deep work, and useful insights.

![Version](https://img.shields.io/badge/version-4.0-gold)
![Manifest](https://img.shields.io/badge/manifest-v3-blue)
![Platform](https://img.shields.io/badge/platform-Chrome-green)

---

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the **`extension/` folder** (the folder that directly contains `manifest.json`).

Do not select the repository root or an archived folder.

```text
Focusflow/
├── extension/          ← Load this folder in Chrome
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── options.html
│   ├── options.js
│   ├── blocked.html
│   ├── blocked.css
│   ├── blocked.js
│   ├── syncManager.js
│   ├── sync-service.js
│   └── icon.png
├── api/                ← Vercel backend
├── package.json
└── README.md
```

---

## Features

| Workspace | Features |
|-----|---------|
| Home | Live site tracking, daily overview and time breakdown |
| Focus | Pomodoro, task list, quick notes and task-aware blocking |
| Tools | Website blocking, video speed control and website dark mode |
| Insights | Activity heatmap, streaks, badges, productivity score, coding dashboard and reports |
| Settings | Themes, backup, restore, reset and RangOS sync configuration |

## Workspace navigation

FocusFlow groups its tools into five workspaces: **Home**, **Focus**, **Tools**, **Insights**, and **Settings**. The redesign keeps the existing feature panels and local storage model so existing user data remains in place.

## Dark Mode

- Global and per-site controls
- Smart, Invert, Dim, and Grayscale styles
- Intensity control
- Persistent preferences across sessions

## Video Speed

Adjust HTML5 video and audio playback speed using presets or the slider, including on YouTube.

## Coding Dashboard

Tracks time on coding platforms such as LeetCode, Codeforces, CodeChef, HackerRank, GitHub, and GeeksforGeeks.

## RangOS Sync

The repository also contains a Vercel API backend under `api/`. See [SETUP.md](SETUP.md) for backend configuration.

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Track active tab URL |
| `storage` | Save data locally |
| `alarms` | Tracking and Pomodoro timers |
| `notifications` | Pomodoro completion alerts |
| `scripting` | Dark-mode CSS injection and video speed |
| `activeTab` | Access the current tab |
| `host_permissions: <all_urls>` | Site tools across websites |

## License

MIT — Built for engineering students and professionals.
