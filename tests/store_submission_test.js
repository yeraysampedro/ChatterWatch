import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from "jsr:@std/assert@1";
import { pathToFileURL } from "node:url";
import { chromeRedirectUrl, firefoxRedirectUrl, generateSubmission, markdownSection, parseAccounts, plainText, privateFileName, reviewerInstructions, validateConfig } from "../build/store-submission.js";

const repo = new URL("../", import.meta.url);
const manifest = JSON.parse(await Deno.readTextFile(new URL("src/manifest.json", repo)));
const docs = {
  listing: await Deno.readTextFile(new URL("docs/STORE_LISTING.md", repo)),
  permissions: await Deno.readTextFile(new URL("docs/STORE_PERMISSIONS.md", repo)),
  privacy: await Deno.readTextFile(new URL("docs/PRIVACY.md", repo))
};
const fictional = "Fict_Moderator_01   Mod*Pass-4821\nfict_chatter_0002\tChat*Word-9375\n";
const secrets = ["Fict_Moderator_01", "Mod*Pass-4821", "fict_chatter_0002", "Chat*Word-9375"];
const clientId = "abcdefghij0123456789klmnopqrst";
const screenshots = ["01-review-dashboard.png", "02-multichat-grid.png", "03-unified-feed.png", "04-timeout-confirmation.png", "05-chatter-history.png"];

async function fixture() {
  const directory = await Deno.makeTempDir();
  const base = new URL(`${pathToFileURL(directory).href}/`);
  const packages = new URL("packages/", base);
  const storeDir = new URL("store/", base);
  for (const dir of [packages, new URL("chromium/", storeDir), new URL("firefox/", storeDir)]) await Deno.mkdir(dir, { recursive: true });
  for (const target of ["chromium", "firefox"]) await Deno.writeTextFile(new URL(`chatter-watch-${manifest.version}-${target}.zip`, packages), `${target} package`);
  for (const name of ["icon-128.png", "promo-440x280.png", "marquee-1400x560.png"]) await Deno.writeTextFile(new URL(name, storeDir), name);
  for (const name of screenshots) {
    await Deno.writeTextFile(new URL(`chromium/${name}`, storeDir), `chromium ${name}`);
    await Deno.writeTextFile(new URL(`firefox/${name}`, storeDir), `firefox ${name}`);
  }
  return { directory, output: new URL("dist/store-submission/", base), packages, storeDir };
}

async function walk(url, prefix = "") {
  const files = [];
  for await (const entry of Deno.readDir(url)) {
    if (entry.isDirectory) files.push(...await walk(new URL(`${entry.name}/`, url), `${prefix}${entry.name}/`));
    else files.push(`${prefix}${entry.name}`);
  }
  return files.sort();
}

Deno.test("store submission reads exactly two private accounts without echoing their values", () => {
  const accounts = parseAccounts(`\uFEFF# test accounts\n\n- ${fictional.split("\n")[0]}\n2. ${fictional.split("\n")[1]}\n`);
  assertEquals(accounts, [{ username: "Fict_Moderator_01", password: "Mod*Pass-4821" }, { username: "fict_chatter_0002", password: "Chat*Word-9375" }]);
  for (const [text, message] of [
    ["only_one Secret*1", "exactly 2"],
    ["user_aaa pw1\nuser_bbb pw2\nuser_ccc pw3", "exactly 2"],
    ["user.name@mail Secret*1\nother_user Secret*2", "not a valid Twitch username"],
    ["lonelyword\nother_user Secret*2", "username and a password"],
    ["Same_User Secret*1\nsame_user Secret*2", "same username"]
  ]) {
    const error = assertThrows(() => parseAccounts(text), Error, message);
    for (const value of ["Secret*1", "Secret*2", "user.name@mail", "lonelyword", "Same_User"]) assert(!error.message.includes(value), `error leaked ${value}`);
  }
});

Deno.test("store submission validates public identifiers and computes both OAuth callbacks", async () => {
  validateConfig({ clientId, chromeItemId: "abcdefghijklmnopabcdefghijklmnop", supportEmail: "support@example.com" });
  assertThrows(() => validateConfig({ clientId: "has spaces and secret" }), Error, "Client ID");
  assertThrows(() => validateConfig({ chromeItemId: "z".repeat(32) }), Error, "32-letter");
  assertThrows(() => validateConfig({ supportEmail: "not-an-email" }), Error, "email");
  assertEquals(await firefoxRedirectUrl("twitch-chatter-watch@extensions.local"), "https://810e4855c577651081e071dad8a7352e33dc5229.extensions.allizom.org/twitch");
  assertEquals(chromeRedirectUrl("abcdefghijklmnopabcdefghijklmnop"), "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/twitch");
  assertStringIncludes(chromeRedirectUrl(""), "<CHROME_ITEM_ID>");
});

Deno.test("reviewer instructions are one plain paste-ready text with both accounts and real UI labels", () => {
  const accounts = parseAccounts(fictional);
  for (const browser of ["chrome", "firefox"]) {
    const text = reviewerInstructions({ browser, accounts, clientId });
    for (const value of [...secrets, clientId, "fict_moderator_01", "https://www.twitch.tv/fict_moderator_01"]) assertStringIncludes(text, value);
    for (const label of ["Pin in a browser tab", "I have read this notice and consent to the data use described above.", "Allow data use", "Stay offline", "Twitch application client ID", "Twitch channel", "Connect", "Monitoring fict_moderator_01", "All chatters", "Pending review", "Add note", "History", "Approve", "Timeout", "Ban", "Unban / end timeout", "Multichat", "Grid", "Unified", "Withdraw consent and disconnect"]) assertStringIncludes(text, label);
    assertStringIncludes(text, browser === "chrome" ? "Chrome toolbar" : "Firefox toolbar");
    assertStringIncludes(text, "verification code");
    assert(!/[|*#`]{2}|^\|/m.test(text.replaceAll("Mod*Pass", "").replaceAll("Chat*Word", "")), "no Markdown tables or formatting");
    assert(text.length < 3000, `reviewer text is ${text.length} characters`);
  }
});

Deno.test("documentation helpers extract exact store copy as plain text", () => {
  assertStringIncludes(markdownSection(docs.listing, "Detailed Description / Beschreibung"), "DATA USE AND YOUR CHOICE");
  assert(!markdownSection(docs.listing, "Detailed Description / Beschreibung").includes("## Deutsch"));
  assertThrows(() => markdownSection(docs.listing, "Missing heading"), Error, "Missing heading");
  assertEquals(plainText("## Title\n\nUse **Allow** and `code` [docs](PRIVACY.md) [site](https://example.com)."), "TITLE\n\nUse Allow and code docs site (https://example.com).");
});

Deno.test("store submission writes two complete folders and keeps account data only in the private notes", async () => {
  const { directory, output, packages, storeDir } = await fixture();
  try {
    await Deno.mkdir(output, { recursive: true });
    await Deno.writeTextFile(new URL("stale.txt", output), "old");
    const result = await generateSubmission({ output, packages, storeDir, docs, manifest, accountsText: fictional, clientId, commit: "abc1234", generated: "2026-11-08" });
    const files = await walk(output);
    assertEquals(files, result.files.slice().sort());
    assert(!files.includes("stale.txt"));
    for (const store of ["chrome-web-store", "firefox-amo"]) {
      for (const name of ["00-READ-FIRST.txt", privateFileName, "fields/description.txt", "images/icon-128.png", ...screenshots.map((name) => `images/${name}`)]) assert(files.includes(`${store}/${name}`), `${store}/${name}`);
    }
    for (const name of ["upload/chatter-watch-1.0.0-chromium.zip", "images/promo-440x280.png", "images/marquee-1400x560.png", "fields/1-store-listing.txt", "fields/2-privacy.txt", "fields/3-distribution.txt", "fields/4-test-instructions.txt"]) assert(files.includes(`chrome-web-store/${name}`), name);
    for (const name of ["upload/chatter-watch-1.0.0-firefox.zip", "fields/privacy-policy.txt", "fields/1-submit.txt", "fields/2-describe.txt", "fields/3-images-and-details.txt"]) assert(files.includes(`firefox-amo/${name}`), name);
    assertEquals(await Deno.readTextFile(new URL("firefox-amo/images/02-multichat-grid.png", output)), "firefox 02-multichat-grid.png");
    assertEquals(await Deno.readTextFile(new URL("chrome-web-store/images/02-multichat-grid.png", output)), "chromium 02-multichat-grid.png");

    for (const file of files) {
      const text = (await Deno.readTextFile(new URL(file, output))).toLowerCase();
      const isPrivate = file.endsWith(privateFileName);
      for (const value of secrets) assertEquals(text.includes(value.toLowerCase()), isPrivate, `${file} / account value presence`);
    }

    const read = (file) => Deno.readTextFile(new URL(file, output));
    assertEquals(await read("chrome-web-store/fields/description.txt"), `${markdownSection(docs.listing, "Detailed Description / Beschreibung")}\n`);
    assert((await read("chrome-web-store/fields/description.txt")).startsWith("DATA USE AND YOUR CHOICE"));
    const listing = await read("chrome-web-store/fields/1-store-listing.txt");
    for (const value of ["Tools", "https://github.com/yeraysampedro/ChatterWatch/issues", manifest.description]) assertStringIncludes(listing, value);
    const privacy = await read("chrome-web-store/fields/2-privacy.txt");
    for (const value of ["one dedicated workspace", "Host permission justification", "No, I am not using Remote code", "Authentication information", "Personal communications", "https://github.com/yeraysampedro/ChatterWatch/blob/main/docs/PRIVACY.md"]) assertStringIncludes(privacy, value);
    assert(!privacy.includes("**"));
    assertStringIncludes(await read("chrome-web-store/fields/3-distribution.txt"), "All regions");
    const testing = await read("chrome-web-store/fields/4-test-instructions.txt");
    assertStringIncludes(testing, "https://810e4855c577651081e071dad8a7352e33dc5229.extensions.allizom.org/twitch");
    assertStringIncludes(testing, "<CHROME_ITEM_ID>");
    const describe = await read("firefox-amo/fields/2-describe.txt");
    for (const value of ["chatterwatch", "Social & Communication", "All Rights Reserved", "Read and moderate Twitch chat", "<YOUR MONITORED SUPPORT EMAIL>"]) assertStringIncludes(describe, value);
    assertStringIncludes(await read("firefox-amo/fields/1-submit.txt"), "twitch-chatter-watch@extensions.local");
    assertStringIncludes(await read("firefox-amo/fields/3-images-and-details.txt"), "Review pending chatters, signals and notes.");
    const policy = await read("firefox-amo/fields/privacy-policy.txt");
    assert(policy.startsWith("PRIVACY AND DATA HANDLING"));
    assert(!policy.includes("**"));
    assertStringIncludes(await read("chrome-web-store/00-READ-FIRST.txt"), "--chrome-item-id");
    assertStringIncludes(await read("firefox-amo/00-READ-FIRST.txt"), "810e4855c577651081e071dad8a7352e33dc5229");

    const withItem = await generateSubmission({ output, packages, storeDir, docs, manifest, accountsText: fictional, clientId, chromeItemId: "abcdefghijklmnopabcdefghijklmnop", supportEmail: "support@example.com" });
    assertEquals(withItem.chromeRedirect, "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/twitch");
    assertStringIncludes(await read("chrome-web-store/fields/4-test-instructions.txt"), withItem.chromeRedirect);
    assertStringIncludes(await read("firefox-amo/fields/2-describe.txt"), "support@example.com");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("store submission refuses unsafe output paths, missing assets and invalid accounts before writing", async () => {
  const { directory, output, packages, storeDir } = await fixture();
  try {
    await assertRejects(() => generateSubmission({ output: new URL("../other/", output), packages, storeDir, docs, manifest, accountsText: fictional, clientId }), Error, "store-submission");
    await assertRejects(() => generateSubmission({ output, packages, storeDir, docs, manifest, accountsText: "one_account Secret*1", clientId }), Error, "exactly 2");
    await assertRejects(() => Deno.stat(output), Deno.errors.NotFound);
    await Deno.remove(new URL("firefox/05-chatter-history.png", storeDir));
    await assertRejects(() => generateSubmission({ output, packages, storeDir, docs, manifest, accountsText: fictional, clientId }), Error, "store:assets --capture-only");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
