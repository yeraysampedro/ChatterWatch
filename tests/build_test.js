import { assert, assertEquals, assertThrows } from "jsr:@std/assert@1";
import { unzipSync } from "npm:fflate@0.8.2";
import { pathToFileURL } from "node:url";
import { buildPackages, manifestFor } from "../build/build.js";

const source = JSON.parse(await Deno.readTextFile(new URL("../src/manifest.json", import.meta.url)));

Deno.test("browser manifests preserve security settings and select supported background and sidebar APIs", () => {
  const original = structuredClone(source);
  const chromium = manifestFor(source, "chromium");
  const firefox = manifestFor(source, "firefox");
  assertEquals(chromium, source);
  assertEquals(chromium.background, { service_worker: "worker.js" });
  assertEquals(firefox.background, { scripts: ["core.js", "chat-flow.js", "worker.js"] });
  assertEquals(firefox.permissions, ["storage", "identity", "alarms"]);
  assertEquals(firefox.sidebar_action.default_panel, "dashboard.html");
  assertEquals(firefox.sidebar_action.open_at_install, false);
  assertEquals(firefox.sidebar_action.default_icon, source.action.default_icon);
  assertEquals(firefox.icons, source.icons);
  assertEquals(Object.keys(source.icons), ["16", "32", "48", "64", "96", "128"]);
  assertEquals(firefox.minimum_chrome_version, undefined);
  assertEquals(firefox.side_panel, undefined);
  assertEquals(firefox.browser_specific_settings.gecko.strict_min_version, "140.0");
  assertEquals(firefox.browser_specific_settings.gecko.id, "twitch-chatter-watch@extensions.local");
  assertEquals(firefox.browser_specific_settings.gecko.data_collection_permissions.required, ["authenticationInfo", "personallyIdentifyingInfo"]);
  assertEquals(firefox.host_permissions, source.host_permissions);
  assertEquals(firefox.optional_host_permissions, ["https://*/*"]);
  assertEquals(firefox.browser_specific_settings.gecko.data_collection_permissions.optional, ["personalCommunications"]);
  assertEquals(firefox.content_security_policy, source.content_security_policy);
  assertEquals(firefox.action, source.action);
  assertEquals(source, original);
  assertThrows(() => manifestFor(source, "unknown"));
});

Deno.test("distribution ZIPs contain only runtime files at their root and rebuild reproducibly", async () => {
  const temporary = await Deno.makeTempDir({ prefix: "chatter-watch-build-" });
  const output = pathToFileURL(`${temporary}/`);
  try {
    const artifacts = await buildPackages(output);
    assertEquals(artifacts.map((artifact) => artifact.target), ["chromium", "firefox"]);
    const archives = [];
    for (const artifact of artifacts) {
      const bytes = await Deno.readFile(artifact.archive);
      archives.push(bytes);
      const entries = unzipSync(bytes);
      assertEquals(Object.keys(entries).sort(), [
        "LICENSE.lucide", "chat-flow.js", "chat.css", "chat.html", "chat.js", "core.js", "dashboard.css",
        "dashboard.html", "dashboard.js", "icons.js", "manifest.json", "view-tools.css", "view-tools.js", "virtual-chat.js", "worker.js",
        ...[16, 32, 48, 64, 96, 128].map((size) => `assets/icons/chatter-watch-${size}.png`)
      ].sort());
      assert(artifact.archive.pathname.endsWith(`chatter-watch-${source.version}-${artifact.target}.zip`));
      assertEquals(JSON.parse(new TextDecoder().decode(entries["manifest.json"])), manifestFor(source, artifact.target));
      const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
      for (const mapping of [manifest.icons, manifest.action.default_icon, ...(manifest.sidebar_action ? [manifest.sidebar_action.default_icon] : [])]) {
        for (const [size, name] of Object.entries(mapping)) {
          const image = entries[name];
          assert(image, `Missing icon ${name} in ${artifact.target}`);
          assertEquals([...image.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
          const header = new DataView(image.buffer, image.byteOffset, image.byteLength);
          assertEquals(header.getUint32(16), Number(size));
          assertEquals(header.getUint32(20), Number(size));
        }
      }
      for (const [name, content] of Object.entries(entries)) {
        assertEquals(await Deno.readFile(new URL(name, artifact.directory)), content);
        if (name !== "manifest.json") assertEquals(content, await Deno.readFile(new URL(`../src/${name}`, import.meta.url)));
      }
      await Deno.writeTextFile(new URL("stale.txt", artifact.directory), "old build");
    }
    await buildPackages(output);
    for (const [index, artifact] of artifacts.entries()) {
      assertEquals(await Deno.readFile(artifact.archive), archives[index]);
      assertThrows(() => Deno.statSync(new URL("stale.txt", artifact.directory)), Deno.errors.NotFound);
    }
  } finally { await Deno.remove(temporary, { recursive: true }); }
});