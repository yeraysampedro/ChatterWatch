import { assert, assertEquals } from "jsr:@std/assert@1";
import { exampleAccounts, exampleApp, receiveExampleMessage } from "./example_accounts.js";
import { browserHarness, browserName } from "./browser_harness.js";

const copy = {
  en: { title: "Data use before Twitch features start", translator: "translation provider", history: "History" },
  es: { title: "Uso de datos antes de activar Twitch", translator: "traductor", history: "Historial" },
  de: { title: "Datennutzung vor dem Start der Twitch-Funktionen", translator: "bersetzer", history: "Verlauf" }
};

for (const language of ["en", "es", "de"]) Deno.test({
  name: `privacy UI (${language}): affirmative consent precedes OAuth and avatars; withdrawal preserves offline history`,
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const app = await exampleApp({ firefox: browserName === "firefox", realTimers: true, profileImages: true, settings: { language } });
    const ui = await browserHarness(app, { allowAvatars: true });
    try {
      await receiveExampleMessage(app, exampleAccounts.newcomer);
      await app.request({ type: "NOTE", key: "100:501", note: "Keep this local note" });
      assertEquals((await app.request({ type: "GET_ACCOUNT_HISTORY", key: "100:501" })).account.profileImage, "https://avatars.example/501.png");
      await app.request({ type: "SET_DATA_CONSENT", accepted: false });
      const before = app.requests.length;
      let page = await ui.openView("dashboard");
      await page.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 1);
      assertEquals(await page.locator("html").getAttribute("lang"), language);
      assert(await page.locator("#privacy-banner").isVisible());
      assertEquals(await page.locator(".avatar img").count(), 0);
      assertEquals(ui.avatarRequests, []);
      assert(await page.locator("#channel-input").isDisabled());
      assert(await page.locator(".vet").isDisabled());

      await page.locator("#connect-button").click();
      const dialog = page.locator(".action-dialog");
      await dialog.waitFor();
      assertEquals(await dialog.locator("h2").textContent(), copy[language].title);
      const notice = await dialog.locator("p").textContent();
      for (const term of ["OAuth", "Twitch", "CDN", "50", "100", "IP", copy[language].translator]) assert(notice.includes(term), term);
      assertEquals(await dialog.evaluate((node) => node.scrollTop), 0, "The disclosure must open at its beginning, not jump to the accept button");
      assertEquals(await dialog.getByRole("checkbox").isChecked(), false);
      await dialog.locator(".dialog-confirm").click();
      assert(await dialog.isVisible());
      assertEquals(await page.evaluate(() => window.exampleAuthorizations.length), 0);
      assertEquals(app.requests.length, before);
      assertEquals(ui.runtimeRequests.filter((request) => request.type === "AUTH" || request.type === "CONNECT"), []);
      await dialog.locator(".dialog-cancel").click();
      assertEquals((await app.request({ type: "GET_DATA_CONSENT" })).dataConsent.accepted, false);
      assertEquals(ui.avatarRequests, []);

      await page.locator("#connect-button").click();
      await dialog.getByRole("checkbox").check();
      await dialog.locator(".dialog-confirm").click();
      await page.waitForFunction(() => document.querySelector(".stream-status").dataset.status === "connecting");
      assertEquals(await page.evaluate(() => window.exampleAuthorizations.length), 1);
      const socket = app.sockets.at(-1);
      socket.open();
      socket.receive(":tmi 001 demo_moderator :Welcome");
      socket.receive("@room-id=100;slow=0 :tmi ROOMSTATE #demo");
      await page.waitForFunction(() => document.querySelector(".stream-status").dataset.status === "connected");
      await page.waitForFunction(() => document.querySelector(".avatar img")?.complete && document.querySelector(".avatar img").naturalWidth > 0);
      assert(ui.avatarRequests.length > 0, "The fixture must exercise the remote-avatar path when consent is allowed");
      const oldState = (await app.request({ type: "GET_STATE" })).state;
      assert(oldState.dataConsent.accepted);

      await page.locator("#settings-toggle").click();
      await page.locator("#privacy-withdraw").click();
      await page.waitForFunction(() => !document.querySelector("#privacy-allow").hidden && document.querySelector("#privacy-withdraw").hidden);
      await page.locator("#settings-close").click();
      assert(await page.locator("#privacy-banner").isVisible());
      assertEquals(await page.locator(".avatar img").count(), 0);
      assert(await page.locator(".vet").isDisabled());
      assertEquals((await app.chrome.storage.session.get("accessToken")).accessToken, undefined);
      await page.evaluate((state) => window.exampleReceive({ type: "STATE", state }, null), oldState);
      assert(await page.locator("#privacy-banner").isVisible(), "A late snapshot must not restore a withdrawn grant");
      assertEquals(await page.locator(".avatar img").count(), 0);

      const offlineRequests = app.requests.length;
      const avatarRequests = ui.avatarRequests.length;
      await page.close();
      page = await ui.openView("dashboard");
      await page.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 1);
      assertEquals(await page.locator(".avatar img").count(), 0);
      assertEquals(ui.avatarRequests.length, avatarRequests);
      await page.getByRole("button", { name: copy[language].history, exact: true }).click();
      await page.locator("#history-dialog").waitFor({ state: "visible" });
      await page.locator('[data-history-view="notes"]').click();
      assertEquals(await page.locator("#history-note").textContent(), "Keep this local note");
      await page.locator("#history-close").click();
      assertEquals(app.requests.length, offlineRequests);

      if (language === "en") {
        await page.evaluate(() => { window.exampleHoldAuth = true; });
        await page.locator("#connect-button").click();
        await page.locator(".action-dialog").getByRole("checkbox").check();
        await page.locator(".dialog-confirm").click();
        await page.waitForFunction(() => typeof window.exampleReleaseAuth === "function");
        const authentications = ui.runtimeRequests.filter((request) => request.type === "AUTH").length;
        await app.request({ type: "SET_DATA_CONSENT", accepted: false });
        await page.evaluate(() => window.exampleReleaseAuth());
        await page.waitForFunction(() => document.querySelector("#toast").textContent.includes("Consent was withdrawn"));
        assertEquals(ui.runtimeRequests.filter((request) => request.type === "AUTH").length, authentications);
        assertEquals((await app.chrome.storage.session.get("accessToken")).accessToken, undefined);
      }
      await Promise.all(ui.deliveries);
      assertEquals(ui.errors, []);
    } finally { await ui.dispose(); }
  }
});
