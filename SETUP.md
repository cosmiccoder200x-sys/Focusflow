# FocusFlow → RangOS Sync — Setup Guide

## Architecture

```
FocusFlow Chrome Extension (extension/)
       ↓
  Chrome Storage (timeData, siteCategories)
       ↓ HTTPS POST + X-FocusFlow-Key
  Vercel Serverless API (/api/screen-time)
       ↓ @notionhq/client
  Notion API
       ↓
  RangOS — Screen Time database
```

FocusFlow tracks browsing time locally. The optional RangOS integration sends summaries to a secure Vercel backend, which authenticates requests and upserts daily records in Notion.

**Security model:** The Notion API token stays on the server. The extension and backend use a shared secret key (`FOCUSFLOW_SYNC_KEY`) for authentication.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Vercel](https://vercel.com/) account
- A [Notion](https://www.notion.so/) workspace and Screen Time database
- Google Chrome

## Backend setup

1. Configure the Notion integration and database permissions.
2. Set `NOTION_TOKEN` and `FOCUSFLOW_SYNC_KEY` as Vercel environment variables.
3. Deploy the repository's Vercel backend.
4. Use the deployed `/api/screen-time` endpoint when configuring a compatible sync client.

The Notion token must never be placed in extension source code or committed to Git.

## Load the Chrome Extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the repository's **`extension/` folder** — the folder containing `manifest.json`.

Do not select the repository root, `FocusFlow_v4_1_1`, or an archived copy.

## Repository layout

| Path | Purpose |
|------|---------|
| `extension/manifest.json` | Chrome Manifest V3 configuration |
| `extension/background.js` | Extension service worker |
| `extension/popup.html` / `popup.js` / `popup.css` | Main popup |
| `extension/options.html` / `options.js` | Extension settings |
| `extension/blocked.html` / `blocked.js` / `blocked.css` | Blocked-site page |
| `extension/syncManager.js` | Local data export/sync architecture |
| `extension/sync-service.js` | Optional sync service worker module |
| `api/screen-time.js` | Vercel serverless API |
| `api/__tests__/screen-time.test.js` | Backend tests |
| `vercel.json` | Vercel configuration |
| `SETUP.md` | This guide |
