(function (root) {
  "use strict";

  function parseIrcLine(line) {
    let remaining = line;
    const tags = {};
    if (remaining.startsWith("@")) {
      const end = remaining.indexOf(" ");
      if (end === -1) return null;
      for (const pair of remaining.slice(1, end).split(";")) {
        const separator = pair.indexOf("=");
        const key = separator < 0 ? pair : pair.slice(0, separator);
        const value = separator < 0 ? "" : pair.slice(separator + 1);
        tags[key] = value.replace(/\\([:snr\\])/g, (_, escaped) => ({ ":": ";", s: " ", n: "\n", r: "\r", "\\": "\\" })[escaped]);
      }
      remaining = remaining.slice(end + 1);
    }

    let prefix = "";
    if (remaining.startsWith(":")) {
      const end = remaining.indexOf(" ");
      if (end === -1) return null;
      prefix = remaining.slice(1, end);
      remaining = remaining.slice(end + 1);
    }

    const trailingIndex = remaining.indexOf(" :");
    const head = trailingIndex < 0 ? remaining : remaining.slice(0, trailingIndex);
    const trailing = trailingIndex < 0 ? "" : remaining.slice(trailingIndex + 2);
    const parts = head.split(" ").filter(Boolean);
    if (parts.length === 0) return null;
    return { tags, prefix, command: parts[0], params: parts.slice(1), trailing };
  }

  function accountAgeDays(createdAt, now = Date.now()) {
    const timestamp = Date.parse(createdAt);
    if (!Number.isFinite(timestamp)) return null;
    return Math.max(0, Math.floor((now - timestamp) / 86_400_000));
  }

  function normalizeSettings(value = {}) {
    const boundedInteger = (input, fallback, min, max) => {
      const number = Number(input);
      return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback;
    };
    return {
      clientId: String(value.clientId || "").trim(),
      channel: String(value.channel || "").trim().replace(/^@/, "").toLowerCase(),
      language: ["en", "de", "es"].includes(value.language) ? value.language : "es",
      ageLimitDays: boundedInteger(value.ageLimitDays, 60, 1, 3650),
      recentFollowerDays: boundedInteger(value.recentFollowerDays, 1, 1, 365),
      trustMessageThreshold: boundedInteger(value.trustMessageThreshold, 10, 1, 1000),
      messageThreshold: boundedInteger(value.messageThreshold, 5, 1, 100),
      flagNewAccounts: value.flagNewAccounts !== false,
      flagFirstMessage: value.flagFirstMessage !== false,
      flagNewFollower: value.flagNewFollower !== false,
      matchMode: value.matchMode === "all" ? "all" : "any",
      autoTimeout: value.autoTimeout === true,
      timeoutMinutes: boundedInteger(value.timeoutMinutes, 10, 1, 20160)
    };
  }

  function getFlagReasons(account, settings) {
    const criteria = [];
    if (settings.flagNewAccounts) criteria.push(["new-account", Number.isFinite(account.ageDays) && account.ageDays < settings.ageLimitDays]);
    const established = Number(account.messageCount || 0) >= settings.trustMessageThreshold;
    if (settings.flagFirstMessage) criteria.push(["first-message", !established && account.firstMessage]);
    const followedAt = Date.parse(account.followedAt || "");
    const followAge = Date.now() - followedAt;
    const recentFollow = Number.isFinite(followedAt) && followAge >= 0 && followAge <= settings.recentFollowerDays * 86_400_000;
    if (settings.flagNewFollower) criteria.push(["new-follower", !established && recentFollow]);
    if (criteria.length === 0) return [];
    const matches = criteria.filter(([, matched]) => matched).map(([reason]) => reason);
    if (settings.matchMode === "all" && matches.length !== criteria.length) return [];
    return matches;
  }

  function recordMessage(account, message, sessionId) {
    if (account.sessionId !== sessionId) {
      account.sessionId = sessionId;
      account.messageCount = 0;
      account.recentMessages = [];
    }
    account.messageCount += 1;
    account.lastMessageAt = Number(message.tags["tmi-sent-ts"]) || Date.now();
    account.firstMessage ||= message.tags["first-msg"] === "1";
    account.recentMessages = [{ text: message.trailing || "", sentAt: account.lastMessageAt }, ...account.recentMessages].slice(0, 50);
    return account;
  }

  const api = { parseIrcLine, accountAgeDays, normalizeSettings, getFlagReasons, recordMessage };
  root.ModerationCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);