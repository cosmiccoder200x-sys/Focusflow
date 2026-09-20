// ===== FocusFlow — Backend API Tests =====
// Tests for api/screen-time.js (run with: node api/__tests__/screen-time.test.js)
// Mocks the Notion client and simulates HTTP requests.

const assert = require("assert");

// ---- Mock Notion Client ----
let mockQueryResult = [];
let mockCreatedPage = null;
let mockUpdatedPage = null;
let notionCallLog = [];

const mockNotion = {
  databases: {
    query: async (args) => {
      notionCallLog.push({ method: "query", args });
      return { results: mockQueryResult };
    },
  },
  pages: {
    create: async (args) => {
      notionCallLog.push({ method: "create", args });
      mockCreatedPage = args;
      return { id: "new-page-id-123" };
    },
    update: async (args) => {
      notionCallLog.push({ method: "update", args });
      mockUpdatedPage = args;
      return { id: args.page_id };
    },
  },
};

// Mock @notionhq/client
const originalRequire = module.constructor.prototype.require;
module.constructor.prototype.require = function (id) {
  if (id === "@notionhq/client") {
    return { Client: function () { return mockNotion; } };
  }
  return originalRequire.apply(this, arguments);
};

// Set env vars for tests
process.env.NOTION_TOKEN = "test-notion-token";
process.env.FOCUSFLOW_SYNC_KEY = "test-sync-key-123";

const handler = require("../screen-time.js");

// ---- Mock req/res ----
function mockReq(method, headers = {}, body = null) {
  return {
    method,
    headers: { "content-type": "application/json", ...headers },
    body,
  };
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    _ended: false,
    status(code) { res._status = code; return res; },
    json(data) { res._json = data; return res; },
    writeHead(code, headers) { res._status = code; res._headers = headers; },
    end() { res._ended = true; },
  };
  return res;
}

// ---- Test helpers ----
function resetMocks() {
  mockQueryResult = [];
  mockCreatedPage = null;
  mockUpdatedPage = null;
  notionCallLog = [];
}

const VALID_PAYLOAD = {
  date: "2026-09-20",
  total_minutes: 402,
  productive_minutes: 258,
  distracting_minutes: 144,
  productivity_percent: 64,
  sessions: 31,
  top_sites: [
    { domain: "github.com", minutes: 86 },
    { domain: "youtube.com", minutes: 72 },
  ],
};

// ---- Tests ----
let passed = 0;
let failed = 0;

async function test(name, fn) {
  resetMocks();
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

(async () => {
  console.log("\n📋 api/screen-time.js — Test Suite\n");

  // ---- OPTIONS (CORS) ----
  await test("OPTIONS returns 204 with CORS headers", async () => {
    const req = mockReq("OPTIONS");
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 204);
    assert.ok(res._ended);
  });

  // ---- Method not allowed ----
  await test("GET returns 405", async () => {
    const req = mockReq("GET");
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 405);
  });

  // ---- Missing key ----
  await test("POST without key returns 401", async () => {
    const req = mockReq("POST", {}, VALID_PAYLOAD);
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 401);
    assert.ok(res._json.error.includes("Missing"));
  });

  // ---- Invalid key ----
  await test("POST with invalid key returns 401", async () => {
    const req = mockReq("POST", { "x-focusflow-key": "wrong-key" }, VALID_PAYLOAD);
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 401);
    assert.ok(res._json.error.includes("Invalid"));
  });

  // ---- Invalid payload: missing date ----
  await test("POST with missing date returns 400", async () => {
    const req = mockReq("POST", { "x-focusflow-key": "test-sync-key-123" }, { total_minutes: 100 });
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- Invalid payload: bad date format ----
  await test("POST with bad date format returns 400", async () => {
    const payload = { ...VALID_PAYLOAD, date: "09-20-2026" };
    const req = mockReq("POST", { "x-focusflow-key": "test-sync-key-123" }, payload);
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 400);
  });

  // ---- Valid POST — create (new page) ----
  await test("POST valid payload creates a new page when none exists", async () => {
    mockQueryResult = []; // no existing page
    const req = mockReq("POST", { "x-focusflow-key": "test-sync-key-123" }, VALID_PAYLOAD);
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.action, "created");
    assert.strictEqual(res._json.page_id, "new-page-id-123");
    assert.ok(mockCreatedPage);
  });

  // ---- Valid POST — update (existing page) ----
  await test("POST valid payload updates existing page (upsert)", async () => {
    mockQueryResult = [{ id: "existing-page-456" }]; // existing page
    const req = mockReq("POST", { "x-focusflow-key": "test-sync-key-123" }, VALID_PAYLOAD);
    const res = mockRes();
    await handler(req, res);
    assert.strictEqual(res._status, 200);
    assert.strictEqual(res._json.action, "updated");
    assert.strictEqual(res._json.page_id, "existing-page-456");
    assert.ok(mockUpdatedPage);
  });

  // ---- Summary ----
  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${passed + failed} total\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
