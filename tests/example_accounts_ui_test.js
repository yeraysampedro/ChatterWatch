import { assert, assertEquals } from "jsr:@std/assert@1";
import { chromium, firefox } from "npm:playwright@1.56.1";
import { exampleAccounts, exampleApp, receiveExampleMessage } from "./example_accounts.js";
import { eventBus } from "./worker_harness.js";

const browserName = Deno.env.get("CHATTER_BROWSER") || "chrome";

Deno.test({
  name: "example accounts UI: review, notes, history, approval and confirmed moderation through the worker",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const firefoxApi = browserName === "firefox";
    const app = await exampleApp({ firefox: firefoxApi, realTimers: true });
    let browser;
    const pages = [];
    const connections = [];
    const deliveries = [];
    const errors = [];
    const runtimeRequests = [];
    const deliver = (page, message, portId = null) => {
      const delivery = page.evaluate(({ message, portId }) => window.exampleReceive(message, portId), { message: structuredClone(message), portId });
      deliveries.push(delivery);
      delivery.catch((error) => errors.push(error.message));
      return delivery;
    };
    app.chrome.runtime.sendMessage = (message) => Promise.all(pages.map((page) => deliver(page, message)));
    try {
      browser = await (firefoxApi ? firefox.launch({ headless: true }) : chromium.launch({ channel: browserName, headless: true }));
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await context.route(/^https?:\/\//, (route) => {
        errors.push(`Unexpected browser network request: ${route.request().url()}`);
        return route.abort("blockedbyclient");
      });
      const openView = async (name) => {
        const page = await context.newPage();
        const ports = new Map();
        connections.push(ports);
        page.on("pageerror", (error) => errors.push(error.message));
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
            identity: { getRedirectURL: () => firefoxApi ? "https://test.extensions.allizom.org/" : "https://test.chromiumapp.org/twitch" }
          };
          window.chrome = firefoxApi ? {} : api;
          if (firefoxApi) window.browser = api;
          window.addEventListener("pagehide", () => { for (const id of ports.keys()) void window.exampleDisconnect(id); });
        }, { firefoxApi });
        await page.goto(new URL(`../src/${name}.html`, import.meta.url).href);
        pages.push(page);
        return page;
      };

      const message = await receiveExampleMessage(app, exampleAccounts.newcomer, 1, { text: "Hello from SampleViewer01 <b>plain text</b>" });
      for (const account of [exampleAccounts.follower, exampleAccounts.regular, exampleAccounts.moderator]) {
        await receiveExampleMessage(app, account);
      }
      const dashboard = await openView("dashboard");
      const chat = await openView("chat");
      await dashboard.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 2);
      await chat.waitForFunction(() => document.querySelectorAll(".chat-row").length === 4);
      assertEquals(await dashboard.locator("#auth-label").textContent(), "@demo_moderator");
      assertEquals(await dashboard.locator("#filter-all-count").textContent(), "2");
      assertEquals(await chat.locator(".chat-row b").count(), 0);
      const card = dashboard.locator(".chatter-card").filter({ hasText: "@sample_viewer_01" });

      await card.getByRole("button", { name: "Ban", exact: true }).click();
      assert((await dashboard.locator(".action-dialog").textContent()).includes("#demo / SampleViewer01"));
      await dashboard.locator(".dialog-cancel").click();
      assertEquals(runtimeRequests.filter((request) => request.type === "MODERATE"), []);
      assertEquals(app.requests.filter((request) => request.options.method === "POST"), []);

      await card.getByRole("button", { name: "Timeout", exact: true }).click();
      await dashboard.locator('.action-dialog input[name="duration"]').fill("1");
      await dashboard.locator('.action-dialog input[name="reason"]').fill("Agreed example test");
      await receiveExampleMessage(app, exampleAccounts.follower, 2);
      assert((await dashboard.locator(".action-dialog").textContent()).includes("#demo / SampleViewer01"));
      await dashboard.locator(".dialog-confirm").click();
      await dashboard.waitForFunction(() => document.querySelector("#toast").textContent.includes("SampleViewer01"));
      const sanctions = app.requests.filter((request) => request.options.method === "POST");
      assertEquals(sanctions.length, 1);
      assertEquals(JSON.parse(sanctions[0].options.body), { data: { user_id: "501", duration: 1, reason: "Agreed example test" } });
      assertEquals(runtimeRequests.findLast((request) => request.type === "MODERATE"), {
        type: "MODERATE", key: "100:501", action: "timeout", duration: 1, reason: "Agreed example test", confirmed: true
      });
      assertEquals(await card.count(), 1);
      assertEquals(await dashboard.locator("#filter-all-count").textContent(), "2");

      const unban = card.getByRole("button", { name: "Unban / end timeout", exact: true });
      assertEquals(await unban.count(), 1, "An observed chatter needs a way to remove an active ban or timeout");
      await unban.click();
      assert((await dashboard.locator(".action-dialog").textContent()).includes("#demo / SampleViewer01"));
      await dashboard.locator(".dialog-cancel").click();
      assertEquals(runtimeRequests.filter((request) => request.action === "unban"), []);
      assertEquals(app.requests.filter((request) => request.options.method === "DELETE"), []);
      await unban.click();
      await dashboard.locator(".dialog-confirm").click();
      await dashboard.waitForFunction(() => document.querySelector("#toast").textContent.includes("Ban/timeout removed"));
      assertEquals(runtimeRequests.findLast((request) => request.type === "MODERATE"), {
        type: "MODERATE", key: "100:501", action: "unban", confirmed: true
      });

      await card.getByRole("button", { name: "Ban", exact: true }).click();
      await dashboard.locator(".dialog-confirm").click();
      await card.waitFor({ state: "detached" });
      await dashboard.locator('[data-filter="all"]').click();
      await dashboard.locator("#chatter-search").fill("sample_viewer_01");
      await card.waitFor();
      await unban.click();
      await dashboard.locator(".dialog-confirm").click();
      await dashboard.waitForFunction(() => document.querySelector("#filter-all-count").textContent === "2");
      const removals = app.requests.filter((request) => request.options.method === "DELETE");
      assertEquals(removals.length, 2);
      assert(removals.every((request) => request.url === "https://api.twitch.tv/helix/moderation/bans?broadcaster_id=100&moderator_id=42&user_id=501"));
      await dashboard.locator("#chatter-search").fill("");
      await dashboard.locator('[data-filter="pending"]').click();
      await card.waitFor();

      await card.locator(".secondary-actions button").first().click();
      await dashboard.locator('.action-dialog textarea[name="note"]').fill("Reviewer sample <b>note</b>");
      await dashboard.locator(".dialog-confirm").click();
      await card.locator(".note-line").waitFor();
      await card.locator(".secondary-actions button").first().click();
      await dashboard.locator('.action-dialog select[name="template"]').selectOption("RAID");
      await dashboard.locator('.action-dialog input[name="source"]').fill("sample_a");
      await dashboard.locator(".dialog-confirm").click();
      await dashboard.waitForFunction(() => document.querySelector(".note-line")?.textContent.includes("RAID sample_a"));
      assertEquals(await card.locator(".note-line b").count(), 0);
      await card.getByRole("button", { name: "History", exact: true }).click();
      await dashboard.locator("#history-dialog").waitFor({ state: "visible" });
      assert((await dashboard.locator("#history-list").textContent()).includes(message.text));
      await dashboard.locator('[data-history-view="notes"]').click();
      assert((await dashboard.locator("#history-list").textContent()).includes("Reviewer sample <b>note</b>"));
      assert((await dashboard.locator("#history-note").textContent()).includes("RAID sample_a"));
      await dashboard.locator('[data-history-view="actions"]').click();
      const historyText = await dashboard.locator("#history-list").textContent();
      assert(historyText.includes("1 s") && historyText.includes("Agreed example test") && historyText.includes("@demo_moderator"));
      await dashboard.locator("#history-close").click();

      await card.locator(".vet").click();
      await dashboard.waitForFunction(() => document.querySelector("#filter-all-count").textContent === "1");
      await card.waitFor({ state: "detached" });
      assertEquals(await card.count(), 0);
      await dashboard.locator('[data-filter="approved"]').click();
      await card.waitFor();
      assert((await card.textContent()).includes("Manually approved"));
      const approved = (await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account;
      assertEquals(approved.approvalSource, "manual");
      assertEquals(approved.activityHistory.map((event) => event.type), ["approval", "note", "note", "unban", "ban", "unban", "timeout"]);
      assertEquals(approved.activityHistory[1].previousNote, "Reviewer sample <b>note</b>");

      await chat.waitForFunction(() => document.querySelectorAll(".chat-row").length === 5);
      const row = chat.locator(".chat-row").filter({ hasText: message.text });
      await row.waitFor();
      await row.locator('[data-action="pin"]').click();
      await chat.locator(".pinned-message").waitFor();
      await row.locator('[data-action="delete"]').click();
      assert((await chat.locator(".action-dialog").textContent()).includes("#demo / SampleViewer01"));
      await chat.locator(".dialog-cancel").click();
      assertEquals(runtimeRequests.filter((request) => request.type === "DELETE_MESSAGE"), []);
      assertEquals(app.requests.filter((request) => new URL(request.url).pathname === "/helix/moderation/chat"), []);
      await row.locator('[data-action="delete"]').click();
      await chat.locator(".dialog-confirm").click();
      await chat.waitForFunction(() => document.querySelector('.chat-row[data-deleted="true"]')?.textContent.includes("SampleViewer01"));
      assertEquals(await chat.locator(".pinned-message").getAttribute("data-deleted"), "true");
      const deletions = app.requests.filter((request) => new URL(request.url).pathname === "/helix/moderation/chat" && request.options.method === "DELETE");
      assertEquals(deletions.length, 1);
      assertEquals(new URL(deletions[0].url).searchParams.get("message_id"), "demo-501-1");
      const retained = (await app.request({ type: "GET_CHAT_STATE" })).channels[0].entries;
      assertEquals(retained.length, 5);
      assertEquals(retained.filter((entry) => entry.deleted).map((entry) => entry.id), ["demo-501-1"]);

      await dashboard.locator("#connect-button").click();
      await dashboard.waitForFunction(() => document.querySelector(".stream-status").dataset.status === "disconnected");
      await dashboard.locator('[data-filter="all"]').click();
      await dashboard.locator("#chatter-search").fill("sample_viewer_01");
      await dashboard.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 1);
      await card.getByRole("button", { name: "History", exact: true }).click();
      await dashboard.locator("#history-dialog").waitFor({ state: "visible" });
      assert((await dashboard.locator("#history-list").textContent()).includes(message.text));
      await dashboard.locator('[data-history-view="notes"]').click();
      assert((await dashboard.locator("#history-note").textContent()).includes("RAID sample_a"));
      await Promise.all(deliveries);
      assertEquals(errors, []);
    } finally {
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
    }
  }
});
