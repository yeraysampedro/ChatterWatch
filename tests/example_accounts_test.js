import { assertEquals } from "jsr:@std/assert@1";
import { exampleAccounts, exampleApp, receiveExampleMessage } from "./example_accounts.js";

for (const firefox of [false, true]) {
  const browser = firefox ? "Firefox" : "Chromium";

  Deno.test(`example accounts: review signals do not put every chatter in Pending (${browser})`, async () => {
    const app = await exampleApp({ firefox });
    try {
      for (const account of Object.values(exampleAccounts)) await receiveExampleMessage(app, account);
      const pending = await app.request({ type: "GET_CHATTERS", filter: "pending" });
      assertEquals(pending.accounts.map((account) => account.login).sort(), ["sample_viewer_01", "sample_viewer_02"]);
      const newcomer = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
      assertEquals(newcomer.ageDays, 2);
      assertEquals(newcomer.reasons, ["new-account", "first-message", "new-follower"]);
      const follower = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:502" })).account;
      assertEquals(follower.reasons, ["new-follower"]);
      const all = await app.request({ type: "GET_CHATTERS", filter: "all" });
      assertEquals(all.total, 7);
      assertEquals(all.accounts.filter((account) => account.reviewExempt).map((account) => account.login).sort(), ["demo", "demo_helper", "demo_moderator"]);
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "all", query: "DEMOREGULAR" })).accounts.map((account) => account.login), ["demo_regular"]);
      assertEquals((await app.request({ type: "GET_CHAT_STATE" })).channels[0].entries.length, 7);
      assertEquals(app.requests.filter((request) => request.options.method !== "GET"), []);
    } finally { await app.request({ type: "DISCONNECT" }); }
  });

  Deno.test(`example accounts: N=2 approves the third message, never the second (${browser})`, async () => {
    const app = await exampleApp({ firefox, settings: { autoApproveMessages: true, approvalThreshold: 2 } });
    try {
      await receiveExampleMessage(app, exampleAccounts.newcomer, 1);
      await receiveExampleMessage(app, exampleAccounts.newcomer, 2);
      const second = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
      assertEquals(second.messageCount, 2);
      assertEquals(second.isVetted, false);
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "pending" })).total, 1);
      await receiveExampleMessage(app, exampleAccounts.newcomer, 3);
      const approved = await app.request({ type: "GET_CHATTERS", filter: "approved" });
      assertEquals(approved.accounts.map((account) => [account.login, account.messageCount, account.approvalSource, account.approvalReason]),
        [["sample_viewer_01", 3, "automatic", "messages"]]);
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "pending" })).total, 0);
      assertEquals((await app.request({ type: "GET_CHAT_STATE" })).channels[0].entries.map((entry) => entry.id),
        ["demo-501-1", "demo-501-2", "demo-501-3"]);
      assertEquals(app.requests.filter((request) => request.options.method !== "GET"), []);
    } finally { await app.request({ type: "DISCONNECT" }); }
  });

  Deno.test(`example accounts: automatic sanctions exclude extra chats and exempt roles (${browser})`, async () => {
    const app = await exampleApp({ firefox, settings: { autoTimeout: true, messageThreshold: 1, timeoutMinutes: 1 } });
    try {
      await app.request({ type: "SAVE_CHAT_CONFIG", revision: 0, config: { channels: ["sample_a"] } });
      await receiveExampleMessage(app, exampleAccounts.newcomer, 1, { channel: "sample_a" });
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "all" })).total, 0);
      for (const account of [exampleAccounts.broadcaster, exampleAccounts.moderator, exampleAccounts.vip]) {
        await receiveExampleMessage(app, account);
      }
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "pending" })).total, 0);
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "all" })).total, 3);
      assertEquals(app.requests.filter((request) => request.options.method !== "GET"), []);

      await receiveExampleMessage(app, exampleAccounts.newcomer);
      const sanctions = app.requests.filter((request) => request.options.method === "POST");
      assertEquals(sanctions.length, 1);
      assertEquals(sanctions[0].url, "https://api.twitch.tv/helix/moderation/bans?broadcaster_id=100&moderator_id=42");
      assertEquals(JSON.parse(sanctions[0].options.body), {
        data: { user_id: "501", duration: 60, reason: "Automatic timeout: flagged chatter reached 1 messages." }
      });
      const history = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
      assertEquals(history.activityHistory.map((event) => [event.type, event.source, event.duration]), [["timeout", "automatic", 60]]);
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "pending" })).accounts.map((account) => account.login), ["sample_viewer_01"]);
      const extra = (await app.request({ type: "GET_CHAT_STATE" })).channels.find((channel) => channel.channel === "sample_a");
      assertEquals(extra.entries.map((entry) => entry.id), ["sample_a-501-1"]);
    } finally { await app.request({ type: "DISCONNECT" }); }
  });

  Deno.test(`example accounts: rejected moderation never records a successful action (${browser})`, async () => {
    for (const scenario of [
      { name: "unconfirmed", message: { confirmed: false }, error: "Confirm this moderation action first.", writes: 0 },
      { name: "zero seconds", message: { duration: 0 }, error: "Timeout must be between 1 second and 14 days.", writes: 0 },
      { name: "missing scope", options: { scopes: ["chat:read", "moderator:read:followers"] }, error: "Sign in again and grant moderator:manage:banned_users.", writes: 0 },
      { name: "missing channel role", options: { moderationStatus: 403 }, error: "Example channel role denied", writes: 1 }
    ]) {
      const app = await exampleApp({ firefox, ...scenario.options });
      try {
        await receiveExampleMessage(app, exampleAccounts.newcomer);
        const before = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
        const result = await app.sendMessage({
          type: "MODERATE", key: "100:501", action: "timeout", duration: 1,
          reason: "Agreed example test", confirmed: true, ...scenario.message
        });
        assertEquals(result, { error: scenario.error }, scenario.name);
        const after = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
        assertEquals(after.activityHistory, before.activityHistory, scenario.name);
        assertEquals(after.latestAction, before.latestAction, scenario.name);
        assertEquals(after.dismissed, false, scenario.name);
        assertEquals((await app.request({ type: "GET_CHATTERS", filter: "pending" })).total, 1, scenario.name);
        assertEquals(app.requests.filter((request) => request.options.method === "POST").length, scenario.writes, scenario.name);
      } finally { await app.request({ type: "DISCONNECT" }); }
    }
  });

  Deno.test(`example accounts: confirmed unban removes bans and timeouts without approving or immediately sanctioning again (${browser})`, async () => {
    for (const action of ["ban", "timeout"]) {
      const app = await exampleApp({ firefox, settings: { autoTimeout: true, messageThreshold: 2 } });
      try {
        await receiveExampleMessage(app, exampleAccounts.newcomer);
        await app.request({ type: "MODERATE", key: "100:501", action, duration: 60, reason: "Agreed example test", confirmed: true });
        assertEquals((await app.request({ type: "GET_CHATTERS", filter: "all" })).total, 1);
        await app.request({ type: "MODERATE", key: "100:501", action: "unban", confirmed: true });
        const removals = app.requests.filter((request) => request.options.method === "DELETE");
        assertEquals(removals.length, 1);
        assertEquals(removals[0].url, "https://api.twitch.tv/helix/moderation/bans?broadcaster_id=100&moderator_id=42&user_id=501");
        assertEquals(removals[0].options.body, undefined);
        const account = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
        assertEquals(account.dismissed, false);
        assertEquals(account.isVetted, false);
        assertEquals(account.latestAction, "Ban/timeout removed");
        assertEquals(account.activityHistory.map((event) => [event.type, event.source, event.actor]),
          [["unban", "manual", "demo_moderator"], [action, "manual", "demo_moderator"]]);
        assertEquals((await app.request({ type: "GET_CHATTERS", filter: "pending" })).total, 1);
        await receiveExampleMessage(app, exampleAccounts.newcomer, 2);
        assertEquals(app.requests.filter((request) => request.options.method === "POST").length, 1);
      } finally { await app.request({ type: "DISCONNECT" }); }
    }
  });

  Deno.test(`example accounts: unban confirmation, scope and Twitch failures preserve the account (${browser})`, async () => {
    for (const scenario of [
      { confirmed: false, error: "Confirm this moderation action first.", writes: 0 },
      { options: { scopes: ["chat:read", "moderator:read:followers"] }, error: "Sign in again and grant moderator:manage:banned_users.", writes: 0 },
      { options: { moderationStatus: 400, moderationMessage: "user is not banned" }, error: "user is not banned", writes: 1 },
      { options: { moderationStatus: 403 }, error: "Example channel role denied", writes: 1 },
      { options: { moderationStatus: 409, moderationMessage: "Conflicting moderation update" }, error: "Conflicting moderation update", writes: 1 }
    ]) {
      const app = await exampleApp({ firefox, ...scenario.options });
      try {
        await receiveExampleMessage(app, exampleAccounts.newcomer);
        const before = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
        assertEquals(await app.sendMessage({
          type: "MODERATE", key: "100:501", action: "unban", confirmed: scenario.confirmed !== false
        }), { error: scenario.error });
        assertEquals((await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account, before);
        assertEquals(app.requests.filter((request) => request.options.method === "DELETE").length, scenario.writes);
      } finally { await app.request({ type: "DISCONNECT" }); }
    }
  });
}
