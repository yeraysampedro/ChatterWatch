import { assertEquals } from "jsr:@std/assert@1";

const root = new URL("..", import.meta.url);
const decoder = new TextDecoder();

async function git(args, input = "") {
  const child = new Deno.Command("git", { args, cwd: root, stdin: "piped", stdout: "piped", stderr: "piped" }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(input));
  await writer.close();
  const { code, stdout, stderr } = await child.output();
  return { code, lines: decoder.decode(stdout).split(/\r?\n/).filter(Boolean), error: decoder.decode(stderr) };
}

// check-ignore exits 1 when no path is ignored; anything above 1 is a real failure.
async function ignored(paths) {
  const result = await git(["check-ignore", "--no-index", "--stdin"], `${paths.join("\n")}\n`);
  if (result.code > 1) throw new Error(result.error);
  return result.lines.sort();
}

const localOnly = [
  "build/publish-github-release.bat",
  "build/run-example-account-tests.bat",
  "tests/run-everything.cmd",
  "example_accounts.md",
  "docs/example_accounts.md",
  "store-submission.local.json",
  "build/settings.local.json",
  "dist/store-submission/chrome-web-store/PRIVATE-reviewer-instructions.txt",
  "docs/PRIVATE-reviewer-instructions.txt",
  "docs/store-submission/firefox-amo/fields/1-submit.txt",
  "icon.png",
  ".env",
  "src/.env.production",
  "build/web-ext-artifacts/chatter_watch-1.0.0.zip",
  "src/.web-extension-id",
  "src/.amo-upload-uuid",
  "build/.netrc",
  "tests/.git-credentials",
  "build/signing.pem",
  "chatter-watch-1.0.0-firefox.xpi",
  "dist/packages/release-notes-v1.0.0.md",
  ".vscode/settings.json"
].sort();

const versioned = [
  ".gitignore",
  ".gitattributes",
  ".github/workflows/release.yml",
  "LICENSE",
  "README.md",
  "AGENTS.md",
  "deno.json",
  "deno.lock",
  "build/build.js",
  "build/release.js",
  "build/store-submission.js",
  "build/store-assets.js",
  "tests/release_test.js",
  "tests/store_submission_test.js",
  "tests/example_accounts.js",
  "docs/STORE_TESTING.md",
  "src/manifest.json",
  "src/LICENSE.lucide",
  "src/assets/icons/icon.png"
];

Deno.test("gitignore keeps local launchers, private store notes and signing state out of Git", async () => {
  assertEquals(await ignored(localOnly), localOnly);
});

Deno.test("gitignore keeps release tooling, workflow and public project files versionable", async () => {
  assertEquals(await ignored(versioned), []);
});

Deno.test("no tracked file matches an ignore rule", async () => {
  const result = await git(["ls-files", "--cached", "--ignored", "--exclude-standard"]);
  assertEquals(result.code, 0, result.error);
  assertEquals(result.lines, []);
});
