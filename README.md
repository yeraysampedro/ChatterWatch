# ChatterWatch

ChatterWatch is a Manifest V3 browser extension for reading Twitch chat and moderating locally observed accounts. It uses native JavaScript, HTML and CSS, one shared Twitch IRC/WebSocket connection, the Twitch Helix API and local IndexedDB storage. There is no application backend, framework, runtime package download or compilation step.

> **Data use:** Twitch identity/session information, chatter metadata, message text and moderation history support this workspace. Twitch receives authentication/chat/API traffic and permitted avatar requests; an optional translator receives selected text only after separate permission and message confirmation. Records are stored locally. Twitch features and new account records remain blocked until an explicit, versioned **Allow data use** choice. **Stay offline** keeps prior history read-only without those requests or remote avatars. Read the [privacy policy](docs/PRIVACY.md) before installation.

- **Initial public release target:** `v1.0.0`
- **Manifest version:** `1.0.0`
- **Target repository and release-branch name:** `ChatterWatch`

The files and packages can be prepared locally before publication. Building them does **not** create a GitHub release, sign a Firefox add-on or establish store approval.

## Features

- Prominent data-use disclosure, an initially unchecked consent box, offline read-only history and a withdrawal control in Settings/browser extension options.
- Read up to six channels through one shared connection, using a grid, a chronological unified feed or detached channel windows.
- Keep the dashboard open in a pinned browser tab; the toolbar popup and browser sidebar remain available.
- Use virtualized message rows, bounded buffers, pause/scroll lock, keyword highlighting, three message pins per view and local TXT export.
- Apply local repetition, frequency, restricted-regex and slow filters without changing Twitch moderation settings.
- Review primary-channel accounts using account-age, first-message and recent-follower signals. Moderation-exempt roles remain exempt from automatic sanctions.
- Approve accounts manually or enable optional automatic approval after **more than N** messages, confirmed follower/subscriber evidence or locally observed former subscriptions.
- Search all locally observed chatters, including resolved accounts, in 25-person pages.
- Keep up to 50 recent messages and 100 activity events per account/channel, including notes, approvals and confirmed moderation actions.
- Confirm bans, timeouts, removal of an active ban/timeout, message deletion and the one-second `/srs` action. Automatic timeout is separate and disabled by default.
- Request actual Twitch slow-mode changes only through an explicit confirmed action and the required permission.
- Save up to eight named Multichat workspaces. At most twelve extension popup windows can be open; pinned browser tabs are not counted.
- Use English, Spanish or German, light/dark themes, autosaved settings and optional rate-limited review alerts.
- Optionally translate individual messages through an explicitly configured and authorized HTTPS LibreTranslate-compatible service, with confirmation before each transmission.

Automatic account review applies only to the primary channel. Additional channels do not receive automatic account-review sanctions. Local history is not a reconstruction of Twitch's complete viewer or moderation history.

## Requirements

### To install and use the extension

- Desktop Chrome/Chromium/Edge **116+**, or desktop Firefox **140+**.
- A Twitch account and a Twitch application Client ID with the correct browser-specific OAuth redirect registered.
- Broadcaster/moderator rights and the appropriate OAuth scopes for moderation actions.

Users installing a release package do **not** need Git, Deno, Node.js or npm. Mobile support is not claimed. A managed browser may prohibit developer-mode installation; follow the administrator's policy rather than bypassing it.

### To build or develop

- [Deno 2](https://docs.deno.com/runtime/getting_started/installation/).
- Git 2.28+ for the repository commands below.
- Installed Chrome or Edge for ordinary Chromium UI tests; Playwright's Firefox for Firefox UI tests.
- Full Playwright Chromium, or a compatible executable selected with `CHATTER_CHROMIUM_EXECUTABLE`, for native extension-popup tests.

Development dependencies are pinned through [deno.lock](deno.lock). They are not shipped as runtime dependencies inside the extension. `fflate` is used only by the packaging tools.

## Download a release

1. Open this repository on GitHub and select **Releases**.
2. Select the **v1.0.0** release and expand **Assets**.
3. Download the browser-specific package:

| Asset | Purpose |
| --- | --- |
| `chatter-watch-1.0.0-chromium.zip` | Extract and load unpacked in Chrome/Chromium/Edge. |
| `chatter-watch-1.0.0-firefox.zip` | Firefox-specific files for temporary development loading or submission to Mozilla. |
| `chatter-watch-1.0.0-firefox-unsigned.xpi` | The same Firefox package in XPI format, explicitly **unsigned**. Development/signing input, not a permanent-install package. |
| `chatter-watch-1.0.0-firefox.xpi` | Permanent-install asset **only if the publisher has obtained it signed by Mozilla**. The build script does not generate this file. |

GitHub's automatic **Source code (zip)** and **Source code (tar.gz)** downloads are repository snapshots, not the browser-specific installable assets. Do not select the repository root as an extension folder.

If a release contains only the unsigned Firefox assets, use temporary installation below. Renaming a ZIP or unsigned XPI does not add a Mozilla signature.

## Install manually in Chrome, Chromium or Edge

1. Download `chatter-watch-1.0.0-chromium.zip`.
2. Extract it into a stable directory, for example `C:\Extensions\ChatterWatch-Chromium`. Keep that directory: the browser loads the extension from it.
3. Open `chrome://extensions` in Chrome/Chromium, or `edge://extensions` in Edge.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted directory containing `manifest.json` directly at its root.
6. Confirm that **ChatterWatch 1.0.0** appears and check its error panel if loading fails.
7. Open the browser's Extensions menu and pin the ChatterWatch toolbar icon if desired.
8. Open ChatterWatch. Its own pin button opens a **pinned browser tab**, not a detached window. The ordinary toolbar popup still closes when it loses focus.

Do not try to install the ZIP by dragging it into the browser. The unpacked/developer-mode workflow above is the supported manual route for this asset.

When developing locally, you may load [src/](src/) directly or load the generated `dist\chromium` directory. Do not load the repository root.

## Install manually in Firefox

### Permanent installation: Mozilla-signed XPI

1. Download the publisher's **Mozilla-signed** `chatter-watch-1.0.0-firefox.xpi`.
2. Open `about:addons`.
3. Open the gear menu and choose **Install Add-on From File**.
4. Select the signed XPI and review Firefox's installation and data-permission prompts.
5. Confirm that ChatterWatch appears in Extensions.

Release and beta Firefox require Mozilla signing, including add-ons distributed through GitHub rather than publicly listed on AMO. If Firefox rejects an unsigned package, use the temporary workflow; do not disable signature verification.

### Temporary installation: unsigned development package

1. Download and extract `chatter-watch-1.0.0-firefox.zip`, or generate `dist\firefox` using the build command below.
2. Open `about:debugging#/runtime/this-firefox`.
3. Select **Load Temporary Add-on**.
4. Select `manifest.json` inside the extracted Firefox directory. This is the generated Firefox manifest, **not** the Chromium manifest in `src`.
5. Open the extension and configure Twitch.

Temporary installation ends when Firefox closes. It is not proof of signing or permanent-install compatibility. The generated unsigned XPI is also suitable as a Mozilla submission input.

The Firefox identifier remains `twitch-chatter-watch@extensions.local`. It is intentionally preserved despite the shorter project name; changing it creates a different add-on identity.

## Configure Twitch

1. Open ChatterWatch and use its pin button to keep the dashboard in a browser tab.
2. Select **Review data use** and read the categories, purposes, recipients and retention. Choose **Stay offline** to decline, or check the initially unchecked consent box and select **Allow data use** to enable Twitch features. OAuth permission is a separate step, not a substitute for this choice.
3. Open **Settings** and copy the exact OAuth redirect shown by the installed browser build.
4. Register that redirect in an application at the [Twitch Developer Console](https://dev.twitch.tv/console/apps). Use an application compatible with the extension's implicit user-token flow. Application registration may require verified email and 2FA.
5. Enter the application's **Client ID**, not a Client Secret, in Settings.
6. Enter the primary channel's login name, without a full URL.
7. Select **Connect** and complete Twitch's official sign-in and permission prompts.
8. Verify that chat messages arrive before testing moderation in an authorized test channel.

The redirect can change with the browser, extension identity, installation path or installation method. Use the URL displayed by the installed extension; do not invent or reuse another browser's callback. Passwords and verification codes belong only in the official Twitch sign-in flow, never in repository files or test fixtures.

| Twitch scope | Use |
| --- | --- |
| `chat:read` | Receive chat messages. |
| `moderator:manage:banned_users` | Apply/remove bans and timeouts, including `/srs 1s`. |
| `moderator:manage:warnings` | Warn a chatter. |
| `moderator:read:followers` | Look up follower evidence. |
| `moderator:manage:chat_settings` | Change actual Twitch slow mode. |
| `moderator:manage:chat_messages` | Delete a retained message. |

An OAuth grant does not give moderation rights in arbitrary channels. Twitch enforces the account's role in the target channel.

To opt out, open **Settings > Data and privacy > Withdraw consent and disconnect**. This stops new Twitch/translation activity, aborts in-flight fetches where possible and removes session credentials. Existing notes/messages/history remain read-only offline; deletion is a separate browser-storage/uninstall action. Local display/window preferences remain available. Withdrawal cannot recall earlier transmissions or undo Twitch actions. Existing OAuth sessions without a current consent record cannot auto-resume, and material notice changes require consent again.

To undo a ban or active timeout, find the person under **All chatters**, choose **Unban / end timeout**, and confirm the target. Successful removal is recorded without approving the account or erasing history. Another automatic timeout is suppressed for the same review cycle; inactivity or a verified stream transition can start a new cycle. Expired/nonexistent sanctions and denied requests produce errors, not successful history events.

## Build ZIP and XPI packages

Run from the repository root:

```powershell
deno task test:build
deno task build
```

The existing [build/build.js](build/build.js) reads the version from [src/manifest.json](src/manifest.json) and creates:

```text
dist\
  chromium\manifest.json
  firefox\manifest.json
  packages\
    chatter-watch-1.0.0-chromium.zip
    chatter-watch-1.0.0-firefox.zip
    chatter-watch-1.0.0-firefox-unsigned.xpi
```

Each archive contains the runtime files themselves, with `manifest.json` at the archive root, not a surrounding `src` or version directory. Runtime paths use an explicit allowlist, including the required icon sizes and Lucide license. Tests, private account files, environment files, dependencies and store screenshots are not packaged.

The Firefox build replaces the Chromium service worker/side panel declarations with ordered background scripts and `sidebar_action`, preserves the Gecko ID, and declares the required/optional Firefox data categories. Both browsers use the same application source.

Archives use fixed timestamps and stable entry order. The unsigned Firefox XPI is byte-identical to the Firefox ZIP: XPI is a ZIP container with a different filename extension. Neither format alone supplies a signature.

For local integrity checks:

```powershell
Get-FileHash .\dist\packages\chatter-watch-1.0.0-chromium.zip -Algorithm SHA256
Get-FileHash .\dist\packages\chatter-watch-1.0.0-firefox.zip -Algorithm SHA256
Get-FileHash .\dist\packages\chatter-watch-1.0.0-firefox-unsigned.xpi -Algorithm SHA256
```

Do not edit generated files. Change `src`, rebuild and reload the installed extension. For manual Chromium updates, keep the same installation directory when possible to avoid changing its identity/redirect. Session tokens and in-memory chat are not durable across all extension/browser restarts; reconnect when required.

### Obtain the signed Firefox release asset

1. Build and test the final source version first.
2. Sign in to the [AMO Developer Hub](https://addons.mozilla.org/developers/) using the publisher's account.
3. Submit the generated Firefox ZIP or `-unsigned.xpi`, choosing **self-distribution/unlisted** if GitHub will distribute it without a public AMO listing.
4. Complete Mozilla's validation, policy and review requirements. Supply requested source/reviewer information through the approved private channels.
5. Download the **signed XPI returned by Mozilla**. You may name that downloaded file `chatter-watch-1.0.0-firefox.xpi`.
6. Verify permanent installation in ordinary Firefox before advertising that installation path or attaching it as the signed release asset.

Do not rename the unsigned build to make it appear signed. Any runtime change after signing requires a new signed package. Keep signing credentials outside the repository. See Mozilla's [packaging guide](https://extensionworkshop.com/documentation/publish/package-your-extension/) and [signing/distribution requirements](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Development and verification

```powershell
deno task test
deno task test:build
deno task test:ui
deno task test:ui:firefox
```

Ordinary UI tests use installed Chrome by default. For Edge, set `$env:CHATTER_BROWSER = 'msedge'` before running them. Playwright browser binaries can be installed with:

```powershell
deno run -A npm:playwright@1.56.1 install chromium firefox
```

For the actual extension toolbar-popup and pinned-tab checks:

```powershell
deno task test:native
```

This needs full Playwright Chromium, not `headless-shell`. If using another compatible full Chromium binary, set `$env:CHATTER_CHROMIUM_EXECUTABLE = 'C:\path\to\chromium\chrome.exe'` first. The native test loads the extension in an empty temporary profile and does not sign in to Twitch.

Windows users can double-click [build/run-example-account-tests.bat](build/run-example-account-tests.bat) for the focused example-account worker/Chrome/Firefox suites. It pauses to display results; pass `--no-pause` for automation. It does not run the separate native-popup test.

**Test accounts are fictional fixtures.** Passing tests does not verify your real account credentials, channel privileges or actual Twitch delivery. Before release, perform an authorized live smoke test for sign-in, messages and agreed moderation/removal actions. Cross-monitor behavior, browser sleep/suspension and optional translation providers also need appropriate manual checks.

The privacy regressions additionally verify no automatic Twitch access before consent, no unchecked/canceled acceptance, read-only withdrawal, rejected stale OAuth results, aborted late profile responses and no remote avatars while offline. For focused checks, run `deno task test --filter privacy`, `deno task test:ui --filter "privacy UI"` and `deno task test:ui:firefox --filter "privacy UI"`.

## GitHub repository and release commands

Git's local directory name, branch name and GitHub repository name are separate. These instructions use **ChatterWatch** for the GitHub repository and branch, as requested. The manifest uses `1.0.0`; the Git tag uses `v1.0.0`.

Replace uppercase placeholders before running commands and stop if any command fails. Use Git Credential Manager or your normal SSH authentication; do not put access tokens in remote URLs, commands or tracked files.

### A. New local repository only

Use this sequence only in a new source directory named `ChatterWatch` that has **no existing `.git` directory**. Place the reviewed project source/development files there first; do not copy private account files, credentials, generated packages or another repository's `.git` directory.

```powershell
git init --initial-branch=ChatterWatch
git config user.name "YOUR NAME"
git config user.email "YOUR_GITHUB_NOREPLY_ADDRESS"
git status --short --ignored
git add .gitignore README.md AGENTS.md deno.json deno.lock src build tests docs
git diff --cached --check
git diff --cached --name-only
git commit -m "Initial release of ChatterWatch v1.0.0" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git tag --annotate v1.0.0 --message "ChatterWatch v1.0.0"
```

Review the staged file list before committing. If a project license has been selected, add that file explicitly as well. `.gitignore` is not a secret scanner: it cannot detect credentials embedded inside otherwise allowed source files.

### B. Existing repository: preserve its history

For an existing checkout, **do not delete `.git` or start over**. Review outstanding changes and use this alternative:

```powershell
git status --short
git branch -m ChatterWatch
git add .gitignore README.md AGENTS.md deno.json deno.lock src build tests docs
git diff --cached --check
git diff --cached --name-only
git commit -m "Prepare ChatterWatch v1.0.0" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git tag --list v1.0.0
git tag --annotate v1.0.0 --message "ChatterWatch v1.0.0"
```

Skip the branch-rename command if already on `ChatterWatch`. Configure your Git identity first if needed. If `git tag --list v1.0.0` prints an existing tag, stop rather than replacing it. Do not amend old commits, force-push or overwrite a published version tag.

The earlier `1.3.x` numbers were internal development snapshots, not public releases. Their history is retained; `1.0.0` starts the public release sequence. This assumes a higher version has not already been registered with a store/signing service, including an unlisted AMO submission. Editing the manifest is not a downgrade/update procedure for an already submitted or signed higher version.

### Connect to GitHub and publish

1. On GitHub, create an **empty** repository named **ChatterWatch** under the intended owner. Choose the appropriate visibility; do not initialize it with another README, license or `.gitignore`.
2. Check licensing and secrets before making it public.
3. For a repository with no `origin`, run:

```powershell
git remote add origin https://github.com/OWNER/ChatterWatch.git
git push --set-upstream origin ChatterWatch
git push origin v1.0.0
```

If `origin` already exists, use this instead of `git remote add`:

```powershell
git remote set-url origin https://github.com/OWNER/ChatterWatch.git
git push --set-upstream origin ChatterWatch
git push origin v1.0.0
```

Confirm that the repository's default branch is `ChatterWatch`; update it in GitHub Settings if necessary. A rejected push is a reason to inspect the remote, not to add `--force`.

4. Build packages from the reviewed/tagged source. Do not attach stale packages from an internal version or an uncommitted runtime change.
5. Open **Releases > Draft a new release**, choose the existing `v1.0.0` tag, and use **ChatterWatch v1.0.0** as the title.
6. Attach the Chromium ZIP and, once obtained, the Mozilla-signed Firefox XPI. The Firefox ZIP/unsigned XPI may be attached as clearly labeled temporary-development assets, not as permanent-install packages.
7. Describe supported browsers, installation instructions and known limits, then publish when ready.

Generated artifacts belong in release assets, not in Git commits. Never attach credentials, private account notes, chat exports, local browser profiles or an entire store kit as an installable extension.

## Repository layout and ignore policy

### Branding and themes

The supplied black/violet eye artwork is preserved in [src/assets/icons/icon.png](src/assets/icons/icon.png). Its `#38005e` iris anchors the light theme; the dark theme uses charcoal-violet surfaces and a readable lavender accent. Errors/warnings keep distinct red/amber colors. Shared theme tests check at least 4.5:1 text contrast and 3:1 control-boundary contrast.

[build/icon-assets.js](build/icon-assets.js) creates the 16/32/48/64/96/128px runtime PNGs and a store-only 512px derivative, using the requested light lavender backplate so the original black lines remain visible in both browser themes. The current master is 128px; the 512px file is an enlargement, not newly recovered detail. Supply a larger original if higher-resolution store artwork is needed.

```powershell
deno task icons
# To import a newly supplied root-level PNG instead:
deno task icons .\icon.png
deno task build
```

Icon generation uses a local headless browser (Chrome by default; `CHATTER_BROWSER=msedge` or `firefox` is supported) and does not upload the artwork. The supplied root-level `icon.png` remains untouched and ignored; the canonical source and its derivatives under `src\assets\icons` are versioned. Ordinary package builds use those committed derivatives and do not require a browser. Review the shared theme tokens after changing the artwork; do not hand-edit generated sizes.

| Path | Contents |
| --- | --- |
| [src/](src/) | Runtime scripts, pages, styles, manifest, original branding and third-party icon license. |
| [build/](build/) | Reproducible packaging, optional store-asset tooling and the Windows test launcher. |
| [tests/](tests/) | Core, worker, browser, native-popup and packaging checks. |
| [docs/](docs/) | User guides, privacy, implementation details and store preparation. |
| `dist/` | Ignored generated packages, loadable folders and store/source artifacts. |
| [deno.json](deno.json), [deno.lock](deno.lock) | Development tasks and locked tooling dependencies. |

The strict [.gitignore](.gitignore) allows the project's top-level source/development files and excludes local editor settings, environment values, private keys, credentials, dependencies, caches, exports and generated archives. Placeholder-only `.env.example`/`.env.template` files may be tracked; the extension itself does not read Twitch credentials from environment files.

Ignore rules do not remove files already tracked by Git. Review tracked files and rotate any credentials that were exposed; never assume adding an ignore pattern repairs a previous disclosure.

## Privacy, licensing and release limits

- Twitch session tokens are kept in extension session storage, not committed to the project or forwarded to translation providers.
- Publish the prominent data-use blocks from [STORE_LISTING.md](docs/STORE_LISTING.md) and the current public privacy policy before installation. The in-extension consent control alone does not update the Chrome Web Store listing or resolve a `Purple Nickel` review notification; follow the [resubmission checklist](docs/STORE_SUBMISSION.md#purple-nickel-prominent-disclosure-and-consent).
- Settings, observed account records, notes and bounded activity history are stored locally. Chat buffers in memory are not a permanent log.
- Local storage/IndexedDB have no application-provided encryption and no configurable time-based retention policy. Uninstalling or clearing extension storage removes local records; delete downloaded exports separately.
- There is no publisher-operated telemetry/backend. Optional translation sends selected message text only after configuration, permission and per-message confirmation.
- A project-wide distribution license has **not** been selected. The owner must choose and add an appropriate license before public distribution. [src/LICENSE.lucide](src/LICENSE.lucide) covers the included Lucide icons only.
- Signing, store approval, public privacy-policy publication and live Twitch verification are separate publisher tasks. Historical store reports describe their recorded internal builds; they are not certification for v1.0.0.

See [Privacy](docs/PRIVACY.md), [Implementation](docs/IMPLEMENTATION.md), [Changelog](docs/CHANGELOG.md), [Reviewer testing](docs/STORE_TESTING.md) and [Store submission](docs/STORE_SUBMISSION.md). The existing support/privacy URLs in store materials refer to the earlier repository; update and verify them after creating or renaming the GitHub repository. Do not claim a new URL is published before it is accessible and current.

Additional usage guides: [English](docs/en.md), [Spanish](docs/es.md), [German](docs/de.md). Use the repository's Issues tab for non-sensitive reports; never post passwords, tokens, private messages or unredacted storage exports.
