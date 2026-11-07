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

async function harness({ scopes = ["moderator:manage:chat_settings"], connected = false, firefox = false } = {}) {
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
  await app.call({ type: "QUICK_TIMEOUT", channel: "primary", id: "joke", userId: "spoofed", duration: 999 });
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