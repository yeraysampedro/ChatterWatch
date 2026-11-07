# Functional Implementation - 1.3.1

This is the current functional implementation reference. The superseded English/Spanish v0.1 DOCX/PDF planning drafts were removed during cleanup. This matrix records the shipped code and implementation choices; it does not claim store approval or live Twitch certification. Runtime source is in src/, tooling in build/, and generated deliverables in dist/.

| Requirement | Implementation | Boundaries |
| --- | --- | --- |
| RF-01 Dark-mode issues | Theme text inherits from body variables; controls, risk tags and dialogs use dark colors; UI tests check chat-text AA contrast. | Tested headless in both engines, not every OS rendering configuration. |
| RF-02 Dark by default | Both HTML views start dark; absent preference resolves to dark. | Explicit saved light preferences are preserved. |
| RF-03 Autosave + Save | Valid edits save after 350 ms or field commitment; visible pending/saving/saved/error states; Save remains. | Abrupt termination before confirmation can lose a draft. |
| RF-04 Remember geometry | Independent windows save changed bounds every two seconds, on blur and on pagehide; reopening restores them. | Browser/OS may adjust inaccessible bounds. Workspaces remain explicit. Native multi-monitor behavior needs a manual check. |
| RF-05 Shared settings | One storage model; dashboard and chat react to preference changes. All settings is reachable from Multichat. | Scroll, pause and pins remain local. No cross-browser/device sync. |
| RF-06 Hidden credential field | Client ID is masked with an explicit reveal control. | No Client Secret is introduced. |
| RF-07 Clear export | Download icon plus localized Export TXT text. | Exports bounded live history, not every historical message. |
| RF-08 Attention and sound | Independent opt-in controls and volume/test sound; one receiving view; ten-second alert rate limit; badge/attention request. | Sound needs an open view with audio allowed. Native taskbar flashing is platform-dependent; no forced focus. |
| RF-09 Internal opening/return | Dedicated extension dashboard page/window; OAuth from a native action popup first moves to a persistent extension window. | Official Twitch authorization/callback remains required. Continue sign-in from that persistent window; it is not an embedded login. |
| RF-10 Quick notes | RAID plus validated source channel, FRONT PAGE and free text. Templates append to existing notes, capped at 500 characters. | Notes belong to the primary-channel account. No automatic raid/front-page inference. |
| RF-11 Clear actions and confirmation | Delete/Translate/Pin row tools; in-app ban/timeout/delete and /srs confirmations; target snapshots are retained in dialogs. | Automatic timeout remains a separate explicit opt-in feature without per-execution confirmation. |
| RF-12 Timeout defaults/input | Shared minute default; manual dialog accepts 1-1,209,600 seconds and suggests common durations. | Ban stays permanent; a canceled/invalid duration does not become a ban. |
| RF-13 Reappearance | Per-person inactivity default 15 minutes; stream status polled every minute; verified transitions rotate review epoch. | Reevaluation happens on the next message. Manual approvals persist. Still-satisfied OR conditions may reapprove immediately. Network failure is not stream end. |
| RF-14 Review count only | General KPI cards removed. Pending-review total remains independent of directory filters. | Directory pages contain 25 records; totals are not capped to a page. Per-account message counts and operational diagnostics remain. |
| RF-15 Stable dimensions | Dashboard/settings use the full available width in both themes; responsive layout is checked from 280 to 2560px without horizontal clipping. | Browser-imposed popup/sidebar dimensions still apply. |
| RF-16 Disconnect resilience | Old-socket reconnect race reproduced/fixed; 30-second connection/auth watchdog, 20-second heartbeat and 75-second receive timeout; transient token-validation errors do not sign out. | Cannot guarantee network/Twitch availability or replay messages missed while offline. Sleep and browser suspension need real lifecycle validation. |
| RF-17 Wider main view | Main native window defaults to 820x820; native popup 760x580; dashboard fills the page width. | Remembered geometry takes precedence. Single-channel chat defaults to 520x760. |
| RF-18 Persistent view | Dashboard, Multichat and per-channel buttons reuse/focus matching views. Concurrent opens and workspace restoration are serialized; loading windows are tracked. | Maximum twelve extension popup windows, including dashboard; unrelated windows are not counted/closed. Existing duplicates are not automatically removed. Native action popup still closes on focus loss. |
| RF-19 Approved chatters/auto-approval | Approved view with reasons; strict `messages > N`; opt-in OR rules for followers/current subscribers/locally observed former subscribers. Live chat is independent. | N defaults to 10. Rules initially off. No inference from unknown subscription history and no complete Twitch historical-subscription claim. |
| RF-20 Chatter directory/history | All locally observed primary-channel chatters, name search, 25-person pages and independent category filters; profile tabs for messages, current/previous notes and moderation events. Timeout no longer implicitly dismisses a chatter. | Last 50 observed messages across sessions and up to 100 activity events per person/channel. No retrospective recovery of unrecorded Twitch actions. Moderation-exempt users are recorded but are not automatically sanctioned. |

## Policy Choices

- Automatic moderation/review remains scoped to the primary channel. Manual message deletion, translation and one-second timeout can target retained messages in configured channels with suitable permissions.
- Manual approval is durable. Inactivity or stream transitions reset message counts, dismissals and automatic approval for reevaluation on the next message, while preserving notes and observed subscription history.
- Current subscription evidence comes from IRC tags/badges; an explicit subscriber=0 takes precedence over a badge. Previous subscription evidence is only what this installation has observed. Follower evidence used for auto-approval is at most five minutes old and is refreshed on subsequent messages when needed; lookup errors are not positive evidence.
- Message processing, approvals, notes and manual moderation writes are serialized per person/channel so a delayed update cannot overwrite a moderator decision.
- A successful timeout keeps existing review state instead of dismissing the person. A successful ban remains a pending-review resolution, but the person is still in All chatters and applicable category filters. Manual timeouts suppress another automatic timeout in the current review cycle; expiry can reevaluate later.
- Confirmed moderation actions and note changes are recorded locally; failed requests do not create success events. The last identified channel permits local history access after disconnect. Directory responses omit activity details and include only three message previews; full history loads on request.
- Approval is evaluated before the existing automatic-timeout check for that message. Enabling automatic timeout with a threshold lower than auto-approval N can still sanction a person before they reach N+1; configure these independent rules deliberately.
- Translation has no default service or API key. Configure an HTTPS LibreTranslate-compatible endpoint accepting the standard anonymous JSON `/translate` request. Endpoint operators are responsible for their own access policy, deployment, cost and retention.
- Keep `twitch-chatter-watch@extensions.local` for an existing Firefox publication. Do not generate a new identity for an update.

## Verification Scope

Run `deno task test`, `deno task test:ui`, `deno task test:ui:firefox`, `deno task test:build`, then `deno task build`. Browser tests are headless; Twitch and extension APIs are simulated. Tests cover strict thresholds, expiry, preserved live messages, reconnect replacement, stream transitions, retained-message deletion, translation privacy/permission checks, alert deduplication, settings, confirmations, notes, dark contrast and responsive views.

Real OAuth, actual moderation delivery, provider integration, native geometry/attention, browser shutdown/suspension and store signing remain external verification steps. Source and packages must not be described as fully certified until those steps are performed.