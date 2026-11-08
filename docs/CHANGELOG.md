# Changelog

## Unreleased

- Fixed native toolbar popups collapsing to a narrow strip: removed the viewport-relative cap on their intrinsic 760px content width. Tabs and sidebars retain responsive sizing.
- The pin button and popup sign-in handoff now open/reuse a pinned browser tab instead of a detached dashboard window. Loading tabs and minimized browsers are reused/restored; unrelated views remain untouched.
- Added confirmed removal of active bans/timeouts from All chatters using the existing Twitch moderation scope. Successful removals are recorded locally without approving the account; another automatic timeout is suppressed in the same review cycle. Twitch failures leave the account history unchanged.
- Added a real Chromium extension-popup test across English, Spanish, German and both themes, plus worker/UI regressions for pinned-tab reuse, unban/timeout removal and rejected requests. No live Twitch authorization or moderation is claimed.

## 1.3.1 - 2026-11-07

- Dashboard, settings and footer fill the available viewport width in both themes; removed the minimum width that clipped narrow views.
- Opening Multichat, detached channels and the dashboard reuses/focuses matching windows. Opening operations and workspace restores are serialized, including views still loading. At most twelve extension popup windows can be open; unrelated windows are untouched.
- A timeout no longer implicitly dismisses the chatter or removes them from pending review. Bans still resolve the pending item; all recorded users remain discoverable through the directory.
- Added All chatters, name search and 25-person pages across local primary-channel records, including approved, dismissed and moderation-exempt users. Category filters are independent of pending-review status.
- Chatter history has Messages, Notes and Moderation views. The last 50 observed messages survive stream/session changes; up to 100 confirmed local actions/note changes retain dates, reasons, durations, source and actor when known.
- Recorded manual/automatic timeouts, one-second timeouts, bans, warnings, message deletion, manual approvals and note edits. Failed remote actions are not recorded as successful events.
- Local directory/history remain accessible after disconnecting a channel identified by this version. Summaries are read with an IndexedDB cursor; full history loads on demand.
- Existing unrecorded actions cannot be reconstructed; legacy last-action text is labeled as an undetailed previous state. No new Twitch permissions were added.

## 1.3.0 - 2026-11-07

- Original Chatter Watch app icon in six PNG sizes for Chromium/Firefox manifests, toolbar, Firefox sidebar and internal-page favicons; 512px artwork is available for store materials.
- Dark-first appearance, corrected inherited text contrast, wider moderation panel, stable popup dimensions and clearer local Lucide icons.
- One pending-review total instead of general session KPI cards. Approved chatters have a separate view with approval reasons; their messages remain in live chat.
- Opt-in OR auto-approval for more than N messages, confirmed followers, current subscribers and locally observed former subscribers.
- Inactivity-based reevaluation (15 minutes by default) and review epoch changes after verified stream transitions. Manual approvals remain durable; notes and observed subscription history are retained.
- Shared settings across views, visible save status, masked/revealable Client ID, reusable persistent dashboard window, extension-page entry and remembered popup geometry.
- In-app confirmation for manual ban, timeout, message deletion and `/srs 1s`; timeout duration in seconds with preset suggestions.
- Quick-note templates for RAID with a source channel and FRONT PAGE, preserving existing text.
- Delete/translate/pin actions on virtualized message rows. TXT export has a download icon and visible label.
- Optional per-review sound and attention requests, deduplicated across views and limited to one alert per ten seconds.
- Optional translation through a user-configured LibreTranslate-compatible HTTPS endpoint. Domain permission, Firefox data consent and per-message confirmation are required. No Twitch credentials are forwarded.
- Fixed a reproduced competing-reconnect race when replacing a socket. Added connection/authentication watchdog, dead-connection detection and transient token-validation handling.
- Chromium and Firefox packages include all local scripts/styles and the Lucide license.

### External verification

Automated checks use simulated extension APIs and Twitch traffic. Live OAuth, actual sanctions, native attention behavior, browser sleep/suspension, physical multi-monitor restoration, translation-provider deployment and store signing/review require separate verification. These are not claimed as completed by the release build.