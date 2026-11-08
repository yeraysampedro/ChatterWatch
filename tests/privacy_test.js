import { assert, assertEquals } from "jsr:@std/assert@1";
import "../src/core.js";
import { harness } from "./worker_harness.js";
import { exampleAccounts, exampleApp, receiveExampleMessage } from "./example_accounts.js";

const { DATA_CONSENT_VERSION, DATA_CONSENT_REQUIRED, DATA_CONSENT_WITHDRAWN } = globalThis.ModerationCore;

async function eventually(check) {
  const deadline = performance.now() + 3000;
  while (!await check()) {
    if (performance.now() > deadline) throw new Error("Privacy state did not settle");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

for (const firefox of [false, true]) {
  Deno.test(`privacy: an existing session cannot resume without data-use consent (${firefox ? "Firefox" : "Chromium"})`, async () => {
    const app = await harness({ firefox, connected: true, consented: false });
    try {
      assertEquals(app.requests.length, 0, "Startup must not contact Twitch before affirmative consent");
      assertEquals(app.sockets.length, 0, "Startup must not open IRC before affirmative consent");
      assertEquals((await app.chrome.storage.session.get("chatConnected")).chatConnected, false);
    } finally {
      await app.call({ type: "DISCONNECT" });
      app.dispose();
    }
  });

  Deno.test(`privacy: stale grants and every data action fail closed until explicit current consent (${firefox ? "Firefox" : "Chromium"})`, async () => {
    const app = await harness({ firefox, connected: true, consentVersion: DATA_CONSENT_VERSION - 1 });
    try {
      assertEquals((await app.sendMessage({ type: "GET_DATA_CONSENT" })).dataConsent.accepted, false);
      assertEquals(app.requests.length, 0);
      for (const type of ["AUTH", "CONNECT", "SAVE_SETTINGS", "SAVE_CHAT_CONFIG", "SAVE_WORKSPACE", "RESTORE_WORKSPACE",
        "NOTE", "VET", "DISMISS", "WARN", "MODERATE", "QUICK_TIMEOUT", "DELETE_MESSAGE", "SET_SLOW_MODE", "TRANSLATE_MESSAGE"]) {
        assertEquals(await app.sendMessage({ type, accessToken: "test-token", confirmed: true, settings: { dataConsent: true } }),
          { error: DATA_CONSENT_REQUIRED }, type);
      }
      for (const choice of [
        { accepted: true, version: DATA_CONSENT_VERSION },
        { accepted: true, version: DATA_CONSENT_VERSION - 1, confirmed: true }
      ]) assertEquals(await app.sendMessage({ type: "SET_DATA_CONSENT", ...choice }), { error: DATA_CONSENT_REQUIRED });
      assertEquals(app.requests.length, 0);
      assertEquals(app.sockets.length, 0);
      const granted = await app.sendMessage({ type: "SET_DATA_CONSENT", accepted: true, version: DATA_CONSENT_VERSION, confirmed: true });
      assertEquals(granted.dataConsent.accepted, true);
      assert(granted.dataConsent.id && granted.dataConsent.acceptedAt > 0);
      assertEquals((await app.chrome.storage.local.get("dataConsent")).dataConsent.id, granted.dataConsent.id);
      assertEquals(app.requests.length, 0, "Allowing data use does not itself authenticate or connect");
      assertEquals(app.sockets.length, 0);
    } finally { await app.call({ type: "DISCONNECT" }); app.dispose(); }
  });

  Deno.test(`privacy: withdrawal keeps history read-only and stops credentials, IRC and alarms (${firefox ? "Firefox" : "Chromium"})`, async () => {
    const app = await exampleApp({ firefox });
    try {
      await receiveExampleMessage(app, exampleAccounts.newcomer);
      await app.request({ type: "NOTE", key: "100:501", note: "Keep this local note" });
      const before = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
      const previous = (await app.request({ type: "GET_DATA_CONSENT" })).dataConsent;
      const requests = app.requests.length;
      const stopped = await app.request({ type: "SET_DATA_CONSENT", accepted: false });
      assertEquals(stopped.dataConsent.accepted, false);
      assert(stopped.dataConsent.revision > previous.revision);
      assertEquals(app.sockets[0].readyState, 3);
      const session = await app.chrome.storage.session.get(["accessToken", "moderator", "dataConsentId", "chatConnected"]);
      assertEquals(session, { accessToken: undefined, moderator: undefined, dataConsentId: undefined, chatConnected: false });
      app.sockets[0].receive("@id=late;user-id=501;room-id=100 :sample_viewer_01!viewer PRIVMSG #demo :Must not be recorded");
      app.chrome.alarms.onAlarm.emit({ name: "stream-status" });
      app.chrome.alarms.onAlarm.emit({ name: "token-validation" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assertEquals(app.requests.length, requests);
      assertEquals((await app.request({ type: "GET_CHATTERS", filter: "all" })).total, 1);
      assertEquals((await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account, before);
      assertEquals(await app.sendMessage({ type: "NOTE", key: "100:501", note: "Not allowed offline" }), { error: DATA_CONSENT_REQUIRED });
      const renewed = await app.request({ type: "SET_DATA_CONSENT", accepted: true, version: DATA_CONSENT_VERSION, confirmed: true });
      assert(renewed.dataConsent.id !== previous.id);
      assertEquals(await app.sendMessage({ type: "AUTH", consentId: previous.id, accessToken: "late-token" }), { error: DATA_CONSENT_WITHDRAWN });
      assertEquals(app.requests.length, requests, "An old OAuth result must not be validated under a new consent grant");
    } finally { await app.call({ type: "DISCONNECT" }); app.dispose(); }
  });

  Deno.test(`privacy: a late profile response is aborted and cannot update retained history (${firefox ? "Firefox" : "Chromium"})`, async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    let profileRequests = 0;
    const app = await harness({ firefox, fetch(url, options) {
      const target = new URL(url);
      return { ok: true, status: 200, json: async () => {
        if (target.searchParams.get("id") === "77") {
          profileRequests += 1;
          started.resolve(options.signal);
          await release.promise;
          return { data: [{ id: "77", login: "viewer", display_name: "Late profile", created_at: "2000-01-01T00:00:00Z", profile_image_url: "https://avatars.example/77.png" }] };
        }
        return { data: [{ id: "100", login: "primary" }] };
      } };
    } });
    try {
      await app.call({ type: "SAVE_SETTINGS", settings: { clientId: "client", channel: "primary", flagNewFollower: false } });
      await app.call({ type: "CONNECT" });
      app.sockets[0].open();
      app.sockets[0].receive(":tmi 001 mod :Welcome");
      app.sockets[0].receive("@id=before;user-id=77;room-id=100;display-name=Original;first-msg=1 :viewer!viewer PRIVMSG #primary :Previously received text");
      const signal = await started.promise;
      const withdrawal = app.sendMessage({ type: "SET_DATA_CONSENT", accepted: false });
      await eventually(() => signal.aborted);
      release.resolve();
      assertEquals((await withdrawal).dataConsent.accepted, false);
      const retained = (await app.call({ type: "GET_ACCOUNT_HISTORY", key: "100:77" })).account;
      assertEquals(retained.displayName, "Original");
      assertEquals(retained.createdAt, "");
      assertEquals(retained.profileImage, "");
      assertEquals(retained.recentMessages.map((message) => message.text), ["Previously received text"]);
      assertEquals(profileRequests, 1);
      assertEquals(app.requests.length, 2);
    } finally { release.resolve(); await app.call({ type: "DISCONNECT" }); app.dispose(); }
  });

  Deno.test(`privacy: an in-flight token cannot return after withdrawal and queued reconsent (${firefox ? "Firefox" : "Chromium"})`, async () => {
    const started = Promise.withResolvers();
    const release = Promise.withResolvers();
    const app = await harness({ firefox, consented: false, fetch(_url, options) {
      return { ok: true, status: 200, json: async () => {
        started.resolve(options.signal);
        await release.promise;
        return { client_id: "client", user_id: "42", login: "mod",
          scopes: ["chat:read", "moderator:manage:banned_users", "moderator:read:followers"] };
      } };
    } });
    try {
      const first = await app.sendMessage({ type: "SET_DATA_CONSENT", accepted: true, version: DATA_CONSENT_VERSION, confirmed: true });
      const authentication = app.sendMessage({ type: "AUTH", consentId: first.dataConsent.id, accessToken: "test-token" });
      const signal = await started.promise;
      const withdrawal = app.sendMessage({ type: "SET_DATA_CONSENT", accepted: false });
      await eventually(() => signal.aborted);
      let completed = false;
      const reconsent = app.sendMessage({ type: "SET_DATA_CONSENT", accepted: true, version: DATA_CONSENT_VERSION, confirmed: true })
        .then((result) => { completed = true; return result; });
      assertEquals((await app.sendMessage({ type: "GET_DATA_CONSENT" })).dataConsent.accepted, false);
      assertEquals(completed, false);
      release.resolve();
      assertEquals(await authentication, { error: DATA_CONSENT_WITHDRAWN });
      assertEquals((await withdrawal).dataConsent.accepted, false);
      const next = await reconsent;
      assertEquals(next.dataConsent.accepted, true);
      assert(next.dataConsent.id !== first.dataConsent.id);
      assertEquals((await app.chrome.storage.session.get("accessToken")).accessToken, undefined);
      assertEquals(app.requests.length, 1);
    } finally { release.resolve(); await app.call({ type: "DISCONNECT" }); app.dispose(); }
  });

  Deno.test(`privacy: failed consent persistence never enables collection (${firefox ? "Firefox" : "Chromium"})`, async () => {
    const app = await harness({ firefox, consented: false });
    try {
      const save = app.chrome.storage.local.set;
      app.chrome.storage.local.set = async (value) => {
        if (value.dataConsent?.accepted) throw new Error("Privacy storage unavailable");
        return save(value);
      };
      assertEquals(await app.sendMessage({ type: "SET_DATA_CONSENT", accepted: true, version: DATA_CONSENT_VERSION, confirmed: true }),
        { error: "Privacy storage unavailable" });
      assertEquals((await app.sendMessage({ type: "GET_DATA_CONSENT" })).dataConsent.accepted, false);
      assertEquals(await app.sendMessage({ type: "CONNECT" }), { error: DATA_CONSENT_REQUIRED });
      assertEquals(app.requests.length, 0);
      assertEquals(app.sockets.length, 0);
      app.chrome.storage.local.set = save;
      assertEquals((await app.sendMessage({ type: "SET_DATA_CONSENT", accepted: true, version: DATA_CONSENT_VERSION, confirmed: true })).dataConsent.accepted, true);
    } finally { await app.call({ type: "DISCONNECT" }); app.dispose(); }
  });
}
