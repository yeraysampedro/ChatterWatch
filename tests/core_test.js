import { assertEquals, assertFalse, assert } from "jsr:@std/assert@1";
import "../core.js";
import "../chat-flow.js";

const { parseIrcLine, accountAgeDays, resolveLanguage, normalizeSettings, getFlagReasons, recordMessage } = globalThis.ModerationCore;
const { FlowController, normalizeConfig, compilePattern, HISTORY_LIMIT, BATCH_LIMIT, TRACKING_LIMIT } = globalThis.ChatFlow;

Deno.test("chat flow bounds history, pending batches, and frequency tracking during a burst", () => {
  const flow = new FlowController({ spamEnabled: false });
  for (let index = 0; index < 20_000; index += 1) {
    flow.ingest({ channel: "one", userId: String(index), text: `message ${index}` }, index);
  }
  const state = flow.channels.get("one");
  assertEquals(state.history.size, HISTORY_LIMIT);
  assertEquals(state.pending.size, BATCH_LIMIT);
  assertEquals(state.stats.overflow, 20_000 - BATCH_LIMIT);
  assert(state.tracking.size <= TRACKING_LIMIT);
  assertEquals(flow.flush()[0].entries.at(-1).text, "message 19999");
  assertEquals(flow.flush()[0].entries.length, 0);
});

Deno.test("spam repetition and frequency use independent channel windows", () => {
  const flow = new FlowController({ repeatLimit: 2, frequencyLimit: 2 });
  assert(flow.ingest({ channel: "one", userId: "1", text: "HELLO  there" }, 0));
  assertFalse(flow.ingest({ channel: "one", userId: "2", text: "hello there" }, 1));
  assert(flow.ingest({ channel: "two", userId: "2", text: "hello there" }, 1));
  assert(flow.ingest({ channel: "one", userId: "1", text: "different" }, 2));
  assertFalse(flow.ingest({ channel: "one", userId: "1", text: "another" }, 3));
  assert(flow.ingest({ channel: "one", userId: "1", text: "hello there" }, 10_001));
});

Deno.test("local slow mode and safe regex filtering are configurable", () => {
  const flow = new FlowController({ localSlowSeconds: 2, pattern: "\\bpromo\\b|^buy" });
  assertFalse(flow.ingest({ channel: "one", userId: "1", text: "PROMO now" }, 0));
  assert(flow.ingest({ channel: "one", userId: "1", text: "hi" }, 1));
  assertFalse(flow.ingest({ channel: "one", userId: "1", text: "again" }, 1000));
  assert(flow.ingest({ channel: "one", userId: "1", text: "later" }, 2001));
  for (const pattern of ["(a+)+$", "a.*b", "[a-z]", "a|", "^$"]) {
    let rejected = false;
    try { compilePattern(pattern); } catch { rejected = true; }
    assert(rejected, pattern);
  }
});

Deno.test("multichat configuration validates channels and deletion preserves ghost messages", () => {
  assertEquals(normalizeConfig({ channels: ["@ONE", "#one", "two"] }).channels, ["one", "two"]);
  for (const channels of [["one\r\nJOIN #other"], Array.from({ length: 7 }, (_, index) => `channel${index}`)]) {
    let rejected = false;
    try { normalizeConfig({ channels }); } catch { rejected = true; }
    assert(rejected);
  }
  const flow = new FlowController();
  flow.ingest({ channel: "one", id: "a", userId: "1", text: "first" });
  flow.ingest({ channel: "one", id: "b", userId: "2", text: "second" });
  flow.purge("one", { userId: "1" });
  assertEquals(flow.snapshot("one").entries.map((entry) => [entry.id, Boolean(entry.deleted)]), [["a", true], ["b", false]]);
  flow.purge("one");
  assert(flow.flush()[0].entries.every((entry) => entry.deleted));
});

Deno.test("highlight rules validate regex and colors; unified history deduplicates and sorts", () => {
  const { normalizeHighlights, mergeTimeline, exportText } = globalThis.ChatFlow;
  assertEquals(normalizeHighlights([{ pattern: "hello|\\bpromo\\b", color: "#ffcc00" }]).length, 1);
  for (const rule of [{ pattern: ".*", color: "#ffcc00" }, { pattern: "hello", color: "red;display:none" }]) {
    let rejected = false;
    try { normalizeHighlights([rule]); } catch { rejected = true; }
    assert(rejected);
  }
  const earlier = { id: "same", channel: "two", sequence: 1, sentAt: 1000, text: "hello\nworld", login: "viewer", deleted: true };
  const later = { ...earlier, channel: "one", sentAt: 2000, deleted: false };
  const merged = mergeTimeline([later, earlier], [{ ...earlier, deleted: false }]);
  assertEquals(merged.map((entry) => entry.channel), ["two", "one"]);
  assert(merged[0].deleted);
  assert(exportText(merged).includes("#two viewer [deleted]: hello\\nworld"));
  assertEquals(mergeTimeline(Array.from({ length: 2000 }, (_, index) => ({ ...earlier, id: String(index), sentAt: index }))).length, HISTORY_LIMIT);
});

Deno.test("parses IRC tags, prefix, command, channel, and trailing message", () => {
  const message = parseIrcLine("@user-id=42;first-msg=1 :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #channel :hello there");
  assertEquals(message.tags["user-id"], "42");
  assertEquals(message.tags["first-msg"], "1");
  assertEquals(message.prefix, "viewer!viewer@viewer.tmi.twitch.tv");
  assertEquals(message.command, "PRIVMSG");
  assertEquals(message.params, ["#channel"]);
  assertEquals(message.trailing, "hello there");
});

Deno.test("unescapes IRCv3 tag values and rejects malformed lines", () => {
  assertEquals(parseIrcLine("@display-name=Hello\\sworld :tmi PRIVMSG #test :hi").tags["display-name"], "Hello world");
  assertEquals(parseIrcLine("@display-name=Hello\\:world :tmi PRIVMSG #test :hi").tags["display-name"], "Hello;world");
  assertEquals(parseIrcLine("@only-tags"), null);
  assertEquals(parseIrcLine(""), null);
});

Deno.test("calculates account age in whole days and handles invalid dates", () => {
  assertEquals(accountAgeDays("2026-10-28T00:00:00Z", Date.parse("2026-10-30T12:00:00Z")), 2);
  assertEquals(accountAgeDays("not-a-date"), null);
});

Deno.test("normalizes settings and keeps automatic timeout opt-in", () => {
  assertEquals(normalizeSettings({ channel: "@MyChannel", language: "en", ageLimitDays: -1, messageThreshold: 500 }), {
    clientId: "", channel: "mychannel", language: "en", ageLimitDays: 1, recentFollowerDays: 1, trustMessageThreshold: 10,
    messageThreshold: 100, flagNewAccounts: true, flagFirstMessage: true, flagNewFollower: true,
    matchMode: "any", autoTimeout: false, timeoutMinutes: 10,
    autoApproveMessages: false, autoApproveFollowers: false, autoApproveSubscribers: false, autoApproveFormerSubscribers: false,
    approvalThreshold: 10, reviewIdleMinutes: 15, alertSound: false, alertAttention: false, alertVolume: 30,
    translationUrl: "", translationTarget: "en"
  });
  assertEquals(normalizeSettings({ language: "de" }).language, "de");
  assertEquals(normalizeSettings({ language: "xx" }).language, "en");
});

Deno.test("language resolution handles regional locales, saved choices and English fallback", () => {
  for (const [locale, expected] of [["es-MX", "es"], ["de-DE", "de"], ["EN_us", "en"], ["fr-FR", "en"], ["", "en"], [null, "en"]]) {
    assertEquals(resolveLanguage(locale), expected);
  }
  assertEquals(normalizeSettings({ language: "es" }).language, "es");
  assertEquals(normalizeSettings({ language: "de-AT" }).language, "de");
});

Deno.test("flags only enabled, known risk signals", () => {
  const settings = normalizeSettings({ flagFirstMessage: false, flagNewFollower: true, ageLimitDays: 60 });
  assertEquals(getFlagReasons({ ageDays: 12, firstMessage: true, followedAt: new Date().toISOString() }, settings), ["new-account", "new-follower"]);
  assertEquals(getFlagReasons({ ageDays: null, firstMessage: true, followedAt: null }, settings), []);
  assert(getFlagReasons({ ageDays: 60, firstMessage: false, followedAt: null }, settings).length === 0);
  assertFalse(getFlagReasons({ ageDays: 59, firstMessage: false, followedAt: null }, settings).length === 0);
});

Deno.test("does not label long-time followers as recent", () => {
  const settings = normalizeSettings({ flagNewFollower: true });
  const followedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
  assertEquals(getFlagReasons({ ageDays: null, firstMessage: false, followedAt }, settings), []);
  assertEquals(getFlagReasons({ ageDays: null, firstMessage: false, followedAt: new Date(Date.now() + 60_000).toISOString() }, settings), []);
});

Deno.test("counts messages within a session and resets on the next stream", () => {
  const account = { sessionId: "stream-1", messageCount: 2, recentMessages: [{ text: "earlier" }], firstMessage: false };
  recordMessage(account, { tags: { "tmi-sent-ts": "1000", "first-msg": "1" }, trailing: "hello" }, "stream-1");
  assertEquals(account.messageCount, 3);
  assertEquals(account.firstMessage, true);
  assertEquals(account.recentMessages.length, 2);
  recordMessage(account, { tags: { "tmi-sent-ts": "2000" }, trailing: "new stream" }, "stream-2");
  assertEquals(account.messageCount, 1);
  assertEquals(account.recentMessages.map((entry) => entry.text), ["new stream"]);
});

Deno.test("uses configurable follower recency and cools down social signals after enough messages", () => {
  const settings = normalizeSettings({ recentFollowerDays: 3, trustMessageThreshold: 10 });
  const recentFollow = new Date(Date.now() - 2 * 86_400_000).toISOString();
  assertEquals(getFlagReasons({ ageDays: 400, messageCount: 1, firstMessage: false, followedAt: recentFollow }, settings), ["new-follower"]);
  assertEquals(getFlagReasons({ ageDays: 400, messageCount: 10, firstMessage: true, followedAt: recentFollow }, settings), []);
});

Deno.test("supports ANY and ALL matching across enabled risk signals", () => {
  const account = { ageDays: 2, messageCount: 1, firstMessage: false, followedAt: null };
  const anySettings = normalizeSettings({ flagNewAccounts: true, flagFirstMessage: true, flagNewFollower: false, matchMode: "any" });
  const allSettings = normalizeSettings({ flagNewAccounts: true, flagFirstMessage: true, flagNewFollower: false, matchMode: "all" });
  assertEquals(getFlagReasons(account, anySettings), ["new-account"]);
  assertEquals(getFlagReasons(account, allSettings), []);
  account.firstMessage = true;
  assertEquals(getFlagReasons(account, allSettings), ["new-account", "first-message"]);
});

Deno.test("local slow mode survives a shorter spam window", () => {
  const flow = new FlowController({ localSlowSeconds: 30, windowSeconds: 1 });
  const message = { channel: "one", userId: "1", text: "hello" };
  assert(flow.ingest(message, 0));
  assertFalse(flow.ingest(message, 2000));
  assert(flow.ingest(message, 30_000));
});

Deno.test("approval uses strict N plus one and verified OR conditions without changing manual decisions", () => {
  const settings = normalizeSettings({ autoApproveMessages: true, autoApproveFollowers: true, autoApproveSubscribers: true, autoApproveFormerSubscribers: true });
  for (const [fields, expected] of [
    [{ messageCount: 10 }, undefined], [{ messageCount: 11 }, "messages"],
    [{ followedAt: "2026-01-01", followerCheckedAt: 1000 }, "follower"], [{ followedAt: "2026-01-01", followerError: "denied" }, undefined],
    [{ followedAt: "2026-01-01" }, undefined],
    [{ isSubscriber: true }, "subscriber"], [{ isSubscriber: false, wasSubscriber: true }, "previous-subscriber"],
    [{ isSubscriber: false }, undefined], [{ dismissed: true, messageCount: 20 }, undefined]
  ]) {
    const account = { ...fields };
    ModerationCore.applyApproval(account, settings, 1000);
    assertEquals(account.approvalReason, expected);
  }
});

Deno.test("review expires at fifteen minutes or a new stream but keeps manual approvals and observed subscription history", () => {
  const settings = normalizeSettings();
  const account = { sessionId: "stream", lastActivityAt: 1000, isVetted: true, approvalSource: "automatic", messageCount: 20, note: "RAID example" };
  ModerationCore.prepareReview(account, { tags: { subscriber: "1" } }, "stream", settings, 900999);
  assert(account.isVetted);
  ModerationCore.prepareReview(account, { tags: { subscriber: "0", badges: "founder/1" } }, "stream", settings, 1800999);
  assertFalse(account.isVetted);
  assertFalse(account.isSubscriber);
  assert(account.wasSubscriber);
  assertEquals(account.note, "RAID example");
  Object.assign(account, { isVetted: true, approvalSource: "manual" });
  ModerationCore.prepareReview(account, { tags: {} }, "next-stream", settings, 1801000);
  assert(account.isVetted);
  assertEquals(account.messageCount, 0);
});