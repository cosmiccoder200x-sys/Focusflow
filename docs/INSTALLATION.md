# Install FocusFlow (Chrome desktop)

> FocusFlow currently has no verified Chrome Web Store listing or published GitHub Release. Use the source-based installation below.

1. From the repository, select **Code → Download ZIP** and extract it, or use `git clone https://github.com/cosmiccoder200x-sys/Focusflow.git`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted repository's **extension/** folder containing `manifest.json`.
6. Pin FocusFlow from Chrome's Extensions menu.

**Why these permissions?** FocusFlow uses tabs, storage, scripting, alarms, notifications and access to websites for tracking and page controls. Read [privacy information](PRIVACY.md) before enabling optional sync.

**First steps:** Open FocusFlow, review Home, add a task, try a timer, then check Insights after browsing. Data displays may be empty on a new profile.

**Updates:** Pull/download an updated source tree and reload the unpacked extension. Back up data through Settings before major updates.

**Troubleshooting:** If Chrome reports an error, verify the selected folder contains `manifest.json`; reload at `chrome://extensions` and inspect its Errors panel.

No installer or store listing is claimed here.
