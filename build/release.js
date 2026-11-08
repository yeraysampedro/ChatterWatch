import { unzipSync } from "npm:fflate@0.8.2";
import { fileURLToPath } from "node:url";
import { buildPackages, manifestFor } from "./build.js";

const root = new URL("../", import.meta.url);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const apiRoot = "https://api.github.com";
const contentTypes = { ".zip": "application/zip", ".xpi": "application/x-xpinstall", ".txt": "text/plain; charset=utf-8" };

export function parseRepository(remote) {
  const match = /github\.com[:/]+([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.exec(String(remote).trim());
  if (!match) throw new Error("The origin remote is not a GitHub repository. Set GITHUB_REPOSITORY=owner/name.");
  return `${match[1]}/${match[2]}`;
}

export async function sha256Hex(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function signedFirefoxManifest(bytes) {
  let entries;
  try { entries = unzipSync(bytes); } catch { return null; }
  const signed = entries["META-INF/manifest.mf"] && (entries["META-INF/mozilla.rsa"] || entries["META-INF/cose.sig"]);
  if (!signed || !entries["manifest.json"]) return null;
  try { return JSON.parse(decoder.decode(entries["manifest.json"])); } catch { return null; }
}

async function readOptional(url) {
  try { return await Deno.readFile(url); }
  catch (error) { if (error instanceof Deno.errors.NotFound) return null; throw error; }
}

export async function collectAssets({ version, directory, geckoId }) {
  const names = [`chatter-watch-${version}-chromium.zip`, `chatter-watch-${version}-firefox.zip`, `chatter-watch-${version}-firefox-unsigned.xpi`];
  const assets = [];
  for (const name of names) {
    const bytes = await readOptional(new URL(name, directory));
    if (!bytes) throw new Error(`Missing package ${name}. Run deno task build.`);
    assets.push({ name, bytes });
  }
  // A Mozilla-signed XPI is never built here; it is attached only when the publisher has downloaded it from AMO.
  const signedName = `chatter-watch-${version}-firefox.xpi`;
  const signed = await readOptional(new URL(signedName, directory));
  if (signed) {
    const manifest = signedFirefoxManifest(signed);
    if (!manifest) throw new Error(`${signedName} is not signed by Mozilla. Remove it or replace it with the signed XPI downloaded from AMO.`);
    if (manifest.version !== version || manifest.browser_specific_settings?.gecko?.id !== geckoId) {
      throw new Error(`${signedName} is signed, but its version/add-on ID does not match ${version} / ${geckoId}.`);
    }
    assets.push({ name: signedName, bytes: signed, signed: true });
  }
  for (const asset of assets) asset.sha256 = await sha256Hex(asset.bytes);
  const checksums = assets.map((asset) => `${asset.sha256}  ${asset.name}`).join("\n") + "\n";
  const sums = { name: "SHA256SUMS.txt", bytes: encoder.encode(checksums) };
  sums.sha256 = await sha256Hex(sums.bytes);
  assets.push(sums);
  for (const asset of assets) asset.contentType = contentTypes[asset.name.slice(asset.name.lastIndexOf("."))];
  return assets;
}

export function changelogSection(changelog, version) {
  const lines = changelog.replaceAll("\r\n", "\n").split("\n");
  const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
  if (start < 0) throw new Error(`docs/CHANGELOG.md has no "## ${version}" section. Add release notes before publishing.`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

export function releaseNotes({ repo, tag, version, changelog, assets }) {
  const has = (name) => assets.some((asset) => asset.name === name);
  const rows = [
    [`chatter-watch-${version}-chromium.zip`, "Chrome, Edge and other Chromium browsers 116+. Unzip, then **Load unpacked** in developer mode."],
    [`chatter-watch-${version}-firefox.xpi`, "Firefox 140+ desktop, **signed by Mozilla**: permanent installation."],
    [`chatter-watch-${version}-firefox-unsigned.xpi`, "Firefox 140+ desktop, **unsigned**: temporary installation through `about:debugging` only."],
    [`chatter-watch-${version}-firefox.zip`, "Same unsigned Firefox package as ZIP (store and source-review input)."],
    ["SHA256SUMS.txt", "SHA-256 checksums of the files above."]
  ].filter(([name]) => has(name));
  const base = `https://github.com/${repo}/blob/${tag}`;
  return [
    `ChatterWatch ${version} for desktop Chrome/Chromium 116+ and Firefox 140+.`,
    "",
    "## Downloads",
    "",
    "| File | Use |",
    "| --- | --- |",
    ...rows.map(([name, use]) => `| \`${name}\` | ${use} |`),
    "",
    `Installation steps: [README](${base}/README.md#download-a-release). Privacy policy: [PRIVACY.md](${base}/docs/PRIVACY.md).`,
    ...(has(`chatter-watch-${version}-firefox.xpi`) ? [] : ["", "A Mozilla-signed Firefox XPI is not attached yet. Install from Mozilla Add-ons once it is approved, or use the unsigned XPI temporarily."]),
    "",
    "## Changes",
    "",
    changelogSection(changelog, version),
    "",
    "## SHA-256",
    "",
    "```text",
    decoder.decode(assets.find((asset) => asset.name === "SHA256SUMS.txt").bytes).trimEnd(),
    "```",
    ""
  ].join("\n");
}

export function planAssets(existing, local, { replace = false } = {}) {
  const current = new Map(existing.map((asset) => [asset.name, asset]));
  const plan = { upload: [], skip: [], remove: [] };
  for (const asset of local) {
    const remote = current.get(asset.name);
    if (!remote) { plan.upload.push(asset); continue; }
    if (remote.state === "uploaded" && remote.digest === `sha256:${asset.sha256}`) { plan.skip.push(asset); continue; }
    if (remote.state === "uploaded" && !replace) {
      throw new Error(`Release asset ${asset.name} already exists with different content${remote.digest ? "" : " (GitHub reported no checksum)"}. Re-run with --replace to overwrite it.`);
    }
    plan.remove.push(remote);
    plan.upload.push(asset);
  }
  return plan;
}

export function githubClient({ token, fetchImpl = fetch }) {
  return async (method, path, { body, contentType, allow = [] } = {}) => {
    const url = path.startsWith("https://") ? path : `${apiRoot}${path}`;
    const binary = body instanceof Uint8Array;
    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ChatterWatch-Release",
        ...(body === undefined ? {} : { "Content-Type": binary ? contentType : "application/json" })
      },
      body: body === undefined ? undefined : binary ? body : JSON.stringify(body)
    });
    if (allow.includes(response.status)) { await response.body?.cancel(); return { status: response.status, data: null }; }
    if (!response.ok) {
      const text = await response.text();
      let detail = text.slice(0, 300);
      try { detail = JSON.parse(text).message || detail; } catch { /* keep text */ }
      const hint = response.status === 401 ? " Check that the token is valid." : response.status === 403 || response.status === 404 ? " Check that the token can write releases (Contents: read and write) for this repository." : "";
      throw new Error(`GitHub ${method} ${new URL(url).pathname} failed: HTTP ${response.status} ${detail}.${hint}`);
    }
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
}

async function remoteTagCommit(github, repo, tag) {
  const ref = await github("GET", `/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`, { allow: [404] });
  if (ref.status === 404) return null;
  let object = ref.data.object;
  for (let depth = 0; object.type === "tag" && depth < 5; depth += 1) object = (await github("GET", `/repos/${repo}/git/tags/${object.sha}`)).data.object;
  if (object.type !== "commit") throw new Error(`Tag ${tag} on GitHub does not point to a commit.`);
  return object.sha;
}

async function findRelease(github, repo, tag) {
  const published = await github("GET", `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, { allow: [404] });
  if (published.status === 200) return published.data;
  const { data } = await github("GET", `/repos/${repo}/releases?per_page=100`);
  return data.find((release) => release.tag_name === tag) || null;
}

export async function publishRelease({ github, repo, tag, commit, assets, notesFor, dryRun = false, replace = false, draft = false, confirm = async () => true, log = console.log }) {
  const fullName = (await github("GET", `/repos/${repo}`)).data.full_name;
  const pushed = await github("GET", `/repos/${fullName}/commits/${commit}`, { allow: [404, 422] });
  if (pushed.status !== 200) throw new Error(`Commit ${commit.slice(0, 7)} is not on GitHub (${fullName}). Push it first, for example: git push origin HEAD`);
  const tagged = await remoteTagCommit(github, fullName, tag);
  if (tagged && tagged !== commit) throw new Error(`Tag ${tag} on GitHub points to ${tagged.slice(0, 7)}, not to the commit being released (${commit.slice(0, 7)}).`);
  let release = await findRelease(github, fullName, tag);
  if (release?.draft && /^[0-9a-f]{40}$/.test(release.target_commitish) && release.target_commitish !== commit) {
    throw new Error(`An existing draft release for ${tag} targets ${release.target_commitish.slice(0, 7)}, not ${commit.slice(0, 7)}. Delete that draft on GitHub first.`);
  }
  const existing = release ? (await github("GET", `/repos/${fullName}/releases/${release.id}/assets?per_page=100`)).data : [];
  const plan = planAssets(existing, assets, { replace });
  const notes = notesFor(fullName);
  const summary = { repo: fullName, tag, creates: !release, upload: plan.upload.map((asset) => asset.name), skip: plan.skip.map((asset) => asset.name), remove: plan.remove.map((asset) => asset.name) };
  log(`Repository: ${fullName}`);
  log(`Release ${tag}: ${release ? (release.draft ? "existing draft" : "already published") : "will be created"}${tagged ? "" : `; GitHub will create tag ${tag} at ${commit.slice(0, 7)}`}`);
  for (const name of summary.upload) log(`  upload  ${name}`);
  for (const name of summary.skip) log(`  keep    ${name} (identical)`);
  for (const name of summary.remove) log(`  replace ${name}`);
  if (dryRun) return { ...summary, dryRun: true, notes };
  if (!await confirm(summary)) throw new Error("Cancelled. Nothing was changed on GitHub.");

  if (!release) {
    release = (await github("POST", `/repos/${fullName}/releases`, {
      body: { tag_name: tag, target_commitish: commit, name: `ChatterWatch ${tag}`, body: notes, draft: true, prerelease: false }
    })).data;
  }
  for (const asset of plan.remove) await github("DELETE", `/repos/${fullName}/releases/assets/${asset.id}`);
  const uploadUrl = release.upload_url.replace(/\{.*\}$/, "");
  for (const asset of plan.upload) {
    await github("POST", `${uploadUrl}?name=${encodeURIComponent(asset.name)}`, { body: asset.bytes, contentType: asset.contentType });
    log(`Uploaded ${asset.name}`);
  }
  const update = {};
  if (release.body !== notes) update.body = notes;
  if (release.draft && !draft) Object.assign(update, { draft: false, make_latest: "true" });
  if (Object.keys(update).length) release = (await github("PATCH", `/repos/${fullName}/releases/${release.id}`, { body: update })).data;
  return { ...summary, dryRun: false, url: release.html_url, published: !release.draft };
}

async function git(args, { optional = false } = {}) {
  const result = await new Deno.Command("git", { args, cwd: root, stdin: "null", stdout: "piped", stderr: "piped" }).output();
  if (!result.success) {
    if (optional) return "";
    throw new Error(`git ${args.join(" ")} failed: ${decoder.decode(result.stderr).trim()}`);
  }
  return decoder.decode(result.stdout).trim();
}

async function gitCredential(allowInteractive) {
  try {
    const child = new Deno.Command("git", {
      args: ["credential", "fill"], cwd: root, stdin: "piped", stdout: "piped", stderr: "null",
      env: { GIT_TERMINAL_PROMPT: "0", ...(allowInteractive ? {} : { GCM_INTERACTIVE: "never" }) }
    }).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(encoder.encode("protocol=https\nhost=github.com\n\n"));
    await writer.close();
    const result = await child.output();
    if (!result.success) return "";
    return decoder.decode(result.stdout).split(/\r?\n/).find((line) => line.startsWith("password="))?.slice(9).trim() || "";
  } catch { return ""; }
}

async function promptSecret(message) {
  if (!Deno.stdin.isTerminal()) return "";
  await Deno.stdout.write(encoder.encode(message));
  const typed = [];
  const buffer = new Uint8Array(1);
  Deno.stdin.setRaw(true);
  try {
    while (true) {
      if (await Deno.stdin.read(buffer) === null) break;
      const byte = buffer[0];
      if (byte === 13 || byte === 10) break;
      if (byte === 3) throw new Error("Cancelled.");
      if (byte === 8 || byte === 127) typed.pop();
      else typed.push(byte);
    }
  } finally {
    Deno.stdin.setRaw(false);
    await Deno.stdout.write(encoder.encode("\n"));
  }
  return decoder.decode(new Uint8Array(typed)).trim();
}

async function resolveToken({ interactive }) {
  const fromEnvironment = (Deno.env.get("GITHUB_TOKEN") || Deno.env.get("GH_TOKEN") || "").trim();
  if (fromEnvironment) return { token: fromEnvironment, source: "GITHUB_TOKEN/GH_TOKEN" };
  if (Deno.env.get("CI")) return null;
  const stored = await gitCredential(interactive);
  if (stored) return { token: stored, source: "Git Credential Manager (your GitHub login for git push)" };
  if (!interactive) return null;
  const typed = await promptSecret("GitHub token with Contents: read and write (input hidden): ");
  return typed ? { token: typed, source: "prompt" } : null;
}

function parseOptions(args) {
  const options = { dryRun: false, yes: false, replace: false, draft: false, tag: "" };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--yes") options.yes = true;
    else if (arg === "--replace") options.replace = true;
    else if (arg === "--draft") options.draft = true;
    else if (arg === "--tag") options.tag = args[++index] || "";
    else if (arg.startsWith("--tag=")) options.tag = arg.slice(6);
    else throw new Error(`Unknown option ${arg}. Use --dry-run, --yes, --replace, --draft or --tag vX.Y.Z.`);
  }
  return options;
}

async function main(args) {
  const options = parseOptions(args);
  const source = JSON.parse(await Deno.readTextFile(new URL("src/manifest.json", root)));
  const tag = `v${source.version}`;
  if (options.tag && options.tag !== tag) throw new Error(`Tag ${options.tag} does not match src/manifest.json version ${source.version} (expected ${tag}).`);
  const dirty = await git(["status", "--porcelain", "--untracked-files=no"]);
  if (dirty && !options.dryRun) throw new Error(`Tracked files have uncommitted changes, so the packages would not match a commit. Commit or stash them first:\n${dirty}`);
  if (dirty) console.log("Warning: tracked files have uncommitted changes. A real release would refuse to run until they are committed.");
  const commit = await git(["rev-parse", "HEAD"]);
  const localTag = await git(["rev-parse", "-q", "--verify", `refs/tags/${tag}^{commit}`], { optional: true });
  if (localTag && localTag !== commit) throw new Error(`Local tag ${tag} points to ${localTag.slice(0, 7)}, but HEAD is ${commit.slice(0, 7)}. Check out ${tag} first.`);
  const repo = Deno.env.get("GITHUB_REPOSITORY") || parseRepository(await git(["remote", "get-url", "origin"]));

  console.log(`Building ChatterWatch ${source.version} from commit ${commit.slice(0, 7)}...`);
  await buildPackages();
  const geckoId = manifestFor(source, "firefox").browser_specific_settings.gecko.id;
  const assets = await collectAssets({ version: source.version, directory: new URL("dist/packages/", root), geckoId });
  for (const asset of assets) console.log(`  ${asset.sha256}  ${asset.name}${asset.signed ? " (Mozilla-signed)" : ""}`);
  const changelog = await Deno.readTextFile(new URL("docs/CHANGELOG.md", root));
  const notesFor = (fullName) => releaseNotes({ repo: fullName, tag, version: source.version, changelog, assets });
  const notesPath = new URL(`dist/packages/release-notes-${tag}.md`, root);
  await Deno.writeTextFile(notesPath, notesFor(repo));

  const credential = await resolveToken({ interactive: !options.dryRun });
  if (!credential) {
    if (options.dryRun) {
      console.log(`Dry run: no GitHub token found, so remote checks were skipped. Release notes preview: ${fileURLToPath(notesPath)}`);
      return;
    }
    throw new Error("No GitHub token. Set GITHUB_TOKEN, sign in to GitHub once with git push (Git Credential Manager), or run interactively to type a token.");
  }
  console.log(`Using GitHub credentials from ${credential.source}.`);
  const confirm = async ({ repo: fullName }) => {
    if (options.yes) return true;
    if (!Deno.stdin.isTerminal()) throw new Error("Re-run with --yes to publish without an interactive confirmation.");
    return prompt(`Publish ChatterWatch ${tag} to https://github.com/${fullName}/releases ? Type yes to continue:`)?.trim().toLowerCase() === "yes";
  };
  const result = await publishRelease({
    github: githubClient({ token: credential.token }), repo, tag, commit, assets, notesFor,
    dryRun: options.dryRun, replace: options.replace, draft: options.draft, confirm
  });
  if (result.dryRun) {
    await Deno.writeTextFile(notesPath, result.notes);
    console.log(`Dry run complete; nothing changed on GitHub. Release notes preview: ${fileURLToPath(notesPath)}`);
    return;
  }
  console.log(`${result.published ? "Published" : "Saved draft"}: ${result.url}`);
  if (!localTag) console.log(`Tip: run "git fetch --tags" to get the ${tag} tag that GitHub created.`);
}

if (import.meta.main) {
  try { await main(Deno.args); }
  catch (error) {
    console.error(`ERROR: ${error.message}`);
    Deno.exit(1);
  }
}
