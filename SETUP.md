# FocusFlow → RangOS Sync — Setup Guide

## Architecture

```
FocusFlow Chrome Extension
       ↓
  Chrome Storage (timeData, siteCategories)
       ↓
  sync-service.js (service worker)
       ↓ HTTPS POST + X-FocusFlow-Key
  Vercel Serverless API (/api/screen-time)
       ↓ @notionhq/client
  Notion API
       ↓
  RangOS — Screen Time database
```

FocusFlow tracks your browsing time locally. Every **15 minutes** and at **23:58 daily**, the sync service sends a summary to a secure Vercel backend, which authenticates the request and upserts a daily record in your Notion "RangOS — Screen Time" database.

**Security model:** The Notion API token never leaves the server. The extension and backend share a secret key (`FOCUSFLOW_SYNC_KEY`) for authentication.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Vercel](https://vercel.com/) account (free tier works)
- A [Notion](https://www.notion.so/) workspace with the "RangOS — Screen Time" database
- Google Chrome (for the extension)

---

## Step 1 — Notion Integration

1. Go to [My Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it (e.g., `FocusFlow Sync`)
4. Select your workspace
5. Copy the **Internal Integration Token** — this is your `NOTION_TOKEN`
6. Open the "RangOS — Screen Time" database in Notion
7. Click the **⋯** menu → **Connections** → **Connect to** → select your integration

> **Important:** The integration MUST be connected to the database or the API will return "object_not_found".

### Database Properties

Ensure your database has these properties (types in parentheses):

| Property | Type |
|----------|------|
| Date | Title |
| Day | Date |
| Total Screen Time (min) | Number |
| Productive (min) | Number |
| Distracting (min) | Number |
| Productivity % | Number |
| Sessions | Number |
| Top Site | Rich text |
| Top Sites | Rich text |
| Synced | Checkbox |
| Last Sync | Date |

---

## Step 2 — Generate a Sync Key

Generate a random secret for `FOCUSFLOW_SYNC_KEY`:

```bash
# Linux/macOS
openssl rand -hex 32

# PowerShell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })

# Or use any password generator — 32+ characters recommended
```

Keep this value — you'll need it for both Vercel and the extension.

---

## Step 3 — Deploy Backend to Vercel

### Option A — Via Vercel CLI

```bash
npm install -g vercel
cd Focusflow
vercel
```

When prompted:
- Link to a new project
- Select your account
- Use default settings

Then set environment variables:

```bash
vercel env add NOTION_TOKEN        # paste your Notion token
vercel env add FOCUSFLOW_SYNC_KEY  # paste your sync key
vercel --prod                      # deploy to production
```

### Option B — Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `Focusflow` repository from GitHub
3. Vercel will auto-detect the project
4. Go to **Settings → Environment Variables**
5. Add:
   - `NOTION_TOKEN` = your Notion integration token
   - `FOCUSFLOW_SYNC_KEY` = your generated sync key
6. Click **Deploy**

Your API endpoint will be:
```
https://YOUR-DOMAIN.vercel.app/api/screen-time
```

---

## Step 4 — Load the Chrome Extension

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **"Load unpacked"**
4. Select the `lockin-extension/` folder

The extension should load with no errors. Check for a service worker link — click it to see the console.

---

## Step 5 — Configure Sync in the Extension

1. Right-click the extension icon → **Options** (or go to `chrome://extensions` → FocusFlow → Details → Extension options)
2. Enter:
   - **Webhook Endpoint**: `https://YOUR-DOMAIN.vercel.app/api/screen-time`
   - **Sync Key**: the same `FOCUSFLOW_SYNC_KEY` you set on Vercel
3. Enable the **Automatic Sync** toggle
4. Click **Save**
5. Click **Test Sync** to verify the connection

If the test succeeds, you'll see a green "✓ Connection successful!" message.

---

## How Sync Works

### Automatic Sync
- **Every 15 minutes**: Sends current day's screen-time summary
- **Daily at 23:58**: Final sync before midnight

### Manual Sync
- Click **"Sync Now"** on the options page at any time

### Data Flow
1. `sync-service.js` reads `timeData` and `siteCategories` from Chrome storage
2. Calculates totals: productive (coding/docs/study), distracting (entertainment/social)
3. POSTs a JSON payload to your Vercel endpoint
4. Backend validates the sync key
5. Backend queries Notion for an existing page with today's date
6. If found → updates the page; if not → creates a new one

### Session Count
The "Sessions" field uses a **proxy value**: the number of distinct domains tracked today. FocusFlow does not natively track individual browser sessions. This is clearly documented in the code and will be replaced with real session tracking when available.

---

## Troubleshooting

### "Connection failed" on test
- Check that the endpoint URL starts with `https://`
- Verify the Vercel deployment is live (visit the URL in a browser)
- Check Vercel function logs for errors

### "Authentication failed"
- The sync key in the extension must exactly match `FOCUSFLOW_SYNC_KEY` on Vercel
- Check for trailing whitespace when copying

### "Notion database not found"
- The Notion integration must be **connected to the database** (Step 1, item 7)
- Verify the database ID in `api/screen-time.js` matches your database

### "Server configuration error"
- `NOTION_TOKEN` or `FOCUSFLOW_SYNC_KEY` is not set in Vercel environment variables
- Redeploy after adding variables

### No data syncing
- Check that **Automatic Sync** is enabled in extension options
- Verify there is tracking data for today (use the extension popup to check)
- Open the service worker console (`chrome://extensions` → service worker link) for logs

### Duplicate entries in Notion
- This should not happen — the backend upserts by date title
- If it does, check that the "Date" property is a **Title** type in Notion

---

## Security Notes

- **NOTION_TOKEN** lives only in Vercel environment variables — never in the extension or client code
- **FOCUSFLOW_SYNC_KEY** is stored locally in Chrome storage and sent as an HTTP header — never committed to Git
- The `.gitignore` excludes `.env`, `.env.local`, and `.vercel/`
- The API validates every request and rejects unauthorized calls with HTTP 401
- CORS headers are configured to allow the extension to POST to the endpoint

---

## Files Overview

| File | Purpose |
|------|---------|
| `lockin-extension/sync-service.js` | Service worker — imports background.js + adds sync layer |
| `lockin-extension/options.html` | Sync settings UI |
| `lockin-extension/options.js` | Settings page logic |
| `lockin-extension/manifest.json` | Updated — v1.1.0, sync-service.js, options page |
| `api/screen-time.js` | Vercel serverless function — auth + Notion upsert |
| `api/__tests__/screen-time.test.js` | Backend test suite |
| `vercel.json` | Vercel configuration |
| `.env.example` | Environment variable template |
| `SETUP.md` | This file |
