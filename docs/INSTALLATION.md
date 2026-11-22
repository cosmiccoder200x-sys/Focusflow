# Install FocusFlow (Chrome desktop)

> FocusFlow v4.1.1 is available as an unpacked extension for desktop Chrome.

1. [Download the v4.1.1 source ZIP](https://github.com/cosmiccoder200x-sys/Focusflow/archive/refs/heads/feat/focusflow-emerald-dashboard.zip) and extract it.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the extracted repository's **extension/** folder containing `manifest.json`.
6. Pin FocusFlow from Chrome's Extensions menu.

**Why these permissions?** FocusFlow uses tabs, storage, scripting, alarms, notifications and access to websites for tracking and page controls. Read [privacy information](PRIVACY.md) before enabling optional sync.

**First steps:** Open FocusFlow from a regular website to try tracking and quick controls. See the [five-minute guide](../README.md#your-first-five-minutes) for timers, site blocking, and the expanded dashboard.

**Updates:** Create a JSON backup in FocusFlow Settings, copy the updated files into your existing unpacked extension folder, and click **Reload** at `chrome://extensions`.

**Troubleshooting:** If Chrome reports an error, verify the selected folder contains `manifest.json`; reload at `chrome://extensions` and inspect its Errors panel.
