# Project Context

## Implemented

- Manifest V3, native JavaScript/HTML/CSS, no production build or runtime packages.
- Existing primary-channel account moderation, OAuth, Helix and IndexedDB remain in worker.js/core.js and the dashboard.
- worker.js owns the single IRC socket, all JOIN/PART operations, popup windows, runtime ports and confirmed Twitch slow-mode requests.
- chat-flow.js owns bounded per-channel histories/batches, normalization, restricted regex and frequency/repetition/local-slow filtering.
- chat.html/chat.js/chat.css provide shared grid configuration and single-channel detached views. virtual-chat.js owns DOM recycling and local pause state.
- Account review is separate from visual filtering; overload counters expose skipped reviews. Extra chats do not receive account-review sanctions.
- README.md and docs/es.md, docs/en.md, docs/de.md cover installation, usage, limits, privacy and GitHub publication.

## Change Rules

- For changed limits, permissions, shortcuts or behavior, update all three language guides and the README where relevant.
- Keep tokens in chrome.storage.session and message content in textContent. Validate channel names before IRC commands and window URLs.
- Preserve bounded buffers and queues. Regex intentionally excludes groups and quantifiers to avoid blocking the worker.
- Keep visual suppression independent of sanctions. Slow-mode changes on Twitch require an explicit confirmed action and the correct OAuth scope.
- Run `deno task test` for core/worker changes; also run `deno task test:ui` for view changes. Browser tests are headless; use CHATTER_BROWSER=msedge if Chrome is unavailable.
- UI tests simulate Chrome APIs. Worker tests simulate network and IndexedDB. They do not establish end-to-end Twitch authorization or delivery guarantees.

## Pending Verification

- Manual authorized-channel smoke test: OAuth redirect, reauthorization for moderator:manage:chat_settings, actual JOIN delivery, real slow on/off and permission failures.
- Real extension lifecycle validation across browser shutdown, worker suspension and machine sleep. In-memory histories are intentionally not durable.
- Sustained real-stream performance measurements; synthetic tests establish bounds, not guaranteed FPS or full moderation coverage.
- Optional future work: configurable IndexedDB retention and restoration of native window positions. Neither is currently implemented.