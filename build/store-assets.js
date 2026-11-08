import { chromium, firefox } from "npm:playwright@1.56.1";
import { PNG } from "npm:pngjs@7.0.0";
import { zipSync, unzipSync } from "npm:fflate@0.8.2";
import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import { buildPackages } from "./build.js";

const root = new URL("../", import.meta.url);
const extensionRoot = new URL("src/", root);
const output = new URL("dist/store/", root);
const manifest = JSON.parse(await Deno.readTextFile(new URL("manifest.json", extensionRoot)));
const screenshots = ["01-review-dashboard", "02-multichat-grid", "03-unified-feed", "04-timeout-confirmation", "05-chatter-history"];
const assets = [];
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const supportUrl = "https://github.com/yeraysampedro/ChatterWatch/issues";
const homepageUrl = "https://github.com/yeraysampedro/ChatterWatch";
const privacyUrl = `${homepageUrl}/blob/main/docs/PRIVACY.md`;

function demoApi({ firefoxApi }) {
  const now = Date.now();
  let settings = { channel: "demo", clientId: "", language: "en", ageLimitDays: 60, messageThreshold: 5,
    trustMessageThreshold: 10, recentFollowerDays: 1, autoTimeout: false, timeoutMinutes: 10,
    autoApproveMessages: true, approvalThreshold: 10, autoApproveFollowers: true, autoApproveSubscribers: true,
    autoApproveFormerSubscribers: false, reviewIdleMinutes: 15, alertSound: false, alertAttention: false, alertVolume: 30 };
  let appearance = "dark";
  const runtimeListeners = [];
  const storageListeners = [];
  const chatListeners = [];
  const channels = ["demo", "sample_a", "sample_b"];
  const messages = [
    "Welcome to the community stream!", "The audio sounds clear, thank you.", "What are we working on today?",
    "The schedule looks great this week.", "Thanks for answering my question.", "I have been looking forward to this session.",
    "That is a useful tip for the next round.", "Could we pin the community links?", "The new layout is easy to follow.",
    "Taking a quick break, see you in a moment.", "Thanks to the moderators for keeping things organized.", "Question: when does the next session start?"
  ];
  const entries = (channel, channelIndex) => Array.from({ length: 24 }, (_, index) => ({
    channel, id: `${channel}-${index}`, sequence: index + 1, userId: String(100 + index % 4),
    login: ["sample_viewer_01", "demo_regular", "sample_viewer_02", "demo_helper"][index % 4],
    displayName: ["SampleViewer01", "DemoRegular", "SampleViewer02", "DemoHelper"][index % 4],
    text: messages[(index + channelIndex * 3) % messages.length], sentAt: now - (24 - index) * 15000 + channelIndex * 200,
    deleted: false
  }));
  const chatState = {
    type: "CHAT_STATE", revision: 0, status: "connected", primaryChannel: "demo",
    dataConsent: { version: 1, accepted: true, id: "store-fixture", acceptedAt: now, revision: 1 },
    config: { channels: channels.slice(1), columns: 3, viewMode: "grid",
      highlights: [{ pattern: "question|schedule|community", color: "#f1bd60" }],
      flow: { batchMs: 200, localSlowSeconds: 0, spamEnabled: true, repeatLimit: 3, frequencyLimit: 6, windowSeconds: 10, pattern: "", pauseOnHover: false } },
    rooms: Object.fromEntries(channels.map((channel) => [channel, { connected: true, slow: 0 }])),
    channels: channels.map((channel, index) => ({ channel, entries: entries(channel, index), stats: { received: 24, filtered: 0, overflow: 0, moderationSkipped: 0 } }))
  };
  const accounts = [
    { key: "demo:501", userId: "501", login: "sample_viewer_01", displayName: "SampleViewer01", ageDays: 2,
      messageCount: 2, firstMessage: true, followedAt: new Date(now - 20 * 60000).toISOString(),
      reasons: ["new-account", "first-message", "new-follower"], note: "Introduced by the community raid.",
      activityHistory: [
        { type: "timeout", at: now - 3600000, actor: "demo_moderator", source: "manual", duration: 300, reason: "Example: repeated off-topic messages" },
        { type: "note", at: now - 7200000, actor: "demo_moderator", source: "manual", previousNote: "", note: "Introduced by the community raid." },
        { type: "timeout", at: now - 86400000, actor: "demo_moderator", source: "quick", duration: 1, reason: "/srs" }
      ],
      recentMessages: [{ text: "Hi everyone, first time here. How does the schedule work?", sentAt: now - 45000 }], lastMessageAt: now - 45000 },
    { key: "demo:502", userId: "502", login: "sample_viewer_02", displayName: "SampleViewer02", ageDays: 120,
      messageCount: 4, firstMessage: false, followedAt: new Date(now - 10 * 60000).toISOString(),
      reasons: ["new-follower"], note: "", recentMessages: [{ text: "Thanks for the welcome. Can we pin the community links?", sentAt: now - 15000 }], lastMessageAt: now - 15000 }
  ];
  const snapshot = () => ({ settings: window.ModerationCore.normalizeSettings(settings), moderator: { login: "demo_moderator" }, dataConsent: chatState.dataConsent,
    status: "connected", statusMessage: "Monitoring demo", flagged: accounts.length, accounts, approved: [] });
  const api = {
    i18n: { getUILanguage: () => "en-US" },
    runtime: {
      onMessage: { addListener: (listener) => runtimeListeners.push(listener) },
      connect: ({ name }) => ({
        onMessage: { addListener: (listener) => { if (name === "multichat") { chatListeners.push(listener); queueMicrotask(() => listener(structuredClone(chatState))); } } },
        onDisconnect: { addListener() {} }, disconnect() {}
      }),
      sendMessage: async (message) => {
        if (message.type === "GET_DATA_CONSENT") return { dataConsent: chatState.dataConsent };
        if (message.type === "GET_STATE") return { state: snapshot() };
        if (message.type === "GET_CHATTERS") {
          const matches = accounts.filter((account) => !message.query || `${account.login} ${account.displayName}`.toLowerCase().includes(message.query.toLowerCase()));
          return { accounts: matches, total: matches.length, page: 0, pageSize: 25, broadcasterId: "demo" };
        }
        if (message.type === "GET_ACCOUNT_HISTORY") return { account: accounts.find((account) => account.key === message.key) };
        if (message.type === "SAVE_SETTINGS") {
          settings = structuredClone(message.settings);
          for (const listener of storageListeners) listener({ settings: { newValue: settings } }, "local");
          return { settings };
        }
        if (message.type === "SAVE_CHAT_CONFIG") {
          if (message.revision !== chatState.revision) return { error: "Settings changed in another window." };
          chatState.config = window.ChatFlow.normalizeConfig(message.config);
          chatState.revision += 1;
          for (const listener of chatListeners) listener(structuredClone(chatState));
          return { config: chatState.config, revision: chatState.revision };
        }
        if (message.type === "LIST_WORKSPACES") return { names: ["Community stream"] };
        throw new Error(`Store capture must not execute ${message.type}`);
      }
    },
    storage: {
      local: {
        get: async () => ({ settings, appearance }),
        set: async (values) => {
          if (values.appearance) {
            appearance = values.appearance;
            for (const listener of storageListeners) listener({ appearance: { newValue: appearance } }, "local");
          }
        }
      },
      onChanged: { addListener: (listener) => storageListeners.push(listener) }
    },
    identity: { getRedirectURL: () => firefoxApi ? "https://demo.extensions.allizom.org/" : "https://demo.chromiumapp.org/twitch" },
    windows: { getCurrent: async () => ({ type: "normal", id: 1 }) },
    ...(firefoxApi ? { sidebarAction: { open: async () => {} } } : { sidePanel: { open: async () => {} } })
  };
  window.chrome = firefoxApi ? {} : api;
  if (firefoxApi) window.browser = api;
}

async function writePng(name, bytes, width, height, opaque = false) {
  const decoded = PNG.sync.read(Buffer.from(bytes));
  if (decoded.width !== width || decoded.height !== height) throw new Error(`Incorrect dimensions: ${name}`);
  if (opaque && decoded.data.some((value, index) => index % 4 === 3 && value !== 255)) throw new Error(`Unexpected transparency: ${name}`);
  const encoded = PNG.sync.write(decoded, { colorType: opaque ? 2 : 6 });
  const target = new URL(name, output);
  await Deno.mkdir(new URL("./", target), { recursive: true });
  await Deno.writeFile(target, encoded);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  assets.push({ path: `dist/store/${name}`, width, height, bytes: encoded.length,
    sha256: [...digest].map((value) => value.toString(16).padStart(2, "0")).join("") });
}

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(1279, 799);
  if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error(`Horizontal overflow: ${name}`);
  await writePng(name, await page.screenshot({ type: "png", fullPage: false, animations: "disabled" }), 1280, 800, true);
  console.log(`Captured ${name}`);
}

async function captureBrowser(name, browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", reducedMotion: "reduce", serviceWorkers: "block" });
  context.setDefaultTimeout(10_000);
  const errors = [];
  try {
    await context.addInitScript(demoApi, { firefoxApi: name === "firefox" });
    const dashboard = await context.newPage();
    dashboard.on("pageerror", (error) => errors.push(error.message));
    await dashboard.goto(new URL("dashboard.html", extensionRoot).href);
    await dashboard.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 2);
    await capture(dashboard, `${name}/${screenshots[0]}.png`);

    const chat = dashboard;
    await chat.goto(new URL("chat.html", extensionRoot).href);
    await chat.waitForFunction(() => document.querySelectorAll(".chat-panel").length === 3 && document.querySelectorAll(".chat-row").length > 0);
    await capture(chat, `${name}/${screenshots[1]}.png`);
    await chat.locator('[data-mode="unified"]').click();
    await chat.waitForFunction(() => document.querySelectorAll(".chat-panel").length === 1 && document.querySelector(".channel-tag"));
    await chat.locator('.chat-row button[data-action="pin"]').last().click();
    await chat.waitForFunction(() => document.querySelector(".pinned-message"));
    await capture(chat, `${name}/${screenshots[2]}.png`);

    await dashboard.goto(new URL("dashboard.html", extensionRoot).href);
    await dashboard.waitForFunction(() => document.querySelectorAll(".chatter-card").length === 2);
    await dashboard.locator(".action-row .action-button").nth(1).click();
    await dashboard.locator('.action-dialog input[name="duration"]').fill("300");
    await dashboard.locator('.action-dialog input[name="reason"]').fill("Example: repeated off-topic messages");
    await capture(dashboard, `${name}/${screenshots[3]}.png`);
    await dashboard.locator(".dialog-cancel").click();
    await dashboard.locator(".action-row .action-button").nth(3).click();
    await dashboard.locator('[data-history-view="actions"]').click();
    await capture(dashboard, `${name}/${screenshots[4]}.png`);
    const obsolete = new URL(`${name}/05-autoapproval-settings.png`, output);
    try { await Deno.remove(obsolete); } catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
    if (errors.length) throw new Error(`${name}: ${errors.join("; ")}`);

    if (name === "chromium") await graphics(dashboard);
  } finally { await context.close(); await browser.close(); }
}

async function graphics(page) {
  const master = await Deno.readFile(new URL("assets/icons/chatter-watch-512.png", extensionRoot));
  const dataUrl = `data:image/png;base64,${Buffer.from(master).toString("base64")}`;
  const images = await page.evaluate(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const output = [];
    for (const [name, width, height] of [["icon-128.png", 128, 128], ["promo-440x280.png", 440, 280], ["marquee-1400x560.png", 1400, 560]]) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const drawing = canvas.getContext("2d");
      if (width === 128) {
        drawing.drawImage(image, 0, 0, width, height);
      } else {
        drawing.fillStyle = "#160f1f";
        drawing.fillRect(0, 0, width, height);
        drawing.fillStyle = "#38005e";
        drawing.fillRect(width * 0.62, 0, width * 0.38, height);
        drawing.fillStyle = "#d2a4ff";
        drawing.fillRect(0, 0, width * 0.018, height);
        const iconSize = height * 0.7;
        drawing.drawImage(image, width * 0.12, height * 0.12, iconSize, iconSize);
        for (let index = 0; index < 3; index += 1) {
          drawing.fillStyle = index === 1 ? "#f3ce86" : "#d2a4ff";
          drawing.fillRect(width * 0.70, height * (0.25 + index * 0.2), width * (0.20 - index * 0.025), height * 0.055);
        }
      }
      output.push({ name, width, height, data: canvas.toDataURL("image/png").split(",")[1] });
    }
    return output;
  }, dataUrl);
  for (const image of images) await writePng(image.name, Buffer.from(image.data, "base64"), image.width, image.height, image.width !== 128);
  for (const size of [32, 64]) await writePng(`icon-${size}.png`, await Deno.readFile(new URL(`assets/icons/chatter-watch-${size}.png`, extensionRoot)), size, size);
}

function verify(condition, detail) {
  if (!condition) throw new Error(detail);
}

function verifyPublicPaths(paths) {
  for (const path of paths) verify(!/(^|\/)(example_accounts\.md|\.env(?:\..*)?|[^/]+\.(?:pem|pfx|p12|key)|[^/]+\.(?:bat|cmd)|[^/]*\.local\.[^/]+|PRIVATE-[^/]*)$|(^|\/)store-submission\//i.test(path), `Private file is not allowed in an archive: ${path}`);
}

async function hash(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function paragraphUnder(markdown, title) {
  const heading = `## ${title}\n\n`;
  const start = markdown.indexOf(heading);
  verify(start >= 0, `Missing metadata heading: ${title}`);
  return markdown.slice(start + heading.length).split("\n\n")[0].trim();
}

async function metadata() {
  const permissionText = (await Deno.readTextFile(new URL("docs/STORE_PERMISSIONS.md", root))).replaceAll("\r\n", "\n");
  const listings = (await Deno.readTextFile(new URL("docs/STORE_LISTING.md", root))).replaceAll("\r\n", "\n");
  const localized = {};
  for (const [locale, title] of [["en", "English"], ["de", "Deutsch"], ["es", "Español"]]) {
    const section = listings.split(`## ${title}\n`)[1]?.split("\n## ")[0];
    verify(section, `Missing listing locale ${locale}`);
    const fields = section.trim().split(/^### .+$/m).map((value) => value.trim()).filter(Boolean);
    verify(fields.length === 2, `Expected summary and description for ${locale}`);
    verify(fields[0].length <= 132, `Short summary exceeds 132 characters: ${locale}`);
    localized[locale] = { summary: fields[0], description: fields[1] };
  }
  verify(manifest.name.length <= 75 && manifest.description.length <= 132, "Manifest name/description exceeds Chrome limits");
  const permissions = Object.fromEntries(["storage", "identity", "sidePanel", "alarms"].map((name) => [name, paragraphUnder(permissionText, name)]));
  let privateAccountsPresent = false;
  try { privateAccountsPresent = (await Deno.stat(new URL("example_accounts.md", root))).isFile; }
  catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
  return { name: manifest.name, version: manifest.version, defaultLocale: "en", supportUrl, homepageUrl,
    privacyUrlAfterPublication: privacyUrl, privacyUrlMustBeVerified: true,
    solePurpose: paragraphUnder(permissionText, "Single Purpose"),
    permissions, hostPermission: paragraphUnder(permissionText, "Host Permission - Combined Store Field"),
    remoteCode: "No executable remote JavaScript or Wasm in the inspected runtime package; network responses are data. See STORE_PERMISSIONS.md.",
    locales: localized, testCredentials: { status: privateAccountsPresent ? "LOCAL_PRIVATE_FILE_PRESENT_NOT_READ_BY_THIS_TOOL" : "OWNER_REQUIRED_PRIVATE_SUBMISSION", included: false, privateNotes: "deno task store:submission (Git-ignored dist/store-submission only)" },
    license: { application: "All Rights Reserved (LICENSE)", thirdPartyIcons: "LICENSE.lucide" } };
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "ChatterWatch-Publication-Validation/1.0" } });
    await response.body?.cancel();
    return { url, status: response.status, accessible: response.ok };
  } catch (error) { return { url, status: 0, accessible: false, error: error.message }; }
}

async function checkPublicPrivacy() {
  const normalize = (text) => text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n").trim();
  const local = normalize(await Deno.readTextFile(new URL("docs/PRIVACY.md", root)));
  const url = `https://raw.githubusercontent.com${new URL(homepageUrl).pathname}/main/docs/PRIVACY.md`;
  const localSha256 = await hash(encoder.encode(local));
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "ChatterWatch-Publication-Validation/1.0" } });
    if (!response.ok) {
      await response.body?.cancel();
      return { url, status: response.status, matchesLocal: false, localSha256 };
    }
    const published = normalize(await response.text());
    return { url, status: response.status, matchesLocal: published === local, localSha256, publishedSha256: await hash(encoder.encode(published)) };
  } catch (error) { return { url, status: 0, matchesLocal: false, localSha256, error: error.message }; }
}

async function validatePackage(artifact) {
  const bytes = await Deno.readFile(artifact.archive);
  const entries = unzipSync(bytes);
  const names = Object.keys(entries).sort();
  verifyPublicPaths(names);
  const expected = ["LICENSE.lucide", "core.js", "chat-flow.js", "worker.js", "virtual-chat.js", "dashboard.html", "dashboard.css", "dashboard.js", "chat.html", "chat.css", "chat.js", "view-tools.js", "view-tools.css", "icons.js", "manifest.json", ...[16, 32, 48, 64, 96, 128].map((size) => `assets/icons/chatter-watch-${size}.png`)].sort();
  verify(JSON.stringify(names) === JSON.stringify(expected), `${artifact.target}: unexpected/missing archive files`);
  verify(names.every((name) => !name.startsWith("/") && !name.includes("..") && !name.includes("\\")), "Unsafe ZIP path");
  const packaged = JSON.parse(decoder.decode(entries["manifest.json"]));
  verify(packaged.manifest_version === 3 && packaged.version === manifest.version, "Wrong manifest/version");
  verify(packaged.content_security_policy.extension_pages.includes("script-src 'self'"), "Unexpected script policy");
  if (artifact.target === "chromium") verify(packaged.background.service_worker === "worker.js" && !packaged.background.scripts, "Invalid Chromium background");
  else verify(!packaged.background.service_worker && packaged.background.scripts.join(",") === "core.js,chat-flow.js,worker.js" && !packaged.permissions.includes("sidePanel") && packaged.sidebar_action.default_panel === "dashboard.html", "Invalid Firefox adaptation");
  const image = PNG.sync.read(Buffer.from(entries[packaged.icons["128"]]));
  verify(image.width === 128 && image.height === 128, "Packaged icon is not 128x128");
  for (const mapping of [packaged.icons, packaged.action.default_icon, ...(packaged.sidebar_action ? [packaged.sidebar_action.default_icon] : [])]) {
    for (const [size, name] of Object.entries(mapping)) {
      verify(Boolean(entries[name]), `Missing icon ${name}`);
      const icon = PNG.sync.read(Buffer.from(entries[name]));
      verify(icon.width === Number(size) && icon.height === Number(size), `Wrong icon dimensions ${name}`);
    }
  }
  for (const [name, content] of Object.entries(entries)) {
    if (name !== "manifest.json") verify(await hash(content) === await hash(await Deno.readFile(new URL(name, extensionRoot))), `Packaged source mismatch: ${name}`);
    const text = decoder.decode(content);
    if (name.endsWith(".html")) for (const match of text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) verify(Boolean(entries[match[1]]), `Non-packaged script in ${name}: ${match[1]}`);
    if (name.endsWith(".js")) verify(!/\beval\s*\(|\bnew\s+Function\s*\(|importScripts\s*\(\s*["']https?:|WebAssembly\.(?:compile|instantiate)/.test(text), `Executable-code pattern requires review: ${name}`);
  }
  return { target: artifact.target, path: `dist/packages/chatter-watch-${manifest.version}-${artifact.target}.zip`, sha256: await hash(bytes), entries: names,
    structuralStatus: "PASS", icon128: "PASS: exact 128x128 PNG", screenshotsInsideExtension: 0,
    remoteCodeStaticCheck: "PASS: packaged script references; no eval/new Function/remote importScripts/Wasm execution patterns. Not a complete security audit.",
    manifest: packaged, bytes: bytes.length };
}

async function reproduceSource(sourceZip, packages) {
  const temporary = await Deno.makeTempDir({ prefix: "chatter-store-source-" });
  const directory = pathToFileURL(`${temporary}/`);
  try {
    for (const [name, content] of Object.entries(unzipSync(sourceZip))) {
      verify(!name.startsWith("/") && !name.includes("..") && !name.includes("\\"), `Unsafe source path: ${name}`);
      const target = new URL(name, directory);
      await Deno.mkdir(new URL("./", target), { recursive: true });
      await Deno.writeFile(target, content);
    }
    const run = await new Deno.Command(Deno.execPath(), { args: ["task", "build"], cwd: directory, stdin: "null", stdout: "piped", stderr: "piped" }).output();
    verify(run.success, `Source rebuild failed: ${decoder.decode(run.stderr)}`);
    for (const packageInfo of packages) {
      const rebuilt = await Deno.readFile(new URL(packageInfo.path, directory));
      verify(await hash(rebuilt) === packageInfo.sha256, `Source rebuild differs: ${packageInfo.target}`);
    }
    console.log("Source archive rebuild matches both extension ZIPs byte-for-byte.");
    return "PASS: extracted source archive rebuild matches both runtime ZIP SHA-256 values";
  } finally { await Deno.remove(temporary, { recursive: true }); }
}

async function bundle() {
  const documents = ["README.md", "LICENSE", "docs/PRIVACY.md", "src/LICENSE.lucide", "docs/CHANGELOG.md", "docs/SUPPORT.md", "docs/STORE_SUBMISSION.md", "docs/STORE_REQUIREMENTS.md", "docs/STORE_PERMISSIONS.md", "docs/STORE_LISTING.md", "docs/STORE_TESTING.md", "docs/IMPLEMENTATION.md", "docs/en.md", "docs/es.md", "docs/de.md"];
  verifyPublicPaths(documents);
  const artifacts = await buildPackages();
  const packages = [];
  for (const artifact of artifacts) packages.push(await validatePackage(artifact));
  const lintRun = await new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "--no-lock", "npm:web-ext@9.1.0", "lint", "--source-dir", "dist/firefox", "--output", "json"],
    cwd: root, stdin: "null", stdout: "piped", stderr: "piped"
  }).output();
  let firefoxLint;
  try { firefoxLint = JSON.parse(decoder.decode(lintRun.stdout)); }
  catch { firefoxLint = { summary: { errors: 1 }, failure: decoder.decode(lintRun.stderr).slice(0, 1000) || "Validator produced no JSON result." }; }
  await Deno.writeTextFile(new URL("firefox-lint.json", output), `${JSON.stringify(firefoxLint, null, 2)}\n`);
  const links = [];
  for (const url of [supportUrl, homepageUrl, privacyUrl]) links.push(await checkUrl(url));
  const publicPrivacy = await checkPublicPrivacy();
  const listingMetadata = await metadata();
  listingMetadata.publicPrivacy = publicPrivacy;
  const metadataBytes = encoder.encode(`${JSON.stringify(listingMetadata, null, 2)}\n`);
  await Deno.writeFile(new URL("metadata.json", output), metadataBytes);
  const failures = [
    ...(!lintRun.success || firefoxLint.summary.errors ? ["Firefox web-ext validation failed; see firefox-lint.json for actual findings."] : []),
    ...links.filter((link) => !link.accessible).map((link) => `Public URL unavailable or unverified (${link.status}): ${link.url}`),
    ...(!publicPrivacy.matchesLocal ? ["The publicly published privacy text does not match the local policy, or could not be verified. Publish the current policy and rerun validation; HTTP 200 alone is insufficient."] : []),
    "Reviewer credentials, the actual store callback and live Twitch access are not validated by this build. This tool never reads the local account file and excludes it from every archive; only `deno task store:submission` reads it, to write the Git-ignored private reviewer notes for the stores' private fields.",
    "Publisher/account contact declarations (for example the AMO support email) require the owner's decision.",
    "At-rest encryption compliance remains unresolved: this implementation uses browser storage/IndexedDB without its own encryption. Do not certify compliance without resolving the store-policy requirement."
  ];
  const warnings = [
    "Extension ZIPs deliberately contain no listing screenshots. Upload the five screenshots separately to each store listing; never upload the entire store kit as the extension.",
    "Screenshots use fictional demonstration data with simulated extension APIs and do not establish live Twitch authorization or delivery.",
    "No authenticated store submission, signature, approval or live OS/browser-lifecycle certification has been performed.",
    "The 128px store artwork includes 16px transparent padding. Runtime icon dimensions are valid; recheck the store's artwork-weight guidance for the packaged original.",
    "German/Spanish listing copy is supplied, but the current package has no _locales metadata. Verify Chrome's available listing locales before using those translations there."
  ];
  const report = { version: manifest.version, validatedAt: new Date().toISOString(), structuralStatus: "PASS", publicationStatus: "NOT_READY_FOR_FINAL_CERTIFICATION", packages, firefoxLint: { tool: "web-ext 9.1.0", exitCode: lintRun.code, ...firefoxLint.summary }, publicLinks: links, publicPrivacy, blockers: failures, warnings, storeKits: [] };
  const sourceEntries = {};
  const sourceFiles = new Set([...packages[0].entries.map((name) => `src/${name}`), ...documents, "build/build.js", "build/icon-assets.js", "deno.json", "deno.lock", ".gitignore", "build/store-assets.js", "build/release.js", "build/store-submission.js", ".gitattributes", ".github/workflows/release.yml", "AGENTS.md", "src/assets/icons/icon.png", "src/assets/icons/chatter-watch-512.png", "tests/core_test.js", "tests/worker_test.js", "tests/worker_harness.js", "tests/browser_harness.js", "tests/example_accounts.js", "tests/example_accounts_test.js", "tests/example_accounts_ui_test.js", "tests/privacy_test.js", "tests/privacy_ui_test.js", "tests/ui_test.js", "tests/native_popup_test.js", "tests/build_test.js", "tests/release_test.js", "tests/store_submission_test.js", "tests/gitignore_test.js"]);
  verifyPublicPaths(sourceFiles);
  for (const name of sourceFiles) sourceEntries[name] = await Deno.readFile(new URL(name, root));
  const sourceZip = zipSync(sourceEntries, { level: 9, mtime: new Date(2000, 0, 1) });
  const sourcePath = `dist/source/chatter-watch-${manifest.version}-source.zip`;
  await Deno.mkdir(new URL("dist/source/", root), { recursive: true });
  await Deno.writeFile(new URL(sourcePath, root), sourceZip);
  report.sourceArchive = { path: sourcePath, sha256: await hash(sourceZip), files: Object.keys(sourceEntries), rebuild: "deno task build", reproducibility: await reproduceSource(sourceZip, packages) };
  for (const artifact of artifacts) {
    const entries = {};
    entries["listing/icon-128.png"] = await Deno.readFile(new URL("icon-128.png", output));
    for (const screenshot of screenshots) entries[`screenshots/${screenshot}.png`] = await Deno.readFile(new URL(`${artifact.target}/${screenshot}.png`, output));
    for (const name of ["icon-32.png", "icon-64.png", "promo-440x280.png", "marquee-1400x560.png"]) entries[`listing/${name}`] = await Deno.readFile(new URL(name, output));
    entries["metadata.json"] = metadataBytes;
    entries["firefox-lint.json"] = encoder.encode(`${JSON.stringify(firefoxLint, null, 2)}\n`);
    entries[`packages/chatter-watch-${manifest.version}-${artifact.target}.zip`] = await Deno.readFile(artifact.archive);
    entries[`source/chatter-watch-${manifest.version}-source.zip`] = sourceZip;
    for (const name of documents) entries[name] = await Deno.readFile(new URL(name, root));
    const image = PNG.sync.read(Buffer.from(entries["listing/icon-128.png"]));
    verify(image.width === 128 && image.height === 128, "Store icon size invalid");
    const captures = Object.keys(entries).filter((name) => name.startsWith("screenshots/"));
    verify(captures.length >= 1 && captures.length <= 5 && captures.length === 5, "Store screenshot count invalid");
    for (const name of captures) {
      const png = PNG.sync.read(Buffer.from(entries[name]));
      verify(png.width === 1280 && png.height === 800, `Wrong screenshot size: ${name}`);
      verify(!png.data.some((value, index) => index % 4 === 3 && value !== 255), `Non-opaque screenshot: ${name}`);
    }
    const subset = { ...report, packages: packages.filter((item) => item.target === artifact.target), storeKits: [{ target: artifact.target, listingIconCount: 1, listingIconSize: "128x128", screenshots: captures, screenshotSize: "1280x800", expectedScreenshotCount: 5, status: "PASS" }] };
    entries["validation.json"] = encoder.encode(`${JSON.stringify(subset, null, 2)}\n`);
    entries["docs/STORE_VALIDATION.md"] = encoder.encode([
      "# Store Kit Validation", "", `Browser: ${artifact.target}. Version: ${manifest.version}. Checked: ${report.validatedAt}.`, "",
      "Archive and asset structure: PASS. Publication certification: NOT READY.", "",
      "- Exactly one listing/icon-128.png, decoded as 128x128 PNG.",
      "- Exactly five screenshots/*.png, each decoded as 1280x800 and fully opaque.",
      "- Nested extension ZIP: 21 allowlisted files, root Manifest V3, browser-specific configuration, exact source match, valid icon references.",
      "- The extension ZIP intentionally has no listing screenshots; upload them separately. Do not upload this whole kit as the extension.",
      `- Firefox web-ext result: ${firefoxLint.summary.errors || 0} errors, ${firefoxLint.summary.warnings || 0} warnings, exit code ${lintRun.code}. See firefox-lint.json.`,
      `- Public privacy content: ${publicPrivacy.matchesLocal ? "matches the local policy" : "MISMATCH or unavailable"}; normalized SHA-256 comparison, not a compliance certificate.`,
      "", "## Publication blockers / missing evidence", "", ...failures.map((item) => `- ${item}`),
      "", "## Warnings", "", ...warnings.map((item) => `- ${item}`),
      "", "## Package SHA-256", "", ...subset.packages.map((item) => `- ${item.path}: ${item.sha256}`),
      "", `Source archive SHA-256: ${report.sourceArchive.sha256}. Rebuild from its root with deno task build. ${report.sourceArchive.reproducibility}.`,
      "", "validation.json contains detailed checks and public URL statuses. The repository-level STORE_VALIDATION.md records the final kit ZIP hashes; a ZIP cannot contain a non-circular hash of itself.", ""
    ].join("\n"));
    verifyPublicPaths(Object.keys(entries));
    const zip = zipSync(entries, { level: 9, mtime: new Date(2000, 0, 1) });
    const reread = unzipSync(zip);
    verify(Object.keys(reread).length === Object.keys(entries).length, "ZIP round-trip entry mismatch");
    for (const [name, content] of Object.entries(entries)) verify(await hash(reread[name]) === await hash(content), `ZIP round-trip content mismatch: ${name}`);
    const path = `dist/store-kits/chatter-watch-${manifest.version}-${artifact.target}-store-kit.zip`;
    await Deno.mkdir(new URL("dist/store-kits/", root), { recursive: true });
    await Deno.writeFile(new URL(path, root), zip);
    report.storeKits.push({ target: artifact.target, path, sha256: await hash(zip), bytes: zip.length, listingIconCount: 1, listingIconSize: "128x128", screenshotCount: captures.length, screenshotSize: "1280x800", structuralStatus: "PASS" });
    console.log(`Validated store kit: ${path}`);
  }
  await Deno.writeTextFile(new URL("validation.json", output), `${JSON.stringify(report, null, 2)}\n`);
  const lines = ["# Final ZIP Validation", "", `Version ${manifest.version}. Validated ${report.validatedAt}.`, "", "**Archive/asset checks: PASS. Publication certification: NOT READY.**", "", "## Extension ZIPs", "", "| Browser | Entries | Root manifest | Icon | Screenshots inside | Source match |", "| --- | --- | --- | --- | --- | --- |", ...packages.map((item) => `| ${item.target} | ${item.entries.length} | Manifest V3, browser-specific | 128x128 PNG | 0 (correct: listing uploads are separate) | PASS |`), "", "## Store Kits", "", "Extract these ZIPs. Upload only the nested package from packages/ as the extension, and the five screenshots separately to the listing.", "", "| Kit | Listing icon | Screenshots | Pixel dimensions | ZIP integrity |", "| --- | --- | --- | --- | --- |", ...report.storeKits.map((item) => `| ${item.path} | Exactly one 128x128 PNG | Exactly ${item.screenshotCount} | All 1280x800, opaque | PASS |`), "", "## Publication Blockers / Missing Evidence", "", ...failures.map((item) => `- ${item}`), "", "## Warnings", "", ...warnings.map((item) => `- ${item}`), "", "## Public URLs", "", ...links.map((link) => `- HTTP ${link.status}: ${link.url} (${link.accessible ? "publicly reachable" : "unavailable/unverified"})`), "", "## Package SHA-256", "", ...packages.map((item) => `- ${item.path}: ${item.sha256}`), "", "## Kit SHA-256", "", ...report.storeKits.map((item) => `- ${item.path}: ${item.sha256}`), "", "Machine-readable evidence: dist/store/validation.json, metadata.json and inventory.json. Remote-code checks are focused static checks, not a penetration test or a store approval.", ""];
  await Deno.writeTextFile(new URL("docs/STORE_VALIDATION.md", root), lines.join("\n"));
  await Deno.writeTextFile(new URL("docs/STORE_VALIDATION.md", root), `\n## Published Privacy Content\n\n${publicPrivacy.matchesLocal ? "PASS: the public policy matches the local text after normalizing line endings." : "BLOCKED: public and local policy text differ or the public content could not be checked."}\n\nSource: ${publicPrivacy.url}\n\nLocal SHA-256: ${publicPrivacy.localSha256}\n\nPublished SHA-256: ${publicPrivacy.publishedSha256 || "unavailable"}\n`, { append: true });
  await Deno.writeTextFile(new URL("docs/STORE_VALIDATION.md", root), `\n## Mozilla Validator\n\nweb-ext 9.1.0: exit ${lintRun.code}, ${firefoxLint.summary.errors || 0} errors, ${firefoxLint.summary.warnings || 0} warnings. Actual output: dist/store/firefox-lint.json (also included inside both kits).\n`, { append: true });
  await Deno.writeTextFile(new URL("docs/STORE_VALIDATION.md", root), `\n## Source Archive\n\n${sourcePath}: ${report.sourceArchive.sha256}. ${sourceFiles.size} allowlisted source/resource/documentation files. Extract and run deno task build; no Twitch credentials are needed to reproduce the runtime packages.\n\n${report.sourceArchive.reproducibility}.\n`, { append: true });
  console.log(`Archive validation PASS; ${failures.length} publication blockers/missing-evidence items are recorded, not silently certified.`);
}

if (!Deno.args.includes("--bundle-only")) {
  await Deno.mkdir(output, { recursive: true });
  await captureBrowser("chromium", await chromium.launch({ channel: Deno.env.get("CHATTER_BROWSER") || "chrome", headless: true }));
  await captureBrowser("firefox", await firefox.launch({ headless: true }));
  for (const name of ["chromium", "firefox"]) {
    if (assets.filter((asset) => asset.path.includes(`/${name}/`)).length !== 5) throw new Error(`Expected exactly five screenshots for ${name}`);
  }
  await Deno.writeTextFile(new URL("inventory.json", output), `${JSON.stringify({ version: manifest.version, language: "en", screenshotData: "Fictional demonstration accounts and messages rendered by the unmodified extension UI; not live Twitch evidence.", assets }, null, 2)}\n`);
  console.log(`Validated ${assets.length} PNG assets; five 1280x800 screenshots per browser, all opaque RGB.`);
}
if (!Deno.args.includes("--capture-only")) await bundle();