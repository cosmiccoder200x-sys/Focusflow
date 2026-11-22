# Security policy

## Reporting a vulnerability

Please do **not** publish exploits, tokens, browsing records or vulnerability details in a public issue.

Use GitHub's private vulnerability reporting feature if enabled for this repository. If unavailable, contact the maintainer through a private channel shown on their GitHub profile and request a safe reporting method before sharing sensitive details. Do not assume a dedicated security email exists.

## Scope

FocusFlow is a Chrome Manifest V3 extension with broad host permissions used for site controls. It stores core data in Chrome extension storage. Optional RangOS sync may transmit configured summaries to a user-chosen backend; it is not required for core local features.

Never commit Notion tokens, sync keys, extension storage exports, or personally identifying browsing data.
