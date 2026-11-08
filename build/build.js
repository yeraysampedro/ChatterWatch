import { zipSync } from "npm:fflate@0.8.2";

const root = new URL("../src/", import.meta.url);
const runtimeFiles = [
  "core.js", "chat-flow.js", "worker.js", "virtual-chat.js",
  "dashboard.html", "dashboard.css", "dashboard.js", "chat.html", "chat.css", "chat.js",
  "view-tools.js", "view-tools.css", "icons.js", "LICENSE.lucide",
  ...[16, 32, 48, 64, 96, 128].map((size) => `assets/icons/chatter-watch-${size}.png`)
];

export function manifestFor(source, target) {
  const manifest = structuredClone(source);
  if (target === "chromium") return manifest;
  if (target !== "firefox") throw new Error(`Unknown browser target: ${target}`);
  delete manifest.minimum_chrome_version;
  delete manifest.side_panel;
  manifest.permissions = manifest.permissions.filter((permission) => permission !== "sidePanel");
  manifest.background = { scripts: ["core.js", "chat-flow.js", "worker.js"] };
  manifest.sidebar_action = { default_title: manifest.name, default_panel: "dashboard.html", default_icon: manifest.action.default_icon, open_at_install: false };
  manifest.browser_specific_settings = {
    gecko: {
      id: "twitch-chatter-watch@extensions.local",
      strict_min_version: "140.0",
      data_collection_permissions: { required: ["authenticationInfo", "personallyIdentifyingInfo"], optional: ["personalCommunications"] }
    }
  };
  return manifest;
}

export async function buildPackages(output = new URL("../dist/", import.meta.url)) {
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
    for (const [name, content] of Object.entries(entries)) {
      const target = new URL(name, directory);
      await Deno.mkdir(new URL("./", target), { recursive: true });
      await Deno.writeFile(target, content);
    }
    const archive = new URL(`packages/chatter-watch-${source.version}-${target}.zip`, output);
    await Deno.mkdir(new URL("./", archive), { recursive: true });
    const bytes = zipSync(entries, { level: 9, mtime: new Date(2000, 0, 1) });
    await Deno.writeFile(archive, bytes);
    if (target === "firefox") {
      const unsignedArchive = new URL(`packages/chatter-watch-${source.version}-firefox-unsigned.xpi`, output);
      await Deno.writeFile(unsignedArchive, bytes);
      artifacts.push({ target, directory, archive, unsignedArchive });
    } else {
      artifacts.push({ target, directory, archive });
    }
  }
  return artifacts;
}

if (import.meta.main) {
  for (const artifact of await buildPackages()) {
    console.log(`${artifact.target}: ${decodeURI(artifact.archive.pathname)}`);
    if (artifact.unsignedArchive) console.log(`firefox (UNSIGNED, not a permanent-install package): ${decodeURI(artifact.unsignedArchive.pathname)}`);
  }
}