import { assert, assertEquals } from "jsr:@std/assert@1";
import { chromium, firefox } from "npm:playwright@1.56.1";

const browserName = Deno.env.get("CHATTER_BROWSER") || "chrome";
const launchBrowser = () => browserName === "firefox"
  ? firefox.launch({ headless: true })
  : chromium.launch({ channel: browserName, headless: true });

Deno.test({
  name: "headless dashboard: Chromium and Firefox OAuth, storage and sidebar APIs",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const browser = await launchBrowser();
    try {
      for (const firefoxApi of [false, true]) {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(({ firefoxApi }) => {
          const settings = {
            channel: "primary", clientId: "client", language: "en", ageLimitDays: 7, flagNewAccounts: true,
            recentFollowerDays: 1, messageThreshold: 3, flagFirstMessage: true, flagNewFollower: false,
            trustMessageThreshold: 10, matchMode: "any", autoTimeout: false, timeoutMinutes: 1
          };
          const state = { settings, status: "disconnected", chatters: 0, flagged: 0, newAccounts: 0, accounts: [] };
          const redirect = firefoxApi ? "https://test.extensions.allizom.org/" : "https://test.chromiumapp.org/twitch";
          window.testRequests = [];
          window.close = () => { window.testClosed = true; };
          const api = {
            runtime: {
              connect: () => ({ onDisconnect: { addListener() {} } }),
              onMessage: { addListener() {} },
              sendMessage: async (message) => {
                window.testRequests.push(message);
                if (message.type === "GET_STATE") return { state };
                if (message.type === "SAVE_SETTINGS") return { settings: message.settings };
                return { ok: true };
              }
            },
            storage: {
              local: { get: async () => ({ appearance: "dark" }), set: async () => {} },
              session: { remove: async (keys) => { window.testRemoved = keys; } }
            },
            identity: {
              getRedirectURL: () => redirect,
              launchWebAuthFlow: async ({ url }) => {
                const authorization = new URL(url);
                window.testAuthorization = Object.fromEntries(authorization.searchParams);
                return `${redirect}#access_token=test-token&state=${authorization.searchParams.get("state")}`;
              }
            },
            ...(firefoxApi
              ? { sidebarAction: { open: async () => { window.testSidebar = "firefox"; } } }
              : { windows: { getCurrent: async () => ({ id: 7 }) }, sidePanel: { open: async (options) => { window.testSidebar = options; } } })
          };
          window.chrome = firefoxApi ? {} : api;
          if (firefoxApi) window.browser = api;
          window.testRedirect = redirect;
        }, { firefoxApi });
        await page.goto(new URL("../dashboard.html", import.meta.url).href);
        await page.waitForFunction(() => document.querySelector("#channel-input").value === "primary");
        assertEquals(await page.locator("body").getAttribute("data-theme"), "dark");
        assertEquals(await page.locator("#redirect-uri").textContent(), await page.evaluate(() => window.testRedirect));
        await page.locator("#connect-button").click();
        await page.waitForFunction(() => window.testRequests.some((request) => request.type === "CONNECT"));
        assertEquals(await page.evaluate(() => window.testAuthorization.redirect_uri), await page.evaluate(() => window.testRedirect));
        assertEquals(await page.evaluate(() => window.testRequests.find((request) => request.type === "AUTH").accessToken), "test-token");
        await page.locator("#open-side-panel").click();
        await page.waitForFunction(() => window.testClosed);
        assertEquals(await page.evaluate(() => window.testSidebar), firefoxApi ? "firefox" : { windowId: 7 });
        assertEquals(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  }
});

Deno.test({
  name: "headless multichat: virtual rows, pause/resume, deletions, settings and responsive layouts",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const browser = await launchBrowser();
    const screenshots = await Deno.makeTempDir({ prefix: "chatter-watch-ui-" });
    try {
      for (const [width, height, language] of [[1440, 1000, "es"], [768, 1024, "en"], [360, 800, "de"]]) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(({ language, firefoxApi }) => {
          const listeners = [];
          const workspaces = new Map();
          const channels = ["primary", "secondary", "third", "fourth", "fifth", "sixth"];
          const config = {
            channels: channels.slice(1), columns: 3, viewMode: "grid", highlights: [],
            flow: { batchMs: 200, localSlowSeconds: 0, spamEnabled: true, repeatLimit: 3, frequencyLimit: 6, windowSeconds: 10, pattern: "", pauseOnHover: true }
          };
          const entries = (channel, start, count) => Array.from({ length: count }, (_, index) => ({
            channel, id: `${channel}-${start + index}`, sequence: start + index + 1, userId: "7", login: "viewer",
            displayName: "LongDisplayName_1234567890", text: `message ${start + index} <img src=x onerror=alert(1)> ${"longword".repeat(15)}`, sentAt: 1700000000000 + (start + index) * 1000 + channels.indexOf(channel)
          }));
          const state = {
            type: "CHAT_STATE", config, revision: 0, status: "connected", primaryChannel: "primary",
            rooms: Object.fromEntries(channels.map((channel) => [channel, { connected: true, slow: 0 }])),
            channels: channels.map((channel) => ({ channel, entries: entries(channel, 0, 1000), stats: { received: 1000, filtered: 0, overflow: 0, moderationSkipped: 0 } }))
          };
          window.testRequests = [];
          window.testSend = (message) => listeners.forEach((listener) => listener(message));
          window.testBurst = (start, count) => window.testSend({
            type: "CHAT_BATCH", batches: [{ channel: "primary", entries: entries("primary", start, count), stats: { received: start + count, filtered: 2, overflow: 3, moderationSkipped: 4 } }]
          });
          window.chrome = {
            runtime: {
              connect: () => ({
                onMessage: { addListener: (listener) => { listeners.push(listener); queueMicrotask(() => listener(structuredClone(state))); } },
                onDisconnect: { addListener() {} }, disconnect() {}
              }),
              sendMessage: async (message) => {
                window.testRequests.push(message);
                if (message.type === "LIST_WORKSPACES") return { names: [...workspaces.keys()] };
                if (message.type === "SAVE_WORKSPACE") workspaces.set(message.name, structuredClone(state.config));
                if (message.type === "DELETE_WORKSPACE") workspaces.delete(message.name);
                if (message.type === "SAVE_CHAT_CONFIG") {
                  state.config = message.config;
                  state.revision += 1;
                  queueMicrotask(() => window.testSend(structuredClone(state)));
                }
                return { ok: true };
              }
            },
            storage: { local: { get: async () => ({ settings: { language }, appearance: "light" }) }, onChanged: { addListener() {} } }
          };
          if (firefoxApi) {
            window.browser = window.chrome;
            window.chrome = {};
          }
        }, { language, firefoxApi: browserName === "firefox" || language === "en" });
        await page.goto(new URL("../chat.html", import.meta.url).href);
        await page.waitForFunction(() => document.querySelectorAll(".chat-row").length > 0);
        assertEquals(await page.locator(".chat-panel").count(), 6);
        assert(await page.locator(".chat-row").count() < 200);
        assertEquals(await page.locator(".chat-row img").count(), 0);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: `${screenshots}/${width}-${language}.png`, fullPage: true });

        const pause = page.locator(".chat-pause").first();
        const viewport = page.locator(".chat-viewport").first();
        const beforePause = await page.evaluate(() => ({ reasons: [...panels.get("primary").view.reasons], focused: document.activeElement?.className }));
        await pause.click();
        assertEquals(await pause.getAttribute("aria-pressed"), "true", JSON.stringify({ beforePause, afterPause: await page.evaluate(() => [...panels.get("primary").view.reasons]) }));
        const frozen = await viewport.innerText();
        await page.evaluate(() => window.testBurst(1000, 3000));
        assertEquals(await viewport.innerText(), frozen);
        assertEquals(await page.evaluate(() => panels.get("primary").view.buffer.size), 1000);
        await pause.click();
        await page.waitForFunction(() => document.querySelector(".chat-viewport").textContent.includes("message 3999"));
        assertEquals(await pause.getAttribute("aria-pressed"), "false");

        await viewport.evaluate((node) => {
          node.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
          node.scrollTop = 0;
          node.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => document.querySelector(".chat-pause").getAttribute("aria-pressed") === "true");
        await page.waitForFunction(() => document.querySelector(".chat-viewport").textContent.includes("message 3000"));
        await viewport.evaluate((node) => {
          node.scrollTop = node.scrollHeight;
          node.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => !panels.get("primary").view.reasons.has("scroll"));
        await viewport.evaluate((node) => {
          node.dispatchEvent(new WheelEvent("wheel", { deltaY: -100 }));
          node.scrollTop = 0;
          node.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => document.querySelector(".chat-viewport").textContent.includes("message 3000"));
        await page.evaluate(() => window.testSend({ type: "CHAT_PURGE", channel: "primary", id: "primary-3000" }));
        await page.waitForFunction(() => document.querySelector('.chat-row[data-deleted="true"]')?.textContent.includes("message 3000"));
        await pause.click();
        await viewport.hover();
        assertEquals(await pause.getAttribute("aria-pressed"), "true");
        await page.locator("h1").hover();
        await page.waitForFunction(() => document.querySelector(".chat-pause").getAttribute("aria-pressed") === "false");

        await page.locator("#chat-settings").click();
        await page.locator("#spam-pattern").fill("(a+)+$");
        await page.locator("#chat-settings-form button[type=submit]").click();
        assert((await page.locator("#config-error").innerText()).length > 0);
        await page.locator("#spam-pattern").fill("\\bpromo\\b|buy now");
        await page.locator("#pause-hover").uncheck();
        await page.locator("#add-highlight").click();
        await page.locator('.highlight-rule input[type="text"]').fill("message");
        await page.locator('.highlight-rule input[type="color"]').fill("#00ff00");
        await page.locator("#chat-settings-form button[type=submit]").click();
        await page.waitForFunction(() => !document.querySelector("#chat-settings-dialog").open);
        assertEquals(await page.evaluate(() => window.testRequests.at(-1).config.flow.pattern), "\\bpromo\\b|buy now");
        await page.locator(".chat-panel-header button").nth(1).click();
        assertEquals(await page.evaluate(() => window.testRequests.at(-1).channel), "primary");
        await page.waitForFunction(() => document.querySelector(".chat-row mark")?.textContent === "message");
        assertEquals(await page.locator(".chat-row mark").first().evaluate((node) => getComputedStyle(node).backgroundColor), "rgb(0, 255, 0)");

        await page.locator(".chat-viewport").first().locator(".chat-row").last().click();
        await page.waitForFunction(() => document.querySelectorAll(".pinned-message").length === 1);
        const pinnedEntry = await page.evaluate(() => [...pinnedMessages.values()][0]);
        const pinnedText = await page.locator(".pinned-message > p").innerText();
        assertEquals(await pause.getAttribute("aria-pressed"), "false");
        await page.evaluate(() => window.testBurst(1000, 10));
        await page.waitForFunction(() => document.querySelector(".chat-viewport").textContent.includes("message 1009"));
        assertEquals(await page.locator(".pinned-message > p").innerText(), pinnedText);
        await page.locator(".quick-timeout").click();
        assertEquals(await page.evaluate(() => window.testRequests.at(-1)), { type: "QUICK_TIMEOUT", channel: "primary", id: pinnedEntry.id });
        await page.evaluate((id) => window.testSend({ type: "CHAT_PURGE", channel: "primary", id }), pinnedEntry.id);
        assertEquals(await page.locator(".pinned-message").getAttribute("data-deleted"), "true");
        await page.screenshot({ path: `${screenshots}/${width}-${language}-features.png`, fullPage: true });
        const downloading = page.waitForEvent("download");
        await page.locator(".export-chat").first().click();
        const download = await downloading;
        assert(download.suggestedFilename().endsWith(".txt"));
        const exported = await Deno.readTextFile(await download.path());
        assert(exported.includes("[deleted]"));
        assert(exported.includes("#primary LongDisplayName_1234567890"));
        assertEquals(exported.trim().split("\n").length, 1000);

        await page.locator('[data-mode="unified"]').click();
        await page.waitForFunction(() => document.querySelectorAll(".chat-panel").length === 1);
        await page.waitForFunction(() => document.querySelectorAll(".channel-tag").length > 0);
        assertEquals(await page.evaluate(() => panels.get("*").view.buffer.size), 1000);
        assertEquals(await page.evaluate(() => new Set(panels.get("*").view.buffer.values().map((entry) => entry.channel)).size), 6);
        assertEquals(await page.locator(".slow-form").isVisible(), false);

        await viewport.evaluate((node) => {
          node.dispatchEvent(new WheelEvent("wheel", { deltaY: -1 }));
          node.scrollTop -= 1;
          node.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => panels.get("*").view.reasons.has("scroll"));
        const lockedTop = await viewport.evaluate((node) => node.scrollTop);
        await page.evaluate(() => window.testBurst(1100, 10));
        await page.locator("h1").hover();
        assertEquals(await viewport.evaluate((node) => node.scrollTop), lockedTop);
        assertEquals(await pause.getAttribute("aria-pressed"), "true");
        await viewport.evaluate((node) => {
          node.dispatchEvent(new WheelEvent("wheel", { deltaY: 1 }));
          node.scrollTop = node.scrollHeight;
          node.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => !panels.get("*").view.paused);
        assert(await page.evaluate(() => {
          const entries = panels.get("*").view.buffer.values();
          return entries.every((entry, index) => !index || entries[index - 1].sentAt <= entry.sentAt);
        }));
        assertEquals(await page.evaluate(() => {
          const view = panels.get("*").view;
          view.replace([
            { channel: "primary", id: "second", sequence: 2, sentAt: 1000, text: "earlier clock", login: "user" },
            { channel: "primary", id: "first", sequence: 1, sentAt: 2000, text: "later clock", login: "user" }
          ]);
          return view.buffer.size;
        }), 2);

        await page.locator("#open-workspaces").click();
        await page.locator("#workspace-name").fill("Stream setup");
        await page.locator("#workspace-form button").click();
        await page.waitForFunction(() => document.querySelector("#workspace-select").value === "Stream setup");
        await page.locator("#restore-workspace").click();
        assertEquals(await page.evaluate(() => window.testRequests.findLast((request) => request.type === "RESTORE_WORKSPACE").name), "Stream setup");
        page.once("dialog", (dialog) => dialog.accept());
        await page.locator("#delete-workspace").click();
        await page.waitForFunction(() => document.querySelector("#restore-workspace").disabled);
        await page.locator('[data-close="workspaces-dialog"]').click();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assertEquals(errors, []);
        await page.close();
      }
      console.log(`Headless screenshots: ${screenshots}`);
    } finally { await browser.close(); }
  }
});