# Changelog

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