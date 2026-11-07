import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import vm from "node:vm";
import { IDBFactory, IDBKeyRange } from "npm:fake-indexeddb@6.2.2";

const sources = Object.fromEntries(await Promise.all(["core.js", "chat-flow.js", "worker.js"].map(async (name) => [
  name, await Deno.readTextFile(new URL(`../${name}`, import.meta.url))
])));

function eventBus() {
  const listeners = [];
  return { addListener: (listener) => listeners.push(listener), emit: (...args) => listeners.forEach((listener) => listener(...args)) };
}

function storage(initial) {
  const data = structuredClone(initial);
  return {
    async get(keys) { return Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map((key) => [key, structuredClone(data[key])])); },
    async set(values) { Object.assign(data, structuredClone(values)); },
    async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; }
  };
}

async function harness({ scopes = ["moderator:manage:chat_settings"], connected = false, firefox = false, locale = "en-US" } = {}) {
  const sockets = [];
  const requests = [];
  const windows = [];
  const timers = new Map();
  let nextTimer = 0;
  class Socket {
    static OPEN = 1;
    static CONNECTING = 0;
    constructor() { this.readyState = 0; this.sent = []; sockets.push(this); }
    send(line) { this.sent.push(line); }
    close() { this.readyState = 3; this.onclose?.(); }
    open() { this.readyState = 1; this.onopen(); }
    receive(line) { this.onmessage({ data: `${line}\r\n` }); }
  }
  const chrome = {
    i18n: { getUILanguage: () => locale },
    permissions: { contains: async () => true },
    action: { setBadgeText: async () => {} },
    storage: {
      local: storage({ settings: { channel: "primary", clientId: "client" } }),
      session: storage({ accessToken: "test-token", moderator: { user_id: "42", login: "mod", scopes }, chatConnected: connected })
    },
    runtime: {
      onMessage: eventBus(), onConnect: eventBus(), sendMessage: () => Promise.resolve(), getURL: (path) => `${firefox ? "moz" : "chrome"}-extension://test/${path}`,
      getContexts: async () => windows.map((info) => ({ documentUrl: info.url, windowId: info.id }))
    },
    windows: {
      async create(options) { const info = { id: windows.length + 1, left: 0, top: 0, state: "normal", ...options }; windows.push(info); return info; },
      async getAll() { return windows; },
      async update(id, values) { const info = windows.find((item) => item.id === id); Object.assign(info, values); return info; }
    },
    alarms: { create() {}, onAlarm: eventBus() }
  };
  const context = vm.createContext({
    chrome, crypto, URL, console, AbortSignal, indexedDB: new IDBFactory(), IDBKeyRange, WebSocket: Socket,
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (timer) => timers.delete(timer),
    setInterval: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearInterval: (timer) => timers.delete(timer),
    fetch: async (url, options) => {
      requests.push({ url: String(url), options });
      return {
        ok: true, status: 200,
        json: async () => String(url).includes("/chat/settings")
          ? { data: [{ slow_mode: true, slow_mode_wait_time: 12 }] }
          : { data: [{ id: "100", login: new URL(url).searchParams.get("login") || "primary" }] }
      };
    }
  });
  if (firefox) {
    context.browser = chrome;
    context.chrome = {};
    for (const name of ["core.js", "chat-flow.js"]) vm.runInContext(sources[name], context);
  } else {
    context.importScripts = (...names) => names.forEach((name) => vm.runInContext(sources[name], context));
  }
  vm.runInContext(sources["worker.js"], context);
  await vm.runInContext("chatReady", context);
  return { context, chrome, sockets, requests, windows, call: (message) => context.handleMessage(message) };
}

Deno.test("worker detects the browser locale until a supported language is saved", async () => {
  for (const [locale, expected] of [["es-MX", "es"], ["de-AT", "de"], ["fr-FR", "en"]]) {
    const app = await harness({ locale, firefox: true });
    assertEquals((await app.call({ type: "GET_STATE" })).state.settings.language, expected);
    await app.call({ type: "SAVE_SETTINGS", settings: { clientId: "client", channel: "primary", language: "es" } });
    assertEquals((await app.call({ type: "GET_STATE" })).state.settings.language, "es");
  }
});

Deno.test("moderator autosaves persist in order and a rejected save does not block the next", async () => {
  const app = await harness();
  const originalSet = app.chrome.storage.local.set;
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  const writes = [];
  app.chrome.storage.local.set = async (values) => {
    writes.push(values.settings.ageLimitDays);
    if (writes.length === 1) { started.resolve(); await release.promise; }
    await originalSet(values);
  };
  const settings = { clientId: "client", channel: "primary" };
  const first = app.call({ type: "SAVE_SETTINGS", settings: { ...settings, ageLimitDays: 21 } });
  await started.promise;
  const second = app.call({ type: "SAVE_SETTINGS", settings: { ...settings, ageLimitDays: 45 } });
  await Promise.resolve();
  assertEquals(writes, [21]);
  release.resolve();
  assertEquals((await first).settings.ageLimitDays, 21);
  assertEquals((await second).settings.ageLimitDays, 45);
  assertEquals((await app.chrome.storage.local.get("settings")).settings.ageLimitDays, 45);
  await assertRejects(() => app.call({ type: "SAVE_SETTINGS", settings: { channel: "bad channel" } }));
  await app.call({ type: "SAVE_SETTINGS", settings: { ...settings, ageLimitDays: 30 } });
  assertEquals((await app.chrome.storage.local.get("settings")).settings.ageLimitDays, 30);
});

Deno.test("worker shares one connection, synchronizes joins, and opens detached extension windows", async () => {
  const app = await harness();
  await app.call({ type: "SAVE_CHAT_CONFIG", revision: 0, config: { channels: ["secondary"] } });
  await app.call({ type: "CONNECT" });
  const socket = app.sockets[0];
  socket.open();
  socket.receive(":tmi.twitch.tv 001 mod :Welcome");
  assert(socket.sent.includes("JOIN #primary\r\n"));
  assert(socket.sent.includes("JOIN #secondary\r\n"));
  await app.call({ type: "OPEN_CHAT_WINDOW", channel: "secondary" });
  await app.call({ type: "OPEN_CHAT_WINDOW" });
  assertEquals(app.sockets.length, 1);
  assertEquals(app.windows[0].url, "chrome-extension://test/chat.html?channel=secondary");
  await app.call({ type: "SAVE_CHAT_CONFIG", revision: 1, config: { channels: [] } });
  assert(socket.sent.includes("PART #secondary\r\n"));
  await assertRejects(() => app.call({ type: "OPEN_CHAT_WINDOW", channel: "bad\r\nJOIN #other" }));
  await app.call({ type: "DISCONNECT" });
  assertEquals((await app.chrome.storage.session.get("chatConnected")).chatConnected, false);
});

Deno.test("worker keeps chat filters separate from Twitch slow-mode moderation", async () => {
  const app = await harness();
  await app.call({ type: "SAVE_CHAT_CONFIG", revision: 0, config: { flow: { localSlowSeconds: 10 } } });
  assertEquals(app.requests.length, 0);
  await app.call({ type: "SET_SLOW_MODE", channel: "primary", seconds: 12 });
  const request = app.requests.at(-1);
  assert(request.url.includes("/chat/settings?broadcaster_id=100&moderator_id=42"));
  assertEquals(request.options.method, "PATCH");
  assertEquals(JSON.parse(request.options.body), { slow_mode: true, slow_mode_wait_time: 12 });
  await app.call({ type: "SET_SLOW_MODE", channel: "primary", seconds: 0 });
  assertEquals(JSON.parse(app.requests.at(-1).options.body), { slow_mode: false });
  await assertRejects(() => app.call({ type: "SET_SLOW_MODE", channel: "primary", seconds: 1 }));
  const unprivileged = await harness({ scopes: [] });
  await assertRejects(() => unprivileged.call({ type: "SET_SLOW_MODE", channel: "primary", seconds: 10 }));
  assertEquals(unprivileged.requests.length, 0);
});

Deno.test("worker batches once for all views, deduplicates messages and applies IRC deletions", async () => {
  const app = await harness();
  await app.call({ type: "CONNECT" });
  const socket = app.sockets[0];
  socket.open();
  socket.receive(":tmi 001 mod :Welcome");
  const received = [];
  const port = { name: "multichat", postMessage: (message) => received.push(message), onDisconnect: eventBus() };
  app.chrome.runtime.onConnect.emit(port);
  await Promise.resolve();
  assertEquals(received[0].type, "CHAT_STATE");
  for (let index = 0; index < 2; index += 1) socket.receive("@id=same;user-id=7;mod=1 :viewer!viewer PRIVMSG #primary :hello");
  let state = await app.call({ type: "GET_CHAT_STATE" });
  assertEquals(state.channels[0].entries.length, 1);
  socket.receive("@target-msg-id=same :tmi CLEARMSG #primary :hello");
  state = await app.call({ type: "GET_CHAT_STATE" });
  assertEquals(state.channels[0].entries.length, 1);
  assertEquals(state.channels[0].entries[0].deleted, true);
  assertEquals(received.at(-1).type, "CHAT_PURGE");
  port.onDisconnect.emit();
  assertEquals(vm.runInContext("chatPorts.size", app.context), 0);
});

Deno.test("worker rejects stale config writes and bounds outstanding account reviews", async () => {
  const app = await harness();
  const results = await Promise.allSettled([
    app.call({ type: "SAVE_CHAT_CONFIG", revision: 0, config: { channels: ["one"] } }),
    app.call({ type: "SAVE_CHAT_CONFIG", revision: 0, config: { channels: ["two"] } })
  ]);
  assertEquals(results.map((result) => result.status), ["fulfilled", "rejected"]);
  vm.runInContext("processChatMessage = () => new Promise(() => {})", app.context);
  for (let index = 0; index < 2000; index += 1) {
    app.context.handleChatMessage({ command: "PRIVMSG", tags: { "user-id": String(index), "room-id": "100" } });
  }
  assertEquals(vm.runInContext("queuedModeration", app.context), 256);
  assertEquals(vm.runInContext("runningModeration", app.context), 4);
  assertEquals(vm.runInContext('chatFlow.channel("primary").stats.moderationSkipped', app.context), 1744);
});

Deno.test("worker resumes only explicitly connected sessions", async () => {
  const stopped = await harness();
  assertEquals(stopped.sockets.length, 0);
  const resumed = await harness({ connected: true });
  assertEquals(resumed.sockets.length, 1);
});

Deno.test("quick timeout targets a retained message author for exactly one second", async () => {
  const app = await harness({ scopes: ["moderator:manage:banned_users"] });
  vm.runInContext('chatFlow.ingest({ channel: "primary", id: "joke", userId: "77", text: "/srs" })', app.context);
  await assertRejects(() => app.call({ type: "QUICK_TIMEOUT", channel: "primary", id: "joke" }));
  await app.call({ type: "QUICK_TIMEOUT", channel: "primary", id: "joke", userId: "spoofed", duration: 999, confirmed: true });
  const request = app.requests.at(-1);
  assert(request.url.includes("/moderation/bans?broadcaster_id=100&moderator_id=42"));
  assertEquals(JSON.parse(request.options.body), { data: { user_id: "77", duration: 1, reason: "/srs" } });
  await assertRejects(() => app.call({ type: "QUICK_TIMEOUT", channel: "primary", id: "missing" }));
  const forbidden = await harness({ scopes: [] });
  vm.runInContext('chatFlow.ingest({ channel: "primary", id: "joke", userId: "77", text: "/srs" })', forbidden.context);
  await assertRejects(() => forbidden.call({ type: "QUICK_TIMEOUT", channel: "primary", id: "joke" }));
  assertEquals(forbidden.requests.length, 0);
});

for (const firefox of [false, true]) Deno.test(`workspaces persist geometry and reuse existing extension windows (${firefox ? "Firefox" : "Chromium"})`, async () => {
  const app = await harness({ firefox });
  await app.call({ type: "OPEN_CHAT_WINDOW" });
  await app.call({ type: "OPEN_CHAT_WINDOW", channel: "primary" });
  Object.assign(app.windows[0], { left: -1200, top: 90, width: 1100, height: 800 });
  Object.assign(app.windows[1], { left: 120, top: 180, width: 440, height: 600, state: "maximized" });
  app.windows.push({ id: 99, url: "https://example.com/", left: 1, top: 2, width: 800, height: 600 });
  await app.call({ type: "SAVE_WORKSPACE", name: "Stream" });
  assertEquals((await app.chrome.storage.local.get("chatWorkspaces")).chatWorkspaces[0].windows.length, 2);
  app.windows[0].left = 100;
  app.windows.splice(1, 1);
  await app.call({ type: "RESTORE_WORKSPACE", name: "Stream" });
  assertEquals(app.windows[0].left, -1200);
  assertEquals(app.windows.at(-1).state, "maximized");
  assertEquals(app.windows.at(-1).focused, false);
  assertEquals(app.windows.find((info) => info.id === 99).left, 1);
  await app.call({ type: "RESTORE_WORKSPACE", name: "Stream" });
  assertEquals(app.windows.length, 3);
  await app.call({ type: "DELETE_WORKSPACE", name: "Stream" });
  assertEquals((await app.call({ type: "LIST_WORKSPACES" })).names.length, 0);
});

Deno.test("Firefox event background starts without importScripts and handles messages through browser APIs", async () => {
  const app = await harness({ firefox: true });
  const response = await new Promise((resolve) => app.chrome.runtime.onMessage.emit({ type: "CONNECT" }, {}, resolve));
  assertEquals(response.error, undefined);
  assertEquals(app.sockets.length, 1);
  app.sockets[0].open();
  app.sockets[0].receive(":tmi 001 mod :Welcome");
  assert(app.sockets[0].sent.includes("JOIN #primary\r\n"));
  await app.call({ type: "OPEN_CHAT_WINDOW" });
  assertEquals(app.windows[0].url, "moz-extension://test/chat.html");
  await app.call({ type: "DISCONNECT" });
});

Deno.test("replacing an IRC socket does not schedule a competing reconnect", async () => {
  const app = await harness();
  await app.call({ type: "CONNECT" });
  app.sockets[0].open();
  await app.context.startChat({ reconnect: true });
  assertEquals(vm.runInContext("reconnectTimer", app.context), null);
  await app.call({ type: "DISCONNECT" });
});

Deno.test("autoapproved chatters stay in the live feed and out of review", async () => {
  const app = await harness();
  await app.call({ type: "SAVE_SETTINGS", settings: { clientId: "client", channel: "primary", autoApproveMessages: true, approvalThreshold: 1 } });
  await app.call({ type: "CONNECT" });
  app.sockets[0].open();
  app.sockets[0].receive(":tmi 001 mod :Welcome");
  for (const id of ["first", "second"]) {
    const message = { command: "PRIVMSG", prefix: "viewer!viewer", params: ["#primary"], tags: { id, "user-id": "77", "room-id": "100", "first-msg": "1" }, trailing: id };
    app.context.ingestChat(message);
  }
  while (vm.runInContext("queuedModeration", app.context)) await new Promise((resolve) => setTimeout(resolve, 1));
  const account = await app.context.getAccount("100:77");
  assertEquals(account.approvalReason, "messages");
  assertEquals((await app.call({ type: "GET_STATE" })).state.flagged, 0);
  assertEquals((await app.call({ type: "GET_CHAT_STATE" })).channels[0].entries.length, 2);
});

Deno.test("dashboard windows reuse their internal page and remember geometry", async () => {
  const app = await harness();
  await app.call({ type: "SAVE_WINDOW_GEOMETRY", view: "dashboard", bounds: { left: -500, top: 100, width: 900, height: 800 } });
  await app.call({ type: "OPEN_DASHBOARD" });
  await app.call({ type: "OPEN_DASHBOARD" });
  assertEquals(app.windows.length, 1);
  assertEquals(app.windows[0].url, "chrome-extension://test/dashboard.html");
  assertEquals(app.windows[0].width, 900);
  assertEquals(app.windows[0].left, -500);
});

Deno.test("deleting a retained message requires confirmation and scope and retains a ghost", async () => {
  const app = await harness({ scopes: ["moderator:manage:chat_messages"] });
  vm.runInContext('chatFlow.ingest({ channel: "primary", id: "delete-me", userId: "77", text: "hello" })', app.context);
  await assertRejects(() => app.call({ type: "DELETE_MESSAGE", channel: "primary", id: "delete-me" }));
  await app.call({ type: "DELETE_MESSAGE", channel: "primary", id: "delete-me", confirmed: true });
  assertEquals(app.requests.at(-1).options.method, "DELETE");
  assert(app.requests.at(-1).url.includes("message_id=delete-me"));
  assertEquals((await app.call({ type: "GET_CHAT_STATE" })).channels[0].entries[0].deleted, true);
});

Deno.test("verified stream transitions rotate the review epoch but polling errors do not", async () => {
  const app = await harness();
  await app.call({ type: "CONNECT" });
  app.context.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [{ id: "stream-1" }] }) });
  await app.context.pollStream();
  const first = vm.runInContext("activeSessionId", app.context);
  app.context.fetch = async () => { throw new Error("offline network"); };
  await assertRejects(() => app.context.pollStream());
  assertEquals(vm.runInContext("activeSessionId", app.context), first);
  app.context.fetch = async () => ({ ok: true, status: 200, json: async () => ({ data: [] }) });
  await app.context.pollStream();
  assert(vm.runInContext("activeSessionId", app.context) !== first);
});

Deno.test("translation is explicit, uses retained text, checks optional consent and never sends Twitch credentials", async () => {
  const app = await harness({ firefox: true });
  await app.call({ type: "SAVE_SETTINGS", settings: { clientId: "client", channel: "primary", translationUrl: "https://translate.example/translate", translationTarget: "es" } });
  vm.runInContext('chatFlow.ingest({ channel: "primary", id: "translate-me", userId: "77", text: "hello" })', app.context);
  const message = { type: "TRANSLATE_MESSAGE", channel: "primary", id: "translate-me", text: "spoofed" };
  await assertRejects(() => app.call(message));
  app.chrome.permissions.contains = async () => false;
  await assertRejects(() => app.call({ ...message, confirmed: true }));
  assertEquals(app.requests.length, 0);
  let permission;
  app.chrome.permissions.contains = async (value) => { permission = value; return true; };
  app.context.fetch = async (url, options) => {
    app.requests.push({ url, options });
    return { ok: true, json: async () => ({ translatedText: "hola" }) };
  };
  assertEquals((await app.call({ ...message, confirmed: true })).text, "hola");
  assertEquals(JSON.parse(app.requests[0].options.body), { q: "hello", source: "auto", target: "es", format: "text" });
  assertEquals(Object.keys(app.requests[0].options.headers), ["Content-Type"]);
  assertEquals(app.requests[0].options.credentials, "omit");
  assertEquals(app.requests[0].options.redirect, "error");
  assertEquals(JSON.parse(JSON.stringify(permission)), { origins: ["https://translate.example/*"], data_collection: ["personalCommunications"] });
  await assertRejects(() => app.call({ type: "SAVE_SETTINGS", settings: { translationUrl: "http://unsafe.example/translate" } }));
});

Deno.test("review alerts go to one view only and do not repeat for the same pending chatter", async () => {
  const app = await harness();
  await app.call({ type: "SAVE_SETTINGS", settings: { clientId: "client", channel: "primary", alertSound: true, alertAttention: true, flagNewFollower: false } });
  const received = [[], []];
  for (const messages of received) app.chrome.runtime.onConnect.emit({ name: "dashboard", postMessage: (message) => messages.push(message), onDisconnect: eventBus() });
  await app.call({ type: "CONNECT" });
  const message = { command: "PRIVMSG", prefix: "viewer!viewer", params: ["#primary"], tags: { "user-id": "77", "room-id": "100", "first-msg": "1" }, trailing: "hello" };
  await app.context.processChatMessage(message);
  await app.context.processChatMessage(message);
  assertEquals(received.flat().filter((item) => item.type === "REVIEW_ALERT").length, 1);
});

Deno.test("manual approval cannot be overwritten by a pending message update", async () => {
  const app = await harness();
  await app.call({ type: "SAVE_SETTINGS", settings: { clientId: "client", channel: "primary", alertAttention: true, flagNewFollower: false } });
  await app.call({ type: "CONNECT" });
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  let first = true;
  app.chrome.action.setBadgeText = async () => {
    if (first) { first = false; started.resolve(); await release.promise; }
  };
  const processing = app.context.processChatMessage({ command: "PRIVMSG", prefix: "viewer!viewer", params: ["#primary"], tags: { "user-id": "77", "room-id": "100", "first-msg": "1" }, trailing: "hello" });
  await started.promise;
  const approval = app.call({ type: "VET", key: "100:77" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  release.resolve();
  await Promise.all([processing, approval]);
  const account = await app.context.getAccount("100:77");
  assertEquals(account.isVetted, true);
  assertEquals(account.approvalSource, "manual");
});