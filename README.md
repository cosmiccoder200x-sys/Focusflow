#  FocusFlow — Productivity Suite

> Chrome extension — track sites, block distractions, Pomodoro timer, dark mode & coding dashboard.

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

| Tab | Feature |
|-----|---------|
| 📊 Track | Live site tracking, 7-day graph, Study/Waste toggle |
| 🚫 Block | Block distracting sites, auto-blocks while tasks pending |
| ⚡ Speed | Video speed controller (0.25x → 15x) |
| 🍅 Pomo | Pomodoro timer with background alarm |
| 📝 Notes | Auto-saving quick notes |
| ✅ Tasks | Task list with site-blocking integration |
| 🗓 Stats | GitHub-style 365-day heatmap + streaks |
| 🏆 Badges | 8 achievements with progress tracking |
| 🎯 Score | Daily productivity score (0–100) + category pie |
| 💻 Coding | Dashboard for LeetCode, GitHub, Codeforces & more |
| 📋 Report | Weekly report — export JSON / CSV |
| 🌙 Dark | Dark mode for any website, per-site control |
| ⚙️ Settings | Themes, backup, restore, reset |

---

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
├── popup.html          # Main UI (13 tabs)
├── popup.css           # Styles + 4 theme variants
├── popup.js            # All tab logic + dark mode injection
├── syncManager.js      # HabitOS integration architecture
├── blocked.html        # Blocked site page
├── blocked.css         # Matrix rain styles
├── blocked.js          # Matrix rain animation
└── icon.png            # Extension icon
```

---

## 🔮 HabitOS Sync (Coming Soon)

`syncManager.js` is prepared for future cloud sync with [HabitOS](https://github.com/yourusername/habitos).

```js
exportUserData()   // structured full export
importUserData()   // restore from payload
syncQueue()        // pending operations queue
preparePayload()   // HabitOS API-ready format
```

All data currently stays **100% local** via Chrome Storage API.

---

## 🛠 Permissions

| Permission | Why |
|------------|-----|
| `tabs` | Track active tab URL |
| `storage` | Save all data locally |
| `alarms` | 1-second tick + Pomodoro timer |
| `notifications` | Pomodoro completion alerts |
| `scripting` | Dark mode CSS injection + video speed |
| `activeTab` | Read current tab |
| `host_permissions: <all_urls>` | Dark mode + blocking on all sites |

---

## 📄 License

MIT — Built for engineering students & professionals.
