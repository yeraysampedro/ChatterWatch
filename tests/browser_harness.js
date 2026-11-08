import { chromium, firefox } from "npm:playwright@1.56.1";
import { eventBus } from "./worker_harness.js";

export const browserName = Deno.env.get("CHATTER_BROWSER") || "chrome";

export async function browserHarness(app, { allowAvatars = false } = {}) {
  const firefoxApi = browserName === "firefox";
  let browser;
  let ready = false;
  const pages = new Set();
  const connections = [];
  const deliveries = [];
  const errors = [];
  const runtimeRequests = [];
  const avatarRequests = [];
  const deliver = (page, message, portId = null) => {
    if (page.isClosed()) return Promise.resolve();
    const delivery = page.evaluate(({ message, portId }) => window.exampleReceive(message, portId), { message: structuredClone(message), portId });
    deliveries.push(delivery);
    delivery.catch((error) => errors.push(error.message));
    return delivery;
  };
  const dispose = async () => {
    app.chrome.runtime.sendMessage = () => Promise.resolve();
    for (const ports of connections) {
      for (const port of ports.values()) port.onDisconnect.emit();
      ports.clear();
    }
    try {
      await app.request({ type: "DISCONNECT" });
      await Promise.all(deliveries);
    } finally {
      app.dispose();
      await browser?.close();
    }
  };
  try {
    browser = await (firefoxApi ? firefox.launch({ headless: true }) : chromium.launch({ channel: browserName, headless: true }));
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route(/^https?:\/\//, (route) => {
      if (allowAvatars && new URL(route.request().url()).origin === "https://avatars.example") {
        avatarRequests.push(route.request().url());
        return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#83c397"/></svg>' });
      }
      errors.push(`Unexpected browser network request: ${route.request().url()}`);
      return route.abort("blockedbyclient");
    });
    app.chrome.runtime.sendMessage = (message) => Promise.all([...pages].map((page) => deliver(page, message)));
    const openView = async (name) => {
      const page = await context.newPage();
      const ports = new Map();
      connections.push(ports);
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("close", () => {
        pages.delete(page);
        for (const port of ports.values()) port.onDisconnect.emit();
        ports.clear();
      });
      await page.exposeFunction("exampleRequest", (message) => {
        runtimeRequests.push(message);
        return app.sendMessage(message);
      });
      await page.exposeFunction("exampleStorageGet", (keys) => app.chrome.storage.local.get(keys));
      await page.exposeFunction("exampleStorageSet", (values) => app.chrome.storage.local.set(values));
      await page.exposeFunction("exampleConnect", (id, name) => {
        const port = { name, onDisconnect: eventBus(), postMessage: (message) => { void deliver(page, message, id); } };
        ports.set(id, port);
        app.chrome.runtime.onConnect.emit(port);
      });
      await page.exposeFunction("exampleDisconnect", (id) => {
        ports.get(id)?.onDisconnect.emit();
        ports.delete(id);
      });
      await page.addInitScript(({ firefoxApi }) => {
        const listeners = [];
        const ports = new Map();
        const redirect = firefoxApi ? "https://test.extensions.allizom.org/" : "https://test.chromiumapp.org/twitch";
        window.exampleAuthorizations = [];
        window.exampleReceive = (message, portId) => {
          for (const listener of portId === null ? listeners : ports.get(portId) || []) listener(message);
        };
        const api = {
          i18n: { getUILanguage: () => "en-US" },
          runtime: {
            sendMessage: (message) => window.exampleRequest(message),
            onMessage: { addListener: (listener) => listeners.push(listener) },
            connect: ({ name }) => {
              const id = crypto.randomUUID();
              const callbacks = [];
              ports.set(id, callbacks);
              void window.exampleConnect(id, name);
              return {
                onMessage: { addListener: (listener) => callbacks.push(listener) },
                onDisconnect: { addListener() {} },
                disconnect() { ports.delete(id); void window.exampleDisconnect(id); }
              };
            }
          },
          storage: {
            local: { get: (keys) => window.exampleStorageGet(keys), set: (values) => window.exampleStorageSet(values) },
            onChanged: { addListener() {} }
          },
          identity: {
            getRedirectURL: () => redirect,
            launchWebAuthFlow: async ({ url }) => {
              const parameters = new URL(url).searchParams;
              window.exampleAuthorizations.push(Object.fromEntries(parameters));
              if (window.exampleHoldAuth) await new Promise((resolve) => { window.exampleReleaseAuth = resolve; });
              return `${redirect}#access_token=test-token&state=${parameters.get("state")}`;
            }
          }
        };
        window.chrome = firefoxApi ? {} : api;
        if (firefoxApi) window.browser = api;
        window.addEventListener("pagehide", () => { for (const id of ports.keys()) void window.exampleDisconnect(id); });
      }, { firefoxApi });
      await page.goto(new URL(`../src/${name}.html`, import.meta.url).href);
      pages.add(page);
      return page;
    };
    ready = true;
    return { openView, errors, runtimeRequests, avatarRequests, deliveries, dispose };
  } finally { if (!ready) await dispose(); }
}
