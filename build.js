import { zipSync } from "npm:fflate@0.8.2";

const root = new URL("./", import.meta.url);
const runtimeFiles = [
  "core.js", "chat-flow.js", "worker.js", "virtual-chat.js",
  "dashboard.html", "dashboard.css", "dashboard.js", "chat.html", "chat.css", "chat.js"
];

export function manifestFor(source, target) {
  const manifest = structuredClone(source);
  if (target === "chromium") return manifest;
  if (target !== "firefox") throw new Error(`Unknown browser target: ${target}`);
  delete manifest.minimum_chrome_version;
  delete manifest.side_panel;
  manifest.permissions = manifest.permissions.filter((permission) => permission !== "sidePanel");
  manifest.background = { scripts: ["core.js", "chat-flow.js", "worker.js"] };
  manifest.sidebar_action = { default_title: manifest.name, default_panel: "dashboard.html", open_at_install: false };
  manifest.browser_specific_settings = {
    gecko: {
      id: "twitch-chatter-watch@extensions.local",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["authenticationInfo", "personallyIdentifyingInfo"] }
    }
  };
  return manifest;
}

export async function buildPackages(output = new URL("./dist/", root)) {
  const source = JSON.parse(await Deno.readTextFile(new URL("manifest.json", root)));
  if (!/^\d+(?:\.\d+){0,3}$/.test(source.version)) throw new Error("Invalid extension version.");
  const files = Object.fromEntries(await Promise.all(runtimeFiles.map(async (name) => [
    name, await Deno.readFile(new URL(name, root))
  ])));
  const artifacts = [];
  for (const target of ["chromium", "firefox"]) {
    const manifest = manifestFor(source, target);
    const entries = { "manifest.json": new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`), ...files };
    const directory = new URL(`${target}/`, output);
    try { await Deno.remove(directory, { recursive: true }); }
    catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
    await Deno.mkdir(directory, { recursive: true });
    for (const [name, content] of Object.entries(entries)) await Deno.writeFile(new URL(name, directory), content);
    const archive = new URL(`chatter-watch-${source.version}-${target}.zip`, output);
    await Deno.writeFile(archive, zipSync(entries, { level: 9, mtime: new Date(2000, 0, 1) }));
    artifacts.push({ target, directory, archive });
  }
  return artifacts;
}

if (import.meta.main) {
  for (const artifact of await buildPackages()) console.log(`${artifact.target}: ${decodeURI(artifact.archive.pathname)}`);
}