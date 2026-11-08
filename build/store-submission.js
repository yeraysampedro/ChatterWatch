import { fileURLToPath } from "node:url";
import { buildPackages, manifestFor } from "./build.js";

const root = new URL("../", import.meta.url);
const decoder = new TextDecoder();
const encoder = new TextEncoder();

export const publicUrls = {
  homepage: "https://github.com/yeraysampedro/ChatterWatch",
  support: "https://github.com/yeraysampedro/ChatterWatch/issues",
  privacy: "https://github.com/yeraysampedro/ChatterWatch/blob/main/docs/PRIVACY.md"
};
export const privateFileName = "PRIVATE-reviewer-instructions.txt";
const screenshots = ["01-review-dashboard.png", "02-multichat-grid.png", "03-unified-feed.png", "04-timeout-confirmation.png", "05-chatter-history.png"];
const chromeLimits = { description: 16000, summary: 132 };
const amoLimits = { summary: 250 };

export function markdownSection(markdown, heading) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const level = (line) => /^(#{1,6}) /.exec(line)?.[1].length || 0;
  const start = lines.findIndex((line) => level(line) && line.replace(/^#+\s+/, "").trim() === heading);
  if (start < 0) throw new Error(`Missing documentation section "${heading}".`);
  const end = lines.findIndex((line, index) => index > start && level(line) && level(line) <= level(lines[start]));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

export function plainText(markdown) {
  return markdown.replaceAll("\r\n", "\n")
    .replace(/^#{1,6}\s+(.*)$/gm, (_, title) => title.toUpperCase())
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, "$1 ($2)")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// example_accounts.md is private: never include its values in errors, logs or public files.
export function parseAccounts(text) {
  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, ""))
    .filter((line) => line && !line.startsWith("#") && !/^(?:```|<!--)/.test(line));
  const accounts = lines.map((line, index) => {
    const match = /^(\S+)\s+(.+)$/.exec(line);
    if (!match) throw new Error(`example_accounts.md line ${index + 1} must contain a username and a password separated by spaces.`);
    const username = match[1].replace(/^@/, "");
    if (!/^[A-Za-z0-9_]{3,25}$/.test(username)) throw new Error(`example_accounts.md line ${index + 1}: the first word is not a valid Twitch username (3-25 letters, digits or underscores).`);
    return { username, password: match[2].trim() };
  });
  if (accounts.length !== 2) throw new Error(`example_accounts.md must list exactly 2 accounts (moderator/channel owner first, chatter second); found ${accounts.length}.`);
  if (accounts[0].username.toLowerCase() === accounts[1].username.toLowerCase()) throw new Error("example_accounts.md lists the same username twice; the chatter must be a second account.");
  return accounts;
}

export async function firefoxRedirectUrl(geckoId) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", encoder.encode(geckoId)));
  return `https://${[...digest].map((value) => value.toString(16).padStart(2, "0")).join("")}.extensions.allizom.org/twitch`;
}

export function chromeRedirectUrl(itemId) {
  return itemId ? `https://${itemId}.chromiumapp.org/twitch` : "https://<CHROME_ITEM_ID>.chromiumapp.org/twitch";
}

export function validateConfig({ clientId = "", chromeItemId = "", supportEmail = "" }) {
  if (clientId && !/^[a-z0-9]{20,40}$/i.test(clientId)) throw new Error("The Twitch Client ID must contain only letters and digits. Use the Client ID, never the Client Secret.");
  if (chromeItemId && !/^[a-p]{32}$/.test(chromeItemId)) throw new Error("The Chrome item ID must be the 32-letter ID (letters a-p) shown in the Chrome Web Store dashboard.");
  if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) throw new Error("The support email address is not valid.");
}

export function reviewerInstructions({ browser, accounts, clientId }) {
  const [moderator, chatter] = accounts;
  const channel = moderator.username.toLowerCase();
  const open = browser === "chrome"
    ? "Click the ChatterWatch icon in the Chrome toolbar (open the puzzle-piece Extensions menu if it is not pinned). Optional: click the pin icon \"Pin in a browser tab\" to keep it open in a tab."
    : "Click the ChatterWatch button in the Firefox toolbar (or open it from the Extensions menu). Optional: click the pin icon \"Pin in a browser tab\" to keep it open in a tab.";
  return [
    "ChatterWatch is a moderation workspace for Twitch chat. Testing takes about 10 minutes and uses the two Twitch test accounts below. Nothing needs to be purchased or installed besides the extension.",
    "",
    "TEST ACCOUNTS",
    `Moderator and channel owner - username: ${moderator.username} - password: ${moderator.password}`,
    `Chatter - username: ${chatter.username} - password: ${chatter.password}`,
    `Twitch application Client ID (not a secret): ${clientId || "<TWITCH_CLIENT_ID>"}`,
    "",
    "STEPS",
    `1. ${open}`,
    "2. When the data-use notice appears (on first open or when you click Connect), tick \"I have read this notice and consent to the data use described above.\" and click \"Allow data use\". \"Stay offline\" declines; nothing is then sent to Twitch.",
    "3. Click the gear icon (Settings), paste the Client ID into \"Twitch application client ID\". It saves automatically.",
    `4. Type ${channel} in the "Twitch channel" box and click "Connect". Sign in on the Twitch page with the moderator account and click Authorize. The status changes to "Monitoring ${channel}".`,
    `5. In a private window, sign in to twitch.tv with the chatter account, open https://www.twitch.tv/${channel} and send two or three chat messages. They appear live in ChatterWatch. Select the "All chatters" filter to see the chatter; a first message in the channel also places it under "Pending review".`,
    "6. On the chatter's card try \"Add note\", \"History\" and \"Approve\". \"Timeout\" (duration in seconds) and \"Ban\" always ask for confirmation and really apply on Twitch, so use them only on the test chatter. \"Unban / end timeout\" removes them again.",
    "7. The \"Multichat\" button (arrow icon) opens a separate window that can show several channels in \"Grid\" or \"Unified\" view.",
    "8. Settings > Data and privacy > \"Withdraw consent and disconnect\" stops all Twitch activity and removes the session. Existing local history stays readable offline.",
    "",
    "Translation is optional, requires a translation server configured by the user, and can be skipped.",
    "",
    "If Twitch asks for a verification code we cannot provide, sign in with any Twitch account of your own instead and use that account's channel name in step 4 (channel owners can moderate their own chat). Any second Twitch account can act as the chatter."
  ].join("\n") + "\n";
}

function field(label, value, note = "") {
  const body = String(value).trim();
  return [`===== ${label} =====${note ? ` (${note})` : ""}`, body, ""].join("\n");
}

function countNote(text, limit) {
  return limit ? `${text.length} of max ${limit} characters` : `${text.length} characters`;
}

export function chromeSheets({ docs, manifest, clientId, chromeItemId, firefoxRedirect }) {
  const description = markdownSection(docs.listing, "Detailed Description / Beschreibung");
  const permission = (name) => plainText(markdownSection(docs.permissions, name));
  const listing = [
    "CHROME WEB STORE - STORE LISTING TAB",
    "Copy each value into the field with the same name.",
    "",
    field("Summary", manifest.description, `read from the package manifest; not editable in the dashboard; ${countNote(manifest.description, chromeLimits.summary)}`),
    field("Description", "Paste the whole file fields/description.txt. It starts with the required DATA USE AND YOUR CHOICE disclosure; keep that block first.", countNote(description, chromeLimits.description)),
    field("Category", "Tools"),
    field("Language", "English"),
    field("Store icon", "images/icon-128.png (128x128)"),
    field("Screenshots", screenshots.map((name, index) => `${index + 1}. images/${name}`).join("\n"), "1280x800, upload in this order"),
    field("Small promo tile", "images/promo-440x280.png (440x280)"),
    field("Marquee promo tile", "images/marquee-1400x560.png (1400x560, optional)"),
    field("Official URL", "None"),
    field("Homepage URL", publicUrls.homepage),
    field("Support URL", publicUrls.support),
    field("Mature content", "No")
  ].join("\n");
  const privacy = [
    "CHROME WEB STORE - PRIVACY TAB",
    "",
    field("Single purpose description", permission("Single Purpose")),
    field("storage justification", permission("storage")),
    field("identity justification", permission("identity")),
    field("sidePanel justification", permission("sidePanel")),
    field("alarms justification", permission("alarms")),
    field("Host permission justification", permission("Host Permission - Combined Store Field")),
    field("Are you using remote code?", "No, I am not using Remote code"),
    field("Data usage - tick these", [
      "[x] Personally identifiable information - Twitch user/channel IDs, login and display names of the user and of chatters.",
      "[x] Authentication information - Twitch OAuth access token, kept in browser session storage.",
      "[x] Personal communications - Twitch chat messages; selected messages may be sent to the user's own translation server.",
      "[x] Website content - chat text and profile images received from Twitch (conservative choice).",
      "Leave unticked: Health information, Financial and payment information, Location, Web history, User activity."
    ].join("\n")),
    field("Certifications - tick all three", [
      "[x] I do not sell or transfer user data to third parties, outside of the approved use cases",
      "[x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose",
      "[x] I do not use or transfer user data to determine creditworthiness or for lending purposes"
    ].join("\n")),
    field("Privacy policy URL", publicUrls.privacy)
  ].join("\n");
  const distribution = [
    "CHROME WEB STORE - DISTRIBUTION TAB",
    "",
    field("Payments", "Free of charge"),
    field("Visibility", "Public"),
    field("Distribution", "All regions")
  ].join("\n");
  const testing = [
    "CHROME WEB STORE - TEST INSTRUCTIONS TAB",
    "",
    field("Username", `The moderator username from ${privateFileName} (first account listed).`),
    field("Password", `The password of that moderator account, from ${privateFileName}.`),
    field("Additional instructions", `Paste the whole file ${privateFileName}.`),
    "",
    "Before submitting, the Twitch application with Client ID " + (clientId || "<TWITCH_CLIENT_ID>") + " must list these OAuth Redirect URLs:",
    `  Chrome:  ${chromeRedirectUrl(chromeItemId)}`,
    `  Firefox: ${firefoxRedirect}`,
    ""
  ].join("\n");
  return { description: description + "\n", listing, privacy, distribution, testing };
}

export function firefoxSheets({ docs, manifest, supportEmail, captions }) {
  const summary = plainText(markdownSection(docs.listing, "Short Summary"));
  if (summary.length > amoLimits.summary) throw new Error(`The AMO summary has ${summary.length} characters; the limit is ${amoLimits.summary}.`);
  const description = markdownSection(docs.listing, "Detailed Description / Beschreibung");
  const gecko = manifest.browser_specific_settings.gecko;
  const upload = [
    "MOZILLA ADD-ONS (AMO) - SUBMIT A NEW ADD-ON",
    "",
    field("How to distribute this version", "On this site (listed on addons.mozilla.org)"),
    field("Upload file", `upload/chatter-watch-${manifest.version}-firefox.zip`),
    field("Compatibility", `Firefox only (desktop, ${gecko.strict_min_version}+). Untick Firefox for Android.`),
    field("Do you need to submit source code?", "No. Runtime files are plain JavaScript/HTML/CSS copied verbatim; the build only writes manifest.json and zips the files. Nothing is minified, transpiled or bundled."),
    field("Add-on ID (check only)", gecko.id),
    field("Data collection (check only)", `Declared in manifest.json. Required: ${gecko.data_collection_permissions.required.join(", ")}. Optional: ${gecko.data_collection_permissions.optional.join(", ")}.`)
  ].join("\n");
  const describe = [
    "MOZILLA ADD-ONS (AMO) - DESCRIBE ADD-ON",
    "",
    field("Name", manifest.name),
    field("Add-on URL (slug)", "chatterwatch"),
    field("Summary", summary, countNote(summary, amoLimits.summary)),
    field("Description", "Paste the whole file fields/description.txt.", countNote(description)),
    field("This add-on is experimental", "No (leave unticked)"),
    field("This add-on requires payment, non-free services or software, or additional hardware", "No (leave unticked). A free Twitch account is enough."),
    field("Categories", "Social & Communication"),
    field("Support email", supportEmail || "<YOUR MONITORED SUPPORT EMAIL> (required by AMO; none is invented here)"),
    field("Support website", publicUrls.support),
    field("License", "All Rights Reserved"),
    field("This add-on has a privacy policy", "Yes - tick it and paste the whole file fields/privacy-policy.txt"),
    field("Notes to Reviewer", `Paste the whole file ${privateFileName}.`)
  ].join("\n");
  const images = [
    "MOZILLA ADD-ONS (AMO) - EDIT PRODUCT PAGE (after the version is submitted)",
    "",
    field("Icon", "images/icon-128.png (128x128)"),
    field("Screenshots and captions", captions.map((caption, index) => `${index + 1}. images/${screenshots[index]}\n   Caption: ${caption}`).join("\n"), "1280x800, upload in this order"),
    field("Homepage", publicUrls.homepage),
    field("Default locale", "English (en-US)")
  ].join("\n");
  return { description: description + "\n", upload, describe, images, privacyPolicy: plainText(docs.privacy) + "\n" };
}

export function screenshotCaptions(listing) {
  const rows = markdownSection(listing, "Images and Captions").split("\n")
    .map((line) => /^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|/.exec(line))
    .filter(Boolean);
  return screenshots.map((name) => {
    const row = rows.find((match) => match[2] === name);
    if (!row) throw new Error(`STORE_LISTING.md has no caption for ${name}.`);
    return row[3];
  });
}

function readMe({ store, manifest, commit, generated, clientId, chromeItemId, firefoxRedirect, supportEmail }) {
  const head = [
    `ChatterWatch ${manifest.version} - ${store === "chrome" ? "Chrome Web Store" : "Mozilla Add-ons (AMO)"} submission folder`,
    `Generated ${generated} from commit ${commit}.`,
    "",
    `${privateFileName} contains the test-account passwords. It exists only on this computer (dist/ is ignored by Git and never packaged). Paste it only into the store's reviewer field; never post it on GitHub, in issues, chats or e-mail.`,
    "",
    "BEFORE YOU START",
    "[ ] Push the current main branch to GitHub so the privacy policy URL shows the current text.",
    "[ ] Turn off two-step verification on both Twitch test accounts while the review is pending; reviewers cannot receive your codes. The instructions include a fallback if Twitch still asks for an e-mailed code.",
    "[ ] The second (chatter) account must be an ordinary viewer of the first account's channel: not a moderator, VIP or banned. Moderators are exempt from review and cannot be timed out, so step 6 would fail.",
    `[ ] In https://dev.twitch.tv/console/apps open the application with Client ID ${clientId || "<TWITCH_CLIENT_ID>"} and make sure its OAuth Redirect URLs include:`,
    `      ${store === "chrome" ? chromeRedirectUrl(chromeItemId) : firefoxRedirect}`,
    "    (Compare with the redirect URL shown in the extension's Settings after installing it.)",
    ""
  ];
  if (!clientId) head.push("[ ] No Client ID was configured. Re-run: deno task store:submission --client-id <ID>", "");
  if (store === "chrome") {
    return [
      ...head,
      "STEPS",
      "1. Open https://chrome.google.com/webstore/devconsole and click New item.",
      `2. Upload upload/chatter-watch-${manifest.version}-chromium.zip.`,
      chromeItemId
        ? `3. Item ID ${chromeItemId}: its callback above must already be registered in the Twitch application.`
        : "3. Copy the 32-letter item ID of the new draft, add https://<ITEM_ID>.chromiumapp.org/twitch to the Twitch application's OAuth Redirect URLs, then re-run: deno task store:submission --chrome-item-id <ITEM_ID>",
      "4. Store listing tab: fields/1-store-listing.txt (description text: fields/description.txt).",
      "5. Privacy tab: fields/2-privacy.txt",
      "6. Distribution tab: fields/3-distribution.txt",
      `7. Test instructions tab: fields/4-test-instructions.txt and ${privateFileName}.`,
      "8. Click Submit for review.",
      ""
    ].join("\n");
  }
  return [
    ...head,
    "STEPS",
    "1. Open https://addons.mozilla.org/developers/addon/submit/distribution and choose On this site.",
    "2. Follow fields/1-submit.txt (upload, compatibility, source code).",
    `3. Describe add-on: fields/2-describe.txt (description: fields/description.txt, privacy policy: fields/privacy-policy.txt, Notes to Reviewer: ${privateFileName}).`,
    `4. Support email: ${supportEmail || "fill in a real address you monitor."}`,
    "5. Submit the version, then open Edit Product Page and follow fields/3-images-and-details.txt.",
    "6. After approval, download the signed XPI from AMO into dist/packages/ as chatter-watch-<version>-firefox.xpi and run deno task release to attach it to the GitHub release.",
    ""
  ].join("\n");
}

async function copy(from, to) {
  const bytes = await Deno.readFile(from).catch((error) => {
    if (error instanceof Deno.errors.NotFound) throw new Error(`Missing ${fileURLToPath(from)}. Run "deno task store:assets --capture-only" (screenshots) or "deno task build" (packages) first.`);
    throw error;
  });
  await Deno.writeFile(to, bytes);
}

export async function generateSubmission({ output, packages, storeDir, docs, manifest, accountsText, clientId = "", chromeItemId = "", supportEmail = "", commit = "unknown", generated = new Date().toISOString().slice(0, 10) }) {
  validateConfig({ clientId, chromeItemId, supportEmail });
  const accounts = parseAccounts(accountsText);
  if (!output.pathname.endsWith("/store-submission/")) throw new Error("The output directory must be named store-submission.");
  const firefox = manifestFor(manifest, "firefox");
  const firefoxRedirect = await firefoxRedirectUrl(firefox.browser_specific_settings.gecko.id);
  const captions = screenshotCaptions(docs.listing);
  await Deno.remove(output, { recursive: true }).catch((error) => { if (!(error instanceof Deno.errors.NotFound)) throw error; });
  const written = [];
  const write = async (relative, content) => {
    const target = new URL(relative, output);
    await Deno.mkdir(new URL(".", target), { recursive: true });
    if (content instanceof URL) await copy(content, target);
    else await Deno.writeTextFile(target, content);
    written.push(relative);
  };
  const common = { manifest, commit, generated, clientId, chromeItemId, firefoxRedirect, supportEmail };

  const chrome = chromeSheets({ docs, manifest, clientId, chromeItemId, firefoxRedirect });
  await write("chrome-web-store/00-READ-FIRST.txt", readMe({ store: "chrome", ...common }));
  await write(`chrome-web-store/upload/chatter-watch-${manifest.version}-chromium.zip`, new URL(`chatter-watch-${manifest.version}-chromium.zip`, packages));
  await write("chrome-web-store/images/icon-128.png", new URL("icon-128.png", storeDir));
  await write("chrome-web-store/images/promo-440x280.png", new URL("promo-440x280.png", storeDir));
  await write("chrome-web-store/images/marquee-1400x560.png", new URL("marquee-1400x560.png", storeDir));
  for (const name of screenshots) await write(`chrome-web-store/images/${name}`, new URL(`chromium/${name}`, storeDir));
  await write("chrome-web-store/fields/description.txt", chrome.description);
  await write("chrome-web-store/fields/1-store-listing.txt", chrome.listing);
  await write("chrome-web-store/fields/2-privacy.txt", chrome.privacy);
  await write("chrome-web-store/fields/3-distribution.txt", chrome.distribution);
  await write("chrome-web-store/fields/4-test-instructions.txt", chrome.testing);
  await write(`chrome-web-store/${privateFileName}`, reviewerInstructions({ browser: "chrome", accounts, clientId }));

  const amo = firefoxSheets({ docs, manifest: firefox, supportEmail, captions });
  await write("firefox-amo/00-READ-FIRST.txt", readMe({ store: "firefox", ...common }));
  await write(`firefox-amo/upload/chatter-watch-${manifest.version}-firefox.zip`, new URL(`chatter-watch-${manifest.version}-firefox.zip`, packages));
  await write("firefox-amo/images/icon-128.png", new URL("icon-128.png", storeDir));
  for (const name of screenshots) await write(`firefox-amo/images/${name}`, new URL(`firefox/${name}`, storeDir));
  await write("firefox-amo/fields/description.txt", amo.description);
  await write("firefox-amo/fields/privacy-policy.txt", amo.privacyPolicy);
  await write("firefox-amo/fields/1-submit.txt", amo.upload);
  await write("firefox-amo/fields/2-describe.txt", amo.describe);
  await write("firefox-amo/fields/3-images-and-details.txt", amo.images);
  await write(`firefox-amo/${privateFileName}`, reviewerInstructions({ browser: "firefox", accounts, clientId }));

  const leaks = await findAccountData(written.filter((relative) => !relative.endsWith(privateFileName)).map((relative) => new URL(relative, output)), accounts);
  if (leaks.length) throw new Error(`Test-account data appeared outside the private files (${leaks.length} file(s)). Nothing should be submitted; report this as a bug.`);
  return { files: written, accounts: accounts.length, firefoxRedirect, chromeRedirect: chromeRedirectUrl(chromeItemId) };
}

function needles(accounts) {
  return accounts.flatMap(({ username, password }) => [username.toLowerCase(), password.toLowerCase()]).filter((value) => value.length >= 4);
}

export async function findAccountData(files, accounts) {
  const search = needles(accounts);
  const hits = [];
  for (const file of files) {
    const text = decoder.decode(await Deno.readFile(file)).toLowerCase();
    if (search.some((value) => text.includes(value))) hits.push(file);
  }
  return hits;
}

async function git(args) {
  const result = await new Deno.Command("git", { args, cwd: root, stdin: "null", stdout: "piped", stderr: "null" }).output();
  return { ok: result.success, code: result.code, stdout: result.stdout };
}

// Counts only: the values themselves are never printed.
export async function scanRepository(accounts) {
  const search = needles(accounts);
  const tracked = decoder.decode((await git(["ls-files", "-z"])).stdout).split("\0").filter(Boolean);
  const trackedHits = [];
  for (const path of tracked) {
    const bytes = await Deno.readFile(new URL(path, root)).catch(() => null);
    if (bytes && search.some((value) => decoder.decode(bytes).toLowerCase().includes(value))) trackedHits.push(path);
  }
  const history = decoder.decode((await git(["log", "--all", "-p", "--text", "--no-color", "--no-ext-diff"])).stdout).toLowerCase();
  return { trackedFiles: tracked.length, trackedHits, historyHit: search.some((value) => history.includes(value)) };
}

function parseOptions(args) {
  const options = {};
  const names = { "--client-id": "clientId", "--chrome-item-id": "chromeItemId", "--support-email": "supportEmail" };
  for (let index = 0; index < args.length; index += 1) {
    const [flag, inline] = args[index].split(/=(.*)/s);
    if (!names[flag]) throw new Error(`Unknown option ${flag}. Use --client-id, --chrome-item-id or --support-email.`);
    options[names[flag]] = (inline ?? args[++index] ?? "").trim();
  }
  return options;
}

async function main(args) {
  const configUrl = new URL("store-submission.local.json", root);
  const saved = JSON.parse(await Deno.readTextFile(configUrl).catch(() => "{}"));
  const options = { ...saved, ...parseOptions(args) };
  validateConfig(options);
  for (const path of ["store-submission.local.json", "example_accounts.md", "dist/store-submission/chrome-web-store/PRIVATE-reviewer-instructions.txt"]) {
    if (!(await git(["check-ignore", "-q", "--no-index", path])).ok) throw new Error(`${path} must be ignored by Git before private files are generated. Check .gitignore.`);
  }
  const changed = Object.keys(parseOptions(args)).length;
  if (changed) await Deno.writeTextFile(configUrl, JSON.stringify({ clientId: options.clientId || "", chromeItemId: options.chromeItemId || "", supportEmail: options.supportEmail || "" }, null, 2) + "\n");

  const accountsText = await Deno.readTextFile(new URL("example_accounts.md", root)).catch((error) => {
    if (error instanceof Deno.errors.NotFound) throw new Error("example_accounts.md was not found in the repository root. Add the two test accounts there (one per line: username password; moderator/channel owner first).");
    throw error;
  });
  const manifest = JSON.parse(await Deno.readTextFile(new URL("src/manifest.json", root)));
  const docs = {
    listing: await Deno.readTextFile(new URL("docs/STORE_LISTING.md", root)),
    permissions: await Deno.readTextFile(new URL("docs/STORE_PERMISSIONS.md", root)),
    privacy: await Deno.readTextFile(new URL("docs/PRIVACY.md", root))
  };
  const commit = decoder.decode((await git(["rev-parse", "--short", "HEAD"])).stdout).trim() || "unknown";
  await buildPackages();
  const output = new URL("dist/store-submission/", root);
  const result = await generateSubmission({ output, packages: new URL("dist/packages/", root), storeDir: new URL("dist/store/", root), docs, manifest, accountsText, ...options, commit });
  const scan = await scanRepository(parseAccounts(accountsText));

  console.log(`Read ${result.accounts} test accounts from example_accounts.md (values not shown).`);
  console.log(`Wrote ${result.files.length} files to ${fileURLToPath(output)}`);
  console.log(`  ${fileURLToPath(new URL("chrome-web-store/", output))}`);
  console.log(`  ${fileURLToPath(new URL("firefox-amo/", output))}`);
  console.log(`Private reviewer notes: ${privateFileName} in each folder (Git-ignored, local only).`);
  console.log(`Firefox OAuth redirect: ${result.firefoxRedirect}`);
  console.log(`Chrome OAuth redirect:  ${result.chromeRedirect}`);
  if (!options.clientId) console.log("Warning: no Twitch Client ID configured. Re-run with --client-id <ID>.");
  if (!options.supportEmail) console.log("Note: AMO asks for a support email. Add it with --support-email <address> or type it in the form.");
  console.log(`Leak check: account data found in 0 generated public files, ${scan.trackedHits.length} of ${scan.trackedFiles} tracked files, Git history: ${scan.historyHit ? "FOUND" : "none"}.`);
  if (scan.trackedHits.length || scan.historyHit) {
    for (const path of scan.trackedHits) console.log(`  remove account data from: ${path}`);
    throw new Error("Test-account data is present in Git-tracked content. Remove it and change those passwords before publishing the repository.");
  }
}

if (import.meta.main) {
  try { await main(Deno.args); }
  catch (error) {
    console.error(`ERROR: ${error.message}`);
    Deno.exit(1);
  }
}
