import { assert, assertEquals } from "jsr:@std/assert@1";
import { chromium } from "npm:playwright@1.56.1";
import { fileURLToPath } from "node:url";

// Toolbar popups are native targets, not ordinary Playwright pages with an assigned viewport.
async function nativeView(cdp, targetId) {
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: false });
  const pending = new Map();
  let nextId = 0;
  const listener = (event) => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message);
    const request = pending.get(message.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  cdp.on("Target.receivedMessageFromTarget", listener);
  const send = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Native popup timed out: ${method}`)); }, 5000);
    pending.set(id, { resolve, reject, timer });
    cdp.send("Target.sendMessageToTarget", { sessionId, message: JSON.stringify({ id, method, params }) }).catch((error) => {
      clearTimeout(timer);
      pending.delete(id);
      reject(error);
    });
  });
  return {
    targetId,
    async evaluate(fn, value) {
      const result = await send("Runtime.evaluate", {
        expression: `(${fn})(${JSON.stringify(value) ?? ""})`, awaitPromise: true, returnByValue: true, userGesture: true
      });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    },
    dispose() {
      cdp.off("Target.receivedMessageFromTarget", listener);
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error("Native view closed"));
      }
      pending.clear();
    }
  };
}

async function eventually(check) {
  const deadline = performance.now() + 5000;
  do {
    const value = await check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  } while (performance.now() < deadline);
  throw new Error("Native extension state did not settle");
}

Deno.test({
  name: "native Chromium popup has intrinsic width and pins a reusable tab inside the browser",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const extensionPath = fileURLToPath(new URL("../src/", import.meta.url));
    const executablePath = Deno.env.get("CHATTER_CHROMIUM_EXECUTABLE");
    const context = await chromium.launchPersistentContext("", {
      ...(executablePath ? { executablePath } : { channel: "chromium" }),
      headless: true, viewport: { width: 1440, height: 1000 },
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`]
    });
    const views = [];
    try {
      const isExtensionWorker = (worker) => /^chrome-extension:\/\/[^/]+\/worker\.js$/.test(worker.url());
      const worker = context.serviceWorkers().find(isExtensionWorker) ||
        await context.waitForEvent("serviceworker", { predicate: isExtensionWorker });
      await eventually(() => worker.evaluate(() => typeof chrome !== "undefined" && Boolean(chrome.runtime?.id)));
      const cdp = await context.browser().newBrowserCDPSession();
      const originalWindows = await worker.evaluate(() => chrome.windows.getAll());
      const openPopup = async () => {
        const before = new Set((await cdp.send("Target.getTargets")).targetInfos.map((target) => target.targetId));
        await worker.evaluate(() => chrome.action.openPopup());
        const target = await eventually(async () => (await cdp.send("Target.getTargets")).targetInfos.find((target) =>
          !before.has(target.targetId) && target.url.endsWith("/dashboard.html")));
        const view = await nativeView(cdp, target.targetId);
        views.push(view);
        await eventually(() => view.evaluate(() => document.documentElement.dataset.popup === "true" &&
          document.querySelector("#redirect-uri")?.textContent.startsWith("https://")));
        return view;
      };
      const popup = await openPopup();
      for (const language of ["en", "es", "de"]) {
        for (const appearance of ["dark", "light"]) {
          await worker.evaluate(({ language, appearance }) => chrome.storage.local.set({ settings: { language }, appearance }), { language, appearance });
          await eventually(() => popup.evaluate(({ language, appearance }) =>
            document.documentElement.lang === language && document.body.dataset.theme === appearance &&
            document.documentElement.dataset.popup === "true", { language, appearance }));
          const layout = await popup.evaluate(() => {
            const brand = document.querySelector(".brand").getBoundingClientRect();
            const actions = document.querySelector(".top-actions").getBoundingClientRect();
            return {
              viewport: innerWidth, height: innerHeight, content: document.body.clientWidth,
              shell: document.querySelector(".shell").getBoundingClientRect().width,
              overflow: document.documentElement.scrollWidth > innerWidth,
              toolbarOnBrandRow: Math.abs(brand.y + brand.height / 2 - actions.y - actions.height / 2) <= 1
            };
          });
          assert(layout.viewport >= 760 && layout.viewport <= 800, `${language}/${appearance}: ${JSON.stringify(layout)}`);
          assertEquals(layout.shell, layout.content);
          assertEquals(layout.overflow, false);
          assert(layout.height > 0 && layout.height <= 600);
          assert(layout.toolbarOnBrandRow, "Toolbar controls must not wrap below the brand");
          const settingsWidth = await popup.evaluate(() => {
            document.querySelector("#settings-toggle").click();
            return document.querySelector("#settings-panel").getBoundingClientRect().width;
          });
          assertEquals(settingsWidth, layout.viewport);
          await popup.evaluate(() => document.querySelector("#settings-close").click());
        }
      }
      const dashboardTabs = () => worker.evaluate(async () =>
        (await chrome.tabs.query({})).filter((tab) => tab.url?.startsWith(chrome.runtime.getURL("dashboard.html"))));
      await popup.evaluate(() => document.querySelector("#pin-window").click());
      const first = await eventually(async () => (await dashboardTabs()).find((tab) => tab.pinned && tab.active));
      await eventually(async () => !(await cdp.send("Target.getTargets")).targetInfos.some((target) => target.targetId === popup.targetId));
      assertEquals((await dashboardTabs()).length, 1);
      assertEquals((await worker.evaluate(() => chrome.windows.getAll())).map((window) => window.id), originalWindows.map((window) => window.id));
      const target = (await cdp.send("Target.getTargets")).targetInfos.find((target) => target.url.endsWith("/dashboard.html"));
      const tabView = await nativeView(cdp, target.targetId);
      views.push(tabView);
      await eventually(() => tabView.evaluate(() => document.documentElement.dataset.popup === "false"));
      const tabLayout = await tabView.evaluate(() => ({
        client: document.documentElement.clientWidth, shell: document.querySelector(".shell").getBoundingClientRect().width
      }));
      assert(tabLayout.client > 800);
      assertEquals(tabLayout.shell, tabLayout.client);
      const reopened = await openPopup();
      await reopened.evaluate(() => document.querySelector("#pin-window").click());
      await eventually(async () => !(await cdp.send("Target.getTargets")).targetInfos.some((target) => target.targetId === reopened.targetId));
      assertEquals((await dashboardTabs()).map((tab) => tab.id), [first.id]);
      assertEquals((await dashboardTabs())[0].pinned, true);
      assertEquals((await worker.evaluate(() => chrome.windows.getAll())).length, originalWindows.length);
      const signInPopup = await openPopup();
      await signInPopup.evaluate(() => document.querySelector("#connect-button").click());
      await eventually(async () => !(await cdp.send("Target.getTargets")).targetInfos.some((target) => target.targetId === signInPopup.targetId));
      assertEquals((await dashboardTabs()).map((tab) => tab.id), [first.id]);
      assertEquals((await worker.evaluate(() => chrome.windows.getAll())).length, originalWindows.length);
    } finally {
      for (const view of views) view.dispose();
      await context.close();
    }
  }
});
