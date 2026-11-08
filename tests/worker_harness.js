import vm from "node:vm";
import { IDBFactory, IDBKeyRange } from "npm:fake-indexeddb@6.2.2";

const sources = Object.fromEntries(await Promise.all(["core.js", "chat-flow.js", "worker.js"].map(async (name) => [
  name, await Deno.readTextFile(new URL(`../src/${name}`, import.meta.url))
])));

export function eventBus() {
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

export async function harness({ scopes = ["moderator:manage:chat_settings"], connected = false, firefox = false, locale = "en-US", fetch: fetchResponse, realTimers = false, consented = true, consentVersion = 1 } = {}) {
  const sockets = [];
  const requests = [];
  const windows = [];
  const tabs = [];
  const timers = new Map();
  let nextTimer = 0;
  let nextWindowId = 0;
  const schedule = (callback, delay, repeat = false) => {
    const run = () => { if (!repeat) timers.delete(timer); callback(); };
    const timer = realTimers ? (repeat ? setInterval(run, delay) : setTimeout(run, delay)) : ++nextTimer;
    timers.set(timer, repeat);
    return timer;
  };
  const clearTimer = (timer) => {
    if (realTimers) {
      if (timers.get(timer)) clearInterval(timer);
      else clearTimeout(timer);
    }
    timers.delete(timer);
  };
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
      local: storage({ settings: { channel: "primary", clientId: "client" },
        ...(consented ? { dataConsent: { version: consentVersion, accepted: true, id: "fixture-consent", acceptedAt: 1, revision: 1 } } : {}) }),
      session: storage({ accessToken: "test-token", moderator: { user_id: "42", login: "mod", scopes }, dataConsentId: "fixture-consent", chatConnected: connected })
    },
    runtime: {
      onMessage: eventBus(), onConnect: eventBus(), sendMessage: () => Promise.resolve(), getURL: (path) => `${firefox ? "moz" : "chrome"}-extension://test/${path}`,
      getContexts: async () => windows.map((info) => ({ documentUrl: info.url, windowId: info.id }))
    },
    windows: {
      async create(options) { const info = { id: ++nextWindowId, left: 0, top: 0, state: "normal", ...options }; windows.push(info); return info; },
      async getAll(options = {}) { return windows.filter((info) => !options.windowTypes || options.windowTypes.includes(info.type)); },
      async update(id, values) { const info = windows.find((item) => item.id === id); Object.assign(info, values); return info; }
    },
    tabs: {
      async create(options) {
        const info = { id: tabs.length + 1, windowId: 200, pinned: false, active: true, ...options };
        tabs.push(info);
        if (!windows.some((window) => window.id === info.windowId)) windows.push({ id: info.windowId, type: "normal", url: info.url });
        return info;
      },
      async query() { return tabs.map((tab) => ({ ...tab })); },
      async get(id) { const tab = tabs.find((info) => info.id === id); if (!tab) throw new Error("Tab closed"); return tab; },
      async update(id, values) { const tab = tabs.find((info) => info.id === id); Object.assign(tab, values); return tab; }
    },
    alarms: { create() {}, onAlarm: eventBus() }
  };
  const context = vm.createContext({
    chrome, crypto, URL, console, AbortSignal, AbortController, indexedDB: new IDBFactory(), IDBKeyRange, WebSocket: Socket,
    setTimeout: (callback, delay) => schedule(callback, delay),
    clearTimeout: clearTimer,
    setInterval: (callback, delay) => schedule(callback, delay, true),
    clearInterval: clearTimer,
    fetch: async (url, options) => {
      requests.push({ url: String(url), options });
      if (fetchResponse) return fetchResponse(url, options);
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
  const sendMessage = (message) => new Promise((resolve) => {
    chrome.runtime.onMessage.emit(structuredClone(message), {}, (response) => resolve(structuredClone(response)));
  });
  return {
    context, chrome, sockets, requests, windows, tabs, sendMessage,
    call: (message) => context.handleMessage(message),
    dispose: () => { for (const timer of timers.keys()) clearTimer(timer); }
  };
}
