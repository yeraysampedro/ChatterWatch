# Project Context

## Implemented

- Manifest V3, native JavaScript/HTML/CSS, no runtime packages or compilation. build.js generates reproducible Chromium/Firefox ZIPs and loadable folders in ignored dist/ using a runtime-file allowlist; fflate is packaging-only.
- Root manifest targets Chromium 116+. Firefox output targets desktop 140+, uses ordered background scripts, sidebar_action, a stable Gecko ID and required data-transmission declarations. Views and worker select browser's Promise API before chrome.
- Existing primary-channel account moderation, OAuth, Helix and IndexedDB remain in worker.js/core.js and the dashboard.
- worker.js owns the single IRC socket, all JOIN/PART operations, popup windows, runtime ports and confirmed Twitch slow-mode requests.
- chat-flow.js owns bounded per-channel histories/batches, normalization, restricted regex and frequency/repetition/local-slow filtering.
- chat.html/chat.js/chat.css provide shared grid configuration and single-channel detached views. virtual-chat.js owns DOM recycling and local pause state.
- Account review is separate from visual filtering; overload counters expose skipped reviews. Extra chats do not receive account-review sanctions.
- Manual /srs 1s actions target retained message authors in any configured channel, require the ban scope, and are independent of automatic account review.
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

- Mozilla signing/store review and permanent-install validation remain external steps. Generated ZIPs are unsigned submission artifacts; Firefox temporary loading is not permanent installation.
- Manual authorized-channel smoke test: OAuth redirect, reauthorization for moderator:manage:chat_settings, actual JOIN delivery, real slow on/off and permission failures.
- Real extension lifecycle validation across browser shutdown, worker suspension and machine sleep. In-memory histories are intentionally not durable.
- Manual one-second timeout with an authorized account and native multi-monitor workspace restoration; automated checks simulate Helix and chrome.windows.
- Sustained real-stream performance measurements; synthetic tests establish bounds, not guaranteed FPS or full moderation coverage.
- Optional future work: configurable IndexedDB retention. It is not currently implemented.