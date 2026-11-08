import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from "jsr:@std/assert@1";
import { zipSync } from "npm:fflate@0.8.2";
import { pathToFileURL } from "node:url";
import { changelogSection, collectAssets, githubClient, parseRepository, planAssets, publishRelease, releaseNotes, sha256Hex, signedFirefoxManifest } from "../build/release.js";

const encoder = new TextEncoder();
const commit = "a".repeat(40);
const changelog = "# Changelog\n\n## 1.0.0 - Initial public release\n\n- First entry.\n- Second entry.\n\n## Internal development history\n\n- Old.\n";
const geckoId = "twitch-chatter-watch@extensions.local";

async function asset(name, text) {
  const bytes = encoder.encode(text);
  return { name, bytes, sha256: await sha256Hex(bytes), contentType: "application/zip" };
}

function fakeGitHub({ remoteCommit = true, tagCommit = null, release = null, assets = [] } = {}) {
  const calls = [];
  const state = { release, assets: [...assets], nextId: 50 };
  const github = async (method, path, options = {}) => {
    calls.push({ method, path, body: options.body });
    if (method === "GET" && path === "/repos/old-owner/Old-Name") return { status: 200, data: { full_name: "owner/ChatterWatch" } };
    if (method === "GET" && path.startsWith("/repos/owner/ChatterWatch/commits/")) return { status: remoteCommit ? 200 : 422, data: null };
    if (method === "GET" && path.startsWith("/repos/owner/ChatterWatch/git/ref/tags/")) {
      return tagCommit ? { status: 200, data: { object: { type: "commit", sha: tagCommit } } } : { status: 404, data: null };
    }
    if (method === "GET" && path.startsWith("/repos/owner/ChatterWatch/releases/tags/")) {
      return state.release && !state.release.draft ? { status: 200, data: state.release } : { status: 404, data: null };
    }
    if (method === "GET" && path === "/repos/owner/ChatterWatch/releases?per_page=100") return { status: 200, data: state.release ? [state.release] : [] };
    if (method === "GET" && path.endsWith("/assets?per_page=100")) return { status: 200, data: state.assets };
    if (method === "POST" && path === "/repos/owner/ChatterWatch/releases") {
      state.release = { id: 7, tag_name: options.body.tag_name, draft: true, body: options.body.body, target_commitish: options.body.target_commitish, upload_url: "https://uploads.github.com/repos/owner/ChatterWatch/releases/7/assets{?name,label}", html_url: "https://github.com/owner/ChatterWatch/releases/tag/v1.0.0" };
      return { status: 201, data: state.release };
    }
    if (method === "POST" && path.startsWith("https://uploads.github.com/")) {
      const name = decodeURIComponent(new URL(path).searchParams.get("name"));
      state.assets.push({ id: state.nextId++, name, state: "uploaded", digest: `sha256:${await sha256Hex(options.body)}` });
      return { status: 201, data: {} };
    }
    if (method === "DELETE") {
      state.assets = state.assets.filter((item) => !path.endsWith(`/assets/${item.id}`));
      return { status: 204, data: null };
    }
    if (method === "PATCH") {
      state.release = { ...state.release, ...options.body, draft: options.body.draft ?? state.release.draft };
      return { status: 200, data: state.release };
    }
    throw new Error(`Unexpected ${method} ${path}`);
  };
  return { github, calls, state };
}

async function localAssets() {
  return [await asset("chatter-watch-1.0.0-chromium.zip", "chromium"), await asset("SHA256SUMS.txt", "sums\n")];
}

function publishOptions(github, assets, overrides = {}) {
  return { github, repo: "old-owner/Old-Name", tag: "v1.0.0", commit, assets, notesFor: (repo) => `notes for ${repo}`, log: () => {}, ...overrides };
}

const mutations = (calls) => calls.filter((call) => call.method !== "GET");

Deno.test("release repository parsing accepts HTTPS and SSH GitHub remotes", () => {
  assertEquals(parseRepository("https://github.com/yeraysampedro/Twtich-Moderatr.git"), "yeraysampedro/Twtich-Moderatr");
  assertEquals(parseRepository("git@github.com:yeraysampedro/ChatterWatch.git\n"), "yeraysampedro/ChatterWatch");
  assertEquals(parseRepository("https://github.com/owner/repo.name"), "owner/repo.name");
  assertThrows(() => parseRepository("https://gitlab.com/owner/repo.git"), Error, "GITHUB_REPOSITORY");
});

Deno.test("release notes use only the matching changelog section and list attached files", async () => {
  assertEquals(changelogSection(changelog, "1.0.0"), "- First entry.\n- Second entry.");
  assertThrows(() => changelogSection(changelog, "2.0.0"), Error, "## 2.0.0");
  const assets = [await asset("chatter-watch-1.0.0-chromium.zip", "a"), await asset("chatter-watch-1.0.0-firefox-unsigned.xpi", "b"), { name: "SHA256SUMS.txt", bytes: encoder.encode("abc  chatter-watch-1.0.0-chromium.zip\n") }];
  const notes = releaseNotes({ repo: "owner/ChatterWatch", tag: "v1.0.0", version: "1.0.0", changelog, assets });
  assertStringIncludes(notes, "`chatter-watch-1.0.0-chromium.zip`");
  assertStringIncludes(notes, "**unsigned**");
  assertStringIncludes(notes, "A Mozilla-signed Firefox XPI is not attached yet");
  assertStringIncludes(notes, "https://github.com/owner/ChatterWatch/blob/v1.0.0/docs/PRIVACY.md");
  assertStringIncludes(notes, "abc  chatter-watch-1.0.0-chromium.zip");
  assert(!notes.includes("Old."));
  assert(!notes.includes("chatter-watch-1.0.0-firefox.zip`"));
});

Deno.test("asset plan uploads new files, keeps identical digests and refuses silent overwrites", async () => {
  const [chromium, sums] = await localAssets();
  const existing = [{ id: 1, name: chromium.name, state: "uploaded", digest: `sha256:${chromium.sha256}` }, { id: 2, name: sums.name, state: "uploaded", digest: "sha256:different" }];
  assertThrows(() => planAssets(existing, [chromium, sums]), Error, "--replace");
  const replaced = planAssets(existing, [chromium, sums], { replace: true });
  assertEquals(replaced.skip.map((item) => item.name), [chromium.name]);
  assertEquals(replaced.remove.map((item) => item.id), [2]);
  assertEquals(replaced.upload.map((item) => item.name), [sums.name]);
  const broken = planAssets([{ id: 3, name: chromium.name, state: "starter" }], [chromium]);
  assertEquals(broken.remove.map((item) => item.id), [3]);
  assertEquals(planAssets([], [chromium]).upload.length, 1);
});

Deno.test("publishing creates a draft at the commit, uploads every asset, then publishes it as latest", async () => {
  const fake = fakeGitHub();
  const assets = await localAssets();
  const result = await publishRelease(publishOptions(fake.github, assets));
  assertEquals(result.repo, "owner/ChatterWatch");
  assertEquals(result.published, true);
  const [create, ...rest] = mutations(fake.calls);
  assertEquals(create.body.target_commitish, commit);
  assertEquals(create.body.tag_name, "v1.0.0");
  assertEquals(create.body.draft, true);
  assertEquals(create.body.body, "notes for owner/ChatterWatch");
  assertEquals(rest.filter((call) => call.method === "POST").map((call) => new URL(call.path).searchParams.get("name")), assets.map((item) => item.name));
  assertEquals(rest.at(-1).method, "PATCH");
  assertEquals(rest.at(-1).body, { draft: false, make_latest: "true" });
  assertEquals(fake.state.release.draft, false);
});

Deno.test("re-running a published release with identical files changes nothing", async () => {
  const assets = await localAssets();
  const release = { id: 7, tag_name: "v1.0.0", draft: false, body: "notes for owner/ChatterWatch", target_commitish: "main", upload_url: "https://uploads.github.com/x{?name}", html_url: "https://github.com/owner/ChatterWatch/releases/tag/v1.0.0" };
  const fake = fakeGitHub({ release, tagCommit: commit, assets: assets.map((item, index) => ({ id: index + 1, name: item.name, state: "uploaded", digest: `sha256:${item.sha256}` })) });
  const result = await publishRelease(publishOptions(fake.github, assets));
  assertEquals(mutations(fake.calls), []);
  assertEquals(result.skip, assets.map((item) => item.name));
  assertEquals(result.published, true);
});

Deno.test("dry runs and declined confirmations never modify GitHub", async () => {
  const assets = await localAssets();
  const dry = fakeGitHub();
  const result = await publishRelease(publishOptions(dry.github, assets, { dryRun: true }));
  assertEquals(result.dryRun, true);
  assertEquals(result.upload, assets.map((item) => item.name));
  assertEquals(mutations(dry.calls), []);
  const declined = fakeGitHub();
  await assertRejects(() => publishRelease(publishOptions(declined.github, assets, { confirm: async () => false })), Error, "Nothing was changed");
  assertEquals(mutations(declined.calls), []);
});

Deno.test("publishing refuses unpushed commits, mismatched tags and stale drafts", async () => {
  const assets = await localAssets();
  const unpushed = fakeGitHub({ remoteCommit: false });
  await assertRejects(() => publishRelease(publishOptions(unpushed.github, assets)), Error, "git push");
  const moved = fakeGitHub({ tagCommit: "b".repeat(40) });
  await assertRejects(() => publishRelease(publishOptions(moved.github, assets)), Error, "points to bbbbbbb");
  const stale = fakeGitHub({ release: { id: 7, tag_name: "v1.0.0", draft: true, target_commitish: "c".repeat(40), upload_url: "x" } });
  await assertRejects(() => publishRelease(publishOptions(stale.github, assets)), Error, "Delete that draft");
  for (const fake of [unpushed, moved, stale]) assertEquals(mutations(fake.calls), []);
});

Deno.test("draft mode uploads files but leaves the release unpublished", async () => {
  const fake = fakeGitHub();
  const result = await publishRelease(publishOptions(fake.github, await localAssets(), { draft: true }));
  assertEquals(result.published, false);
  assert(!mutations(fake.calls).some((call) => call.method === "PATCH"));
});

Deno.test("GitHub client authenticates, sends binary uploads raw and never echoes the token", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, init });
    if (url.includes("broken")) return new Response(JSON.stringify({ message: "Resource not accessible by integration" }), { status: 403 });
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  };
  const github = githubClient({ token: "secret-token-value", fetchImpl });
  const bytes = encoder.encode("zip");
  await github("POST", "https://uploads.github.com/repos/o/r/releases/1/assets?name=a.zip", { body: bytes, contentType: "application/zip" });
  assertEquals(requests[0].init.headers.Authorization, "Bearer secret-token-value");
  assertEquals(requests[0].init.headers["Content-Type"], "application/zip");
  assertEquals(requests[0].init.body, bytes);
  await github("PATCH", "/repos/o/r/releases/1", { body: { draft: false } });
  assertEquals(requests[1].url, "https://api.github.com/repos/o/r/releases/1");
  assertEquals(requests[1].init.body, "{\"draft\":false}");
  const error = await assertRejects(() => github("GET", "/repos/o/broken"), Error, "HTTP 403 Resource not accessible");
  assert(!error.message.includes("secret-token-value"));
  assertStringIncludes(error.message, "Contents: read and write");
});

Deno.test("release assets add checksums and attach only a matching Mozilla-signed XPI", async () => {
  const directory = await Deno.makeTempDir();
  const url = new URL(`${pathToFileURL(directory).href}/`);
  try {
    for (const name of ["chromium.zip", "firefox.zip", "firefox-unsigned.xpi"]) await Deno.writeTextFile(new URL(`chatter-watch-1.0.0-${name}`, url), name);
    const plain = await collectAssets({ version: "1.0.0", directory: url, geckoId });
    assertEquals(plain.map((item) => item.name), ["chatter-watch-1.0.0-chromium.zip", "chatter-watch-1.0.0-firefox.zip", "chatter-watch-1.0.0-firefox-unsigned.xpi", "SHA256SUMS.txt"]);
    assertEquals(new TextDecoder().decode(plain.at(-1).bytes).split("\n")[0], `${await sha256Hex(encoder.encode("chromium.zip"))}  chatter-watch-1.0.0-chromium.zip`);
    assertEquals(plain[2].contentType, "application/x-xpinstall");

    const manifest = (version, id = geckoId) => encoder.encode(JSON.stringify({ version, browser_specific_settings: { gecko: { id } } }));
    const signedXpi = new URL("chatter-watch-1.0.0-firefox.xpi", url);
    await Deno.writeFile(signedXpi, zipSync({ "manifest.json": manifest("1.0.0") }));
    await assertRejects(() => collectAssets({ version: "1.0.0", directory: url, geckoId }), Error, "not signed by Mozilla");
    await Deno.writeFile(signedXpi, zipSync({ "manifest.json": manifest("0.9.0"), "META-INF/manifest.mf": encoder.encode("x"), "META-INF/mozilla.rsa": encoder.encode("x") }));
    await assertRejects(() => collectAssets({ version: "1.0.0", directory: url, geckoId }), Error, "does not match");
    const valid = zipSync({ "manifest.json": manifest("1.0.0"), "META-INF/manifest.mf": encoder.encode("x"), "META-INF/cose.sig": encoder.encode("x") });
    assertEquals(signedFirefoxManifest(valid).version, "1.0.0");
    assertEquals(signedFirefoxManifest(encoder.encode("not a zip")), null);
    await Deno.writeFile(signedXpi, valid);
    const signed = await collectAssets({ version: "1.0.0", directory: url, geckoId });
    assertEquals(signed.find((item) => item.name.endsWith("firefox.xpi")).signed, true);
    assertEquals(signed.at(-1).name, "SHA256SUMS.txt");
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
