#  FocusFlow — Productivity Suite

> A minimal Chrome productivity workspace for screen-time tracking, distraction blocking, deep work, and useful insights.

![Version](https://img.shields.io/badge/version-4.0-gold)
![Manifest](https://img.shields.io/badge/manifest-v3-blue)
![Platform](https://img.shields.io/badge/platform-Chrome-green)

---

## 📦 Installation

```bash
# Option 1 — Load Unpacked (Developer Mode)
1. Download & extract the zip
2. Go to chrome://extensions
3. Enable Developer Mode (top right)
4. Click "Load Unpacked"
5. Select the extracted folder (containing manifest.json)

# Option 2 — Clone repo
git clone https://github.com/yourusername/focusflow.git
# Then load unpacked from the cloned folder
```

---

## ✨ Features

| Workspace | Features |
|-----|---------|
| Home | Live site tracking, daily overview and time breakdown |
| Focus | Pomodoro, task list, quick notes and task-aware blocking |
| Tools | Website blocking, video speed control and website dark mode |
| Insights | Activity heatmap, streaks, badges, productivity score, coding dashboard and reports |
| Settings | Themes, backup, restore, reset and RangOS sync configuration |









---

## 🧭 Workspace navigation

FocusFlow groups its existing tools into five workspaces: **Home**, **Focus**, **Tools**, **Insights**, and **Settings**. The redesign keeps the original feature panels and local storage model so existing user data remains in place.

## 🌙 Dark Mode

Force dark mode on any website using CSS injection.

- **Global toggle** — enables dark mode on all sites at once
- **Per-site toggle** — override for the current site only
- **3 styles:** Invert · Dim · Grayscale
- **Intensity slider** — fine-tune the effect
- Persists across sessions

---

## 💻 Coding Dashboard

Tracks time on:

`leetcode.com` · `codeforces.com` · `codechef.com` · `hackerrank.com` · `github.com` · `geeksforgeeks.org`

---

## 🏆 Achievements

| Badge | Requirement |
|-------|-------------|
| 🎯 First Focus | Complete first Pomodoro session |
| 🔥 7 Day Streak | 7 consecutive productive days |
| ⚡ 30 Day Streak | 30 consecutive productive days |
| 💯 100 Hours | 100 hours of total focus time |
| ✅ 500 Tasks | Complete 500 tasks |
| 🍅 Pomo Master | 50 Pomodoro study sessions |
| 🧠 Deep Work | One 4-hour focus day |
| ⚔️ Coding Warrior | 20 hours on coding platforms |

---

## 🗂 File Structure

```
focusflow/
├── manifest.json       # Extension config (MV3)
├── background.js       # Service worker — tracking, blocking, alarms
├── popup.html          # Five-workspace popup interface
├── popup.css           # Minimal design system and theme variants
├── popup.js            # Existing feature logic and workspace navigation
├── syncManager.js      # HabitOS integration architecture
├── blocked.html        # Blocked site page
├── blocked.css         # Matrix rain styles
├── blocked.js          # Matrix rain animation
└── icon.png            # Extension icon
```

---

## 🔮 RangOS Sync

FocusFlow syncs your daily screen-time data to your Notion "RangOS — Screen Time" database automatically.

```
FocusFlow Extension → Chrome Storage → sync-service.js → Vercel API → Notion → RangOS
```

- **Every 15 minutes** — periodic sync of today's data
- **Daily at 23:58** — end-of-day final sync
- **Manual sync** — via the extension options page
- **Secure** — shared secret authentication, Notion token never leaves the server

See [SETUP.md](SETUP.md) for full deployment and configuration instructions.

---

## 🛠 Permissions

| Permission | Why |
|------------|-----|
| `tabs` | Track active tab URL |
| `storage` | Save all data locally |
| `alarms` | 1-second tick + Pomodoro timer + RangOS sync |
| `notifications` | Pomodoro completion alerts |
| `scripting` | Dark mode CSS injection + video speed |
| `activeTab` | Read current tab |
| `host_permissions: <all_urls>` | Dark mode + blocking on all sites |

---

## 📄 License

MIT — Built for engineering students & professionals.

