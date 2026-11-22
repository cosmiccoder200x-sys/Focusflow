# Privacy and permissions

FocusFlow's Chrome Manifest V3 extension declares `activeTab`, `scripting`, `storage`, `tabs`, `alarms`, `notifications`, and `<all_urls>` host permissions. The broad host permission supports website-level controls, but it deserves careful scrutiny.

Core tracking data, settings, tasks and notes use extension storage according to the current project documentation. The optional RangOS integration is configured separately and can send data through a user-specified backend to Notion. Do not turn it on without reading [SETUP.md](../SETUP.md).

This document is a feature-level explanation, **not** a completed security, network-traffic or third-party privacy audit. Do not describe the product as never sending data or as independently certified. The extension cannot monitor browser-internal restricted pages and tracks browser activity rather than full-device screen time.

To control your data, use Settings to export a local backup or reset saved data. Exported files may contain sensitive browsing information: store them privately.
