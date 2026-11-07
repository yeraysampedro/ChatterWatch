# Project Context

## Implemented

- Manifest V3, native JavaScript/HTML/CSS, no runtime packages or compilation. build.js generates reproducible Chromium/Firefox ZIPs and loadable folders in ignored dist/ using a runtime-file allowlist; fflate is packaging-only.
- Root manifest targets Chromium 116+. Firefox output targets desktop 140+, uses ordered background scripts, sidebar_action, a stable Gecko ID and required data-transmission declarations. Views and worker select browser's Promise API before chrome.
- Version 1.3 uses dark-first shared appearance, wider/stable dashboard surfaces, masked Client ID, persistent internal dashboard windows and bounded remembered geometry. General KPI cards are removed; Approved is separate from pending review.
- core.js owns opt-in strict-N/OR autoapproval and idle/session reevaluation. Manual approvals persist. Former-subscriber evidence is locally observed only. Worker polls real stream state each minute; network failure does not mark a stream ended.
- Account mutations are serialized per broadcaster/user, including incoming messages, manual decisions and settings refresh. Follower evidence expires after five minutes for approval; explicit subscriber=0 overrides badges. Preserve these race/evidence regressions.
- view-tools.js/css centralize accessible confirmation dialogs, localized labels, audio and window persistence. icons.js contains six extracted Lucide 0.468.0 icons; package LICENSE.lucide with them.
- Original extension branding lives in assets/icons/: PNG sizes 16/32/48/64/96/128 are allowlisted runtime assets for manifests, toolbar/sidebar and page favicons. The 512px artwork is for store materials, not included in runtime ZIPs. Preserve nested asset directories in build.js.
- store-assets.js / `deno task store:assets` renders five 1280x800 screenshots per browser from actual local UI with fictional fixtures, generates listing art and metadata, audits runtime ZIPs, and creates separate store kits with source and validation reports. Use --capture-only or --bundle-only for focused work; screenshots are listing assets, not extension runtime files.
- docs/STORE_PERMISSIONS.md and STORE_TESTING.md provide copy-ready permission/security explanations and reviewer steps. STORE_LISTING.md includes EN/DE/ES descriptions and the verified public GitHub Issues support URL. STORE_VALIDATION.md is generated evidence, not store certification. Do not invent reviewer credentials, a published privacy URL, a project license, encryption guarantees or approval.
- Message delete/translate/pin actions are on virtual rows. Manual sanctions including /srs need confirmation. Translation requires configured HTTPS LibreTranslate endpoint, optional origin permission, Firefox data consent and explicit per-message consent; never forward Twitch credentials.
- Review alerts are opt-in, routed to one view and rate-limited to ten seconds; sound requires an open audio-enabled view and native taskbar attention is best-effort.
- Socket replacement detaches the old connection before closing it. Handshake watchdog is 30s; heartbeat 20s; receive timeout 75s. Transient token-validation errors preserve authentication.
- Existing primary-channel account moderation, OAuth, Helix and IndexedDB remain in worker.js/core.js and the dashboard.
- core.js resolves saved language or browser UI locale (regional en/de/es variants), falling back to English; both HTML views load this shared resolver. Saved language takes priority over detection.
- Dashboard and Multichat settings autosave valid edits after 350 ms or field commitment. Dashboard ignores stale save responses and worker serializes its writes; Multichat chains saves using confirmed revisions and still rejects other-window conflicts. Explicit Save remains available; invalid drafts preserve persisted settings.
- worker.js owns the single IRC socket, all JOIN/PART operations, popup windows, runtime ports and confirmed Twitch slow-mode requests.
- chat-flow.js owns bounded per-channel histories/batches, normalization, restricted regex and frequency/repetition/local-slow filtering.
- chat.html/chat.js/chat.css provide shared grid configuration and single-channel detached views. virtual-chat.js owns DOM recycling and local pause state.
- Account review is separate from visual filtering; overload counters expose skipped reviews. Extra chats do not receive account-review sanctions.
- Manual /srs 1s actions target retained message authors in any configured channel, require the ban scope, and are independent of automatic account review.
- Read docs/IMPLEMENTATION.md for RF-01..RF-19 coverage and policy decisions. PRIVACY.md, CHANGELOG.md and docs/STORE_SUBMISSION.md describe release data flows and external publishing steps. The v0.1 DOCX/PDF files remain historical planning artifacts.
- Deleted messages remain as red ghosts in bounded live/paused buffers and local pins. Multichat can merge a chronological tagged feed, apply up to 12 safe-regex color rules, retain 3 pins per window and export its live buffer as TXT.
- Scroll lock begins at one upward pixel and persists until explicit live/bottom navigation. Pinning explicitly resumes live. Firefox uses its native fractional scrollTopMax for bottom detection; rounded scrollHeight/clientHeight can otherwise discard the first upward pixel.
- Named workspaces persist config and up to 12 popup geometries per workspace (8 workspaces maximum). Restore reuses matching windows, preserves unrelated windows and does not change primary moderation settings or authentication.
- README.md and docs/es.md, docs/en.md, docs/de.md cover installation, usage, limits, privacy and GitHub publication.

## Change Rules

- For changed limits, permissions, shortcuts or behavior, update all three language guides and the README where relevant.
- Keep tokens in extensionApi.storage.session and message content in textContent. Validate channel names before IRC commands and window URLs.
- Preserve bounded buffers and queues. Regex intentionally excludes groups and quantifiers to avoid blocking the worker.
- Ghost retention applies to CLEARMSG/CLEARCHAT; preserve deletion markers in snapshots, paused copies, pins and exports. Keep merged feeds bounded and account for timestamps arriving out of sequence.
- Keep visual suppression independent of sanctions. Slow-mode changes on Twitch require an explicit confirmed action and the correct OAuth scope.
- Run `deno task test` for core/worker changes; also run `deno task test:ui` and `deno task test:ui:firefox` for view or compatibility changes. Browser tests are headless; use CHATTER_BROWSER=msedge if Chrome is unavailable. Playwright's Firefox must be installed first.
- For packaging changes run `deno task test:build`; regenerate outputs with `deno task build` after runtime edits. Preserve the published Gecko ID across updates. Edit source, not generated dist/ files.
- UI tests simulate extension APIs on Chromium/Firefox engines. Worker tests simulate network and IndexedDB. They do not establish end-to-end Twitch authorization or delivery guarantees.

## Pending Verification

- Store publication still requires a public current privacy policy, privately supplied authorized test credentials, publisher/license decisions and resolution of the documented at-rest encryption policy requirement. The code uses browser storage/IndexedDB without its own encryption. Review the generated store report before certification.
- Live translation-provider configuration, real Firefox optional-data consent, native taskbar attention/audio and cross-monitor geometry still need authorized manual checks. No translation provider or project-wide publishing license is selected on behalf of the owner.
- Mozilla signing/store review and permanent-install validation remain external steps. Generated ZIPs are unsigned submission artifacts; Firefox temporary loading is not permanent installation.
- Manual authorized-channel smoke test: OAuth redirect, reauthorization for moderator:manage:chat_settings, actual JOIN delivery, real slow on/off and permission failures.
- Real extension lifecycle validation across browser shutdown, worker suspension and machine sleep. In-memory histories are intentionally not durable.
- Manual one-second timeout with an authorized account and native multi-monitor workspace restoration; automated checks simulate Helix and chrome.windows.
- Sustained real-stream performance measurements; synthetic tests establish bounds, not guaranteed FPS or full moderation coverage.
- Optional future work: configurable IndexedDB retention. It is not currently implemented.