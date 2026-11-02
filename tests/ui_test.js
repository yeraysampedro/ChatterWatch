import { assert, assertEquals } from "jsr:@std/assert@1";
import { chromium } from "npm:playwright@1.56.1";

Deno.test({
  name: "headless multichat: virtual rows, pause/resume, deletions, settings and responsive layouts",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const browser = await chromium.launch({ channel: Deno.env.get("CHATTER_BROWSER") || "chrome", headless: true });
    const screenshots = await Deno.makeTempDir({ prefix: "chatter-watch-ui-" });
    try {
      for (const [width, height, language] of [[1440, 1000, "es"], [768, 1024, "en"], [360, 800, "de"]]) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.addInitScript(({ language }) => {
          const listeners = [];
          const channels = ["primary", "secondary", "third", "fourth", "fifth", "sixth"];
          const config = {
            channels: channels.slice(1), columns: 3,
            flow: { batchMs: 200, localSlowSeconds: 0, spamEnabled: true, repeatLimit: 3, frequencyLimit: 6, windowSeconds: 10, pattern: "", pauseOnHover: true }
          };
          const entries = (channel, start, count) => Array.from({ length: count }, (_, index) => ({
            channel, id: `${channel}-${start + index}`, sequence: start + index + 1, userId: "user", login: "viewer",
            displayName: "LongDisplayName_1234567890", text: `message ${start + index} <img src=x onerror=alert(1)> ${"longword".repeat(15)}`, sentAt: Date.now()
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
        }, { language });
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
        await page.waitForFunction(() => !document.querySelector(".chat-viewport").textContent.includes("message 3000"));
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
        await page.locator("#chat-settings-form button[type=submit]").click();
        await page.waitForFunction(() => !document.querySelector("#chat-settings-dialog").open);
        assertEquals(await page.evaluate(() => window.testRequests.at(-1).config.flow.pattern), "\\bpromo\\b|buy now");
        await page.locator(".chat-panel-header button").nth(1).click();
        assertEquals(await page.evaluate(() => window.testRequests.at(-1).channel), "primary");
        assertEquals(errors, []);
        await page.close();
      }
      console.log(`Headless screenshots: ${screenshots}`);
    } finally { await browser.close(); }
  }
});