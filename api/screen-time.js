// ===== FocusFlow → RangOS — api/screen-time.js =====
// Vercel serverless function: receives screen-time data from FocusFlow,
// authenticates via shared secret, and upserts into Notion "RangOS — Screen Time" database.

const { Client } = require("@notionhq/client");

// ---- Constants ----
const DATABASE_ID = "d9f2d6aa-6f27-4ed3-82d0-60b1ada3320e";

// ---- CORS headers ----
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-FocusFlow-Key",
};

// ---- Validate environment ----
function checkEnv() {
  if (!process.env.NOTION_TOKEN) {
    return { ok: false, error: "NOTION_TOKEN not configured" };
  }
  if (!process.env.FOCUSFLOW_SYNC_KEY) {
    return { ok: false, error: "FOCUSFLOW_SYNC_KEY not configured" };
  }
  return { ok: true };
}

// ---- Validate payload ----
function validatePayload(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }

  const { date, total_minutes, productive_minutes, distracting_minutes, productivity_percent } = body;

  if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, error: "Invalid or missing 'date' (expected YYYY-MM-DD)" };
  }

  // Validate date is a real date
  const parsed = new Date(date + "T00:00:00");
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date value" };
  }

  if (typeof total_minutes !== "number" || total_minutes < 0) {
    return { ok: false, error: "Invalid or missing 'total_minutes'" };
  }
  if (typeof productive_minutes !== "number" || productive_minutes < 0) {
    return { ok: false, error: "Invalid or missing 'productive_minutes'" };
  }
  if (typeof distracting_minutes !== "number" || distracting_minutes < 0) {
    return { ok: false, error: "Invalid or missing 'distracting_minutes'" };
  }
  if (typeof productivity_percent !== "number" || productivity_percent < 0 || productivity_percent > 100) {
    return { ok: false, error: "Invalid or missing 'productivity_percent' (0-100)" };
  }

  return { ok: true };
}

// ---- Find existing page by date title ----
async function findPageByDate(notion, date) {
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: "Date",
      title: {
        equals: date,
      },
    },
    page_size: 1,
  });
  return response.results.length > 0 ? response.results[0] : null;
}

// ---- Build Notion properties from payload ----
function buildProperties(body) {
  const topSitesText = (body.top_sites || [])
    .map((s) => `${s.domain}: ${s.minutes}m`)
    .join(", ");

  const topSite = body.top_sites && body.top_sites.length > 0
    ? `${body.top_sites[0].domain} (${body.top_sites[0].minutes}m)`
    : "—";

  return {
    // "Date" is a title property
    Date: {
      title: [{ text: { content: body.date } }],
    },
    // "Day" is a date property
    Day: {
      date: { start: body.date },
    },
    // Number properties
    "Total Screen Time (min)": { number: body.total_minutes },
    "Productive (min)": { number: body.productive_minutes },
    "Distracting (min)": { number: body.distracting_minutes },
    "Productivity %": { number: body.productivity_percent },
    Sessions: { number: body.sessions || 0 },
    // Rich text properties
    "Top Site": {
      rich_text: [{ text: { content: topSite } }],
    },
    "Top Sites": {
      rich_text: [{ text: { content: topSitesText || "—" } }],
    },
    // Checkbox
    Synced: { checkbox: true },
    // Date property for last sync timestamp
    "Last Sync": {
      date: { start: new Date().toISOString() },
    },
  };
}

// ---- Main handler ----
module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Only accept POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Check environment variables
  const envCheck = checkEnv();
  if (!envCheck.ok) {
    console.error("Environment error:", envCheck.error);
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Authenticate
  const syncKey = req.headers["x-focusflow-key"];
  if (!syncKey) {
    return res.status(401).json({ error: "Missing X-FocusFlow-Key header" });
  }
  if (syncKey !== process.env.FOCUSFLOW_SYNC_KEY) {
    return res.status(401).json({ error: "Invalid sync key" });
  }

  // Parse body
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  // Validate payload
  const validation = validatePayload(body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  // Initialize Notion client
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  try {
    // Upsert: find existing page for this date, then update or create
    const existingPage = await findPageByDate(notion, body.date);
    const properties = buildProperties(body);

    if (existingPage) {
      // UPDATE existing page
      await notion.pages.update({
        page_id: existingPage.id,
        properties,
      });
      return res.status(200).json({
        ok: true,
        action: "updated",
        date: body.date,
        page_id: existingPage.id,
      });
    } else {
      // CREATE new page
      const newPage = await notion.pages.create({
        parent: { database_id: DATABASE_ID },
        properties,
      });
      return res.status(200).json({
        ok: true,
        action: "created",
        date: body.date,
        page_id: newPage.id,
      });
    }
  } catch (err) {
    console.error("Notion API error:", err.message || err);
    // Return a useful error without leaking internal details
    const status = err.status || 500;
    const message =
      err.code === "unauthorized"
        ? "Notion integration not authorized. Check NOTION_TOKEN and database access."
        : err.code === "object_not_found"
        ? "Notion database not found. Check database ID and integration access."
        : "Failed to sync to Notion";
    return res.status(status >= 400 ? status : 500).json({ error: message });
  }
};
