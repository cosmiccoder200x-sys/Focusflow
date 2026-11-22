/* Pure elapsed-time ledger. timeData remains { YYYY-MM-DD: { domain: seconds } }. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FocusFlowTrackingCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Alarm minimum is 30 seconds. Gaps beyond this bound are ambiguous
  // (Chrome closed, PC asleep, worker suspended), so never backfill them.
  const MAX_GAP_MS = 90000;
  function dayKey(timestamp) {
    const d = new Date(timestamp);
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
  }
  function splitByDay(from, until) {
    const result = [];
    for (let cursor = from; cursor < until;) {
      const date = new Date(cursor);
      const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()+1).getTime();
      const end = Math.min(until, nextDay);
      if (end <= cursor) break;
      result.push({ day: dayKey(cursor), seconds: (end-cursor)/1000 });
      cursor = end;
    }
    return result;
  }
  function validContext(context) {
    return Boolean(context && Number.isInteger(context.tabId) &&
      Number.isInteger(context.windowId) && typeof context.domain === "string" && context.domain.length);
  }
  function validSession(session) {
    return Boolean(session && session.version === 2 && validContext(session) &&
      Number.isFinite(session.lastAccountedAt) && Number.isFinite(session.start));
  }
  function sameContext(session, context) {
    return validSession(session) && validContext(context) &&
      session.tabId === context.tabId && session.windowId === context.windowId && session.domain === context.domain;
  }
  function reconcile(snapshot, context, now, autoCategories = {}, maxGapMs = MAX_GAP_MS) {
    if (!Number.isFinite(now)) throw new TypeError("Invalid timestamp");
    const original = snapshot || {};
    const session = validSession(original.activeTracking) ? original.activeTracking : null;
    const destination = validContext(context) ? context : null;
    const timeData = { ...(original.timeData || {}) };
    const siteCategories = { ...(original.siteCategories || {}) };
    let timeChanged = false, categoriesChanged = false, creditedSeconds = 0;
    if (session && now >= session.lastAccountedAt) {
      const gap = now - session.lastAccountedAt;
      if (gap > 0 && gap <= maxGapMs) {
        for (const part of splitByDay(session.lastAccountedAt, now)) {
          const row = { ...(timeData[part.day] || {}) };
          const prior = Math.max(0, Number(row[session.domain]) || 0);
          row[session.domain] = Math.round((prior + part.seconds) * 1000) / 1000;
          timeData[part.day] = row;
          creditedSeconds += part.seconds;
          timeChanged = true;
        }
        const category = autoCategories[session.domain];
        if (category && !siteCategories[session.domain]) {
          siteCategories[session.domain] = category;
          categoriesChanged = true;
        }
      }
    }
    // Persist each accounted checkpoint atomically with the timeData change.
    // Repeated event delivery at the same timestamp therefore credits nothing.
    const activeTracking = destination ? {
      version: 2, tabId: destination.tabId, windowId: destination.windowId,
      domain: destination.domain,
      start: sameContext(session, destination) ? session.start : now,
      lastAccountedAt: now
    } : null;
    return { timeData, activeTracking, siteCategories, timeChanged, categoriesChanged, creditedSeconds };
  }
  function getLiveStatus(snapshot, context, now, maxGapMs = MAX_GAP_MS) {
    const session = snapshot && snapshot.activeTracking;
    if (!sameContext(session, context)) return { domain: null, elapsedSeconds: 0 };
    const gap = now - session.lastAccountedAt;
    return { domain: session.domain, elapsedSeconds: gap >= 0 && gap <= maxGapMs ? Math.floor(gap/1000) : 0 };
  }
  return { MAX_GAP_MS, dayKey, splitByDay, reconcile, getLiveStatus };
});
