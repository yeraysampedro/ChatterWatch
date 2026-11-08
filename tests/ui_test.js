import { assert, assertEquals } from "jsr:@std/assert@1";
import { chromium, firefox } from "npm:playwright@1.56.1";

const browserName = Deno.env.get("CHATTER_BROWSER") || "chrome";
const launchBrowser = () => browserName === "firefox"
  ? firefox.launch({ headless: true })
  : chromium.launch({ channel: browserName, headless: true });

Deno.test({
  name: "headless dashboard: autosave, browser language, OAuth and sidebar APIs",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const browser = await launchBrowser();
    const screenshots = await Deno.makeTempDir({ prefix: "chatter-watch-dashboard-" });
    try {
      for (const firefoxApi of [false, true]) {
        const page = await browser.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(({ firefoxApi }) => {
          const settings = JSON.parse(sessionStorage.getItem("testSettings") || "null") || {
            channel: "primary", clientId: "client", ageLimitDays: 7, flagNewAccounts: true,
            recentFollowerDays: 1, messageThreshold: 3, flagFirstMessage: true, flagNewFollower: false,
            trustMessageThreshold: 10, matchMode: "any", autoTimeout: false, timeoutMinutes: 1
          };
          const state = { settings, status: "disconnected", chatters: 0, flagged: 0, newAccounts: 0, accounts: [] };
          const redirect = firefoxApi ? "https://test.extensions.allizom.org/" : "https://test.chromiumapp.org/twitch";
          window.testRequests = [];
          window.close = () => { window.testClosed = true; };
          const api = {
            i18n: { getUILanguage: () => firefoxApi ? "de-AT" : "fr-FR" },
            runtime: {
              connect: () => ({ onDisconnect: { addListener() {} } }),
              onMessage: { addListener: (listener) => { window.testStateUpdate = (accounts, approved = []) => {
                Object.assign(state, { accounts, approved, flagged: accounts.length });
                listener({ type: "STATE", state: { ...state, settings: window.ModerationCore.normalizeSettings(state.settings) } });
              }; } },
              sendMessage: async (message) => {
                window.testRequests.push(message);
                if (message.type === "GET_STATE") return { state: { ...state, settings: window.ModerationCore.normalizeSettings(settings) } };
                if (message.type === "GET_CHATTERS") {
                  let accounts = message.filter === "approved" ? state.approved || [] : message.filter === "pending" ? state.accounts : [...state.accounts, ...(state.approved || [])];
                  if (message.query) accounts = accounts.filter((account) => `${account.login} ${account.displayName}`.toLowerCase().includes(message.query.toLowerCase()));
                  const page = Math.max(0, Math.min(message.page || 0, Math.max(0, Math.ceil(accounts.length / 25) - 1)));
                  return { accounts: accounts.slice(page * 25, (page + 1) * 25), total: accounts.length, page, pageSize: 25, broadcasterId: "100" };
                }
                if (message.type === "GET_ACCOUNT_HISTORY") return { account: [...state.accounts, ...(state.approved || [])].find((account) => account.key === message.key) };
                if (message.type === "SAVE_SETTINGS") {
                  if (window.testHoldSettingsSave) {
                    window.testHoldSettingsSave = false;
                    await new Promise((resolve) => { window.testReleaseSettingsSave = resolve; });
                  }
                  if (window.testFailSettingsSave) {
                    window.testFailSettingsSave = false;
                    return { error: "Simulated save failure" };
                  }
                  sessionStorage.setItem("testSettings", JSON.stringify(message.settings));
                  state.settings = message.settings;
                  return { settings: message.settings };
                }
                return { ok: true };
              }
            },
            storage: {
              local: { get: async () => ({}), set: async () => {} },
              session: { remove: async (keys) => { window.testRemoved = keys; } },
              onChanged: { addListener: (listener) => { window.testPreferenceChange = listener; } }
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
        await page.goto(new URL("../src/dashboard.html", import.meta.url).href);
        await page.waitForFunction(() => document.querySelector("#channel-input").value === "primary");
        assertEquals(await page.locator("html").getAttribute("lang"), firefoxApi ? "de" : "en");
        assertEquals(await page.locator("body").getAttribute("data-theme"), "dark");
        for (const width of [1120, 1920, 2560, 320, 280]) {
          await page.setViewportSize({ width, height: 800 });
          const before = await page.evaluate(() => {
            const shell = document.querySelector(".shell").getBoundingClientRect();
            const tools = document.querySelector(".top-actions").getBoundingClientRect();
            return { left: shell.left, right: shell.right, width: shell.width, viewport: document.documentElement.clientWidth,
              overflow: document.documentElement.scrollWidth > innerWidth, toolsRight: tools.right };
          });
          assertEquals(before.overflow, false, JSON.stringify(before));
          assert(Math.abs(before.left) <= 1 && Math.abs(before.width - before.viewport) <= 1, `Dashboard must fill the page, not a centered strip: ${JSON.stringify(before)}`);
          assert(before.toolsRight <= before.viewport + 1, JSON.stringify(before));
          await page.evaluate(() => setTheme("light", false));
          const light = await page.locator(".shell").boundingBox();
          await page.evaluate(() => setTheme("dark", false));
          const dark = await page.locator(".shell").boundingBox();
          assertEquals(light, dark);
          await page.locator("#settings-toggle").click();
          const settingsBounds = await page.locator("#settings-panel").boundingBox();
          assert(Math.abs(settingsBounds.x) <= 1 && Math.abs(settingsBounds.width - before.viewport) <= 1, JSON.stringify(settingsBounds));
          await page.locator("#settings-close").click();
        }
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.screenshot({ path: `${screenshots}/${firefoxApi ? "firefox" : "chromium"}-wide-dark.png`, fullPage: true, animations: "disabled" });
        assertEquals(await page.locator("#redirect-uri").textContent(), await page.evaluate(() => window.testRedirect));
        await page.locator("#connect-button").click();
        await page.waitForFunction(() => window.testRequests.some((request) => request.type === "CONNECT"));
        assertEquals(await page.evaluate(() => window.testAuthorization.redirect_uri), await page.evaluate(() => window.testRedirect));
        assertEquals(await page.evaluate(() => window.testRequests.find((request) => request.type === "AUTH").accessToken), "test-token");
        await page.locator("#settings-toggle").click();
        await page.locator("#age-limit-input").fill("21");
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testSettings")).ageLimitDays === 21);
        assert(await page.locator("#settings-panel").isVisible());
        await page.evaluate(() => { window.testHoldSettingsSave = true; });
        await page.locator("#age-limit-input").fill("22");
        await page.waitForFunction(() => typeof window.testReleaseSettingsSave === "function");
        await page.locator("#age-limit-input").fill("23");
        await page.evaluate(() => window.testReleaseSettingsSave());
        assertEquals(await page.locator("#age-limit-input").inputValue(), "23");
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testSettings")).ageLimitDays === 23);
        await page.evaluate(() => { window.testFailSettingsSave = true; });
        await page.locator("#age-limit-input").fill("24");
        await page.waitForFunction(() => document.querySelector("#toast").textContent === "Simulated save failure");
        assertEquals(await page.evaluate(() => JSON.parse(sessionStorage.getItem("testSettings")).ageLimitDays), 23);
        await page.locator("#age-limit-input").fill("21");
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testSettings")).ageLimitDays === 21);
        await page.locator("#age-limit-input").fill("");
        await page.waitForFunction(() => settingsSaveTimer === null);
        assertEquals(await page.evaluate(() => JSON.parse(sessionStorage.getItem("testSettings")).ageLimitDays), 21);
        await page.locator("#age-limit-input").fill("21");
        await page.locator("#language-input").selectOption("es");
        await page.locator("label.switch").filter({ has: page.locator("#first-message-input") }).click();
        await page.locator("#match-all").click();
        await page.waitForFunction(() => {
          const saved = JSON.parse(sessionStorage.getItem("testSettings"));
          return saved.language === "es" && !saved.flagFirstMessage && saved.matchMode === "all";
        });
        await page.locator("#settings-close").click();
        await page.locator("#channel-input").fill("autosaved_channel");
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testSettings")).channel === "autosaved_channel");
        await page.reload();
        await page.waitForFunction(() => document.querySelector("#channel-input").value === "autosaved_channel");
        assertEquals(await page.locator("html").getAttribute("lang"), "es");
        assertEquals(await page.locator("#age-limit-input").inputValue(), "21");
        assertEquals(await page.locator("#metric-chatters").count(), 0);
        await page.locator("#settings-toggle").click();
        assertEquals(await page.locator("#client-id-input").getAttribute("type"), "password");
        await page.locator("#show-client-id").click();
        assertEquals(await page.locator("#client-id-input").getAttribute("type"), "text");
        await page.locator("#autoApproveMessages").check();
        await page.locator("#approvalThreshold").fill("12");
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testSettings")).approvalThreshold === 12);
        assertEquals(await page.evaluate(() => JSON.parse(sessionStorage.getItem("testSettings")).autoApproveMessages), true);
        await page.locator("#settings-close").click();
        await page.evaluate(() => window.testPreferenceChange({ appearance: { newValue: "light" } }, "local"));
        assertEquals(await page.locator("body").getAttribute("data-theme"), "light");
        await page.evaluate(() => window.testPreferenceChange({ appearance: { newValue: "dark" } }, "local"));
        await page.evaluate(() => window.testStateUpdate([{
          key: "100:77", displayName: "TestViewer", login: "viewer", lastMessageAt: Date.now(), ageDays: 2,
          messageCount: 1, reasons: ["new-account"], note: "Existing note", recentMessages: [{ text: "A test message", sentAt: Date.now() }]
        }]));
        await page.locator(".action-button.ban").click();
        assert((await page.locator(".action-dialog").textContent()).includes("TestViewer"));
        await page.locator(".dialog-cancel").click();
        assertEquals(await page.evaluate(() => window.testRequests.some((request) => request.type === "MODERATE")), false);
        await page.locator(".action-row .action-button").nth(1).click();
        await page.locator('.action-dialog input[name="duration"]').fill("300");
        await page.locator(".dialog-confirm").click();
        await page.waitForFunction(() => window.testRequests.some((request) => request.type === "MODERATE"));
        assertEquals(await page.evaluate(() => window.testRequests.findLast((request) => request.type === "MODERATE").duration), 300);
        assertEquals(await page.evaluate(() => window.testRequests.findLast((request) => request.type === "MODERATE").confirmed), true);
        await page.locator(".secondary-actions button").first().click();
        await page.locator('.action-dialog select[name="template"]').selectOption("RAID");
        await page.locator('.action-dialog input[name="source"]').fill("source_channel");
        await page.locator(".dialog-confirm").click();
        await page.waitForFunction(() => window.testRequests.some((request) => request.type === "NOTE"));
        assertEquals(await page.evaluate(() => window.testRequests.findLast((request) => request.type === "NOTE").note), "Existing note\nRAID source_channel");
        await page.evaluate(() => window.testStateUpdate(Array.from({ length: 60 }, (_, index) => ({
          key: `100:${index}`, login: `record_${index}`, displayName: `Record ${index}`, ageDays: 2, messageCount: 1,
          lastMessageAt: Date.now(), note: "Current <img src=x onerror=alert(1)> note",
          recentMessages: [{ text: "Previous stream message", sentAt: Date.now() - 86400000 }],
          activityHistory: [
            { type: "note", at: Date.now(), source: "manual", actor: "testmod", previousNote: "First note", note: "Current note" },
            { type: "timeout", at: Date.now() - 1000, source: "manual", actor: "testmod", duration: 300, reason: "Repeated messages" }
          ]
        }))));
        await page.locator('[data-filter="all"]').click();
        await page.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 25 && document.querySelector("#directory-status").textContent.includes("60"));
        await page.locator("#directory-next").click();
        await page.waitForFunction(() => document.querySelector("#directory-status").textContent.includes("2/3"));
        assert((await page.locator(".display-name").first().textContent()).includes("Record 25"));
        await page.locator("#chatter-search").fill("record_59");
        await page.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 1 && document.querySelector(".display-name").textContent === "Record 59");
        await page.locator(".action-row .action-button").nth(3).click();
        await page.waitForFunction(() => document.querySelector("#history-dialog").open);
        assert((await page.locator("#history-list").textContent()).includes("Previous stream message"));
        await page.locator('[data-history-view="notes"]').click();
        assert((await page.locator("#history-note").textContent()).includes("<img"));
        assertEquals(await page.locator("#history-dialog img").count(), 0);
        assert((await page.locator("#history-list").textContent()).includes("First note"));
        await page.locator('[data-history-view="actions"]').click();
        assert((await page.locator("#history-list").textContent()).includes("300 s"));
        assert((await page.locator("#history-list").textContent()).includes("Repeated messages"));
        await page.screenshot({ path: `${screenshots}/${firefoxApi ? "firefox" : "chromium"}-chatter-history.png`, fullPage: true, animations: "disabled" });
        await page.locator("#history-close").click();
        await page.locator("#chatter-search").fill("");
        await page.evaluate(() => window.testStateUpdate([], [{ key: "100:77", login: "viewer", displayName: "ApprovedViewer", isVetted: true, approvalSource: "automatic", approvalReason: "messages", messageCount: 20, lastMessageAt: Date.now() }]));
        await page.locator('[data-filter="approved"]').click();
        assert((await page.locator("#feed").textContent()).includes("ApprovedViewer"));
        assert((await page.locator("#feed").textContent()).includes("Aprobado: cantidad de mensajes"));
        await page.locator("#pin-window").click();
        assertEquals(await page.evaluate(() => window.testRequests.at(-1)), { type: "OPEN_DASHBOARD", page: true, pinned: true });
        await page.setViewportSize({ width: 360, height: 800 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert(await page.locator('[data-filter="approved"]').isVisible());
        await page.screenshot({ path: `${screenshots}/${firefoxApi ? "firefox" : "chromium"}-narrow.png`, fullPage: true, animations: "disabled" });
        await page.locator("#open-side-panel").click();
        await page.waitForFunction(() => window.testClosed);
        assertEquals(await page.evaluate(() => window.testSidebar), firefoxApi ? "firefox" : { windowId: 7 });
        assertEquals(errors, []);
        await page.close();
      }
      console.log(`Dashboard screenshots: ${screenshots}`);
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
          const config = JSON.parse(sessionStorage.getItem("testChatConfig") || "null") || {
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
          window.testRemoteChatSettings = () => {
            state.config.flow.batchMs = 480;
            state.revision += 1;
            sessionStorage.setItem("testChatConfig", JSON.stringify(state.config));
            window.testSend(structuredClone(state));
          };
          window.testBurst = (start, count) => window.testSend({
            type: "CHAT_BATCH", batches: [{ channel: "primary", entries: entries("primary", start, count), stats: { received: start + count, filtered: 2, overflow: 3, moderationSkipped: 4 } }]
          });
          window.chrome = {
            i18n: { getUILanguage: () => ({ es: "es-MX", en: "fr-FR", de: "de-AT" })[language] },
            runtime: {
              connect: () => ({
                onMessage: { addListener: (listener) => { listeners.push(listener); queueMicrotask(() => listener(structuredClone(state))); } },
                onDisconnect: { addListener() {} }, disconnect() {}
              }),
              sendMessage: async (message) => {
                window.testRequests.push(message);
                if (message.type === "LIST_WORKSPACES") return { names: [...workspaces.keys()] };
                if (message.type === "DELETE_MESSAGE") {
                  queueMicrotask(() => window.testSend({ type: "CHAT_PURGE", channel: message.channel, id: message.id }));
                  return { ok: true };
                }
                if (message.type === "TRANSLATE_MESSAGE") return { text: "Translated <img src=x onerror=alert(1)>", target: "en" };
                if (message.type === "SAVE_WORKSPACE") workspaces.set(message.name, structuredClone(state.config));
                if (message.type === "DELETE_WORKSPACE") workspaces.delete(message.name);
                if (message.type === "SAVE_CHAT_CONFIG") {
                  if (window.testHoldChatSave) {
                    window.testHoldChatSave = false;
                    await new Promise((resolve) => { window.testReleaseChatSave = resolve; });
                  }
                  if (message.revision !== state.revision) return { error: "Chat settings changed in another window. Reload settings and try again." };
                  state.config = message.config;
                  state.revision += 1;
                  sessionStorage.setItem("testChatConfig", JSON.stringify(state.config));
                  queueMicrotask(() => window.testSend(structuredClone(state)));
                  return { config: state.config, revision: state.revision };
                }
                return { ok: true };
              }
            },
            storage: { local: { get: async () => ({ settings: { translationUrl: "https://translate.example/translate" }, appearance: language === "en" ? "light" : undefined }) }, onChanged: { addListener() {} } }
          };
          if (firefoxApi) {
            window.browser = window.chrome;
            window.chrome = {};
          }
        }, { language, firefoxApi: browserName === "firefox" || language === "en" });
        await page.goto(new URL("../src/chat.html", import.meta.url).href);
        await page.waitForFunction(() => document.querySelectorAll(".chat-row").length > 0);
        await page.evaluate(() => {
          for (let index = 0; index < 20; index += 1) document.querySelector("#open-grid").dispatchEvent(new Event("click"));
        });
        assertEquals(await page.evaluate(() => window.testRequests.filter((request) => request.type === "OPEN_CHAT_WINDOW").length), 1);
        assertEquals(await page.locator(".chat-panel").count(), 6);
        assert(await page.locator(".chat-row").count() < 200);
        assertEquals(await page.locator(".chat-row img").count(), 0);
        assert(await page.evaluate(() => {
          const luminance = (color) => {
            const values = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
              const normalized = Number(value) / 255;
              return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
            });
            return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
          };
          const foreground = luminance(getComputedStyle(document.querySelector(".chat-row > span")).color);
          const background = luminance(getComputedStyle(document.querySelector(".chat-panel")).backgroundColor);
          return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05) >= 4.5;
        }), "Chat text must maintain AA contrast in both themes");
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: `${screenshots}/${width}-${language}.png`, fullPage: true });

        assertEquals(await page.locator("html").getAttribute("lang"), language);
        assertEquals(await page.locator("body").getAttribute("data-theme"), language === "en" ? "light" : "dark");
        await page.locator("#chat-settings").click();
        await page.locator("#batch-ms").fill("350");
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testChatConfig") || "null")?.flow.batchMs === 350);
        assert(await page.locator("#chat-settings-dialog").isVisible());
        await page.evaluate(() => { window.testHoldChatSave = true; });
        await page.locator("#batch-ms").fill("360");
        await page.waitForFunction(() => typeof window.testReleaseChatSave === "function");
        await page.locator("#batch-ms").fill("370");
        await page.evaluate(() => window.testReleaseChatSave());
        await page.waitForFunction(() => JSON.parse(sessionStorage.getItem("testChatConfig")).flow.batchMs === 370);
        assertEquals(await page.locator("#batch-ms").inputValue(), "370");
        assertEquals(await page.locator("#config-error").textContent(), "");
        await page.evaluate(() => window.testRemoteChatSettings());
        await page.locator("#batch-ms").fill("400");
        await page.waitForFunction(() => document.querySelector("#config-error").textContent.length > 0);
        assertEquals(await page.evaluate(() => JSON.parse(sessionStorage.getItem("testChatConfig")).flow.batchMs), 480);
        await page.keyboard.press("Escape");
        await page.locator("#chat-settings").click();
        assertEquals(await page.locator("#batch-ms").inputValue(), "480");
        await page.locator("#batch-ms").fill("350");
        await page.locator('[data-close="chat-settings-dialog"]').click();
        await page.reload();
        await page.waitForFunction(() => document.querySelectorAll(".chat-row").length > 0);
        await page.locator("#chat-settings").click();
        assertEquals(await page.locator("#batch-ms").inputValue(), "350");
        await page.locator('[data-close="chat-settings-dialog"]').click();

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
        assertEquals(await page.locator(".chat-row mark").first().evaluate((node) => getComputedStyle(node).color), "rgb(0, 0, 0)");

        await page.locator(".chat-viewport").first().locator(".chat-row").last().click();
        await page.waitForFunction(() => document.querySelectorAll(".pinned-message").length === 1);
        const pinnedEntry = await page.evaluate(() => [...pinnedMessages.values()][0]);
        const pinnedText = await page.locator(".pinned-message > p").innerText();
        assertEquals(await pause.getAttribute("aria-pressed"), "false");
        await page.evaluate(() => window.testBurst(1000, 10));
        await page.waitForFunction(() => document.querySelector(".chat-viewport").textContent.includes("message 1009"));
        assertEquals(await page.locator(".pinned-message > p").innerText(), pinnedText);
        await page.locator(".quick-timeout").click();
        await page.locator(".dialog-cancel").click();
        assertEquals(await page.evaluate(() => window.testRequests.some((request) => request.type === "QUICK_TIMEOUT")), false);
        await page.locator(".quick-timeout").click();
        await page.locator(".dialog-confirm").click();
        await page.waitForFunction(() => window.testRequests.at(-1).type === "QUICK_TIMEOUT");
        assertEquals(await page.evaluate(() => window.testRequests.at(-1)), { type: "QUICK_TIMEOUT", channel: "primary", id: pinnedEntry.id, confirmed: true });
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
        await page.locator('.chat-row button[data-action="delete"]').first().click();
        await page.locator(".dialog-cancel").click();
        assertEquals(await page.evaluate(() => window.testRequests.some((request) => request.type === "DELETE_MESSAGE")), false);
        await page.locator('.chat-row button[data-action="delete"]').first().click();
        await page.locator(".dialog-confirm").click();
        await page.waitForFunction(() => document.querySelector('.chat-row[data-deleted="true"]'));
        assertEquals(await page.evaluate(() => window.testRequests.findLast((request) => request.type === "DELETE_MESSAGE").confirmed), true);
        await page.locator('.chat-row button[data-action="translate"]').first().click();
        assert((await page.locator(".action-dialog").textContent()).includes("https://translate.example"));
        await page.locator(".dialog-confirm").click();
        await page.waitForFunction(() => document.querySelector("#message-dialog").open);
        assert((await page.locator("#message-text").textContent()).includes("Translated <img"));
        assertEquals(await page.locator("#message-dialog img").count(), 0);
        await page.locator('[data-close="message-dialog"]').click();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assertEquals(errors, []);
        await page.close();
      }
      console.log(`Headless screenshots: ${screenshots}`);
    } finally { await browser.close(); }
  }
});